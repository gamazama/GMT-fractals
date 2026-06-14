/**
 * Shared GLSL chunks reused across the fluid-toy shader family.
 *
 * Texture conventions (RGBA16F unless noted):
 *   juliaTex       RG = final iterate z (Re, Im), B = smooth iter, A = escaped?
 *   velocityTex    RG = velocity (x, y)
 *   dyeTex         RGB = colour, A = opacity
 *   divergenceTex  R  = divergence
 *   pressureTex    R  = pressure
 *   curlTex        R  = z-component of curl (2D)
 *   forceTex       RG = motion-vector force, BA = dye injection (optional)
 */

/**
 * Shared gradient-sampling snippet. Any frag shader that reads the gradient should:
 *   - declare `uniform sampler2D uGradient; uniform int uColorMapping; uniform float uGradientRepeat; uniform float uGradientPhase;`
 *   - include `GRADIENT_SAMPLE_GLSL` somewhere above main
 *   - call `vec3 c = gradientForJulia(juliaTex_sample);`
 *
 * juliaTex_sample is the RGBA from the julia aux texture:
 *   .rg = final z (Re, Im),  .b = smooth iter count,  .a = escaped flag.
 */
/**
 * sRGB ↔ OKLab helpers (Björn Ottosson 2020). Used by dye dissipation to fade
 * lightness while preserving hue and chroma — stops dye from collapsing to
 * muddy grey as it dims. We treat the incoming colour as "roughly-sRGB" (it's
 * never been gamma-corrected explicitly, since the dye LUT / gradient is all
 * in display space) — aesthetically it reads correctly even if not strictly
 * colorimetric.
 */
export const OKLAB_GLSL = /* glsl */ `
vec3 rgbToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325372 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  float lc = pow(max(l, 0.0), 1.0/3.0);
  float mc = pow(max(m, 0.0), 1.0/3.0);
  float sc = pow(max(s, 0.0), 1.0/3.0);
  return vec3(
    0.2104542553*lc + 0.7936177850*mc - 0.0040720468*sc,
    1.9779984951*lc - 2.4285922050*mc + 0.4505937099*sc,
    0.0259040371*lc + 0.7827717662*mc - 0.8086757660*sc
  );
}
vec3 oklabToRgb(vec3 c) {
  float lc = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float mc = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float sc = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  float l = lc * lc * lc;
  float m = mc * mc * mc;
  float s = sc * sc * sc;
  return vec3(
    +4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
    -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
    -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
  );
}
`;

