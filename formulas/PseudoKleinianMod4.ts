
import { FractalDefinition } from '../types';

export const PseudoKleinianMod4: FractalDefinition = {
    id: 'PseudoKleinianMod4',
    name: 'Pseudo Kleinian Mod4',
    shortDescription: 'Extended PK with per-iteration sphere inversion and box offset (darkbeam).',
    description: 'Extended Pseudo Kleinian based on Mandelbulber\'s Mod4 variant by darkbeam. Adds per-iteration sphere inversion and sign-based box offset to the core Knighty/Theli-at box fold + sphere fold. The sphere inversion maps each iteration through an inversion sphere, creating intricate nested structures. Box offset subtracts a constant times sign(z) per axis, breaking symmetry in controllable ways. Three DE shapes: Plane (Fragmentarium), Cylindrical (Mandelbulber), Thingy (Fragmentarium).',
    juliaType: 'none',
    tags: ['kleinian', 'box-fold', 'inversion'],

    shader: {
        preamble: `
    // PseudoKleinianMod4: alternating offset state
    float pk4_posNeg = 1.0;`,
        function: `
    void formula_PseudoKleinianMod4(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 q = z.xyz;

        // Twist (paramF)
        if (abs(uParamF) > 0.001) {
            float ang = q.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            q.xy = mat2(co, -s, s, co) * q.xy;
        }

        // Per-iteration sphere inversion (Mandelbulber Mod4 reference)
        // z *= invScale / r²  — disabled when paramE = 0
        float invScale = uParamE;
        if (invScale > 0.001) {
            float rr = max(dot(q, q), 1e-10);
            float invK = invScale / rr;
            q *= invK;
            dr *= invK;
        }

        // Box offset: z -= multiplier * sign(z) (Mandelbulber Mod4 / darkbeam)
        vec3 boxOff = uVec3C;
        if (abs(boxOff.x) + abs(boxOff.y) + abs(boxOff.z) > 0.001) {
            q -= boxOff * sign(q);
        }

        // Core PK box fold (reference: 2*clamp(p,-CSize,CSize)-p)
        vec3 cSize = uVec3B;
        q = 2.0 * clamp(q, -cSize, cSize) - q;

        // Sphere fold: k = max(Size / dot(q,q), 1)
        // Mandelbulber reference: aux.DE *= k + tweak005 (tweak ~0.005)
        float lensq = max(dot(q, q), 1e-10);
        float k1 = max(uParamB / lensq, 1.0);
        q *= k1;
        dr *= k1 + 0.005;

        // Orbit trap
        trap = min(trap, lensq);

        // C shift (reference: p += C)
        q += uVec3A;

        // Alternating offset (Mandelbulber Mod4: pos_neg * constant, flips each iter)
        if (abs(uParamD) > 0.001) {
            q.z += pk4_posNeg * uParamD;
            pk4_posNeg *= -1.0;
        }

        trap = min(trap, dot(q, q));
        z.xyz = q;
    }`,
        loopBody: `formula_PseudoKleinianMod4(z, dr, trap, c);`,
        loopInit: `pk4_posNeg = 1.0;`,

        getDist: `
    float d;
    if (uParamA > 1.5) {
        // Thingy DE shape (Knighty/Theli-at Fragmentarium reference)
        float lxy = length(z.xy);
        float thingy = (abs(lxy * z.z) - uParamC) / sqrt(dot(z.xyz, z.xyz) + abs(uParamC));
        d = abs(0.5 * thingy / max(dr, 1e-10));
    } else if (uParamA > 0.5) {
        // Cylindrical DE shape (Mandelbulber reference: sqrt(x²+y²) / DE - offset)
        d = abs(0.5 * length(z.xy) / max(dr, 1e-10) - uParamC);
    } else {
        // Plane DE shape (Knighty/Fragmentarium reference)
        d = abs(0.5 * abs(z.z) / max(dr, 1e-10) - uParamC);
    }
    return vec2(d, iter);
`,
        preambleVars: ['pk4_posNeg'],
    },

    parameters: [
        { label: 'DE Shape', id: 'paramA', min: 0.0, max: 2.0, step: 1.0, default: 0.0, options: [
            { label: 'Plane', value: 0.0 },
            { label: 'Cylindrical', value: 1.0 },
            { label: 'Thingy', value: 2.0 }
        ] },
        { label: 'Size', id: 'paramB', min: 0.1, max: 5.0, step: 0.001, default: 0.5 },
        { label: 'Thickness', id: 'paramC', min: 0.0, max: 2.0, step: 0.001, default: 0.01 },
        { label: 'Alt Offset', id: 'paramD', min: -2.0, max: 2.0, step: 0.001, default: 0.0 },
        { label: 'Inv Scale', id: 'paramE', min: 0.0, max: 5.0, step: 0.001, default: 0.0 },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'C Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.001, default: { x: 0, y: 0, z: 0 } },
        { label: 'Box Size', id: 'vec3B', type: 'vec3', min: 0.1, max: 3.0, step: 0.001, default: { x: 0.7, y: 0.7, z: 0.7 }, linkable: true },
        { label: 'Box Offset', id: 'vec3C', type: 'vec3', min: -2.0, max: 2.0, step: 0.001, default: { x: 0, y: 0, z: 0 } },
    ],

    defaultPreset: {
        formula: "PseudoKleinianMod4",
        features: {
            coreMath: {
                iterations: 24,
                paramA: 1, paramB: 0.543, paramC: 0.0045, paramD: 0, paramE: 0.654, paramF: 0,
                vec3A: { x: 0, y: 0, z: 0 },
                vec3B: { x: 0.583, y: 0.5315, z: 0.6565 },
                vec3C: { x: 0, y: 0, z: 0 }
            },
            coloring: {
                gradient: [
                    { id: "pk4_0", position: 0, color: "#0A0A1A", bias: 0.5, interpolation: "linear" },
                    { id: "pk4_1", position: 0.25, color: "#2B1B4E", bias: 0.5, interpolation: "linear" },
                    { id: "pk4_2", position: 0.45, color: "#4A6FA5", bias: 0.5, interpolation: "linear" },
                    { id: "pk4_3", position: 0.65, color: "#8ECAE6", bias: 0.5, interpolation: "linear" },
                    { id: "pk4_4", position: 0.85, color: "#E0E0E0", bias: 0.5, interpolation: "linear" },
                    { id: "pk4_5", position: 1, color: "#0A0A1A", bias: 0.5, interpolation: "linear" }
                ],
                mode: 0, scale: 2.72, offset: -0.203, repeats: 3, phase: 0, bias: 1, twist: 0, escape: 2,
                gradient2: [
                    { id: "1", position: 0.4, color: "#FFFFFF" },
                    { id: "2", position: 0.85, color: "#4A6FA5" }
                ],
                mode2: 5, scale2: 1, offset2: 0, repeats2: 1, phase2: 0, bias2: 1, twist2: 0,
                blendMode: 2, blendOpacity: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true
            },
            ao: { aoIntensity: 0, aoSpread: 0.229, aoSamples: 5, aoEnabled: true, aoMode: false },
            reflections: { enabled: true, reflectionMode: 1, bounces: 3, steps: 64, mixStrength: 1, roughnessThreshold: 0.62 },
            materials: {
                diffuse: 1.5, reflection: 0.04, specular: 1.07, roughness: 0.19,
                rim: 0.256, rimExponent: 10, envStrength: 0, envBackgroundStrength: 0.2,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: [
                    { id: "0", position: 0, color: "#001133" },
                    { id: "1", position: 0.4, color: "#2B1B4E" },
                    { id: "2", position: 0.7, color: "#4A6FA5" },
                    { id: "3", position: 1, color: "#E0E0E0" }
                ]
            },
            atmosphere: {
                fogIntensity: 0, fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 1, glowMode: false, glowColor: "#ffffff"
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 200, shadowIntensity: 1, shadowBias: 0 },
            quality: { detail: 2, fudgeFactor: 0.7, pixelThreshold: 1, maxSteps: 300, distanceMetric: 0, stepJitter: 0.15, estimator: 4 },
            colorGrading: { saturation: 1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            optics: { camFov: 71, dofStrength: 0, dofFocus: 1.916 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.3652, y: 0.2028, z: 0.2407, w: 0.8761 },
        sceneOffset: { x: 1, y: -1.45, z: 1.2142, xL: -0.0277, yL: 0.4093, zL: -0.3094 },
        targetDistance: 1.383,
        cameraMode: "Orbit",
        lights: [
            { type: 'Directional', position: { x: 0.4, y: 1.1, z: 2.5 }, rotation: { x: -0.18, y: -0.04, z: 0 }, color: "#E8F0FF", intensity: 0.5, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true, useTemperature: true, temperature: 6500 },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFD6AA", useTemperature: true, temperature: 3500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#E0EEFF", useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
