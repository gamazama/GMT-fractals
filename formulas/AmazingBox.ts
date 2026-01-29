
import { FractalDefinition } from '../types';

export const AmazingBox: FractalDefinition = {
    id: 'AmazingBox',
    name: 'Amazing Box',
    shortDescription: 'Architectural fractal discovered by Tglad. Creates complex geometric lattices and Borg-like structures.',
    description: 'Also known as the Mandelbox (Tglad). A folding fractal that creates complex, machine-like architectural structures.',
    
    shader: {
        function: `
    void formula_AmazingBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // Pre-Fold Rotation (Param E = Rot X, Param F = Rot Z)
        float angX = uParamE;
        float angZ = uParamF;
        if (abs(angX) > 0.001 || abs(angZ) > 0.001) {
             float sx = sin(angX), cx = cos(angX);
             float sz = sin(angZ), cz = cos(angZ);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xy = rotZ * z3.xy;
        }

        boxFold(z3, dr, uParamC);
        sphereFold(z3, dr, uParamB, uParamD);
        z.xyz = z3 * uParamA + c.xyz;
        dr = dr * abs(uParamA) + 1.0;
        trap = min(trap, abs(z.x));
    }`,
        loopBody: `formula_AmazingBox(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 1.0, max: 4.0, step: 0.001, default: 2.0 },
        { label: 'Min Radius', id: 'paramB', min: 0.0, max: 1.5, step: 0.001, default: 0.5 },
        { label: 'Folding Limit', id: 'paramC', min: 0.1, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Fixed Radius', id: 'paramD', min: 0.1, max: 3.0, step: 0.001, default: 1.0 },
        { label: 'Rot X (Pre)', id: 'paramE', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Rot Z (Pre)', id: 'paramF', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "AmazingBox",
        features: {
            coreMath: {
                iterations: 21,
                paramA: 2.566,
                paramB: 1.026,
                paramC: 1.445,
                paramD: 1.637,
                paramE: 3.14,
                paramF: 1.57
            },
            geometry: {
                juliaMode: false,
                juliaX: 0.35,
                juliaY: 0.25,
                juliaZ: 0.15
            },
            atmosphere: {
                fogIntensity: 1.0,
                fogColor: "#6DBAB7",
                fogNear: 0.7921,
                fogFar: 7.5076,
                fogDensity: 0,
                glowIntensity: 0.0001,
                glowSharpness: 1,
                aoIntensity: 0.32,
                aoSpread: 0.2925,
                aoMode: false
            },
            materials: {
                diffuse: 1.13,
                reflection: 0,
                specular: 2,
                roughness: 0.2,
                rim: 0,
                rimExponent: 1,
                emission: 0.0001,
                envStrength: 0,
                envMapVisible: false
            },
            coloring: {
                mode: 3.0, // Z-Depth
                scale: 113.5,
                offset: -5.465,
                repeats: 69.1,
                phase: 0.36,
                bias: 1,
                escape: 32.06,
                gradient: [
                    { id: "0", position: 0, color: "#d3f2a3" },
                    { id: "1", position: 0.167, color: "#97e196" },
                    { id: "2", position: 0.333, color: "#6cc08b" },
                    { id: "3", position: 0.5, color: "#4c9b82" },
                    { id: "4", position: 0.667, color: "#217a79" },
                    { id: "5", position: 0.833, color: "#105965" },
                    { id: "6", position: 1, color: "#074050" }
                ],
                mode2: 8.0, // Last Length
                repeats2: 96.2,
                phase2: -2.898,
                blendMode: 6.0, // Bump
                gradient2: [
                    { id: "0", position: 0, color: "#ffffff" },
                    { id: "1", position: 0.293, color: "#000000" },
                    { id: "2", position: 0.903, color: "#ffffff" }
                ],
                layer3Scale: 89,
                layer3Strength: 0
            },
            lighting: {
                shadows: true,
                shadowSoftness: 2000.0,
                shadowIntensity: 1,
                shadowBias: 0.0029
            },
            // UPDATED: Chebyshev (Box) metric and Linear Estimator
            quality: {
                fudgeFactor: 0.5,
                detail: 2,
                pixelThreshold: 0.5,
                maxSteps: 300,
                distanceMetric: 1.0,
                estimator: 1.0
            },
            optics: {
                camType: 0,
                camFov: 60,
                orthoScale: 17.5
            }
        },
        cameraPos: {
            x: 0.95989,
            y: 1.13902,
            z: 1.17910
        },
        cameraRot: {
            x: -0.2350,
            y: 0.3667,
            z: 0.2665,
            w: 0.8598
        },
        sceneOffset: {
            x: 1, y: 1, z: 3,
            xL: -0.65997,
            yL: -0.75248,
            zL: -0.10163
        },
        targetDistance: 1.90,
        cameraMode: "Orbit",
        lights: [
            {
                position: { x: -0.774, y: 0.079, z: 3.089 },
                color: "#FFFFFF",
                intensity: 50,
                falloff: 50,
                falloffType: "Quadratic", fixed: false, visible: true, castShadow: true
            },
            {
                position: { x: 0.05, y: 0.075, z: -0.1 },
                color: "#ff0000",
                intensity: 0.5,
                falloff: 0.5,
                falloffType: "Quadratic", fixed: false, visible: false, castShadow: false
            },
            {
                position: { x: 0.25, y: 0.075, z: -0.1 },
                color: "#0000ff",
                intensity: 0.5,
                falloff: 0.5,
                falloffType: "Quadratic", fixed: false, visible: false, castShadow: false
            }
        ],
        animations: [
            {
                id: "4yFFplV3QPo3KoNaGJwfX",
                enabled: false,
                target: "coreMath.paramA",
                shape: "Sine",
                period: 5,
                amplitude: 1,
                baseValue: 2.566,
                phase: 0,
                smoothing: 0.5
            }
        ]
    }
};
