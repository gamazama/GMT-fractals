
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
        float s;
        s = step(0.0, z.x + z.y); z.xy = mix(-z.yx, z.xy, s);
        s = step(0.0, z.x + z.z); z.xz = mix(-z.zx, z.xz, s);
        s = step(0.0, z.y + z.z); z.zy = mix(-z.yz, z.zy, s);
        s = step(0.0, z.x + z.w); z.xw = mix(-z.wx, z.xw, s);
        s = step(0.0, z.y + z.w); z.yw = mix(-z.wy, z.yw, s);
        s = step(0.0, z.z + z.w); z.zw = mix(-z.wz, z.zw, s);

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
                iterations: 11,
                paramA: 1.0, paramB: 0.0, paramC: 2.0,
                vec3A: { x: 0, y: 0, z: 0 },
                vec3B: { x: 1, y: 1, z: 1 },
                vec3C: { x: 0, y: 0, z: 0 },
                vec2A: { x: 0, y: 0.5 }
            },
            coloring: {
                mode: 0, // Trap
                repeats: 2, phase: 0, scale: 6.52833425825692, offset: 1.5335980513105973, bias: 2.7028973971996875, twist: 0, escape: 16,
                mode2: 0, // Trap
                scale2: 14.312371802828013, offset2: 3.2910086244771835, repeats2: 6, phase2: 0, bias2: 1, twist2: 0,
                blendMode: 3, blendOpacity: 0,
                layer3Color: "#000000", layer3Scale: 23.20419452683914, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true,
                gradient: [
                    { id: "1773421493405_7", position: 0,                   color: "#FFFFFF", bias: 0.5, interpolation: "linear" },
                    { id: "1773421493405_6", position: 0.143,               color: "#9BF5FF", bias: 0.5, interpolation: "linear" },
                    { id: "1773421493405_5", position: 0.286,               color: "#FFAE55", bias: 0.5, interpolation: "linear" },
                    { id: "1773421493405_4", position: 0.429,               color: "#803000", bias: 0.5, interpolation: "linear" },
                    { id: "1773421493405_3", position: 0.571,               color: "#481700", bias: 0.5, interpolation: "linear" },
                    { id: "1773421493405_2", position: 0.714,               color: "#000000", bias: 0.5, interpolation: "linear" },
                    { id: "1773421493405_1", position: 0.857,               color: "#005662", bias: 0.5, interpolation: "linear" },
                    { id: "1773421493405_0", position: 1,                   color: "#00485E", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000", bias: 0.20422535211267606, interpolation: "linear" },
                    { id: "2", position: 1, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ]
            },
            ao: { aoIntensity: 0.535, aoSpread: 0.004173235403614006, aoSamples: 5, aoEnabled: true, aoMode: true },
            atmosphere: {
                fogNear: 0, fogFar: 100, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.005, glowSharpness: 2, glowColor: "#ffffff", glowMode: false
            },
            materials: {
                diffuse: 1.2, reflection: 0, specular: 0.58, roughness: 0.333,
                rim: 0.1, rimExponent: 15, envStrength: 0.3, envBackgroundStrength: 0.54,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: [
                    { id: "sky", position: 0,   color: "#000000", bias: 0.5, interpolation: "smooth" },
                    { id: "hor", position: 0.5, color: "#223344", bias: 0.5, interpolation: "smooth" },
                    { id: "zen", position: 1,   color: "#88ccff", bias: 0.5, interpolation: "smooth" }
                ]
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 5.636765862528907, shadowSteps: 112, shadowIntensity: 1, shadowBias: 0.002 },
            quality: { detail: 2.5, fudgeFactor: 1, pixelThreshold: 0.5, maxSteps: 300, distanceMetric: 1, estimator: 1.0 }, // Estimator 1 = Linear — matches (r-offset)/dr for IFS
            optics: { camFov: 25, dofStrength: 0, dofFocus: 2.2105886936187744 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.29934375838158195, y: -0.36353705098625344, z: -0.1246062728732116, w: 0.8733312107321335 },
        cameraFov: 25,
        sceneOffset: { x: -1.860237717628479, y: 2.017045259475708, z: 1.8703371286392212, xL: -0.06596317582826194, yL: 0.07221056925599156, zL: 0.06550313881154746 },
        targetDistance: 2.767302989959717,
        cameraMode: "Fly",
        lights: [
            { type: 'Point', position: { x: -0.8183725352111588, y: 1.3532257824970233, z: 1.5729904550803229 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ffffff", intensity: 3, falloff: 1, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
