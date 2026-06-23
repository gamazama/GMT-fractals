/**
 * The single portal host every floating surface mounts into.
 *
 * Today this is `document.body` (every app's surfaces portal there). It is
 * indirected here so that (a) there is ONE place the "top host" is defined, and
 * (b) a future dedicated portal-root div is a one-line `setLayerHost(el)` swap at
 * boot instead of a find-and-replace across ~30 `createPortal(_, document.body)`
 * call sites.
 *
 * `<Layer>` and the `Modal`/`AnchoredMenu`/`FloatingPanel` primitives all resolve
 * their portal target through {@link getLayerHost}, so they move together.
 *
 * @see plans/z-index-system-design.md (§3d — portal-vs-trap enforcement)
 */
let host: HTMLElement | null = null;

/** Override the portal host (e.g. a dedicated `#layer-root` div). Call once at boot. */
export const setLayerHost = (el: HTMLElement | null): void => { host = el; };

/** The current portal host. Defaults to `document.body`. */
export const getLayerHost = (): HTMLElement => host ?? document.body;
