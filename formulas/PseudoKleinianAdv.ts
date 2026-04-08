
import { FractalDefinition } from '../types';

// Pseudo Kleinian 06 — Scale 1 JuliaBox + Thingy DE + sphere inversion
// By Knighty & Theli-at (Fragmentarium PseudoKleinian06---.frag)
// http://www.fractalforums.com/3d-fractal-generation/fragmentarium-an-ide-for-exploring-3d-fractals-and-other-systems-on-the-gpu/msg32270/
//
// Parameters:
//   paramB  Size         — sphere fold radius: k = max(Size/r², 1)
//   paramC  DEoffset     — DE subtraction offset (inflates surface)
//   vec2A   Thickness    — x=TThickness (DE numerator), y=TThickness2 (cylindrical shell radius)
//   vec2B   Inversion    — mixed mode: x=enable (bool), y=InvRadius (sphere inversion radius²)
//   vec3A   Offset       — Thingy translation offset
//   vec3B   CSize        — box fold half-size per axis; z also used as initial z-offset
//   vec3C   C            — Julia constant (shift per iteration)
//   vec4A   InvCenter    — sphere inversion center (xyz)

export const PseudoKleinian06: FractalDefinition = {
    id: 'PseudoKleinian06',
    name: 'Pseudo Kleinian 06',
    shortDescription: 'Pseudo Kleinian with Thingy DE + sphere inversion. By Knighty & Theli-at.',
    description: 'Pseudo Kleinian fractal (Scale 1 JuliaBox + Thingy DE shape) by Knighty and Theli-at.\n\nProduces intricate Kleinian group limit sets, nested spherical lattices, and soap-film-like bubble networks.\n\nEach iteration applies:\n1. Box fold: p = 2·clamp(p, −CSize, CSize) − p\n2. Sphere fold: k = max(Size/r², 1); p *= k\n3. Julia shift: p += C\n\nThe DE uses the "Thingy" shape — a twisted cylinder cross-section.\n\nWith Inversion enabled, the infinite periodic tiling wraps into a bounded sphere via Möbius inversion, producing the classic Kleinian bubble geometry. InvRadius controls the inversion sphere size; InvCenter positions it.\n\nKey parameters:\n• Size: sphere fold radius. 1 = scale-1 Julia box.\n• CSize: box fold half-size per axis. CSize.z also offsets z before the loop.\n• C: Julia constant shift. Zero = pure Kleinian; non-zero = Julia variant.\n• Inversion: toggle + radius. Wraps infinite tiling into bounded sphere.\n• InvCenter: sphere inversion center. Classic value (1.15, 0.5, −2).\n• Thickness: x=TThickness (DE numerator), y=TThickness2 (shell radius).\n• Offset: translates the Thingy DE shape origin.\n• DEoffset: subtracts from the final DE, inflating the surface.',
    juliaType: 'none',
    tags: ['kleinian', 'box-fold', 'inversion'],

    shader: {
        preamble: `float jkk_r; float jkk_r2;`,
        preambleVars: ['jkk_r', 'jkk_r2'],

        loopInit: `
            jkk_r = 0.0; jkk_r2 = 0.0;
            if (uVec2B.x > 0.5 && uVec2B.y > 0.01) {
                jkk_r = length(z.xyz);
                jkk_r2 = jkk_r * jkk_r;
                z.xyz = (uVec2B.y / max(jkk_r2, 1e-10)) * z.xyz + uVec4A.xyz;
            }
            z.z += uVec3B.z;`,

        function: `
    void formula_PseudoKleinian06(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 cSize = uVec3B;
        z.xyz = 2.0 * clamp(z.xyz, -cSize, cSize) - z.xyz;

        float r2 = dot(z.xyz, z.xyz);
        float k = max(uParamB / max(r2, 1e-10), 1.0);
        z.xyz *= k;
        dr *= k;

        z.xyz += uVec3C;
        trap = min(trap, r2);
    }`,
        loopBody: `formula_PseudoKleinian06(z, dr, trap, c);`,

        getDist: `
    vec3 p = z.xyz - uVec3A;
    float lxy = length(p.xy);
    float rxy = lxy - uVec2A.y;
    float e = uVec2A.x;
    float thingy = (lxy * abs(p.z) - e) / sqrt(dot(p, p) + abs(e));
    float d = abs(0.5 * max(rxy, thingy) / max(dr, 1e-10) - uParamC);
    if (uVec2B.x > 0.5 && uVec2B.y > 0.01) {
        d = jkk_r2 * d / (uVec2B.y + jkk_r * d);
    }
    return vec2(d, iter);
`
    },

    parameters: [
        { label: 'Size',       id: 'paramB', min: 0.01, max: 2.0,  step: 0.001, default: 1.0   },
        { label: 'DEoffset',   id: 'paramC', min: 0.0,  max: 0.01, step: 0.0001,default: 0.0   },
        { label: 'Thickness',  id: 'vec2A',  type: 'vec2', min: 0.0, max: 2.0, step: 0.001,
          default: { x: 0.0, y: 2.0 } },
        { label: 'Inversion',  id: 'vec2B',  type: 'vec2', min: 0.0, max: 2.0, step: 0.01,
          default: { x: 1.0, y: 1.0 }, mode: 'mixed' },
        { label: 'Offset', id: 'vec3A', type: 'vec3', min: -3.0, max: 3.0, step: 0.001,
          default: { x: 0.0, y: 0.0, z: 0.0 } },
        { label: 'CSize',  id: 'vec3B', type: 'vec3', min: 0.0, max: 2.0, step: 0.001,
          default: { x: 1.0, y: 0.5, z: 1.0 }, linkable: true },
        { label: 'C',      id: 'vec3C', type: 'vec3', min: -2.0, max: 2.0, step: 0.001,
          default: { x: 0.0, y: 0.0, z: 0.0 } },
        { label: 'InvCenter', id: 'vec4A', type: 'vec4', min: -3.0, max: 3.0, step: 0.01,
          default: { x: 1.15, y: 0.5, z: -2.0, w: 0.0 } },
    ],

    defaultPreset: {
        formula: 'PseudoKleinian06',
        features: {
            coreMath: {
                iterations: 6,
                paramB: 1.0, paramC: 0.0,
                vec2A: { x: 0.0, y: 2.0 },
                vec2B: { x: 1.0, y: 1.0 },
                vec3A: { x: 0.0, y: 0.0, z: 0.0 },
                vec3B: { x: 1.0, y: 0.5, z: 1.0 },
                vec3C: { x: 0.0, y: 0.0, z: 0.0 },
                vec4A: { x: 1.15, y: 0.5, z: -2.0, w: 0.0 },
            },
            coloring: {
                mode: 3,
                repeats: 50, phase: 0, scale: 20, offset: 0, bias: 1, twist: 0, escape: 2,
                mode2: 0,
                repeats2: 50, phase2: 0, blendMode: 3, blendOpacity: 1, twist2: 0,
                layer3Color: '#ffffff', layer3Scale: 89, layer3Strength: 0, layer3Bump: 0.2, layer3Turbulence: 0,
                gradient: [
                    { id: '1', position: 0,    color: '#1a2a4a', bias: 0.5, interpolation: 'linear' },
                    { id: '2', position: 0.4,  color: '#4a8fbf', bias: 0.5, interpolation: 'linear' },
                    { id: '3', position: 0.75, color: '#d4eaf7', bias: 0.5, interpolation: 'linear' },
                    { id: '4', position: 1,    color: '#ffffff', bias: 0.5, interpolation: 'linear' },
                ],
                gradient2: [
                    { id: '1', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
                    { id: '2', position: 1, color: '#ffffff', bias: 0.5, interpolation: 'linear' },
                ],
            },
            materials: {
                reflection: 0.1, specular: 1.5, roughness: 0.4, diffuse: 1.5, envStrength: 0.3,
                rim: 0, rimExponent: 1, emission: 0, emissionColor: '#ffffff', emissionMode: 0,
                envMapVisible: false, envSource: 1, useEnvMap: true, envRotation: 0,
                envGradientStops: [
                    { id: '1', position: 0,   color: '#0a1525', bias: 0.5, interpolation: 'linear' },
                    { id: '2', position: 0.5, color: '#223344', bias: 0.5, interpolation: 'smooth' },
                    { id: '3', position: 1,   color: '#88aacc', bias: 0.5, interpolation: 'smooth' },
                ],
            },
            atmosphere: {
                fogIntensity: 0.5, fogNear: 0.001, fogFar: 30, fogColor: '#0a1525', fogDensity: 0,
                glowIntensity: 0.02, glowSharpness: 30, glowColor: '#88ccff', glowMode: false,
                aoIntensity: 0.4, aoSpread: 0.1, aoMode: false,
            },
            lighting: { shadows: true, shadowSoftness: 60, shadowIntensity: 1, shadowBias: 0.002 },
            quality: {
                detail: 1, fudgeFactor: 0.8, pixelThreshold: 0.9, maxSteps: 500,
                aaMode: 'Auto', aaLevel: 1, distanceMetric: 1.0, estimator: 4.0,
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false },
            optics: { dofStrength: 0, dofFocus: 1 },
        },
        cameraPos: { x: -0.24, y: 0.93, z: -0.48 },
        cameraRot: { x: 0, y: 0, z: 0, w: 1 },
        cameraFov: 42,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
        targetDistance: 2.0,
        cameraMode: 'Fly',
        lights: [
            { type: 'Point', position: { x: -3.5, y: -1.2, z: 0.8 }, rotation: { x: 0, y: 0, z: 0 },
              color: '#fffacd', intensity: 10, falloff: 30, falloffType: 'Quadratic',
              fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 2, y: 3, z: 4 }, rotation: { x: 0, y: 0, z: 0 },
              color: '#c8deff', intensity: 2, falloff: 40, falloffType: 'Quadratic',
              fixed: false, visible: true, castShadow: true },
        ],
    },
};
