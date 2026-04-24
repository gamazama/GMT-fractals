
import { FractalDefinition } from '../types';

export const Dodecahedron: FractalDefinition = {
    id: 'Dodecahedron',
    name: 'Dodecahedron',
    shortDescription: 'Kaleidoscopic IFS with dodecahedral symmetry (Knighty).',
    description: 'Kaleidoscopic IFS fractal with true dodecahedral symmetry using 3 golden-ratio reflection normals. Based on Knighty\'s method: 3 normals × 3 reflections = 9 fold operations per iteration, producing the icosahedral/dodecahedral reflection group. Supports rotation, twist, and shift.',
    juliaType: 'offset',

    shader: {
        preamble: `
    // Dodecahedron: Golden-ratio fold normals
    // Reference: Syntopia/Knighty Kaleidoscopic IFS
    const float dodeca_Phi = (1.0 + sqrt(5.0)) * 0.5; // golden ratio 1.618...
    const vec3 dodeca_n1 = normalize(vec3(-1.0, dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0)));
    const vec3 dodeca_n2 = normalize(vec3(dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0), -1.0));
    const vec3 dodeca_n3 = normalize(vec3(1.0 / (dodeca_Phi - 1.0), -1.0, dodeca_Phi - 1.0));`,
        function: `
    void formula_Dodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // 3 normals × 3 repetitions = 9 fold operations (true dodecahedral symmetry)
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;

        // Scale and offset
        float scale = uParamA;
        vec3 offset = vec3(uParamB * (scale - 1.0));

        // Vec3A: Shift
        offset -= uVec3A;

        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;

        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
    }`,
        loopBody: `formula_Dodecahedron(z, dr, trap, c);`,
        loopInit: `gmt_precalcRodrigues(uVec3B);`,
        usesSharedRotation: true,
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 2.618 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "Dodecahedron",
        features: {
            coreMath: { iterations: 7, paramA: 1.618, paramB: 1, paramF: 0, vec3A: { x: 0, y: 0, z: 0 }, vec3B: { x: 5.220276663070101, y: 0.9514730190841805, z: 0 } },
            coloring: {
                mode: 0, // Trap
                repeats: 1, phase: 0.41, scale: 6.580873844013903, offset: 1.195965706975688, bias: 1, twist: 0, escape: 2,
                mode2: 5, // Normal
                repeats2: 1, phase2: 0, blendMode: 2, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true,
                gradient: [
                    { id: "1773424223148_0",  position: 0,     color: "#30123B", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_1",  position: 0.071, color: "#4145AB", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_2",  position: 0.143, color: "#4675ED", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_3",  position: 0.214, color: "#39A2FC", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_4",  position: 0.286, color: "#1BCFD4", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_5",  position: 0.357, color: "#24ECA6", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_6",  position: 0.429, color: "#61FC6C", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_7",  position: 0.5,   color: "#A4FC3B", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_8",  position: 0.571, color: "#D1E834", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_9",  position: 0.643, color: "#F3C63A", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_10", position: 0.714, color: "#FE9B2D", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_11", position: 0.786, color: "#F36315", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_12", position: 0.857, color: "#D93806", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_13", position: 0.929, color: "#B11901", bias: 0.5, interpolation: "linear" },
                    { id: "1773424223148_14", position: 1,     color: "#7A0402", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "1", position: 0.61, color: "#FFFFFF" },
                    { id: "2", position: 0.88, color: "#FF0505" }
                ]
            },
            ao: { aoIntensity: 0.47, aoSpread: 0.20182911832770353, aoSamples: 5, aoEnabled: true, aoMode: false },
            texturing: { active: false, offset: {x:-0.02,y:-0.08}, mapU: 6, mapV: 8, layer1Data: null },
            materials: {
                diffuse: 2, reflection: 0, specular: 1.02, roughness: 0.468,
                rim: 0, rimExponent: 4.5, envStrength: 0.11, envBackgroundStrength: 0.18,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: [
                    { id: "0", position: 0.03, color: "#130606" },
                    { id: "1", position: 0.14, color: "#463434" },
                    { id: "2", position: 0.41, color: "#824040" },
                    { id: "3", position: 0.68, color: "#BCBCBC" },
                    { id: "4", position: 1,    color: "#875656" }
                ]
            },
            atmosphere: {
                fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 1, glowColor: "#ffffff", glowMode: false
            },
            geometry: { juliaMode: false, juliaX: -0.495, juliaY: 0.43, juliaZ: -0.07, hybridMode: false },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 538, shadowIntensity: 1, shadowBias: 0 },
            quality: { detail: 2, fudgeFactor: 0.618, pixelThreshold: 0.2, maxSteps: 300, distanceMetric: 3, stepJitter: 0.15, estimator: 4 },
            colorGrading: { saturation: 1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            optics: { camFov: 30, dofStrength: 0, dofFocus: 5.416511696387403 }
        },
        cameraPos: { x: -2.9461205964615327, y: -6.306149063613445, z: -5.3717968058510825 },
        cameraRot: { x: -0.3200177128161143, y: 0.4273069400949125, z: 0.4770724626812721, w: 0.6981398912695737 },
        cameraFov: 30,
        sceneOffset: { x: 5.360734701156616, y: 13.365931034088135, z: 8.818749189376831, xL: -0.004044675735693504, yL: -0.07134266791832158, zL: 0.1851590182527553 },
        targetDistance: 8.7922319978922,
        cameraMode: "Orbit",
        lights: [
            { type: 'Directional', position: { x: 0.3935750958329095, y: 1.1219073945240998, z: 2.531297422652509 }, rotation: { x: -0.1760895376460553, y: -0.04312640645659912, z: 0.00380748198692117 }, color: "#FFE6D1", intensity: 0.43559999999999993, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 5100 },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
