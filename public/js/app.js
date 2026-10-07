(() => {
  const { api, money, esc, icon, date, dateTime, toast, modal, formData, acctName, TYPE_LABEL, typeIcon, pct, fmtPrice, sparkline, num } = CB;
  const $ = (s) => document.querySelector(s);
  const page = $('#page');
  let me = null, accounts = [], unread = 0;

  const NAV = [
    ['overview', 'home', 'Overview'], ['accounts', 'accounts', 'Accounts'], ['transfer', 'transfer', 'Transfer & Send'],
    ['billpay', 'bill', 'Bill Pay'], ['cards', 'card', 'Cards'], ['markets', 'chart', 'Markets & News'],
    ['care', 'users', 'Customer care chat'], ['messages', 'mail', 'Secure messages'], ['profile', 'user', 'Profile & Security'],
  ];

  function renderNav(active) {
    $('#sideNav').innerHTML = NAV.map(([k, i, l]) => `<a href="#/${k}" class="${k === active ? 'on' : ''}">${icon(i)}${l}
      ${k === 'messages' && unread ? `<span class="count">${unread}</span>` : ''}</a>`).join('');
  }

  const signed = (t) => (t.direction === 'in' ? '+' : '−') + money(t.amount);
  const debitable = () => accounts.filter((a) => ['checking', 'savings', 'money_market', 'credit_card'].includes(a.type) && a.status === 'active');
  const acctOpt = (a) => `<option value="${a.id}">${esc(acctName(a))} ${a.masked} — ${a.is_credit ? 'owed ' : ''}${money(a.balance)}</option>`;

  function txTable(list, showAcct) {
    if (!list.length) return '<div class="empty">No transactions yet.</div>';
    return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th>${showAcct ? '<th>Account</th>' : ''}<th>Category</th><th class="amt">Amount</th>${showAcct ? '' : '<th class="amt">Balance</th>'}</tr></thead><tbody>
      ${list.map((t) => `<tr>
        <td class="muted" style="white-space:nowrap">${date(t.created_at)}</td>
        <td>${esc(t.description)} ${t.status === 'reversed' ? '<span class="badge bad">Reversed</span>' : ''}<div class="small muted">Ref ${esc(t.reference)}</div></td>
        ${showAcct ? `<td class="muted">••${esc(t.account_number.slice(-4))}</td>` : ''}
        <td><span class="badge">${esc(t.category.replace('_', ' '))}</span></td>
        <td class="amt ${t.direction === 'in' ? 'up' : ''}" style="font-weight:600">${signed(t)}</td>
        ${showAcct ? '' : `<td class="amt muted">${money(t.balance_after)}</td>`}
      </tr>`).join('')}</tbody></table></div>`;
  }

  async function refreshAccounts() { accounts = (await api('/api/accounts')).accounts; }
  async function refreshUnread() {
    const { messages } = await api('/api/messages');
    unread = messages.filter((m) => m.from_admin && !m.is_read).length;
    return messages;
  }

  // ---------- views ----------
  const views = {
    async overview() {
      const [{ transactions }] = await Promise.all([api('/api/activity?limit=200'), refreshAccounts()]);
      const deposits = accounts.filter((a) => !a.is_credit).reduce((s, a) => s + a.balance, 0);
      const owed = accounts.filter((a) => a.is_credit).reduce((s, a) => s + a.balance, 0);
      const monthAgo = Date.now() - 30 * 864e5;
      const recent = transactions.filter((t) => new Date(t.created_at.replace(' ', 'T') + 'Z') > monthAgo && t.status === 'posted');
      const inflow = recent.filter((t) => t.direction === 'in' && t.category !== 'transfer').reduce((s, t) => s + t.amount, 0);
      const spend = {};
      recent.filter((t) => t.direction === 'out' && !['transfer', 'reversal'].includes(t.category)).forEach((t) => { spend[t.category] = (spend[t.category] || 0) + t.amount; });
      const spendRows = Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const maxSpend = spendRows[0]?.[1] || 1;
      const hour = new Date().getHours();

      page.innerHTML = `
        ${me.must_change_pw ? `<div class="notice"><span>${icon('shield', 18)} For your security, please change the temporary password you were given.</span><a class="btn btn-sm btn-gold" href="#/profile">Change password</a></div>` : ''}
        <h2 style="font-size:24px;margin-bottom:18px">Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${esc(me.first_name)}</h2>
        <div class="kpis">
          <div class="kpi dark"><div class="l">Total deposits</div><div class="v num">${money(deposits)}</div><div class="s">Across ${accounts.filter((a) => !a.is_credit).length} accounts</div></div>
          <div class="kpi"><div class="l">Credit & loans owed</div><div class="v num">${money(owed)}</div><div class="s">${accounts.filter((a) => a.is_credit).length} credit accounts</div></div>
          <div class="kpi"><div class="l">Money in · 30 days</div><div class="v num up">${money(inflow)}</div><div class="s">Excludes your own transfers</div></div>
          <div class="kpi"><div class="l">Net worth at CapitalBridge</div><div class="v num">${money(deposits - owed)}</div><div class="s">Deposits minus balances owed</div></div>
        </div>
        <div class="two-col">
          <div class="stack">
            <div class="card"><div class="card-head"><h2>Your accounts</h2><a href="#/accounts">View all</a></div>
              <div class="acct-list">${accounts.length ? accounts.map(acctTile).join('') : '<div class="empty">No accounts yet. Contact the bank to open one.</div>'}</div></div>
            <div class="card"><div class="card-head"><h2>Recent activity</h2></div>${txTable(transactions.slice(0, 8), true)}</div>
          </div>
          <div class="stack">
            <div class="card"><div class="card-head"><h3>Quick actions</h3></div>
              <div class="actions"><a class="btn btn-sm" href="#/transfer">${icon('transfer', 16)} Transfer</a><a class="btn btn-sm btn-ghost" href="#/billpay">${icon('bill', 16)} Pay a bill</a><a class="btn btn-sm btn-ghost" href="#/cards">${icon('card', 16)} Cards</a></div></div>
            <div class="card"><div class="card-head"><h3>Spending · last 30 days</h3></div>
              ${spendRows.length ? `<div class="bars">${spendRows.map(([c, v]) => `<div class="bar-row" title="${esc(c)}: ${money(v)}"><span style="text-transform:capitalize">${esc(c)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (v / maxSpend) * 100)}%"></div></div><span class="num" style="text-align:right">${money(v)}</span></div>`).join('')}</div>`
                : '<div class="empty">No spending in the last 30 days.</div>'}</div>
            <div class="card" id="ovMarkets"><div class="card-head"><h3>Markets</h3><a href="#/markets">More</a></div><div class="muted small">Loading…</div></div>
          </div>
        </div>`;
      bindAcctTiles();
      CB.api('/api/market').then((m) => {
        const el = $('#ovMarkets'); if (!el || !m.indices) return;
        el.innerHTML = `<div class="card-head"><h3>Markets</h3><a href="#/markets">More</a></div>` + m.indices.slice(0, 4).map((q) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line-2)">
            <div><b style="font-size:14px">${esc(q.name)}</b><div class="small num">${fmtPrice(q)}</div></div>
            ${sparkline(q.spark, 80, 28)}<span class="num small ${q.changePct >= 0 ? 'up' : 'down'}" style="width:62px;text-align:right">${pct(q.changePct)}</span></div>`).join('');
      }).catch(() => {});
    },

    async accounts(id) {
      await refreshAccounts();
      if (!id) {
        page.innerHTML = `<div class="card"><div class="card-head"><h2>All accounts</h2></div><div class="acct-list">${accounts.map(acctTile).join('') || '<div class="empty">No accounts yet.</div>'}</div></div>`;
        bindAcctTiles();
        return;
      }
      const { account: a, transactions } = await api(`/api/accounts/${id}/transactions?limit=500`);
      $('#pageTitle').textContent = acctName(a);
      page.innerHTML = `
        <a href="#/accounts" class="small">← All accounts</a>
        <div class="kpis" style="margin-top:12px">
          <div class="kpi dark"><div class="l">${a.is_credit ? 'Current balance owed' : 'Available balance'}</div><div class="v num">${money(a.balance)}</div><div class="s">${esc(TYPE_LABEL[a.type] || a.type)}</div></div>
          ${a.type === 'credit_card' ? `<div class="kpi"><div class="l">Available credit</div><div class="v num">${money(Math.max(0, a.credit_limit - a.balance))}</div><div class="s">Limit ${money(a.credit_limit)}</div></div>` : ''}
          <div class="kpi"><div class="l">${a.is_credit ? 'APR' : 'APY'}</div><div class="v num">${num(a.rate, 2)}%</div><div class="s">Current rate</div></div>
          <div class="kpi"><div class="l">Account number</div><div class="v num" style="font-size:20px">${esc(a.number)}</div><div class="s">Routing 021000555 · <span class="badge ${a.status === 'active' ? 'good' : 'warn'}">${esc(a.status)}</span></div></div>
        </div>
        <div class="card"><div class="card-head"><h2>Transactions</h2>
          <div class="actions"><input type="search" id="txSearch" placeholder="Search transactions" style="width:220px;padding:7px 12px">
          <a class="btn btn-sm btn-ghost" href="/api/accounts/${a.id}/statement.csv">${icon('download', 16)} Statement (CSV)</a></div></div>
          <div id="txBox">${txTable(transactions)}</div></div>`;
      $('#txSearch').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        $('#txBox').innerHTML = txTable(transactions.filter((t) => (t.description + t.reference + t.category).toLowerCase().includes(q)));
      });
    },

    async transfer() {
      await refreshAccounts();
      const from = debitable().filter((a) => a.type !== 'credit_card');
      page.innerHTML = `
        <div class="two-col">
          <div class="card">
            <div class="card-head"><h2>Move money</h2><div class="tabs" id="tTabs"><button class="on" data-m="own">Between my accounts</button><button data-m="other">To another customer</button></div></div>
            <form id="tForm">
              <div class="form-error"></div>
              <div class="field"><label>From</label><select name="fromId" required>${from.map(acctOpt).join('')}</select></div>
              <div class="field" id="toOwn"><label>To</label><select name="toId">${accounts.filter((a) => a.status === 'active' && !['cd', 'investment'].includes(a.type)).map(acctOpt).join('')}</select></div>
              <div class="field" id="toOther" style="display:none"><label>Recipient's CapitalBridge account number</label><input name="toNumber" inputmode="numeric" placeholder="12-digit account number"></div>
              <div class="grid-2"><div class="field"><label>Amount (USD)</label><input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00"></div>
              <div class="field"><label>Memo (optional)</label><input name="memo" maxlength="120"></div></div>
              <button class="btn" type="submit">Review transfer</button>
            </form>
          </div>
          <div class="card"><div class="card-head"><h3>Good to know</h3></div>
            <p class="small muted">Transfers between CapitalBridge accounts are instant and free, 24/7.</p>
            <p class="small muted">Paying a credit card or loan from checking reduces the balance owed.</p>
            <p class="small muted">${icon('shield', 14)} Only send money to people you know. CapitalBridge will never ask you to move money to "protect" it.</p></div>
        </div>`;
      let mode = 'own';
      $('#tTabs').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        mode = b.dataset.m;
        $('#tTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        $('#toOwn').style.display = mode === 'own' ? '' : 'none';
        $('#toOther').style.display = mode === 'own' ? 'none' : '';
      });
      $('#tForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = formData(e.target);
        const body = { fromId: f.fromId, amount: f.amount, memo: f.memo, ...(mode === 'own' ? { toId: f.toId } : { toNumber: f.toNumber }) };
        const fa = accounts.find((a) => a.id == f.fromId);
        const ta = mode === 'own' ? accounts.find((a) => a.id == f.toId) : null;
        const err = e.target.querySelector('.form-error');
        if (!(+f.amount > 0)) { err.textContent = 'Enter an amount'; err.classList.add('show'); return; }
        err.classList.remove('show');
        modal({
          title: 'Confirm transfer', submitText: 'Send ' + money(+f.amount),
          body: `<div class="detail-grid" style="grid-template-columns:1fr 1fr">
            <div><div class="k">From</div><div class="v">${esc(acctName(fa))} ${fa.masked}</div></div>
            <div><div class="k">To</div><div class="v">${ta ? esc(acctName(ta)) + ' ' + ta.masked : 'Account ' + esc(f.toNumber)}</div></div>
            <div><div class="k">Amount</div><div class="v num">${money(+f.amount)}</div></div>
            <div><div class="k">Delivery</div><div class="v">Instant</div></div></div>`,
          onSubmit: async () => {
            const r = await api('/api/transfers', { body });
            receipt('Transfer complete', `${money(+f.amount)} sent. Reference ${r.reference}`);
            views.transfer();
          },
        });
      });
    },

    async billpay() {
      const [{ payees }] = await Promise.all([api('/api/payees'), refreshAccounts()]);
      page.innerHTML = `
        <div class="two-col">
          <div class="card"><div class="card-head"><h2>Pay a bill</h2></div>
            ${payees.length ? `<form id="bpForm"><div class="form-error"></div>
              <div class="field"><label>Pay to</label><select name="payeeId">${payees.map((p) => `<option value="${p.id}">${esc(p.name)}${p.account_ref ? ' (' + esc(p.account_ref) + ')' : ''}</option>`).join('')}</select></div>
              <div class="field"><label>From</label><select name="fromId">${debitable().filter((a) => !a.is_credit).map(acctOpt).join('')}</select></div>
              <div class="field"><label>Amount (USD)</label><input name="amount" type="number" step="0.01" min="0.01" required></div>
              <button class="btn">Pay now</button></form>` : '<div class="empty">Add a payee to get started.</div>'}
          </div>
          <div class="card"><div class="card-head"><h3>Payees</h3><button class="btn btn-sm" id="addPayee">${icon('plus', 16)} Add</button></div>
            ${payees.map((p) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line-2)">
              <div><b>${esc(p.name)}</b><div class="small muted">${esc(p.account_ref || '—')} · ${esc(p.category)}</div></div>
              <button class="link-btn small" data-del="${p.id}">Remove</button></div>`).join('') || '<div class="muted small">No payees yet.</div>'}
          </div>
        </div>`;
      $('#addPayee').onclick = () => modal({
        title: 'Add a payee', submitText: 'Add payee',
        body: `<div class="field"><label>Company or person</label><input name="name" required placeholder="e.g. City Power & Light"></div>
          <div class="field"><label>Account / reference number</label><input name="account_ref"></div>
          <div class="field"><label>Category</label><select name="category">${['utilities', 'rent', 'insurance', 'phone', 'internet', 'subscriptions', 'credit card', 'other'].map((c) => `<option>${c}</option>`).join('')}</select></div>`,
        onSubmit: async (f) => { await api('/api/payees', { body: formData(f) }); toast('Payee added', 'success'); views.billpay(); },
      });
      page.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await api('/api/payees/' + b.dataset.del, { method: 'DELETE' }); views.billpay(); });
      const bp = $('#bpForm');
      if (bp) bp.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = bp.querySelector('.form-error'); err.classList.remove('show');
        try { const f = formData(bp); const r = await api('/api/billpay', { body: f }); receipt('Payment sent', `${money(+f.amount)} paid. Reference ${r.reference}`); views.billpay(); }
        catch (ex) { err.textContent = ex.message; err.classList.add('show'); }
      });
    },

    async cards() {
      await refreshAccounts();
      const withCards = accounts.filter((a) => a.card_last4);
      const name = `${me.first_name} ${me.last_name}`.toUpperCase();
      page.innerHTML = withCards.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:22px">${withCards.map((a) => `
        <div class="card">
          <div class="bank-card ${a.type === 'credit_card' ? 'gold' : ''} ${a.card_locked ? 'locked' : ''}">
            ${a.card_locked ? '<div class="lockbadge">LOCKED</div>' : ''}
            <div style="display:flex;justify-content:space-between;align-items:start"><b style="letter-spacing:.02em">CapitalBridge</b><span class="small" style="opacity:.8">${a.type === 'credit_card' ? 'REWARDS' : 'DEBIT'}</span></div>
            <div class="chip"></div>
            <div class="pan">•••• •••• •••• ${esc(a.card_last4)}</div>
            <div class="row"><span>${esc(name)}</span><span>Exp 09/30</span></div>
          </div>
          <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center">
            <div><b>${esc(acctName(a))}</b><div class="small muted">Linked to ${a.masked}</div></div>
            <label class="check"><input type="checkbox" data-lock="${a.id}" ${a.card_locked ? 'checked' : ''}> Lock card</label>
          </div>
          <p class="small muted" style="margin:12px 0 0">Locking blocks new purchases instantly. Recurring payments may still go through.</p>
        </div>`).join('')}</div>` : '<div class="card"><div class="empty">You have no cards yet.</div></div>';
      page.querySelectorAll('[data-lock]').forEach((c) => c.onchange = async () => {
        try { await api(`/api/accounts/${c.dataset.lock}/card-lock`, { body: { locked: c.checked } }); toast(c.checked ? 'Card locked' : 'Card unlocked', 'success'); views.cards(); }
        catch (ex) { toast(ex.message, 'error'); c.checked = !c.checked; }
      });
    },

    async markets() {
      page.innerHTML = `<div class="two-col"><div class="stack"><div class="card"><div class="card-head"><h2>Markets</h2><span class="asof" id="mAsOf"></span></div><div id="mBox" class="muted">Loading…</div></div></div>
        <div class="card"><div class="card-head"><h2>Headlines</h2></div><div id="nBox" class="news-list muted">Loading…</div></div></div>`;
      const loadM = async () => {
        if (!$('#mBox')) return clearInterval(timer);
        const m = await api('/api/market');
        const row = (q, crypto) => `<tr><td><b>${esc(crypto || !q.symbol.match(/[\^=]/) ? q.symbol : q.name)}</b><div class="small muted">${esc(q.name)}</div></td>
          <td class="amt">${crypto ? money(q.price) : fmtPrice(q)}</td><td class="amt ${q.changePct >= 0 ? 'up' : 'down'}">${pct(q.changePct)}</td></tr>`;
        const sec = (t, list, c) => list ? `<h4 style="margin:16px 0 4px">${t}</h4><table><tbody>${list.map((q) => row(q, c)).join('')}</tbody></table>` : '';
        $('#mBox').innerHTML = sec('Indices & commodities', m.indices) + sec('Stocks', m.stocks) + sec('Crypto (24h)', m.crypto, true) +
          (m.fx ? `<h4 style="margin:16px 0 4px">Currencies (per 1 USD)</h4><table><tbody>${m.fx.rates.map((r) => `<tr><td><b>${r.code}</b></td><td class="amt">${num(r.rate, 4)}</td></tr>`).join('')}</tbody></table>` : '');
        $('#mBox').classList.remove('muted');
        $('#mAsOf').innerHTML = `<span class="live-dot"></span> Updated ${new Date(m.asOf).toLocaleTimeString()}`;
      };
      const timer = setInterval(() => loadM().catch(() => {}), 30000);
      loadM().catch(() => { $('#mBox').textContent = 'Market data unavailable.'; });
      api('/api/news?topic=markets').then(({ items }) => {
        $('#nBox').classList.remove('muted');
        $('#nBox').innerHTML = items.slice(0, 14).map((n) => `<div class="row"><a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">${esc(n.title)}</a>
          <div class="news-meta">${esc(n.source)} · ${n.published ? CB.ago(new Date(n.published).toISOString()) : ''}</div></div>`).join('') || 'No headlines right now.';
      }).catch(() => { $('#nBox').textContent = 'Headlines unavailable.'; });
    },

    async care() {
      page.innerHTML = `<div class="two-col"><div id="careChat"></div>
        <div class="card"><div class="card-head"><h3>About this chat</h3></div>
          <p class="small muted">Our virtual assistant answers right away, any time. Want a human? Tap “Talk to a person” and a CapitalBridge customer care specialist will reply here.</p>
          <p class="small muted">Your full conversation history is saved on this page.</p>
          <p class="small muted" style="display:flex;gap:6px;align-items:center">${icon('shield', 14)} Never share your password, PIN or full card number in chat.</p>
          <p class="small muted">Urgent fraud? Call 1-800-555-0123 (24/7).</p></div></div>`;
      document.body.classList.add('on-care');
      leaveCare = CHAT.embed($('#careChat'));
    },

    async messages() {
      const msgs = await refreshUnread();
      renderNav('messages');
      page.innerHTML = `<div class="card"><div class="card-head"><h2>Secure messages</h2><button class="btn btn-sm" id="newMsg">${icon('plus', 16)} New message</button></div>
        ${msgs.map((m) => `<div class="msg ${m.from_admin && !m.is_read ? 'unread' : ''}" data-id="${m.id}" data-admin="${m.from_admin}">
          <div style="display:flex;justify-content:space-between;gap:10px"><span class="subj">${esc(m.subject)}</span><span class="small muted" style="white-space:nowrap">${m.from_admin ? 'From CapitalBridge' : 'Sent by you'} · ${dateTime(m.created_at)}</span></div>
          <div class="body">${esc(m.body)}</div></div>`).join('') || '<div class="empty">No messages.</div>'}</div>`;
      page.querySelectorAll('.msg').forEach((el) => el.onclick = async () => {
        el.classList.toggle('open');
        if (el.classList.contains('unread')) { el.classList.remove('unread'); await api(`/api/messages/${el.dataset.id}/read`, { method: 'POST' }); unread = Math.max(0, unread - 1); renderNav('messages'); }
      });
      $('#newMsg').onclick = () => modal({
        title: 'Message CapitalBridge', submitText: 'Send',
        body: `<div class="field"><label>Subject</label><input name="subject" required maxlength="120"></div><div class="field"><label>Message</label><textarea name="body" required></textarea></div>
          <p class="small muted">Never include your password or full card number in a message.</p>`,
        onSubmit: async (f) => { await api('/api/messages', { body: formData(f) }); toast('Message sent', 'success'); views.messages(); },
      });
    },

    async profile() {
      page.innerHTML = `<div class="two-col">
        <div class="card"><div class="card-head"><h2>Contact information</h2></div>
          <form id="pf"><div class="form-error"></div>
            <div class="grid-2"><div class="field"><label>First name</label><input value="${esc(me.first_name)}" disabled></div><div class="field"><label>Last name</label><input value="${esc(me.last_name)}" disabled></div></div>
            <div class="grid-2"><div class="field"><label>Email</label><input name="email" type="email" value="${esc(me.email)}"></div><div class="field"><label>Phone</label><input name="phone" value="${esc(me.phone)}"></div></div>
            <div class="field"><label>Street address</label><input name="address" value="${esc(me.address)}"></div>
            <div class="grid-3"><div class="field"><label>City</label><input name="city" value="${esc(me.city)}"></div><div class="field"><label>State</label><input name="state" value="${esc(me.state)}"></div><div class="field"><label>ZIP</label><input name="zip" value="${esc(me.zip)}"></div></div>
            <button class="btn">Save changes</button><p class="small muted" style="margin-top:12px">To change your legal name, contact the bank.</p></form></div>
        <div class="card"><div class="card-head"><h2>Change password</h2></div>
          <form id="pw"><div class="form-error"></div>
            <div class="field"><label>Current password</label><input name="current" type="password" autocomplete="current-password" required></div>
            <div class="field"><label>New password</label><input name="next" type="password" autocomplete="new-password" minlength="8" required></div>
            <div class="field"><label>Confirm new password</label><input name="confirm" type="password" autocomplete="new-password" required></div>
            <button class="btn">Update password</button></form>
          <div class="small muted" style="margin-top:18px">User ID: <b>${esc(me.username)}</b> · Customer since ${date(me.created_at)}</div></div></div>`;
      const handle = (id, fn) => $(id).addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = e.target.querySelector('.form-error'); err.classList.remove('show');
        try { await fn(formData(e.target), e.target); } catch (ex) { err.textContent = ex.message; err.classList.add('show'); }
      });
      handle('#pf', async (f) => { me = (await api('/api/me/profile', { method: 'PUT', body: f })).user; toast('Profile updated', 'success'); });
      handle('#pw', async (f, form) => {
        if (f.next !== f.confirm) throw new Error('New passwords do not match');
        await api('/api/me/password', { body: f }); me.must_change_pw = false; form.reset(); toast('Password updated', 'success');
      });
    },
  };

  function acctTile(a) {
    return `<div class="acct" data-acct="${a.id}" tabindex="0" role="link">
      <div class="ic ${a.is_credit ? 'credit' : ''}">${icon(typeIcon(a.type), 22)}</div>
      <div><div class="t">${esc(acctName(a))} ${a.status !== 'active' ? `<span class="badge warn">${esc(a.status)}</span>` : ''}</div><div class="n">${esc(TYPE_LABEL[a.type] || a.type)} ${a.masked}</div></div>
      <div class="b num">${money(a.balance)}<small>${a.is_credit ? 'Balance owed' : 'Available'}</small></div></div>`;
  }
  function bindAcctTiles() {
    page.querySelectorAll('[data-acct]').forEach((el) => {
      const go = () => (location.hash = '#/accounts/' + el.dataset.acct);
      el.onclick = go; el.onkeydown = (e) => e.key === 'Enter' && go();
    });
  }
  function receipt(title, text) {
    modal({ title, body: `<div class="receipt"><div class="tick">${icon('check', 28)}</div><p>${esc(text)}</p><button type="button" class="btn" onclick="this.closest('.modal-backdrop').remove()">Done</button></div>` });
  }

  let leaveCare = null;
  async function route() {
    if (leaveCare) { leaveCare(); leaveCare = null; }
    document.body.classList.remove('on-care');
    const [, name = 'overview', arg] = location.hash.split('/');
    const view = views[name] ? name : 'overview';
    renderNav(view);
    $('#pageTitle').textContent = NAV.find((n) => n[0] === view)[2];
    $('#sidebar').classList.remove('open');
    page.innerHTML = '<div class="muted">Loading…</div>';
    try { await views[view](arg); } catch (e) { page.innerHTML = `<div class="card"><div class="empty">${esc(e.message)}</div></div>`; }
    window.scrollTo(0, 0);
  }

  async function miniTicker() {
    try {
      const m = await api('/api/market');
      $('#miniTicker').innerHTML = (m.indices || []).slice(0, 3).concat((m.crypto || []).slice(0, 1))
        .map((q) => `<span><b>${esc(q.symbol.match(/[\^=]/) ? q.name : q.symbol)}</b> <span class="num">${fmtPrice(q)}</span> <span class="${q.changePct >= 0 ? 'up' : 'down'}">${pct(q.changePct)}</span></span>`).join('');
    } catch { /* ignore */ }
  }

  (async () => {
    try { me = (await api('/api/me')).user; } catch { return; }
    if (me.role === 'admin') { location.href = '/admin'; return; }
    $('#sideLogo').innerHTML = CB.logo('#/overview');
    $('#who').textContent = `${me.first_name} ${me.last_name}`;
    $('#lastLogin').textContent = me.last_login ? 'Last sign-in ' + dateTime(me.last_login) : '';
    if (me.sample_data) $('#lastLogin').insertAdjacentHTML('afterend', '<div class="demo-line" style="color:#8ea3c0;margin-bottom:10px">Demonstration account · sample data</div>');
    $('#avatar').textContent = (me.first_name[0] || '') + (me.last_name[0] || '');
    $('#hamb').innerHTML = icon('menu', 24);
    $('#hamb').onclick = () => $('#sidebar').classList.toggle('open');
    await refreshUnread().catch(() => {});
    window.addEventListener('hashchange', route);
    route();
    miniTicker(); setInterval(miniTicker, 60000);
    if (me.must_change_pw && location.hash !== '#/profile') toast('Please change your temporary password in Profile & Security');
  })();
})();
