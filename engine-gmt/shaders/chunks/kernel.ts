/**
 * KernelFeatures — the compile-time kernel feature gates, threaded as ONE object from
 * ShaderBuilder into the kernel chunk builders (DE_MASTER reads `numericDE`; getTraceGLSL
 * reads `refine` + `mb3dFaithful`) instead of loose positional booleans.
 *
 * @invariant Every gate is a TS-level emission gate, NOT a GLSL #define: when a gate is
 * false/absent, ZERO GLSL for that feature is emitted and the kernel source is
 * byte-identical to the ungated kernel (shader-cache friendly, zero compile/runtime cost
 * when off). Do not convert these to #ifdef without superseding ADRs 0084/0085/0088.
 *
 * Adding a gate: extend this interface, read it in the chunk builder that owns the
 * feature, arm it from the owning feature's inject() via the ShaderBuilder setter.
 */
export interface KernelFeatures {
    /** Post-hit surface refinement (damped bisection at the first hit). Armed by the
     *  quality feature when refineSteps > 0. @see docs/adr/0084 */
    refine?: boolean;
    /** Numerical (finite-difference) DE — map()/mapDist() estimate distance from the
     *  escape-radius gradient instead of the analytic dr (no-ADE formulas). Armed by
     *  coreMath when estimator === 7. @see docs/adr/0085 */
    numericDE?: boolean;
    /** MB3D-faithful marcher (overstep clamp + RSFmul damper + msDEsub subtraction).
     *  Armed by the quality feature for imported MB3D scenes. @see docs/adr/0088 */
    mb3dFaithful?: boolean;
}
