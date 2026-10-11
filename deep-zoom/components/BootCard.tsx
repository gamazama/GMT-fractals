/**
 * deep-zoom/components/BootCard.tsx — what the picture says about its own start: the loading notice
 * while a renderer is being built (a centred card, or one line where the plain picture can be
 * trusted), the readable card when the renderer did not start, and the hand-off from the page's
 * HTML splash.
 *
 * Three states, in the order a visitor meets them:
 *   1. THE HTML SPLASH (`#dz-boot-splash` in deep-zoom.html, not React) covers everything until
 *      the first frame is drawn. `dismissBootSplash()` takes it down. The page itself removes it
 *      after 12 s whatever happened.
 *   2. THE LOADING NOTICE. The renderer draws its plain single-precision picture from the first
 *      frame and builds the deep shader in the background: the ray march's program, the bulb's
 *      only one since 2026-10-11, 21 to 26 s cold; and the Mandelbox's from the first switch to
 *      that formula, about 5 s (4.5 measured). "Cold" is the first visit after the browser was
 *      started, not the first on the machine (see `NOTICE`). Until telemetry says `ready` the
 *      picture carries a notice with the seconds counting; nothing is blocked, nothing is clicked,
 *      flying works meanwhile, and it goes at the first sample that says ready. Two sizes, see THE
 *      TWO SIZES.
 *      (The owner, 2026-10-11, asked whether to cover the plain picture with a calm notice: "yes
 *      we can have a 'loading' notice that gets bigger if they navigate to deep view".)
 *      Measured in the production build, 2026-10-11, cold, nine runs: the picture from 0.9 s, 60
 *      frames a second, the notice until 21 to 26 s. On the dev server React mounts twice and the
 *      splash covers that wait instead.
 *   3. THE FAILURE CARD, only when there is no renderer: `mountDeepZoom` threw
 *      (`WebGL2 unavailable`), the host reported a fatal error (the deep shader could not be
 *      built, or did not land in 120 s), or the browser took the graphics context twice. The
 *      surface has already disposed the host when it hands a failure in. A RAY MARCH THAT COULD
 *      NOT BE BUILT IS THIS CARD: its detail begins with `DZ_RAY_FAILED_TEXT` (host/current.ts).
 *      The bulb has one program and nothing stands in for it.
 *
 * THE TWO SIZES
 *   LARGE, a centred card over a dimmed picture, wherever the plain picture under it is NOT a true
 *   picture of the view. SMALL, one line at the top, where it is. Which it is was measured, not
 *   assumed (2026-10-11, real GPU, a 600 x 744 picture, the build held back so the plain picture
 *   could be looked at; "speckle" is the share of pixels whose brightness is more than 24 levels
 *   from the mean of their four neighbours, and every deep picture measures 0.0 to 0.2 %):
 *     - THE MANDELBULB'S PLAIN PICTURE IS NOT A PICTURE OF THE VIEW AT ANY DEPTH. It is speckle from
 *       the start view down: 61 % there (and 90 % of its pixels differ from the picture after
 *       ready), 58 % at the starter dives' first view, 58 to 65 % walked in from the start view
 *       down to 3e-4, 43 % at 3e-3. Below what single precision holds it is a smear that shows
 *       nothing of the place (the starter views at 3e-17 and deeper). Nothing the shell sends
 *       changes that: with 32 iterations in place of the 14 it starts with, 61.4 %. The cause is
 *       the baseline's hit level in renderer/core.js (grep `u.prec,5e-7`: the surface is resolved
 *       2,600 times finer than a pixel at the start view, one sample a pixel); with that one
 *       number at a pixel's footprint the same view measures 7.7 % and is a picture. So the bulb's
 *       row below is "at no depth": its notice is LARGE from the page opening to ready.
 *     - THE MANDELBOX'S PLAIN PICTURE IS A TRUE ONE WHILE THE VIEW IS SHALLOW (its baseline hits at
 *       a pixel's footprint: grep "the box is drawn with three times" in core.js): 1.6 % at the
 *       whole-box view a switch of formula goes to, 5 to 9 % down to a depth of 0.05 on two lines
 *       of approach. Deeper it comes apart, sooner or later by the line (20 % at 0.02 on one, 12 %
 *       at 0.005 on the other; by 1e-3 it is another picture than the deep one). So the box's
 *       notice is SMALL down to `DZ_PLAIN_DOWN_TO.mandelbox` and LARGE below: a kept place, a dive
 *       or a scene that puts the camera deep while the box's program is still being built.
 *   "Deep" is THE DEPTH THE APP SHOWS (`navigationState.ts`: what is in the middle of the picture,
 *   read by rays on the CPU 8 times a second, so it is there before any deep program is), against
 *   the row of the program that is being built (the host's `compile` events, as the top bar's chip
 *   hears them). No reading yet counts as deep.
 *   A view that waits for ready (a share link, a scene: `presetFields.ts` parks it) needs no test of
 *   its own: it waits for the bulb's program, and that notice is LARGE at any view.
 *
 * NOT BEFORE `DZ_NOTICE_AFTER_MS`. With the program still held by the browser (a later visit in
 * the same browser session) `ready` comes one or two telemetry samples after the first frame (0.09
 * to 0.15 s, measured 2026-10-11): a card that showed at once would flash on every such visit. The
 * count still starts with the picture.
 *
 * Mounted by `deep-zoom/DeepZoomSurface.tsx` as a SIBLING of `#dz-frame` inside the engine's
 * viewport frame, never as its child: the render canvas is appended to `#dz-frame` in code, after
 * anything React put there, and would paint over it.
 *
 * Stacking is the tier table's (`<Layer tier="shellLoading">`), above the HUD and the viewport
 * overlays; no raw z-index. The notice takes no pointer: a drag on the dimmed picture still looks.
 *
 * On a phone one more line says that flying needs a keyboard and a mouse (plan decision D10): the
 * picture is shown, the fly controls arrive for touch in a later stage.
 *
 * @invariant While a renderer builds, the notice is the LARGE card for the Mandelbulb, at the start
 *   view and at a deep one, and for the Mandelbox once the camera is deeper than
 *   `DZ_PLAIN_DOWN_TO.mandelbox` - proven by: ENGINE_URL=http://localhost:3410 npm run
 *   smoke:deep-zoom -- --stage 2 --step "ray march is what draws" ("at the start view the picture
 *   carries the LARGE notice ...", "which says what is being built ...", "... the LARGE notice at
 *   the deep view too", "walked in ... it is the LARGE notice"). Falsified 2026-10-11: the size
 *   made always small -> those four lines red, see that step's record.
 * @assumption The rest of what that step says of the notice - the Mandelbox's SMALL line at its
 *   whole-box view, undimmed, and the notice gone at ready for either program - passes and was not
 *   broken on purpose.
 * @assumption The speckle figures above and the two rows of `DZ_PLAIN_DOWN_TO` are one day's
 *   measurements on one machine (debug/scratch/load/, git-ignored: plain-picture.mts,
 *   plain-by-depth.mts, box-plain.mts, notice-shots.mts). No standing check measures a plain
 *   picture. If the bulb's baseline is given the box's hit level, its row becomes a depth and the
 *   start view's notice a line.
 * @assumption `DZ_NOTICE_AFTER_MS` hides the notice on a cached start. Measured on the dev server
 *   and in the production build that day (warm-flash.mts, same folder); no standing check opens a
 *   page twice.
 */

