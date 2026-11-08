/* RCV Technologies — 3D scene engine (Three.js). Physically based glass, metal and ceramic under studio lighting,
   soft shadows, pointer parallax. One scene per page topic: frames, browser, phone, card, rack, lens, bars, chain,
   plate, pages, pin, blob. Markup: <div class="scene" data-scene="lens" data-photo="/x.jpg" data-title="…"></div> */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
const ROOT = new URL('../', import.meta.url).href;   // site root, also when the site lives in a sub-folder (GitHub Pages)
THREE.DefaultLoadingManager.setURLModifier(u => (typeof u === 'string' && u[0] === '/' && u[1] !== '/') ? ROOT + u.slice(1) : u);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 767.98px)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const STAGES = []; window.RCV_STAGES = STAGES;
let lastScroll = -1e9; addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
/* Real studio HDR (Poly Haven, CC0) for true reflections; RoomEnvironment is the instant fallback.
   PMREM maps are GPU render targets that belong to ONE WebGL context, so every stage (each has its own canvas/context)
   builds its own maps from the shared equirect data; sharing one map made every canvas but the first reflect black. */
let hdrData = null, hdrLoading = false; const hdrWaiters = [];
function loadHDR(cb) {
  if (hdrData) return void setTimeout(() => cb(hdrData), 0);   // always async: the caller may still be constructing
  hdrWaiters.push(cb); if (hdrLoading) return; hdrLoading = true;
  new RGBELoader().load('/assets/hdr/studio_small_09_512.hdr', t => { hdrData = t; hdrWaiters.splice(0).forEach(f => f(t)); }, undefined, () => { hdrLoading = false; });
}
const C = { ember: 0xc8102e, clay: 0x7a0f22, peach: 0xf26b5b, sand: 0xddd6cf, porcelain: 0xf7f4ef, espresso: 0x1e1b1a, cocoa: 0x4a4543, cream: 0xece7e1 };
const loader = new THREE.TextureLoader();

function tex(url) {
  const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.url = url; return t;
}
const M = {
  glass: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: .9, roughness: .06, ior: 1.5, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.5, attenuationColor: new THREE.Color(0xf3f1ed), attenuationDistance: 2.2, ...o }),
  frosted: (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: .92, thickness: 1.2, roughness: .42, ior: 1.45, clearcoat: .6, envMapIntensity: 1.1, attenuationColor: new THREE.Color(0xf6f4f0), attenuationDistance: 3, ...o }),
  metal: (c = 0xe2dcd5, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: .24, envMapIntensity: 1.4, ...o }),
  ceramic: (c = 0xfbf9f6, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .32, clearcoat: .7, clearcoatRoughness: .18, envMapIntensity: 1, ...o }),
  ember: (o = {}) => new THREE.MeshPhysicalMaterial({ color: C.ember, roughness: .26, clearcoat: .9, clearcoatRoughness: .1, envMapIntensity: 1.1, ...o }),
  photo: (t) => new THREE.MeshBasicMaterial({ map: t, toneMapped: false }),
  paper: () => new THREE.MeshStandardMaterial({ color: 0xfdfcfa, roughness: .95 }),
};
const rbox = (w, h, d, r = .12, seg = 5) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2));

function canvasTexture(draw, w = 1024, h = 512) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function textTexture(title, sub, dark = true) {
  return canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.fillStyle = dark ? '#1e1b1a' : '#fff';
    g.font = `600 ${title.length > 14 ? 96 : 150}px 'Playfair Display', Georgia, serif`; g.fillText(title, w / 2, h / 2 + (sub ? 10 : 50), w - 80);
    if (sub) { g.font = '700 42px Manrope, sans-serif'; g.fillStyle = '#c8102e'; g.letterSpacing = '6px'; g.fillText(sub.toUpperCase(), w / 2, h / 2 + 120, w - 80); }
  });
}
function photoFrame(url, w = 3.6, h = 2.4, { border = .1, depth = .14, glass = true } = {}) {
  const g = new THREE.Group();
  const back = new THREE.Mesh(rbox(w + border * 2, h + border * 2, depth, .08), M.ceramic()); back.castShadow = true; back.receiveShadow = true; g.add(back);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.photo(tex(url))); pic.position.z = depth / 2 + .003; g.add(pic);
  if (glass) { const cover = new THREE.Mesh(rbox(w + border * 2, h + border * 2, .04, .08), M.glass({ thickness: .25, roughness: .03 })); cover.position.z = depth / 2 + .04; g.add(cover); }
  return g;
}

