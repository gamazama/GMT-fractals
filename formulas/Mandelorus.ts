
import { FractalDefinition } from '../types';

export const Mandelorus: FractalDefinition = {
    id: 'Mandelorus',
    name: 'Mandelorus',
    shortDescription: 'The "True" 3D Mandelbrot topology. Wraps space around a ring instead of a point.',
    description: 'Wraps the fractal iteration around a Torus (Donut). Creates a Solenoid structure. Twist is linked to Power: 1.0 Twist = 1 Symmetry Shift (360/Power).',
    
    shader: {
        function: `
        void formula_Mandelorus(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 p = z.xyz;
            float R = uParamA;       // Major Radius
            float twistInput = uParamB;   // Twist Steps (1.0 = 1 Symmetry Unit)
            float power = uParamC;   // Fractal Power
            
            // PI transform removed (handled by UI injection now)
            float ringPhase = uParamD; 
            float crossPhase = uParamE; 
            
            float zScale = 1.0 + uParamF; // Vertical Scale
            
            // 1. Toroidal Decomposition
            float lenXY = length(p.xy);
            // phi: The angle around the major ring (0 to 2PI)
            float phi = atan(p.y, p.x); 
            
            // q: The cross-section complex plane relative to the ring center
            vec2 q = vec2(lenXY - R, p.z * zScale);
            
            // 2. Twist (Pre-iteration)
            // Rotates the cross-section as we travel around the ring.
            // We want 1.0 "Twist Input" to equal 1 "Symmetry Step".
            // A Symmetry Step is (2 * PI) / Power.
            // So Total Rotation should be: phi * (TwistInput / Power).
            if (abs(twistInput) > 0.001) {
                float rotAng = phi * twistInput / max(1.0, power);
                float s = sin(rotAng); 
                float co = cos(rotAng);
                q = mat2(co, -s, s, co) * q;
            }

            // 3. Complex Power (The Fiber Iteration)
            float r2 = dot(q, q);
            float r = sqrt(r2);
            float angleQ = atan(q.y, q.x);
            
            // Apply Cross Phase (Theta)
            angleQ += crossPhase;

            // --- STABILITY IMPROVEMENT ---
            // Calculate derivative with compensation for Twist and Z-Scale
            
            float dr_cross = power * pow(r, power - 1.0);
            
            // The effective expansion is the max of the Ring expansion (Power)
            // and the Cross-Section expansion (dr_cross).
            float expansion = max(power, dr_cross);
            
            // Pad derivative based on Z-Scale
            expansion *= max(1.0, zScale);
            
            // Pad derivative based on Twist intensity
            // High twist stretches space, requiring smaller steps
            expansion *= (1.0 + abs(twistInput) * 0.3);

            dr = dr * expansion + 1.0;
            
            // Apply Power to Cross Section
            float newR = pow(r, power);
            float newAngleQ = angleQ * power;
            q = newR * vec2(cos(newAngleQ), sin(newAngleQ));
            
            // 4. Solenoidal Wrapping (The Base Iteration)
            // phi -> n * phi + turn
            phi = phi * power + ringPhase;
            
            // 5. Reconstruction (Map back to 3D)
            vec2 ringPos = vec2(cos(phi), sin(phi));
            
            vec3 p_next;
            p_next.xy = ringPos * (R + q.x); // Expand ring by new q.x
            p_next.z = q.y; 
            
            // 6. Addition of C
            p_next += c.xyz;
            
            z.xyz = p_next;
            
            // Trap: Use cross-section magnitude
            trap = min(trap, r2);
        }`,
        loopBody: `formula_Mandelorus(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Ring Radius', id: 'paramA', min: 0.1, max: 5.0, step: 0.01, default: 1.0 },
        { label: 'Twist (Sym)', id: 'paramB', min: -8.0, max: 8.0, step: 0.1, default: 0.0 }, 
        { label: 'Power', id: 'paramC', min: 1.0, max: 16.0, step: 0.01, default: 8.0 },
        // Scale 'pi' means the UI sends values in Radians (0.5 slider = 1.57 uniform)
        { label: 'Ring Phase', id: 'paramD', min: -6.28, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Cross Phase', id: 'paramE', min: -6.28, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Vert Scale', id: 'paramF', min: -0.9, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
  "version": 2,
  "name": "HyperTorus",
  "formula": "Mandelorus",
  "features": {
    "coreMath": {
      "iterations": 31,
      "paramA": 1.32,
      "paramB": 0,
      "paramC": 5,
      "paramD": 0,
      "paramE": -1.159203974648639,
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
          "type": "Directional",
          "position": {
            "x": 1.8089856063656191,
            "y": 0.769231473548869,
            "z": -3.1565777253328235
          },
          "rotation": {
            "x": 0.08548818739394098,
            "y": 2.7391915549407027,
            "z": 0.41340674852481984
          },
          "color": "#ffffff",
          "intensity": 1.5,
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
      "aoIntensity": 0.3992177013734381,
      "aoSpread": 0.12250592248526632,
      "aoSamples": 5,
      "aoMode": false,
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
      "glowIntensity": 0.0013419894295067058,
      "glowSharpness": 13.803842646028853,
      "glowMode": true,
      "glowColor": "#ff0000"
    },
    "materials": {
      "diffuse": 1,
      "reflection": 0,
      "specular": 0.3,
      "roughness": 0.5,
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
      "emission": 0.4,
      "emissionMode": 2,
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
            "id": "1771161402247_0",
            "position": 0.07178750897343862,
            "color": "#141414",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161413328",
            "position": 0.1225174070688263,
            "color": "#F40000",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161432807",
            "position": 0.1627184120939519,
            "color": "#FFA9A9",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161412141",
            "position": 0.2027890750198856,
            "color": "#0D0D0D",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161402247_1",
            "position": 0.6090930507893446,
            "color": "#ffffff",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161445770",
            "position": 1,
            "color": "#181818",
            "bias": 0.5,
            "interpolation": "linear"
          }
        ],
        "colorSpace": "srgb"
      },
      "mode": 0,
      "scale": 5,
      "offset": 0.30000000000000004,
      "repeats": 1,
      "phase": -0.7,
      "bias": 1,
      "twist": 0,
      "escape": 4,
      "gradient2": {
        "stops": [
          {
            "id": "1771161496387_0",
            "position": 0,
            "color": "#000000",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161496387_1",
            "position": 0.07083040060795048,
            "color": "#550000",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161496387_2",
            "position": 0.1627184120939519,
            "color": "#FF2222",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161496387_3",
            "position": 0.2027890750198856,
            "color": "#000000",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161496387_4",
            "position": 0.6090930507893446,
            "color": "#000000",
            "bias": 0.5,
            "interpolation": "linear"
          },
          {
            "id": "1771161496387_5",
            "position": 1,
            "color": "#000000",
            "bias": 0.5,
            "interpolation": "linear"
          }
        ],
        "colorSpace": "srgb"
      },
      "mode2": 0,
      "scale2": 4.999999999999999,
      "offset2": 0.30000000000000004,
      "repeats2": 1,
      "phase2": -0.7,
      "bias2": 1,
      "twist2": 0,
      "blendMode": 1,
      "blendOpacity": 1,
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
    "x": 1,
    "y": -7.27156800341211e-33,
    "z": -6.123233995736766e-17,
    "w": 3.710962377975166e-18
  },
  "sceneOffset": {
    "x": 0.02015586569905281,
    "y": 0.005605148617178202,
    "z": -5.211455821990967,
    "xL": 5.716822570889235e-10,
    "yL": 2.1298747235435714e-10,
    "zL": -2.2618142203612024e-7
  },
  "targetDistance": 5.214554250240326,
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
    "tracks": {
      "camera.unified.x": {
        "id": "camera.unified.x",
        "type": "float",
        "label": "Position X",
        "keyframes": [
          {
            "id": "520JCebpirpIjkgSfViyb",
            "frame": 0,
            "value": -0.05059101356107703,
            "interpolation": "Linear",
            "autoTangent": false,
            "brokenTangents": false
          }
        ],
        "hidden": false
      },
      "camera.unified.y": {
        "id": "camera.unified.y",
        "type": "float",
        "label": "Position Y",
        "keyframes": [
          {
            "id": "TlKGVi6rVx8aPvZFWKlvw",
            "frame": 0,
            "value": -0.1358890818952094,
            "interpolation": "Linear",
            "autoTangent": false,
            "brokenTangents": false
          }
        ],
        "hidden": false
      },
      "camera.unified.z": {
        "id": "camera.unified.z",
        "type": "float",
        "label": "Position Z",
        "keyframes": [
          {
            "id": "zcz_hIp4HhQTRZSagfckN",
            "frame": 0,
            "value": -5.918975187098582,
            "interpolation": "Linear",
            "autoTangent": false,
            "brokenTangents": false
          }
        ],
        "hidden": false
      },
      "camera.rotation.x": {
        "id": "camera.rotation.x",
        "type": "float",
        "label": "Rotation X",
        "keyframes": [
          {
            "id": "sLYXo677pGLgJlq19eoEQ",
            "frame": 0,
            "value": 3.141592653589793,
            "interpolation": "Linear",
            "autoTangent": false,
            "brokenTangents": false
          }
        ],
        "hidden": false
      },
      "camera.rotation.y": {
        "id": "camera.rotation.y",
        "type": "float",
        "label": "Rotation Y",
        "keyframes": [
          {
            "id": "9Og7ZQx3kB_GSO0hjPEQs",
            "frame": 0,
            "value": 0,
            "interpolation": "Linear",
            "autoTangent": false,
            "brokenTangents": false
          }
        ],
        "hidden": false
      },
      "camera.rotation.z": {
        "id": "camera.rotation.z",
        "type": "float",
        "label": "Rotation Z",
        "keyframes": [
          {
            "id": "sZtDA1yOQQpJIB1P6Nn7v",
            "frame": 0,
            "value": 0,
            "interpolation": "Linear",
            "autoTangent": false,
            "brokenTangents": false
          }
        ],
        "hidden": false
      }
    }
  },
  "duration": 300
}
};
