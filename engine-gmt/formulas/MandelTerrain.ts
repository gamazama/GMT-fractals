
import { FractalDefinition } from '../types';

export const MandelTerrain: FractalDefinition = {
    id: 'MandelTerrain',
    name: 'MandelTerrain',
    shortDescription: '3D Heightmap of the Mandelbrot set. Creates alien landscapes and "Math Mountains".',
    description: 'A 3D Heightmap of the Mandelbrot set. Iterations slider controls terrain detail.',
    juliaType: 'julia',
    
    shader: {
        function: `
    void formula_MandelTerrain(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec2 p = z.xz;
        
        // --- Zoom Logic ---
        float zoomVal = uParamB; 
        float zoom = pow(2.0, zoomVal);
        vec2 center = uVec2A;
        
        // Map 3D pos to 2D Complex Plane
        vec2 mapPos = p * (2.0 / zoom) + center;
        
        // --- Julia / Mandelbrot Switch ---
        vec2 c2;
        vec2 z2;
        vec2 dz;
        
        bool isJulia = uJuliaMode > 0.5;
        
        if (isJulia) {
            // Julia Mode: C is constant, Z starts at pixel
            c2 = uJulia.xy;
            z2 = mapPos;
            dz = vec2(1.0, 0.0); // Derivative starts at 1
        } else {
            // Mandelbrot Mode: C is pixel, Z starts at 0
            c2 = mapPos;
            z2 = vec2(0.0);
            dz = vec2(0.0); // Derivative starts at 0
        }
        
        float m2 = 0.0;
        float trapDist = 1e20;
        
        // Accumulate trap height (Summation for smooth blending)
        float trapHeightAccum = 0.0;
        float runAtten = 1.0;
        
        // Fixed Attenuation Factor (User Preference)
        float attenDecay = 0.777;
        
        // COMPILER OPTIMIZATION: Use int loop with uLoopGuard
        int maxIter = int(uIterations);
        int limit = maxIter;
        
        float iter = 0.0;
        float smoothVal = 0.0;
        float dist = 0.0;
        bool escaped = false;
        // Captured iteration index at escape — survives loop scope for post-loop height math.
        float iEsc = 0.0;

        // Local hard limit high enough for deep zooms but low enough to avoid compiler hangs
        const int MAX_FORMULA_ITER = 2000;

        for(int i=0; i<MAX_FORMULA_ITER; i++) {
            if (i > limit) break;

            // --- BURNING SHIP SUPPORT ---
            if (uBurningEnabled > 0.5) {
                 // Flip derivative to maintain DE continuity across axes
                 dz *= sign(z2 + vec2(1e-10));
                 z2 = abs(z2);
            }

            // Derivative: dz = 2*z*dz (+ 1 if Mandelbrot)
            // (Chain rule for z^2 + c)
            float dzx = 2.0 * (z2.x * dz.x - z2.y * dz.y);
            float dzy = 2.0 * (z2.x * dz.y + z2.y * dz.x);
            
            if (!isJulia) {
                dzx += 1.0;
            }
            
            dz = vec2(dzx, dzy);

            // Z = Z^2 + C
            float x = (z2.x * z2.x - z2.y * z2.y) + c2.x;
            float y = (2.0 * z2.x * z2.y) + c2.y;
            z2 = vec2(x, y);
            
            m2 = dot(z2, z2);

            // Standard Trap Tracking (for coloring)
            trapDist = min(trapDist, m2);

            // Per-component orbit trap (modes 10/12/13 = Orbit X/Z/W).
            // Project c-plane orbit z2 → XZ; leave Y at 1e10 so the per-component min
            // for Y doesn't get clamped to zero (Y has no signal in 2D iteration).
            g_orbitTrap = min(g_orbitTrap, vec4(abs(z2.x), 1.0e10, abs(z2.y), m2));

#ifdef TRAP_ENABLED
            // Geometric orbit trap — c-plane orbit projected to XZ (Y=0) so 3D trap
            // shapes evaluate against the same plane the terrain is rendered on.
            // The outer-loop trap injection only fires once for self-contained formulas;
            // this inner loop is where the real orbit samples accumulate.
            //
            //  - Skip i=0: z2 is the unperturbed sample point; including it
            //    contaminates every pixel with its own distance to the trap
            //    shape, painting a Point/Plane projection through the origin.
            //  - Respect uColorIter: when the user caps coloring at iter N,
            //    stop accumulating beyond N so the trap freezes too — same
            //    semantic the standard savedGeomTrap snapshot path applies
            //    for non-self-contained formulas (de.ts). Hard-freezing here
            //    rather than snapshotting works because the outer map()
            //    mix(g_geomTrap, savedGeomTrap, ...) sees the already-capped
            //    value and the mix becomes a no-op.
            // No uColorIter gate here. The earlier inner cap (uColorIter or
            // float i <= uColorIter) froze accumulation to inner iters 1..N
            // which, for MandelTerrain c-plane orbit, sit at similar
            // distances per pixel before the orbit gets close to the trap
            // shape — savedGeomTrap then captured a visually-flat value.
            // Accumulate the full inner-loop min and let the outer-loop
            // snapshot in de.ts handle whatever capping is meaningful. For
            // self-contained formulas the outer loop runs once so
            // uColorIter has limited effect on this trap; acceptable.
            if (i > 0) {
                vec3 _zp = vec3(z2.x, 0.0, z2.y);
                vec3 _d = _zp - uTrapCenter;
                float _td;
                int _ts = int(uTrapShape + 0.1);
                if (_ts == 1) _td = length(_d);
                else if (_ts == 2) _td = abs(length(_d) - uTrapRadius);
                else if (_ts == 3) _td = min(min(abs(_d.x), abs(_d.y)), abs(_d.z));
                else _td = abs(dot(_zp, uTrapNormal) - uTrapOffset);
                g_geomTrap = min(g_geomTrap, _td);
            }
#endif
            
            // --- Trap Height Accumulation ---
            // Sum contributions. 
            // Allow negative param D to work (abs check)
            if (abs(uParamD) > 0.001 && m2 < 0.25) {
                float distToOrigin = sqrt(m2);
                
                // Smooth shape (Metaball-like blending)
                float t = smoothstep(0.5, 0.0, distToOrigin);
                
                // Accumulate with attenuation
                trapHeightAccum += t * runAtten;
            }
            
            // Decay influence for deeper iterations
            runAtten *= attenDecay;
            
            // Use global Escape Threshold (usually squared radius)
            // Default escape is 4.0 (radius 2.0), but allowing it to grow helps decomposition
            if (m2 > uEscapeThresh) {
                escaped = true;
                iEsc = float(i);
                // Smooth Iteration Count
                // Renormalize based on log of threshold to keep bands consistent
                float threshLog = log2(uEscapeThresh); // usually 2.0 for 4.0
                smoothVal = float(i) + 1.0 - log2(log2(m2) / threshLog);
                
                // Analytical Distance Estimation
                float r = sqrt(m2);
                float dr_mag = length(dz);
                dist = 0.5 * log(m2) * r / dr_mag;
                
                // CRITICAL: Overwrite Trap with Magnitude ONLY for "Potential" Coloring Mode (8)
                // Otherwise preserve minTrap for Orbit Trap Mode (0)
                if (abs(uColorMode - 8.0) < 0.1 || abs(uColorMode2 - 8.0) < 0.1) {
                    trapDist = r; 
                }
                break;
            }
        }
        
        // --- Heightmap Calculation ---
        float h = 0.0;

        if (escaped) {
            // 1. Base Terrain (Param A) — analytical DE spike.
            // 'dist' goes to 0.0 exactly at the boundary.
            // sqrt(dist * zoom) keeps height proportional to feature width across zoom levels.
            h += sqrt(dist * zoom) * uParamA;

            // 1b. Cosine-ledge terrain (Param E) — C¹-continuous wedding-cake terraces.
            // Each iteration band contributes a smooth half-cosine ramp. The 0.1 scale
            // brings paramE into the same visual range as paramA/paramC.
            if (abs(uParamE) > 0.001) {
                float lr = log2(max(sqrt(m2), 1.0e-20));
                float lrT = 0.5 * log2(max(uEscapeThresh, 4.0));
                float sy = clamp((lr - lrT) * 0.7071067811865476, 0.0, 1.0); // 1/sqrt(2)
                float ps = 0.5 - 0.5 * cos(3.14159265358 * sy);
                float ledge = 1.0 - (iEsc + ps) / max(float(maxIter), 1.0);
                h += ledge * uParamE * 0.1;
            }
        } else {
            // Inside the set (The Lake)
            h = 0.0;
        }

        // 2. Layer 2 Driven Ripples (Param C) — applied to both escaped terrain
        //    and the island. Inside the set, z2/trapDist reflect the trapped orbit's
        //    final state, so coloring modes like Orbit Trap / Iterations give
        //    meaningful surface texture on the island as well.
        if (abs(uParamC) > 0.001) {
            // Compute Decomposition Angle for Mapping
            float decomp = atan(z2.y, z2.x) * 0.15915 + 0.5;

            // Construct proxy result to feed coloring engine
            // Components: x=dist, y=trap, z=iter, w=decomp
            vec4 resProxy = vec4(0.0, trapDist, smoothVal, decomp);

            // Construct 3D pos proxy using the mapping position (consistent texture space)
            vec3 pProxy = vec3(mapPos.x, 0.0, mapPos.y);

            // Get Mapping Value from Layer 2 Mode (e.g. Angle, Trap, Iterations)
            float l2Val = getMappingValue(uColorMode2, pProxy, resProxy, vec3(0,1,0), uColorScale2);

            // Apply Twist 2 if active
            if (abs(uColorTwist2) > 0.001) {
                float dOrig = length(pProxy);
                l2Val += dOrig * uColorTwist2;
            }

            // Calculate Pattern Phase
            float t2Raw = l2Val * uColorScale2 + uColorOffset2;
            float t2 = fract(t2Raw);

            // Sample Gradient 2 for height (Whiteness = Height)
            // SAFE HELPER: Using textureLod0 via math.ts
            vec3 gCol = textureLod0(uGradientTexture2, vec2(t2, 0.5)).rgb;
            float brightness = dot(gCol, vec3(0.299, 0.587, 0.114));

            // Apply Displacement
            h += brightness * uParamC;
        }
        
        // 3. Orbit Trap Spikes (Param D)
        // Scaled by Zoom to maintain relative visual height
        // Supports negative values (depressions)
        if (abs(uParamD) > 0.001) {
            h += trapHeightAccum * uParamD * zoom * 0.03;
        }

        h = clamp(h, -50.0, 50.0);

        // SDF Calculation (y is Up)
        float d = (z.y - h) * 0.5;
        
        // --- Output ---
        
        // Encode Angle into Z so DE_MASTER can extract Decomposition
        float angle = 0.0;
        if (dot(z2, z2) > 1e-9) {
            angle = atan(z2.y, z2.x);
        }
        
        float mag = abs(d);
        z = vec4(mag * cos(angle), mag * sin(angle), 0.0, 0.0);
        
        // Final Trap Output: Either minTrap or Magnitude (if escaped)
        // Fix: Use sqrt of trapDist to normalize Orbit Trap coloring range
        trap = sqrt(trapDist);
        dr = smoothVal;
    }`,
        // Self-contained SDE: formula runs its own full loop; outer loop fires once then breaks.
        selfContainedSDE: true,
        loopBody: `formula_MandelTerrain(z, dr, trap, c); break;`,
        getDist: `
            // Standard return
            return vec2(r, dr);
        `
    },

    parameters: [
        { label: 'Map Zoom', id: 'paramB', min: 0.0, max: 16.0, step: 0.01, default: 1.0 },
        { label: 'Pan (Real, Imag)', id: 'vec2A', type: 'vec2', min: -2.0, max: 2.0, step: 0.0001, default: { x: 0.0, y: 0.0 } },
        { label: 'Height: Distance Estimator', id: 'paramA', min: -5.0, max: 5.0, step: 0.01, default: 0.0 },
        { label: 'Height: Layer 2 Gradient', id: 'paramC', min: -0.2, max: 0.2, step: 0.001, default: 0.0 },
        { label: 'Height: SmoothTrap', id: 'paramD', min: -5.0, max: 5.0, step: 0.01, default: 0.0 },
        { label: 'Height: Ledge (cosine bands)', id: 'paramE', min: -2.0, max: 2.0, step: 0.01, default: 0.0 },
    ],

    defaultPreset: {
        "version": 1,
        "name": "MandelTerrain",
        "formula": "MandelTerrain",
        "features": {
            "coreMath": {
                "iterations": 60,
                "paramA": 0,
                "paramB": 1,
                "paramC": 0,
                "paramD": 0,
                "paramE": 0,
                "vec2A": { "x": 0, "y": 0 }
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
                "juliaX": -0.86,
                "juliaY": -0.22,
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
                "shadowSoftness": 19.5,
                "shadowIntensity": 1,
                "shadowBias": 0.0001,
                "lights": [
                    {
                        "type": "Point",
                        "position": { "x": -0.77, "y": 1.82, "z": -0.49 },
                        "rotation": { "x": 0, "y": 0, "z": 0 },
                        "color": "#ffeedd",
                        "intensity": 2,
                        "falloff": 0,
                        "falloffType": "Quadratic",
                        "fixed": false,
                        "visible": true,
                        "castShadow": true
                    },
                    {
                        "type": "Point",
                        "position": { "x": -5, "y": 2, "z": -5 },
                        "rotation": { "x": 0, "y": 0, "z": 0 },
                        "color": "#4455aa",
                        "intensity": 1,
                        "falloff": 0,
                        "falloffType": "Quadratic",
                        "fixed": true,
                        "visible": false,
                        "castShadow": false
                    },
                    {
                        "type": "Point",
                        "position": { "x": 0, "y": 5, "z": -5 },
                        "rotation": { "x": 0, "y": 0, "z": 0 },
                        "color": "#ffffff",
                        "intensity": 0.5,
                        "falloff": 0,
                        "falloffType": "Quadratic",
                        "fixed": true,
                        "visible": false,
                        "castShadow": false
                    }
                ]
            },
            "ao": {
                "aoIntensity": 0,
                "aoSpread": 0.11,
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
                "fogFar": 30,
                "fogColor": "#051020",
                "fogDensity": 0.02,
                "glowIntensity": 0,
                "glowSharpness": 3.8,
                "glowMode": false,
                "glowColor": "#ffffff"
            },
            "materials": {
                "diffuse": 1,
                "reflection": 0,
                "specular": 0,
                "roughness": 0.2,
                "rim": 0,
                "rimExponent": 3,
                "envStrength": 0,
                "envMapVisible": false,
                "envBackgroundStrength": 1,
                "envSource": 1,
                "envMapData": null,
                "useEnvMap": true,
                "envRotation": 0,
                "envGradientStops": [
                    { "id": "1", "position": 1, "color": "#ffffff", "bias": 0.5, "interpolation": "linear" }
                ],
                "emission": 0.3,
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
                    { "id": "0", "position": 0, "color": "#001133", "bias": 0.5, "interpolation": "linear" },
                    { "id": "1", "position": 0.153, "color": "#0063A5", "bias": 0.5, "interpolation": "linear" },
                    { "id": "2", "position": 0.324, "color": "#0093F5", "bias": 0.749, "interpolation": "linear" },
                    { "id": "3", "position": 0.895, "color": "#FFFFFF", "bias": 0.5, "interpolation": "linear" },
                    { "id": "4", "position": 0.908, "color": "#000000", "bias": 0.5, "interpolation": "linear" }
                ],
                "mode": 7,
                "scale": 0.2710027100271003,
                "offset": -0.007588075880758799,
                "repeats": 1,
                "phase": -0.2,
                "bias": 1,
                "twist": 0,
                "escape": 20,
                "gradient2": [
                    { "id": "1", "position": 0.077, "color": "#000000", "bias": 0.52, "interpolation": "smooth" },
                    { "id": "2", "position": 0.196, "color": "#020202", "bias": 0.83, "interpolation": "smooth" },
                    { "id": "3", "position": 0.857, "color": "#000000", "bias": 0.5, "interpolation": "linear" },
                    { "id": "4", "position": 0.925, "color": "#797979", "bias": 0.5, "interpolation": "linear" }
                ],
                "mode2": 0,
                "scale2": 0.74,
                "offset2": 0.55,
                "repeats2": 1,
                "phase2": 0.43,
                "bias2": 1,
                "twist2": 0,
                "blendMode": 0,
                "blendOpacity": 0
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
                "maxSteps": 300,
                "distanceMetric": 2,
                "estimator": 0,
                "fudgeFactor": 0.35,
                "detail": 1.1,
                "pixelThreshold": 0.5,
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
                "saturation": 1.5,
                "levelsMin": 0,
                "levelsMax": 0.5,
                "levelsGamma": 0.77
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
        "cameraRot": { "x": -0.7071067811865476, "y": 0, "z": 0, "w": 0.7071067811865475 },
        "sceneOffset": {
            "x": -0.082, "y": 3.17, "z": -0.38,
            "xL": 0.082, "yL": -0.1700000000000009, "zL": 0.3800000000000002
        },
        "targetDistance": 2.997344970703125,
        "cameraMode": "Orbit",
        "lights": []
    }
};
