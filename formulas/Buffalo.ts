
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

        // Vec3B: Abs before power
        z3 = mix(z3, abs(z3), step(vec3(0.5), uVec3B));

        // Vec3C: Rotation using pre-calculated values
        if (abs(uVec3C.z) > 0.001) {
            z3 = z3 * uBuffalo_rotCos + cross(uBuffalo_rotAxis, z3) * uBuffalo_rotSin
                 + uBuffalo_rotAxis * dot(uBuffalo_rotAxis, z3) * (1.0 - uBuffalo_rotCos);
        }

        // Mandelbulb power iteration (branchless)
        float r = max(length(z3), 1.0e-9);
        float power = uParamA;
        float rp1 = pow(r, power - 1.0);
        dr = rp1 * power * dr + 1.0;

        float theta = acos(clamp(z3.z / r, -1.0, 1.0));
        float phi_angle = atan(z3.y, z3.x);
        float zr = rp1 * r;
        theta *= power;
        phi_angle *= power;

        z3 = zr * vec3(sin(theta) * cos(phi_angle), sin(phi_angle) * sin(theta), cos(theta));

        // Vec3A: Abs after power
        z3 = mix(z3, abs(z3), step(vec3(0.5), uVec3A));

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
            coreMath: { iterations: 21, paramA: 2, vec3A: { x: 0, y: 1, z: 1 }, vec3B: { x: 0, y: 0, z: 0 }, vec3C: { x: 0, y: 0, z: 0 } },
            coloring: {
                mode: 0, // Trap
                repeats: 1, phase: 0.21, scale: 10.928878861622898, offset: 1.0718989457927122, bias: 1, twist: 0, escape: 5,
                mode2: 4, // Angle
                repeats2: 1, phase2: 0, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#aaccff", layer3Scale: 10, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true,
                gradient: [
                    { id: "1766251986254_0", position: 0,                   color: "#330600", bias: 0.5, interpolation: "linear" },
                    { id: "1766252034417",   position: 0.13654618473895586, color: "#BC2900", bias: 0.5, interpolation: "linear" },
                    { id: "1766251986254_1", position: 0.3,                 color: "#FFAF0D", bias: 0.5, interpolation: "linear" },
                    { id: "1766252020600",   position: 0.5180722891566265,  color: "#743C14", bias: 0.5, interpolation: "linear" },
                    { id: "1766252024362",   position: 0.6224899598393574,  color: "#0B091D", bias: 0.5, interpolation: "linear" },
                    { id: "1766251986254_2", position: 0.7,                 color: "#001B3D", bias: 0.5, interpolation: "linear" },
                    { id: "1766251986254_3", position: 1,                   color: "#700303", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#FFFFFF" }
                ]
            },
            ao: { aoIntensity: 0, aoSpread: 0.2, aoSamples: 7, aoEnabled: true, aoMode: false },
            atmosphere: {
                fogNear: 0, fogFar: 100, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 50, glowColor: "#ffffff", glowMode: false
            },
            materials: {
                diffuse: 1.5, reflection: 0, specular: 0.27, roughness: 0.342,
                rim: 0, rimExponent: 4, envStrength: 0.65, envBackgroundStrength: 0.21,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0.1, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: [
                    { id: "1773425036101_0",  position: 0,     color: "#421E0F", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_1",  position: 0.067, color: "#19071A", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_2",  position: 0.133, color: "#09012F", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_3",  position: 0.2,   color: "#040449", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_4",  position: 0.267, color: "#000764", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_5",  position: 0.333, color: "#0C2C8A", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_6",  position: 0.4,   color: "#1852B1", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_7",  position: 0.467, color: "#397DD1", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_8",  position: 0.533, color: "#86B5E5", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_9",  position: 0.6,   color: "#D3ECF8", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_10", position: 0.667, color: "#F1E9BF", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_11", position: 0.733, color: "#F8C95F", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_12", position: 0.8,   color: "#FFAA00", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_13", position: 0.867, color: "#CC8000", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_14", position: 0.933, color: "#995700", bias: 0.5, interpolation: "linear" },
                    { id: "1773425036101_15", position: 1,     color: "#6A3403", bias: 0.5, interpolation: "linear" }
                ]
            },
            geometry: { juliaMode: true, juliaX: 0.37, juliaY: -0.34, juliaZ: -0.42, hybridMode: false },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.002 },
            quality: { detail: 1.618, fudgeFactor: 1, pixelThreshold: 0.25, maxSteps: 300, estimator: 0 },
            optics: { camFov: 50, dofStrength: 0, dofFocus: 1.407048060869024 }
        },
        cameraPos: { x: -1.1409465865707341e-17, y: 1.0722232409131055e-16, z: -0.09316535897248968 },
        cameraRot: { x: 1, y: -7.271568003412109e-33, z: -6.123233995736766e-17, w: 3.710962377975202e-18 },
        cameraFov: 50,
        sceneOffset: { x: -1.7223652652763669e-16, y: 9.193078863633456e-17, z: -2.6897222995758057, xL: -4.285372606041406e-24, yL: -9.521451285809295e-26, zL: -3.9146655694821675e-8 },
        targetDistance: 0.09316535897248968,
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: -0.4527317101694649, y: -0.04511061025925526, z: -2.1858885005397504 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFCEA6", intensity: 0.75, falloff: 0, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 4000 },
            { type: 'Point', position: { x: 2, y: -1, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff8800", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0, y: 0, z: -3 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0044ff", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
