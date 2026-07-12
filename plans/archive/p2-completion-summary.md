# P2 — Gradient Portability Integration — COMPLETION SUMMARY

**Date:** 2026-06-08 · **Integration:** `exec/gradient-explorer` @ `99a02d1` · **Status:** ✅ COMPLETE,
all merged, gate-green (tsc 0 · test:palette 15/15), user visual-confirmed throughout (Chrome + Firefox for
the drag work).

## Goal

Make gradient **portability** one coherent model across every mode — a single canonical hero, a unified
"select → act" interaction, one shared target list, drag from everywhere, and a simpler favourite model.

## What shipped

- **Canonical hero** (`CanonicalHero`) reused across Picker / Generator / Image / Stops / Favients **and**
  the Generator slots — one component, tiered selection ring, per-surface sticky selection (survives the
  desktop↔mobile remount; closed the resize-blank bug).
- **Select → reveal → place** (the user-verified, tab-anchored model): click *or* drag reveals the same
  targets; dropboxes anchor over each target via `getRect`; hidden targets are reached by a data-driven
  chained `revealPath` + ~400 ms dwell. Click and drag are two inputs over one target set.
- **One target list:** the `(c)` `sendTargetRegistry`, extended with 4 ratified additive fields
  (`getRect` / `revealPath` / `acceptsTypes` / `dragPassthrough`); `favientTargets` migrated onto it;
  app-gmt host coloring layers register there too (`group:'host'`). Backed by `createListRegistry`.
- **Drag from every surface:** Picker swatches, result heroes, Generator slots, the curves widget
  (accept-only → `fitCurvesFromRamp`), Favients swatches.
- **Seamless drag:** avatar morphs from the source rect → lands into the target rect; cancel-wipe on no-land;
  cross-browser robust (synchronous `nativeDrag` signal, `markPickLanded` gate, Firefox dragover-recency
  backstop). New reusable surface: `dragVisual`, `DropTarget`/`DropTargetLayer`, `GradientLandingLayer`,
  `paintRampToCanvas`.
- **Favourite model simplified:** starring removed (FavStar deleted); drag-to-Favients is the sole add-path;
  perceptual auto-naming via one shared `configToName` across all add-paths (incl. the placeholder-named
  Generator/Stops/Image output heroes); the P2-G "Update vs Save-as-new" toggle was dropped (user-ratified).
- **Document round-trip (W8 finish):** `generator` + `image` document providers (parallel to favients) — a
  saved scene round-trips generator (curves/detail/smooth/seed + each slot as a resolved 256-RGB ramp) and
  image (thumbnail + trace) state through JSON / GMF / PNG.
- **Dock/reveal + coexistence fixes:** ImageStage file-drop coexistence (P2-F); floating-Favients reliable
  single-drag redock; right-dock collapsed-well reveal; centre-stage stick-to-last-mode; per-tool Picker
  cursors; on-screen floating kebab; GX-only picker-icon host-gate.

## How it was built (and the scope collapse)

P2 was re-scoped mid-phase: **P2-A (canonical hero + select-to-act) + the Picker work absorbed most of the
originally-planned P2-B/C/D** (hero state-lift, unified target list, drag/avatar/cross-tab) — what was a
~3–4-week phase collapsed to a small remainder (Batch A "extend to all surfaces", N1 dock fixes, Batch B/C).
Merge order: live-fractal → P2-F → P2-A → P2-A-Picker+polish → N1+dock fixes → Batch A → P2-Finish (B+C).
Only one frozen-interface change in all of P2 (the additive `(c)` fields), everything else additive.

## Process lessons banked

- A user-verified prototype/scope is the **model authority** — a fresh spec must encode it, not override it.
- **Batch related work** into larger coherent sessions; don't over-shrink scope.
- (Ops) the dev worktree parks on the last feature branch → switch to integration before committing the log.

## Deferred → post-P2 roadmap

**Fullscreen-v2** (now a major feature initiative — splitscreen, SOTA dithering, mesh/fluid modes, aesthetic
+ customizability overhaul, S-curve→spline, last-hero binding, parallax random mode, child-simple UX → needs
a fresh re-scope) · **generator polish** (Mixer rename, section IA, intuitive sliders, reset) · **curve-editor
refinements** (centre-handle, bias, ghost points, pencil tool, 2-col panel) · **favients add→last-group** ·
**tech-debt** (oklab de-dup remainder, `test:compat` failing, ColorBox sub-range UI, P0d nits) · **W9 snapshot**
(low-pri) · **live-fractal carve follow-ups** (closed unless they resurface) · **P3 light polish** (last).
Dropped: W13 Tier-B interpolation. **★ UX bar:** intuitive for basic click+drag understanding ("kids can use it").
