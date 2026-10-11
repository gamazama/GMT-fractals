/**
 * deep-zoom/DeepZoomSurface.tsx — the picture: the one component that mounts the renderer, puts
 * its host in the holder, and has the engine's tick drive it.
 *
 * PURPOSE
 *   Everything else in the shell reaches the renderer through the holder (`host/current.ts`) and
 *   the telemetry store (`host/telemetry.ts`). This file is where a host comes to exist: it
 *   renders `#dz-frame`, calls `mountDeepZoom` on it, and registers the ONE tick that calls
 *   `host.step`. It also owns what happens when there is no picture (the failure handed to
 *   `components/BootCard.tsx`). Flying is not here: `DeepZoomNavigation.tsx`.
 *
 * THE SEAM
 *   - Rendered by `DeepZoomApp.tsx` as a child of the engine's `<ViewportFrame
 *     showModeControls={false}>`. `ViewportFrame` forwards no ref and takes no `tabIndex` or `id`,
 *     so the focusable element is this file's own `<div id="dz-frame" tabIndex={0}>`: the
 *     renderer's key target, size element, scaffold parent and the canvas's parent
 *     (`DZ_FRAME_ID`, `deep-zoom/host/DeepZoomHost.ts` header).
 *   - The mount effect, in order: `mountDeepZoom(frame, hooks)` -> `setHost(host)` ->
 *     `registerTick('deepZoom.step', ...)`. Cleanup in reverse: unregister the tick,
 *     `clearHost(host)`, `host.dispose()` (which removes the canvas it made).
 *   - Nothing else calls `runTicks`: `DeepZoomApp.tsx` mounts `<RenderLoopDriver/>`. Without it
 *     `host.step` never runs and the frame count stays 0.
 *   - Telemetry reaches the engine's chrome from a store subscription, not from React render: the
 *     fps goes to `viewport.reportRenderFps` (the top bar's counter), and the first live sample
 *     takes the HTML splash down.
 *   - Overlays (HUD, boot lines, later the depth scale) are SIBLINGS of `#dz-frame`, never its
 *     children: the canvas is appended to the frame in code, after React's children, and would
 *     paint over them.
 *
 * PITFALLS
 *   - `host.step(now)` takes a TIMESTAMP in milliseconds. The tick's own argument is a delta in
 *     seconds: it is not forwarded.
 *   - STRICTMODE mounts, unmounts and mounts again in dev. Each mount gets a fresh canvas from
 *     `mountDeepZoom`, and the cleanup above leaves nothing registered, so the second
 *     `registerTick` is not dropped as a duplicate name (a duplicate is ignored silently; grep
 *     `_entries.some` in `engine/TickRegistry.ts`).
 *   - A LOST GRAPHICS CONTEXT is not restored by the renderer. The frame's React key is bumped:
 *     the old host is disposed, a new frame and a new host mount, and the view is back at the
 *     renderer's start view (nothing is carried over on purpose: the view that cost the context
 *     would cost it again). A second loss within a minute stops the retries and shows the card.
 *   - On a remount React takes the old frame out of the document before the cleanup disposes its
 *     host. That is harmless (the renderer's dispose needs no attached canvas; a pointer lock
 *     ends when its element leaves), but do not add dispose-time work that reads layout.
 *   - Nothing here captures the pointer and no key reaches the renderer module: the shell's
 *     navigation owns the input (`DeepZoomNavigation.tsx`, `host.setInputOwner('host')`) and
 *     hears its keys on the window. The frame is still focusable, and a click focuses it, so a
 *     click on the picture takes the keyboard out of a text field (a fly key typed in a field is
 *     a character, not a move).
 *   - The frame must not be 0 x 0 at mount (the renderer would draw 2 x 2): it is `absolute
 *     inset-0` in the viewport frame's sized box, and an effect runs after layout.
 */

import React, { useEffect, useRef, useState } from 'react';
import { registerTick, TICK_PHASE } from '../engine/TickRegistry';
import { viewport } from '../engine/plugins/Viewport';
import { showToast } from '../engine/store/toastStore';
import { BootCard, dismissBootSplash } from './components/BootCard';
import type { DzBootFailure } from './components/BootCard';
import type { DeepZoomHost } from './host/DeepZoomHost';
import { DZ_FRAME_ID, clearHost, getHost, setHost } from './host/current';
import { mountDeepZoom } from './host/moduleHost';
import { subscribeTelemetry } from './host/telemetry';

/** The one tick that draws the picture. The stage-1 smoke watches the console for this name
 *  (`[TickRegistry] tick "deepZoom.step" threw`): a throwing tick raises no page error. */
const DZ_TICK_NAME = 'deepZoom.step';

/** Two context losses inside this window stop the remounts and show the card. */
const CONTEXT_LOSS_WINDOW_MS = 60_000;
const CONTEXT_LOSS_LIMIT = 2;

const NOT_STARTED = 'The deep renderer did not start';

