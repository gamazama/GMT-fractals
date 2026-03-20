// ================================================================
// ReSTIR GI Prototype — Claude Fractal Path Tracer
// Standalone WebGPU app evaluating Reservoir-based Spatiotemporal
// Importance Resampling for global illumination on raymarched fractals.
//
// Architecture:
//   5 compute passes → 1 render pass
//   1. G-buffer:   primary ray raymarch → position, normal, albedo
//   2. Candidate:  trace 1 bounce → initial reservoir
//   3. Temporal:   merge with previous frame's reservoir
//   4. Spatial:    merge with ~5 geometric neighbors
//   5. Shade:      final color → accumulation buffer
//   6. Display:    fullscreen triangle reads accumulation buffer
// ================================================================

// ---- WGSL: Shared structs, fractal SDF, utilities ----

const COMMON_WGSL = /* wgsl */`

// ---- Structs ----
struct Uniforms {
    vpInv:       mat4x4f,    // inverse view-projection
    vpPrev:      mat4x4f,    // previous frame view-projection
    camPos:      vec4f,      // xyz = camera position, w = frame index (as f32)
    reso:        vec4f,      // xy = resolution, z = restir enabled (1/0), w = accumulated samples
    light:       vec4f,      // xyz = light position, w = intensity
    fpar:        vec4f,      // x=scale, y=harmonic, z=minR2, w=fixR2
    foff:        vec4f,      // xyz = IFS offset, w = fractal type (0=Claude, 1=Mandelbulb)
    dof:         vec4f,      // x=strength, y=focusDist, z=apertureBlades(unused), w=0
}

struct GBuf {
    pos:    vec3f,
    depth:  f32,
    nrm:    vec3f,
    hit:    f32,
    alb:    vec3f,
    trap:   f32,
}

struct Reservoir {
    sPos:   vec3f,
    wSum:   f32,
    sNrm:   vec3f,
    M:      f32,
    sRad:   vec3f,
    W:      f32,
}

// ---- Bindings (same layout for all compute passes) ----
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read_write> gb: array<GBuf>;
@group(0) @binding(2) var<storage, read_write> resCur: array<Reservoir>;
@group(0) @binding(3) var<storage, read_write> resPrev: array<Reservoir>;
@group(0) @binding(4) var<storage, read_write> accum: array<vec4f>;

fn pxIdx(p: vec2u) -> u32 { return p.y * u32(u.reso.x) + p.x; }
fn inBounds(p: vec2u) -> bool {
    return p.x < u32(u.reso.x) && p.y < u32(u.reso.y);
}

// ---- RNG: PCG hash + real blue noise texture + R2 temporal animation ----
fn pcg(v: u32) -> u32 {
    var s = v * 747796405u + 2891336453u;
    let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}

fn hash2(a: u32, b: u32) -> u32 {
    return pcg(a ^ (b * 2654435761u));
}

// R2 quasi-random sequence (Martin Roberts, 2018)
// Plastic constant φ₂ — the unique real root of x³ = x + 1
const R2_A1: f32 = 0.7548776662466927; // 1/φ₂
const R2_A2: f32 = 0.5698402909980532; // 1/φ₂²

// Blue noise texture (128x128 RGBA) + R2 temporal animation (matches GMT's blue_noise.ts)
@group(0) @binding(5) var bnTex: texture_2d<f32>;
@group(0) @binding(6) var bnSamp: sampler;

fn getBlueNoise4(px: vec2u, frame: u32) -> vec4f {
    let bnRes = vec2f(textureDimensions(bnTex, 0));
    // R2 temporal offset for screen-space modulation
    let temporalOff = vec2f(
        fract(f32(frame) * R2_A1),
        fract(f32(frame) * R2_A2)
    );
    let uv = (vec2f(px % vec2u(bnRes)) + temporalOff * bnRes) / bnRes;
    let blue = textureSampleLevel(bnTex, bnSamp, uv, 0.0);
    // Per-channel R2 animation for convergence (each channel decorrelated)
    let t = f32(frame);
    return vec4f(
        fract(blue.r + t * R2_A1),
        fract(blue.g + t * R2_A2),
        fract(blue.b + t * (R2_A1 + R2_A2)),
        fract(blue.a + t * (R2_A1 * R2_A2))
    );
}

fn blueNoise2(px: vec2u, frame: u32, salt: u32) -> vec2f {
    let bn = getBlueNoise4(px + vec2u(salt * 17u, salt * 31u), frame);
    return bn.rg;
}

fn blueNoise(px: vec2u, frame: u32, channel: u32) -> f32 {
    let bn = getBlueNoise4(px + vec2u(channel * 17u, channel * 31u), frame);
    return bn.r;
}

// Pure-random fallback (for reservoir merge decisions — need independence)
fn rand(px: vec2u, frame: u32, salt: u32) -> f32 {
    let seed = hash2(hash2(px.x, px.y), hash2(frame, salt));
    return f32(pcg(seed)) / 4294967295.0;
}

fn rand2(px: vec2u, frame: u32, salt: u32) -> vec2f {
    return vec2f(rand(px, frame, salt), rand(px, frame, salt + 1u));
}

// ---- Hemisphere sampling ----
// Uniform hemisphere: PDF = 1/(2π). No cosine singularity in RIS weights.
fn sampleHemisphere(n: vec3f, r: vec2f) -> vec3f {
    let phi = 6.283185307 * r.x;
    let cosT = r.y;                     // uniform in cos(θ) ∈ [0,1]
    let sinT = sqrt(1.0 - cosT * cosT);
    let x = cos(phi) * sinT;
    let y = sin(phi) * sinT;
    var up = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(n.y) < 0.99);
    let t = normalize(cross(up, n));
    let b = cross(n, t);
    return normalize(t * x + b * y + n * cosT);
}

const PI: f32 = 3.14159265;

// ---- Claude Fractal SDF ----
// Pre-computed normals from golden ratio icosahedral geometry
// N1 = normalize(vec3(-1, phi-1, phi)),  |v| = 2.0
// N2 = normalize(vec3(phi-1, phi, -1)),  |v| = 2.0
// N3 = normalize(vec3(phi, -1, phi-1)),  |v| = 2.0
const N1 = vec3f(-0.5, 0.30901699, 0.80901699);
const N2 = vec3f(0.30901699, 0.80901699, -0.5);
const N3 = vec3f(0.80901699, -0.5, 0.30901699);
const GA = vec3f(0.52573111, 0.85065081, 0.0); // normalize(1, phi, 0)

fn claudeSDF(pos: vec3f) -> vec2f {
    var z = pos;
    var dr: f32 = 1.0;
    var trap: f32 = 1e10;

    let scale = u.fpar.x;
    let harm  = u.fpar.y;
    let minR2 = u.fpar.z;
    let fixR2 = u.fpar.w;
    let off   = u.foff.xyz;

    // Harmonic fold normal via Rodrigues rotation of N3 around golden axis
    let doH = abs(harm) > 0.001;
    var n4 = N3;
    if (doH) {
        let ch = cos(harm); let sh = sin(harm);
        let dk = dot(GA, N3);
        n4 = N3 * ch + cross(GA, N3) * sh + GA * dk * (1.0 - ch);
    }

    for (var i = 0; i < 12; i++) {
        // Icosahedral folds — 3 golden-ratio reflection planes
        z -= 2.0 * min(0.0, dot(z, N1)) * N1;
        z -= 2.0 * min(0.0, dot(z, N2)) * N2;
        z -= 2.0 * min(0.0, dot(z, N3)) * N3;

        // Harmonic fold — parametric 4th plane
        if (doH) {
            z -= 2.0 * min(0.0, dot(z, n4)) * n4;
        }

        // Sphere inversion (clamped Mandelbox-style)
        let r2 = max(dot(z, z), 1e-10);
        let sK = clamp(fixR2 / r2, 1.0, fixR2 / max(minR2, 1e-10));
        z *= sK;
        dr *= sK;

        // IFS scale + offset
        z = z * scale - off * (scale - 1.0);
        dr *= abs(scale);

        // Smooth minimum — avoids hard iteration banding in coloring
        let d = length(z);
        let k = 0.3; // smoothing factor
        let h = max(k - abs(trap - d), 0.0) / k;
        trap = min(trap, d) - h * h * k * 0.25;
    }

    return vec2f(length(z) / dr, trap);
}

// ---- Mandelbulb SDF ----
fn mandelbulbSDF(pos: vec3f) -> vec2f {
    var z = pos;
    var dr: f32 = 1.0;
    var r: f32 = 0.0;
    var trap: f32 = 1e10;
    let power = u.fpar.x; // reuse scale param as power (default 8)

    for (var i = 0; i < 12; i++) {
        r = length(z);
        if (r > 2.0) { break; }

        // Convert to spherical
        let theta = acos(z.z / r);
        let phi = atan2(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        // Scale and rotate
        let zr = pow(r, power);
        let newTheta = theta * power;
        let newPhi = phi * power;

        // Convert back to cartesian
        z = zr * vec3f(
            sin(newTheta) * cos(newPhi),
            sin(newTheta) * sin(newPhi),
            cos(newTheta)
        );
        z += pos; // c = pos (standard Mandelbulb)

        // Smooth trap
        let d = length(z);
        let k = 0.3;
        let h = max(k - abs(trap - d), 0.0) / k;
        trap = min(trap, d) - h * h * k * 0.25;
    }

    return vec2f(0.5 * log(r) * r / dr, trap);
}

// ---- SDF dispatch (selects fractal based on uniform) ----
fn fractalSDF(p: vec3f) -> vec2f {
    if (u.foff.w > 0.5) {
        return mandelbulbSDF(p);
    }
    return claudeSDF(p);
}

fn calcNormal(p: vec3f) -> vec3f {
    let e = 0.0004;
    return normalize(vec3f(
        fractalSDF(p + vec3f(e, 0, 0)).x - fractalSDF(p - vec3f(e, 0, 0)).x,
        fractalSDF(p + vec3f(0, e, 0)).x - fractalSDF(p - vec3f(0, e, 0)).x,
        fractalSDF(p + vec3f(0, 0, e)).x - fractalSDF(p - vec3f(0, 0, e)).x
    ));
}

// Safe normal: compute at a position guaranteed outside the surface,
// and validate it points outward (away from the interior).
fn safeNormal(p: vec3f, rd: vec3f) -> vec3f {
    // Step back slightly along ray to ensure we're outside
    let safeP = p - rd * 0.001;
    var n = calcNormal(safeP);
    // If normal points same direction as ray (into surface), flip it.
    // This catches inverted normals on smooth/unconverged surfaces.
    if (dot(n, rd) > 0.0) {
        n = -n;
    }
    return n;
}

// Raymarched ambient occlusion — cheaply estimates how enclosed a point is.
// Steps along normal; if SDF is smaller than expected, geometry is nearby → dark.
fn calcAO(p: vec3f, n: vec3f) -> f32 {
    var occ: f32 = 0.0;
    var scale: f32 = 1.0;
    for (var i: u32 = 1u; i <= 5u; i++) {
        let dist = 0.01 + 0.04 * f32(i);     // sample at 0.05, 0.09, 0.13, 0.17, 0.21
        let sdf = fractalSDF(p + n * dist).x;
        occ += (dist - sdf) * scale;          // penalize when SDF < expected distance
        scale *= 0.65;                         // diminish further samples
    }
    return clamp(1.0 - occ * 3.0, 0.05, 1.0);
}

struct Hit {
    hit:  bool,
    pos:  vec3f,
    dist: f32,
    trap: f32,
}

fn march(ro: vec3f, rd: vec3f, maxT: f32, maxSteps: u32) -> Hit {
    var t: f32 = 0.001;
    var h: Hit;
    h.hit = false;
    for (var i: u32 = 0u; i < maxSteps; i++) {
        let p = ro + rd * t;
        let d = fractalSDF(p);
        if (d.x < 0.0003) {
            h.hit = true;
            h.pos = p;
            h.dist = t;
            h.trap = d.y;
            return h;
        }
        t += d.x * 0.7;
        if (t > maxT) { break; }
    }
    return h;
}

// ---- Coloring ----
// Smooth cosine palette (iq's method) — no hard transitions, no Mach banding
fn cosPalette(t: f32, a: vec3f, b: vec3f, c: vec3f, d: vec3f) -> vec3f {
    return a + b * cos(6.283185 * (c * t + d));
}

fn trapColor(trap: f32) -> vec3f {
    // Continuous mapping — avoids the piecewise banding of a stepped gradient
    let t = clamp(trap * 0.3, 0.0, 1.0);
    // Warm earth/teal palette inspired by Claude fractal defaults
    return cosPalette(t,
        vec3f(0.45, 0.35, 0.30),  // bias (midpoint brightness)
        vec3f(0.40, 0.35, 0.30),  // amplitude
        vec3f(1.0,  0.8,  0.7),   // frequency
        vec3f(0.0,  0.15, 0.35)   // phase offset
    );
}

fn skyColor(rd: vec3f) -> vec3f {
    let t = rd.y * 0.5 + 0.5;
    let sky = mix(vec3f(0.01, 0.01, 0.03), vec3f(0.25, 0.45, 0.75), t);
    // Add a subtle sun
    let sunDir = normalize(vec3f(-0.5, 0.8, 0.6));
    let sun = pow(max(dot(rd, sunDir), 0.0), 64.0) * vec3f(1.0, 0.9, 0.7) * 2.0;
    return sky * 0.4 + sun;
}

// ---- Reservoir operations ----
fn emptyReservoir() -> Reservoir {
    var r: Reservoir;
    r.sPos = vec3f(0.0); r.wSum = 0.0;
    r.sNrm = vec3f(0.0); r.M = 0.0;
    r.sRad = vec3f(0.0); r.W = 0.0;
    return r;
}

fn updateReservoir(r: ptr<function, Reservoir>,
    sPos: vec3f, sNrm: vec3f, sRad: vec3f, w: f32, xi: f32)
{
    (*r).wSum += w;
    (*r).M += 1.0;
    if (xi * (*r).wSum < w) {
        (*r).sPos = sPos;
        (*r).sNrm = sNrm;
        (*r).sRad = sRad;
    }
}

fn finalizeReservoir(r: ptr<function, Reservoir>) {
    let pHat = max(luminance((*r).sRad), 1e-6);
    let denom = max((*r).M, 1.0) * pHat;
    // Clamp W to 2π — the theoretical inverse-PDF for uniform hemisphere.
    // Anything higher is energy amplification from biased resampling.
    (*r).W = select(min((*r).wSum / max(denom, 1e-10), 2.0 * PI), 0.0, pHat < 1e-5);
}

fn luminance(c: vec3f) -> f32 {
    return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}
`;

