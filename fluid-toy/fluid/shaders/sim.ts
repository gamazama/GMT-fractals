/**
 * Fluid-simulation passes — the per-frame Stokes/Stam pipeline that
 * advects dye + velocity, projects to divergence-free, and applies the
 * fractal-driven force field. All read/write happens on the sim grid
 * (smaller than display res when render-scale < 1).
 */

import { OKLAB_GLSL } from './common';

// -----------------------------------------------------------------------------
// Motion / coupling pass — turns the fractal field into a 2D force injected
// into the velocity buffer, plus a dye-injection colour written into the
// force texture's b/a channels.
//
// Source × Operator factoring: pick a smooth scalar source (DE, smooth
// potential, stripe average, palette luminance, mask) and an operator
// (gradient, curl, direct, temporal-delta, hue) and the shader produces
// a 2D force from it. Sources live in pre-baked, mean-pooled channels
// of the Julia MRT so the force is a smooth function of position even
// during heavy TSAA convergence — the fluid stops being shaken by
// jitter noise.
//
//   uSource:   0=DE  1=smoothPot  2=stripe  3=paletteLuma  4=mask
//   uMode:     0=gradient (∇S)
//              1=curl     (perp(∇S))   — divergence-free swirl
//              2=direct   (normalize(∇S) × S)  — push proportional to S
//              3=temporal-delta (∇(S_now − S_prev))  — replaces "c-track"
//              4=hue      (palette RGB → angular direction; ignores uSource)
// -----------------------------------------------------------------------------
export const FRAG_MOTION = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;

// uJulia       = Julia MRT outMain (motion sources packed into rgba)
//                r=DE, g=smoothPot, b=stripe, a=injection-gate (not a source)
// uJuliaPrev   = previous frame's outMain (same packing) — for temporal-delta
//                on sources 0/1/2.
// uJuliaFx     = current outFx (rgb=palette, a=mask) — paletteLuma & mask
//                sources, plus the hue operator.
// uJuliaPrevFx = previous frame's outFx — for temporal-delta on source 3
//                (paletteLuma) or 4 (mask).
uniform sampler2D uJulia;
uniform sampler2D uJuliaPrev;
uniform sampler2D uJuliaFx;
uniform sampler2D uJuliaPrevFx;
uniform sampler2D uMask;       // alias for uJuliaFx; bound separately so the
                               // wall-zeroing below doesn't depend on the
                               // motion's source-channel choice.
uniform vec2  uTexel;
uniform int   uMode;           // operator
uniform int   uSource;         // motion source channel (0..4)
uniform float uGain;
uniform float uDt;
uniform float uInteriorDamp;   // 0..1 : how much to damp inside the set
uniform float uEdgeMargin;     // 0..0.25 : force fade-to-zero margin near sim boundaries
uniform float uForceCap;       // absolute clamp on final force magnitude (per-pixel)
uniform int   uMaxIter;        // for source-normalisation compensation (see below)

// Pull the chosen scalar out of the packed motion-source MRTs. Using a
// switch keeps this branch-free under uniform control-flow — the GPU
// resolves to one texture sample + channel select per fragment.
//   0=DE  1=smoothPot  2=stripe       (channels of uJulia / outMain)
//   3=paletteLuma                     (REC601 luma of uJuliaFx.rgb)
//   4=mask                            (.a of uJuliaFx)
// outMain.a holds the dye injection gate, NOT a motion source — palette
// luminance is derived from outFx.rgb instead.
const vec3 LUMA_W = vec3(0.299, 0.587, 0.114);
float pickSource(vec2 uv) {
  if (uSource == 3) return dot(texture(uJuliaFx, uv).rgb, LUMA_W);
  if (uSource == 4) return texture(uJuliaFx, uv).a;
  vec4 m = texture(uJulia, uv);
  if (uSource == 0) return m.r;
  if (uSource == 1) return m.g;
  return m.b;                    // stripe (uSource == 2)
}
float pickSourcePrev(vec2 uv) {
  if (uSource == 3) return dot(texture(uJuliaPrevFx, uv).rgb, LUMA_W);
  if (uSource == 4) return texture(uJuliaPrevFx, uv).a;
  vec4 m = texture(uJuliaPrev, uv);
  if (uSource == 0) return m.r;
  if (uSource == 1) return m.g;
  return m.b;
}

