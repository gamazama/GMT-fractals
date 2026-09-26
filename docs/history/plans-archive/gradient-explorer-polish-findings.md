# GMT Gradient Explorer — Polish-Planning Findings

**Status:** planning only — no code. From an 8-agent polish-style review (7 lenses +
completeness critic) of the *intended* 4-mode studio, fed
[gradient-explorer-amendments-plan.md](gradient-explorer-amendments-plan.md).
**Tally:** 88 findings — 56 Structural / 22 Polish-defer / 10 Ask; 23 high-severity;
**49 new**, 39 reinforce the plan.
**Method:** `/polish` DNA (frame → surface + holistic review → completeness critic) with the
apply step swapped for triage (Structural / Polish-defer / Ask). Raw findings:
`h:/tmp/gx-polish.json`.

The feature plan answers *"what's missing as features."* This pass answers *"does the whole
thing feel like one tool, and do the workflows actually complete."* The headline: the feature
plan is sound, but it treats six workstreams as **parallel** when several are really **one
system** — and it has **two studio-wide holes no individual feature surfaced.**

---

## The two studio-wide holes (highest priority — NEW)

### H1. Save/Load silently does NOT round-trip the gradient documents *(critic, high)*
The shell installs `installSceneIO({fileExtension:'json'})` and `main.tsx`'s own comment claims
the dials round-trip because they're DDFS slices. But `getPreset` (`engineStore.ts:381-407`)
serialises **only** `featureRegistry` (DDFS) slices + animations. The real authoring lives in
**separate non-DDFS stores**: `generatorStore` (curve Tracks, slots, curvesOn, seed),
`imageStore` (the `ImageModel` + traced path), the planned `paletteEditorStore` (stops), and
`favientsStore`. **None are in the preset.** So File→Save then reload gives the dials back but
**loses all curve sculpting, the traced path, edited stops, and possibly favourites.** Every
authoring workflow (W-b curves/trace, W-e import-refine, W1 Stops) is silently non-persistent
across save/reload. The plan flagged this only as one Stops-specific open question; it is
studio-wide.
> **Fix (new workstream):** a **document-provider registry** parallel to the history-provider
> one — `generatorStore`/`imageStore`/`paletteEditorStore`/`favients` each register
> `{serialize, restore}` into the SceneIO path, so Save/Load captures the whole studio, not just
> the dials. This is the single most consequential finding of the session.

### H2. Three (soon five) competing "where does this gradient go" models *(cross-mode + IA + Favients, high)*
"Send a gradient somewhere" is a **different verb in every mode**: Image uses push-buttons
("Send to Generator A/B"), Generator/Picker use a one-click FavStar toggle (★), Favients uses a
*passive* global "Destination ▾" that fires on a separate swatch click. W2 (Send-to registry) +
W4 (wells) risk adding a **4th and 5th** control rather than unifying. After both land, one
gradient can travel four ways (star / send-to / drag-to-slot / drag-to-well) with **no single
"this is how gradients move" concept.**
> **Fix:** state ONE model — *every gradient is a draggable object; "Send to ▾" is the
> click/keyboard equivalent of dragging it onto a target; wells and Favients are just
> always-available drop targets* — and make **drag and Send-to enumerate the SAME target list**
> (slots, Stops, export, PNG, fullscreen, Favients, coloring layers). Then W2 and W4 are one
> system, not two. Corollaries: the Favients shelf needs **per-swatch** Send-to (not just the
> global header dropdown); a single **canonical result-hero layout** (star + send + export +
> provenance, fixed order) reused verbatim by all four modes.

---

## Cross-cutting structural themes (where the plan needs reframing)

