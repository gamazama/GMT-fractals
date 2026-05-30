/**
 * Interaction → adaptive latency + outcome harness (ADR-0061 / P2 verification
 * tier (b)). Captures the BASELINE that P4 must beat.
 *
 *   tsx debug/interaction-latency-harness.mts            — run + write baseline
 *   tsx debug/interaction-latency-harness.mts --check    — re-run + diff vs baseline (P4)
 *   tsx debug/interaction-latency-harness.mts --mode=session   — model the P4 wiring
 *
 * WHAT IT MEASURES, from STORE VALUES not pixels (headless-friendly, per the
 * verification protocol): for a scripted gesture sequence it records
 *   - input→first-reduced-scale-frame latency (the frame where qualityFraction
 *     first drops below 1.0) — p50 / p95 / min / max / mean, AND
 *   - the OUTCOME: did qualityFraction drop below 1.0, and did fpsSmoothed reach
 *     the adaptive target.
 *
 * HOW (deterministic, no real clock): it drives the SAME pure decision module
 * the store's qualityFraction derives from — engine/AdaptiveResolution.ts —
 * with an INJECTED `now`, and replicates the viewportSlice qualityFraction
 * conversion (1/scale + the 5% delta threshold). The scene is a closed loop:
 * frame cost ∝ 1/scale² (downscaling makes frames cheaper), so adaptive ramps
 * scale until fps ≈ target, exactly like the live loop. No performance.now /
 * Date.now / Math.random — re-runs are byte-identical, so the P4 diff is real.
 *
 * WHY TWO GESTURE TYPES. The whole bug ADR-0061 fixes is that SLIDERS are
 * invisible to adaptive — only `camera` reaches it via the legacy proxy. So the
 * baseline models both:
 *   - `legacy` mode: camera engages adaptive; slider does NOT (the documented
 *     bug → qualityFraction never drops, fps never reaches target).
 *   - `session` mode (P4): every declared gesture engages — slider latency goes
 *     from ∞ to a real number. P4 runs `--mode=session --check` and the diff is
 *     the proof.
 *
 * @see engine/AdaptiveResolution.ts
 * @see store/slices/viewportSlice.ts (qualityFraction conversion this mirrors)
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 * @see plans/interaction-session-rollout.md (Verification protocol)
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
    createAdaptiveResolutionState,
    tickAdaptiveResolution,
    type AdaptiveResolutionState,
} from '../engine/AdaptiveResolution';

const BASELINE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'interaction-latency-baseline.json');

// ── Scene + adaptive params (match the GMT defaults the store ships) ────────
const TARGET_FPS = 30;       // viewportSlice DEFAULT_ADAPTIVE.targetFps
const MIN_QUALITY = 0.25;    // viewportSlice DEFAULT_ADAPTIVE.minQuality (max scale 4)
const FULL_RES_MS = 66;      // a heavy scene: ~15fps at full res (well below target)
const FRAME_CAP = 600;       // safety cap per phase
const QF_DELTA = 0.05;       // viewportSlice 5% delta threshold

type GestureType = 'camera' | 'slider';
type Mode = 'legacy' | 'session';

/** Does the adaptive input see this gesture? The bug + the fix in one function. */
function adaptiveSeesGesture(g: GestureType, mode: Mode): boolean {
    if (mode === 'session') return true;   // session: every declared gesture is visible
    return g === 'camera';                 // legacy: only camera reaches adaptive
}

interface GestureResult {
    gesture: GestureType;
    index: number;
    /** ms from gesture start to the first frame with qualityFraction < 1.0; null = never dropped. */
    firstReducedMs: number | null;
    qualityDropped: boolean;
    finalScale: number;
    finalQf: number;
    finalFpsSmoothed: number;
    /** fpsSmoothed within 10% of target at gesture end. */
    fpsReachedTarget: boolean;
}

// Shared, mutable clock + adaptive state across the whole sequence — so
// fullResFrameMs warms across gestures exactly as it does live (the first
// gesture is "cold", later ones seed instantly).
interface Sim {
    state: AdaptiveResolutionState;
    now: number;
    scale: number;          // resolution scale currently APPLIED (drives this frame's cost)
    qf: number;             // store qualityFraction (1/scale, gated by the 5% threshold)
    fpsSmoothed: number;
}

