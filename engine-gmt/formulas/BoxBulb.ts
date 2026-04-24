
import { FractalDefinition } from '../types';

export const BoxBulb: FractalDefinition = {
    id: 'BoxBulb',
    name: 'Box Bulb',
    shortDescription: 'Hybrid of Box Folds and Mandelbulb Power. Creates "Boxy Bulbs".',
    description: 'A hybrid that combines box/sphere folding with the Mandelbulb power function. Now with rotation controls. (Formerly FoldingBrot)',
    juliaType: 'offset',
    
    shader: {
        function: `
    void DE_Bulb(inout vec3 z, inout float dr, inout float trap, float power) {
        float r = max(length(z), 1.0e-9);
        float rp1 = pow(r, power - 1.0);
        dr = rp1 * power * dr + 1.0;
        float theta = acos(clamp(z.z / r, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        theta *= power;
        phi *= power;
        float zr = rp1 * r;
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        trap = min(trap, r);
    }

    void formula_BoxBulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // Rotation from vec3A
        float angX = uVec3A.x;
        float angZ = uVec3A.z;
        if (abs(angX) > 0.001 || abs(angZ) > 0.001) {
             float sx = sin(angX), cx = cos(angX);
             float sz = sin(angZ), cz = cos(angZ);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xy = rotZ * z3.xy;
        }

        boxFold(z3, dr, 1.0); 
        sphereFold(z3, dr, uParamB, uParamD);
        float scale = uParamC;
        z3 *= scale;
        dr *= abs(scale);
        DE_Bulb(z3, dr, trap, uParamA); 
        z.xyz = z3 + c.xyz;
        trap = min(trap, length(z.xyz));
    }`,
        loopBody: `formula_BoxBulb(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 1.5, max: 16.0, step: 0.001, default: 5.0 },
        { label: 'Min Radius', id: 'paramB', min: 0.0, max: 1.5, step: 0.001, default: 0.5 },
        { label: 'Scale', id: 'paramC', min: 0.5, max: 2.5, step: 0.001, default: 1.0 },
        { label: 'Fixed Radius', id: 'paramD', min: 0.1, max: 2.5, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3A', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0.0, y: 0.0, z: 0.0 }, scale: 'pi', mode: 'rotation' }
    ],

    defaultPreset: {
        formula: "BoxBulb",
        features: {
            coreMath: { iterations: 16, paramA: 5.8386, paramB: 0.321, paramC: 0.91, paramD: 1.279, vec3A: { x: 0, y: 0, z: 0 } },
            coloring: {
                mode: 6, // Decomposition
                repeats: 1, phase: 2.62, scale: 1, offset: 2.62, bias: 1, twist: 0, escape: 33.72,
                mode2: 0, // Trap
                repeats2: 100, phase2: 2.4, blendMode: 3, blendOpacity: 1, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0.2, layer3Turbulence: 0,
                gradient: [
                    { id: "1766255418053_0", position: 0.0642570281124498, color: "#567C1A", bias: 0.5, interpolation: "linear" },
                    { id: "1766255418053_1", position: 0.167, color: "#33A532", bias: 0.5, interpolation: "linear" },
                    { id: "1766255418053_2", position: 0.333, color: "#18DA5F", bias: 0.5, interpolation: "linear" },
                    { id: "1766255418053_3", position: 0.5, color: "#299B77", bias: 0.5, interpolation: "linear" },
                    { id: "1766255418053_4", position: 0.667, color: "#217a79", bias: 0.5, interpolation: "linear" },
                    { id: "1766258643816", position: 0.7469879518072289, color: "#4B0000", bias: 0.5, interpolation: "linear" },
                    { id: "1766255418053_5", position: 0.833, color: "#105965", bias: 0.5, interpolation: "linear" },
                    { id: "1766255418053_6", position: 1, color: "#074050", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#ffffff" }
                ]
            },
            atmosphere: {
                fogNear: 0.0001, fogFar: 501, fogColor: "#132218", fogDensity: 0.14,
                glowIntensity: 0.0001, glowSharpness: 360, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0, aoSpread: 0.1
            },
            materials: {
                reflection: 0.4, specular: 1.05, roughness: 0.25, diffuse: 0.21, envStrength: 0,
                rim: 0, rimExponent: 4, emission: 0.01, emissionColor: "#ffffff", emissionMode: 0
            },
            geometry: { juliaMode: false, juliaX: 0.19, juliaY: -0.93, juliaZ: -0.41, hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1 },
            lighting: { shadows: true, shadowSoftness: 8, shadowIntensity: 0.98, shadowBias: 0.002 },
            quality: { detail: 2.4, fudgeFactor: 0.65, pixelThreshold: 0.9, maxSteps: 300, aaMode: "Auto", aaLevel: 1, estimator: 4.0 }, // Estimator 4 = Linear (2.0)
            optics: { dofStrength: 0, dofFocus: 1.368 }
        },
        cameraPos: { x: 0.25378547286620784, y: 0.054246624931105866, z: 1.9340201043333456 },
        cameraRot: { x: -0.013871509693272319, y: 0.0651855581354543, z: 0.0009062372749709499, w: 0.9977763291256213 },
        cameraFov: 81,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0.06415813902081223, yL: 0.10257047639815663, zL: 0.48918654020794206 },
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: 0.3559846285676508, y: 0.08248395080524681, z: 2.1100465907611543 }, rotation: { x: 0, y: 0, z: 0 }, color: "#99A4FF", intensity: 5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