/* ---------- Stage ---------- */
class Stage {
  constructor(el, o) {
    this.el = el; this.o = o; this.anims = []; this.t = 0; this.visible = true; this.raf = 0;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, o.dpr || (small ? 1.25 : 1.5))); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = o.shadows !== false; r.shadowMap.type = THREE.PCFSoftShadowMap; r.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(r.domElement);
    const s = this.scene = new THREE.Scene();
    { const pm = new THREE.PMREMGenerator(r); s.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose(); }   // this context's own map
    STAGES.push(this);
    loadHDR(t => { const pm = new THREE.PMREMGenerator(r); const env = pm.fromEquirectangular(t).texture; pm.dispose(); s.environment = env; s.environmentIntensity = 1; this.render(); });
    r.toneMappingExposure = o.exposure || .98;
    this.camera = new THREE.PerspectiveCamera(o.fov || 30, 1, .1, 100); this.camera.position.set(0, o.camY || 0, o.camZ || 10);
    const key = new THREE.DirectionalLight(0xfffaf7, 2.4); key.position.set(4, 7, 6); key.castShadow = o.shadows !== false; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = key.shadow.camera.bottom = -12; key.shadow.camera.right = key.shadow.camera.top = 12; key.shadow.camera.near = .5; key.shadow.camera.far = 40; key.shadow.radius = 7; key.shadow.bias = -.0004; s.add(key);
    const fill = new THREE.DirectionalLight(0xf7f4f0, .7); fill.position.set(-6, 2, 4); s.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, .9); rim.position.set(-2, 4, -6); s.add(rim);
    s.add(new THREE.HemisphereLight(0xfff8f2, 0xddd6cf, .55));
    if (o.backdrop !== false) {
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ map: canvasTexture((g, w, h) => { const gr = g.createRadialGradient(w * .62, h * .3, 40, w * .5, h * .5, w * .75); gr.addColorStop(0, o.bg2 || '#fbe4e3'); gr.addColorStop(1, o.bg || '#f7f4ef'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 512, 512), toneMapped: false }));
      bg.position.z = -14; s.add(bg);
    }
    if (o.shadows !== false) { const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 16), new THREE.ShadowMaterial({ opacity: o.shadow ?? .16, color: 0x1e1b1a })); floor.rotation.x = -Math.PI / 2; floor.position.y = o.floorY ?? -2.6; floor.receiveShadow = true; s.add(floor); }
    this.group = new THREE.Group(); s.add(this.group);
    this.tx = 0; this.ty = 0; this.cx = 0; this.cy = 0;
    if (fine) { const src = o.pointerEl || el; src.addEventListener('pointermove', e => { const b = src.getBoundingClientRect(); this.tx = (e.clientX - b.left) / b.width - .5; this.ty = (e.clientY - b.top) / b.height - .5; }); src.addEventListener('pointerleave', () => { this.tx = 0; this.ty = 0; }); }
    new ResizeObserver(() => this.resize()).observe(el); this.resize();
    new IntersectionObserver(es => es.forEach(en => { this.visible = en.isIntersecting; if (this.visible) this.start(); }), { rootMargin: '80px' }).observe(el);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.visible) this.start(); });
    this.clock = new THREE.Clock();
  }
  resize() { const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); if (this.fitted) this.fitCamera(); this.render(); }
  /* Frame the whole group with a margin so nothing is ever cut at the container edges */
  fitCamera(margin = 1.18) {
    this.fitted = true; const box = new THREE.Box3().setFromObject(this.group); if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const fov = THREE.MathUtils.degToRad(this.camera.fov); const dh = (size.y * margin / 2) / Math.tan(fov / 2); const dw = (size.x * margin / 2) / Math.tan(fov / 2) / this.camera.aspect;
    const dist = Math.max(dh, dw) + size.z / 2 + .5;
    this.camera.position.set(c.x + (this.o.camX || 0), c.y + (this.o.camY || 0), c.z + Math.max(dist, this.o.minZ || 0)); this.camera.lookAt(c.x, c.y, c.z); this.center = c;
  }
  entrance() { const t0 = performance.now(); const g = this.group; g.scale.setScalar(.78); this.on(() => { const e = Math.min(1, (performance.now() - t0) / 1500); const k = 1 - Math.pow(1 - e, 3); g.scale.setScalar(.78 + .22 * k); g.position.y = (1 - k) * -.5; }); }
  /* Glossy studio floor: a faint mirrored copy of the group below the floor line (product-shot look) */
  reflectGroup(opacity = .16) {
    const floorY = this.o.floorY ?? -2.6; const mirror = new THREE.Group(); const src = [];
    this.group.traverse(m => { if (m.isMesh && !m.userData.noReflect && !(m.geometry.type === 'PlaneGeometry' && Math.abs(m.rotation.x + Math.PI / 2) < .01)) src.push(m); });
    const clone = m => { const c = m.clone(); const mats = Array.isArray(m.material) ? m.material : [m.material]; const cm = mats.map(mt => { const k = mt.clone(); k.transparent = true; k.opacity = opacity; k.depthWrite = false; if ('transmission' in k) { k.transmission = 0; k.opacity = opacity * .7; } k.envMapIntensity = (k.envMapIntensity || 1) * .6; return k; }); c.material = Array.isArray(m.material) ? cm : cm[0]; c.castShadow = false; return c; };
    for (const m of src) { const c = clone(m); c.userData.src = m; mirror.add(c); }
    mirror.renderOrder = -1; this.scene.add(mirror);
    const v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), flip = new THREE.Matrix4().makeScale(1, -1, 1), mm = new THREE.Matrix4();
    this.on(() => { for (const c of mirror.children) { c.userData.src.updateWorldMatrix(true, false); mm.copy(c.userData.src.matrixWorld); mm.premultiply(new THREE.Matrix4().makeTranslation(0, -floorY, 0)).premultiply(flip).premultiply(new THREE.Matrix4().makeTranslation(0, floorY, 0)); mm.decompose(v, q, s); c.position.copy(v); c.quaternion.copy(q); c.scale.copy(s); } });
    this.mirror = mirror;
  }
  /* soft contact shadow (radial alpha plane on the floor) - no shadow-map artifacts, cheap */
  shadowBlob(x = 0, z = 0, w = 4, h = 1.6, opacity = .22, y) {
    if (!Stage.blobTex) Stage.blobTex = canvasTexture((g, W, H) => { const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); r.addColorStop(0, 'rgba(30,27,26,1)'); r.addColorStop(.45, 'rgba(30,27,26,.55)'); r.addColorStop(1, 'rgba(30,27,26,0)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }, 256, 256);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: Stage.blobTex, transparent: true, opacity, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y ?? (this.o.floorY ?? -2.6) + .01, z); this.group.add(m); return m;
  }
  on(fn) { this.anims.push(fn); }
  render() { if (this.camera) this.renderer.render(this.scene, this.camera); }
  start() {
    cancelAnimationFrame(this.raf);
    const minGap = this.o.fps ? 1000 / +this.o.fps - 2 : 0; let last = 0;
    const loop = (now = performance.now()) => {
      if (!this.visible || document.hidden) return;
      if ((minGap && now - last < minGap) || (this.o.scrollPause && now - lastScroll < 200)) { this.raf = requestAnimationFrame(loop); return; }
      last = now;
      const dt = Math.min(this.clock.getDelta(), .05); this.t += dt;
      this.cx += (this.tx - this.cx) * .06; this.cy += (this.ty - this.cy) * .06;
      const g = this.group, base = this.o.rot || [0, 0];
      g.rotation.y = base[1] + this.cx * (this.o.px ?? .35) + Math.sin(this.t * .25) * (this.o.sway ?? .05);
      g.rotation.x = base[0] + this.cy * (this.o.py ?? .18);
      for (const a of this.anims) a(this.t, dt);
      this.render();
      if (reduced) return;
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  floatObj(obj, amp = .12, speed = .8, phase = 0, spin = 0) { const y0 = obj.position.y; this.on(t => { obj.position.y = y0 + Math.sin(t * speed + phase) * amp; if (spin) obj.rotation.y += spin; }); }
}

/* ---------- Scenes ---------- */
const S = {};

S.frames = (st, o) => {
  const photos = (o.photos || o.photo || '').split('|').filter(Boolean).slice(0, o.side ? 3 : 6);
  const slots = o.side ? [[2.6, 1.9, -1.8, 2.5, 1.7], [5.6, 1.2, -.6, 2.1, 1.4], [3.9, -.4, .7, 1.8, 1.2]]
    : [[-2.6, .6, -1.2, 2.4, 1.6], [-.2, -.9, .6, 2.8, 1.9], [2.4, .9, -.6, 2.2, 1.5], [1.1, -1.9, -2.2, 1.9, 1.3], [-2.9, -1.6, -2.6, 1.6, 1.1], [3.4, -.6, -3, 1.5, 1]];
  photos.forEach((p, i) => { const [x, y, z, w, h] = slots[i % slots.length]; const f = photoFrame(p, w, h, { border: .09, depth: .14 }); f.position.set(x, y, z); f.rotation.set((Math.random() - .5) * .2, (Math.random() - .5) * .4 - (o.side ? .25 : 0), (Math.random() - .5) * .1); st.group.add(f); st.floatObj(f, .14, .5 + i * .07, i * 1.3); if (!o.side) st.shadowBlob(x, z, w * 1.3, 1.2, .16); });
  const sph = o.side ? [[M.ceramic(C.ember), .26, 6.2, 2.9, .4]] : [[M.glass(), .22, -3.6, 2, 1.2], [M.ceramic(C.ember), .3, -.3, .6, .2], [M.glass(), .38, 3, -.8, -.8]];
  sph.forEach(([m, r, x, y, z], i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), m); s.position.set(x, y, z); s.castShadow = true; st.group.add(s); st.floatObj(s, .2, .7, i); });
};

/* Realistic device set: aluminium laptop, phone and tablet with real screens */
function laptop(photo) {
  const g = new THREE.Group(); const alu = M.metal(0xd6d2cc, { roughness: .32 }); const dark = M.ceramic(0x24201f, { roughness: .5, clearcoat: .2 });
  const base = new THREE.Mesh(rbox(4.6, .16, 3.1, .08), alu); base.castShadow = true; g.add(base);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.8), M.ceramic(0xcfcac3, { roughness: .6 })); deck.rotation.x = -Math.PI / 2; deck.position.set(0, .082, 0); g.add(deck);
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.35), new THREE.MeshBasicMaterial({ map: canvasTexture((c, w, h) => { c.fillStyle = '#c9c4bd'; c.fillRect(0, 0, w, h); c.fillStyle = '#332f2d'; for (let r = 0; r < 5; r++) for (let k = 0; k < 15; k++) { const kw = r === 4 && k > 3 && k < 11 ? 0 : 52; if (kw) c.fillRect(20 + k * 66, 20 + r * 60, kw, 48); } c.fillRect(20 + 4 * 66, 20 + 4 * 60, 7 * 66 - 14, 48); }, 1024, 320), toneMapped: false })); keys.rotation.x = -Math.PI / 2; keys.position.set(0, .085, -.45); g.add(keys);
  const pad = new THREE.Mesh(rbox(1.3, .01, .85, .04), M.ceramic(0xbdb7b0, { roughness: .45 })); pad.position.set(0, .085, .95); g.add(pad);
  const lid = new THREE.Group(); lid.position.set(0, .08, -1.5); lid.rotation.x = -THREE.MathUtils.degToRad(13); g.add(lid);
  const shell = new THREE.Mesh(rbox(4.6, 3, .12, .08), alu); shell.position.set(0, 1.5, 0); shell.castShadow = true; lid.add(shell);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(4.45, 2.85), dark); bezel.position.set(0, 1.5, .062); lid.add(bezel);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.7), M.photo(tex(photo))); scr.position.set(0, 1.5, .066); lid.add(scr);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.7), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .06, roughness: .12, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .5 })); sheen.position.set(0, 1.5, .068); lid.add(sheen);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 4.2, 24), M.metal(0x8d8781)); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, .1, -1.5); g.add(hinge);
  return g;
}
function phoneObj(photo, dark = true) {
  const p = new THREE.Group(); const body = new THREE.Mesh(rbox(1.5, 3.1, .2, .26), dark ? M.metal(0x2a2624, { roughness: .35 }) : M.ceramic()); body.castShadow = true; p.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.94), M.photo(tex(photo))); scr.position.z = .103; p.add(scr);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.94), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .06, roughness: .12, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .5 })); sheen.position.z = .105; p.add(sheen);
  const cam = new THREE.Mesh(new THREE.SphereGeometry(.04, 16, 16), M.metal(0x111)); cam.position.set(0, 1.38, .12); p.add(cam);
  return p;
}
S.devices = (st, o) => {
  const lap = laptop(o.photo); lap.position.set(-.3, -1.1, 0); lap.rotation.y = -.5; st.group.add(lap); st.shadowBlob(-.3, .2, 6.6, 3.8, .3, -1.21);
  const ph = phoneObj(o.photo2 || o.photo, true); ph.position.set(2.9, -.1, 1.4); ph.rotation.set(.04, -.45, .03); st.group.add(ph); st.shadowBlob(2.9, 1.4, 2.2, 1.2, .2, -1.21);
  if (o.photo3) { const tab = new THREE.Group(); const body = new THREE.Mesh(rbox(2.3, 3.1, .16, .18), M.metal(0xd6d2cc, { roughness: .3 })); body.castShadow = true; tab.add(body); const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.9), M.photo(tex(o.photo3))); scr.position.z = .083; tab.add(scr); const cov = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.9), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .06, roughness: .12, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .5 })); cov.position.z = .085; tab.add(cov); tab.position.set(-3.6, .3, 1); tab.rotation.set(.03, .55, -.03); st.group.add(tab); st.shadowBlob(-3.6, 1, 3, 1.4, .2, -1.21); st.floatObj(tab, .07, .55, 2); }
  st.floatObj(ph, .09, .7, 1); st.on(t => { lap.rotation.y = -.5 + Math.sin(t * .3) * .08; }); st.o.sway = .04; st.o.rot = [.14, 0]; st.o.py = .08;
  scrollScreens(st);
};
/* Screens show tall page captures that slowly scroll, like someone browsing the site */
function scrollScreens(st) {
  const screens = []; st.group.traverse(m => { if (m.isMesh && m.material && m.material.map && m.geometry.type === 'PlaneGeometry' && ((m.material.map.userData && m.material.map.userData.url) || m.material.map.image?.src || '').includes('/screens/')) screens.push(m); });
  // until the tall capture is measured, show only its top part at the right scale (no squashing)
  screens.forEach(m => { const t = m.material.map; const g = m.geometry.parameters; const aspect = g.width / g.height; const guess = { laptop: [2880, 6800], tablet: [1668, 6000], phone: [780, 5200] }; const key = Object.keys(guess).find(k => (t.userData.url || '').includes(k)); if (key) { const [w, h] = guess[key]; const frac = Math.min(1, (w / aspect) / h); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1, frac); t.offset.y = 1 - frac; m.userData.frac = frac; } });
  screens.forEach((m, i) => {
    const t = m.material.map; const g = m.geometry.parameters; const aspect = g.width / g.height;
    const setup = () => { const img = t.image; if (!img || !img.width) return false; const frac = Math.min(1, (img.width / aspect) / img.height); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1, frac); t.offset.y = 1 - frac; t.needsUpdate = true; m.userData.frac = frac; return true; };
    if (!setup()) { const iv = setInterval(() => { if (setup()) clearInterval(iv); }, 200); }
    st.on(tt => { const f = m.userData.frac; if (f === undefined || f >= 1) return; const p = (Math.sin(tt * .22 + i * 1.9) * .5 + .5); const e = p * p * (3 - 2 * p); t.offset.y = (1 - f) * (1 - e); });
  });
}
/* Footer: glossy floating orbs (crimson, charcoal, porcelain) */
/* Extruded glossy "RCV" letters (real font geometry) on a glass plinth */
S.letters = (st, o) => new Promise(resolve => {
  new FontLoader().load('/assets/fonts/helvetiker_bold.typeface.json', font => {
    const txt = o.title || 'RCV';
    const geo = new TextGeometry(txt, { font, size: 1.9, depth: .55, curveSegments: 14, bevelEnabled: true, bevelThickness: .05, bevelSize: .04, bevelSegments: 5 });
    geo.center();
    const mat = [M.ceramic(C.ember, { roughness: .16, clearcoat: 1, clearcoatRoughness: .05 }), M.metal(0x2a2624, { roughness: .3 })];
    const mesh = new THREE.Mesh(geo, mat); mesh.position.y = .35; mesh.castShadow = true; st.group.add(mesh);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, .22, 96), M.frosted({ roughness: .45 })); plinth.position.y = -1.3; st.group.add(plinth);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, .035, 16, 160), M.metal(0xe7e1da)); ring.rotation.x = Math.PI / 2; ring.position.y = -1.19; st.group.add(ring);
    st.shadowBlob(0, 0, 5.4, 2.4, .22, -1.18);
    const sub = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .5), new THREE.MeshBasicMaterial({ map: canvasTexture((g, w, h) => { g.textAlign = 'center'; g.fillStyle = '#1e1b1a'; g.font = '700 54px Manrope, sans-serif'; g.letterSpacing = '10px'; g.fillText((o.sub || 'RESPONSIVE CODING VOLUTION').toUpperCase(), w / 2, h / 2 + 18); }, 1024, 120), transparent: true, toneMapped: false })); sub.rotation.x = -Math.PI / 2; sub.position.set(0, -1.18, 2.1); st.group.add(sub);
    [[M.glass(), .34, -3.4, 1.4, -.6], [M.ceramic(0x1e1b1a, { roughness: .25, clearcoat: 1 }), .26, 3.5, 1.9, -.2], [M.ceramic(0xfdfcfa, { roughness: .3, clearcoat: .8 }), .2, 3.2, -.6, 1.2]].forEach(([m, r, x, y, z], i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), m); s.position.set(x, y, z); st.group.add(s); st.floatObj(s, .2, .7, i * 1.7); });
    st.on(t => { mesh.rotation.y = Math.sin(t * .4) * .32; mesh.position.y = .35 + Math.sin(t * .9) * .08; });
    st.o.rot = [.12, 0]; resolve();
  }, undefined, () => resolve());
});

