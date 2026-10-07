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

// Monthly dates that drift a few days around baseDay and sometimes skip a month entirely.
function eachMonthLoose(fromMs, toMs, baseDay, { jitter = 3, skip = 0 } = {}) {
  return eachMonth(fromMs, toMs, 1)
    .map((first) => first + (Math.min(28, Math.max(1, baseDay + crypto.randomInt(-jitter, jitter + 1))) - 1) * DAY)
    .filter((t) => t >= fromMs && t <= toMs && Math.random() >= skip);
}
// A varied amount around a typical value; sometimes a round figure like a person would type.
const vary = (typical, spread = 0.35) => {
  const v = typical * rnd(1 - spread, 1 + spread);
  return Math.random() < 0.3 ? Math.max(5, Math.round(v / 25) * 25) : v;
};

/**
 * Build the event list for one account. Each event: {time, dir: 'in'|'out', cents, category, description}.
 * The first event is the opening entry; its amount is solved so the account ends at targetCents.
 * For credit accounts (card, loan) the "balance" is the amount owed: 'out' raises it, 'in' lowers it.
 */
// People customers send money to (and occasionally receive from), with everyday memos.
const FIRST = ['James', 'Maria', 'David', 'Aisha', 'Michael', 'Sofia', 'Daniel', 'Grace', 'Kevin', 'Olivia', 'Marcus', 'Priya', 'Carlos', 'Emily', 'Andre', 'Hannah',
  'Jamal', 'Chloe', 'Luis', 'Natalie', 'Tyler', 'Fatima', 'Ryan', 'Mei', 'Brandon', 'Zoe', 'Victor', 'Leah', 'Isaac', 'Jasmine'];
const LAST = 'ABCDGHJKLMNOPRSTW';
const MEMOS = ['dinner', 'rent share', 'birthday gift', 'groceries', 'concert tickets', 'utilities split', 'lunch', 'gas money', 'thanks!', 'game night',
  'carpool', 'babysitting', 'haircut', 'loan payback', 'trip deposit', '', '', ''];
const person = () => `${pick(FIRST)} ${LAST[crypto.randomInt(0, LAST.length)]}.`;

