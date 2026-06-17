/**
 * Reference-orbit builder for the deep-zoom path.
 *
 * Iterates `Z_{n+1} = Z_n^d + C` in BigInt fixed-point precision,
 * sampling each Z to f32 for upload as a texture.
 *
 * Mode-specific starting state:
 *   Mandelbrot: z₀ = 0,           c = (centerX, centerY).
 *   Julia:      z₀ = (centerX, centerY), c = (juliaCx, juliaCy).
 *
 * The perturbation math is symmetric across kinds — only the initial
 * (z, c) pair differs. The shader feeds:
 *   Mandelbrot: dz_0 = 0, dc = pixel position − ref centre.
 *   Julia:      dz_0 = pixel position − ref z₀, dc = 0.
 *
 * Output layout: one RGBA32F texel per iteration, channels = (Z.re,
 * Z.im, |Z|², 0). |Z|² is precomputed because the rebase rule in the
 * shader needs it once per step and computing it from the .rg samples
 * costs an extra mul-add per pixel-iter.
 *
 * ── Auto-reference (non-escaping centre search) ──────────────────────────────
 * When the naïve view-centre reference orbit ESCAPES early (the centre is an
 * exterior point) but the view still contains interior / minibrot structure,
 * the LA acceleration tables built from that short orbit are an unreliable
 * accelerator for the interior pixels → a coherent wrong-coloured "square"
 * block (the L∞ region where LA applies). Serious renderers fix this upstream
 * by choosing a better reference rather than the raw view centre
 * (FractalShark detects periodicity; Kalles Fraktaler / Imagina search the
 * view for a deeper point). We do the same: when the centre escapes, probe a
 * grid of candidate centres across the view and rebuild the orbit at the one
 * with the longest (ideally non-escaping) orbit. The kernel already supports a
 * reference centre ≠ view centre via `uDeepCenterOffset` (the DD subtraction in
 * DeepZoomController.bindUniforms), so this is a worker-only change — the shared
 * GLSL kernel is untouched, and fluid-toy benefits from the same fix.
 * @see docs/adr/0065-deep-zoom-auto-reference-glitch-fix.md
 */

import { HPComplex, choosePrecisionBits } from './HighPrecComplex';
import { ddAddF64, ddSub } from './dd';
import { detectPeriod, newtonNucleus } from './nucleus';

export interface RefOrbitInput {
    /** Reference centre, real part. For Mandelbrot this is `c`. For
     *  Julia it's `z₀` (the chosen reference iterate point). */
    centerX: number;
    /** Reference centre, imaginary part. */
    centerY: number;
    /** Sub-f64 residual paired with `centerX` (Dekker double-double low
     *  word). At zoom < ~1e-15, pan deltas underflow f64 ulp at unit-
     *  magnitude centres; the (hi, lo) pair recovers ~106 bits of
     *  effective precision before BigInt math kicks in. Optional —
     *  defaults to 0 for orbit-only callers without DD wiring. */
    centerLowX?: number;
    /** Sub-f64 residual paired with `centerY`. */
    centerLowY?: number;
    /** Linear zoom level (smaller = deeper). Drives precision selection. */
    zoom: number;
    /** Maximum iterations to compute. Orbit may terminate early on escape. */
    maxIter: number;
    /** Power d in z → z^d + c. Default 2 (classic Mandelbrot/Julia).
     *  Integer values 2..8 exposed in the UI. */
    power?: number;
    /** Fractal kind. Mandelbrot = c-parameterised, Julia = c-fixed.
     *  Defaults to mandelbrot if omitted. */
    kind?: 'mandelbrot' | 'julia';
    /** Julia constant — required when kind='julia', ignored otherwise. */
    juliaCx?: number;
    juliaCy?: number;
    /** Viewport aspect ratio (width / height). Used to size the auto-reference
     *  search region to the actual view (half-width = aspect·zoom). Default 1.5. */
    aspect?: number;
    /** Disable the auto-reference search (always build at the exact view
     *  centre). Default false — the search runs for Mandelbrot when the centre
     *  escapes. Tests / callers that need the literal centre can opt out. */
    disableAutoReference?: boolean;
    /** Disable the minibrot-nucleus (periodic) reference search (ADR-0066),
     *  falling back to the non-periodic relocation/long-orbit path. Default
     *  false. For A/B and the periodic-vs-non-periodic regression smoke. */
    disableNucleus?: boolean;
}

