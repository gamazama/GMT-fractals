
import { FractalDefinition } from '../types';

export const Apollonian: FractalDefinition = {
    id: 'Apollonian',
    name: 'Apollonian',
    shortDescription: 'Apollonian gasket — sphere packing via iterative inversion.',
    description: 'Apollonian gasket fractal using space folding and sphere inversion. Each iteration folds space into a unit cube then applies an inversion sphere, creating a foam-like recursive sphere packing. Based on kosalos\'s Fragmentarium implementation (fractalforums.org). The modulation factor \'t\' is computed once from the initial ray position before iterations, matching the reference. Optional spherical inversion pre-transform mode (Inversion > 0) replicates the reference \'doInversion\' mode with center, radius, and XY angle rotation with proper DE correction.',
    juliaType: 'offset',
    tags: ['sphere-packing', 'inversion', 'foam'],

    shader: {
        // Pre-computed globals: t is constant per ray (computed once from initial position)
        preamble: `
float apo_t = 1.0;
float apo_invEnabled = 0.0;
float apo_r2 = 1.0;
float apo_invR = 1.0;
float apo_invRadius = 1.0;
`,
        preambleVars: ['apo_t', 'apo_invEnabled', 'apo_r2', 'apo_invR', 'apo_invRadius'],

        // Runs once before the iteration loop with z = initial ray position
        loopInit: `
// Compute modulation t once from the initial position (kosalos: t is constant throughout loop)
apo_t = uParamA * (uParamB + 0.25 * cos(3.14159265 * uParamC * (z.z - z.x)));
apo_invEnabled = 0.0;
apo_r2 = 1.0;
apo_invR = 1.0;
apo_invRadius = max(uVec2A.x, 0.001);

// Spherical inversion pre-transform (kosalos reference 'doInversion' mode)
if (uParamD > 0.5) {
    apo_invEnabled = 1.0;
    vec3 invCenter = uVec3B;
    float invRadius = apo_invRadius;
    float invAngle = uVec2A.y;

    vec3 ip = z.xyz - invCenter;
    apo_r2 = dot(ip, ip);
    apo_invR = sqrt(apo_r2);

    if (apo_r2 > 1e-10) {
        ip = (invRadius * invRadius / apo_r2) * ip + invCenter;
    }

    // XY plane rotation by invAngle (kosalos reference: atan + cos/sin)
    float an = atan(ip.y, ip.x) + invAngle;
    float ra = length(ip.xy);
    ip.x = cos(an) * ra;
    ip.y = sin(an) * ra;

    z.xyz = ip;

    // Recompute t from the transformed position (inversion changes the coordinates)
    apo_t = uParamA * (uParamB + 0.25 * cos(3.14159265 * uParamC * (z.z - z.x)));
}
`,

        function: `
    void formula_Apollonian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);

        // Per-axis fold scaling (kosalos: cc = vec3(cx,cy,cz))
        // uVec3A stores (cx-1, cy-1, cz-1) so defaults match reference cx=1.946, cy=0.991, cz=0.945
        vec3 cc = uVec3A + vec3(1.0);
        z3 *= cc;

        // Fold space into [-1, 1] cube
        z3 = -1.0 + 2.0 * fract(0.5 * z3 + 0.5);

        // Undo per-axis scaling
        z3 /= cc;

        // Sphere inversion using pre-computed t (constant per ray, from initial position)
        float z2 = apo_t / max(dot(z3, z3), 1e-10);
        z3 *= z2;
        dr *= abs(z2);

        if (uJuliaMode > 0.5) z3 += c.xyz;

        z.xyz = z3;
        trap = min(trap, abs(dot(z3, z3)));
    }`,
        loopBody: `formula_Apollonian(z, dr, trap, c);`,

        // Reference DE: 1.5 * (0.25 * abs(z.y) / scale) = 0.375 * |z.y| / dr
        // With inversion pre-transform: de = r^2 * de / (invRadius^2 + r * de)
        getDist: `
    float d = 0.375 * abs(z.y) / max(dr, 1e-10);
    if (apo_invEnabled > 0.5) {
        float invR2 = apo_invRadius * apo_invRadius;
        d = apo_r2 * d / max(invR2 + apo_invR * d, 1e-10);
    }
    return vec2(d, iter);
`,
    },

    parameters: [
        { label: 'Foam', id: 'paramA', min: 0.1, max: 3.0, step: 0.001, default: 1.032 },
        { label: 'Foam 2', id: 'paramB', min: 0.1, max: 3.0, step: 0.001, default: 0.92 },
        { label: 'Modulation', id: 'paramC', min: 0.0, max: 2.0, step: 0.001, default: 0.658 },
        { label: 'Inversion', id: 'paramD', min: 0.0, max: 1.0, step: 1.0, default: 0.0, mode: 'toggle' },
        { label: 'Fold Scale', id: 'vec3A', type: 'vec3', min: -1.0, max: 4.0, step: 0.001, default: { x: 0.946, y: -0.009, z: -0.055 } },
        { label: 'Inv Center', id: 'vec3B', type: 'vec3', min: -5.0, max: 5.0, step: 0.001, default: { x: 0.758, y: 0.312, z: 0.61 } },
        { label: 'Inv Radius / Angle', id: 'vec2A', type: 'vec2', min: -6.3, max: 10.0, step: 0.001, default: { x: 2.74, y: 0.07 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

                defaultPreset: {
        formula: "Apollonian",
        features: {
            coreMath: {
                iterations: 13,
                paramA: 1.4,
                paramB: 1,
                paramC: 0,
                paramD: 1,
                paramF: 0,
                vec2A: { x: 1, y: 0.502 },
                vec3A: { x: 0, y: 0, z: 0 },
                vec3B: { x: 1.3525, y: 0.3285, z: 0.61 },
            },
            coloring: {
                gradient: { stops: [
                    { id: "apo_0", position: 0, color: "#0D0221", bias: 0.5, interpolation: "linear" },
                    { id: "apo_1", position: 0.15, color: "#2A0845", bias: 0.5, interpolation: "linear" },
                    { id: "apo_2", position: 0.3, color: "#6B1D6B", bias: 0.5, interpolation: "linear" },
                    { id: "apo_3", position: 0.5, color: "#D4418E", bias: 0.5, interpolation: "linear" },
                    { id: "apo_4", position: 0.7, color: "#FF7F50", bias: 0.2247, interpolation: "linear" },
                    { id: "apo_5", position: 0.85, color: "#FFD700", bias: 0.2837, interpolation: "linear" },
                    { id: "apo_6", position: 1, color: "#1A0533", bias: 0.5, interpolation: "linear" },
                ], colorSpace: "srgb" },
                mode: 0,
                scale: 9.5331,
                offset: 1.1556,
                repeats: 1,
                phase: 0.11,
                bias: 1,
                colorIter: 0,
                twist: 0,
                escape: 2,
                gradient2: [
                    { id: "1", position: 0.3, color: "#FFFFFF" },
                    { id: "2", position: 0.8, color: "#D4418E" },
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
            ao: { aoIntensity: 0.411, aoSpread: 0.0032, aoSamples: 5, aoMode: false, aoColor: "#000000", aoMaxSamples: 32, aoStochasticCp: true, aoEnabled: true },
            texturing: { active: false, layer1Data: null, colorSpace: 0, mapU: 6, mapV: 8, textureScale: { x: 1, y: 1 }, offset: { x: 0, y: 0 } },
            materials: {
                diffuse: 2,
                reflection: 0.12,
                specular: 0.19,
                roughness: 0.187,
                rim: 0,
                rimExponent: 4.5,
                envStrength: 0.77,
                envBackgroundStrength: 0.5,
                envSource: 1,
                envMapData: null,
                envMapColorSpace: 0,
                useEnvMap: false,
                envRotation: 0,
                envGradientStops: { stops: [
                    { id: "0", position: 0, color: "#0D0221", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.3, color: "#2A0845", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.6, color: "#6B1D6B", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 1, color: "#D4418E", bias: 0.5, interpolation: "linear" },
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
                shadowSoftness: 300,
                shadowSteps: 128,
                shadowBias: 0,
                lights: [
                    { type: "Point", position: { x: 3.3724, y: -0.0794, z: 0.9973 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#FFE6D1", intensity: 14.8996, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 5500, id: "l7", range: 8.7754 },
                    { type: "Point", position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false, id: "l8" },
                    { type: "Point", position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false, id: "l9" },
                ],
            },
            quality: {
                engineQuality: true,
                compilerHardCap: 2000,
                precisionMode: 0,
                bufferPrecision: 0,
                maxSteps: 500,
                distanceMetric: 2,
                estimator: 0,
                fudgeFactor: 1,
                stepRelaxation: 0,
                stepJitter: 0.15,
                refinementSteps: 0,
                detail: 2.5,
                pixelThreshold: 0.2,
                overstepTolerance: 0,
                dynamicScaling: false,
                interactionDownsample: 2,
                physicsProbeMode: 0,
                manualDistance: 10,
            },
            colorGrading: { active: false, toneMapping: 0, saturation: 1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            optics: { camType: 0, camFov: 40, orthoScale: 2, dofStrength: 0, dofFocus: 5 },
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.41, y: 0.2424, z: 0.8532, w: 0.2125 },
        cameraFov: 40,
        sceneOffset: { x: 4, y: 1.5, z: 1.8, xL: 0.2077, yL: -0.4379, zL: 0.2855 },
        targetDistance: 2.4689,
        cameraMode: "Orbit",
        lights: [
            { type: "Directional", position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#FFE6D1", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 5500 },
            { type: "Point", position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: "Point", position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
        ]
    }
};
