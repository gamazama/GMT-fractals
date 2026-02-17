
import { FractalDefinition } from '../types';

export const MengerSponge: FractalDefinition = {
    id: 'MengerSponge',
    name: 'Menger Sponge',
    shortDescription: 'The classic cubic fractal. Creates infinite grids and tech-like structures.',
    description: 'The canonical Menger Sponge (Level N). Set Scale to 3.0 and Offset to 1.0 for the classic mathematical shape. Use "Center Z" to toggle between a corner fractal and the full cube.',
    
    shader: {
        function: `
    void formula_MengerSponge(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // Rotation
        float angX = uParamC;
        float angZ = uParamD;
        if (abs(angX) > 0.001 || abs(angZ) > 0.001) {
             float sx = sin(angX), cx = cos(angX);
             float sz = sin(angZ), cz = cos(angZ);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xy = rotZ * z3.xy;
        }

        z3 = abs(z3);
        if (z3.x < z3.y) z3.xy = z3.yx;
        if (z3.x < z3.z) z3.xz = z3.zx;
        if (z3.y < z3.z) z3.yz = z3.zy;
        
        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        float offset = uParamB;
        
        // IFS Shift: offset * (scale - 1.0)
        float shift = offset * (scale - 1.0);
        
        z3 = z3 * scale - vec3(shift);
        
        // Param F: Center Z (The "Full Sponge" Correction)
        // If active, this conditional shift restores the full cubic symmetry
        if (uParamF > 0.5) {
            if (z3.z < -0.5 * shift) {
                z3.z += shift;
            }
        }
        
        // Param E: Manual Z Shift (Axis Shift)
        if (abs(uParamE) > 0.001) {
            z3.z += uParamE * scale;
        }

        if (uJuliaMode > 0.5) z3 += c.xyz * 0.1;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3 - c.xyz));
    }`,
        loopBody: `formula_MengerSponge(z, dr, trap, c);`
    },

    parameters: [
        { label: 'Scale', id: 'paramA', min: 1.0, max: 4.0, step: 0.001, default: 3.0 },
        { label: 'Offset', id: 'paramB', min: 0.0, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Rot X', id: 'paramC', min: 0.0, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Rot Z', id: 'paramD', min: 0.0, max: 6.28, step: 0.01, default: 0.0, scale: 'pi' },
        { label: 'Z Shift (Man)', id: 'paramE', min: -1.0, max: 1.0, step: 0.01, default: 0.0 },
        { label: 'Center Z', id: 'paramF', min: 0.0, max: 1.0, step: 1.0, default: 1.0 },
    ],

    defaultPreset: {
        "version": 1,
        "name": "MengerSponge",
        "formula": "MengerSponge",
        "features": {
            "coreMath": {
                "iterations": 10,
                "paramA": 3,
                "paramB": 1.013,
                "paramC": 0.031415926535897934,
                "paramD": 0,
                "paramE": 0.02,
                "paramF": 1
            },
            "geometry": {
                "applyTransformLogic": true,
                "preRotMaster": true,
                "hybridComplex": false,
                "burningEnabled": false,
                "hybridMode": false,
                "hybridIter": 0,
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
                "preRot": { "x": 0, "y": 0, "z": 0 },
                "julia": { "x": 0, "y": 0, "z": 0 }
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
                "shadowSteps": 128,
                "shadowSoftness": 2000.0000000000002,
                "shadowIntensity": 0.8,
                "shadowBias": 0.001,
                "lights": [
                    {
                        "type": 'Point',
                        "position": { "x": -0.9689439564723806, "y": 1.464759551794367, "z": 1.3253877287915055 },
                        "rotation": { "x": 0, "y": 0, "z": 0 },
                        "color": "#ffffff",
                        "intensity": 5,
                        "falloff": 0,
                        "falloffType": "Linear",
                        "fixed": false,
                        "visible": true,
                        "castShadow": true
                    },
                    {
                        "type": 'Point',
                        "position": { "x": -4, "y": -2, "z": 1 },
                        "rotation": { "x": 0, "y": 0, "z": 0 },
                        "color": "#3344ff",
                        "intensity": 0.5,
                        "falloff": 0,
                        "falloffType": "Linear",
                        "fixed": false,
                        "visible": false,
                        "castShadow": false
                    },
                    {
                        "type": 'Point',
                        "position": { "x": 2.068536018579901, "y": 1.017402618613485, "z": 2.7478079181187756 },
                        "rotation": { "x": 0, "y": 0, "z": 0 },
                        "color": "#ff3300",
                        "intensity": 0.3,
                        "falloff": 0,
                        "falloffType": "Linear",
                        "fixed": false,
                        "visible": false,
                        "castShadow": true
                    }
                ]
            },
            "ao": {
                "aoIntensity": 0.5,
                "aoSpread": 5,
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
                "fogNear": 2,
                "fogFar": 10,
                "fogColor": "#000000",
                "fogDensity": 0,
                "glowIntensity": 0,
                "glowSharpness": 0,
                "glowMode": false,
                "glowColor": "#ffffff"
            },
            "materials": {
                "diffuse": 1,
                "reflection": 0,
                "specular": 0.2,
                "roughness": 0.8,
                "rim": 0,
                "rimExponent": 4,
                "envStrength": 0,
                "envMapVisible": false,
                "envBackgroundStrength": 1,
                "envSource": 1,
                "envMapData": null,
                "useEnvMap": false,
                "envRotation": 0,
                "envGradientStops": [],
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
                "gradient": [
                    { "id": "1767569325432_0", "position": 0, "color": "#3d5941", "bias": 0.5, "interpolation": "linear" },
                    { "id": "1767569325432_1", "position": 0.167, "color": "#778868", "bias": 0.5, "interpolation": "linear" },
                    { "id": "1767569325432_2", "position": 0.333, "color": "#b5b991", "bias": 0.5, "interpolation": "linear" },
                    { "id": "1767569325432_3", "position": 0.5, "color": "#f6edbd", "bias": 0.5, "interpolation": "linear" },
                    { "id": "1767569325432_4", "position": 0.667, "color": "#edbb8a", "bias": 0.5, "interpolation": "linear" },
                    { "id": "1767569325432_5", "position": 0.833, "color": "#de8a5a", "bias": 0.5, "interpolation": "linear" },
                    { "id": "1767569325432_6", "position": 1, "color": "#ca562c", "bias": 0.5, "interpolation": "linear" }
                ],
                "mode": 6,
                "scale": 3.0985303168818445,
                "offset": -0.19383131979877546,
                "repeats": 3.1,
                "phase": -0.19,
                "bias": 1,
                "twist": 0,
                "escape": 1.9,
                "gradient2": [
                    { "id": "1", "position": 0, "color": "#000000" },
                    { "id": "2", "position": 1, "color": "#ffffff" }
                ],
                "mode2": 5,
                "scale2": 1,
                "offset2": 0,
                "repeats2": 1,
                "phase2": 0,
                "bias2": 1,
                "twist2": 0,
                "blendMode": 0,
                "blendOpacity": 0,
                "layer3Color": "#ffffff",
                "layer3Scale": 10,
                "layer3Strength": 0,
                "layer3Bump": 0,
                "layer3Turbulence": 0
            },
            "texturing": {
                "active": false,
                "layer1Data": null,
                "mapU": 6,
                "mapV": 1,
                "scaleX": 1,
                "scaleY": 1,
                "offset": { "x": 0, "y": 0 },
                "textureScale": { "x": 1, "y": 1 }
            },
            "quality": {
                "engineQuality": true,
                "compilerHardCap": 500,
                "precisionMode": 0,
                "bufferPrecision": 0,
                "maxSteps": 200,
                "distanceMetric": 0,
                "estimator": 4.0, // Linear (2.0)
                "fudgeFactor": 1,
                "detail": 1,
                "pixelThreshold": 0.001,
                "dynamicScaling": false,
                "interactionDownsample": 2
            },
            "droste": {
                "active": false,
                "tiling": 1,
                "center": { "x": 0, "y": 0 },
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
                "camFov": 50,
                "orthoScale": 2,
                "dofStrength": 0,
                "dofFocus": 10
            },
            "navigation": {
                "flySpeed": 0.5,
                "autoSlow": true
            },
            "audio": {
                "threshold": 0.1,
                "agcEnabled": false,
                "attack": 0.1,
                "decay": 0.3,
                "highPass": 20,
                "lowPass": 20000,
                "gain": 1
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
        "cameraPos": { "x": 0, "y": 0, "z": 0 },
        "cameraRot": { "x": -0.3055326162805782, "y": -0.23752826799481133, "z": -0.07899585109054458, "w": 0.9186891736613698 },
        "sceneOffset": {
            "x": -1, "y": 2, "z": 3.119999885559082,
            "xL": -0.39253043132449095, "yL": 0.18842446748702635, "zL": -0.2519678286475089
        },
        "targetDistance": 2.622157335281372,
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
                "camera.rotation.x": {
                    "id": "camera.rotation.x",
                    "type": "float",
                    "label": "Rotation X",
                    "keyframes": [
                        {
                            "id": "KoW4EYIMgfLoxoT_r4KAE",
                            "frame": 0,
                            "value": 0,
                            "interpolation": "Bezier",
                            "autoTangent": true,
                            "brokenTangents": false,
                            "leftTangent": { "x": -10, "y": 0 },
                            "rightTangent": { "x": 10, "y": 0 }
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
                            "id": "AT-wEJo4mdYoM0MvWd6xG",
                            "frame": 0,
                            "value": 0,
                            "interpolation": "Bezier",
                            "autoTangent": true,
                            "brokenTangents": false,
                            "leftTangent": { "x": -10, "y": 0 },
                            "rightTangent": { "x": 10, "y": 0 }
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
                            "id": "uMhOFCTiQqjimzovOeNOw",
                            "frame": 0,
                            "value": 0,
                            "interpolation": "Bezier",
                            "autoTangent": true,
                            "brokenTangents": false,
                            "leftTangent": { "x": -10, "y": 0 },
                            "rightTangent": { "x": 10, "y": 0 }
                        }
                    ],
                    "hidden": false
                },
                "camera.unified.x": {
                    "id": "camera.unified.x",
                    "type": "float",
                    "label": "Position X",
                    "keyframes": [
                        {
                            "id": "KDJPK35MTTYqIT89SUPvF",
                            "frame": 0,
                            "value": 0,
                            "interpolation": "Bezier",
                            "autoTangent": true,
                            "brokenTangents": false,
                            "leftTangent": { "x": -10, "y": 0 },
                            "rightTangent": { "x": 10, "y": 0 }
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
                            "id": "xB73KjtjCvr7BAEwPhM7y",
                            "frame": 0,
                            "value": 0,
                            "interpolation": "Bezier",
                            "autoTangent": true,
                            "brokenTangents": false,
                            "leftTangent": { "x": -10, "y": 0 },
                            "rightTangent": { "x": 10, "y": 0 }
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
                            "id": "cmatJ34LXn2yxCaJEyqVz",
                            "frame": 0,
                            "value": 4.12,
                            "interpolation": "Bezier",
                            "autoTangent": true,
                            "brokenTangents": false,
                            "leftTangent": { "x": -10, "y": 0 },
                            "rightTangent": { "x": 10, "y": 0 }
                        }
                    ],
                    "hidden": false
                }
            }
        },
        "duration": 300
    }
};