import React, { useEffect, useState } from 'react';
import { Layer } from '../../components/ui';
import { useMobileLayout } from '../../hooks/useMobileLayout';
import { useHost } from '../host/current';
import { useDzTelemetry } from '../host/telemetry';
import { useDzNavigation } from '../navigationState';

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

/** The two programs a picture can wait for, as the host names them (`DeepZoomHost.building`). */
type DzBuilding = 'rayMarch' | 'mandelbox';

/**
 * Down to which depth the plain picture drawn while each program builds is a true picture of the
 * view; `Infinity`: at no depth. Measured, see THE TWO SIZES in the header. At or above its row the
 * notice is the small line, below it the large card.
 */
export const DZ_PLAIN_DOWN_TO: Readonly<Record<DzBuilding, number>> = { rayMarch: Infinity, mandelbox: 0.05 };

/** How long a build must have lasted before the notice shows (see the header). */
export const DZ_NOTICE_AFTER_MS = 400;

/**
 * What each program's notice says. No renderer's inner names: this is read by someone who has just
 * opened the page.
 *
 * "THE FIRST TIME AFTER THE BROWSER STARTS", NOT "ONCE ON THIS MACHINE" (measured 2026-10-11, Chrome
 * 155 on Direct3D, the production build, one profile, the browser restarted between visits): a
 * program the renderer builds in the background is kept by the browser IN MEMORY ONLY. A later visit
 * in the same browser session has it in 0.04 s; after a restart it is built again in full (21.1 and
 * 20.3 s for the ray march's, where its three small programs, built the blocking way, came off the
 * disk in 0.00 s). If the renderer is made to get these two programs onto the browser's disk (one
 * extra draw did it in that measurement: 0.04 s after a restart), this can say "once on this
 * machine".
 */
