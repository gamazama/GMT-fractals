

export const getPathTracerGLSL = (isMobile: boolean, maxLights: number, stochasticShadows: boolean = true, areaLightsActive: boolean = false) => {

    const loopLimit = isMobile ? '2' : 'maxBounces';
    // Three cases collapse to a single emitted shadow call:
    //   1. !stochasticShadows or mobile → soft only (compile-stripped)
    //   2. stochasticShadows && !areaLightsActive → soft only (NEW: was both
    //      paths emitted with runtime `if (uAreaLights > 0.5)`)
    //   3. stochasticShadows && areaLightsActive → stochastic only
    // ANGLE/D3D11 was likely predicating both paths in case 2 — running both
    // shadow marches per shadow-casting light. Compile-gating eliminates one.
    const useSoft = !stochasticShadows || isMobile || !areaLightsActive;
    const baseShadowLogic = useSoft ? `
        shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
    ` : `
        // Stochastic area-light path (areaLights checkbox ON, compile-gated).
        vec2 jitter = blueNoise.gb;
        vec3 sT, sB;
        buildTangentBasis(lDir, sT, sB);

        float spread = 2.0 / max(uShadowSoftness, 0.1);
        float r = sqrt(jitter.x) * spread;
        float theta = jitter.y * TAU;

        vec3 offsetDir = sT * cos(theta) * r + sB * sin(theta) * r;
        vec3 shadowDir = normalize(lDir + offsetDir);
        float shadowDist = distToLight;

        if (!isDirectional) {
            float radius = spread * distToLight;
            vec3 jitterOffset = (sT * cos(theta) + sB * sin(theta)) * sqrt(jitter.x) * radius;
            vec3 targetPos = uLightPos[lightIdx] + jitterOffset;
            vec3 tVec = targetPos - p_ray;
            shadowDist = length(tVec);
            shadowDir = tVec / max(1.0e-5, shadowDist);
        }

        shadow = GetHardShadow(shadowRo, shadowDir, shadowDist);
    `;
    // Sphere area lights override both shadow paths: the NEE site already
    // sampled a point on the sphere surface and lDir/distToLight point to that
    // sample. Adding GetSoftShadow's penumbra would double-soften; the
    // stochastic path's uLightPos-based re-jitter would defeat sphere sampling
    // entirely. GetHardShadow on the sphere-sampled direction, accumulated
    // across frames, is the physically-correct integration of an area light.
    // Runtime branch is gated by PT_AREA_LIGHTS so default builds are unaffected
    // and ANGLE doesn't get double-emitted shadow paths in non-area-light scenes.
    const shadowLogic = `
        #ifdef PT_AREA_LIGHTS
        if (uLightType[lightIdx] > 1.5) {
            shadow = GetHardShadow(shadowRo, lDir, distToLight);
        } else
        #endif
        {
            ${baseShadowLogic}
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
    float r = fract(seedVec.x * phi);
    float angle = seedVec.y * TAU;
    vec2 p = vec2(sqrt(r) * cos(angle), sqrt(r) * sin(angle));
    vec3 t, b;
    buildTangentBasis(n, t, b);
    float rz = sqrt(max(0.0, 1.0 - dot(p, p)));
    return normalize(t * p.x + b * p.y + n * rz);
}

vec3 importanceSampleGGX(vec3 n, float roughness, vec2 seedVec) {
    vec2 xi = vec2(
        fract(seedVec.x * phi),
        fract(seedVec.y * phi + 0.5)
    );
    float a = roughness * roughness;
    float azimuth = TAU * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a*a - 1.0) * xi.y));
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta*cosTheta));
    vec3 h = vec3(cos(azimuth) * sinTheta, sin(azimuth) * sinTheta, cosTheta);
    vec3 t, b;
    buildTangentBasis(n, t, b);
    return normalize(t * h.x + b * h.y + n * h.z);
}

// Heitz 2018 — "Sampling the GGX Distribution of Visible Normals."
// Returns a half-vector h in WORLD space, sampled from the visible normal
// distribution conditioned on viewDir. Compared to half-vector sampling
// (importanceSampleGGX above): the resulting BRDF/PDF weight collapses to
// F * G2/G1 (bounded), eliminating the grazing-angle fireflies of the
// classical NdotH/(NdotV*NdotH) form. Same compute cost; isotropic case.
vec3 sampleGGXVNDF(vec3 n, vec3 viewDir, float roughness, vec2 seedVec) {
    vec2 u = vec2(
        fract(seedVec.x * phi),
        fract(seedVec.y * phi + 0.5)
    );
    float a = roughness * roughness;

    // 1. Build tangent basis around n; transform viewDir into tangent space
    //    (z-up = surface normal).
    vec3 t, b;
    buildTangentBasis(n, t, b);
    vec3 Ve = vec3(dot(viewDir, t), dot(viewDir, b), dot(viewDir, n));

    // 2. Heitz §3.2: stretch view direction into the hemisphere config.
    vec3 Vh = normalize(vec3(a * Ve.x, a * Ve.y, Ve.z));

    // 3. Heitz §4.1: orthonormal basis aligned with Vh.
    float lensq = Vh.x * Vh.x + Vh.y * Vh.y;
    vec3 T1 = lensq > 0.0 ? vec3(-Vh.y, Vh.x, 0.0) * inversesqrt(lensq) : vec3(1.0, 0.0, 0.0);
    vec3 T2 = cross(Vh, T1);

    // 4. Heitz §4.2: sample uniformly in the projected disk, then warp.
    float r = sqrt(u.x);
    float phiVN = TAU * u.y;
    float t1 = r * cos(phiVN);
    float t2 = r * sin(phiVN);
    float s = 0.5 * (1.0 + Vh.z);
    t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

    // 5. Heitz §4.3: reproject onto the hemisphere.
    vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * Vh;

    // 6. Unstretch back to ellipsoid configuration → tangent-space half-vector.
    vec3 Ne = normalize(vec3(a * Nh.x, a * Nh.y, max(0.0, Nh.z)));

    // 7. Transform back to world space.
    return normalize(t * Ne.x + b * Ne.y + n * Ne.z);
}

#ifdef PT_AREA_LIGHTS
// Closest-hit test against type-2 sphere area lights for the path tracer's
// geometric integration of the light surface. Distinct from
// intersectLightSphere() in shared.ts, which renders the visible emitter
// (chord-thickness shading, halo softness) and is gated on type-0 only.
float intersectAreaLight(vec3 ro, vec3 rd, float tMax, out int outIdx) {
    float tBest = tMax;
    outIdx = -1;
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        if (uLightType[i] < 1.5 || uLightType[i] > 2.5) continue;
        if (uLightIntensity[i] < 0.01) continue;
        if (uLightRadius[i] < 0.001) continue;

        vec2 hit = intersectSphere(ro - uLightPos[i], rd, uLightRadius[i]);
        if (hit.x > hit.y) continue;                       // miss sentinel
        float t = hit.x > 1.0e-4 ? hit.x : hit.y;          // pick exit if origin inside
        if (t < 1.0e-4 || t >= tBest) continue;
        tBest = t; outIdx = i;
    }
    return outIdx >= 0 ? tBest : -1.0;
}

// Solid-angle PDF for uniform-area sampling on a sphere light, conditioned
// on receiver point. sphereOutNormal is the outward unit normal at the
// sampled surface point. activeCount is exposed as an explicit arg because
// MIS weights are extremely sensitive to forgetting the light-selection
// divisor — the failure mode is a uniform brightness bias on glossy surfaces.
//
// pdf_area  = 1 / (4 * PI * r^2)
// pdf_omega = pdf_area * dist^2 / |cos(theta_light)|
float pdfSphereLightDir(vec3 lDir, vec3 sphereOutNormal, float dist,
                        float radius, int activeCount) {
    float cosThetaLight = max(1.0e-5, abs(dot(-lDir, sphereOutNormal)));
    float pdfArea = 1.0 / (4.0 * PI * radius * radius);
    float pdfDir  = pdfArea * dist * dist / cosThetaLight;
    return pdfDir / float(max(1, activeCount));
}
#endif

// Veach 1995 power-heuristic (β=2): w_A = pdf_A² / (pdf_A² + pdf_B²).
// Caller picks which estimator's PDF goes in pdfA — pass yours first.
float misPower2(float pdfA, float pdfB) {
    float a2 = pdfA * pdfA;
    float b2 = pdfB * pdfB;
    return a2 / max(1.0e-20, a2 + b2);
}

// Heitz 2018 §3 eq. 17 — VNDF half-vector PDF in solid-angle measure for an
// arbitrary direction L. The reflection mapping H = (V+L)/|V+L| contributes
// |dH/dL| = 1/(4 * VdotH); the VdotH terms in the standard pdf_VNDF(H) cancel
// against the BRDF/PDF Jacobian, leaving the clean form below.
//
// Self-consistency: when L is sampled via sampleGGXVNDF, the throughput weight
// f(L)*NdotL/pdf_VNDF(L) collapses to F * G2/G1(V) = F * G1(L), matching the
// weight applied at the bounce-direction site.
float pdfVNDF(vec3 nrm, vec3 v, vec3 l, float roughness) {
    vec3 h = v + l;
    float lensq = dot(h, h);
    if (lensq < 1.0e-10) return 0.0;
    h *= inversesqrt(lensq);

    float NdotV = max(0.001, dot(nrm, v));
    float NdotH = max(0.0, dot(nrm, h));
    if (NdotH <= 0.0) return 0.0;

    float a  = roughness * roughness;
    float a2 = a * a;
    float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
    float D     = a2 / (PI * denom * denom + GGX_EPSILON);

    float kGv  = a * 0.5;
    float G1V = NdotV / (NdotV * (1.0 - kGv) + kGv);

    return G1V * D / (4.0 * NdotV);
}

// Mixture density combining VNDF specular lobe + cosine-weighted diffuse lobe.
// MUST match the bounce-direction sampler's mixture (search "BOUNCE DIRECTION
// SELECTION" below). If probSpec calculation changes there, update here in
// lockstep or MIS goes biased on rough surfaces.
float pdfBSDF(vec3 nrm, vec3 v, vec3 l, float roughness, float probSpec) {
    float NdotL = max(0.0, dot(nrm, l));
    float pSpec = pdfVNDF(nrm, v, l, roughness);
    float pDiff = NdotL / PI;
    return probSpec * pSpec + (1.0 - probSpec) * pDiff;
}

// Bounce-ray trace that also tests sphere area lights. Reuses traceSceneLean
// untouched. Sphere-light intersection runs alongside the fractal march; the
// closer of the two wins.
//
// Returns:
//   true                   → fractal hit (use d, result for shading)
//   false, lightHit >= 0   → sphere light hit at distance d
//   false, lightHit  < 0   → ray escaped (caller adds env contribution)
//
// Without PT_AREA_LIGHTS this is just a passthrough — single function avoids
// duplicating the call sites between gated/ungated builds.
bool tracePTBounce(
    vec3 ro, vec3 rd,
    out float d, out vec4 result, inout vec3 glow,
    float traceSeed, inout float volumetric, out vec3 fogScatter,
    out int lightHit
) {
#ifdef PT_AREA_LIGHTS
    int   tmpIdx;
    float tLight = intersectAreaLight(ro, rd, MAX_DIST, tmpIdx);
    bool hit = traceSceneLean(ro, rd, d, result, glow, traceSeed, volumetric, fogScatter);

    if (tmpIdx >= 0 && (!hit || tLight < d)) {
        // Light closer than fractal — overwrite distance so fog/volumetric
        // accumulators see the correct path length to the light surface.
        d = tLight;
        lightHit = tmpIdx;
        return false;
    }
    // Fractal occluded the light, or no light hit. Either way ignore the light.
    lightHit = -1;
    return hit;
#else
    lightHit = -1;
    return traceSceneLean(ro, rd, d, result, glow, traceSeed, volumetric, fogScatter);
#endif
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

    // Carried across bounce iterations so the next iter's !hit branch can
    // inspect what the previous iter's trace saw. Unconditional declaration
    // keeps the loop shape stable; compiler DCEs writes when the gate is off.
    int   lightHit = -1;
    // Surface state from the bounce that EMITTED the ray now potentially hitting
    // a light — needed by BSDF-side MIS, which weights against the BSDF PDF
    // evaluated at the previous bounce's surface, not the light's surface.
    vec3  n_prev = vec3(0.0, 1.0, 0.0);
    vec3  viewDir_prev = vec3(0.0, 0.0, 1.0);
    float roughness_prev = 1.0;
    float probSpec_prev = 0.0;

    // Loop-invariant light list (depends only on uniforms) — also reused by the
    // next-iter !hit branch's MIS, which needs activeCount without re-scanning.
    int activeCount = 0;
    int activeIndices[3];
    if (uLightIntensity[0] > 0.01) activeIndices[activeCount++] = 0;
    if (uLightIntensity[1] > 0.01) activeIndices[activeCount++] = 1;
    if (uLightIntensity[2] > 0.01) activeIndices[activeCount++] = 2;

    for (int bounce = 0; bounce < 8; bounce++) {
        if (bounce >= ${loopLimit}) break;

        // Coprime decorrelation: irrational constants shift the blue noise texture lookup by a different
        // amount each bounce, ensuring samples from different bounces land on uncorrelated texels.
        // 17.123 and 23.456 are mutually irrational (no integer ratio) — same principle as Halton sequences.
        // 7.31 / 11.17 used for secondary env noise lookup below (also mutually irrational).
        vec2 bounceOffset = vec2(float(bounce) * 17.123, float(bounce) * 23.456);
        vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset);

        if (!hit) {
#ifdef PT_AREA_LIGHTS
            // BSDF-side direct light hit: bounce ray landed on a sphere light.
            // MIS combines this with NEE's contribution at the previous bounce.
            // pdfSphereLightDir divides by activeCount internally; pdfBSDF does
            // not (the BSDF doesn't pick which light). Active-count from the
            // PREVIOUS bounce isn't tracked, so we read the current count —
            // exact when the light set is stable across bounces.
            if (lightHit >= 0) {
                vec3 lightPt    = currentRo + currentRd * d;
                vec3 lightN     = normalize(lightPt - uLightPos[lightHit]);
                int  pdfSelBsdf;
                #ifdef PT_NEE_ALL_LIGHTS
                    pdfSelBsdf = 1;
                #else
                    pdfSelBsdf = activeCount;
                #endif
                float pdf_light = pdfSphereLightDir(currentRd, lightN, d,
                                                    uLightRadius[lightHit], pdfSelBsdf);
                float pdf_bsdf  = pdfBSDF(n_prev, viewDir_prev, currentRd,
                                          roughness_prev, probSpec_prev);
                float w_bsdf = misPower2(pdf_bsdf, pdf_light);

                // Sphere light is power-normalized — see NEE site below for rationale.
                float lr = uLightRadius[lightHit];
                vec3 emission = uLightColor[lightHit] * uLightIntensity[lightHit] / (4.0 * PI * lr * lr);
                radiance += w_bsdf * emission * throughput;
                break;
            }
#endif
            float skyIntensity = (bounce == 0) ? uEnvBackgroundStrength : uEnvStrength;
            vec3 env = sampleMiss(currentRo, currentRd, 0.0) * skyIntensity;
            if (bounce == 0 && uFogFar < 1000.0) {
                float fogFactor = smoothstep(uFogNear, uFogFar, uFogFar * 0.95);
                env = mix(env, uFogColorLinear, fogFactor * 0.5);
            }
            radiance += env * throughput;
            break;
        }

        vec3 p_ray = currentRo + currentRd * d;
        vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        vec3 albedo, n, emission;
        float roughness;
        getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, bounce == 0);

        // AO removed from PT path: it's a screen-space approximation of multi-
        // bounce GI, which the bounce loop computes for real. Keeping it would
        // double-shade corners. Saves ~5 DE_Dist taps per primary pixel.
        float ao = 1.0;

        if (bounce == 0 && uRim > 0.01) {
            float NdotV_rim = max(0.0, dot(n, -currentRd));
            float rimFactor = pow(1.0 - NdotV_rim, uRimExponent) * uRim;
            emission += uRimColor * rimFactor;
        }

        roughness = max(roughness, 0.04);  // Minimum roughness — prevents NaN in GGX distribution denominator
        float emissionMult = (bounce == 0) ? 1.0 : uPTEmissionMult;
        radiance += (emission * ao * emissionMult) * throughput;

        // --- Shared state for NEE and bounce selection ---
        vec3 viewDir = -currentRd;
        float NdotV = max(0.001, dot(n, viewDir));
        vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);  // 0.04 = standard dielectric F0 (4% reflectance at normal incidence)
        vec3 F_surface = fresnelSchlick(NdotV, F0);

        // Schlick-GGX geometry term parameters (shared by NEE and IS weight)
        float a_ggx = roughness * roughness;
        float kG = a_ggx * 0.5;

        // probSpec hoisted above NEE so MIS reads the same mixture density that
        // the bounce-direction sampler uses below. Depends only on F_surface,
        // albedo, uDiffuse, uReflection, roughness — all in scope here.
        vec3 weightSpec = F_surface;
        vec3 weightDiff = (vec3(1.0) - F_surface) * (1.0 - uReflection) * albedo * uDiffuse;
        float lumSpec = luminance(weightSpec);
        float lumDiff = luminance(weightDiff);
        float probSpec = lumSpec / max(0.0001, lumSpec + lumDiff);
        float smoothness = 1.0 - roughness;
        probSpec = mix(probSpec, 1.0, smoothness * 0.4);
        probSpec = clamp(probSpec, 0.05, 0.95);

        // --- NEXT EVENT ESTIMATION ---
        // activeCount + activeIndices hoisted to function scope (above this
        // for-loop). Loop-invariant so we don't rebuild per bounce. PT_VOLUMETRIC
        // and the next-iter BSDF-MIS branch share the same arrays.

        // Bias epsilon — hoisted so PT_ENV_NEE can reuse it
        // Use camera-to-point distance for pixel footprint (not bounce travel distance).
        // Bounce rays that hit nearby geometry have small d, which would collapse the bias
        // and cause self-intersection on the next bounce. p_ray is in camera-local space,
        // so length(p_ray) gives the true camera distance for correct pixel footprint scaling.
        float cameraDist = length(p_ray);
        float distFromFractalOrigin = length(p_fractal);
        float floatLimitNEE = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);
        float orthoPixelFootprintNEE = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * cameraDist;
        float visualLimitNEE = orthoPixelFootprintNEE * (1.0 / uDetail);
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

                bool isDirectional = uLightType[lightIdx] > 0.5 && uLightType[lightIdx] < 1.5;
                vec3 shadowRo = p_ray + n * (biasEps * 2.0 + uShadowBias);

                vec3 lVec;
                float distToLight;
                #ifdef PT_AREA_LIGHTS
                // Sphere area light NEE: sample a point uniformly on the sphere
                // surface (Marsaglia 1972), shoot toward it. pdfSphereDir is the
                // resulting per-direction PDF in solid-angle measure, already
                // divided by light-selection probability. Used to weight the
                // contribution and as the MIS pdf_light estimator.
                bool isSphere = uLightType[lightIdx] > 1.5 && uLightType[lightIdx] < 2.5;
                vec3 sphereOutNormal = vec3(0.0);
                float pdfSphereDir = 0.0;
                if (isSphere) {
                    // Fresh blue-noise dims, decorrelated from light-pick (.r),
                    // shadow jitter (.gb), bounce-type (.a), env-NEE (.rg+offset).
                    vec4 areaNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset + vec2(13.7, 19.3));
                    float z = 1.0 - 2.0 * areaNoise.x;
                    float r2 = sqrt(max(0.0, 1.0 - z * z));
                    float phi = TAU * areaNoise.y;
                    sphereOutNormal = vec3(r2 * cos(phi), r2 * sin(phi), z);
                    vec3 surfacePt = uLightPos[lightIdx] + uLightRadius[lightIdx] * sphereOutNormal;
                    lVec = surfacePt - p_ray;
                    distToLight = length(lVec);
                    // When PT_NEE_ALL_LIGHTS, every light is evaluated so there's
                    // no selection-probability divisor — pass 1.
                    int pdfSel;
                    #ifdef PT_NEE_ALL_LIGHTS
                        pdfSel = 1;
                    #else
                        pdfSel = activeCount;
                    #endif
                    pdfSphereDir = pdfSphereLightDir(lVec / max(1.0e-5, distToLight),
                                                    sphereOutNormal, distToLight,
                                                    uLightRadius[lightIdx], pdfSel);
                } else
                #endif
                if (isDirectional) {
                    lVec = uLightDir[lightIdx]; // Already "toward light" from uniform manager
                    distToLight = DIR_LIGHT_DIST;
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
                    vec3 h = normalize(lDir + viewDir);
                    float ndotl = max(0.0, dot(n, lDir));
                    float hdotv = max(0.0, dot(h, viewDir));
                    float ndoth = max(0.0, dot(n, h));

                    // Branchless attenuation (see pbr.ts LOOP_OPEN)
                    float att = 1.0;
                    if (!isDirectional && (uLightFalloff[lightIdx] + uLightFalloffType[lightIdx]) > 0.001) {
                        float d2_att = distToLight * distToLight;
                        att = 1.0 / (1.0 + uLightFalloff[lightIdx] * d2_att + uLightFalloffType[lightIdx] * distToLight);
                    }

                    vec3 F_nee = fresnelSchlick(hdotv, F0);

                    // GGX Cook-Torrance specular (Schlick-GGX geometry, matches pbr.ts)
                    float ndotl_s = max(0.001, ndotl);
                    float a2_nee = a_ggx * a_ggx;
                    float denom_nee = ndoth * ndoth * (a2_nee - 1.0) + 1.0;
                    float D_nee = a2_nee / (PI * denom_nee * denom_nee + GGX_EPSILON);
                    float G1V_nee = NdotV / (NdotV * (1.0 - kG) + kG);
                    float G1L_nee = ndotl_s / (ndotl_s * (1.0 - kG) + kG);
                    float G_nee = G1V_nee * G1L_nee;
                    vec3 spec = (D_nee * F_nee * G_nee) / max(0.001, 4.0 * NdotV * ndotl_s);

                    vec3 kS_nee = F_nee;
                    vec3 kD_nee = (vec3(1.0) - kS_nee) * (1.0 - uReflection);

                    // Compensation factor = 1 / true_PDF.
                    //   Delta lights: PDF = 1/activeCount (one of N picked uniformly), so
                    //                 compensation = activeCount.
                    //                 PT_NEE_ALL_LIGHTS evaluates every light so PDF = 1.
                    //   Sphere area:  PDF = pdfSphereDir (already includes selection divisor),
                    //                 compensation = 1/pdfSphereDir.
                    float pdf;
                    #ifdef PT_AREA_LIGHTS
                    if (isSphere) {
                        pdf = 1.0 / max(1.0e-10, pdfSphereDir);
                    } else
                    #endif
                    {
                        #ifdef PT_NEE_ALL_LIGHTS
                            pdf = 1.0;
                        #else
                            pdf = float(activeCount);
                        #endif
                    }

                    // Sphere lights: treat uLightIntensity as TOTAL EMITTED POWER rather
                    // than per-area radiance. Divide by emitter area (4πr²) so brightness
                    // is invariant to radius — radius controls shadow softness only. The
                    // 4πr² cancels with the same factor that appears in 1/pdfSphereDir,
                    // making sphere-light contributions match a point-light-with-falloff
                    // at the same intensity. Standard convention in physical area lights.
                    vec3 lightFlux = uLightColor[lightIdx] * uLightIntensity[lightIdx];
                    #ifdef PT_AREA_LIGHTS
                    if (isSphere) {
                        float r = uLightRadius[lightIdx];
                        lightFlux *= 1.0 / (4.0 * PI * r * r);
                    }
                    #endif
                    vec3 directContrib = (kD_nee * albedo * uDiffuse / PI + spec) * lightFlux * ndotl * shadow * att * ao * pdf;

                    // For delta lights (point/directional), pdf_light is a delta
                    // and pdf_bsdf is bounded → w_nee = 1, no weighting needed.
                    // Sphere lights have finite densities on both sides.
                    float w_nee = 1.0;
                    #ifdef PT_AREA_LIGHTS
                    if (isSphere) {
                        float pdf_bsdf_nee = pdfBSDF(n, viewDir, lDir, roughness, probSpec);
                        w_nee = misPower2(pdfSphereDir, pdf_bsdf_nee);
                    }
                    #endif

                    // (Firefly clamp removed: with VNDF the throughput weight is
                    // bounded F*G2/G1, so per-sample contributions can no longer
                    // explode at grazing angles. The clamp was a biased dim-shift
                    // band-aid for the half-vector IS form's NdotH/(NdotV*NdotH)
                    // blow-up. Bench-verified bias-neutral.)

                    radiance += w_nee * directContrib * throughput;
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
                int  envLightHit;
                bool envHit = tracePTBounce(envOrigin, envDir, envD, envResult, envGlow, seed + float(bounce) * 5.31, envVol, envScatter, envLightHit);
                // Sky reached only when nothing intercepted: no fractal AND no
                // sphere light. Light occlusion suppresses env contribution; the
                // light's own emission is delivered by the dedicated NEE block
                // above (or BSDF-side hit at the next iter) — not double-counted.
                if (!envHit && envLightHit < 0) {
                    // Cosine-weighted PDF = NdotL/PI cancels with Lambertian BRDF = kD*albedo/PI
                    // → weight = kD * albedo (clean, no NdotL needed)
                    vec3 envF = fresnelSchlick(envNdotL, F0);
                    vec3 envKD = (vec3(1.0) - envF) * (1.0 - uReflection);
                    vec3 envColor = GetEnvMap(envDir, 0.0) * uEnvStrength;
                    radiance += envKD * albedo * uDiffuse * envColor * throughput;
                }
            }
        }
        #endif

        // Last-bounce skip: bounce-direction selection, the next-bounce trace,
        // and RR all only matter for the *next* iteration. On the final bounce,
        // their outputs are written and never read. The fog block is the one
        // exception — it adds a real radiance contribution along the bounce
        // ray — so we keep the loop running when fog is enabled.
        if (bounce + 1 >= maxBounces && uFogDensity < 0.001) break;

        // --- BOUNCE DIRECTION SELECTION ---
        // probSpec, weightSpec, weightDiff hoisted above NEE (see header of this
        // bounce iteration). Reused here for direction sampling.
        float randType = fract(blueNoise.a * 1.618);  // Golden ratio decorrelation for bounce type selection
        vec2 dirSeed = blueNoise.gb;

        if (randType < probSpec) {
            // VNDF sampling (Heitz 2018). The half-vector H is sampled from the
            // visible normal distribution conditioned on viewDir, so the BRDF/PDF
            // weight collapses to F * G2/G1 = F * G1(L) (uncorrelated Smith form).
            // No NdotH/(NdotV*NdotH) ratio → no grazing-angle fireflies.
            vec3 H = sampleGGXVNDF(n, viewDir, roughness, dirSeed);
            vec3 newDir = reflect(currentRd, H);
            float NdotL_sp = max(0.001, dot(n, newDir));
            float G1L_sp = NdotL_sp / (NdotL_sp * (1.0 - kG) + kG);
            currentRd = newDir;
            throughput *= F_surface * G1L_sp / probSpec;
            // Below-horizon fallback: rare, but VNDF can still produce L below
            // the surface for very rough surfaces + grazing views.
            if (dot(currentRd, n) < 0.0) currentRd = cosineSampleHemisphere(n, dirSeed);
        } else {
            currentRd = cosineSampleHemisphere(n, dirSeed);
            throughput *= weightDiff / (1.0 - probSpec);
        }

        throughput *= uPTGIStrength;
        currentRo = p_ray + n * (biasEps * 2.0);
        float bounceVol = 0.0;
        vec3 bounceGlow = vec3(0.0);
        vec3 bounceScatter = vec3(0.0);

        // Snapshot for BSDF-side MIS at the next iter's light-hit branch.
        // Cheap unconditional writes — compiler DCEs when the gate is off.
        n_prev = n;
        viewDir_prev = viewDir;
        roughness_prev = roughness;
        probSpec_prev = probSpec;

        hit = tracePTBounce(currentRo, currentRd, d, result, bounceGlow, seed + float(bounce), bounceVol, bounceScatter, lightHit);

        // Absorption-only fog on bounce paths (Beer-Lambert with actual march distance).
        // Primary-ray scatter (god rays) is accumulated in traceScene on the camera ray.
        if (uFogDensity > 0.001) {
            float trans = exp(-uFogDensity * d);
            radiance += uFogColorLinear * (1.0 - trans) * throughput;
            throughput *= trans;
        }

        // Russian roulette: standard form (PBRT §13.7, Arvo & Kirk 1990).
        // Survival probability scales with current throughput; survivors get 1/q
        // reweighting so the estimator stays unbiased. Bright paths survive freely
        // (q→1), dim paths terminate stochastically. Starts at bounce 1 — primary
        // direct lighting always evaluates, but indirect contributions are subject
        // to RR from the first bounce.
        if (bounce >= 1) {
            float maxThroughput = max(throughput.r, max(throughput.g, throughput.b));
            float q = clamp(maxThroughput, 0.05, 1.0);  // 5% floor prevents pathological 1/q boost
            float rrRand = fract(blueNoise.r * 1.618 + 0.7);  // golden-ratio decorrelation from bounce-type rand
            if (rrRand > q) break;
            throughput /= q;
        }
        // (Throughput firefly clamp removed alongside the NEE clamp — both were
        // band-aids for the half-vector IS variance source that VNDF eliminates.)
    }
    return radiance;
}
`;
};