// ---- Pass 1: G-Buffer ----
const GBUFFER_WGSL = COMMON_WGSL + /* wgsl */`
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let px = gid.xy;
    if (!inBounds(px)) { return; }

    let idx = pxIdx(px);
    let frame = u32(u.camPos.w);
    let res = vec2f(u.reso.x, u.reso.y);

    // Sub-pixel jitter via blue noise for antialiasing
    let jitter = blueNoise2(px, frame, 0u) - 0.5;
    let uv = (vec2f(px) + 0.5 + jitter) / res * 2.0 - 1.0;

    // Ray from inverse VP
    let cn = u.vpInv * vec4f(uv.x, -uv.y, 0.0, 1.0);
    let cf = u.vpInv * vec4f(uv.x, -uv.y, 1.0, 1.0);
    var ro = cn.xyz / cn.w;
    var rd = normalize(cf.xyz / cf.w - ro);

    // DOF: thin lens model
    let dofStrength = u.dof.x;
    if (dofStrength > 0.0) {
        let focusDist = u.dof.y;
        let focusPoint = ro + rd * focusDist;

        // Lens sampling (hexagonal bokeh via blue noise)
        let lensXi = blueNoise2(px, frame, 2u);
        let lensAngle = lensXi.x * 6.283185307;
        let lensRadius = sqrt(lensXi.y) * dofStrength;
        // Build lens plane from camera right/up
        let camRight = normalize(cross(rd, vec3f(0.0, 1.0, 0.0)));
        let camUp = cross(camRight, rd);
        let lensOffset = camRight * cos(lensAngle) * lensRadius + camUp * sin(lensAngle) * lensRadius;

        ro = ro + lensOffset;
        rd = normalize(focusPoint - ro);
    }

    let hit = march(ro, rd, 20.0, 300u);

    var g: GBuf;
    if (hit.hit) {
        g.pos   = hit.pos;
        g.depth = hit.dist;
        g.nrm   = safeNormal(hit.pos, rd);
        g.hit   = 1.0;
        g.alb   = trapColor(hit.trap);
        g.trap  = calcAO(hit.pos, g.nrm);  // repurpose trap as AO storage
    } else {
        g.pos   = vec3f(0.0);
        g.depth = -1.0;
        g.nrm   = rd;
        g.hit   = 0.0;
        g.alb   = skyColor(rd);
        g.trap  = 1.0;  // no occlusion for sky
    }
    gb[idx] = g;
}
`;

