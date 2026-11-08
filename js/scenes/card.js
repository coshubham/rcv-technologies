/* RCV Technologies — scene module "card".
   A premium payment card: crimson-to-burgundy gradient painted on a canvas, silver-tipped embossed numbers ("4242 •••• 2026"),
   raised name and expiry (real bump-mapped relief that catches the studio light), a brushed-metal chip with contact grooves,
   a contactless symbol and a holographic patch. It floats and breathes, shows its face for ~6 s, then flips over to show a
   deep-wine back (magnetic strip, signed signature panel with a matte roughness map, CVV box) for a moment and flips home.
   Accents: a small porcelain shopping bag with crimson handles stands at its right, a neat stack of champagne-metal rupee
   coins rests at its left and one more coin hovers and turns above the stack. Soft contact shadows track every object
   (the card's shadow narrows while it flips); the glossy floor reflection is on by default when the scene has a backdrop.
   It is the hero badge beside the page's photo, so opts.photo is deliberately not shown again here.
   Contract: export default build(stage, opts, lib) — see js/scenes/README.md. Opts used: floorY, reflect, backdrop, t0.
   Colours: lib.C (crimson, burgundy and blends of them), porcelain and champagne metal only. No transmission materials.
   All canvas text is measured glyph by glyph and fitted to its box after the web fonts are awaited, so no word is ever cut.
   ~24k triangles, no shadow maps. */
