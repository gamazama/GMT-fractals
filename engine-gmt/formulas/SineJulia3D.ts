
import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

// Sine Julia 3D — port of the formula + DE from amoser's "Sine Fractal 3D"
// (Shadertoy, 2026). Original Shadertoy is CC-BY-NC-SA 3.0 (Shadertoy default).
// Family discussion + DE history: https://fractalforums.org/index.php?topic=5591.0
// Pupukuusikko developed an independent DE for the same family on that thread;
// amoser also notes Kosalos' Shadertoy uses Pupukuusikko's DE
// (https://www.shadertoy.com/view/73jGW1). This port uses amoser's DE.
//
// The map iterates:
//     z' = scale * vec3(sin(x)*cosh(y), cos(x)*sinh(y)*cos(z), sin(z)*cosh(y)) + c
// and tracks the running maximum of dz² (multiplied each iter by a closed-form scalar S)
// to build a distance estimate of the form 0.25 * scale * inverseSqrt(max(dz²)). A
// pre-iteration sphere inversion and a once-applied 3-axis rotation control the framing.
//
// Scope of this port: formula + DE + framing transforms only. The original Shadertoy's
// shading stack (Minnaert diffuse, mini-probe GI, screen-space SSS, halation, ACES,
// vignette/grain, QCAA) is NOT ported — GMT renders this through its own lighting path.
export const SineJulia3D: FractalDefinition = {
    id: 'SineJulia3D',
    name: 'Sine Julia 3D',
    shortDescription: 'Julia sets of a 3D extension of s·sin(z)+c (amoser). Kleinian-like limit-set forms.',
    description: 'Julia sets of a 3D extension of the complex family s·sin(z)+c. The 3D map and its distance estimator are from amoser\'s "Sine Fractal 3D" Shadertoy (2026, CC-BY-NC-SA); the family is discussed on fractalforums.org thread 5591, where Pupukuusikko developed an independent DE. The map is not conformal, so the Julia sets stretch and distort — but for many parameters they look strikingly like Kleinian limit groups. A pre-iteration sphere inversion and per-axis rotation control the framing. Only the formula + DE are ported; shading is GMT\'s standard pipeline, not the original Shadertoy\'s post-stack.',
    juliaType: 'julia',

    shader: {
        preamble: `
        // Per-pixel running state for the sine-Julia derivative tracker.
        // Declared at preamble (global) scope so loopInit + loopBody share it;
        // listed in preambleVars so interlace can rename them when this formula is secondary.
        float sj_dz2;
        vec3  sj_cWrap;
        `,
        function: `
    void formula_SineJulia3D(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // Per-iter input wrap into the principal sin/cos period.
        // (Wrap-once works too but per-iter is robust to large scale·sinh excursions.)
        p.xz = mod(p.xz + PI, TAU) - PI;

        float scale = uParamA;
        float scale2 = scale * scale;

        // Extended sine: real sin/cos in xz, hyperbolic in y (which plays the imaginary role).
        float sx = sin(p.x), cx = cos(p.x);
        float sz = sin(p.z), cz = cos(p.z);
        float shy = sinh(p.y), chy = cosh(p.y);

        vec3 newZ = scale * vec3(sx * chy, cx * shy * cz, sz * chy) + sj_cWrap;

        // Per-iter derivative scalar S — closed form from amoser, comes from differentiating
        // the extended-sine Jacobian and averaging over axes. max(S, 0.5) guards against
        // overshoot in regions where the inversion has compressed the derivative.
        float cx2 = cx * cx;
        float cz2 = cz * cz;
        float shy2 = shy * shy;
        float A = cx2 + cz2;
        float B = cx2 * cz2;
        float S = scale2 * (shy2 * (2.0 + A - B) + A + B) / 3.0;
        S = max(S, 0.5);

        sj_dz2 *= S;
        // Engine bailout uses dot(z.xyz, z.xyz); keep dr as the running max(sqrt(dz²)) for getDist.
        dr = max(dr, sqrt(sj_dz2));

        // Orbit trap: minimum of |x|, |z| matches amoser's resColor.xz channel — picks up
        // the cylindrical "skeleton" of the set.
        trap = min(trap, min(abs(newZ.x), abs(newZ.z)));

        z.xyz = newZ;
    }`,
        loopInit: `
        // Apply amoser's three per-plane "post-rotation" angles once, before iteration.
        // vec3B.x → xy plane, vec3B.y → yz plane, vec3B.z → xz plane.
        {
            float cs = cos(uVec3B.x), sn = sin(uVec3B.x);
            vec2 t = z.xy;
            z.x = cs * t.x - sn * t.y;
            z.y = sn * t.x + cs * t.y;
        }
        {
            float cs = cos(uVec3B.y), sn = sin(uVec3B.y);
            vec2 t = z.yz;
            z.y = cs * t.x - sn * t.y;
            z.z = sn * t.x + cs * t.y;
        }
        {
            float cs = cos(uVec3B.z), sn = sin(uVec3B.z);
            vec2 t = z.xz;
            z.x = cs * t.x - sn * t.y;
            z.z = sn * t.x + cs * t.y;
        }

        // Sphere inversion: vec3A = center, paramC = radius. Derivative scales by R²/|p|².
        float sj_invR = uParamC;
        float sj_invScale = (sj_invR * sj_invR) / max(dot(z.xyz, z.xyz), 1e-10);
        z.xyz = z.xyz * sj_invScale + uVec3A;

        // Initial dz² inherits the inversion's derivative squared; floor matches amoser (0.00001).
        sj_dz2 = max(sj_invScale * sj_invScale, 1e-5);

        // Wrap the Julia constant once into the fundamental domain (sin is periodic).
        sj_cWrap = (uJuliaMode > 0.5) ? uJulia : c.xyz;
        sj_cWrap.xz = mod(sj_cWrap.xz + PI, TAU) - PI;

        // Seed dr at the dz² floor; dr will be max(dr, sqrt(dz²)) each iter.
        dr = sqrt(sj_dz2);
        `,
        loopBody: `formula_SineJulia3D(z, dr, trap, c);`,
        // Custom DE: 0.25 * scale * inverseSqrt(max_dz²). dr already carries sqrt(max_dz²).
        getDist: `
            float d = 0.25 * uParamA / max(dr, 1e-5);
            return vec2(d, iter);
        `,
        preambleVars: ['sj_dz2', 'sj_cWrap'],
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.4, max: 2.5, step: 0.001, default: 1.0 },
        { label: 'Inv. Center', id: 'vec3A', type: 'vec3', min: -3.14159, max: 3.14159, step: 0.001, default: { x: 1.5708, y: 0, z: 0 }, scale: 'pi' },
        { label: 'Inv. Radius', id: 'paramC', min: 0.3, max: 2.5, step: 0.001, default: 1.0 },
        { label: 'Pre-Rotation', id: 'vec3B', type: 'vec3', min: -3.14159, max: 3.14159, step: 0.001, default: { x: 0, y: 0, z: 0 }, scale: 'pi', mode: 'axes' },
    ],

    defaultPreset: {
        formula: 'SineJulia3D',
        features: {
            coreMath: {
                iterations: 12,
                paramA: 1.0,
                paramC: 1.0,
                vec3A: { x: 1.5708, y: 0, z: 0 },
                vec3B: { x: 0, y: 0, z: 0 },
            },
            geometry: {
                juliaMode: true,
                juliaX: 0,
                juliaY: 0,
                juliaZ: 0,
            },
            quality: {
                detail: 3,
                pixelThreshold: 0.5,
                maxSteps: 500,
                fudgeFactor: 0.5,
                distanceMetric: 0,
            },
            coloring: {
                mode: 1,
                scale: 1.0,
                offset: 0,
                repeats: 1,
                phase: 0,
                bias: 1,
                escape: 1e10,
            },
            optics: { camFov: 60 },
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0, y: 0, z: 0, w: 1 },
        sceneOffset: { x: 0, y: 0, z: 2.5, xL: 0, yL: 0, zL: 0 },
        targetDistance: 2.5,
        cameraMode: 'Orbit',
        lights: [
            {
                type: 'Directional',
                position: { x: 0, y: 1, z: 0.3 },
                rotation: { x: 0, y: 0, z: 0 },
                color: '#fff2d9',
                intensity: 1.2,
                falloff: 0,
                falloffType: 'Quadratic',
                fixed: false,
                visible: true,
                castShadow: true,
            },
        ],
    },
};
