
import { FractalDefinition } from '../types';

export const PseudoKleinian: FractalDefinition = {
    id: 'PseudoKleinian',
    name: 'Pseudo Kleinian',
    shortDescription: 'Kleinian variation with a "Magic Factor" that warps the inversion logic.',
    description: 'A modification of the Kleinian group formula. Now supports linear shifting and twisting.',
    
    shader: {
        function: `
    void formula_PseudoKleinian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 q = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = q.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            q.xy = mat2(co, -s, s, co) * q.xy;
        }

        float boxLimitVal = uParamA;
        vec3 boxMin = vec3(-boxLimitVal);
        vec3 boxMax = vec3(boxLimitVal);
        q = 2.0 * clamp(q, boxMin, boxMax) - q;
        float lensq = max(dot(q, q), 1e-10);
        float magic = uParamD;
        float factor = uParamC - magic;
        float rp2 = lensq * factor;
        float k1 = max(uParamB / max(rp2, 1.0e-10), 1.0);
        q *= k1;
        dr *= k1;

        // Vec3A: 3-axis shift (z-shift was original paramE, x/y are new)
        q += uVec3A;

        z.xyz = q;
        trap = min(trap, lensq);
    }`,
        loopBody: `formula_PseudoKleinian(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Box Limit', id: 'paramA', min: 0.1, max: 2.0, step: 0.01, default: 1.93 },
        { label: 'Size (C)', id: 'paramB', min: 0.5, max: 2.5, step: 0.001, default: 1.76 },
        { label: 'Power', id: 'paramC', min: 1.0, max: 2.5, step: 0.001, default: 1.278 },
        { label: 'Magic Factor', id: 'paramD', min: 0.0, max: 1.5, step: 0.001, default: 0.801 },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.001, default: { x: 0, y: 0, z: 0.119 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "PseudoKleinian",
        features: {
            coreMath: {
                iterations: 7,
                paramA: 1.93, paramB: 1.76, paramC: 1.278, paramD: 0.801, paramF: 0,
                vec3A: { x: 0, y: 0, z: 0.119 }
            },
            coloring: {
                gradient: [
                    { id: "1771521894392", position: 0, color: "#949494", bias: 0.5, interpolation: "linear" },
                    { id: "1771519043183", position: 0.33, color: "#87827D", bias: 0.5, interpolation: "step" },
                    { id: "1771519043723", position: 0.448, color: "#007A71", bias: 0.5, interpolation: "step" },
                    { id: "1771518360330_2", position: 0.461, color: "#929292", bias: 0.5, interpolation: "linear" },
                    { id: "1771518360330_3", position: 1, color: "#949494", bias: 0.5, interpolation: "linear" }
                ],
                mode: 9, scale: 27.305, offset: -24.938, repeats: 3, phase: -0.5, bias: 1, twist: 0, escape: 127399.5,
                gradient2: [
                    { id: "1", position: 0.318, color: "#FFFFFF", bias: 0.5, interpolation: "step" },
                    { id: "1771521834787", position: 0.386, color: "#26A5B4", bias: 0.5, interpolation: "step" },
                    { id: "1771521804163", position: 0.397, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ],
                mode2: 0, scale2: 45.964, offset2: 2.748, repeats2: 50.5, phase2: 0.45, bias2: 1, twist2: 0,
                blendMode: 2, blendOpacity: 1,
                layer3Color: "#ffffff", layer3Scale: 466.422, layer3Strength: 0, layer3Bump: 0.05, layer3Turbulence: 0
            },
            ao: { aoIntensity: 0.317, aoSpread: 0.027, aoEnabled: true, aoMode: false },
            atmosphere: {
                fogIntensity: 0, fogNear: 1.069, fogFar: 1.764, fogColor: "#000000", fogDensity: 0.36,
                glowIntensity: 0.062, glowSharpness: 8.511, glowMode: false, glowColor: "#9be0ff"
            },
            materials: {
                diffuse: 1.1, reflection: 0.52, specular: 2, roughness: 0.269,
                rim: 0.586, rimExponent: 5.9, envStrength: 2.36, envBackgroundStrength: 0.97,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: [
                    { id: "1771523832902_0", position: 0, color: "#001133" },
                    { id: "1771523832902_1", position: 0.5, color: "#8A9DAA" },
                    { id: "1771523832902_2", position: 1, color: "#A5FFFF" }
                ]
            },
            colorGrading: { active: true, saturation: 1.11, levelsMin: 0.01, levelsMax: 1.004, levelsGamma: 0.496 },
            geometry: { juliaMode: false, juliaX: -0.28, juliaY: 2, juliaZ: -2, hybridMode: false },
            lighting: { shadows: true, shadowSoftness: 178.25, shadowIntensity: 1, shadowBias: 0.000016 },
            quality: { fudgeFactor: 0.48, detail: 7.7, pixelThreshold: 0.3, maxSteps: 384, estimator: 4.0, distanceMetric: 2 },
            optics: { camFov: 37, dofStrength: 0.00147, dofFocus: 1.235 },
            reflections: { enabled: true, reflectionMode: 1, bounces: 3, steps: 128, mixStrength: 1, roughnessThreshold: 0.5 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.23563338320385452, y: 0.05927570030462831, z: -0.43792255558493787, w: 0.8655559689490069 },
        sceneOffset: { x: 4.677079677581787, y: 0.8489137291908264, z: 1.2545667886734009, xL: -0.03396485030158674, yL: 0.03325700201092376, zL: -0.015573679616097938 },
        targetDistance: 1.0379663705825806,
        cameraMode: "Fly",
        lights: [
            { type: 'Point', position: { x: 4.677060177682062, y: 0.8489393025420574, z: 1.254369368841062 }, rotation: { x: 1.092, y: 0.667, z: 0.415 }, color: "#FFA757", intensity: 12.96, falloff: 109.253, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 4.557440677764606, y: 1.1, z: -0.16 }, rotation: { x: 0, y: 0, z: 0 }, color: "#A9A9A9", intensity: 27.1441, falloff: 3.528, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 4.677024051602566, y: 0.8488697555642045, z: 1.2543798336180192 }, rotation: { x: 0, y: 0, z: 0 }, color: "#4E83FF", intensity: 28.4, falloff: 261.407, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true }
        ],
    }
};
