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
import type { FractalEngine } from '../FractalEngine';
import type { WorkerToMainMessage } from './WorkerProtocol';

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
            if (d > 0 && d < 1000 && Number.isFinite(d)) engine.lastMeasuredDistance = d;
        } else {
            const floatBuf = new Float32Array(4);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, floatBuf);
            const d = floatBuf[3];
            if (d > 0 && d < 1000 && Number.isFinite(d)) engine.lastMeasuredDistance = d;
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
            const useHalfFloat = (engine as any).pipeline?._qualityState?.bufferPrecision > 0.5;
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
                if (d > 0 && d < 1000 && Number.isFinite(d)) engine.lastMeasuredDistance = d;
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
            postMsg({ type: 'FOCUS_RESULT', id, distance: (dist > 0 && dist < 1000) ? dist : -1 });
            this._focusPickState = { phase: 'ready', width: w, height: h, depthData };
        }
    }

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
        postMsg({ type: 'FOCUS_RESULT', id, distance: (dist > 0 && dist < 1000) ? dist : -1 });
    }

    endFocusPick(): void {
        this._focusPickState = null;
    }
}
