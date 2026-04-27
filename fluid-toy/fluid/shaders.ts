import { BLUE_NOISE } from '../../shaders/chunks/blue_noise';
import { TSAA } from '../../shaders/chunks/tsaa';

// All shaders for the Julia-Fluid toy. WebGL2 (GLSL ES 3.00).
//
// Texture contents by convention:
//   juliaTex       RGBA16F : RG = final iterate z (Re, Im), B = smooth iter count, A = escaped?
//   velocityTex    RGBA16F : RG = velocity (x, y), BA unused
//   dyeTex         RGBA16F : RGB = color carried by fluid, A = opacity
//   divergenceTex  RGBA16F : R  = divergence
//   pressureTex    RGBA16F : R  = pressure
//   curlTex        RGBA16F : R  = z-component of curl (2D)
//   forceTex       RGBA16F : RG = motion-vector force, BA = dye injection (optional)

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
// aux = aux   tex: r = minT (orbit trap),  g = stripe avg,  b = log|dz|,  a = trapIter (norm)
float colorMappingT(vec4 j, vec4 aux) {
  if (uColorMapping == 0)  return j.b * 0.05;                                    // Iterations (smooth)
  if (uColorMapping == 1)  return atan(j.g, j.r) * 0.15915494 + 0.5;             // Angle (arg z)
  if (uColorMapping == 2)  return clamp(length(j.rg) * 0.08, 0.0, 1.0);          // Magnitude
  if (uColorMapping == 3)  return step(0.0, j.g) * 0.5 + 0.25;                   // Decomposition
  if (uColorMapping == 4)  return floor(j.b) * 0.0625;                           // Hard Bands
  // Orbit traps share aux.r but the distance FORMULA differs per shape; the Julia
  // shader already knows which one to compute via uTrapMode, so the four trap
  // mapping IDs below just select how to stretch that distance to a [0,1] colour t.
  if (uColorMapping == 5)  return 1.0 - clamp(aux.r * 0.6, 0.0, 1.0);            // Orbit Trap (point)
  if (uColorMapping == 6)  return 1.0 - clamp(aux.r * 0.8, 0.0, 1.0);            // Orbit Trap (circle)
  if (uColorMapping == 7)  return 1.0 - clamp(aux.r * 1.2, 0.0, 1.0);            // Orbit Trap (cross)
  if (uColorMapping == 8)  return 1.0 - clamp(aux.r * 0.8, 0.0, 1.0);            // Orbit Trap (line)
  if (uColorMapping == 9)  return clamp(aux.g, 0.0, 1.0);                        // Stripe Average
  if (uColorMapping == 10) {                                                    // Distance Estimate
    // d ≈ 0.5 * |z| * log|z| / |dz|  →  aux.b stores log(1+|dz|).
    float absZ = max(length(j.rg), 1e-6);
    float absDz = max(exp(aux.b) - 1.0, 1e-6);
    float d = 0.5 * absZ * log(absZ) / absDz;
    return 1.0 - exp(-d * 4.0);
  }
  if (uColorMapping == 11) return clamp(aux.b * 0.25, 0.0, 1.0);                // Derivative (log|dz|)
  if (uColorMapping == 12) {                                                    // Continuous Potential
    float r2 = max(dot(j.rg, j.rg), 1.0001);
    return fract(log2(log2(r2)) * 0.5);
  }
  if (uColorMapping == 13) return aux.a;                                        // Trap Iteration
  return j.b * 0.05;
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

// -----------------------------------------------------------------------------
// Julia / Mandelbrot field.
// Writes TWO render targets via MRT:
//   out0 (main): rg = final z, b = smooth iter count, a = escaped flag
//   out1 (aux):  r = minT (orbit-trap min distance, shape picked by uTrapMode)
//                g = stripe average (Härkönen)
//                b = log(1 + |dz/dc|)  — derivative magnitude proxy
//                a = trapIter (iteration at which minT occurred, normalised 0..1)
// -----------------------------------------------------------------------------
export const FRAG_JULIA = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;

uniform int   uKind;          // 0 julia, 1 mandelbrot
uniform vec2  uJuliaC;
uniform vec2  uCenter;        // center in fractal coords
uniform float uScale;         // world-units per uv-unit (height)
uniform float uAspect;
uniform int   uMaxIter;
uniform int   uColorIter;     // iterations used for coloring accumulators (≤ uMaxIter)
uniform float uEscapeR2;      // escape radius squared
uniform float uPower;         // integer power of z (2..8)

// Orbit-trap params — trap SHAPE is driven by uTrapMode:
//   0 = point (at uTrapCenter)
//   1 = circle (|z-center| - radius)
//   2 = cross (min of distances to X/Y axes shifted by center)
//   3 = line (signed distance to ax+by=d line)
uniform int   uTrapMode;
uniform vec2  uTrapCenter;
uniform float uTrapRadius;
uniform vec2  uTrapNormal;    // unit normal for line trap
uniform float uTrapOffset;    // d for line trap
uniform float uStripeFreq;    // k in sin(k·arg z)

// TSAA sub-pixel jitter — when > 0, primary sample position is jittered
// by blue-noise to drive temporal anti-aliasing. Value is the jitter
// AMPLITUDE in pixel fractions (1.0 = ±0.5 px). Set to 0 to disable.
uniform float uJitterScale;
uniform vec2  uResolution;
uniform sampler2D uBlueNoiseTexture;
uniform vec2  uBlueNoiseResolution;
uniform int   uFrameCount;
// K-sampling: number of jittered Julia evaluations per frame, raw-
// averaged before pushed to the TSAA accumulator.
uniform int   uPerFrameSamples;

// Total grid cells covered across one full "round" of frames. Always
// a perfect square (4, 9, 16, 25). Default 16 = 4×4 grid. Combined
// with uPerFrameSamples (cells visited per frame) this gives:
//   framesPerRound = uGridSize / uPerFrameSamples
// e.g. K=4, gridSize=16 → 4 frames per round; after frame 4 the TSAA
// accumulator has averaged all 16 cell centres → identical to a
// single-frame K=16 grid. K=16, gridSize=16 → 1 frame per round.
uniform int   uGridSize;

// Current TSAA accumulator frame index (0 on first frame after a
// reset). Drives the cell-cycling and the round-based progressive
// sub-cell refinement in grid mode.
uniform int   uTsaaSampleIndex;

// Jitter mode:
//   0 — blue noise: each sub-sample reads a different texel of the
//       per-frame R2-animated blue-noise texture. Random within a
//       frame, decorrelated across frames; converges in expectation
//       but the accumulator shimmers as the running mean settles.
//   1 — grid (default): each frame places K sub-samples at the
//       centres of K cells in a √gridSize × √gridSize lattice. The
//       cells visited cycle across frames so a full round of
//       (gridSize/K) frames covers every cell exactly once. After
//       round 0 the accumulator equals the centre-grid average.
//       Round 1+ shifts samples to deterministic blue-noise-indexed
//       sub-cell positions — same offset for every pixel at a given
//       round (no shimmer), but consecutive rounds pull spatially
//       decorrelated taps so progressive refinement looks organic.
uniform int   uJitterMode;

${BLUE_NOISE}
${TSAA}

// complex multiply
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }

// z -> z^p for small integer p (unrolled for speed; fallback for non-int powers)
vec2 cpow(vec2 z, float p) {
  int pi = int(p + 0.5);
  if (abs(p - float(pi)) < 0.01) {
    vec2 r = vec2(1.0, 0.0);
    vec2 b = z;
    int e = pi;
    if (e <= 0) return vec2(1.0, 0.0);
    for (int i = 0; i < 8; ++i) {
      if ((e & 1) == 1) r = cmul(r, b);
      e >>= 1;
      if (e == 0) break;
      b = cmul(b, b);
    }
    return r;
  }
  float mag = length(z);
  float ang = atan(z.y, z.x);
  float rm = pow(mag, p);
  float ra = ang * p;
  return rm * vec2(cos(ra), sin(ra));
}

// Distance of point q to the currently-selected trap shape.
float trapDistance(vec2 q) {
  vec2 d = q - uTrapCenter;
  if (uTrapMode == 0) return length(d);                                      // point
  if (uTrapMode == 1) return abs(length(d) - uTrapRadius);                   // circle
  if (uTrapMode == 2) return min(abs(d.x), abs(d.y));                        // cross
  if (uTrapMode == 3) return abs(dot(q, uTrapNormal) - uTrapOffset);         // line
  return length(d);
}

// One Julia evaluation at the given (jittered) UV. Out-params return
// the (outMain, outAux) data. Extracted so K-sampling can call it K
// times with different jitter offsets without inlining the iteration
// loop K times in source.
void evalJulia(vec2 uvJ, out vec4 outM, out vec4 outA) {
  vec2 uv = uvJ * 2.0 - 1.0;
  uv.x *= uAspect;
  vec2 p = uCenter + uv * uScale;

  vec2 z, c;
  if (uKind == 0) { z = p; c = uJuliaC; }
  else            { z = vec2(0.0); c = p; }

  float escaped = 0.0;
  float iters = float(uMaxIter);

  float minT      = 1e9;
  float trapIter  = 0.0;
  float stripeSum = 0.0;
  int   stripeCount = 0;
  vec2  dz = vec2(1.0, 0.0);

  for (int i = 0; i < 4096; ++i) {
    if (i >= uMaxIter) break;
    dz = cmul(2.0 * z, dz) + vec2(1.0, 0.0);
    z = cpow(z, uPower) + c;
    if (i < uColorIter) {
      float td = trapDistance(z);
      if (td < minT) { minT = td; trapIter = float(i); }
      stripeSum += 0.5 + 0.5 * sin(uStripeFreq * atan(z.y, z.x));
      stripeCount++;
    }
    float r2 = dot(z, z);
    if (r2 > uEscapeR2) {
      float smoothI = float(i) + 1.0 - log2(0.5 * log2(r2));
      iters = smoothI;
      escaped = 1.0;
      break;
    }
  }

  float stripeAvg = stripeCount > 0 ? stripeSum / float(stripeCount) : 0.0;
  float logDz     = log(1.0 + length(dz));
  float trapIterN = float(uMaxIter) > 0.0 ? trapIter / float(uMaxIter) : 0.0;

  outM = vec4(z, iters, escaped);
  outA = vec4(minT, stripeAvg, logDz, trapIterN);
}