function round(n: number, dp = 1): number {
    const f = 10 ** dp;
    return Math.round(n * f) / f;
}

/** Advance one frame: cost ∝ 1/scale², tick adaptive, apply the slice's qf rule. */
function stepFrame(sim: Sim, isInteracting: boolean): void {
    const frameMs = FULL_RES_MS / (sim.scale * sim.scale);
    sim.now += frameMs;
    const fps = 1000 / frameMs;

    const result = tickAdaptiveResolution(sim.state, {
        now: sim.now,
        accumCount: 0,            // accumulation not modelled — isolates the interaction→adaptive path
        isInteracting,
        mouseOverCanvas: true,
        dynamicScaling: true,
        adaptiveTarget: TARGET_FPS,
        interactionDownsample: 2.0,
        minQuality: MIN_QUALITY,
    });

    // Caller contract: flag a self-resize when scale changes so the next tick
    // doesn't misread it (moot here — accumCount is constant — but faithful).
    if (Math.abs(result.scale - sim.scale) > 1e-6) sim.state.selfResized = true;
    sim.scale = result.scale;

    // viewportSlice qualityFraction conversion: 1/scale, gated by 5% delta.
    const targetQuality = 1 / result.scale;
    if (Math.abs(targetQuality - sim.qf) / Math.max(sim.qf, 0.01) > QF_DELTA) sim.qf = targetQuality;

    sim.fpsSmoothed = sim.fpsSmoothed * 0.5 + fps * 0.5;
}

/** Run one gesture: pump interacting frames until fps settles near target (or
 *  the scene proves it'll never engage), recording the engage latency. */
function runGesture(sim: Sim, gesture: GestureType, mode: Mode, index: number): GestureResult {
    const sees = adaptiveSeesGesture(gesture, mode);
    const gestureStart = sim.now;
    let firstReducedMs: number | null = null;
    let settledFrames = 0;

    for (let f = 0; f < FRAME_CAP; f++) {
        stepFrame(sim, sees);
        if (firstReducedMs === null && sim.qf < 0.999) firstReducedMs = sim.now - gestureStart;

        const fps = 1000 / (FULL_RES_MS / (sim.scale * sim.scale));
        const nearTarget = Math.abs(fps - TARGET_FPS) / TARGET_FPS < 0.1;
        if (sees) {
            if (nearTarget) { if (++settledFrames >= 6) break; } else settledFrames = 0;
        } else {
            // Invisible gesture never engages — give it a fixed window then stop.
            if (f >= 30) break;
        }
    }

    const finalFps = 1000 / (FULL_RES_MS / (sim.scale * sim.scale));
    return {
        gesture,
        index,
        firstReducedMs: firstReducedMs === null ? null : round(firstReducedMs),
        qualityDropped: firstReducedMs !== null,
        finalScale: round(sim.scale, 3),
        finalQf: round(sim.qf, 3),
        finalFpsSmoothed: round(sim.fpsSmoothed),
        fpsReachedTarget: Math.abs(finalFps - TARGET_FPS) / TARGET_FPS < 0.1,
    };
}

/** Idle settle between gestures: pump non-interacting frames so adaptive
 *  returns to full res and the next gesture starts from a clean idle. */
function idleSettle(sim: Sim, frames = 60): void {
    for (let f = 0; f < frames; f++) stepFrame(sim, false);
}

function percentile(sorted: number[], p: number): number | null {
    if (sorted.length === 0) return null;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return round(sorted[idx]);
}

function summarize(results: GestureResult[]) {
    const byGesture: Record<string, any> = {};
    for (const g of ['camera', 'slider'] as GestureType[]) {
        const rows = results.filter((r) => r.gesture === g);
        const latencies = rows.map((r) => r.firstReducedMs).filter((v): v is number => v !== null).sort((a, b) => a - b);
        byGesture[g] = {
            gestures: rows.length,
            engageLatencyMs: {
                p50: percentile(latencies, 50),
                p95: percentile(latencies, 95),
                min: latencies.length ? round(latencies[0]) : null,
                max: latencies.length ? round(latencies[latencies.length - 1]) : null,
                mean: latencies.length ? round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
                samples: latencies.length,
            },
            qualityDroppedRate: rows.length ? rows.filter((r) => r.qualityDropped).length / rows.length : 0,
            fpsReachedTargetRate: rows.length ? rows.filter((r) => r.fpsReachedTarget).length / rows.length : 0,
        };
    }
    return byGesture;
}

