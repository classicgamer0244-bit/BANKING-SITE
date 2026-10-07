// Content pages for the public site: products, help, legal, locations, articles and request forms.
(() => {
  SITE.init();
  const { t } = SITE;
  const { icon, esc, toast } = CB;
  const main = document.getElementById('pageMain');
  const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  const params = new URLSearchParams(location.search);
  const PHONE = '<a href="tel:+18005550199">1-800-555-0199</a>';
  const FRAUD_PHONE = '<a href="tel:+18005550123">1-800-555-0123</a>';

  // ---------------------------------------------------------------- branches
  const BRANCHES = [
    { id: 'nyc-midtown', name: 'Midtown Manhattan', addr: '1180 Avenue of the Americas', city: 'New York', state: 'NY', zip: '10036', phone: '212-555-0142', hours: 'Mon–Fri 9am–6pm · Sat 9am–1pm', tags: ['ATM', 'Drive-up', 'Notary', 'Safe deposit'] },
    { id: 'brooklyn', name: 'Brooklyn Heights', addr: '210 Court St', city: 'Brooklyn', state: 'NY', zip: '11201', phone: '718-555-0170', hours: 'Mon–Fri 9am–5pm · Sat 9am–1pm', tags: ['ATM', 'Notary'] },
    { id: 'charlotte', name: 'Charlotte Uptown', addr: '401 S Tryon St', city: 'Charlotte', state: 'NC', zip: '28202', phone: '704-555-0119', hours: 'Mon–Fri 9am–5pm', tags: ['ATM', 'Safe deposit', 'Mortgage specialist'] },
    { id: 'atlanta', name: 'Atlanta Midtown', addr: '1075 Peachtree St NE', city: 'Atlanta', state: 'GA', zip: '30309', phone: '404-555-0133', hours: 'Mon–Fri 9am–5pm · Sat 9am–12pm', tags: ['ATM', 'Drive-up'] },
    { id: 'miami', name: 'Miami Brickell', addr: '801 Brickell Ave', city: 'Miami', state: 'FL', zip: '33131', phone: '305-555-0188', hours: 'Mon–Fri 9am–5pm · Sat 10am–2pm', tags: ['ATM', 'Se habla español', 'Wealth advisor'] },
    { id: 'chicago', name: 'Chicago Loop', addr: '135 S LaSalle St', city: 'Chicago', state: 'IL', zip: '60603', phone: '312-555-0151', hours: 'Mon–Fri 8:30am–5:30pm', tags: ['ATM', 'Safe deposit', 'Small business banker'] },
    { id: 'dallas', name: 'Dallas Uptown', addr: '2500 McKinney Ave', city: 'Dallas', state: 'TX', zip: '75201', phone: '214-555-0166', hours: 'Mon–Fri 9am–5pm · Sat 9am–1pm', tags: ['ATM', 'Drive-up', 'Mortgage specialist'] },
    { id: 'houston', name: 'Houston Galleria', addr: '5085 Westheimer Rd', city: 'Houston', state: 'TX', zip: '77056', phone: '713-555-0124', hours: 'Mon–Fri 9am–6pm · Sat 9am–1pm', tags: ['ATM', 'Se habla español'] },
    { id: 'denver', name: 'Denver LoDo', addr: '1660 17th St', city: 'Denver', state: 'CO', zip: '80202', phone: '303-555-0109', hours: 'Mon–Fri 9am–5pm', tags: ['ATM', 'Notary'] },
    { id: 'la', name: 'Los Angeles Downtown', addr: '333 S Grand Ave', city: 'Los Angeles', state: 'CA', zip: '90071', phone: '213-555-0177', hours: 'Mon–Fri 9am–6pm · Sat 9am–2pm', tags: ['ATM', 'Drive-up', 'Se habla español', 'Wealth advisor'] },
    { id: 'sf', name: 'San Francisco Financial District', addr: '555 California St', city: 'San Francisco', state: 'CA', zip: '94104', phone: '415-555-0145', hours: 'Mon–Fri 9am–5pm', tags: ['ATM', 'Safe deposit', 'Small business banker'] },
    { id: 'seattle', name: 'Seattle Downtown', addr: '1201 3rd Ave', city: 'Seattle', state: 'WA', zip: '98101', phone: '206-555-0193', hours: 'Mon–Fri 9am–5pm · Sat 10am–2pm', tags: ['ATM', 'Notary'] },
  ];

  // ---------------------------------------------------------------- products
  const OPEN = (product, label) => [label || t('Open now', 'Abrir ahora'), `/p/open-account?product=${product}`];
  const APPLY = (product) => [t('Apply now', 'Solicitar ahora'), `/p/open-account?product=${product}`];
  const TALK = [t('Talk to a specialist', 'Hablar con un especialista'), '/p/appointment'];

  const PRODUCTS = {
    checking: {
      crumb: 'Banking', title: 'Advantage Checking', intro: 'Everyday banking with no monthly fee when you receive $500 or more in direct deposits each month.',
      rates: [['$0', 'Monthly fee with direct deposit'], ['$25', 'Minimum opening deposit'], ['40,000+', 'Fee-free ATMs nationwide']],
      cta: OPEN('checking'),
      features: [['card', 'Contactless debit card', 'Lock and unlock your card instantly from Online Banking.'], ['transfer', 'Instant transfers', 'Move money between CapitalBridge accounts and to other customers 24/7.'], ['shield', 'Overdraft protection', 'Link your savings to cover purchases and avoid declined payments.'], ['bill', 'Bill Pay', 'Pay utilities, rent and more from one place, on your schedule.'], ['download', 'Statements & alerts', 'Download statements any time and get alerts on every transaction.'], ['savings', 'Automatic savings', 'Round up purchases or schedule transfers to your savings account.']],
      details: [['Monthly maintenance fee', '$12, waived with $500+ direct deposits or a $1,500 daily balance'], ['Minimum opening deposit', '$25'], ['Overdraft fee', '$0 with linked-savings protection'], ['Out-of-network ATM fee', '$2.50 (we reimburse up to 4 per month)'], ['Paper statements', 'Free; online statements always available']],
      faq: [['How do I set up direct deposit?', 'After your account is open, sign in and find your account and routing numbers on the account page. Give them to your employer, or download a pre-filled direct deposit form.'], ['When can I use my debit card?', 'Your card arrives in 7–10 business days. You can add it to your mobile wallet as soon as your account is open.'], ['Can I open a joint account?', 'Yes. Start the application online and a banker will contact you to add a co-owner.']],
    },
    savings: {
      crumb: 'Banking', title: 'Advantage Savings', intro: 'A high-yield savings account with no minimum balance, so every dollar earns.',
      rates: [['4.35%', 'APY¹'], ['$0', 'Minimum balance'], ['$0', 'Monthly fee']],
      cta: OPEN('savings'),
      features: [['savings', 'Competitive rate', 'Earn 4.35% APY¹ on every balance tier.'], ['transfer', 'Automatic transfers', 'Schedule weekly or monthly transfers from checking.'], ['shield', 'Overdraft backup', 'Link to Advantage Checking to cover shortfalls.']],
      details: [['APY¹', '4.35%, variable'], ['Minimum opening deposit', '$0'], ['Withdrawals', 'Unlimited transfers to your own CapitalBridge accounts'], ['Interest', 'Compounded daily, credited monthly']],
      faq: [['Is the rate fixed?', 'No. The savings APY is variable and may change after the account is opened.'], ['How often is interest paid?', 'Interest compounds daily and is credited to your account monthly.']],
      also: [['CDs', '/p/cds', 'Lock in a guaranteed rate'], ['Money market', '/p/money-market', 'Higher rates for larger balances']],
    },
    cds: {
      crumb: 'Banking', title: 'Certificates of Deposit', intro: 'Lock in a guaranteed rate for a fixed term, from 3 months to 5 years.',
      rates: [['4.75%', '12-month APY¹'], ['$1,000', 'Minimum deposit'], ['3–60', 'Months term']],
      cta: OPEN('cd'),
      features: [['lock', 'Guaranteed rate', 'Your rate stays the same for the whole term.'], ['chart', 'Flexible terms', 'Choose from 3, 6, 12, 24, 36 or 60 months.'], ['savings', 'Automatic renewal', 'Renew at maturity, or move funds with no fee during the 10-day grace period.']],
      details: [['3-month', '4.00% APY'], ['6-month', '4.50% APY'], ['12-month', '4.75% APY'], ['24-month', '4.25% APY'], ['60-month', '3.90% APY'], ['Early withdrawal penalty', '90 days of interest (terms ≤ 12 months); 180 days (longer terms)']],
      faq: [['What happens at maturity?', 'Your CD renews automatically for the same term unless you tell us otherwise during the 10-day grace period.']],
    },
    'money-market': {
      crumb: 'Banking', title: 'Money Market', intro: 'Tiered rates that reward larger balances, with check-writing and easy access.',
      rates: [['4.50%', 'APY¹ on $25,000+'], ['$2,500', 'Minimum opening deposit'], ['$0', 'Fee with $10,000 balance']],
      cta: OPEN('money_market'),
      features: [['chart', 'Tiered rates', 'Earn more as your balance grows.'], ['accounts', 'Check-writing', 'Write checks directly from your account.'], ['transfer', 'Easy access', 'Transfer to checking instantly in Online Banking.']],
      details: [['Under $10,000', '3.75% APY'], ['$10,000–$24,999', '4.20% APY'], ['$25,000+', '4.50% APY'], ['Monthly fee', '$15, waived with a $10,000 daily balance']],
      faq: [],
    },
    'credit-cards': {
      crumb: 'Borrowing', title: 'Bridge Rewards Card', intro: 'Earn cash back on everything you buy, with no annual fee and a $200 online bonus.',
      rates: [['3%', 'Dining & travel'], ['2%', 'Grocery stores'], ['$0', 'Annual fee']],
      cta: APPLY('credit_card'),
      features: [['card', '$200 bonus', 'After you spend $1,000 in the first 90 days.'], ['shield', '$0 fraud liability', 'You’re not responsible for unauthorized charges.'], ['lock', 'Instant lock', 'Lock a misplaced card from Online Banking in seconds.']],
      details: [['Purchase APR', '19.99%–28.99% variable, based on creditworthiness'], ['Intro APR', '0% on purchases for 15 billing cycles'], ['Annual fee', '$0'], ['Foreign transaction fee', '$0'], ['Late payment fee', 'Up to $40']],
      faq: [['Will applying affect my credit score?', 'Applying results in a hard credit inquiry, which may affect your score.'], ['How do I redeem rewards?', 'Redeem cash back as a statement credit or deposit to a CapitalBridge account at any time.']],
    },
    'home-loans': {
      crumb: 'Borrowing', title: 'Mortgages', intro: 'Buy your home with fixed or adjustable rates and guidance from a dedicated lending specialist.',
      rates: [['6.12%', '30-yr fixed APR'], ['5.48%', '15-yr fixed APR'], ['3%', 'Down payment as low as']],
      cta: APPLY('mortgage'), cta2: TALK,
      features: [['house', 'Fixed & adjustable', '10, 15, 20 and 30-year terms, plus 5/6 and 7/6 ARMs.'], ['savings', 'Down payment help', 'Grants of up to $10,000 for eligible first-time buyers.'], ['user', 'Dedicated specialist', 'One point of contact from pre-approval to closing.']],
      details: [['30-year fixed', '6.00% rate · 6.12% APR'], ['15-year fixed', '5.35% rate · 5.48% APR'], ['7/6 ARM', '5.75% rate · 6.31% APR'], ['Rate lock', '60 days, free']],
      faq: [['How long does pre-approval take?', 'Most customers get a pre-approval decision within 1 business day once documents are uploaded.'], ['What documents do I need?', 'Two recent pay stubs, two years of W-2s or tax returns, and two months of bank statements.']],
      also: [['Refinance', '/p/refinance', 'Lower your rate or tap equity']],
    },
    refinance: {
      crumb: 'Borrowing', title: 'Refinance', intro: 'Lower your monthly payment, shorten your term or turn home equity into cash.',
      rates: [['6.05%', '30-yr refi APR'], ['5.41%', '15-yr refi APR'], ['$0', 'Application fee']],
      cta: APPLY('mortgage'), cta2: TALK,
      features: [['loan', 'Rate-and-term', 'Replace your current loan with a better rate or term.'], ['savings', 'Cash-out', 'Borrow against your equity for renovations or debt consolidation.'], ['download', 'Digital closing', 'Sign most documents online.']],
      details: [['Maximum loan-to-value', '80% for cash-out'], ['Closing costs', 'Typically 2–5% of loan amount'], ['Application fee', '$0']], faq: [],
    },
    'auto-loans': {
      crumb: 'Borrowing', title: 'Auto Loans', intro: 'Finance a new or used car, or refinance the loan you already have.',
      rates: [['5.49%', 'APR as low as'], ['84', 'Months max term'], ['0.25%', 'Customer rate discount']],
      cta: APPLY('auto_loan'),
      features: [['car', 'New, used & refinance', 'Buy from a dealer or private seller.'], ['check', 'Fast decisions', 'Most applications are decided within minutes.'], ['savings', 'Customer discount', '0.25% off when you pay automatically from Advantage Checking.']],
      details: [['New vehicle', 'From 5.49% APR'], ['Used vehicle', 'From 5.99% APR'], ['Refinance', 'From 5.79% APR'], ['Terms', '36–84 months'], ['Minimum amount', '$7,500']], faq: [],
    },
    'personal-loans': {
      crumb: 'Borrowing', title: 'Personal Loans', intro: 'Fixed-rate loans from $2,500 to $50,000 for debt consolidation, home projects and more.',
      rates: [['8.99%', 'APR as low as'], ['$50,000', 'Borrow up to'], ['$0', 'Origination fee']],
      cta: APPLY('personal_loan'),
      features: [['loan', 'Fixed payments', 'The same payment every month for the life of the loan.'], ['check', 'Funds in 1 day', 'Approved loans fund to your CapitalBridge account as soon as the next business day.'], ['shield', 'No prepayment penalty', 'Pay off early whenever you like.']],
      details: [['APR', '8.99%–24.99% based on credit'], ['Terms', '12–60 months'], ['Origination fee', '$0']], faq: [],
    },
    investing: {
      crumb: 'Investing', title: 'Bridge Invest', intro: 'Invest your way: trade stocks and ETFs yourself, or let a guided portfolio do the work.',
      rates: [['$0', 'Online stock & ETF trades'], ['0.35%', 'Guided portfolio fee'], ['$0', 'Account minimum']],
      cta: OPEN('investment'),
      features: [['chart', 'Self-directed', 'Commission-free online trades with real-time quotes and research.'], ['savings', 'Guided portfolios', 'Diversified portfolios that rebalance automatically.'], ['user', 'Advisor access', 'Talk to a licensed advisor when you want a second opinion.']],
      details: [['Online equity & ETF trades', '$0'], ['Options', '$0.65 per contract'], ['Guided portfolio annual fee', '0.35% of assets'], ['Account types', 'Individual, joint, IRA, Roth IRA']],
      faq: [['Are investments insured?', 'Investment products are not deposits, are not guaranteed by the bank and may lose value.']],
      also: [['Markets today', '/#markets', 'Live indices, stocks and crypto'], ['Retirement & IRAs', '/p/retirement', 'Save for the long term']],
    },
    'wealth-management': {
      crumb: 'Investing', title: 'Wealth Management', intro: 'Personalized advice for investable assets of $250,000 and above, from a dedicated advisor and team.',
      rates: [['1:1', 'Dedicated advisor'], ['$250K+', 'Investable assets'], ['360°', 'Planning']],
      cta: [t('Schedule a consultation', 'Programar una consulta'), '/p/appointment?topic=Wealth%20management'],
      features: [['user', 'Dedicated team', 'An advisor, a banker and a trust specialist working together.'], ['chart', 'Custom portfolios', 'Built around your goals, timeline and tax situation.'], ['shield', 'Estate & trust', 'Plan for the next generation with trust and estate services.']],
      details: [], faq: [],
    },
    retirement: {
      crumb: 'Investing', title: 'Retirement & IRAs', intro: 'Save for retirement with Traditional and Roth IRAs, rollovers and retirement planning tools.',
      rates: [['$7,000', '2026 IRA contribution limit'], ['$0', 'Account fees'], ['$0', 'Rollover fees']],
      cta: OPEN('investment', t('Open an IRA', 'Abrir una IRA')), cta2: TALK,
      features: [['savings', 'Traditional IRA', 'Contributions may be tax-deductible; taxes are paid on withdrawal.'], ['chart', 'Roth IRA', 'Contribute after tax and take qualified withdrawals tax-free.'], ['transfer', 'Easy rollovers', 'Consolidate old 401(k)s with help from our rollover team.']],
      details: [], faq: [],
    },
    'college-savings': {
      crumb: 'Investing', title: 'College Savings', intro: '529 plans and education savings accounts to help you plan for tuition.',
      rates: [['Tax-free', 'Qualified withdrawals'], ['$25', 'Minimum contribution'], ['$0', 'Enrollment fee']],
      cta: OPEN('investment', t('Start saving', 'Empezar a ahorrar')),
      features: [['grad', '529 plans', 'Tax-advantaged growth for qualified education expenses.'], ['savings', 'Automatic contributions', 'Contribute monthly from checking.'], ['users', 'Family gifting', 'Invite family to contribute for birthdays and holidays.']],
      details: [], faq: [],
    },
    'small-business': {
      crumb: 'Small Business', title: 'Small Business Banking', intro: 'Checking, credit and payment tools built for business owners, with a dedicated small business banker.',
      rates: [['$0', 'Monthly fee with $5K balance'], ['250', 'Free transactions / month'], ['1:1', 'Business banker']],
      cta: [t('Talk to a business banker', 'Hablar con un banquero'), '/p/appointment?topic=Small%20business'],
      features: [['accounts', 'Business checking', 'Fundamentals and Advanced tiers to match your volume.'], ['card', 'Business credit card', '1.5% cash back on all purchases, with employee cards.'], ['loan', 'Lines of credit', 'Revolving credit from $10,000 to $250,000.']],
      details: [['Business Fundamentals', '$16/mo, waived with $5,000 average balance'], ['Business Advanced', '$29.95/mo, waived with $15,000 average balance'], ['Cash deposits', '$7,500/month free']], faq: [],
    },
    'online-banking': {
      crumb: 'Banking', title: 'Online & Mobile Banking', intro: 'Manage every CapitalBridge account from your browser, anytime.',
      rates: [['24/7', 'Account access'], ['$0', 'Transfers between accounts'], ['Instant', 'Card lock']],
      cta: [t('Log in', 'Iniciar sesión'), '/login'], cta2: OPEN('checking', t('Open an account', 'Abrir una cuenta')),
      features: [['accounts', 'Balances & activity', 'See every account and transaction in one place.'], ['transfer', 'Transfers', 'Move money instantly between your accounts or to other customers.'], ['bill', 'Bill Pay', 'Save payees and pay bills in a few clicks.'], ['card', 'Card controls', 'Lock and unlock debit and credit cards instantly.'], ['mail', 'Secure messages', 'Message our team without picking up the phone.'], ['download', 'Statements', 'Download statements as CSV for your records.']],
      details: [], faq: [['I don’t have a User ID yet.', 'Your User ID is set up when your account is opened. If you’ve lost it, use the Forgot ID/Password form.']],
    },
  };

  // ---------------------------------------------------------------- articles
  const ARTICLES = {
    'habits-budgeting': ['Budgeting', 'The 50/30/20 rule, explained', `
      <p>The 50/30/20 rule is a simple way to divide your take-home pay so that essentials are covered, you can still enjoy life, and your savings grow every month.</p>
      <h3>How it works</h3><ul><li><b>50% needs:</b> rent or mortgage, utilities, groceries, insurance, minimum loan payments.</li><li><b>30% wants:</b> dining out, travel, subscriptions, hobbies.</li><li><b>20% savings and debt:</b> emergency fund, retirement, extra payments on debt.</li></ul>
      <h3>Putting it into practice</h3><p>Start with one month of spending from your account history and sort each transaction into one of the three buckets. If needs are well above 50%, look for one large fixed cost you can reduce rather than cutting many small things.</p>
      <p>Automate the 20%: schedule a transfer from checking to savings the day after payday so saving happens before spending.</p>`],
    'habits-credit': ['Credit', '5 factors that shape your credit score', `
      <ol><li><b>Payment history (about 35%).</b> Paying on time, every time, matters most. Set up autopay for at least the minimum.</li><li><b>Amounts owed (about 30%).</b> Keep balances under 30% of your limit; under 10% is even better.</li><li><b>Length of credit history (about 15%).</b> Keep older accounts open when you can.</li><li><b>New credit (about 10%).</b> Several applications in a short time can lower your score.</li><li><b>Credit mix (about 10%).</b> A mix of cards and installment loans helps a little.</li></ol>
      <p>Check your credit reports for free at least once a year and dispute any errors with the reporting bureau.</p>`],
    'habits-emergency-fund': ['Saving', 'How to build an emergency fund', `
      <p>An emergency fund is money set aside for unexpected costs like a car repair, medical bill or job loss, so you don’t have to rely on credit.</p>
      <h3>How much to save</h3><p>Aim for three to six months of essential expenses. If that feels out of reach, start with a first goal of $1,000.</p>
      <h3>Make it automatic</h3><ul><li>Keep it in a separate savings account so it isn’t mixed with everyday spending.</li><li>Schedule a recurring transfer, even $25 a week adds up to $1,300 a year.</li><li>Put windfalls like tax refunds or bonuses straight into the fund.</li></ul>`],
    'habits-scams': ['Security', 'Spot a scam before it costs you', `
      <p>Scammers often pretend to be your bank, a government agency or a family member in trouble. They create urgency so you act before you think.</p>
      <h3>Warning signs</h3><ul><li>Someone asks for your password, PIN or a one-time passcode. <b>CapitalBridge will never ask for these.</b></li><li>You’re told to move money to a “safe account” to protect it.</li><li>You’re asked to pay with gift cards, crypto or a wire to a stranger.</li><li>A message pressures you to act within minutes.</li></ul>
      <h3>What to do</h3><p>Hang up and call us at the number on the back of your card, ${PHONE}. If you think you’ve shared information, <a href="/p/fraud">report it right away</a> and lock your card in Online Banking.</p>`],
  };

  // ---------------------------------------------------------------- helpers
  const hero = (crumb, title, intro, extra = '') => `
    <section class="page-hero"><div class="container">
      <div class="crumbs"><a href="/">${t('Home', 'Inicio')}</a> › ${esc(crumb)}</div>
      <h1>${title}</h1>${intro ? `<p>${intro}</p>` : ''}${extra}
    </div></section>
    ${SITE.lang === 'es' ? `<div class="container" style="padding-top:18px"><div class="notice" style="margin:0">Parte de este contenido está disponible solo en inglés. Para atención en español llame al ${PHONE}.</div></div>` : ''}`;
  const faqHtml = (faq) => faq.length ? `<h2 style="margin-top:36px">${t('Frequently asked questions', 'Preguntas frecuentes')}</h2><div class="faq">${faq.map(([q, a]) => `<details><summary>${q}</summary><div>${a}</div></details>`).join('')}</div>` : '';
  const setTitle = (s) => { document.title = `${s.replace(/<[^>]+>/g, '')} | CapitalBridge Bank`; };

  function productPage(p) {
    setTitle(p.title);
    const ctas = [p.cta, p.cta2].filter(Boolean);
    main.innerHTML = hero(p.crumb, p.title, p.intro, `
      <div class="hero-cta">${ctas.map(([l, h], i) => `<a class="btn ${i ? 'btn-light' : 'btn-gold'}" href="${h}">${l}</a>`).join('')}</div>
      <div class="rate-strip">${p.rates.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`) + `
      <section class="content"><div class="container">
        <div class="feature-grid">${p.features.map(([i, h, d]) => `<div class="feature"><div class="ico">${icon(i, 22)}</div><h3>${h}</h3><p>${d}</p></div>`).join('')}</div>
        <div class="content-grid">
          <div>
            ${p.details.length ? `<h2>${t('Rates, fees & details', 'Tasas, cargos y detalles')}</h2><div class="card"><table class="data-table"><tbody>${p.details.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table></div>` : ''}
            ${faqHtml(p.faq)}
            ${p.also ? `<h2 style="margin-top:36px">${t('You may also like', 'También le puede interesar')}</h2><div class="link-grid">${p.also.map(([l, h, d]) => `<a class="link-card" href="${h}"><b>${l}</b><span>${d}</span></a>`).join('')}</div>` : ''}
          </div>
          <aside class="card side-card">
            <h3>${t('Ready to get started?', '¿Listo para comenzar?')}</h3>
            <p class="muted small">${t('Apply online in about 5 minutes. A banker will review your application and contact you within 1 business day.', 'Solicite en línea en unos 5 minutos. Un banquero le contactará en 1 día hábil.')}</p>
            ${ctas.map(([l, h], i) => `<a class="btn btn-block ${i ? 'btn-ghost' : ''}" href="${h}">${l}</a>`).join('')}
            <p class="small muted" style="margin-top:16px">${t('Prefer to talk?', '¿Prefiere hablar?')} ${PHONE}<br><a href="/p/locations">${t('Find a financial center', 'Buscar una sucursal')}</a></p>
          </aside>
        </div>
      </div></section>`;
  }

  function infoPage(crumb, title, intro, body, heroExtra = '') {
    setTitle(title);
    main.innerHTML = hero(crumb, title, intro, heroExtra) + `<section class="content"><div class="container">${body}</div></section>`;
  }

  // ---------------------------------------------------------------- request forms
  const F = {
    text: (name, label, opts = {}) => `<div class="field"><label for="f_${name}">${label}${opts.req ? ' <span class="req">*</span>' : ''}</label><input id="f_${name}" name="${name}" type="${opts.type || 'text'}" ${opts.req ? 'required' : ''} ${opts.attrs || ''} value="${esc(opts.value || '')}"></div>`,
    select: (name, label, options, opts = {}) => `<div class="field"><label for="f_${name}">${label}${opts.req ? ' <span class="req">*</span>' : ''}</label><select id="f_${name}" name="${name}" ${opts.req ? 'required' : ''}>
      ${opts.placeholder ? `<option value="">${opts.placeholder}</option>` : ''}${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${opts.value === v ? 'selected' : ''}>${l}</option>`; }).join('')}</select></div>`,
    area: (name, label, opts = {}) => `<div class="field"><label for="f_${name}">${label}${opts.req ? ' <span class="req">*</span>' : ''}</label><textarea id="f_${name}" name="${name}" ${opts.req ? 'required' : ''} maxlength="2000" placeholder="${esc(opts.placeholder || '')}">${esc(opts.value || '')}</textarea></div>`,
    contact: () => `<div class="grid-2">${F.text('name', t('Full name', 'Nombre completo'), { req: true, attrs: 'autocomplete="name"' })}${F.text('email', t('Email', 'Correo electrónico'), { type: 'email', req: true, attrs: 'autocomplete="email"' })}</div>
      <div class="grid-2">${F.text('phone', t('Phone', 'Teléfono'), { type: 'tel', attrs: 'autocomplete="tel"' })}${F.select('contact_method', t('Best way to reach you', 'Mejor forma de contactarle'), [['Email', t('Email', 'Correo')], ['Phone', t('Phone', 'Teléfono')], ['Text', t('Text message', 'Mensaje de texto')]])}</div>`,
  };

  function formPage({ crumb, title, intro, kind, sections, aside, success, prefill }) {
    setTitle(title);
    main.innerHTML = hero(crumb, title, intro) + `
      <section class="content"><div class="container"><div class="content-grid">
        <div class="form-card" id="formCard">
          <form id="reqForm" novalidate>
            <div class="form-error" id="formErr" role="alert"></div>
            ${sections}
            <p class="small muted" style="margin:8px 0 16px"><span class="req">*</span> ${t('Required field', 'Campo obligatorio')}</p>
            <button class="btn" type="submit" id="submitBtn">${t('Submit', 'Enviar')}</button>
          </form>
        </div>
        <aside class="card side-card">${aside}</aside>
      </div></div></section>`;
    const form = document.getElementById('reqForm');
    if (prefill) prefill(form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('formErr');
      err.classList.remove('show');
      const missing = [...form.querySelectorAll('[required]')].find((el) => (el.type === 'checkbox' ? !el.checked : !el.value.trim()));
      if (missing) {
        err.textContent = missing.type === 'checkbox' ? t('Please confirm the agreement to continue.', 'Confirme el acuerdo para continuar.') : t('Please complete all required fields.', 'Complete todos los campos obligatorios.');
        err.classList.add('show'); missing.focus(); return;
      }
      const btn = document.getElementById('submitBtn');
      btn.disabled = true; btn.textContent = t('Submitting…', 'Enviando…');
      try {
        const body = { kind };
        new FormData(form).forEach((v, k) => { body[k] = v; });
        const r = await CB.api('/api/public/requests', { body, allow401: true });
        document.getElementById('formCard').innerHTML = `<div class="success-panel" role="status">
          <div class="tick">${icon('check', 32)}</div>
          <h2 style="margin-bottom:6px">${success.title}</h2>
          <p class="muted">${t('Your reference number is', 'Su número de referencia es')}</p>
          <div class="ref-box">${esc(r.reference)}</div>
          <p class="muted" style="max-width:480px;margin:0 auto 20px">${success.text}</p>
          <div class="actions" style="justify-content:center"><a class="btn" href="/">${t('Back to home', 'Volver al inicio')}</a>${success.extra || ''}</div></div>`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast(t('Submitted · reference ', 'Enviado · referencia ') + r.reference, 'success');
      } catch (ex) {
        err.textContent = ex.message; err.classList.add('show');
        btn.disabled = false; btn.textContent = t('Submit', 'Enviar');
      }
    });
  }

  const helpAside = `<h3>${t('Need help now?', '¿Necesita ayuda ahora?')}</h3>
    <p class="small muted">${t('Customer service', 'Servicio al cliente')}: ${PHONE}<br>${t('Available 24/7', 'Disponible 24/7')}</p>
    <p class="small muted">${t('Fraud line', 'Línea de fraude')}: ${FRAUD_PHONE}</p>
    <p class="small muted">${icon('shield', 14)} ${t('We will never ask for your password, PIN or one-time passcode.', 'Nunca le pediremos su contraseña, PIN o código.')}</p>`;

  const PRODUCT_OPTIONS = [['checking', 'Advantage Checking'], ['savings', 'Advantage Savings'], ['money_market', 'Money Market'], ['cd', 'Certificate of Deposit (CD)'],
    ['credit_card', 'Bridge Rewards Credit Card'], ['mortgage', t('Mortgage / Refinance', 'Hipoteca / Refinanciamiento')], ['auto_loan', t('Auto loan', 'Préstamo de auto')], ['personal_loan', t('Personal loan', 'Préstamo personal')], ['investment', 'Bridge Invest / IRA']];
  const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
  const tomorrow = () => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10); };

  const FORMS = {
    'open-account': () => formPage({
      crumb: t('Open an account', 'Abrir una cuenta'), title: t('Open an account', 'Abrir una cuenta'), kind: 'application',
      intro: t('Tell us a little about yourself. It takes about 5 minutes, and a banker will contact you within 1 business day to verify your identity and finish opening your account.', 'Cuéntenos un poco sobre usted. Toma unos 5 minutos y un banquero le contactará en 1 día hábil para verificar su identidad.'),
      sections: `<h3>${t('1. Choose a product', '1. Elija un producto')}</h3>
        ${F.select('product', t('Product', 'Producto'), PRODUCT_OPTIONS, { req: true, placeholder: t('Select a product', 'Seleccione un producto'), value: params.get('product') || '' })}
        <div class="grid-2">${F.text('amount', t('Opening deposit or amount requested ($)', 'Depósito inicial o monto solicitado ($)'), { type: 'number', attrs: 'min="0" step="0.01"' })}${F.select('funding', t('How will you fund it?', '¿Cómo la financiará?'), ['Transfer from another bank', 'Cash or check at a financial center', 'Direct deposit', 'Not applicable (loan or card)'])}</div>
        <h3>${t('2. About you', '2. Sus datos')}</h3>
        ${F.contact()}
        <div class="grid-2">${F.text('dob', t('Date of birth', 'Fecha de nacimiento'), { type: 'date', req: true })}${F.select('citizenship', t('Citizenship', 'Ciudadanía'), ['U.S. citizen', 'Permanent resident', 'Other'])}</div>
        ${F.text('address', t('Street address', 'Dirección'), { req: true, attrs: 'autocomplete="street-address"' })}
        <div class="grid-3">${F.text('city', t('City', 'Ciudad'), { req: true, attrs: 'autocomplete="address-level2"' })}${F.select('state', t('State', 'Estado'), STATES, { req: true, placeholder: '—' })}${F.text('zip', t('ZIP code', 'Código postal'), { req: true, attrs: 'inputmode="numeric" maxlength="10" autocomplete="postal-code"' })}</div>
        <h3>${t('3. Employment', '3. Empleo')}</h3>
        <div class="grid-2">${F.select('employment', t('Employment status', 'Situación laboral'), ['Employed', 'Self-employed', 'Retired', 'Student', 'Not employed'])}${F.text('income', t('Annual income ($)', 'Ingreso anual ($)'), { type: 'number', attrs: 'min="0" step="1000"' })}</div>
        <p class="small muted">${t('We’ll ask for your Social Security number and a photo ID when we call to verify your identity, never by email.', 'Le pediremos su número de Seguro Social e identificación al llamarle, nunca por correo.')}</p>
        <label class="check small" style="margin:12px 0"><input type="checkbox" name="consent" value="yes" required> ${t('I agree to be contacted about this application and confirm the information is accurate.', 'Acepto ser contactado sobre esta solicitud y confirmo que la información es correcta.')}</label>`,
      aside: `<h3>${t('What happens next', 'Qué sigue')}</h3><ol class="steps" style="padding:0;margin:0 0 18px"><li>${t('Submit this application.', 'Envíe esta solicitud.')}</li><li>${t('A banker calls to verify your identity.', 'Un banquero le llama para verificar su identidad.')}</li><li>${t('Your account opens and you receive your Online Banking User ID.', 'Su cuenta se abre y recibe su ID de Banca en Línea.')}</li></ol>` + helpAside,
      success: { title: t('Application received', 'Solicitud recibida'), text: t('Thank you. A CapitalBridge banker will contact you within 1 business day to verify your identity and finish opening your account. Keep your reference number handy.', 'Gracias. Un banquero le contactará en 1 día hábil para verificar su identidad y completar la apertura. Conserve su número de referencia.') },
    }),
    contact: () => formPage({
      crumb: t('Help', 'Ayuda'), title: t('Contact us', 'Contáctenos'), kind: 'contact',
      intro: t('Send us a message and we’ll get back to you within 1 business day. Existing customers can also use secure messaging in Online Banking.', 'Envíenos un mensaje y le responderemos en 1 día hábil.'),
      sections: `${F.contact()}
        ${F.select('topic', t('Topic', 'Tema'), ['General question', 'Accounts & products', 'Online Banking help', 'Loans & mortgages', 'Investing', 'Careers', 'Investor relations', 'Media inquiry', 'Feedback or complaint'], { req: true, value: params.get('topic') || 'General question' })}
        ${F.text('subject', t('Subject', 'Asunto'), { value: params.get('subject') || '' })}
        ${F.area('message', t('How can we help?', '¿Cómo podemos ayudarle?'), { req: true, placeholder: t('Please don’t include passwords or full account numbers.', 'No incluya contraseñas ni números de cuenta completos.') })}`,
      aside: helpAside + `<p class="small"><a href="/p/help">${t('Browse FAQs', 'Ver preguntas frecuentes')}</a> · <a href="/p/locations">${t('Find a location', 'Buscar sucursal')}</a></p>`,
      success: { title: t('Message sent', 'Mensaje enviado'), text: t('Thanks for reaching out. Our team will reply within 1 business day using the contact details you provided.', 'Gracias por escribirnos. Le responderemos en 1 día hábil.') },
    }),
    appointment: () => formPage({
      crumb: t('Help', 'Ayuda'), title: t('Schedule an appointment', 'Programar una cita'), kind: 'appointment',
      intro: t('Meet with a banker or specialist at a financial center or by phone. We’ll confirm your time by email or phone.', 'Reúnase con un banquero en una sucursal o por teléfono. Confirmaremos su cita.'),
      sections: `${F.contact()}
        ${F.select('topic', t('What would you like to discuss?', '¿Qué desea tratar?'), ['Opening an account', 'Home loans & refinance', 'Auto or personal loan', 'Credit cards', 'Investing & retirement', 'Wealth management', 'Small business', 'Something else'], { req: true, value: params.get('topic') || '' , placeholder: '—' })}
        ${F.select('branch', t('Where', 'Dónde'), [['Phone appointment', t('By phone', 'Por teléfono')], ...BRANCHES.map((b) => [`${b.name} — ${b.city}, ${b.state}`, `${b.name} — ${b.city}, ${b.state}`])], { req: true, value: params.get('branch') || '' })}
        <div class="grid-2">${F.text('date', t('Preferred date', 'Fecha preferida'), { type: 'date', req: true, attrs: `min="${tomorrow()}"` })}${F.select('time', t('Preferred time', 'Hora preferida'), ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'], { req: true, placeholder: '—' })}</div>
        ${F.area('notes', t('Anything we should know? (optional)', '¿Algo que debamos saber? (opcional)'))}`,
      aside: helpAside,
      success: { title: t('Appointment requested', 'Cita solicitada'), text: t('We’ll confirm your appointment within 1 business day. If your preferred time isn’t available we’ll suggest the closest alternative.', 'Confirmaremos su cita en 1 día hábil.') },
    }),
    forgot: () => formPage({
      crumb: t('Help', 'Ayuda'), title: t('Forgot your ID or password?', '¿Olvidó su ID o contraseña?'), kind: 'password_reset',
      intro: t('For your security, a CapitalBridge specialist will verify your identity by phone and reset your access. This usually takes less than 1 business day.', 'Por su seguridad, un especialista verificará su identidad por teléfono y restablecerá su acceso.'),
      sections: `${F.select('issue', t('What do you need help with?', '¿Con qué necesita ayuda?'), ['I forgot my User ID', 'I forgot my password', 'My profile is locked or suspended', 'Other sign-in problem'], { req: true })}
        ${F.contact()}
        <div class="grid-2">${F.text('username', t('User ID (if you know it)', 'ID de usuario (si lo sabe)'), { attrs: 'autocomplete="username"' })}${F.text('dob', t('Date of birth', 'Fecha de nacimiento'), { type: 'date', req: true })}</div>
        <p class="small muted">${t('Never enter your old password here. We will never ask for it.', 'Nunca escriba su contraseña aquí. Nunca se la pediremos.')}</p>`,
      aside: helpAside,
      success: { title: t('Request received', 'Solicitud recibida'), text: t('A specialist will contact you to verify your identity and give you a temporary password. You’ll be asked to choose a new password when you sign in.', 'Un especialista le contactará para verificar su identidad y darle una contraseña temporal.'), extra: `<a class="btn btn-ghost" href="/login">${t('Go to log in', 'Ir a iniciar sesión')}</a>` },
    }),
    fraud: () => formPage({
      crumb: t('Help', 'Ayuda'), title: t('Report fraud', 'Reportar fraude'), kind: 'fraud',
      intro: t('If you think your account has been compromised, call us right away at 1-800-555-0123, available 24/7. You can also report it here and our fraud team will contact you.', 'Si cree que su cuenta fue comprometida, llámenos de inmediato al 1-800-555-0123.'),
      sections: `${F.select('fraud_type', t('What happened?', '¿Qué pasó?'), ['Transaction I don’t recognize', 'Suspicious email, text or call (phishing)', 'Someone accessed my Online Banking', 'Identity theft', 'Check fraud', 'Other'], { req: true, placeholder: '—' })}
        ${F.contact()}
        <div class="grid-3">${F.text('username', t('User ID (optional)', 'ID de usuario (opcional)'))}${F.text('date', t('Date it happened', 'Fecha'), { type: 'date' })}${F.text('amount', t('Amount involved ($)', 'Monto ($)'), { type: 'number', attrs: 'min="0" step="0.01"' })}</div>
        ${F.area('message', t('Describe what happened', 'Describa lo sucedido'), { req: true })}`,
      aside: `<h3>${t('Act fast', 'Actúe rápido')}</h3><ol class="steps" style="padding:0;margin:0 0 18px"><li>${t('Call our 24/7 fraud line:', 'Llame a la línea de fraude 24/7:')} ${FRAUD_PHONE}</li><li><a href="/app#/cards">${t('Lock your cards', 'Bloquee sus tarjetas')}</a> ${t('in Online Banking.', 'en Banca en Línea.')}</li><li><a href="/app#/profile">${t('Change your password', 'Cambie su contraseña')}</a>.</li></ol>` + helpAside,
      success: { title: t('Fraud report received', 'Reporte de fraude recibido'), text: t('Our fraud team prioritizes these reports and will contact you shortly. If money is at risk right now, call 1-800-555-0123.', 'Nuestro equipo de fraude le contactará en breve. Si su dinero está en riesgo ahora, llame al 1-800-555-0123.') },
    }),
    'lost-card': () => formPage({
      crumb: t('Help', 'Ayuda'), title: t('Lost or stolen card', 'Tarjeta perdida o robada'), kind: 'lost_card',
      intro: t('The fastest way to protect your money is to lock your card in Online Banking — it takes seconds. Then let us know here and we’ll send a replacement.', 'La forma más rápida de proteger su dinero es bloquear su tarjeta en Banca en Línea. Luego avísenos aquí.'),
      sections: `<div class="notice" style="margin-bottom:18px"><span>${icon('lock', 18)} ${t('Can you sign in? Lock your card instantly.', '¿Puede iniciar sesión? Bloquee su tarjeta al instante.')}</span><a class="btn btn-sm btn-gold" href="/app#/cards">${t('Lock my card', 'Bloquear mi tarjeta')}</a></div>
        ${F.select('status', t('Is the card lost or stolen?', '¿La tarjeta se perdió o la robaron?'), ['Lost', 'Stolen', 'Damaged', 'Never received'], { req: true })}
        ${F.contact()}
        <div class="grid-3">${F.select('card_type', t('Card type', 'Tipo de tarjeta'), ['Debit card', 'Credit card'])}${F.text('card_last4', t('Last 4 digits', 'Últimos 4 dígitos'), { attrs: 'inputmode="numeric" maxlength="4" pattern="\\d{4}"' })}${F.text('username', t('User ID (optional)', 'ID de usuario (opcional)'))}</div>
        ${F.select('ship_to', t('Send replacement to', 'Enviar reposición a'), ['Address on file', 'Pick up at a financial center'])}
        ${F.area('notes', t('Recent transactions you don’t recognize (optional)', 'Transacciones que no reconoce (opcional)'))}`,
      aside: helpAside,
      success: { title: t('Report received', 'Reporte recibido'), text: t('We’ll confirm your card is blocked and mail a replacement within 7–10 business days. If you see charges you don’t recognize, call 1-800-555-0123.', 'Confirmaremos el bloqueo y enviaremos una reposición en 7–10 días hábiles.'), extra: `<a class="btn btn-ghost" href="/app#/cards">${t('Manage cards', 'Administrar tarjetas')}</a>` },
    }),
  };

  // ---------------------------------------------------------------- other pages
  const HELP_FAQ = [
    ['How do I open an account?', 'Apply online in about 5 minutes using <a href="/p/open-account">Open an account</a>, visit a <a href="/p/locations">financial center</a>, or call ' + PHONE + '.'],
    ['I forgot my User ID or password.', 'Use the <a href="/p/forgot">Forgot ID/Password form</a>. A specialist will verify your identity and reset your access.'],
    ['How do I lock a lost card?', 'Sign in and go to <a href="/app#/cards">Cards</a>, then switch on “Lock card”. You can also <a href="/p/lost-card">report it here</a>.'],
    ['Where do I find my account and routing number?', 'Sign in and open any account. The full account number and our routing number (021000555) are shown at the top.'],
    ['How do I send money to another CapitalBridge customer?', 'In Online Banking, choose <a href="/app#/transfer">Transfer &amp; Send</a>, then “To another customer”, and enter their 12-digit account number.'],
    ['How do I download a statement?', 'Open an account in Online Banking and choose “Statement (CSV)”.'],
    ['How do I report a suspicious email or call?', 'Don’t reply or click any links. <a href="/p/fraud">Report it</a> or call ' + FRAUD_PHONE + '.'],
    ['How do I update my address or phone number?', 'Sign in and go to <a href="/app#/profile">Profile &amp; Security</a>.'],
  ];

  const LEGAL = {
    privacy: ['Privacy notice', `<div class="prose" style="max-width:820px">
      <p>This notice explains what personal information CapitalBridge Bank collects, how we use it, and the choices you have.</p>
      <h3>Information we collect</h3><ul><li>Information you give us, such as your name, address, date of birth and contact details when you apply or contact us.</li><li>Account and transaction information when you use our products.</li><li>Device and usage information when you use our website, subject to your <button type="button" class="link-btn" data-cookie-prefs>cookie preferences</button>.</li></ul>
      <h3>How we use it</h3><ul><li>To open and service your accounts and process transactions.</li><li>To verify your identity and protect you against fraud.</li><li>To meet legal and regulatory obligations.</li><li>With your permission, to tell you about products that may interest you.</li></ul>
      <h3>Sharing</h3><p>We don’t sell your personal information. We share it only with service providers who help us run our business, when required by law, or with your consent.</p>
      <h3>Your choices</h3><p>You can limit marketing and sharing on <a href="/p/privacy-choices">Your privacy choices</a>, and change cookie settings at any time.</p>
      <h3>Contact</h3><p>Questions about privacy? <a href="/p/contact?topic=General%20question&subject=Privacy">Contact us</a> or call ${PHONE}.</p></div>`],
    security: ['Security center', `<div class="feature-grid">
      <div class="feature"><div class="ico">${icon('shield', 22)}</div><h3>We’ll never ask for your password</h3><p>CapitalBridge will never call, text or email asking for your password, PIN or one-time passcode.</p></div>
      <div class="feature"><div class="ico">${icon('lock', 22)}</div><h3>Encrypted sessions</h3><p>Online Banking sessions are protected and automatically end after inactivity.</p></div>
      <div class="feature"><div class="ico">${icon('card', 22)}</div><h3>Card controls</h3><p>Lock a card instantly in <a href="/app#/cards">Online Banking</a> if it’s misplaced.</p></div></div>
      <div class="content-grid"><div class="prose"><h2>Protect yourself</h2><ul><li>Use a unique password for Online Banking that you don’t use anywhere else.</li><li>Always sign in by typing our address or using your bookmark, not from links in messages.</li><li>Review your transactions regularly and report anything unfamiliar.</li><li>Keep your computer and phone software up to date.</li></ul>
      <p>Read more: <a href="/p/habits-scams">How to spot a scam</a>.</p></div>
      <aside class="card side-card"><h3>Something wrong?</h3><a class="btn btn-block" href="/p/fraud">Report fraud</a><a class="btn btn-block btn-ghost" href="/p/lost-card">Lost or stolen card</a><a class="btn btn-block btn-ghost" href="/p/forgot">Forgot ID/Password</a><p class="small muted" style="margin-top:14px">24/7 fraud line: ${FRAUD_PHONE}</p></aside></div>`],
    terms: ['Terms of use', `<div class="prose" style="max-width:820px">
      <p>By using the CapitalBridge Bank website and Online Banking, you agree to these terms.</p>
      <h3>Use of the site</h3><p>You may use this site for lawful purposes only. You’re responsible for keeping your User ID and password confidential and for all activity under your profile.</p>
      <h3>Accuracy of information</h3><p>Rates, fees and product details are subject to change. Market data and news are provided by third parties for information only and may be delayed; they are not investment advice.</p>
      <h3>Third-party links</h3><p>News headlines and other links may take you to sites we don’t control. We aren’t responsible for their content.</p>
      <h3>Changes</h3><p>We may update these terms. Continued use of the site after changes means you accept them.</p>
      <h3>Questions</h3><p><a href="/p/contact">Contact us</a> or call ${PHONE}.</p></div>`],
    accessibility: ['Accessibility', `<div class="prose" style="max-width:820px">
      <p>CapitalBridge is committed to making our website and services usable by everyone, including people with disabilities.</p>
      <h3>What we do</h3><ul><li>Design to WCAG 2.1 AA guidelines, including keyboard navigation, text alternatives and sufficient color contrast.</li><li>Support screen readers and browser zoom up to 200%.</li><li>Respect reduced-motion settings — the market ticker stops scrolling when reduced motion is enabled.</li></ul>
      <h3>Other ways to bank</h3><p>Call ${PHONE} (TTY/relay services welcome), or <a href="/p/appointment">schedule an appointment</a> at a financial center.</p>
      <h3>Feedback</h3><p>Having trouble using our site? <a href="/p/contact?topic=Feedback%20or%20complaint&subject=Accessibility">Tell us</a> and we’ll help.</p></div>`],
  };

  const SITEMAP = [
    ['Banking', [['Checking', 'checking'], ['Savings', 'savings'], ['CDs', 'cds'], ['Money market', 'money-market'], ['Online & mobile banking', 'online-banking']]],
    ['Borrowing', [['Credit cards', 'credit-cards'], ['Home loans', 'home-loans'], ['Refinance', 'refinance'], ['Auto loans', 'auto-loans'], ['Personal loans', 'personal-loans']]],
    ['Investing', [['Bridge Invest', 'investing'], ['Wealth management', 'wealth-management'], ['Retirement & IRAs', 'retirement'], ['College savings', 'college-savings']]],
    ['Business', [['Small business banking', 'small-business']]],
    ['Help', [['Help & FAQs', 'help'], ['Contact us', 'contact'], ['Schedule an appointment', 'appointment'], ['Forgot ID/Password', 'forgot'], ['Report fraud', 'fraud'], ['Lost or stolen card', 'lost-card'], ['Locations', 'locations'], ['Security center', 'security']]],
    ['Better Money Habits', [['All articles', 'habits'], ['The 50/30/20 rule', 'habits-budgeting'], ['Credit score factors', 'habits-credit'], ['Emergency fund', 'habits-emergency-fund'], ['Spot a scam', 'habits-scams']]],
    ['About', [['Our company', 'about'], ['Careers', 'careers'], ['Newsroom', 'newsroom'], ['Investor relations', 'investors'], ['Community impact', 'community']]],
    ['Legal', [['Privacy', 'privacy'], ['Your privacy choices', 'privacy-choices'], ['Terms of use', 'terms'], ['Accessibility', 'accessibility']]],
  ];

  const JOBS = [['Relationship Banker', 'New York, NY', 'Branch banking'], ['Mortgage Loan Officer', 'Charlotte, NC', 'Lending'], ['Senior Software Engineer, Digital Banking', 'Remote (US)', 'Technology'],
    ['Fraud Operations Analyst', 'Dallas, TX', 'Risk & security'], ['Financial Advisor', 'Miami, FL', 'Wealth management'], ['Small Business Banker', 'Chicago, IL', 'Business banking']];

  const PAGES = {
    help: () => infoPage(t('Help', 'Ayuda'), t('How can we help?', '¿Cómo podemos ayudarle?'), t('Find answers fast, or reach our team 24/7.', 'Encuentre respuestas rápido o comuníquese con nosotros 24/7.'), `
      <div class="link-grid" style="margin-bottom:36px">
        ${[['/p/forgot', 'Forgot ID/Password', 'Reset your sign-in'], ['/p/lost-card', 'Lost or stolen card', 'Lock and replace your card'], ['/p/fraud', 'Report fraud', '24/7 fraud support'], ['/p/contact', 'Contact us', 'Send us a message'], ['/p/appointment', 'Schedule an appointment', 'Meet with a banker'], ['/p/locations', 'Find a location', 'Financial centers & ATMs']].map(([h, l, d]) => `<a class="link-card" href="${h}"><b>${l}</b><span>${d}</span></a>`).join('')}
      </div>
      <h2>Frequently asked questions</h2>
      <input type="search" id="faqSearch" placeholder="Search FAQs" style="max-width:420px;margin-bottom:16px">
      <div class="faq" id="faqList">${HELP_FAQ.map(([q, a]) => `<details><summary>${q}</summary><div>${a}</div></details>`).join('')}</div>
      <p class="muted" id="faqEmpty" style="display:none">No matching questions. <a href="/p/contact">Ask us directly</a>.</p>`),

    locations: () => {
      infoPage(t('Locations', 'Sucursales'), t('Find a financial center', 'Buscar una sucursal'), t('Search by city, state or ZIP code. All financial centers have 24/7 ATMs.', 'Busque por ciudad, estado o código postal.'), `
        <div class="content-grid"><div>
          <div class="toolbar"><input type="search" id="locSearch" placeholder="${t('City, state or ZIP', 'Ciudad, estado o código postal')}" value="${esc(params.get('q') || '')}" style="max-width:none;flex:1">
            <select id="locFilter" style="width:auto"><option value="">${t('All services', 'Todos los servicios')}</option>${[...new Set(BRANCHES.flatMap((b) => b.tags))].sort().map((s) => `<option>${s}</option>`).join('')}</select></div>
          <p class="small muted" id="locCount"></p>
          <div class="card" id="locList"></div></div>
          <aside class="card side-card"><h3>${t('Bank by phone', 'Banca por teléfono')}</h3><p class="small muted">${PHONE} · 24/7</p><a class="btn btn-block" href="/p/appointment">${t('Schedule an appointment', 'Programar una cita')}</a></aside></div>`);
      const render = () => {
        const q = document.getElementById('locSearch').value.trim().toLowerCase();
        const f = document.getElementById('locFilter').value;
        const list = BRANCHES.filter((b) => (!q || `${b.name} ${b.city} ${b.state} ${b.zip} ${b.addr}`.toLowerCase().includes(q)) && (!f || b.tags.includes(f)));
        document.getElementById('locCount').textContent = `${list.length} ${list.length === 1 ? t('location', 'sucursal') : t('locations', 'sucursales')}`;
        document.getElementById('locList').innerHTML = list.map((b) => `<div class="branch">
          <div><b>${b.name}</b><div class="small muted">${b.addr}, ${b.city}, ${b.state} ${b.zip}</div><div class="small">${b.hours}</div>
            <div class="tags">${b.tags.map((x) => `<span class="badge">${x}</span>`).join('')}</div></div>
          <div style="text-align:right"><a class="small" href="tel:${b.phone.replace(/-/g, '')}">${b.phone}</a><br>
            <a class="btn btn-sm btn-ghost" style="margin-top:8px" href="/p/appointment?branch=${encodeURIComponent(`${b.name} — ${b.city}, ${b.state}`)}">${t('Book here', 'Reservar aquí')}</a></div></div>`).join('') || `<div class="empty">${t('No financial centers match your search.', 'No hay sucursales que coincidan.')} <a href="/p/appointment">${t('Book a phone appointment', 'Reserve una cita por teléfono')}</a></div>`;
      };
      document.getElementById('locSearch').addEventListener('input', render);
      document.getElementById('locFilter').addEventListener('change', render);
      render();
    },

    habits: () => infoPage('Better Money Habits', 'Better Money Habits®', t('Free, practical guidance on budgeting, credit, saving and staying safe.', 'Orientación práctica y gratuita.'), `
      <div class="link-grid">${Object.entries(ARTICLES).map(([s, [k, title]]) => `<a class="link-card" href="/p/${s}"><span class="badge info" style="margin-bottom:8px">${k}</span><b>${title}</b><span>${t('Read article →', 'Leer artículo →')}</span></a>`).join('')}</div>`),

    'privacy-choices': () => {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem('cb_privacy_choices')) || {}; } catch { /* ignore */ }
      const row = (k, title, desc) => `<label class="pref-row"><div><b>${title}</b><div class="small muted">${desc}</div></div><input type="checkbox" name="${k}" ${saved[k] ? 'checked' : ''}></label>`;
      infoPage(t('Privacy', 'Privacidad'), t('Your privacy choices', 'Sus opciones de privacidad'), t('Control how CapitalBridge uses and shares your information for marketing.', 'Controle cómo usamos y compartimos su información.'), `
        <div class="content-grid"><form class="form-card" id="privForm">
          ${row('no_share', 'Do not sell or share my personal information', 'Opt out of sharing for cross-context behavioral advertising.')}
          ${row('no_affiliate', 'Limit sharing with affiliates', 'Don’t share my information with CapitalBridge affiliates for marketing.')}
          ${row('no_email', 'No marketing emails', 'Only send me service and account emails.')}
          ${row('no_calls', 'No marketing calls or texts', 'Don’t contact me by phone or text about offers.')}
          <button class="btn" style="margin-top:18px">${t('Save my choices', 'Guardar mis opciones')}</button>
          <p class="small muted" id="privSaved" style="margin-top:12px">${saved.saved ? t('Last saved ', 'Guardado ') + new Date(saved.saved).toLocaleString() : ''}</p></form>
          <aside class="card side-card"><h3>Cookies</h3><p class="small muted">${t('Manage analytics and marketing cookies separately.', 'Administre las cookies por separado.')}</p><button type="button" class="btn btn-block btn-ghost" data-cookie-prefs>${t('Cookie preferences', 'Preferencias de cookies')}</button><p class="small" style="margin-top:12px"><a href="/p/privacy">${t('Read our privacy notice', 'Leer aviso de privacidad')}</a></p></aside></div>`);
      document.getElementById('privForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = { saved: Date.now() };
        e.target.querySelectorAll('input[type=checkbox]').forEach((c) => { v[c.name] = c.checked; });
        try { localStorage.setItem('cb_privacy_choices', JSON.stringify(v)); } catch { /* ignore */ }
        document.getElementById('privSaved').textContent = t('Last saved ', 'Guardado ') + new Date(v.saved).toLocaleString();
        toast(t('Your privacy choices were saved', 'Se guardaron sus opciones de privacidad'), 'success');
      });
    },

    sitemap: () => infoPage(t('Site map', 'Mapa del sitio'), t('Site map', 'Mapa del sitio'), '', `
      <div class="link-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${SITEMAP.map(([h, links]) => `<div class="card"><h3 style="font-size:16px">${h}</h3><ul style="padding-left:18px;margin:0">${links.map(([l, s]) => `<li style="margin-bottom:6px"><a href="/p/${s}">${l}</a></li>`).join('')}</ul></div>`).join('')}
        <div class="card"><h3 style="font-size:16px">More</h3><ul style="padding-left:18px;margin:0"><li><a href="/">Home</a></li><li><a href="/#markets">Markets today</a></li><li><a href="/#news">News &amp; insights</a></li><li><a href="/login">Log in</a></li><li><a href="/p/open-account">Open an account</a></li></ul></div></div>`),

    about: () => {
      const years = new Date().getFullYear() - 1983;
      const TIMELINE = [
        ['1983', t('The first bridge', 'El primer puente'), t('CapitalBridge opens its doors on South Tryon Street in Charlotte with one promise: treat every customer’s money like it’s our own.', 'CapitalBridge abre sus puertas en Charlotte con una promesa: cuidar el dinero de cada cliente como si fuera nuestro.')],
        ['1991', t('Growing across the South', 'Crecimiento en el sur'), t('New financial centers open in Atlanta and Miami, bringing neighborhood banking and Spanish-speaking bankers to more families.', 'Nuevas sucursales en Atlanta y Miami, con banqueros que hablan español.')],
        ['1999', t('Banking goes online', 'La banca llega a internet'), t('Customers can check balances and move money from home for the first time.', 'Los clientes pueden revisar saldos y mover dinero desde casa por primera vez.')],
        ['2008', t('Steady when it mattered', 'Firmes cuando importaba'), t('While credit tightened nationwide, we kept lending to the small businesses in our communities.', 'Mientras el crédito se restringía, seguimos prestando a pequeñas empresas locales.')],
        ['2016', t('Coast to coast', 'De costa a costa'), t('Financial centers open in Chicago, Dallas, Houston and Denver, followed by Los Angeles, San Francisco and Seattle.', 'Nuevas sucursales en Chicago, Dallas, Houston, Denver, Los Ángeles, San Francisco y Seattle.')],
        ['2021', t('New York, New York', 'Nueva York'), t('We cross the Hudson with financial centers in Midtown Manhattan and Brooklyn Heights.', 'Llegamos a Midtown Manhattan y Brooklyn Heights.')],
        [String(new Date().getFullYear()), t('Banking for the next generation', 'Banca para la próxima generación'), t('Live markets, instant transfers, card controls and a 24/7 virtual assistant — the same promise from 1983, built for today.', 'Mercados en vivo, transferencias inmediatas y un asistente virtual 24/7: la misma promesa de 1983.')],
      ];
      const REGIONS = [['Northeast', ['NY']], ['Southeast', ['NC', 'GA', 'FL']], ['Central', ['IL', 'TX', 'CO']], ['West Coast', ['CA', 'WA']]];
      infoPage(t('About us', 'Quiénes somos'), t('Building bridges since 1983.', 'Construyendo puentes desde 1983.'),
        t(`For ${years} years, CapitalBridge has helped people and businesses bridge where they are today with where they want to be — one family, one small business, one neighborhood at a time.`,
          `Durante ${years} años, CapitalBridge ha ayudado a personas y empresas a llegar a donde quieren estar.`),
        `<div class="hero-cta"><a class="btn btn-gold" href="/p/open-account">${t('Bank with us', 'Abra su cuenta')}</a><a class="btn btn-light" href="#centers">${t('Find a financial center', 'Buscar una sucursal')}</a></div>
         <div class="rate-strip"><div><b>1983</b><span>${t('Established', 'Fundado')}</span></div><div><b>${years}+</b><span>${t('Years of service', 'Años de servicio')}</span></div>
           <div><b>${BRANCHES.length}</b><span>${t(`Financial centers in ${new Set(BRANCHES.map((b) => b.state)).size} states`, `Sucursales en ${new Set(BRANCHES.map((b) => b.state)).size} estados`)}</span></div><div><b>24/7</b><span>${t('Customer care', 'Atención al cliente')}</span></div></div>`
        + `
        <section class="about-story"><div>
          <span class="eyebrow" style="color:var(--gold-500)">${t('Our story', 'Nuestra historia')}</span>
          <h2>${t('A handshake in Charlotte. A promise kept for four decades.', 'Un apretón de manos en Charlotte. Una promesa cumplida por cuatro décadas.')}</h2>
          <p>${t('CapitalBridge began in 1983 with a single financial center and a simple idea: a bank should be the bridge between hard work and the life it’s meant to build. A paycheck becomes a first home. A savings account becomes a college degree. A small loan becomes a storefront with your name over the door.', 'CapitalBridge nació en 1983 con una sola sucursal y una idea sencilla: un banco debe ser el puente entre el trabajo duro y la vida que construye.')}</p>
          <p>${t('The tools have changed — from passbooks to Online Banking to live markets in your pocket — but the promise hasn’t. We still answer the phone. We still know our customers by name. And we still measure success by how far our customers go.', 'Las herramientas han cambiado, pero la promesa no: seguimos contestando el teléfono y midiendo nuestro éxito por lo lejos que llegan nuestros clientes.')}</p>
        </div>
        <figure class="about-quote">
          <blockquote>${t('“Every great journey needs a bridge. We’ve been building them since 1983.”', '“Todo gran viaje necesita un puente. Los construimos desde 1983.”')}</blockquote>
          <figcaption>${t('The CapitalBridge promise', 'La promesa CapitalBridge')}</figcaption>
        </figure></section>

        <h2 style="margin-top:48px">${t('Four decades of milestones', 'Cuatro décadas de logros')}</h2>
        <ol class="timeline">${TIMELINE.map(([y, h, d]) => `<li><span class="tl-year">${y}</span><div><h3>${h}</h3><p>${d}</p></div></li>`).join('')}</ol>

        <h2 style="margin-top:48px">${t('What we stand for', 'Lo que nos define')}</h2>
        <div class="feature-grid">
          <div class="feature"><div class="ico">${icon('users', 22)}</div><h3>${t('People first, since day one', 'Las personas primero')}</h3><p>${t('Real people answer the phone 24/7, and every customer can sit down with a banker.', 'Personas reales contestan 24/7 y cada cliente puede reunirse con un banquero.')}</p></div>
          <div class="feature"><div class="ico">${icon('shield', 22)}</div><h3>${t('Trust is our currency', 'La confianza es nuestra moneda')}</h3><p>${t('Clear fees, honest advice and security in everything we build. No hidden fees, no surprises.', 'Cargos claros, consejos honestos y seguridad. Sin sorpresas.')}</p></div>
          <div class="feature"><div class="ico">${icon('chart', 22)}</div><h3>${t('Tradition meets tomorrow', 'Tradición y futuro')}</h3><p>${t('Four decades of experience behind real-time tools, live markets and instant transfers.', 'Cuatro décadas de experiencia detrás de herramientas en tiempo real.')}</p></div>
          <div class="feature"><div class="ico">${icon('house', 22)}</div><h3>${t('Rooted in community', 'Raíces en la comunidad')}</h3><p>${t('From first homes to Main Street businesses, we invest where our customers live.', 'Invertimos donde viven nuestros clientes.')}</p></div>
          <div class="feature"><div class="ico">${icon('grad', 22)}</div><h3>${t('Smarter money habits', 'Mejores hábitos financieros')}</h3><p>${t('Free <a href="/p/habits">Better Money Habits</a> guidance for every stage of life.', 'Guía gratuita para cada etapa de la vida.')}</p></div>
          <div class="feature"><div class="ico">${icon('lock', 22)}</div><h3>${t('Built to last', 'Hecho para durar')}</h3><p>${t('We plan in decades, not quarters — so we’re here for every milestone ahead.', 'Planeamos en décadas, no en trimestres.')}</p></div>
        </div>

        <div class="sayings">
          <p>${t('Your money. Your future. Our bridge.', 'Su dinero. Su futuro. Nuestro puente.')}</p>
          <p>${t('Since 1983, the shortest distance between today and tomorrow.', 'Desde 1983, la distancia más corta entre hoy y mañana.')}</p>
          <p>${t('Strong foundations. Bright horizons.', 'Bases sólidas. Horizontes brillantes.')}</p>
        </div>

        <h2 id="centers" style="margin-top:48px">${t('Our financial centers', 'Nuestras sucursales')}</h2>
        <p class="muted">${t(`${BRANCHES.length} financial centers coast to coast, each with a 24/7 ATM and bankers ready to help.`, `${BRANCHES.length} sucursales de costa a costa, todas con cajero 24/7.`)}</p>
        <div class="region-grid">${REGIONS.map(([region, states]) => `<div class="card"><h3 style="font-size:16px;margin-bottom:12px">${region}</h3>
          ${BRANCHES.filter((b) => states.includes(b.state)).map((b) => `<div class="mini-branch"><b>${b.name}</b><span>${b.addr}, ${b.city}, ${b.state} ${b.zip}</span>
            <span><a href="tel:${b.phone.replace(/-/g, '')}">${b.phone}</a> · <a href="/p/appointment?branch=${encodeURIComponent(`${b.name} — ${b.city}, ${b.state}`)}">${t('Book a visit', 'Reservar visita')}</a></span></div>`).join('')}</div>`).join('')}</div>
        <p style="margin-top:16px"><a class="btn btn-ghost" href="/p/locations">${t('Search all locations & services', 'Buscar sucursales y servicios')}</a></p>

        <h2 style="margin-top:48px">${t('More about CapitalBridge', 'Más sobre CapitalBridge')}</h2>
        <div class="link-grid"><a class="link-card" href="/p/careers"><b>${t('Careers', 'Empleos')}</b><span>${t('Build the next 40 years with us', 'Construya los próximos 40 años con nosotros')}</span></a><a class="link-card" href="/p/newsroom"><b>${t('Newsroom', 'Sala de prensa')}</b><span>${t('Announcements & updates', 'Anuncios y novedades')}</span></a><a class="link-card" href="/p/investors"><b>${t('Investor relations', 'Inversionistas')}</b><span>${t('Reports & contacts', 'Informes y contactos')}</span></a><a class="link-card" href="/p/community"><b>${t('Community impact', 'Impacto comunitario')}</b><span>${t('How we give back', 'Cómo retribuimos')}</span></a></div>`);
      // The call buttons and the stats strip belong in the dark hero, above the story.
      main.querySelector('.page-hero .container').append(main.querySelector('.content .hero-cta'), main.querySelector('.content .rate-strip'));
    },

    careers: () => infoPage(t('About us', 'Quiénes somos'), t('Careers at CapitalBridge', 'Empleos en CapitalBridge'), t('Build a career helping people reach their financial goals.', 'Construya una carrera ayudando a otros.'), `
      <h2>Open positions</h2><div class="card"><div class="table-wrap"><table><thead><tr><th>Role</th><th>Location</th><th>Team</th><th></th></tr></thead><tbody>
      ${JOBS.map(([r, l, team]) => `<tr><td><b>${r}</b></td><td>${l}</td><td class="muted">${team}</td><td class="amt"><a class="btn btn-sm" href="/p/contact?topic=Careers&subject=${encodeURIComponent('Application: ' + r + ' (' + l + ')')}">Apply</a></td></tr>`).join('')}
      </tbody></table></div></div>
      <p class="muted" style="margin-top:16px">Don’t see the right role? <a href="/p/contact?topic=Careers&subject=General%20application">Send us your interest</a>.</p>`),

    newsroom: async () => {
      infoPage(t('About us', 'Quiénes somos'), t('Newsroom', 'Sala de prensa'), t('Announcements and updates from CapitalBridge.', 'Anuncios y novedades de CapitalBridge.'), `
        <div class="content-grid"><div class="card" id="annList"><div class="muted">Loading…</div></div>
        <aside class="card side-card"><h3>Media contacts</h3><p class="small muted">For press inquiries, contact our communications team.</p><a class="btn btn-block" href="/p/contact?topic=Media%20inquiry">Contact media relations</a><p class="small" style="margin-top:12px"><a href="/#news">Today’s market news →</a></p></aside></div>`);
      try {
        const { announcements } = await CB.api('/api/news', { allow401: true });
        document.getElementById('annList').innerHTML = announcements.map((a) => `<div class="msg open" style="cursor:default"><div class="small muted">${CB.date(a.created_at)}</div><div class="subj" style="font-size:17px">${esc(a.title)}</div><div class="body">${esc(a.body)}</div></div>`).join('') || '<div class="empty">No announcements yet.</div>';
      } catch { document.getElementById('annList').innerHTML = '<div class="empty">Announcements are unavailable right now.</div>'; }
    },

    investors: () => infoPage(t('About us', 'Quiénes somos'), t('Investor relations', 'Relación con inversionistas'), t('Information for shareholders, analysts and the investment community.', 'Información para accionistas y analistas.'), `
      <div class="content-grid"><div class="prose"><h2>Reports & filings</h2><p>Annual reports, quarterly results and governance documents are available on request from our investor relations team.</p>
        <h3>Shareholder services</h3><p>For questions about share ownership, dividends or transfers, contact investor relations using the form below.</p></div>
        <aside class="card side-card"><h3>Investor relations</h3><a class="btn btn-block" href="/p/contact?topic=Investor%20relations&subject=Request%20annual%20report">Request annual report</a><a class="btn btn-block btn-ghost" href="/p/contact?topic=Investor%20relations">Contact IR</a></aside></div>`),

    community: () => infoPage(t('About us', 'Quiénes somos'), t('Community impact', 'Impacto comunitario'), t('Investing in the neighborhoods we serve.', 'Invertimos en las comunidades que servimos.'), `
      <div class="feature-grid"><div class="feature"><div class="ico">${icon('house', 22)}</div><h3>Affordable housing</h3><p>Down-payment grants and partnerships that help first-time buyers become homeowners.</p></div>
        <div class="feature"><div class="ico">${icon('grad', 22)}</div><h3>Financial education</h3><p>Free <a href="/p/habits">Better Money Habits</a> resources and workshops at our financial centers.</p></div>
        <div class="feature"><div class="ico">${icon('users', 22)}</div><h3>Small business growth</h3><p>Lending and mentoring programs for local entrepreneurs.</p></div></div>
      <a class="btn" href="/p/contact?topic=General%20question&subject=Community%20partnership">Propose a partnership</a>`),
  };

  // ---------------------------------------------------------------- router
  if (PRODUCTS[slug]) productPage(PRODUCTS[slug]);
  else if (FORMS[slug]) FORMS[slug]();
  else if (ARTICLES[slug]) {
    const [k, title, body] = ARTICLES[slug];
    infoPage('Better Money Habits', title, '', `<div class="content-grid"><article class="prose card" style="padding:28px">${body}</article>
      <aside class="card side-card"><span class="badge info">${k}</span><h3 style="margin-top:10px">More articles</h3>${Object.entries(ARTICLES).filter(([s]) => s !== slug).map(([s, [, tt]]) => `<p class="small"><a href="/p/${s}">${tt}</a></p>`).join('')}<a class="btn btn-block btn-ghost" href="/p/habits">All articles</a></aside></div>`);
  } else if (LEGAL[slug]) infoPage(t('Legal', 'Legal'), LEGAL[slug][0], '', LEGAL[slug][1]);
  else if (PAGES[slug]) PAGES[slug]();
  else infoPage('404', t('Page not found', 'Página no encontrada'), t('Sorry, we couldn’t find that page.', 'No encontramos esa página.'), `<div class="actions"><a class="btn" href="/">${t('Go to home', 'Ir al inicio')}</a><a class="btn btn-ghost" href="/p/sitemap">${t('View site map', 'Ver mapa del sitio')}</a></div>`);

  // FAQ search on the help page
  const fs = document.getElementById('faqSearch');
  if (fs) fs.addEventListener('input', () => {
    const q = fs.value.toLowerCase();
    let shown = 0;
    document.querySelectorAll('#faqList details').forEach((d) => { const m = d.textContent.toLowerCase().includes(q); d.style.display = m ? '' : 'none'; if (m) shown++; });
    document.getElementById('faqEmpty').style.display = shown ? 'none' : '';
  });
})();
