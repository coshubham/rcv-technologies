/* RCV Technologies — "phone" scene module.
   Hero badge for the app-development pages. A premium phone with a champagne-metal frame and a deep crimson glass back shows
   the real RCV site capture (/assets/img/screens/phone.webp, or data-screen), cover-fitted to the screen's true aspect and
   slowly scrolling. It sways gently and, once every 14 s, makes one smooth full turn that reveals a detailed camera back
   (three lenses in champagne rings, flash, mic). With data-two="1" a second phone (porcelain back) stands behind it showing
   another part of the page. A frosted-glass notification banner pops out over the top of the screen twice per cycle (never
   during the turn); on single-phone pages a glossy crimson app tile floats at the lower left.
   The page's own photo (opts.photo) is already shown right beside the badge, so it is deliberately not put on the screens.
   Contract: export default build(stage, opts, lib) — see js/scenes/README.md. Opts used: two, screen, screen2, note, note2,
   floorY, reflect, backdrop, t0. Colours: crimson/wine, porcelain and champagne metal (green UI bits in the capture, e.g. a
   chat button, are recoloured to crimson); only tiny dark details (bezel line, lenses). 1 transmission material (the banner),
   ~32k triangles, no shadow maps. */
export default async function build(stage, opts, lib) {
  const { THREE, M, C, rbox } = lib;
  const o = opts || {}; const two = !!o.two; const reduced = !!lib.reduced; const FY = stage.o.floorY ?? -2.6;
  const SANS = "Manrope, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
  const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
  const ss = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10)); // smootherstep

  /* Wait briefly for the web fonts so canvas text is measured with the real family (never cut, never swapped later) */
  if (document.fonts && document.fonts.load) {
    try { await Promise.race([Promise.all([document.fonts.load(`700 64px Manrope`), document.fonts.load(`500 44px Manrope`), document.fonts.load(`700 150px 'Playfair Display'`)]), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fallback fonts are fine */ }
  }

  /* ---------- geometry helpers: true rounded rectangles (flat plates + pillow-edged slabs) ---------- */
  const rrect = (w, h, r, seg = 12) => { // rounded rectangle as a clean polygon (exact corner points, no near-duplicate start/end point,
    // which would make ExtrudeGeometry throw a bevel spike)
    r = Math.max(.001, Math.min(r, w / 2, h / 2)); const s = new THREE.Shape(), out = [];
    [[w / 2 - r, -h / 2 + r, -Math.PI / 2], [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI]].forEach(([cx, cy, a0]) => {
      for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2, p = [cx + Math.cos(a) * r, cy + Math.sin(a) * r], q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5) out.push(p); }
    });
    if (Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-5) out.pop();
    out.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return s;
  };
  const plate = (w, h, r) => { // flat rounded plate facing +z with normalised UVs (ShapeGeometry UVs are world units)
    const g = new THREE.ShapeGeometry(rrect(w, h, r)); const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
    uv.needsUpdate = true; return g;
  };
  const slab = (w, h, r, d, bevel = .03, bseg = 4) => { // rounded slab, pillowed edges, centred on the origin (z from -d/2 to d/2)
    const b = Math.min(bevel, d / 2 - .001);
    const g = new THREE.ExtrudeGeometry(rrect(w - 2 * b, h - 2 * b, r - b), { depth: d - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: bseg });
    g.translate(0, 0, -(d - 2 * b) / 2); return g;
  };
  /* Measured canvas text: the canvas is sized from measureText so words are never clipped, whatever font is active */
  const makeText = (lines, { pad = 12, align = 'center' } = {}) => {
    const c = document.createElement('canvas'); const g = c.getContext('2d'); let w = 0;
    for (const l of lines) { g.font = l.font; w = Math.max(w, g.measureText(l.text).width); }
    const W = Math.ceil(w + pad * 2), H = Math.ceil(lines.reduce((s, l) => s + l.h, 0) + pad * 2); c.width = W; c.height = H;
    g.textAlign = align; g.textBaseline = 'middle'; let y = pad;
    for (const l of lines) { g.font = l.font; g.fillStyle = l.color; g.fillText(l.text, align === 'center' ? W / 2 : pad, y + l.h / 2); y += l.h; }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, aspect: W / H };
  };
  const label = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false });

  /* ---------- screen captures: loaded once; palette guard: green UI bits become crimson, blue/teal photo tones a warm neutral ---------- */
  const tame = cv => {
    const cx = cv.getContext('2d'), id = cx.getImageData(0, 0, cv.width, cv.height), d = id.data; let hit = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2], m = gg - (r > b ? r : b);
      if (m > 22 && gg > 70) { const a = Math.min(1, (m - 10) / 100); d[i] = Math.min(255, r + a * 163); d[i + 1] = Math.max(0, gg - a * 195); d[i + 2] = Math.max(0, b - a * 56); hit++; }
      else if (b > r + 14 && b > gg - 8) { const L = .3 * r + .59 * gg + .11 * b, k = Math.min(1, (b - r - 14) / 50) * .88; d[i] = r + (L * 1.04 - r) * k; d[i + 1] = gg + (L - gg) * k; d[i + 2] = b + (L * .95 - b) * k; hit++; } // blue/teal tones in photos -> warm neutral, same lightness
    }
    if (hit) cx.putImageData(id, 0, 0);
  };
  const fallbackCanvas = () => lib.canvasTexture((g, w, h) => {
    g.fillStyle = '#f7f4ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, 150);
    g.fillStyle = '#fff'; g.font = `700 48px ${SANS}`; g.fillText('RCV', 40, 96);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 3 ? '#e2dcd5' : '#ece7e1'; g.fillRect(40, 220 + i * 150, w - 80 - (i % 3) * 120, i % 3 ? 26 : 110); }
  }, 780, 1680).image;
  const fits = [];
  const capture = url => { // a texture that shows a quiet placeholder until the (recoloured) capture arrives
    const t = new THREE.Texture(fallbackCanvas()); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
    const users = [t];
    const ready = new Promise(res => {
      new THREE.ImageLoader().load(url, img => {
        let src = img;
        try { const sc = Math.min(1, (lib.small ? 600 : 900) / img.width, 4096 / img.height), cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); tame(cv); src = cv; } catch (e) { /* show it as it is */ }
        t.image = src; users.forEach(u => { u.needsUpdate = true; }); fits.forEach(f => { if (users.includes(f.t)) f.st = null; }); res();
      }, undefined, () => res());
    });
    return { t, ready, share: () => { const c = t.clone(); c.needsUpdate = true; users.push(c); return c; } };
  };
  const capA = capture(o.screen || '/assets/img/screens/phone.webp');
  const capB = two ? (o.screen2 ? capture(o.screen2) : { t: capA.share(), ready: capA.ready }) : null;
  await Promise.race([Promise.all([capA.ready, capB ? capB.ready : 0]), new Promise(r => setTimeout(r, 2200))]);

  /* ---------- shared materials ---------- */
  const champagne = M.metal(0xe7e1da, { roughness: .2 });
  /* screen glass as a pure reflection layer (black base, additive): real HDR reflections and Fresnel edges while the capture
     underneath stays sharp (a transmission material would show it through a blurred, lower-resolution buffer) */
  const screenGlass = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .05, metalness: 0, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: .75, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x141212, roughness: .5, metalness: 0 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x0a090b, roughness: .05, metalness: 0, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.8 });
  const lensRingMat = M.metal(0xe7e1da, { roughness: .14 });
  const lensBarrelMat = M.metal(0x2a2624, { roughness: .4 });
  const flashMat = M.ceramic(0xf3eee8, { roughness: .35, clearcoat: .9 });
  const backs = {
    crimson: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(C.ember).lerp(new THREE.Color(C.clay), .48), roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .035, envMapIntensity: 1.15 }),
    porcelain: M.ceramic(0xf7f4ef, { roughness: .24, clearcoat: .9, clearcoatRoughness: .07 }),
  };

  /* ---------- a phone: pillow-edged champagne frame, slim bezel, screen, glass, side keys and a detailed back ---------- */
  function phone(tex, finish) {
    const W = 2, H = 4.1, D = .26, R = .38; const g = new THREE.Group();
    g.add(new THREE.Mesh(slab(W, H, R, D, .045, 5), champagne));
    const bezel = new THREE.Mesh(plate(W - .1, H - .1, R - .05), bezelMat); bezel.position.z = D / 2 + .002; g.add(bezel);
    const SW = 1.84, SH = 3.94;
    const scr = new THREE.Mesh(plate(SW, SH, R - .1), M.photo(tex)); scr.position.z = D / 2 + .004; g.add(scr);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.05, 24), bezelMat); hole.position.set(0, SH / 2 - .15, D / 2 + .006); g.add(hole);
    const holeLens = new THREE.Mesh(new THREE.CircleGeometry(.028, 20), lensGlass); holeLens.position.set(0, SH / 2 - .15, D / 2 + .007); g.add(holeLens);
    const cover = new THREE.Mesh(slab(W - .06, H - .06, R - .03, .03, .008, 3), screenGlass); cover.position.z = D / 2 + .008 + .015; g.add(cover);
    const key = (x, y, h) => { const k = new THREE.Mesh(rbox(.05, h, .09, .02, 2), champagne); k.position.set(x, y, 0); g.add(k); };
    key(W / 2 + .005, .55, .62); key(-W / 2 - .005, 1.0, .34); key(-W / 2 - .005, .58, .34); key(-W / 2 - .005, 1.42, .16);
    // back (local +z = outward from the back)
    const back = new THREE.Group(); back.position.z = -D / 2; back.rotation.y = Math.PI; g.add(back);
    const bp = new THREE.Mesh(plate(W - .1, H - .1, R - .05), backs[finish]); bp.position.z = .002; back.add(bp);
    const wm = makeText([{ text: 'RCV', font: `600 120px ${SERIF}`, color: finish === 'crimson' ? 'rgba(253,252,250,.62)' : 'rgba(200,16,46,.78)', h: 150 }], { pad: 16 });
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(.34 * wm.aspect, .34), label(wm.tex)); mark.position.set(0, -.55, .004); back.add(mark);
    const plat = new THREE.Group(); plat.position.set(.42, 1.38, .003); back.add(plat);
    const platMesh = new THREE.Mesh(slab(.86, .86, .24, .06, .014, 3), M.metal(0xdcd5cd, { roughness: .26 })); platMesh.position.z = .03; plat.add(platMesh);
    const lens = (x, y, r) => {
      const L = new THREE.Group(); L.position.set(x, y, .06); plat.add(L);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * .2, 12, 40), lensRingMat); ring.position.z = .018; L.add(ring);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r * .92, r * .92, .035, 36), lensBarrelMat); barrel.rotation.x = Math.PI / 2; barrel.position.z = .0175; L.add(barrel);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(r * .66, 28, 18), lensGlass); glass.scale.z = .35; glass.position.z = .03; L.add(glass);
    };
    lens(-.2, .2, .16); lens(-.2, -.2, .16); lens(.2, 0, .16);
    const flash = new THREE.Group(); flash.position.set(.22, .3, .06); plat.add(flash);
    const fr = new THREE.Mesh(new THREE.TorusGeometry(.062, .012, 8, 28), lensRingMat); fr.position.z = .006; flash.add(fr);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(.056, 24), flashMat); fl.position.z = .008; flash.add(fl);
    const mic = new THREE.Mesh(new THREE.CircleGeometry(.03, 16), bezelMat); mic.position.set(.22, -.3, .062); plat.add(mic);
    return { g, tex, aspect: SW / SH };
  }

  /* ---------- screens: cover-fit (true aspect, never stretched); tall pages scroll up and down, wide images pan ---------- */
  const fit = (t, aspect) => {
    const img = t.image; if (!img || !img.width) return null; const ia = img.width / img.height;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    if (ia < aspect) { const f = ia / aspect; t.repeat.set(1, f); t.offset.set(0, 1 - f); return { axis: 'y', range: 1 - f }; }
    const f = aspect / ia; t.repeat.set(f, 1); t.offset.set((1 - f) / 2, 0); return { axis: 'x', range: 1 - f };
  };
  const scroller = (t, aspect, phase, period) => {
    const rec = { t, aspect, st: null }; fits.push(rec);
    stage.on(tt => {
      if (!rec.st) { rec.st = fit(t, aspect); if (!rec.st) return; }
      if (rec.st.range <= 0 || reduced) return;
      const p = Math.sin(tt * (2 * Math.PI / period) + phase) * .5 + .5, e = p * p * (3 - 2 * p);
      if (rec.st.axis === 'y') t.offset.y = rec.st.range * (1 - e); else t.offset.x = rec.st.range * e;
    });
  };

  /* ---------- layout ---------- */
  const A_POS = two ? [.72, -.22, .3] : [0, -.22, 0], B_POS = [-.95, -.4, -.95];
  const PILL = [A_POS[0] + .44, A_POS[1] + 1.42, A_POS[2] + 1.02];  // banner over the top of A's screen, popping out to the right
  const TILE = [-1.5, -1.6, .6];                                      // single-phone pages: crimson app tile, lower left

  const A = phone(capA.t, 'crimson'); A.g.position.set(...A_POS); A.g.rotation.y = -.32; stage.group.add(A.g);
  stage.shadowBlob(A_POS[0], A_POS[2], 2.5, 1.15, .26);
  scroller(A.tex, A.aspect, -Math.PI / 2, 26);
  let B = null;
  if (two) {
    B = phone(capB.t, 'porcelain'); B.g.position.set(...B_POS); B.g.rotation.set(.02, .5, -.02); stage.group.add(B.g);
    stage.shadowBlob(B_POS[0], B_POS[2], 2.3, 1.05, .18);
    scroller(B.tex, B.aspect, -Math.PI / 2 + 2.2, 30);
  }

  /* notification banner: frosted glass, crimson app icon with a serif R, two measured text lines */
  const pill = new THREE.Group(); pill.position.set(...PILL); stage.group.add(pill);
  const title = o.note || 'New enquiry', sub = o.note2 || 'Website · just now';
  const nt = makeText([{ text: title, font: `700 64px ${SANS}`, color: '#1e1b1a', h: 80 }, { text: sub, font: `500 44px ${SANS}`, color: '#6f6865', h: 56 }], { pad: 10, align: 'left' });
  const PS = 1.22, TH = .34 * PS, TW = TH * nt.aspect, IC = .3 * PS, PAD = .14 * PS, GAP = .09 * PS, PW = PAD + IC + GAP + TW + PAD, PH = .56 * PS;
  const pillBody = new THREE.Mesh(slab(PW, PH, PH / 2, .13, .035, 4), M.frosted({ thickness: .25, roughness: .4 })); pill.add(pillBody);
  const icon = new THREE.Mesh(slab(IC, IC, IC * .26, .08, .02, 3), M.ember({ roughness: .22 })); icon.position.set(-PW / 2 + PAD + IC / 2, 0, .085); pill.add(icon);
  const rt = makeText([{ text: 'R', font: `700 150px ${SERIF}`, color: '#ffffff', h: 170 }], { pad: 20 });
  const rMesh = new THREE.Mesh(new THREE.PlaneGeometry(IC * .66 * rt.aspect, IC * .66), label(rt.tex)); rMesh.position.set(icon.position.x, 0, icon.position.z + .042); pill.add(rMesh);
  const tMesh = new THREE.Mesh(new THREE.PlaneGeometry(TW, TH), label(nt.tex)); tMesh.position.set(-PW / 2 + PAD + IC + GAP + TW / 2, 0, .067); pill.add(tMesh);
  const fade = [rMesh.material, tMesh.material];

  /* single-phone pages: a glossy crimson app tile with a raised porcelain R, floating at the lower left */
  let tile = null;
  if (!two) {
    tile = new THREE.Group(); tile.position.set(...TILE); tile.rotation.set(-.1, .38, -.06); stage.group.add(tile);
    tile.add(new THREE.Mesh(slab(1, 1, .25, .26, .06, 5), M.ember({ roughness: .2, clearcoat: 1, clearcoatRoughness: .05 })));
    const R2 = makeText([{ text: 'R', font: `700 200px ${SERIF}`, color: '#fdfcfa', h: 220 }], { pad: 18 });
    const rr2 = new THREE.Mesh(new THREE.PlaneGeometry(.62 * R2.aspect, .62), new THREE.MeshPhysicalMaterial({ map: R2.tex, transparent: true, roughness: .25, clearcoat: .9, depthWrite: false }));
    rr2.position.z = .132; tile.add(rr2);
    stage.shadowBlob(TILE[0], TILE[2], 1.1, .6, .12);
  }

  /* ---------- motion: one 14 s cycle — banner in/out twice, then one smooth full turn of the front phone ---------- */
  const CYC = 14, SPIN0 = 10.6, SPIN = 3.2, T0 = +o.t0 || 0;
  const POPS = [[.6, 4.6], [6.0, 9.6]], IN = .55, OUT = .5;
  const eob = u => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }; // ease-out-back
  const update = tt => {
    const t = tt + T0, u = t % CYC;
    const spin = u > SPIN0 ? Math.PI * 2 * ss((u - SPIN0) / SPIN) : 0;
    A.g.rotation.y = -.32 + Math.sin(t * .4) * .12 + spin;
    A.g.rotation.x = .035 + Math.sin(t * .5) * .03; A.g.rotation.z = Math.sin(t * .37) * .02; A.g.position.y = A_POS[1] + Math.sin(t * .6) * .08;
    if (B) { B.g.rotation.y = .5 + Math.sin(t * .3) * .1; B.g.position.y = B_POS[1] + Math.sin(t * .5 + 2) * .1; }
    if (tile) { tile.position.y = TILE[1] + Math.sin(t * .7 + 2.2) * .09; tile.rotation.y = .38 + Math.sin(t * .45 + 1) * .14; }
    let s = .001, op = 0, drop = 0;
    for (const [a, b] of POPS) {
      if (u >= a && u < a + IN) { const k = (u - a) / IN; s = Math.max(.001, eob(k)); op = Math.min(1, k * 2); drop = (1 - ss(k)) * .25; }
      else if (u >= a + IN && u < b) { s = 1; op = 1; }
      else if (u >= b && u < b + OUT) { const k = (u - b) / OUT; s = Math.max(.001, 1 - k * k); op = 1 - k; drop = -.22 * k * k; }
    }
    pill.scale.setScalar(s); pill.position.y = PILL[1] + drop + Math.sin(t * 1.1) * .03; pill.visible = s > .002;
    for (const m of fade) m.opacity = op;
  };
  if (!reduced) stage.on(update);
  else { pill.scale.setScalar(1); fade.forEach(m => { m.opacity = 1; }); }
  /* reduced motion: the engine renders one frame; re-fit and re-render once the captures arrive */
  if (reduced) { const iv = setInterval(() => { let done = true; for (const r of fits) { if (!r.st) r.st = fit(r.t, r.aspect); if (!r.st) done = false; } stage.render(); if (done) clearInterval(iv); }, 250); setTimeout(() => clearInterval(iv), 15000); }

  stage.o.rot = stage.o.rot || [.1, 0]; stage.o.sway = stage.o.sway ?? .05; stage.o.py = stage.o.py ?? .12; stage.o.camY = stage.o.camY ?? 1;
  /* Glossy floor: the engine adds it for data-reflect="1"; otherwise on by default when the scene has its own backdrop
     (a mirrored copy under a transparent corner badge gets clipped by the container, so it is off there unless forced) */
  if (o.reflect !== '1' && o.reflect !== '0' && o.backdrop !== false) stage.reflectGroup(.14);
}
