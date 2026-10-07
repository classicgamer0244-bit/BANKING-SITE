(() => {
  const { api, money, esc, icon, date, dateTime, toast, modal, formData, acctName, TYPE_LABEL, typeIcon, num } = CB;
  const $ = (s) => document.querySelector(s);
  const page = $('#page');
  let me = null, stats = null, careTimer = null, config = { demo: false };
  const SAMPLE_FIELDS = [['checking', 'Checking ($)'], ['savings', 'Savings ($)'], ['money_market', 'Money market ($)'], ['cd', 'CD ($)'],
    ['credit_card', 'Credit card owed ($)'], ['loan', 'Loan owed ($)'], ['investment', 'Investment ($)']];

  const NAV = [
    ['dashboard', 'home', 'Dashboard'], ['customers', 'users', 'Customers'], ['transactions', 'list', 'Transactions'],
    ['transfers', 'transfer', 'Transfer controls'],
    ['care', 'users', 'Customer care chat'], ['requests', 'bill', 'Requests'], ['inbox', 'mail', 'Secure messages'], ['announcements', 'news', 'Announcements'], ['audit', 'shield', 'Audit log'], ['settings', 'user', 'My settings'],
  ];
  const TYPES = Object.keys(TYPE_LABEL);
  const CATEGORIES = ['deposit', 'withdrawal', 'payroll', 'interest', 'fee', 'refund', 'adjustment', 'payment', 'purchase', 'groceries', 'dining', 'travel', 'shopping', 'utilities', 'loan', 'other'];

  function renderNav(active) {
    $('#sideNav').innerHTML = NAV.map(([k, i, l]) => `<a href="#/${k}" class="${k === active ? 'on' : ''}">${icon(i)}${l}
      ${k === 'inbox' && stats?.unread ? `<span class="count">${stats.unread}</span>` : ''}
      ${k === 'requests' && stats?.newRequests ? `<span class="count">${stats.newRequests}</span>` : ''}
      ${k === 'care' && stats?.chatsWaiting ? `<span class="count">${stats.chatsWaiting}</span>` : ''}</a>`).join('');
  }
  const statusBadge = (s) => `<span class="badge ${s === 'active' || s === 'posted' ? 'good' : s === 'frozen' || s === 'suspended' ? 'warn' : 'bad'}">${esc(s)}</span>`;
  const signed = (t) => (t.direction === 'in' ? '+' : '−') + money(t.amount);
  const genPassword = () => {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const a = crypto.getRandomValues(new Uint32Array(12));
    return Array.from(a, (n) => c[n % c.length]).join('');
  };

  // Compact transaction rows: date over time, category under the description, so the table fits without scrolling.
  function txRows(list, { withCustomer, reversible = true } = {}) {
    return list.map((t) => `<tr data-tx="${t.id}">
        <td class="tx-date">${date(t.created_at)}<div class="small muted">${new Date(t.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div></td>
        ${withCustomer ? `<td><a href="#/customer/${t.user_id}">${esc(t.customer)}</a></td>` : ''}
        <td class="tx-acct">••${esc(t.account_number.slice(-4))}<div class="small muted">${esc((TYPE_LABEL[t.account_type] || t.account_type).replace('Bridge ', '').replace(' Account', ''))}</div></td>
        <td class="tx-desc">${esc(t.description)} ${t.status === 'reversed' ? statusBadge('reversed') : ''}
          <div class="small muted"><span class="tx-cat">${esc(t.category)}</span> · ${esc(t.reference)}</div></td>
        <td class="amt ${t.direction === 'in' ? 'up' : ''}" style="font-weight:600">${signed(t)}</td>
        <td class="amt muted">${money(t.balance_after)}</td>
        ${reversible ? `<td class="amt">${t.status === 'posted' && t.category !== 'reversal' ? `<button class="link-btn small" data-reverse="${t.id}" data-ref="${esc(t.reference)}">Reverse</button>` : ''}</td>` : ''}
      </tr>`).join('');
  }
  function txTable(list, opts = {}) {
    if (!list.length) return '<div class="empty">No transactions.</div>';
    const { withCustomer, reversible = true, more = false } = opts;
    return `<div class="table-wrap"><table class="tx-table"><thead><tr><th>Date</th>${withCustomer ? '<th>Customer</th>' : ''}<th>Account</th><th>Description</th>
        <th class="amt">Amount</th><th class="amt">Balance</th>${reversible ? '<th></th>' : ''}</tr></thead>
      <tbody data-tx-body>${txRows(list, opts)}</tbody></table></div>
      <div class="show-more" ${more ? '' : 'hidden'}><button type="button" class="btn btn-ghost btn-sm" data-tx-more>Show more</button></div>`;
  }
  // "Show more" under a txTable: one click, then older rows keep loading as you scroll.
  let stopPager = () => {};
  function attachShowMore(root, fetchPage, opts, onLoaded) {
    stopPager();
    stopPager = CB.autoPager(root, fetchPage, (list) => txRows(list, opts), onLoaded);
  }
  function bindReverse(after) {
    page.querySelectorAll('[data-reverse]').forEach((b) => b.onclick = () => modal({
      title: 'Reverse transaction', submitText: 'Reverse', danger: true,
      body: `<p>Post an offsetting entry for <b>${esc(b.dataset.ref)}</b>? The original is marked reversed. This can overdraw the account if the funds were already used.</p>`,
      onSubmit: async () => { await api(`/api/admin/transactions/${b.dataset.reverse}/reverse`, { method: 'POST' }); toast('Transaction reversed', 'success'); after(); },
    }));
  }

  // ---------- account opening fields (reused) ----------
  const accountFields = (prefix = '') => `
    <div class="grid-2">
      <div class="field"><label>Account type</label><select name="${prefix}type" data-acct-type>${TYPES.map((t) => `<option value="${t}">${TYPE_LABEL[t]}</option>`).join('')}</select></div>
      <div class="field"><label>Nickname (optional)</label><input name="${prefix}nickname" maxlength="40"></div>
    </div>
    <div class="grid-3">
      <div class="field"><label data-open-label>Opening deposit ($)</label><input name="${prefix}opening" type="number" step="0.01" min="0" value="0"></div>
      <div class="field"><label data-rate-label>APY</label><div class="rate-auto" data-rate-show></div></div>
      <div class="field" data-limit style="display:none"><label>Credit limit ($)</label><input name="${prefix}credit_limit" type="number" step="0.01" min="0" value="5000"></div>
    </div>`;
  // Mirrors standardRate() on the server, which is what actually gets applied.
  const standardRate = (type, opening) => ({ checking: 0.01, savings: 0.01, cd: 0.03, credit_card: 21.99, loan: 9.49, investment: 0 }[type]
    ?? (opening >= 25000 ? 0.03 : opening >= 10000 ? 0.02 : 0.01));
  const RATE_NOTE = { money_market: 'tiered by balance', cd: 'standard term', investment: 'no interest' };
  function wireAccountFields(root) {
    const sel = root.querySelector('[data-acct-type]');
    const opening = root.querySelector('[name$="opening"]');
    const upd = () => {
      const t = sel.value, credit = t === 'credit_card' || t === 'loan';
      root.querySelector('[data-limit]').style.display = t === 'credit_card' ? '' : 'none';
      root.querySelector('[data-rate-label]').textContent = credit ? 'APR (automatic)' : 'APY (automatic)';
      root.querySelector('[data-open-label]').textContent = t === 'loan' ? 'Loan principal ($)' : t === 'credit_card' ? 'Opening balance owed ($)' : 'Opening deposit ($)';
      root.querySelector('[data-rate-show]').innerHTML = `<b>${num(standardRate(t, Number(opening.value) || 0), 2)}%</b> <span class="small muted">${RATE_NOTE[t] || 'standard rate'}</span>`;
    };
    sel.onchange = upd; opening.oninput = upd; upd();
  }

  function createCustomer(prefill = {}, onCreated) {
    const m = modal({
      title: 'Create customer', wide: true, submitText: 'Create customer',
      body: `
        <h4 style="margin-bottom:12px">Personal information</h4>
        <div class="grid-2"><div class="field"><label>First name *</label><input name="first_name" required></div><div class="field"><label>Last name *</label><input name="last_name" required></div></div>
        <div class="grid-3"><div class="field"><label>Email</label><input name="email" type="email"></div><div class="field"><label>Phone</label><input name="phone"></div><div class="field"><label>Date of birth</label><input name="dob" type="date"></div></div>
        <div class="field"><label>Street address</label><input name="address"></div>
        <div class="grid-3"><div class="field"><label>City</label><input name="city"></div><div class="field"><label>State</label><input name="state"></div><div class="field"><label>ZIP</label><input name="zip"></div></div>
        <div class="grid-3"><div class="field"><label>SSN (last 4 only)</label><input name="ssn_last4" maxlength="4" inputmode="numeric"></div></div>
        <h4 style="margin:10px 0 12px">Employment</h4>
        <div class="grid-3"><div class="field"><label>Job title</label><input name="job_title" maxlength="80" placeholder="e.g. Registered Nurse"></div>
          <div class="field"><label>Employer</label><input name="employer" maxlength="80" placeholder="e.g. Summit Health Partners"></div>
          <div class="field"><label>Annual salary ($)</label><input name="annual_salary" type="number" min="0" step="1000" placeholder="optional"></div></div>
        <p class="small muted" style="margin:-6px 0 12px">Initial paychecks come from this employer and are sized from the salary (about 75% after taxes, every two weeks).</p>
        <h4 style="margin:10px 0 12px">Online banking login</h4>
        <div class="grid-2"><div class="field"><label>User ID *</label><input name="username" required minlength="4" autocomplete="off"></div>
          <div class="field"><label>Password *</label><div style="display:flex;gap:6px"><input name="password" required minlength="8" autocomplete="new-password" value="${genPassword()}"><button type="button" class="btn btn-ghost btn-sm" data-gen>New</button></div></div></div>
        <div class="sample-box">
          <label class="check" style="margin:0 0 4px"><input type="checkbox" name="with_sample" checked> <b>Generate accounts &amp; initial history</b></label>
          <p class="small muted" style="margin:0 0 12px">Enter the total deposits and the dates. Accounts, card numbers, transactions and messages are created automatically — the total is split across checking, savings and (for larger amounts) money market and investment.</p>
          <div data-sample-fields>
            <div class="grid-3"><div class="field"><label>Total deposits ($)</label><input type="number" name="s_total" min="0.01" step="0.01" placeholder="e.g. 85000"></div>
              <div class="field"><label>From</label><input type="date" name="s_from" max="${new Date().toISOString().slice(0, 10)}"></div>
              <div class="field"><label>To</label><input type="date" name="s_to" max="${new Date().toISOString().slice(0, 10)}" value="${new Date().toISOString().slice(0, 10)}"></div></div>
            <p class="small" style="margin:-4px 0 12px"><button type="button" class="link-btn" data-per-account>Set amounts per account instead</button></p>
            <div data-per-account-fields style="display:none">
              <div class="grid-3">${SAMPLE_FIELDS.map(([k, l]) => `<div class="field"><label>${l}</label><input type="number" name="s_${k}" min="0" step="0.01" placeholder="—"></div>`).join('')}</div>
            </div>
          </div>
        </div>
        <div data-first-account>
        <h4 style="margin:10px 0 12px">Open first account <span class="small muted">(optional)</span></h4>
        <label class="check small" style="margin-bottom:12px"><input type="checkbox" name="with_account" checked> Open an account now</label>
        <div data-acct-box>${accountFields('a_')}</div></div>`,
      onSubmit: async (f) => {
        const d = formData(f);
        const body = { ...d, accounts: d.with_account ? [{ type: d.a_type, nickname: d.a_nickname, opening: d.a_opening, credit_limit: d.a_credit_limit }] : [] };
        if (d.with_sample) {
          body.accounts = [];
          const perAccount = f.querySelector('[data-per-account-fields]').style.display !== 'none';
          body.sample = perAccount
            ? { from: d.s_from, to: d.s_to, holdings: Object.fromEntries(SAMPLE_FIELDS.map(([k]) => [k, d['s_' + k]])) }
            : { from: d.s_from, to: d.s_to, total: d.s_total };
        }
        const r = await api('/api/admin/users', { body });
        toast(r.generated?.length
          ? `Customer created with ${r.generated.length} account${r.generated.length > 1 ? 's' : ''} and ${r.generated.reduce((s, g) => s + g.transactions, 0)} transactions`
          : `Customer ${d.first_name} ${d.last_name} created`, 'success');
        if (onCreated) await onCreated(r.id);
        location.hash = '#/customer/' + r.id;
      },
    });
    for (const [k, v] of Object.entries(prefill)) if (m.el[k] && v != null) m.el[k].value = v;
    wireAccountFields(m.el);
    if (m.el.with_sample) {
      const sync = () => {
        const on = m.el.with_sample.checked;
        m.el.querySelector('[data-sample-fields]').style.display = on ? '' : 'none';
        m.el.querySelector('[data-first-account]').style.display = on ? 'none' : '';
      };
      m.el.with_sample.onchange = sync; sync();
      const toggle = m.el.querySelector('[data-per-account]');
      toggle.onclick = () => {
        const box = m.el.querySelector('[data-per-account-fields]');
        const per = box.style.display === 'none';
        box.style.display = per ? '' : 'none';
        m.el.s_total.closest('.field').style.display = per ? 'none' : '';
        toggle.textContent = per ? 'Use one total instead' : 'Set amounts per account instead';
      };
    }
    m.el.querySelector('[data-gen]').onclick = () => (m.el.password.value = genPassword());
    m.el.with_account.onchange = (e) => (m.el.querySelector('[data-acct-box]').style.display = e.target.checked ? '' : 'none');
  }

  // ---------- website requests ----------
  const rqBadge = (s) => `<span class="badge ${s === 'new' ? 'warn' : s === 'closed' ? 'good' : 'info'}">${esc(s.replace('_', ' '))}</span>`;
  const PRODUCT_LABEL = { checking: 'Bridge Checking', savings: 'Bridge Savings', money_market: 'Money Market', cd: 'CD', credit_card: 'Rewards Credit Card', mortgage: 'Mortgage / Refinance', auto_loan: 'Auto loan', personal_loan: 'Personal loan', investment: 'Bridge Invest / IRA' };
  const PRODUCT_TO_TYPE = { checking: 'checking', savings: 'savings', money_market: 'money_market', cd: 'cd', credit_card: 'credit_card', mortgage: 'loan', auto_loan: 'loan', personal_loan: 'loan', investment: 'investment' };
  function summary(r) {
    const d = r.data;
    switch (r.kind) {
      case 'application': return `${PRODUCT_LABEL[d.product] || d.product}${d.amount ? ' · $' + d.amount : ''}${d.city ? ' · ' + d.city + ', ' + d.state : ''}`;
      case 'appointment': return `${d.topic || ''} · ${d.date || ''} ${d.time || ''} · ${d.branch || ''}`;
      case 'password_reset': return `${d.issue || ''}${d.username ? ' · User ID ' + d.username : ''}`;
      case 'fraud': return `${d.fraud_type || ''}${d.amount ? ' · $' + d.amount : ''}`;
      case 'lost_card': return `${d.status || ''} ${d.card_type || ''}${d.card_last4 ? ' ••' + d.card_last4 : ''}`;
      default: return `${d.topic || ''}${d.subject ? ' · ' + d.subject : ''}`;
    }
  }
  const LABELS = { product: 'Product', amount: 'Amount', funding: 'Funding', dob: 'Date of birth', citizenship: 'Citizenship', address: 'Address', city: 'City', state: 'State', zip: 'ZIP', employment: 'Employment', income: 'Annual income', consent: 'Consent', contact_method: 'Preferred contact', topic: 'Topic', subject: 'Subject', message: 'Message', branch: 'Location', date: 'Date', time: 'Time', notes: 'Notes', issue: 'Issue', username: 'User ID', fraud_type: 'Type', status: 'Card status', card_type: 'Card type', card_last4: 'Card last 4', ship_to: 'Ship replacement to' };

  function openRequest(r, reload) {
    const d = r.data;
    const rows = [['Name', r.name], ['Email', r.email], ['Phone', r.phone], ...Object.entries(d).filter(([, v]) => v).map(([k, v]) => [LABELS[k] || k, k === 'product' ? PRODUCT_LABEL[v] || v : v])];
    const m = modal({
      title: `${r.label} · ${r.reference}`, wide: true, submitText: 'Save',
      body: `<div class="small muted" style="margin-bottom:14px">Received ${dateTime(r.created_at)} · ${rqBadge(r.status)}</div>
        <table class="data-table"><tbody>${rows.map(([k, v]) => `<tr><td style="width:180px">${esc(k)}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</tbody></table>
        <div class="grid-2" style="margin-top:18px"><div class="field"><label>Status</label><select name="status">${['new', 'in_progress', 'closed'].map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select></div></div>
        <div class="field"><label>Internal notes</label><textarea name="notes" placeholder="Visible to admins only">${esc(r.notes)}</textarea></div>
        <div class="actions" data-rq-actions></div>`,
      onSubmit: async (f) => { await api('/api/admin/requests/' + r.id, { body: formData(f) }); toast('Request updated', 'success'); reload(); },
    });
    const box = m.el.querySelector('[data-rq-actions]');
    const [first, ...rest] = r.name.trim().split(/\s+/);
    if (r.kind === 'application' && r.status !== 'closed') {
      box.innerHTML = '<button type="button" class="btn btn-gold btn-sm" data-approve>Approve &amp; create customer</button>';
      box.querySelector('[data-approve]').onclick = () => {
        m.close();
        const type = PRODUCT_TO_TYPE[d.product] || 'checking';
        const base = (first + (rest.at(-1) || '')).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'customer';
        createCustomer({
          first_name: first, last_name: rest.join(' '), email: r.email, phone: r.phone, dob: d.dob, address: d.address, city: d.city, state: d.state, zip: d.zip,
          username: base + Math.floor(100 + Math.random() * 900), a_type: type, a_opening: type === 'credit_card' ? 0 : (d.amount || 0),
          a_nickname: ['mortgage', 'auto_loan', 'personal_loan'].includes(d.product) ? PRODUCT_LABEL[d.product] : '',
        }, (id) => api('/api/admin/requests/' + r.id, { body: { status: 'closed', notes: `${r.notes ? r.notes + '\n' : ''}Approved: customer #${id} created.` } }));
      };
    }
    if (['password_reset', 'lost_card', 'fraud'].includes(r.kind) && (d.username || r.email)) {
      box.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-ghost btn-sm" data-find>Find matching customer</button>`);
      box.querySelector('[data-find]').onclick = async () => {
        const { users } = await api('/api/admin/users?q=' + encodeURIComponent(d.username || r.email));
        if (!users.length) return toast('No customer matches this User ID or email', 'error');
        m.close(); location.hash = '#/customer/' + users[0].id;
      };
    }
  }

  // ---------- views ----------
  const views = {
    async dashboard() {
      const [s, { transactions }, { messages }] = await Promise.all([api('/api/admin/stats'), api('/api/admin/transactions'), api('/api/admin/inbox')]);
      stats = s; renderNav('dashboard');
      const maxType = Math.max(1, ...s.byType.map((t) => Math.abs(t.total)));
      page.innerHTML = `
        <div class="kpis">
          <div class="kpi dark"><div class="l">Total deposits held</div><div class="v num">${money(s.deposits)}</div><div class="s">Checking, savings, CDs & investment</div></div>
          <div class="kpi"><div class="l">Credit & loans outstanding</div><div class="v num">${money(s.credit)}</div><div class="s">Cards and loans</div></div>
          <div class="kpi"><div class="l">Customers</div><div class="v num">${s.customers}</div><div class="s">${s.activeCustomers} active · ${s.accounts} open accounts</div></div>
          <div class="kpi"><div class="l">Transactions today</div><div class="v num">${s.txToday}</div><div class="s"><a href="#/care">${s.chatsWaiting} chats waiting</a> · <a href="#/requests">${s.newRequests} new requests</a></div></div>
        </div>
        <div class="two-col">
          <div class="card"><div class="card-head"><h2>Latest transactions</h2><a href="#/transactions">View all</a></div>${txTable(transactions.slice(0, 10), { withCustomer: true, reversible: false })}</div>
          <div class="stack">
            <div class="card"><div class="card-head"><h3>Balances by product</h3></div>
              ${s.byType.length ? `<div class="bars">${s.byType.map((t) => `<div class="bar-row" title="${t.n} accounts"><span>${esc(TYPE_LABEL[t.type] || t.type).replace('Bridge ', '')}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (Math.abs(t.total) / maxType) * 100)}%"></div></div><span class="num" style="text-align:right">${money(t.total)}</span></div>`).join('')}</div>` : '<div class="empty">No accounts yet.</div>'}
            </div>
            <div class="card"><div class="card-head"><h3>Customer messages</h3><a href="#/inbox">Inbox</a></div>
              ${messages.slice(0, 5).map((m) => `<div class="msg ${m.is_read ? '' : 'unread'}" onclick="location.hash='#/customer/${m.user_id}'"><div class="subj">${esc(m.subject)}</div><div class="small muted">${esc(m.first_name)} ${esc(m.last_name)} · ${dateTime(m.created_at)}</div></div>`).join('') || '<div class="empty">No messages.</div>'}
            </div>
            <div class="card"><div class="card-head"><h3>Transfer &amp; withdrawal controls</h3><a href="#/transfers">Manage</a></div>
              <p class="small muted" style="margin-bottom:12px">Pause customer transfers or configure a pop-up notice for transfer and withdrawal actions.</p>
              <a href="#/transfers" class="btn btn-sm btn-ghost">${icon('transfer', 16)} Open transfer controls</a>
            </div>
          </div>
        </div>`;
    },

    async customers() {
      page.innerHTML = `<div class="card"><div class="toolbar"><input type="search" id="q" placeholder="Search name, user ID, email or account number"><button class="btn btn-sm btn-gold" id="newCust">+ New customer</button></div><div id="list" class="muted">Loading…</div></div>`;
      $('#newCust').onclick = () => createCustomer();
      let timer;
      const load = async () => {
        const { users } = await api('/api/admin/users?q=' + encodeURIComponent($('#q').value));
        $('#list').classList.remove('muted');
        $('#list').innerHTML = users.length ? `<div class="table-wrap"><table><thead><tr><th>Customer</th><th>User ID</th><th>Contact</th><th>Accounts</th><th class="amt">Net position</th><th>Status</th><th>Since</th></tr></thead><tbody>
          ${users.map((u) => `<tr class="clickable" data-id="${u.id}"><td><b>${esc(u.first_name)} ${esc(u.last_name)}</b></td><td>${esc(u.username)}</td>
            <td class="small">${esc(u.email || '—')}<div class="muted">${esc(u.phone)}</div></td><td>${u.account_count}</td>
            <td class="amt">${money(u.net)}</td><td>${statusBadge(u.status)}</td><td class="muted small">${date(u.created_at)}</td></tr>`).join('')}</tbody></table></div>`
          : '<div class="empty">No customers found. Create your first customer to get started.</div>';
        $('#list').querySelectorAll('[data-id]').forEach((r) => r.onclick = () => (location.hash = '#/customer/' + r.dataset.id));
      };
      $('#q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
      load();
    },

    async customer(id) {
      const { user: u, accounts, transactions, tx_more, tx_total, messages } = await api('/api/admin/users/' + id);
      $('#pageTitle').textContent = `${u.first_name} ${u.last_name}`;
      const reload = () => views.customer(id);
      page.innerHTML = `
        <a href="#/customers" class="small">← All customers</a>
        <div class="card" style="margin:12px 0 22px">
          <div class="card-head" style="flex-wrap:wrap">
            <div style="display:flex;gap:14px;align-items:center"><div class="avatar" style="width:52px;height:52px;font-size:18px">${esc(u.first_name[0] || '')}${esc(u.last_name[0] || '')}</div>
              <div><h2 style="font-size:22px">${esc(u.first_name)} ${esc(u.last_name)} ${statusBadge(u.status)}</h2><div class="small muted">User ID ${esc(u.username)} · Customer #${u.id} · Last sign-in ${u.last_login ? dateTime(u.last_login) : 'never'}</div></div></div>
            <div class="actions">
              <button class="btn btn-sm btn-ghost" data-act="edit">Edit profile</button>
              <button class="btn btn-sm btn-ghost" data-act="reset">Reset password</button>
              <button class="btn btn-sm btn-ghost" data-act="message">Send message</button>
              <button class="btn btn-sm ${u.status === 'active' ? 'btn-ghost' : ''}" data-act="status">${u.status === 'active' ? 'Suspend access' : 'Reactivate'}</button>
              <button class="btn btn-sm btn-danger" data-act="delete">Delete</button>
            </div>
          </div>
          <div class="detail-grid">
            ${[['Email', u.email], ['Phone', u.phone], ['Date of birth', u.dob], ['Address', [u.address, u.city, u.state, u.zip].filter(Boolean).join(', ')], ['SSN', u.ssn_last4 ? '•••-••-' + u.ssn_last4 : ''], ['Customer since', date(u.created_at)],
              ['Job', [u.job_title, u.employer].filter(Boolean).join(' at ')], ['Annual salary', u.annual_salary ? money(u.annual_salary) : '']]
              .map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${esc(v || '—')}</div></div>`).join('')}
          </div>
        </div>

        <div class="card" style="margin-bottom:22px">
          <div class="card-head"><h2>Accounts</h2><button class="btn btn-sm btn-gold" data-act="open">+ Open account</button></div>
          ${accounts.length ? `<div class="table-wrap"><table><thead><tr><th>Account</th><th>Number</th><th class="amt">Balance</th><th class="amt">Rate</th><th>Status</th><th>Card</th><th class="amt">Actions</th></tr></thead><tbody>
            ${accounts.map((a) => `<tr><td><div style="display:flex;gap:10px;align-items:center">${icon(typeIcon(a.type), 18)}<div><b>${esc(acctName(a))}</b><div class="small muted">${esc(TYPE_LABEL[a.type])}</div></div></div></td>
              <td class="num">${esc(a.number)}</td>
              <td class="amt" style="font-weight:700">${money(a.balance)}${a.is_credit ? '<div class="small muted">owed' + (a.type === 'credit_card' ? ' / ' + money(a.credit_limit) : '') + '</div>' : ''}</td>
              <td class="amt">${num(a.rate, 2)}% <span class="small muted">${a.is_credit ? 'APR' : 'APY'}</span></td>
              <td>${statusBadge(a.status)}</td>
              <td class="small">${a.card_last4 ? `••${esc(a.card_last4)} ${a.card_locked ? '<span class="badge warn">locked</span>' : ''}` : '—'}</td>
              <td class="amt"><div class="acct-row-actions">${a.status !== 'closed' ? `<button class="btn btn-sm" data-post="${a.id}">Credit / Debit</button>` : ''}<button class="btn btn-sm btn-ghost" data-edit-acct="${a.id}">Manage</button></div></td></tr>`).join('')}
            </tbody></table></div>` : '<div class="empty">No accounts. Open one to get started.</div>'}
        </div>

        <div class="card" id="custTx" style="margin-bottom:22px"><div class="card-head"><h2>Transactions</h2><span class="small muted" data-tx-count></span></div>
          ${txTable(transactions, { more: tx_more })}</div>
        <div class="card"><div class="card-head"><h3>Message history</h3></div>
          ${messages.map((m) => `<div class="msg open"><div style="display:flex;justify-content:space-between;gap:8px"><span class="subj">${esc(m.subject)}</span>
            <span class="badge ${m.from_admin ? 'info' : 'warn'}">${m.from_admin ? 'Bank' : 'Customer'}</span></div><div class="small muted">${dateTime(m.created_at)}</div><div class="body">${esc(m.body)}</div></div>`).join('') || '<div class="empty">No messages.</div>'}
        </div>`;

      const txCard = $('#custTx');
      const countTx = () => { const shown = txCard.querySelectorAll('[data-tx]').length; txCard.querySelector('[data-tx-count]').textContent = shown ? `Showing ${shown.toLocaleString()} of ${tx_total.toLocaleString()}` : ''; };
      countTx();
      attachShowMore(txCard, (before) => api(`/api/admin/users/${id}/transactions?before=${before}`), {}, () => { countTx(); bindReverse(reload); });
      bindReverse(reload);
      const act = (name, fn) => { const b = page.querySelector(`[data-act="${name}"]`); if (b) b.onclick = fn; };
      act('edit', () => modal({
        title: 'Edit customer profile', wide: true,
        body: `<div class="grid-2"><div class="field"><label>First name</label><input name="first_name" value="${esc(u.first_name)}" required></div><div class="field"><label>Last name</label><input name="last_name" value="${esc(u.last_name)}" required></div></div>
          <div class="grid-3"><div class="field"><label>Email</label><input name="email" value="${esc(u.email)}"></div><div class="field"><label>Phone</label><input name="phone" value="${esc(u.phone)}"></div><div class="field"><label>Date of birth</label><input type="date" name="dob" value="${esc(u.dob)}"></div></div>
          <div class="field"><label>Street address</label><input name="address" value="${esc(u.address)}"></div>
          <div class="grid-3"><div class="field"><label>City</label><input name="city" value="${esc(u.city)}"></div><div class="field"><label>State</label><input name="state" value="${esc(u.state)}"></div><div class="field"><label>ZIP</label><input name="zip" value="${esc(u.zip)}"></div></div>
          <div class="grid-3"><div class="field"><label>SSN last 4</label><input name="ssn_last4" maxlength="4" value="${esc(u.ssn_last4)}"></div></div>
          <div class="grid-3"><div class="field"><label>Job title</label><input name="job_title" maxlength="80" value="${esc(u.job_title)}"></div>
            <div class="field"><label>Employer</label><input name="employer" maxlength="80" value="${esc(u.employer)}"></div>
            <div class="field"><label>Annual salary ($)</label><input name="annual_salary" type="number" min="0" step="1000" value="${u.annual_salary || ''}"></div></div>`,
        onSubmit: async (f) => { await api('/api/admin/users/' + id, { method: 'PUT', body: formData(f) }); toast('Profile saved', 'success'); reload(); },
      }));
      act('reset', () => {
        const m = modal({
          title: 'Reset password', submitText: 'Reset password',
          body: `<p class="muted">The customer will be signed out and can sign in with this new password. Share it through a secure channel.</p>
            <div class="field"><label>Temporary password</label><input name="password" minlength="8" required value="${genPassword()}"></div>`,
          onSubmit: async (f) => { await api(`/api/admin/users/${id}/reset-password`, { body: formData(f) }); toast('Password reset', 'success'); },
        });
        m.el.password.select();
      });
      act('message', () => modal({
        title: `Message ${u.first_name}`, submitText: 'Send',
        body: `<div class="field"><label>Subject</label><input name="subject" required></div><div class="field"><label>Message</label><textarea name="body" required></textarea></div>`,
        onSubmit: async (f) => { await api(`/api/admin/users/${id}/messages`, { body: formData(f) }); toast('Message sent', 'success'); reload(); },
      }));
      act('status', async () => {
        await api(`/api/admin/users/${id}/status`, { body: { status: u.status === 'active' ? 'suspended' : 'active' } });
        toast(u.status === 'active' ? 'Online access suspended' : 'Customer reactivated', 'success'); reload();
      });
      act('delete', () => modal({
        title: 'Delete customer', submitText: 'Delete permanently', danger: true,
        body: `<p>Are you sure you want to permanently delete <b>${esc(u.first_name)} ${esc(u.last_name)}</b>? All accounts, balances, and records for this customer will be removed. This cannot be undone.</p>`,
        onSubmit: async () => { await api('/api/admin/users/' + id, { method: 'DELETE' }); toast('Customer deleted', 'success'); location.hash = '#/customers'; },
      }));
      act('open', () => {
        const m = modal({
          title: 'Open new account', submitText: 'Open account', body: accountFields(),
          onSubmit: async (f) => { await api(`/api/admin/users/${id}/accounts`, { body: formData(f) }); toast('Account opened', 'success'); reload(); },
        });
        wireAccountFields(m.el);
      });

      page.querySelectorAll('[data-post]').forEach((b) => b.onclick = () => {
        const a = accounts.find((x) => x.id == b.dataset.post);
        const m = modal({
          title: `Post transaction · ${acctName(a)} ${a.masked}`, submitText: 'Post transaction',
          body: `<p class="small muted">Current ${a.is_credit ? 'balance owed' : 'balance'}: <b>${money(a.balance)}</b></p>
            <div class="field"><label>Type</label><select name="direction">
              <option value="in">${a.is_credit ? 'Payment / credit (reduces amount owed)' : 'Credit — add funds (deposit)'}</option>
              <option value="out">${a.is_credit ? 'Charge / debit (increases amount owed)' : 'Debit — remove funds (withdrawal)'}</option></select></div>
            <div class="grid-2"><div class="field"><label>Amount ($)</label><input name="amount" type="number" step="0.01" min="0.01" required></div>
              <div class="field"><label>Category</label><select name="category">${CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select></div></div>
            <div class="field"><label>Description (shown to customer)</label><input name="description" maxlength="140" placeholder="e.g. Cash deposit – Main St branch"></div>
            <label class="check small"><input type="checkbox" name="allowOverdraft"> Allow overdraft / over-limit</label>
            <p class="small muted" id="preview" style="margin-top:12px"></p>`,
          onSubmit: async (f) => {
            const d = formData(f);
            const r = await api(`/api/admin/accounts/${a.id}/transactions`, { body: { ...d, allowOverdraft: !!d.allowOverdraft } });
            toast('Posted · ' + r.reference, 'success'); reload();
          },
        });
        const f = m.el;
        const cat = () => (f.category.value = f.direction.value === 'in' ? (a.is_credit ? 'payment' : 'deposit') : (a.is_credit ? 'purchase' : 'withdrawal'));
        const preview = () => {
          const amt = +f.amount.value || 0, sign = (f.direction.value === 'in' ? 1 : -1) * (a.is_credit ? -1 : 1);
          f.querySelector('#preview').textContent = amt ? `New ${a.is_credit ? 'balance owed' : 'balance'}: ${money(a.balance + sign * amt)}` : '';
        };
        f.direction.onchange = () => { cat(); preview(); }; f.amount.oninput = preview; cat();
      });

      page.querySelectorAll('[data-edit-acct]').forEach((b) => b.onclick = () => {
        const a = accounts.find((x) => x.id == b.dataset.editAcct);
        modal({
          title: `Manage ${acctName(a)} ${a.masked}`,
          body: `<div class="grid-2"><div class="field"><label>Nickname</label><input name="nickname" value="${esc(a.nickname)}"></div>
              <div class="field"><label>Status</label><select name="status">${['active', 'frozen', 'closed'].map((s) => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
            <div class="grid-2"><div class="field"><label>${a.is_credit ? 'APR' : 'APY'} (%)</label><input name="rate" type="number" step="0.01" value="${a.rate}"></div>
              ${a.type === 'credit_card' ? `<div class="field"><label>Credit limit ($)</label><input name="credit_limit" type="number" step="0.01" value="${a.credit_limit}"></div>` : ''}</div>
            ${a.card_last4 ? `<label class="check small"><input type="checkbox" name="card_locked" ${a.card_locked ? 'checked' : ''}> Card ••${esc(a.card_last4)} locked</label>` : ''}
            <p class="small muted" style="margin-top:12px">Frozen accounts can't send or receive transfers. Accounts must have a zero balance to close.</p>`,
          onSubmit: async (f) => {
            const d = formData(f);
            await api('/api/admin/accounts/' + a.id, { method: 'PUT', body: { ...d, card_locked: !!d.card_locked } });
            toast('Account updated', 'success'); reload();
          },
        });
      });
    },

    async transactions() {
      page.innerHTML = `<div class="card"><div class="toolbar"><input type="search" id="q" placeholder="Search description, reference, account or customer"></div><div id="list" class="muted">Loading…</div></div>`;
      let timer;
      const load = async () => {
        const q = encodeURIComponent($('#q').value);
        const { transactions, more } = await api('/api/admin/transactions?q=' + q);
        $('#list').classList.remove('muted');
        $('#list').innerHTML = txTable(transactions, { withCustomer: true, more });
        attachShowMore($('#list'), (before) => api(`/api/admin/transactions?q=${q}&before=${before}`), { withCustomer: true }, () => bindReverse(load));
        bindReverse(load);
      };
      $('#q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
      load();
    },

    async care(chatId) {
      clearInterval(careTimer);
      const filt = sessionStorage.getItem('care_status') ?? '';
      const STATUS = { ai: ['Assistant handling', 'info'], needs_human: ['Needs a human', 'warn'], human: ['With specialist', 'good'], closed: ['Resolved', ''] };
      const badge = (s) => `<span class="badge ${STATUS[s][1]}">${STATUS[s][0]}</span>`;
      const fmt = (s) => esc(s).replace(/\n/g, '<br>');
      let lastId = 0, current = null;

      async function loadList() {
        const { chats, ai, model } = await api('/api/admin/chats?status=' + filt);
        stats = await api('/api/admin/stats'); renderNav('care');
        const box = $('#chatList');
        if (!box) return;
        $('#aiState').innerHTML = ai ? `<span class="badge good" style="text-transform:none">AI assistant on · ${esc(model)}</span>` : '<span class="badge warn" style="text-transform:none">AI assistant off — add ANTHROPIC_API_KEY to .env; every chat goes to a human</span>';
        box.innerHTML = chats.map((c) => `<div class="chat-row ${c.id == chatId ? 'on' : ''}" data-chat="${c.id}">
            <div><b>${esc(c.name || 'Website visitor')}</b> ${c.user_id ? '<span class="badge info">Customer</span>' : '<span class="badge">Guest</span>'}</div>
            <div class="small muted" style="text-align:right">${dateTime(c.updated_at)}</div>
            <div>${badge(c.status)} ${c.unread_admin ? `<span class="badge bad">${c.unread_admin} new</span>` : ''}</div><div></div>
            <div class="last">${esc(c.last_message)}</div></div>`).join('') || '<div class="empty">No conversations here yet.</div>';
        box.querySelectorAll('[data-chat]').forEach((r) => r.onclick = () => (location.hash = '#/care/' + r.dataset.chat));
      }

      function msgHtml(m) {
        if (m.sender === 'system') return `<div class="cb-msg system"><div class="cb-bubble">${icon('shield', 12)} ${fmt(m.body)} · ${dateTime(m.created_at)}</div></div>`;
        const who = m.sender === 'user' ? esc(current.name || 'Visitor') : m.sender === 'agent' ? `${esc(m.agent_name || 'Staff')} · Customer care` : 'Virtual assistant';
        // From the admin's side the customer is on the left; bank replies are on the right.
        const side = m.sender === 'user' ? 'ai' : m.sender === 'agent' ? 'agent' : 'user';
        return `<div class="cb-msg ${side}" style="${side !== 'ai' ? 'align-self:flex-end;align-items:flex-end' : ''}"><div class="cb-who">${who} · ${dateTime(m.created_at)}</div>
          <div class="cb-bubble" ${side === 'user' ? 'style="background:#e9eef6;color:var(--ink);border-color:#d5deeb"' : ''}>${fmt(m.body)}</div></div>`;
      }

      async function loadThread(initial) {
        if (!chatId) return;
        const data = await api(`/api/admin/chats/${chatId}?after=${initial ? 0 : lastId}`);
        const statusChanged = current && current.status !== data.chat.status;
        current = data.chat;
        const log = $('#threadLog');
        if (!log) return;
        if (initial || statusChanged) renderThreadHead();
        if (data.messages.length) {
          log.insertAdjacentHTML('beforeend', data.messages.map(msgHtml).join(''));
          lastId = data.messages.at(-1).id;
          log.scrollTop = log.scrollHeight;
        }
      }

      function renderThreadHead() {
        const c = current;
        $('#threadHead').innerHTML = `<div style="min-width:0"><b>${esc(c.name || 'Website visitor')}</b> ${badge(c.status)}
            <div class="small muted">${c.user_id ? `Customer · <a href="#/customer/${c.user_id}">${esc(c.username)}</a>` : 'Guest visitor'}${c.email ? ' · ' + esc(c.email) : ''}${c.phone ? ' · ' + esc(c.phone) : ''} · started ${dateTime(c.created_at)}</div></div>
          <div class="actions">${c.status !== 'human' ? '<button class="btn btn-sm btn-ghost" data-act="take">Take over</button>' : ''}
            ${c.ai_enabled ? '' : '<button class="btn btn-sm btn-ghost" data-act="ai">Hand back to AI</button>'}
            ${c.status !== 'closed' ? '<button class="btn btn-sm" data-act="resolve">Mark resolved</button>' : ''}</div>`;
        $('#threadHead').querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => {
          await api(`/api/admin/chats/${chatId}`, { body: { action: b.dataset.act } });
          toast({ take: 'You’re now handling this chat', ai: 'Handed back to the virtual assistant', resolve: 'Conversation resolved' }[b.dataset.act], 'success');
          await loadThread(false); renderThreadHead(); loadList();
        });
      }

      const tabs = [['', 'Open'], ['needs_human', 'Needs a human'], ['human', 'With specialist'], ['ai', 'Assistant'], ['closed', 'Resolved'], ['all', 'All']];
      page.innerHTML = `
        <div class="toolbar" style="justify-content:space-between"><div class="tabs" id="careTabs">${tabs.map(([v, l]) => `<button data-v="${v}" class="${filt === v ? 'on' : ''}">${l}</button>`).join('')}</div><span id="aiState"></span></div>
        <div class="care-layout">
          <div class="card"><div id="chatList" style="max-height:calc(100vh - 210px);overflow-y:auto"><div class="empty">Loading…</div></div></div>
          <div class="card care-thread">${chatId ? `
            <div class="card-head" id="threadHead" style="padding:14px 18px;margin:0;border-bottom:1px solid var(--line);flex-wrap:wrap"></div>
            <div class="cb-log" id="threadLog"></div>
            <form class="cb-input" id="replyForm"><textarea rows="2" maxlength="4000" placeholder="Reply as CapitalBridge customer care… (Enter to send, Shift+Enter for a new line)"></textarea><button class="btn btn-sm">Send reply</button></form>
            <div class="cb-foot">Replying takes the conversation over from the virtual assistant. The customer sees your reply in their chat.</div>`
            : '<div class="empty" style="margin:auto">Select a conversation to read the full transcript and reply.</div>'}</div>
        </div>`;
      $('#careTabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; sessionStorage.setItem('care_status', b.dataset.v); views.care(chatId); };
      if (chatId) {
        const form = $('#replyForm');
        const ta = form.querySelector('textarea');
        ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const text = ta.value.trim(); if (!text) return;
          ta.value = '';
          try { await api(`/api/admin/chats/${chatId}/messages`, { body: { text } }); await loadThread(false); renderThreadHead(); loadList(); }
          catch (ex) { ta.value = text; toast(ex.message, 'error'); }
        });
      }
      await Promise.all([loadList(), loadThread(true)]);
      clearInterval(careTimer);
      careTimer = setInterval(() => {
        if (!location.hash.startsWith('#/care')) return clearInterval(careTimer);
        loadThread(false).catch(() => {}); loadList().catch(() => {});
      }, 5000);
    },

    async requests() {
      const filt = { status: sessionStorage.getItem('rq_status') ?? 'new', kind: sessionStorage.getItem('rq_kind') || '' };
      const load = async () => {
        const { requests, kinds } = await api(`/api/admin/requests?status=${filt.status}&kind=${filt.kind}`);
        stats = await api('/api/admin/stats'); renderNav('requests');
        const statusTabs = [['new', 'New'], ['in_progress', 'In progress'], ['closed', 'Closed'], ['', 'All']];
        page.innerHTML = `<div class="card">
          <div class="toolbar"><div class="tabs" id="rqStatus">${statusTabs.map(([v, l]) => `<button data-v="${v}" class="${filt.status === v ? 'on' : ''}">${l}</button>`).join('')}</div>
            <select id="rqKind" style="width:auto"><option value="">All request types</option>${Object.entries(kinds).map(([k, l]) => `<option value="${k}" ${filt.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          ${requests.length ? `<div class="table-wrap"><table><thead><tr><th>Received</th><th>Type</th><th>Reference</th><th>From</th><th>Summary</th><th>Status</th></tr></thead><tbody>
            ${requests.map((r) => `<tr class="clickable" data-rq="${r.id}"><td class="muted small" style="white-space:nowrap">${dateTime(r.created_at)}</td>
              <td><span class="badge ${r.kind === 'fraud' || r.kind === 'lost_card' ? 'bad' : r.kind === 'application' ? 'good' : 'info'}">${esc(r.label)}</span></td>
              <td class="num small">${esc(r.reference)}</td><td><b>${esc(r.name)}</b><div class="small muted">${esc(r.email || r.phone)}</div></td>
              <td class="small">${esc(summary(r))}</td><td>${rqBadge(r.status)}</td></tr>`).join('')}</tbody></table></div>`
            : '<div class="empty">No requests here. Applications, contact forms, appointments and reports from the website appear in this list.</div>'}</div>`;
        page.querySelector('#rqStatus').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; filt.status = b.dataset.v; sessionStorage.setItem('rq_status', filt.status); load(); };
        page.querySelector('#rqKind').onchange = (e) => { filt.kind = e.target.value; sessionStorage.setItem('rq_kind', filt.kind); load(); };
        page.querySelectorAll('[data-rq]').forEach((tr) => tr.onclick = () => openRequest(requests.find((r) => r.id == tr.dataset.rq), load));
      };
      await load();
    },

    async inbox() {
      const { messages } = await api('/api/admin/inbox');
      page.innerHTML = `<div class="card"><div class="card-head"><h2>Messages from customers</h2></div>
        ${messages.map((m) => `<div class="msg open ${m.is_read ? '' : 'unread'}"><div style="display:flex;justify-content:space-between;gap:10px"><span class="subj">${esc(m.subject)}</span><span class="small muted">${dateTime(m.created_at)}</span></div>
          <div class="small"><a href="#/customer/${m.user_id}">${esc(m.first_name)} ${esc(m.last_name)} (${esc(m.username)})</a></div><div class="body">${esc(m.body)}</div></div>`).join('') || '<div class="empty">No messages yet.</div>'}
        <p class="small muted">Open the customer's profile to reply — replying marks their messages as read.</p></div>`;
    },

    async announcements() {
      const { announcements } = await api('/api/admin/announcements');
      page.innerHTML = `<div class="two-col">
        <div class="card"><div class="card-head"><h2>Published on the homepage</h2></div>
          ${announcements.map((a) => `<div class="msg open"><div style="display:flex;justify-content:space-between;gap:10px"><span class="subj">${esc(a.title)}</span><button class="link-btn small" data-del="${a.id}">Remove</button></div>
            <div class="small muted">${dateTime(a.created_at)}</div><div class="body">${esc(a.body)}</div></div>`).join('') || '<div class="empty">No announcements.</div>'}</div>
        <div class="card"><div class="card-head"><h3>New announcement</h3></div>
          <form id="annForm"><div class="form-error"></div><div class="field"><label>Title</label><input name="title" required maxlength="120"></div>
          <div class="field"><label>Text</label><textarea name="body" required maxlength="1000"></textarea></div><button class="btn">Publish</button></form></div></div>`;
      page.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await api('/api/admin/announcements/' + b.dataset.del, { method: 'DELETE' }); views.announcements(); });
      $('#annForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await api('/api/admin/announcements', { body: formData(e.target) }); toast('Published', 'success'); views.announcements(); }
        catch (ex) { const er = e.target.querySelector('.form-error'); er.textContent = ex.message; er.classList.add('show'); }
      });
    },

    async audit() {
      const { entries } = await api('/api/admin/audit');
      page.innerHTML = `<div class="card"><div class="card-head"><h2>Audit log</h2><span class="small muted">Last 300 events</span></div>
        <div class="table-wrap"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead><tbody>
        ${entries.map((e) => `<tr><td class="muted small" style="white-space:nowrap">${dateTime(e.created_at)}</td><td>${esc(e.username || '—')}</td><td><span class="badge">${esc(e.action.replace(/_/g, ' '))}</span></td><td class="small">${esc(e.details)}</td></tr>`).join('')}
        </tbody></table></div></div>`;
    },

    async transfers() {
      const s = await api('/api/admin/transfer-settings');
      page.innerHTML = `
        <div class="card" style="max-width:680px">
          <div class="card-head">
            <div>
              <h2>Transfer &amp; Withdrawal Controls</h2>
              <p class="small muted" style="margin:2px 0 0">Control customer transfer availability, pause transfers bank-wide, and configure notice popups.</p>
            </div>
            <span class="badge ${s.transfers_paused ? 'bad' : 'good'}" style="font-size:13px;padding:4px 12px">
              ${s.transfers_paused ? '⛔ Transfers Paused' : '✓ Active & Normal'}
            </span>
          </div>
          <form id="transferSettingsForm">
            <div class="form-error"></div>
            
            <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;margin:16px 0">
              <label class="check" style="font-size:15px;cursor:pointer">
                <input type="checkbox" name="transfers_paused" ${s.transfers_paused ? 'checked' : ''}>
                <div>
                  <b>Pause transfers and withdrawals bank-wide</b>
                  <div class="small muted">When checked, any customer attempting a transfer or withdrawal will see the popup notice and cannot submit transfers.</div>
                </div>
              </label>
            </div>

            <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;margin:16px 0">
              <label class="check" style="font-size:15px;cursor:pointer;margin-bottom:12px">
                <input type="checkbox" name="notice_enabled" ${s.notice_enabled ? 'checked' : ''}>
                <div>
                  <b>Show pop-up notice when transfer or withdrawal is clicked</b>
                  <div class="small muted">Shows an immediate modal popup dialog to customers when they tap Transfer or enter the move-money page.</div>
                </div>
              </label>

              <div class="field" style="margin-top:12px">
                <label>Notice title</label>
                <input name="notice_title" value="${esc(s.notice_title)}" maxlength="120" placeholder="e.g. Important Transfer Notice">
              </div>

              <div class="field">
                <label>Notice type / styling</label>
                <select name="notice_type">
                  <option value="info" ${s.notice_type === 'info' ? 'selected' : ''}>Information (Blue)</option>
                  <option value="warning" ${s.notice_type === 'warning' ? 'selected' : ''}>Warning / Notice (Gold)</option>
                  <option value="paused" ${s.notice_type === 'paused' ? 'selected' : ''}>Urgent / Paused (Red)</option>
                </select>
              </div>

              <div class="field" style="margin-bottom:0">
                <label>Notice message for customers</label>
                <textarea name="notice_message" rows="4" maxlength="500" placeholder="Message shown to customers in the popup modal...">${esc(s.notice_message)}</textarea>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:center;margin-top:20px">
              <button class="btn btn-gold" type="submit">Save transfer settings</button>
              <button type="button" class="btn btn-ghost" id="previewNoticeBtn">Preview pop-up</button>
            </div>
          </form>
        </div>`;

      $('#previewNoticeBtn').onclick = () => {
        const f = formData($('#transferSettingsForm'));
        modal({
          title: f.notice_title || 'Transfer Notice',
          submitText: 'Close preview',
          body: `<div style="padding:4px 0">
            <div class="badge ${f.notice_type === 'paused' ? 'bad' : f.notice_type === 'warning' ? 'warn' : 'info'}" style="margin-bottom:10px">
              ${f.transfers_paused ? 'Transfers paused' : (f.notice_type || 'info').toUpperCase()}
            </div>
            <p style="font-size:15px;line-height:1.6">${esc(f.notice_message || 'No message entered')}</p>
          </div>`,
          onSubmit: () => {},
        });
      };

      $('#transferSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const er = e.target.querySelector('.form-error'); er.classList.remove('show');
        const f = formData(e.target);
        try {
          const body = {
            transfers_paused: !!e.target.transfers_paused.checked,
            notice_enabled: !!e.target.notice_enabled.checked,
            notice_title: f.notice_title,
            notice_message: f.notice_message,
            notice_type: f.notice_type,
          };
          await api('/api/admin/transfer-settings', { body });
          toast('Transfer controls and notice updated', 'success');
          views.transfers();
        } catch (ex) { er.textContent = ex.message; er.classList.add('show'); }
      });
    },

    async settings() {
      page.innerHTML = `<div class="card" style="max-width:520px">
        ${me.must_change_pw ? '<div class="notice">You are using the initial admin password. Change it now, then delete data/admin-credentials.txt.</div>' : ''}
        <div class="card-head"><h2>Change admin password</h2></div>
        <form id="pw"><div class="form-error"></div>
          <div class="field"><label>Current password</label><input name="current" type="password" autocomplete="current-password" required></div>
          <div class="field"><label>New password</label><input name="next" type="password" minlength="8" autocomplete="new-password" required></div>
          <div class="field"><label>Confirm new password</label><input name="confirm" type="password" autocomplete="new-password" required></div>
          <button class="btn">Update password</button></form>
        <p class="small muted" style="margin-top:16px">Signed in as <b>${esc(me.username)}</b>.</p></div>`;
      $('#pw').addEventListener('submit', async (e) => {
        e.preventDefault();
        const er = e.target.querySelector('.form-error'); er.classList.remove('show');
        try {
          const f = formData(e.target);
          if (f.next !== f.confirm) throw new Error('New passwords do not match');
          await api('/api/me/password', { body: f }); me.must_change_pw = false; toast('Password updated', 'success'); views.settings();
        } catch (ex) { er.textContent = ex.message; er.classList.add('show'); }
      });
    },
  };

  async function route() {
    const [, name = 'dashboard', arg] = location.hash.split('/');
    const view = views[name] ? name : 'dashboard';
    renderNav(view === 'customer' ? 'customers' : view);
    $('#pageTitle').textContent = (NAV.find((n) => n[0] === view) || [, , 'Customer'])[2];
    $('#sidebar').classList.remove('open');
    page.innerHTML = '<div class="muted">Loading…</div>';
    try { await views[view](arg); } catch (e) { page.innerHTML = `<div class="card"><div class="empty">${esc(e.message)}</div></div>`; }
    window.scrollTo(0, 0);
  }

  (async () => {
    try { me = (await api('/api/me')).user; } catch { return; }
    if (me.role !== 'admin') { location.href = '/app'; return; }
    $('#sideLogo').innerHTML = CB.logo('#/dashboard');
    $('#who').textContent = me.username;
    $('#hamb').innerHTML = icon('menu', 24);
    $('#hamb').onclick = () => $('#sidebar').classList.toggle('open');
    $('#quickCreate').onclick = () => createCustomer();
    stats = await api('/api/admin/stats').catch(() => null);
    config = await api('/api/config').catch(() => config);
    window.addEventListener('hashchange', route);
    if (me.must_change_pw && !location.hash) location.hash = '#/settings';
    route();
  })();
})();