const NOTICE: Readonly<Record<DzBuilding, { line: string; title: string; body: string }>> = {
    rayMarch: {
        line: 'Deep renderer building',
        title: 'Building the deep renderer',
        body: 'This takes about half a minute the first time after the browser starts. The picture comes by itself when it is ready.',
    },
    mandelbox: {
        line: 'Mandelbox renderer building',
        title: 'Building the Mandelbox renderer',
        body: 'This takes a few seconds the first time after the browser starts. The picture comes by itself when it is ready.',
    },
};

const LINE = 'text-[10px] font-mono text-fg-secondary bg-surface-sunken/80 border border-line/10 rounded px-2 py-0.5 whitespace-nowrap';

/** Whole seconds a build has lasted, counted from the moment `on` turned true (the plain picture's
 *  first frame); null while nothing builds and for the first `DZ_NOTICE_AFTER_MS` of a build. */
function useBuildSeconds(on: boolean): number | null {
    const [seconds, setSeconds] = useState<number | null>(null);
    useEffect(() => {
        if (!on) return undefined;
        const started = performance.now();
        const count = () => setSeconds(Math.floor((performance.now() - started) / 1000));
        const show = window.setTimeout(count, DZ_NOTICE_AFTER_MS);
        const id = window.setInterval(count, 1000);
        return () => {
            window.clearTimeout(show);
            window.clearInterval(id);
            setSeconds(null);
        };
    }, [on]);
    return seconds;
}

export const BootCard: React.FC<{ failure: DzBootFailure | null }> = ({ failure }) => {
    // One primitive per selector (see the header of host/telemetry.ts).
    const live = useDzTelemetry((t) => t.live);
    const ready = useDzTelemetry((t) => t.ready);
    const { isMobile } = useMobileLayout();

    // WHICH program is being built: the host's `compile` events by name, as the top bar's chip hears
    // them (they are said in the same poll that writes the telemetry). This component is mounted
    // for the life of the surface, so none is missed; a host that is already building when it
    // arrives here is asked once.
    const host = useHost();
    const [building, setBuilding] = useState<DzBuilding>('rayMarch');
    useEffect(() => {
        setBuilding(host?.building() ?? 'rayMarch');
        if (!host) return undefined;
        return host.on('compile', (e) => {
            if (e.what === 'variant' && e.state === 'compiling') setBuilding(e.variant ?? 'rayMarch');
        });
    }, [host]);

    const compiling = live && !ready && !failure;
    const seconds = useBuildSeconds(compiling);
    // THE TWO SIZES: is the plain picture under the notice a true picture of this view? A boolean,
    // so a moving camera re-renders this only when it crosses the line.
    const plainIsTrue = useDzNavigation((s) => s.depth >= DZ_PLAIN_DOWN_TO[building]);

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

    const size = seconds === null ? null : plainIsTrue ? 'small' : 'large';
    if (!size && !isMobile) return null;
    const notice = NOTICE[building];

    return (
        <>
            {size === 'large' ? (
                <Layer tier="shellLoading" position="absolute" data-dz-boot="notice"
                    className="inset-0 flex items-center justify-center p-4 bg-black/60 pointer-events-none select-none">
                    {/* The count is not read out: a live region that changed every second would be. */}
                    <div role="status" data-dz-boot="compiling" data-dz-notice="large" data-dz-notice-for={building}
                        className="max-w-xs bg-surface-section border border-line/15 rounded px-5 py-4 text-center">
                        <div className="text-sm font-bold text-fg tracking-wide">{notice.title}</div>
                        <div className="mt-2 text-[11px] leading-snug text-fg-secondary">{notice.body}</div>
                        <div aria-hidden="true" data-dz-notice-seconds className="mt-3 text-[11px] font-mono tabular-nums text-fg-tertiary">{seconds} s</div>
                    </div>
                </Layer>
            ) : null}
            {size === 'small' || isMobile ? (
                <Layer tier="shellLoading" position="absolute" data-dz-boot="lines"
                    className="top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
                    {size === 'small' ? (
                        <div role="status" data-dz-boot="compiling" data-dz-notice="small" data-dz-notice-for={building} className={LINE}>
                            {notice.line}<span aria-hidden="true"> · {seconds} s</span>
                        </div>
                    ) : null}
                    {isMobile ? (
                        <div data-dz-boot="phone" className={LINE}>Flying needs a keyboard and a mouse</div>
                    ) : null}
                </Layer>
            ) : null}
        </>
    );
};
