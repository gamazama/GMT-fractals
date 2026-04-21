var Qe=Object.defineProperty;var Ze=(o,e,i)=>e in o?Qe(o,e,{enumerable:!0,configurable:!0,writable:!0,value:i}):o[e]=i;var g=(o,e,i)=>Ze(o,typeof e!="symbol"?e+"":e,i);import{aC as x,W as et,E as tt,X as rt,a1 as it,aP as ot}from"./GenericDropdown-DTxFjByw.js";import{j as r,r as p,R as ue}from"./three-fiber-C5DkfiAm.js";import{c as at}from"./three-drei-hqOrdlmR.js";import nt from"./AdvancedGradientEditor-fpOC7CGu.js";import{b as st}from"./EmbeddedColorPicker-Tn8XCUiU.js";import"./three-DZB2NGqN.js";import"./pako-DwGzBETv.js";const Re=`
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
`,L=`#version 300 es
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
}`,lt=`#version 300 es
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

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uAspect;
  vec2 p = uCenter + uv * uScale;

  vec2 z, c;
  if (uKind == 0) { z = p; c = uJuliaC; }
  else            { z = vec2(0.0); c = p; }

  float escaped = 0.0;
  float iters = float(uMaxIter);

  // Accumulators for coloring modes
  float minT      = 1e9;
  float trapIter  = 0.0;
  float stripeSum = 0.0;
  int   stripeCount = 0;
  // dz for derivative / DE (only correct for power 2; close enough for general use)
  vec2  dz = vec2(1.0, 0.0);

  for (int i = 0; i < 4096; ++i) {
    if (i >= uMaxIter) break;

    // Derivative update: dz = p·z^(p-1)·dz + 1 (approximated for p=2 as 2·z·dz + 1).
    // For other powers this slightly mis-estimates |dz| but keeps the feature alive.
    dz = cmul(2.0 * z, dz) + vec2(1.0, 0.0);

    z = cpow(z, uPower) + c;

    // Coloring accumulators — capped at uColorIter so the user can tune how much
    // of the orbit feeds colour vs escape testing.
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

  outMain = vec4(z, iters, escaped);
  outAux  = vec4(minT, stripeAvg, logDz, trapIterN);
}`,ct=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;