void main() {
  // K-sampling: do K jittered Julia evaluations per frame, average
  // the raw outputs, then push to the TSAA accumulator. Effective
  // samples per blend = K × frames, so a fixed sample-cap is reached
  // K× faster (at K× per-frame cost). When uJitterScale is 0 (TSAA
  // disabled), K collapses to 1 — no extra cost.
  const int K_MAX = 16;
  int K = max(1, min(uPerFrameSamples, K_MAX));
  if (uJitterScale <= 0.0) K = 1;

  vec2 invRes = 1.0 / max(uResolution, vec2(1.0));
  // Blue-noise mode helpers.
  vec2 r2Step = vec2(R2_A1, R2_A2) * uBlueNoiseResolution.x;
  // Grid mode geometry — the lattice size is gridSize = gridDim².
  int gridSize = max(uGridSize, 1);
  int gridDim = int(floor(sqrt(float(gridSize)) + 0.5));
  if (gridDim < 1) gridDim = 1;
  gridSize = gridDim * gridDim;
  // Frames per round (one round = each lattice cell visited once).
  int framesPerRound = max(gridSize / max(K, 1), 1);
  int frameIdx = max(uTsaaSampleIndex, 0);
  int round = frameIdx / framesPerRound;
  int frameInRound = frameIdx - round * framesPerRound;
  // Sub-cell offset progressive refinement. Round 0 = cell centre
  // (matches a single-frame K=gridSize grid). Round 1+ pulls a
  // deterministic blue-noise tap indexed by round number — same
  // offset for every pixel at a given round (no shimmer; the whole
  // image jitters as one), but consecutive rounds walk through the
  // blue-noise texture via R2 so the offset sequence has good 2D
  // coverage without low-discrepancy patterning.
  vec2 subOffset = vec2(0.0);
  if (round > 0) {
    vec2 roundCoord = vec2(R2_A1, R2_A2) * float(round) * uBlueNoiseResolution.x;
    vec4 bn = getStableBlueNoise4(roundCoord);
    subOffset = (bn.xy - 0.5) / float(gridDim);
  }
  int cellOffset = frameInRound * K;

  vec4 accM = vec4(0.0);
  vec4 accA = vec4(0.0);

  for (int s = 0; s < K_MAX; ++s) {
    if (s >= K) break;

    vec2 jitter01;
    if (uJitterMode == 1) {
      // Cycle through gridSize cells across (gridSize/K) frames.
      int cellIdx = cellOffset + s;
      cellIdx = cellIdx - (cellIdx / gridSize) * gridSize;  // % gridSize
      int sx = cellIdx - (cellIdx / gridDim) * gridDim;
      int sy = cellIdx / gridDim;
      jitter01 = (vec2(float(sx), float(sy)) + 0.5) / float(gridDim) + subOffset;
    } else {
      // Blue-noise mode (unchanged): tsaaJitter returns offset in
      // [-0.5, 0.5]; shift to [0, 1] cell coords for unified handling.
      vec2 sampleCoord = gl_FragCoord.xy + r2Step * float(s);
      jitter01 = tsaaJitter(sampleCoord) + 0.5;
    }

    vec2 jitter = (uJitterScale > 0.0)
        ? (jitter01 - 0.5) * uJitterScale
        : vec2(0.0);
    vec2 uvJ = vUv + jitter * invRes;

    vec4 sM, sA;
    evalJulia(uvJ, sM, sA);
    accM += sM;
    accA += sA;
  }

  float invK = 1.0 / float(K);
  outMain = accM * invK;
  outAux  = accA * invK;
}`;

// -----------------------------------------------------------------------------
// Motion-vector computation. Reads current julia aux + previous julia aux +
// samples neighbors for finite-difference gradients. Produces a force texture
// whose RG is a velocity-space push and BA encodes "dye injection".
//
//   uMode 0 : Gradient  — ∇(smoothIter) (points away from Julia interior)
//   uMode 1 : Curl      — perp of ∇(smoothIter); divergence-free, swirls
//   uMode 2 : Iterate   — (z_n - z_{n-1}) direction via color difference
//   uMode 3 : C-Track   — temporal delta between current & previous julia tex
//   uMode 4 : Hue       — HSV hue→angle, value→magnitude from rendered color
// -----------------------------------------------------------------------------
export const FRAG_MOTION = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;

uniform sampler2D uJulia;
uniform sampler2D uJuliaPrev;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform vec2  uTexel;
uniform int   uMode;
uniform float uGain;
uniform float uDt;
uniform float uInteriorDamp;  // 0..1 : how much to damp inside the set (escaped=0)
uniform float uDyeGain;       // multiplier for dye injection from fractal color
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform float uEdgeMargin;    // 0..0.25 : force fade-to-zero margin near sim boundaries
uniform float uForceCap;      // absolute clamp on final force magnitude (per-pixel)
${GRADIENT_SAMPLE_GLSL}

void main() {
  vec4 c  = texture(uJulia, vUv);
  vec4 l  = texture(uJulia, vL);
  vec4 r  = texture(uJulia, vR);
  vec4 t  = texture(uJulia, vT);
  vec4 b  = texture(uJulia, vB);
  vec4 cp = texture(uJuliaPrev, vUv);

  float smoothI = c.b;
  float escaped = c.a;

  // gradient of smooth iteration count (finite diff)
  vec2 grad = vec2(r.b - l.b, t.b - b.b) * 0.5;

  vec2 force = vec2(0.0);
  vec3 injectColor = vec3(0.0);

  if (uMode == 0) {
    // Outward burst: normalize gradient; magnitude = min(|grad|, 1)
    float g = length(grad);
    force = (g > 1e-6) ? grad / g : vec2(0.0);
    force *= clamp(g * 0.6, 0.0, 1.5);
  } else if (uMode == 1) {
    // Divergence-free: perp of gradient — swirls along level sets
    vec2 perp = vec2(-grad.y, grad.x);
    float g = length(perp);
    force = (g > 1e-6) ? perp / g : vec2(0.0);
    force *= clamp(g * 0.8, 0.0, 1.8);
  } else if (uMode == 2) {
    // Final iterate direction (Böttcher flow): use z normalized, weighted by escape speed
    vec2 z = c.rg;
    float zm = length(z);
    vec2 dir = (zm > 1e-6) ? z / zm : vec2(0.0);
    // grow rate proxy: smoothI delta vs neighbor = "how fast are we escaping here"
    float g = length(grad);
    force = dir * clamp(g * 0.8, 0.0, 2.0);
  } else if (uMode == 3) {
    // C-Track: temporal derivative — how did this pixel's fractal identity shift
    // between the previous c and the current c? That delta direction IS a motion
    // vector that follows the Julia deformation.
    vec2 dz = c.rg - cp.rg;
    float ds = c.b - cp.b;
    // combine: direction from z-delta weighted by smooth-iter delta
    float mm = length(dz);
    vec2 dir = (mm > 1e-6) ? dz / mm : vec2(0.0);
    force = dir * clamp(mm * 3.0 + abs(ds) * 0.2, 0.0, 3.0);
    // Clamp 1/dt so tiny frames don't blow up the c-track magnitude.
    force *= clamp(1.0 / max(uDt, 0.016), 0.0, 40.0);
  } else if (uMode == 4) {
    // Hue flow: treat rendered palette color as vector field
    vec4 aux = texture(uJuliaAux, vUv);
    vec3 col = gradientForJulia(c, aux);
    float hueAngle = atan(col.g - col.b, col.r - 0.5);
    float val = length(col);
    force = vec2(cos(hueAngle), sin(hueAngle)) * val;
  }

  // Optionally damp inside the set (escaped = 0) — the interior is a "still lake"
  float damp = mix(1.0 - uInteriorDamp, 1.0, escaped);
  force *= damp;

  // Edge fade: prevents boundary artefacts from the pressure-Jacobi solve
  // reading clamped-edge neighbours. Tapers force to 0 in a thin margin.
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);
  force *= edgeFade;

  // Per-pixel magnitude cap — stops fast c-moves from spawning impulses that dominate.
  float fMag = length(force);
  if (fMag > uForceCap && fMag > 1e-6) {
    force *= uForceCap / fMag;
  }

  // Dye injection: a bit of the Julia-escape color bleeds into the fluid dye.
  // Edge-faded so the border doesn't paint itself in.
  {
    vec4 auxHere = texture(uJuliaAux, vUv);
    injectColor = gradientForJulia(c, auxHere) * escaped * uDyeGain * edgeFade;
  }

  // Solid obstacles emit no force into the fluid (and carry no dye injection).
  float solid = texture(uMask, vUv).r;
  force *= (1.0 - solid);
  injectColor *= (1.0 - solid);

  fragColor = vec4(force * uGain, injectColor.r, injectColor.g + injectColor.b * 0.5);
}`;

