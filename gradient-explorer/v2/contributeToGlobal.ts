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
 * Lives in the app rather than in `palette/core/globalSet.ts` because it is the GESTURE, not
 * the transport: it confirms, it toasts, and it refreshes the set. The core module stays a
 * pure fetch/POST pair with no UI in it.
 */
import type { GradientConfig } from '../../types';
import { submitToGlobalSet, GlobalSetError } from '../../palette/core/globalSet';
import { refreshGlobalSet } from '../../palette/store/globalSetStore';
import { showToast } from '../../engine/store/toastStore';

/** The confirm text. One string, so the two entry points cannot promise different things. */
export const CONTRIBUTE_CONFIRM =
    'Add this gradient to GX global?' + String.fromCharCode(10, 10) +
    'Everyone using the app will see it, and it cannot be taken back. Your own copy stays where it is.';

/**
 * Ask, then contribute. Returns at once; the outcome arrives as a toast.
 * A declined confirm is a no-op and says nothing.
 */
export const contributeToGlobal = (config: GradientConfig): void => {
    if (!window.confirm(CONTRIBUTE_CONFIRM)) return;
    showToast('Adding it to GX global…');
    void submitToGlobalSet(config).then(
        (r) => {
            showToast(r.added ? 'Added to GX global — thank you' : 'That one is already in GX global');
            if (r.added) refreshGlobalSet();
        },
        (err) => showToast(err instanceof GlobalSetError ? err.message : 'Could not add it to GX global'),
    );
};
