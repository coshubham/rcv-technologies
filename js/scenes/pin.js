/* RCV Technologies — scene module "pin" (hero badge of /contact-us/).
   One strong object: a glossy crimson map pin (a true teardrop lathe, with a porcelain cabochon set in a champagne bezel
   on both faces) hopping on a round porcelain map tile. The tile carries a drawn city map (cased roads, an expressway, a
   blush river, plazas and parks, sector labels around Sector 63, a crimson route ending at the pin, baked soft building
   shadows), white architectural-model buildings with linen roof caps, a champagne rim and a crimson pinstripe.
   Motion: a ballistic hop with squash on landing and a slow turn of the pin; every landing sends two crimson ripples
   across the map; the pin's shadow breathes with its height; a porcelain "Noida, India" callout chip floats above.
   opts.photo is intentionally not used (the page already shows that photo right beside the badge).
   Contract: export default build(stage, opts, lib) — see js/scenes/README.md. No transmission, no shadow maps, ~33k tris. */
export default async function build(stage, opts, lib) {
  const { THREE, M, C, rbox, canvasTexture } = lib;
  const reduced = !!lib.reduced, G = stage.group;
  const SANS = "Manrope, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
  if (document.fonts && document.fonts.load) {
    try { await Promise.race([Promise.all(['700 64px Manrope', '600 32px Manrope'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fallback fonts are fine */ }
  }
  const FY = stage.o.floorY ?? -2.6, RD = 1.8, TH = .24, TOP = FY + TH, RX = .55;
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const track = (g, text, x, y, sp) => { g.textAlign = 'left'; const ch = [...text], ws = ch.map(c => g.measureText(c).width); let cx = x - (ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1)) / 2; ch.forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + sp; }); };

  /* ---------- map artwork (canvas centre = pin; the street grid is rotated by ANG) ---------- */
  const S = 1024, K = S / (2 * RD), ANG = -.36, STEP = 150;
  const cs = Math.cos(ANG), sn = Math.sin(ANG);
  const toCanvas = (a, b) => [512 + a * cs - b * sn, 512 + a * sn + b * cs];
  const BLD = [ // block i, j of the grid, footprint (px), height (world units), roof cap
    [-2, -2, 98, 86, .44, 1], [-1, -2, 100, 90, .3, 0], [1, -2, 96, 92, .58, 1], [0, -3, 92, 80, .36, 0],
    [-2, -1, 90, 100, .26, 0], [1, -1, 74, 74, .2, 1], [-2, 0, 96, 82, .32, 1], [1, 0, 90, 98, .24, 0],
    [-1, 1, 92, 72, .15, 0], [0, 1, 98, 84, .13, 1], [-3, 0, 80, 80, .2, 0], [2, -1, 84, 90, .38, 0]
  ].map(([i, j, w, d, h, cap]) => { const [u, v] = toCanvas(i * STEP + STEP / 2, j * STEP + STEP / 2); return { u, v, w, d, h, cap, x: (u - 512) / K, z: (v - 512) / K }; })
    .filter(b => Math.hypot(b.x, b.z) + .3 < RD - .1);
  const hull = pts => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of pts.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return lo.slice(0, -1).concat(up.slice(0, -1)); };
  const map = canvasTexture((g, w, h) => {
    g.fillStyle = '#eee8e0'; g.fillRect(0, 0, w, h);
    g.save(); g.translate(512, 512); g.rotate(ANG);
    for (let i = -5; i < 5; i++) for (let j = -5; j < 5; j++) {   // city blocks, plaza round the pin, two parks
      const x = i * STEP, y = j * STEP, plaza = (i === -1 || i === 0) && (j === -1 || j === 0), park = (i === 2 && j === 1) || (i === -3 && j === -2) || (i === -1 && j === 2);
      g.fillStyle = plaza ? '#f8f4ef' : park ? '#f8d9d4' : '#e3d9ce'; rr(g, x + 13, y + 13, STEP - 26, STEP - 26, 12); g.fill();
      if (park) { g.fillStyle = '#efb9b0'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(x + 38 + (k % 3) * 37, y + 38 + Math.floor(k / 3) * 37, 10, 0, 7); g.fill(); } }
      if (plaza) { g.strokeStyle = '#efe7de'; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + 13 + k * 31, y + 13); g.lineTo(x + 13 + k * 31, y + STEP - 13); g.stroke(); } }
    }
    g.restore();
    g.lineCap = 'round'; g.lineJoin = 'round';                       // blush river on the right
    const river = () => { g.beginPath(); g.moveTo(1040, -40); g.bezierCurveTo(760, 160, 940, 420, 800, 640); g.bezierCurveTo(700, 800, 820, 960, 760, 1080); };
    river(); g.strokeStyle = '#efb8ae'; g.lineWidth = 104; g.stroke(); river(); g.strokeStyle = '#f7d3cc'; g.lineWidth = 84; g.stroke();
    g.save(); g.translate(512, 512); g.rotate(ANG);
    const lines = (wd, col) => { g.strokeStyle = col; g.lineWidth = wd; for (let k = -5; k <= 5; k++) { const art = k % 3 === 0, ww = art ? wd + 12 : wd; g.lineWidth = ww; g.beginPath(); g.moveTo(k * STEP, -800); g.lineTo(k * STEP, 800); g.stroke(); g.beginPath(); g.moveTo(-800, k * STEP); g.lineTo(800, k * STEP); g.stroke(); } };
    lines(25, '#d3c6b8'); lines(16, '#fefdfb');                      // cased streets, wider arterials
    const xway = () => { g.beginPath(); g.moveTo(-800, 470); g.bezierCurveTo(-300, 300, 200, 520, 800, 240); };
    xway(); g.strokeStyle = '#cdbfb0'; g.lineWidth = 46; g.stroke(); xway(); g.strokeStyle = '#ffffff'; g.lineWidth = 36; g.stroke();
    xway(); g.strokeStyle = '#eadfd3'; g.lineWidth = 2; g.setLineDash([16, 14]); g.stroke(); g.setLineDash([]);
    const route = () => { g.beginPath(); g.moveTo(-3 * STEP, 640); g.lineTo(-3 * STEP, STEP); g.lineTo(0, STEP); g.lineTo(0, 0); };   // crimson route to the pin
    route(); g.strokeStyle = '#ffffff'; g.lineWidth = 24; g.stroke(); route(); g.strokeStyle = '#c8102e'; g.lineWidth = 12; g.stroke();
    g.fillStyle = '#f26b5b'; g.beginPath(); g.arc(-3 * STEP, 470, 15, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-3 * STEP, 470, 6, 0, 7); g.fill();
    g.restore();
    for (const b of BLD) {                                           // baked soft shadows of the model buildings
      const c = [[-b.w / 2, -b.d / 2], [b.w / 2, -b.d / 2], [b.w / 2, b.d / 2], [-b.w / 2, b.d / 2]].map(([a, d]) => [b.u + a * cs - d * sn, b.v + a * sn + d * cs]);
      const off = b.h * 120, sh = hull(c.concat(c.map(([x, y]) => [x - off * .55, y - off * .8])));
      g.save(); g.filter = 'blur(9px)'; g.fillStyle = 'rgba(92,62,58,.2)'; g.beginPath(); sh.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      g.filter = 'blur(3px)'; g.fillStyle = 'rgba(80,52,50,.22)'; g.beginPath(); c.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.restore();
    }
    g.fillStyle = '#9a8f88'; g.font = `700 22px ${SANS}`;           // sector labels
    [['SECTOR 63', 600, 640], ['SECTOR 62', 250, 790], ['SECTOR 64', 640, 250], ['SECTOR 59', 300, 330]].forEach(([t, x, y]) => track(g, t, x, y, 5));
    g.fillStyle = 'rgba(164,154,147,.55)'; g.font = `700 40px ${SANS}`; track(g, 'NOIDA', 512, 120, 26);
    const vg = g.createRadialGradient(512, 512, 330, 512, 512, 520); vg.addColorStop(0, 'rgba(150,120,110,0)'); vg.addColorStop(1, 'rgba(150,120,110,.16)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }, S, S);

  /* ---------- the tile: porcelain base, map face, champagne rim, crimson pinstripe ---------- */
  const base = new THREE.Mesh(new THREE.CylinderGeometry(RD, RD - .03, TH, 128, 1), M.ceramic(0xf1ece6, { roughness: .34, clearcoat: .6 })); base.position.y = FY + TH / 2; G.add(base);
  const face = new THREE.Mesh(new THREE.CircleGeometry(RD - .03, 128), new THREE.MeshStandardMaterial({ map, roughness: .78, envMapIntensity: .85 })); face.rotation.x = -Math.PI / 2; face.position.y = TOP + .002; G.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(RD - .02, .04, 16, 180), M.metal(0xe7e1da, { roughness: .2 })); rim.rotation.x = Math.PI / 2; rim.position.y = TOP; G.add(rim);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(RD - .013, .011, 8, 180), M.ember({ roughness: .25 })); stripe.rotation.x = Math.PI / 2; stripe.position.y = FY + TH * .45; G.add(stripe);
  {
    const t = canvasTexture((g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(30,20,22,.9)'); r.addColorStop(.86, 'rgba(30,20,22,.8)'); r.addColorStop(.92, 'rgba(30,20,22,.32)'); r.addColorStop(1, 'rgba(30,20,22,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, 256, 256);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(RD * 2.14, RD * 2.14), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .5, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = FY + .003; G.add(sh);
  }

  /* ---------- white architectural-model buildings ---------- */
  const porc = [M.ceramic(0xfbf9f6, { roughness: .3, clearcoat: .7 }), M.ceramic(0xf3eee8, { roughness: .32, clearcoat: .6 })], roof = M.ceramic(0xe6ded5, { roughness: .45, clearcoat: .3 });
  BLD.forEach((b, i) => {
    const bw = b.w / K, bd = b.d / K, m = new THREE.Mesh(rbox(bw, b.h, bd, .025, 3), porc[i % 2]); m.position.set(b.x, TOP + b.h / 2, b.z); m.rotation.y = -ANG; G.add(m);
    if (b.cap) { const c = new THREE.Mesh(rbox(bw * .8, .035, bd * .8, .012, 2), roof); c.position.set(b.x, TOP + b.h + .012, b.z); c.rotation.y = -ANG; G.add(c); }
  });

  /* ---------- the pin: teardrop lathe + porcelain cabochons in champagne bezels ---------- */
  const HR = .6, HC = 1.38, beta = Math.asin(HR / HC), L = Math.sqrt(HC * HC - HR * HR), prof = [new THREE.Vector2(0, 0)];
  for (let k = 1; k <= 12; k++) prof.push(new THREE.Vector2(L * Math.sin(beta) * k / 12, L * Math.cos(beta) * k / 12));
  const a0 = Math.atan2(L * Math.cos(beta) - HC, L * Math.sin(beta));
  for (let k = 1; k <= 30; k++) { const a = a0 + (Math.PI / 2 - a0) * k / 30; prof.push(new THREE.Vector2(k === 30 ? 0 : HR * Math.cos(a), HC + HR * Math.sin(a))); }
  const pin = new THREE.Group(); G.add(pin);
  pin.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 72), M.ember({ roughness: .15, clearcoat: 1, clearcoatRoughness: .05 })));
  const gemMat = M.ceramic(0xfdfcfa, { roughness: .16, clearcoat: 1, clearcoatRoughness: .04 }), bezMat = M.metal(0xe7e1da, { roughness: .16 });
  for (const s of [1, -1]) {
    const bez = new THREE.Mesh(new THREE.TorusGeometry(.235, .03, 12, 56), bezMat); bez.position.set(0, HC, s * .555); pin.add(bez);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(.225, 40, 20), gemMat); gem.scale.set(1, 1, .32); gem.position.set(0, HC, s * .552); pin.add(gem);
  }
  const pinShadow = stage.shadowBlob(0, 0, 1.15, .82, .4, TOP + .006);

  /* ---------- landing ripples (lit crimson rings that spread over the map) ---------- */
  const rings = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, .02, 6, 128), new THREE.MeshStandardMaterial({ color: C.ember, roughness: .32, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = Math.PI / 2; m.position.y = TOP + .014; m.scale.set(.3, .3, 1); G.add(m); return m; });

  /* ---------- "Noida, India" porcelain callout chip ---------- */
  const chip = new THREE.Group();
  const chipMat = M.ceramic(0xffffff, { roughness: .3, clearcoat: .8, clearcoatRoughness: .12, emissive: 0xfdfcfa, emissiveIntensity: .22 });
  chip.add(new THREE.Mesh(rbox(1.95, .56, .14, .22, 6), chipMat));
  const tail = new THREE.Mesh(rbox(.22, .22, .1, .04, 3), chipMat); tail.rotation.z = Math.PI / 4; tail.position.set(-.42, -.27, 0); chip.add(tail);
  const lbl = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.beginPath(); g.arc(92, 104, 40, Math.PI * .82, Math.PI * 2.18); g.lineTo(92, 196); g.closePath(); g.fill();
    g.fillStyle = '#fdfcfa'; g.beginPath(); g.arc(92, 104, 15, 0, 7); g.fill();
    let s = 104; g.font = `700 ${s}px ${SANS}`; while (g.measureText('Noida, India').width > w - 196 && s > 40) { s -= 4; g.font = `700 ${s}px ${SANS}`; }
    g.fillStyle = '#2a1c20'; g.textAlign = 'left'; g.fillText('Noida, India', 162, 128 + s * .36);
  }, 896, 256);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .514), new THREE.MeshBasicMaterial({ map: lbl, transparent: true, toneMapped: false })); label.position.z = .072; chip.add(label);
  chip.position.set(.42, TOP + 3.02, .1); chip.rotation.x = -RX; G.add(chip);

  /* framing guard at the top of the hop */
  { const m = new THREE.Mesh(new THREE.BoxGeometry(.01, .01, .01), new THREE.MeshBasicMaterial()); m.position.set(0, TOP + .44 + HC + HR, 0); m.visible = false; m.userData.noReflect = true; G.add(m); }

  /* ---------- motion ---------- */
  const P = 2.1, AIR = .74, HMAX = .42, LIFE = 1.8, T0 = .2 * P;
  const update = t => {
    const tt = t + T0, c = (tt % P) / P; let h = 0, sq = 0;
    if (c < AIR) { const u = c / AIR; h = HMAX * 4 * u * (1 - u); } else sq = Math.sin(Math.PI * (c - AIR) / (1 - AIR));
    pin.position.y = TOP + h; pin.scale.set(1 + .06 * sq, 1 - .11 * sq, 1 + .06 * sq);
    pin.rotation.y = Math.sin(t * .55) * .5; pin.rotation.z = Math.sin(t * 1.1) * .03;
    pinShadow.scale.setScalar(1 + h * 1.3); pinShadow.material.opacity = .42 - h * .5;
    const n = Math.floor((tt - AIR * P) / P);                        // index of the latest landing
    rings.forEach((r, i) => {
      const age = tt - ((n - (i >> 1)) * P + AIR * P) - (i & 1) * .38;
      if (age < 0 || age > LIFE) { r.visible = false; return; }
      const k = age / LIFE, rad = .3 + Math.pow(k, .75) * 1.25; r.visible = true; r.scale.set(rad, rad, 1); r.material.opacity = .85 * Math.pow(1 - k, 1.6);
    });
    chip.position.y = TOP + 3.02 + Math.sin(t * .8 + 1) * .05; chip.rotation.z = Math.sin(t * .6) * .025; chip.rotation.y = Math.sin(t * .45) * .08;
  };
  update(0); stage.on(t => update(reduced ? 0 : t));

  /* gentle 3/4 view from above, tilted so the map reads; the engine adds sway and pointer parallax */
  stage.o.rot = [RX, 0]; stage.o.sway = .07; stage.o.py = .12; G.rotation.set(RX, 0, 0);
  G.traverse(m => { m.userData.noReflect = true; });   // the engine's floor mirror assumes an upright group; this tile is tilted
}
