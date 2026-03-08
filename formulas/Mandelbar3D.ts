
import { FractalDefinition } from '../types';

export const Mandelbar3D: FractalDefinition = {
    id: 'Mandelbar3D',
    name: 'Mandelbar 3D',
    shortDescription: 'The 3D Tricorn. Features heavy shelving and tri-corner symmetry.',
    description: 'The 3D extension of the Tricorn (Mandelbar) fractal: x²-y²-z², 2xy, -2xz. The conjugation on z creates the distinctive tri-corner symmetry. Supports rotation, offset, and twist.',

    shader: {
        preamble: `
    // Mandelbar3D: Pre-calculated rotation (computed once per frame)
    vec3 uMbar_rotAxis = vec3(0.0, 1.0, 0.0);
    float uMbar_rotCos = 1.0;
    float uMbar_rotSin = 0.0;

    void Mandelbar3D_precalcRotation() {
        if (abs(uVec3B.z) > 0.001) {
            float azimuth = uVec3B.x;
            float pitch = uVec3B.y;
            float rotAngle = uVec3B.z * 0.5;
            float cosPitch = cos(pitch);
            uMbar_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );
            uMbar_rotSin = sin(rotAngle);
            uMbar_rotCos = cos(rotAngle);
        }
    }`,
        function: `
    void formula_Mandelbar3D(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        // Vec3B: Rotation using pre-calculated Rodrigues
        if (abs(uVec3B.z) > 0.001) {
            z3 = z3 * uMbar_rotCos + cross(uMbar_rotAxis, z3) * uMbar_rotSin
                 + uMbar_rotAxis * dot(uMbar_rotAxis, z3) * (1.0 - uMbar_rotCos);
        }

        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = 2.0 * x * y;
        z3.z = -2.0 * x * z_;

        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;

        // Scale (A)
        float scale = uParamA;
        z3 = z3 * scale + c.xyz;

        // Vec3A: Offset X/Y/Z
        z3 += uVec3A;

        dr *= abs(scale);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,
        loopBody: `formula_Mandelbar3D(z, dr, trap, c);`,
        loopInit: `Mandelbar3D_precalcRotation();`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 3.0, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Offset', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.001, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "Mandelbar3D",
        features: {
            coreMath: { iterations: 26, paramA: 1.303, paramF: 0, vec3A: { x: 0.309, y: 0, z: 0 }, vec3B: { x: 0, y: 0, z: 0 } },
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
            quality: { detail: 1.17, fudgeFactor: 0.7, pixelThreshold: 0.13, aaMode: "Auto", aaLevel: 1 }
        },
        cameraPos: { x: -0.9750951483888902, y: 0.4967096298390524, z: -1.878572142465631 },
        cameraRot: { x: -0.35319547668295764, y: 0.8984954585062485, z: 0.19510512782513617, w: -0.17289550425237224 },
        sceneOffset: { x: 0, y: 0, z: 0, xL: -0.003768067067355675, yL: 0.19239495665458275, zL: -0.5314800136479048 },
        lights: [
            { type: 'Point', position: { x: -0.34, y: 0.2, z: 1.76 }, rotation: { x: 0, y: 0, z: 0 }, color: "#99A4FF", intensity: 5, falloff: 61.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
