// Sample account history for demo mode: realistic transactions between two dates that end
// exactly at the balances the admin entered. Only reachable when DEMO_MODE=true.
const crypto = require('node:crypto');

const rnd = (min, max) => min + crypto.randomInt(0, 1_000_000) / 1_000_000 * (max - min);
const pick = (arr) => arr[crypto.randomInt(0, arr.length)];
const cents = (dollars) => Math.max(1, Math.round(dollars * 100));
const DAY = 86_400_000;

const SPEND = [
  ['groceries', ['Fresh Market Grocers', 'Greenleaf Foods', 'Corner Pantry', 'Harvest Supermarket'], 25, 160],
  ['dining', ['Bluebird Cafe', 'Main Street Diner', 'Luca’s Pizzeria', 'Sakura Sushi', 'The Daily Grind Coffee'], 6, 85],
  ['fuel', ['Quickstop Fuel', 'Highway Gas & Go', 'Metro Fuel'], 30, 75],
  ['shopping', ['Northside Outfitters', 'HomeGoods Depot', 'Pages Bookstore', 'Tech Corner Electronics'], 15, 220],
  ['travel', ['Skyline Air', 'Harborview Hotel', 'Metro Rideshare'], 12, 420],
  ['entertainment', ['Cinema 8', 'StreamPlus', 'City Arena Tickets'], 9, 95],
];
const BILLS = [
  ['utilities', 'City Power & Light', 70, 180],
  ['utilities', 'Metro Water Services', 30, 70],
  ['phone', 'Wireless One', 55, 95],
  ['internet', 'FiberNet Internet', 50, 90],
  ['insurance', 'Shield Auto Insurance', 90, 160],
];
const EMPLOYERS = ['Northwind Logistics', 'Summit Health Partners', 'Brightline Software', 'Riverside School District', 'Keystone Manufacturing'];

const at = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const randomTime = (dayMs) => dayMs + crypto.randomInt(8 * 3600, 21 * 3600) * 1000;

function eachDay(fromMs, toMs, everyDays, startOffsetDays = 0) {
  const out = [];
  for (let t = fromMs + startOffsetDays * DAY; t <= toMs; t += everyDays * DAY) out.push(t);
  return out;
}
function eachMonth(fromMs, toMs, dayOfMonth) {
  const out = [];
  const d = new Date(fromMs);
  d.setUTCDate(1);
  while (d.getTime() <= toMs) {
    const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), Math.min(dayOfMonth, 28)));
    if (day.getTime() >= fromMs && day.getTime() <= toMs) out.push(day.getTime());
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/**
 * Build the event list for one account. Each event: {time, dir: 'in'|'out', cents, category, description}.
 * The first event is the opening entry; its amount is solved so the account ends at targetCents.
 * For credit accounts (card, loan) the "balance" is the amount owed: 'out' raises it, 'in' lowers it.
 */
