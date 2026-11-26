// Valoria — visual effects layer (no dependencies).
// Intro, heading reveals, hover text roll, custom cursor, magnetic buttons, spotlight cards,
// 3D tilt, marquee tapes, process progress, FAQ accordion and the footer wordmark.
// Every effect respects the motion preference managed in app.js (html.reduce-motion).
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = () => root.classList.contains('reduce-motion');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Intro (first visit in a session) ---------- */
  if (root.classList.contains('intro-pending')) {
    const intro = document.querySelector('.intro');
    const count = intro && intro.querySelector('.intro-count');
    const start = performance.now();
    const tick = now => {
      const p = clamp((now - start) / 1450, 0, 1);
      if (count) count.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 100)).padStart(2, '0');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    try { sessionStorage.setItem('valoria-intro', '1'); } catch {}
    // Wait until the delayed hero entrance has finished before clearing the intro state.
    setTimeout(() => { root.classList.remove('intro-pending'); if (intro) intro.remove(); }, 3600);
  }

  /* ---------- Headings: reveal line by line ---------- */
  document.querySelectorAll('main h2').forEach(heading => {
    const lines = [[]];
    [...heading.childNodes].forEach(node => { if (node.nodeName === 'BR') lines.push([]); else lines[lines.length - 1].push(node); });
    const filled = lines.filter(nodes => nodes.length);
    heading.textContent = '';
    filled.forEach((nodes, i) => {
      const line = document.createElement('span');
      line.className = 'line';
      const inner = document.createElement('span');
      inner.className = 'line-inner';
      inner.style.setProperty('--i', i);
      nodes.forEach(node => inner.appendChild(node));
      if (i < filled.length - 1) inner.appendChild(document.createTextNode(' ')); // keeps words apart for screen readers
      line.appendChild(inner);
      heading.appendChild(line);
    });
    heading.classList.add('split');
  });

  /* ---------- Hover text roll (the duplicate label is hidden from assistive tech) ---------- */
  document.querySelectorAll('.desktop-nav a, .nav-contact, .button, .text-link, .footer-top nav a').forEach(el => {
    const textNode = [...el.childNodes].find(node => node.nodeType === 3 && node.textContent.trim());
    if (!textNode) return;
    const label = textNode.textContent.trim();
    const wrap = document.createElement('span');
    wrap.className = 'roll';
    const first = document.createElement('span');
    first.textContent = label;
    const second = document.createElement('span');
    second.textContent = label;
    second.setAttribute('aria-hidden', 'true');
    wrap.append(first, second);
    textNode.replaceWith(wrap);
  });

  /* ---------- Footer wordmark letters ---------- */
  const wordmark = document.querySelector('.footer-wordmark');
  const wmText = wordmark && wordmark.querySelector('.wm-text');
  if (wmText) {
    const text = wmText.textContent;
    wmText.textContent = '';
    [...text].forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.setProperty('--i', i);
      wmText.appendChild(span);
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { wordmark.classList.add('is-visible'); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(wordmark);
    } else wordmark.classList.add('is-visible');
  }

  /* ---------- Cursor, ambient light and hero parallax (one animation loop) ---------- */
  const cursor = document.querySelector('.cursor');
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');
  const label = cursor.querySelector('.cursor-label');
  const ambient = document.querySelector('.ambient');
  const hero = document.querySelector('.hero');
  const state = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2, ax: innerWidth / 2, ay: innerHeight / 2, hx: 0, hy: 0, thx: 0, thy: 0, scale: 1, targetScale: 1 };
  let cursorOn = false, raf = 0, idleFrames = 0;

  function frame() {
    state.rx += (state.x - state.rx) * 0.2;
    state.ry += (state.y - state.ry) * 0.2;
    state.ax += (state.x - state.ax) * 0.08;
    state.ay += (state.y - state.ay) * 0.08;
    state.hx += (state.thx - state.hx) * 0.06;
    state.hy += (state.thy - state.hy) * 0.06;
    state.scale += (state.targetScale - state.scale) * 0.25;
    dot.style.transform = `translate3d(${state.x}px,${state.y}px,0)`;
    ring.style.transform = `translate3d(${state.rx}px,${state.ry}px,0) scale(${state.scale.toFixed(3)})`;
    ambient.style.setProperty('--ax', `${state.ax.toFixed(1)}px`);
    ambient.style.setProperty('--ay', `${state.ay.toFixed(1)}px`);
    hero.style.setProperty('--hx', state.hx.toFixed(4));
    hero.style.setProperty('--hy', state.hy.toFixed(4));
    const settled = Math.abs(state.x - state.rx) + Math.abs(state.y - state.ry) + Math.abs(state.x - state.ax) + Math.abs(state.y - state.ay) < 0.5 && Math.abs(state.thx - state.hx) + Math.abs(state.thy - state.hy) < 0.001 && Math.abs(state.targetScale - state.scale) < 0.001;
    idleFrames = settled ? idleFrames + 1 : 0;
    raf = idleFrames > 10 ? 0 : requestAnimationFrame(frame);
  }
  const wake = () => { if (cursorOn && !raf) { idleFrames = 0; raf = requestAnimationFrame(frame); } };

  function setCursorEnabled() {
    const on = finePointer.matches && !reduced();
    if (on === cursorOn) return;
    cursorOn = on;
    root.classList.toggle('has-cursor', on);
    if (!on) {
      cancelAnimationFrame(raf); raf = 0;
      hero.style.removeProperty('--hx'); hero.style.removeProperty('--hy');
      document.querySelectorAll('.is-magnetic').forEach(el => { el.style.transform = ''; });
    }
  }
  setCursorEnabled();
  finePointer.addEventListener('change', setCursorEnabled);
  document.addEventListener('valoria:motion', setCursorEnabled);

  addEventListener('pointermove', event => {
    if (!cursorOn || event.pointerType === 'touch') return;
    state.x = event.clientX;
    state.y = event.clientY;
    if (!cursor.classList.contains('is-active')) {
      cursor.classList.add('is-active');
      state.rx = state.ax = state.x; state.ry = state.ay = state.y;
    }
    if (hero.getClientRects().length) {
      state.thx = clamp((event.clientX / innerWidth - 0.5) * 2, -1, 1);
      state.thy = clamp((event.clientY / innerHeight - 0.5) * 2, -1, 1);
    }
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
  addEventListener('pointerdown', () => { cursor.classList.add('is-down'); state.targetScale = 0.82; wake(); });
  addEventListener('pointerup', () => { cursor.classList.remove('is-down'); state.targetScale = 1; wake(); });
  document.addEventListener('pointerover', event => {
    if (!cursorOn) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const view = target.closest('[data-cursor]');
    const text = target.closest('input:not([type="radio"]), textarea');
    const link = target.closest('a, button, summary, label, [role="button"]');
    cursor.classList.toggle('is-view', !!view);
    label.textContent = view ? view.dataset.cursor : '';
    cursor.classList.toggle('is-text', !!text && !view);
    cursor.classList.toggle('is-link', !!link && !view && !text);
  });

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('.button, .nav-contact, .hero-badge, .floating-whatsapp, .back-top > span, .next-arrow').forEach(el => {
    el.classList.add('is-magnetic');
    const strength = el.matches('.hero-badge, .next-arrow') ? 0.34 : 0.22;
    el.addEventListener('pointermove', event => {
      if (!cursorOn) return;
      const box = el.getBoundingClientRect();
      el.style.transform = `translate(${((event.clientX - box.left - box.width / 2) * strength).toFixed(1)}px,${((event.clientY - box.top - box.height / 2) * strength).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- Spotlight borders and 3D tilt ---------- */
  document.querySelectorAll('[data-spotlight]').forEach(el => {
    el.addEventListener('pointermove', event => {
      const box = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(event.clientX - box.left).toFixed(0)}px`);
      el.style.setProperty('--my', `${(event.clientY - box.top).toFixed(0)}px`);
    });
  });
  document.querySelectorAll('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', event => {
      if (!cursorOn) return;
      const box = el.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width - 0.5;
      const py = (event.clientY - box.top) / box.height - 0.5;
      el.classList.add('is-tilting');
      el.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-py * 8).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(event.clientX - box.left).toFixed(0)}px`);
      el.style.setProperty('--gy', `${(event.clientY - box.top).toFixed(0)}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });

  /* ---------- Marquee tapes (built when first visible, speed reacts to scrolling) ---------- */
  const tapesBox = document.querySelector('.tapes');
  const tapeAnimations = [];
  const tapeUnits = new Map();
  let tapesBuilt = false, builtWidth = 0;
  function buildTapes(force = false) {
    if ((tapesBuilt && !force) || !tapesBox || !tapesBox.clientWidth) return;
    tapesBuilt = true;
    builtWidth = tapesBox.clientWidth;
    tapeAnimations.forEach(animation => animation.cancel());
    tapeAnimations.length = 0;
    tapesBox.querySelectorAll('.tape').forEach((tape, index) => {
      const track = tape.querySelector('.tape-track');
      if (!tapeUnits.has(track)) tapeUnits.set(track, track.innerHTML);
      track.innerHTML = tapeUnits.get(track);
      const unit = [...track.children].map(node => node.cloneNode(true));
      let guard = 0;
      while (track.scrollWidth < tape.clientWidth * 1.15 && guard++ < 16) unit.forEach(node => track.appendChild(node.cloneNode(true)));
      [...track.children].forEach(node => track.appendChild(node.cloneNode(true)));
      const speed = index === 0 ? 34 : 52; // px per second
      const animation = track.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(50%)' }], {
        duration: (track.scrollWidth / 2 / speed) * 1000,
        iterations: Infinity,
        direction: index === 0 ? 'reverse' : 'normal'
      });
      tapeAnimations.push(animation);
    });
    syncTapes();
  }
  function syncTapes() {
    tapeAnimations.forEach(animation => { if (reduced()) animation.pause(); else animation.play(); });
  }
  if (tapesBox && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) { tapeAnimations.forEach(a => a.pause()); return; }
      buildTapes();
      syncTapes();
    }).observe(tapesBox);
  }
  document.addEventListener('valoria:motion', syncTapes);
  // Rebuild when the width changes a lot (e.g. a phone rotating), so the loop never shows a gap.
  let tapeResizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(tapeResizeTimer);
    tapeResizeTimer = setTimeout(() => {
      if (tapesBuilt && tapesBox.clientWidth && Math.abs(tapesBox.clientWidth - builtWidth) > 60) buildTapes(true);
    }, 250);
  }, { passive: true });
  let lastY = scrollY, lastT = performance.now(), boost = 0, boostRaf = 0;
  function settleBoost() {
    boost *= 0.92;
    tapeAnimations.forEach(animation => { animation.playbackRate = 1 + boost; });
    boostRaf = boost > 0.02 ? requestAnimationFrame(settleBoost) : 0;
  }
  addEventListener('scroll', () => {
    const now = performance.now();
    const velocity = Math.abs(scrollY - lastY) / Math.max(16, now - lastT);
    lastY = scrollY; lastT = now;
    if (!tapeAnimations.length || reduced()) return;
    boost = clamp(Math.max(boost, velocity * 2.2), 0, 4);
    if (!boostRaf) boostRaf = requestAnimationFrame(settleBoost);
  }, { passive: true });

  /* ---------- Process: progress line and active steps ---------- */
  const processSection = document.querySelector('.process');
  const processSteps = processSection && processSection.querySelector('.process-steps');
  const stepItems = processSteps ? [...processSteps.querySelectorAll('.process-step')] : [];
  let processScheduled = false;
  function updateProcess() {
    processScheduled = false;
    if (!processSteps || !processSteps.getClientRects().length) return;
    const box = processSteps.getBoundingClientRect();
    const mark = innerHeight * 0.58;
    const progress = clamp((mark - box.top) / box.height, 0, 1);
    processSection.style.setProperty('--progress', progress.toFixed(4));
    stepItems.forEach(step => step.classList.toggle('is-active', step.getBoundingClientRect().top < mark));
  }
  const scheduleProcess = () => { if (!processScheduled) { processScheduled = true; requestAnimationFrame(updateProcess); } };
  addEventListener('scroll', scheduleProcess, { passive: true });
  addEventListener('resize', scheduleProcess, { passive: true });
  document.addEventListener('valoria:tab', () => { scheduleProcess(); buildTapes(); });
  scheduleProcess();

  /* ---------- FAQ: animated open / close ---------- */
  document.querySelectorAll('.faq-list details').forEach(details => {
    const summary = details.querySelector('summary');
    const body = details.querySelector('p');
    let animation = null;
    summary.addEventListener('click', event => {
      if (reduced() || !body || typeof body.animate !== 'function') return;
      event.preventDefault();
      if (animation) return;
      const easing = 'cubic-bezier(.16,1,.3,1)';
      if (details.open) {
        details.classList.add('is-closing');
        animation = body.animate([{ height: `${body.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 420, easing });
        animation.onfinish = () => { details.open = false; details.classList.remove('is-closing'); animation = null; };
      } else {
        details.open = true;
        animation = body.animate([{ height: '0px', opacity: 0 }, { height: `${body.offsetHeight}px`, opacity: 1 }], { duration: 560, easing });
        animation.onfinish = () => { animation = null; };
      }
    });
  });
})();
