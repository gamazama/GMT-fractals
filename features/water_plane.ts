
import { FeatureDefinition } from '../engine/FeatureSystem';
import * as THREE from 'three';

export interface WaterPlaneState {
    waterEnabled: boolean; // Engine Switch (Compile Time)
    active: boolean;       // Runtime Switch
    height: number;
    color: THREE.Color;
    roughness: number;
    waveStrength: number;
    waveSpeed: number;
    waveFrequency: number;
}

const WATER_GLSL_FUNCS = `
// --- WATER PLANE LOGIC ---

// Helper: Multi-octave wave function
float getWaterHeight(vec3 p, float t, float freq, float strength) {
    if (strength <= 0.001) return 0.0;
    
    float h = 0.0;
    vec3 q = p * freq;
    
    // Layer 1: Rolling Swell (Sine based for mass)
    float wave1 = sin(q.x * 1.0 + t) * cos(q.z * 0.8 + t * 0.8);
    h += wave1 * 0.5;
    
    // Layer 2: Organic Surface (Simplex Noise)
    // Moving opposing direction for turbulence
    vec3 nP = q * 2.5 + vec3(t * 0.5, 0.0, -t * 0.5);
    float noise = snoise(nP);
    h += noise * 0.3;
    
    // Layer 3: Fine Choppiness
    vec3 nP2 = q * 6.0 + vec3(-t, 0.0, t * 0.2);
    h += snoise(nP2) * 0.1;

    return h * strength;
}

// Returns distance to water. 
// Uses Lipschitz bound (0.6) to prevent overstepping on steep waves, 
// ensuring shadows and AO resolve correctly.
float mapWater(vec3 p) {
    if (uWaterActive < 0.5) return 1e10;
    
    float level = uWaterHeight;
    float disp = 0.0;
    
    // Only calculate noise close to the plane to save performance
    // Bounding box check: if |y - level| > max_wave_height, return simple plane
    float distPlane = p.y - level;
    
    if (uWaterWaveStrength > 0.001) {
        // Optimization: If far away, treat as flat plane
        if (abs(distPlane) < uWaterWaveStrength * 2.0) {
            float t = uTime * uWaterWaveSpeed;
            disp = getWaterHeight(p, t, uWaterWaveFreq, uWaterWaveStrength);
        }
    }
    
    // SDF = Vertical distance - Displacement
    // Multiply by 0.6 to stabilize raymarching against the steep gradients of the waves
    return (distPlane - disp) * 0.6;
}

// Override material if water is hit
void applyWaterMaterial(inout vec3 albedo, inout float roughness, inout vec3 normal, vec3 p) {
    if (uWaterActive > 0.5) {
        
        // 1. Recalculate Normal via Finite Difference
        // This ensures the reflection/specular matches the wave geometry perfectly
        if (uWaterWaveStrength > 0.001) {
             float t = uTime * uWaterWaveSpeed;
             float eps = 0.05; // Sampling delta
             
             // Sample height at 3 points
             float h0 = getWaterHeight(p, t, uWaterWaveFreq, uWaterWaveStrength);
             float hx = getWaterHeight(p + vec3(eps, 0.0, 0.0), t, uWaterWaveFreq, uWaterWaveStrength);
             float hz = getWaterHeight(p + vec3(0.0, 0.0, eps), t, uWaterWaveFreq, uWaterWaveStrength);
             
             // Construct tangent vectors
             vec3 v1 = vec3(eps, hx - h0, 0.0);
             vec3 v2 = vec3(0.0, hz - h0, eps);
             
             // N = v2 x v1 (Cross product for Up-facing normal)
             normal = normalize(cross(v2, v1));
        } else {
             normal = vec3(0.0, 1.0, 0.0);
        }
        
        // 2. Physics Material
        albedo = uWaterColor;
        roughness = uWaterRoughness;
        
        // 3. Fake Depth Absorption (Fresnel darken)
        // Darken albedo when looking straight down (deep water)
        // Lighten at grazing angles
        float viewAngle = max(0.0, dot(normal, normalize(uCameraPosition - p)));
        albedo *= mix(0.4, 1.0, 1.0 - viewAngle);
    }
}
`;

const WATER_GLSL_STUBS = `
float mapWater(vec3 p) { return 1e10; }
void applyWaterMaterial(inout vec3 albedo, inout float roughness, inout vec3 normal, vec3 p) {}
`;

export const WaterPlaneFeature: FeatureDefinition = {
    id: 'waterPlane',
    shortId: 'wp',
    name: 'Water Plane',
    category: 'Scene',
    engineConfig: {
        toggleParam: 'waterEnabled',
        mode: 'compile',
        label: 'Water Plane',
        groupFilter: 'engine_settings'
    },
    params: {
        // --- MASTER SWITCH (Compile Time) ---
        waterEnabled: {
            type: 'boolean', default: false, label: 'Enable Water', shortId: 'we', group: 'engine_settings',
            onUpdate: 'compile', noReset: true, hidden: true
        },
        
        // --- RUNTIME SWITCH ---
        active: { type: 'boolean', default: true, label: 'Visible', shortId: 'on', uniform: 'uWaterActive', group: 'main', condition: { param: 'waterEnabled', bool: true }, noReset: true },
        
        height: { type: 'float', default: -2.0, label: 'Height (Y)', shortId: 'ht', uniform: 'uWaterHeight', min: -10.0, max: 10.0, step: 0.01, group: 'geometry', condition: { param: 'active', bool: true } },
        color: { type: 'color', default: new THREE.Color('#001133'), label: 'Water Color', shortId: 'cl', uniform: 'uWaterColor', group: 'material', condition: { param: 'active', bool: true } },
        roughness: { type: 'float', default: 0.02, label: 'Roughness', shortId: 'ro', uniform: 'uWaterRoughness', min: 0.0, max: 1.0, step: 0.01, group: 'material', condition: { param: 'active', bool: true } },
        waveStrength: { type: 'float', default: 0.1, label: 'Wave Height', shortId: 'ws', uniform: 'uWaterWaveStrength', min: 0.0, max: 1.5, step: 0.001, group: 'waves', condition: { param: 'active', bool: true } },
        waveSpeed: { type: 'float', default: 1.0, label: 'Wave Speed', shortId: 'wv', uniform: 'uWaterWaveSpeed', min: 0.0, max: 5.0, step: 0.1, group: 'waves', condition: [{ param: 'active', bool: true }, { param: 'waveStrength', gt: 0.0 }] },
        waveFrequency: { type: 'float', default: 1.5, label: 'Wave Freq', shortId: 'wf', uniform: 'uWaterWaveFreq', min: 0.1, max: 10.0, step: 0.1, group: 'waves', condition: [{ param: 'active', bool: true }, { param: 'waveStrength', gt: 0.0 }] }
    },
    inject: (builder, config, variant) => {
        const state = config.waterPlane as WaterPlaneState;
        
        // CONDITIONAL COMPILATION:
        if (state && state.waterEnabled && variant === 'Main') {
            builder.addDefine('WATER_ENABLED', '1');
            builder.addFunction(WATER_GLSL_FUNCS);
        } else {
            // Inject Stubs to satisfy function calls in de.ts / material_eval.ts
            builder.addFunction(WATER_GLSL_STUBS);
        }
    }
};
