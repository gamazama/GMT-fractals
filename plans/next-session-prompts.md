# Next-session starter prompts

Two scoped sessions, in recommended order. Paste the whole block for the one you're running.
Both branch off `main` (the working tree at `h:/GMT/workspace-gmt/stable`).

> **Why these two (and why the redundancy hunts stopped):** R3/R4 each removed only ~100 lines and
> the cheap byte-identical dedups are now exhausted — a 5th generic "sweep for duplication" round
> wouldn't pay for its investigation cost. What's left is (a) ONE genuinely-worth-it standardization
> project (dropdowns) and (b) a different lens — keyboard/focus correctness — that tends to surface
> *user-facing* wins, not just tidiness. The `Hint` `?`-button tab-steal fix (commit 196db82) was the
> tell: 30 seconds, real UX improvement. There are likely a handful more like it.

---

## SESSION 1 (recommended first) — Keyboard-nav / focus / a11y sweep

```
Keyboard-navigation & focus correctness pass — engine-fork monorepo
(working tree: h:\GMT\workspace-gmt\stable, branch off main).

GOAL
User-facing keyboard/focus correctness, NOT code dedup. The app is dark, dense, and
pointer-first (lots of drag-to-adjust). Tabbing, focus management, and Escape handling
have grown organically and have rough edges. Find and fix the ones that actually bite a
keyboard user, surgically, without disturbing the heavy custom pointer interaction.

CONTEXT
Monorepo: generic engine (engine/, components/, store/, hooks/) + engine-gmt/ plugin
library + apps (app-gmt/, fluid-toy/, gradient-explorer/, palette/, mesh-export/, demo/).
Floating-surface primitives: components/ui/{Modal,FloatingPanel,AnchoredMenu} + hooks/useDismiss
+ components/ui/zIndex.ts. Numeric controls: components/inputs/primitives/DraggableNumber +
ScalarInput + Slider + Knob (drag-primary, click-to-edit). ADR-0060 governs floating surfaces.

ALREADY FIXED (don't redo): Hint.tsx ? button got tabIndex={-1} (commit 196db82).

LEADS (verify each; starting points, not gospel):
1. Decorative / secondary buttons sitting in the tab order that shouldn't be. Hint's ? was
   one. Sweep for icon-only / help / copy / randomize affordances that are SECONDARY to a
   primary action and trap Tab: e.g. the per-control "?" help buttons (data-help-id sites),
   copy-to-clipboard buttons that duplicate a visible value, JuliaRandomize dice, swatch
   action glyphs. Candidate fix: tabIndex={-1} (keep mouse + hover, drop from tab order).
   Classify each: genuinely-secondary (tabIndex -1) vs primary-action (KEEP focusable).
2. <div onClick> / <span onClick> that should be real <button>s (not keyboard-activatable,
   no Enter/Space). Grep onClick on non-button/non-anchor elements; report each with role.
3. Icon-only buttons missing an accessible name. Many have title= but no aria-label. Audit
   topbar (engine-gmt/topbar.tsx), gallery, auth, palette icon buttons. title alone is a weak
   a11y name; add aria-label where the button is icon-only.
4. Modal focus management. Modal/FloatingPanel/useDismiss: on open, does focus move INTO the
   surface? On close, does it RETURN to the trigger? Is focus trapped while open (Tab cycles
   within, doesn't escape to the page behind)? Report current behavior per primitive; this is
   the highest-value but highest-care item — propose, don't blind-fix (ADR-0060 territory).
5. Tab-order volume in the big panels. Tabbing through a feature panel may hit hundreds of
   sliders/knobs. Decide: are DraggableNumber/Knob (drag-primary) supposed to be tab-stops at
   all, or only their text-entry sub-field? Don't change without a clear call — report the
   current tab path through a representative panel first.
6. Escape consistency. Which surfaces close on Escape, which don't, and is the ordering sane
   (innermost first)? Cross-check the known capture-phase chain (Lightbox vs Gallery — see the
   R4 report / J5). Report inconsistencies; don't redesign the ordering here.

METHOD / GUARDRAILS
- Delegate the audit to Explore agents (file:line + classification); keep findings in context,
  not file dumps. Triage into CLEAR WINS (tabIndex on decorative buttons, missing aria-label,
  div→button) vs JUDGMENT CALLS (modal focus-trap, tab-order redesign, Escape reordering).
- DON'T break mouse/drag. The engine's custom pointer interaction is load-bearing and subtle;
  focus changes near DraggableNumber/usePrecisionTrackDrag/useInteractionDrag are risky.
- DON'T add visible focus rings that clash with the dark UI without the user's say — propose a
  treatment first if a focus-visible style is warranted.
- Preserve behavior; this is additive correctness, not a restyle. User does the visual + keyboard
  pass on :3400 (npm run dev).
- Present the plan and get confirmation before the judgment-call fixes. Clear wins can batch.

IN-FLIGHT — do not touch: pathtracer/reflections/lighting effort
(engine-gmt/features/reflections/**, engine-gmt/features/lighting/**,
engine-gmt/shaders/chunks/{pathtracer,vndf,env}.ts, engine-gmt/features/reflections/env_cdf.ts,
engine/UniformNames.ts, docs/adr/0068+0070, plans/pathtracer-improvements-session.md).

VERIFY: npm run typecheck (exit 0), npm run orphans (clean == only debug/render-harness.ts).
Commit only when the user confirms, staging ONLY your files (exclude the in-flight set above).

DELIVERABLE: triaged report (what / where file:line / classification / fix / risk), grouped
clear-wins vs judgment-calls; phased order; then execute the confirmed set.
```

