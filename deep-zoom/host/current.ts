/**
 * deep-zoom/host/current.ts - the holder: where the mounted `DeepZoomHost` is found, plus the two
 * DOM ids the host contract fixes.
 *
 * PURPOSE
 *   Panels, shortcuts, preset fields and store subscriptions all need the host, and none of them
 *   sits under the component that mounts it. A React context cannot reach them (a DDFS widget
 *   mounts in another subtree; a shortcut handler is not React at all), so the host lives in one
 *   engine holder (`defineAppHandles`, `engine/appHandles.ts`) and everyone reads it from here.
 *   The host is NOT in the engine store: it is a live object, not state.
 *
 * THE SEAM
 *   - Written by exactly one place: the mount effect in `deep-zoom/DeepZoomSurface.tsx`.
 *     Mount: `setHost(host)`. Cleanup: `clearHost(host)`, then `host.dispose()`.
 *   - Read by everything else in `deep-zoom/`:
 *       `getHost()`        handlers, subscriptions, ticks. null when no host is mounted.
 *       `useHost()`        React. Re-renders when the holder is given another host or emptied.
 *       `subscribeHost()`  non-React code that must act when a host appears or goes (push the
 *                          parameters once, apply a parked view).
 *   - The contract is `deep-zoom/host/DeepZoomHost.ts`. Its header says what each member does.
 *   - Smokes: on the dev server the holder is `globalThis.__appHandles['deep-zoom.host']` and the
 *     host is its `.ref.current`. A production build publishes nothing (grep `__appHandles` in
 *     `engine/appHandles.ts`).
 *
 * PITFALLS
 *   - `getHost()` is null before the surface mounts, between StrictMode's two mounts and across a
 *     context-loss remount. Read it again after every `await`; never keep a host in a closure.
 *   - `useHost()` does not re-render when the renderer's STATE changes, only when the host object
 *     is replaced. Live numbers come from `deep-zoom/host/telemetry.ts`.
 *   - Clean up with `clearHost(host)`, not `setHost(null)`: it empties the holder only if it still
 *     holds that host, so a late cleanup cannot drop a newer host.
 *   - One copy of this module per page. A smoke that loads it by URL gets a second copy whose
 *     holder is empty; smokes read `globalThis.__appHandles` instead.
 *
 * @invariant The holder's name is `deep-zoom.host`, it starts empty, `setHost` / `clearHost`
 *   notify subscribers once per real change, and `clearHost` leaves a different host in place -
 *   proven by: npx tsx debug/deep-zoom-checks/host-contract.mts ("holder: ..." lines). Falsified
 *   2026-10-08, see the check's header.
 */
import { defineAppHandles } from '../../engine/appHandles';
import type { DeepZoomHost } from './DeepZoomHost';

/** The focusable div the shell renders inside the engine's viewport frame: key target, size
 *  element, scaffold parent and the canvas's parent. `<div id={DZ_FRAME_ID} tabIndex={0}>`. */
export const DZ_FRAME_ID = 'dz-frame';

/** The canvas the renderer draws on. Created by `mountDeepZoom`, a child of `#dz-frame`. */
export const DZ_CANVAS_ID = 'dz-render-canvas';

/** How far the renderer follows a ray before calling it open: its own `SENSE_FAR` (grep it in
 *  deep-zoom/renderer/core.js). A bundle of `host.sense` whose rays all ran open PAST this has
 *  nothing that way at all; open short of it, the rays only ran out of steps. */
export const DZ_SENSE_FAR = 8;

/** THE ONE LINE FOR A RAY MARCH THAT COULD NOT BE BUILT (2026-10-11). The bulb has one program; when
 *  this machine cannot build it there is no deep picture and nothing stands in for it (the owner:
 *  "If the ray shader fails to build on a machine, that machine is likely gonna die trying to render
 *  the mandelbulb at high zoom - so I wouldnt want an alternative based on that, rather an error").
 *  It is the first line of the app's boot failure: the host's fatal `error` event and the surface's
 *  failure card begin with it, the compiler's own words under it (grep it in `host/moduleHost.ts`). */
export const DZ_RAY_FAILED_TEXT = 'The ray march\'s shader could not be built on this machine, so the deep picture cannot be drawn.';

/** The holder itself. Prefer the accessors below; this is exported for `reset()` in tests. */
export const deepZoomHost = defineAppHandles<DeepZoomHost | null>('deep-zoom.host', null);

/** The mounted host, or null. */
export function getHost(): DeepZoomHost | null {
    return deepZoomHost.ref.current;
}

/** Put a host in the holder (or null to empty it). Notifies only when it actually changes. */
export function setHost(host: DeepZoomHost | null): void {
    if (deepZoomHost.ref.current === host) return;
    deepZoomHost.ref.current = host;
    deepZoomHost.notify();
}

/** Empty the holder, but only if it still holds `host`. The surface's cleanup calls this. */
export function clearHost(host: DeepZoomHost): void {
    if (deepZoomHost.ref.current === host) setHost(null);
}

/** React: the mounted host, or null. Re-renders when the holder changes. */
export function useHost(): DeepZoomHost | null {
    return deepZoomHost.useSnapshot();
}

/** Call `fn` with the new value each time the holder changes. Returns the unsubscribe. */
export function subscribeHost(fn: (host: DeepZoomHost | null) => void): () => void {
    return deepZoomHost.subscribe(() => fn(deepZoomHost.ref.current));
}
