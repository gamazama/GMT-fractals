/**
 * favients ⇄ scene document bridge — the palette's consumer of the engine
 * document-provider registry (store/documentRegistry.ts, W8).
 *
 * Registered via registerPaletteUI so every host that mounts the palette suite
 * carries favourites into its saved scenes. The engine registry stays generic
 * (no palette import); the Replace/Append/Omit choice is a palette-side concern
 * that this module owns (locked Decision 1 — never silently clobber the global
 * library on load).
 *
 * serialize → the current collection as a JSON-value (the canonical
 *   FavientsCollection from `exportCollection`).
 * restore   → compare the scene's gradients against the live shelf, then:
 *     • nothing new AND no extras → identical, show a toast, no dialog;
 *     • nothing new but shelf has extras → Replace / Omit dialog (no Append);
 *     • something new → Append / Replace / Omit dialog.
 *   The chosen action routes through `importCollection`, which validates shapes,
 *   mints fresh ids, dedupes by content signature, and writes through to
 *   localStorage (`gmt.favients`) AND the store — so disk + memory stay coherent.
 *
 * @see palette/store/favientsStore.ts (exportCollection / importCollection / readCollectionFavients)
 * @see palette/components/favientsRestoreDialog.tsx (the choice UI)
 * @see store/documentRegistry.ts (the engine registry it plugs into)
 */

import type { JsonValue } from '../../types';
import { showToast } from '../../engine/store/toastStore';
import { useFavientsStore, favientSig, readCollectionFavients } from './favientsStore';
import { showFavientsRestoreDialog, type FavientsRestoreChoice } from '../components/favientsRestoreDialog';

/** Capture the favients collection as a JSON-value document for the scene. */
export const serializeFavientsDocument = (): JsonValue =>
    // exportCollection() is the canonical {version, favients, groupLabels}
    // serialiser; parse it back to a value so it nests in the scene JSON.
    JSON.parse(useFavientsStore.getState().exportCollection()) as JsonValue;

/**
 * Restore a favients document loaded from a scene. Fail-safe against untrusted
 * input: `readCollectionFavients` applies the same strict gate `importCollection`
 * does, so malformed entries are dropped before we count or prompt; a snapshot
 * with no valid favourites is a silent no-op.
 *
 * Asynchronous by design — the dialog (and `importCollection`) run AFTER
 * loadPreset returns, so a scene with favourites finishes loading first and the
 * choice appears over the loaded scene rather than blocking the load.
 */
export const restoreFavientsDocument = (snap: JsonValue): void => {
    const incoming = readCollectionFavients(snap);
    if (incoming.length === 0) return;

    const store = useFavientsStore.getState();
    // Content signatures are total (W8) so they never throw on odd data. Dedupe
    // within each side via Sets so duplicate entries don't skew the counts.
    const shelfSigs = new Set(store.favients.map((f) => favientSig(f.config)));
    const sceneSigs = new Set(incoming.map((f) => favientSig(f.config)));

    let newCount = 0;
    sceneSigs.forEach((s) => { if (!shelfSigs.has(s)) newCount++; });
    let extraCount = 0;
    shelfSigs.forEach((s) => { if (!sceneSigs.has(s)) extraCount++; });

    // Identical shelf ⇄ scene (nothing new, nothing extra): nothing to decide.
    // Surface it instead of vanishing silently (self-reload / autosave restore).
    if (newCount === 0 && extraCount === 0) {
        showToast(
            `All ${sceneSigs.size} of this scene's gradient${sceneSigs.size === 1 ? ' is' : 's are'} already in your Favients`,
            'info',
        );
        return;
    }

    const json = JSON.stringify(snap);
    void showFavientsRestoreDialog({ newCount, extraCount, sceneCount: sceneSigs.size }).then(
        (choice: FavientsRestoreChoice) => {
            if (choice === 'omit') {
                showToast('Kept your Favients unchanged', 'info');
                return;
            }
            const mode = choice === 'replace' ? 'replace' : 'merge';
            const n = useFavientsStore.getState().importCollection(json, mode);
            if (n === null) {
                showToast('Could not read the scene’s Favients', 'error');
            } else if (mode === 'replace') {
                showToast(`Replaced — ${n} favourite${n === 1 ? '' : 's'} loaded`, 'success');
            } else {
                showToast(n ? `Appended ${n} new favourite${n === 1 ? '' : 's'}` : 'Nothing new to append', 'success');
            }
        },
    // This runs after loadPreset (and the registry's try/catch) has returned, so
    // guard the tail explicitly — an unhandled rejection here would escape.
    ).catch((err) => {
        console.warn('[favientsDocument] restore choice handling failed', err);
    });
};
