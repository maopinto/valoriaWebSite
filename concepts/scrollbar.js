// Floating black scrollbar for the concept pages: no reserved strip, drag or click to scroll.
(() => {
  'use strict';
  const bar = document.createElement('div');
  bar.className = 'v-scroll';
  bar.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('div');
  thumb.className = 'v-scroll-thumb';
  bar.appendChild(thumb);
  document.body.appendChild(bar);
  const root = document.documentElement;
  let thumbHeight = 0, trackHeight = 0, scheduled = false;
  function update() {
    scheduled = false;
    const max = root.scrollHeight - innerHeight;
    bar.hidden = max <= 1;
    if (bar.hidden) return;
    trackHeight = bar.clientHeight;
    thumbHeight = Math.max(48, trackHeight * innerHeight / root.scrollHeight);
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${(scrollY / max) * (trackHeight - thumbHeight)}px)`;
  }
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  const scrollToPointer = clientY => {
    const max = root.scrollHeight - innerHeight;
    const ratio = (clientY - bar.getBoundingClientRect().top - thumbHeight / 2) / (trackHeight - thumbHeight);
    scrollTo(0, Math.min(1, Math.max(0, ratio)) * max);
  };
  let dragOffset = 0;
  thumb.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    thumb.setPointerCapture(event.pointerId);
    dragOffset = event.clientY - thumb.getBoundingClientRect().top - thumbHeight / 2;
    bar.classList.add('is-dragging');
  });
  thumb.addEventListener('pointermove', event => { if (bar.classList.contains('is-dragging')) scrollToPointer(event.clientY - dragOffset); });
  const stop = () => bar.classList.remove('is-dragging');
  thumb.addEventListener('pointerup', stop);
  thumb.addEventListener('pointercancel', stop);
  bar.addEventListener('pointerdown', event => { if (event.target === bar) scrollToPointer(event.clientY); });
  update();
})();
