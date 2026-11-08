/* RCV Technologies — scene module "rack" (hero badge of /services/server-side-frameworks/ and its child pages).
   A porcelain server cabinet on champagne feet holds five units: three servers with rows of drive bays, a network
   switch with crimson, coral and ivory patch cables looped between its ports, and a cooling unit whose three fans
   spin behind champagne grilles. Crimson LEDs blink (steady status lights, quick disk activity), champagne rack
   ears with screws frame every unit, champagne trims and a small nameplate outline the cabinet and a perforated vent
   runs down the side panel. A frosted "UPTIME 99.98%" card with a pulsing live dot and a row of status bars floats
   over the top right corner.
   No photo frame: the page already shows opts.photo beside the badge.
   1 transmission material (the frosted card), ~32k triangles; static parts are baked into one mesh per material and the
   LEDs are one instanced mesh, so the badge is 28 meshes (~50 draw calls with the glass pass). No shadow maps.
   Still frame when reduced. */
export default async function build(stage, opts, lib) {
  const { THREE, M, rbox, canvasTexture } = lib;
  const G = stage.group; const FY = stage.o.floorY ?? -2.6; const still = !!lib.reduced;
  const SANS = "Manrope, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
  const RED = '#c8102e', WINE = '#4b0c1e';
  if (document.fonts && document.fonts.load) {
    try { await Promise.race([Promise.all(['800 64px Manrope', '700 64px Manrope'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* fallback fonts are fine */ }
  }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const fitFont = (g, text, weight, px, maxW) => { let s = px; for (;;) { g.font = `${weight} ${s}px ${SANS}`; if (g.measureText(text).width <= maxW || s <= 12) return s; s -= 2; } };
  const printed = (t, o = {}) => new THREE.MeshPhysicalMaterial({ map: t, bumpMap: t, bumpScale: 1.2, roughness: .42, clearcoat: .35, clearcoatRoughness: .2, envMapIntensity: .8, ...o });
  const porc = M.ceramic(0xf8f5f1, { roughness: .3, clearcoat: .75 }), linen = M.ceramic(0xe9e3dc, { roughness: .36, clearcoat: .5 });
  const champ = M.metal(0xe7e1da, { roughness: .24 }), champSoft = M.metal(0xefe9e2, { metalness: .7, roughness: .34 }), champDk = M.metal(0xd6cfc7, { roughness: .4 });

  /* ---------- cabinet ---------- */
  const RW = 3.5, RD = 2.0, SIDE = .16, GAP = .045, FEET = .1, BASE = .2, TOPC = .18;
  const units = [{ k: 'srv', h: .64 }, { k: 'srv', h: .64 }, { k: 'net', h: .52 }, { k: 'srv', h: .64 }, { k: 'fan', h: .94 }]; // top to bottom
  const bodyH = units.reduce((s, u) => s + u.h, 0) + GAP * (units.length + 1), y0 = FY + FEET + BASE;
  const rack = new THREE.Group(); rack.rotation.y = -.4; G.add(rack);
  const sideTex = canvasTexture((g, w, h) => { // perforated vent on the side panel
    g.fillStyle = '#f6f2ed'; g.fillRect(0, 0, w, h); g.fillStyle = '#d7cfc8';
    for (let r = 0; r < 26; r++) for (let c = 0; c < 9; c++) { g.beginPath(); g.arc(34 + c * 26 + (r % 2) * 13, 40 + r * 26, 7, 0, Math.PI * 2); g.fill(); }
  }, 300, 760);
  const ventMat = printed(sideTex);
  [-1, 1].forEach(sx => {
    const p = new THREE.Mesh(rbox(SIDE, bodyH + .02, RD, .05, 3), porc); p.position.set(sx * (RW / 2 - SIDE / 2), y0 + bodyH / 2, 0); rack.add(p);
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(RD * .42, bodyH * .82), ventMat); vent.rotation.y = sx * Math.PI / 2; vent.position.set(sx * (RW / 2 + .002), y0 + bodyH / 2, -RD * .18); rack.add(vent);
  });
  const topC = new THREE.Mesh(rbox(RW + .04, TOPC, RD + .04, .07, 4), porc); topC.position.y = y0 + bodyH + TOPC / 2; rack.add(topC);
  const base = new THREE.Mesh(rbox(RW, BASE, RD, .06, 4), linen); base.position.y = FY + FEET + BASE / 2; rack.add(base);
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, FEET, 24), champ); f.position.set(a * (RW / 2 - .32), FY + FEET / 2, b * (RD / 2 - .3)); rack.add(f); });
  // champagne trims frame the front: two uprights on the side panels, bands on the top cap and the base, a small nameplate
  [-1, 1].forEach(sx => { const tr = new THREE.Mesh(rbox(.07, bodyH + .02, .03, .012, 2), champSoft); tr.position.set(sx * (RW / 2 - SIDE / 2), y0 + bodyH / 2, RD / 2 + .008); rack.add(tr); });
  [[y0 + bodyH + TOPC / 2, RW - .1], [FY + FEET + BASE / 2, RW - .14]].forEach(([y, w]) => { const tr = new THREE.Mesh(rbox(w, .05, .03, .012, 2), champSoft); tr.position.set(0, y, RD / 2 + .012); rack.add(tr); });
  const plateTex = canvasTexture((g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f4efe9'); gr.addColorStop(1, '#e2dad2'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#7a0f22'; g.font = `800 64px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '14px'; g.fillText('RCV', w / 2 + 7, h / 2 + 3); }, 256, 96);
  const plate = new THREE.Mesh(rbox(.56, .13, .03, .02, 2), champSoft); plate.position.set(0, FY + FEET + BASE / 2, RD / 2 + .03); rack.add(plate);
  const plateFace = new THREE.Mesh(new THREE.PlaneGeometry(.52, .1), new THREE.MeshPhysicalMaterial({ map: plateTex, metalness: .35, roughness: .3, clearcoat: .6 })); plateFace.position.set(0, FY + FEET + BASE / 2, RD / 2 + .0465); plateFace.userData.keep = true; rack.add(plateFace);
  const backP = new THREE.Mesh(rbox(RW - 2 * SIDE, bodyH, .06, .02, 2), M.ceramic(0xa89f98, { roughness: .6, clearcoat: 0 })); backP.position.set(0, y0 + bodyH / 2, -RD / 2 + .08); rack.add(backP);

  /* ---------- units ---------- */
  const IW = RW - 2 * SIDE - .02, FZ = RD / 2 - .07, FW = IW - .28; // inner width, front plane z, printed bezel width
  const leds = []; const led = (x, y, z, kind) => leds.push({ x, y, z, kind, p: Math.random() * 20, s: kind === 'disk' ? 7 + Math.random() * 9 : .9 + Math.random() * .8 });
  const wellMat = new THREE.MeshStandardMaterial({ color: 0x4b0c1e, roughness: .55 }), bladeMat = M.ceramic(0xf1ece6, { roughness: .32 }), hubMat = M.ember({ roughness: .24 });
  const blade = a => { // one curved fan blade turned by a (turning the control points turns the curve exactly)
    const R = (x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)], s = new THREE.Shape();
    s.moveTo(...R(0, .07)); s.quadraticCurveTo(...R(.13, .12), ...R(.28, .2)); s.quadraticCurveTo(...R(.31, .08), ...R(.25, -.02)); s.quadraticCurveTo(...R(.12, -.04), ...R(0, -.05)); s.closePath(); return s;
  };
  const bladeGeo = new THREE.ExtrudeGeometry(Array.from({ length: 7 }, (_, b) => blade(b * Math.PI * 2 / 7)), { depth: .016, bevelEnabled: false, curveSegments: 6 });
  const screwGeo = new THREE.CylinderGeometry(.024, .024, .02, 12); screwGeo.rotateX(Math.PI / 2);
  const fans = [];
  let yc = y0 + bodyH - GAP;
  units.forEach((u, ui) => {
    const cy = yc - u.h / 2; yc -= u.h + GAP;
    const body = new THREE.Mesh(rbox(IW, u.h, RD - .2, .035, 3), ui % 2 ? linen : porc); body.position.set(0, cy, FZ - (RD - .2) / 2); rack.add(body);
    [-1, 1].forEach(sx => { // champagne rack ears with two screws
      const ear = new THREE.Mesh(rbox(.13, u.h - .03, .05, .02, 2), champSoft); ear.position.set(sx * (IW / 2 - .068), cy, FZ + .02); rack.add(ear);
      [-1, 1].forEach(sy => { const sc = new THREE.Mesh(screwGeo, champDk); sc.position.set(sx * (IW / 2 - .068), cy + sy * (u.h / 2 - .1), FZ + .052); rack.add(sc); });
    });
    const BH = u.h - .06, PW = 1024, PH = Math.round(PW * BH / FW);
    const toX = px => -FW / 2 + px / PW * FW, toY = py => cy + BH / 2 - py / PH * BH; // canvas -> rack space
    const tex = canvasTexture((g, w, h) => {
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, ui % 2 ? '#f1ece6' : '#fbf9f6'); bg.addColorStop(1, ui % 2 ? '#e4ddd6' : '#eee8e2'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      if (u.k === 'srv') {
        g.strokeStyle = '#b9b0aa'; g.lineWidth = 6; g.beginPath(); g.arc(118, h / 2, 20, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#b9b0aa'; g.fillRect(115, h / 2 - 30, 6, 22);
        for (let i = 0; i < 6; i++) { const x = 170 + i * 104;
          g.fillStyle = '#2f2927'; rr(g, x, 20, 94, h - 40, 9); g.fill();
          g.fillStyle = '#463e3b'; for (let k = 0; k < 4; k++) g.fillRect(x + 12, 34 + k * 14, 70, 6);
          g.fillStyle = '#8a807a'; rr(g, x + 12, h - 52, 70, 14, 7); g.fill();
        }
        g.fillStyle = '#d5cdc6'; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { g.beginPath(); g.arc(820 + c * 30, 44 + r * 30, 8, 0, Math.PI * 2); g.fill(); }
      } else if (u.k === 'net') {
        for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++) { const x = 160 + c * 56 + Math.floor(c / 6) * 16, y = 22 + r * 54;
          g.fillStyle = '#2f2927'; rr(g, x, y, 46, 40, 5); g.fill(); g.fillStyle = '#4a413e'; g.fillRect(x + 14, y + (r ? 30 : 4), 18, 6);
          g.fillStyle = (c * 7 + r * 3) % 5 === 0 ? '#f26b5b' : '#cfc6c0'; g.fillRect(x + 4, y + (r ? -10 : 44), 10, 4);
        }
        g.fillStyle = '#cbc3bc'; [0, 1].forEach(k => { rr(g, 870 + k * 70, 26, 56, 82, 6); g.fill(); }); g.fillStyle = '#a79e98'; [0, 1].forEach(k => g.fillRect(880 + k * 70, 38, 36, 58));
        g.fillStyle = '#b9b0aa'; g.font = `800 30px ${SANS}`; g.fillText('10G', 40, h / 2 + 10);
      } else {
        [230, 512, 794].forEach(x => { g.fillStyle = '#e6dfd8'; rr(g, x - 128, 14, 256, h - 28, 22); g.fill(); g.fillStyle = '#c3bab3'; [[-104, -h / 2 + 38], [104, -h / 2 + 38], [-104, h / 2 - 38], [104, h / 2 - 38]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx, h / 2 + dy, 8, 0, Math.PI * 2); g.fill(); }); });
        g.fillStyle = '#d5cdc6'; for (let r = 0; r < 7; r++) { g.fillRect(24, 30 + r * 30, 60, 10); g.fillRect(w - 84, 30 + r * 30, 60, 10); }
      }
    }, PW, PH);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(FW, BH), printed(tex)); face.position.set(0, cy, FZ + .003); face.userData.keep = true; rack.add(face);
    if (u.k === 'srv') {
      led(toX(40), cy + .1, FZ + .02, 'status'); led(toX(40), cy - .1, FZ + .02, 'status2');
      for (let i = 0; i < 6; i++) led(toX(170 + i * 104 + 80), toY(34), FZ + .02, 'disk');
      const hdl = new THREE.Mesh(rbox(.05, u.h * .62, .07, .02, 2), champ); hdl.position.set(toX(980), cy, FZ + .06); rack.add(hdl);
    } else if (u.k === 'net') {
      led(toX(40), cy + .08, FZ + .02, 'status'); led(toX(80), cy + .08, FZ + .02, 'disk');
      const portXY = (c, r) => [toX(160 + c * 56 + Math.floor(c / 6) * 16 + 23), toY(22 + r * 54 + 20)];
      [[1, 0, 4, 1, 0xc8102e], [6, 0, 9, 1, 0xf26b5b], [3, 0, 7, 0, 0xf4efe9]].forEach(([c1, r1, c2, r2, col], i) => {
        const [xa, ya] = portXY(c1, r1), [xb, yb] = portXY(c2, r2), droop = .32 + i * .07;
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(xa, ya, FZ + .02), new THREE.Vector3(xa, ya - .02, FZ + .16), new THREE.Vector3(xa + (xb - xa) * .2, Math.min(ya, yb) - droop, FZ + .3), new THREE.Vector3(xb - (xb - xa) * .2, Math.min(ya, yb) - droop, FZ + .3), new THREE.Vector3(xb, yb - .02, FZ + .16), new THREE.Vector3(xb, yb, FZ + .02)]);
        const mat = M.ceramic(col, { roughness: .35, clearcoat: .5 });
        rack.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .028, 8, false), mat));
        [[xa, ya], [xb, yb]].forEach(([x, y]) => { const plug = new THREE.Mesh(rbox(.1, .085, .14, .02, 2), mat); plug.position.set(x, y, FZ + .07); rack.add(plug); });
      });
    } else {
      [230, 512, 794].forEach((px, i) => {
        const fan = new THREE.Group(); fan.position.set(toX(px), cy, FZ); fan.scale.setScalar(.9); rack.add(fan);
        const well = new THREE.Mesh(new THREE.CircleGeometry(.34, 40), wellMat); well.position.z = .004; fan.add(well);
        const blades = new THREE.Mesh(bladeGeo, bladeMat); blades.position.z = .03; blades.userData.keep = true; fan.add(blades);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .06, 28), hubMat); hub.rotation.x = Math.PI / 2; hub.position.z = .05; fan.add(hub);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.345, .024, 10, 56), champ); ring.position.z = .07; fan.add(ring);
        [.24, .14].forEach(r => { const gr = new THREE.Mesh(new THREE.TorusGeometry(r, .008, 6, 44), champ); gr.position.z = .075; fan.add(gr); });
        for (let s = 0; s < 4; s++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.012, .68, .012), champ); sp.rotation.z = s * Math.PI / 4 + Math.PI / 8; sp.position.z = .075; fan.add(sp); }
        fans.push({ blades, sp: 6.5 + i * .6 });
      });
    }
  });

  /* ---------- bake every static part into one mesh per material (a few dozen draw calls instead of ~150) ---------- */
  rack.updateMatrixWorld(true); const inv = rack.matrixWorld.clone().invert(); const bins = new Map(), baked = [];
  rack.traverse(o => { if (!o.isMesh || o.userData.keep) return; const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); (bins.get(o.material) || bins.set(o.material, []).get(o.material)).push(g); baked.push(o); });
  baked.forEach(o => o.parent.remove(o));
  for (const [mat, list] of bins) {
    const geo = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(k => { if (!list.every(g => g.attributes[k])) return; const size = list[0].attributes[k].itemSize, arr = new Float32Array(list.reduce((n, g) => n + g.attributes[k].array.length, 0)); let off = 0; list.forEach(g => { arr.set(g.attributes[k].array, off); off += g.attributes[k].array.length; }); geo.setAttribute(k, new THREE.BufferAttribute(arr, size)); });
    rack.add(new THREE.Mesh(geo, mat));
  }
  /* blinking LEDs: one instanced mesh; the per-instance colour also drives the emission */
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, roughness: .25 });
  ledMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n  totalEmissiveRadiance *= vColor;\n#endif'); };
  const ledMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.036, 12, 8), ledMat, leds.length); const dummy = new THREE.Object3D();
  const ON = new THREE.Color(0xc8102e), OFF = new THREE.Color(0x4b0c1e), lc = new THREE.Color();
  leds.forEach((l, i) => { dummy.position.set(l.x, l.y, l.z); dummy.scale.set(1, 1, .55); dummy.updateMatrix(); ledMesh.setMatrixAt(i, dummy.matrix); ledMesh.setColorAt(i, ON); });
  ledMesh.userData.noReflect = true; rack.add(ledMesh); // (a mirrored copy would lose the colour-driven emission)
  rack.add(stage.shadowBlob(0, 0, RW + .25, RD + .3, .3), stage.shadowBlob(0, 0, RW + .05, RD + .05, .22)); // contact shadows turn with the cabinet

  /* ---------- frosted UPTIME card ---------- */
  const KW = 2.3, KH = 1.25, CY = y0 + bodyH + TOPC + .1 - KH / 2; const card = new THREE.Group(); card.position.set(1.05, CY, 1.8); card.rotation.y = -.12; G.add(card);
  card.add(new THREE.Mesh(rbox(KW, KH, .16, .19, 5), M.frosted({ roughness: .36, thickness: .5 })));
  const lbl = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h); g.textBaseline = 'alphabetic';
    g.fillStyle = RED; g.strokeStyle = 'rgba(200,16,46,.3)'; g.lineWidth = 6; g.beginPath(); g.arc(70, 92, 27, 0, Math.PI * 2); g.stroke();
    g.font = `800 50px ${SANS}`; g.letterSpacing = '9px'; g.fillText('UPTIME', 116, 110); g.letterSpacing = '0px';
    g.fillStyle = WINE; fitFont(g, '99.98%', 800, 210, w - 100); g.fillText('99.98%', 46, 318);
    for (let i = 0; i < 30; i++) { g.fillStyle = i === 19 ? '#f6b7b1' : (i % 7 === 3 ? '#f26b5b' : RED); rr(g, 50 + i * 30.5, 382, 20, 92, 6); g.fill(); }
  }, 1000, 540);
  const lblM = new THREE.Mesh(new THREE.PlaneGeometry(KW - .14, KH - .08), new THREE.MeshBasicMaterial({ map: lbl, transparent: true, toneMapped: false })); lblM.position.z = .085; card.add(lblM);
  const cardShadow = stage.shadowBlob(1.05, 1.8, 2, .6, .1);
  const live = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), M.ember({ roughness: .2 })); live.scale.z = .5; live.position.set((KW - .14) * (70 / 1000 - .5), (KH - .08) * (.5 - 92 / 540), .1); card.add(live);

  /* ---------- motion ---------- */
  stage.floatObj(card, .08, .7, 2);
  stage.on((t, dt) => {
    leds.forEach((l, i) => {
      const v = still ? .8 : l.kind === 'disk' ? (Math.sin(t * l.s + l.p) + Math.sin(t * l.s * 1.7 + l.p * 2) > .6 ? 1 : .06) : l.kind === 'status' ? .75 + .25 * Math.sin(t * l.s + l.p) : (Math.sin(t * l.s + l.p) > 0 ? 1 : .08);
      lc.setRGB(OFF.r * .45 + (ON.r * 1.35 - OFF.r * .45) * v, OFF.g * .45 + (ON.g * 1.35 - OFF.g * .45) * v, OFF.b * .45 + (ON.b * 1.35 - OFF.b * .45) * v); ledMesh.setColorAt(i, lc);
    });
    ledMesh.instanceColor.needsUpdate = true;
    if (!still) for (const f of fans) f.blades.rotation.z -= dt * f.sp;
    card.rotation.y = -.12 + Math.sin(t * .4) * .05; cardShadow.material.opacity = .1 - (card.position.y - CY) * .15;
    live.scale.setScalar(still ? 1 : 1 + Math.max(0, Math.sin(t * 3.2)) * .35); live.scale.z = .5;
  });
  stage.o.rot = [.15, 0]; G.rotation.set(.15, 0, 0);
}