S.orbs = (st, o) => {
  [[M.ceramic(C.ember, { roughness: .18, clearcoat: 1 }), .95, 0, .2, 0], [M.ceramic(0x1e1b1a, { roughness: .25, clearcoat: 1 }), .48, 1.7, -.7, .6], [M.glass({ thickness: 1.2 }), .62, -1.9, .9, -.4], [M.ceramic(0xfdfcfa, { roughness: .3, clearcoat: .8 }), .34, -1.3, -1.1, .9], [M.metal(0xe7e1da), .26, 2.2, 1.1, -.8]].forEach(([m, r, x, y, z], i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 72, 72), m); s.position.set(x, y, z); s.castShadow = true; st.group.add(s); st.floatObj(s, .16 + i * .03, .5 + i * .12, i * 1.4); st.shadowBlob(x, z, r * 3.2, r * 1.4, .2, -1.9);
  });
  st.o.sway = .12;
};

/* Site-wide ambient background: small glass, ceramic and ember shapes drifting at different depths (no shadows, low cost) */
S.ambient = (st, o) => {
  const shapes = []; const N = small ? 8 : 16;
  for (let i = 0; i < N; i++) {
    const kind = i % 4; let mesh;
    if (kind === 0) mesh = new THREE.Mesh(new THREE.SphereGeometry(.22 + Math.random() * .2, 32, 32), M.ceramic(0xffffff, { roughness: .08, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .55, envMapIntensity: 1.4 }));
    else if (kind === 1) mesh = new THREE.Mesh(rbox(.5, .5, .5, .14, 3), M.ceramic(0xf3eee9, { roughness: .45, transparent: true, opacity: .7 }));
    else if (kind === 2) mesh = new THREE.Mesh(new THREE.TorusGeometry(.26, .09, 20, 48), i % 8 === 2 ? M.ember() : M.metal(0xe7e1da));
    else mesh = new THREE.Mesh(new THREE.SphereGeometry(.16 + Math.random() * .1, 32, 32), M.ceramic(i % 8 === 7 ? C.ember : C.peach));
    mesh.position.set((Math.random() - .5) * 26, (Math.random() - .5) * 16, -8 + Math.random() * 8); mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    mesh.userData = { vy: .08 + Math.random() * .12, rx: (Math.random() - .5) * .3, ry: (Math.random() - .5) * .3, x0: mesh.position.x, ph: Math.random() * 6 };
    st.group.add(mesh); shapes.push(mesh);
  }
  let sy = 0; addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
  st.on((t, dt) => shapes.forEach(m => { const u = m.userData; m.position.y += u.vy * dt; if (m.position.y > 9) m.position.y = -9; m.position.x = u.x0 + Math.sin(t * .2 + u.ph) * .6; m.rotation.x += u.rx * dt; m.rotation.y += u.ry * dt; }));
  st.on(() => { st.group.position.y = (sy * .0012) % 18; });
};

