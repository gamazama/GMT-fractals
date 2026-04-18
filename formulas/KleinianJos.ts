
import { FractalDefinition } from '../types';

// Based on Jos Leys' Kleinian shader (Shadertoy) — adapted to GMT native per-iteration formula.
// Key difference from KleinianMobius: the Y-reflection includes a Z component (Rot Z),
// lifting the Kleinian limit set into full 3D. The threshold formula also uses scaled
// kr/ki/ee constants and a tighter DE clamp (max(DF, 2.0)).

export const KleinianJos: FractalDefinition = {
    id: 'KleinianJos',
    name: 'Kleinian (Jos Leys)',
    shortDescription: 'Jos Leys\' Kleinian with Z-offset reflection — lifts the limit set into full 3D.',
    description: `Kleinian group fractal in the style of Jos Leys. The conditional Y-reflection includes a Z component (Rot Z) that turns the normally flat Kleinian limit set into volumetric 3D structures. Sphere inversion is always applied as a pre-pass.\n\nKlein R/I shape the limit set. Rot Z is the primary 3D control — small values add depth, larger values produce sponge-like volumes. DE Min tunes surface sharpness. Box Size XZ sets the repeat domain. Supports Hybrid Mode, Interlace, Twist, Box Offset, and Julia offset mode.`,
    juliaType: 'offset',
    tags: ['kleinian', 'inversion', 'ifs', 'mobius', 'julia', 'twist'],

    shader: {
        preamble: `
// KleinianJos globals — reset each map() call via loopInit, read in getDist.
// kj_de_prev/curr: DE from the last two iterations. min(prev, curr) in getDist
//                  handles 2-cycle z.y oscillation without the over-conservatism
//                  of a running minimum across all iterations.
float kj_DF      = 1.0;
float kj_d       = 0.0;
float kj_d2      = 0.0;
float kj_de_prev = 1e10;
float kj_de_curr = 1e10;

vec2 kj_wrap(vec2 x, vec2 a, vec2 s) {
    x -= s;
    return (x - a * floor(x / a)) + s;
}`,

        preambleVars: ['kj_DF', 'kj_d', 'kj_d2', 'kj_de_prev', 'kj_de_curr'],

        // Scale + sphere inversion before the iteration loop.
        // Sphere inversion is always active in this variant (no toggle).
        loopInit: `
kj_DF      = 1.0;
kj_d       = 0.0;
kj_d2      = 0.0;
kj_de_prev = 1e10;
kj_de_curr = 1e10;

z.xyz /= uParamC;

// Pre-loop sphere inversion — always on (center+radius from uVec4A)
{
    vec3  invC = uVec4A.xyz;
    float invR = uVec4A.w;
    z.xyz -= invC;
    kj_d   = length(z.xyz);
    kj_d2  = kj_d * kj_d;
    z.xyz  = (invR * invR / max(kj_d2, 1e-10)) * z.xyz;
    z.xyz += invC;
}`,

        function: `
void formula_KleinianJos(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    float a    = uParamA;   // KleinR
    float b    = uParamB;   // KleinI
    float rotZ = uParamD;   // Z offset in Y-reflection — main 3D control

    // Precompute uniform-only constants (invariant across iterations and pixels)
    float ba    = b / a;
    float f     = sign(b) * 0.45;
    float kr    = a * 0.6;
    float ki    = b * 0.6;
    float coeff = f * (2.0 * a - 1.95) * 0.25;
    float expK  = 14.0 - (1.95 - a) * 30.8;   // ee - (1.95-a)*(ee*2.2), ee=14
    vec2 wrapA  = vec2(2.0 * uVec2A.x, 2.0 * uVec2A.y);
    vec2 wrapS  = vec2(-uVec2A.x, -uVec2A.y);

    // Julia offset
    z.xyz += c.xyz;

    // Twist: rotate XY around Z axis, scaled by Z depth
    if (abs(uParamF) > 0.0001) {
        float ang = z.z * uParamF;
        float s = sin(ang), co = cos(ang);
        z.xy = mat2(co, -s, s, co) * z.xy;
    }

    // Shear XY, wrap XZ domain, un-shear
    float shear = z.y * ba;
    z.x  += shear;
    z.xz  = kj_wrap(z.xz, wrapA, wrapS);
    z.x  -= shear;

    // Conditional Y-reflection — Z component (rotZ) lifts limit set into 3D
    float kk        = (z.x + ki) * 0.33;
    float exponent  = -expK * abs(kk);
    float threshold = kr + coeff * sign(kk) * (1.0 - exp(exponent));
    if (z.y >= threshold) {
        z.xyz = vec3(-b, a, rotZ) - z.xyz;
    }

    // Box offset fold (vec3C): shifts domain before the Möbius step
    vec3 boxOff = uVec3C;
    if (dot(boxOff, boxOff) > 0.0001) {
        z.xyz -= boxOff * sign(z.xyz);
    }

    // Möbius sphere inversion — core Kleinian group action
    float inv  = 1.0 / max(dot(z.xyz, z.xyz), 1e-10);
    z.xyz *= -inv;
    z.x    = -b - z.x;
    z.y    =  a + z.y;
    kj_DF *= inv;

    // Last-2-iteration DE — captures both phases of the 2-cycle without
    // being dragged down by transient early iterations.
    kj_de_prev = kj_de_curr;
    kj_de_curr = min(min(z.y, uParamA - z.y), uParamE) / max(kj_DF, 2.0);

    // Orbit trap: min distance to origin (positive, works with logTrap coloring)
    trap = min(trap, length(z.xyz));
}`,

        loopBody: `formula_KleinianJos(z, dr, trap, c);`,

        getDist: `
    // Kleinian DE: minimum of the last two iterations' (min(z.y, a-z.y) / DF).
    // Two iterations captures both 2-cycle phases without transient early-iteration drag.
    float de = min(kj_de_prev, kj_de_curr);

    // Sphere inversion DE correction (undoes pre-loop inversion's metric distortion)
    de = de * kj_d2 / max(uVec4A.w + kj_d * de, 1e-10);

    de *= uParamC;  // rescale from Kleinian space back to world space
    return vec2(abs(de), iter);
`,
    },

    parameters: [
        { label: 'Klein R',    id: 'paramA', min: 0.5,  max: 3.0, step: 0.001, default: 1.9605 },
        { label: 'Klein I',    id: 'paramB', min: -2.0, max: 2.0, step: 0.001, default: 0.0179 },
        { label: 'Scale',      id: 'paramC', min: 0.1,  max: 3.0, step: 0.001, default: 1.0 },
        { label: 'Rot Z',      id: 'paramD', min: -2.0, max: 2.0, step: 0.001, default: 0.0 },
        { label: 'DE Min',     id: 'paramE', min: 0.01, max: 1.0, step: 0.001, default: 0.056 },
        { label: 'Twist',      id: 'paramF', min: -5.0, max: 5.0, step: 0.01,  default: 0.0 },
        { label: 'Box Size XZ', id: 'vec2A', type: 'vec2', min: -4.0, max: 4.0,  step: 0.001,
          default: { x: -0.9702, y: 0.5260 } },
        { label: 'Inv Sphere (xyz=center, w=radius)', id: 'vec4A', type: 'vec4', min: -3.0, max: 3.0, step: 0.001,
          default: { x: -0.1800, y: 1.0320, z: 1.0220, w: 1.1470 } },
        { label: 'Box Offset', id: 'vec3C', type: 'vec3', min: -3.0, max: 3.0, step: 0.001,
          default: { x: 0.0, y: 0.0, z: 0.0 } },
    ],

    defaultPreset: {
        // All fractal parameters from Jos Leys Shadertoy keyframe 0 (verbatim):
        // q[0]=(24, -0.9702, 0.5260, 1.9605)  q[1]=(0.0179, 0.0000, 0.0560, 1.1470)
        // q[2]=(-0.180, 1.032, 1.022)  cam=(0.42, 1.6998, 2.3338)  aim=(-0.2055, -0.954, -0.218)
        formula: 'KleinianJos',
        features: {
            coreMath: {
                iterations: 24,
                paramA: 1.9605,   // qkleinR
                paramB: 0.0179,   // qkleinI
                paramC: 1.0,      // scale (not in original; 1.0 = no change)
                paramD: 0.0,      // qrotZ
                paramE: 0.0560,   // qdeMin
                paramF: 0.0,      // twist (GMT addition)
                vec2A: { x: -0.9702, y: 0.5260 },                   // qboxSize
                vec4A: { x: -0.1800, y: 1.0320, z: 1.0220, w: 1.1470 }, // qInvCenter + qrad
                vec3C: { x: 0.0, y: 0.0, z: 0.0 },
            },
            coloring: {
                mode: 0,
                gradient: [
                    { id: 'kj0', position: 0,    color: '#050210', bias: 0.5, interpolation: 'linear' },
                    { id: 'kj1', position: 0.3,  color: '#1A3060', bias: 0.5, interpolation: 'linear' },
                    { id: 'kj2', position: 0.6,  color: '#4090C0', bias: 0.5, interpolation: 'linear' },
                    { id: 'kj3', position: 0.85, color: '#90D0F0', bias: 0.5, interpolation: 'linear' },
                    { id: 'kj4', position: 1.0,  color: '#F0F8FF', bias: 0.5, interpolation: 'linear' },
                ],
                scale: 3.0, offset: 0.0, repeats: 1, phase: 0, bias: 1, twist: 0, escape: 2,
                gradient2: [
                    { id: '1', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
                    { id: '2', position: 1, color: '#ffffff', bias: 0.5, interpolation: 'linear' },
                ],
                mode2: 0, blendMode: 0, blendOpacity: 0,
                layer3Color: '#ffffff', layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
            },
            atmosphere: {
                fogIntensity: 0.5, fogNear: 0.0, fogFar: 20.0, fogColor: '#020408', fogDensity: 0.05,
                glowIntensity: 0.0, glowSharpness: 3.0, glowMode: false, glowColor: '#ffffff',
                aoIntensity: 0.3, aoSpread: 0.1, aoMode: false,
            },
            lighting: { shadows: true, shadowSoftness: 12.0, shadowIntensity: 1, shadowBias: 0.002 },
            quality: {
                detail: 2, fudgeFactor: 0.4, pixelThreshold: 0.5,
                maxSteps: 220, estimator: 1, distanceMetric: 0,
            },
            geometry: { juliaMode: false },
            materials: {
                diffuse: 1.2, reflection: 0.05, specular: 0.8, roughness: 0.55,
                rim: 0.1, rimExponent: 3, envStrength: 0, envBackgroundStrength: 1,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: '#ffffff',
                envGradientStops: [
                    { id: 'bg0', position: 0,   color: '#050210' },
                    { id: 'bg1', position: 0.5, color: '#0A1830' },
                    { id: 'bg2', position: 1.0, color: '#050210' },
                ],
            },
            optics: { camFov: 60, dofStrength: 0, dofFocus: 5.0 },
        },
        // Camera from Shadertoy keyframe 0: position=(0.42, 1.6998, 2.3338), aim=(-0.2055, -0.954, -0.218).
        // Quaternion rotates GMT default forward (0,0,1) to the aim direction (verified numerically).
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.7630, y: -0.1644, z: 0.0, w: 0.6254 },
        sceneOffset: { x: 0.4200, y: 1.6998, z: 2.3338, xL: 0, yL: 0, zL: 0 },
        targetDistance: 1.587,
        cameraMode: 'Orbit',
        lights: [
            {
                type: 'Point',
                position: { x: 10, y: 10, z: 10 },
                rotation: { x: 0, y: 0, z: 0 },
                color: '#FFFFFF', intensity: 3.6, falloff: 0.5,
                falloffType: 'Quadratic', fixed: true, visible: true, castShadow: true,
            },
            {
                type: 'Point',
                position: { x: -10, y: -10, z: -10 },
                rotation: { x: 0, y: 0, z: 0 },
                color: '#AACCFF', intensity: 1.0, falloff: 0.5,
                falloffType: 'Quadratic', fixed: true, visible: true, castShadow: false,
            },
        ],
    },
};
