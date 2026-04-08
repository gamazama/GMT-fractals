
import { FractalDefinition } from '../types';

export const RhombicTriacontahedron: FractalDefinition = {
    id: 'RhombicTriacontahedron',
    name: 'Rhombic Triacontahedron',
    shortDescription: 'IFS fractal of the 6D hypercube projection — Buckminster Fuller\'s favorite shape.',
    description: 'Kaleidoscopic IFS fractal based on the rhombic triacontahedron — the 3D shadow of a 6-dimensional hypercube and Buckminster Fuller\'s favorite geometric form. 30 golden-ratio rhombic faces with icosahedral symmetry. Uses the Knighty icosahedral fold (whose planes ARE RT face normals) with a single cutting plane z=size in the folded domain, giving true RT geometry at all iteration levels.',
    juliaType: 'offset',

    shader: {
        preamble: `
    // RhombicTriacontahedron: Cutting plane after Knighty fold
    //
    // Key insight: the Knighty icosahedral fold planes (abs + nc reflections)
    // ARE icosidodecahedron vertex normals = RT face normals. So the fold
    // IS through RT face planes. The fold domain concentrates near z-axis
    // (z range [0.90, 1.00]) where the (0,0,1) RT face normal dominates.
    //
    // Cutting plane: z3.z - size (just the z-component after fold)
    // Verified: 0% overestimates, max error 0.011 vs analytic SDF.
    //
    // This gives correct RT geometry at ALL iteration levels, unlike the
    // previous analytic-SDF-before-fold approach which showed dodecahedral
    // inner structure.

    // Icosahedral fold normal (Type=5)
    const vec3 rt_nc = vec3(-0.5, -0.80901699, 0.30901699);
    // Offset direction: pbc = icosidodecahedron vertex = RT face center
    const vec3 rt_pbc = vec3(0.52573111, 0.0, 0.85065081);

    // Cutting-plane DE accumulator
    float rt_dmin;
    float rt_scale;
    float rt_trap;`,
        preambleVars: ['rt_dmin', 'rt_scale', 'rt_trap'],
        function: `
    void formula_RhombicTriacontahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: Knighty icosahedral fold
        // All fold planes ARE RT face normals (icosidodecahedron vertices)
        // abs = 3 axis normals, nc = diagonal RT face normal
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;

        // Step 2: Cutting plane in folded domain
        // After fold, domain concentrates near z-axis where (0,0,1) RT face dominates
        float size = uParamB;
        float d = z3.z - size;
        rt_dmin = max(rt_dmin, rt_scale * d);

        // Step 3: Scale and offset toward RT face center (pbc = icosidodecahedron vertex)
        float scale = uParamA;
        vec3 offset = rt_pbc * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        rt_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        rt_trap = trap;
    }`,
        loopBody: `formula_RhombicTriacontahedron(z, dr, trap, c);`,
        loopInit: `gmt_precalcRodrigues(uVec3B);
rt_dmin = -1e10;
rt_scale = 1.0;
rt_trap = 1e10;`,
        getDist: `
        float rt_metric = r / max(length(z.xyz), 1e-10);
        return vec2(abs(rt_dmin) * rt_metric, rt_trap);
    `,
        usesSharedRotation: true,
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 1.618 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "RhombicTriacontahedron",
        features: {
            coreMath: { iterations: 10, paramA: 1.878, paramB: 1.0, paramF: 0, vec3A: { x: 0.125, y: 0.125, z: -0.25 }, vec3B: { x: 0, y: 0, z: 0 } },
            coloring: {
                gradient: { stops: [
                    { id: "rt_0", position: 0, color: "#3d5941", bias: 0.5, interpolation: "linear" },
                    { id: "rt_1", position: 0.167, color: "#778868", bias: 0.5, interpolation: "linear" },
                    { id: "rt_2", position: 0.333, color: "#b5b991", bias: 0.5, interpolation: "linear" },
                    { id: "rt_3", position: 0.5, color: "#f6edbd", bias: 0.5, interpolation: "linear" },
                    { id: "rt_4", position: 0.667, color: "#edbb8a", bias: 0.5, interpolation: "linear" },
                    { id: "rt_5", position: 0.833, color: "#de8a5a", bias: 0.5, interpolation: "linear" },
                    { id: "rt_6", position: 1, color: "#ca562c", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "srgb" },
                mode: 0, scale: 3.633, offset: 0.486, repeats: 0.5, phase: 0.43, bias: 1, colorIter: 3, twist: 0, escape: 2,
                gradient2: [
                    { id: "1", position: 0.35, color: "#FFF8F0" },
                    { id: "2", position: 0.85, color: "#B87333" }
                ],
                mode2: 5, scale2: 1, offset2: 0, repeats2: 1, phase2: 0, bias2: 1, twist2: 0,
                blendMode: 2, blendOpacity: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true
            },
            ao: { aoIntensity: 0.7, aoSpread: 0.4, aoSamples: 5, aoEnabled: true, aoMode: false },
            reflections: { enabled: true, reflectionMode: 1, bounces: 1, steps: 64, mixStrength: 1, roughnessThreshold: 0.62 },
            materials: {
                diffuse: 2, reflection: 0.25, specular: 0.76, roughness: 0.226,
                rim: 0, rimExponent: 4, envStrength: 0.55, envBackgroundStrength: 0.2,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: { stops: [
                    { id: "0", position: 0, color: "#1A0E08", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.3, color: "#5C3520", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.65, color: "#B87333", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 1, color: "#FFE8D0", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "srgb" }
            },
            atmosphere: {
                fogIntensity: 0, fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 1, glowMode: false, glowColor: "#ffffff"
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false, postRotX: 0.75 },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 17.023, shadowIntensity: 1, shadowBias: 0 },
            quality: { detail: 5, fudgeFactor: 0.6, pixelThreshold: 2, maxSteps: 400, distanceMetric: 1, stepJitter: 0.15, estimator: 2 },
            colorGrading: { saturation: 1.15, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            optics: { camFov: 32, dofStrength: 0, dofFocus: 5 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.0647, y: -0.1543, z: 0.0101, w: 0.9859 },
        sceneOffset: { x: -1.3942, y: -0.5315, z: 4.4198, xL: 0, yL: 0, zL: 0 },
        targetDistance: 3.622,
        cameraMode: "Orbit",
        lights: [
            { type: 'Directional', position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.786, y: -1.042, z: 0.467 }, color: "#FFE8D0", intensity: 1.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 4800 },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