// ---- Pass 2: Generate initial candidate (trace 1 bounce) ----
const CANDIDATE_WGSL = COMMON_WGSL + /* wgsl */`
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let px = gid.xy;
    if (!inBounds(px)) { return; }

    let idx = pxIdx(px);
    let frame = u32(u.camPos.w);
    let g = gb[idx];

    var r = emptyReservoir();

    if (g.hit > 0.5) {
        // Direct lighting
        let lDir = normalize(u.light.xyz - g.pos);
        let lDist = length(u.light.xyz - g.pos);
        let NdotL = max(dot(g.nrm, lDir), 0.0);
        var directLight = vec3f(0.0);

        // Shadow ray — bias scales with depth to avoid self-shadow on smooth areas
        let sBias = max(0.005, g.depth * 0.001);
        let shadowHit = march(g.pos + g.nrm * sBias, lDir, lDist, 128u);
        if (!shadowHit.hit) {
            directLight = u.light.w * NdotL / (lDist * lDist) * vec3f(1.0, 0.95, 0.85);
        }

        // Ambient
        let ambient = vec3f(0.03, 0.04, 0.06);

        // Trace one indirect bounce (uniform hemisphere, blue noise sampled)
        let xi = blueNoise2(px, frame, 10u);
        let bounceDir = sampleHemisphere(g.nrm, xi);
        // Scale normal bias with depth — smooth/distant surfaces need more offset
        // to avoid self-intersection from imprecise SDF
        let nrmBias = max(0.005, g.depth * 0.001);
        let bounceHit = march(g.pos + g.nrm * nrmBias, bounceDir, 10.0, 200u);

        var indirectRad = vec3f(0.0);
        var samplePos  = g.pos + bounceDir * 5.0;
        var sampleNrm  = -bounceDir;

        // Reject self-intersection: bounce must travel a minimum distance
        if (bounceHit.hit && bounceHit.dist > nrmBias * 2.0) {
            // Shade the bounce point (direct light only)
            let bNrm = calcNormal(bounceHit.pos);
            let bAlb = trapColor(bounceHit.trap);
            let bLDir = normalize(u.light.xyz - bounceHit.pos);
            let bLDist = length(u.light.xyz - bounceHit.pos);
            let bNdotL = max(dot(bNrm, bLDir), 0.0);

            let bShadow = march(bounceHit.pos + bNrm * 0.005, bLDir, bLDist, 96u);
            var bDirect = vec3f(0.0);
            if (!bShadow.hit) {
                bDirect = u.light.w * bNdotL / (bLDist * bLDist) * vec3f(1.0, 0.95, 0.85);
            }
            indirectRad = bAlb * (bDirect + ambient);
            samplePos = bounceHit.pos;
            sampleNrm = bNrm;
        } else {
            indirectRad = skyColor(bounceDir);
            sampleNrm = -bounceDir;
        }

        // Reservoir stores INCOMING indirect radiance (no primary albedo).
        // pHat = luminance only (direction-independent target function).
        // w = pHat / pdf where pdf = 1/(2π) for uniform hemisphere.
        let pHat = max(luminance(indirectRad), 1e-6);
        let w = 2.0 * PI * pHat;
        let xi3 = rand(px, frame, 20u);
        updateReservoir(&r, samplePos, sampleNrm, indirectRad, w, xi3);
        finalizeReservoir(&r);
    }

    resCur[idx] = r;
}
`;

