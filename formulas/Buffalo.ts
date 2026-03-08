
import { FractalDefinition } from '../types';

export const Buffalo: FractalDefinition = {
    id: 'Buffalo',
    name: 'Buffalo 3D',
    shortDescription: 'Mandelbulb with per-axis absolute value folds — creates the signature "buffalo" shape.',
    description: 'The Buffalo fractal (ported from Mandelbulber via 3Dickulus). A Mandelbulb variant with selective per-axis absolute value folding before and after the power iteration. The default abs on Y+Z creates the distinctive buffalo/horn shape. Based on the original by youhn @ fractalforums.com.',

    shader: {
        preamble: `
    // Buffalo: Pre-calculated rotation (computed once per frame)
    vec3 uBuffalo_rotAxis = vec3(0.0, 1.0, 0.0);
    float uBuffalo_rotCos = 1.0;
    float uBuffalo_rotSin = 0.0;

    void Buffalo_precalcRotation() {
        if (abs(uVec3C.z) > 0.001) {
            float azimuth = uVec3C.x;
            float pitch = uVec3C.y;
            float rotAngle = uVec3C.z * 0.5;
            float cosPitch = cos(pitch);
            uBuffalo_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );
            uBuffalo_rotSin = sin(rotAngle);
            uBuffalo_rotCos = cos(rotAngle);
        }
    }`,
        function: `
    void formula_Buffalo(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Vec3B: Abs before power — apply abs to selected axes BEFORE iteration
        if (uVec3B.x > 0.5) z3.x = abs(z3.x);
        if (uVec3B.y > 0.5) z3.y = abs(z3.y);
        if (uVec3B.z > 0.5) z3.z = abs(z3.z);

        // Vec3C: Rotation using pre-calculated values
        if (abs(uVec3C.z) > 0.001) {
            z3 = z3 * uBuffalo_rotCos + cross(uBuffalo_rotAxis, z3) * uBuffalo_rotSin
                 + uBuffalo_rotAxis * dot(uBuffalo_rotAxis, z3) * (1.0 - uBuffalo_rotCos);
        }

        // Mandelbulb power iteration
        float r = length(z3);
        if (r > 1.0e-4) {
            float power = uParamA;
            dr = pow(r, power - 1.0) * power * dr + 1.0;

            float theta = acos(clamp(z3.z / r, -1.0, 1.0));
            float phi_angle = atan(z3.y, z3.x);
            float zr = pow(r, power);
            theta *= power;
            phi_angle *= power;

            vec3 newz = zr * vec3(sin(theta) * cos(phi_angle), sin(phi_angle) * sin(theta), cos(theta));

            // Vec3A: Abs after power — apply abs to selected axes AFTER iteration
            // This is the signature Buffalo feature: abs on Y+Z creates the "buffalo" shape
            if (uVec3A.x > 0.5) newz.x = abs(newz.x);
            if (uVec3A.y > 0.5) newz.y = abs(newz.y);
            if (uVec3A.z > 0.5) newz.z = abs(newz.z);

            z3 = newz;
        } else {
            dr = 1.0;
        }

        z3 += c.xyz;
        z.xyz = z3;
        trap = min(trap, r);
    }`,
        loopBody: `formula_Buffalo(z, dr, trap, c);`,
        loopInit: `Buffalo_precalcRotation();`
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 1.0, max: 16.0, step: 0.001, default: 2.0 },
        { label: 'Abs After Power', id: 'vec3A', type: 'vec3', min: 0.0, max: 1.0, step: 1.0, default: { x: 0.0, y: 1.0, z: 1.0 }, mode: 'toggle' },
        { label: 'Abs Before Power', id: 'vec3B', type: 'vec3', min: 0.0, max: 1.0, step: 1.0, default: { x: 0.0, y: 0.0, z: 0.0 }, mode: 'toggle' },
        { label: 'Rotation', id: 'vec3C', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0.0, y: 0.0, z: 0.0 }, mode: 'rotation' },
    ],

    defaultPreset: {
        formula: "Buffalo",
        features: {
            coreMath: { iterations: 20, paramA: 2.0, vec3A: { x: 0, y: 1, z: 1 }, vec3B: { x: 0, y: 0, z: 0 }, vec3C: { x: 0, y: 0, z: 0 } },
            coloring: {
                mode: 0, // Trap
                repeats: 3.58, phase: 0.7, scale: 3.579, offset: 0.6958, bias: 1, twist: 0, escape: 5,
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
                fogNear: 0, fogFar: 100, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 50, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0.2, aoSpread: 0.4
            },
            materials: {
                reflection: 0, specular: 0.5, roughness: 0.5, diffuse: 1.5, envStrength: 0,
                rim: 0, rimExponent: 4, emission: 0.3, emissionColor: "#ffffff", emissionMode: 0
            },
            geometry: { juliaMode: true, juliaX: 0.37, juliaY: -0.34, juliaZ: -0.42, hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1 },
            lighting: { shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.002 },
            quality: { detail: 1, fudgeFactor: 1, pixelThreshold: 0.5, maxSteps: 300, estimator: 0.0 },
            optics: { dofStrength: 0, dofFocus: 0.38 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.10384525583017853, y: 0.016524988834210615, z: -0.017944827094612474, w: 0.994294257635102 },
        cameraFov: 60,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: -0.5 },
        targetDistance: 3.0,
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: -2, y: 1, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ffffff", intensity: 1.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 2, y: -1, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff8800", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0, y: 0, z: -3 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0044ff", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
