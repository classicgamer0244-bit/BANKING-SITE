// Shared helpers for every page.
const CB = (() => {
  async function api(path, opts = {}) {
    const init = { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: {}, credentials: 'same-origin' };
    if (opts.body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    const res = await fetch(path, init);
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    if (res.status === 401 && !opts.allow401) { location.href = '/login?next=' + encodeURIComponent(location.pathname); throw new Error('Please sign in'); }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const money = (n) => usd.format(n || 0);
  const num = (n, d = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (n) => (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toDate = (s) => new Date(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : String(s).replace(' ', 'T') + 'Z');
  const date = (s) => toDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dateTime = (s) => toDate(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const ago = (s) => {
    const m = Math.round((Date.now() - toDate(s)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.round(m / 60)}h ago`;
    return `${Math.round(m / 1440)}d ago`;
  };

  const TYPE_LABEL = {
    checking: 'Advantage Checking', savings: 'Advantage Savings', money_market: 'Money Market',
    cd: 'Certificate of Deposit', credit_card: 'Rewards Credit Card', loan: 'Personal Loan', investment: 'Investment Account',
  };
  const acctName = (a) => a.nickname || TYPE_LABEL[a.type] || a.type;

  const ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    accounts: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
    transfer: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
    bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    chart: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2.4.6 4 2.3 4 5.4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    savings: '<path d="M19 9c1.5 0 2 1 2 2v2h-2l-1 3h-2v2h-3v-2H9v2H6v-2.5C4 14 3 12 3 10c0-3 3-5 7-5h3l3-2v3c1.5.7 2.5 1.8 3 3z"/>',
    house: '<path d="M3 12l9-8 9 8M5 10v10h14V10"/>',
    car: '<path d="M5 16h14M5 16v3M19 16v3M4 16l2-6h12l2 6M7 13h.01M17 13h.01"/>',
    grad: '<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    loan: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  };
  const icon = (name, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const typeIcon = (t) => ({ checking: 'accounts', savings: 'savings', money_market: 'savings', cd: 'lock', credit_card: 'card', loan: 'loan', investment: 'chart' }[t] || 'accounts');

  const LOGO_MARK = `<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#0f3561"/>
    <path d="M6 27 Q20 8 34 27" fill="none" stroke="#e0a83e" stroke-width="3" stroke-linecap="round"/>
    <path d="M6 27h28" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M12 27v-6.5M20 27v-11M28 27v-6.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <path d="M9 32h22" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/></svg>`;
  const logo = (href = '/') => `<a class="logo" href="${href}" aria-label="CapitalBridge Bank home">${LOGO_MARK}<span class="logo-text">CapitalBridge<small>Bank</small></span></a>`;

  function toast(msg, kind = '') {
    let host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  // modal({title, body (html), wide, submitText, onSubmit(form) -> may throw}) ; returns {close}
  function modal({ title, body, wide, submitText = 'Save', cancelText = 'Cancel', onSubmit, danger }) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<form class="modal ${wide ? 'wide' : ''}" novalidate>
      <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="x-btn" aria-label="Close">&times;</button></div>
      <div class="modal-body"><div class="form-error"></div>${body}</div>
      ${onSubmit ? `<div class="modal-foot"><button type="button" class="btn btn-ghost" data-cancel>${esc(cancelText)}</button>
        <button class="btn ${danger ? 'btn-danger' : ''}" type="submit">${esc(submitText)}</button></div>` : ''}
    </form>`;
    const form = wrap.querySelector('form');
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('.x-btn').onclick = close;
    const cancel = wrap.querySelector('[data-cancel]');
    if (cancel) cancel.onclick = close;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!onSubmit) return;
      const btn = form.querySelector('[type=submit]');
      const err = form.querySelector('.form-error');
      btn.disabled = true; err.classList.remove('show');
      try { const keep = await onSubmit(form, close); if (keep !== true) close(); }
      catch (ex) { err.textContent = ex.message; err.classList.add('show'); }
      finally { btn.disabled = false; }
    });
    document.body.appendChild(wrap);
    const first = form.querySelector('input, select, textarea');
    if (first) first.focus();
    return { close, el: form };
  }
  const formData = (form) => Object.fromEntries(new FormData(form).entries());

  // Single-series sparkline; color follows direction (up/down) for the day.
  function sparkline(values, w = 96, h = 34) {
    if (!values || values.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
    const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const color = values[values.length - 1] >= values[0] ? 'var(--up)' : 'var(--down)';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Intraday trend">
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }

  const fmtPrice = (q) => (q.isYield ? q.price.toFixed(3) + '%' : q.price >= 1000 ? num(q.price, 2) : q.price >= 1 ? num(q.price, 2) : num(q.price, 4));

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST', allow401: true }); } catch { /* ignore */ }
    location.href = '/';
  }

  return { api, money, num, pct, esc, date, dateTime, ago, icon, typeIcon, logo, toast, modal, formData, sparkline, fmtPrice, acctName, TYPE_LABEL, logout };
})();