function planAccount(type, targetCents, fromMs, toMs) {
  const credit = type === 'credit_card' || type === 'loan';
  const ev = [];
  const months = Math.max(1, Math.round((toMs - fromMs) / (30 * DAY)));

  if (type === 'checking') {
    const employer = pick(EMPLOYERS);
    const pay = rnd(1400, 3200);
    for (const t of eachDay(fromMs, toMs, 14, crypto.randomInt(1, 10))) ev.push({ time: randomTime(t), dir: 'in', cents: cents(pay * rnd(0.98, 1.02)), category: 'payroll', description: `Direct deposit – ${employer} payroll` });
    const rent = rnd(900, 2200);
    for (const t of eachMonth(fromMs, toMs, 1)) ev.push({ time: randomTime(t), dir: 'out', cents: cents(rent), category: 'rent', description: 'Rent payment – Parkside Apartments' });
    for (const [cat, name, lo, hi] of BILLS) {
      const due = crypto.randomInt(3, 27);
      for (const t of eachMonth(fromMs, toMs, due)) ev.push({ time: randomTime(t), dir: 'out', cents: cents(rnd(lo, hi)), category: cat, description: `${name} – autopay` });
    }
    const days = Math.round((toMs - fromMs) / DAY);
    const purchases = Math.round(days * rnd(0.6, 1.1));
    for (let i = 0; i < purchases; i++) {
      const [cat, names, lo, hi] = pick(SPEND);
      ev.push({ time: randomTime(fromMs + crypto.randomInt(0, days + 1) * DAY), dir: 'out', cents: cents(rnd(lo, hi)), category: cat, description: `Debit card purchase – ${pick(names)}` });
    }
    for (let i = 0; i < Math.round(months * 0.6); i++) {
      ev.push({ time: randomTime(fromMs + crypto.randomInt(0, days + 1) * DAY), dir: 'out', cents: cents(rnd(40, 300)), category: 'withdrawal', description: 'ATM withdrawal – CapitalBridge ATM' });
    }
  } else if (type === 'savings' || type === 'money_market') {
    const monthly = rnd(100, 600);
    for (const t of eachMonth(fromMs, toMs, crypto.randomInt(2, 25))) ev.push({ time: randomTime(t), dir: 'in', cents: cents(monthly), category: 'transfer', description: 'Automatic transfer from Bridge Checking' });
    for (const t of eachMonth(fromMs, toMs, 28)) ev.push({ time: randomTime(t), dir: 'in', cents: 1, category: 'interest', description: 'Interest payment', interest: true });
    for (let i = 0; i < Math.round(months / 6); i++) ev.push({ time: randomTime(fromMs + crypto.randomInt(30, Math.max(31, Math.round((toMs - fromMs) / DAY))) * DAY), dir: 'out', cents: cents(rnd(200, 1500)), category: 'transfer', description: 'Transfer to Bridge Checking' });
  } else if (type === 'cd') {
    for (const t of eachMonth(fromMs, toMs, 28)) ev.push({ time: randomTime(t), dir: 'in', cents: 1, category: 'interest', description: 'Interest payment', interest: true });
  } else if (type === 'investment') {
    const monthly = rnd(150, 900);
    for (const t of eachMonth(fromMs, toMs, 15)) ev.push({ time: randomTime(t), dir: 'in', cents: cents(monthly), category: 'deposit', description: 'Recurring contribution' });
  } else if (type === 'credit_card') {
    const days = Math.round((toMs - fromMs) / DAY);
    const purchases = Math.round(days * rnd(0.3, 0.6));
    for (let i = 0; i < purchases; i++) {
      const [cat, names, lo, hi] = pick(SPEND);
      ev.push({ time: randomTime(fromMs + crypto.randomInt(1, days + 1) * DAY), dir: 'out', cents: cents(rnd(lo, hi)), category: cat, description: pick(names) });
    }
    for (const t of eachMonth(fromMs, toMs, 22)) ev.push({ time: randomTime(t), dir: 'in', cents: 0, category: 'payment', description: 'Payment – thank you', ccPayment: true });
  } else if (type === 'loan') {
    const payment = Math.max(50, Math.round(targetCents / 100 * rnd(0.02, 0.035)));
    for (const t of eachMonth(fromMs, toMs, 5)) if (t > fromMs + 20 * DAY) ev.push({ time: randomTime(t), dir: 'in', cents: cents(payment), category: 'loan', description: 'Loan payment – autopay' });
  }

  ev.sort((a, b) => a.time - b.time);
  return { credit, ev };
}

