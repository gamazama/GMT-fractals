var I=Object.defineProperty;var D=(a,t,i)=>t in a?I(a,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):a[t]=i;var s=(a,t,i)=>D(a,typeof t!="symbol"?t+"":t,i);const K=256;class J{constructor(t){s(this,"mainTex",null);s(this,"collisionTex",null);s(this,"version",0);this.gl=t}getTexture(t){return t==="main"?this.mainTex:this.collisionTex}setBuffer(t,i){const e=this.gl,r=256*4;i.length!==r&&console.warn(`[GradientLut] ${t} buffer length ${i.length} (want ${r})`);let o=this.getTexture(t);o||(o=e.createTexture(),t==="main"?this.mainTex=o:this.collisionTex=o),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,256,1,0,e.RGBA,e.UNSIGNED_BYTE,i),this.version++}ensure(t){if(this.getTexture(t))return;const i=256,e=new Uint8Array(i*4);if(t==="main")for(let r=0;r<i;++r)e[r*4+0]=r,e[r*4+1]=r,e[r*4+2]=r,e[r*4+3]=255;else for(let r=0;r<i;++r)e[r*4+3]=255;this.setBuffer(t,e)}dispose(){const t=this.gl;this.mainTex&&(t.deleteTexture(this.mainTex),this.mainTex=null),this.collisionTex&&(t.deleteTexture(this.collisionTex),this.collisionTex=null)}}const A=(a,t)=>{const i=a+t,e=i-a,r=a-(i-e)+(t-e);return[i,r]},q=(a,t,i)=>{const[e,r]=A(a,i),[o,n]=A(e,t+r);return[o,n]},z=(a,t,i,e)=>{const[r,o]=A(a,-i),[n,l]=A(r,o+(t-e));return[n,l]},V=`
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
`,O=`
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
`,Y=`#version 300 es
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
}`,_=`
// Uniforms are auto-generated by Schema

// R2 Quasi-Random Sequence (Martin Roberts, 2018)
// Uses the plastic constant for optimal 2D coverage — no directional bias.
// PHI_2D ≈ 1.32472 is the unique real root of x³ = x + 1.
const float R2_A1 = 0.7548776662466927;  // 1/PHI_2D
const float R2_A2 = 0.5698402909980532;  // 1/PHI_2D²

vec4 getBlueNoise4(vec2 screenCoord) {
    vec2 res = max(uBlueNoiseResolution, vec2(64.0));

    // 1. R2 Temporal Offset — shifts texture uniformly in 2D each frame
    float time = float(uFrameCount);
    vec2 temporalOffset = vec2(
        fract(time * R2_A1),
        fract(time * R2_A2)
    );

    // 2. Spatial Lookup with Temporal Offset
    vec2 uv = mod(screenCoord + temporalOffset * res, res) / res;

    // 3. Fetch RGBA Blue Noise (each channel independently distributed)
    vec4 blue = textureLod(uBlueNoiseTexture, uv, 0.0);

    // 4. Channel-Wise Temporal Animation for accumulation convergence
    float frameOffset  = time * R2_A1;
    float frameOffsetG = time * R2_A2;
    float frameOffsetB = time * (R2_A1 + R2_A2);
    float frameOffsetA = time * (R2_A1 * R2_A2);

    return vec4(
        fract(blue.r + frameOffset),
        fract(blue.g + frameOffsetG),
        fract(blue.b + frameOffsetB),
        fract(blue.a + frameOffsetA)
    );
}

float getBlueNoise(vec2 screenCoord) {
    return getBlueNoise4(screenCoord).r;
}

// Stable blue noise for DOF - does not animate with frame count
// This prevents screen shake during navigation while still providing good distribution
vec4 getStableBlueNoise4(vec2 screenCoord) {
    vec2 res = max(uBlueNoiseResolution, vec2(64.0));
    vec2 uv = mod(screenCoord, res) / res;
    return textureLod(uBlueNoiseTexture, uv, 0.0);
}
`,P=`
// Sub-pixel jitter for progressive AA. Returns offset in pixel fractions,
// centered in [-0.5, 0.5]. Blue-noise distribution converges evenly over
// ~16 frames — smoother than uniform random, cheaper than Halton.
vec2 tsaaJitter(vec2 screenCoord) {
    vec4 bn = getBlueNoise4(screenCoord);
    return bn.xy - 0.5;
}

// Progressive accumulation. \`n\` is the current sample count starting at
// 1 on the first frame after a reset; on frame N, the new sample is
// weighted 1/N and the history is weighted (N-1)/N. Converges to a true
// average of the N jittered samples.
vec4 tsaaAccumulate(vec4 history, vec4 current, int n) {
    float w = 1.0 / float(max(n, 1));
    return mix(history, current, w);
}
`,$=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outFx;

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
// Accumulator-need flags driven by colorMapping. When 0, the shader
// skips the per-iter trap/stripe block (atan + sin + trapDistance) or
// the per-iter dz/dc tracker — those stats are stored in outAux
// channels that the active palette doesn't read, so computing them is
// wasted work. Modes that need them: trap/stripe → modes 5-9, 13;
// derivative → modes 10, 11. FluidEngine sets these.
uniform int   uTrackAccum;    // 1 when trap/stripe accumulators feed the palette
uniform int   uTrackDeriv;    // 1 when dz/dc derivative feeds the palette

// ── Per-evaluation palette + mask baking ─────────────────────────────────────
// The Julia pass bakes BOTH the palette gradient lookup AND the collision
// mask LUT lookup INSIDE evalJulia (per-jitter). Mean-pooling colours and
// mask scalars across jittered evaluations is mathematically clean (vs.
// mean-pooling raw iter state, which mixes meaningless "intermediate
// iteration" values at the set boundary). The mask uses its own LUT and
// repeat/phase so users can tile walls independently of the dye palette.
// Interior pixels never count as walls (mask = 0 there).
uniform sampler2D uGradient;
uniform int       uColorMapping;
uniform float     uGradientRepeat;
uniform float     uGradientPhase;
uniform vec3      uInteriorColor;
// Colour-normalization regime (see gradientSample.ts colorMappingT):
//   0 = v1 legacy magic constants (current look, byte-identical)
//   1 = v2 depth-decoupled fields (Density ≈ 1 sane at any zoom)
uniform int       uColorNormV2;
// ln(world-units per pixel) = ln(uScale / uResolution.y). Passed as a LOG because
// the linear pixel spacing underflows f32 at deep zoom (uScale does too — that's why
// the deep path carries uDeepScale as HDR). Drives the in-pixels Distance Estimate.
uniform float     uLogPixelScale;
// Iterations-mode (mode 0) v2 controls: uIterRate = gamma on log-iteration (low-vs-high
// emphasis); uIterOffset/uIterScale = on-demand "Fit to view" re-anchor of the visible
// iteration range onto the gradient (identity 0 / 1 = colours hold across zoom).
uniform float     uIterRate;
uniform float     uIterOffset;
uniform float     uIterScale;
// Distance-Estimate (mode 10) v2: 0 = linear edge/glow, 1 = log contour rings (even at any zoom).
uniform int       uDeLogBands;
// Slope-lighting composite layer (multiplies the baked colour of ANY mode). Driven by the
// analytic escape-gradient normal u = z/dz. Off (uLightEnabled 0) leaves colour untouched.
uniform int       uLightEnabled;
uniform float     uLightAngle;     // azimuth (radians)
uniform float     uLightHeight;    // elevation factor (~0.5..3; higher = flatter)
uniform float     uLightStrength;  // 0 = flat, 1 = fully lit (mix flat↔lit)
uniform float     uAmbient;        // shadow floor so lit areas never go pure black
uniform sampler2D uCollisionGradient;
uniform float     uCollisionRepeat;
uniform float     uCollisionPhase;
// Collision can be turned off entirely; when 0, mask stays at 0 and
// the fluid pipeline reads a clean "no walls" channel without us
// needing per-shader branches in the consumers.
uniform int       uCollisionEnabled;

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

