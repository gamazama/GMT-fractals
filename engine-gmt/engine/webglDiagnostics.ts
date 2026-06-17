/**
 * Boot diagnostics — a main-thread WebGL2 capability probe used by the
 * loading screen's "Engine failed to start" panel.
 *
 * The renderer runs in a Web Worker on an OffscreenCanvas, so when it
 * fails (or silently produces no frame — the classic mobile-GPU black
 * viewport) the worker's own GL errors aren't visible. This probe runs a
 * throwaway WebGL2 context on the MAIN thread to capture the same
 * environment the worker sees (GPU, precision, extensions), so the user
 * gets an actionable report they can one-tap send via feedback — and we
 * can diagnose devices we don't physically have.
 *
 * Pure + defensive: never throws (returns a partial report on any error),
 * cleans up its throwaway canvas, and runs in well under a frame.
 */

// Injected by Vite's `define` from package.json (see vite.config.ts).
declare const __APP_VERSION__: string;

const yn = (b: boolean) => (b ? 'yes' : 'NO');

export const collectBootDiagnostics = (): string => {
    const lines: string[] = [];
    const push = (k: string, v: unknown) => lines.push(`${k}: ${v}`);

    try {
        push('app', typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?');
        push('url', location.href);
        push('ua', navigator.userAgent);
        push('dpr', window.devicePixelRatio);
        push('screen', `${window.screen?.width}x${window.screen?.height}`);
        push('OffscreenCanvas', yn(typeof OffscreenCanvas !== 'undefined'));
        push(
            'transferControlToOffscreen',
            yn(typeof HTMLCanvasElement !== 'undefined' &&
               typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function'),
        );
    } catch { /* keep whatever we gathered */ }

    let canvas: HTMLCanvasElement | null = null;
    try {
        canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl2') as WebGL2RenderingContext | null);
        if (!gl) {
            push('WebGL2', 'UNAVAILABLE (getContext("webgl2") returned null)');
            return lines.join('\n');
        }
        push('WebGL2', 'yes');

        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
            push('GPU vendor', gl.getParameter((dbg as any).UNMASKED_VENDOR_WEBGL));
            push('GPU renderer', gl.getParameter((dbg as any).UNMASKED_RENDERER_WEBGL));
        } else {
            push('GPU', '(WEBGL_debug_renderer_info blocked)');
        }

        push('GL version', gl.getParameter(gl.VERSION));
        push('GLSL version', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
        push('max texture size', gl.getParameter(gl.MAX_TEXTURE_SIZE));
        push('max frag uniforms', gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS));
        push('max varyings', gl.getParameter(gl.MAX_VARYING_VECTORS));

        // highp in the FRAGMENT shader is the raymarcher's hard requirement —
        // a device that only offers mediump here produces NaN/garbage (black).
        const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        push('fragment highp float', hp && hp.precision > 0 ? `yes (precision ${hp.precision})` : 'NO — likely the cause');

        // Float render targets / linear filtering — accumulation + HDR need these.
        const exts = ['EXT_color_buffer_float', 'OES_texture_float_linear', 'EXT_float_blend', 'EXT_color_buffer_half_float'];
        for (const e of exts) push(`ext ${e}`, yn(!!gl.getExtension(e)));
    } catch (err) {
        push('probe error', err instanceof Error ? err.message : String(err));
    } finally {
        // Drop the throwaway context promptly.
        try { canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
    }

    return lines.join('\n');
};
