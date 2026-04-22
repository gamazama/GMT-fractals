var ut=Object.defineProperty;var dt=(r,e,o)=>e in r?ut(r,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):r[e]=o;var f=(r,e,o)=>dt(r,typeof e!="symbol"?e+"":e,o);import{aC as x,W as ht,E as pt,X as ft,a1 as mt,aP as ke}from"./GenericDropdown-DTxFjByw.js";import{r as h,j as i,R as de}from"./three-fiber-C5DkfiAm.js";import{c as gt}from"./three-drei-hqOrdlmR.js";import Be from"./AdvancedGradientEditor-fpOC7CGu.js";import{b as xt}from"./EmbeddedColorPicker-Tn8XCUiU.js";import"./three-DZB2NGqN.js";import"./pako-DwGzBETv.js";const vt=`
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
`,je=`
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
`,_=`#version 300 es
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
}`,bt=`#version 300 es
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
}`,yt=`#version 300 es
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
${je}

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
}`,wt=`#version 300 es
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
}`,Ct=`#version 300 es
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
${je}
${vt}

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
}`,Tt=`#version 300 es
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
}`,jt=`#version 300 es
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
}`,Mt=`#version 300 es
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
}`,Dt=`#version 300 es
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
}`,Ft=`#version 300 es
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
}`,Rt=`#version 300 es
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
}`,Et=`#version 300 es
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
}`,St=`#version 300 es
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
uniform float uCaustics;       // 0..25 — laplacian-of-dye highlight
uniform int   uCollisionPreview; // 1 = overlay the mask with diagonal hatching so walls are visible
${je}

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

  // Solid obstacles: override the composite with the raw (untoned) gradient
  // colour so walls read as crisp objects, not as "dyed fluid near a wall."
  float solid = texture(uMask, uv + refractOffset).r;
  if (solid > 0.01) {
    col = mix(col, gradientForJulia(j, aux), solid);
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
}`,At=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uJulia;
uniform sampler2D uJuliaAux;
uniform sampler2D uGradient;           // main gradient (only needed for helper symbol linkage)
uniform sampler2D uCollisionGradient;  // user-authored B&W LUT: black = fluid, white = wall
uniform int   uColorMapping;
uniform float uGradientRepeat;
uniform float uGradientPhase;
${je}
void main() {
  vec4 j = texture(uJulia, vUv);
  vec4 a = texture(uJuliaAux, vUv);
  // Same mapping → t pipeline the main gradient uses, so walls track colour-mapping
  // changes exactly (angle / orbit trap / stripe / bands / whatever).
  float t0 = colorMappingT(j, a);
  float t = fract(t0 * uGradientRepeat + uGradientPhase);
  vec4 m = texture(uCollisionGradient, vec2(t, 0.5));
  float mask = dot(m.rgb, vec3(0.299, 0.587, 0.114));  // b&w → luma; also works if user uses colour
  // Interior points aren't walls (no escape → no fluid-side colour to collide with).
  mask *= j.a;
  fragColor = vec4(clamp(mask, 0.0, 1.0), 0.0, 0.0, 1.0);
}`,kt=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,Bt=`#version 300 es
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
}`,Pt=`#version 300 es
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
}`,Ut=`#version 300 es
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
}`,It=`#version 300 es
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
}`,Pe=1e-5,Ue=8,Ie=5,Nt=.002,Ot=.005,_t=5,Gt=.2,Lt=.002,Ne=192,zt=128,Vt=35,Jt=58,Ht=1.5,Xt=8,Wt=1500,we=256,Yt=.5,Oe={enabled:!1,radius:.02,speed:.4},$t="https://api.gmt-fractals.com/v1/toy-fluid/submissions",qt=30,_e=2*1024*1024,Ge=[{id:"linear",label:"Linear",hint:"Classic RGB multiply. Fades to black but mixing goes through muddy greys."},{id:"perceptual",label:"Perceptual",hint:"OKLab: decay only the L-channel. Hue + chroma preserved — dye fades hue-stable to black."},{id:"vivid",label:"Vivid",hint:"OKLab with chroma boost as lightness drops. Dye stays punchy all the way to near-black."}];function Kt(r){switch(r){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}const Qt=[{id:"none",label:"None",hint:"No compression. Vivid colours, will clip if exposure is too high."},{id:"reinhard",label:"Reinhard",hint:"Classic c/(1+c). Smooth but desaturates highlights."},{id:"agx",label:"AgX",hint:"Sobotka 2023. Hue-stable, vibrant highlights — best for rich colours."},{id:"filmic",label:"Filmic",hint:"Hable/Uncharted filmic. Cinematic contrast with gentle roll-off."}];function Zt(r){switch(r){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}const ei=[{id:"plain",label:"Plain",hint:"No post-processing — pure fluid+fractal composite."},{id:"electric",label:"Electric",hint:"Bloom + velocity-keyed chromatic aberration — plasma and lightning energy."},{id:"liquid",label:"Liquid",hint:"Dye-gradient refraction + laplacian caustics — water over glass."}],Le=[{id:"add",label:"Add",hint:"Linear accumulate — bright strokes build up, classic fluid look."},{id:"screen",label:"Screen",hint:"1−(1−d)(1−i) — overlapping dye glows brighter, never clips to full white."},{id:"max",label:"Max",hint:"Per-channel max — keeps the brightest layer, leaves darker alone."},{id:"over",label:"Over",hint:"Alpha compositing — uses the gradient's α to fade / mask dye onto existing."}];function ti(r){switch(r){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}const ze=[{id:"iterations",label:"Iterations",hint:"Smooth iteration count. Classic escape-time coloring."},{id:"angle",label:"Angle",hint:"arg(z_final). Gradient wraps around the set."},{id:"magnitude",label:"Magnitude",hint:"|z_final|. Brighter at faster escape."},{id:"decomposition",label:"Decomp",hint:"Binary by sign(imag z). Reveals the Julia domains."},{id:"bands",label:"Bands",hint:"Hard bands per integer iter — maximum banding."},{id:"orbit-point",label:"Trap·point",hint:"Orbit trap: min distance from the iteration to a point."},{id:"orbit-circle",label:"Trap·circle",hint:"Orbit trap: min distance to a ring of given radius."},{id:"orbit-cross",label:"Trap·cross",hint:"Orbit trap: min approach to the X/Y axes."},{id:"orbit-line",label:"Trap·line",hint:"Orbit trap: min distance to an arbitrary line."},{id:"stripe",label:"Stripe",hint:"Härkönen stripe-average — ⟨½+½·sin(k·arg z)⟩."},{id:"distance",label:"DE",hint:"Distance-estimate to the set. Crisp boundary glow."},{id:"derivative",label:"Derivative",hint:"log|dz/dc| — how fast orbits stretch around c."},{id:"potential",label:"Potential",hint:"log²|z| / 2ⁿ — continuous Böttcher potential."},{id:"trap-iter",label:"Trap iter",hint:"Iteration at which the trap minimum was reached."}];function Ce(r){switch(r){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function ii(r){switch(r){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const ve={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-1200,interiorDamp:.59,dt:.016,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,fluidStyle:"plain",bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,paused:!1,simResolution:1344,autoQuality:!0};class ri{constructor(e){f(this,"gl");f(this,"canvas");f(this,"quadVbo");f(this,"progJulia");f(this,"progMotion");f(this,"progAddForce");f(this,"progInjectDye");f(this,"progAdvect");f(this,"progDivergence");f(this,"progCurl");f(this,"progVorticity");f(this,"progPressure");f(this,"progGradSub");f(this,"progSplat");f(this,"progDisplay");f(this,"progClear");f(this,"progReproject");f(this,"progBloomExtract");f(this,"progBloomDown");f(this,"progBloomUp");f(this,"progMask");f(this,"bloomA");f(this,"bloomB");f(this,"bloomC");f(this,"bloomDirty",!0);f(this,"lastCenter",[0,0]);f(this,"lastZoom",1.5);f(this,"firstFrame",!0);f(this,"simW",0);f(this,"simH",0);f(this,"juliaCur");f(this,"juliaPrev");f(this,"forceTex");f(this,"velocity");f(this,"dye");f(this,"divergence");f(this,"pressure");f(this,"curl");f(this,"maskTex");f(this,"gradientTex",null);f(this,"collisionGradientTex",null);f(this,"params",{...ve});f(this,"lastTimeMs",0);f(this,"framebufferFormat");this.canvas=e;const o=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!o)throw new Error("WebGL2 required — your browser does not support it.");this.gl=o;const t=o.getExtension("EXT_color_buffer_float"),n=o.getExtension("EXT_color_buffer_half_float");if(!t&&!n)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=o.createBuffer(),o.bindBuffer(o.ARRAY_BUFFER,this.quadVbo),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),o.STATIC_DRAW),this.compileAll(),this.allocateTextures(this.params.simResolution)}detectFormat(){const e=this.gl,o=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const t of o){const n=e.createTexture();e.bindTexture(e.TEXTURE_2D,n),e.texImage2D(e.TEXTURE_2D,0,t.internal,4,4,0,t.format,t.type,null);const l=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0);const c=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(l),e.deleteTexture(n),c===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${t.name} render targets.`),t}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,o){const t=this.gl,n=t.createShader(e);if(t.shaderSource(n,o),t.compileShader(n),!t.getShaderParameter(n,t.COMPILE_STATUS)){const l=t.getShaderInfoLog(n)||"",c=o.split(`
`).map((d,p)=>`${String(p+1).padStart(4)}: ${d}`).join(`
`);throw console.error(`Shader compile error:
${l}
${c}`),new Error(`Shader compile error: ${l}`)}return n}linkProgram(e,o,t){const n=this.gl,l=this.compileShader(n.VERTEX_SHADER,e),c=this.compileShader(n.FRAGMENT_SHADER,o),d=n.createProgram();if(n.attachShader(d,l),n.attachShader(d,c),n.bindAttribLocation(d,0,"aPos"),n.linkProgram(d),!n.getProgramParameter(d,n.LINK_STATUS))throw new Error(`Program link error: ${n.getProgramInfoLog(d)}`);n.deleteShader(l),n.deleteShader(c);const p={};for(const b of t)p[b]=n.getUniformLocation(d,b);return{prog:d,uniforms:p}}compileAll(){this.progJulia=this.linkProgram(_,bt,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq"]),this.progMotion=this.linkProgram(_,yt,["uTexel","uJulia","uJuliaPrev","uJuliaAux","uGradient","uMask","uMode","uGain","uDt","uInteriorDamp","uDyeGain","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uForceCap"]),this.progAddForce=this.linkProgram(_,wt,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram(_,Ct,["uTexel","uDye","uJulia","uJuliaAux","uGradient","uMask","uDyeGain","uDyeFadeHz","uDt","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram(_,Tt,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(_,jt,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(_,Mt,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(_,Dt,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram(_,Ft,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(_,Rt,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram(_,Et,["uTexel","uTarget","uPoint","uValue","uRadius","uAspect"]),this.progDisplay=this.linkProgram(_,St,["uTexel","uTexelDisplay","uTexelDye","uJulia","uJuliaAux","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram(_,kt,["uValue"]),this.progReproject=this.linkProgram(_,It,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"]),this.progBloomExtract=this.linkProgram(_,Bt,["uTexel","uSource","uThreshold","uSoftKnee"]),this.progBloomDown=this.linkProgram(_,Pt,["uTexel","uSource"]),this.progBloomUp=this.linkProgram(_,Ut,["uTexel","uSource","uPrev","uIntensity"]),this.progMask=this.linkProgram(_,At,["uTexel","uJulia","uJuliaAux","uGradient","uCollisionGradient","uColorMapping","uGradientRepeat","uGradientPhase"])}createFBO(e,o){const t=this.gl,n=t.createTexture();t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,o,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const l=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,l),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,n,0),t.viewport(0,0,e,o),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{tex:n,fbo:l,width:e,height:o,texel:[1/e,1/o]}}createMrtFbo(e,o){const t=this.gl,n=()=>{const p=t.createTexture();return t.bindTexture(t.TEXTURE_2D,p),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,o,0,this.framebufferFormat.format,this.framebufferFormat.type,null),p},l=n(),c=n(),d=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,d),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,l,0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,c,0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,o),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texMain:l,texAux:c,fbo:d,width:e,height:o,texel:[1/e,1/o]}}deleteMrtFbo(e){if(!e)return;const o=this.gl;o.deleteTexture(e.texMain),o.deleteTexture(e.texAux),o.deleteFramebuffer(e.fbo)}createDoubleFBO(e,o){let t=this.createFBO(e,o),n=this.createFBO(e,o);return{width:e,height:o,texel:[1/e,1/o],get read(){return t},get write(){return n},swap(){const c=t;t=n,n=c}}}deleteFBO(e){if(!e)return;const o=this.gl;o.deleteTexture(e.tex),o.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateTextures(e){const o=this.canvas.width/Math.max(1,this.canvas.height),t=Math.max(32,e|0),n=Math.max(32,Math.round(t*o));n===this.simW&&t===this.simH&&this.juliaCur||(this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.simW=n,this.simH=t,this.juliaCur=this.createMrtFbo(n,t),this.juliaPrev=this.createMrtFbo(n,t),this.forceTex=this.createFBO(n,t),this.velocity=this.createDoubleFBO(n,t),this.dye=this.createDoubleFBO(n,t),this.divergence=this.createFBO(n,t),this.pressure=this.createDoubleFBO(n,t),this.curl=this.createFBO(n,t),this.maskTex=this.createFBO(n,t),this.firstFrame=!0)}bindFBO(e){const o=this.gl;o.bindFramebuffer(o.FRAMEBUFFER,e.fbo),o.viewport(0,0,e.width,e.height)}useProgram(e){const o=this.gl;o.useProgram(e.prog),o.bindBuffer(o.ARRAY_BUFFER,this.quadVbo),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,o,t){const n=this.gl,l=e.uniforms.uTexel;l&&n.uniform2f(l,1/o,1/t)}bindTex(e,o,t){const n=this.gl;n.activeTexture(n.TEXTURE0+e),n.bindTexture(n.TEXTURE_2D,o),t&&n.uniform1i(t,e)}setParams(e){this.params={...this.params,...e},e.simResolution&&e.simResolution!==this.simH&&this.allocateTextures(e.simResolution)}uploadLut(e,o){const t=this.gl,n=we*4;o.length!==n&&console.warn(`[FluidEngine] ${e} gradient buffer unexpected length ${o.length} (want ${n})`);let l=e==="main"?this.gradientTex:this.collisionGradientTex;l||(l=t.createTexture(),e==="main"?this.gradientTex=l:this.collisionGradientTex=l),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,l),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,we,1,0,t.RGBA,t.UNSIGNED_BYTE,o)}setGradientBuffer(e){this.uploadLut("main",e)}setCollisionGradientBuffer(e){this.uploadLut("collision",e)}ensureGradient(){if(this.gradientTex)return;const e=we,o=new Uint8Array(e*4);for(let t=0;t<e;++t)o[t*4+0]=t,o[t*4+1]=t,o[t*4+2]=t,o[t*4+3]=255;this.setGradientBuffer(o)}ensureCollisionGradient(){if(this.collisionGradientTex)return;const e=we,o=new Uint8Array(e*4);for(let t=0;t<e;++t)o[t*4+0]=0,o[t*4+1]=0,o[t*4+2]=0,o[t*4+3]=255;this.setCollisionGradientBuffer(o)}resize(e,o){const t=Math.min(window.devicePixelRatio||1,2),n=Math.max(1,Math.round(e*t)),l=Math.max(1,Math.round(o*t));(this.canvas.width!==n||this.canvas.height!==l)&&(this.canvas.width=n,this.canvas.height=l,this.allocateTextures(this.params.simResolution),this.bloomDirty=!0)}ensureBloomFbos(){if(!this.bloomDirty&&this.bloomA)return;this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC);const e=this.canvas.width,o=this.canvas.height,t=Math.max(4,e>>1&-2),n=Math.max(4,o>>1&-2),l=Math.max(2,e>>2&-2),c=Math.max(2,o>>2&-2),d=Math.max(2,e>>3&-2),p=Math.max(2,o>>3&-2);this.bloomA=this.createFBO(t,n),this.bloomB=this.createFBO(l,c),this.bloomC=this.createFBO(d,p),this.bloomDirty=!1}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const o of[this.velocity,this.dye,this.pressure])for(const t of[o.read,o.write])this.bindFBO(t),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,o,t,n){const l=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),l.uniform2f(this.progSplat.uniforms.uPoint,o,t),l.uniform3f(this.progSplat.uniforms.uValue,n[0],n[1],n[2]),l.uniform1f(this.progSplat.uniforms.uRadius,Lt),l.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}splatForce(e,o,t,n,l,c){e=Math.max(0,Math.min(1,e)),o=Math.max(0,Math.min(1,o)),this.splat(this.velocity,e,o,[t*l,n*l,0]),this.splat(this.dye,e,o,c),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}renderJulia(){const e=this.gl,o=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=o,e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const t=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,t),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(t,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,ii(this.params.colorMapping)),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq),this.drawQuad()}computeMask(){const e=this.gl;if(this.ensureGradient(),this.ensureCollisionGradient(),this.bindFBO(this.maskTex),!this.params.collisionEnabled){e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);return}this.useProgram(this.progMask),this.setTexel(this.progMask,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMask.uniforms.uJulia),this.bindTex(1,this.juliaCur.texAux,this.progMask.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMask.uniforms.uGradient),this.bindTex(3,this.collisionGradientTex,this.progMask.uniforms.uCollisionGradient),e.uniform1i(this.progMask.uniforms.uColorMapping,Ce(this.params.colorMapping)),e.uniform1f(this.progMask.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMask.uniforms.uGradientPhase,this.params.gradientPhase),this.drawQuad()}computeForce(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,this.juliaCur.texAux,this.progMotion.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMotion.uniforms.uGradient),this.bindTex(5,this.maskTex.tex,this.progMotion.uniforms.uMask),e.uniform1i(this.progMotion.uniforms.uMode,oi(this.params.forceMode)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uDyeGain,this.params.dyeInject),e.uniform1i(this.progMotion.uniforms.uColorMapping,Ce(this.params.colorMapping)),e.uniform1f(this.progMotion.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMotion.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.maskTex.tex,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH),this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,this.juliaCur.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(2,this.gradientTex,this.progInjectDye.uniforms.uGradient),this.bindTex(4,this.juliaCur.texAux,this.progInjectDye.uniforms.uJuliaAux),this.bindTex(5,this.maskTex.tex,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1i(this.progInjectDye.uniforms.uColorMapping,Ce(this.params.colorMapping)),e.uniform1f(this.progInjectDye.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progInjectDye.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,ti(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,Kt(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let o=0;o<this.params.pressureIters;++o)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.maskTex.tex,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,o){const t=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.maskTex.tex,this.progAdvect.uniforms.uMask),t.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),t.uniform1f(this.progAdvect.uniforms.uDissipation,o),t.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,o,t){const n=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),n.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),n.uniform2f(this.progReproject.uniforms.uOldCenter,o[0],o[1]),n.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),n.uniform1f(this.progReproject.uniforms.uOldZoom,t),n.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],o=this.params.center[1]-this.lastCenter[1],t=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(o)<1e-7&&Math.abs(t)<1e-7)return;const n=[this.lastCenter[0],this.lastCenter[1]],l=this.lastZoom;this.reprojectTexture(this.dye,n,l),this.reprojectTexture(this.velocity,n,l),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.ensureGradient();const o=this.params.bloomAmount>.001;o&&(this.ensureBloomFbos(),this.bindFBO(this.bloomA),this.setDisplayUniforms(null,!0),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomExtract),e.uniform2f(this.progBloomExtract.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomA.tex,this.progBloomExtract.uniforms.uSource),e.uniform1f(this.progBloomExtract.uniforms.uThreshold,this.params.bloomThreshold),e.uniform1f(this.progBloomExtract.uniforms.uSoftKnee,Yt),this.drawQuad(),this.bindFBO(this.bloomC),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomA),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomUp),e.uniform2f(this.progBloomUp.uniforms.uTexel,this.bloomC.texel[0],this.bloomC.texel[1]),this.bindTex(0,this.bloomC.tex,this.progBloomUp.uniforms.uSource),this.bindTex(1,this.bloomA.tex,this.progBloomUp.uniforms.uPrev),e.uniform1f(this.progBloomUp.uniforms.uIntensity,1),this.drawQuad()),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(o?this.bloomB:null,!1),this.drawQuad()}setDisplayUniforms(e,o=!1){const t=this.gl;this.useProgram(this.progDisplay),t.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),t.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH),this.bindTex(0,this.juliaCur.texMain,this.progDisplay.uniforms.uJulia),this.bindTex(4,this.juliaCur.texAux,this.progDisplay.uniforms.uJuliaAux),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradientTex,this.progDisplay.uniforms.uGradient),this.bindTex(5,(e==null?void 0:e.tex)??this.gradientTex,this.progDisplay.uniforms.uBloom),this.bindTex(6,this.maskTex.tex,this.progDisplay.uniforms.uMask),t.uniform1i(this.progDisplay.uniforms.uShowMode,ai(this.params.show)),t.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),t.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),t.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),t.uniform1i(this.progDisplay.uniforms.uColorMapping,Ce(this.params.colorMapping)),t.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),t.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),t.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),o?(t.uniform1i(this.progDisplay.uniforms.uToneMapping,0),t.uniform1f(this.progDisplay.uniforms.uExposure,1),t.uniform1f(this.progDisplay.uniforms.uVibrance,0),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),t.uniform1f(this.progDisplay.uniforms.uAberration,0),t.uniform1f(this.progDisplay.uniforms.uRefraction,0),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),t.uniform1f(this.progDisplay.uniforms.uCaustics,0),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(t.uniform1i(this.progDisplay.uniforms.uToneMapping,Zt(this.params.toneMapping)),t.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),t.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),t.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),t.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),t.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const o=this.gl,t=this.lastTimeMs===0?.016:Math.min(.05,(e-this.lastTimeMs)/1e3);this.lastTimeMs=e,this.params.dt=t,this.renderJulia(),this.computeMask(),this.params.paused||(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,null)}dispose(){const e=this.gl;this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.gradientTex&&(e.deleteTexture(this.gradientTex),this.gradientTex=null),this.collisionGradientTex&&(e.deleteTexture(this.collisionGradientTex),this.collisionGradientTex=null),this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC),e.deleteBuffer(this.quadVbo);for(const o of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progMask,this.progBloomExtract,this.progBloomDown,this.progBloomUp])o!=null&&o.prog&&e.deleteProgram(o.prog)}canvasToFractal(e,o){const t=this.canvas.getBoundingClientRect(),n=(e-t.left)/t.width,l=1-(o-t.top)/t.height,c=this.canvas.width/this.canvas.height,d=(n*2-1)*c*this.params.zoom+this.params.center[0],p=(l*2-1)*this.params.zoom+this.params.center[1];return[d,p]}canvasToUv(e,o){const t=this.canvas.getBoundingClientRect();return[(e-t.left)/t.width,1-(o-t.top)/t.height]}}function oi(r){switch(r){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function ai(r){switch(r){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const Ve=96;function ni(r,e){const t=(e-Math.floor(e))*256,n=Math.floor(t)%256,l=(n+1)%256,c=t-Math.floor(t),d=r[n*4+0]*(1-c)+r[l*4+0]*c,p=r[n*4+1]*(1-c)+r[l*4+1]*c,b=r[n*4+2]*(1-c)+r[l*4+2]*c;return[d,p,b]}function si(r,e,o,t){switch(t){case"angle":return Math.atan2(o,e)*.15915494+.5;case"magnitude":return Math.max(0,Math.min(1,Math.hypot(e,o)*.08));case"decomposition":return(o>=0?.5:0)+.25;case"bands":return Math.floor(r)*.0625;case"potential":{const n=Math.max(e*e+o*o,1.0001);return Math.log2(Math.log2(n))*.5%1}case"orbit-point":case"orbit-circle":case"orbit-cross":case"orbit-line":case"stripe":case"distance":case"derivative":case"trap-iter":case"iterations":default:return r*.05}}function li(r,e,o,t,n,l,c,d,p,b){const V=new ImageData(r,r),B=V.data,J=Math.round(p[0]*255),N=Math.round(p[1]*255),H=Math.round(p[2]*255),G=Math.round(b),A=Math.abs(b-G)<.01&&G>=2&&G<=8;for(let k=0;k<r;k++){const T=o+(k/r*2-1)*t;for(let v=0;v<r;v++){const y=e+(v/r*2-1)*t;let j=0,D=0,S=0;for(;S<Ve;S++){const C=j*j,$=D*D;if(C+$>16)break;let a,I;if(A){let P=j,ee=D;for(let re=1;re<G;re++){const q=P*j-ee*D;ee=P*D+ee*j,P=q}a=P,I=ee}else{const P=Math.sqrt(C+$),ee=Math.atan2(D,j),re=Math.pow(P,b),q=ee*b;a=re*Math.cos(q),I=re*Math.sin(q)}j=a+y,D=I+T}const X=((r-1-k)*r+v)*4;if(S>=Ve)B[X+0]=J,B[X+1]=N,B[X+2]=H;else{const C=S+1-Math.log2(Math.max(1e-6,.5*Math.log2(j*j+D*D))),a=si(C,j,D,d)*l+c,[I,P,ee]=ni(n,a);B[X+0]=Math.round(I),B[X+1]=Math.round(P),B[X+2]=Math.round(ee)}B[X+3]=255}}return V}const ci=(()=>{const r=new Uint8Array(1024);for(let e=0;e<256;e++)r[e*4]=r[e*4+1]=r[e*4+2]=e,r[e*4+3]=255;return r})(),ui=({cx:r,cy:e,onChange:o,halfExtent:t=1.6,centerX:n=-.5,centerY:l=0,size:c=220,gradientLut:d,gradientRepeat:p=1,gradientPhase:b=0,colorMapping:V="iterations",interiorColor:B=[.04,.04,.06],power:J=2})=>{const N=h.useRef(null),H=h.useRef(null),G=h.useRef(!1);h.useEffect(()=>{const T=N.current;if(!T)return;const v=T.getContext("2d");if(!v)return;T.width=c,T.height=c;const j=li(c,n,l,t,d??ci,p,b,V,B,J);H.current=j,v.putImageData(j,0,0),A()},[c,n,l,t,d,p,b,V,B[0],B[1],B[2],J]);const A=h.useCallback(()=>{const T=N.current;if(!T||!H.current)return;const v=T.getContext("2d");if(!v)return;v.putImageData(H.current,0,0);const y=(r-n)/t*.5+.5,j=(e-l)/t*.5+.5,D=y*c,S=(1-j)*c;v.strokeStyle="#fff",v.lineWidth=1,v.beginPath(),v.moveTo(D-8,S),v.lineTo(D-2,S),v.moveTo(D+2,S),v.lineTo(D+8,S),v.moveTo(D,S-8),v.lineTo(D,S-2),v.moveTo(D,S+2),v.lineTo(D,S+8),v.stroke(),v.strokeStyle="rgba(0,255,200,0.9)",v.beginPath(),v.arc(D,S,4,0,2*Math.PI),v.stroke()},[r,e,n,l,t,c]);h.useEffect(()=>{A()},[A]);const k=T=>{const v=N.current;if(!v)return;const y=v.getBoundingClientRect(),j=(T.clientX-y.left)/y.width,D=1-(T.clientY-y.top)/y.height,S=n+(j*2-1)*t,X=l+(D*2-1)*t;o(S,X)};return i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),i.jsx("canvas",{ref:N,className:"rounded border border-white/10 cursor-crosshair",style:{width:c,height:c,imageRendering:"pixelated"},onPointerDown:T=>{G.current=!0,T.target.setPointerCapture(T.pointerId),k(T)},onPointerMove:T=>{G.current&&k(T)},onPointerUp:T=>{G.current=!1;try{T.target.releasePointerCapture(T.pointerId)}catch{}}}),i.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",r.toFixed(4),", ",e.toFixed(4),")"]})]})},se=r=>r.map(([e,o],t)=>({id:`s${t}`,position:e,color:o,bias:.5,interpolation:"linear"})),De=[{id:"coral-gyre",name:"Coral Gyre",desc:"Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.",params:{juliaC:[-.8173594132029339,.15279058679706603],center:[0,0],zoom:1.5,maxIter:182,power:2,kind:"julia",forceMode:"curl",forceGain:-760,interiorDamp:.9,dissipation:.1,dyeDissipation:.63,dyeInject:2.28,vorticity:25.9,vorticityScale:4.2,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:.56,gradientPhase:.09,colorMapping:"orbit-point",colorIter:96,trapCenter:[1.17,0],dyeBlend:"add",dyeDecayMode:"vivid",dyeSaturationBoost:1.01,toneMapping:"filmic",exposure:2.295,vibrance:1.87,bloomAmount:1.35,bloomThreshold:1,aberration:1.12,refraction:0,refractSmooth:1,caustics:3.9,interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,collisionEnabled:!0,simResolution:768},gradient:{stops:se([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.513,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.573,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"ink-canyon",name:"Ink Canyon",desc:"Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:0,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0,simResolution:1024},gradient:{stops:se([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.02,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.07,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:.833,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c4",position:.883,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"plasma-vein",name:"Plasma Vein",desc:"Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.7,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",dyeDecayMode:"vivid",toneMapping:"filmic",exposure:1.86,vibrance:1.645,aberration:.5,refraction:.006,refractSmooth:11.8,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:se([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.536,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.586,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"crater-drift",name:"Crater Drift",desc:"Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.9313160617349564,-.15288948147190096],zoom:1.1807159194396142,maxIter:604,power:2,kind:"mandelbrot",forceMode:"curl",forceGain:-535.6,interiorDamp:0,dissipation:.16,dyeDissipation:.05,dyeInject:3,vorticity:2.9,vorticityScale:1.2,pressureIters:48,show:"composite",juliaMix:0,dyeMix:1.01,velocityViz:0,gradientRepeat:.66,gradientPhase:0,colorMapping:"iterations",colorIter:263,trapCenter:[1.51,-1.37],dyeBlend:"max",dyeDecayMode:"perceptual",dyeChromaDecayHz:0,toneMapping:"filmic",exposure:20.63,vibrance:1.645,bloomAmount:.63,bloomThreshold:.76,aberration:.4,refraction:0,caustics:0,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:38.5,collisionEnabled:!0,simResolution:768},gradient:{stops:se([[.084,"#000004"],[.215,"#280B54"],[.346,"#65156E"],[.477,"#9F2A63"],[.607,"#D44842"],[.738,"#F52D15"],[.869,"#FA2727"],[1,"#FF7983"]]),colorSpace:"srgb",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.532,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.659,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"quartic-strata",name:"Quartic Strata",desc:"Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0,simResolution:1344},gradient:{stops:se([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.113,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.163,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.2}},{id:"sunset-bands",name:"Sunset Bands",desc:"Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,dyeBlend:"over",aberration:.27,refraction:0,caustics:1,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12,simResolution:1536},gradient:{stops:se([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"verdant-pulse",name:"Verdant Pulse",desc:"Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.",params:{juliaC:[-.7,.27015],center:[-.15958346356258324,-.09244114001481094],zoom:1.3957783246444389,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.17,dyeInject:.9,vorticity:16,vorticityScale:5.8,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,dyeBlend:"over",dyeDecayMode:"perceptual",exposure:.35,vibrance:1.645,aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,collisionEnabled:!0,simResolution:768},gradient:{stops:se([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.037,color:"#000000",bias:.5,interpolation:"linear"},{id:"c2",position:.943,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#626262",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.035,speed:.02}}],Je={stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.55,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.6,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},di={stops:se([[0,"#421E0F"],[.067,"#19071A"],[.133,"#09012F"],[.2,"#040449"],[.267,"#000764"],[.333,"#0C2C8A"],[.4,"#1852B1"],[.467,"#397DD1"],[.533,"#86B5E5"],[.6,"#D3ECF8"],[.667,"#F1E9BF"],[.733,"#F8C95F"],[.8,"#FFAA00"],[.867,"#CC8000"],[.933,"#995700"],[1,"#6A3403"]]),colorSpace:"linear",blendSpace:"oklab"},$e=de.createContext(!1),He=[{id:"gradient",label:"Gradient",hint:"∇(escape iter) — force points AWAY from the set interior. Fractal acts as a source."},{id:"curl",label:"Curl",hint:"Perp of ∇(escape iter) — divergence-free swirl along level sets. Fluid surfs the contours."},{id:"iterate",label:"Iterate",hint:"Final z iterate direction (Böttcher). Fluid flows along the fractal's own orbit grain."},{id:"c-track",label:"C-Track",hint:"Δ(julia)/Δt as you move c. Fluid follows the deformation of the fractal in real time."},{id:"hue",label:"Hue",hint:"Rendered hue → angle, value → magnitude. The picture itself is the velocity field."}],Xe=[{id:"composite",label:"Mixed",hint:"Fractal + dye + optional velocity overlay"},{id:"julia",label:"Fractal",hint:"Pure fractal, fluid hidden"},{id:"dye",label:"Dye",hint:"Fluid dye only — shows what the fractal wrote"},{id:"velocity",label:"Velocity",hint:"Per-pixel velocity as a hue wheel"}],hi=[{id:"julia",label:"Julia"},{id:"mandelbrot",label:"Mandelbrot"}],We=["Fractal","Coupling","Fluid","Palette","Post-FX","Collision","Composite","Presets"];function pi(r){const e=o=>Math.max(0,Math.min(255,Math.round(o*255))).toString(16).padStart(2,"0");return"#"+e(r[0])+e(r[1])+e(r[2])}function fi(r){const e=r.replace("#",""),o=parseInt(e.slice(0,2),16)/255,t=parseInt(e.slice(2,4),16)/255,n=parseInt(e.slice(4,6),16)/255;return[o,t,n]}const Y=({active:r,onClick:e,title:o,children:t,className:n=""})=>i.jsx("button",{type:"button",onClick:e,title:o,className:"px-2 py-1 text-[10px] rounded border transition-colors "+(r?"bg-cyan-500/20 border-cyan-400/60 text-cyan-200":"bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08]")+" "+n,children:t}),U=({children:r})=>de.useContext($e)?null:i.jsx("div",{className:"text-[9px] text-gray-500 leading-snug pl-1 pt-0.5",children:r}),w=({hint:r,children:e})=>i.jsxs("div",{className:"flex flex-col gap-0.5",children:[e,r&&i.jsx(U,{children:r})]}),xe=({children:r,right:e})=>i.jsxs("div",{className:"flex items-center justify-between pt-1",children:[i.jsx("div",{className:"text-[10px] uppercase text-gray-400 tracking-wide",children:r}),e]}),mi=({params:r,setParams:e,onReset:o,orbit:t,setOrbit:n,gradient:l,setGradient:c,gradientLut:d,collisionGradient:p,setCollisionGradient:b,onPresetApply:V,onSaveJson:B,onSavePng:J,onLoadFile:N,hideHints:H})=>{var D,S,X,C,$;const G=de.useRef(null),[A,k]=de.useState("Presets"),T=a=>{const I=De.find(P=>P.id===a);I&&V(I)},v=a=>{var P;const I=(P=a.target.files)==null?void 0:P[0];I&&N(I),a.target.value=""},y=a=>{e(a==="plain"?{fluidStyle:"plain",bloomAmount:0,aberration:0,refraction:0,caustics:0}:a==="electric"?{fluidStyle:"electric",bloomAmount:.6,bloomThreshold:1,aberration:1,refraction:0,caustics:0,vibrance:.3}:{fluidStyle:"liquid",bloomAmount:.25,bloomThreshold:1.1,aberration:0,refraction:.08,caustics:8,vibrance:.3})},j=H?"gap-0.5":"gap-3";return i.jsx($e.Provider,{value:H,children:i.jsxs("div",{className:"flex flex-col h-full text-gray-200 text-xs select-none",children:[i.jsxs("div",{className:"flex items-center justify-between px-3 pt-3 pb-2",children:[i.jsxs("div",{children:[i.jsx("div",{className:"text-sm font-semibold",children:"Julia Fluid Toy"}),i.jsx("div",{className:"text-[10px] text-gray-500",children:"fractal ↔ fluid coupling lab"})]}),i.jsx("a",{href:"./index.html",className:"text-[10px] text-cyan-300 hover:underline",children:"← back to GMT"})]}),i.jsx("div",{className:"bg-black/40 border-b border-white/10",children:[We.slice(0,4),We.slice(4,8)].map((a,I)=>i.jsx("div",{className:`flex ${I===0?"border-b border-white/5":""}`,children:a.map(P=>i.jsxs("button",{type:"button",onClick:()=>k(P),className:`flex-1 py-1.5 px-0 text-[10px] font-bold tracking-wide whitespace-nowrap transition-all relative ${A===P?"text-cyan-400 bg-white/5":"text-gray-500 hover:text-gray-300 hover:bg-white/5"}`,children:[P,A===P&&i.jsx("div",{className:"absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"})]},P))},I))}),i.jsxs("div",{className:`flex-1 overflow-y-auto px-3 pt-3 pb-2 flex flex-col ${j}`,children:[A==="Fractal"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"The fractal is the force generator. Every fluid frame reads this texture."}),i.jsx("div",{className:"flex gap-1",children:hi.map(a=>i.jsx(Y,{active:r.kind===a.id,onClick:()=>e({kind:a.id}),children:a.label},a.id))}),i.jsx(ui,{cx:r.juliaC[0],cy:r.juliaC[1],onChange:(a,I)=>e({juliaC:[a,I]}),gradientLut:d??void 0,gradientRepeat:r.gradientRepeat,gradientPhase:r.gradientPhase,colorMapping:r.colorMapping,interiorColor:r.interiorColor,power:r.power}),i.jsx(w,{hint:"Julia constant. Move me to reshape the entire fractal — and the forces it emits.",children:i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"c.x",value:r.juliaC[0],onChange:a=>e({juliaC:[a,r.juliaC[1]]}),min:-2,max:2,step:.001,variant:"full"}),i.jsx(x,{label:"c.y",value:r.juliaC[1],onChange:a=>e({juliaC:[r.juliaC[0],a]}),min:-2,max:2,step:.001,variant:"full"})]})}),i.jsx(w,{hint:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001).",children:i.jsx(x,{label:"Zoom",value:r.zoom,onChange:a=>e({zoom:a}),min:1e-5,max:8,step:1e-4,hardMin:1e-5,variant:"full"})}),i.jsx(w,{hint:"Pan the fractal window.",children:i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"Center.x",value:r.center[0],onChange:a=>e({center:[a,r.center[1]]}),min:-2,max:2,step:.01,variant:"full"}),i.jsx(x,{label:"Center.y",value:r.center[1],onChange:a=>e({center:[r.center[0],a]}),min:-2,max:2,step:.01,variant:"full"})]})}),i.jsx(w,{hint:"More iterations → sharper escape gradients → finer force detail.",children:i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"Iter",value:r.maxIter,onChange:a=>e({maxIter:Math.round(a)}),min:16,max:512,step:1,variant:"full"}),i.jsx(x,{label:"Power",value:r.power,onChange:a=>e({power:a}),min:2,max:8,step:1,variant:"full"})]})})]}),A==="Coupling"&&i.jsxs(i.Fragment,{children:[i.jsxs(U,{children:["The coupling law. Chooses ",i.jsx("em",{children:"how"})," fractal pixels become velocity at each cell."]}),i.jsx("div",{className:"grid grid-cols-3 gap-1",children:He.map(a=>i.jsx(Y,{active:r.forceMode===a.id,onClick:()=>e({forceMode:a.id}),title:a.hint,children:a.label},a.id))}),!H&&i.jsx("div",{className:"text-[10px] text-cyan-200/80 leading-snug bg-cyan-900/20 border border-cyan-500/20 rounded px-2 py-1",children:(D=He.find(a=>a.id===r.forceMode))==null?void 0:D.hint}),i.jsx(w,{hint:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction.",children:i.jsx(x,{label:"Force gain",value:r.forceGain,onChange:a=>e({forceGain:a}),min:-2e3,max:2e3,step:.1,variant:"full"})}),i.jsx(w,{hint:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed.",children:i.jsx(x,{label:"Interior damp",value:r.interiorDamp,onChange:a=>e({interiorDamp:a}),min:0,max:1,step:.01,variant:"full"})}),i.jsx(w,{hint:"Per-pixel cap on the fractal force magnitude.",children:i.jsx(x,{label:"Force cap",value:r.forceCap,onChange:a=>e({forceCap:a}),min:1,max:40,step:.5,variant:"full"})}),i.jsx(w,{hint:"Fades force/dye injection near the canvas edges. Fixes 'gushing from the borders' under fast c-changes.",children:i.jsx(x,{label:"Edge margin",value:r.edgeMargin,onChange:a=>e({edgeMargin:a}),min:0,max:.25,step:.005,variant:"full"})}),i.jsx(xe,{right:i.jsx(Y,{active:t.enabled,onClick:()=>n({enabled:!t.enabled}),children:t.enabled?"on":"off"}),children:"Auto-orbit c"}),i.jsxs(U,{children:["Circles c automatically around its current value. Pair with ",i.jsx("b",{children:"C-Track"})," to watch the fluid breathe with the fractal's deformation."]}),t.enabled&&i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"Radius",value:t.radius,onChange:a=>n({radius:a}),min:0,max:.5,step:.001,variant:"full"}),i.jsx(x,{label:"Speed",value:t.speed,onChange:a=>n({speed:a}),min:0,max:3,step:.01,variant:"full"})]})]}),A==="Fluid"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"How the fluid carries and forgets what the fractal pushed into it."}),i.jsx(w,{hint:"Amplifies existing curl — keeps fractal-induced swirls from smearing away.",children:i.jsx(x,{label:"Vorticity",value:r.vorticity,onChange:a=>e({vorticity:a}),min:0,max:50,step:.1,variant:"full"})}),r.vorticity>0&&i.jsx(w,{hint:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices.",children:i.jsx(x,{label:"Vorticity scale",value:r.vorticityScale,onChange:a=>e({vorticityScale:a}),min:.5,max:8,step:.1,variant:"full"})}),i.jsx(w,{hint:"How fast velocity decays. High = fluid forgets the fractal quickly.",children:i.jsx(x,{label:"Velocity dissipation /s",value:r.dissipation,onChange:a=>e({dissipation:a}),min:0,max:5,step:.01,variant:"full"})}),i.jsx(w,{hint:"How much of the fractal's color bleeds into the fluid each frame.",children:i.jsx(x,{label:"Dye inject",value:r.dyeInject,onChange:a=>e({dyeInject:a}),min:0,max:3,step:.01,variant:"full"})}),i.jsx(w,{hint:"Jacobi iterations for incompressibility. More = stricter but slower.",children:i.jsx(x,{label:"Pressure iters",value:r.pressureIters,onChange:a=>e({pressureIters:Math.round(a)}),min:4,max:60,step:1,variant:"full"})}),i.jsx(xe,{children:"Dye decay"}),i.jsx(U,{children:"How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid)."}),i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("div",{className:"text-[10px] text-gray-400",children:"Colour space"}),i.jsx("div",{className:"grid grid-cols-3 gap-1",children:Ge.map(a=>i.jsx(Y,{active:r.dyeDecayMode===a.id,onClick:()=>e({dyeDecayMode:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(U,{children:(S=Ge.find(a=>a.id===r.dyeDecayMode))==null?void 0:S.hint})]}),i.jsx(w,{hint:r.dyeDecayMode==="linear"?"How fast dye fades (RGB multiply).":"Per-second luminance fade (OKLab L). Chroma fades on its own schedule below.",children:i.jsx(x,{label:"Dye dissipation /s",value:r.dyeDissipation,onChange:a=>e({dyeDissipation:a}),min:0,max:5,step:.01,variant:"full"})}),r.dyeDecayMode!=="linear"&&i.jsxs(i.Fragment,{children:[i.jsx(w,{hint:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright.",children:i.jsx(x,{label:"Chroma decay /s",value:r.dyeChromaDecayHz,onChange:a=>e({dyeChromaDecayHz:a}),min:0,max:5,step:.01,variant:"full"})}),i.jsx(w,{hint:"Per-frame chroma multiplier applied after decay. 1 = neutral, <1 washes out, >1 punches colours up.",children:i.jsx(x,{label:"Saturation boost",value:r.dyeSaturationBoost,onChange:a=>e({dyeSaturationBoost:a}),min:0,max:4,step:.01,variant:"full"})})]}),i.jsx(xe,{right:i.jsx(Y,{active:r.autoQuality,onClick:()=>e({autoQuality:!r.autoQuality}),children:r.autoQuality?"on":"off"}),children:"Quality"}),i.jsx(U,{children:"The slider is your target. Auto-quality may drop below it if FPS is low, then snaps back in one jump when it recovers (no stair-step flashing)."}),i.jsx(w,{hint:"Target fluid grid height in cells. More = finer detail, slower.",children:i.jsx(x,{label:"Sim resolution",value:r.simResolution,onChange:a=>e({simResolution:Math.round(a)}),min:128,max:1536,step:32,variant:"full"})})]}),A==="Palette"&&i.jsxs(i.Fragment,{children:[i.jsxs(U,{children:["Colors both the fractal AND the dye that gets injected into the fluid. In Hue-mode, it ",i.jsx("em",{children:"is"})," the vector field."]}),i.jsx(Be,{value:l,onChange:a=>{Array.isArray(a)?c({stops:a,colorSpace:l.colorSpace,blendSpace:l.blendSpace}):c(a)}}),i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("div",{className:"text-[10px] text-gray-400",children:"Color mapping"}),i.jsx("div",{className:"grid grid-cols-3 gap-1",children:ze.map(a=>i.jsx(Y,{active:r.colorMapping===a.id,onClick:()=>e({colorMapping:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(U,{children:(X=ze.find(a=>a.id===r.colorMapping))==null?void 0:X.hint})]}),i.jsx(w,{hint:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands.",children:i.jsx(x,{label:"Repetition",value:r.gradientRepeat,onChange:a=>e({gradientRepeat:a}),min:.1,max:8,step:.01,variant:"full"})}),i.jsx(w,{hint:"Phase shift — rotates the colors without changing their layout.",children:i.jsx(x,{label:"Phase",value:r.gradientPhase,onChange:a=>e({gradientPhase:a}),min:0,max:1,step:.005,variant:"full"})}),i.jsx(w,{hint:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter. Reduce for fresher colours.",children:i.jsx(x,{label:"Color iter",value:r.colorIter,onChange:a=>e({colorIter:Math.round(a)}),min:1,max:Math.max(4,r.maxIter),step:1,variant:"full"})}),(r.colorMapping==="orbit-point"||r.colorMapping==="orbit-circle"||r.colorMapping==="orbit-cross"||r.colorMapping==="trap-iter")&&i.jsx(w,{hint:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",children:i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"Trap.x",value:r.trapCenter[0],onChange:a=>e({trapCenter:[a,r.trapCenter[1]]}),min:-2,max:2,step:.01,variant:"full"}),i.jsx(x,{label:"Trap.y",value:r.trapCenter[1],onChange:a=>e({trapCenter:[r.trapCenter[0],a]}),min:-2,max:2,step:.01,variant:"full"})]})}),r.colorMapping==="orbit-circle"&&i.jsx(w,{hint:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring.",children:i.jsx(x,{label:"Trap radius",value:r.trapRadius,onChange:a=>e({trapRadius:a}),min:.01,max:4,step:.01,variant:"full"})}),r.colorMapping==="orbit-line"&&i.jsx(w,{hint:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length.",children:i.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[i.jsx(x,{label:"n.x",value:r.trapNormal[0],onChange:a=>e({trapNormal:[a,r.trapNormal[1]]}),min:-1,max:1,step:.01,variant:"full"}),i.jsx(x,{label:"n.y",value:r.trapNormal[1],onChange:a=>e({trapNormal:[r.trapNormal[0],a]}),min:-1,max:1,step:.01,variant:"full"}),i.jsx(x,{label:"offset",value:r.trapOffset,onChange:a=>e({trapOffset:a}),min:-2,max:2,step:.01,variant:"full"})]})}),r.colorMapping==="stripe"&&i.jsx(w,{hint:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration.",children:i.jsx(x,{label:"Stripe freq",value:r.stripeFreq,onChange:a=>e({stripeFreq:a}),min:1,max:16,step:.1,variant:"full"})}),i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("div",{className:"text-[10px] text-gray-400",children:"Interior color (bounded points)"}),i.jsx("input",{type:"color",title:"Interior color (points that never escape)","aria-label":"Interior color",value:pi(r.interiorColor),onChange:a=>e({interiorColor:fi(a.target.value)}),className:"w-full h-6 rounded border border-white/10 cursor-pointer bg-transparent"})]}),i.jsx(xe,{children:"Dye"}),i.jsx(U,{children:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."}),i.jsx("div",{className:"grid grid-cols-4 gap-1",children:Le.map(a=>i.jsx(Y,{active:r.dyeBlend===a.id,onClick:()=>e({dyeBlend:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(U,{children:(C=Le.find(a=>a.id===r.dyeBlend))==null?void 0:C.hint})]}),A==="Post-FX"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below."}),i.jsx("div",{className:"grid grid-cols-3 gap-1",children:ei.map(a=>i.jsx(Y,{active:r.fluidStyle===a.id,onClick:()=>y(a.id),title:a.hint,children:a.label},a.id))}),i.jsx(w,{hint:"Bloom strength — wide soft glow on bright pixels. Core of the electric look.",children:i.jsx(x,{label:"Bloom",value:r.bloomAmount,onChange:a=>e({bloomAmount:a}),min:0,max:3,step:.01,variant:"full"})}),r.bloomAmount>0&&i.jsx(w,{hint:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows.",children:i.jsx(x,{label:"Bloom threshold",value:r.bloomThreshold,onChange:a=>e({bloomThreshold:a}),min:0,max:3,step:.01,variant:"full"})}),i.jsx(w,{hint:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp.",children:i.jsx(x,{label:"Aberration",value:r.aberration,onChange:a=>e({aberration:a}),min:0,max:3,step:.01,variant:"full"})}),i.jsx(w,{hint:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass.",children:i.jsx(x,{label:"Refraction",value:r.refraction,onChange:a=>e({refraction:a}),min:0,max:.3,step:.001,variant:"full"})}),r.refraction>0&&i.jsx(w,{hint:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient.",children:i.jsx(x,{label:"Refract smooth",value:r.refractSmooth,onChange:a=>e({refractSmooth:a}),min:1,max:12,step:.1,variant:"full"})}),i.jsx(w,{hint:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends.",children:i.jsx(x,{label:"Caustics",value:r.caustics,onChange:a=>e({caustics:a}),min:0,max:25,step:.1,variant:"full"})}),i.jsx(xe,{children:"Tone mapping"}),i.jsxs(U,{children:["How final colour gets compressed. ",i.jsx("b",{children:"None"})," = maximally vivid (may clip).",i.jsx("b",{children:" AgX"})," = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."]}),i.jsx("div",{className:"grid grid-cols-4 gap-1",children:Qt.map(a=>i.jsx(Y,{active:r.toneMapping===a.id,onClick:()=>e({toneMapping:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(w,{hint:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch.",children:i.jsx(x,{label:"Exposure",value:r.exposure,onChange:a=>e({exposure:a}),min:.1,max:5,step:.01,variant:"full"})}),i.jsx(w,{hint:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones.",children:i.jsx(x,{label:"Vibrance",value:r.vibrance,onChange:a=>e({vibrance:a}),min:0,max:1,step:.01,variant:"full"})})]}),A==="Collision"&&i.jsxs(i.Fragment,{children:[i.jsxs("div",{className:"flex items-center justify-between",children:[i.jsx("div",{className:"text-[11px] text-gray-200 font-medium",children:"Collision walls"}),i.jsx(Y,{active:r.collisionEnabled,onClick:()=>e({collisionEnabled:!r.collisionEnabled}),children:r.collisionEnabled?"on":"off"})]}),i.jsxs(U,{children:["Paints solid walls the fluid bounces off, sculpted by the gradient below. Same mapping (iterations / angle / orbit trap / etc.) as the main gradient — edit stops to black = ",i.jsx("b",{children:"fluid"}),", white = ",i.jsx("b",{children:"wall"}),". Gradient shape is up to you."]}),r.collisionEnabled&&i.jsxs(i.Fragment,{children:[i.jsx(Be,{value:p,onChange:a=>{Array.isArray(a)?b({stops:a,colorSpace:p.colorSpace,blendSpace:p.blendSpace}):b(a)}}),i.jsxs("div",{className:"flex items-center justify-between",children:[i.jsx("span",{className:"text-[10px] text-gray-400",children:"Preview walls on canvas"}),i.jsx(Y,{active:r.collisionPreview,onClick:()=>e({collisionPreview:!r.collisionPreview}),children:r.collisionPreview?"on":"off"})]}),i.jsx(U,{children:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."})]})]}),A==="Composite"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"What you see. The simulation runs the same either way."}),i.jsx("div",{className:"grid grid-cols-4 gap-1",children:Xe.map(a=>i.jsx(Y,{active:r.show===a.id,onClick:()=>e({show:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(U,{children:($=Xe.find(a=>a.id===r.show))==null?void 0:$.hint}),r.show==="composite"&&i.jsxs(i.Fragment,{children:[i.jsx(w,{hint:"How much fractal color shows through in Mixed view.",children:i.jsx(x,{label:"Julia mix",value:r.juliaMix,onChange:a=>e({juliaMix:a}),min:0,max:2,step:.01,variant:"full"})}),i.jsx(w,{hint:"How much fluid dye shows through in Mixed view.",children:i.jsx(x,{label:"Dye mix",value:r.dyeMix,onChange:a=>e({dyeMix:a}),min:0,max:2,step:.01,variant:"full"})}),i.jsx(w,{hint:"Overlay velocity-hue on top of the composite. Diagnostic.",children:i.jsx(x,{label:"Velocity viz",value:r.velocityViz,onChange:a=>e({velocityViz:a}),min:0,max:2,step:.01,variant:"full"})})]})]}),A==="Presets"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"Each preset is a curated fractal→fluid coupling. Applying one resets the grid and restores known params."}),i.jsx("div",{className:"grid grid-cols-2 gap-1",children:De.map(a=>i.jsx(Y,{active:!1,onClick:()=>T(a.id),title:a.desc,children:a.name},a.id))}),i.jsx(U,{children:"Save / Screenshot / Load moved to the top bar icons above."}),i.jsx("div",{className:"grid grid-cols-1 gap-1",children:i.jsx(Y,{active:!1,onClick:B,title:"Export the full state as a .json file.",children:"Save JSON"})}),i.jsx("input",{ref:G,type:"file",accept:".png,.json,image/png,application/json,text/plain",onChange:v,className:"hidden","aria-label":"Load saved state"})]})]}),i.jsxs("div",{className:"flex gap-2 p-3 border-t border-white/5",children:[i.jsx("button",{type:"button",onClick:()=>e({paused:!r.paused}),className:"flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10",children:r.paused?"Resume":"Pause"}),i.jsx("button",{type:"button",onClick:o,className:"flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10",children:"Clear fluid"})]})]})})},gi=({x:r,y:e,items:o,onDismiss:t})=>{const n=h.useRef(null);h.useEffect(()=>{const c=b=>{n.current&&(n.current.contains(b.target)||t())},d=b=>{b.key==="Escape"&&t()},p=setTimeout(()=>{window.addEventListener("mousedown",c),window.addEventListener("keydown",d)},0);return()=>{clearTimeout(p),window.removeEventListener("mousedown",c),window.removeEventListener("keydown",d)}},[t]);const l={left:Math.min(r,window.innerWidth-240),top:Math.min(e,window.innerHeight-o.length*28-12)};return i.jsx("div",{ref:n,className:"fixed z-50 min-w-[200px] rounded border border-white/15 bg-[#1a1a1d]/95 backdrop-blur-sm shadow-xl text-[11px] text-gray-200 py-1",style:l,onContextMenu:c=>{c.preventDefault(),t()},children:o.map((c,d)=>i.jsxs(de.Fragment,{children:[c.separatorAbove&&i.jsx("div",{className:"my-1 border-t border-white/10"}),i.jsx("button",{type:"button",onClick:()=>{c.onClick(),t()},title:c.hint,className:"w-full text-left px-3 py-1.5 transition-colors "+(c.danger?"hover:bg-red-500/20 text-red-300":"hover:bg-cyan-500/15 hover:text-cyan-200"),children:c.label})]},d))})},xi=1,Fe="GmtFluidState";function Me(r,e,o,t,n){return{version:xi,savedAt:new Date().toISOString(),name:n,params:r,gradient:e,collisionGradient:t,orbit:o}}function Ye(r){if(!r||typeof r!="object")throw new Error("Saved state is not an object");const e=r;if(typeof e.version!="number")throw new Error('Missing or invalid "version"');if(!e.params||typeof e.params!="object")throw new Error('Missing "params"');if(!e.gradient||typeof e.gradient!="object")throw new Error('Missing "gradient"');if(!e.orbit||typeof e.orbit!="object")throw new Error('Missing "orbit"');return{version:e.version,savedAt:typeof e.savedAt=="string"?e.savedAt:new Date().toISOString(),name:typeof e.name=="string"?e.name:void 0,params:e.params,gradient:e.gradient,collisionGradient:e.collisionGradient&&typeof e.collisionGradient=="object"?e.collisionGradient:void 0,orbit:e.orbit}}function Re(r,e){const o=URL.createObjectURL(r),t=document.createElement("a");t.href=o,t.download=e,document.body.appendChild(t),t.click(),t.remove(),setTimeout(()=>URL.revokeObjectURL(o),1e3)}function vi(r,e="toy-fluid-state.json"){const o=JSON.stringify(r,null,2);Re(new Blob([o],{type:"application/json"}),e)}async function bi(r,e,o="toy-fluid.png"){const t=await new Promise(d=>r.toBlob(d,"image/png"));if(!t)throw new Error("canvas.toBlob returned null");const n=new Uint8Array(await t.arrayBuffer()),l=Ci(n,Fe,JSON.stringify(e)),c=new Uint8Array(l.byteLength);c.set(l),Re(new Blob([c.buffer],{type:"image/png"}),o)}async function yi(r,e="toy-fluid-screenshot.png"){const o=await new Promise(t=>r.toBlob(t,"image/png"));if(!o)throw new Error("canvas.toBlob returned null");Re(o,e)}async function wi(r){const e=r.name.toLowerCase(),o=new Uint8Array(await r.arrayBuffer());if(e.endsWith(".png")||o.length>=8&&o[0]===137&&o[1]===80&&o[2]===78&&o[3]===71&&o[4]===13&&o[5]===10&&o[6]===26&&o[7]===10){const l=Ti(o,Fe);if(!l)throw new Error(`PNG has no "${Fe}" metadata.`);return Ye(JSON.parse(l))}const n=new TextDecoder("utf-8").decode(o);return Ye(JSON.parse(n))}function Ci(r,e,o){r.subarray(0,8);const t=33,n=r.subarray(0,t),l=r.subarray(t),c=ji(e,o),d=new Uint8Array(n.length+c.length+l.length);return d.set(n,0),d.set(c,n.length),d.set(l,n.length+c.length),d}function Ti(r,e){let o=8;const t=new DataView(r.buffer,r.byteOffset,r.byteLength);for(;o+12<=r.length;){const n=t.getUint32(o,!1),l=String.fromCharCode(r[o+4],r[o+5],r[o+6],r[o+7]),c=o+8,d=c+n;if(l==="tEXt"){const p=r.subarray(c,d),b=p.indexOf(0);if(b>0&&new TextDecoder("latin1").decode(p.subarray(0,b))===e)return new TextDecoder("utf-8").decode(p.subarray(b+1))}if(l==="IEND")break;o=d+4}return null}function ji(r,e){const o=new TextEncoder,t=o.encode(r),n=o.encode(e);if(t.length===0||t.length>79)throw new Error("keyword length out of range");const l=t.length+1+n.length,c=new Uint8Array(12+l),d=new DataView(c.buffer);d.setUint32(0,l,!1),c[4]=116,c[5]=69,c[6]=88,c[7]=116,c.set(t,8),c[8+t.length]=0,c.set(n,8+t.length+1);const p=Di(c,4,8+l);return d.setUint32(8+l,p,!1),c}const Mi=(()=>{const r=new Uint32Array(256);for(let e=0;e<256;e++){let o=e;for(let t=0;t<8;t++)o=o&1?3988292384^o>>>1:o>>>1;r[e]=o>>>0}return r})();function Di(r,e,o){let t=4294967295;for(let n=e;n<o;n++)t=Mi[(t^r[n])&255]^t>>>8;return(t^4294967295)>>>0}const Fi="p-2 rounded-lg transition-all active:scale-95 border flex items-center justify-center",Ri="bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10",Te=({title:r,onClick:e,children:o})=>i.jsx("button",{type:"button",onClick:e,title:r,className:`${Fi} ${Ri}`,children:o}),Ei=({kind:r,forceMode:e,juliaC:o,zoom:t,simResolution:n,effectiveSimRes:l,fps:c,orbitOn:d,paused:p,onSavePng:b,onScreenshot:V,onLoadFile:B,onSubmit:J})=>{const N=de.useRef(null),H=()=>{var k;return(k=N.current)==null?void 0:k.click()},G=k=>{var v;const T=(v=k.target.files)==null?void 0:v[0];T&&B(T),k.target.value=""},A=l===n?`${n}px`:`${l}px / ${n}`;return i.jsxs("div",{className:"h-10 shrink-0 border-b border-white/5 bg-[#0b0b0d] flex items-center px-2 gap-2 text-[11px] font-mono text-gray-300","data-testid":"top-bar",children:[i.jsxs("div",{className:"flex items-center gap-2",children:[i.jsx("span",{className:"text-sm font-semibold text-gray-100 font-sans",children:"Julia Fluid"}),i.jsx("a",{href:"./index.html",className:"text-[10px] text-cyan-300 hover:underline font-sans",children:"← GMT"})]}),i.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),i.jsxs("div",{className:"flex items-center gap-3 min-w-0","data-testid":"status-bar",children:[i.jsx("span",{children:r==="julia"?"Julia":"Mandelbrot"}),i.jsx("span",{className:"text-cyan-300",children:e}),i.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-c",children:["c=(",o[0].toFixed(3),", ",o[1].toFixed(3),")"]}),i.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-zoom",children:["z=",t.toFixed(3)]}),i.jsx("span",{className:`whitespace-nowrap ${l<n?"text-amber-300":"text-gray-500"}`,children:A}),i.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-fps",children:[c," fps"]}),d&&i.jsx("span",{className:"text-amber-300",children:"orbit on"}),p&&i.jsx("span",{className:"text-red-400",children:"paused"})]}),i.jsxs("div",{className:"ml-auto flex items-center gap-1",children:[i.jsx(Te,{title:"Save scene as PNG (state embedded in metadata)",onClick:b,children:i.jsx(ht,{})}),i.jsx(Te,{title:"Screenshot canvas as plain PNG",onClick:V,children:i.jsx(pt,{})}),i.jsx(Te,{title:"Load a saved .png or .json",onClick:H,children:i.jsx(ft,{})}),i.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),i.jsx(Te,{title:"Submit this preset to the curator",onClick:J,children:i.jsx(mt,{})}),i.jsx("input",{ref:N,type:"file",accept:".png,.json,image/png,application/json,text/plain",onChange:G,className:"hidden","aria-label":"Load saved state"})]})]})};let qe=0;function Ke(){const r=(performance.now()-qe)/1e3;return Math.max(0,qt-r)}async function Si(r){const e=await new Promise(o=>r.toBlob(o,"image/png"));if(!e)throw new Error("canvas.toBlob returned null");return e}async function Ai(r,e,o){const t=Ke();if(t>0)return{ok:!1,code:"cooldown",message:`Please wait ${Math.ceil(t)}s before submitting again.`};const n=(o.name??"").trim();if(n.length<1||n.length>60)return{ok:!1,code:"invalid",message:"Name is required (1–60 characters)."};if(o.author&&o.author.length>60)return{ok:!1,code:"invalid",message:"Author is too long (max 60 characters)."};if(o.notes&&o.notes.length>500)return{ok:!1,code:"invalid",message:"Notes are too long (max 500 characters)."};let l;try{l=await Si(r)}catch(b){return{ok:!1,code:"invalid",message:`Couldn't capture canvas: ${b.message}`}}if(l.size>_e)return{ok:!1,code:"too-large",message:`Image is too large (${(l.size/1024/1024).toFixed(1)} MB; max ${(_e/1024/1024).toFixed(0)} MB).`};const c=new FormData;c.set("state",JSON.stringify(e)),c.set("image",l,"preset.png"),c.set("name",n),o.author&&c.set("author",o.author),o.notes&&c.set("notes",o.notes);let d;try{d=await fetch($t,{method:"POST",body:c})}catch(b){return{ok:!1,code:"network",message:`Network error: ${b.message}`}}let p={};try{p=await d.json()}catch{}return d.ok?(qe=performance.now(),{ok:!0,id:p.id??"unknown"}):{ok:!1,code:d.status===429?"cooldown":d.status>=500?"server":"invalid",message:p.error??`Submission failed (${d.status} ${d.statusText}).`}}const ki=({open:r,canvas:e,state:o,onClose:t})=>{const[n,l]=h.useState(""),[c,d]=h.useState(""),[p,b]=h.useState(""),[V,B]=h.useState(!1),[J,N]=h.useState({kind:"idle"}),[H,G]=h.useState(null),A=h.useRef(null);if(h.useEffect(()=>{if(!r||!e){G(null);return}let y=null;return e.toBlob(j=>{j&&(y=URL.createObjectURL(j),G(y))},"image/png"),()=>{y&&URL.revokeObjectURL(y)}},[r,e]),h.useEffect(()=>{r||(N({kind:"idle"}),B(!1))},[r]),h.useEffect(()=>{if(!r)return;const y=j=>{j.key==="Escape"&&t()};return window.addEventListener("keydown",y),()=>window.removeEventListener("keydown",y)},[r,t]),!r)return null;const k=Ke(),T=V&&n.trim().length>0&&J.kind!=="sending"&&k===0,v=async()=>{if(!e||!o)return;N({kind:"sending"});const y={name:n.trim(),author:c.trim()||void 0,notes:p.trim()||void 0},j=await Ai(e,o,y);j.ok?N({kind:"ok",id:j.id}):N({kind:"error",message:j.message})};return i.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4",onMouseDown:y=>{y.target===y.currentTarget&&t()},children:i.jsxs("div",{ref:A,className:"w-[480px] max-w-full rounded-lg border border-white/10 bg-[#0b0b0d] shadow-2xl text-gray-200 text-xs overflow-hidden",children:[i.jsxs("div",{className:"px-4 py-3 border-b border-white/5 flex items-center justify-between",children:[i.jsxs("div",{children:[i.jsx("div",{className:"text-sm font-semibold",children:"Submit preset"}),i.jsx("div",{className:"text-[10px] text-gray-500",children:"Share the current scene with the curator"})]}),i.jsx("button",{type:"button",onClick:t,className:"text-gray-500 hover:text-gray-200 text-sm px-1 leading-none",title:"Close (Esc)",children:"×"})]}),!1,i.jsxs("div",{className:"p-4 flex gap-3",children:[i.jsxs("div",{className:"w-[180px] shrink-0",children:[i.jsx("div",{className:"aspect-square rounded border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center",children:H?i.jsx("img",{src:H,alt:"preset preview",className:"w-full h-full object-cover"}):i.jsx("span",{className:"text-[10px] text-gray-500",children:"rendering preview…"})}),i.jsx("div",{className:"text-[9px] text-gray-500 mt-1 leading-snug",children:"The preview above, plus the scene's JSON state, are what gets submitted."})]}),i.jsxs("div",{className:"flex-1 flex flex-col gap-2",children:[i.jsxs("label",{className:"flex flex-col gap-0.5",children:[i.jsxs("span",{className:"text-[10px] text-gray-400",children:["Name ",i.jsx("span",{className:"text-red-400",children:"*"})]}),i.jsx("input",{value:n,onChange:y=>l(y.target.value.slice(0,60)),disabled:!1,placeholder:"e.g. Ember Tide",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"})]}),i.jsxs("label",{className:"flex flex-col gap-0.5",children:[i.jsx("span",{className:"text-[10px] text-gray-400",children:"Author (optional)"}),i.jsx("input",{value:c,onChange:y=>d(y.target.value.slice(0,60)),disabled:!1,placeholder:"alias or handle",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"})]}),i.jsxs("label",{className:"flex flex-col gap-0.5",children:[i.jsx("span",{className:"text-[10px] text-gray-400",children:"Notes (optional)"}),i.jsx("textarea",{value:p,onChange:y=>b(y.target.value.slice(0,500)),disabled:!1,rows:3,placeholder:"What's interesting about this preset? (≤ 500 chars)",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] resize-none focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"}),i.jsxs("span",{className:"text-[9px] text-gray-500 text-right",children:[p.length," / 500"]})]}),i.jsxs("label",{className:"flex items-start gap-2 mt-1 cursor-pointer select-none",children:[i.jsx("input",{type:"checkbox",checked:V,onChange:y=>B(y.target.checked),disabled:!1,className:"mt-0.5 accent-cyan-500"}),i.jsx("span",{className:"text-[10px] text-gray-400 leading-snug",children:"I understand this preset (image + parameters + my alias if provided) may be reviewed, edited, and republished as part of the built-in preset library."})]})]})]}),J.kind==="ok"&&i.jsxs("div",{className:"mx-4 mb-3 px-3 py-2 text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 rounded",children:["Thanks! Your preset is in the queue. ",i.jsxs("span",{className:"text-[10px] text-emerald-400/70",children:["(id: ",J.id,")"]})]}),J.kind==="error"&&i.jsx("div",{className:"mx-4 mb-3 px-3 py-2 text-[11px] text-red-300 bg-red-500/10 border border-red-400/20 rounded",children:J.message}),i.jsxs("div",{className:"px-4 py-3 border-t border-white/5 flex items-center justify-end gap-2",children:[i.jsx("button",{type:"button",onClick:t,className:"px-3 py-1.5 text-[11px] rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10",children:"Cancel"}),i.jsx("button",{type:"button",onClick:v,disabled:!T,className:"px-3 py-1.5 text-[11px] rounded border transition-colors "+(T?"bg-cyan-500/20 border-cyan-400/60 text-cyan-100 hover:bg-cyan-500/30":"bg-white/[0.04] border-white/10 text-gray-500 cursor-not-allowed"),children:J.kind==="sending"?"Sending…":k>0?`Wait ${Math.ceil(k)}s`:"Submit"})]})]})})},Bi=()=>{const r=h.useRef(null),e=h.useRef(null),o=h.useRef(null),[t,n]=h.useState(ve),[l,c]=h.useState(Oe),[d,p]=h.useState(di),[b,V]=h.useState(Je),[B,J]=h.useState(null),[N,H]=h.useState(0),[G,A]=h.useState(!0),[k,T]=h.useState(!1),[v,y]=h.useState(null),[j,D]=h.useState(!1),S=h.useMemo(()=>ke(d),[d]),X=h.useMemo(()=>ke(b),[b]);h.useEffect(()=>{var s;(s=e.current)==null||s.setGradientBuffer(S)},[S]),h.useEffect(()=>{var s;(s=e.current)==null||s.setCollisionGradientBuffer(X)},[X]);const C=h.useRef(t);C.current=t;const $=h.useRef(l);$.current=l;const a=h.useRef({c:!1,shift:!1,alt:!1}),I=h.useRef(ve.simResolution),[P,ee]=h.useState(ve.simResolution),re=h.useRef(t.juliaC);h.useEffect(()=>{re.current=t.juliaC},[t.juliaC]);const q=h.useRef({down:!1,mode:"splat",startX:0,startY:0,startCx:0,startCy:0,startCenterX:0,startCenterY:0,startZoom:1.5,zoomAnchor:[0,0],zoomAnchorUv:[.5,.5],lastX:0,lastY:0,lastT:0,rightDragged:!1});h.useEffect(()=>{const s=r.current;if(!s)return;try{const M=new ri(s);e.current=M,M.setParams(C.current),M.setGradientBuffer(S),M.setCollisionGradientBuffer(X);const Q=s.getBoundingClientRect();M.resize(Q.width,Q.height)}catch(M){J(M.message||String(M));return}let m=0,u=performance.now(),g=0,F=performance.now(),O=60,R=C.current.simResolution;I.current=R;let K=C.current.simResolution,E=0,te=0,oe=performance.now(),ae=R;const le=M=>{const Q=e.current;if(!Q)return;const ge=Math.min(.25,(M-F)/1e3),ie=C.current.simResolution,L=C.current.autoQuality;ie!==K&&(R=ie,K=ie,E=0,te=0,oe=M),L?M-oe>Wt&&(O<Vt&&R>Ne?(E+=ge,te=0,E>Ht&&(R=Math.max(Ne,R-zt),E=0,oe=M)):O>Jt&&R<ie?(te+=ge,E=0,te>Xt&&(R=ie,te=0,oe=M)):(E*=.9,te*=.9)):R=ie,R>ie&&(R=ie),I.current=R;const z=$.current;if(z.enabled&&z.radius>0&&z.speed>0){g+=ge*z.speed;const[Z,ce]=re.current,ne=Z+Math.cos(g*6.2831853)*z.radius,ue=ce+Math.sin(g*6.2831853)*z.radius;Q.setParams({...C.current,juliaC:[ne,ue],simResolution:R})}else Q.setParams({...C.current,simResolution:R});if(F=M,Q.frame(M),m++,M-u>500){const Z=Math.round(m*1e3/(M-u));H(Z),O=O*.5+Z*.5,m=0,u=M}R!==ae&&(ee(R),ae=R),o.current=requestAnimationFrame(le)};o.current=requestAnimationFrame(le);const ye=new ResizeObserver(()=>{const M=e.current;if(!M||!s)return;const Q=s.getBoundingClientRect();M.resize(Q.width,Q.height)});return ye.observe(s),()=>{var M;o.current&&cancelAnimationFrame(o.current),ye.disconnect(),(M=e.current)==null||M.dispose(),e.current=null}},[]),h.useEffect(()=>{const s=g=>{var O,R,K;const F=(R=(O=g.target)==null?void 0:O.tagName)==null?void 0:R.toLowerCase();F==="input"||F==="textarea"||((g.key==="c"||g.key==="C")&&(a.current.c=!0),a.current.shift=g.shiftKey,a.current.alt=g.altKey,g.code==="Space"?(g.preventDefault(),n(E=>({...E,paused:!E.paused}))):g.key==="r"||g.key==="R"?(K=e.current)==null||K.resetFluid():g.key==="h"||g.key==="H"?T(E=>!E):g.key==="o"||g.key==="O"?c(E=>({...E,enabled:!E.enabled})):g.key==="Home"&&n(E=>({...E,center:[0,0],zoom:1.5})))},m=g=>{(g.key==="c"||g.key==="C")&&(a.current.c=!1),a.current.shift=g.shiftKey,a.current.alt=g.altKey},u=()=>{a.current.c=!1,a.current.shift=!1,a.current.alt=!1};return window.addEventListener("keydown",s),window.addEventListener("keyup",m),window.addEventListener("blur",u),()=>{window.removeEventListener("keydown",s),window.removeEventListener("keyup",m),window.removeEventListener("blur",u)}},[]);const fe=h.useCallback(s=>{n(m=>({...m,...s}))},[]),Ze=h.useCallback(s=>{c(m=>({...m,...s}))},[]),et=h.useCallback(()=>{var s;(s=e.current)==null||s.resetFluid()},[]),tt=h.useCallback(s=>{if(s.preventDefault(),q.current.rightDragged){q.current.rightDragged=!1;return}const m=Pi({copyCurrentC:rt,onReset:()=>{var u;return(u=e.current)==null?void 0:u.resetFluid()},onRecenter:()=>n(u=>({...u,center:[0,0],zoom:1.5})),onToggleOrbit:()=>c(u=>({...u,enabled:!u.enabled})),orbitOn:$.current.enabled,onTogglePaused:()=>n(u=>({...u,paused:!u.paused})),paused:C.current.paused,onApplyPreset:u=>be(u)});y({x:s.clientX,y:s.clientY,items:m})},[]),it=h.useMemo(()=>({handleInteractionStart:()=>{},handleInteractionEnd:()=>{},openContextMenu:(s,m,u)=>{const g=u.filter(F=>!F.isHeader).map(F=>({label:F.label??"",onClick:()=>{var O;(O=F.action)==null||O.call(F)},danger:!!F.danger})).filter(F=>F.label);g.length!==0&&y({x:s,y:m,items:g})}}),[]),rt=h.useCallback(async()=>{const[s,m]=C.current.juliaC,u=`${s.toFixed(6)}, ${m.toFixed(6)}`;try{await navigator.clipboard.writeText(u)}catch{}},[]),be=h.useCallback(s=>{var m;n({...ve,...s.params}),s.gradient&&p(s.gradient),V(s.collisionGradient??Je),c(s.orbit??Oe),(m=e.current)==null||m.resetFluid()},[]),ot=h.useCallback(()=>{const s=Me(C.current,d,$.current,b),m=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");vi(s,`toy-fluid-${m}.json`)},[d,b]),Ee=h.useCallback(async()=>{const s=r.current;if(!s)return;const m=Me(C.current,d,$.current,b),u=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");try{await bi(s,m,`toy-fluid-${u}.png`)}catch(g){console.error("[toy-fluid] Save PNG failed:",g)}},[d,b]),at=h.useCallback(async()=>{const s=r.current;if(!s)return;const m=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");try{await yi(s,`toy-fluid-${m}.png`)}catch(u){console.error("[toy-fluid] Screenshot failed:",u)}},[]),Se=h.useCallback(async s=>{try{const m=await wi(s);be({id:"loaded",name:m.name??s.name,desc:`Loaded from ${s.name}`,params:m.params,gradient:m.gradient,collisionGradient:m.collisionGradient,orbit:m.orbit})}catch(m){console.error("[toy-fluid] Load failed:",m),alert(`Couldn't load "${s.name}":
${m.message}`)}},[be]),me=(s,m)=>s&&m?1:s?_t:m?Gt:1,nt=s=>{if(!e.current)return;s.target.setPointerCapture(s.pointerId);const u=q.current;if(u.down=!0,u.startX=s.clientX,u.startY=s.clientY,u.lastX=s.clientX,u.lastY=s.clientY,u.lastT=performance.now(),u.rightDragged=!1,s.button===2)u.mode="pan-pending",u.startCenterX=C.current.center[0],u.startCenterY=C.current.center[1];else if(s.button===1){s.preventDefault(),u.mode="zoom",u.startZoom=C.current.zoom;const g=r.current.getBoundingClientRect(),F=(s.clientX-g.left)/g.width,O=1-(s.clientY-g.top)/g.height,R=g.width/g.height,K=C.current.center[0]+(F*2-1)*R*C.current.zoom,E=C.current.center[1]+(O*2-1)*C.current.zoom;u.zoomAnchor=[K,E],u.zoomAnchorUv=[F,O]}else a.current.c?(u.mode="pick-c",u.startCx=C.current.juliaC[0],u.startCy=C.current.juliaC[1]):u.mode="splat"},st=s=>{const m=e.current;if(!m)return;const u=q.current;if(!u.down)return;a.current.shift=s.shiftKey,a.current.alt=s.altKey;const g=performance.now();if(u.mode==="pick-c"){const L=r.current.getBoundingClientRect(),z=me(a.current.shift,a.current.alt),Z=C.current.zoom,ce=L.width/L.height,ne=s.clientX-u.startX,ue=s.clientY-u.startY,he=ne/L.width*2*ce*Z*z,pe=-(ue/L.height)*2*Z*z;fe({juliaC:[u.startCx+he,u.startCy+pe]}),re.current=[u.startCx+he,u.startCy+pe],u.lastX=s.clientX,u.lastY=s.clientY,u.lastT=g;return}if(u.mode==="pan-pending"){const L=s.clientX-u.startX,z=s.clientY-u.startY;if(L*L+z*z>Ie*Ie)u.mode="pan",u.rightDragged=!0;else return}if(u.mode==="zoom"){const L=r.current.getBoundingClientRect(),z=me(a.current.shift,a.current.alt),Z=s.clientY-u.startY,ce=Math.exp(Z*Ot*z),ne=Math.max(Pe,Math.min(Ue,u.startZoom*ce)),ue=L.width/L.height,[he,pe]=u.zoomAnchorUv,ct=[u.zoomAnchor[0]-(he*2-1)*ue*ne,u.zoomAnchor[1]-(pe*2-1)*ne];fe({zoom:ne,center:ct});return}if(u.mode==="pan"){const L=r.current.getBoundingClientRect(),z=me(a.current.shift,a.current.alt),Z=C.current.zoom,ce=L.width/L.height,ne=s.clientX-u.startX,ue=s.clientY-u.startY,he=-(ne/L.width)*2*ce*Z*z,pe=ue/L.height*2*Z*z;fe({center:[u.startCenterX+he,u.startCenterY+pe]}),u.lastX=s.clientX,u.lastY=s.clientY,u.lastT=g;return}const F=Math.max(1,g-u.lastT)/1e3,O=s.clientX-u.lastX,R=s.clientY-u.lastY;u.lastX=s.clientX,u.lastY=s.clientY,u.lastT=g;const K=r.current.getBoundingClientRect(),[E,te]=m.canvasToUv(s.clientX,s.clientY),oe=me(a.current.shift,a.current.alt),ae=O/K.width/F*5*oe,le=-(R/K.height)/F*5*oe,ye=Math.min(50,Math.hypot(ae,le)),M=g*.001%1,Q=.5+.5*Math.cos(6.28*M),ge=.5+.5*Math.cos(6.28*(M+.33)),ie=.5+.5*Math.cos(6.28*(M+.67));m.splatForce(E,te,ae,le,ye,[Q,ge,ie])},Ae=s=>{q.current.down=!1;try{s.target.releasePointerCapture(s.pointerId)}catch{}},lt=s=>{if(!e.current)return;s.preventDefault();const u=me(s.shiftKey,s.altKey),g=Math.pow(.9,-s.deltaY*Nt*u),F=r.current.getBoundingClientRect(),O=(s.clientX-F.left)/F.width,R=1-(s.clientY-F.top)/F.height,K=F.width/F.height,E=C.current,te=E.center[0]+(O*2-1)*K*E.zoom,oe=E.center[1]+(R*2-1)*E.zoom,ae=Math.max(Pe,Math.min(Ue,E.zoom*g)),le=[te-(O*2-1)*K*ae,oe-(R*2-1)*ae];fe({zoom:ae,center:le})};return B?i.jsx("div",{className:"w-full h-full flex items-center justify-center bg-black text-gray-200 p-6",children:i.jsxs("div",{className:"max-w-md",children:[i.jsx("div",{className:"text-lg font-semibold mb-2",children:"This toy needs WebGL2 with float render targets."}),i.jsx("div",{className:"text-xs text-gray-400 whitespace-pre-wrap",children:B})]})}):i.jsx(xt,{value:it,children:i.jsxs("div",{className:"w-full h-screen flex flex-col bg-black text-white",children:[i.jsx(Ei,{kind:t.kind,forceMode:t.forceMode,juliaC:t.juliaC,zoom:t.zoom,simResolution:t.simResolution,effectiveSimRes:P,fps:N,orbitOn:l.enabled,paused:t.paused,onSavePng:Ee,onScreenshot:at,onLoadFile:Se,onSubmit:()=>D(!0)}),i.jsxs("div",{className:"flex-1 flex min-h-0",children:[i.jsxs("div",{className:"flex-1 relative",children:[i.jsx("canvas",{ref:r,className:"w-full h-full block",style:{touchAction:"none",cursor:q.current.mode==="pick-c"?"crosshair":q.current.mode==="pan"?"grabbing":q.current.mode==="zoom"?"ns-resize":"default"},onPointerDown:nt,onPointerMove:st,onPointerUp:Ae,onPointerCancel:Ae,onWheel:lt,onContextMenu:tt}),G&&!k?i.jsxs("div",{className:"absolute bottom-2 left-2 px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[320px]",children:[i.jsxs("div",{className:"flex items-center justify-between mb-1",children:[i.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),i.jsx("button",{onClick:()=>A(!1),className:"text-gray-500 hover:text-gray-200 text-[10px] px-1 leading-none",title:"Hide (press ? to reopen)",children:"×"})]}),i.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[i.jsxs("li",{children:[i.jsx(W,{children:"Drag"})," inject force + dye into the fluid"]}),i.jsxs("li",{children:[i.jsx(W,{children:"C"}),"+",i.jsx(W,{children:"Drag"})," pick Julia c directly on the canvas"]}),i.jsxs("li",{children:[i.jsx(W,{children:"Right-click"}),"+",i.jsx(W,{children:"Drag"})," pan the fractal view"]}),i.jsxs("li",{children:[i.jsx(W,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),i.jsxs("li",{children:[i.jsx(W,{children:"Shift"}),"/",i.jsx(W,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),i.jsxs("li",{children:[i.jsx(W,{children:"Wheel"})," zoom · ",i.jsx(W,{children:"Middle"}),"+",i.jsx(W,{children:"Drag"})," smooth zoom · ",i.jsx(W,{children:"Home"})," recenter"]}),i.jsxs("li",{children:[i.jsx(W,{children:"Space"})," pause sim · ",i.jsx(W,{children:"R"})," clear fluid · ",i.jsx(W,{children:"O"})," toggle c-orbit · ",i.jsx(W,{children:"H"})," hide hints"]})]})]}):!k&&i.jsx("button",{onClick:()=>A(!0),className:"absolute bottom-2 left-2 px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70",title:"Show hotkeys",children:"? hotkeys"})]}),i.jsx("div",{className:"w-[320px] h-full border-l border-white/5 bg-[#0b0b0d] flex flex-col min-h-0",children:i.jsx(mi,{params:t,setParams:fe,onReset:et,orbit:l,setOrbit:Ze,gradient:d,setGradient:p,gradientLut:S,collisionGradient:b,setCollisionGradient:V,onPresetApply:be,onSaveJson:ot,onSavePng:Ee,onLoadFile:Se,hideHints:k})}),v&&i.jsx(gi,{x:v.x,y:v.y,items:v.items,onDismiss:()=>y(null)}),i.jsx(ki,{open:j,canvas:r.current,state:j?Me(C.current,d,$.current,b):null,onClose:()=>D(!1)})]})]})})};function Pi(r){return[{label:"Copy c to clipboard",hint:"Re, Im as decimal",onClick:r.copyCurrentC},{label:"Recenter view",hint:"center=(0,0), zoom=1.5",onClick:r.onRecenter},{label:r.paused?"Resume sim":"Pause sim",onClick:r.onTogglePaused},{label:r.orbitOn?"Stop c-orbit":"Start c-orbit",onClick:r.onToggleOrbit},{label:"Clear fluid",hint:"zero velocity + dye",onClick:r.onReset,danger:!0,separatorAbove:!0},...De.map((e,o)=>({label:`Preset: ${e.name}`,hint:e.desc,onClick:()=>r.onApplyPreset(e),separatorAbove:o===0}))]}const W=({children:r})=>i.jsx("kbd",{className:"px-1 py-[1px] rounded bg-white/[0.08] border border-white/15 text-[9px] font-mono text-gray-100",children:r}),Qe=document.getElementById("root");if(!Qe)throw new Error("Could not find root element to mount to");const Ui=gt.createRoot(Qe);Ui.render(i.jsx(de.StrictMode,{children:i.jsx(Bi,{})}));
