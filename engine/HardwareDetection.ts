
import type { HardwareProfile } from '../types/viewport';

/**
 * Detect device hardware capabilities.
 * Called once at boot — the result is immutable for the session.
 *
 * When a WebGL2 context is available (worker-side), probes Float32
 * render target support. On the main thread (no GL context), falls
 * back to heuristics (pointer type, viewport width, user agent).
 */
export function detectHardwareProfile(gl?: WebGL2RenderingContext): HardwareProfile {
    const isMobile = typeof window !== 'undefined' && (
        window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    );

    // Probe Float32 render target support if we have a GL context
    let supportsFloat32 = true;
    if (gl) {
        try {
            const fb = gl.createFramebuffer();
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            supportsFloat32 = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteFramebuffer(fb);
            gl.deleteTexture(tex);
        } catch {
            supportsFloat32 = false;
        }
    } else if (isMobile) {
        // Conservative default when no GL context available
        supportsFloat32 = false;
    }

    // Derive tier
    let tier: 'low' | 'mid' | 'high';
    if (isMobile && !supportsFloat32) tier = 'low';
    else if (isMobile) tier = 'mid';
    else tier = 'high';

    return {
        tier,
        isMobile,
        supportsFloat32,
        caps: {
            precisionMode: isMobile ? 1.0 : 0.0,
            bufferPrecision: supportsFloat32 ? 0.0 : 1.0,
            compilerHardCap: isMobile ? 256 : 2000,
        },
    };
}

/**
 * Main-thread hardware detection (no GL context).
 * Uses navigator/viewport heuristics only.
 */
export function detectHardwareProfileMainThread(): HardwareProfile {
    return detectHardwareProfile();
}
