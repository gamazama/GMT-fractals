/**
 * Auto-epsilon calibration for the LA (BLA) validity threshold.
 *
 * Our LA tables use FractalShark's FIXED `laThresholdScale = 2^-24` (the
 * single-precision epsilon). Phil Thompson's BLA write-up
 * (philthompson.me/2023/Faster-Mandelbrot-Set-Rendering-with-BLA…) found that
 * fixed value is too LOOSE at deep zoom: LA gets applied where its linear
 * approximation is no longer accurate, so the accelerated region diverges from
 * pure perturbation (the wrong-coloured / black "squares" we otherwise patch
 * with relocation / laUnsafe). The fix is to CALIBRATE epsilon per build:
 * binary-search the largest threshold scale whose LA result still matches plain
 * perturbation (the ground truth) at a grid of test points across the view.
 *
 * This module is a faithful CPU port of the kernel's deep-zoom evaluation
 * (`fractalKernel.ts`, Mandelbrot power-2, no per-iteration colour accumulators
 * — the modes where LA runs). It evaluates a pixel TWICE — pure PO (truth) and
 * LA + PO (accelerated) — and compares. Because both share the identical PO
 * tail, the comparison isolates the LA pre-pass accuracy, so minor PO
 * off-by-ones cancel and don't bias the verdict.
 *
 * @see docs/adr/0065
 */

import type { LAInfoDeep } from './LAInfoDeep';
import type { LAStage, LATable } from './laBuilder';
import { buildLATable } from './laBuilder';
import { defaultLAParameters } from './laParameters';

/** Pixel escape radius² used during calibration. Matches the renderer's default
 *  escapeR = 32 (→ 1024). The LA-vs-true comparison uses the SAME value on both
 *  paths, so the exact figure only shifts smoothIter slightly, not the verdict. */
const CALIB_ESCAPE_R2 = 1024;

/** Fetch reference orbit Z[idx] (re, im), bounds-clamped — mirrors the kernel's
 *  fetchRefZ. */
const refRe = (orbit: Float32Array, len: number, idx: number): number =>
    orbit[Math.max(0, Math.min(idx, len - 1)) * 4 + 0];
const refIm = (orbit: Float32Array, len: number, idx: number): number =>
    orbit[Math.max(0, Math.min(idx, len - 1)) * 4 + 1];

export interface EvalResult { escaped: boolean; smoothIter: number; zRe: number; zIm: number; }

/**
 * Pure-perturbation (PO) loop — the GROUND TRUTH. Mandelbrot, power 2. Mirrors
 * the kernel PO loop: rebases to orbit[0] when |z| < |dz| or the reference index
 * overflows. Starts from a given (iter, dzRe, dzIm, ref); pass (0,0,0,0) for a
 * full pixel evaluation, or the LA hand-off state to continue.
 */
const runPO = (
    orbit: Float32Array, len: number,
    dcRe: number, dcIm: number,
    iter0: number, dzRe0: number, dzIm0: number, ref0: number,
    maxIter: number,
): EvalResult => {
    let iter = iter0, dzRe = dzRe0, dzIm = dzIm0, ref = ref0;
    let pzr = refRe(orbit, len, ref), pzi = refIm(orbit, len, ref);
    let zr = pzr + dzRe, zi = pzi + dzIm;
    for (let n = 0; n < 1 << 21; n++) {
        if (iter >= maxIter) break;
        // dz' = 2·Zref·dz + dz² + dc
        const dnr = 2 * (pzr * dzRe - pzi * dzIm) + (dzRe * dzRe - dzIm * dzIm) + dcRe;
        const dni = 2 * (pzr * dzIm + pzi * dzRe) + (2 * dzRe * dzIm) + dcIm;
        dzRe = dnr; dzIm = dni;
        ref++;
        const zrn = refRe(orbit, len, ref), zin = refIm(orbit, len, ref);
        zr = zrn + dzRe; zi = zin + dzIm;
        const zMag2 = zr * zr + zi * zi;
        const dzMag2 = dzRe * dzRe + dzIm * dzIm;
        if (zMag2 < dzMag2 || ref >= len - 1) {
            dzRe = zr; dzIm = zi; ref = 0;
            pzr = refRe(orbit, len, 0); pzi = refIm(orbit, len, 0);
        } else {
            pzr = zrn; pzi = zin;
        }
        if (zMag2 > CALIB_ESCAPE_R2) {
            return { escaped: true, smoothIter: iter + 1 - Math.log2(0.5 * Math.log2(zMag2)), zRe: zr, zIm: zi };
        }
        iter++;
    }
    return { escaped: false, smoothIter: maxIter, zRe: zr, zIm: zi };
};

/**
 * LA pre-pass + PO tail — the ACCELERATED path. Faithful port of the kernel LA
 * walk (stage descent from root to leaf, threshold fail-over, rebase) followed
 * by the shared PO tail. Mandelbrot power 2.
 */
