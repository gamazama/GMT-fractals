import { FractalDefinition } from '../types';

export const MandelBolic: FractalDefinition = {
    id: 'MandelBolic',
    name: 'MandelBolic',
    shortDescription: 'A true 3D geometric extension of the Mandelbrot set into Hyperbolic 3-Space.',
    description: 'Bypasses the limitations of 3D algebra by using the Poincaré-Ahlfors extension into Hyperbolic 3-Space. This preserves perfect spherical bulbs, exact periodicity, and the true 3D cardioid core without the "smeared" artifacts of standard 3D fractals. Now features generalized Power and Hyperbolic distortion parameters.',
    
    shader: {
        function: `
        void formula_MandelBolic(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float r = length(z3);
            
            float power = uParamA;
            
            // Z is the 2D complex plane (x, y), T is the hyperbolic height (z)
            float rxy2 = z3.x*z3.x + z3.y*z3.y;
            float rxy = sqrt(rxy2);
            
            // Derivative calculation using full 3D magnitude
            dr = power * pow(r, power - 1.0) * dr + 1.0;
            
            // Ahlfors Extension multiplier: M = (|Z|^2 - T^2) / |Z|^2
            // uParamC (Conformal Shift) distorts the hyperbolic mapping
            float m = (rxy2 - uParamC * z3.z*z3.z) / (rxy2 + 1e-20);
            
            // Apply the conformal 3D power with Phase Twist (uParamD)
            float theta = atan(z3.y, z3.x) * power + uParamD;
            float rxy_p = pow(rxy, power);
            
            // Z_{n+1} = Z_n^p * M + C_z
            float nx = rxy_p * cos(theta) * m + c.x;
            float ny = rxy_p * sin(theta) * m + c.y;
            
            // T_{n+1} = p * |Z_n|^(p-1) * T_n + C_t
            // uParamB scales the hyperbolic height growth, uParamE adds a constant Z-offset
            float nz = power * pow(rxy, power - 1.0) * z3.z * uParamB + c.z + uParamE;
            
            z3 = vec3(nx, ny, nz);
            
            z.xyz = z3;
            trap = min(trap, length(z3) * uParamF);
        }`,
        loopBody: `formula_MandelBolic(z, dr, trap, c);`,
        getDist: `
            float m2 = r * r;
            if (m2 < 1.0e-20) return vec2(0.0, iter);
            
            // Log Smoothing Calculation (Shared)
            // Guarded: Only calculate log smoothing if we have actually escaped (> 1.0)
            float smoothIter = iter;
            if (m2 > 1.0) {
                float threshLog = log2(max(uEscapeThresh, 1.1));
                smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
            }
            
            float d = 0.0;
            float dr_safe = max(abs(dr), 1.0e-20);
            
            // Custom distance estimator for MandelBolic
            // Optimized for hyperbolic geometry - use log-based estimator for all regions
            float logR2 = log2(m2);
            d = 0.17328679 * logR2 * r / dr_safe;
            
            return vec2(d, smoothIter);
        `
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 1.0, max: 16.0, step: 0.01, default: 2.0 },
        { label: 'Hyp. Scale', id: 'paramB', min: -2.0, max: 2.0, step: 0.01, default: 1.0 },
        { label: 'Conformal Shift', id: 'paramC', min: -2.0, max: 2.0, step: 0.01, default: 1.0 },
        { label: 'Phase Twist', id: 'paramD', min: -3.14, max: 3.14, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Z-Offset', id: 'paramE', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'Trap Scale', id: 'paramF', min: 0.1, max: 5.0, step: 0.01, default: 1.0 }
    ],

    defaultPreset: {
        formula: "MandelBolic",
        features: {
            coreMath: { iterations: 26, paramA: 2, paramB: 1, paramC: 1, paramD: 0, paramE: 0, paramF: 1 },
            geometry: {
                applyTransformLogic: true,
                preRotMaster: true,
                hybridComplex: false,
                burningEnabled: true,
                hybridMode: false,
                hybridIter: 0,
                hybridScale: 2,
                hybridMinR: 0.5,
                hybridFixedR: 1,
                hybridFoldLimit: 1,
                hybridAddC: false,
                hybridProtect: true,
                hybridSwap: false,
                hybridSkip: 1,
                preRotEnabled: false,
                preRotY: 0,
                preRotX: 0,
                preRotZ: 0,
                juliaMode: false,
                juliaX: -0.277,
                juliaY: -0.05,
                juliaZ: 0.31,
                preRot: { x: 0, y: 0, z: 0 },
                julia: { x: 0, y: 0, z: 0 }
            },
            lighting: {
                advancedLighting: true,
                ptEnabled: true,
                renderMode: 0,
                ptBounces: 3,
                ptGIStrength: 1,
                shadowsCompile: true,
                shadowAlgorithm: 0,
                ptStochasticShadows: false,
                shadows: false,
                shadowIntensity: 1,
                shadowSoftness: 381.09214359264973,
                shadowSteps: 352,
                shadowBias: 0.0010409787880182823,
                lights: [
                    {
                        type: "Directional",
                        position: { x: -0.7, y: 0.37, z: 1.4 },
                        rotation: { x: 0.39966912659916126, y: -2.29961371262364, z: -0.8495893165947439 },
                        color: "#ffffff",
                        intensity: 1.5625,
                        falloff: 0.22000013414400005,
                        falloffType: "Quadratic",
                        fixed: false,
                        visible: true,
                        castShadow: true
                    },
                    {
                        type: "Point",
                        position: { x: 0.6, y: -0.5, z: 1.4 },
                        rotation: { x: 0, y: 0, z: 0 },
                        color: "#ff8800",
                        intensity: 0.5,
                        falloff: 0,
                        falloffType: "Quadratic",
                        fixed: false,
                        visible: true,
                        castShadow: true
                    }
                ]
            },
            ao: {
                aoIntensity: 0.383,
                aoSpread: 0.002,
                aoSamples: 12,
                aoMode: false,
                aoMaxSamples: 32,
                aoStochasticCp: true,
                aoEnabled: true
            },
            reflections: {
                mixStrength: 1,
                roughnessThreshold: 0.5,
                bounces: 1,
                steps: 64,
                enabled: true
            },
            atmosphere: {
                glowEnabled: true,
                glowQuality: 0,
                fogIntensity: 0,
                fogNear: 0,
                fogFar: 5,
                fogColor: "#000000",
                fogDensity: 0,
                glowIntensity: 0.004798262654911253,
                glowSharpness: 1,
                glowMode: true,
                glowColor: "#50aaff"
            },
            materials: {
                diffuse: 1,
                reflection: 0,
                specular: 0,
                roughness: 0.75,
                rim: 0,
                rimExponent: 3,
                envStrength: 0.25,
                envBackgroundStrength: 0.06,
                envSource: 1,
                envMapData: null,
                envMapColorSpace: 0,
                useEnvMap: true,
                envRotation: 0,
                envGradientStops: [
                    { id: "hor", position: 0, color: "#223344", bias: 0.5, interpolation: "smooth" },
                    { id: "zen", position: 1, color: "#88ccff", bias: 0.5, interpolation: "smooth" }
                ],
                emission: 0,
                emissionMode: 0,
                emissionColor: "#ffffff",
                ptEmissionMult: 1
            },
            waterPlane: {
                waterEnabled: false,
                active: true,
                height: -2,
                color: "#001133",
                roughness: 0.02,
                waveStrength: 0.1,
                waveSpeed: 1,
                waveFrequency: 1.5
            },
            coloring: {
                gradient: {
                    stops: [
                        { id: "1771879786393_0", position: 0, color: "#9e0142", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_1", position: 0.111, color: "#d53e4f", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_2", position: 0.222, color: "#f46d43", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_3", position: 0.333, color: "#fdae61", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_4", position: 0.444, color: "#fee08b", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_5", position: 0.556, color: "#e6f598", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_6", position: 0.667, color: "#abdda4", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_7", position: 0.778, color: "#66c2a5", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_8", position: 0.889, color: "#3288bd", bias: 0.5, interpolation: "linear" },
                        { id: "1771879786393_9", position: 1, color: "#5e4fa2", bias: 0.5, interpolation: "linear" }
                    ],
                    colorSpace: "srgb"
                },
                mode: 1,
                scale: 1.1510942207477979,
                offset: -0.1726286201331454,
                repeats: 1,
                phase: -0.13,
                bias: 1,
                twist: 0,
                escape: 1.2,
                gradient2: [
                    { id: "1767363622003", position: 0, color: "#FFFFFF", bias: 0.5, interpolation: "linear" },
                    { id: "1", position: 0.5, color: "#000000", bias: 0.5, interpolation: "linear" },
                    { id: "1767363615540", position: 1, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ],
                mode2: 4,
                scale2: 1,
                offset2: 0,
                repeats2: 7,
                phase2: 0,
                bias2: 1,
                twist2: 0,
                blendMode: 0,
                blendOpacity: 0,
                layer3Color: "#ffffff",
                layer3Scale: 20,
                layer3Strength: 0,
                layer3Bump: 0,
                layer3Turbulence: 0
            },
            texturing: {
                active: false,
                layer1Data: null,
                colorSpace: 0,
                mapU: 6,
                mapV: 1,
                scaleX: 1,
                scaleY: 1,
                offset: { x: 0, y: 0 },
                textureScale: { x: 1, y: 1 }
            },
            quality: {
                engineQuality: true,
                compilerHardCap: 500,
                precisionMode: 0,
                bufferPrecision: 0,
                maxSteps: 534,
                distanceMetric: 0,
                estimator: 0,
                fudgeFactor: 0.32,
                stepRelaxation: 0,
                refinementSteps: 0,
                detail: 6.1,
                pixelThreshold: 0.2,
                overstepTolerance: 2.7,
                dynamicScaling: false,
                interactionDownsample: 2,
                physicsProbeMode: 0,
                manualDistance: 10
            },
            droste: {
                active: false,
                tiling: 1,
                center: { x: 0, y: 0 },
                radiusInside: 5,
                radiusOutside: 100,
                periodicity: 2,
                strands: 2,
                autoPeriodicity: false,
                strandMirror: false,
                zoom: 0,
                rotate: 0,
                rotateSpin: 0,
                rotatePolar: 0,
                twist: true,
                hyperDroste: false,
                fractalPoints: 1
            },
            colorGrading: {
                active: true,
                saturation: 1.29,
                levelsMin: 0,
                levelsMax: 0.47826086956521746,
                levelsGamma: 0.7718886339575918
            },
            optics: {
                camType: 0,
                camFov: 60,
                orthoScale: 2,
                dofStrength: 0,
                dofFocus: 0.0598781733877129
            },
            navigation: {
                flySpeed: 0.42258925411794174,
                autoSlow: true
            },
            cameraManager: {},
            audio: {
                isEnabled: false,
                smoothing: 0.8,
                threshold: 0.1,
                agcEnabled: false,
                attack: 0.1,
                decay: 0.3,
                highPass: 20,
                lowPass: 20000,
                gain: 1
            },
            sonification: {
                isEnabled: false,
                active: true,
                baseFrequency: 220,
                masterGain: 0.5,
                scanArea: 0.1,
                harmonics: true,
                lastDimension: 0
            },
            drawing: {
                activeTool: "rect",
                enabled: false,
                active: false,
                originMode: 1,
                color: "#00ffff",
                lineWidth: 1,
                showLabels: true,
                showAxes: false,
                shapes: [],
                refreshTrigger: 0
            },
            modulation: {
                rules: [],
                selectedRuleId: null
            },
            webcam: {
                isEnabled: false,
                opacity: 1,
                posX: 20,
                posY: 80,
                width: 320,
                height: 240,
                cropL: 0,
                cropR: 0,
                cropT: 0,
                cropB: 0,
                blendMode: 0,
                crtMode: false,
                tilt: 0,
                fontSize: 12
            },
            debugTools: {
                shaderDebuggerOpen: false,
                stateDebuggerOpen: false
            },
            engineSettings: {
                showEngineTab: false
            }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.6959547620697641, y: -0.23496707663264949, z: 0.30543710842202915, w: 0.6059254202044269 },
        sceneOffset: { x: -1.9531606435775757, y: 1.1919928789138794, z: -1.096980132162571, xL: -0.41618868170671375, yL: -0.030576279777909363, zL: 0.3954860597472547 },
        targetDistance: 2.4710260497199164,
        cameraMode: "Fly",
        lights: [],
        renderMode: "Direct",
        quality: {
            aaMode: "Always",
            aaLevel: 1,
            msaa: 1,
            accumulation: true
        },
        animations: [],
        sequence: {
            durationFrames: 300,
            fps: 30,
            tracks: {
                "camera.unified.x": {
                    id: "camera.unified.x",
                    type: "float",
                    label: "Position X",
                    keyframes: [
                        {
                            id: "K_3Us2DNYcHZyIwka_uuq",
                            frame: 0,
                            value: -1.7201625603807942,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
                            rightTangent: { x: 48.951, y: 0 }
                        },
                        {
                            id: "odTd7X1107yeLfH9FK5aA",
                            frame: 147,
                            value: -1.6980158112292516,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -48.951, y: 0 },
                            rightTangent: { x: 10, y: 0 }
                        }
                    ],
                    hidden: false
                },
                "camera.unified.y": {
                    id: "camera.unified.y",
                    type: "float",
                    label: "Position Y",
                    keyframes: [
                        {
                            id: "8RswhxI4H-B1jp30d0_tB",
                            frame: 0,
                            value: 0.06091210123685605,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
                            rightTangent: { x: 48.951, y: 0 }
                        },
                        {
                            id: "Y4DuM9kqQELrT8wtkrNfn",
                            frame: 147,
                            value: 0.12378730479642533,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -48.951, y: 0 },
                            rightTangent: { x: 10, y: 0 }
                        }
                    ],
                    hidden: false
                },
                "camera.unified.z": {
                    id: "camera.unified.z",
                    type: "float",
                    label: "Position Z",
                    keyframes: [
                        {
                            id: "xAB-5DFGdS6bkihuF8OsC",
                            frame: 0,
                            value: -0.15881702211000104,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
                            rightTangent: { x: 48.951, y: 0 }
                        },
                        {
                            id: "DAF_P4oTGG75Hsx1AsrRY",
                            frame: 147,
                            value: -0.011418242797758438,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -48.951, y: 0 },
                            rightTangent: { x: 10, y: 0 }
                        }
                    ],
                    hidden: false
                },
                "camera.rotation.x": {
                    id: "camera.rotation.x",
                    type: "float",
                    label: "Rotation X",
                    keyframes: [
                        {
                            id: "TeO7ekSi3R-H4hMrtFwAE",
                            frame: 0,
                            value: -2.4946725811260992,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
                            rightTangent: { x: 48.951, y: 0 }
                        },
                        {
                            id: "8d0b5xWCbgu3uTnAgDlXz",
                            frame: 147,
                            value: -1.2608810934530643,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -48.951, y: 0 },
                            rightTangent: { x: 10, y: 0 }
                        }
                    ],
                    hidden: false
                },
                "camera.rotation.y": {
                    id: "camera.rotation.y",
                    type: "float",
                    label: "Rotation Y",
                    keyframes: [
                        {
                            id: "LbvOs-fAlGz_3QJaS3mZJ",
                            frame: 0,
                            value: 0.2399686287878261,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
                            rightTangent: { x: 48.951, y: 0 }
                        },
                        {
                            id: "vtyfLR6bU-95GzHTczuWf",
                            frame: 147,
                            value: 0.35920958243574597,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -48.951, y: 0 },
                            rightTangent: { x: 10, y: 0 }
                        }
                    ],
                    hidden: false
                },
                "camera.rotation.z": {
                    id: "camera.rotation.z",
                    type: "float",
                    label: "Rotation Z",
                    keyframes: [
                        {
                            id: "R5V5ISxjfkqp24bTHbENo",
                            frame: 0,
                            value: 0.265482333717115,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
                            rightTangent: { x: 48.951, y: 0 }
                        },
                        {
                            id: "6rTTGg-w5Pmu5rzjJzMCh",
                            frame: 147,
                            value: -0.12791460575119148,
                            interpolation: "Bezier",
                            autoTangent: false,
                            brokenTangents: false,
                            leftTangent: { x: -48.951, y: 0 },
                            rightTangent: { x: 10, y: 0 }
                        }
                    ],
                    hidden: false
                }
            }
        },
        duration: 147
    }
};
