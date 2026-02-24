import { FractalDefinition } from '../types';

export const HyperbolicMandelbrot: FractalDefinition = {
    id: 'HyperbolicMandelbrot',
    name: 'Poincaré-Ahlfors Mandelbrot',
    shortDescription: 'A true 3D geometric extension of the Mandelbrot set into Hyperbolic 3-Space.',
    description: 'Bypasses the limitations of 3D algebra by using the Poincaré-Ahlfors extension into Hyperbolic 3-Space. This preserves perfect spherical bulbs, exact periodicity, and the true 3D cardioid core without the "smeared" artifacts of standard 3D fractals. Now features generalized Power and Hyperbolic distortion parameters.',
    
    shader: {
        function: `
        void formula_HyperbolicMandelbrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float r = length(z3);
            
            float power = uParamA;
            
            // Z is the 2D complex plane (x, y), T is the hyperbolic height (z)
            float rxy2 = z3.x*z3.x + z3.y*z3.y;
            float rxy = sqrt(rxy2);
            
            // Derivative calculation using full 3D magnitude
            dr = power * pow(r, power - 1.0) * dr + 1.0;
            
            // Ahlfors Extension multiplier: M = (|Z|^2 - T^2) / |Z|^2
            // uParamC (Conformal Shift) distorts the hyperbolic mapping
            float m = (rxy2 - uParamC * z3.z*z3.z) / (rxy2 + 1e-20);
            
            // Apply the conformal 3D power with Phase Twist (uParamD)
            float theta = atan(z3.y, z3.x) * power + uParamD;
            float rxy_p = pow(rxy, power);
            
            // Z_{n+1} = Z_n^p * M + C_z
            float nx = rxy_p * cos(theta) * m + c.x;
            float ny = rxy_p * sin(theta) * m + c.y;
            
            // T_{n+1} = p * |Z_n|^(p-1) * T_n + C_t
            // uParamB scales the hyperbolic height growth, uParamE adds a constant Z-offset
            float nz = power * pow(rxy, power - 1.0) * z3.z * uParamB + c.z + uParamE;
            
            z3 = vec3(nx, ny, nz);
            
            z.xyz = z3;
            trap = min(trap, length(z3) * uParamF);
        }`,
        loopBody: `formula_HyperbolicMandelbrot(z, dr, trap, c);`,
        getDist: `
            float m2 = r * r;
            if (m2 < 1.0e-20) return vec2(0.0, iter);
            
            // Log Smoothing Calculation (Shared)
            // Guarded: Only calculate log smoothing if we have actually escaped (> 1.0)
            float smoothIter = iter;
            if (m2 > 1.0) {
                float threshLog = log2(max(uEscapeThresh, 1.1));
                smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
            }
            
            float d = 0.0;
            float dr_safe = max(abs(dr), 1.0e-20);
            
            // Custom distance estimator for HyperbolicMandelbrot
            // Optimized for hyperbolic geometry - use log-based estimator for all regions
            float logR2 = log2(m2);
            d = 0.17328679 * logR2 * r / dr_safe;
            
            return vec2(d, smoothIter);
        `
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 1.0, max: 16.0, step: 0.01, default: 2.0 },
        { label: 'Hyp. Scale', id: 'paramB', min: -2.0, max: 2.0, step: 0.01, default: 1.0 },
        { label: 'Conformal Shift', id: 'paramC', min: -2.0, max: 2.0, step: 0.01, default: 1.0 },
        { label: 'Phase Twist', id: 'paramD', min: -3.14, max: 3.14, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Z-Offset', id: 'paramE', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'Trap Scale', id: 'paramF', min: 0.1, max: 5.0, step: 0.01, default: 1.0 }
    ],

    defaultPreset: {
        formula: "HyperbolicMandelbrot",
        features: {
            coreMath: { iterations: 64, paramA: 2.0, paramB: 1.0, paramC: 1.0, paramD: 0.0, paramE: 0.0, paramF: 1.0 },
            geometry: { hybridMode: false, hybridIter: 0, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1, hybridSkip: 1, hybridSwap: false, juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0 },
            coloring: {
                mode: 0, repeats: 2, phase: 0, scale: 1, offset: 0, bias: 1, twist: 0, escape: 1.2,
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
            { type: 'Point', position: { x: -0.7, y: 0.37, z: 1.4 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ffffff", intensity: 3, falloff: 0.22, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.6, y: -0.5, z: 1.4 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff8800", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true }
        ],
        renderMode: "Direct",
        navigation: { flySpeed: 0.5, autoSlow: true },
        animations: [],
        sequence: { durationFrames: 300, fps: 30, tracks: {} },
        duration: 300
    }
};
