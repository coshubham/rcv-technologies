/* RCV Technologies — scene module "browser".
   Hero badge for the web-development pages: a photoreal 3D browser window (brushed-aluminium body, cream tab bar with tabs
   and a URL pill drawn on a canvas, three ceramic traffic-light dots, a thin bezel) whose glass-covered page shows the real
   RCV site capture (/assets/img/screens/laptop.webp — tablet.jpg on phones — or data-screen), cropped to the true screen
   aspect (never stretched) and scrolled like someone reading it; a page-shaped placeholder shows until it arrives.
   Two accents: a glossy crimson code tile with porcelain "</>" bars floating over the top-left corner, and a large porcelain
   pointer with a deep-wine outline that drifts over the page and clicks. A faint light sweep crosses the glass now and then.
   The page's own photo (opts.photo) is already shown right beside the badge, so it is deliberately not repeated here.
   Colours: lib.C plus porcelain/neutrals; a palette guard turns green UI bits in the capture (a chat button) crimson and
   blue/teal photo tones a warm neutral.
   No transmission materials (the screen glass is a crisp reflection layer). ~16k triangles, no shadow maps.
   Opts used: screen (page capture URL), t0 (start phase in seconds). */
export default function build(stage, opts, lib) {
  const { THREE, M, C, rbox, canvasTexture } = lib;
  const o = opts || {};
  const FONT = "Manrope, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  const ss = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10)); // smootherstep
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  /* pick the largest size (<= px) at which the whole word fits in maxW, so no label is ever clipped */
  const fitFont = (g, text, weight, px, maxW) => { let s = px; for (;;) { g.font = `${weight} ${s}px ${FONT}`; if (g.measureText(text).width <= maxW || s <= 10) return s; s -= 2; } };
  const fontsReady = () => {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const want = ['600 48px Manrope', '700 48px Manrope'].map(f => document.fonts.load(f).catch(() => {}));
    return Promise.race([Promise.all(want), new Promise(r => setTimeout(r, 1200))]);
  };

  return fontsReady().then(() => {
    /* everything is built inside `root` and attached to the stage only when the build resolves, so the engine's
       auto-framing, entrance animation and floor reflection all start from the finished object (no unframed flash) */
    const root = new THREE.Group();
    /* ---------- the window ---------- */
    const g = new THREE.Group(); g.position.y = -.3; root.add(g);
    const W = 5.8, H = 4.2, RIM = .15;                 // outer aluminium body and its visible rim
    const innerW = W - RIM * 2;                        // 5.5
    const stripH = .78, stripY = H / 2 - RIM - stripH / 2;          // tab bar strip (top)
    const bezelH = H - RIM * 2 - stripH - .02, bezelY = -H / 2 + RIM + bezelH / 2; // page area (below)
    const pageW = innerW - .14, pageH = bezelH - .14, pageY = bezelY;

    /* very fine, low-contrast hairline brushing (roughness only) so the aluminium shimmers instead of striping */
    const brushed = canvasTexture((g2, w, h) => { g2.fillStyle = '#e6e6e6'; g2.fillRect(0, 0, w, h); for (let y = 0; y < h; y++) { const v = Math.round(214 + Math.random() * 41); g2.fillStyle = `rgba(${v},${v},${v},.7)`; g2.fillRect(0, y, w, 1); } }, 64, 2048);
    brushed.colorSpace = THREE.NoColorSpace; brushed.anisotropy = 1;
    const alu = M.metal(0xd9d4ce, { roughness: .3, roughnessMap: brushed });
    g.add(new THREE.Mesh(rbox(W, H, .28, .16), alu));

    /* tab bar: cream ceramic strip carrying a lit canvas texture (tabs, URL pill, toolbar glyphs) */
    const strip = new THREE.Mesh(rbox(innerW, stripH, .095, .05), M.ceramic(0xf1ede7, { roughness: .4 })); strip.position.set(0, stripY, .14 + .095 / 2); g.add(strip);
    const barTex = canvasTexture((c, w, h) => {
      c.fillStyle = '#e3ded7'; c.fillRect(0, 0, w, h);                 // tab row (sand)
      c.fillStyle = '#f8f6f2'; c.fillRect(0, 140, w, h - 140);         // toolbar row
      c.fillStyle = '#f8f6f2'; rr(c, 296, 26, 452, 150, 24); c.fill(); // active tab joins the toolbar
      c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillStyle = hex(C.ember); c.beginPath(); c.arc(344, 84, 12, 0, Math.PI * 2); c.fill(); // favicon
      c.fillStyle = '#1e1b1a'; fitFont(c, 'RCV Technologies', 700, 42, 350); c.fillText('RCV Technologies', 374, 86);
      c.fillStyle = '#6a6360';
      [['Services', 800], ['Contact', 1080]].forEach(([s, x]) => { fitFont(c, s, 600, 40, 230); c.fillText(s, x, 86); });
      c.strokeStyle = 'rgba(30,27,26,.16)'; c.lineWidth = 3; c.lineCap = 'round';
      [1050, 1320].forEach(x => { c.beginPath(); c.moveTo(x, 58); c.lineTo(x, 112); c.stroke(); });
      c.strokeStyle = '#6a6360'; c.lineWidth = 5; c.beginPath(); c.moveTo(1368, 85); c.lineTo(1408, 85); c.moveTo(1388, 65); c.lineTo(1388, 105); c.stroke(); // new tab +
      c.strokeStyle = '#4a4543'; c.lineWidth = 6; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(354, 190); c.lineTo(332, 210); c.lineTo(354, 230); c.stroke();  // back
      c.beginPath(); c.moveTo(402, 190); c.lineTo(424, 210); c.lineTo(402, 230); c.stroke();  // forward
      c.beginPath(); c.arc(492, 210, 16, .35, Math.PI * 2 - .55); c.stroke();                   // reload
      c.fillStyle = '#4a4543'; c.beginPath(); c.moveTo(500, 188); c.lineTo(514, 200); c.lineTo(498, 206); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; rr(c, 560, 168, 1190, 84, 42); c.fill(); c.strokeStyle = 'rgba(30,27,26,.12)'; c.lineWidth = 2; c.stroke(); // URL pill
      c.strokeStyle = '#4a4543'; c.lineWidth = 5; c.beginPath(); c.arc(613, 203, 9, Math.PI, 0); c.stroke(); // lock
      c.fillStyle = '#4a4543'; rr(c, 600, 203, 26, 20, 4); c.fill();
      fitFont(c, 'www.rcvtechnologies.com', 600, 40, 1000); c.fillText('www.rcvtechnologies.com', 650, 211);
      [1900, 1924, 1948].forEach(x => { c.beginPath(); c.arc(x, 210, 5, 0, Math.PI * 2); c.fill(); }); // menu
    }, 2048, 280);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(innerW - .1, (innerW - .1) * 280 / 2048), new THREE.MeshPhysicalMaterial({ map: barTex, roughness: .38, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: .8 }));
    bar.position.set(0, stripY, .14 + .095 + .002); g.add(bar);
    /* traffic lights: crimson, sand, sand — glossy ceramic domes half sunk into the strip */
    [C.ember, C.sand, C.sand].forEach((col, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(.07, 28, 28), M.ceramic(col, { roughness: .18, clearcoat: 1, clearcoatRoughness: .06 })); d.position.set(-innerW / 2 + .24 + i * .21, stripY + stripH / 2 - .24, .235); g.add(d); });

    /* page: thin bezel, the capture (unlit, like a real screen), clear glass cover */
    const bezel = new THREE.Mesh(rbox(innerW, bezelH, .05, .06), M.ceramic(0x2a2524, { roughness: .45, clearcoat: .3 })); bezel.position.set(0, bezelY, .14 + .025); g.add(bezel);
    const pageMat = new THREE.MeshBasicMaterial({ color: 0xf3f0eb, toneMapped: false });
    const page = new THREE.Mesh(new THREE.PlaneGeometry(pageW, pageH), pageMat); page.position.set(0, pageY, .191); g.add(page);
    /* screen glass as a pure reflection layer (black base, additive): real HDR reflections and Fresnel edges while the page
       underneath stays pin-sharp (a transmission material would show it through a blurred, lower-resolution buffer) */
    const screenGlass = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .06, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .7, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const cover = new THREE.Mesh(rbox(innerW, bezelH, .04, .06), screenGlass); cover.position.set(0, bezelY, .215); g.add(cover);

    /* faint light sweep over the cover: a soft diagonal band in a 3x wide canvas, the visible third slides across */
    const sweepTex = canvasTexture((c, w, h) => {
      c.clearRect(0, 0, w, h); c.save(); c.translate(w / 2, h / 2); c.rotate(-.42);
      const band = (hw, a) => { const gr = c.createLinearGradient(-hw, 0, hw, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(-hw, -h, hw * 2, h * 2); };
      band(300, .13); band(80, .22); c.restore();
    }, 2304, 434);
    sweepTex.wrapS = sweepTex.wrapT = THREE.ClampToEdgeWrapping; sweepTex.repeat.set(1 / 3, 1);
    const sweep = new THREE.Mesh(new THREE.PlaneGeometry(innerW - .06, bezelH - .06), new THREE.MeshBasicMaterial({ map: sweepTex, transparent: true, depthWrite: false, toneMapped: false }));
    sweep.position.set(0, bezelY, .2375); sweep.renderOrder = 5; sweep.userData.noReflect = true; g.add(sweep);

    /* ---------- accent 1: glossy crimson code tile with raised porcelain "</>" bars, floating over the top-left corner ---------- */
    const rrect = (w, h, r, seg = 12) => { // rounded rectangle as a clean polygon (exact corner points, no near-duplicate start/end point,
      // which would make ExtrudeGeometry throw a bevel spike)
      r = Math.max(.001, Math.min(r, w / 2, h / 2)); const s = new THREE.Shape(), out = [];
      [[w / 2 - r, -h / 2 + r, -Math.PI / 2], [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI]].forEach(([cx, cy, a0]) => {
        for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2, p = [cx + Math.cos(a) * r, cy + Math.sin(a) * r], q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5) out.push(p); }
      });
      if (Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-5) out.pop();
      out.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return s;
    };
    const slab = (w, h, r, d, b) => { const geo = new THREE.ExtrudeGeometry(rrect(w - 2 * b, h - 2 * b, r - b), { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 14 }); geo.translate(0, 0, -(d - 2 * b) / 2); return geo; }; // app-icon squircle-ish slab, pillowed edges, front face at +d/2
    const tile = new THREE.Group(); root.add(tile);
    const TS = 1.2; tile.add(new THREE.Mesh(slab(TS, TS, .3, .3, .07), M.ember({ roughness: .2, clearcoat: 1, clearcoatRoughness: .05 })));
    const glyphMat = M.ceramic(0xfdfcfa, { roughness: .2, clearcoat: 1, clearcoatRoughness: .06 });
    const BT = .085, barGeo = len => rbox(len + BT, BT, .07, BT / 2, 4);
    const glyphBar = (len, x, y, a) => { const m = new THREE.Mesh(barGeo(len), glyphMat); m.position.set(x, y, .16); m.rotation.z = a; tile.add(m); };
    const ARM = .27, ANG = .72, TIP = .42; // chevron arm length / opening angle / tip distance from the centre
    [-1, 1].forEach(side => [ANG, -ANG].forEach(a => glyphBar(ARM, side * (TIP - Math.cos(a) * ARM / 2), Math.sin(a) * ARM / 2, side < 0 ? a : -a))); // < and >
    glyphBar(.48, 0, 0, 1.25);                                                                                                                  // /
    const TILE = [-2.62, 1.55, .72]; tile.position.set(...TILE); tile.rotation.set(-.08, .26, .05);

    /* ---------- accent 2: a large porcelain pointer with a deep-wine outline, drifting over the page and clicking ---------- */
    const arrow = s => { const sh = new THREE.Shape(); [[0, 0], [0, -1.0], [.25, -.77], [.43, -1.13], [.6, -1.05], [.42, -.7], [.74, -.7]].forEach(([x, y], i) => (i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s))); sh.closePath(); return sh; };
    const PS = .8;
    const ptr = new THREE.Group(); g.add(ptr); const ptrIn = new THREE.Group(); ptrIn.rotation.set(-.12, .2, .06); ptr.add(ptrIn);
    ptrIn.add(new THREE.Mesh(new THREE.ExtrudeGeometry(arrow(PS), { depth: .07, bevelEnabled: true, bevelThickness: .03, bevelSize: .026, bevelSegments: 4, curveSegments: 1 }), M.ceramic(0xfdfcfa, { roughness: .2, clearcoat: 1, clearcoatRoughness: .05 })));
    const outline = new THREE.Mesh(new THREE.ExtrudeGeometry(arrow(PS), { depth: .03, bevelEnabled: true, bevelThickness: .012, bevelSize: .07, bevelSegments: 2, curveSegments: 1 }), M.ceramic(0x4b0c1e, { roughness: .3, clearcoat: .7, clearcoatRoughness: .12 }));
    outline.position.z = -.035; ptrIn.add(outline);

    /* ---------- contact shadow ---------- */
    root.add(stage.shadowBlob(0, .1, 5.8, 1.3, .3));   // shadowBlob parents to stage.group; re-parent into root

    /* ---------- page capture: tall image, recoloured where needed, cropped to the screen aspect, scrolled like someone reading ---------- */
    let pageTex = null, frac = 1;
    const usePage = src => {
      const t = new THREE.Texture(src); t.needsUpdate = true; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      const ia = src.width / src.height, pa = pageW / pageH;
      if (ia <= pa) { frac = ia / pa; t.repeat.set(1, frac); t.offset.set(0, 1 - frac); }           // tall page: full width, top part
      else { const f = pa / ia; t.repeat.set(f, 1); t.offset.set((1 - f) / 2, 0); frac = 1; }       // wide image: centre crop, never squashed
      if (pageTex) pageTex.dispose();
      pageMat.map = t; pageMat.color.set(0xffffff); pageMat.needsUpdate = true; pageTex = t;
      /* the engine's floor reflection clones materials; if the capture arrives after that, hand it to the mirrored page too */
      if (stage.mirror) stage.mirror.children.forEach(c => { if (c.userData.src === page && c.material) { c.material.map = t; c.material.color.set(0xffffff); c.material.needsUpdate = true; } });
      if (lib.reduced) stage.render(); // reduced motion renders single frames: show a late capture straight away
    };
    /* palette guard for the capture: green UI bits (a floating chat button, small icons) become the brand crimson and blue/teal
       tones in its photos become a warm neutral, each keeping its light and shade */
    const tame = cv => {
      const cx = cv.getContext('2d'), id = cx.getImageData(0, 0, cv.width, cv.height), d = id.data; let hit = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], gg = d[i + 1], b = d[i + 2], m = gg - (r > b ? r : b);
        if (m > 22 && gg > 70) { const a = Math.min(1, (m - 10) / 100); d[i] = Math.min(255, r + a * 163); d[i + 1] = Math.max(0, gg - a * 195); d[i + 2] = Math.max(0, b - a * 56); hit++; }
        else if (b > r + 14 && b > gg - 8) { const L = .3 * r + .59 * gg + .11 * b, k = Math.min(1, (b - r - 14) / 50) * .88; d[i] = r + (L * 1.04 - r) * k; d[i + 1] = gg + (L - gg) * k; d[i + 2] = b + (L * .95 - b) * k; hit++; } // blue/teal tones in photos -> warm neutral, same lightness
      }
      if (hit) cx.putImageData(id, 0, 0);
    };
    /* fallback page in the page's own aspect (shown until the capture arrives, or if it cannot load): nav, headline, CTA, image, cards */
    const placeholder = () => canvasTexture((c, w, h) => {
      c.fillStyle = '#fdfcfa'; c.fillRect(0, 0, w, h); c.fillStyle = '#f7f4ef'; c.fillRect(0, 0, w, 92);
      c.fillStyle = hex(C.ember); c.font = `700 40px ${FONT}`; c.textBaseline = 'middle'; c.fillText('RCV', 60, 48);
      c.fillStyle = '#cfc8c1'; for (let i = 0; i < 4; i++) c.fillRect(700 + i * 120, 42, 84, 12);
      c.fillStyle = hex(C.ember); rr(c, w - 230, 24, 170, 46, 23); c.fill(); rr(c, 60, 520, 210, 58, 29); c.fill();
      c.fillStyle = '#2a2524'; [[210, 560], [270, 470], [330, 380]].forEach(([y, ww]) => c.fillRect(60, y, ww, 42));
      c.fillStyle = '#c4bdb6'; [[410, 520], [438, 480], [466, 430]].forEach(([y, ww]) => c.fillRect(60, y, ww, 13));
      const gr = c.createLinearGradient(780, 150, 1390, 600); gr.addColorStop(0, '#fbe4e3'); gr.addColorStop(1, '#f2c9c6'); c.fillStyle = gr; rr(c, 780, 150, 608, 440, 30); c.fill();
      c.fillStyle = '#efe9e3'; for (let i = 0; i < 3; i++) { rr(c, 60 + i * 450, 652, 420, 118, 18); c.fill(); }
    }, 1448, 800).image;
    const imageReady = new Promise(res => {
      usePage(placeholder());
      const url = o.screen || (lib.small ? '/assets/img/screens/tablet.webp' : '/assets/img/screens/laptop.webp'); // phones decode the lighter capture
      new THREE.ImageLoader().load(url, img => {
        try {
          const maxW = lib.small ? 1000 : 1400, sc = Math.min(1, maxW / img.width, 4096 / img.height); // within every GPU's texture limit
          const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); tame(cv); usePage(cv);
        } catch (e) { usePage(img); }
        res();
      }, undefined, () => { usePage(placeholder()); res(); });
      setTimeout(res, 1800); // never hold the reveal for a slow capture; it is swapped in when it arrives
    });
    const PERIOD = 18;
    const scrollPos = t => { // 0 = top of the page, 1 = bottom: read down in three eased steps, dwell, glide back up
      const u = (t / PERIOD) % 1;
      if (u < .62) { const x = u / .62, k = Math.floor(x * 3), f = x * 3 - k; return Math.min(1, (k + ss(f / .72)) / 3); }
      if (u < .74) return 1;
      return 1 - ss((u - .74) / .26);
    };

    /* ---------- pointer path: page-local tip positions, eased glides, a click (press in + slight shrink) at every stop ---------- */
    const way = [[.55, .35], [1.5, -.15], [.9, -.5], [1.8, .55]]; // tips stay high enough that the whole pointer stays over the page
    const LEG = 3.2, MOVE = 1.7, PZ = .62;
    const updPtr = t => {
      const n = way.length, u = (t / LEG) % n, i = Math.floor(u), s = (u - i) * LEG, e = ss(s / MOVE), a = way[i], b = way[(i + 1) % n];
      const press = s > MOVE + .35 && s < MOVE + .85 ? Math.sin((s - MOVE - .35) / .5 * Math.PI) : 0;
      ptr.position.set(a[0] + (b[0] - a[0]) * e, pageY + a[1] + (b[1] - a[1]) * e, PZ - press * .16);
      ptr.scale.setScalar(1 - press * .07); ptrIn.rotation.z = .06 + (b[0] - a[0]) * Math.sin(Math.min(1, s / MOVE) * Math.PI) * -.06;
    };

    /* ---------- per-frame (data-t0="seconds" starts the choreography at a later phase) ---------- */
    const T0 = +o.t0 || 0;
    const update = tt => {
      const t = tt + T0;
      if (pageTex && frac < 1) pageTex.offset.y = (1 - frac) * (1 - scrollPos(t));
      updPtr(t);
      tile.position.y = TILE[1] + Math.sin(t * .7 + 1.2) * .09; tile.rotation.y = .26 + Math.sin(t * .45) * .16; tile.rotation.x = -.08 + Math.sin(t * .6) * .05;
      const p = (t / 14) % 1; sweepTex.offset.x = (2 / 3) * ss((p - .1) / .6); // one slow glide across the glass every 14 s
      g.rotation.x = Math.sin(t * .21) * .025;
    };
    update(0);
    if (!lib.reduced) stage.on(update);
    stage.floatObj(g, .05, .5);
    stage.o.rot = [.08, -.12]; stage.o.sway = .11; stage.o.py = .1;
    return imageReady.then(() => { stage.group.add(root); });
  });
}
