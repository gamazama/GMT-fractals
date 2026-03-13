
import { FractalDefinition } from '../types';

export const MengerSponge: FractalDefinition = {
    id: 'MengerSponge',
    name: 'Menger Sponge',
    shortDescription: 'The classic cubic fractal. Creates infinite grids and tech-like structures.',
    description: 'The canonical Menger Sponge (Level N). Set Scale to 3.0 and Offset to 1.0 for the classic mathematical shape. Use "Center Z" to toggle between a corner fractal and the full cube.',
    
    shader: {
        function: `
    void formula_MengerSponge(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        if (length(rot) > 0.001) {
             float sx = sin(rot.x), cx = cos(rot.x);
             float sy = sin(rot.y), cy = cos(rot.y);
             float sz = sin(rot.z), cz = cos(rot.z);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotY = mat2(cy, -sy, sy, cy);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xz = rotY * z3.xz;
             z3.xy = rotZ * z3.xy;
        }

        z3 = abs(z3);
        // Branchless sorting network (descending: x >= y >= z)
        vec3 s = z3;
        z3.x = max(max(s.x, s.y), s.z);
        z3.z = min(min(s.x, s.y), s.z);
        z3.y = s.x + s.y + s.z - z3.x - z3.z;
        
        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        float offset = uParamB;
        
        // IFS Shift: offset * (scale - 1.0)
        float shift = offset * (scale - 1.0);
        
        z3 = z3 * scale - vec3(shift);
        
        // Param D: Center Z (The "Full Sponge" Correction)
        // If active, this conditional shift restores the full cubic symmetry
        if (uParamD > 0.5) {
            z3.z += shift * step(z3.z, -0.5 * shift);
        }

        // Param C: Manual Z Shift (Axis Shift)
        if (abs(uParamC) > 0.001) {
            z3.z += uParamC * scale;
        }

        if (uJuliaMode > 0.5) z3 += c.xyz * 0.1;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3 - c.xyz));
    }`,
        loopBody: `formula_MengerSponge(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 1.0, max: 4.0, step: 0.001, default: 3.0 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3A', type: 'vec3', min: -6.28, max: 6.28, step: 0.001, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Z Shift (Man)', id: 'paramC', min: -1.0, max: 1.0, step: 0.01, default: 0.0 },
        { label: 'Center Z', id: 'paramD', min: 0.0, max: 1.0, step: 1.0, default: 1.0 },
    ],

    defaultPreset: {
        formula: "MengerSponge",
        features: {
            coreMath: {
                iterations: 10,
                paramA: 3, paramB: 1.013, paramC: 0.02, paramD: 1,
                vec3A: { x: 0.031, y: 0, z: 0 }
            },
            coloring: {
                gradient: [
                    { id: "1767569325432_0", position: 0, color: "#3d5941", bias: 0.5, interpolation: "linear" },
                    { id: "1767569325432_1", position: 0.167, color: "#778868", bias: 0.5, interpolation: "linear" },
                    { id: "1767569325432_2", position: 0.333, color: "#b5b991", bias: 0.5, interpolation: "linear" },
                    { id: "1767569325432_3", position: 0.5, color: "#f6edbd", bias: 0.5, interpolation: "linear" },
                    { id: "1767569325432_4", position: 0.667, color: "#edbb8a", bias: 0.5, interpolation: "linear" },
                    { id: "1767569325432_5", position: 0.833, color: "#de8a5a", bias: 0.5, interpolation: "linear" },
                    { id: "1767569325432_6", position: 1, color: "#ca562c", bias: 0.5, interpolation: "linear" }
                ],
                mode: 6, scale: 3.099, offset: -0.194, repeats: 3.1, phase: -0.19, bias: 1, twist: 0, escape: 1.9,
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#ffffff" }
                ],
                mode2: 5, scale2: 1, offset2: 0, repeats2: 1, phase2: 0, bias2: 1, twist2: 0,
                blendMode: 0, blendOpacity: 0,
                layer3Color: "#ffffff", layer3Scale: 10, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0
            },
            ao: { aoIntensity: 0.5, aoSpread: 5, aoMode: true, aoEnabled: true },
            atmosphere: {
                fogIntensity: 0, fogNear: 2, fogFar: 10, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 0, glowMode: false, glowColor: "#ffffff"
            },
            materials: {
                diffuse: 1, reflection: 0, specular: 0.2, roughness: 0.8,
                rim: 0, rimExponent: 4, envStrength: 0, envBackgroundStrength: 1,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: []
            },
            colorGrading: { saturation: 1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false },
            lighting: { shadows: true, shadowSoftness: 2000, shadowIntensity: 0.8, shadowBias: 0.001 },
            quality: { fudgeFactor: 1, detail: 1, pixelThreshold: 0.001, maxSteps: 200, estimator: 1.0 },
            optics: { camFov: 50, dofStrength: 0, dofFocus: 10 },
            reflections: { enabled: true, bounces: 1, steps: 64, mixStrength: 1, roughnessThreshold: 0.5 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.3055326162805782, y: -0.23752826799481133, z: -0.07899585109054458, w: 0.9186891736613698 },
        sceneOffset: { x: -1, y: 2, z: 3.12, xL: -0.393, yL: 0.188, zL: -0.252 },
        targetDistance: 2.622,
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: -0.969, y: 1.465, z: 1.325 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ffffff", intensity: 5, falloff: 0, falloffType: "Linear", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: -4, y: -2, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#3344ff", intensity: 0.5, falloff: 0, falloffType: "Linear", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 2.069, y: 1.017, z: 2.748 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff3300", intensity: 0.3, falloff: 0, falloffType: "Linear", fixed: false, visible: false, castShadow: true }
        ],
        animations: []
    }
};
