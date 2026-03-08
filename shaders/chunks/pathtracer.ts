

export const getPathTracerGLSL = (isMobile: boolean) => {
    
    const loopLimit = isMobile ? '2' : 'maxBounces';
     const shadowLogic = isMobile ? `
        shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
    ` : `
        if (uPTStochasticShadows > 0.5) {
            // Use blue noise for shadow jitter to ensure good distribution
            vec2 jitter = blueNoise.gb; // Use green and blue channels for decorrelation
            vec3 w = lDir;
            vec3 u = normalize(cross(w, abs(w.y) > 0.9 ? vec3(1,0,0) : vec3(0,1,0)));
            vec3 v = cross(w, u);
            
            // Softness acts as spread. For Directional: Angle. For Point: Size.
            float spread = 2.0 / max(uShadowSoftness, 0.1);
            
            float r = sqrt(jitter.x) * spread;
            float theta = jitter.y * 6.283185;
            
            vec3 offsetDir = u * cos(theta) * r + v * sin(theta) * r;
            vec3 shadowDir = normalize(lDir + offsetDir);
            float shadowDist = distToLight;
            
            if (!isDirectional) {
                 // For point lights, we jitter the target position
                 // Approximate sphere radius = spread * distance
                 float radius = spread * distToLight;
                 vec3 jitterOffset = (u * cos(theta) + v * sin(theta)) * sqrt(jitter.x) * radius;
                 vec3 targetPos = uLightPos[lightIdx] + jitterOffset;
                 vec3 tVec = targetPos - p_ray;
                 shadowDist = length(tVec);
                 shadowDir = tVec / max(1.0e-5, shadowDist);
            }
            
            shadow = GetHardShadow(shadowRo, shadowDir, shadowDist);
        } else {
            shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
        }
    `;

    return `
// ------------------------------------------------------------------
// MONTE CARLO PBR PATH TRACER
// ------------------------------------------------------------------

float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 cosineSampleHemisphere(vec3 n, vec2 seedVec) {
    float r = fract(seedVec.x * 1.61803398875); 
    float angle = seedVec.y * 6.283185; 
    vec2 p = vec2(sqrt(r) * cos(angle), sqrt(r) * sin(angle));
    vec3 u = normalize(cross(abs(n.z) < 0.999 ? vec3(0,0,1) : vec3(1,0,0), n));
    vec3 v = cross(n, u);
    float rz = sqrt(max(0.0, 1.0 - dot(p, p)));
    return normalize(u * p.x + v * p.y + n * rz);
}

vec3 importanceSampleGGX(vec3 n, float roughness, vec2 seedVec) {
    vec2 xi = vec2(
        fract(seedVec.x * 1.61803398875),
        fract(seedVec.y * 1.61803398875 + 0.5)
    );
    float a = roughness * roughness;
    float phi = 2.0 * 3.14159 * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a*a - 1.0) * xi.y));
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta*cosTheta));
    vec3 h = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
    vec3 up = abs(n.z) < 0.999 ? vec3(0,0,1) : vec3(1,0,0);
    vec3 tangent = normalize(cross(up, n));
    vec3 bitangent = cross(n, tangent);
    return normalize(tangent * h.x + bitangent * h.y + n * h.z);
}

vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
    vec3 radiance = vec3(0.0);
    vec3 throughput = vec3(1.0);
    vec3 currentRo = ro;
    vec3 currentRd = rd;
    float d = d_init;
    vec4 result = result_init;
    bool hit = true;
    int maxBounces = uPTBounces;
    float pixelSizeScale = uPixelSizeBase / uInternalScale;
    
    for (int bounce = 0; bounce < 8; bounce++) {
        if (bounce >= ${loopLimit}) break;
        
        vec2 bounceOffset = vec2(float(bounce) * 17.123, float(bounce) * 23.456);
        vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset);

        if (!hit) {
            // Check for visible light sphere intersection before falling back to sky
            bool hitLightSphere = false;
            for (int li = 0; li < MAX_LIGHTS; li++) {
                if (li >= uLightCount) break;
                if (uLightIntensity[li] < 0.01 || uLightType[li] > 0.5 || uLightRadius[li] < 0.001) continue;
                vec3 _oc = currentRo - uLightPos[li];
                float _b = dot(currentRd, _oc);
                if (-_b < 0.001) continue;
                float _dPerp2 = max(0.0, dot(_oc, _oc) - _b * _b);
                float _r = uLightRadius[li];
                float _s = max(0.0, uLightSoftness[li]);
                float _fadeMax = _r * (1.0 + _s) + 0.001;
                if (_dPerp2 < _fadeMax * _fadeMax) {
                    float _dPerp = sqrt(_dPerp2);
                    float _fadeMin = _r * max(0.0, 1.0 - _s);
                    float _fade = 1.0 - smoothstep(_fadeMin, _fadeMax, _dPerp);
                    if (_fade > 0.001) {
                        radiance += uLightColor[li] * uLightIntensity[li] * _fade * throughput;
                        hitLightSphere = true;
                        break;
                    }
                }
            }
            if (!hitLightSphere) {
                float skyIntensity = (bounce == 0) ? uEnvBackgroundStrength : uEnvStrength;
                vec3 env = GetEnvMap(currentRd, 0.0);
                if (bounce == 0) {
                    float fogFactor = smoothstep(uFogNear, uFogFar, 100.0);
                    vec3 safeFog = InverseACESFilm(uFogColor);
                    vec3 sky = mix(env * skyIntensity, safeFog, fogFactor * 0.5);
                    radiance += sky * throughput;
                } else {
                    radiance += env * skyIntensity * throughput;
                }
            }
            break;
        }
        
        vec3 p_ray = currentRo + currentRd * d;
        vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        vec3 albedo, n, emission;
        float roughness;
        getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, bounce == 0);
        
        float ao = 1.0;
        if (uAOIntensity > 0.01 && bounce == 0) {
            ao = GetAO(p_ray, n, seed + float(bounce) * 13.37);
        }
        
        if (bounce == 0 && uRim > 0.01) {
            float NdotV_rim = max(0.0, dot(n, -currentRd));
            float rimFactor = pow(1.0 - NdotV_rim, uRimExponent) * uRim;
            emission += vec3(0.5, 0.7, 1.0) * rimFactor;
        }

        roughness = max(roughness, 0.04);
        float emissionMult = (bounce == 0) ? 1.0 : uPTEmissionMult;
        radiance += (emission * ao * emissionMult) * throughput;
        
        // --- NEXT EVENT ESTIMATION ---
        // Active light list — hoisted so PT_VOLUMETRIC can reuse it
        int activeCount = 0;
        int activeIndices[3];
        if (uLightIntensity[0] > 0.01) activeIndices[activeCount++] = 0;
        if (uLightIntensity[1] > 0.01) activeIndices[activeCount++] = 1;
        if (uLightIntensity[2] > 0.01) activeIndices[activeCount++] = 2;

        // Bias epsilon — hoisted so PT_ENV_NEE can reuse it
        float distFromFractalOrigin = length(p_fractal);
        float floatLimitNEE = max(1.0e-20, distFromFractalOrigin * 5.0e-7);
        float visualLimitNEE = pixelSizeScale * d * (1.0 / uDetail);
        float biasEps = max(floatLimitNEE, visualLimitNEE);

        if (activeCount > 0) {
            float lightSeed = blueNoise.r;
            int pick = clamp(int(lightSeed * float(activeCount)), 0, activeCount - 1);

            // PT_NEE_ALL_LIGHTS: evaluate every active light per bounce.
            // Default: sample one random light with PDF compensation (unbiased, faster).
            int neeCount = 1;
            #ifdef PT_NEE_ALL_LIGHTS
                neeCount = activeCount;
            #endif

            for (int nee_i = 0; nee_i < 3; nee_i++) {
                if (nee_i >= neeCount) break;

                int lightIdx;
                #ifdef PT_NEE_ALL_LIGHTS
                    lightIdx = activeIndices[nee_i];
                #else
                    lightIdx = activeIndices[pick];
                #endif

                bool isDirectional = uLightType[lightIdx] > 0.5;
                vec3 shadowRo = p_ray + n * (biasEps * 2.0 + uShadowBias);

                vec3 lVec;
                float distToLight;
                if (isDirectional) {
                    lVec = -uLightDir[lightIdx]; // Negate: uLightDir points toward surface, we need toward light
                    distToLight = 100.0; // Effectively infinite for fractals (structure < bailout radius)
                } else {
                    lVec = uLightPos[lightIdx] - p_ray;
                    distToLight = length(lVec);
                }

                vec3 lDir = isDirectional ? normalize(lVec) : lVec / max(1.0e-5, distToLight);

                float shadow = 1.0;
                if (uShadows > 0.5 && uLightShadows[lightIdx] > 0.5) {
                    ${shadowLogic}
                    shadow = mix(1.0, shadow, uShadowIntensity);
                }

                if (shadow > 0.01) {
                    vec3 v = -currentRd;
                    vec3 h = normalize(lDir + v);
                    float ndotl = max(0.0, dot(n, lDir));
                    float hdotv = max(0.0, dot(h, v));
                    float ndoth = max(0.0, dot(n, h));

                    float att = 1.0;
                    if (!isDirectional && uLightFalloff[lightIdx] > 0.001) {
                        if (uLightFalloffType[lightIdx] < 0.5) att = 1.0 / (1.0 + uLightFalloff[lightIdx] * distToLight * distToLight);
                        else att = 1.0 / (1.0 + uLightFalloff[lightIdx] * distToLight);
                    }

                    vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);
                    vec3 F = F0 + (1.0 - F0) * pow(1.0 - hdotv, 5.0);

                    // GGX Cook-Torrance specular
                    float NdotV_nee = max(0.001, dot(n, v));
                    float ndotl_s = max(0.001, ndotl);
                    float a_nee = max(0.001, roughness * roughness);
                    float a2_nee = a_nee * a_nee;
                    float denom_nee = ndoth * ndoth * (a2_nee - 1.0) + 1.0;
                    float D_nee = a2_nee / (3.14159 * denom_nee * denom_nee);
                    float G_l_nee = 2.0 * ndotl_s / (ndotl_s + sqrt(a2_nee + (1.0 - a2_nee) * ndotl_s * ndotl_s));
                    float G_v_nee = 2.0 * NdotV_nee / (NdotV_nee + sqrt(a2_nee + (1.0 - a2_nee) * NdotV_nee * NdotV_nee));
                    vec3 spec = F * D_nee * G_l_nee * G_v_nee / max(0.001, 4.0 * ndotl_s * NdotV_nee);

                    vec3 kS = F;
                    vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);

                    // PDF: 1 when sampling all lights, activeCount when sampling 1 randomly
                    float pdf;
                    #ifdef PT_NEE_ALL_LIGHTS
                        pdf = 1.0;
                    #else
                        pdf = float(activeCount);
                    #endif

                    vec3 directContrib = (kD * albedo * uDiffuse / 3.14159 + spec) * uLightColor[lightIdx] * uLightIntensity[lightIdx] * ndotl * shadow * att * ao * pdf;

                    // Firefly clamp: suppress outlier samples (runtime, raise uPTMaxLuminance to disable)
                    float dcLum = luminance(directContrib);
                    directContrib *= min(1.0, uPTMaxLuminance / max(dcLum, 0.001));

                    radiance += directContrib * throughput;
                }
            }
        } // End NEE

        // --- ENVIRONMENT NEE (compile switch) ---
        // Directly samples the env map as a diffuse light source each bounce.
        // Eliminates the need for a bounce to "accidentally" escape to sky.
        #ifdef PT_ENV_NEE
        if (uEnvStrength > 0.001) {
            vec4 envNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset + vec2(7.31, 11.17));
            vec3 envDir = cosineSampleHemisphere(n, envNoise.rg);
            float envNdotL = max(0.0, dot(n, envDir));
            if (envNdotL > 0.001) {
                vec3 envOrigin = p_ray + n * (biasEps * 2.0);
                float envD; vec4 envResult; vec3 envGlow = vec3(0.0); float envVol = 0.0; vec3 envScatter = vec3(0.0);
                bool envHit = traceScene(envOrigin, envDir, envD, envResult, envGlow, seed + float(bounce) * 5.31, envVol, envScatter);
                if (!envHit) {
                    // Cosine-weighted PDF = NdotL/PI cancels with Lambertian BRDF = kD*albedo/PI
                    // → weight = kD * albedo (clean, no NdotL needed)
                    vec3 envF0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);
                    vec3 envF = envF0 + (1.0 - envF0) * pow(1.0 - envNdotL, 5.0);
                    vec3 envKD = (vec3(1.0) - envF) * (1.0 - uReflection);
                    vec3 envColor = GetEnvMap(envDir, 0.0) * uEnvStrength;
                    radiance += envKD * albedo * uDiffuse * envColor * throughput;
                }
            }
        }
        #endif

        float NdotV = max(0.0, dot(n, -currentRd));
        vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);
        vec3 kS = F;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);
        vec3 weightSpec = kS;
        vec3 weightDiff = kD * albedo * uDiffuse; 
        float lumSpec = luminance(weightSpec);
        float lumDiff = luminance(weightDiff);
        float probSpec = lumSpec / max(0.0001, lumSpec + lumDiff);
        float smoothness = 1.0 - roughness; 
        probSpec = mix(probSpec, 1.0, smoothness * 0.4);
        probSpec = clamp(probSpec, 0.05, 0.95);
        float randType = fract(blueNoise.a * 1.618);
        vec2 dirSeed = blueNoise.gb;

        if (randType < probSpec) {
            vec3 H = importanceSampleGGX(n, roughness, dirSeed);
            vec3 newDir = reflect(currentRd, H);
            // GGX IS weight: BRDF/PDF = G * F * HdotV / (NdotV * NdotH)
            float HdotV_sp = max(0.001, dot(H, -currentRd));
            float NdotH_sp = max(0.001, dot(n, H));
            float NdotL_sp = max(0.001, dot(n, newDir));
            float NdotV_sp = max(0.001, NdotV);
            float a_sp = max(0.001, roughness * roughness);
            float a2_sp = a_sp * a_sp;
            float G_l_sp = 2.0 * NdotL_sp / (NdotL_sp + sqrt(a2_sp + (1.0 - a2_sp) * NdotL_sp * NdotL_sp));
            float G_v_sp = 2.0 * NdotV_sp / (NdotV_sp + sqrt(a2_sp + (1.0 - a2_sp) * NdotV_sp * NdotV_sp));
            currentRd = newDir;
            throughput *= F * G_l_sp * G_v_sp * HdotV_sp / (NdotV_sp * NdotH_sp) / probSpec;
            if (dot(currentRd, n) < 0.0) currentRd = cosineSampleHemisphere(n, dirSeed);
        } else {
            currentRd = cosineSampleHemisphere(n, dirSeed);
            // AO removed from throughput — the bounced path already captures occlusion implicitly
            throughput *= weightDiff / (1.0 - probSpec);
        }
        
        throughput *= uPTGIStrength;
        // biasEps already computed above (hoisted for NEE reuse)
        currentRo = p_ray + n * (biasEps * 2.0);
        float volumetric = 0.0;
        vec3 dummyGlow = vec3(0.0);
        vec3 dummyScatter = vec3(0.0);
        hit = traceScene(currentRo, currentRd, d, result, dummyGlow, seed + float(bounce), volumetric, dummyScatter);

        // Absorption-only fog on bounce paths (Beer-Lambert with actual march distance).
        // Primary-ray scatter (god rays) is accumulated in traceScene on the camera ray.
        if (uFogDensity > 0.001) {
            float trans = exp(-uFogDensity * d);
            radiance += InverseACESFilm(uFogColor) * (1.0 - trans) * throughput;
            throughput *= trans;
        }
        
        if (bounce > 2) {
            float maxThroughput = max(throughput.r, max(throughput.g, throughput.b));
            if (maxThroughput < 0.05) { 
                if (randType > maxThroughput * 10.0) break;
                throughput /= (maxThroughput * 10.0);
            }
        }
        throughput = min(throughput, vec3(4.0)); 
    }
    return radiance;
}
`;
};