// ── Bucket render (tiled high-resolution export) ─────────────────────────────
// Defaults are no-ops for the live viewport. When BucketRunner drives a tiled
// export, FluidEngine sets these so the fragment shader maps its UV into the
// correct slice of the full output image, and skips writes outside the current
// GPU bucket so the TSAA accumulator preserves its previous (or freshly reset)
// value for those pixels. See plans/bucket-render-port-handoff.md.
uniform vec2  uImageTileOrigin;   // UV origin of this image tile in full-output (default 0,0)
uniform vec2  uImageTileSize;     // UV size of this image tile in full-output  (default 1,1)
uniform vec2  uRegionMin;         // GPU bucket UV min in tile-local space      (default 0,0)
uniform vec2  uRegionMax;         // GPU bucket UV max in tile-local space      (default 1,1)

// ── Deep-zoom (perturbation) ─────────────────────────────────────────────────
// Phase 3: per-pixel iteration runs against a CPU-built reference orbit
// stored in uRefOrbit (RGBA32F, 2D). When uDeepZoomEnabled == 0 the
// deep path is skipped entirely (zero cost on the standard branch).
//
// Activation gate (any failed condition keeps the standard path):
//   uDeepZoomEnabled == 1 && uKind == 1 (Mandelbrot) && uPower == 2
//
// Reference orbit texture layout:
//   width  = uRefOrbitTexW (chosen by FluidEngine, typically 2048)
//   height = ceil(uRefOrbitLen / uRefOrbitTexW)
//   channels per texel = [Z.re, Z.im, |Z|², 0]
//   index conversion: ivec2(ref % uRefOrbitTexW, ref / uRefOrbitTexW)
uniform int   uDeepZoomEnabled;
uniform sampler2D uRefOrbit;
uniform int   uRefOrbitTexW;
uniform int   uRefOrbitLen;
// Minibrot-nucleus period. > 0 means the reference orbit is exactly ONE period
// (orbit[period] == orbit[0] == 0), so the per-iteration / LA reference index
// wraps EXACTLY via ref %= period instead of the approximate rebase-past-a-
// non-periodic-end. 0 keeps the non-periodic fallback (and fluid-toy, which
// never sets it). @see docs/adr/0066
uniform int   uRefPeriod;
// Engine center − orbit reference center. Tracks pan/zoom gestures
// that move uCenter without rebuilding the orbit (the store commits
// only at gesture end). HDR-packed (vec4: mant.re, exp.re, mant.im,
// exp.im) so sub-1e-38 offsets survive the JS→GLSL boundary at deep
// zoom. Within the orbit's validity radius this keeps the deep path
// aligned with the standard path; past it the linearised perturbation
// degrades — phase 5 adds analytic radius tracking.
uniform vec4  uDeepCenterOffset;
// Zoom packed as HDR (vec2: mantissa, exp). uScale (f32) underflows
// past zoom ~1e-38; this carries the exponent through to the shader
// for the deep path. Standard path keeps using uScale.
uniform vec2  uDeepScale;

// ── Linear Approximation (LA) table ──────────────────────────────────────────
// Per LA node: 3 RGBA32F texels, packed by laTextures.ts:
//   texel 0: [Ref.re, Ref.im, ZCoeff.re, ZCoeff.im]
//   texel 1: [CCoeff.re, CCoeff.im, LAThreshold, LAThresholdC]
//   texel 2: [StepLength, NextStageLAIndex, _, _]
// Stages: vec2(laIndex, macroItCount) per stage; phase 6 MVP walks
// stage 0 only — multi-stage descent lands later if perf demands it.
uniform sampler2D uLATable;
uniform int   uLATexW;          // width of LA table texture (texels)
uniform int   uLATotalCount;    // total LA node count
uniform int   uLAEnabled;       // 0 = bypass LA, 1 = walk stage 0
// Up to 64 stages; stage 0 is at index 0 (the leaf). x = laIndex,
// y = macroItCount, z/w reserved.
uniform vec4  uLAStages[64];
uniform int   uLAStageCount;

// ── AT (Approximation Terms) front-load ──────────────────────────────────────
// AT recasts the front of the perturbed iteration as a standard z² + c'
// loop in transformed coordinates. Single uniform-step inner loop with
// no texture reads — by far the cheapest way to advance many iters at
// once when the validity gate (|dc| ≤ uATThresholdC) passes.
//   c'      = dc · uATCCoeff + uATRefC
//   z_at(0) = 0
//   z_at(k) = z_at(k-1)² + c'
//   dz_pert = z_at · uATInvZCoeff   (transform back)
//   iter    = k · uATStepLength
uniform int   uATEnabled;
uniform int   uATStepLength;
uniform float uATThresholdC;
uniform float uATSqrEscapeRadius;
uniform vec2  uATRefC;
uniform vec2  uATCCoeff;
uniform vec2  uATInvZCoeff;

${_}
${P}
${O}

// complex multiply
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
// complex divide a/b
vec2 cdiv(vec2 a, vec2 b) { float d = max(dot(b, b), 1e-30); return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / d; }

// Slope-lighting from the analytic escape-gradient normal (Chéritat's u = z/dz trick):
// treat the unit xy direction as a surface normal tilt and Lambert-shade against a light
// at azimuth "angle" and elevation "h" (higher h = flatter / softer). nrm is unit-length.
float slopeShade(vec2 nrm, float angle, float h) {
  vec2 v = vec2(cos(angle), sin(angle));
  float t = (nrm.x * v.x + nrm.y * v.y + h) / (1.0 + h);
  return clamp(t, 0.0, 1.0);
}

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

// Cheap per-pixel 2D hash (Dave Hoskins hash22) → [0,1)². Used to decorrelate the
// TSAA sub-cell jitter PER PIXEL instead of shifting the whole image by one global
// offset each round — which made neighbouring boundary pixels cross a colour band in
// lockstep, the cause of the grid-aligned "blocky" background convergence.
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
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

// ── HDR float helpers (mantissa + exponent) ──────────────────────────────────
// vec2(mantissa, exp): real value = m · 2^e, mantissa normalised to [1, 2)
// for non-zero values (m=0, e=0 = exact zero). Used by the deep-zoom path so
// dc / dz_pert can carry magnitude past f32's ~1e-38 underflow floor.
//
// Complex HDR (HDRC) is stored as vec4(re.m, re.e, im.m, im.e). Cheap
// to access via .xy / .zw swizzles.
//
// Add cost: ~4 ops vs 1 op for a plain add (one log2/floor/exp2 in
// hdrReduce). Mul: ~3 ops vs 1. Acceptable: deep mode is opt-in.