// ---- Pass 3: Temporal reuse ----
const TEMPORAL_WGSL = COMMON_WGSL + /* wgsl */`
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let px = gid.xy;
    if (!inBounds(px)) { return; }

    let idx = pxIdx(px);
    let frame = u32(u.camPos.w);
    let g = gb[idx];

    if (g.hit < 0.5 || u.reso.z < 0.5) { return; } // skip if miss or ReSTIR off

    var r = resCur[idx];

    // Reproject to previous frame screen space
    let clipPrev = u.vpPrev * vec4f(g.pos, 1.0);
    let ndcPrev = clipPrev.xy / clipPrev.w;
    let uvPrev = ndcPrev * vec2f(0.5, -0.5) + 0.5;
    let pxPrev = vec2u(vec2f(u.reso.x, u.reso.y) * uvPrev);

    if (inBounds(pxPrev)) {
        let prevIdx = pxIdx(pxPrev);
        let gPrev = gb[prevIdx]; // NOTE: g-buffer is current frame, but reservoir is previous
        let rPrev = resPrev[prevIdx];

        // Geometry test — only merge if similar depth & normal
        let depthOk = abs(g.depth - gPrev.depth) < g.depth * 0.1;
        let normalOk = dot(g.nrm, gPrev.nrm) > 0.9;

        if (rPrev.M > 0.0 && depthOk && normalOk) {
            // Clamp temporal history to prevent stale samples
            var rClamped = rPrev;
            rClamped.M = min(rClamped.M, 20.0 * r.M);

            // Reject if sample is behind current surface
            let dirToSample = normalize(rClamped.sPos - g.pos);
            if (dot(g.nrm, dirToSample) > 0.01) {
                let pHat = max(luminance(rClamped.sRad), 1e-6);
                let w = pHat * rClamped.W * rClamped.M;
                let xi = rand(px, frame, 30u);
                updateReservoir(&r, rClamped.sPos, rClamped.sNrm, rClamped.sRad, w, xi);
                finalizeReservoir(&r);
            }
        }
    }

    resCur[idx] = r;
}
`;

// ---- Pass 4: Spatial reuse ----
const SPATIAL_WGSL = COMMON_WGSL + /* wgsl */`
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let px = gid.xy;
    if (!inBounds(px)) { return; }

    let idx = pxIdx(px);
    let frame = u32(u.camPos.w);
    let g = gb[idx];

    if (g.hit < 0.5 || u.reso.z < 0.5) { return; } // skip if miss or ReSTIR off

    var r = resCur[idx];

    // Sample 5 neighbors within 30px radius
    let NEIGHBORS: u32 = 5u;
    let RADIUS: f32 = 30.0;

    for (var i: u32 = 0u; i < NEIGHBORS; i++) {
        let xi = rand2(px, frame, 40u + i * 2u);
        let angle = xi.x * 6.283185;
        let radius = sqrt(xi.y) * RADIUS;
        let offset = vec2i(vec2f(cos(angle), sin(angle)) * radius);
        let neighbor = vec2u(vec2i(px) + offset);

        if (!inBounds(neighbor)) { continue; }
        let nIdx = pxIdx(neighbor);
        let gN = gb[nIdx];

        // Geometry rejection
        if (gN.hit < 0.5) { continue; }
        if (abs(g.depth - gN.depth) > g.depth * 0.1) { continue; }
        if (dot(g.nrm, gN.nrm) < 0.906) { continue; } // ~25 degrees

        let rN = resPrev[nIdx]; // read from snapshot (pre-spatial, avoids race)
        if (rN.M < 1.0) { continue; }

        // Reject if sample is behind current surface
        let dirToSample = normalize(rN.sPos - g.pos);
        let cosAtPixel = dot(g.nrm, dirToSample);
        if (cosAtPixel < 0.01) { continue; }

        // Jacobian correction for solid angle change between neighbor and current pixel.
        // |J| = (cos_at_sample_from_current / cos_at_sample_from_neighbor)
        //      * (dist_neighbor_to_sample² / dist_current_to_sample²)
        let dirFromNeighbor = normalize(rN.sPos - gN.pos);
        let cosAtSampleFromNeighbor = max(abs(dot(rN.sNrm, dirFromNeighbor)), 0.001);
        let cosAtSampleFromCurrent  = max(abs(dot(rN.sNrm, dirToSample)), 0.001);
        let distNeighbor = length(rN.sPos - gN.pos);
        let distCurrent  = length(rN.sPos - g.pos);
        let jacobian = clamp(
            (cosAtSampleFromCurrent / cosAtSampleFromNeighbor)
            * (distNeighbor * distNeighbor) / max(distCurrent * distCurrent, 1e-8),
            0.0, 10.0  // clamp to prevent extreme values
        );

        let pHat = max(luminance(rN.sRad), 1e-6);
        let w = pHat * rN.W * rN.M * jacobian;
        let xiMerge = rand(px, frame, 60u + i);
        updateReservoir(&r, rN.sPos, rN.sNrm, rN.sRad, w, xiMerge);
    }

    finalizeReservoir(&r);
    resCur[idx] = r;
}
`;

