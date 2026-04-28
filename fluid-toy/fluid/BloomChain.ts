/**
 * Jimenez-style 2-level dual-filter bloom chain.
 *
 * Pipeline (`process`):
 *   1. caller renders the bloom source into our half-res FBO `a`
 *   2. extract → `b` (quarter-res)
 *   3. downsample → `c` (eighth-res)
 *   4. copy `b` → `a` (decoupled "previous" for the upsample)
 *   5. upsample `c` + `a` → `b`
 *
 * Final glow texture = `b.tex`. Returns null when bloom is disabled
 * (caller threshold check) so the engine knows to skip the chain.
 *
 * Owns the three bloom programs + three scratch FBOs. Pulled out of
 * FluidEngine so adding a third bloom level (or swapping the algorithm
 * for a different post-FX chain) means touching this file only.
 */

import { BLOOM_SOFT_KNEE } from '../constants';
import {
    VERT_FULLSCREEN,
    FRAG_BLOOM_EXTRACT,
    FRAG_BLOOM_DOWN,
    FRAG_BLOOM_UP,
} from './shaders';
import type { FBO, Program } from './FluidEngine';

export interface BloomDeps {
    gl: WebGL2RenderingContext;
    linkProgram: (vs: string, fs: string, uniformNames: string[]) => Program;
    drawQuad: () => void;
    bindFBO: (fbo: FBO) => void;
    useProgram: (p: Program) => void;
    bindTex: (unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null) => void;
    createFBO: (w: number, h: number) => FBO;
    deleteFBO: (fbo: FBO | null | undefined) => void;
}

export class BloomChain {
    private a: FBO | null = null;  // half-res — extraction src + final upsample "prev"
    private b: FBO | null = null;  // quarter-res — extraction dst + final glow
    private c: FBO | null = null;  // eighth-res — intermediate
    private dirty = true;

    private extract: Program;
    private down: Program;
    private up: Program;

    constructor(private deps: BloomDeps) {
        this.extract = deps.linkProgram(VERT_FULLSCREEN, FRAG_BLOOM_EXTRACT,
            ['uTexel', 'uSource', 'uThreshold', 'uSoftKnee']);
        this.down = deps.linkProgram(VERT_FULLSCREEN, FRAG_BLOOM_DOWN,
            ['uTexel', 'uSource']);
        this.up = deps.linkProgram(VERT_FULLSCREEN, FRAG_BLOOM_UP,
            ['uTexel', 'uSource', 'uPrev', 'uIntensity']);
    }

    /** Mark the FBO chain stale so next `process` reallocates at the
     *  current canvas size. Call when the canvas resizes. */
    markResize(): void { this.dirty = true; }

    /**
     * Run the bloom chain.
     *
     * @param canvasW / canvasH  Current canvas pixel size — drives FBO resize.
     * @param threshold          Bright-pass threshold from `params.bloomThreshold`.
     * @param renderSource       Caller-provided: render the bloom input into
     *                           the FBO we hand back. Typically a clean (no
     *                           tone-mapping) display pass.
     * @returns The final glow texture, ready to sample as `uBloom`.
     */
    process(
        canvasW: number,
        canvasH: number,
        threshold: number,
        renderSource: (target: FBO) => void,
    ): WebGLTexture {
        this.ensure(canvasW, canvasH);
        const a = this.a!, b = this.b!, c = this.c!;
        const { gl, drawQuad, bindFBO, useProgram, bindTex } = this.deps;

        bindFBO(a);
        renderSource(a);

        bindFBO(b);
        useProgram(this.extract);
        gl.uniform2f(this.extract.uniforms['uTexel'], b.texel[0], b.texel[1]);
        bindTex(0, a.tex, this.extract.uniforms['uSource']);
        gl.uniform1f(this.extract.uniforms['uThreshold'], threshold);
        gl.uniform1f(this.extract.uniforms['uSoftKnee'], BLOOM_SOFT_KNEE);
        drawQuad();

        bindFBO(c);
        useProgram(this.down);
        gl.uniform2f(this.down.uniforms['uTexel'], b.texel[0], b.texel[1]);
        bindTex(0, b.tex, this.down.uniforms['uSource']);
        drawQuad();

        // Copy b → a so the upsample can read both b and a without a
        // render-to-self conflict on b.
        bindFBO(a);
        useProgram(this.down);
        gl.uniform2f(this.down.uniforms['uTexel'], b.texel[0], b.texel[1]);
        bindTex(0, b.tex, this.down.uniforms['uSource']);
        drawQuad();

        bindFBO(b);
        useProgram(this.up);
        gl.uniform2f(this.up.uniforms['uTexel'], c.texel[0], c.texel[1]);
        bindTex(0, c.tex, this.up.uniforms['uSource']);
        bindTex(1, a.tex, this.up.uniforms['uPrev']);
        gl.uniform1f(this.up.uniforms['uIntensity'], 1.0);
        drawQuad();

        return b.tex;
    }

    dispose(): void {
        const { gl, deleteFBO } = this.deps;
        deleteFBO(this.a);
        deleteFBO(this.b);
        deleteFBO(this.c);
        gl.deleteProgram(this.extract.prog);
        gl.deleteProgram(this.down.prog);
        gl.deleteProgram(this.up.prog);
    }

    private ensure(W: number, H: number): void {
        if (!this.dirty && this.a && this.b && this.c) return;
        const { deleteFBO, createFBO } = this.deps;
        deleteFBO(this.a);
        deleteFBO(this.b);
        deleteFBO(this.c);
        // Even-aligned half/quarter/eighth, floor-clamped so tiny canvases
        // don't produce 0-sized FBOs.
        const w2 = Math.max(4, (W >> 1) & ~1);
        const h2 = Math.max(4, (H >> 1) & ~1);
        const w4 = Math.max(2, (W >> 2) & ~1);
        const h4 = Math.max(2, (H >> 2) & ~1);
        const w8 = Math.max(2, (W >> 3) & ~1);
        const h8 = Math.max(2, (H >> 3) & ~1);
        this.a = createFBO(w2, h2);
        this.b = createFBO(w4, h4);
        this.c = createFBO(w8, h8);
        this.dirty = false;
    }
}
