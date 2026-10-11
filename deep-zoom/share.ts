/**
 * deep-zoom/share.ts - a place as text, a scene as a link, and the saved places inside a scene file.
 *
 *   Copy location / Paste location   one place as JSON on the clipboard: the camera and the
 *                                    formula, as a saved place holds them (`captureLocation` in
 *                                    locations.ts; `locationParse.ts` reads it back, and last
 *                                    week's shapes too). A paste is a jump: one undo step.
 *   Copy link                        `<this page>#s=<share string>`: the engine's share encoder
 *                                    over the scene - the look and the view (`dzView` preset
 *                                    field). It never holds the saved places (documents, and a
 *                                    share string has none) nor the route: the timeline is left
 *                                    out (`includeAnimations: false`), because the encoder rounds
 *                                    every number to five decimals and a route would arrive
 *                                    wrong. A scene file carries the route.
 *   loadShareFromUrl()               at boot, a `#s=` link is loaded as a scene.
 *   The `deep-zoom.locations` document  saved places travel in scene files and scene PNGs. On
 *                                    load they are MERGED into the device's list by id - a scene
 *                                    never deletes a place saved on this device.
 *
 * PITFALL: the share encoder needs the store's `formula` to be a non-empty string (decoding
 * returns nothing without one). This app has one formula; `installShare` sets it.
 */
import { useEngineStore } from '../store/engineStore';
import { parseShareString } from '../utils/Sharing';
import { registerDocumentProvider } from '../store/documentRegistry';
import { showToast } from '../engine/store/toastStore';
import { getHost } from './host/current';
import { captureLocation, jumpTo } from './locations';
import type { DzLocation } from './locations';
import { locationToText, parseLocationText } from './locationParse';

/**
 * The picture as a canvas a PNG or JPG can be made from: the renderer reads its own drawing
 * buffer back (`host.snapshot()`). Null when no renderer is mounted or a render is in flight.
 *
 * It used to draw one frame and copy the WebGL canvas with `drawImage`. That works while the
 * still is accumulating and returns an EMPTY picture once it is done: the owner's saved PNGs of
 * a finished still were blank, 2026-10-08. Why, and the order of reads that avoids it: grep
 * `SNAPSHOT` in deep-zoom/renderer/core.js.
 */
export function sceneCanvas(): HTMLCanvasElement | null {
    return getHost()?.snapshot() ?? null;
}

/** The fixed formula id every scene of this app carries. */
export const DZ_FORMULA_ID = 'mandelbulb-deepzoom';
const SHARE_HASH = '#s=';

async function writeClipboard(text: string, done: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
        showToast(done, 'success');
    } catch {
        showToast('The browser did not allow writing to the clipboard', 'error');
    }
}

export async function copyLocation(): Promise<void> {
    if (getHost()) await writeClipboard(locationToText(captureLocation()), 'Location copied');
}

export async function pasteLocation(): Promise<void> {
    let text: string;
    try {
        text = await navigator.clipboard.readText();
    } catch {
        showToast('The browser did not allow reading the clipboard', 'error');
        return;
    }
    applyLocationText(text);
}

/** Jump to the first location in `text`. Says why when it cannot. Returns whether it jumped. */
export function applyLocationText(text: string): boolean {
    const parsed = parseLocationText(text);
    if (!parsed.ok) { showToast(parsed.reason, 'warning', 5000); return false; }
    if (!jumpTo(parsed.locations[0])) return false;
    showToast(parsed.locations.length > 1 ? `Jumped to the first of ${parsed.locations.length} locations` : 'Jumped to the pasted location', 'info');
    return true;
}

export function shareLink(): string {
    return `${window.location.origin}${window.location.pathname}${SHARE_HASH}${useEngineStore.getState().getShareString({ includeAnimations: false })}`;
}

export async function copyShareLink(): Promise<void> {
    await writeClipboard(shareLink(), 'Link copied');
}

/** Load a `#s=` link as a scene. Call once at boot, after the store exists. Returns whether one was loaded. */
export function loadShareFromUrl(): boolean {
    const hash = window.location.hash;
    if (!hash.startsWith(SHARE_HASH)) return false;
    const preset = parseShareString(hash.slice(SHARE_HASH.length));
    if (!preset) { showToast('That link could not be read', 'warning', 5000); return false; }
    useEngineStore.getState().loadPreset(preset);
    return true;
}

function isLocationRow(row: unknown): row is DzLocation {
    const r = row as DzLocation | null;
    const cam = r?.state?.view?.cam;
    return !!r && typeof r.id === 'string' && typeof r.label === 'string' && Array.isArray(cam) && cam.length === 3 && cam.every((c) => typeof c === 'string');
}

/** Call once, after the store exists. */
export function installShare(): void {
    if (!useEngineStore.getState().formula) useEngineStore.setState({ formula: DZ_FORMULA_ID });

    registerDocumentProvider('deep-zoom.locations', {
        // Plain JSON by construction: strings, numbers, booleans and nested records of them.
        serialize: () => JSON.parse(JSON.stringify(useEngineStore.getState().savedLocations ?? [])),
        restore: (snapshot) => {
            if (!Array.isArray(snapshot)) return;
            const incoming = (snapshot as unknown[]).filter(isLocationRow);
            if (incoming.length === 0) return;
            const have = useEngineStore.getState().savedLocations ?? [];
            const known = new Set(have.map((r) => r.id));
            const added = incoming.filter((r) => !known.has(r.id));
            if (added.length > 0) useEngineStore.setState({ savedLocations: [...have, ...added] });
        },
    });
}