S.browser = (st, o) => {
  const g = new THREE.Group(); st.group.add(g);
  const frame = new THREE.Mesh(rbox(5, 3.4, .3, .16), M.ceramic()); g.add(frame);
  const bar = new THREE.Mesh(rbox(4.7, .36, .03, .04), M.ceramic(0xece7e1)); bar.position.set(0, 1.38, .165); g.add(bar);
  [C.ember, C.sand, C.sand].forEach((c, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(.065, 24, 24), M.ceramic(c)); d.position.set(-2.1 + i * .22, 1.38, .2); g.add(d); });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 2.7), M.photo(tex(o.photo))); pic.position.set(0, -.18, .16); g.add(pic);
  const cover = new THREE.Mesh(rbox(4.7, 2.7, .04, .06), M.glass({ thickness: .2, roughness: .02 })); cover.position.set(0, -.18, .2); g.add(cover);
  g.position.y = .25; g.rotation.y = -.14; st.floatObj(g, .08, .5); st.shadowBlob(.2, .3, 6, 2, .26);
  const chips = [['</>', -2.5, 1.9, 1.2], ['SEO', 2.3, -1.7, 1.5], ['UX', 2.6, 1.9, .5]];
  chips.forEach(([txt, x, y, z], i) => { const c = new THREE.Group(); const b = new THREE.Mesh(rbox(1.2, .68, .22, .18), M.frosted()); c.add(b); const l = new THREE.Mesh(new THREE.PlaneGeometry(1, .55), new THREE.MeshBasicMaterial({ map: textTexture(txt, '', true), transparent: true, toneMapped: false })); l.position.z = .12; c.add(l); c.position.set(x, y, z); st.group.add(c); st.floatObj(c, .16, .7, i * 2); });
};

