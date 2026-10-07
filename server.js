const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* no .env file */ }
const {
  db, tx, BankError, hashPassword, verifyPassword, newAccountNumber, randomDigits, newReference,
  postTransaction, audit, ensureAdmin, isCredit, ACCOUNT_TYPES,
} = require('./db');
const { getMarket, getNews } = require('./market');
const chatbot = require('./chatbot');
const { generateHistory, generateMessages } = require('./sample');

// Demo mode enables the sample-history generator and shows a "sample data" note on the site.
const DEMO_MODE = process.env.DEMO_MODE === 'true';

const PORT = process.env.PORT || 3000;
const SESSION_HOURS = 8;
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'same-origin',
  });
  next();
});

// ---------------- utilities ----------------
const toCents = (v) => {
  const n = Math.round(Number(v) * 100);
  if (!Number.isFinite(n) || n <= 0) throw new BankError('Enter a valid amount greater than zero');
  if (n > 100_000_000_000) throw new BankError('Amount too large');
  return n;
};
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const publicUser = (u) => u && ({
  id: u.id, role: u.role, username: u.username, first_name: u.first_name, last_name: u.last_name,
  email: u.email, phone: u.phone, dob: u.dob, address: u.address, city: u.city, state: u.state, zip: u.zip,
  ssn_last4: u.ssn_last4, status: u.status, must_change_pw: !!u.must_change_pw, created_at: u.created_at, last_login: u.last_login,
  sample_data: !!u.sample_data,
});
const acctView = (a) => ({
  id: a.id, user_id: a.user_id, type: a.type, nickname: a.nickname, number: a.number,
  masked: '••••' + a.number.slice(-4), balance: a.balance_cents / 100, credit_limit: a.credit_limit_cents / 100,
  rate: a.rate, status: a.status, card_last4: a.card_last4, card_locked: !!a.card_locked, opened_at: a.opened_at,
  is_credit: isCredit(a.type),
});
const txView = (t) => ({
  id: t.id, account_id: t.account_id, direction: t.direction, amount: t.amount_cents / 100,
  balance_after: t.balance_after / 100, category: t.category, description: t.description,
  reference: t.reference, status: t.status, created_at: t.created_at,
  ...(t.number ? { account_number: t.number, account_type: t.type } : {}),
  ...(t.first_name !== undefined ? { customer: `${t.first_name} ${t.last_name}`, user_id: t.user_id } : {}),
});
const wrap = (fn) => (req, res) => {
  try {
    const out = fn(req, res);
    if (out instanceof Promise) out.catch((e) => fail(res, e));
  } catch (e) { fail(res, e); }
};
function fail(res, e) {
  if (e instanceof BankError) return res.status(e.status).json({ error: e.message });
  if (String(e.message).includes('UNIQUE constraint failed: users.username')) return res.status(400).json({ error: 'That username is already taken' });
  console.error(e);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

// ---------------- sessions ----------------
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
app.use((req, res, next) => {
  const token = parseCookies(req).cb_session;
  if (token) {
    const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                            WHERE s.token = ? AND s.expires_at > ?`).get(token, Date.now());
    if (row && row.status === 'active') { req.user = row; req.sessionToken = token; }
  }
  next();
});
const requireAuth = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Please sign in' }));
const requireAdmin = (req, res, next) =>
  (req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Administrator access required' }));
const requireCustomer = (req, res, next) =>
  (req.user?.role === 'customer' ? next() : res.status(403).json({ error: 'Customer access only' }));

// simple login throttle per IP+username
const attempts = new Map();
function throttled(key) {
  const a = attempts.get(key);
  return a && a.count >= 5 && Date.now() - a.first < 15 * 60_000;
}
function noteFailure(key) {
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > 15 * 60_000) attempts.set(key, { count: 1, first: Date.now() });
  else a.count++;
}

// ---------------- auth ----------------
app.post('/api/auth/login', wrap((req, res) => {
  const username = str(req.body.username, 60);
  const password = String(req.body.password ?? '');
  const key = req.ip + '|' + username.toLowerCase();
  if (throttled(key)) throw new BankError('Too many attempts. Try again in 15 minutes.', 429);
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    noteFailure(key);
    throw new BankError('The username or password you entered is incorrect', 401);
  }
  if (user.status !== 'active') throw new BankError('This profile is suspended. Please contact CapitalBridge support.', 403);
  attempts.delete(key);
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, Date.now() + SESSION_HOURS * 3600_000);
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
  audit(user.id, 'login', user.username);
  res.setHeader('Set-Cookie', `cb_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}`);
  res.json({ user: publicUser(user), redirect: user.role === 'admin' ? '/admin' : '/app' });
}));

app.post('/api/auth/logout', (req, res) => {
  if (req.sessionToken) db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  res.setHeader('Set-Cookie', 'cb_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/me/password', requireAuth, wrap((req, res) => {
  const { current, next: nextPw } = req.body;
  if (!verifyPassword(String(current ?? ''), req.user.password_hash)) throw new BankError('Current password is incorrect');
  if (String(nextPw ?? '').length < 8) throw new BankError('New password must be at least 8 characters');
  db.prepare('UPDATE users SET password_hash = ?, must_change_pw = 0 WHERE id = ?').run(hashPassword(nextPw), req.user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(req.user.id, req.sessionToken);
  audit(req.user.id, 'password_change', '');
  res.json({ ok: true });
}));

app.put('/api/me/profile', requireAuth, requireCustomer, wrap((req, res) => {
  const b = req.body;
  db.prepare('UPDATE users SET email=?, phone=?, address=?, city=?, state=?, zip=? WHERE id=?')
    .run(str(b.email, 120), str(b.phone, 30), str(b.address), str(b.city, 80), str(b.state, 40), str(b.zip, 12), req.user.id);
  audit(req.user.id, 'profile_update', 'contact details');
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)) });
}));

// ---------------- public ----------------
app.get('/api/config', (req, res) => res.json({ demo: DEMO_MODE }));

app.get('/api/market', wrap(async (req, res) => res.json(await getMarket())));
app.get('/api/news', wrap(async (req, res) => {
  let items = [];
  try { items = await getNews(str(req.query.topic, 20) || 'business'); } catch { /* offline */ }
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY id DESC LIMIT 5').all();
  res.json({ items, announcements });
}));

// Public requests: account applications, contact, appointments, reset/fraud/lost-card reports.
const REQUEST_KINDS = {
  application: 'Account application', contact: 'Contact request', appointment: 'Appointment request',
  password_reset: 'ID / password help', fraud: 'Fraud report', lost_card: 'Lost or stolen card',
};
const submissions = new Map();
app.post('/api/public/requests', wrap((req, res) => {
  const b = req.body || {};
  const kind = String(b.kind || '');
  if (!REQUEST_KINDS[kind]) throw new BankError('Unknown request type');
  const recent = (submissions.get(req.ip) || []).filter((t) => Date.now() - t < 3600_000);
  if (recent.length >= 15) throw new BankError('Too many requests from this device. Please call us instead.', 429);
  const name = str(b.name, 120), email = str(b.email, 120), phone = str(b.phone, 30);
  if (!name) throw new BankError('Please enter your full name');
  if (!email && !phone) throw new BankError('Please give an email address or phone number so we can reach you');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BankError('Please enter a valid email address');
  const data = {};
  for (const [k, v] of Object.entries(b)) {
    if (['kind', 'name', 'email', 'phone'].includes(k)) continue;
    if (Object.keys(data).length >= 25) break;
    data[str(k, 40)] = str(v, 2000);
  }
  if (kind === 'application' && !data.product) throw new BankError('Please choose a product');
  if (['contact', 'fraud'].includes(kind) && !data.message) throw new BankError('Please describe how we can help');
  const prefix = { application: 'APP', contact: 'MSG', appointment: 'APT', password_reset: 'PWR', fraud: 'FRD', lost_card: 'CRD' }[kind];
  const reference = prefix + '-' + randomDigits(8);
  db.prepare('INSERT INTO requests (kind, reference, name, email, phone, data) VALUES (?, ?, ?, ?, ?, ?)')
    .run(kind, reference, name, email, phone, JSON.stringify(data));
  recent.push(Date.now()); submissions.set(req.ip, recent);
  res.json({ ok: true, reference, label: REQUEST_KINDS[kind] });
}));

// ---------------- customer care chat ----------------
// Signed-in customers have one permanent chat thread (their customer care DMs).
// Guests are identified by a random token the widget keeps in the browser.
const chatOwner = (req) => {
  if (req.user?.role === 'customer') return { userId: req.user.id };
  const tok = String(req.get('x-chat-token') || '');
  return { token: /^[a-f0-9]{48}$/.test(tok) ? tok : null };
};
const findChat = (o) => (o.userId ? db.prepare('SELECT * FROM chats WHERE user_id = ?').get(o.userId)
  : o.token ? db.prepare('SELECT * FROM chats WHERE guest_token = ? AND user_id IS NULL').get(o.token) : null);
const chatMsgView = (m) => ({ id: m.id, sender: m.sender, body: m.body, created_at: m.created_at, ...(m.agent_name ? { agent_name: m.agent_name } : {}) });
const publicChat = (c) => c && ({
  id: c.id, status: c.status, unread: c.unread_user,
  needs_contact: !c.user_id && c.status === 'needs_human' && !c.email && !c.phone,
});
const userMessagesAfter = (chatId, after) => db.prepare(`SELECT m.*, u.first_name AS agent_name FROM chat_messages m LEFT JOIN users u ON u.id = m.agent_id
  WHERE m.chat_id = ? AND m.id > ? AND m.sender != 'system' ORDER BY m.id`).all(chatId, after).map(chatMsgView);
function addChatMessage(chatId, sender, body, agentId = null) {
  const r = db.prepare('INSERT INTO chat_messages (chat_id, sender, body, agent_id) VALUES (?, ?, ?, ?)').run(chatId, sender, body, agentId);
  if (sender !== 'system') db.prepare("UPDATE chats SET last_message = ?, updated_at = datetime('now') WHERE id = ?").run(body.slice(0, 160), chatId);
  return Number(r.lastInsertRowid);
}
function customerSnapshot(userId) {
  const u = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(userId);
  const accounts = db.prepare("SELECT * FROM accounts WHERE user_id = ? AND status != 'closed' ORDER BY id").all(userId)
    .map((a) => ({ name: a.nickname || a.type.replace('_', ' '), number: a.number, balance: a.balance_cents / 100, is_credit: isCredit(a.type), status: a.status, card_locked: !!a.card_locked }));
  return { ...u, accounts };
}

const chatHits = new Map();
app.get('/api/chat', (req, res) => {
  const chat = findChat(chatOwner(req));
  if (!chat) return res.json({ chat: null, messages: [], ai: chatbot.aiAvailable() });
  if (req.query.read === '1' && chat.unread_user) db.prepare('UPDATE chats SET unread_user = 0 WHERE id = ?').run(chat.id);
  res.json({ chat: publicChat(chat), messages: userMessagesAfter(chat.id, Number(req.query.after) || 0), ai: chatbot.aiAvailable() });
});

app.post('/api/chat/messages', wrap(async (req, res) => {
  if (req.user?.role === 'admin') throw new BankError('Administrators reply from the admin console');
  const text = str(req.body.text, 2000);
  if (!text) throw new BankError('Type a message first');
  const hits = (chatHits.get(req.ip) || []).filter((t) => Date.now() - t < 60_000);
  if (hits.length >= 20) throw new BankError('You’re sending messages too quickly. Please wait a moment.', 429);
  hits.push(Date.now()); chatHits.set(req.ip, hits);

  const owner = chatOwner(req);
  let chat = findChat(owner);
  let newToken = null;
  if (!chat) {
    if (owner.userId) {
      const u = req.user;
      db.prepare('INSERT INTO chats (user_id, name, email, phone) VALUES (?, ?, ?, ?)').run(u.id, `${u.first_name} ${u.last_name}`, u.email, u.phone);
    } else {
      newToken = crypto.randomBytes(24).toString('hex');
      db.prepare('INSERT INTO chats (guest_token, name, email) VALUES (?, ?, ?)').run(newToken, str(req.body.name, 80), str(req.body.email, 120));
    }
    chat = findChat(owner.userId ? owner : { token: newToken });
  }
  const before = db.prepare('SELECT COALESCE(MAX(id), 0) n FROM chat_messages WHERE chat_id = ?').get(chat.id).n;
  addChatMessage(chat.id, 'user', text);
  if (chat.status === 'closed') db.prepare("UPDATE chats SET status = CASE WHEN ai_enabled = 1 THEN 'ai' ELSE 'human' END WHERE id = ?").run(chat.id);
  db.prepare('UPDATE chats SET unread_admin = unread_admin + 1 WHERE id = ?').run(chat.id);
  chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chat.id);

  // The assistant runs the conversation until the customer asks for a person. After a handoff
  // it stays quiet so it doesn't talk over the specialist (staff can hand the chat back to it).
  const handOff = (reason) => {
    addChatMessage(chat.id, 'system', `Handed off to customer care: ${reason}`);
    db.prepare("UPDATE chats SET status = 'needs_human', ai_enabled = 0 WHERE id = ?").run(chat.id);
  };
  if (req.body.request_human === true && chat.status !== 'human' && chat.status !== 'needs_human') {
    addChatMessage(chat.id, 'ai', 'Of course. I’ve asked a CapitalBridge customer care specialist to join this chat. They’ll get back to you right here as soon as possible. You can keep adding details while you wait, and you can close this window — your conversation is saved.');
    handOff('customer pressed “Talk to a person”');
  } else if (chat.ai_enabled && chat.status !== 'human') {
    const history = db.prepare('SELECT sender, body FROM chat_messages WHERE chat_id = ? ORDER BY id').all(chat.id);
    const out = await chatbot.generateReply(history, chat.user_id ? customerSnapshot(chat.user_id) : null);
    addChatMessage(chat.id, 'ai', out.reply);
    if (out.needsHuman) handOff(out.reason || 'customer asked for a person');
  }
  chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chat.id);
  res.json({ token: newToken, chat: publicChat(chat), messages: userMessagesAfter(chat.id, before) });
}));

app.post('/api/chat/contact', wrap((req, res) => {
  const chat = findChat(chatOwner(req));
  if (!chat) throw new BankError('No conversation found', 404);
  const name = str(req.body.name, 80), email = str(req.body.email, 120), phone = str(req.body.phone, 30);
  if (!email && !phone) throw new BankError('Please give an email address or phone number');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BankError('Please enter a valid email address');
  db.prepare('UPDATE chats SET name = COALESCE(NULLIF(?, \'\'), name), email = ?, phone = ? WHERE id = ?').run(name, email, phone, chat.id);
  addChatMessage(chat.id, 'system', `Visitor left contact details: ${[name, email, phone].filter(Boolean).join(' · ')}`);
  res.json({ chat: publicChat(db.prepare('SELECT * FROM chats WHERE id = ?').get(chat.id)) });
}));

// ---------------- customer ----------------
const myAccount = (req, id) => {
  const a = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(Number(id), req.user.id);
  if (!a) throw new BankError('Account not found', 404);
  return a;
};

app.get('/api/accounts', requireAuth, requireCustomer, (req, res) => {
  const rows = db.prepare("SELECT * FROM accounts WHERE user_id = ? AND status != 'closed' ORDER BY id").all(req.user.id);
  res.json({ accounts: rows.map(acctView) });
});

app.get('/api/accounts/:id/transactions', requireAuth, requireCustomer, wrap((req, res) => {
  const a = myAccount(req, req.params.id);
  const { before, limit } = pageArgs(req.query);
  const q = `%${str(req.query.q, 60)}%`;
  const rows = db.prepare(`SELECT t.* FROM transactions t WHERE t.account_id = ? AND ${AFTER_CURSOR}
                           AND (t.description LIKE ? OR t.reference LIKE ? OR t.category LIKE ?) ORDER BY t.created_at DESC, t.id DESC LIMIT ?`)
    .all(a.id, ...cursorArgs(before), q, q, q, limit + 1);
  res.json({ account: acctView(a), transactions: rows.slice(0, limit).map(txView), more: rows.length > limit });
}));

// All of a customer's activity across accounts, newest first; pages with ?before=<id>, filters with ?q= and ?account=.
app.get('/api/activity', requireAuth, requireCustomer, (req, res) => {
  const { before, limit } = pageArgs(req.query);
  const q = `%${str(req.query.q, 60)}%`;
  const account = Number(req.query.account) || 0;
  const rows = db.prepare(`SELECT t.*, a.number, a.type FROM transactions t JOIN accounts a ON a.id = t.account_id
      WHERE a.user_id = ? AND ${AFTER_CURSOR} AND (? = 0 OR a.id = ?)
        AND (t.description LIKE ? OR t.reference LIKE ? OR t.category LIKE ?)
      ORDER BY t.created_at DESC, t.id DESC LIMIT ?`).all(req.user.id, ...cursorArgs(before), account, account, q, q, q, limit + 1);
  res.json({ transactions: rows.slice(0, limit).map(txView), more: rows.length > limit });
});

app.get('/api/accounts/:id/statement.csv', requireAuth, requireCustomer, wrap((req, res) => {
  const a = myAccount(req, req.params.id);
  const rows = db.prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY id').all(a.id);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = ['Date,Description,Category,Reference,Amount,Balance,Status']
    .concat(rows.map((t) => [t.created_at, esc(t.description), t.category, t.reference,
      ((t.direction === 'in' ? 1 : -1) * t.amount_cents / 100).toFixed(2), (t.balance_after / 100).toFixed(2), t.status].join(',')))
    .join('\n');
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="statement-${a.number.slice(-4)}.csv"` });
  res.send(csv);
}));

