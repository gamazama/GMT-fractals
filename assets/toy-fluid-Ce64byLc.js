var nt=Object.defineProperty;var lt=(r,e,o)=>e in r?nt(r,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):r[e]=o;var f=(r,e,o)=>lt(r,typeof e!="symbol"?e+"":e,o);import{aC as x,W as ct,E as ut,X as dt,a1 as ht,aP as ke}from"./GenericDropdown-DTxFjByw.js";import{r as p,j as i,R as de}from"./three-fiber-C5DkfiAm.js";import{c as pt}from"./three-drei-hqOrdlmR.js";import Be from"./AdvancedGradientEditor-fpOC7CGu.js";import{b as ft}from"./EmbeddedColorPicker-Tn8XCUiU.js";import"./three-DZB2NGqN.js";import"./pako-DwGzBETv.js";const mt=`
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
}`,gt=`#version 300 es
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
}`,xt=`#version 300 es
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
}`,vt=`#version 300 es
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
}`,bt=`#version 300 es
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
${mt}

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
}`,yt=`#version 300 es
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
}`,wt=`#version 300 es
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
}`,Ct=`#version 300 es
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
}`,Tt=`#version 300 es
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
}`,jt=`#version 300 es
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
}`,Mt=`#version 300 es
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
}`,Dt=`#version 300 es
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
}`,Rt=`#version 300 es
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
}`,Ft=`#version 300 es
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
}`,Et=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,St=`#version 300 es
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
}`,At=`#version 300 es
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
}`,kt=`#version 300 es
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
}`,Bt=`#version 300 es
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
}`,Pe=1e-5,Ie=8,Ue=5,Pt=.002,It=.005,Ut=5,Nt=.2,Ot=.002,Ne=192,_t=128,Gt=35,Lt=58,zt=1.5,Vt=8,Jt=1500,ye=256,Ht=.5,Oe={enabled:!1,radius:.02,speed:.4},Xt=30,_e=[{id:"linear",label:"Linear",hint:"Classic RGB multiply. Fades to black but mixing goes through muddy greys."},{id:"perceptual",label:"Perceptual",hint:"OKLab: decay only the L-channel. Hue + chroma preserved — dye fades hue-stable to black."},{id:"vivid",label:"Vivid",hint:"OKLab with chroma boost as lightness drops. Dye stays punchy all the way to near-black."}];function Wt(r){switch(r){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}const Yt=[{id:"none",label:"None",hint:"No compression. Vivid colours, will clip if exposure is too high."},{id:"reinhard",label:"Reinhard",hint:"Classic c/(1+c). Smooth but desaturates highlights."},{id:"agx",label:"AgX",hint:"Sobotka 2023. Hue-stable, vibrant highlights — best for rich colours."},{id:"filmic",label:"Filmic",hint:"Hable/Uncharted filmic. Cinematic contrast with gentle roll-off."}];function qt(r){switch(r){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}const $t=[{id:"plain",label:"Plain",hint:"No post-processing — pure fluid+fractal composite."},{id:"electric",label:"Electric",hint:"Bloom + velocity-keyed chromatic aberration — plasma and lightning energy."},{id:"liquid",label:"Liquid",hint:"Dye-gradient refraction + laplacian caustics — water over glass."}],Ge=[{id:"add",label:"Add",hint:"Linear accumulate — bright strokes build up, classic fluid look."},{id:"screen",label:"Screen",hint:"1−(1−d)(1−i) — overlapping dye glows brighter, never clips to full white."},{id:"max",label:"Max",hint:"Per-channel max — keeps the brightest layer, leaves darker alone."},{id:"over",label:"Over",hint:"Alpha compositing — uses the gradient's α to fade / mask dye onto existing."}];function Kt(r){switch(r){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3}}const Le=[{id:"iterations",label:"Iterations",hint:"Smooth iteration count. Classic escape-time coloring."},{id:"angle",label:"Angle",hint:"arg(z_final). Gradient wraps around the set."},{id:"magnitude",label:"Magnitude",hint:"|z_final|. Brighter at faster escape."},{id:"decomposition",label:"Decomp",hint:"Binary by sign(imag z). Reveals the Julia domains."},{id:"bands",label:"Bands",hint:"Hard bands per integer iter — maximum banding."},{id:"orbit-point",label:"Trap·point",hint:"Orbit trap: min distance from the iteration to a point."},{id:"orbit-circle",label:"Trap·circle",hint:"Orbit trap: min distance to a ring of given radius."},{id:"orbit-cross",label:"Trap·cross",hint:"Orbit trap: min approach to the X/Y axes."},{id:"orbit-line",label:"Trap·line",hint:"Orbit trap: min distance to an arbitrary line."},{id:"stripe",label:"Stripe",hint:"Härkönen stripe-average — ⟨½+½·sin(k·arg z)⟩."},{id:"distance",label:"DE",hint:"Distance-estimate to the set. Crisp boundary glow."},{id:"derivative",label:"Derivative",hint:"log|dz/dc| — how fast orbits stretch around c."},{id:"potential",label:"Potential",hint:"log²|z| / 2ⁿ — continuous Böttcher potential."},{id:"trap-iter",label:"Trap iter",hint:"Iteration at which the trap minimum was reached."}];function we(r){switch(r){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function Qt(r){switch(r){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const xe={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-1200,interiorDamp:.59,dt:.016,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,fluidStyle:"plain",bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,paused:!1,simResolution:1344,autoQuality:!0};class Zt{constructor(e){f(this,"gl");f(this,"canvas");f(this,"quadVbo");f(this,"progJulia");f(this,"progMotion");f(this,"progAddForce");f(this,"progInjectDye");f(this,"progAdvect");f(this,"progDivergence");f(this,"progCurl");f(this,"progVorticity");f(this,"progPressure");f(this,"progGradSub");f(this,"progSplat");f(this,"progDisplay");f(this,"progClear");f(this,"progReproject");f(this,"progBloomExtract");f(this,"progBloomDown");f(this,"progBloomUp");f(this,"progMask");f(this,"bloomA");f(this,"bloomB");f(this,"bloomC");f(this,"bloomDirty",!0);f(this,"lastCenter",[0,0]);f(this,"lastZoom",1.5);f(this,"firstFrame",!0);f(this,"simW",0);f(this,"simH",0);f(this,"juliaCur");f(this,"juliaPrev");f(this,"forceTex");f(this,"velocity");f(this,"dye");f(this,"divergence");f(this,"pressure");f(this,"curl");f(this,"maskTex");f(this,"gradientTex",null);f(this,"collisionGradientTex",null);f(this,"params",{...xe});f(this,"lastTimeMs",0);f(this,"framebufferFormat");this.canvas=e;const o=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!o)throw new Error("WebGL2 required — your browser does not support it.");this.gl=o;const t=o.getExtension("EXT_color_buffer_float"),s=o.getExtension("EXT_color_buffer_half_float");if(!t&&!s)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=o.createBuffer(),o.bindBuffer(o.ARRAY_BUFFER,this.quadVbo),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),o.STATIC_DRAW),this.compileAll(),this.allocateTextures(this.params.simResolution)}detectFormat(){const e=this.gl,o=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const t of o){const s=e.createTexture();e.bindTexture(e.TEXTURE_2D,s),e.texImage2D(e.TEXTURE_2D,0,t.internal,4,4,0,t.format,t.type,null);const l=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,s,0);const u=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(l),e.deleteTexture(s),u===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${t.name} render targets.`),t}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,o){const t=this.gl,s=t.createShader(e);if(t.shaderSource(s,o),t.compileShader(s),!t.getShaderParameter(s,t.COMPILE_STATUS)){const l=t.getShaderInfoLog(s)||"",u=o.split(`
`).map((h,v)=>`${String(v+1).padStart(4)}: ${h}`).join(`
`);throw console.error(`Shader compile error:
${l}
${u}`),new Error(`Shader compile error: ${l}`)}return s}linkProgram(e,o,t){const s=this.gl,l=this.compileShader(s.VERTEX_SHADER,e),u=this.compileShader(s.FRAGMENT_SHADER,o),h=s.createProgram();if(s.attachShader(h,l),s.attachShader(h,u),s.bindAttribLocation(h,0,"aPos"),s.linkProgram(h),!s.getProgramParameter(h,s.LINK_STATUS))throw new Error(`Program link error: ${s.getProgramInfoLog(h)}`);s.deleteShader(l),s.deleteShader(u);const v={};for(const b of t)v[b]=s.getUniformLocation(h,b);return{prog:h,uniforms:v}}compileAll(){this.progJulia=this.linkProgram(_,gt,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq"]),this.progMotion=this.linkProgram(_,xt,["uTexel","uJulia","uJuliaPrev","uJuliaAux","uGradient","uMask","uMode","uGain","uDt","uInteriorDamp","uDyeGain","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uForceCap"]),this.progAddForce=this.linkProgram(_,vt,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram(_,bt,["uTexel","uDye","uJulia","uJuliaAux","uGradient","uMask","uDyeGain","uDyeFadeHz","uDt","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram(_,yt,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(_,wt,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(_,Ct,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(_,Tt,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram(_,jt,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(_,Mt,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram(_,Dt,["uTexel","uTarget","uPoint","uValue","uRadius","uAspect"]),this.progDisplay=this.linkProgram(_,Rt,["uTexel","uTexelDisplay","uTexelDye","uJulia","uJuliaAux","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram(_,Et,["uValue"]),this.progReproject=this.linkProgram(_,Bt,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"]),this.progBloomExtract=this.linkProgram(_,St,["uTexel","uSource","uThreshold","uSoftKnee"]),this.progBloomDown=this.linkProgram(_,At,["uTexel","uSource"]),this.progBloomUp=this.linkProgram(_,kt,["uTexel","uSource","uPrev","uIntensity"]),this.progMask=this.linkProgram(_,Ft,["uTexel","uJulia","uJuliaAux","uGradient","uCollisionGradient","uColorMapping","uGradientRepeat","uGradientPhase"])}createFBO(e,o){const t=this.gl,s=t.createTexture();t.bindTexture(t.TEXTURE_2D,s),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,o,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const l=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,l),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,s,0),t.viewport(0,0,e,o),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{tex:s,fbo:l,width:e,height:o,texel:[1/e,1/o]}}createMrtFbo(e,o){const t=this.gl,s=()=>{const v=t.createTexture();return t.bindTexture(t.TEXTURE_2D,v),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,this.framebufferFormat.internal,e,o,0,this.framebufferFormat.format,this.framebufferFormat.type,null),v},l=s(),u=s(),h=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,h),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,l,0),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT1,t.TEXTURE_2D,u,0),t.drawBuffers([t.COLOR_ATTACHMENT0,t.COLOR_ATTACHMENT1]),t.viewport(0,0,e,o),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texMain:l,texAux:u,fbo:h,width:e,height:o,texel:[1/e,1/o]}}deleteMrtFbo(e){if(!e)return;const o=this.gl;o.deleteTexture(e.texMain),o.deleteTexture(e.texAux),o.deleteFramebuffer(e.fbo)}createDoubleFBO(e,o){let t=this.createFBO(e,o),s=this.createFBO(e,o);return{width:e,height:o,texel:[1/e,1/o],get read(){return t},get write(){return s},swap(){const u=t;t=s,s=u}}}deleteFBO(e){if(!e)return;const o=this.gl;o.deleteTexture(e.tex),o.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateTextures(e){const o=this.canvas.width/Math.max(1,this.canvas.height),t=Math.max(32,e|0),s=Math.max(32,Math.round(t*o));s===this.simW&&t===this.simH&&this.juliaCur||(this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.simW=s,this.simH=t,this.juliaCur=this.createMrtFbo(s,t),this.juliaPrev=this.createMrtFbo(s,t),this.forceTex=this.createFBO(s,t),this.velocity=this.createDoubleFBO(s,t),this.dye=this.createDoubleFBO(s,t),this.divergence=this.createFBO(s,t),this.pressure=this.createDoubleFBO(s,t),this.curl=this.createFBO(s,t),this.maskTex=this.createFBO(s,t),this.firstFrame=!0)}bindFBO(e){const o=this.gl;o.bindFramebuffer(o.FRAMEBUFFER,e.fbo),o.viewport(0,0,e.width,e.height)}useProgram(e){const o=this.gl;o.useProgram(e.prog),o.bindBuffer(o.ARRAY_BUFFER,this.quadVbo),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,o,t){const s=this.gl,l=e.uniforms.uTexel;l&&s.uniform2f(l,1/o,1/t)}bindTex(e,o,t){const s=this.gl;s.activeTexture(s.TEXTURE0+e),s.bindTexture(s.TEXTURE_2D,o),t&&s.uniform1i(t,e)}setParams(e){this.params={...this.params,...e},e.simResolution&&e.simResolution!==this.simH&&this.allocateTextures(e.simResolution)}uploadLut(e,o){const t=this.gl,s=ye*4;o.length!==s&&console.warn(`[FluidEngine] ${e} gradient buffer unexpected length ${o.length} (want ${s})`);let l=e==="main"?this.gradientTex:this.collisionGradientTex;l||(l=t.createTexture(),e==="main"?this.gradientTex=l:this.collisionGradientTex=l),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,l),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,ye,1,0,t.RGBA,t.UNSIGNED_BYTE,o)}setGradientBuffer(e){this.uploadLut("main",e)}setCollisionGradientBuffer(e){this.uploadLut("collision",e)}ensureGradient(){if(this.gradientTex)return;const e=ye,o=new Uint8Array(e*4);for(let t=0;t<e;++t)o[t*4+0]=t,o[t*4+1]=t,o[t*4+2]=t,o[t*4+3]=255;this.setGradientBuffer(o)}ensureCollisionGradient(){if(this.collisionGradientTex)return;const e=ye,o=new Uint8Array(e*4);for(let t=0;t<e;++t)o[t*4+0]=0,o[t*4+1]=0,o[t*4+2]=0,o[t*4+3]=255;this.setCollisionGradientBuffer(o)}resize(e,o){const t=Math.min(window.devicePixelRatio||1,2),s=Math.max(1,Math.round(e*t)),l=Math.max(1,Math.round(o*t));(this.canvas.width!==s||this.canvas.height!==l)&&(this.canvas.width=s,this.canvas.height=l,this.allocateTextures(this.params.simResolution),this.bloomDirty=!0)}ensureBloomFbos(){if(!this.bloomDirty&&this.bloomA)return;this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC);const e=this.canvas.width,o=this.canvas.height,t=Math.max(4,e>>1&-2),s=Math.max(4,o>>1&-2),l=Math.max(2,e>>2&-2),u=Math.max(2,o>>2&-2),h=Math.max(2,e>>3&-2),v=Math.max(2,o>>3&-2);this.bloomA=this.createFBO(t,s),this.bloomB=this.createFBO(l,u),this.bloomC=this.createFBO(h,v),this.bloomDirty=!1}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const o of[this.velocity,this.dye,this.pressure])for(const t of[o.read,o.write])this.bindFBO(t),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,o,t,s){const l=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),l.uniform2f(this.progSplat.uniforms.uPoint,o,t),l.uniform3f(this.progSplat.uniforms.uValue,s[0],s[1],s[2]),l.uniform1f(this.progSplat.uniforms.uRadius,Ot),l.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}splatForce(e,o,t,s,l,u){e=Math.max(0,Math.min(1,e)),o=Math.max(0,Math.min(1,o)),this.splat(this.velocity,e,o,[t*l,s*l,0]),this.splat(this.dye,e,o,u),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}renderJulia(){const e=this.gl,o=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=o,e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const t=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,t),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(t,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,Qt(this.params.colorMapping)),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq),this.drawQuad()}computeMask(){const e=this.gl;if(this.ensureGradient(),this.ensureCollisionGradient(),this.bindFBO(this.maskTex),!this.params.collisionEnabled){e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);return}this.useProgram(this.progMask),this.setTexel(this.progMask,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMask.uniforms.uJulia),this.bindTex(1,this.juliaCur.texAux,this.progMask.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMask.uniforms.uGradient),this.bindTex(3,this.collisionGradientTex,this.progMask.uniforms.uCollisionGradient),e.uniform1i(this.progMask.uniforms.uColorMapping,we(this.params.colorMapping)),e.uniform1f(this.progMask.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMask.uniforms.uGradientPhase,this.params.gradientPhase),this.drawQuad()}computeForce(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,this.juliaCur.texAux,this.progMotion.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMotion.uniforms.uGradient),this.bindTex(5,this.maskTex.tex,this.progMotion.uniforms.uMask),e.uniform1i(this.progMotion.uniforms.uMode,ei(this.params.forceMode)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uDyeGain,this.params.dyeInject),e.uniform1i(this.progMotion.uniforms.uColorMapping,we(this.params.colorMapping)),e.uniform1f(this.progMotion.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMotion.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.maskTex.tex,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH),this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,this.juliaCur.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(2,this.gradientTex,this.progInjectDye.uniforms.uGradient),this.bindTex(4,this.juliaCur.texAux,this.progInjectDye.uniforms.uJuliaAux),this.bindTex(5,this.maskTex.tex,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1i(this.progInjectDye.uniforms.uColorMapping,we(this.params.colorMapping)),e.uniform1f(this.progInjectDye.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progInjectDye.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,Kt(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,Wt(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let o=0;o<this.params.pressureIters;++o)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.maskTex.tex,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,o){const t=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.maskTex.tex,this.progAdvect.uniforms.uMask),t.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),t.uniform1f(this.progAdvect.uniforms.uDissipation,o),t.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,o,t){const s=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),s.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),s.uniform2f(this.progReproject.uniforms.uOldCenter,o[0],o[1]),s.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),s.uniform1f(this.progReproject.uniforms.uOldZoom,t),s.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],o=this.params.center[1]-this.lastCenter[1],t=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(o)<1e-7&&Math.abs(t)<1e-7)return;const s=[this.lastCenter[0],this.lastCenter[1]],l=this.lastZoom;this.reprojectTexture(this.dye,s,l),this.reprojectTexture(this.velocity,s,l),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.ensureGradient();const o=this.params.bloomAmount>.001;o&&(this.ensureBloomFbos(),this.bindFBO(this.bloomA),this.setDisplayUniforms(null,!0),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomExtract),e.uniform2f(this.progBloomExtract.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomA.tex,this.progBloomExtract.uniforms.uSource),e.uniform1f(this.progBloomExtract.uniforms.uThreshold,this.params.bloomThreshold),e.uniform1f(this.progBloomExtract.uniforms.uSoftKnee,Ht),this.drawQuad(),this.bindFBO(this.bloomC),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomA),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomUp),e.uniform2f(this.progBloomUp.uniforms.uTexel,this.bloomC.texel[0],this.bloomC.texel[1]),this.bindTex(0,this.bloomC.tex,this.progBloomUp.uniforms.uSource),this.bindTex(1,this.bloomA.tex,this.progBloomUp.uniforms.uPrev),e.uniform1f(this.progBloomUp.uniforms.uIntensity,1),this.drawQuad()),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(o?this.bloomB:null,!1),this.drawQuad()}setDisplayUniforms(e,o=!1){const t=this.gl;this.useProgram(this.progDisplay),t.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),t.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH),this.bindTex(0,this.juliaCur.texMain,this.progDisplay.uniforms.uJulia),this.bindTex(4,this.juliaCur.texAux,this.progDisplay.uniforms.uJuliaAux),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradientTex,this.progDisplay.uniforms.uGradient),this.bindTex(5,(e==null?void 0:e.tex)??this.gradientTex,this.progDisplay.uniforms.uBloom),this.bindTex(6,this.maskTex.tex,this.progDisplay.uniforms.uMask),t.uniform1i(this.progDisplay.uniforms.uShowMode,ti(this.params.show)),t.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),t.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),t.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),t.uniform1i(this.progDisplay.uniforms.uColorMapping,we(this.params.colorMapping)),t.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),t.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),t.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),o?(t.uniform1i(this.progDisplay.uniforms.uToneMapping,0),t.uniform1f(this.progDisplay.uniforms.uExposure,1),t.uniform1f(this.progDisplay.uniforms.uVibrance,0),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),t.uniform1f(this.progDisplay.uniforms.uAberration,0),t.uniform1f(this.progDisplay.uniforms.uRefraction,0),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),t.uniform1f(this.progDisplay.uniforms.uCaustics,0),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(t.uniform1i(this.progDisplay.uniforms.uToneMapping,qt(this.params.toneMapping)),t.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),t.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),t.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),t.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),t.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),t.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),t.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),t.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const o=this.gl,t=this.lastTimeMs===0?.016:Math.min(.05,(e-this.lastTimeMs)/1e3);this.lastTimeMs=e,this.params.dt=t,this.renderJulia(),this.computeMask(),this.params.paused||(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,null)}dispose(){const e=this.gl;this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.gradientTex&&(e.deleteTexture(this.gradientTex),this.gradientTex=null),this.collisionGradientTex&&(e.deleteTexture(this.collisionGradientTex),this.collisionGradientTex=null),this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC),e.deleteBuffer(this.quadVbo);for(const o of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progMask,this.progBloomExtract,this.progBloomDown,this.progBloomUp])o!=null&&o.prog&&e.deleteProgram(o.prog)}canvasToFractal(e,o){const t=this.canvas.getBoundingClientRect(),s=(e-t.left)/t.width,l=1-(o-t.top)/t.height,u=this.canvas.width/this.canvas.height,h=(s*2-1)*u*this.params.zoom+this.params.center[0],v=(l*2-1)*this.params.zoom+this.params.center[1];return[h,v]}canvasToUv(e,o){const t=this.canvas.getBoundingClientRect();return[(e-t.left)/t.width,1-(o-t.top)/t.height]}}function ei(r){switch(r){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function ti(r){switch(r){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const ze=96;function ii(r,e){const t=(e-Math.floor(e))*256,s=Math.floor(t)%256,l=(s+1)%256,u=t-Math.floor(t),h=r[s*4+0]*(1-u)+r[l*4+0]*u,v=r[s*4+1]*(1-u)+r[l*4+1]*u,b=r[s*4+2]*(1-u)+r[l*4+2]*u;return[h,v,b]}function ri(r,e,o,t){switch(t){case"angle":return Math.atan2(o,e)*.15915494+.5;case"magnitude":return Math.max(0,Math.min(1,Math.hypot(e,o)*.08));case"decomposition":return(o>=0?.5:0)+.25;case"bands":return Math.floor(r)*.0625;case"potential":{const s=Math.max(e*e+o*o,1.0001);return Math.log2(Math.log2(s))*.5%1}case"orbit-point":case"orbit-circle":case"orbit-cross":case"orbit-line":case"stripe":case"distance":case"derivative":case"trap-iter":case"iterations":default:return r*.05}}function oi(r,e,o,t,s,l,u,h,v,b){const X=new ImageData(r,r),S=X.data,W=Math.round(v[0]*255),N=Math.round(v[1]*255),V=Math.round(v[2]*255),G=Math.round(b),E=Math.abs(b-G)<.01&&G>=2&&G<=8;for(let A=0;A<r;A++){const C=o+(A/r*2-1)*t;for(let d=0;d<r;d++){const P=e+(d/r*2-1)*t;let k=0,j=0,F=0;for(;F<ze;F++){const w=k*k,q=j*j;if(w+q>16)break;let a,I;if(E){let B=k,ee=j;for(let oe=1;oe<G;oe++){const $=B*k-ee*j;ee=B*j+ee*k,B=$}a=B,I=ee}else{const B=Math.sqrt(w+q),ee=Math.atan2(j,k),oe=Math.pow(B,b),$=ee*b;a=oe*Math.cos($),I=oe*Math.sin($)}k=a+P,j=I+C}const J=((r-1-A)*r+d)*4;if(F>=ze)S[J+0]=W,S[J+1]=N,S[J+2]=V;else{const w=F+1-Math.log2(Math.max(1e-6,.5*Math.log2(k*k+j*j))),a=ri(w,k,j,h)*l+u,[I,B,ee]=ii(s,a);S[J+0]=Math.round(I),S[J+1]=Math.round(B),S[J+2]=Math.round(ee)}S[J+3]=255}}return X}const ai=(()=>{const r=new Uint8Array(1024);for(let e=0;e<256;e++)r[e*4]=r[e*4+1]=r[e*4+2]=e,r[e*4+3]=255;return r})(),si=({cx:r,cy:e,onChange:o,halfExtent:t=1.6,centerX:s=-.5,centerY:l=0,size:u=220,gradientLut:h,gradientRepeat:v=1,gradientPhase:b=0,colorMapping:X="iterations",interiorColor:S=[.04,.04,.06],power:W=2})=>{const N=p.useRef(null),V=p.useRef(null),G=p.useRef(!1);p.useEffect(()=>{const C=N.current;if(!C)return;const d=C.getContext("2d");if(!d)return;C.width=u,C.height=u;const k=oi(u,s,l,t,h??ai,v,b,X,S,W);V.current=k,d.putImageData(k,0,0),E()},[u,s,l,t,h,v,b,X,S[0],S[1],S[2],W]);const E=p.useCallback(()=>{const C=N.current;if(!C||!V.current)return;const d=C.getContext("2d");if(!d)return;d.putImageData(V.current,0,0);const P=(r-s)/t*.5+.5,k=(e-l)/t*.5+.5,j=P*u,F=(1-k)*u;d.strokeStyle="#fff",d.lineWidth=1,d.beginPath(),d.moveTo(j-8,F),d.lineTo(j-2,F),d.moveTo(j+2,F),d.lineTo(j+8,F),d.moveTo(j,F-8),d.lineTo(j,F-2),d.moveTo(j,F+2),d.lineTo(j,F+8),d.stroke(),d.strokeStyle="rgba(0,255,200,0.9)",d.beginPath(),d.arc(j,F,4,0,2*Math.PI),d.stroke()},[r,e,s,l,t,u]);p.useEffect(()=>{E()},[E]);const A=C=>{const d=N.current;if(!d)return;const P=d.getBoundingClientRect(),k=(C.clientX-P.left)/P.width,j=1-(C.clientY-P.top)/P.height,F=s+(k*2-1)*t,J=l+(j*2-1)*t;o(F,J)};return i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),i.jsx("canvas",{ref:N,className:"rounded border border-white/10 cursor-crosshair",style:{width:u,height:u,imageRendering:"pixelated"},onPointerDown:C=>{G.current=!0,C.target.setPointerCapture(C.pointerId),A(C)},onPointerMove:C=>{G.current&&A(C)},onPointerUp:C=>{G.current=!1;try{C.target.releasePointerCapture(C.pointerId)}catch{}}}),i.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",r.toFixed(4),", ",e.toFixed(4),")"]})]})},re=r=>r.map(([e,o],t)=>({id:`s${t}`,position:e,color:o,bias:.5,interpolation:"linear"})),De=[{id:"lagoon",name:"Lagoon",desc:"Gentle teal-and-gold curls — the calm lake.",params:{juliaC:[-.7,.27015],center:[0,0],zoom:1.5,maxIter:160,power:2,kind:"julia",forceMode:"curl",forceGain:760,interiorDamp:.9,dissipation:.18,dyeDissipation:.63,dyeInject:2.28,vorticity:1.3,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"iterations",colorIter:160,dyeBlend:"add",interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,simResolution:768},gradient:{stops:re([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"ink-curl",name:"Ink Curl",desc:"Pure monochrome curl — maximum fluid clarity. All colour stripped; fluid is the star.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:re([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"tidepool",name:"Tidepool",desc:"Deep-sea blue with crimson breakers. Rare fractional power (1.5) gives unusual fold geometry.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:re([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"}},{id:"eclipse",name:"Eclipse",desc:"Mandelbrot view with orbit-circle coloring — negative force pulls matter INWARD toward the set.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.8171020426639567,-.04318287939681306],zoom:1.2906510553334984,maxIter:157,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-100,interiorDamp:0,dissipation:.22,dyeDissipation:.76,dyeInject:50,vorticity:7.8,pressureIters:60,show:"composite",juliaMix:0,dyeMix:3.45,velocityViz:0,gradientRepeat:4.99,gradientPhase:0,colorMapping:"orbit-circle",colorIter:42,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:3,simResolution:768},gradient:{stops:re([[.067,"#000000"],[.507,"#09012F"],[.53,"#040449"],[.554,"#000764"],[.577,"#0C2C8A"],[.6,"#1852B1"],[.623,"#397DD1"],[.646,"#86B5E5"],[.67,"#D3ECF8"],[.693,"#F1E9BF"],[.716,"#F8C95F"],[.739,"#FFAA00"],[.763,"#CC8000"],[.786,"#995700"],[.809,"#6A3403"],[.874,"#421E0F"],[1,"#000000"]]),colorSpace:"linear",blendSpace:"oklab"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"turbo-orbit",name:"Turbo Orbit",desc:"Full Turbo palette, orbit-circle coloring, huge dye mix — visually loud.",params:{juliaC:[.26990692864529475,.483971044467425],center:[.17,0],zoom:1.5,maxIter:160,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.8,dissipation:.22,dyeDissipation:1.66,dyeInject:3,vorticity:24,pressureIters:60,show:"composite",juliaMix:0,dyeMix:15.575,velocityViz:0,gradientRepeat:2.92,gradientPhase:.13,colorMapping:"orbit-circle",colorIter:160,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:.1,simResolution:768},gradient:{stops:re([[0,"#30123B"],[.071,"#4145AB"],[.143,"#4675ED"],[.214,"#39A2FC"],[.286,"#1BCFD4"],[.357,"#24ECA6"],[.429,"#61FC6C"],[.5,"#A4FC3B"],[.571,"#D1E834"],[.643,"#F3C63A"],[.714,"#FE9B2D"],[.786,"#F36315"],[.857,"#D93806"],[.929,"#B11901"],[1,"#7A0402"]]),colorSpace:"linear",blendSpace:"oklab"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"inferno-bands",name:"Inferno Bands",desc:"Force-gradient mode + hard band coloring at very high resolution — staccato fire.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"over",interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12,simResolution:1536},gradient:{stops:re([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"quartic",name:"Quartic Drift",desc:"Power-4 Julia under subtle c-track — four-fold symmetric flow at low gain.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:re([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"absinthe",name:"Absinthe",desc:"Exotic negative power (z → z⁻⁶ + c), mint-to-teal palette, bloom + aberration — electric and dreamlike.",params:{juliaC:[.3435417216327623,-.9983641755913593],center:[-.3500208870433565,-.06994721707561113],zoom:2.315410785185688,maxIter:8,power:-6,kind:"julia",forceMode:"c-track",forceGain:23.3,interiorDamp:0,dissipation:.36,dyeDissipation:.68,dyeInject:4.595,vorticity:46.4,pressureIters:50,show:"composite",juliaMix:.19,dyeMix:4,velocityViz:0,gradientRepeat:3.04,gradientPhase:.285,colorMapping:"iterations",colorIter:6,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",toneMapping:"none",exposure:1,vibrance:.99,fluidStyle:"plain",bloomAmount:1.21,bloomThreshold:.86,aberration:1.59,refraction:0,refractSmooth:1,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1440},gradient:{stops:re([[0,"#d3f2a3"],[.167,"#97e196"],[.333,"#6cc08b"],[.5,"#4c9b82"],[.667,"#217a79"],[.833,"#105965"],[1,"#074050"]]),colorSpace:"linear",blendSpace:"oklab"},orbit:{enabled:!0,radius:.02,speed:.1}},{id:"viridis-pulse",name:"Viridis Pulse",desc:"C-track on viridis + electric pink. Slow auto-orbit — the fractal breathes.",params:{juliaC:[-.7,.27015],center:[0,0],zoom:1.5,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.35,dyeInject:.9,vorticity:16,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"over",interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,simResolution:768},gradient:{stops:re([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},orbit:{enabled:!0,radius:.035,speed:.02}}],Ve={stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"c1",position:1,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb",blendSpace:"rgb"},ni={stops:re([[0,"#421E0F"],[.067,"#19071A"],[.133,"#09012F"],[.2,"#040449"],[.267,"#000764"],[.333,"#0C2C8A"],[.4,"#1852B1"],[.467,"#397DD1"],[.533,"#86B5E5"],[.6,"#D3ECF8"],[.667,"#F1E9BF"],[.733,"#F8C95F"],[.8,"#FFAA00"],[.867,"#CC8000"],[.933,"#995700"],[1,"#6A3403"]]),colorSpace:"linear",blendSpace:"oklab"},Ye=de.createContext(!1),Je=[{id:"gradient",label:"Gradient",hint:"∇(escape iter) — force points AWAY from the set interior. Fractal acts as a source."},{id:"curl",label:"Curl",hint:"Perp of ∇(escape iter) — divergence-free swirl along level sets. Fluid surfs the contours."},{id:"iterate",label:"Iterate",hint:"Final z iterate direction (Böttcher). Fluid flows along the fractal's own orbit grain."},{id:"c-track",label:"C-Track",hint:"Δ(julia)/Δt as you move c. Fluid follows the deformation of the fractal in real time."},{id:"hue",label:"Hue",hint:"Rendered hue → angle, value → magnitude. The picture itself is the velocity field."}],He=[{id:"composite",label:"Mixed",hint:"Fractal + dye + optional velocity overlay"},{id:"julia",label:"Fractal",hint:"Pure fractal, fluid hidden"},{id:"dye",label:"Dye",hint:"Fluid dye only — shows what the fractal wrote"},{id:"velocity",label:"Velocity",hint:"Per-pixel velocity as a hue wheel"}],li=[{id:"julia",label:"Julia"},{id:"mandelbrot",label:"Mandelbrot"}],Xe=["Fractal","Coupling","Fluid","Palette","Post-FX","Collision","Composite","Presets"];function ci(r){const e=o=>Math.max(0,Math.min(255,Math.round(o*255))).toString(16).padStart(2,"0");return"#"+e(r[0])+e(r[1])+e(r[2])}function ui(r){const e=r.replace("#",""),o=parseInt(e.slice(0,2),16)/255,t=parseInt(e.slice(2,4),16)/255,s=parseInt(e.slice(4,6),16)/255;return[o,t,s]}const Y=({active:r,onClick:e,title:o,children:t,className:s=""})=>i.jsx("button",{type:"button",onClick:e,title:o,className:"px-2 py-1 text-[10px] rounded border transition-colors "+(r?"bg-cyan-500/20 border-cyan-400/60 text-cyan-200":"bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08]")+" "+s,children:t}),U=({children:r})=>de.useContext(Ye)?null:i.jsx("div",{className:"text-[9px] text-gray-500 leading-snug pl-1 pt-0.5",children:r}),y=({hint:r,children:e})=>i.jsxs("div",{className:"flex flex-col gap-0.5",children:[e,r&&i.jsx(U,{children:r})]}),Ce=({children:r,right:e})=>i.jsxs("div",{className:"flex items-center justify-between pt-1",children:[i.jsx("div",{className:"text-[10px] uppercase text-gray-400 tracking-wide",children:r}),e]}),di=({params:r,setParams:e,onReset:o,orbit:t,setOrbit:s,gradient:l,setGradient:u,gradientLut:h,collisionGradient:v,setCollisionGradient:b,onPresetApply:X,onSaveJson:S,onSavePng:W,onLoadFile:N,hideHints:V})=>{var j,F,J,w,q;const G=de.useRef(null),[E,A]=de.useState("Fractal"),C=a=>{const I=De.find(B=>B.id===a);I&&X(I)},d=a=>{var B;const I=(B=a.target.files)==null?void 0:B[0];I&&N(I),a.target.value=""},P=a=>{e(a==="plain"?{fluidStyle:"plain",bloomAmount:0,aberration:0,refraction:0,caustics:0}:a==="electric"?{fluidStyle:"electric",bloomAmount:.6,bloomThreshold:1,aberration:1,refraction:0,caustics:0,vibrance:.3}:{fluidStyle:"liquid",bloomAmount:.25,bloomThreshold:1.1,aberration:0,refraction:.08,caustics:8,vibrance:.3})},k=V?"gap-0.5":"gap-3";return i.jsx(Ye.Provider,{value:V,children:i.jsxs("div",{className:"flex flex-col h-full text-gray-200 text-xs select-none",children:[i.jsxs("div",{className:"flex items-center justify-between px-3 pt-3 pb-2",children:[i.jsxs("div",{children:[i.jsx("div",{className:"text-sm font-semibold",children:"Julia Fluid Toy"}),i.jsx("div",{className:"text-[10px] text-gray-500",children:"fractal ↔ fluid coupling lab"})]}),i.jsx("a",{href:"./index.html",className:"text-[10px] text-cyan-300 hover:underline",children:"← back to GMT"})]}),i.jsx("div",{className:"bg-black/40 border-b border-white/10",children:[Xe.slice(0,4),Xe.slice(4,8)].map((a,I)=>i.jsx("div",{className:`flex ${I===0?"border-b border-white/5":""}`,children:a.map(B=>i.jsxs("button",{type:"button",onClick:()=>A(B),className:`flex-1 py-1.5 px-0 text-[10px] font-bold tracking-wide whitespace-nowrap transition-all relative ${E===B?"text-cyan-400 bg-white/5":"text-gray-500 hover:text-gray-300 hover:bg-white/5"}`,children:[B,E===B&&i.jsx("div",{className:"absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"})]},B))},I))}),i.jsxs("div",{className:`flex-1 overflow-y-auto px-3 pt-3 pb-2 flex flex-col ${k}`,children:[E==="Fractal"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"The fractal is the force generator. Every fluid frame reads this texture."}),i.jsx("div",{className:"flex gap-1",children:li.map(a=>i.jsx(Y,{active:r.kind===a.id,onClick:()=>e({kind:a.id}),children:a.label},a.id))}),i.jsx(si,{cx:r.juliaC[0],cy:r.juliaC[1],onChange:(a,I)=>e({juliaC:[a,I]}),gradientLut:h??void 0,gradientRepeat:r.gradientRepeat,gradientPhase:r.gradientPhase,colorMapping:r.colorMapping,interiorColor:r.interiorColor,power:r.power}),i.jsx(y,{hint:"Julia constant. Move me to reshape the entire fractal — and the forces it emits.",children:i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"c.x",value:r.juliaC[0],onChange:a=>e({juliaC:[a,r.juliaC[1]]}),min:-2,max:2,step:.001,variant:"full"}),i.jsx(x,{label:"c.y",value:r.juliaC[1],onChange:a=>e({juliaC:[r.juliaC[0],a]}),min:-2,max:2,step:.001,variant:"full"})]})}),i.jsx(y,{hint:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001).",children:i.jsx(x,{label:"Zoom",value:r.zoom,onChange:a=>e({zoom:a}),min:1e-5,max:8,step:1e-4,hardMin:1e-5,variant:"full"})}),i.jsx(y,{hint:"Pan the fractal window.",children:i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"Center.x",value:r.center[0],onChange:a=>e({center:[a,r.center[1]]}),min:-2,max:2,step:.01,variant:"full"}),i.jsx(x,{label:"Center.y",value:r.center[1],onChange:a=>e({center:[r.center[0],a]}),min:-2,max:2,step:.01,variant:"full"})]})}),i.jsx(y,{hint:"More iterations → sharper escape gradients → finer force detail.",children:i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"Iter",value:r.maxIter,onChange:a=>e({maxIter:Math.round(a)}),min:16,max:512,step:1,variant:"full"}),i.jsx(x,{label:"Power",value:r.power,onChange:a=>e({power:a}),min:2,max:8,step:1,variant:"full"})]})})]}),E==="Coupling"&&i.jsxs(i.Fragment,{children:[i.jsxs(U,{children:["The coupling law. Chooses ",i.jsx("em",{children:"how"})," fractal pixels become velocity at each cell."]}),i.jsx("div",{className:"grid grid-cols-3 gap-1",children:Je.map(a=>i.jsx(Y,{active:r.forceMode===a.id,onClick:()=>e({forceMode:a.id}),title:a.hint,children:a.label},a.id))}),!V&&i.jsx("div",{className:"text-[10px] text-cyan-200/80 leading-snug bg-cyan-900/20 border border-cyan-500/20 rounded px-2 py-1",children:(j=Je.find(a=>a.id===r.forceMode))==null?void 0:j.hint}),i.jsx(y,{hint:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid.",children:i.jsx(x,{label:"Force gain",value:r.forceGain,onChange:a=>e({forceGain:a}),min:0,max:40,step:.1,variant:"full"})}),i.jsx(y,{hint:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed.",children:i.jsx(x,{label:"Interior damp",value:r.interiorDamp,onChange:a=>e({interiorDamp:a}),min:0,max:1,step:.01,variant:"full"})}),i.jsx(y,{hint:"Per-pixel cap on the fractal force magnitude.",children:i.jsx(x,{label:"Force cap",value:r.forceCap,onChange:a=>e({forceCap:a}),min:1,max:40,step:.5,variant:"full"})}),i.jsx(y,{hint:"Fades force/dye injection near the canvas edges. Fixes 'gushing from the borders' under fast c-changes.",children:i.jsx(x,{label:"Edge margin",value:r.edgeMargin,onChange:a=>e({edgeMargin:a}),min:0,max:.25,step:.005,variant:"full"})}),i.jsx(Ce,{right:i.jsx(Y,{active:t.enabled,onClick:()=>s({enabled:!t.enabled}),children:t.enabled?"on":"off"}),children:"Auto-orbit c"}),i.jsxs(U,{children:["Circles c automatically around its current value. Pair with ",i.jsx("b",{children:"C-Track"})," to watch the fluid breathe with the fractal's deformation."]}),t.enabled&&i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"Radius",value:t.radius,onChange:a=>s({radius:a}),min:0,max:.5,step:.001,variant:"full"}),i.jsx(x,{label:"Speed",value:t.speed,onChange:a=>s({speed:a}),min:0,max:3,step:.01,variant:"full"})]})]}),E==="Fluid"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"How the fluid carries and forgets what the fractal pushed into it."}),i.jsx(y,{hint:"Amplifies existing curl — keeps fractal-induced swirls from smearing away.",children:i.jsx(x,{label:"Vorticity",value:r.vorticity,onChange:a=>e({vorticity:a}),min:0,max:50,step:.1,variant:"full"})}),r.vorticity>0&&i.jsx(y,{hint:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices.",children:i.jsx(x,{label:"Vorticity scale",value:r.vorticityScale,onChange:a=>e({vorticityScale:a}),min:.5,max:8,step:.1,variant:"full"})}),i.jsx(y,{hint:"How fast velocity decays. High = fluid forgets the fractal quickly.",children:i.jsx(x,{label:"Velocity dissipation /s",value:r.dissipation,onChange:a=>e({dissipation:a}),min:0,max:5,step:.01,variant:"full"})}),i.jsx(y,{hint:"How fast dye fades.",children:i.jsx(x,{label:"Dye dissipation /s",value:r.dyeDissipation,onChange:a=>e({dyeDissipation:a}),min:0,max:5,step:.01,variant:"full"})}),i.jsx(y,{hint:"How much of the fractal's color bleeds into the fluid each frame.",children:i.jsx(x,{label:"Dye inject",value:r.dyeInject,onChange:a=>e({dyeInject:a}),min:0,max:3,step:.01,variant:"full"})}),i.jsx(y,{hint:"Jacobi iterations for incompressibility. More = stricter but slower.",children:i.jsx(x,{label:"Pressure iters",value:r.pressureIters,onChange:a=>e({pressureIters:Math.round(a)}),min:4,max:60,step:1,variant:"full"})}),i.jsx(Ce,{right:i.jsx(Y,{active:r.autoQuality,onClick:()=>e({autoQuality:!r.autoQuality}),children:r.autoQuality?"on":"off"}),children:"Quality"}),i.jsx(U,{children:"The slider is your target. Auto-quality may drop below it if FPS is low, then snaps back in one jump when it recovers (no stair-step flashing)."}),i.jsx(y,{hint:"Target fluid grid height in cells. More = finer detail, slower.",children:i.jsx(x,{label:"Sim resolution",value:r.simResolution,onChange:a=>e({simResolution:Math.round(a)}),min:128,max:1536,step:32,variant:"full"})})]}),E==="Palette"&&i.jsxs(i.Fragment,{children:[i.jsxs(U,{children:["Colors both the fractal AND the dye that gets injected into the fluid. In Hue-mode, it ",i.jsx("em",{children:"is"})," the vector field."]}),i.jsx(Be,{value:l,onChange:a=>{Array.isArray(a)?u({stops:a,colorSpace:l.colorSpace,blendSpace:l.blendSpace}):u(a)}}),i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("div",{className:"text-[10px] text-gray-400",children:"Color mapping"}),i.jsx("div",{className:"grid grid-cols-3 gap-1",children:Le.map(a=>i.jsx(Y,{active:r.colorMapping===a.id,onClick:()=>e({colorMapping:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(U,{children:(F=Le.find(a=>a.id===r.colorMapping))==null?void 0:F.hint})]}),i.jsx(y,{hint:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands.",children:i.jsx(x,{label:"Repetition",value:r.gradientRepeat,onChange:a=>e({gradientRepeat:a}),min:.1,max:8,step:.01,variant:"full"})}),i.jsx(y,{hint:"Phase shift — rotates the colors without changing their layout.",children:i.jsx(x,{label:"Phase",value:r.gradientPhase,onChange:a=>e({gradientPhase:a}),min:0,max:1,step:.005,variant:"full"})}),i.jsx(y,{hint:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter. Reduce for fresher colours.",children:i.jsx(x,{label:"Color iter",value:r.colorIter,onChange:a=>e({colorIter:Math.round(a)}),min:1,max:Math.max(4,r.maxIter),step:1,variant:"full"})}),(r.colorMapping==="orbit-point"||r.colorMapping==="orbit-circle"||r.colorMapping==="orbit-cross"||r.colorMapping==="trap-iter")&&i.jsx(y,{hint:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",children:i.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[i.jsx(x,{label:"Trap.x",value:r.trapCenter[0],onChange:a=>e({trapCenter:[a,r.trapCenter[1]]}),min:-2,max:2,step:.01,variant:"full"}),i.jsx(x,{label:"Trap.y",value:r.trapCenter[1],onChange:a=>e({trapCenter:[r.trapCenter[0],a]}),min:-2,max:2,step:.01,variant:"full"})]})}),r.colorMapping==="orbit-circle"&&i.jsx(y,{hint:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring.",children:i.jsx(x,{label:"Trap radius",value:r.trapRadius,onChange:a=>e({trapRadius:a}),min:.01,max:4,step:.01,variant:"full"})}),r.colorMapping==="orbit-line"&&i.jsx(y,{hint:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length.",children:i.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[i.jsx(x,{label:"n.x",value:r.trapNormal[0],onChange:a=>e({trapNormal:[a,r.trapNormal[1]]}),min:-1,max:1,step:.01,variant:"full"}),i.jsx(x,{label:"n.y",value:r.trapNormal[1],onChange:a=>e({trapNormal:[r.trapNormal[0],a]}),min:-1,max:1,step:.01,variant:"full"}),i.jsx(x,{label:"offset",value:r.trapOffset,onChange:a=>e({trapOffset:a}),min:-2,max:2,step:.01,variant:"full"})]})}),r.colorMapping==="stripe"&&i.jsx(y,{hint:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration.",children:i.jsx(x,{label:"Stripe freq",value:r.stripeFreq,onChange:a=>e({stripeFreq:a}),min:1,max:16,step:.1,variant:"full"})}),i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("div",{className:"text-[10px] text-gray-400",children:"Interior color (bounded points)"}),i.jsx("input",{type:"color",title:"Interior color (points that never escape)","aria-label":"Interior color",value:ci(r.interiorColor),onChange:a=>e({interiorColor:ui(a.target.value)}),className:"w-full h-6 rounded border border-white/10 cursor-pointer bg-transparent"})]}),i.jsx(Ce,{children:"Dye"}),i.jsx(U,{children:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."}),i.jsx("div",{className:"grid grid-cols-4 gap-1",children:Ge.map(a=>i.jsx(Y,{active:r.dyeBlend===a.id,onClick:()=>e({dyeBlend:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(U,{children:(J=Ge.find(a=>a.id===r.dyeBlend))==null?void 0:J.hint}),i.jsxs("div",{className:"flex flex-col gap-1",children:[i.jsx("div",{className:"text-[10px] text-gray-400",children:"Dye decay colour space"}),i.jsx("div",{className:"grid grid-cols-3 gap-1",children:_e.map(a=>i.jsx(Y,{active:r.dyeDecayMode===a.id,onClick:()=>e({dyeDecayMode:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(U,{children:(w=_e.find(a=>a.id===r.dyeDecayMode))==null?void 0:w.hint})]}),r.dyeDecayMode!=="linear"&&i.jsxs(i.Fragment,{children:[i.jsx(y,{hint:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright.",children:i.jsx(x,{label:"Chroma decay /s",value:r.dyeChromaDecayHz,onChange:a=>e({dyeChromaDecayHz:a}),min:0,max:5,step:.01,variant:"full"})}),i.jsx(y,{hint:"Per-frame chroma multiplier applied after decay. 1 = neutral, <1 washes out, >1 punches colours up.",children:i.jsx(x,{label:"Saturation boost",value:r.dyeSaturationBoost,onChange:a=>e({dyeSaturationBoost:a}),min:0,max:4,step:.01,variant:"full"})})]})]}),E==="Post-FX"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below."}),i.jsx("div",{className:"grid grid-cols-3 gap-1",children:$t.map(a=>i.jsx(Y,{active:r.fluidStyle===a.id,onClick:()=>P(a.id),title:a.hint,children:a.label},a.id))}),i.jsx(y,{hint:"Bloom strength — wide soft glow on bright pixels. Core of the electric look.",children:i.jsx(x,{label:"Bloom",value:r.bloomAmount,onChange:a=>e({bloomAmount:a}),min:0,max:3,step:.01,variant:"full"})}),r.bloomAmount>0&&i.jsx(y,{hint:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows.",children:i.jsx(x,{label:"Bloom threshold",value:r.bloomThreshold,onChange:a=>e({bloomThreshold:a}),min:0,max:3,step:.01,variant:"full"})}),i.jsx(y,{hint:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp.",children:i.jsx(x,{label:"Aberration",value:r.aberration,onChange:a=>e({aberration:a}),min:0,max:3,step:.01,variant:"full"})}),i.jsx(y,{hint:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass.",children:i.jsx(x,{label:"Refraction",value:r.refraction,onChange:a=>e({refraction:a}),min:0,max:.3,step:.001,variant:"full"})}),r.refraction>0&&i.jsx(y,{hint:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient.",children:i.jsx(x,{label:"Refract smooth",value:r.refractSmooth,onChange:a=>e({refractSmooth:a}),min:1,max:12,step:.1,variant:"full"})}),i.jsx(y,{hint:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends.",children:i.jsx(x,{label:"Caustics",value:r.caustics,onChange:a=>e({caustics:a}),min:0,max:25,step:.1,variant:"full"})}),i.jsx(Ce,{children:"Tone mapping"}),i.jsxs(U,{children:["How final colour gets compressed. ",i.jsx("b",{children:"None"})," = maximally vivid (may clip).",i.jsx("b",{children:" AgX"})," = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."]}),i.jsx("div",{className:"grid grid-cols-4 gap-1",children:Yt.map(a=>i.jsx(Y,{active:r.toneMapping===a.id,onClick:()=>e({toneMapping:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(y,{hint:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch.",children:i.jsx(x,{label:"Exposure",value:r.exposure,onChange:a=>e({exposure:a}),min:.1,max:5,step:.01,variant:"full"})}),i.jsx(y,{hint:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones.",children:i.jsx(x,{label:"Vibrance",value:r.vibrance,onChange:a=>e({vibrance:a}),min:0,max:1,step:.01,variant:"full"})})]}),E==="Collision"&&i.jsxs(i.Fragment,{children:[i.jsxs("div",{className:"flex items-center justify-between",children:[i.jsx("div",{className:"text-[11px] text-gray-200 font-medium",children:"Collision walls"}),i.jsx(Y,{active:r.collisionEnabled,onClick:()=>e({collisionEnabled:!r.collisionEnabled}),children:r.collisionEnabled?"on":"off"})]}),i.jsxs(U,{children:["Paints solid walls the fluid bounces off, sculpted by the gradient below. Same mapping (iterations / angle / orbit trap / etc.) as the main gradient — edit stops to black = ",i.jsx("b",{children:"fluid"}),", white = ",i.jsx("b",{children:"wall"}),". Gradient shape is up to you."]}),r.collisionEnabled&&i.jsxs(i.Fragment,{children:[i.jsx(Be,{value:v,onChange:a=>{Array.isArray(a)?b({stops:a,colorSpace:v.colorSpace,blendSpace:v.blendSpace}):b(a)}}),i.jsxs("div",{className:"flex items-center justify-between",children:[i.jsx("span",{className:"text-[10px] text-gray-400",children:"Preview walls on canvas"}),i.jsx(Y,{active:r.collisionPreview,onClick:()=>e({collisionPreview:!r.collisionPreview}),children:r.collisionPreview?"on":"off"})]}),i.jsx(U,{children:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."})]})]}),E==="Composite"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"What you see. The simulation runs the same either way."}),i.jsx("div",{className:"grid grid-cols-4 gap-1",children:He.map(a=>i.jsx(Y,{active:r.show===a.id,onClick:()=>e({show:a.id}),title:a.hint,children:a.label},a.id))}),i.jsx(U,{children:(q=He.find(a=>a.id===r.show))==null?void 0:q.hint}),r.show==="composite"&&i.jsxs(i.Fragment,{children:[i.jsx(y,{hint:"How much fractal color shows through in Mixed view.",children:i.jsx(x,{label:"Julia mix",value:r.juliaMix,onChange:a=>e({juliaMix:a}),min:0,max:2,step:.01,variant:"full"})}),i.jsx(y,{hint:"How much fluid dye shows through in Mixed view.",children:i.jsx(x,{label:"Dye mix",value:r.dyeMix,onChange:a=>e({dyeMix:a}),min:0,max:2,step:.01,variant:"full"})}),i.jsx(y,{hint:"Overlay velocity-hue on top of the composite. Diagnostic.",children:i.jsx(x,{label:"Velocity viz",value:r.velocityViz,onChange:a=>e({velocityViz:a}),min:0,max:2,step:.01,variant:"full"})})]})]}),E==="Presets"&&i.jsxs(i.Fragment,{children:[i.jsx(U,{children:"Each preset is a curated fractal→fluid coupling. Applying one resets the grid and restores known params."}),i.jsx("div",{className:"grid grid-cols-2 gap-1",children:De.map(a=>i.jsx(Y,{active:!1,onClick:()=>C(a.id),title:a.desc,children:a.name},a.id))}),i.jsx(U,{children:"Save / Screenshot / Load moved to the top bar icons above."}),i.jsx("div",{className:"grid grid-cols-1 gap-1",children:i.jsx(Y,{active:!1,onClick:S,title:"Export the full state as a .json file.",children:"Save JSON"})}),i.jsx("input",{ref:G,type:"file",accept:".png,.json,image/png,application/json,text/plain",onChange:d,className:"hidden","aria-label":"Load saved state"})]})]}),i.jsxs("div",{className:"flex gap-2 p-3 border-t border-white/5",children:[i.jsx("button",{type:"button",onClick:()=>e({paused:!r.paused}),className:"flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10",children:r.paused?"Resume":"Pause"}),i.jsx("button",{type:"button",onClick:o,className:"flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10",children:"Clear fluid"})]})]})})},hi=({x:r,y:e,items:o,onDismiss:t})=>{const s=p.useRef(null);p.useEffect(()=>{const u=b=>{s.current&&(s.current.contains(b.target)||t())},h=b=>{b.key==="Escape"&&t()},v=setTimeout(()=>{window.addEventListener("mousedown",u),window.addEventListener("keydown",h)},0);return()=>{clearTimeout(v),window.removeEventListener("mousedown",u),window.removeEventListener("keydown",h)}},[t]);const l={left:Math.min(r,window.innerWidth-240),top:Math.min(e,window.innerHeight-o.length*28-12)};return i.jsx("div",{ref:s,className:"fixed z-50 min-w-[200px] rounded border border-white/15 bg-[#1a1a1d]/95 backdrop-blur-sm shadow-xl text-[11px] text-gray-200 py-1",style:l,onContextMenu:u=>{u.preventDefault(),t()},children:o.map((u,h)=>i.jsxs(de.Fragment,{children:[u.separatorAbove&&i.jsx("div",{className:"my-1 border-t border-white/10"}),i.jsx("button",{type:"button",onClick:()=>{u.onClick(),t()},title:u.hint,className:"w-full text-left px-3 py-1.5 transition-colors "+(u.danger?"hover:bg-red-500/20 text-red-300":"hover:bg-cyan-500/15 hover:text-cyan-200"),children:u.label})]},h))})},pi=1,Re="GmtFluidState";function Me(r,e,o,t,s){return{version:pi,savedAt:new Date().toISOString(),name:s,params:r,gradient:e,collisionGradient:t,orbit:o}}function We(r){if(!r||typeof r!="object")throw new Error("Saved state is not an object");const e=r;if(typeof e.version!="number")throw new Error('Missing or invalid "version"');if(!e.params||typeof e.params!="object")throw new Error('Missing "params"');if(!e.gradient||typeof e.gradient!="object")throw new Error('Missing "gradient"');if(!e.orbit||typeof e.orbit!="object")throw new Error('Missing "orbit"');return{version:e.version,savedAt:typeof e.savedAt=="string"?e.savedAt:new Date().toISOString(),name:typeof e.name=="string"?e.name:void 0,params:e.params,gradient:e.gradient,collisionGradient:e.collisionGradient&&typeof e.collisionGradient=="object"?e.collisionGradient:void 0,orbit:e.orbit}}function Fe(r,e){const o=URL.createObjectURL(r),t=document.createElement("a");t.href=o,t.download=e,document.body.appendChild(t),t.click(),t.remove(),setTimeout(()=>URL.revokeObjectURL(o),1e3)}function fi(r,e="toy-fluid-state.json"){const o=JSON.stringify(r,null,2);Fe(new Blob([o],{type:"application/json"}),e)}async function mi(r,e,o="toy-fluid.png"){const t=await new Promise(h=>r.toBlob(h,"image/png"));if(!t)throw new Error("canvas.toBlob returned null");const s=new Uint8Array(await t.arrayBuffer()),l=vi(s,Re,JSON.stringify(e)),u=new Uint8Array(l.byteLength);u.set(l),Fe(new Blob([u.buffer],{type:"image/png"}),o)}async function gi(r,e="toy-fluid-screenshot.png"){const o=await new Promise(t=>r.toBlob(t,"image/png"));if(!o)throw new Error("canvas.toBlob returned null");Fe(o,e)}async function xi(r){const e=r.name.toLowerCase(),o=new Uint8Array(await r.arrayBuffer());if(e.endsWith(".png")||o.length>=8&&o[0]===137&&o[1]===80&&o[2]===78&&o[3]===71&&o[4]===13&&o[5]===10&&o[6]===26&&o[7]===10){const l=bi(o,Re);if(!l)throw new Error(`PNG has no "${Re}" metadata.`);return We(JSON.parse(l))}const s=new TextDecoder("utf-8").decode(o);return We(JSON.parse(s))}function vi(r,e,o){r.subarray(0,8);const t=33,s=r.subarray(0,t),l=r.subarray(t),u=yi(e,o),h=new Uint8Array(s.length+u.length+l.length);return h.set(s,0),h.set(u,s.length),h.set(l,s.length+u.length),h}function bi(r,e){let o=8;const t=new DataView(r.buffer,r.byteOffset,r.byteLength);for(;o+12<=r.length;){const s=t.getUint32(o,!1),l=String.fromCharCode(r[o+4],r[o+5],r[o+6],r[o+7]),u=o+8,h=u+s;if(l==="tEXt"){const v=r.subarray(u,h),b=v.indexOf(0);if(b>0&&new TextDecoder("latin1").decode(v.subarray(0,b))===e)return new TextDecoder("utf-8").decode(v.subarray(b+1))}if(l==="IEND")break;o=h+4}return null}function yi(r,e){const o=new TextEncoder,t=o.encode(r),s=o.encode(e);if(t.length===0||t.length>79)throw new Error("keyword length out of range");const l=t.length+1+s.length,u=new Uint8Array(12+l),h=new DataView(u.buffer);h.setUint32(0,l,!1),u[4]=116,u[5]=69,u[6]=88,u[7]=116,u.set(t,8),u[8+t.length]=0,u.set(s,8+t.length+1);const v=Ci(u,4,8+l);return h.setUint32(8+l,v,!1),u}const wi=(()=>{const r=new Uint32Array(256);for(let e=0;e<256;e++){let o=e;for(let t=0;t<8;t++)o=o&1?3988292384^o>>>1:o>>>1;r[e]=o>>>0}return r})();function Ci(r,e,o){let t=4294967295;for(let s=e;s<o;s++)t=wi[(t^r[s])&255]^t>>>8;return(t^4294967295)>>>0}const Ti="p-2 rounded-lg transition-all active:scale-95 border flex items-center justify-center",ji="bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10",Te=({title:r,onClick:e,children:o})=>i.jsx("button",{type:"button",onClick:e,title:r,className:`${Ti} ${ji}`,children:o}),Mi=({kind:r,forceMode:e,juliaC:o,zoom:t,simResolution:s,effectiveSimRes:l,fps:u,orbitOn:h,paused:v,onSavePng:b,onScreenshot:X,onLoadFile:S,onSubmit:W})=>{const N=de.useRef(null),V=()=>{var A;return(A=N.current)==null?void 0:A.click()},G=A=>{var d;const C=(d=A.target.files)==null?void 0:d[0];C&&S(C),A.target.value=""},E=l===s?`${s}px`:`${l}px / ${s}`;return i.jsxs("div",{className:"h-10 shrink-0 border-b border-white/5 bg-[#0b0b0d] flex items-center px-2 gap-2 text-[11px] font-mono text-gray-300","data-testid":"top-bar",children:[i.jsxs("div",{className:"flex items-center gap-2",children:[i.jsx("span",{className:"text-sm font-semibold text-gray-100 font-sans",children:"Julia Fluid"}),i.jsx("a",{href:"./index.html",className:"text-[10px] text-cyan-300 hover:underline font-sans",children:"← GMT"})]}),i.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),i.jsxs("div",{className:"flex items-center gap-3 min-w-0","data-testid":"status-bar",children:[i.jsx("span",{children:r==="julia"?"Julia":"Mandelbrot"}),i.jsx("span",{className:"text-cyan-300",children:e}),i.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-c",children:["c=(",o[0].toFixed(3),", ",o[1].toFixed(3),")"]}),i.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-zoom",children:["z=",t.toFixed(3)]}),i.jsx("span",{className:`whitespace-nowrap ${l<s?"text-amber-300":"text-gray-500"}`,children:E}),i.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-fps",children:[u," fps"]}),h&&i.jsx("span",{className:"text-amber-300",children:"orbit on"}),v&&i.jsx("span",{className:"text-red-400",children:"paused"})]}),i.jsxs("div",{className:"ml-auto flex items-center gap-1",children:[i.jsx(Te,{title:"Save scene as PNG (state embedded in metadata)",onClick:b,children:i.jsx(ct,{})}),i.jsx(Te,{title:"Screenshot canvas as plain PNG",onClick:X,children:i.jsx(ut,{})}),i.jsx(Te,{title:"Load a saved .png or .json",onClick:V,children:i.jsx(dt,{})}),i.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),i.jsx(Te,{title:"Submit this preset to the curator",onClick:W,children:i.jsx(ht,{})}),i.jsx("input",{ref:N,type:"file",accept:".png,.json,image/png,application/json,text/plain",onChange:G,className:"hidden","aria-label":"Load saved state"})]})]})};let Di=0;function Ri(){const r=(performance.now()-Di)/1e3;return Math.max(0,Xt-r)}async function Fi(r,e,o){return{ok:!1,code:"disabled",message:"Preset submission is not yet enabled in this build. Save a PNG and send it directly."}}const Ei=({open:r,canvas:e,state:o,onClose:t})=>{const[s,l]=p.useState(""),[u,h]=p.useState(""),[v,b]=p.useState(""),[X,S]=p.useState(!1),[W,N]=p.useState({kind:"idle"}),[V,G]=p.useState(null),E=p.useRef(null);if(p.useEffect(()=>{if(!r||!e){G(null);return}let d=null;return e.toBlob(P=>{P&&(d=URL.createObjectURL(P),G(d))},"image/png"),()=>{d&&URL.revokeObjectURL(d)}},[r,e]),p.useEffect(()=>{r||(N({kind:"idle"}),S(!1))},[r]),p.useEffect(()=>{if(!r)return;const d=P=>{P.key==="Escape"&&t()};return window.addEventListener("keydown",d),()=>window.removeEventListener("keydown",d)},[r,t]),!r)return null;const A=Ri(),C=async()=>{if(!e||!o)return;N({kind:"sending"}),s.trim(),u.trim(),v.trim();const d=await Fi();d.ok?N({kind:"ok",id:d.id}):N({kind:"error",message:d.message})};return i.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4",onMouseDown:d=>{d.target===d.currentTarget&&t()},children:i.jsxs("div",{ref:E,className:"w-[480px] max-w-full rounded-lg border border-white/10 bg-[#0b0b0d] shadow-2xl text-gray-200 text-xs overflow-hidden",children:[i.jsxs("div",{className:"px-4 py-3 border-b border-white/5 flex items-center justify-between",children:[i.jsxs("div",{children:[i.jsx("div",{className:"text-sm font-semibold",children:"Submit preset"}),i.jsx("div",{className:"text-[10px] text-gray-500",children:"Share the current scene with the curator"})]}),i.jsx("button",{type:"button",onClick:t,className:"text-gray-500 hover:text-gray-200 text-sm px-1 leading-none",title:"Close (Esc)",children:"×"})]}),i.jsx("div",{className:"mx-4 mt-3 mb-0 px-3 py-2 text-[10px] text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded",children:"Submissions aren't enabled in this build yet. In the meantime, use the Save icon in the top bar to export a PNG and send it directly."}),i.jsxs("div",{className:"p-4 flex gap-3",children:[i.jsxs("div",{className:"w-[180px] shrink-0",children:[i.jsx("div",{className:"aspect-square rounded border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center",children:V?i.jsx("img",{src:V,alt:"preset preview",className:"w-full h-full object-cover"}):i.jsx("span",{className:"text-[10px] text-gray-500",children:"rendering preview…"})}),i.jsx("div",{className:"text-[9px] text-gray-500 mt-1 leading-snug",children:"The preview above, plus the scene's JSON state, are what gets submitted."})]}),i.jsxs("div",{className:"flex-1 flex flex-col gap-2",children:[i.jsxs("label",{className:"flex flex-col gap-0.5",children:[i.jsxs("span",{className:"text-[10px] text-gray-400",children:["Name ",i.jsx("span",{className:"text-red-400",children:"*"})]}),i.jsx("input",{value:s,onChange:d=>l(d.target.value.slice(0,60)),disabled:!0,placeholder:"e.g. Ember Tide",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"})]}),i.jsxs("label",{className:"flex flex-col gap-0.5",children:[i.jsx("span",{className:"text-[10px] text-gray-400",children:"Author (optional)"}),i.jsx("input",{value:u,onChange:d=>h(d.target.value.slice(0,60)),disabled:!0,placeholder:"alias or handle",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"})]}),i.jsxs("label",{className:"flex flex-col gap-0.5",children:[i.jsx("span",{className:"text-[10px] text-gray-400",children:"Notes (optional)"}),i.jsx("textarea",{value:v,onChange:d=>b(d.target.value.slice(0,500)),disabled:!0,rows:3,placeholder:"What's interesting about this preset? (≤ 500 chars)",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] resize-none focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"}),i.jsxs("span",{className:"text-[9px] text-gray-500 text-right",children:[v.length," / 500"]})]}),i.jsxs("label",{className:"flex items-start gap-2 mt-1 cursor-pointer select-none",children:[i.jsx("input",{type:"checkbox",checked:X,onChange:d=>S(d.target.checked),disabled:!0,className:"mt-0.5 accent-cyan-500"}),i.jsx("span",{className:"text-[10px] text-gray-400 leading-snug",children:"I understand this preset (image + parameters + my alias if provided) may be reviewed, edited, and republished as part of the built-in preset library."})]})]})]}),W.kind==="ok"&&i.jsxs("div",{className:"mx-4 mb-3 px-3 py-2 text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 rounded",children:["Thanks! Your preset is in the queue. ",i.jsxs("span",{className:"text-[10px] text-emerald-400/70",children:["(id: ",W.id,")"]})]}),W.kind==="error"&&i.jsx("div",{className:"mx-4 mb-3 px-3 py-2 text-[11px] text-red-300 bg-red-500/10 border border-red-400/20 rounded",children:W.message}),i.jsxs("div",{className:"px-4 py-3 border-t border-white/5 flex items-center justify-end gap-2",children:[i.jsx("button",{type:"button",onClick:t,className:"px-3 py-1.5 text-[11px] rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10",children:"Cancel"}),i.jsx("button",{type:"button",onClick:C,disabled:!0,className:"px-3 py-1.5 text-[11px] rounded border transition-colors bg-white/[0.04] border-white/10 text-gray-500 cursor-not-allowed",children:W.kind==="sending"?"Sending…":A>0?`Wait ${Math.ceil(A)}s`:"Submit"})]})]})})},Si=()=>{const r=p.useRef(null),e=p.useRef(null),o=p.useRef(null),[t,s]=p.useState(xe),[l,u]=p.useState(Oe),[h,v]=p.useState(ni),[b,X]=p.useState(Ve),[S,W]=p.useState(null),[N,V]=p.useState(0),[G,E]=p.useState(!0),[A,C]=p.useState(!1),[d,P]=p.useState(null),[k,j]=p.useState(!1),F=p.useMemo(()=>ke(h),[h]),J=p.useMemo(()=>ke(b),[b]);p.useEffect(()=>{var n;(n=e.current)==null||n.setGradientBuffer(F)},[F]),p.useEffect(()=>{var n;(n=e.current)==null||n.setCollisionGradientBuffer(J)},[J]);const w=p.useRef(t);w.current=t;const q=p.useRef(l);q.current=l;const a=p.useRef({c:!1,shift:!1,alt:!1}),I=p.useRef(xe.simResolution),[B,ee]=p.useState(xe.simResolution),oe=p.useRef(t.juliaC);p.useEffect(()=>{oe.current=t.juliaC},[t.juliaC]);const $=p.useRef({down:!1,mode:"splat",startX:0,startY:0,startCx:0,startCy:0,startCenterX:0,startCenterY:0,startZoom:1.5,zoomAnchor:[0,0],zoomAnchorUv:[.5,.5],lastX:0,lastY:0,lastT:0,rightDragged:!1});p.useEffect(()=>{const n=r.current;if(!n)return;try{const T=new Zt(n);e.current=T,T.setParams(w.current),T.setGradientBuffer(F),T.setCollisionGradientBuffer(J);const Q=n.getBoundingClientRect();T.resize(Q.width,Q.height)}catch(T){W(T.message||String(T));return}let m=0,c=performance.now(),g=0,M=performance.now(),O=60,D=w.current.simResolution;I.current=D;let K=w.current.simResolution,R=0,te=0,ae=performance.now(),se=D;const le=T=>{const Q=e.current;if(!Q)return;const ge=Math.min(.25,(T-M)/1e3),ie=w.current.simResolution,L=w.current.autoQuality;ie!==K&&(D=ie,K=ie,R=0,te=0,ae=T),L?T-ae>Jt&&(O<Gt&&D>Ne?(R+=ge,te=0,R>zt&&(D=Math.max(Ne,D-_t),R=0,ae=T)):O>Lt&&D<ie?(te+=ge,R=0,te>Vt&&(D=ie,te=0,ae=T)):(R*=.9,te*=.9)):D=ie,D>ie&&(D=ie),I.current=D;const z=q.current;if(z.enabled&&z.radius>0&&z.speed>0){g+=ge*z.speed;const[Z,ce]=oe.current,ne=Z+Math.cos(g*6.2831853)*z.radius,ue=ce+Math.sin(g*6.2831853)*z.radius;Q.setParams({...w.current,juliaC:[ne,ue],simResolution:D})}else Q.setParams({...w.current,simResolution:D});if(M=T,Q.frame(T),m++,T-c>500){const Z=Math.round(m*1e3/(T-c));V(Z),O=O*.5+Z*.5,m=0,c=T}D!==se&&(ee(D),se=D),o.current=requestAnimationFrame(le)};o.current=requestAnimationFrame(le);const be=new ResizeObserver(()=>{const T=e.current;if(!T||!n)return;const Q=n.getBoundingClientRect();T.resize(Q.width,Q.height)});return be.observe(n),()=>{var T;o.current&&cancelAnimationFrame(o.current),be.disconnect(),(T=e.current)==null||T.dispose(),e.current=null}},[]),p.useEffect(()=>{const n=g=>{var O,D,K;const M=(D=(O=g.target)==null?void 0:O.tagName)==null?void 0:D.toLowerCase();M==="input"||M==="textarea"||((g.key==="c"||g.key==="C")&&(a.current.c=!0),a.current.shift=g.shiftKey,a.current.alt=g.altKey,g.code==="Space"?(g.preventDefault(),s(R=>({...R,paused:!R.paused}))):g.key==="r"||g.key==="R"?(K=e.current)==null||K.resetFluid():g.key==="h"||g.key==="H"?C(R=>!R):g.key==="o"||g.key==="O"?u(R=>({...R,enabled:!R.enabled})):g.key==="Home"&&s(R=>({...R,center:[0,0],zoom:1.5})))},m=g=>{(g.key==="c"||g.key==="C")&&(a.current.c=!1),a.current.shift=g.shiftKey,a.current.alt=g.altKey},c=()=>{a.current.c=!1,a.current.shift=!1,a.current.alt=!1};return window.addEventListener("keydown",n),window.addEventListener("keyup",m),window.addEventListener("blur",c),()=>{window.removeEventListener("keydown",n),window.removeEventListener("keyup",m),window.removeEventListener("blur",c)}},[]);const fe=p.useCallback(n=>{s(m=>({...m,...n}))},[]),$e=p.useCallback(n=>{u(m=>({...m,...n}))},[]),Ke=p.useCallback(()=>{var n;(n=e.current)==null||n.resetFluid()},[]),Qe=p.useCallback(n=>{if(n.preventDefault(),$.current.rightDragged){$.current.rightDragged=!1;return}const m=Ai({copyCurrentC:et,onReset:()=>{var c;return(c=e.current)==null?void 0:c.resetFluid()},onRecenter:()=>s(c=>({...c,center:[0,0],zoom:1.5})),onToggleOrbit:()=>u(c=>({...c,enabled:!c.enabled})),orbitOn:q.current.enabled,onTogglePaused:()=>s(c=>({...c,paused:!c.paused})),paused:w.current.paused,onApplyPreset:c=>ve(c)});P({x:n.clientX,y:n.clientY,items:m})},[]),Ze=p.useMemo(()=>({handleInteractionStart:()=>{},handleInteractionEnd:()=>{},openContextMenu:(n,m,c)=>{const g=c.filter(M=>!M.isHeader).map(M=>({label:M.label??"",onClick:()=>{var O;(O=M.action)==null||O.call(M)},danger:!!M.danger})).filter(M=>M.label);g.length!==0&&P({x:n,y:m,items:g})}}),[]),et=p.useCallback(async()=>{const[n,m]=w.current.juliaC,c=`${n.toFixed(6)}, ${m.toFixed(6)}`;try{await navigator.clipboard.writeText(c)}catch{}},[]),ve=p.useCallback(n=>{var m;s({...xe,...n.params}),n.gradient&&v(n.gradient),X(n.collisionGradient??Ve),u(n.orbit??Oe),(m=e.current)==null||m.resetFluid()},[]),tt=p.useCallback(()=>{const n=Me(w.current,h,q.current,b),m=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");fi(n,`toy-fluid-${m}.json`)},[h,b]),Ee=p.useCallback(async()=>{const n=r.current;if(!n)return;const m=Me(w.current,h,q.current,b),c=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");try{await mi(n,m,`toy-fluid-${c}.png`)}catch(g){console.error("[toy-fluid] Save PNG failed:",g)}},[h,b]),it=p.useCallback(async()=>{const n=r.current;if(!n)return;const m=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");try{await gi(n,`toy-fluid-${m}.png`)}catch(c){console.error("[toy-fluid] Screenshot failed:",c)}},[]),Se=p.useCallback(async n=>{try{const m=await xi(n);ve({id:"loaded",name:m.name??n.name,desc:`Loaded from ${n.name}`,params:m.params,gradient:m.gradient,collisionGradient:m.collisionGradient,orbit:m.orbit})}catch(m){console.error("[toy-fluid] Load failed:",m),alert(`Couldn't load "${n.name}":
${m.message}`)}},[ve]),me=(n,m)=>n&&m?1:n?Ut:m?Nt:1,rt=n=>{if(!e.current)return;n.target.setPointerCapture(n.pointerId);const c=$.current;if(c.down=!0,c.startX=n.clientX,c.startY=n.clientY,c.lastX=n.clientX,c.lastY=n.clientY,c.lastT=performance.now(),c.rightDragged=!1,n.button===2)c.mode="pan-pending",c.startCenterX=w.current.center[0],c.startCenterY=w.current.center[1];else if(n.button===1){n.preventDefault(),c.mode="zoom",c.startZoom=w.current.zoom;const g=r.current.getBoundingClientRect(),M=(n.clientX-g.left)/g.width,O=1-(n.clientY-g.top)/g.height,D=g.width/g.height,K=w.current.center[0]+(M*2-1)*D*w.current.zoom,R=w.current.center[1]+(O*2-1)*w.current.zoom;c.zoomAnchor=[K,R],c.zoomAnchorUv=[M,O]}else a.current.c?(c.mode="pick-c",c.startCx=w.current.juliaC[0],c.startCy=w.current.juliaC[1]):c.mode="splat"},ot=n=>{const m=e.current;if(!m)return;const c=$.current;if(!c.down)return;a.current.shift=n.shiftKey,a.current.alt=n.altKey;const g=performance.now();if(c.mode==="pick-c"){const L=r.current.getBoundingClientRect(),z=me(a.current.shift,a.current.alt),Z=w.current.zoom,ce=L.width/L.height,ne=n.clientX-c.startX,ue=n.clientY-c.startY,he=ne/L.width*2*ce*Z*z,pe=-(ue/L.height)*2*Z*z;fe({juliaC:[c.startCx+he,c.startCy+pe]}),oe.current=[c.startCx+he,c.startCy+pe],c.lastX=n.clientX,c.lastY=n.clientY,c.lastT=g;return}if(c.mode==="pan-pending"){const L=n.clientX-c.startX,z=n.clientY-c.startY;if(L*L+z*z>Ue*Ue)c.mode="pan",c.rightDragged=!0;else return}if(c.mode==="zoom"){const L=r.current.getBoundingClientRect(),z=me(a.current.shift,a.current.alt),Z=n.clientY-c.startY,ce=Math.exp(Z*It*z),ne=Math.max(Pe,Math.min(Ie,c.startZoom*ce)),ue=L.width/L.height,[he,pe]=c.zoomAnchorUv,st=[c.zoomAnchor[0]-(he*2-1)*ue*ne,c.zoomAnchor[1]-(pe*2-1)*ne];fe({zoom:ne,center:st});return}if(c.mode==="pan"){const L=r.current.getBoundingClientRect(),z=me(a.current.shift,a.current.alt),Z=w.current.zoom,ce=L.width/L.height,ne=n.clientX-c.startX,ue=n.clientY-c.startY,he=-(ne/L.width)*2*ce*Z*z,pe=ue/L.height*2*Z*z;fe({center:[c.startCenterX+he,c.startCenterY+pe]}),c.lastX=n.clientX,c.lastY=n.clientY,c.lastT=g;return}const M=Math.max(1,g-c.lastT)/1e3,O=n.clientX-c.lastX,D=n.clientY-c.lastY;c.lastX=n.clientX,c.lastY=n.clientY,c.lastT=g;const K=r.current.getBoundingClientRect(),[R,te]=m.canvasToUv(n.clientX,n.clientY),ae=me(a.current.shift,a.current.alt),se=O/K.width/M*5*ae,le=-(D/K.height)/M*5*ae,be=Math.min(50,Math.hypot(se,le)),T=g*.001%1,Q=.5+.5*Math.cos(6.28*T),ge=.5+.5*Math.cos(6.28*(T+.33)),ie=.5+.5*Math.cos(6.28*(T+.67));m.splatForce(R,te,se,le,be,[Q,ge,ie])},Ae=n=>{$.current.down=!1;try{n.target.releasePointerCapture(n.pointerId)}catch{}},at=n=>{if(!e.current)return;n.preventDefault();const c=me(n.shiftKey,n.altKey),g=Math.pow(.9,-n.deltaY*Pt*c),M=r.current.getBoundingClientRect(),O=(n.clientX-M.left)/M.width,D=1-(n.clientY-M.top)/M.height,K=M.width/M.height,R=w.current,te=R.center[0]+(O*2-1)*K*R.zoom,ae=R.center[1]+(D*2-1)*R.zoom,se=Math.max(Pe,Math.min(Ie,R.zoom*g)),le=[te-(O*2-1)*K*se,ae-(D*2-1)*se];fe({zoom:se,center:le})};return S?i.jsx("div",{className:"w-full h-full flex items-center justify-center bg-black text-gray-200 p-6",children:i.jsxs("div",{className:"max-w-md",children:[i.jsx("div",{className:"text-lg font-semibold mb-2",children:"This toy needs WebGL2 with float render targets."}),i.jsx("div",{className:"text-xs text-gray-400 whitespace-pre-wrap",children:S})]})}):i.jsx(ft,{value:Ze,children:i.jsxs("div",{className:"w-full h-screen flex flex-col bg-black text-white",children:[i.jsx(Mi,{kind:t.kind,forceMode:t.forceMode,juliaC:t.juliaC,zoom:t.zoom,simResolution:t.simResolution,effectiveSimRes:B,fps:N,orbitOn:l.enabled,paused:t.paused,onSavePng:Ee,onScreenshot:it,onLoadFile:Se,onSubmit:()=>j(!0)}),i.jsxs("div",{className:"flex-1 flex min-h-0",children:[i.jsxs("div",{className:"flex-1 relative",children:[i.jsx("canvas",{ref:r,className:"w-full h-full block",style:{touchAction:"none",cursor:$.current.mode==="pick-c"?"crosshair":$.current.mode==="pan"?"grabbing":$.current.mode==="zoom"?"ns-resize":"default"},onPointerDown:rt,onPointerMove:ot,onPointerUp:Ae,onPointerCancel:Ae,onWheel:at,onContextMenu:Qe}),G&&!A?i.jsxs("div",{className:"absolute bottom-2 left-2 px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[320px]",children:[i.jsxs("div",{className:"flex items-center justify-between mb-1",children:[i.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),i.jsx("button",{onClick:()=>E(!1),className:"text-gray-500 hover:text-gray-200 text-[10px] px-1 leading-none",title:"Hide (press ? to reopen)",children:"×"})]}),i.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[i.jsxs("li",{children:[i.jsx(H,{children:"Drag"})," inject force + dye into the fluid"]}),i.jsxs("li",{children:[i.jsx(H,{children:"C"}),"+",i.jsx(H,{children:"Drag"})," pick Julia c directly on the canvas"]}),i.jsxs("li",{children:[i.jsx(H,{children:"Right-click"}),"+",i.jsx(H,{children:"Drag"})," pan the fractal view"]}),i.jsxs("li",{children:[i.jsx(H,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),i.jsxs("li",{children:[i.jsx(H,{children:"Shift"}),"/",i.jsx(H,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),i.jsxs("li",{children:[i.jsx(H,{children:"Wheel"})," zoom · ",i.jsx(H,{children:"Middle"}),"+",i.jsx(H,{children:"Drag"})," smooth zoom · ",i.jsx(H,{children:"Home"})," recenter"]}),i.jsxs("li",{children:[i.jsx(H,{children:"Space"})," pause sim · ",i.jsx(H,{children:"R"})," clear fluid · ",i.jsx(H,{children:"O"})," toggle c-orbit · ",i.jsx(H,{children:"H"})," hide hints"]})]})]}):!A&&i.jsx("button",{onClick:()=>E(!0),className:"absolute bottom-2 left-2 px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70",title:"Show hotkeys",children:"? hotkeys"})]}),i.jsx("div",{className:"w-[320px] h-full border-l border-white/5 bg-[#0b0b0d] flex flex-col min-h-0",children:i.jsx(di,{params:t,setParams:fe,onReset:Ke,orbit:l,setOrbit:$e,gradient:h,setGradient:v,gradientLut:F,collisionGradient:b,setCollisionGradient:X,onPresetApply:ve,onSaveJson:tt,onSavePng:Ee,onLoadFile:Se,hideHints:A})}),d&&i.jsx(hi,{x:d.x,y:d.y,items:d.items,onDismiss:()=>P(null)}),i.jsx(Ei,{open:k,canvas:r.current,state:k?Me(w.current,h,q.current,b):null,onClose:()=>j(!1)})]})]})})};function Ai(r){return[{label:"Copy c to clipboard",hint:"Re, Im as decimal",onClick:r.copyCurrentC},{label:"Recenter view",hint:"center=(0,0), zoom=1.5",onClick:r.onRecenter},{label:r.paused?"Resume sim":"Pause sim",onClick:r.onTogglePaused},{label:r.orbitOn?"Stop c-orbit":"Start c-orbit",onClick:r.onToggleOrbit},{label:"Clear fluid",hint:"zero velocity + dye",onClick:r.onReset,danger:!0,separatorAbove:!0},...De.map((e,o)=>({label:`Preset: ${e.name}`,hint:e.desc,onClick:()=>r.onApplyPreset(e),separatorAbove:o===0}))]}const H=({children:r})=>i.jsx("kbd",{className:"px-1 py-[1px] rounded bg-white/[0.08] border border-white/15 text-[9px] font-mono text-gray-100",children:r}),qe=document.getElementById("root");if(!qe)throw new Error("Could not find root element to mount to");const ki=pt.createRoot(qe);ki.render(i.jsx(de.StrictMode,{children:i.jsx(Si,{})}));
