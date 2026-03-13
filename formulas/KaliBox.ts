
import { FractalDefinition } from '../types';

export const KaliBox: FractalDefinition = {
    id: 'KaliBox',
    name: 'Kali Box',
    shortDescription: 'Kali\'s abs-fold fractal with sphere inversion. Organic caves and alien landscapes.',
    description: 'A Mandelbox variant by Kali (fractalforums.com), optimized by Rrrola. Uses rotation, abs-fold + translation, clamped sphere inversion, and scale/minRad rescaling. Produces organic, cave-like structures.',

    shader: {
        preamble: `
    // KaliBox: Pre-calculated rotation (computed once per frame)
    // Axis-angle rotation around (1,1,0) normalized
    mat3 uKB_rot = mat3(1.0);
    bool uKB_doRot = false;

    void KaliBox_precalcRotation() {
        float rotAngle = uParamF;
        if (abs(rotAngle) > 0.001) {
            uKB_doRot = true;
            vec3 axis = normalize(vec3(1.0, 1.0, 0.0));
            float s = sin(rotAngle);
            float c_rot = cos(rotAngle);
            float oc = 1.0 - c_rot;
            uKB_rot = mat3(
                oc * axis.x * axis.x + c_rot,      oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c_rot,      oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c_rot
            );
        } else {
            uKB_doRot = false;
        }
    }`,
        function: `
    void formula_KaliBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        float scale = uParamA;
        float minRad2 = uParamB;

        // 1. Rotation (axis-angle around (1,1,0))
        if (uKB_doRot) {
            p *= uKB_rot;
        }

        // 2. Abs fold + translation
        p = abs(p) + uVec3A;

        // 3. Sphere inversion (Rrrola's clamp)
        float r2 = dot(p, p);
        float k = clamp(max(minRad2 / r2, minRad2), 0.0, 1.0);
        p *= k;

        // 4. Scale and add constant
        p = p * (scale / minRad2) + c.xyz;

        // 5. Update derivative
        dr = dr * k * (abs(scale) / minRad2) + 1.0;

        z.xyz = p;
        trap = min(trap, length(p));
    }`,
        loopBody: `formula_KaliBox(z, dr, trap, c);`,
        loopInit: `KaliBox_precalcRotation();`,
        getDist: `
            float absScalem1 = abs(uParamA - 1.0);
            return vec2((r - absScalem1) / dr, iter);
        `
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: -3.0, max: 3.0, step: 0.001, default: 2.043 },
        { label: 'MinRad2', id: 'paramB', min: 0.001, max: 2.0, step: 0.001, default: 0.349 },
        { label: 'Translation', id: 'vec3A', type: 'vec3', min: -5.0, max: 5.0, step: 0.001, default: { x: 0.036, y: -1.861, z: 0.036 } },
        { label: 'Rotation', id: 'paramF', min: -3.14, max: 3.14, step: 0.01, default: 0.0, scale: 'pi' },
    ],

    defaultPreset: {
        formula: "KaliBox",
        features: {
            coreMath: { iterations: 15, paramA: 2.04348, paramB: 0.3492, paramF: 0, vec3A: { x: 0.0365, y: -1.9183, z: 0.0365 } },
            coloring: {
                mode: 1, // Iteration count
                repeats: 1, phase: -0.44, scale: 1.9664327756755327, offset: -1.4432563267287075, bias: 1, twist: 0, escape: 1.2,
                mode2: 4, // Angle
                repeats2: 7, phase2: 0, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 20, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true,
                gradient: [
                    { id: "1773423501447_0", position: 0,     color: "#FD6029", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_1", position: 0.111, color: "#698403", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_2", position: 0.222, color: "#FFF59B", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_3", position: 0.333, color: "#F5BD22", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_4", position: 0.444, color: "#0B5E87", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_5", position: 0.556, color: "#C68876", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_6", position: 0.667, color: "#A51C64", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_7", position: 0.778, color: "#3B9FEE", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_8", position: 0.889, color: "#D4FFD4", bias: 0.5, interpolation: "step" },
                    { id: "1773423501447_9", position: 1,     color: "#ABA53C", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "kb2_0", position: 0,   color: "#FFFFFF", bias: 0.5, interpolation: "linear" },
                    { id: "kb2_1", position: 0.5, color: "#000000", bias: 0.5, interpolation: "linear" },
                    { id: "kb2_2", position: 1,   color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ]
            },
            ao: { aoIntensity: 0.198, aoSpread: 0.3610966624411007, aoSamples: 8, aoEnabled: true, aoMode: false },
            atmosphere: {
                fogNear: 0, fogFar: 5, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.0010213564266668151, glowSharpness: 3, glowColor: "#ffffff", glowMode: false
            },
            materials: {
                diffuse: 1, reflection: 0, specular: 1, roughness: 0.3,
                rim: 0, rimExponent: 3, envStrength: 0.35, envBackgroundStrength: 0.15,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: [
                    { id: "1773423550251_0", position: 0,     color: "#3B4CC0", bias: 0.5, interpolation: "linear" },
                    { id: "1773423550251_1", position: 0.143, color: "#6889EE", bias: 0.5, interpolation: "linear" },
                    { id: "1773423550251_2", position: 0.286, color: "#9ABAFF", bias: 0.5, interpolation: "linear" },
                    { id: "1773423550251_3", position: 0.429, color: "#C9D8F0", bias: 0.5, interpolation: "linear" },
                    { id: "1773423550251_4", position: 0.571, color: "#EDD1C2", bias: 0.5, interpolation: "linear" },
                    { id: "1773423550251_5", position: 0.714, color: "#F7A889", bias: 0.5, interpolation: "linear" },
                    { id: "1773423550251_6", position: 0.857, color: "#E26A53", bias: 0.5, interpolation: "linear" },
                    { id: "1773423550251_7", position: 1,     color: "#B40426", bias: 0.5, interpolation: "linear" }
                ]
            },
            geometry: { juliaMode: true, juliaX: -0.6691, juliaY: -1.3028, juliaZ: -0.45775 },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.001 },
            quality: { detail: 3, fudgeFactor: 0.7, pixelThreshold: 0.2, maxSteps: 522, distanceMetric: 1, estimator: 0 },
            optics: { camFov: 90, dofStrength: 0, dofFocus: 0.9911481142044067 }
        },
        cameraPos: { x: -0.5108672817633045, y: -0.49092728212507375, z: 0.06312098713692904 },
        cameraRot: { x: -0.21217453440255712, y: 0.9007285600831599, z: -0.2000534384923281, w: -0.3219451036263353 },
        cameraFov: 90,
        sceneOffset: { x: -0.47271010279655457, y: 0.5621813535690308, z: -0.6614219546318054, xL: 0.4219589741076178, yL: 0.40918048066299684, zL: -0.16639292373950365 },
        targetDistance: 0.7113221737919322,
        cameraMode: "Orbit",
        lights: [
            { type: 'Directional', position: { x: 0.62, y: -0.07, z: 1.4 }, rotation: { x: -0.025067221468304684, y: -3.071530976748474, z: 0.6869655122565176 }, color: "#ffffff", intensity: 1, falloff: 0.22, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 2, y: -1, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff8800", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0, y: 0, z: -3 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0044ff", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
