// Live market data + news with small in-memory caches so we stay within free API limits.
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

const cache = new Map();
async function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  try {
    const value = await loader();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.warn(`[market] ${key} failed: ${e.message}`);
    if (hit) return hit.value; // serve stale data rather than nothing
    throw e;
  }
}

async function getJson(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const INDICES = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^IXIC', name: 'Nasdaq' },
  { symbol: '^RUT', name: 'Russell 2000' },
  { symbol: '^TNX', name: '10-Yr Treasury', isYield: true },
  { symbol: 'GC=F', name: 'Gold' },
  { symbol: 'CL=F', name: 'Crude Oil' },
];
const STOCKS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'BAC', 'V'];

async function yahooQuote(symbol) {
  const j = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`);
  const res = j.chart.result[0];
  const m = res.meta;
  const closes = (res.indicators.quote[0].close || []).filter((v) => v != null);
  const prev = m.chartPreviousClose ?? m.previousClose;
  return {
    symbol: m.symbol,
    name: m.shortName || m.symbol,
    price: m.regularMarketPrice,
    prevClose: prev,
    change: m.regularMarketPrice - prev,
    changePct: prev ? ((m.regularMarketPrice - prev) / prev) * 100 : 0,
    spark: closes.length > 60 ? closes.filter((_, i) => i % Math.ceil(closes.length / 60) === 0) : closes,
    time: m.regularMarketTime ? m.regularMarketTime * 1000 : Date.now(),
  };
}

async function getIndices() {
  return cached('indices', 60_000, async () => {
    const out = await Promise.allSettled(INDICES.map((i) => yahooQuote(i.symbol)));
    const ok = out.map((r, i) => r.status === 'fulfilled' ? { ...r.value, name: INDICES[i].name, isYield: !!INDICES[i].isYield } : null).filter(Boolean);
    if (!ok.length) throw new Error('no index data');
    return ok;
  });
}

async function getStocks() {
  return cached('stocks', 60_000, async () => {
    const out = await Promise.allSettled(STOCKS.map(yahooQuote));
    const ok = out.filter((r) => r.status === 'fulfilled').map((r) => { const { spark, ...q } = r.value; return q; });
    if (!ok.length) throw new Error('no stock data');
    return ok;
  });
}

const COINS = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP', cardano: 'ADA', dogecoin: 'DOGE' };
async function getCrypto() {
  return cached('crypto', 45_000, async () => {
    const j = await getJson(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.keys(COINS).join(',')}&vs_currencies=usd&include_24hr_change=true`);
    return Object.entries(COINS).filter(([id]) => j[id]).map(([id, sym]) => ({
      symbol: sym, name: id[0].toUpperCase() + id.slice(1), price: j[id].usd, changePct: j[id].usd_24h_change ?? 0,
    }));
  });
}

const FX = ['EUR', 'GBP', 'JPY', 'CAD', 'MXN', 'CHF', 'AUD', 'CNY', 'INR', 'NGN'];
async function getFx() {
  return cached('fx', 30 * 60_000, async () => {
    const j = await getJson('https://open.er-api.com/v6/latest/USD');
    if (j.result !== 'success') throw new Error('fx failed');
    return { updated: j.time_last_update_utc, rates: FX.filter((c) => j.rates[c]).map((c) => ({ code: c, rate: j.rates[c] })) };
  });
}

async function getMarket() {
  const [indices, stocks, crypto, fx] = await Promise.allSettled([getIndices(), getStocks(), getCrypto(), getFx()]);
  const val = (r) => (r.status === 'fulfilled' ? r.value : null);
  return { indices: val(indices), stocks: val(stocks), crypto: val(crypto), fx: val(fx), asOf: Date.now() };
}

// ---------- News (Google News RSS, business section) ----------
function decode(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]).trim() : '';
}

const FEEDS = {
  business: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
  markets: 'https://news.google.com/rss/search?q=stock+market+when:2d&hl=en-US&gl=US&ceid=US:en',
  personal: 'https://news.google.com/rss/search?q=personal+finance+savings+mortgage+rates+when:7d&hl=en-US&gl=US&ceid=US:en',
};

async function getNews(topic = 'business') {
  const url = FEEDS[topic] || FEEDS.business;
  return cached('news:' + topic, 10 * 60_000, async () => {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const xml = await r.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 18).map(([, it]) => {
      const source = tag(it, 'source');
      let title = tag(it, 'title');
      if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
      return { title, link: tag(it, 'link'), source, published: tag(it, 'pubDate') };
    });
    return items.filter((i) => /^https?:\/\//.test(i.link));
  });
}

module.exports = { getMarket, getNews };
