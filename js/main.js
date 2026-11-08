window.RCV_ROOT = window.RCV_ROOT || (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/js\/main\.js[\s\S]*$/, '') : location.origin + '/');   // site root, also when the site lives in a sub-folder
/* RCV Technologies — site engine (vanilla JS, no jQuery). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Curtain ---------- */
  const curtain = $('.curtain');
  if (curtain) {
    const done = () => { curtain.classList.add('is-done'); document.documentElement.classList.add('is-ready'); setTimeout(() => curtain.remove(), 900); };
    if (sessionStorage.getItem('rcv_seen')) { curtain.classList.add('is-done'); document.documentElement.classList.add('is-ready'); setTimeout(() => curtain.remove(), 50); }
    else { sessionStorage.setItem('rcv_seen', '1'); window.addEventListener('load', () => setTimeout(done, 500)); setTimeout(done, 1500); }
  } else document.documentElement.classList.add('is-ready');

  /* ---------- Header ---------- */
  const header = $('.site-header');
  let lastY = scrollY, hideTimer;
  const onScrollHeader = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    if (fine && y > 420 && y > lastY + 6 && !document.body.classList.contains('menu-open')) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 200) header.classList.remove('is-hidden');
    lastY = y;
    toTop && toTop.classList.toggle('is-on', y > 700);
  };
  const toTop = $('.to-top');
  toTop && toTop.addEventListener('click', () => { smooth.to(0); });
  addEventListener('scroll', onScrollHeader, { passive: true }); onScrollHeader();

  /* ---------- Mega menu ---------- */
  $$('.nav-x > li.has-mega').forEach(li => {
    const a = li.querySelector(':scope > a');
    let t;
    const open = () => { clearTimeout(t); $$('.nav-x > li.open').forEach(o => o !== li && o.classList.remove('open')); li.classList.add('open'); a.setAttribute('aria-expanded', 'true'); };
    const close = () => { li.classList.remove('open'); a.setAttribute('aria-expanded', 'false'); };
    if (fine) { li.addEventListener('pointerenter', open); li.addEventListener('pointerleave', () => { t = setTimeout(close, 160); }); }
    a.addEventListener('click', e => { if (!fine || !li.classList.contains('open')) { e.preventDefault(); li.classList.contains('open') ? close() : open(); } });
    document.addEventListener('click', e => { if (!li.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  });

  /* ---------- Active nav link ---------- */
  const path = location.pathname.replace(/index\.html$/, '');
  $$('.nav-x a, .offcanvas-nav a').forEach(a => { const h = a.getAttribute('href'); if (h && h !== '/' && path.startsWith(h)) a.classList.add('is-active'); else if (h === '/' && path === '/') a.classList.add('is-active'); });

  /* ---------- Smooth inertia scroll (desktop, fine pointer only) ---------- */
  const smooth = (() => {
    let target = scrollY, current = scrollY, animating = false, raf = 0;
    const max = () => document.documentElement.scrollHeight - innerHeight;
    const loop = () => {
      current += (target - current) * 0.11;
      if (Math.abs(target - current) < 0.6) { current = target; scrollTo(0, current); animating = false; return; }
      scrollTo(0, current); raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!animating) { animating = true; raf = requestAnimationFrame(loop); } };
    const api = { to: y => scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' }) };
    return api;   // native scrolling (compositor thread) stays smooth while 3D renders; the wheel smoothing below is kept but no longer used
    document.documentElement.classList.add('has-smooth');
    addEventListener('wheel', e => {
      if (e.ctrlKey || e.metaKey) return;
      if (document.body.classList.contains('modal-open') || document.body.classList.contains('lb-open')) return;
      if (e.target.closest && e.target.closest('.testi-rail, pre, textarea, .offcanvas, .modal, [data-native-scroll], select')) return;
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      target = clamp((animating ? target : scrollY) + d * 1.0, 0, max()); start();
    }, { passive: false });
    addEventListener('scroll', () => { if (!animating) target = current = scrollY; }, { passive: true });
    addEventListener('resize', () => { target = clamp(target, 0, max()); });
    return api;
  })();
  // In-page anchors
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href').slice(1); if (!id) return; const el = document.getElementById(id); if (!el) return;
    e.preventDefault(); smooth.to(el.getBoundingClientRect().top + scrollY - 96); history.replaceState(null, '', '#' + id);
  });

  /* ---------- Reveal on scroll (3D) ---------- */
  $$('.stagger').forEach(g => Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', i)));
  $$('.words').forEach(h => { if (h.querySelector('.w')) return; const words = h.textContent.trim().split(/\s+/); h.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' '); });
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in'); io.unobserve(en.target);
    if (en.target.classList.contains('rv')) setTimeout(() => en.target.classList.add('is-settled'), 1400 + (parseFloat(getComputedStyle(en.target).transitionDelay) || 0) * 1000);
  }), { rootMargin: '0px 0px -4% 0px', threshold: 0.01 });
  $$('.rv, .rv-l, .rv-r, .rv-scale, .steps, .footer-ghost, h2.words').forEach(el => io.observe(el));

  /* ---------- Pointer depth (hero film + cards, photo wall) ---------- */
  if (fine && !reduced) $$('.hero, [data-wall], .organic-stage, .arch-stage').forEach(stage => {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => { cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08; stage.style.setProperty('--px', cx.toFixed(3)); stage.style.setProperty('--py', cy.toFixed(3)); if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(tick); else raf = 0; };
    stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; if (!raf) raf = requestAnimationFrame(tick); });
    stage.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  });
  const heroEl = $('.hero');
  if (heroEl && !reduced) addEventListener('scroll', () => { heroEl.style.setProperty('--sy', clamp(scrollY / Math.max(1, heroEl.offsetHeight), 0, 1).toFixed(3)); }, { passive: true });

  /* ---------- 3D tilt ---------- */
  if (fine && !reduced) $$('.tilt').forEach(el => {
    const max = +(el.dataset.tilt || 6);
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.classList.add('is-tilting');
      el.style.transform = `perspective(1100px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateZ(0)`;
      el.style.setProperty('--mx', (x * 100) + '%'); el.style.setProperty('--my', (y * 100) + '%');
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('is-tilting'); el.style.transform = ''; });
  });

  /* ---------- Parallax (gentle, transform only) ---------- */
  const plx = $$('[data-parallax]');
  if (plx.length && !reduced) {
    let ticking = false;
    const run = () => { ticking = false; const vh = innerHeight; plx.forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; const p = (r.top + r.height / 2 - vh / 2) / vh; el.style.transform = `translate3d(0, ${(-p * +(el.dataset.parallax || 40)).toFixed(1)}px, 0)`; }); };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true }); run();
  }

  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return; cio.unobserve(en.target);
    const el = en.target, end = parseFloat(el.dataset.count), suf = el.dataset.suffix || '', dur = 1600, t0 = performance.now();
    const step = now => { const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * e).toLocaleString('en-IN') + suf; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.4 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- Testimonial slider: whole cards only, 3D coverflow, arrows, dots, autoplay, swipe ---------- */
  $$('.testi-slider').forEach(sl => {
    const track = $('.testi-track', sl), cards = $$('.testi', track), nav = sl.querySelector('.rail-nav');
    const dots = nav ? nav.querySelector('.dots') : null; let i = 0, timer = 0;
    const per = () => parseInt(getComputedStyle(sl).getPropertyValue('--n')) || 1;
    const pages = () => Math.max(1, cards.length - per() + 1);
    const go = (n, user) => {
      i = ((n % pages()) + pages()) % pages();
      const gap = parseFloat(getComputedStyle(track).gap) || 0, w = cards[0].getBoundingClientRect().width;
      track.style.transform = `translate3d(${-(i * (w + gap))}px, 0, 0)`;
      const mid = i + (per() - 1) / 2;
      cards.forEach((c, k) => { const d = clamp((k - mid) / Math.max(1, per()), -1.2, 1.2); const vis = k >= i && k < i + per(); c.style.setProperty('--ry', (-d * 16).toFixed(2)); c.style.setProperty('--tz', (-Math.abs(d) * 70).toFixed(1)); c.style.setProperty('--sc', (1 - Math.abs(d) * 0.04).toFixed(3)); c.style.setProperty('--op', vis ? 1 : 0.35); c.setAttribute('aria-hidden', vis ? 'false' : 'true'); });
      dots && $$('button', dots).forEach((b, k) => b.classList.toggle('is-on', k === i));
      if (user) restart();
    };
    const restart = () => { clearInterval(timer); if (!reduced) timer = setInterval(() => go(i + 1), 6500); };
    if (dots) { dots.innerHTML = ''; for (let k = 0; k < pages(); k++) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Review ' + (k + 1)); b.addEventListener('click', () => go(k, true)); dots.appendChild(b); } }
    nav && nav.querySelector('.prev').addEventListener('click', () => go(i - 1, true));
    nav && nav.querySelector('.next').addEventListener('click', () => go(i + 1, true));
    let sx = 0, down = false;
    sl.addEventListener('pointerdown', e => { sx = e.clientX; down = true; });
    sl.addEventListener('pointerup', e => { if (!down) return; down = false; const dx = e.clientX - sx; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1), true); });
    addEventListener('resize', () => { if (dots) { dots.innerHTML = ''; for (let k = 0; k < pages(); k++) { const b = document.createElement('button'); b.type = 'button'; b.addEventListener('click', () => go(k, true)); dots.appendChild(b); } } go(Math.min(i, pages() - 1)); });
    go(0); restart();
    const vio = new IntersectionObserver(es => es.forEach(en => { en.isIntersecting ? restart() : clearInterval(timer); })); vio.observe(sl);
  });

  /* ---------- Lightbox ---------- */
  const galleries = $$('.gallery');
  if (galleries.length) {
    const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = '<button class="lb-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button><button class="lb-prev" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button><img alt=""><button class="lb-next" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></button><div class="lb-count"></div>';
    document.body.appendChild(lb);
    const img = lb.querySelector('img'), count = lb.querySelector('.lb-count');
    let list = [], idx = 0;
    const show = i => { idx = (i + list.length) % list.length; img.src = list[idx].href; img.alt = list[idx].querySelector('img')?.alt || ''; count.textContent = (idx + 1) + ' / ' + list.length; };
    const open = (links, i) => { list = links; show(i); lb.classList.add('is-open'); document.body.classList.add('lb-open'); document.body.style.overflow = 'hidden'; };
    const close = () => { lb.classList.remove('is-open'); document.body.classList.remove('lb-open'); document.body.style.overflow = ''; };
    galleries.forEach(g => { const links = $$('a', g); links.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); open(links, i); })); });
    lb.querySelector('.lb-close').addEventListener('click', close); lb.addEventListener('click', e => { if (e.target === lb) close(); });
    lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1)); lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
    document.addEventListener('keydown', e => { if (!lb.classList.contains('is-open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
    let tx = 0; lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true }); lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); });
  }

  /* ---------- Forms ---------- */
  $$('form[data-form]').forEach(form => {
    const msg = form.querySelector('.form-msg') || form.appendChild(Object.assign(document.createElement('div'), { className: 'form-msg' }));
    const shown = Date.now();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
      const btn = form.querySelector('[type="submit"]'); const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Sending…';
      const data = Object.fromEntries(new FormData(form).entries()); data.type = form.dataset.form; data.page = location.pathname; data.elapsed = Date.now() - shown;
      try {
        const r = await fetch(form.getAttribute('action') || (window.RCV_ROOT + 'api/form.php'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({ ok: r.ok }));
        if (!r.ok || !j.ok) throw new Error(j.error || 'Could not send');
        msg.className = 'form-msg is-ok'; msg.textContent = j.message || 'Thank you! We have received your message and will reply within one business day.';
        form.reset(); form.classList.remove('was-validated');
        if (form.dataset.thanks !== 'inline') { try { sessionStorage.setItem('rcv_name', (data.name || '').split(' ')[0]); } catch (_) {} setTimeout(() => { location.href = window.RCV_ROOT + 'thank-you/'; }, 500); }
      } catch (err) {
        const mail = 'mailto:info@rcvtechnologies.com?subject=' + encodeURIComponent('Website enquiry: ' + (data.service || data.type)) + '&body=' + encodeURIComponent(Object.entries(data).filter(([k]) => !['type', 'page', 'elapsed', 'website'].includes(k)).map(([k, v]) => k + ': ' + v).join('\n'));
        msg.className = 'form-msg is-err'; msg.innerHTML = 'We could not send this right now. <a href="' + mail + '">Click here to email us instead</a> or call <a href="tel:+911206568230">+91-1206568230</a>.';
      } finally { btn.disabled = false; btn.innerHTML = label; }
    });
  });
  const thanksName = $('[data-thanks-name]');
  if (thanksName) { try { const n = sessionStorage.getItem('rcv_name'); if (n) thanksName.textContent = ', ' + n.replace(/[^\p{L}\p{M}' -]/gu, '') + '!'; } catch (_) {} }

  /* ---------- Blog hub: search, filter, load more ---------- */
  const hub = $('[data-blog-hub]');
  if (hub) {
    const cards = $$('.post-card[data-title]', hub), search = $('#blog-search'), cats = $$('.cat', hub), more = $('.load-more button', hub), empty = $('.empty', hub);
    let cat = 'all', q = '', shown = 12;
    const pgrid = $('.posts-grid', hub), fillers = $$('.post-filler', hub); let lastV = 0;
    const fillRow = v => { lastV = v; if (!pgrid) return; const cols = getComputedStyle(pgrid).gridTemplateColumns.split(' ').filter(Boolean).length || 1; const k = v ? (cols - v % cols) % cols : 0; fillers.forEach((f, i) => { f.hidden = i >= k; }); };
    addEventListener('resize', () => fillRow(lastV), { passive: true });
    const apply = () => {
      let n = 0;
      cards.forEach(c => { const ok = (cat === 'all' || c.dataset.cat === cat) && (!q || (c.dataset.title + ' ' + c.dataset.text).toLowerCase().includes(q)); const vis = ok && n < shown; c.hidden = !vis; if (ok) n++; });
      more && (more.parentElement.style.display = n > shown ? '' : 'none'); empty && empty.classList.toggle('is-on', n === 0); fillRow(Math.min(n, shown));
    };
    search && search.addEventListener('input', () => { q = search.value.trim().toLowerCase(); shown = 12; apply(); });
    cats.forEach(b => b.addEventListener('click', () => { cats.forEach(x => x.classList.remove('is-active')); b.classList.add('is-active'); cat = b.dataset.cat; shown = 12; apply(); }));
    more && more.addEventListener('click', () => { shown += 12; apply(); });
    const u = new URL(location.href); const qc = u.searchParams.get('cat'); if (qc) { const b = cats.find(x => x.dataset.cat === qc); if (b) b.click(); } const qs = u.searchParams.get('s'); if (qs && search) { search.value = qs; q = qs.toLowerCase(); }
    apply();
  }

  /* ---------- Organic morphing photo frames (blob masks + floating accent shapes) ---------- */
  (() => {
    const stages = $$('.organic-stage'); if (!stages.length) return;
    const N = 8, TAU = Math.PI * 2;
    const blobPath = (t, seed, amp, cx = 50, cy = 50, r = 46) => {
      const pts = [];
      for (let i = 0; i < N; i++) { const a = (i / N) * TAU; const k = r * (1 + amp * (Math.sin(t * 0.7 + seed + i * 1.7) * 0.6 + Math.sin(t * 0.37 + seed * 1.3 + i * 2.9) * 0.4)); pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]); }
      let d = '';
      for (let i = 0; i < N; i++) { const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += (i ? '' : `M${p1[0].toFixed(2)},${p1[1].toFixed(2)}`) + `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`; }
      return d + 'Z';
    };
    const items = []; let id = 0;
    stages.forEach(stage => {
      const host = stage.querySelector('[data-organic]');
      if (host) { const uid = 'organic' + (++id); const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.style.position = 'absolute';
        svg.innerHTML = `<defs><clipPath id="${uid}" clipPathUnits="objectBoundingBox"><path d="M0,0H1V1H0Z"/></clipPath></defs>`; stage.appendChild(svg); host.style.clipPath = `url(#${uid})`;
        items.push({ path: svg.querySelector('path'), seed: Math.random() * 10, amp: .085, box: true }); }
      $$('.organic-accent path', stage).forEach((p, i) => items.push({ path: p, seed: Math.random() * 10 + i, amp: .16 }));
    });
    if (reduced) { items.forEach(it => it.path.setAttribute('d', it.box ? blobPath(0, it.seed, it.amp, .5, .5, .47) : blobPath(0, it.seed, it.amp))); return; }
    let last = 0; const io2 = new IntersectionObserver(es => es.forEach(en => en.target.__vis = en.isIntersecting)); stages.forEach(s => io2.observe(s));
    const tick = now => { if (now - last > 40) { last = now; const t = now / 1000; items.forEach(it => it.path.setAttribute('d', it.box ? blobPath(t, it.seed, it.amp, .5, .5, .47) : blobPath(t * 1.3, it.seed, it.amp))); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  })();

  /* ---------- Hero word split ---------- */
  $$('[data-words]').forEach(h => { const words = h.textContent.trim().split(/\s+/); h.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' '); });

  /* ---------- Video: pause when off-screen (battery) ---------- */
  $$('video[autoplay]').forEach(v => { const o = new IntersectionObserver(es => es.forEach(en => { en.isIntersecting ? v.play().catch(() => {}) : v.pause(); })); o.observe(v); });

  /* ---------- Offcanvas: body class ---------- */
  const oc = $('#mobileNav');
  if (oc) { oc.addEventListener('show.bs.offcanvas', () => document.body.classList.add('menu-open')); oc.addEventListener('hidden.bs.offcanvas', () => document.body.classList.remove('menu-open')); }

  /* ---------- Current year ---------- */
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();

/* ---------- 3D engine: loaded only after the page has painted (and only on pages that have a scene) ---------- */
(() => {
  if (!document.querySelector('[data-scene]')) return;
  const loadScenes = () => { const s = document.createElement('script'); s.type = 'module'; s.src = window.RCV_ROOT + 'js/scenes.js' + (window.RCV_V ? '?v=' + window.RCV_V : ''); document.head.appendChild(s); };
  const idle = window.requestIdleCallback || (f => setTimeout(f, 250));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => idle(loadScenes, { timeout: 1200 })); else idle(loadScenes, { timeout: 1200 });
})();

/* ---------- Hero film: starts after the page has loaded, so it never delays text, images or fonts ---------- */
(() => {
  const vids = Array.from(document.querySelectorAll('video[data-autoplay]')); if (!vids.length) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData);
  const startFilm = () => vids.forEach(v => { if (still || !v.querySelector('source') || !v.currentSrc && !Array.from(v.querySelectorAll('source')).some(s => !s.media || matchMedia(s.media).matches)) return; v.preload = 'auto'; v.load(); const p = v.play(); if (p && p.catch) p.catch(() => {}); });
  const go = () => (window.requestIdleCallback || (f => setTimeout(f, 300)))(startFilm, { timeout: 1500 });
  if (document.readyState === 'complete') go(); else addEventListener('load', go);
})();
