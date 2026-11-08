/* RCV Technologies — scene module "lens" (hero badge of /services/seo-services/).
   A porcelain search-results card in a champagne metal frame shows three ranked results drawn on a canvas: the
   crimson #1 row "RCV Technologies" on a blush highlight, then two grey competitors. A real refracting magnifier
   (glass lens, champagne ring and collar, crimson grip with champagne bands) glides over the rows, so they swell
   inside the glass. A frosted search bar reading rcvtechnologies.com, with a blinking caret and a 3D crimson "#1"
   pill, floats over the card's top edge; a porcelain "Rank" chip drifts at its side. Soft contact shadows follow
   every object. No photo frame: the page already shows opts.photo beside the badge.
   2 transmission materials (lens glass, frosted bar), ~25k triangles, no shadow maps. Still frame when reduced. */
export default async function build(stage, opts, lib) {
  const { THREE, M, rbox, canvasTexture } = lib;
  const G = stage.group; const FY = stage.o.floorY ?? -2.6; const still = !!lib.reduced;
  const SANS = "Manrope, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
  const RED = '#c8102e', WINE = '#4b0c1e', BURG = '#7a0f22';
  if (document.fonts && document.fonts.load) {
    try { await Promise.race([Promise.all(['800 64px Manrope', '700 64px Manrope'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fallback fonts are fine */ }
  }
  const rrect = (w, h, r) => {
    const x = -w / 2, y = -h / 2, s = new THREE.Shape(); r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false); return s;
  };
  const plate = (w, h, r) => { // flat rounded plate facing +z with 0..1 UVs (opaque, so it also shows inside the lens)
    const g = new THREE.ShapeGeometry(rrect(w, h, r), 10), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5); uv.needsUpdate = true; return g;
  };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const fitFont = (g, text, weight, px, maxW) => { let s = px; for (;;) { g.font = `${weight} ${s}px ${SANS}`; if (g.measureText(text).width <= maxW || s <= 12) return s; s -= 2; } };
  const printed = (t, o = {}) => new THREE.MeshPhysicalMaterial({ map: t, roughness: .34, clearcoat: .6, clearcoatRoughness: .14, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .2, envMapIntensity: .85, ...o });

  /* ---------- the search-results card ---------- */
  const CW = 4.7, CH = 4.2, CY = -.1, CZ = -.5, FW = CW - .16, FH = CH - .16;
  const TW = 1280, TH = Math.round(TW * FH / FW);
  const card = new THREE.Group(); card.position.set(0, CY, CZ); G.add(card);
  card.add(new THREE.Mesh(rbox(CW, CH, .22, .2, 4), M.metal(0xe7e1da, { roughness: .26 })));
  const back = new THREE.Mesh(rbox(CW - .3, CH - .3, .06, .1, 2), M.ceramic(0xece7e1)); back.position.z = -.12; card.add(back);
  const faceTex = canvasTexture((g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#fdfcfa'); bg.addColorStop(1, '#f3eee8'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textBaseline = 'middle';
    // search tabs just under the floating bar
    let x = 72; g.font = `700 36px ${SANS}`;
    ['All', 'Images', 'News', 'Maps'].forEach((t, i) => { const tw = g.measureText(t).width; g.fillStyle = i ? '#a59c96' : RED; g.fillText(t, x, 196); if (!i) { rr(g, x - 4, 226, tw + 8, 8, 4); g.fill(); } x += tw + 60; });
    g.fillStyle = '#e8e2dc'; g.fillRect(48, 238, w - 96, 3);
    g.fillStyle = '#b3aaa4'; g.font = `700 30px ${SANS}`; g.fillText('About 1,240,000 results (0.31 seconds)', 72, 282);
    // result 1: RCV Technologies, highlighted
    const Y = 318; rr(g, 40, Y, w - 80, 262, 36); g.fillStyle = '#fbe4e3'; g.fill();
    g.fillStyle = RED; g.beginPath(); g.arc(130, Y + 94, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = `800 60px ${SANS}`; g.textAlign = 'center'; g.fillText('1', 130, Y + 97); g.textAlign = 'left';
    g.fillStyle = RED; fitFont(g, 'RCV Technologies', 800, 78, 780); g.fillText('RCV Technologies', 214, Y + 74);
    g.fillStyle = BURG; g.font = `700 36px ${SANS}`; g.fillText('rcvtechnologies.com  ›  seo-services', 216, Y + 138);
    g.fillStyle = '#efc4c1'; rr(g, 216, Y + 178, 860, 22, 11); g.fill(); rr(g, 216, Y + 214, 620, 22, 11); g.fill();
    rr(g, w - 222, Y + 52, 150, 72, 36); g.fillStyle = RED; g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w - 196, Y + 104); g.lineTo(w - 176, Y + 72); g.lineTo(w - 156, Y + 104); g.closePath(); g.fill();
    g.font = `800 34px ${SANS}`; g.fillText('TOP', w - 146, Y + 90);
    // results 2 and 3: competitors, plain grey
    [[618, '2', 610, 390, 780], [866, '3', 530, 330, 700]].forEach(([y, n, a, b, c]) => {
      g.fillStyle = '#e6dfd9'; g.beginPath(); g.arc(130, y + 82, 46, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7f7570'; g.font = `800 52px ${SANS}`; g.textAlign = 'center'; g.fillText(n, 130, y + 85); g.textAlign = 'left';
      g.fillStyle = '#bdb3ad'; rr(g, 216, y + 46, a, 42, 21); g.fill();
      g.fillStyle = '#d6cec8'; rr(g, 216, y + 110, b, 24, 12); g.fill();
      g.fillStyle = '#e0d9d3'; rr(g, 216, y + 150, c, 24, 12); g.fill();
    });
  }, TW, TH);
  const face = new THREE.Mesh(plate(FW, FH, .13), new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false })); face.position.z = .113; card.add(face); // a lit screen: exact, crisp colours
  const fy = py => CY + FH / 2 - py / TH * FH; // canvas row -> world y
  stage.shadowBlob(0, CZ, 5.2, 1.5, .16);

  /* ---------- the magnifier ---------- */
  const R0 = 1.12; const L = new THREE.Group(); L.position.z = CZ + 1.02; G.add(L);
  const champ = M.metal(0xe7e1da, { roughness: .24 });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(R0 - .02, 64, 40), M.glass({ ior: 1.6, thickness: 2.4, roughness: .01, clearcoat: .25, envMapIntensity: .5, attenuationDistance: 8 })); glass.scale.z = .34; L.add(glass);
  L.add(new THREE.Mesh(new THREE.TorusGeometry(R0, .1, 24, 120), champ));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R0 - .075, .026, 10, 120), M.metal(0xf4efe9, { roughness: .1 })); lip.position.z = .088; L.add(lip);
  const arm = new THREE.Group(); arm.rotation.z = .785; L.add(arm); // the handle points to the lower right
  const along = (mesh, d) => { mesh.position.y = -d; arm.add(mesh); return mesh; };
  along(new THREE.Mesh(new THREE.CylinderGeometry(.085, .115, .36, 24), champ), R0 + .16);
  along(new THREE.Mesh(new THREE.CylinderGeometry(.165, .165, .17, 36), champ), R0 + .4);
  along(new THREE.Mesh(new THREE.CapsuleGeometry(.152, 1.22, 8, 28), M.ember({ roughness: .3 })), R0 + 1.24);
  [R0 + .74, R0 + 1.74].forEach(d => { const b = new THREE.Mesh(new THREE.TorusGeometry(.154, .024, 10, 44), champ); b.rotation.x = Math.PI / 2; along(b, d); });
  const tip = along(new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 16), champ), R0 + 2.02); tip.scale.y = .7;
  const lensShadow = stage.shadowBlob(0, CZ + 1, 2.6, .8, .1);

  /* ---------- frosted search bar with caret and 3D "#1" pill ---------- */
  const BW = 4.5, BH = .82; const bar = new THREE.Group(); bar.position.set(-.08, CY + CH / 2 + .02, CZ + .66); G.add(bar);
  bar.add(new THREE.Mesh(rbox(BW, BH, .26, .41, 6), M.frosted({ roughness: .3, thickness: .7 })));
  const LW = 1440, LH = Math.round(LW * (BH - .08) / (BW - .1)); let textEnd = 0;
  const lbl = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = WINE; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.arc(78, h / 2 - 8, 30, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(100, h / 2 + 15); g.lineTo(126, h / 2 + 41); g.stroke();
    g.fillStyle = WINE; g.textBaseline = 'middle'; fitFont(g, 'rcvtechnologies.com', 700, 96, w - 180 - 380);
    g.fillText('rcvtechnologies.com', 162, h / 2 + 4); textEnd = 162 + g.measureText('rcvtechnologies.com').width;
  }, LW, LH);
  const lblMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW - .1, BH - .08), new THREE.MeshBasicMaterial({ map: lbl, transparent: true, toneMapped: false })); lblMesh.position.z = .135; bar.add(lblMesh);
  const caret = new THREE.Mesh(new THREE.PlaneGeometry(.032, .42), new THREE.MeshBasicMaterial({ color: 0xc8102e, toneMapped: false }));
  caret.position.set(-(BW - .1) / 2 + (textEnd + 14) / LW * (BW - .1), 0, .136); bar.add(caret);
  const pill = new THREE.Group(); pill.position.set(BW / 2 - .62, 0, .1); bar.add(pill);
  pill.add(new THREE.Mesh(rbox(.96, .56, .2, .28, 6), M.ember({ roughness: .22 })));
  const one = new THREE.Mesh(new THREE.PlaneGeometry(.8, .44), new THREE.MeshBasicMaterial({ map: canvasTexture((g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = `800 150px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('#1', w / 2, h / 2 + 8); }, 400, 220), transparent: true, toneMapped: false })); one.position.z = .102; pill.add(one);
  stage.shadowBlob(-.08, CZ + .66, 4.6, .9, .1);

  /* ---------- porcelain "Rank" chip ---------- */
  const chipY = fy(800); const chip = new THREE.Group(); chip.position.set(-2.2, chipY, CZ + .9); chip.rotation.y = .18; G.add(chip);
  chip.add(new THREE.Mesh(rbox(1.62, .68, .22, .34, 6), M.ceramic(0xfdfcfa, { roughness: .28, clearcoat: .9 })));
  const chipTex = canvasTexture((g, w, h) => {
    g.fillStyle = '#fdfcfa'; g.fillRect(0, 0, w, h);
    [46, 70, 96].forEach((bh, i) => { g.fillStyle = i === 2 ? RED : '#f26b5b'; rr(g, 52 + i * 40, h - 48 - bh, 28, bh, 7); g.fill(); });
    g.fillStyle = WINE; g.textBaseline = 'middle'; fitFont(g, 'Rank', 800, 92, w - 210); g.fillText('Rank', 190, h / 2 + 4);
  }, 560, 220);
  const chipFace = new THREE.Mesh(plate(1.46, .56, .28), printed(chipTex, { emissiveIntensity: .25 })); chipFace.position.z = .112; chip.add(chipFace);
  const chipShadow = stage.shadowBlob(-2.2, CZ + .9, 1.6, .55, .12);

  /* framing box = the lens' whole sweep, so the camera never cuts the handle */
  const top = CY + CH / 2 + .45; const bounds = new THREE.Mesh(new THREE.BoxGeometry(6, top - FY, 2.2)); bounds.position.set(-.07, (top + FY) / 2, CZ + .6);
  bounds.visible = false; bounds.userData.noReflect = true; G.add(bounds);

  /* ---------- motion ---------- */
  const yTop = CY + CH / 2 + .02 - BH / 2 - R0 - .14; // the lens never slides under the frosted bar
  const place = t => {
    const lx = -.3 + Math.sin(t * .42) * .75, ly = yTop - .2 + Math.sin(t * .29 + .9) * .2;
    L.position.x = lx; L.position.y = ly; L.rotation.z = Math.sin(t * .33) * .05; L.rotation.y = -.1 + Math.sin(t * .27) * .1;
    lensShadow.position.x = lx + 1.2;
  };
  place(still ? 1.6 : 0);
  stage.floatObj(card, .035, .45); stage.floatObj(bar, .05, .6, 1); stage.floatObj(chip, .09, .7, 2.2);
  stage.on(t => {
    if (!still) place(t);
    caret.visible = still || Math.sin(t * 5.4) > -.2;
    pill.scale.setScalar(1 + Math.max(0, Math.sin(t * 1.6)) * .045);
    chip.rotation.y = .18 + Math.sin(t * .5) * .08; chipShadow.material.opacity = .12 - (chip.position.y - chipY) * .1;
  });
  stage.o.rot = [.05, -.14]; G.rotation.set(.05, -.14, 0);
}
