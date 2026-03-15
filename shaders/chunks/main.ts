

export const getFragmentMainGLSL = (enablePathTracing: boolean, maxLights: number) => {

    // Light sphere depth-compositing — only compiled when a light has radius > 0.
    // Uses intersectLightSphere() from shared.ts (single loop, no duplication).
    const sphereCheck = `
        float _lightD = 1.0e10;
        vec3  _lightCol = vec3(0.0);
        float _lightFade = 0.0;
        #ifdef LIGHT_SPHERES
        {
            vec2 _lsHit = intersectLightSphere(ro, rd);
            if (_lsHit.x > 0.001) {
                int _li = int(_lsHit.y);
                _lightFade = _lsHit.x;
                _lightCol = uLightColor[_li] * uLightIntensity[_li];
                vec3 _oc = ro - uLightPos[_li];
                float _b = dot(rd, _oc);
                float _r = uLightRadius[_li];
                float _disc = _r * _r - (dot(_oc, _oc) - _b * _b);
                _lightD = _disc > 0.0 ? max(0.001, -_b - sqrt(_disc)) : max(0.001, -_b);
            }
        }
        #endif
    `;

    let integrator = '';

    if (enablePathTracing) {
        integrator = `
        ${sphereCheck}
        if (hit) {
            col = calculatePathTracedColor(ro, rd, d, result, stochasticSeed);
            if (_lightFade > 0.001 && _lightD < d) {
                col = mix(col, _lightCol, _lightFade);
                d = _lightD;
            }
        } else {
            if (_lightFade > 0.001) {
                col = mix(col, _lightCol, _lightFade);
                d = _lightD;
            }
            if (d < 0.001) d = MISS_DIST;
        }
        `;
    } else {
        integrator = `
        ${sphereCheck}
        if (hit) {
            col = calculateShading(ro, rd, d, result, stochasticSeed);
            if (_lightFade > 0.001 && _lightD < d) {
                col = mix(col, _lightCol, _lightFade);
                d = _lightD;
            }
        } else {
            if (_lightFade > 0.001) {
                col = mix(col, _lightCol, _lightFade);
                d = _lightD;
            }
            if (d < 0.001) d = MISS_DIST;
        }
        `;
    }

    return `
// ------------------------------------------------------------------
// MAIN RENDER LOOP
// ------------------------------------------------------------------

// Output Layout for GLSL 3.00 ES - single color output
layout(location = 0) out vec4 pc_fragColor;

// Safety to prevent NaNs/Infs from poisoning the accumulation buffer.
// Clamp to 200.0 (not 1.0) to preserve HDR range for tone mapping — fireflies above this are clamped.
vec3 sanitizeColor(vec3 col) {
    return min(max(col, vec3(0.0)), vec3(200.0));
}

vec3 renderPixel(vec2 uvCoord, float seedOffset, out float outDepth) {
    vec3 ro = vec3(0.0);
    vec3 rd = vec3(0.0, 0.0, 1.0);
    float stochasticSeed = 0.0;
    vec3 roClean, rdClean;

    getCameraRay(uvCoord, ro, rd, stochasticSeed, roClean, rdClean);

    // Background Logic (Direct Mode Miss)
    vec3 bgCol = vec3(0.0);
    vec3 safeFog = uFogColorLinear;

    if (uEnvBackgroundStrength > 0.001) {
        vec3 env = GetEnvMap(rd, 0.0) * uEnvBackgroundStrength;
        bgCol = mix(env, safeFog, clamp(uFogIntensity, 0.0, 1.0));
    } else {
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
    // Project hit point onto clean (un-jittered) ray for stable depth readback
    // When DoF is off, roClean==ro and rdClean==rd so this equals d
    outDepth = dot(ro + rd * d - roClean, rdClean);
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
