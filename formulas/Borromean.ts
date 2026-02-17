
import { FractalDefinition } from '../types';

export const Borromean: FractalDefinition = {
    id: 'Borromean',
    name: 'Borromean (Cyclic)',
    shortDescription: 'Three interlocking Complex Planes. Uses dimensional feedback loops instead of spherical math.',
    description: 'Treats 3D space as three coupled 2D planes (XY, YZ, ZX). The output of one plane becomes the input of the next, creating a "Rock-Paper-Scissors" feedback loop. Produces tetrahedral symmetries and solid, non-spherical shapes.',
    
    shader: {
        function: `
    void formula_Borromean(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        
        // Param A: Power
        float power = uParamA;
        
        // Param E: Phase Shift (Rotation per iteration)
        float phase = uParamE;
        if (abs(phase) > 0.001) {
            float s = sin(phase); 
            float co = cos(phase);
            p.xy = mat2(co, -s, s, co) * p.xy;
        }

        // Derivative for generalized power
        float r = length(p);
        dr = power * pow(r, power - 1.0) * dr + 1.0;
        
        // Generalized Power Terms
        float xP = pow(abs(p.x), power);
        float yP = pow(abs(p.y), power);
        float zP = pow(abs(p.z), power);
        
        // Param B: Connection (The Link Strength)
        float connect = uParamB;
        
        // Param C: Repulsion (The Subtractive Force)
        float repel = uParamC;
        
        // Param D: Balance (Mixing Force)
        float balance = uParamD;
        
        // Param F: Invert (Sign Flip)
        float invert = uParamF;
        
        // The Cyclic Permutation
        // X driven by Z
        // Y driven by X
        // Z driven by Y
        
        float nx = (xP - repel * yP - balance * zP) + (invert * connect * 2.0 * p.z * p.x);
        float ny = (yP - repel * zP - balance * xP) + (invert * connect * 2.0 * p.x * p.y);
        float nz = (zP - repel * xP - balance * yP) + (invert * connect * 2.0 * p.y * p.z);
        
        z.xyz = vec3(nx, ny, nz) + c.xyz;
        
        trap = min(trap, dot(z.xyz, z.xyz));
    }`,
        loopBody: `formula_Borromean(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 1.0, max: 5.0, step: 0.01, default: 2.0 },
        { label: 'Connection', id: 'paramB', min: 0.0, max: 3.0, step: 0.01, default: 1.0 },
        { label: 'Repulsion', id: 'paramC', min: 0.0, max: 3.0, step: 0.01, default: 1.0 },
        { label: 'Balance', id: 'paramD', min: 0.0, max: 2.0, step: 0.01, default: 0.0 },
        { label: 'Phase', id: 'paramE', min: -3.14, max: 3.14, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Invert', id: 'paramF', min: -1.0, max: 1.0, step: 2.0, default: 1.0 }, // Toggle
    ],

    defaultPreset: {
  "version": 1,
  "name": "Borromean",
  "formula": "Borromean",
  "features": {
    "coreMath": {
      "iterations": 28,
      "paramA": 2.25,
      "paramB": 1.04,
      "paramC": 0.92,
      "paramD": 0,
      "paramE": 0,
      "paramF": 1
    },
    "geometry": {
      "applyTransformLogic": true,
      "preRotMaster": true,
      "hybridComplex": false,
      "burningEnabled": false,
      "hybridMode": false,
      "hybridIter": 2,
      "hybridFoldLimit": 1,
      "hybridScale": 2,
      "hybridMinR": 0.5,
      "hybridFixedR": 1,
      "hybridAddC": false,
      "hybridProtect": true,
      "hybridSwap": false,
      "hybridSkip": 1,
      "preRotEnabled": false,
      "preRotY": 0,
      "preRotX": 0,
      "preRotZ": 0,
      "juliaMode": false,
      "juliaX": 0,
      "juliaY": 0,
      "juliaZ": 0,
      "preRot": {
        "x": 0,
        "y": 0,
        "z": 0
      },
      "julia": {
        "x": 0,
        "y": 0,
        "z": 0
      }
    },
    "lighting": {
      "advancedLighting": true,
      "ptEnabled": true,
      "renderMode": 0,
      "ptBounces": 3,
      "ptGIStrength": 1,
      "shadowsCompile": true,
      "shadowAlgorithm": 0,
      "ptStochasticShadows": false,
      "shadows": true,
      "shadowIntensity": 0.82,
      "shadowSoftness": 8,
      "shadowSteps": 128,
      "shadowBias": 0.002,
      "lights": [
        {
          "type": "Directional",
          "position": {
            "x": -1.9999999999999998,
            "y": 1,
            "z": 2
          },
          "rotation": {
            "x": -1.3618058113303921,
            "y": 2.6135019110558524,
            "z": -2.4974118716462748
          },
          "color": "#ffffff",
          "intensity": 2.8224,
          "falloff": 0,
          "falloffType": "Quadratic",
          "fixed": false,
          "visible": true,
          "castShadow": true
        },
        {
          "type": "Point",
          "position": {
            "x": 2,
            "y": -1,
            "z": 1
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "color": "#ff8800",
          "intensity": 0.5,
          "falloff": 0,
          "falloffType": "Quadratic",
          "fixed": false,
          "visible": false,
          "castShadow": true
        },
        {
          "type": "Point",
          "position": {
            "x": 0,
            "y": -5,
            "z": 2
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "color": "#0088ff",
          "intensity": 0.25,
          "falloff": 0,
          "falloffType": "Quadratic",
          "fixed": true,
          "visible": false,
          "castShadow": true
        }
      ]
    },
    "ao": {
      "aoIntensity": 0.36219236319294446,
      "aoSpread": 0.010521796258218545,
      "aoSamples": 22,
      "aoMode": true,
      "aoMaxSamples": 32,
      "aoStochasticCp": true,
      "aoEnabled": true
    },
    "reflections": {
      "mixStrength": 1,
      "roughnessThreshold": 0.5,
      "bounces": 1,
      "steps": 64,
      "enabled": true
    },
    "atmosphere": {
      "glowEnabled": true,
      "glowQuality": 0,
      "fogIntensity": 0,
      "fogNear": 0,
      "fogFar": 5,
      "fogColor": "#000000",
      "fogDensity": 0,
      "glowIntensity": 0.064445198559225,
      "glowSharpness": 1.8620871366628675,
      "glowMode": false,
      "glowColor": "#ffffff"
    },
    "materials": {
      "diffuse": 1.92,
      "reflection": 0,
      "specular": 1.52,
      "roughness": 0.23035625001175353,
      "rim": 0,
      "rimExponent": 4,
      "envStrength": 0,
      "envBackgroundStrength": 0,
      "envSource": 1,
      "envMapData": null,
      "envMapColorSpace": 0,
      "useEnvMap": false,
      "envRotation": 0,
      "envGradientStops": [
        {
          "id": "sky",
          "position": 0,
          "color": "#000000",
          "bias": 0.5,
          "interpolation": "smooth"
        },
        {
          "id": "hor",
          "position": 0.5,
          "color": "#223344",
          "bias": 0.5,
          "interpolation": "smooth"
        },
        {
          "id": "zen",
          "position": 1,
          "color": "#88ccff",
          "bias": 0.5,
          "interpolation": "smooth"
        }
      ],
      "emission": 0,
      "emissionMode": 0,
      "emissionColor": "#ffffff",
      "ptEmissionMult": 1
    },
    "waterPlane": {
      "waterEnabled": false,
      "active": true,
      "height": -2,
      "color": "#001133",
      "roughness": 0.02,
      "waveStrength": 0.1,
      "waveSpeed": 1,
      "waveFrequency": 1.5
    },
    "coloring": {
      "gradient": {
        "stops": [
          {
            "id": "1771160459074_0",
            "position": 0,
            "color": "#5F4690",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_1",
            "position": 0.091,
            "color": "#1D6996",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_2",
            "position": 0.182,
            "color": "#38A6A5",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_3",
            "position": 0.273,
            "color": "#0F8554",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_4",
            "position": 0.364,
            "color": "#73AF48",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_5",
            "position": 0.455,
            "color": "#EDAD08",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_6",
            "position": 0.545,
            "color": "#E17C05",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_7",
            "position": 0.636,
            "color": "#CC503E",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_8",
            "position": 0.727,
            "color": "#94346E",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_9",
            "position": 0.818,
            "color": "#6F4070",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_10",
            "position": 0.909,
            "color": "#994E95",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771160459074_11",
            "position": 1,
            "color": "#666666",
            "bias": 0.5,
            "interpolation": "linear"
          }
        ],
        "colorSpace": "linear"
      },
      "mode": 1,
      "scale": 2.2754446706935223,
      "offset": -0.07388697269814448,
      "repeats": 2,
      "phase": 0,
      "bias": 1,
      "twist": 0,
      "escape": 4,
      "gradient2": [
        {
          "id": "1",
          "position": 0,
          "color": "#000000"
        },
        {
          "id": "2",
          "position": 1,
          "color": "#ffffff"
        }
      ],
      "mode2": 4,
      "scale2": 1,
      "offset2": 0,
      "repeats2": 1,
      "phase2": 0,
      "bias2": 1,
      "twist2": 0,
      "blendMode": 0,
      "blendOpacity": 0,
      "layer3Color": "#ffffff",
      "layer3Scale": 2,
      "layer3Strength": 0,
      "layer3Bump": 0,
      "layer3Turbulence": 0
    },
    "texturing": {
      "active": false,
      "layer1Data": null,
      "colorSpace": 0,
      "mapU": 6,
      "mapV": 1,
      "scaleX": 1,
      "scaleY": 1,
      "offset": {
        "x": 0,
        "y": 0
      },
      "textureScale": {
        "x": 1,
        "y": 1
      }
    },
    "quality": {
      "engineQuality": true,
      "compilerHardCap": 500,
      "precisionMode": 0,
      "bufferPrecision": 0,
      "maxSteps": 300,
      "distanceMetric": 0,
      "estimator": 0,
      "fudgeFactor": 0.5,
      "stepRelaxation": 0,
      "refinementSteps": 0,
      "detail": 2,
      "pixelThreshold": 0.5,
      "overstepTolerance": 0,
      "dynamicScaling": false,
      "interactionDownsample": 2
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
    "colorGrading": {
      "active": false,
      "saturation": 1,
      "levelsMin": 0,
      "levelsMax": 1,
      "levelsGamma": 1
    },
    "optics": {
      "camType": 0,
      "camFov": 60,
      "orthoScale": 2,
      "dofStrength": 0,
      "dofFocus": 10
    },
    "navigation": {
      "flySpeed": 0.5,
      "autoSlow": true
    },
    "cameraManager": {},
    "audio": {
      "isEnabled": false,
      "smoothing": 0.8,
      "threshold": 0.1,
      "agcEnabled": false,
      "attack": 0.1,
      "decay": 0.3,
      "highPass": 20,
      "lowPass": 20000,
      "gain": 1
    },
    "sonification": {
      "isEnabled": false,
      "active": true,
      "baseFrequency": 220,
      "masterGain": 0.5,
      "scanArea": 0.1,
      "harmonics": true,
      "lastDimension": 0
    },
    "drawing": {
      "activeTool": "rect",
      "enabled": false,
      "active": false,
      "originMode": 1,
      "color": "#00ffff",
      "lineWidth": 1,
      "showLabels": true,
      "showAxes": false,
      "shapes": [],
      "refreshTrigger": 0
    },
    "modulation": {
      "rules": [],
      "selectedRuleId": null
    },
    "webcam": {
      "isEnabled": false,
      "opacity": 1,
      "posX": 20,
      "posY": 80,
      "width": 320,
      "height": 240,
      "cropL": 0,
      "cropR": 0,
      "cropT": 0,
      "cropB": 0,
      "blendMode": 0,
      "crtMode": false,
      "tilt": 0,
      "fontSize": 12
    },
    "debugTools": {
      "shaderDebuggerOpen": false,
      "stateDebuggerOpen": false
    },
    "engineSettings": {
      "showEngineTab": false
    }
  },
  "cameraPos": {
    "x": 0,
    "y": 0,
    "z": 0
  },
  "cameraRot": {
    "x": -0.2938195179022356,
    "y": 0.33371368466206736,
    "z": 0.11030705445694247,
    "w": 0.8888968563933598
  },
  "sceneOffset": {
    "x": 1.540531039237976,
    "y": 1.1154367923736572,
    "z": 1.807411551475525,
    "xL": -0.31978609027941085,
    "yL": 0.2396308322743712,
    "zL": -0.23608000053467415
  },
  "targetDistance": 2.0720281302928925,
  "cameraMode": "Orbit",
  "lights": [],
  "renderMode": "Direct",
  "quality": {
    "aaMode": "Always",
    "aaLevel": 1,
    "msaa": 1,
    "accumulation": true
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
