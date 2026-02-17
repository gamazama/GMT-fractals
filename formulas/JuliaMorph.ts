
import { FractalDefinition } from '../types';

export const JuliaMorph: FractalDefinition = {
    id: 'JuliaMorph',
    name: 'Julia Morph (Stack)',
    shortDescription: 'Constructs 3D volumes by stacking 2D Julia sets. Perfect for topographic or sliced "MRI" effects.',
    description: 'Constructs a 3D object by stacking 2D Julia sets along the Z-axis. Use the Julia Panel to set the Start shape, and Params D/E for the End shape.',
    
    shader: {
        function: `
    void formula_JuliaMorph(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        
        // --- 1. MAPPING & DEFORMATION ---
        float height = max(0.1, uParamA); 
        vec2 Z = p.xy;
        float z_val = p.z;
        float t = clamp((p.z / height) + 0.5, 0.0, 1.0);

        if (uParamC > 0.001) {
            // Standard Twist: Rotate around center (0,0) in XY plane
            float ang = p.z * uParamC;
            float s = sin(ang); float co = cos(ang);
            Z = mat2(co, -s, s, co) * p.xy;
        } else if (uParamC < -0.001) {
            // Spatial Bend: Rotate the slices along the Y-axis pivot at X = -2.0
            // Curvature kappa scales with strength. 
            // R (Radius of Curvature) = 2.0 / strength. 
            // This ensures at strength 1.0, the pivot is exactly at X = -2.0.
            float strength = -uParamC; 
            float R = 20.0 / strength;
            
            // Shift coordinates so the pivot is at the origin of this local polar space
            vec2 xz_shifted = vec2(p.x + R, p.z);
            float dist_to_pivot = length(xz_shifted);
            float angle_to_pivot = atan(xz_shifted.y, xz_shifted.x);
            
            // Inverse Transform: Map the curved ray back to the straight fractal stack
            // Local X is the radial distance from the pivot (offset back so center is 0)
            Z.x = dist_to_pivot - R;
            Z.y = p.y;
            
            // Local Z is the arc length along the curve
            z_val = angle_to_pivot * R;
            t = clamp((z_val / height) + 0.5, 0.0, 1.0);
        }

        // --- 2. INTERPOLATION ---
        vec2 c1 = uJulia.xy;
        vec2 c2 = vec2(uParamD, uParamE);
        float t_smooth = t * t * (3.0 - 2.0 * t);
        vec2 C = mix(c1, c2, t_smooth);

        // --- 3. 2D JULIA ITERATION ---
        float r2 = dot(Z,Z);
        float dz_2d = 1.0;
        float iter_count = 0.0;
        float smooth_iter = 0.0;
        
        float bailout = 10000.0; 
        int limit = int(uIterations);
        float localTrap = 1e10;
        
        bool escaped = false;
        
        // Local hard limit high enough for intricate sets
        const int MAX_FORMULA_ITER = 3000;

        for(int i=0; i<MAX_FORMULA_ITER; i++) {
            if (i >= limit) break;
            
            // Derivative: dz = 2*Z*dz
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
        if (escaped) {
            float logZn = log(r2) / 2.0;
            float nu = log(logZn / log(2.0)) / log(2.0);
            smooth_iter = iter_count + 1.0 - nu;
        } else {
            smooth_iter = iter_count;
        }

        // --- 5. DISTANCE ESTIMATION ---
        float d2d = 0.0;
        if (escaped && dz_2d > 1.0e-7) {
             d2d = 0.5 * sqrt(r2) * log(r2) / dz_2d;
        } else {
             d2d = 0.0;
        }
        
        // Vertical Box Bounds (using warped z_val)
        float d_z = abs(z_val) - (height * 0.5);
        
        // Combine: Intersection of Infinite Column + Height Box
        float d = max(d2d * 0.25, d_z);
        
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
        { label: 'Slice Thickness', id: 'paramB', min: 0.01, max: 1.0, step: 0.01, default: 0.27 },
        { label: 'Twist / Bend', id: 'paramC', min: -5.0, max: 5.0, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'End C (Real)', id: 'paramD', min: -2.0, max: 2.0, step: 0.001, default: 0.286 },
        { label: 'End C (Imag)', id: 'paramE', min: -2.0, max: 2.0, step: 0.001, default: 0.009 },
        { label: 'Slice Interval', id: 'paramF', min: 0.0, max: 2.0, step: 0.01, default: 0.33 },
    ],

    defaultPreset: {
        formula: 'JuliaMorph',
        features: {
            coreMath: { 
                iterations: 100, 
                paramA: 5, 
                paramB: 0.27, 
                paramC: 0.0, 
                paramD: 0.286, 
                paramE: 0.009, 
                paramF: 0.53 
            },
            geometry: { 
                juliaMode: true, 
                juliaX: 1.03, 
                juliaY: -1.072, 
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
                color: "#0088ff",
                intensity: 0.25,
                falloff: 0,
                falloffType: "Quadratic", fixed: false, visible: false, castShadow: true
            }
        ]
    }
};