// ---- Pass 5: Final shade + accumulate ----
const SHADE_WGSL = COMMON_WGSL + /* wgsl */`
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let px = gid.xy;
    if (!inBounds(px)) { return; }

    let idx = pxIdx(px);
    let frame = u32(u.camPos.w);
    let g = gb[idx];

    var color: vec3f;

    if (g.hit > 0.5) {
        // Direct lighting
        let lDir = normalize(u.light.xyz - g.pos);
        let lDist = length(u.light.xyz - g.pos);
        let NdotL = max(dot(g.nrm, lDir), 0.0);

        let shadeBias = max(0.005, g.depth * 0.001);
        let shadowHit = march(g.pos + g.nrm * shadeBias, lDir, lDist, 128u);
        var directLight = vec3f(0.0);
        if (!shadowHit.hit) {
            directLight = u.light.w * NdotL / (lDist * lDist) * vec3f(1.0, 0.95, 0.85);
        }

        let ambient = vec3f(0.03, 0.04, 0.06);
        let ao = g.trap; // AO stored in trap field by G-buffer pass
        let directContrib = g.alb * (directLight + ambient * ao);

        // Indirect from reservoir — modulated by AO to darken cavities
        let r = resCur[idx];
        var indirectContrib = vec3f(0.0);

        if (u.reso.z > 0.5 && r.M > 0.0) {
            // ReSTIR indirect: Lambertian BRDF = albedo/π, integrand = BRDF * L * cos
            // W is the RIS contribution weight (≈ 1/pHat * wSum/M)
            let dirToSample = normalize(r.sPos - g.pos);
            let cosAtSurface = max(dot(g.nrm, dirToSample), 0.0);
            indirectContrib = (g.alb / PI) * r.sRad * cosAtSurface * r.W * ao;
        } else if (u.reso.z < 0.5) {
            // Standard path trace (uniform hemisphere, blue noise sampled)
            // MC estimator: f(ω)/pdf = (albedo/π) * L * cos(θ) / (1/2π) = 2 * albedo * L * cos
            let xi = blueNoise2(px, frame, 70u);
            let bounceDir = sampleHemisphere(g.nrm, xi);
            let cosTheta = max(dot(g.nrm, bounceDir), 0.0);
            let ptBias = max(0.005, g.depth * 0.001);
            let bounceHit = march(g.pos + g.nrm * ptBias, bounceDir, 10.0, 200u);
            if (bounceHit.hit && bounceHit.dist > ptBias * 2.0) {
                let bNrm = calcNormal(bounceHit.pos);
                let bAlb = trapColor(bounceHit.trap);
                let bLDir = normalize(u.light.xyz - bounceHit.pos);
                let bLDist = length(u.light.xyz - bounceHit.pos);
                let bNdotL = max(dot(bNrm, bLDir), 0.0);
                let bShadow = march(bounceHit.pos + bNrm * ptBias, bLDir, bLDist, 96u);
                if (!bShadow.hit) {
                    let bRad = bAlb * u.light.w * bNdotL / (bLDist * bLDist) * vec3f(1.0, 0.95, 0.85);
                    indirectContrib = 2.0 * g.alb * bRad * cosTheta * ao;
                } else {
                    indirectContrib = 2.0 * g.alb * bAlb * ambient * cosTheta * ao;
                }
            } else if (!bounceHit.hit) {
                indirectContrib = 2.0 * g.alb * skyColor(bounceDir) * cosTheta * ao;
            }
        }

        color = directContrib + indirectContrib;
    } else {
        color = g.alb; // sky
    }

    // Accumulate (running average)
    let sampleIdx = u.reso.w;
    if (sampleIdx < 1.0) {
        accum[idx] = vec4f(color, 1.0);
    } else {
        let prev = accum[idx];
        let n = prev.w + 1.0;
        accum[idx] = vec4f(prev.xyz + (color - prev.xyz) / n, n);
    }
}
`;

// ---- Display: fullscreen triangle (vertex + fragment) ----
const DISPLAY_VS = /* wgsl */`
@vertex
fn main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
    // Full-screen triangle (3 vertices, no vertex buffer)
    let x = f32(i32(vi) / 2) * 4.0 - 1.0;
    let y = f32(i32(vi) % 2) * 4.0 - 1.0;
    return vec4f(x, y, 0.0, 1.0);
}
`;

const DISPLAY_FS = /* wgsl */`
@group(0) @binding(0) var<storage, read> accum: array<vec4f>;
@group(0) @binding(1) var<uniform> dispUni: vec4f; // xy = resolution

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let px = vec2u(fragCoord.xy);
    let idx = px.y * u32(dispUni.x) + px.x;
    let a = accum[idx];
    var col = a.xyz;

    // Tonemap (ACES approximation)
    col = col / (col + vec3f(1.0));
    // Gamma
    col = pow(col, vec3f(1.0 / 2.2));

    return vec4f(col, 1.0);
}
`;


// ================================================================
// Orbit Camera
// ================================================================
class OrbitCamera {
    constructor() {
        this.theta = -0.42;   // azimuth
        this.phi = -0.18;     // elevation
        this.radius = 3.8;
        this.target = [0, 0, 0];
        this.fov = 40;
        this.dirty = true;

        this.viewMat = new Float32Array(16);
        this.projMat = new Float32Array(16);
        this.vpMat = new Float32Array(16);
        this.vpInvMat = new Float32Array(16);
        this.prevVpMat = new Float32Array(16);
        this.position = [0, 0, 0];

        this._updateMatrices(1);
        this.prevVpMat.set(this.vpMat); // first frame: no motion
    }

    rotate(dx, dy) {
        this.theta += dx * 0.005;
        this.phi = Math.max(-1.5, Math.min(1.5, this.phi + dy * 0.005));
        this.dirty = true;
    }

