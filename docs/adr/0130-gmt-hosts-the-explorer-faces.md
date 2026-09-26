# ADR-0130: GMT hosts the Explorer's faces in a Gradient Studio that previews, then bakes

- **Status:** Accepted
- **Date:** 2026-09-26
- **Relates to:** ADR-0111 (the working pipeline the Studio runs over a param), ADR-0122 (the output
  form), ADR-0129 (the Paint face — its files moved here, see the update block there), ADR-0114 (the
  Explorer's visual language the window reuses), ADR-0060 / ADR-0081 (the floating panel it opens in).
  Code: `palette/store/gradientStudio.ts` (grep `previewGradient`, `bakeStudio`, `cancelStudioFace`),
  `palette/components/GradientStudioPanel.tsx`, `palette/components/GradientStudioEntrance.tsx`,
  `palette/installGradientStudio.ts`, `palette/components/faces/` (`CurvesFace`, `AdjustFace`,
  `FaceTabs`), `palette/components/paint/`, `palette/store/paintStore.ts` (`setPaintSink`),
  `components/gradient/gradientEditorEntrance.ts`, `components/gradient/gradientParamPreview.ts`,
  `components/ui/FloatingPanel.tsx` (grep `useFloatingPanelChrome`, `autoHeight`, `edgeResize`),
  `engine/PanelManifest.ts` (`chrome`). Guard: `npm run smoke:gradient-studio`. Shipped in `ad28b8bb`.

## Context

The owner asked for GMT's gradient editor to get "a popout which lets it float, and gives it the
curves, adjust and paint faces from gradient explorer". Then, as it was built and tried:

- one window; the sky gradient gets all three faces like the colour layers; Paint leaving a ramp
  instead of stops is fine; the Adjust dials are not kept — "like gradient editor, lets have it bake
  on close/apply (undoable)";
- "much closer to the original gradient explorer … the gradient should be larger, and the shelves
  should use the dropdown tray and gradient explorer sliders";
- "the hero's header should be the draggable chrome and it should not be dockable"; "the hero
  gradient's width adjustable from its sides"; "when the tray would land offscreen, it should prefer
  a scrollbar rather than moving the panel up";
- the sidebar editor "only updates once the user has closed the expanded gradient editor, while the
  fractal is updating instantly".

The faces were private to the Explorer: Curves and Adjust inside its `Tray.tsx`, the tab row inside
`WorkingHero.tsx`, Paint in `gradient-explorer/v2/paint/`. Each wrote into the Explorer's working
model, which GMT does not load.

## Decision

1. **Move the faces, don't port them.** Curves, Adjust, Paint and the face tab row live in `palette/`
   and both apps host the same components. What differs between hosts goes through a seam, never a
   branch on the host: Adjust's `onApply`, Curves' `CurvesFaceDerived` input, Paint's `setPaintSink`
   (the Explorer's sink is `gradient-explorer/v2/paint/workingPaintSink.ts`). The Explorer is
   unchanged; its smokes are the proof.
2. **One Studio, one target** — a DDFS gradient param `(featureId, paramKey)`. The popout beside
   every full-chrome editor's ★ points the Studio at that param; moving to another one commits the
   open face on the old one first. The editor's header seam became an ordered multi-entrance
   registry for it, and the Studio's own editor passes `entranceHost="studio"` so its popout hides.
3. **A live face previews and does not write.** While Curves, Adjust or Paint has a result, the
   param's uniform is sent that result (render-only, `previewGradient`) and the result is PUBLISHED
   for every other surface that draws the param (`gradientParamPreview` — the sidebar editor's bar,
   whose knots then read as stale, and GMT's section strips). The store, undo and saves keep the
   gradient, so the param is the face's source: an undo or a sidebar edit mid-face just moves the
   preview.
4. **Leaving bakes, as one undo entry.** Apply, leaving the face, closing the window or moving to
   another gradient write the result and reset the dials and curves in one `paramGroup`; undoing it
   gives back the gradient and the dials together. Esc runs the face's own cancel. Looking costs
   nothing: entering Curves fits outside undo, and an untouched fit is dropped outside undo.
5. **The window is the Explorer's hero card.** The shared editor in strip chrome with a larger bar,
   `FaceTabs` in its control row, the face in a tray tucked under the card in the `soft` input skin,
   Paint holding the bar through `stripTakeover`, the stop inspector portalled into the tray.
6. **…with no window chrome of its own.** A panel may declare `chrome: 'bare'`: `DraggableWindow`
   then renders a `FloatingPanel` with no title bar that lends its content the drag handle and close
   (`useFloatingPanelChrome` — the card's name row takes them), follows its content's height
   (`autoHeight`, capped to the room below its top, so a tall tray scrolls instead of pushing the
   window up) and resizes its width from the side edges (`edgeResize="x"`). A bare panel is
   float-only: `movePanel` refuses to dock it.

## Consequences

- The Studio edits any gradient param any host exposes; nothing in it names a GMT feature. fluid-toy
  could mount it by calling `installGradientStudio`.
- `chrome: 'bare'`, `useFloatingPanelChrome`, `autoHeight`, `edgeResize` and the preview seam are
  generic; every existing panel defaults to the old behaviour.
- The render-only preview lasts until something re-sends the param's uniform (a shader rebuild, say)
  while nothing in the Studio changes — an `@assumption` in `gradientStudio.ts`. A preview is cleared
  only by whoever set it — an `@assumption` in `gradientParamPreview.ts`.
- The dials (`paletteGenerator`) and the curves (`generatorStore`) are shared state, which is why
  there is one Studio window rather than one per gradient.
- A scene saved with a face live saves the gradient without the live result, and the dials where
  they stand: there is no pre-save hook to bake first.
- Editing a store file while the dev server runs makes `smoke:gradient-studio` read a second module
  instance and fail at [5] whatever changed — restart the server (recorded in the smoke's header).
