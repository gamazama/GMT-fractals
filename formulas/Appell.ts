
import { FractalDefinition } from '../types';

export const Appell: FractalDefinition = {
    id: 'Appell',
    name: 'Appell Spectral (Ghost)',
    shortDescription: 'Based on Appell Polynomials and Clifford Analysis. Renders the "Hidden Skeleton" of 3D numbers.',
    description: 'Implements the "Pseudo-Square" $P_2(x) = x^2 - k|x|^2$. This iteration destabilizes the surface, revealing a skeletal, interference-like structure. Best viewed as a volumetric cloud.',
    
    shader: {
        function: `
    void formula_Appell(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        float r = length(p);
        
        // Param A: Interference Factor (k)
        // 0.333 is the theoretical "Euclidean" balance. 
        // Higher values strip the "flesh" off the fractal, leaving the skeleton.
        float k = uParamA;
        
        // Param B: Power (approximate)
        float power = uParamB;
        
        // Param C: Ghost Shift (4th Dimension Bias)
        // Adds a constant bias to the magnitude calculation, simulating a 4D slice.
        float bias = uParamC;
        
        // --- The Appell Polynomial Iteration ---
        
        // 1. Standard Hypercomplex Power
        // We use spherical conversion for generic power support
        float theta = acos(clamp(p.z / r, -1.0, 1.0));
        float phi = atan(p.y, p.x);
        
        // Apply rotation/twist
        phi += uParamE; 
        
        float zr = pow(r, power);
        theta *= power;
        phi *= power;
        
        vec3 p_hyper = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        
        // 2. The Appell Subtraction
        // P_k(x) = x^k - k * |x|^2 ... (Simplified)
        // We subtract the magnitude squared from the Real component (X-axis in this projection)
        // This is the non-conformal "correction" that reveals the skeleton.
        
        float magSq = r*r + bias;
        p_hyper.x -= k * magSq;
        
        // 3. Update Derivative
        // The subtraction term makes the derivative complex. 
        // We approximate it: dr = power * r^(power-1) * dr - 2*k*r*dr
        // This creates "Fuzzy" boundaries automatically.
        dr = (power * pow(r, power - 1.0) - (2.0 * k * r)) * dr + 1.0;
        
        // 4. Param D: Fuzziness (Density Control)
        // Artificially reduces the derivative growth to create volumetric clouds
        if (uParamD > 0.0) {
            dr *= (1.0 - uParamD * 0.1);
        }
        
        z.xyz = p_hyper + c.xyz;
        
        trap = min(trap, r);
    }`,
        loopBody: `formula_Appell(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Interference', id: 'paramA', min: 0.0, max: 1.5, step: 0.001, default: 0.333 },
        { label: 'Power', id: 'paramB', min: 1.0, max: 8.0, step: 0.01, default: 2.0 },
        { label: 'Ghost Shift', id: 'paramC', min: -1.0, max: 1.0, step: 0.001, default: 0.0 },
        { label: 'Cloud Density', id: 'paramD', min: 0.0, max: 1.0, step: 0.01, default: 0.5 },
        { label: 'Phase', id: 'paramE', min: 0.0, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
    ],

    defaultPreset: {
  "version": 2,
  "name": "Appell",
  "formula": "Appell",
  "features": {
    "coreMath": {
      "iterations": 10,
      "paramA": 0.761,
      "paramB": 2.83,
      "paramC": -0.391,
      "paramD": 0.24,
      "paramE": 0,
      "paramF": 0
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
      "shadowIntensity": 1,
      "shadowSoftness": 16,
      "shadowSteps": 128,
      "shadowBias": 0.002,
      "lights": [
        {
          "type": "Point",
          "position": {
            "x": -2,
            "y": 1,
            "z": 2
          },
          "rotation": {
            "x": 0,
            "y": 0,
            "z": 0
          },
          "color": "#ffffff",
          "intensity": 1.5,
          "falloff": 0,
          "falloffType": "Quadratic",
          "fixed": false,
          "visible": false,
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
      "aoIntensity": 0,
      "aoSpread": 0.5,
      "aoSamples": 5,
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
      "fogFar": 6,
      "fogColor": "#000000",
      "fogDensity": 0,
      "glowIntensity": 4.999999999999999,
      "glowSharpness": 12.02264434617413,
      "glowMode": false,
      "glowColor": "#00ffff"
    },
    "materials": {
      "diffuse": 1.16,
      "reflection": 0,
      "specular": 0,
      "roughness": 0.5872188659713031,
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
            "id": "5",
            "position": 0.006101938262742301,
            "color": "#000000",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "4",
            "position": 0.07666905958363249,
            "color": "#5744FF",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "3",
            "position": 0.2198492462311558,
            "color": "#0088ff",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "2",
            "position": 0.3802584350323044,
            "color": "#001133",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1",
            "position": 0.46518305814788224,
            "color": "#000000",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161963853_0",
            "position": 0.5402010050251256,
            "color": "#000000",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161963853_1",
            "position": 0.6,
            "color": "#001133",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161963853_2",
            "position": 0.75,
            "color": "#0088ff",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161963853_3",
            "position": 0.9,
            "color": "#F644FF",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161963853_4",
            "position": 1,
            "color": "#000000",
            "bias": 0.5,
            "interpolation": "linear"
          }
        ],
        "colorSpace": "srgb"
      },
      "mode": 8,
      "scale": 0.5557213101593343,
      "offset": 0.05468077546160833,
      "repeats": 1.2,
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
      "fudgeFactor": 0.01,
      "stepRelaxation": 0,
      "refinementSteps": 0,
      "detail": 3.1,
      "pixelThreshold": 1,
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
    "x": 0.6190587983598513,
    "y": 0.40078133786953346,
    "z": -0.5821092438548545,
    "w": 0.3424753299253732
  },
  "sceneOffset": {
    "x": -0.3737236559391022,
    "y": -1.5770468711853027,
    "z": -0.1308211237192154,
    "xL": -0.060257730662381714,
    "yL": 0.02761814157420639,
    "zL": 0.002646650329445943
  },
  "targetDistance": 1.0691482573747906,
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
