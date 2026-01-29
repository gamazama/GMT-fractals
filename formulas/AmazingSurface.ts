
import { FractalDefinition } from '../types';

export const AmazingSurface: FractalDefinition = {
    id: 'AmazingSurface',
    name: 'Amazing Surface',
    description: 'A "Menger-Kleinian" hybrid. Uses 3-axis sorting (Menger) followed by a Box Fold and Sphere Inversion. Capable of creating non-orthogonal, organic machinery.',
    
    shader: {
        loopInit: `
            // Fix: Zero out W component to prevent uParamB (InvMax) from affecting magnitude check
            z.w = 0.0;

            // Apply Pre-Scale (Param E) once at the start
            // Loop Init always runs before the loop, so we don't need to check iter
            float preScale = (abs(uParamE) < 0.001) ? 1.0 : (1.0 / uParamE);
            z.xyz *= preScale;
            dr *= preScale;
        `,
        function: `
    void formula_AmazingSurface(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        
        // Params
        float scale = uParamA;      // Fractal Scale (fractal_fold + 1)
        float invMax = uParamB;     // Inversion Clamp Max (3.0)
        float cSizeZ = uParamC;     // Box Size Z (1.3)
        float zOffset = uParamD;    // Translation Z (fractal_min_radius)
        
        vec3 cSize = vec3(1.0, 1.0, cSizeZ);
        vec3 offset = vec3(0.0, 0.0, -zOffset);
        
        if (uJuliaMode > 0.5) offset += uJulia;

        // 1. Menger-style Folding (Sort Axes)
        p = abs(p);
        if (p.x < p.y) p.xy = p.yx;
        if (p.x < p.z) p.xz = p.zx;
        if (p.y < p.z) p.yz = p.zy;
        
        // 2. Box Fold / Scale
        // formula: p = p * scale - csize * (scale - 1.0)
        p = p * scale - cSize * (scale - 1.0);
        
        // 3. Sphere Inversion
        float r2 = dot(p, p);
        float k = clamp(1.0 / r2, 1.0, invMax);
        p *= k;
        
        // 4. Translation
        p += offset;
        
        // 5. Derivative Update
        // Based on reference: de = de * k * scale
        // We use full chain rule approximation for stability
        dr = dr * abs(scale) * k + 1.0;
        
        z.xyz = p;
        trap = min(trap, length(p));
    }`,
        loopBody: `formula_AmazingSurface(z, dr, trap, c);`,
        getDist: `
            // DE: (length(p) - Thickness) / dr
            // Use 'r' which comes from DE_MASTER (respects Distance Metric)
            float thickness = uParamF;
            return vec2((r - thickness) / dr, iter);
        `
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 1.0, max: 4.0, step: 0.001, default: 2.37 }, // fractal_fold + 1
        { label: 'Inv Max', id: 'paramB', min: 1.0, max: 5.0, step: 0.01, default: 3.0 },
        { label: 'Box Size Z', id: 'paramC', min: 0.1, max: 3.0, step: 0.01, default: 1.3 },
        { label: 'Trans Z', id: 'paramD', min: -2.0, max: 2.0, step: 0.001, default: 0.5 }, // fractal_min_radius
        { label: 'Pre-Scale', id: 'paramE', min: 0.1, max: 5.0, step: 0.01, default: 1.0 }, // fractal_scale
        { label: 'Thickness', id: 'paramF', min: 0.0, max: 10.0, step: 0.01, default: 0.4 },
    ],

    defaultPreset: {
        formula: "AmazingSurface",
        features: {
            atmosphere: {
                fogIntensity: 0,
                fogNear: 0,
                fogFar: 5,
                fogColor: "#000000",
                fogDensity: 0,
                glowIntensity: 0,
                glowSharpness: 200,
                glowMode: false,
                glowColor: "#ffffff",
                aoIntensity: 0.2,
                aoSpread: 0.028079152787892275,
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
                specular: 0.3,
                roughness: 0.5,
                rim: 0,
                rimExponent: 4,
                envStrength: 0.125,
                envMapVisible: true,
                envBackgroundStrength: 0.013878516332918171,
                envSource: 1,
                envMapData: null,
                useEnvMap: false,
                envRotation: 0,
                envGradientStops: [
                    { id: "sky", position: 0, color: "#000000", bias: 0.5, interpolation: "smooth" },
                    { id: "hor", position: 0.5, color: "#223344", bias: 0.5, interpolation: "smooth" },
                    { id: "zen", position: 1, color: "#88ccff", bias: 0.5, interpolation: "smooth" }
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
                levelsMax: 1,
                levelsGamma: 1
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
                    { id: "2", position: 0.29337201676350744, color: "#FFFFFF", bias: 0.5, interpolation: "step" },
                    { id: "1768067662570", position: 0.32743611518925475, color: "#4F8728", bias: 0.33333333333333326, interpolation: "step" },
                    { id: "1768067659362", position: 0.4161607050126708, color: "#FFFFFF", bias: 0.5, interpolation: "step" },
                    { id: "1768067719427", position: 0.5555850604494675, color: "#FF7D7D", bias: 0.5, interpolation: "step" },
                    { id: "1768067722341", position: 0.6094535614136845, color: "#FFFFFF", bias: 0.5, interpolation: "linear" },
                    { id: "1768067729100", position: 0.6876155711314749, color: "#FFB716", bias: 0.5, interpolation: "linear" },
                    { id: "1768067900586", position: 0.7932402117621893, color: "#FFFFFF", bias: 0.5, interpolation: "linear" }
                ],
                mode: 0,
                scale: 13.919207813258625,
                offset: 0.787073242086744,
                repeats: 1.5,
                phase: 0,
                bias: 1,
                twist: 0,
                escape: 1.0069316688518042,
                gradient2: [
                    { id: "1", position: 0, color: "#000000" },
                    { id: "2", position: 1, color: "#ffffff" }
                ],
                mode2: 4,
                scale2: 1,
                offset2: 0,
                repeats2: 1,
                phase2: 0,
                bias2: 1,
                twist2: 0,
                blendMode: 0,
                blendOpacity: 0,
                layer3Color: "#ffffff",
                layer3Scale: 2,
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
                juliaX: 0,
                juliaY: 0,
                juliaZ: 0,
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
                fudgeFactor: 0.5,
                detail: 2,
                pixelThreshold: 0.5,
                maxSteps: 300,
                distanceMetric: 1
            },
            coreMath: {
                iterations: 12,
                paramA: 1.866,
                paramB: 1.63,
                paramC: 0.62,
                paramD: -0.64,
                paramE: 0.97,
                paramF: 1.4
            },
            lighting: {
                shadows: true,
                shadowSoftness: 12,
                shadowIntensity: 1,
                shadowBias: 0.0001,
                ptBounces: 3,
                ptGIStrength: 1,
                ptStochasticShadows: false,
                light0_visible: true,
                light0_fixed: false,
                light0_castShadow: true,
                light0_type: false,
                light0_intensity: 50,
                light0_falloff: 50,
                light0_posX: -0.34174133805446993,
                light0_posY: -1.233562063425787,
                light0_posZ: 1.8137779830637029,
                light0_color: "#ffffff",
                light1_visible: false,
                light1_fixed: false,
                light1_castShadow: false,
                light1_type: false,
                light1_intensity: 0.5,
                light1_falloff: 0.5,
                light1_posX: 0.05,
                light1_posY: 0.075,
                light1_posZ: -0.1,
                light1_color: "#ff0000",
                light2_visible: false,
                light2_fixed: false,
                light2_castShadow: false,
                light2_type: false,
                light2_intensity: 0.5,
                light2_falloff: 0.5,
                light2_posX: 0.25,
                light2_posY: 0.075,
                light2_posZ: -0.1,
                light2_color: "#0000ff"
            },
            optics: {
                camType: 0,
                camFov: 60,
                orthoScale: 2,
                dofStrength: 0,
                dofFocus: 10
            },
            navigation: {
                flySpeed: 0.5,
                autoSlow: true
            },
            audio: {
                smoothing: 0.5,
                links: [],
                selectedLinkId: null,
                threshold: 0.1,
                agcEnabled: false,
                attack: 0.1,
                decay: 0.3,
                highPass: 20,
                lowPass: 20000,
                gain: 1
            }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.4173748330716279, y: 0.023019150204605446, z: -0.01057663171011426, w: 0.9083812538268042 },
        sceneOffset: { x: 0, y: -2, z: 2, xL: 0.04868238113505319, yL: -0.4245626359584309, zL: 0.3428044731107205 },
        targetDistance: 2.077035516500473,
        cameraMode: "Orbit",
        lights: [],
        renderMode: "Direct",
        quality: { aaMode: "Always", aaLevel: 1, msaa: 1, accumulation: true },
        animations: [],
        sequence: { durationFrames: 300, fps: 30, tracks: {} },
        duration: 300
    }
};
