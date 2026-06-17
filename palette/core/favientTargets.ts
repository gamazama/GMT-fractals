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
 *   • browse / studio actions — the panel header's Palettes + open-studio buttons.
 *
 * Host-agnostic + side-effect-free at import: hosts set these in their own registration
 * step (the same place they register their send targets).
 */

const _listeners = new Set<() => void>();
const notify = (): void => _listeners.forEach((l) => l());

/**
 * Subscribe to host-capability changes (select-mode / browse / studio). Returns
 * unsubscribe. These are normally set once at boot, but the panel subscribes defensively
 * in case a host registers later. (The panel separately subscribes to the send-target
 * registry for its destination LIST — that's where targets live now.)
 */
export const subscribeFavientHost = (l: () => void): (() => void) => {
  _listeners.add(l);
  return () => {
    _listeners.delete(l);
  };
};

// --- "select mode" (host capability) — a host that provides a select→reveal→place dock
// (the Gradient Explorer's GradientDropLayer) sets this so the Favients panel flips a
// swatch CLICK from immediate apply to SELECT (pick → enlarge → dock), and hides its
// "Destination" dropdown (the dock supersedes it). Hosts WITHOUT a dock (app-gmt, which
// applies favourites straight to its coloring layers via the dropdown) leave it false. ---
let _selectMode = false;

export const setFavientSelectMode = (on: boolean): void => {
  if (_selectMode === on) return;
  _selectMode = on;
  notify();
};

export const getFavientSelectMode = (): boolean => _selectMode;

// --- "browse palettes" action (host-specific) — drives the Favients header's Palettes
// button. Studio switches to the Picker tab; app-gmt opens the Palettes overlay. ---
let _browse: (() => void) | null = null;

export const setFavientBrowseAction = (fn: (() => void) | null): void => {
  _browse = fn;
  notify();
};

export const getFavientBrowseAction = (): (() => void) | null => _browse;

// --- "open GMT Gradient Explorer" action (host-specific) — drives the Favients header's
// studio-launch button. Registered only where launching the standalone explorer makes
// sense (app-gmt); unset inside the explorer itself, so the button hides there. ---
let _studio: (() => void) | null = null;

export const setFavientStudioAction = (fn: (() => void) | null): void => {
  _studio = fn;
  notify();
};

export const getFavientStudioAction = (): (() => void) | null => _studio;