// -----------------------------------------------------------------------------
// Add force to velocity: v += force.rg * dt; plus inject dye (separate pass
// pulls from forceTex.ba). We keep forces lightweight — multiple passes.
// -----------------------------------------------------------------------------
export const FRAG_ADDFORCE = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uForce;
uniform sampler2D uMask;
uniform float uDt;
void main() {
  vec2 v = texture(uVelocity, vUv).rg;
  vec2 f = texture(uForce, vUv).rg;
  float solid = texture(uMask, vUv).r;
  fragColor = vec4((v + f * uDt) * (1.0 - solid), 0.0, 1.0);
}`;

// -----------------------------------------------------------------------------
// Inject fractal color into dye texture (pulls from forceTex.ba + palette rebuild)
// -----------------------------------------------------------------------------
export const FRAG_INJECT_DYE = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform float uDyeGain;
uniform float uDyeFadeHz;
uniform float uDt;
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform float uEdgeMargin;
uniform int   uDyeBlend;        // 0 add, 1 screen, 2 max, 3 over (alpha)
uniform int   uDyeDecayMode;    // 0 linear, 1 perceptual (OKLab L-decay), 2 vivid (chroma-boost)
uniform float uDyeChromaFadeHz; // per-second chroma decay rate (perceptual / vivid only)
uniform float uDyeSatBoost;     // per-frame chroma multiplier applied after decay
${GRADIENT_SAMPLE_GLSL}
${OKLAB_GLSL}

/** Apply this frame's dissipation to existing dye. Lightness and chroma decay
 *  on independent schedules, then chroma is scaled by uDyeSatBoost. In "vivid"
 *  mode chroma also gets an inverse-lightness boost so colours stay punchy as
 *  they dim. */
vec3 decayDye(vec3 c) {
  float decayL = exp(-uDyeFadeHz * uDt);
  if (uDyeDecayMode == 0) return c * decayL;
  vec3 lab = rgbToOklab(c);
  float decayC = exp(-uDyeChromaFadeHz * uDt);
  lab.x *= decayL;
  lab.yz *= decayC * uDyeSatBoost;
  if (uDyeDecayMode == 2) {
    lab.yz *= clamp(1.0 / max(decayL, 0.01), 1.0, 2.0);
  }
  return max(oklabToRgb(lab), 0.0);
}

void main() {
  vec4 d = texture(uDye, vUv);
  vec4 j = texture(uJulia, vUv);
  vec4 a = texture(uJuliaAux, vUv);
  vec4 grad = gradientForJuliaRgba(j, a);        // RGBA — α is the per-stop alpha from the editor
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);

  // Base amount of colour to introduce this frame at this pixel.
  // j.a gates on "escaped", grad.a gates on gradient-stop alpha, edgeFade/etc on borders.
  float rate = j.a * uDyeGain * uDt * edgeFade * grad.a;
  vec3 injectAdd = grad.rgb * rate;
  vec3 aged      = decayDye(d.rgb);           // dye after this frame's dissipation, in chosen colour space
  vec3 col;

  if (uDyeBlend == 0) {
    // Add: classic accumulation. Simple, bright, can clip to 1.0 at heavy injection.
    col = aged + injectAdd;
  } else if (uDyeBlend == 1) {
    // Screen: 1 − (1−d)(1−i). Overlaps glow; never exceeds 1.0 mathematically.
    vec3 i = clamp(injectAdd, 0.0, 1.0);
    col = 1.0 - (1.0 - aged) * (1.0 - i);
  } else if (uDyeBlend == 2) {
    // Max: hold the brightest. Good for preserving vivid strokes over faded ones.
    col = max(aged, injectAdd);
  } else {
    // Over (alpha-compositing): uses grad.α + rate to mask the new colour onto old.
    float a = clamp(rate * 8.0, 0.0, 1.0);   // scale so "rate" reads like a visible alpha
    col = aged * (1.0 - a) + grad.rgb * a;
  }

  // Solid obstacles: no dye inside — they're walls, not flowing medium.
  float solid = texture(uMask, vUv).r;
  col *= (1.0 - solid);

  fragColor = vec4(col, 1.0);
}`;

// -----------------------------------------------------------------------------
// Semi-Lagrangian advection (works for both velocity and dye).
// -----------------------------------------------------------------------------
export const FRAG_ADVECT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;      // field to advect (could be velocity itself)
uniform sampler2D uMask;        // collision mask; 1 = solid wall
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;     // per-second decay
uniform float uEdgeMargin;      // soft no-slip wall — only applies in the outer half of this margin
void main() {
  vec2 v = texture(uVelocity, vUv).rg;
  vec2 prev = vUv - v * uDt * uTexel;   // backtrace in UV-space
  vec4 val = texture(uSource, prev);
  float decay = 1.0 / (1.0 + uDissipation * uDt);
  // Soft no-slip at the canvas border (last ~half of the edge margin).
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin * 0.5, dEdge);
  // Solid obstacles: fluid goes to zero inside them so nothing advects through.
  float solid = texture(uMask, vUv).r;
  fragColor = val * decay * edgeFade * (1.0 - solid);
}`;

// -----------------------------------------------------------------------------
// Divergence: div(v) = (v.r.x - v.l.x + v.t.y - v.b.y) * 0.5
// -----------------------------------------------------------------------------
export const FRAG_DIVERGENCE = /* glsl */ `#version 300 es
precision highp float;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).r;
  float R = texture(uVelocity, vR).r;
  float T = texture(uVelocity, vT).g;
  float B = texture(uVelocity, vB).g;
  float div = 0.5 * ((R - L) + (T - B));
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

