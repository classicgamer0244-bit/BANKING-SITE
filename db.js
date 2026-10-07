// Database layer: Node's built-in SQLite (node:sqlite), money stored as integer cents.
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'bank.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  role          TEXT NOT NULL DEFAULT 'customer',       -- 'admin' | 'customer'
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  dob           TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  state         TEXT NOT NULL DEFAULT '',
  zip           TEXT NOT NULL DEFAULT '',
  ssn_last4     TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active',          -- 'active' | 'suspended'
  must_change_pw INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_login    TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,     -- checking | savings | money_market | cd | credit_card | loan | investment
  nickname       TEXT NOT NULL DEFAULT '',
  number         TEXT NOT NULL UNIQUE,
  balance_cents  INTEGER NOT NULL DEFAULT 0,   -- for credit_card / loan this is the amount owed
  credit_limit_cents INTEGER NOT NULL DEFAULT 0,
  rate           REAL NOT NULL DEFAULT 0,      -- APY for deposits, APR for credit
  status         TEXT NOT NULL DEFAULT 'active', -- active | frozen | closed
  card_last4     TEXT NOT NULL DEFAULT '',
  card_locked    INTEGER NOT NULL DEFAULT 0,
  opened_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL,        -- 'in' (money into account) | 'out'
  amount_cents  INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other',
  description   TEXT NOT NULL DEFAULT '',
  reference     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'posted', -- posted | reversed
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payees (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  account_ref TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT 'bills'
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_admin INTEGER NOT NULL DEFAULT 1,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id   INTEGER,
  action     TEXT NOT NULL,
  details    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,        -- application | contact | appointment | password_reset | fraud | lost_card
  reference  TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  data       TEXT NOT NULL DEFAULT '{}',
  status     TEXT NOT NULL DEFAULT 'new', -- new | in_progress | closed
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chats (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,   -- signed-in customer, or NULL for a guest
  guest_token  TEXT UNIQUE,
  name         TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'ai',   -- ai | needs_human | human | closed
  ai_enabled   INTEGER NOT NULL DEFAULT 1,
  unread_admin INTEGER NOT NULL DEFAULT 0,
  unread_user  INTEGER NOT NULL DEFAULT 0,
  last_message TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_user ON chats(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS chat_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender     TEXT NOT NULL,   -- user | ai | agent | system
  body       TEXT NOT NULL,
  agent_id   INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chatmsg ON chat_messages(chat_id, id);

CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id, id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_acct_user ON accounts(user_id);
`);

// Added after first release: customers whose history was generated in demo mode.
try { db.exec('ALTER TABLE users ADD COLUMN sample_data INTEGER NOT NULL DEFAULT 0'); } catch { /* column exists */ }
// Employment details (used for payroll descriptions in generated history).
for (const col of ['job_title', 'employer']) {
  try { db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch { /* column exists */ }
}
try { db.exec('ALTER TABLE users ADD COLUMN annual_salary_cents INTEGER NOT NULL DEFAULT 0'); } catch { /* column exists */ }

db.exec(`
CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_transfer_controls (
  user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  transfers_paused INTEGER NOT NULL DEFAULT 0,
  notice_enabled   INTEGER NOT NULL DEFAULT 0,
  notice_title     TEXT NOT NULL DEFAULT '',
  notice_message   TEXT NOT NULL DEFAULT '',
  notice_type      TEXT NOT NULL DEFAULT 'info',
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'transaction', -- transaction | security | transfer | system
  reference  TEXT NOT NULL DEFAULT '',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, id);
`);

function getTransferSettings() {
  const rows = db.prepare('SELECT key, value FROM system_settings WHERE key LIKE ?').all('transfer_%');
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    transfers_paused: map['transfer_paused'] === '1',
    notice_enabled: map['transfer_notice_enabled'] === '1',
    notice_title: map['transfer_notice_title'] || 'Important Transfer Notice',
    notice_message: map['transfer_notice_message'] || 'Please verify your transfer details and recipient information before proceeding.',
    notice_type: map['transfer_notice_type'] || 'info',
  };
}

function setTransferSettings({ transfers_paused, notice_enabled, notice_title, notice_message, notice_type }) {
  const upsert = db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  tx(() => {
    if (transfers_paused !== undefined) upsert.run('transfer_paused', transfers_paused ? '1' : '0');
    if (notice_enabled !== undefined) upsert.run('transfer_notice_enabled', notice_enabled ? '1' : '0');
    if (notice_title !== undefined) upsert.run('transfer_notice_title', String(notice_title).slice(0, 120));
    if (notice_message !== undefined) upsert.run('transfer_notice_message', String(notice_message).slice(0, 500));
    if (notice_type !== undefined) upsert.run('transfer_notice_type', String(notice_type).slice(0, 20));
  });
  return getTransferSettings();
}

function getUserTransferSettings(userId) {
  const global = getTransferSettings();
  if (!userId) return { is_custom: false, ...global };
  const row = db.prepare('SELECT * FROM user_transfer_controls WHERE user_id = ?').get(userId);
  if (!row) {
    return { is_custom: false, user_id: userId, ...global };
  }
  return {
    is_custom: true,
    user_id: userId,
    transfers_paused: global.transfers_paused || row.transfers_paused === 1,
    custom_paused: row.transfers_paused === 1,
    notice_enabled: row.notice_enabled === 1 || global.notice_enabled,
    custom_notice_enabled: row.notice_enabled === 1,
    notice_title: row.notice_title || global.notice_title,
    notice_message: row.notice_message || global.notice_message,
    notice_type: row.notice_type || global.notice_type,
    updated_at: row.updated_at,
  };
}

function setUserTransferSettings(userId, { transfers_paused, notice_enabled, notice_title, notice_message, notice_type }) {
  if (!userId) return setTransferSettings({ transfers_paused, notice_enabled, notice_title, notice_message, notice_type });
  const upsert = db.prepare(`
    INSERT INTO user_transfer_controls (user_id, transfers_paused, notice_enabled, notice_title, notice_message, notice_type, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      transfers_paused = excluded.transfers_paused,
      notice_enabled = excluded.notice_enabled,
      notice_title = excluded.notice_title,
      notice_message = excluded.notice_message,
      notice_type = excluded.notice_type,
      updated_at = excluded.updated_at
  `);
  tx(() => {
    upsert.run(
      userId,
      transfers_paused ? 1 : 0,
      notice_enabled ? 1 : 0,
      String(notice_title || '').slice(0, 120),
      String(notice_message || '').slice(0, 500),
      String(notice_type || 'info').slice(0, 20)
    );
  });
  return getUserTransferSettings(userId);
}

function clearUserTransferSettings(userId) {
  db.prepare('DELETE FROM user_transfer_controls WHERE user_id = ?').run(userId);
}

function getAllCustomTransferControls() {
  return db.prepare(`
    SELECT c.*, u.username, u.first_name, u.last_name, u.email
    FROM user_transfer_controls c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.updated_at DESC
  `).all();
}

// ---------- helpers ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

function randomDigits(n) {
  let s = '';
  while (s.length < n) s += crypto.randomInt(0, 10);
  return s;
}
function newAccountNumber() {
  for (;;) {
    const num = '4' + randomDigits(11);
    if (!db.prepare('SELECT 1 FROM accounts WHERE number = ?').get(num)) return num;
  }
}
function newReference() {
  return 'CB' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
}

const CREDIT_TYPES = new Set(['credit_card', 'loan']);
const ACCOUNT_TYPES = ['checking', 'savings', 'money_market', 'cd', 'credit_card', 'loan', 'investment'];
const isCredit = (type) => CREDIT_TYPES.has(type);

function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

class BankError extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

/**
 * Post a transaction to an account. direction 'in' = money into the account.
 * For deposit accounts 'in' raises the balance; for credit accounts 'in' is a payment
 * that lowers the amount owed. Must be called inside tx().
 */
function postTransaction({ accountId, direction, amountCents, category, description, createdBy, reference, allowOverdraft = false }) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new BankError('Amount must be greater than zero');
  if (direction !== 'in' && direction !== 'out') throw new BankError('Invalid direction');
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
  if (!acct) throw new BankError('Account not found', 404);
  if (acct.status === 'closed') throw new BankError(`Account ••${acct.number.slice(-4)} is closed`);

  const credit = isCredit(acct.type);
  const delta = (direction === 'in' ? 1 : -1) * (credit ? -1 : 1) * amountCents;
  const newBal = acct.balance_cents + delta;

  if (!allowOverdraft) {
    if (!credit && newBal < 0) throw new BankError('Insufficient funds');
    if (credit && newBal < 0) throw new BankError('Payment exceeds the balance owed');
    if (credit && acct.type === 'credit_card' && acct.credit_limit_cents > 0 && newBal > acct.credit_limit_cents)
      throw new BankError('Credit limit exceeded');
  }

  db.prepare('UPDATE accounts SET balance_cents = ? WHERE id = ?').run(newBal, accountId);
  const ref = reference || newReference();
  const r = db.prepare(`INSERT INTO transactions (account_id, direction, amount_cents, balance_after, category, description, reference, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(accountId, direction, amountCents, newBal, category || 'other', description || '', ref, createdBy ?? null);

  // Generate real-time notification for the customer
  try {
    const formattedAmt = (amountCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const isCreditDir = direction === 'in';
    const notifTitle = isCreditDir ? `Deposit Received: ${formattedAmt}` : `Transaction: ${formattedAmt}`;
    const notifMsg = `${description || (isCreditDir ? 'Deposit' : 'Withdrawal')} on ••${acct.number.slice(-4)}. New balance: ${(newBal / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`;
    db.prepare('INSERT INTO notifications (user_id, title, message, type, reference) VALUES (?, ?, ?, ?, ?)')
      .run(acct.user_id, notifTitle, notifMsg, 'transaction', ref);
  } catch (err) {
    /* ignore notification logging failure */
  }

  return { id: Number(r.lastInsertRowid), reference: ref, balance: newBal };
}

function addNotification(userId, title, message, type = 'system', reference = '') {
  return db.prepare('INSERT INTO notifications (user_id, title, message, type, reference) VALUES (?, ?, ?, ?, ?)')
    .run(userId, title, message, type, reference);
}

function getUserNotifications(userId, limit = 50) {
  return db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?').all(userId, limit);
}

function markNotificationsRead(userId) {
  return db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
}

function audit(actorId, action, details) {
  db.prepare('INSERT INTO audit_log (actor_id, action, details) VALUES (?, ?, ?)').run(actorId ?? null, action, details || '');
}

// ---------- first-run admin seed ----------
function ensureAdmin() {
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (existing) return null;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  db.prepare(`INSERT INTO users (role, username, password_hash, first_name, last_name, email, must_change_pw)
              VALUES ('admin', ?, ?, 'Bank', 'Administrator', 'admin@capitalbridge.local', ?)`)
    .run(username, hashPassword(password), process.env.ADMIN_PASSWORD ? 0 : 1);
  const credFile = path.join(DATA_DIR, 'admin-credentials.txt');
  fs.writeFileSync(credFile,
    `CapitalBridge Bank - initial admin login\nusername: ${username}\npassword: ${password}\n\n` +
    `You will be asked to change this password after first sign-in. Delete this file afterwards.\n`);
  db.prepare("INSERT INTO announcements (title, body) VALUES (?, ?)").run(
    'Welcome to CapitalBridge online banking',
    'Manage accounts, move money, pay bills and track markets — all in one place.');
  return credFile;
}

module.exports = {
  db, tx, BankError, hashPassword, verifyPassword, newAccountNumber, newReference, randomDigits,
  postTransaction, audit, ensureAdmin, isCredit, ACCOUNT_TYPES,
  getTransferSettings, setTransferSettings,
  getUserTransferSettings, setUserTransferSettings, clearUserTransferSettings, getAllCustomTransferControls,
  addNotification, getUserNotifications, markNotificationsRead,
};
