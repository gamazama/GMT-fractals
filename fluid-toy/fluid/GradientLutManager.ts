/**
 * 1-D LUT textures for the colour gradients sampled by the shader.
 *
 * Two slots: `main` for the Julia/dye colour ramp, `collision` for the
 * B&W mask used by the wall-collision feature. App code uploads a fresh
 * LUT via `setBuffer('main', buf)` whenever the user edits a gradient;
 * the engine calls `ensure(slot)` before each frame's render pass to
 * guarantee a texture is bound.
 *
 * Pulled out of FluidEngine so adding a third gradient (e.g. for a
 * future force-field colour field) means touching this file only.
 */

import { GRADIENT_LUT_WIDTH } from '../constants';

export type GradientSlot = 'main' | 'collision';

export class GradientLutManager {
    private mainTex: WebGLTexture | null = null;
    private collisionTex: WebGLTexture | null = null;
    /** Bumped on every LUT upload so callers (e.g. FluidEngine's TSAA
     *  param hash) can detect a gradient change and reset accumulators
     *  that bake the LUT colour into their output. */
    version = 0;

    constructor(private gl: WebGL2RenderingContext) {}

    getTexture(slot: GradientSlot): WebGLTexture | null {
        return slot === 'main' ? this.mainTex : this.collisionTex;
    }

    /** Upload a packed RGBA LUT (`GRADIENT_LUT_WIDTH * 4` bytes). */
    setBuffer(slot: GradientSlot, buf: Uint8Array): void {
        const gl = this.gl;
        const expected = GRADIENT_LUT_WIDTH * 4;
        if (buf.length !== expected) {
            console.warn(`[GradientLut] ${slot} buffer length ${buf.length} (want ${expected})`);
        }
        let tex = this.getTexture(slot);
        if (!tex) {
            tex = gl.createTexture()!;
            if (slot === 'main') this.mainTex = tex;
            else this.collisionTex = tex;
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GRADIENT_LUT_WIDTH, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        this.version++;
    }

    /** Allocate a fallback LUT if the slot hasn't been uploaded yet.
     *  `main` defaults to a grey ramp, `collision` to all-black (no
     *  walls). Both are harmless placeholders until the app uploads a
     *  real LUT on boot. */
    ensure(slot: GradientSlot): void {
        if (this.getTexture(slot)) return;
        const w = GRADIENT_LUT_WIDTH;
        const buf = new Uint8Array(w * 4);
        if (slot === 'main') {
            for (let i = 0; i < w; ++i) {
                buf[i * 4 + 0] = i;
                buf[i * 4 + 1] = i;
                buf[i * 4 + 2] = i;
                buf[i * 4 + 3] = 255;
            }
        } else {
            for (let i = 0; i < w; ++i) buf[i * 4 + 3] = 255;  // black, opaque
        }
        this.setBuffer(slot, buf);
    }

    dispose(): void {
        const gl = this.gl;
        if (this.mainTex) { gl.deleteTexture(this.mainTex); this.mainTex = null; }
        if (this.collisionTex) { gl.deleteTexture(this.collisionTex); this.collisionTex = null; }
    }
}
