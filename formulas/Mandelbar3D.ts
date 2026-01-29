
import { FractalDefinition } from '../types';

export const Mandelbar3D: FractalDefinition = {
    id: 'Mandelbar3D',
    name: 'Mandelbar 3D',
    shortDescription: 'The 3D Tricorn. Features heavy shelving and tri-corner symmetry.',
    description: 'Also known as the "Tricorn" in 2D. Now with offset and twisting capabilities.',
    
    shader: {
        function: `
    void formula_Mandelbar3D(inout vec4 z, inout float dr, inout float trap, vec4 c, mat2 rotX, mat2 rotZ) {
        vec3 z3 = z.xyz;
        
        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        z3.yz = rotX * z3.yz;
        z3.xy = rotZ * z3.xy;
        
        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = 2.0 * x * y;
        z3.z = -2.0 * x * z_;
        
        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;
        
        // Scale (A) and Offset (B, E)
        float scale = uParamA;
        z3 = z3 * scale + c.xyz;
        
        // Apply Offsets
        z3 += vec3(uParamB, 0.0, uParamE); 
        
        dr *= abs(scale);
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
        loopBody: `formula_Mandelbar3D(z, dr, trap, c, rotX, rotZ);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 3.0, step: 0.001, default: 1.0 },
        { label: 'Offset X', id: 'paramB', min: -2.0, max: 2.0, step: 0.001, default: 0.0 },
        { label: 'Rot X', id: 'paramC', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Rot Z', id: 'paramD', min: 0.0, max: 6.28, step: 0.01, default: 0.0 },
        { label: 'Offset Z', id: 'paramE', min: -2.0, max: 2.0, step: 0.001, default: 0.0 },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "Mandelbar3D",
        features: {
            coreMath: { iterations: 26, paramA: 1.303, paramB: 0.309, paramC: 0.56, paramD: 0, paramE: 0, paramF: 0 },
            coloring: { 
                mode: 6, // Decomposition
                repeats: 1, phase: 0, scale: 1, offset: 0, bias: 1, twist: 0, escape: 4,
                mode2: 5, // Normal
                repeats2: 1, phase2: 0, blendMode: 2, blendOpacity: 1, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 2, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "1766240207225_0", position: 0, color: "#3d5941", bias: 0.5, interpolation: "linear" },
                    { id: "1766240207225_1", position: 0.167, color: "#778868", bias: 0.5, interpolation: "linear" },
                    { id: "1766240207225_2", position: 0.333, color: "#b5b991", bias: 0.5, interpolation: "linear" },
                    { id: "1766240207225_3", position: 0.5, color: "#f6edbd", bias: 0.5, interpolation: "linear" },
                    { id: "1766240207225_4", position: 0.667, color: "#edbb8a", bias: 0.5, interpolation: "linear" },
                    { id: "1766240207225_5", position: 0.833, color: "#de8a5a", bias: 0.5, interpolation: "linear" },
                    { id: "1766240207225_6", position: 1, color: "#ca562c", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0.61, color: "#FFFFFF" },
                    { id: "2", position: 0.88, color: "#FF0505" }
                ]
            },
            atmosphere: { 
                fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.0001, glowSharpness: 1, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0.37, aoSpread: 0.1 
            },
            materials: { 
                reflection: 0.35, specular: 0, roughness: 0.38, diffuse: 0, envStrength: 0, 
                rim: 0, rimExponent: 2, 
                emission: 2.59, emissionColor: "#ffffff", emissionMode: 0 
            },
            geometry: { juliaMode: false, juliaX: 0.04, juliaY: -0.12, juliaZ: -0.24 },
            lighting: { shadows: true, shadowSoftness: 78, shadowIntensity: 1, shadowBias: 0 },
            // Lowered fudgeFactor to 0.7 to fix slicing artifacts
            quality: { detail: 1.17, fudgeFactor: 0.7, pixelThreshold: 0.13, aaMode: "Auto", aaLevel: 1 }
        },
        cameraPos: { x: -0.9750951483888902, y: 0.4967096298390524, z: -1.878572142465631 },
        cameraRot: { x: -0.35319547668295764, y: 0.8984954585062485, z: 0.19510512782513617, w: -0.17289550425237224 },
        sceneOffset: { x: 0, y: 0, z: 0, xL: -0.003768067067355675, yL: 0.19239495665458275, zL: -0.5314800136479048 },
        lights: [
            { position: { x: -0.34, y: 0.2, z: 1.76 }, color: "#99A4FF", intensity: 5, falloff: 61.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: true },
            { position: { x: 0.05, y: 0.075, z: -0.1 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { position: { x: 0.25, y: 0.075, z: -0.1 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