function buildReport(mode: Mode) {
    const sim: Sim = { state: createAdaptiveResolutionState(), now: 0, scale: 1, qf: 1, fpsSmoothed: 1000 / FULL_RES_MS };
    // Scripted sequence: 5 camera + 5 slider, idle settle between each. The
    // first camera gesture is cold (fullResFrameMs unseeded); the rest warm.
    const script: GestureType[] = ['camera', 'camera', 'camera', 'camera', 'camera', 'slider', 'slider', 'slider', 'slider', 'slider'];
    const results: GestureResult[] = [];
    script.forEach((g, i) => {
        results.push(runGesture(sim, g, mode, i));
        idleSettle(sim);
    });

    return {
        schemaVersion: 1,
        generatedBy: 'debug/interaction-latency-harness.mts',
        // NOTE: no wall-clock timestamp on purpose — the harness is fully
        // deterministic (injected `now`), so byte-identical re-runs make the P4
        // diff meaningful. Re-generate with no flag; diff with --check.
        mode,
        params: { targetFps: TARGET_FPS, minQuality: MIN_QUALITY, fullResMs: FULL_RES_MS, qfDeltaThreshold: QF_DELTA, script },
        perGesture: results,
        summary: summarize(results),
        notes: mode === 'legacy'
            ? 'BASELINE (legacy proxy). camera engages adaptive; slider is INVISIBLE (qualityFraction never drops, fps never reaches target) — the bug ADR-0061 fixes. P4 runs --mode=session and slider latency must become finite while camera does not regress.'
            : 'session mode — models P4 wiring where every declared gesture engages adaptive.',
    };
}

function main() {
    const args = process.argv.slice(2);
    const check = args.includes('--check');
    const modeArg = args.find((a) => a.startsWith('--mode='));
    const mode: Mode = modeArg === '--mode=session' ? 'session' : 'legacy';

    const report = buildReport(mode);
    const serialized = JSON.stringify(report, null, 2) + '\n';

    const cam = report.summary.camera.engageLatencyMs;
    const sld = report.summary.slider;
    console.log(`[interaction-latency] mode=${mode}`);
    console.log(`  camera engage latency: p50=${cam.p50}ms p95=${cam.p95}ms (min ${cam.min} / max ${cam.max} / n ${cam.samples})`);
    console.log(`  camera outcome: qualityDropped=${report.summary.camera.qualityDroppedRate} fpsReachedTarget=${report.summary.camera.fpsReachedTargetRate}`);
    console.log(`  slider engage latency: p50=${sld.engageLatencyMs.p50}ms p95=${sld.engageLatencyMs.p95}ms (n ${sld.engageLatencyMs.samples})`);
    console.log(`  slider outcome: qualityDropped=${sld.qualityDroppedRate} fpsReachedTarget=${sld.fpsReachedTargetRate} ${sld.qualityDroppedRate === 0 ? '(invisible — the bug)' : ''}`);

    if (check) {
        if (!existsSync(BASELINE_PATH)) {
            console.error(`[interaction-latency] no baseline at ${BASELINE_PATH} — run without --check to write it`);
            process.exit(1);
        }
        const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
        // P2 only writes the baseline; P4 will add tolerance-based gating here.
        // For now --check just reports whether the captured baseline still
        // reproduces byte-for-byte in the same mode (a determinism guard).
        if (baseline.mode === mode) {
            const same = JSON.stringify(baseline) === JSON.stringify(report);
            console.log(`[interaction-latency] --check vs baseline (mode ${mode}): ${same ? 'IDENTICAL (deterministic ✓)' : 'DIFFERS'}`);
            process.exit(same ? 0 : 1);
        }
        console.log(`[interaction-latency] --check: baseline mode=${baseline.mode} differs from run mode=${mode} (expected for P4 session diff)`);
        process.exit(0);
    }

    writeFileSync(BASELINE_PATH, serialized);
    console.log(`[interaction-latency] wrote baseline → ${BASELINE_PATH}`);
}

main();
