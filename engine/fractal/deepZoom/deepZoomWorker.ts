/// <reference lib="webworker" />

/**
 * Deep-zoom CPU compute worker.
 *
 * Owns reference-orbit construction and (later, phase 5) LA table
 * construction. No WebGL access — pure CPU. Communicates via structured-
 * clone postMessage with transferable buffers for zero-copy delivery of
 * the orbit Float32Array.
 *
 * Lifecycle: created on first deep-zoom request by `DeepZoomRuntime` on
 * the main thread, kept alive across the session, terminated on app
 * unmount. One worker per fractal — minibrot multi-reference (phase 11)
 * may spawn multiple.
 *
 * Cancellation: each request carries an `id`; the main thread can
 * request a cancel by sending `{ type: 'cancel', id }`. The worker
 * checks `cancelled` between iterations of the outer loop and bails
 * fast. (Granular cancellation lands when LA construction does, since
 * orbit-only builds are typically <100 ms even at deep zooms.)
 */

import { computeReferenceOrbit } from './referenceOrbit';
import { buildLATable, type LATable } from './laBuilder';
import { buildAT } from './atBuilder';
import { calibrateLATable } from './epsilonCalibration';
import { ddSub } from './dd';

export type DeepZoomRequest =
    | {
          type: 'computeOrbit';
          id: number;
          centerX: number;
          centerY: number;
          /** Sub-f64 residual companion to (centerX, centerY) for deep-zoom
           *  pan precision. Combined into the BigInt orbit centre via
           *  HPComplex.fromDoubleDouble so pan increments below f64's
           *  mantissa floor (~1e-16) reach the orbit. Optional — defaults
           *  to 0 for callers that haven't been wired through yet. */
          centerLowX?: number;
          centerLowY?: number;
          zoom: number;
          maxIter: number;
          /** Power d in z → z^d + c. Default 2. Integer 2..8. */
          power?: number;
          /** Fractal kind. Defaults to 'mandelbrot'. */
          kind?: 'mandelbrot' | 'julia';
          /** Julia constant — required when kind='julia'. */
          juliaCx?: number;
          juliaCy?: number;
          /** When true, also build the LA merge tree from the orbit and
           *  return packed table buffers in the response. Phase 5+. */
          buildLA?: boolean;
          /** Auto-epsilon: calibrate the LA validity threshold (default true).
           *  False = use the fixed 2^-24 scale (faster frames, no calibration). */
          calibrateLA?: boolean;
          /** Worst-case |dc|² across the screen for AT validity. Skip
           *  if 0 — disables AT. Set to (aspect² + 1) · zoom² for a
           *  rectangular viewport. Phase 7+. */
          screenSqrRadius?: number;
          /** Viewport aspect (width / height) — sizes the auto-reference
           *  search region to the actual view. Default 1.5 in the builder. */
          aspect?: number;
          /** Opt out of the auto-reference (non-escaping centre) search and
           *  build at the literal view centre. Default false. */
          disableAutoReference?: boolean;
          /** Opt out of the minibrot-nucleus (periodic) reference (ADR-0066),
           *  forcing the non-periodic fallback. Default false. */
          disableNucleus?: boolean;
          /** Phoenix kind — build Z_{n+1} = Z_n^d + C + K·Z_{n-1}. The caller
           *  must also set buildLA=false / screenSqrRadius=0 (LA/AT are
           *  z²+c-specific and unsupported for Phoenix). */
          phoenix?: boolean;
          /** Phoenix history coefficient K (real, imag). */
          phoenixKx?: number;
          phoenixKy?: number;
      }
    | {
          type: 'cancel';
          id: number;
      };

