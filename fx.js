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
  const dialogEl = document.querySelector('.project-dialog');
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
    // Inside the dialog, a running open/close animation (transform/filter) makes the dialog the
    // cursor's containing block, so map viewport coordinates into the dialog's local space.
    let ox = 0, oy = 0, k = 1, animating = false;
    if (cursor.parentNode === dialogEl) {
      const cs = getComputedStyle(dialogEl);
      if (cs.transform !== 'none' || cs.filter !== 'none') {
        const r = dialogEl.getBoundingClientRect();
        k = r.width / (dialogEl.offsetWidth || r.width) || 1;
        ox = r.left; oy = r.top; animating = true;
      }
    }
    const lx = v => ((v - ox) / k).toFixed(2);
    const ly = v => ((v - oy) / k).toFixed(2);
    dot.style.transform = `translate3d(${lx(state.x)}px,${ly(state.y)}px,0)${animating ? ` scale(${(1 / k).toFixed(3)})` : ''}`;
    ring.style.transform = `translate3d(${lx(state.rx)}px,${ly(state.ry)}px,0) scale(${(state.scale / k).toFixed(3)})`;
    ambient.style.setProperty('--ax', `${state.ax.toFixed(1)}px`);
    ambient.style.setProperty('--ay', `${state.ay.toFixed(1)}px`);
    hero.style.setProperty('--hx', state.hx.toFixed(4));
    hero.style.setProperty('--hy', state.hy.toFixed(4));
    const settled = Math.abs(state.x - state.rx) + Math.abs(state.y - state.ry) + Math.abs(state.x - state.ax) + Math.abs(state.y - state.ay) < 0.5 && Math.abs(state.thx - state.hx) + Math.abs(state.thy - state.hy) < 0.001 && Math.abs(state.targetScale - state.scale) < 0.001;
    idleFrames = settled && !animating ? idleFrames + 1 : 0;
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

  /* The project dialog lives in the top layer, so the cursor moves inside it while it is open,
     and pointer events from the same-origin concept iframe are mapped back to page coordinates. */
  const projectDialog = document.querySelector('.project-dialog');
  if (projectDialog) {
    const cursorHome = cursor.parentNode;
    new MutationObserver(() => {
      (projectDialog.open ? projectDialog : cursorHome).appendChild(cursor);
      wake();
    }).observe(projectDialog, { attributes: true, attributeFilter: ['open', 'class'] });
    const previewFrame = projectDialog.querySelector('iframe');
    let previewDoc = null;
    const sync = () => { if (previewDoc) previewDoc.documentElement.classList.toggle('valoria-cursor', cursorOn); };
    document.addEventListener('valoria:motion', sync);
    finePointer.addEventListener('change', sync);
    previewFrame.addEventListener('load', () => {
      let doc, win;
      try { doc = previewFrame.contentDocument; win = previewFrame.contentWindow; } catch { return; }
      if (!doc || !win || !doc.documentElement || !doc.head) return;
      const style = doc.createElement('style');
      style.textContent = 'html.valoria-cursor,html.valoria-cursor *{cursor:none!important}';
      doc.head.appendChild(style);
      previewDoc = doc;
      sync();
      win.addEventListener('pointermove', event => {
        if (!cursorOn || event.pointerType === 'touch') return;
        const rect = previewFrame.getBoundingClientRect();
        const scale = rect.width / (previewFrame.offsetWidth || rect.width);
        state.x = rect.left + event.clientX * scale;
        state.y = rect.top + event.clientY * scale;
        if (!cursor.classList.contains('is-active')) {
          cursor.classList.add('is-active');
          state.rx = state.ax = state.x; state.ry = state.ay = state.y;
        }
        wake();
      }, { passive: true });
      win.addEventListener('pointerdown', () => { cursor.classList.add('is-down'); state.targetScale = 0.82; wake(); });
      win.addEventListener('pointerup', () => { cursor.classList.remove('is-down'); state.targetScale = 1; wake(); });
      doc.addEventListener('pointerover', event => {
        if (!cursorOn) return;
        const target = event.target && event.target.closest ? event.target : null;
        if (!target) return;
        const text = target.closest('input:not([type="radio"]), textarea');
        const link = target.closest('a, button, summary, label, [role="button"], .v-scroll-thumb');
        cursor.classList.remove('is-view');
        label.textContent = '';
        cursor.classList.toggle('is-text', !!text);
        cursor.classList.toggle('is-link', !!link && !text);
      });
    });
  }

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
  // Hovering the band eases it down to a slow drift so the words can be read; leaving lets it pick up again.
  let hoverRate = 1, hoverTarget = 1;
  function settleBoost() {
    boost *= 0.92;
    hoverRate += (hoverTarget - hoverRate) * 0.08;
    tapeAnimations.forEach(animation => { animation.playbackRate = hoverRate + boost; });
    boostRaf = boost > 0.02 || Math.abs(hoverTarget - hoverRate) > 0.01 ? requestAnimationFrame(settleBoost) : 0;
  }
  if (tapesBox) {
    const setHover = target => () => { hoverTarget = target; if (!boostRaf && tapeAnimations.length && !reduced()) boostRaf = requestAnimationFrame(settleBoost); };
    tapesBox.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') setHover(0.25)(); });
    tapesBox.addEventListener('pointerleave', setHover(1));
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
  // The asterisk eases toward the scroll-driven angle and swells slightly while it is spinning,
  // in proportion to how fast it turns, then settles back to its normal size when it stops.
  const decoration = processSection && processSection.querySelector('.process-decoration');
  const spin = { angle: 0, target: 0, scale: 1, raf: 0 };
  function renderSpin() {
    if (decoration) decoration.style.transform = `rotate(${spin.angle.toFixed(2)}deg) scale(${spin.scale.toFixed(4)})`;
  }
  function stepSpin() {
    const delta = spin.target - spin.angle;
    spin.angle += delta * 0.045;
    const swell = 1 + Math.min(Math.abs(delta) / 110, 1) * 0.16;
    spin.scale += (swell - spin.scale) * 0.1;
    renderSpin();
    const settled = Math.abs(delta) < 0.05 && Math.abs(spin.scale - 1) < 0.0005;
    if (settled) { spin.angle = spin.target; spin.scale = 1; renderSpin(); spin.raf = 0; }
    else spin.raf = requestAnimationFrame(stepSpin);
  }
  function updateProcess() {
    processScheduled = false;
    if (!processSteps || !processSteps.getClientRects().length) return;
    const box = processSteps.getBoundingClientRect();
    const mark = innerHeight * 0.58;
    // Map scroll to the line so it always starts empty at 01 (even when the steps are already
    // above the mark on arrival) and is full once the last step reaches the mark or the page ends.
    const docTop = box.top + scrollY;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const start = clamp(docTop - mark, 0, maxScroll);
    const end = clamp(docTop + box.height - mark, start + 1, Math.max(maxScroll, start + 1));
    const progress = clamp((scrollY - start) / (end - start), 0, 1);
    processSection.style.setProperty('--progress', progress.toFixed(4));
    spin.target = progress * 300;
    if (reduced()) { spin.angle = spin.target; spin.scale = 1; renderSpin(); }
    else if (!spin.raf) spin.raf = requestAnimationFrame(stepSpin);
    // the line runs from 12px to (height - 40px); a step lights up as the tip reaches its dot
    const tip = 12 + progress * (box.height - 52);
    stepItems.forEach((step, i) => step.classList.toggle('is-active', i === 0 || step.getBoundingClientRect().top - box.top + 12 <= tip + 1));
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
    // split the answer into words (spaces stay as text) so they can rise in one after another
    if (body && !body.querySelector('.faq-word')) {
      let index = 0;
      body.childNodes.forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { fragment.appendChild(document.createTextNode(part)); return; }
          const word = document.createElement('span');
          word.className = 'faq-word';
          word.style.setProperty('--i', Math.min(index++, 40));
          word.textContent = part;
          fragment.appendChild(word);
        });
        node.replaceWith(fragment);
      });
    }
    summary.addEventListener('click', event => {
      if (reduced() || !body || typeof body.animate !== 'function') return;
      event.preventDefault();
      if (animation) return;
      const easing = 'cubic-bezier(.16,1,.3,1)';
      // height, padding and margin all animate together, so nothing is left to snap at the end
      const open = () => {
        const cs = getComputedStyle(body);
        return { height: `${body.offsetHeight}px`, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: cs.marginTop, marginBottom: cs.marginBottom, opacity: 1 };
      };
      const shut = { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', opacity: 0 };
      const boxSizing = body.style.boxSizing;
      body.style.boxSizing = 'border-box';
      if (details.open) {
        details.classList.add('is-closing');
        animation = body.animate([open(), shut], { duration: 460, easing: 'cubic-bezier(.65,0,.35,1)' });
        animation.onfinish = () => { details.open = false; details.classList.remove('is-closing'); body.style.boxSizing = boxSizing; animation = null; };
      } else {
        details.open = true;
        animation = body.animate([shut, open()], { duration: 560, easing });
        animation.onfinish = () => { body.style.boxSizing = boxSizing; animation = null; };
      }
    });
  });

  /* ---------- Touch screens: "next chapter" titles fill in when scrolled into view (no hover there) ---------- */
  const touchOnly = matchMedia('(hover: none)');
  if ('IntersectionObserver' in window) {
    const chapterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) entry.target.classList.add('is-inview');
        else if (!entry.isIntersecting) entry.target.classList.remove('is-inview');
      });
    }, { threshold: [0, 0.45] });
    const watchChapters = () => document.querySelectorAll('.next-chapter').forEach(el => {
      if (touchOnly.matches) chapterObserver.observe(el);
      else { chapterObserver.unobserve(el); el.classList.remove('is-inview'); }
    });
    watchChapters();
    touchOnly.addEventListener('change', watchChapters);
  }

  /* ---------- Contact form: smooth caret (VS Code style) + floating ghost of each typed letter ---------- */
  const typingFields = [...document.querySelectorAll('.contact-form .field > input, .contact-form .field > textarea')];
  const mirror = document.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');
  mirror.style.cssText = 'position:fixed;top:0;left:0;z-index:-1;visibility:hidden;overflow:hidden;pointer-events:none;contain:strict';
  const COPY = ['boxSizing', 'width', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textTransform', 'textIndent', 'textAlign', 'direction', 'wordSpacing', 'tabSize'];
  let caretsOn = false;
  const placers = new Map();

  function caretPoint(field, index) {
    const cs = getComputedStyle(field);
    COPY.forEach(prop => { mirror.style[prop] = cs[prop]; });
    const multiline = field.tagName === 'TEXTAREA';
    mirror.style.whiteSpace = multiline ? 'pre-wrap' : 'pre';
    mirror.style.overflowWrap = multiline ? 'break-word' : 'normal';
    mirror.textContent = field.value.slice(0, index);
    const marker = document.createElement('span');
    marker.textContent = '​';
    mirror.appendChild(marker);
    mirror.appendChild(document.createTextNode(field.value.slice(index) || '.'));
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
    return {
      x: field.offsetLeft + marker.offsetLeft - field.scrollLeft,
      y: field.offsetTop + marker.offsetTop - field.scrollTop + (marker.offsetHeight - lineHeight) / 2,
      h: lineHeight
    };
  }

  typingFields.forEach(field => {
    const holder = field.parentNode;
    const caret = document.createElement('span');
    caret.className = 'v-caret';
    caret.setAttribute('aria-hidden', 'true');
    holder.appendChild(caret);
    let typingTimer = 0, last = null;

    function place(instant) {
      if (!caretsOn || document.activeElement !== field) return;
      const collapsed = field.selectionStart === field.selectionEnd;
      caret.classList.toggle('is-hidden', !collapsed);
      const p = caretPoint(field, field.selectionEnd ?? field.value.length);
      const visible = p.y >= field.offsetTop - 2 && p.y + p.h <= field.offsetTop + field.offsetHeight + 2;
      caret.style.opacity = visible ? '' : '0';
      if (instant) caret.classList.add('is-instant');
      caret.style.height = `${p.h}px`;
      caret.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      if (instant) { void caret.offsetWidth; caret.classList.remove('is-instant'); }
      last = p;
    }
    function typing() {
      caret.classList.add('is-typing');
      holder.classList.add('is-typing');
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { caret.classList.remove('is-typing'); holder.classList.remove('is-typing'); }, 520);
    }
    function ghost(text, at) {
      if (!at || reduced() || !text || text.length > 3 || !text.trim()) return;
      const g = document.createElement('span');
      g.className = 'v-ghost';
      g.setAttribute('aria-hidden', 'true');
      g.textContent = text;
      g.style.font = getComputedStyle(field).font;
      g.style.left = `${at.x}px`;
      g.style.top = `${at.y}px`;
      g.style.height = `${at.h}px`;
      g.style.lineHeight = `${at.h}px`;
      holder.appendChild(g);
      g.addEventListener('animationend', () => g.remove());
    }

    field.addEventListener('focus', () => { if (!caretsOn) return; caret.classList.add('is-on'); place(true); });
    field.addEventListener('blur', () => caret.classList.remove('is-on'));
    let prevLength = field.value.length;
    field.addEventListener('input', event => {
      const grewByOne = field.value.length === prevLength + 1;
      prevLength = field.value.length;
      if (!caretsOn) return;
      const before = last;
      place(false);
      typing();
      // desktop keyboards send single letters; phone keyboards (autocomplete) send the whole word
      // being composed, so there the ghost is the newest letter whenever exactly one was added
      const letter = event.inputType === 'insertText' ? event.data
        : event.inputType === 'insertCompositionText' && grewByOne && event.data ? event.data.slice(-1) : null;
      if (letter && before && last) {
        const sameLine = Math.abs(before.y - last.y) < 2;
        ghost(letter, { x: sameLine ? (before.x + last.x) / 2 : last.x, y: last.y, h: last.h });
      }
    });
    field.addEventListener('scroll', () => place(true), { passive: true });
    field.addEventListener('keydown', event => { if (caretsOn && event.key.length > 1) typing(); });
    placers.set(field, place);
  });
  // arrows, clicks, selections, Home/End… all end up as a selection change
  document.addEventListener('selectionchange', () => {
    const place = placers.get(document.activeElement);
    if (place) requestAnimationFrame(() => place(false));
  });
  addEventListener('resize', () => { const place = placers.get(document.activeElement); if (place) place(true); }, { passive: true });

  function setCaretsEnabled() {
    caretsOn = !reduced(); // phones included: the smooth caret and letter ghosts work with touch keyboards too
    if (caretsOn && !mirror.isConnected) document.body.appendChild(mirror);
    root.classList.toggle('has-v-caret', caretsOn);
    if (!caretsOn) document.querySelectorAll('.v-caret').forEach(c => c.classList.remove('is-on'));
  }
  setCaretsEnabled();
  finePointer.addEventListener('change', setCaretsEnabled);
  document.addEventListener('valoria:motion', setCaretsEnabled);
})();
