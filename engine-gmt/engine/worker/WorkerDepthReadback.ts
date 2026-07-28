/**
 * WorkerDepthReadback.ts — Async depth readback + focus pick subsystem for the render worker.
 *
 * Reads the depth value (stored in the alpha channel of the accumulation RT) from the GPU
 * each frame using an async PBO + fence sync pattern — avoiding the ~40ms glFinish stall
 * that a synchronous readPixels would cause. Falls back to sync on WebGL1/no-fenceSync.
 *
 * Also owns the focus pick state machine (pending → snapshot → sample) used by
 * the DoF click-to-focus feature.
 */

import type * as THREE from 'three';
import { HalfFloatType } from 'three';
import type { FractalEngine } from '../FractalEngine';
import type { WorkerToMainMessage } from './WorkerProtocol';

import { isSurfaceHit } from '../../../data/constants';

type PostMsgFn = (msg: WorkerToMainMessage, transfer?: Transferable[]) => void;

type FocusPickState =
    | { phase: 'pending'; id: string; x: number; y: number }
    | { phase: 'ready'; width: number; height: number; depthData: Float32Array };

export class WorkerDepthReadback {
    // Async PBO state
    private _depthPBO: WebGLBuffer | null = null;
    private _depthFence: WebGLSync | null = null;
    private _depthPBOPending = false;
    private _depthGL: WebGL2RenderingContext | null = null;
    private _depthPBOHalfFloat = false;
    private readonly _readBuffer = new Float32Array(4);

    // Focus pick state
    private _focusPickState: FocusPickState | null = null;

    /**
     * Called once per rendered frame (after the display blit).
     * Checks the async fence from the previous readback, issues a new one every 3rd frame,
     * and resolves any pending focus pick.
     *
     * @invariant Async readback reads from `pipeline.getPreviousRenderTarget()`,
     *   NOT the current one — reading the in-flight render target would
     *   race the active render.
     * @invariant PBO size and read type follow the render target's ACTUAL
     *   `texture.type` — 8 bytes for half-float (RGBA + HALF_FLOAT), 16
     *   bytes for float (RGBA + FLOAT). Do NOT derive them from
     *   `quality.bufferPrecision`: `RenderPipeline.accumFormat()` picks
     *   HalfFloatType whenever full float isn't linearly filterable, so the
     *   requested precision and the allocated type can disagree. Mismatched
     *   sizes/types silently corrupt the readback.
     * @invariant Depth is read from the alpha channel of the
     *   accumulation RT. Anything else in alpha (e.g. coverage during
     *   alpha-pass export) would clobber `engine.lastMeasuredDistance`.
     *   The export path explicitly skips the probe during alpha export;
     *   this tick path does NOT gate on `uOutputPass`.
     */
    tick(
        engine: FractalEngine,
        renderer: THREE.WebGLRenderer,
        tickCount: number,
        postMsg: PostMsgFn
    ): void {
        this._checkFence(engine);
        if (!this._depthPBOPending && tickCount % 3 === 0) {
            this._issueReadback(engine, renderer);
        }
        this._tickFocusPick(engine, renderer, postMsg);
    }

    // ── Phase 1: Check fence ──────────────────────────────────────────────

