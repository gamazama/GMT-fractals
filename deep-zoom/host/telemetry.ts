/**
 * deep-zoom/host/telemetry.ts - the renderer's live numbers as a small read-only store beside the
 * host: depth, fps, iterations, frame size, the still's progress, mode, ready, error, recording /
 * playing / exporting.
 *
 * PURPOSE
 *   Widgets (the depth readout, the status chip, the top-bar fps) show numbers the renderer
 *   changes by itself, about 8 times a second. Those writes must not reach undo, presets, a scene
 *   file or every selector of the engine store, so this is NOT an engine store slice and not a
 *   DDFS feature: it is its own Zustand store, the same shape the palette suite uses for state
 *   that is not a feature (`palette/store/pickerStore.ts`).
 *
 * THE SEAM
 *   - Written only from `deep-zoom/host/`: the host implementation (`moduleHost.ts`) calls
 *     `writeTelemetry(sample)` from its `step` every `DZ_TELEMETRY_INTERVAL_MS` and
 *     `resetTelemetry()` in `dispose`. Nothing else writes.
 *   - Read by the shell:
 *       `useDzTelemetry(selector)`  React. The component re-renders only when the value the
 *                                   selector returns changes (compared with `Object.is`).
 *       `getTelemetry()`            handlers and ticks.
 *       `subscribeTelemetry(fn)`    non-React listeners (for example the fps forwarded to the
 *                                   engine's viewport plugin).
 *   - The sample's shape is `DzTelemetry` in `deep-zoom/host/DeepZoomHost.ts`; this store adds
 *     `live`.
 *
 * PITFALLS
 *   - Select ONE primitive per `useDzTelemetry` call: `useDzTelemetry((t) => t.depth)`. A selector
 *     that builds an object or an array returns a new value every time and re-renders on every
 *     write. Two fields = two calls.
 *   - Before the first sample, and after a host is disposed, `live` is false and the other fields
 *     are placeholders (depth 0 is not a depth). Check `live` before showing a number.
 *   - This store lags the renderer by up to 125 ms. Code that needs the value NOW (a save, a
 *     smoke) calls `host.telemetry()`.
 *
 * @invariant A sample equal to the one already held notifies nobody, a changed one notifies once,
 *   `resetTelemetry` behaves the same way, and this file reaches nothing but
 *   `zustand` and the contract (so no write here can land in the engine store) - proven by:
 *   npx tsx debug/deep-zoom-checks/host-contract.mts ("telemetry: ..." lines). Falsified
 *   2026-10-08, see the check's header.
 * @assumption A widget using `useDzTelemetry((t) => t.depth)` does not re-render when only `fps`
 *   changes. That is Zustand's selector behaviour; no check here mounts a component to watch it.
 */
import { create } from 'zustand';
import type { DzTelemetry } from './DeepZoomHost';

/** How often the host implementation writes a sample, and the default rate of `host.onTelemetry`. */
export const DZ_TELEMETRY_HZ = 8;
export const DZ_TELEMETRY_INTERVAL_MS = 1000 / DZ_TELEMETRY_HZ;

export interface DzTelemetryState extends DzTelemetry {
    /** False until a host has written a sample, and again after it is disposed. */
    live: boolean;
}

/** What the store holds while no host is mounted. */
export const DZ_TELEMETRY_INITIAL: Readonly<DzTelemetryState> = Object.freeze({
    live: false,
    ready: false,
    error: '',
    mode: 'f32',
    depth: 0,
    fps: 0,
    frameW: 0,
    frameH: 0,
    iters: 0,
    power: 0,
    accumN: 0,
    accumMax: 0,
    recording: false,
    playing: false,
    exporting: false,
    pathFrames: 0,
    bla: false,
});

const useTelemetryStore = create<DzTelemetryState>()(() => ({ ...DZ_TELEMETRY_INITIAL }));

function sameSample(held: DzTelemetry, next: DzTelemetry): boolean {
    for (const key of Object.keys(next) as Array<keyof DzTelemetry>) {
        if (!Object.is(held[key], next[key])) return false;
    }
    return true;
}

// ── read ─────────────────────────────────────────────────────────────────────────────────────────

/** React: one slice of the telemetry. Select a primitive (see the header). */
export function useDzTelemetry<T>(selector: (t: DzTelemetryState) => T): T {
    return useTelemetryStore(selector);
}

/** The telemetry as last written. */
export function getTelemetry(): DzTelemetryState {
    return useTelemetryStore.getState();
}

/** Call `fn` after each write that changed something. Returns the unsubscribe. */
export function subscribeTelemetry(fn: (t: DzTelemetryState, prev: DzTelemetryState) => void): () => void {
    return useTelemetryStore.subscribe(fn);
}

// ── write: `deep-zoom/host/` only ────────────────────────────────────────────────────────────────

/** Store one sample. A sample equal to the one held changes nothing and notifies nobody. */
export function writeTelemetry(sample: DzTelemetry): void {
    const held = useTelemetryStore.getState();
    if (held.live && sameSample(held, sample)) return;
    useTelemetryStore.setState({ ...sample, live: true });
}

/** Back to `DZ_TELEMETRY_INITIAL`. The host implementation calls it from `dispose`. */
export function resetTelemetry(): void {
    const held = useTelemetryStore.getState();
    if (!held.live) return;
    useTelemetryStore.setState({ ...DZ_TELEMETRY_INITIAL }, true);
}