const usable = (a, action) => {
  if (a.status !== 'active') throw new BankError(`Account ••${a.number.slice(-4)} is ${a.status}`);
  if (action === 'debit' && ['cd', 'loan', 'investment'].includes(a.type)) throw new BankError('Transfers cannot be made from this account type');
  if (action === 'debit' && a.type === 'credit_card' && a.card_locked) throw new BankError('This card is locked');
};

app.post('/api/transfers', requireAuth, requireCustomer, wrap((req, res) => {
  const amount = toCents(req.body.amount);
  const memo = str(req.body.memo, 120);
  const from = myAccount(req, req.body.fromId);
  usable(from, 'debit');
  let to;
  if (req.body.toId) to = myAccount(req, req.body.toId);
  else {
    const num = str(req.body.toNumber, 20).replace(/\D/g, '');
    to = db.prepare("SELECT * FROM accounts WHERE number = ?").get(num);
    if (!to) throw new BankError('No CapitalBridge account found with that number');
  }
  if (to.id === from.id) throw new BankError('Choose two different accounts');
  usable(to, 'credit');
  const external = to.user_id !== req.user.id;
  const sender = `${req.user.first_name} ${req.user.last_name}`;
  const recipient = external ? db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(to.user_id) : null;
  const result = tx(() => {
    const out = postTransaction({
      accountId: from.id, direction: 'out', amountCents: amount, category: 'transfer', createdBy: req.user.id,
      description: external ? `Transfer to ${recipient.first_name} ${recipient.last_name[0]}. ••${to.number.slice(-4)}${memo ? ' – ' + memo : ''}`
        : `Transfer to ${to.nickname || to.type} ••${to.number.slice(-4)}${memo ? ' – ' + memo : ''}`,
    });
    postTransaction({
      accountId: to.id, direction: 'in', amountCents: amount, category: to.type === 'credit_card' || to.type === 'loan' ? 'payment' : 'transfer',
      createdBy: req.user.id, reference: out.reference,
      description: external ? `Transfer from ${sender}${memo ? ' – ' + memo : ''}` : `Transfer from ${from.nickname || from.type} ••${from.number.slice(-4)}${memo ? ' – ' + memo : ''}`,
    });
    return out;
  });
  audit(req.user.id, 'transfer', `${amount / 100} from ${from.number} to ${to.number}`);
  res.json({ ok: true, reference: result.reference });
}));

