
import { FractalDefinition } from '../types';

export const Kleinian: FractalDefinition = {
    id: 'Kleinian',
    name: 'Kleinian',
    shortDescription: 'Inversion fractal. Resembles organic structures, coral, and sponge tissues.',
    description: 'Based on Kleinian groups and inversion in a sphere. Creates intricate, bubbly, sponge-like structures.',
    
    shader: {
        function: `
    void formula_Kleinian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        float limit = uParamC;
        z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        float r2 = max(dot(z3, z3), 1e-10);
        float k = max(uParamD / r2, 1.0);
        z3 *= k;
        dr *= k;
        
        // Apply Scale (A) and Offset (B)
        z3 = z3 * uParamA + vec3(uParamB, 0.0, 0.0) + c.xyz;
        dr = dr * abs(uParamA) + 1.0;
        
        z.xyz = z3;
        trap = min(trap, r2);
    }`,
        loopBody: `formula_Kleinian(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 1.0, max: 2.5, step: 0.001, default: 1.8 },
        { label: 'X Offset', id: 'paramB', min: -1.0, max: 1.0, step: 0.001, default: 0.0 }, 
        { label: 'Fold Size', id: 'paramC', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'K Factor', id: 'paramD', min: 0.5, max: 2.0, step: 0.001, default: 1.2 },
    ],

    defaultPreset: {
        formula: "Kleinian",
        features: {
            coreMath: { iterations: 53, paramA: 2.058, paramB: 0, paramC: 0.907, paramD: 0.976, paramE: 1, paramF: 1 },
            coloring: {
                mode: 3, // Z-Depth
                repeats: 100, phase: 0, scale: 126.58, offset: 67.08, bias: 1, twist: 0, escape: 2,
                mode2: 0, // Trap
                repeats2: 100, phase2: 0, blendMode: 3, blendOpacity: 1, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0.2, layer3Turbulence: 0,
                gradient: [
                    { id: "2", position: 0, color: "#FFFFFF", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.8275862068965517, color: "#3E3E3E", bias: 0.5, interpolation: "linear" },
                    { id: "1767121500027", position: 1, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 1, color: "#ffffff", bias: 0.5, interpolation: "linear" }
                ]
            },
            texturing: { active: false, scaleX: 1, scaleY: 1, offset: {x:0,y:0}, mapU: 6, mapV: 1, layer1Data: null },
            materials: {
                reflection: 0, specular: 0, roughness: 0.79, diffuse: 2, envStrength: 0,
                rim: 0, rimExponent: 1, emission: 0.148, emissionColor: "#ffffff", emissionMode: 0,
                envMapVisible: false, envSource: 1, useEnvMap: true, envRotation: 0,
                envGradientStops: [ { id: "1767120246151", position: 0, color: "#88ccff", bias: 0.5, interpolation: "linear" }, { id: "hor", position: 0.5, color: "#223344", bias: 0.5, interpolation: "smooth" }, { id: "zen", position: 0.9454191033138402, color: "#88ccff", bias: 0.5, interpolation: "smooth" } ]
            },
            atmosphere: {
                fogIntensity: 1.0,
                fogNear: 0.0001, fogFar: 501, fogColor: "#5A81A3", fogDensity: 0,
                glowIntensity: 0.035, glowSharpness: 52, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0.29, aoSpread: 0.1, aoMode: false
            },
            lighting: { shadows: true, shadowSoftness: 82.64, shadowIntensity: 1, shadowBias: 0.0014 },
            quality: { detail: 1, fudgeFactor: 0.8, pixelThreshold: 0.9, maxSteps: 300, aaMode: "Auto", aaLevel: 1, distanceMetric: 1.0, estimator: 4.0 }, // Estimator 4 = Linear (2.0)
            geometry: { juliaMode: false, juliaX: 0.5, juliaY: 0.5, juliaZ: 0.5, hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1, hybridSkip: 1 },
            optics: { dofStrength: 0.0001, dofFocus: 0.577 }
        },
        cameraPos: { x: 0, y: 0, z: 3.5 },
        cameraRot: { x: 0, y: 0, z: 0.931234344584406, w: -0.3644209042665525 },
        cameraFov: 80,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
        targetDistance: 0.965,
        cameraMode: "Fly",
        lights: [
            { type: 'Point', position: { x: 0.06202062498807429, y: 0.022274010144572264, z: 3.439439471330585 }, rotation: { x: 0, y: 0, z: 0 }, color: "#8FA9FF", intensity: 0.4, falloff: 0.6760000000000002, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.00041247989335695644, y: -0.00142172416335363, z: 3.0187219870917428 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFB333", intensity: 5, falloff: 142.88399999999996, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: -0.12319987256138526, y: -0.0954216385692699, z: 2.9890303407494763 }, rotation: { x: 0, y: 0, z: 0 }, color: "#3636FF", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: true }
        ]
    }
};