export const GRADIENT_SAMPLE_GLSL = /* glsl */ `
// Convert the fractal's per-pixel data into a 0..1-ish scalar along which to sample the gradient.
// j   = main  tex: rg = final z, b = smooth iter, a = escaped
// aux = aux   tex: r = minT (orbit trap),  g = stripe avg,  b = log(1+|dz|),  a = trapIter (norm)
//
// Two normalization regimes, selected by uColorNormV2:
//   v1 (legacy, flag OFF): the original per-mode magic constants. Kept verbatim so
//      existing GX / fluid-toy scenes render byte-identical until the flag flips.
//   v2 (flag ON): every mode returns a DEPTH-DECOUPLED field so the Density control
//      (uGradientRepeat) means the same thing (~1 = one sane sweep) at ANY zoom.
//      The depth normalizers (from the SOTA research) are:
//        • counts  → divide by the iteration cap (uMaxIter grows ~linearly with depth)
//        • potential / |z| → log2(log2(|z|²))  (classic even-band escape potential)
//        • DISTANCE ESTIMATE → measured in PIXELS: d / pixel_spacing. Both d and the
//          spacing underflow f32 at deep zoom, but the RATIO is O(1); we work in log
//          space via uLogPixelScale = ln(world-units per pixel) so it never underflows.
//        • orbit traps → the trap distance lives in the DYNAMICAL z-plane (camera-zoom
//          INDEPENDENT); a deeper view just runs more iters so minT saturates → use a
//          log mapping to restore contrast instead of a pixel-scale divide.
// Continuous-potential field (shared by Potential + its Magnitude alias). PURE |z|-based: the
// escape overshoot log2(|z|²/R²) ∈ [0, 2·log2 R], measured relative to the escape radius (so it's
// escape-radius-robust). No iteration count — this is the sub-iteration equipotential structure
// (sparse far from the set, dense near the boundary), genuinely distinct from Iterations. The
// "rate of log" lives INSIDE the outer log: small rate → ~one narrow sweep (the classic
// equipotential ramp), large rate → the overshoot spreads into more bands. Density = frequency.
float potentialField(vec4 j, float rate) {
  float overshoot = log2(max(dot(j.rg, j.rg) / max(uEscapeR2, 1e-12), 1.0));
  return log2(1.0 + rate * overshoot);
}

float colorMappingT(vec4 j, vec4 aux) {
  if (uColorNormV2 == 0) {
    // ── v1 legacy (unchanged) ────────────────────────────────────────────────
    if (uColorMapping == 0)  return j.b * 0.05;                                  // Iterations (smooth)
    if (uColorMapping == 1)  return atan(j.g, j.r) * 0.15915494 + 0.5;           // Angle (arg z)
    if (uColorMapping == 2)  return clamp(length(j.rg) * 0.08, 0.0, 1.0);        // Magnitude
    if (uColorMapping == 3)  return step(0.0, j.g) * 0.5 + 0.25;                 // Decomposition
    if (uColorMapping == 4)  return floor(j.b) * 0.0625;                         // Hard Bands
    if (uColorMapping == 5)  return 1.0 - clamp(aux.r * 0.6, 0.0, 1.0);          // Orbit Trap (point)
    if (uColorMapping == 6)  return 1.0 - clamp(aux.r * 0.8, 0.0, 1.0);          // Orbit Trap (circle)
    if (uColorMapping == 7)  return 1.0 - clamp(aux.r * 1.2, 0.0, 1.0);          // Orbit Trap (cross)
    if (uColorMapping == 8)  return 1.0 - clamp(aux.r * 0.8, 0.0, 1.0);          // Orbit Trap (line)
    if (uColorMapping == 9)  return clamp(aux.g, 0.0, 1.0);                      // Stripe Average
    if (uColorMapping == 10) {                                                  // Distance Estimate
      float absZ = max(length(j.rg), 1e-6);
      float absDz = max(exp(aux.b) - 1.0, 1e-6);
      float d = 0.5 * absZ * log(absZ) / absDz;
      return 1.0 - exp(-d * 4.0);
    }
    if (uColorMapping == 11) return clamp(aux.b * 0.25, 0.0, 1.0);              // Derivative (log|dz|)
    if (uColorMapping == 12) {                                                  // Continuous Potential
      float r2 = max(dot(j.rg, j.rg), 1.0001);
      return fract(log2(log2(r2)) * 0.5);
    }
    if (uColorMapping == 13) return aux.a;                                      // Trap Iteration
    return j.b * 0.05;
  }

  // ── v2 depth-normalized fields (Density ≈ 1 sane at any zoom) ───────────────
  float maxIterF = max(float(uMaxIter), 1.0);
  if (uColorMapping == 0) {                                                     // Iterations: absolute log + Rate
    // The iteration count is INTRINSIC to a point, so an absolute mapping (no ÷cap)
    // keeps a point's colour constant at any zoom → colours HOLD. log(1+count) stays
    // in a tight ~0..17 band across all depths so one Density is sane everywhere AND
    // a view spanning low+high counts bands in both (log compresses the high end).
    // uIterOffset/uIterScale are the on-demand "Fit to view" re-anchor (identity by
    // default); uIterRate is the gamma that biases low-iter filaments vs deep interiors.
    float L  = log(1.0 + max(j.b, 0.0));
    float Lv = (L - uIterOffset) * uIterScale;
    // sign-symmetric gamma: the banding stays continuous & monotonic THROUGH the
    // anchored window into the out-of-range regions (counts below/above the Fit
    // window keep cycling the palette) instead of clamping flat at field 0.
    return sign(Lv) * pow(abs(Lv), uIterRate);
  }
  if (uColorMapping == 1) {                                                     // Angle: iteration log-spiral
    // Twist the angular bands by the smooth iteration count → a log-spiral. Density = arms,
    // Phase = rotate, Rate = how tightly the bands wind with depth (the high-vs-low-iter
    // "closeness"). Rate 0 → pure radial sectors; higher → tighter spiral.
    float angle01 = atan(j.g, j.r) * 0.15915494 + 0.5;
    return angle01 + uIterRate * 0.05 * log(1.0 + max(j.b, 0.0));
  }
  if (uColorMapping == 2)  return potentialField(j, uIterRate);                 // Magnitude → alias of Continuous Potential
  if (uColorMapping == 3)  return step(0.0, j.g) * 0.5 + 0.25;                  // Decomposition (topological — unchanged)
  if (uColorMapping == 4) {                                                     // Hard Bands: N bands across the escape spread
    const float BANDS = 32.0;
    return floor(clamp(j.b / maxIterF, 0.0, 1.0) * BANDS) * (1.0 / BANDS);
  }
  // Orbit traps — log of (inverse) trap distance. Dynamical-plane distance is
  // camera-scale-independent; the log spreads minT's many-decade range into even
  // contrast and keeps it from saturating as the iteration cap rises with depth.
  // Per-shape scale keeps each shape's character (point tightest, cross loosest).
  if (uColorMapping == 5)  return -log2(clamp(aux.r, 1e-8, 1.0)) * 0.06;        // Orbit Trap (point)
  if (uColorMapping == 6)  return -log2(clamp(aux.r, 1e-8, 1.0)) * 0.05;        // Orbit Trap (circle)
  if (uColorMapping == 7)  return -log2(clamp(aux.r, 1e-8, 1.0)) * 0.04;        // Orbit Trap (cross)
  if (uColorMapping == 8)  return -log2(clamp(aux.r, 1e-8, 1.0)) * 0.05;        // Orbit Trap (line)
  if (uColorMapping == 9)  return clamp(aux.g, 0.0, 1.0);                       // Stripe Average (freq normalized in kernel)
  if (uColorMapping == 10) {                                                   // Distance Estimate (in PIXELS)
    // d = 0.5·|z|·ln|z| / |dz| ; DE_pixels = d / pixel_spacing.
    // ln(DE_px) = ln0.5 + ln|z| + ln(ln|z|) − ln|dz| − ln(pixel_spacing).
    // aux.b = ln(1+|dz|) ≈ ln|dz| where |dz| is large (i.e. near the boundary,
    // which is where DE matters); uLogPixelScale = ln(world-units per pixel).
    float lnAbsZ   = log(max(length(j.rg), 1.0001));
    float lnDEpix  = -0.6931472 + lnAbsZ + log(max(lnAbsZ, 1e-12)) - aux.b - uLogPixelScale;
    // Linear = boundary glow (0 at the set, →1 in the open exterior). Log = log10(DE_px) →
    // even contour rings, ~1 ring per distance-decade at Density 1 (scale-uniform at any zoom).
    // Rate (shared gamma, sign-symmetric so log rings band on both sides) shapes contrast.
    float f = (uDeLogBands != 0)
        ? (lnDEpix * 0.4342945)
        : (1.0 - exp(-exp(clamp(lnDEpix, -40.0, 30.0))));
    return sign(f) * pow(abs(f), uIterRate);
  }
  if (uColorMapping == 11) {                                                   // Derivative as slope: log|dz| / depth
    // |dz| ≈ 1/pixel_spacing at the boundary, so ln|dz| ≈ −uLogPixelScale; divide it out.
    return clamp(aux.b / max(-uLogPixelScale + 1.0, 1.0), 0.0, 1.0);
  }
  if (uColorMapping == 12) return potentialField(j, uIterRate);               // Continuous Potential
  if (uColorMapping == 13) return aux.a;                                       // Trap Iteration (already /maxIter)
  return j.b / maxIterF;
}

vec4 gradientForJuliaRgba(vec4 j, vec4 aux) {
  float t0 = colorMappingT(j, aux);
  float t = fract(t0 * uGradientRepeat + uGradientPhase);
  return texture(uGradient, vec2(t, 0.5));
}

vec3 gradientForJulia(vec4 j, vec4 aux) { return gradientForJuliaRgba(j, aux).rgb; }
`;

export const VERT_FULLSCREEN = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUv;
out vec2 vL; // left
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 uTexel;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
