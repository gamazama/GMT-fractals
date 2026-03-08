
import { FractalDefinition } from '../types';

export const SierpinskiTetrahedron: FractalDefinition = {
    id: 'SierpinskiTetrahedron',
    name: 'Sierpinski Tetrahedron',
    shortDescription: 'Classic IFS Sierpinski tetrahedron with fold symmetry.',
    description: 'The Sierpinski Tetrahedron (Tetrix) — a 3D IFS fractal built from reflective folds across tetrahedron face planes. Supports per-axis scale, rotation, shift and twist.',

    shader: {
        // Preamble: Global variables and pre-calculation function (runs once per frame)
        preamble: `
    // Pre-calculated rotation values for SierpinskiTetrahedron (computed once per frame)
    vec3 uSierpinski_rotAxis = vec3(0.0, 1.0, 0.0);
    float uSierpinski_rotCos = 1.0;
    float uSierpinski_rotSin = 0.0;

    void SierpinskiTetrahedron_precalcRotation() {
        if (abs(uVec3B.z) > 0.001) {
            float azimuth = uVec3B.x;
            float pitch = uVec3B.y;
            float rotAngle = uVec3B.z * 0.5;

            // Convert spherical to direction vector
            float cosPitch = cos(pitch);
            uSierpinski_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );

            uSierpinski_rotSin = sin(rotAngle);
            uSierpinski_rotCos = cos(rotAngle);
        }
    }`,
        function: `
    void formula_SierpinskiTetrahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        if (z3.x + z3.y < 0.0) z3.xy = -z3.yx;
        if (z3.x + z3.z < 0.0) z3.xz = -z3.zx;
        if (z3.y + z3.z < 0.0) z3.yz = -z3.zy;
        // Vec3C: Per-axis scale (average for DR calculation)
        vec3 scale3 = uVec3C;
        z3 = z3 * scale3 - vec3(uParamB * (scale3 - 1.0));

        // Vec3B: Rotation using pre-calculated values (no trig in loop!)
        if (abs(uVec3B.z) > 0.001) {
            // Rodrigues' rotation formula with pre-calculated axis and angles
            z3 = z3 * uSierpinski_rotCos + cross(uSierpinski_rotAxis, z3) * uSierpinski_rotSin
                 + uSierpinski_rotAxis * dot(uSierpinski_rotAxis, z3) * (1.0 - uSierpinski_rotCos);
        }

        // Vec3A: Shift X, Y, Z
        z3 += uVec3A;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        // Use average scale for derivative calculation
        float avgScale = (scale3.x + scale3.y + scale3.z) / 3.0;
        dr = dr * avgScale;
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,
        loopBody: `formula_SierpinskiTetrahedron(z, dr, trap, c);`,
        loopInit: `SierpinskiTetrahedron_precalcRotation();`
    },

    parameters: [
        { label: 'Scale', id: 'vec3C', type: 'vec3', min: 0.1, max: 4.0, step: 0.001, default: { x: 2.0, y: 2.0, z: 2.0 }, linkable: true },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "SierpinskiTetrahedron",
        features: {
            coreMath: { iterations: 32, paramB: 1, paramF: 0, vec3A: { x: 0, y: 0, z: 0 }, vec3B: { x: 0, y: 0, z: 0 }, vec3C: { x: 2, y: 2, z: 2 } },
            coloring: {
                mode: 0, // Trap
                repeats: 2.6, phase: 0.78, scale: 2.595, offset: 0.785, bias: 1, twist: 0, escape: 3.2,
                mode2: 4, // Angle
                repeats2: 1, phase2: 0, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0.2, layer3Turbulence: 0,
                gradient: [
                    { id: "1766253802332_11", position: 0, color: "#666666", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_10", position: 0.09099999999999997, color: "#994E95", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_9", position: 0.18200000000000005, color: "#6F4070", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_8", position: 0.273, color: "#94346E", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_7", position: 0.364, color: "#CC503E", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_6", position: 0.45499999999999996, color: "#E17C05", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_5", position: 0.5449999999999999, color: "#EDAD08", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_4", position: 0.636, color: "#73AF48", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_3", position: 0.727, color: "#0F8554", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_2", position: 0.8180000000000001, color: "#38A6A5", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_1", position: 0.909, color: "#1D6996", bias: 0.5, interpolation: "linear" },
                    { id: "1766253802332_0", position: 1, color: "#5F4690", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#FFFFFF" }
                ]
            },
            atmosphere: {
                fogNear: 0, fogFar: 100, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 200, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0.2, aoSpread: 0.4
            },
            materials: {
                reflection: 0.0, specular: 0, roughness: 0.5, diffuse: 1.5, envStrength: 0,
                rim: 0, rimExponent: 4, emission: 0.3, emissionColor: "#ffffff", emissionMode: 0
            },
            geometry: {
                juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0,
                hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1
            },
            lighting: { shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.002 },
            quality: { detail: 1, fudgeFactor: 1, pixelThreshold: 0.5, maxSteps: 300, estimator: 1.0 }, // Linear (Unit 1.0) = (r-1)/dr — correct for IFS with scale 2, offset 1
            optics: { dofStrength: 0, dofFocus: 0.38 }
        },
        cameraPos: { x: -3.007814612603433, y: 1.6549209197166999, z: 3.0656971117007727 },
        cameraRot: { x: -0.16821916484218788, y: -0.37237727913489405, z: -0.07175513434637137, w: 0.9098838800961496 },
        cameraFov: 60,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0.6573301623370098, yL: -0.6573301623370098, zL: -0.6573301623370111 },
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: 0.435, y: 1.031, z: 2.022 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ffffff", intensity: 1.4, falloff: 1, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