S.phone = (st, o) => {
  const mk = (url, dark) => { const p = new THREE.Group(); const body = new THREE.Mesh(rbox(2, 4.1, .26, .34), dark ? M.metal(0x322e2c, { roughness: .35 }) : M.ceramic()); body.castShadow = true; p.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 3.9), M.photo(tex(url))); scr.position.z = .133; p.add(scr);
    const cover = new THREE.Mesh(rbox(1.96, 4.04, .03, .3), M.glass({ thickness: .15, roughness: .02 })); cover.position.z = .15; p.add(cover);
    const cam = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 16), M.metal(0x222)); cam.position.set(0, 1.85, .16); p.add(cam); return p; };
  const a = mk(o.photo, true); st.group.add(a); a.rotation.y = -.35; st.floatObj(a, .1, .6); st.shadowBlob(o.two ? .8 : 0, 0, 2.6, 1.4, .24);
  if (o.two) { const b = mk(o.photo2 || o.photo, false); b.position.set(-1.9, -.4, -1.4); b.rotation.y = .45; st.group.add(b); st.floatObj(b, .12, .5, 2); a.position.x = .8; st.shadowBlob(-1.9, -1.4, 2.4, 1.3, .18); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, .05, 16, 128), M.metal(0xe7e1da)); ring.rotation.x = Math.PI / 2.2; ring.position.y = -1.9; st.group.add(ring); st.on(t => { ring.rotation.z = t * .15; });
};