const runLA = (
    orbit: Float32Array, len: number,
    las: LAInfoDeep[], stages: LAStage[],
    dcRe: number, dcIm: number,
    maxIter: number,
): EvalResult => {
    let iter = 0, dzRe = 0, dzIm = 0, ref = 0;

    const stageCount = stages.length;
    const totalCount = las.length;
    const laActive = stageCount > 0 && totalCount > 1;

    if (laActive) {
        const first = las[0];
        if (Math.max(Math.abs(dcRe), Math.abs(dcIm)) <= first.LAThresholdC) {
            let j = 0;
            let currentStage = stageCount - 1;
            for (let stageStep = 0; stageStep < 64; stageStep++) {
                if (currentStage < 0 || iter >= maxIter) break;
                const laBase = stages[currentStage].laIndex;
                const macroItCount = stages[currentStage].macroItCount;
                let failedInStage = false;
                for (let laStep = 0; laStep < 4096; laStep++) {
                    if (iter >= maxIter || j >= macroItCount) break;
                    const la = las[laBase + j];
                    if (!la || la.StepLength === 0) break;
                    if (iter + la.StepLength > maxIter) break;
                    // newdz = dz · (2·Ref + dz)
                    const innerRe = 2 * la.Ref.re + dzRe, innerIm = 2 * la.Ref.im + dzIm;
                    const ndRe = dzRe * innerRe - dzIm * innerIm;
                    const ndIm = dzRe * innerIm + dzIm * innerRe;
                    if (Math.max(Math.abs(ndRe), Math.abs(ndIm)) >= la.LAThreshold) {
                        j = la.NextStageLAIndex; failedInStage = true; break;
                    }
                    // dz' = newdz·ZCoeff + dc·CCoeff
                    dzRe = (ndRe * la.ZCoeff.re - ndIm * la.ZCoeff.im) + (dcRe * la.CCoeff.re - dcIm * la.CCoeff.im);
                    dzIm = (ndRe * la.ZCoeff.im + ndIm * la.ZCoeff.re) + (dcRe * la.CCoeff.im + dcIm * la.CCoeff.re);
                    iter += la.StepLength;
                    ref += la.StepLength;
                    j++;
                    const next = las[laBase + j];
                    const nRe = next ? next.Ref.re : 0, nIm = next ? next.Ref.im : 0;
                    const zr = nRe + dzRe, zi = nIm + dzIm;
                    const zMag2 = zr * zr + zi * zi;
                    if (zMag2 > CALIB_ESCAPE_R2) {
                        return { escaped: true, smoothIter: iter + 1 - Math.log2(0.5 * Math.log2(zMag2)), zRe: zr, zIm: zi };
                    }
                    const dzMag2 = dzRe * dzRe + dzIm * dzIm;
                    if (zMag2 < dzMag2 || j >= macroItCount) {
                        dzRe = zr; dzIm = zi; j = 0; ref = 0;
                    }
                }
                if (!failedInStage) break;
                currentStage--;
            }
        }
        ref = len > 0 ? Math.min(ref, len - 1) : 0;
    }

    // Hand off to the shared PO tail from the LA state (escape returns inline above).
    return runPO(orbit, len, dcRe, dcIm, iter, dzRe, dzIm, ref, maxIter);
};

export interface CalibrationInput {
    orbit: Float32Array;
    orbitLen: number;
    maxIter: number;
    /** dc of the view CENTRE = viewCentre − referenceCentre (the kernel's
     *  uDeepCenterOffset). Test points fan out around this. */
    dcCenterRe: number;
    dcCenterIm: number;
    /** Half-extents of the view in fractal coords: halfW = aspect·zoom, halfH = zoom. */
    halfW: number;
    halfH: number;
}

export interface CalibrationResult {
    table: LATable;
    /** The chosen laThresholdScale (= the calibrated epsilon). */
    scale: number;
    /** log2(scale) — handy for logging/diagnostics. */
    scaleLog2: number;
    /** Test points checked and how many matched truth at the chosen scale. */
    testPoints: number;
    passed: number;
}

/** Relative-error tolerance for "LA matches truth" (~0.001%, per the article). */
const REL_TOL = 1e-5;
/** Loosest scale we'll consider (FractalShark's default; the current behaviour). */
const MAX_SCALE_LOG2 = -24;
/** Strictest scale; at this bound LA barely applies and ≈ pure PO (always safe). */
const MIN_SCALE_LOG2 = -53;
/** Binary-search refinement steps between the loose and strict bounds. */
const SEARCH_STEPS = 6;
/** Test-grid resolution (points per axis). */
const TEST_GRID = 3;

