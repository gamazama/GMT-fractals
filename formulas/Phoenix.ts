
import { FractalDefinition } from '../types';

export const Phoenix: FractalDefinition = {
    id: 'Phoenix',
    name: 'Phoenix',
    shortDescription: 'Iterates based on previous value (z_n-1). Creates flowing, taffy-like distortions.',
    description: 'A 3D generalization of the Phoenix Julia set. Now with Z-stretching and spatial twisting.',
    
    shader: {
        function: `
    vec3 phoenixBulbPow(vec3 z, float power, vec2 phase) {
        float r = length(z);
        float r_safe = max(r, 1.0e-9);
        float theta = acos(clamp(z.z / r_safe, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        float zr = pow(r_safe, power);
        theta = theta * power + phase.x;
        phi = phi * power + phase.y;
        return zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
    }

        void formula_Phoenix(inout vec4 z, inout float dr, inout float trap, vec4 c, inout vec4 z_prev, inout float dr_prev, inout vec4 z_prev2, inout float dr_prev2) {
            vec3 z3 = z.xyz;
            vec3 zp3 = z_prev.xyz;

            // Vec3A: Anisotropic Stretch (mix to 1.0 when near zero so DDFS default reset is safe)
            vec3 stretch = mix(vec3(1.0), uVec3A, step(vec3(0.01), uVec3A));
            z3 *= stretch;
            dr *= max(max(stretch.x, stretch.y), stretch.z);

            // Vec3C: Pre-rotation (applied before triplex power)
            if (abs(uVec3C.x) > 0.001 || abs(uVec3C.y) > 0.001 || abs(uVec3C.z) > 0.001) {
                float cx = cos(uVec3C.x); float sx = sin(uVec3C.x);
                float cy = cos(uVec3C.y); float sy = sin(uVec3C.y);
                float cz = cos(uVec3C.z); float sz = sin(uVec3C.z);
                // YZ rotation
                z3.yz = mat2(cx, -sx, sx, cx) * z3.yz;
                // XZ rotation
                z3.xz = mat2(cy, -sy, sy, cy) * z3.xz;
                // XY rotation
                z3.xy = mat2(cz, -sz, sz, cz) * z3.xy;
            }

            // Param C: Twist
            if (abs(uParamC) > 0.001) {
                float ang = z3.z * uParamC;
                float s = sin(ang); float co = cos(ang);
                z3.xy = mat2(co, -s, s, co) * z3.xy;
            }

            float power = uParamA;
            float kReal = uVec2A.x;
            float kImag = uVec2A.y;
            float hPower = uParamB;
            float hBlend = uParamD;
            vec2 phase = uVec2B;

            vec3 z_new_part = phoenixBulbPow(z3, power, phase);

            // Vec3B: Abs/fold after power (Burning Phoenix)
            z_new_part = mix(z_new_part, abs(z_new_part), step(vec3(0.5), uVec3B));

            // History: blend z_{n-1} with z_{n-2} for deeper memory
            vec3 historySource = mix(zp3, z_prev2.xyz, hBlend);
            float drHistorySource = mix(dr_prev, dr_prev2, hBlend);

            vec3 z_prev_part;
            bool isLinearHistory = abs(hPower - 1.0) < 0.001;

            if (isLinearHistory) {
                z_prev_part = historySource;
            } else {
                z_prev_part = phoenixBulbPow(historySource, hPower, vec2(0.0));
            }

            vec3 historyTerm;
            historyTerm.x = z_prev_part.x * kReal - z_prev_part.y * kImag;
            historyTerm.y = z_prev_part.x * kImag + z_prev_part.y * kReal;
            historyTerm.z = z_prev_part.z * kReal;

            vec3 z_next = z_new_part + c.xyz + historyTerm;

            float r = length(z3);
            float rh = length(historySource);
            float safeR = max(r, 1.0e-5);
            float safeRh = max(rh, 1.0e-5);

            float dr_pow = power * pow(safeR, power - 1.0);

            float kMag = length(vec2(kReal, kImag));
            float dr_hist = kMag;

            if (!isLinearHistory) {
                 dr_hist *= hPower * pow(safeRh, hPower - 1.0);
            }

            float dc = (uJuliaMode > 0.5) ? 0.0 : 1.0;
            float dr_next = dr_pow * dr + dr_hist * drHistorySource + dc;

            // Shift history: z_{n-2} = z_{n-1}, z_{n-1} = z_n
            z_prev2 = z_prev;
            dr_prev2 = dr_prev;
            z_prev = vec4(z3, 0.0);
            dr_prev = dr;

            z.xyz = z_next;
            dr = dr_next;

            trap = min(trap, dot(z, z));
        }`,
        loopBody: `formula_Phoenix(z, dr, trap, c, z_prev, dr_prev, z_prev2, dr_prev2);`,
        loopInit: `
        vec4 z_prev = vec4(0.0);
        float dr_prev = 0.0;
        vec4 z_prev2 = vec4(0.0);
        float dr_prev2 = 0.0;
        `
    },

    parameters: [
        { label: 'Power (p)', id: 'paramA', min: 1.5, max: 12.0, step: 0.01, default: 10.777 },
        { label: 'History Exp', id: 'paramB', min: 0.0, max: 3.0, step: 0.01, default: 0.87 },
        { label: 'Twist', id: 'paramC', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'History Depth', id: 'paramD', min: 0.0, max: 1.0, step: 0.01, default: 0.0 },
        { label: 'Distortion (Re, Im)', id: 'vec2A', type: 'vec2', min: -1.5, max: 1.5, step: 0.001, default: { x: 0.503, y: 0.961 } },
        { label: 'Phase (θ, φ)', id: 'vec2B', type: 'vec2', min: -6.28, max: 6.28, step: 0.01, default: { x: 0.0, y: 0.0 }, scale: 'pi' },
        { label: 'Stretch', id: 'vec3A', type: 'vec3', min: 0.1, max: 3.0, step: 0.01, default: { x: 1.0, y: 1.0, z: 1.0 }, linkable: true },
        { label: 'Abs Fold', id: 'vec3B', type: 'vec3', min: 0.0, max: 1.0, step: 1.0, default: { x: 0.0, y: 0.0, z: 0.0 }, mode: 'toggle' },
        { label: 'Pre-Rotation', id: 'vec3C', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0.0, y: 0.0, z: 0.0 }, mode: 'rotation' },
    ],

    defaultPreset: {
        formula: "Phoenix",
        features: {
            coreMath: {
                iterations: 31,
                paramA: 10.777, paramB: 0.87, paramC: 0, paramD: 0,
                vec2A: { x: 0.503, y: 0.961 }, vec2B: { x: 0, y: 0 },
                vec3A: { x: 1, y: 1, z: 1 }, vec3B: { x: 0, y: 0, z: 0 }, vec3C: { x: 0, y: 0, z: 0 }
            },
            coloring: {
                gradient: [
                    { id: "1766223988966_0", position: 0, color: "#5F4690", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_1", position: 0.091, color: "#1D6996", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_2", position: 0.182, color: "#38A6A5", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_3", position: 0.273, color: "#0F8554", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_4", position: 0.364, color: "#73AF48", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_5", position: 0.455, color: "#EDAD08", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_6", position: 0.545, color: "#E17C05", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_7", position: 0.636, color: "#CC503E", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_8", position: 0.727, color: "#94346E", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_9", position: 0.818, color: "#6F4070", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_10", position: 0.909, color: "#994E95", bias: 0.5, interpolation: "linear" },
                    { id: "1766223988966_11", position: 1, color: "#666666", bias: 0.5, interpolation: "linear" }
                ],
                mode: 0, scale: 2.31, offset: 0.272, repeats: 1, phase: 0, bias: 0.9, twist: 0, escape: 4,
                gradient2: [
                    { id: "1766224725875_0", position: 0, color: "#5F4690", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_1", position: 0.091, color: "#1D6996", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_2", position: 0.182, color: "#38A6A5", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_3", position: 0.273, color: "#0F8554", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_4", position: 0.364, color: "#73AF48", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_5", position: 0.455, color: "#EDAD08", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_6", position: 0.545, color: "#E17C05", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_7", position: 0.636, color: "#CC503E", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_8", position: 0.727, color: "#94346E", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_9", position: 0.818, color: "#6F4070", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_10", position: 0.909, color: "#994E95", bias: 0.5, interpolation: "linear" },
                    { id: "1766224725875_11", position: 1, color: "#666666", bias: 0.5, interpolation: "linear" }
                ],
                mode2: 6, scale2: 1, offset2: 0, repeats2: 1, phase2: 0, bias2: 1, twist2: 0,
                blendMode: 3, blendOpacity: 1,
                layer3Color: "#ffffff", layer3Scale: 245.44, layer3Strength: 0, layer3Bump: 0.3, layer3Turbulence: 0.65
            },
            ao: { aoIntensity: 0.37, aoSpread: 0.164, aoEnabled: true, aoMode: false },
            atmosphere: {
                fogColor: "#1b1e24", fogNear: 0.0001, fogFar: 501.187, fogDensity: 0,
                glowIntensity: 0.0001, glowSharpness: 825, glowMode: false, glowColor: "#ffffff"
            },
            materials: {
                diffuse: 0.94, reflection: 0, specular: 0.3, roughness: 0.4,
                rim: 0, rimExponent: 4, envStrength: 0, envBackgroundStrength: 1,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0.581, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: []
            },
            geometry: { juliaMode: true, juliaX: 0.17, juliaY: 0.36, juliaZ: 0.06, hybridMode: false },
            lighting: { shadows: true, shadowSoftness: 102.8, shadowIntensity: 1, shadowBias: 0.002 },
            quality: { fudgeFactor: 0.4, detail: 1, pixelThreshold: 0.5, maxSteps: 300 },
            optics: { camFov: 58, dofStrength: 0.00035, dofFocus: 0.38 }
        },
        cameraPos: { x: 0.876, y: -1.881, z: 2.819 },
        cameraRot: { x: 0.087, y: 0.3, z: -0.715, w: 0.626 },
        sceneOffset: { x: 0.246, y: 1.112, z: -2.614, xL: -0.876, yL: 0.881, zL: -0.819 },
        targetDistance: 0.287,
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: 0.755, y: 0.531, z: -0.026 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ffffff", intensity: 1.4, falloff: 0, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ],
        animations: []
    }
};
