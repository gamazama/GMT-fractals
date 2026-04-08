
import { FractalDefinition } from '../types';

// Claude — A Harmonic Resonance Fractal
//
// The golden ratio φ is the mathematical soul of this fractal:
//   • Icosahedral fold normals — three reflection planes from φ-geometry
//   • Harmonic fold — a 4th reflection plane swept around the golden axis (1,φ,0)
//   • Sphere inversion — recursive depth with clamped Mandelbox-style fold
//
// The "harmonic" is the key innovation: a parametrically-controlled 4th fold
// whose orientation sweeps around an icosahedral vertex axis. Like an overtone
// enriching a fundamental frequency, it adds complexity to the icosahedral base
// without disrupting its coherence.

export const Claude: FractalDefinition = {
    id: 'Claude',
    name: 'Claude',
    shortDescription: 'Harmonic resonance IFS — icosahedral folds with parametric 4th reflection plane.',
    description: 'Icosahedral reflection folds (golden-ratio normals) + a parametric "harmonic" fold (4th plane swept around the golden axis) + clamped sphere inversion. The harmonic fold is unique to this formula — it enriches the icosahedral base like an overtone enriches a fundamental tone. φ appears in fold geometry, harmonic axis, and default parameters.',
    juliaType: 'offset',

    shader: {
        preamble: `
    // Golden ratio and icosahedral fold normals
    // Declared as non-const globals — GLSL ES 3.0 does not permit built-in functions
    // (sqrt, normalize) in constant expressions. Values are computed in Claude_precalc().
    float claude_Phi;
    vec3 claude_n1;
    vec3 claude_n2;
    vec3 claude_n3;
    vec3 claude_goldenAxis;

    // Harmonic fold normal (4th plane, computed once per frame via Rodrigues)
    vec3 uCl_n4;
    bool uCl_doHarmonic;

    void Claude_precalc() {
        // Compute golden ratio and icosahedral normals
        claude_Phi = (1.0 + sqrt(5.0)) * 0.5;
        claude_n1 = normalize(vec3(-1.0, claude_Phi - 1.0, 1.0 / (claude_Phi - 1.0)));
        claude_n2 = normalize(vec3(claude_Phi - 1.0, 1.0 / (claude_Phi - 1.0), -1.0));
        claude_n3 = normalize(vec3(1.0 / (claude_Phi - 1.0), -1.0, claude_Phi - 1.0));
        claude_goldenAxis = normalize(vec3(1.0, claude_Phi, 0.0));

        // Harmonic fold normal defaults to n3
        uCl_n4 = claude_n3;
        uCl_doHarmonic = false;

        // Harmonic: rotate n3 around golden axis by paramB (Rodrigues formula)
        float h = uParamB;
        if (abs(h) > 0.001) {
            uCl_doHarmonic = true;
            float ch = cos(h), sh = sin(h);
            float dk = dot(claude_goldenAxis, claude_n3);
            uCl_n4 = claude_n3 * ch
                   + cross(claude_goldenAxis, claude_n3) * sh
                   + claude_goldenAxis * dk * (1.0 - ch);
        }
        // Note: gmt_precalcRodrigues(uVec3B) is called separately from loopInit —
        // preamble functions are assembled before shared transforms, so calling it
        // here would cause a "no matching overloaded function" error.
    }`,

        function: `
    void formula_Claude(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // 1. Pre-fold rotation (shared Rodrigues, vec3B)
        gmt_applyRodrigues(p);

        // 2. Icosahedral fold — three golden-ratio reflection normals
        p -= 2.0 * min(0.0, dot(p, claude_n1)) * claude_n1;
        p -= 2.0 * min(0.0, dot(p, claude_n2)) * claude_n2;
        p -= 2.0 * min(0.0, dot(p, claude_n3)) * claude_n3;

        // 3. Harmonic fold — 4th reflection plane at golden-axis angle
        if (uCl_doHarmonic) {
            p -= 2.0 * min(0.0, dot(p, uCl_n4)) * uCl_n4;
        }

        // 4. Sphere inversion (clamped Mandelbox-style)
        float r2 = max(dot(p, p), 1e-10);
        float minR2 = uParamC;
        float fixR2 = uParamD;
        float sphereK = clamp(fixR2 / r2, 1.0, fixR2 / max(minR2, 1e-10));
        p *= sphereK;
        dr *= sphereK;

        // 5. IFS scale + offset
        float scale = uParamA;
        p = p * scale - uVec3A * (scale - 1.0);
        dr *= abs(scale);

        // 6. Twist (position-dependent spiral)
        if (abs(uParamF) > 0.001) {
            float ang = p.y * uParamF;
            float s = sin(ang), co = cos(ang);
            p.xz = mat2(co, -s, s, co) * p.xz;
        }

        if (uJuliaMode > 0.5) p += c.xyz;

        z.xyz = p;
        trap = min(trap, length(p));
    }`,

        loopBody: `formula_Claude(z, dr, trap, c);`,
        loopInit: `Claude_precalc(); gmt_precalcRodrigues(uVec3B);`,
        preambleVars: ['uCl_n4', 'uCl_doHarmonic'],
        usesSharedRotation: true,
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 3.5, step: 0.001, default: 2.0 },
        { label: 'Harmonic', id: 'paramB', min: -3.14, max: 3.14, step: 0.001, default: 0.61 },
        { label: 'Inner R²', id: 'paramC', min: 0.001, max: 1.5, step: 0.001, default: 0.25 },
        { label: 'Fix R²', id: 'paramD', min: 0.1, max: 2.5, step: 0.001, default: 1.0 },
        { label: 'Offset', id: 'vec3A', type: 'vec3', min: -3.0, max: 3.0, step: 0.001, default: { x: 1, y: 1, z: 1 }, linkable: true },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "Claude",
        features: {
            coreMath: {
                iterations: 12,
                paramA: 2.0,
                paramB: 0.61,
                paramC: 0.25,
                paramD: 1.0,
                paramF: 0,
                vec3A: { x: 1, y: 1, z: 1 },
                vec3B: { x: 0, y: 0, z: 0 }
            },
            coloring: {
                mode: 0, // Trap
                repeats: 1, phase: 0.12, scale: 7.8, offset: 1.4, bias: 1.3, twist: 0, escape: 2.5,
                mode2: 4, // Angle
                repeats2: 2, phase2: 0.1, blendMode: 2, blendOpacity: 0.25, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 60, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0, layer3Enabled: true,
                gradient: [
                    { id: "cl_0", position: 0,    color: "#1B0A0F", bias: 0.5, interpolation: "linear" },
                    { id: "cl_1", position: 0.13, color: "#4A1A0A", bias: 0.5, interpolation: "linear" },
                    { id: "cl_2", position: 0.28, color: "#C4603A", bias: 0.5, interpolation: "linear" },
                    { id: "cl_3", position: 0.42, color: "#E8A44A", bias: 0.5, interpolation: "linear" },
                    { id: "cl_4", position: 0.56, color: "#F5E6D3", bias: 0.5, interpolation: "linear" },
                    { id: "cl_5", position: 0.70, color: "#4A8B7A", bias: 0.5, interpolation: "linear" },
                    { id: "cl_6", position: 0.85, color: "#2B3A5A", bias: 0.5, interpolation: "linear" },
                    { id: "cl_7", position: 1,    color: "#0F0A1B", bias: 0.5, interpolation: "linear" }
                ],
                gradient2: [
                    { id: "cl2_0", position: 0,   color: "#F5E6D3", bias: 0.5, interpolation: "linear" },
                    { id: "cl2_1", position: 0.5, color: "#C4603A", bias: 0.5, interpolation: "linear" },
                    { id: "cl2_2", position: 1,   color: "#1B0A0F", bias: 0.5, interpolation: "linear" }
                ]
            },
            ao: { aoIntensity: 0.38, aoSpread: 0.12, aoSamples: 5, aoEnabled: true, aoMode: false },
            atmosphere: {
                fogNear: 0, fogFar: 12, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.004, glowSharpness: 4.5, glowColor: "#E8A44A", glowMode: false
            },
            materials: {
                diffuse: 1.15, reflection: 0.12, specular: 1.1, roughness: 0.32,
                rim: 0.18, rimExponent: 4.5, envStrength: 0.45, envBackgroundStrength: 0.22,
                envSource: 1, useEnvMap: false, envRotation: 0,
                emission: 0, emissionMode: 0, emissionColor: "#ffffff",
                envGradientStops: [
                    { id: "env_0", position: 0,    color: "#0A0E1B", bias: 0.5, interpolation: "linear" },
                    { id: "env_1", position: 0.3,  color: "#3A2A1B", bias: 0.5, interpolation: "linear" },
                    { id: "env_2", position: 0.5,  color: "#C4A87A", bias: 0.5, interpolation: "linear" },
                    { id: "env_3", position: 0.72, color: "#7AACCC", bias: 0.5, interpolation: "linear" },
                    { id: "env_4", position: 1,    color: "#B4D4E8", bias: 0.5, interpolation: "linear" }
                ]
            },
            geometry: { juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0, hybridMode: false },
            lighting: { advancedLighting: true, ptEnabled: true, shadows: true, shadowSoftness: 28, shadowIntensity: 1, shadowBias: 0.001 },
            quality: { detail: 3, fudgeFactor: 0.7, pixelThreshold: 0.3, maxSteps: 400, distanceMetric: 1, estimator: 0 },
            optics: { camFov: 40, dofStrength: 0, dofFocus: 2.5 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.18, y: -0.42, z: -0.08, w: 0.89 },
        cameraFov: 40,
        sceneOffset: { x: 1, y: 1, z: 1, xL: 0, yL: 0, zL: 0 },
        targetDistance: 3.8,
        cameraMode: "Orbit",
        lights: [
            { type: 'Point', position: { x: -0.8, y: 3.2, z: 3.5 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFE4CC", intensity: 6, falloff: 0, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 3.5, y: -0.5, z: 1.5 }, rotation: { x: 0, y: 0, z: 0 }, color: "#4A8BCC", intensity: 2.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: true, castShadow: false },
            { type: 'Point', position: { x: 1, y: 1, z: -2 }, rotation: { x: 0, y: 0, z: 0 }, color: "#FFBE8A", useTemperature: true, temperature: 3200, intensity: 1.5, falloff: 0, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ]
    }
};