app.get('/api/payees', requireAuth, requireCustomer, (req, res) => {
  res.json({ payees: db.prepare('SELECT * FROM payees WHERE user_id = ? ORDER BY name').all(req.user.id) });
});
app.post('/api/payees', requireAuth, requireCustomer, wrap((req, res) => {
  const name = str(req.body.name, 80);
  if (!name) throw new BankError('Payee name is required');
  db.prepare('INSERT INTO payees (user_id, name, account_ref, category) VALUES (?, ?, ?, ?)')
    .run(req.user.id, name, str(req.body.account_ref, 40), str(req.body.category, 30) || 'bills');
  res.json({ ok: true });
}));
app.delete('/api/payees/:id', requireAuth, requireCustomer, (req, res) => {
  db.prepare('DELETE FROM payees WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});
app.post('/api/billpay', requireAuth, requireCustomer, wrap((req, res) => {
  const amount = toCents(req.body.amount);
  const from = myAccount(req, req.body.fromId);
  usable(from, 'debit');
  const payee = db.prepare('SELECT * FROM payees WHERE id = ? AND user_id = ?').get(Number(req.body.payeeId), req.user.id);
  if (!payee) throw new BankError('Choose a payee');
  const out = tx(() => postTransaction({
    accountId: from.id, direction: 'out', amountCents: amount, category: payee.category, createdBy: req.user.id,
    description: `Bill payment – ${payee.name}${payee.account_ref ? ' (' + payee.account_ref + ')' : ''}`,
  }));
  audit(req.user.id, 'billpay', `${amount / 100} to ${payee.name}`);
  res.json({ ok: true, reference: out.reference });
}));

app.post('/api/accounts/:id/card-lock', requireAuth, requireCustomer, wrap((req, res) => {
  const a = myAccount(req, req.params.id);
  if (!a.card_last4) throw new BankError('No card on this account');
  db.prepare('UPDATE accounts SET card_locked = ? WHERE id = ?').run(req.body.locked ? 1 : 0, a.id);
  audit(req.user.id, req.body.locked ? 'card_lock' : 'card_unlock', a.number);
  res.json({ ok: true });
}));

app.get('/api/messages', requireAuth, requireCustomer, (req, res) => {
  res.json({ messages: db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY id DESC').all(req.user.id) });
});
app.post('/api/messages/:id/read', requireAuth, requireCustomer, (req, res) => {
  db.prepare('UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ? AND from_admin = 1').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});
app.post('/api/messages', requireAuth, requireCustomer, wrap((req, res) => {
  const subject = str(req.body.subject, 120), body = str(req.body.body, 4000);
  if (!subject || !body) throw new BankError('Subject and message are required');
  db.prepare('INSERT INTO messages (user_id, from_admin, subject, body, is_read) VALUES (?, 0, ?, ?, 0)').run(req.user.id, subject, body);
  res.json({ ok: true });
}));

// ---------------- admin ----------------
const admin = express.Router();
admin.use(requireAuth, requireAdmin);

const getUser = (id) => {
  const u = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'customer'").get(Number(id));
  if (!u) throw new BankError('Customer not found', 404);
  return u;
};

admin.get('/stats', (req, res) => {
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  res.json({
    customers: one("SELECT COUNT(*) n FROM users WHERE role='customer'").n,
    activeCustomers: one("SELECT COUNT(*) n FROM users WHERE role='customer' AND status='active'").n,
    accounts: one("SELECT COUNT(*) n FROM accounts WHERE status!='closed'").n,
    deposits: one("SELECT COALESCE(SUM(balance_cents),0) s FROM accounts WHERE type NOT IN ('credit_card','loan') AND status!='closed'").s / 100,
    credit: one("SELECT COALESCE(SUM(balance_cents),0) s FROM accounts WHERE type IN ('credit_card','loan') AND status!='closed'").s / 100,
    txToday: one("SELECT COUNT(*) n FROM transactions WHERE date(created_at) = date('now')").n,
    unread: one('SELECT COUNT(*) n FROM messages WHERE from_admin = 0 AND is_read = 0').n,
    newRequests: one("SELECT COUNT(*) n FROM requests WHERE status = 'new'").n,
    chatsWaiting: one("SELECT COUNT(*) n FROM chats WHERE status = 'needs_human' OR (status = 'human' AND unread_admin > 0)").n,
    byType: db.prepare("SELECT type, COUNT(*) n, SUM(balance_cents)/100.0 total FROM accounts WHERE status!='closed' GROUP BY type").all(),
  });
});

admin.get('/users', (req, res) => {
  const q = `%${str(req.query.q, 60)}%`;
  const rows = db.prepare(`SELECT u.*, (SELECT COUNT(*) FROM accounts a WHERE a.user_id = u.id AND a.status!='closed') account_count,
      (SELECT COALESCE(SUM(CASE WHEN a.type IN ('credit_card','loan') THEN -a.balance_cents ELSE a.balance_cents END),0)
         FROM accounts a WHERE a.user_id = u.id AND a.status!='closed') net_cents
    FROM users u WHERE u.role='customer' AND (u.first_name || ' ' || u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?
      OR EXISTS (SELECT 1 FROM accounts a WHERE a.user_id=u.id AND a.number LIKE ?))
    ORDER BY u.id DESC`).all(q, q, q, q);
  res.json({ users: rows.map((u) => ({ ...publicUser(u), account_count: u.account_count, net: u.net_cents / 100 })) });
});

admin.post('/users', wrap((req, res) => {
  const b = req.body;
  const username = str(b.username, 40);
  const first = str(b.first_name, 60), last = str(b.last_name, 60);
  if (!first || !last) throw new BankError('First and last name are required');
  if (!/^[a-zA-Z0-9._-]{4,40}$/.test(username)) throw new BankError('Username must be 4–40 letters, numbers, dots, dashes or underscores');
  const password = String(b.password ?? '');
  if (password.length < 8) throw new BankError('Temporary password must be at least 8 characters');
  const ssn = str(b.ssn_last4, 4).replace(/\D/g, '');
  const accounts = Array.isArray(b.accounts) ? b.accounts : [];
  const sample = b.sample ? parseSampleRequest(b.sample) : null;
  let generated = [];
  const created = tx(() => {
    const r = db.prepare(`INSERT INTO users (role, username, password_hash, first_name, last_name, email, phone, dob, address, city, state, zip, ssn_last4, must_change_pw)
                          VALUES ('customer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(username, hashPassword(password), first, last, str(b.email, 120), str(b.phone, 30), str(b.dob, 10),
        str(b.address), str(b.city, 80), str(b.state, 40), str(b.zip, 12), ssn, 0);
    const userId = Number(r.lastInsertRowid);
    if (sample) {
      generated = generateHistory(db, { userId, ...sample, newAccountNumber, randomDigits, newReference, actorId: req.user.id });
      generateMessages(db, { userId, firstName: first, fromMs: sample.fromMs, toMs: sample.toMs, accounts: generated });
      db.prepare('UPDATE users SET sample_data = 1, created_at = ? WHERE id = ?').run(new Date(sample.fromMs).toISOString().slice(0, 19).replace('T', ' '), userId);
    } else {
      for (const a of accounts) openAccount(userId, a, req.user.id);
    }
    return userId;
  });
  audit(req.user.id, 'create_customer', `${username} (#${created})${sample ? ` with sample history: ${generated.map((g) => `${g.type} ${g.transactions} tx`).join(', ')}` : ''}`);
  // Sample customers already have a dated welcome message in their generated history.
  if (!sample) db.prepare('INSERT INTO messages (user_id, subject, body) VALUES (?, ?, ?)').run(created,
    'Welcome to CapitalBridge Bank',
    `Hi ${first}, your online banking profile is ready. For your security, please keep your password private. CapitalBridge will never ask for your password by phone, text or email.`);
  res.json({ ok: true, id: created, generated });
}));

// Validates a sample-history request from the create-customer form (demo mode only).
const SAMPLE_TYPES = ['checking', 'savings', 'money_market', 'cd', 'credit_card', 'loan', 'investment'];
function parseSampleRequest(s) {
  if (!DEMO_MODE) throw new BankError('Sample history is only available when the site runs in demo mode (DEMO_MODE=true)');
  const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? Date.parse(v + 'T00:00:00Z') : NaN);
  const fromMs = day(s.from), toMs = day(s.to);
  const today = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) throw new BankError('Choose both a From and a To date');
  if (fromMs > toMs) throw new BankError('The From date can’t be after the To date');
  if (toMs > today) throw new BankError('The To date can’t be in the future');
  if (fromMs < Date.UTC(1900, 0, 1)) throw new BankError('Choose a From date in 1900 or later');
  // Simple mode: one total, split randomly across deposit accounts.
  if (s.total !== undefined && s.total !== null && String(s.total).trim() !== '') {
    const total = Number(s.total);
    if (!Number.isFinite(total) || total <= 0) throw new BankError('Enter a total deposit amount greater than zero');
    if (total > 100_000_000) throw new BankError('Total deposits must be $100,000,000 or less');
    return { fromMs, toMs, holdings: splitTotal(total) };
  }
  const holdings = {};
  for (const t of SAMPLE_TYPES) {
    const raw = s.holdings?.[t];
    if (raw === undefined || raw === null || String(raw).trim() === '') continue;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0) throw new BankError('Account amounts must be zero or more');
    if (v > 100_000_000) throw new BankError('Account amounts must be $100,000,000 or less');
    holdings[t] = v;
  }
  if (!Object.keys(holdings).length) throw new BankError('Enter an amount for at least one account');
  return { fromMs, toMs, holdings };
}

// Split a total across deposit accounts at random: everyone gets checking; savings from $500;
// larger totals sometimes add a money market and/or investment account. Parts add up to the cent.
function splitTotal(total) {
  const cents = Math.round(total * 100);
  const r = (a, b) => a + crypto.randomInt(0, 10_000) / 10_000 * (b - a);
  const weights = { checking: r(0.12, 0.35) };
  if (total >= 500) weights.savings = r(0.3, 1);
  if (total >= 25_000 && crypto.randomInt(0, 2)) weights.money_market = r(0.3, 1);
  if (total >= 50_000 && crypto.randomInt(0, 2)) weights.investment = r(0.3, 1.2);
  // Checking keeps its share of the total; the rest is shared by the other accounts' weights.
  const others = Object.keys(weights).filter((k) => k !== 'checking');
  const out = {};
  let left = cents;
  if (!others.length) out.checking = cents;
  else {
    out.checking = Math.round(cents * weights.checking);
    left -= out.checking;
    const sum = others.reduce((s, k) => s + weights[k], 0);
    const rest = left;
    for (const k of others.slice(0, -1)) { out[k] = Math.round(rest * weights[k] / sum); left -= out[k]; }
    out[others.at(-1)] = left; // last account takes the remainder so the parts add up exactly
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v / 100]));
}

// Standard rates, matching the published product pages. Money market is tiered by balance.
function standardRate(type, openingDollars = 0) {
  switch (type) {
    case 'checking': return 0.01;
    case 'savings': return 0.01;
    case 'money_market': return openingDollars >= 25000 ? 0.03 : openingDollars >= 10000 ? 0.02 : 0.01;
    case 'cd': return 0.03;          // standard term
    case 'credit_card': return 21.99;
    case 'loan': return 9.49;
    default: return 0;               // investment
  }
}

function openAccount(userId, a, actorId) {
  const type = str(a.type, 20);
  if (!ACCOUNT_TYPES.includes(type)) throw new BankError('Unknown account type');
  a = { ...a, rate: standardRate(type, Number(a.opening) || 0) };
  const hasCard = type === 'checking' || type === 'credit_card';
  const r = db.prepare(`INSERT INTO accounts (user_id, type, nickname, number, credit_limit_cents, rate, card_last4)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(userId, type, str(a.nickname, 40), newAccountNumber(),
      Math.max(0, Math.round(Number(a.credit_limit || 0) * 100)) || 0, Number(a.rate) || 0, hasCard ? randomDigits(4) : '');
  const id = Number(r.lastInsertRowid);
  const opening = Number(a.opening || 0);
  if (opening > 0) {
    postTransaction({
      accountId: id, direction: isCredit(type) ? 'out' : 'in', amountCents: toCents(opening), createdBy: actorId,
      category: isCredit(type) ? (type === 'loan' ? 'loan' : 'adjustment') : 'deposit',
      description: type === 'loan' ? 'Loan disbursement – principal' : isCredit(type) ? 'Opening balance' : 'Opening deposit',
      allowOverdraft: true,
    });
  }
  return id;
}

admin.get('/users/:id', wrap((req, res) => {
  const u = getUser(req.params.id);
  const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY id').all(u.id).map(acctView);
  const page = customerTxPage(u.id, 0, PAGE_SIZE);
  const messages = db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY id DESC').all(u.id);
  res.json({ user: publicUser(u), accounts, transactions: page.transactions, tx_more: page.more, tx_total: page.total, messages });
}));

// Transaction lists load a page at a time; "before" is the id of the last row already shown.
const PAGE_SIZE = 25;
const pageArgs = (q) => ({ before: Number(q.before) || 0, limit: Math.min(Math.max(Number(q.limit) || PAGE_SIZE, 1), 200) });
// Lists are newest first by date/time (not insert order, since generated histories are saved one account
// at a time). The cursor is the last row shown: continue with rows dated earlier, or same time and lower id.
const AFTER_CURSOR = '(? IS NULL OR t.created_at < ? OR (t.created_at = ? AND t.id < ?))';
function cursorArgs(before) {
  const c = before ? db.prepare('SELECT created_at FROM transactions WHERE id = ?').get(before)?.created_at ?? null : null;
  return [c, c, c, before];
}
function customerTxPage(userId, before, limit) {
  const rows = db.prepare(`SELECT t.*, a.number, a.type FROM transactions t JOIN accounts a ON a.id = t.account_id
                           WHERE a.user_id = ? AND ${AFTER_CURSOR} ORDER BY t.created_at DESC, t.id DESC LIMIT ?`).all(userId, ...cursorArgs(before), limit + 1);
  const total = db.prepare('SELECT COUNT(*) n FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE a.user_id = ?').get(userId).n;
  return { transactions: rows.slice(0, limit).map(txView), more: rows.length > limit, total };
}
admin.get('/users/:id/transactions', wrap((req, res) => {
  const u = getUser(req.params.id);
  const { before, limit } = pageArgs(req.query);
  res.json(customerTxPage(u.id, before, limit));
}));

admin.put('/users/:id', wrap((req, res) => {
  const u = getUser(req.params.id);
  const b = { ...u, ...req.body };
  db.prepare(`UPDATE users SET first_name=?, last_name=?, email=?, phone=?, dob=?, address=?, city=?, state=?, zip=?, ssn_last4=? WHERE id=?`)
    .run(str(b.first_name, 60), str(b.last_name, 60), str(b.email, 120), str(b.phone, 30), str(b.dob, 10), str(b.address),
      str(b.city, 80), str(b.state, 40), str(b.zip, 12), str(b.ssn_last4, 4).replace(/\D/g, ''), u.id);
  audit(req.user.id, 'update_customer', u.username);
  res.json({ ok: true });
}));

admin.post('/users/:id/status', wrap((req, res) => {
  const u = getUser(req.params.id);
  const status = req.body.status === 'suspended' ? 'suspended' : 'active';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, u.id);
  if (status === 'suspended') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  audit(req.user.id, `customer_${status}`, u.username);
  res.json({ ok: true });
}));

admin.post('/users/:id/reset-password', wrap((req, res) => {
  const u = getUser(req.params.id);
  const pw = String(req.body.password ?? '');
  if (pw.length < 8) throw new BankError('Password must be at least 8 characters');
  db.prepare('UPDATE users SET password_hash = ?, must_change_pw = 0 WHERE id = ?').run(hashPassword(pw), u.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  audit(req.user.id, 'reset_password', u.username);
  res.json({ ok: true });
}));

admin.delete('/users/:id', wrap((req, res) => {
  const u = getUser(req.params.id);
  const open = db.prepare("SELECT COUNT(*) n FROM accounts WHERE user_id = ? AND status != 'closed' AND balance_cents != 0").get(u.id).n;
  if (open) throw new BankError('Close or zero out all accounts before deleting this customer');
  db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
  audit(req.user.id, 'delete_customer', u.username);
  res.json({ ok: true });
}));

admin.post('/users/:id/accounts', wrap((req, res) => {
  const u = getUser(req.params.id);
  const id = tx(() => openAccount(u.id, req.body, req.user.id));
  audit(req.user.id, 'open_account', `${req.body.type} for ${u.username}`);
  res.json({ ok: true, id });
}));

admin.put('/accounts/:id', wrap((req, res) => {
  const a = db.prepare('SELECT * FROM accounts WHERE id = ?').get(Number(req.params.id));
  if (!a) throw new BankError('Account not found', 404);
  const b = req.body;
  const status = ['active', 'frozen', 'closed'].includes(b.status) ? b.status : a.status;
  if (status === 'closed' && a.balance_cents !== 0) throw new BankError('Balance must be zero before closing the account');
  db.prepare('UPDATE accounts SET nickname=?, rate=?, credit_limit_cents=?, status=?, card_locked=? WHERE id=?')
    .run(b.nickname !== undefined ? str(b.nickname, 40) : a.nickname,
      b.rate !== undefined ? Number(b.rate) || 0 : a.rate,
      b.credit_limit !== undefined ? Math.max(0, Math.round(Number(b.credit_limit) * 100)) || 0 : a.credit_limit_cents,
      status, b.card_locked !== undefined ? (b.card_locked ? 1 : 0) : a.card_locked, a.id);
  audit(req.user.id, 'update_account', `${a.number} ${JSON.stringify(b)}`);
  res.json({ ok: true });
}));

admin.post('/accounts/:id/transactions', wrap((req, res) => {
  const a = db.prepare('SELECT * FROM accounts WHERE id = ?').get(Number(req.params.id));
  if (!a) throw new BankError('Account not found', 404);
  const amount = toCents(req.body.amount);
  const direction = req.body.direction === 'out' ? 'out' : 'in';
  const description = str(req.body.description, 140) || (direction === 'in' ? 'Deposit' : 'Withdrawal');
  const out = tx(() => postTransaction({
    accountId: a.id, direction, amountCents: amount, category: str(req.body.category, 30) || 'adjustment',
    description, createdBy: req.user.id, allowOverdraft: !!req.body.allowOverdraft,
  }));
  audit(req.user.id, 'post_transaction', `${direction} ${amount / 100} on ${a.number}: ${description}`);
  res.json({ ok: true, reference: out.reference });
}));

admin.post('/transactions/:id/reverse', wrap((req, res) => {
  const t = db.prepare('SELECT * FROM transactions WHERE id = ?').get(Number(req.params.id));
  if (!t) throw new BankError('Transaction not found', 404);
  if (t.status === 'reversed') throw new BankError('Already reversed');
  const out = tx(() => {
    const r = postTransaction({
      accountId: t.account_id, direction: t.direction === 'in' ? 'out' : 'in', amountCents: t.amount_cents,
      category: 'reversal', description: `Reversal of ${t.reference}`, createdBy: req.user.id, allowOverdraft: true,
    });
    db.prepare("UPDATE transactions SET status = 'reversed' WHERE id = ?").run(t.id);
    return r;
  });
  audit(req.user.id, 'reverse_transaction', t.reference);
  res.json({ ok: true, reference: out.reference });
}));

admin.get('/transactions', (req, res) => {
  const q = `%${str(req.query.q, 60)}%`;
  const { before, limit } = pageArgs(req.query);
  const rows = db.prepare(`SELECT t.*, a.number, a.type, a.user_id, u.first_name, u.last_name FROM transactions t
      JOIN accounts a ON a.id = t.account_id JOIN users u ON u.id = a.user_id
      WHERE ${AFTER_CURSOR}
        AND (t.description LIKE ? OR t.reference LIKE ? OR a.number LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?)
      ORDER BY t.created_at DESC, t.id DESC LIMIT ?`).all(...cursorArgs(before), q, q, q, q, limit + 1);
  res.json({ transactions: rows.slice(0, limit).map(txView), more: rows.length > limit });
});

admin.post('/users/:id/messages', wrap((req, res) => {
  const u = getUser(req.params.id);
  const subject = str(req.body.subject, 120), body = str(req.body.body, 4000);
  if (!subject || !body) throw new BankError('Subject and message are required');
  db.prepare('INSERT INTO messages (user_id, from_admin, subject, body) VALUES (?, 1, ?, ?)').run(u.id, subject, body);
  db.prepare('UPDATE messages SET is_read = 1 WHERE user_id = ? AND from_admin = 0').run(u.id);
  audit(req.user.id, 'message_customer', u.username);
  res.json({ ok: true });
}));

admin.get('/inbox', (req, res) => {
  res.json({ messages: db.prepare(`SELECT m.*, u.first_name, u.last_name, u.username FROM messages m JOIN users u ON u.id = m.user_id
                                   WHERE m.from_admin = 0 ORDER BY m.id DESC LIMIT 100`).all() });
});

admin.get('/announcements', (req, res) => res.json({ announcements: db.prepare('SELECT * FROM announcements ORDER BY id DESC').all() }));
admin.post('/announcements', wrap((req, res) => {
  const title = str(req.body.title, 120), body = str(req.body.body, 1000);
  if (!title || !body) throw new BankError('Title and text are required');
  db.prepare('INSERT INTO announcements (title, body) VALUES (?, ?)').run(title, body);
  audit(req.user.id, 'announcement', title);
  res.json({ ok: true });
}));
admin.delete('/announcements/:id', (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

admin.get('/requests', (req, res) => {
  const status = ['new', 'in_progress', 'closed'].includes(req.query.status) ? req.query.status : null;
  const kind = REQUEST_KINDS[req.query.kind] ? req.query.kind : null;
  const rows = db.prepare(`SELECT * FROM requests WHERE (? IS NULL OR status = ?) AND (? IS NULL OR kind = ?)
                           ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, id DESC LIMIT 300`)
    .all(status, status, kind, kind);
  res.json({ requests: rows.map((r) => ({ ...r, data: JSON.parse(r.data || '{}'), label: REQUEST_KINDS[r.kind] })), kinds: REQUEST_KINDS });
});
admin.post('/requests/:id', wrap((req, res) => {
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(Number(req.params.id));
  if (!r) throw new BankError('Request not found', 404);
  const status = ['new', 'in_progress', 'closed'].includes(req.body.status) ? req.body.status : r.status;
  const notes = req.body.notes !== undefined ? str(req.body.notes, 2000) : r.notes;
  db.prepare('UPDATE requests SET status = ?, notes = ? WHERE id = ?').run(status, notes, r.id);
  audit(req.user.id, 'update_request', `${r.reference} → ${status}`);
  res.json({ ok: true });
}));

admin.get('/chats', (req, res) => {
  // '' = open conversations, 'all' = everything, otherwise one status
  const q = String(req.query.status || '');
  const where = q === 'all' ? '1 = 1' : ['ai', 'needs_human', 'human', 'closed'].includes(q) ? 'c.status = ?' : "c.status != 'closed'";
  const args = where === 'c.status = ?' ? [q] : [];
  const rows = db.prepare(`SELECT c.*, u.username, (SELECT COUNT(*) FROM chat_messages m WHERE m.chat_id = c.id AND m.sender != 'system') AS message_count
    FROM chats c LEFT JOIN users u ON u.id = c.user_id WHERE ${where}
    ORDER BY CASE c.status WHEN 'needs_human' THEN 0 WHEN 'human' THEN 1 WHEN 'ai' THEN 2 ELSE 3 END, c.updated_at DESC LIMIT 200`).all(...args);
  res.json({ chats: rows.map(({ guest_token, ...c }) => c), ai: chatbot.aiAvailable(), model: chatbot.MODEL });
});
admin.get('/chats/:id', wrap((req, res) => {
  const chat = db.prepare('SELECT c.*, u.username FROM chats c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = ?').get(Number(req.params.id));
  if (!chat) throw new BankError('Conversation not found', 404);
  if (chat.unread_admin) db.prepare('UPDATE chats SET unread_admin = 0 WHERE id = ?').run(chat.id);
  const messages = db.prepare(`SELECT m.*, u.first_name AS agent_name FROM chat_messages m LEFT JOIN users u ON u.id = m.agent_id
                               WHERE m.chat_id = ? AND m.id > ? ORDER BY m.id`).all(chat.id, Number(req.query.after) || 0).map(chatMsgView);
  const { guest_token, ...safe } = chat;
  res.json({ chat: safe, messages });
}));
admin.post('/chats/:id/messages', wrap((req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(Number(req.params.id));
  if (!chat) throw new BankError('Conversation not found', 404);
  const text = str(req.body.text, 4000);
  if (!text) throw new BankError('Type a reply first');
  addChatMessage(chat.id, 'agent', text, req.user.id);
  db.prepare("UPDATE chats SET status = 'human', ai_enabled = 0, unread_user = unread_user + 1, unread_admin = 0 WHERE id = ?").run(chat.id);
  audit(req.user.id, 'chat_reply', `chat #${chat.id}`);
  res.json({ ok: true });
}));
admin.post('/chats/:id', wrap((req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(Number(req.params.id));
  if (!chat) throw new BankError('Conversation not found', 404);
  const action = req.body.action;
  if (action === 'resolve') {
    db.prepare("UPDATE chats SET status = 'closed', unread_admin = 0 WHERE id = ?").run(chat.id);
    addChatMessage(chat.id, 'system', 'Marked resolved by customer care');
  } else if (action === 'ai') {
    db.prepare("UPDATE chats SET status = 'ai', ai_enabled = 1 WHERE id = ?").run(chat.id);
    addChatMessage(chat.id, 'system', 'Conversation handed back to the virtual assistant');
  } else if (action === 'take') {
    db.prepare("UPDATE chats SET status = 'human', ai_enabled = 0 WHERE id = ?").run(chat.id);
    addChatMessage(chat.id, 'system', 'A customer care specialist took over this conversation');
  } else throw new BankError('Unknown action');
  audit(req.user.id, `chat_${action}`, `chat #${chat.id}`);
  res.json({ ok: true });
}));

admin.get('/audit', (req, res) => {
  res.json({ entries: db.prepare(`SELECT l.*, u.username FROM audit_log l LEFT JOIN users u ON u.id = l.actor_id
                                  ORDER BY l.id DESC LIMIT 300`).all() });
});

app.use('/api/admin', admin);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------------- pages ----------------
const pub = path.join(__dirname, 'public');
// no-cache: browsers keep their copy but check it's current, so updates show up right away.
app.use(express.static(pub, { extensions: ['html'], setHeaders: (res) => res.set('Cache-Control', 'no-cache') }));
app.get('/app', (req, res) => res.sendFile(path.join(pub, 'app.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(pub, 'admin.html')));
app.get('/p/:slug', (req, res) => res.sendFile(path.join(pub, 'page.html')));
app.use((req, res) => res.status(404).sendFile(path.join(pub, 'index.html')));

const credFile = ensureAdmin();
app.listen(PORT, () => {
  console.log(`\n  CapitalBridge Bank running at http://localhost:${PORT}`);
  if (credFile) console.log(`  First run: initial admin login saved to ${credFile}\n`);
});
