
import { getVNDFSamplerGLSL } from './vndf';

export const getPathTracerGLSL = (isMobile: boolean, maxLights: number, stochasticShadows: boolean = true) => {

    const loopLimit = isMobile ? '2' : 'maxBounces';
    // PT shadows are ALWAYS a single binary-visibility march (GetHardShadow):
    // delta lights (point/directional) are physically hard-shadowed, and sphere
    // area lights aim lDir/distToLight at the per-frame surface sample (NEE), so
    // a hard test toward it is correct — their penumbra comes from accumulation,
    // not an analytic march. @see docs/adr/0074
    //
    // The stochastic JITTER (Soft Shadow Jitter, fake-soft for Point lights) is
    // now a RUNTIME toggle (`uAreaLights`), not a compile gate. The old design
    // emitted two separate marches behind `if (uAreaLights)` and feared ANGLE
    // would predicate both. Here the jitter is only a cheap perturbation of the
    // shadow-ray DIRECTION computed before the march — there is structurally ONE
    // GetHardShadow call, so there is nothing to predicate: FPS is identical
    // when off, and toggling jitter needs no recompile. `jitterCapable` is the
    // remaining compile gate (ptStochasticShadows / mobile) for whether the
    // jitter ALU is compiled in at all.
    const jitterCapable = stochasticShadows && !isMobile;
    const shadowLogic = !jitterCapable ? `
        shadow = GetHardShadow(shadowRo, lDir, distToLight);
    ` : `
        vec3 shadowDir = lDir;
        float shadowDist = distToLight;
        if (uAreaLights > 0.5) {
            // Stochastic jitter (runtime): perturb the ray within the light's
            // disc; softness emerges from accumulating jittered samples.
            vec2 jitter = blueNoise.gb;
            vec3 sT, sB;
            buildTangentBasis(lDir, sT, sB);

            float spread = 2.0 / max(uShadowSoftness, 0.1);
            float r = sqrt(jitter.x) * spread;
            float theta = jitter.y * TAU;

            vec3 offsetDir = sT * cos(theta) * r + sB * sin(theta) * r;
            shadowDir = normalize(lDir + offsetDir);

            if (!isDirectional) {
                float radius = spread * distToLight;
                vec3 jitterOffset = (sT * cos(theta) + sB * sin(theta)) * sqrt(jitter.x) * radius;
                vec3 targetPos = uLightPos[lightIdx] + jitterOffset;
                vec3 tVec = targetPos - p_ray;
                shadowDist = length(tVec);
                shadowDir = tVec / max(1.0e-5, shadowDist);
            }

            #ifdef PT_AREA_LIGHTS
            // Sphere: shadow straight toward the NEE sphere sample — re-jittering
            // (uLightPos-based) would defeat sphere sampling.
            if (uLightType[lightIdx] > 1.5) { shadowDir = lDir; shadowDist = distToLight; }
            #endif
        }
        shadow = GetHardShadow(shadowRo, shadowDir, shadowDist);
    `;

    return `
// ------------------------------------------------------------------
// MONTE CARLO PBR PATH TRACER
// ------------------------------------------------------------------

float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// HDR firefly suppression with a SOFT knee. A hard clamp (min(1, max/l)) maps
// every bright sample to exactly uPTMaxLuminance, collapsing bright reflected
// regions into a flat plateau. Instead, pass through luminance ≤ t unchanged
// and smoothly compress the excess toward an asymptote of 2·t — monotonic, so
// brighter stays brighter (relative contrast preserved) while rare extreme
// spikes are still bounded (≤ 2·t). Less biased than the hard clamp; raise
// uPTMaxLuminance to push the knee up. Applied AFTER throughput. @see docs/adr/0071
vec3 clampByLuminance(vec3 c) {
    float l = luminance(c);
    float t = uPTMaxLuminance;
    if (l <= t) return c;
    float ln = t + t * (1.0 - exp(-(l - t) / t));   // -> 2·t as l -> inf
    return c * (ln / max(l, 0.001));
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

// GGX VNDF bounce sampler — bounded spherical caps, shared with the raymarched
// reflection path via one emitter (no duplicate algorithm). The previous Heitz
// 2018 routine is superseded: spherical caps is cheaper, never samples below the
// horizon, and the bound trims occluded normals on rough surfaces. The bounce
// seed is passed straight through (sobol/CP or blue-noise is already a good 2D
// sample — no extra fract*phi hash needed). @see docs/adr/0068
${getVNDFSamplerGLSL('sampleGGXVNDF')}

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

#ifdef PT_SOBOL_BOUNCE
// 2D Sobol' sequence with Cranley-Patterson rotation per pixel.
// Used only for the GGX bounce-direction seed — blue noise is retained for
// shadow jitter, light selection, and RR (where its spatial-dither property
// matters more than per-sequence stratification).
//
// Implementation notes:
//   - radicalInverse_VdC(i) = van der Corput base-2 = bit-reverse(i)/2^32.
//     This is the d=0 dimension of Sobol' (identity direction matrix).
//   - sobol2_d1(i) = the d=1 dimension's direction matrix gives the upper-
//     triangular all-ones generator. Loop walks the bits of i and XORs in
//     the surviving direction-vector contributions.
//   - cpHash(fragCoord): per-pixel 2D PCG-flavored hash → uniform [0,1)².
//     Adding (mod 1) decorrelates pixels so neighbors don't draw the same
//     subsequence (which would manifest as visible structure).
float radicalInverse_VdC(uint bits) {
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10;  // 1 / 2^32
}

float sobol2_d1(uint i) {
    uint r = 0u;
    uint v = 1u << 31u;
    for (int k = 0; k < 32; k++) {
        if (i == 0u) break;
        if ((i & 1u) != 0u) r ^= v;
        i >>= 1u;
        v ^= v >> 1u;
    }
    return float(r) * 2.3283064365386963e-10;
}

vec2 cpHash(vec2 fragCoord) {
    // Two independent PCG-style hashes per axis. Constants are coprime;
    // any pair from the standard LCG / PCG mixer set works.
    uvec2 p = uvec2(fragCoord);
    uint hx = p.x * 1664525u + p.y * 1013904223u;
    uint hy = p.y * 1664525u + p.x * 1013904223u;
    hx ^= hx >> 16u; hx *= 0x21f0aaadu; hx ^= hx >> 15u;
    hy ^= hy >> 16u; hy *= 0x21f0aaadu; hy ^= hy >> 15u;
    return vec2(float(hx), float(hy)) * 2.3283064365386963e-10;
}

// Sobol' + CP rotation with a purpose seed. Index is stride-1 across frames
// (sIdx = uFrameCount); decorrelation between use sites (bounce dir vs env-
// NEE dir, and across bounces) lives in the CP rotation, NOT the index.
// Stride-N indexing traps every pixel inside a 1/N-wide band of the sample
// space — VdC(N*k) = VdC(k)/N — which shows up as fixed-pixel hotspots
// that don't average out.
vec2 sobol2CPSeeded(uint i, vec2 fragCoord, int purpose) {
    vec2 s = vec2(radicalInverse_VdC(i), sobol2_d1(i));
    vec2 phOffset = vec2(float(purpose) * 17.123, float(purpose) * 23.456);
    vec2 ph = cpHash(fragCoord + phOffset);
    return fract(s + ph);
}
#endif

#ifdef PT_ENV_MIS
#ifdef PT_ENV_MIS_IS
// Env-map luminance importance sampling. Two-LUT inverse CDF (Pharr/Jakob/
// Humphreys §13.6.5): binary search the marginal for a row, then binary
// search that row's conditional for a column. Recover (θ, φ) from the cell
// center and convert to a unit direction.
//
// CPU side (features/reflections/env_cdf.buildEnvCDF) computes the CDFs
// from a downsampled env map weighted by sin(θ). The GLSL is just lookup +
// arithmetic; no per-frame rebuild.
//
// PDF (Pharr §14.2.4): pdf(ω) = (W·H · L_ij) / (TAU·PI · sin(θ) · lumIntegral).
// L_ij is recovered from successive-difference of the conditional CDF row,
// which avoids carrying a third texture.

const int ENV_CDF_SEARCH_STEPS = 9;  // log2(256) + 1 — covers up to W=256 rows/cols

int binarySearchCDF1D(sampler2D cdf, float target, int N, float fixedX) {
    int lo = 0;
    int hi = N - 1;
    for (int k = 0; k < ENV_CDF_SEARCH_STEPS; k++) {
        if (lo >= hi) break;
        int mid = (lo + hi) >> 1;
        // 1D lookup: y axis is the search axis when fixedX=0.5/W and the
        // texture is laid out as 1×H. Conditional row uses fixedX = (j+0.5)/H
        // and searches along x.
        vec2 uv = vec2(fixedX, (float(mid) + 0.5) / float(N));
        float v = textureLod(cdf, uv, 0.0).r;
        if (v < target) lo = mid + 1; else hi = mid;
    }
    return lo;
}

int binarySearchCDFRow(sampler2D cdf, float target, int W, float row_v) {
    int lo = 0;
    int hi = W - 1;
    for (int k = 0; k < ENV_CDF_SEARCH_STEPS; k++) {
        if (lo >= hi) break;
        int mid = (lo + hi) >> 1;
        vec2 uv = vec2((float(mid) + 0.5) / float(W), row_v);
        float v = textureLod(cdf, uv, 0.0).r;
        if (v < target) lo = mid + 1; else hi = mid;
    }
    return lo;
}

vec3 sampleEnvImportance(vec2 seed, out float pdf) {
    int W = int(uEnvCDFSize.x);
    int H = int(uEnvCDFSize.y);

    // Stub guard — when the CDF hasn't been built (or env source is gradient/
    // procedural), fall back to uniform sphere so the call site stays safe.
    if (W <= 1 || H <= 1) {
        float z = 1.0 - 2.0 * seed.x;
        float r = sqrt(max(0.0, 1.0 - z * z));
        float phi = TAU * seed.y;
        pdf = 1.0 / (4.0 * PI);
        return vec3(r * cos(phi), r * sin(phi), z);
    }

    // 1. Marginal search → row index j.
    int j = binarySearchCDF1D(uEnvCDFMarginal, seed.x, H, 0.5);
    float row_v = (float(j) + 0.5) / float(H);

    // 2. Conditional search within row j → column index i.
    int i = binarySearchCDFRow(uEnvCDFConditional, seed.y, W, row_v);

    // 3. Recover (θ, φ) at cell center, convert to direction. Match the env
    //    convention used in env.ts:
    //      latitude  v ∈ [0,1]  →  θ = v · π   (north pole at v=0)
    //      longitude u ∈ [0,1]  →  φ = (u - 0.5) · TAU
    //      dir.x = cos(φ) sin(θ)  ; .y = -cos(θ)  ; .z = sin(φ) sin(θ)
    float u = (float(i) + 0.5) / float(W);
    float v = (float(j) + 0.5) / float(H);
    float theta = v * PI;
    float phi   = (u - 0.5) * TAU;
    float sinT = sin(theta);
    float cosT = cos(theta);
    // Direction in CDF (pre-rotation env) space; rotate back to world so
    // shadow-trace and BSDF eval are in the right basis. GetEnvMap will
    // re-apply the forward rotation when sampling the texture, returning
    // to CDF space — no double-rotation.
    vec3 dir = vec3(cos(phi) * sinT, -cosT, sin(phi) * sinT);
    // Inverse 2D rotation = transpose. v*M in GLSL = M^T * v (row-vector
    // convention), giving the inverse without an explicit transpose().
    dir.xz = dir.xz * uEnvRotationMatrix;

    // 4. Evaluate pdf via successive-difference on the CDFs. Derivation
    //    (Pharr/Jakob/Humphreys §14.2.4):
    //      du = c1 - c0          = L_ij / rowSum_unweighted_j
    //      dv = m1 - m0          = sin(θ_j) · rowSum_unweighted_j / S
    //                              (where S = Σ L_kl sin(θ_l))
    //      du · dv               = L_ij · sin(θ) / S
    //    Per-cell solid angle on a (W,H) equirectangular grid:
    //      dω = sin(θ) · TAU·π / (W·H)
    //    pdf(ω) = (probability of cell) / dω
    //           = (L_ij · sin(θ) / S) · W·H / (TAU·π · sin(θ))
    //           = (du · dv · W·H) / (TAU·π · sin(θ))
    //    — clean, lumIntegral cancels.
    float c1 = textureLod(uEnvCDFConditional, vec2((float(i) + 0.5) / float(W), row_v), 0.0).r;
    float c0 = i > 0 ? textureLod(uEnvCDFConditional, vec2((float(i - 1) + 0.5) / float(W), row_v), 0.0).r : 0.0;
    float m1 = textureLod(uEnvCDFMarginal, vec2(0.5, row_v), 0.0).r;
    float m0 = j > 0 ? textureLod(uEnvCDFMarginal, vec2(0.5, (float(j - 1) + 0.5) / float(H)), 0.0).r : 0.0;
    float du = c1 - c0;
    float dv = m1 - m0;
    pdf = (du * dv * float(W) * float(H)) / (TAU * PI * max(1.0e-6, sinT));
    if (pdf <= 1.0e-10) pdf = 1.0 / (4.0 * PI);

    return dir;
}

float pdfEnvImportance(vec3 dir) {
    int W = int(uEnvCDFSize.x);
    int H = int(uEnvCDFSize.y);
    if (W <= 1 || H <= 1) return 1.0 / (4.0 * PI);

    // Forward map: direction → (i, j). Inverse of the convention in
    // sampleEnvImportance. Apply uEnvRotationMatrix here too — the CDF
    // lives in pre-rotation env space, the BSDF-side dir is in world.
    vec3 d = dir;
    d.xz = uEnvRotationMatrix * d.xz;
    float theta = acos(clamp(-d.y, -1.0, 1.0));
    float phi   = atan(d.z, d.x);
    float v = theta / PI;
    float u = phi / TAU + 0.5;
    int i = clamp(int(u * float(W)), 0, W - 1);
    int j = clamp(int(v * float(H)), 0, H - 1);

    float row_v = (float(j) + 0.5) / float(H);
    float c1 = textureLod(uEnvCDFConditional, vec2((float(i) + 0.5) / float(W), row_v), 0.0).r;
    float c0 = i > 0 ? textureLod(uEnvCDFConditional, vec2((float(i - 1) + 0.5) / float(W), row_v), 0.0).r : 0.0;
    float m1 = textureLod(uEnvCDFMarginal, vec2(0.5, row_v), 0.0).r;
    float m0 = j > 0 ? textureLod(uEnvCDFMarginal, vec2(0.5, (float(j - 1) + 0.5) / float(H)), 0.0).r : 0.0;

    float du = c1 - c0;
    float dv = m1 - m0;
    float pdf = (du * dv * float(W) * float(H)) / (TAU * PI * max(1.0e-6, sin(theta)));
    return pdf > 1.0e-10 ? pdf : 1.0 / (4.0 * PI);
}
#endif

// Procedural-sky sun importance sampling. The procedural sky has no luminance
// CDF (that's texture-only), so its concentrated sun lobe — proceduralSunDir(),
// pow(cos,100) in env.ts — was sampled only by the uniform sphere, hitting the
// ~7° sun cone <1% of the time → noise on rough/diffuse surfaces. Sample a
// MIXTURE: probability PROC_SUN_PROB a uniform cone around the sun, else a
// uniform sphere. The mixture pdf keeps the env-vs-BSDF MIS exactly correct
// (sampleEnvDirection and pdfEnvSample return the SAME density). @see docs/adr/0070
const float PROC_SUN_COS_MAX = 0.98;  // ~11° cone — covers the bright sun lobe
const float PROC_SUN_PROB    = 0.5;   // mixture weight for the sun branch

float pdfProceduralEnv(vec3 dir) {
    float coneInside = (dot(dir, proceduralSunDir()) >= PROC_SUN_COS_MAX)
        ? 1.0 / (TAU * (1.0 - PROC_SUN_COS_MAX)) : 0.0;
    return PROC_SUN_PROB * coneInside + (1.0 - PROC_SUN_PROB) * (1.0 / (4.0 * PI));
}

vec3 sampleProceduralEnv(vec2 seed, out float pdf) {
    vec3 sunDir = proceduralSunDir();
    vec3 dir;
    if (seed.x < PROC_SUN_PROB) {
        // Uniform cone around the sun. Reuse seed.x (rescaled) as a sample dim.
        float u1 = seed.x / PROC_SUN_PROB;
        float cosT = 1.0 - u1 * (1.0 - PROC_SUN_COS_MAX);
        float sinT = sqrt(max(0.0, 1.0 - cosT * cosT));
        float ph = TAU * seed.y;
        vec3 t, b; buildTangentBasis(sunDir, t, b);
        dir = normalize(t * (sinT * cos(ph)) + b * (sinT * sin(ph)) + sunDir * cosT);
    } else {
        float u1 = (seed.x - PROC_SUN_PROB) / (1.0 - PROC_SUN_PROB);
        float z = 1.0 - 2.0 * u1;
        float r = sqrt(max(0.0, 1.0 - z * z));
        float ph = TAU * seed.y;
        dir = vec3(r * cos(ph), r * sin(ph), z);
    }
    pdf = pdfProceduralEnv(dir);  // full mixture density, not the chosen branch's
    return dir;
}

// Direction sampling + PDF for the env estimator. Procedural sky → analytic sun
// mixture; texture env under PT_ENV_MIS_IS → luminance CDF; otherwise uniform
// sphere (Marsaglia 1972, pdf = 1/(4π)). Same call sites, runtime-selected.
vec3 sampleEnvDirection(vec2 seed, out float pdf) {
    if (uEnvSource < 0.5 && uUseEnvMap < 0.5) return sampleProceduralEnv(seed, pdf);
#ifdef PT_ENV_MIS_IS
    return sampleEnvImportance(seed, pdf);
#else
    float z = 1.0 - 2.0 * seed.x;
    float r = sqrt(max(0.0, 1.0 - z * z));
    float phiU = TAU * seed.y;
    pdf = 1.0 / (4.0 * PI);
    return vec3(r * cos(phiU), r * sin(phiU), z);
#endif
}

// PDF lookup for the BSDF-side MIS weight at the !hit branch. Argument is
// the world-space direction the bounce ray escaped along. Must mirror
// sampleEnvDirection's density branch-for-branch or MIS goes biased.
float pdfEnvSample(vec3 dir) {
    if (uEnvSource < 0.5 && uUseEnvMap < 0.5) return pdfProceduralEnv(dir);
#ifdef PT_ENV_MIS_IS
    return pdfEnvImportance(dir);
#else
    return 1.0 / (4.0 * PI);
#endif
}

// Geometry-only any-hit visibility march for the env-NEE shadow ray. Cheaper
// than routing it through tracePTBounce/traceSceneLean, which also compute the
// color, trap, glow and volumetric data the env-NEE then discards — here we
// march DE_Dist alone and early-out at the first hit. Returns true when the ray
// reaches the sky (MAX_DIST) unobstructed by geometry. Deliberately independent
// of the shadow feature: GetHardShadow is stubbed to 1.0 when shadows aren't
// compiled, which would leak the environment straight through solid geometry.
// Budget mirrors the shadow march (uShadowSteps); on exhaustion it returns
// visible, matching GetHardShadow. @see docs/adr/0070
bool envVisibility(vec3 ro, vec3 rd) {
    float t = 0.0;
    float fudge = uFudgeFactor;
    int limit = uShadowSteps;
    for (int i = 0; i < 256; i++) {
        if (i >= limit) break;
        float h = DE_Dist(ro + rd * t);
        if (h < max(1.0e-6, t * 0.0002)) return false;  // hit geometry → occluded
        t += h * fudge;
        if (t > MAX_DIST) return true;                   // reached the sky
    }
    return true;
}
#endif

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
                radiance += clampByLuminance(w_bsdf * emission * throughput);
                break;
            }
#endif
            float skyIntensity = (bounce == 0) ? uEnvBackgroundStrength : uEnvStrength;
            // Primary-ray sky gets the subtle camera-blur softening (mip-LOD
            // scaled by DoF aperture, additive on the jittered ray); indirect
            // bounce misses keep a sharp env. Mirrors main.ts. @see docs/adr/0072
            float skyBlur = (bounce == 0) ? min(0.4, sqrt(uDOFStrength) * 0.35) : 0.0;
            vec3 env = sampleMiss(currentRo, currentRd, skyBlur) * skyIntensity;
            if (bounce == 0 && uFogFar < 1000.0) {
                float fogFactor = smoothstep(uFogNear, uFogFar, uFogFar * 0.95);
                env = mix(env, uFogColorLinear, fogFactor * 0.5);
            }

            // BSDF-side MIS weight when the bounce ray escaped to env. Pairs
            // with the per-bounce NEE block above. Bounce 0's primary-ray sky
            // has no surface BSDF source — pass through unweighted AND
            // unclamped (it's the literal scene backdrop, not a path-traced
            // contribution). Indirect bounces (≥1) read the previous surface's
            // snapshotted BSDF state and get firefly-clamped — that's where
            // shiny multi-bounce chains catch sun discs.
            if (bounce == 0) {
                radiance += env * throughput;
            } else {
                #ifdef PT_ENV_MIS
                    float pdf_bsdf = pdfBSDF(n_prev, viewDir_prev, currentRd, roughness_prev, probSpec_prev);
                    float pdf_env  = pdfEnvSample(currentRd);
                    float w_bsdf   = misPower2(pdf_bsdf, pdf_env);
                    radiance += clampByLuminance(w_bsdf * env * throughput);
                #else
                    radiance += clampByLuminance(env * throughput);
                #endif
            }
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
        // Roughness regularization (Kaplanyan & Dachsbacher 2013, Cycles "Filter
        // Glossy"). Widen the GGX lobe progressively on indirect bounces so
        // sharp-specular caustic-style paths NEE can never catch don't dominate
        // variance. Bounce 0 unaffected; bounce N gets +0.1*N floor.
        roughness = max(roughness, 0.1 * float(bounce));
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

                    radiance += clampByLuminance(w_nee * directContrib * throughput);
                }
            }
        } // End NEE

        // --- ENVIRONMENT NEE WITH MIS ---
        // Sample env as a direct light using the env PDF (uniform sphere, or
        // luminance-CDF under PT_ENV_MIS_IS); paired with the BSDF-side env
        // hit at the next iter's !hit branch via balance heuristic. Glossy /
        // mirror surfaces get a full BSDF * Le * NdotL / pdf_env contribution
        // per bounce, not the diffuse-only Lambertian we had before MIS.
        #ifdef PT_ENV_MIS
        if (uEnvStrength > 0.001) {
            // Env-NEE direction seed. The +1 purpose decorrelates from the
            // bounce-direction site (purpose +0) at the same bounce.
            #ifdef PT_SOBOL_BOUNCE
                vec2 envSeed = sobol2CPSeeded(uint(uFrameCount), gl_FragCoord.xy, bounce * 2 + 1);
            #else
                vec4 envNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset + vec2(7.31, 11.17));
                vec2 envSeed = envNoise.rg;
            #endif
            float pdf_env_nee;
            vec3 envDir = sampleEnvDirection(envSeed, pdf_env_nee);
            float envNdotL = max(0.0, dot(n, envDir));
            if (envNdotL > 0.001 && pdf_env_nee > 1.0e-10) {
                vec3 envOrigin = p_ray + n * (biasEps * 2.0);
                // Cheap geometry-only visibility (was a full tracePTBounce that
                // discarded its color/glow/volumetric work). Env is added only
                // when nothing intercepts: no geometry AND no sphere light.
                bool envBlocked = !envVisibility(envOrigin, envDir);
                #ifdef PT_AREA_LIGHTS
                    // A sphere light across the env ray suppresses the env
                    // contribution — its emission is delivered by the light-NEE
                    // block / BSDF-side hit, not double-counted here.
                    if (!envBlocked) {
                        int envLightIdx;
                        if (intersectAreaLight(envOrigin, envDir, MAX_DIST, envLightIdx) > 0.0) envBlocked = true;
                    }
                #endif
                if (!envBlocked) {
                    // Full BSDF eval at envDir (matches the bounce-direction
                    // sampler's mixture: VNDF specular + Lambert diffuse).
                    vec3 hEnv = normalize(envDir + viewDir);
                    float ndoth_e = max(0.0, dot(n, hEnv));
                    float hdotv_e = max(0.0, dot(hEnv, viewDir));
                    vec3  F_env = fresnelSchlick(hdotv_e, F0);

                    float a2_e = a_ggx * a_ggx;
                    float denom_e = ndoth_e * ndoth_e * (a2_e - 1.0) + 1.0;
                    float D_env = a2_e / (PI * denom_e * denom_e + GGX_EPSILON);
                    float G1V_e = NdotV / (NdotV * (1.0 - kG) + kG);
                    float G1L_e = envNdotL / (envNdotL * (1.0 - kG) + kG);
                    vec3  spec_env = (D_env * F_env * G1V_e * G1L_e) / max(0.001, 4.0 * NdotV * envNdotL);

                    vec3 kS_env = F_env;
                    vec3 kD_env = (vec3(1.0) - kS_env) * (1.0 - uReflection);

                    // Le must be queried at CDF resolution under PT_ENV_MIS_IS
                    // so it matches the cell-average luminance the pdf was built
                    // from; sharp sun reflections come through the BSDF-side
                    // !hit branch via full-res sampleMiss.
                    #ifdef PT_ENV_MIS_IS
                        vec3 envColor = sampleEnvAtCDFMip(envDir) * uEnvStrength;
                    #else
                        vec3 envColor = GetEnvMap(envDir, 0.0) * uEnvStrength;
                    #endif
                    vec3 brdf_eval = kD_env * albedo * uDiffuse / PI + spec_env;

                    // MIS power-heuristic: pdf_env vs pdf_bsdf at envDir.
                    float pdf_bsdf_nee = pdfBSDF(n, viewDir, envDir, roughness, probSpec);
                    float w_nee = misPower2(pdf_env_nee, pdf_bsdf_nee);

                    radiance += clampByLuminance(w_nee * brdf_eval * envColor * envNdotL / pdf_env_nee * throughput);
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
        // Bounce-direction seed: purpose +0 at this bounce. Env-NEE above
        // takes +1 with the same Sobol' index, decorrelating the two via CP
        // rotation. See sobol2CPSeeded for why purpose lives there, not in
        // the index.
        #ifdef PT_SOBOL_BOUNCE
            vec2 dirSeed = sobol2CPSeeded(uint(uFrameCount), gl_FragCoord.xy, bounce * 2 + 0);
        #else
            vec2 dirSeed = blueNoise.gb;
        #endif

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
        // No throughput cap here: VNDF + Schlick keep the per-bounce multiplier
        // bounded, so accumulated throughput can't run away on its own. HDR
        // fireflies come from Le, not throughput, and are clamped at each
        // radiance-contribution site via clampByLuminance.
    }
    return radiance;
}
`;
};
