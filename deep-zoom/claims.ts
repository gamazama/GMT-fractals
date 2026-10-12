/**
 * deep-zoom/claims.ts - a FILE of locations, wherever it is handed to the app.
 *
 * PURPOSE
 *   The engine's scene entrances read every file as a scene: a drop anywhere on the window
 *   (`engine/components/SceneFileDropZone.tsx`) and File > Load Scene (`engine/plugins/SceneIO.tsx`).
 *   A JSON file of locations is not one, and the scene loader does not refuse it: it reads any JSON
 *   as a preset, so an exported list loaded there would have reset the look and loaded nothing.
 *   This file registers a claim with the engine's seam for exactly that
 *   (`engine/plugins/SceneFileClaims.ts`): a file whose text is locations is taken before the scene
 *   loader sees it, and its places are added to My locations.
 *
 * THE SEAM
 *   - `installLocationsFileClaim()` once, from main.tsx. The claim is keyed by id, so a second call
 *     replaces it in place.
 *   - `importLocationFiles(files)` is the one way a file becomes saved places. The claim calls it
 *     with what it took; the Locations tab's "Import" button (`components/LocationText.tsx`) calls
 *     it with the file picked there. Reading is `deep-zoom/locationParse.ts`; adding is
 *     `importLocations` in `deep-zoom/share.ts` (which places are already there, the toast).
 *   - WHICH FILES ARE TAKEN: a `.json` file whose text `looksLikeLocations` (locationParse.ts): its
 *     one value, or an entry of its list, names a camera where a location holds one. That is this
 *     shell's own export, a copied location saved as a file, last week's flat shape, a bare view,
 *     and the old prototype's `deep-zoom-locations.json`. A scene is never taken (its camera is
 *     under `dzView`, and it has `features`), nor a PNG, nor a gradient file.
 *   - A file that IS locations and holds none that can be read (a number-mangled copy) is taken
 *     too, and the toast says why nothing came of it: handed on, the scene loader would load it.
 *   - After an import the Locations tab is brought up, so what was added is seen.
 *
 * PITFALLS
 *   - NOTHING THROWS AFTER THE LIST IS WRITTEN. A claim that throws is treated by the engine as
 *     having taken nothing, and its files go on to the scene loader: thrown after the write, the
 *     places would be added AND the file loaded as a scene. So every read (`file.text()`, the
 *     parse) is done first and may fail - that file is then simply not taken - and the one
 *     synchronous step that writes (`importLocations`: a `setState` and a toast) is the last thing
 *     that can, inside a catch of its own.
 *   - Several files in one drop are one import: one write of the list, one toast.
 *
 * @assumption A dropped file and one picked in File > Load Scene land in My locations with the
 *   toast, and a scene file dropped afterwards still loads as a scene - seen in the app on
 *   2026-10-12 (debug/scratch/shell-leftovers/locations.mts, git-ignored: a synthetic drop on the
 *   window and the menu's own file input). No standing guard opens either entrance in this app;
 *   the engine's half - claims run first, a throwing claim takes nothing - is `npm run
 *   test:scene-file-claims`.
 */
import { registerSceneFileClaim } from '../engine/plugins/SceneFileClaims';
import { showToast } from '../engine/store/toastStore';
import { useEngineStore } from '../store/engineStore';
import { looksLikeLocations, parseLocationList } from './locationParse';
import type { ParsedLocationList } from './locationParse';
import { importLocations } from './share';

export const DZ_LOCATIONS_CLAIM_ID = 'deep-zoom.locations';

/** One file's text, or null when the browser cannot read it. Never rejects. */
const textOf = (file: File): Promise<string | null> => file.text().then((text) => text, () => null);

/**
 * Add the locations in `files` to My locations. Resolves to the files that were NOT locations
 * (unreadable, not JSON, or JSON of something else), in the order given. Says what it did in one
 * toast; says nothing when no file was locations. Never rejects.
 */
export async function importLocationFiles(files: File[]): Promise<File[]> {
    const named = files.filter((file) => /\.json$/i.test(file.name));
    if (named.length === 0) return files;
    // Everything that can fail, first (see PITFALLS).
    const texts = await Promise.all(named.map(textOf));
    const taken = new Set<File>();
    const merged: Extract<ParsedLocationList, { ok: true }> = { ok: true, list: true, total: 0, locations: [], labels: [], refused: [] };
    let reason = '';
    named.forEach((file, i) => {
        const text = texts[i];
        if (text === null || !looksLikeLocations(text)) return;
        taken.add(file);
        const parsed = parseLocationList(text);
        if (!parsed.ok) { reason = reason || parsed.detail || parsed.reason; merged.total++; merged.refused.push({ item: merged.total, reason: parsed.reason }); return; }
        merged.total += parsed.total;
        merged.locations.push(...parsed.locations);
        merged.labels.push(...parsed.labels);
        merged.refused.push(...parsed.refused);
    });
    if (taken.size === 0) return files;
    try {
        if (merged.locations.length === 0) showToast(`No location in that file could be read: ${reason}`, 'warning', 6000);
        else importLocations(merged);
        useEngineStore.getState().togglePanel('Locations', true);
    } catch (err) {
        console.error('[deep-zoom] importing a file of locations failed', err);
    }
    return files.filter((file) => !taken.has(file));
}

/** Call once, after the store exists. */
export function installLocationsFileClaim(): void {
    registerSceneFileClaim({
        id: DZ_LOCATIONS_CLAIM_ID,
        hint: 'a file of locations goes to My locations',
        take: importLocationFiles,
    });
}