export interface RefOrbitOutput {
    /** RGBA32F-packed texel data: [Z.re, Z.im, |Z|², 0] per iteration. */
    orbit: Float32Array;
    /** Number of iterations actually computed (≤ maxIter; less if Z escaped early). */
    length: number;
    /** True if Z escaped (|Z|² > 4) before maxIter. The reference centre is "outside" the set. */
    escaped: boolean;
    /** Working precision in bits, chosen by `choosePrecisionBits`. */
    precisionBits: number;
    /** The reference centre actually used (hi word). Equals the input centre
     *  unless the auto-reference search relocated it to a deeper point. The
     *  caller MUST pass this (not the input centre) to
     *  DeepZoomController.setReferenceOrbit so the kernel's DD centre-offset
     *  stays aligned. */
    refCenterX: number;
    refCenterY: number;
    /** Sub-f64 residual (lo word) paired with the used reference centre. */
    refCenterLowX: number;
    refCenterLowY: number;
    /** True when the auto-reference search relocated the centre. Diagnostics. */
    relocated: boolean;
    /** True when LA acceleration would be UNRELIABLE for this view and the worker
     *  should skip the LA-table build (kernel falls back to pure PO, which is
     *  correct just slower). Set when the reference is INTERIOR (non-escaping)
     *  but the surrounding view is mostly EXTERIOR — an interior reference
     *  mis-accelerates the exterior pixels in the L∞ region → a black square.
     *  Genuine minibrot dives (interior-dominated view) keep LA. @see docs/adr/0065 */
    laUnsafe: boolean;
    /** Period of the minibrot-nucleus reference, or 0 when no periodic
     *  reference was found (the orbit is the non-periodic fallback). When > 0
     *  the orbit is exactly ONE period long (orbit[0] = 0 = orbit[period]) and
     *  the kernel wraps the reference index `ref %= period` instead of rebasing
     *  past a non-periodic end — an exact, cheap, canonical deep-zoom
     *  reference. @see docs/adr/0066 */
    period: number;
}

const ESCAPE_RADIUS_SQ = 4;

/** Coarse grid resolution for the auto-reference search (points per axis). */
const SEARCH_GRID = 9;
/** Local refine grid resolution (points per axis) — a second pass at finer
 *  spacing around the best coarse candidate to better localise the deepest
 *  point (the boundary is fractal; the coarse grid only approximates it). */
const REFINE_GRID = 5;
/** Number of refine passes; each halves the spacing around the running best. */
const REFINE_PASSES = 2;
/** Relocate when the best candidate's orbit is at least this much longer than
 *  the centre's. The per-pixel iteration cap is the reference orbit length, so
 *  if the reference escapes BEFORE the view's latest-escaping pixels, those
 *  pixels get cut off to interior (black) — and a hair of pan shifts where the
 *  centre escapes, popping the black regions. Relocating to the deepest point
 *  in the view makes the reference outlast every pixel AND stabilises the cap
 *  across tiny pans. A modest margin (5% or 64 iters) avoids churn while still
 *  engaging readily. */
const RELOCATE_MIN_RATIO = 1.05;
const RELOCATE_MIN_ABS = 64;

// ── Minibrot-nucleus reference (ADR-0066) ───────────────────────────────────
/** Cap on period detection / Newton work. Detection early-returns at the
 *  period (cheap when a nucleus exists); this only bounds the cost of views
 *  with NO nucleus within reach, and the Newton refinement (period × steps HP
 *  iterations). Periods above this fall back to the non-periodic orbit. */
const NUCLEUS_MAX_PERIOD = 20000;
/** Only adopt the nucleus when its single period is meaningfully shorter than
 *  the non-periodic orbit would be — that's the whole win (cheap build + LA,
 *  exact wrap). At ≥ this ratio the orbit isn't shorter enough to bother. */
const NUCLEUS_MAX_RATIO = 0.9;
/** Only search for a nucleus once the view is genuinely deep. At shallow zoom
 *  the view spans low-period features so the atom-domain test trivially fires
 *  (the whole set is "period 1"), and the orbit is short & cheap anyway — the
 *  periodic reference only pays off at depth. */
