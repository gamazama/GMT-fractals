/**
 * Owns all deep-zoom GPU state: reference-orbit texture, LA merge-tree
 * texture + stage table, AT (Approximation Terms) scalar payload. The
 * Julia render pass calls `bindUniforms()` once per frame to push these
 * onto the active program.
 *
 * Pulled out of FluidEngine so the engine no longer carries deep-zoom
 * fields directly — it owns one DeepZoomController instance and delegates
 * upload/clear via `engine.deepZoom.xxx` calls from app code. The engine
 * folds `controller.version` into its TSAA paramHash so an orbit/LA/AT
 * swap resets the accumulator.
 */

import { ddSub } from '../deepZoom/dd';

type ProgramLike = { uniforms: Record<string, WebGLUniformLocation | null> };

/** Pack a JS f64 as `[mantissa, exp]` for the shader's HDR uniforms.
 *  Plain f32 underflows past ~1e-38; carrying the exponent separately
 *  lets the shader reach zoom 1e-300+. Zero maps to (0, 0). */
const f64ToHDRTuple = (v: number): [number, number] => {
    if (!Number.isFinite(v) || v === 0) return [0, 0];
    const e = Math.floor(Math.log2(Math.abs(v)));
    return [v / Math.pow(2, e), e];
};

const bindUnit = (
    gl: WebGL2RenderingContext,
    unit: number,
    tex: WebGLTexture | null,
    loc: WebGLUniformLocation | null,
): void => {
    if (!tex) return;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
};

export interface ATPayload {
    stepLength: number;
    thresholdC: number;
    sqrEscapeRadius: number;
    refC: [number, number];
    ccoeff: [number, number];
    invZCoeff: [number, number];
}

export interface DeepZoomBindParams {
    center: [number, number];
    centerLow: [number, number];
    zoom: number;
    deepZoomEnabled: boolean;
}

export class DeepZoomController {
    private refOrbitTex: WebGLTexture | null = null;
    private refOrbitTexW = 2048;
    private refOrbitTexH = 0;
    private refOrbitLen = 0;
    /** Centre the orbit was BUILT for. The shader receives
     *  `(paramCenter+paramLow) − (refCenter+refLow)` as a double-double
     *  subtraction so pan/zoom gestures past f64's mantissa floor still
     *  resolve. Captured at upload time. */
    private refOrbitCenter: [number, number] = [0, 0];
    private refOrbitCenterLow: [number, number] = [0, 0];

    private laTableTex: WebGLTexture | null = null;
    private laTableTexW = 1024;
    private laTableTexH = 0;
    private laTotalCount = 0;
    private laStages: Float32Array = new Float32Array(0);
    private laStageCount = 0;
    private laEnabled = false;

    private atPayload: ATPayload | null = null;

    /** Bumped on every state change so the engine can fold this into its
     *  TSAA paramHash — an orbit/LA/AT swap means the underlying
     *  iteration changed, accumulator must reset. */
    version = 0;

    constructor(private gl: WebGL2RenderingContext) {}

    /** True when the orbit is uploaded and has at least 2 samples — gates
     *  the shader's deep branch. Engine reads this to decide whether to
     *  enable deep-zoom rendering for the current frame. */
    hasOrbit(): boolean {
        return this.refOrbitTex !== null && this.refOrbitLen > 1;
    }

    /** Upload a reference orbit. Layout: RGBA32F texels packed as
     *  [Z.re, Z.im, |Z|², 0] per iteration (matches worker output from
     *  `referenceOrbit.ts`). Re-allocates only when the row count
     *  changes; same-row uploads reuse via texSubImage2D. */
    setReferenceOrbit(
        orbit: Float32Array,
        length: number,
        refCenter: [number, number],
        refCenterLow: [number, number] = [0, 0],
    ): void {
        this.refOrbitCenter = [refCenter[0], refCenter[1]];
        this.refOrbitCenterLow = [refCenterLow[0], refCenterLow[1]];
        this.uploadOrbitTexture(orbit, length);
        this.refOrbitLen = length;
        this.version++;
    }