S.card = (st, o) => {
  const g = new THREE.Group(); st.group.add(g);
  const card = new THREE.Mesh(rbox(3.8, 2.4, .1, .16), M.ember()); card.castShadow = true; g.add(card);
  const chip = new THREE.Mesh(rbox(.62, .46, .05, .08), M.metal(0xe8e2dc)); chip.position.set(-1.25, .35, .07); g.add(chip);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.2), new THREE.MeshBasicMaterial({ map: canvasTexture((c, w, h) => { c.fillStyle = '#fff'; c.font = '700 70px Manrope, sans-serif'; c.fillText('RCV COMMERCE', 40, 250); c.font = '500 54px Manrope, sans-serif'; c.fillText('••••  ••••  ••••  2026', 40, 340); }, 1024, 360), transparent: true, toneMapped: false })); label.position.set(0, -.55, .06); g.add(label);
  g.rotation.set(.15, -.3, 0); st.floatObj(g, .1, .6); st.shadowBlob(0, 0, 4.6, 1.8, .24); st.on(t => { g.rotation.y = -.3 + Math.sin(t * .35) * .35; });
  for (let i = 0; i < 3; i++) { const coin = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .09, 64), i === 1 ? M.metal(0xe8e2dc) : M.glass({ thickness: .4 })); coin.position.set(2.6 - i * .5, 1.5 - i * 1.1, 1.2 - i * .6); coin.rotation.set(1.2, .4, .3); coin.castShadow = true; st.group.add(coin); st.floatObj(coin, .14, .8, i * 1.5, .006); }
  if (o.photo) { const f = photoFrame(o.photo, 3.2, 2.1); f.position.set(-2.4, 1.3, -2.4); f.rotation.y = .35; st.group.add(f); st.floatObj(f, .1, .45, 1); }
};

S.rack = (st, o) => {
  const g = new THREE.Group(); st.group.add(g); const leds = [];
  for (let i = 0; i < 5; i++) { const slab = new THREE.Mesh(rbox(4.4, .52, 2.4, .12), M.ceramic(i % 2 ? 0xfbf9f6 : 0xece7e1)); slab.position.y = -1.3 + i * .64; slab.castShadow = true; slab.receiveShadow = true; g.add(slab);
    for (let k = 0; k < 4; k++) { const led = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 12), new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 1.5, roughness: .4 })); led.position.set(-1.9 + k * .22, slab.position.y, 1.22); g.add(led); leds.push([led, Math.random() * 6]); }
    const slot = new THREE.Mesh(rbox(2.2, .12, .04, .03), M.metal(0xd3cdc6)); slot.position.set(.6, slab.position.y, 1.21); g.add(slot); }
  g.rotation.set(.22, .55, 0); st.floatObj(g, .06, .5); st.shadowBlob(0, 0, 5.6, 3.2, .26);
  st.on(t => leds.forEach(([l, p]) => { l.material.emissiveIntensity = .4 + Math.max(0, Math.sin(t * 2.2 + p)) * 2; }));
  const panel = new THREE.Mesh(rbox(1.6, 1.1, .16, .14), M.frosted()); panel.position.set(3.2, 1.5, .6); st.group.add(panel); st.floatObj(panel, .15, .7, 2);
  if (o.photo) { const f = photoFrame(o.photo, 2.8, 1.9); f.position.set(-3.1, 1.7, -2); f.rotation.y = .4; st.group.add(f); st.floatObj(f, .1, .5, 1); }
};

S.lens = (st, o) => {
  const f = photoFrame(o.photo, 5, 3.3, { glass: false }); f.position.set(.3, .1, -1.2); st.group.add(f); st.floatObj(f, .05, .4); st.shadowBlob(.3, -1.2, 5.6, 2, .24);
  const lens = new THREE.Group(); st.group.add(lens);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.25, 96, 96), M.glass({ ior: 1.62, thickness: 1.4, roughness: .02 })); glass.scale.set(1, 1, .42); glass.castShadow = true; lens.add(glass);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.28, .1, 32, 128), M.metal(0xe7e1da)); lens.add(ring);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(.13, 1.7, 8, 24), M.metal(0xddd6cf)); handle.position.set(1.65, -1.6, 0); handle.rotation.z = Math.PI / 4; handle.castShadow = true; lens.add(handle);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .9, 8, 24), M.ember()); grip.position.set(2.15, -2.1, 0); grip.rotation.z = Math.PI / 4; lens.add(grip);
  lens.position.z = 1.1;
  st.on(t => { lens.position.x = -.6 + Math.sin(t * .45) * 1.4; lens.position.y = .2 + Math.cos(t * .33) * .7; lens.rotation.z = Math.sin(t * .3) * .08; });
};

S.bars = (st, o) => {
  const hs = [1.1, 1.7, 1.4, 2.3, 2, 2.8, 3.3]; const bars = [];
  hs.forEach((h, i) => { const b = new THREE.Mesh(rbox(.56, h, .56, .1), i === hs.length - 1 ? M.ember({ roughness: .2 }) : M.glass({ thickness: .6 })); b.position.set(-2.5 + i * .82, -2.3 + h / 2, 0); b.castShadow = true; b.scale.y = .01; st.group.add(b); bars.push([b, h, i]);
    const cap = new THREE.Mesh(rbox(.56, .08, .56, .03), M.ember()); cap.userData.h = h; cap.position.set(b.position.x, -2.3 + .04, 0); st.group.add(cap); b.userData.cap = cap; });
  const start = performance.now();
  st.on(t => { const e = Math.min(1, (performance.now() - start) / 1600); const k = 1 - Math.pow(1 - e, 3); bars.forEach(([b, h, i]) => { const s = Math.max(.01, Math.min(1, (k * 1.3 - i * .06))) * (1 + Math.sin(t * .9 + i) * .04); b.scale.y = s; b.position.y = -2.3 + h * s / 2; b.userData.cap.position.y = -2.3 + h * s + .04; }); });
  const line = new THREE.Mesh(new THREE.TorusGeometry(.12, .035, 12, 48), M.metal()); line.visible = false;
  if (o.photo) { const f = photoFrame(o.photo, 4.6, 3); f.position.set(.4, 1.5, -2.6); st.group.add(f); st.floatObj(f, .06, .4); }
  st.group.rotation.set(.12, -.45, 0); st.shadowBlob(0, 0, 7, 2.2, .22);
};

S.chain = (st, o) => {
  const mats = [M.metal(0xe6e0d9), M.ember(), M.metal(0xe6e0d9)];
  mats.forEach((m, i) => { const l = new THREE.Mesh(new THREE.TorusGeometry(.72, .19, 32, 100), m); l.position.x = -1.25 + i * 1.25; l.rotation.y = i % 2 ? Math.PI / 2 : 0; l.castShadow = true; st.group.add(l); });
  st.group.rotation.set(.25, -.4, .1); st.o.sway = .18; st.shadowBlob(0, 0, 5.4, 1.8, .22);
  if (o.photo) { const f = photoFrame(o.photo, 4, 2.7); f.position.set(0, 1.9, -3); st.group.add(f); st.floatObj(f, .06, .4); }
  const s = new THREE.Mesh(new THREE.SphereGeometry(.3, 48, 48), M.glass()); s.position.set(2.8, -1.6, .8); st.group.add(s); st.floatObj(s, .2, .8, 1);
};

