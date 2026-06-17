/**
 * Re-exports every shader constant used by FluidEngine. Source files
 * group programs by responsibility:
 *
 *   common.ts   — shared GLSL chunks (OKLab, gradient sampler, vertex)
 *   julia.ts    — fractal kernel (FRAG_JULIA, with deep-zoom path)
 *   sim.ts     — fluid-sim pipeline (motion, advect, pressure, splat...)
 *   display.ts  — composite + bloom + TSAA blend + interior mask
 *   utility.ts  — clear / copy / reproject
 */

export { OKLAB_GLSL, GRADIENT_SAMPLE_GLSL, VERT_FULLSCREEN } from './common';
export { FRAG_JULIA } from './julia';
export {
    FRAG_MOTION,
    FRAG_ADDFORCE,
    FRAG_INJECT_DYE,
    FRAG_ADVECT,
    FRAG_DIVERGENCE,
    FRAG_CURL,
    FRAG_VORTICITY,
    FRAG_PRESSURE,
    FRAG_GRADSUB,
    FRAG_SPLAT,
} from './sim';
export {
    FRAG_DISPLAY,
    FRAG_BLOOM_EXTRACT,
    FRAG_BLOOM_DOWN,
    FRAG_BLOOM_UP,
    FRAG_TSAA_BLEND,
} from './display';
export {
    FRAG_CLEAR,
    FRAG_COPY,
    FRAG_COPY_MRT,
    FRAG_REPROJECT,
} from './utility';