// -----------------------------------------------------------------------------
// Curl (z-component of 2D curl): (v.r.y - v.l.y) - (v.t.x - v.b.x), scaled
// -----------------------------------------------------------------------------
export const FRAG_CURL = /* glsl */ `#version 300 es
precision highp float;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).g;
  float R = texture(uVelocity, vR).g;
  float T = texture(uVelocity, vT).r;
  float B = texture(uVelocity, vB).r;
  float curl = 0.5 * ((R - L) - (T - B));
  fragColor = vec4(curl, 0.0, 0.0, 1.0);
}`;

// -----------------------------------------------------------------------------
// Vorticity confinement: adds a force that amplifies existing curl.
// Good for keeping swirly details from being dissipated.
// -----------------------------------------------------------------------------
export const FRAG_VORTICITY = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2  uTexel;
uniform float uStrength;
uniform float uScale;      // stencil width in texels — wider = larger organised vortices
uniform float uDt;
void main() {
  // Compute the curl-magnitude gradient with a variable-width stencil. The vertex-
  // shader's 1-texel neighbours aren't used here because we want uScale control.
  vec2 t = uTexel * max(uScale, 1.0);
  float L = texture(uCurl, vUv - vec2(t.x, 0.0)).r;
  float R = texture(uCurl, vUv + vec2(t.x, 0.0)).r;
  float T = texture(uCurl, vUv + vec2(0.0, t.y)).r;
  float B = texture(uCurl, vUv - vec2(0.0, t.y)).r;
  float C = texture(uCurl, vUv).r;
  vec2 eta = vec2(abs(T) - abs(B), abs(R) - abs(L));
  float mag = length(eta) + 1e-5;
  eta /= mag;
  eta.y = -eta.y;
  vec2 force = eta * C * uStrength;
  vec2 v = texture(uVelocity, vUv).rg;
  fragColor = vec4(v + force * uDt, 0.0, 1.0);
}`;

// -----------------------------------------------------------------------------
// Jacobi iteration for pressure Poisson: 4p = p_l + p_r + p_t + p_b - div
// -----------------------------------------------------------------------------
export const FRAG_PRESSURE = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).r;
  float R = texture(uPressure, vR).r;
  float T = texture(uPressure, vT).r;
  float B = texture(uPressure, vB).r;
  float div = texture(uDivergence, vUv).r;
  float p = (L + R + T + B - div) * 0.25;
  fragColor = vec4(p, 0.0, 0.0, 1.0);
}`;

// -----------------------------------------------------------------------------
// Subtract pressure gradient from velocity → divergence-free.
// -----------------------------------------------------------------------------
export const FRAG_GRADSUB = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform sampler2D uMask;
void main() {
  float L = texture(uPressure, vL).r;
  float R = texture(uPressure, vR).r;
  float T = texture(uPressure, vT).r;
  float B = texture(uPressure, vB).r;
  vec2 v = texture(uVelocity, vUv).rg;
  v -= vec2(R - L, T - B) * 0.5;
  float solid = texture(uMask, vUv).r;
  fragColor = vec4(v * (1.0 - solid), 0.0, 1.0);
}`;

// -----------------------------------------------------------------------------
// Splat: additive injection at (uPoint) of (uValue).rgb with a hardness-
// blended gaussian → hard-disc profile. Used for mouse-forces (velocity),
// mouse-dye (dye buffer), and the artist brush via FluidEngine.brush().
// -----------------------------------------------------------------------------
/** Splat with controllable softness/hardness.
 *  - uHardness=0  → pure gaussian (soft airbrush fringe).
 *  - uHardness=1  → hard disc, smoothstep antialias at the rim.
 *  - in-between   → linear blend of the two profiles.
 *  - uOp controls what happens to the target:  0 add  |  1 subtract (eraser). */
export const FRAG_SPLAT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform vec2  uPoint;
uniform vec3  uValue;
uniform float uRadius;     // soft-mode gaussian sigma² (smaller = tighter)
uniform float uDiscR;      // hard-mode disc radius in UV (x-aspect-corrected)
uniform float uHardness;   // 0..1 blend between soft / hard profile
uniform float uAspect;
uniform float uOp;         // 0 add, 1 subtract
void main() {
  vec2 d = vUv - uPoint;
  d.x *= uAspect;
  float r2 = dot(d, d);
  float soft = exp(-r2 / uRadius);
  float hard = 1.0 - smoothstep(uDiscR * 0.9, uDiscR, sqrt(r2));
  float w = mix(soft, hard, uHardness);
  vec4 base = texture(uTarget, vUv);
  vec3 delta = uValue * w;
  vec3 next = base.rgb + mix(delta, -delta, uOp);
  // Clamp to ≥0 ONLY for the eraser op. Velocity splats carry signed deltas —
  // clamping them would wipe out negative components under the brush radius,
  // which visually looks like flow reversing wherever the brush touches.
  base.rgb = (uOp > 0.5) ? max(next, 0.0) : next;
  fragColor = base;
}`;

// -----------------------------------------------------------------------------
// Display composite: Julia color + dye + optional velocity visualization.
// -----------------------------------------------------------------------------
export const FRAG_DISPLAY = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform sampler2D uGradient;
uniform sampler2D uMask;
uniform sampler2D uBloom;      // pre-computed bloom texture (black if bloom disabled)
uniform vec2  uTexelDisplay;   // 1/width, 1/height of the DISPLAY canvas
uniform vec2  uTexelDye;       // 1/width, 1/height of the dye (sim) grid
uniform int   uShowMode;       // 0 composite, 1 julia-only, 2 dye-only, 3 velocity-only
uniform float uJuliaMix;
uniform float uDyeMix;
uniform float uVelocityViz;
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform vec3  uInteriorColor;

// Post-processing knobs
uniform int   uToneMapping;    // 0 none, 1 reinhard, 2 agx, 3 filmic
uniform float uExposure;
uniform float uVibrance;       // 0..1
uniform float uBloomAmount;    // 0..3
uniform float uAberration;     // 0..1 — velocity-keyed RGB shift
uniform float uRefraction;     // 0..0.3 — dye-gradient UV offset for the fractal
uniform float uRefractSmooth;  // stencil width (in dye texels) — smooths the gradient
uniform float uRefractRoughness; // 0..1 — frosted-glass effect: scatters the
                                 // refracted sample across a Vogel-disc kernel.
                                 // 0 = single-tap (crisp). 1 = ~5px blur radius.
