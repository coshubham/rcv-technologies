/* Career / process: four numbered porcelain steps rising to a deep wine top step on a linen base with a champagne trim,
   a crimson ceramic ball hopping up them (squash on landing, its own soft shadow, it fades out at the top and starts
   again), and a satin crimson flag that really waves (vertex animation) on a champagne pole. As a corner badge it is
   only the sculpture (the page photo is already beside it); in a large section it adds the section photo as an
   arch-topped print standing behind the low steps. The camera framing is tightened to the real silhouette, seen from
   a gentle 3/4 view. */

/* Frame the camera on real silhouette points (group space, at rest) instead of the loose bounding box, keeping the
   engine's margin and a fixed look-down angle; re-applied by the engine on every resize. */
function tightFit(stage, THREE, pts, elev) {
  const fit0 = stage.fitCamera.bind(stage); let m0 = 1.14; const v = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  stage.fitCamera = (margin) => {
    if (margin) m0 = margin; fit0(m0); const cam = stage.camera; if (!stage.center) return;
    const tgt = stage.center.clone(), dir = new THREE.Vector3(0, Math.sin(elev), Math.cos(elev)); let dist = cam.position.distanceTo(tgt);
    const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    for (let it = 0; it < 8; it++) {
      cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
      tgt.addScaledVector(right, (x0 + x1) / 2 * th * dist * cam.aspect).addScaledVector(up, (y0 + y1) / 2 * th * dist);
      dist *= Math.max(.5, Math.min(1.5, Math.max((x1 - x0) / 2, (y1 - y0) / 2) * m0));
    }
    cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt); cam.updateMatrixWorld(); stage.center = tgt;
  };
}