export interface DeepZoomOrbitResponse {
    type: 'orbit';
    id: number;
    orbit: ArrayBuffer;
    length: number;
    escaped: boolean;
    precisionBits: number;
    buildMs: number;
    /** Number of milliseconds spent on the LA table portion (0 if not requested). */
    laBuildMs: number;
    /** Reference centre actually used (hi + lo words). Equals the input centre
     *  unless the auto-reference search relocated it to a deeper non-escaping
     *  point. The caller passes this to DeepZoomController.setReferenceOrbit. */
    refCenterX: number;
    refCenterY: number;
    refCenterLowX: number;
    refCenterLowY: number;
    /** True when the auto-reference search relocated the centre (diagnostics). */
    relocated: boolean;
    /** True when LA was skipped because the interior reference would mis-accelerate
     *  an exterior-dominated view (kernel uses pure PO). Diagnostics. */
    laUnsafe: boolean;
    /** Period of the minibrot-nucleus reference (0 = non-periodic fallback).
     *  When > 0 the orbit is exactly one period; the kernel wraps the reference
     *  index modulo this. @see docs/adr/0066 */
    period: number;
    /** Packed LA table — present only when `buildLA` was requested.
     *  Each LA fills 3 RGBA32F texels (12 floats); see `packLATable`
     *  for the exact layout. */
    laTable?: ArrayBuffer;
    /** Packed stage table — pairs of [laIndex, macroItCount] as floats. */
    laStages?: ArrayBuffer;
    /** log2 of the calibrated LA validity-threshold scale (auto-epsilon). Present
     *  when an LA table was built. -24 = the old fixed default (loose); more
     *  negative = stricter (the view needed tighter LA to stay glitch-free). */
    laEpsilonLog2?: number;
    /** Total LA node count (laTable.length / 12 floats / 4 bytes). */
    laCount?: number;
    /** Stage count (laStages.length / 2 / 4 bytes). */
    laStageCount?: number;
    /** Optional AT (Approximation Terms) data — null when no stage
     *  passes Usable for the given screen radius. Packed inline as
     *  scalars rather than a buffer because it's small (~9 floats). */
    at?: {
        stepLength: number;
        thresholdC: number;
        sqrEscapeRadius: number;
        refCRe: number;
        refCIm: number;
        ccoeffRe: number;
        ccoeffIm: number;
        invZCoeffRe: number;
        invZCoeffIm: number;
    };
}

export interface DeepZoomErrorResponse {
    type: 'error';
    id: number;
    message: string;
}

export type DeepZoomResponse = DeepZoomOrbitResponse | DeepZoomErrorResponse;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

/**
 * Pack the LA table into transferable buffers ready for GPU upload.
 *
 * LA texels (3 RGBA32F per node, 12 floats):
 *   texel 0: [Ref.re, Ref.im, ZCoeff.re, ZCoeff.im]
 *   texel 1: [CCoeff.re, CCoeff.im, LAThreshold, LAThresholdC]
 *   texel 2: [StepLength, NextStageLAIndex, _, _]
 *
 * Stages: [laIndex, macroItCount] per stage as 2 floats each.
 */
const packLATable = (table: LATable): { las: ArrayBuffer; stages: ArrayBuffer } => {
    const lasArr = new Float32Array(table.las.length * 12);
    for (let i = 0; i < table.las.length; i++) {
        const la = table.las[i];
        const o = i * 12;
        lasArr[o + 0] = la.Ref.re;
        lasArr[o + 1] = la.Ref.im;
        lasArr[o + 2] = la.ZCoeff.re;
        lasArr[o + 3] = la.ZCoeff.im;
        lasArr[o + 4] = la.CCoeff.re;
        lasArr[o + 5] = la.CCoeff.im;
        lasArr[o + 6] = la.LAThreshold;
        lasArr[o + 7] = la.LAThresholdC;
        lasArr[o + 8] = la.StepLength;
        lasArr[o + 9] = la.NextStageLAIndex;
        // [10], [11] reserved for future use (e.g. MinMag in detection
        // method 1, or a per-LA HDR exponent if we promote any of the
        // above past f32 range).
    }
    const stagesArr = new Float32Array(table.stages.length * 2);
    for (let i = 0; i < table.stages.length; i++) {
        stagesArr[i * 2 + 0] = table.stages[i].laIndex;
        stagesArr[i * 2 + 1] = table.stages[i].macroItCount;
    }
    return { las: lasArr.buffer, stages: stagesArr.buffer };
};

