
import { FractalDefinition } from '../types';

export const Octahedron: FractalDefinition = {
    id: 'Octahedron',
    name: 'Octahedron',
    shortDescription: 'Kaleidoscopic IFS with octahedral symmetry (Knighty).',
    description: 'Kaleidoscopic IFS fractal with octahedral/cubic symmetry. Uses 4 conditional fold operations per iteration to map points into the octahedral fundamental domain. Based on Knighty\'s method from Fragmentarium. Supports rotation, twist, and shift.',
    juliaType: 'offset',

    shader: {
        preamble: `
    // Octahedron: vertex direction for offset (Fragmentarium default: Offset = (1,0,0))
    const vec3 octa_vertexDir = vec3(1.0, 0.0, 0.0);`,
        function: `
    void formula_Octahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Octahedral symmetry folds (Knighty)
        // 4 conditional reflections map any point into the octahedral fundamental domain
        if (z3.x + z3.y < 0.0) z3.xy = -z3.yx;
        if (z3.x + z3.z < 0.0) z3.xz = -z3.zx;
        if (z3.x - z3.y < 0.0) z3.xy = z3.yx;
        if (z3.x - z3.z < 0.0) z3.xz = z3.zx;

        // Scale and offset toward octahedron vertex
        float scale = uParamA;
        vec3 offset = octa_vertexDir * uParamB * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,
        loopBody: `formula_Octahedron(z, dr, trap, c);`,
        loopInit: `gmt_precalcRodrigues(uVec3B);`,
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
        formula: "Octahedron",
        features: {
            coreMath: { iterations: 13, paramA: 2, paramB: 1, paramF: 0, vec3A: { x: 0, y: 0, z: 0 }, vec3B: { x: 0, y: 0, z: 0 } },
            coloring: {
                gradient: { stops: [
                    { id: "octa_5", position: 0, color: "#5C2D00", bias: 0.5, interpolation: "linear" },
                    { id: "octa_4", position: 0.2, color: "#FFA500", bias: 0.5, interpolation: "linear" },
                    { id: "octa_3", position: 0.4, color: "#FFD700", bias: 0.5, interpolation: "linear" },
                    { id: "1775546936281", position: 0.4568, color: "#FFFFFF", bias: 0.5, interpolation: "linear" },
                    { id: "1775546967714", position: 0.5074, color: "#FFCE00", bias: 0.5, interpolation: "linear" },
                    { id: "octa_2", position: 0.6, color: "#B8860B", bias: 0.5, interpolation: "linear" },
                    { id: "octa_1", position: 0.8, color: "#8B4513", bias: 0.5, interpolation: "linear" },
                    { id: "octa_0", position: 1, color: "#3D1C02", bias: 0.5, interpolation: "linear" },
                ], colorSpace: "linear" },
                mode: 0,
                scale: 8.5531,
                offset: -0.2513,
                repeats: 3,
                phase: 0,
                bias: 1,
                colorIter: 2,
                twist: 0,
                escape: 2,
                gradient2: [
                    { id: "1", position: 0.4, color: "#FFFFFF" },
                    { id: "2", position: 0.85, color: "#FFD700" },
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
            ao: { aoIntensity: 0.47, aoSpread: 0.1, aoSamples: 5, aoMode: false, aoColor: "#000000", aoMaxSamples: 32, aoStochasticCp: true, aoEnabled: true },
            texturing: { active: false, layer1Data: null, colorSpace: 0, mapU: 6, mapV: 8, textureScale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
            materials: {
                diffuse: 2,
                reflection: 0.3,
                specular: 1.5,
                roughness: 0.35,
                rim: 0,
                rimExponent: 4.5,
                envStrength: 0.7,
                envBackgroundStrength: 0.18,
                envSource: 1,
                envMapData: null,
                envMapColorSpace: 0,
                useEnvMap: false,
                envRotation: 0,
                envGradientStops: { stops: [
                    { id: "0", position: 0, color: "#1A0A00", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.3, color: "#4A2800", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.6, color: "#B8860B", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 1, color: "#FFE4B5", bias: 0.5, interpolation: "linear" },
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
                    { type: "Directional", position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#FFE6D1", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 5100, id: "l7" },
                    { type: "Point", position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false, id: "l8" },
                    { type: "Point", position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false, id: "l9" },
                ],
            },
            quality: {
                engineQuality: true,
                compilerHardCap: 2000,
                precisionMode: 0,
                bufferPrecision: 0,
                maxSteps: 300,
                distanceMetric: 2,
                estimator: 2,
                fudgeFactor: 0.9,
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
            colorGrading: { active: false, toneMapping: 0, saturation: 1.05, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            optics: { camType: 0, camFov: 40, orthoScale: 2, dofStrength: 0, dofFocus: 5 },
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.0906, y: 0.1352, z: 0.0124, w: 0.9866 },
        cameraFov: 40,
        sceneOffset: { x: 1, y: 0.95, z: 3.1, xL: -0.1814, yL: -0.3153, zL: -0.1483 },
        targetDistance: 2.5878,
        cameraMode: "Orbit",
        lights: [
            { type: "Directional", position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#FFE6D1", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 5100 },
            { type: "Point", position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: "Point", position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
        ]
    }
};
