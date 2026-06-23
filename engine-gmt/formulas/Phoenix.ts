
import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

export const Phoenix: FractalDefinition = {
    id: 'Phoenix',
    name: 'Phoenix',
    shortDescription: 'Iterates based on previous value (z_n-1). Creates flowing, taffy-like distortions.',
    description: 'A 3D generalization of the Phoenix Julia set. Now with Z-stretching and spatial twisting.',
    juliaType: 'julia',
    
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
        `,
        preambleVars: ['z_prev', 'dr_prev', 'z_prev2', 'dr_prev2'],
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },

    parameters: [
        { label: 'Power (p)', id: 'paramA', min: 1.5, max: 12.0, step: 0.01, default: 2.0 },
        { label: 'History Exp', id: 'paramB', min: 0.0, max: 3.0, step: 0.01, default: 1.0 },
        { label: 'Twist', id: 'paramC', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'History Depth', id: 'paramD', min: 0.0, max: 1.0, step: 0.01, default: 1.0 },
        { label: 'Distortion (Re, Im)', id: 'vec2A', type: 'vec2', min: -1.5, max: 1.5, step: 0.001, default: { x: -0.5, y: 0.0 } },
        { label: 'Phase (θ, φ)', id: 'vec2B', type: 'vec2', min: -6.28, max: 6.28, step: 0.01, default: { x: -3.211593, y: 0.0 }, scale: 'pi' },
        { label: 'Stretch', id: 'vec3A', type: 'vec3', min: 0.1, max: 3.0, step: 0.01, default: { x: 1.0, y: 1.0, z: 1.0 }, linkable: true },
        { label: 'Abs Fold', id: 'vec3B', type: 'vec3', min: 0.0, max: 1.0, step: 1.0, default: { x: 0.0, y: 0.0, z: 1.0 }, mode: 'toggle' },
        { label: 'Pre-Rotation', id: 'vec3C', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0.0, y: 0.0, z: 0.0 }, mode: 'rotation' },
    ],

    defaultPreset: {
        formula: 'Phoenix',
        features: {
            coreMath: {
                iterations: 12,
                paramA: 2,
                paramB: 1,
                paramC: 0,
                paramD: 1,
                paramE: 0,
                paramF: 0,
                vec2A: { x: -0.5, y: 0 },
                vec2B: { x: -3.211593, y: 0 },
                vec2C: { x: 0, y: 0 },
                vec3A: { x: 1, y: 1, z: 1 },
                vec3B: { x: 0, y: 0, z: 1 },
                vec3C: { x: 0, y: 0, z: 0 },
                vec4A: { x: 0, y: 0, z: 0, w: 0 },
                vec4B: { x: 0, y: 0, z: 0, w: 0 },
                vec4C: { x: 0, y: 0, z: 0, w: 0 }
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
                burningRuntime: false,
                burningMix: 1,
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
                juliaMode: true,
                juliaX: 0.56667,
                juliaY: 0,
                juliaZ: 0,
                preRot: { x: 0, y: 0, z: 0 },
                postRot: { x: 0, y: 0, z: 0 },
                worldRot: { x: 0, y: 0, z: 0 },
                julia: { x: 0, y: 0, z: 0 }
            },
            coloring: {
                gradient: {
                    stops: [
                        { id: '8', position: 0, color: '#EDFFFF', bias: 0.5, interpolation: 'linear' },
                        { id: '7', position: 0.125, color: '#BAFFFD', bias: 0.5, interpolation: 'linear' },
                        { id: '6', position: 0.25, color: '#86B5E5', bias: 0.5, interpolation: 'linear' },
                        { id: '5', position: 0.375, color: '#57A5D9', bias: 0.5, interpolation: 'linear' },
                        { id: '4', position: 0.5, color: '#397DD1', bias: 0.5, interpolation: 'linear' },
                        { id: '3', position: 0.625, color: '#206BCB', bias: 0.5, interpolation: 'linear' },
                        { id: '2', position: 0.75, color: '#1852B1', bias: 0.5, interpolation: 'linear' },
                        { id: '1', position: 0.875, color: '#0C2C8A', bias: 0.5, interpolation: 'linear' },
                        { id: '0', position: 1, color: '#000764', bias: 0.5, interpolation: 'linear' }
                    ],
                    colorSpace: 'linear',
                    blendSpace: 'oklab'
                },
                mode: 0,
                scale: 4.136851,
                offset: 0.987341,
                repeats: 1,
                phase: 0,
                bias: 1.296576,
                colorIter: 0,
                twist: 0,
                twistArms: 0,
                escape: 4,
                gradient2: {
                    stops: [
                        { id: '0', position: 0, color: '#000000' },
                        { id: '1', position: 1, color: '#ffffff' }
                    ],
                    colorSpace: 'linear',
                    blendSpace: 'oklab'
                },
                mode2: 5,
                scale2: 1,
                offset2: 0,
                repeats2: 1,
                phase2: 0,
                bias2: 1,
                twist2: 0,
                twistArms2: 0,
                blendMode: 3,
                blendOpacity: 0,
                layer3Color: '#ffffff',
                layer3Scale: 245.44,
                layer3Strength: 0,
                layer3Bump: 0.3,
                layer3Turbulence: 0.65,
                layer3Enabled: true,
                trapEnabled: false,
                trapShape: 1,
                trapCenter: { x: 0, y: 0, z: 0 },
                trapRadius: 1,
                trapNormal: { x: 0, y: 1, z: 0 },
                trapOffset: 0
            },
            materials: {
                diffuse: 1.01,
                reflection: 0.55,
                specular: 1.15,
                roughness: 0.493,
                rim: 0,
                rimExponent: 4,
                rimColor: '#bcdaff',
                envStrength: 0,
                envBackgroundStrength: 0,
                envSource: 1,
                envMapData: null,
                envMapColorSpace: 0,
                useEnvMap: false,
                envRotation: 0,
                envGradientStops: {
                    stops: [
                        { id: 'hor', position: 0, color: '#223344', bias: 0.5, interpolation: 'smooth' },
                        { id: 'zen', position: 1, color: '#88ccff', bias: 0.5, interpolation: 'smooth' }
                    ],
                    colorSpace: 'linear',
                    blendSpace: 'oklab'
                },
                emission: 0.464637,
                emissionMode: 0,
                emissionColor: '#ffffff',
                ptEmissionMult: 1
            },
            reflections: {
                reflectionMode: 3,
                bounceShadows: true,
                mixStrength: 1,
                roughnessThreshold: 0.62,
                bounces: 2,
                steps: 64,
                enabled: true
            },
            ao: {
                aoIntensity: 0.372,
                aoSpread: 0.138395,
                aoSamples: 10,
                aoMode: false,
                aoColor: '#07005a',
                aoMaxSamples: 32,
                aoStochasticCp: true,
                aoEnabled: true
            },
            atmosphere: {
                glowEnabled: true,
                glowQuality: 0,
                fogIntensity: 0,
                fogNear: 0.0001,
                fogFar: 501.187,
                fogColor: '#15284c',
                fogDensity: 0,
                glowIntensity: 0,
                glowSharpness: 825,
                glowMode: false,
                glowColor: '#ffffff'
            },
            lighting: {
                advancedLighting: true,
                ptEnabled: true,
                renderMode: 0,
                ptBounces: 3,
                ptGIStrength: 1,
                specularModel: 1,
                shadowsCompile: true,
                shadowAlgorithm: 0,
                ptStochasticShadows: true,
                ptAreaLights: false,
                ptNEEAllLights: true,
                ptReflMode: 0,
                ptSobolBounce: true,
                ptEnvNEE: false,
                ptMaxLuminance: 10,
                shadows: true,
                areaLights: false,
                shadowIntensity: 1,
                shadowSoftness: 2000,
                shadowSteps: 128,
                shadowBias: 0.002
            },
            quality: {
                engineQuality: true,
                compilerHardCap: 2000,
                precisionMode: 0,
                bufferPrecision: 0,
                maxSteps: 901,
                distanceMetric: 0,
                estimator: 0,
                deBailout: 100,
                fudgeFactor: 0.25,
                stepJitter: 0.01,
                detail: 1,
                pixelThreshold: 0.5,
                overstepTolerance: 0,
                dynamicScaling: true,
                adaptiveTarget: 30,
                physicsProbeMode: 0,
                manualDistance: 10
            },
            optics: {
                camType: 0,
                camFov: 45,
                orthoScale: 2,
                dofStrength: 0,
                dofFocus: 2.380234
            }
        },
        cameraRot: { x: 0.349883, y: -0.344047, z: -0.61069, w: 0.621508 },
        sceneOffset: { x: -1.071173, y: -0.008802, z: 1.564088, xL: -0.152661, yL: 0.007317, zL: -0.252248 },
        targetDistance: 0.443495,
        cameraMode: 'Orbit',
        lights: [
            { type: 'Point', position: { x: 0.62723, y: 0.240437, z: 2.202913 }, rotation: { x: 0, y: 0, z: 0 }, color: '#ffffff', intensity: 40.5769, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true, id: 'l7', range: 7.015838 },
            { type: 'Point', position: { x: -0.473801, y: -1.102272, z: 0.725389 }, rotation: { x: 0, y: 0, z: 0 }, color: '#FF6C00', useTemperature: true, temperature: 1500, intensity: 22.7529, falloff: 0.5, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true, id: 'l8' },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: '#E0EEFF', useTemperature: true, temperature: 7500, intensity: 0.5, falloff: 0.5, falloffType: 'Quadratic', fixed: false, visible: false, castShadow: false, id: 'l9' }
        ]
    }
};