vec2 hdrFromFloat(float v) {
  if (v == 0.0) return vec2(0.0, 0.0);
  float e = floor(log2(abs(v)));
  return vec2(v * exp2(-e), e);
}

float hdrToFloat(vec2 h) {
  // Underflows to 0 outside f32 normal range (~2^-126). Caller must
  // be OK with that — typically guarded by checking magnitudes first.
  return h.x * exp2(h.y);
}

// Re-normalise so |m| in [1, 2). Called after every HDR mul/add. The
// h.x == 0 guard short-circuits the log2 to keep zero exact.
vec2 hdrReduce(vec2 h) {
  if (h.x == 0.0) return vec2(0.0, 0.0);
  float adj = floor(log2(abs(h.x)));
  return vec2(h.x * exp2(-adj), h.y + adj);
}

vec2 hdrAdd(vec2 a, vec2 b) {
  if (a.x == 0.0) return b;
  if (b.x == 0.0) return a;
  // Align mantissas to the larger exponent. If the smaller is past
  // ~24 bits below the larger it's lost in f32 anyway — bail early
  // (saves the multiply + the reduce that would yield the same answer).
  if (a.y >= b.y) {
    float shift = b.y - a.y;
    if (shift < -40.0) return a;
    return hdrReduce(vec2(a.x + b.x * exp2(shift), a.y));
  } else {
    float shift = a.y - b.y;
    if (shift < -40.0) return b;
    return hdrReduce(vec2(b.x + a.x * exp2(shift), b.y));
  }
}

vec2 hdrSub(vec2 a, vec2 b) { return hdrAdd(a, vec2(-b.x, b.y)); }

vec2 hdrMul(vec2 a, vec2 b) {
  return hdrReduce(vec2(a.x * b.x, a.y + b.y));
}

// ── Complex HDR ──────────────────────────────────────────────────────────────
vec4 hdrcAdd(vec4 a, vec4 b) {
  return vec4(hdrAdd(a.xy, b.xy), hdrAdd(a.zw, b.zw));
}

vec4 hdrcSub(vec4 a, vec4 b) {
  return vec4(hdrSub(a.xy, b.xy), hdrSub(a.zw, b.zw));
}

// (a+bi)·(c+di) = (ac − bd) + (ad + bc)i
vec4 hdrcMul(vec4 a, vec4 b) {
  vec2 ar = a.xy, ai = a.zw, br = b.xy, bi = b.zw;
  return vec4(
    hdrSub(hdrMul(ar, br), hdrMul(ai, bi)),
    hdrAdd(hdrMul(ar, bi), hdrMul(ai, br))
  );
}

// HDRC times a plain f32 vec2 (e.g. the reference-orbit sample, which
// lives in [-2, 2] and never needs HDR). Cheaper than promoting both.
vec4 hdrcMulVec2(vec4 a, vec2 b) {
  return hdrcMul(a, vec4(hdrFromFloat(b.x), hdrFromFloat(b.y)));
}

vec4 hdrcFromVec2(vec2 v) {
  return vec4(hdrFromFloat(v.x), hdrFromFloat(v.y));
}

vec2 hdrcToVec2(vec4 a) {
  return vec2(hdrToFloat(a.xy), hdrToFloat(a.zw));
}

// Read one texel from the LA table at flat index linearIdx. Width-
// indexed: x = idx % W, y = idx / W. Out-of-range clamps via texelFetch's
// undefined behaviour — caller guards against past-sentinel reads.
vec4 fetchLATexel(int linearIdx) {
  int x = linearIdx - (linearIdx / uLATexW) * uLATexW;
  int y = linearIdx / uLATexW;
  return texelFetch(uLATable, ivec2(x, y), 0);
}

// Decoded LA node. step and nextStage are stored as floats in the
// texture (RGBA32F) but represent integers — round at decode.
struct LANode {
  vec2 Ref;
  vec2 ZCoeff;
  vec2 CCoeff;
  float LAThreshold;
  float LAThresholdC;
  int   StepLength;
  int   NextStageLAIndex;
};

LANode fetchLA(int nodeIdx) {
  int base = nodeIdx * 3;
  vec4 t0 = fetchLATexel(base + 0);
  vec4 t1 = fetchLATexel(base + 1);
  vec4 t2 = fetchLATexel(base + 2);
  LANode la;
  la.Ref = t0.xy;
  la.ZCoeff = t0.zw;
  la.CCoeff = t1.xy;
  la.LAThreshold = t1.z;
  la.LAThresholdC = t1.w;
  la.StepLength = int(t2.x + 0.5);
  la.NextStageLAIndex = int(t2.y + 0.5);
  return la;
}

// Fetch reference orbit Z[idx] as vec2 (re, im). Bounds-clamps to the
// last valid sample so out-of-range reads (e.g. when ref+1 == orbit
// length) return a sane value instead of zero.
vec2 fetchRefZ(int idx) {
  int safe = max(0, min(idx, uRefOrbitLen - 1));
  int x = safe - (safe / uRefOrbitTexW) * uRefOrbitTexW;
  int y = safe / uRefOrbitTexW;
  return texelFetch(uRefOrbit, ivec2(x, y), 0).xy;
}

