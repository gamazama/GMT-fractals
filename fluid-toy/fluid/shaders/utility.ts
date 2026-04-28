/**
 * Generic utility passes — clears, copies, and the camera reprojection
 * used when pan/zoom changes mid-frame so dye + velocity stay attached
 * to world-space.
 */

export const FRAG_CLEAR = /* glsl */ `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec4 uValue;
void main() { fragColor = uValue; }`;

// -----------------------------------------------------------------------------
// Single-tap copy — used by render-resolution changes to bilinear-blit
// dye / velocity into freshly-allocated FBOs at the new size. The source
// texture's sampler is set to LINEAR by the caller so the shader sees a
// pre-filtered sample at any (vUv) regardless of source/destination size.
// -----------------------------------------------------------------------------
export const FRAG_COPY = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
void main() { fragColor = texture(uSource, vUv); }`;

// MRT variant — copies juliaTsaa's two attachments (texMain + texAux)
// in lockstep so accumulation can survive a resolution change.
export const FRAG_COPY_MRT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
layout(location=0) out vec4 outMain;
layout(location=1) out vec4 outAux;
uniform sampler2D uSourceMain;
uniform sampler2D uSourceAux;
void main() {
  outMain = texture(uSourceMain, vUv);
  outAux  = texture(uSourceAux,  vUv);
}`;

// -----------------------------------------------------------------------------
// Bloom chain — Jimenez dual-filter style.
//   1) extract: luminance > threshold, soft knee → half-res source
//   2) downsample 2×: 9-tap tent/box filter (cheap & bright)
//   3) upsample 2×: 9-tap tent, additive blend
// Three levels (½ → ¼ → ⅛ and back) give a wide, soft glow without banding.
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