    zoom(delta) {
        this.radius *= 1 - delta * 0.001;
        this.radius = Math.max(0.5, Math.min(20, this.radius));
        this.dirty = true;
    }

    update(aspect) {
        if (!this.dirty) return false;
        this.prevVpMat.set(this.vpMat);
        this._updateMatrices(aspect);
        this.dirty = false;
        return true; // camera moved
    }

    _updateMatrices(aspect) {
        const cp = Math.cos(this.phi), sp = Math.sin(this.phi);
        const ct = Math.cos(this.theta), st = Math.sin(this.theta);
        const eye = [
            this.target[0] + this.radius * cp * st,
            this.target[1] + this.radius * sp,
            this.target[2] + this.radius * cp * ct
        ];
        this.position = eye;

        lookAt(this.viewMat, eye, this.target, [0, 1, 0]);
        perspective(this.projMat, this.fov * Math.PI / 180, aspect, 0.01, 100);
        mat4Mul(this.vpMat, this.projMat, this.viewMat);
        mat4Inv(this.vpInvMat, this.vpMat);
    }
}

// ---- Minimal mat4 math ----
function lookAt(out, eye, center, up) {
    const zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz);
    const fz = [zx * len, zy * len, zz * len];
    const xx = up[1] * fz[2] - up[2] * fz[1], xy = up[2] * fz[0] - up[0] * fz[2], xz = up[0] * fz[1] - up[1] * fz[0];
    len = 1 / Math.sqrt(xx * xx + xy * xy + xz * xz);
    const fx = [xx * len, xy * len, xz * len];
    const fy = [fx[1] * fz[2] - fx[2] * fz[1], fx[2] * fz[0] - fx[0] * fz[2], fx[0] * fz[1] - fx[1] * fz[0]];

    out[0] = fx[0]; out[1] = fy[0]; out[2] = fz[0]; out[3] = 0;
    out[4] = fx[1]; out[5] = fy[1]; out[6] = fz[1]; out[7] = 0;
    out[8] = fx[2]; out[9] = fy[2]; out[10] = fz[2]; out[11] = 0;
    out[12] = -(fx[0]*eye[0]+fx[1]*eye[1]+fx[2]*eye[2]);
    out[13] = -(fy[0]*eye[0]+fy[1]*eye[1]+fy[2]*eye[2]);
    out[14] = -(fz[0]*eye[0]+fz[1]*eye[1]+fz[2]*eye[2]);
    out[15] = 1;
}

function perspective(out, fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = far * nf;
    out[11] = -1;
    out[14] = far * near * nf;
}

