/**
 * favients ⇄ scene document bridge — the palette's consumer of the engine
 * document-provider registry (store/documentRegistry.ts, W8).
 *
 * Registered via registerPaletteUI so every host that mounts the palette suite
 * carries favourites into its saved scenes. The engine registry stays generic
 * (no palette import); the restore policy is a palette-side concern this module
 * owns (locked Decision 1 — never silently clobber the global library on load;
 * merge only ever ADDS, so auto-append honours it without a prompt).
 *
 * serialize → the current collection as a JSON-value (the canonical
 *   FavientsCollection from `exportCollection`).
 * restore   → silently auto-append: any scene gradient not already on the shelf
 *   (by content signature) is merged in via `importCollection`, which validates
 *   shapes, mints fresh ids, dedupes, and writes through to localStorage
 *   (`gmt.favients`) AND the store — so disk + memory stay coherent. A toast
 *   reports how many were added; nothing new → complete no-op, no UI.
 *
 *   This replaced the earlier Replace/Append/Omit dialog: every save embeds the
 *   WHOLE shelf, so once the shelf drifted the dialog fired on every load of
 *   one's own older files, and its Replace answer was a destructive rollback to
 *   an older subset nobody deliberately wants. Shelf pruning is a palette-UI
 *   action, not a scene-load question.
 *
 * @see palette/store/favientsStore.ts (exportCollection / importCollection / readCollectionFavients)
 * @see store/documentRegistry.ts (the engine registry it plugs into)
 */

import type { JsonValue } from '../../types';
import { showToast } from '../../engine/store/toastStore';
import { useFavientsStore, favientSig, readCollectionFavients } from './favientsStore';

/** Capture the favients collection as a JSON-value document for the scene. */
export const serializeFavientsDocument = (): JsonValue =>
    // exportCollection() is the canonical {version, favients, groupLabels}
    // serialiser; parse it back to a value so it nests in the scene JSON.
    JSON.parse(useFavientsStore.getState().exportCollection()) as JsonValue;

/**
 * Restore a favients document loaded from a scene. Fail-safe against untrusted
 * input: `readCollectionFavients` applies the same strict gate `importCollection`
 * does, so malformed entries are dropped before we count; a snapshot with no
 * valid favourites is a silent no-op.
 *
 * Auto-append: gradients the shelf doesn't already have (by content signature)
 * merge in with a toast; everything-already-known is a complete no-op — no
 * dialog, no toast. Merge never removes or overwrites existing favourites, so
 * the never-clobber guarantee holds without asking.
 */
export const restoreFavientsDocument = (snap: JsonValue): void => {
    const incoming = readCollectionFavients(snap);
    if (incoming.length === 0) return;

    // Content signatures are total (W8) so they never throw on odd data. Gate
    // before importing so the every-load common case (own file, nothing new)
    // touches neither localStorage nor the store.
    const shelfSigs = new Set(useFavientsStore.getState().favients.map((f) => favientSig(f.config)));
    if (!incoming.some((f) => !shelfSigs.has(favientSig(f.config)))) return;

    const n = useFavientsStore.getState().importCollection(JSON.stringify(snap), 'merge');
    if (n) {
        showToast(`Added ${n} gradient${n === 1 ? '' : 's'} from this scene to your Favients`, 'info');
    }
};
