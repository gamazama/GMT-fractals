# New Scene Wizard — Build Spec

**Status**: Spec; not implemented. All prerequisites designed.
**Effort**: M (~1-2 days, after dependencies land)
**Depends on**: `formula-picker-design.md`, `partial-apply-utility.md`
**Replaces**: nothing — feature doesn't exist today

## Goal

A "New Scene" affordance in the File menu that lets the user start fresh with a chosen formula + optional setup (geometry, interlace secondary, shading copy from another scene). Doubles as a discovery surface for GMT capabilities without forcing a multi-step wizard on power users.

## UX shape — single-screen composer, not a wizard

A modal with sensible defaults where the "Create Scene" button is always available. Sections after Formula are collapsed by default. A user who just wants Mandelbulb clicks the formula tile and hits Create. A user who wants to dial in extras expands sections.

## Trigger

`File` menu → `New Scene` item, placed above `Load` (matches `New → Load → Save` convention). Registered alongside the existing items in [engine/plugins/SceneIO.tsx](../engine/plugins/SceneIO.tsx).

## Modal layout

```
┌─ New Scene ───────────────────────────────────────────────────┐
│                                                                │
│  Formula                                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  <FormulaPicker variant="inline" ...>                    │ │
│  │  (renders the single-category-at-a-time picker inline)   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ▶ Geometry                                  (3 toggles)      │  ← collapsed
│                                                                │
│  ▶ Interleave with second formula            (off)            │  ← collapsed
│                                                                │
│  ▶ Shading style                             (default)        │  ← collapsed
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                          [Cancel]  [Create]   │
└────────────────────────────────────────────────────────────────┘
```

### Section: Formula (always expanded)

- `<FormulaPicker variant="inline">` per locked design.
- `specialEntries={['modular']}` — Workshop launcher hidden (irrelevant from New Scene).
- Picker render-pauses the viewport while modal is open (per picker design); modal close restores.
- No disabledIds — all formulas are valid starting points.
- Default selection: the currently-active formula at modal open. Lets the user keep their current formula and just reset.

### Section: Geometry (optional)

Three checkbox toggles, mirroring existing geometry sections:

- ☐ Hybrid Box — with fold-type dropdown if enabled
- ☐ Burning Mode
- ☐ Julia Mode — with 3D offset inputs (xyz) if enabled
- ☐ Local Rotation (pre/post rotation matrices)

Each toggle uses the protocol's `evaluateCompat` to gray-out if incompatible with the chosen formula (e.g. Hybrid Box grays if formula is self-contained). Behavior identical to the panel-side grays from P3.

### Section: Interleave with second formula (optional)

- ☐ Enable Interlace
- Secondary formula: `<FormulaPicker variant="inline">` (compact) with `disabledIds` set to formulas where interlace's `requires.rejects.secondary` matches (Modular + self-contained primaries).
- (Interval + start-iter sliders are NOT in the wizard — those are runtime tuning, kept in the existing Interlace panel post-create.)

If Enable Interlace is checked but no secondary picked: validation prevents Create.

### Section: Shading style (optional)

- ◉ Use this formula's defaults (radio, default)
- ○ Copy from another scene: `<FormulaPicker variant="inline">` (compact)
- (Shown only when "Copy from another scene" is selected.)

When committed, copies these feature slices from the picked formula's `defaultPreset`: `lighting`, `materials`, `atmosphere`, `ao`, `reflections`, `volumetric`. Skips `coloring` (formula-specific). Implemented via `applyPartialPreset()`.

## State management

Local component state during composition:

```ts
interface NewSceneState {
  formula: FormulaType;                                  // default: current formula
  geometry: {
    hybridBox: boolean;
    hybridFoldType?: number;
    burningMode: boolean;
    juliaMode: boolean;
    juliaOffset?: { x: number; y: number; z: number };
    localRotation: boolean;
  };
  interlace: {
    enabled: boolean;
    secondaryFormula?: FormulaType;
  };
  shading: {
    source: 'this-formula' | 'another-formula';
    sourceFormula?: FormulaType;
  };
}
```

Pure local state — store is NOT mutated until user clicks Create. Cancel discards everything.

## Commit flow

On Create:

```
1. Dirty-state check
   ├─ if current scene unsaved (lastSavedHash != null and != currentHash):
   │    show 3-button modal: [Save first] [Discard] [Cancel]
   │    Save first → run saveGMFScene(), then continue
   │    Discard → continue
   │    Cancel → return to wizard
   └─ else: continue immediately

2. Build target preset
   ├─ Start from picked formula's defaultPreset (deep clone)
   ├─ Override projectSettings.name = "Untitled Scene"
   ├─ Apply geometry toggles to features.geometry slice
   ├─ Apply interlace state to features.interlace slice (compile + secondary
   │    if enabled; runtime params left at defaults — user tunes post-create)
   ├─ Animation: explicit reset (clear sequence, durationFrames=0, isPlaying=false)
   └─ savedCameras: clear (scene-scoped; new scene starts empty)

3. Call engineStore.loadScene({preset: target})
   ├─ Routes through existing compile gate (CONFIG → CONFIG_DONE)
   ├─ Spinner shows "Compiling Shader..."
   └─ Engine teleports camera, swaps formula, applies features

4. After loadScene completes:
   ├─ If shading.source === 'another-formula':
   │    applyPartialPreset({
   │      source: registry.get(shading.sourceFormula).defaultPreset,
   │      featureIds: ['lighting', 'materials', 'atmosphere', 'ao',
   │                   'reflections', 'volumetric'],
   │    })
   │    Triggers second compile (compile-flagged feature toggles).
   └─ Reset undo history via existing resetParamHistory()

5. Close modal
```

## Modal close behavior