/** Build the dc test grid spanning the view around its centre offset. */
const makeTestPoints = (i: CalibrationInput): [number, number][] => {
    const pts: [number, number][] = [];
    const n = TEST_GRID;
    for (let gy = 0; gy < n; gy++) {
        for (let gx = 0; gx < n; gx++) {
            const fx = n > 1 ? (gx / (n - 1)) * 2 - 1 : 0;
            const fy = n > 1 ? (gy / (n - 1)) * 2 - 1 : 0;
            pts.push([i.dcCenterRe + fx * i.halfW, i.dcCenterIm + fy * i.halfH]);
        }
    }
    return pts;
};

/** True if the LA path matches the pre-computed truth at every test point. All
 *  LA error originates in the LA pre-pass (≤ orbit range) and then propagates
 *  through the shared PO tail, so evaluating to a CAPPED iteration (≈ 2× orbit
 *  length) surfaces it without paying the full maxIter — and we compare the
 *  perturbation `z` (not just escape status) so a still-bounded divergence at the
 *  cap is caught too. */
const tableMatchesTruth = (
    input: CalibrationInput, table: LATable, evalMaxIter: number,
    pts: [number, number][], truth: EvalResult[],
): { ok: boolean; passed: number } => {
    let passed = 0;
    for (let k = 0; k < pts.length; k++) {
        const t = truth[k];
        const la = runLA(input.orbit, input.orbitLen, table.las, table.stages, pts[k][0], pts[k][1], evalMaxIter);
        let match: boolean;
        if (t.escaped !== la.escaped) {
            match = false; // escape-status disagreement is a hard fail
        } else if (t.escaped) {
            const denom = Math.max(Math.abs(t.smoothIter), 1);
            match = Math.abs(la.smoothIter - t.smoothIter) / denom < REL_TOL;
        } else {
            // Both bounded at the cap — compare the perturbation z directly.
            const dr = la.zRe - t.zRe, di = la.zIm - t.zIm;
            const denom = Math.max(Math.hypot(t.zRe, t.zIm), 1e-12);
            match = Math.hypot(dr, di) / denom < 1e-3;
        }
        if (match) passed++;
    }
    return { ok: passed === pts.length, passed };
};

/**
 * Calibrate the LA threshold scale for this view: the LARGEST scale (most
 * acceleration) whose LA result still matches pure perturbation at every test
 * point. Returns the calibrated table. Falls back to the strict bound if even
 * the loose default is accurate is moot — we simply keep the loose default when
 * it already passes (no change vs today, but now PROVEN accurate for the view).
 */
export const calibrateLATable = (input: CalibrationInput): CalibrationResult => {
    const pts = makeTestPoints(input);
    // Cap the per-point evaluation: LA error lives within the LA range (≤ orbit
    // length) and then rides the shared PO tail, so ≈2× orbit length surfaces it
    // without paying the full (iterMul-inflated) maxIter. Keep a floor so shallow
    // orbits still iterate enough to be representative.
    const evalMaxIter = Math.min(input.maxIter, Math.max(input.orbitLen * 2, 4000));
    const truth = pts.map((p) => runPO(input.orbit, input.orbitLen, p[0], p[1], 0, 0, 0, 0, evalMaxIter));

    const buildAt = (log2: number): LATable => {
        const params = defaultLAParameters();
        params.laThresholdScale = Math.pow(2, log2);
        params.laThresholdCScale = Math.pow(2, log2);
        return buildLATable(input.orbit, input.orbitLen, params);
    };

    // Fast path: the loose default already matches truth → keep it (today's
    // behaviour, now verified accurate). This is the common case for
    // well-behaved views and avoids the binary search entirely.
    const loose = buildAt(MAX_SCALE_LOG2);
    const looseCheck = tableMatchesTruth(input, loose, evalMaxIter, pts, truth);
    if (looseCheck.ok) {
        return { table: loose, scale: Math.pow(2, MAX_SCALE_LOG2), scaleLog2: MAX_SCALE_LOG2, testPoints: pts.length, passed: looseCheck.passed };
    }

    // Binary search for the largest passing scale between strict (passes) and
    // loose (fails). Invariant: loExp passes, hiExp fails.
    let loExp = MIN_SCALE_LOG2; // strict → LA ≈ PO → safe
    let hiExp = MAX_SCALE_LOG2; // loose → known to fail here
    let best = buildAt(loExp);
    let bestExp = loExp;
    let bestPassed = tableMatchesTruth(input, best, evalMaxIter, pts, truth).passed;
    for (let s = 0; s < SEARCH_STEPS; s++) {
        const mid = (loExp + hiExp) / 2;
        const table = buildAt(mid);
        const check = tableMatchesTruth(input, table, evalMaxIter, pts, truth);
        if (check.ok) { loExp = mid; best = table; bestExp = mid; bestPassed = check.passed; }
        else { hiExp = mid; }
    }
    return { table: best, scale: Math.pow(2, bestExp), scaleLog2: bestExp, testPoints: pts.length, passed: bestPassed };
};
