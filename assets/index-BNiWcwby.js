import{bM as o,a4 as e}from"./FormulaFormat-DtFqngnY.js";import"./three-fiber-Ckg3Mgb3.js";import"./three-CA7fxsrE.js";import"./three-drei-BEFRS5Tk.js";import"./pako-DwGzBETv.js";const t={id:"Mandelbulb",name:"Mandelbulb",shortDescription:"The classic 3D extension of the Mandelbrot set. Features organic, broccoli-like recursive structures.",description:'The classic 3D extension of the Mandelbrot set. Features standard Power controls plus the "Radiolaria" mutation for skeletal/hollow effects.',juliaType:"julia",shader:{function:`
        void formula_Mandelbulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float r = length(z3);
            
            // Standard derivative — reuse pow(r, power-1) for both dr and zr
            float power = uParamA;
            float rp1 = pow(r, power - 1.0);
            dr = rp1 * power * dr + 1.0;

            // Spherical exponentiation
            float theta = acos(clamp(z3.z / r, -1.0, 1.0));
            float phi = atan(z3.y, z3.x);

            // Apply Power & Phase Shifts
            theta = theta * power + uVec2A.x;
            phi = phi * power + uVec2A.y;

            float zr = rp1 * r;
            z3 = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
            
            // Optional Z-Twist (Param D)
            if (abs(uParamD) > 0.001) {
                float twist = z3.z * uParamD;
                float s = sin(twist);
                float c_ = cos(twist);
                z3.xy = mat2(c_, -s, s, c_) * z3.xy;
            }

            z3 += c.xyz;
            
            // --- RADIOLARIA MUTATION (Tom Beddard) ---
            // Applied AFTER iteration to affect the triplex structure, not the world bounding box.
            // vec2B.x = toggle (on/off), vec2B.y = limit value
            if (uVec2B.x > 0.5) {
                z3.y = min(z3.y, uVec2B.y);
            }
            
            z.xyz = z3;
            trap = min(trap, length(z3));
        }`,loopBody:"formula_Mandelbulb(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:2,max:16,step:.001,default:8},{label:"Phase (θ, φ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.1,default:{x:0,y:0},scale:"pi"},{label:"Z Twist",id:"paramD",min:-2,max:2,step:.01,default:0},{label:"Radiolaria",id:"vec2B",type:"vec2",min:-2,max:2,step:.01,default:{x:0,y:.5},mode:"mixed"}],defaultPreset:{formula:"Mandelbulb",features:{coreMath:{iterations:16,paramA:8,paramD:0,vec2A:{x:0,y:0},vec2B:{x:0,y:.5}},geometry:{hybridMode:!1,hybridIter:0,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1,hybridSwap:!1,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0},coloring:{mode:0,repeats:2,phase:0,scale:1,offset:0,bias:1,twist:0,escape:1.2,mode2:4,repeats2:7,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],gradient2:[{id:"1767363622003",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"1767363615540",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},atmosphere:{fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:50,glowColor:"#ffffff",glowMode:!1},ao:{aoIntensity:.28,aoSpread:.5,aoMode:!1,aoEnabled:!0,aoSamples:5,aoStochasticCp:!0},materials:{reflection:.2,specular:1,roughness:.75,diffuse:1,envStrength:.3,rim:0,rimExponent:3,emission:0,emissionMode:0,emissionColor:"#ffffff",envMapVisible:!1,useEnvMap:!0,envSource:1,envGradientStops:[{id:"hor",position:0,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}]},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.001},quality:{detail:1,fudgeFactor:1,pixelThreshold:.2,maxSteps:300,distanceMetric:0,estimator:0},optics:{dofStrength:0,dofFocus:2},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1}},cameraPos:{x:0,y:0,z:2.157},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:1,xL:0,yL:0,zL:-.157},targetDistance:2.157,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.7,y:.37,z:1.4},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:3,falloff:.22,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.6,y:-.5,z:1.4},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!1}]}},i={id:"Mandelbar3D",name:"Mandelbar 3D",shortDescription:"The 3D Tricorn. Features heavy shelving and tri-corner symmetry.",description:"The 3D extension of the Tricorn (Mandelbar) fractal: x²-y²-z², 2xy, -2xz. The conjugation on z creates the distinctive tri-corner symmetry. Supports rotation, offset, and twist.",juliaType:"julia",shader:{function:`
    void formula_Mandelbar3D(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = 2.0 * x * y;
        z3.z = -2.0 * x * z_;

        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;

        // Scale (A)
        float scale = uParamA;
        z3 = z3 * scale + c.xyz;

        // Vec3A: Offset X/Y/Z
        z3 += uVec3A;

        dr *= abs(scale);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopBody:"formula_Mandelbar3D(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Offset",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Mandelbar3D",features:{coreMath:{iterations:26,paramA:1.303,paramF:0,vec3A:{x:.309,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:0,scale:1,offset:0,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:0,blendMode:2,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766240207225_0",position:0,color:"#3d5941",bias:.5,interpolation:"linear"},{id:"1766240207225_1",position:.167,color:"#778868",bias:.5,interpolation:"linear"},{id:"1766240207225_2",position:.333,color:"#b5b991",bias:.5,interpolation:"linear"},{id:"1766240207225_3",position:.5,color:"#f6edbd",bias:.5,interpolation:"linear"},{id:"1766240207225_4",position:.667,color:"#edbb8a",bias:.5,interpolation:"linear"},{id:"1766240207225_5",position:.833,color:"#de8a5a",bias:.5,interpolation:"linear"},{id:"1766240207225_6",position:1,color:"#ca562c",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:1e-4,glowSharpness:1,glowColor:"#ffffff",glowMode:!1,aoIntensity:.37,aoSpread:.1},materials:{reflection:.35,specular:0,roughness:.38,diffuse:0,envStrength:0,rim:0,rimExponent:2,emission:2.59,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:.04,juliaY:-.12,juliaZ:-.24},lighting:{shadows:!0,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:1.17,fudgeFactor:.7,pixelThreshold:.13,aaMode:"Auto",aaLevel:1}},cameraPos:{x:-.9750951483888902,y:.4967096298390524,z:-1.878572142465631},cameraRot:{x:-.35319547668295764,y:.8984954585062485,z:.19510512782513617,w:-.17289550425237224},sceneOffset:{x:0,y:0,z:0,xL:-.003768067067355675,yL:.19239495665458275,zL:-.5314800136479048},lights:[{type:"Point",position:{x:-.34,y:.2,z:1.76},rotation:{x:0,y:0,z:0},color:"#F0F0FF",useTemperature:!0,temperature:6500,intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},r={id:"Quaternion",name:"Quaternion",shortDescription:'A 3D slice of a 4D Julia set. Use the "Slice W" and Rotations to morph the object.',description:"A 4D Julia set projected into 3D. Features 4D rotations, iteration damping for smooth variants, and optional spherical inversion (Kosalos) for inside-out effects.",juliaType:"julia",shader:{function:`
    vec4 quatSquare(vec4 q) {
        return vec4(q.x*q.x - q.y*q.y - q.z*q.z - q.w*q.w, 2.0*q.x*q.y, 2.0*q.x*q.z, 2.0*q.x*q.w);
    }

    void formula_Quaternion(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // 3D Rotations (vec2A: XY, XZ)
        float angXY = uVec2A.x;
        if (abs(angXY) > 0.0) {
            float s = sin(angXY), c_ = cos(angXY);
            z.xy = mat2(c_, -s, s, c_) * z.xy;
        }

        float angXZ = uVec2A.y;
        if (abs(angXZ) > 0.0) {
            float s = sin(angXZ), c_ = cos(angXZ);
            z.xz = mat2(c_, -s, s, c_) * z.xz;
        }

        // 4D Rotations (vec2B: XW, YW)
        float angXW = uVec2B.x;
        if (abs(angXW) > 0.0) {
            float s = sin(angXW), c_ = cos(angXW);
            vec2 xw = vec2(z.x, z.w);
            xw = mat2(c_, -s, s, c_) * xw;
            z.x = xw.x; z.w = xw.y;
        }

        float angYW = uVec2B.y;
        if (abs(angYW) > 0.0) {
            float s = sin(angYW), c_ = cos(angYW);
            vec2 yw = vec2(z.y, z.w);
            yw = mat2(c_, -s, s, c_) * yw;
            z.y = yw.x; z.w = yw.y;
        }

        // Save pre-iteration state for damping
        vec4 oldZ = z;

        // Chain Rule: Magnitude increases by 2*|z| + 1 (from +c)
        dr = 2.0 * length(z) * dr + 1.0;
        z = quatSquare(z) + c;

        // Iteration Damping (Kosalos variant)
        // Adds momentum feedback: smooths iteration trajectory
        if (abs(uParamC) > 0.001) {
            float den = 2.0 + abs(uParamC) * 100.0;
            z += (z - oldZ) / den;
        }

        trap = min(trap, dot(z,z));
    }`,loopBody:"formula_Quaternion(z, dr, trap, c);",loopInit:`
        // Spherical Inversion pre-transform (Kosalos variant)
        // Inverts space around a center point, creating inside-out shapes
        // Smooth blend: mix between original and inverted based on radius
        if (uParamD > 0.001) {
            vec3 invCenter = uVec3A;
            float invRadius = uParamD;
            float invAngle = uParamE;
            vec3 offset = z.xyz - invCenter;
            float r = length(offset);
            float r2 = max(r * r, 1.0e-8);
            vec3 inverted = (invRadius * invRadius / r2) * offset + invCenter;
            // Smooth blend: ramp from 0..1 over radius 0..1 to avoid hard pop
            float blend = smoothstep(0.0, 1.0, invRadius);
            z.xyz = mix(z.xyz, inverted, blend);
            // Optional angular twist
            if (abs(invAngle) > 0.001) {
                float an = atan(z.y, z.x) + invAngle;
                float ra = length(z.xy);
                z.x = cos(an) * ra;
                z.y = sin(an) * ra;
            }
            // Re-derive c after inversion (position changed)
            c = mix(vec4(z.xyz, uParamB), vec4(uJulia, uParamA), step(0.5, uJuliaMode));
        }`},parameters:[{label:"Julia C (W)",id:"paramA",min:-1,max:1,step:.001,default:-.252},{label:"Slice W",id:"paramB",min:-1,max:1,step:.001,default:-.222},{label:"Damping",id:"paramC",min:0,max:5,step:.01,default:0},{label:"Inversion Radius",id:"paramD",min:0,max:10,step:.01,default:0},{label:"Inversion Angle",id:"paramE",min:-10,max:10,step:.01,default:0},{label:"Rot 3D (XY, XZ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:-6.44,y:.29},scale:"pi"},{label:"Rot 4D (XW, YW)",id:"vec2B",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:-.21,y:.05},scale:"pi"},{label:"Inversion Center",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:.612,y:.381,z:.786}}],defaultPreset:{formula:"Quaternion",features:{coreMath:{iterations:20,paramA:-.252,paramB:-.222,paramC:0,paramD:0,paramE:0,vec2A:{x:-6.44,y:.29},vec2B:{x:-.21,y:.05},vec3A:{x:.612,y:.381,z:.786}},coloring:{mode:6,repeats:1,phase:.73,scale:1,offset:.73,bias:1,twist:0,escape:54.95,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766241181174_0",position:0,color:"#DA9F1C",bias:.5,interpolation:"linear"},{id:"1766241181174_1",position:.167,color:"#FA752D",bias:.5,interpolation:"linear"},{id:"1766241181174_2",position:.333,color:"#F0483F",bias:.5,interpolation:"linear"},{id:"1766241181174_3",position:.5,color:"#E3264F",bias:.5,interpolation:"linear"},{id:"1766241181174_4",position:.667,color:"#DC266B",bias:.5,interpolation:"linear"},{id:"1766241181174_5",position:.833,color:"#b9257a",bias:.5,interpolation:"linear"},{id:"1766241181174_6",position:1,color:"#7c1d6f",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:.23,glowSharpness:3.8,glowColor:"#ffffff",glowMode:!1,aoIntensity:0,aoSpread:2},materials:{reflection:.32,specular:.47,roughness:.5,diffuse:2,envStrength:0,rim:0,rimExponent:3.6,emission:1e-4,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!0,juliaX:.65,juliaY:-.2,juliaZ:-1.2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1,fudgeFactor:.8,pixelThreshold:.5,maxSteps:300,aaMode:"Always",aaLevel:1},optics:{dofStrength:0,dofFocus:10}},cameraPos:{x:-2.448955788675867,y:.7723538718365539,z:.32605384095213635},cameraRot:{x:-.1135398122615654,y:-.6512503200884421,z:-.09942502462227083,w:.7437045085887076},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:-.5453734613707567,yL:.10050638429037613,zL:-.211008843702685},cameraMode:"Orbit",lights:[{type:"Point",position:{x:-2.0026065897203154,y:.7668302923678636,z:.21579993050482316},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},l={id:"AmazingBox",name:"Amazing Box",shortDescription:"Architectural fractal discovered by Tglad. Creates complex geometric lattices and Borg-like structures.",description:"Also known as the Mandelbox (Tglad). A folding fractal that creates complex, machine-like architectural structures.",juliaType:"offset",shader:{function:`
    void formula_AmazingBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Pre-Fold Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        if (length(rot) > 0.001) {
             float sx = sin(rot.x), cx = cos(rot.x);
             float sy = sin(rot.y), cy = cos(rot.y);
             float sz = sin(rot.z), cz = cos(rot.z);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotY = mat2(cy, -sy, sy, cy);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xz = rotY * z3.xz;
             z3.xy = rotZ * z3.xy;
        }

        boxFold(z3, dr, uParamC);
        sphereFold(z3, dr, uParamB, uParamD);
        z.xyz = z3 * uParamA + c.xyz;
        dr = dr * abs(uParamA) + 1.0;
        trap = min(trap, abs(z.x));
    }`,loopBody:"formula_AmazingBox(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.5},{label:"Folding Limit",id:"paramC",min:.1,max:2,step:.001,default:1},{label:"Fixed Radius",id:"paramD",min:.1,max:3,step:.001,default:1},{label:"Pre-Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:0},mode:"axes",scale:"pi"}],defaultPreset:{formula:"AmazingBox",features:{coreMath:{iterations:21,paramA:2.566,paramB:1.026,paramC:1.445,paramD:1.637,vec3A:{x:3.14,y:0,z:1.57}},geometry:{juliaMode:!1,juliaX:.35,juliaY:.25,juliaZ:.15},atmosphere:{fogIntensity:1,fogColor:"#6DBAB7",fogNear:.7921,fogFar:7.5076,fogDensity:0,glowIntensity:1e-4,glowSharpness:1,aoIntensity:.32,aoSpread:.2925,aoMode:!1},materials:{diffuse:1.13,reflection:0,specular:2,roughness:.2,rim:0,rimExponent:1,emission:1e-4,envStrength:0,envMapVisible:!1},coloring:{mode:3,scale:113.5,offset:-5.465,repeats:69.1,phase:.36,bias:1,escape:32.06,gradient:[{id:"0",position:0,color:"#d3f2a3"},{id:"1",position:.167,color:"#97e196"},{id:"2",position:.333,color:"#6cc08b"},{id:"3",position:.5,color:"#4c9b82"},{id:"4",position:.667,color:"#217a79"},{id:"5",position:.833,color:"#105965"},{id:"6",position:1,color:"#074050"}],mode2:8,repeats2:96.2,phase2:-2.898,blendMode:6,gradient2:[{id:"0",position:0,color:"#ffffff"},{id:"1",position:.293,color:"#000000"},{id:"2",position:.903,color:"#ffffff"}],layer3Scale:89,layer3Strength:0},lighting:{shadows:!0,shadowSoftness:2e3,shadowIntensity:1,shadowBias:.0029},quality:{fudgeFactor:.5,detail:2,pixelThreshold:.5,maxSteps:300,distanceMetric:1,estimator:1},optics:{camType:0,camFov:60,orthoScale:17.5}},cameraPos:{x:.95989,y:1.13902,z:1.1791},cameraRot:{x:-.235,y:.3667,z:.2665,w:.8598},sceneOffset:{x:1,y:1,z:3,xL:-.65997,yL:-.75248,zL:-.10163},targetDistance:1.9,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.774,y:.079,z:3.089},rotation:{x:0,y:0,z:0},color:"#FFFFFF",intensity:50,falloff:50,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},s={id:"MengerSponge",name:"Menger Sponge",shortDescription:"The classic cubic fractal. Creates infinite grids and tech-like structures.",description:'The canonical Menger Sponge (Level N). Set Scale to 3.0 and Offset to 1.0 for the classic mathematical shape. Use "Center Z" to toggle between a corner fractal and the full cube.',juliaType:"none",shader:{function:`
    void formula_MengerSponge(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        if (length(rot) > 0.001) {
             float sx = sin(rot.x), cx = cos(rot.x);
             float sy = sin(rot.y), cy = cos(rot.y);
             float sz = sin(rot.z), cz = cos(rot.z);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotY = mat2(cy, -sy, sy, cy);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xz = rotY * z3.xz;
             z3.xy = rotZ * z3.xy;
        }

        z3 = abs(z3);
        // Branchless sorting network (descending: x >= y >= z)
        vec3 s = z3;
        z3.x = max(max(s.x, s.y), s.z);
        z3.z = min(min(s.x, s.y), s.z);
        z3.y = s.x + s.y + s.z - z3.x - z3.z;

        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        vec3 offset = uVec3B;

        // IFS Shift: offset * (scale - 1.0) — per-axis
        vec3 shift = offset * (scale - 1.0);

        z3 = z3 * scale - shift;

        // Param C: Center Z (The "Full Sponge" Correction)
        // If active, this conditional shift restores the full cubic symmetry
        if (uParamC > 0.5) {
            z3.z += shift.z * step(z3.z, -0.5 * shift.z);
        }

        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, length(z3 - c.xyz));
    }`,loopBody:"formula_MengerSponge(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:3},{label:"Offset",id:"vec3B",type:"vec3",min:0,max:2,step:.001,default:{x:1,y:1,z:1},linkable:!0},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Center Z",id:"paramC",min:0,max:1,step:1,default:1}],defaultPreset:{formula:"MengerSponge",features:{coreMath:{iterations:10,paramA:3,paramC:1,vec3A:{x:.031,y:0,z:0},vec3B:{x:1.013,y:1.013,z:1.043}},coloring:{gradient:[{id:"1767569325432_0",position:0,color:"#3d5941",bias:.5,interpolation:"linear"},{id:"1767569325432_1",position:.167,color:"#778868",bias:.5,interpolation:"linear"},{id:"1767569325432_2",position:.333,color:"#b5b991",bias:.5,interpolation:"linear"},{id:"1767569325432_3",position:.5,color:"#f6edbd",bias:.5,interpolation:"linear"},{id:"1767569325432_4",position:.667,color:"#edbb8a",bias:.5,interpolation:"linear"},{id:"1767569325432_5",position:.833,color:"#de8a5a",bias:.5,interpolation:"linear"},{id:"1767569325432_6",position:1,color:"#ca562c",bias:.5,interpolation:"linear"}],mode:6,scale:3.099,offset:-.194,repeats:3.1,phase:-.19,bias:1,twist:0,escape:1.9,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:10,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},ao:{aoIntensity:.5,aoSpread:5,aoMode:!0,aoEnabled:!0},atmosphere:{fogIntensity:0,fogNear:2,fogFar:10,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:0,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1,reflection:0,specular:.2,roughness:.8,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[]},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:2e3,shadowIntensity:.8,shadowBias:.001},quality:{fudgeFactor:1,detail:1,pixelThreshold:.001,maxSteps:200,estimator:1},optics:{camFov:50,dofStrength:0,dofFocus:10},reflections:{enabled:!0,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.3055326162805782,y:-.23752826799481133,z:-.07899585109054458,w:.9186891736613698},sceneOffset:{x:-1,y:2,z:3.12,xL:-.393,yL:.188,zL:-.252},targetDistance:2.622,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.969,y:1.465,z:1.325},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:5,falloff:0,falloffType:"Linear",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-4,y:-2,z:1},rotation:{x:0,y:0,z:0},color:"#E8F0FF",useTemperature:!0,temperature:7e3,intensity:.5,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:2.069,y:1.017,z:2.748},rotation:{x:0,y:0,z:0},color:"#FFC58F",useTemperature:!0,temperature:3e3,intensity:.3,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!0}]}},n={id:"Kleinian",name:"Kleinian",shortDescription:"Inversion fractal. Resembles organic structures, coral, and sponge tissues.",description:"Based on Kleinian groups and inversion in a sphere. Creates intricate, bubbly, sponge-like structures.",juliaType:"offset",shader:{function:`
        void formula_Kleinian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        float limit = uParamB;
        z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        float r2 = max(dot(z3, z3), 1e-10);
        float k = max(uParamC / r2, 1.0);
        z3 *= k;
        dr *= k;
        
        // Apply Scale (A) and Offset (vec3A)
        z3 = z3 * uParamA + uVec3A + c.xyz;
        dr = dr * abs(uParamA) + 1.0;
        
        z.xyz = z3;
        trap = min(trap, r2);
    }`,loopBody:"formula_Kleinian(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:2.5,step:.001,default:1.8},{label:"Offset",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"Fold Size",id:"paramB",min:0,max:2,step:.001,default:1},{label:"K Factor",id:"paramC",min:.5,max:2,step:.001,default:1.2}],defaultPreset:{formula:"Kleinian",features:{coreMath:{iterations:53,paramA:2.058,paramB:.907,paramC:.976,vec3A:{x:0,y:0,z:0}},coloring:{mode:3,repeats:100,phase:0,scale:126.58,offset:67.08,bias:1,twist:0,escape:2,mode2:0,repeats2:100,phase2:0,blendMode:3,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"2",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.8275862068965517,color:"#3E3E3E",bias:.5,interpolation:"linear"},{id:"1767121500027",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},materials:{reflection:0,specular:0,roughness:.79,diffuse:2,envStrength:0,rim:0,rimExponent:1,emission:.148,emissionColor:"#ffffff",emissionMode:0,envMapVisible:!1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"1767120246151",position:0,color:"#88ccff",bias:.5,interpolation:"linear"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:.9454191033138402,color:"#88ccff",bias:.5,interpolation:"smooth"}]},atmosphere:{fogIntensity:1,fogNear:1e-4,fogFar:501,fogColor:"#5A81A3",fogDensity:0,glowIntensity:.035,glowSharpness:52,glowColor:"#ffffff",glowMode:!1,aoIntensity:.29,aoSpread:.1,aoMode:!1},lighting:{shadows:!0,shadowSoftness:82.64,shadowIntensity:1,shadowBias:.0014},quality:{detail:1,fudgeFactor:.8,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,distanceMetric:1,estimator:4},geometry:{juliaMode:!1,juliaX:.5,juliaY:.5,juliaZ:.5,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1},optics:{dofStrength:1e-4,dofFocus:.577}},cameraPos:{x:0,y:0,z:3.5},cameraRot:{x:0,y:0,z:.931234344584406,w:-.3644209042665525},cameraFov:80,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:.965,cameraMode:"Fly",lights:[{type:"Point",position:{x:.06202062498807429,y:.022274010144572264,z:3.439439471330585},rotation:{x:0,y:0,z:0},color:"#8FA9FF",intensity:.4,falloff:.6760000000000002,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.00041247989335695644,y:-.00142172416335363,z:3.0187219870917428},rotation:{x:0,y:0,z:0},color:"#FFB333",intensity:5,falloff:142.88399999999996,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-.12319987256138526,y:-.0954216385692699,z:2.9890303407494763},rotation:{x:0,y:0,z:0},color:"#E8F0FF",useTemperature:!0,temperature:7e3,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0}]}},c={id:"PseudoKleinian",name:"Pseudo Kleinian",shortDescription:'Kleinian variation with a "Magic Factor" that warps the inversion logic.',description:"A modification of the Kleinian group formula. Now supports linear shifting and twisting.",shader:{function:`
    void formula_PseudoKleinian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 q = z.xyz;

        // Param F: Twist
        if (abs(uParamF) > 0.001) {
            float ang = q.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            q.xy = mat2(co, -s, s, co) * q.xy;
        }

        float boxLimitVal = uParamA;
        vec3 boxMin = vec3(-boxLimitVal);
        vec3 boxMax = vec3(boxLimitVal);
        q = 2.0 * clamp(q, boxMin, boxMax) - q;
        float lensq = max(dot(q, q), 1e-10);
        float magic = uParamD;
        float factor = uParamC - magic;
        float rp2 = lensq * factor;
        float k1 = max(uParamB / max(rp2, 1.0e-10), 1.0);
        q *= k1;
        dr *= k1;

        // Vec3A: 3-axis shift (z-shift was original paramE, x/y are new)
        q += uVec3A;

        z.xyz = q;
        trap = min(trap, lensq);
    }`,loopBody:"formula_PseudoKleinian(z, dr, trap, c);"},parameters:[{label:"Box Limit",id:"paramA",min:.1,max:2,step:.01,default:1.93},{label:"Size (C)",id:"paramB",min:.5,max:2.5,step:.001,default:1.76},{label:"Power",id:"paramC",min:1,max:2.5,step:.001,default:1.278},{label:"Magic Factor",id:"paramD",min:0,max:1.5,step:.001,default:.801},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:.119}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"PseudoKleinian",features:{coreMath:{iterations:7,paramA:1.93,paramB:1.76,paramC:1.278,paramD:.801,paramF:0,vec3A:{x:0,y:0,z:.119}},coloring:{gradient:[{id:"1771521894392",position:0,color:"#949494",bias:.5,interpolation:"linear"},{id:"1771519043183",position:.33,color:"#87827D",bias:.5,interpolation:"step"},{id:"1771519043723",position:.448,color:"#007A71",bias:.5,interpolation:"step"},{id:"1771518360330_2",position:.461,color:"#929292",bias:.5,interpolation:"linear"},{id:"1771518360330_3",position:1,color:"#949494",bias:.5,interpolation:"linear"}],mode:9,scale:27.305,offset:-24.938,repeats:3,phase:-.5,bias:1,twist:0,escape:127399.5,gradient2:[{id:"1",position:.318,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1771521834787",position:.386,color:"#26A5B4",bias:.5,interpolation:"step"},{id:"1771521804163",position:.397,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode2:0,scale2:45.964,offset2:2.748,repeats2:50.5,phase2:.45,bias2:1,twist2:0,blendMode:2,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:466.422,layer3Strength:0,layer3Bump:.05,layer3Turbulence:0},ao:{aoIntensity:.317,aoSpread:.027,aoEnabled:!0,aoMode:!1},atmosphere:{fogIntensity:0,fogNear:1.069,fogFar:1.764,fogColor:"#000000",fogDensity:.36,glowIntensity:.062,glowSharpness:8.511,glowMode:!1,glowColor:"#9be0ff"},materials:{diffuse:1.1,reflection:.52,specular:2,roughness:.269,rim:.586,rimExponent:5.9,envStrength:2.36,envBackgroundStrength:.97,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1771523832902_0",position:0,color:"#001133"},{id:"1771523832902_1",position:.5,color:"#8A9DAA"},{id:"1771523832902_2",position:1,color:"#A5FFFF"}]},colorGrading:{active:!0,saturation:1.11,levelsMin:.01,levelsMax:1.004,levelsGamma:.496},geometry:{juliaMode:!1,juliaX:-.28,juliaY:2,juliaZ:-2,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:178.25,shadowIntensity:1,shadowBias:16e-6},quality:{fudgeFactor:.48,detail:7.7,pixelThreshold:.3,maxSteps:384,estimator:4,distanceMetric:2},optics:{camFov:37,dofStrength:.00147,dofFocus:1.235},reflections:{enabled:!0,reflectionMode:1,bounces:3,steps:128,mixStrength:1,roughnessThreshold:.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.23563338320385452,y:.05927570030462831,z:-.43792255558493787,w:.8655559689490069},sceneOffset:{x:4.677079677581787,y:.8489137291908264,z:1.2545667886734009,xL:-.03396485030158674,yL:.03325700201092376,zL:-.015573679616097938},targetDistance:1.0379663705825806,cameraMode:"Fly",lights:[{type:"Point",position:{x:4.677060177682062,y:.8489393025420574,z:1.254369368841062},rotation:{x:1.092,y:.667,z:.415},color:"#FFA757",intensity:12.96,falloff:109.253,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:4.557440677764606,y:1.1,z:-.16},rotation:{x:0,y:0,z:0},color:"#A9A9A9",intensity:27.1441,falloff:3.528,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:4.677024051602566,y:.8488697555642045,z:1.2543798336180192},rotation:{x:0,y:0,z:0},color:"#4E83FF",intensity:28.4,falloff:261.407,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]}},d={id:"Dodecahedron",name:"Dodecahedron",shortDescription:"Kaleidoscopic IFS with dodecahedral symmetry (Knighty).",description:"Kaleidoscopic IFS fractal with true dodecahedral symmetry using 3 golden-ratio reflection normals. Based on Knighty's method: 3 normals × 3 reflections = 9 fold operations per iteration, producing the icosahedral/dodecahedral reflection group. Supports rotation, twist, and shift.",juliaType:"offset",shader:{preamble:`
    // Dodecahedron: Golden-ratio fold normals
    // Reference: Syntopia/Knighty Kaleidoscopic IFS
    const float dodeca_Phi = (1.0 + sqrt(5.0)) * 0.5; // golden ratio 1.618...
    const vec3 dodeca_n1 = normalize(vec3(-1.0, dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0)));
    const vec3 dodeca_n2 = normalize(vec3(dodeca_Phi - 1.0, 1.0 / (dodeca_Phi - 1.0), -1.0));
    const vec3 dodeca_n3 = normalize(vec3(1.0 / (dodeca_Phi - 1.0), -1.0, dodeca_Phi - 1.0));`,function:`
    void formula_Dodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

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
        trap = min(trap, getLength(z3));
    }`,loopBody:"formula_Dodecahedron(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2.618},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Dodecahedron",features:{coreMath:{iterations:7,paramA:1.618,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:5.220276663070101,y:.9514730190841805,z:0}},coloring:{mode:0,repeats:1,phase:.41,scale:6.580873844013903,offset:1.195965706975688,bias:1,twist:0,escape:2,mode2:5,repeats2:1,phase2:0,blendMode:2,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773424223148_0",position:0,color:"#30123B",bias:.5,interpolation:"linear"},{id:"1773424223148_1",position:.071,color:"#4145AB",bias:.5,interpolation:"linear"},{id:"1773424223148_2",position:.143,color:"#4675ED",bias:.5,interpolation:"linear"},{id:"1773424223148_3",position:.214,color:"#39A2FC",bias:.5,interpolation:"linear"},{id:"1773424223148_4",position:.286,color:"#1BCFD4",bias:.5,interpolation:"linear"},{id:"1773424223148_5",position:.357,color:"#24ECA6",bias:.5,interpolation:"linear"},{id:"1773424223148_6",position:.429,color:"#61FC6C",bias:.5,interpolation:"linear"},{id:"1773424223148_7",position:.5,color:"#A4FC3B",bias:.5,interpolation:"linear"},{id:"1773424223148_8",position:.571,color:"#D1E834",bias:.5,interpolation:"linear"},{id:"1773424223148_9",position:.643,color:"#F3C63A",bias:.5,interpolation:"linear"},{id:"1773424223148_10",position:.714,color:"#FE9B2D",bias:.5,interpolation:"linear"},{id:"1773424223148_11",position:.786,color:"#F36315",bias:.5,interpolation:"linear"},{id:"1773424223148_12",position:.857,color:"#D93806",bias:.5,interpolation:"linear"},{id:"1773424223148_13",position:.929,color:"#B11901",bias:.5,interpolation:"linear"},{id:"1773424223148_14",position:1,color:"#7A0402",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},ao:{aoIntensity:.47,aoSpread:.20182911832770353,aoSamples:5,aoEnabled:!0,aoMode:!1},texturing:{active:!1,offset:{x:-.02,y:-.08},mapU:6,mapV:8,layer1Data:null},materials:{diffuse:2,reflection:0,specular:1.02,roughness:.468,rim:0,rimExponent:4.5,envStrength:.11,envBackgroundStrength:.18,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"0",position:.03,color:"#130606"},{id:"1",position:.14,color:"#463434"},{id:"2",position:.41,color:"#824040"},{id:"3",position:.68,color:"#BCBCBC"},{id:"4",position:1,color:"#875656"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowColor:"#ffffff",glowMode:!1},geometry:{juliaMode:!1,juliaX:-.495,juliaY:.43,juliaZ:-.07,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:538,shadowIntensity:1,shadowBias:0},quality:{detail:2,fudgeFactor:.618,pixelThreshold:.2,maxSteps:300,distanceMetric:3,stepJitter:.15,estimator:4},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:30,dofStrength:0,dofFocus:5.416511696387403}},cameraPos:{x:-2.9461205964615327,y:-6.306149063613445,z:-5.3717968058510825},cameraRot:{x:-.3200177128161143,y:.4273069400949125,z:.4770724626812721,w:.6981398912695737},cameraFov:30,sceneOffset:{x:5.360734701156616,y:13.365931034088135,z:8.818749189376831,xL:-.004044675735693504,yL:-.07134266791832158,zL:.1851590182527553},targetDistance:8.7922319978922,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.3935750958329095,y:1.1219073945240998,z:2.531297422652509},rotation:{x:-.1760895376460553,y:-.04312640645659912,z:.00380748198692117},color:"#FFE6D1",intensity:.43559999999999993,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5100},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},f={id:"Phoenix",name:"Phoenix",shortDescription:"Iterates based on previous value (z_n-1). Creates flowing, taffy-like distortions.",description:"A 3D generalization of the Phoenix Julia set. Now with Z-stretching and spatial twisting.",juliaType:"julia",shader:{function:`
    vec3 phoenixBulbPow(vec3 z, float power, vec2 phase) {
        float r = length(z);
        float r_safe = max(r, 1.0e-9);
        float theta = acos(clamp(z.z / r_safe, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        float zr = pow(r_safe, power);
        theta = theta * power + phase.x;
        phi = phi * power + phase.y;
        return zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
    }

        void formula_Phoenix(inout vec4 z, inout float dr, inout float trap, vec4 c, inout vec4 z_prev, inout float dr_prev, inout vec4 z_prev2, inout float dr_prev2) {
            vec3 z3 = z.xyz;
            vec3 zp3 = z_prev.xyz;

            // Vec3A: Anisotropic Stretch (mix to 1.0 when near zero so DDFS default reset is safe)
            vec3 stretch = mix(vec3(1.0), uVec3A, step(vec3(0.01), uVec3A));
            z3 *= stretch;
            dr *= max(max(stretch.x, stretch.y), stretch.z);

            // Vec3C: Pre-rotation (applied before triplex power)
            if (abs(uVec3C.x) > 0.001 || abs(uVec3C.y) > 0.001 || abs(uVec3C.z) > 0.001) {
                float cx = cos(uVec3C.x); float sx = sin(uVec3C.x);
                float cy = cos(uVec3C.y); float sy = sin(uVec3C.y);
                float cz = cos(uVec3C.z); float sz = sin(uVec3C.z);
                // YZ rotation
                z3.yz = mat2(cx, -sx, sx, cx) * z3.yz;
                // XZ rotation
                z3.xz = mat2(cy, -sy, sy, cy) * z3.xz;
                // XY rotation
                z3.xy = mat2(cz, -sz, sz, cz) * z3.xy;
            }

            // Param C: Twist
            if (abs(uParamC) > 0.001) {
                float ang = z3.z * uParamC;
                float s = sin(ang); float co = cos(ang);
                z3.xy = mat2(co, -s, s, co) * z3.xy;
            }

            float power = uParamA;
            float kReal = uVec2A.x;
            float kImag = uVec2A.y;
            float hPower = uParamB;
            float hBlend = uParamD;
            vec2 phase = uVec2B;

            vec3 z_new_part = phoenixBulbPow(z3, power, phase);

            // Vec3B: Abs/fold after power (Burning Phoenix)
            z_new_part = mix(z_new_part, abs(z_new_part), step(vec3(0.5), uVec3B));

            // History: blend z_{n-1} with z_{n-2} for deeper memory
            vec3 historySource = mix(zp3, z_prev2.xyz, hBlend);
            float drHistorySource = mix(dr_prev, dr_prev2, hBlend);

            vec3 z_prev_part;
            bool isLinearHistory = abs(hPower - 1.0) < 0.001;

            if (isLinearHistory) {
                z_prev_part = historySource;
            } else {
                z_prev_part = phoenixBulbPow(historySource, hPower, vec2(0.0));
            }

            vec3 historyTerm;
            historyTerm.x = z_prev_part.x * kReal - z_prev_part.y * kImag;
            historyTerm.y = z_prev_part.x * kImag + z_prev_part.y * kReal;
            historyTerm.z = z_prev_part.z * kReal;

            vec3 z_next = z_new_part + c.xyz + historyTerm;

            float r = length(z3);
            float rh = length(historySource);
            float safeR = max(r, 1.0e-5);
            float safeRh = max(rh, 1.0e-5);

            float dr_pow = power * pow(safeR, power - 1.0);

            float kMag = length(vec2(kReal, kImag));
            float dr_hist = kMag;

            if (!isLinearHistory) {
                 dr_hist *= hPower * pow(safeRh, hPower - 1.0);
            }

            float dc = (uJuliaMode > 0.5) ? 0.0 : 1.0;
            float dr_next = dr_pow * dr + dr_hist * drHistorySource + dc;

            // Shift history: z_{n-2} = z_{n-1}, z_{n-1} = z_n
            z_prev2 = z_prev;
            dr_prev2 = dr_prev;
            z_prev = vec4(z3, 0.0);
            dr_prev = dr;

            z.xyz = z_next;
            dr = dr_next;

            trap = min(trap, dot(z, z));
        }`,loopBody:"formula_Phoenix(z, dr, trap, c, z_prev, dr_prev, z_prev2, dr_prev2);",loopInit:`
        vec4 z_prev = vec4(0.0);
        float dr_prev = 0.0;
        vec4 z_prev2 = vec4(0.0);
        float dr_prev2 = 0.0;
        `},parameters:[{label:"Power (p)",id:"paramA",min:1.5,max:12,step:.01,default:10.777},{label:"History Exp",id:"paramB",min:0,max:3,step:.01,default:.87},{label:"Twist",id:"paramC",min:-2,max:2,step:.01,default:0},{label:"History Depth",id:"paramD",min:0,max:1,step:.01,default:0},{label:"Distortion (Re, Im)",id:"vec2A",type:"vec2",min:-1.5,max:1.5,step:.001,default:{x:.503,y:.961}},{label:"Phase (θ, φ)",id:"vec2B",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:0,y:0},scale:"pi"},{label:"Stretch",id:"vec3A",type:"vec3",min:.1,max:3,step:.01,default:{x:1,y:1,z:1},linkable:!0},{label:"Abs Fold",id:"vec3B",type:"vec3",min:0,max:1,step:1,default:{x:0,y:0,z:0},mode:"toggle"},{label:"Pre-Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"Phoenix",features:{coreMath:{iterations:31,paramA:10.777,paramB:.87,paramC:0,paramD:0,vec2A:{x:.503,y:.961},vec2B:{x:0,y:0},vec3A:{x:1,y:1,z:1},vec3B:{x:0,y:0,z:0},vec3C:{x:0,y:0,z:0}},coloring:{gradient:[{id:"1766223988966_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1766223988966_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766223988966_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766223988966_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766223988966_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766223988966_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766223988966_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766223988966_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766223988966_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766223988966_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766223988966_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766223988966_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],mode:0,scale:2.31,offset:.272,repeats:1,phase:0,bias:.9,twist:0,escape:4,gradient2:[{id:"1766224725875_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1766224725875_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766224725875_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766224725875_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766224725875_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766224725875_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766224725875_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766224725875_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766224725875_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766224725875_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766224725875_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766224725875_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],mode2:6,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:3,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:245.44,layer3Strength:0,layer3Bump:.3,layer3Turbulence:.65},ao:{aoIntensity:.37,aoSpread:.164,aoEnabled:!0,aoMode:!1},atmosphere:{fogColor:"#1b1e24",fogNear:1e-4,fogFar:501.187,fogDensity:0,glowIntensity:1e-4,glowSharpness:825,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:.94,reflection:0,specular:.3,roughness:.4,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,emission:.581,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[]},geometry:{juliaMode:!0,juliaX:.17,juliaY:.36,juliaZ:.06,hybridMode:!1},lighting:{shadows:!0,shadowSoftness:102.8,shadowIntensity:1,shadowBias:.002},quality:{fudgeFactor:.4,detail:1,pixelThreshold:.5,maxSteps:300},optics:{camFov:58,dofStrength:35e-5,dofFocus:.38}},cameraPos:{x:.876,y:-1.881,z:2.819},cameraRot:{x:.087,y:.3,z:-.715,w:.626},sceneOffset:{x:.246,y:1.112,z:-2.614,xL:-.876,yL:.881,zL:-.819},targetDistance:.287,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.755,y:.531,z:-.026},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.4,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},p={id:"MixPinski",name:"MixPinski",shortDescription:"4D Sierpinski-Menger hybrid by Darkbeam. Rich geometric detail.",description:"Darkbeam's MixPinski — a 4D hybrid combining Sierpinski tetrahedron folds (extended to 4D with w-component) and a Menger-like fold-scale transform. The interplay of these two IFS systems produces extraordinary geometric complexity.",juliaType:"offset",shader:{function:`
    void formula_MixPinski(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // --- Stage 1: 4D Sierpinski Folds ---
        // Six reflective folds across all pairs of axes (extends 3D tetrahedron folds to 4D)
        float s;
        s = step(0.0, z.x + z.y); z.xy = mix(-z.yx, z.xy, s);
        s = step(0.0, z.x + z.z); z.xz = mix(-z.zx, z.xz, s);
        s = step(0.0, z.y + z.z); z.zy = mix(-z.yz, z.zy, s);
        s = step(0.0, z.x + z.w); z.xw = mix(-z.wx, z.xw, s);
        s = step(0.0, z.y + z.w); z.yw = mix(-z.wy, z.yw, s);
        s = step(0.0, z.z + z.w); z.zw = mix(-z.wz, z.zw, s);

        // Sierpinski scale + offset (4D)
        float scaleS = uParamA;
        z *= scaleS;
        dr *= abs(scaleS);

        // offsetS: vec3A.xyz for xyz, vec2A.x for w
        z.xyz += uVec3A;
        z.w += uVec2A.x;

        // --- Stage 2: Menger-like Fold-Scale ---
        float scaleM = uParamC;
        float sm1 = scaleM - 1.0;

        // Standard IFS scale-offset on x, y, w
        z.x = scaleM * z.x - uVec3B.x * sm1;
        z.y = scaleM * z.y - uVec3B.y * sm1;
        z.w = scaleM * z.w - uVec2A.y * sm1;

        // Z-axis: Menger fold (abs-fold around center, then scale)
        float zCenter = 0.5 * uVec3B.z * sm1 / scaleM;
        z.z -= zCenter;
        z.z = -abs(z.z);
        z.z += zCenter;
        z.z *= scaleM;

        dr *= abs(scaleM);

        // --- Stage 3: Optional 3D Rotation (uses vec3C, precalc via gmt_precalcRodrigues) ---
        {
            vec3 rp = z.xyz;
            gmt_applyRodrigues(rp);
            z.xyz = rp;
        }

        // Julia mode
        if (uJuliaMode > 0.5) z.xyz += c.xyz;

        // Orbit trap coloring (matches original: abs(vec4(z.xyz, r2)))
        float r2 = dot(z.xyz, z.xyz) + z.w * z.w;
        trap = min(trap, length(abs(vec4(z.xyz, r2))));
    }`,loopBody:"formula_MixPinski(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3C);",usesSharedRotation:!0,getDist:`
            float r4d = max(max(max(abs(z.x), abs(z.y)), abs(z.z)), abs(z.w));
            float d = (r4d - 1.0) / max(abs(dr), 1e-10);
            return vec2(d, iter);
        `},parameters:[{label:"Sierpinski Scale",id:"paramA",min:.1,max:4,step:.001,default:1},{label:"Menger Scale",id:"paramC",min:.1,max:4,step:.001,default:2},{label:"W (4th Dim)",id:"paramB",min:-5,max:5,step:.01,default:0},{label:"Sierpinski Offset",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:0,y:0,z:0}},{label:"Menger Offset",id:"vec3B",type:"vec3",min:-5,max:5,step:.01,default:{x:1,y:1,z:1},linkable:!0},{label:"4D Offsets",id:"vec2A",type:"vec2",min:-5,max:5,step:.01,default:{x:0,y:.5}},{label:"Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"MixPinski",features:{coreMath:{iterations:11,paramA:1,paramB:0,paramC:2,vec3A:{x:0,y:0,z:0},vec3B:{x:1,y:1,z:1},vec3C:{x:0,y:0,z:0},vec2A:{x:0,y:.5}},coloring:{mode:0,repeats:2,phase:0,scale:6.52833425825692,offset:1.5335980513105973,bias:2.7028973971996875,twist:0,escape:16,mode2:0,scale2:14.312371802828013,offset2:3.2910086244771835,repeats2:6,phase2:0,bias2:1,twist2:0,blendMode:3,blendOpacity:0,layer3Color:"#000000",layer3Scale:23.20419452683914,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773421493405_7",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1773421493405_6",position:.143,color:"#9BF5FF",bias:.5,interpolation:"linear"},{id:"1773421493405_5",position:.286,color:"#FFAE55",bias:.5,interpolation:"linear"},{id:"1773421493405_4",position:.429,color:"#803000",bias:.5,interpolation:"linear"},{id:"1773421493405_3",position:.571,color:"#481700",bias:.5,interpolation:"linear"},{id:"1773421493405_2",position:.714,color:"#000000",bias:.5,interpolation:"linear"},{id:"1773421493405_1",position:.857,color:"#005662",bias:.5,interpolation:"linear"},{id:"1773421493405_0",position:1,color:"#00485E",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000",bias:.20422535211267606,interpolation:"linear"},{id:"2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.535,aoSpread:.004173235403614006,aoSamples:5,aoEnabled:!0,aoMode:!0},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:.005,glowSharpness:2,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1.2,reflection:0,specular:.58,roughness:.333,rim:.1,rimExponent:15,envStrength:.3,envBackgroundStrength:.54,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}]},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:5.636765862528907,shadowSteps:112,shadowIntensity:1,shadowBias:.002},quality:{detail:2.5,fudgeFactor:1,pixelThreshold:.5,maxSteps:300,distanceMetric:1,estimator:1},optics:{camFov:25,dofStrength:0,dofFocus:2.2105886936187744}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.29934375838158195,y:-.36353705098625344,z:-.1246062728732116,w:.8733312107321335},cameraFov:25,sceneOffset:{x:-1.860237717628479,y:2.017045259475708,z:1.8703371286392212,xL:-.06596317582826194,yL:.07221056925599156,zL:.06550313881154746},targetDistance:2.767302989959717,cameraMode:"Fly",lights:[{type:"Point",position:{x:-.8183725352111588,y:1.3532257824970233,z:1.5729904550803229},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:3,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},u={id:"SierpinskiTetrahedron",name:"Sierpinski Tetrahedron",shortDescription:"Classic IFS Sierpinski tetrahedron with fold symmetry.",description:"The Sierpinski Tetrahedron (Tetrix) — a 3D IFS fractal built from reflective folds across tetrahedron face planes. Supports per-axis scale, rotation, shift and twist.",juliaType:"offset",shader:{function:`
    void formula_SierpinskiTetrahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);

        float sf;
        sf = step(0.0, z3.x + z3.y); z3.xy = mix(-z3.yx, z3.xy, sf);
        sf = step(0.0, z3.x + z3.z); z3.xz = mix(-z3.zx, z3.xz, sf);
        sf = step(0.0, z3.y + z3.z); z3.yz = mix(-z3.zy, z3.yz, sf);
        // Vec3C: Per-axis scale (average for DR calculation)
        vec3 scale3 = uVec3C;
        z3 = z3 * scale3 - vec3(uParamB * (scale3 - 1.0));

        // Vec3B: Rotation (post-fold, using shared precalc)
        gmt_applyRodrigues(z3);

        // Vec3A: Shift X, Y, Z
        z3 += uVec3A;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        // Use average scale for derivative calculation
        float avgScale = (scale3.x + scale3.y + scale3.z) / 3.0;
        dr = dr * avgScale;
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_SierpinskiTetrahedron(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"vec3C",type:"vec3",min:.1,max:4,step:.001,default:{x:2,y:2,z:2},linkable:!0},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"SierpinskiTetrahedron",features:{coreMath:{iterations:32,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0},vec3C:{x:2,y:2,z:2}},coloring:{mode:0,repeats:2.6,phase:.78,scale:2.595,offset:.785,bias:1,twist:0,escape:3.2,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"1766253802332_11",position:0,color:"#666666",bias:.5,interpolation:"linear"},{id:"1766253802332_10",position:.09099999999999997,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1766253802332_9",position:.18200000000000005,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1766253802332_8",position:.273,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1766253802332_7",position:.364,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1766253802332_6",position:.45499999999999996,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1766253802332_5",position:.5449999999999999,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1766253802332_4",position:.636,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1766253802332_3",position:.727,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1766253802332_2",position:.8180000000000001,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1766253802332_1",position:.909,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1766253802332_0",position:1,color:"#5F4690",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:200,glowColor:"#ffffff",glowMode:!1,aoIntensity:.2,aoSpread:.4},materials:{reflection:0,specular:0,roughness:.5,diffuse:1.5,envStrength:0,rim:0,rimExponent:4,emission:.3,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1,fudgeFactor:1,pixelThreshold:.5,maxSteps:300,estimator:1},optics:{dofStrength:0,dofFocus:.38}},cameraPos:{x:-3.007814612603433,y:1.6549209197166999,z:3.0656971117007727},cameraRot:{x:-.16821916484218788,y:-.37237727913489405,z:-.07175513434637137,w:.9098838800961496},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:.6573301623370098,yL:-.6573301623370098,zL:-.6573301623370111},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.435,y:1.031,z:2.022},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.4,falloff:1,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},m={id:"AmazingSurf",name:"Amazing Surf",shortDescription:"Sinusoidal variation of the Amazing Box. Creates flowing, melted machinery.",description:"A variant of the Amazing Box that introduces sinusoidal waves. Now with Wave Twist and Vertical Shift.",juliaType:"offset",shader:{function:`
    void formula_AmazingSurf(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        vec3 transform = uVec3A;
        float limit = 1.0;
        z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        float r2 = max(dot(z3,z3), 1e-10);
        float mR2 = max(uParamB * uParamB, 1e-10);
        float sphereK = clamp(1.0 / r2, 1.0, 1.0 / mR2);
        z3 *= sphereK; dr *= sphereK;
        z3 = z3 * uParamA + c.xyz;
        
        // Param X: Wave Twist
        float twist = 0.0;
        if (abs(transform.x) > 0.001) twist = z3.z * transform.x;
        
        // Param Y: Vertical Shift
        if (abs(transform.y) > 0.001) z3.y += transform.y;

        z3 += vec3(sin(z3.y * uParamC + twist), cos(z3.x * uParamC + twist), 0.0) * uParamD * 0.1;
        dr = dr * abs(uParamA) + 1.0;
        z.xyz = z3;
        trap = min(trap, abs(z3.z));
    }`,loopBody:"formula_AmazingSurf(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:1,max:5,step:.001,default:3},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.8},{label:"Wave Freq",id:"paramC",min:0,max:10,step:.1,default:6},{label:"Wave Amp",id:"paramD",min:0,max:2,step:.01,default:.5},{label:"Transform",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:0,y:0,z:0}}],defaultPreset:{formula:"AmazingSurf",features:{coreMath:{iterations:21,paramA:3.03,paramB:.47,paramC:1,paramD:1,vec3A:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:1.44,scale:1,offset:1.44,bias:1,twist:0,escape:100,mode2:4,repeats2:2284.7,phase2:2.4,blendMode:6,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1767122909918_0",position:0,color:"#DF7200",bias:.5,interpolation:"linear"},{id:"1767122909918_1",position:.5,color:"#cc8800",bias:.5,interpolation:"linear"},{id:"1767122909918_2",position:1,color:"#ffeeaa",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}]},texturing:{active:!1,scaleX:1,scaleY:1,offset:{x:0,y:0},mapU:6,mapV:1,layer1Data:null},materials:{reflection:.44,specular:2,roughness:.51,diffuse:1.01,envStrength:0,rim:0,rimExponent:4,emission:0,emissionColor:"#ffffff",emissionMode:0,envMapVisible:!1,useEnvMap:!0,envSource:1,envRotation:0,envGradientStops:[{id:"1767120246151",position:0,color:"#88ccff",bias:.5,interpolation:"linear"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:.9454191033138402,color:"#88ccff",bias:.5,interpolation:"smooth"}]},atmosphere:{fogIntensity:1,fogNear:1e-4,fogFar:7.988,fogColor:"#362624",fogDensity:.2,glowIntensity:1e-4,glowSharpness:360,glowColor:"#ffffff",glowMode:!1,aoIntensity:.2,aoSpread:.147,aoMode:!1},lighting:{shadows:!0,shadowSoftness:128,shadowIntensity:.97,shadowBias:.11},quality:{detail:2,fudgeFactor:.45,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,estimator:1},geometry:{juliaMode:!1,juliaX:.06,juliaY:-2,juliaZ:2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridSkip:1},optics:{dofStrength:1e-4,dofFocus:.662}},cameraPos:{x:-.0012166192470455862,y:.34651714109424453,z:-.4225635099851341},cameraRot:{x:.0038108513963938193,y:.9416221382735623,z:.33664033788669406,w:-.002551280519921562},cameraFov:60,sceneOffset:{x:0,y:0,z:2,xL:.007764116549374419,yL:.17826292308257122,zL:.3614435950429179},targetDistance:.504,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.06201624057047557,y:-.0404139584830392,z:-.6430434715537097},rotation:{x:0,y:0,z:0},color:"#FF9D7B",intensity:5,falloff:22,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},y={id:"AmazingSurface",name:"Amazing Surface",description:'A "Menger-Kleinian" hybrid. Uses 3-axis sorting (Menger) followed by a Box Fold and Sphere Inversion. Capable of creating non-orthogonal, organic machinery.',juliaType:"offset",shader:{loopInit:`
            // Fix: Zero out W component to prevent uParamB (InvMax) from affecting magnitude check
            z.w = 0.0;

            // Apply Pre-Scale (Param E) once at the start
            // Loop Init always runs before the loop, so we don't need to check iter
            float preScale = (abs(uParamE) < 0.001) ? 1.0 : (1.0 / uParamE);
            z.xyz *= preScale;
            dr *= preScale;
        `,function:`
    void formula_AmazingSurface(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        vec3 offset = uVec3B;
        // Params
        float scale = uParamA;      // Fractal Scale (fractal_fold + 1)
        float invMax = uParamB;     // Inversion Clamp Max (3.0)
        
        vec3 cSize = uVec3A; //box params
        
        if (uJuliaMode > 0.5) offset += uJulia;

        // 1. Menger-style Folding (Sort Axes)
        p = abs(p);
        if (p.x < p.y) p.xy = p.yx;
        if (p.x < p.z) p.xz = p.zx;
        if (p.y < p.z) p.yz = p.zy;
        
        // 2. Box Fold / Scale
        // formula: p = p * scale - cSize * (scale - 1.0)
        p = p * scale - cSize * (scale - 1.0);
        
        // 3. Sphere Inversion
        float r2 = dot(p, p);
        float k = clamp(1.0 / r2, 1.0, invMax);
        p *= k;
        
        // 4. Translation
        p += offset;
        
        // 5. Derivative Update
        // Based on reference: de = de * k * scale
        // We use full chain rule approximation for stability
        dr = dr * abs(scale) * k + 1.0;
        
        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_AmazingSurface(z, dr, trap, c);",getDist:`
            // DE: (length(p) - Thickness) / dr
            // Use 'r' which comes from DE_MASTER (respects Distance Metric)
            float thickness = uParamF;
            return vec2((r - thickness) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2.37},{label:"Inv Max",id:"paramB",min:1,max:5,step:.01,default:3},{label:"Box Params",id:"vec3A",type:"vec3",min:-3,max:3,step:.001,default:{x:1,y:1,z:1.3},linkable:!0},{label:"Offset Params",id:"vec3B",type:"vec3",min:-3,max:3,step:.001,default:{x:0,y:0,z:.5}},{label:"Pre-Scale",id:"paramE",min:.1,max:5,step:.01,default:1},{label:"Thickness",id:"paramF",min:0,max:10,step:.01,default:.4}],defaultPreset:{formula:"AmazingSurface",features:{atmosphere:{fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:200,glowMode:!1,glowColor:"#ffffff",aoIntensity:.2,aoSpread:.028079152787892275,aoMode:!1},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},materials:{diffuse:1,reflection:0,specular:.3,roughness:.5,rim:0,rimExponent:4,envStrength:.125,envMapVisible:!0,envBackgroundStrength:.013878516332918171,envSource:1,envMapData:null,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},texturing:{active:!1,layer1Data:null,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},coloring:{gradient:[{id:"2",position:.29337201676350744,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1768067662570",position:.32743611518925475,color:"#4F8728",bias:.33333333333333326,interpolation:"step"},{id:"1768067659362",position:.4161607050126708,color:"#FFFFFF",bias:.5,interpolation:"step"},{id:"1768067719427",position:.5555850604494675,color:"#FF7D7D",bias:.5,interpolation:"step"},{id:"1768067722341",position:.6094535614136845,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1768067729100",position:.6876155711314749,color:"#FFB716",bias:.5,interpolation:"linear"},{id:"1768067900586",position:.7932402117621893,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode:0,scale:13.919207813258625,offset:.787073242086744,repeats:1.5,phase:0,bias:1,twist:0,escape:1.0069316688518042,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},geometry:{preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridAddC:!1,hybridComplex:!1,hybridProtect:!0,hybridSkip:1,hybridSwap:!1,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},quality:{fudgeFactor:.5,detail:2,pixelThreshold:.5,maxSteps:300,distanceMetric:1},coreMath:{iterations:12,paramA:1.866,paramB:1.63,vec3A:{x:1,y:1,z:.62},vec3B:{x:0,y:0,z:.62},paramE:.97,paramF:1.4},lighting:{shadows:!0,shadowSoftness:12,shadowIntensity:1,shadowBias:1e-4,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1,light0_visible:!0,light0_fixed:!1,light0_castShadow:!0,light0_type:!1,light0_intensity:50,light0_falloff:50,light0_posX:-.34174133805446993,light0_posY:-1.233562063425787,light0_posZ:1.8137779830637029,light0_color:"#ffffff",light1_visible:!1,light1_fixed:!1,light1_castShadow:!1,light1_type:!1,light1_intensity:.5,light1_falloff:.5,light1_posX:.05,light1_posY:.075,light1_posZ:-.1,light1_color:"#FFD6AA",light2_visible:!1,light2_fixed:!1,light2_castShadow:!1,light2_type:!1,light2_intensity:.5,light2_falloff:.5,light2_posX:.25,light2_posY:.075,light2_posZ:-.1,light2_color:"#E0EEFF"},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},audio:{smoothing:.5,links:[],selectedLinkId:null,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.4173748330716279,y:.023019150204605446,z:-.01057663171011426,w:.9083812538268042},sceneOffset:{x:0,y:-2,z:2,xL:.04868238113505319,yL:-.4245626359584309,zL:.3428044731107205},targetDistance:2.077035516500473,cameraMode:"Orbit",lights:[]}},h={id:"BoxBulb",name:"Box Bulb",shortDescription:'Hybrid of Box Folds and Mandelbulb Power. Creates "Boxy Bulbs".',description:"A hybrid that combines box/sphere folding with the Mandelbulb power function. Now with rotation controls. (Formerly FoldingBrot)",juliaType:"offset",shader:{function:`
    void DE_Bulb(inout vec3 z, inout float dr, inout float trap, float power) {
        float r = max(length(z), 1.0e-9);
        float rp1 = pow(r, power - 1.0);
        dr = rp1 * power * dr + 1.0;
        float theta = acos(clamp(z.z / r, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        theta *= power;
        phi *= power;
        float zr = rp1 * r;
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        trap = min(trap, r);
    }

    void formula_BoxBulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;
        
        // Rotation from vec3A
        float angX = uVec3A.x;
        float angZ = uVec3A.z;
        if (abs(angX) > 0.001 || abs(angZ) > 0.001) {
             float sx = sin(angX), cx = cos(angX);
             float sz = sin(angZ), cz = cos(angZ);
             mat2 rotX = mat2(cx, -sx, sx, cx);
             mat2 rotZ = mat2(cz, -sz, sz, cz);
             z3.yz = rotX * z3.yz;
             z3.xy = rotZ * z3.xy;
        }

        boxFold(z3, dr, 1.0); 
        sphereFold(z3, dr, uParamB, uParamD);
        float scale = uParamC;
        z3 *= scale;
        dr *= abs(scale);
        DE_Bulb(z3, dr, trap, uParamA); 
        z.xyz = z3 + c.xyz;
        trap = min(trap, length(z.xyz));
    }`,loopBody:"formula_BoxBulb(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1.5,max:16,step:.001,default:5},{label:"Min Radius",id:"paramB",min:0,max:1.5,step:.001,default:.5},{label:"Scale",id:"paramC",min:.5,max:2.5,step:.001,default:1},{label:"Fixed Radius",id:"paramD",min:.1,max:2.5,step:.001,default:1},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},scale:"pi",mode:"rotation"}],defaultPreset:{formula:"BoxBulb",features:{coreMath:{iterations:16,paramA:5.8386,paramB:.321,paramC:.91,paramD:1.279,vec3A:{x:0,y:0,z:0}},coloring:{mode:6,repeats:1,phase:2.62,scale:1,offset:2.62,bias:1,twist:0,escape:33.72,mode2:0,repeats2:100,phase2:2.4,blendMode:3,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"1766255418053_0",position:.0642570281124498,color:"#567C1A",bias:.5,interpolation:"linear"},{id:"1766255418053_1",position:.167,color:"#33A532",bias:.5,interpolation:"linear"},{id:"1766255418053_2",position:.333,color:"#18DA5F",bias:.5,interpolation:"linear"},{id:"1766255418053_3",position:.5,color:"#299B77",bias:.5,interpolation:"linear"},{id:"1766255418053_4",position:.667,color:"#217a79",bias:.5,interpolation:"linear"},{id:"1766258643816",position:.7469879518072289,color:"#4B0000",bias:.5,interpolation:"linear"},{id:"1766255418053_5",position:.833,color:"#105965",bias:.5,interpolation:"linear"},{id:"1766255418053_6",position:1,color:"#074050",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#132218",fogDensity:.14,glowIntensity:1e-4,glowSharpness:360,glowColor:"#ffffff",glowMode:!1,aoIntensity:0,aoSpread:.1},materials:{reflection:.4,specular:1.05,roughness:.25,diffuse:.21,envStrength:0,rim:0,rimExponent:4,emission:.01,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:.19,juliaY:-.93,juliaZ:-.41,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:8,shadowIntensity:.98,shadowBias:.002},quality:{detail:2.4,fudgeFactor:.65,pixelThreshold:.9,maxSteps:300,aaMode:"Auto",aaLevel:1,estimator:4},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.25378547286620784,y:.054246624931105866,z:1.9340201043333456},cameraRot:{x:-.013871509693272319,y:.0651855581354543,z:.0009062372749709499,w:.9977763291256213},cameraFov:81,sceneOffset:{x:0,y:0,z:0,xL:.06415813902081223,yL:.10257047639815663,zL:.48918654020794206},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.3559846285676508,y:.08248395080524681,z:2.1100465907611543},rotation:{x:0,y:0,z:0},color:"#99A4FF",intensity:5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},x={id:"MengerAdvanced",name:"Menger Advanced",shortDescription:"Hybrid Menger Sponge with internal Box Folds and vertical scaling.",description:"An advanced variant of the Menger Sponge. It adds an Inner Box Fold (Param E) to generate machinery-like details inside the voids, and Z-Scale (Param F) for creating towering structures. (Formerly UberMenger)",juliaType:"none",shader:{function:`
    void formula_MengerAdvanced(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // 1. Rotation (vec3A = Rot X/Y/Z)
        vec3 rot = uVec3A;
        float sx = sin(rot.x), cx = cos(rot.x);
        float sy = sin(rot.y), cy = cos(rot.y);
        float sz = sin(rot.z), cz = cos(rot.z);
        mat2 rotX = mat2(cx, -sx, sx, cx);
        mat2 rotY = mat2(cy, -sy, sy, cy);
        mat2 rotZ = mat2(cz, -sz, sz, cz);
        z3.yz = rotX * z3.yz;
        z3.xz = rotY * z3.xz;
        z3.xy = rotZ * z3.xy;

        // 2. Menger Sorting (The Sponge Logic)
        z3 = abs(z3);
        vec3 ms = z3;
        z3.x = max(max(ms.x, ms.y), ms.z);
        z3.z = min(min(ms.x, ms.y), ms.z);
        z3.y = ms.x + ms.y + ms.z - z3.x - z3.z;
        
        // 3. UBER FEATURE: Inner Box Fold (Param C)
        // Injects Mandelbox-like complexity inside the sponge voids
        if (uParamC > 0.0) {
            float limit = uParamC;
            z3 = clamp(z3, -limit, limit) * 2.0 - z3;
        }

        // 4. Scaling & IFS
        float scale = (abs(uParamA - 1.0) < 0.001) ? 1.001 : uParamA;
        float offset = uParamB;
        
        z3 = z3 * scale - vec3(offset * (scale - 1.0));
        
        // 5. UBER FEATURE: Z-Scale (Param D)
        // Calculate Adaptive Stretch based on alignment with the Z-Axis.
        float zScale = uParamD;
        float stretchFactor = 1.0;
        
        if (abs(zScale - 1.0) > 0.01) {
            // Stretching: adaptive derivative based on Z-alignment
            // Squashing (zScale<1): conservative bound (1.0) prevents overstepping
            float alignment = abs(z3.z) / (length(z3) + 1.0e-9);
            stretchFactor = mix(1.0, mix(1.0, zScale, alignment), step(1.0, zScale));
            z3.z *= zScale;
        }

        // Injection
        if (uJuliaMode > 0.5) z3 += c.xyz;
        
        // Derivative Update (Chain Rule)
        // We multiply by Scale, then by our Calculated Adaptive Stretch
        dr = dr * abs(scale) * stretchFactor;
        
        z.xyz = z3;
        trap = min(trap, length(z3));
    }`,loopBody:"formula_MengerAdvanced(z, dr, trap, c);"},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2.236},{label:"Offset",id:"paramB",min:0,max:3,step:.001,default:1},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.001,default:{x:0,y:0,z:.88},mode:"rotation"},{label:"Inner Fold",id:"paramC",min:0,max:1.5,step:.01,default:.618},{label:"Z Scale",id:"paramD",min:.2,max:3,step:.01,default:.442}],defaultPreset:{formula:"MengerAdvanced",features:{atmosphere:{fogIntensity:0,fogNear:2,fogFar:10,fogColor:"#000000",fogDensity:.1,glowIntensity:0,glowSharpness:10,glowMode:!1,glowColor:"#ffffff",aoIntensity:.2,aoSpread:.1,aoMode:!1},materials:{diffuse:.9,reflection:0,specular:.87,roughness:.34,rim:.13,rimExponent:16,envStrength:1,envMapVisible:!0,envBackgroundStrength:.1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"0",position:0,color:"#00C0BF",bias:.5,interpolation:"linear"},{id:"1",position:.167,color:"#16B178",bias:.5,interpolation:"linear"},{id:"2",position:.333,color:"#9ccb86",bias:.5,interpolation:"linear"},{id:"3",position:.5,color:"#e9e29c",bias:.5,interpolation:"linear"},{id:"4",position:.667,color:"#EEBB88",bias:.5,interpolation:"linear"},{id:"5",position:.833,color:"#E83513",bias:.5,interpolation:"linear"},{id:"6",position:1,color:"#CF0B1E",bias:.5,interpolation:"linear"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},coloring:{gradient:[{id:"0",position:0,color:"#070611",bias:.5,interpolation:"linear"},{id:"1",position:.32,color:"#111320",bias:.5,interpolation:"linear"},{id:"2",position:.67,color:"#30306B",bias:.5,interpolation:"linear"},{id:"3",position:.68,color:"#EAAC85",bias:.5,interpolation:"linear"},{id:"4",position:.82,color:"#975F44",bias:.5,interpolation:"linear"},{id:"5",position:.97,color:"#170C05",bias:.5,interpolation:"linear"}],mode:0,scale:11.72,offset:1.93,repeats:1,phase:.64,bias:1,twist:0,escape:1.65,gradient2:[{id:"1",position:0,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"2",position:.47,color:"#353535",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],mode2:0,scale2:32.05,offset2:3.76,repeats2:3.3,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},geometry:{},quality:{fudgeFactor:1,detail:3,pixelThreshold:.5,maxSteps:300,distanceMetric:0,estimator:1},coreMath:{iterations:12,paramA:2.236,paramB:1,paramC:.618,paramD:.442,vec3A:{x:0,y:0,z:.88}},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:.68,shadowBias:.001,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1,lights:[{type:"Point",position:{x:-.985,y:1.872,z:2.008},color:"#ffffff",intensity:9.18,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]},optics:{},navigation:{}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.045,y:-.453,z:.141,w:.879},sceneOffset:{x:-4,y:0,z:3,xL:.35,yL:-.27,zL:.18},targetDistance:2.98,cameraMode:"Orbit"}},b={id:"Bristorbrot",name:"Bristorbrot",shortDescription:"Custom 3D polynomial with sharp edges and smooth bulbous forms.",description:"A custom polynomial fractal: x²-y²-z², y(2x-z), z(2x+y). No folding — the asymmetric cross-terms between axes create sharp crystalline edges mixed with smooth bulb regions. Supports scale, rotation, twist, and shift.",juliaType:"offset",shader:{function:`
    void formula_Bristorbrot(inout vec4 z, inout float dr, inout float trap, vec4 c, mat2 rotX, mat2 rotZ) {
        vec3 z3 = z.xyz;
        
        // Twist D
        if (abs(uParamD) > 0.001) {
            float ang = z3.z * uParamD;
            float s = sin(ang); float co = cos(ang);
            z3.xy = mat2(co, -s, s, co) * z3.xy;
        }

        z3.yz = rotX * z3.yz;
        z3.xy = rotZ * z3.xy;
        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = y * (2.0 * x - z_);
        z3.z = z_ * (2.0 * x + y);
        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;
        z3 = z3 * uParamA + c.xyz;
        
        // Shift C (X)
        if (abs(uParamC) > 0.001) z3.x += uParamC;
        
        // Offset B (Y)
        if (abs(uParamB) > 0.001) z3.y += uParamB;

        dr *= abs(uParamA);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopInit:`
        float angC = uVec3A.x;
        float sC = sin(angC), cC = cos(angC);
        mat2 rotX = mat2(cC, -sC, sC, cC);
        
        float angD = uVec3A.z;
        float sD = sin(angD), cD = cos(angD);
        mat2 rotZ = mat2(cD, -sD, sD, cD);
        `,loopBody:"formula_Bristorbrot(z, dr, trap, c, rotX, rotZ);"},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Offset",id:"paramB",min:-2,max:2,step:.001,default:0},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},scale:"pi",mode:"rotation"},{label:"Shift X",id:"paramC",min:-2,max:2,step:.01,default:0},{label:"Twist",id:"paramD",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Bristorbrot",features:{coreMath:{iterations:21,paramA:.738,paramB:0,vec3A:{x:0,y:0,z:1.2},paramC:.98,paramD:.97},coloring:{mode:1,repeats:24.4,phase:3.9,scale:24.415,offset:3.906,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"0",position:0,color:"#ff0000"},{id:"1",position:.17,color:"#ffff00"},{id:"2",position:.33,color:"#00ff00"},{id:"3",position:.5,color:"#00ffff"},{id:"4",position:.67,color:"#000000"},{id:"5",position:.83,color:"#ff00ff"},{id:"6",position:1,color:"#ff0000"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:.067,glowSharpness:480,glowColor:"#FF2323",glowMode:!0,aoIntensity:0,aoSpread:.22},materials:{reflection:.35,specular:0,roughness:.42,diffuse:1.02,envStrength:0,rim:.02,rimExponent:2.6,emission:.004,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!0,juliaX:1.04,juliaY:.21,juliaZ:.81,hybridCompiled:!0,hybridMode:!0,hybridIter:1,hybridScale:1,hybridMinR:.79,hybridFixedR:1.08,hybridFoldLimit:.87,hybridSwap:!1},lighting:{shadows:!0,shadowSoftness:2,shadowIntensity:.92,shadowBias:.015},quality:{detail:2.8,fudgeFactor:.6,pixelThreshold:.5,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.19278471475118408,y:1.0849557120921942,z:5.1524976426487115},cameraRot:{x:-.10384525583017853,y:.016524988834210615,z:-.017944827094612474,w:.994294257635102},cameraFov:60,sceneOffset:{x:1,y:1,z:2,xL:-.17139723987914707,yL:-.09973834195017878,zL:-.12121507460186143},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.16245054993746125,y:.326925950685747,z:-2.2309267197330493},rotation:{x:0,y:0,z:0},color:"#99A4FF",intensity:39.8,falloff:.6,falloffType:"Quadratic",fixed:!0,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},g={id:"MakinBrot",name:"Makin Brot",shortDescription:"Creates stacked, pagoda-like ornamental structures.",description:"A 3D fractal variant discovered by Makin. Custom polynomial: x²-y²-z², 2xy, 2z(x-y). Supports rotation, shift, and twist.",juliaType:"offset",shader:{function:`
    void formula_MakinBrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        float x = z3.x; float y = z3.y; float z_ = z3.z;
        z3.x = x*x - y*y - z_*z_;
        z3.y = 2.0 * x * y;
        z3.z = 2.0 * z_ * (x - y);
        float r = length(vec3(x,y,z_));
        dr = 2.0 * r * dr + 1.0;
        z3 = z3 * uParamA + c.xyz;

        // Vec3A: Shift
        z3 += uVec3A;

        dr *= abs(uParamA);
        z.xyz = z3;
        trap = min(trap, dot(z3,z3));
    }`,loopBody:"formula_MakinBrot(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:3,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"MakinBrot",features:{coreMath:{iterations:24,paramA:1.455,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{mode:1,repeats:1.3,phase:.2,scale:1.298,offset:.207,bias:1,twist:0,escape:2,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"0",position:0,color:"#ff0000"},{id:"1",position:.17,color:"#ffff00"},{id:"2",position:.33,color:"#00ff00"},{id:"3",position:.5,color:"#00ffff"},{id:"4",position:.67,color:"#000000"},{id:"5",position:.83,color:"#ff00ff"},{id:"6",position:1,color:"#ff0000"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:.037,glowSharpness:47,glowColor:"#FF2323",glowMode:!1,aoIntensity:0,aoSpread:.1},materials:{reflection:.35,specular:0,roughness:.42,diffuse:1.41,envStrength:0,rim:.09,rimExponent:2,emission:.016,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:-.99,juliaY:.54,juliaZ:-.72,hybridMode:!1,hybridIter:2,hybridScale:2.13,hybridMinR:.72,hybridFixedR:1,hybridFoldLimit:.97},lighting:{shadows:!0,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:6.3,fudgeFactor:.7,pixelThreshold:.1,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:-.8533969657887399,y:-.13446693672101487,z:1.154550164122028},cameraRot:{x:.04129519161407524,y:-.3129924386582225,z:.02381642440995219,w:.948558494991564},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:-.8442073707354043,yL:-.15795817300110893,zL:.25127901307775025},cameraMode:"Orbit",lights:[{type:"Point",position:{x:-1.5227203148465231,y:-.10858858668233184,z:.5084783790561214},rotation:{x:0,y:0,z:0},color:"#F0F0FF",useTemperature:!0,temperature:6500,intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},z={id:"Tetrabrot",name:"Tetrabrot",shortDescription:"4D Pseudo-Quaternion set. Produces diamond-like geometric symmetries.",description:"A 4D Mandelbrot set visualization using a specific squaring function. Now with pre-rotation support.",juliaType:"offset",shader:{function:`
    vec4 tetraSquare(vec4 q) {
        return vec4(q.x*q.x - q.y*q.y - q.z*q.z + q.w*q.w, 2.0*(q.x*q.y - q.z*q.w), 2.0*(q.x*q.z - q.y*q.w), 2.0*(q.x*q.w + q.y*q.z));
    }

    void formula_Tetrabrot(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        
        // Rotations via vec3A (Z, X, Y axes)
        float angZ = uVec3A.x;
        if (abs(angZ) > 0.001) {
            float s = sin(angZ); float co = cos(angZ);
            z.xy = mat2(co, -s, s, co) * z.xy;
        }

        float angX = uVec3A.y;
        if (abs(angX) > 0.001) {
            float s = sin(angX); float co = cos(angX);
            z.yz = mat2(co, -s, s, co) * z.yz;
        }

        float angY = uVec3A.z;
        if (abs(angY) > 0.001) {
            float s = sin(angY); float co = cos(angY);
            z.xz = mat2(co, -s, s, co) * z.xz;
        }

        // Fix: Chain rule +1.0
        dr = 2.0 * length(z) * dr + 1.0;
        z = tetraSquare(z) + c;
        trap = min(trap, dot(z,z));
    }`,loopBody:"formula_Tetrabrot(z, dr, trap, c);"},parameters:[{label:"Julia C (W)",id:"paramA",min:-1,max:1,step:.001,default:-.2},{label:"Slice W",id:"paramB",min:-1,max:1,step:.001,default:0},{label:"Rotation",id:"vec3A",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"axes",scale:"pi"}],defaultPreset:{formula:"Tetrabrot",features:{coreMath:{iterations:28,paramA:.186,paramB:0,vec3A:{x:0,y:0,z:0}},coloring:{mode:5,repeats:1,phase:.87,scale:1,offset:.87,bias:1,twist:0,escape:4,mode2:5,repeats2:1,phase2:2.4,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766256604050_0",position:0,color:"#0A4CD3",bias:.5,interpolation:"linear"},{id:"1766256604050_1",position:.5,color:"#3E7FAA",bias:.5,interpolation:"linear"},{id:"1766256604050_2",position:1,color:"#62E9E9",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:.61,color:"#FFFFFF"},{id:"2",position:.88,color:"#FF0505"}]},atmosphere:{fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:1e-4,glowSharpness:47,glowColor:"#FF2323",glowMode:!1,aoIntensity:.4,aoSpread:.16},materials:{reflection:.35,specular:1.98,roughness:.11,diffuse:2,envStrength:0,rim:0,rimExponent:2,emission:.008,emissionColor:"#ffffff",emissionMode:0},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!1,shadowSoftness:78,shadowIntensity:1,shadowBias:0},quality:{detail:1.1,fudgeFactor:.8,pixelThreshold:.5,maxSteps:300,aaMode:"Auto",aaLevel:1},optics:{dofStrength:0,dofFocus:1.368}},cameraPos:{x:.4920528506922438,y:-.07167206331378606,z:.4438830367018614},cameraRot:{x:-.2287674791967978,y:.3386642094524777,z:-.6145511225348657,w:.6747584097208478},cameraFov:60,sceneOffset:{x:0,y:0,z:0,xL:.43671384293273163,yL:-.013902955556870706,zL:.11442336133892608},cameraMode:"Orbit",lights:[{type:"Point",position:{x:.554923231509613,y:-.15190121945393503,z:-.030795909267397503},rotation:{x:0,y:0,z:0},color:"#FFFFFF",intensity:5,falloff:61.5,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},v={id:"Buffalo",name:"Buffalo 3D",shortDescription:'Mandelbulb with per-axis absolute value folds — creates the signature "buffalo" shape.',description:"The Buffalo fractal (ported from Mandelbulber via 3Dickulus). A Mandelbulb variant with selective per-axis absolute value folding before and after the power iteration. The default abs on Y+Z creates the distinctive buffalo/horn shape. Based on the original by youhn @ fractalforums.com.",juliaType:"julia",shader:{function:`
    void formula_Buffalo(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // Vec3B: Abs before power
        z3 = mix(z3, abs(z3), step(vec3(0.5), uVec3B));

        gmt_applyRodrigues(z3);

        // Mandelbulb power iteration (branchless)
        float r = max(length(z3), 1.0e-9);
        float power = uParamA;
        float rp1 = pow(r, power - 1.0);
        dr = rp1 * power * dr + 1.0;

        float theta = acos(clamp(z3.z / r, -1.0, 1.0));
        float phi_angle = atan(z3.y, z3.x);
        float zr = rp1 * r;
        theta *= power;
        phi_angle *= power;

        z3 = zr * vec3(sin(theta) * cos(phi_angle), sin(phi_angle) * sin(theta), cos(theta));

        // Vec3A: Abs after power
        z3 = mix(z3, abs(z3), step(vec3(0.5), uVec3A));

        z3 += c.xyz;
        z.xyz = z3;
        trap = min(trap, r);
    }`,loopBody:"formula_Buffalo(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3C);",usesSharedRotation:!0},parameters:[{label:"Power",id:"paramA",min:1,max:16,step:.001,default:2},{label:"Abs After Power",id:"vec3A",type:"vec3",min:0,max:1,step:1,default:{x:0,y:1,z:1},mode:"toggle"},{label:"Abs Before Power",id:"vec3B",type:"vec3",min:0,max:1,step:1,default:{x:0,y:0,z:0},mode:"toggle"},{label:"Rotation",id:"vec3C",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"}],defaultPreset:{formula:"Buffalo",features:{coreMath:{iterations:21,paramA:2,vec3A:{x:0,y:1,z:1},vec3B:{x:0,y:0,z:0},vec3C:{x:0,y:0,z:0}},coloring:{mode:0,repeats:1,phase:.21,scale:10.928878861622898,offset:1.0718989457927122,bias:1,twist:0,escape:5,mode2:4,repeats2:1,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#aaccff",layer3Scale:10,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1766251986254_0",position:0,color:"#330600",bias:.5,interpolation:"linear"},{id:"1766252034417",position:.13654618473895586,color:"#BC2900",bias:.5,interpolation:"linear"},{id:"1766251986254_1",position:.3,color:"#FFAF0D",bias:.5,interpolation:"linear"},{id:"1766252020600",position:.5180722891566265,color:"#743C14",bias:.5,interpolation:"linear"},{id:"1766252024362",position:.6224899598393574,color:"#0B091D",bias:.5,interpolation:"linear"},{id:"1766251986254_2",position:.7,color:"#001B3D",bias:.5,interpolation:"linear"},{id:"1766251986254_3",position:1,color:"#700303",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},ao:{aoIntensity:0,aoSpread:.2,aoSamples:7,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:100,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:50,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1.5,reflection:0,specular:.27,roughness:.342,rim:0,rimExponent:4,envStrength:.65,envBackgroundStrength:.21,envSource:1,useEnvMap:!1,envRotation:0,emission:.1,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1773425036101_0",position:0,color:"#421E0F",bias:.5,interpolation:"linear"},{id:"1773425036101_1",position:.067,color:"#19071A",bias:.5,interpolation:"linear"},{id:"1773425036101_2",position:.133,color:"#09012F",bias:.5,interpolation:"linear"},{id:"1773425036101_3",position:.2,color:"#040449",bias:.5,interpolation:"linear"},{id:"1773425036101_4",position:.267,color:"#000764",bias:.5,interpolation:"linear"},{id:"1773425036101_5",position:.333,color:"#0C2C8A",bias:.5,interpolation:"linear"},{id:"1773425036101_6",position:.4,color:"#1852B1",bias:.5,interpolation:"linear"},{id:"1773425036101_7",position:.467,color:"#397DD1",bias:.5,interpolation:"linear"},{id:"1773425036101_8",position:.533,color:"#86B5E5",bias:.5,interpolation:"linear"},{id:"1773425036101_9",position:.6,color:"#D3ECF8",bias:.5,interpolation:"linear"},{id:"1773425036101_10",position:.667,color:"#F1E9BF",bias:.5,interpolation:"linear"},{id:"1773425036101_11",position:.733,color:"#F8C95F",bias:.5,interpolation:"linear"},{id:"1773425036101_12",position:.8,color:"#FFAA00",bias:.5,interpolation:"linear"},{id:"1773425036101_13",position:.867,color:"#CC8000",bias:.5,interpolation:"linear"},{id:"1773425036101_14",position:.933,color:"#995700",bias:.5,interpolation:"linear"},{id:"1773425036101_15",position:1,color:"#6A3403",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!0,juliaX:.37,juliaY:-.34,juliaZ:-.42,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002},quality:{detail:1.618,fudgeFactor:1,pixelThreshold:.25,maxSteps:300,estimator:0},optics:{camFov:50,dofStrength:0,dofFocus:1.407048060869024}},cameraPos:{x:-11409465865707341e-33,y:10722232409131055e-32,z:-.09316535897248968},cameraRot:{x:1,y:-7271568003412109e-48,z:-6123233995736766e-32,w:3710962377975202e-33},cameraFov:50,sceneOffset:{x:-17223652652763669e-32,y:9193078863633456e-32,z:-2.6897222995758057,xL:-4285372606041406e-39,yL:-9521451285809295e-41,zL:-39146655694821675e-24},targetDistance:.09316535897248968,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.4527317101694649,y:-.04511061025925526,z:-2.1858885005397504},rotation:{x:0,y:0,z:0},color:"#FFCEA6",intensity:.75,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:4e3},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-3},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},S={id:"Modular",name:"Modular Builder",shortDescription:"Construct custom fractal equations using a Node Graph.",description:"Construct your own fractal equation by chaining operations together. Combine folds, rotations, and logic via the Graph tab.",juliaType:"none",shader:{function:"",loopBody:"",getDist:""},parameters:[null,null,null,null],defaultPreset:{formula:"Modular",features:{coreMath:{iterations:16,paramA:8,paramB:0,paramC:0,paramD:0,paramE:0,paramF:0},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.002}},pipeline:o,cameraPos:{x:0,y:0,z:4},cameraRot:{x:0,y:0,z:0,w:1},sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0}}},w={id:"MandelTerrain",name:"MandelTerrain",shortDescription:'3D Heightmap of the Mandelbrot set. Creates alien landscapes and "Math Mountains".',description:"A 3D Heightmap of the Mandelbrot set. Iterations slider controls terrain detail.",juliaType:"julia",shader:{function:`
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
            // 1. Base Terrain (Param A)
            // 'dist' goes to 0.0 exactly at the boundary.
            // FIXED: Use sqrt(dist * zoom) instead of sqrt(dist) * zoom to keep height
            // proportional to feature width regardless of zoom level.
            // This prevents "spikes" from growing uncontrollably deep in the set.
            h += sqrt(dist * zoom) * uParamA;
            
            // 2. Layer 2 Driven Ripples (Param C) - Driven by Gradient Brightness
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
        } else {
            // Inside the set (The Lake)
            h = 0.0; 
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
    }`,loopBody:"formula_MandelTerrain(z, dr, trap, c); break;",getDist:`
            // Standard return
            return vec2(r, dr);
        `},parameters:[{label:"Map Zoom",id:"paramB",min:0,max:16,step:.01,default:1},{label:"Pan (Real, Imag)",id:"vec2A",type:"vec2",min:-2,max:2,step:1e-4,default:{x:0,y:0}},{label:"Height: Distance Estimator",id:"paramA",min:-5,max:5,step:.01,default:0},{label:"Height: Layer 2 Gradient",id:"paramC",min:-.2,max:.2,step:.001,default:0},{label:"Height: SmoothTrap",id:"paramD",min:-5,max:5,step:.01,default:0}],defaultPreset:{version:1,name:"MandelTerrain",formula:"MandelTerrain",features:{coreMath:{iterations:60,paramA:0,paramB:1,paramC:0,paramD:0,vec2A:{x:0,y:0}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:-.86,juliaY:-.22,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowSteps:128,shadowSoftness:19.5,shadowIntensity:1,shadowBias:1e-4,lights:[{position:{x:-.77,y:1.82,z:-.49},color:"#ffeedd",intensity:2,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{position:{x:-5,y:2,z:-5},color:"#4455aa",intensity:1,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!1},{position:{x:0,y:5,z:-5},color:"#ffffff",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!1}]},ao:{aoIntensity:0,aoSpread:.11,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:30,fogColor:"#051020",fogDensity:.02,glowIntensity:0,glowSharpness:3.8,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1,reflection:0,specular:0,roughness:.2,rim:0,rimExponent:3,envStrength:0,envMapVisible:!1,envBackgroundStrength:1,envSource:1,envMapData:null,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"1",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],emission:.3,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:[{id:"0",position:0,color:"#001133",bias:.5,interpolation:"linear"},{id:"1",position:.153,color:"#0063A5",bias:.5,interpolation:"linear"},{id:"2",position:.324,color:"#0093F5",bias:.749,interpolation:"linear"},{id:"3",position:.895,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"4",position:.908,color:"#000000",bias:.5,interpolation:"linear"}],mode:7,scale:.2710027100271003,offset:-.007588075880758799,repeats:1,phase:-.2,bias:1,twist:0,escape:20,gradient2:[{id:"1",position:.077,color:"#000000",bias:.52,interpolation:"smooth"},{id:"2",position:.196,color:"#020202",bias:.83,interpolation:"smooth"},{id:"3",position:.857,color:"#000000",bias:.5,interpolation:"linear"},{id:"4",position:.925,color:"#797979",bias:.5,interpolation:"linear"}],mode2:0,scale2:.74,offset2:.55,repeats2:1,phase2:.43,bias2:1,twist2:0,blendMode:0,blendOpacity:0},texturing:{active:!1,layer1Data:null,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:2,estimator:0,fudgeFactor:.35,detail:1.1,pixelThreshold:.5,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1.5,levelsMin:0,levelsMax:.5,levelsGamma:.77},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},audio:{threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.7071067811865476,y:0,z:0,w:.7071067811865475},sceneOffset:{x:-.082,y:3.17,z:-.38,xL:.082,yL:-.1700000000000009,zL:.3800000000000002},targetDistance:2.997344970703125,cameraMode:"Orbit",lights:[]}},F={id:"MarbleMarcher",name:"Marble Marcher",shortDescription:"The dynamic fractal from the game Marble Marcher. Fast rendering, geometric feel.",description:"The dynamic fractal from the game Marble Marcher. A specialized Menger Sponge IFS with rotation and shifting steps.",juliaType:"offset",shader:{preamble:`
    // MarbleMarcher: Pre-calculated rotation matrices (computed once per frame)
    // Two separate rotations at different algorithm stages
    float uMM_sZ = 0.0, uMM_cZ = 1.0;
    float uMM_sX = 0.0, uMM_cX = 1.0;
    float uMM_sY = 0.0, uMM_cY = 1.0;

    void MarbleMarcher_precalcRotation() {
        if (abs(uVec3B.x) > 0.001) {
            uMM_sZ = sin(uVec3B.x);
            uMM_cZ = cos(uVec3B.x);
        }
        if (abs(uVec3B.y) > 0.001) {
            uMM_sX = sin(uVec3B.y);
            uMM_cX = cos(uVec3B.y);
        }
        if (abs(uVec3B.z) > 0.001) {
            uMM_sY = sin(uVec3B.z);
            uMM_cY = cos(uVec3B.z);
        }
    }`,function:`
    void formula_MarbleMarcher(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        // 1. Abs
        z3 = abs(z3);

        // 2. Rot Z (Vec3B.x) — applied after abs
        if (abs(uVec3B.x) > 0.001) {
            z3.xy = mat2(uMM_cZ, uMM_sZ, -uMM_sZ, uMM_cZ) * z3.xy;
        }

        // 3. Menger Fold (sort descending)
        float a = min(z3.x - z3.y, 0.0); z3.x -= a; z3.y += a;
        a = min(z3.x - z3.z, 0.0); z3.x -= a; z3.z += a;
        a = min(z3.y - z3.z, 0.0); z3.y -= a; z3.z += a;

        // 4. Rot X (Vec3B.y) — applied after Menger fold
        if (abs(uVec3B.y) > 0.001) {
            z3.yz = mat2(uMM_cX, uMM_sX, -uMM_sX, uMM_cX) * z3.yz;
        }

        // 4b. Rot Y (Vec3B.z) — applied after X rotation
        if (abs(uVec3B.z) > 0.001) {
            z3.xz = mat2(uMM_cY, uMM_sY, -uMM_sY, uMM_cY) * z3.xz;
        }

        // 5. Scale (Param A)
        float scale = uParamA;
        z3 *= scale;
        dr *= abs(scale);

        // 6. Vec3A: Shift X/Y/Z
        z3 += uVec3A;

        if (uJuliaMode > 0.5) z3 += c.xyz;

        z.xyz = z3;

        // Box trap for coloring
        vec3 boxDist = abs(z3) - vec3(1.0);
        trap = min(trap, length(max(boxDist, 0.0)) + min(max(boxDist.x, max(boxDist.y, boxDist.z)), 0.0));
    }`,loopBody:"formula_MarbleMarcher(z, dr, trap, c);",loopInit:"MarbleMarcher_precalcRotation();",preambleVars:["uMM_sZ","uMM_cZ","uMM_sX","uMM_cX","uMM_sY","uMM_cY"],getDist:`
            float limit = 6.0;
            return vec2((r - limit) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:1,max:4,step:.001,default:2},{label:"Shift",id:"vec3A",type:"vec3",min:-5,max:5,step:.01,default:{x:-2,y:-2,z:-2}},{label:"Rotation (Z, X, Y)",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"axes",scale:"pi"}],defaultPreset:{formula:"MarbleMarcher",features:{coreMath:{iterations:21,paramA:1.89,vec3A:{x:-2.16,y:-2.84,z:-2.47},vec3B:{x:-.047,y:.025,z:0}},coloring:{mode:6,repeats:2.5,phase:0,scale:1,offset:0,bias:1,twist:0,escape:16.18,mode2:6,repeats2:250,phase2:5,blendMode:2,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,gradient:[{id:"1766936009557_0",position:.0369,color:"#130606",bias:.5,interpolation:"linear"},{id:"1766936025161",position:.1409,color:"#463434",bias:.5,interpolation:"linear"},{id:"1766936020401",position:.4194,color:"#828282",bias:.5,interpolation:"linear"},{id:"1766936032564",position:.6879,color:"#BCBCBC",bias:.5,interpolation:"linear"},{id:"1766936039597",position:1,color:"#875656",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#FFFFFF"}]},texturing:{active:!1,scaleX:4,scaleY:24,offset:{x:-.02,y:-.08},mapU:6,mapV:8,layer1Data:null},materials:{reflection:-.44,specular:0,roughness:.5,diffuse:.92,envStrength:0,rim:0,rimExponent:4,emission:.085,emissionColor:"#ffffff",emissionMode:1,envMapVisible:!1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"0",position:.03,color:"#130606"},{id:"1",position:.14,color:"#463434"},{id:"2",position:.41,color:"#824040"},{id:"3",position:.68,color:"#BCBCBC"},{id:"4",position:1,color:"#875656"}]},atmosphere:{fogNear:0,fogFar:100,fogColor:"#7E6861",fogDensity:0,glowIntensity:1e-4,glowSharpness:400,glowColor:"#ffffff",glowMode:!1,aoIntensity:.44,aoSpread:.28,aoMode:!1},geometry:{juliaMode:!1,juliaX:-2,juliaY:.86,juliaZ:-2,hybridMode:!1,hybridIter:2,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1},lighting:{shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:7e-4},quality:{detail:1.1,fudgeFactor:.62,pixelThreshold:.5,maxSteps:300,distanceMetric:1},optics:{dofStrength:0,dofFocus:4.65}},cameraPos:{x:1.7472844097880647,y:-1.3734380139592728,z:2.8232426812200377},cameraRot:{x:.23927126357209905,y:.22332520402424524,z:.14464802218445671,w:.9337837358587185},cameraFov:75,sceneOffset:{x:2,y:-2,z:2,xL:-.25680194984918847,yL:.6967983054660813,zL:.44809374764147025},targetDistance:.5,cameraMode:"Orbit",lights:[{type:"Point",position:{x:.936,y:-2.75,z:6.21},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:8,falloff:.67,falloffType:"Linear",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-5,y:-2,z:2},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:1,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-5},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:1,falloff:0,falloffType:"Linear",fixed:!1,visible:!1,castShadow:!1}]}},_={id:"JuliaMorph",name:"Julia Morph (Stack)",shortDescription:'Constructs 3D volumes by stacking 2D Julia sets. Perfect for topographic or sliced "MRI" effects.',description:"Constructs a 3D object by stacking 2D Julia sets along the Z-axis. Start C and End C define the Julia constants at the bottom and top. The constant smoothly interpolates between them along the height.",juliaType:"julia",shader:{function:`
    void formula_JuliaMorph(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // --- 1. MAPPING & DEFORMATION ---
        float height = max(0.1, uParamA);
        float z_val = p.z;
        float taperFactor = 1.0;

        // Bend FIRST: Curve the column along X-axis (works on original p)
        // paramD = bend direction (signed distance), abs value = curvature amount
        // Must come before twist/taper since it remaps all coordinates
        if (abs(uParamD) > 0.001) {
            float R = 20.0 / abs(uParamD);
            float sd = sign(uParamD);
            // Mirror X for negative bend, bend around +X pivot, then mirror back
            float px = p.x * sd;
            float px_shifted = px + R;
            float dist = length(vec2(px_shifted, p.z));
            float ang = atan(p.z, px_shifted);
            // Unbend: radial distance becomes new X, arc length becomes new Z
            p.x = (dist - R) * sd;
            z_val = ang * R;
        }

        float t = clamp((z_val / height) + 0.5, 0.0, 1.0);
        vec2 Z = p.xy;

        // Taper: scale XY based on Z position, with DE compensation
        if (abs(uParamE) > 0.001) {
            taperFactor = 1.0 + t * uParamE;
            Z *= taperFactor;
        }

        // Twist: Rotate XY around center based on Z
        if (abs(uParamC) > 0.001) {
            float ang = z_val * uParamC;
            float s = sin(ang); float co = cos(ang);
            Z = mat2(co, -s, s, co) * Z;
        }

        // --- 2. INTERPOLATION ---
        vec2 c1 = uVec2B;
        vec2 c2 = uVec2A;
        float t_smooth = t * t * (3.0 - 2.0 * t);
        vec2 C = mix(c1, c2, t_smooth);

        // --- 3. 2D JULIA ITERATION ---
        float r2 = dot(Z,Z);
        float dz_2d = 1.0;
        float iter_count = 0.0;

        float bailout = 10000.0;
        int limit = int(uIterations);
        float localTrap = 1e10;

        bool escaped = false;

        const int MAX_FORMULA_ITER = 3000;

        for(int i=0; i<MAX_FORMULA_ITER; i++) {
            if (i >= limit) break;

            // Derivative: |dz'| = 2|z| * |dz|
            dz_2d *= 2.0 * sqrt(r2);
            if (dz_2d > 1.0e10) dz_2d = 1.0e10;

            // Z = Z^2 + C
            float nx = (Z.x * Z.x - Z.y * Z.y) + C.x;
            float ny = (2.0 * Z.x * Z.y) + C.y;
            Z = vec2(nx, ny);

            r2 = dot(Z,Z);
            localTrap = min(localTrap, r2);
            iter_count += 1.0;

            if(r2 > bailout) {
                escaped = true;
                break;
            }
        }

        // --- 4. SMOOTH ITERATION ---
        float smooth_iter;
        if (escaped) {
            float logZn = log(r2) / 2.0;
            float nu = log(logZn / log(2.0)) / log(2.0);
            smooth_iter = iter_count + 1.0 - nu;
        } else {
            smooth_iter = iter_count;
        }

        // --- 5. DISTANCE ESTIMATION ---
        float d2d;
        if (escaped && dz_2d > 1.0e-7) {
             // Exterior: standard 2D Julia DE
             d2d = 0.5 * sqrt(r2) * log(r2) / dz_2d;
        } else {
             // Interior: approximate negative distance from boundary
             // Use sqrt of orbit trap (minimum r² seen) as rough interior distance
             d2d = -sqrt(localTrap) * 0.5;
        }

        // Taper DE compensation: scaled coordinates produce scaled distances
        if (abs(taperFactor) > 0.01) {
            d2d /= abs(taperFactor);
        }

        // Twist DE correction: twist stretches space by sqrt(1 + (twist_rate * r_xy)^2)
        // This is the Jacobian correction for the twist deformation
        if (abs(uParamC) > 0.001) {
            float r_xy = length(p.xy);
            d2d /= sqrt(1.0 + uParamC * uParamC * r_xy * r_xy);
        }

        // Bend DE correction: bend compresses/stretches distances depending on
        // distance from the bend axis. Correction factor = R / (R + p.x)
        if (abs(uParamD) > 0.001) {
            float bendR = 20.0 / abs(uParamD);
            float bendCorr = bendR / max(bendR + p.x * sign(uParamD), 0.1);
            d2d *= bendCorr;
        }

        // Vertical Box Bounds (using warped z_val)
        float d_z = abs(z_val) - (height * 0.5);

        // Combine: Intersection of Julia Column + Height Box
        float d = max(d2d, d_z);

        // --- 6. SLICING ---
        float sliceInterval = uParamF;
        if (sliceInterval > 0.01) {
            float ratio = clamp(uParamB, 0.01, 0.95);
            float thickness = (sliceInterval * 0.5) * ratio;
            float distToSlice = abs(mod(z_val, sliceInterval) - sliceInterval * 0.5) - thickness;
            d = max(d, distToSlice);
        }

        trap = min(trap, localTrap);

        // Return packed result
        z = vec4(Z.x, Z.y, d, smooth_iter);
    }`,loopBody:"formula_JuliaMorph(z, dr, trap, c); break;",getDist:`
            return vec2(z.z, z.w);
        `},parameters:[{label:"Height (Z Scale)",id:"paramA",min:.1,max:10,step:.1,default:5},{label:"Slice Interval",id:"paramF",min:0,max:2,step:.01,default:.33},{label:"Slice Thickness",id:"paramB",min:.01,max:1,step:.01,default:.27},{label:"Start C",id:"vec2B",type:"vec2",min:-2,max:2,step:.001,default:{x:1.03,y:-1.072}},{label:"End C",id:"vec2A",type:"vec2",min:-2,max:2,step:.001,default:{x:.286,y:.009}},{label:"Twist",id:"paramC",min:-5,max:5,step:.01,default:0,scale:"pi"},{label:"Bend",id:"paramD",min:-5,max:5,step:.01,default:0},{label:"Taper",id:"paramE",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"JuliaMorph",features:{coreMath:{iterations:100,paramA:5,paramB:.27,paramC:0,paramF:.53,vec2A:{x:.286,y:.009},vec2B:{x:1.03,y:-1.072}},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0},coloring:{mode:1,scale:4.697920323185873,offset:.13,repeats:1,phase:.13,bias:1,escape:4,gradient:[{id:"1",position:0,color:"#080022",bias:.5,interpolation:"linear"},{id:"2",position:.3,color:"#1C2058",bias:.5,interpolation:"linear"},{id:"3",position:.6,color:"#00ccff",bias:.5,interpolation:"linear"},{id:"4",position:.735261118203675,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"1768818072358",position:1,color:"#090022",bias:.5,interpolation:"linear"}],mode2:0,scale2:.4003079069279198,offset2:.48021004308135196,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:1,gradient2:[{id:"1768817090653_0",position:0,color:"#9e0142",bias:.5,interpolation:"linear"},{id:"1768817090653_1",position:.111,color:"#d53e4f",bias:.5,interpolation:"linear"},{id:"1768817090653_2",position:.222,color:"#f46d43",bias:.5,interpolation:"linear"},{id:"1768817090653_3",position:.333,color:"#fdae61",bias:.5,interpolation:"linear"},{id:"1768817090653_4",position:.444,color:"#fee08b",bias:.5,interpolation:"linear"},{id:"1768817090653_5",position:.556,color:"#e6f598",bias:.5,interpolation:"linear"},{id:"1768817090653_6",position:.667,color:"#abdda4",bias:.5,interpolation:"linear"},{id:"1768817090653_7",position:.778,color:"#66c2a5",bias:.5,interpolation:"linear"},{id:"1768817090653_8",position:.889,color:"#3288bd",bias:.5,interpolation:"linear"},{id:"1768817090653_9",position:1,color:"#5e4fa2",bias:.5,interpolation:"linear"}],layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},atmosphere:{fogNear:0,fogFar:5,fogColor:"#050510",fogDensity:.02,glowIntensity:0,glowSharpness:200,glowMode:!1,glowColor:"#ffffff",aoIntensity:0,aoSpread:.2,aoMode:!1},materials:{diffuse:1,reflection:0,specular:.61,roughness:.22438819237827662,rim:0,rimExponent:4,envStrength:0,envMapVisible:!1,envBackgroundStrength:1,envSource:1,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},lighting:{shadows:!0,shadowSoftness:41.7859226170808,shadowIntensity:.92,shadowBias:.002,ptBounces:3,ptGIStrength:1,ptStochasticShadows:!1},quality:{fudgeFactor:1,detail:4,pixelThreshold:.5,maxSteps:300,distanceMetric:0},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.42,autoSlow:!0}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.21740819322063967,y:.12483788618539499,z:-.11589452875015582,w:.9611023035551793},sceneOffset:{x:0,y:-1,z:4,xL:.10960732222484179,yL:-.26099943689461447,zL:.15599693750325688},targetDistance:2.512885481119156,cameraMode:"Fly",lights:[{type:"Point",position:{x:2.056650977487994,y:-.7418778505604411,z:3.39849758131238},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:8.76,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:-.37117243582015064,y:-1.5852765971855902,z:3.0489919017830487},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0}]}},M={id:"Mandelorus",name:"Mandelorus",shortDescription:'The "True" 3D Mandelbrot topology. Wraps space around a ring instead of a point.',description:"Wraps the fractal iteration around a Torus (Donut). Creates a Solenoid structure. Twist is linked to Power: 1.0 Twist = 1 Symmetry Shift (360/Power).",juliaType:"julia",shader:{function:`
        void formula_Mandelorus(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 p = z.xyz;
            float R = uParamA;       // Major Radius
            float twistInput = uParamB;   // Twist Steps (1.0 = 1 Symmetry Unit)
            float power = uParamC;   // Fractal Power
            
            // Phase controls (vec2A: ring phase, cross phase)
            float ringPhase = uVec2A.x;
            float crossPhase = uVec2A.y;
            
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
        }`,loopBody:"formula_Mandelorus(z, dr, trap, c);"},parameters:[{label:"Ring Radius",id:"paramA",min:.1,max:5,step:.01,default:1},{label:"Twist (Sym)",id:"paramB",min:-8,max:8,step:.1,default:0},{label:"Power",id:"paramC",min:1,max:16,step:.01,default:8},{label:"Phase (Ring, Cross)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.01,default:{x:0,y:0},scale:"pi"},{label:"Vert Scale",id:"paramF",min:-.9,max:2,step:.01,default:0}],defaultPreset:{version:2,name:"Mandelorus",formula:"Mandelorus",features:{coreMath:{iterations:31,paramA:1.32,paramB:0,paramC:5,paramF:0,vec2A:{x:0,y:-1.159203974648639}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:16,shadowSteps:128,shadowBias:.002,lights:[{type:"Directional",position:{x:1.8089856063656191,y:.769231473548869,z:-3.1565777253328235},rotation:{x:.08548818739394098,y:2.7391915549407027,z:.41340674852481984},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.3992177013734381,aoSpread:.12250592248526632,aoSamples:5,aoMode:!1,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.0013419894295067058,glowSharpness:13.803842646028853,glowMode:!0,glowColor:"#ff0000"},materials:{diffuse:1,reflection:0,specular:.3,roughness:.5,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:.4,emissionMode:2,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771161402247_0",position:.07178750897343862,color:"#141414",bias:.5,interpolation:"linear"},{id:"1771161413328",position:.1225174070688263,color:"#F40000",bias:.5,interpolation:"linear"},{id:"1771161432807",position:.1627184120939519,color:"#FFA9A9",bias:.5,interpolation:"linear"},{id:"1771161412141",position:.2027890750198856,color:"#0D0D0D",bias:.5,interpolation:"linear"},{id:"1771161402247_1",position:.6090930507893446,color:"#ffffff",bias:.5,interpolation:"linear"},{id:"1771161445770",position:1,color:"#181818",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:5,offset:.30000000000000004,repeats:1,phase:-.7,bias:1,twist:0,escape:4,gradient2:{stops:[{id:"1771161496387_0",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_1",position:.07083040060795048,color:"#550000",bias:.5,interpolation:"linear"},{id:"1771161496387_2",position:.1627184120939519,color:"#FF2222",bias:.5,interpolation:"linear"},{id:"1771161496387_3",position:.2027890750198856,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_4",position:.6090930507893446,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161496387_5",position:1,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode2:0,scale2:4.999999999999999,offset2:.30000000000000004,repeats2:1,phase2:-.7,bias2:1,twist2:0,blendMode:1,blendOpacity:1,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.5,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:1,y:-727156800341211e-47,z:-6123233995736766e-32,w:3710962377975166e-33},sceneOffset:{x:.02015586569905281,y:.005605148617178202,z:-5.211455821990967,xL:5716822570889235e-25,yL:21298747235435714e-26,zL:-22618142203612024e-23},targetDistance:5.214554250240326,cameraMode:"Orbit",lights:[]}},A={id:"Appell",name:"Appell Spectral (Ghost)",shortDescription:"Simplified Appell polynomial iteration. Renders skeletal, interference-like structures.",description:'Implements a simplified Appell polynomial: P(x) = x^n - k|x|^2, where the non-conformal subtraction destabilizes the surface, revealing skeletal interference patterns. The "Interference" parameter k controls how much structure is stripped away. Best viewed as a volumetric cloud.',juliaType:"none",shader:{function:`
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
    }`,loopBody:"formula_Appell(z, dr, trap, c);"},parameters:[{label:"Interference",id:"paramA",min:0,max:1.5,step:.001,default:.333},{label:"Power",id:"paramB",min:1,max:8,step:.01,default:2},{label:"Ghost Shift",id:"paramC",min:-1,max:1,step:.001,default:0},{label:"Cloud Density",id:"paramD",min:0,max:1,step:.01,default:.5},{label:"Phase",id:"paramE",min:0,max:6.28,step:.01,default:0,scale:"pi"}],defaultPreset:{version:2,name:"Appell",formula:"Appell",features:{coreMath:{iterations:10,paramA:.761,paramB:2.83,paramC:-.391,paramD:.24,paramE:0,paramF:0},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:16,shadowSteps:128,shadowBias:.002,lights:[{type:"Point",position:{x:-2,y:1,z:2},rotation:{x:0,y:0,z:0},color:"#ffffff",intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:0,aoSpread:.5,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:6,fogColor:"#000000",fogDensity:0,glowIntensity:4.999999999999999,glowSharpness:12.02264434617413,glowMode:!1,glowColor:"#00ffff"},materials:{diffuse:1.16,reflection:0,specular:0,roughness:.5872188659713031,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"5",position:.006101938262742301,color:"#000000",bias:.5,interpolation:"linear"},{id:"4",position:.07666905958363249,color:"#5744FF",bias:.5,interpolation:"linear"},{id:"3",position:.2198492462311558,color:"#0088ff",bias:.5,interpolation:"linear"},{id:"2",position:.3802584350323044,color:"#001133",bias:.5,interpolation:"linear"},{id:"1",position:.46518305814788224,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161963853_0",position:.5402010050251256,color:"#000000",bias:.5,interpolation:"linear"},{id:"1771161963853_1",position:.6,color:"#001133",bias:.5,interpolation:"linear"},{id:"1771161963853_2",position:.75,color:"#0088ff",bias:.5,interpolation:"linear"},{id:"1771161963853_3",position:.9,color:"#F644FF",bias:.5,interpolation:"linear"},{id:"1771161963853_4",position:1,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:8,scale:.5557213101593343,offset:.05468077546160833,repeats:1.2,phase:0,bias:1,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.01,stepRelaxation:0,refinementSteps:0,detail:3.1,pixelThreshold:1,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.6190587983598513,y:.40078133786953346,z:-.5821092438548545,w:.3424753299253732},sceneOffset:{x:-.3737236559391022,y:-1.5770468711853027,z:-.1308211237192154,xL:-.060257730662381714,yL:.02761814157420639,zL:.002646650329445943},targetDistance:1.0691482573747906,cameraMode:"Orbit",lights:[]}},T={id:"Borromean",name:"Borromean (Cyclic)",shortDescription:"Three interlocking Complex Planes. Uses dimensional feedback loops instead of spherical math.",description:'Treats 3D space as three coupled 2D planes (XY, YZ, ZX). The output of one plane becomes the input of the next, creating a "Rock-Paper-Scissors" feedback loop. Produces tetrahedral symmetries and solid, non-spherical shapes.',juliaType:"none",shader:{function:`
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
    }`,loopBody:"formula_Borromean(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1,max:5,step:.01,default:2},{label:"Connection",id:"paramB",min:0,max:3,step:.01,default:1},{label:"Repulsion",id:"paramC",min:0,max:3,step:.01,default:1},{label:"Balance",id:"paramD",min:0,max:2,step:.01,default:0},{label:"Phase",id:"paramE",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"},{label:"Invert",id:"paramF",min:-1,max:1,step:2,default:1}],defaultPreset:{version:1,name:"Borromean",formula:"Borromean",features:{coreMath:{iterations:28,paramA:2.25,paramB:1.04,paramC:.92,paramD:0,paramE:0,paramF:1},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:.82,shadowSoftness:8,shadowSteps:128,shadowBias:.002,lights:[{type:"Directional",position:{x:-1.9999999999999998,y:1,z:2},rotation:{x:-1.3618058113303921,y:2.6135019110558524,z:-2.4974118716462748},color:"#ffffff",intensity:2.8224,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.36219236319294446,aoSpread:.010521796258218545,aoSamples:22,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.064445198559225,glowSharpness:1.8620871366628675,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:1.92,reflection:0,specular:1.52,roughness:.23035625001175353,rim:0,rimExponent:4,envStrength:0,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771160459074_0",position:0,color:"#5F4690",bias:.5,interpolation:"linear"},{id:"1771160459074_1",position:.091,color:"#1D6996",bias:.5,interpolation:"linear"},{id:"1771160459074_2",position:.182,color:"#38A6A5",bias:.5,interpolation:"linear"},{id:"1771160459074_3",position:.273,color:"#0F8554",bias:.5,interpolation:"linear"},{id:"1771160459074_4",position:.364,color:"#73AF48",bias:.5,interpolation:"linear"},{id:"1771160459074_5",position:.455,color:"#EDAD08",bias:.5,interpolation:"linear"},{id:"1771160459074_6",position:.545,color:"#E17C05",bias:.5,interpolation:"linear"},{id:"1771160459074_7",position:.636,color:"#CC503E",bias:.5,interpolation:"linear"},{id:"1771160459074_8",position:.727,color:"#94346E",bias:.5,interpolation:"linear"},{id:"1771160459074_9",position:.818,color:"#6F4070",bias:.5,interpolation:"linear"},{id:"1771160459074_10",position:.909,color:"#994E95",bias:.5,interpolation:"linear"},{id:"1771160459074_11",position:1,color:"#666666",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:1,scale:2.2754446706935223,offset:-.07388697269814448,repeats:2,phase:0,bias:1,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:.5,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.2938195179022356,y:.33371368466206736,z:.11030705445694247,w:.8888968563933598},sceneOffset:{x:1.540531039237976,y:1.1154367923736572,z:1.807411551475525,xL:-.31978609027941085,yL:.2396308322743712,zL:-.23608000053467415},targetDistance:2.0720281302928925,cameraMode:"Orbit",lights:[]}},C={id:"MandelMap",name:"MandelMap (Unrolled)",shortDescription:"Unrolls the Mandelbulb surface. Features Sphere, Cylinder, and Torus projections.",description:'Maps the Mandelbulb 3D structure onto a 2D plane. Use "Projection" (Param D) to switch between Spherical (Standard), Cylindrical (Infinite Vertical), and Toroidal (Seamless) mappings.',juliaType:"julia",shader:{function:`
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
        float thetaPhase = uVec2A.x;
        float phiPhase = uVec2A.y;

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
    }`,loopBody:"formula_MandelMap(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:2,max:16,step:.01,default:8},{label:"Height Amp",id:"paramB",min:.1,max:10,step:.1,default:2},{label:"Map Scale",id:"paramC",min:.1,max:5,step:.01,default:1},{label:"Projection",id:"paramD",min:0,max:2,step:1,default:1,options:[{label:"Spherical",value:0},{label:"Cylindrical",value:1},{label:"Toroidal",value:2}]},{label:"Phase (θ, φ)",id:"vec2A",type:"vec2",min:-6.28,max:6.28,step:.1,default:{x:0,y:0},scale:"pi"}],defaultPreset:{version:1,name:"MandelMap",formula:"MandelMap",features:{coreMath:{iterations:11,paramA:4,paramB:1.61,paramC:1,paramD:0,vec2A:{x:0,y:0}},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!1,hybridMode:!1,hybridIter:2,hybridFoldLimit:1,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!0,shadowIntensity:1,shadowSoftness:33.96487304923489,shadowSteps:304,shadowBias:0,lights:[{type:"Directional",position:{x:-2,y:1,z:2},rotation:{x:-1.2945477312837892,y:3.0961684975756443,z:-3.0815085191809364},color:"#ffffff",intensity:6.969599999999999,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:0,y:-5,z:2},rotation:{x:0,y:0,z:0},color:"#0088ff",intensity:.25,falloff:0,falloffType:"Quadratic",fixed:!0,visible:!1,castShadow:!0}]},ao:{aoIntensity:.7102583030181524,aoSpread:.02075305004726551,aoSamples:5,aoMode:!0,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:.66,fogNear:3.3177600000000007,fogFar:14.5,fogColor:"#7f6969",fogDensity:0,glowIntensity:0,glowSharpness:11.220184543019629,glowMode:!1,glowColor:"#ffffff"},materials:{diffuse:2,reflection:0,specular:0,roughness:.5,rim:0,rimExponent:4,envStrength:.75,envBackgroundStrength:0,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"sky",position:0,color:"#000000",bias:.5,interpolation:"smooth"},{id:"hor",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771159172325_0",position:0,color:"#009392",bias:.5,interpolation:"linear"},{id:"1771159172325_1",position:.167,color:"#39b185",bias:.5,interpolation:"linear"},{id:"1771159172325_2",position:.333,color:"#9ccb86",bias:.5,interpolation:"linear"},{id:"1771159172325_3",position:.5,color:"#e9e29c",bias:.5,interpolation:"linear"},{id:"1771159172325_4",position:.667,color:"#eeb479",bias:.5,interpolation:"linear"},{id:"1771159172325_5",position:.833,color:"#e88471",bias:.5,interpolation:"linear"},{id:"1771159172325_6",position:1,color:"#cf597e",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:1,scale:3.1065735566446993,offset:.20712783526166173,repeats:1,phase:0,bias:.5963552876944301,twist:0,escape:4,gradient2:[{id:"1",position:0,color:"#000000"},{id:"2",position:1,color:"#ffffff"}],mode2:4,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:2,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:0,fudgeFactor:1,stepRelaxation:0,refinementSteps:0,detail:2,pixelThreshold:.5,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!1,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:10},navigation:{flySpeed:.5,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.40127164816286187,y:8701571167029472e-23,z:2710286594285787e-22,w:.9159590953642958},sceneOffset:{x:0,y:4,z:5,xL:-.00800157869605831,yL:-.1778496246363903,zL:-.24803174116677118},targetDistance:4.905199170112612,cameraMode:"Orbit",lights:[]}},P={id:"MandelBolic",name:"MandelBolic",shortDescription:"A true 3D geometric extension of the Mandelbrot set into Hyperbolic 3-Space.",description:'Bypasses the limitations of 3D algebra by using the Poincaré-Ahlfors extension into Hyperbolic 3-Space. This preserves perfect spherical bulbs, exact periodicity, and the true 3D cardioid core without the "smeared" artifacts of standard 3D fractals. Now features generalized Power and Hyperbolic distortion parameters.',juliaType:"julia",shader:{function:`
        void formula_MandelBolic(inout vec4 z, inout float dr, inout float trap, vec4 c) {
            vec3 z3 = z.xyz;
            float power = uParamA;

            // Z is the 2D complex plane (x, y), T is the hyperbolic height (z)
            float rxy2 = z3.x*z3.x + z3.y*z3.y;
            float rxy = sqrt(rxy2);

            // Ahlfors Extension multiplier: M = (|Z|^2 - T^2) / |Z|^2
            // uParamC (Conformal Shift) distorts the hyperbolic mapping
            float m = (rxy2 - uParamC * z3.z*z3.z) / (rxy2 + 1e-20);

            // Shared rxy^(p-1) — used by both derivative and Z mapping
            float rxy_pm1 = pow(max(rxy, 1e-10), power - 1.0);
            float rxy_p = rxy_pm1 * rxy;

            // Derivative: account for split XY/Z Jacobian
            // XY stretch: p * rxy^(p-1) * |m|  (conformal distortion)
            // Z  stretch: p * rxy^(p-1) * |B|  (hyperbolic scaling)
            // Use max for conservative bound on largest singular value
            float stretch = power * rxy_pm1 * max(abs(m), abs(uParamB));
            dr = stretch * dr + 1.0;

            // Apply the conformal 3D power with Phase Twist (uParamD)
            float theta = atan(z3.y, z3.x) * power + uParamD;

            // Z_{n+1} = Z_n^p * M + C_z
            float nx = rxy_p * cos(theta) * m + c.x;
            float ny = rxy_p * sin(theta) * m + c.y;

            // T_{n+1} = p * |Z_n|^(p-1) * T_n + C_t
            // uParamB scales the hyperbolic height growth, uParamE adds a constant Z-offset
            float nz = power * rxy_pm1 * z3.z * uParamB + c.z + uParamE;

            z.xyz = vec3(nx, ny, nz);
            trap = min(trap, length(z.xyz) * uParamF);
        }`,loopBody:"formula_MandelBolic(z, dr, trap, c);"},parameters:[{label:"Power",id:"paramA",min:1,max:16,step:.01,default:2},{label:"Hyp. Scale",id:"paramB",min:-2,max:2,step:.01,default:1},{label:"Conformal Shift",id:"paramC",min:-2,max:2,step:.01,default:1},{label:"Phase Twist",id:"paramD",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"},{label:"Z-Offset",id:"paramE",min:-2,max:2,step:.01,default:0},{label:"Trap Scale",id:"paramF",min:.1,max:5,step:.01,default:1}],defaultPreset:{formula:"MandelBolic",features:{coreMath:{iterations:26,paramA:2,paramB:1,paramC:1,paramD:0,paramE:0,paramF:1},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridComplex:!1,burningEnabled:!0,hybridMode:!1,hybridIter:0,hybridScale:2,hybridMinR:.5,hybridFixedR:1,hybridFoldLimit:1,hybridAddC:!1,hybridProtect:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotY:0,preRotX:0,preRotZ:0,juliaMode:!1,juliaX:-.277,juliaY:-.05,juliaZ:.31,preRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!1,shadows:!1,shadowIntensity:1,shadowSoftness:381.09214359264973,shadowSteps:352,shadowBias:.0010409787880182823,lights:[{type:"Directional",position:{x:-.7,y:.37,z:1.4},rotation:{x:.39966912659916126,y:-2.29961371262364,z:-.8495893165947439},color:"#ffffff",intensity:1.5625,falloff:.22000013414400005,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:.6,y:-.5,z:1.4},rotation:{x:0,y:0,z:0},color:"#ff8800",intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]},ao:{aoIntensity:.383,aoSpread:.002,aoSamples:12,aoMode:!1,aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},reflections:{mixStrength:1,roughnessThreshold:.5,bounces:1,steps:64,enabled:!0},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.004798262654911253,glowSharpness:1,glowMode:!0,glowColor:"#50aaff"},materials:{diffuse:1,reflection:0,specular:0,roughness:.75,rim:0,rimExponent:3,envStrength:.25,envBackgroundStrength:.06,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"hor",position:0,color:"#223344",bias:.5,interpolation:"smooth"},{id:"zen",position:1,color:"#88ccff",bias:.5,interpolation:"smooth"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},waterPlane:{waterEnabled:!1,active:!0,height:-2,color:"#001133",roughness:.02,waveStrength:.1,waveSpeed:1,waveFrequency:1.5},coloring:{gradient:{stops:[{id:"1771879786393_0",position:0,color:"#9e0142",bias:.5,interpolation:"linear"},{id:"1771879786393_1",position:.111,color:"#d53e4f",bias:.5,interpolation:"linear"},{id:"1771879786393_2",position:.222,color:"#f46d43",bias:.5,interpolation:"linear"},{id:"1771879786393_3",position:.333,color:"#fdae61",bias:.5,interpolation:"linear"},{id:"1771879786393_4",position:.444,color:"#fee08b",bias:.5,interpolation:"linear"},{id:"1771879786393_5",position:.556,color:"#e6f598",bias:.5,interpolation:"linear"},{id:"1771879786393_6",position:.667,color:"#abdda4",bias:.5,interpolation:"linear"},{id:"1771879786393_7",position:.778,color:"#66c2a5",bias:.5,interpolation:"linear"},{id:"1771879786393_8",position:.889,color:"#3288bd",bias:.5,interpolation:"linear"},{id:"1771879786393_9",position:1,color:"#5e4fa2",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:1,scale:1.1510942207477979,offset:-.1726286201331454,repeats:1,phase:-.13,bias:1,twist:0,escape:1.2,gradient2:[{id:"1767363622003",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"1767363615540",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],mode2:4,scale2:1,offset2:0,repeats2:7,phase2:0,bias2:1,twist2:0,blendMode:0,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:1,scaleX:1,scaleY:1,offset:{x:0,y:0},textureScale:{x:1,y:1}},quality:{engineQuality:!0,compilerHardCap:500,precisionMode:0,bufferPrecision:0,maxSteps:534,distanceMetric:0,estimator:0,fudgeFactor:.32,stepRelaxation:0,refinementSteps:0,detail:6.1,pixelThreshold:.2,overstepTolerance:2.7,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},droste:{active:!1,tiling:1,center:{x:0,y:0},radiusInside:5,radiusOutside:100,periodicity:2,strands:2,autoPeriodicity:!1,strandMirror:!1,zoom:0,rotate:0,rotateSpin:0,rotatePolar:0,twist:!0,hyperDroste:!1,fractalPoints:1},colorGrading:{active:!0,saturation:1.29,levelsMin:0,levelsMax:.47826086956521746,levelsGamma:.7718886339575918},optics:{camType:0,camFov:60,orthoScale:2,dofStrength:0,dofFocus:.0598781733877129},navigation:{flySpeed:.42258925411794174,autoSlow:!0},cameraManager:{},audio:{isEnabled:!1,smoothing:.8,threshold:.1,agcEnabled:!1,attack:.1,decay:.3,highPass:20,lowPass:2e4,gain:1},drawing:{activeTool:"rect",enabled:!1,active:!1,originMode:1,color:"#00ffff",lineWidth:1,showLabels:!0,showAxes:!1,shapes:[],refreshTrigger:0},modulation:{rules:[],selectedRuleId:null},webcam:{isEnabled:!1,opacity:1,posX:20,posY:80,width:320,height:240,cropL:0,cropR:0,cropT:0,cropB:0,blendMode:0,crtMode:!1,tilt:0,fontSize:12},debugTools:{shaderDebuggerOpen:!1,stateDebuggerOpen:!1},engineSettings:{showEngineTab:!1}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.6959547620697641,y:-.23496707663264949,z:.30543710842202915,w:.6059254202044269},sceneOffset:{x:-1.9531606435775757,y:1.1919928789138794,z:-1.096980132162571,xL:-.41618868170671375,yL:-.030576279777909363,zL:.3954860597472547},targetDistance:2.4710260497199164,cameraMode:"Fly",lights:[]}},D={id:"KaliBox",name:"Kali Box",shortDescription:"Kali's abs-fold fractal with sphere inversion. Organic caves and alien landscapes.",description:"A Mandelbox variant by Kali (fractalforums.com), optimized by Rrrola. Uses rotation, abs-fold + translation, clamped sphere inversion, and scale/minRad rescaling. Produces organic, cave-like structures.",juliaType:"offset",shader:{preamble:`
    // KaliBox: Pre-calculated rotation (computed once per frame)
    // Axis-angle rotation around (1,1,0) normalized
    mat3 uKB_rot = mat3(1.0);
    bool uKB_doRot = false;

    void KaliBox_precalcRotation() {
        float rotAngle = uParamF;
        if (abs(rotAngle) > 0.001) {
            uKB_doRot = true;
            vec3 axis = normalize(vec3(1.0, 1.0, 0.0));
            float s = sin(rotAngle);
            float c_rot = cos(rotAngle);
            float oc = 1.0 - c_rot;
            uKB_rot = mat3(
                oc * axis.x * axis.x + c_rot,      oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c_rot,      oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c_rot
            );
        } else {
            uKB_doRot = false;
        }
    }`,function:`
    void formula_KaliBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        float scale = uParamA;
        float minRad2 = uParamB;

        // 1. Rotation (axis-angle around (1,1,0))
        if (uKB_doRot) {
            p *= uKB_rot;
        }

        // 2. Abs fold + translation
        p = abs(p) + uVec3A;

        // 3. Sphere inversion (Rrrola's clamp)
        float r2 = dot(p, p);
        float k = clamp(max(minRad2 / r2, minRad2), 0.0, 1.0);
        p *= k;

        // 4. Scale and add constant
        p = p * (scale / minRad2) + c.xyz;

        // 5. Update derivative
        dr = dr * k * (abs(scale) / minRad2) + 1.0;

        z.xyz = p;
        trap = min(trap, length(p));
    }`,loopBody:"formula_KaliBox(z, dr, trap, c);",loopInit:"KaliBox_precalcRotation();",preambleVars:["uKB_rot","uKB_doRot"],getDist:`
            float absScalem1 = abs(uParamA - 1.0);
            return vec2((r - absScalem1) / dr, iter);
        `},parameters:[{label:"Scale",id:"paramA",min:-3,max:3,step:.001,default:2.043},{label:"MinRad2",id:"paramB",min:.001,max:2,step:.001,default:.349},{label:"Translation",id:"vec3A",type:"vec3",min:-5,max:5,step:.001,default:{x:.036,y:-1.861,z:.036}},{label:"Rotation",id:"paramF",min:-3.14,max:3.14,step:.01,default:0,scale:"pi"}],defaultPreset:{formula:"KaliBox",features:{coreMath:{iterations:15,paramA:2.04348,paramB:.3492,paramF:0,vec3A:{x:.0365,y:-1.9183,z:.0365}},coloring:{mode:1,repeats:1,phase:-.44,scale:1.9664327756755327,offset:-1.4432563267287075,bias:1,twist:0,escape:1.2,mode2:4,repeats2:7,phase2:0,blendMode:0,blendOpacity:0,twist2:0,layer3Color:"#ffffff",layer3Scale:20,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"1773423501447_0",position:0,color:"#FD6029",bias:.5,interpolation:"step"},{id:"1773423501447_1",position:.111,color:"#698403",bias:.5,interpolation:"step"},{id:"1773423501447_2",position:.222,color:"#FFF59B",bias:.5,interpolation:"step"},{id:"1773423501447_3",position:.333,color:"#F5BD22",bias:.5,interpolation:"step"},{id:"1773423501447_4",position:.444,color:"#0B5E87",bias:.5,interpolation:"step"},{id:"1773423501447_5",position:.556,color:"#C68876",bias:.5,interpolation:"step"},{id:"1773423501447_6",position:.667,color:"#A51C64",bias:.5,interpolation:"step"},{id:"1773423501447_7",position:.778,color:"#3B9FEE",bias:.5,interpolation:"step"},{id:"1773423501447_8",position:.889,color:"#D4FFD4",bias:.5,interpolation:"step"},{id:"1773423501447_9",position:1,color:"#ABA53C",bias:.5,interpolation:"linear"}],gradient2:[{id:"kb2_0",position:0,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"kb2_1",position:.5,color:"#000000",bias:.5,interpolation:"linear"},{id:"kb2_2",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.198,aoSpread:.3610966624411007,aoSamples:8,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:5,fogColor:"#000000",fogDensity:0,glowIntensity:.0010213564266668151,glowSharpness:3,glowColor:"#ffffff",glowMode:!1},materials:{diffuse:1,reflection:0,specular:1,roughness:.3,rim:0,rimExponent:3,envStrength:.35,envBackgroundStrength:.15,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"1773423550251_0",position:0,color:"#3B4CC0",bias:.5,interpolation:"linear"},{id:"1773423550251_1",position:.143,color:"#6889EE",bias:.5,interpolation:"linear"},{id:"1773423550251_2",position:.286,color:"#9ABAFF",bias:.5,interpolation:"linear"},{id:"1773423550251_3",position:.429,color:"#C9D8F0",bias:.5,interpolation:"linear"},{id:"1773423550251_4",position:.571,color:"#EDD1C2",bias:.5,interpolation:"linear"},{id:"1773423550251_5",position:.714,color:"#F7A889",bias:.5,interpolation:"linear"},{id:"1773423550251_6",position:.857,color:"#E26A53",bias:.5,interpolation:"linear"},{id:"1773423550251_7",position:1,color:"#B40426",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!0,juliaX:-.6691,juliaY:-1.3028,juliaZ:-.45775},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:16,shadowIntensity:1,shadowBias:.001},quality:{detail:3,fudgeFactor:.7,pixelThreshold:.2,maxSteps:522,distanceMetric:1,estimator:0},optics:{camFov:90,dofStrength:0,dofFocus:.9911481142044067}},cameraPos:{x:-.5108672817633045,y:-.49092728212507375,z:.06312098713692904},cameraRot:{x:-.21217453440255712,y:.9007285600831599,z:-.2000534384923281,w:-.3219451036263353},cameraFov:90,sceneOffset:{x:-.47271010279655457,y:.5621813535690308,z:-.6614219546318054,xL:.4219589741076178,yL:.40918048066299684,zL:-.16639292373950365},targetDistance:.7113221737919322,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.62,y:-.07,z:1.4},rotation:{x:-.025067221468304684,y:-3.071530976748474,z:.6869655122565176},color:"#ffffff",intensity:1,falloff:.22,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:-1,z:1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:0,y:0,z:-3},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},B={id:"Claude",name:"Claude",shortDescription:"Harmonic resonance IFS — icosahedral folds with parametric 4th reflection plane.",description:'Icosahedral reflection folds (golden-ratio normals) + a parametric "harmonic" fold (4th plane swept around the golden axis) + clamped sphere inversion. The harmonic fold is unique to this formula — it enriches the icosahedral base like an overtone enriches a fundamental tone. φ appears in fold geometry, harmonic axis, and default parameters.',juliaType:"offset",shader:{preamble:`
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
    }`,function:`
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
    }`,loopBody:"formula_Claude(z, dr, trap, c);",loopInit:"Claude_precalc(); gmt_precalcRodrigues(uVec3B);",preambleVars:["uCl_n4","uCl_doHarmonic"],usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:3.5,step:.001,default:2},{label:"Harmonic",id:"paramB",min:-3.14,max:3.14,step:.001,default:.61},{label:"Inner R²",id:"paramC",min:.001,max:1.5,step:.001,default:.25},{label:"Fix R²",id:"paramD",min:.1,max:2.5,step:.001,default:1},{label:"Offset",id:"vec3A",type:"vec3",min:-3,max:3,step:.001,default:{x:1,y:1,z:1},linkable:!0},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Claude",features:{coreMath:{iterations:12,paramA:2,paramB:.61,paramC:.25,paramD:1,paramF:0,vec3A:{x:1,y:1,z:1},vec3B:{x:0,y:0,z:0}},coloring:{mode:0,repeats:1,phase:.12,scale:7.8,offset:1.4,bias:1.3,twist:0,escape:2.5,mode2:4,repeats2:2,phase2:.1,blendMode:2,blendOpacity:.25,twist2:0,layer3Color:"#ffffff",layer3Scale:60,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0,gradient:[{id:"cl_0",position:0,color:"#1B0A0F",bias:.5,interpolation:"linear"},{id:"cl_1",position:.13,color:"#4A1A0A",bias:.5,interpolation:"linear"},{id:"cl_2",position:.28,color:"#C4603A",bias:.5,interpolation:"linear"},{id:"cl_3",position:.42,color:"#E8A44A",bias:.5,interpolation:"linear"},{id:"cl_4",position:.56,color:"#F5E6D3",bias:.5,interpolation:"linear"},{id:"cl_5",position:.7,color:"#4A8B7A",bias:.5,interpolation:"linear"},{id:"cl_6",position:.85,color:"#2B3A5A",bias:.5,interpolation:"linear"},{id:"cl_7",position:1,color:"#0F0A1B",bias:.5,interpolation:"linear"}],gradient2:[{id:"cl2_0",position:0,color:"#F5E6D3",bias:.5,interpolation:"linear"},{id:"cl2_1",position:.5,color:"#C4603A",bias:.5,interpolation:"linear"},{id:"cl2_2",position:1,color:"#1B0A0F",bias:.5,interpolation:"linear"}]},ao:{aoIntensity:.38,aoSpread:.12,aoSamples:5,aoEnabled:!0,aoMode:!1},atmosphere:{fogNear:0,fogFar:12,fogColor:"#000000",fogDensity:0,glowIntensity:.004,glowSharpness:4.5,glowColor:"#E8A44A",glowMode:!1},materials:{diffuse:1.15,reflection:.12,specular:1.1,roughness:.32,rim:.18,rimExponent:4.5,envStrength:.45,envBackgroundStrength:.22,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"env_0",position:0,color:"#0A0E1B",bias:.5,interpolation:"linear"},{id:"env_1",position:.3,color:"#3A2A1B",bias:.5,interpolation:"linear"},{id:"env_2",position:.5,color:"#C4A87A",bias:.5,interpolation:"linear"},{id:"env_3",position:.72,color:"#7AACCC",bias:.5,interpolation:"linear"},{id:"env_4",position:1,color:"#B4D4E8",bias:.5,interpolation:"linear"}]},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:28,shadowIntensity:1,shadowBias:.001},quality:{detail:3,fudgeFactor:.7,pixelThreshold:.3,maxSteps:400,distanceMetric:1,estimator:0},optics:{camFov:40,dofStrength:0,dofFocus:2.5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.18,y:-.42,z:-.08,w:.89},cameraFov:40,sceneOffset:{x:1,y:1,z:1,xL:0,yL:0,zL:0},targetDistance:3.8,cameraMode:"Orbit",lights:[{type:"Point",position:{x:-.8,y:3.2,z:3.5},rotation:{x:0,y:0,z:0},color:"#FFE4CC",intensity:6,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:3.5,y:-.5,z:1.5},rotation:{x:0,y:0,z:0},color:"#4A8BCC",intensity:2.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!1},{type:"Point",position:{x:1,y:1,z:-2},rotation:{x:0,y:0,z:0},color:"#FFBE8A",useTemperature:!0,temperature:3200,intensity:1.5,falloff:0,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},E={id:"Octahedron",name:"Octahedron",shortDescription:"Kaleidoscopic IFS with octahedral symmetry (Knighty).",description:"Kaleidoscopic IFS fractal with octahedral/cubic symmetry. Uses 4 conditional fold operations per iteration to map points into the octahedral fundamental domain. Based on Knighty's method from Fragmentarium. Supports rotation, twist, and shift.",juliaType:"offset",shader:{preamble:`
    // Octahedron: vertex direction for offset (Fragmentarium default: Offset = (1,0,0))
    const vec3 octa_vertexDir = vec3(1.0, 0.0, 0.0);`,function:`
    void formula_Octahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Octahedral symmetry folds (Knighty)
        // 4 conditional reflections map any point into the octahedral fundamental domain
        if (z3.x + z3.y < 0.0) z3.xy = -z3.yx;
        if (z3.x + z3.z < 0.0) z3.xz = -z3.zx;
        if (z3.x - z3.y < 0.0) z3.xy = z3.yx;
        if (z3.x - z3.z < 0.0) z3.xz = z3.zx;

        // Scale and offset toward octahedron vertex
        float scale = uParamA;
        vec3 offset = octa_vertexDir * uParamB * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
    }`,loopBody:"formula_Octahedron(z, dr, trap, c);",loopInit:"gmt_precalcRodrigues(uVec3B);",usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Octahedron",features:{coreMath:{iterations:13,paramA:2,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"octa_5",position:0,color:"#5C2D00",bias:.5,interpolation:"linear"},{id:"octa_4",position:.2,color:"#FFA500",bias:.5,interpolation:"linear"},{id:"octa_3",position:.4,color:"#FFD700",bias:.5,interpolation:"linear"},{id:"1775546936281",position:.4568,color:"#FFFFFF",bias:.5,interpolation:"linear"},{id:"1775546967714",position:.5074,color:"#FFCE00",bias:.5,interpolation:"linear"},{id:"octa_2",position:.6,color:"#B8860B",bias:.5,interpolation:"linear"},{id:"octa_1",position:.8,color:"#8B4513",bias:.5,interpolation:"linear"},{id:"octa_0",position:1,color:"#3D1C02",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:8.5531,offset:-.2513,repeats:3,phase:0,bias:1,colorIter:2,twist:0,escape:2,gradient2:[{id:"1",position:.4,color:"#FFFFFF"},{id:"2",position:.85,color:"#FFD700"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.47,aoSpread:.1,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:.3,specular:1.5,roughness:.35,rim:0,rimExponent:4.5,envStrength:.7,envBackgroundStrength:.18,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:{stops:[{id:"0",position:0,color:"#1A0A00",bias:.5,interpolation:"linear"},{id:"1",position:.3,color:"#4A2800",bias:.5,interpolation:"linear"},{id:"2",position:.6,color:"#B8860B",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#FFE4B5",bias:.5,interpolation:"linear"}],colorSpace:"linear"},emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:200,shadowSteps:128,shadowBias:0,lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#FFE6D1",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5100,id:"l7"},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l8"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l9"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:2,estimator:1,fudgeFactor:.9,stepRelaxation:0,stepJitter:.15,refinementSteps:0,detail:2,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1.05,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:40,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.0906,y:.1352,z:.0124,w:.9866},cameraFov:40,sceneOffset:{x:1,y:.95,z:3.1,xL:-.1814,yL:-.3153,zL:-.1483},targetDistance:2.5878,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#FFE6D1",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5100},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},R={id:"Icosahedron",name:"Icosahedron",shortDescription:"Kaleidoscopic IFS with icosahedral symmetry (Knighty).",description:"Kaleidoscopic IFS fractal with icosahedral symmetry using golden-ratio fold normals and abs() prefold. Based on Knighty's Fragmentarium implementation. The offset points toward an icosahedron vertex, producing 20-fold triangular face patterns distinct from the dodecahedral variant.",juliaType:"offset",shader:{preamble:`
    // Icosahedron: Golden-ratio fold normals (different from Dodecahedron normals)
    // Reference: Knighty's Fragmentarium Icosahedron.frag
    const float ico_Phi = (1.0 + sqrt(5.0)) * 0.5;
    const vec3 ico_n1 = normalize(vec3(-ico_Phi, ico_Phi - 1.0, 1.0));
    const vec3 ico_n2 = normalize(vec3(1.0, -ico_Phi, ico_Phi + 1.0));
    const vec3 ico_n3 = vec3(0.0, 0.0, -1.0);

    // Icosahedron vertex direction for offset
    const vec3 ico_vertexDir = normalize(vec3(0.850650808, 0.525731112, 0.0));`,function:`
    void formula_Icosahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Inner fold: abs + n1 only (the full prefold runs once in loopInit)
        // Reference: Fragmentarium Icosahedron.frag inner loop
        z3 = abs(z3);
        float t = dot(z3, ico_n1);
        if (t > 0.0) z3 -= 2.0 * t * ico_n1;

        // Scale and offset (toward icosahedron vertex direction)
        float scale = uParamA;
        vec3 offset = ico_vertexDir * uParamB * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
    }`,loopBody:"formula_Icosahedron(z, dr, trap, c);",loopInit:`
    gmt_precalcRodrigues(uVec3B);
    // Icosahedral prefold: full fold sequence runs ONCE before iteration loop
    // Reference: Fragmentarium Icosahedron.frag prefold (abs + n1 + n2 + n3 + n2)
    {
        vec3 pf = z.xyz;
        pf = abs(pf);
        float t;
        t = dot(pf, ico_n1); if (t > 0.0) pf -= 2.0 * t * ico_n1;
        t = dot(pf, ico_n2); if (t > 0.0) pf -= 2.0 * t * ico_n2;
        t = dot(pf, ico_n3); if (t > 0.0) pf -= 2.0 * t * ico_n3;
        t = dot(pf, ico_n2); if (t > 0.0) pf -= 2.0 * t * ico_n2;
        z.xyz = pf;
    }`,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Icosahedron",features:{coreMath:{iterations:20,paramA:2,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"1775547195175_0",position:0,color:"#7f7f7f",bias:.5,interpolation:"linear"},{id:"1775547195175_1",position:1,color:"#696969",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:4.56,offset:.552,repeats:1,phase:.5,bias:3.4468,colorIter:2,twist:0,escape:2,gradient2:[{id:"1",position:.35,color:"#FFFFFF"},{id:"2",position:.9,color:"#4A90D9"}],mode2:1,scale2:19.4934,offset2:-19.1773,repeats2:1,phase2:-.64,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.3,aoSpread:.05,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:0,specular:1.8,roughness:.3,rim:0,rimExponent:5,envStrength:.1,envBackgroundStrength:.15,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:[{id:"0",position:0,color:"#0A1628"},{id:"1",position:.35,color:"#1E3A5F"},{id:"2",position:.65,color:"#7BA7CC"},{id:"3",position:1,color:"#E8F4FD"}],emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:200,shadowSteps:128,shadowBias:0,lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.6943,y:.2676,z:-.0973},color:"#FFF1E4",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5700,id:"l10"},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l11"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l12"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:1,fudgeFactor:.8,stepRelaxation:0,stepJitter:.15,refinementSteps:0,detail:2,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:36,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.0173,y:.4446,z:.0086,w:.8955},cameraFov:36,sceneOffset:{x:2.97,y:.63,z:1.99,xL:.0362,yL:-.4343,zL:.2942},targetDistance:2.9493,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},I={id:"RhombicDodecahedron",name:"Rhombic Dodecahedron",shortDescription:"Catalan solid fractal — dual of the cuboctahedron.",description:"Kaleidoscopic IFS fractal with rhombic dodecahedral geometry. Uses RD face-normal folds instead of the Knighty fold — reflections through (1,±1,0)/√2 and (0,1,±1)/√2 planes, which ARE the RD face planes themselves. This ensures all fold boundaries align with RD faces, producing true rhombic geometry at every iteration level. The fold domain x ≥ y ≥ |z| is bounded entirely by RD faces.",juliaType:"offset",shader:{preamble:`
    // RhombicDodecahedron: RD face-normal fold (NOT Knighty fold)
    //
    // Key insight: the RD's own face normals (1,±1,0)/√2 and (0,1,±1)/√2 are valid
    // reflection planes that generate the chiral octahedral group O (24 elements).
    // The fundamental domain x ≥ y ≥ |z| is bounded ENTIRELY by RD face planes.
    //
    // In this domain the RD SDF simplifies to a single plane:
    //   d = (x + y - size) / √2
    // because x+y ≥ y+|z| and x+y ≥ |z|+x when x ≥ y ≥ |z|.
    //
    // Verified: fold converges in 3 iterations for all sphere points.
    // Domain boundaries: x=y (RD face), y=z (RD face), y=-z (RD face).

    // RD face fold normals (all unit vectors)
    const vec3 rd_n1 = vec3(0.70710678, 0.70710678, 0.0);    // (1,1,0)/√2
    const vec3 rd_n2 = vec3(0.70710678, -0.70710678, 0.0);   // (1,-1,0)/√2
    const vec3 rd_n3 = vec3(0.0, 0.70710678, 0.70710678);    // (0,1,1)/√2
    const vec3 rd_n4 = vec3(0.0, 0.70710678, -0.70710678);   // (0,1,-1)/√2

    // Cutting-plane normal in the folded domain: (1,1,0)/√2
    // (same as rd_n1, since in domain x≥y≥|z| the RD SDF = (x+y-s)/√2)
    const vec3 rd_cut = vec3(0.70710678, 0.70710678, 0.0);

    // Offset toward face centroid in the domain
    // Face piece vertices: (s,0,0), (s/2,s/2,s/2), (s/2,s/2,-s/2)
    // Centroid ≈ (2/3, 1/3, 0) direction = normalize(2,1,0)
    const vec3 rd_offset_dir = vec3(0.89442719, 0.44721360, 0.0);

    // Cutting-plane DE accumulator
    float rd_dmin;
    float rd_scale;
    float rd_trap;`,preambleVars:["rd_dmin","rd_scale","rd_trap"],function:`
    void formula_RhombicDodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: RD face-normal fold — 3 rounds of 4 reflections
        // Folds through the RD's own face planes, NOT Knighty's nc
        // Domain: x ≥ y ≥ |z|, bounded entirely by RD faces
        for (int i = 0; i < 3; i++) {
            z3 -= 2.0 * min(0.0, dot(z3, rd_n1)) * rd_n1;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n2)) * rd_n2;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n3)) * rd_n3;
            z3 -= 2.0 * min(0.0, dot(z3, rd_n4)) * rd_n4;
        }

        // Step 2: Cutting plane — in domain x≥y≥|z|, RD SDF = dot(z3, (1,1,0)/√2) - size/√2
        float size = uParamB;
        float d = dot(z3, rd_cut) - size * 0.70710678;
        rd_dmin = max(rd_dmin, rd_scale * d);

        // Step 3: Scale and offset toward face centroid
        float scale = uParamA;
        vec3 offset = rd_offset_dir * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        rd_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        rd_trap = trap;
    }`,loopBody:"formula_RhombicDodecahedron(z, dr, trap, c);",loopInit:`gmt_precalcRodrigues(uVec3B);