uniform float uCaustics;       // 0..25 — laplacian-of-dye highlight
uniform int   uCollisionPreview; // 1 = overlay the mask with diagonal hatching so walls are visible
${GRADIENT_SAMPLE_GLSL}

const vec3 LUM_REC601 = vec3(0.299, 0.587, 0.114);   // used for dye luminance + vibrance
const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

vec3 velocityToColor(vec2 v) {
  float ang = atan(v.y, v.x);
  float mag = clamp(length(v) * 0.5, 0.0, 1.0);
  float hue = (ang + PI) / TAU;
  vec3 c = abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0;
  return clamp(c, 0.0, 1.0) * mag;
}

// ── Tone-mapping family. ────────────────────────────────────────────────────
// Reinhard: c/(1+c). Smooth but desaturates highlights.
// AgX: Sobotka's log/sigmoid in a rotated basis. Hue-stable, vibrant.
// Filmic: Hable's Uncharted 2 filmic — cinematic s-curve.
vec3 tmReinhard(vec3 c) { return c / (1.0 + c); }

vec3 tmAgX(vec3 c) {
  const mat3 M = mat3(
    0.842, 0.078, 0.088,
    0.042, 0.878, 0.088,
    0.042, 0.078, 0.880
  );
  c = M * c;
  c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
  vec3 x2 = c * c;
  vec3 x4 = x2 * x2;
  return 15.5*x4*x2 - 40.14*x4*c + 31.96*x4 - 6.868*x2*c + 0.4298*x2 + 0.1191*c - 0.00232;
}

vec3 tmFilmic(vec3 c) {
  // Hable / Uncharted 2: F(x) = ((x(Ax+CB)+DE)/(x(Ax+B)+DF)) - E/F
  const float A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30;
  vec3 num = c * (A*c + C*B) + D*E;
  vec3 den = c * (A*c + B)   + D*F;
  return num/den - E/F;
}

vec3 applyToneMapping(vec3 c) {
  if (uToneMapping == 0) return c;
  if (uToneMapping == 1) return tmReinhard(c);
  if (uToneMapping == 2) return tmAgX(c);
  return tmFilmic(c) / tmFilmic(vec3(11.2));   // Filmic wants a fixed white-point divide
}

// Vibrance: chroma-aware saturation. Pushes low-saturation pixels without
// posterising already-vivid ones.
vec3 applyVibrance(vec3 c, float amount) {
  if (amount <= 0.0) return c;
  float mx = max(max(c.r, c.g), c.b);
  float mn = min(min(c.r, c.g), c.b);
  float sat = mx - mn;
  vec3 gray = vec3(dot(c, LUM_REC601));
  return mix(gray, c, 1.0 + amount * (1.0 - sat));
}

