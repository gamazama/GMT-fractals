
import type { HardwareProfile } from '../types/viewport';
import { DEFAULT_HARD_CAP, MOBILE_HARD_CAP } from '../data/constants';

/**
 * Mobile-viewport heuristic shared by hardware detection and runtime
 * layout. Coarse pointer OR viewport < 768px CSS wide. SSR-safe.
 *
 * Re-evaluated per call — it reads live `window.innerWidth`, so the result
 * is NOT fixed for a session: shrinking a desktop window under 768px flips
 * it to true and the resize listener in `hooks/useMobileLayout.ts` pushes
 * that into the store.
 *
 * @invariant This is the INTENDED home of the 768px / `(pointer: coarse)`
 *   predicate, but it is NOT yet the only copy — do not trust the threshold
 *   here as globally authoritative. Exactly two call sites import it
 *   (`hooks/useMobileLayout.ts` and `detectHardwareProfile` below); eight
 *   inline re-implementations of the same test survive and must be changed
 *   in lockstep:
 *     - `store/slices/uiSlice.ts` `checkIsMobile` — dock left→right remap
 *     - `store/slices/uiSlice.ts` slice initializer — seeds `isDeviceMobile`
 *       at store construction. This is the BOOT value; changing the
 *       threshold *here alone* leaves boot on the old one until the first
 *       resize event (verified by mutation — see the rules file).
 *     - `store/slices/viewportSlice.ts` `isMobile` — default DPR
 *     - `components/layout/Dock.tsx` `checkIsMobile`
 *     - `engine-gmt/renderer/GmtRendererCanvas.tsx`
 *     - `engine-gmt/components/FormulaPicker/FormulaPicker.tsx` (x2)
 *     - `palette/store/favientsPanelPersist.ts` `isMobileBoot`
 *   `gradient-explorer`'s `MOBILE_BREAKPOINT` is deliberately NOT one of
 *   these — it is a width-only layout-fit threshold, not device detection.
 */
export function isMobileViewport(): boolean {
    return typeof window !== 'undefined' && (
        window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    );
}

/**
 * Detect device hardware capabilities.
 *
 * NOT once-per-session and NOT immutable, despite the shape of the API.
 * Three in-tree call sites, all through `detectHardwareProfileMainThread()`:
 * `hooks/useAppStartup.ts` at boot, `engine-gmt/engine/FractalEngine.ts`
 * when it seeds `isMobile`, and `engine-gmt/components/panels/
 * HardwarePreferences.tsx` on the user's "reset to detected" click. Because
 * `isMobileViewport()` reads live `innerWidth`, a resize across 768px
 * changes what a later call returns.
 *
 * The `gl` branch probes Float32 render-target support and was written for
 * worker-side use, but NO in-tree caller passes a context today — every
 * caller lands in the no-GL heuristic fallback.
 *
 * @invariant Not cached — each call *with a GL context* allocates and
 *   deletes a 1x1 RGBA32F framebuffer + texture. Safe to call repeatedly
 *   but not free; detect once at boot.
 * @invariant `compilerHardCap` flattens both mobile tiers to
 *   `MOBILE_HARD_CAP` (256); desktop uses `DEFAULT_HARD_CAP` (2000).
 *   Units are raymarch/DE loop iteration count, not pixels.
 */
export function detectHardwareProfile(gl?: WebGL2RenderingContext): HardwareProfile {
    const isMobile = isMobileViewport();

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
            compilerHardCap: isMobile ? MOBILE_HARD_CAP : DEFAULT_HARD_CAP,
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