    private _checkFence(engine: FractalEngine): void {
        if (!this._depthPBOPending || !this._depthFence || !this._depthGL) return;

        const gl = this._depthGL;
        const status = gl.clientWaitSync(this._depthFence, 0, 0); // non-blocking

        if (status === gl.WAIT_FAILED) {
            // Fence failed (e.g. context loss) — drop it and let the next tick
            // issue a fresh readback. Without this the `_depthPBOPending` latch
            // never clears, `_issueReadback` is gated off forever, and
            // `lastMeasuredDistance` / `centerIsSky` freeze at their last values
            // for the rest of the session. Mirrors the WAIT_FAILED branch in
            // `RenderPipeline.pollConvergenceResult`.
            gl.deleteSync(this._depthFence);
            this._depthFence = null;
            this._depthPBOPending = false;
            return;
        }

        // TIMEOUT_EXPIRED — GPU not done yet, try again next tick.
        if (status !== gl.ALREADY_SIGNALED && status !== gl.CONDITION_SATISFIED) return;

        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this._depthPBO);
        if (this._depthPBOHalfFloat) {
            const halfBuf = new Uint16Array(4);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, halfBuf);
            const h = halfBuf[3];
            const sign = (h >> 15) & 1;
            const exp  = (h >> 10) & 0x1F;
            const mant = h & 0x3FF;
            let d: number;
            if      (exp === 0)  d = (sign ? -1 : 1) * mant * Math.pow(2, -24);
            else if (exp === 31) d = NaN;
            else                 d = (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + mant / 1024);
            const hit = isSurfaceHit(d);
            if (hit) engine.lastMeasuredDistance = d;
            engine.centerIsSky = !hit;
        } else {
            const floatBuf = new Float32Array(4);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, floatBuf);
            const d = floatBuf[3];
            const hit = isSurfaceHit(d);
            if (hit) engine.lastMeasuredDistance = d;
            engine.centerIsSky = !hit;
        }
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        gl.deleteSync(this._depthFence);
        this._depthFence = null;
        this._depthPBOPending = false;
    }

    // ── Phase 2: Issue new readback ───────────────────────────────────────

    private _issueReadback(engine: FractalEngine, renderer: THREE.WebGLRenderer): void {
        const rt = engine.pipeline.getPreviousRenderTarget?.();
        if (!rt || rt.width <= 0 || rt.height <= 0) return;

        const gl2 = renderer.getContext() as WebGL2RenderingContext;
        if (gl2.fenceSync) {
            this._depthGL = gl2;
            // The read format follows the target's ACTUAL texture type, never the
            // REQUESTED `quality.bufferPrecision`: `RenderPipeline.accumFormat()`
            // falls back to HalfFloatType whenever full float isn't linearly
            // filterable, so a device can hold a HALF_FLOAT accumulation RT while
            // `bufferPrecision` says Float32. The sync fallback below (and every
            // other readback in the app, via three.js `readRenderTargetPixels`)
            // already derives it this way — see `RenderPipeline.readPixels`.
            const useHalfFloat = rt.texture.type === HalfFloatType;
            this._depthPBOHalfFloat = useHalfFloat;

            if (!this._depthPBO) {
                this._depthPBO = gl2.createBuffer();
                gl2.bindBuffer(gl2.PIXEL_PACK_BUFFER, this._depthPBO);
                gl2.bufferData(gl2.PIXEL_PACK_BUFFER, useHalfFloat ? 8 : 16, gl2.STREAM_READ);
                gl2.bindBuffer(gl2.PIXEL_PACK_BUFFER, null);
            }

            const prevRT = renderer.getRenderTarget();
            renderer.setRenderTarget(rt);
            const cx = Math.floor(rt.width  / 2);
            const cy = Math.floor(rt.height / 2);
            gl2.bindBuffer(gl2.PIXEL_PACK_BUFFER, this._depthPBO);
            gl2.bufferData(gl2.PIXEL_PACK_BUFFER, useHalfFloat ? 8 : 16, gl2.STREAM_READ);
            gl2.readPixels(cx, cy, 1, 1, gl2.RGBA, useHalfFloat ? gl2.HALF_FLOAT : gl2.FLOAT, 0);
            gl2.bindBuffer(gl2.PIXEL_PACK_BUFFER, null);
            this._depthFence = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
            this._depthPBOPending = true;
            renderer.setRenderTarget(prevRT);
        } else {
            // Synchronous fallback — no WebGL2 fenceSync available
            const buf = this._readBuffer;
            const cx = Math.floor(rt.width  / 2);
            const cy = Math.floor(rt.height / 2);
            const ok = engine.pipeline.readPixels?.(renderer, cx, cy, 1, 1, buf);
            if (ok) {
                const d = buf[3];
                const hit = isSurfaceHit(d);
                if (hit) engine.lastMeasuredDistance = d;
                engine.centerIsSky = !hit;
            }
        }
    }

    // ── Focus pick ────────────────────────────────────────────────────────

    /** Snapshot the full depth buffer on the next frame, then send result for the clicked pixel. */
    private _tickFocusPick(
        engine: FractalEngine,
        renderer: THREE.WebGLRenderer,
        postMsg: PostMsgFn
    ): void {
        if (this._focusPickState?.phase !== 'pending') return;
        const rt = engine.pipeline.getPreviousRenderTarget?.();
        if (!rt || rt.width <= 0 || rt.height <= 0) return;

        const w = rt.width, h = rt.height;
        const depthData = new Float32Array(w * h * 4);
        const ok = engine.pipeline.readPixels(renderer, 0, 0, w, h, depthData);
        if (ok) {
            const { id, x, y } = this._focusPickState;
            const px = Math.min(Math.max(Math.floor((x + 1) * 0.5 * w), 0), w - 1);
            const py = Math.min(Math.max(Math.floor((y + 1) * 0.5 * h), 0), h - 1);
            const dist = depthData[(py * w + px) * 4 + 3];
            postMsg({ type: 'FOCUS_RESULT', id, distance: isSurfaceHit(dist) ? dist : -1 });
            this._focusPickState = { phase: 'ready', width: w, height: h, depthData };
        }
    }

    /**
     * @invariant Focus-pick state machine has exactly TWO states —
     *   `FocusPickState` is `pending | ready`; there is no `snapshot`
     *   state, the snapshot is the `pending → ready` transition.
     *   `pending` (set here) → on the next tick the entire depth buffer
     *   is snapshotted, the clicked pixel is read, `FOCUS_RESULT` is
     *   posted, state → `ready` → subsequent `sampleFocusPick` calls
     *   read from the cached snapshot until `endFocusPick` clears it.
     *   A `sampleFocusPick` that arrives while still `pending` does NOT
     *   queue — it answers -1 immediately.
     */
    startFocusPick(id: string, x: number, y: number): void {
        this._focusPickState = { phase: 'pending', id, x, y };
    }

    sampleFocusPick(id: string, x: number, y: number, postMsg: PostMsgFn): void {
        if (this._focusPickState?.phase !== 'ready') {
            postMsg({ type: 'FOCUS_RESULT', id, distance: -1 });
            return;
        }
        const { width: sw, height: sh, depthData } = this._focusPickState;
        const px = Math.min(Math.max(Math.floor((x + 1) * 0.5 * sw), 0), sw - 1);
        const py = Math.min(Math.max(Math.floor((y + 1) * 0.5 * sh), 0), sh - 1);
        const dist = depthData[(py * sw + px) * 4 + 3];
        postMsg({ type: 'FOCUS_RESULT', id, distance: isSurfaceHit(dist) ? dist : -1 });
    }

    endFocusPick(): void {
        this._focusPickState = null;
    }
}