- **Escape** or click-outside: confirm-then-cancel if any non-default field is set, else cancel silently.
- **Create button**: enabled when validation passes (formula picked + if interlace enabled, secondary picked).
- **Cancel button**: discard without applying.

## File layout

```
dev/components/NewSceneModal.tsx              ← the modal + composer UI (~250 lines)
dev/components/NewSceneModal/Geometry.tsx     ← geometry section (~80 lines)
dev/components/NewSceneModal/Interlace.tsx    ← interlace section (~60 lines)
dev/components/NewSceneModal/Shading.tsx      ← shading section (~50 lines)
dev/engine/plugins/SceneIO.tsx                ← add menu item (3-line edit)
```

NewSceneModal opens via a Zustand store flag (`useEngineStore.getState().setNewSceneOpen(true)`), to integrate cleanly with the existing modal stack (matches the pattern other modals use).

## Integration points (all already specced/built)

- **`<FormulaPicker>`** ← from [plans/formula-picker-design.md](./formula-picker-design.md). Used 3× in the wizard.
- **`applyPartialPreset()`** ← from [plans/partial-apply-utility.md](./partial-apply-utility.md). Used for shading copy.
- **`evaluateCompat()`** ← already shipped (P0). Used for disabledIds in formula pickers + geometry section gating.
- **`engineStore.loadScene()`** ← existing. Drives the preset hydration + compile.
- **`saveGMFScene()`** ← existing. Used by the dirty-state "Save first" path.

## Dirty-state detection

Uses the existing `lastSavedHash` in engineStore (set after save/load; compared against current state hash on demand). No new infra.

## Validation

- Formula must be picked (default: current formula → always satisfied)
- If interlace enabled, secondary must be picked
- If shading source = another-formula, sourceFormula must be picked

Validation errors are inline (red text below the relevant section); Create button disables when any error present.

## What this spec does NOT include

- **Quick-start tiles** — parked. Use case wasn't strong enough vs. existing Gallery + preset library + Workshop entry points.
- **Use-case driven flow** ("I want a glowing fractal") — separate future feature.
- **Random/Surprise-me** button — future.
- **Workshop integration** — Workshop has its own entry; New Scene picker hides Workshop launcher.
- **Per-section advanced tuning** (Hybrid Box fold-type beyond the default, Local Rotation matrices) — wizard provides toggles; detailed tuning happens in post-create panels.
- **Modular pipeline picker** — Modular is a formula option; selecting it sets up the default JULIA_REPEATER_PIPELINE and user customizes via the Graph panel after.

## Edge cases

| Case | Behavior |
|------|----------|
| User picks formula then changes mind | Just pick a different one — section stays expanded |
| User toggles geometry feature that's incompatible with formula | Section grays + tooltip, toggle disabled |
| User picks self-contained formula then enables interlace | Interlace section grays — same protocol as panel-side |
| User has unsaved work | 3-button confirm dialog (Save first / Discard / Cancel) before applying |
| User cancels mid-composition | All local state discarded, no store mutation, no compile |
| User picks Modular | Geometry + Interlace toggles still work (Modular composes per P3 decisions); shading copy works |
| Shading source = current formula | Same as default; no-op for shading copy |

## Build order

1. **Foundation deps** — Build [`applyPartialPreset()`](./partial-apply-utility.md) (~3h, no UI). Required for shading copy.
2. **Picker build** — Build [`<FormulaPicker>`](./formula-picker-design.md) (~3-5d). Wizard imports it.
3. **Wizard shell** — `NewSceneModal.tsx` with Formula section only + Create button. Wire to File menu. Validate the loadScene + animation-reset + savedCameras-clear flow. (~1d)
4. **Geometry section** — Add toggles + protocol gating. (~half day)
5. **Interlace section** — Add toggle + secondary picker. (~half day)
6. **Shading section** — Add source-formula picker + applyPartialPreset wiring. (~half day)
7. **Dirty-state confirm** — Wire saveGMFScene + 3-button modal. (~2-3h)
8. **Validation + polish** — Disable Create, inline errors, Escape semantics. (~half day)

Total once deps land: ~2-3 days for the wizard itself.

## Acceptance criteria

- Opens from File menu above Load
- Formula picker defaults to current formula
- Each section's protocol gating matches the runtime panel behavior (e.g. interlace grays on self-contained primary)
- Create routes through loadScene → existing compile gate → spinner → done
- Cancel discards everything; store untouched
- Dirty-state confirm appears when current scene has unsaved changes; respects user's choice
- Animation timeline cleared (sequence empty, frame 0, not playing)
- Saved-cameras list cleared
- Shading copy applies the 6 feature slices and triggers any compile-flagged recompile
- Undo history reset after commit (prevents undoing the create itself into a confusing state)

## Test plan

- Visual smoke: 6 paths
  - Mandelbulb → Create (no changes) → confirm scene matches Mandelbulb default
  - MandelTerrain → enable Burning Mode → Create → confirm burning effect visible
  - Mandelbulb + interlace = AmazingBox → Create → confirm interlaced render
  - Modular → Create → confirm graph editor populated with default pipeline
  - Mandelbulb + shading copy from MandelTerrain → Create → confirm lighting matches MandelTerrain
  - Open New Scene with current scene dirty → confirm 3-button dialog appears
- Keyboard smoke: Tab order, Escape semantics, Create button enable/disable

## See also

- [plans/capability-protocol.md](./capability-protocol.md) — feature compat rules consumed by wizard sections
- [plans/formula-picker-design.md](./formula-picker-design.md) — picker used 3× in wizard
- [plans/partial-apply-utility.md](./partial-apply-utility.md) — utility for shading copy
- [plans/per-feature-reset-feasibility.md](./per-feature-reset-feasibility.md) — orthogonal feature (per-feature reset is a separate affordance, not part of New Scene)
