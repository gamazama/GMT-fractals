
import { FractalDefinition } from '../types';

export const MarbleMarcher: FractalDefinition = {
    id: 'MarbleMarcher',
    name: 'Marble Marcher',
    shortDescription: 'The dynamic fractal from the game Marble Marcher. Fast rendering, geometric feel.',
    description: 'The dynamic fractal from the game Marble Marcher. A specialized Menger Sponge IFS with rotation and shifting steps.',
    
    shader: {
        function: `
    void formula_MarbleMarcher(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // 1. Abs
        z3 = abs(z3);
        
        // 2. Rot Z (Param C)
        float ang1 = uParamC;
        if (abs(ang1) > 0.001) {
            float s1 = sin(ang1), c1 = cos(ang1);
            z3.xy = mat2(c1, s1, -s1, c1) * z3.xy;
        }
        
        // 3. Menger Fold
        // Equivalent to: if (x<y) swap; if (x<z) swap; if (y<z) swap;
        float a = min(z3.x - z3.y, 0.0); z3.x -= a; z3.y += a;
        a = min(z3.x - z3.z, 0.0); z3.x -= a; z3.z += a;
        a = min(z3.y - z3.z, 0.0); z3.y -= a; z3.z += a;
        
        // 4. Rot X (Param D)
        float ang2 = uParamD;
        if (abs(ang2) > 0.001) {
            float s2 = sin(ang2), c2 = cos(ang2);
            z3.yz = mat2(c2, s2, -s2, c2) * z3.yz;
        }
        
        // 5. Scale (Param A)
        float scale = uParamA;
        z3 *= scale;
        dr *= abs(scale); // Standard IFS scaling
        
        // 6. Shift (Params B, E, F)
        // Original game uses a single vec3 shift. We map params.
        vec3 shift = vec3(uParamB, uParamE, uParamF);
        z3 += shift;
        
        if (uJuliaMode > 0.5) z3 += c.xyz;

        z.xyz = z3;
        
        // Use a box trap for coloring to match geometric nature
        vec3 boxDist = abs(z3) - vec3(1.0);
        trap = min(trap, length(max(boxDist, 0.0)) + min(max(boxDist.x, max(boxDist.y, boxDist.z)), 0.0));
    }`,
        loopBody: `formula_MarbleMarcher(z, dr, trap, c);`,
        getDist: `
            // The original used a hardcoded Box SDF: length(max(abs(z)-6.0, 0.0))
            // We now use 'r' which comes from DE_MASTER and respects the global Distance Metric.
            // NOTE: Select 'Chebyshev' in Quality settings for the classic look!
            float limit = 6.0;
            return vec2((r - limit) / dr, iter);
        `
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 1.0, max: 4.0, step: 0.001, default: 2.0 },
        { label: 'Shift X', id: 'paramB', min: -5.0, max: 5.0, step: 0.01, default: -2.0 },
        { label: 'Rot Z', id: 'paramC', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Rot X', id: 'paramD', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Shift Y', id: 'paramE', min: -5.0, max: 5.0, step: 0.01, default: -2.0 },
        { label: 'Shift Z', id: 'paramF', min: -5.0, max: 5.0, step: 0.01, default: -2.0 },
    ],

    defaultPreset: {
        formula: "MarbleMarcher",
        features: {
            coreMath: { iterations: 21, paramA: 1.89, paramB: -2.16, paramC: -0.047, paramD: 0.025, paramE: -2.84, paramF: -2.47 },
            coloring: {
                mode: 6, // Decomposition
                repeats: 2.5, phase: 0, scale: 1, offset: 0, bias: 1, twist: 0, escape: 16.18,
                mode2: 6, // Decomposition
                repeats2: 250, phase2: 5, blendMode: 2, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "1766936009557_0", position: 0.0369, color: "#130606", bias: 0.5, interpolation: "linear" },
                    { id: "1766936025161", position: 0.1409, color: "#463434", bias: 0.5, interpolation: "linear" },
                    { id: "1766936020401", position: 0.4194, color: "#828282", bias: 0.5, interpolation: "linear" },
                    { id: "1766936032564", position: 0.6879, color: "#BCBCBC", bias: 0.5, interpolation: "linear" },
                    { id: "1766936039597", position: 1, color: "#875656", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#FFFFFF" }
                ]
            },
            texturing: { active: false, scaleX: 4, scaleY: 24, offset: {x:-0.02,y:-0.08}, mapU: 6, mapV: 8, layer1Data: null },
            materials: {
                reflection: -0.44, specular: 0, roughness: 0.5, diffuse: 0.92, envStrength: 0,
                rim: 0, rimExponent: 4, emission: 0.085, emissionColor: "#ffffff", emissionMode: 1,
                envMapVisible: false, envSource: 1, useEnvMap: true, envRotation: 0,
                envGradientStops: [{ id: "0", position: 0.03, color: "#130606" }, { id: "1", position: 0.14, color: "#463434" }, { id: "2", position: 0.41, color: "#824040" }, { id: "3", position: 0.68, color: "#BCBCBC" }, { id: "4", position: 1, color: "#875656" }]
            },
            atmosphere: {
                fogNear: 0, fogFar: 100, fogColor: "#7E6861", fogDensity: 0,
                glowIntensity: 0.0001, glowSharpness: 400, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0.44, aoSpread: 0.28, aoMode: false
            },
            geometry: { juliaMode: false, juliaX: -2, juliaY: 0.86, juliaZ: -2, hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1 },
            lighting: { shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.0007 },
            // UPDATED: Default to Chebyshev (1.0) so it looks correct out of the box
            quality: { detail: 1.1, fudgeFactor: 0.62, pixelThreshold: 0.5, maxSteps: 300, distanceMetric: 1.0 },
            optics: { dofStrength: 0, dofFocus: 4.65 }
        },
        cameraPos: { x: 1.7472844097880647, y: -1.3734380139592728, z: 2.8232426812200377 },
        cameraRot: { x: 0.23927126357209905, y: 0.22332520402424524, z: 0.14464802218445671, w: 0.9337837358587185 },
        cameraFov: 75,
        sceneOffset: { x: 2, y: -2, z: 2, xL: -0.25680194984918847, yL: 0.6967983054660813, zL: 0.44809374764147025 },
        targetDistance: 0.5,
        cameraMode: "Orbit",
        lights: [
            { position: { x: 0.936, y: -2.75, z: 6.21 }, color: "#ffffff", intensity: 8, falloff: 0.67, falloffType: "Linear", fixed: false, visible: true, castShadow: true },
            { position: { x: -5, y: -2, z: 2 }, color: "#ff8800", intensity: 1, falloff: 0, falloffType: "Linear", fixed: false, visible: false, castShadow: false },
            { position: { x: 0, y: 0, z: -5 }, color: "#0044ff", intensity: 1, falloff: 0, falloffType: "Linear", fixed: false, visible: false, castShadow: false }
        ],
        animations: [
            { id: "2JfG4QE8x4GkvGQU5DKqx", enabled: false, target: "coreMath.paramA", shape: "Sine", period: 5, amplitude: 1, baseValue: 1.89, phase: 0, smoothing: 0.5 }
        ]
    }
};