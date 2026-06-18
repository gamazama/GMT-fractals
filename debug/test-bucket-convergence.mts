/**
 * test-bucket-convergence.mts — regression guard for the bucket-render convergence
 * carry-over fix.
 *
 * THE BUG (fixed in RenderPipeline.resetAccumulation):
 *   The async convergence fence/pending state in RenderPipeline is pipeline-global
 *   and was NOT reset on a per-bucket transition. resetAccumulation() (called at every
 *   bucket start) cleared accumulationCount but left `convergencePending` true and the
 *   convergenceTarget holding the PREVIOUS bucket's region diff. So when a bucket hit
 *   its sample cap while a measurement was still pending, the NEXT bucket:
 *     (a) could not start its own measurement — startAsyncConvergence early-returns on
 *         `if (this.convergencePending) return;`, so the measured region (uBoundsMin/Max)
 *         was never updated to the new bucket; and
 *     (b) polled a STALE result computed over the previous bucket's region, so it could be
 *         declared "converged" at a near-minimum sample count regardless of its content.
 *   That under-sampled scattered buckets during an export, producing CA-amplified
 *   boundary seams (intermittent, content-uncorrelated, worse at high spp).
 *
 *   The fix: resetAccumulation() clears `convergencePending`, so every accumulation run
 *   (per GPU bucket / per viewport accumulation) measures its OWN region from scratch.
 *
 * This drives the REAL RenderPipeline methods (startAsyncConvergence /
 * pollConvergenceResult / resetAccumulation) against a headless mock renderer — no GPU,
 * fully deterministic. It asserts the FIXED behavior; if the carry-over regresses, the
 * post-transition assertions fail.
 *
 * Run: npx tsx debug/test-bucket-convergence.mts
 */

import * as THREE from 'three';
import { RenderPipeline } from '../engine/RenderPipeline';

// ── Headless mock WebGL2 context (only the bits the convergence path touches) ──
const gl2: any = {
    SYNC_GPU_COMMANDS_COMPLETE: 0x9117,
    ALREADY_SIGNALED: 0x911a,
    CONDITION_SATISFIED: 0x911c,
    WAIT_FAILED: 0x9119,
    TIMEOUT_EXPIRED: 0x911b,
    fenceSync: (_a: number, _b: number) => ({ id: Symbol('fence') }),
    deleteSync: (_s: unknown) => {},
    clientWaitSync: (_s: unknown, _flags: number, _timeout: number) => gl2.ALREADY_SIGNALED,
    flush: () => {},
};

// The "measured" max-delta the next readback will report. The test sets this to
// represent whatever the convergenceTarget currently holds.
let nextReadbackDelta = 1.0;

const mockRenderer: any = {
    getRenderTarget: () => null,
    setRenderTarget: (_t: unknown) => {},
    render: (_s: unknown, _c: unknown) => {},
    getContext: () => gl2,
    readRenderTargetPixels: (
        _target: unknown, _x: number, _y: number, _w: number, _h: number, buffer: Float32Array,
    ) => {
        // CONVERGENCE_FRAG writes maxDiff into the .r channel; the scan reads buffer[i] (i+=4).
        buffer.fill(0);
        buffer[0] = nextReadbackDelta;
    },
};

// ── Assertion helpers ──
let failures = 0;
function check(label: string, cond: boolean) {
    console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`);
    if (!cond) failures++;
}
function approx(a: number, b: number) { return Math.abs(a - b) < 1e-5; } // float32 round-trip tolerance

// Reach into private state for inspection (this is a diagnostic, not production code).
function peek(p: RenderPipeline) {
    const any = p as any;
    return {
        get pending() { return any.convergencePending as boolean; },
        set pending(v: boolean) { any.convergencePending = v; },
        get boundsMin() { return any.convergenceMaterial.uniforms.uBoundsMin.value as THREE.Vector2; },
        set accum(v: number) { any.accumulationCount = v; },
    };
}

// Bucket N region vs bucket N+1 region — distinct so we can tell which one was measured.
const REGION_N   = { min: new THREE.Vector2(0.0, 0.0), max: new THREE.Vector2(0.5, 0.5) };
const REGION_N1  = { min: new THREE.Vector2(0.5, 0.5), max: new THREE.Vector2(1.0, 1.0) };

console.log('\n=== Bucket convergence carry-over — regression guard ===\n');

// ── Build a real pipeline with initialized targets (no GPU needed) ──
const pipe = new RenderPipeline();
pipe.resize(64, 64);                 // -> initTargets + initConvergenceTools (plain JS objects)
pipe.setBucketRendering(true);
const s = peek(pipe);

console.log('SCENARIO: bucket N starts a measurement, then hits its SAMPLE CAP before the');
console.log('fence resolves (so the runner advances WITHOUT polling), then bucket N+1 runs.\n');

// --- Bucket N: accumulate, start an async convergence measurement over REGION_N ---
s.accum = 50;
pipe.startAsyncConvergence(mockRenderer, REGION_N.min, REGION_N.max);
check('bucket N: measurement started (convergencePending = true)', s.pending === true);
check('bucket N: convergence region = REGION_N',
    approx(s.boundsMin.x, 0.0) && approx(s.boundsMin.y, 0.0));

// --- Cap fires: BucketRunner composites + advances to bucket N+1 without polling. ---
//     The transition path calls pipeline.resetAccumulation() (via host.resetAccumulation).
pipe.resetAccumulation();
check('FIXED: resetAccumulation cleared the stale pending measurement', s.pending === false);

// --- Bucket N+1: accumulates a FEW samples, then measures its OWN region. ---
s.accum = 18; // few samples in
nextReadbackDelta = 0.4; // bucket N+1's OWN (still-noisy) delta
pipe.startAsyncConvergence(mockRenderer, REGION_N1.min, REGION_N1.max);
check('FIXED: bucket N+1 measures its OWN region (REGION_N1, not the stale REGION_N)',
    approx(s.boundsMin.x, 0.5) && approx(s.boundsMin.y, 0.5));

// --- Bucket N+1 polls and gets its OWN delta -> correctly NOT converged. ---
const polled = pipe.pollConvergenceResult(mockRenderer);
check('FIXED: bucket N+1 polls its OWN delta (0.4)', polled !== null && approx(polled!, 0.4));
const FALSE_CONVERGED = polled !== null && polled < (0.25 / 100); // GMT default threshold 0.25%
check('FIXED: bucket N+1 NOT falsely converged at ~18 samples', FALSE_CONVERGED === false);

// --- Guard the underlying mechanism: a pending measurement must survive when NOT reset,
//     otherwise the carry-over fix would be vacuous (e.g. if pending never gets set). ---
s.accum = 30;
nextReadbackDelta = 0.2;
pipe.startAsyncConvergence(mockRenderer, REGION_N.min, REGION_N.max);
check('sanity: a fresh measurement does set convergencePending', s.pending === true);

console.log(`\n=== ${failures === 0 ? 'OK — carry-over fix holds' : 'REGRESSION'} — ${failures} failure(s) ===\n`);
process.exit(failures === 0 ? 0 : 1);
