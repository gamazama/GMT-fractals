
import { FractalDefinition } from '../types';

export const Coxeter: FractalDefinition = {
    id: 'Coxeter',
    name: 'Coxeter',
    shortDescription: 'Parameterized Coxeter symmetry fractal — continuous from tetrahedral to icosahedral.',
    description: 'Kaleidoscopic IFS fractal with a parameterized Coxeter fold normal. The Symmetry N parameter continuously interpolates between Coxeter symmetry groups: N=3 gives tetrahedral [3,3], N=4 gives octahedral [3,4], N=5 gives icosahedral [3,5], and non-integer values produce novel intermediate symmetries. Uses cutting-plane DE with the fold\'s edge-midpoint direction as face normal. Explore fractional N values to discover shapes unique to this formula.',
    juliaType: 'offset',

    shader: {
        preamble: `
    // Coxeter: Parameterized Coxeter symmetry with cutting-plane DE
    //
    // Knighty fold with adjustable symmetry order N:
    //   - Fold normal nc = (-0.5, -cos(pi/N), sqrt(0.75 - cos^2(pi/N)))
    //   - Cutting plane normal = normalize(pbc) where pbc = (scospin, 0, 0.5)
    //   - Offset toward pca = normalize(0, scospin, cospin)
    //
    // N=3: tetrahedral, N=4: octahedral, N=5: icosahedral

    // Mutable — recomputed from N each frame
    vec3 uCox_nc;
    vec3 uCox_nor;
    vec3 uCox_pca;

    // Cutting-plane DE accumulator
    float cox_dmin;
    float cox_scale;
    float cox_trap;

    void Coxeter_precalc() {
        float N = uParamC;
        float cospin = cos(3.14159265 / N);
        float scospin = sqrt(max(0.75 - cospin * cospin, 0.0));
        uCox_nc = vec3(-0.5, -cospin, scospin);
        uCox_nor = normalize(vec3(scospin, 0.0, 0.5));
        uCox_pca = normalize(vec3(0.0, scospin, cospin));
    }`,
        preambleVars: ['uCox_nc', 'uCox_nor', 'uCox_pca', 'cox_dmin', 'cox_scale', 'cox_trap'],
        function: `
    void formula_Coxeter(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Full Knighty fold (abs + nc reflect x5)
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;

        // Cutting plane after fold
        float size = uParamB;
        float d = dot(z3, uCox_nor) - size;
        cox_dmin = max(cox_dmin, cox_scale * d);

        // Scale and offset toward pca vertex
        float scale = uParamA;
        vec3 offset = uCox_pca * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        cox_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        cox_trap = trap;
    }`,
        loopBody: `formula_Coxeter(z, dr, trap, c);`,
        loopInit: `Coxeter_precalc(); gmt_precalcRodrigues(uVec3B);
cox_dmin = -1e10;
cox_scale = 1.0;
cox_trap = 1e10;`,
        getDist: `
        float cox_metric = r / max(length(z.xyz), 1e-10);
        return vec2(abs(cox_dmin) * cox_metric, cox_trap);
    `,
        usesSharedRotation: true,
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 2.0 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Symmetry N', id: 'paramC', min: 3.0, max: 6.0, step: 0.01, default: 4.5 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "Coxeter",
        features: {
            coreMath: { iterations: 12, paramA: 2.0, paramB: 1.0, paramC: 4.465, paramF: 0, vec3A: { x: -0.48, y: 0.085, z: -0.185 }, vec3B: { x: 0, y: 0, z: 0 } },
            coloring: {
                gradient: { stops: [
                    { id: "cox_0", position: 0, color: "#30123B", bias: 0.5, interpolation: "linear" },
                    { id: "cox_1", position: 0.071, color: "#4145AB", bias: 0.5, interpolation: "linear" },
                    { id: "cox_2", position: 0.143, color: "#4675ED", bias: 0.5, interpolation: "linear" },
                    { id: "cox_3", position: 0.214, color: "#39A2FC", bias: 0.5, interpolation: "linear" },
                    { id: "cox_4", position: 0.286, color: "#1BCFD4", bias: 0.5, interpolation: "linear" },
                    { id: "cox_5", position: 0.357, color: "#24ECA6", bias: 0.5, interpolation: "linear" },
                    { id: "cox_6", position: 0.429, color: "#61FC6C", bias: 0.5, interpolation: "linear" },
                    { id: "cox_7", position: 0.5, color: "#A4FC3B", bias: 0.5, interpolation: "linear" },
                    { id: "cox_8", position: 0.571, color: "#D1E834", bias: 0.5, interpolation: "linear" },
                    { id: "cox_9", position: 0.643, color: "#F3C63A", bias: 0.5, interpolation: "linear" },
                    { id: "cox_10", position: 0.714, color: "#FE9B2D", bias: 0.5, interpolation: "linear" },
                    { id: "cox_11", position: 0.786, color: "#F36315", bias: 0.5, interpolation: "linear" },
                    { id: "cox_12", position: 0.857, color: "#D93806", bias: 0.5, interpolation: "linear" },
                    { id: "cox_13", position: 0.929, color: "#B11901", bias: 0.5, interpolation: "linear" },
                    { id: "cox_14", position: 1, color: "#7A0402", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "linear" },
                mode: 0, scale: 2.144, offset: 0.517, repeats: 1.2, phase: 0.4, bias: 1, twist: 0, escape: 2,
                gradient2: [
                    { id: "1", position: 0.4, color: "#FFFFFF" },
                    { id: "2", position: 0.88, color: "#8A2BE2" }
                ],
                mode2: 5, scale2: 1, offset2: 0, repeats2: 1, phase2: 0, bias2: 1, twist2: 0,
                blendMode: 2, blendOpacity: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true
            },
            ao: { aoIntensity: 0.47, aoSpread: 0.2, aoSamples: 5, aoEnabled: true, aoMode: false },
            reflections: { enabled: true, reflectionMode: 1, bounces: 1, steps: 64, mixStrength: 1, roughnessThreshold: 0.62 },
            materials: {
                diffuse: 1.8, reflection: 0.15, specular: 0.67, roughness: 0.232,
                rim: 0.3, rimExponent: 5, envStrength: 0.3, envBackgroundStrength: 0.18,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: { stops: [
                    { id: "0", position: 0, color: "#0A0518", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.153, color: "#101850", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.385, color: "#5A5EB0", bias: 0.365, interpolation: "linear" },
                    { id: "3", position: 1, color: "#F0E0FF", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "linear" }
            },
            atmosphere: {
                fogIntensity: 0, fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 1, glowMode: false, glowColor: "#ffffff"
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 250, shadowIntensity: 1, shadowBias: 0 },
            quality: { detail: 3, fudgeFactor: 1, pixelThreshold: 2, maxSteps: 400, distanceMetric: 1, stepJitter: 0.15, estimator: 2 },
            colorGrading: { active: true, saturation: 1.1, levelsMin: 0, levelsMax: 0.537, levelsGamma: 0.966 },
            optics: { camFov: 36, dofStrength: 0, dofFocus: 5 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.213, y: 0.441, z: 0.1086, w: 0.8651 },
        sceneOffset: { x: 2.7, y: 1.45, z: 2.12, xL: 0.4105, yL: 0.4583, zL: 0.1985 },
        targetDistance: 3.226,
        cameraMode: "Orbit",
        lights: [
            { type: 'Directional', position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.321, y: -0.171, z: 0.028 }, color: "#F0E8FF", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 6000 },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
