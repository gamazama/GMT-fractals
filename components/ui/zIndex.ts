/**
 * Single source of truth for floating-surface stacking.
 *
 * Before this, surfaces carried ad-hoc z-index values that had drifted apart
 * (50, 60, 65, 70, 80, 100, 1000, 1100, 1200, 2000, 2050, 2100, 2200, 9998,
 * 9999) with no documented ordering. These named tiers replace them. Each
 * band leaves headroom so a surface can sit "just above" a sibling via
 * `Z.modal + 1` without colliding with the next band.
 *
 * Ordering (low → high):
 *   panel       non-blocking floating panels (DraggableWindow, LoadFilter, CenterHUD popups)
 *   popover     anchored dropdowns / popovers attached to a trigger
 *   modal       app-level blocking modal + its backdrop (NewScene, FormulaPicker, HardwarePrefs)
 *   modalNested a dialog stacked on top of a modal (NewScene's discard confirm)
 *   overlay      full-screen takeover surfaces (Gallery)
 *   overlayNested a modal launched from within an overlay (Submit, Lightbox)
 *   overlayResult a result/zoom surface above the nested band (bucket-render result, submit zoom)
 *   overlayTop   must sit above the whole overlay band (Auth / Account — sign-in over the gallery)
 *   contextMenu  right-click / context menus — always above everything else
 */
export const Z = {
    panel: 100,
    popover: 200,
    modal: 1000,
    modalNested: 1100,
    overlay: 2000,
    overlayNested: 2100,
    overlayResult: 2200,
    overlayTop: 2400,
    contextMenu: 9000,
} as const;

export type ZTier = keyof typeof Z;