S.plate = (st, o) => {
  const g = new THREE.Group(); st.group.add(g);
  const plate = new THREE.Mesh(rbox(5.2, 3, .22, .22), M.frosted({ roughness: .5 })); plate.castShadow = true; g.add(plate);
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.4), new THREE.MeshBasicMaterial({ map: textTexture(o.title || 'RCV', o.sub || 'Responsive Coding Volution'), transparent: true, toneMapped: false })); txt.position.z = .13; g.add(txt);
  g.rotation.y = -.15; st.floatObj(g, .08, .5); st.shadowBlob(0, 0, 5.8, 2, .24);
  if (o.photo) { const f = photoFrame(o.photo, 3, 2); f.position.set(1.7, 1.75, -2.4); f.rotation.y = -.3; st.group.add(f); st.floatObj(f, .1, .45, 1); }
  [[M.ember(), .42, -3.3, -1.6, 1], [M.ceramic(C.peach), .28, 3.4, -1.4, .6], [M.glass(), .36, -2.9, 1.9, -.5]].forEach(([m, r, x, y, z], i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), m); s.position.set(x, y, z); s.castShadow = true; st.group.add(s); st.floatObj(s, .2, .7, i * 1.7); });
};

S.steps = (st, o) => {
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(rbox(1.5, .4 + i * .55, 1.5, .1), i === 3 ? M.ember() : M.ceramic(i % 2 ? 0xece7e1 : 0xfbf9f6)); s.position.set(-2.4 + i * 1.55, -2.3 + (.4 + i * .55) / 2, 0); s.castShadow = true; s.receiveShadow = true; st.group.add(s); }
  const flag = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.4, 12), M.metal(0xddd6cf)); flag.position.set(2.25, -2.3 + 2.05 + .7, 0); st.group.add(flag);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.22, 48, 48), M.ceramic(C.ember, { roughness: .2, clearcoat: 1 })); st.group.add(ball);
  st.on(t => { const p = (t * .35) % 4; const i = Math.floor(p), f = p - i; const h = (k) => -2.3 + (.4 + Math.min(k, 3) * .55); ball.position.set(-2.4 + (i + f) * 1.55 - (i >= 3 ? f * 1.55 : 0), h(Math.min(i, 3)) + Math.sin(f * Math.PI) * .7 + .22, .3); });
  const pen = new THREE.Mesh(new THREE.PlaneGeometry(.7, .45), new THREE.MeshBasicMaterial({ color: C.ember, side: THREE.DoubleSide, toneMapped: false })); pen.position.set(2.6, -2.3 + 2.05 + 1.15, 0); st.group.add(pen); st.on(t => { pen.rotation.y = Math.sin(t * 2) * .3; });
  st.group.rotation.set(.2, -.55, 0); st.shadowBlob(0, 0, 7.4, 3, .22);
  if (o.photo) { const f = photoFrame(o.photo, 3.6, 2.4); f.position.set(-1.2, 1.9, -2.8); st.group.add(f); st.floatObj(f, .07, .4); }
};

S.pages = (st, o) => {
  const lines = canvasTexture((g, w, h) => { g.fillStyle = '#fdfcfa'; g.fillRect(0, 0, w, h); g.fillStyle = '#e3ddd6'; for (let y = 120; y < h - 60; y += 44) g.fillRect(90, y, (y % 3 ? .78 : .55) * (w - 180), 10); g.fillStyle = '#c8102e'; g.fillRect(90, 60, 180, 14); }, 768, 1024);
  const sheets = [];
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(rbox(3.4, 4.5, .03, .03), new THREE.MeshStandardMaterial({ map: lines, roughness: .9 })); s.position.set(i * .22 - .4, -.3 + i * .02, -i * .18); s.rotation.z = -.14 + i * .07; s.castShadow = true; st.group.add(s); sheets.push(s); }
  st.on(t => sheets.forEach((s, i) => { s.rotation.z = -.14 + i * .07 + Math.sin(t * .6 + i) * .02; }));
  if (o.photo) { const f = photoFrame(o.photo, 2.9, 1.9, { border: .06, depth: .06 }); f.position.set(.6, 1.1, .35); f.rotation.z = .12; st.group.add(f); st.floatObj(f, .05, .5); }
  const clip = new THREE.Mesh(new THREE.TorusGeometry(.32, .05, 16, 64), M.metal(0xe7e1da)); clip.position.set(-1.4, 2.1, .2); clip.rotation.x = .4; st.group.add(clip);
  st.group.rotation.set(.18, -.3, 0); st.shadowBlob(0, -.3, 4.6, 1.6, .22);
};

S.pin = (st, o) => {
  const pin = new THREE.Group(); st.group.add(pin);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.62, 64, 64), M.ember()); head.position.y = .9; head.castShadow = true; pin.add(head);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.42, 1.3, 64), M.ember()); tip.position.y = .05; tip.rotation.x = Math.PI; tip.castShadow = true; pin.add(tip);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.24, 32, 32), M.ceramic()); dot.position.set(0, .95, .45); pin.add(dot);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, .1, 96), M.frosted({ roughness: .55 })); disc.position.y = -1.4; disc.receiveShadow = true; st.group.add(disc);
  const rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, .025, 12, 96), new THREE.MeshBasicMaterial({ color: C.ember, transparent: true, toneMapped: false })); r.rotation.x = Math.PI / 2; r.position.y = -1.33; st.group.add(r); rings.push([r, i]); }
  st.on(t => { pin.position.y = -.5 + Math.abs(Math.sin(t * 1.6)) * .5; rings.forEach(([r, i]) => { const p = ((t * .5 + i / 3) % 1); r.scale.setScalar(.6 + p * 1.6); r.material.opacity = (1 - p) * .7; }); });
  if (o.photo) { const f = photoFrame(o.photo, 3.6, 2.4); f.position.set(2.5, 1.6, -2.6); f.rotation.y = -.35; st.group.add(f); st.floatObj(f, .08, .45, 1); }
  st.group.rotation.set(.15, -.3, 0); st.shadowBlob(0, 0, 4.4, 2.2, .2, -1.46);
};

