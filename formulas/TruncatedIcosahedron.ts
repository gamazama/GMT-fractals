
import { FractalDefinition } from '../types';

export const TruncatedIcosahedron: FractalDefinition = {
    id: 'TruncatedIcosahedron',
    name: 'Truncated Icosahedron',
    shortDescription: 'Soccer ball / Bucky ball IFS fractal.',
    description: 'Kaleidoscopic IFS fractal with truncated icosahedral geometry (soccer ball / C60 buckyball). Uses icosahedral symmetry folds with an offset pointing toward the truncated vertex position — between the icosahedron vertex and edge midpoint. The truncation parameter controls how much vertex is cut, interpolating between icosahedron (0) and truncated icosahedron (1).',
    juliaType: 'offset',
    tags: ['archimedean', 'ifs', 'knighty', 'soccer-ball'],

    shader: {
        preamble: `
    // Truncated Icosahedron: Icosahedral folds + truncated vertex offset
    const float trIco_Phi = (1.0 + sqrt(5.0)) * 0.5;

    // Icosahedral fold normals (same as Icosahedron)
    const vec3 trIco_n1 = normalize(vec3(-trIco_Phi, trIco_Phi - 1.0, 1.0));
    const vec3 trIco_n2 = normalize(vec3(1.0, -trIco_Phi, trIco_Phi + 1.0));
    const vec3 trIco_n3 = vec3(0.0, 0.0, -1.0);

    // Icosahedron vertex direction
    const vec3 trIco_vertexDir = normalize(vec3(0.850650808, 0.525731112, 0.0));
    // Dodecahedron vertex direction (face center of icosahedron after folding)
    // This is genuinely different from vertexDir, enabling truncation interpolation
    const vec3 trIco_dodecDir = normalize(vec3(1.0, 1.0, 1.0));`,
        function: `
    void formula_TruncatedIcosahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Inner fold: abs + n1 only (full prefold runs once in loopInit)
        z3 = abs(z3);
        float t = dot(z3, trIco_n1);
        if (t > 0.0) z3 -= 2.0 * t * trIco_n1;

        // Offset direction: interpolate between icosahedron vertex and dodecahedron vertex
        // 0 = icosahedron, ~0.33 = truncated icosahedron, ~0.5 = icosidodecahedron, 1 = dodecahedron
        float trunc = clamp(uParamC, 0.0, 1.0);
        vec3 offsetDir = normalize(mix(trIco_vertexDir, trIco_dodecDir, trunc));

        // Scale and offset
        float scale = uParamA;
        vec3 offset = offsetDir * uParamB * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, dot(z3, z3));
    }`,
        loopBody: `formula_TruncatedIcosahedron(z, dr, trap, c);`,
        loopInit: `
    gmt_precalcRodrigues(uVec3B);
    // Icosahedral prefold: full fold sequence runs ONCE before iteration loop
    {
        vec3 pf = z.xyz;
        pf = abs(pf);
        float t;
        t = dot(pf, trIco_n1); if (t > 0.0) pf -= 2.0 * t * trIco_n1;
        t = dot(pf, trIco_n2); if (t > 0.0) pf -= 2.0 * t * trIco_n2;
        t = dot(pf, trIco_n3); if (t > 0.0) pf -= 2.0 * t * trIco_n3;
        t = dot(pf, trIco_n2); if (t > 0.0) pf -= 2.0 * t * trIco_n2;
        z.xyz = pf;
    }`,
        usesSharedRotation: true,
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 2.0 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Truncation', id: 'paramC', min: 0.0, max: 1.0, step: 0.001, default: 0.667 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

                defaultPreset: {
        formula: "TruncatedIcosahedron",
        features: {
            coreMath: { iterations: 13, paramA: 2, paramB: 1, paramC: 0.666, paramF: 0, vec3A: { x: 0, y: 0, z: 0 }, vec3B: { x: 0, y: 0, z: 0 } },
            coloring: {
                gradient: { stops: [
                    { id: "trico_0", position: 0, color: "#1A0A2E", bias: 0.5, interpolation: "linear" },
                    { id: "trico_1", position: 0.2, color: "#3D1C6B", bias: 0.5, interpolation: "linear" },
                    { id: "trico_2", position: 0.4, color: "#7B2FBE", bias: 0.5, interpolation: "linear" },
                    { id: "trico_3", position: 0.6, color: "#C77DFF", bias: 0.5, interpolation: "linear" },
                    { id: "trico_4", position: 0.8, color: "#E0AAFF", bias: 0.5, interpolation: "linear" },
                    { id: "trico_5", position: 1, color: "#240046", bias: 0.5, interpolation: "linear" },
                ], colorSpace: "linear" },
                mode: 0,
                scale: 3.8857,
                offset: 0.3843,
                repeats: 1,
                phase: 0.333,
                bias: 1,
                colorIter: 0,
                twist: 0,
                escape: 2,
                gradient2: [
                    { id: "1", position: 0.35, color: "#FFFFFF" },
                    { id: "2", position: 0.9, color: "#7B2FBE" },
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
            ao: { aoIntensity: 0.35, aoSpread: 0.2, aoSamples: 5, aoMode: false, aoColor: "#000000", aoMaxSamples: 32, aoStochasticCp: true, aoEnabled: true },
            texturing: { active: false, layer1Data: null, colorSpace: 0, mapU: 6, mapV: 8, textureScale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
            materials: {
                diffuse: 2,
                reflection: 0.2,
                specular: 0.93,
                roughness: 0.3,
                rim: 0,
                rimExponent: 5,
                envStrength: 0.25,
                envBackgroundStrength: 0.23,
                envSource: 1,
                envMapData: null,
                envMapColorSpace: 0,
                useEnvMap: false,
                envRotation: 0,
                envGradientStops: { stops: [
                    { id: "0", position: 0, color: "#1A0A2E", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.35, color: "#3D1C6B", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.65, color: "#7B2FBE", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 1, color: "#E0AAFF", bias: 0.5, interpolation: "linear" },
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
                    { type: "Directional", position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#E8F0FF", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 6500, id: "l16" },
                    { type: "Point", position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false, id: "l17" },
                    { type: "Point", position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false, id: "l18" },
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
                fudgeFactor: 0.8,
                stepRelaxation: 0,
                stepJitter: 0.1,
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
        cameraRot: { x: -0.1127, y: 0.1382, z: 0.0158, w: 0.9839 },
        cameraFov: 36,
        sceneOffset: { x: 0.97, y: 0.63, z: 2.99, xL: -0.0955, yL: 0.0888, zL: 0.0454 },
        targetDistance: 2.4005,
        cameraMode: "Orbit",
        lights: [
            { type: "Directional", position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#E8F0FF", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 6500 },
            { type: "Point", position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: "Point", position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
        ]
    }
};