const NUCLEUS_MIN_ZOOM = 1e-6;

/**
 * Build a reference orbit for a single Mandelbrot/Julia centre, storing each
 * sampled Z (re, im, |Z|²) into a freshly-allocated RGBA32F-packed array.
 * Pure helper — no auto-reference logic.
 */
const buildOrbitAt = (
    z0: HPComplex,
    c: HPComplex,
    power: number,
    maxIter: number,
): { orbit: Float32Array; length: number; escaped: boolean } => {
    let z = z0;
    const out = new Float32Array(maxIter * 4);
    let i = 0;
    let escaped = false;

    for (; i < maxIter; i++) {
        const [re, im] = z.toFloat32Pair();
        const norm2 = re * re + im * im;
        out[i * 4 + 0] = re;
        out[i * 4 + 1] = im;
        out[i * 4 + 2] = norm2;
        out[i * 4 + 3] = 0;

        z = (power === 2 ? z.sqr() : z.pow(power)).add(c);
        const [reN, imN] = z.toFloat32Pair();
        const norm2N = reN * reN + imN * imN;

        if (norm2N > ESCAPE_RADIUS_SQ) {
            const j = i + 1;
            out[j * 4 + 0] = reN;
            out[j * 4 + 1] = imN;
            out[j * 4 + 2] = norm2N;
            out[j * 4 + 3] = 0;
            escaped = true;
            i = j + 1;
            break;
        }
    }

    return { orbit: out.subarray(0, i * 4), length: i, escaped };
};

/**
 * Iterate z → z^d + c (Mandelbrot, z₀ = 0) and return the escape iteration,
 * capped at `cap`. No orbit storage — this is the cheap ranking probe for the
 * auto-reference search. `escaped` false means the candidate survived `cap`
 * iterations (a deep / near-interior point — an excellent reference).
 */
const probeOrbitLength = (
    c: HPComplex,
    power: number,
    cap: number,
): { length: number; escaped: boolean } => {
    let z = HPComplex.zero(c.re.p);
    for (let i = 0; i < cap; i++) {
        z = (power === 2 ? z.sqr() : z.pow(power)).add(c);
        if (z.norm2().isGreaterThanFour()) return { length: i + 1, escaped: true };
    }
    return { length: cap, escaped: false };
};

/**
 * f64 fast path for the candidate-ranking probe. Iterates z → z^d + c at the
 * candidate's ABSOLUTE coordinate in plain f64 — 50-100× faster than the BigInt
 * path (no per-iteration object/BigInt allocation). Only valid where f64's
 * 53-bit mantissa resolves the view (see `f64ProbeOK`); deeper views keep the
 * HP probe. Escape radius 4 matches the orbit builder so the length means "the
 * orbit length this candidate would produce as a reference".
 */
const probeOrbitLengthF64 = (
    cRe: number, cIm: number,
    power: number,
    cap: number,
): { length: number; escaped: boolean } => {
    let zr = 0, zi = 0;
    for (let i = 0; i < cap; i++) {
        if (power === 2) {
            const nr = zr * zr - zi * zi + cRe;
            const ni = 2 * zr * zi + cIm;
            zr = nr; zi = ni;
        } else {
            // z^d via exponentiation-by-squaring, then + c.
            let rr = 1, ri = 0, br = zr, bi = zi, e = power;
            while (e > 0) {
                if (e & 1) { const t = rr * br - ri * bi; ri = rr * bi + ri * br; rr = t; }
                e >>= 1;
                if (e > 0) { const t = br * br - bi * bi; bi = 2 * br * bi; br = t; }
            }
            zr = rr + cRe; zi = ri + cIm;
        }
        if (zr * zr + zi * zi > ESCAPE_RADIUS_SQ) return { length: i + 1, escaped: true };
    }
    return { length: cap, escaped: false };
};

/**
 * True when f64 resolves this view well enough to rank candidates by escape
 * length without BigInt. Needs ~(-log2 zoom) bits for the view scale plus
 * ~log2(maxIter) headroom; f64 gives 53. Margin keeps us safely above the floor.
 */
