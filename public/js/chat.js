// Customer care chat: floating widget on the public site and in Online Banking,
// or embedded full-page via CHAT.embed(element) (the portal's Customer care page).
const CHAT = (() => {
  const { esc, icon, toast } = CB;
  const t = (en, es) => (window.SITE ? SITE.t(en, es) : en);
  const signedIn = location.pathname.startsWith('/app');
  const TOKEN_KEY = 'cb_chat_token';
  let token = null;
  try { token = signedIn ? null : localStorage.getItem(TOKEN_KEY); } catch { /* storage unavailable */ }

  const state = { messages: [], lastId: 0, chat: null, open: false, sending: false, views: [], timer: null };

  async function call(path, body) {
    const headers = {};
    if (token) headers['x-chat-token'] = token;
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }

  // Escape, then turn site paths and web links into anchors.
  function format(text) {
    return esc(text)
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/(^|[\s(])(\/(?:p|app|login)[^\s<,;)]*[^\s<.,;:!?)])/g, '$1<a href="$2">$2</a>')
      .replace(/\n/g, '<br>');
  }
  const timeOf = (s) => new Date(String(s).replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  function bubble(m) {
    const who = m.sender === 'user' ? t('You', 'Usted')
      : m.sender === 'agent' ? `${esc(m.agent_name || 'CapitalBridge')} · ${t('Customer care', 'Atención al cliente')}`
      : t('Virtual assistant', 'Asistente virtual');
    return `<div class="cb-msg ${m.sender}"><div class="cb-who">${who}${m.created_at ? ` · ${timeOf(m.created_at)}` : ''}</div><div class="cb-bubble">${format(m.body)}</div></div>`;
  }

  const SUGGESTIONS = [
    t('What is the savings rate?', '¿Cuál es la tasa de ahorro?'), t('How do I open an account?', '¿Cómo abro una cuenta?'),
    t('I lost my debit card', 'Perdí mi tarjeta de débito'), t('Talk to a person', 'Hablar con una persona'),
  ];

  function statusNote() {
    const s = state.chat?.status;
    if (s === 'needs_human') return `<div class="cb-status">${icon('users', 16)} ${t('Waiting for a customer care specialist. They’ll reply in this chat — you can close this window and come back anytime.', 'Esperando a un especialista. Responderá en este chat.')}</div>`;
    if (s === 'human') return `<div class="cb-status live">${icon('user', 16)} ${t('You’re chatting with CapitalBridge customer care.', 'Está chateando con atención al cliente.')}</div>`;
    return '';
  }

  function contactForm() {
    if (!state.chat?.needs_contact) return '';
    return `<form class="cb-contact" data-contact>
      <b>${t('How can our team reach you?', '¿Cómo podemos contactarle?')}</b>
      <span class="small muted">${t('We’ll reply here, and also by email or phone if you leave the page.', 'Responderemos aquí y por correo o teléfono.')}</span>
      <input name="name" placeholder="${t('Your name', 'Su nombre')}" autocomplete="name">
      <input name="email" type="email" placeholder="${t('Email', 'Correo electrónico')}" autocomplete="email">
      <input name="phone" type="tel" placeholder="${t('Phone (optional)', 'Teléfono (opcional)')}" autocomplete="tel">
      <button class="btn btn-sm">${t('Save contact details', 'Guardar datos')}</button></form>`;
  }

  function renderLog(v) {
    const log = v.querySelector('.cb-log');
    const welcome = `<div class="cb-msg ai"><div class="cb-who">${t('Virtual assistant', 'Asistente virtual')}</div><div class="cb-bubble">${t('Hi! I’m the CapitalBridge virtual assistant. Ask me anything about accounts, rates, cards, loans or Online Banking. Want a human instead? Tap “Talk to a person” any time.', '¡Hola! Soy el asistente virtual de CapitalBridge. ¿Prefiere a una persona? Toque “Hablar con una persona” cuando quiera.')}</div></div>`;
    const chips = state.messages.length ? '' : `<div class="cb-chips">${SUGGESTIONS.map((s) => `<button type="button" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
    const typing = state.sending ? `<div class="cb-msg ai"><div class="cb-bubble cb-typing" aria-label="Typing"><span></span><span></span><span></span></div></div>` : '';
    log.innerHTML = welcome + chips + state.messages.map(bubble).join('') + typing + statusNote() + contactForm();
    log.scrollTop = log.scrollHeight;
  }

  function renderAll() {
    state.views.forEach(renderLog);
    state.views.forEach((v) => { const b = v.querySelector('[data-human]'); if (b) b.hidden = withHuman(); });
    const badge = document.querySelector('.cb-fab .cb-badge');
    if (badge) { const n = state.open ? 0 : state.chat?.unread || 0; badge.textContent = n; badge.hidden = !n; }
  }

  function absorb(data) {
    if (data.token) { token = data.token; try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ } }
    if (data.chat) state.chat = data.chat;
    for (const m of data.messages || []) {
      if (m.id > state.lastId) { state.messages.push(m); state.lastId = m.id; }
    }
  }

  const HUMAN_TEXT = () => t('I’d like to talk to a person, please.', 'Quisiera hablar con una persona, por favor.');
  const withHuman = () => ['needs_human', 'human'].includes(state.chat?.status);

  async function send(text, requestHuman = false) {
    text = text.trim();
    if (!text || state.sending) return;
    state.sending = true;
    const temp = { id: Infinity, sender: 'user', body: text, created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') };
    state.messages.push(temp);
    renderAll();
    try {
      const data = await call('/api/chat/messages', { text, request_human: requestHuman });
      state.messages = state.messages.filter((m) => m !== temp);
      absorb(data);
    } catch (e) {
      state.messages = state.messages.filter((m) => m !== temp);
      toast(e.message, 'error');
      state.views.forEach((v) => { const ta = v.querySelector('textarea'); if (ta && !ta.value) ta.value = text; });
    } finally {
      state.sending = false;
      renderAll();
      schedule();
    }
  }

  async function poll() {
    if (!signedIn && !token) return;
    try {
      const data = await call(`/api/chat?after=${state.lastId}${state.open ? '&read=1' : ''}`);
      const before = state.lastId;
      absorb(data);
      if (state.lastId !== before || data.chat) renderAll();
      if (!state.open && state.lastId !== before && state.messages.at(-1)?.sender === 'agent') toast(t('New reply from customer care', 'Nueva respuesta de atención al cliente'));
    } catch { /* offline: try again later */ }
  }
  function schedule() {
    clearTimeout(state.timer);
    state.timer = setTimeout(async () => { await poll(); schedule(); }, state.open ? 4000 : 20000);
  }

  function panelHtml(embedded) {
    return `<div class="cb-head"><div class="cb-avatar">${icon('mail', 18)}</div><div><b>${t('CapitalBridge Customer Care', 'Atención al cliente CapitalBridge')}</b>
        <div class="cb-sub">${t('Virtual assistant · specialists available 24/7', 'Asistente virtual · especialistas 24/7')}</div></div>
        ${embedded ? '' : `<button type="button" class="cb-close" aria-label="${t('Close chat', 'Cerrar chat')}">&times;</button>`}</div>
      <div class="cb-log" role="log" aria-live="polite"></div>
      <form class="cb-input" data-send>
        <textarea rows="1" maxlength="2000" placeholder="${t('Type your question…', 'Escriba su pregunta…')}" aria-label="${t('Message', 'Mensaje')}"></textarea>
        <button class="btn btn-sm" aria-label="${t('Send', 'Enviar')}">${t('Send', 'Enviar')}</button>
      </form>
      <div class="cb-foot"><span>${icon('shield', 12)} ${t('Never share your password, PIN or full card number.', 'Nunca comparta su contraseña, PIN o tarjeta.')}</span>
        <button type="button" class="cb-human" data-human>${icon('user', 13)} ${t('Talk to a person', 'Hablar con una persona')}</button></div>`;
  }

  function wire(root) {
    root.addEventListener('submit', async (e) => {
      if (e.target.matches('[data-send]')) {
        e.preventDefault();
        const ta = e.target.querySelector('textarea');
        const text = ta.value; ta.value = '';
        send(text);
      } else if (e.target.matches('[data-contact]')) {
        e.preventDefault();
        const f = e.target;
        try {
          absorb(await call('/api/chat/contact', { name: f.name.value, email: f.email.value, phone: f.phone.value }));
          toast(t('Thanks — our team will be in touch', 'Gracias, nuestro equipo le contactará'), 'success');
          renderAll();
        } catch (ex) { toast(ex.message, 'error'); }
      }
    });
    root.addEventListener('keydown', (e) => {
      if (e.target.matches('.cb-input textarea') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit(); }
    });
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-suggest]');
      if (s) send(s.dataset.suggest, s.dataset.suggest === SUGGESTIONS[3]);
      if (e.target.closest('[data-human]')) send(HUMAN_TEXT(), true);
    });
    state.views.push(root);
  }

  function setOpen(open) {
    state.open = open;
    document.querySelector('.cb-panel')?.classList.toggle('open', open);
    document.querySelector('.cb-fab')?.setAttribute('aria-expanded', open);
    if (open) { poll().then(renderAll); document.querySelector('.cb-panel textarea')?.focus(); }
    renderAll(); schedule();
  }

  function mountWidget() {
    const fab = document.createElement('button');
    fab.className = 'cb-fab';
    fab.setAttribute('aria-label', t('Chat with customer care', 'Chatear con atención al cliente'));
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = `${icon('mail', 22)}<span class="cb-fab-label">${t('Chat with us', 'Chatee con nosotros')}</span><span class="cb-badge" hidden>0</span>`;
    const panel = document.createElement('section');
    panel.className = 'cb-panel';
    panel.setAttribute('aria-label', 'Customer care chat');
    panel.innerHTML = panelHtml(false);
    document.body.append(fab, panel);
    fab.onclick = () => setOpen(!state.open);
    panel.querySelector('.cb-close').onclick = () => setOpen(false);
    wire(panel);
    renderAll();
    poll().then(() => { renderAll(); schedule(); });
  }

  function embed(el) {
    el.classList.add('cb-embedded');
    el.innerHTML = panelHtml(true);
    wire(el);
    state.open = true;
    renderAll();
    poll().then(() => { renderAll(); schedule(); });
    return () => { state.views = state.views.filter((v) => v !== el); state.open = false; schedule(); };
  }

  return { mountWidget, embed };
})();
CHAT.mountWidget();