/* Morphing liquid glass blob (vertex displacement with 3D simplex noise, normals rebuilt per vertex) */
const NOISE = `vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
uniform float uTime; uniform float uAmp; uniform float uFreq;
float disp(vec3 p){ return uAmp*snoise(p*uFreq+vec3(0.0,uTime*0.22,uTime*0.17)) + uAmp*0.35*snoise(p*uFreq*2.4-vec3(uTime*0.15)); }`;
function morphMaterial(base, u) {
  base.onBeforeCompile = sh => {
    sh.uniforms.uTime = u.time; sh.uniforms.uAmp = u.amp; sh.uniforms.uFreq = u.freq;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + NOISE)
      .replace('#include <beginnormal_vertex>', `vec3 nrm0 = normalize(position); vec3 dPos = position + nrm0 * disp(position);
        vec3 tg = normalize(cross(nrm0, abs(nrm0.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0))); vec3 bt = normalize(cross(nrm0, tg));
        vec3 pA = position + tg * 0.025; vec3 pB = position + bt * 0.025; vec3 dA = pA + normalize(pA) * disp(pA); vec3 dB = pB + normalize(pB) * disp(pB);
        vec3 objectNormal = normalize(cross(dA - dPos, dB - dPos));`)
      .replace('#include <begin_vertex>', 'vec3 transformed = dPos;');
  };
  base.customProgramCacheKey = () => 'morph';
  return base;
}
S.blob = (st, o) => {
  const u = { time: { value: 0 }, amp: { value: o.amp || .2 }, freq: { value: o.freq || .9 } };
  const outer = new THREE.Mesh(new THREE.SphereGeometry(o.r || 1.75, 160, 160), morphMaterial(M.frosted({ thickness: 1.8, roughness: .28, transmission: .96, attenuationColor: new THREE.Color(0xf4f1ec), attenuationDistance: 3, clearcoat: 1, clearcoatRoughness: .08 }), u));
  st.group.add(outer);
  const core = new THREE.Mesh(new THREE.SphereGeometry((o.r || 1.75) * .3, 96, 96), morphMaterial(M.ceramic(C.ember, { roughness: .4 }), { time: u.time, amp: { value: .08 }, freq: { value: 2 } })); core.position.set(.3, -.2, -.2); st.group.add(core);
  st.on((t, dt) => { u.time.value = t; outer.rotation.y += dt * .1; core.rotation.y -= dt * .16; });
  st.shadowBlob(0, 0, 4.4, 1.8, .2);
  for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.24 + i * .1, 48, 48), i ? M.ceramic(0xe2dcd5) : M.glass()); s.position.set(2.6 - i * 5.4, 1.4 - i * 2.2, .5); st.group.add(s); st.floatObj(s, .22, .7, i * 2); }
  if (o.photo) { const f = photoFrame(o.photo, 3, 2); f.position.set(3.2, 1.2, -2.8); f.rotation.y = -.35; st.group.add(f); st.floatObj(f, .08, .45, 1); }
};

/* ---------- Library handed to scene modules ---------- */
const LIB = { THREE, M, C, rbox, tex, canvasTexture, textTexture, photoFrame, laptop, phoneObj, RoundedBoxGeometry, FontLoader, TextGeometry, reduced, small, fine, Stage, builtin: S };
window.RCV_LIB = LIB;

/* ---------- Boot ---------- */
function canWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (canWebGL()) {
  const els = Array.from(document.querySelectorAll('[data-scene]'));
  const boot = el => {
    if (el.dataset.ready) return; el.dataset.ready = '1';
    const d = el.dataset; const o = { ...d, two: d.two === '1', backdrop: d.backdrop !== '0', shadows: d.shadows === '1', dpr: d.dpr ? +d.dpr : undefined, floorY: d.floor ? +d.floor : undefined, camZ: d.camz ? +d.camz : undefined, rot: d.rot ? d.rot.split(',').map(Number) : undefined, shadow: d.shadow ? +d.shadow : undefined, pointerEl: d.pointer === 'page' ? document.body : undefined, px: d.px ? +d.px : undefined, fps: d.fps ? +d.fps : undefined, scrollPause: d.scrollPause === '1' };
    const fontsReady = document.fonts ? document.fonts.load("600 48px 'Playfair Display'").catch(() => {}) : Promise.resolve();
    fontsReady.then(async () => {
      const st = new Stage(el, o); let builder = S[d.scene] || S.plate;
      // Scene modules in /js/scenes/<name>.js (export default (stage, opts, lib) => void|Promise) override the built-in scenes
      if (d.module !== '0') { try { const mod = await import(`${ROOT}js/scenes/${d.scene}.js${window.RCV_V ? '?v=' + window.RCV_V : ''}`); if (mod && typeof mod.default === 'function') builder = (s, oo) => mod.default(s, oo, LIB); } catch (e) { if (d.module === '1') console.warn('scene module failed, using built-in:', d.scene, e); } }
      try { await builder(st, o); } catch (e) { console.error('scene build failed:', d.scene, e); }
      if (d.reflect === '1') st.reflectGroup(d.reflectOpacity ? +d.reflectOpacity : .16); if (d.fit !== '0') st.fitCamera(d.margin ? +d.margin : 1.18); if (!reduced && d.scene !== 'ambient') st.entrance(); st.start(); el.classList.add('is-live');
    });
  };
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { boot(en.target); io.unobserve(en.target); } }), { rootMargin: '300px' });
  els.forEach(el => io.observe(el));
}