const f64ProbeOK = (zoom: number, maxIter: number): boolean =>
    (zoom > 0 ? -Math.log2(zoom) : 0) + Math.log2(Math.max(2, maxIter)) < 46;

interface RefCandidate {
    hiX: number; loX: number; hiY: number; loY: number;
    /** Offset from the view centre (ox, oy) that produced this candidate. Kept
     *  so the refine pass can recentre on it WITHOUT a DD subtraction of two
     *  near-equal centres (which cancels catastrophically at deep zoom — the
     *  sub-ulp offset lives in the lo word and is lost by a naïve hi+lo−hi−lo). */
    ox: number; oy: number;
    length: number; escaped: boolean;
}

/**
 * Search the view for the DEEPEST reference centre (longest orbit) — the point
 * whose orbit outlasts every pixel in the view. Using it as the reference means
 * no pixel runs past the reference's escape (which would hit the escaped orbit
 * tail and false-escape → cut-off "black" regions), and the per-pixel iteration
 * cap (= orbit length) stays stable across sub-ulp pans instead of tracking the
 * jittery view-centre escape.
 *
 * Two passes: a coarse centre-outward grid, then `REFINE_PASSES` local refines
 * around the running best at successively finer spacing (the boundary is fractal
 * — the coarse grid only approximates the deepest point). Probes run to the full
 * `maxIter` so a truly interior (non-escaping) point is detected and depth is
 * ranked honestly; an interior point found early short-circuits (closest such to
 * centre wins, smaller |dc|).
 *
 * Returns the chosen DD-centre, or null if nothing meaningfully beats the centre.
 */
const searchBetterReference = (
    centerX: number, centerLowX: number,
    centerY: number, centerLowY: number,
    zoom: number, aspect: number,
    power: number, precisionBits: number,
    centerLength: number, probeCap: number,
    useF64: boolean,
): RefCandidate | null => {
    const halfW = aspect * zoom;
    const halfH = zoom;

    let best: RefCandidate | null = null;
    let interiorFound = false;

    // Probe one offset (ox, oy) from the view centre; fold into best. Uses the
    // fast f64 path where the view resolves in f64 (the common moderate-deep
    // case), else the BigInt path — the chosen reference is rebuilt in full
    // precision regardless, so f64 here only ranks candidates.
    const probeOffset = (ox: number, oy: number): void => {
        if (interiorFound) return;
        const [hiX, loX] = ddAddF64(centerX, centerLowX, ox);
        const [hiY, loY] = ddAddF64(centerY, centerLowY, oy);
        const probe = useF64
            ? probeOrbitLengthF64(hiX + loX, hiY + loY, power, probeCap)
            : probeOrbitLength(HPComplex.fromDoubleDouble(hiX, loX, hiY, loY, precisionBits), power, probeCap);
        if (!best || probe.length > best.length) {
            best = { hiX, loX, hiY, loY, ox, oy, length: probe.length, escaped: probe.escaped };
        }
        if (!probe.escaped) interiorFound = true; // survived maxIter — ideal reference
    };

    // ── Coarse pass: normalised [-1, 1]² grid, centre-outward (skip 0,0). ──
    const step = SEARCH_GRID > 1 ? 2 / (SEARCH_GRID - 1) : 0;
    const coarse: { ox: number; oy: number; d2: number }[] = [];
    for (let gy = 0; gy < SEARCH_GRID; gy++) {
        for (let gx = 0; gx < SEARCH_GRID; gx++) {
            const nx = -1 + gx * step;
            const ny = -1 + gy * step;
            if (nx === 0 && ny === 0) continue;
            coarse.push({ ox: nx * halfW, oy: ny * halfH, d2: nx * nx + ny * ny });
        }
    }
    coarse.sort((a, b) => a.d2 - b.d2);
    for (const c of coarse) probeOffset(c.ox, c.oy);

    // ── Refine passes: tighten around the running best at finer spacing. ──
    // Skipped once an interior point is found (can't do better than non-escaping).
    let spanX = halfW * (SEARCH_GRID > 1 ? 1 / (SEARCH_GRID - 1) : 0.5);
    let spanY = halfH * (SEARCH_GRID > 1 ? 1 / (SEARCH_GRID - 1) : 0.5);
    for (let pass = 0; pass < REFINE_PASSES && best && !interiorFound; pass++) {
        const bx = (best as RefCandidate).ox;
        const by = (best as RefCandidate).oy;
        const rstep = REFINE_GRID > 1 ? 2 / (REFINE_GRID - 1) : 0;
        for (let gy = 0; gy < REFINE_GRID; gy++) {
            for (let gx = 0; gx < REFINE_GRID; gx++) {
                const nx = -1 + gx * rstep;
                const ny = -1 + gy * rstep;
                if (nx === 0 && ny === 0) continue; // current best, already probed
                probeOffset(bx + nx * spanX, by + ny * spanY);
            }
        }
        spanX /= (REFINE_GRID - 1);
        spanY /= (REFINE_GRID - 1);
    }

    if (!best) return null;
    const b = best as RefCandidate;
    if (b.length < centerLength * RELOCATE_MIN_RATIO &&
        b.length < centerLength + RELOCATE_MIN_ABS) {
        return null; // not meaningfully better — keep the centre
    }
    return b;
};

