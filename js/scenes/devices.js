/* RCV Technologies — home page "devices" scene: a calm studio product shot of a desk set.
   - Laptop (16:10, aluminium): lid opens on arrival and the display wakes; black-glass bezel with camera notch, keycaps with
     printed legends, half-height arrow keys, speaker grilles, glass trackpad, dark hinge barrel, ports, rubber feet.
   - 11-inch tablet in a wine leather case on a champagne-aluminium stand (back support, front lip, crimson pad).
   - Phone (390 x 844 screen, Dynamic Island, side keys) on a porcelain stand.
   Real relative sizes at 7 cm per unit (16-inch laptop, 11-inch tablet, 6.1-inch phone); on phones a compact layout.
   Every screen shows its capture at the device's TRUE aspect (texture repeat/offset crop of the tall page, never squashed)
   and scrolls like a person reading. Each screen sits under glass that reflects the studio HDR (additive specular,
   soft-clamped so a softbox can never white-out the page). Desk: a satin tone that melts into the backdrop, blurred
   contact shadows, and the engine's mirror faded with depth and above the canvas edge. Camera: elevated product view,
   framed over every pointer/sway pose and the entrance, so nothing is ever cut. ~36k triangles incl. mirror, no transmission. */
export default function build(stage, opts, lib) {
  const { THREE, M, canvasTexture } = lib;
  const o = opts || {}; const G = stage.group; const PI = Math.PI;
  const F = stage.o.floorY ?? -1.21; const reduced = !!lib.reduced; const small = !!lib.small;
  const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

  /* ---------- geometry helpers ---------- */
  const shape = (w, h, rt, rb = rt) => { // rounded rectangle, separate top / bottom corner radii
    const x = -w / 2, y = -h / 2, s = new THREE.Shape(), m = Math.min(w, h) / 2;
    rt = Math.max(.0005, Math.min(rt, m)); rb = Math.max(.0005, Math.min(rb, m));
    s.moveTo(x + rb, y); s.lineTo(x + w - rb, y); s.absarc(x + w - rb, y + rb, rb, -PI / 2, 0, false);
    s.lineTo(x + w, y + h - rt); s.absarc(x + w - rt, y + h - rt, rt, 0, PI / 2, false);
    s.lineTo(x + rt, y + h); s.absarc(x + rt, y + h - rt, rt, PI / 2, PI, false);
    s.lineTo(x, y + rb); s.absarc(x + rb, y + rb, rb, PI, PI * 1.5, false);
    return s;
  };
  const plate = (w, h, rt, rb = rt, seg = 8) => { // flat plate facing +z, UVs normalised to 0..1 over w x h
    const g = new THREE.ShapeGeometry(shape(w, h, rt, rb), seg), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
    uv.needsUpdate = true; return g;
  };
  const smooth = (g, minCos = .5) => { // smooth the rounded walls of an extrusion, keep the flat caps flat
    const p = g.attributes.position, n = g.attributes.normal, buckets = new Map(), out = new Float32Array(n.count * 3);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4); let l = buckets.get(k); if (!l) buckets.set(k, l = []); l.push(i); }
    for (const ids of buckets.values()) for (const i of ids) {
      a.fromBufferAttribute(n, i);
      if (Math.abs(a.z) > .9995) { out[i * 3] = a.x; out[i * 3 + 1] = a.y; out[i * 3 + 2] = a.z; continue; }
      s.set(0, 0, 0); for (const j of ids) { b.fromBufferAttribute(n, j); if (Math.abs(b.z) <= .9995 && a.dot(b) > minCos) s.add(b); }
      s.normalize(); out[i * 3] = s.x; out[i * 3 + 1] = s.y; out[i * 3 + 2] = s.z;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return g;
  };
  const slab = (w, h, d, r, bevel = .02, seg = 10, bseg = 3) => { // rounded slab, pillowed edges, faces +-z, centred
    const b = Math.max(.001, Math.min(bevel, d / 2 - .002, r - .002));
    const g = new THREE.ExtrudeGeometry(shape(w - 2 * b, h - 2 * b, r - b), { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: bseg, curveSegments: seg });
    g.translate(0, 0, -(d - 2 * b) / 2); return smooth(g);
  };
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, flags) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (flags) Object.assign(m.userData, flags); parent.add(m); return m; };
  const lay = m => { m.rotation.x = -PI / 2; return m; }; // XY item laid flat: its +z faces up, its +y points to the back
  const NR = { noReflect: true };

  /* ---------- materials (physically based; the engine supplies the studio HDR) ---------- */
  const alu = M.metal(0xe2ddd6, { roughness: .34, envMapIntensity: 1.55 });
  const aluSatin = M.metal(0xd2ccc5, { roughness: .5 });
  const darkMetal = M.metal(0x3b3634, { roughness: .42 });
  const blackGlass = new THREE.MeshPhysicalMaterial({ color: 0x0a0909, roughness: .16, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.1 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x1f1d1c, roughness: .58, envMapIntensity: .9 });
  const wellMat = new THREE.MeshStandardMaterial({ color: 0x131111, roughness: .85 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1b1918, roughness: .95 });
  const portMat = new THREE.MeshStandardMaterial({ color: 0x0f0e0e, roughness: .7 });
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x080707, roughness: .05, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 2 });
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x4b0c1e, roughness: .55, clearcoat: .3, clearcoatRoughness: .5, sheen: .6, sheenRoughness: .55, sheenColor: new THREE.Color(0xf6c9c5), envMapIntensity: .9 });
  const champ = M.metal(0xe7e1da, { roughness: .24 });
  const champSatin = M.metal(0xe9e3dc, { roughness: .38, envMapIntensity: 1.6 });
  const porcelain = M.ceramic(0xfbf9f6, { roughness: .28, clearcoat: .85, clearcoatRoughness: .1 });
  const padMat = M.ember({ roughness: .62, clearcoat: .08 });
  const titanium = M.metal(0xcbc3b9, { roughness: .3 });
  // cover glass: adds only the HDR specular reflection on top of the screen (additive), so the page stays crisp
  // The studio softboxes are very bright, so the reflection is soft-clamped: a glossy sheen that can never white-out the page.
  const glassFX = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .12, metalness: 0, ior: 1.5, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, envMapIntensity: .3 });
  glassFX.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n gl_FragColor.rgb = gl_FragColor.rgb * 0.022 / (gl_FragColor.rgb + 0.022);'); };
  glassFX.customProgramCacheKey = () => 'rcvGlassSheen';

  /* ---------- screens: true-aspect crop of a tall capture, power-on fade, reader-like scrolling ---------- */
  const screens = [];
  function screen(url, w, h, rt, rb, kind, steps, hold, delay) {
    const t = lib.tex(url); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: 0x000000 });
    const m = new THREE.Mesh(plate(w, h, rt, rb, 8), mat);
    const s = { t, mat, m, aspect: w / h, frac: 1, ready: false, on: 0, t0: 0, steps, hold, delay, kind, mirror: [] };
    // show exactly (width / aspect) px of the page: same scale on both axes, so the capture is never squashed
    s.fit = (iw, ih) => { s.frac = Math.min(1, iw / s.aspect / ih); t.repeat.set(1, s.frac); t.offset.set(0, 1 - s.frac); };
    screens.push(s); return m;
  }
  const easeIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const reader = (t, steps, hold, move = 1.5, back = 2.8) => { // read, scroll a little, read again ... then glide back to the top
    const cyc = steps * (hold + move) + hold + back; let u = ((t % cyc) + cyc) % cyc;
    for (let i = 0; i < steps; i++) { if (u < hold) return i / steps; u -= hold; if (u < move) return (i + easeIO(u / move)) / steps; u -= move; }
    if (u < hold) return 1; u -= hold; return 1 - easeIO(Math.min(1, u / back));
  };

  /* ---------- soft contact shadows ---------- */
  const shadows = [];
  const softRect = (w, d, r, blur, op, x, z, yaw = 0, lift = .003) => { // blurred rounded rectangle on the floor
    const pw = w + blur * 6, pd = d + blur * 6, S = 256 / Math.max(pw, pd), cw = Math.max(16, Math.round(pw * S)), ch = Math.max(16, Math.round(pd * S));
    const t = canvasTexture((g, W, H) => { g.clearRect(0, 0, W, H); g.shadowColor = 'rgba(30,24,23,1)'; g.shadowBlur = blur * S * 2; g.shadowOffsetX = W * 4; g.fillStyle = '#000'; g.beginPath(); g.roundRect((W - w * S) / 2 - W * 4, (H - d * S) / 2, w * S, d * S, Math.min(r * S, w * S / 2, d * S / 2)); g.fill(); }, cw, ch);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: op, depthWrite: false, toneMapped: false }));
    m.rotation.set(-PI / 2, 0, yaw); m.position.set(x, F + lift, z); m.renderOrder = 2; Object.assign(m.userData, { noFit: true, noReflect: true }); G.add(m); shadows.push(m); return m;
  };
  const blob = (x, z, w, d, op, yaw = 0) => { const m = stage.shadowBlob(x, z, w, d, op, F + .002); m.rotation.z = yaw; m.renderOrder = 2; Object.assign(m.userData, { noFit: true, noReflect: true }); return m; };

  /* =================================================================================== LAPTOP */
  const BW = 5.08, BD = 3.54, BT = .158, FEET = .02, TOP = FEET + BT;            // 16-inch class base: 35.6 x 24.8 cm at 7 cm per unit
  const KW = 4.0, U = KW / 15, KH = .018;                                       // keyboard: 15 key units of 1.87 cm
  const LH = 3.42, LT = .066, LY0 = -.04;                                       // lid
  const OPEN = -.3, CLOSED = PI / 2 - .004;                                     // lid angle: about 107 degrees open
  const lap = new THREE.Group(); G.add(lap);
  lay(mesh(slab(BW, BD, BT, .2, .03, 12, 3), alu, lap, 0, FEET + BT / 2, 0));

  // keyboard layout (Apple-style US): [label, width in units, kind]; labels as [shift, base] print two lines
  const rowsDef = [
    [.8, [['esc', 1.5, 'w'], ...Array.from({ length: 12 }, (_, i) => ['F' + (i + 1), 1, 'f']), ['', 1.5, 'touch']]],
    [1, [[['~', '`'], 1], [['!', '1'], 1], [['@', '2'], 1], [['#', '3'], 1], [['$', '4'], 1], [['%', '5'], 1], [['^', '6'], 1], [['&', '7'], 1], [['*', '8'], 1], [['(', '9'], 1], [[')', '0'], 1], [['_', '-'], 1], [['+', '='], 1], ['delete', 2, 'w']]],
    [1, [['tab', 1.5, 'w'], ...'QWERTYUIOP'.split('').map(c => [c, 1]), [['{', '['], 1], [['}', ']'], 1], [['|', '\\'], 1.5]]],
    [1, [['caps lock', 1.75, 'w'], ...'ASDFGHJKL'.split('').map(c => [c, 1]), [[':', ';'], 1], [['"', "'"], 1], ['return', 2.25, 'w']]],
    [1, [['shift', 2.25, 'w'], ...'ZXCVBNM'.split('').map(c => [c, 1]), [['<', ','], 1], [['>', '.'], 1], [['?', '/'], 1], ['shift', 2.75, 'w']]],
    [1, [['fn', 1, 'w'], ['control', 1, 'w'], ['option', 1, 'w'], ['command', 1.25, 'w'], ['', 5.5], ['command', 1.25, 'w'], ['option', 1, 'w'], ['◀', 1, 'lr'], ['', 1, 'ud'], ['▶', 1, 'lr']]],
  ];
  const KD = rowsDef.reduce((s, r) => s + r[0], 0) * U, KZ = -BD / 2 + .3 + KD / 2, GAP = U * .15;
  const keys = []; // {x, z, w, d, label, kind} relative to the keyboard centre
  let zr = -KD / 2;
  for (const [rh, row] of rowsDef) {
    let xr = -KW / 2; const h = rh * U;
    for (const [label, wu, kind] of row) {
      const w = wu * U, cx = xr + w / 2, cz = zr + h / 2;
      if (kind === 'lr') keys.push({ x: cx, z: zr + h * .75, w: w - GAP, d: h / 2 - GAP * .6, label, kind });
      else if (kind === 'ud') { keys.push({ x: cx, z: zr + h * .25, w: w - GAP, d: h / 2 - GAP * .6, label: '▲', kind }); keys.push({ x: cx, z: zr + h * .75, w: w - GAP, d: h / 2 - GAP * .6, label: '▼', kind }); }
      else keys.push({ x: cx, z: cz, w: w - GAP, d: h - GAP, label, kind });
      xr += w;
    }
    zr += h;
  }
  const kb = new THREE.Group(); kb.position.set(0, TOP, KZ); lap.add(kb);
  lay(mesh(plate(KW + .07, KD + .07, .045), wellMat, kb, 0, .0012, 0, NR));
  const keyIM = new THREE.InstancedMesh(lib.rbox(1, 1, 1, .14, 1), keyMat, keys.length); keyIM.userData.noReflect = true; keyIM.userData.noFit = true;
  { const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(); keys.forEach((k, i) => keyIM.setMatrixAt(i, mt.compose(p.set(k.x, .0012 + KH / 2, k.z), q, s.set(k.w, KH, k.d)))); keyIM.instanceMatrix.needsUpdate = true; }
  kb.add(keyIM);
  const legendTex = canvasTexture((g, W, H) => {
    g.clearRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle'; const sx = W / KW, sz = H / KD, px = v => Math.round(v * sx);
    for (const k of keys) {
      const cx = (k.x + KW / 2) * sx, cz = (k.z + KD / 2) * sz, kw = k.w * sx, kd = k.d * sz; g.fillStyle = 'rgba(238,234,229,.94)';
      if (k.kind === 'touch') { g.strokeStyle = 'rgba(120,114,110,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cz, kd * .3, 0, PI * 2); g.stroke(); continue; }
      if (!k.label) continue;
      if (Array.isArray(k.label)) { g.font = `500 ${px(U * .2)}px ${SANS}`; g.fillText(k.label[0], cx, cz - kd * .2); g.fillText(k.label[1], cx, cz + kd * .2); }
      else if (k.kind === 'w') { g.font = `500 ${px(U * .15)}px ${SANS}`; g.textAlign = k.x < 0 ? 'left' : 'right'; g.fillText(k.label, k.x < 0 ? cx - kw / 2 + kw * .1 : cx + kw / 2 - kw * .1, cz + kd * .26); g.textAlign = 'center'; }
      else if (k.kind === 'f') { g.font = `500 ${px(U * .15)}px ${SANS}`; g.fillText(k.label, cx, cz + kd * .2); }
      else if (k.kind === 'lr' || k.kind === 'ud') { g.font = `500 ${px(U * .16)}px ${SANS}`; g.fillText(k.label, cx, cz); }
      else { g.font = `500 ${px(U * .34)}px ${SANS}`; g.fillText(k.label, cx, cz); }
    }
  }, 2048, Math.round(2048 * KD / KW));
  const legend = mesh(new THREE.PlaneGeometry(KW, KD), new THREE.MeshBasicMaterial({ map: legendTex, transparent: true, depthWrite: false, toneMapped: false, color: 0xd9d4ce }), kb, 0, .0012 + KH + .0012, 0, { noReflect: true, noFit: true }); legend.rotation.x = -PI / 2;
  // speaker grilles either side of the keyboard
  const grilleTex = canvasTexture((g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(26,22,21,.8)'; const st = 8; for (let y = 5, r = 0; y < H - 3; y += st * .87, r++) for (let x = 5 + (r % 2) * st / 2; x < W - 3; x += st) { g.beginPath(); g.arc(x, y, 1.9, 0, PI * 2); g.fill(); } }, 64, Math.round(64 * KD / .26));
  for (const sx of [-1, 1]) { const gr = mesh(new THREE.PlaneGeometry(.26, KD), new THREE.MeshBasicMaterial({ map: grilleTex, transparent: true, depthWrite: false }), kb, sx * (KW / 2 + .23), .001, 0, { noReflect: true, noFit: true }); gr.rotation.x = -PI / 2; }
  // glass trackpad with its hairline gap
  const TPW = 2.3, TPD = 1.28, TPZ = KZ + KD / 2 + .17 + TPD / 2;
  mesh(plate(TPW + .02, TPD + .02, .075), new THREE.MeshStandardMaterial({ color: 0x8c8580, roughness: .6, metalness: .5 }), lap, 0, TOP + .0008, TPZ, NR).rotation.x = -PI / 2;
  mesh(plate(TPW, TPD, .07), aluSatin, lap, 0, TOP + .0016, TPZ, NR).rotation.x = -PI / 2;
  // ports, feet
  const port = (side, z, w, h) => { const p = mesh(plate(w, h, h / 2), portMat, lap, side * (BW / 2 + .0015), FEET + BT / 2, z, NR); p.rotation.y = side * PI / 2; };
  port(-1, -1.15, .17, .036); port(-1, -.8, .1, .03); port(-1, -.58, .1, .03); port(-1, .62, .036, .036);
  port(1, -1.05, .15, .04); port(1, -.68, .1, .03); port(1, .5, .17, .022);
  for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(new THREE.CylinderGeometry(.11, .11, FEET, 20), rubber, lap, fx * (BW / 2 - .4), FEET / 2, fz * (BD / 2 - .34), NR);
  // hinge barrel and lid
  const HZ = -BD / 2 + .06, HY = TOP + KH + .006 + LT / 2;
  mesh(new THREE.CylinderGeometry(.056, .056, 4.3, 28), darkMetal, lap, 0, TOP + .05, HZ).rotation.z = PI / 2;
  const lid = new THREE.Group(); lid.position.set(0, HY, HZ); lap.add(lid);
  const LC = LY0 + LH / 2, ZF = LT / 2;
  mesh(slab(BW, LH, LT, .2, .018, 12, 3), alu, lid, 0, LC, 0);
  mesh(plate(BW - .04, LH - .04, .18), blackGlass, lid, 0, LC, ZF + .0008);
  const SW = 4.86, SH = SW / 1.6, STOP = LY0 + LH - .1;                         // 16:10 display (1440 x 900 viewport), slim bezels
  const lapScreen = screen(o.photo || '/assets/img/screens/laptop.webp', SW, SH, .06, .012, 'laptop', 4, 2.6, 1.2); lapScreen.position.set(0, STOP - SH / 2, ZF + .0016); lid.add(lapScreen);
  mesh(plate(.46, .1, .001, .036), blackGlass, lid, 0, STOP - .02, ZF + .0024, NR);          // camera notch
  mesh(new THREE.RingGeometry(.013, .021, 28), new THREE.MeshStandardMaterial({ color: 0x2b2827, roughness: .4 }), lid, 0, STOP - .035, ZF + .003, NR);
  mesh(new THREE.CircleGeometry(.013, 24), lensMat, lid, 0, STOP - .035, ZF + .0032, NR);
  mesh(plate(BW - .04, LH - .04, .18), glassFX, lid, 0, LC, ZF + .004, { noReflect: true, noFit: true });
  lid.rotation.x = OPEN;

  /* =================================================================================== TABLET in a leather case on a stand */
  const CW = 2.6, CH = 3.59, CD = .11, TW = 2.55, TH = 3.54, PHI_T = .33;      // case and glass (iPad 11-inch: 24.8 x 17.9 cm)
  const tabRoot = new THREE.Group(); G.add(tabRoot);
  const tStand = new THREE.Group(); tabRoot.add(tStand);
  lay(mesh(slab(1.75, 1.25, .055, .26, .02), champ, tStand, 0, .0275, -.33));
  mesh(lib.rbox(1.5, .016, .17, .006, 2), padMat, tStand, 0, .055 + .008, .05);
  const tLean = new THREE.Group(); tLean.position.set(0, .071, 0); tLean.rotation.x = -PHI_T; tabRoot.add(tLean);  // pivot: bottom-back edge of the case
  mesh(lib.rbox(1.12, 1.95, .05, .05, 3), champ, tLean, 0, .895, -.03);                                    // back support
  mesh(lib.rbox(1.5, .1, .065, .03, 3), champSatin, tStand, 0, .055 + .05, CD * Math.cos(PHI_T) + .038);       // front lip
  const tab = new THREE.Group(); tab.position.set(0, CH / 2, CD / 2); tLean.add(tab);
  mesh(slab(CW, CH, CD, .22, .022, 12, 3), leather, tab);
  mesh(plate(TW, TH, .19), blackGlass, tab, 0, 0, CD / 2 + .0008);
  const STW = 2.3, STH = STW * 1194 / 834;                                      // 834 x 1194 viewport, uniform bezel
  const tabScreen = screen(o.photo3 || o.photo || '/assets/img/screens/tablet.webp', STW, STH, .1, .1, 'tablet', 3, 3.1, 2.4); tabScreen.position.set(0, 0, CD / 2 + .0016); tab.add(tabScreen);
  mesh(new THREE.CircleGeometry(.016, 20), lensMat, tab, 0, TH / 2 - .062, CD / 2 + .0024, NR);
  mesh(plate(TW, TH, .19), glassFX, tab, 0, 0, CD / 2 + .0035, { noReflect: true, noFit: true });

  /* =================================================================================== PHONE on a porcelain stand */
  const PW = 1.02, PH = 2.14, PD = .105, PHI_P = .3;                           // 14.8 x 7.2 cm
  const phRoot = new THREE.Group(); G.add(phRoot);
  const pStand = new THREE.Group(); phRoot.add(pStand);
  mesh(slab(.98, .82, .05, .22, .018), porcelain, pStand, 0, .025, -.27).rotation.x = -PI / 2;
  mesh(lib.rbox(.74, .014, .15, .005, 2), padMat, pStand, 0, .05 + .007, .04);
  const pLean = new THREE.Group(); pLean.position.set(0, .064, 0); pLean.rotation.x = -PHI_P; phRoot.add(pLean);
  mesh(lib.rbox(.64, 1.36, .05, .05, 3), porcelain, pLean, 0, .6, -.028);
  mesh(lib.rbox(.74, .1, .055, .025, 3), porcelain, pStand, 0, .05 + .05, PD * Math.cos(PHI_P) + .035);
  const ph = new THREE.Group(); ph.position.set(0, PH / 2, PD / 2); pLean.add(ph);
  mesh(slab(PW, PH, PD, .165, .028, 12, 3), titanium, ph);
  mesh(plate(PW - .028, PH - .028, .152), blackGlass, ph, 0, 0, PD / 2 + .0008);
  const SPW = .962, SPH = SPW * 844 / 390;                                      // 390 x 844 viewport
  const phScreen = screen(o.photo2 || o.photo || '/assets/img/screens/phone.webp', SPW, SPH, .135, .135, 'phone', 4, 2.2, 3.4); phScreen.position.set(0, 0, PD / 2 + .0016); ph.add(phScreen);
  mesh(plate(.2, .058, .029), blackGlass, ph, 0, SPH / 2 - .056, PD / 2 + .0026, NR);                      // Dynamic Island
  mesh(plate(PW - .028, PH - .028, .152), glassFX, ph, 0, 0, PD / 2 + .0035, { noReflect: true, noFit: true });
  for (const [sx, y, h] of [[-1, .62, .1], [-1, .4, .2], [-1, .16, .2], [1, .3, .32]]) mesh(lib.rbox(.022, h, .042, .01, 2), titanium, ph, sx * (PW / 2 + .004), y, 0, NR);

  /* ---------- layout (7 cm per unit; real relative sizes) ---------- */
  const L = small
    ? { lap: [.45, -.35, 0], tab: [-2.55, -2.75, .3], ph: [2.75, 1.05, -.36] }      // phone: tablet tucked behind-left of the lid, phone in front-right
    : { lap: [.15, .05, 0], tab: [-4.0, -.55, .42], ph: [3.45, .95, -.42] };
  lap.position.set(L.lap[0], F, L.lap[1]); lap.rotation.y = L.lap[2];
  tabRoot.position.set(L.tab[0], F, L.tab[1]); tabRoot.rotation.y = L.tab[2];
  phRoot.position.set(L.ph[0], F, L.ph[1]); phRoot.rotation.y = L.ph[2];

  // contact shadows: tight under each footprint + a wide soft ambient pool + the key light's long soft cast to the back-left
  const at = (root, lx, lz) => { const c = Math.cos(root.rotation.y), s = Math.sin(root.rotation.y); return [root.position.x + lx * c + lz * s, root.position.z - lx * s + lz * c]; };
  { const [x, z] = at(lap, 0, 0); softRect(BW - .12, BD - .12, .18, .06, .55, x, z, lap.rotation.y); blob(x, z, BW + 1.9, BD + 1.5, .14, lap.rotation.y); const [x2, z2] = at(lap, -.45, -BD / 2 - .55); blob(x2, z2, 4.6, 1.5, .09, lap.rotation.y); }
  { const [x, z] = at(tabRoot, 0, -.33); softRect(1.72, 1.22, .25, .05, .42, x, z, tabRoot.rotation.y); blob(x, z, 3.1, 2.3, .15, tabRoot.rotation.y); const [x2, z2] = at(tabRoot, -.4, -1.25); blob(x2, z2, 2.8, 1.5, .08, tabRoot.rotation.y); }
  { const [x, z] = at(phRoot, 0, -.27); softRect(.96, .8, .21, .04, .42, x, z, phRoot.rotation.y); blob(x, z, 1.9, 1.6, .15, phRoot.rotation.y); const [x2, z2] = at(phRoot, -.25, -.85); blob(x2, z2, 1.6, 1.1, .08, phRoot.rotation.y); }

  /* ---------- desk surface: a soft satin tone under the set that melts into the backdrop (no hard edges) ---------- */
  if (o.desk !== '0') {
    const deskTex = canvasTexture((g, W, H) => { const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.75)'); gr.addColorStop(.78, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, 512, 512);
    const desk = mesh(new THREE.PlaneGeometry(19, 9.5), new THREE.MeshBasicMaterial({ map: deskTex, color: +(o.deskColor || 0xe8e1da), transparent: true, opacity: +(o.deskOpacity || .75), depthWrite: false, toneMapped: false }), G, -.2, F - .001, .2, { noFit: true, noReflect: true });
    desk.rotation.x = -PI / 2; desk.renderOrder = 1;
  }

  /* ---------- motion ---------- */
  const T_LID = .5, D_LID = 2.3;
  let lidE = reduced ? 1 : 0, tBase = null;   // lid clock starts at the first frame after build (the stage clock may already run while the module loads)
  function update(t, dt) {
    if (!reduced) {
      if (tBase === null) tBase = t; const lt = t - tBase;
      const k = Math.min(1, Math.max(0, (lt - T_LID) / D_LID)); lidE = easeIO(k);
      const after = lt - T_LID - D_LID; const settle = after > 0 ? Math.sin(after * 3.1) * .01 * Math.exp(-after * 1.6) : 0;
      lid.rotation.x = CLOSED + (OPEN - CLOSED) * lidE + settle;
    } else lid.rotation.x = OPEN;
    for (const s of screens) {
      if (!s.ready) { const im = s.t.image; if (im && im.width) { s.fit(im.width, im.height); s.ready = true; } }
      let target = s.ready ? 1 : 0; if (s.kind === 'laptop') target *= Math.min(1, Math.max(0, (lidE - .5) / .35));
      s.on = reduced ? target : (target > s.on ? Math.min(target, s.on + dt * 1.25) : target);
      const c = .965 * s.on * (2 - s.on); s.mat.color.setScalar(c); for (const mm of s.mirror) mm.color.setScalar(c);
      if (s.ready && s.frac < 1) {
        if (!s.t0 && s.on > .99) s.t0 = t + s.delay;
        const p = reduced || !s.t0 ? 0 : reader(Math.max(0, t - s.t0), s.steps, s.hold);
        s.t.offset.y = (1 - s.frac) * (1 - p);
      }
    }
  }
  // glossy desk: fade the engine's mirrored copy with depth below the floor (and never draw it above the floor)
  let patched = false; const bottomU = { value: 60 };   // also fade it out above the canvas bottom edge, so it is never cut
  const fadeMat = (mt, floorY, dist) => {
    mt.onBeforeCompile = sh => {
      sh.uniforms.uMirFloor = { value: floorY }; sh.uniforms.uMirFade = { value: dist }; sh.uniforms.uMirBottom = bottomU;
      sh.vertexShader = 'varying float vMirY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 mw = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n mw = instanceMatrix * mw;\n#endif\n vMirY = (modelMatrix * mw).y; }');
      sh.fragmentShader = 'uniform float uMirFloor; uniform float uMirFade; uniform float uMirBottom; varying float vMirY;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n{ float dd = uMirFloor - vMirY; gl_FragColor.a *= (1.0 - smoothstep(0.0, uMirFade, dd)) * step(-0.002, dd) * smoothstep(0.0, uMirBottom, gl_FragCoord.y); }');
    };
    mt.customProgramCacheKey = () => 'mirrorFade'; mt.needsUpdate = true;
  };
  function patchMirror() {
    if (patched || !stage.mirror) return; patched = true;
    const bySrc = new Map(screens.map(s => [s.m, s]));
    for (const c of stage.mirror.children) { const s = bySrc.get(c.userData.src); if (s) s.mirror.push(c.material); (Array.isArray(c.material) ? c.material : [c.material]).forEach(mt => fadeMat(mt, F, 1.15)); }
  }
  stage.on((t, dt) => { patchMirror(); bottomU.value = Math.max(8, stage.renderer.domElement.height * .14); update(t, dt); });
  if (reduced) { // one still frame: re-render as the captures arrive
    const iv = setInterval(() => { update(0, 1); stage.render(); if (screens.every(s => s.ready)) clearInterval(iv); }, 250); setTimeout(() => clearInterval(iv), 20000);
  }

  /* ---------- camera: elevated product-shot view; frame every pointer / sway pose and the entrance so nothing is cut ---------- */
  stage.o.rot = [0, 0]; stage.o.py = 0; stage.o.sway = .045;
  const ELEV = small ? .24 : .2;
  let fitMargin = 1.12, P = null, bb = null;
  stage.fitCamera = function (margin) {
    if (margin) fitMargin = margin; this.fitted = true;
    const cam = this.camera;
    if (!P) { // pose-transformed bounding points, computed once (the set is static); resizes only re-solve the camera
      const g = this.group, lidSaved = lid.rotation.x; lid.rotation.x = OPEN;
      const sp = g.position.clone(), sr = g.rotation.clone(), ss = g.scale.clone();
      g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1); g.updateMatrixWorld(true);
      const pts = [], v = new THREE.Vector3(); bb = new THREE.Box3();
      const walk = obj => { if (obj.userData.noFit) return; if (obj.isMesh) { const gm = obj.geometry; if (!gm.boundingBox) gm.computeBoundingBox(); const b = gm.boundingBox; for (let i = 0; i < 8; i++) { v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(obj.matrixWorld); pts.push(v.x, v.y, v.z); bb.expandByPoint(v); } } obj.children.forEach(walk); };
      g.children.forEach(walk);
      for (const [x, z] of [[bb.min.x, bb.min.z], [bb.max.x, bb.min.z], [bb.min.x, bb.max.z], [bb.max.x, bb.max.z]]) pts.push(x, F - .5, z); // keep the brightest part of the floor reflection in frame
      lid.rotation.x = lidSaved; g.position.copy(sp); g.rotation.copy(sr); g.scale.copy(ss); g.updateMatrixWorld(true);
      const Y = Math.abs(this.o.px ?? .35) * .5 + Math.abs(this.o.sway ?? .05), sw = Math.abs(this.o.sway ?? .05), base = this.o.rot || [0, 0];
      const poses = []; for (const k of [-1, -.5, 0, .5, 1]) poses.push([base[0], base[1] + k * Y, 1, 0]);
      for (const k of [0, .35, .7]) for (const s of [-1, 1]) poses.push([base[0], base[1] + s * sw, .78 + .22 * (1 - Math.pow(1 - k, 3)), -.5 * Math.pow(1 - k, 3)]);
      P = []; const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
      for (const [rx, ry, s, py] of poses) { mt.compose(ps.set(0, py, 0), q.setFromEuler(e.set(rx, ry, 0)), sc.setScalar(s)); const m = mt.elements; for (let i = 0; i < pts.length; i += 3) { const x = pts[i], y = pts[i + 1], z = pts[i + 2]; P.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]); } }
    }
    const ca = Math.cos(ELEV), sa = Math.sin(ELEV), th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), asp = cam.aspect, lim = 1 / fitMargin;
    let tx = (bb.min.x + bb.max.x) / 2, ty = (bb.min.y + bb.max.y) / 2, tz = (bb.min.z + bb.max.z) / 2;
    const bounds = d => { const cx = tx, cy = ty + sa * d, cz = tz + ca * d; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < P.length; i += 3) { const rx = P[i] - cx, ry = P[i + 1] - cy, rz = P[i + 2] - cz, zc = -sa * ry - ca * rz; if (zc < .05) return null; const X = rx / (zc * th * asp), Yc = (ca * ry - sa * rz) / (zc * th); if (X < x0) x0 = X; if (X > x1) x1 = X; if (Yc < y0) y0 = Yc; if (Yc > y1) y1 = Yc; } return [x0, x1, y0, y1]; };
    const solve = () => { let lo = .5, hi = 300; for (let i = 0; i < 36; i++) { const mid = (lo + hi) / 2, b = bounds(mid); if (b && Math.max(-b[0], b[1], -b[2], b[3]) <= lim) hi = mid; else lo = mid; } return hi; };
    let d = solve();
    for (let it = 0; it < 3; it++) { const b = bounds(d); if (!b) break; const ox = (b[0] + b[1]) / 2, oy = (b[2] + b[3]) / 2; tx += ox * d * th * asp; ty += oy * d * th * ca; tz -= oy * d * th * sa; d = solve(); }
    cam.position.set(tx, ty + sa * d, tz + ca * d); cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(); this.center = new THREE.Vector3(tx, ty, tz);
  };
}