export default async function build(stage, opts, lib) {
  const { THREE, M, C, rbox, canvasTexture } = lib;
  const o = opts || {}; const reduced = !!lib.reduced; const FY = stage.o.floorY ?? -2.6;
  const SANS = "Manrope, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
  const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  const mix = (a, b, k) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
  const ss = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10)); // smootherstep
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

  /* Wait briefly for the web fonts so canvas text is measured with the real family (never cut, never swapped later) */
  if (document.fonts && document.fonts.load) {
    try { await Promise.race([Promise.all(['700 64px Manrope', '600 64px Manrope', "600 64px 'Playfair Display'"].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1800))]); } catch (e) { /* fallback fonts are fine */ }
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
  const normUV = (g, w, h) => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5); uv.needsUpdate = true; return g; };
  const plate = (w, h, r, seg = 12) => normUV(new THREE.ShapeGeometry(rrect(w, h, r), seg), w, h); // flat rounded plate facing +z, UVs 0..1
  const slab = (w, h, r, d, bevel = .03, seg = 14, bseg = 4) => { // rounded slab with pillowed edges, centred on the origin (z from -d/2 to d/2)
    const b = Math.min(bevel, d / 2 - .001);
    const g = new THREE.ExtrudeGeometry(rrect(w - 2 * b, h - 2 * b, r - b), { depth: d - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: bseg, curveSegments: seg });
    g.translate(0, 0, -(d - 2 * b) / 2); return normUV(g, w, h);
  };

  /* ---------- text helpers: glyph-by-glyph letter spacing + fit-to-width, so a label can never be clipped ---------- */
  const spaced = (g, text, x, y, sp, draw = true) => {
    const chars = [...text], ws = chars.map(ch => g.measureText(ch).width); const w = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    if (draw) { let cx = x; chars.forEach((ch, i) => { g.fillText(ch, cx, y); cx += ws[i] + sp; }); }
    return w;
  };
  const fitText = (g, text, weight, px, family, maxW, spacing = 0) => { // largest size (<= px) at which the whole text fits maxW
    let s = px; for (;;) { g.font = `${weight} ${s}px ${family}`; const sp = spacing * s / px, w = spaced(g, text, 0, 0, sp, false); if (w <= maxW || s <= 8) return { sp, w, s }; s -= 2; }
  };
  const emboss = (g, text, x, y, sp, size, depth = 3) => { // raised lettering: dark lower-right edge, light upper-left edge, silver-tipped face
    g.fillStyle = 'rgba(40,0,10,.5)'; spaced(g, text, x + depth, y + depth, sp);
    g.fillStyle = 'rgba(255,255,255,.5)'; spaced(g, text, x - depth * .75, y - depth * .75, sp);
    const fg = g.createLinearGradient(0, y - size * .5, 0, y + size * .5); fg.addColorStop(0, '#fbf9f6'); fg.addColorStop(.5, '#d9d2cb'); fg.addColorStop(1, '#f4f0eb'); g.fillStyle = fg; spaced(g, text, x, y, sp);
  };
  const makeText = (lines, pad = 14) => { // canvas sized from the measured text, so words are never clipped whatever font is active
    const c = document.createElement('canvas'); const g = c.getContext('2d'); let w = 0;
    for (const l of lines) { g.font = l.font; l.w = spaced(g, l.text, 0, 0, l.sp || 0, false); w = Math.max(w, l.w); }
    c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(lines.reduce((s, l) => s + l.h, 0) + pad * 2);
    g.textBaseline = 'middle'; g.textAlign = 'left'; let y = pad;
    for (const l of lines) { g.font = l.font; g.fillStyle = l.color; spaced(g, l.text, (c.width - l.w) / 2, y + l.h / 2, l.sp || 0); y += l.h; }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, aspect: c.width / c.height };
  };

  /* ---------- card faces (drawn in a 1536 x 960 space; phones get a smaller canvas, same layout) ---------- */
  const TW = lib.small ? 1024 : 1536, TH = lib.small ? 640 : 960, PAD = 112;
  const arcs = (g, cx, cy) => [26, 52, 78, 104].forEach(r => { g.beginPath(); g.arc(cx, cy, r, -.68, .68); g.stroke(); });
  const frontDraw = bump => (g, w, h) => {
    g.scale(w / 1536, h / 960); w = 1536; h = 960; g.textBaseline = 'middle'; g.textAlign = 'left'; let f;
    if (bump) { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.filter = 'blur(1.4px)'; }
    else {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(C.ember)); gr.addColorStop(.5, mix(C.ember, C.clay, .45)); gr.addColorStop(1, hex(C.clay)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const sh = g.createRadialGradient(w * .18, h * .08, 10, w * .3, h * .25, w * .8); sh.addColorStop(0, 'rgba(255,255,255,.17)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
      const vg = g.createRadialGradient(w * .92, h * 1.05, 20, w * .85, h * .95, w * .8); vg.addColorStop(0, 'rgba(20,0,6,.3)'); vg.addColorStop(1, 'rgba(20,0,6,0)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.055)'; g.lineWidth = 2; for (let r = 140; r < 1750; r += 28) { g.beginPath(); g.arc(w * 1.04, h * 1.12, r, Math.PI, Math.PI * 1.5); g.stroke(); } // fine guilloche curves
      g.fillStyle = '#ffffff'; f = fitText(g, 'RCV', 600, 94, SERIF, 400, 6); spaced(g, 'RCV', PAD, 132, f.sp);
      g.fillStyle = 'rgba(255,255,255,.82)'; f = fitText(g, 'TECHNOLOGIES', 700, 28, SANS, 420, 8); spaced(g, 'TECHNOLOGIES', PAD + 2, 200, f.sp);
    }
    /* holographic patch (top-right) */
    const hx = w - PAD - 150, hy = 86;
    if (bump) { g.fillStyle = '#9c9c9c'; rr(g, hx, hy, 150, 104, 16); g.fill(); }
    else {
      const hg = g.createLinearGradient(hx, hy, hx + 150, hy + 104); [[0, 'rgba(255,255,255,.92)'], [.3, 'rgba(214,208,201,.9)'], [.55, 'rgba(252,250,247,.95)'], [.8, 'rgba(200,193,186,.9)'], [1, 'rgba(255,255,255,.92)']].forEach(([k, c]) => hg.addColorStop(k, c));
      g.fillStyle = hg; rr(g, hx, hy, 150, 104, 16); g.fill();
      g.fillStyle = 'rgba(74,69,67,.5)'; f = fitText(g, 'RCV', 600, 44, SERIF, 120, 3); spaced(g, 'RCV', hx + (150 - f.w) / 2, hy + 54, f.sp);
    }
    /* contactless symbol, right of the chip */
    g.lineCap = 'round'; g.lineWidth = 9;
    if (bump) { g.strokeStyle = '#ffffff'; arcs(g, 468, 366); }
    else { g.strokeStyle = 'rgba(40,0,10,.45)'; arcs(g, 470.5, 368.5); g.strokeStyle = 'rgba(255,255,255,.92)'; arcs(g, 468, 366); }
    /* embossed number, name and expiry */
    const num = '4242 •••• 2026'; f = fitText(g, num, 700, 112, SANS, w - PAD * 2, 10);
    if (bump) { g.fillStyle = '#ffffff'; spaced(g, num, PAD, 612, f.sp); } else emboss(g, num, PAD, 612, f.sp, f.s, 3.5);
    const name = 'RCV TECHNOLOGIES'; f = fitText(g, name, 700, 46, SANS, 760, 5);
    if (bump) { g.fillStyle = '#ffffff'; spaced(g, name, PAD, 812, f.sp); } else emboss(g, name, PAD, 812, f.sp, f.s, 2.2);
    const ex = 1010;
    if (!bump) { g.fillStyle = 'rgba(255,255,255,.78)'; fitText(g, 'VALID', 700, 20, SANS, 90, 1); spaced(g, 'VALID', ex, 798, 1); fitText(g, 'THRU', 700, 20, SANS, 90, 1); spaced(g, 'THRU', ex, 824, 1); }
    f = fitText(g, '12/30', 700, 46, SANS, 220, 4);
    if (bump) { g.fillStyle = '#ffffff'; spaced(g, '12/30', ex + 96, 812, f.sp); } else emboss(g, '12/30', ex + 96, 812, f.sp, f.s, 2.2);
    if (bump) g.filter = 'none';
  };
  const backDraw = (g, w, h) => {
    g.scale(w / 1536, h / 960); w = 1536; h = 960; g.textBaseline = 'middle'; g.textAlign = 'left'; let f;
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, mix(C.clay, C.espresso, .12)); gr.addColorStop(1, mix(C.clay, C.espresso, .5)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sh = g.createRadialGradient(w * .8, h * .1, 10, w * .7, h * .2, w * .8); sh.addColorStop(0, 'rgba(255,255,255,.09)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    /* magnetic strip */
    const sg = g.createLinearGradient(0, 96, 0, 262); sg.addColorStop(0, '#1c1919'); sg.addColorStop(.35, '#0f0d0d'); sg.addColorStop(.7, '#262222'); sg.addColorStop(1, '#141111'); g.fillStyle = sg; g.fillRect(0, 96, w, 166);
    const sn = g.createLinearGradient(0, 96, w, 262); sn.addColorStop(0, 'rgba(255,255,255,0)'); sn.addColorStop(.45, 'rgba(255,255,255,.07)'); sn.addColorStop(.55, 'rgba(255,255,255,.07)'); sn.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sn; g.fillRect(0, 96, w, 166);
    /* signature panel: ivory paper, fine burgundy hatching, an ink signature */
    const px = PAD, py = 356, pw = 928, ph = 164;
    g.fillStyle = '#f3eee7'; rr(g, px, py, pw, ph, 8); g.fill();
    g.save(); rr(g, px, py, pw, ph, 8); g.clip(); g.strokeStyle = 'rgba(122,15,34,.16)'; g.lineWidth = 1.5;
    for (let x = px - 200; x < px + pw + 40; x += 12) { g.beginPath(); g.moveTo(x, py + ph); g.lineTo(x + ph, py); g.stroke(); }
    g.strokeStyle = '#2a2424'; g.lineWidth = 4.5; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(176, 484); g.bezierCurveTo(206, 372, 270, 366, 240, 436); g.bezierCurveTo(222, 478, 290, 476, 324, 438); g.bezierCurveTo(354, 404, 318, 396, 330, 432);
    g.bezierCurveTo(346, 472, 416, 460, 446, 428); g.bezierCurveTo(474, 398, 502, 444, 540, 432); g.bezierCurveTo(574, 420, 596, 456, 656, 436); g.stroke();
    g.lineWidth = 3.5; g.beginPath(); g.moveTo(196, 500); g.bezierCurveTo(320, 526, 540, 486, 672, 494); g.stroke(); g.restore();
    /* CVV box */
    g.fillStyle = '#fbf9f6'; rr(g, 1080, py, 184, ph, 8); g.fill();
    g.fillStyle = '#6f6865'; f = fitText(g, 'CVV', 700, 22, SANS, 120, 3); spaced(g, 'CVV', 1080 + (184 - f.w) / 2, py + 34, f.sp);
    g.fillStyle = '#2a2424'; f = fitText(g, '•••', 700, 54, SANS, 160, 6); spaced(g, '•••', 1080 + (184 - f.w) / 2, py + 104, f.sp);
    /* captions and wordmark */
    g.fillStyle = 'rgba(255,255,255,.72)'; const cap = 'AUTHORISED SIGNATURE · NOT VALID UNLESS SIGNED'; f = fitText(g, cap, 600, 22, SANS, pw, 2); spaced(g, cap, px, 556, f.sp);
    g.fillStyle = 'rgba(255,255,255,.78)'; const iss = 'Issued by RCV Technologies, Noida · 24/7 customer care'; f = fitText(g, iss, 500, 28, SANS, 900, 0); spaced(g, iss, px, 806, f.sp);
    g.fillStyle = 'rgba(255,255,255,.92)'; f = fitText(g, 'www.rcvtechnologies.com', 700, 30, SANS, 900, 1); spaced(g, 'www.rcvtechnologies.com', px, 852, f.sp);
    g.fillStyle = '#ffffff'; f = fitText(g, 'RCV', 600, 84, SERIF, 380, 6); spaced(g, 'RCV', w - PAD - f.w, 826, f.sp);
    g.fillStyle = 'rgba(255,255,255,.7)'; f = fitText(g, 'TECHNOLOGIES', 700, 24, SANS, 380, 7); spaced(g, 'TECHNOLOGIES', w - PAD - f.w, 890, f.sp);
  };
  const frontTex = canvasTexture(frontDraw(false), TW, TH);
  const frontBump = canvasTexture(frontDraw(true), TW, TH); frontBump.colorSpace = THREE.NoColorSpace;
  const backTex = canvasTexture(backDraw, TW, TH);
  const backRough = canvasTexture((g, w, h) => { // roughness: semi-gloss body, glossier strip, matte paper panels
    const k = w / 1536; g.scale(k, k); g.fillStyle = '#5c5c5c'; g.fillRect(0, 0, 1536, 960); g.fillStyle = '#3a3a3a'; g.fillRect(0, 96, 1536, 166);
    g.fillStyle = '#e8e8e8'; rr(g, PAD, 356, 928, 164, 8); g.fill(); rr(g, 1080, 356, 184, 164, 8); g.fill();
  }, 768, 480); backRough.colorSpace = THREE.NoColorSpace;

  /* ---------- the card ---------- */
  const CY = .35, CW = 3.8, CH = 2.4, CD = .1, CR = .16, CS = 1.08; // CS: the card is drawn a touch larger than the accents
  const cardG = new THREE.Group(); cardG.position.set(0, CY, 0); cardG.scale.setScalar(CS); stage.group.add(cardG);
  const edgeMat = M.ceramic(C.clay, { roughness: .34, clearcoat: .8, clearcoatRoughness: .12 });
  const frontMat = new THREE.MeshPhysicalMaterial({ map: frontTex, bumpMap: frontBump, bumpScale: .012, roughness: .36, clearcoat: .9, clearcoatRoughness: .14, envMapIntensity: 1 });
  const backMat = new THREE.MeshPhysicalMaterial({ map: backTex, roughnessMap: backRough, roughness: 1, clearcoat: .55, clearcoatRoughness: .2, envMapIntensity: 1 });
  cardG.add(new THREE.Mesh(slab(CW, CH, CR, CD, .022, 16, 3), edgeMat));
  const front = new THREE.Mesh(plate(CW - .07, CH - .07, CR - .035), frontMat); front.position.z = CD / 2 + .0015; cardG.add(front);
  const back = new THREE.Mesh(plate(CW - .07, CH - .07, CR - .035), backMat); back.position.z = -CD / 2 - .0015; back.rotation.y = Math.PI; cardG.add(back);
  /* chip: brushed silver with contact grooves (colour + bump) */
  const grooves = (g, w, h, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; rr(g, 18, 18, w - 36, h - 36, 22); g.stroke(); g.beginPath(); [.34, .66].forEach(f => { g.moveTo(18, h * f); g.lineTo(w * .34, h * f); g.moveTo(w * .66, h * f); g.lineTo(w - 18, h * f); }); g.stroke(); rr(g, w * .34, h * .24, w * .32, h * .52, 14); g.stroke(); };
  const chipMap = canvasTexture((g, w, h) => { g.fillStyle = '#d9d4ce'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); grooves(g, w, h, 'rgba(60,56,54,.55)', 5); }, 256, 192);
  const chipBump = canvasTexture((g, w, h) => { g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, w, h); g.filter = 'blur(1px)'; grooves(g, w, h, '#1a1a1a', 7); g.filter = 'none'; }, 256, 192); chipBump.colorSpace = THREE.NoColorSpace;
  const chip = new THREE.Mesh(slab(.64, .48, .06, .05, .012, 10, 3), M.metal(0xffffff, { roughness: .3, map: chipMap, bumpMap: chipBump, bumpScale: .006 }));
  chip.position.set(-1.25, .27, CD / 2 + .025); cardG.add(chip);
  const cardBlob = stage.shadowBlob(0, -.1, 3.9, 1.5, .17);

  /* ---------- champagne-metal rupee coins: raised rim (lathe), struck face with a bump-mapped ₹ and bead ring ---------- */
  const CR0 = .42, FR = CR0 * .76, HT = .03, RT = .044;        // coin radius, face radius, half-thickness at the face / at the rim
  const coinMetal = M.metal(0xe7e1da, { roughness: .22 });
  const rimGeo = new THREE.LatheGeometry([[FR, -HT], [FR + .02, -RT], [CR0 - .024, -RT], [CR0, -RT + .018], [CR0, RT - .018], [CR0 - .024, RT], [FR + .02, RT], [FR, HT]].map(([x, y]) => new THREE.Vector2(x, y)), 72);
  const rupee = (g, cx, cy, s) => { // the ₹ sign drawn with strokes (no font needed): two bars, the bowl, the diagonal leg
    const x0 = cx - s * .3, x1 = cx + s * .3, y0 = cy - s * .5; g.lineWidth = s * .11; g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.moveTo(x0, y0 + s * .24); g.lineTo(x1, y0 + s * .24); g.stroke();
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(cx - s * .06, y0); g.arc(cx - s * .06, y0 + s * .22, s * .22, -Math.PI / 2, Math.PI / 2); g.lineTo(x0, y0 + s * .44); g.stroke();
    g.lineCap = 'round'; g.beginPath(); g.moveTo(x0 + s * .04, y0 + s * .46); g.lineTo(cx + s * .24, y0 + s * .98); g.stroke();
  };
  const faceDraw = bump => (g, w) => {
    const c = w / 2; g.fillStyle = bump ? '#7a7a7a' : '#e9e3dc'; g.fillRect(0, 0, w, w);
    if (!bump) { const sh = g.createLinearGradient(0, 0, w, w); sh.addColorStop(0, 'rgba(255,255,255,.3)'); sh.addColorStop(1, 'rgba(110,98,90,.16)'); g.fillStyle = sh; g.fillRect(0, 0, w, w); }
    g.fillStyle = bump ? '#ffffff' : 'rgba(150,138,128,.8)'; for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * w * .43, c + Math.sin(a) * w * .43, w * .011, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = bump ? '#ffffff' : 'rgba(132,120,111,.92)'; rupee(g, c + w * .01, c, w * .46);
    if (!bump) { g.globalAlpha = .55; g.strokeStyle = '#ffffff'; rupee(g, c - w * .005, c - w * .008, w * .46); g.globalAlpha = 1; } // light upper edge: struck relief
  };
  const coinFace = canvasTexture(faceDraw(false), 256, 256);
  const coinBump = canvasTexture(faceDraw(true), 256, 256); coinBump.colorSpace = THREE.NoColorSpace;
  const faceMat = M.metal(0xffffff, { roughness: .26, map: coinFace, bumpMap: coinBump, bumpScale: .006 });
  const faceGeo = new THREE.CircleGeometry(FR + .003, 56);
  const coin = () => {
    const g = new THREE.Group(); g.add(new THREE.Mesh(rimGeo, coinMetal));
    [1, -1].forEach(sg => { const f = new THREE.Mesh(faceGeo, faceMat); f.rotation.x = -sg * Math.PI / 2; f.position.y = sg * HT; g.add(f); });
    return g;
  };
  const STACK = [-1.9, .7]; const stack = new THREE.Group(); stack.position.set(STACK[0], FY, STACK[1]); stage.group.add(stack);
  [[0, 0, .3], [.05, -.03, 1.4], [-.03, .04, 2.5]].forEach(([dx, dz, ry], i) => { const c = coin(); c.position.set(dx, RT + i * (2 * RT + .003), dz); c.rotation.set(0, ry, i ? (i % 2 ? .012 : -.01) : 0); stack.add(c); });
  stage.shadowBlob(STACK[0], STACK[1], 1.1, .7, .36);
  /* the hovering coin: tilted to show its face, slowly turning about the vertical (outer) while it bobs */
  const FLY = [-1.92, -1.7, .75]; const flyO = new THREE.Group(); flyO.position.set(...FLY); stage.group.add(flyO); // clear of the stack below and of the card's sweep above (card bottom >= -1.02)
  const flyI = coin(); flyI.rotation.x = 1.22; flyO.add(flyI);
  const flyBlob = stage.shadowBlob(FLY[0], FLY[2], .8, .45, .14);

  /* ---------- small ceramic shopping bag (tapered rounded box, crimson rope handles, printed wordmark) ---------- */
  const bag = new THREE.Group(); bag.position.set(2.08, FY, .72); bag.rotation.y = -.38; stage.group.add(bag);
  const BW = 1.12, BH = 1.28, BD = .52;
  const bagGeo = rbox(BW, BH, BD, .06, 5); { const p = bagGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + .09 * (p.getY(i) / BH); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } p.needsUpdate = true; }
  const body = new THREE.Mesh(bagGeo, M.ceramic(C.porcelain, { roughness: .3, clearcoat: .75, clearcoatRoughness: .15 })); body.position.y = BH / 2; bag.add(body);
  const handleMat = M.ember({ roughness: .22 });
  [1, -1].forEach(sg => { const hd = new THREE.Mesh(new THREE.TorusGeometry(.3, .032, 12, 40, Math.PI), handleMat); hd.position.set(0, BH - .02, sg * (BD / 2 * 1.045 - .08)); bag.add(hd); });
  const lbl = makeText([{ text: 'RCV', font: `600 150px ${SERIF}`, color: hex(C.ember), h: 170, sp: 6 }, { text: 'TECHNOLOGIES', font: `700 34px ${SANS}`, color: hex(C.cocoa), h: 46, sp: 7 }]);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(.46 * lbl.aspect, .46), new THREE.MeshPhysicalMaterial({ map: lbl.tex, transparent: true, roughness: .55, clearcoat: .4, depthWrite: false }));
  label.position.set(0, BH / 2 + .05, BD / 2 * 1.0035 + .008); label.rotation.x = .018; bag.add(label);
  stage.shadowBlob(2.08, .72, 1.6, .95, .34);

  /* ---------- motion: face 6.2 s, flip 1.6 s (eased, with a small lift), back 2.6 s, flip home; the coin hovers and turns ---------- */
  const HF = 6.2, FL = 1.6, HB = 2.6, PER = HF + FL + HB + FL, T0 = +o.t0 || 0;
  const flipAt = u => u < HF ? 0 : u < HF + FL ? ss((u - HF) / FL) : u < HF + FL + HB ? 1 : 1 + ss((u - HF - FL - HB) / FL); // 0 face, 1 back, 2 face again
  const update = tt => {
    const t = tt + T0, f = flipAt(t % PER), lift = Math.sin((f % 1) * Math.PI);
    cardG.rotation.set(.1 + Math.sin(t * .5) * .035, -.22 + Math.PI * f, Math.sin(t * .37) * .025 + lift * .05);
    cardG.position.y = CY + Math.sin(t * .6) * .07 + lift * .16;
    cardBlob.scale.x = .35 + .65 * Math.abs(Math.cos(cardG.rotation.y)); cardBlob.material.opacity = .2 - lift * .05;
    flyO.position.y = FLY[1] + Math.sin(t * .8 + 1) * .09; flyO.rotation.y = t * .55; flyO.rotation.z = Math.sin(t * .43) * .06;
    const hgt = flyO.position.y - FY, s = .75 + hgt * .12; flyBlob.scale.set(s, s, 1); flyBlob.material.opacity = .16 * Math.max(.2, 1 - hgt / 3.4);
  };
  update(0); if (!reduced) stage.on(update);

  stage.o.rot = stage.o.rot || [.1, 0]; stage.o.sway = stage.o.sway ?? .06; stage.o.py = stage.o.py ?? .12; stage.o.camY = stage.o.camY ?? .9;
  /* Glossy floor: the engine adds it for data-reflect="1"; otherwise on by default when the scene has its own backdrop */
  if (o.reflect !== '1' && o.reflect !== '0' && o.backdrop !== false) stage.reflectGroup(.14);
}
