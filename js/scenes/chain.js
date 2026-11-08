/* Guest posting / link building: a heavy chain of five real stadium-shaped links (polished champagne metal) rising on a
   diagonal; the last link, crimson ceramic, slides in along the chain, turns and snaps into place on arrival (the link
   before it recoils), then the chain sways and slowly rolls so reflections run along the metal. A porcelain "Quality
   links" chip pops up on the lock; a coral bead floats in the free corner. */
export default async function build(stage, o, lib) {
  const { THREE, M, C, rbox, canvasTexture } = lib; const G = stage.group; const fy = stage.o.floorY ?? -2.6;
  if (document.fonts) await Promise.race([document.fonts.load('700 40px Manrope'), new Promise(r => setTimeout(r, 1500))]).catch(() => {});

  // link shape: two straights + two half circles (true chain-link proportions), swept by a round wire
  class Stadium extends THREE.Curve {
    constructor(a, r) { super(); this.a = a; this.r = r; this.L = 4 * a + 2 * Math.PI * r; }
    getPoint(t, out = new THREE.Vector3()) {
      const { a, r, L } = this; let s = (((t % 1) + 1) % 1) * L;
      if (s < a) return out.set(s, -r, 0); s -= a;
      if (s < Math.PI * r) { const k = -Math.PI / 2 + s / r; return out.set(a + r * Math.cos(k), r * Math.sin(k), 0); } s -= Math.PI * r;
      if (s < 2 * a) return out.set(a - s, r, 0); s -= 2 * a;
      if (s < Math.PI * r) { const k = Math.PI / 2 + s / r; return out.set(-a + r * Math.cos(k), r * Math.sin(k), 0); } s -= Math.PI * r;
      return out.set(-a + s, -r, 0);
    }
  }
  const A = .42, R = .52, RW = .22, P = 1.26;                       // straight half-length, bend radius, wire radius, pitch
  const linkGeo = new THREE.TubeGeometry(new Stadium(A, R), 120, RW, 26, true);
  const metal = M.metal(0xefe5da, { roughness: .26, envMapIntensity: 2.3 });
  const ceramic = M.ceramic(C.ember, { roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.2 });

  // chain frame: diag (diagonal angle) > roll (turn about the chain axis) > one pivot per link (sag + ripple) > mesh (alternate 90 deg)
  const diag = new THREE.Group(); G.add(diag); diag.rotation.z = .66;
  const roll = new THREE.Group(); diag.add(roll); const ROLL = .5; roll.rotation.x = ROLL;
  const SAG = .22, links = [];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * P, y = -SAG * (1 - (x / (2 * P)) ** 2), ang = Math.atan(SAG * x / (2 * P * P));
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); pivot.rotation.z = ang; roll.add(pivot);
    const m = new THREE.Mesh(linkGeo, i === 4 ? ceramic : metal); m.rotation.x = i % 2 ? Math.PI / 2 : 0; pivot.add(m);
    links.push({ pivot, m, x, y, ang, rx: m.rotation.x });
  }

  // chip: porcelain pill, crimson seal with a check, "Quality links"
  const chip = new THREE.Group();
  chip.add(new THREE.Mesh(rbox(2.86, .78, .24, .32, 6), M.ceramic(0xffffff, { roughness: .24, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.35 })));
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(2.7, .66), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: canvasTexture((c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = '#c8102e'; c.beginPath(); c.arc(118, h / 2, 82, 0, 7); c.fill();
    c.strokeStyle = '#fdfcfa'; c.lineWidth = 20; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(80, h / 2 + 4); c.lineTo(108, h / 2 + 32); c.lineTo(158, h / 2 - 30); c.stroke();
    c.fillStyle = '#4b0c1e'; c.font = "700 118px Manrope, 'Segoe UI', sans-serif"; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('Quality links', 236, h / 2 + 6, w - 260);
  }, 1024, 250) })); lbl.position.z = .125; chip.add(lbl);
  G.add(chip);

  // accent: a coral bead floating in the free lower-right corner
  const bead = new THREE.Mesh(new THREE.SphereGeometry(.3, 48, 48), M.ceramic(C.peach, { roughness: .2, clearcoat: 1, clearcoatRoughness: .05 })); G.add(bead);

  // place: chain bottom just above the floor, chip in the upper-left gap, bead in the lower-right gap
  G.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(diag); const lift = fy + .32 - box.min.y; diag.position.y = lift;
  const top = box.max.y + lift, bot = fy + .32, left = box.min.x, right = box.max.x;
  chip.position.set(left + 1.5, top - .55, .9); bead.position.set(right - .75, bot + .7, .9); stage.floatObj(bead, .15, .75, 1.6);
  const cw = right - left; stage.shadowBlob((left + right) / 2, .1, cw * .95, 1.3, .16); stage.shadowBlob(left + cw * .3, .2, cw * .55, .8, .22);
  const beadShadow = stage.shadowBlob(bead.position.x, .5, .9, .5, .15);

  // arrival: the crimson link slides in along the chain, turns 90 deg, overshoots a touch and locks; then idle sway + roll
  const last = links[4], T0 = .05, T1 = 1.75, chipY = chip.position.y;
  const easeOutBack = k => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
  stage.on(t => {
    const k = lib.reduced ? 1 : Math.min(1, Math.max(0, (t - T0) / (T1 - T0)));
    const e = easeOutBack(k), slide = 1 - Math.pow(1 - k, 3);
    last.pivot.position.x = last.x + 1.5 * (1 - slide); last.pivot.position.y = last.y + .25 * Math.pow(1 - k, 2); last.pivot.scale.setScalar(.72 + .28 * slide);
    last.m.rotation.x = last.rx + (Math.PI / 2) * (1 - e); last.m.rotation.y = .45 * Math.pow(1 - k, 2);
    const since = lib.reduced ? 99 : t - T1, kick = since > 0 ? Math.exp(-since * 3.2) * Math.sin(since * 13) * .12 : 0;
    links.forEach((l, i) => { l.pivot.rotation.z = l.ang + Math.sin(t * .8 + i * .9) * .03 + (i === 3 ? kick : 0) + (i === 2 ? kick * .4 : 0); });
    roll.rotation.x = ROLL + Math.sin(t * .33) * .16;
    diag.position.y = lift + Math.sin(t * .6) * .07;
    const c = since > 0 ? Math.min(1, since / .55) : 0, cs = since > 0 ? easeOutBack(c) : 0;
    chip.scale.setScalar(.001 + .999 * Math.max(0, cs)); chip.position.y = chipY + Math.sin(t * .7 + 1) * .08 - (1 - c) * .25;
    beadShadow.material.opacity = .15 - Math.sin(t * .75 + 1.6) * .04;
  });
  stage.o.rot = [.12, -.18]; G.rotation.set(.12, -.18, 0); stage.o.sway = .06;
}
