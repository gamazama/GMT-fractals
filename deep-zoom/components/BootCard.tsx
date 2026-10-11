/**
 * deep-zoom/components/BootCard.tsx — what the picture says about its own start: the slim
 * "deep shader compiling" line over the live picture, the readable card when the renderer did not
 * start, and the hand-off from the page's HTML splash.
 *
 * Three states, in the order a visitor meets them:
 *   1. THE HTML SPLASH (`#dz-boot-splash` in deep-zoom.html, not React) covers everything until
 *      the first frame is drawn. `dismissBootSplash()` takes it down. The page itself removes it
 *      after 12 s whatever happened.
 *   2. THE COMPILE LINE. The renderer draws its f32 picture from the first frame and compiles the
 *      deep (perturbation) shader in the background: the ray march's program, the bulb's only one
 *      since 2026-10-11, about 20 s cold. Until telemetry says `ready` one line sits over the live
 *      picture; nothing is blocked and flying works meanwhile. (Measured in the production build,
 *      2026-10-11, cold, nine runs: the picture from 0.9 s, 60 frames a second, this line until
 *      21 to 26 s. On the dev server React mounts twice and the splash covers that wait instead.)
 *   3. THE FAILURE CARD, only when there is no renderer: `mountDeepZoom` threw
 *      (`WebGL2 unavailable`), the host reported a fatal error (the deep shader could not be
 *      built, or did not land in 120 s), or the browser took the graphics context twice. The
 *      surface has already disposed the host when it hands a failure in. A RAY MARCH THAT COULD
 *      NOT BE BUILT IS THIS CARD: its detail begins with `DZ_RAY_FAILED_TEXT` (host/current.ts).
 *      The bulb has one program and nothing stands in for it.
 *
 * Mounted by `deep-zoom/DeepZoomSurface.tsx` as a SIBLING of `#dz-frame` inside the engine's
 * viewport frame, never as its child: the render canvas is appended to `#dz-frame` in code, after
 * anything React put there, and would paint over it.
 *
 * Stacking is the tier table's (`<Layer tier="shellLoading">`), above the HUD and the viewport
 * overlays; no raw z-index. Labels are names and numbers.
 *
 * On a phone one more line says that flying needs a keyboard and a mouse (plan decision D10): the
 * picture is shown, the fly controls arrive for touch in a later stage.
 */

import React, { useEffect, useState } from 'react';
import { Layer } from '../../components/ui';
import { useMobileLayout } from '../../hooks/useMobileLayout';
import { useDzTelemetry } from '../host/telemetry';

/** The splash element in deep-zoom.html. It lives outside `#root`, so React never renders it. */
const DZ_BOOT_SPLASH_ID = 'dz-boot-splash';

/**
 * Fade the HTML splash out and remove it. Safe to call again, and when the page's own 12 s
 * fallback has already removed it. Called on the first drawn frame, and on any boot failure (the
 * splash would otherwise sit over the failure card or the error page).
 */
export function dismissBootSplash(): void {
    const el = document.getElementById(DZ_BOOT_SPLASH_ID);
    if (!el || el.classList.contains('dz-hidden')) return;
    el.classList.add('dz-hidden');
    // 450 ms fade in the page's CSS; it also covers the first resize, so the reveal does not flash.
    window.setTimeout(() => el.remove(), 500);
}

/** Why there is no picture. `detail` is the renderer's or the browser's own message. */
export interface DzBootFailure {
    title: string;
    detail: string;
    /** One more plain line under the message. */
    hint?: string;
}

const LINE = 'text-[10px] font-mono text-fg-secondary bg-surface-sunken/80 border border-line/10 rounded px-2 py-0.5 whitespace-nowrap';

/** Mounted only while the deep shader compiles, so the count starts when the picture does. */
const CompileLine: React.FC = () => {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const started = performance.now();
        const id = window.setInterval(() => setSeconds(Math.floor((performance.now() - started) / 1000)), 1000);
        return () => window.clearInterval(id);
    }, []);
    return (
        <div role="status" data-dz-boot="compiling" className={LINE}>
            deep shader compiling · {seconds} s
        </div>
    );
};

export const BootCard: React.FC<{ failure: DzBootFailure | null }> = ({ failure }) => {
    // One primitive per selector (see the header of host/telemetry.ts).
    const live = useDzTelemetry((t) => t.live);
    const ready = useDzTelemetry((t) => t.ready);
    const { isMobile } = useMobileLayout();

    if (failure) {
        return (
            <Layer tier="shellLoading" position="absolute" data-dz-boot="failed"
                className="inset-0 flex items-center justify-center p-4 bg-black/70">
                <div role="alert" className="max-w-lg bg-surface-section border border-danger/40 rounded px-5 py-4 select-text">
                    <div className="text-sm font-bold text-danger tracking-wide">{failure.title}</div>
                    <pre className="mt-2 text-[11px] text-fg-secondary whitespace-pre-wrap break-words max-h-60 overflow-auto">{failure.detail}</pre>
                    {failure.hint ? <div className="mt-2 text-[10px] text-fg-dim">{failure.hint}</div> : null}
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-3 text-[11px] px-2.5 py-1.5 bg-line/10 text-fg-secondary border border-line/10 rounded-sm hover:bg-line/15 cursor-pointer"
                    >
                        Reload
                    </button>
                </div>
            </Layer>
        );
    }

    const compiling = live && !ready;
    if (!compiling && !isMobile) return null;

    return (
        <Layer tier="shellLoading" position="absolute" data-dz-boot="lines"
            className="top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
            {compiling ? <CompileLine /> : null}
            {isMobile ? (
                <div data-dz-boot="phone" className={LINE}>Flying needs a keyboard and a mouse</div>
            ) : null}
        </Layer>
    );
};