/**
 * Classify whether the view around an INTERIOR reference is mostly EXTERIOR by
 * probing a ring of boundary points. Returns true when a majority escape — the
 * signal that an interior reference would mis-accelerate the view's exterior
 * pixels under LA. Early-terminates once the verdict is decided. Bounded cost
 * (≤ RING points × maxIter HP iters, escaping points die early).
 */
const isViewExteriorDominated = (
    refHiX: number, refLoX: number, refHiY: number, refLoY: number,
    zoom: number, aspect: number, power: number, precisionBits: number, maxIter: number,
    useF64: boolean,
): boolean => {
    const halfW = aspect * zoom, halfH = zoom;
    const ring: [number, number][] = [
        [-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1],
    ];
    const need = Math.ceil(ring.length / 2) + 1; // strict majority (≥ 5 of 8)
    let escaped = 0, done = 0;
    for (const [nx, ny] of ring) {
        const [hiX, loX] = ddAddF64(refHiX, refLoX, nx * halfW);
        const [hiY, loY] = ddAddF64(refHiY, refLoY, ny * halfH);
        const probe = useF64
            ? probeOrbitLengthF64(hiX + loX, hiY + loY, power, maxIter)
            : probeOrbitLength(HPComplex.fromDoubleDouble(hiX, loX, hiY, loY, precisionBits), power, maxIter);
        if (probe.escaped) escaped++;
        done++;
        if (escaped >= need) return true;                       // majority escaped
        if (done - escaped > ring.length - need) return false;  // can't reach majority
    }
    return escaped >= need;
};

interface NucleusOrbit {
    orbit: Float32Array;
    length: number;
    /** Period P — orbit is exactly P samples (indices 0..P-1, orbit[0]=0). */
    period: number;
    /** Refined nucleus centre as a double-double, for the kernel offset. */
    hiX: number; loX: number; hiY: number; loY: number;
}

/**
 * Try to replace an INTERIOR reference with the exact minibrot nucleus it sits
 * in: detect the period at the seed, Newton-refine to the nucleus centre c*,
 * verify (z_P ≈ 0, non-escaping, c* inside the view), and build a ONE-PERIOD
 * orbit there. Returns null when no usable nucleus is found — the caller keeps
 * the non-periodic orbit and its existing heuristics. @see docs/adr/0066
 */
