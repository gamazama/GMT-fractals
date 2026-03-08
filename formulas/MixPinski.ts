
import { FractalDefinition } from '../types';

// MixPinski — Darkbeam's 4D Sierpinski-Menger hybrid
// Original: darkbeam_MixPinski.frag (M3D code, rewritten by Darkbeam 16/04/20)
// Conversion: Faithful port of the original Fragmentarium formula to GMT native.
//
// The name "MixPinski" = Mix of [Sier]pinski: it hybridizes 4D Sierpinski folds
// with a Menger-like scale-fold-scale transform, producing intricate geometric structures.
//
// Parameter mapping from original .frag:
//   scaleS   → paramA (Sierpinski scale, default 1.0)
//   w        → paramB (4th dimension init, default 0.0 — wired as z.w by DE_MASTER)
//   scaleM   → paramC (Menger scale, default 2.0)
//   offsetD  → hardcoded 1.0 in getDist (GMT has DE offset in Quality panel)
//   offsetS  → vec3A.xyz + vec2A.x (4D Sierpinski offset, default {0,0,0,0})
//   offsetM  → vec3B.xyz + vec2A.y (4D Menger offset, default {1,1,1,0.5})
//   rotation → vec3C (3D rotation via Rodrigues formula)

export const MixPinski: FractalDefinition = {
    id: 'MixPinski',
    name: 'MixPinski',
    shortDescription: '4D Sierpinski-Menger hybrid by Darkbeam. Rich geometric detail.',
    description: 'Darkbeam\'s MixPinski — a 4D hybrid combining Sierpinski tetrahedron folds (extended to 4D with w-component) and a Menger-like fold-scale transform. The interplay of these two IFS systems produces extraordinary geometric complexity.',

    shader: {
        preamble: `
    // Pre-calculated rotation values for MixPinski (computed once per frame)
    vec3 uMixPinski_rotAxis = vec3(0.0, 1.0, 0.0);
    float uMixPinski_rotCos = 1.0;
    float uMixPinski_rotSin = 0.0;

    void MixPinski_precalcRotation() {
        if (abs(uVec3C.z) > 0.001) {
            float azimuth = uVec3C.x;
            float pitch = uVec3C.y;
            float rotAngle = uVec3C.z * 0.5;

            float cosPitch = cos(pitch);
            uMixPinski_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );

            uMixPinski_rotSin = sin(rotAngle);
            uMixPinski_rotCos = cos(rotAngle);
        }
    }`,

        function: `
    void formula_MixPinski(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // --- Stage 1: 4D Sierpinski Folds ---
        // Six reflective folds across all pairs of axes (extends 3D tetrahedron folds to 4D)
        if (z.x + z.y < 0.0) z.xy = -z.yx;
        if (z.x + z.z < 0.0) z.xz = -z.zx;
        if (z.y + z.z < 0.0) z.zy = -z.yz;
        if (z.x + z.w < 0.0) z.xw = -z.wx;
        if (z.y + z.w < 0.0) z.yw = -z.wy;
        if (z.z + z.w < 0.0) z.zw = -z.wz;

        // Sierpinski scale + offset (4D)
        float scaleS = uParamA;
        z *= scaleS;
        dr *= abs(scaleS);

        // offsetS: vec3A.xyz for xyz, vec2A.x for w
        z.xyz += uVec3A;
        z.w += uVec2A.x;

        // --- Stage 2: Menger-like Fold-Scale ---
        float scaleM = uParamC;
        float sm1 = scaleM - 1.0;

        // Standard IFS scale-offset on x, y, w
        z.x = scaleM * z.x - uVec3B.x * sm1;
        z.y = scaleM * z.y - uVec3B.y * sm1;
        z.w = scaleM * z.w - uVec2A.y * sm1;

        // Z-axis: Menger fold (abs-fold around center, then scale)
        float zCenter = 0.5 * uVec3B.z * sm1 / scaleM;
        z.z -= zCenter;
        z.z = -abs(z.z);
        z.z += zCenter;
        z.z *= scaleM;

        dr *= abs(scaleM);

        // --- Stage 3: Optional 3D Rotation ---
        if (abs(uVec3C.z) > 0.001) {
            z.xyz = z.xyz * uMixPinski_rotCos
                  + cross(uMixPinski_rotAxis, z.xyz) * uMixPinski_rotSin
                  + uMixPinski_rotAxis * dot(uMixPinski_rotAxis, z.xyz) * (1.0 - uMixPinski_rotCos);
        }

        // Julia mode
        if (uJuliaMode > 0.5) z.xyz += c.xyz;

        // Orbit trap coloring (matches original: abs(vec4(z.xyz, r2)))
        float r2 = dot(z.xyz, z.xyz) + z.w * z.w;
        trap = min(trap, length(abs(vec4(z.xyz, r2))));
    }`,

        loopBody: `formula_MixPinski(z, dr, trap, c);`,
        loopInit: `MixPinski_precalcRotation();`,

        // Custom DE: 4D Chebyshev norm (faithful to original)
        // Offset hardcoded to 1.0 (original default). Use Quality panel estimator for tweaks.
        getDist: `
            float r4d = max(max(max(abs(z.x), abs(z.y)), abs(z.z)), abs(z.w));
            float d = (r4d - 1.0) / max(abs(dr), 1e-10);
            return vec2(d, iter);
        `
    },

    parameters: [
        { label: 'Sierpinski Scale', id: 'paramA', min: 0.1, max: 4.0, step: 0.001, default: 1.0 },
        { label: 'Menger Scale', id: 'paramC', min: 0.1, max: 4.0, step: 0.001, default: 2.0 },
        { label: 'W (4th Dim)', id: 'paramB', min: -5.0, max: 5.0, step: 0.01, default: 0.0 },
        { label: 'Sierpinski Offset', id: 'vec3A', type: 'vec3', min: -5.0, max: 5.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Menger Offset', id: 'vec3B', type: 'vec3', min: -5.0, max: 5.0, step: 0.01, default: { x: 1, y: 1, z: 1 } },
        { label: '4D Offsets', id: 'vec2A', type: 'vec2', min: -5.0, max: 5.0, step: 0.01, default: { x: 0, y: 0.5 } },
        { label: 'Rotation', id: 'vec3C', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
    ],

    defaultPreset: {
        formula: "MixPinski",
        features: {
            coreMath: {
                iterations: 13,
                paramA: 1.0, paramB: 0.0, paramC: 2.0,
                vec3A: { x: 0, y: 0, z: 0 },
                vec3B: { x: 1, y: 1, z: 1 },
                vec3C: { x: 0, y: 0, z: 0 },
                vec2A: { x: 0, y: 0.5 }
            },
            coloring: {
                mode: 0, // Trap
                repeats: 3.0, phase: 0.0, scale: 1.5, offset: 0.0, bias: 1, twist: 0, escape: 16.0,
                mode2: 4, // Angle
                repeats2: 1, phase2: 0, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0.2, layer3Turbulence: 0,
                gradient: [
                    { id: "mp_0", position: 0, color: "#1a1a2e", bias: 0.5, interpolation: "linear" },
                    { id: "mp_1", position: 0.15, color: "#16213e", bias: 0.5, interpolation: "linear" },
                    { id: "mp_2", position: 0.3, color: "#0f3460", bias: 0.5, interpolation: "linear" },
                    { id: "mp_3", position: 0.45, color: "#533483", bias: 0.5, interpolation: "linear" },
                    { id: "mp_4", position: 0.6, color: "#e94560", bias: 0.5, interpolation: "linear" },
                    { id: "mp_5", position: 0.75, color: "#f5a623", bias: 0.5, interpolation: "linear" },
                    { id: "mp_6", position: 0.9, color: "#e8d5b7", bias: 0.5, interpolation: "linear" },
                    { id: "mp_7", position: 1.0, color: "#1a1a2e", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#FFFFFF" }
                ]
            },
            atmosphere: {
                fogNear: 0, fogFar: 100, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 200, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0.3, aoSpread: 0.5
            },
            materials: {
                reflection: 0.0, specular: 0.3, roughness: 0.5, diffuse: 1.2, envStrength: 0,
                rim: 0, rimExponent: 4, emission: 0.1, emissionColor: "#ffffff", emissionMode: 0
            },
            geometry: {
                juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0,
                hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1
            },
            lighting: { shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.002 },
            quality: { detail: 1, fudgeFactor: 1, pixelThreshold: 0.5, maxSteps: 300, estimator: 1.0 }, // Estimator 1 = Linear (1.0) — matches (r-offset)/dr
            optics: { dofStrength: 0, dofFocus: 0.38 }
        },
        cameraPos: { x: -2.5, y: 1.8, z: 2.8 },
        cameraRot: { x: -0.18, y: -0.38, z: -0.07, w: 0.9 },
        cameraFov: 60,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: 0.5, y: 1.2, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ffffff", intensity: 1.4, falloff: 1, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
