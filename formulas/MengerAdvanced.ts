
import { FractalDefinition } from '../types';

export const MengerAdvanced: FractalDefinition = {
    id: 'MengerAdvanced',
    name: 'Menger Advanced',
    shortDescription: 'Hybrid Menger Sponge with internal Box Folds and vertical scaling.',
    description: 'An advanced variant of the Menger Sponge. It adds an Inner Box Fold (Param E) to generate machinery-like details inside the voids, and Z-Scale (Param F) for creating towering structures. (Formerly UberMenger)',
    
    shader: {
        function: `
    void formula_MengerAdvanced(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // 1. Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        float sx = sin(rot.x), cx = cos(rot.x);
        float sy = sin(rot.y), cy = cos(rot.y);
        float sz = sin(rot.z), cz = cos(rot.z);
        mat2 rotX = mat2(cx, -sx, sx, cx);
        mat2 rotY = mat2(cy, -sy, sy, cy);
        mat2 rotZ = mat2(cz, -sz, sz, cz);
        z3.yz = rotX * z3.yz;
        z3.xz = rotY * z3.xz;
        z3.xy = rotZ * z3.xy;

        // 2. Menger Sorting (The Sponge Logic)
        z3 = abs(z3);
        vec3 ms = z3;
        z3.x = max(max(ms.x, ms.y), ms.z);
        z3.z = min(min(ms.x, ms.y), ms.z);
        z3.y = ms.x + ms.y + ms.z - z3.x - z3.z;
        
        // 3. UBER FEATURE: Inner Box Fold (Param C)
        // Injects Mandelbox-like complexity inside the sponge voids
        if (uParamC > 0.0) {
            float limit = uParamC;
            z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        }

        // 4. Scaling & IFS
        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        float offset = uParamB;
        
        z3 = z3 * scale - vec3(offset * (scale - 1.0));
        
        // 5. UBER FEATURE: Z-Scale (Param D)
        // Calculate Adaptive Stretch based on alignment with the Z-Axis.
        float zScale = uParamD;
        float stretchFactor = 1.0;
        
        if (abs(zScale - 1.0) > 0.01) {
            // Stretching: adaptive derivative based on Z-alignment
            // Squashing (zScale<1): conservative bound (1.0) prevents overstepping
            float alignment = abs(z3.z) / (length(z3) + 1.0e-9);
            stretchFactor = mix(1.0, mix(1.0, zScale, alignment), step(1.0, zScale));
            z3.z *= zScale;
        }

        // Injection
        if (uJuliaMode > 0.5) z3 += c.xyz;
        
        // Derivative Update (Chain Rule)
        // We multiply by Scale, then by our Calculated Adaptive Stretch
        dr = dr * abs(scale) * stretchFactor;
        
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,
        loopBody: `formula_MengerAdvanced(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 2.236 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 3.0, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3A', type: 'vec3', min: -6.28, max: 6.28, step: 0.001, default: { x: 0, y: 0, z: 0.88 }, mode: 'rotation' },
        { label: 'Inner Fold', id: 'paramC', min: 0.0, max: 1.5, step: 0.01, default: 0.618 },
        { label: 'Z Scale', id: 'paramD', min: 0.2, max: 3.0, step: 0.01, default: 0.442 },
    ],

    defaultPreset: {
        formula: "MengerAdvanced",
        features: {
            atmosphere: {
                fogIntensity: 0,
                fogNear: 2,
                fogFar: 10,
                fogColor: "#000000",
                fogDensity: 0.1,
                glowIntensity: 0,
                glowSharpness: 10,
                glowMode: false,
                glowColor: "#ffffff",
                aoIntensity: 0.2,
                aoSpread: 0.1,
                aoMode: false
            },
            materials: {
                diffuse: 0.9,
                reflection: 0,
                specular: 0.87,
                roughness: 0.34,
                rim: 0.13,
                rimExponent: 16,
                envStrength: 1,
                envMapVisible: true,
                envBackgroundStrength: 0.1,
                envSource: 1,
                useEnvMap: true,
                envRotation: 0,
                envGradientStops: [
                    { id: "0", position: 0, color: "#00C0BF", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.167, color: "#16B178", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.333, color: "#9ccb86", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 0.5, color: "#e9e29c", bias: 0.5, interpolation: "linear" },
                    { id: "4", position: 0.667, color: "#EEBB88", bias: 0.5, interpolation: "linear" },
                    { id: "5", position: 0.833, color: "#E83513", bias: 0.5, interpolation: "linear" },
                    { id: "6", position: 1, color: "#CF0B1E", bias: 0.5, interpolation: "linear" }
                ],
                emission: 0,
                emissionMode: 0,
                emissionColor: "#ffffff",
                ptEmissionMult: 1
            },
            coloring: {
                gradient: [
                    { id: "0", position: 0, color: "#070611", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.32, color: "#111320", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.67, color: "#30306B", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 0.68, color: "#EAAC85", bias: 0.5, interpolation: "linear" },
                    { id: "4", position: 0.82, color: "#975F44", bias: 0.5, interpolation: "linear" },
                    { id: "5", position: 0.97, color: "#170C05", bias: 0.5, interpolation: "linear" }
                ],
                mode: 0,
                scale: 11.72,
                offset: 1.93,
                repeats: 1,
                phase: 0.64,
                bias: 1,
                twist: 0,
                escape: 1.65,
                gradient2: [
                    { id: "1", position: 0, color: "#ffffff", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.47, color: "#353535", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 1, color: "#ffffff", bias: 0.5, interpolation: "linear" }
                ],
                mode2: 0,
                scale2: 32.05,
                offset2: 3.76,
                repeats2: 3.3,
                phase2: 0,
                bias2: 1,
                twist2: 0,
                blendMode: 0,
                blendOpacity: 0,
                layer3Color: "#ffffff",
                layer3Scale: 89,
                layer3Strength: 0,
                layer3Bump: 0,
                layer3Turbulence: 0
            },
            geometry: {},
            quality: {
                fudgeFactor: 1,
                detail: 3, 
                pixelThreshold: 0.5,
                maxSteps: 300,
                distanceMetric: 0,
                estimator: 1.0
            },
            coreMath: {
                iterations: 12,
                paramA: 2.236, // Sqrt(5)
                paramB: 1,
                paramC: 0.618, // Golden Ratio (Inner Fold)
                paramD: 0.442, // Z Scale
                vec3A: { x: 0, y: 0, z: 0.88 } // Rot X/Y/Z
            },
            lighting: {
                shadows: true,
                shadowSoftness: 16,
                shadowIntensity: 0.68,
                shadowBias: 0.001,
                ptBounces: 3,
                ptGIStrength: 1,
                ptStochasticShadows: false,
                lights: [
                    {
                        type: 'Point',
                        position: { x: -0.985, y: 1.872, z: 2.008 },
                        color: "#ffffff",
                        intensity: 9.18,
                        falloff: 0,
                        falloffType: "Quadratic",
                        fixed: false,
                        visible: true,
                        castShadow: true
                    }
                ]
            },
            optics: {},
            navigation: {}
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.045, y: -0.453, z: 0.141, w: 0.879 },
        sceneOffset: { x: -4, y: 0, z: 3, xL: 0.35, yL: -0.27, zL: 0.18 },
        targetDistance: 2.98,
        cameraMode: "Orbit",
        renderMode: "Direct",
    }
};
