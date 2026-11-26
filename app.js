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
  }
  applyMotionPreference();
  reducedQuery.addEventListener('change', applyMotionPreference);
  motionButton.addEventListener('click', () => {
    manualReduction = !manualReduction;
    try { localStorage.setItem('valoria-reduce-motion', String(manualReduction)); } catch {}
    applyMotionPreference();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -25px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
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
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    closeMenu();
    const destination = document.querySelector(link.getAttribute('href'));
    if (destination) { destination.setAttribute('tabindex', '-1'); destination.focus({ preventScroll: true }); }
  }));
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
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        document.querySelectorAll('.desktop-nav a').forEach(link => {
          const active = link.hash === `#${entry.target.id}`;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-20% 0px -55% 0px' });
    document.querySelectorAll('main section[id]').forEach(section => navObserver.observe(section));
  }

  const dialog = document.querySelector('.project-dialog');
  const iframe = dialog.querySelector('iframe');
  const stage = dialog.querySelector('.preview-stage');
  const projects = {
    architecture: { title: 'מרחב — אדריכלות עם מחשבה', src: 'concepts/architecture.html' },
    objects: { title: 'אובייקט — פחות, אבל מדויק', src: 'concepts/objects.html' }
  };
  function setDevice(device) {
    stage.classList.toggle('is-mobile', device === 'mobile');
    dialog.querySelectorAll('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.device === device)));
  }
  document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => {
    const project = projects[button.dataset.project];
    document.querySelector('#project-dialog-title').textContent = project.title;
    iframe.src = project.src;
    iframe.title = `תצוגת קונספט: ${project.title}`;
    setDevice(window.innerWidth < 650 ? 'mobile' : 'desktop');
    dialog.showModal();
    dialog.querySelector('.dialog-close').focus();
  }));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => iframe.removeAttribute('src'));
  dialog.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => setDevice(button.dataset.device)));

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