---

## SESSION 2 (only if select inconsistency bothers you) — Dropdown / `<select>` standardization

```
Dropdown / select standardization — engine-fork monorepo
(working tree: h:\GMT\workspace-gmt\stable, branch off main).

GOAL
Collapse three competing select patterns onto ONE standard. This is the highest-value
remaining consolidation from the R4 hunt (J2) — a real, growing consistency tax, and the one
users can see. Plan first, get sign-off, then execute. Preserve visuals + the render-pause
integration exactly.

THE THREE PATTERNS (from the R4 investigation — verify before acting, line numbers approximate):
- components/Dropdown.tsx → GenericDropdown: labeled 2-column (label | control), custom chevron,
  integrates render-pause via useSelectRenderPause + help-id. 8 consumers: AdvancedGradientEditor,
  AutoFeaturePanel, HardwarePreferences (x3), FormulaParamsWidget, QualityRenderControls,
  RenderDialog/ConfigForm, BucketRenderPanel, StopsDockPanel.
- .t-select CSS class (index.css:38-39): full-width, browser-default-ish, no label slot, no custom
  icon. 9 instances across 7 files: CompositionOverlayControls, SettingsPanel, KeyframeInspector (x2),
  FlowEditor (x2, optgroup), LfoList, AudioLinkControls, WebcamOverlay.
- raw inline-styled <select> (no shared class): 7 instances — NewSceneModal, NodeParams,
  FormulaWorkshop (x2), ViewportQuality, SceneIO (autosave interval), fractalMode, FavientsPanel.
- SEPARATE, do not lump: topbar pill rows (engine-gmt/topbar.tsx ~55-62) are <button> multi-toggles,
  not dropdowns. EngineFeatureRow.tsx ~133 uses an invisible opacity-0 <select> overlay — special
  UX, LEAVE it.

RECOMMENDED DIRECTION (R4 agent's proposal — confirm in the plan):
Standardize on GenericDropdown. Add a label-less branch: when `label` is falsy, render a single
full-width column (drops the 2-col split) while keeping the chevron + render-pause + help-id. Then
migrate the 9 t-select sites and the 7 raw sites onto it. Net: 24/25 select UIs → one component;
t-select class can then be retired (or kept as a thin legacy shim).

GUARDRAILS
- Preserve the render-pause semantics (useSelectRenderPause): store-bound selects pause rendering
  during selection — don't regress that. Trace it before migrating store-bound sites.
- Preserve visuals: custom chevron, the existing focus treatment, optgroup support (FlowEditor).
  Where a site's styling legitimately differs (zinc-900 bg, border-l overrides), decide per-site
  whether to fold or keep an override prop — don't force a fold that restyles.
- Verify each migrated <select>'s options/value/onChange wiring is preserved exactly.
- This touches form controls in EVERY app — do it in reviewable batches with a typecheck between,
  not one giant edit. User does the visual pass on :3400.

METHOD
- Confirm the three-pattern inventory with Explore + import tracing (engine-core and engine-gmt
  expose same-named siblings — verify, don't bare-grep).
- DON'T edit until the plan (chosen standard + label-less branch design + migration batches) is
  confirmed. Then migrate batch-by-batch.

IN-FLIGHT — do not touch: same set as Session 1 (pathtracer/reflections/lighting).

VERIFY: npm run typecheck, npm run orphans (clean == only debug/render-harness.ts),
npm run test:* for any touched area. Commit only when confirmed, staging ONLY your files.

DELIVERABLE: a migration plan (standard chosen, GenericDropdown label-less branch sketch, per-site
fold-vs-override decisions, batch order) for sign-off; then execute the confirmed batches.
```

---

## Explicitly NOT recommended (parked)

- **NumberInput primitive (R4 J3)** — DraggableNumber/ScalarInput already cover high-traffic numeric
  entry; the 11 raw `<input type=number>` are low-traffic (export/settings dialogs). Not worth ~3-5
  days unless they start causing bugs.
- **Gallery/MySubmissions floating-surface fold (R4 J5)** — only touch if the Lightbox/Gallery Escape
  behavior actually misbehaves. The capture-phase ordering invariant is load-bearing; folding it onto
  useDismiss is real risk for pure tidiness. Defer indefinitely.
- **Another generic redundancy hunt (R5)** — diminishing returns; the cheap byte-identical dedups are
  spent. Skip.
