/**
 * uiHistory — the v2 shell's INTERFACE state on the undo stack.
 *
 * Owner, 2026-09-12: "undo must save interface state". The case that asked for it: the ♥ files
 * a gradient into a set and the rail's chip flashes to say which one took it — but the rail can
 * be covered (a tray face is open, an Export window is up) and then the save is silent. The fix
 * the owner wanted is to CLOSE what covers it, which is only acceptable if the thing you closed
 * comes back: so the surfaces a gesture disturbs ride that gesture's undo entry.
 *
 * WHAT RIDES, AND WHAT DOES NOT. This is a history PROVIDER
 * (@see store/slices/historySlice.ts `registerHistoryProvider`), so it is captured when some
 * OTHER gesture opens a param transaction and restored when that entry is undone. It never
 * pushes an entry of its own — opening a face or folding the hero on its own is navigation and
 * stays off the stack (owner's call: "transaction only is fine"; the wider reading turns Ctrl+Z
 * into a back button). What it means in practice is that a gesture which both edits something
 * and moves the furniture is undone as one act, furniture included.
 *
 * SCOPED TO GE v2 (owner: app-gmt "is not built in a way that UI undo would make sense"). The
 * provider is registered by the shell on mount and unregistered on unmount, so no other host
 * carries the key — `registerHistoryProvider` is global, the registration is not.
 *
 * WHY A PORT RATHER THAN A STORE. The shell holds this state in `useState`, which a provider
 * cannot read. Moving it into a zustand store for undo's sake would be a refactor in service of
 * the mechanism rather than the feature, so instead the shell hands this module a fresh
 * capture/restore pair on every render through `useShellUiHistory`, and the provider calls
 * through it. The pair is read through a ref, so a re-render cannot leave a stale closure
 * behind and the provider registration never churns.
 *
 * @see docs/adr/0120-the-interface-rides-the-undo-entry.md
 * @invariant a gesture that closes a surface inside its own bracket has that surface on its
 *   undo entry — proven by: npm run smoke:ge-uiundo ("[3] one undo put back BOTH"). Falsified
 *   three ways on 2026-09-12; the guard's header names them. The subtle half is that the close
 *   must be COMMITTED inside the bracket (flushSync), since the bracket diffs synchronously.
 */

import { useEffect, useRef } from 'react';
import { registerHistoryProvider, unregisterHistoryProvider } from '../../store/slices/historySlice';
import type { TrayFace } from './Tray';

/** The surfaces worth restoring: which face is open, whether the hero is folded, and the two
 *  Export windows. Anything a user would notice moving under them when an edit is undone. */
export interface ShellUiState {
  tray: TrayFace;
  folded: boolean;
  exportOpen: boolean;
  exportGround: boolean;
}

const KEY = 'gx-v2-ui';

/**
 * Put the shell's interface state on the param undo stack for as long as the shell is mounted.
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
    });
    return () => unregisterHistoryProvider(KEY);
  }, []);
};
