
import { FractalDefinition } from '../types';

export const Buffalo: FractalDefinition = {
    id: 'Buffalo',
    name: 'Buffalo 3D',
    shortDescription: 'Mandelbulb variation with absolute-value folds. Creates furry, plate-like textures.',
    description: 'A variation of the Mandelbulb using Absolute Value folds. Uses a Menger-style fold to create structural complexity.',
    
    shader: {
        function: `
    void formula_Buffalo(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // 1. ABSOLUTE FOLD
        z3 = abs(z3);
        
        // 2. MENGER-STYLE SCALE & OFFSET
        // This cuts holes and flattens the geometry
        float scale = uParamB;
        float offset = 1.0;
        z3 = z3 * scale - vec3(offset * (scale - 1.0));
        dr *= abs(scale);

        // 3. ROTATION
        float angX = uParamC;
        float angZ = uParamD;
        if (abs(angX) > 0.0) {
            float s = sin(angX), c_ = cos(angX);
            z3.yz = mat2(c_, -s, s, c_) * z3.yz;
        }
        if (abs(angZ) > 0.0) {
            float s = sin(angZ), c_ = cos(angZ);
            z3.xy = mat2(c_, -s, s, c_) * z3.xy;
        }
        
        // 4. POWER
        float r = length(z3);
        if (r > 1.0e-4) {
            float power = uParamA;
            dr = pow(r, power - 1.0) * power * dr + 1.0;
            
            float theta = acos(clamp(z3.z / r, -1.0, 1.0));
            float phi = atan(z3.y, z3.x);
            
            float zr = pow(r, power);
            theta *= power;
            phi *= power;
            
            z3 = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        } else {
            dr = 1.0; 
        }
        
        z3 += c.xyz;
        z.xyz = z3;
        trap = min(trap, r);
    }`,
        loopBody: `formula_Buffalo(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 2.0, max: 16.0, step: 0.001, default: 8.0 },
        { label: 'Fold Scale', id: 'paramB', min: 1.0, max: 3.0, step: 0.001, default: 1.5 },
        { label: 'Rot X', id: 'paramC', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Rot Z', id: 'paramD', min: 0.0, max: 6.28, step: 0.01, default: 0.0 }
    ],

    defaultPreset: {
        formula: "Buffalo",
        features: {
            coreMath: { iterations: 22, paramA: 2.911, paramB: 1.358, paramC: 1, paramD: 1.27, paramE: 1, paramF: 1 },
            coloring: {
                mode: 0, // Trap
                repeats: 3.58, phase: 0.7, scale: 3.579, offset: 0.6958, bias: 1, twist: 0, escape: 4,
                mode2: 4, // Angle
                repeats2: 1, phase2: 0, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#aaccff", layer3Scale: 10, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "1766251986254_0", position: 0, color: "#330600", bias: 0.5, interpolation: "linear" },
                    { id: "1766252034417", position: 0.13654618473895583, color: "#BC2900", bias: 0.5, interpolation: "linear" },
                    { id: "1766251986254_1", position: 0.3, color: "#FFAE00", bias: 0.5, interpolation: "linear" },
                    { id: "1766252020600", position: 0.5180722891566265, color: "#743C14", bias: 0.5, interpolation: "linear" },
                    { id: "1766252024362", position: 0.6224899598393574, color: "#150B5F", bias: 0.5, interpolation: "linear" },
                    { id: "1766251986254_2", position: 0.7, color: "#001F97", bias: 0.5, interpolation: "linear" },
                    { id: "1766251986254_3", position: 1, color: "#700303", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#FFFFFF" }
                ]
            },
            atmosphere: {
                fogNear: 1.5, fogFar: 6, fogColor: "#000510", fogDensity: 0,
                glowIntensity: 0.035, glowSharpness: 50, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0, aoSpread: 0.61
            },
            materials: {
                reflection: 0, specular: 0.41, roughness: 0.59, diffuse: 0.07, envStrength: 0,
                rim: 0, rimExponent: 4, emission: 0.001, emissionColor: "#ffffff", emissionMode: 0
            },
            geometry: { juliaMode: true, juliaX: 0.73, juliaY: -0.34, juliaZ: 0.98, hybridMode: false, hybridIter: 2, hybridScale: 1.18, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1.15 },
            lighting: { shadows: true, shadowSoftness: 58.7, shadowIntensity: 1, shadowBias: 0.0000017 },
            quality: { detail: 1, fudgeFactor: 1, pixelThreshold: 0.5, maxSteps: 300, aaMode: "Always", aaLevel: 1, estimator: 0.0 },
            optics: { dofStrength: 0, dofFocus: 0.38 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.6882525110443435, y: 0.6754105694956275, z: -0.18538417957112108, w: 0.18910777249886715 },
        cameraFov: 60,
        sceneOffset: { x: -1, y: 0, z: 0, xL: 0.3765650773029154, yL: 0.001230038917818407, zL: 0.08497907239183068 },
        cameraMode: "Fly",
        lights: [
            { position: { x: -1.2312987020450135, y: 0.08848406939920131, z: 0.14923449323142857 }, color: "#ffffff", intensity: 5, falloff: 2.3040000000000003, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { position: { x: -2, y: -1, z: 1 }, color: "#0044aa", intensity: 2, falloff: 0.8, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { position: { x: 0.06545550750209214, y: 0.6734234224352387, z: -2.486302326628615 }, color: "#001133", intensity: 0.5, falloff: 0, falloffType: "Linear", fixed: true, visible: false, castShadow: false }
        ]
    }
};