    clearReferenceOrbit(): void {
        this.refOrbitLen = 0;
        this.version++;
    }

    /** Upload a packed LA table (3 RGBA32F texels per node, layout from
     *  `packLATable` in deepZoomWorker.ts) plus a stage-table buffer
     *  (pairs of [laIndex, macroItCount] floats). */
    setLATable(laTable: Float32Array, totalCount: number, stages: Float32Array): void {
        this.uploadLaTexture(laTable, totalCount);
        this.laTotalCount = totalCount;
        this.laStages = stages;
        this.laStageCount = stages.length / 2;
        this.version++;
    }

    setLAEnabled(on: boolean): void {
        this.laEnabled = on;
    }

    clearLATable(): void {
        this.laTotalCount = 0;
        this.laStages = new Float32Array(0);
        this.laStageCount = 0;
        this.version++;
    }

    setAT(payload: ATPayload): void {
        this.atPayload = payload;
        this.version++;
    }

    clearAT(): void {
        if (this.atPayload !== null) {
            this.atPayload = null;
            this.version++;
        }
    }

    /** Bind every deep-zoom uniform on `prog`. `fallbackTex` is bound to
     *  units 6/7 when the orbit/LA texture is absent — leaving samplers
     *  unbound trips driver warnings even when the shader gates them
     *  off. Engine passes its blue-noise texture as the fallback. */
    bindUniforms(
        prog: ProgramLike,
        params: DeepZoomBindParams,
        fallbackTex: WebGLTexture | null,
    ): void {
        const gl = this.gl;
        const deepActive = params.deepZoomEnabled && this.hasOrbit();

        gl.uniform1i(prog.uniforms['uDeepZoomEnabled'], deepActive ? 1 : 0);
        gl.uniform1i(prog.uniforms['uRefOrbitTexW'], this.refOrbitTexW);
        gl.uniform1i(prog.uniforms['uRefOrbitLen'], this.refOrbitLen);

        // DD-sub recovers pan increments past f64's ~16-digit mantissa
        // floor: off = (paramCenter + paramLow) − (refCenter + refLow).
        // Without this, pans below ~1e-15 quantise to f64 ulps.
        const ddOffX = ddSub(
            params.center[0], params.centerLow[0],
            this.refOrbitCenter[0], this.refOrbitCenterLow[0],
        );
        const ddOffY = ddSub(
            params.center[1], params.centerLow[1],
            this.refOrbitCenter[1], this.refOrbitCenterLow[1],
        );
        const offX = ddOffX[0] + ddOffX[1];
        const offY = ddOffY[0] + ddOffY[1];
        const offXHdr = f64ToHDRTuple(offX);
        const offYHdr = f64ToHDRTuple(offY);
        gl.uniform4f(prog.uniforms['uDeepCenterOffset'],
            offXHdr[0], offXHdr[1], offYHdr[0], offYHdr[1]);
        const zoomHdr = f64ToHDRTuple(params.zoom);
        gl.uniform2f(prog.uniforms['uDeepScale'], zoomHdr[0], zoomHdr[1]);

        // Orbit on unit 6, LA on unit 7. Stub-bind fallback when absent.
        bindUnit(gl, 6, this.refOrbitTex ?? fallbackTex, prog.uniforms['uRefOrbit']);

        const laActive = deepActive && this.laEnabled
            && this.laTableTex !== null && this.laTotalCount > 1;
        gl.uniform1i(prog.uniforms['uLAEnabled'], laActive ? 1 : 0);
        gl.uniform1i(prog.uniforms['uLATexW'], this.laTableTexW);
        gl.uniform1i(prog.uniforms['uLATotalCount'], this.laTotalCount);
        gl.uniform1i(prog.uniforms['uLAStageCount'], this.laStageCount);
        if (this.laStageCount > 0) {
            // Stage cap matches the shader's 64-slot uniform array.
            const cap = Math.min(this.laStageCount, 64);
            const stagePack = new Float32Array(cap * 4);
            for (let i = 0; i < cap; i++) {
                stagePack[i * 4 + 0] = this.laStages[i * 2 + 0];
                stagePack[i * 4 + 1] = this.laStages[i * 2 + 1];
            }
            gl.uniform4fv(prog.uniforms['uLAStages[0]'], stagePack);
        }
        bindUnit(gl, 7, this.laTableTex ?? fallbackTex, prog.uniforms['uLATable']);

        const atActive = deepActive && this.atPayload !== null;
        gl.uniform1i(prog.uniforms['uATEnabled'], atActive ? 1 : 0);
        if (this.atPayload) {
            gl.uniform1i(prog.uniforms['uATStepLength'], this.atPayload.stepLength);
            gl.uniform1f(prog.uniforms['uATThresholdC'], this.atPayload.thresholdC);
            gl.uniform1f(prog.uniforms['uATSqrEscapeRadius'], this.atPayload.sqrEscapeRadius);
            gl.uniform2f(prog.uniforms['uATRefC'], this.atPayload.refC[0], this.atPayload.refC[1]);
            gl.uniform2f(prog.uniforms['uATCCoeff'], this.atPayload.ccoeff[0], this.atPayload.ccoeff[1]);
            gl.uniform2f(prog.uniforms['uATInvZCoeff'], this.atPayload.invZCoeff[0], this.atPayload.invZCoeff[1]);
        } else {
            // Inert defaults — gated off, but keep stable to avoid any
            // chance of NaN propagation on stale shader state.
            gl.uniform1i(prog.uniforms['uATStepLength'], 1);
            gl.uniform1f(prog.uniforms['uATThresholdC'], 0);
            gl.uniform1f(prog.uniforms['uATSqrEscapeRadius'], 4);
            gl.uniform2f(prog.uniforms['uATRefC'], 0, 0);
            gl.uniform2f(prog.uniforms['uATCCoeff'], 1, 0);
            gl.uniform2f(prog.uniforms['uATInvZCoeff'], 1, 0);
        }
    }