rd_dmin = -1e10;
rd_scale = 1.0;
rd_trap = 1e10;`,getDist:`
        return vec2(abs(rd_dmin), rd_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"RhombicDodecahedron",features:{coreMath:{iterations:16,paramA:1.5,paramB:1,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"rd_0",position:0,color:"#0A2E1B",bias:.5,interpolation:"linear"},{id:"rd_1",position:.2,color:"#1B5E3B",bias:.984,interpolation:"linear"},{id:"rd_2",position:.45,color:"#35EBED",bias:.323,interpolation:"linear"},{id:"rd_3",position:.65,color:"#7DCEA0",bias:.5,interpolation:"linear"},{id:"rd_4",position:.85,color:"#A8E6CF",bias:.5,interpolation:"linear"},{id:"rd_5",position:1,color:"#0D3D21",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:.902,offset:-.601,repeats:1,phase:-.59,bias:1,colorIter:13,twist:0,escape:2,gradient2:[{id:"1",position:.3,color:"#FFFFFF"},{id:"2",position:.85,color:"#2ECC71"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.396,aoSpread:.135,aoSamples:5,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:1.8,reflection:.1,specular:1.2,roughness:.4,rim:.307,rimExponent:1.6,envStrength:2.09,envBackgroundStrength:.15,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:{stops:[{id:"0",position:0,color:"#0A1A10",bias:.5,interpolation:"linear"},{id:"1",position:.4,color:"#1B5E3B",bias:.5,interpolation:"linear"},{id:"2",position:.7,color:"#7DCEA0",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#E8F5E9",bias:.5,interpolation:"linear"}],colorSpace:"linear"}},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:250,shadowIntensity:1,shadowBias:0},quality:{detail:7.5,fudgeFactor:.6,pixelThreshold:2,maxSteps:400,distanceMetric:0,stepJitter:.15,estimator:1},colorGrading:{saturation:1.1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:38,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.2886,y:.3638,z:-.1196,w:.8775},sceneOffset:{x:2,y:-2.05,z:1.6,xL:-.4395,yL:.3823,zL:-.0229},targetDistance:1.905,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#F0FFE8",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},L={id:"Coxeter",name:"Coxeter",shortDescription:"Parameterized Coxeter symmetry fractal — continuous from tetrahedral to icosahedral.",description:"Kaleidoscopic IFS fractal with a parameterized Coxeter fold normal. The Symmetry N parameter continuously interpolates between Coxeter symmetry groups: N=3 gives tetrahedral [3,3], N=4 gives octahedral [3,4], N=5 gives icosahedral [3,5], and non-integer values produce novel intermediate symmetries. Uses cutting-plane DE with the fold's edge-midpoint direction as face normal. Explore fractional N values to discover shapes unique to this formula.",juliaType:"offset",shader:{preamble:`
    // Coxeter: Parameterized Coxeter symmetry with cutting-plane DE
    //
    // Knighty fold with adjustable symmetry order N:
    //   - Fold normal nc = (-0.5, -cos(pi/N), sqrt(0.75 - cos^2(pi/N)))
    //   - Cutting plane normal = normalize(pbc) where pbc = (scospin, 0, 0.5)
    //   - Offset toward pca = normalize(0, scospin, cospin)
    //
    // N=3: tetrahedral, N=4: octahedral, N=5: icosahedral

    // Mutable — recomputed from N each frame
    vec3 uCox_nc;
    vec3 uCox_nor;
    vec3 uCox_pca;

    // Cutting-plane DE accumulator
    float cox_dmin;
    float cox_scale;
    float cox_trap;

    void Coxeter_precalc() {
        float N = uParamC;
        float cospin = cos(3.14159265 / N);
        float scospin = sqrt(max(0.75 - cospin * cospin, 0.0));
        uCox_nc = vec3(-0.5, -cospin, scospin);
        uCox_nor = normalize(vec3(scospin, 0.0, 0.5));
        uCox_pca = normalize(vec3(0.0, scospin, cospin));
    }`,preambleVars:["uCox_nc","uCox_nor","uCox_pca","cox_dmin","cox_scale","cox_trap"],function:`
    void formula_Coxeter(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Full Knighty fold (abs + nc reflect x5)
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, uCox_nc)) * uCox_nc;

        // Cutting plane after fold
        float size = uParamB;
        float d = dot(z3, uCox_nor) - size;
        cox_dmin = max(cox_dmin, cox_scale * d);

        // Scale and offset toward pca vertex
        float scale = uParamA;
        vec3 offset = uCox_pca * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        cox_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        cox_trap = trap;
    }`,loopBody:"formula_Coxeter(z, dr, trap, c);",loopInit:`Coxeter_precalc(); gmt_precalcRodrigues(uVec3B);
cox_dmin = -1e10;
cox_scale = 1.0;
cox_trap = 1e10;`,getDist:`
        return vec2(abs(cox_dmin), cox_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Symmetry N",id:"paramC",min:3,max:6,step:.01,default:4.5},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Coxeter",features:{coreMath:{iterations:12,paramA:2,paramB:1,paramC:4.465,paramF:0,vec3A:{x:-.48,y:.085,z:-.185},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"cox_0",position:0,color:"#30123B",bias:.5,interpolation:"linear"},{id:"cox_1",position:.071,color:"#4145AB",bias:.5,interpolation:"linear"},{id:"cox_2",position:.143,color:"#4675ED",bias:.5,interpolation:"linear"},{id:"cox_3",position:.214,color:"#39A2FC",bias:.5,interpolation:"linear"},{id:"cox_4",position:.286,color:"#1BCFD4",bias:.5,interpolation:"linear"},{id:"cox_5",position:.357,color:"#24ECA6",bias:.5,interpolation:"linear"},{id:"cox_6",position:.429,color:"#61FC6C",bias:.5,interpolation:"linear"},{id:"cox_7",position:.5,color:"#A4FC3B",bias:.5,interpolation:"linear"},{id:"cox_8",position:.571,color:"#D1E834",bias:.5,interpolation:"linear"},{id:"cox_9",position:.643,color:"#F3C63A",bias:.5,interpolation:"linear"},{id:"cox_10",position:.714,color:"#FE9B2D",bias:.5,interpolation:"linear"},{id:"cox_11",position:.786,color:"#F36315",bias:.5,interpolation:"linear"},{id:"cox_12",position:.857,color:"#D93806",bias:.5,interpolation:"linear"},{id:"cox_13",position:.929,color:"#B11901",bias:.5,interpolation:"linear"},{id:"cox_14",position:1,color:"#7A0402",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:2.144,offset:.517,repeats:1.2,phase:.4,bias:1,twist:0,escape:2,gradient2:[{id:"1",position:.4,color:"#FFFFFF"},{id:"2",position:.88,color:"#8A2BE2"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.47,aoSpread:.2,aoSamples:5,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:1.8,reflection:.15,specular:.67,roughness:.232,rim:.3,rimExponent:5,envStrength:.3,envBackgroundStrength:.18,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:{stops:[{id:"0",position:0,color:"#0A0518",bias:.5,interpolation:"linear"},{id:"1",position:.153,color:"#101850",bias:.5,interpolation:"linear"},{id:"2",position:.385,color:"#5A5EB0",bias:.365,interpolation:"linear"},{id:"3",position:1,color:"#F0E0FF",bias:.5,interpolation:"linear"}],colorSpace:"linear"}},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:250,shadowIntensity:1,shadowBias:0},quality:{detail:3,fudgeFactor:1,pixelThreshold:2,maxSteps:400,distanceMetric:1,stepJitter:.15,estimator:1},colorGrading:{active:!0,saturation:1.1,levelsMin:0,levelsMax:.537,levelsGamma:.966},optics:{camFov:36,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.213,y:.441,z:.1086,w:.8651},sceneOffset:{x:2.7,y:1.45,z:2.12,xL:.4105,yL:.4583,zL:.1985},targetDistance:3.226,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.321,y:-.171,z:.028},color:"#F0E8FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6e3},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},k={id:"RhombicTriacontahedron",name:"Rhombic Triacontahedron",shortDescription:"IFS fractal of the 6D hypercube projection — Buckminster Fuller's favorite shape.",description:"Kaleidoscopic IFS fractal based on the rhombic triacontahedron — the 3D shadow of a 6-dimensional hypercube and Buckminster Fuller's favorite geometric form. 30 golden-ratio rhombic faces with icosahedral symmetry. Uses the Knighty icosahedral fold (whose planes ARE RT face normals) with a single cutting plane z=size in the folded domain, giving true RT geometry at all iteration levels.",juliaType:"offset",shader:{preamble:`
    // RhombicTriacontahedron: Cutting plane after Knighty fold
    //
    // Key insight: the Knighty icosahedral fold planes (abs + nc reflections)
    // ARE icosidodecahedron vertex normals = RT face normals. So the fold
    // IS through RT face planes. The fold domain concentrates near z-axis
    // (z range [0.90, 1.00]) where the (0,0,1) RT face normal dominates.
    //
    // Cutting plane: z3.z - size (just the z-component after fold)
    // Verified: 0% overestimates, max error 0.011 vs analytic SDF.
    //
    // This gives correct RT geometry at ALL iteration levels, unlike the
    // previous analytic-SDF-before-fold approach which showed dodecahedral
    // inner structure.

    // Icosahedral fold normal (Type=5)
    const vec3 rt_nc = vec3(-0.5, -0.80901699, 0.30901699);
    // Offset direction: pbc = icosidodecahedron vertex = RT face center
    const vec3 rt_pbc = vec3(0.52573111, 0.0, 0.85065081);

    // Cutting-plane DE accumulator
    float rt_dmin;
    float rt_scale;
    float rt_trap;`,preambleVars:["rt_dmin","rt_scale","rt_trap"],function:`
    void formula_RhombicTriacontahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: Knighty icosahedral fold
        // All fold planes ARE RT face normals (icosidodecahedron vertices)
        // abs = 3 axis normals, nc = diagonal RT face normal
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, rt_nc)) * rt_nc;

        // Step 2: Cutting plane in folded domain
        // After fold, domain concentrates near z-axis where (0,0,1) RT face dominates
        float size = uParamB;
        float d = z3.z - size;
        rt_dmin = max(rt_dmin, rt_scale * d);

        // Step 3: Scale and offset toward RT face center (pbc = icosidodecahedron vertex)
        float scale = uParamA;
        vec3 offset = rt_pbc * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        rt_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        rt_trap = trap;
    }`,loopBody:"formula_RhombicTriacontahedron(z, dr, trap, c);",loopInit:`gmt_precalcRodrigues(uVec3B);
rt_dmin = -1e10;
rt_scale = 1.0;
rt_trap = 1e10;`,getDist:`
        return vec2(abs(rt_dmin), rt_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:1.618},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"RhombicTriacontahedron",features:{coreMath:{iterations:10,paramA:1.878,paramB:1,paramF:0,vec3A:{x:.125,y:.125,z:-.25},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"rt_0",position:0,color:"#3d5941",bias:.5,interpolation:"linear"},{id:"rt_1",position:.167,color:"#778868",bias:.5,interpolation:"linear"},{id:"rt_2",position:.333,color:"#b5b991",bias:.5,interpolation:"linear"},{id:"rt_3",position:.5,color:"#f6edbd",bias:.5,interpolation:"linear"},{id:"rt_4",position:.667,color:"#edbb8a",bias:.5,interpolation:"linear"},{id:"rt_5",position:.833,color:"#de8a5a",bias:.5,interpolation:"linear"},{id:"rt_6",position:1,color:"#ca562c",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:3.633,offset:.486,repeats:.5,phase:.43,bias:1,colorIter:3,twist:0,escape:2,gradient2:[{id:"1",position:.35,color:"#FFF8F0"},{id:"2",position:.85,color:"#B87333"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.7,aoSpread:.4,aoSamples:5,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:2,reflection:.25,specular:.76,roughness:.226,rim:0,rimExponent:4,envStrength:.55,envBackgroundStrength:.2,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:{stops:[{id:"0",position:0,color:"#1A0E08",bias:.5,interpolation:"linear"},{id:"1",position:.3,color:"#5C3520",bias:.5,interpolation:"linear"},{id:"2",position:.65,color:"#B87333",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#FFE8D0",bias:.5,interpolation:"linear"}],colorSpace:"srgb"}},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1,postRotX:.75},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:17.023,shadowIntensity:1,shadowBias:0},quality:{detail:5,fudgeFactor:.6,pixelThreshold:2,maxSteps:400,distanceMetric:1,stepJitter:.15,estimator:1},colorGrading:{saturation:1.15,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:32,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.0647,y:-.1543,z:.0101,w:.9859},sceneOffset:{x:-1.3942,y:-.5315,z:4.4198,xL:0,yL:0,zL:0},targetDistance:3.622,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.786,y:-1.042,z:.467},color:"#FFE8D0",intensity:1.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:4800},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},j={id:"Apollonian",name:"Apollonian",shortDescription:"Apollonian gasket — sphere packing via iterative inversion.",description:"Apollonian gasket fractal using space folding and sphere inversion. Each iteration folds space into a unit cube then applies an inversion sphere, creating a foam-like recursive sphere packing. Based on kosalos's Fragmentarium implementation (fractalforums.org). The modulation factor 't' is computed once from the initial ray position before iterations, matching the reference. Optional spherical inversion pre-transform mode (Inversion > 0) replicates the reference 'doInversion' mode with center, radius, and XY angle rotation with proper DE correction.",juliaType:"offset",tags:["sphere-packing","inversion","foam"],shader:{preamble:`
float apo_t = 1.0;
float apo_invEnabled = 0.0;
float apo_r2 = 1.0;
float apo_invR = 1.0;
float apo_invRadius = 1.0;
`,preambleVars:["apo_t","apo_invEnabled","apo_r2","apo_invR","apo_invRadius"],loopInit:`
// Compute modulation t once from the initial position (kosalos: t is constant throughout loop)
apo_t = uParamA * (uParamB + 0.25 * cos(3.14159265 * uParamC * (z.z - z.x)));
apo_invEnabled = 0.0;
apo_r2 = 1.0;
apo_invR = 1.0;
apo_invRadius = max(uVec2A.x, 0.001);

// Spherical inversion pre-transform (kosalos reference 'doInversion' mode)
if (uParamD > 0.5) {
    apo_invEnabled = 1.0;
    vec3 invCenter = uVec3B;
    float invRadius = apo_invRadius;
    float invAngle = uVec2A.y;

    vec3 ip = z.xyz - invCenter;
    apo_r2 = dot(ip, ip);
    apo_invR = sqrt(apo_r2);

    if (apo_r2 > 1e-10) {
        ip = (invRadius * invRadius / apo_r2) * ip + invCenter;
    }

    // XY plane rotation by invAngle (kosalos reference: atan + cos/sin)
    float an = atan(ip.y, ip.x) + invAngle;
    float ra = length(ip.xy);
    ip.x = cos(an) * ra;
    ip.y = sin(an) * ra;

    z.xyz = ip;

    // Recompute t from the transformed position (inversion changes the coordinates)
    apo_t = uParamA * (uParamB + 0.25 * cos(3.14159265 * uParamC * (z.z - z.x)));
}
`,function:`
    void formula_Apollonian(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);

        // Per-axis fold scaling (kosalos: cc = vec3(cx,cy,cz))
        // uVec3A stores (cx-1, cy-1, cz-1) so defaults match reference cx=1.946, cy=0.991, cz=0.945
        vec3 cc = uVec3A + vec3(1.0);
        z3 *= cc;

        // Fold space into [-1, 1] cube
        z3 = -1.0 + 2.0 * fract(0.5 * z3 + 0.5);

        // Undo per-axis scaling
        z3 /= cc;

        // Sphere inversion using pre-computed t (constant per ray, from initial position)
        float z2 = apo_t / max(dot(z3, z3), 1e-10);
        z3 *= z2;
        dr *= abs(z2);

        if (uJuliaMode > 0.5) z3 += c.xyz;

        z.xyz = z3;
        trap = min(trap, abs(dot(z3, z3)));
    }`,loopBody:"formula_Apollonian(z, dr, trap, c);",getDist:`
    float d = 0.375 * abs(z.y) / max(dr, 1e-10);
    if (apo_invEnabled > 0.5) {
        float invR2 = apo_invRadius * apo_invRadius;
        d = apo_r2 * d / max(invR2 + apo_invR * d, 1e-10);
    }
    return vec2(d, iter);
`},parameters:[{label:"Foam",id:"paramA",min:.1,max:3,step:.001,default:1.032},{label:"Foam 2",id:"paramB",min:.1,max:3,step:.001,default:.92},{label:"Modulation",id:"paramC",min:0,max:2,step:.001,default:.658},{label:"Inversion",id:"paramD",min:0,max:1,step:1,default:0,mode:"toggle"},{label:"Fold Scale",id:"vec3A",type:"vec3",min:-1,max:4,step:.001,default:{x:.946,y:-.009,z:-.055}},{label:"Inv Center",id:"vec3B",type:"vec3",min:-5,max:5,step:.001,default:{x:.758,y:.312,z:.61}},{label:"Inv Radius / Angle",id:"vec2A",type:"vec2",min:-6.3,max:10,step:.001,default:{x:2.74,y:.07}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Apollonian",features:{coreMath:{iterations:13,paramA:1.4,paramB:1,paramC:0,paramD:1,paramF:0,vec2A:{x:1,y:.502},vec3A:{x:0,y:0,z:0},vec3B:{x:1.3525,y:.3285,z:.61}},coloring:{gradient:{stops:[{id:"apo_0",position:0,color:"#0D0221",bias:.5,interpolation:"linear"},{id:"apo_1",position:.15,color:"#2A0845",bias:.5,interpolation:"linear"},{id:"apo_2",position:.3,color:"#6B1D6B",bias:.5,interpolation:"linear"},{id:"apo_3",position:.5,color:"#D4418E",bias:.5,interpolation:"linear"},{id:"apo_4",position:.7,color:"#FF7F50",bias:.2247,interpolation:"linear"},{id:"apo_5",position:.85,color:"#FFD700",bias:.2837,interpolation:"linear"},{id:"apo_6",position:1,color:"#1A0533",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode:0,scale:9.5331,offset:1.1556,repeats:1,phase:.11,bias:1,colorIter:0,twist:0,escape:2,gradient2:[{id:"1",position:.3,color:"#FFFFFF"},{id:"2",position:.8,color:"#D4418E"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.411,aoSpread:.0032,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:.12,specular:.19,roughness:.187,rim:0,rimExponent:4.5,envStrength:.77,envBackgroundStrength:.5,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:{stops:[{id:"0",position:0,color:"#0D0221",bias:.5,interpolation:"linear"},{id:"1",position:.3,color:"#2A0845",bias:.5,interpolation:"linear"},{id:"2",position:.6,color:"#6B1D6B",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#D4418E",bias:.5,interpolation:"linear"}],colorSpace:"linear"},emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:300,shadowSteps:128,shadowBias:0,lights:[{type:"Point",position:{x:3.3724,y:-.0794,z:.9973},rotation:{x:-.18,y:-.04,z:0},color:"#FFE6D1",intensity:14.8996,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5500,id:"l7",range:8.7754},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l8"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l9"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:500,distanceMetric:2,estimator:0,fudgeFactor:1,stepRelaxation:0,stepJitter:.15,refinementSteps:0,detail:2.5,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:40,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.41,y:.2424,z:.8532,w:.2125},cameraFov:40,sceneOffset:{x:4,y:1.5,z:1.8,xL:.2077,yL:-.4379,zL:.2855},targetDistance:2.4689,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#FFE6D1",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:5500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},O={id:"Cuboctahedron",name:"Cuboctahedron",shortDescription:"Archimedean solid fractal with cutting-plane DE.",description:"Kaleidoscopic IFS fractal with true cuboctahedral geometry. Uses Knighty's fold-and-cut approach: octahedral symmetry fold combined with cutting-plane distance estimation. The cuboctahedron vertex sits at the edge midpoint of the octahedral Schwarz triangle. Unlike r/dr estimation, the cutting-plane DE naturally handles fold boundary points, producing exact geometry.",juliaType:"offset",tags:["archimedean","ifs","knighty"],shader:{preamble:`
    // Cuboctahedron: Knighty fold-and-cut with cutting-plane DE
    // Octahedral symmetry (Type=4), cuboctahedron = edge midpoint (pbc)
    // Cutting-plane DE: accumulates max(signed_distance_to_face_planes) across iterations
    // This avoids the fold boundary degeneracy that breaks r/dr estimation at (1,1,0)

    // Fold normal for octahedral symmetry: nc = (-0.5, -cos(pi/4), sqrt(0.75 - cos^2(pi/4)))
    const vec3 co_nc = vec3(-0.5, -0.70710678, 0.5);
    // Schwarz triangle basis vectors (hardcoded from Type=4 geometry)
    const vec3 co_pab = vec3(0.0, 0.0, 1.0);                  // face center (octahedron vertex)
    const vec3 co_pbc = vec3(0.70710678, 0.0, 0.70710678);    // edge midpoint (cuboctahedron)
    const vec3 co_pca = vec3(0.0, 0.57735027, 0.81649658);    // cube vertex direction
    // Precomputed dot products for cutting planes: dot(pbc, pab) and dot(pbc, pca)
    const float co_d_pab = 0.70710678;  // 1/sqrt(2)
    const float co_d_pca = 0.57735027;  // 1/sqrt(3)

    // Cutting-plane DE accumulator (mutable — must be in preambleVars)
    float cp_dmin;
    float cp_scale;
    float cp_trap;`,preambleVars:["cp_dmin","cp_scale","cp_trap"],function:`
    void formula_Cuboctahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Knighty octahedral fold: abs + reflect through nc, repeated 4 times (Type=4)
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, co_nc)) * co_nc;

        // Cutting plane distance: three face planes of the cuboctahedron
        // Each plane passes through the principal vertex (pbc * size) with normal = basis vector
        float size = uParamB;
        float d0 = dot(z3, co_pab) - co_d_pab * size;
        float d1 = dot(z3, co_pbc) - size;
        float d2 = dot(z3, co_pca) - co_d_pca * size;
        float d_face = max(max(d0, d1), d2);
        cp_dmin = max(cp_dmin, cp_scale * d_face);

        // Scale and offset toward cuboctahedron vertex
        float scale = uParamA;
        vec3 offset = co_pbc * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        cp_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        cp_trap = trap;
    }`,loopBody:"formula_Cuboctahedron(z, dr, trap, c);",loopInit:`gmt_precalcRodrigues(uVec3B);
cp_dmin = -1e10;
cp_scale = 1.0;
cp_trap = 1e10;`,getDist:`
        return vec2(abs(cp_dmin), cp_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"Cuboctahedron",features:{coreMath:{iterations:13,paramA:2,paramB:1,paramF:0,vec3A:{x:.7055,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"cubo_5",position:0,color:"#0D3D24",bias:.5,interpolation:"linear"},{id:"cubo_4",position:.2,color:"#E0F5E0",bias:.5,interpolation:"linear"},{id:"cubo_3",position:.4,color:"#90EE90",bias:.5,interpolation:"linear"},{id:"cubo_2",position:.6,color:"#3CB371",bias:.5,interpolation:"linear"},{id:"cubo_1",position:.8,color:"#1B5E3A",bias:.5,interpolation:"linear"},{id:"cubo_0",position:1,color:"#0A2F1F",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:12.3594,offset:-.9222,repeats:1,phase:0,bias:1,colorIter:0,twist:0,escape:2,gradient2:[{id:"1",position:.4,color:"#FFFFFF"},{id:"2",position:.85,color:"#3CB371"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.3,aoSpread:.2,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:.39,specular:.87,roughness:.35,rim:0,rimExponent:4.5,envStrength:1.12,envBackgroundStrength:.3,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:{stops:[{id:"0",position:0,color:"#0A2F1F",bias:.5,interpolation:"linear"},{id:"1",position:.3,color:"#1B5E3A",bias:.5,interpolation:"linear"},{id:"2",position:.65,color:"#3CB371",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#E0F5E0",bias:.5,interpolation:"linear"}],colorSpace:"linear"},emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:200,shadowSteps:128,shadowBias:0,lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.8701,y:-.1971,z:.0918},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500,id:"l13"},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l14"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l15"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:400,distanceMetric:0,estimator:1,fudgeFactor:.6,stepRelaxation:0,stepJitter:.15,refinementSteps:0,detail:2,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:36,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.1405,y:.588,z:.1046,w:.7897},cameraFov:36,sceneOffset:{x:2,y:.95,z:1.1,xL:.4539,yL:-.0784,zL:-.3671},targetDistance:2.1206,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},V={id:"TruncatedIcosahedron",name:"Truncated Icosahedron",shortDescription:"Soccer ball / Bucky ball IFS fractal.",description:"Kaleidoscopic IFS fractal with truncated icosahedral geometry (soccer ball / C60 buckyball). Uses icosahedral symmetry folds with an offset pointing toward the truncated vertex position — between the icosahedron vertex and edge midpoint. The truncation parameter controls how much vertex is cut, interpolating between icosahedron (0) and truncated icosahedron (1).",juliaType:"offset",tags:["archimedean","ifs","knighty","soccer-ball"],shader:{preamble:`
    // Truncated Icosahedron: Icosahedral folds + truncated vertex offset
    const float trIco_Phi = (1.0 + sqrt(5.0)) * 0.5;

    // Icosahedral fold normals (same as Icosahedron)
    const vec3 trIco_n1 = normalize(vec3(-trIco_Phi, trIco_Phi - 1.0, 1.0));
    const vec3 trIco_n2 = normalize(vec3(1.0, -trIco_Phi, trIco_Phi + 1.0));
    const vec3 trIco_n3 = vec3(0.0, 0.0, -1.0);

    // Icosahedron vertex direction
    const vec3 trIco_vertexDir = normalize(vec3(0.850650808, 0.525731112, 0.0));
    // Dodecahedron vertex direction (face center of icosahedron after folding)
    // This is genuinely different from vertexDir, enabling truncation interpolation
    const vec3 trIco_dodecDir = normalize(vec3(1.0, 1.0, 1.0));`,function:`
    void formula_TruncatedIcosahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Inner fold: abs + n1 only (full prefold runs once in loopInit)
        z3 = abs(z3);
        float t = dot(z3, trIco_n1);
        if (t > 0.0) z3 -= 2.0 * t * trIco_n1;

        // Offset direction: interpolate between icosahedron vertex and dodecahedron vertex
        // 0 = icosahedron, ~0.33 = truncated icosahedron, ~0.5 = icosidodecahedron, 1 = dodecahedron
        float trunc = clamp(uParamC, 0.0, 1.0);
        vec3 offsetDir = normalize(mix(trIco_vertexDir, trIco_dodecDir, trunc));

        // Scale and offset
        float scale = uParamA;
        vec3 offset = offsetDir * uParamB * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
    }`,loopBody:"formula_TruncatedIcosahedron(z, dr, trap, c);",loopInit:`
    gmt_precalcRodrigues(uVec3B);
    // Icosahedral prefold: full fold sequence runs ONCE before iteration loop
    {
        vec3 pf = z.xyz;
        pf = abs(pf);
        float t;
        t = dot(pf, trIco_n1); if (t > 0.0) pf -= 2.0 * t * trIco_n1;
        t = dot(pf, trIco_n2); if (t > 0.0) pf -= 2.0 * t * trIco_n2;
        t = dot(pf, trIco_n3); if (t > 0.0) pf -= 2.0 * t * trIco_n3;
        t = dot(pf, trIco_n2); if (t > 0.0) pf -= 2.0 * t * trIco_n2;
        z.xyz = pf;
    }`,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Truncation",id:"paramC",min:0,max:1,step:.001,default:.667},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"TruncatedIcosahedron",features:{coreMath:{iterations:13,paramA:2,paramB:1,paramC:.666,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"trico_0",position:0,color:"#1A0A2E",bias:.5,interpolation:"linear"},{id:"trico_1",position:.2,color:"#3D1C6B",bias:.5,interpolation:"linear"},{id:"trico_2",position:.4,color:"#7B2FBE",bias:.5,interpolation:"linear"},{id:"trico_3",position:.6,color:"#C77DFF",bias:.5,interpolation:"linear"},{id:"trico_4",position:.8,color:"#E0AAFF",bias:.5,interpolation:"linear"},{id:"trico_5",position:1,color:"#240046",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:0,scale:3.8857,offset:.3843,repeats:1,phase:.333,bias:1,colorIter:0,twist:0,escape:2,gradient2:[{id:"1",position:.35,color:"#FFFFFF"},{id:"2",position:.9,color:"#7B2FBE"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.35,aoSpread:.2,aoSamples:5,aoMode:!1,aoColor:"#000000",aoMaxSamples:32,aoStochasticCp:!0,aoEnabled:!0},texturing:{active:!1,layer1Data:null,colorSpace:0,mapU:6,mapV:8,textureScale:{x:1,y:1},offset:{x:0,y:0}},materials:{diffuse:2,reflection:.2,specular:.93,roughness:.3,rim:0,rimExponent:5,envStrength:.25,envBackgroundStrength:.23,envSource:1,envMapData:null,envMapColorSpace:0,useEnvMap:!1,envRotation:0,envGradientStops:{stops:[{id:"0",position:0,color:"#1A0A2E",bias:.5,interpolation:"linear"},{id:"1",position:.35,color:"#3D1C6B",bias:.5,interpolation:"linear"},{id:"2",position:.65,color:"#7B2FBE",bias:.5,interpolation:"linear"},{id:"3",position:1,color:"#E0AAFF",bias:.5,interpolation:"linear"}],colorSpace:"linear"},emission:0,emissionMode:0,emissionColor:"#ffffff",ptEmissionMult:1},atmosphere:{glowEnabled:!0,glowQuality:0,fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{applyTransformLogic:!0,preRotMaster:!0,hybridCompiled:!1,hybridMode:!1,hybridFoldType:0,hybridComplex:!1,hybridPermute:0,burningEnabled:!1,hybridIter:2,hybridFoldLimit:1,hybridFoldLimitVec:{x:1,y:1,z:1},hybridScale:2,hybridScaleVary:0,hybridMinR:.5,hybridFixedR:1,hybridAddC:!1,hybridShift:{x:0,y:0,z:0},hybridRot:{x:0,y:0,z:0},hybridFoldingValue:{x:2,y:2,z:2},hybridKaliConstant:{x:1,y:1,z:1},hybridMengerOffset:{x:1,y:1,z:1},hybridMengerCenterZ:!0,hybridSwap:!1,hybridSkip:1,preRotEnabled:!1,preRotX:0,preRotY:0,preRotZ:0,postRotX:0,postRotY:0,postRotZ:0,worldRotX:0,worldRotY:0,worldRotZ:0,juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,preRot:{x:0,y:0,z:0},postRot:{x:0,y:0,z:0},worldRot:{x:0,y:0,z:0},julia:{x:0,y:0,z:0}},lighting:{advancedLighting:!0,ptEnabled:!0,renderMode:0,ptBounces:3,ptGIStrength:1,specularModel:0,shadowsCompile:!0,shadowAlgorithm:0,ptStochasticShadows:!0,ptNEEAllLights:!1,ptEnvNEE:!1,ptMaxLuminance:10,shadows:!0,areaLights:!1,shadowIntensity:1,shadowSoftness:200,shadowSteps:128,shadowBias:0,lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500,id:"l16"},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l17"},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1,id:"l18"}]},quality:{engineQuality:!0,compilerHardCap:2e3,precisionMode:0,bufferPrecision:0,maxSteps:300,distanceMetric:0,estimator:1,fudgeFactor:.8,stepRelaxation:0,stepJitter:.1,refinementSteps:0,detail:2,pixelThreshold:.2,overstepTolerance:0,dynamicScaling:!1,interactionDownsample:2,physicsProbeMode:0,manualDistance:10},colorGrading:{active:!1,toneMapping:0,saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camType:0,camFov:36,orthoScale:2,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:-.1127,y:.1382,z:.0158,w:.9839},cameraFov:36,sceneOffset:{x:.97,y:.63,z:2.99,xL:-.0955,yL:.0888,zL:.0454},targetDistance:2.4005,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Z={id:"GreatStellatedDodecahedron",name:"Great Stellated Dodecahedron",shortDescription:"Kepler-Poinsot star polyhedron IFS fractal.",description:"Kaleidoscopic IFS fractal based on the great stellated dodecahedron — a Kepler-Poinsot star polyhedron. Uses icosahedral symmetry folds followed by a stellation step that pushes points outward along the vertex direction, creating spiky star-shaped geometry. The stellation parameter controls the spike depth.",juliaType:"offset",tags:["kepler-poinsot","ifs","star","stellation"],shader:{preamble:`
    // Great Stellated Dodecahedron: Cutting-plane DE with stellated face planes
    //
    // Uses Knighty's fold-and-cut stellation approach from Stellations-dodecahedron-try-colored.frag.
    // The icosahedral fold (abs + nc reflect × 3) maps to the fundamental domain.
    // The face plane (pbc) is reflected through symmetry operations for each stellation level:
    //   Iter=0: pbc = normalize(1, 0, φ)     — dodecahedron face (unstellated)
    //   Iter=4: pbc = normalize(φ, 1, 0)     — great stellated dodecahedron
    // The stellation parameter interpolates between these.
    //
    // Hybrid approach:
    //   1. abs(z) + nc reflect × 3 — icosahedral fold to fundamental domain
    //   2. Cutting plane — distance to stellated face
    //   3. Scale + offset — IFS dynamics

    // Icosahedral fold normal: nc = (-0.5, -cos(π/5), sqrt(3/4 - cos²(π/5)))
    const vec3 gsd_nc = vec3(-0.5, -0.80901699, 0.30901699);

    // Offset toward icosahedron vertex (pab = (0,0,1) in Schwarz triangle)
    // The GSD spike tips are at icosahedron vertex positions
    const vec3 gsd_pab = vec3(0.0, 0.0, 1.0);

    // Stellated face normal (mutable, computed from stellation parameter)
    vec3 gsd_faceNor;
    float gsd_faceOff;

    // Cutting-plane DE accumulator
    float gsd_dmin;
    float gsd_scale;
    float gsd_trap;

    void GreatStellatedDodecahedron_precalc() {
        // Precompute stellated face normal from stellation parameter
        // pbc at various stellation levels (traced through Knighty's reflection sequence):
        //   Iter=0: normalize(1, 0, φ)  = (0.52573, 0, 0.85065)
        //   Iter=4: normalize(φ, 1, 0)  = (0.85065, 0.52573, 0)
        vec3 pbc = vec3(0.52573111, 0.0, 0.85065081);

        float stellLevel = uParamC;

        // Apply stellation reflections to pbc
        vec3 sp = pbc;
        sp.x = -sp.x;                                                        // 1st stellation
        float tn = -2.0 * dot(sp, gsd_nc); sp += tn * gsd_nc;              // 2nd stellation
        sp.y = -sp.y;                                                        // 3rd stellation
        tn = -2.0 * dot(sp, gsd_nc); sp += tn * gsd_nc;                    // 4th (great stellated)

        gsd_faceNor = normalize(mix(pbc, sp, stellLevel));

        // Face offset: distance from origin to face plane along normal through vertex p
        // p = normalize(pca) = normalize(0, scospin, cospin) = (0, 0.356822, 0.934172)
        vec3 p = vec3(0.0, 0.35682209, 0.93417236);
        gsd_faceOff = dot(gsd_faceNor, p);
    }`,preambleVars:["gsd_faceNor","gsd_faceOff","gsd_dmin","gsd_scale","gsd_trap"],function:`
    void formula_GreatStellatedDodecahedron(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 z3 = z.xyz;

        gmt_applyTwist(z3, uParamF);
        gmt_applyRodrigues(z3);

        // Step 1: Full icosahedral fold — (abs + nc reflect) × 3
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;
        z3 = abs(z3);
        z3 -= 2.0 * min(0.0, dot(z3, gsd_nc)) * gsd_nc;

        // Step 2: Cutting plane — distance to stellated face in fundamental domain
        float size = uParamB;
        float d_face = dot(z3, gsd_faceNor) - gsd_faceOff * size;
        gsd_dmin = max(gsd_dmin, gsd_scale * d_face);

        // Step 3: Scale and offset toward icosahedron vertex (spike tip)
        float scale = uParamA;
        vec3 offset = gsd_pab * size * (scale - 1.0);
        offset -= uVec3A;
        z3 = z3 * scale - offset;
        gsd_scale /= scale;

        if (uJuliaMode > 0.5) z3 += c.xyz;
        dr = dr * abs(scale);
        z.xyz = z3;
        trap = min(trap, getLength(z3));
        gsd_trap = trap;
    }`,loopBody:"formula_GreatStellatedDodecahedron(z, dr, trap, c);",loopInit:`GreatStellatedDodecahedron_precalc();
gmt_precalcRodrigues(uVec3B);
gsd_dmin = -1e10;
gsd_scale = 1.0;
gsd_trap = 1e10;`,getDist:`
        return vec2(abs(gsd_dmin), gsd_trap);
    `,usesSharedRotation:!0},parameters:[{label:"Scale",id:"paramA",min:.5,max:4,step:.001,default:2},{label:"Offset",id:"paramB",min:0,max:2,step:.001,default:1},{label:"Stellation",id:"paramC",min:-1,max:2,step:.001,default:.5},{label:"Rotation",id:"vec3B",type:"vec3",min:-6.28,max:6.28,step:.01,default:{x:0,y:0,z:0},mode:"rotation"},{label:"Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.01,default:{x:0,y:0,z:0}},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0}],defaultPreset:{formula:"GreatStellatedDodecahedron",features:{coreMath:{iterations:13,paramA:2,paramB:.5,paramC:2.88,paramF:0,vec3A:{x:-.097,y:0,z:.073},vec3B:{x:0,y:0,z:0}},coloring:{gradient:{stops:[{id:"gsd_0",position:0,color:"#009392",bias:.5,interpolation:"linear"},{id:"gsd_1",position:.167,color:"#72aaa1",bias:.5,interpolation:"linear"},{id:"gsd_2",position:.333,color:"#b1c7b3",bias:.5,interpolation:"linear"},{id:"gsd_3",position:.438,color:"#f1eac8",bias:.5,interpolation:"linear"},{id:"gsd_4",position:.52,color:"#e5b9ad",bias:.5,interpolation:"linear"},{id:"gsd_5",position:.612,color:"#d98994",bias:.386,interpolation:"linear"},{id:"gsd_6",position:1,color:"#d0587e",bias:.5,interpolation:"linear"}],colorSpace:"linear"},mode:1,scale:16.374,offset:-.511,repeats:1,phase:0,bias:1,twist:0,escape:2,gradient2:{stops:[{id:"1",position:.241,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:.676,color:"#5CBDFF",bias:.5,interpolation:"linear"},{id:"3",position:.838,color:"#000000",bias:.5,interpolation:"linear"}],colorSpace:"srgb"},mode2:11,scale2:1.098,offset2:-.479,repeats2:2,phase2:-.34,bias2:1,twist2:0,blendMode:1,blendOpacity:3,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:.42,aoSpread:.115,aoSamples:12,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:1,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:2,reflection:0,specular:.58,roughness:.132,rim:0,rimExponent:5,envStrength:0,envBackgroundStrength:.15,envSource:1,useEnvMap:!1,envRotation:0,emission:.185,emissionMode:1,emissionColor:"#ffffff",envGradientStops:{stops:[{id:"0",position:0,color:"#FFFFFF",bias:.531,interpolation:"linear"},{id:"1",position:.3,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:.65,color:"#000000",bias:.757,interpolation:"linear"},{id:"3",position:1,color:"#FFFFFF",bias:.5,interpolation:"linear"}],colorSpace:"srgb"}},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:.007,glowSharpness:7.413,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:200,shadowIntensity:1,shadowBias:0},quality:{detail:2,fudgeFactor:.6,pixelThreshold:.2,maxSteps:400,distanceMetric:0,stepJitter:.15,estimator:1},colorGrading:{saturation:1.1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:36,dofStrength:0,dofFocus:5}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.0554,y:.2593,z:-.0149,w:.9641},sceneOffset:{x:.8864,y:-.4103,z:2.3049,xL:.3623,yL:.0597,zL:.2368},targetDistance:2.44,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.221,y:-.428,z:.048},color:"#FFE0C0",intensity:1,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:4800},{type:"Point",position:{x:.242,y:-.766,z:1.511},rotation:{x:0,y:0,z:0},color:"#FF8F8F",intensity:6.708,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!0},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#7C7CFF",intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},q={id:"PseudoKleinian06",name:"Pseudo Kleinian 06",shortDescription:"Pseudo Kleinian with Thingy DE + sphere inversion. By Knighty & Theli-at.",description:`Pseudo Kleinian fractal (Scale 1 JuliaBox + Thingy DE shape) by Knighty and Theli-at.

Produces intricate Kleinian group limit sets, nested spherical lattices, and soap-film-like bubble networks.

Each iteration applies:
1. Box fold: p = 2·clamp(p, −CSize, CSize) − p
2. Sphere fold: k = max(Size/r², 1); p *= k
3. Julia shift: p += C

The DE uses the "Thingy" shape — a twisted cylinder cross-section.

With Inversion enabled, the infinite periodic tiling wraps into a bounded sphere via Möbius inversion, producing the classic Kleinian bubble geometry. InvRadius controls the inversion sphere size; InvCenter positions it.

Key parameters:
• Size: sphere fold radius. 1 = scale-1 Julia box.
• CSize: box fold half-size per axis. CSize.z also offsets z before the loop.
• C: Julia constant shift. Zero = pure Kleinian; non-zero = Julia variant.
• Inversion: toggle + radius. Wraps infinite tiling into bounded sphere.
• InvCenter: sphere inversion center. Classic value (1.15, 0.5, −2).
• Thickness: x=TThickness (DE numerator), y=TThickness2 (shell radius).
• Offset: translates the Thingy DE shape origin.
• DEoffset: subtracts from the final DE, inflating the surface.`,juliaType:"none",tags:["kleinian","box-fold","inversion"],shader:{preamble:"float jkk_r; float jkk_r2;",preambleVars:["jkk_r","jkk_r2"],loopInit:`
            jkk_r = 0.0; jkk_r2 = 0.0;
            if (uVec2B.x > 0.5 && uVec2B.y > 0.01) {
                jkk_r = length(z.xyz);
                jkk_r2 = jkk_r * jkk_r;
                z.xyz = (uVec2B.y / max(jkk_r2, 1e-10)) * z.xyz + uVec4A.xyz;
            }
            z.z += uVec3B.z;`,function:`
    void formula_PseudoKleinian06(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 cSize = uVec3B;
        z.xyz = 2.0 * clamp(z.xyz, -cSize, cSize) - z.xyz;

        float r2 = dot(z.xyz, z.xyz);
        float k = max(uParamB / max(r2, 1e-10), 1.0);
        z.xyz *= k;
        dr *= k;

        z.xyz += uVec3C;
        trap = min(trap, r2);
    }`,loopBody:"formula_PseudoKleinian06(z, dr, trap, c);",getDist:`
    vec3 p = z.xyz - uVec3A;
    float lxy = length(p.xy);
    float rxy = lxy - uVec2A.y;
    float e = uVec2A.x;
    float thingy = (lxy * abs(p.z) - e) / sqrt(dot(p, p) + abs(e));
    float d = abs(0.5 * max(rxy, thingy) / max(dr, 1e-10) - uParamC);
    if (uVec2B.x > 0.5 && uVec2B.y > 0.01) {
        d = jkk_r2 * d / (uVec2B.y + jkk_r * d);
    }
    return vec2(d, iter);
`},parameters:[{label:"Size",id:"paramB",min:.01,max:2,step:.001,default:1},{label:"DEoffset",id:"paramC",min:0,max:.01,step:1e-4,default:0},{label:"Thickness",id:"vec2A",type:"vec2",min:0,max:2,step:.001,default:{x:0,y:2}},{label:"Inversion",id:"vec2B",type:"vec2",min:0,max:2,step:.01,default:{x:1,y:1},mode:"mixed"},{label:"Offset",id:"vec3A",type:"vec3",min:-3,max:3,step:.001,default:{x:0,y:0,z:0}},{label:"CSize",id:"vec3B",type:"vec3",min:0,max:2,step:.001,default:{x:1,y:.5,z:1},linkable:!0},{label:"C",id:"vec3C",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"InvCenter",id:"vec4A",type:"vec4",min:-3,max:3,step:.01,default:{x:1.15,y:.5,z:-2,w:0}}],defaultPreset:{formula:"PseudoKleinian06",features:{coreMath:{iterations:6,paramB:1,paramC:0,vec2A:{x:0,y:2},vec2B:{x:1,y:1},vec3A:{x:0,y:0,z:0},vec3B:{x:1,y:.5,z:1},vec3C:{x:0,y:0,z:0},vec4A:{x:1.15,y:.5,z:-2,w:0}},coloring:{mode:3,repeats:50,phase:0,scale:20,offset:0,bias:1,twist:0,escape:2,mode2:0,repeats2:50,phase2:0,blendMode:3,blendOpacity:1,twist2:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:.2,layer3Turbulence:0,gradient:[{id:"1",position:0,color:"#1a2a4a",bias:.5,interpolation:"linear"},{id:"2",position:.4,color:"#4a8fbf",bias:.5,interpolation:"linear"},{id:"3",position:.75,color:"#d4eaf7",bias:.5,interpolation:"linear"},{id:"4",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}],gradient2:[{id:"1",position:0,color:"#000000",bias:.5,interpolation:"linear"},{id:"2",position:1,color:"#ffffff",bias:.5,interpolation:"linear"}]},materials:{reflection:.1,specular:1.5,roughness:.4,diffuse:1.5,envStrength:.3,rim:0,rimExponent:1,emission:0,emissionColor:"#ffffff",emissionMode:0,envMapVisible:!1,envSource:1,useEnvMap:!0,envRotation:0,envGradientStops:[{id:"1",position:0,color:"#0a1525",bias:.5,interpolation:"linear"},{id:"2",position:.5,color:"#223344",bias:.5,interpolation:"smooth"},{id:"3",position:1,color:"#88aacc",bias:.5,interpolation:"smooth"}]},atmosphere:{fogIntensity:.5,fogNear:.001,fogFar:30,fogColor:"#0a1525",fogDensity:0,glowIntensity:.02,glowSharpness:30,glowColor:"#88ccff",glowMode:!1,aoIntensity:.4,aoSpread:.1,aoMode:!1},lighting:{shadows:!0,shadowSoftness:60,shadowIntensity:1,shadowBias:.002},quality:{detail:1,fudgeFactor:.8,pixelThreshold:.9,maxSteps:500,aaMode:"Auto",aaLevel:1,distanceMetric:1,estimator:4},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},optics:{dofStrength:0,dofFocus:1}},cameraPos:{x:-.24,y:.93,z:-.48},cameraRot:{x:0,y:0,z:0,w:1},cameraFov:42,sceneOffset:{x:0,y:0,z:0,xL:0,yL:0,zL:0},targetDistance:2,cameraMode:"Fly",lights:[{type:"Point",position:{x:-3.5,y:-1.2,z:.8},rotation:{x:0,y:0,z:0},color:"#fffacd",intensity:10,falloff:30,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0},{type:"Point",position:{x:2,y:3,z:4},rotation:{x:0,y:0,z:0},color:"#c8deff",intensity:2,falloff:40,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0}]}},X={id:"PseudoKleinianMod4",name:"Pseudo Kleinian Mod4",shortDescription:"Extended PK with per-iteration sphere inversion and box offset (darkbeam).",description:"Extended Pseudo Kleinian based on Mandelbulber's Mod4 variant by darkbeam. Adds per-iteration sphere inversion and sign-based box offset to the core Knighty/Theli-at box fold + sphere fold. The sphere inversion maps each iteration through an inversion sphere, creating intricate nested structures. Box offset subtracts a constant times sign(z) per axis, breaking symmetry in controllable ways. Three DE shapes: Plane (Fragmentarium), Cylindrical (Mandelbulber), Thingy (Fragmentarium).",juliaType:"none",tags:["kleinian","box-fold","inversion"],shader:{preamble:`
    // PseudoKleinianMod4: alternating offset state
    float pk4_posNeg = 1.0;`,function:`
    void formula_PseudoKleinianMod4(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 q = z.xyz;

        // Twist (paramF)
        if (abs(uParamF) > 0.001) {
            float ang = q.z * uParamF;
            float s = sin(ang); float co = cos(ang);
            q.xy = mat2(co, -s, s, co) * q.xy;
        }

        // Per-iteration sphere inversion (Mandelbulber Mod4 reference)
        // z *= invScale / r²  — disabled when paramE = 0
        float invScale = uParamE;
        if (invScale > 0.001) {
            float rr = max(dot(q, q), 1e-10);
            float invK = invScale / rr;
            q *= invK;
            dr *= invK;
        }

        // Box offset: z -= multiplier * sign(z) (Mandelbulber Mod4 / darkbeam)
        vec3 boxOff = uVec3C;
        if (abs(boxOff.x) + abs(boxOff.y) + abs(boxOff.z) > 0.001) {
            q -= boxOff * sign(q);
        }

        // Core PK box fold (reference: 2*clamp(p,-CSize,CSize)-p)
        vec3 cSize = uVec3B;
        q = 2.0 * clamp(q, -cSize, cSize) - q;

        // Sphere fold: k = max(Size / dot(q,q), 1)
        // Mandelbulber reference: aux.DE *= k + tweak005 (tweak ~0.005)
        float lensq = max(dot(q, q), 1e-10);
        float k1 = max(uParamB / lensq, 1.0);
        q *= k1;
        dr *= k1 + 0.005;

        // Orbit trap
        trap = min(trap, lensq);

        // C shift (reference: p += C)
        q += uVec3A;

        // Alternating offset (Mandelbulber Mod4: pos_neg * constant, flips each iter)
        if (abs(uParamD) > 0.001) {
            q.z += pk4_posNeg * uParamD;
            pk4_posNeg *= -1.0;
        }

        trap = min(trap, dot(q, q));
        z.xyz = q;
    }`,loopBody:"formula_PseudoKleinianMod4(z, dr, trap, c);",loopInit:"pk4_posNeg = 1.0;",getDist:`
    float d;
    if (uParamA > 1.5) {
        // Thingy DE shape (Knighty/Theli-at Fragmentarium reference)
        float lxy = length(z.xy);
        float thingy = (abs(lxy * z.z) - uParamC) / sqrt(dot(z.xyz, z.xyz) + abs(uParamC));
        d = abs(0.5 * thingy / max(dr, 1e-10));
    } else if (uParamA > 0.5) {
        // Cylindrical DE shape (Mandelbulber reference: sqrt(x²+y²) / DE - offset)
        d = abs(0.5 * length(z.xy) / max(dr, 1e-10) - uParamC);
    } else {
        // Plane DE shape (Knighty/Fragmentarium reference)
        d = abs(0.5 * abs(z.z) / max(dr, 1e-10) - uParamC);
    }
    return vec2(d, iter);
`,preambleVars:["pk4_posNeg"]},parameters:[{label:"DE Shape",id:"paramA",min:0,max:2,step:1,default:0,options:[{label:"Plane",value:0},{label:"Cylindrical",value:1},{label:"Thingy",value:2}]},{label:"Size",id:"paramB",min:.1,max:5,step:.001,default:.5},{label:"Thickness",id:"paramC",min:0,max:2,step:.001,default:.01},{label:"Alt Offset",id:"paramD",min:-2,max:2,step:.001,default:0},{label:"Inv Scale",id:"paramE",min:0,max:5,step:.001,default:0},{label:"Twist",id:"paramF",min:-2,max:2,step:.01,default:0},{label:"C Shift",id:"vec3A",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}},{label:"Box Size",id:"vec3B",type:"vec3",min:.1,max:3,step:.001,default:{x:.7,y:.7,z:.7},linkable:!0},{label:"Box Offset",id:"vec3C",type:"vec3",min:-2,max:2,step:.001,default:{x:0,y:0,z:0}}],defaultPreset:{formula:"PseudoKleinianMod4",features:{coreMath:{iterations:24,paramA:1,paramB:.543,paramC:.0045,paramD:0,paramE:.654,paramF:0,vec3A:{x:0,y:0,z:0},vec3B:{x:.583,y:.5315,z:.6565},vec3C:{x:0,y:0,z:0}},coloring:{gradient:[{id:"pk4_0",position:0,color:"#0A0A1A",bias:.5,interpolation:"linear"},{id:"pk4_1",position:.25,color:"#2B1B4E",bias:.5,interpolation:"linear"},{id:"pk4_2",position:.45,color:"#4A6FA5",bias:.5,interpolation:"linear"},{id:"pk4_3",position:.65,color:"#8ECAE6",bias:.5,interpolation:"linear"},{id:"pk4_4",position:.85,color:"#E0E0E0",bias:.5,interpolation:"linear"},{id:"pk4_5",position:1,color:"#0A0A1A",bias:.5,interpolation:"linear"}],mode:0,scale:2.72,offset:-.203,repeats:3,phase:0,bias:1,twist:0,escape:2,gradient2:[{id:"1",position:.4,color:"#FFFFFF"},{id:"2",position:.85,color:"#4A6FA5"}],mode2:5,scale2:1,offset2:0,repeats2:1,phase2:0,bias2:1,twist2:0,blendMode:2,blendOpacity:0,layer3Color:"#ffffff",layer3Scale:89,layer3Strength:0,layer3Bump:0,layer3Turbulence:0,layer3Enabled:!0},ao:{aoIntensity:0,aoSpread:.229,aoSamples:5,aoEnabled:!0,aoMode:!1},reflections:{enabled:!0,reflectionMode:1,bounces:3,steps:64,mixStrength:1,roughnessThreshold:.62},materials:{diffuse:1.5,reflection:.04,specular:1.07,roughness:.19,rim:.256,rimExponent:10,envStrength:0,envBackgroundStrength:.2,envSource:1,useEnvMap:!1,envRotation:0,emission:0,emissionMode:0,emissionColor:"#ffffff",envGradientStops:[{id:"0",position:0,color:"#001133"},{id:"1",position:.4,color:"#2B1B4E"},{id:"2",position:.7,color:"#4A6FA5"},{id:"3",position:1,color:"#E0E0E0"}]},atmosphere:{fogIntensity:0,fogNear:1e-4,fogFar:501,fogColor:"#000000",fogDensity:0,glowIntensity:0,glowSharpness:1,glowMode:!1,glowColor:"#ffffff"},geometry:{juliaMode:!1,juliaX:0,juliaY:0,juliaZ:0,hybridMode:!1},lighting:{advancedLighting:!0,ptEnabled:!0,shadows:!0,shadowSoftness:200,shadowIntensity:1,shadowBias:0},quality:{detail:2,fudgeFactor:.7,pixelThreshold:1,maxSteps:300,distanceMetric:0,stepJitter:.15,estimator:4},colorGrading:{saturation:1,levelsMin:0,levelsMax:1,levelsGamma:1},optics:{camFov:71,dofStrength:0,dofFocus:1.916}},cameraPos:{x:0,y:0,z:0},cameraRot:{x:.3652,y:.2028,z:.2407,w:.8761},sceneOffset:{x:1,y:-1.45,z:1.2142,xL:-.0277,yL:.4093,zL:-.3094},targetDistance:1.383,cameraMode:"Orbit",lights:[{type:"Directional",position:{x:.4,y:1.1,z:2.5},rotation:{x:-.18,y:-.04,z:0},color:"#E8F0FF",intensity:.5,falloff:6.4,falloffType:"Quadratic",fixed:!1,visible:!0,castShadow:!0,useTemperature:!0,temperature:6500},{type:"Point",position:{x:.05,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#FFD6AA",useTemperature:!0,temperature:3500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1},{type:"Point",position:{x:.25,y:.075,z:-.1},rotation:{x:0,y:0,z:0},color:"#E0EEFF",useTemperature:!0,temperature:7500,intensity:.5,falloff:.5,falloffType:"Quadratic",fixed:!1,visible:!1,castShadow:!1}]}},Q=[t,M,p,u,C,T,A,l,y,s,F,D,n,m,w,B,i,r,c,q,X,d,E,R,O,V,I,L,k,Z,j,_,f,v,h,x,b,g,z,P,S];Q.forEach(a=>e.register(a));e.registerAlias("UberMenger","MengerAdvanced");e.registerAlias("FoldingBrot","BoxBulb");e.registerAlias("HyperTorus","Mandelorus");e.registerAlias("HyperbolicMandelbrot","MandelBolic");e.registerAlias("RhombicIcosahedron","Coxeter");const J=e;export{J as Formulas};
