/* Our Ethos (and the fallback badge): a thick polished crystal award with a sloped top, the title engraved in crimson on
   its face and the sub line beneath, set into a porcelain base with a champagne-metal band. It turns slowly on its base so
   studio reflections travel across the glass; a glass sphere and a coral bead float beside it. */
export default async function build(stage, o, lib) {
  const { THREE, M, C, rbox, canvasTexture } = lib; const G = stage.group; const fy = stage.o.floorY ?? -2.6;
  const title = String(o.title || 'RCV').trim(), sub = String(o.sub || 'Responsive Coding Volution').trim().toUpperCase();
  if (document.fonts) await Promise.race([Promise.all([document.fonts.load("600 120px 'Playfair Display'"), document.fonts.load('700 40px Manrope')]), new Promise(r => setTimeout(r, 1500))]).catch(() => {});

  // weld an extruded shape by position and rebuild smooth normals (round, reflection-friendly bevels)
  const smooth = geo => {
    const p = geo.getAttribute('position'), seen = new Map(), v = [], idx = [];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = `${Math.round(x * 1e4)}|${Math.round(y * 1e4)}|${Math.round(z * 1e4)}`; let j = seen.get(k); if (j === undefined) { j = v.length / 3; seen.set(k, j); v.push(x, y, z); } idx.push(j); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals(); geo.groups.forEach(q => g.addGroup(q.start, q.count, q.materialIndex)); geo.dispose(); return g;
  };

  // studio sweep seen only through the glass (refraction pass), never drawn on the transparent badge itself
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.1, 2.06, 2.0), map: canvasTexture((g, w, h) => {
    g.fillStyle = '#7d6e68'; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h * (.5 + .15 / 14)); g.scale(1.6 / 14 * w, 2.1 / 14 * h);
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 2.3); r.addColorStop(0, '#ffffff'); r.addColorStop(.3, '#fcf8f5'); r.addColorStop(.44, '#efe7e1'); r.addColorStop(.62, '#c9bcb4'); r.addColorStop(1, '#7d6e68'); g.fillStyle = r; g.fillRect(-3, -3, 6, 6); g.restore();
  }, 512, 512) }));
  sweep.position.z = -2.2; sweep.onBeforeRender = r => { const on = r.getRenderTarget() !== null; sweep.material.colorWrite = on; sweep.material.depthWrite = on; };
  stage.scene.add(sweep);

  const award = new THREE.Group(); G.add(award);
  const porcelain = M.ceramic(0xfbf9f6, { roughness: .2, clearcoat: 1, clearcoatRoughness: .07 });
  const champagne = M.metal(0xe7e1da, { roughness: .32, envMapIntensity: 2.1 });

  // base: porcelain plinth wrapped by a champagne band, porcelain top step that holds the crystal
  const pH = .64, pY = fy + pH / 2;
  const plinth = new THREE.Mesh(rbox(3.15, pH, 1.5, .1, 6), porcelain); plinth.position.y = pY; award.add(plinth);
  const band = new THREE.Mesh(rbox(3.22, .2, 1.57, .1, 6), champagne); band.position.y = pY + .05; award.add(band);
  const step = new THREE.Mesh(rbox(2.86, .2, 1.16, .08, 5), porcelain); step.position.y = fy + pH + .1; award.add(step);
  const lip = new THREE.Mesh(rbox(2.92, .035, 1.22, .016, 2), champagne); lip.position.y = fy + pH + .012; award.add(lip);
  const seat = fy + pH + .2;

  // the crystal: thick slab, top edge rising to the right, rounded top corners, polished round bevels
  const w = 2.4, hl = 3.0, hr = 3.5, rc = .24, D = .56, B = .12;
  const dx = -w, dy = hl - hr, dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, hr - rc); sh.quadraticCurveTo(w / 2, hr, w / 2 + ux * rc, hr + uy * rc);
  sh.lineTo(-w / 2 - ux * rc, hl - uy * rc); sh.quadraticCurveTo(-w / 2, hl, -w / 2, hl - rc); sh.lineTo(-w / 2, 0);
  const slabGeo = smooth(new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 7, curveSegments: 16 })); slabGeo.translate(0, 0, -D / 2);
  const glass = M.glass({ side: THREE.DoubleSide, thickness: .7, roughness: .02, ior: 1.5, envMapIntensity: 2.4, attenuationColor: new THREE.Color(0xf6f0ec), attenuationDistance: 3 });
  const edge = M.glass({ side: THREE.DoubleSide, thickness: 2.4, roughness: .035, ior: 1.5, envMapIntensity: 2.6, attenuationColor: new THREE.Color(0xdcc5ca), attenuationDistance: 1.05 });
  const slab = new THREE.Mesh(slabGeo, [glass, edge]); slab.position.y = seat - .14; award.add(slab);
  const faceZ = D / 2 + B;

  // engraving on the face: crimson title with an inner shadow (cut into the glass), a fine rule with a diamond, the sub line
  const face = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h);
    const lay = document.createElement('canvas'); lay.width = w; lay.height = h; const L = lay.getContext('2d');
    let fs = 330; L.font = `600 ${fs}px 'Playfair Display', Georgia, serif`; const tw = L.measureText(title).width; if (tw > w * .84) fs = Math.floor(fs * w * .84 / tw);
    L.font = `600 ${fs}px 'Playfair Display', Georgia, serif`; L.textAlign = 'center';
    const ty = 520; const grad = L.createLinearGradient(0, ty - fs * .72, 0, ty); grad.addColorStop(0, '#a90c27'); grad.addColorStop(1, '#d0143a');
    L.fillStyle = grad; L.fillText(title, w / 2, ty);
    const inv = document.createElement('canvas'); inv.width = w; inv.height = h; const I = inv.getContext('2d');
    I.fillStyle = '#3a0716'; I.fillRect(0, 0, w, h); I.globalCompositeOperation = 'destination-out'; I.font = L.font; I.textAlign = 'center'; I.fillText(title, w / 2, ty + 8);
    L.globalCompositeOperation = 'source-atop'; L.filter = 'blur(5px)'; L.globalAlpha = .6; L.drawImage(inv, 0, 0); L.filter = 'none'; L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
    g.drawImage(lay, 0, 0);
    g.fillStyle = '#c8102e'; g.fillRect(w / 2 - 250, 610, 205, 6); g.fillRect(w / 2 + 45, 610, 205, 6);
    g.save(); g.translate(w / 2, 613); g.rotate(Math.PI / 4); g.fillRect(-14, -14, 28, 28); g.restore();
    g.fillStyle = '#7a0f22'; g.textAlign = 'center'; const words = sub.split(/\s+/); let lines = [sub];
    if (sub.length > 14 && words.length > 1) { let best = 1, diff = 1e9; for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length); if (d < diff) { diff = d; best = i; } } lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]; }
    let ss = lines.length > 1 ? 74 : 96; const sp = Math.round(ss * .2); g.letterSpacing = sp + 'px'; g.font = `700 ${ss}px Manrope, 'Segoe UI', sans-serif`;
    const widest = Math.max(...lines.map(l => g.measureText(l).width)); if (widest > w * .9) { ss = Math.floor(ss * w * .9 / widest); g.font = `700 ${ss}px Manrope, 'Segoe UI', sans-serif`; }
    lines.forEach((l, i) => g.fillText(l, w / 2 + sp / 2, 735 + i * ss * 1.22));
  }, 1024, 1024);
  const ink = new THREE.MeshPhysicalMaterial({ map: face, transparent: true, roughness: .3, clearcoat: .8, clearcoatRoughness: .1, envMapIntensity: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), ink); plane.position.set(0, slab.position.y + 1.62, faceZ + .002); award.add(plane);

  // accents: a glass sphere floating low in front (it refracts the base), a coral bead beside the crystal
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.42, 64, 64), glass); orb.position.set(1.62, -1.86, 1.12); G.add(orb); stage.floatObj(orb, .09, .8, 0);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(.25, 48, 48), M.ceramic(C.peach, { roughness: .2, clearcoat: 1, clearcoatRoughness: .05 })); bead.position.set(-1.78, .55, .35); G.add(bead); stage.floatObj(bead, .16, .7, 1.4);

  stage.shadowBlob(0, 0, 4.2, 2.3, .2); stage.shadowBlob(0, 0, 3.4, 1.7, .3);
  const orbShadow = stage.shadowBlob(1.62, 1.12, 1.1, .8, .2);
  stage.on(t => { award.rotation.y = -.16 + Math.sin(t * .38) * .42; orbShadow.material.opacity = .2 - Math.sin(t * .8) * .05; });
  stage.o.rot = [.12, 0]; G.rotation.set(.12, 0, 0); stage.o.sway = .04;
}
