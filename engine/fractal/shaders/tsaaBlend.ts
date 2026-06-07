/**
 * FRAG_TSAA_BLEND — temporal-AA accumulator blend for the fractal MRT pass.
 *
 * Reads the current jittered frame (Main + Fx attachments) and the running
 * history, writes the incremental running average `mix(hist, cur, 1/N)`.
 * Generic over the two MRT attachments — no fluid-sim coupling — so both
 * fluid-toy's FluidEngine and the Gradient Explorer's FractalColorRenderer
 * share it (carved out of fluid-toy's display.ts, no fork).
 *
 * @see engine/fractal/FractalColorRenderer.ts
 */
export const FRAG_TSAA_BLEND = /* glsl */ `#version 300 es
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
}`;
