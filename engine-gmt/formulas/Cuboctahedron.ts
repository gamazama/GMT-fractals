
import { FractalDefinition } from '../types';

export const Cuboctahedron: FractalDefinition = {
    id: 'Cuboctahedron',
    name: 'Cuboctahedron',
    shortDescription: 'Archimedean solid fractal with cutting-plane DE.',
    description: 'Kaleidoscopic IFS fractal with true cuboctahedral geometry. Uses Knighty\'s fold-and-cut approach: octahedral symmetry fold combined with cutting-plane distance estimation. The cuboctahedron vertex sits at the edge midpoint of the octahedral Schwarz triangle. Unlike r/dr estimation, the cutting-plane DE naturally handles fold boundary points, producing exact geometry.',
    juliaType: 'offset',
    tags: ['archimedean', 'ifs', 'knighty'],

    shader: {
        preamble: `
    // Cuboctahedron: Knighty fold-and-cut with cutting-plane DE
    // Octahedral symmetry (Type=4), cuboctahedron = edge midpoint (pbc)
    // Cutting-plane DE: accumulates max(signed_distance_to_face_planes) across iterations
    // This avoids the fold boundary degeneracy that breaks r/dr estimation at (1,1,0)

    // Fold normal for octahedral symmetry: nc = (-0.5, -cos(pi/4), sqrt(0.75 - cos^2(pi/4)))
    const vec3 co_nc = vec3(-0.5, -0.70710678, 0.5);
    // Schwarz triangle basis vectors (hardcoded from Type=4 geometry)
    const vec3 co_pab = vec3(0.0, 0.0, 1.0);                  // face center (octahedron vertex)
    const vec3 co_pbc = vec3(0.70710678, 0.0, 0.70710678);    // edge midpoint (cuboctahedron)
    const vec3 co_pca = vec3(0.0, 0.57735027, 0.81649658);    // cube vertex direction
    // Precomputed dot products for cutting planes: dot(pbc, pab) and dot(pbc, pca)
    const float co_d_pab = 0.70710678;  // 1/sqrt(2)
    const float co_d_pca = 0.57735027;  // 1/sqrt(3)

    // Cutting-plane DE accumulator (mutable — must be in preambleVars)
    float cp_dmin;
    float cp_scale;
    float cp_trap;`,
        preambleVars: ['cp_dmin', 'cp_scale', 'cp_trap'],
        function: `
    void formula_Cuboctahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Knighty octahedral fold: abs + reflect through nc, repeated 4 times (Type=4)
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;

        // Cutting plane distance: three face planes of the cuboctahedron
        // Each plane passes through the principal vertex (pbc * size) with normal = basis vector
        float size = uParamB;
        float d0 = dot(z3, co_pab) - co_d_pab * size;
        float d1 = dot(z3, co_pbc) - size;
        float d2 = dot(z3, co_pca) - co_d_pca * size;
        float d_face = max(max(d0, d1), d2);
        cp_dmin = max(cp_dmin, cp_scale * d_face);

        // Scale and offset toward cuboctahedron vertex
        float scale = uParamA;
        vec3 offset = co_pbc * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        cp_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        cp_trap = trap;
    }`,
        loopBody: `formula_Cuboctahedron(z, dr, trap, c);`,
        loopInit: `gmt_precalcRodrigues(uVec3B);
cp_dmin = -1e10;
cp_scale = 1.0;
cp_trap = 1e10;`,
        getDist: `
        return vec2(abs(cp_dmin), cp_trap);
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
        formula: "Cuboctahedron",
        features: {
            coreMath: { iterations: 13, paramA: 2, paramB: 1, paramF: 0, vec3A: { x: 0.7055, y: 0, z: 0 }, vec3B: { x: 0, y: 0, z: 0 } },
            coloring: {
                gradient: { stops: [
                    { id: "cubo_5", position: 0, color: "#0D3D24", bias: 0.5, interpolation: "linear" },
                    { id: "cubo_4", position: 0.2, color: "#E0F5E0", bias: 0.5, interpolation: "linear" },
                    { id: "cubo_3", position: 0.4, color: "#90EE90", bias: 0.5, interpolation: "linear" },
                    { id: "cubo_2", position: 0.6, color: "#3CB371", bias: 0.5, interpolation: "linear" },
                    { id: "cubo_1", position: 0.8, color: "#1B5E3A", bias: 0.5, interpolation: "linear" },
                    { id: "cubo_0", position: 1, color: "#0A2F1F", bias: 0.5, interpolation: "linear" },
                ], colorSpace: "linear" },
                mode: 0,
                scale: 12.3594,
                offset: -0.9222,
                repeats: 1,
                phase: 0,
                bias: 1,
                colorIter: 0,
                twist: 0,
                escape: 2,
                gradient2: [
                    { id: "1", position: 0.4, color: "#FFFFFF" },
                    { id: "2", position: 0.85, color: "#3CB371" },
                ],
                mode2: 5,
                scale2: 1,
                offset2: 0,
                repeats2: 1,
                phase2: 0,
                bias2: 1,
                twist2: 0,
                blendMode: 2,
                blendOpacity: 0,
                layer3Color: "#ffffff",
                layer3Scale: 89,
                layer3Strength: 0,
                layer3Bump: 0,
                layer3Turbulence: 0,
                layer3Enabled: true,
            },
            ao: { aoIntensity: 0.3, aoSpread: 0.2, aoSamples: 5, aoMode: false, aoColor: "#000000", aoMaxSamples: 32, aoStochasticCp: true, aoEnabled: true },
            texturing: { active: false, layer1Data: null, colorSpace: 0, mapU: 6, mapV: 8, textureScale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
            materials: {
                diffuse: 2,
                reflection: 0.39,
                specular: 0.87,
                roughness: 0.35,
                rim: 0,
                rimExponent: 4.5,
                envStrength: 1.12,
                envBackgroundStrength: 0.3,
                envSource: 1,
                envMapData: null,
                envMapColorSpace: 0,
                useEnvMap: false,
                envRotation: 0,
                envGradientStops: { stops: [
                    { id: "0", position: 0, color: "#0A2F1F", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.3, color: "#1B5E3A", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.65, color: "#3CB371", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 1, color: "#E0F5E0", bias: 0.5, interpolation: "linear" },
                ], colorSpace: "linear" },
                emission: 0,
                emissionMode: 0,
                emissionColor: "#ffffff",
                ptEmissionMult: 1,
            },
            atmosphere: {
                glowEnabled: true,
                glowQuality: 0,
                fogIntensity: 0,
                fogNear: 0.0001,
                fogFar: 501,
                fogColor: "#000000",
                fogDensity: 0,
                glowIntensity: 0,
                glowSharpness: 1,
                glowMode: false,
                glowColor: "#ffffff",
            },
            geometry: {
                applyTransformLogic: true,
                preRotMaster: true,
                hybridCompiled: false,
                hybridMode: false,
                hybridFoldType: 0,
                hybridComplex: false,
                hybridPermute: 0,
                burningEnabled: false,
                hybridIter: 2,
                hybridFoldLimit: 1,
                hybridFoldLimitVec: { x: 1, y: 1, z: 1 },
                hybridScale: 2,
                hybridScaleVary: 0,
                hybridMinR: 0.5,
                hybridFixedR: 1,
                hybridAddC: false,
                hybridShift: { x: 0, y: 0, z: 0 },
                hybridRot: { x: 0, y: 0, z: 0 },
                hybridFoldingValue: { x: 2, y: 2, z: 2 },
                hybridKaliConstant: { x: 1, y: 1, z: 1 },
                hybridMengerOffset: { x: 1, y: 1, z: 1 },
                hybridMengerCenterZ: true,
                hybridSwap: false,
                hybridSkip: 1,
                preRotEnabled: false,
                preRotX: 0,
                preRotY: 0,
                preRotZ: 0,
                postRotX: 0,
                postRotY: 0,
                postRotZ: 0,
                worldRotX: 0,
                worldRotY: 0,
                worldRotZ: 0,
                juliaMode: false,
                juliaX: 0,
                juliaY: 0,
                juliaZ: 0,
                preRot: { x: 0, y: 0, z: 0 },
                postRot: { x: 0, y: 0, z: 0 },
                worldRot: { x: 0, y: 0, z: 0 },
                julia: { x: 0, y: 0, z: 0 },
            },
            lighting: {
                advancedLighting: true,
                ptEnabled: true,
                renderMode: 0,
                ptBounces: 3,
                ptGIStrength: 1,
                specularModel: 0,
                shadowsCompile: true,
                shadowAlgorithm: 0,
                ptStochasticShadows: true,
                ptNEEAllLights: false,
                ptEnvNEE: false,
                ptMaxLuminance: 10,
                shadows: true,
                areaLights: false,
                shadowIntensity: 1,
                shadowSoftness: 200,
                shadowSteps: 128,
                shadowBias: 0,
                lights: [
                    { type: "Directional", position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.8701, y: -0.1971, z: 0.0918 }, color: "#E8F0FF", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 6500, id: "l13" },
                    { type: "Point", position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false, id: "l14" },
                    { type: "Point", position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false, id: "l15" },
                ],
            },
            quality: {
                engineQuality: true,
                compilerHardCap: 2000,
                precisionMode: 0,
                bufferPrecision: 0,
                maxSteps: 400,
                distanceMetric: 0,
                estimator: 1,
                fudgeFactor: 0.6,
                stepRelaxation: 0,
                stepJitter: 0.15,
                refinementSteps: 0,
                detail: 2,
                pixelThreshold: 0.2,
                overstepTolerance: 0,
                dynamicScaling: false,
                interactionDownsample: 2,
                physicsProbeMode: 0,
                manualDistance: 10,
            },
            colorGrading: { active: false, toneMapping: 0, saturation: 1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            optics: { camType: 0, camFov: 36, orthoScale: 2, dofStrength: 0, dofFocus: 5 },
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.1405, y: 0.588, z: 0.1046, w: 0.7897 },
        cameraFov: 36,
        sceneOffset: { x: 2, y: 0.95, z: 1.1, xL: 0.4539, yL: -0.0784, zL: -0.3671 },
        targetDistance: 2.1206,
        cameraMode: "Orbit",
        lights: [
            { type: "Directional", position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#E8F0FF", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 6500 },
            { type: "Point", position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: "Point", position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
        ]
    }
};
