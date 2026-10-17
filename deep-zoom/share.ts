/**
 * deep-zoom/share.ts - a place as text, a scene as a link, and the saved places inside a scene file.
 * The buttons are the Places tab's foot (components/LocationText.tsx; renamed 2026-10-17: Copy location
 * is File... > Copy as text, Paste location is "Paste link or place", Export all is File... > Export).
 *
 *   Copy as text / Paste             one place as JSON on the clipboard: the camera (in Julia
 *                                    mode with its Julia constant: three more strings) and the
 *                                    formula, as a saved place holds them (`captureLocation` in
 *                                    locations.ts; `locationParse.ts` reads it back, and last
 *                                    week's shapes too). A paste is a jump: one undo step.
 *                                    Paste also takes a LINK as Copy link writes it, whole or
 *                                    its `#s=` part: the place in it, its camera and formula,
 *                                    and not its look (`shareStringOf` / `linkLocation` in
 *                                    locationParse.ts; opening the link loads the whole scene).
 *   Export / a pasted LIST           `exportAllLocations` downloads every saved location as one
 *                                    JSON file, in the stored order, thumbnails left out
 *                                    (`deep-zoom-locations.json`, the name the old prototype's
 *                                    export had, whose files import too). A pasted text that
 *                                    holds SEVERAL locations is not a jump: `importLocations`
 *                                    ADDS them to My places, skips the ones already there
 *                                    (`locationKey` in locationParse.ts: the same camera strings
 *                                    and formula) and says how many of each in a toast. A FILE
 *                                    of locations is always added, one entry or forty: opened
 *                                    with the tab's File... > Import, through File > Open scene,
 *                                    or dropped on the app (`deep-zoom/claims.ts`).
 *   Copy link                      `<this page>#s=<share string>`: the engine's share encoder
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
 * PITFALLS
 *   - The share encoder needs the store's `formula` to be a non-empty string (decoding returns
 *     nothing without one). This app has one formula; `installShare` sets it.
 *   - MY LOCATIONS HAS NO UNDO. The engine's state library keeps its list off the undo stack
 *     (grep "Persistence and undo are deliberately app-side" in
 *     engine/store/createStateLibrarySlice.ts), and so does a saved or a deleted place: an import
 *     is not an undo step either. It only ever ADDS, and each added row can be deleted.
 *   - An imported place has no picture: thumbnails are not in the file, and drawing one would mean
 *     jumping to every place. Its row shows the engine list's empty square until it is updated.
 *
 * @invariant Paste (the "Paste link or place" button) takes the link Copy link writes, whole or its `#s=` part: a jump (one
 *   undo step) to its camera and Julia constant byte for byte, its angles to the digit, and its
 *   formula - proven by: npm run check:deep-zoom-scene-roundtrip ("link: Paste takes the link Copy
 *   link writes ...", "link: its #s= part alone does the same ..."). Falsified 2026-10-17:
 *   `shareStringOf` (locationParse.ts) answering null -> those 2 red. Its third line, "link: and not
 *   the look it carries ...", stayed green under that break (nothing was applied at all): not
 *   broken on its own.
 * @assumption A pasted list and an opened or dropped file land in My locations as the toast says,
 *   a second import of the same file adds nothing, the old prototype's file imports, and a single
 *   pasted location still jumps - seen in the app on 2026-10-12 (debug/scratch/shell-leftovers/
 *   locations.mts, git-ignored). What a list READS as, and which entries count as already there,
 *   is the parser's and has a standing check (the `@invariant` in locationParse.ts); the store
 *   side here has none.
 */
import { nanoid } from 'nanoid';
import { useEngineStore } from '../store/engineStore';
import { parseShareString } from '../utils/Sharing';
import { downloadBlob } from '../utils/SceneFormat';
import { registerDocumentProvider } from '../store/documentRegistry';
import { showToast } from '../engine/store/toastStore';
import { getHost } from './host/current';
import { captureLocation, jumpTo } from './locations';
import type { DzLocation } from './locations';
import { importSummary, linkLocation, locationToText, locationsToText, newLocations, parseLocationList, shareStringOf } from './locationParse';
import type { ParsedLocationList } from './locationParse';
import { formatDepth, validDepth } from './components/depthFormat';

/** The file "Export all" writes (and the name of the old prototype's export, which imports too). */
export const DZ_LOCATIONS_FILE = 'deep-zoom-locations.json';

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
    if (getHost()) await writeClipboard(locationToText(captureLocation()), 'Place copied as text');
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

/**
 * What "Paste link or place" does with a text. ONE location, or a link: jump to it (one undo step).
 * SEVERAL: add them to My places and stay where the camera is. Says why when it can do neither.
 * Returns whether it jumped.
 */
export function applyLocationText(text: string): boolean {
    const link = shareStringOf(text);
    if (link !== null) {
        const place = linkLocation(parseShareString(link));
        if (typeof place === 'string') { showToast(place, 'warning', 5000); return false; }
        if (!jumpTo(place)) return false;
        showToast('Jumped to the place in the link: its camera and formula, not its look', 'info');
        return true;
    }
    const parsed = parseLocationList(text);
    if (!parsed.ok) { showToast(parsed.reason, 'warning', 5000); return false; }
    if (parsed.total > 1) { importLocations(parsed); return false; }
    if (!jumpTo(parsed.locations[0])) return false;
    showToast('Jumped to the pasted place', 'info');
    return true;
}

/** File... > Export: every saved location as one JSON file, in the stored order (so each keeps its
 *  slot number when the file is imported into an empty list), without thumbnails. */
export function exportAllLocations(): void {
    const rows = useEngineStore.getState().savedLocations ?? [];
    if (rows.length === 0) { showToast('No saved places to export', 'info'); return; }
    downloadBlob(new Blob([locationsToText(rows)], { type: 'application/json' }), DZ_LOCATIONS_FILE);
    showToast(`${rows.length} place${rows.length === 1 ? '' : 's'} exported (thumbnails left out)`, 'success');
}

/**
 * Add the locations of a read list to My locations, after the ones there: the ones not there yet
 * (`newLocations`), each under its own name, or its depth when it has none. One write of the list;
 * one toast that says how many were added, skipped and unreadable. Never throws.
 */
export function importLocations(parsed: Extract<ParsedLocationList, { ok: true }>): { added: number; skipped: number; refused: number } {
    const have = useEngineStore.getState().savedLocations ?? [];
    const { fresh, skipped } = newLocations(have.map((row) => row.state), parsed.locations);
    const now = Date.now();
    const rows: DzLocation[] = fresh.map((i, n) => {
        const state = parsed.locations[i];
        const depth = Number(state.depth);
        return {
            id: nanoid(),
            label: parsed.labels[i] || (validDepth(depth) ? formatDepth(depth) : `Place ${have.length + n + 1}`),
            createdAt: now,
            state,
        };
    });
    if (rows.length > 0) useEngineStore.setState({ savedLocations: [...have, ...rows] });
    const result = { added: rows.length, skipped, refused: parsed.refused.length };
    showToast(importSummary(result), rows.length > 0 ? 'success' : 'info', 5000);
    return result;
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