ctx.onmessage = (event: MessageEvent<DeepZoomRequest>) => {
    const msg = event.data;
    if (msg.type === 'cancel') {
        // Phase-2 stub: orbit-only builds finish faster than the cancel
        // round-trip, so we accept the request and ignore. Real
        // cancellation arrives with phase-5 LA construction.
        return;
    }
    if (msg.type !== 'computeOrbit') return;

    const { id, centerX, centerY, centerLowX, centerLowY, zoom, maxIter, buildLA, screenSqrRadius, power, kind, juliaCx, juliaCy, aspect, disableAutoReference, disableNucleus, calibrateLA, phoenix, phoenixKx, phoenixKy } = msg;
    try {
        const t0 = performance.now();
        const result = computeReferenceOrbit({
            centerX, centerY,
            centerLowX: centerLowX ?? 0,
            centerLowY: centerLowY ?? 0,
            zoom, maxIter,
            power, kind, juliaCx, juliaCy,
            aspect, disableAutoReference, disableNucleus,
            phoenix, phoenixKx, phoenixKy,
        });
        const buildMs = performance.now() - t0;

        // Re-slice to a fresh ArrayBuffer for transfer. `subarray()` is
        // a view over the original 4×maxIter buffer; transferring the
        // underlying buffer would also transfer the unused tail.
        const transfer = new ArrayBuffer(result.orbit.byteLength);
        new Float32Array(transfer).set(result.orbit);

        const response: DeepZoomOrbitResponse = {
            type: 'orbit',
            id,
            orbit: transfer,
            length: result.length,
            escaped: result.escaped,
            precisionBits: result.precisionBits,
            buildMs,
            laBuildMs: 0,
            refCenterX: result.refCenterX,
            refCenterY: result.refCenterY,
            refCenterLowX: result.refCenterLowX,
            refCenterLowY: result.refCenterLowY,
            relocated: result.relocated,
            laUnsafe: result.laUnsafe,
            period: result.period,
        };
        const transferList: ArrayBuffer[] = [transfer];

        // Skip the LA build when the reference is interior but the view is
        // exterior-dominated — LA would mis-accelerate the exterior pixels into a
        // black L∞ square; pure PO (no LA table) renders it correctly. @see ADR-0065
        if (buildLA && result.length > 1 && !result.laUnsafe) {
            const laT0 = performance.now();
            // Auto-epsilon: build the LA table at the LARGEST validity-threshold
            // scale that still matches pure perturbation across the view (the
            // fixed 2^-24 is too loose at depth → residual LA squares). dc of the
            // view centre = viewCentre − referenceCentre (the kernel's
            // uDeepCenterOffset); test points fan out by ±aspect·zoom / ±zoom.
            let table: LATable;
            if (calibrateLA === false || result.period > 0) {
                // A/B: fixed 2^-24 scale (no calibration) — faster frames, the
                // pre-auto-epsilon behaviour. Reference-quality fixes still apply.
                // Also forced for a PERIODIC (nucleus) reference: it's exact by
                // construction so the loose default is glitch-free (verified), AND
                // the calibrator's CPU LA walk uses the non-periodic rebase rather
                // than the kernel's modulo-period wrap, so it would validate a
                // different trace than the GPU runs. @see docs/adr/0066
                table = buildLATable(result.orbit, result.length);
            } else {
                const [dcReHi, dcReLo] = ddSub(centerX, centerLowX ?? 0, result.refCenterX, result.refCenterLowX);
                const [dcImHi, dcImLo] = ddSub(centerY, centerLowY ?? 0, result.refCenterY, result.refCenterLowY);
                const asp = aspect && aspect > 0 ? aspect : 1.5;
                const calib = calibrateLATable({
                    orbit: result.orbit, orbitLen: result.length, maxIter,
                    dcCenterRe: dcReHi + dcReLo, dcCenterIm: dcImHi + dcImLo,
                    halfW: asp * zoom, halfH: zoom,
                });
                table = calib.table;
                response.laEpsilonLog2 = calib.scaleLog2;
            }
            response.laBuildMs = performance.now() - laT0;
            if (table.valid && table.las.length > 0) {
                const packed = packLATable(table);
                response.laTable = packed.las;
                response.laStages = packed.stages;
                response.laCount = table.las.length;
                response.laStageCount = table.stages.length;
                transferList.push(packed.las, packed.stages);

                // AT: pick the outermost usable stage given the screen
                // radius. Tiny in size, packed inline. Skipped for a PERIODIC
                // reference: the AT front-load advances `iter` without advancing
                // the orbit reference index, which has no verified interaction
                // with the kernel's modulo-period wrap — and the periodic LA tree
                // (cycled via rebase) already covers the depth. @see docs/adr/0066
                if (screenSqrRadius && screenSqrRadius > 0 && result.period === 0) {
                    const at = buildAT(table, screenSqrRadius);
                    if (at) {
                        response.at = {
                            stepLength: at.stepLength,
                            thresholdC: at.thresholdC,
                            sqrEscapeRadius: at.sqrEscapeRadius,
                            refCRe: at.refC.re,
                            refCIm: at.refC.im,
                            ccoeffRe: at.ccoeff.re,
                            ccoeffIm: at.ccoeff.im,
                            invZCoeffRe: at.invZCoeff.re,
                            invZCoeffIm: at.invZCoeff.im,
                        };
                    }
                }
            }
        }
        ctx.postMessage(response, transferList);
    } catch (err) {
        const response: DeepZoomErrorResponse = {
            type: 'error',
            id,
            message: err instanceof Error ? err.message : String(err),
        };
        ctx.postMessage(response);
    }
};
