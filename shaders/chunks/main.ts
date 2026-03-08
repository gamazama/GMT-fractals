
export const getFragmentMainGLSL = (enablePathTracing: boolean) => {

    // Optimized: Only inject the code for the ACTIVE mode.
    // This dramatically reduces shader compilation time.
    let integrator = '';
    
    // Shared soft-sphere check block (inlined in both branches)
    const sphereLoop = `
        for (int _li = 0; _li < MAX_LIGHTS; _li++) {
            if (_li >= uLightCount) break;
            if (uLightIntensity[_li] < 0.01 || uLightType[_li] > 0.5 || uLightRadius[_li] < 0.001) continue;
            vec3 _oc = ro - uLightPos[_li];
            float _b = dot(rd, _oc);
            if (-_b < 0.001) continue;
            float _dPerp2 = max(0.0, dot(_oc, _oc) - _b * _b);
            float _r = uLightRadius[_li];
            float _s = max(0.0, uLightSoftness[_li]);
            float _fadeMax = _r * (1.0 + _s) + 0.001;
            if (_dPerp2 < _fadeMax * _fadeMax) {
                float _dPerp = sqrt(_dPerp2);
                float _fadeMin = _r * max(0.0, 1.0 - _s);
                float _fade = 1.0 - smoothstep(_fadeMin, _fadeMax, _dPerp);
                if (_fade > 0.001) {
                    float _disc = _r * _r - _dPerp2;
                    d = _disc > 0.0 ? max(0.001, -_b - sqrt(_disc)) : max(0.001, -_b);
                    col = mix(col, uLightColor[_li] * uLightIntensity[_li], _fade);
                    break;
                }
            }
        }
    `;

    if (enablePathTracing) {
        integrator = `
        if (hit) {
            // Path Tracer Mode (Compiled)
            col = calculatePathTracedColor(ro, rd, d, result, stochasticSeed);
        } else {
            // Primary-ray visibility of light spheres (no fractal occluder)
            ${sphereLoop}
            if (d < 0.001) d = 1000.0;
        }
        `;
    } else {
        integrator = `
        if (hit) {
            // Direct Lighting Mode (Compiled)
            col = calculateShading(ro, rd, d, result, stochasticSeed);
        } else {
            // Visible light spheres in Direct mode
            ${sphereLoop}
            if (d < 0.001) d = 1000.0;
        }
        `;
    }

    return `
// ------------------------------------------------------------------
// MAIN RENDER LOOP
// ------------------------------------------------------------------

// Output Layout for GLSL 3.00 ES - single color output
layout(location = 0) out vec4 pc_fragColor;

// Safety to prevent NaNs/Infs from poisoning the accumulation buffer
vec3 sanitizeColor(vec3 col) {
    // Optimization: Replaced complex branching with hardware clamps.
    // Clamp to [0, 200.0] to handle fireflies/NaNs gracefully without conditional logic.
    // vec3(200.0) is generous enough for HDR bloom, but low enough to stop Inf accumulation.
    return min(max(col, vec3(0.0)), vec3(200.0));
}

vec3 renderPixel(vec2 uvCoord, float seedOffset, out float outDepth) {
    vec3 ro = vec3(0.0);
    vec3 rd = vec3(0.0, 0.0, 1.0);
    float stochasticSeed = 0.0;
    
    getCameraRay(uvCoord, uExtraSeed + seedOffset, ro, rd, stochasticSeed);
    
    // Background Logic (Direct Mode Miss)
    vec3 bgCol = vec3(0.0);
    vec3 safeFog = InverseACESFilm(uFogColor);
    
    if (uEnvBackgroundStrength > 0.001) {
        vec3 env = GetEnvMap(rd, 0.0) * uEnvBackgroundStrength; 
        bgCol = mix(env, safeFog, clamp(uFogIntensity, 0.0, 1.0));
    } else {
        // If Background Visibility is 0, we just show fog color (usually black)
        // We mix with a tiny bit of fog color based on Y to prevent total pitch black banding
        bgCol = mix(safeFog + vec3(0.01), safeFog, abs(rd.y));
    }
    
    vec3 col = bgCol;
    float d = 0.0;
    vec4 result = vec4(0.0);
    
    vec3 glow = vec3(0.0);
    vec3 fogScatter = vec3(0.0);
    float volumetric = 0.0;

    // Primary Ray Trace
    bool hit = traceScene(ro, rd, d, result, glow, stochasticSeed, volumetric, fogScatter);

    ${integrator}

    col = applyPostProcessing(col, d, glow, volumetric, fogScatter);
    outDepth = d;  // Output depth for physics probe
    return col;
}

void main() {
    vec4 history = texture(uHistoryTexture, vUv); // texture() in GLSL 3

    // --- Region Check ---
    if (vUv.x < uRegionMin.x || vUv.y < uRegionMin.y || vUv.x > uRegionMax.x || vUv.y > uRegionMax.y) {
        pc_fragColor = history;
        return;
    }

    // --- Normal rendering for all pixels ---
    float depth;
    vec3 col = renderPixel(vUv, 0.0, depth);
    col = sanitizeColor(col);
    vec3 safeHistory = history.rgb;
    
    vec3 finalCol = mix(safeHistory, col, uBlendFactor);
    
    // Store depth in alpha channel - physics probe reads center pixel from previous frame
    pc_fragColor = vec4(finalCol, depth);
}
`;
};