### T1. Generator "curves mode" feels broken in three ways *(Generator lens, high)*
The central dead-end of W-b. All three are NEW (the plan's W3 ghost-curves is adjacent but
doesn't fix any of them):
- **Live re-fit silently destroys manual curve edits.** With curves on, nudging `detail`/`smooth`
  re-runs `fitFromSource` after 120ms (`GeneratorStage:124-131`), wholesale-replacing the L/C/h
  Tracks — every hand-edited keyframe gone, no warning. Reads as a crash. → Treat `detail`/`smooth`
  as a **fit recipe**, not a live override: dirty-flag once a keyframe is touched and stop
  auto-re-fitting (or gate behind explicit "Re-fit (discards manual edits)"); route any
  overwrite through one undo entry + a toast.
- **Sources stay clickable but inert when curves drive output.** A/B strips, Mix sliders, slot
  mods are dimmed to opacity-40 but fully interactive; dragging them does nothing → feels broken.
  → Make them genuinely non-interactive (`pointer-events-none` + hint), or make editing a frozen
  source offer "sources changed: re-fit curves?".
- **Slot picker only browses 24 built-in presets.** `GradientSourcePicker` reads
  `buildPresetCatalog()` only — your Favients and sent/custom ramps are invisible, so W-c's
  click-path is a dead-end (only drag-from-shelf works). → Feed the slot picker from the unified
  catalog (built-ins + Favients + recent/custom) with section headers.

### T2. Picker is a near dead-end / not a real pipeline source *(Picker + cross-mode + IA, high)*
- **Standalone pick goes nowhere.** `onPick` only calls `applyEntryToColoring` — a **guaranteed
  no-op** in the studio (no fractal). The hero offers only FavStar: no Send, no export, no
  "tweak." W-a and W-d both stall. The plan under-specifies that the Picker hero has **no Extras
  panel of its own**, so its star+send+export is **net-new chrome**, not a drop-in.
- **Per-host pick semantics must be decided together (NEW framing).** Two reviewers contradicted —
  "silently recolours the fractal every click" (app-gmt) vs "no-op" (studio). Both true, two
  hosts: in the **standalone shell, remove the `applyEntryToColoring` call** (it can never
  succeed; Send-to becomes the primary destination); in **app-gmt, make pick-as-apply
  intentional** (preview vs commit, one undo transaction, visible target layer).
- **Mobile find is unowned.** Carve toolbar, zoom readout, gesture hints are all `hidden md:`;
  wall zoom/pan key off mouse buttons 1/2 with no touch path. On a phone the Picker is a flat,
  un-zoomable, un-carvable wall of 11k swatches. → Own it: pinch-zoom + search-as-primary-narrower
  (extend W6), or explicitly declare carve desktop-only with a stated mobile substitute.
- **Four (soon five) independent narrowers, no unified clear.** carve/quality/theme/source(/search)
  each clear from a different place; carve is surfaced only by a tiny desktop-only chip. "Why is my
  11k wall showing 200?" has no single answer. → Surface all active filters + one clear near the
  count ("200 of 11000 — carved · clear"), visible on mobile.

### T3. Result heroes & export are three different anatomies *(IA lens, high)*
Picker hero = star+name+link+count (no export, no send); Generator = Result+star+stops+height
toggle; Image = Result+star+inline send-buttons. **Export is dock-only and split from the result**
— and the Picker has no export at all (must favourite first). The W4 well helps *drag* users; a
non-dragging user picking a gradient still has no visible "export this." → Commit to a **single
canonical hero contract** reused by all four modes, with export reachable from the result, not
just the dock.

### T4. FavStar churn pollutes the shelf *(cross-mode, medium)*
FavStar identity = the gradient's content signature, so **editing the result flips ★→☆**; while
tuning you can never see a stable "saved" state, and re-favouriting spawns near-duplicate entries.
W5's list/search makes the litter *visible* but doesn't fix the churn at source. → Decide:
favourite tracks a "saved item" identity (rename/update in place) rather than pure content-hash.

### T5. Stops mode arrives breaking two studio contracts *(Stops lens, medium)*
- It has **zero DDFS dials** (the editor *is* the canvas), so its dock tab would render an empty
  AutoFeaturePanel — breaking "a dock tab = that mode's controls." → Host the editor's **inspector**
  (interpolation/position/bias/blend/colorSpace) in the dock as the mode's controls; uncramp the
  canvas header.
- It carries **its own Favients button + clipboard menu** (`AdvancedGradientEditor:665-692`),
  predating the shared-hero pattern → it'd be the only mode with a different save control in a
  different place. → Drop the internal entrances for the shared hero.
- **Inbound handoff is lossy** — a bare ramp into Stops routes through `fitRampToStops`
  (DE-0.02, ≤128 stops); Stops→Generator→Stops is **not identity** (a clean 4-stop gradient
  returns as dozens of knots). → Pass stops **verbatim** when the payload already carries a
  `GradientConfig`; only fit genuinely ramp-only sources; show a "re-fit to N stops" cue when a
  fit occurred.

### T6. An entire authoring dimension is unreviewed: animation/timeline *(critic, medium — Ask)*
`installModulation` + `TimelineHost` are mounted and palette params carry keyframe diamonds — so
**a gradient can be animated over time**, and nobody evaluated it as a workflow. Open: is the
timeline appropriate/discoverable in a palette tool; what do **export / Send-to / wells do with an
animated gradient** (capture one frame and silently drop the animation?); a keyed param makes the
"result" a moving target, compounding FavStar churn. → Decide the timeline's role deliberately
and define **snapshot semantics** for sending/exporting a time-varying gradient.

### T7. Undo-coverage parity is uneven *(critic, medium)*
Ctrl+Z is shell-wide, but only `paletteGenerator` (and planned `favients`) have history
providers. **Image** (extract/replace/trace) and the planned **Stops** document have none. →
Define the per-mode undo contract alongside W5: every mode's *document* mutations get a provider;
transient view filters (carve/quality/search/zoom) deliberately don't. (Pairs naturally with H1 —
the same store set needs both serialize-for-save and capture-for-undo.)

