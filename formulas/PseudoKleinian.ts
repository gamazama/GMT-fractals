
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
        
        // Param E: Shift
        if (abs(uParamE) > 0.001) {
            q.z += uParamE;
        }
        
        z.xyz = q;
        trap = min(trap, lensq);
    }`,
        loopBody: `formula_PseudoKleinian(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Box Limit', id: 'paramA', min: 0.1, max: 2.0, step: 0.01, default: 1.0 },
        { label: 'Size (C)', id: 'paramB', min: 0.5, max: 2.5, step: 0.001, default: 1.354 },
        { label: 'Power', id: 'paramC', min: 1.0, max: 2.5, step: 0.001, default: 1.576 },
        { label: 'Magic Factor', id: 'paramD', min: 0.0, max: 1.5, step: 0.001, default: 0.772 },
        { label: 'Z Shift', id: 'paramE', min: -1.0, max: 1.0, step: 0.001, default: 0.0 },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "PseudoKleinian",
        features: {
            atmosphere: {
                fogIntensity: 0.32,
                fogNear: 0.0001,
                fogFar: 45.212,
                fogColor: "#4db8cf",
                fogDensity: 0,
                glowIntensity: 0,
                glowSharpness: 1,
                glowMode: true,
                glowColor: "#9be0ff",
                aoIntensity: 0,
                aoSpread: 0.158,
                aoMode: false
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
            materials: {
                diffuse: 1,
                reflection: 0,
                specular: 1.88,
                roughness: 0.26890569500292505,
                rim: 0,
                rimExponent: 2,
                envStrength: 0,
                envMapVisible: false,
                envBackgroundStrength: 1,
                envSource: 1,
                envMapData: null,
                useEnvMap: true,
                envRotation: 0,
                envGradientStops: [
                    { id: "0", position: 0.03, color: "#130606" },
                    { id: "1", position: 0.14, color: "#463434" },
                    { id: "2", position: 0.41, color: "#824040" },
                    { id: "3", position: 0.68, color: "#BCBCBC" },
                    { id: "4", position: 1, color: "#875656" }
                ],
                emission: 0,
                emissionMode: 0,
                emissionColor: "#ffffff",
                ptEmissionMult: 1
            },
            colorGrading: {
                active: false,
                saturation: 1,
                levelsMin: 0,
                levelsMax: 0.71,
                levelsGamma: 0.91
            },
            texturing: {
                active: false,
                layer1Data: null,
                mapU: 6,
                mapV: 1,
                scaleX: 1,
                scaleY: 1,
                offset: { x: 0, y: 0 },
                textureScale: { x: 1, y: 1 }
            },
            coloring: {
                gradient: [
                    { id: "1766247241150_0", position: 0, color: "#001133", bias: 0.5, interpolation: "linear" },
                    { id: "1766247241150_1", position: 0.5, color: "#0066aa", bias: 0.5, interpolation: "linear" },
                    { id: "1766247241150_2", position: 1, color: "#00ffff", bias: 0.5, interpolation: "linear" }
                ],
                mode: 6,
                scale: 1,
                offset: 0,
                repeats: 26.1,
                phase: 0,
                bias: 1,
                twist: 0,
                escape: 96.38,
                gradient2: [
                    { id: "1766247257110_0", position: 0, color: "#d3f2a3", bias: 0.5, interpolation: "linear" },
                    { id: "1766247257110_1", position: 0.167, color: "#97e196", bias: 0.5, interpolation: "linear" },
                    { id: "1766247257110_2", position: 0.333, color: "#6cc08b", bias: 0.5, interpolation: "linear" },
                    { id: "1766247257110_3", position: 0.5, color: "#4c9b82", bias: 0.5, interpolation: "linear" },
                    { id: "1766247257110_4", position: 0.667, color: "#217a79", bias: 0.5, interpolation: "linear" },
                    { id: "1766247257110_5", position: 0.833, color: "#105965", bias: 0.5, interpolation: "linear" },
                    { id: "1766247257110_6", position: 1, color: "#074050", bias: 0.5, interpolation: "linear" }
                ],
                mode2: 0,
                scale2: 1,
                offset2: 0,
                repeats2: 10,
                phase2: 0.69,
                bias2: 1,
                twist2: 0,
                blendMode: 0,
                blendOpacity: 0.48,
                layer3Color: "#ffffff",
                layer3Scale: 28.5,
                layer3Strength: 0,
                layer3Bump: 0,
                layer3Turbulence: 0
            },
            geometry: {
                preRotEnabled: false,
                preRotY: 0,
                preRotX: 0,
                preRotZ: 0,
                juliaMode: false,
                juliaX: 0.73,
                juliaY: 2,
                juliaZ: -2,
                hybridMode: false,
                hybridIter: 2,
                hybridScale: 2,
                hybridMinR: 0.5,
                hybridFixedR: 1,
                hybridFoldLimit: 1,
                hybridAddC: false,
                hybridComplex: false,
                hybridProtect: true,
                hybridSkip: 1,
                hybridSwap: false,
                preRot: { x: 0, y: 0, z: 0 },
                julia: { x: 0, y: 0, z: 0 }
            },
            quality: {
                fudgeFactor: 1,
                detail: 0.7,
                pixelThreshold: 0.3,
                maxSteps: 300,
                distanceMetric: 0,
                estimator: 4.0 // Linear (2.0)
            },
            coreMath: {
                iterations: 7,
                paramA: 2,
                paramB: 2.5,
                paramC: 1.504,
                paramD: 0.801,
                paramE: 0.099,
                paramF: 0
            },
            lighting: {
                shadows: true,
                shadowSoftness: 25.7,
                shadowIntensity: 1,
                shadowBias: 0.000016,
                ptBounces: 3,
                ptGIStrength: 1,
                ptStochasticShadows: false,
                lights: [
                    { position: { x: 2.6782265868859914, y: 2.519524178935847, z: 1.9186106243635077 }, color: "#99A4FF", intensity: 54.4644, falloff: 0.3, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
                    { position: { x: 0.05, y: 0.075, z: -0.1 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
                    { position: { x: 0.25, y: 0.075, z: -0.1 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
                ]
            },
            optics: {
                camType: 0,
                camFov: 60,
                orthoScale: 2,
                dofStrength: 0,
                dofFocus: 1.515
            },
            navigation: {
                flySpeed: 0.3799999999999999,
                autoSlow: true
            },
            audio: {
                threshold: 0.1,
                agcEnabled: false,
                attack: 0.1,
                decay: 0.3,
                highPass: 20,
                lowPass: 20000,
                gain: 1
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
            }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.44958126500369255, y: 0.13735346204998755, z: 0.1977245142917942, w: 0.860183543825756 },
        sceneOffset: { x: 2.7794198989868164, y: -4.152594447135925, z: 3.4243035316467285, xL: -0.445830410046955, yL: 0.09840789755523893, zL: -0.22267699480975622 },
        targetDistance: 5.005470454692841,
        cameraMode: "Orbit",
        lights: [],
        renderMode: "Direct",
        quality: { aaMode: "Always", aaLevel: 2, msaa: 1, accumulation: true },
        animations: [
            { id: "4yFFplV3QPo3KoNaGJwfX", enabled: false, target: "coreMath.paramA", shape: "Sine", period: 5, amplitude: 1, baseValue: 1.71, phase: 0, smoothing: 0.5 }
        ],
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
                            id: "4TTAqHRSNX_yNs7y94F0r",
                            frame: 0,
                            value: 3.7794198786970727,
                            interpolation: "Bezier",
                            autoTangent: true,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
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
                            id: "zAMQHlXx144VPd_al_Y9L",
                            frame: 0,
                            value: -6.618905668658809,
                            interpolation: "Bezier",
                            autoTangent: true,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
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
                            id: "1LR1t6ODtEmkVVIa03sDE",
                            frame: 0,
                            value: 3.078714305139574,
                            interpolation: "Bezier",
                            autoTangent: true,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
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
                            id: "kCoLqnvoBEVYvB2kegFKg",
                            frame: 0,
                            value: 1.3203186773803572,
                            interpolation: "Bezier",
                            autoTangent: true,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
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
                            id: "lTHtVHzDsBLjg5l5pXz8D",
                            frame: 0,
                            value: 0.33161255787892263,
                            interpolation: "Bezier",
                            autoTangent: true,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
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
                            id: "0LIRS-UZivENQ7h_xsyNy",
                            frame: 0,
                            value: 0,
                            interpolation: "Bezier",
                            autoTangent: true,
                            brokenTangents: false,
                            leftTangent: { x: -10, y: 0 },
                            rightTangent: { x: 10, y: 0 }
                        }
                    ],
                    hidden: false
                }
            }
        },
        duration: 300
    }
};