export default function build(stage, o, lib) {
  const { THREE, M, C, rbox, canvasTexture } = lib; const G = stage.group; const FY = stage.o.floorY ?? -2.6;
  const still = !!lib.reduced; const badge = o.backdrop === false || stage.el.classList.contains('scene--badge');
  const P = new THREE.Group(); G.add(P); // the sculpture, turned to a 3/4 view
  P.rotation.y = badge ? .66 : .52; // deeper 3/4 turn for the square badge (more compact), gentler for the wide section

  /* materials */
  const glaze = (c, o2 = {}) => M.ceramic(c, { roughness: .22, clearcoat: .9, clearcoatRoughness: .07, ...o2 });
  const tones = [0xfbf9f6, 0xf5f0ea, 0xede7e0];
  const wine = glaze(0x7a0f22, { roughness: .2, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.3 });
  const champagne = M.metal(0xe7e1da, { roughness: .2, envMapIntensity: 1.6 });
  const linen = glaze(0xe9e3dc, { roughness: .32, clearcoat: .6, clearcoatRoughness: .14 });

  /* layout */
  const SW = 1.5, SD = 1.7, GAP = .05, BH = .17, y0 = FY + BH;
  const H = i => .74 + i * .6, X = i => (i - 1.5) * (SW + GAP), TOP = i => y0 + H(i);

  /* base slab with a champagne trim line, and its soft contact shadow */
  const BW = 4 * SW + 3 * GAP + .56, BD = SD + .56;
  const slab = new THREE.Mesh(rbox(BW, BH, BD, .07, 4), linen); slab.position.y = FY + BH / 2; P.add(slab);
  const trim = new THREE.Mesh(rbox(BW + .05, .046, BD + .05, .022, 2), champagne); trim.position.y = FY + BH - .04; P.add(trim);
  const sh0 = stage.shadowBlob(0, 0, BW * 1.2, BD * 1.9, .3); P.add(sh0); sh0.position.set(-.1, FY + .004, -.12);
  const sh1 = stage.shadowBlob(0, 0, BW * 1.04, BD * 1.25, .32); P.add(sh1); sh1.position.set(0, FY + .006, 0);

  /* numerals printed in the glaze (lit decals, Playfair like the page's list) */
  const numeral = (i, foil) => {
    const t = canvasTexture((g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = foil ? '#ffffff' : '#b40d2a'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = `600 196px 'Playfair Display', Georgia, serif`; g.fillText('0' + (i + 1), w / 2, h * .74); }, 256, 256);
    const mat = foil ? M.metal(0xe9e2da, { map: t, transparent: true, roughness: .26, envMapIntensity: 1.7, polygonOffset: true, polygonOffsetFactor: -2 })
      : new THREE.MeshPhysicalMaterial({ map: t, transparent: true, roughness: .3, clearcoat: .8, clearcoatRoughness: .08, polygonOffset: true, polygonOffsetFactor: -2 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), mat); m.position.set(X(i), TOP(i) - .4, SD / 2 + .003); return m;
  };

  /* the four steps */
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(rbox(SW, H(i), SD, .1, 5), i === 3 ? wine : glaze(tones[i])); s.position.set(X(i), y0 + H(i) / 2, 0); P.add(s);
    P.add(numeral(i, i === 3));
  }
  /* soft occlusion where each step meets the base and its taller neighbour */
  for (let i = 0; i < 4; i++) { const b = stage.shadowBlob(0, 0, SW * 1.25, SD * 1.2, .16); P.add(b); b.position.set(X(i), y0 + .004, 0); }

  /* flag: champagne foot, pole and finial on the back-left corner of the top step; satin crimson cloth flying over it */
  const PX = X(3) - SW / 2 + .19, PZ = -SD / 2 + .19, PH = 1.95, top3 = TOP(3);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, .06, 40), champagne); foot.position.set(PX, top3 + .03, PZ); P.add(foot);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .034, PH, 24), champagne); pole.position.set(PX, top3 + PH / 2, PZ); P.add(pole);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(.068, 32, 24), champagne); fin.position.set(PX, top3 + PH + .05, PZ); P.add(fin);
  const FW = 1.22, FH = .76, flagGeo = new THREE.PlaneGeometry(FW, FH, 32, 16); flagGeo.translate(FW / 2, 0, 0);
  const cloth = new THREE.MeshPhysicalMaterial({ color: 0xae0c29, roughness: .42, sheen: 1, sheenColor: new THREE.Color(0xf26b5b), sheenRoughness: .32, clearcoat: .22, clearcoatRoughness: .35, side: THREE.DoubleSide, envMapIntensity: 1.15 });
  const flag = new THREE.Mesh(flagGeo, cloth); flag.position.set(PX + .03, top3 + PH - FH / 2 - .05, PZ); P.add(flag);
  for (const dy of [FH / 2 - .04, -FH / 2 + .04]) { const g = new THREE.Mesh(new THREE.TorusGeometry(.047, .013, 10, 28), champagne); g.rotation.x = Math.PI / 2; g.position.set(PX, flag.position.y + dy, PZ); P.add(g); }
  const fpos = flagGeo.attributes.position, f0 = fpos.array.slice();
  const wave = t => {
    for (let k = 0; k < fpos.count; k++) {
      const x = f0[k * 3], y = f0[k * 3 + 1], a = x / FW;
      fpos.array[k * 3 + 2] = (Math.sin(x * 4.6 - t * 3.4 + y * .9) * .13 + Math.sin(x * 9 + t * 2.1 - y * 1.3) * .03) * (.25 + .75 * a);
      fpos.array[k * 3 + 1] = y - a * a * .06 + Math.sin(x * 4 - t * 3.4) * .02 * a;
      fpos.array[k * 3] = x - a * .03 * (1 + Math.sin(t * 1.3));
    }
    fpos.needsUpdate = true; flagGeo.computeVertexNormals();
  };
  wave(1.2);

  /* the crimson ball and its contact shadow */
  const R = .25, BZ = .36, XB = i => X(i) + (i === 3 ? .1 : 0); // the ball lands in front of the flag, clear of the pole
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), M.ceramic(C.ember, { roughness: .16, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.25 })); P.add(ball);
  const bsh = stage.shadowBlob(0, 0, .78, .78, .38); P.add(bsh);
  const ease = u => u * u * (3 - 2 * u), outBack = u => 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
  const T = 9.2, HOP = .9, LAND = .26;
  const place = t => {
    const c = t % T; let x = X(0), y = TOP(0), sy = 1, sxz = 1, scale = 1, lift = 0, step = 0;
    if (c < .55) { scale = outBack(c / .55); }
    else if (c < 1.0) { const u = (c - .55) / .45; if (u > .6) { const s = Math.sin((u - .6) / .4 * Math.PI); sy = 1 - .12 * s; sxz = 1 + .06 * s; } }
    else if (c < 1.0 + 3 * (HOP + LAND)) {
      const k = c - 1.0, i = Math.floor(k / (HOP + LAND)), w = k - i * (HOP + LAND);
      if (w < HOP) {
        const f = w / HOP, ya = TOP(i), yb = TOP(i + 1), hgt = .92;
        x = XB(i) + (XB(i + 1) - XB(i)) * f; y = ya + (yb - ya) * f + 4 * hgt * f * (1 - f); step = f < .5 ? i : i + 1;
        const vy = (yb - ya) + 4 * hgt * (1 - 2 * f); const st = Math.min(.07, Math.abs(vy) * .02); sy = 1 + st; sxz = 1 - st * .5;
      } else { const u = (w - HOP) / LAND, s = Math.sin(u * Math.PI); x = XB(i + 1); y = TOP(i + 1); step = i + 1; sy = 1 - .16 * s; sxz = 1 + .08 * s; }
    } else {
      step = 3; x = XB(3); y = TOP(3); const k = c - (1.0 + 3 * (HOP + LAND));
      if (k < .9) { const b1 = .42, b2 = .48; lift = k < b1 ? Math.sin(k / b1 * Math.PI) * .2 : Math.sin((k - b1) / b2 * Math.PI) * .06; }
      const out = T - .9; if (c > out) scale = 1 - ease(Math.min(1, (c - out) / .6));
      y += lift;
    }
    ball.position.set(x, y + R * sy * scale, BZ); ball.scale.set(sxz * scale, sy * scale, sxz * scale); ball.visible = scale > .002;
    const base = TOP(step); const hgt = Math.max(0, y - base);
    bsh.position.set(x, base + .007, BZ); const k2 = 1 + hgt * .5; bsh.scale.set(k2 * scale, k2 * scale, 1); bsh.material.opacity = .38 * scale * Math.max(.2, 1 - hgt * .7);
  };
  place(5.4);

  /* large section only: the section photo as an arch-topped print (the site's arch motif) in a porcelain frame with a
     champagne lip, standing behind the low steps and leaning on a champagne strut */
  let print = null;
  if (!badge && o.photo) {
    const AW = 1.9, AH = 2.72, B = .15, LEAN = .1;
    const arch = (w, h, y0) => { const sh = new THREE.Shape(), hw = w / 2; sh.moveTo(-hw, y0); sh.lineTo(hw, y0); sh.lineTo(hw, y0 + h - hw); sh.absarc(0, y0 + h - hw, hw, 0, Math.PI, false); sh.lineTo(-hw, y0); return sh; };
    const ring = (outer, inner) => { const sh = outer; sh.holes.push(new THREE.Path(inner.getPoints(64).reverse())); return sh; };
    print = new THREE.Group(); const lean = new THREE.Group(); lean.rotation.x = -LEAN; lean.position.y = B + .06; print.add(lean);
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(ring(arch(AW + 2 * B, AH + 2 * B, -B), arch(AW + .05, AH + .05, -.025)), { depth: .1, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 4, curveSegments: 64 }), glaze(0xfbf9f6, { roughness: .26 }));
    lean.add(frame);
    const lip = new THREE.Mesh(new THREE.ExtrudeGeometry(ring(arch(AW + .05, AH + .05, -.025), arch(AW, AH, 0)), { depth: .085, bevelEnabled: false, curveSegments: 64 }), champagne); lean.add(lip);
    const back = new THREE.Mesh(new THREE.ShapeGeometry(arch(AW + 2 * B, AH + 2 * B, -B), 48), glaze(0xf3eee8)); back.rotation.y = Math.PI; back.position.z = -.026; lean.add(back);
    const pg = new THREE.ShapeGeometry(arch(AW, AH, 0), 48), uv = pg.attributes.uv, pp = pg.attributes.position;
    const cover = ia => { const fa = AW / AH; const sx = ia > fa ? fa / ia : 1, sy = ia > fa ? 1 : ia / fa; for (let k = 0; k < uv.count; k++) uv.setXY(k, .5 + (pp.getX(k) / AW) * sx, .5 + (pp.getY(k) / AH - .5) * sy); uv.needsUpdate = true; };
    cover(1.5);
    const ptex = new THREE.TextureLoader().load(o.photo, t => { cover(t.image.width / t.image.height); stage.render(); }); ptex.colorSpace = THREE.SRGBColorSpace; ptex.anisotropy = 8;
    const pic = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: ptex, toneMapped: false })); pic.position.z = .045; lean.add(pic);
    const top = new THREE.Vector3(0, AH * .55, -.03).applyAxisAngle(new THREE.Vector3(1, 0, 0), -LEAN).add(lean.position), bot = new THREE.Vector3(0, 0, -.8);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(.026, .032, top.distanceTo(bot), 16), champagne); strut.position.copy(top).add(bot).multiplyScalar(.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize()); print.add(strut);
    const rail = new THREE.Mesh(rbox(AW + 2 * B + .3, .07, .2, .03, 2), champagne); rail.position.set(0, .035, .08); print.add(rail);
    print.position.set(-1.95, FY, -1.75); print.rotation.y = -.3; P.add(print);
    const ps = stage.shadowBlob(0, 0, 3.2, 1.5, .24); print.add(ps); ps.position.set(0, .004, -.25);
  }

  if (!still) stage.on(t => { place(t); wave(t); });

  /* framing samples (group space at rest): every solid mesh's box corners, plus the flag's wave room and the hop apexes */
  const pts = [], tmp = new THREE.Vector3(); G.updateMatrixWorld(true);
  G.traverse(m => {
    if (!m.isMesh || m === flag || m === ball || m.material.map === bsh.material.map && m.material.transparent) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) pts.push(m.localToWorld(tmp.set(x, y, z)).clone());
  });
  const addP = (x, y, z) => pts.push(P.localToWorld(tmp.set(x, y, z)).clone());
  for (const dz of [-.22, .22]) { addP(PX + FW + .05, top3 + PH - .03, PZ + dz); addP(PX + FW + .05, top3 + PH - FH - .14, PZ + dz); }
  for (let i = 0; i < 3; i++) addP((X(i) + X(i + 1)) / 2, TOP(i) + .3 + .92 + 2 * R, BZ);

  stage.camera.fov = 22; stage.camera.updateProjectionMatrix();
  stage.o.rot = stage.o.rot || [0, 0]; stage.o.sway = stage.o.sway ?? .05; stage.o.py = stage.o.py ?? .1;
  tightFit(stage, THREE, pts, THREE.MathUtils.degToRad(badge ? 19 : 17));
}
