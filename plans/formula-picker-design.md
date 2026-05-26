# Unified Formula Picker — Locked Design

**Status**: Design locked 2026-05-25 (post-iteration). Not implemented.
**Effort**: M (~3-5 days, per the original consolidation research).
**Replaces**: 11 disjoint formula-selection affordances surveyed in [plans/capability-protocol.md] picker recon (PortalDropdown, GenericDropdown × 3 sites, Workshop browser, randomize ops, etc.).

## Goals

One reusable `<FormulaPicker>` component used in three places:
1. Main formula select (today: PortalDropdown)
2. Interlace secondary select (today: plain GenericDropdown in feature panel)
3. Shading-source select (new — for New Scene wizard)

## Layout

```
┌─ Pick a formula ───────────────────── [▦ Grid] [≡ List] ──┐
│ 🔍 type to search ___________________________________ [×] │
├──────────────────┬─────────────────────────────────────────┤
│ Categories       │  POWER FRACTALS                          │
│                  │                                          │
│ ▸ Power Fractals │  [thumb] [thumb] [thumb] [thumb]        │
│   Box & Folds    │  Mandelbulb  Mandelbar3D  Buffalo  Phoenix
│   Menger & IFS   │                                          │
│   Polyhedra      │  [thumb] [thumb] [thumb] [thumb]        │
│   Kleinian       │  BoxBulb   MakinBrot   Quaternion  ...  │
│   Hybrids        │                                          │
│   Tutorial       │                                          │
│                  │                                          │
│ ─── Special ───  │                                          │
│ ▦ Modular        │                                          │
│ ⚒ Workshop ↗     │                                          │
│                  │                                          │
│ ─── Custom ───   │  ← shown ONLY when user has imported    │
│   (N imported)   │    formulas registered in the session   │
└──────────────────┴─────────────────────────────────────────┘
```

## Behaviour

### Sidebar groups

**Native categories (7)** — split the 44 native formulas:
- Power Fractals (Mandelbulb family + Quaternion + Phoenix + Bristorbrot + MakinBrot + Tetrabrot + Mandelbar3D + JuliaMorph + MandelTerrain + MandelMap + MandelBolic + Mandelorus + BoxBulb + Buffalo + Claude)
- Box & Folds (AmazingBox + AmazingSurf + AmazingSurface + KaliBox + MarbleMarcher)
- Menger & IFS (MengerSponge + MengerAdvanced + MixPinski + SierpinskiTetrahedron)
- Polyhedra (Octahedron + Dodecahedron + Icosahedron + Cuboctahedron + TruncatedIcosahedron + RhombicDodecahedron + RhombicTriacontahedron + GreatStellatedDodecahedron + Coxeter)
- Kleinian / Apollonian (Kleinian + KleinianJos + KleinianMobius + PseudoKleinian + PseudoKleinianAdv + PseudoKleinianMod4 + Apollonian)
- Hybrids & Experimental (Borromean + Appell + SineJulia3D + …)
- Tutorial (…)

Exact assignments deferred to implementation (current `engine-gmt/formulas/categories.ts` has the mapping; new picker can extend it).

**Special group (always shown)**:
- **Modular** (▦) — selecting sets `formula = 'Modular'`. Same as picking any other formula. Distinct icon to signal it uses the graph editor.
- **Workshop** (⚒ ↗) — selecting does NOT change the formula. Launches the existing Workshop modal. Outbound arrow signals it leaves the picker context.

**Custom group (conditionally shown)**: only when the registry contains formulas with `importSource` set (formulas imported via Workshop during the session). Each shown as a regular card; selecting switches formula. Hidden entirely when empty.

### Right-pane grid

