/* RCV Technologies — scene module "pages" (hero badge of /blog/: articles and insights).
   One premium object: an open hardback journal bound in deep-wine leather, lying on an invisible table.
   - The spread carries real editorial layouts painted on canvas (running heads, kicker, Playfair headline, illustration,
     justified body copy with a drop cap, chart, pull quote, folios); the text block curves down into a shaded gutter and
     its edges show fine stacked-sheet lines.
   - The top sheet turns continuously: a vertex-animated leaf that lifts corner-first, rolls over the spine with a real bent
     curl, lags with air drag as it falls, lands with a small bounce, rests, then turns back. Its two faces carry different
     articles, so every turn reveals a new spread. A soft shadow under the lifted leaf tracks it across the pages.
   - Accents: a crimson satin ribbon bookmark spilling out of the gutter over the cover edge with a V-cut tail, and a
     champagne-metal pen with a crimson band resting on the cover at the foot of the pages.
   opts.photo is intentionally not used (the page already shows that photo right beside the badge).
   Contract: export default build(stage, opts, lib) — see js/scenes/README.md. No transmission, no shadow maps, ~9k tris. */
export default async function build(stage, opts, lib) {
  const { THREE, M, C, rbox, canvasTexture } = lib;
  const reduced = !!lib.reduced; const G = stage.group;
  const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
  const SANS = "Manrope, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
  const BODY = "Georgia, 'Times New Roman', serif";
  const INK = '#2a1c20', GREY = '#8b827e', RED = '#c8102e', CORAL = '#f26b5b', WINE = '#4b0c1e', WINE2 = '#7a0f22';

  /* the canvas text is measured, so wait (briefly) for the web fonts */
  if (document.fonts && document.fonts.load) {
    try { await Promise.race([Promise.all(["600 64px 'Playfair Display'", '700 32px Manrope', '600 32px Manrope'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1800))]); } catch (e) { /* fallback fonts are fine */ }
  }

  /* ---------- dimensions: page width W (spine to fore-edge), height H (head to tail) ---------- */
  const W = 2.0, H = 2.8, N = 44, R = 8, EPS = .011;
  const TABLE = stage.o.floorY ?? -2.6, CT = .085, SQ = .12; // table = studio floor, board thickness, cover overhang
  const CTOP = TABLE + CT, Y0 = CTOP + .045;               // cover top, gutter bottom
  const alpha = s => .86 * Math.exp(-s / .34) - .07 * (s / W) * (s / W);  // page-surface tangent angle along the arc length
  const ds = W / N, PX = [0], PY = [0], AL = [];
  for (let i = 0; i < N; i++) { const a = alpha((i + .5) * ds); AL.push(a); PX.push(PX[i] + Math.cos(a) * ds); PY.push(PY[i] + Math.sin(a) * ds); }
  const XN = PX[N];

  const book = new THREE.Group(); G.add(book);

  /* ---------- canvas helpers ---------- */
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const track = (g, text, x, y, sp, align = 'left') => {
    g.textAlign = 'left'; const ch = [...text], ws = ch.map(c => g.measureText(c).width); const tw = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
    let cx = align === 'right' ? x - tw : align === 'center' ? x - tw / 2 : x; ch.forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + sp; }); return tw;
  };
  const headline = (g, lines, x, y, maxW, size, lead, color = INK) => {
    let s = size; const f = () => { g.font = `600 ${s}px ${SERIF}`; }; f();
    while (s > 18 && Math.max(...lines.map(l => g.measureText(l).width)) > maxW) { s -= 2; f(); }
    g.fillStyle = color; g.textAlign = 'left'; lines.forEach((l, i) => g.fillText(l, x, y + i * lead * s / size)); return y + (lines.length - 1) * lead * s / size;
  };
  const COPY = ('Every great website begins with a clear idea of who it serves. We map the journey, simplify each step and let the content lead. ' +
    'Fast pages, honest words and thoughtful design turn a first visit into a lasting relationship. Search engines reward what people reward: ' +
    'clarity, speed and real expertise. Our team writes, designs and builds with that in mind, measures what matters and keeps improving, ' +
    'week after week, page after page, for brands that want to be found and remembered.').split(' ');
  /* justified body copy that fills a column; returns the next y and word index */
  const body = (g, x, y, w, yMax, o = {}) => {
    const size = o.size || 15, lh = o.lh || Math.round(size * 1.52); g.font = `${size}px ${BODY}`; g.fillStyle = o.color || '#857c78'; g.textAlign = 'left';
    const sp = g.measureText(' ').width; let k = o.k || 0, n = 0; const plen = o.plen || 7;
    while (y <= yMax) {
      const ind = o.indent && n < o.indent.lines ? o.indent.w : 0, lw = w - ind;
      const end = (n + 1) % plen === 0 || y + lh > yMax; const maxW = end ? lw * (.42 + ((n * 37 + k) % 40) / 100) : lw;
      const line = []; let tw = 0;
      for (;;) { const wd = COPY[k % COPY.length], ww = g.measureText(wd).width; if (line.length && tw + sp + ww > maxW) break; line.push([wd, ww]); tw += (line.length > 1 ? sp : 0) + ww; k++; }
      const gap = !end && line.length > 1 ? (lw - line.reduce((a, b) => a + b[1], 0)) / (line.length - 1) : sp;
      let cx = x + ind; line.forEach(([wd, ww]) => { g.fillText(wd, cx, y); cx += ww + gap; });
      n++; y += lh; if (end) y += Math.round(lh * .5);
    }
    return { y, k };
  };
  const dropCap = (g, ch, x, y, size) => { g.font = `600 ${size}px ${SERIF}`; g.fillStyle = RED; g.textAlign = 'left'; g.fillText(ch, x, y); return g.measureText(ch).width; };
  const paper = (g, w, h, sl) => {
    g.fillStyle = '#fbf8f4'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(sl ? 0 : w, 0, sl ? w * .22 : w * .78, 0);   // gutter shade
    gr.addColorStop(0, 'rgba(96,40,46,.30)'); gr.addColorStop(.22, 'rgba(96,40,46,.10)'); gr.addColorStop(1, 'rgba(96,40,46,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const og = g.createLinearGradient(sl ? w : 0, 0, sl ? w * .94 : w * .06, 0);   // fore-edge falloff
    og.addColorStop(0, 'rgba(110,70,64,.08)'); og.addColorStop(1, 'rgba(110,70,64,0)'); g.fillStyle = og; g.fillRect(0, 0, w, h);
  };
  const margins = (w, sl) => { const x0 = sl ? 78 : 54, x1 = w - (sl ? 54 : 78); return [x0, x1, x1 - x0]; };
  const runHead = (g, w, sl, label) => {
    const [x0, x1] = margins(w, sl); g.font = `700 13px ${SANS}`; g.fillStyle = RED;
    if (sl) track(g, label, x1, 58, 3.2, 'right'); else track(g, label, x0, 58, 3.2);
    g.font = `600 12px ${SANS}`; g.fillStyle = '#b1a7a1'; if (sl) track(g, 'ISSUE 07', x0, 58, 2.4); else track(g, 'THE JOURNAL', x1, 58, 2.4, 'right');
    g.fillStyle = '#e5ddd4'; g.fillRect(x0, 72, x1 - x0, 1.5);
  };
  const folio = (g, w, h, sl, n) => {
    const [x0, x1] = margins(w, sl); g.fillStyle = '#e5ddd4'; g.fillRect(x0, h - 66, x1 - x0, 1.5);
    g.font = `700 13px ${SANS}`; g.fillStyle = '#a0968f'; if (sl) track(g, n, x1, h - 42, 1.5, 'right'); else track(g, n, x0, h - 42, 1.5);
    g.font = `600 11px ${SANS}`; g.fillStyle = '#c2b9b2'; track(g, 'RCV TECHNOLOGIES', (x0 + x1) / 2, h - 42, 2.6, 'center');
  };
  const arch = (g, cx, top, bw, bottom) => { g.beginPath(); g.moveTo(cx - bw / 2, bottom); g.lineTo(cx - bw / 2, top + bw / 2); g.arc(cx, top + bw / 2, bw / 2, Math.PI, 0); g.lineTo(cx + bw / 2, bottom); g.closePath(); };
  /* editorial illustration 1: arches and a coral sun */
  const art1 = (g, x, y, w, h) => {
    g.save(); rr(g, x, y, w, h, 12); g.clip();
    let gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#fdeeeb'); gr.addColorStop(1, '#f7d5cf'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    const fl = y + h * .8;
    g.fillStyle = CORAL; g.beginPath(); g.arc(x + w * .3, y + h * .36, h * .19, 0, 7); g.fill();
    g.fillStyle = '#f9c8c0'; arch(g, x + w * .16, y + h * .42, w * .17, fl); g.fill();
    gr = g.createLinearGradient(x + w * .5, 0, x + w * .82, 0); gr.addColorStop(0, '#d8193a'); gr.addColorStop(1, '#a30c26'); g.fillStyle = gr; arch(g, x + w * .66, y + h * .16, w * .32, fl); g.fill();
    g.fillStyle = WINE; arch(g, x + w * .66, y + h * .42, w * .15, fl); g.fill();
    gr = g.createLinearGradient(0, fl, 0, y + h); gr.addColorStop(0, '#f8f1ea'); gr.addColorStop(1, '#efe5dc'); g.fillStyle = gr; g.fillRect(x, fl, w, h);
    g.fillStyle = 'rgba(122,15,34,.14)'; g.fillRect(x, fl, w, 3);
    gr = g.createRadialGradient(x + w * .88, y + h * .7, 2, x + w * .89, y + h * .73, h * .1); gr.addColorStop(0, '#ffb8ad'); gr.addColorStop(1, '#e85a49'); g.fillStyle = gr; g.beginPath(); g.arc(x + w * .89, y + h * .74, h * .065, 0, 7); g.fill();
    g.restore();
  };
  /* editorial illustration 2: nested arches */
  const art2 = (g, x, y, w, h) => {
    g.save(); rr(g, x, y, w, h, 12); g.clip();
    const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#fdf3f0'); gr.addColorStop(1, '#fbe4e3'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    const cx = x + w * .5, base = y + h * .84, R0 = Math.min(w * .4, h * .7);
    [CORAL, '#fbd6cf', RED, '#fdf0ed', WINE2, '#fbe4e3', WINE].forEach((c, i) => { const r = R0 * (1 - i * .14); g.fillStyle = c; g.beginPath(); g.moveTo(cx - r, base); g.arc(cx, base, r, Math.PI, 0); g.closePath(); g.fill(); });
    g.fillStyle = '#f4ece4'; g.fillRect(x, base, w, h); g.fillStyle = 'rgba(122,15,34,.14)'; g.fillRect(x, base, w, 3);
    g.restore();
  };
  /* small bar chart */
  const chart = (g, x, y, w, h) => {
    g.fillStyle = '#f5efe9'; rr(g, x, y, w, h, 12); g.fill();
    g.font = `700 12px ${SANS}`; g.fillStyle = RED; track(g, 'FIG. 2', x + 24, y + 30, 2.2);
    g.font = `600 12px ${SANS}`; g.fillStyle = '#9d938d'; track(g, 'ORGANIC TRAFFIC, 2025', x + 84, y + 30, 1.6);
    const v = [.3, .4, .37, .52, .66, .92], bw = (w - 48) / v.length, base = y + h - 30, top = y + 50;
    g.strokeStyle = '#e6ddd3'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const yy = base - (base - top) * (i + 1) / 3; g.beginPath(); g.moveTo(x + 24, yy); g.lineTo(x + w - 24, yy); g.stroke(); }
    v.forEach((k, i) => { const bh = (base - top) * k; g.fillStyle = i === v.length - 1 ? RED : i % 2 ? '#f6a092' : CORAL; rr(g, x + 24 + i * bw + bw * .2, base - bh, bw * .6, bh, 5); g.fill(); });
    g.fillStyle = '#d6ccc2'; g.fillRect(x + 20, base, w - 40, 2);
  };

  /* ---------- the four page faces ---------- */
  const PW = 640, PH = 896;
  const face = (draw, sl, mirror) => canvasTexture((g, w, h) => { if (mirror) { g.translate(w, 0); g.scale(-1, 1); } paper(g, w, h, sl); draw(g, w, h, sl); }, PW, PH);
  const pageA = (g, w, h, sl) => {      // leaf front: feature opener
    const [x0, , tw] = margins(w, sl); runHead(g, w, sl, 'RCV INSIGHTS');
    g.font = `700 15px ${SANS}`; g.fillStyle = RED; track(g, 'DIGITAL STRATEGY', x0, 128, 4);
    const yb = headline(g, ['Ideas that', 'grow brands'], x0, 192, tw, 62, 64);
    g.fillStyle = RED; g.fillRect(x0, yb + 30, 46, 4);
    g.font = `600 14px ${SANS}`; g.fillStyle = GREY; track(g, 'By RCV Editorial  ·  6 min read', x0 + 62, yb + 36, .6);
    art1(g, x0, yb + 62, tw, 236);
    const y1 = yb + 62 + 236 + 46; const cw = dropCap(g, 'E', x0 - 2, y1 + 40, 70);
    body(g, x0, y1, tw, h - 92, { indent: { lines: 3, w: cw + 10 }, k: 1 });
    folio(g, w, h, sl, '27');
  };
  const pageD = (g, w, h, sl) => {      // left page under the leaf: quote + columns + chart
    const [x0, x1, tw] = margins(w, sl); runHead(g, w, sl, 'THE JOURNAL');
    g.font = `600 92px ${SERIF}`; g.fillStyle = '#f3c6c0'; g.fillText('“', x0 - 6, 176);
    headline(g, ['Design is how a', 'brand feels at its', 'very first click.'], x0, 168, tw - 10, 40, 50, RED);
    g.font = `700 13px ${SANS}`; g.fillStyle = GREY; track(g, '—  RCV DESIGN STUDIO', x0, 300, 2.4);
    const cw = (tw - 30) / 2; body(g, x0, 352, cw, 590, { size: 14, plen: 6, k: 9 }); body(g, x0 + cw + 30, 352, cw, 590, { size: 14, plen: 5, k: 40 });
    chart(g, x0, 622, tw, 196); folio(g, w, h, sl, '26');
    void x1;
  };
  const pageC = (g, w, h, sl) => {      // leaf back: visual feature
    const [x0, , tw] = margins(w, sl); runHead(g, w, sl, 'THE JOURNAL');
    art2(g, x0, 96, tw, 300);
    g.font = `600 12px ${SANS}`; g.fillStyle = '#a0968f'; track(g, 'FIG. 3  —  THE ANATOMY OF A FAST PAGE', x0, 422, 1.6);
    g.font = `700 15px ${SANS}`; g.fillStyle = RED; track(g, 'SEO & PERFORMANCE', x0, 474, 4);
    const yb = headline(g, ['Search,', 'simplified.'], x0, 536, tw, 60, 62);
    body(g, x0, yb + 48, tw, h - 92, { k: 22, plen: 6 }); folio(g, w, h, sl, '28');
  };
  const pageB = (g, w, h, sl) => {      // right page under the leaf: article with a numbered list
    const [x0, x1, tw] = margins(w, sl); runHead(g, w, sl, 'RCV INSIGHTS');
    g.font = `700 15px ${SANS}`; g.fillStyle = RED; track(g, 'WEB DEVELOPMENT', x0, 128, 4);
    const yb = headline(g, ['Speed is', 'a feature.'], x0, 192, tw, 62, 64);
    let y = body(g, x0, yb + 50, tw, yb + 50 + 22 * 5, { k: 30, plen: 9 }).y + 6;
    ['Core Web Vitals', 'Clean, semantic code', 'Search-ready content'].forEach((t, i) => {
      g.font = `600 30px ${SERIF}`; g.fillStyle = RED; g.fillText('0' + (i + 1), x0, y + 26);
      g.font = `700 17px ${SANS}`; g.fillStyle = INK; g.fillText(t, x0 + 58, y + 14);
      g.fillStyle = '#d9d0c8'; g.fillRect(x0 + 58, y + 30, tw * (.62 - i * .08), 7); g.fillRect(x0 + 58, y + 44, tw * (.48 + i * .06), 7);
      y += 74; g.fillStyle = '#ece5dd'; g.fillRect(x0, y - 12, tw, 1.2);
    });
    g.fillStyle = '#f7ecea'; g.fillRect(x0, y + 8, tw, 96); g.fillStyle = RED; g.fillRect(x0, y + 8, 5, 96);
    headline(g, ['Fast sites earn trust', 'before they say a word.'], x0 + 26, y + 50, tw - 44, 26, 32, WINE2);
    body(g, x0, y + 140, tw, h - 92, { k: 50, plen: 8 }); folio(g, w, h, sl, '29'); void x1;
  };
  const texA = face(pageA, true, false), texC = face(pageC, false, true), texB = face(pageB, true, false), texD = face(pageD, false, false);

  /* ---------- materials ---------- */
  const paperMat = map => new THREE.MeshStandardMaterial({ map, color: 0xf6f2ec, roughness: .82, envMapIntensity: .9 });
  const stripes = vertical => {
    const t = canvasTexture((g, w, h) => { g.fillStyle = '#eee7de'; g.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { g.fillStyle = i % 5 === 0 ? '#d4c9bd' : '#e0d7cc'; if (vertical) g.fillRect(i * 4, 0, 1.5, h); else g.fillRect(0, i * 4, w, 1.5); } }, vertical ? 128 : 4, vertical ? 4 : 128);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  const LINE = .32; const capT = stripes(false); capT.repeat.set(1, 1 / LINE); const sideT = stripes(true); sideT.repeat.set(1 / LINE, 1);
  const edgeMats = [new THREE.MeshStandardMaterial({ map: capT, roughness: .9 }), new THREE.MeshStandardMaterial({ map: sideT, roughness: .9 })];
  const grain = canvasTexture((g, w, h) => { const d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = 128 + (Math.random() - .5) * 120; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); }, 128, 128);
  grain.colorSpace = THREE.NoColorSpace; grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(9, 6);
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x5c0d1f, roughness: .5, bumpMap: grain, bumpScale: .5, clearcoat: .45, clearcoatRoughness: .32, sheen: .5, sheenRoughness: .5, sheenColor: new THREE.Color(0xe9a7a6), envMapIntensity: 1.1 });

  /* ---------- geometry helpers ---------- */
  const grid = (nx, ny) => {
    const g = new THREE.BufferGeometry(), n = (nx + 1) * (ny + 1); const uv = new Float32Array(n * 2), idx = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const k = j * (nx + 1) + i; uv[k * 2] = i / nx; uv[k * 2 + 1] = 1 - j / ny; }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  };
  /* top surface of a text block (right: sgn 1, left: sgn -1), following the curved page profile */
  const surface = sgn => {
    const g = grid(N, 2), p = g.attributes.position.array;
    for (let j = 0; j <= 2; j++) for (let i = 0; i <= N; i++) { const s = sgn > 0 ? i : N - i, k = (j * (N + 1) + i) * 3; p[k] = sgn * PX[s]; p[k + 1] = Y0 + PY[s]; p[k + 2] = (j / 2 - .5) * H; }
    g.computeVertexNormals(); return g;
  };
  const block = sgn => {
    const s = new THREE.Shape(); s.moveTo(0, CTOP); s.lineTo(0, Y0 - .004);
    for (let i = 1; i <= N; i++) s.lineTo(sgn * PX[i], Y0 + PY[i] - .004);
    s.lineTo(sgn * XN, CTOP); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -H / 2); return g;
  };

  /* ---------- cover, text blocks, visible pages ---------- */
  const cover = new THREE.Mesh(rbox(2 * (XN + SQ), CT, H + 2 * SQ, .032, 4), leather); cover.position.y = TABLE + CT / 2; book.add(cover);
  [1, -1].forEach(sgn => { book.add(new THREE.Mesh(block(sgn), edgeMats)); });
  book.add(new THREE.Mesh(surface(1), paperMat(texB)));
  book.add(new THREE.Mesh(surface(-1), paperMat(texD)));

  /* ---------- the turning leaf (two faces share one animated geometry) ---------- */
  const leaf = grid(N, R), lp = leaf.attributes.position.array;
  const front = new THREE.Mesh(leaf, Object.assign(paperMat(texA), { side: THREE.FrontSide }));
  const back = new THREE.Mesh(leaf, Object.assign(paperMat(texC), { side: THREE.BackSide }));
  front.frustumCulled = back.frustumCulled = false; book.add(front, back);
  const pose = (p, dir, settle) => {
    const bend = .95 * Math.sin(2 * Math.PI * p) + settle, twist = .38 * dir * Math.pow(Math.sin(Math.PI * p), 1.5);
    for (let j = 0; j <= R; j++) {
      const zn = j / R * 2 - 1, z = zn * H / 2; let x = 0, y = Y0 + EPS;
      for (let i = 0; i <= N; i++) {
        const k = (j * (N + 1) + i) * 3; lp[k] = x; lp[k + 1] = y; lp[k + 2] = z; if (i === N) break;
        const sn = (i + .5) / N, a = AL[i];
        const phi = a + p * (Math.PI - 2 * a) + bend * Math.pow(sn, 1.6) + twist * zn * sn * sn;
        x += Math.cos(phi) * ds; y += Math.sin(phi) * ds;
      }
    }
    leaf.attributes.position.needsUpdate = true; leaf.computeVertexNormals();
  };

  /* ---------- soft shadow of the lifted leaf on the pages (per-vertex alpha strip over both pages) ---------- */
  const SC = 2 * N + 1, SR = 6, sg = new THREE.BufferGeometry(); const spos = new Float32Array(SC * (SR + 1) * 3), scol = new Float32Array(SC * (SR + 1) * 4), sidx = [], SXs = [];
  for (let c = 0; c < SC; c++) { const i = c - N, a = Math.abs(i); SXs.push(Math.sign(i) * PX[a]); }
  for (let j = 0; j <= SR; j++) for (let c = 0; c < SC; c++) { const i = c - N, a = Math.abs(i), k = j * SC + c; spos[k * 3] = SXs[c]; spos[k * 3 + 1] = Y0 + PY[a] + .004; spos[k * 3 + 2] = (j / SR - .5) * H; scol[k * 4] = scol[k * 4 + 1] = scol[k * 4 + 2] = 1; }
  for (let j = 0; j < SR; j++) for (let c = 0; c < SC - 1; c++) { const a = j * SC + c, b = a + 1, d = a + SC, e = d + 1; sidx.push(a, d, b, b, d, e); }
  sg.setAttribute('position', new THREE.BufferAttribute(spos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(scol, 4)); sg.setIndex(sidx);
  const leafShadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x3a1218, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
  leafShadow.userData.noReflect = true; leafShadow.renderOrder = 1; book.add(leafShadow);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const shadeLeaf = p => {
    const lift = Math.pow(Math.sin(Math.PI * p), .8), j = R / 2; let xs = 0;
    for (let i = 1; i <= N; i++) { const k = (j * (N + 1) + i) * 3, X = lp[k], Y = lp[k + 1]; const a = Math.min(N, Math.round(Math.abs(X) / XN * N)); const px = X - .43 * Math.max(0, Y - (Y0 + PY[a])); if (Math.abs(px) > Math.abs(xs)) xs = px; }
    for (let c = 0; c < SC; c++) {
      let a = 0; if (Math.abs(xs) > .02) { const d = SXs[c] / xs; if (d > -.1) a = lift * .46 * (1 - smooth(.45, 1.06, d)) * (.5 + .5 * (1 - Math.min(1, Math.max(0, d)))) * smooth(-.1, .06, d); }
      for (let jj = 0; jj <= SR; jj++) scol[(jj * SC + c) * 4 + 3] = a * (1 - .7 * Math.pow(Math.abs(jj / SR * 2 - 1), 3));
    }
    sg.attributes.color.needsUpdate = true;
  };

  /* ---------- crimson satin ribbon bookmark with a V-cut tail ---------- */
  {
    const P = [[0, Y0 - .03, H / 2 - .1], [0, Y0 - .028, H / 2 + .02], [.004, CTOP + .007, H / 2 + .07], [.01, CTOP + .006, H / 2 + SQ - .02],
      [.018, TABLE + .045, H / 2 + SQ + .028], [.012, TABLE + .006, H / 2 + SQ + .15], [-.1, TABLE + .005, H / 2 + SQ + .4], [-.38, TABLE + .005, H / 2 + SQ + .6], [-.7, TABLE + .005, H / 2 + SQ + .7]].map(a => new THREE.Vector3(...a));
    const cv = new THREE.CatmullRomCurve3(P, false, 'centripetal'), S = 110, len = cv.getLength(), notch = .11, wd = .135;
    const pts = cv.getSpacedPoints(S); const pos = [], idx = []; let B = new THREE.Vector3(1, 0, 0); const T = new THREE.Vector3();
    const mid = cv.getPointAt(1 - notch / len);
    pts.forEach((p, i) => {
      cv.getTangentAt(Math.min(1, i / S), T); B.addScaledVector(T, -B.dot(T)).normalize();
      const m = i / S > 1 - notch / len ? mid : p; pos.push(p.x + B.x * wd / 2, p.y + B.y * wd / 2, p.z + B.z * wd / 2, m.x, m.y, m.z, p.x - B.x * wd / 2, p.y - B.y * wd / 2, p.z - B.z * wd / 2);
      if (i < S) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
    });
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
    const ribbon = new THREE.Mesh(rg, new THREE.MeshPhysicalMaterial({ color: 0xb40d2a, roughness: .36, sheen: 1, sheenRoughness: .32, sheenColor: new THREE.Color(0xff9d92), clearcoat: .3, clearcoatRoughness: .25, side: THREE.DoubleSide }));
    book.add(ribbon);
    const rs = stage.shadowBlob(-.25, H / 2 + SQ + .45, 1.1, .34, .22, TABLE + .002); rs.rotation.z = .5; book.add(rs);
  }

  /* ---------- champagne-metal pen resting on the cover at the foot of the pages ---------- */
  {
    const pen = new THREE.Group();
    const champ = M.metal(0xe7e1da, { roughness: .17 }), brushed = M.metal(0xe3dcd4, { roughness: .3 });
    const lacq = M.ceramic(0x4b0c1e, { roughness: .18, clearcoat: 1, clearcoatRoughness: .05 }), band = M.ember({ roughness: .2 });
    const lathe = (pts, mat) => pen.add(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48), mat));
    lathe([[0, 0], [.006, .004], [.014, .02], [.026, .07], [.036, .12], [.04, .14]], champ);
    lathe([[.04, .14], [.05, .17], [.058, .3], [.064, .5], [.066, .6]], lacq);
    lathe([[.066, .6], [.072, .61], [.074, .64], [.075, 1.36], [.074, 1.38]], champ);
    lathe([[.074, 1.38], [.08, 1.385], [.082, 1.4], [.082, 1.46], [.08, 1.475], [.079, 1.48]], band);
    lathe([[.079, 1.48], [.08, 1.5], [.08, 2.18], [.078, 2.22], [.07, 2.26], [.05, 2.285]], brushed);
    lathe([[.05, 2.285], [.04, 2.3], [.022, 2.312], [0, 2.316]], champ);
    const clip = new THREE.Mesh(rbox(.042, .62, .026, .012, 3), champ); clip.position.set(.103, 1.88, 0); clip.rotation.z = .02; pen.add(clip);
    const bridge = new THREE.Mesh(rbox(.05, .07, .05, .015, 3), champ); bridge.position.set(.088, 2.17, 0); pen.add(bridge);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.022, 20, 14), champ); ball.position.set(.1, 1.575, 0); pen.add(ball);
    pen.rotation.set(.5, 0, Math.PI / 2); pen.position.set(2.46, CTOP + .082, H / 2 + .088); book.add(pen);
    const ps = stage.shadowBlob(1.3, H / 2 + .09, 2.5, .2, .3, CTOP + .003); book.add(ps);
  }

  /* ---------- contact shadow of the book: a soft rounded rectangle ---------- */
  {
    const bw = 2 * (XN + SQ), bd = H + 2 * SQ, pad = .1;
    const t = canvasTexture((g, w, h) => { g.filter = 'blur(5px)'; g.fillStyle = 'rgba(30,20,22,1)'; const mx = w * pad / (bw + 2 * pad), my = h * pad / (bd + 2 * pad); rr(g, mx, my, w - 2 * mx, h - 2 * my, 10); g.fill(); }, 512, 512);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(bw + 2 * pad, bd + 2 * pad), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .42, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.set(0, TABLE + .002, .04); sh.userData.noReflect = true; book.add(sh);
  }

  /* ---------- framing guards: invisible points on the leaf's sweep, so auto-framing covers every pose ---------- */
  {
    const gg = new THREE.BoxGeometry(.01, .01, .01), gm = new THREE.MeshBasicMaterial();
    for (let a = 0; a <= 12; a++) { const th = a / 12 * Math.PI; for (const z of [-H / 2, H / 2]) { const m = new THREE.Mesh(gg, gm); m.position.set(Math.cos(th) * W, Y0 + Math.sin(th) * W, z); m.visible = false; m.userData.noReflect = true; book.add(m); } }
  }

  /* ---------- motion: turn → rest → turn back → rest (starts mid-turn, which is also the reduced-motion still) ---------- */
  const TURN = 3.8, REST = .9, CYC = 2 * (TURN + REST), T0 = REST + .55 * TURN;   // t = 0: leaf past upright, face towards the camera
  const ease = u => u * u * u * (u * (u * 6 - 15) + 10);
  const bounce = s => .07 * Math.exp(-5 * s) * Math.abs(Math.sin(10 * s));
  const step = t => {
    const c = (t + T0) % CYC; let p, dir, settle = 0;
    if (c < REST) { p = 0; dir = 1; settle = bounce(c); }
    else if (c < REST + TURN) { p = ease((c - REST) / TURN); dir = 1; }
    else if (c < 2 * REST + TURN) { p = 1; dir = -1; settle = -bounce(c - REST - TURN); }
    else { p = 1 - ease((c - 2 * REST - TURN) / TURN); dir = -1; }
    pose(p, dir, settle); shadeLeaf(p);
  };
  step(0);
  stage.on(t => step(reduced ? 0 : t));

  /* 3/4 product view from above; the engine adds the idle sway and pointer parallax */
  stage.o.rot = [.8, -.4]; stage.o.sway = .06; stage.o.py = .12; G.rotation.set(.8, -.4, 0);
  /* the engine's optional floor mirror assumes an upright group; this book is tilted towards the camera, so it opts out */
  book.traverse(m => { m.userData.noReflect = true; });
}
