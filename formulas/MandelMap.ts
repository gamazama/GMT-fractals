
import { FractalDefinition } from '../types';

export const MandelMap: FractalDefinition = {
    id: 'MandelMap',
    name: 'MandelMap (Unrolled)',
    shortDescription: 'Unrolls the Mandelbulb surface. Features Sphere, Cylinder, and Torus projections.',
    description: 'Maps the Mandelbulb 3D structure onto a 2D plane. Use "Projection" (Param D) to switch between Spherical (Standard), Cylindrical (Infinite Vertical), and Toroidal (Seamless) mappings.',

    shader: {
        function: `
    vec3 planeToBulb(vec3 p, float scale, float heightAmp, float thetaOffset, float phiOffset, float mode) {
        // --- 1. COORDINATE PREP ---
        // Apply Map Scaling & Phase Compensation first
        // This effectively "Slides" the map texture to counter-act the fractal rotation
        float u = p.x * scale - phiOffset;
        float v = p.z * scale - thetaOffset;
        
        // Height (Radius base)
        // Base radius 1.1 puts Y=0 slightly outside the unit bulb surface
        float r = 1.1 + (p.y / max(0.01, heightAmp));
        
        // --- 2. PROJECTION MAPPING ---
        
        if (mode < 0.5) {
            // MODE 0: SPHERICAL (Mercator)
            // Classic mapping. Distorts at poles (high Z).
            // u -> Longitude (Phi), v -> Latitude (Theta)
            
            float theta = v + 1.570796; // Center at equator
            float phi = u;
            
            return r * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
        } 
        else if (mode < 1.5) {
            // MODE 1: CYLINDRICAL
            // Unwraps to an infinite vertical column. No polar distortion.
            // u -> Angle (Phi), v -> Height (Y), r -> Radius
            
            float phi = u;
            float height = v;
            
            // X/Z form the circle, Y is height
            return vec3(r * cos(phi), height, r * sin(phi));
        } 
        else {
            // MODE 2: TOROIDAL
            // Wraps around a donut. Seamless tiling in all directions.
            // u -> Major Angle, v -> Minor Angle
            
            float majorR = 2.0; // Radius of the donut hole
            
            // Torus formula:
            // X = (R + r*cos(v)) * cos(u)
            // Y = (R + r*cos(v)) * sin(u)
            // Z = r * sin(v)
            // We use 'r' (height) as the minor radius scaler
            
            float minorR = r; 
            
            return vec3(
                (majorR + minorR * cos(v)) * cos(u),
                minorR * sin(v),
                (majorR + minorR * cos(v)) * sin(u)
            );
        }
    }

    void formula_MandelMap(inout vec4 z, inout float dr, inout float trap, inout vec4 c) {
        float power = uParamA;
        float thetaPhase = uParamE;
        float phiPhase = uParamF;

        // Run transform only on the first iteration
        if (dr == 1.0) {
            float heightAmp = uParamB;
            float mapScale = uParamC;
            float projMode = uParamD;
            
            // --- Coordinate Compensation Logic ---
            // Symmetry Shift = Phase / (Power - 1.0)
            // This locks the visual features in place while they mutate
            float divisor = max(1.0, power - 1.0);
            float thetaOffset = thetaPhase / divisor;
            float phiOffset = phiPhase / divisor;
            
            vec3 w = planeToBulb(z.xyz, mapScale, heightAmp, thetaOffset, phiOffset, projMode);
            
            // --- Lipschitz Correction ---
            // Estimate expansion factor to correct Distance Estimation
            float r = length(w);
            float verticalScale = 1.0 / max(0.01, heightAmp);
            float horizontalScale = r * mapScale;
            float stretch = max(verticalScale, horizontalScale);
            
            dr *= max(1.0, stretch);
            
            z.xyz = w;
            
            if (uJuliaMode < 0.5) {
                c.xyz = w;
            }
        }

        // Standard Mandelbulb Iteration
        vec3 p = z.xyz;
        float r = length(p);
        
        if (r > 1.0e-4) {
            dr = pow(r, power - 1.0) * power * dr + 1.0;
            
            float theta = acos(clamp(p.z / r, -1.0, 1.0));
            float phi = atan(p.y, p.x);
            
            float zr = pow(r, power);
            
            // Apply Phase Shifts
            theta = theta * power + thetaPhase;
            phi = phi * power + phiPhase;
            
            p = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta));
        }
        
        p += c.xyz;
        
        z.xyz = p;
        trap = min(trap, length(p));
    }`,
        loopBody: `formula_MandelMap(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 2.0, max: 16.0, step: 0.01, default: 8.0 },
        { label: 'Height Amp', id: 'paramB', min: 0.1, max: 10.0, step: 0.1, default: 2.0 },
        { label: 'Map Scale', id: 'paramC', min: 0.1, max: 5.0, step: 0.01, default: 1.0 },
        { label: 'Projection', id: 'paramD', min: 0.0, max: 2.0, step: 1.0, default: 1.0, options: [
            { label: 'Spherical', value: 0.0 },
            { label: 'Cylindrical', value: 1.0 },
            { label: 'Toroidal', value: 2.0 }
        ]},
        { label: 'Theta Phase', id: 'paramE', min: -3.14, max: 3.14, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Phi Phase', id: 'paramF', min: -6.28, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
    ],

    defaultPreset: {
  "version": 1,
  "name": "MandelMap",
  "formula": "MandelMap",
  "features": {
    "coreMath": {
      "iterations": 11,
      "paramA": 4,
      "paramB": 1.61,
      "paramC": 1,
      "paramD": 0,
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
      "shadowSoftness": 33.96487304923489,
      "shadowSteps": 304,
      "shadowBias": 0,
      "lights": [
        {
          "type": "Directional",
          "position": {
            "x": -2,
            "y": 1,
            "z": 2
          },
          "rotation": {
            "x": -1.2945477312837892,
            "y": 3.0961684975756443,
            "z": -3.0815085191809364
          },
          "color": "#ffffff",
          "intensity": 6.969599999999999,
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
      "aoIntensity": 0.7102583030181524,
      "aoSpread": 0.02075305004726551,
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
      "fogIntensity": 0.66,
      "fogNear": 3.3177600000000007,
      "fogFar": 14.5,
      "fogColor": "#7f6969",
      "fogDensity": 0,
      "glowIntensity": 0,
      "glowSharpness": 11.220184543019629,
      "glowMode": false,
      "glowColor": "#ffffff"
    },
    "materials": {
      "diffuse": 2,
      "reflection": 0,
      "specular": 0,
      "roughness": 0.5,
      "rim": 0,
      "rimExponent": 4,
      "envStrength": 0.75,
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
            "id": "1771159172325_0",
            "position": 0,
            "color": "#009392",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771159172325_1",
            "position": 0.167,
            "color": "#39b185",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771159172325_2",
            "position": 0.333,
            "color": "#9ccb86",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771159172325_3",
            "position": 0.5,
            "color": "#e9e29c",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771159172325_4",
            "position": 0.667,
            "color": "#eeb479",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771159172325_5",
            "position": 0.833,
            "color": "#e88471",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771159172325_6",
            "position": 1,
            "color": "#cf597e",
            "bias": 0.5,
            "interpolation": "linear"
          }
        ],
        "colorSpace": "linear"
      },
      "mode": 1,
      "scale": 3.1065735566446993,
      "offset": 0.20712783526166173,
      "repeats": 1,
      "phase": 0,
      "bias": 0.5963552876944301,
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
      "fudgeFactor": 1,
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
    "x": -0.40127164816286187,
    "y": 8.701571167029472e-8,
    "z": 2.710286594285787e-7,
    "w": 0.9159590953642958
  },
  "sceneOffset": {
    "x": 0,
    "y": 4,
    "z": 5,
    "xL": -0.00800157869605831,
    "yL": -0.1778496246363903,
    "zL": -0.24803174116677118
  },
  "targetDistance": 4.905199170112612,
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
