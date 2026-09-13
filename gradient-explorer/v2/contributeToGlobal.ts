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
export const contributeToGlobal = (config: GradientConfig): void => {
    void isCatalogueGradient(config).then((fromCatalogue) => {
        if (fromCatalogue) {
            showToast(CATALOGUE_REFUSAL_TOAST);
            return;
        }
        if (!window.confirm(CONTRIBUTE_CONFIRM)) return;
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
