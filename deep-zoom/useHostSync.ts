/**
 * deep-zoom/useHostSync.ts - the store's look values, sent to the renderer.
 *
 * PURPOSE
 *   The engine store owns every look, quality, formula and colour value (panels, undo, presets,
 *   keyframes); the renderer is a sink. This file is the one place that sends them: one store
 *   subscription per mapped feature, each change handed to `host.setParams` by id. The one value
 *   it does not send is the gradient, which is texels and not a number: `GradientSync.tsx`.
 *
 * SEAMS
 *   - Mounted once by `DeepZoomApp.tsx` (`useHostSync()`). It reads the host from the holder, so it
 *     follows a remount (StrictMode, a context loss) by itself.
 *   - Which params exist, and what the renderer redoes for each, comes from `host/paramMap.ts`.
 *     The host converts and drops unchanged values; this file sends whole slices and does not
 *     keep a "last pushed" copy of its own.
 *
 * PITFALLS
 *   - Nothing is sent before `host.ready`: the stage-2 smoke compares the feature defaults with the
 *     module's settings at ready, and a push before then would change what it reads. At ready
 *     everything is sent once - the store wins over whatever the module started with.
 *   - Params whose change rebuilds the reference orbit (class O: the formula's rows) are gathered
 *     for `DZ_ORBIT_PUSH_DELAY_MS`, one frame, and go as one push: a slider that fires several
 *     times a frame costs one push. Everything else goes at once.
 *   - THE HOLD IS COUNTED FROM THE FIRST CHANGE AND IS NOT STARTED AGAIN BY THE NEXT ONE, so a hand
 *     that keeps dragging sees the picture follow it (the owner, 2026-10-12: "update live during
 *     interaction pls instead of on release"). Until that day the wait was 90 ms after the LAST
 *     change, which a moving hand never reaches. It cost nothing to give up: the renderer rebuilds
 *     its orbit once a frame however many values arrived (grep `orbitDirty` in renderer/core.js),
 *     and it rebuilds it every frame of a flight anyway.
 *   - THE TIMELINE DOES NOT WAIT EVEN THE FRAME. Whoever sets the camera for a timeline frame calls
 *     `flushHostSync()` first (`deep-zoom/route.ts`): the held values go now, and the view lands
 *     on the formula it belongs to.
 *   - `holdAutoIterations(true)` sends `dzFormula.autoIterations` as off whatever the store holds,
 *     until it is called with false (then the store's value goes again). The route holds it while
 *     it drives the camera: the renderer's rule only ever raises the count, so a frame's count
 *     would depend on where the playhead had been before. The store is not written.
 *   - Never write to the store from here. A value the renderer changes by itself (the iteration
 *     count, under auto iterations) is shown from telemetry, not written back.
 *
 * @invariant A class O value that keeps changing reaches the host while it changes, not when the
 *   hand stops - proven by: npm run check:deep-zoom-route ("sync: a formula value that keeps
 *   changing is sent while it changes"). Falsified 2026-10-12: the hold started again by every
 *   change (the old trailing wait) -> that line red, never sent in 30 writes.
 */
import { useEffect } from 'react';
import { useEngineStore } from '../store/engineStore';
import { getHost, subscribeHost } from './host/current';
import type { DeepZoomHost, DzParams, DzParamValue } from './host/DeepZoomHost';
import { DZ_PARAM_FEATURES, DZ_PARAM_ROW_BY_ID, paramId } from './host/paramMap';

/** How long orbit-rebuilding values are gathered, from the first change, before they go as one push: a frame. */
export const DZ_ORBIT_PUSH_DELAY_MS = 16;

const FEATURE_IDS = Object.keys(DZ_PARAM_FEATURES) as Array<keyof typeof DZ_PARAM_FEATURES>;

type Slice = Record<string, unknown> | undefined;
// A feature slice lives at `store[featureId]`. The store's type knows each slice by name; this
// reads them by a runtime id, so it goes through a plain record.
const sliceOf = (state: unknown, feature: string): Slice => (state as Record<string, Slice>)[feature];

function slicePatch(feature: keyof typeof DZ_PARAM_FEATURES, slice: Slice): DzParams {
    const patch: DzParams = {};
    if (!slice) return patch;
    for (const key of Object.keys(DZ_PARAM_FEATURES[feature].params)) {
        const value = slice[key];
        if (value !== undefined) patch[paramId(feature, key)] = value as DzParamValue;
    }
    return patch;
}

