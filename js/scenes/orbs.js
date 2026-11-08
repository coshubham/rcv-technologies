/* RCV Technologies — footer "orbs" scene (every page; transparent canvas over the deep-wine footer gradient).
   A lacquered crimson orb wearing a thin polished champagne ring floats above a glossy dark floor. Six glossy satellites
   (porcelain, crimson, clear glass, coral, champagne pearl, blush) glide on three inclined orbits around it — two per orbit,
   orbit spacing chosen so nothing ever touches. Each sphere has a contact shadow that follows it and softens with height;
   the engine's floor mirror is faded with depth. Only light, bright materials (no dark orbs that sink into the wine) plus a
   soft blush back light that separates the silhouettes from the background. The camera frames every orbit position, pointer
   pose and the entrance, so nothing is ever cut at the canvas edges. One transmission material, ~45k triangles incl. mirror. */
export default function build(stage, opts, lib) {
  const { THREE, M, C } = lib; const G = stage.group; const PI = Math.PI;
  const F = stage.o.floorY ?? -1.9; const reduced = !!lib.reduced;
  const CORE_R = .95, CY = F + 1.38, BOB = .06;                                  // core sits low so its reflection reads

  /* ---------- materials (bright on wine) ---------- */
  const coreMat = new THREE.MeshPhysicalMaterial({ color: C.ember, metalness: .4, roughness: .3, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.35 }); // candy lacquer: tinted metallic base under a clear coat
  const ringMat = M.metal(0xe7e1da, { roughness: .13, envMapIntensity: 1.9 });
  const porcelain = M.ceramic(0xfdfcfa, { roughness: .2, clearcoat: 1, clearcoatRoughness: .05 });
  const crimson = M.ember({ roughness: .18, clearcoat: 1, clearcoatRoughness: .04 });
  const glass = M.glass({ thickness: .76, roughness: .02, clearcoat: .4, envMapIntensity: 1.05 });   // clear: lets the crimson core refract through
  const coral = M.ceramic(C.peach, { roughness: .24, clearcoat: 1, clearcoatRoughness: .06 });
  const pearl = new THREE.MeshPhysicalMaterial({ color: 0xf3ece4, metalness: .25, roughness: .22, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.6 });
  const blush = M.ceramic(0xfbe4e3, { roughness: .22, clearcoat: 1, clearcoatRoughness: .05 });

  /* ---------- core orb + ring ---------- */
  const core = new THREE.Mesh(new THREE.SphereGeometry(CORE_R, 64, 40), coreMat); core.position.set(0, CY, 0); G.add(core);
  const ringPivot = new THREE.Group(); ringPivot.position.set(0, CY, 0); G.add(ringPivot);
  const ringTilt = new THREE.Group(); ringTilt.rotation.set(.36, 0, -.14); ringPivot.add(ringTilt);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, .03, 12, 144), ringMat); ring.rotation.x = PI / 2; ring.userData.noReflect = true; ringTilt.add(ring);
  const coreShadow = stage.shadowBlob(0, 0, 2.9, 1.7, .3, F + .01);

  /* ---------- satellites on three inclined orbits (R spacing > sum of neighbouring radii, so they never collide) ---------- */
  const ORB = [{ R: 1.75, inc: .44, node: .3, sp: .38 }, { R: 2.42, inc: -.3, node: 1.9, sp: .27 }, { R: 3.1, inc: .2, node: 3.4, sp: .2 }];
  const SAT = [[0, porcelain, .22, 0], [0, crimson, .12, PI], [1, glass, .38, 0], [1, coral, .18, 2.6], [2, pearl, .25, 0], [2, blush, .28, 3.3]];
  const orbitPos = (ob, a, out) => { const x = Math.cos(a) * ob.R, z = Math.sin(a) * ob.R, y1 = -z * Math.sin(ob.inc), z1 = z * Math.cos(ob.inc), c = Math.cos(ob.node), s = Math.sin(ob.node); return out.set(x * c + z1 * s, y1, -x * s + z1 * c); };
  const sats = SAT.map(([oi, mat, r, ph]) => {
    const seg = r > .3 ? 44 : 36; const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * .68)), mat); m.userData.noFit = true; G.add(m);
    const sh = stage.shadowBlob(0, 0, r * 3.4, r * 2.1, .24, F + .012); sh.userData.noFit = true;
    return { m, sh, r, ob: ORB[oi], ph };
  });
  coreShadow.userData.noFit = true;

  /* soft blush back light: a real rim on every silhouette so nothing melts into the dark background */
  const rimL = new THREE.DirectionalLight(0xffe4e1, .7); rimL.position.set(2.5, 3.5, -6); stage.scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0xfff2ee, .4); rimR.position.set(-5, 1.5, -3); stage.scene.add(rimR);

  /* ---------- motion ---------- */
  const v = new THREE.Vector3();
  function update(t) {
    const tt = (reduced ? 0 : t) + 12, cy = CY + Math.sin(tt * .7) * BOB;   // +12 s: start from a balanced spread, not a line
    core.position.y = cy; ringPivot.position.y = cy; ringPivot.rotation.y = Math.sin(tt * .13) * .55; ringTilt.rotation.z = -.14 + Math.sin(tt * .23) * .06; // gyroscope wobble: the ring always stays open to the camera, never edge-on
    for (const s of sats) {
      orbitPos(s.ob, s.ph + tt * s.ob.sp, v); s.m.position.set(v.x, cy + v.y, v.z);
      const h = cy + v.y - s.r - F; s.sh.position.x = v.x; s.sh.position.z = v.z; s.sh.material.opacity = Math.max(.07, .3 - h * .09); s.sh.scale.setScalar(1 + h * .28);
    }
  }
  update(0);
  // glossy floor: fade the engine's mirrored copy with depth below the floor (and never draw it above the floor)
  let patched = false; const bottomU = { value: 60 };   // also fade it out above the canvas bottom edge, so it is never cut
  const fadeMat = mt => {
    mt.onBeforeCompile = sh => {
      sh.uniforms.uMirFloor = { value: F }; sh.uniforms.uMirFade = { value: 1.35 }; sh.uniforms.uMirBottom = bottomU;
      sh.vertexShader = 'varying float vMirY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 mw = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n mw = instanceMatrix * mw;\n#endif\n vMirY = (modelMatrix * mw).y; }');
      sh.fragmentShader = 'uniform float uMirFloor; uniform float uMirFade; uniform float uMirBottom; varying float vMirY;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n{ float dd = uMirFloor - vMirY; gl_FragColor.a *= 1.3 * (1.0 - smoothstep(0.0, uMirFade, dd)) * step(-0.002, dd) * smoothstep(0.0, uMirBottom, gl_FragCoord.y); }');
    };
    mt.customProgramCacheKey = () => 'mirrorFade'; mt.needsUpdate = true;
  };
  stage.on(t => {
    if (!patched && stage.mirror) { patched = true; stage.mirror.children.forEach(c => (Array.isArray(c.material) ? c.material : [c.material]).forEach(fadeMat)); }
    bottomU.value = Math.max(8, stage.renderer.domElement.height * .3);
    update(t);
  });

  /* ---------- camera: slightly elevated; frame the whole orbit envelope over every pointer pose and the entrance ---------- */
  stage.o.rot = [0, 0]; stage.o.sway = .08; stage.o.py = .1;
  const ELEV = .2;
  let fitMargin = 1.2, P = null;
  stage.fitCamera = function (margin) {
    if (margin) fitMargin = margin; this.fitted = true;
    const cam = this.camera;
    if (!P) { // pose-transformed envelope points, computed once (the orbits never change); resizes only re-solve the camera
      const pts = [], add = (x, y, z, r) => pts.push(x + r, y, z, x - r, y, z, x, y + r, z, x, y - r, z, x, y, z + r, x, y, z - r);
      add(0, CY + BOB, 0, CORE_R); add(0, CY - BOB, 0, CORE_R);
      for (let k = 0; k < 24; k++) { const a = k / 24 * PI * 2; for (const sy of [-1, 1]) add(Math.cos(a) * 1.36, CY + sy * (.55 + BOB), Math.sin(a) * 1.36, .03); } // ring band
      for (const s of sats) for (let k = 0; k < 24; k++) { orbitPos(s.ob, k / 24 * PI * 2, v); add(v.x, CY + v.y + BOB, v.z, s.r); add(v.x, CY + v.y - BOB, v.z, s.r); }
      for (let k = 0; k < 16; k++) { const a = k / 16 * PI * 2; pts.push(Math.cos(a) * 3.2, F - .2, Math.sin(a) * 1.4); }   // top of the floor reflection
      const Y = Math.abs(this.o.px ?? .35) * .5 + Math.abs(this.o.sway ?? .05), Pp = Math.abs(this.o.py ?? .18) * .5, sw = Math.abs(this.o.sway ?? .05), base = this.o.rot || [0, 0];
      const poses = []; for (const k of [-1, -.5, 0, .5, 1]) for (const p of [-1, 1]) poses.push([base[0] + p * Pp, base[1] + k * Y, 1, 0]);
      for (const k of [0, .35, .7]) for (const s of [-1, 1]) poses.push([base[0], base[1] + s * sw, .78 + .22 * (1 - Math.pow(1 - k, 3)), -.5 * Math.pow(1 - k, 3)]);
      P = []; const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
      for (const [rx, ry, s, py] of poses) { mt.compose(ps.set(0, py, 0), q.setFromEuler(e.set(rx, ry, 0)), sc.setScalar(s)); const m = mt.elements; for (let i = 0; i < pts.length; i += 3) { const x = pts[i], y = pts[i + 1], z = pts[i + 2]; P.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]); } }
    }
    const ca = Math.cos(ELEV), sa = Math.sin(ELEV), th = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), asp = cam.aspect, lim = 1 / fitMargin;
    let tx = 0, ty = 0, tz = 0; { let y0 = 1e9, y1 = -1e9; for (let i = 1; i < P.length; i += 3) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); } ty = (y0 + y1) / 2; }
    const bounds = d => { const cx = tx, cy = ty + sa * d, cz = tz + ca * d; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < P.length; i += 3) { const rx = P[i] - cx, ry = P[i + 1] - cy, rz = P[i + 2] - cz, zc = -sa * ry - ca * rz; if (zc < .05) return null; const X = rx / (zc * th * asp), Yc = (ca * ry - sa * rz) / (zc * th); if (X < x0) x0 = X; if (X > x1) x1 = X; if (Yc < y0) y0 = Yc; if (Yc > y1) y1 = Yc; } return [x0, x1, y0, y1]; };
    const solve = () => { let lo = .5, hi = 300; for (let i = 0; i < 36; i++) { const mid = (lo + hi) / 2, b = bounds(mid); if (b && Math.max(-b[0], b[1], -b[2], b[3]) <= lim) hi = mid; else lo = mid; } return hi; };
    let d = solve();
    for (let it = 0; it < 3; it++) { const b = bounds(d); if (!b) break; const ox = (b[0] + b[1]) / 2, oy = (b[2] + b[3]) / 2; tx += ox * d * th * asp; ty += oy * d * th * ca; tz -= oy * d * th * sa; d = solve(); }
    cam.position.set(tx, ty + sa * d, tz + ca * d); cam.lookAt(tx, ty, tz); cam.updateMatrixWorld(); this.center = new THREE.Vector3(tx, ty, tz);
  };
}
