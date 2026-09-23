/**
 * contributeToGlobal — the one place a gradient is offered to the SHARED set.
 *
 * There are two ways in and they must behave identically: drag a gradient onto the GX global
 * chip (`SetRail`), or press the button on the shared ground itself (`BrowseStage`). The drag
 * came first and was the only one, which made contributing a thing you had to already know
 * about — the owner's note, 2026-09-11: GX global "needs a button that says submit gradient
 * or something, to entice people to save there".
 *
 * Both routes ask first, because the set is public and there is no un-sending, and neither is
 * undoable: nothing local changes, so there is nothing for Ctrl+Z to put back. Your own copy
 * stays exactly where it was.
 *
 * For an IMPORTED gradient the confirm ends on a one-line terms statement, in the wording of
 * plans/palette-catalogue-licensing.md §5 "GX Global" (the gap) and §6 action 6 (the fix): the
 * endpoint takes no name, source or licence, so the sharer is the only one who can vouch for a
 * file's contents. Anything else goes without it (owner, 2026-09-24) — see `CONTRIBUTE_TERMS`.
 *
 * NO UNEDITED CATALOGUE GRADIENTS (owner, 2026-09-13: "GX Global has no names, and shouldn't
 * accept duplicates from the repo"). Before asking, the gradient's canonical signature is
 * checked against the catalogue's (`palette/core/catalogSigs.ts` — every pack, loaded or not,
 * published or not). A hit is refused with a toast and no confirm. The server refuses the same
 * gradient on its own (`409 IN_CATALOGUE`), so this is the courteous half, not the lock: if the
 * list cannot be fetched the contribution goes ahead and the server decides.
 *
 * Lives in the app rather than in `palette/core/globalSet.ts` because it is the GESTURE, not
 * the transport: it confirms, it toasts, and it refreshes the set. The core module stays a
 * pure fetch/POST pair with no UI in it.
 */
import type { GradientConfig } from '../../types';
import { submitToGlobalSet, GlobalSetError } from '../../palette/core/globalSet';
import { refreshGlobalSet } from '../../palette/store/globalSetStore';
import { showToast } from '../../engine/store/toastStore';
import { catalogHashOf, loadCatalogSigs } from '../../palette/core/catalogSigs';
import { PALETTE_LOCAL_BASE } from '../../palette/core/catalogLoader';

/** The confirm text. One string, so the two entry points cannot promise different things. */
export const CONTRIBUTE_CONFIRM =
    'Add this gradient to GX global?' + String.fromCharCode(10, 10) +
    'Everyone using the app will see it, and it cannot be taken back. Your own copy stays where it is.';

/**
 * The rights line — asked ONLY for a gradient that came in from a file (owner, 2026-09-24: "not
 * necessary, we already test against the corpus and reformat the stops. Only if imported."). A
 * catalogue gradient is refused unless edited (below), and GX Global stores its own normalised
 * stops, so what is left to vouch for is material from outside the app: an import. Recognised by
 * the provenance the importer writes (`Import · .<ext>`, palette/core/importGradientFiles.ts),
 * which rides the drag payload and the working input — and the working input's `bakedFrom`, so an
 * edited import still asks.
 */
export const CONTRIBUTE_TERMS = 'You confirm you have the right to share this.';

/** True for the importer's provenance line (`Import · .png`, `Import · .ggr`, …). */
export const isImportedSource = (source: string | null | undefined): boolean =>
    typeof source === 'string' && /^Import\b/.test(source);

type SourcedInput = { kind: string; source?: string };
/** The working gradient's import provenance, if it has one: the input's own source, or — once it
 *  has been edited — the source of the input it was baked from. Null for anything else. */
export const importedSourceOfWorking = (w: { input: SourcedInput; bakedFrom: { input: SourcedInput } | null }): string | null => {
    if (w.input.kind === 'gradient' && isImportedSource(w.input.source)) return w.input.source!;
    const from = w.bakedFrom?.input;
    return from && from.kind === 'gradient' && isImportedSource(from.source) ? from.source! : null;
};

/** The confirm for one gradient: the rights line only when it was imported. */
export const contributeConfirmText = (imported: boolean): string =>
    imported ? CONTRIBUTE_CONFIRM + String.fromCharCode(10, 10) + CONTRIBUTE_TERMS : CONTRIBUTE_CONFIRM;

/** The refusal. Says what to do instead, because the gradient is not wrong, just not new. */
export const CATALOGUE_REFUSAL_TOAST =
    'That one is straight from the catalogue — GX global only takes gradients you made or changed. Edit it first.';

/** True when `config` is an unedited catalogue gradient. False when it is not, or when the
 *  signature list could not be read (the server still refuses). */
export const isCatalogueGradient = async (config: GradientConfig): Promise<boolean> => {
    const h = catalogHashOf(config);
    if (!h) return false;
    const sigs = await loadCatalogSigs(PALETTE_LOCAL_BASE);
    return sigs.has(h);
};

/**
 * Check, ask, then contribute. Returns at once; the outcome arrives as a toast.
 * A declined confirm is a no-op and says nothing.
 */
export const contributeToGlobal = (config: GradientConfig, opts?: { imported?: boolean }): void => {
    void isCatalogueGradient(config).then((fromCatalogue) => {
        if (fromCatalogue) {
            showToast(CATALOGUE_REFUSAL_TOAST);
            return;
        }
        if (!window.confirm(contributeConfirmText(!!opts?.imported))) return;
        showToast('Adding it to GX global…');
        void submitToGlobalSet(config).then(
            (r) => {
                showToast(r.added ? 'Added to GX global — thank you' : 'That one is already in GX global');
                if (r.added) refreshGlobalSet();
            },
            (err) => showToast(err instanceof GlobalSetError ? err.message : 'Could not add it to GX global'),
        );
    });
};