export const DeepZoomSurface: React.FC = () => {
    // Bumped on a lost context: the keyed frame below unmounts and a fresh one mounts.
    const [mountKey, setMountKey] = useState(0);
    const [failure, setFailure] = useState<DzBootFailure | null>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const lossTimes = useRef<number[]>([]);
    const failed = failure !== null;

    // Telemetry -> the engine's chrome. Declared before the mount effect so it is listening when
    // the first sample is written. It outlives a remount, so it also sees the reset a disposed
    // host leaves behind and the top bar's counter goes back to "--".
    useEffect(() => {
        // This app reports its renderer's rate from the start: 0 reads "--". Left unreported
        // (-1), the top bar's counter falls back to the store's UI-fps field, which nothing
        // feeds here and which starts at 60: "60 FPS" over a failure card (seen 2026-10-08).
        viewport.reportRenderFps(0);
        return subscribeTelemetry((t, prev) => {
            // The first live sample is written right after the first frame ran: a picture is on
            // screen (the f32 one; the deep shader is still compiling and nobody waits for it).
            if (t.live && !prev.live) dismissBootSplash();
            // Whole numbers: the store skips an equal value, so a steady rate writes nothing.
            viewport.reportRenderFps(t.live ? Math.round(t.fps) : 0);
        });
    }, []);

    useEffect(() => {
        const frame = frameRef.current;
        if (!frame) return;   // a failure is showing: no frame is rendered

        const fail = (f: DzBootFailure) => {
            setFailure(f);
            dismissBootSplash();   // or the splash sits over the card
        };

        // False once this mount is cleaned up: a callback of a disposed host changes nothing.
        let mounted = true;
        let host: DeepZoomHost;
        try {
            host = mountDeepZoom(frame, {
                onNotice: (message) => showToast(message, 'info', 5000),
                onContextLost: () => {
                    if (!mounted) return;
                    const now = performance.now();
                    const recent = lossTimes.current.filter((at) => now - at < CONTEXT_LOSS_WINDOW_MS);
                    recent.push(now);
                    lossTimes.current = recent;
                    if (recent.length >= CONTEXT_LOSS_LIMIT) {
                        fail({
                            title: 'The graphics context was lost',
                            detail: `The browser took the WebGL context away ${recent.length} times within ${CONTEXT_LOSS_WINDOW_MS / 1000} s.`,
                        });
                        return;
                    }
                    showToast('Graphics context lost. The renderer restarted at its start view.', 'warning', 5000);
                    setMountKey((k) => k + 1);
                },
                // A FATAL boot error only (no shader in 120 s, the Mandelbox's shader). A ray march that
                // could not be built does not come here: the host stays up (see the `error` listener below).
                onError: (message) => { if (mounted) fail({ title: NOT_STARTED, detail: message }); },
            });
        } catch (err) {
            // `Error('WebGL2 unavailable')` is the one expected throw; nothing is left in the frame.
            fail({
                title: NOT_STARTED,
                detail: err instanceof Error ? err.message : String(err),
                hint: 'Deep Zoom draws with WebGL2.',
            });
            return;
        }

        setHost(host);

        // THE RAY MARCH'S SHADER COULD NOT BE BUILT (2026-10-11): the host says so once, with
        // `fatal: false` and the line to show (`DZ_RAY_FAILED_TEXT`, host/current.ts). It stays up -
        // the plain picture goes on, the status chip keeps the notice - and nothing draws a deep
        // picture in its place. One toast, 15 s (a click closes it sooner); the chip's notice stays
        // for as long as the host does. A fatal error is `onError` above.
        const offError = host.on('error', (e) => { if (mounted && !e.fatal) showToast(e.message, 'error', 15_000); });

        // PHASE: OVERLAY, the first phase after ANIMATE. The engine's animation tick
        // (`engine.animation`, registered by `installModulation` in
        // engine/animation/modulationTick.ts) runs in ANIMATE and writes the timeline's values
        // into the store synchronously; the route's post-scrub hook, which sets the camera for
        // that frame (deep-zoom/route.ts), has therefore run before this tick draws, so a
        // scrubbed frame is this frame and not the one before. UI-phase ticks (counters,
        // readouts) run after it and see the frame just drawn. Registered at mount, so it is
        // also last among the OVERLAY ticks that registered at boot.
        const unregisterTick = registerTick(DZ_TICK_NAME, TICK_PHASE.OVERLAY, () => host.step(performance.now()));

        return () => {
            mounted = false;
            offError();
            unregisterTick();
            clearHost(host);
            host.dispose();
        };
    }, [mountKey, failed]);

    // The keyboard leaves whatever text field had it (see PITFALLS). No pointer is captured.
    const onFrameClick = () => getHost()?.focus();

    return (
        <>
            {failed ? null : (
                <div
                    key={mountKey}
                    ref={frameRef}
                    id={DZ_FRAME_ID}
                    data-dz-mount={mountKey}
                    tabIndex={0}
                    role="application"
                    aria-label="Deep Zoom picture"
                    onClick={onFrameClick}
                    className="absolute inset-0 overflow-hidden bg-black outline-none cursor-crosshair"
                />
            )}
            <BootCard failure={failure} />
        </>
    );
};
