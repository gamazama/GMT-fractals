
import { FractalDefinition } from '../types';

export const Bristorbrot: FractalDefinition = {
    id: 'Bristorbrot',
    name: 'Bristorbrot',
    shortDescription: 'Analytic hybrid. Mixes sharp edges with smooth bulbous forms.',
    description: 'A hybrid formula that mixes folding and analytical functions.',
    
    shader: {
        function: `
    void formula_Bristorbrot(inout vec4 z, inout float dr, inout float trap, vec4 c, mat2 rotX, mat2 rotZ) {
        vec3 z3 = z.xyz;
        
        // Twist F
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        z3.yz = rotX * z3.yz;
        z3.xy = rotZ * z3.xy;
        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = y * (2.0 * x - z_);
        z3.z = z_ * (2.0 * x + y);
        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;
        z3 = z3 * uParamA + c.xyz;
        
        // Shift E (X)
        if (abs(uParamE) > 0.001) z3.x += uParamE;
        
        // Offset B (Y)
        if (abs(uParamB) > 0.001) z3.y += uParamB;

        dr *= abs(uParamA);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,
        loopInit: `
        float angC = uParamC;
        float sC = sin(angC), cC = cos(angC);
        mat2 rotX = mat2(cC, -sC, sC, cC);
        
        float angD = uParamD;
        float sD = sin(angD), cD = cos(angD);
        mat2 rotZ = mat2(cD, -sD, sD, cD);
        `,
        loopBody: `formula_Bristorbrot(z, dr, trap, c, rotX, rotZ);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 3.0, step: 0.001, default: 1.0 },
        { label: 'Offset', id: 'paramB', min: -2.0, max: 2.0, step: 0.001, default: 0.0 }, 
        { label: 'Rot X', id: 'paramC', min: 0.0, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Rot Z', id: 'paramD', min: 0.0, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Shift X', id: 'paramE', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "Bristorbrot",
        features: {
            coreMath: { iterations: 21, paramA: 0.738, paramB: 0, paramC: 0, paramD: 1.2, paramE: 0.98, paramF: 0.97 },
            coloring: {
                mode: 1, // Iterations
                repeats: 24.4, phase: 3.9, scale: 24.415, offset: 3.906, bias: 1, twist: 0, escape: 4,
                mode2: 5, // Normal
                repeats2: 1, phase2: 2.4, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0.2, layer3Turbulence: 0,
                gradient: [
                    { id: "0", position: 0, color: "#ff0000" },
                    { id: "1", position: 0.17, color: "#ffff00" },
                    { id: "2", position: 0.33, color: "#00ff00" },
                    { id: "3", position: 0.5, color: "#00ffff" },
                    { id: "4", position: 0.67, color: "#000000" },
                    { id: "5", position: 0.83, color: "#ff00ff" },
                    { id: "6", position: 1, color: "#ff0000" }
                ],
                gradient2: [
                    { id: "1", position: 0.61, color: "#FFFFFF" },
                    { id: "2", position: 0.88, color: "#FF0505" }
                ]
            },
            atmosphere: {
                fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.067, glowSharpness: 480, glowColor: "#FF2323", glowMode: true,
                aoIntensity: 0, aoSpread: 0.22
            },
            materials: {
                reflection: 0.35, specular: 0, roughness: 0.42, diffuse: 1.02, envStrength: 0,
                rim: 0.02, rimExponent: 2.6, emission: 0.004, emissionColor: "#ffffff", emissionMode: 0
            },
            geometry: {
                juliaMode: true, juliaX: 1.04, juliaY: 0.21, juliaZ: 0.81,
                hybridMode: true, hybridIter: 1, hybridScale: 1, hybridMinR: 0.79, hybridFixedR: 1.08, hybridFoldLimit: 0.87, hybridSwap: false
            },
            lighting: { shadows: true, shadowSoftness: 2, shadowIntensity: 0.92, shadowBias: 0.015 },
            // Lowered fudgeFactor to 0.6 to fix slicing artifacts
            quality: { detail: 2.8, fudgeFactor: 0.6, pixelThreshold: 0.5, maxSteps: 300, aaMode: "Auto", aaLevel: 1 },
            optics: { dofStrength: 0, dofFocus: 1.368 }
        },
        cameraPos: { x: 0.19278471475118408, y: 1.0849557120921942, z: 5.1524976426487115 },
        cameraRot: { x: -0.10384525583017853, y: 0.016524988834210615, z: -0.017944827094612474, w: 0.994294257635102 },
        cameraFov: 60,
        sceneOffset: { x: 1, y: 1, z: 2, xL: -0.17139723987914707, yL: -0.09973834195017878, zL: -0.12121507460186143 },
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: 0.16245054993746125, y: 0.326925950685747, z: -2.2309267197330493 }, rotation: { x: 0, y: 0, z: 0 }, color: "#99A4FF", intensity: 39.8, falloff: 0.6, falloffType: "Quadratic", fixed: true, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ],
        animations: [
            { id: "4yFFplV3QPo3KoNaGJwfX", enabled: false, target: "coreMath.paramA", shape: "Sine", period: 5, amplitude: 1, baseValue: 0.738, phase: 0, smoothing: 0.5 }
        ]
    }
};
