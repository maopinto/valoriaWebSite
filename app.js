(() => {
  'use strict';
  const root = document.documentElement;
  const config = window.VALORIA_CONFIG || {};
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let manualReduction = false;
  try { manualReduction = localStorage.getItem('valoria-reduce-motion') === 'true'; } catch {}
  const motionButton = document.querySelector('.motion-toggle');
  const motionReduced = () => manualReduction || reducedQuery.matches;
  function applyMotionPreference() {
    root.classList.toggle('reduce-motion', motionReduced());
    motionButton.setAttribute('aria-pressed', String(motionReduced()));
    motionButton.textContent = motionReduced() ? 'תנועה מופחתת פעילה' : 'הפחתת תנועה';
    document.dispatchEvent(new CustomEvent('valoria:motion', { detail: { reduced: motionReduced() } }));
  }
  applyMotionPreference();
  reducedQuery.addEventListener('change', applyMotionPreference);
  motionButton.addEventListener('click', () => {
    manualReduction = !manualReduction;
    try { localStorage.setItem('valoria-reduce-motion', String(manualReduction)); } catch {}
    applyMotionPreference();
  });

  let revealObserver = null;
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -25px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    root.classList.add('js-ready');
  }

  const header = document.querySelector('.site-header');
  const sculpture = document.querySelector('[data-parallax]');
  const progress = document.querySelector('.scroll-progress');
  let scrollScheduled = false;
  function updateScroll() {
    const y = window.scrollY;
    const maxScroll = root.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${maxScroll > 0 ? y / maxScroll : 0})`;
    header.classList.toggle('scrolled', y > 35);
    if (!motionReduced() && window.innerWidth > 650 && y < 1100) {
      sculpture.style.transform = `translate3d(0,${y * 0.12}px,0)`;
    } else sculpture.style.transform = '';
    scrollScheduled = false;
  }
  function scheduleScroll() { if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateScroll); } }
  addEventListener('scroll', scheduleScroll, { passive: true });
  addEventListener('resize', scheduleScroll, { passive: true });
  updateScroll();

  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const inertTargets = [document.querySelector('main'), document.querySelector('footer'), document.querySelector('.floating-whatsapp')];
  function closeMenu(restoreFocus = false) {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'פתיחת תפריט');
    mobileNav.hidden = true;
    document.body.classList.remove('menu-open');
    inertTargets.forEach(el => { el.inert = false; });
    if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    if (menuButton.getAttribute('aria-expanded') === 'true') { closeMenu(true); return; }
    mobileNav.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'סגירת תפריט');
    document.body.classList.add('menu-open');
    inertTargets.forEach(el => { el.inert = true; });
    mobileNav.querySelector('a').focus();
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (mobileNav.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
    if (event.key === 'Tab') {
      const targets = [...header.querySelectorAll('a, button'), ...mobileNav.querySelectorAll('a')].filter(el => el.getClientRects().length);
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  matchMedia('(min-width: 651px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  // Internal tabs: every in-page link (#work, #contact, ...) shows only its panel instead of scrolling.
  const panels = [...document.querySelectorAll('main [data-tab]')];
  const tabNames = new Set(panels.map(panel => panel.dataset.tab));
  const navLinks = [...document.querySelectorAll('.brand, .desktop-nav a, .mobile-nav a, .nav-contact')];
  const tabFromHash = hash => {
    const name = decodeURIComponent(String(hash || '').replace(/^#/, ''));
    return tabNames.has(name) ? name : 'home';
  };

  // A pill that glides under the active (or hovered) item of the desktop menu.
  const desktopNav = document.querySelector('.desktop-nav');
  const indicator = document.createElement('span');
  indicator.className = 'nav-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  desktopNav.prepend(indicator);
  let indicatorPlaced = false;
  function moveIndicator(link) {
    if (!link || !link.getClientRects().length) { indicator.style.opacity = '0'; return; }
    const navBox = desktopNav.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    if (!indicatorPlaced) indicator.style.transition = 'none';
    indicator.style.width = `${box.width}px`;
    indicator.style.transform = `translateX(${box.left - navBox.left}px)`;
    indicator.style.opacity = '1';
    if (!indicatorPlaced) { void indicator.offsetWidth; indicator.style.transition = ''; indicatorPlaced = true; }
  }
  const activeNavLink = () => desktopNav.querySelector('a.active');
  desktopNav.addEventListener('pointerover', event => { const link = event.target.closest('a'); if (link) moveIndicator(link); });
  desktopNav.addEventListener('pointerleave', () => moveIndicator(activeNavLink()));
  addEventListener('resize', () => moveIndicator(activeNavLink()), { passive: true });
  if (document.fonts) document.fonts.ready.then(() => moveIndicator(activeNavLink()));

  // Each chapter gets its own document title and a level-one heading for assistive tech.
  const homeTitle = document.title;
  const tabTitle = document.querySelector('.tab-title');
  const tabLabels = {};
  document.querySelectorAll('.desktop-nav a, .mobile-nav a').forEach(link => {
    const name = link.hash.slice(1);
    const label = [...link.childNodes].filter(node => !(node.nodeType === 1 && node.getAttribute('aria-hidden') === 'true')).map(node => node.textContent).join('').trim();
    if (name && label && !tabLabels[name]) tabLabels[name] = label;
  });

  let currentTab = null;
  function focusTab(name) {
    const start = panels.find(panel => panel.dataset.tab === name && panel.hasAttribute('data-tab-start'));
    const heading = start && start.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  }
  function applyTab(name, focus) {
    panels.forEach(panel => {
      const active = panel.dataset.tab === name;
      panel.hidden = !active;
      panel.classList.remove('tab-enter');
      // Replay the entrance animations every time a chapter is opened.
      if (active && revealObserver) panel.querySelectorAll('.reveal').forEach(el => { el.classList.remove('is-visible'); revealObserver.observe(el); });
    });
    navLinks.forEach(link => {
      const active = link.hash === `#${name}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    root.dataset.tab = name;
    currentTab = name;
    const label = tabLabels[name];
    document.title = name === 'home' || !label ? homeTitle : `${label} | Valoria`;
    if (tabTitle) { tabTitle.textContent = label ? `${label} — Valoria` : ''; tabTitle.hidden = name === 'home' || !label; }
    window.scrollTo({ top: 0, behavior: 'instant' });
    moveIndicator(activeNavLink());
    if (focus) focusTab(name);
    document.dispatchEvent(new CustomEvent('valoria:tab', { detail: { name } }));
  }
  function showTab(name, { focus = false } = {}) {
    if (name === currentTab) {
      window.scrollTo({ top: 0, behavior: motionReduced() ? 'instant' : 'smooth' });
      if (focus) focusTab(name);
      return;
    }
    const firstRender = currentTab === null;
    if (!firstRender && !motionReduced() && typeof document.startViewTransition === 'function') {
      // Cross-page style transition between chapters (Chrome, Edge, Safari 18+).
      const transition = document.startViewTransition(() => applyTab(name, focus));
      transition.ready.catch(() => {}); // a quick second click skips the first transition; that is fine
      transition.finished.finally(scheduleScroll);
      return;
    }
    applyTab(name, focus);
    if (!firstRender && !motionReduced()) {
      panels.forEach(panel => { if (panel.dataset.tab === name) { void panel.offsetWidth; panel.classList.add('tab-enter'); } });
    }
    scheduleScroll();
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('data-scroll-top')) { event.preventDefault(); window.scrollTo({ top: 0, behavior: motionReduced() ? 'instant' : 'smooth' }); return; }
    const name = link.hash.slice(1);
    if (!tabNames.has(name)) return; // e.g. the skip link (#main) keeps its default behaviour
    event.preventDefault();
    if (location.hash !== `#${name}`) history.pushState(null, '', `#${name}`);
    showTab(name, { focus: true });
  });
  addEventListener('popstate', () => showTab(tabFromHash(location.hash)));
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  root.classList.add('tabs-ready');
  showTab(tabFromHash(location.hash));

  const dialog = document.querySelector('.project-dialog');
  const iframe = dialog.querySelector('iframe');
  const stage = dialog.querySelector('.preview-stage');
  const projects = {
    architecture: { title: 'מרחב — אדריכלות עם מחשבה', src: 'concepts/architecture.html' },
    objects: { title: 'אובייקט — פחות, אבל מדויק', src: 'concepts/objects.html' }
  };
  function sizePreview() {
    if (!dialog.open) return;
    const spacing = getComputedStyle(stage);
    const availableWidth = stage.clientWidth - parseFloat(spacing.paddingLeft) - parseFloat(spacing.paddingRight);
    const availableHeight = stage.clientHeight - parseFloat(spacing.paddingTop) - parseFloat(spacing.paddingBottom);
    const width = stage.classList.contains('is-mobile') ? Math.min(375, availableWidth) : Math.max(1024, availableWidth);
    const scale = Math.min(1, availableWidth / width);
    iframe.style.width = `${width}px`;
    iframe.style.height = `${availableHeight / scale}px`;
    iframe.style.transform = `scale(${scale})`;
  }
  function setDevice(device) {
    stage.classList.toggle('is-mobile', device === 'mobile');
    dialog.querySelectorAll('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.device === device)));
    sizePreview();
  }
  document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => {
    const project = projects[button.dataset.project];
    document.querySelector('#project-dialog-title').textContent = project.title;
    iframe.src = project.src;
    iframe.title = `תצוגת קונספט: ${project.title}`;
    setDevice(window.innerWidth < 650 ? 'mobile' : 'desktop');
    dialog.showModal();
    sizePreview();
    dialog.querySelector('.dialog-close').focus();
  }));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => iframe.removeAttribute('src'));
  dialog.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => setDevice(button.dataset.device)));
  if ('ResizeObserver' in window) new ResizeObserver(sizePreview).observe(stage);
  else addEventListener('resize', sizePreview, { passive: true });

  const toast = document.querySelector('.toast');
  let toastTimer;
  function showToast(message) { clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('visible'); toastTimer = setTimeout(() => toast.classList.remove('visible'), 5500); }
  const whatsappNumber = String(config.whatsappNumber || '').replace(/[^0-9]/g, '');
  const whatsappReady = /^[1-9]\d{7,14}$/.test(whatsappNumber);
  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email || '');
  const hasDestination = whatsappReady || emailReady;
  document.querySelectorAll('[data-phone]').forEach(el => { el.textContent = config.phoneDisplay || '050-000-0000'; });
  if (whatsappReady) document.querySelector('.placeholder-note').hidden = true;
  document.querySelectorAll('[data-whatsapp]').forEach(button => button.addEventListener('click', () => {
    if (!whatsappReady) { showToast('מספר ה־WhatsApp יעודכן בקרוב. כרגע זהו מספר להמחשה בלבד.'); return; }
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('היי Valoria, נשמח לדבר על אתר חדש לעסק שלנו.')}`, '_blank', 'noopener,noreferrer');
  }));
  const form = document.querySelector('.contact-form');
  if (hasDestination) document.querySelector('#contact-note').textContent = whatsappReady ? 'הכפתור יפתח הודעה מוכנה ב־WhatsApp. השליחה תתבצע רק באישורכם שם.' : 'הכפתור יפתח טיוטה בתוכנת המייל שלכם. השליחה תתבצע משם.';
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const feedback = form.querySelector('.form-feedback');
    if (!hasDestination) { feedback.textContent = 'פרטי הקשר יעודכנו בקרוב. זוהי תצוגה מקדימה — הפרטים שמילאתם לא נשלחו ולא נשמרו.'; return; }
    const values = new FormData(form);
    const message = `היי Valoria!\nשם: ${values.get('name')}\nעסק: ${values.get('business') || 'לא צוין'}\nמייל: ${values.get('email')}\nטלפון: ${values.get('phone') || 'לא צוין'}\nמתעניינים ב: ${values.get('service')}\n\n${values.get('message') || ''}`;
    if (whatsappReady) window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    else window.location.href = `mailto:${config.email}?subject=${encodeURIComponent('פרויקט חדש — פנייה מהאתר')}&body=${encodeURIComponent(message)}`;
    feedback.textContent = 'ההודעה מוכנה. יש להשלים את השליחה בחלון שנפתח; הפרטים נשארו כאן אם תרצו לערוך אותם.';
  });
  document.querySelector('#year').textContent = new Date().getFullYear();
})();
