
import { FractalDefinition } from '../types';

export const RhombicDodecahedron: FractalDefinition = {
    id: 'RhombicDodecahedron',
    name: 'Rhombic Dodecahedron',
    shortDescription: 'Catalan solid fractal — dual of the cuboctahedron.',
    description: 'Kaleidoscopic IFS fractal with rhombic dodecahedral geometry. Uses RD face-normal folds instead of the Knighty fold — reflections through (1,±1,0)/√2 and (0,1,±1)/√2 planes, which ARE the RD face planes themselves. This ensures all fold boundaries align with RD faces, producing true rhombic geometry at every iteration level. The fold domain x ≥ y ≥ |z| is bounded entirely by RD faces.',
    juliaType: 'offset',

    shader: {
        preamble: `
    // RhombicDodecahedron: RD face-normal fold (NOT Knighty fold)
    //
    // Key insight: the RD's own face normals (1,±1,0)/√2 and (0,1,±1)/√2 are valid
    // reflection planes that generate the chiral octahedral group O (24 elements).
    // The fundamental domain x ≥ y ≥ |z| is bounded ENTIRELY by RD face planes.
    //
    // In this domain the RD SDF simplifies to a single plane:
    //   d = (x + y - size) / √2
    // because x+y ≥ y+|z| and x+y ≥ |z|+x when x ≥ y ≥ |z|.
    //
    // Verified: fold converges in 3 iterations for all sphere points.
    // Domain boundaries: x=y (RD face), y=z (RD face), y=-z (RD face).

    // RD face fold normals (all unit vectors)
    const vec3 rd_n1 = vec3(0.70710678, 0.70710678, 0.0);    // (1,1,0)/√2
    const vec3 rd_n2 = vec3(0.70710678, -0.70710678, 0.0);   // (1,-1,0)/√2
    const vec3 rd_n3 = vec3(0.0, 0.70710678, 0.70710678);    // (0,1,1)/√2
    const vec3 rd_n4 = vec3(0.0, 0.70710678, -0.70710678);   // (0,1,-1)/√2

    // Cutting-plane normal in the folded domain: (1,1,0)/√2
    // (same as rd_n1, since in domain x≥y≥|z| the RD SDF = (x+y-s)/√2)
    const vec3 rd_cut = vec3(0.70710678, 0.70710678, 0.0);

    // Offset toward face centroid in the domain
    // Face piece vertices: (s,0,0), (s/2,s/2,s/2), (s/2,s/2,-s/2)
    // Centroid ≈ (2/3, 1/3, 0) direction = normalize(2,1,0)
    const vec3 rd_offset_dir = vec3(0.89442719, 0.44721360, 0.0);

    // Cutting-plane DE accumulator
    float rd_dmin;
    float rd_scale;
    float rd_trap;`,
        preambleVars: ['rd_dmin', 'rd_scale', 'rd_trap'],
        function: `
    void formula_RhombicDodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: RD face-normal fold — 3 rounds of 4 reflections
        // Folds through the RD's own face planes, NOT Knighty's nc
        // Domain: x ≥ y ≥ |z|, bounded entirely by RD faces
        for (int i = 0; i < 3; i++) {
            z3 -= 2.0 * min(0.0, dot(z3, rd_n1)) * rd_n1;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n2)) * rd_n2;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n3)) * rd_n3;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n4)) * rd_n4;
        }

        // Step 2: Cutting plane — in domain x≥y≥|z|, RD SDF = dot(z3, (1,1,0)/√2) - size/√2
        float size = uParamB;
        float d = dot(z3, rd_cut) - size * 0.70710678;
        rd_dmin = max(rd_dmin, rd_scale * d);

        // Step 3: Scale and offset toward face centroid
        float scale = uParamA;
        vec3 offset = rd_offset_dir * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        rd_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        rd_trap = trap;
    }`,
        loopBody: `formula_RhombicDodecahedron(z, dr, trap, c);`,
        loopInit: `gmt_precalcRodrigues(uVec3B);
rd_dmin = -1e10;
rd_scale = 1.0;
rd_trap = 1e10;`,
        getDist: `
        return vec2(abs(rd_dmin), rd_trap);
    `,
        usesSharedRotation: true,
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 2.0 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "RhombicDodecahedron",
        features: {
            coreMath: { iterations: 16, paramA: 1.5, paramB: 1.0, paramF: 0, vec3A: { x: 0, y: 0, z: 0 }, vec3B: { x: 0, y: 0, z: 0 } },
            coloring: {
                gradient: { stops: [
                    { id: "rd_0", position: 0, color: "#0A2E1B", bias: 0.5, interpolation: "linear" },
                    { id: "rd_1", position: 0.2, color: "#1B5E3B", bias: 0.984, interpolation: "linear" },
                    { id: "rd_2", position: 0.45, color: "#35EBED", bias: 0.323, interpolation: "linear" },
                    { id: "rd_3", position: 0.65, color: "#7DCEA0", bias: 0.5, interpolation: "linear" },
                    { id: "rd_4", position: 0.85, color: "#A8E6CF", bias: 0.5, interpolation: "linear" },
                    { id: "rd_5", position: 1, color: "#0D3D21", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "linear" },
                mode: 0, scale: 0.902, offset: -0.601, repeats: 1, phase: -0.59, bias: 1, colorIter: 13, twist: 0, escape: 2,
                gradient2: [
                    { id: "1", position: 0.3, color: "#FFFFFF" },
                    { id: "2", position: 0.85, color: "#2ECC71" }
                ],
                mode2: 5, scale2: 1, offset2: 0, repeats2: 1, phase2: 0, bias2: 1, twist2: 0,
                blendMode: 2, blendOpacity: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true
            },
            ao: { aoIntensity: 0.396, aoSpread: 0.135, aoSamples: 5, aoEnabled: true, aoMode: false },
            reflections: { enabled: true, reflectionMode: 1, bounces: 1, steps: 64, mixStrength: 1, roughnessThreshold: 0.62 },
            materials: {
                diffuse: 1.8, reflection: 0.1, specular: 1.2, roughness: 0.4,
                rim: 0.307, rimExponent: 1.6, envStrength: 2.09, envBackgroundStrength: 0.15,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: { stops: [
                    { id: "0", position: 0, color: "#0A1A10", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.4, color: "#1B5E3B", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.7, color: "#7DCEA0", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 1, color: "#E8F5E9", bias: 0.5, interpolation: "linear" }
                ], colorSpace: "linear" }
            },
            atmosphere: {
                fogIntensity: 0, fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 1, glowMode: false, glowColor: "#ffffff"
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 250, shadowIntensity: 1, shadowBias: 0 },
            quality: { detail: 7.5, fudgeFactor: 0.6, pixelThreshold: 2, maxSteps: 400, distanceMetric: 0, stepJitter: 0.15, estimator: 1 },
            colorGrading: { saturation: 1.1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            optics: { camFov: 38, dofStrength: 0, dofFocus: 5 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.2886, y: 0.3638, z: -0.1196, w: 0.8775 },
        sceneOffset: { x: 2, y: -2.05, z: 1.6, xL: -0.4395, yL: 0.3823, zL: -0.0229 },
        targetDistance: 1.905,
        cameraMode: "Orbit",
        lights: [
            { type: 'Directional', position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#F0FFE8", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 5500 },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
