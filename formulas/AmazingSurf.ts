
import { FractalDefinition } from '../types';

export const AmazingSurf: FractalDefinition = {
    id: 'AmazingSurf',
    name: 'Amazing Surf',
    shortDescription: 'Sinusoidal variation of the Amazing Box. Creates flowing, melted machinery.',
    description: 'A variant of the Amazing Box that introduces sinusoidal waves. Now with Wave Twist and Vertical Shift.',
    
    shader: {
        function: `
    void formula_AmazingSurf(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        float limit = 1.0;
        z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        float r2 = max(dot(z3,z3), 1e-10);
        float mR2 = max(uParamB * uParamB, 1e-10);
        if (r2 < mR2) { z3 *= (1.0/mR2); dr *= (1.0/mR2); }
        else if (r2 < 1.0) { z3 *= (1.0/r2); dr *= (1.0/r2); }
        z3 = z3 * uParamA + c.xyz;
        
        // Param E: Wave Twist
        float twist = 0.0;
        if (abs(uParamE) > 0.001) twist = z3.z * uParamE;
        
        // Param F: Vertical Shift
        if (abs(uParamF) > 0.001) z3.y += uParamF;

        z3 += vec3(sin(z3.y * uParamC + twist), cos(z3.x * uParamC + twist), 0.0) * uParamD * 0.1;
        dr = dr * abs(uParamA) + 1.0;
        z.xyz = z3;
        trap = min(trap, abs(z3.z));
    }`,
        loopBody: `formula_AmazingSurf(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 1.0, max: 5.0, step: 0.001, default: 3.0 },
        { label: 'Min Radius', id: 'paramB', min: 0.0, max: 1.5, step: 0.001, default: 0.8 },
        { label: 'Wave Freq', id: 'paramC', min: 0.0, max: 10.0, step: 0.1, default: 6.0 },
        { label: 'Wave Amp', id: 'paramD', min: 0.0, max: 2.0, step: 0.01, default: 0.5 },
        { label: 'Wave Twist', id: 'paramE', min: -5.0, max: 5.0, step: 0.01, default: 0.0 },
        { label: 'Vert Shift', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "AmazingSurf",
        features: {
            coreMath: { iterations: 21, paramA: 3.03, paramB: 0.47, paramC: 1, paramD: 1, paramE: 0, paramF: 0 },
            coloring: {
                mode: 6, // Decomposition
                repeats: 1, phase: 1.44, scale: 1, offset: 1.44, bias: 1, twist: 0, escape: 100,
                mode2: 4, // Angle
                repeats2: 2284.7, phase2: 2.4, blendMode: 6, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "1767122909918_0", position: 0, color: "#DF7200", bias: 0.5, interpolation: "linear" },
                    { id: "1767122909918_1", position: 0.5, color: "#cc8800", bias: 0.5, interpolation: "linear" },
                    { id: "1767122909918_2", position: 1, color: "#ffeeaa", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#ffffff" }
                ]
            },
            texturing: { active: false, scaleX: 1, scaleY: 1, offset: {x:0,y:0}, mapU: 6, mapV: 1, layer1Data: null },
            materials: {
                reflection: 0.44, specular: 2, roughness: 0.51, diffuse: 1.01, envStrength: 0,
                rim: 0, rimExponent: 4, emission: 0.00, emissionColor: "#ffffff", emissionMode: 0,
                envMapVisible: false, useEnvMap: true, envSource: 1, envRotation: 0,
                envGradientStops: [ { id: "1767120246151", position: 0, color: "#88ccff", bias: 0.5, interpolation: "linear" }, { id: "hor", position: 0.5, color: "#223344", bias: 0.5, interpolation: "smooth" }, { id: "zen", position: 0.9454191033138402, color: "#88ccff", bias: 0.5, interpolation: "smooth" } ]
            },
            atmosphere: {
                fogIntensity: 1.0,
                fogNear: 0.0001, fogFar: 7.988, fogColor: "#362624", fogDensity: 0.2,
                glowIntensity: 0.0001, glowSharpness: 360, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0.2, aoSpread: 0.147, aoMode: false
            },
            lighting: { shadows: true, shadowSoftness: 128, shadowIntensity: 0.97, shadowBias: 0.11 },
            quality: { detail: 2, fudgeFactor: 0.45, pixelThreshold: 0.9, maxSteps: 300, aaMode: "Auto", aaLevel: 1, estimator: 1.0 },
            geometry: { juliaMode: false, juliaX: 0.06, juliaY: -2, juliaZ: 2, hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1, hybridSkip: 1 },
            optics: { dofStrength: 0.0001, dofFocus: 0.662 }
        },
        cameraPos: { x: -0.0012166192470455862, y: 0.34651714109424453, z: -0.4225635099851341 },
        cameraRot: { x: 0.0038108513963938193, y: 0.9416221382735623, z: 0.33664033788669406, w: -0.002551280519921562 },
        cameraFov: 60,
        sceneOffset: { x: 0, y: 0, z: 2, xL: 0.007764116549374419, yL: 0.17826292308257122, zL: 0.3614435950429179 },
        targetDistance: 0.504,
        cameraMode: "Orbit",
        lights: [
            { position: { x: 0.06201624057047557, y: -0.0404139584830392, z: -0.6430434715537097 }, color: "#FF9D7B", intensity: 5, falloff: 22, falloffType: "Quadratic", fixed: true, visible: true, castShadow: true },
            { position: { x: 0.05, y: 0.075, z: -0.1 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { position: { x: 0.25, y: 0.075, z: -0.1 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
