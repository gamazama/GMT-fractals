/**
 * fromGmt — the Gradient Explorer's end of a trip from the GMT studio (owner decisions,
 * 2026-09-23). The studio's end is `app-gmt/explorerTrip.ts`; what passes between them is
 * `palette/core/explorerHandoff.ts`.
 *
 *   • ARRIVAL (`gmtIncomingWaiting`, `applyGradientFromGmt`): the gradient GMT handed over
 *     becomes the working gradient, REPLACING the restored session exactly as a share link does —
 *     `session.ts` asks `gmtIncomingWaiting()` before the first render and treats it as a
 *     pre-emption, then the shell applies it once on mount. A favourite still on this shelf is
 *     PICKED (`setHeroPick`, mode `favients`), which is what a click on it here does: the shell's
 *     pick handler turns it into `use(…, 'From GMT', { fromRecent: true })` and the favourite
 *     shows selected. Anything else is `use(…, 'From GMT')`. Read only when this page was opened
 *     by GMT's Explorer button (`?from=gmt`); the key is one-shot, so a reload does nothing.
 *   • BACK TO GMT (`goBackToGmt`): when the GMT tab that made this trip answers on the trip
 *     channel, this tab closes itself and the user lands back in that tab, scene untouched. When
 *     it does not answer (closed, reloaded, discarded by a phone) or the browser refuses the
 *     close, this tab goes to `app-gmt.html?from=gx`, and GMT restores the scene it stashed for
 *     the trip (app-gmt/main.tsx, resolveBootPreset). A page NOT opened by the button keeps the
 *     plain `app-gmt.html` link it always had.
 *
 * WHETHER `window.close()` IS ALLOWED, measured 2026-09-23 with Playwright's builds: a tab opened
 * by `window.open(url, '_blank', 'noopener')` closes in Chromium, Firefox and WebKit — fresh, and
 * after an in-tab navigation (history length 2) — and a tab the user opened and navigated is
 * refused in all three. Chromium and WebKit report `window.closed === true` synchronously after
 * an accepted close. The spec's rule (script-closable: created by script, or a history of one
 * entry) is what all three follow; `noopener` does not lose the "created by script" bit. The
 * fallback exists for the cases the measurement cannot cover: a browser or extension that
 * refuses anyway, and a GMT tab that is no longer there to land in.
 *
 * Nothing goes BACK: the owner cancelled a gradient hand-back on 2026-09-07 — the working
 * gradient already reaches GMT's My Gradients through the shared Recent group.
 */
import type { MouseEvent } from 'react';
import {
  takeExplorerIncoming,
  pingExplorerTrip,
  announceExplorerReturn,
  EXPLORER_TRIP_PARAM,
  type ExplorerIncoming,
} from '../../palette/core/explorerHandoff';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { useWorkingStore } from '../../palette/store/workingStore';
import { setHeroPick } from '../../palette/store/heroSelection';
import { FROM_GMT } from './shareUrl';

/** The provenance a gradient from GMT is used with (`use(…, source)`). */
export const FROM_GMT_SOURCE = 'From GMT';

const query = (): URLSearchParams => {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
};

/** This page was opened by GMT's Explorer button — `?from=gmt`, not merely a GMT referrer
 *  (`cameFromGmt` also accepts that, for showing the link at all). */
export const openedByGmtButton = typeof window !== 'undefined' && query().get('from') === FROM_GMT;
const tripId = typeof window !== 'undefined' ? query().get(EXPLORER_TRIP_PARAM) : null;

/** Where "Back to GMT" goes when it cannot close this tab — and the links' `href`, so a
 *  middle-click or "open in new tab" also brings the stashed scene. */
export const BACK_TO_GMT_HREF = openedByGmtButton ? 'app-gmt.html?from=gx' : 'app-gmt.html';

// Read-and-clear once, cached: session.ts asks first (before the first render), the shell takes
// it on mount. `undefined` = not read yet; `null` = nothing (or already applied).
let incoming: ExplorerIncoming | null | undefined;
const readIncoming = (): ExplorerIncoming | null => {
  if (incoming === undefined) incoming = openedByGmtButton ? takeExplorerIncoming() : null;
  return incoming;
};

/** Is a gradient from GMT waiting to be applied? (session.ts: it pre-empts the restore.) */
export const gmtIncomingWaiting = (): boolean => readIncoming() !== null;

/** Apply the gradient from GMT, once (a second call — StrictMode's double effect — is a no-op).
 *  Returns whether anything was applied. */
export const applyGradientFromGmt = (): boolean => {
  const g = readIncoming();
  incoming = null;
  if (!g) return false;
  const fav = g.favId ? useFavientsStore.getState().favients.find((f) => f.id === g.favId) : undefined;
  if (fav) {
    // The shelf's own entry, as a tile click builds it (usePickerModel's onPick) — heroSelection
    // keys the payload on (mode, key), so it must be what that key names.
    setHeroPick({
      mode: 'favients',
      key: fav.id,
      payload: { config: fav.config, name: fav.name, source: FROM_GMT_SOURCE, favId: fav.id, ...(fav.origin ? { origin: fav.origin } : {}) },
    });
    return true;
  }
  useWorkingStore.getState().use(g.config, g.name, FROM_GMT_SOURCE);
  return true;
};

/** "Back to GMT" — see the file header. */
export const goBackToGmt = async (): Promise<void> => {
  if (openedByGmtButton && tripId && (await pingExplorerTrip(tripId))) {
    window.close();
    // `closed` flips synchronously where measured; give any browser that closes a beat later
    // that beat before deciding the close was refused.
    if (!window.closed) await new Promise((r) => setTimeout(r, 120));
    if (window.closed) {
      announceExplorerReturn(tripId);
      return;
    }
  }
  window.location.href = BACK_TO_GMT_HREF;
};

/** The links' click: a plain left click goes through `goBackToGmt`; a modified or middle click
 *  is left to the browser (it opens `BACK_TO_GMT_HREF` in a new tab or window). */
export const onBackToGmtClick = (e: MouseEvent): void => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  void goBackToGmt();
};
