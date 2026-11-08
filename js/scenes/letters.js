/* About Us hero badge: the RCV monogram as a studio product shot. Thick extruded letters with glossy crimson ceramic
   faces set in polished champagne-metal bevels and sides stand on a two-tier round porcelain plinth with a fine champagne
   ring. The word turns slowly, so studio reflections slide across the faces and rims; a clear glass sphere and a coral
   ceramic bead float above it. One bold object, no framed photo (the page photo is already right beside the badge).
   The camera framing is tightened to the real silhouette (round plinths waste a lot of the engine's box fit). */
export default function build(stage, o, lib) {
  const { THREE, M, C, FontLoader, TextGeometry, canvasTexture } = lib;
  const G = stage.group; const FY = stage.o.floorY ?? -2.6; const still = !!lib.reduced;
  const txt = String(o.title || 'RCV').trim().toUpperCase().slice(0, 4) || 'RCV';

  /* materials */
  const crimson = M.ceramic(0x8c0a20, { roughness: .2, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.35 });
  /* two tall studio strip lights added to the glaze's clearcoat reflection (world-space reflection direction): near each end
     of the turn their narrow reflections glide across the flat crimson faces, letter after letter, then glide back */
  crimson.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
      #ifdef USE_CLEARCOAT
      {
        vec3 rv = inverseTransformDirection( reflect( - geometryViewDir, geometryClearcoatNormal ), viewMatrix );
        float az = atan( rv.x, rv.z ), el = asin( clamp( rv.y, -1.0, 1.0 ) );
        float tall = smoothstep( -.7, -.52, el ) * ( 1.0 - smoothstep( .02, .2, el ) );
        float stripA = 1.0 - smoothstep( .012, .034, abs( az - .6 ) );
        float stripB = 1.0 - smoothstep( .008, .026, abs( az + .58 ) );
        float glowA = 1.0 - smoothstep( .0, .16, abs( az - .6 ) );
        clearcoatRadiance += vec3( 1.0, .97, .94 ) * tall * ( 9.0 * stripA + 7.0 * stripB + 1.1 * glowA );
      }
      #endif`);
  };
  crimson.customProgramCacheKey = () => 'rcv-letters-glaze';
  const champagne = M.metal(0xe7e1da, { roughness: .17, envMapIntensity: 1.6 });
  const porcelain = M.ceramic(0xfbf9f6, { roughness: .24, clearcoat: .9, clearcoatRoughness: .08 });
  const linen = M.ceramic(0xece7e1, { roughness: .3, clearcoat: .7, clearcoatRoughness: .12 });

  /* soft round contact shadow: dark right at the rim, fading out within a short distance (radial alpha texture) */
  const ringShadow = (radius, spread, opacity, y) => {
    const R = radius + spread, k = radius / R;
    const t = canvasTexture((g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, 'rgba(30,27,26,.9)'); r.addColorStop(k * .97, 'rgba(30,27,26,.9)'); r.addColorStop(k, 'rgba(30,27,26,.6)');
      r.addColorStop(k + (1 - k) * .3, 'rgba(30,27,26,.2)'); r.addColorStop(k + (1 - k) * .65, 'rgba(30,27,26,.05)'); r.addColorStop(1, 'rgba(30,27,26,0)');
      g.fillStyle = r; g.fillRect(0, 0, w, h);
    }, 512, 512);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 1; return m;
  };

  /* lathe profile of a disc with softly rounded edges (outward normals; flat top kept flat up to the round-over) */
  const discProfile = (r, y0, y1, rc) => {
    const p = [new THREE.Vector2(0, y0), new THREE.Vector2(r - rc - .02, y0)];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI / 2; p.push(new THREE.Vector2(r - rc + Math.cos(a) * rc, y0 + rc + Math.sin(a) * rc)); }
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; p.push(new THREE.Vector2(r - rc + Math.cos(a) * rc, y1 - rc + Math.sin(a) * rc)); }
    p.push(new THREE.Vector2(r - rc - .02, y1), new THREE.Vector2(0, y1)); return p;
  };

  /* plinth: linen porcelain foot, white porcelain top tier, champagne ring resting on the ledge between them */
  const R1 = 3.16, R2 = 2.98, h1 = .3, h2 = .24, top = FY + h1 + h2;
  const foot = new THREE.Mesh(new THREE.LatheGeometry(discProfile(R1, FY, FY + h1, .07), 160), linen); G.add(foot);
  const deck = new THREE.Mesh(new THREE.LatheGeometry(discProfile(R2, FY + h1 - .01, top, .075), 160), porcelain); G.add(deck);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R2 + .045, .042, 18, 220), champagne); ring.rotation.x = Math.PI / 2; ring.position.y = FY + h1 + .036; G.add(ring);
  G.add(ringShadow(R1, .3, .6, FY + .006));
  const inlay = new THREE.Mesh(new THREE.TorusGeometry(R2 - .26, .016, 10, 200), champagne); inlay.rotation.x = Math.PI / 2; inlay.position.y = top + .002; G.add(inlay);

  /* studio sweep seen only through the glass (drawn in the transmission pass, never on the transparent canvas itself) */
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.18, 1.15), map: canvasTexture((g, w, h) => {
    const r = g.createRadialGradient(w * .5, h * .46, w * .01, w * .5, h * .5, w * .5); r.addColorStop(0, '#fffdfb'); r.addColorStop(.07, '#f4ede8'); r.addColorStop(.16, '#d9ccc4'); r.addColorStop(.3, '#a8978e'); r.addColorStop(.6, '#86766f'); r.addColorStop(1, '#7a6b64'); g.fillStyle = r; g.fillRect(0, 0, w, h);
  }, 512, 512) })); sweep.onBeforeRender = r => { const on = r.getRenderTarget() !== null; sweep.material.colorWrite = on; sweep.material.depthWrite = on; };
  stage.scene.add(sweep);

  /* accents: clear glass sphere (upper left) and a coral ceramic bead (upper right), bobbing slowly out of phase */
  const acc = [];
  const glassBall = new THREE.Mesh(new THREE.SphereGeometry(.36, 64, 48), M.glass({ thickness: .7, roughness: .03, envMapIntensity: 1.8 }));
  glassBall.position.set(-2.45, top + 2.95, .3); G.add(glassBall); acc.push([glassBall, .36, .13]);
  sweep.position.set(glassBall.position.x, glassBall.position.y - (glassBall.position.z + 5) * Math.tan(15 * Math.PI / 180), -5); // bright window right behind the glass (as seen by the 15 degree camera)
  const bead = new THREE.Mesh(new THREE.SphereGeometry(.25, 56, 40), M.ceramic(C.peach, { roughness: .2, clearcoat: 1, clearcoatRoughness: .06 }));
  bead.position.set(2.62, top + 2.62, .7); G.add(bead); acc.push([bead, .25, .11]);
  if (!still) { stage.floatObj(glassBall, .13, .62, 0); stage.floatObj(bead, .11, .78, 2.1); }

  /* crease-angle smoothing per material group: round bevels and curved walls shade like polished metal, corners stay crisp,
     and the flat crimson faces keep perfectly flat normals */
  const crease = (geo, deg = 38) => {
    const P = geo.attributes.position.array, n = geo.attributes.position.count, F = new Float32Array(n * 3), N = new Float32Array(n * 3);
    const grp = new Uint8Array(n); for (const g of geo.groups) for (let i = g.start; i < g.start + g.count; i++) grp[i] = g.materialIndex;
    for (let i = 0; i < n; i += 3) {
      const ax = P[i * 3], ay = P[i * 3 + 1], az = P[i * 3 + 2];
      const ux = P[i * 3 + 3] - ax, uy = P[i * 3 + 4] - ay, uz = P[i * 3 + 5] - az, vx = P[i * 3 + 6] - ax, vy = P[i * 3 + 7] - ay, vz = P[i * 3 + 8] - az;
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      for (let k = 0; k < 3; k++) { F[(i + k) * 3] = cx; F[(i + k) * 3 + 1] = cy; F[(i + k) * 3 + 2] = cz; }
    }
    const map = new Map(), q = v => Math.round(v * 2e3);
    for (let i = 0; i < n; i++) { const key = grp[i] + '|' + q(P[i * 3]) + '|' + q(P[i * 3 + 1]) + '|' + q(P[i * 3 + 2]); const l = map.get(key); if (l) l.push(i); else map.set(key, [i]); }
    const lim = Math.cos(deg * Math.PI / 180);
    for (const l of map.values()) for (const i of l) {
      const ax = F[i * 3], ay = F[i * 3 + 1], az = F[i * 3 + 2], al = Math.hypot(ax, ay, az); let sx = 0, sy = 0, sz = 0;
      for (const j of l) { const bx = F[j * 3], by = F[j * 3 + 1], bz = F[j * 3 + 2], bl = Math.hypot(bx, by, bz); if (!bl) continue; if (!al || (ax * bx + ay * by + az * bz) / (al * bl) >= lim) { sx += bx; sy += by; sz += bz; } }
      const s = Math.hypot(sx, sy, sz) || 1; N[i * 3] = sx / s; N[i * 3 + 1] = sy / s; N[i * 3 + 2] = sz / s;
    }
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); return geo;
  };

  /* framing samples (group space, at rest): plinth rims, accent bob ranges, and the word's corners over its whole turn */
  const pts = [];
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pts.push(new THREE.Vector3(c * (R1 + .1), FY, s * (R1 + .1)), new THREE.Vector3(c * R2, top, s * R2)); }
  acc.forEach(([m, r, amp]) => { const p = m.position; for (const [dx, dy, dz] of [[r, 0, 0], [-r, 0, 0], [0, r + amp, 0], [0, -r - amp, 0], [0, 0, r], [0, 0, -r]]) pts.push(new THREE.Vector3(p.x + dx, p.y + dy, p.z + dz)); });

  const tightFit = (elev) => {
    const fit0 = stage.fitCamera.bind(stage); let m0 = 1.12; const v = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    stage.fitCamera = (margin) => {
      if (margin) m0 = margin; fit0(m0); const cam = stage.camera; if (!stage.center) return;
      const tgt = stage.center.clone(), dir = new THREE.Vector3(0, Math.sin(elev), Math.cos(elev)); let dist = cam.position.distanceTo(tgt);
      const th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
      for (let it = 0; it < 7; it++) {
        cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const p of pts) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
        right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
        tgt.addScaledVector(right, (x0 + x1) / 2 * th * dist * cam.aspect).addScaledVector(up, (y0 + y1) / 2 * th * dist);
        dist *= Math.max(.5, Math.min(1.5, Math.max((x1 - x0) / 2, (y1 - y0) / 2) * m0));
      }
      cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt); cam.updateMatrixWorld(); stage.center = tgt;
    };
  };

  return new Promise(resolve => {
    new FontLoader().load('/assets/fonts/helvetiker_bold.typeface.json', font => {
      const size = 1.9, depth = .62, bevel = { bevelEnabled: true, bevelThickness: .085, bevelSize: .052, bevelSegments: 7 };
      const word = new THREE.Group(); word.position.y = top; G.add(word);
      const glyphs = [...txt].map(ch => {
        const geo = new TextGeometry(ch, { font, size, depth, curveSegments: 20, ...bevel });
        geo.computeBoundingBox(); const b = geo.boundingBox; geo.translate(-b.min.x, -b.min.y, -(b.min.z + b.max.z) / 2);
        crease(geo); geo.computeBoundingBox();
        return { geo, w: b.max.x - b.min.x, d: b.max.z - b.min.z, h: b.max.y - b.min.y, ch };
      });
      /* hand-set tracking (optical: tighter next to the open C and the slanted V) */
      const gap = (a, b) => (b === 'V' || a === 'C' ? .065 : .1) * size;
      let x = 0; const xs = glyphs.map((g, i) => { const at = x; x += g.w + (i < glyphs.length - 1 ? gap(g.ch, glyphs[i + 1].ch) : 0); return at; }); const total = x;
      glyphs.forEach((g, i) => {
        const m = new THREE.Mesh(g.geo, [crimson, champagne]); m.position.x = xs[i] - total / 2; word.add(m);
        for (const a of [-.42, 0, .42]) for (const [px, pz] of [[m.position.x, -g.d / 2], [m.position.x + g.w, -g.d / 2], [m.position.x, g.d / 2], [m.position.x + g.w, g.d / 2]]) for (const py of [0, g.h])
          pts.push(new THREE.Vector3(px * Math.cos(a) + pz * Math.sin(a), top + py, -px * Math.sin(a) + pz * Math.cos(a)));
      });
      /* tight contact shadow under the letters, turning with them */
      const sh = stage.shadowBlob(0, 0, total * 1.06, depth * 2.6, .42); word.add(sh); sh.position.set(0, .006, 0);
      if (!still) stage.on(t => { word.rotation.y = Math.sin(t * .33) * .4; });
      resolve();
    }, undefined, () => resolve());
  }).then(() => {
    /* longer lens (less wide-angle distortion, like a product photo) and a gentle 15 degree look-down */
    stage.camera.fov = 21; stage.camera.updateProjectionMatrix(); stage.o.sway = stage.o.sway ?? .04; stage.o.rot = stage.o.rot || [0, 0];
    tightFit(THREE.MathUtils.degToRad(15));
  });
}
