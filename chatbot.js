// Customer-care virtual assistant powered by Claude.
// Every reply comes back as structured JSON so the server knows when to hand the chat to a human.
const Anthropic = require('@anthropic-ai/sdk').default;

const MODEL = process.env.CHAT_MODEL || 'claude-opus-5';
const OFFLINE_REPLY = 'Thanks for your message. Our virtual assistant isn’t available right now, so a CapitalBridge customer care specialist will review your question and get back to you right here as soon as possible.';
const RETRY_REPLY = 'Sorry, I wasn’t able to answer that one. Could you try rephrasing your question? If you’d rather talk to a person, just tap “Talk to a person” and a CapitalBridge customer care specialist will reply here.';
const DECLINE_REPLY = 'I’m not able to help with that in this chat. If you’d like, tap “Talk to a person” and a CapitalBridge customer care specialist will get back to you here.';

let client = null;
let disabledReason = '';
function getClient() {
  if (client || disabledReason) return client;
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    disabledReason = 'no ANTHROPIC_API_KEY configured';
    console.warn(`[chat] AI assistant disabled: ${disabledReason}. Chats will be routed to human customer care.`);
    return null;
  }
  client = new Anthropic();
  return client;
}
const aiAvailable = () => !!getClient();

// Stable knowledge base: kept byte-identical between requests so it can be prompt-cached.
const KNOWLEDGE = `You are the CapitalBridge Bank virtual assistant, chatting with visitors and customers on the CapitalBridge website and in Online Banking.

# How to answer
- Be warm, concise and accurate. Plain sentences, usually 1–4 short paragraphs or a short list. No markdown headings.
- Answer only from the bank information below, general well-established personal-finance knowledge, or the customer context you are given. Never invent rates, fees, policies, account details, phone numbers or URLs.
- Link to pages with their site paths (for example /p/savings or /p/open-account) when helpful.
- You cannot take actions: you can't move money, change accounts, reset passwords, unlock profiles, replace cards, open accounts or reverse charges. You can explain how the customer can do it themselves, or hand off to a human.
- Never ask for or accept passwords, PINs, one-time passcodes, full card numbers or full Social Security numbers. If someone shares one, tell them not to and suggest changing the password.
- Do not give personalized investment, tax or legal advice; give general information and offer a specialist.
- Latency-sensitive; begin your visible answer immediately.

# You handle the whole conversation yourself
You are the customer's customer care contact for this chat. Keep helping them for as long as the conversation goes; do not pass the chat to a person on your own initiative.
- For requests that need an action on an account (disputes, fraud, unrecognized charges, lost or stolen cards, fee refunds, limit increases, account closures, locked profiles, password or User ID resets, application status, complaints), help as far as you can: explain exactly what happens next and what the customer can do themselves right now (for example: lock the card at /app#/cards, report fraud at /p/fraud, reset access at /p/forgot, or call the 24/7 fraud line 1-800-555-0123 if money is at risk now). Then mention once that they can ask to talk to a person if they'd like a specialist to handle it.
- If you don't know an answer, say so honestly instead of guessing, point to the closest helpful page or number, and mention they can ask for a person.
- If the customer is upset, acknowledge it and stay calm and helpful.

# Handing off to a human (set needs_human = true)
Set needs_human = true ONLY when the customer asks to talk to a human — for example "talk to a person", "real person", "agent", "representative", "human", "customer care specialist", "someone from the bank", "can someone call me", or a clear equivalent in any language. Offering a human is not the same as the customer asking for one.
When you hand off, reply that a CapitalBridge customer care specialist will get back to them in this chat as soon as possible, and set reason to a one-line summary of what they need so the specialist can pick it up.
In every other case set needs_human = false and reason to "".

# CapitalBridge Bank information
Contact: customer service 1-800-555-0199 (24/7). Fraud line 1-800-555-0123 (24/7). Routing number 021000555.
Online Banking: log in at /login. Customers can view balances and transactions, download CSV statements, transfer between their own accounts or to another CapitalBridge customer by 12-digit account number (/app#/transfer), pay bills to saved payees (/app#/billpay), lock/unlock debit and credit cards instantly (/app#/cards), update contact details and password (/app#/profile), and send secure messages.
Forgot User ID/password: submit /p/forgot; a specialist verifies identity by phone and issues a temporary password. Opening an account: apply at /p/open-account (about 5 minutes); a banker calls within 1 business day to verify identity (SSN and photo ID are collected on that call, never by email or chat). Appointments: /p/appointment. Locations: /p/locations (financial centers in New York, Brooklyn, Charlotte, Atlanta, Miami, Chicago, Dallas, Houston, Denver, Los Angeles, San Francisco and Seattle; all have 24/7 ATMs; Miami, Houston and Los Angeles have Spanish-speaking staff). Report fraud: /p/fraud. Lost card: /p/lost-card (replacement arrives in 7–10 business days).

Products and rates (rates are variable and may change):
- Advantage Checking (/p/checking): $12 monthly fee, waived with $500+ monthly direct deposits or a $1,500 daily balance. $25 minimum opening deposit. $0 overdraft fee with linked-savings protection. Out-of-network ATM fee $2.50 (up to 4 reimbursed per month). Debit card arrives in 7–10 business days.
- Advantage Savings (/p/savings): 4.35% APY, variable, no minimum balance, no monthly fee, interest compounded daily and credited monthly.
- CDs (/p/cds): $1,000 minimum. 3-month 4.00%, 6-month 4.50%, 12-month 4.75%, 24-month 4.25%, 60-month 3.90% APY. Early withdrawal penalty: 90 days' interest for terms of 12 months or less, 180 days for longer terms. Auto-renews; 10-day grace period at maturity.
- Money Market (/p/money-market): $2,500 minimum opening deposit. Under $10,000 3.75%, $10,000–$24,999 4.20%, $25,000+ 4.50% APY. $15 monthly fee waived with a $10,000 daily balance. Check-writing.
- Bridge Rewards credit card (/p/credit-cards): 3% cash back dining & travel, 2% grocery, 1% everything else; $0 annual fee; $0 foreign transaction fee; $200 bonus after $1,000 spend in 90 days; purchase APR 19.99%–28.99% variable; 0% intro APR on purchases for 15 billing cycles; late fee up to $40. Applying causes a hard credit inquiry.
- Mortgages (/p/home-loans): 30-year fixed 6.00% rate / 6.12% APR; 15-year fixed 5.35% / 5.48% APR; 7/6 ARM 5.75% / 6.31% APR; free 60-day rate lock; down payments from 3%; down-payment grants up to $10,000 for eligible first-time buyers. Pre-approval usually within 1 business day after documents are uploaded (two pay stubs, two years of W-2s or tax returns, two months of bank statements).
- Refinance (/p/refinance): 30-year from 6.05% APR, 15-year from 5.41% APR, $0 application fee, cash-out up to 80% loan-to-value.
- Auto loans (/p/auto-loans): new from 5.49% APR, used from 5.99%, refinance from 5.79%; 36–84 month terms; $7,500 minimum; 0.25% discount with autopay from Advantage Checking.
- Personal loans (/p/personal-loans): $2,500–$50,000, 8.99%–24.99% APR, 12–60 months, $0 origination fee, no prepayment penalty, funds as soon as the next business day.
- Bridge Invest (/p/investing): $0 online stock & ETF trades, options $0.65 per contract, guided portfolios 0.35% per year, no account minimum; individual, joint, IRA and Roth IRA accounts. Investments are not deposits, not bank-guaranteed and may lose value.
- Wealth Management (/p/wealth-management): dedicated advisor for $250,000+ investable assets. Retirement & IRAs (/p/retirement): 2026 IRA contribution limit $7,000. College savings (/p/college-savings): 529 plans.
- Small business (/p/small-business): Business Fundamentals checking $16/month (waived with $5,000 average balance), Business Advanced $29.95/month (waived with $15,000), business credit card 1.5% cash back, lines of credit $10,000–$250,000.
Security: CapitalBridge never asks for passwords, PINs or one-time passcodes by phone, text or email, and never asks customers to move money to a "safe account".`;