// One Julia evaluation at the given (jittered) UV. Out-params return
// the (outMain, outAux) data. Extracted so K-sampling can call it K
// times with different jitter offsets without inlining the iteration
// loop K times in source.
void evalJulia(vec2 uvJ, out vec4 outM, out vec4 outA, out vec2 outNormal) {
  vec2 uv = uvJ * 2.0 - 1.0;
  uv.x *= uAspect;
  vec2 p = uCenter + uv * uScale;

  // Deep-zoom path activates whenever the worker has uploaded a valid
  // reference orbit. Both Mandelbrot and Julia kinds work (the
  // perturbation init swaps below), and any integer power 2..8 works
  // (the PO step branches on uPower). LA / AT acceleration are still
  // gated to power 2 in the worker (their Step rules are d=2-specific)
  // — that gating happens at the buildLA / screenSqrRadius level, not
  // here.
  bool deep = (uDeepZoomEnabled != 0) && (uRefOrbitLen > 1);

  vec2 z, c;
  // Deep-path perturbation state, plain f32. The HDR ops are kept in
  // the shader for future extreme-depth use but the hot path is f32.
  // For Mandelbrot kind: dz_pert starts at 0, dc carries the pixel's
  // c-offset from the reference c. For Julia kind: dz_pert starts at
  // the pixel's z-offset from the reference z₀, dc is zero (pixel and
  // reference share the same c). The perturbation math is identical
  // across kinds — only the initial values swap.
  vec2 dz_pert = vec2(0.0);
  vec2 dc      = vec2(0.0);
  if (uDeepZoomEnabled != 0) {
    float scale_f32 = uDeepScale.x * exp2(uDeepScale.y);
    vec2 offset_f32 = vec2(
      uDeepCenterOffset.x * exp2(uDeepCenterOffset.y),
      uDeepCenterOffset.z * exp2(uDeepCenterOffset.w)
    );
    vec2 pixelOffset = uv * scale_f32 + offset_f32;
    if (uKind == 0) {
      // Julia: pixel z₀ shifted by pixelOffset; c is fixed.
      dz_pert = pixelOffset;
      dc = vec2(0.0);
    } else {
      // Mandelbrot: pixel c shifted by pixelOffset; z starts at 0.
      dz_pert = vec2(0.0);
      dc = pixelOffset;
    }
  }
  int  ref     = 0;
  if (uKind == 0) { z = p; c = uJuliaC; }
  else            { z = vec2(0.0); c = p; }

  float escaped = 0.0;
  float iters = float(uMaxIter);

  float minT      = 1e9;
  float trapIter  = 0.0;
  float stripeSum = 0.0;
  int   stripeCount = 0;
  // Stripe-average colouring loses contrast at depth: as the iteration cap rises,
  // more sin() terms average toward 0.5 (central-limit), so deep views need an
  // absurd Density to tease bands out. In v2 we scale the angular frequency down by
  // ln(cap) so fewer, broader stripes contribute coherently → contrast holds at any
  // depth. v1 leaves the user's frequency untouched. (Output stays [0,1].)
  float stripeFreqEff = (uColorNormV2 != 0)
      ? uStripeFreq / max(1.0, log(max(float(uColorIter), 2.0)))
      : uStripeFreq;
  vec2  dz = vec2(1.0, 0.0);  // dz/dc, the standard-path derivative tracker

  // iter tracks total iterations performed across the LA pre-pass and
  // the per-iter PO loop below. The for-loop counter n exists only as
  // a hard upper bound for GLSL; we break on iter >= uMaxIter.
  int iter = 0;

  // ── LA pre-pass (deep + LA enabled): walk stage-0 LAs to skip many
  // iters at once. Phase 6 MVP — multi-stage descent lands if perf
  // demands more headroom; for our typical 50k-iter targets, stage 0
  // alone covers ~99% of the orbit in a few hundred LA steps.
  // ── AT pre-pass (deep + AT enabled + per-pixel validity passes) ─────────
  // Plain f32 z² + c' loop. Skips uATStepLength actual iters per AT
  // step. Falls through naturally to LA + PO with iter and dz_pert
  // updated; ref will be set after LA walk like before.
  //
  // Stripe/trap (uTrackAccum) and derivative (uTrackDeriv) colour modes sample
  // a per-ITERATION accumulator (trapDistance / Härkönen stripe sum / dz·dc)
  // that ONLY the PO loop computes. LA and AT skip many iterations at once, so
  // an accelerated pixel would accumulate those stats over far fewer iterations
  // than the pure-PO surround → a coherent colour-offset block inside the L∞ LA
  // region (a "diagonal coloring square"). FractalShark sidesteps this by never
  // combining stripe coloring with LA. We do the same at runtime: when an
  // accumulator/derivative mode is active, force the pure-PO path (which visits
  // every iteration). Costs LA/AT acceleration for those modes only — all other
  // colour modes keep it. @see docs/adr/0065
  bool perIterColor = (uTrackAccum != 0) || (uTrackDeriv != 0);
  bool atActive = deep && uATEnabled != 0 && uMaxIter > uATStepLength && !perIterColor;
  if (atActive && max(abs(dc.x), abs(dc.y)) <= uATThresholdC) {
    vec2 c_at = cmul(dc, uATCCoeff) + uATRefC;
    vec2 z_at = vec2(0.0);
    vec2 prev_z_at = vec2(0.0);
    int atMax = uMaxIter / uATStepLength;
    int atSteps = 0;
    int prev_atSteps = 0;
    for (int k = 0; k < 4096; ++k) {
      if (k >= atMax) break;
      float zMag2 = dot(z_at, z_at);
      if (zMag2 > uATSqrEscapeRadius) {
        // Roll back one AT step. PO needs up to stepLength iters of
        // room to find the precise escape iter — without this rollback
        // adjacent pixels that barely-escape vs barely-not get final
        // iters quantised to stepLength multiples, producing visible
        // cliff transitions in the smoothI palette.
        z_at = prev_z_at;
        atSteps = prev_atSteps;
        break;
      }
      prev_z_at = z_at;
      prev_atSteps = atSteps;
      z_at = cmul(z_at, z_at) + c_at;
      atSteps++;
    }
    if (atSteps > 0) {
      // Recover the perturbation: dz_pert = z_at · uATInvZCoeff.
      dz_pert = cmul(z_at, uATInvZCoeff);
      iter = atSteps * uATStepLength;
    }
  }

  bool laActive = deep && uLAEnabled != 0 && uLAStageCount > 0 && uLATotalCount > 1 && !perIterColor;
  if (laActive) {
    // Stage-0 first-LA threshold gate: stage 0 has the most permissive
    // dc threshold (covers the smallest orbit segments). If |dc|
    // exceeds even that, NO stage's LA can help — skip LA entirely.
    LANode finestFirstLA = fetchLA(0);
    if (max(abs(dc.x), abs(dc.y)) <= finestFirstLA.LAThresholdC) {
      // Multi-stage descent: walk from root toward stage 0. f32 ops
      // throughout (HDR was 30× slower per step and unnecessary at
      // current zoom depths).
      int j = 0;
      int currentStage = uLAStageCount - 1;
      bool earlyEscape = false;
      for (int stageStep = 0; stageStep < 64; ++stageStep) {
        if (currentStage < 0) break;
        if (iter >= uMaxIter) break;
        if (earlyEscape) break;

        int laBase = int(uLAStages[currentStage].x + 0.5);
        int macroItCount = int(uLAStages[currentStage].y + 0.5);
        bool failedInStage = false;

        for (int laStep = 0; laStep < 4096; ++laStep) {
          if (iter >= uMaxIter) break;
          if (j >= macroItCount) break;
          LANode la = fetchLA(laBase + j);
          if (la.StepLength == 0) break;
          if (iter + la.StepLength > uMaxIter) break;

          // Prepare: newdz = dz_pert * (2*Ref + dz_pert).
          vec2 inner = 2.0 * la.Ref + dz_pert;
          vec2 newdz = cmul(dz_pert, inner);
          if (max(abs(newdz.x), abs(newdz.y)) >= la.LAThreshold) {
            j = la.NextStageLAIndex;
            failedInStage = true;
            break;
          }

          // Evaluate: dz_pert' = newdz * ZCoeff + dc * CCoeff.
          dz_pert = cmul(newdz, la.ZCoeff) + cmul(dc, la.CCoeff);
          iter += la.StepLength;
          // Track the ORBIT reference index alongside iter — dz_pert is the
          // perturbation relative to orbit[ref]. The PO loop needs this exact
          // index on hand-off; deriving it as iter % len (the old code below) is
          // wrong after any rebase, since iter keeps the global count while the
          // reference resets. (LA→PO handoff fix; see @see docs/adr/0064.)
          ref += la.StepLength;
          j++;

          LANode nextLA = fetchLA(laBase + j);
          z = nextLA.Ref + dz_pert;
          float zMag2 = dot(z, z);
          if (zMag2 > uEscapeR2) {
            iters = float(iter) + 1.0 - log2(max(0.5 * log2(max(zMag2, 1.0001)), 1e-6));
            escaped = 1.0;
            earlyEscape = true;
            break;
          }
          // REBASE — when the pixel orbit comes back near zero (|z| < |dz|)
          // OR we walk off the end of this stage, replace dz with the
          // current pixel z and restart the stage cursor.
          //
          // CRITICAL: rebase semantics depend on Z[0] = 0 (Mandelbrot's
          // iteration convention). The rebase math says "from now on,
          // treat current pixel as the new perturbation against an
          // implied Z=0 reference". For Mandelbrot orbit[0]=0 always,
          // so accessing orbit[0] after rebase produces 0 and the
          // formula 2*Z[0]*dz + dz² + dc = dz² + dc matches reality.
          //
          // For Julia, orbit[0] = R₀ (the chosen reference z₀, not
          // zero). Rebasing then accessing orbit[0]=R₀ produces
          // 2*R₀*dz + dz² which does NOT match the true pixel
          // iteration pixel_z^2 minus R0^2. Result: distorted output.
          //
          // Skip rebase for Julia. Worse LA coverage (interior pixels
          // can't loop back through stages) but mathematically correct.
          // When the stage exhausts, just break — PO continues with
          // whatever iter we accumulated.
          if (uKind != 0) {
            // Mandelbrot: rebase per Z[0] = 0 convention.
            float dzMag2 = dot(dz_pert, dz_pert);
            if (zMag2 < dzMag2 || j >= macroItCount) {
              dz_pert = z;
              j = 0;
              ref = 0;  // rebased to orbit[0] — keep the tracked ref in step
            }
          } else if (j >= macroItCount) {
            // Julia: stage exhausted. Just bail to PO; we don't have
            // valid rebase semantics here because Z[0] != 0. PO will
            // continue from the current iter / dz_pert.
            break;
          }
        }

        if (!failedInStage) break;
        currentStage--;
      }
    }
    // Hand off to PO with the TRACKED orbit reference index (advanced by
    // StepLength per LA node, reset to 0 on each rebase) — NOT iter % len, which
    // is wrong after any rebase because iter keeps the global count while the
    // reference resets. The old guess left the LA-accelerated centre pixels
    // (inside the L∞ "square" where LA applies) on a mis-aligned reference,
    // diverging from the pure-PO surround → the "square tile" artifact. dz_pert
    // is the perturbation relative to orbit[ref], so ref must be exact.
    // Mirrors FractalShark's RefIteration threading. @see docs/adr/0064.
    // For a periodic (nucleus) reference, wrap ref modulo the period — exact,
    // since orbit[period] == orbit[0]. Mirrors FractalShark's
    // RefIteration % GetPeriodMaybeZero() wrap. @see docs/adr/0066.
    if (uRefPeriod > 0) {
      ref = ref % uRefPeriod;
    } else {
      ref = uRefOrbitLen > 0 ? min(ref, uRefOrbitLen - 1) : 0;
    }
  }

  // ── PO loop (also handles standard f32 path when !deep). Runs from
  // wherever LA left off (iter is preserved) up to uMaxIter. Hard
  // upper bound 65536 satisfies GLSL's preference for static loop
  // bounds; the meaningful guard is iter >= uMaxIter.
  // Seed the cached Zref so each PO iter does just ONE texelFetch.
  // Standard-path branch never reads it; cheap unconditional init.
  vec2 po_Zref = deep ? fetchRefZ(ref) : vec2(0.0);
  for (int n = 0; n < 65536; ++n) {
    if (escaped > 0.5) break;
    if (iter >= uMaxIter) break;

    if (uTrackDeriv != 0) {
      dz = cmul(2.0 * z, dz) + vec2(1.0, 0.0);
    }

    if (deep && uKind == 0 && ref >= uRefOrbitLen - 1) {
      // Julia past orbit overflow: switch to direct iteration of pixel
      // z. The orbit was built BigInt-precise, so for the iters it
      // covers the perturbation path is correct. When ref outruns the
      // orbit length (R₀ outside the Julia set → orbit escapes early),
      // we can't continue perturbation reliably (Z[0] != 0 means rebase
      // doesn't work, and clamped orbit values produce wrong math).
      // Direct iteration on the pixel z with c = uJuliaC is mathematically
      // exact at f32 precision — fine for the moderate depths where
      // orbit overflow can hit. Pixel z was set in the previous
      // perturbation step as orbit + dz_pert, which IS the pixel's true
      // z value at that iter — perfect handoff.
      z = cpow(z, uPower) + uJuliaC;
    } else if (deep) {
      // Cached Zref. We seed it once when entering deep PO (just below
      // this loop's outer scope when iter is first set), and forward
      // ZrefNext → Zref each step so we only do ONE texelFetch per
      // PO iter instead of two. Re-fetched explicitly on rebase.
      vec2 dz_new;
      if (abs(uPower - 2.0) < 0.01) {
        // d=2 hot path: stable algebra dz*(2Z + dz) + dc avoids the
        // catastrophic cancellation that would happen if we computed
        // (Z+dz)^2 - Z^2 directly when dz is much smaller than Z.
        dz_new = cmul(2.0 * po_Zref, dz_pert) + cmul(dz_pert, dz_pert) + dc;
      } else {
        // d >= 3: factored form
        //   (Z+dz)^d - Z^d = dz * sum_{k=0..d-1} C(d, k+1) * Z^(d-1-k) * dz^k
        // Same algebra as power-2 stable form, generalised. Avoids the
        // subtract-two-big-numbers cancellation that the cpow form
        // would suffer at deep zoom. Cost: ~d complex muls for the
        // power table + d more for the sum. Cheap relative to PO loop.
        // Variable-power LA/AT acceleration is still gated off in the
        // worker for d != 2.
        vec2 zPows[8];
        vec2 dzPows[8];
        zPows[0] = vec2(1.0, 0.0);
        dzPows[0] = vec2(1.0, 0.0);
        int d = int(uPower + 0.5);
        for (int k = 1; k < 8; k++) {
          if (k >= d) break;
          zPows[k] = cmul(zPows[k-1], po_Zref);
          dzPows[k] = cmul(dzPows[k-1], dz_pert);
        }
        // Coefficients C(d, k+1) for k=0..d-1, computed inductively.
        // C(d,1) = d. C(d,k+2) = C(d,k+1) * (d-k-1) / (k+2).
        vec2 inner = vec2(0.0);
        float coeff = float(d);
        for (int k = 0; k < 8; k++) {
          if (k >= d) break;
          // term_k = Z^(d-1-k) * dz^k
          vec2 term = cmul(zPows[d-1-k], dzPows[k]);
          inner += coeff * term;
          coeff = coeff * float(d-k-1) / float(k+2);
        }
        dz_new = cmul(dz_pert, inner) + dc;
      }
      dz_pert = dz_new;
      ref++;
      // Periodic (minibrot-nucleus) reference: orbit[period] == orbit[0] == 0,
      // so wrap the index EXACTLY instead of rebasing past a non-periodic end.
      // dz_pert is unchanged — the perturbation stays valid across the wrap
      // (at ref→0, orbit[0]=0 so z = dz_pert continues seamlessly). @see ADR-0066
      if (uRefPeriod > 0 && ref >= uRefPeriod) ref -= uRefPeriod;
      vec2 ZrefNext = fetchRefZ(ref);
      z = ZrefNext + dz_pert;
      float zMag2 = dot(z, z);
      float dzPertMag2 = dot(dz_pert, dz_pert);
      if (uKind != 0) {
        // Mandelbrot: Zhuoran rebase whenever |z| drops below |dz| (glitch
        // correction) — always applies. The orbit-overflow rebase to orbit[0]
        // is the NON-periodic fallback only; a periodic reference already
        // wrapped its index exactly above. The rebase math relies on
        // Z[0] = 0 (Mandelbrot's convention).
        if (zMag2 < dzPertMag2 || (uRefPeriod <= 0 && ref >= uRefOrbitLen - 1)) {
          dz_pert = z;
          ref = 0;
          po_Zref = fetchRefZ(0);
        } else {
          po_Zref = ZrefNext;
        }
      } else {
        // Julia: rebase semantics don't apply (orbit Z[0] != 0).
        // When the orbit overflows fetchRefZ clamps to the last
        // value. If the orbit escaped at the end, |orbit[end]| is
        // already past the escape radius, so on the very next iter
        // |z| = |orbit[end] + dz_pert| also exceeds escape and the
        // natural escape check fires correctly. If the orbit didn't
        // escape (interior of the Julia set), iteration stays
        // bounded and runs to uMaxIter as expected. Either way no
        // special handling needed.
        po_Zref = ZrefNext;
      }
    } else {
      z = cpow(z, uPower) + c;
    }

    if (uTrackAccum != 0 && iter < uColorIter) {
      float td = trapDistance(z);
      if (td < minT) { minT = td; trapIter = float(iter); }
      stripeSum += 0.5 + 0.5 * sin(stripeFreqEff * atan(z.y, z.x));
      stripeCount++;
    }
    float r2 = dot(z, z);
    if (r2 > uEscapeR2) {
      iters = float(iter) + 1.0 - log2(max(0.5 * log2(max(r2, 1.0001)), 1e-6));
      escaped = 1.0;
      break;
    }
    iter++;
  }

  float stripeAvg = stripeCount > 0 ? stripeSum / float(stripeCount) : 0.0;
  float logDz     = log(1.0 + length(dz));
  float trapIterN = float(uMaxIter) > 0.0 ? trapIter / float(uMaxIter) : 0.0;

  outM = vec4(z, iters, escaped);
  outA = vec4(minT, stripeAvg, logDz, trapIterN);
  // Analytic escape-gradient normal (xy) for slope lighting; interior is ill-defined → 0.
  vec2 uDir = vec2(0.0);
  if (escaped > 0.5) {
    vec2 u = cdiv(z, dz);
    float ul = length(u);
    uDir = ul > 1e-12 ? u / ul : vec2(0.0);
  }
  outNormal = uDir;
}

