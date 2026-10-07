// Shared public-site chrome: header, footer, language toggle, cookie preferences.
const SITE = (() => {
  let lang = 'en';
  try { lang = localStorage.getItem('cb_lang') === 'es' ? 'es' : 'en'; } catch { /* storage unavailable */ }
  const t = (en, es) => (lang === 'es' && es ? es : en);
  const { icon, esc } = CB;

  const NAV = [
    ['/p/checking', 'Checking', 'Cuentas de cheques'],
    ['/p/savings', 'Savings & CDs', 'Ahorros y CD'],
    ['/p/credit-cards', 'Credit Cards', 'Tarjetas de crédito'],
    ['/p/home-loans', 'Home Loans', 'Préstamos hipotecarios'],
    ['/p/auto-loans', 'Auto Loans', 'Préstamos de auto'],
    ['/p/investing', 'Investing', 'Inversiones'],
    ['/p/habits', 'Better Money Habits', 'Mejores hábitos financieros'],
  ];

  function header() {
    const here = location.pathname;
    const seg = [['/', 'Personal', 'Personal'], ['/p/small-business', 'Small Business', 'Pequeñas empresas'],
      ['/p/wealth-management', 'Wealth Management', 'Gestión patrimonial'], ['/p/about', 'About Us', 'Quiénes somos']];
    return `
    <div class="topbar"><div class="container">
      <nav class="seg">${seg.map(([h, en, es]) => `<a href="${h}" class="${here === h ? 'on' : ''}">${t(en, es)}</a>`).join('')}</nav>
      <nav class="util"><a href="/p/locations">${t('Locations', 'Sucursales')}</a><a href="/p/contact">${t('Contact us', 'Contáctenos')}</a>
        <a href="/p/help">${t('Help', 'Ayuda')}</a><button type="button" class="link-btn lang-btn" data-lang>${lang === 'es' ? 'English' : 'En español'}</button></nav>
    </div></div>
    <header class="site-header"><div class="container">
      ${CB.logo('/')}
      <nav class="main-nav" id="mainNav">${NAV.map(([h, en, es]) => `<a href="${h}" class="${here === h ? 'on' : ''}">${t(en, es)}</a>`).join('')}
        <a href="/p/locations" class="mobile-only">${t('Locations', 'Sucursales')}</a><a href="/p/contact" class="mobile-only">${t('Contact us', 'Contáctenos')}</a>
        <button type="button" class="link-btn mobile-only" data-lang style="text-align:left;padding:8px 10px;font-weight:600">${lang === 'es' ? 'English' : 'En español'}</button></nav>
      <div class="header-actions">
        <button type="button" class="theme-btn" id="siteThemeBtn" aria-label="Toggle theme" title="Toggle theme"></button>
        <a class="btn btn-ghost btn-sm" href="/p/open-account">${t('Open an account', 'Abrir una cuenta')}</a>
        <a class="btn btn-sm" href="/login">${t('Log in', 'Iniciar sesión')}</a>
        <button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">${icon('menu', 24)}</button>
      </div>
    </div></header>`;
  }

  function footer() {
    const col = (title, links) => `<div><h5>${title}</h5><ul>${links.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>`;
    return `
    <footer class="site-footer"><div class="container">
      <div class="footer-top">
        <div class="footer-brand"><span style="color:#fff">${CB.logo('/')}</span>
          <p>${t('Connecting people to their financial goals with secure, modern banking.', 'Conectamos a las personas con sus metas financieras mediante una banca moderna y segura.')}</p></div>
        <div class="footer-cols">
          ${col(t('Banking', 'Banca'), [['/p/checking', t('Checking accounts', 'Cuentas de cheques')], ['/p/savings', t('Savings accounts', 'Cuentas de ahorro')], ['/p/cds', 'CDs'], ['/p/money-market', t('Money market', 'Mercado monetario')], ['/p/online-banking', t('Online & mobile banking', 'Banca en línea y móvil')]])}
          ${col(t('Borrowing', 'Préstamos'), [['/p/credit-cards', t('Credit cards', 'Tarjetas de crédito')], ['/p/home-loans', t('Home loans', 'Hipotecas')], ['/p/refinance', t('Refinance', 'Refinanciamiento')], ['/p/auto-loans', t('Auto loans', 'Préstamos de auto')], ['/p/personal-loans', t('Personal loans', 'Préstamos personales')]])}
          ${col(t('Investing', 'Inversiones'), [['/p/investing', 'Bridge Invest'], ['/#markets', t('Markets today', 'Mercados hoy')], ['/p/wealth-management', t('Wealth management', 'Gestión patrimonial')], ['/p/retirement', t('Retirement & IRAs', 'Jubilación e IRA')], ['/p/college-savings', t('College savings', 'Ahorro universitario')]])}
          ${col(t('Help & support', 'Ayuda y soporte'), [['/p/contact', t('Contact us', 'Contáctenos')], ['/p/appointment', t('Schedule an appointment', 'Programar una cita')], ['/p/fraud', t('Report fraud', 'Reportar fraude')], ['/p/lost-card', t('Lost or stolen card', 'Tarjeta perdida o robada')], ['/p/help', t('FAQs', 'Preguntas frecuentes')]])}
          ${col(t('About CapitalBridge', 'Sobre CapitalBridge'), [['/p/about', t('Our company', 'Nuestra empresa')], ['/p/careers', t('Careers', 'Empleos')], ['/p/newsroom', t('Newsroom', 'Sala de prensa')], ['/p/investors', t('Investor relations', 'Relación con inversionistas')], ['/p/community', t('Community impact', 'Impacto comunitario')]])}
        </div>
      </div>
      <div class="footer-contact">
        <div><span class="fc-ico">☎</span><div><b>${t('Customer service', 'Servicio al cliente')}</b><span><a href="tel:+18005550199">1-800-555-0199</a> · 24/7</span></div></div>
        <div><span class="fc-ico">⚑</span><div><b>${t('Report fraud', 'Reportar fraude')}</b><span><a href="tel:+18005550123">1-800-555-0123</a> · <a href="/p/fraud">${t('Report online', 'Reportar en línea')}</a></span></div></div>
        <div><span class="fc-ico">⌖</span><div><b>${t('Locations & ATMs', 'Sucursales y cajeros')}</b><span><a href="/p/locations">${t('Find a financial center', 'Buscar una sucursal')}</a></span></div></div>
        <div><span class="fc-ico">✉</span><div><b>${t('Secure messaging', 'Mensajes seguros')}</b><span><a href="/login">${t('Log in to send a message', 'Inicie sesión para escribirnos')}</a></span></div></div>
      </div>
      <nav class="footer-links" aria-label="Legal">
        <a href="/p/privacy">${t('Privacy', 'Privacidad')}</a><a href="/p/security">${t('Security', 'Seguridad')}</a><a href="/p/terms">${t('Terms of use', 'Términos de uso')}</a>
        <a href="/p/accessibility">${t('Accessibility', 'Accesibilidad')}</a><a href="/p/privacy-choices">${t('Your privacy choices', 'Sus opciones de privacidad')}</a>
        <button type="button" class="link-btn" data-cookie-prefs>${t('Cookie preferences', 'Preferencias de cookies')}</button><a href="/p/sitemap">${t('Site map', 'Mapa del sitio')}</a>
      </nav>
      <div class="footer-safe">
        <span class="fs-ico">${icon('shield', 22)}</span>
        <div><b>${t('We’ll never ask for your password. Ever.', 'Nunca le pediremos su contraseña.')}</b>
          <span>${t('CapitalBridge will never call, text or email you for your password, PIN or one-time passcode. If someone does, it isn’t us.', 'CapitalBridge nunca le pedirá su contraseña, PIN o código por teléfono, texto o correo. Si alguien lo hace, no somos nosotros.')}</span></div>
        <a class="btn btn-sm btn-gold" href="/p/fraud">${t('Report it', 'Repórtelo')}</a>
      </div>
      <div class="footer-legal">
        <div><h6>${t('Rates & fees', 'Tasas y cargos')}</h6>${t('¹ Annual Percentage Yield (APY) is accurate as of today and may change at any time. Fees could reduce earnings. Loan rates shown are Annual Percentage Rates (APR), subject to credit approval, and may vary.', '¹ El rendimiento porcentual anual (APY) es vigente a la fecha y puede cambiar en cualquier momento. Los cargos podrían reducir las ganancias. Las tasas de préstamos son APR, sujetas a aprobación de crédito.')}</div>
        <div><h6>${t('Investing & market data', 'Inversiones y mercados')}</h6>${t('Investment products are not deposits, are not guaranteed by the bank and may lose value. Market data comes from third parties, is for information only and may be delayed. Headlines link to their original publishers.', 'Los productos de inversión no son depósitos, no están garantizados por el banco y pueden perder valor. Los datos de mercado provienen de terceros, son solo informativos y pueden tener retraso.')}</div>
      </div>
      <div class="footer-bottom">
        <div class="fb-brand">${CB.logo('/')}<span class="fb-tag">${t('Bridging today and tomorrow — since 1983.', 'Uniendo el hoy con el mañana, desde 1983.')}</span></div>
        <div class="fb-copy">© 1983 CapitalBridge Bank. ${t('All rights reserved.', 'Todos los derechos reservados.')}</div>
        <button type="button" class="fb-top" data-top>${t('Back to top', 'Volver arriba')} ↑</button>
      </div>
    </div></footer>`;
  }

  // ---------- cookies ----------
  const COOKIE_KEY = 'cb_cookie_prefs';
  const readPrefs = () => { try { return JSON.parse(localStorage.getItem(COOKIE_KEY)); } catch { return null; } };
  const savePrefs = (p) => { try { localStorage.setItem(COOKIE_KEY, JSON.stringify({ ...p, saved: Date.now() })); } catch { /* ignore */ } };

  function cookieModal() {
    const p = readPrefs() || { analytics: false, marketing: false };
    const row = (name, title, desc, locked) => `<label class="pref-row"><div><b>${title}</b><div class="small muted">${desc}</div></div>
      <input type="checkbox" name="${name}" ${locked || p[name] ? 'checked' : ''} ${locked ? 'disabled' : ''}></label>`;
    CB.modal({
      title: t('Cookie preferences', 'Preferencias de cookies'), submitText: t('Save preferences', 'Guardar preferencias'),
      body: `<p class="muted">${t('Choose which cookies CapitalBridge may use. Strictly necessary cookies keep you signed in securely and can’t be turned off.', 'Elija qué cookies puede usar CapitalBridge. Las cookies estrictamente necesarias no se pueden desactivar.')}</p>
        ${row('necessary', t('Strictly necessary', 'Estrictamente necesarias'), t('Sign-in, security and fraud prevention.', 'Inicio de sesión, seguridad y prevención de fraude.'), true)}
        ${row('analytics', t('Performance & analytics', 'Rendimiento y análisis'), t('Helps us understand how the site is used so we can improve it.', 'Nos ayuda a entender cómo se usa el sitio.'))}
        ${row('marketing', t('Marketing', 'Mercadotecnia'), t('Personalized offers on this and other sites.', 'Ofertas personalizadas en este y otros sitios.'))}`,
      onSubmit: (f) => {
        savePrefs({ analytics: f.analytics.checked, marketing: f.marketing.checked });
        document.querySelector('.cookie-banner')?.remove();
        CB.toast(t('Your cookie preferences were saved', 'Se guardaron sus preferencias'), 'success');
      },
    });
  }

  function cookieBanner() {
    if (readPrefs()) return;
    const el = document.createElement('div');
    el.className = 'cookie-banner';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Cookie notice');
    el.innerHTML = `<p>${t('We use cookies to keep your session secure and, with your permission, to improve our site and show relevant offers.', 'Usamos cookies para proteger su sesión y, con su permiso, mejorar el sitio y mostrar ofertas relevantes.')}
      <a href="/p/privacy">${t('Privacy notice', 'Aviso de privacidad')}</a></p>
      <div class="actions"><button class="btn btn-sm btn-ghost" data-c="custom">${t('Customize', 'Personalizar')}</button>
      <button class="btn btn-sm btn-ghost" data-c="necessary">${t('Necessary only', 'Solo necesarias')}</button>
      <button class="btn btn-sm" data-c="all">${t('Accept all', 'Aceptar todas')}</button></div>`;
    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-c]')?.dataset.c;
      if (!c) return;
      if (c === 'custom') return cookieModal();
      savePrefs({ analytics: c === 'all', marketing: c === 'all' });
      el.remove();
      CB.toast(c === 'all' ? t('All cookies accepted', 'Se aceptaron todas las cookies') : t('Only necessary cookies will be used', 'Solo se usarán cookies necesarias'), 'success');
    });
    document.body.appendChild(el);
  }

  function setLang(l) {
    try { localStorage.setItem('cb_lang', l); } catch { /* ignore */ }
    location.reload();
  }

  function init() {
    document.documentElement.lang = lang;
    const h = document.getElementById('siteHeader'), f = document.getElementById('siteFooter');
    if (h) {
      h.innerHTML = header();
      CB.initThemeToggle('#siteThemeBtn');
    }
    if (f) f.innerHTML = footer();
    if (lang === 'es') document.querySelectorAll('[data-es]').forEach((el) => { el.innerHTML = el.dataset.es; });
    if (lang === 'es') document.querySelectorAll('[data-es-placeholder]').forEach((el) => { el.placeholder = el.dataset.esPlaceholder; });
    const btn = document.getElementById('menuBtn');
    if (btn) btn.onclick = () => { const open = document.getElementById('mainNav').classList.toggle('open'); btn.setAttribute('aria-expanded', open); };
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-lang]')) setLang(lang === 'es' ? 'en' : 'es');
      if (e.target.closest('[data-cookie-prefs]')) cookieModal();
      if (e.target.closest('[data-top]')) window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    cookieBanner();
  }

  return { lang, t, init, cookieModal, readPrefs, savePrefs, esc };
})();
