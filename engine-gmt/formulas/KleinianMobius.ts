
import { FractalDefinition } from '../types';

// Original shader by Muhammad Ahmad (Unlicense)
// Converted to GMT native per-iteration formula — supports Hybrid Mode and Interlace.

export const KleinianMobius: FractalDefinition = {
    id: 'KleinianMobius',
    name: 'Kleinian Möbius',
    shortDescription: 'Kleinian IFS with wrap folding, Möbius inversion, twist, box offset, and optional sphere inversion.',
    description: `Kleinian group fractal by Muhammad Ahmad (Unlicense). Each iteration applies an optional Julia offset, XY twist by Z depth, shear+wrap domain folding in XZ, an optional box offset fold, a conditional Y-reflection, and a Möbius sphere inversion. An optional pre-pass sphere inversion warps the whole structure into nested bubble-like forms.\n\nKlein R/I control the shape of the limit set. Box Size XZ sets the repeat domain. Twist spirals the structure along Z. Box Offset shifts the fold domain for asymmetric variations. Sphere Inversion + Inv Sphere parameters unlock organic, sponge-like forms. Supports Hybrid Mode and Interlace with other formulas.`,
    juliaType: 'offset',
    tags: ['kleinian', 'inversion', 'ifs', 'mobius', 'julia', 'twist'],

    shader: {
        preamble: `
// KleinianMobius globals — reset each map() call via loopInit, read in getDist.
// ks_DF:          accumulated Möbius inversion scaling (replaces dr for the Kleinian DE)
// ks_d/d2:        pre-inversion distance for sphere-inversion DE correction
// ks_de_prev/curr: DE from the last two iterations. Using min(prev, curr) in getDist
//                  handles the 2-cycle oscillation of z.y without dragging the DE down
//                  with transient early-iteration values (unlike a running minimum over
//                  all iterations, which is overly conservative in empty space).
float ks_DF      = 1.0;
float ks_d       = 0.0;
float ks_d2      = 0.0;
float ks_de_prev = 1e10;
float ks_de_curr = 1e10;

// Domain-repeat helper: wraps x periodically into [s, s+a)
vec2 km_wrap(vec2 x, vec2 a, vec2 s) {
    x -= s;
    return (x - a * floor(x / a)) + s;
}`,

        preambleVars: ['ks_DF', 'ks_d', 'ks_d2', 'ks_de_prev', 'ks_de_curr'],

        // loopInit runs once before the iteration loop, after z = vec4(p_fractal, uParamB).
        // Applies the one-time coordinate transforms that must bracket the full iteration sequence.
        loopInit: `
ks_DF      = 1.0;
ks_d       = 0.0;
ks_d2      = 0.0;
ks_de_prev = 1e10;
ks_de_curr = 1e10;

// Scale and translate into Kleinian space
z.xyz /= uParamC;
z.xyz += uVec3A;

// Optional pre-loop sphere inversion (paramD: 0 = off, 1 = on)
// Stores d / d2 for the post-iteration DE correction in getDist.
if (uParamD > 0.5) {
    vec3  invC = uVec4A.xyz;
    float invR = uVec4A.w;
    z.xyz -= invC;
    ks_d   = length(z.xyz);
    ks_d2  = ks_d * ks_d;
    z.xyz  = (invR * invR / max(ks_d2, 1e-10)) * z.xyz;
    z.xyz += invC;
}`,

        function: `
void formula_KleinianMobius(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    float a   = uParamA;   // KleinR
    float b   = uParamB;   // KleinI
    float f   = sign(b);

    // Precompute uniform-only constants (invariant across iterations and pixels)
    float ba     = b / a;
    float halfB  = b * 0.5;
    float halfA  = a * 0.5;
    float coeff  = (2.0 * a - 1.95) * 0.25;
    float expK   = 7.2 - (1.95 - a) * 15.0;
    vec2 wrapA   = vec2(2.0 * uVec2A.x, 2.0 * uVec2A.y);
    vec2 wrapS   = vec2(-uVec2A.x, -uVec2A.y);

    // Julia offset (c is non-zero when juliaType='offset' and Julia mode is off / Mandelbrot)
    z.xyz += c.xyz;

    // Twist: rotate XY around Z axis, scaled by Z depth
    if (abs(uParamF) > 0.0001) {
        float ang = z.z * uParamF;
        float s = sin(ang), co = cos(ang);
        z.xy = mat2(co, -s, s, co) * z.xy;
    }

    // Shear XY, wrap XZ domain, un-shear
    z.x += ba * z.y;
    z.xz  = km_wrap(z.xz, wrapA, wrapS);
    z.x  -= ba * z.y;

    // Conditional Y-reflection at the Kleinian limit set boundary
    float xPlusHalfB = z.x + halfB;
    float exponent   = -expK * abs(xPlusHalfB);
    float threshold  = halfA + f * coeff * sign(xPlusHalfB) * (1.0 - exp(exponent));
    if (z.y >= threshold) {
        z.xyz = vec3(-b, a, 0.0) - z.xyz;
    }

    // Box offset fold (vec3C): shifts domain before the Möbius step
    vec3 boxOff = uVec3C;
    if (dot(boxOff, boxOff) > 0.0001) {
        z.xyz -= boxOff * sign(z.xyz);
    }

    // Möbius sphere inversion — core of the Kleinian group action
    float ir = 1.0 / max(dot(z.xyz, z.xyz), 1e-10);
    z.xyz *= -ir;
    z.x    = -b - z.x;
    z.y    =  a + z.y;
    ks_DF *= ir;   // accumulate Möbius scaling for DE

    // Last-2-iteration DE — captures both phases of the 2-cycle without
    // being dragged down by transient early iterations (much tighter than running min).
    // max(ks_DF, 2.0) halves the DE when Möbius scaling hasn't accumulated yet,
    // preventing the overshoot that caused slicing artifacts in earlier versions.
    ks_de_prev = ks_de_curr;
    ks_de_curr = min(min(z.y, uParamA - z.y), uParamE) / max(ks_DF, 2.0);

    // Orbit trap: min distance to origin (positive, works with logTrap)
    trap = min(trap, length(z.xyz));
    // g_orbitTrap (modes 10-13) is updated automatically by the engine after this returns.
}`,

        loopBody: `formula_KleinianMobius(z, dr, trap, c);`,

        getDist: `
    // Kleinian DE: minimum of the last two iterations' (min(z.y, a-z.y) / DF).
    // Two iterations captures both phases of the 2-cycle (no slicing) without being
    // penalized by transient early iterations that would shrink a running-min DE.
    float de = min(ks_de_prev, ks_de_curr);

    // Sphere-inversion DE correction (undoes the pre-loop inversion's metric distortion)
    if (uParamD > 0.5) {
        de = de * ks_d2 / max(uVec4A.w + ks_d * de, 1e-10);
    }

    de *= uParamC;  // rescale from Kleinian space back to world space

    // iter = outer loop count (always reaches uIterations for the Kleinian,
    // which has no escape; coloring mode 1 will use the HYBRID FIX automatically).
    return vec2(abs(de), iter);
`,
    },

    parameters: [
        { label: 'Klein R',          id: 'paramA', min: 0.5,  max: 3.0, step: 0.001, default: 1.8 },
        { label: 'Klein I',          id: 'paramB', min: -2.0, max: 2.0, step: 0.001, default: 0.8 },
        { label: 'Scale',            id: 'paramC', min: 0.1,  max: 3.0, step: 0.001, default: 1.1 },
        { label: 'Sphere Inversion', id: 'paramD', min: 0.0,  max: 1.0, step: 1.0,   default: 1.0,
          options: [{ label: 'Off', value: 0.0 }, { label: 'On', value: 1.0 }] },
        { label: 'Offset',           id: 'vec3A', type: 'vec3', min: -3.0, max: 3.0, step: 0.001,
          default: { x: 0.9, y: 0.8, z: 0.0 } },
        { label: 'Box Size XZ',      id: 'vec2A', type: 'vec2', min: 0.1, max: 4.0, step: 0.001,
          default: { x: 1.0, y: 1.0 } },
        { label: 'Inv Sphere (xyz=center, w=radius)', id: 'vec4A', type: 'vec4', min: -3.0, max: 3.0, step: 0.001,
          default: { x: 1.0, y: 0.96, z: 0.0, w: 0.8 } },
        { label: 'DE Min',     id: 'paramE', min: 0.01, max: 1.0, step: 0.001, default: 0.1 },
        { label: 'Twist',      id: 'paramF', min: -5.0, max: 5.0, step: 0.01,  default: 0.0 },
        { label: 'Box Offset', id: 'vec3C',  type: 'vec3', min: -3.0, max: 3.0, step: 0.001,
          default: { x: 0.0, y: 0.0, z: 0.0 } },
    ],

    defaultPreset: {
        formula: 'KleinianMobius',
        features: {
            coreMath: {
                iterations: 44,
                paramA: 1.969,
                paramB: 0.838,
                paramC: 1.167,
                paramD: 1.0,
                paramE: 0.1,
                paramF: 0.0,
                vec2A: { x: 0.4315, y: 1.0 },
                vec3A: { x: 0.9, y: 0.8, z: 0.0 },
                vec3C: { x: -0.012, y: 0.0, z: 0.0 },
                vec4A: { x: 1.0, y: 1.0665, z: 0.0, w: 0.8 },
            },
            coloring: {
                mode: 0,
                gradient: [
                    { id: 'km0', position: 0,    color: '#0D0508', bias: 0.5, interpolation: 'linear' },
                    { id: 'km1', position: 0.25, color: '#6B2010', bias: 0.5, interpolation: 'linear' },
                    { id: 'km2', position: 0.55, color: '#C87030', bias: 0.5, interpolation: 'linear' },
                    { id: 'km3', position: 0.8,  color: '#E8C880', bias: 0.5, interpolation: 'linear' },
                    { id: 'km4', position: 1.0,  color: '#FFF5E0', bias: 0.5, interpolation: 'linear' },
                ],
                scale: 1.5736930970144798, offset: 0.2993916900429188,
                repeats: 1, phase: 0, bias: 1, twist: 0, escape: 2,
                gradient2: [
                    { id: '1', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
                    { id: '2', position: 1, color: '#ffffff', bias: 0.5, interpolation: 'linear' },
                ],
                mode2: 0, blendMode: 0, blendOpacity: 0,
                layer3Color: '#ffffff', layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
            },
            atmosphere: {
                fogIntensity: 0.5, fogNear: 0.0, fogFar: 20.0, fogColor: '#050202', fogDensity: 0.05,
                glowIntensity: 0.0, glowSharpness: 3.0, glowMode: false, glowColor: '#ffffff',
                aoIntensity: 0.3, aoSpread: 0.1, aoMode: false,
            },
            lighting: { shadows: true, shadowSoftness: 12.0, shadowIntensity: 1, shadowBias: 0.002 },
            quality: {
                detail: 2, fudgeFactor: 0.53, pixelThreshold: 1.0, stepJitter: 0.15,
                maxSteps: 454, estimator: 1, distanceMetric: 0,
            },
            geometry: {
                juliaMode: true,
                juliaX: -0.003, juliaY: 0.0, juliaZ: -0.05,
            },
            materials: {
                diffuse: 1.2, reflection: 0.05, specular: 0.8, roughness: 0.282,
                rim: 0.0255, rimExponent: 8.9, rimColor: '#2bd6ff',
                envStrength: 0.21, envBackgroundStrength: 3,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: '#ffffff',
                envGradientStops: [
                    { id: 'bg0', position: 0,   color: '#0D0508' },
                    { id: 'bg1', position: 0.5, color: '#2A1008' },
                    { id: 'bg2', position: 1.0, color: '#0D0508' },
                ],
            },
            postEffects: { bloomIntensity: 0.26, bloomThreshold: 0.06, bloomRadius: 7, caStrength: 0 },
            colorGrading: {
                active: true, toneMapping: 0, saturation: 1,
                levelsMin: 0, levelsMax: 1, levelsGamma: 1.0585570116002794,
            },
            optics: { camFov: 60, dofStrength: 0.0145, dofFocus: 2.412 },
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0, y: 0, z: 0.12582861189969008, w: 0.9920519948205322 },
        sceneOffset: { x: -1.2157182693481445, y: -0.3581884801387787, z: 2.436081886291504, xL: 0, yL: 0, zL: 0 },
        targetDistance: 2.33270525932312,
        cameraMode: 'Orbit',
        lights: [
            {
                type: 'Point',
                position: { x: -1.3798353004331951, y: 0.293770645959065, z: 1.4829852586923968 },
                rotation: { x: -1.4820303914992985, y: -0.07592122408558381, z: 0.06946977426910066 },
                color: '#2DAEFF', intensity: 0.8, falloff: 0.5,
                falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true,
            },
            {
                type: 'Point',
                position: { x: -10, y: -10, z: -10 },
                rotation: { x: 0, y: 0, z: 0 },
                color: '#AABBFF', intensity: 1.0, falloff: 0.5,
                falloffType: 'Quadratic', fixed: true, visible: false, castShadow: false,
            },
        ],
    },
};