void main() {
  // Region mask (bucket-render): outside the current GPU bucket we skip the
  // whole fragment so the framebuffer keeps whatever was there before this
  // bucket (typically a freshly reset accumulator). Defaults (0,0)-(1,1) make
  // this a no-op for live viewport rendering.
  if (vUv.x < uRegionMin.x || vUv.x > uRegionMax.x ||
      vUv.y < uRegionMin.y || vUv.y > uRegionMax.y) {
    discard;
  }

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
  // Sub-cell offset progressive refinement. Round 0 = cell centre (matches a
  // single-frame K=gridSize grid). Round 1+ jitters within the cell by a PER-PIXEL
  // offset seeded by hash(pixel, round): deterministic in (pixel, round) so the
  // offset is stable across the frames of a round (no shimmer), but neighbouring
  // pixels get DECORRELATED offsets — so boundary pixels no longer cross a colour
  // band in lockstep and the convergence dissolves into per-pixel noise the 1/N
  // blend averages out smoothly, instead of stepping in grid-aligned blocks.
  vec2 subOffset = vec2(0.0);
  if (round > 0) {
    vec2 h = hash22(gl_FragCoord.xy + vec2(float(round) * 19.19, float(round) * 7.7));
    subOffset = (h - 0.5) / float(gridDim);
  }
  int cellOffset = frameInRound * K;

  // Per-evaluation baked outputs accumulate here. Each quantity is a
  // smooth function of sub-pixel position, so the mean across jitter
  // (and later across TSAA frames) converges cleanly.
  //
  //   accColor / accMask                  → outFx (palette + collision)
  //   accDE / accSmoothPot / accStripe /
  //   accInjectGate                        → outMain (motion + injection)
  vec3  accColor      = vec3(0.0);
  float accMask       = 0.0;
  float accDE         = 0.0;
  float accSmoothPot  = 0.0;
  float accStripe     = 0.0;
  float accInjectGate = 0.0;

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
    // Image-tile remap: map tile-local UV into full-output UV before sampling
    // the fractal. Defaults make this an identity for live viewport.
    vec2 uvJ = uImageTileOrigin + (vUv + jitter * invRes) * uImageTileSize;

    vec4 sM, sA;
    vec2 sN;
    evalJulia(uvJ, sM, sA, sN);

    // Per-evaluation palette bake. sM.w is 0 (interior) or 1 (escaped).
    // For interior pixels, palette colour is undefined (smoothIter is
    // clamped at uMaxIter, z is the orbit's last position) — feed the
    // interior colour instead so the mean across jitter samples in a
    // boundary pixel becomes a smooth interior↔palette blend.
    bool  escaped = sM.w > 0.5;
    vec4  sPalRgba = gradientForJuliaRgba(sM, sA);
    vec3  sColor   = escaped ? sPalRgba.rgb : uInteriorColor;

    // Slope-lighting composite layer — modulates the base colour of ANY mode by the
    // analytic escape-gradient normal, so escaped pixels read as a lit, sculpted surface.
    // Mean-pools cleanly under jitter/TSAA (it's a smooth function of sub-pixel position).
    if (uLightEnabled != 0 && escaped) {
      float shade = slopeShade(sN, uLightAngle, uLightHeight);
      float lit = uAmbient + (1.0 - uAmbient) * shade;
      sColor *= mix(1.0, lit, uLightStrength);
    }

    // Per-evaluation mask bake. Same colour-mapping scalar the palette
    // uses, but remapped through the collision LUT's own repeat/phase,
    // and gated on escape (interior pixels never wall). Luminance-
    // collapse the LUT colour so the user can author B&W or coloured
    // collision LUTs interchangeably.
    float sMask = 0.0;
    if (uCollisionEnabled != 0 && escaped) {
      float t0 = colorMappingT(sM, sA);
      float tc = fract(t0 * uCollisionRepeat + uCollisionPhase);
      vec4  cm = texture(uCollisionGradient, vec2(tc, 0.5));
      sMask = clamp(dot(cm.rgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    }

    // Motion sources — all C0/C1 in pixel space so they mean-pool well.
    //   DE        = 0.5·|z|·log|z| / |dz| (Hubbard distance estimate),
    //               smooth-mapped to [0, ~1]. Zero on interior pixels.
    //   smoothPot = smoothIter / maxIter; flat 1.0 inside the set.
    //   stripe    = sA.g (Härkönen stripe average, already a mean
    //               inside evalJulia).
    //
    // The fourth motion-source option, "palette luminance", isn't
    // baked here — the motion shader derives it cheaply from outFx.rgb
    // (one extra texture sample + dot). Saves a channel for the gate.
    float sDE = 0.0;
    if (escaped) {
      float absZ  = max(length(sM.xy), 1e-6);
      float absDz = max(exp(sA.b) - 1.0, 1e-6);
      float d     = 0.5 * absZ * log(absZ) / absDz;
      sDE = 1.0 - exp(-d * 4.0);
    }
    float sSmoothPot = sM.z / max(float(uMaxIter), 1.0);
    float sStripe    = sA.g;

    // Injection-rate gate for dye inject — preserves the per-stop alpha
    // of the main gradient as a "dye flows here" mask, with escape gate
    // so interior pixels never inject.
    float sInjectGate = escaped ? sPalRgba.a : 0.0;

    accColor      += sColor;
    accMask       += sMask;
    accDE         += sDE;
    accSmoothPot  += sSmoothPot;
    accStripe     += sStripe;
    accInjectGate += sInjectGate;
  }

  float invK = 1.0 / float(K);
  outMain = vec4(accDE * invK, accSmoothPot * invK, accStripe * invK, accInjectGate * invK);
  outFx   = vec4(accColor * invK, accMask * invK);
}`,Q=`#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outFx;

uniform sampler2D uCurrentMain;
uniform sampler2D uCurrentFx;
uniform sampler2D uHistoryMain;
uniform sampler2D uHistoryFx;
uniform int uSampleIndex;

void main() {
    vec4 curMain = texture(uCurrentMain, vUv);
    vec4 curFx   = texture(uCurrentFx,   vUv);
    // Frame-1 safety: when uSampleIndex is 1 the history texture hasn't
    // been written yet (MRT FBOs allocate with undefined contents in
    // WebGL2 — some drivers return NaN for RGBA16F). Skip the history
    // read entirely and just pass the current sample through.
    if (uSampleIndex <= 1) {
        outMain = curMain;
        outFx   = curFx;
        return;
    }
    vec4 histMain = texture(uHistoryMain, vUv);
    vec4 histFx   = texture(uHistoryFx,   vUv);
    float w = 1.0 / float(uSampleIndex);
    outMain = mix(histMain, curMain, w);
    outFx   = mix(histFx,   curFx,   w);
}`,M=1.4,F=1e-4,N=1e-100,U=2e5,ee=(a,t=1)=>{const i=Math.log10(M/Math.max(a,F)),e=Math.max(200,Math.min(2e3,200+220*Math.max(0,i)));return Math.round(e*Math.max(.25,t))},j=a=>{const t=Math.log10(M/Math.max(a,N));return Math.round(Math.min(2e4,Math.max(2e3,1500+900*Math.max(0,t))))},Z=(a,t=1)=>Math.round(Math.min(U,j(a)*Math.max(.25,t))),te=(a,t,i,e=1)=>i>0?Z(a,e):Math.max(200,t),B=a=>{const t=(a&32768)>>15,i=(a&31744)>>10,e=a&1023;return i===0?(t?-1:1)*Math.pow(2,-14)*(e/1024):i===31?e?NaN:t?-1/0:1/0:(t?-1:1)*Math.pow(2,i-15)*(1+e/1024)},C=(a,t,i,e,r)=>{const o=t*i;let n=0;for(let l=0;l<a.length;l++)if(n+=a[l],n>=o)return e+(l+.5)*(r-e)/a.length;return r};function ae(a,t,i,e,r){const o=i*e;if(o<=0)return null;a.bindFramebuffer(a.FRAMEBUFFER,t),a.readBuffer(a.COLOR_ATTACHMENT0);const n=a.getParameter(a.IMPLEMENTATION_COLOR_READ_TYPE);let l;if(n===a.FLOAT){const c=new Float32Array(o*4);a.readPixels(0,0,i,e,a.RGBA,a.FLOAT,c),l=u=>c[u*4+1]}else{const c=new Uint16Array(o*4);a.readPixels(0,0,i,e,a.RGBA,a.HALF_FLOAT,c),l=u=>B(c[u*4+1])}const d=a.getError();if(a.bindFramebuffer(a.FRAMEBUFFER,null),d!==a.NO_ERROR)return console.warn("[fitIterationRange] readPixels failed",d,"readType",n),null;const m=Math.max(r,1);let f=1/0,p=-1/0,b=0;for(let c=0;c<o;c++){const u=l(c);!Number.isFinite(u)||u<=1e-4||u>=.999||(u<f&&(f=u),u>p&&(p=u),b++)}if(b===0||p<=f)return console.warn("[fitIterationRange] no escaped pixels in view to fit"),null;const x=256,g=new Int32Array(x),T=(x-1)/(p-f);for(let c=0;c<o;c++){const u=l(c);!Number.isFinite(u)||u<=1e-4||u>=.999||g[Math.round((u-f)*T)]++}const v=C(g,b,.02,f,p),h=C(g,b,.98,f,p),R=Math.log(1+Math.max(v*m,0)),E=Math.log(1+Math.max(h*m,0)),k=Math.max(E-R,.001);return{offset:R,scale:1/k}}const G=a=>{if(!Number.isFinite(a)||a===0)return{mantissa:0,exp:0};const t=Math.floor(Math.log2(Math.abs(a)));return{mantissa:a/Math.pow(2,t),exp:t}},H=a=>[a.mantissa,a.exp],y=a=>H(G(a)),L=(a,t,i,e)=>{i&&(a.activeTexture(a.TEXTURE0+t),a.bindTexture(a.TEXTURE_2D,i),a.uniform1i(e,t))};class re{constructor(t){s(this,"refOrbitTex",null);s(this,"refOrbitTexW",2048);s(this,"refOrbitTexH",0);s(this,"refOrbitLen",0);s(this,"refOrbitCenter",[0,0]);s(this,"refOrbitCenterLow",[0,0]);s(this,"refOrbitPeriod",0);s(this,"laTableTex",null);s(this,"laTableTexW",1024);s(this,"laTableTexH",0);s(this,"laTotalCount",0);s(this,"laStages",new Float32Array(0));s(this,"laStageCount",0);s(this,"laEnabled",!1);s(this,"atPayload",null);s(this,"version",0);this.gl=t}hasOrbit(){return this.refOrbitTex!==null&&this.refOrbitLen>1}setReferenceOrbit(t,i,e,r=[0,0],o=0){this.refOrbitCenter=[e[0],e[1]],this.refOrbitCenterLow=[r[0],r[1]],this.refOrbitPeriod=o,this.uploadOrbitTexture(t,i),this.refOrbitLen=i,this.version++}clearReferenceOrbit(){this.refOrbitLen=0,this.refOrbitPeriod=0,this.version++}setLATable(t,i,e){this.uploadLaTexture(t,i),this.laTotalCount=i,this.laStages=e,this.laStageCount=e.length/2,this.version++}setLAEnabled(t){this.laEnabled=t}clearLATable(){this.laTotalCount=0,this.laStages=new Float32Array(0),this.laStageCount=0,this.version++}setAT(t){this.atPayload=t,this.version++}clearAT(){this.atPayload!==null&&(this.atPayload=null,this.version++)}bindUniforms(t,i,e){const r=this.gl,o=i.deepZoomEnabled&&this.hasOrbit();r.uniform1i(t.uniforms.uDeepZoomEnabled,o?1:0),r.uniform1i(t.uniforms.uRefOrbitTexW,this.refOrbitTexW),r.uniform1i(t.uniforms.uRefOrbitLen,this.refOrbitLen),r.uniform1i(t.uniforms.uRefPeriod,o?this.refOrbitPeriod:0);const n=z(i.center[0],i.centerLow[0],this.refOrbitCenter[0],this.refOrbitCenterLow[0]),l=z(i.center[1],i.centerLow[1],this.refOrbitCenter[1],this.refOrbitCenterLow[1]),d=n[0]+n[1],m=l[0]+l[1],f=y(d),p=y(m);r.uniform4f(t.uniforms.uDeepCenterOffset,f[0],f[1],p[0],p[1]);const b=y(i.zoom);r.uniform2f(t.uniforms.uDeepScale,b[0],b[1]),L(r,6,this.refOrbitTex??e,t.uniforms.uRefOrbit);const x=o&&this.laEnabled&&this.laTableTex!==null&&this.laTotalCount>1;if(r.uniform1i(t.uniforms.uLAEnabled,x?1:0),r.uniform1i(t.uniforms.uLATexW,this.laTableTexW),r.uniform1i(t.uniforms.uLATotalCount,this.laTotalCount),r.uniform1i(t.uniforms.uLAStageCount,this.laStageCount),this.laStageCount>0){const T=Math.min(this.laStageCount,64),v=new Float32Array(T*4);for(let h=0;h<T;h++)v[h*4+0]=this.laStages[h*2+0],v[h*4+1]=this.laStages[h*2+1];r.uniform4fv(t.uniforms["uLAStages[0]"],v)}L(r,7,this.laTableTex??e,t.uniforms.uLATable);const g=o&&this.atPayload!==null;r.uniform1i(t.uniforms.uATEnabled,g?1:0),this.atPayload?(r.uniform1i(t.uniforms.uATStepLength,this.atPayload.stepLength),r.uniform1f(t.uniforms.uATThresholdC,this.atPayload.thresholdC),r.uniform1f(t.uniforms.uATSqrEscapeRadius,this.atPayload.sqrEscapeRadius),r.uniform2f(t.uniforms.uATRefC,this.atPayload.refC[0],this.atPayload.refC[1]),r.uniform2f(t.uniforms.uATCCoeff,this.atPayload.ccoeff[0],this.atPayload.ccoeff[1]),r.uniform2f(t.uniforms.uATInvZCoeff,this.atPayload.invZCoeff[0],this.atPayload.invZCoeff[1])):(r.uniform1i(t.uniforms.uATStepLength,1),r.uniform1f(t.uniforms.uATThresholdC,0),r.uniform1f(t.uniforms.uATSqrEscapeRadius,4),r.uniform2f(t.uniforms.uATRefC,0,0),r.uniform2f(t.uniforms.uATCCoeff,1,0),r.uniform2f(t.uniforms.uATInvZCoeff,1,0))}dispose(){const t=this.gl;this.refOrbitTex&&(t.deleteTexture(this.refOrbitTex),this.refOrbitTex=null),this.laTableTex&&(t.deleteTexture(this.laTableTex),this.laTableTex=null)}uploadOrbitTexture(t,i){const e=this.gl,r=this.refOrbitTexW,o=Math.max(1,Math.ceil(i/r)),n=r*o*4,l=t.length>=n?t.subarray(0,n):(()=>{const d=new Float32Array(n);return d.set(t),d})();this.refOrbitTex||(this.refOrbitTex=S(e),this.refOrbitTexH=0),e.bindTexture(e.TEXTURE_2D,this.refOrbitTex),o!==this.refOrbitTexH?(e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,r,o,0,e.RGBA,e.FLOAT,l),this.refOrbitTexH=o):e.texSubImage2D(e.TEXTURE_2D,0,0,0,r,o,e.RGBA,e.FLOAT,l)}uploadLaTexture(t,i){const e=this.gl,r=i*3,o=this.laTableTexW,n=Math.max(1,Math.ceil(r/o)),l=o*n*4,d=t.length>=l?t.subarray(0,l):(()=>{const m=new Float32Array(l);return m.set(t),m})();this.laTableTex||(this.laTableTex=S(e),this.laTableTexH=0),e.bindTexture(e.TEXTURE_2D,this.laTableTex),n!==this.laTableTexH?(e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,o,n,0,e.RGBA,e.FLOAT,d),this.laTableTexH=n):e.texSubImage2D(e.TEXTURE_2D,0,0,0,o,n,e.RGBA,e.FLOAT,d)}}const S=a=>{const t=a.createTexture();return a.bindTexture(a.TEXTURE_2D,t),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.NEAREST),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),t};class W{constructor(){s(this,"worker",null);s(this,"nextId",1);s(this,"pending",new Map)}ensureWorker(){if(this.worker)return this.worker;const t=new Worker(new URL(""+new URL("deepZoomWorker-gtBH4Cte.js",import.meta.url).href,import.meta.url),{type:"module"});return t.onmessage=i=>{const e=i.data,r=this.pending.get(e.id);r&&(this.pending.delete(e.id),e.type==="orbit"?r.resolve({orbit:new Float32Array(e.orbit),length:e.length,escaped:e.escaped,precisionBits:e.precisionBits,buildMs:e.buildMs,laBuildMs:e.laBuildMs??0,refCenterX:e.refCenterX,refCenterY:e.refCenterY,refCenterLowX:e.refCenterLowX,refCenterLowY:e.refCenterLowY,relocated:e.relocated??!1,laUnsafe:e.laUnsafe??!1,period:e.period??0,laEpsilonLog2:e.laEpsilonLog2,laTable:e.laTable?new Float32Array(e.laTable):void 0,laStages:e.laStages?new Float32Array(e.laStages):void 0,laCount:e.laCount??0,laStageCount:e.laStageCount??0,at:e.at}):r.reject(new Error(e.message)))},t.onerror=i=>{var r;const e=new Error(`deep-zoom worker crashed: ${i.message}`);for(const o of this.pending.values())o.reject(e);this.pending.clear(),(r=this.worker)==null||r.terminate(),this.worker=null},this.worker=t,t}computeReferenceOrbit(t){const i=this.ensureWorker(),e=this.nextId++;return new Promise((r,o)=>{this.pending.set(e,{resolve:r,reject:o});const n={type:"computeOrbit",id:e,...t};i.postMessage(n)})}cancel(t){if(!this.worker)return;const i={type:"cancel",id:t};this.worker.postMessage(i),this.pending.delete(t)}dispose(){this.worker&&(this.worker.terminate(),this.worker=null),this.pending.clear()}}let w=null;const ie=()=>(w||(w=new W),w);export{re as D,$ as F,O as G,V as O,Y as V,J as a,Q as b,ee as c,q as d,Z as e,ae as f,te as g,ie as h,j as i,K as j};