function planAccount(type, targetCents, fromMs, toMs, extra = 0, opts = {}) {
  const credit = type === 'credit_card' || type === 'loan';
  const ev = [];
  const months = Math.max(1, Math.round((toMs - fromMs) / (30 * DAY)));

  if (type === 'checking') {
    const employer = opts.employer || pick(EMPLOYERS);
    // Take-home pay per biweekly paycheck: ~75% of salary after taxes over 26 paydays.
    let pay = opts.salaryCents > 0 ? (opts.salaryCents / 100) * 0.75 / 26 : rnd(1400, 3200);
    // Money sent to people a few times a month, and now and then a friend pays them back.
    const rangeDays = Math.round((toMs - fromMs) / DAY);
    const sends = Math.max(1, Math.round(months * rnd(2, 5)));
    for (let i = 0; i < sends; i++) {
      const memo = pick(MEMOS);
      ev.push({ time: randomTime(fromMs + crypto.randomInt(0, rangeDays + 1) * DAY), dir: 'out', cents: cents(vary(rnd(15, 250), 0.6)), category: 'transfer',
        description: `Transfer to ${person()}${memo ? ` – ${memo}` : ''}` });
    }
    for (let i = 0; i < Math.round(sends * 0.25); i++) {
      const memo = pick(MEMOS);
      ev.push({ time: randomTime(fromMs + crypto.randomInt(0, rangeDays + 1) * DAY), dir: 'in', cents: cents(vary(rnd(15, 150), 0.6)), category: 'transfer',
        description: `Transfer from ${person()}${memo ? ` – ${memo}` : ''}` });
    }
    for (const t of eachDay(fromMs, toMs, 14, crypto.randomInt(1, 10))) {
      if (Math.random() < 0.04) pay *= rnd(1.02, 1.06); // occasional raise
      ev.push({ time: randomTime(t), dir: 'in', cents: cents(pay * rnd(0.93, 1.09)), category: 'payroll', description: `Direct deposit – ${employer} payroll` });
    }
    // A yearly bonus now and then.
    for (const t of eachMonthLoose(fromMs, toMs, 15, { jitter: 10 })) if (new Date(t).getUTCMonth() === 11 && Math.random() < 0.6)
      ev.push({ time: randomTime(t), dir: 'in', cents: cents(pay * rnd(0.5, 1.5)), category: 'payroll', description: `Direct deposit – ${employer} annual bonus` });
    // Rent holds for a 12-month lease, then goes up at renewal; paid within the first few days.
    let rent = rnd(900, 2200), leaseMonths = 0;
    for (const t of eachMonthLoose(fromMs, toMs, 2, { jitter: 1 })) {
      if (leaseMonths++ && leaseMonths % 12 === 1) rent *= rnd(1.02, 1.07);
      ev.push({ time: randomTime(t), dir: 'out', cents: cents(rent), category: 'rent', description: 'Rent payment – Parkside Apartments' });
    }
    for (const [cat, name, lo, hi] of BILLS) {
      const due = crypto.randomInt(3, 27);
      for (const t of eachMonthLoose(fromMs, toMs, due, { jitter: 2 })) ev.push({ time: randomTime(t), dir: 'out', cents: cents(rnd(lo, hi)), category: cat, description: `${name} – autopay` });
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
    const typical = rnd(100, 600);
    for (const t of eachMonthLoose(fromMs, toMs, crypto.randomInt(3, 25), { jitter: 6, skip: 0.25 }))
      ev.push({ time: randomTime(t), dir: 'in', cents: cents(vary(typical, 0.6)), category: 'transfer', description: pick(['Transfer from Bridge Checking', 'Transfer from Bridge Checking', 'Online transfer from checking', 'Mobile deposit']) });
    for (const t of eachMonth(fromMs, toMs, 28)) ev.push({ time: randomTime(t), dir: 'in', cents: 1, category: 'interest', description: 'Interest payment', interest: true });
    for (let i = 0; i < Math.round(months / 6); i++) ev.push({ time: randomTime(fromMs + crypto.randomInt(30, Math.max(31, Math.round((toMs - fromMs) / DAY))) * DAY), dir: 'out', cents: cents(rnd(200, 1500)), category: 'transfer', description: 'Transfer to Bridge Checking' });
  } else if (type === 'cd') {
    for (const t of eachMonth(fromMs, toMs, 28)) ev.push({ time: randomTime(t), dir: 'in', cents: 1, category: 'interest', description: 'Interest payment', interest: true });
  } else if (type === 'investment') {
    const typical = rnd(150, 900);
    for (const t of eachMonthLoose(fromMs, toMs, crypto.randomInt(5, 25), { jitter: 7, skip: 0.2 }))
      ev.push({ time: randomTime(t), dir: 'in', cents: cents(vary(typical, 0.5)), category: 'deposit', description: pick(['Contribution', 'Contribution', 'Transfer from Bridge Checking', 'Deposit']) });
    // Dividends a few times a year.
    for (const t of eachMonthLoose(fromMs, toMs, 20, { jitter: 5, skip: 0.7 })) ev.push({ time: randomTime(t), dir: 'in', cents: cents(rnd(4, 120)), category: 'interest', description: 'Dividend reinvestment' });
  } else if (type === 'credit_card') {
    const days = Math.round((toMs - fromMs) / DAY);
    const purchases = Math.round(days * rnd(0.3, 0.6));
    for (let i = 0; i < purchases; i++) {
      const [cat, names, lo, hi] = pick(SPEND);
      ev.push({ time: randomTime(fromMs + crypto.randomInt(1, days + 1) * DAY), dir: 'out', cents: cents(rnd(lo, hi)), category: cat, description: pick(names) });
    }
    for (const t of eachMonthLoose(fromMs, toMs, 22, { jitter: 4 })) ev.push({ time: randomTime(t), dir: 'in', cents: 0, category: 'payment', description: 'Payment – thank you', ccPayment: true });
  } else if (type === 'loan') {
    const payment = Math.max(50, Math.round(targetCents / 100 * rnd(0.02, 0.035)));
    for (const t of eachMonthLoose(fromMs, toMs, 5, { jitter: 3 })) if (t > fromMs + 20 * DAY) {
      ev.push({ time: randomTime(t), dir: 'in', cents: cents(payment), category: 'loan', description: 'Loan payment – autopay' });
      const extraDay = t + crypto.randomInt(3, 15) * DAY;
      if (Math.random() < 0.12 && extraDay <= toMs) ev.push({ time: randomTime(extraDay), dir: 'in', cents: cents(vary(payment, 0.8)), category: 'loan', description: 'Extra principal payment' });
    }
  }

  // Top-up activity so short date ranges still produce a full-looking history.
  const span = Math.max(0, Math.floor((toMs - fromMs) / DAY));
  const when = () => randomTime(fromMs + crypto.randomInt(0, span + 1) * DAY);
  for (let i = 0; i < extra; i++) {
    if (type === 'checking' || type === 'credit_card') {
      const [cat, names, lo, hi] = pick(SPEND);
      ev.push({ time: when(), dir: 'out', cents: cents(rnd(lo, hi)), category: cat, description: type === 'checking' ? `Debit card purchase – ${pick(names)}` : pick(names) });
    } else if (type === 'loan') {
      ev.push({ time: when(), dir: 'in', cents: cents(rnd(25, 250)), category: 'loan', description: 'Extra principal payment' });
    } else {
      const inbound = Math.random() < 0.6;
      ev.push({ time: when(), dir: inbound ? 'in' : 'out', cents: cents(rnd(20, 400)), category: 'transfer',
        description: inbound ? pick(['Transfer from Bridge Checking', 'Mobile deposit', 'Online transfer from checking']) : 'Transfer to Bridge Checking' });
    }
  }

  ev.sort((a, b) => a.time - b.time);
  return { credit, ev };
}

// Turn planned events into posted rows: solve the opening entry and fix balances so nothing goes negative.
function settle(type, targetCents, fromMs, toMs, plan, openMs = fromMs + 7 * 3600 * 1000) {
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
  for (const e of real) if (e.time <= openMs) e.time = openMs + crypto.randomInt(1, 60) * 60_000; // nothing before the account opens
  const netOf = (list) => list.reduce((s, e) => s + (e.interest ? 0 : sign(e) * e.cents), 0);
  const closing = toMs + 21.5 * 3600 * 1000; // after every regular event (8am–9pm) on the last day
  const span = Math.max(0, Math.floor((toMs - fromMs) / DAY));
  const someday = () => randomTime(fromMs + crypto.randomInt(0, span + 1) * DAY);

  // Everyday deposit accounts open with a small deposit (under $100) and reach the target through
  // their activity. Loans start with the principal and CDs with their lump sum, as they do in real life.
  if (!credit && type !== 'cd') {
    const opening = cents(rnd(25, 99.99));
    const need = targetCents - opening - netOf(real);
    if (need > 0) {
      // Short of the target: add incoming deposits spread over the range (bigger ones for bigger gaps).
      const chunk = need > 2_000_000 ? rnd(1_500_000, 6_000_000) : need > 300_000 ? rnd(200_000, 900_000) : rnd(30_000, 150_000);
      for (const [amt, desc] of splitInto(need, Math.min(60, Math.max(1, Math.ceil(need / chunk))), depositLabel)) real.push({ time: someday(), dir: 'in', cents: amt, category: 'deposit', description: desc });
    } else if (need < 0) {
      // Activity would overshoot: move the excess out in a few transfers along the way.
      for (const [amt] of splitInto(-need, Math.min(12, Math.max(1, Math.ceil(-need / 150_000))))) real.push({ time: someday(), dir: 'out', cents: amt, category: 'transfer', description: pick(['Transfer to external account', 'Online transfer to savings at another bank', 'Transfer to Bridge Checking']) });
    }
    // If spending ever runs ahead of deposits, bring money in just before the dip (as people do)
    // and send the same amount back out at the end, so the ending balance stays on target.
    let lifted = 0;
    for (let guard = 0; guard < 60; guard++) {
      real.sort((a, b) => a.time - b.time);
      // Find the first point the balance goes negative and the lowest it gets from there on.
      let bal = opening, dipAt = -1, worst = 0;
      real.forEach((e, i) => {
        bal += e.interest ? 0 : sign(e) * e.cents;
        if (bal < 0 && dipAt === -1) dipAt = i;
        if (dipAt !== -1) worst = Math.min(worst, bal);
      });
      if (dipAt === -1) break;
      const amt = -worst + cents(rnd(40, 400)); // covers the worst point, with a little to spare
      real.push({ time: Math.max(openMs + 60_000, real[dipAt].time - crypto.randomInt(1, 6) * 3600 * 1000), dir: 'in', cents: amt, category: 'transfer',
        description: pick(['Transfer from Bridge Savings', 'Mobile check deposit', 'Transfer from external account']) });
      lifted += amt;
    }
    if (lifted) real.push({ time: closing, dir: 'out', cents: lifted, category: 'transfer', description: 'Transfer to Bridge Savings' });
    return finishRows(type, credit, opening, real, targetCents, openMs, closing, sign);
  }

  // Opening entry = target − net activity, so the account ends exactly on target.
  let opening = targetCents - netOf(real);
  if (opening < 0) {
    // Activity would leave the balance above target. Keep all the activity, start from zero and
    // bring it back down at the end: a card payoff for credit accounts, a transfer out otherwise.
    const excess = -opening;
    opening = 0;
    real.push(credit
      ? { time: toMs + 21 * 3600 * 1000, dir: 'in', cents: excess, category: 'payment', description: 'Payment – thank you' }
      : { time: toMs + 21 * 3600 * 1000, dir: 'out', cents: excess, category: 'transfer', description: 'Transfer to external account' });
  }

  // Never let the balance go below zero along the way: lift the opening and give the lift back
  // with one final entry, so every earlier balance is higher and the ending balance is unchanged.
  real.sort((a, b) => a.time - b.time);
  let bal = opening, min = opening;
  for (const e of real) { bal += e.interest ? 0 : sign(e) * e.cents; min = Math.min(min, bal); }
  const floor = credit ? 0 : 2500; // CDs keep ~$25 headroom; owed balances just stay ≥ 0
  if (min < floor) {
    const lift = floor - min + cents(rnd(50, 300));
    opening += lift;
    real.push(credit
      ? { time: closing, dir: 'in', cents: lift, category: 'payment', description: 'Payment – thank you' }
      : { time: closing, dir: 'out', cents: lift, category: 'transfer', description: 'Transfer to external account' });
  }
  return finishRows(type, credit, opening, real, targetCents, openMs, closing, sign);
}

// Splits an amount (cents) into n random parts that add up exactly; label(part) names each one.
function splitInto(total, n, label = () => '') {
  const w = Array.from({ length: n }, () => rnd(0.4, 1.6));
  const sum = w.reduce((s, x) => s + x, 0);
  const parts = w.map((x) => Math.max(1, Math.floor(total * x / sum)));
  parts[n - 1] += total - parts.reduce((s, x) => s + x, 0);
  return parts.filter((p) => p > 0).map((p) => [p, label(p)]);
}
const depositLabel = (c) => (c >= 500_000
  ? pick(['Wire transfer – incoming', 'ACH credit – brokerage transfer', 'Transfer from external account', 'Wire transfer – incoming'])
  : pick(['Mobile check deposit', 'Transfer from external account', 'Cash deposit – Bridge financial center', 'Check deposit – Bridge financial center', 'Tax refund – IRS TREAS 310']));

// Post rows in date order after the opening entry; interest is a tiny amount based on the running balance.
function finishRows(type, credit, opening, real, targetCents, openMs, closing, sign) {
  const apy = { savings: 0.0001, money_market: 0.0002, cd: 0.0003 }[type] || 0;
  const rows = [{ time: openMs, dir: credit ? 'out' : 'in', cents: opening, category: credit ? (type === 'loan' ? 'loan' : 'adjustment') : 'deposit',
    description: type === 'loan' ? 'Loan disbursement – principal' : credit ? 'Balance transfer' : 'Opening deposit' }];
  // Nothing happens before the account exists (matters when accounts open hours apart on one day).
  for (const e of real) if (e.time <= openMs) e.time = openMs + crypto.randomInt(1, 60) * 60_000;
  real.sort((a, b) => a.time - b.time);
  let bal = opening;
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
const MIN_TRANSACTIONS = 40;
// Which account absorbs top-up activity when a customer would have fewer than MIN_TRANSACTIONS.
const TOP_UP_ORDER = ['checking', 'credit_card', 'savings', 'money_market', 'investment', 'loan', 'cd'];

function generateHistory(db, { userId, fromMs, toMs, holdings, employer = '', salaryCents = 0, newAccountNumber, randomDigits, newReference, actorId }) {
  const opts = { employer, salaryCents };
  // The main account (checking if there is one) opens on the From date; the others open on their
  // own later dates within the first part of the range, so accounts aren't all opened at once.
  const types = Object.keys(holdings).sort((a, b) => TOP_UP_ORDER.indexOf(a) - TOP_UP_ORDER.indexOf(b));
  const span = Math.max(0, Math.floor((toMs - fromMs) / DAY));
  // Each account gets its own opening day when the range has room (within its first ~40%);
  // otherwise accounts share a day but open a couple of hours apart.
  const maxOffset = Math.min(span, Math.max(types.length - 1, Math.floor(span * 0.4)));
  const freeDays = Array.from({ length: maxOffset }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  const openOf = {};
  types.forEach((t, i) => {
    if (i === 0) { openOf[t] = { dayMs: fromMs, timeMs: fromMs + 7 * 3600 * 1000 }; return; }
    const dayMs = freeDays.length ? fromMs + freeDays.pop() * DAY : fromMs + crypto.randomInt(0, span + 1) * DAY;
    const sameDayAsOthers = Object.values(openOf).filter((o) => o.dayMs === dayMs).length;
    openOf[t] = { dayMs, timeMs: dayMs + 7 * 3600 * 1000 + sameDayAsOthers * crypto.randomInt(45, 100) * 60_000 };
  });

  // Plan every account first so the customer's total can be checked before anything is saved.
  const plans = [];
  for (const type of types) {
    const targetCents = Math.round(Number(holdings[type]) * 100);
    if (!Number.isFinite(targetCents) || targetCents < 0) continue;
    const { dayMs, timeMs: openMs } = openOf[type];
    const plan = planAccount(type, targetCents, dayMs, toMs, 0, opts);
    plans.push({ type, targetCents, dayMs, openMs, plan, rows: settle(type, targetCents, dayMs, toMs, plan, openMs) });
  }
  const primary = plans[0];
  for (let tries = 0; primary && tries < 8; tries++) {
    const total = plans.reduce((s, p) => s + p.rows.length, 0);
    if (total >= MIN_TRANSACTIONS) break;
    const extra = (primary.extra || 0) + (MIN_TRANSACTIONS - total) + crypto.randomInt(2, 9);
    primary.extra = extra;
    primary.plan = planAccount(primary.type, primary.targetCents, primary.dayMs, toMs, extra, opts);
    primary.rows = settle(primary.type, primary.targetCents, primary.dayMs, toMs, primary.plan, primary.openMs);
  }

  const created = [];
  for (const { type, targetCents, openMs, plan, rows } of plans) {
    const hasCard = type === 'checking' || type === 'credit_card';
    const credit = plan.credit;
    const limit = type === 'credit_card' ? Math.max(500000, Math.ceil(targetCents * 2 / 100000) * 100000) : 0;
    const rate = { checking: 0.01, savings: 0.01, money_market: targetCents >= 2_500_000 ? 0.03 : targetCents >= 1_000_000 ? 0.02 : 0.01, cd: 0.03, credit_card: 21.99, loan: 9.49 }[type] || 0;
    const number = newAccountNumber(), cardLast4 = hasCard ? randomDigits(4) : '';
    const acct = db.prepare(`INSERT INTO accounts (user_id, type, number, credit_limit_cents, rate, card_last4, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, type, number, limit, rate, cardLast4, at(openMs));
    const accountId = Number(acct.lastInsertRowid);
    let bal = 0;
    const ins = db.prepare(`INSERT INTO transactions (account_id, direction, amount_cents, balance_after, category, description, reference, created_by, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const r of rows) {
      bal += (r.dir === 'in' ? 1 : -1) * (credit ? -1 : 1) * r.cents;
      ins.run(accountId, r.dir, r.cents, bal, r.category, r.description, newReference(), actorId, at(r.time));
    }
    db.prepare('UPDATE accounts SET balance_cents = ? WHERE id = ?').run(bal, accountId);
    created.push({ type, accountId, number, card_last4: cardLast4, openMs, transactions: rows.length, balance: bal / 100 });
  }
  return created;
}

// ---------- message history ----------
const ACCOUNT_NAME = { checking: 'Bridge Checking', savings: 'Bridge Savings', money_market: 'Money Market', cd: 'Certificate of Deposit',
  credit_card: 'Bridge Rewards Card', loan: 'Personal Loan', investment: 'Bridge Invest account' };
// [subject, question, answer, account type the topic needs (or null)]
const QUESTIONS = [
  ['Setting up direct deposit', 'Hi, how do I set up direct deposit with my employer?',
    'Thanks for reaching out! Sign in to Online Banking and open your checking account — your account number and our routing number (021000555) are shown at the top. Give both to your payroll department and deposits usually start within one or two pay cycles.', 'checking'],
  ['Question about a pending charge', 'I see a charge that is still pending from last weekend. When will it post?',
    'Good question. Pending card charges usually post within 1–3 business days once the merchant finalizes them. If it hasn’t posted after 5 business days, reply here and we’ll look into it with you.', null],
  ['Travel notice', 'I’m traveling overseas next month. Do I need to tell you before using my card?',
    'Thanks for letting us know — have a great trip! No travel notice is needed; our fraud monitoring recognizes travel automatically. Bridge Rewards Card has no foreign transaction fees. Keep the 24/7 number on the back of your card handy just in case.', 'credit_card'],
  ['Order checks', 'How can I order a new box of checks?',
    'We’ve placed an order for a new box of checks to the address on file. They usually arrive within 7–10 business days. Let us know if you need anything else!', 'checking'],
  ['Increase card limit', 'Is it possible to raise my credit card limit?',
    'We reviewed your account and you’re eligible for a credit line review. A specialist will follow up by phone within 2 business days with the details and next steps.', 'credit_card'],
  ['Paper statements', 'Can I switch back to paper statements?',
    'Done — your statements will arrive by mail starting next cycle, and they’ll also stay available in Online Banking.', null],
];

function generateMessages(db, { userId, firstName, fromMs, toMs, accounts, employer = '' }) {
  const msgs = [];
  const add = (time, subject, body, fromAdmin = 1) => { if (time >= fromMs && time <= toMs + DAY - 1) msgs.push({ time, subject, body, fromAdmin }); };
  const types = new Set(accounts.map((a) => a.type));
  const ending = (a) => `${ACCOUNT_NAME[a.type] || a.type} ending in ${a.number.slice(-4)}`;
  const t0 = fromMs + 9 * 3600 * 1000;
  const openDay = (a) => Math.floor((a.openMs ?? fromMs) / DAY);
  const firstDay = accounts.filter((a) => openDay(a) === Math.floor(fromMs / DAY));
  const openedBy = (time) => accounts.filter((a) => (a.openMs ?? fromMs) <= time);

  add(t0, 'Welcome to CapitalBridge Bank',
    `Hi ${firstName}, welcome to CapitalBridge! Your ${firstDay.length > 1 ? 'accounts are' : 'account is'} open and ready:\n${firstDay.map((a) => `• ${ending(a)}`).join('\n')}\n\nFor your security, never share your password, PIN or one-time passcode. CapitalBridge will never ask for them by phone, text or email.`);
  for (const a of accounts) {
    const opened = (a.openMs ?? fromMs) + 9 * 3600 * 1000;
    if (!firstDay.includes(a)) add(opened + crypto.randomInt(10, 90) * 60_000, `Your new ${ACCOUNT_NAME[a.type] || a.type} is open`,
      `Hi ${firstName}, your ${ending(a)} is now open and ready to use. You'll see it alongside your other CapitalBridge accounts in Online Banking.`);
    if (a.type === 'checking') add(randomTime(opened + crypto.randomInt(1, 4) * DAY), 'Your debit card is on its way',
      `Your Bridge debit card ending in ${a.card_last4} has shipped and should arrive within 7–10 business days. Once it arrives, you can start using it right away — and you can lock it any time from Cards in Online Banking.`);
    if (a.type === 'credit_card') add(randomTime(opened + crypto.randomInt(1, 5) * DAY), 'Your Bridge Rewards Card has shipped',
      `Good news, ${firstName} — your Bridge Rewards Card ending in ${a.card_last4} is in the mail. You'll earn 3% cash back on dining and travel, 2% at grocery stores and 1% on everything else.`);
    if (a.type === 'loan') add(opened + 3600 * 1000, 'Your personal loan has been funded',
      `Your personal loan (${ending(a)}) has been funded. Payments are set up on autopay around the 5th of each month. You can pay extra toward principal any time with no prepayment penalty.`);
  }
  add(randomTime(fromMs + crypto.randomInt(4, 9) * DAY), 'You’re enrolled in paperless statements',
    'Your statements will now be delivered securely in Online Banking. We’ll send you a message each time a new statement is ready.');
  if (types.has('checking')) add(randomTime(fromMs + crypto.randomInt(12, 25) * DAY), 'Direct deposit received',
    `Your first direct deposit${employer ? ` from ${employer}` : ''} has arrived in Bridge Checking. Thanks for banking with us!`);

  // Statement notices: monthly for the last two years, quarterly before that.
  const recent = toMs - 730 * DAY;
  for (const first of eachMonth(fromMs + 20 * DAY, toMs, 1)) {
    const d = new Date(first);
    const quarterly = first < recent;
    if (quarterly && d.getUTCMonth() % 3 !== 0) continue;
    const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const open = openedBy(first);
    if (!open.length) continue;
    add(randomTime(first + crypto.randomInt(1, 4) * DAY), `Your ${prev} statement${open.length > 1 ? 's are' : ' is'} ready`,
      `Your ${prev} statement${open.length > 1 ? 's are' : ' is'} now available in Online Banking:\n${open.map((a) => `• ${ending(a)}`).join('\n')}\n\nOpen any account and choose “Statement” to download.`);
  }
  // Security reminders every 5–8 months.
  for (let t = fromMs + crypto.randomInt(120, 200) * DAY; t <= toMs; t += crypto.randomInt(150, 240) * DAY) {
    add(randomTime(t), pick(['Security reminder: protect your account', 'Watch out for phone scams', 'Tips to keep your account safe']),
      'A quick reminder: CapitalBridge will never ask for your password, PIN or one-time passcode, and we’ll never ask you to move money to a “safe account.” If something feels off, hang up and call 1-800-555-0199.');
  }
  // A few conversations the customer started, answered by the bank within a day.
  const days = Math.floor((toMs - fromMs) / DAY);
  const count = Math.min(6, days < 60 ? (days > 7 ? 1 : 0) : crypto.randomInt(2, 5));
  const qs = QUESTIONS.filter((q) => !q[3] || types.has(q[3])).sort(() => Math.random() - 0.5).slice(0, count);
  for (const [subject, q, a] of qs) {
    const asked = randomTime(fromMs + crypto.randomInt(3, Math.max(4, days - 1)) * DAY);
    add(asked, subject, q, 0);
    add(asked + crypto.randomInt(2, 22) * 3600 * 1000, `Re: ${subject}`, a);
  }

  msgs.sort((x, y) => x.time - y.time);
  const recentCutoff = Date.now() - 3 * DAY;
  const ins = db.prepare('INSERT INTO messages (user_id, from_admin, subject, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (const m of msgs) ins.run(userId, m.fromAdmin, m.subject, m.body, m.fromAdmin && m.time > recentCutoff ? 0 : 1, at(m.time));
  return msgs.length;
}

module.exports = { generateHistory, generateMessages };