/** Every mapped param as the store holds it now, by id. */
export function storeParams(): DzParams {
    const state = useEngineStore.getState();
    const all: DzParams = {};
    for (const feature of FEATURE_IDS) Object.assign(all, slicePatch(feature, sliceOf(state, feature)));
    return all;
}

const AUTO_ITERATIONS_ID = paramId('dzFormula', 'autoIterations');

/** The sync that is running, for the two calls below. Null before `startHostSync` and after its stop. */
let running: { flush(): void; resendAuto(): void } | null = null;
/** True: `dzFormula.autoIterations` goes to the renderer as off (see PITFALLS). */
let autoHeld = false;
/** A patch as it is sent: itself, with the automatic iteration rule off while that is held. */
const outgoing = (patch: DzParams): DzParams =>
    (autoHeld && AUTO_ITERATIONS_ID in patch ? { ...patch, [AUTO_ITERATIONS_ID]: false } : patch);

/** Send the orbit-rebuilding values that are waiting, now (see PITFALLS). None waiting: nothing is sent. */
export function flushHostSync(): void {
    running?.flush();
}

/** Whether the rule is held off now: for a caller that holds it for a moment and must leave it as it found it. */
export const autoIterationsHeld = (): boolean => autoHeld;

/** Hold the renderer's own iteration rule off, or (false) hand it back to what the store says. */
export function holdAutoIterations(held: boolean): void {
    if (autoHeld === held) return;
    autoHeld = held;
    running?.resendAuto();
}

/** Start the sync. Returns the function that stops it. */
export function startHostSync(): () => void {
    let stopped = false;
    /** Hosts whose `ready` has resolved: only these are sent anything. */
    const readyHosts = new WeakSet<DeepZoomHost>();
    let orbitPatch: DzParams = {};
    let orbitTimer: ReturnType<typeof setTimeout> | null = null;

    const liveHost = (): DeepZoomHost | null => {
        const host = getHost();
        return host && readyHosts.has(host) ? host : null;
    };
    const flushOrbit = (): void => {
        orbitTimer = null;
        const patch = orbitPatch;
        orbitPatch = {};
        liveHost()?.setParams(patch);
    };
    const send = (patch: DzParams): void => {
        const now: DzParams = {};
        let anyNow = false;
        let anyOrbit = false;
        for (const [id, value] of Object.entries(patch)) {
            if (DZ_PARAM_ROW_BY_ID.get(id)?.cls === 'O') { orbitPatch[id] = value; anyOrbit = true; }
            else { now[id] = value; anyNow = true; }
        }
        if (anyNow) liveHost()?.setParams(outgoing(now));
        // Not started again while one is running: see THE HOLD IS COUNTED FROM THE FIRST CHANGE.
        if (anyOrbit && orbitTimer === null) orbitTimer = setTimeout(flushOrbit, DZ_ORBIT_PUSH_DELAY_MS);
    };

    const adopt = (host: DeepZoomHost | null): void => {
        if (!host || readyHosts.has(host)) return;
        // The host attaches its own catch to `ready`; a failed boot simply never syncs.
        void host.ready.then(() => {
            if (stopped || getHost() !== host) return;
            readyHosts.add(host);
            host.setParams(outgoing(storeParams()));   // the store wins
        }, () => undefined);
    };

    const unsubs = FEATURE_IDS.map((feature) =>
        useEngineStore.subscribe(
            (s) => sliceOf(s, feature),
            (slice) => send(slicePatch(feature, slice)),
        ));
    const unsubHost = subscribeHost(adopt);
    adopt(getHost());

    const mine = {
        flush: (): void => { if (orbitTimer !== null) { clearTimeout(orbitTimer); flushOrbit(); } },
        resendAuto: (): void => { liveHost()?.setParams(outgoing({ [AUTO_ITERATIONS_ID]: storeParams()[AUTO_ITERATIONS_ID] })); },
    };
    running = mine;

    return () => {
        stopped = true;
        if (running === mine) running = null;
        for (const unsub of unsubs) unsub();
        unsubHost();
        if (orbitTimer !== null) clearTimeout(orbitTimer);
    };
}

/** Mount the sync for the life of the app. */
export function useHostSync(): void {
    useEffect(() => startHostSync(), []);
}
