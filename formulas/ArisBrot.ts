
import { FractalDefinition } from '../types';

export const ArisBrot: FractalDefinition = {
    id: 'ArisBrot',
    name: 'ArisBrot',
    shortDescription: "Dr. Aris's V2.0 Hybrid. Features Domain Warping, KIFS folds, and Bulb Power.",
    description: "Dr. Aris's V2.0 Hybrid. Now features a dedicated Power parameter alongside Reality Warp and Shear.",
    
    shader: {
        function: `
    void formula_ArisBrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // 1. DOMAIN WARPING (The "Reality Warp") - Param C
        // Twist space based on Z-depth.
        float warpStrength = uParamC;
        if (abs(warpStrength) > 0.001) {
            float angle = z3.z * warpStrength * 0.5 + uParamF; // Add Phase shift F
            float s = sin(angle);
            float c_ = cos(angle);
            z3.xy = mat2(c_, -s, s, c_) * z3.xy;
        }

        // 2. KALEIDOSCOPIC FOLD (The Crystal)
        // Fold space across diagonal planes
        z3 = abs(z3);
        if (z3.x < z3.y) z3.xy = z3.yx;
        if (z3.x < z3.z) z3.xz = z3.zx;
        if (z3.y < z3.z) z3.yz = z3.zy;
        
        // 3. SPHERICAL INVERSION (The Void) - Param D
        float r2 = dot(z3, z3);
        float minR = 0.5;
        float fixedR = max(uParamD, 0.1); 
        
        if (r2 < minR) {
            float factor = fixedR / minR;
            z3 *= factor;
            dr *= factor;
        } else if (r2 < fixedR) {
            float factor = fixedR / r2;
            z3 *= factor;
            dr *= factor;
        }

        // 4. SCALE & TRANSLATE - Param A
        float scale = uParamA;
        z3 = z3 * scale - vec3(uParamE * (scale - 1.0)); // Param E is Offset/Shear magnitude
        dr = dr * abs(scale) + 1.0;

        // 5. POWER BULB INJECTION - Param B (The "Power")
        // This makes it a true hybrid.
        float r = length(z3);
        if (r > 1.0e-4) {
            float power = uParamB;
            // Derivative chain rule
            dr = pow(r, power - 1.0) * power * dr + 1.0;
            
            float theta = acos(clamp(z3.z / r, -1.0, 1.0));
            float phi = atan(z3.y, z3.x);
            float zr = pow(r, power);
            
            theta *= power;
            phi *= power;
            
            z3 = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        }

        // 6. INJECTION
        if (uJuliaMode > 0.5) {
            z3 += c.xyz;
        } else {
            z3 += c.xyz;
        }

        z.xyz = z3;
        
        // Trap: mix of geometric (box) and organic (sphere)
        trap = min(trap, min(length(z3), max(abs(z3.x), max(abs(z3.y), abs(z3.z)))));
    }`,
        loopBody: `formula_ArisBrot(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Scale (KIFS)', id: 'paramA', min: 1.5, max: 4.0, step: 0.001, default: 2.25 },
        { label: 'Power (Bulb)', id: 'paramB', min: 1.0, max: 16.0, step: 0.01, default: 2.0 },
        { label: 'Reality Warp', id: 'paramC', min: -2.0, max: 2.0, step: 0.001, default: 0.5 },
        { label: 'Void Radius', id: 'paramD', min: 0.5, max: 3.0, step: 0.001, default: 1.45 },
        { label: 'Offset / Shear', id: 'paramE', min: 0.0, max: 2.0, step: 0.001, default: 0.85 },
        { label: 'Warp Phase', id: 'paramF', min: 0.0, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
    ],

    defaultPreset: {
        version: 5,
        name: "Custom Preset",
        formula: "ArisBrot",
        features: {
          atmosphere: {
            fogColor: "#050510",
            fogNear: 0.0001,
            fogFar: 501.18723362727246,
            fogDensity: 0,
            glowIntensity: 0.09945726218577258,
            glowSharpness: 4,
            glowMode: false,
            glowColor: "#ffffff",
            aoIntensity: 0,
            aoSpread: 0.283706966406409,
            aoMode: false
          },
          droste: {
            active: false,
            tiling: 1,
            center: {
              x: 0,
              y: 0
            },
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
            diffuse: 0.99,
            reflection: 0.6,
            specular: 1.2,
            roughness: 0.3,
            rim: 0,
            rimExponent: 3,
            envStrength: 0,
            envMapVisible: false,
            envBackgroundStrength: 1,
            envSource: 1,
            useEnvMap: false,
            envRotation: 0,
            envGradientStops: [],
            emission: 0.024378546022433615,
            emissionMode: 0,
            emissionColor: "#ffffff",
            ptEmissionMult: 1
          },
          colorGrading: {
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
            offset: {
              x: 0,
              y: 0
            }
          },
          coloring: {
            gradient: [
              {
                id: "1",
                position: 0,
                color: "#000000"
              },
              {
                id: "2",
                position: 0.2,
                color: "#220044"
              },
              {
                id: "3",
                position: 0.45,
                color: "#00ccff"
              },
              {
                id: "4",
                position: 0.6,
                color: "#ffffff"
              },
              {
                id: "5",
                position: 0.8,
                color: "#ff0088"
              },
              {
                id: "6",
                position: 1,
                color: "#220044"
              }
            ],
            mode: 0,
            scale: 2.0833333333333335,
            offset: 0,
            repeats: 2.5,
            phase: 0,
            bias: 1,
            twist: 0,
            escape: 2,
            gradient2: [
              {
                id: "1",
                position: 0,
                color: "#000000"
              },
              {
                id: "2",
                position: 1,
                color: "#ffffff"
              }
            ],
            mode2: 5,
            scale2: 1,
            offset2: 0,
            repeats2: 1,
            phase2: 0.69,
            bias2: 1,
            twist2: 0,
            blendMode: 3,
            blendOpacity: 0.3,
            layer3Color: "#ffffff",
            layer3Scale: 15,
            layer3Strength: 0,
            layer3Bump: 0,
            layer3Turbulence: 0
          },
          geometry: {
            juliaMode: false,
            juliaX: -0.37,
            juliaY: -0.16,
            juliaZ: -0.02,
            hybridMode: false,
            hybridIter: 2,
            hybridScale: 1.14,
            hybridMinR: 0.5,
            hybridFixedR: 1,
            hybridFoldLimit: 1,
            hybridSkip: 1,
            hybridAddC: false
          },
          quality: {
            fudgeFactor: 0.8,
            detail: 0.8,
            pixelThreshold: 0.5,
            maxSteps: 300,
            estimator: 4.0 // Linear (2.0)
          },
          coreMath: {
            iterations: 7,
            paramA: 2,
            paramB: 1.061,
            paramC: 2,
            paramD: 1.236,
            paramE: 0.618,
            paramF: 0
          },
          lighting: {
            shadows: true,
            shadowSoftness: 24,
            shadowIntensity: 0.8,
            shadowBias: 0.001,
            ptBounces: 3,
            ptGIStrength: 1,
            ptStochasticShadows: false
          },
          optics: {
            camType: 0,
            camFov: 60,
            orthoScale: 2,
            dofStrength: 0,
            dofFocus: 2.8747377395629883
          }
        },
        cameraPos: { x: 1.4388761158360055, y: 1.4657884937852592, z: 2.8339194792307407 },
        cameraRot: { x: -0.12087634947347892, y: 0.283801459206713, z: 0.36341975729641146, w: 0.8790743540205932 },
        sceneOffset: { x: -1, y: 0, z: 1, xL: -0.2357778754965203, yL: -0.45934971767267063, zL: -0.7101331675294089 },
        targetDistance: 2.6880587339401245,
        cameraMode: "Orbit",
        lights: [
          {
            type: 'Point',
            position: { x: -0.17107759854656118, y: 0.9929766175094275, z: 1.7793549614211224 },
            rotation: { x: 0, y: 0, z: 0 },
            color: "#ccffff",
            intensity: 1.5,
            falloff: 0.5,
            falloffType: "Quadratic",
            fixed: false,
            visible: true,
            castShadow: true
          },
          {
            type: 'Point',
            position: { x: -3, y: 0, z: -1 },
            rotation: { x: 0, y: 0, z: 0 },
            color: "#ff00aa",
            intensity: 2,
            falloff: 0.8,
            falloffType: "Quadratic",
            fixed: false,
            visible: false,
            castShadow: false
          },
          {
            type: 'Point',
            position: { x: 0, y: -4, z: 1 },
            rotation: { x: 0, y: 0, z: 0 },
            color: "#0022aa",
            intensity: 0.8,
            falloff: 0.2,
            falloffType: "Linear",
            fixed: true,
            visible: true,
            castShadow: false
          }
        ],
        renderMode: "Direct",
        navigation: {
          flySpeed: 0.5,
          autoSlow: true
        },
        animations: [
          {
            id: "4yFFplV3QPo3KoNaGJwfX",
            enabled: false,
            target: "coreMath.paramA",
            shape: "Sine",
            period: 5,
            amplitude: 1,
            baseValue: 2,
            phase: 0,
            smoothing: 0.5,
            pulseWidth: 0.5
          }
        ],
        sequence: {
          durationFrames: 300,
          fps: 30,
          tracks: {}
        },
        duration: 300
    }
};