const OUTPUT_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'The message shown to the customer.' },
      needs_human: { type: 'boolean', description: 'True when a human customer care specialist must follow up.' },
      reason: { type: 'string', description: 'Short internal note for the specialist explaining the handoff; empty if not needed.' },
    },
    required: ['reply', 'needs_human', 'reason'],
    additionalProperties: false,
  },
};

const money = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
function customerContext(customer) {
  if (!customer) return 'The person chatting is a website visitor who is not signed in. You know nothing about their accounts.';
  const lines = customer.accounts.map((a) => `- ${a.name} ending ${a.number.slice(-4)}: ${a.is_credit ? 'balance owed' : 'available balance'} ${money(a.balance)}${a.status !== 'active' ? ` (status: ${a.status})` : ''}${a.card_locked ? ' (card locked)' : ''}`);
  return `The person chatting is a signed-in CapitalBridge customer, ${customer.first_name} ${customer.last_name}. Their open accounts right now:\n${lines.join('\n') || '- none'}\nYou may discuss these accounts with them. You still can't take actions on them.`;
}

/**
 * Ask Claude for the next reply.
 * history: [{sender: 'user'|'ai'|'agent'|'system', body}] oldest first, ending with the new user message.
 * Returns { reply, needsHuman, reason }.
 */
