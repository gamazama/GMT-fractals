/**
 * deep-zoom/DeepZoomSurface.tsx — the picture: the one component that mounts the renderer, puts
 * its host in the holder, and has the engine's tick drive it.
 *
 * PURPOSE
 *   Everything else in the shell reaches the renderer through the holder (`host/current.ts`) and
 *   the telemetry store (`host/telemetry.ts`). This file is where a host comes to exist: it
 *   renders `#dz-frame`, calls `mountDeepZoom` on it, and registers the ONE tick that calls
 *   `host.step`. It also owns what happens when there is no picture (the failure handed to
 *   `components/BootCard.tsx`) and the click that starts flying.
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
 *   - Keys reach the renderer only while `#dz-frame` has focus (it is the key target). A click
 *     focuses it and asks for the pointer; the browser's own Esc gives the pointer back. The
 *     pointer capture leaves at stage N5 with the engine's navigation.
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

        // PHASE: OVERLAY, the first phase after ANIMATE. The engine's animation tick
        // (`engine.animation`, registered by `installModulation` in
        // engine/animation/modulationTick.ts) runs in ANIMATE and writes the timeline's values
        // into the store synchronously; a store subscription that moves the camera from them
        // (the flight's `camera.u`, stage 6a) has therefore run before this tick draws, so a
        // scrubbed frame is this frame and not the one before. UI-phase ticks (counters,
        // readouts) run after it and see the frame just drawn. Registered at mount, so it is
        // also last among the OVERLAY ticks that registered at boot.
        const unregisterTick = registerTick(DZ_TICK_NAME, TICK_PHASE.OVERLAY, () => host.step(performance.now()));

        return () => {
            mounted = false;
            unregisterTick();
            clearHost(host);
            host.dispose();
        };
    }, [mountKey, failed]);

    const onFrameClick = () => {
        const host = getHost();
        if (!host) return;
        host.focus();
        // Mouse look needs the pointer; the renderer was created with its own click listener off.
        // The browser refuses when it has no user gesture, or for about a second after Esc gave
        // the pointer back: the next click works, so a refusal is not reported. Older browsers
        // return nothing here, hence the optional call.
        host.canvas().requestPointerLock()?.catch(() => undefined);
    };

    return (
        <>
            {failed ? null : (
                <>
                    <div
                        key={mountKey}
                        ref={frameRef}
                        id={DZ_FRAME_ID}
                        data-dz-mount={mountKey}
                        tabIndex={0}
                        role="application"
                        aria-label="Deep Zoom picture"
                        onClick={onFrameClick}
                        className="peer absolute inset-0 overflow-hidden bg-black outline-none cursor-crosshair"
                    />
                    {/* Focus cue: keys fly the camera only while the picture has focus. One thin
                        line along its top edge, not a ring around the whole picture. A sibling,
                        because the canvas would paint over a child. */}
                    <div
                        aria-hidden
                        data-dz-focus-cue
                        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent-400/70 opacity-0 transition-opacity duration-150 peer-focus:opacity-100"
                    />
                </>
            )}
            <BootCard failure={failure} />
        </>
    );
};
