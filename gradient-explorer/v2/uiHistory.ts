/**
 * uiHistory — the v2 shell's INTERFACE state on the undo stack.
 *
 * Owner, 2026-09-12: "undo must save interface state". The case that asked for it: the ♥ files
 * a gradient into a set and the rail's chip flashes to say which one took it — but the rail can
 * be covered (a tray face is open, an Export window is up) and then the save is silent. The fix
 * the owner wanted is to CLOSE what covers it, which is only acceptable if the thing you closed
 * comes back: so the surfaces a gesture disturbs ride that gesture's undo entry.
 *
 * Owner, 2026-09-24: "I just want to ensure that UI goes along with undo." The interface after an
 * undo or a redo must be the one that belongs with the gradient on show.
 *
 * THE INTERFACE IS CONTEXT (2026-09-24). Every provider here is a CONTEXT provider
 * (@see store/slices/historySlice.ts `HistoryProvider.context`): the interface an entry was made
 * IN rides EVERY entry, changed or not — undo puts it back as it was when the gesture began, redo
 * as it was when you pressed undo — and it never makes an entry of its own. Opening a face or
 * folding the hero is still navigation and still stays off the stack (owner's call: "transaction
 * only is fine"; the wider reading turns Ctrl+Z into a back button).
 *
 * Before 2026-09-24 the interface was ordinary CONTENT: it rode an entry only when it CHANGED
 * inside that entry's bracket, which made every caller that moved a surface commit the move
 * synchronously inside its bracket (`flushSync`, ADR-0120 §3) — and most of the shell's gestures
 * move the surface OUTSIDE their data bracket (the tab switch bakes the face, THEN closes it).
 * Measured that day, a dozen ways the interface came back contradicting the data: undo a closed
 * Adjust and its dial was live again with no face; undo leaving Mix and a live Mix sat under a
 * closed tray, its chip reading "live from Image"; undo the ♥ or New Gradient over a stop
 * inspector and the inspector came back EMPTY; undo opening Curves and the face said "Nothing to
 * fit yet" over a gradient. Context closes that whole class at once, because the interface an
 * entry restores is the one captured in the same instant as the data it restores.
 *
 * WHAT RIDES: which face is open, whether the hero is folded, the two Export windows, the armed
 * Mix slot (`useShellUiHistory`); the SELECTED STOPS while the stop inspector is the open
 * face (`useStopSelectionHistory`, the hero's — the inspector face is only a portal host for the
 * selection, so a face restored without it is an empty panel); and whether the ground's FILTERS
 * rows are open and whether the hero's fold is theirs (`useFiltersHistory`, BrowseStage's —
 * since 2026-09-24 opening Filters folds the hero, so a fold restored without the rows that made
 * it is a hero hidden for no reason on screen).
 *
 * SCOPED TO GE v2 (owner: app-gmt "is not built in a way that UI undo would make sense"). The
 * providers are registered by the shell and the hero on mount and unregistered on unmount, so no
 * other host carries the keys — `registerHistoryProvider` is global, the registration is not.
 *
 * WHY A PORT RATHER THAN A STORE. The shell holds this state in `useState`, which a provider
 * cannot read. Moving it into a zustand store for undo's sake would be a refactor in service of
 * the mechanism rather than the feature, so instead the shell hands this module a fresh
 * capture/restore pair on every render through `useShellUiHistory`, and the provider calls
 * through it. The pair is read through a ref, so a re-render cannot leave a stale closure
 * behind and the provider registration never churns. A context capture reads the last COMMITTED
 * render, which is exactly "as it was when the gesture began": a gesture's own pending setState
 * is not yet in it.
 *
 * @see docs/adr/0120-the-interface-rides-the-undo-entry.md
 * @invariant every undo entry pushed while the shell is mounted carries the interface as it was
 *   when its gesture began, so one Ctrl+Z puts back the face (and the stop it was inspecting) that
 *   belongs with the data it restores — proven by: npm run smoke:ge-uiundo ("[3] one undo put back
 *   BOTH", "[6] ♥ over a stop inspector: one undo — the inspector came back with its stop", "[8]
 *   leaving Mix: one undo — the Mix face with the live Mix", "[11] closing Adjust with a dial: undo
 *   gives the Adjust face and its dial"). Falsified 2026-09-24: both providers registered with
 *   `context: false` → [3] and [6]–[13] red; the hero's selection restore skipped → [6], [12] red
 *   (F1 / F2 in the guard's header). The Filters rows and their fold — proven by: npm run
 *   smoke:ge-ground ("[15e] Ctrl+Z folded the hero with Filters CLOSED", "[15f] the undo that
 *   reopened Filters FOLDED the hero"). Falsified the same day: `useFiltersHistory` not
 *   registered → [15e] red; its restore read as a gesture (BrowseStage's `filtersShownWas` not
 *   set) → [15f] red.
 */