const findNucleus = (
    seedHiX: number, seedLoX: number, seedHiY: number, seedLoY: number,
    viewHiX: number, viewLoX: number, viewHiY: number, viewLoY: number,
    zoom: number, aspect: number, precisionBits: number, fallbackLength: number,
): NucleusOrbit | null => {
    // View half-diagonal in fractal coords — the ball radius for atom-domain
    // period detection (FractalShark uses the view's max radius).
    const radius = Math.hypot(aspect, 1) * zoom;
    // Newton's nucleus residual is ~|d_P|·2^-prec ~ 2^-(margin) — independent of
    // zoom, but the wrap must inject error below the PIXEL scale (≈ radius/H), so
    // we want a tiny residual at every depth. Bump the working precision past the
    // orbit's default margin so the nucleus is refined well past the pixel scale
    // even at extreme zoom (cheap: a one-period orbit is short). @see docs/adr/0066
    const nucPrec = precisionBits + 32;
    const seed = HPComplex.fromDoubleDouble(seedHiX, seedLoX, seedHiY, seedLoY, nucPrec);

    const cap = Math.min(fallbackLength, NUCLEUS_MAX_PERIOD);
    const det = detectPeriod(seed, radius, cap, nucPrec);
    if (det.period < 1 || det.period > NUCLEUS_MAX_PERIOD) return null;
    // Only worth it if the single period is meaningfully shorter than the
    // non-periodic orbit (the build + LA + wrap win).
    if (det.period >= fallbackLength * NUCLEUS_MAX_RATIO) return null;

    const cStar = newtonNucleus(seed, det.period, nucPrec);
    if (!cStar) return null;

    // Build P+1 samples and verify the defining property z_P ≈ 0 plus the
    // orbit not escaping. The full-HP cStar feeds buildOrbitAt directly (no DD
    // round-trip) so the stored orbit is as accurate as the refined centre.
    const verify = buildOrbitAt(HPComplex.zero(nucPrec), cStar, 2, det.period + 1);
    if (verify.escaped || verify.length <= det.period) return null;
    const zpRe = verify.orbit[det.period * 4 + 0];
    const zpIm = verify.orbit[det.period * 4 + 1];
    const zpMag = Math.hypot(zpRe, zpIm);
    // Wrap injects |z_P| of error per period; require it below the PIXEL scale
    // (radius/~1000) — not just the view radius — so the substitution
    // orbit[period]→orbit[0]=0 is invisible. The 1e-18 floor admits views near
    // the double-double centre wall; deeper, the nucleus is rejected → fallback.
    if (!(zpMag < Math.max(radius * 1e-3, 1e-18))) return null;

    const [hiX, loX] = cStar.re.toDoubleDouble();
    const [hiY, loY] = cStar.im.toDoubleDouble();
    // c* must lie inside (a few radii of) the view — else the kernel's
    // perturbation offset (view − ref) is too large to be valid.
    const [dxHi, dxLo] = ddSub(hiX, loX, viewHiX, viewLoX);
    const [dyHi, dyLo] = ddSub(hiY, loY, viewHiY, viewLoY);
    if (Math.hypot(dxHi + dxLo, dyHi + dyLo) > radius * 8) return null;

    // Adopt exactly ONE period (indices 0..P-1, orbit[0]=0). The kernel maps
    // index P back to orbit[0] via the modulo-period wrap.
    return {
        orbit: verify.orbit.slice(0, det.period * 4),
        length: det.period,
        period: det.period,
        hiX, loX, hiY, loY,
    };
};