void main() {
  vec2 uv = vUv;

  // ── Liquid-look refraction. The gradient of dye luminance acts as a
  // fake height-field slope; we offset the fractal sample by that
  // gradient. Use a Sobel 3×3 — mathematically a Gaussian (1,2,1)
  // blur composed with a central difference, so it actually SMOOTHS
  // the gradient instead of just spreading two taps further apart.
  // uRefractSmooth controls the stencil width (in dye texels);
  // larger values give a lower-frequency, calmer slope.
  vec2 refractOffset = vec2(0.0);
  float caustic = 0.0;
  if (uRefraction > 0.0 || uCaustics > 0.0) {
    vec2 t = uTexelDye * max(uRefractSmooth, 1.0);
    float lTL = dot(texture(uDye, vUv + vec2(-t.x, -t.y)).rgb, LUM_REC601);
    float lT  = dot(texture(uDye, vUv + vec2( 0.0, -t.y)).rgb, LUM_REC601);
    float lTR = dot(texture(uDye, vUv + vec2( t.x, -t.y)).rgb, LUM_REC601);
    float lL  = dot(texture(uDye, vUv + vec2(-t.x,  0.0)).rgb, LUM_REC601);
    float lC  = dot(texture(uDye, vUv                  ).rgb, LUM_REC601);
    float lR  = dot(texture(uDye, vUv + vec2( t.x,  0.0)).rgb, LUM_REC601);
    float lBL = dot(texture(uDye, vUv + vec2(-t.x,  t.y)).rgb, LUM_REC601);
    float lB  = dot(texture(uDye, vUv + vec2( 0.0,  t.y)).rgb, LUM_REC601);
    float lBR = dot(texture(uDye, vUv + vec2( t.x,  t.y)).rgb, LUM_REC601);
    // Sobel — divide by 8 (sum of positive weights on one side) to
    // normalise. y-axis: vUv.y grows downward in this texture, so
    // "up" in screen space is -t.y; keep the original sign convention
    // that bright dye refracts the fractal toward the light.
    float gx = (lTR + 2.0 * lR + lBR) - (lTL + 2.0 * lL + lBL);
    float gy = (lBL + 2.0 * lB + lBR) - (lTL + 2.0 * lT + lTR);
    refractOffset = vec2(gx, gy) * (uRefraction * 0.125);
    // 9-point Laplacian — better isotropy than the 5-point version
    // (no preferential x/y axis bias). Divide by smoothness so the
    // caustic magnitude stays roughly invariant as the stencil grows.
    float neigh = lTL + lT + lTR + lL + lR + lBL + lB + lBR;
    caustic = max(0.0, neigh - 8.0 * lC) / (8.0 * max(uRefractSmooth, 1.0));
  }

  // ── Refracted fractal sample. With uRefractRoughness > 0 we
  // scatter the sample across an 8-tap Vogel-disc kernel (golden-
  // angle spiral — even disc coverage at small N, no clumping).
  // Each tap is gradient-mapped INDIVIDUALLY before averaging,
  // because averaging raw j/aux at the fractal boundary gives
  // meaningless intermediate iterations (same reasoning as the
  // K-sample loop in the Julia shader). Per-tap colours blend
  // cleanly. The mask (wall solid) also reads the same kernel so
  // walls get the same frosted-glass blur, keeping their edges
  // consistent with the refracted fractal behind them. Dye and
  // velocity stay sharp — they're "near-surface" and shouldn't
  // pick up glass-roughness blur.
  vec2 refractedBase = uv + refractOffset;
  vec3 juliaColor;
  vec3 wallColor;        // gradient colour at refracted UV — used for solid-wall override below
  float solid;
  {
    vec4 j = texture(uJulia, refractedBase);
    vec4 aux = texture(uJuliaAux, refractedBase);
    vec3 grad = gradientForJulia(j, aux);
    juliaColor = mix(uInteriorColor, grad * j.a, j.a);
    wallColor = grad;
    solid = texture(uMask, refractedBase).r;
    if (uRefractRoughness > 0.0) {
      const float GOLDEN_ANGLE = 2.39996323;
      const int VOGEL_N = 8;
      // 0..1 roughness → 0..5 px disc radius (in dye-grid texels).
      vec2 radius = uTexelDye * (uRefractRoughness * 5.0);
      vec3 cAcc = juliaColor;
      vec3 wAcc = wallColor;
      float sAcc = solid;
      for (int i = 0; i < VOGEL_N; ++i) {
        float r = sqrt((float(i) + 0.5) / float(VOGEL_N));
        float theta = float(i) * GOLDEN_ANGLE;
        vec2 ofs = r * vec2(cos(theta), sin(theta)) * radius;
        vec4 j_t = texture(uJulia, refractedBase + ofs);
        vec4 a_t = texture(uJuliaAux, refractedBase + ofs);
        vec3 grad_t = gradientForJulia(j_t, a_t);
        cAcc += mix(uInteriorColor, grad_t * j_t.a, j_t.a);
        wAcc += grad_t;
        sAcc += texture(uMask, refractedBase + ofs).r;
      }
      float invN = 1.0 / float(VOGEL_N + 1);  // +1 for the original centre tap
      juliaColor = cAcc * invN;
      wallColor = wAcc * invN;
      solid = sAcc * invN;
    }
  }

  vec3 dye = texture(uDye, uv).rgb;
  vec2 v = texture(uVelocity, uv).rg;

  // ── Chromatic aberration (electric look).
  // Applied to DYE ONLY — shifting the fractal itself caused distracting
  // double-vision. Magnitude is bounded (clamped) and direction is the
  // normalised local velocity, so fast regions get a clean plasma fringe
  // without the fractal fracturing. Kicks in only where the fluid is moving.
  if (uAberration > 0.0 && uShowMode == 0) {
    float vMag = length(v);
    if (vMag > 1e-4) {
      vec2 vn = v / vMag;
      float amt = clamp(vMag * 0.04, 0.0, 1.0) * uAberration * 0.006;
      vec2 off = vn * amt;
      dye.r = texture(uDye, uv + off).r;
      dye.b = texture(uDye, uv - off).b;
    }
  }

  vec3 col;
  if (uShowMode == 1) col = juliaColor;
  else if (uShowMode == 2) col = dye;
  else if (uShowMode == 3) col = velocityToColor(v);
  else {
    col = juliaColor * uJuliaMix + dye * uDyeMix;
    col += velocityToColor(v) * uVelocityViz * 0.5;
  }

  // Caustics: additive highlight on focused-surface regions.
  col += vec3(caustic) * uCaustics;

  // Solid obstacles: override the composite with the raw (untoned)
  // gradient colour so walls read as crisp objects, not as "dyed
  // fluid near a wall." solid and wallColor were sampled above
  // through the same Vogel-disc kernel as the fractal so the wall
  // edges blur in step with the refracted fractal behind them.
  if (solid > 0.01) {
    col = mix(col, wallColor, solid);
  }

  // Collision preview: diagonal cyan hatching over solid cells. Uses screen
  // pixels (not UV) so stripes stay a constant width at any zoom level.
  if (uCollisionPreview == 1 && solid > 0.01) {
    vec2 screenPx = vUv / uTexelDisplay;
    float hatch = step(4.0, mod(screenPx.x + screenPx.y, 8.0));
    vec3 preview = mix(vec3(0.0, 0.95, 1.0), vec3(0.0, 0.25, 0.35), hatch);
    col = mix(col, preview, solid * 0.55);
  }

  // Bloom: an HDR pre-blurred energy texture we add on top.
  if (uBloomAmount > 0.0) {
    col += texture(uBloom, vUv).rgb * uBloomAmount;
  }

  // Exposure → tone map → vibrance → gamma.
  col *= uExposure;
  col = applyToneMapping(col);
  col = applyVibrance(col, uVibrance);
  col = pow(max(col, 0.0), vec3(1.0/2.2));
  fragColor = vec4(col, 1.0);
}`;

// -----------------------------------------------------------------------------
// Collision mask. For each sim cell, compute the color-mapping's t (same code
// path used for rendering), sample the gradient, and decide: is this pixel
// bright enough to be treated as a SOLID wall? Output 1.0 = solid, 0.0 = fluid.
// Downstream advection, addForce, and grad-subtract passes zero their fields
// inside solid cells, which causes fluid to bounce / divert around walls.
// -----------------------------------------------------------------------------
export const FRAG_MASK = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;            // main gradient (needed for helper symbol linkage)
uniform sampler2D uCollisionGradient;   // user-authored B&W LUT: black = fluid, white = wall
uniform int   uColorMapping;
// Main-gradient repeat/phase are also uniforms of this program because
// the shared GRADIENT_SAMPLE_GLSL helper references them — they're
// kept in sync with the dye panel so colorMappingT() stays canonical.
uniform float uGradientRepeat;
uniform float uGradientPhase;
// Collision-specific repeat/phase — independent of the dye gradient.
// User can tile the wall pattern at a different density from the dye
// palette, or phase-shift it to place walls where the dye doesn't go.
uniform float uCollisionRepeat;
uniform float uCollisionPhase;
${GRADIENT_SAMPLE_GLSL}
void main() {
  vec4 j = texture(uJulia, vUv);
  vec4 a = texture(uJuliaAux, vUv);
  // Same mapping → t pipeline the main gradient uses, so walls track colour-mapping
  // changes exactly (angle / orbit trap / stripe / bands / whatever). Then the
  // collision knobs remap t before the LUT lookup so walls can have their own tiling.
  float t0 = colorMappingT(j, a);
  float t = fract(t0 * uCollisionRepeat + uCollisionPhase);
  vec4 m = texture(uCollisionGradient, vec2(t, 0.5));
  float mask = dot(m.rgb, vec3(0.299, 0.587, 0.114));  // b&w → luma; also works if user uses colour
  // Interior points aren't walls (no escape → no fluid-side colour to collide with).
  mask *= j.a;
  fragColor = vec4(clamp(mask, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

// -----------------------------------------------------------------------------
// Simple clear (for reset).
// -----------------------------------------------------------------------------
export const FRAG_CLEAR = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`;

