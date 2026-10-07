(() => {
  const { $, esc, icon, money, num, pct, sparkline, fmtPrice, ago } = { $: (s) => document.querySelector(s), ...CB };
  const t = SITE.t;
  SITE.init();
  $('#lockIco').innerHTML = icon('lock', 14);

  // ---------- hero sign-in ----------
  const form = $('#heroLogin');
  try { const saved = localStorage.getItem('cb_user'); if (saved) { form.username.value = saved; form.remember.checked = true; } } catch { /* storage unavailable */ }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#heroErr'); err.classList.remove('show');
    const btn = form.querySelector('button'); btn.disabled = true;
    try {
      const r = await CB.api('/api/auth/login', { body: { username: form.username.value, password: form.password.value }, allow401: true });
      try { form.remember.checked ? localStorage.setItem('cb_user', form.username.value) : localStorage.removeItem('cb_user'); } catch { /* ignore */ }
      location.href = r.redirect;
    } catch (ex) { err.textContent = ex.message; err.classList.add('show'); btn.disabled = false; }
  });

  // ---------- quick links & products ----------
  const quick = [['accounts', t('Checking', 'Cheques'), 'checking'], ['savings', t('Savings', 'Ahorros'), 'savings'], ['card', t('Credit Cards', 'Tarjetas'), 'credit-cards'],
    ['house', t('Home Loans', 'Hipotecas'), 'home-loans'], ['car', t('Auto Loans', 'Autos'), 'auto-loans'], ['chart', t('Investing', 'Inversiones'), 'investing']];
  $('#quickLinks').innerHTML = quick.map(([i, l, s]) => `<a href="/p/${s}"><span class="ico">${icon(i, 22)}</span>${l}</a>`).join('');

  const products = [
    { slug: 'checking', app: 'checking', tag: t('Checking', 'Cheques'), t: 'Advantage Checking', d: t('No monthly fee with $500 in direct deposits. Free debit card, instant transfers and overdraft protection.', 'Sin cargo mensual con $500 en depósitos directos. Tarjeta de débito gratis, transferencias inmediatas y protección contra sobregiros.'), r: '$0', rs: t('monthly fee', 'cargo mensual'), i: 'accounts', g: ['#0f3561', '#1f6fd1'] },
    { slug: 'savings', app: 'savings', tag: t('Savings', 'Ahorros'), t: 'Advantage Savings', d: t('Grow your money with a competitive rate, no minimum balance and automatic transfers from checking.', 'Haga crecer su dinero con una tasa competitiva, sin saldo mínimo y con transferencias automáticas.'), r: '4.35%', rs: 'APY', i: 'savings', g: ['#0a5b46', '#16a07a'] },
    { slug: 'credit-cards', app: 'credit_card', tag: t('Credit cards', 'Tarjetas de crédito'), t: 'Bridge Rewards Card', d: t('Earn 3% on dining & travel, 2% at grocery stores and 1% on everything else. No annual fee.', 'Gane 3% en restaurantes y viajes, 2% en supermercados y 1% en todo lo demás. Sin cuota anual.'), r: '$200', rs: t('online bonus', 'bono en línea'), i: 'card', g: ['#6b4a12', '#e0a83e'] },
    { slug: 'home-loans', app: 'mortgage', tag: t('Home loans', 'Hipotecas'), t: t('Mortgages & Refinance', 'Hipotecas y refinanciamiento'), d: t('Fixed and adjustable rates, down-payment assistance and a dedicated lending specialist.', 'Tasas fijas y ajustables, asistencia para el enganche y un especialista dedicado.'), r: '6.12%', rs: t('30-yr fixed APR', 'APR fija a 30 años'), i: 'house', g: ['#3a2366', '#7a52c7'] },
    { slug: 'auto-loans', app: 'auto_loan', tag: t('Auto loans', 'Préstamos de auto'), t: t('New & Used Auto', 'Autos nuevos y usados'), d: t('Fast decisions, flexible terms up to 84 months and rate discounts for existing customers.', 'Decisiones rápidas, plazos de hasta 84 meses y descuentos para clientes.'), r: '5.49%', rs: t('APR as low as', 'APR desde'), i: 'car', g: ['#7a1f2b', '#d0485a'] },
    { slug: 'investing', app: 'investment', tag: t('Investing', 'Inversiones'), t: 'Bridge Invest', d: t('Commission-free online stock & ETF trades, plus guided portfolios that rebalance automatically.', 'Operaciones de acciones y ETF en línea sin comisión, y portafolios guiados que se rebalancean solos.'), r: '$0', rs: t('online trades', 'operaciones en línea'), i: 'chart', g: ['#0b3b5c', '#2a91b8'] },
  ];
  $('#productGrid').innerHTML = products.map((p) => `
    <article class="product">
      <a class="art" href="/p/${p.slug}" aria-hidden="true" tabindex="-1" style="display:block;background:linear-gradient(135deg,${p.g[0]},${p.g[1]})">
        <div style="position:absolute;right:-30px;bottom:-40px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.1)"></div>
        <div style="position:absolute;left:22px;bottom:20px;color:#fff;opacity:.95">${icon(p.i, 46)}</div>
      </a>
      <div class="body">
        <div class="tag">${p.tag}</div><h3>${p.t}</h3><p>${p.d}</p>
        <div class="rate num" style="margin-bottom:14px">${p.r} <small>${p.rs}</small></div>
        <div class="actions"><a class="btn btn-sm" href="/p/open-account?product=${p.app}">${p.app.includes('loan') || p.app === 'mortgage' || p.app === 'credit_card' ? t('Apply now', 'Solicitar') : t('Open now', 'Abrir ahora')}</a>
          <a class="btn btn-sm btn-ghost" href="/p/${p.slug}">${t('Learn more', 'Más información')}</a></div>
      </div>
    </article>`).join('');
  // ---------- markets ----------
  let market = null, tab = 'stocks';
  const prev = new Map();
  const changeCls = (v) => (v >= 0 ? 'up' : 'down');

  function renderTicker() {
    const items = [...(market.indices || []), ...(market.stocks || []), ...(market.crypto || [])];
    if (!items.length) return;
    const html = items.map((q) => `<span class="ticker-item"><b>${esc(q.symbol?.startsWith('^') || q.symbol?.includes('=') ? q.name : q.symbol)}</b>
      <span class="num">${fmtPrice(q)}</span> <span class="${changeCls(q.changePct)} num">${pct(q.changePct)}</span></span>`).join('');
    $('#tickerTrack').innerHTML = html + html; // doubled for seamless loop
  }

  function renderIndices() {
    const box = $('#indexCards');
    if (!market.indices) { box.innerHTML = '<div class="muted">Index data is temporarily unavailable.</div>'; return; }
    box.innerHTML = market.indices.slice(0, 6).map((q) => `
      <div class="index-card" data-sym="${esc(q.symbol)}">
        <div class="nm">${esc(q.name)}</div>${sparkline(q.spark)}
        <div class="px num">${fmtPrice(q)}</div>
        <div class="ch num ${changeCls(q.change)}">${q.change >= 0 ? '▲' : '▼'} ${num(Math.abs(q.change), q.isYield ? 3 : 2)} (${pct(q.changePct)})</div>
      </div>`).join('');
    flash(market.indices, '.index-card');
  }

  function flash(list, sel) {
    for (const q of list) {
      const key = sel + q.symbol, old = prev.get(key);
      prev.set(key, q.price);
      if (old === undefined || old === q.price) continue;
      const el = document.querySelector(`${sel}[data-sym="${CSS.escape(q.symbol)}"]`);
      if (!el) continue;
      el.classList.add(q.price > old ? 'flash-up' : 'flash-down');
      setTimeout(() => el.classList.remove('flash-up', 'flash-down'), 1200);
    }
  }

  function renderTable() {
    const box = $('#mktTable');
    if (tab === 'fx') {
      if (!market.fx) { box.innerHTML = '<div class="empty">Currency rates unavailable.</div>'; return; }
      box.innerHTML = `<table><thead><tr><th>Currency</th><th class="amt">1 USD =</th><th class="amt">1 unit =</th></tr></thead><tbody>
        ${market.fx.rates.map((r) => `<tr><td><b>${r.code}</b></td><td class="amt">${num(r.rate, r.rate > 100 ? 2 : 4)}</td><td class="amt">${money(1 / r.rate).replace('$0.00', '<$0.01')}</td></tr>`).join('')}
        </tbody></table><div class="small muted" style="margin-top:8px">Mid-market reference rates. Updated ${esc(market.fx.updated || '')}</div>`;
      return;
    }
    const list = tab === 'crypto' ? market.crypto : market.stocks;
    if (!list) { box.innerHTML = '<div class="empty">Data temporarily unavailable.</div>'; return; }
    box.innerHTML = `<table><thead><tr><th>Symbol</th><th class="amt">Price</th><th class="amt">${tab === 'crypto' ? '24h' : 'Today'}</th></tr></thead><tbody>
      ${list.map((q) => `<tr class="mkt-row" data-sym="${esc(q.symbol)}"><td><b>${esc(q.symbol)}</b><div class="small muted">${esc(q.name)}</div></td>
        <td class="amt">${money(q.price).replace(/(\.\d{2})$/, '$1')}</td>
        <td class="amt ${changeCls(q.changePct)}">${pct(q.changePct)}</td></tr>`).join('')}
      </tbody></table>`;
    flash(list, '.mkt-row');
  }

  async function loadMarket() {
    try {
      market = await CB.api('/api/market', { allow401: true });
      renderTicker(); renderIndices(); renderTable();
      $('#asOf').textContent = t('Live · updated ', 'En vivo · actualizado ') +new Date(market.asOf).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    } catch { $('#asOf').textContent = 'Market data unavailable — retrying'; }
  }
  $('#mktTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    tab = b.dataset.t;
    $('#mktTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    if (market) renderTable();
  });
  loadMarket();
  setInterval(loadMarket, 30_000);

  // ---------- news ----------
  async function loadNews(topic) {
    const grid = $('#newsGrid');
    grid.innerHTML = '<div class="muted">Loading headlines…</div>';
    try {
      const { items, announcements } = await CB.api('/api/news?topic=' + topic, { allow401: true });
      const when = (s) => (s ? ago(new Date(s).toISOString()) : '');
      const [first, ...rest] = items;
      const ann = announcements.map((a) => `<div class="row"><span class="badge info">CapitalBridge</span>
          <div style="font-weight:700;margin-top:6px">${esc(a.title)}</div><div class="small muted">${esc(a.body)}</div></div>`).join('');
      if (!first) { grid.innerHTML = `<div class="news-item" style="grid-column:1/-1"><div class="news-list">${ann || '<div class="muted">Headlines are unavailable right now.</div>'}</div></div>`; return; }
      const link = (n) => `<a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">${esc(n.title)}</a>`;
      grid.innerHTML = `
        <article class="news-feature"><span class="eyebrow">${t('Top story', 'Noticia principal')}</span><h3>${link(first)}</h3><div class="news-meta">${esc(first.source)} · ${when(first.published)}</div></article>
        ${rest.slice(0, 4).map((n) => `<article class="news-item">${link(n)}<div class="news-meta">${esc(n.source)} · ${when(n.published)}</div></article>`).join('')}
        <div class="news-item" style="grid-column:1/-1"><div class="news-list">
          ${ann}
          ${rest.slice(4, 10).map((n) => `<div class="row">${link(n)}<div class="news-meta">${esc(n.source)} · ${when(n.published)}</div></div>`).join('')}
        </div></div>`;
    } catch { grid.innerHTML = '<div class="muted">Headlines are unavailable right now.</div>'; }
  }
  $('#newsTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $('#newsTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    loadNews(b.dataset.t);
  });
  loadNews('business');

  // ---------- savings calculator ----------
  const APY = 0.0435;
  function calc() {
    const dep = +$('#cDep').value, mon = +$('#cMon').value, yrs = +$('#cYrs').value;
    const r = Math.pow(1 + APY, 1 / 12) - 1;
    let bal = dep;
    for (let i = 0; i < yrs * 12; i++) bal = bal * (1 + r) + mon;
    const contributed = dep + mon * yrs * 12;
    $('#cvDep').textContent = money(dep); $('#cvMon').textContent = money(mon); $('#cvYrs').textContent = yrs;
    $('#cOut').textContent = money(bal);
    $('#cInt').textContent = t(`${money(contributed)} contributed · ${money(bal - contributed)} interest earned`, `${money(contributed)} aportados · ${money(bal - contributed)} de interés ganado`);
  }
  ['#cDep', '#cMon', '#cYrs'].forEach((s) => $(s).addEventListener('input', calc));
  calc();
})();
