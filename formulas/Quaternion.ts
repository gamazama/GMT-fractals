
import { FractalDefinition } from '../types';

export const Quaternion: FractalDefinition = {
    id: 'Quaternion',
    name: 'Quaternion',
    shortDescription: 'A 3D slice of a 4D Julia set. Use the "Slice W" and Rotations to morph the object.',
    description: 'A 4D Julia set projected into 3D. Features 4D rotations, iteration damping for smooth variants, and optional spherical inversion (Kosalos) for inside-out effects.',
    
    shader: {
        function: `
    vec4 quatSquare(vec4 q) {
        return vec4(q.x*q.x - q.y*q.y - q.z*q.z - q.w*q.w, 2.0*q.x*q.y, 2.0*q.x*q.z, 2.0*q.x*q.w);
    }

    void formula_Quaternion(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // 3D Rotations (vec2A: XY, XZ)
        float angXY = uVec2A.x;
        if (abs(angXY) > 0.0) {
            float s = sin(angXY), c_ = cos(angXY);
            z.xy = mat2(c_, -s, s, c_) * z.xy;
        }

        float angXZ = uVec2A.y;
        if (abs(angXZ) > 0.0) {
            float s = sin(angXZ), c_ = cos(angXZ);
            z.xz = mat2(c_, -s, s, c_) * z.xz;
        }

        // 4D Rotations (vec2B: XW, YW)
        float angXW = uVec2B.x;
        if (abs(angXW) > 0.0) {
            float s = sin(angXW), c_ = cos(angXW);
            vec2 xw = vec2(z.x, z.w);
            xw = mat2(c_, -s, s, c_) * xw;
            z.x = xw.x; z.w = xw.y;
        }

        float angYW = uVec2B.y;
        if (abs(angYW) > 0.0) {
            float s = sin(angYW), c_ = cos(angYW);
            vec2 yw = vec2(z.y, z.w);
            yw = mat2(c_, -s, s, c_) * yw;
            z.y = yw.x; z.w = yw.y;
        }

        // Save pre-iteration state for damping
        vec4 oldZ = z;

        // Chain Rule: Magnitude increases by 2*|z| + 1 (from +c)
        dr = 2.0 * length(z) * dr + 1.0;
        z = quatSquare(z) + c;

        // Iteration Damping (Kosalos variant)
        // Adds momentum feedback: smooths iteration trajectory
        if (abs(uParamC) > 0.001) {
            float den = 2.0 + abs(uParamC) * 100.0;
            z += (z - oldZ) / den;
        }

        trap = min(trap, dot(z,z));
    }`,
        loopBody: `formula_Quaternion(z, dr, trap, c);`,
        loopInit: `
        // Spherical Inversion pre-transform (Kosalos variant)
        // Inverts space around a center point, creating inside-out shapes
        if (uParamD > 0.01) {
            vec3 invCenter = uVec3A;
            float invRadius = uParamD;
            float invAngle = uParamE;
            vec3 offset = z.xyz - invCenter;
            float r = length(offset);
            float r2 = r * r;
            z.xyz = (invRadius * invRadius / r2) * offset + invCenter;
            // Optional angular twist
            if (abs(invAngle) > 0.001) {
                float an = atan(z.y, z.x) + invAngle;
                float ra = length(z.xy);
                z.x = cos(an) * ra;
                z.y = sin(an) * ra;
            }
            // Re-derive c after inversion (position changed)
            c = mix(vec4(z.xyz, uParamB), vec4(uJulia, uParamA), step(0.5, uJuliaMode));
        }`
    },

    parameters: [
        { label: 'Julia C (W)', id: 'paramA', min: -1.0, max: 1.0, step: 0.001, default: -0.5 },
        { label: 'Slice W', id: 'paramB', min: -1.0, max: 1.0, step: 0.001, default: 0.0 },
        { label: 'Damping', id: 'paramC', min: 0.0, max: 5.0, step: 0.01, default: 0.0 },
        { label: 'Inversion Radius', id: 'paramD', min: 0.0, max: 10.0, step: 0.01, default: 0.0 },
        { label: 'Inversion Angle', id: 'paramE', min: -10.0, max: 10.0, step: 0.01, default: 0.0 },
        { label: 'Rot 3D (XY, XZ)', id: 'vec2A', type: 'vec2', min: -6.28, max: 6.28, step: 0.01, default: { x: 0.0, y: 0.0 } },
        { label: 'Rot 4D (XW, YW)', id: 'vec2B', type: 'vec2', min: -6.28, max: 6.28, step: 0.01, default: { x: 0.0, y: 0.0 } },
        { label: 'Inversion Center', id: 'vec3A', type: 'vec3', min: -5.0, max: 5.0, step: 0.01, default: { x: 0.612, y: 0.381, z: 0.786 } },
    ],

    defaultPreset: {
        formula: "Quaternion",
        features: {
            coreMath: { iterations: 20, paramA: -0.252, paramB: -0.222, paramC: 0, paramD: 0, paramE: 0, vec2A: { x: -6.44, y: 0.29 }, vec2B: { x: -0.21, y: 0.05 }, vec3A: { x: 0.612, y: 0.381, z: 0.786 } },
            coloring: {
                mode: 6, // Decomposition
                repeats: 1, phase: 0.73, scale: 1, offset: 0.73, bias: 1, twist: 0, escape: 54.95,
                mode2: 4, // Angle
                repeats2: 1, phase2: 0, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 2, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "1766241181174_0", position: 0, color: "#DA9F1C", bias: 0.5, interpolation: "linear" },
                    { id: "1766241181174_1", position: 0.167, color: "#FA752D", bias: 0.5, interpolation: "linear" },
                    { id: "1766241181174_2", position: 0.333, color: "#F0483F", bias: 0.5, interpolation: "linear" },
                    { id: "1766241181174_3", position: 0.5, color: "#E3264F", bias: 0.5, interpolation: "linear" },
                    { id: "1766241181174_4", position: 0.667, color: "#DC266B", bias: 0.5, interpolation: "linear" },
                    { id: "1766241181174_5", position: 0.833, color: "#b9257a", bias: 0.5, interpolation: "linear" },
                    { id: "1766241181174_6", position: 1, color: "#7c1d6f", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#FFFFFF" }
                ]
            },
            atmosphere: {
                fogNear: 0, fogFar: 100, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.23, glowSharpness: 3.8, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0, aoSpread: 2
            },
            materials: {
                reflection: 0.32, specular: 0.47, roughness: 0.5, diffuse: 2, envStrength: 0,
                rim: 0, rimExponent: 3.6, emission: 0.0001, emissionColor: "#ffffff", emissionMode: 0
            },
            geometry: {
                juliaMode: true, juliaX: 0.65, juliaY: -0.2, juliaZ: -1.2,
                hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1
            },
            lighting: { shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.002 },
            quality: { detail: 1, fudgeFactor: 0.8, pixelThreshold: 0.5, maxSteps: 300, aaMode: "Always", aaLevel: 1 },
            optics: { dofStrength: 0, dofFocus: 10 }
        },
        cameraPos: { x: -2.448955788675867, y: 0.7723538718365539, z: 0.32605384095213635 },
        cameraRot: { x: -0.1135398122615654, y: -0.6512503200884421, z: -0.09942502462227083, w: 0.7437045085887076 },
        cameraFov: 60,
        sceneOffset: { x: 0, y: 0, z: 0, xL: -0.5453734613707567, yL: 0.10050638429037613, zL: -0.211008843702685 },
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: -2.0026065897203154, y: 0.7668302923678636, z: 0.21579993050482316 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ffffff", intensity: 1, falloff: 1, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ],
        animations: [
            { id: "4yFFplV3QPo3KoNaGJwfX", enabled: false, target: "coreMath.paramA", shape: "Sine", period: 5, amplitude: 1, baseValue: -0.252, phase: 0, smoothing: 0.5 }
        ]
    }
};