- Shows one category's formulas at a time.
- Cards: thumbnail (64×64 default — smaller than today's gallery), name, optional tags row.
- Hover: expand to a larger preview floater (256×256) anchored beside the card — same pattern as today's PortalDropdown.
- Disabled cards: grayed via `disabledIds` prop (compat-aware contexts like interlace-secondary pass a Set of formula IDs to disable). Tooltip explains via `disabledReason(formulaId)`.

### Search

- Search input autofocuses on open.
- Typing fuzzy-matches across name + category + tags.
- During search: sidebar collapses; right pane shows flat matches sorted by relevance.
- Clear (×) or Escape returns to category browse.

### Keyboard

- ↑ ↓ navigate sidebar categories.
- ← → navigate right-pane grid (or list rows in List mode).
- Enter on a card: select (commit) and close.
- Enter on Workshop: launch modal (different commit semantics).
- Escape: close without selecting.
- Disabled cards skipped during arrow nav.
- Tab moves through the standard focus order (search → sidebar → grid → header buttons).

### View mode toggle: Grid / List

Header has `[▦ Grid] [≡ List]` toggle. Default Grid. List = text-only rows with name + 1-line description, no thumbnails. List preference persists in localStorage. Useful when:
- User is on a low-perf device
- App is mid-render and they want minimal extra GPU load
- They know the formula by name and don't need to browse visually

## Performance — primary mechanism

**Pause the render loop while picker is open.** The store already has `isPaused` / `setIsPaused` (used by PauseControls, PerformanceMonitor, AccumulationController). The picker hooks the same mechanism:

```ts
useEffect(() => {
  const wasPaused = useEngineStore.getState().isPaused;
  useEngineStore.getState().setIsPaused(true);
  return () => useEngineStore.getState().setIsPaused(wasPaused);
}, []);  // mount = open, unmount = close
```

Save-and-restore preserves the user's prior pause state — if they manually paused before opening the picker, we don't auto-resume on close.

Freeing the engine frees the GPU. Thumbnails decode in the picker without competing for the GPU. This single change addresses the bulk of the "app is often under strain" concern.

## Performance — secondary mitigations

Even with render paused, the picker itself should be cheap:

- **Lazy thumbnails** via IntersectionObserver (already in current FormulaGallery's `LazyThumbnail`).
- **Smaller default thumb size** (64×64 instead of today's larger size). Hover-preview still expands to full size.
- **Debounced category switch** — when user clicks through categories rapidly, defer thumb decode 100–150ms so quick browsing doesn't trigger N decodes.
- **List mode** — full bypass of thumb cost, user-toggleable.

## Component API

```ts
export interface FormulaPickerProps {
  variant: 'popover' | 'inline' | 'modal';

  // Positioning (popover only)
  anchorRect?: DOMRect;

  // Selection model
  value?: string;                            // currently-selected id (for highlight)
  /** Two-action commit. Most entries commit as 'select' (caller updates state).
   *  Workshop and similar launcher-only entries commit as 'launch' (caller
   *  opens the target modal without changing formula). */
  onCommit: (commit: { action: 'select' | 'launch'; id: string }) => void;
  onClose?: () => void;

  // Filtering
  /** Limit which special entries appear. Default: ['modular', 'workshop'].
   *  Pass [] to hide all special entries (e.g. interlace-secondary picker
   *  doesn't need Workshop or Modular). */
  specialEntries?: Array<'modular' | 'workshop'>;
  /** Disabled-by-compat ids. Picker grays + tooltips these. Caller computes
   *  this set via evaluateCompat for compat-aware contexts. */
  disabledIds?: Set<string>;
  disabledReason?: (id: string) => string | undefined;

  // Behaviour
  autoFocusSearch?: boolean;                 // default true
  defaultView?: 'grid' | 'list';             // initial; can be overridden by localStorage

  // UI knobs
  showHoverPreview?: boolean;                // default true; disabled on mobile

  // Slots
  headerSlot?: React.ReactNode;              // e.g. wizard "Step 1 of 3" label
  footerSlot?: React.ReactNode;
}

export interface FormulaPickerRef {
  focusSearch: () => void;
  selectRandom: () => void;
}
```

## Call site examples

```tsx
// Main formula picker (sidebar / topbar trigger).
<FormulaPicker
  variant="popover"
  anchorRect={triggerRect}
  value={currentFormula}
  onCommit={(c) => {
    if (c.action === 'select') setFormula(c.id);
    else if (c.action === 'launch' && c.id === 'workshop') openWorkshop();
    closePicker();
  }}
  onClose={closePicker}
/>

// Interlace secondary picker (inline in feature panel).
<FormulaPicker
  variant="inline"
  value={interlaceSecondary}
  specialEntries={[]}                     // no Workshop / Modular launcher
  disabledIds={interlaceRejectedIds}      // computed from interlace.requires.rejects.secondary
  disabledReason={(id) => `${id}: not compatible as interlace secondary`}
  onCommit={(c) => c.action === 'select' && setInterlaceFormula(c.id)}
/>

// New Scene shading-source picker (modal step).
<FormulaPicker
  variant="modal"
  specialEntries={[]}                     // shading copy from natives + customs only
  headerSlot={<h2>Step 4 — Pick a scene to copy lighting / materials from</h2>}
  onCommit={(c) => c.action === 'select' && setShadingSource(c.id)}
  onClose={() => setShadingSource(undefined)}
/>
```

## What this design does NOT include

- **Workshop catalog browsing** — the 360+ frag/DEC fixtures stay inside Workshop's existing `CategoryPickerMenu`. The unified picker is for "ready to use" formulas, not the import catalog.
- **GMF gallery / scene browser** — `.gmf` files are scenes, not formulas. They stay in the existing load-via-file flow + the dedicated gallery dropdown for curated GMFs.
- **Source filter pills** (Native / Frag / DEC / GMF) — removed in iteration. Picker is for formulas users can pick to render; how they got there is implementation detail.

## Migration plan

Implement in this order:
1. **Build `<FormulaPicker>`** (~2 days) — including the render-pause hook, lazy thumbs, search, keyboard, view toggle.
2. **Replace main picker** (~half day) — swap `PortalDropdown` for `<FormulaPicker variant="popover">`. Largest blast radius; smoke before merging.
3. **Replace interlace secondary** (~half day) — feature panel's GenericDropdown becomes `<FormulaPicker variant="inline">` with compat-aware `disabledIds`. Closes the P4 work parked during protocol prep.
4. **Add to New Scene wizard** (~later, with the wizard itself).
5. **Workshop browser stays untouched** — its `CategoryPickerMenu` is purpose-built for the import catalog.

## Open

- Random pick: implementable as `selectRandom()` ref method but not exposed as visible UI in this iteration. If desired, add a `[🎲]` button in the header — easy add later.
- Tags / search across descriptions: current manifest has `tags` field; use it in fuzzy match. Implementation detail.
- localStorage key for view mode preference: TBD — `gmt.formulaPicker.viewMode`.

## Test plan

- Visual smoke per call site (3 contexts).
- Manual perf check on a low-end device with a heavy scene loaded — confirm opening the picker doesn't drop the FPS counter further (render paused = it shouldn't move at all).
- Keyboard smoke: tab order, search-while-typing, Escape semantics, disabled-skip.

## See also

- [plans/capability-protocol.md](./capability-protocol.md) — picker is a consumer of the capability protocol's `disabledIds` outputs.
- [plans/partial-apply-utility.md](./partial-apply-utility.md) — picker provides the formula ID for shading-source; partial-apply does the actual copy.
- [docs/gmt/35_Capability_Protocol.md](../docs/gmt/35_Capability_Protocol.md) — reducer that produces `disabledIds`.