function mat4Mul(out, a, b) {
    const t = new Float32Array(16);
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
            t[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    out.set(t);
}

function mat4Inv(out, m) {
    // Gauss-Jordan 4x4 inverse
    const a = Array.from(m);
    const b = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    for (let col = 0; col < 4; col++) {
        let maxR = col, maxV = Math.abs(a[col * 4 + col]);
        for (let r = col + 1; r < 4; r++) {
            const v = Math.abs(a[col * 4 + r]);
            if (v > maxV) { maxV = v; maxR = r; }
        }
        if (maxR !== col) {
            for (let c = 0; c < 4; c++) {
                [a[c * 4 + col], a[c * 4 + maxR]] = [a[c * 4 + maxR], a[c * 4 + col]];
                [b[c * 4 + col], b[c * 4 + maxR]] = [b[c * 4 + maxR], b[c * 4 + col]];
            }
        }
        const pivot = a[col * 4 + col];
        for (let c = 0; c < 4; c++) { a[c * 4 + col] /= pivot; b[c * 4 + col] /= pivot; }
        for (let r = 0; r < 4; r++) {
            if (r === col) continue;
            const f = a[col * 4 + r];
            for (let c = 0; c < 4; c++) { a[c * 4 + r] -= f * a[c * 4 + col]; b[c * 4 + r] -= f * b[c * 4 + col]; }
        }
    }
    for (let i = 0; i < 16; i++) out[i] = b[i];
}


// ================================================================
// WebGPU Renderer
// ================================================================
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.frame = 0;
        this.samples = 0;
        this.restirEnabled = true;
        this.dofEnabled = false;
        this.dofStrength = 0.03;
        this.dofFocus = 3.8;
        this.fractalType = 0; // 0 = Claude, 1 = Mandelbulb
        this.camera = new OrbitCamera();
    }

    async init() {
        if (!navigator.gpu) throw new Error('WebGPU not available');
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter) throw new Error('No GPU adapter found');
        this.device = await adapter.requestDevice({
            requiredLimits: {
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                maxBufferSize: adapter.limits.maxBufferSize,
            }
        });

        this.ctx = this.canvas.getContext('webgpu');
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.ctx.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });

        // Load blue noise texture from GMT's public assets
        await this._loadBlueNoise();

        this._resize();
        this._createPipelines();
        this._createBuffers();

        window.addEventListener('resize', () => {
            this._resize();
            this._createBuffers();
            this._createBindGroups();
            this.samples = 0;
        });
    }

    _resize() {
        const dpr = Math.min(window.devicePixelRatio, 1.5); // cap DPR for performance
        this.width = Math.floor(this.canvas.clientWidth * dpr);
        this.height = Math.floor(this.canvas.clientHeight * dpr);
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.pixelCount = this.width * this.height;
    }

    async _loadBlueNoise() {
        const dev = this.device;
        // Try loading from GMT's public dir, fall back to generating procedural
        let imageData;
        try {
            // Try multiple paths (depends on how server is configured)
            let resp = await fetch('../../public/blueNoise.png').catch(() => null);
            if (!resp || !resp.ok) resp = await fetch('/blueNoise.png').catch(() => null);
            if (!resp || !resp.ok) resp = await fetch('./blueNoise.png').catch(() => null);
            if (!resp || !resp.ok) throw new Error('Blue noise PNG not found');
            const blob = await resp.blob();
            const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
            const oc = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx2d = oc.getContext('2d');
            ctx2d.drawImage(bitmap, 0, 0);
            imageData = ctx2d.getImageData(0, 0, bitmap.width, bitmap.height);
            bitmap.close();
            console.log(`[BlueNoise] Loaded ${imageData.width}x${imageData.height} from blueNoise.png`);
        } catch (e) {
            console.warn('[BlueNoise] PNG not found, generating procedural fallback:', e);
            const size = 128;
            const data = new Uint8Array(size * size * 4);
            for (let i = 0; i < data.length; i++) data[i] = Math.floor(Math.random() * 255);
            imageData = { data, width: size, height: size };
        }

        const w = imageData.width, h = imageData.height;
        this.bnTexture = dev.createTexture({
            size: [w, h],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        dev.queue.writeTexture(
            { texture: this.bnTexture },
            imageData.data,
            { bytesPerRow: w * 4 },
            [w, h]
        );

        this.bnSampler = dev.createSampler({
            minFilter: 'nearest',
            magFilter: 'nearest',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
        });
    }

    _createBuffers() {
        const dev = this.device;
        const pc = this.pixelCount;

        // Uniform buffer: 7 vec4 = 2 mat4 (128 bytes) + 5 vec4 (80 bytes) = 208 bytes → align to 256
        this.uniformBuf = dev.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

        // G-buffer: GBuf struct = 12 fields (3+1+3+1+3+1 = 12 floats = 48 bytes)
        this.gbufBuf = dev.createBuffer({ size: pc * 48, usage: GPUBufferUsage.STORAGE });

        // Reservoirs: Reservoir struct = 12 floats = 48 bytes
        this.resCurBuf = dev.createBuffer({ size: pc * 48, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        this.resPrevBuf = dev.createBuffer({ size: pc * 48, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });

        // Accumulation: vec4f = 16 bytes
        this.accumBuf = dev.createBuffer({ size: pc * 16, usage: GPUBufferUsage.STORAGE });

        // Display uniform (resolution vec4)
        this.dispUniBuf = dev.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

        this._createBindGroups();
    }

    _createBindGroups() {
        // Compute bind group
        this.computeBG = this.device.createBindGroup({
            layout: this.computeBGL,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuf } },
                { binding: 1, resource: { buffer: this.gbufBuf } },
                { binding: 2, resource: { buffer: this.resCurBuf } },
                { binding: 3, resource: { buffer: this.resPrevBuf } },
                { binding: 4, resource: { buffer: this.accumBuf } },
                { binding: 5, resource: this.bnTexture.createView() },
                { binding: 6, resource: this.bnSampler },
            ]
        });

        // Display bind group
        this.displayBG = this.device.createBindGroup({
            layout: this.displayBGL,
            entries: [
                { binding: 0, resource: { buffer: this.accumBuf } },
                { binding: 1, resource: { buffer: this.dispUniBuf } },
            ]
        });
    }

    _createPipelines() {
        const dev = this.device;

        // Shared compute bind group layout (buffers + blue noise texture)
        this.computeBGL = dev.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 5, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
                { binding: 6, visibility: GPUShaderStage.COMPUTE, sampler: { type: 'filtering' } },
            ]
        });

        const computeLayout = dev.createPipelineLayout({ bindGroupLayouts: [this.computeBGL] });

        const makeCompute = (code, label) => dev.createComputePipeline({
            layout: computeLayout,
            compute: { module: dev.createShaderModule({ code }), entryPoint: 'main' },
            label,
        });

        this.gbufferPipe   = makeCompute(GBUFFER_WGSL, 'gbuffer');
        this.candidatePipe = makeCompute(CANDIDATE_WGSL, 'candidate');
        this.temporalPipe  = makeCompute(TEMPORAL_WGSL, 'temporal');
        this.spatialPipe   = makeCompute(SPATIAL_WGSL, 'spatial');
        this.shadePipe     = makeCompute(SHADE_WGSL, 'shade');

        // Display render pipeline
        this.displayBGL = dev.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
            ]
        });

        this.displayPipe = dev.createRenderPipeline({
            layout: dev.createPipelineLayout({ bindGroupLayouts: [this.displayBGL] }),
            vertex: { module: dev.createShaderModule({ code: DISPLAY_VS }), entryPoint: 'main' },
            fragment: {
                module: dev.createShaderModule({ code: DISPLAY_FS }), entryPoint: 'main',
                targets: [{ format: this.format }]
            },
            primitive: { topology: 'triangle-list' },
            label: 'display',
        });
    }

    _uploadUniforms() {
        const data = new Float32Array(64); // 256 bytes = 64 floats

        // vpInv: 16 floats at offset 0
        data.set(this.camera.vpInvMat, 0);

        // vpPrev: 16 floats at offset 16
        data.set(this.camera.prevVpMat, 16);

        // camPos + frame: offset 32
        data[32] = this.camera.position[0];
        data[33] = this.camera.position[1];
        data[34] = this.camera.position[2];
        data[35] = this.frame;

        // resolution + flags: offset 36
        data[36] = this.width;
        data[37] = this.height;
        data[38] = this.restirEnabled ? 1 : 0;
        data[39] = this.samples;

        // light: offset 40
        data[40] = -2.0;  // light X
        data[41] = 4.0;   // light Y
        data[42] = 3.5;   // light Z
        data[43] = 8.0;   // light intensity

        // fractal params: offset 44
        if (this.fractalType === 0) {
            // Claude fractal
            data[44] = 2.0;   // scale (paramA)
            data[45] = 0.61;  // harmonic (paramB)
            data[46] = 0.25;  // minR2 (paramC)
            data[47] = 1.0;   // fixR2 (paramD)
        } else {
            // Mandelbulb
            data[44] = 8.0;   // power
            data[45] = 0.0;
            data[46] = 0.0;
            data[47] = 0.0;
        }

        // fractal offset: offset 48
        data[48] = this.fractalType === 0 ? 1.0 : 0.0;   // offset X
        data[49] = this.fractalType === 0 ? 1.0 : 0.0;   // offset Y
        data[50] = this.fractalType === 0 ? 1.0 : 0.0;   // offset Z
        data[51] = this.fractalType;  // fractal type selector

        // DOF: offset 52
        data[52] = this.dofEnabled ? this.dofStrength : 0.0;
        data[53] = this.dofFocus;
        data[54] = 0.0;
        data[55] = 0.0;

        this.device.queue.writeBuffer(this.uniformBuf, 0, data);

        // Display uniforms
        const disp = new Float32Array([this.width, this.height, 0, 0]);
        this.device.queue.writeBuffer(this.dispUniBuf, 0, disp);
    }

    renderFrame() {
        const aspect = this.width / this.height;
        const cameraMoved = this.camera.update(aspect);

        if (cameraMoved) {
            this.samples = 0; // reset accumulation on camera move
            this.dofFocus = this.camera.radius; // auto-focus on target
        }

        this._uploadUniforms();

        const wgX = Math.ceil(this.width / 8);
        const wgY = Math.ceil(this.height / 8);

        const encoder = this.device.createCommandEncoder();

        // Pass 1: G-buffer
        const gbPass = encoder.beginComputePass();
        gbPass.setPipeline(this.gbufferPipe);
        gbPass.setBindGroup(0, this.computeBG);
        gbPass.dispatchWorkgroups(wgX, wgY);
        gbPass.end();

        // Pass 2: Initial candidate
        const candPass = encoder.beginComputePass();
        candPass.setPipeline(this.candidatePipe);
        candPass.setBindGroup(0, this.computeBG);
        candPass.dispatchWorkgroups(wgX, wgY);
        candPass.end();

        if (this.restirEnabled) {
            // Pass 3: Temporal reuse
            const tempPass = encoder.beginComputePass();
            tempPass.setPipeline(this.temporalPipe);
            tempPass.setBindGroup(0, this.computeBG);
            tempPass.dispatchWorkgroups(wgX, wgY);
            tempPass.end();

            // Snapshot resCur → resPrev so spatial reads a consistent pre-merge state
            // (without this, workgroup execution order causes read/write races → banding)
            encoder.copyBufferToBuffer(this.resCurBuf, 0, this.resPrevBuf, 0, this.pixelCount * 48);

            // Pass 4: Spatial reuse (reads neighbors from resPrev snapshot, writes to resCur)
            const spatPass = encoder.beginComputePass();
            spatPass.setPipeline(this.spatialPipe);
            spatPass.setBindGroup(0, this.computeBG);
            spatPass.dispatchWorkgroups(wgX, wgY);
            spatPass.end();
        }

        // Pass 5: Shade + accumulate
        const shadePass = encoder.beginComputePass();
        shadePass.setPipeline(this.shadePipe);
        shadePass.setBindGroup(0, this.computeBG);
        shadePass.dispatchWorkgroups(wgX, wgY);
        shadePass.end();

        // Pass 6: Display
        const tex = this.ctx.getCurrentTexture();
        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                view: tex.createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
            }]
        });
        renderPass.setPipeline(this.displayPipe);
        renderPass.setBindGroup(0, this.displayBG);
        renderPass.draw(3); // fullscreen triangle
        renderPass.end();

        this.device.queue.submit([encoder.finish()]);

        // Swap reservoirs for next frame (copy cur → prev)
        const swapEncoder = this.device.createCommandEncoder();
        swapEncoder.copyBufferToBuffer(this.resCurBuf, 0, this.resPrevBuf, 0, this.pixelCount * 48);
        this.device.queue.submit([swapEncoder.finish()]);

        this.frame++;
        this.samples++;
    }

    toggleReSTIR() {
        this.restirEnabled = !this.restirEnabled;
        this.samples = 0; // reset accumulation for fair comparison
    }

    toggleDOF() {
        this.dofEnabled = !this.dofEnabled;
        this.samples = 0;
    }

    toggleFractal() {
        this.fractalType = this.fractalType === 0 ? 1 : 0;
        this.samples = 0;
        // Reset camera distance — Mandelbulb is smaller than Claude
        this.camera.radius = this.fractalType === 1 ? 2.5 : 3.8;
        this.camera.dirty = true;
    }

    resetCamera() {
        this.camera.theta = -0.42;
        this.camera.phi = -0.18;
        this.camera.radius = 3.8;
        this.camera.dirty = true;
        this.samples = 0;
    }
}


