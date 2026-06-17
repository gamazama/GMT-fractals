# P3 — Whole-App Coherence Findings (Gradient Explorer)

**Status: PROPOSE-ONLY — nothing applied.** This is the triaged output of the P3 `/polish`
pass (review → triage → HALT). Edits land on branch `exec/p3-polish` (created, empty) only
after the user picks items. Gates per touched area: `tsc` 0 · `npm run test:palette` green.

Method: 6 parallel read-only reviewers (mode-studio · Generator trio · fullscreen-v2 ·
select→reveal→place · mobile/layout/IA · known-nits+shared-component map) + a completeness
critic. Reviewer IDs in brackets (e.g. `A4-4` = select→reveal→place reviewer, finding 4).

**App model + constraints used:** focused client-side gradient tool for power-user artists;
NOT a consumer/onboarding product (no empty-state/marketing bloat). One deliberate unified
**select → reveal → place** selection path (no second parallel control). app-gmt HOST changes
(pick semantics, DnD-into-app-gmt) are PARKED/out of scope; shared-component changes that
incidentally hit app-gmt are flagged and lean Ask. No new deps; match existing design language;
preserve functionality. User does VISUAL testing — every item carries a "what to look at".

**Shared-component blast-radius map (from A6 — tag every proposal against this):**
- `ScalarInput` / `usePrecisionTrackDrag` — app-wide slider primitive, **highest** radius (app-gmt + fluid-toy + mesh-export + GX). *(Note: Generator MixBlend uses `DraggableNumber`, NOT ScalarInput — those are GX-local.)*
- `EmbeddedColorPicker` — gradient editor + generic DDFS panel + app-gmt lighting panels.
- `components/graph/*` `GraphCanvas`/`GraphSelectionBBox` — shared with app-gmt animation timeline.
- `CanonicalHero`, `FavientsPanel`, `StopsDockPanel`, `gradientActions.ts` (Reset-Default) — all mounted in app-gmt too.

---

## Consolidated candidate themes

The reviewers' 50+ raw findings collapse into 8 cross-surface themes (C1–C8) plus housekeeping (H1–H4).

| ID | Theme | Rolls up |
|----|-------|----------|
| C1 | Unified reset system (glyph/label/placement/scope) | A2-1, A2-5, A3-1, A5-4, H4 |
| C2 | CanonicalHero / save-star / placeholder / metadata unification | A1-4, A1-9, A4-1, A4-3, A4-6, A4-7 |
| C3 | Accent-token convention (cyan = active/selected/brand) | A1-3, A3-9, A4-1, A4-2 |
| C4 | Grey-scale + caption/casing + microcopy normalization | A1-6, A1-8, A2-2, A4-5, A5-6 |
| C5 | Fullscreen control-surface parity | A3-2, A3-3, A3-4, A3-6, A3-7, A3-8, A3-10 |
| C6 | Per-mode hint / tutorial / entry consistency | A3-5, A4-5, A1-7 |
| C7 | Mobile single-source-of-truth + IA parity | A5-1, A5-2, A5-3, A5-6, A5-8 |
| C8 | Place-verb completion (mount SendToMenu) | A4-4 |

---

# ACT — high-confidence, improves coherence, low risk, GX-local

> Apply on approval. All behavior-preserving unless noted; all confined to Explorer-only files
> (no shared/app-gmt blast) unless flagged.

### ACT-1 · Stage-root class divergence + Generator missing `min-h-0`  [A1-1]
- **Surface:** `PickerStage.tsx:328`, `GeneratorStage.tsx:365` (no `min-h-0`), `ImageStage.tsx:436`.
- **Off:** Three stage roots each declare the same intent with a different class set; Generator omits `min-h-0` (lets a tall inner block push the flex container instead of scrolling inside).
- **Change:** One `STAGE_ROOT` constant (`flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-zinc-950 relative`) applied to all three.
- **Blast:** 3 stage files + 1 tiny shared constant; Explorer-only. **Effort S · behavior-preserving** (the `min-h-0` add is strictly safer).
- **Look at:** Tab Picker/Generator/Image — backgrounds/edges identical; in Generator, fit a tall curve and confirm the hero/sources scroll inside the stage, not overflow.

