# Scene modules

One file per scene: `js/scenes/<name>.js`. The engine (`js/scenes.js`) imports it on demand and calls

```js
export default function build(stage, opts, lib) { /* add objects to stage.group; return nothing or a Promise */ }
```

If the module is missing or throws, the engine falls back to its built-in version of the scene (`lib.builtin[name]`).
A module may also *reuse* the built-in and add to it: `lib.builtin.lens(stage, opts); ...more objects...`.

## stage (instance of lib.Stage)
- `stage.group` — THREE.Group; put everything here (it is auto-framed, pointer-rotated, entrance-animated, mirrored for reflections).
- `stage.scene`, `stage.camera` (PerspectiveCamera, fov 30), `stage.renderer` (ACES tone mapping, sRGB, alpha).
- `stage.on((t, dt) => {...})` — per-frame callback; `t` seconds since boot, `dt` frame delta.
- `stage.floatObj(obj, amp, speed, phase, spin)` — idle bob (+ optional y-spin).
- `stage.shadowBlob(x, z, w, h, opacity, y?)` — soft contact shadow on the floor (floor y = `stage.o.floorY ?? -2.6`).
- `stage.o` — options from the element's `data-*` attributes (`photo`, `photo2`, `photo3`, `title`, `sub`, `two`, `floorY`, `rot`, `sway`, `px`, `py`, ...). You may set `stage.o.rot = [rx, ry]`, `stage.o.sway`, `stage.o.px`, `stage.o.py` to tune the pointer/idle rotation of the group.
- `stage.fitCamera(margin)`, `stage.entrance()`, `stage.reflectGroup(opacity)` are called by the engine after `build` resolves (the engine reads `data-margin`, `data-reflect`).
- Environment: a real studio HDR is applied to `stage.scene.environment` when loaded (RoomEnvironment until then).

## lib
- `lib.THREE` — three.js (r170). `lib.RoundedBoxGeometry`, `lib.FontLoader`, `lib.TextGeometry` (font: `/assets/fonts/helvetiker_bold.typeface.json`).
- `lib.M` — materials: `glass(o)`, `frosted(o)`, `metal(colorHex, o)`, `ceramic(colorHex, o)`, `ember(o)` (crimson glossy), `photo(texture)` (unlit), `paper()`.
- `lib.C` — palette: `ember` 0xc8102e (crimson), `clay` 0x7a0f22 (burgundy), `peach` 0xf26b5b (coral), `sand`, `porcelain` (ivory), `espresso` (charcoal), `cocoa`, `cream`. **Never blue, gold, green, violet or orange.**
- `lib.rbox(w, h, d, radius, segments)` — rounded box geometry.
- `lib.tex(url)` — sRGB texture loader. `lib.canvasTexture(drawFn, w, h)`, `lib.textTexture(title, sub)`.
- `lib.photoFrame(url, w, h, {border, depth, glass})` — framed photo group.
- `lib.laptop(photoUrl)`, `lib.phoneObj(photoUrl, dark)` — device models with real screens.
- `lib.reduced` (prefers-reduced-motion), `lib.small` (phone), `lib.fine` (mouse).

## Rules
- Realistic, premium, calm: physically based materials, HDR reflections, soft contact shadows, no neon, no glow blobs, no wireframes.
- Keep everything inside roughly a 9 × 6 × 6 unit box around the origin (the camera auto-frames it). Floor is `stage.o.floorY ?? -2.6`; stand objects on it or float above it.
- Target 60 fps on a laptop GPU: < 60k triangles per scene, ≤ 2 transmission (glass) materials, no shadow maps (use `stage.shadowBlob`).
- Animate continuously but gently (rotation sways, bobbing, slow orbits, rising/pulsing, blinking LEDs, scrolling screens). Respect `lib.reduced` (render still).
- Test page: `http://localhost:5680/assets/_scenetest.html?scene=<name>&photo=<url>&reflect=1` (add any `data-*` as query params).
