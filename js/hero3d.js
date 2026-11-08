/* RCV hero — real 4K film on a 3D plane with depth, gentle parallax and cinematic light particles (Three.js).
   Falls back to the plain <video> when WebGL, motion or power is limited. */
import * as THREE from '/assets/vendor/three.module.min.js';

const hero = document.querySelector('.hero');
const video = hero && hero.querySelector('video');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 767.98px)').matches;

function canWebGL() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }

if (hero && video && !reduced && !small && canWebGL()) {
  const media = hero.querySelector('.hero-media');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(media.clientWidth, media.clientHeight, false);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  media.appendChild(renderer.domElement);
  video.style.opacity = '0';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, media.clientWidth / media.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  // Film plane (object-fit: cover in 3D)
  const tex = new THREE.VideoTexture(video); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime: { value: 0 }, uVig: { value: 0.55 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uTime; uniform float uVig; varying vec2 vUv;
      void main(){ vec3 c = texture2D(map, vUv).rgb;
        // warm, filmic grade: lift blacks slightly, soften blues, add warmth
        c = pow(c, vec3(0.96)); c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))), 0.08); c *= vec3(1.03, 0.995, 0.955);
        float d = distance(vUv, vec2(0.5)); c *= 1.0 - smoothstep(0.45, 0.95, d) * uVig * 0.6;
        // very fine grain
        float g = fract(sin(dot(vUv * (uTime + 1.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5; c += g * 0.012;
        gl_FragColor = vec4(c, 1.0); }`
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), mat);
  scene.add(plane);
  const videoAspect = () => (video.videoWidth && video.videoHeight) ? video.videoWidth / video.videoHeight : 16 / 9;
  const fit = () => {
    const w = media.clientWidth, h = media.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const dist = camera.position.z; const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist; const vw = vh * camera.aspect;
    const va = videoAspect(); let pw = vw, ph = vw / va; if (ph < vh) { ph = vh; pw = vh * va; }
    plane.scale.set(pw * 1.12, ph * 1.12, 1); // 12% bleed for parallax room
  };
  video.addEventListener('loadedmetadata', fit); fit();

  // Cinematic light particles (depth-sorted sprites, additive, soft)
  const makeSprite = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,250,240,1)'); r.addColorStop(0.35, 'rgba(255,240,236,0.55)'); r.addColorStop(1, 'rgba(255,230,230,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const N = 150, pos = new Float32Array(N * 3), seed = new Float32Array(N), size = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = (Math.random() - 0.5) * 9; pos[i * 3 + 2] = 2 + Math.random() * 6; seed[i] = Math.random() * 100; size[i] = 10 + Math.random() * 34; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const pmat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTex: { value: makeSprite() }, uPR: { value: renderer.getPixelRatio() } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; attribute float aSize; uniform float uTime; uniform float uPR; varying float vA;
      void main(){ vec3 p = position; float t = uTime * 0.12 + aSeed; p.y += sin(t * 0.9) * 0.35 + mod(t * 0.25, 9.0) - 4.5; p.x += cos(t * 0.6) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float dpt = -mv.z;
        gl_PointSize = aSize * uPR * (10.0 / dpt); vA = 0.18 + 0.22 * (0.5 + 0.5 * sin(t * 1.7)); vA *= smoothstep(1.5, 4.0, dpt) ; }`,
    fragmentShader: `uniform sampler2D uTex; varying float vA; void main(){ vec4 c = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(c.rgb, c.a * vA); }`
  });
  const pts = new THREE.Points(geo, pmat); scene.add(pts);

  // Pointer parallax (lerped), slow breathing zoom
  let tx = 0, ty = 0, cx = 0, cy = 0, visible = true, t0 = performance.now();
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5); ty = ((e.clientY - r.top) / r.height - 0.5); });
  hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  const io = new IntersectionObserver(es => es.forEach(en => { visible = en.isIntersecting; if (visible) loop(); })); io.observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) loop(); });
  let raf = 0, sy = 0;
  addEventListener('scroll', () => { sy = Math.min(1, scrollY / Math.max(1, hero.offsetHeight)); }, { passive: true });
  const loop = () => {
    cancelAnimationFrame(raf);
    if (!visible || document.hidden) return;
    const t = (performance.now() - t0) / 1000;
    cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
    // visible depth: the film tilts up to ~5° and slides against the pointer, then dollies away as you scroll
    plane.rotation.y = cx * 0.17; plane.rotation.x = -cy * 0.11 + sy * 0.12;
    plane.position.x = -cx * 0.9; plane.position.y = cy * 0.6 + sy * 1.4; plane.position.z = -sy * 2.2;
    const z = 1 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.22));
    plane.scale.z = 1; plane.matrixWorldNeedsUpdate = true; plane.scale.setX(plane.scale.x / (plane.userData.z || 1) * z); plane.scale.setY(plane.scale.y / (plane.userData.z || 1) * z); plane.userData.z = z;
    pts.position.x = -cx * 2.2; pts.position.y = cy * 1.4 + sy * 2.5; pts.rotation.z = cx * 0.05;
    mat.uniforms.uTime.value = t; pmat.uniforms.uTime.value = t;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  addEventListener('resize', () => { fit(); plane.userData.z = 1; }, { passive: true });
  video.play().catch(() => {});
  loop();
}