    dispose(): void {
        const gl = this.gl;
        if (this.refOrbitTex) { gl.deleteTexture(this.refOrbitTex); this.refOrbitTex = null; }
        if (this.laTableTex) { gl.deleteTexture(this.laTableTex); this.laTableTex = null; }
    }

    private uploadOrbitTexture(orbit: Float32Array, length: number): void {
        const gl = this.gl;
        const texW = this.refOrbitTexW;
        const texH = Math.max(1, Math.ceil(length / texW));
        const fullLen = texW * texH * 4;
        // Pad to full rows; shader bounds-clamps `ref` to length-1 anyway.
        const upload = orbit.length >= fullLen
            ? orbit.subarray(0, fullLen)
            : (() => { const u = new Float32Array(fullLen); u.set(orbit); return u; })();

        if (!this.refOrbitTex) {
            this.refOrbitTex = createNearestRGBA32F(gl);
            this.refOrbitTexH = 0;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.refOrbitTex);
        if (texH !== this.refOrbitTexH) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texW, texH, 0, gl.RGBA, gl.FLOAT, upload);
            this.refOrbitTexH = texH;
        } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, texW, texH, gl.RGBA, gl.FLOAT, upload);
        }
    }

    private uploadLaTexture(laTable: Float32Array, totalCount: number): void {
        const gl = this.gl;
        const totalTexels = totalCount * 3;
        const texW = this.laTableTexW;
        const texH = Math.max(1, Math.ceil(totalTexels / texW));
        const fullLen = texW * texH * 4;
        const upload = laTable.length >= fullLen
            ? laTable.subarray(0, fullLen)
            : (() => { const u = new Float32Array(fullLen); u.set(laTable); return u; })();

        if (!this.laTableTex) {
            this.laTableTex = createNearestRGBA32F(gl);
            this.laTableTexH = 0;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.laTableTex);
        if (texH !== this.laTableTexH) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texW, texH, 0, gl.RGBA, gl.FLOAT, upload);
            this.laTableTexH = texH;
        } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, texW, texH, gl.RGBA, gl.FLOAT, upload);
        }
    }
}

const createNearestRGBA32F = (gl: WebGL2RenderingContext): WebGLTexture => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
};
