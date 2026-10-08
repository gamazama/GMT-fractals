/**
 * deep-zoom/useHostSync.ts - the store's look values, sent to the renderer.
 *
 * PURPOSE
 *   The engine store owns every look, quality, formula and colour value (panels, undo, presets,
 *   keyframes); the renderer is a sink. This file is the one place that sends them: one store
 *   subscription per mapped feature, each change handed to `host.setParams` by id.
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
 *   - Params whose change rebuilds the reference orbit (class O: power, phase, iterations,
 *     precision) are sent `DZ_ORBIT_PUSH_DELAY_MS` after the last change, so a slider drag at depth
 *     rebuilds once and not once per pixel of travel. Everything else goes at once.
 *   - Never write to the store from here. Values the renderer changes by itself (auto iterations,
 *     the effective BLA flag) are shown from telemetry, not written back.
 */
import { useEffect } from 'react';
import { useEngineStore } from '../store/engineStore';
import { getHost, subscribeHost } from './host/current';
import type { DeepZoomHost, DzParams, DzParamValue } from './host/DeepZoomHost';
import { DZ_PARAM_FEATURES, DZ_PARAM_ROW_BY_ID, paramId } from './host/paramMap';

/** How long an orbit-rebuilding value waits for the next change before it is sent. */
export const DZ_ORBIT_PUSH_DELAY_MS = 90;

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
        if (anyNow) liveHost()?.setParams(now);
        if (anyOrbit) {
            if (orbitTimer !== null) clearTimeout(orbitTimer);
            orbitTimer = setTimeout(flushOrbit, DZ_ORBIT_PUSH_DELAY_MS);
        }
    };

    const adopt = (host: DeepZoomHost | null): void => {
        if (!host || readyHosts.has(host)) return;
        // The host attaches its own catch to `ready`; a failed boot simply never syncs.
        void host.ready.then(() => {
            if (stopped || getHost() !== host) return;
            readyHosts.add(host);
            host.setParams(storeParams());   // the store wins
        }, () => undefined);
    };

    const unsubs = FEATURE_IDS.map((feature) =>
        useEngineStore.subscribe(
            (s) => sliceOf(s, feature),
            (slice) => send(slicePatch(feature, slice)),
        ));
    const unsubHost = subscribeHost(adopt);
    adopt(getHost());

    return () => {
        stopped = true;
        for (const unsub of unsubs) unsub();
        unsubHost();
        if (orbitTimer !== null) clearTimeout(orbitTimer);
    };
}

/** Mount the sync for the life of the app. */
export function useHostSync(): void {
    useEffect(() => startHostSync(), []);
}