// ================================================================
// Main entry point
// ================================================================
async function main() {
    const canvas = document.getElementById('canvas');
    const info = document.getElementById('hud');
    const error = document.getElementById('error');
    const modeLabel = document.getElementById('mode-label');
    const sampleCount = document.getElementById('sample-count');
    const fpsLabel = document.getElementById('fps');
    const resLabel = document.getElementById('res-label');

    const renderer = new Renderer(canvas);

    try {
        await renderer.init();
    } catch (e) {
        error.style.display = 'block';
        error.querySelector('p').textContent = e.message;
        info.style.display = 'none';
        console.error(e);
        return;
    }

    resLabel.textContent = `${renderer.width}x${renderer.height}`;

    // ---- Mouse controls ----
    let dragging = false;
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) dragging = true; });
    window.addEventListener('mouseup', () => { dragging = false; });
    canvas.addEventListener('mousemove', (e) => {
        if (dragging) {
            renderer.camera.rotate(e.movementX, e.movementY);
        }
    });
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        renderer.camera.zoom(e.deltaY);
    }, { passive: false });

    // Touch controls
    let lastTouch = null;
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouch) {
            const dx = e.touches[0].clientX - lastTouch.x;
            const dy = e.touches[0].clientY - lastTouch.y;
            renderer.camera.rotate(dx, dy);
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: false });
    canvas.addEventListener('touchend', () => { lastTouch = null; });

    // Keyboard
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            renderer.toggleReSTIR();
            modeLabel.textContent = renderer.restirEnabled ? 'ReSTIR GI' : 'Standard PT';
            modeLabel.className = renderer.restirEnabled ? 'on' : 'off';
        }
        if (e.code === 'KeyR') {
            renderer.resetCamera();
        }
        if (e.code === 'KeyD') {
            renderer.toggleDOF();
            document.getElementById('dof-label').textContent = renderer.dofEnabled ? 'ON' : 'OFF';
            document.getElementById('dof-label').className = renderer.dofEnabled ? 'on' : 'off';
        }
        if (e.code === 'KeyF') {
            renderer.toggleFractal();
            const names = ['Claude', 'Mandelbulb'];
            document.getElementById('fractal-label').textContent = names[renderer.fractalType];
        }
    });

    // ---- Render loop ----
    let lastTime = performance.now();
    function loop() {
        const now = performance.now();
        renderer.renderFrame();

        // Update HUD
        sampleCount.textContent = renderer.samples;
        fpsLabel.textContent = (performance.now() - now).toFixed(1);

        lastTime = now;
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

main();
