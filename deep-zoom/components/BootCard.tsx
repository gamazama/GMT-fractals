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
 *      only one since 2026-10-11, 8.5 s cold since the kernel has three call sites (it was 21 to
 *      26 s with seven: grep THREE CALLS OF THE KERNEL in renderer/core.js); and the Mandelbox's from the first switch to
 *      that formula, about 2 s (it was 4.5 to 4.8). "Cold" is the first visit: the renderer gets
 *      both programs onto the browser's disk, so a later visit has them at once, also after the
 *      browser was closed (see `NOTICE`). Until telemetry says `ready` the
 *      picture carries a notice with the seconds counting; nothing is blocked, nothing is clicked,
 *      flying works meanwhile, and it goes at the first sample that says ready. Two sizes, see THE
 *      TWO SIZES.
 *      (The owner, 2026-10-11, asked whether to cover the plain picture with a calm notice: "yes
 *      we can have a 'loading' notice that gets bigger if they navigate to deep view".)
 *      Measured in the production build, 2026-10-11, cold, nine runs: the picture from 0.9 s, 60
 *      frames a second, the notice until ready (8.5 s; 21 to 26 s before 2026-10-12). On the dev server React mounts twice and the
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
 *     - THE MANDELBULB'S PLAIN PICTURE IS A TRUE ONE AT THE START VIEW, AND ON THE LINE A VISITOR
 *       FLIES FIRST NO DEEPER THAN A DEPTH OF 1. Since 2026-10-11 its baseline hits at a pixel's
 *       footprint, as the Mandelbox's does (grep "THE HIT LEVEL IS A PIXEL'S OWN FOOTPRINT" in
 *       renderer/core.js). Until that day it hit about 2,600 times finer than a pixel, at one
 *       sample a pixel, and was speckle at every depth: 61.0 % at the start view, 58 to 65 %
 *       walked in from there down to 5e-4. Measured after the change, the same tools: the start
 *       view 5.9 % (5.2 % as a 1240 x 1024 picture), and it shows the shapes the deep picture
 *       shows. Walked STRAIGHT AHEAD from there, into the middle of the star, where the surface is
 *       all fine rays: 9.5 % at a depth of 1, 16 % at 0.5, 28 % at 0.2, 35 % at 0.1, 49 % at 0.02
 *       (grainy, its lines still the deep picture's), and from 0.01 another picture. With the
 *       camera turned 14 and 17 degrees before the walk, two other lines: 2 to 5 % all the way
 *       down to 1e-3 and the deep picture's shapes; from 2e-4 a smooth smear that shows nothing of
 *       the place (what single precision holds), as the starter views at 3e-17 and deeper are.
 *       So the bulb's row is the depth down to which it held on EVERY line measured, as the
 *       Mandelbox's is: 1. Its notice is SMALL at the start view and LARGE from the first steps
 *       towards the surface.
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
 *   A VIEW THAT WAITS FOR READY IS ALWAYS THE LARGE CARD (2026-10-12). A share link, a loaded scene
 *   or a restored session hands its view over before the renderer can show it: it is parked
 *   (`presetFields.ts`, the host's `setPendingView`) and applied at ready. Until then the camera
 *   stands at the START view, whose plain picture is a true one - of the start view, which is not
 *   the place that was asked for. From 2026-10-11 to that day the notice over it was the small
 *   line, over the start view's picture undimmed, and the picture jumped to the place at ready.
 *   Now the host is asked (`viewParked()`), and while a view is parked the notice is the card,
 *   the picture dimmed under it, whatever the depth shown. The card's words are the same.
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
 * @invariant While a renderer builds, the Mandelbulb's notice is the SMALL line at its start view,
 *   over a picture that is not dimmed, and the LARGE card, the picture dimmed, at a deep view; and
 *   the Mandelbox's is the LARGE card once the camera is deeper than `DZ_PLAIN_DOWN_TO.mandelbox`
 *   - proven by: ENGINE_URL=http://localhost:3410 npm run smoke:deep-zoom -- --stage 2 --step "ray
 *   march is what draws" ("at the start view the picture carries the SMALL notice, one line, not
 *   dimmed ...", "which names the deep renderer ...", "... the LARGE notice at the deep view,
 *   dimmed under it", "which says what is being built ...", "walked in ... it is the LARGE
 *   notice"). Falsified 2026-10-11, twice, one run each: `DZ_PLAIN_DOWN_TO.rayMarch` put back to
 *   `Infinity` -> the first two of those lines red (size "large"), the step's other 17 green; the
 *   size made always small -> the last three red (size "small" at a depth shown of 2.89e-17 and
 *   at 0.00101), the other 16 green. See that step's record.
 * @assumption The rest of what that step says of the notice - the Mandelbox's SMALL line at its
 *   whole-box view, undimmed, and the notice gone at ready for either program - passes and was not
 *   broken on purpose.
 * @assumption The speckle figures above and the two rows of `DZ_PLAIN_DOWN_TO` are one day's
 *   measurements on one machine, in a 600 x 744 picture (debug/scratch/load/, git-ignored:
 *   plain-picture.mts, plain-by-depth.mts, shape-like.mjs, box-plain.mts, notice-shots.mts). No
 *   standing check measures a plain picture, so none would notice the bulb's baseline back at
 *   its old hit level: the start view would be speckle again, under a small line.
 * @assumption While a view is parked the notice is the LARGE card at any depth (A VIEW THAT WAITS
 *   FOR READY above). The host's side has a standing check (`viewParked`: the `@invariant` in
 *   host/moduleHost.ts); that THIS component asks it has none - the smoke's notice step parks no
 *   view. Seen in the app once, 2026-10-12, Chrome on the real GPU, the program's build held for
 *   4 s as the 2026-10-11 tools held it (debug/scratch/small-three/app-parked-card.mts,
 *   git-ignored): a share link to a place at 1.75e-7 opened in a new page showed the card, the
 *   picture dimmed, from 1.0 s until ready at 5.4 s, the camera at the start view all that while,
 *   and at ready the card was gone and the camera was the link's place; the same page opened
 *   with no link showed the small line, undimmed, as before.
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

/** The programs a picture can wait for, as the host names them (`DeepZoomHost.building`). */
type DzBuilding = 'rayMarch' | 'mandelbox' | 'kalibox';

/**
 * Down to which depth the plain picture drawn while each program builds is a true picture of the
 * view; `Infinity`: at no depth. Measured, see THE TWO SIZES in the header. At or above its row the
 * notice is the small line, below it the large card.
 */
export const DZ_PLAIN_DOWN_TO: Readonly<Record<DzBuilding, number>> = { rayMarch: 1, mandelbox: 0.05, kalibox: 0.05 };   // kalibox: the Mandelbox's number, not measured for it (the same plain program with another fold)

/** How long a build must have lasted before the notice shows (see the header). */
export const DZ_NOTICE_AFTER_MS = 400;

/**
 * What each program's notice says. No renderer's inner names: this is read by someone who has just
 * opened the page.
 *
 * "THE FIRST TIME", AND NO MORE THAN THAT. Left to itself the browser keeps a program the renderer
 * built in the background IN MEMORY ONLY, and the wait came back after every restart of the
 * browser (measured 2026-10-11, Chrome 155 on Direct3D, the production build, the browser closed
 * and opened again on three profiles: ready after 23.4 to 25.0 s, as on a first visit; the
 * Mandelbox's program 4.7 to 4.8 s). Since that day the renderer gets both programs onto the
 * browser's disk with one extra draw (grep KEPT ACROSS A BROWSER RESTART in renderer/core.js), and
 * the same restart is ready at 0.38 to 0.39 s, the Mandelbox's program there in 0.04 s. That leans
 * on how that one Chrome behaves, a release that changes the shader is a new program to any cache,
 * and when else a browser drops what it kept was not measured. So the card promises neither "once
 * on this machine" nor "after the browser starts": only that it is the first time that is slow.
 */
const NOTICE: Readonly<Record<DzBuilding, { line: string; title: string; body: string }>> = {
    rayMarch: {
        line: 'Deep renderer building',
        title: 'Building the deep renderer',
        body: 'This can take ten seconds or more the first time. The picture comes by itself when it is ready.',
    },
    mandelbox: {
        line: 'Mandelbox renderer building',
        title: 'Building the Mandelbox renderer',
        body: 'This takes a few seconds the first time. The picture comes by itself when it is ready.',
    },
    kalibox: {
        line: 'KaliBox renderer building',
        title: 'Building the KaliBox renderer',
        body: 'This takes a few seconds the first time. The picture comes by itself when it is ready.',
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
    // A VIEW THAT WAITS FOR READY: the picture under the notice is of the START view, not of the
    // place that was asked for, however true a picture of the start view it is. Asked of the host
    // at each render: while it builds this renders once a second (the count), and a view is parked
    // before the host is mounted (a link, a restored session) or at once when a scene is loaded.
    const parked = compiling && !!host?.viewParked();

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

    const size = seconds === null ? null : plainIsTrue && !parked ? 'small' : 'large';
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