import { useEffect, useRef } from 'react';
import { registerHistoryProvider, unregisterHistoryProvider } from '../../store/slices/historySlice';
import type { TrayFace } from './Tray';

/** The surfaces worth restoring: which face is open, whether the hero is folded, the two
 *  Export windows, and which Mix slot the next pick fills. Anything a user would notice moving
 *  under them when an edit is undone. */
export interface ShellUiState {
  tray: TrayFace;
  folded: boolean;
  exportOpen: boolean;
  exportGround: boolean;
  /** The ARMED Mix slot (palette/store/armedTarget) — the wall is B's picker only while the Mix
   *  face is open, so an undo that closes Mix must disarm, and one that reopens it re-arm.
   *  Absent in a snapshot from before 2026-09-24: read as unarmed. */
  armed?: 'A' | 'B' | null;
}

const KEY = 'gx-v2-ui';
const SEL_KEY = 'gx-v2-sel';
const FILTERS_KEY = 'gx-v2-filters';

/**
 * Put the shell's interface state on the param undo stack, as CONTEXT, for as long as the shell
 * is mounted.
 *
 * @param state   the current surfaces — read on every `beginParamTransaction`.
 * @param restore applies a captured snapshot. Called from `undo`/`redo`, i.e. outside React's
 *                event handlers, so it must set state and nothing else.
 */
export const useShellUiHistory = (state: ShellUiState, restore: (s: ShellUiState) => void): void => {
  const live = useRef({ state, restore });
  live.current = { state, restore };
  useEffect(() => {
    registerHistoryProvider(KEY, {
      capture: () => ({ ...live.current.state }),
      restore: (snap) => {
        if (snap && typeof snap === 'object') live.current.restore(snap as ShellUiState);
      },
      context: true,
    });
    return () => unregisterHistoryProvider(KEY);
  }, []);
};

/** What the ground's FILTERS rows ride: whether they are open, and whether the hero's fold is
 *  FILTERS' OWN (Filters folds the hero while it is open and unfolds only a fold it made —
 *  BrowseStage, grep `filtersFolded`). */
export interface FiltersUiState {
  open: boolean;
  foldIsFilters: boolean;
}

/**
 * The Filters rows and the ownership of the fold, on the same entries as the face (context too).
 * BrowseStage registers it, since both live there. Owner, 2026-09-24: opening Filters folds the
 * hero, so the fold alone coming back without the rows that made it is exactly the "interface
 * contradicting the data" this module exists to prevent (measured the same day: a Filters change
 * made with the rows open, the rows closed, Ctrl+Z — the change undone and the hero FOLDED with
 * Filters closed).
 *
 * @param read    the rows' state as of the last committed render, and the ownership flag.
 * @param restore hands both back. Called from `undo`/`redo` in the same batch as the shell's
 *                restore of `folded`, which stays the truth for the fold itself: the restore must
 *                only set Filters' own state, and must not let BrowseStage read it as a gesture
 *                (opening folds, closing unfolds) — see its `useFiltersHistory` call.
 */
export const useFiltersHistory = (read: () => FiltersUiState, restore: (s: FiltersUiState) => void): void => {
  const live = useRef({ read, restore });
  live.current = { read, restore };
  useEffect(() => {
    registerHistoryProvider(FILTERS_KEY, {
      capture: () => ({ ...live.current.read() }),
      restore: (snap) => {
        const s = snap && typeof snap === 'object' ? (snap as Partial<FiltersUiState>) : {};
        live.current.restore({ open: !!s.open, foldIsFilters: !!s.foldIsFilters });
      },
      context: true,
    });
    return () => unregisterHistoryProvider(FILTERS_KEY);
  }, []);
};

/**
 * The stops the INSPECTOR face is showing, on the same entries as the face (context too). The
 * hero registers it, since the selection lives in its editor.
 *
 * @param read    the selected stop ids — only while the inspector is the open face, else [] (any
 *                other face clears the selection, so there is nothing to put back with it).
 * @param restore hands the ids back. Called from `undo`/`redo` in the same batch as the shell's
 *                restore, so it must only set state: the hero applies it after the editor has
 *                taken the restored value (see `WorkingHero`, grep `selRestore`).
 */
export const useStopSelectionHistory = (read: () => string[], restore: (ids: string[]) => void): void => {
  const live = useRef({ read, restore });
  live.current = { read, restore };
  useEffect(() => {
    registerHistoryProvider(SEL_KEY, {
      capture: () => live.current.read(),
      restore: (snap) => live.current.restore(Array.isArray(snap) ? snap.filter((x): x is string => typeof x === 'string') : []),
      context: true,
    });
    return () => unregisterHistoryProvider(SEL_KEY);
  }, []);
};
