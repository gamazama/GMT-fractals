/**
 * geometryFrag — the three 2D geometries as a FRAGMENT SHADER: the fast path the compositor
 * uses for live frames, mirroring `palette/core/rampGeometry.ts`'s `sampleGeometry`.
 *
 * ── Why a second implementation exists at all ────────────────────────────────────────────
 * The geometries are `cpuField` modes because their still image is dithered with serpentine
 * Floyd–Steinberg ERROR DIFFUSION, which is inherently serial and cannot be a fragment shader.
 * `debug/test-dither.mts` measures why that matters: error diffusion tracks the ideal line at
 * WIGGLE 0.040 against the GL blue-noise tail's 0.238 — six times smoother on the shallow
 * gradients this tool exists to show. That decision stands, and this file does not touch it.
 *
 * What it changes is the frames NOBODY was dithering anyway. The overlay already drops the
 * dither while a handle drag is in flight (`comp.dither = fs.dither && !fs.interacting`), so
 * those frames were paying the full CPU cost — a measured 341 ms at 2560×1440 for radial — to
 * produce an UNDITHERED result. They now render here instead, on the GPU, through the shared
 * blue-noise tail: faster than the CPU path and better dithered than what they replaced. The
 * settled frame still goes through `renderFieldDithered`, byte-identical to before.
 *
 * ── Keeping the two in step ──────────────────────────────────────────────────────────────
 * Two implementations of one law is a drift hazard, and the repo's usual answer — export the
 * law and call it from both — is not available across the JS/GLSL boundary. So the guard is a
 * comparison instead: `npm run smoke:gx-geom-gpu` renders every geometry both ways at a
 * spread of params and asserts the two agree per pixel within a tolerance the still image
 * cannot show. Change a constant in one and that goes red naming the geometry.
 *
 * `BIAS_K`, `GEOM_DEFAULTS` and the isotropic unit mapping below are the TS file's; when you
 * edit `sampleGeometry`, edit `geometryFrag` in the same commit and run that smoke.
 *
 * @see palette/core/rampGeometry.ts (the authority — the CPU field and the still image)
 * @see gradient-explorer/fullscreen/ditherTail.ts (the wrapper this body plugs into)
 */

/** Uniform block for the shared geometry body. Names must not collide with RESERVED_UNIFORMS. */
export const GEOM_FRAG_UNIFORMS = /* glsl */ `
uniform int  uGeomId;      // 0 linear · 1 radial · 2 conic
uniform vec2 uLinear;      // angle, bias
uniform vec4 uRadial;      // cx, cy, scale, bias
uniform vec2 uRadialSine;  // amp, freq
uniform vec4 uConic;       // angle, cx, cy, mirror
uniform vec3 uConic2;      // biasA, biasB, twist
uniform vec3 uBg;          // background where coverage < 1 (arched gaps), 0..1
`;

export const GEOM_FRAG_UNIFORM_NAMES = [
  'uGeomId', 'uLinear', 'uRadial', 'uRadialSine', 'uConic', 'uConic2', 'uBg',
] as const;

/**
 * `vec3 modeColor(vec2 uv)` for all three geometries, switched on `uGeomId`. The branch is
 * uniform across the draw, so it costs nothing in practice and one body keeps the three
 * geometries' shared maths (`biasf`, the isotropic mapping) in a single place — the same
 * reason `sampleGeometry` is one function with a switch rather than four.
 */
export const GEOM_FRAG_BODY = /* glsl */ `
// The TS BIAS_K. Signed IQ "gain": b == 0 is exactly the identity.
const float BIAS_K = 1.6;
float biasf(float t, float b) {
  if (b == 0.0) return t;
  float k = exp(b * BIAS_K);
  float u = clamp(t, 0.0, 1.0);
  return u < 0.5 ? 0.5 * pow(2.0 * u, k) : 1.0 - 0.5 * pow(2.0 * (1.0 - u), k);
}
float wrap01(float v) { return v - floor(v); }

// The house log-spiral: mirrors conicTwistTurns.
float twistTurns(float twist, float r) { return twist == 0.0 ? 0.0 : twist * log(1.0 + r); }
// Mirrors radialSineReach.
float sineReach(float scale, float amp, float freq, float ang) {
  return amp == 0.0 ? scale : scale * (1.0 + amp * sin(freq * ang));
}

vec3 modeColor(vec2 uv) {
  // Isotropic units, exactly as sampleGeometry builds them: pixel offsets from the frame
  // centre divided by half the SHORTER side, so a circle stays a circle on a wide canvas.
  float w = uResolution.x, h = uResolution.y;
  float cxp = (w - 1.0) * 0.5;
  float cyp = (h - 1.0) * 0.5;
  float half_ = max(1e-6, min(cxp, cyp));
  // uv is pixel-centred over the backing store: uv * res - 0.5 recovers the pixel index.
  float px = uv.x * w - 0.5;
  float py = uv.y * h - 0.5;
  float ux = (px - cxp) / half_;
  float uy = (py - cyp) / half_;

  float p = 0.0;
  float cov = 1.0;

  if (uGeomId == 0) {
    float lc = cos(uLinear.x), ls = sin(uLinear.x);
    float ax = cxp / half_, ay = cyp / half_;
    float lProjAbs = abs(lc) * ax + abs(ls) * ay;
    float lSpan = max(1e-6, 2.0 * lProjAbs);
    p = biasf((ux * lc + uy * ls + lProjAbs) / lSpan, uLinear.y);
  } else if (uGeomId == 1) {
    float radialNorm = 1.0 / max(1e-6, length(vec2(cxp, cyp)) / half_);
    float rx = ux - uRadial.x;
    float ry = uy - uRadial.y;
    float scale = max(1e-3, uRadial.z);
    float reach = uRadialSine.x != 0.0
      ? sineReach(scale, uRadialSine.x, uRadialSine.y, atan(ry, rx))
      : scale;
    p = biasf(clamp(sqrt(rx * rx + ry * ry) * radialNorm / max(1e-3, reach), 0.0, 1.0), uRadial.w);
  } else if (uGeomId == 2) {
    float cdx = ux - uConic.y;
    float cdy = uy - uConic.z;
    float ang = atan(cdy, cdx);
    float mirror = uConic.w;
    float spin = twistTurns(uConic2.z, sqrt(cdx * cdx + cdy * cdy));
    float phi = wrap01((ang + uConic.x + 3.14159265) / 6.28318531 + spin);
    float split = 1.0 - mirror;
    if (mirror <= 0.0) p = biasf(phi, uConic2.x);
    else if (phi < split) p = biasf(phi / split, uConic2.x);
    else p = biasf(1.0 - (phi - split) / mirror, uConic2.y);
  }

  return mix(uBg, sampleLut(p), cov);
}
`;
