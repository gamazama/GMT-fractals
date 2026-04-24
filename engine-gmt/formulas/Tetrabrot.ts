
import { FractalDefinition } from '../types';

export const Tetrabrot: FractalDefinition = {
    id: 'Tetrabrot',
    name: 'Tetrabrot',
    shortDescription: '4D Pseudo-Quaternion set. Produces diamond-like geometric symmetries.',
    description: 'A 4D Mandelbrot set visualization using a specific squaring function. Now with pre-rotation support.',
    juliaType: 'offset',
    
    shader: {
        function: `
    vec4 tetraSquare(vec4 q) {
        return vec4(q.x*q.x - q.y*q.y - q.z*q.z + q.w*q.w, 2.0*(q.x*q.y - q.z*q.w), 2.0*(q.x*q.z - q.y*q.w), 2.0*(q.x*q.w + q.y*q.z));
    }

    void formula_Tetrabrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        
        // Rotations via vec3A (Z, X, Y axes)
        float angZ = uVec3A.x;
        if (abs(angZ) > 0.001) {
            float s = sin(angZ); float co = cos(angZ);
            z.xy = mat2(co, -s, s, co) * z.xy;
        }

        float angX = uVec3A.y;
        if (abs(angX) > 0.001) {
            float s = sin(angX); float co = cos(angX);
            z.yz = mat2(co, -s, s, co) * z.yz;
        }

        float angY = uVec3A.z;
        if (abs(angY) > 0.001) {
            float s = sin(angY); float co = cos(angY);
            z.xz = mat2(co, -s, s, co) * z.xz;
        }

        // Fix: Chain rule +1.0
        dr = 2.0 * length(z) * dr + 1.0;
        z = tetraSquare(z) + c;
        trap = min(trap, dot(z,z));
    }`,
        loopBody: `formula_Tetrabrot(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Julia C (W)', id: 'paramA', min: -1.0, max: 1.0, step: 0.001, default: -0.2 },
        { label: 'Slice W', id: 'paramB', min: -1.0, max: 1.0, step: 0.001, default: 0.0 },
        { label: 'Rotation', id: 'vec3A', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0.0, y: 0.0, z: 0.0 }, mode: 'axes', scale: 'pi' },
    ],

    defaultPreset: {
        formula: "Tetrabrot",
        features: {
            coreMath: { iterations: 28, paramA: 0.186, paramB: 0, vec3A: { x: 0, y: 0, z: 0 } },
            coloring: {
                mode: 5, // Normal
                repeats: 1, phase: 0.87, scale: 1, offset: 0.87, bias: 1, twist: 0, escape: 4,
                mode2: 5, // Normal
                repeats2: 1, phase2: 2.4, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "1766256604050_0", position: 0, color: "#0A4CD3", bias: 0.5, interpolation: "linear" },
                    { id: "1766256604050_1", position: 0.5, color: "#3E7FAA", bias: 0.5, interpolation: "linear" },
                    { id: "1766256604050_2", position: 1, color: "#62E9E9", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0.61, color: "#FFFFFF" },
                    { id: "2", position: 0.88, color: "#FF0505" }
                ]
            },
            atmosphere: {
                fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.0001, glowSharpness: 47, glowColor: "#FF2323", glowMode: false,
                aoIntensity: 0.4, aoSpread: 0.16
            },
            materials: {
                reflection: 0.35, specular: 1.98, roughness: 0.11, diffuse: 2, envStrength: 0,
                rim: 0, rimExponent: 2, emission: 0.008, emissionColor: "#ffffff", emissionMode: 0
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1 },
            lighting: { shadows: false, shadowSoftness: 78, shadowIntensity: 1, shadowBias: 0 },
            // Lowered fudgeFactor to 0.8 to be safe
            quality: { detail: 1.1, fudgeFactor: 0.8, pixelThreshold: 0.5, maxSteps: 300, aaMode: "Auto", aaLevel: 1 },
            optics: { dofStrength: 0, dofFocus: 1.368 }
        },
        cameraPos: { x: 0.4920528506922438, y: -0.07167206331378606, z: 0.4438830367018614 },
        cameraRot: { x: -0.2287674791967978, y: 0.3386642094524777, z: -0.6145511225348657, w: 0.6747584097208478 },
        cameraFov: 60,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0.43671384293273163, yL: -0.013902955556870706, zL: 0.11442336133892608 },
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: 0.554923231509613, y: -0.15190121945393503, z: -0.030795909267397503 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFFFFF", intensity: 5, falloff: 61.5, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
