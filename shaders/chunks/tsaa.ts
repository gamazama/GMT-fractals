/**
 * @engine/shaders/tsaa — generic TSAA (Temporal Super-Sampling AA) helpers.
 *
 * Two tiny GLSL snippets that any renderer can compose into its pipeline:
 *
 *   - `tsaaJitter(screenCoord)` returns a sub-pixel offset in [-0.5, 0.5]²
 *     driven by the engine's blue-noise texture. Caller multiplies by the
 *     pixel size and adds to the primary-ray UV before iteration.
 *
 *   - `tsaaAccumulate(history, current, n)` is the progressive running
 *     average: `mix(history, current, 1/n)`. Pair with a ping-pong FBO
 *     and a frame counter that resets whenever a scene parameter changes.
 *
 * Dependencies: the jitter snippet calls `getBlueNoise4` from
 * `shaders/chunks/blue_noise.ts` — include BOTH snippets in the shader,
 * and declare `uBlueNoiseTexture`, `uBlueNoiseResolution`, `uFrameCount`
 * uniforms (blue_noise.ts reads those).
 */

export const TSAA = /* glsl */ `
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
`;
