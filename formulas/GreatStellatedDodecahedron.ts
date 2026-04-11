
import { FractalDefinition } from '../types';

export const GreatStellatedDodecahedron: FractalDefinition = {
    id: 'GreatStellatedDodecahedron',
    name: 'Great Stellated Dodecahedron',
    shortDescription: 'Kepler-Poinsot star polyhedron IFS fractal.',
    description: 'Kaleidoscopic IFS fractal based on the great stellated dodecahedron — a Kepler-Poinsot star polyhedron. Uses icosahedral symmetry folds followed by a stellation step that pushes points outward along the vertex direction, creating spiky star-shaped geometry. The stellation parameter controls the spike depth.',
    juliaType: 'offset',
    tags: ['kepler-poinsot', 'ifs', 'star', 'stellation'],

    shader: {
        preamble: `
    // Great Stellated Dodecahedron: Cutting-plane DE with stellated face planes
    //
    // Uses Knighty's fold-and-cut stellation approach from Stellations-dodecahedron-try-colored.frag.
    // The icosahedral fold (abs + nc reflect × 3) maps to the fundamental domain.
    // The face plane (pbc) is reflected through symmetry operations for each stellation level:
    //   Iter=0: pbc = normalize(1, 0, φ)     — dodecahedron face (unstellated)
    //   Iter=4: pbc = normalize(φ, 1, 0)     — great stellated dodecahedron
    // The stellation parameter interpolates between these.
    //
    // Hybrid approach:
    //   1. abs(z) + nc reflect × 3 — icosahedral fold to fundamental domain
    //   2. Cutting plane — distance to stellated face
    //   3. Scale + offset — IFS dynamics

    // Icosahedral fold normal: nc = (-0.5, -cos(π/5), sqrt(3/4 - cos²(π/5)))
    const vec3 gsd_nc = vec3(-0.5, -0.80901699, 0.30901699);

    // Offset toward icosahedron vertex (pab = (0,0,1) in Schwarz triangle)
    // The GSD spike tips are at icosahedron vertex positions
    const vec3 gsd_pab = vec3(0.0, 0.0, 1.0);

    // Stellated face normal (mutable, computed from stellation parameter)
    vec3 gsd_faceNor;
    float gsd_faceOff;

    // Cutting-plane DE accumulator
    float gsd_dmin;
    float gsd_scale;
    float gsd_trap;

    void GreatStellatedDodecahedron_precalc() {
        // Precompute stellated face normal from stellation parameter
        // pbc at various stellation levels (traced through Knighty's reflection sequence):
        //   Iter=0: normalize(1, 0, φ)  = (0.52573, 0, 0.85065)
        //   Iter=4: normalize(φ, 1, 0)  = (0.85065, 0.52573, 0)
        vec3 pbc = vec3(0.52573111, 0.0, 0.85065081);

        float stellLevel = uParamC;

        // Apply stellation reflections to pbc
        vec3 sp = pbc;
        sp.x = -sp.x;                                                        // 1st stellation
        float tn = -2.0 * dot(sp, gsd_nc); sp += tn * gsd_nc;              // 2nd stellation
        sp.y = -sp.y;                                                        // 3rd stellation
        tn = -2.0 * dot(sp, gsd_nc); sp += tn * gsd_nc;                    // 4th (great stellated)

        gsd_faceNor = normalize(mix(pbc, sp, stellLevel));

        // Face offset: distance from origin to face plane along normal through vertex p
        // p = normalize(pca) = normalize(0, scospin, cospin) = (0, 0.356822, 0.934172)
        vec3 p = vec3(0.0, 0.35682209, 0.93417236);
        gsd_faceOff = dot(gsd_faceNor, p);
    }`,
        preambleVars: ['gsd_faceNor', 'gsd_faceOff', 'gsd_dmin', 'gsd_scale', 'gsd_trap'],
        function: `
    void formula_GreatStellatedDodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: Full icosahedral fold — (abs + nc reflect) × 3
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;

        // Step 2: Cutting plane — distance to stellated face in fundamental domain
        float size = uParamB;
        float d_face = dot(z3, gsd_faceNor) - gsd_faceOff * size;
        gsd_dmin = max(gsd_dmin, gsd_scale * d_face);

        // Step 3: Scale and offset toward icosahedron vertex (spike tip)
        float scale = uParamA;
        vec3 offset = gsd_pab * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        gsd_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        gsd_trap = trap;
    }`,
        loopBody: `formula_GreatStellatedDodecahedron(z, dr, trap, c);`,
        loopInit: `GreatStellatedDodecahedron_precalc();
gmt_precalcRodrigues(uVec3B);
gsd_dmin = -1e10;
gsd_scale = 1.0;
gsd_trap = 1e10;`,
        getDist: `
        return vec2(abs(gsd_dmin), gsd_trap);
    `,
        usesSharedRotation: true,
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 2.0 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Stellation', id: 'paramC', min: -1.0, max: 2.0, step: 0.001, default: 0.5 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "GreatStellatedDodecahedron",
        features: {
            coreMath: { iterations: 13, paramA: 2, paramB: 0.5, paramC: 2.88, paramF: 0, vec3A: { x: -0.097, y: 0, z: 0.073 }, vec3B: { x: 0, y: 0, z: 0 } },
            coloring: {
                gradient: { stops: [
                    { id: "gsd_0", position: 0, color: "#009392", bias: 0.5, interpolation: "linear" },
                    { id: "gsd_1", position: 0.167, color: "#72aaa1", bias: 0.5, interpolation: "linear" },
                    { id: "gsd_2", position: 0.333, color: "#b1c7b3", bias: 0.5, interpolation: "linear" },
                    { id: "gsd_3", position: 0.438, color: "#f1eac8", bias: 0.5, interpolation: "linear" },
                    { id: "gsd_4", position: 0.52, color: "#e5b9ad", bias: 0.5, interpolation: "linear" },
                    { id: "gsd_5", position: 0.612, color: "#d98994", bias: 0.386, interpolation: "linear" },
                    { id: "gsd_6", position: 1, color: "#d0587e", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "linear" },
                mode: 1, scale: 16.374, offset: -0.511, repeats: 1, phase: 0, bias: 1, twist: 0, escape: 2,
                gradient2: { stops: [
                    { id: "1", position: 0.241, color: "#000000", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.676, color: "#5CBDFF", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 0.838, color: "#000000", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "srgb" },
                mode2: 11, scale2: 1.098, offset2: -0.479, repeats2: 2, phase2: -0.34, bias2: 1, twist2: 0,
                blendMode: 1, blendOpacity: 3,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true
            },
            ao: { aoIntensity: 0.42, aoSpread: 0.115, aoSamples: 12, aoEnabled: true, aoMode: false },
            reflections: { enabled: true, reflectionMode: 1, bounces: 1, steps: 64, mixStrength: 1, roughnessThreshold: 0.62 },
            materials: {
                diffuse: 2, reflection: 0, specular: 0.58, roughness: 0.132,
                rim: 0, rimExponent: 5, envStrength: 0, envBackgroundStrength: 0.15,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0.185, emissionMode: 1, emissionColor: "#ffffff",
                envGradientStops: { stops: [
                    { id: "0", position: 0, color: "#FFFFFF", bias: 0.531, interpolation: "linear" },
                    { id: "1", position: 0.3, color: "#000000", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.65, color: "#000000", bias: 0.757, interpolation: "linear" },
                    { id: "3", position: 1, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "srgb" }
            },
            atmosphere: {
                fogIntensity: 0, fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.007, glowSharpness: 7.413, glowMode: false, glowColor: "#ffffff"
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 200, shadowIntensity: 1, shadowBias: 0 },
            quality: { detail: 2, fudgeFactor: 0.6, pixelThreshold: 0.2, maxSteps: 400, distanceMetric: 0, stepJitter: 0.15, estimator: 1 },
            colorGrading: { saturation: 1.1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            optics: { camFov: 36, dofStrength: 0, dofFocus: 5 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.0554, y: 0.2593, z: -0.0149, w: 0.9641 },
        sceneOffset: { x: 0.8864, y: -0.4103, z: 2.3049, xL: 0.3623, yL: 0.0597, zL: 0.2368 },
        targetDistance: 2.44,
        cameraMode: "Orbit",
        lights: [
            { type: 'Directional', position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.221, y: -0.428, z: 0.048 }, color: "#FFE0C0", intensity: 1, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 4800 },
            { type: 'Point', position: { x: 0.242, y: -0.766, z: 1.511 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FF8F8F", intensity: 6.708, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: true },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#7C7CFF", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
