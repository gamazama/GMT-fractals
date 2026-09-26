/**
 * favientTargets — the Favients panel's per-HOST capability flags.
 *
 * The apply-target LIST this module used to own ("where a favourite applies") was folded
 * onto the engine send-target registry (`store/sendTargetRegistry`) in P2: every gradient
 * destination is now a `SendTarget` — `group: 'host'` for a host coloring layer, `'mode'`
 * for an intra-app surface (Generator slot, Stops, …). One registry, not two; the
 * `createListRegistry` kernel backs it. The panel reads `getSendTargets()` (filtered to
 * the host group) for its "Destination" dropdown.
 *
 * What remains here is host capability the generic registry can't express — the panel
 * still needs it to adapt to its embedding app:
 *   • select mode — does this host provide the select→reveal→place dock (the Explorer)?
 *   • studio action — the panel header's open-the-Explorer button. (A "browse palettes"
 *     action for a Palettes button lived here too; its only host, app-gmt's Gradient
 *     Library overlay, was retired 2026-09-26.)
 *
 * Host-agnostic + side-effect-free at import: hosts set these in their own registration
 * step (the same place they register their send targets).
 */

import { createSingleSlot } from '../../store/createSingleSlot';

// Each capability is one engine single-slot (last-writer-wins + subscribe). They were
// three hand-rolled value+listener pairs sharing one notify; now they ride the shared
// `createSingleSlot` primitive (the same one the gradient editor seams use).
const _selectMode = createSingleSlot<boolean>(false);
const _studio = createSingleSlot<() => void>();

/**
 * Subscribe to host-capability changes (select-mode / studio). Returns
 * unsubscribe. These are normally set once at boot, but the panel subscribes defensively
 * in case a host registers later. (The panel separately subscribes to the send-target
 * registry for its destination LIST — that's where targets live now.)
 */
export const subscribeFavientHost = (l: () => void): (() => void) => {
  const unsubs = [_selectMode.subscribe(l), _studio.subscribe(l)];
  return () => unsubs.forEach((u) => u());
};

// --- "select mode" (host capability) — a host that provides a select→reveal→place dock
// (the Gradient Explorer's GradientDropLayer) sets this so the Favients panel flips a
// swatch CLICK from immediate apply to SELECT (pick → enlarge → dock), and hides its
// "Destination" dropdown (the dock supersedes it). Hosts WITHOUT a dock (app-gmt, which
// applies favourites straight to its coloring layers via the dropdown) leave it false. ---
export const setFavientSelectMode = (on: boolean): void => _selectMode.set(on);

export const getFavientSelectMode = (): boolean => _selectMode.get() ?? false;

// --- "open GMT Gradient Explorer" action (host-specific) — drives the Favients header's
// studio-launch button. Registered only where launching the standalone explorer makes
// sense (app-gmt); unset inside the explorer itself, so the button hides there. ---
export const setFavientStudioAction = (fn: (() => void) | null): void => _studio.set(fn);

export const getFavientStudioAction = (): (() => void) | null => _studio.get();
