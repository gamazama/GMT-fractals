
import { FractalDefinition } from '../types';

export const Dodecahedron: FractalDefinition = {
    id: 'Dodecahedron',
    name: 'Dodecahedron',
    shortDescription: 'Kaleidoscopic IFS with dodecahedral symmetry (Knighty).',
    description: 'Kaleidoscopic IFS fractal with true dodecahedral symmetry using 3 golden-ratio reflection normals. Based on Knighty\'s method: 3 normals × 3 reflections = 9 fold operations per iteration, producing the icosahedral/dodecahedral reflection group. Supports rotation, twist, and shift.',

    shader: {
        preamble: `
    // Dodecahedron: Pre-calculated golden-ratio normals and rotation (computed once per frame)
    // Reference: Syntopia/Knighty Kaleidoscopic IFS
    const float dodeca_Phi = (1.0 + sqrt(5.0)) * 0.5; // golden ratio 1.618...
    const vec3 dodeca_n1 = normalize(vec3(-1.0, dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0)));
    const vec3 dodeca_n2 = normalize(vec3(dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0), -1.0));
    const vec3 dodeca_n3 = normalize(vec3(1.0 / (dodeca_Phi - 1.0), -1.0, dodeca_Phi - 1.0));

    vec3 uDodeca_rotAxis = vec3(0.0, 1.0, 0.0);
    float uDodeca_rotCos = 1.0;
    float uDodeca_rotSin = 0.0;

    void Dodecahedron_precalcRotation() {
        if (abs(uVec3B.z) > 0.001) {
            float azimuth = uVec3B.x;
            float pitch = uVec3B.y;
            float rotAngle = uVec3B.z * 0.5;
            float cosPitch = cos(pitch);
            uDodeca_rotAxis = vec3(
                cosPitch * sin(azimuth),
                sin(pitch),
                cosPitch * cos(azimuth)
            );
            uDodeca_rotSin = sin(rotAngle);
            uDodeca_rotCos = cos(rotAngle);
        }
    }`,
        function: `
    void formula_Dodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = z3.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        // Vec3B: Rotation using pre-calculated values (no trig in loop)
        if (abs(uVec3B.z) > 0.001) {
            z3 = z3 * uDodeca_rotCos + cross(uDodeca_rotAxis, z3) * uDodeca_rotSin
                 + uDodeca_rotAxis * dot(uDodeca_rotAxis, z3) * (1.0 - uDodeca_rotCos);
        }

        // 3 normals × 3 repetitions = 9 fold operations (true dodecahedral symmetry)
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n1)) * dodeca_n1;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n2)) * dodeca_n2;
        z3 -= 2.0 * min(0.0, dot(z3, dodeca_n3)) * dodeca_n3;

        // Scale and offset
        float scale = uParamA;
        vec3 offset = vec3(uParamB * (scale - 1.0));

        // Vec3A: Shift
        offset -= uVec3A;

        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;

        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,
        loopBody: `formula_Dodecahedron(z, dr, trap, c);`,
        loopInit: `Dodecahedron_precalcRotation();`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 0.5, max: 4.0, step: 0.001, default: 2.618 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28, step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
        { label: 'Shift', id: 'vec3A', type: 'vec3', min: -2.0, max: 2.0, step: 0.01, default: { x: 0, y: 0, z: 0 } },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        formula: "Dodecahedron",
        features: {
            coreMath: { iterations: 30, paramA: 2.618, paramB: 1.0, paramF: 0, vec3A: { x: 0, y: 0, z: 0 }, vec3B: { x: 0, y: 0, z: 0 } },
            coloring: {
                mode: 0, // Trap
                repeats: 2.63, phase: 0.42, scale: 2.63, offset: 0.42, bias: 1, twist: 0, escape: 2,
                mode2: 5, // Normal
                repeats2: 1, phase2: 0, blendMode: 2, blendOpacity: 1, twist2: 0,
                layer3Color: "#ffffff", layer3Scale: 89, layer3Strength: 0, layer3Bump: 0, layer3Turbulence: 0,
                gradient: [
                    { id: "0", position: 0, color: "#331a00" },
                    { id: "1", position: 0.5, color: "#cc8800" },
                    { id: "2", position: 1, color: "#ffeeaa" }
                ],
                gradient2: [
                    { id: "1", position: 0.61, color: "#FFFFFF" },
                    { id: "2", position: 0.88, color: "#FF0505" }
                ]
            },
            texturing: { active: false, scaleX: 4, scaleY: 24, offset: {x:-0.02,y:-0.08}, mapU: 6, mapV: 8, layer1Data: null },
            materials: {
                reflection: 0.4, specular: 2, roughness: 0.51, diffuse: 2, envStrength: 0,
                rim: 0.03, rimExponent: 4.5, emission: 0.009, emissionColor: "#ffffff", emissionMode: 0,
                envMapVisible: false, envSource: 1, useEnvMap: true, envRotation: 0,
                envGradientStops: [{ id: "0", position: 0.03, color: "#130606" }, { id: "1", position: 0.14, color: "#463434" }, { id: "2", position: 0.41, color: "#824040" }, { id: "3", position: 0.68, color: "#BCBCBC" }, { id: "4", position: 1, color: "#875656" }]
            },
            atmosphere: {
                fogNear: 0.0001, fogFar: 501, fogColor: "#000000", fogDensity: 0,
                glowIntensity: 0.005, glowSharpness: 19, glowColor: "#ffffff", glowMode: false,
                aoIntensity: 0, aoSpread: 0.1
            },
            lighting: { shadows: true, shadowSoftness: 538, shadowIntensity: 1, shadowBias: 0 },
            quality: { detail: 2.4, fudgeFactor: 0.47, pixelThreshold: 0.5, maxSteps: 300, aaMode: "Auto", aaLevel: 1, estimator: 1.0 }, // Linear (Unit 1.0) = (r-1)/dr — correct for IFS
            colorGrading: { saturation: 1, levelsMin: 0, levelsMax: 1, levelsGamma: 1 },
            geometry: { juliaMode: false, juliaX: 0.04, juliaY: -0.12, juliaZ: -0.24, hybridMode: false, hybridIter: 2, hybridScale: 2, hybridMinR: 0.5, hybridFixedR: 1, hybridFoldLimit: 1 },
            optics: { dofStrength: 0, dofFocus: 1.515 }
        },
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.23397578924576956, y: 0.28304121464362475, z: 0.5229543398514255, w: 0.7691955273468777 },
        cameraFov: 60,
        sceneOffset: { x: 2, y: 3, z: 4, xL: -0.5556107642317095, yL: 0.3332098113554696, zL: -0.042659161564751066 },
        targetDistance: 2.637,
        cameraMode: "Fly",
        lights: [
            { type: 'Point', position: { x: -1.4194299271962965, y: -0.6167022395401724, z: 3.6185548096036646 }, rotation: { x: 0, y: 0, z: 0 }, color: "#99A4FF", intensity: 500, falloff: 6.4, falloffType: "Quadratic", fixed: false, visible: true, castShadow: true },
            { type: 'Point', position: { x: 0.05, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#ff0000", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false },
            { type: 'Point', position: { x: 0.25, y: 0.075, z: -0.1 }, rotation: { x: 0, y: 0, z: 0 }, color: "#0000ff", intensity: 0.5, falloff: 0.5, falloffType: "Quadratic", fixed: false, visible: false, castShadow: false }
        ],
        animations: [
            { id: "4yFFplV3QPo3KoNaGJwfX", enabled: false, target: "coreMath.paramA", shape: "Sine", period: 5, amplitude: 1, baseValue: 2.618, phase: 0, smoothing: 0.5 }
        ]
    }
};
