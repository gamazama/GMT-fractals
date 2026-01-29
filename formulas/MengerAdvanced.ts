
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
        
        // 1. Rotation
        float angX = uParamC; float angZ = uParamD;
        float sx = sin(angX), cx = cos(angX);
        float sz = sin(angZ), cz = cos(angZ);
        mat2 rotX = mat2(cx, -sx, sx, cx);
        mat2 rotZ = mat2(cz, -sz, sz, cz);
        z3.yz = rotX * z3.yz;
        z3.xy = rotZ * z3.xy;

        // 2. Menger Sorting (The Sponge Logic)
        z3 = abs(z3);
        if (z3.x < z3.y) z3.xy = z3.yx;
        if (z3.x < z3.z) z3.xz = z3.zx;
        if (z3.y < z3.z) z3.yz = z3.zy;
        
        // 3. UBER FEATURE: Inner Box Fold (Param E)
        // Injects Mandelbox-like complexity inside the sponge voids
        if (uParamE > 0.0) {
            float limit = uParamE;
            z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        }

        // 4. Scaling & IFS
        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        float offset = uParamB;
        
        z3 = z3 * scale - vec3(offset * (scale - 1.0));
        
        // 5. UBER FEATURE: Z-Scale (Param F)
        // Calculate Adaptive Stretch based on alignment with the Z-Axis.
        float zScale = uParamF;
        float stretchFactor = 1.0;
        
        if (abs(zScale - 1.0) > 0.01) {
            if (zScale < 1.0) {
                 // Squashing: Conservative bound (1.0) prevents overstepping artifacts
                 stretchFactor = 1.0;
            } else {
                 // Stretching: Adaptive derivative optimization to skip empty space faster
                 // If the point is aligned with Z, it suffers full stretch.
                 // If it is perpendicular (X/Y), it suffers minimal stretch.
                 float alignment = abs(z3.z) / (length(z3) + 1.0e-9);
                 stretchFactor = mix(1.0, zScale, alignment);
            }
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
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 3.0 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 3.0, step: 0.001, default: 1.0 },
        { label: 'Rot X', id: 'paramC', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Rot Z', id: 'paramD', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Inner Fold', id: 'paramE', min: 0.0, max: 1.5, step: 0.01, default: 0.5 }, 
        { label: 'Z Scale', id: 'paramF', min: 0.2, max: 3.0, step: 0.01, default: 1.5 }, // Reduced min to 0.2
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
            geometry: {
                juliaMode: false,
                juliaX: 0,
                juliaY: 0,
                juliaZ: 0,
                hybridMode: false,
                hybridIter: 2,
                hybridScale: 2,
                hybridMinR: 0.5,
                hybridFixedR: 1,
                hybridFoldLimit: 1,
                hybridAddC: false,
                hybridComplex: false,
                hybridProtect: true,
                hybridSkip: 1,
                hybridSwap: false
            },
            quality: {
                fudgeFactor: 1,
                detail: 3, 
                pixelThreshold: 0.5,
                maxSteps: 300,
                distanceMetric: 0,
                estimator: 4.0 // Linear (2.0)
            },
            coreMath: {
                iterations: 12,
                paramA: 2.236, // Sqrt(5)
                paramB: 1,
                paramC: 0,
                paramD: 0.88,
                paramE: 0.618, // Golden Ratio
                paramF: 0.442  // Z Scale
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
                        position: { x: -0.985, y: 1.872, z: 2.008 },
                        color: "#ffffff",
                        intensity: 9.18,
                        falloff: 0,
                        falloffType: "Quadratic",
                        fixed: false,
                        visible: true,
                        castShadow: true
                    },
                    {
                        position: { x: 2, y: -1, z: 1 },
                        color: "#ff8800",
                        intensity: 0.5,
                        falloff: 0,
                        falloffType: "Quadratic",
                        fixed: false,
                        visible: false,
                        castShadow: true
                    },
                    {
                        position: { x: 0, y: -5, z: 2 },
                        color: "#0088ff",
                        intensity: 0.25,
                        falloff: 0,
                        falloffType: "Quadratic",
                        fixed: false,
                        visible: false,
                        castShadow: true
                    }
                ]
            },
            optics: {
                camType: 0,
                camFov: 60,
                orthoScale: 2,
                dofStrength: 0,
                dofFocus: 10
            },
            navigation: {
                flySpeed: 0.5,
                autoSlow: true
            }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.045, y: -0.453, z: 0.141, w: 0.879 },
        sceneOffset: { x: -4, y: 0, z: 3, xL: 0.35, yL: -0.27, zL: 0.18 },
        targetDistance: 2.98,
        cameraMode: "Orbit",
        renderMode: "Direct",
        animations: [],
        sequence: { durationFrames: 300, fps: 30, tracks: {} },
        duration: 300
    }
};
