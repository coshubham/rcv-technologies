/* RCV Technologies — scene module "bars" (hero badge of /services/digital-marketing/).
   A porcelain plinth with a champagne inlay carries five bars that rise one after another: four in blush-tinted
   frosted glass with glossy crimson caps, the tallest one solid crimson with a champagne cap, each set in a champagne
   socket. A crimson trend line grows across their tops with porcelain beads at every data point and ends in an
   arrowhead; a porcelain marker ringed in crimson travels along it. A frosted "+128%" chip floats at the upper left.
   No photo frame: the page already shows opts.photo beside the badge.
   2 transmission materials (bar glass, chip glass), ~24k triangles, no shadow maps. Final state when reduced. */
export default async function build(stage, opts, lib) {
  const { THREE, M, rbox, canvasTexture } = lib;
  const G = stage.group; const FY = stage.o.floorY ?? -2.6; const still = !!lib.reduced;
  const SANS = "Manrope, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
  if (document.fonts && document.fonts.load) {
    try { await Promise.race([Promise.all(['800 64px Manrope', '700 64px Manrope'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fallback fonts are fine */ }
  }
  const fitFont = (g, text, weight, px, maxW) => { let s = px; for (;;) { g.font = `${weight} ${s}px ${SANS}`; if (g.measureText(text).width <= maxW || s <= 12) return s; s -= 2; } };
  const ss = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10)); // smootherstep
  const champ = M.metal(0xefe9e2, { metalness: .8, roughness: .26 }), ember = M.ember({ roughness: .22 }), pearl = M.ceramic(0xfdfcfa, { roughness: .18, clearcoat: 1 });

  /* ---------- plinth ---------- */
  const PW = 4.9, PH = .34, PD = 1.8, top = FY + PH;
  const plinth = new THREE.Mesh(rbox(PW, PH, PD, .12, 5), M.ceramic(0xf8f5f1, { roughness: .3, clearcoat: .8 })); plinth.position.y = FY + PH / 2; G.add(plinth);
  const inlay = new THREE.Mesh(rbox(PW - .5, .045, .03, .012, 2), champ); inlay.position.set(0, FY + PH / 2, PD / 2 + .004); G.add(inlay);
  stage.shadowBlob(0, 0, PW + .6, PD + .7, .3); stage.shadowBlob(0, 0, PW + .1, PD + .15, .2);

  /* ---------- bars ---------- */
  const hs = [1.25, 1.95, 1.6, 2.75, 3.7], SP = .96, BW = .74; const xs = hs.map((h, i) => (i - (hs.length - 1) / 2) * SP);
  const glass = M.frosted({ roughness: .16, thickness: .9, attenuationColor: new THREE.Color(0xf7d9d6), attenuationDistance: 1.6, envMapIntensity: .9 });
  const coreMat = M.ceramic(0xf3bdb8, { roughness: .34, clearcoat: .4 });
  const bars = hs.map((h, i) => {
    const last = i === hs.length - 1;
    const socket = new THREE.Mesh(rbox(BW + .16, .05, BW + .16, .02, 2), champ); socket.position.set(xs[i], top + .025, 0); G.add(socket);
    const b = new THREE.Mesh(rbox(BW, h, BW, .09, 4), glass); b.position.set(xs[i], top + .05 + h / 2, 0); G.add(b);
    const cw = last ? BW - .18 : BW - .3; const core = new THREE.Mesh(rbox(cw, h - .16, cw, .06, 3), last ? ember : coreMat); core.position.set(xs[i], top + .05 + h / 2, 0); G.add(core); // a blush (or, for the best month, crimson) column inside the frosted glass
    const cap = new THREE.Mesh(rbox(BW + .04, .1, BW + .04, .04, 3), last ? champ : ember); cap.position.set(xs[i], top + .05 + h + .05, 0); G.add(cap);
    return { b, core, cap, h, i };
  });

  /* ---------- trend line, beads, arrowhead, marker ---------- */
  const pts = hs.map((h, i) => new THREE.Vector3(xs[i], top + .05 + h + .6, .05));
  const end = pts[pts.length - 1]; const tail = new THREE.Vector3(end.x + .5, end.y + .62, .05);
  const curve = new THREE.CatmullRomCurve3([...pts, tail], false, 'centripetal');
  const TS = 120, RS = 10; const tubeGeo = new THREE.TubeGeometry(curve, TS, .055, RS, false);
  const line = new THREE.Mesh(tubeGeo, ember); G.add(line);
  const beadGeo = new THREE.SphereGeometry(.085, 20, 14); const beads = pts.map(p => { const s = new THREE.Mesh(beadGeo, pearl); s.position.copy(p); G.add(s); return s; });
  const head = new THREE.Mesh(new THREE.ConeGeometry(.15, .34, 28), ember); G.add(head);
  const tan = curve.getTangentAt(1); head.position.copy(tail).addScaledVector(tan, .12); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
  const L = curve.getLengths(600); const uLast = L[Math.round(600 * (pts.length - 1) / pts.length)] / L[600]; // arc position of the last data point
  const marker = new THREE.Group(); G.add(marker);
  marker.add(new THREE.Mesh(new THREE.SphereGeometry(.17, 32, 24), pearl));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.25, .034, 12, 48), ember); marker.add(ring);

  /* ---------- frosted "+128%" chip ---------- */
  const chip = new THREE.Group(); chip.position.set(xs[0] + .55, top + 3.55, .55); chip.rotation.y = .2; G.add(chip);
  chip.add(new THREE.Mesh(rbox(2.3, .96, .2, .3, 6), M.frosted({ roughness: .34, thickness: .6 })));
  const lbl = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#c8102e'; g.beginPath(); g.moveTo(56, h / 2 + 52); g.lineTo(122, h / 2 - 58); g.lineTo(188, h / 2 + 52); g.closePath(); g.fill();
    g.fillStyle = '#4b0c1e'; g.textBaseline = 'middle'; fitFont(g, '+128%', 800, 200, w - 250); g.fillText('+128%', 222, h / 2 + 8);
  }, 960, 380);
  const lblM = new THREE.Mesh(new THREE.PlaneGeometry(2.16, .855), new THREE.MeshBasicMaterial({ map: lbl, transparent: true, toneMapped: false })); lblM.position.z = .105; chip.add(lblM);
  const chipShadow = stage.shadowBlob(chip.position.x, .55, 2, .6, .08);

  /* ---------- motion: bars rise in turn, the line draws itself, the marker rides it ---------- */
  const T0 = 2.1; // seconds to full growth
  const grow = t => {
    const k = still ? 1 : Math.min(1, t / T0);
    bars.forEach(({ b, core, cap, h, i }) => {
      const e = ss(Math.min(1, Math.max(0, (k * T0 - i * .16) / 1.1))); const br = still ? 1 : 1 + Math.sin(t * .9 + i * 1.3) * .025 * e;
      const s = Math.max(.02, e) * br; b.scale.y = s; b.position.y = top + .05 + h * s / 2; cap.position.y = top + .05 + h * s + .05;
      core.scale.y = s; core.position.y = b.position.y;
    });
    const lk = still ? 1 : ss(Math.min(1, Math.max(0, (t - .9) / 1.6)));
    tubeGeo.setDrawRange(0, Math.floor(lk * TS) * RS * 6); line.visible = lk > .01;
    beads.forEach((s, i) => { const v = ss(Math.min(1, Math.max(0, lk * hs.length - i))); s.scale.setScalar(Math.max(.001, v)); });
    head.scale.setScalar(Math.max(.001, ss(Math.min(1, Math.max(0, (lk - .92) / .08)))));
    const u = still ? uLast * .7 : lk * uLast * (.5 - .5 * Math.cos(Math.max(0, t - 2.5) * .55));
    marker.position.copy(curve.getPointAt(u)); marker.position.z += .02; marker.scale.setScalar(Math.max(.001, ss(Math.min(1, lk * 1.4))));
    ring.scale.setScalar(1 + Math.max(0, Math.sin(t * 2.4)) * .12);
  };
  stage.floatObj(chip, .08, .7, 1);
  stage.on(t => { grow(t); chip.rotation.y = .2 + Math.sin(t * .45) * .06; chipShadow.material.opacity = .08 - (chip.position.y - top - 3.55) * .1; });
  stage.o.rot = [.14, -.3]; G.rotation.set(.14, -.3, 0);
}
