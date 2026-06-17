# P2 — Gradient Portability Integration & W9 Snapshot — Execution Scope

**Date:** 2026-06-07
**Status:** DRAFT — consolidation probe; orchestrator to ratify; **PENDING-HUMAN-REVIEW**
**Source:** four read-only surveyors over `h:/GMT/workspace-gmt/dev/`; the P0 frozen kernels (a)–(f);
locked product decisions in [execution-progress.md](execution/execution-progress.md) (lines 285–296); and
the locked drag sub-plan [p2-drag-interaction-scope.md](p2-drag-interaction-scope.md) (the avatar +
cross-tab paradigm — referenced here, **not** re-specified).

All paths under `h:/GMT/workspace-gmt/dev/`.

---

## ✅ RATIFIED by user 2026-06-07 PM (orchestrator-locked)

- **Cross-mode undo focus → (b) AUTO-FOCUS the affected mode** (undo stack stays content-only; UI switches
  to the undone action's mode). Supersedes the earlier user lean toward (a) tab-as-undo-step.
- **W9 snapshot → DEFERRED out of P2** (its own post-P2 initiative). **Drop sub-stream P2-H; P2 is now 7
  sub-streams.** Remove the W9 references from the v1 plan below.
- **Sequencing → live-fractal carve merges FIRST, then P2 fans out; fullscreen-v2 P0+P1 lands
  independently** (accept ONE planned S6-well re-touch inside P2-C). P2 execution is gated on the
  live-fractal merge (awaiting the user's AT+LA deep-Mandelbrot visual).
- **Still open (not blocking fan-out — resolved when P2-A is prompted):** the exact select→act option set +
  selection affordance + whether Stops stays minimal.

---

## Verdict (read this first)

**P2 is a real, fan-outable integration phase — not one giant session.** Phase 1 shipped four working
modes (Picker / Generator / Image / Stops), the Favients shelf, fullscreen S6, and the frozen P0e drag
kernels (b)+(c). But the modes do not yet share an interaction model: each stage hand-rolls its own hero,
"clicking" means three different things across surfaces, the send-target registry is built-but-orphaned,
and the unified target list / pointer-drag / W9 snapshot / Update-vs-Save-as-new favourite identity are all
specced-but-unbuilt carry-forwards.

**Recommendation:** decompose P2 into **8 ordered sub-streams behind one ratification gate** (the
`getRect?` additive amendment to frozen interface (c), already drafted in the drag sub-plan). Build the
**canonical hero (P2-A)** and the **unified target list (P2-C)** as the two independent spines first; the
drag sub-plan's avatar/cross-tab work (P2-D) and snapshot/favourite work (P2-F/G) hang off them. **Land
P2 after the live-fractal carve merges, and let fullscreen-v2 Phase 0+1 land independently** with one
planned re-touch when P2 migrates the S6 well. **One frozen-interface change only** — additive, optional,
back-compatible. Overall effort: **~3–4 focused weeks**, the drag stream (~1–2wk) being the largest single
piece.

---

## 1. What P2 delivers

P2 makes a gradient **portable across the whole studio**: one canonical hero component embedded by every
mode and the Favients shelf; one coherent *select → reveal-options → act* interaction so clicking means the
same thing everywhere; and **one target list** that both the Send-to menu (click/keyboard) and the
pointer-drag avatar resolve through — so a gradient can be applied, sent, renamed, favourited, fullscreened,
or dropped onto any destination from any surface, identically. It also closes the document-persistence holes
(generator/image round-trip), wires perceptual auto-naming and Update-vs-Save-as-new favourite identity, and
adds the W9 timeline-snapshot semantics (export the current frame + a cue).

**Locked product decisions P2 implements** (from execution-progress.md §locked):
- **#1 (W8):** document set = generator + image + stops + favients; Replace/Append prompt on load, never silent clobber.
- **#2 (W2+W4):** FULL portability unification — *one canonical hero* + *one target list* (drag ↔ Send-to enumerate the same destinations) + per-swatch Send-to on the Favients shelf + export reachable from every result.
- **#3 (W3):** detail/smooth = non-destructive fit recipe (ghost preview, bake-to-commit) — *not* P2-owned, noted for boundary.
- **#5 (W9):** timeline = keying/compare tool; export/Send-to snapshot the **current frame + cue**.
- **#6 (T4):** favourite = saved-item id + **Update-vs-Save-as-new** (stable star, no shelf churn).
- **SELECT→ACT (NEW-FINDING, locked):** clicking a hero/swatch **selects + reveals options** (apply / Send-to / rename / fullscreen), it does **not** always immediately apply.

---

## 2. The canonical model

### (a) The canonical HERO component — `CanonicalHero`

Today **no canonical hero exists**: `PickerStage` (269–307), `GeneratorStage` (354–384), `ImageStage`
(508–528), `EditorStage` (50–60) and `FavRow` (FavientsPanel 333–494) each wrap the shared dumb
`GradientStrip` independently, with divergent name sources, FavStar placement, fullscreen affordance, and
*click* semantics. P2 extracts **one** component every surface embeds:

```ts
<CanonicalHero
  config        // GradientConfig — the gradient to show
  name          // display name (payload.name ?? stage label)
  source?       // provenance chip ('Picker · <bundle>', 'Generated', 'Image · <mode>', fav source)
  primaryTarget?  // SendTarget — the mode's default "apply" destination (absent ⇒ no default apply)
  // affordances (mode opts in):
  onSendTo?  onRename?  onFullscreen?  onFavourite?
  // drag source wiring (P2-D): startPointerDrag(payload)
/>
```

It owns: the `GradientStrip` render, the name + source chip, the `FavStar`, the **affordance header**, and —
most importantly — the **consistent SELECT→ACT interaction** (see (b)). It embeds the existing dumb
components rather than replacing them: `GradientStrip` (canvas ramp), `FavStar` (`isFav`/`toggle` via
`favientSig`), and the `SendToMenu` shell for the options popover.

**Hero state-loss fix (resize remount).** `PickerStage` keeps selection in *local* `useState<CatalogEntry>`
(line 71), so the desktop↔mobile layout flip remounts the Picker subtree and **blanks the hero** (the search
query survives because it lives in the transient `pickerSearch` store). P2 lifts the selected-entry/preview
state into a **transient module-level store on the `pickerSearch` precedent** (`useSyncExternalStore`, no
DDFS / no persist / no undo). **Single-source-of-truth decision (Decision 5 below):** either one
`heroState` store keyed by mode, or per-mode stores (`pickerHeroPreview`, …). Recommend **one keyed store**
to avoid four near-identical modules.

**Seam check:** additive only. `CanonicalHero` is a new component; `GradientStrip`/`FavStar`/`GradientHoverPreview`/`SendToMenu` are reused unchanged. No frozen signature touched here.

### (b) Unified SELECT → ACT interaction

Today click means three things: Picker **immediately applies** (`onPick` → `applyEntryToColoring`); Favients
**immediately applies** (`onApply` → `activeTarget.apply`) — which **blocks rename** (rename is a separate
double-click at FavientsPanel:472); Generator requires a **drag to slots** (no click-apply); Image has
**manual "Send to" buttons**; Editor/Stops is **read-only display**.

P2 unifies on **SELECT → reveal-options**: a click selects the gradient (visible selection affordance) and
reveals an **options popover** — *Apply (to primaryTarget if defined) · Send to ▾ · Rename · Fullscreen ·
★ Favourite* — mode filters which appear. This unblocks Favients rename and gives Generator/Image a
click-apply path they lack. The popover is the `SendToMenu` shell extended (or a thin sibling) so the
"Send to ▾" sub-list is exactly `targetsForPayload(payload)`.

**Selection affordance must be designed per surface** (a gap, Decision 4): Picker wall already draws a cyan
canvas border (PickerWall:197); Favients rows have none; Stops is read-only. P2 standardizes a single
selection ring/treatment.

**Stops/Editor caveat:** the Stops hero is *always-editing* — there is no discrete "apply". Its hero is
likely **minimal** (preview + rename + ★ + fullscreen), no primary-apply. Confirm in Decision 4.

### (c) The ONE target list — drag + Send-to resolve through (c)

A pointer **drop target** and a **send-target** are the same thing: both take a gradient payload and apply
it. The frozen **(c) `SendTarget<P> { id, label, group, accepts?, apply(payload) }`** is already the right
shape; `targetsForPayload` is the pure selector `SendToMenu` lists. P2:

- **Registers every in-app destination once as a `SendTarget`:** Generator slots A/B, "edit stops"
  (`paletteEditorStore.loadRamp` — *not yet exposed*, add it), each result hero's primaryTarget, and the
  export / PNG / fullscreen wells. `SendToMenu` lists them (click/keyboard parity); the pointer controller
  hit-tests the **same list** for drag. This *is* locked decision #2.
- **Migrates `palette/core/favientTargets.ts` → engine `store/sendTargetRegistry.ts`** (both back onto
  `createListRegistry`). This is the existing carry-forward; do it **incrementally** (fold targets in as
  they're wired) rather than a risky batch untangle of `apply(config,name)` → `apply(payload)`.

**The one frozen-interface change — `(c)` `getRect?` additive amendment (ALREADY RATIFIED 2026-06-06 per
execution-progress.md line 238–246, drag sub-plan §4):**

```ts
interface SendTarget<P> {
  …                              // unchanged frozen fields
  getRect?: () => DOMRect | null; // ADDITIVE optional — present ⇒ drag-droppable; absent ⇒ menu-only
}
```

Absent ⇒ Send-to-menu-only; present ⇒ also a pointer-drop zone. **This is the only frozen-interface change
in all of P2** — additive, optional, back-compatible (same pattern as the `render?` field ratified on (b)).
Treat it as the gate (§6 ordering). All other seams are additive new modules.

**Frozen interfaces consumed (no signature change):** (a) document-provider registry, (b) drop-well kernel
(scope *narrows* to OS-file/cross-app), (c) send-target kernel (+`getRect?`), (d) AdvancedGradientEditor
undo contract, (e) engine gradient core (`sampleStops`/`renderStopsToRamp`/`fitRampToStops`), (f) colour
core. `favientDnd.ts` `FavientDragPayload` shape stays immutable (HTML5 MIME *and* in-app pointer payload).

---

## 3. Drag & avatar (defer to the sub-plan)

The lifted-swatch avatar, cross-tab drag-to-reveal, the hybrid pointer/HTML5 paradigm, the pointer drag
controller (`store/pointerDragFlight.ts`), the avatar layer (`components/DragAvatarLayer.tsx`), the
`Z.dragAvatar=9500` constant, dwell timing, and the Layer-B `new DataTransfer()` compatibility shim are
**fully specified in [p2-drag-interaction-scope.md](p2-drag-interaction-scope.md)** and are **not re-scoped
here**. P2 consumes it as sub-stream **P2-D**, which depends on the unified target list (P2-C, since it
supplies `getRect`) and on the canonical hero (P2-A, since heroes become drag sources). The drag sub-plan's
own build breakdown (its pieces 1–8) maps inside P2-D.

---

## 4. W9 snapshot / timeline

**Status today: NOT IMPLEMENTED.** No timeline-snapshot capture path; no "(animated — current frame)" cue
on export/Send-to; no keyframe-binding for palette params. Locked decision #5 deliberately keeps this
**small**: the timeline is a keying/compare tool, and export/Send-to **snapshot the current frame + attach a
cue** — it is *not* a full multi-frame palette-animation export.

**Scope (v1, minimal):**
- When a palette param is animated, `CanonicalHero`/export reads the *current frame's* resolved
  `GradientConfig` (no new sampling path — reuse the live-computed result the hero already shows).
- Attach a textual cue ("animated — current frame") to the exported payload + any Send-to apply where the
  source is animated, so the user knows they captured a still.
- No keyframe authoring, no multi-frame bake.

**Effort: S–M. Deferrable.** This is the most isolable sub-stream (P2-H) and has no downstream dependents.
**Recommend v1-minimal if budget allows, else defer** (Decision 2) — it does not block the portability core.

---

## 5. Favourite model

Two unfired pieces, both isolated:

- **Update-vs-Save-as-new (decision #6, NOT WIRED):** `Favient.id` exists but there's no distinction between
  a fresh favourite and a saved item being re-tweaked, and no UI for it. P2 adds saved-item tracking + an
  **Update vs Save-as-new-variant** choice on edit, so the star stays stable and the shelf doesn't churn on
  every tweak. Builds on the existing `FavStar` (`isFav`/`toggle` via `favientSig`) and `paramUndoBracket`
  (every Favients mutation already brackets at the gesture boundary). **Effort: M.**
- **`facetName` auto-naming (frozen-ahead, UNFIRED):** `palette/core/facetName.ts` is a pure deterministic
  helper (perceptual facets → "Warm Vivid Rainbow") called **nowhere**. P2 wires it into the
  generated/extracted "save as favourite" flow (generator/image currently hardcode or blank the name).
  **Effort: S.**

Both fold into sub-stream **P2-G**. Per-swatch Send-to on the shelf (locked #2) is part of the
canonical-hero/target-list work (P2-A + P2-C), not here.

---

## 6. SUB-STREAM DECOMPOSITION (the key deliverable)

P2 decomposes into **8 sub-streams behind one ratification gate**. Most are disjoint; the contention is
almost entirely on two shared-shell files (`GradientExplorerApp.tsx` mount points,
`store/sendTargetRegistry.ts`). Dependency order below; "Contends on" flags shared files a fan-out session
must serialize or coordinate on.

| Gate | **(c) `getRect?` ratification** | — | execution-progress confirms ratified 2026-06-06; orchestrator re-confirms before P2-C/D start. |
|------|----|----|----|

| Stream | Scope | Size | Depends on | File-set (primary) | Contends on (shared shell) |
|--------|-------|------|-----------|--------------------|----------------------------|
| **P2-A · Canonical hero + select→act** | Extract `CanonicalHero`; embed in Picker/Generator/Image/Editor/FavRow; SELECT→ACT options popover; selection affordance. | **L** | — (spine 1) | NEW `CanonicalHero.tsx`; `PickerStage.tsx`, `GeneratorStage.tsx`, `ImageStage.tsx`, `EditorStage.tsx`, `FavientsPanel.tsx`; reuse `GradientStrip`/`FavStar`/`SendToMenu`. | every stage file (blast radius); coordinate w/ P2-B on PickerStage. |
| **P2-B · Hero state lift (resize fix)** | Lift Picker hero selection/preview to a transient `heroState` store (pickerSearch pattern); survives remount. | **S** | P2-A (hero owns the state) | NEW `palette/store/heroState.ts` (or `pickerHeroPreview.ts`); `PickerStage.tsx`. | `PickerStage.tsx` (with P2-A). |
| **P2-C · Unified target list** | Register Generator slots / stops-loadRamp / heroes / wells as `SendTarget`s w/ `getRect`; migrate `favientTargets.ts` → `sendTargetRegistry`; expose `paletteEditorStore.loadRamp` target. | **M–L** | Gate (getRect) | `store/sendTargetRegistry.ts`, `palette/core/favientTargets.ts`, `GeneratorStage.tsx`, `paletteEditorStore.ts`, `FullscreenGradientOverlay.tsx` (S6 well). | `sendTargetRegistry.ts` (with P2-D); GeneratorStage (with P2-A). |
| **P2-D · Pointer drag + avatar + cross-tab** | The whole drag sub-plan (pieces 1–8): `pointerDragFlight` store, `DragAvatarLayer`, sources, drop resolution, cross-tab dwell, Layer-B shim, parity, tests. | **L** | P2-A (sources), P2-C (getRect targets) | per [p2-drag-interaction-scope.md](p2-drag-interaction-scope.md): NEW `store/pointerDragFlight.ts`, `hooks/usePointerDrag.ts`, `components/DragAvatarLayer.tsx`; `PickerWall.tsx`, `Dock.tsx`, `zIndex.ts`. | `GradientExplorerApp.tsx` (avatar mount), `Dock.tsx`, `sendTargetRegistry.ts`. |
| **P2-E · Document round-trip holes** | Register generator + image document providers (capture/restore) so curves/slots/seed + ImageModel survive Save→reload. | **M** | — (independent) | `palette/store/generatorStore.ts`, `palette/store/imageStore.ts`, `palette/registerPaletteUI.ts`; pattern: `favientsDocument.ts`. | `registerPaletteUI.ts`. |
| **P2-F · ImageStage coexistence fix** | Make ImageStage window `dragover`/`drop` early-return on gradient MIME / in-app pointer payload (carry-forward bug, not new P2 code). | **S** | — (precondition) | `palette/components/ImageStage.tsx`. | none. |
| **P2-G · Favourite model** | Update-vs-Save-as-new identity + `facetName` auto-naming wiring. | **M** | P2-A (hero ★ affordance) | `palette/store/favientsStore.ts`, `palette/core/facetName.ts`, `FavStar.tsx`, generator/image save flows. | `favientsStore.ts`. |
| **P2-H · W9 snapshot v1** | Current-frame capture + "(animated — current frame)" cue on export/Send-to. | **S–M** *(deferrable)* | P2-C (apply path) | export/Send-to payload path; hero. | none. |

**Parallelizable spines:** P2-A and P2-C are the two independent roots and can run in parallel worktrees.
P2-E and P2-F are fully independent and can run anytime (P2-F is a **precondition** — fix it first, cheaply).
P2-B is a tiny dependent of P2-A. P2-D depends on both spines (largest stream). P2-G depends on P2-A's ★
affordance. P2-H is a leaf.

**Recommended wave order:**
1. **Pre:** P2-F (coexistence fix) + confirm `getRect?` gate.
2. **Wave 1 (parallel):** P2-A (hero) ‖ P2-C (target list) ‖ P2-E (doc round-trip).
3. **Wave 2:** P2-B (hero state lift, needs A) ‖ P2-G (favourite model, needs A) ‖ P2-D start (needs A+C).
4. **Wave 3:** P2-D finish (cross-tab + drop resolution) → P2-H (snapshot) → close-out + runtime re-verify.

---

## 7. Sequencing vs other work

- **Live-fractal carve merge:** P2's target list + fullscreen migration touch the live-fractal `'fractal'`
  GeometryId surface. **Recommend P2 lands *after* the live-fractal carve merges**, so P2-C/P2-D register
  against a settled fullscreen/geometry surface rather than chasing a moving target.
- **Fullscreen-v2:** the v2 param redesign (`{amount,seed}` → per-geom tagged union) collides with P2's S6
  well → `(c)`-SendTarget migration. The fullscreen-v2 probe recommends **v2 Phase 0+1 land independently
  and accept one planned re-touch** when P2 migrates the well. **Recommend accepting that one re-touch**
  rather than forcing all three to coordinate first (Decision 3). v2 Phase 0's tagged union **must leave a
  non-pure escape hatch** for the live-fractal `'fractal'` GeometryId (a WebGL renderer, not a pure mapper).
- **Net recommended order:** live-fractal carve → P2 (waves above) → fold the planned fullscreen-v2 re-touch
  in during P2-C.

---

## 8. Risks

- **Runtime ≠ gates (the S6 lesson).** S6's fullscreen well migrates from the (b) HTML5 well to a
  `(c)` `SendTarget` with `getRect`. S6 already taught "concept-ok ≠ runtime-works" (a premature merge was
  backed out). **Mandatory runtime visual re-verify** that fullscreen still opens after the migration —
  gates-green is not gates-live. Same applies to the avatar/cross-tab feel.
- **ImageStage coexistence (P2-F).** ImageStage's window-level `dragover`/`drop` listener `preventDefault`s
  *all* drags for file import; it must early-return on gradient MIME / in-app pointer payload. Documented but
  **not yet fixed** and owned by neither P0e nor "new P2 code". Fix it as a **precondition**, before the drag
  stream, with explicit collision testing (none exists today).
- **Every-hero blast radius.** P2-A rewrites the result surface of all five stages. A regression in
  `CanonicalHero` hits every mode at once. Mitigate: land the component behind each stage one at a time,
  visual-confirm per stage, keep `GradientStrip`/`FavStar` untouched as the stable substrate.
- **Global / cross-mode undo focus.** Ctrl+Z on a hidden-tab action currently undoes but does **not** switch
  to the mode where the action happened. Orchestrator lean is "(b) undo auto-focuses the affected mode," but
  there's **no precedent** for focus-dispatch-on-restore in the codebase. This is a Decision (below) and, if
  chosen, a small design+impl task riding the existing history-provider snapshot pattern.
- **Frozen-interface discipline.** Only `getRect?` changes (additive). Any pressure to alter `apply`/payload
  shape, the document-provider signatures, or the gradient/colour core is a **stop-and-ratify** event.
- **Migration-period dual paths.** During the `favientTargets → sendTargetRegistry` migration and the
  Layer-B shim window, a target may exist in both worlds. Keep the migration incremental and converge on
  `apply(payload)` to retire the synthetic-`DataTransfer` shim.

---

## 9. Decisions for the user (numbered)

1. **Cross-mode undo focus:** (a) treat each cross-tab action as an undo step without switching tabs
   (current behaviour), or **(b) undo auto-focuses/switches to the mode where the action happened**
   (standard UX, orchestrator lean). *Recommend (b)* — small, rides the history-provider snapshot pattern.
2. **W9 snapshot v1 or defer?** Ship the minimal current-frame + cue (P2-H, S–M, no dependents) in P2, or
   defer to a later phase. *Recommend v1-minimal if budget allows; safe to defer.*
3. **Start P2 before or after live-fractal / fullscreen-v2?** *Recommend:* live-fractal carve first, then
   P2; let fullscreen-v2 Phase 0+1 land independently and **accept one planned S6-well re-touch** during
   P2-C. Confirm the one-re-touch is acceptable vs. coordinating all three up front.
4. **Exact SELECT→ACT option set + selection affordance.** Confirm the popover actions per mode (proposed:
   *Apply · Send to ▾ · Rename · Fullscreen · ★*), whether **Stops** stays minimal (no primary-apply), and
   the single selection-highlight treatment across surfaces.
5. **Hero state store shape:** one `heroState` store keyed by mode, vs. per-mode transient stores.
   *Recommend one keyed store* (avoids four near-identical modules).
6. **Mobile drag timing:** desktop-first pointer drag + mobile Send-to menu now, mobile pointer-drag as a
   fast-follow (per drag sub-plan), or invest in mobile drag in P2. *Recommend fast-follow.*
7. **(Confirm) `getRect?` ratification** — execution-progress records it ratified 2026-06-06; orchestrator
   re-confirms it is still good before P2-C/D start. (No new decision expected; just the gate sign-off.)

---

## 10. Open questions the surveyors flagged

- **Payload envelope:** `FavientDragPayload` is gradient-specific (`{kind, config, name, source?, favId?}`).
  Does every drag/Send-to payload stay gradient-shaped, or does P2 define a wider `{kind, payload:unknown}`
  envelope for future non-gradient drags? (P2 `apply()` impls answer it; make the contract explicit.)
- **Hero name source:** stage-label + source chip, vs. `payload.name` when present, vs. always user-editable
  via rename. (Proposed: `name = payload.name ?? stage label`, `source` always a chip, rename always
  available — confirm.)
- **Per-swatch Send-to affordance on Favients:** hover-reveal "Send to ▾", a menu-icon badge per swatch, or
  context-menu-only? (Folds into the SELECT→ACT popover — confirm it's the same popover.)
- **Well visibility rules:** do export / PNG / fullscreen wells always fade in on any gradient drag, or are
  PNG/export mode-specific (Generator/Image have format choices; Picker/Stops don't)?
- **Undo bracket ownership on drop:** is one pointer-drag-drop one discrete undo entry, or does `apply()`
  run inside a caller-owned bracket? (Drag sub-plan leans: gesture-boundary brackets are separate from the
  explicit drop-apply.)
- **`facetName` wiring point:** auto-name only on extract→favient, or on every generated save? Where in the
  flow does it fire?
- **ColorBox-from-gradient + W13 monotone-cubic** are explicitly *out of P2 scope* (flagged for later
  tiers) — noted so they aren't accidentally pulled in.