uniform sampler2D uJulia;
uniform sampler2D uJuliaPrev;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;
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
${Re}

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

  fragColor = vec4(force * uGain, injectColor.r, injectColor.g + injectColor.b * 0.5);
}`,ut=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uForce;
uniform float uDt;
void main() {
  vec2 v = texture(uVelocity, vUv).rg;
  vec2 f = texture(uForce, vUv).rg;
  fragColor = vec4(v + f * uDt, 0.0, 1.0);
}`,dt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;
uniform float uDyeGain;
uniform float uDyeFadeHz;
uniform float uDt;
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
uniform float uEdgeMargin;
uniform int   uDyeBlend;    // 0 add, 1 screen, 2 max, 3 over (alpha)
${Re}
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
  vec3 injectAdd  = grad.rgb * rate;
  vec3 decay = vec3(exp(-uDyeFadeHz * uDt));   // per-frame persistence for existing dye
  vec3 col;

  if (uDyeBlend == 0) {
    // Add: classic accumulation. Simple, bright, can clip to 1.0 at heavy injection.
    col = d.rgb * decay + injectAdd;
  } else if (uDyeBlend == 1) {
    // Screen: 1 − (1−d)(1−i). Overlaps glow; never exceeds 1.0 mathematically.
    vec3 i = clamp(injectAdd, 0.0, 1.0);
    col = 1.0 - (1.0 - d.rgb * decay) * (1.0 - i);
  } else if (uDyeBlend == 2) {
    // Max: hold the brightest. Good for preserving vivid strokes over faded ones.
    col = max(d.rgb * decay, injectAdd);
  } else {
    // Over (alpha-compositing): uses grad.α + rate to mask the new colour onto old.
    float a = clamp(rate * 8.0, 0.0, 1.0);   // scale so "rate" reads like a visible alpha
    col = d.rgb * decay * (1.0 - a) + grad.rgb * a;
  }

  fragColor = vec4(col, 1.0);
}`,ht=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;      // field to advect (could be velocity itself)
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;     // per-second decay
uniform float uEdgeMargin;      // soft no-slip wall — only applies in the outer half of this margin
void main() {
  vec2 v = texture(uVelocity, vUv).rg;
  vec2 prev = vUv - v * uDt * uTexel;   // backtrace in UV-space
  vec4 val = texture(uSource, prev);
  float decay = 1.0 / (1.0 + uDissipation * uDt);
  // Gentle wall: fade only the last ~half of the edge margin, so velocity/dye
  // don't get crushed in the bulk. Keeps the fluid lively while still preventing
  // "stuff piling up at the borders".
  float dEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float edgeFade = (uEdgeMargin <= 0.0) ? 1.0 : smoothstep(0.0, uEdgeMargin * 0.5, dEdge);
  fragColor = val * decay * edgeFade;
}`,pt=`#version 300 es
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
}`,ft=`#version 300 es
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
}`,mt=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uStrength;
uniform float uDt;
void main() {
  float L = texture(uCurl, vL).r;
  float R = texture(uCurl, vR).r;
  float T = texture(uCurl, vT).r;
  float B = texture(uCurl, vB).r;
  float C = texture(uCurl, vUv).r;
  vec2 eta = vec2(abs(T) - abs(B), abs(R) - abs(L));
  float mag = length(eta) + 1e-5;
  eta /= mag;
  eta.y = -eta.y;
  vec2 force = eta * C * uStrength;
  vec2 v = texture(uVelocity, vUv).rg;
  fragColor = vec4(v + force * uDt, 0.0, 1.0);
}`,gt=`#version 300 es
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
}`,xt=`#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL, vR, vT, vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).r;
  float R = texture(uPressure, vR).r;
  float T = texture(uPressure, vT).r;
  float B = texture(uPressure, vB).r;
  vec2 v = texture(uVelocity, vUv).rg;
  v -= vec2(R - L, T - B) * 0.5;
  fragColor = vec4(v, 0.0, 1.0);
}`,vt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
uniform float uAspect;
void main() {
  vec2 d = vUv - uPoint;
  d.x *= uAspect;
  float g = exp(-dot(d,d) / uRadius);
  vec4 base = texture(uTarget, vUv);
  base.rgb += uValue * g;
  fragColor = base;
}`,bt=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform sampler2D uGradient;
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
uniform float uCaustics;       // 0..25 — laplacian-of-dye highlight
${Re}

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

  // ── Liquid-look refraction. The gradient of dye luminance acts as a fake
  // height-field slope; we offset the fractal sample by that gradient. The
  // stencil width (uRefractSmooth, in dye texels) controls smoothness:
  // larger values sample further-apart neighbours → lower-frequency gradient
  // → smoother refraction without the per-pixel jitter of a raw 1-texel diff.
  vec2 refractOffset = vec2(0.0);
  float caustic = 0.0;
  if (uRefraction > 0.0 || uCaustics > 0.0) {
    vec2 t = uTexelDye * max(uRefractSmooth, 1.0);
    float lC = dot(texture(uDye, vUv).rgb,                  LUM_REC601);
    float lL = dot(texture(uDye, vUv - vec2(t.x, 0.0)).rgb, LUM_REC601);
    float lR = dot(texture(uDye, vUv + vec2(t.x, 0.0)).rgb, LUM_REC601);
    float lD = dot(texture(uDye, vUv - vec2(0.0, t.y)).rgb, LUM_REC601);
    float lU = dot(texture(uDye, vUv + vec2(0.0, t.y)).rgb, LUM_REC601);
    refractOffset = vec2(lR - lL, lU - lD) * uRefraction;
    // Laplacian for caustics. Dividing by the stencil scale keeps the
    // caustic magnitude roughly invariant when the user tweaks smoothness.
    caustic = max(0.0, (lL + lR + lU + lD - 4.0 * lC)) / max(uRefractSmooth, 1.0);
  }

  vec4 j = texture(uJulia, uv + refractOffset);
  vec4 aux = texture(uJuliaAux, uv + refractOffset);
  vec3 dye = texture(uDye, uv).rgb;
  vec2 v = texture(uVelocity, uv).rg;

  vec3 juliaColor = gradientForJulia(j, aux) * j.a;
  juliaColor = mix(uInteriorColor, juliaColor, j.a);

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
}`,yt=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,wt=`#version 300 es
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
}`,Ct=`#version 300 es
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
}`,Tt=`#version 300 es
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
}`,jt=`#version 300 es
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
}`,Se=1e-5,Be=8,ke=5,Mt=.002,Rt=.005,Dt=5,Ft=.2,Et=.002,Ie=192,At=128,St=35,Bt=58,kt=1.5,It=8,Pt=1500,we=256,Ut=.5,Pe={enabled:!1,radius:.02,speed:.4},Nt=30,Ot=[{id:"none",label:"None",hint:"No compression. Vivid colours, will clip if exposure is too high."},{id:"reinhard",label:"Reinhard",hint:"Classic c/(1+c). Smooth but desaturates highlights."},{id:"agx",label:"AgX",hint:"Sobotka 2023. Hue-stable, vibrant highlights — best for rich colours."},{id:"filmic",label:"Filmic",hint:"Hable/Uncharted filmic. Cinematic contrast with gentle roll-off."}];function _t(o){switch(o){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}const Lt=[{id:"plain",label:"Plain",hint:"No post-processing — pure fluid+fractal composite."},{id:"electric",label:"Electric",hint:"Bloom + velocity-keyed chromatic aberration — plasma and lightning energy."},{id:"liquid",label:"Liquid",hint:"Dye-gradient refraction + laplacian caustics — water over glass."}],Ue=[{id:"add",label:"Add",hint:"Linear accumulate — bright strokes build up, classic fluid look."},{id:"screen",label:"Screen",hint:"1−(1−d)(1−i) — overlapping dye glows brighter, never clips to full white."},{id:"max",label:"Max",hint:"Per-channel max — keeps the brightest layer, leaves darker alone."},{id:"over",label:"Over",hint:"Alpha compositing — uses the gradient's α to fade / mask dye onto existing."}];function Gt(o){switch(o){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}const Ne=[{id:"iterations",label:"Iterations",hint:"Smooth iteration count. Classic escape-time coloring."},{id:"angle",label:"Angle",hint:"arg(z_final). Gradient wraps around the set."},{id:"magnitude",label:"Magnitude",hint:"|z_final|. Brighter at faster escape."},{id:"decomposition",label:"Decomp",hint:"Binary by sign(imag z). Reveals the Julia domains."},{id:"bands",label:"Bands",hint:"Hard bands per integer iter — maximum banding."},{id:"orbit-point",label:"Trap·point",hint:"Orbit trap: min distance from the iteration to a point."},{id:"orbit-circle",label:"Trap·circle",hint:"Orbit trap: min distance to a ring of given radius."},{id:"orbit-cross",label:"Trap·cross",hint:"Orbit trap: min approach to the X/Y axes."},{id:"orbit-line",label:"Trap·line",hint:"Orbit trap: min distance to an arbitrary line."},{id:"stripe",label:"Stripe",hint:"Härkönen stripe-average — ⟨½+½·sin(k·arg z)⟩."},{id:"distance",label:"DE",hint:"Distance-estimate to the set. Crisp boundary glow."},{id:"derivative",label:"Derivative",hint:"log|dz/dc| — how fast orbits stretch around c."},{id:"potential",label:"Potential",hint:"log²|z| / 2ⁿ — continuous Böttcher potential."},{id:"trap-iter",label:"Trap iter",hint:"Iteration at which the trap minimum was reached."}];function Ce(o){switch(o){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function zt(o){switch(o){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const xe={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-1200,interiorDamp:.59,dt:.016,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",toneMapping:"none",exposure:1,vibrance:1.645,fluidStyle:"plain",bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,paused:!1,simResolution:1344,autoQuality:!0};class Vt{constructor(e){g(this,"gl");g(this,"canvas");g(this,"quadVbo");g(this,"progJulia");g(this,"progMotion");g(this,"progAddForce");g(this,"progInjectDye");g(this,"progAdvect");g(this,"progDivergence");g(this,"progCurl");g(this,"progVorticity");g(this,"progPressure");g(this,"progGradSub");g(this,"progSplat");g(this,"progDisplay");g(this,"progClear");g(this,"progReproject");g(this,"progBloomExtract");g(this,"progBloomDown");g(this,"progBloomUp");g(this,"bloomA");g(this,"bloomB");g(this,"bloomC");g(this,"bloomDirty",!0);g(this,"lastCenter",[0,0]);g(this,"lastZoom",1.5);g(this,"firstFrame",!0);g(this,"simW",0);g(this,"simH",0);g(this,"juliaCur");g(this,"juliaPrev");g(this,"forceTex");g(this,"velocity");g(this,"dye");g(this,"divergence");g(this,"pressure");g(this,"curl");g(this,"gradientTex",null);g(this,"params",{...xe});g(this,"lastTimeMs",0);g(this,"framebufferFormat");this.canvas=e;const i=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!i)throw new Error("WebGL2 required — your browser does not support it.");this.gl=i;const t=i.getExtension("EXT_color_buffer_float"),n=i.getExtension("EXT_color_buffer_half_float");if(!t&&!n)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=i.createBuffer(),i.bindBuffer(i.ARRAY_BUFFER,this.quadVbo),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),i.STATIC_DRAW),this.compileAll(),this.allocateTextures(this.params.simResolution)}detectFormat(){const e=this.gl,i=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const t of i){const n=e.createTexture();e.bindTexture(e.TEXTURE_2D,n),e.texImage2D(e.TEXTURE_2D,0,t.internal,4,4,0,t.format,t.type,null);const c=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,c),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0);const u=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(c),e.deleteTexture(n),u===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${t.name} render targets.`),t}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,i){const t=this.gl,n=t.createShader(e);if(t.shaderSource(n,i),t.compileShader(n),!t.getShaderParameter(n,t.COMPILE_STATUS)){const c=t.getShaderInfoLog(n)||"",u=i.split(`
`).map((h,v)=>`${String(v+1).padStart(4)}: ${h}`).join(`
`);throw console.error(`Shader compile error:
${c}
${u}`),new Error(`Shader compile error: ${c}`)}return n}linkProgram(e,i,t){const n=this.gl,c=this.compileShader(n.VERTEX_SHADER,e),u=this.compileShader(n.FRAGMENT_SHADER,i),h=n.createProgram();if(n.attachShader(h,c),n.attachShader(h,u),n.bindAttribLocation(h,0,"aPos"),n.linkProgram(h),!n.getProgramParameter(h,n.LINK_STATUS))throw new Error(`Program link error: ${n.getProgramInfoLog(h)}`);n.deleteShader(c),n.deleteShader(u);const v={};for(const T of t)v[T]=n.getUniformLocation(h,T);return{prog:h,uniforms:v}}compileAll(){this.progJulia=this.linkProgram(L,lt,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq"]),this.progMotion=this.linkProgram(L,ct,["uTexel","uJulia","uJuliaPrev","uJuliaAux","uGradient","uMode","uGain","uDt","uInteriorDamp","uDyeGain","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uForceCap"]),this.progAddForce=this.linkProgram(L,ut,["uTexel","uVelocity","uForce","uDt"]),this.progInjectDye=this.linkProgram(L,dt,["uTexel","uDye","uJulia","uJuliaAux","uGradient","uDyeGain","uDyeFadeHz","uDt","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uDyeBlend"]),this.progAdvect=this.linkProgram(L,ht,["uTexel","uVelocity","uSource","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(L,pt,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(L,ft,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(L,mt,["uTexel","uVelocity","uCurl","uStrength","uDt"]),this.progPressure=this.linkProgram(L,gt,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(L,xt,["uTexel","uPressure","uVelocity"]),this.progSplat=this.linkProgram(L,vt,["uTexel","uTarget","uPoint","uValue","uRadius","uAspect"]),this.progDisplay=this.linkProgram(L,bt,["uTexel","uTexelDisplay","uTexelDye","uJulia","uJuliaAux","uDye","uVelocity","uGradient","uBloom","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uCaustics"]),this.progClear=this.linkProgram(L,yt,["uValue"]),this.progReproject=this.linkProgram(L,jt,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"]),this.progBloomExtract=this.linkProgram(L,wt,["uTexel","uSource","uThreshold","uSoftKnee"]),this.progBloomDown=this.linkProgram(L,Ct,["uTexel","uSource"]),this.progBloomUp=this.linkProgram(L,Tt,["uTexel","uSource","uPrev","uIntensity"])}createFBO(e,i){const t=this.gl,n=t.createTexture();t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,i,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const c=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,c),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,n,0),t.viewport(0,0,e,i),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{tex:n,fbo:c,width:e,height:i,texel:[1/e,1/i]}}createMrtFbo(e,i){const t=this.gl,n=()=>{const v=t.createTexture();return t.bindTexture(t.TEXTURE_2D,v),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,i,0,this.framebufferFormat.format,this.framebufferFormat.type,null),v},c=n(),u=n(),h=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,h),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,c,0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,u,0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,i),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texMain:c,texAux:u,fbo:h,width:e,height:i,texel:[1/e,1/i]}}deleteMrtFbo(e){if(!e)return;const i=this.gl;i.deleteTexture(e.texMain),i.deleteTexture(e.texAux),i.deleteFramebuffer(e.fbo)}createDoubleFBO(e,i){let t=this.createFBO(e,i),n=this.createFBO(e,i);return{width:e,height:i,texel:[1/e,1/i],get read(){return t},get write(){return n},swap(){const u=t;t=n,n=u}}}deleteFBO(e){if(!e)return;const i=this.gl;i.deleteTexture(e.tex),i.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateTextures(e){const i=this.canvas.width/Math.max(1,this.canvas.height),t=Math.max(32,e|0),n=Math.max(32,Math.round(t*i));n===this.simW&&t===this.simH&&this.juliaCur||(this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.simW=n,this.simH=t,this.juliaCur=this.createMrtFbo(n,t),this.juliaPrev=this.createMrtFbo(n,t),this.forceTex=this.createFBO(n,t),this.velocity=this.createDoubleFBO(n,t),this.dye=this.createDoubleFBO(n,t),this.divergence=this.createFBO(n,t),this.pressure=this.createDoubleFBO(n,t),this.curl=this.createFBO(n,t),this.firstFrame=!0)}bindFBO(e){const i=this.gl;i.bindFramebuffer(i.FRAMEBUFFER,e.fbo),i.viewport(0,0,e.width,e.height)}useProgram(e){const i=this.gl;i.useProgram(e.prog),i.bindBuffer(i.ARRAY_BUFFER,this.quadVbo),i.enableVertexAttribArray(0),i.vertexAttribPointer(0,2,i.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,i,t){const n=this.gl,c=e.uniforms.uTexel;c&&n.uniform2f(c,1/i,1/t)}bindTex(e,i,t){const n=this.gl;n.activeTexture(n.TEXTURE0+e),n.bindTexture(n.TEXTURE_2D,i),t&&n.uniform1i(t,e)}setParams(e){this.params={...this.params,...e},e.simResolution&&e.simResolution!==this.simH&&this.allocateTextures(e.simResolution)}setGradientBuffer(e){const i=this.gl,t=we*4;e.length!==t&&console.warn(`[FluidEngine] gradient buffer unexpected length ${e.length} (want ${t})`),this.gradientTex||(this.gradientTex=i.createTexture()),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,this.gradientTex),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,we,1,0,i.RGBA,i.UNSIGNED_BYTE,e)}ensureGradient(){if(this.gradientTex)return;const e=we,i=new Uint8Array(e*4);for(let t=0;t<e;++t)i[t*4+0]=t,i[t*4+1]=t,i[t*4+2]=t,i[t*4+3]=255;this.setGradientBuffer(i)}resize(e,i){const t=Math.min(window.devicePixelRatio||1,2),n=Math.max(1,Math.round(e*t)),c=Math.max(1,Math.round(i*t));(this.canvas.width!==n||this.canvas.height!==c)&&(this.canvas.width=n,this.canvas.height=c,this.allocateTextures(this.params.simResolution),this.bloomDirty=!0)}ensureBloomFbos(){if(!this.bloomDirty&&this.bloomA)return;this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC);const e=this.canvas.width,i=this.canvas.height,t=Math.max(4,e>>1&-2),n=Math.max(4,i>>1&-2),c=Math.max(2,e>>2&-2),u=Math.max(2,i>>2&-2),h=Math.max(2,e>>3&-2),v=Math.max(2,i>>3&-2);this.bloomA=this.createFBO(t,n),this.bloomB=this.createFBO(c,u),this.bloomC=this.createFBO(h,v),this.bloomDirty=!1}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const i of[this.velocity,this.dye,this.pressure])for(const t of[i.read,i.write])this.bindFBO(t),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,i,t,n){const c=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),c.uniform2f(this.progSplat.uniforms.uPoint,i,t),c.uniform3f(this.progSplat.uniforms.uValue,n[0],n[1],n[2]),c.uniform1f(this.progSplat.uniforms.uRadius,Et),c.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}splatForce(e,i,t,n,c,u){e=Math.max(0,Math.min(1,e)),i=Math.max(0,Math.min(1,i)),this.splat(this.velocity,e,i,[t*c,n*c,0]),this.splat(this.dye,e,i,u),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}renderJulia(){const e=this.gl,i=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=i,e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const t=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,t),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(t,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,zt(this.params.colorMapping)),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq),this.drawQuad()}computeForce(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,this.juliaCur.texAux,this.progMotion.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMotion.uniforms.uGradient),e.uniform1i(this.progMotion.uniforms.uMode,Jt(this.params.forceMode)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uDyeGain,this.params.dyeInject),e.uniform1i(this.progMotion.uniforms.uColorMapping,Ce(this.params.colorMapping)),e.uniform1f(this.progMotion.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMotion.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH),this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,this.juliaCur.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(2,this.gradientTex,this.progInjectDye.uniforms.uGradient),this.bindTex(4,this.juliaCur.texAux,this.progInjectDye.uniforms.uJuliaAux),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1i(this.progInjectDye.uniforms.uColorMapping,Ce(this.params.colorMapping)),e.uniform1f(this.progInjectDye.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progInjectDye.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,Gt(this.params.dyeBlend)),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let i=0;i<this.params.pressureIters;++i)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.drawQuad(),this.velocity.swap()}advect(e,i){const t=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),t.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),t.uniform1f(this.progAdvect.uniforms.uDissipation,i),t.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,i,t){const n=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),n.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),n.uniform2f(this.progReproject.uniforms.uOldCenter,i[0],i[1]),n.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),n.uniform1f(this.progReproject.uniforms.uOldZoom,t),n.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],i=this.params.center[1]-this.lastCenter[1],t=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(i)<1e-7&&Math.abs(t)<1e-7)return;const n=[this.lastCenter[0],this.lastCenter[1]],c=this.lastZoom;this.reprojectTexture(this.dye,n,c),this.reprojectTexture(this.velocity,n,c),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.ensureGradient();const i=this.params.bloomAmount>.001;i&&(this.ensureBloomFbos(),this.bindFBO(this.bloomA),this.setDisplayUniforms(null,!0),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomExtract),e.uniform2f(this.progBloomExtract.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomA.tex,this.progBloomExtract.uniforms.uSource),e.uniform1f(this.progBloomExtract.uniforms.uThreshold,this.params.bloomThreshold),e.uniform1f(this.progBloomExtract.uniforms.uSoftKnee,Ut),this.drawQuad(),this.bindFBO(this.bloomC),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomA),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomUp),e.uniform2f(this.progBloomUp.uniforms.uTexel,this.bloomC.texel[0],this.bloomC.texel[1]),this.bindTex(0,this.bloomC.tex,this.progBloomUp.uniforms.uSource),this.bindTex(1,this.bloomA.tex,this.progBloomUp.uniforms.uPrev),e.uniform1f(this.progBloomUp.uniforms.uIntensity,1),this.drawQuad()),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(i?this.bloomB:null,!1),this.drawQuad()}setDisplayUniforms(e,i=!1){const t=this.gl;this.useProgram(this.progDisplay),t.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),t.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH),this.bindTex(0,this.juliaCur.texMain,this.progDisplay.uniforms.uJulia),this.bindTex(4,this.juliaCur.texAux,this.progDisplay.uniforms.uJuliaAux),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradientTex,this.progDisplay.uniforms.uGradient),this.bindTex(5,(e==null?void 0:e.tex)??this.gradientTex,this.progDisplay.uniforms.uBloom),t.uniform1i(this.progDisplay.uniforms.uShowMode,Ht(this.params.show)),t.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),t.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),t.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),t.uniform1i(this.progDisplay.uniforms.uColorMapping,Ce(this.params.colorMapping)),t.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),t.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),t.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),i?(t.uniform1i(this.progDisplay.uniforms.uToneMapping,0),t.uniform1f(this.progDisplay.uniforms.uExposure,1),t.uniform1f(this.progDisplay.uniforms.uVibrance,0),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),t.uniform1f(this.progDisplay.uniforms.uAberration,0),t.uniform1f(this.progDisplay.uniforms.uRefraction,0),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),t.uniform1f(this.progDisplay.uniforms.uCaustics,0)):(t.uniform1i(this.progDisplay.uniforms.uToneMapping,_t(this.params.toneMapping)),t.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),t.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),t.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),t.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),t.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics))}frame(e){const i=this.gl,t=this.lastTimeMs===0?.016:Math.min(.05,(e-this.lastTimeMs)/1e3);this.lastTimeMs=e,this.params.dt=t,this.renderJulia(),this.params.paused||(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,null)}dispose(){const e=this.gl;this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.gradientTex&&(e.deleteTexture(this.gradientTex),this.gradientTex=null),this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC),e.deleteBuffer(this.quadVbo);for(const i of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject])i!=null&&i.prog&&e.deleteProgram(i.prog)}canvasToFractal(e,i){const t=this.canvas.getBoundingClientRect(),n=(e-t.left)/t.width,c=1-(i-t.top)/t.height,u=this.canvas.width/this.canvas.height,h=(n*2-1)*u*this.params.zoom+this.params.center[0],v=(c*2-1)*this.params.zoom+this.params.center[1];return[h,v]}canvasToUv(e,i){const t=this.canvas.getBoundingClientRect();return[(e-t.left)/t.width,1-(i-t.top)/t.height]}}function Jt(o){switch(o){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function Ht(o){switch(o){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}function Xt({tabs:o,active:e,onChange:i,className:t=""}){return r.jsx("div",{className:`flex bg-black/40 border-b border-white/10 ${t}`,children:o.map(n=>r.jsxs("button",{onClick:()=>i(n),className:`flex-1 py-2 text-[10px] font-bold transition-all relative ${e===n?"text-cyan-400 bg-white/5":"text-gray-500 hover:text-gray-300 hover:bg-white/5"}`,children:[n,e===n&&r.jsx("div",{className:"absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"})]},n))})}const Oe=96;function Wt(o,e){const t=(e-Math.floor(e))*256,n=Math.floor(t)%256,c=(n+1)%256,u=t-Math.floor(t),h=o[n*4+0]*(1-u)+o[c*4+0]*u,v=o[n*4+1]*(1-u)+o[c*4+1]*u,T=o[n*4+2]*(1-u)+o[c*4+2]*u;return[h,v,T]}function Yt(o,e,i,t){switch(t){case"angle":return Math.atan2(i,e)*.15915494+.5;case"magnitude":return Math.max(0,Math.min(1,Math.hypot(e,i)*.08));case"decomposition":return(i>=0?.5:0)+.25;case"bands":return Math.floor(o)*.0625;case"potential":{const n=Math.max(e*e+i*i,1.0001);return Math.log2(Math.log2(n))*.5%1}case"orbit-point":case"orbit-circle":case"orbit-cross":case"orbit-line":case"stripe":case"distance":case"derivative":case"trap-iter":case"iterations":default:return o*.05}}function qt(o,e,i,t,n,c,u,h,v,T){const J=new ImageData(o,o),A=J.data,U=Math.round(v[0]*255),I=Math.round(v[1]*255),B=Math.round(v[2]*255),k=Math.round(T),H=Math.abs(T-k)<.01&&k>=2&&k<=8;for(let E=0;E<o;E++){const y=i+(E/o*2-1)*t;for(let d=0;d<o;d++){const S=e+(d/o*2-1)*t;let F=0,a=0,C=0;for(;C<Oe;C++){const oe=F*F,fe=a*a;if(oe+fe>16)break;let ae,Z;if(H){let N=F,V=a;for(let ne=1;ne<k;ne++){const de=N*F-V*a;V=N*a+V*F,N=de}ae=N,Z=V}else{const N=Math.sqrt(oe+fe),V=Math.atan2(a,F),ne=Math.pow(N,T),de=V*T;ae=ne*Math.cos(de),Z=ne*Math.sin(de)}F=ae+S,a=Z+y}const b=((o-1-E)*o+d)*4;if(C>=Oe)A[b+0]=U,A[b+1]=I,A[b+2]=B;else{const oe=C+1-Math.log2(Math.max(1e-6,.5*Math.log2(F*F+a*a))),ae=Yt(oe,F,a,h)*c+u,[Z,N,V]=Wt(n,ae);A[b+0]=Math.round(Z),A[b+1]=Math.round(N),A[b+2]=Math.round(V)}A[b+3]=255}}return J}const $t=(()=>{const o=new Uint8Array(1024);for(let e=0;e<256;e++)o[e*4]=o[e*4+1]=o[e*4+2]=e,o[e*4+3]=255;return o})(),Kt=({cx:o,cy:e,onChange:i,halfExtent:t=1.6,centerX:n=-.5,centerY:c=0,size:u=220,gradientLut:h,gradientRepeat:v=1,gradientPhase:T=0,colorMapping:J="iterations",interiorColor:A=[.04,.04,.06],power:U=2})=>{const I=p.useRef(null),B=p.useRef(null),k=p.useRef(!1);p.useEffect(()=>{const y=I.current;if(!y)return;const d=y.getContext("2d");if(!d)return;y.width=u,y.height=u;const F=qt(u,n,c,t,h??$t,v,T,J,A,U);B.current=F,d.putImageData(F,0,0),H()},[u,n,c,t,h,v,T,J,A[0],A[1],A[2],U]);const H=p.useCallback(()=>{const y=I.current;if(!y||!B.current)return;const d=y.getContext("2d");if(!d)return;d.putImageData(B.current,0,0);const S=(o-n)/t*.5+.5,F=(e-c)/t*.5+.5,a=S*u,C=(1-F)*u;d.strokeStyle="#fff",d.lineWidth=1,d.beginPath(),d.moveTo(a-8,C),d.lineTo(a-2,C),d.moveTo(a+2,C),d.lineTo(a+8,C),d.moveTo(a,C-8),d.lineTo(a,C-2),d.moveTo(a,C+2),d.lineTo(a,C+8),d.stroke(),d.strokeStyle="rgba(0,255,200,0.9)",d.beginPath(),d.arc(a,C,4,0,2*Math.PI),d.stroke()},[o,e,n,c,t,u]);p.useEffect(()=>{H()},[H]);const E=y=>{const d=I.current;if(!d)return;const S=d.getBoundingClientRect(),F=(y.clientX-S.left)/S.width,a=1-(y.clientY-S.top)/S.height,C=n+(F*2-1)*t,b=c+(a*2-1)*t;i(C,b)};return r.jsxs("div",{className:"flex flex-col gap-1",children:[r.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),r.jsx("canvas",{ref:I,className:"rounded border border-white/10 cursor-crosshair",style:{width:u,height:u,imageRendering:"pixelated"},onPointerDown:y=>{k.current=!0,y.target.setPointerCapture(y.pointerId),E(y)},onPointerMove:y=>{k.current&&E(y)},onPointerUp:y=>{k.current=!1;try{y.target.releasePointerCapture(y.pointerId)}catch{}}}),r.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",o.toFixed(4),", ",e.toFixed(4),")"]})]})},Q=o=>o.map(([e,i],t)=>({id:`s${t}`,position:e,color:i,bias:.5,interpolation:"linear"})),je=[{id:"lagoon",name:"Lagoon",desc:"Gentle teal-and-gold curls — the calm lake.",params:{juliaC:[-.7,.27015],center:[0,0],zoom:1.5,maxIter:160,power:2,kind:"julia",forceMode:"curl",forceGain:760,interiorDamp:.9,dissipation:.18,dyeDissipation:.63,dyeInject:2.28,vorticity:1.3,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"iterations",colorIter:160,dyeBlend:"add",interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,simResolution:768},gradient:{stops:Q([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"ink-curl",name:"Ink Curl",desc:"Pure monochrome curl — maximum fluid clarity. All colour stripped; fluid is the star.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:Q([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"tidepool",name:"Tidepool",desc:"Deep-sea blue with crimson breakers. Rare fractional power (1.5) gives unusual fold geometry.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:Q([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"}},{id:"eclipse",name:"Eclipse",desc:"Mandelbrot view with orbit-circle coloring — negative force pulls matter INWARD toward the set.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.8171020426639567,-.04318287939681306],zoom:1.2906510553334984,maxIter:157,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-100,interiorDamp:0,dissipation:.22,dyeDissipation:.76,dyeInject:50,vorticity:7.8,pressureIters:60,show:"composite",juliaMix:0,dyeMix:3.45,velocityViz:0,gradientRepeat:4.99,gradientPhase:0,colorMapping:"orbit-circle",colorIter:42,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:3,simResolution:768},gradient:{stops:Q([[.067,"#000000"],[.507,"#09012F"],[.53,"#040449"],[.554,"#000764"],[.577,"#0C2C8A"],[.6,"#1852B1"],[.623,"#397DD1"],[.646,"#86B5E5"],[.67,"#D3ECF8"],[.693,"#F1E9BF"],[.716,"#F8C95F"],[.739,"#FFAA00"],[.763,"#CC8000"],[.786,"#995700"],[.809,"#6A3403"],[.874,"#421E0F"],[1,"#000000"]]),colorSpace:"linear",blendSpace:"oklab"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"turbo-orbit",name:"Turbo Orbit",desc:"Full Turbo palette, orbit-circle coloring, huge dye mix — visually loud.",params:{juliaC:[.26990692864529475,.483971044467425],center:[.17,0],zoom:1.5,maxIter:160,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.8,dissipation:.22,dyeDissipation:1.66,dyeInject:3,vorticity:24,pressureIters:60,show:"composite",juliaMix:0,dyeMix:15.575,velocityViz:0,gradientRepeat:2.92,gradientPhase:.13,colorMapping:"orbit-circle",colorIter:160,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:.1,simResolution:768},gradient:{stops:Q([[0,"#30123B"],[.071,"#4145AB"],[.143,"#4675ED"],[.214,"#39A2FC"],[.286,"#1BCFD4"],[.357,"#24ECA6"],[.429,"#61FC6C"],[.5,"#A4FC3B"],[.571,"#D1E834"],[.643,"#F3C63A"],[.714,"#FE9B2D"],[.786,"#F36315"],[.857,"#D93806"],[.929,"#B11901"],[1,"#7A0402"]]),colorSpace:"linear",blendSpace:"oklab"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"inferno-bands",name:"Inferno Bands",desc:"Force-gradient mode + hard band coloring at very high resolution — staccato fire.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"over",interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12,simResolution:1536},gradient:{stops:Q([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"quartic",name:"Quartic Drift",desc:"Power-4 Julia under subtle c-track — four-fold symmetric flow at low gain.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:Q([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"absinthe",name:"Absinthe",desc:"Exotic negative power (z → z⁻⁶ + c), mint-to-teal palette, bloom + aberration — electric and dreamlike.",params:{juliaC:[.3435417216327623,-.9983641755913593],center:[-.3500208870433565,-.06994721707561113],zoom:2.315410785185688,maxIter:8,power:-6,kind:"julia",forceMode:"c-track",forceGain:23.3,interiorDamp:0,dissipation:.36,dyeDissipation:.68,dyeInject:4.595,vorticity:46.4,pressureIters:50,show:"composite",juliaMix:.19,dyeMix:4,velocityViz:0,gradientRepeat:3.04,gradientPhase:.285,colorMapping:"iterations",colorIter:6,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",toneMapping:"none",exposure:1,vibrance:.99,fluidStyle:"plain",bloomAmount:1.21,bloomThreshold:.86,aberration:1.59,refraction:0,refractSmooth:1,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1440},gradient:{stops:Q([[0,"#d3f2a3"],[.167,"#97e196"],[.333,"#6cc08b"],[.5,"#4c9b82"],[.667,"#217a79"],[.833,"#105965"],[1,"#074050"]]),colorSpace:"linear",blendSpace:"oklab"},orbit:{enabled:!0,radius:.02,speed:.1}},{id:"viridis-pulse",name:"Viridis Pulse",desc:"C-track on viridis + electric pink. Slow auto-orbit — the fractal breathes.",params:{juliaC:[-.7,.27015],center:[0,0],zoom:1.5,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.35,dyeInject:.9,vorticity:16,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"over",interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,simResolution:768},gradient:{stops:Q([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},orbit:{enabled:!0,radius:.035,speed:.02}}],Qt={stops:Q([[0,"#421E0F"],[.067,"#19071A"],[.133,"#09012F"],[.2,"#040449"],[.267,"#000764"],[.333,"#0C2C8A"],[.4,"#1852B1"],[.467,"#397DD1"],[.533,"#86B5E5"],[.6,"#D3ECF8"],[.667,"#F1E9BF"],[.733,"#F8C95F"],[.8,"#FFAA00"],[.867,"#CC8000"],[.933,"#995700"],[1,"#6A3403"]]),colorSpace:"linear",blendSpace:"oklab"},Ge=ue.createContext(!1),_e=[{id:"gradient",label:"Gradient",hint:"∇(escape iter) — force points AWAY from the set interior. Fractal acts as a source."},{id:"curl",label:"Curl",hint:"Perp of ∇(escape iter) — divergence-free swirl along level sets. Fluid surfs the contours."},{id:"iterate",label:"Iterate",hint:"Final z iterate direction (Böttcher). Fluid flows along the fractal's own orbit grain."},{id:"c-track",label:"C-Track",hint:"Δ(julia)/Δt as you move c. Fluid follows the deformation of the fractal in real time."},{id:"hue",label:"Hue",hint:"Rendered hue → angle, value → magnitude. The picture itself is the velocity field."}],Zt=[{id:"composite",label:"Mixed",hint:"Fractal + dye + optional velocity overlay"},{id:"julia",label:"Fractal",hint:"Pure fractal, fluid hidden"},{id:"dye",label:"Dye",hint:"Fluid dye only — shows what the fractal wrote"},{id:"velocity",label:"Velocity",hint:"Per-pixel velocity as a hue wheel"}],er=[{id:"julia",label:"Julia"},{id:"mandelbrot",label:"Mandelbrot"}],tr=["Fractal","Flow","Color","Presets"];function rr(o){const e=i=>Math.max(0,Math.min(255,Math.round(i*255))).toString(16).padStart(2,"0");return"#"+e(o[0])+e(o[1])+e(o[2])}function ir(o){const e=o.replace("#",""),i=parseInt(e.slice(0,2),16)/255,t=parseInt(e.slice(2,4),16)/255,n=parseInt(e.slice(4,6),16)/255;return[i,t,n]}const q=({active:o,onClick:e,title:i,children:t,className:n=""})=>r.jsx("button",{type:"button",onClick:e,title:i,className:"px-2 py-1 text-[10px] rounded border transition-colors "+(o?"bg-cyan-500/20 border-cyan-400/60 text-cyan-200":"bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08]")+" "+n,children:t}),z=({children:o})=>ue.useContext(Ge)?null:r.jsx("div",{className:"text-[9px] text-gray-500 leading-snug pl-1 pt-0.5",children:o}),w=({hint:o,children:e})=>r.jsxs("div",{className:"flex flex-col gap-0.5",children:[e,o&&r.jsx(z,{children:o})]}),ie=({children:o,right:e})=>r.jsxs("div",{className:"flex items-center justify-between pt-1",children:[r.jsx("div",{className:"text-[10px] uppercase text-gray-400 tracking-wide",children:o}),e]}),or=({params:o,setParams:e,onReset:i,orbit:t,setOrbit:n,gradient:c,setGradient:u,gradientLut:h,onPresetApply:v,onSaveJson:T,onSavePng:J,onLoadFile:A,hideHints:U})=>{var d,S,F;const I=ue.useRef(null),[B,k]=ue.useState("Fractal"),H=a=>{const C=je.find(b=>b.id===a);C&&v(C)},E=a=>{var b;const C=(b=a.target.files)==null?void 0:b[0];C&&A(C),a.target.value=""},y=a=>{e(a==="plain"?{fluidStyle:"plain",bloomAmount:0,aberration:0,refraction:0,caustics:0}:a==="electric"?{fluidStyle:"electric",bloomAmount:.6,bloomThreshold:1,aberration:1,refraction:0,caustics:0,vibrance:.3}:{fluidStyle:"liquid",bloomAmount:.25,bloomThreshold:1.1,aberration:0,refraction:.08,caustics:8,vibrance:.3})};return r.jsx(Ge.Provider,{value:U,children:r.jsxs("div",{className:"flex flex-col h-full text-gray-200 text-xs select-none",children:[r.jsxs("div",{className:"flex items-center justify-between px-3 pt-3 pb-2",children:[r.jsxs("div",{children:[r.jsx("div",{className:"text-sm font-semibold",children:"Julia Fluid Toy"}),r.jsx("div",{className:"text-[10px] text-gray-500",children:"fractal ↔ fluid coupling lab"})]}),r.jsx("a",{href:"./index.html",className:"text-[10px] text-cyan-300 hover:underline",children:"← back to GMT"})]}),r.jsx(Xt,{tabs:tr,active:B,onChange:k}),r.jsxs("div",{className:"flex-1 overflow-y-auto px-3 pt-3 pb-2 flex flex-col gap-3",children:[B==="Fractal"&&r.jsxs(r.Fragment,{children:[r.jsx(z,{children:"The fractal is the force generator. Every fluid frame reads this texture."}),r.jsx("div",{className:"flex gap-1",children:er.map(a=>r.jsx(q,{active:o.kind===a.id,onClick:()=>e({kind:a.id}),children:a.label},a.id))}),r.jsx(Kt,{cx:o.juliaC[0],cy:o.juliaC[1],onChange:(a,C)=>e({juliaC:[a,C]}),gradientLut:h??void 0,gradientRepeat:o.gradientRepeat,gradientPhase:o.gradientPhase,colorMapping:o.colorMapping,interiorColor:o.interiorColor,power:o.power}),r.jsx(w,{hint:"Julia constant. Move me to reshape the entire fractal — and the forces it emits.",children:r.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[r.jsx(x,{label:"c.x",value:o.juliaC[0],onChange:a=>e({juliaC:[a,o.juliaC[1]]}),min:-2,max:2,step:.001,variant:"full"}),r.jsx(x,{label:"c.y",value:o.juliaC[1],onChange:a=>e({juliaC:[o.juliaC[0],a]}),min:-2,max:2,step:.001,variant:"full"})]})}),r.jsx(w,{hint:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001).",children:r.jsx(x,{label:"Zoom",value:o.zoom,onChange:a=>e({zoom:a}),min:1e-5,max:8,step:1e-4,hardMin:1e-5,variant:"full"})}),r.jsx(w,{hint:"Pan the fractal window.",children:r.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[r.jsx(x,{label:"Center.x",value:o.center[0],onChange:a=>e({center:[a,o.center[1]]}),min:-2,max:2,step:.01,variant:"full"}),r.jsx(x,{label:"Center.y",value:o.center[1],onChange:a=>e({center:[o.center[0],a]}),min:-2,max:2,step:.01,variant:"full"})]})}),r.jsx(w,{hint:"More iterations → sharper escape gradients → finer force detail.",children:r.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[r.jsx(x,{label:"Iter",value:o.maxIter,onChange:a=>e({maxIter:Math.round(a)}),min:16,max:512,step:1,variant:"full"}),r.jsx(x,{label:"Power",value:o.power,onChange:a=>e({power:a}),min:2,max:8,step:1,variant:"full"})]})})]}),B==="Flow"&&r.jsxs(r.Fragment,{children:[r.jsxs(z,{children:["The coupling law. Chooses ",r.jsx("em",{children:"how"})," fractal pixels become velocity at each cell."]}),r.jsx("div",{className:"grid grid-cols-3 gap-1",children:_e.map(a=>r.jsx(q,{active:o.forceMode===a.id,onClick:()=>e({forceMode:a.id}),title:a.hint,children:a.label},a.id))}),!U&&r.jsx("div",{className:"text-[10px] text-cyan-200/80 leading-snug bg-cyan-900/20 border border-cyan-500/20 rounded px-2 py-1",children:(d=_e.find(a=>a.id===o.forceMode))==null?void 0:d.hint}),r.jsx(w,{hint:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid.",children:r.jsx(x,{label:"Force gain",value:o.forceGain,onChange:a=>e({forceGain:a}),min:0,max:40,step:.1,variant:"full"})}),r.jsx(w,{hint:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed.",children:r.jsx(x,{label:"Interior damp",value:o.interiorDamp,onChange:a=>e({interiorDamp:a}),min:0,max:1,step:.01,variant:"full"})}),r.jsx(ie,{right:r.jsx(q,{active:t.enabled,onClick:()=>n({enabled:!t.enabled}),children:t.enabled?"on":"off"}),children:"Auto-orbit c"}),r.jsxs(z,{children:["Circles c automatically around its current value. Pair with ",r.jsx("b",{children:"C-Track"})," to watch the fluid breathe with the fractal's deformation."]}),r.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[r.jsx(x,{label:"Radius",value:t.radius,onChange:a=>n({radius:a}),min:0,max:.5,step:.001,variant:"full"}),r.jsx(x,{label:"Speed",value:t.speed,onChange:a=>n({speed:a}),min:0,max:3,step:.01,variant:"full"})]}),r.jsx(ie,{children:"Fluid"}),r.jsx(z,{children:"How the fluid carries and forgets what the fractal pushed into it."}),r.jsx(w,{hint:"Amplifies existing curl — keeps fractal-induced swirls from smearing away.",children:r.jsx(x,{label:"Vorticity",value:o.vorticity,onChange:a=>e({vorticity:a}),min:0,max:50,step:.1,variant:"full"})}),r.jsx(w,{hint:"How fast velocity decays. High = fluid forgets the fractal quickly.",children:r.jsx(x,{label:"Velocity dissipation /s",value:o.dissipation,onChange:a=>e({dissipation:a}),min:0,max:5,step:.01,variant:"full"})}),r.jsx(w,{hint:"How fast dye fades.",children:r.jsx(x,{label:"Dye dissipation /s",value:o.dyeDissipation,onChange:a=>e({dyeDissipation:a}),min:0,max:5,step:.01,variant:"full"})}),r.jsx(w,{hint:"How much of the fractal's color bleeds into the fluid each frame.",children:r.jsx(x,{label:"Dye inject",value:o.dyeInject,onChange:a=>e({dyeInject:a}),min:0,max:3,step:.01,variant:"full"})}),r.jsx(w,{hint:"Jacobi iterations for incompressibility. More = stricter but slower.",children:r.jsx(x,{label:"Pressure iters",value:o.pressureIters,onChange:a=>e({pressureIters:Math.round(a)}),min:4,max:60,step:1,variant:"full"})}),r.jsx(ie,{right:r.jsx(q,{active:o.autoQuality,onClick:()=>e({autoQuality:!o.autoQuality}),children:o.autoQuality?"on":"off"}),children:"Quality"}),r.jsx(z,{children:"The slider is your target. Auto-quality may drop below it if FPS is low, then snaps back in one jump when it recovers (no stair-step flashing)."}),r.jsx(w,{hint:"Target fluid grid height in cells. More = finer detail, slower.",children:r.jsx(x,{label:"Sim resolution",value:o.simResolution,onChange:a=>e({simResolution:Math.round(a)}),min:128,max:1536,step:32,variant:"full"})}),r.jsx(w,{hint:"Fades force/dye injection near the canvas edges. Fixes 'gushing from the borders' under fast c-changes.",children:r.jsx(x,{label:"Edge margin",value:o.edgeMargin,onChange:a=>e({edgeMargin:a}),min:0,max:.25,step:.005,variant:"full"})}),r.jsx(w,{hint:"Per-pixel cap on the fractal force magnitude.",children:r.jsx(x,{label:"Force cap",value:o.forceCap,onChange:a=>e({forceCap:a}),min:1,max:40,step:.5,variant:"full"})})]}),B==="Color"&&r.jsxs(r.Fragment,{children:[r.jsxs(z,{children:["Colors both the fractal AND the dye that gets injected into the fluid. In Hue-mode, it ",r.jsx("em",{children:"is"})," the vector field."]}),r.jsx(nt,{value:c,onChange:a=>{Array.isArray(a)?u({stops:a,colorSpace:c.colorSpace,blendSpace:c.blendSpace}):u(a)}}),r.jsxs("div",{className:"flex flex-col gap-1",children:[r.jsx("div",{className:"text-[10px] text-gray-400",children:"Color mapping"}),r.jsx("div",{className:"grid grid-cols-3 gap-1",children:Ne.map(a=>r.jsx(q,{active:o.colorMapping===a.id,onClick:()=>e({colorMapping:a.id}),title:a.hint,children:a.label},a.id))}),r.jsx(z,{children:(S=Ne.find(a=>a.id===o.colorMapping))==null?void 0:S.hint})]}),r.jsx(w,{hint:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands.",children:r.jsx(x,{label:"Repetition",value:o.gradientRepeat,onChange:a=>e({gradientRepeat:a}),min:.1,max:8,step:.01,variant:"full"})}),r.jsx(w,{hint:"Phase shift — rotates the colors without changing their layout.",children:r.jsx(x,{label:"Phase",value:o.gradientPhase,onChange:a=>e({gradientPhase:a}),min:0,max:1,step:.005,variant:"full"})}),r.jsx(w,{hint:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter. Reduce for fresher colours.",children:r.jsx(x,{label:"Color iter",value:o.colorIter,onChange:a=>e({colorIter:Math.round(a)}),min:1,max:Math.max(4,o.maxIter),step:1,variant:"full"})}),(o.colorMapping==="orbit-point"||o.colorMapping==="orbit-circle"||o.colorMapping==="orbit-cross"||o.colorMapping==="trap-iter")&&r.jsx(w,{hint:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",children:r.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[r.jsx(x,{label:"Trap.x",value:o.trapCenter[0],onChange:a=>e({trapCenter:[a,o.trapCenter[1]]}),min:-2,max:2,step:.01,variant:"full"}),r.jsx(x,{label:"Trap.y",value:o.trapCenter[1],onChange:a=>e({trapCenter:[o.trapCenter[0],a]}),min:-2,max:2,step:.01,variant:"full"})]})}),o.colorMapping==="orbit-circle"&&r.jsx(w,{hint:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring.",children:r.jsx(x,{label:"Trap radius",value:o.trapRadius,onChange:a=>e({trapRadius:a}),min:.01,max:4,step:.01,variant:"full"})}),o.colorMapping==="orbit-line"&&r.jsx(w,{hint:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length.",children:r.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[r.jsx(x,{label:"n.x",value:o.trapNormal[0],onChange:a=>e({trapNormal:[a,o.trapNormal[1]]}),min:-1,max:1,step:.01,variant:"full"}),r.jsx(x,{label:"n.y",value:o.trapNormal[1],onChange:a=>e({trapNormal:[o.trapNormal[0],a]}),min:-1,max:1,step:.01,variant:"full"}),r.jsx(x,{label:"offset",value:o.trapOffset,onChange:a=>e({trapOffset:a}),min:-2,max:2,step:.01,variant:"full"})]})}),o.colorMapping==="stripe"&&r.jsx(w,{hint:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration.",children:r.jsx(x,{label:"Stripe freq",value:o.stripeFreq,onChange:a=>e({stripeFreq:a}),min:1,max:16,step:.1,variant:"full"})}),r.jsx(ie,{children:"Dye blend"}),r.jsx(z,{children:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."}),r.jsx("div",{className:"grid grid-cols-4 gap-1",children:Ue.map(a=>r.jsx(q,{active:o.dyeBlend===a.id,onClick:()=>e({dyeBlend:a.id}),title:a.hint,children:a.label},a.id))}),r.jsx(z,{children:(F=Ue.find(a=>a.id===o.dyeBlend))==null?void 0:F.hint}),r.jsx(ie,{children:"Tone mapping"}),r.jsxs(z,{children:["How final colour gets compressed. ",r.jsx("b",{children:"None"})," = maximally vivid (may clip).",r.jsx("b",{children:" AgX"})," = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."]}),r.jsx("div",{className:"grid grid-cols-4 gap-1",children:Ot.map(a=>r.jsx(q,{active:o.toneMapping===a.id,onClick:()=>e({toneMapping:a.id}),title:a.hint,children:a.label},a.id))}),r.jsx(w,{hint:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch.",children:r.jsx(x,{label:"Exposure",value:o.exposure,onChange:a=>e({exposure:a}),min:.1,max:5,step:.01,variant:"full"})}),r.jsx(w,{hint:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones.",children:r.jsx(x,{label:"Vibrance",value:o.vibrance,onChange:a=>e({vibrance:a}),min:0,max:1,step:.01,variant:"full"})}),r.jsx(ie,{children:"Fluid style"}),r.jsx(z,{children:"Post-process pack. Pick a style to preset the bloom/aberration/refraction knobs, or mix them yourself below."}),r.jsx("div",{className:"grid grid-cols-3 gap-1",children:Lt.map(a=>r.jsx(q,{active:o.fluidStyle===a.id,onClick:()=>y(a.id),title:a.hint,children:a.label},a.id))}),r.jsx(w,{hint:"Bloom strength — wide soft glow on bright pixels. Core of the electric look.",children:r.jsx(x,{label:"Bloom",value:o.bloomAmount,onChange:a=>e({bloomAmount:a}),min:0,max:3,step:.01,variant:"full"})}),r.jsx(w,{hint:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows.",children:r.jsx(x,{label:"Bloom threshold",value:o.bloomThreshold,onChange:a=>e({bloomThreshold:a}),min:0,max:3,step:.01,variant:"full"})}),r.jsx(w,{hint:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp.",children:r.jsx(x,{label:"Aberration",value:o.aberration,onChange:a=>e({aberration:a}),min:0,max:3,step:.01,variant:"full"})}),r.jsx(w,{hint:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass.",children:r.jsx(x,{label:"Refraction",value:o.refraction,onChange:a=>e({refraction:a}),min:0,max:.3,step:.001,variant:"full"})}),r.jsx(w,{hint:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient.",children:r.jsx(x,{label:"Refract smooth",value:o.refractSmooth,onChange:a=>e({refractSmooth:a}),min:1,max:12,step:.1,variant:"full"})}),r.jsx(w,{hint:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends.",children:r.jsx(x,{label:"Caustics",value:o.caustics,onChange:a=>e({caustics:a}),min:0,max:25,step:.1,variant:"full"})}),r.jsxs("div",{className:"flex flex-col gap-1",children:[r.jsx("div",{className:"text-[10px] text-gray-400",children:"Interior color (bounded points)"}),r.jsx("input",{type:"color",title:"Interior color (points that never escape)","aria-label":"Interior color",value:rr(o.interiorColor),onChange:a=>e({interiorColor:ir(a.target.value)}),className:"w-full h-6 rounded border border-white/10 cursor-pointer bg-transparent"})]}),r.jsx(ie,{children:"Display"}),r.jsx(z,{children:"What you see. The simulation runs the same either way."}),r.jsx("div",{className:"grid grid-cols-4 gap-1",children:Zt.map(a=>r.jsx(q,{active:o.show===a.id,onClick:()=>e({show:a.id}),title:a.hint,children:a.label},a.id))}),r.jsx(w,{hint:"How much fractal color shows through in Mixed view.",children:r.jsx(x,{label:"Julia mix",value:o.juliaMix,onChange:a=>e({juliaMix:a}),min:0,max:2,step:.01,variant:"full"})}),r.jsx(w,{hint:"How much fluid dye shows through in Mixed view.",children:r.jsx(x,{label:"Dye mix",value:o.dyeMix,onChange:a=>e({dyeMix:a}),min:0,max:2,step:.01,variant:"full"})}),r.jsx(w,{hint:"Overlay velocity-hue on top of the composite. Diagnostic.",children:r.jsx(x,{label:"Velocity viz",value:o.velocityViz,onChange:a=>e({velocityViz:a}),min:0,max:2,step:.01,variant:"full"})})]}),B==="Presets"&&r.jsxs(r.Fragment,{children:[r.jsx(ie,{children:"Presets"}),r.jsx(z,{children:"Each preset is a curated fractal→fluid coupling. Applying one resets the grid and restores known params."}),r.jsx("div",{className:"grid grid-cols-2 gap-1",children:je.map(a=>r.jsx(q,{active:!1,onClick:()=>H(a.id),title:a.desc,children:a.name},a.id))}),r.jsx(z,{children:"Save / Screenshot / Load moved to the top bar icons above."}),r.jsx("div",{className:"grid grid-cols-1 gap-1 mt-2",children:r.jsx(q,{active:!1,onClick:T,title:"Export the full state as a .json file.",children:"Save JSON"})}),r.jsx("input",{ref:I,type:"file",accept:".png,.json,image/png,application/json,text/plain",onChange:E,className:"hidden","aria-label":"Load saved state"})]})]}),r.jsxs("div",{className:"flex gap-2 p-3 border-t border-white/5",children:[r.jsx("button",{type:"button",onClick:()=>e({paused:!o.paused}),className:"flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10",children:o.paused?"Resume":"Pause"}),r.jsx("button",{type:"button",onClick:i,className:"flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10",children:"Clear fluid"})]})]})})},ar=({x:o,y:e,items:i,onDismiss:t})=>{const n=p.useRef(null);p.useEffect(()=>{const u=T=>{n.current&&(n.current.contains(T.target)||t())},h=T=>{T.key==="Escape"&&t()},v=setTimeout(()=>{window.addEventListener("mousedown",u),window.addEventListener("keydown",h)},0);return()=>{clearTimeout(v),window.removeEventListener("mousedown",u),window.removeEventListener("keydown",h)}},[t]);const c={left:Math.min(o,window.innerWidth-240),top:Math.min(e,window.innerHeight-i.length*28-12)};return r.jsx("div",{ref:n,className:"fixed z-50 min-w-[200px] rounded border border-white/15 bg-[#1a1a1d]/95 backdrop-blur-sm shadow-xl text-[11px] text-gray-200 py-1",style:c,onContextMenu:u=>{u.preventDefault(),t()},children:i.map((u,h)=>r.jsxs(ue.Fragment,{children:[u.separatorAbove&&r.jsx("div",{className:"my-1 border-t border-white/10"}),r.jsx("button",{type:"button",onClick:()=>{u.onClick(),t()},title:u.hint,className:"w-full text-left px-3 py-1.5 transition-colors "+(u.danger?"hover:bg-red-500/20 text-red-300":"hover:bg-cyan-500/15 hover:text-cyan-200"),children:u.label})]},h))})},nr=1,Me="GmtFluidState";function Te(o,e,i,t){return{version:nr,savedAt:new Date().toISOString(),name:t,params:o,gradient:e,orbit:i}}function Le(o){if(!o||typeof o!="object")throw new Error("Saved state is not an object");const e=o;if(typeof e.version!="number")throw new Error('Missing or invalid "version"');if(!e.params||typeof e.params!="object")throw new Error('Missing "params"');if(!e.gradient||typeof e.gradient!="object")throw new Error('Missing "gradient"');if(!e.orbit||typeof e.orbit!="object")throw new Error('Missing "orbit"');return{version:e.version,savedAt:typeof e.savedAt=="string"?e.savedAt:new Date().toISOString(),name:typeof e.name=="string"?e.name:void 0,params:e.params,gradient:e.gradient,orbit:e.orbit}}function De(o,e){const i=URL.createObjectURL(o),t=document.createElement("a");t.href=i,t.download=e,document.body.appendChild(t),t.click(),t.remove(),setTimeout(()=>URL.revokeObjectURL(i),1e3)}function sr(o,e="toy-fluid-state.json"){const i=JSON.stringify(o,null,2);De(new Blob([i],{type:"application/json"}),e)}async function lr(o,e,i="toy-fluid.png"){const t=await new Promise(h=>o.toBlob(h,"image/png"));if(!t)throw new Error("canvas.toBlob returned null");const n=new Uint8Array(await t.arrayBuffer()),c=dr(n,Me,JSON.stringify(e)),u=new Uint8Array(c.byteLength);u.set(c),De(new Blob([u.buffer],{type:"image/png"}),i)}async function cr(o,e="toy-fluid-screenshot.png"){const i=await new Promise(t=>o.toBlob(t,"image/png"));if(!i)throw new Error("canvas.toBlob returned null");De(i,e)}async function ur(o){const e=o.name.toLowerCase(),i=new Uint8Array(await o.arrayBuffer());if(e.endsWith(".png")||i.length>=8&&i[0]===137&&i[1]===80&&i[2]===78&&i[3]===71&&i[4]===13&&i[5]===10&&i[6]===26&&i[7]===10){const c=hr(i,Me);if(!c)throw new Error(`PNG has no "${Me}" metadata.`);return Le(JSON.parse(c))}const n=new TextDecoder("utf-8").decode(i);return Le(JSON.parse(n))}function dr(o,e,i){o.subarray(0,8);const t=33,n=o.subarray(0,t),c=o.subarray(t),u=pr(e,i),h=new Uint8Array(n.length+u.length+c.length);return h.set(n,0),h.set(u,n.length),h.set(c,n.length+u.length),h}function hr(o,e){let i=8;const t=new DataView(o.buffer,o.byteOffset,o.byteLength);for(;i+12<=o.length;){const n=t.getUint32(i,!1),c=String.fromCharCode(o[i+4],o[i+5],o[i+6],o[i+7]),u=i+8,h=u+n;if(c==="tEXt"){const v=o.subarray(u,h),T=v.indexOf(0);if(T>0&&new TextDecoder("latin1").decode(v.subarray(0,T))===e)return new TextDecoder("utf-8").decode(v.subarray(T+1))}if(c==="IEND")break;i=h+4}return null}function pr(o,e){const i=new TextEncoder,t=i.encode(o),n=i.encode(e);if(t.length===0||t.length>79)throw new Error("keyword length out of range");const c=t.length+1+n.length,u=new Uint8Array(12+c),h=new DataView(u.buffer);h.setUint32(0,c,!1),u[4]=116,u[5]=69,u[6]=88,u[7]=116,u.set(t,8),u[8+t.length]=0,u.set(n,8+t.length+1);const v=mr(u,4,8+c);return h.setUint32(8+c,v,!1),u}const fr=(()=>{const o=new Uint32Array(256);for(let e=0;e<256;e++){let i=e;for(let t=0;t<8;t++)i=i&1?3988292384^i>>>1:i>>>1;o[e]=i>>>0}return o})();function mr(o,e,i){let t=4294967295;for(let n=e;n<i;n++)t=fr[(t^o[n])&255]^t>>>8;return(t^4294967295)>>>0}const gr="p-2 rounded-lg transition-all active:scale-95 border flex items-center justify-center",xr="bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10",ye=({title:o,onClick:e,children:i})=>r.jsx("button",{type:"button",onClick:e,title:o,className:`${gr} ${xr}`,children:i}),vr=({kind:o,forceMode:e,juliaC:i,zoom:t,simResolution:n,effectiveSimRes:c,fps:u,orbitOn:h,paused:v,onSavePng:T,onScreenshot:J,onLoadFile:A,onSubmit:U})=>{const I=ue.useRef(null),B=()=>{var E;return(E=I.current)==null?void 0:E.click()},k=E=>{var d;const y=(d=E.target.files)==null?void 0:d[0];y&&A(y),E.target.value=""},H=c===n?`${n}px`:`${c}px / ${n}`;return r.jsxs("div",{className:"h-10 shrink-0 border-b border-white/5 bg-[#0b0b0d] flex items-center px-2 gap-2 text-[11px] font-mono text-gray-300","data-testid":"top-bar",children:[r.jsxs("div",{className:"flex items-center gap-2",children:[r.jsx("span",{className:"text-sm font-semibold text-gray-100 font-sans",children:"Julia Fluid"}),r.jsx("a",{href:"./index.html",className:"text-[10px] text-cyan-300 hover:underline font-sans",children:"← GMT"})]}),r.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),r.jsxs("div",{className:"flex items-center gap-3 min-w-0","data-testid":"status-bar",children:[r.jsx("span",{children:o==="julia"?"Julia":"Mandelbrot"}),r.jsx("span",{className:"text-cyan-300",children:e}),r.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-c",children:["c=(",i[0].toFixed(3),", ",i[1].toFixed(3),")"]}),r.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-zoom",children:["z=",t.toFixed(3)]}),r.jsx("span",{className:`whitespace-nowrap ${c<n?"text-amber-300":"text-gray-500"}`,children:H}),r.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-fps",children:[u," fps"]}),h&&r.jsx("span",{className:"text-amber-300",children:"orbit on"}),v&&r.jsx("span",{className:"text-red-400",children:"paused"})]}),r.jsxs("div",{className:"ml-auto flex items-center gap-1",children:[r.jsx(ye,{title:"Save scene as PNG (state embedded in metadata)",onClick:T,children:r.jsx(et,{})}),r.jsx(ye,{title:"Screenshot canvas as plain PNG",onClick:J,children:r.jsx(tt,{})}),r.jsx(ye,{title:"Load a saved .png or .json",onClick:B,children:r.jsx(rt,{})}),r.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),r.jsx(ye,{title:"Submit this preset to the curator",onClick:U,children:r.jsx(it,{})}),r.jsx("input",{ref:I,type:"file",accept:".png,.json,image/png,application/json,text/plain",onChange:k,className:"hidden","aria-label":"Load saved state"})]})]})};let br=0;function yr(){const o=(performance.now()-br)/1e3;return Math.max(0,Nt-o)}async function wr(o,e,i){return{ok:!1,code:"disabled",message:"Preset submission is not yet enabled in this build. Save a PNG and send it directly."}}const Cr=({open:o,canvas:e,state:i,onClose:t})=>{const[n,c]=p.useState(""),[u,h]=p.useState(""),[v,T]=p.useState(""),[J,A]=p.useState(!1),[U,I]=p.useState({kind:"idle"}),[B,k]=p.useState(null),H=p.useRef(null);if(p.useEffect(()=>{if(!o||!e){k(null);return}let d=null;return e.toBlob(S=>{S&&(d=URL.createObjectURL(S),k(d))},"image/png"),()=>{d&&URL.revokeObjectURL(d)}},[o,e]),p.useEffect(()=>{o||(I({kind:"idle"}),A(!1))},[o]),p.useEffect(()=>{if(!o)return;const d=S=>{S.key==="Escape"&&t()};return window.addEventListener("keydown",d),()=>window.removeEventListener("keydown",d)},[o,t]),!o)return null;const E=yr(),y=async()=>{if(!e||!i)return;I({kind:"sending"}),n.trim(),u.trim(),v.trim();const d=await wr();d.ok?I({kind:"ok",id:d.id}):I({kind:"error",message:d.message})};return r.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4",onMouseDown:d=>{d.target===d.currentTarget&&t()},children:r.jsxs("div",{ref:H,className:"w-[480px] max-w-full rounded-lg border border-white/10 bg-[#0b0b0d] shadow-2xl text-gray-200 text-xs overflow-hidden",children:[r.jsxs("div",{className:"px-4 py-3 border-b border-white/5 flex items-center justify-between",children:[r.jsxs("div",{children:[r.jsx("div",{className:"text-sm font-semibold",children:"Submit preset"}),r.jsx("div",{className:"text-[10px] text-gray-500",children:"Share the current scene with the curator"})]}),r.jsx("button",{type:"button",onClick:t,className:"text-gray-500 hover:text-gray-200 text-sm px-1 leading-none",title:"Close (Esc)",children:"×"})]}),r.jsx("div",{className:"mx-4 mt-3 mb-0 px-3 py-2 text-[10px] text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded",children:"Submissions aren't enabled in this build yet. In the meantime, use the Save icon in the top bar to export a PNG and send it directly."}),r.jsxs("div",{className:"p-4 flex gap-3",children:[r.jsxs("div",{className:"w-[180px] shrink-0",children:[r.jsx("div",{className:"aspect-square rounded border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center",children:B?r.jsx("img",{src:B,alt:"preset preview",className:"w-full h-full object-cover"}):r.jsx("span",{className:"text-[10px] text-gray-500",children:"rendering preview…"})}),r.jsx("div",{className:"text-[9px] text-gray-500 mt-1 leading-snug",children:"The preview above, plus the scene's JSON state, are what gets submitted."})]}),r.jsxs("div",{className:"flex-1 flex flex-col gap-2",children:[r.jsxs("label",{className:"flex flex-col gap-0.5",children:[r.jsxs("span",{className:"text-[10px] text-gray-400",children:["Name ",r.jsx("span",{className:"text-red-400",children:"*"})]}),r.jsx("input",{value:n,onChange:d=>c(d.target.value.slice(0,60)),disabled:!0,placeholder:"e.g. Ember Tide",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"})]}),r.jsxs("label",{className:"flex flex-col gap-0.5",children:[r.jsx("span",{className:"text-[10px] text-gray-400",children:"Author (optional)"}),r.jsx("input",{value:u,onChange:d=>h(d.target.value.slice(0,60)),disabled:!0,placeholder:"alias or handle",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"})]}),r.jsxs("label",{className:"flex flex-col gap-0.5",children:[r.jsx("span",{className:"text-[10px] text-gray-400",children:"Notes (optional)"}),r.jsx("textarea",{value:v,onChange:d=>T(d.target.value.slice(0,500)),disabled:!0,rows:3,placeholder:"What's interesting about this preset? (≤ 500 chars)",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] resize-none focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"}),r.jsxs("span",{className:"text-[9px] text-gray-500 text-right",children:[v.length," / 500"]})]}),r.jsxs("label",{className:"flex items-start gap-2 mt-1 cursor-pointer select-none",children:[r.jsx("input",{type:"checkbox",checked:J,onChange:d=>A(d.target.checked),disabled:!0,className:"mt-0.5 accent-cyan-500"}),r.jsx("span",{className:"text-[10px] text-gray-400 leading-snug",children:"I understand this preset (image + parameters + my alias if provided) may be reviewed, edited, and republished as part of the built-in preset library."})]})]})]}),U.kind==="ok"&&r.jsxs("div",{className:"mx-4 mb-3 px-3 py-2 text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 rounded",children:["Thanks! Your preset is in the queue. ",r.jsxs("span",{className:"text-[10px] text-emerald-400/70",children:["(id: ",U.id,")"]})]}),U.kind==="error"&&r.jsx("div",{className:"mx-4 mb-3 px-3 py-2 text-[11px] text-red-300 bg-red-500/10 border border-red-400/20 rounded",children:U.message}),r.jsxs("div",{className:"px-4 py-3 border-t border-white/5 flex items-center justify-end gap-2",children:[r.jsx("button",{type:"button",onClick:t,className:"px-3 py-1.5 text-[11px] rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10",children:"Cancel"}),r.jsx("button",{type:"button",onClick:y,disabled:!0,className:"px-3 py-1.5 text-[11px] rounded border transition-colors bg-white/[0.04] border-white/10 text-gray-500 cursor-not-allowed",children:U.kind==="sending"?"Sending…":E>0?`Wait ${Math.ceil(E)}s`:"Submit"})]})]})})},Tr=()=>{const o=p.useRef(null),e=p.useRef(null),i=p.useRef(null),[t,n]=p.useState(xe),[c,u]=p.useState(Pe),[h,v]=p.useState(Qt),[T,J]=p.useState(null),[A,U]=p.useState(0),[I,B]=p.useState(!0),[k,H]=p.useState(!1),[E,y]=p.useState(null),[d,S]=p.useState(!1),F=p.useMemo(()=>ot(h),[h]);p.useEffect(()=>{var s;(s=e.current)==null||s.setGradientBuffer(F)},[F]);const a=p.useRef(t);a.current=t;const C=p.useRef(c);C.current=c;const b=p.useRef({c:!1,shift:!1,alt:!1}),oe=p.useRef(xe.simResolution),[fe,ae]=p.useState(xe.simResolution),Z=p.useRef(t.juliaC);p.useEffect(()=>{Z.current=t.juliaC},[t.juliaC]);const N=p.useRef({down:!1,mode:"splat",startX:0,startY:0,startCx:0,startCy:0,startCenterX:0,startCenterY:0,startZoom:1.5,zoomAnchor:[0,0],zoomAnchorUv:[.5,.5],lastX:0,lastY:0,lastT:0,rightDragged:!1});p.useEffect(()=>{const s=o.current;if(!s)return;try{const M=new Vt(s);e.current=M,M.setParams(a.current),M.setGradientBuffer(F);const W=s.getBoundingClientRect();M.resize(W.width,W.height)}catch(M){J(M.message||String(M));return}let m=0,l=performance.now(),f=0,j=performance.now(),P=60,R=a.current.simResolution;oe.current=R;let X=a.current.simResolution,D=0,$=0,ee=performance.now(),te=R;const se=M=>{const W=e.current;if(!W)return;const ge=Math.min(.25,(M-j)/1e3),K=a.current.simResolution,O=a.current.autoQuality;K!==X&&(R=K,X=K,D=0,$=0,ee=M),O?M-ee>Pt&&(P<St&&R>Ie?(D+=ge,$=0,D>kt&&(R=Math.max(Ie,R-At),D=0,ee=M)):P>Bt&&R<K?($+=ge,D=0,$>It&&(R=K,$=0,ee=M)):(D*=.9,$*=.9)):R=K,R>K&&(R=K),oe.current=R;const _=C.current;if(_.enabled&&_.radius>0&&_.speed>0){f+=ge*_.speed;const[Y,le]=Z.current,re=Y+Math.cos(f*6.2831853)*_.radius,ce=le+Math.sin(f*6.2831853)*_.radius;W.setParams({...a.current,juliaC:[re,ce],simResolution:R})}else W.setParams({...a.current,simResolution:R});if(j=M,W.frame(M),m++,M-l>500){const Y=Math.round(m*1e3/(M-l));U(Y),P=P*.5+Y*.5,m=0,l=M}R!==te&&(ae(R),te=R),i.current=requestAnimationFrame(se)};i.current=requestAnimationFrame(se);const be=new ResizeObserver(()=>{const M=e.current;if(!M||!s)return;const W=s.getBoundingClientRect();M.resize(W.width,W.height)});return be.observe(s),()=>{var M;i.current&&cancelAnimationFrame(i.current),be.disconnect(),(M=e.current)==null||M.dispose(),e.current=null}},[]),p.useEffect(()=>{const s=f=>{var P,R,X;const j=(R=(P=f.target)==null?void 0:P.tagName)==null?void 0:R.toLowerCase();j==="input"||j==="textarea"||((f.key==="c"||f.key==="C")&&(b.current.c=!0),b.current.shift=f.shiftKey,b.current.alt=f.altKey,f.code==="Space"?(f.preventDefault(),n(D=>({...D,paused:!D.paused}))):f.key==="r"||f.key==="R"?(X=e.current)==null||X.resetFluid():f.key==="h"||f.key==="H"?H(D=>!D):f.key==="o"||f.key==="O"?u(D=>({...D,enabled:!D.enabled})):f.key==="Home"&&n(D=>({...D,center:[0,0],zoom:1.5})))},m=f=>{(f.key==="c"||f.key==="C")&&(b.current.c=!1),b.current.shift=f.shiftKey,b.current.alt=f.altKey},l=()=>{b.current.c=!1,b.current.shift=!1,b.current.alt=!1};return window.addEventListener("keydown",s),window.addEventListener("keyup",m),window.addEventListener("blur",l),()=>{window.removeEventListener("keydown",s),window.removeEventListener("keyup",m),window.removeEventListener("blur",l)}},[]);const V=p.useCallback(s=>{n(m=>({...m,...s}))},[]),ne=p.useCallback(s=>{u(m=>({...m,...s}))},[]),de=p.useCallback(()=>{var s;(s=e.current)==null||s.resetFluid()},[]),Ve=p.useCallback(s=>{if(s.preventDefault(),N.current.rightDragged){N.current.rightDragged=!1;return}const m=jr({copyCurrentC:He,onReset:()=>{var l;return(l=e.current)==null?void 0:l.resetFluid()},onRecenter:()=>n(l=>({...l,center:[0,0],zoom:1.5})),onToggleOrbit:()=>u(l=>({...l,enabled:!l.enabled})),orbitOn:C.current.enabled,onTogglePaused:()=>n(l=>({...l,paused:!l.paused})),paused:a.current.paused,onApplyPreset:l=>ve(l)});y({x:s.clientX,y:s.clientY,items:m})},[]),Je=p.useMemo(()=>({handleInteractionStart:()=>{},handleInteractionEnd:()=>{},openContextMenu:(s,m,l)=>{const f=l.filter(j=>!j.isHeader).map(j=>({label:j.label??"",onClick:()=>{var P;(P=j.action)==null||P.call(j)},danger:!!j.danger})).filter(j=>j.label);f.length!==0&&y({x:s,y:m,items:f})}}),[]),He=p.useCallback(async()=>{const[s,m]=a.current.juliaC,l=`${s.toFixed(6)}, ${m.toFixed(6)}`;try{await navigator.clipboard.writeText(l)}catch{}},[]),ve=p.useCallback(s=>{var m;n({...xe,...s.params}),s.gradient&&v(s.gradient),u(s.orbit??Pe),(m=e.current)==null||m.resetFluid()},[]),Xe=p.useCallback(()=>{const s=Te(a.current,h,C.current),m=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");sr(s,`toy-fluid-${m}.json`)},[h]),Fe=p.useCallback(async()=>{const s=o.current;if(!s)return;const m=Te(a.current,h,C.current),l=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");try{await lr(s,m,`toy-fluid-${l}.png`)}catch(f){console.error("[toy-fluid] Save PNG failed:",f)}},[h]),We=p.useCallback(async()=>{const s=o.current;if(!s)return;const m=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");try{await cr(s,`toy-fluid-${m}.png`)}catch(l){console.error("[toy-fluid] Screenshot failed:",l)}},[]),Ee=p.useCallback(async s=>{try{const m=await ur(s);ve({id:"loaded",name:m.name??s.name,desc:`Loaded from ${s.name}`,params:m.params,gradient:m.gradient,orbit:m.orbit})}catch(m){console.error("[toy-fluid] Load failed:",m),alert(`Couldn't load "${s.name}":
${m.message}`)}},[ve]),me=(s,m)=>s&&m?1:s?Dt:m?Ft:1,Ye=s=>{if(!e.current)return;s.target.setPointerCapture(s.pointerId);const l=N.current;if(l.down=!0,l.startX=s.clientX,l.startY=s.clientY,l.lastX=s.clientX,l.lastY=s.clientY,l.lastT=performance.now(),l.rightDragged=!1,s.button===2)l.mode="pan-pending",l.startCenterX=a.current.center[0],l.startCenterY=a.current.center[1];else if(s.button===1){s.preventDefault(),l.mode="zoom",l.startZoom=a.current.zoom;const f=o.current.getBoundingClientRect(),j=(s.clientX-f.left)/f.width,P=1-(s.clientY-f.top)/f.height,R=f.width/f.height,X=a.current.center[0]+(j*2-1)*R*a.current.zoom,D=a.current.center[1]+(P*2-1)*a.current.zoom;l.zoomAnchor=[X,D],l.zoomAnchorUv=[j,P]}else b.current.c?(l.mode="pick-c",l.startCx=a.current.juliaC[0],l.startCy=a.current.juliaC[1]):l.mode="splat"},qe=s=>{const m=e.current;if(!m)return;const l=N.current;if(!l.down)return;b.current.shift=s.shiftKey,b.current.alt=s.altKey;const f=performance.now();if(l.mode==="pick-c"){const O=o.current.getBoundingClientRect(),_=me(b.current.shift,b.current.alt),Y=a.current.zoom,le=O.width/O.height,re=s.clientX-l.startX,ce=s.clientY-l.startY,he=re/O.width*2*le*Y*_,pe=-(ce/O.height)*2*Y*_;V({juliaC:[l.startCx+he,l.startCy+pe]}),Z.current=[l.startCx+he,l.startCy+pe],l.lastX=s.clientX,l.lastY=s.clientY,l.lastT=f;return}if(l.mode==="pan-pending"){const O=s.clientX-l.startX,_=s.clientY-l.startY;if(O*O+_*_>ke*ke)l.mode="pan",l.rightDragged=!0;else return}if(l.mode==="zoom"){const O=o.current.getBoundingClientRect(),_=me(b.current.shift,b.current.alt),Y=s.clientY-l.startY,le=Math.exp(Y*Rt*_),re=Math.max(Se,Math.min(Be,l.startZoom*le)),ce=O.width/O.height,[he,pe]=l.zoomAnchorUv,Ke=[l.zoomAnchor[0]-(he*2-1)*ce*re,l.zoomAnchor[1]-(pe*2-1)*re];V({zoom:re,center:Ke});return}if(l.mode==="pan"){const O=o.current.getBoundingClientRect(),_=me(b.current.shift,b.current.alt),Y=a.current.zoom,le=O.width/O.height,re=s.clientX-l.startX,ce=s.clientY-l.startY,he=-(re/O.width)*2*le*Y*_,pe=ce/O.height*2*Y*_;V({center:[l.startCenterX+he,l.startCenterY+pe]}),l.lastX=s.clientX,l.lastY=s.clientY,l.lastT=f;return}const j=Math.max(1,f-l.lastT)/1e3,P=s.clientX-l.lastX,R=s.clientY-l.lastY;l.lastX=s.clientX,l.lastY=s.clientY,l.lastT=f;const X=o.current.getBoundingClientRect(),[D,$]=m.canvasToUv(s.clientX,s.clientY),ee=me(b.current.shift,b.current.alt),te=P/X.width/j*5*ee,se=-(R/X.height)/j*5*ee,be=Math.min(50,Math.hypot(te,se)),M=f*.001%1,W=.5+.5*Math.cos(6.28*M),ge=.5+.5*Math.cos(6.28*(M+.33)),K=.5+.5*Math.cos(6.28*(M+.67));m.splatForce(D,$,te,se,be,[W,ge,K])},Ae=s=>{N.current.down=!1;try{s.target.releasePointerCapture(s.pointerId)}catch{}},$e=s=>{if(!e.current)return;s.preventDefault();const l=me(s.shiftKey,s.altKey),f=Math.pow(.9,-s.deltaY*Mt*l),j=o.current.getBoundingClientRect(),P=(s.clientX-j.left)/j.width,R=1-(s.clientY-j.top)/j.height,X=j.width/j.height,D=a.current,$=D.center[0]+(P*2-1)*X*D.zoom,ee=D.center[1]+(R*2-1)*D.zoom,te=Math.max(Se,Math.min(Be,D.zoom*f)),se=[$-(P*2-1)*X*te,ee-(R*2-1)*te];V({zoom:te,center:se})};return T?r.jsx("div",{className:"w-full h-full flex items-center justify-center bg-black text-gray-200 p-6",children:r.jsxs("div",{className:"max-w-md",children:[r.jsx("div",{className:"text-lg font-semibold mb-2",children:"This toy needs WebGL2 with float render targets."}),r.jsx("div",{className:"text-xs text-gray-400 whitespace-pre-wrap",children:T})]})}):r.jsx(st,{value:Je,children:r.jsxs("div",{className:"w-full h-screen flex flex-col bg-black text-white",children:[r.jsx(vr,{kind:t.kind,forceMode:t.forceMode,juliaC:t.juliaC,zoom:t.zoom,simResolution:t.simResolution,effectiveSimRes:fe,fps:A,orbitOn:c.enabled,paused:t.paused,onSavePng:Fe,onScreenshot:We,onLoadFile:Ee,onSubmit:()=>S(!0)}),r.jsxs("div",{className:"flex-1 flex min-h-0",children:[r.jsxs("div",{className:"flex-1 relative",children:[r.jsx("canvas",{ref:o,className:"w-full h-full block",style:{touchAction:"none",cursor:N.current.mode==="pick-c"?"crosshair":N.current.mode==="pan"?"grabbing":N.current.mode==="zoom"?"ns-resize":"default"},onPointerDown:Ye,onPointerMove:qe,onPointerUp:Ae,onPointerCancel:Ae,onWheel:$e,onContextMenu:Ve}),I&&!k?r.jsxs("div",{className:"absolute bottom-2 left-2 px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[320px]",children:[r.jsxs("div",{className:"flex items-center justify-between mb-1",children:[r.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),r.jsx("button",{onClick:()=>B(!1),className:"text-gray-500 hover:text-gray-200 text-[10px] px-1 leading-none",title:"Hide (press ? to reopen)",children:"×"})]}),r.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[r.jsxs("li",{children:[r.jsx(G,{children:"Drag"})," inject force + dye into the fluid"]}),r.jsxs("li",{children:[r.jsx(G,{children:"C"}),"+",r.jsx(G,{children:"Drag"})," pick Julia c directly on the canvas"]}),r.jsxs("li",{children:[r.jsx(G,{children:"Right-click"}),"+",r.jsx(G,{children:"Drag"})," pan the fractal view"]}),r.jsxs("li",{children:[r.jsx(G,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),r.jsxs("li",{children:[r.jsx(G,{children:"Shift"}),"/",r.jsx(G,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),r.jsxs("li",{children:[r.jsx(G,{children:"Wheel"})," zoom · ",r.jsx(G,{children:"Middle"}),"+",r.jsx(G,{children:"Drag"})," smooth zoom · ",r.jsx(G,{children:"Home"})," recenter"]}),r.jsxs("li",{children:[r.jsx(G,{children:"Space"})," pause sim · ",r.jsx(G,{children:"R"})," clear fluid · ",r.jsx(G,{children:"O"})," toggle c-orbit · ",r.jsx(G,{children:"H"})," hide hints"]})]})]}):!k&&r.jsx("button",{onClick:()=>B(!0),className:"absolute bottom-2 left-2 px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70",title:"Show hotkeys",children:"? hotkeys"})]}),r.jsx("div",{className:"w-[320px] h-full border-l border-white/5 bg-[#0b0b0d] flex flex-col min-h-0",children:r.jsx(or,{params:t,setParams:V,onReset:de,orbit:c,setOrbit:ne,gradient:h,setGradient:v,gradientLut:F,onPresetApply:ve,onSaveJson:Xe,onSavePng:Fe,onLoadFile:Ee,hideHints:k})}),E&&r.jsx(ar,{x:E.x,y:E.y,items:E.items,onDismiss:()=>y(null)}),r.jsx(Cr,{open:d,canvas:o.current,state:d?Te(a.current,h,C.current):null,onClose:()=>S(!1)})]})]})})};function jr(o){return[{label:"Copy c to clipboard",hint:"Re, Im as decimal",onClick:o.copyCurrentC},{label:"Recenter view",hint:"center=(0,0), zoom=1.5",onClick:o.onRecenter},{label:o.paused?"Resume sim":"Pause sim",onClick:o.onTogglePaused},{label:o.orbitOn?"Stop c-orbit":"Start c-orbit",onClick:o.onToggleOrbit},{label:"Clear fluid",hint:"zero velocity + dye",onClick:o.onReset,danger:!0,separatorAbove:!0},...je.map((e,i)=>({label:`Preset: ${e.name}`,hint:e.desc,onClick:()=>o.onApplyPreset(e),separatorAbove:i===0}))]}const G=({children:o})=>r.jsx("kbd",{className:"px-1 py-[1px] rounded bg-white/[0.08] border border-white/15 text-[9px] font-mono text-gray-100",children:o}),ze=document.getElementById("root");if(!ze)throw new Error("Could not find root element to mount to");const Mr=at.createRoot(ze);Mr.render(r.jsx(ue.StrictMode,{children:r.jsx(Tr,{})}));