export const computeReferenceOrbit = (input: RefOrbitInput): RefOrbitOutput => {
    const { centerX, centerY, zoom, maxIter } = input;
    const centerLowX = input.centerLowX ?? 0;
    const centerLowY = input.centerLowY ?? 0;
    const power = Math.max(2, Math.round(input.power ?? 2));
    const kind = input.kind ?? 'mandelbrot';
    const aspect = input.aspect && input.aspect > 0 ? input.aspect : 1.5;
    const precisionBits = choosePrecisionBits(zoom, maxIter);

    // Mode-specific seed. Mandelbrot iterates z=0..N from c=centre.
    // Julia iterates z=z₀..N from c=juliaC, where z₀ = centre.
    // The (centre, centreLow) pair is folded into BigInt precision via
    // fromDoubleDouble — at deep zoom the lo bits hold the user's last
    // pan increments and would be lost by a plain fromNumbers(centerX).
    const seedAt = (hiX: number, loX: number, hiY: number, loY: number): { z0: HPComplex; c: HPComplex } => {
        if (kind === 'julia') {
            return {
                z0: HPComplex.fromDoubleDouble(hiX, loX, hiY, loY, precisionBits),
                c: HPComplex.fromNumbers(input.juliaCx ?? 0, input.juliaCy ?? 0, precisionBits),
            };
        }
        return {
            z0: HPComplex.zero(precisionBits),
            c: HPComplex.fromDoubleDouble(hiX, loX, hiY, loY, precisionBits),
        };
    };

    // Build at the requested centre first.
    let refHiX = centerX, refLoX = centerLowX, refHiY = centerY, refLoY = centerLowY;
    const seed = seedAt(refHiX, refLoX, refHiY, refLoY);
    let built = buildOrbitAt(seed.z0, seed.c, power, maxIter);
    let relocated = false;

    // Candidate-ranking probes use f64 where the view resolves in 53 bits (the
    // common moderate-deep case) — ~100× faster than BigInt. Deeper views fall
    // back to HP. The chosen reference is always rebuilt in full precision.
    const useF64 = f64ProbeOK(zoom, maxIter);

    // Auto-reference: only when the centre orbit escaped early. A non-escaping
    // centre is already an ideal reference (interior / near-interior), so no
    // search. Julia's reference is z₀ (not c), so the "non-escaping centre"
    // notion differs — restrict the search to Mandelbrot, where it's well
    // defined and where LA (the artifact's home) actually runs.
    if (!input.disableAutoReference && kind === 'mandelbrot' && built.escaped && maxIter > 1) {
        // Probe to the full maxIter so an interior (non-escaping) point is
        // detected and escaping candidates are ranked by true depth — the
        // reference must outlast the view's latest-escaping pixel.
        const better = searchBetterReference(
            centerX, centerLowX, centerY, centerLowY,
            zoom, aspect, power, precisionBits,
            built.length, maxIter, useF64,
        );
        if (better) {
            const reseed = seedAt(better.hiX, better.loX, better.hiY, better.loY);
            built = buildOrbitAt(reseed.z0, reseed.c, power, maxIter);
            refHiX = better.hiX; refLoX = better.loX;
            refHiY = better.hiY; refLoY = better.loY;
            relocated = true;
        }
    }

    // ── Minibrot-nucleus reference (ADR-0066) ──────────────────────────────
    // When the chosen reference is INTERIOR (the centre, or the relocated
    // deepest point) it almost always sits inside a minibrot. Replace it with
    // the exact period-P nucleus: a ONE-period orbit the kernel wraps modulo P.
    // This is the canonical FractalShark/Imagina reference — cheap to build,
    // cheap LA table, and the wrap is EXACT (orbit[P]=orbit[0]=0) instead of the
    // approximate rebase-past-a-non-periodic-end. Layered in FRONT of the
    // existing heuristics: on any failure we keep the orbit built above.
    // Power-2 Mandelbrot only (the derivative recurrence + LA are d=2-specific).
    let period = 0;
    if (!input.disableAutoReference && !input.disableNucleus &&
        kind === 'mandelbrot' && power === 2 &&
        !built.escaped && maxIter > 1 && zoom < NUCLEUS_MIN_ZOOM) {
        const nuc = findNucleus(
            refHiX, refLoX, refHiY, refLoY,
            centerX, centerLowX, centerY, centerLowY,
            zoom, aspect, precisionBits, built.length,
        );
        if (nuc) {
            built = { orbit: nuc.orbit, length: nuc.length, escaped: false };
            refHiX = nuc.hiX; refLoX = nuc.loX;
            refHiY = nuc.hiY; refLoY = nuc.loY;
            period = nuc.period;
            relocated = true;
        }
    }

    // LA-safety classification. When the chosen reference is INTERIOR
    // (non-escaping) but the surrounding view is mostly EXTERIOR, the LA tables
    // (built from a bounded orbit) mis-accelerate the exterior pixels in the L∞
    // region → a black square. Pure PO against the same interior reference is
    // correct, so flag LA unsafe and let the worker skip the LA build. Genuine
    // minibrot dives (interior-dominated view) keep LA. Only meaningful for
    // Mandelbrot (where LA runs). @see docs/adr/0065
    let laUnsafe = false;
    if (!input.disableAutoReference && kind === 'mandelbrot' && !built.escaped && maxIter > 1) {
        laUnsafe = isViewExteriorDominated(refHiX, refLoX, refHiY, refLoY, zoom, aspect, power, precisionBits, maxIter, useF64);
    }

    return {
        orbit: built.orbit,
        length: built.length,
        escaped: built.escaped,
        precisionBits,
        refCenterX: refHiX,
        refCenterY: refHiY,
        refCenterLowX: refLoX,
        refCenterLowY: refLoY,
        relocated,
        laUnsafe,
        period,
    };
};