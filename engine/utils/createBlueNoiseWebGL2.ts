/**
 * @engine/utils/blue-noise-webgl2 — raw-WebGL2 blue-noise texture loader.
 *
 * The engine already ships a THREE-based loader at
 * `data/BlueNoiseData.ts` which most GMT-style apps use. This variant is
 * for apps that manage their own raw `WebGL2RenderingContext` (no THREE
 * middleware) — currently fluid-toy's FluidEngine. It fetches the same
 * `public/blueNoise.png` asset, uploads via `texImage2D`, and returns the
 * WebGL texture object along with its intrinsic resolution.
 *
 * Behaviour:
 *   - Repeat wrapping + linear filtering (matches GMT's THREE setup).
 *   - Caller decides where to bind the texture; this helper only creates
 *     + uploads.
 *   - Fetches asynchronously. Before `onLoad` fires, the returned texture
 *     is a 1×1 neutral fallback (0.5, 0.5, 0.5, 0.5) so shaders don't
 *     sample garbage during the first frames.
 *   - Same path (`/blueNoise.png`) as the THREE loader — one asset, two
 *     consumers.
 */

export interface BlueNoiseTexture {
    /** The WebGL texture — bind with `gl.bindTexture(gl.TEXTURE_2D, tex)`. */
    texture: WebGLTexture;
    /** Intrinsic resolution of the loaded PNG in pixels. 64×64 until
     *  async load completes, then the real size (typically 1024×1024).
     *  Feed into the shader's `uBlueNoiseResolution` uniform. */
    getResolution: () => [number, number];
}

export const createBlueNoiseWebGL2 = (
    gl: WebGL2RenderingContext,
    url: string = '/blueNoise.png',
    onLoad?: (w: number, h: number) => void,
): BlueNoiseTexture => {
    const texture = gl.createTexture();
    if (!texture) throw new Error('[createBlueNoiseWebGL2] failed to allocate texture');

    // Start with a 1×1 neutral fallback so sampling before load doesn't
    // pull whatever was in driver memory.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([128, 128, 128, 128]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    let resolution: [number, number] = [64, 64];

    // Async load + upload. If the page is torn down mid-load the texture
    // is already the fallback — no leak, no crash.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img,
        );
        resolution = [img.naturalWidth, img.naturalHeight];
        if (onLoad) onLoad(resolution[0], resolution[1]);
    };
    img.onerror = (e) => {
        console.warn('[createBlueNoiseWebGL2] failed to load', url, e);
    };
    img.src = url;

    return {
        texture,
        getResolution: () => resolution,
    };
};
