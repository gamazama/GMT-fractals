
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
            coreMath: { iterations: 15, paramA: 2.04348, paramB: 0.3492, paramF: 0, vec3A: { x: 0.0365, y: -1.8613, z: 0.0365 } },
            coloring: {
                mode: 0, // Trap
                repeats: 2, phase: 0, scale: 1, offset: 0, bias: 1, twist: 0, escape: 1.2,
                mode2: 4, // Angle
                repeats2: 7, phase2: 0, blendMode: 0, blendOpacity: 0, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 20, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "kb_0", position: 1, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "kb2_0", position: 0, color: "#FFFFFF", bias: 0.5, interpolation: "linear" },
                    { id: "kb2_1", position: 0.5, color: "#000000", bias: 0.5, interpolation: "linear" },
                    { id: "kb2_2", position: 1, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ]
            },
            atmosphere: {
                fogNear: 0, fogFar: 5, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0, glowSharpness: 50, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0.315, aoSpread: 0.112
            },
            materials: {
                reflection: 0.2, specular: 1, roughness: 0.75, diffuse: 1, envStrength: 1.43,
                rim: 0, rimExponent: 3, emission: 0, emissionColor: "#ffffff", emissionMode: 0,
                envSource: 1, useEnvMap: true, envRotation: 0,
                envGradientStops: [
                    { id: "hor", position: 0, color: "#3d3d3d", bias: 0.5, interpolation: "smooth" },
                    { id: "zen", position: 1, color: "#3d3d3d", bias: 0.5, interpolation: "smooth" }
                ]
            },
            geometry: { juliaMode: true, juliaX: -0.6691, juliaY: -1.3028, juliaZ: -0.45775 },
            lighting: { shadows: true, shadowSoftness: 16, shadowIntensity: 1, shadowBias: 0.001 },
            quality: { detail: 1, fudgeFactor: 0.68, pixelThreshold: 0.2, maxSteps: 522 },
            optics: { dofStrength: 0, dofFocus: 2 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0, y: 0, z: 0, w: 1 },
        cameraFov: 60,
        sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: -2.0 },
        targetDistance: 5.0,
        cameraMode: "Orbit",
        lights: [
            { type: 'Directional', position: { x: 0.62, y: -0.07, z: 1.4 }, rotation: { x: -0.4, y: -1.51, z: 0.378 }, color: "#ffffff", intensity: 4.54, falloff: 0.22, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 2, y: -1, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff8800", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0, y: 0, z: -3 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0044ff", intensity: 0.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