### ACT-2 · Shared `HeroPlaceholder` (empty result slot) + one metadata slot  [A1-4, A1-9, part of C2]
- **Surface:** Picker deselected placeholder `PickerStage.tsx:345-358` (polished, dashed, height-matched) vs Image no-result `ImageStage.tsx:500-509` (plain box, different idiom); hero metadata shown 3 ways (Generator `trailing` "N stops"; Picker a row *below* the hero; Image nothing).
- **Change:** Extract `HeroPlaceholder` (dashed frame, `useHeroHeight()`, caption prop) and reuse in Image's no-result state. Route Picker's bundle provenance through the hero's `source`/`trailing` slot instead of the separate row the code comment already flags as awkward (`PickerStage.tsx:362`). Generator legitimately has no empty state — leave it.
- **Blast:** new `palette/components/HeroPlaceholder.tsx` + PickerStage + ImageStage. CanonicalHero unchanged (only what callers *pass*), so no app-gmt impact. **Effort S · behavior-preserving.**
- **Look at:** Image mode before extracting — empty box should read like the Picker's dashed "select it" placeholder; picked Picker entry shows provenance inside the hero, not on a thin row below.

### ACT-3 · Grey-scale + caption/casing normalization  [A1-6, A4-5, C4]
- **Surface:** Picker uses `zinc-*` greys + lowercase chrome labels ("Select", "zoom"); Generator/Image/Favients use `gray-*` + 10px uppercase captions. Picker empty placeholder copy says "preview it here" — misleading (clicking *selects*, it doesn't preview).
- **Change:** Read `data/theme` tokens first; align Picker chrome greys + caption casing to the studio's `gray-*` + uppercase convention. Fix Picker placeholder "preview it here" → "select it" / "click a swatch to select".
- **Blast:** PickerStage (+ maybe HeroPlaceholder). Explorer-only. **Effort S · behavior-preserving.**
- **Look at:** Picker beside Generator — small grey labels should match in hue + casing; placeholder copy names "select".

### ACT-4 · Source-swap microcopy + ellipsis convention  [A1-8, C4]
- **Surface:** "Replace image" (`ImageStage.tsx:483`), "Fit from gradient…" (`GeneratorStage.tsx:298`), "Fit from source"/"Re-fit from source" (`:453`) — 3-4 phrasings + inconsistent `…` for the same "give this mode a new input" verb.
- **Change:** Every picker/file-dialog opener ends in `…` ("Replace image…"); align the Generator's two "Fit from gradient…" entries to identical wording. No new control.
- **Blast:** ImageStage + GeneratorStage. Explorer-only. **Effort S · behavior-preserving.**
- **Look at:** Compare action-button labels across Image/Generator — consistent verb + `…`.

### ACT-5 · Picker search copy unify + carve-hint wrap  [A5-5, A5-6]
- **Surface:** Desktop collapsible search placeholder `"name · theme · source"` (`PickerStage.tsx:383-414`) vs mobile full-width `"Search name · theme · source"` (`GradientExplorerApp.tsx:206-218`) — same store, divergent copy + clear-button style. Long carve hint (`PickerStage.tsx:463-470`) wraps awkwardly + shoves the wall at ~920px narrow-desktop.
- **Change:** Unify the placeholder string (one wording); condense/truncate the carve hint (or move verbose part to a title) when the toolbar container is narrow.
- **Blast:** PickerStage + GradientExplorerApp. Explorer-only. **Effort S · behavior-preserving.**
- **Look at:** Search field at 1200px (desktop) vs 400px (mobile) — same placeholder; Paint tool active at ~920px — hint no longer wraps the wall down.

### ACT-6 · Fullscreen: Spline hint + split-mode hint composition  [A3-5, C6]
- **Surface:** Spline declares NO `hint`, so it falls through to the generic `'Esc to close · display-only preview'` (`FullscreenGradientOverlay.tsx:348`) — **wrong**, spline is fully interactive; its real instructions hide in a `hidden sm:inline` toolbar span that vanishes when narrow. Split mode replaces ALL per-mode hints (`:347`) so interaction guidance disappears in the docked pane.
- **Change:** Give `splineMode` a proper `hint` ("Esc to close · click to add a point · drag to move · click line to insert · Del removes"); in split, append the mode hint to the split hint rather than replacing it.
- **Blast:** `splineMode.tsx` + `FullscreenGradientOverlay.tsx:346-348`. Explorer-only. **Effort S · behavior-preserving** (fixes a wrong message).
- **Look at:** Open Spline in plain fullscreen — bottom-right should describe editing, not "display-only"; enter Split — mode instructions still present.

### ACT-7 · Fullscreen: dedup Slider + Density controls; one readout convention  [A3-7, A3-8, C5]
- **Surface:** `liquifyMode.tsx` and `parallaxMode.tsx` each define a near-identical `Slider` + Low/Med/High `DENSITIES` segmented control; readout conventions differ across modes (Liquify of-scale, Parallax true %-of-range with non-zero-floor fix, Spline none).
- **Change:** Extract one `fullscreen/modes/controls.tsx` (`SegmentedButtons` + `Slider`) matching the toolbar look; adopt Parallax's honest %-of-range readout (+ floor fix) everywhere incl. Spline. Fractal keeps its `ScalarInput` widget.
- **Blast:** new GX-fullscreen-local file + liquify/parallax/spline imports. No app-gmt impact. **Effort S · behavior-preserving** (guarantees the two stay identical by construction).
- **Look at:** Liquify vs Parallax density buttons + sliders identical; Spline sliders gain a readout matching the others.

### ACT-8 · Reveal sub-mode steps carry human labels  [A4-3]
- **Surface:** `gradientTargets.ts:171-173` — `gen:mixed`/`gen:colorbox`/`gen:stops` reveal steps have NO `label`; `GradientDropLayer.tsx:407` falls back to `it.id`, so a collapsed sub-mode well could print `gen:colorbox`.
- **Change:** Give the three steps explicit labels ("Mixer"/"ColorBox"/"Stops") matching `GeneratorModeToggle` opts — self-describing regardless of render path.
- **Blast:** `gradientTargets.ts`. Registers into engine-core `sendTargetRegistry` (shared), but these specific steps are Explorer-only (app-gmt has no Generator sub-modes) → no cross-app effect. **Verify label source is Explorer-local before applying.** **Effort S · behavior-preserving.**
- **Look at:** Collapse the right dock, start a pick carrying a gradient — edge wells read human names, never raw ids.

### ACT-9 · Stops sub-mode canvas caption (de-transplant)  [A2-2]
- **Surface:** `GeneratorStage.tsx:381-383` — Stops body is a bare `<div data-gx-target="stops">` straight into the engine editor; Mixer/ColorBox bodies both open with a 10px uppercase caption.
- **Change:** Add a matching caption row above `GeneratorStopsControls` ("Stops — edit on the bar"); optionally relocate the how-to sentence (currently buried in `StopsDockPanel.tsx:42-45`) here, since it describes the *stage* interaction.
- **Blast:** `GeneratorStage.tsx` only (the caption wrapper is Explorer-side, NOT the shared StopsDockPanel). **Effort S · behavior-preserving.**
- **Look at:** Toggle Mixer→ColorBox→Stops — each canvas body opens with a consistent caption (today Stops jumps straight into a different-looking editor).

---

# ASK — judgment calls, shared-component blast, or taste-dependent

> Genuine decisions only the user can make. Grouped; each carries the options.

### ASK-1 · Accent-token convention — is cyan the single "active/selected/brand" colour?  [C3: A1-3, A4-1, A4-2, A3-9]
Cyan is *almost* universal for active/selected, but three amber/violet holdouts break it:
- Favients **grid** hover ring is `amber-300` while every other hover/selection is cyan (`FavientsPanel.tsx:570`). **Shared — app-gmt mounts FavientsPanel.**
- Hero **save star** is `amber-400/20` not the cyan `FAVIENTS_ACCENT` brand token (`CanonicalHero.tsx:169-180`). **Shared — CanonicalHero in app-gmt.**
- Fullscreen **Fractal** toggles use violet/amber accents vs the house cyan (`fractalMode.tsx`). GX-local.
- "Selected" secondary treatment differs (hero matte+glow / wall 1.8× / shelf 1.4×+glow) — cyan ring common, magnitude/glow not.

**Question:** Adopt cyan as the one active/selected/brand colour everywhere (flip the amber hover + amber save-star + fractal violet/amber)? Or is amber a deliberate "saved/warm" signal and violet a deliberate "advanced fractal" signal worth keeping? *One decision unblocks 4 findings.* Touches shared FavientsPanel + CanonicalHero (cosmetic only).

### ASK-2 · Unified reset system — one home + scope  [C1: A2-1, A2-5, A3-1, A5-4, H4]
Reset is incoherent: 5 labels/glyphs ("↺ Reset"/"Reset to default"/"Reset all"/"Reset mods"/"Reset"); **missing entirely** from ColorBox sub-mode, fullscreen geometry modes (only an undocumented double-click-handle), and parallax; in Stops sub-mode the Generator's "Reset all" renders next to the Stops doc's own reset (two different scopes together, `A5-4`).
- **Cosmetic slice (could be Act):** normalize one glyph + label convention ("Reset <scope>", reserve "Reset all" for global).
- **Behavioral slice (Ask):** ADD a local reset where missing (ColorBox sweep reset, fullscreen geometry/parallax reset); suppress/relabel "Reset all" in Stops sub-mode.

**Question:** (a) Make resets consistent by adding a local reset to each sub-mode/fullscreen-mode, or by moving Mixer's local reset OUT to match Stops-in-dock? (b) OK to suppress "Reset all" when the visible surface is Stops?

### ASK-3 · StopsDockPanel is dual-host — restyle shared, or fork a GX wrapper?  [A2-3, A2-5]
`StopsDockPanel` is registered as BOTH the Generator's Stops dock block AND **app-gmt's standalone Stops tab** (`registerPaletteUI.ts`, `standaloneStopsMode`). It uses a different dropdown primitive (`Dropdown` vs the Generator's `GenericDropdown`), a prose paragraph no other dock block has, and a differently-shaped reset — so it reads transplanted *in the Generator*, but it must still read correctly *as a standalone tab in app-gmt*.

**Question:** Make StopsDockPanel match the Generator house style (affects app-gmt's Stops tab too), or fork a thin Explorer-only styled wrapper and leave the shared panel alone?

### ASK-4 · Mount SendToMenu — complete the keyboard/menu "place" path  [C8: A4-4]
`SendToMenu` is **built, registered, and scope-mandated** (`plans/p2-drag-interaction-scope.md`: "must stay first-class — the accelerator") but mounted on ZERO surfaces. The unified select→reveal→place model today has only a *pointer* "place" modality — no keyboard/explicit-target route. This is the biggest *functional* coherence gap. (Within-model: it's the keyboard twin of the same place step, not a second selection path.)

**Question:** Mount `<SendToMenu>` in the CanonicalHero header (co-travels with the save star)? CanonicalHero is **shared with app-gmt** (which registers its own host targets, so it'd work there too) — confirm placement + whether it should be Explorer-gated via a prop + mobile-rail behaviour. *Recommend doing this after any CanonicalHero cosmetic work so it lands together.*

### ASK-5 · Fullscreen control-surface + auto-fade policy  [C5: A3-2, A3-3, A3-4, A3-6, A3-10]
Per-mode fullscreen divergence: geometry modes have **no toolbar** (handle-only) so a faded/hidden geometry stage "looks dead"; the auto-fade + `◉ Handles` toggle is **geometry-only** (spline/liquify/parallax signifiers never fade, no toggle); idle-visibility differs per mode; the mode selector is flat (no static-vs-interactive signal); the `LIVE` badge shows only in split, not plain fullscreen.

**Question:** (a) Should `◉ Handles` become a universal "show/hide on-screen guides" toggle across all interactive modes, or stay geometry-only (treating spline/liquify/parallax signifiers as content)? (b) Add a thin hint/divider so geometry modes never present an empty control area? (c) Group the mode selector (geometry quartet vs splashy quartet)? *Behavior-changing — needs intent.*

### ASK-6 · Mode-switch closes the open destination dock?  [A1-5]
Picks are sticky per-mode (deliberate), but switching the right-dock tab does NOT collapse an open destination dock — its anchor (the previous mode's hero) just unmounted, so the dropbox/avatar layer can hang over a different mode's stage.

**Question:** On a *mode* change (not Favients-tab open), collapse the open destination dock while keeping the pick? *Behavior change to the deliberate sticky-selection model — gate strictly on "mode actually changed" per the mode-re-entry-state lesson.*

### ASK-7 · Favients / group model CRUD coherence  [A4-7, A4-8, A4-10]
Three symptoms of one root — the group model lacks first-class CRUD:
- **Save destination invisible** (`A4-7`): hero star-save lands in the last-used group silently (no toast, tooltip says only "Save to Favients"). The new "add → last group" behaviour can't be seen working.
- **Empty groups vanish** (`A4-8`): remove the last favourite and the divider disappears; no explicit "new group" button, no empty-group drop target.
- **Rename is list-view-only** (`A4-10`): not in grid view, not on any hero — yet the model's revealed-action set lists "rename".

**Question:** (a) Should a hero star-save confirm its destination group (toast/inline)? (CanonicalHero has no toast channel today — shared component.) (b) Are groups ephemeral runs or persistent containers (keep empty + renamable)? (c) Is rename a first-class revealed action (editable hero name + grid rename) or intentionally shelf-list-only?

### ASK-8 · Per-mode stage title/header on desktop?  [A1-2]
No desktop per-mode title exists — you read the 9px dock tab to know which mode you're in; mobile *does* label the stage. A four-mode studio reads like unrelated screens.

**Question:** Add a lightweight shared stage-header strip (mode name + the mode's existing top controls)? *Visible layout addition to every mode — worth a nod before applying.*

### ASK-9 · Mobile IA parity + single source of truth  [C7: A5-1, A5-2, A5-3]
- **Detection split-brain** (`A5-1`): layout branch (`width<768`) ≠ `MobileViewportShell` (device flag) ≠ `Dock` (`pointer:coarse OR <768`) — 3 sources of truth; the Explorer never uses the shared `useMobileLayout()`.
- **IA parity** (`A5-2`): only Picker got mobile IA (search + 3-section accordion); Generator/Image dump a raw `PanelRouter` below the stage.
- **Scroll trap** (`A5-3`): Generator/Image stages keep an inner `overflow-y-auto` inside the mobile outer scroll → double-scroll / gesture stall.

**Question:** Worth investing here? Mobile is scoped as touch-parity + not-broken-reflow, not deep mobile-editor polish. If yes: adopt `useMobileLayout()` (behavior-changing on real touch devices + Force-Mobile/Desktop), give Generator/Image the Picker accordion, and drop the inner scroll on mobile. *Recommend at least `A5-1` (one source of truth) + `A5-3` (scroll trap) as the highest-value slice.*

### ASK-10 · MixBlend vertical-slider clarity  [A2-4]
The three vertical L/C/h sliders: A/B end-markers sit only beside the *leftmost* slider, and value is blanked at rest (`format={() => ''}`) — child-clean but power users get no readout.
- **Cosmetic slice (could be Act):** add per-slider A/B end-caps/ticks so each names its direction.
- **Ask:** surface a transient value on hover/drag without un-blanking the resting state?

**Question:** Add per-slider A/B labels (low-risk)? And do you want a transient drag-time readout, or keep the deliberate blanked-at-rest look? *GX-local — uses `DraggableNumber`, not the shared ScalarInput.*

---

# AVOID — out of scope / parked / by-design / wrong context

- **app-gmt host pick-semantics / DnD-into-app-gmt** — locked parked decision.
- **Drag-vs-click yields different Favients outcome** (`A4-9`, insert-at-position vs flat-add) — intentional, documented hybrid model. Resolve only the *legibility* half via ASK-7(a).
- **Picker hero blank-on-remount across the 768px branch swap** (`A5-7`) — confirmed + located (`GradientExplorerApp.tsx:259, 346-353`; portal target null for one frame; pick data survives). Proper fix = avoid unmounting the subtree across the breakpoint = a layout-architecture restructure. **Do NOT fix in this pass** (high effort, behavior-changing). Flagged for a future layout initiative.
- **Onboarding / empty-state / marketing polish** — wrong for a focused power tool.
- **Deep mobile-editor depth** — out of mobile scope (parity + reflow only).
- **EmbeddedColorPicker reflow thresholds** (`A5-10`) — sound; verify-only at 210px dock, no change.

---

# HOUSEKEEPING (prompt-named candidates; code-health flavour, fair game this pass)

> The P3 brief explicitly named these to fold in. They're low-risk but lean code-health rather
> than pure UX — included as candidates per the brief; the critic would otherwise route them to a
> code-health backlog.

### H1 · Delete orphaned `EditorStage.tsx`  [A6-1] — **Act (housekeeping)**
- **Verified:** ZERO code importers (grep across repo = self-definition + 4 stale doc-comment mentions only). The Explorer mounts only Picker/Generator/Image (`GradientExplorerApp.tsx:56-58`, `MOBILE_MODES :141`) and opts out of standalone Stops (`registerFeatures.ts:17` `standaloneStopsMode:false`). The `'stops'` mode is fully served by the Generator's Stops sub-mode — only the `EditorStage` *component* is dead.
- **Change:** delete `gradient-explorer/EditorStage.tsx`; optionally reword the 4 stale doc-comment references. **Effort S · behavior-preserving.**
- **Side observation (NOT this pass):** app-gmt/fluid-toy register `PaletteEditorFeature` (default `standaloneStopsMode:true`) but mount no `EditorStage` — possible Stops-tab-without-stage in app-gmt. Flag to owner separately; out of scope here.

### H2 · ColorBox defaults — dedup to one source  [A2-6, A6-3] — **Act (housekeeping, low-risk)**
- **Verified:** same `L 0.2→0.92 / C 0.12→0.18 / h 30→290` literals in 3 runtime places — `DEFAULT_COLORBOX_PARAMS` (`generatorPipeline.ts:378-382`), `colorBoxChannel(...)` DDFS defaults (`paletteGenerator.ts:89-91`), `GENERATOR_PARAM_DEFAULTS` (`:145-147`) — plus an inline UI `def=` (`GeneratorStage.tsx:301-303`). Drift would desync reset / param default / slider snap.
- **Change:** make `DEFAULT_COLORBOX_PARAMS` (+ a small per-channel min/max/step table) the single source; derive the others. **Verify import direction (feature→core const is fine) + run `test-palette-generator.mts`.** Values unchanged ⇒ behavior-preserving (also read by app-gmt/fluid-toy Generator, but no value change). **Effort S-M.**

### H3 · 3 P0d security/robustness nits  [A6-2] — **Ask → route to code-health**
Real but code-health, not UX coherence: (a) rapid double scene-load dangles the first restore Promise (`favientsRestoreDialog.tsx:33-42`); (b) no upper bound on imported favients count/size (`favientsStore.ts:322`); (c) `favientsDocument.ts:72` re-stringifies then `importCollection` re-parses. **Recommend: route to a code-health/security backlog, not this pass.**

### H4 · Context-menu "Reset Default" forces `colorSpace='linear'`  [A6-4] — **Ask (shared, pre-existing)**
`gradientActions.ts:104-107` — Reset Default hard-forces `colorSpace='linear'` regardless of the user's output mode. **Shared across 3 apps** (`AdvancedGradientEditor` in app-gmt + fluid-toy + GX Stops); pre-existing (preserved by P0c, not introduced); may be intentional. **Don't change unilaterally — confirm intent.** (Folds into ASK-2's reset theme.)

---

## Recommended order (on approval)

**Act batch (GX-local, low-risk, fast visual confirm):** ACT-3, ACT-2, ACT-1, ACT-4, ACT-5,
ACT-6, ACT-7, ACT-8, ACT-9 + H1 + H2. Biggest coherence-per-effort first (microcopy/greyscale →
placeholder/metadata → mechanical class/dedup).

**Top Ask questions to resolve first (each unblocks multiple findings):**
1. **ASK-1** — cyan as the one accent (unblocks 4).
2. **ASK-4** — mount SendToMenu (biggest functional gap; co-travels with CanonicalHero work).
3. **ASK-3** — StopsDockPanel: restyle shared vs fork (the app-gmt blast decision).
4. **ASK-7** — Favients/group CRUD model (save feedback / empty groups / rename).
5. **ASK-5** — fullscreen auto-fade + control-surface policy.
6. **ASK-2** — unified reset (cosmetic slice can be Act; behavioral slice needs (a)/(b)).

After picks: implement on `exec/p3-polish` in approval-sized batches, gated `tsc 0` ·
`test:palette` green per touched area, each batch with a "what to look at" list.
