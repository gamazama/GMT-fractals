
import { FractalDefinition } from '../types';

export const Phoenix: FractalDefinition = {
    id: 'Phoenix',
    name: 'Phoenix',
    shortDescription: 'Iterates based on previous value (z_n-1). Creates flowing, taffy-like distortions.',
    description: 'A 3D generalization of the Phoenix Julia set. Now with Z-stretching and spatial twisting.',
    
    shader: {
        function: `
        void formula_Phoenix(inout vec4 z, inout float dr, inout float trap, vec4 c, inout vec4 z_prev, inout float dr_prev) {
            vec3 z3 = z.xyz;
            vec3 zp3 = z_prev.xyz;
            
            // Param E: Z Stretch/Scale
            if (abs(uParamE - 1.0) > 0.001) {
                z3.z *= uParamE;
                dr *= uParamE;
            }
            
            // Param F: Twist
            if (abs(uParamF) > 0.001) {
                float ang = z3.z * uParamF;
                float s = sin(ang); float co = cos(ang);
                z3.xy = mat2(co, -s, s, co) * z3.xy;
            }

            float power = uParamA;
            float kReal = uParamB;
            float kImag = uParamC;
            float hPower = uParamD;
            
            vec3 z_new_part = bulbPow(z3, power);
            
            vec3 z_prev_part;
            bool isLinearHistory = abs(hPower - 1.0) < 0.001;
            
            if (isLinearHistory) {
                z_prev_part = zp3;
            } else {
                z_prev_part = bulbPow(zp3, hPower);
            }
            
            vec3 historyTerm;
            historyTerm.x = z_prev_part.x * kReal - z_prev_part.y * kImag;
            historyTerm.y = z_prev_part.x * kImag + z_prev_part.y * kReal;
            historyTerm.z = z_prev_part.z * kReal;
            
            vec3 z_next = z_new_part + c.xyz + historyTerm;
            
            float r = length(z3);
            float rp = length(zp3);
            float safeR = max(r, 1.0e-5);
            float safeRp = max(rp, 1.0e-5);
            
            float dr_pow = power * pow(safeR, power - 1.0);
            
            float kMag = length(vec2(kReal, kImag));
            float dr_hist = kMag;
            
            if (!isLinearHistory) {
                 dr_hist *= hPower * pow(safeRp, hPower - 1.0);
            }
            
            float dc = (uJuliaMode > 0.5) ? 0.0 : 1.0;
            float dr_next = dr_pow * dr + dr_hist * dr_prev + dc;
            
            z_prev = vec4(z3, 0.0); 
            dr_prev = dr;
            
            z.xyz = z_next;
            dr = dr_next;
            
            trap = min(trap, dot(z, z));
        }`,
        loopBody: `formula_Phoenix(z, dr, trap, c, z_prev, dr_prev);`,
        loopInit: `
        vec4 z_prev = vec4(0.0);
        float dr_prev = 0.0;
        `
    },

    parameters: [
        { label: 'Power (p)', id: 'paramA', min: 1.5, max: 12.0, step: 0.01, default: 2.0 },
        { label: 'Distortion Real', id: 'paramB', min: -1.5, max: 1.5, step: 0.001, default: -0.5 },
        { label: 'Distortion Imag', id: 'paramC', min: -1.5, max: 1.5, step: 0.001, default: 0.0 },
        { label: 'History Exp', id: 'paramD', min: 0.0, max: 3.0, step: 0.01, default: 1.0 },
        { label: 'Z Stretch', id: 'paramE', min: 0.1, max: 3.0, step: 0.01, default: 1.0 },
        { label: 'Twist', id: 'paramF', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
      "version": 5,
      "name": "Custom Preset",
      "formula": "Phoenix",
      "features": {
        "atmosphere": {
          "fogColor": "#1b1e24",
          "fogNear": 0.0001,
          "fogFar": 501.18723362727246,
          "glowIntensity": 0.0001,
          "glowSharpness": 825,
          "glowMode": false,
          "glowColor": "#ffffff",
          "aoIntensity": 0.37,
          "aoSpread": 0.16407786639505306,
          "aoMode": false
        },
        "droste": {
          "active": false,
          "tiling": 1,
          "center": {
            "x": 0,
            "y": 0
          },
          "radiusInside": 5,
          "radiusOutside": 100,
          "periodicity": 2,
          "strands": 2,
          "autoPeriodicity": false,
          "strandMirror": false,
          "zoom": 0,
          "rotate": 0,
          "rotateSpin": 0,
          "rotatePolar": 0,
          "twist": true,
          "hyperDroste": false,
          "fractalPoints": 1
        },
        "materials": {
          "diffuse": 0.94,
          "reflection": 0,
          "specular": 0.3,
          "roughness": 0.4,
          "rim": 0,
          "rimExponent": 4,
          "envStrength": 0,
          "envMapVisible": false,
          "envBackgroundStrength": 1,
          "envSource": 1,
          "useEnvMap": false,
          "envRotation": 0,
          "envGradientStops": [],
          "emission": 0.5805252310662089,
          "emissionMode": 0,
          "emissionColor": "#ffffff",
          "ptEmissionMult": 1
        },
        "colorGrading": {
          "saturation": 1,
          "levelsMin": 0,
          "levelsMax": 1,
          "levelsGamma": 1
        },
        "texturing": {
          "active": false,
          "layer1Data": null,
          "mapU": 6,
          "mapV": 1,
          "scaleX": 1,
          "scaleY": 1,
          "offset": {
            "x": 0,
            "y": 0
          }
        },
        "coloring": {
          "gradient": [
            {
              "id": "1766223988966_0",
              "position": 0,
              "color": "#5F4690",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_1",
              "position": 0.091,
              "color": "#1D6996",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_2",
              "position": 0.182,
              "color": "#38A6A5",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_3",
              "position": 0.273,
              "color": "#0F8554",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_4",
              "position": 0.364,
              "color": "#73AF48",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_5",
              "position": 0.455,
              "color": "#EDAD08",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_6",
              "position": 0.545,
              "color": "#E17C05",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_7",
              "position": 0.636,
              "color": "#CC503E",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_8",
              "position": 0.727,
              "color": "#94346E",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_9",
              "position": 0.818,
              "color": "#6F4070",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_10",
              "position": 0.909,
              "color": "#994E95",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766223988966_11",
              "position": 1,
              "color": "#666666",
              "bias": 0.5,
              "interpolation": "linear"
            }
          ],
          "mode": 0,
          "scale": 2.31040486583382,
          "offset": 0.272461575792784,
          "repeats": 1,
          "phase": 0,
          "bias": 0.9,
          "twist": 0,
          "escape": 4,
          "gradient2": [
            {
              "id": "1766224725875_0",
              "position": 0,
              "color": "#5F4690",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_1",
              "position": 0.091,
              "color": "#1D6996",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_2",
              "position": 0.182,
              "color": "#38A6A5",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_3",
              "position": 0.273,
              "color": "#0F8554",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_4",
              "position": 0.364,
              "color": "#73AF48",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_5",
              "position": 0.455,
              "color": "#EDAD08",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_6",
              "position": 0.545,
              "color": "#E17C05",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_7",
              "position": 0.636,
              "color": "#CC503E",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_8",
              "position": 0.727,
              "color": "#94346E",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_9",
              "position": 0.818,
              "color": "#6F4070",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_10",
              "position": 0.909,
              "color": "#994E95",
              "bias": 0.5,
              "interpolation": "linear"
            },
            {
              "id": "1766224725875_11",
              "position": 1,
              "color": "#666666",
              "bias": 0.5,
              "interpolation": "linear"
            }
          ],
          "mode2": 6,
          "scale2": 1,
          "offset2": 0,
          "repeats2": 1,
          "phase2": 0,
          "bias2": 1,
          "twist2": 0,
          "blendMode": 3,
          "blendOpacity": 1,
          "layer3Color": "#ffffff",
          "layer3Scale": 245.44021169935067,
          "layer3Strength": 0,
          "layer3Bump": 0.3,
          "layer3Turbulence": 0.65
        },
        "geometry": {
          "juliaMode": true,
          "juliaX": 0.17,
          "juliaY": 0.36,
          "juliaZ": 0.06,
          "hybridMode": false,
          "hybridIter": 2,
          "hybridScale": 2,
          "hybridMinR": 0.5,
          "hybridFixedR": 1,
          "hybridFoldLimit": 1,
          "hybridSkip": 1,
          "hybridAddC": false
        },
        "quality": {
          "fudgeFactor": 0.4,
          "detail": 1,
          "pixelThreshold": 0.5,
          "maxSteps": 300
        },
        "coreMath": {
          "iterations": 31,
          "paramA": 10.777,
          "paramB": 0.503,
          "paramC": 0.961,
          "paramD": 0.87,
          "paramE": 1,
          "paramF": 0
        },
        "lighting": {
          "shadows": true,
          "shadowSoftness": 102.8,
          "shadowIntensity": 1,
          "shadowBias": 0.002,
          "ptBounces": 3,
          "ptGIStrength": 1,
          "ptStochasticShadows": false
        },
        "optics": {
          "camType": 0,
          "camFov": 58,
          "orthoScale": 2,
          "dofStrength": 0.0003512919517238997,
          "dofFocus": 0.37963494658470154
        }
      },
      "cameraPos": {
        "x": 0.8764067264947826,
        "y": -1.880624433031201,
        "z": 2.8187165504251803
      },
      "cameraRot": {
        "x": 0.08697694591956645,
        "y": 0.2996017656166646,
        "z": -0.7151373197868851,
        "w": 0.6255017240311274
      },
      "sceneOffset": {
        "x": 0.2456940859556198,
        "y": 1.1121561974287033,
        "z": -2.6141974329948425,
        "xL": -0.8764067217464274,
        "yL": 0.8806244298182395,
        "zL": -0.8187165546163797
      },
      "targetDistance": 0.28698269091546535,
      "cameraMode": "Orbit",
      "lights": [
        {
          "type": 'Point',
          "position": {
            "x": 0.7545657194904971,
            "y": 0.5311043420915486,
            "z": -0.026379577691362677
          },
          "rotation": { "x": 0, "y": 0, "z": 0 },
          "color": "#ffffff",
          "intensity": 1.4,
          "falloff": 0,
          "falloffType": "Quadratic",
          "fixed": false,
          "visible": true,
          "castShadow": true
        },
        {
          "type": 'Point',
          "position": {
            "x": 0.05,
            "y": 0.075,
            "z": -0.1
          },
          "rotation": { "x": 0, "y": 0, "z": 0 },
          "color": "#ff0000",
          "intensity": 0.5,
          "falloff": 0.5,
          "falloffType": "Quadratic",
          "fixed": false,
          "visible": false,
          "castShadow": false
        },
        {
          "type": 'Point',
          "position": {
            "x": 0.25,
            "y": 0.075,
            "z": -0.1
          },
          "rotation": { "x": 0, "y": 0, "z": 0 },
          "color": "#0000ff",
          "intensity": 0.5,
          "falloff": 0.5,
          "falloffType": "Quadratic",
          "fixed": false,
          "visible": false,
          "castShadow": false
        }
      ],
      "renderMode": "Direct",
      "quality": {
        "fudgeFactor": 0.4,
        "detail": 1,
        "pixelThreshold": 0.5,
        "maxSteps": 300,
        "aaMode": "Always",
        "aaLevel": 1,
        "msaa": 1,
        "accumulation": true
      },
      "navigation": {
        "flySpeed": 0.5,
        "autoSlow": true
      },
      "animations": [],
      "sequence": {
        "durationFrames": 300,
        "fps": 30,
        "tracks": {}
      },
      "duration": 300
    }
};
