
import { FractalDefinition } from '../types';

export const Mandelbulb: FractalDefinition = {
    id: 'Mandelbulb',
    name: 'Mandelbulb',
    shortDescription: 'The classic 3D extension of the Mandelbrot set. Features organic, broccoli-like recursive structures.',
    description: 'The classic 3D extension of the Mandelbrot set. Features standard Power controls plus the "Radiolaria" mutation for skeletal/hollow effects.',
    
    shader: {
        function: `
        void formula_Mandelbulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float r = length(z3);
            
            // Standard derivative
            float power = uParamA;
            dr = pow(r, power - 1.0) * power * dr + 1.0;
            
            // Spherical exponentiation
            float theta = acos(clamp(z3.z / r, -1.0, 1.0));
            float phi = atan(z3.y, z3.x);
            
            // Apply Power & Phase Shifts
            theta = theta * power + uParamB; 
            phi = phi * power + uParamC;     
            
            float zr = pow(r, power);
            z3 = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
            
            // Optional Z-Twist (Param D)
            if (abs(uParamD) > 0.001) {
                float twist = z3.z * uParamD;
                float s = sin(twist);
                float c_ = cos(twist);
                z3.xy = mat2(c_, -s, s, c_) * z3.xy;
            }

            z3 += c.xyz;
            
            // --- RADIOLARIA MUTATION (Tom Beddard) ---
            // Applied AFTER iteration to affect the triplex structure, not the world bounding box.
            if (uParamE > 0.5) {
                float limit = uParamF;
                if (z3.y > limit) {
                    z3.y = limit;
                    // Removed trap override to allow gradients to form naturally on the cut surface
                }
            }
            
            z.xyz = z3;
            trap = min(trap, length(z3));
        }`,
        loopBody: `formula_Mandelbulb(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 2.0, max: 16.0, step: 0.001, default: 8.0 },
        { label: 'Theta Phase', id: 'paramB', min: -3.14, max: 3.14, step: 0.01, default: 0.0 },
        { label: 'Phi Phase', id: 'paramC', min: -6.28, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Z Twist', id: 'paramD', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'Radiolaria', id: 'paramE', min: 0.0, max: 1.0, step: 1.0, default: 0.0 }, 
        { label: 'Radio Limit', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.5 },
    ],

    defaultPreset: {
        formula: "Mandelbulb",
        features: {
            coreMath: { iterations: 16, paramA: 8, paramB: 0, paramC: 0, paramD: 0, paramE: 0, paramF: 0.5 },
            geometry: { hybridMode: false, hybridIter: 0, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1, hybridSkip: 1, hybridSwap: false, juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0 },
            coloring: {
                mode: 0, repeats: 40, phase: 0, scale: 40, offset: 0, bias: 1, twist: 0, escape: 1.2,
                mode2: 4, repeats2: 7, phase2: 0, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 20, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [ { id: "2", position: 1, color: "#FFFFFF", bias: 0.5, interpolation: "linear" } ],
                gradient2: [
                    { id: "1767363622003", position: 0, color: "#FFFFFF", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.5, color: "#000000", bias: 0.5, interpolation: "linear" },
                    { id: "1767363615540", position: 1, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ]
            },
            texturing: { active: false, scaleX: 1, scaleY: 1, offset: {x:0,y:0}, mapU: 6, mapV: 1, layer1Data: null },
            atmosphere: {
                fogNear: 0, fogFar: 5, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.00, glowSharpness: 50, glowColor: "#ffffff", glowMode: false
            },
            ao: {
                aoIntensity: 0.28, aoSpread: 0.5, aoMode: false,
                aoEnabled: true, aoSamples: 5, aoStochasticCp: true
            },
            materials: {
                reflection: 0.2, specular: 1, roughness: 0.75, diffuse: 1, envStrength: 0.3,
                rim: 0, rimExponent: 3, emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envMapVisible: false, useEnvMap: true, envSource: 1,
                envGradientStops: [
                    { id: "hor", position: 0, color: "#223344", bias: 0.5, interpolation: "smooth" },
                    { id: "zen", position: 1, color: "#88ccff", bias: 0.5, interpolation: "smooth" }
                ]
            },
            lighting: { shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.001 },
            quality: { detail: 1, fudgeFactor: 1, pixelThreshold: 0.2, maxSteps: 300, distanceMetric: 0.0, estimator: 0.0 },
            optics: { dofStrength: 0, dofFocus: 2 },
            colorGrading: { saturation: 1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 }
        },
        cameraPos: { x: 0, y: 0, z: 2.157 },
        cameraRot: { x: 0, y: 0, z: 0, w: 1 },
        sceneOffset: { x: 0, y: 0, z: 1, xL: 0, yL: 0, zL: -0.157 },
        targetDistance: 2.157,
        cameraMode: "Orbit",
        lights: [
            { position: { x: -0.7, y: 0.37, z: 1.4 }, color: "#ffffff", intensity: 3, falloff: 0.22, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { position: { x: 0.6, y: -0.5, z: 1.4 }, color: "#ff8800", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { position: { x: 0, y: -5, z: 2 }, color: "#0088ff", intensity: 0.25, falloff: 0, falloffType: "Quadratic", fixed: true, visible: true, castShadow: false }
        ],
        renderMode: "Direct",
        navigation: { flySpeed: 0.5, autoSlow: true },
        animations: [],
        sequence: { durationFrames: 300, fps: 30, tracks: {} },
        duration: 300
    }
};
