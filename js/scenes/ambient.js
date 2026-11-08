/* Site-wide calm background: small glass, ceramic and crimson shapes drifting at different depths behind every page.
   It reuses the engine's built-in version (cheap: no shadows, low pixel ratio); this file exists so the engine finds a module. */
export default function build(stage, opts, lib) { return lib.builtin.ambient(stage, opts); }
