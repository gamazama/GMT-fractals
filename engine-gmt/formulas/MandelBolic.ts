import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

export const MandelBolic: FractalDefinition = {
    id: 'MandelBolic',
    name: 'MandelBolic',
    shortDescription: 'A conformal lift of the 2D Mandelbrot into a height axis — exact on the z=0 slice, with optional genuine-3D height folds.',
    description: 'A conformal lift of the exact 2D Mandelbrot into a third (height) axis. The z=0 slice is the true Mandelbrot set — exact periodicity, real cardioid — and the height is carried upward by the map\'s own conformal derivative (a Poincaré-style normal-axis extension), giving smooth bulbs with none of the angular smearing of spherical-power 3D fractals like the Mandelbulb. By default the height dynamics are linear (a pure conformal lift, so the object is essentially 2.5D); the "Height Fold" and "Shells" controls add genuine nonlinear dynamics in the height axis — a real 3D escape boundary — while keeping that z=0 slice exact. Power, conformal cone, phase twist and height-scale shape the rest.',
    juliaType: 'julia',
    
    shader: {
        function: `
        void formula_MandelBolic(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            // Z = (x, y) is the 2D complex plane; T = z is the height axis.
            // NOTE: paramB ('Hyp. Scale') is also wired as z.w (4D init) by the
            // engine, but this formula never reads z.w, so there is no interaction.
            vec3 z3 = z.xyz;
            float power = uParamA;
            float T = z3.z;

            float rxy2 = z3.x*z3.x + z3.y*z3.y;
            float rxy  = sqrt(rxy2);
            float invR2 = 1.0 / (rxy2 + 1e-20);

            // Conformal multiplier M = 1 - C*T^2/|Z|^2. uParamC is the cone
            // control: where |Z| = sqrt(C)*|T|, M flips sign (turns bulbs inside-out).
            float m = (rxy2 - uParamC * T*T) * invR2;

            // Shared radial powers — used by both the Z mapping and the Jacobian.
            float rxy_pm1 = pow(max(rxy, 1e-10), power - 1.0);   // r^(p-1)
            float rxy_p   = rxy_pm1 * rxy;                       // r^p
            float pm2 = (power - 1.0) * rxy_pm1 / max(rxy, 1e-10); // (p-1) r^(p-2)

            // --- Height (T) dynamics ---
            // Linear lift  (vec2A = 0): pure conformal/Poincaré extension. The
            // height is carried by the in-plane map's derivative, so T obeys a
            // *linear* recurrence — the object is conformally beautiful but 2.5D
            // (no independent escape boundary in T).
            // vec2A.x 'Height Fold' : odd quadratic self-term -> a genuine
            //   nonlinear escape boundary in T (truly 3D structure).
            // vec2A.y 'Shells'      : sin(T) periodic fold -> concentric shells.
            // Both vanish at T = 0, so the z = 0 slice stays the exact 2D Mandelbrot.
            float tFold  = uVec2A.x;
            float tShell = uVec2A.y;
            float nlSelf  = tFold  * T * abs(T) * rxy_pm1;  // sign(T)*T^2 * r^(p-1)
            float nlShell = tShell * sin(T)     * rxy_pm1;

            // --- Distance estimate: largest singular value of the 3x3 Jacobian,
            // bounded by the EXACT sigma_max of its dominant 2x2 (XY,T) block.
            // The previous max(|m|,|B|) ignored the off-diagonal coupling (T<->XY
            // through M and through r^(p-1)), under-estimating the stretch and
            // cracking the surface. jA/jD are the diagonal stretches; jB/jC the
            // coupling. At T=0 the block is diagonal and this reduces exactly to
            // the old p*r^(p-1)*max(|m|,|B|).
            float jA = power * rxy_pm1 * abs(m);                               // d(XY)/d(XY)
            float jD = power * rxy_pm1 * abs(uParamB)                          // d(T)/d(T)
                     + abs(tFold) * 2.0 * abs(T) * rxy_pm1
                     + abs(tShell) * abs(cos(T)) * rxy_pm1;
            float jB = rxy_p * 2.0 * abs(uParamC) * abs(T) * invR2;            // d(XY)/dT  (|W| * |dM/dT|)
            float jC = abs(uParamB) * abs(T) * power * pm2                     // d(T)/d(XY) (linear + folds)
                     + abs(tFold)  * T*T          * pm2
                     + abs(tShell) * abs(sin(T))  * pm2;
            float S   = jA*jA + jB*jB + jC*jC + jD*jD;     // ||J_block||_F^2
            float det = jA*jD - jB*jC;
            float sigmaMax = sqrt(0.5 * (S + sqrt(max(S*S - 4.0*det*det, 0.0))));
            dr = sigmaMax * dr + 1.0;

            // --- Z mapping: Z_{n+1} = Z_n^p * M + C_z, with Phase Twist (uParamD) ---
            float theta = atan(z3.y, z3.x) * power + uParamD;
            float nx = rxy_p * cos(theta) * m + c.x;
            float ny = rxy_p * sin(theta) * m + c.y;

            // T_{n+1} = p*|Z|^(p-1)*T*B  + nonlinear folds + C_t + Z-offset
            float nz = power * rxy_pm1 * T * uParamB + nlSelf + nlShell + c.z + uParamE;

            z.xyz = vec3(nx, ny, nz);
            trap = min(trap, length(z.xyz) * uParamF);
        }`,
        loopBody: `formula_MandelBolic(z, dr, trap, c);`,
        // Lock the analytic-log estimator so the carefully-bounded dr above is
        // always paired with the matching metric (independent of the Quality
        // panel's Estimator dropdown). This replicates the engine's built-in
        // estimator 0 + log iteration smoothing exactly — coloring is unchanged.
        getDist: `
            float m2 = r * r;
            if (m2 < 1.0e-20) return vec2(0.0, iter);
            float smoothIter = iter;
            if (m2 > 1.0) {
                float threshLog = log2(max(uEscapeThresh, 1.1));
                smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
            }
            float dr_safe = max(abs(dr), 1.0e-20);
            float d = 0.17328679 * log2(m2) * r / dr_safe;   // 0.5*r*ln(r)/dr
            return vec2(d, smoothIter);`,
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 1.0, max: 16.0, step: 0.01, default: 2.0 },
        { label: 'Hyp. Scale', id: 'paramB', min: -2.0, max: 2.0, step: 0.01, default: 1.0 },
        // Coefficient on T^2 in the conformal multiplier M = 1 - C*T^2/|Z|^2 —
        // controls the |Z| = sqrt(C)*|T| cone where M flips sign (not a shift).
        { label: 'Conformal Cone', id: 'paramC', min: -2.0, max: 2.0, step: 0.01, default: 1.0 },
        { label: 'Phase Twist', id: 'paramD', min: -3.14, max: 3.14, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Z-Offset', id: 'paramE', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'Trap Scale', id: 'paramF', min: 0.1, max: 5.0, step: 0.01, default: 1.0 },
        // Nonlinear height dynamics. (0,0) = pure linear conformal lift (2.5D).
        // x = Height Fold (quadratic self-term -> real 3D escape boundary),
        // y = Shells (sin(T) periodic fold). Both keep the z=0 slice exact.
        { label: 'Height Fold / Shells', id: 'vec2A', type: 'vec2', min: -1.0, max: 1.0, step: 0.01, default: { x: 0, y: 0 } }
    ],

    defaultPreset: {
        formula: "MandelBolic",
        features: {
            coreMath: { iterations: 26, paramA: 2, paramB: 1, paramC: 1, paramD: 0, paramE: 0, paramF: 1, vec2A: { x: 0, y: 0 } },
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
                fudgeFactor: 1.0,
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
        lights: []
    }
};