// Turn planned events into posted rows: solve the opening entry and fix balances so nothing goes negative.
function settle(type, targetCents, fromMs, toMs, plan) {
  const { credit, ev } = plan;
  const sign = (e) => (e.dir === 'in' ? 1 : -1) * (credit ? -1 : 1);

  // Credit card payments: pay ~85–100% of the running balance each month.
  if (type === 'credit_card') {
    let owed = 0;
    for (const e of ev) {
      if (e.ccPayment) { e.cents = Math.round(owed * rnd(0.85, 1)); owed -= e.cents; } else owed += e.cents;
    }
  }
  const real = ev.filter((e) => e.cents > 0 || e.interest);
  const netOf = (list) => list.reduce((s, e) => s + (e.interest ? 0 : sign(e) * e.cents), 0);

  // Opening entry = target − net activity, so the account ends exactly on target.
  let opening = targetCents - netOf(real);
  if (opening < 0) {
    // Activity pushes the balance above target: scale down whatever raises the balance
    // (income for deposit accounts, purchases for credit accounts) until the opening is ≥ 0.
    const raisers = real.filter((e) => !e.interest && sign(e) > 0);
    const total = raisers.reduce((s, e) => s + e.cents, 0);
    const factor = total ? Math.max(0, (total + opening) / total) : 0;
    raisers.forEach((e) => { e.cents = Math.floor(e.cents * factor); });
    for (let i = real.length - 1; i >= 0; i--) if (!real[i].interest && real[i].cents <= 0) real.splice(i, 1);
    opening = Math.max(0, targetCents - netOf(real));
  }

  // Never let the balance go below zero along the way: lift the opening and give the lift back
  // with one final entry, so every earlier balance is higher and the ending balance is unchanged.
  real.sort((a, b) => a.time - b.time);
  let bal = opening, min = opening;
  for (const e of real) { bal += e.interest ? 0 : sign(e) * e.cents; min = Math.min(min, bal); }
  // Events fall between 8am and 9pm; the closing entries go after them on the last day.
  const closing = toMs + 21.5 * 3600 * 1000;
  const floor = credit ? 0 : 2500; // deposit accounts keep ~$25 headroom; owed balances just stay ≥ 0
  if (min < floor) {
    const lift = floor - min + cents(rnd(50, 300));
    opening += lift;
    real.push(credit
      ? { time: closing, dir: 'in', cents: lift, category: 'payment', description: 'Payment – thank you' }
      : { time: closing, dir: 'out', cents: lift, category: 'transfer', description: 'Transfer to external account' });
  }

  // Post rows in date order; interest is a tiny amount based on the running balance.
  const apy = { savings: 0.0001, money_market: 0.0002, cd: 0.0003 }[type] || 0;
  const rows = [{ time: fromMs + 7 * 3600 * 1000, dir: credit ? 'out' : 'in', cents: opening, category: credit ? (type === 'loan' ? 'loan' : 'adjustment') : 'deposit',
    description: type === 'loan' ? 'Loan disbursement – principal' : credit ? 'Balance transfer' : 'Opening deposit' }];
  real.sort((a, b) => a.time - b.time);
  bal = opening;
  for (const e of real) {
    if (e.interest) e.cents = Math.max(1, Math.round(bal * apy / 12));
    bal += sign(e) * e.cents;
    rows.push(e);
  }
  // Interest moves the total away from the target (by a lot over decades). Settle it with one final
  // transfer on the last day: it comes after every other entry, so no earlier balance changes.
  const diff = targetCents - bal;
  if (diff !== 0) {
    const up = (diff > 0) !== credit; // money into the account?
    rows.push({ time: closing + 60_000, dir: up ? 'in' : 'out', cents: Math.abs(diff), category: 'transfer',
      description: up ? 'Transfer from Bridge Checking' : 'Transfer to Bridge Checking' });
  }
  return rows.filter((r) => r.cents > 0);
}

/** Generate and post history for each requested account. Caller wraps this in a DB transaction. */
function generateHistory(db, { userId, fromMs, toMs, holdings, newAccountNumber, randomDigits, newReference, actorId }) {
  const created = [];
  for (const [type, dollars] of Object.entries(holdings)) {
    const targetCents = Math.round(Number(dollars) * 100);
    if (!Number.isFinite(targetCents) || targetCents < 0) continue;
    const plan = planAccount(type, targetCents, fromMs, toMs);
    const rows = settle(type, targetCents, fromMs, toMs, plan);
    const hasCard = type === 'checking' || type === 'credit_card';
    const credit = plan.credit;
    const limit = type === 'credit_card' ? Math.max(500000, Math.ceil(targetCents * 2 / 100000) * 100000) : 0;
    const rate = { checking: 0.01, savings: 0.01, money_market: targetCents >= 2_500_000 ? 0.03 : targetCents >= 1_000_000 ? 0.02 : 0.01, cd: 0.03, credit_card: 21.99, loan: 9.49 }[type] || 0;
    const acct = db.prepare(`INSERT INTO accounts (user_id, type, number, credit_limit_cents, rate, card_last4, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, type, newAccountNumber(), limit, rate, hasCard ? randomDigits(4) : '', at(fromMs));
    const accountId = Number(acct.lastInsertRowid);
    let bal = 0;
    const ins = db.prepare(`INSERT INTO transactions (account_id, direction, amount_cents, balance_after, category, description, reference, created_by, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const r of rows) {
      bal += (r.dir === 'in' ? 1 : -1) * (credit ? -1 : 1) * r.cents;
      ins.run(accountId, r.dir, r.cents, bal, r.category, r.description, newReference(), actorId, at(r.time));
    }
    db.prepare('UPDATE accounts SET balance_cents = ? WHERE id = ?').run(bal, accountId);
    created.push({ type, accountId, transactions: rows.length, balance: bal / 100 });
  }
  return created;
}

module.exports = { generateHistory };