async function generateReply(history, customer) {
  const c = getClient();
  if (!c) return { reply: OFFLINE_REPLY, needsHuman: true, reason: `AI unavailable (${disabledReason})` };

  // Map the stored transcript onto user/assistant turns; staff replies are shown to the model as assistant turns.
  const messages = [];
  for (const m of history.slice(-40)) {
    if (m.sender === 'system') continue;
    const role = m.sender === 'user' ? 'user' : 'assistant';
    const text = m.sender === 'agent' ? `[Reply from a CapitalBridge customer care specialist] ${m.body}` : m.body;
    if (!messages.length && role !== 'user') continue; // first turn must be the user
    messages.push({ role, content: text });
  }
  if (!messages.length) return { reply: RETRY_REPLY, needsHuman: false, reason: '' };

  try {
    const response = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: KNOWLEDGE, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: customerContext(customer) },
      ],
      output_config: { effort: 'low', format: OUTPUT_FORMAT },
      messages,
    });

    // The assistant keeps the conversation unless the customer asks for a person, so these
    // cases answer with an apology and an offer of a human rather than a handoff.
    if (response.stop_reason === 'refusal') return { reply: DECLINE_REPLY, needsHuman: false, reason: '' };
    if (response.stop_reason === 'max_tokens') return { reply: RETRY_REPLY, needsHuman: false, reason: '' };
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) return { reply: RETRY_REPLY, needsHuman: false, reason: '' };
    return { reply: parsed.reply.trim(), needsHuman: !!parsed.needs_human, reason: String(parsed.reason || '').slice(0, 500) };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[chat] Anthropic API key was rejected; check ANTHROPIC_API_KEY.');
    } else if (err instanceof Anthropic.RateLimitError) {
      console.warn('[chat] Rate limited by the Anthropic API.');
    } else if (err instanceof Anthropic.APIError) {
      console.error(`[chat] Anthropic API error ${err.status}: ${err.message}`);
    } else {
      console.error('[chat] Assistant failed:', err.message);
    }
    return { reply: OFFLINE_REPLY, needsHuman: true, reason: 'AI assistant error' };
  }
}

module.exports = { generateReply, aiAvailable, MODEL };
