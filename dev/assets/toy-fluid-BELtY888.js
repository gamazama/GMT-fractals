var Dt=Object.defineProperty;var Ft=(r,e,o)=>e in r?Dt(r,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):r[e]=o;var w=(r,e,o)=>Ft(r,typeof e!="symbol"?e+"":e,o);import{aC as g,aP as Rt,W as St,E as Et,X as kt,a1 as At,aQ as Ge}from"./GenericDropdown-C27Pe3ni.js";import{r as m,j as t,R as pe}from"./three-fiber-C5DkfiAm.js";import{c as Bt}from"./three-drei-hqOrdlmR.js";import ze from"./AdvancedGradientEditor-CxZIL199.js";import{b as Pt}from"./EmbeddedColorPicker-DDI0bjBs.js";import"./three-DZB2NGqN.js";import"./pako-DwGzBETv.js";const Ut=`
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

/** Chroma-preserving OKLab → linear-RGB. When the requested chroma exceeds
 *  what sRGB can carry at the current L + hue, binary-searches for the
 *  largest chroma scale that keeps all three RGB channels ≥ 0 and the
 *  maximum channel ≤ uMaxRgb. This avoids per-channel clamping (which hue-
 *  shifts and reads as "clipping to white"); instead we sacrifice some
 *  chroma, preserving lightness + hue. HDR-friendly: caller picks uMaxRgb. */
vec3 oklabToRgbGamut(vec3 lab, float maxRgb) {
  vec3 rgb = oklabToRgb(lab);
  float lo = min(min(rgb.r, rgb.g), rgb.b);
  float hi = max(max(rgb.r, rgb.g), rgb.b);
  if (lo >= 0.0 && hi <= maxRgb) return rgb;          // already in gamut
  // Binary-search chroma scale k ∈ [0,1]. At k=0 we collapse to pure grey
  // (lab.x, 0, 0), which is always in the safe cube.
  float lo_k = 0.0, hi_k = 1.0;
  for (int i = 0; i < 8; i++) {
    float mid = (lo_k + hi_k) * 0.5;
    vec3 t = oklabToRgb(vec3(lab.x, lab.yz * mid));
    float tLo = min(min(t.r, t.g), t.b);
    float tHi = max(max(t.r, t.g), t.b);
    if (tLo >= -0.002 && tHi <= maxRgb + 0.002) lo_k = mid;
    else hi_k = mid;
  }
  return max(oklabToRgb(vec3(lab.x, lab.yz * lo_k)), 0.0);
}
`,De=`
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
`,H=`#version 300 es
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
}`,It=`#version 300 es
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
}`,Ot=`#version 300 es
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
${De}

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
}`,Nt=`#version 300 es
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
}`,_t=`#version 300 es
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
${De}
${Ut}

/** Apply this frame's dissipation to existing dye. Lightness and chroma decay
 *  on independent schedules; uDyeSatBoost is a per-frame chroma multiplier so
 *  boost > 1 actively pushes dye toward maximum saturation each frame. The
 *  per-channel clip that used to hue-shift at high boost is now replaced by
 *  oklabToRgbGamut which binary-searches the gamut-boundary chroma scale —
 *  so cranking the boost can only drive colours to the saturation ceiling for
 *  that hue/L, never past it. In "vivid" mode chroma gets an inverse-lightness
 *  lift so colours stay punchy as they dim. */
vec3 decayDye(vec3 c) {
  float decayL = exp(-uDyeFadeHz * uDt);
  if (uDyeDecayMode == 0) return c * decayL;
  vec3 lab = rgbToOklab(c);
  float decayC = exp(-uDyeChromaFadeHz * uDt);
  lab.x *= decayL;
  lab.yz *= decayC * uDyeSatBoost;
  if (uDyeDecayMode == 2) {
    // Vivid: chroma rises as lightness drops, capped by gamut mapper below.
    lab.yz *= clamp(1.0 / max(decayL, 0.01), 1.0, 4.0);
  }
  // Chroma-preserving gamut mapping. HDR-friendly cap at 8.0 — well above
  // tone-map roll-off so bloom still picks up hot spots, while hue stays
  // stable as we approach the boundary.
  return oklabToRgbGamut(lab, 8.0);
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
  } else if (uDyeBlend == 3) {
    // Over (alpha-compositing): uses grad.α + rate to mask the new colour onto old.
    float a = clamp(rate * 8.0, 0.0, 1.0);
    col = aged * (1.0 - a) + grad.rgb * a;
  } else if (uDyeBlend == 4) {
    // Multiply: darkens where dye overlaps. Great for coloured shadows over
    // bright fractals — the fractal peeks through rather than getting painted out.
    vec3 i = clamp(injectAdd, 0.0, 1.0);
    col = aged * mix(vec3(1.0), i, clamp(rate * 8.0, 0.0, 1.0));
  } else if (uDyeBlend == 5) {
    // Difference: |d − i|. Complementary hues reveal sharp boundaries; overlapping
    // identical colours cancel to black. Electric / high-contrast look.
    col = abs(aged - injectAdd);
  } else if (uDyeBlend == 6) {
    // Colour-dodge: d / (1 − i). Hot spots bloom bright where injection hits, great
    // with bloom enabled. Capped at HDR 8.0 so the result stays finite.
    vec3 i = clamp(injectAdd, 0.0, 0.999);
    col = min(vec3(8.0), aged / (1.0 - i));
  } else if (uDyeBlend == 7) {
    // Vivid mix: chroma-preserving additive in OKLab. Aged + inject converted to
    // OKLab, combined (L sums, hue/chroma interpolated in polar by L-weights),
    // gamut-mapped back. Complementary hues stay colourful instead of averaging
    // to grey like plain RGB add does.
    vec3 labA = rgbToOklab(aged);
    vec3 labB = rgbToOklab(injectAdd);
    float Ln = labA.x + labB.x;
    vec3 lab;
    if (Ln < 1e-5) {
      lab = vec3(0.0);
    } else {
      // Weight chroma by lightness so a dim dye doesn't fight a bright one.
      float wA = labA.x / Ln, wB = labB.x / Ln;
      lab = vec3(Ln, labA.y * wA + labB.y * wB, labA.z * wA + labB.z * wB);
      // Slight chroma lift so mixing doesn't reduce saturation overall.
      lab.yz *= 1.2;
    }
    col = oklabToRgbGamut(lab, 8.0);
  } else {
    col = aged + injectAdd;
  }

  // Solid obstacles: no dye inside — they're walls, not flowing medium.
  float solid = texture(uMask, vUv).r;
  col *= (1.0 - solid);

  fragColor = vec4(col, 1.0);
}`,Lt=`#version 300 es
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
}`,Gt=`#version 300 es
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
}`,zt=`#version 300 es
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
}`,Vt=`#version 300 es
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
}`,Ht=`#version 300 es
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
}`,Jt=`#version 300 es
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
}`,Xt=`#version 300 es
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
}`,Yt=`#version 300 es
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
${De}

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
}`,Wt=`#version 300 es
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
${De}
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
}`,$t=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`,Kt=`#version 300 es
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
}`,qt=`#version 300 es
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
}`,Qt=`#version 300 es
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
}`,Zt=`#version 300 es
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
}`,Ve=1e-5,He=8,Je=5,ei=.002,ti=.005,ii=5,ri=.2,Se=300,Xe=192,oi=128,ai=35,ni=58,si=1.5,li=8,ci=1500,je=256,ui=.5,Ye={enabled:!1,radius:.02,speed:.4},di="https://api.gmt-fractals.com/v1/toy-fluid/submissions",hi=30,We=2*1024*1024,$e=[{id:"linear",label:"Linear",hint:"Classic RGB multiply. Fades to black but mixing goes through muddy greys."},{id:"perceptual",label:"Perceptual",hint:"OKLab: decay only the L-channel. Hue + chroma preserved — dye fades hue-stable to black."},{id:"vivid",label:"Vivid",hint:"OKLab with chroma boost as lightness drops. Dye stays punchy all the way to near-black."}];function pi(r){switch(r){case"linear":return 0;case"perceptual":return 1;case"vivid":return 2}}const fi=[{id:"none",label:"None",hint:"No compression. Vivid colours, will clip if exposure is too high."},{id:"reinhard",label:"Reinhard",hint:"Classic c/(1+c). Smooth but desaturates highlights."},{id:"agx",label:"AgX",hint:"Sobotka 2023. Hue-stable, vibrant highlights — best for rich colours."},{id:"filmic",label:"Filmic",hint:"Hable/Uncharted filmic. Cinematic contrast with gentle roll-off."}];function mi(r){switch(r){case"none":return 0;case"reinhard":return 1;case"agx":return 2;case"filmic":return 3}}const gi=[{id:"plain",label:"Plain",hint:"No post-processing — pure fluid+fractal composite."},{id:"electric",label:"Electric",hint:"Bloom + velocity-keyed chromatic aberration — plasma and lightning energy."},{id:"liquid",label:"Liquid",hint:"Dye-gradient refraction + laplacian caustics — water over glass."}],Ke=[{id:"add",label:"Add",hint:"Linear accumulate — bright strokes build up, classic fluid look."},{id:"screen",label:"Screen",hint:"1−(1−d)(1−i) — overlapping dye glows brighter, never clips to full white."},{id:"max",label:"Max",hint:"Per-channel max — keeps the brightest layer, leaves darker alone."},{id:"over",label:"Over",hint:"Alpha compositing — uses the gradient's α to fade / mask dye onto existing."},{id:"multiply",label:"Multiply",hint:"Darkens where dye lands. Fractal peeks through — coloured-shadow look."},{id:"difference",label:"Difference",hint:"|d−i| — complementary hues reveal sharp edges, matching hues cancel to black. High-contrast / electric."},{id:"dodge",label:"Dodge",hint:"d/(1−i) — hot spots bloom white. Pair with bloom for nova highlights."},{id:"vivid-mix",label:"Vivid mix",hint:"OKLab-space add with chroma weighting. Complementary hues stay colourful instead of averaging to grey."}];function xi(r){switch(r){case"add":return 0;case"screen":return 1;case"max":return 2;case"over":return 3;case"multiply":return 4;case"difference":return 5;case"dodge":return 6;case"vivid-mix":return 7}}const qe=[{id:"paint",label:"Paint",hint:"Inject both dye and drag-velocity (the classic mouse behaviour)."},{id:"erase",label:"Erase",hint:"Subtract dye under the cursor. No force — leaves the velocity field alone."},{id:"stamp",label:"Stamp",hint:"Dye only, no force. Hold and move for a pure colour trail that the fluid doesn't push."},{id:"smudge",label:"Smudge",hint:"Force only, no new dye. Drag to push existing colour around without adding any."}],Qe=[{id:"rainbow",label:"Rainbow",hint:"Cycles through the full hue wheel over ~1 s. Playful, good for demos."},{id:"solid",label:"Solid",hint:"One fixed colour. Pick below."},{id:"gradient",label:"Gradient",hint:"Samples the main palette at the cursor's fractal iteration — paint borrows scene colour."},{id:"velocity",label:"Velocity",hint:"Maps drag direction → hue. Fast strokes are vivid, slow strokes dim."}],Ze=[{id:"iterations",label:"Iterations",hint:"Smooth iteration count. Classic escape-time coloring."},{id:"angle",label:"Angle",hint:"arg(z_final). Gradient wraps around the set."},{id:"magnitude",label:"Magnitude",hint:"|z_final|. Brighter at faster escape."},{id:"decomposition",label:"Decomp",hint:"Binary by sign(imag z). Reveals the Julia domains."},{id:"bands",label:"Bands",hint:"Hard bands per integer iter — maximum banding."},{id:"orbit-point",label:"Trap·point",hint:"Orbit trap: min distance from the iteration to a point."},{id:"orbit-circle",label:"Trap·circle",hint:"Orbit trap: min distance to a ring of given radius."},{id:"orbit-cross",label:"Trap·cross",hint:"Orbit trap: min approach to the X/Y axes."},{id:"orbit-line",label:"Trap·line",hint:"Orbit trap: min distance to an arbitrary line."},{id:"stripe",label:"Stripe",hint:"Härkönen stripe-average — ⟨½+½·sin(k·arg z)⟩."},{id:"distance",label:"DE",hint:"Distance-estimate to the set. Crisp boundary glow."},{id:"derivative",label:"Derivative",hint:"log|dz/dc| — how fast orbits stretch around c."},{id:"potential",label:"Potential",hint:"log²|z| / 2ⁿ — continuous Böttcher potential."},{id:"trap-iter",label:"Trap iter",hint:"Iteration at which the trap minimum was reached."}];function Te(r){switch(r){case"iterations":return 0;case"angle":return 1;case"magnitude":return 2;case"decomposition":return 3;case"bands":return 4;case"orbit-point":return 5;case"orbit-circle":return 6;case"orbit-cross":return 7;case"orbit-line":return 8;case"stripe":return 9;case"distance":return 10;case"derivative":return 11;case"potential":return 12;case"trap-iter":return 13}}function vi(r){switch(r){case"orbit-point":return 0;case"orbit-circle":return 1;case"orbit-cross":return 2;case"orbit-line":return 3;case"trap-iter":return 0;default:return 0}}const be={juliaC:[-.36303304426511473,.16845183018751916],center:[-.8139175130270945,-.054649908357858296],zoom:1.2904749020480561,maxIter:310,escapeR:32,power:2,kind:"mandelbrot",forceMode:"gradient",forceGain:-1200,interiorDamp:.59,dt:.016,dissipation:.17,dyeDissipation:1.03,dyeInject:8,vorticity:22.1,pressureIters:50,show:"composite",juliaMix:.4,dyeMix:2,velocityViz:.02,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,trapCenter:[0,0],trapRadius:1,trapNormal:[1,0],trapOffset:0,stripeFreq:4,dyeBlend:"max",dyeDecayMode:"linear",dyeChromaDecayHz:1.03,dyeSaturationBoost:1,vorticityScale:1,toneMapping:"none",exposure:1,vibrance:1.645,fluidStyle:"plain",bloomAmount:0,bloomThreshold:1,aberration:.27,refraction:.037,refractSmooth:3,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!1,collisionPreview:!1,brushSize:.1,brushHardness:0,brushStrength:1,brushFlow:50,brushSpacing:.005,brushMode:"paint",brushColorMode:"rainbow",brushColor:[1,1,1],brushJitter:0,particleEmitter:!1,particleRate:120,particleVelocity:.3,particleSpread:.35,particleGravity:0,particleLifetime:1.2,particleDrag:.6,particleSizeScale:.35,paused:!1,simResolution:1344,autoQuality:!0};class bi{constructor(e){w(this,"gl");w(this,"canvas");w(this,"quadVbo");w(this,"progJulia");w(this,"progMotion");w(this,"progAddForce");w(this,"progInjectDye");w(this,"progAdvect");w(this,"progDivergence");w(this,"progCurl");w(this,"progVorticity");w(this,"progPressure");w(this,"progGradSub");w(this,"progSplat");w(this,"progDisplay");w(this,"progClear");w(this,"progReproject");w(this,"progBloomExtract");w(this,"progBloomDown");w(this,"progBloomUp");w(this,"progMask");w(this,"bloomA");w(this,"bloomB");w(this,"bloomC");w(this,"bloomDirty",!0);w(this,"lastCenter",[0,0]);w(this,"lastZoom",1.5);w(this,"firstFrame",!0);w(this,"simW",0);w(this,"simH",0);w(this,"juliaCur");w(this,"juliaPrev");w(this,"forceTex");w(this,"velocity");w(this,"dye");w(this,"divergence");w(this,"pressure");w(this,"curl");w(this,"maskTex");w(this,"gradientTex",null);w(this,"collisionGradientTex",null);w(this,"params",{...be});w(this,"lastTimeMs",0);w(this,"framebufferFormat");this.canvas=e;const o=e.getContext("webgl2",{antialias:!1,alpha:!1,preserveDrawingBuffer:!0});if(!o)throw new Error("WebGL2 required — your browser does not support it.");this.gl=o;const i=o.getExtension("EXT_color_buffer_float"),n=o.getExtension("EXT_color_buffer_half_float");if(!i&&!n)throw new Error("Neither EXT_color_buffer_float nor EXT_color_buffer_half_float is available.");this.framebufferFormat=this.detectFormat(),this.quadVbo=o.createBuffer(),o.bindBuffer(o.ARRAY_BUFFER,this.quadVbo),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),o.STATIC_DRAW),this.compileAll(),this.allocateTextures(this.params.simResolution)}detectFormat(){const e=this.gl,o=[{internal:e.RGBA16F,format:e.RGBA,type:e.HALF_FLOAT,name:"RGBA16F half_float"},{internal:e.RGBA32F,format:e.RGBA,type:e.FLOAT,name:"RGBA32F float"},{internal:e.RGBA8,format:e.RGBA,type:e.UNSIGNED_BYTE,name:"RGBA8 fallback"}];for(const i of o){const n=e.createTexture();e.bindTexture(e.TEXTURE_2D,n),e.texImage2D(e.TEXTURE_2D,0,i.internal,4,4,0,i.format,i.type,null);const u=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,u),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,n,0);const c=e.checkFramebufferStatus(e.FRAMEBUFFER);if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.deleteFramebuffer(u),e.deleteTexture(n),c===e.FRAMEBUFFER_COMPLETE)return console.info(`[FluidEngine] Using ${i.name} render targets.`),i}throw new Error("No renderable texture format supported (not even RGBA8).")}compileShader(e,o){const i=this.gl,n=i.createShader(e);if(i.shaderSource(n,o),i.compileShader(n),!i.getShaderParameter(n,i.COMPILE_STATUS)){const u=i.getShaderInfoLog(n)||"",c=o.split(`
`).map((d,h)=>`${String(h+1).padStart(4)}: ${d}`).join(`
`);throw console.error(`Shader compile error:
${u}
${c}`),new Error(`Shader compile error: ${u}`)}return n}linkProgram(e,o,i){const n=this.gl,u=this.compileShader(n.VERTEX_SHADER,e),c=this.compileShader(n.FRAGMENT_SHADER,o),d=n.createProgram();if(n.attachShader(d,u),n.attachShader(d,c),n.bindAttribLocation(d,0,"aPos"),n.linkProgram(d),!n.getProgramParameter(d,n.LINK_STATUS))throw new Error(`Program link error: ${n.getProgramInfoLog(d)}`);n.deleteShader(u),n.deleteShader(c);const h={};for(const b of i)h[b]=n.getUniformLocation(d,b);return{prog:d,uniforms:h}}compileAll(){this.progJulia=this.linkProgram(H,It,["uTexel","uKind","uJuliaC","uCenter","uScale","uAspect","uMaxIter","uEscapeR2","uPower","uColorIter","uTrapMode","uTrapCenter","uTrapRadius","uTrapNormal","uTrapOffset","uStripeFreq"]),this.progMotion=this.linkProgram(H,Ot,["uTexel","uJulia","uJuliaPrev","uJuliaAux","uGradient","uMask","uMode","uGain","uDt","uInteriorDamp","uDyeGain","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uForceCap"]),this.progAddForce=this.linkProgram(H,Nt,["uTexel","uVelocity","uForce","uMask","uDt"]),this.progInjectDye=this.linkProgram(H,_t,["uTexel","uDye","uJulia","uJuliaAux","uGradient","uMask","uDyeGain","uDyeFadeHz","uDt","uColorMapping","uGradientRepeat","uGradientPhase","uEdgeMargin","uDyeBlend","uDyeDecayMode","uDyeChromaFadeHz","uDyeSatBoost"]),this.progAdvect=this.linkProgram(H,Lt,["uTexel","uVelocity","uSource","uMask","uDt","uDissipation","uEdgeMargin"]),this.progDivergence=this.linkProgram(H,Gt,["uTexel","uVelocity"]),this.progCurl=this.linkProgram(H,zt,["uTexel","uVelocity"]),this.progVorticity=this.linkProgram(H,Vt,["uTexel","uVelocity","uCurl","uStrength","uScale","uDt"]),this.progPressure=this.linkProgram(H,Ht,["uTexel","uPressure","uDivergence"]),this.progGradSub=this.linkProgram(H,Jt,["uTexel","uPressure","uVelocity","uMask"]),this.progSplat=this.linkProgram(H,Xt,["uTexel","uTarget","uPoint","uValue","uRadius","uDiscR","uHardness","uAspect","uOp"]),this.progDisplay=this.linkProgram(H,Yt,["uTexel","uTexelDisplay","uTexelDye","uJulia","uJuliaAux","uDye","uVelocity","uGradient","uBloom","uMask","uShowMode","uJuliaMix","uDyeMix","uVelocityViz","uColorMapping","uGradientRepeat","uGradientPhase","uInteriorColor","uToneMapping","uExposure","uVibrance","uBloomAmount","uAberration","uRefraction","uRefractSmooth","uCaustics","uCollisionPreview"]),this.progClear=this.linkProgram(H,$t,["uValue"]),this.progReproject=this.linkProgram(H,Zt,["uTexel","uSource","uNewCenter","uOldCenter","uNewZoom","uOldZoom","uAspect"]),this.progBloomExtract=this.linkProgram(H,Kt,["uTexel","uSource","uThreshold","uSoftKnee"]),this.progBloomDown=this.linkProgram(H,qt,["uTexel","uSource"]),this.progBloomUp=this.linkProgram(H,Qt,["uTexel","uSource","uPrev","uIntensity"]),this.progMask=this.linkProgram(H,Wt,["uTexel","uJulia","uJuliaAux","uGradient","uCollisionGradient","uColorMapping","uGradientRepeat","uGradientPhase"])}createFBO(e,o){const i=this.gl,n=i.createTexture();i.bindTexture(i.TEXTURE_2D,n),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.texImage2D(i.TEXTURE_2D,0,this.framebufferFormat.internal,e,o,0,this.framebufferFormat.format,this.framebufferFormat.type,null);const u=i.createFramebuffer();return i.bindFramebuffer(i.FRAMEBUFFER,u),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,n,0),i.viewport(0,0,e,o),i.clearColor(0,0,0,1),i.clear(i.COLOR_BUFFER_BIT),i.bindFramebuffer(i.FRAMEBUFFER,null),{tex:n,fbo:u,width:e,height:o,texel:[1/e,1/o]}}createMrtFbo(e,o){const i=this.gl,n=()=>{const h=i.createTexture();return i.bindTexture(i.TEXTURE_2D,h),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.texImage2D(i.TEXTURE_2D,0,this.framebufferFormat.internal,e,o,0,this.framebufferFormat.format,this.framebufferFormat.type,null),h},u=n(),c=n(),d=i.createFramebuffer();return i.bindFramebuffer(i.FRAMEBUFFER,d),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,u,0),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT1,i.TEXTURE_2D,c,0),i.drawBuffers([i.COLOR_ATTACHMENT0,i.COLOR_ATTACHMENT1]),i.viewport(0,0,e,o),i.clearColor(0,0,0,1),i.clear(i.COLOR_BUFFER_BIT),i.bindFramebuffer(i.FRAMEBUFFER,null),{texMain:u,texAux:c,fbo:d,width:e,height:o,texel:[1/e,1/o]}}deleteMrtFbo(e){if(!e)return;const o=this.gl;o.deleteTexture(e.texMain),o.deleteTexture(e.texAux),o.deleteFramebuffer(e.fbo)}createDoubleFBO(e,o){let i=this.createFBO(e,o),n=this.createFBO(e,o);return{width:e,height:o,texel:[1/e,1/o],get read(){return i},get write(){return n},swap(){const c=i;i=n,n=c}}}deleteFBO(e){if(!e)return;const o=this.gl;o.deleteTexture(e.tex),o.deleteFramebuffer(e.fbo)}deleteDoubleFBO(e){e&&(this.deleteFBO(e.read),this.deleteFBO(e.write))}allocateTextures(e){const o=this.canvas.width/Math.max(1,this.canvas.height),i=Math.max(32,e|0),n=Math.max(32,Math.round(i*o));n===this.simW&&i===this.simH&&this.juliaCur||(this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.simW=n,this.simH=i,this.juliaCur=this.createMrtFbo(n,i),this.juliaPrev=this.createMrtFbo(n,i),this.forceTex=this.createFBO(n,i),this.velocity=this.createDoubleFBO(n,i),this.dye=this.createDoubleFBO(n,i),this.divergence=this.createFBO(n,i),this.pressure=this.createDoubleFBO(n,i),this.curl=this.createFBO(n,i),this.maskTex=this.createFBO(n,i),this.firstFrame=!0)}bindFBO(e){const o=this.gl;o.bindFramebuffer(o.FRAMEBUFFER,e.fbo),o.viewport(0,0,e.width,e.height)}useProgram(e){const o=this.gl;o.useProgram(e.prog),o.bindBuffer(o.ARRAY_BUFFER,this.quadVbo),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0)}drawQuad(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}setTexel(e,o,i){const n=this.gl,u=e.uniforms.uTexel;u&&n.uniform2f(u,1/o,1/i)}bindTex(e,o,i){const n=this.gl;n.activeTexture(n.TEXTURE0+e),n.bindTexture(n.TEXTURE_2D,o),i&&n.uniform1i(i,e)}setParams(e){this.params={...this.params,...e},e.simResolution&&e.simResolution!==this.simH&&this.allocateTextures(e.simResolution)}uploadLut(e,o){const i=this.gl,n=je*4;o.length!==n&&console.warn(`[FluidEngine] ${e} gradient buffer unexpected length ${o.length} (want ${n})`);let u=e==="main"?this.gradientTex:this.collisionGradientTex;u||(u=i.createTexture(),e==="main"?this.gradientTex=u:this.collisionGradientTex=u),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,u),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,je,1,0,i.RGBA,i.UNSIGNED_BYTE,o)}setGradientBuffer(e){this.uploadLut("main",e)}setCollisionGradientBuffer(e){this.uploadLut("collision",e)}ensureGradient(){if(this.gradientTex)return;const e=je,o=new Uint8Array(e*4);for(let i=0;i<e;++i)o[i*4+0]=i,o[i*4+1]=i,o[i*4+2]=i,o[i*4+3]=255;this.setGradientBuffer(o)}ensureCollisionGradient(){if(this.collisionGradientTex)return;const e=je,o=new Uint8Array(e*4);for(let i=0;i<e;++i)o[i*4+0]=0,o[i*4+1]=0,o[i*4+2]=0,o[i*4+3]=255;this.setCollisionGradientBuffer(o)}resize(e,o){const i=Math.min(window.devicePixelRatio||1,2),n=Math.max(1,Math.round(e*i)),u=Math.max(1,Math.round(o*i));(this.canvas.width!==n||this.canvas.height!==u)&&(this.canvas.width=n,this.canvas.height=u,this.allocateTextures(this.params.simResolution),this.bloomDirty=!0)}ensureBloomFbos(){if(!this.bloomDirty&&this.bloomA)return;this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC);const e=this.canvas.width,o=this.canvas.height,i=Math.max(4,e>>1&-2),n=Math.max(4,o>>1&-2),u=Math.max(2,e>>2&-2),c=Math.max(2,o>>2&-2),d=Math.max(2,e>>3&-2),h=Math.max(2,o>>3&-2);this.bloomA=this.createFBO(i,n),this.bloomB=this.createFBO(u,c),this.bloomC=this.createFBO(d,h),this.bloomDirty=!1}markFirstFrame(){this.firstFrame=!0}resetFluid(){const e=this.gl;for(const o of[this.velocity,this.dye,this.pressure])for(const i of[o.read,o.write])this.bindFBO(i),this.useProgram(this.progClear),e.uniform4f(this.progClear.uniforms.uValue,0,0,0,1),this.drawQuad();e.bindFramebuffer(e.FRAMEBUFFER,null),this.markFirstFrame()}splat(e,o,i,n,u,c,d){const h=this.gl;this.bindFBO(e.write),this.useProgram(this.progSplat),this.bindTex(0,e.read.tex,this.progSplat.uniforms.uTarget),h.uniform2f(this.progSplat.uniforms.uPoint,o,i),h.uniform3f(this.progSplat.uniforms.uValue,n[0],n[1],n[2]),h.uniform1f(this.progSplat.uniforms.uRadius,Math.max(1e-6,u*.5*(u*.5))),h.uniform1f(this.progSplat.uniforms.uDiscR,Math.max(1e-6,u)),h.uniform1f(this.progSplat.uniforms.uHardness,c),h.uniform1f(this.progSplat.uniforms.uAspect,this.simW/this.simH),h.uniform1f(this.progSplat.uniforms.uOp,d==="sub"?1:0),this.drawQuad(),e.swap()}brush(e,o,i,n,u,c,d,h,b){e=Math.max(0,Math.min(1,e)),o=Math.max(0,Math.min(1,o));const z=[u[0]*h,u[1]*h,u[2]*h],P=[i,n,0];switch(b){case"paint":this.splat(this.velocity,e,o,P,c,d,"add"),this.splat(this.dye,e,o,z,c,d,"add");break;case"erase":this.splat(this.dye,e,o,[h,h,h],c,d,"sub");break;case"stamp":this.splat(this.dye,e,o,z,c,d,"add");break;case"smudge":this.splat(this.velocity,e,o,P,c,d,"add");break}this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}renderJulia(){const e=this.gl,o=this.juliaCur;this.juliaCur=this.juliaPrev,this.juliaPrev=o,e.bindFramebuffer(e.FRAMEBUFFER,this.juliaCur.fbo),e.viewport(0,0,this.juliaCur.width,this.juliaCur.height),this.useProgram(this.progJulia),this.setTexel(this.progJulia,this.simW,this.simH),e.uniform1i(this.progJulia.uniforms.uKind,this.params.kind==="julia"?0:1),e.uniform2f(this.progJulia.uniforms.uJuliaC,this.params.juliaC[0],this.params.juliaC[1]),e.uniform2f(this.progJulia.uniforms.uCenter,this.params.center[0],this.params.center[1]),e.uniform1f(this.progJulia.uniforms.uScale,this.params.zoom),e.uniform1f(this.progJulia.uniforms.uAspect,this.simW/this.simH);const i=Math.max(4,this.params.maxIter|0);e.uniform1i(this.progJulia.uniforms.uMaxIter,i),e.uniform1i(this.progJulia.uniforms.uColorIter,Math.max(1,Math.min(i,this.params.colorIter|0))),e.uniform1f(this.progJulia.uniforms.uEscapeR2,this.params.escapeR*this.params.escapeR),e.uniform1f(this.progJulia.uniforms.uPower,this.params.power),e.uniform1i(this.progJulia.uniforms.uTrapMode,vi(this.params.colorMapping)),e.uniform2f(this.progJulia.uniforms.uTrapCenter,this.params.trapCenter[0],this.params.trapCenter[1]),e.uniform1f(this.progJulia.uniforms.uTrapRadius,this.params.trapRadius),e.uniform2f(this.progJulia.uniforms.uTrapNormal,this.params.trapNormal[0],this.params.trapNormal[1]),e.uniform1f(this.progJulia.uniforms.uTrapOffset,this.params.trapOffset),e.uniform1f(this.progJulia.uniforms.uStripeFreq,this.params.stripeFreq),this.drawQuad()}computeMask(){const e=this.gl;if(this.ensureGradient(),this.ensureCollisionGradient(),this.bindFBO(this.maskTex),!this.params.collisionEnabled){e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);return}this.useProgram(this.progMask),this.setTexel(this.progMask,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMask.uniforms.uJulia),this.bindTex(1,this.juliaCur.texAux,this.progMask.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMask.uniforms.uGradient),this.bindTex(3,this.collisionGradientTex,this.progMask.uniforms.uCollisionGradient),e.uniform1i(this.progMask.uniforms.uColorMapping,Te(this.params.colorMapping)),e.uniform1f(this.progMask.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMask.uniforms.uGradientPhase,this.params.gradientPhase),this.drawQuad()}computeForce(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.forceTex),this.useProgram(this.progMotion),this.setTexel(this.progMotion,this.simW,this.simH),this.bindTex(0,this.juliaCur.texMain,this.progMotion.uniforms.uJulia),this.bindTex(1,this.juliaPrev.texMain,this.progMotion.uniforms.uJuliaPrev),this.bindTex(4,this.juliaCur.texAux,this.progMotion.uniforms.uJuliaAux),this.bindTex(2,this.gradientTex,this.progMotion.uniforms.uGradient),this.bindTex(5,this.maskTex.tex,this.progMotion.uniforms.uMask),e.uniform1i(this.progMotion.uniforms.uMode,yi(this.params.forceMode)),e.uniform1f(this.progMotion.uniforms.uGain,this.params.forceGain),e.uniform1f(this.progMotion.uniforms.uDt,this.params.dt),e.uniform1f(this.progMotion.uniforms.uInteriorDamp,this.params.interiorDamp),e.uniform1f(this.progMotion.uniforms.uDyeGain,this.params.dyeInject),e.uniform1i(this.progMotion.uniforms.uColorMapping,Te(this.params.colorMapping)),e.uniform1f(this.progMotion.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progMotion.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progMotion.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1f(this.progMotion.uniforms.uForceCap,this.params.forceCap),this.drawQuad()}addForceToVelocity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progAddForce),this.setTexel(this.progAddForce,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAddForce.uniforms.uVelocity),this.bindTex(1,this.forceTex.tex,this.progAddForce.uniforms.uForce),this.bindTex(2,this.maskTex.tex,this.progAddForce.uniforms.uMask),e.uniform1f(this.progAddForce.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}injectDye(){const e=this.gl;this.ensureGradient(),this.bindFBO(this.dye.write),this.useProgram(this.progInjectDye),this.setTexel(this.progInjectDye,this.simW,this.simH),this.bindTex(0,this.dye.read.tex,this.progInjectDye.uniforms.uDye),this.bindTex(1,this.juliaCur.texMain,this.progInjectDye.uniforms.uJulia),this.bindTex(2,this.gradientTex,this.progInjectDye.uniforms.uGradient),this.bindTex(4,this.juliaCur.texAux,this.progInjectDye.uniforms.uJuliaAux),this.bindTex(5,this.maskTex.tex,this.progInjectDye.uniforms.uMask),e.uniform1f(this.progInjectDye.uniforms.uDyeGain,this.params.dyeInject),e.uniform1f(this.progInjectDye.uniforms.uDyeFadeHz,this.params.dyeDissipation),e.uniform1f(this.progInjectDye.uniforms.uDt,this.params.dt),e.uniform1i(this.progInjectDye.uniforms.uColorMapping,Te(this.params.colorMapping)),e.uniform1f(this.progInjectDye.uniforms.uGradientRepeat,this.params.gradientRepeat),e.uniform1f(this.progInjectDye.uniforms.uGradientPhase,this.params.gradientPhase),e.uniform1f(this.progInjectDye.uniforms.uEdgeMargin,this.params.edgeMargin),e.uniform1i(this.progInjectDye.uniforms.uDyeBlend,xi(this.params.dyeBlend)),e.uniform1i(this.progInjectDye.uniforms.uDyeDecayMode,pi(this.params.dyeDecayMode)),e.uniform1f(this.progInjectDye.uniforms.uDyeChromaFadeHz,this.params.dyeChromaDecayHz),e.uniform1f(this.progInjectDye.uniforms.uDyeSatBoost,this.params.dyeSaturationBoost),this.drawQuad(),this.dye.swap()}computeCurl(){this.bindFBO(this.curl),this.useProgram(this.progCurl),this.setTexel(this.progCurl,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progCurl.uniforms.uVelocity),this.drawQuad()}applyVorticity(){const e=this.gl;this.bindFBO(this.velocity.write),this.useProgram(this.progVorticity),this.setTexel(this.progVorticity,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progVorticity.uniforms.uVelocity),this.bindTex(1,this.curl.tex,this.progVorticity.uniforms.uCurl),e.uniform1f(this.progVorticity.uniforms.uStrength,this.params.vorticity),e.uniform1f(this.progVorticity.uniforms.uScale,this.params.vorticityScale),e.uniform1f(this.progVorticity.uniforms.uDt,this.params.dt),this.drawQuad(),this.velocity.swap()}computeDivergence(){this.bindFBO(this.divergence),this.useProgram(this.progDivergence),this.setTexel(this.progDivergence,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progDivergence.uniforms.uVelocity),this.drawQuad()}solvePressure(){const e=this.gl;this.bindFBO(this.pressure.read),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT);for(let o=0;o<this.params.pressureIters;++o)this.bindFBO(this.pressure.write),this.useProgram(this.progPressure),this.setTexel(this.progPressure,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progPressure.uniforms.uPressure),this.bindTex(1,this.divergence.tex,this.progPressure.uniforms.uDivergence),this.drawQuad(),this.pressure.swap()}subtractPressureGradient(){this.bindFBO(this.velocity.write),this.useProgram(this.progGradSub),this.setTexel(this.progGradSub,this.simW,this.simH),this.bindTex(0,this.pressure.read.tex,this.progGradSub.uniforms.uPressure),this.bindTex(1,this.velocity.read.tex,this.progGradSub.uniforms.uVelocity),this.bindTex(2,this.maskTex.tex,this.progGradSub.uniforms.uMask),this.drawQuad(),this.velocity.swap()}advect(e,o){const i=this.gl;this.bindFBO(e.write),this.useProgram(this.progAdvect),this.setTexel(this.progAdvect,this.simW,this.simH),this.bindTex(0,this.velocity.read.tex,this.progAdvect.uniforms.uVelocity),this.bindTex(1,e.read.tex,this.progAdvect.uniforms.uSource),this.bindTex(2,this.maskTex.tex,this.progAdvect.uniforms.uMask),i.uniform1f(this.progAdvect.uniforms.uDt,this.params.dt),i.uniform1f(this.progAdvect.uniforms.uDissipation,o),i.uniform1f(this.progAdvect.uniforms.uEdgeMargin,this.params.edgeMargin),this.drawQuad(),e.swap()}reprojectTexture(e,o,i){const n=this.gl;this.bindFBO(e.write),this.useProgram(this.progReproject),this.setTexel(this.progReproject,this.simW,this.simH),this.bindTex(0,e.read.tex,this.progReproject.uniforms.uSource),n.uniform2f(this.progReproject.uniforms.uNewCenter,this.params.center[0],this.params.center[1]),n.uniform2f(this.progReproject.uniforms.uOldCenter,o[0],o[1]),n.uniform1f(this.progReproject.uniforms.uNewZoom,this.params.zoom),n.uniform1f(this.progReproject.uniforms.uOldZoom,i),n.uniform1f(this.progReproject.uniforms.uAspect,this.simW/this.simH),this.drawQuad(),e.swap()}maybeReprojectForCamera(){if(this.firstFrame){this.firstFrame=!1,this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom;return}const e=this.params.center[0]-this.lastCenter[0],o=this.params.center[1]-this.lastCenter[1],i=this.params.zoom-this.lastZoom;if(Math.abs(e)<1e-7&&Math.abs(o)<1e-7&&Math.abs(i)<1e-7)return;const n=[this.lastCenter[0],this.lastCenter[1]],u=this.lastZoom;this.reprojectTexture(this.dye,n,u),this.reprojectTexture(this.velocity,n,u),this.lastCenter=[this.params.center[0],this.params.center[1]],this.lastZoom=this.params.zoom}displayToScreen(){const e=this.gl;this.ensureGradient();const o=this.params.bloomAmount>.001;o&&(this.ensureBloomFbos(),this.bindFBO(this.bloomA),this.setDisplayUniforms(null,!0),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomExtract),e.uniform2f(this.progBloomExtract.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomA.tex,this.progBloomExtract.uniforms.uSource),e.uniform1f(this.progBloomExtract.uniforms.uThreshold,this.params.bloomThreshold),e.uniform1f(this.progBloomExtract.uniforms.uSoftKnee,ui),this.drawQuad(),this.bindFBO(this.bloomC),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomA),this.useProgram(this.progBloomDown),e.uniform2f(this.progBloomDown.uniforms.uTexel,this.bloomB.texel[0],this.bloomB.texel[1]),this.bindTex(0,this.bloomB.tex,this.progBloomDown.uniforms.uSource),this.drawQuad(),this.bindFBO(this.bloomB),this.useProgram(this.progBloomUp),e.uniform2f(this.progBloomUp.uniforms.uTexel,this.bloomC.texel[0],this.bloomC.texel[1]),this.bindTex(0,this.bloomC.tex,this.progBloomUp.uniforms.uSource),this.bindTex(1,this.bloomA.tex,this.progBloomUp.uniforms.uPrev),e.uniform1f(this.progBloomUp.uniforms.uIntensity,1),this.drawQuad()),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.setDisplayUniforms(o?this.bloomB:null,!1),this.drawQuad()}setDisplayUniforms(e,o=!1){const i=this.gl;this.useProgram(this.progDisplay),i.uniform2f(this.progDisplay.uniforms.uTexelDisplay,1/this.canvas.width,1/this.canvas.height),i.uniform2f(this.progDisplay.uniforms.uTexelDye,1/this.simW,1/this.simH),this.bindTex(0,this.juliaCur.texMain,this.progDisplay.uniforms.uJulia),this.bindTex(4,this.juliaCur.texAux,this.progDisplay.uniforms.uJuliaAux),this.bindTex(1,this.dye.read.tex,this.progDisplay.uniforms.uDye),this.bindTex(2,this.velocity.read.tex,this.progDisplay.uniforms.uVelocity),this.bindTex(3,this.gradientTex,this.progDisplay.uniforms.uGradient),this.bindTex(5,(e==null?void 0:e.tex)??this.gradientTex,this.progDisplay.uniforms.uBloom),this.bindTex(6,this.maskTex.tex,this.progDisplay.uniforms.uMask),i.uniform1i(this.progDisplay.uniforms.uShowMode,wi(this.params.show)),i.uniform1f(this.progDisplay.uniforms.uJuliaMix,this.params.juliaMix),i.uniform1f(this.progDisplay.uniforms.uDyeMix,this.params.dyeMix),i.uniform1f(this.progDisplay.uniforms.uVelocityViz,this.params.velocityViz),i.uniform1i(this.progDisplay.uniforms.uColorMapping,Te(this.params.colorMapping)),i.uniform1f(this.progDisplay.uniforms.uGradientRepeat,this.params.gradientRepeat),i.uniform1f(this.progDisplay.uniforms.uGradientPhase,this.params.gradientPhase),i.uniform3f(this.progDisplay.uniforms.uInteriorColor,this.params.interiorColor[0],this.params.interiorColor[1],this.params.interiorColor[2]),o?(i.uniform1i(this.progDisplay.uniforms.uToneMapping,0),i.uniform1f(this.progDisplay.uniforms.uExposure,1),i.uniform1f(this.progDisplay.uniforms.uVibrance,0),i.uniform1f(this.progDisplay.uniforms.uBloomAmount,0),i.uniform1f(this.progDisplay.uniforms.uAberration,0),i.uniform1f(this.progDisplay.uniforms.uRefraction,0),i.uniform1f(this.progDisplay.uniforms.uRefractSmooth,1),i.uniform1f(this.progDisplay.uniforms.uCaustics,0),i.uniform1i(this.progDisplay.uniforms.uCollisionPreview,0)):(i.uniform1i(this.progDisplay.uniforms.uToneMapping,mi(this.params.toneMapping)),i.uniform1f(this.progDisplay.uniforms.uExposure,this.params.exposure),i.uniform1f(this.progDisplay.uniforms.uVibrance,this.params.vibrance),i.uniform1f(this.progDisplay.uniforms.uBloomAmount,e?this.params.bloomAmount:0),i.uniform1f(this.progDisplay.uniforms.uAberration,this.params.aberration),i.uniform1f(this.progDisplay.uniforms.uRefraction,this.params.refraction),i.uniform1f(this.progDisplay.uniforms.uRefractSmooth,this.params.refractSmooth),i.uniform1f(this.progDisplay.uniforms.uCaustics,this.params.caustics),i.uniform1i(this.progDisplay.uniforms.uCollisionPreview,this.params.collisionPreview?1:0))}frame(e){const o=this.gl,i=this.lastTimeMs===0?.016:Math.min(.05,(e-this.lastTimeMs)/1e3);this.lastTimeMs=e,this.params.dt=i,this.renderJulia(),this.computeMask(),this.params.paused||(this.maybeReprojectForCamera(),this.computeForce(),this.addForceToVelocity(),this.params.vorticity>0&&(this.computeCurl(),this.applyVorticity()),this.computeDivergence(),this.solvePressure(),this.subtractPressureGradient(),this.advect(this.velocity,this.params.dissipation),this.injectDye(),this.advect(this.dye,this.params.dyeDissipation)),this.displayToScreen(),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,null)}dispose(){const e=this.gl;this.deleteMrtFbo(this.juliaCur),this.deleteMrtFbo(this.juliaPrev),this.deleteFBO(this.forceTex),this.deleteDoubleFBO(this.velocity),this.deleteDoubleFBO(this.dye),this.deleteFBO(this.divergence),this.deleteDoubleFBO(this.pressure),this.deleteFBO(this.curl),this.deleteFBO(this.maskTex),this.gradientTex&&(e.deleteTexture(this.gradientTex),this.gradientTex=null),this.collisionGradientTex&&(e.deleteTexture(this.collisionGradientTex),this.collisionGradientTex=null),this.deleteFBO(this.bloomA),this.deleteFBO(this.bloomB),this.deleteFBO(this.bloomC),e.deleteBuffer(this.quadVbo);for(const o of[this.progJulia,this.progMotion,this.progAddForce,this.progInjectDye,this.progAdvect,this.progDivergence,this.progCurl,this.progVorticity,this.progPressure,this.progGradSub,this.progSplat,this.progDisplay,this.progClear,this.progReproject,this.progMask,this.progBloomExtract,this.progBloomDown,this.progBloomUp])o!=null&&o.prog&&e.deleteProgram(o.prog)}canvasToFractal(e,o){const i=this.canvas.getBoundingClientRect(),n=(e-i.left)/i.width,u=1-(o-i.top)/i.height,c=this.canvas.width/this.canvas.height,d=(n*2-1)*c*this.params.zoom+this.params.center[0],h=(u*2-1)*this.params.zoom+this.params.center[1];return[d,h]}canvasToUv(e,o){const i=this.canvas.getBoundingClientRect();return[(e-i.left)/i.width,1-(o-i.top)/i.height]}}function yi(r){switch(r){case"gradient":return 0;case"curl":return 1;case"iterate":return 2;case"c-track":return 3;case"hue":return 4}}function wi(r){switch(r){case"composite":return 0;case"julia":return 1;case"dye":return 2;case"velocity":return 3}}const et=96;function Ci(r,e){const i=(e-Math.floor(e))*256,n=Math.floor(i)%256,u=(n+1)%256,c=i-Math.floor(i),d=r[n*4+0]*(1-c)+r[u*4+0]*c,h=r[n*4+1]*(1-c)+r[u*4+1]*c,b=r[n*4+2]*(1-c)+r[u*4+2]*c;return[d,h,b]}function ji(r,e,o,i){switch(i){case"angle":return Math.atan2(o,e)*.15915494+.5;case"magnitude":return Math.max(0,Math.min(1,Math.hypot(e,o)*.08));case"decomposition":return(o>=0?.5:0)+.25;case"bands":return Math.floor(r)*.0625;case"potential":{const n=Math.max(e*e+o*o,1.0001);return Math.log2(Math.log2(n))*.5%1}case"orbit-point":case"orbit-circle":case"orbit-cross":case"orbit-line":case"stripe":case"distance":case"derivative":case"trap-iter":case"iterations":default:return r*.05}}function Ti(r,e,o,i,n,u,c,d,h,b){const z=new ImageData(r,r),P=z.data,W=Math.round(h[0]*255),V=Math.round(h[1]*255),$=Math.round(h[2]*255),X=Math.round(b),I=Math.abs(b-X)<.01&&X>=2&&X<=8;for(let O=0;O<r;O++){const E=o+(O/r*2-1)*i;for(let C=0;C<r;C++){const D=e+(C/r*2-1)*i;let k=0,A=0,U=0;for(;U<et;U++){const j=k*k,ee=A*A;if(j+ee>16)break;let R,oe;if(I){let a=k,_=A;for(let G=1;G<X;G++){const Q=a*k-_*A;_=a*A+_*k,a=Q}R=a,oe=_}else{const a=Math.sqrt(j+ee),_=Math.atan2(A,k),G=Math.pow(a,b),Q=_*b;R=G*Math.cos(Q),oe=G*Math.sin(Q)}k=R+D,A=oe+E}const K=((r-1-O)*r+C)*4;if(U>=et)P[K+0]=W,P[K+1]=V,P[K+2]=$;else{const j=U+1-Math.log2(Math.max(1e-6,.5*Math.log2(k*k+A*A))),R=ji(j,k,A,d)*u+c,[oe,a,_]=Ci(n,R);P[K+0]=Math.round(oe),P[K+1]=Math.round(a),P[K+2]=Math.round(_)}P[K+3]=255}}return z}const Mi=(()=>{const r=new Uint8Array(1024);for(let e=0;e<256;e++)r[e*4]=r[e*4+1]=r[e*4+2]=e,r[e*4+3]=255;return r})(),Di=({cx:r,cy:e,onChange:o,halfExtent:i=1.6,centerX:n=-.5,centerY:u=0,size:c=220,gradientLut:d,gradientRepeat:h=1,gradientPhase:b=0,colorMapping:z="iterations",interiorColor:P=[.04,.04,.06],power:W=2})=>{const V=m.useRef(null),$=m.useRef(null),X=m.useRef(!1);m.useEffect(()=>{const E=V.current;if(!E)return;const C=E.getContext("2d");if(!C)return;E.width=c,E.height=c;const k=Ti(c,n,u,i,d??Mi,h,b,z,P,W);$.current=k,C.putImageData(k,0,0),I()},[c,n,u,i,d,h,b,z,P[0],P[1],P[2],W]);const I=m.useCallback(()=>{const E=V.current;if(!E||!$.current)return;const C=E.getContext("2d");if(!C)return;C.putImageData($.current,0,0);const D=(r-n)/i*.5+.5,k=(e-u)/i*.5+.5,A=D*c,U=(1-k)*c;C.strokeStyle="#fff",C.lineWidth=1,C.beginPath(),C.moveTo(A-8,U),C.lineTo(A-2,U),C.moveTo(A+2,U),C.lineTo(A+8,U),C.moveTo(A,U-8),C.lineTo(A,U-2),C.moveTo(A,U+2),C.lineTo(A,U+8),C.stroke(),C.strokeStyle="rgba(0,255,200,0.9)",C.beginPath(),C.arc(A,U,4,0,2*Math.PI),C.stroke()},[r,e,n,u,i,c]);m.useEffect(()=>{I()},[I]);const O=E=>{const C=V.current;if(!C)return;const D=C.getBoundingClientRect(),k=(E.clientX-D.left)/D.width,A=1-(E.clientY-D.top)/D.height,U=n+(k*2-1)*i,K=u+(A*2-1)*i;o(U,K)};return t.jsxs("div",{className:"flex flex-col gap-1",children:[t.jsx("div",{className:"text-[10px] text-gray-400 uppercase tracking-wide",children:"Pick Julia c"}),t.jsx("canvas",{ref:V,className:"rounded border border-white/10 cursor-crosshair",style:{width:c,height:c,imageRendering:"pixelated"},onPointerDown:E=>{X.current=!0,E.target.setPointerCapture(E.pointerId),O(E)},onPointerMove:E=>{X.current&&O(E)},onPointerUp:E=>{X.current=!1;try{E.target.releasePointerCapture(E.pointerId)}catch{}}}),t.jsxs("div",{className:"text-[10px] font-mono text-gray-500",children:["c = (",r.toFixed(4),", ",e.toFixed(4),")"]})]})},de=r=>r.map(([e,o],i)=>({id:`s${i}`,position:e,color:o,bias:.5,interpolation:"linear"})),ke=[{id:"coral-gyre",name:"Coral Gyre",desc:"Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.",params:{juliaC:[-.8173594132029339,.15279058679706603],center:[0,0],zoom:1.5,maxIter:182,power:2,kind:"julia",forceMode:"curl",forceGain:-760,interiorDamp:.9,dissipation:.1,dyeDissipation:.63,dyeInject:2.28,vorticity:25.9,vorticityScale:4.2,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:1,velocityViz:0,gradientRepeat:.56,gradientPhase:.09,colorMapping:"orbit-point",colorIter:96,trapCenter:[1.17,0],dyeBlend:"add",dyeDecayMode:"vivid",dyeSaturationBoost:1.01,toneMapping:"filmic",exposure:2.295,vibrance:1.87,bloomAmount:1.35,bloomThreshold:1,aberration:1.12,refraction:0,refractSmooth:1,caustics:3.9,interiorColor:[.02,.04,.08],edgeMargin:.04,forceCap:12,collisionEnabled:!0,simResolution:768},gradient:{stops:de([[0,"#000000"],[.202,"#05233d"],[.362,"#0f6884"],[.521,"#56c6c0"],[.681,"#f0fff1"],[.84,"#e7bd69"],[1,"#8a3f19"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.513,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.573,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"ink-canyon",name:"Ink Canyon",desc:"Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.",params:{juliaC:[-.7763636363636364,.19684858842329547],center:[.019054061889010376,-.007321977964897804],zoom:1.2904749020480561,maxIter:310,power:2,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:1,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:0,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0,simResolution:1024},gradient:{stops:de([[0,"#000000"],[1,"#FFFFFF"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.02,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.07,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:.833,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c4",position:.883,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"plasma-vein",name:"Plasma Vein",desc:"Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.",params:{juliaC:[-.1764262149580809,.1951288073545453],center:[.21016359187729639,-.014585098813268887],zoom:.975889617512663,maxIter:310,power:1.5,kind:"julia",forceMode:"curl",forceGain:1200,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:5.9,pressureIters:50,show:"dye",juliaMix:.7,dyeMix:1,velocityViz:0,gradientRepeat:7.43,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",dyeDecayMode:"vivid",toneMapping:"filmic",exposure:1.86,vibrance:1.645,aberration:.5,refraction:.006,refractSmooth:11.8,caustics:0,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,simResolution:1344},gradient:{stops:de([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.536,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.586,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"}},{id:"crater-drift",name:"Crater Drift",desc:"Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.",params:{juliaC:[.56053050672182,.468459152016546],center:[-.9313160617349564,-.15288948147190096],zoom:1.1807159194396142,maxIter:604,power:2,kind:"mandelbrot",forceMode:"curl",forceGain:-535.6,interiorDamp:0,dissipation:.16,dyeDissipation:.05,dyeInject:3,vorticity:2.9,vorticityScale:1.2,pressureIters:48,show:"composite",juliaMix:0,dyeMix:1.01,velocityViz:0,gradientRepeat:.66,gradientPhase:0,colorMapping:"iterations",colorIter:263,trapCenter:[1.51,-1.37],dyeBlend:"max",dyeDecayMode:"perceptual",dyeChromaDecayHz:0,toneMapping:"filmic",exposure:20.63,vibrance:1.645,bloomAmount:.63,bloomThreshold:.76,aberration:.4,refraction:0,caustics:0,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:38.5,collisionEnabled:!0,simResolution:768},gradient:{stops:de([[.084,"#000004"],[.215,"#280B54"],[.346,"#65156E"],[.477,"#9F2A63"],[.607,"#D44842"],[.738,"#F52D15"],[.869,"#FA2727"],[1,"#FF7983"]]),colorSpace:"srgb",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.532,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.659,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.05}},{id:"quartic-strata",name:"Quartic Strata",desc:"Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.",params:{juliaC:[.7072727272727275,-.1398788174715911],center:[-.0013928986324417691,-.010035496866822907],zoom:.975889617512663,maxIter:310,power:4,kind:"julia",forceMode:"c-track",forceGain:1,interiorDamp:.59,dissipation:.05,dyeDissipation:1.95,dyeInject:8,vorticity:1,pressureIters:50,show:"dye",juliaMix:.45,dyeMix:1,velocityViz:0,gradientRepeat:2,gradientPhase:0,colorMapping:"iterations",colorIter:310,dyeBlend:"add",aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,.02,.04],edgeMargin:.04,forceCap:40,collisionEnabled:!0,simResolution:1344},gradient:{stops:de([[0,"#000000"],[.143,"#001830"],[.286,"#004060"],[.429,"#00BFFF"],[.571,"#006080"],[.714,"#600000"],[.857,"#DC0000"],[1,"#FF4040"]]),colorSpace:"linear",blendSpace:"rgb"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.113,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.163,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.01,speed:.2}},{id:"sunset-bands",name:"Sunset Bands",desc:"Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.",params:{juliaC:[-.16545454545454558,.6455757279829545],center:[-.1012543995130697,.03079433116134145],zoom:1.086757425434934,maxIter:175,power:2,kind:"julia",forceMode:"gradient",forceGain:1500,interiorDamp:5.8,dissipation:.22,dyeDissipation:.5,dyeInject:.55,vorticity:0,pressureIters:30,show:"composite",juliaMix:.55,dyeMix:2,velocityViz:0,gradientRepeat:1.35,gradientPhase:.055,colorMapping:"bands",colorIter:175,dyeBlend:"over",aberration:.27,refraction:0,caustics:1,interiorColor:[.02,.02,.03],edgeMargin:.04,forceCap:12,simResolution:1536},gradient:{stops:de([[0,"#04001f"],[.167,"#1a1049"],[.333,"#4e2085"],[.5,"#b13a8a"],[.667,"#ff7657"],[.833,"#ffc569"],[1,"#fff9d0"]]),colorSpace:"linear",blendSpace:"oklab"}},{id:"verdant-pulse",name:"Verdant Pulse",desc:"Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.",params:{juliaC:[-.7,.27015],center:[-.15958346356258324,-.09244114001481094],zoom:1.3957783246444389,maxIter:160,power:2,kind:"julia",forceMode:"c-track",forceGain:10,interiorDamp:.45,dissipation:.2,dyeDissipation:.17,dyeInject:.9,vorticity:16,vorticityScale:5.8,pressureIters:30,show:"composite",juliaMix:0,dyeMix:3.805,velocityViz:0,gradientRepeat:1,gradientPhase:.03,colorMapping:"orbit-circle",colorIter:94,dyeBlend:"over",dyeDecayMode:"perceptual",exposure:.35,vibrance:1.645,aberration:.27,refraction:.037,caustics:1,interiorColor:[.02,0,.04],edgeMargin:.04,forceCap:12,collisionEnabled:!0,simResolution:768},gradient:{stops:de([[0,"#000000"],[.061,"#440154"],[.143,"#46327F"],[.286,"#365C8D"],[.429,"#277F8E"],[.571,"#1FA187"],[.714,"#4AC26D"],[.857,"#3ADA62"],[1,"#FD25B6"]]),colorSpace:"linear",blendSpace:"oklab"},collisionGradient:{stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.037,color:"#000000",bias:.5,interpolation:"linear"},{id:"c2",position:.943,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#626262",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},orbit:{enabled:!0,radius:.035,speed:.02}}],tt={stops:[{id:"c0",position:0,color:"#000000",bias:.5,interpolation:"step"},{id:"c1",position:.55,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"c2",position:.6,color:"#000000",bias:.5,interpolation:"step"},{id:"c3",position:1,color:"#000000",bias:.5,interpolation:"step"}],colorSpace:"srgb",blendSpace:"rgb"},Fi={stops:de([[0,"#421E0F"],[.067,"#19071A"],[.133,"#09012F"],[.2,"#040449"],[.267,"#000764"],[.333,"#0C2C8A"],[.4,"#1852B1"],[.467,"#397DD1"],[.533,"#86B5E5"],[.6,"#D3ECF8"],[.667,"#F1E9BF"],[.733,"#F8C95F"],[.8,"#FFAA00"],[.867,"#CC8000"],[.933,"#995700"],[1,"#6A3403"]]),colorSpace:"linear",blendSpace:"oklab"},ct=pe.createContext(!1),it=[{id:"gradient",label:"Gradient",hint:"∇(escape iter) — force points AWAY from the set interior. Fractal acts as a source."},{id:"curl",label:"Curl",hint:"Perp of ∇(escape iter) — divergence-free swirl along level sets. Fluid surfs the contours."},{id:"iterate",label:"Iterate",hint:"Final z iterate direction (Böttcher). Fluid flows along the fractal's own orbit grain."},{id:"c-track",label:"C-Track",hint:"Δ(julia)/Δt as you move c. Fluid follows the deformation of the fractal in real time."},{id:"hue",label:"Hue",hint:"Rendered hue → angle, value → magnitude. The picture itself is the velocity field."}],rt=[{id:"composite",label:"Mixed",hint:"Fractal + dye + optional velocity overlay"},{id:"julia",label:"Fractal",hint:"Pure fractal, fluid hidden"},{id:"dye",label:"Dye",hint:"Fluid dye only — shows what the fractal wrote"},{id:"velocity",label:"Velocity",hint:"Per-pixel velocity as a hue wheel"}],Ri=[{id:"julia",label:"Julia"},{id:"mandelbrot",label:"Mandelbrot"}],ot=["Fractal","Coupling","Fluid","Brush","Palette","Post-FX","Collision","Composite","Presets"];function at(r){const e=o=>Math.max(0,Math.min(255,Math.round(o*255))).toString(16).padStart(2,"0");return"#"+e(r[0])+e(r[1])+e(r[2])}function nt(r){const e=r.replace("#",""),o=parseInt(e.slice(0,2),16)/255,i=parseInt(e.slice(2,4),16)/255,n=parseInt(e.slice(4,6),16)/255;return[o,i,n]}const Y=({active:r,onClick:e,title:o,children:i,className:n=""})=>t.jsx("button",{type:"button",onClick:e,title:o,className:"px-2 py-1 text-[10px] rounded border transition-colors "+(r?"bg-cyan-500/20 border-cyan-400/60 text-cyan-200":"bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08]")+" "+n,children:i}),M=({children:r})=>pe.useContext(ct)?null:t.jsx("div",{className:"text-[9px] text-gray-500 leading-snug pl-1 pt-0.5",children:r}),S=({hint:r,children:e})=>t.jsxs("div",{className:"flex flex-col gap-0.5",children:[e,r&&t.jsx(M,{children:r})]}),ce=({children:r,right:e})=>t.jsxs("div",{className:"flex items-center justify-between pt-1",children:[t.jsx("div",{className:"text-[10px] uppercase text-gray-400 tracking-wide",children:r}),e]}),Si=({params:r,setParams:e,onReset:o,orbit:i,setOrbit:n,gradient:u,setGradient:c,gradientLut:d,collisionGradient:h,setCollisionGradient:b,onPresetApply:z,onSaveJson:P,onSavePng:W,onLoadFile:V,hideHints:$})=>{var A,U,K,j,ee,R,oe;const X=pe.useRef(null),[I,O]=pe.useState("Presets"),E=a=>{const _=ke.find(G=>G.id===a);_&&z(_)},C=a=>{var G;const _=(G=a.target.files)==null?void 0:G[0];_&&V(_),a.target.value=""},D=a=>{e(a==="plain"?{fluidStyle:"plain",bloomAmount:0,aberration:0,refraction:0,caustics:0}:a==="electric"?{fluidStyle:"electric",bloomAmount:.6,bloomThreshold:1,aberration:1,refraction:0,caustics:0,vibrance:.3}:{fluidStyle:"liquid",bloomAmount:.25,bloomThreshold:1.1,aberration:0,refraction:.08,caustics:8,vibrance:.3})},k=$?"gap-0.5":"gap-3";return t.jsx(ct.Provider,{value:$,children:t.jsxs("div",{className:"flex flex-col h-full text-gray-200 text-xs select-none",children:[t.jsxs("div",{className:"flex items-center justify-between px-3 pt-3 pb-2",children:[t.jsxs("div",{children:[t.jsx("div",{className:"text-sm font-semibold",children:"Julia Fluid Toy"}),t.jsx("div",{className:"text-[10px] text-gray-500",children:"fractal ↔ fluid coupling lab"})]}),t.jsx("a",{href:"./index.html",className:"text-[10px] text-cyan-300 hover:underline",children:"← back to GMT"})]}),t.jsx("div",{className:"bg-black/40 border-b border-white/10",children:[ot.slice(0,5),ot.slice(5)].map((a,_)=>t.jsx("div",{className:`flex ${_===0?"border-b border-white/5":""}`,children:a.map(G=>t.jsxs("button",{type:"button",onClick:()=>O(G),className:`flex-1 py-1.5 px-0 text-[10px] font-bold tracking-wide whitespace-nowrap transition-all relative ${I===G?"text-cyan-400 bg-white/5":"text-gray-500 hover:text-gray-300 hover:bg-white/5"}`,children:[G,I===G&&t.jsx("div",{className:"absolute bottom-[-1px] left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"})]},G))},_))}),t.jsxs("div",{className:`flex-1 overflow-y-auto px-3 pt-3 pb-2 flex flex-col ${k}`,children:[I==="Fractal"&&t.jsxs(t.Fragment,{children:[t.jsx(M,{children:"The fractal is the force generator. Every fluid frame reads this texture."}),t.jsx("div",{className:"flex gap-1",children:Ri.map(a=>t.jsx(Y,{active:r.kind===a.id,onClick:()=>e({kind:a.id}),children:a.label},a.id))}),t.jsx(Di,{cx:r.juliaC[0],cy:r.juliaC[1],onChange:(a,_)=>e({juliaC:[a,_]}),gradientLut:d??void 0,gradientRepeat:r.gradientRepeat,gradientPhase:r.gradientPhase,colorMapping:r.colorMapping,interiorColor:r.interiorColor,power:r.power}),t.jsx(S,{hint:"Julia constant. Move me to reshape the entire fractal — and the forces it emits.",children:t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsx(g,{label:"c.x",value:r.juliaC[0],onChange:a=>e({juliaC:[a,r.juliaC[1]]}),min:-2,max:2,step:.001,variant:"full"}),t.jsx(g,{label:"c.y",value:r.juliaC[1],onChange:a=>e({juliaC:[r.juliaC[0],a]}),min:-2,max:2,step:.001,variant:"full"})]})}),t.jsx(S,{hint:"Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001).",children:t.jsx(g,{label:"Zoom",value:r.zoom,onChange:a=>e({zoom:a}),min:1e-5,max:8,step:1e-4,hardMin:1e-5,variant:"full"})}),t.jsx(S,{hint:"Pan the fractal window.",children:t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsx(g,{label:"Center.x",value:r.center[0],onChange:a=>e({center:[a,r.center[1]]}),min:-2,max:2,step:.01,variant:"full"}),t.jsx(g,{label:"Center.y",value:r.center[1],onChange:a=>e({center:[r.center[0],a]}),min:-2,max:2,step:.01,variant:"full"})]})}),t.jsx(S,{hint:"More iterations → sharper escape gradients → finer force detail.",children:t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsx(g,{label:"Iter",value:r.maxIter,onChange:a=>e({maxIter:Math.round(a)}),min:16,max:512,step:1,variant:"full"}),t.jsx(g,{label:"Power",value:r.power,onChange:a=>e({power:a}),min:2,max:8,step:1,variant:"full"})]})})]}),I==="Coupling"&&t.jsxs(t.Fragment,{children:[t.jsxs(M,{children:["The coupling law. Chooses ",t.jsx("em",{children:"how"})," fractal pixels become velocity at each cell."]}),t.jsx("div",{className:"grid grid-cols-3 gap-1",children:it.map(a=>t.jsx(Y,{active:r.forceMode===a.id,onClick:()=>e({forceMode:a.id}),title:a.hint,children:a.label},a.id))}),!$&&t.jsx("div",{className:"text-[10px] text-cyan-200/80 leading-snug bg-cyan-900/20 border border-cyan-500/20 rounded px-2 py-1",children:(A=it.find(a=>a.id===r.forceMode))==null?void 0:A.hint}),t.jsx(S,{hint:"Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction.",children:t.jsx(g,{label:"Force gain",value:r.forceGain,onChange:a=>e({forceGain:a}),min:-2e3,max:2e3,step:.1,variant:"full"})}),t.jsx(S,{hint:"How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed.",children:t.jsx(g,{label:"Interior damp",value:r.interiorDamp,onChange:a=>e({interiorDamp:a}),min:0,max:1,step:.01,variant:"full"})}),t.jsx(S,{hint:"Per-pixel cap on the fractal force magnitude.",children:t.jsx(g,{label:"Force cap",value:r.forceCap,onChange:a=>e({forceCap:a}),min:1,max:40,step:.5,variant:"full"})}),t.jsx(S,{hint:"Fades force/dye injection near the canvas edges. Fixes 'gushing from the borders' under fast c-changes.",children:t.jsx(g,{label:"Edge margin",value:r.edgeMargin,onChange:a=>e({edgeMargin:a}),min:0,max:.25,step:.005,variant:"full"})}),t.jsx(ce,{right:t.jsx(Y,{active:i.enabled,onClick:()=>n({enabled:!i.enabled}),children:i.enabled?"on":"off"}),children:"Auto-orbit c"}),t.jsxs(M,{children:["Circles c automatically around its current value. Pair with ",t.jsx("b",{children:"C-Track"})," to watch the fluid breathe with the fractal's deformation."]}),i.enabled&&t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsx(g,{label:"Radius",value:i.radius,onChange:a=>n({radius:a}),min:0,max:.5,step:.001,variant:"full"}),t.jsx(g,{label:"Speed",value:i.speed,onChange:a=>n({speed:a}),min:0,max:3,step:.01,variant:"full"})]})]}),I==="Fluid"&&t.jsxs(t.Fragment,{children:[t.jsx(M,{children:"How the fluid carries and forgets what the fractal pushed into it."}),t.jsx(S,{hint:"Amplifies existing curl — keeps fractal-induced swirls from smearing away.",children:t.jsx(g,{label:"Vorticity",value:r.vorticity,onChange:a=>e({vorticity:a}),min:0,max:50,step:.1,variant:"full"})}),r.vorticity>0&&t.jsx(S,{hint:"Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices.",children:t.jsx(g,{label:"Vorticity scale",value:r.vorticityScale,onChange:a=>e({vorticityScale:a}),min:.5,max:8,step:.1,variant:"full"})}),t.jsx(S,{hint:"How fast velocity decays. High = fluid forgets the fractal quickly.",children:t.jsx(g,{label:"Velocity dissipation /s",value:r.dissipation,onChange:a=>e({dissipation:a}),min:0,max:5,step:.01,variant:"full"})}),t.jsx(S,{hint:"How much of the fractal's color bleeds into the fluid each frame.",children:t.jsx(g,{label:"Dye inject",value:r.dyeInject,onChange:a=>e({dyeInject:a}),min:0,max:3,step:.01,variant:"full"})}),t.jsx(S,{hint:"Jacobi iterations for incompressibility. More = stricter but slower.",children:t.jsx(g,{label:"Pressure iters",value:r.pressureIters,onChange:a=>e({pressureIters:Math.round(a)}),min:4,max:60,step:1,variant:"full"})}),t.jsx(ce,{children:"Dye decay"}),t.jsx(M,{children:"How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid)."}),t.jsxs("div",{className:"flex flex-col gap-1",children:[t.jsx("div",{className:"text-[10px] text-gray-400",children:"Colour space"}),t.jsx("div",{className:"grid grid-cols-3 gap-1",children:$e.map(a=>t.jsx(Y,{active:r.dyeDecayMode===a.id,onClick:()=>e({dyeDecayMode:a.id}),title:a.hint,children:a.label},a.id))}),t.jsx(M,{children:(U=$e.find(a=>a.id===r.dyeDecayMode))==null?void 0:U.hint})]}),t.jsx(S,{hint:r.dyeDecayMode==="linear"?"How fast dye fades (RGB multiply).":"Per-second luminance fade (OKLab L). Chroma fades on its own schedule below.",children:t.jsx(g,{label:"Dye dissipation /s",value:r.dyeDissipation,onChange:a=>e({dyeDissipation:a}),min:0,max:5,step:.01,variant:"full"})}),r.dyeDecayMode!=="linear"&&t.jsxs(t.Fragment,{children:[t.jsx(S,{hint:"Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright.",children:t.jsx(g,{label:"Chroma decay /s",value:r.dyeChromaDecayHz,onChange:a=>e({dyeChromaDecayHz:a}),min:0,max:5,step:.01,variant:"full"})}),t.jsx(S,{hint:"Per-frame chroma gain, log-scaled 0.5 → 1.1 so you can dial the near-neutral zone precisely. 1 = neutral, <1 washes out, >1 pushes toward max saturation. Gamut-mapped in OKLab, so it pegs at the saturation ceiling rather than hue-shifting to white.",children:t.jsx(g,{label:"Saturation boost",value:r.dyeSaturationBoost,onChange:a=>e({dyeSaturationBoost:a}),min:.5,max:1.1,step:.001,mapping:Rt(.5),variant:"full"})})]}),t.jsx(ce,{right:t.jsx(Y,{active:r.autoQuality,onClick:()=>e({autoQuality:!r.autoQuality}),children:r.autoQuality?"on":"off"}),children:"Quality"}),t.jsx(M,{children:"The slider is your target. Auto-quality may drop below it if FPS is low, then snaps back in one jump when it recovers (no stair-step flashing)."}),t.jsx(S,{hint:"Target fluid grid height in cells. More = finer detail, slower.",children:t.jsx(g,{label:"Sim resolution",value:r.simResolution,onChange:a=>e({simResolution:Math.round(a)}),min:128,max:1536,step:32,variant:"full"})})]}),I==="Brush"&&t.jsxs(t.Fragment,{children:[t.jsxs(M,{children:["The brush is what your pointer paints into the fluid. Hold ",t.jsx("b",{children:"B"})," and drag horizontally on the canvas to scale it live. Solid-click drops a single splat; dragging emits a stroke."]}),t.jsx(ce,{children:"Mode"}),t.jsx("div",{className:"grid grid-cols-4 gap-1",children:qe.map(a=>t.jsx(Y,{active:r.brushMode===a.id,onClick:()=>e({brushMode:a.id}),title:a.hint,children:a.label},a.id))}),t.jsx(M,{children:(K=qe.find(a=>a.id===r.brushMode))==null?void 0:K.hint}),t.jsx(ce,{children:"Shape"}),t.jsx(g,{label:"Size (UV)",value:r.brushSize,onChange:a=>e({brushSize:a}),min:.003,max:.4,step:.001,variant:"full"}),t.jsx(M,{children:"Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live."}),t.jsx(g,{label:"Hardness",value:r.brushHardness,onChange:a=>e({brushHardness:a}),min:0,max:1,step:.01,variant:"full"}),t.jsx(M,{children:"0 = soft gaussian edge (airbrush). 1 = hard disc (stamp)."}),r.brushMode!=="smudge"&&t.jsxs(t.Fragment,{children:[t.jsx(g,{label:r.brushMode==="erase"?"Erase strength":"Strength",value:r.brushStrength,onChange:a=>e({brushStrength:a}),min:0,max:3,step:.01,variant:"full"}),t.jsx(M,{children:r.brushMode==="erase"?"How much dye each splat removes. 0 = nothing, 3 = total wipe.":"Dye amount per splat. 0 = dry brush, 3 = saturated."})]}),(r.brushMode==="paint"||r.brushMode==="smudge")&&t.jsxs(t.Fragment,{children:[t.jsx(g,{label:"Flow",value:r.brushFlow,onChange:a=>e({brushFlow:a}),min:0,max:200,step:.5,variant:"full"}),t.jsx(M,{children:"How much of the pointer's velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip."})]}),!r.particleEmitter&&t.jsxs(t.Fragment,{children:[t.jsx(g,{label:"Spacing (UV)",value:r.brushSpacing,onChange:a=>e({brushSpacing:a}),min:0,max:.1,step:.001,variant:"full"}),t.jsx(M,{children:"Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail."})]}),r.brushMode!=="smudge"&&r.brushMode!=="erase"&&t.jsxs(t.Fragment,{children:[t.jsx(ce,{children:"Colour"}),t.jsx("div",{className:"grid grid-cols-4 gap-1",children:Qe.map(a=>t.jsx(Y,{active:r.brushColorMode===a.id,onClick:()=>e({brushColorMode:a.id}),title:a.hint,children:a.label},a.id))}),t.jsx(M,{children:(j=Qe.find(a=>a.id===r.brushColorMode))==null?void 0:j.hint}),r.brushColorMode==="solid"&&t.jsxs("div",{className:"flex items-center gap-2 mt-1",children:[t.jsx("div",{className:"text-[10px] text-gray-400 w-20",children:"Solid color"}),t.jsx("input",{type:"color","aria-label":"Brush solid colour",title:"Brush solid colour",value:at(r.brushColor),onChange:a=>e({brushColor:nt(a.target.value)}),className:"w-10 h-6 rounded border border-white/10 bg-transparent cursor-pointer"})]}),r.brushColorMode!=="rainbow"&&t.jsxs(t.Fragment,{children:[t.jsx(g,{label:"Hue jitter",value:r.brushJitter,onChange:a=>e({brushJitter:a}),min:0,max:1,step:.01,variant:"full"}),t.jsx(M,{children:"Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes."})]})]}),t.jsx(ce,{right:t.jsx(Y,{active:r.particleEmitter,onClick:()=>e({particleEmitter:!r.particleEmitter}),children:r.particleEmitter?"on":"off"}),children:"Particle emitter"}),t.jsx(M,{children:"When on, dragging spawns independent particles on their own layer. Each live particle flies with its own velocity/lifespan and acts as a mini brush — painting into the fluid with whichever mode is selected above, at its own position."}),r.particleEmitter&&t.jsxs(t.Fragment,{children:[t.jsx(g,{label:"Rate /s",value:r.particleRate,onChange:a=>e({particleRate:a}),min:1,max:600,step:1,variant:"full"}),t.jsx(M,{children:"Particles emitted per second while dragging. Hard-capped at 300 live at once."}),t.jsx(g,{label:"Velocity",value:r.particleVelocity,onChange:a=>e({particleVelocity:a}),min:0,max:3,step:.01,variant:"full"}),t.jsx(M,{children:"Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun."}),t.jsx(g,{label:"Spread",value:r.particleSpread,onChange:a=>e({particleSpread:a}),min:0,max:1,step:.01,variant:"full"}),t.jsx(M,{children:"Angular spread around the drag direction. 0 = beam, 1 = full 360° burst."}),t.jsx(g,{label:"Gravity",value:r.particleGravity,onChange:a=>e({particleGravity:a}),min:-3,max:3,step:.01,variant:"full"}),t.jsx(M,{children:"UV/sec² acceleration. Negative = falls down the canvas, positive = rises."}),t.jsx(g,{label:"Drag /s",value:r.particleDrag,onChange:a=>e({particleDrag:a}),min:0,max:4,step:.01,variant:"full"}),t.jsx(M,{children:"Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop."}),t.jsx(g,{label:"Lifetime",value:r.particleLifetime,onChange:a=>e({particleLifetime:a}),min:.1,max:6,step:.05,variant:"full"}),t.jsx(M,{children:"Seconds before each particle is culled. Longer = more persistent streaks."}),t.jsx(g,{label:"Size ×",value:r.particleSizeScale,onChange:a=>e({particleSizeScale:a}),min:.05,max:1.5,step:.01,variant:"full"}),t.jsx(M,{children:"Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush."})]})]}),I==="Palette"&&t.jsxs(t.Fragment,{children:[t.jsxs(M,{children:["Colors both the fractal AND the dye that gets injected into the fluid. In Hue-mode, it ",t.jsx("em",{children:"is"})," the vector field."]}),t.jsx(ze,{value:u,onChange:a=>{Array.isArray(a)?c({stops:a,colorSpace:u.colorSpace,blendSpace:u.blendSpace}):c(a)}}),t.jsxs("div",{className:"flex flex-col gap-1",children:[t.jsx("div",{className:"text-[10px] text-gray-400",children:"Color mapping"}),t.jsx("div",{className:"grid grid-cols-3 gap-1",children:Ze.map(a=>t.jsx(Y,{active:r.colorMapping===a.id,onClick:()=>e({colorMapping:a.id}),title:a.hint,children:a.label},a.id))}),t.jsx(M,{children:(ee=Ze.find(a=>a.id===r.colorMapping))==null?void 0:ee.hint})]}),t.jsx(S,{hint:"Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands.",children:t.jsx(g,{label:"Repetition",value:r.gradientRepeat,onChange:a=>e({gradientRepeat:a}),min:.1,max:8,step:.01,variant:"full"})}),t.jsx(S,{hint:"Phase shift — rotates the colors without changing their layout.",children:t.jsx(g,{label:"Phase",value:r.gradientPhase,onChange:a=>e({gradientPhase:a}),min:0,max:1,step:.005,variant:"full"})}),t.jsx(S,{hint:"Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter. Reduce for fresher colours.",children:t.jsx(g,{label:"Color iter",value:r.colorIter,onChange:a=>e({colorIter:Math.round(a)}),min:1,max:Math.max(4,r.maxIter),step:1,variant:"full"})}),(r.colorMapping==="orbit-point"||r.colorMapping==="orbit-circle"||r.colorMapping==="orbit-cross"||r.colorMapping==="trap-iter")&&t.jsx(S,{hint:"Trap centre (complex coord). Move to pick which point in the orbit to trap against.",children:t.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[t.jsx(g,{label:"Trap.x",value:r.trapCenter[0],onChange:a=>e({trapCenter:[a,r.trapCenter[1]]}),min:-2,max:2,step:.01,variant:"full"}),t.jsx(g,{label:"Trap.y",value:r.trapCenter[1],onChange:a=>e({trapCenter:[r.trapCenter[0],a]}),min:-2,max:2,step:.01,variant:"full"})]})}),r.colorMapping==="orbit-circle"&&t.jsx(S,{hint:"Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring.",children:t.jsx(g,{label:"Trap radius",value:r.trapRadius,onChange:a=>e({trapRadius:a}),min:.01,max:4,step:.01,variant:"full"})}),r.colorMapping==="orbit-line"&&t.jsx(S,{hint:"Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length.",children:t.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[t.jsx(g,{label:"n.x",value:r.trapNormal[0],onChange:a=>e({trapNormal:[a,r.trapNormal[1]]}),min:-1,max:1,step:.01,variant:"full"}),t.jsx(g,{label:"n.y",value:r.trapNormal[1],onChange:a=>e({trapNormal:[r.trapNormal[0],a]}),min:-1,max:1,step:.01,variant:"full"}),t.jsx(g,{label:"offset",value:r.trapOffset,onChange:a=>e({trapOffset:a}),min:-2,max:2,step:.01,variant:"full"})]})}),r.colorMapping==="stripe"&&t.jsx(S,{hint:"Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration.",children:t.jsx(g,{label:"Stripe freq",value:r.stripeFreq,onChange:a=>e({stripeFreq:a}),min:1,max:16,step:.1,variant:"full"})}),t.jsxs("div",{className:"flex flex-col gap-1",children:[t.jsx("div",{className:"text-[10px] text-gray-400",children:"Interior color (bounded points)"}),t.jsx("input",{type:"color",title:"Interior color (points that never escape)","aria-label":"Interior color",value:at(r.interiorColor),onChange:a=>e({interiorColor:nt(a.target.value)}),className:"w-full h-6 rounded border border-white/10 cursor-pointer bg-transparent"})]}),t.jsx(ce,{children:"Dye"}),t.jsx(M,{children:"How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask."}),t.jsx("div",{className:"grid grid-cols-4 gap-1",children:Ke.map(a=>t.jsx(Y,{active:r.dyeBlend===a.id,onClick:()=>e({dyeBlend:a.id}),title:a.hint,children:a.label},a.id))}),t.jsx(M,{children:(R=Ke.find(a=>a.id===r.dyeBlend))==null?void 0:R.hint})]}),I==="Post-FX"&&t.jsxs(t.Fragment,{children:[t.jsx(M,{children:"Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below."}),t.jsx("div",{className:"grid grid-cols-3 gap-1",children:gi.map(a=>t.jsx(Y,{active:r.fluidStyle===a.id,onClick:()=>D(a.id),title:a.hint,children:a.label},a.id))}),t.jsx(S,{hint:"Bloom strength — wide soft glow on bright pixels. Core of the electric look.",children:t.jsx(g,{label:"Bloom",value:r.bloomAmount,onChange:a=>e({bloomAmount:a}),min:0,max:3,step:.01,variant:"full"})}),r.bloomAmount>0&&t.jsx(S,{hint:"Luminance threshold: pixels below this don't contribute to bloom. Lower = more of the image glows.",children:t.jsx(g,{label:"Bloom threshold",value:r.bloomThreshold,onChange:a=>e({bloomThreshold:a}),min:0,max:3,step:.01,variant:"full"})}),t.jsx(S,{hint:"Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp.",children:t.jsx(g,{label:"Aberration",value:r.aberration,onChange:a=>e({aberration:a}),min:0,max:3,step:.01,variant:"full"})}),t.jsx(S,{hint:"Screen-space refraction: dye's luminance acts as a height field — the fractal underneath warps like glass.",children:t.jsx(g,{label:"Refraction",value:r.refraction,onChange:a=>e({refraction:a}),min:0,max:.3,step:.001,variant:"full"})}),r.refraction>0&&t.jsx(S,{hint:"Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient.",children:t.jsx(g,{label:"Refract smooth",value:r.refractSmooth,onChange:a=>e({refractSmooth:a}),min:1,max:12,step:.1,variant:"full"})}),t.jsx(S,{hint:"Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends.",children:t.jsx(g,{label:"Caustics",value:r.caustics,onChange:a=>e({caustics:a}),min:0,max:25,step:.1,variant:"full"})}),t.jsx(ce,{children:"Tone mapping"}),t.jsxs(M,{children:["How final colour gets compressed. ",t.jsx("b",{children:"None"})," = maximally vivid (may clip).",t.jsx("b",{children:" AgX"})," = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights."]}),t.jsx("div",{className:"grid grid-cols-4 gap-1",children:fi.map(a=>t.jsx(Y,{active:r.toneMapping===a.id,onClick:()=>e({toneMapping:a.id}),title:a.hint,children:a.label},a.id))}),t.jsx(S,{hint:"Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch.",children:t.jsx(g,{label:"Exposure",value:r.exposure,onChange:a=>e({exposure:a}),min:.1,max:5,step:.01,variant:"full"})}),t.jsx(S,{hint:"Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones.",children:t.jsx(g,{label:"Vibrance",value:r.vibrance,onChange:a=>e({vibrance:a}),min:0,max:1,step:.01,variant:"full"})})]}),I==="Collision"&&t.jsxs(t.Fragment,{children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("div",{className:"text-[11px] text-gray-200 font-medium",children:"Collision walls"}),t.jsx(Y,{active:r.collisionEnabled,onClick:()=>e({collisionEnabled:!r.collisionEnabled}),children:r.collisionEnabled?"on":"off"})]}),t.jsxs(M,{children:["Paints solid walls the fluid bounces off, sculpted by the gradient below. Same mapping (iterations / angle / orbit trap / etc.) as the main gradient — edit stops to black = ",t.jsx("b",{children:"fluid"}),", white = ",t.jsx("b",{children:"wall"}),". Gradient shape is up to you."]}),r.collisionEnabled&&t.jsxs(t.Fragment,{children:[t.jsx(ze,{value:h,onChange:a=>{Array.isArray(a)?b({stops:a,colorSpace:h.colorSpace,blendSpace:h.blendSpace}):b(a)}}),t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("span",{className:"text-[10px] text-gray-400",children:"Preview walls on canvas"}),t.jsx(Y,{active:r.collisionPreview,onClick:()=>e({collisionPreview:!r.collisionPreview}),children:r.collisionPreview?"on":"off"})]}),t.jsx(M,{children:"Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient."})]})]}),I==="Composite"&&t.jsxs(t.Fragment,{children:[t.jsx(M,{children:"What you see. The simulation runs the same either way."}),t.jsx("div",{className:"grid grid-cols-4 gap-1",children:rt.map(a=>t.jsx(Y,{active:r.show===a.id,onClick:()=>e({show:a.id}),title:a.hint,children:a.label},a.id))}),t.jsx(M,{children:(oe=rt.find(a=>a.id===r.show))==null?void 0:oe.hint}),r.show==="composite"&&t.jsxs(t.Fragment,{children:[t.jsx(S,{hint:"How much fractal color shows through in Mixed view.",children:t.jsx(g,{label:"Julia mix",value:r.juliaMix,onChange:a=>e({juliaMix:a}),min:0,max:2,step:.01,variant:"full"})}),t.jsx(S,{hint:"How much fluid dye shows through in Mixed view.",children:t.jsx(g,{label:"Dye mix",value:r.dyeMix,onChange:a=>e({dyeMix:a}),min:0,max:2,step:.01,variant:"full"})}),t.jsx(S,{hint:"Overlay velocity-hue on top of the composite. Diagnostic.",children:t.jsx(g,{label:"Velocity viz",value:r.velocityViz,onChange:a=>e({velocityViz:a}),min:0,max:2,step:.01,variant:"full"})})]})]}),I==="Presets"&&t.jsxs(t.Fragment,{children:[t.jsx(M,{children:"Each preset is a curated fractal→fluid coupling. Applying one resets the grid and restores known params."}),t.jsx("div",{className:"grid grid-cols-2 gap-1",children:ke.map(a=>t.jsx(Y,{active:!1,onClick:()=>E(a.id),title:a.desc,children:a.name},a.id))}),t.jsx(M,{children:"Save / Screenshot / Load moved to the top bar icons above."}),t.jsx("div",{className:"grid grid-cols-1 gap-1",children:t.jsx(Y,{active:!1,onClick:P,title:"Export the full state as a .json file.",children:"Save JSON"})}),t.jsx("input",{ref:X,type:"file",accept:".png,.json,image/png,application/json,text/plain",onChange:C,className:"hidden","aria-label":"Load saved state"})]})]}),t.jsxs("div",{className:"flex gap-2 p-3 border-t border-white/5",children:[t.jsx("button",{type:"button",onClick:()=>e({paused:!r.paused}),className:"flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10",children:r.paused?"Resume":"Pause"}),t.jsx("button",{type:"button",onClick:o,className:"flex-1 px-2 py-1.5 text-[11px] rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/10",children:"Clear fluid"})]})]})})},Ei=({x:r,y:e,items:o,onDismiss:i})=>{const n=m.useRef(null);m.useEffect(()=>{const c=b=>{n.current&&(n.current.contains(b.target)||i())},d=b=>{b.key==="Escape"&&i()},h=setTimeout(()=>{window.addEventListener("mousedown",c),window.addEventListener("keydown",d)},0);return()=>{clearTimeout(h),window.removeEventListener("mousedown",c),window.removeEventListener("keydown",d)}},[i]);const u={left:Math.min(r,window.innerWidth-240),top:Math.min(e,window.innerHeight-o.length*28-12)};return t.jsx("div",{ref:n,className:"fixed z-50 min-w-[200px] rounded border border-white/15 bg-[#1a1a1d]/95 backdrop-blur-sm shadow-xl text-[11px] text-gray-200 py-1",style:u,onContextMenu:c=>{c.preventDefault(),i()},children:o.map((c,d)=>t.jsxs(pe.Fragment,{children:[c.separatorAbove&&t.jsx("div",{className:"my-1 border-t border-white/10"}),t.jsx("button",{type:"button",onClick:()=>{c.onClick(),i()},title:c.hint,className:"w-full text-left px-3 py-1.5 transition-colors "+(c.danger?"hover:bg-red-500/20 text-red-300":"hover:bg-cyan-500/15 hover:text-cyan-200"),children:c.label})]},d))})},ki=1,Ae="GmtFluidState";function Ee(r,e,o,i,n){return{version:ki,savedAt:new Date().toISOString(),name:n,params:r,gradient:e,collisionGradient:i,orbit:o}}function st(r){if(!r||typeof r!="object")throw new Error("Saved state is not an object");const e=r;if(typeof e.version!="number")throw new Error('Missing or invalid "version"');if(!e.params||typeof e.params!="object")throw new Error('Missing "params"');if(!e.gradient||typeof e.gradient!="object")throw new Error('Missing "gradient"');if(!e.orbit||typeof e.orbit!="object")throw new Error('Missing "orbit"');return{version:e.version,savedAt:typeof e.savedAt=="string"?e.savedAt:new Date().toISOString(),name:typeof e.name=="string"?e.name:void 0,params:e.params,gradient:e.gradient,collisionGradient:e.collisionGradient&&typeof e.collisionGradient=="object"?e.collisionGradient:void 0,orbit:e.orbit}}function Be(r,e){const o=URL.createObjectURL(r),i=document.createElement("a");i.href=o,i.download=e,document.body.appendChild(i),i.click(),i.remove(),setTimeout(()=>URL.revokeObjectURL(o),1e3)}function Ai(r,e="toy-fluid-state.json"){const o=JSON.stringify(r,null,2);Be(new Blob([o],{type:"application/json"}),e)}async function Bi(r,e,o="toy-fluid.png"){const i=await new Promise(d=>r.toBlob(d,"image/png"));if(!i)throw new Error("canvas.toBlob returned null");const n=new Uint8Array(await i.arrayBuffer()),u=Ii(n,Ae,JSON.stringify(e)),c=new Uint8Array(u.byteLength);c.set(u),Be(new Blob([c.buffer],{type:"image/png"}),o)}async function Pi(r,e="toy-fluid-screenshot.png"){const o=await new Promise(i=>r.toBlob(i,"image/png"));if(!o)throw new Error("canvas.toBlob returned null");Be(o,e)}async function Ui(r){const e=r.name.toLowerCase(),o=new Uint8Array(await r.arrayBuffer());if(e.endsWith(".png")||o.length>=8&&o[0]===137&&o[1]===80&&o[2]===78&&o[3]===71&&o[4]===13&&o[5]===10&&o[6]===26&&o[7]===10){const u=Oi(o,Ae);if(!u)throw new Error(`PNG has no "${Ae}" metadata.`);return st(JSON.parse(u))}const n=new TextDecoder("utf-8").decode(o);return st(JSON.parse(n))}function Ii(r,e,o){r.subarray(0,8);const i=33,n=r.subarray(0,i),u=r.subarray(i),c=Ni(e,o),d=new Uint8Array(n.length+c.length+u.length);return d.set(n,0),d.set(c,n.length),d.set(u,n.length+c.length),d}function Oi(r,e){let o=8;const i=new DataView(r.buffer,r.byteOffset,r.byteLength);for(;o+12<=r.length;){const n=i.getUint32(o,!1),u=String.fromCharCode(r[o+4],r[o+5],r[o+6],r[o+7]),c=o+8,d=c+n;if(u==="tEXt"){const h=r.subarray(c,d),b=h.indexOf(0);if(b>0&&new TextDecoder("latin1").decode(h.subarray(0,b))===e)return new TextDecoder("utf-8").decode(h.subarray(b+1))}if(u==="IEND")break;o=d+4}return null}function Ni(r,e){const o=new TextEncoder,i=o.encode(r),n=o.encode(e);if(i.length===0||i.length>79)throw new Error("keyword length out of range");const u=i.length+1+n.length,c=new Uint8Array(12+u),d=new DataView(c.buffer);d.setUint32(0,u,!1),c[4]=116,c[5]=69,c[6]=88,c[7]=116,c.set(i,8),c[8+i.length]=0,c.set(n,8+i.length+1);const h=Li(c,4,8+u);return d.setUint32(8+u,h,!1),c}const _i=(()=>{const r=new Uint32Array(256);for(let e=0;e<256;e++){let o=e;for(let i=0;i<8;i++)o=o&1?3988292384^o>>>1:o>>>1;r[e]=o>>>0}return r})();function Li(r,e,o){let i=4294967295;for(let n=e;n<o;n++)i=_i[(i^r[n])&255]^i>>>8;return(i^4294967295)>>>0}const Gi="p-2 rounded-lg transition-all active:scale-95 border flex items-center justify-center",zi="bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10",Me=({title:r,onClick:e,children:o})=>t.jsx("button",{type:"button",onClick:e,title:r,className:`${Gi} ${zi}`,children:o}),Vi=({kind:r,forceMode:e,juliaC:o,zoom:i,simResolution:n,effectiveSimRes:u,fps:c,orbitOn:d,paused:h,onSavePng:b,onScreenshot:z,onLoadFile:P,onSubmit:W})=>{const V=pe.useRef(null),$=()=>{var O;return(O=V.current)==null?void 0:O.click()},X=O=>{var C;const E=(C=O.target.files)==null?void 0:C[0];E&&P(E),O.target.value=""},I=u===n?`${n}px`:`${u}px / ${n}`;return t.jsxs("div",{className:"h-10 shrink-0 border-b border-white/5 bg-[#0b0b0d] flex items-center px-2 gap-2 text-[11px] font-mono text-gray-300","data-testid":"top-bar",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("span",{className:"text-sm font-semibold text-gray-100 font-sans",children:"Julia Fluid"}),t.jsx("a",{href:"./index.html",className:"text-[10px] text-cyan-300 hover:underline font-sans",children:"← GMT"})]}),t.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),t.jsxs("div",{className:"flex items-center gap-3 min-w-0","data-testid":"status-bar",children:[t.jsx("span",{children:r==="julia"?"Julia":"Mandelbrot"}),t.jsx("span",{className:"text-cyan-300",children:e}),t.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-c",children:["c=(",o[0].toFixed(3),", ",o[1].toFixed(3),")"]}),t.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-zoom",children:["z=",i.toFixed(3)]}),t.jsx("span",{className:`whitespace-nowrap ${u<n?"text-amber-300":"text-gray-500"}`,children:I}),t.jsxs("span",{className:"text-gray-500 whitespace-nowrap","data-testid":"status-fps",children:[c," fps"]}),d&&t.jsx("span",{className:"text-amber-300",children:"orbit on"}),h&&t.jsx("span",{className:"text-red-400",children:"paused"})]}),t.jsxs("div",{className:"ml-auto flex items-center gap-1",children:[t.jsx(Me,{title:"Save scene as PNG (state embedded in metadata)",onClick:b,children:t.jsx(St,{})}),t.jsx(Me,{title:"Screenshot canvas as plain PNG",onClick:z,children:t.jsx(Et,{})}),t.jsx(Me,{title:"Load a saved .png or .json",onClick:$,children:t.jsx(kt,{})}),t.jsx("div",{className:"h-6 w-px bg-white/10 mx-1"}),t.jsx(Me,{title:"Submit this preset to the curator",onClick:W,children:t.jsx(At,{})}),t.jsx("input",{ref:V,type:"file",accept:".png,.json,image/png,application/json,text/plain",onChange:X,className:"hidden","aria-label":"Load saved state"})]})]})};let ut=0;function dt(){const r=(performance.now()-ut)/1e3;return Math.max(0,hi-r)}async function Hi(r){const e=await new Promise(o=>r.toBlob(o,"image/png"));if(!e)throw new Error("canvas.toBlob returned null");return e}async function Ji(r,e,o){const i=dt();if(i>0)return{ok:!1,code:"cooldown",message:`Please wait ${Math.ceil(i)}s before submitting again.`};const n=(o.name??"").trim();if(n.length<1||n.length>60)return{ok:!1,code:"invalid",message:"Name is required (1–60 characters)."};if(o.author&&o.author.length>60)return{ok:!1,code:"invalid",message:"Author is too long (max 60 characters)."};if(o.notes&&o.notes.length>500)return{ok:!1,code:"invalid",message:"Notes are too long (max 500 characters)."};let u;try{u=await Hi(r)}catch(b){return{ok:!1,code:"invalid",message:`Couldn't capture canvas: ${b.message}`}}if(u.size>We)return{ok:!1,code:"too-large",message:`Image is too large (${(u.size/1024/1024).toFixed(1)} MB; max ${(We/1024/1024).toFixed(0)} MB).`};const c=new FormData;c.set("state",JSON.stringify(e)),c.set("image",u,"preset.png"),c.set("name",n),o.author&&c.set("author",o.author),o.notes&&c.set("notes",o.notes);let d;try{d=await fetch(di,{method:"POST",body:c})}catch(b){return{ok:!1,code:"network",message:`Network error: ${b.message}`}}let h={};try{h=await d.json()}catch{}return d.ok?(ut=performance.now(),{ok:!0,id:h.id??"unknown"}):{ok:!1,code:d.status===429?"cooldown":d.status>=500?"server":"invalid",message:h.error??`Submission failed (${d.status} ${d.statusText}).`}}const Xi=({open:r,canvas:e,state:o,onClose:i})=>{const[n,u]=m.useState(""),[c,d]=m.useState(""),[h,b]=m.useState(""),[z,P]=m.useState(!1),[W,V]=m.useState({kind:"idle"}),[$,X]=m.useState(null),I=m.useRef(null);if(m.useEffect(()=>{if(!r||!e){X(null);return}let D=null;return e.toBlob(k=>{k&&(D=URL.createObjectURL(k),X(D))},"image/png"),()=>{D&&URL.revokeObjectURL(D)}},[r,e]),m.useEffect(()=>{r||(V({kind:"idle"}),P(!1))},[r]),m.useEffect(()=>{if(!r)return;const D=k=>{k.key==="Escape"&&i()};return window.addEventListener("keydown",D),()=>window.removeEventListener("keydown",D)},[r,i]),!r)return null;const O=dt(),E=z&&n.trim().length>0&&W.kind!=="sending"&&O===0,C=async()=>{if(!e||!o)return;V({kind:"sending"});const D={name:n.trim(),author:c.trim()||void 0,notes:h.trim()||void 0},k=await Ji(e,o,D);k.ok?V({kind:"ok",id:k.id}):V({kind:"error",message:k.message})};return t.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4",onMouseDown:D=>{D.target===D.currentTarget&&i()},children:t.jsxs("div",{ref:I,className:"w-[480px] max-w-full rounded-lg border border-white/10 bg-[#0b0b0d] shadow-2xl text-gray-200 text-xs overflow-hidden",children:[t.jsxs("div",{className:"px-4 py-3 border-b border-white/5 flex items-center justify-between",children:[t.jsxs("div",{children:[t.jsx("div",{className:"text-sm font-semibold",children:"Submit preset"}),t.jsx("div",{className:"text-[10px] text-gray-500",children:"Share the current scene with the curator"})]}),t.jsx("button",{type:"button",onClick:i,className:"text-gray-500 hover:text-gray-200 text-sm px-1 leading-none",title:"Close (Esc)",children:"×"})]}),!1,t.jsxs("div",{className:"p-4 flex gap-3",children:[t.jsxs("div",{className:"w-[180px] shrink-0",children:[t.jsx("div",{className:"aspect-square rounded border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center",children:$?t.jsx("img",{src:$,alt:"preset preview",className:"w-full h-full object-cover"}):t.jsx("span",{className:"text-[10px] text-gray-500",children:"rendering preview…"})}),t.jsx("div",{className:"text-[9px] text-gray-500 mt-1 leading-snug",children:"The preview above, plus the scene's JSON state, are what gets submitted."})]}),t.jsxs("div",{className:"flex-1 flex flex-col gap-2",children:[t.jsxs("label",{className:"flex flex-col gap-0.5",children:[t.jsxs("span",{className:"text-[10px] text-gray-400",children:["Name ",t.jsx("span",{className:"text-red-400",children:"*"})]}),t.jsx("input",{value:n,onChange:D=>u(D.target.value.slice(0,60)),disabled:!1,placeholder:"e.g. Ember Tide",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"})]}),t.jsxs("label",{className:"flex flex-col gap-0.5",children:[t.jsx("span",{className:"text-[10px] text-gray-400",children:"Author (optional)"}),t.jsx("input",{value:c,onChange:D=>d(D.target.value.slice(0,60)),disabled:!1,placeholder:"alias or handle",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"})]}),t.jsxs("label",{className:"flex flex-col gap-0.5",children:[t.jsx("span",{className:"text-[10px] text-gray-400",children:"Notes (optional)"}),t.jsx("textarea",{value:h,onChange:D=>b(D.target.value.slice(0,500)),disabled:!1,rows:3,placeholder:"What's interesting about this preset? (≤ 500 chars)",className:"bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] resize-none focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"}),t.jsxs("span",{className:"text-[9px] text-gray-500 text-right",children:[h.length," / 500"]})]}),t.jsxs("label",{className:"flex items-start gap-2 mt-1 cursor-pointer select-none",children:[t.jsx("input",{type:"checkbox",checked:z,onChange:D=>P(D.target.checked),disabled:!1,className:"mt-0.5 accent-cyan-500"}),t.jsx("span",{className:"text-[10px] text-gray-400 leading-snug",children:"I understand this preset (image + parameters + my alias if provided) may be reviewed, edited, and republished as part of the built-in preset library."})]})]})]}),W.kind==="ok"&&t.jsxs("div",{className:"mx-4 mb-3 px-3 py-2 text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 rounded",children:["Thanks! Your preset is in the queue. ",t.jsxs("span",{className:"text-[10px] text-emerald-400/70",children:["(id: ",W.id,")"]})]}),W.kind==="error"&&t.jsx("div",{className:"mx-4 mb-3 px-3 py-2 text-[11px] text-red-300 bg-red-500/10 border border-red-400/20 rounded",children:W.message}),t.jsxs("div",{className:"px-4 py-3 border-t border-white/5 flex items-center justify-end gap-2",children:[t.jsx("button",{type:"button",onClick:i,className:"px-3 py-1.5 text-[11px] rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10",children:"Cancel"}),t.jsx("button",{type:"button",onClick:C,disabled:!E,className:"px-3 py-1.5 text-[11px] rounded border transition-colors "+(E?"bg-cyan-500/20 border-cyan-400/60 text-cyan-100 hover:bg-cyan-500/30":"bg-white/[0.04] border-white/10 text-gray-500 cursor-not-allowed"),children:W.kind==="sending"?"Sending…":O>0?`Wait ${Math.ceil(O)}s`:"Submit"})]})]})})};function lt(r,e,o){const i=(1-Math.abs(2*o-1))*e,n=r*6,u=i*(1-Math.abs(n%2-1));let c=0,d=0,h=0;n<1?(c=i,d=u):n<2?(c=u,d=i):n<3?(d=i,h=u):n<4?(d=u,h=i):n<5?(c=u,h=i):(c=i,h=u);const b=o-i/2;return[c+b,d+b,h+b]}function Yi(r,e,o){const i=Math.max(r,e,o),n=Math.min(r,e,o),u=(i+n)/2;if(i===n)return[0,0,u];const c=i-n,d=u>.5?c/(2-i-n):c/(i+n);let h=0;return i===r?h=((e-o)/c+(e<o?6:0))/6:i===e?h=((o-r)/c+2)/6:h=((r-e)/c+4)/6,[h,d,u]}const Wi=()=>{const r=m.useRef(null),e=m.useRef(null),o=m.useRef(null),[i,n]=m.useState(be),[u,c]=m.useState(Ye),[d,h]=m.useState(Fi),[b,z]=m.useState(tt),[P,W]=m.useState(null),[V,$]=m.useState(0),[X,I]=m.useState(!0),[O,E]=m.useState(!1),[C,D]=m.useState(null),[k,A]=m.useState(!1),U=m.useMemo(()=>Ge(d),[d]),K=m.useMemo(()=>Ge(b),[b]);m.useEffect(()=>{var s;(s=e.current)==null||s.setGradientBuffer(U)},[U]),m.useEffect(()=>{var s;(s=e.current)==null||s.setCollisionGradientBuffer(K)},[K]);const j=m.useRef(i);j.current=i;const ee=m.useRef(u);ee.current=u;const R=m.useRef({c:!1,b:!1,shift:!1,alt:!1}),oe=m.useRef(be.simResolution),[a,_]=m.useState(be.simResolution),G=m.useRef(i.juliaC);m.useEffect(()=>{G.current=i.juliaC},[i.juliaC]);const Q=m.useRef({down:!1,mode:"splat",startX:0,startY:0,startCx:0,startCy:0,startCenterX:0,startCenterY:0,startZoom:1.5,startBrushSize:.1,zoomAnchor:[0,0],zoomAnchorUv:[.5,.5],lastX:0,lastY:0,lastT:0,distSinceSplat:0,lastSplatUv:[0,0],rightDragged:!1}),[Fe,ye]=m.useState(null),Pe=m.useRef(0),ge=m.useRef([]),xe=m.useRef(0),we=m.useRef({u:.5,v:.5,vx:0,vy:0,down:!1});m.useEffect(()=>{const s=r.current;if(!s)return;try{const B=new bi(s);e.current=B,B.setParams(j.current),B.setGradientBuffer(U),B.setCollisionGradientBuffer(K);const ie=s.getBoundingClientRect();B.resize(ie.width,ie.height)}catch(B){W(B.message||String(B));return}let f=0,l=performance.now(),p=0,x=performance.now(),y=60,T=j.current.simResolution;oe.current=T;let v=j.current.simResolution,F=0,q=0,te=performance.now(),re=T;const he=B=>{const ie=e.current;if(!ie)return;const N=Math.min(.25,(B-x)/1e3),L=j.current.simResolution,ae=j.current.autoQuality;L!==v&&(T=L,v=L,F=0,q=0,te=B),ae?B-te>ci&&(y<ai&&T>Xe?(F+=N,q=0,F>si&&(T=Math.max(Xe,T-oi),F=0,te=B)):y>ni&&T<L?(q+=N,F=0,q>li&&(T=L,q=0,te=B)):(F*=.9,q*=.9)):T=L,T>L&&(T=L),oe.current=T;const Z=ee.current;if(Z.enabled&&Z.radius>0&&Z.speed>0){p+=N*Z.speed;const[se,ue]=G.current,Re=se+Math.cos(p*6.2831853)*Z.radius,Mt=ue+Math.sin(p*6.2831853)*Z.radius;ie.setParams({...j.current,juliaC:[Re,Mt],simResolution:T})}else ie.setParams({...j.current,simResolution:T});x=B;const le=j.current,ne=we.current;if(le.particleEmitter&&ne.down&&Q.current.mode==="splat"){for(xe.current+=N*le.particleRate;xe.current>=1&&ge.current.length<Se;)xe.current-=1,wt(ne.u,ne.v,ne.vx,ne.vy);ge.current.length>=Se&&(xe.current=0)}if(Ct(ie,N),ie.frame(B),f++,B-l>500){const se=Math.round(f*1e3/(B-l));$(se),y=y*.5+se*.5,f=0,l=B}T!==re&&(_(T),re=T),o.current=requestAnimationFrame(he)};o.current=requestAnimationFrame(he);const ve=new ResizeObserver(()=>{const B=e.current;if(!B||!s)return;const ie=s.getBoundingClientRect();B.resize(ie.width,ie.height)});return ve.observe(s),()=>{var B;o.current&&cancelAnimationFrame(o.current),ve.disconnect(),(B=e.current)==null||B.dispose(),e.current=null}},[]),m.useEffect(()=>{const s=p=>{var y,T,v;const x=(T=(y=p.target)==null?void 0:y.tagName)==null?void 0:T.toLowerCase();x==="input"||x==="textarea"||((p.key==="c"||p.key==="C")&&(R.current.c=!0),(p.key==="b"||p.key==="B")&&(R.current.b=!0),R.current.shift=p.shiftKey,R.current.alt=p.altKey,p.code==="Space"?(p.preventDefault(),n(F=>({...F,paused:!F.paused}))):p.key==="r"||p.key==="R"?(v=e.current)==null||v.resetFluid():p.key==="h"||p.key==="H"?E(F=>!F):p.key==="o"||p.key==="O"?c(F=>({...F,enabled:!F.enabled})):p.key==="Home"&&n(F=>({...F,center:[0,0],zoom:1.5})))},f=p=>{(p.key==="c"||p.key==="C")&&(R.current.c=!1),(p.key==="b"||p.key==="B")&&(R.current.b=!1),R.current.shift=p.shiftKey,R.current.alt=p.altKey},l=()=>{R.current.c=!1,R.current.b=!1,R.current.shift=!1,R.current.alt=!1};return window.addEventListener("keydown",s),window.addEventListener("keyup",f),window.addEventListener("blur",l),()=>{window.removeEventListener("keydown",s),window.removeEventListener("keyup",f),window.removeEventListener("blur",l)}},[]);const fe=m.useCallback(s=>{n(f=>({...f,...s}))},[]),pt=m.useCallback(s=>{c(f=>({...f,...s}))},[]),ft=m.useCallback(()=>{var s;(s=e.current)==null||s.resetFluid()},[]),mt=m.useCallback(s=>{if(s.preventDefault(),Q.current.rightDragged){Q.current.rightDragged=!1;return}const f=$i({copyCurrentC:xt,onReset:()=>{var l;return(l=e.current)==null?void 0:l.resetFluid()},onRecenter:()=>n(l=>({...l,center:[0,0],zoom:1.5})),onToggleOrbit:()=>c(l=>({...l,enabled:!l.enabled})),orbitOn:ee.current.enabled,onTogglePaused:()=>n(l=>({...l,paused:!l.paused})),paused:j.current.paused,onApplyPreset:l=>Ce(l)});D({x:s.clientX,y:s.clientY,items:f})},[]),gt=m.useMemo(()=>({handleInteractionStart:()=>{},handleInteractionEnd:()=>{},openContextMenu:(s,f,l)=>{const p=l.filter(x=>!x.isHeader).map(x=>({label:x.label??"",onClick:()=>{var y;(y=x.action)==null||y.call(x)},danger:!!x.danger})).filter(x=>x.label);p.length!==0&&D({x:s,y:f,items:p})}}),[]),xt=m.useCallback(async()=>{const[s,f]=j.current.juliaC,l=`${s.toFixed(6)}, ${f.toFixed(6)}`;try{await navigator.clipboard.writeText(l)}catch{}},[]),Ce=m.useCallback(s=>{var f;n({...be,...s.params}),s.gradient&&h(s.gradient),z(s.collisionGradient??tt),c(s.orbit??Ye),(f=e.current)==null||f.resetFluid()},[]),vt=m.useCallback(()=>{const s=Ee(j.current,d,ee.current,b),f=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");Ai(s,`toy-fluid-${f}.json`)},[d,b]),Ue=m.useCallback(async()=>{const s=r.current;if(!s)return;const f=Ee(j.current,d,ee.current,b),l=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");try{await Bi(s,f,`toy-fluid-${l}.png`)}catch(p){console.error("[toy-fluid] Save PNG failed:",p)}},[d,b]),bt=m.useCallback(async()=>{const s=r.current;if(!s)return;const f=new Date().toISOString().replace(/[:]/g,"-").replace(/\..+$/,"");try{await Pi(s,`toy-fluid-${f}.png`)}catch(l){console.error("[toy-fluid] Screenshot failed:",l)}},[]),Ie=m.useCallback(async s=>{try{const f=await Ui(s);Ce({id:"loaded",name:f.name??s.name,desc:`Loaded from ${s.name}`,params:f.params,gradient:f.gradient,collisionGradient:f.collisionGradient,orbit:f.orbit})}catch(f){console.error("[toy-fluid] Load failed:",f),alert(`Couldn't load "${s.name}":
${f.message}`)}},[Ce]),me=(s,f)=>s&&f?1:s?ii:f?ri:1,yt=s=>{const f=e.current;if(!f)return;s.target.setPointerCapture(s.pointerId);const l=Q.current;if(l.down=!0,l.startX=s.clientX,l.startY=s.clientY,l.lastX=s.clientX,l.lastY=s.clientY,l.lastT=performance.now(),l.rightDragged=!1,s.button===2)l.mode="pan-pending",l.startCenterX=j.current.center[0],l.startCenterY=j.current.center[1];else if(s.button===1){s.preventDefault(),l.mode="zoom",l.startZoom=j.current.zoom;const p=r.current.getBoundingClientRect(),x=(s.clientX-p.left)/p.width,y=1-(s.clientY-p.top)/p.height,T=p.width/p.height,v=j.current.center[0]+(x*2-1)*T*j.current.zoom,F=j.current.center[1]+(y*2-1)*j.current.zoom;l.zoomAnchor=[v,F],l.zoomAnchorUv=[x,y]}else if(R.current.c)l.mode="pick-c",l.startCx=j.current.juliaC[0],l.startCy=j.current.juliaC[1];else if(R.current.b)l.mode="resize-brush",l.startBrushSize=j.current.brushSize;else{l.mode="splat",l.distSinceSplat=0;const[p,x]=f.canvasToUv(s.clientX,s.clientY);l.lastSplatUv=[p,x],we.current={u:p,v:x,vx:0,vy:0,down:!0},xe.current=0,j.current.particleEmitter||Oe(f,p,x,0,0)}};function Oe(s,f,l,p,x){const y=j.current,T=Ne(p,x,f,l),v=_e(T,y.brushJitter);s.brush(f,l,p*y.brushFlow,x*y.brushFlow,v,y.brushSize,y.brushHardness,y.brushStrength,y.brushMode)}function wt(s,f,l,p){const x=j.current;if(ge.current.length>=Se)return;const v=(Math.hypot(l,p)>1e-4?Math.atan2(p,l):Math.random()*Math.PI*2)+(Math.random()-.5)*2*x.particleSpread*Math.PI,F=x.particleVelocity*(.4+Math.random()*.6),q=Ne(l,p,s,f),te=_e(q,x.brushJitter),re=x.brushSize*.35;ge.current.push({x:s+(Math.random()-.5)*re,y:f+(Math.random()-.5)*re,vx:Math.cos(v)*F,vy:Math.sin(v)*F,life:x.particleLifetime,lifeMax:x.particleLifetime,r:te[0],g:te[1],b:te[2],size:x.brushSize*x.particleSizeScale*(.85+Math.random()*.3)})}function Ct(s,f){const l=ge.current;if(l.length===0)return;const p=j.current,x=Math.exp(-p.particleDrag*f);let y=0;for(let T=0;T<l.length;T++){const v=l[T];if(v.life-=f,v.life<=0||(v.vx*=x,v.vy*=x,v.vy+=p.particleGravity*f,v.x+=v.vx*f,v.y+=v.vy*f,v.x<-.1||v.x>1.1||v.y<-.1||v.y>1.1))continue;const F=Math.max(0,v.life/v.lifeMax),q=[v.r*F,v.g*F,v.b*F];s.brush(v.x,v.y,v.vx*p.brushFlow,v.vy*p.brushFlow,q,v.size,p.brushHardness,p.brushStrength*F,p.brushMode),l[y++]=v}l.length=y}function Ne(s,f,l,p){const x=j.current;switch(x.brushColorMode){case"solid":return[x.brushColor[0],x.brushColor[1],x.brushColor[2]];case"velocity":{const y=Math.min(1,Math.hypot(s,f)*.2),T=(Math.atan2(f,s)/(2*Math.PI)+1)%1;return lt(T,.9,.35+.3*y)}case"gradient":{const y=U;if(!y)return[1,1,1];const v=Math.floor((l+p)*.5*(y.length/4-1))*4;return[y[v]/255,y[v+1]/255,y[v+2]/255]}case"rainbow":default:{const y=Pe.current;return[.5+.5*Math.cos(6.28318*y),.5+.5*Math.cos(6.28318*(y+.33)),.5+.5*Math.cos(6.28318*(y+.67))]}}}function _e(s,f){if(f<=0)return s;const[l,p,x]=Yi(s[0],s[1],s[2]),y=(l+(Math.random()-.5)*f+1)%1;return lt(y,p,x)}const jt=s=>{const f=e.current;if(!f)return;const l=Q.current;if(!l.down)return;R.current.shift=s.shiftKey,R.current.alt=s.altKey;const p=performance.now();if(l.mode==="pick-c"){const N=r.current.getBoundingClientRect(),L=me(R.current.shift,R.current.alt),ae=j.current.zoom,Z=N.width/N.height,le=s.clientX-l.startX,ne=s.clientY-l.startY,se=le/N.width*2*Z*ae*L,ue=-(ne/N.height)*2*ae*L;fe({juliaC:[l.startCx+se,l.startCy+ue]}),G.current=[l.startCx+se,l.startCy+ue],l.lastX=s.clientX,l.lastY=s.clientY,l.lastT=p;return}if(l.mode==="pan-pending"){const N=s.clientX-l.startX,L=s.clientY-l.startY;if(N*N+L*L>Je*Je)l.mode="pan",l.rightDragged=!0;else return}if(l.mode==="zoom"){const N=r.current.getBoundingClientRect(),L=me(R.current.shift,R.current.alt),ae=s.clientY-l.startY,Z=Math.exp(ae*ti*L),le=Math.max(Ve,Math.min(He,l.startZoom*Z)),ne=N.width/N.height,[se,ue]=l.zoomAnchorUv,Re=[l.zoomAnchor[0]-(se*2-1)*ne*le,l.zoomAnchor[1]-(ue*2-1)*le];fe({zoom:le,center:Re});return}if(l.mode==="resize-brush"){const N=s.clientX-l.startX,L=me(R.current.shift,R.current.alt),ae=Math.exp(N/200*L),Z=Math.max(.003,Math.min(.4,l.startBrushSize*ae));fe({brushSize:Z}),ye({x:s.clientX,y:s.clientY});return}if(l.mode==="pan"){const N=r.current.getBoundingClientRect(),L=me(R.current.shift,R.current.alt),ae=j.current.zoom,Z=N.width/N.height,le=s.clientX-l.startX,ne=s.clientY-l.startY,se=-(le/N.width)*2*Z*ae*L,ue=ne/N.height*2*ae*L;fe({center:[l.startCenterX+se,l.startCenterY+ue]}),l.lastX=s.clientX,l.lastY=s.clientY,l.lastT=p;return}const x=Math.max(1,p-l.lastT)/1e3,y=s.clientX-l.lastX,T=s.clientY-l.lastY;l.lastX=s.clientX,l.lastY=s.clientY,l.lastT=p;const v=r.current.getBoundingClientRect(),[F,q]=f.canvasToUv(s.clientX,s.clientY),te=me(R.current.shift,R.current.alt),re=y/v.width/x*te,he=-(T/v.height)/x*te;Pe.current=p*.001%1,we.current={u:F,v:q,vx:re,vy:he,down:!0};const ve=j.current;if(ve.particleEmitter)return;const B=Math.abs(y/v.width),ie=Math.abs(T/v.height);l.distSinceSplat+=Math.hypot(B,ie),!(l.distSinceSplat<Math.max(1e-5,ve.brushSpacing))&&(l.distSinceSplat=0,l.lastSplatUv=[F,q],Oe(f,F,q,re,he))},Le=s=>{Q.current.down=!1,we.current.down=!1;try{s.target.releasePointerCapture(s.pointerId)}catch{}},Tt=s=>{if(!e.current)return;s.preventDefault();const l=me(s.shiftKey,s.altKey),p=Math.pow(.9,-s.deltaY*ei*l),x=r.current.getBoundingClientRect(),y=(s.clientX-x.left)/x.width,T=1-(s.clientY-x.top)/x.height,v=x.width/x.height,F=j.current,q=F.center[0]+(y*2-1)*v*F.zoom,te=F.center[1]+(T*2-1)*F.zoom,re=Math.max(Ve,Math.min(He,F.zoom*p)),he=[q-(y*2-1)*v*re,te-(T*2-1)*re];fe({zoom:re,center:he})};return P?t.jsx("div",{className:"w-full h-full flex items-center justify-center bg-black text-gray-200 p-6",children:t.jsxs("div",{className:"max-w-md",children:[t.jsx("div",{className:"text-lg font-semibold mb-2",children:"This toy needs WebGL2 with float render targets."}),t.jsx("div",{className:"text-xs text-gray-400 whitespace-pre-wrap",children:P})]})}):t.jsx(Pt,{value:gt,children:t.jsxs("div",{className:"w-full h-screen flex flex-col bg-black text-white",children:[t.jsx(Vi,{kind:i.kind,forceMode:i.forceMode,juliaC:i.juliaC,zoom:i.zoom,simResolution:i.simResolution,effectiveSimRes:a,fps:V,orbitOn:u.enabled,paused:i.paused,onSavePng:Ue,onScreenshot:bt,onLoadFile:Ie,onSubmit:()=>A(!0)}),t.jsxs("div",{className:"flex-1 flex min-h-0",children:[t.jsxs("div",{className:"flex-1 relative",children:[t.jsx("canvas",{ref:r,className:"w-full h-full block",style:{touchAction:"none",cursor:Q.current.mode==="pick-c"?"crosshair":Q.current.mode==="pan"?"grabbing":Q.current.mode==="zoom"?"ns-resize":Q.current.mode==="resize-brush"?"ew-resize":"none"},onPointerDown:yt,onPointerMove:s=>{jt(s),ye({x:s.clientX,y:s.clientY})},onPointerUp:Le,onPointerCancel:Le,onPointerEnter:s=>ye({x:s.clientX,y:s.clientY}),onPointerLeave:()=>ye(null),onWheel:Tt,onContextMenu:mt}),Fe&&r.current?(()=>{const s=r.current.getBoundingClientRect(),f=i.brushSize*2*s.width;return t.jsx("div",{className:"pointer-events-none absolute rounded-full border",style:{left:Fe.x-s.left-f/2,top:Fe.y-s.top-f/2,width:f,height:f,borderColor:"rgba(255,255,255,0.6)",borderStyle:i.brushHardness>.5?"solid":"dashed",borderWidth:1,boxShadow:"0 0 0 1px rgba(0,0,0,0.5)"}})})():null,X&&!O?t.jsxs("div",{className:"absolute bottom-2 left-2 px-3 py-2 text-[10px] text-gray-300 bg-black/70 rounded border border-white/10 max-w-[320px]",children:[t.jsxs("div",{className:"flex items-center justify-between mb-1",children:[t.jsx("div",{className:"text-[10px] uppercase text-cyan-300 tracking-wide",children:"Hotkeys"}),t.jsx("button",{onClick:()=>I(!1),className:"text-gray-500 hover:text-gray-200 text-[10px] px-1 leading-none",title:"Hide (press ? to reopen)",children:"×"})]}),t.jsxs("ul",{className:"space-y-0.5 leading-snug",children:[t.jsxs("li",{children:[t.jsx(J,{children:"Drag"})," inject force + dye into the fluid"]}),t.jsxs("li",{children:[t.jsx(J,{children:"B"}),"+",t.jsx(J,{children:"Drag"})," resize the brush live (horizontal = scale)"]}),t.jsxs("li",{children:[t.jsx(J,{children:"C"}),"+",t.jsx(J,{children:"Drag"})," pick Julia c directly on the canvas"]}),t.jsxs("li",{children:[t.jsx(J,{children:"Right-click"}),"+",t.jsx(J,{children:"Drag"})," pan the fractal view"]}),t.jsxs("li",{children:[t.jsx(J,{children:"Right-click"})," (tap) canvas for quick actions menu"]}),t.jsxs("li",{children:[t.jsx(J,{children:"Shift"}),"/",t.jsx(J,{children:"Alt"})," precision modifiers (5× / 0.2×) for any drag"]}),t.jsxs("li",{children:[t.jsx(J,{children:"Wheel"})," zoom · ",t.jsx(J,{children:"Middle"}),"+",t.jsx(J,{children:"Drag"})," smooth zoom · ",t.jsx(J,{children:"Home"})," recenter"]}),t.jsxs("li",{children:[t.jsx(J,{children:"Space"})," pause sim · ",t.jsx(J,{children:"R"})," clear fluid · ",t.jsx(J,{children:"O"})," toggle c-orbit · ",t.jsx(J,{children:"H"})," hide hints"]})]})]}):!O&&t.jsx("button",{onClick:()=>I(!0),className:"absolute bottom-2 left-2 px-2 py-1 text-[10px] text-cyan-300 bg-black/50 rounded border border-white/10 hover:bg-black/70",title:"Show hotkeys",children:"? hotkeys"})]}),t.jsx("div",{className:"w-[320px] h-full border-l border-white/5 bg-[#0b0b0d] flex flex-col min-h-0",children:t.jsx(Si,{params:i,setParams:fe,onReset:ft,orbit:u,setOrbit:pt,gradient:d,setGradient:h,gradientLut:U,collisionGradient:b,setCollisionGradient:z,onPresetApply:Ce,onSaveJson:vt,onSavePng:Ue,onLoadFile:Ie,hideHints:O})}),C&&t.jsx(Ei,{x:C.x,y:C.y,items:C.items,onDismiss:()=>D(null)}),t.jsx(Xi,{open:k,canvas:r.current,state:k?Ee(j.current,d,ee.current,b):null,onClose:()=>A(!1)})]})]})})};function $i(r){return[{label:"Copy c to clipboard",hint:"Re, Im as decimal",onClick:r.copyCurrentC},{label:"Recenter view",hint:"center=(0,0), zoom=1.5",onClick:r.onRecenter},{label:r.paused?"Resume sim":"Pause sim",onClick:r.onTogglePaused},{label:r.orbitOn?"Stop c-orbit":"Start c-orbit",onClick:r.onToggleOrbit},{label:"Clear fluid",hint:"zero velocity + dye",onClick:r.onReset,danger:!0,separatorAbove:!0},...ke.map((e,o)=>({label:`Preset: ${e.name}`,hint:e.desc,onClick:()=>r.onApplyPreset(e),separatorAbove:o===0}))]}const J=({children:r})=>t.jsx("kbd",{className:"px-1 py-[1px] rounded bg-white/[0.08] border border-white/15 text-[9px] font-mono text-gray-100",children:r}),ht=document.getElementById("root");if(!ht)throw new Error("Could not find root element to mount to");const Ki=Bt.createRoot(ht);Ki.render(t.jsx(pe.StrictMode,{children:t.jsx(Wi,{})}));
