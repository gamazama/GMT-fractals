
import { FractalDefinition } from '../types';

export const Dodecahedron: FractalDefinition = {
    id: 'Dodecahedron',
    name: 'Dodecahedron',
    shortDescription: 'Folds space into the symmetry of a Dodecahedron (12 faces).',
    description: 'A folding fractal based on the symmetry of a dodecahedron. Now with twist and shift.',
    
    shader: {
        function: `
    void formula_Dodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        float ang = uParamC;
        float s = sin(ang), c_ang = cos(ang);
        z3.xy = mat2(c_ang, -s, s, c_ang) * z3.xy;
        ang = uParamD;
        s = sin(ang); c_ang = cos(ang);
        z3.yz = mat2(c_ang, -s, s, c_ang) * z3.yz;
        float scale = uParamA;
        float offset = uParamB;
        z3 = abs(z3);
        if(z3.x < z3.y) z3.xy = z3.yx;
        if(z3.x < z3.z) z3.xz = z3.zx;
        if(z3.y < z3.z) z3.yz = z3.zy;
        dodecaFold(z3);
        dodecaFold(z3);
        
        // Param E: Shift
        vec3 shift = vec3(offset * (scale - 1.0));
        if (abs(uParamE) > 0.001) shift.z += uParamE;
        
        z3 = z3 * scale - shift;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,
        loopBody: `formula_Dodecahedron(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 1.0, max: 4.0, step: 0.001, default: 2.5 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Rot X', id: 'paramC', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Rot Z', id: 'paramD', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Z Shift', id: 'paramE', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "Dodecahedron",
        features: {
            coreMath: { iterations: 50, paramA: 2.617, paramB: 1.525, paramC: 0.251, paramD: 0.282, paramE: 1.17, paramF: 0 },
            coloring: {
                mode: 0, // Trap
                repeats: 2.63, phase: 0.42, scale: 2.63, offset: 0.42, bias: 1, twist: 0, escape: 2,
                mode2: 5, // Normal
                repeats2: 1, phase2: 0, blendMode: 2, blendOpacity: 1, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "0", position: 0, color: "#331a00" },
                    { id: "1", position: 0.5, color: "#cc8800" },
                    { id: "2", position: 1, color: "#ffeeaa" }
                ],
                gradient2: [
                    { id: "1", position: 0.61, color: "#FFFFFF" },
                    { id: "2", position: 0.88, color: "#FF0505" }
                ]
            },
            texturing: { active: false, scaleX: 4, scaleY: 24, offset: {x:-0.02,y:-0.08}, mapU: 6, mapV: 8, layer1Data: null },
            materials: {
                reflection: 0.4, specular: 2, roughness: 0.51, diffuse: 2, envStrength: 0,
                rim: 0.03, rimExponent: 4.5, emission: 0.009, emissionColor: "#ffffff", emissionMode: 0,
                envMapVisible: false, envSource: 1, useEnvMap: true, envRotation: 0,
                envGradientStops: [{ id: "0", position: 0.03, color: "#130606" }, { id: "1", position: 0.14, color: "#463434" }, { id: "2", position: 0.41, color: "#824040" }, { id: "3", position: 0.68, color: "#BCBCBC" }, { id: "4", position: 1, color: "#875656" }]
            },
            atmosphere: {
                fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.005, glowSharpness: 19, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0, aoSpread: 0.1
            },
            lighting: { shadows: true, shadowSoftness: 538, shadowIntensity: 1, shadowBias: 0 },
            quality: { detail: 2.4, fudgeFactor: 0.47, pixelThreshold: 0.5, maxSteps: 300, aaMode: "Auto", aaLevel: 1, estimator: 4.0 }, // Estimator 4 = Linear (2.0)
            colorGrading: { saturation: 1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            geometry: { juliaMode: false, juliaX: 0.04, juliaY: -0.12, juliaZ: -0.24, hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1 },
            optics: { dofStrength: 0, dofFocus: 1.515 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.23397578924576956, y: 0.28304121464362475, z: 0.5229543398514255, w: 0.7691955273468777 },
        cameraFov: 60,
        sceneOffset: { x: 2, y: 3, z: 4, xL: -0.5556107642317095, yL: 0.3332098113554696, zL: -0.042659161564751066 },
        targetDistance: 2.637,
        cameraMode: "Fly",
        lights: [
            { position: { x: -1.4194299271962965, y: -0.6167022395401724, z: 3.6185548096036646 }, color: "#99A4FF", intensity: 500, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { position: { x: 0.05, y: 0.075, z: -0.1 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { position: { x: 0.25, y: 0.075, z: -0.1 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ],
        animations: [
            { id: "4yFFplV3QPo3KoNaGJwfX", enabled: false, target: "coreMath.paramA", shape: "Sine", period: 5, amplitude: 1, baseValue: 2.617, phase: 0, smoothing: 0.5 }
        ]
    }
};
