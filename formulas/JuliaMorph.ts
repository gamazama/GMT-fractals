
import { FractalDefinition } from '../types';

export const JuliaMorph: FractalDefinition = {
    id: 'JuliaMorph',
    name: 'Julia Morph (Stack)',
    shortDescription: 'Constructs 3D volumes by stacking 2D Julia sets. Perfect for topographic or sliced "MRI" effects.',
    description: 'Constructs a 3D object by stacking 2D Julia sets along the Z-axis. Start C and End C define the Julia constants at the bottom and top. The constant smoothly interpolates between them along the height.',
    juliaType: 'julia',

    shader: {
        function: `
    void formula_JuliaMorph(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // --- 1. MAPPING & DEFORMATION ---
        float height = max(0.1, uParamA);
        float z_val = p.z;
        float taperFactor = 1.0;

        // Bend FIRST: Curve the column along X-axis (works on original p)
        // paramD = bend direction (signed distance), abs value = curvature amount
        // Must come before twist/taper since it remaps all coordinates
        if (abs(uParamD) > 0.001) {
            float R = 20.0 / abs(uParamD);
            float sd = sign(uParamD);
            // Mirror X for negative bend, bend around +X pivot, then mirror back
            float px = p.x * sd;
            float px_shifted = px + R;
            float dist = length(vec2(px_shifted, p.z));
            float ang = atan(p.z, px_shifted);
            // Unbend: radial distance becomes new X, arc length becomes new Z
            p.x = (dist - R) * sd;
            z_val = ang * R;
        }

        float t = clamp((z_val / height) + 0.5, 0.0, 1.0);
        vec2 Z = p.xy;

        // Taper: scale XY based on Z position, with DE compensation
        if (abs(uParamE) > 0.001) {
            taperFactor = 1.0 + t * uParamE;
            Z *= taperFactor;
        }

        // Twist: Rotate XY around center based on Z
        if (abs(uParamC) > 0.001) {
            float ang = z_val * uParamC;
            float s = sin(ang); float co = cos(ang);
            Z = mat2(co, -s, s, co) * Z;
        }

        // --- 2. INTERPOLATION ---
        vec2 c1 = uVec2B;
        vec2 c2 = uVec2A;
        float t_smooth = t * t * (3.0 - 2.0 * t);
        vec2 C = mix(c1, c2, t_smooth);

        // --- 3. 2D JULIA ITERATION ---
        float r2 = dot(Z,Z);
        float dz_2d = 1.0;
        float iter_count = 0.0;

        float bailout = 10000.0;
        int limit = int(uIterations);
        float localTrap = 1e10;

        bool escaped = false;

        const int MAX_FORMULA_ITER = 3000;

        for(int i=0; i<MAX_FORMULA_ITER; i++) {
            if (i >= limit) break;

            // Derivative: |dz'| = 2|z| * |dz|
            dz_2d *= 2.0 * sqrt(r2);
            if (dz_2d > 1.0e10) dz_2d = 1.0e10;

            // Z = Z^2 + C
            float nx = (Z.x * Z.x - Z.y * Z.y) + C.x;
            float ny = (2.0 * Z.x * Z.y) + C.y;
            Z = vec2(nx, ny);

            r2 = dot(Z,Z);
            localTrap = min(localTrap, r2);
            iter_count += 1.0;

            if(r2 > bailout) {
                escaped = true;
                break;
            }
        }

        // --- 4. SMOOTH ITERATION ---
        float smooth_iter;
        if (escaped) {
            float logZn = log(r2) / 2.0;
            float nu = log(logZn / log(2.0)) / log(2.0);
            smooth_iter = iter_count + 1.0 - nu;
        } else {
            smooth_iter = iter_count;
        }

        // --- 5. DISTANCE ESTIMATION ---
        float d2d;
        if (escaped && dz_2d > 1.0e-7) {
             // Exterior: standard 2D Julia DE
             d2d = 0.5 * sqrt(r2) * log(r2) / dz_2d;
        } else {
             // Interior: approximate negative distance from boundary
             // Use sqrt of orbit trap (minimum r² seen) as rough interior distance
             d2d = -sqrt(localTrap) * 0.5;
        }

        // Taper DE compensation: scaled coordinates produce scaled distances
        if (abs(taperFactor) > 0.01) {
            d2d /= abs(taperFactor);
        }

        // Twist DE correction: twist stretches space by sqrt(1 + (twist_rate * r_xy)^2)
        // This is the Jacobian correction for the twist deformation
        if (abs(uParamC) > 0.001) {
            float r_xy = length(p.xy);
            d2d /= sqrt(1.0 + uParamC * uParamC * r_xy * r_xy);
        }

        // Bend DE correction: bend compresses/stretches distances depending on
        // distance from the bend axis. Correction factor = R / (R + p.x)
        if (abs(uParamD) > 0.001) {
            float bendR = 20.0 / abs(uParamD);
            float bendCorr = bendR / max(bendR + p.x * sign(uParamD), 0.1);
            d2d *= bendCorr;
        }

        // Vertical Box Bounds (using warped z_val)
        float d_z = abs(z_val) - (height * 0.5);

        // Combine: Intersection of Julia Column + Height Box
        float d = max(d2d, d_z);

        // --- 6. SLICING ---
        float sliceInterval = uParamF;
        if (sliceInterval > 0.01) {
            float ratio = clamp(uParamB, 0.01, 0.95);
            float thickness = (sliceInterval * 0.5) * ratio;
            float distToSlice = abs(mod(z_val, sliceInterval) - sliceInterval * 0.5) - thickness;
            d = max(d, distToSlice);
        }

        trap = min(trap, localTrap);

        // Return packed result
        z = vec4(Z.x, Z.y, d, smooth_iter);
    }`,
        loopBody: `formula_JuliaMorph(z, dr, trap, c); break;`,
        getDist: `
            return vec2(z.z, z.w);
        `
    },

    parameters: [
        { label: 'Height (Z Scale)', id: 'paramA', min: 0.1, max: 10.0, step: 0.1, default: 5.0 },
        { label: 'Slice Interval', id: 'paramF', min: 0.0, max: 2.0, step: 0.01, default: 0.33 },
        { label: 'Slice Thickness', id: 'paramB', min: 0.01, max: 1.0, step: 0.01, default: 0.27 },
        { label: 'Start C', id: 'vec2B', type: 'vec2', min: -2.0, max: 2.0, step: 0.001, default: { x: 1.03, y: -1.072 } },
        { label: 'End C', id: 'vec2A', type: 'vec2', min: -2.0, max: 2.0, step: 0.001, default: { x: 0.286, y: 0.009 } },
        { label: 'Twist', id: 'paramC', min: -5.0, max: 5.0, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Bend', id: 'paramD', min: -5.0, max: 5.0, step: 0.01, default: 0.0 },
        { label: 'Taper', id: 'paramE', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: 'JuliaMorph',
        features: {
            coreMath: {
                iterations: 100,
                paramA: 5,
                paramB: 0.27,
                paramC: 0.0,
                paramF: 0.53,
                vec2A: { x: 0.286, y: 0.009 },
                vec2B: { x: 1.03, y: -1.072 }
            },
            geometry: {
                juliaMode: false,
                juliaX: 0,
                juliaY: 0,
                juliaZ: 0
            },
            coloring: {
                mode: 1,
                scale: 4.697920323185873,
                offset: 0.13,
                repeats: 1,
                phase: 0.13,
                bias: 1,
                escape: 4,
                gradient: [
                    { id: "1", position: 0, color: "#080022", bias: 0.5, interpolation: "linear" },
                    { id: "2", position: 0.3, color: "#1C2058", bias: 0.5, interpolation: "linear" },
                    { id: "3", position: 0.6, color: "#00ccff", bias: 0.5, interpolation: "linear" },
                    { id: "4", position: 0.735261118203675, color: "#ffffff", bias: 0.5, interpolation: "linear" },
                    { id: "1768818072358", position: 1, color: "#090022", bias: 0.5, interpolation: "linear" }
                ],
                mode2: 0,
                scale2: 0.4003079069279198,
                offset2: 0.48021004308135196,
                repeats2: 1,
                phase2: 0,
                bias2: 1,
                twist2: 0,
                blendMode: 2,
                blendOpacity: 1,
                gradient2: [
                    { id: "1768817090653_0", position: 0, color: "#9e0142", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_1", position: 0.111, color: "#d53e4f", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_2", position: 0.222, color: "#f46d43", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_3", position: 0.333, color: "#fdae61", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_4", position: 0.444, color: "#fee08b", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_5", position: 0.556, color: "#e6f598", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_6", position: 0.667, color: "#abdda4", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_7", position: 0.778, color: "#66c2a5", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_8", position: 0.889, color: "#3288bd", bias: 0.5, interpolation: "linear" },
                    { id: "1768817090653_9", position: 1, color: "#5e4fa2", bias: 0.5, interpolation: "linear" }
                ],
                layer3Color: "#ffffff",
                layer3Scale: 2,
                layer3Strength: 0,
                layer3Bump: 0,
                layer3Turbulence: 0
            },
            atmosphere: {
                fogNear: 0,
                fogFar: 5,
                fogColor: "#050510",
                fogDensity: 0.02,
                glowIntensity: 0,
                glowSharpness: 200,
                glowMode: false,
                glowColor: "#ffffff",
                aoIntensity: 0,
                aoSpread: 0.2,
                aoMode: false
            },
            materials: {
                diffuse: 1,
                reflection: 0,
                specular: 0.61,
                roughness: 0.22438819237827662,
                rim: 0,
                rimExponent: 4,
                envStrength: 0,
                envMapVisible: false,
                envBackgroundStrength: 1,
                envSource: 1,
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
            lighting: {
                shadows: true,
                shadowSoftness: 41.7859226170808,
                shadowIntensity: 0.92,
                shadowBias: 0.002,
                ptBounces: 3,
                ptGIStrength: 1,
                ptStochasticShadows: false
            },
            quality: {
                fudgeFactor: 1,
                detail: 4,
                pixelThreshold: 0.5,
                maxSteps: 300,
                distanceMetric: 0
            },
            optics: {
                camType: 0,
                camFov: 60,
                orthoScale: 2,
                dofStrength: 0,
                dofFocus: 10
            },
            navigation: {
                flySpeed: 0.42,
                autoSlow: true
            }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: 0.21740819322063967, y: 0.12483788618539499, z: -0.11589452875015582, w: 0.9611023035551793 },
        sceneOffset: { x: 0, y: -1, z: 4, xL: 0.10960732222484179, yL: -0.26099943689461447, zL: 0.15599693750325688 },
        targetDistance: 2.512885481119156,
        cameraMode: "Fly",
        lights: [
            {
                type: 'Point',
                position: { x: 2.056650977487994, y: -0.7418778505604411, z: 3.39849758131238 },
                rotation: { x: 0, y: 0, z: 0 },
                color: "#ffffff",
                intensity: 8.76,
                falloff: 0,
                falloffType: "Quadratic", fixed: false, visible: true, castShadow: true
            },
            {
                type: 'Point',
                position: { x: -0.37117243582015064, y: -1.5852765971855902, z: 3.0489919017830487 },
                rotation: { x: 0, y: 0, z: 0 },
                color: "#ff8800",
                intensity: 0.5,
                falloff: 0,
                falloffType: "Quadratic", fixed: false, visible: true, castShadow: true
            },
            {
                type: 'Point',
                position: { x: 0, y: -5, z: 2 },
                rotation: { x: 0, y: 0, z: 0 },
                color: "#E0EEFF", useTemperature: true, temperature: 7500,
                intensity: 0.25,
                falloff: 0,
                falloffType: "Quadratic", fixed: false, visible: false, castShadow: true
            }
        ]
    }
};
