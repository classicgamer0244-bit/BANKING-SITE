# CapitalBridge Bank (demo)

A full-stack demo bank website: public marketing site with live markets and news, a customer online-banking portal, and an admin console.

> This is a fictional demonstration project. It is not a real bank and must not be used to hold or represent real money.

## Run it

Requires Node.js 22.5+ (uses the built-in `node:sqlite`).

```bash
npm install
npm start
```

Open http://localhost:3000.

On first start the server creates the single admin account and writes its login to `data/admin-credentials.txt`. Sign in at `/login`, change the password when prompted, then delete that file. To pick the admin login yourself, set `ADMIN_USERNAME` / `ADMIN_PASSWORD` before the first start.

## What's included

**Public site (`/`)**: hero with sign-in, products, a live scrolling ticker, market indices with intraday sparklines, stocks/crypto/currency tables (refresh every 30s), business/markets/personal-finance news, bank announcements, and a savings calculator.

**Content pages (`/p/<page>`)**: product pages with rates, fees and FAQs; locations finder; help center; security, privacy, terms and accessibility; careers, newsroom and more; Better Money Habits articles; a site map. Header and footer are shared (`public/js/site.js`), with an English/Spanish toggle and cookie preferences.

**Website request forms**: open an account, contact us, schedule an appointment, forgot ID/password, report fraud, lost or stolen card. Each submission gets a reference number and appears in the admin console under **Requests**.

**Customer care chat**: a chat button on every public page and in Online Banking. A Claude-powered virtual assistant (`chatbot.js`) answers from the bank's product and help information. It handles the whole conversation, including disputes, fraud and account questions, by explaining next steps and self-service options. It hands the chat to staff only when the customer asks for a person, either by typing it or with the "Talk to a person" button. After a hand-off the assistant stays quiet until staff hand the chat back. Signed-in customers keep one permanent thread under **Customer care chat** in Online Banking; guests keep theirs in the browser and can leave an email or phone. Staff read and answer every conversation in the admin console under **Customer care chat**. To turn the assistant on, copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Without a key, every question goes straight to a human.

**Customer portal (`/app`)**: account overview and net position, per-account transaction history with search and CSV statements, transfers between own accounts or to another customer by account number, bill pay with saved payees, debit/credit card lock, markets and news, secure messages to the bank, profile and password change.

**Admin console (`/admin`)**:
- Create customers (personal info, login, temporary password, first account)
- Open accounts: checking, savings, money market, CD, credit card, loan, investment
- Credit/debit any account (deposits, withdrawals, fees, interest, charges, payments), optionally allowing overdraft
- Reverse transactions; freeze, close, rename, change rates and credit limits; lock cards
- Edit customer profiles, reset passwords, suspend/reactivate or delete customers
- Work website requests: approve an account application straight into a new customer, track status and internal notes
- Message customers, read the customer inbox, publish homepage announcements
- Bank-wide dashboard and a full audit log

## Data sources

| Data | Source | Cache |
|---|---|---|
| Indices, stocks, commodities | Yahoo Finance chart endpoint (unofficial) | 60s |
| Crypto | CoinGecko public API | 45s |
| Currency rates | open.er-api.com | 30 min |
| News | Google News RSS | 10 min |

These are free endpoints with no API key. They may rate-limit or change. The server keeps serving the last good data when a fetch fails.

## Project layout

```
server.js        Express app: auth, customer and admin APIs, static pages
db.js            SQLite schema, password hashing, ledger posting
market.js        Market data and news fetching with caching
public/          HTML, CSS and JS for the site, portal and console
data/            SQLite database and first-run credentials (created at runtime)
```

Money is stored as integer cents. Every balance change goes through `postTransaction` inside a database transaction, so the ledger and balances stay consistent.
