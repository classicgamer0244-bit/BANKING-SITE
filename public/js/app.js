(() => {
  const { api, money, esc, icon, date, dateTime, toast, modal, formData, acctName, TYPE_LABEL, typeIcon, pct, fmtPrice, sparkline, num } = CB;
  const $ = (s) => document.querySelector(s);
  const page = $('#page');
  let me = null, accounts = [], unread = 0;

  const NAV = [
    ['overview', 'home', 'Overview'], ['accounts', 'accounts', 'Accounts'], ['activity', 'list', 'All activity'], ['transfer', 'transfer', 'Transfer & Send'],
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

  // Category sits under the description so the table fits without sideways scrolling.
  function txRows(list, showAcct) {
    return list.map((t) => `<tr data-tx="${t.id}" class="clickable" tabindex="0" role="button" aria-label="View transaction details">
        <td class="tx-date">${date(t.created_at)}</td>
        <td class="tx-desc">${esc(t.description)} ${t.status === 'reversed' ? '<span class="badge bad">Reversed</span>' : ''}
          <div class="small muted"><span class="tx-cat">${esc(t.category.replace('_', ' '))}</span>${showAcct ? `<span class="tx-acct-inline"> · ••${esc(t.account_number.slice(-4))}</span>` : ''}<span class="tx-ref"> · Ref ${esc(t.reference)}</span></div></td>
        ${showAcct ? `<td class="tx-acct">••${esc(t.account_number.slice(-4))}</td>` : ''}
        <td class="amt ${t.direction === 'in' ? 'up' : ''}" style="font-weight:600">${signed(t)}</td>
        ${showAcct ? '' : `<td class="amt muted">${money(t.balance_after)}</td>`}
      </tr>`).join('');
  }
  function txTable(list, showAcct, more = false) {
    if (!list.length) return '<div class="empty">No transactions found.</div>';
    return `<div class="table-wrap"><table class="tx-table"><thead><tr><th>Date</th><th>Description</th>${showAcct ? '<th class="tx-acct">Account</th>' : ''}<th class="amt">Amount</th>${showAcct ? '' : '<th class="amt">Balance</th>'}</tr></thead>
      <tbody data-tx-body>${txRows(list, showAcct)}</tbody></table></div>
      <div class="show-more" ${more ? '' : 'hidden'}><button type="button" class="btn btn-ghost btn-sm" data-tx-more>Show more</button></div>`;
  }

  function bindTxClick(root = page) {
    root.querySelectorAll('[data-tx]').forEach((row) => {
      if (row._txBound) return;
      row._txBound = true;
      const open = () => showTxDetails(row.dataset.tx);
      row.onclick = open;
      row.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    });
  }

  async function showTxDetails(txId) {
    try {
      const { transaction: t } = await api('/api/transactions/' + txId);
      const isCreditDirection = t.direction === 'in';
      const acct = accounts.find((a) => a.id === t.account_id);
      const acctTitle = t.nickname || (acct ? acctName(acct) : (t.account_type ? TYPE_LABEL[t.account_type] || t.account_type : 'Account'));
      const acctNum = t.account_number ? '••••' + t.account_number.slice(-4) : (acct ? acct.masked : '');

      modal({
        title: 'Transaction details',
        submitText: 'Done',
        body: `
          <div style="padding:6px 0">
            <div style="text-align:center;padding:12px 0 18px;border-bottom:1px solid var(--line)">
              <div class="amt ${isCreditDirection ? 'up' : ''}" style="font-size:28px;font-weight:800;letter-spacing:-0.5px">
                ${signed(t)}
              </div>
              <div style="font-size:15px;font-weight:600;margin-top:4px">${esc(t.description)}</div>
              <div style="margin-top:8px">
                <span class="badge ${t.status === 'posted' ? 'good' : 'bad'}">${esc(t.status.toUpperCase())}</span>
                <span class="badge" style="text-transform:capitalize">${esc(t.category.replace('_', ' '))}</span>
              </div>
            </div>

            <div class="detail-grid" style="grid-template-columns:1fr 1fr;margin-top:16px">
              <div><div class="k">Date &amp; Time</div><div class="v">${dateTime(t.created_at)}</div></div>
              <div><div class="k">Reference Number</div><div class="v" style="font-family:monospace;font-size:13px">${esc(t.reference)}</div></div>
              <div><div class="k">Account</div><div class="v">${esc(acctTitle)} ${acctNum}</div></div>
              <div><div class="k">Balance After</div><div class="v num">${money(t.balance_after)}</div></div>
              <div><div class="k">Type</div><div class="v">${t.direction === 'in' ? 'Deposit / Inflow' : 'Withdrawal / Outflow'}</div></div>
              <div><div class="k">Channel</div><div class="v">${t.category === 'transfer' ? 'Transfer & Send' : 'Online Banking'}</div></div>
            </div>
          </div>
        `,
        onSubmit: () => {},
      });
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  let unreadNotifs = 0;
  async function refreshAccounts() { accounts = (await api('/api/accounts')).accounts; }
  async function refreshUnread() {
    const { messages } = await api('/api/messages');
    unread = messages.filter((m) => m.from_admin && !m.is_read).length;
    return messages;
  }

  async function refreshNotifications() {
    try {
      const { notifications, unread: uCount } = await api('/api/notifications');
      unreadNotifs = uCount;
      const badge = $('#notifBadge');
      if (badge) {
        badge.textContent = unreadNotifs;
        badge.hidden = unreadNotifs <= 0;
      }
      return notifications;
    } catch {
      return [];
    }
  }

  async function openNotificationsModal() {
    try {
      const { notifications: rawList } = await api('/api/notifications');
      await api('/api/notifications/read', { method: 'POST' }).catch(() => {});
      const badge = $('#notifBadge');
      if (badge) { badge.hidden = true; badge.textContent = '0'; }
      unreadNotifs = 0;

      // Sort newest notifications to the top, oldest to the bottom
      const notifications = [...rawList].sort((a, b) => new Date(b.created_at.replace(' ', 'T') + 'Z') - new Date(a.created_at.replace(' ', 'T') + 'Z') || b.id - a.id);

      modal({
        title: 'Notifications & Alerts',
        submitText: 'Close',
        body: `
          <div style="max-height:460px;overflow-y:auto;padding:4px 0">
            ${notifications.length ? notifications.map((n) => `
              <div style="padding:12px 14px;border-bottom:1px solid var(--line-2);border-radius:8px;margin-bottom:6px;background:${n.is_read ? 'transparent' : 'rgba(224, 168, 62, .06)'}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                  <b style="font-size:14.5px;color:var(--navy-900)">${esc(n.title)}</b>
                  <span class="small muted" style="white-space:nowrap">${dateTime(n.created_at)}</span>
                </div>
                <div style="font-size:13.5px;color:var(--ink-2);margin-top:4px;line-height:1.45">${esc(n.message)}</div>
                ${n.reference ? `<div class="small muted" style="margin-top:4px;font-family:monospace">Ref: ${esc(n.reference)}</div>` : ''}
              </div>
            `).join('') : '<div class="empty">No notifications yet.</div>'}
          </div>
        `,
        onSubmit: () => {},
      });
    } catch (e) {
      toast(e.message, 'error');
    }
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
            <div class="card"><div class="card-head"><h2>Recent activity</h2><a href="#/activity">View all activity</a></div>${txTable(transactions.slice(0, 10), true)}
              ${transactions.length > 10 ? '<div class="show-more"><a class="btn btn-ghost btn-sm" href="#/activity">View all activity</a></div>' : ''}</div>
          </div>
          <div class="stack">
            <div class="card"><div class="card-head"><h3>Quick actions</h3></div>
              <div class="actions"><a class="btn btn-sm" href="#/transfer">${icon('transfer', 16)} Transfer</a><a class="btn btn-sm btn-ghost" href="#/transfer?mode=external">${icon('download', 16)} Withdraw / Send</a><a class="btn btn-sm btn-ghost" href="#/billpay">${icon('bill', 16)} Pay a bill</a><a class="btn btn-sm btn-ghost" href="#/cards">${icon('card', 16)} Cards</a></div></div>
            <div class="card"><div class="card-head"><h3>Spending · last 30 days</h3></div>
              ${spendRows.length ? `<div class="bars">${spendRows.map(([c, v]) => `<div class="bar-row" title="${esc(c)}: ${money(v)}"><span style="text-transform:capitalize">${esc(c)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (v / maxSpend) * 100)}%"></div></div><span class="num" style="text-align:right">${money(v)}</span></div>`).join('')}</div>`
                : '<div class="empty">No spending in the last 30 days.</div>'}</div>
            <div class="card" id="ovMarkets"><div class="card-head"><h3>Markets</h3><a href="#/markets">More</a></div><div class="muted small">Loading…</div></div>
          </div>
        </div>`;
      bindAcctTiles();
      bindTxClick();
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
      const { account: a, transactions, more } = await api(`/api/accounts/${id}/transactions`);
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
          <div class="actions">
            ${!['cd', 'loan'].includes(a.type) ? `<a class="btn btn-sm btn-ghost" href="#/transfer?from=${a.id}">${icon('transfer', 16)} Transfer</a>` : ''}
            ${!['cd', 'loan', 'credit_card'].includes(a.type) ? `<a class="btn btn-sm btn-ghost" href="#/transfer?from=${a.id}&mode=external">${icon('download', 16)} Withdraw / Send</a>` : ''}
            <input type="search" id="txSearch" placeholder="Search transactions" style="width:180px;padding:7px 12px">
            <a class="btn btn-sm btn-ghost" href="/api/accounts/${a.id}/statement.csv">${icon('download', 16)} Statement</a>
          </div></div>
          <div id="txBox">${txTable(transactions, false, more)}</div></div>`;

      // "Show more" pages through older transactions; search runs on the server across the whole history.
      const box = $('#txBox');
      bindTxClick(box);
      let stopPager = () => {};
      const wireMore = (q) => {
        stopPager();
        stopPager = CB.autoPager(box, (before) => api(`/api/accounts/${a.id}/transactions?before=${before}&q=${encodeURIComponent(q)}`), (list) => txRows(list), () => bindTxClick(box));
      };
      wireMore('');
      let timer;
      $('#txSearch').addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const q = e.target.value.trim();
          const r = await api(`/api/accounts/${a.id}/transactions?q=${encodeURIComponent(q)}`);
          box.innerHTML = txTable(r.transactions, false, r.more);
          bindTxClick(box);
          wireMore(q);
        }, 250);
      });
    },

    async activity() {
      await refreshAccounts();
      page.innerHTML = `<div class="card">
        <div class="card-head" style="flex-wrap:wrap"><h2>All activity</h2>
          <div class="actions"><input type="search" id="actSearch" placeholder="Search activity" style="width:220px;padding:7px 12px">
            <select id="actAccount" style="width:auto;padding:7px 12px"><option value="">All accounts</option>
              ${accounts.map((a) => `<option value="${a.id}">${esc(acctName(a))} ${a.masked}</option>`).join('')}</select></div></div>
        <div id="actBox"><div class="muted">Loading…</div></div></div>`;
      const box = $('#actBox');
      const query = () => `q=${encodeURIComponent($('#actSearch').value.trim())}&account=${$('#actAccount').value}`;
      let stopPager = () => {};
      const wireMore = (qs) => {
        stopPager();
        stopPager = CB.autoPager(box, (before) => api(`/api/activity?${qs}&before=${before}`), (list) => txRows(list, true), () => bindTxClick(box));
      };
      const load = async () => {
        const qs = query();
        const r = await api(`/api/activity?${qs}`);
        box.innerHTML = txTable(r.transactions, true, r.more);
        bindTxClick(box);
        wireMore(qs);
      };
      let timer;
      $('#actSearch').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
      $('#actAccount').addEventListener('change', load);
      await load();
    },

    async transfer(arg, query) {
      const [, tSettings] = await Promise.all([
        refreshAccounts(),
        api('/api/transfer-settings').catch(() => ({ transfers_paused: false, notice_enabled: false })),
      ]);
      const from = debitable().filter((a) => a.type !== 'credit_card');
      const params = query || new URLSearchParams(location.hash.split('?')[1] || '');
      let mode = params.get('mode') === 'external' ? 'external' : 'own';
      const prefillFrom = params.get('from');

      // Popup notice modal
      const showNoticeModal = (forced = false) => {
        if (tSettings.transfers_paused) {
          modal({
            title: tSettings.notice_title || 'Transfers Temporarily Paused',
            submitText: 'Close',
            body: `<div style="padding:10px 0;text-align:center">
              <div style="font-size:36px;margin-bottom:8px">⛔</div>
              <h4 style="color:var(--down);margin-bottom:8px">Transfers &amp; Withdrawals are Paused</h4>
              <p style="color:var(--ink-2);font-size:15px;line-height:1.5">${esc(tSettings.notice_message || 'Transfers and withdrawals are temporarily paused by bank administration. Please try again later or contact customer support.')}</p>
            </div>`,
            onSubmit: () => {},
          });
          return true;
        }
        if (tSettings.notice_enabled && (forced || !sessionStorage.getItem('cb_notice_seen'))) {
          sessionStorage.setItem('cb_notice_seen', '1');
          modal({
            title: tSettings.notice_title || 'Important Notice',
            submitText: 'Acknowledge & Continue',
            body: `<div style="padding:6px 0">
              <div class="badge ${tSettings.notice_type === 'paused' ? 'bad' : tSettings.notice_type === 'warning' ? 'warn' : 'info'}" style="margin-bottom:12px;font-size:12px;text-transform:uppercase">
                ${tSettings.notice_type || 'Notice'}
              </div>
              <p style="font-size:15px;line-height:1.6;color:var(--ink)">${esc(tSettings.notice_message)}</p>
            </div>`,
            onSubmit: () => {},
          });
          return true;
        }
        return false;
      };

      showNoticeModal();

      page.innerHTML = `
        ${tSettings.transfers_paused ? `
        <div style="background:#fcebeb;border:1px solid #f7c3c3;color:#9e1b1b;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:24px">⛔</span>
            <div><b>Transfers &amp; Withdrawals are Paused</b><div style="font-size:14px;margin-top:2px;color:#7a1414">${esc(tSettings.notice_message)}</div></div>
          </div>
          <button type="button" class="btn btn-sm btn-danger" id="bannerNoticeBtn">View details</button>
        </div>` : ''}

        <div class="two-col">
          <div class="card">
            <div class="card-head">
              <h2>Move money &amp; transfers</h2>
              <div class="tabs" id="tTabs">
                <button class="${mode === 'own' ? 'on' : ''}" data-m="own">Between my accounts</button>
                <button class="${mode === 'other' ? 'on' : ''}" data-m="other">To CapitalBridge customer</button>
                <button class="${mode === 'external' ? 'on' : ''}" data-m="external">To another bank (ACH / Wire)</button>
              </div>
            </div>
            <form id="tForm">
              <div class="form-error"></div>
              
              <div class="field">
                <label>From account</label>
                <select name="fromId" required>
                  ${from.map((a) => `<option value="${a.id}" ${prefillFrom == a.id ? 'selected' : ''}>${esc(acctName(a))} ${a.masked} (${money(a.balance)})</option>`).join('')}
                </select>
              </div>

              <!-- Own Accounts -->
              <div class="field" id="toOwn" style="${mode === 'own' ? '' : 'display:none'}">
                <label>To my account</label>
                <select name="toId">
                  ${accounts.filter((a) => a.status === 'active' && !['cd', 'investment'].includes(a.type)).map(acctOpt).join('')}
                </select>
              </div>

              <!-- Other CapitalBridge Customer -->
              <div class="field" id="toOther" style="${mode === 'other' ? '' : 'display:none'}">
                <label>Recipient's CapitalBridge account number</label>
                <input name="toNumber" inputmode="numeric" placeholder="12-digit account number (e.g. 472963261025)">
              </div>

              <!-- External Bank Transfer -->
              <div id="toExternal" style="${mode === 'external' ? '' : 'display:none'}">
                <div class="field">
                  <label>Destination bank</label>
                  <select name="recipientBankSelect" id="extBankSelect">
                    <option value="">Select destination bank...</option>
                    <option value="JPMorgan Chase">JPMorgan Chase</option>
                    <option value="Bank of America">Bank of America</option>
                    <option value="Wells Fargo">Wells Fargo</option>
                    <option value="Citibank">Citibank</option>
                    <option value="Capital One">Capital One</option>
                    <option value="PNC Bank">PNC Bank</option>
                    <option value="U.S. Bank">U.S. Bank</option>
                    <option value="TD Bank">TD Bank</option>
                    <option value="other">Other bank or credit union...</option>
                  </select>
                </div>
                <div class="field" id="extBankOtherField" style="display:none">
                  <label>Bank name</label>
                  <input name="recipientBankOther" maxlength="80" placeholder="e.g. Regions Bank, Navy Federal">
                </div>
                <div class="grid-2">
                  <div class="field">
                    <label>Routing number (9 digits)</label>
                    <input name="routingNumber" id="extRoutingInput" maxlength="9" inputmode="numeric" placeholder="e.g. 021000021">
                  </div>
                  <div class="field">
                    <label>Account type</label>
                    <select name="accountType">
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                </div>
                <div class="grid-2">
                  <div class="field">
                    <label>Recipient account number</label>
                    <input name="accountNumber" maxlength="24" inputmode="numeric" placeholder="Account number">
                  </div>
                  <div class="field">
                    <label>Confirm account number</label>
                    <input name="confirmAccount" maxlength="24" inputmode="numeric" placeholder="Re-type account number">
                  </div>
                </div>
                <div class="field">
                  <label>Recipient name (person or business)</label>
                  <input name="recipientName" maxlength="80" placeholder="e.g. John Doe or Summit LLC">
                </div>
                <div class="field">
                  <label>Transfer method &amp; speed</label>
                  <select name="speed">
                    <option value="standard">Standard ACH (1–2 business days · Free)</option>
                    <option value="wire">Domestic Wire (Same-day delivery · Priority)</option>
                  </select>
                </div>
              </div>

              <div class="grid-2">
                <div class="field"><label>Amount (USD)</label><input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00"></div>
                <div class="field"><label>Memo (optional)</label><input name="memo" maxlength="120" placeholder="What's this for?"></div>
              </div>

              <button class="btn btn-gold" type="submit" id="submitTransferBtn" ${tSettings.transfers_paused ? 'disabled' : ''}>
                ${tSettings.transfers_paused ? 'Transfers Paused' : 'Review transfer'}
              </button>
            </form>
          </div>
          <div class="card">
            <div class="card-head"><h3>Good to know</h3></div>
            <p class="small muted"><b>Internal transfers:</b> Transfers between your CapitalBridge accounts or to other CapitalBridge members are instant and free, 24/7.</p>
            <p class="small muted"><b>External bank transfers:</b> Standard ACH transfers clear within 1–2 business days. Domestic wire transfers process on the same business day.</p>
            <p class="small muted"><b>Verification:</b> Always confirm the 9-digit ABA routing number and recipient account number before dispatching external wires.</p>
            <p class="small muted">${icon('shield', 14)} CapitalBridge will never contact you asking you to transfer funds to "protect" or "secure" your account.</p>
          </div>
        </div>`;

      $('#bannerNoticeBtn')?.addEventListener('click', () => showNoticeModal(true));

      // Tab switching
      $('#tTabs').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        mode = b.dataset.m;
        $('#tTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        $('#toOwn').style.display = mode === 'own' ? '' : 'none';
        $('#toOther').style.display = mode === 'other' ? '' : 'none';
        $('#toExternal').style.display = mode === 'external' ? '' : 'none';
      });

      // Bank select
      const bankSel = $('#extBankSelect');
      const bankOtherField = $('#extBankOtherField');
      if (bankSel) {
        bankSel.addEventListener('change', () => {
          if (bankSel.value === 'other') {
            bankOtherField.style.display = '';
          } else {
            bankOtherField.style.display = 'none';
          }
        });
      }

      // Form submission
      $('#tForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const err = e.target.querySelector('.form-error'); err.classList.remove('show');

        // Check if transfers paused
        if (tSettings.transfers_paused) {
          showNoticeModal(true);
          return;
        }

        const f = formData(e.target);
        if (!(+f.amount > 0)) { err.textContent = 'Enter an amount greater than $0.00'; err.classList.add('show'); return; }

        let body = { fromId: f.fromId, amount: f.amount, memo: f.memo, type: mode };
        let toLabel = '';
        let deliveryLabel = 'Instant';

        if (mode === 'own') {
          body.toId = f.toId;
          const ta = accounts.find((a) => a.id == f.toId);
          toLabel = ta ? `${esc(acctName(ta))} ${ta.masked}` : 'Own account';
        } else if (mode === 'other') {
          if (!f.toNumber || f.toNumber.trim().length < 8) {
            err.textContent = 'Enter a valid recipient account number';
            err.classList.add('show');
            return;
          }
          body.toNumber = f.toNumber;
          toLabel = `CapitalBridge Account ••${esc(f.toNumber.slice(-4))}`;
        } else if (mode === 'external') {
          const bankName = f.recipientBankSelect === 'other' ? (f.recipientBankOther || '').trim() : f.recipientBankSelect;
          if (!bankName) { err.textContent = 'Select or enter recipient destination bank'; err.classList.add('show'); return; }
          if (!/^\d{9}$/.test((f.routingNumber || '').trim())) { err.textContent = 'Routing number must be exactly 9 digits'; err.classList.add('show'); return; }
          if (!f.accountNumber || f.accountNumber.trim().length < 4) { err.textContent = 'Enter a valid recipient account number'; err.classList.add('show'); return; }
          if (f.accountNumber.trim() !== (f.confirmAccount || '').trim()) { err.textContent = 'Account numbers do not match'; err.classList.add('show'); return; }
          if (!f.recipientName || !f.recipientName.trim()) { err.textContent = 'Enter the recipient full or business name'; err.classList.add('show'); return; }

          body = {
            ...body,
            recipientBank: bankName,
            routingNumber: f.routingNumber.trim(),
            accountNumber: f.accountNumber.trim(),
            recipientName: f.recipientName.trim(),
            accountType: f.accountType,
            speed: f.speed,
          };
          toLabel = `${esc(bankName)} ••${esc(f.accountNumber.slice(-4))} (${esc(f.recipientName)})`;
          deliveryLabel = f.speed === 'wire' ? 'Same-day Wire' : '1–2 Business Days (ACH)';
        }

        const fa = accounts.find((a) => a.id == f.fromId);

        // Open confirm transfer modal
        const proceedWithConfirmation = () => {
          modal({
            title: 'Confirm transfer details',
            submitText: 'Send ' + money(+f.amount),
            body: `<div class="detail-grid" style="grid-template-columns:1fr 1fr">
              <div><div class="k">From</div><div class="v">${esc(acctName(fa))} ${fa.masked}</div></div>
              <div><div class="k">To destination</div><div class="v">${toLabel}</div></div>
              <div><div class="k">Amount</div><div class="v num" style="font-size:18px;font-weight:700">${money(+f.amount)}</div></div>
              <div><div class="k">Estimated delivery</div><div class="v">${deliveryLabel}</div></div>
              ${f.memo ? `<div style="grid-column:span 2"><div class="k">Memo</div><div class="v">${esc(f.memo)}</div></div>` : ''}
            </div>`,
            onSubmit: async () => {
              const r = await api('/api/transfers', { body });
              refreshNotifications().catch(() => {});
              modal({
                title: 'Transfer dispatched successfully',
                submitText: 'Done',
                body: `<div class="receipt" style="text-align:center;padding:12px 0">
                  <div class="tick" style="margin:0 auto 12px">${icon('check', 32)}</div>
                  <h3 style="margin-bottom:4px">${money(+f.amount)} Dispatched</h3>
                  <div class="badge good" style="margin-bottom:14px">Processing · Reference ${esc(r.reference)}</div>
                  <div class="detail-grid" style="grid-template-columns:1fr 1fr;text-align:left;margin-top:12px">
                    <div><div class="k">From</div><div class="v">${esc(acctName(fa))} ${fa.masked}</div></div>
                    <div><div class="k">To</div><div class="v">${toLabel}</div></div>
                    <div><div class="k">Delivery</div><div class="v">${deliveryLabel}</div></div>
                    <div><div class="k">Timestamp</div><div class="v">${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div></div>
                  <div style="display:flex;gap:10px;justify-content:center;margin-top:18px">
                    <a href="#/activity" class="btn btn-gold" onclick="this.closest('.modal-backdrop').remove()">View activity</a>
                    <button type="button" class="btn btn-ghost" onclick="this.closest('.modal-backdrop').remove();views.transfer()">Done</button>
                  </div>
                </div>`,
                onSubmit: null,
              });
            },
          });
        };

        // If notice is enabled, show the notice before confirm
        if (tSettings.notice_enabled) {
          modal({
            title: tSettings.notice_title || 'Transfer Notice',
            submitText: 'Acknowledge & Continue',
            body: `<div style="padding:6px 0">
              <div class="badge ${tSettings.notice_type === 'warning' ? 'warn' : 'info'}" style="margin-bottom:12px;font-size:12px;text-transform:uppercase">
                ${tSettings.notice_type || 'Notice'}
              </div>
              <p style="font-size:15px;line-height:1.6;color:var(--ink)">${esc(tSettings.notice_message)}</p>
            </div>`,
            onSubmit: () => { proceedWithConfirmation(); },
          });
        } else {
          proceedWithConfirmation();
        }
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
    const rawHash = location.hash.replace(/^#\/?/, '');
    const [pathPart, queryPart] = rawHash.split('?');
    const [name = 'overview', arg] = pathPart.split('/');
    const view = views[name] ? name : 'overview';
    renderNav(view);
    const navItem = NAV.find((n) => n[0] === view);
    $('#pageTitle').textContent = navItem ? navItem[2] : 'Overview';
    $('#sidebar').classList.remove('open');
    page.innerHTML = '<div class="muted">Loading…</div>';
    try { await views[view](arg, new URLSearchParams(queryPart || '')); } catch (e) { page.innerHTML = `<div class="card"><div class="empty">${esc(e.message)}</div></div>`; }
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
    $('#avatar').textContent = (me.first_name[0] || '') + (me.last_name[0] || '');
    $('#hamb').innerHTML = icon('menu', 24);
    $('#hamb').onclick = () => $('#sidebar').classList.toggle('open');
    // Floating "Back to top": shows once you've scrolled down a long list.
    const toTop = $('#toTop');
    const syncToTop = () => {
      const top = window.scrollY || document.documentElement.scrollTop || 0;
      toTop.hidden = top < 300;
    };
    window.addEventListener('scroll', syncToTop, { passive: true });
    document.addEventListener('scroll', syncToTop, { passive: true });
    window.addEventListener('hashchange', () => setTimeout(syncToTop, 50));
    syncToTop();
    toTop.onclick = () => {
      const start = window.scrollY || document.documentElement.scrollTop || 0;
      try {
        window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } catch {
        window.scrollTo(0, 0);
      }
      // Some browsers/webviews ignore smooth scrolling; if nothing moved, jump straight up.
      setTimeout(() => {
        const cur = window.scrollY || document.documentElement.scrollTop || 0;
        if (cur >= start && cur > 0) window.scrollTo(0, 0);
      }, 250);
    };
    // Wire Notifications Bell
    const notifWrap = $('#notifIconWrap');
    if (notifWrap) notifWrap.innerHTML = icon('bell', 20);
    const notifBtn = $('#notifBtn');
    if (notifBtn) notifBtn.onclick = () => openNotificationsModal();
    await refreshNotifications().catch(() => {});
    setInterval(() => refreshNotifications().catch(() => {}), 30000);

    // 5-minute inactivity auto-logout system
    const IDLE_LIMIT_MS = 5 * 60 * 1000;
    const WARN_BEFORE_MS = 30 * 1000; // 30-second warning modal
    let lastActive = Date.now();
    let idleCheckTimer = null;
    let warnedModal = null;

    const recordActivity = () => {
      lastActive = Date.now();
      if (warnedModal) {
        warnedModal.close();
        warnedModal = null;
      }
    };

    ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach((evt) => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    const checkIdle = () => {
      const elapsed = Date.now() - lastActive;
      if (elapsed >= IDLE_LIMIT_MS) {
        clearInterval(idleCheckTimer);
        toast('Signed out due to 5 minutes of inactivity', 'warn');
        setTimeout(() => { CB.logout(); }, 500);
        return;
      }
      if (elapsed >= IDLE_LIMIT_MS - WARN_BEFORE_MS && !warnedModal) {
        const remainingSec = Math.max(1, Math.round((IDLE_LIMIT_MS - elapsed) / 1000));
        warnedModal = modal({
          title: 'Session Inactivity Warning',
          submitText: 'Continue banking session',
          body: `
            <div style="padding:10px 0;text-align:center">
              <div style="font-size:32px;margin-bottom:8px">⏱️</div>
              <h4 style="margin-bottom:6px">Are you still there?</h4>
              <p style="color:var(--ink-2);font-size:14.5px;line-height:1.5">
                For your security, your session will automatically end due to inactivity in <b>30 seconds</b>.
              </p>
            </div>
          `,
          onSubmit: () => {
            recordActivity();
          },
        });
      }
    };

    idleCheckTimer = setInterval(checkIdle, 5000);

    await refreshUnread().catch(() => {});
    window.addEventListener('hashchange', route);
    route();
    miniTicker(); setInterval(miniTicker, 60000);
  })();
})();