// -----------------------------------------------------------------------------
// Bloom chain — Jimenez dual-filter style.
//   1) extract: luminance > threshold, soft knee → half-res source
//   2) downsample 2×: 9-tap tent/box filter (cheap & bright)
//   3) upsample 2×: 9-tap tent, additive blend
// Three levels (½ → ¼ → ⅛ and back) give a wide, soft glow without banding.
// -----------------------------------------------------------------------------
export const FRAG_BLOOM_EXTRACT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform float uThreshold;
uniform float uSoftKnee;
void main() {
  vec3 c = texture(uSource, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Soft-knee: smooth ramp between (threshold - softKnee) and threshold.
  float lo = uThreshold - uSoftKnee;
  float t = smoothstep(lo, uThreshold, luma);
  fragColor = vec4(c * t, 1.0);
}`;

export const FRAG_BLOOM_DOWN = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2 uTexel;   // 1/width, 1/height of the SOURCE
void main() {
  vec2 px = uTexel;
  vec3 c =
      texture(uSource, vUv).rgb * 0.5
    + texture(uSource, vUv + vec2(-px.x, -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x, -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2(-px.x,  px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x,  px.y)).rgb * 0.125;
  fragColor = vec4(c, 1.0);
}`;

export const FRAG_BLOOM_UP = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;   // coarser mip being upsampled
uniform sampler2D uPrev;     // this-level's existing texture (we add onto it)
uniform vec2 uTexel;         // 1/size of SOURCE (the coarser texture)
uniform float uIntensity;    // per-upsample scale
void main() {
  vec2 px = uTexel;
  // 3x3 tent filter on the coarse mip
  vec3 s =
      texture(uSource, vUv + vec2(-px.x, -px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2( 0.0,  -px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x, -px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2(-px.x,  0.0 )).rgb * 0.125
    + texture(uSource, vUv).rgb                     * 0.25
    + texture(uSource, vUv + vec2( px.x,  0.0 )).rgb * 0.125
    + texture(uSource, vUv + vec2(-px.x,  px.y)).rgb * 0.0625
    + texture(uSource, vUv + vec2( 0.0,   px.y)).rgb * 0.125
    + texture(uSource, vUv + vec2( px.x,  px.y)).rgb * 0.0625;
  vec3 base = texture(uPrev, vUv).rgb;
  fragColor = vec4(base + s * uIntensity, 1.0);
}`;

// -----------------------------------------------------------------------------
// Camera-locked dye. When the user pans or zooms, the fractal shifts under the
// screen but the dye stays in sim-grid space — it looks detached. This pass
// resamples dye (or velocity) from the *previous* camera into the *new* camera
// so world-space positions stay constant. Dye rides the fractal.
//
// For each pixel under the new camera, compute its world position, then look up
// where THAT world position was in the old camera's UV, and sample there.
// -----------------------------------------------------------------------------
export const FRAG_REPROJECT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2  uNewCenter;
uniform vec2  uOldCenter;
uniform float uNewZoom;
uniform float uOldZoom;
uniform float uAspect;
void main() {
  // UV → world (new camera)
  vec2 pix = vec2((vUv.x * 2.0 - 1.0) * uAspect, vUv.y * 2.0 - 1.0);
  vec2 worldPos = uNewCenter + pix * uNewZoom;
  // World → UV (old camera)
  vec2 oldPix = (worldPos - uOldCenter) / uOldZoom;
  vec2 oldUv = vec2(oldPix.x / uAspect * 0.5 + 0.5, oldPix.y * 0.5 + 0.5);
  // If outside [0,1], fade to zero instead of clamping to the edge sample — that
  // avoids streaks of stale dye being stamped into the newly-exposed area.
  vec2 inside = step(vec2(0.0), oldUv) * step(oldUv, vec2(1.0));
  float inside01 = inside.x * inside.y;
  fragColor = texture(uSource, oldUv) * inside01;
}`;

// -----------------------------------------------------------------------------
// TSAA BLEND — progressive accumulator for the Julia MRT output.
// Reads the current jittered Julia frame (main + aux) and the TSAA history
// (main + aux), outputs the running average as new history. `uSampleIndex`
// is the 1-based count since the last reset (frame 1 → history overwritten,
// frame 2 → mix 50/50, etc). FluidEngine resets the index on param changes.
// -----------------------------------------------------------------------------
export const FRAG_TSAA_BLEND = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;

uniform sampler2D uCurrentMain;
uniform sampler2D uCurrentAux;
uniform sampler2D uHistoryMain;
uniform sampler2D uHistoryAux;
uniform int uSampleIndex;

void main() {
    vec4 curMain = texture(uCurrentMain, vUv);
    vec4 curAux  = texture(uCurrentAux,  vUv);
    // Frame-1 safety: when uSampleIndex is 1 the history texture hasn't
    // been written yet (MRT FBOs allocate with undefined contents in
    // WebGL2 — some drivers return NaN for RGBA16F). Skip the history
    // read entirely and just pass the current sample through.
    if (uSampleIndex <= 1) {
        outMain = curMain;
        outAux  = curAux;
        return;
    }
    vec4 histMain = texture(uHistoryMain, vUv);
    vec4 histAux  = texture(uHistoryAux,  vUv);
    float w = 1.0 / float(uSampleIndex);
    outMain = mix(histMain, curMain, w);
    outAux  = mix(histAux,  curAux,  w);
}`;