### T8. Cross-tab incoherence of shared localStorage *(critic + Favients, medium)*
The Explorer and app-gmt are *designed* to be open together (Back-to-GMT / launch-in-new-tab
links), but shared `gmt.favients` (and `paletteFilters`) don't live-sync — a fav saved in one tab
is stale in the other until reload, and undo is single-tab. → Add a `storage`-event listener to
the shared stores; document the single-tab-undo caveat where the cross-app link lives.

---

## Polish-defer (cosmetic — hand to a real `/polish` pass post-build)
- Image: result/export split across canvas + dock-bottom (eye-jump); mode shown twice (canvas
  tabs + dock dropdown) — "which is authoritative?"; mode dials live in a different panel than the
  canvas handles.
- Picker: arrange model (Group/Rows/Sort tri-axis) is powerful but never self-described — add a
  muted one-line "Source → lightness rows → hue-sorted" caption near the count.
- Naming axis: the four mode labels mix artifact/tool/action nouns; "Favients" is a coined word
  the app itself jokes about ("where gradients go to die") — settle a naming axis before W1 locks
  manifest ids (doc/help churn otherwise).
- Error/feedback uniformity: Image uses two independent toast layers (1.4s, easy to miss);
  Generator/Picker surface no failure feedback; standardise on the shell `ToastHost`.
- Empty/first-run: no global orientation to tabs-as-modes or the "everything draggable" theme;
  reword the empty-Favients gag into teaching copy.
- Keyboard/non-pointer parity: all core gestures (drag-to-slot, drag-to-well, carve, drag-stops)
  are pointer-only — make "Send to ▾" a real focusable menu so it doubles as the keyboard path.

---

## What this means for the plan
The feature plan stays, but gains **two new structural workstreams** and **reframes two existing
ones as one system**:

- **NEW W8 — Studio document persistence + undo parity (H1 + T7).** A document-provider registry
  feeding *both* SceneIO save/load and the undo stack, covering generator/image/stops/favients.
  **High priority — this is a correctness hole, not a feature.**
- **NEW W9 — Decide the animation/timeline role + snapshot semantics (T6).** Ask-first.
- **Reframe W2 + W4 as ONE "gradient portability" system (H2 + T3 + T4):** one model, one target
  list shared by drag and Send-to, one canonical result hero (incl. Picker + per-swatch on the
  shelf), export-from-result.
- **W1 (Stops) absorbs T5:** inspector-in-dock, drop internal save entrances, verbatim-stops
  inbound + re-fit cue.
- **Generator coherence (T1)** becomes explicit scope (it was only adjacent to W3): the
  destructive re-fit, inert-but-clickable sources, and unified slot picker.
- **W6 (Picker search) absorbs T2:** remove the studio no-op pick, net-new hero chrome, mobile
  find story, unified filter-clear.

---

## Elevated decisions for the human (the ones that change architecture)
1. **Document persistence (H1):** build the document-provider registry so Save/Load round-trips
   the whole studio? (Strongly recommended — current behaviour silently loses authoring.)
2. **One portability model (H2):** commit to "every gradient is a draggable object + Send-to is
   its click/keyboard twin, one shared target list" as the unifying frame for W2+W4?
3. **Generator curves (T1):** detail/smooth as a non-destructive *fit recipe* (dirty-flag) vs
   keep live-refit behind an explicit guarded control?
4. **Picker pick semantics (T2):** remove the no-op apply in the standalone shell; make app-gmt
   pick preview-vs-commit — confirm the paired per-host decision.
5. **Animation (T6):** is animating a palette an intended workflow? If yes, define export/send
   snapshot semantics; if incidental, consider hiding the timeline in this shell.
6. **FavStar identity (T4):** favourite as a saved-item identity (update-in-place) vs pure
   content-hash (current, causes churn)?