void main() {
  // smoothPot is the canonical "interior vs exterior" indicator (1 inside, < 1
  // outside). Read it once for damping + escape gating, regardless of which
  // source the user picked for the operator.
  float smoothPot = texture(uJulia, vUv).g;
  float escaped = (smoothPot < 0.999) ? 1.0 : 0.0;

  // Sample the chosen source at centre + 4 cardinal neighbours.
  float sC = pickSource(vUv);
  float sL = pickSource(vL);
  float sR = pickSource(vR);
  float sT = pickSource(vT);
  float sB = pickSource(vB);

  // Central-difference gradient of the source.
  vec2 grad = vec2(sR - sL, sT - sB) * 0.5;

  vec2 force = vec2(0.0);

  if (uMode == 0) {
    // Gradient: normalised ∇S, magnitude clamp on |∇S|.
    float g = length(grad);
    vec2 dir = (g > 1e-6) ? grad / g : vec2(0.0);
    force = dir * clamp(g * 0.6, 0.0, 1.5);
  } else if (uMode == 1) {
    // Curl: perpendicular of ∇S — swirls along level sets, divergence-free.
    vec2 perp = vec2(-grad.y, grad.x);
    float g = length(perp);
    vec2 dir = (g > 1e-6) ? perp / g : vec2(0.0);
    force = dir * clamp(g * 0.8, 0.0, 1.8);
  } else if (uMode == 2) {
    // Direct: push along ∇S direction with magnitude proportional to S
    // (rather than to |∇S|). Useful when the source has clean iso-bands
    // — flow goes "along the bands" weighted by band brightness.
    float g = length(grad);
    vec2 dir = (g > 1e-6) ? grad / g : vec2(0.0);
    force = dir * clamp(sC * 1.5, 0.0, 2.0);
  } else if (uMode == 3) {
    // Temporal delta: gradient of (S_now − S_prev). Captures motion of
    // the field — what was static last frame contributes nothing,
    // changing regions get a directional kick. Replaces the legacy
    // "C-Track" mode and works on any source.
    float dC = sC - pickSourcePrev(vUv);
    float dL = sL - pickSourcePrev(vL);
    float dR = sR - pickSourcePrev(vR);
    float dT = sT - pickSourcePrev(vT);
    float dB = sB - pickSourcePrev(vB);
    vec2 dGrad = vec2(dR - dL, dT - dB) * 0.5;
    float g = length(dGrad);
    vec2 dir = (g > 1e-6) ? dGrad / g : vec2(0.0);
    // Magnitude includes a per-frame normalisation so tiny dt doesn't
    // blow up. Mirrors the original c-track scaling.
    force = dir * clamp(g * 3.0 + abs(dC) * 0.2, 0.0, 3.0);
    force *= clamp(1.0 / max(uDt, 0.016), 0.0, 40.0);
  } else if (uMode == 4) {
    // Hue: read the baked palette colour, derive a hue angle, output a
    // unit vector in that direction scaled by colour magnitude. Ignores
    // uSource — the operator IS the source here.
    vec3 col = texture(uJuliaFx, vUv).rgb;
    float hueAngle = atan(col.g - col.b, col.r - 0.5);
    float val = length(col);
    force = vec2(cos(hueAngle), sin(hueAngle)) * val;
  }

  // Source-normalisation compensation. Every motion source is in roughly
  // [0, 1] (smoothPot = smoothIter / maxIter; DE / stripe / mask / palette
  // luma all in [0, 1]) so legacy forceGain values calibrated against the
  // OLD motion shader (which read raw smoothIter, range [0, maxIter])
  // would now be ~maxIter× too weak. Scaling here restores those gains.
  // Empirically maxIter × 0.1 lands closest to the previous feel — the
  // raw maxIter scaling was ~10× too strong because the old shader's
  // gradient often clamped into the saturation regime, so its effective
  // magnitude was below the full maxIter range.
  force *= 0.1 * float(max(uMaxIter, 1));

  // Optionally damp inside the set (escaped = 0) — the interior is a "still lake".
  float damp = mix(1.0 - uInteriorDamp, 1.0, escaped);
  force *= damp;

  // Edge fade: prevents boundary artefacts from the pressure-Jacobi solve
  // reading clamped-edge neighbours. Tapers force to 0 in a thin margin.
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);
  force *= edgeFade;

  // Per-pixel magnitude cap.
  float fMag = length(force);
  if (fMag > uForceCap && fMag > 1e-6) {
    force *= uForceCap / fMag;
  }

  // Solid obstacles emit no force into the fluid.
  float solid = texture(uMask, vUv).a;
  force *= (1.0 - solid);

  // Injection colour is now produced by FRAG_INJECT_DYE directly off the
  // baked palette + injection-gate channel, so the force texture's b/a
  // are unused here. Kept zero for predictable downstream reads.
  fragColor = vec4(force * uGain, 0.0, 0.0);
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
  float solid = texture(uMask, vUv).a;  // mask lives in .a of the Julia outFx (RGB = palette colour)
  fragColor = vec4((v + f * uDt) * (1.0 - solid), 0.0, 1.0);
}`;

// -----------------------------------------------------------------------------
// Inject fractal colour into dye texture. Reads the Julia MRT's pre-baked
// palette colour (uJuliaFx.rgb), collision mask (uJuliaFx.a), and
// injection-rate gate (uJulia.a — escape * main-gradient stop alpha).
// Does its own dye-decay step in OKLab so fades stay perceptually clean.
// -----------------------------------------------------------------------------
export const FRAG_INJECT_DYE = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uJulia;       // motion-source MRT — .a is the dye injection gate
uniform sampler2D uJuliaFx;     // pre-baked palette (rgb) + collision mask (a)
uniform sampler2D uMask;        // alias for uJuliaFx — bound separately for clarity
uniform float uDyeGain;
uniform float uDyeFadeHz;
uniform float uDt;
uniform float uEdgeMargin;
uniform int   uDyeBlend;        // 0 add, 1 screen, 2 max, 3 over (alpha)
uniform int   uDyeDecayMode;    // 0 linear, 1 perceptual (OKLab L-decay), 2 vivid (chroma-boost)
uniform float uDyeChromaFadeHz; // per-second chroma decay rate (perceptual / vivid only)
uniform float uDyeSatBoost;     // per-frame chroma multiplier applied after decay
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
  vec4  d        = texture(uDye, vUv);
  vec3  palette  = texture(uJuliaFx, vUv).rgb;
  float gate     = texture(uJulia,   vUv).a;      // escape * main-gradient stop alpha, mean-pooled
  float dEdge    = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin, dEdge);

  // Per-pixel injection rate. Same factors as the legacy path:
  // (escape * stop-alpha) folded into 'gate', uDyeGain, uDt, edgeFade.
  float rate = gate * uDyeGain * uDt * edgeFade;
  vec3 injectAdd = palette * rate;
  vec3 aged      = decayDye(d.rgb);
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
    // Over (alpha-compositing): uses rate as a visible alpha scaling.
    float a = clamp(rate * 8.0, 0.0, 1.0);
    col = aged * (1.0 - a) + palette * a;
  }

  // Solid obstacles: no dye inside — they're walls, not flowing medium.
  float solid = texture(uMask, vUv).a;
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
  float solid = texture(uMask, vUv).a;  // mask lives in .a of the Julia outFx (RGB = palette colour)
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
  float solid = texture(uMask, vUv).a;  // mask lives in .a of the Julia outFx (RGB = palette colour)
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
