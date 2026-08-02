# Merge review — `audit/overnight-2026-07-27` → `main`

**What this is.** 260 commits from the overnight audit (13 cycles + the guard sweep),
reduced to only the changes that can alter what ships. Comments, JSDoc, `plans/`,
`docs/`, `.claude/`, `debug/`, `scripts/` and markdown are all stripped out — they
are the large majority of the branch and none of them reach a user.

**Read this top to bottom, then decide.** Sections are ordered by how much judgement
they need, not by size. §1 is the only part that wants your eyes rather than your
reading. The full filtered diff is in §5.

## The numbers

| | |
|---|---|
| Commits on the branch | 260 |
| Files changed, total | 331 |
| **Files that ship** | **62** |
| **Code lines changed in them** | **529** |
| Comment/blank lines added to shipping files | 1,868 |
| Of the 529 — cosmetic `animate-*` class removals | ~50 across 24 files |
| Of the 529 — `package.json` | 156 |

So the reviewable surface is roughly **300 lines of real logic across ~35 files.**

**Boot verified on this branch, just now:** `smoke:boot` exit 0 with zero page
errors, `smoke:engine-gmt` exit 0 (worker booted, shader compiled, frames
delivered), `smoke:interact` exit 0. `smoke:all` — all 42 members — went green in
the final sweep batch. `npm run typecheck` exit 0. `check:rule-guards` exit 0.

---

## §1 — The one change that needs your eyes, not your reading

**UI animations. Two commits, deliberately paired, and the net effect is visual.**

- `e6e1a468 fix(css): define the animate-* keyframes in production, not only in demo.html`
- `9c5e49e2 fix(ui): stop inputs animating in — remove slider-entry entirely`

The seven `@keyframes` (`fade-in`, `fade-in-up/down/left/right`, `pop-in`,
`slider-entry`) existed **only inside `demo.html`'s inline `<style>`**. Every
`animate-*` class in the deployed app therefore resolved to nothing — the class
landed in the DOM and no rule matched it. Tailwind could not rescue it either: the
utilities are absent from `tailwind.config.js`, and an unknown utility is simply
never generated.

The first commit ports them into `index.css`. **That makes a lot of previously
inert animations start firing** — menus, popovers, toasts, the formula picker, the
shader-compiler badge, the LFO list, the render dialog.

The second commit then removes `animate-slider-entry` from all six input
components (`ScalarInput`, `VectorInput`, `BaseVectorInput`,
`GenericToggleSwitch`, `AdvancedGradientEditor`, `DrawingPanel`) because the
product call on 2026-07-28 was that inputs should not animate in — plus
`animate-fade-in` from ~18 other call sites.

**This is the one thing in the branch a test cannot judge for you.** You do the
visual passes; the audit deliberately did not add screenshot-baseline smokes.
Boot the app, open some panels and menus, and decide whether the surviving
animations are the ones you want. If any feel wrong, it is a class removal in one
file, not a redesign.

*Note this is also why `GlobalContextMenu` lost a
`[&_.animate-slider-entry]:!animate-none` override — it was cancelling an
animation locally that no longer exists.*

---

## §2 — Real bug fixes. These are why merging is worth doing.

Each of these is a shipped defect, fixed and verified. Commit messages carry the
verification.

### Loading an old scene then opening the Camera Manager destroyed the session
`engine-gmt/store/cameraSlice.ts`, `engine-gmt/types/fractal.ts`,
`components/StateLibraryPanel.tsx`

Pre-2026-04-25 scene files carry flat-shaped `savedCameras` with no migration.
Loading one and opening the Camera Manager **unmounted the entire React root** —
white screen, frames frozen, unsaved work gone. There is no `ErrorBoundary`
anywhere in the codebase, which is why any render throw is fatal.

The fix migrates flat rows into `{ id, label, thumbnail, createdAt, state }` at
load. Verified by driving the real load path with a real filechooser and the real
2026-04-15 file from disk, plus a control run with a modern row proving the shape
was responsible.

**Check:** the type widened to `Record<string, any>` for `state`. That is
deliberate (old rows carry arbitrary keys) but it is a real loosening.

### Every `.vdb` GMT has ever exported was translated half a voxel off
`mesh-export/algorithms/dc-core.ts`, `mesh-export/algorithms/vdb-writer.ts`

Four lines total:
```
- return gridMin + (gx / (N - 1)) * (gridMax - gridMin);
+ return gridMin + ((gx + 0.5) / N) * (gridMax - gridMin);
```
Corner-sampled vs centre-sampled. The guard (`test:mesh-grid`) was written
**before** the fix, failed on both translation rows with the exact diagnosis, then
passed after — and found one row instead of two, independently confirming the
de-duplication.

### All droste state, and Env Profile, were dropped from every share link
`engine-gmt/features/droste/index.ts` (`'dr'`→`'ds'`),
`engine-gmt/features/materials.ts` (`'ec'`→`'ev'`), `engine/FeatureSystem.ts`

`drawing` and `droste` both claimed `shortId: 'dr'`; one silently overwrote the
other. Same for `'ec'`.

**This is safe for existing links.** Old share links never contained droste or Env
Profile state — that is the bug. They decode exactly as before, and now carry the
two features as well. `FeatureSystem` gained throws so a third collision fails
loudly at registration instead of silently dropping state. Boot verified above, so
no further collisions exist.

### Video export wrote the wrong frame rate whenever frame-step was in use
`engine-gmt/components/timeline/RenderPopup/exportRunner.ts`,
`fluid-toy/components/RenderDialog/exportRunner.ts`

```
- fps: cfg.fps,
+ fps: cfg.fps / Math.max(1, cfg.frameStep),
```
**Check:** this changes exported video timing. Correct as written — stepping every
Nth frame means the output plays at `fps/N` — but it is a behaviour change to a
user-facing output, so worth one deliberate look.

### A literal NUL byte inside a React key
`components/CategoryPickerMenu.tsx` — `` `${m.categoryId} ${m.key}` `` →
`` `${m.categoryId}::${m.key}` ``

The separator was a raw `0x00`, which made ripgrep classify the file as **binary
and skip it** — so it was invisible to the entire first audit run. Cosmetically
identical, functionally identical, and now greppable.

### Undo dropped audio clips; the FPS remap lost decks
`store/animation/sequenceSlice.ts`, `store/animation/playbackSlice.ts`,
`store/animation/types.ts` — `audioClips` now deep-copied into the undo entry.

### Worker export could hang forever on a crash
`engine-gmt/engine/worker/WorkerProxy.ts`, `WorkerDepthReadback.ts`

Export promises had no rejection path — a worker crash left them pending. Also
handles `gl.WAIT_FAILED` on the depth fence and a `HalfFloatType` readback branch.

---

## §3 — Additive throws and guards. Low risk, but they are new failure paths.

These make previously-silent corruption loud. Each can, in principle, throw where
nothing threw before — so they are worth knowing about even though boot is clean.

| File | New behaviour |
|---|---|
| `engine/FeatureSystem.ts` | throws on duplicate feature or param `shortId` at registration |
| `components/ui/zIndex.ts` | `registerTiers` throws if a tier intersects the reserved 200–299 panel headroom |
| `components/StateLibraryPanel.tsx` | `if (!drag) return` guards; `\|\| 'Untitled'` on the label span |
| `engine/RenderPipeline.ts` | disposes `_compileTarget` when its texture type no longer matches |

The `|| 'Untitled'` one is worth a sentence: an empty label made a saved-camera row
**permanently un-renameable**, because the span is `display: block`, an empty one
generates no line box, collapses to height 0, and `elementFromPoint` at its centre
returns the parent — so the `onDoubleClick` had no target. Blanks were reachable
and persisted into saved scenes. The input-side guard is still a queued Tier B item.

---

## §4 — Tooling and mechanical

- **`package.json` (156 lines)** — four `ENGINE_URL` defaults repointed from vite's
  stock `5173` to this repo's `3400`, four new npm scripts for harnesses that had no
  entry point of their own, and guard-script bookkeeping. Nothing here ships.
- **`.gitattributes`** — pins `plans/mb3d/decompiler/*.mjs` to LF, matching the
  existing pin for `debug/compat-snapshot.jsonl`.
- **`demo.html`** — keyframes removed (they now live in `index.css`).
- **~24 files, 2 lines each** — `animate-*` class removals, covered in §1.
- **`engine-gmt/navigation/Navigation.tsx`, `engine/plugins/Help.tsx`,
  `components/GraphEditor.tsx`, `engine/animation/AnimationSystem.tsx`,
  `engine-gmt/animation/cameraBinders.ts`, `app-gmt/main.tsx`,
  `utils/defaultPresetFields.ts`, `utils/PresetFieldRegistry.ts`, `types/preset.ts`** —
  smaller fixes from cycles 1–10; each has a commit naming its verification.

---

## §5 — The filtered diff

Everything below is the complete set of shipping code changes, with comment-only
hunks removed. Generated, not hand-edited.

To regenerate:
```
git diff main..HEAD -- . ':(exclude)plans/**' ':(exclude)docs/**' \
  ':(exclude).claude/**' ':(exclude)debug/**' ':(exclude)*.md' ':(exclude)scripts/**'
```
(that form includes comment hunks; this file has them filtered out.)

### Logic changes

#### `package.json`  _(156 lines)_

```diff
@@ -4,111 +4,119 @@
   "private": true,
   "type": "module",
   "scripts": {
-    "dev": "vite",
+    "bake:palette": "tsx debug/bake-palette-catalog.mts",
+    "bench:interaction-latency": "tsx debug/interaction-latency-harness.mts",
+    "bench:perf": "tsx debug/bench-perf.mts",
+    "bench:perf:gate": "tsx debug/bench-perf.mts --gate",
+    "bench:perf:timeline": "tsx debug/bench-perf-timeline.mts",
+    "bench:perf:timeline:with-server": "tsx debug/runWithServer.mts -- npx tsx debug/bench-perf-timeline.mts",
+    "bench:perf:with-server": "tsx debug/runWithServer.mts -- npx tsx debug/bench-perf.mts",
+    "bench:pt": "tsx debug/bench-pt.mts",
+    "bench:pt:with-server": "tsx debug/runWithServer.mts -- npx tsx debug/bench-pt.mts",
+    "bench:shader": "tsx debug/bench-shader.mts",
+    "bench:shader:with-server": "tsx debug/runWithServer.mts -- npx tsx debug/bench-shader.mts",
     "build": "vite build",
-    "preview": "vite preview",
-    "typecheck": "tsc --noEmit",
-    "test:zindex": "tsx debug/test-zindex.mts",
-    "check:zindex": "node debug/check-zindex.mjs",
-    "test:gmf": "tsx debug/test-gmf-roundtrip.mts",
-    "test:mb3d": "tsx debug/test-mb3d-parse.mts",
-    "test:mb3d:weave": "tsx debug/test-mb3d-weave.mts",
     "check:mb3d-decompiler": "node plans/mb3d/decompiler/check-sync.mjs",
-    "test:refine": "tsx debug/test-trace-refine.mts",
-    "orphans": "knip --reporter compact",
-    "context:map": "node plans/context-protocol/scripts/build-context-map.mjs",
+    "check:zindex": "node debug/check-zindex.mjs",
+    "check:rule-guards": "node debug/check-rule-guards.mjs",
+    "context:check": "node plans/context-protocol/scripts/context-check.mjs",
     "context:cost": "node plans/context-protocol/scripts/context-cost.mjs",
-    "context:deps": "node plans/context-protocol/scripts/context-cost.mjs deps",
     "context:dependents": "node plans/context-protocol/scripts/context-cost.mjs dependents",
+    "context:deps": "node plans/context-protocol/scripts/context-cost.mjs deps",
+    "context:map": "node plans/context-protocol/scripts/build-context-map.mjs",
     "context:symbols": "node plans/context-protocol/scripts/build-symbol-index.mjs",
-    "context:check": "node plans/context-protocol/scripts/context-check.mjs",
+    "dev": "vite",
+    "orphans": "knip --reporter compact",
     "orphans:strict": "knip --reporter compact --no-progress",
-    "test:frag": "tsx debug/test-frag-importer.mts",
-    "test:frag:v": "tsx debug/test-frag-importer.mts --verbose",
-    "test:frag:scan": "tsx debug/scan-frag-parse.mts",
-    "test:frag:integration": "tsx debug/test-frag-integration.mts --discover",
-    "test:compat": "tsx debug/test-compat.mts",
-    "test:interaction": "tsx debug/test-interaction-session.mts",
-    "test:interaction:wiring": "tsx debug/test-interaction-wiring.mts",
-    "test:interaction:coverage": "tsx debug/test-interaction-coverage.mts",
-    "test:bucket-convergence": "tsx debug/test-bucket-convergence.mts",
-    "test:gate": "npm run test:interaction && npm run test:interaction:wiring && npm run test:interaction:coverage && npm run test:modulation-coverage && npm run test:param-mapping && npm run test:modulation-parity",
-    "bench:interaction-latency": "tsx debug/interaction-latency-harness.mts",
-    "test:compat:write": "tsx debug/test-compat.mts --write",
-    "test:partial-apply": "tsx debug/test-partial-apply.mts",
-    "test:session-hold": "tsx debug/test-session-hold.mts",
-    "test:modulated-setter": "tsx debug/test-modulated-setter.mts",
-    "test:modulation-coverage": "tsx debug/test-modulation-coverage.mts",
-    "test:param-mapping": "tsx debug/test-param-mapping.mts",
-    "test:modulation-parity": "tsx debug/test-modulation-parity.mts",
-    "test:audio-signal": "tsx debug/test-audio-signal.mts",
-    "test:fft": "tsx debug/test-fft.mts",
-    "test:band-analyser": "tsx debug/test-band-analyser.mts",
-    "test:band-math": "tsx debug/test-band-math.mts",
-    "test:filterbank": "tsx debug/test-filterbank.mts",
-    "test:migrations": "tsx debug/test-escape-migration.mts",
-    "test:baseline": "tsx debug/native-config-sweep.mts --mode=baseline --fresh",
-    "test:hybrid": "tsx debug/native-config-sweep.mts --mode=hybrid --fresh",
-    "test:hybrid-adv": "tsx debug/native-config-sweep.mts --mode=hybrid-adv --fresh",
-    "test:weave-sweep": "tsx debug/native-weave-sweep.mts --fresh",
-    "test:palette": "tsx debug/test-palette-stopfit.mts && tsx debug/test-palette-stopops.mts && tsx debug/test-palette-channelcurve.mts && tsx debug/test-palette-facets.mts && tsx debug/test-palette-facetname.mts && tsx debug/test-palette-easings.mts && tsx debug/test-palette-generator.mts && tsx debug/test-palette-img2grad.mts && tsx debug/test-palette-img2grad-overshoot.mts && tsx debug/test-palette-selection.mts && tsx debug/test-palette-walllayout.mts && tsx debug/test-engine-dnd-kernels.mts && tsx debug/test-palette-importformats.mts && tsx debug/test-palette-rampgeometry.mts && tsx debug/test-palette-editorstore.mts && tsx debug/test-liquify-mesh.mts",
-    "test:liquify": "tsx debug/test-liquify-mesh.mts",
-    "smoke:liquify": "tsx debug/smoke-gx-liquify-render.mts",
-    "smoke:gx-handles": "tsx debug/smoke-gx-geom-handles.mts",
-    "bake:palette": "tsx debug/bake-palette-catalog.mts",
-    "test:dither": "tsx debug/test-dither.mts",
-    "test:shader": "npm run test:baseline && npm run test:hybrid && npm run test:hybrid-adv && npm run test:weave-sweep",
-    "smoke:boot": "tsx debug/smoke-boot.mts",
-    "smoke:interact": "tsx debug/smoke-interact.mts",
-    "smoke:screenshot": "tsx debug/smoke-screenshot.mts",
-    "smoke:fractal-toy": "tsx debug/smoke-fractal-toy.mts",
-    "smoke:formula-switch": "tsx debug/smoke-formula-switch.mts",
-    "smoke:fluid-toy": "tsx debug/smoke-fluid-toy.mts",
-    "smoke:deep-zoom-orbit": "tsx debug/smoke-deep-zoom-orbit.mts",
-    "smoke:deep-zoom-la": "tsx debug/smoke-deep-zoom-la.mts",
-    "smoke:deep-zoom-nucleus": "tsx debug/smoke-deep-zoom-nucleus.mts",
-    "smoke:gx-fractal-glitch": "tsx debug/smoke-gx-fractal-glitch.mts",
-    "smoke:undo": "tsx debug/smoke-undo.mts",
-    "smoke:camera": "tsx debug/smoke-camera.mts",
-    "smoke:viewport": "tsx debug/smoke-viewport.mts",
-    "smoke:anim-play": "tsx debug/smoke-anim-play.mts",
+    "preview": "vite preview",
+    "shader:dump": "tsx debug/dump-default-shader.mts",
+    "smoke:all": "tsx debug/smoke-ui-primitives.mts && tsx debug/smoke-track-binding.mts && tsx debug/smoke-binder-registry.mts && tsx debug/smoke-deep-zoom-orbit.mts && tsx debug/smoke-deep-zoom-la.mts && tsx debug/smoke-deep-zoom-nucleus.mts && tsx debug/smoke-boot.mts && tsx debug/smoke-engine-gmt.mts && tsx debug/smoke-formula-switch.mts && tsx debug/smoke-fractal-kind.mts && tsx debug/smoke-fractal-toy.mts && tsx debug/smoke-canvas-menu.mts && tsx debug/smoke-hud-hint.mts && tsx debug/smoke-help-menu.mts && tsx debug/smoke-pause-controls.mts && tsx debug/smoke-viewport.mts && tsx debug/smoke-viewport-fixed.mts && tsx debug/smoke-screenshot.mts && tsx debug/smoke-anim-play.mts && tsx debug/smoke-anim-vec2.mts && tsx debug/smoke-audio-fps-remap.mts && tsx debug/smoke-bc-drag.mts && tsx debug/smoke-undo.mts && tsx debug/smoke-share-link.mts && tsx debug/smoke-gallery-link.mts && tsx debug/smoke-tsaa.mts && tsx debug/smoke-fluid-brush.mts && tsx debug/smoke-catalog-browse.mts && tsx debug/smoke-catalog-load.mts && tsx debug/smoke-picker-search-kb.mts && tsx debug/smoke-workshop-state.mts && tsx debug/smoke-engine-demo.mts && tsx debug/smoke-engine-demo-modulation.mts && tsx debug/smoke-interact.mts && tsx debug/smoke-camera.mts && tsx debug/smoke-anim-orbit.mts && tsx debug/smoke-fluid-presets.mts && tsx debug/smoke-migrations.mts && tsx debug/smoke-canvas-pan-zoom.mts && tsx debug/smoke-fluid-toy.mts && tsx debug/smoke-particle-bounce.mts && tsx debug/smoke-orbit.mts",
     "smoke:anim-orbit": "tsx debug/smoke-anim-orbit.mts",
+    "smoke:anim-play": "tsx debug/smoke-anim-play.mts",
     "smoke:anim-vec2": "tsx debug/smoke-anim-vec2.mts",
     "smoke:audio-fps-remap": "tsx debug/smoke-audio-fps-remap.mts",
     "smoke:bc-drag": "tsx debug/smoke-bc-drag.mts",
     "smoke:binder-registry": "tsx debug/smoke-binder-registry.mts",
+    "smoke:boot": "tsx debug/smoke-boot.mts",
+    "smoke:camera": "tsx debug/smoke-camera.mts",
     "smoke:canvas-menu": "tsx debug/smoke-canvas-menu.mts",
     "smoke:canvas-pan-zoom": "tsx debug/smoke-canvas-pan-zoom.mts",
-    "smoke:engine-gmt": "tsx debug/smoke-engine-gmt.mts",
+    "smoke:catalog-browse": "tsx debug/smoke-catalog-browse.mts",
+    "smoke:catalog-load": "tsx debug/smoke-catalog-load.mts",
+    "smoke:deep-zoom-la": "tsx debug/smoke-deep-zoom-la.mts",
+    "smoke:deep-zoom-nucleus": "tsx debug/smoke-deep-zoom-nucleus.mts",
+    "smoke:deep-zoom-orbit": "tsx debug/smoke-deep-zoom-orbit.mts",
     "smoke:engine-demo": "tsx debug/smoke-engine-demo.mts",
     "smoke:engine-demo-modulation": "tsx debug/smoke-engine-demo-modulation.mts",
+    "smoke:engine-gmt": "tsx debug/smoke-engine-gmt.mts",
     "smoke:fluid-brush": "tsx debug/smoke-fluid-brush.mts",
     "smoke:fluid-presets": "tsx debug/smoke-fluid-presets.mts",
+    "smoke:fluid-toy": "tsx debug/smoke-fluid-toy.mts",
+    "smoke:formula-switch": "tsx debug/smoke-formula-switch.mts",
     "smoke:fractal-kind": "tsx debug/smoke-fractal-kind.mts",
+    "smoke:fractal-toy": "tsx debug/smoke-fractal-toy.mts",
     "smoke:gallery-link": "tsx debug/smoke-gallery-link.mts",
+    "smoke:gx-fractal-glitch": "tsx debug/smoke-gx-fractal-glitch.mts",
+    "smoke:gx-handles": "tsx debug/smoke-gx-geom-handles.mts",
     "smoke:help-menu": "tsx debug/smoke-help-menu.mts",
     "smoke:hud-hint": "tsx debug/smoke-hud-hint.mts",
+    "smoke:interact": "tsx debug/smoke-interact.mts",
+    "smoke:liquify": "tsx debug/smoke-gx-liquify-render.mts",
     "smoke:migrations": "tsx debug/smoke-migrations.mts",
     "smoke:orbit": "tsx debug/smoke-orbit.mts",
     "smoke:particle-bounce": "tsx debug/smoke-particle-bounce.mts",
     "smoke:pause-controls": "tsx debug/smoke-pause-controls.mts",
+    "smoke:picker-search-kb": "tsx debug/smoke-picker-search-kb.mts",
+    "smoke:screenshot": "tsx debug/smoke-screenshot.mts",
     "smoke:share-link": "tsx debug/smoke-share-link.mts",
+    "smoke:statelibrary-drop": "tsx debug/smoke-statelibrary-drop.mts",
     "smoke:track-binding": "tsx debug/smoke-track-binding.mts",
     "smoke:tsaa": "tsx debug/smoke-tsaa.mts",
     "smoke:ui-primitives": "tsx debug/smoke-ui-primitives.mts",
+    "smoke:undo": "tsx debug/smoke-undo.mts",
+    "smoke:viewport": "tsx debug/smoke-viewport.mts",
     "smoke:viewport-fixed": "tsx debug/smoke-viewport-fixed.mts",
-    "smoke:all": "tsx debug/smoke-ui-primitives.mts && tsx debug/smoke-track-binding.mts && tsx debug/smoke-binder-registry.mts && tsx debug/smoke-deep-zoom-orbit.mts && tsx debug/smoke-deep-zoom-la.mts && tsx debug/smoke-deep-zoom-nucleus.mts && tsx debug/smoke-boot.mts && tsx debug/smoke-engine-gmt.mts && tsx debug/smoke-formula-switch.mts && tsx debug/smoke-fractal-kind.mts && tsx debug/smoke-fractal-toy.mts && tsx debug/smoke-canvas-menu.mts && tsx debug/smoke-hud-hint.mts && tsx debug/smoke-help-menu.mts && tsx debug/smoke-pause-controls.mts && tsx debug/smoke-viewport.mts && tsx debug/smoke-viewport-fixed.mts && tsx debug/smoke-screenshot.mts && tsx debug/smoke-anim-play.mts && tsx debug/smoke-anim-vec2.mts && tsx debug/smoke-audio-fps-remap.mts && tsx debug/smoke-bc-drag.mts && tsx debug/smoke-undo.mts && tsx debug/smoke-share-link.mts && tsx debug/smoke-gallery-link.mts && tsx debug/smoke-tsaa.mts && tsx debug/smoke-fluid-brush.mts && tsx debug/smoke-catalog-browse.mts && tsx debug/smoke-catalog-load.mts && tsx debug/smoke-picker-search-kb.mts && tsx debug/smoke-workshop-state.mts && tsx debug/smoke-engine-demo.mts && tsx debug/smoke-engine-demo-modulation.mts && tsx debug/smoke-interact.mts && tsx debug/smoke-camera.mts && tsx debug/smoke-anim-orbit.mts && tsx debug/smoke-fluid-presets.mts && tsx debug/smoke-migrations.mts && tsx debug/smoke-canvas-pan-zoom.mts && tsx debug/smoke-fluid-toy.mts && tsx debug/smoke-particle-bounce.mts && tsx debug/smoke-orbit.mts",
     "smoke:with-server": "tsx debug/runWithServer.mts --",
-    "bench:shader": "tsx debug/bench-shader.mts",
-    "bench:shader:with-server": "tsx debug/runWithServer.mts -- npx tsx debug/bench-shader.mts",
-    "bench:perf": "tsx debug/bench-perf.mts",
-    "bench:perf:with-server": "tsx debug/runWithServer.mts -- npx tsx debug/bench-perf.mts",
-    "bench:perf:gate": "tsx debug/bench-perf.mts --gate",
-    "bench:perf:timeline": "tsx debug/bench-perf-timeline.mts",
-    "bench:perf:timeline:with-server": "tsx debug/runWithServer.mts -- npx tsx debug/bench-perf-timeline.mts",
-    "bench:pt": "tsx debug/bench-pt.mts",
-    "bench:pt:with-server": "tsx debug/runWithServer.mts -- npx tsx debug/bench-pt.mts",
-    "shader:dump": "tsx debug/dump-default-shader.mts"
+    "smoke:workshop-state": "tsx debug/smoke-workshop-state.mts",
+    "test:audio-signal": "tsx debug/test-audio-signal.mts",
+    "test:band-analyser": "tsx debug/test-band-analyser.mts",
+    "test:band-math": "tsx debug/test-band-math.mts",
+    "test:baseline": "tsx debug/native-config-sweep.mts --mode=baseline --fresh",
+    "test:bucket-convergence": "tsx debug/test-bucket-convergence.mts",
+    "test:compat": "tsx debug/test-compat.mts",
+    "test:compat:write": "tsx debug/test-compat.mts --write",
+    "test:dither": "tsx debug/test-dither.mts",
+    "test:fft": "tsx debug/test-fft.mts",
+    "test:filterbank": "tsx debug/test-filterbank.mts",
+    "test:frag": "tsx debug/test-frag-importer.mts",
+    "test:frag:integration": "tsx debug/test-frag-integration.mts",
+    "test:frag:integration:discover": "tsx debug/test-frag-integration.mts --discover",
+    "test:frag:scan": "tsx debug/scan-frag-parse.mts",
+    "test:frag:v": "tsx debug/test-frag-importer.mts --verbose",
+    "test:gate": "npm run test:interaction && npm run test:interaction:wiring && npm run test:interaction:coverage && npm run test:modulation-coverage && npm run test:param-mapping && npm run test:modulation-parity",
+    "test:gmf": "tsx debug/test-gmf-roundtrip.mts",
+    "test:hybrid": "tsx debug/native-config-sweep.mts --mode=hybrid --fresh",
+    "test:hybrid-adv": "tsx debug/native-config-sweep.mts --mode=hybrid-adv --fresh",
+    "test:interaction": "tsx debug/test-interaction-session.mts",
+    "test:interaction:coverage": "tsx debug/test-interaction-coverage.mts",
+    "test:interaction:wiring": "tsx debug/test-interaction-wiring.mts",
+    "test:liquify": "tsx debug/test-liquify-mesh.mts",
+    "test:mb3d": "tsx debug/test-mb3d-parse.mts",
+    "test:mb3d:weave": "tsx debug/test-mb3d-weave.mts",
+    "test:mesh-grid": "tsx debug/test-mesh-grid-convention.mts",
+    "test:migrations": "tsx debug/test-escape-migration.mts",
+    "test:modulated-setter": "tsx debug/test-modulated-setter.mts",
+    "test:modulation-coverage": "tsx debug/test-modulation-coverage.mts",
+    "test:modulation-parity": "tsx debug/test-modulation-parity.mts",
+    "test:palette": "tsx debug/test-palette-stopfit.mts && tsx debug/test-palette-stopops.mts && tsx debug/test-palette-channelcurve.mts && tsx debug/test-palette-facets.mts && tsx debug/test-palette-facetname.mts && tsx debug/test-palette-easings.mts && tsx debug/test-palette-generator.mts && tsx debug/test-palette-img2grad.mts && tsx debug/test-palette-img2grad-overshoot.mts && tsx debug/test-palette-selection.mts && tsx debug/test-palette-walllayout.mts && tsx debug/test-engine-dnd-kernels.mts && tsx debug/test-palette-importformats.mts && tsx debug/test-palette-rampgeometry.mts && tsx debug/test-palette-editorstore.mts && tsx debug/test-liquify-mesh.mts",
+    "test:param-mapping": "tsx debug/test-param-mapping.mts",
+    "test:partial-apply": "tsx debug/test-partial-apply.mts",
+    "test:refine": "tsx debug/test-trace-refine.mts",
+    "test:session-hold": "tsx debug/test-session-hold.mts",
+    "test:shader": "npm run test:baseline && npm run test:hybrid && npm run test:hybrid-adv && npm run test:weave-sweep",
+    "test:weave-sweep": "tsx debug/native-weave-sweep.mts --fresh",
+    "test:zindex": "tsx debug/test-zindex.mts",
+    "typecheck": "tsc --noEmit"
   },
   "dependencies": {
     "@codemirror/lang-cpp": "^6.0.3",
```

#### `index.css`  _(39 lines)_

```diff
@@ -163,3 +163,54 @@ body::-webkit-scrollbar-thumb { background-color: rgb(var(--scrollbar-thumb-stro
   .t-select { @apply w-full bg-surface-section border border-line/10 text-[10px] font-medium text-fg-tertiary rounded px-2 py-1 outline-none focus:border-accent-500/50 appearance-none hover:border-line/20 transition-colors cursor-pointer; }
   .t-select option { @apply bg-surface text-fg-tertiary; }
 }
+
+/* ─────────────────────────────────────────────────────────────────────────
+   UTILITY ANIMATIONS
+
+   @invariant These keyframes MUST live here, not in an entry HTML file.
+     They are used by 46 call sites across 36 components, and every app
+     (app-gmt, gradient-explorer, fluid-toy, fractal-toy, mesh-export, demo)
+     reaches them only through this file. — proven by: npx tailwindcss -c
+     tailwind.config.js -i index.css -o out.css --content <file using
+     animate-fade-in>, then grep "@keyframes" out.css (7 expected, 0 if this
+     block is removed).
+
+   They previously existed ONLY in demo.html's inline <style>, so every
+   animate-* class in the deployed app resolved to nothing: the class landed
+   in the DOM and no rule matched it. Tailwind cannot rescue this — the
+   utilities are absent from tailwind.config.js too, and an unknown utility
+   is simply never generated. Ported verbatim from demo.html (the definitions
+   that were demonstrably correct in the demo) rather than re-authored.
+
+   Kept as plain CSS rather than a tailwind.config animation extend because
+   .animate-slider-entry also sets overflow, which the `animation` utility
+   cannot express. Splitting six into config and one into CSS would be worse.
+   ───────────────────────────────────────────────────────────────────────── */
+@layer utilities {
+  /* `slider-entry` (0.35s max-height reveal) deliberately does NOT live here.
+     It was applied to ScalarInput, VectorInput, BaseVectorInput,
+     GenericToggleSwitch, AdvancedGradientEditor and DrawingPanel — i.e. it fired
+     on every conditional param reveal — and the product call on 2026-07-28 was
+     that inputs should not animate in. Removed from all six rather than defined
+     and left unused. GlobalContextMenu had already been carrying a
+     `[&_.animate-slider-entry]:!animate-none` override to cancel it locally,
+     which went with it. Do not reintroduce without the same call being revisited. */
+
+  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
+  .animate-fade-in { animation: fade-in 16ms linear forwards; }
+
+  @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
+  .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
+
+  @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
+  .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }
+
+  @keyframes fade-in-left { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
+  .animate-fade-in-left { animation: fade-in-left 0.3s ease-out forwards; }
+
+  @keyframes fade-in-right { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
+  .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
+
+  @keyframes pop-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
+  .animate-pop-in { animation: pop-in 0.15s ease-out forwards; }
+}
```

#### `engine/FeatureSystem.ts`  _(30 lines)_

```diff
@@ -23,7 +23,12 @@
 import { ShaderBuilder, RenderVariant } from './ShaderBuilder';
 import type { ShaderConfig } from './ShaderConfig';
 import * as THREE from 'three';
-import { UniformDefinition } from './UniformSchema';
+// `import type` is load-bearing, not style: UniformSchema imports
+// `featureRegistry` from this module and calls `registerFeatures()` at its top
+// level. A value-syntax import would make that cycle live and hit
+// `featureRegistry` in TDZ. See the import-side-effect @invariant on
+// engine/UniformSchema.ts.
+import type { UniformDefinition } from './UniformSchema';
 import type { RotationDescriptor } from './rotationDescriptor';
 
 export type ParamType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'boolean' | 'gradient' | 'image' | 'complex';
@@ -479,7 +485,7 @@ export class FeatureRegistryFrozenError extends Error {
             `Feature "${featureId}" registered after featureRegistry was frozen. ` +
             `All features must register BEFORE createEngineStore runs (i.e. before any ` +
             `module that touches useEngineStore / useEngineStore is imported). See ` +
-            `docs/03_Plugin_Contract.md § boot-timeline.` +
+            `docs/history/engine/03_Plugin_Contract.md § boot-timeline.` +
             diagnosis
         );
         this.name = 'FeatureRegistryFrozenError';
@@ -529,7 +535,7 @@ class FeatureRegistry {
                 console.warn(
                     `[FeatureRegistry] Replacing definition for "${def.id}". ` +
                     `If this is not HMR, it is a duplicate-id bug — see ` +
-                    `docs/02_Feature_Registry.md.`
+                    `docs/history/engine/02_Feature_Registry.md.`
                 );
                 this.features.set(def.id, def);
                 this.sortedCache = null;
@@ -638,12 +663,47 @@ class FeatureRegistry {
             }
         };
 
+        // Collision detection. Aliases are a wire format: two features sharing a
+        // shortId, or two params sharing one inside the same feature, silently
+        // collapse onto a single dictionary entry and the loser's state vanishes
+        // from every share link — a failure that surfaces as a user reporting a
+        // lost scene, months later, with no error anywhere. Both cases had
+        // actually shipped (droste/drawing on 'dr'; materials emissionMode and
+        // envMapColorSpace on 'ec'). Throwing here mirrors UniformSchema, which
+        // took the same boot-time-throw approach to duplicate uniform names in
+        // 36ad672c; see the ADR-0020 Update block.
+        const seenFeatureAliases = new Map<string, string>();
+
         this.features.forEach(feat => {
             const featAlias = feat.shortId || feat.id;
+            const clash = seenFeatureAliases.get(featAlias);
+            if (clash) {
+                throw new Error(
+                    `[FeatureSystem] duplicate share-link alias '${featAlias}': features ` +
+                    `'${clash}' and '${feat.id}' both claim it. Feature shortIds are global ` +
+                    `keys in the share-link dictionary, so one would silently overwrite the ` +
+                    `other and its state would be dropped from every generated link. Give ` +
+                    `one of them a free shortId.`,
+                );
+            }
+            seenFeatureAliases.set(featAlias, feat.id);
+
             const paramMap: any = {};
-            
+            const seenParamAliases = new Map<string, string>();
+
             Object.entries(feat.params).forEach(([key, config]) => {
                 if (config.shortId) {
+                    const pClash = seenParamAliases.get(config.shortId);
+                    if (pClash) {
+                        throw new Error(
+                            `[FeatureSystem] duplicate share-link alias '${config.shortId}' ` +
+                            `within feature '${feat.id}': params '${pClash}' and '${key}' both ` +
+                            `claim it, so one would be dropped from every share link. Param ` +
+                            `shortIds need only be unique within their own feature — pick ` +
+                            `another free one.`,
+                        );
+                    }
+                    seenParamAliases.set(config.shortId, key);
                     paramMap[key] = config.shortId;
                 }
             });
```

#### `engine-gmt/engine/worker/WorkerProxy.ts`  _(26 lines)_

```diff
@@ -113,6 +113,15 @@ export class WorkerProxy implements AccumulationController {
     private _exportFrameDone: ((data: { frameIndex: number; progress: number; measuredDistance: number }) => void) | null = null;
     private _exportComplete: ((blob: ArrayBuffer | null) => void) | null = null;
     private _exportError: ((msg: string) => void) | null = null;
+    /**
+     * Reject route for the in-flight `renderExportFrame` promise.
+     *
+     * Separate from `_exportError` on purpose: `_exportError` is owned by
+     * whichever of startExport/finishExport is currently awaiting, and the frame
+     * pump runs *between* those two, so a frame failure has no rejecter of its
+     * own without this. See `_handleWorkerCrash`.
+     */
+    private _exportFrameFail: ((msg: string) => void) | null = null;
 
     // ─── Worker Init ─────────────────────────────────────────────────────
 
@@ -407,7 +416,14 @@ export class WorkerProxy implements AccumulationController {
                 if (this._exportStartTimer) { clearTimeout(this._exportStartTimer); this._exportStartTimer = null; }
                 if (this._exportFinishTimer) { clearTimeout(this._exportFinishTimer); this._exportFinishTimer = null; }
                 console.error('[WorkerProxy] Export error:', msg.message);
-                if (this._exportError) this._exportError(msg.message);
+                // Route to the frame pump FIRST when a frame is in flight. The
+                // worker posts EXPORT_ERROR for a failed frame render
+                // ('Frame render failed: …'), but by then `_exportError` belongs
+                // to startExport's already-settled promise, so calling it is a
+                // silent no-op and `renderExportFrame` — which has no timeout —
+                // hung forever. Probe-confirmed against this class.
+                if (this._exportFrameFail) { const f = this._exportFrameFail; this._exportFrameFail = null; f(msg.message); }
+                else if (this._exportError) { const f = this._exportError; this._exportError = null; f(msg.message); }
                 break;
 
             // ─── Bucket Render ───
@@ -556,11 +587,31 @@ export class WorkerProxy implements AccumulationController {
         this._pendingUniformsSnapshot.clear();
         this._pendingRenderInfo.forEach(resolve => resolve(null));
         this._pendingRenderInfo.clear();
-        // Reject pending export promises
-        if (this._exportReady) { this._exportReady = null; }
-        if (this._exportComplete) { this._exportComplete = null; }
-        if (this._exportFrameDone) { this._exportFrameDone = null; }
-        if (this._exportError) { this._exportError = null; }
+        // Reject pending export promises.
+        //
+        // This block used to null the callbacks WITHOUT invoking them, under
+        // this same comment. Because `_clearAllTimers()` above has already
+        // killed `_exportStartTimer` and `_exportFinishTimer` — the only other
+        // settlement paths — and `_worker` is now null so no message can ever
+        // arrive, that left startExport/finishExport/renderExportFrame pending
+        // FOREVER. Demonstrated with a probe against this class: the promise
+        // stays PENDING with every timer disarmed. The user-visible result is a
+        // render dialog frozen mid-export whose Stop and Discard buttons are
+        // both inert (the pump only reads their refs at the top of its loop,
+        // which it never reaches again) and whose close button is disabled by
+        // `disableClose={isRendering}`; `isExporting` also stayed true, keeping
+        // the movement lock on.
+        //
+        // Rejecting is safe: all five call sites are in exportRunner.ts and all
+        // five sit inside try/catch/finally, so the runner surfaces the error
+        // and its `finally` clears isRendering and emits BUCKET_STATUS.
+        this._isExporting = false;
+        const err = `Worker crashed: ${reason}`;
+        if (this._exportError) { const f = this._exportError; this._exportError = null; f(err); }
+        if (this._exportFrameFail) { const f = this._exportFrameFail; this._exportFrameFail = null; f(err); }
+        this._exportReady = null;
+        this._exportComplete = null;
+        this._exportFrameDone = null;
         if (this._onCrash) this._onCrash(reason);
         // If the worker died before it ever booted, this is a boot
         // failure — splash subscribes to surface it as an error panel
@@ -937,7 +988,10 @@ export class WorkerProxy implements AccumulationController {
     ): Promise<void> {
         this._isExporting = true;
         return new Promise((resolve, reject) => {
-            this._exportReady = () => { this._exportReady = null; resolve(); };
+            // Clearing _exportError alongside _exportReady is load-bearing: leaving
+            // this settled promise's rejecter in place is what made a later frame
+            // error unreachable (see the EXPORT_ERROR handler).
+            this._exportReady = () => { this._exportReady = null; this._exportError = null; resolve(); };
             this._exportError = (msg) => { this._exportError = null; reject(new Error(msg)); };
 
             // FileSystemWritableFileStream (from File System Access API) is NOT
@@ -983,8 +1037,13 @@ export class WorkerProxy implements AccumulationController {
         renderState: Partial<EngineRenderState>,
         modulations: Record<string, number>
     ): Promise<{ frameIndex: number; progress: number; measuredDistance: number }> {
-        return new Promise((resolve) => {
-            this._exportFrameDone = (data) => { this._exportFrameDone = null; resolve(data); };
+        return new Promise((resolve, reject) => {
+            this._exportFrameDone = (data) => {
+                this._exportFrameDone = null; this._exportFrameFail = null; resolve(data);
+            };
+            this._exportFrameFail = (msg) => {
+                this._exportFrameDone = null; this._exportFrameFail = null; reject(new Error(msg));
+            };
             this.post({
                 type: 'EXPORT_RENDER_FRAME',
                 frameIndex, time, camera, offset, renderState, modulations
```

#### `engine-gmt/store/cameraSlice.ts`  _(26 lines)_

```diff
@@ -37,6 +37,7 @@ import { registry } from '../engine/FractalRegistry';
 import { VirtualSpace } from '../engine/PrecisionMath';
 import { CameraUtils } from '../utils/CameraUtils';
 import { useEngineStore } from '../../store/engineStore';
+import { registerHistoryProvider } from '../../store/slices/historySlice';
 import { type StateSnapshot } from '../../engine/store/createStateLibrarySlice';
 import { installStateLibrary } from '../../engine/store/installStateLibrary';
 import { getDirectionName } from '../features/camera_manager/logic';
@@ -469,6 +531,55 @@ export const installGmtCameraSlice = (): void => {
         },
     });
 
+    // Make the saved-cameras library ride the NORMAL param-undo stack.
+    //
+    // Deliberately NOT the camera-undo stack: that one is for camera NAVIGATION
+    // only (undoCamera/redoCamera below warp the pose). Adding or deleting a
+    // saved camera is a state edit like any other param, so it belongs in
+    // Ctrl+Z alongside them.
+    //
+    // createStateLibrarySlice deliberately owns no undo ("persistence and undo
+    // are deliberately app-side… apps wrap the actions if they need that
+    // behavior"), so the wiring lives here rather than in the generic slice.
+    // Same two-part shape the palette uses (palette/store/paramUndoBracket.ts):
+    // a registered provider supplies capture/restore, and a param transaction
+    // brackets the mutation so the end-of-transaction diff pushes one entry.
+    //
+    // @invariant Thumbnails ride along inside the snapshot. That is an accepted
+    //   cost, not an oversight — they are icon-sized data URLs and MAX_STACK is
+    //   50, so the worst case is bounded and small. Owner call 2026-07-28. If
+    //   thumbnails ever grow to full-size captures, revisit this before the
+    //   stack does.
+    registerHistoryProvider('savedCameras', {
+        capture: () => {
+            const s = get();
+            return { savedCameras: s.savedCameras ?? [], activeCameraId: s.activeCameraId ?? null };
+        },
+        restore: (snap: any) => {
+            if (!snap) return;
+            set({
+                savedCameras: snap.savedCameras ?? [],
+                activeCameraId: snap.activeCameraId ?? null,
+            });
+        },
+    });
+
+    // Bracket delete so one click = one undo entry. Without this the provider
+    // would still be snapshotted on OTHER transactions, but a delete on its own
+    // opens none, so there would be nothing to undo.
+    const beforeDelete = get();
+    const origDeleteCamera = beforeDelete.deleteCamera;
+    if (typeof origDeleteCamera === 'function') {
+        set({
+            deleteCamera: (id: string) => {
+                const st = get();
+                st.beginParamTransaction?.();
+                try { origDeleteCamera(id); }
+                finally { st.endParamTransaction?.(); }
+            },
+        });
+    }
+
     // Wrap engine-core's undoCamera / redoCamera so the R3F camera warps
     // to the restored pose after the diff applies. Engine-core's history
     // slice runs synchronously; we fire the teleport event after it.
```

#### `components/StateLibraryPanel.tsx`  _(23 lines)_

```diff
@@ -156,17 +174,26 @@ export function StateLibraryPanel<T>({
         setDrag({ fromIndex: index, overIndex: index });
     };
 
+    // Both handlers bail BEFORE preventDefault when `drag` is null — i.e.
+    // when this drag did not start in this list. `preventDefault()` is how a
+    // drop target claims an event, and window-level handlers defer to any
+    // inner target that already claimed it (`SceneFileDropZone` does exactly
+    // that: `if (e.defaultPrevented) return`). Claiming unconditionally made
+    // a row silently eat OS scene-file drops that landed on it — no load, no
+    // warning toast, which reads to the user as "the drop broke".
     const handleDragOver = (e: React.DragEvent, index: number) => {
+        if (!drag) return;
         e.preventDefault();
         e.dataTransfer.dropEffect = 'move';
-        if (drag && drag.overIndex !== index) {
+        if (drag.overIndex !== index) {
             setDrag({ ...drag, overIndex: index });
         }
     };
 
     const handleDrop = (e: React.DragEvent, toIndex: number) => {
+        if (!drag) return;
         e.preventDefault();
-        if (drag && drag.fromIndex !== toIndex) {
+        if (drag.fromIndex !== toIndex) {
             onReorder(drag.fromIndex, toIndex);
         }
         setDrag(null);
@@ -272,7 +299,22 @@ export function StateLibraryPanel<T>({
                                         onDoubleClick={(e) => { e.stopPropagation(); handleRenameStart(snap); }}
                                         title="Double-click to rename"
                                     >
-                                        {modified ? `*${snap.label}` : snap.label}
+                                        {/* The `|| 'Untitled'` is load-bearing, not cosmetic. This span is
+                                            `display: block`, so an empty one generates no line box and
+                                            collapses to height 0 — measured rect {w:149,h:0}, with
+                                            elementFromPoint at its centre returning the PARENT div. Since
+                                            onDoubleClick lives on this span, a blank label made the row
+                                            permanently un-renameable: an exhaustive 2px sweep of the whole
+                                            row found no re-entry point, and the `*` modified-marker escape
+                                            hatch self-destructs (the row's onClick re-applies the snapshot,
+                                            clearing `modified` on the first click of the double-click).
+                                            Blanks are reachable — handleRenameSubmit accepts an empty value
+                                            from both Enter and onBlur — and they persist into saved scenes
+                                            via the `savedCameras` preset field. Guarding at render fixes
+                                            existing data and every producer at once; `[actions.add]` uses
+                                            `??`, which does not catch `''`. See PROPOSALS.md (cycle 4) for
+                                            the input-side guard, which is a separate product call. */}
+                                        {modified ? `*${snap.label || 'Untitled'}` : (snap.label || 'Untitled')}
                                     </span>
                                 )}
                                 {slotHintPrefix !== null && index < 9 && (
```

#### `demo.html`  _(14 lines)_

```diff
@@ -33,28 +33,6 @@
       input[type=range].precision-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 100%; width: 16px; cursor: ew-resize; border: none; margin-top: 0; background: transparent; border-left: 1px solid rgba(255,255,255,0.25); border-right: 1px solid rgba(255,255,255,0.25); box-sizing: border-box; transition: border-color 0.15s; }
       input[type=range].precision-slider::-webkit-slider-thumb:hover { border-left-color: rgba(255,255,255,0.5); border-right-color: rgba(255,255,255,0.5); }
       input[type=range].precision-slider::-moz-range-thumb { height: 100%; width: 16px; cursor: ew-resize; border: none; background: transparent; border-left: 1px solid rgba(255,255,255,0.25); border-right: 1px solid rgba(255,255,255,0.25); box-sizing: border-box; border-radius: 0; }
-      
-      @keyframes slider-entry { from { max-height: 0; opacity: 0; transform: translateY(-4px); } to { max-height: 1000px; opacity: 1; transform: translateY(0); } }
-      .animate-slider-entry { animation: slider-entry 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards; overflow: hidden; }
-
-      /* UTILITY ANIMATIONS */
-      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
-      .animate-fade-in { animation: fade-in 16ms linear forwards; }
-      
-      @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
-      .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
-
-      @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
-      .animate-fade-in-down { animation: fade-in-down 0.3s ease-out forwards; }
-      
-      @keyframes fade-in-left { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
-      .animate-fade-in-left { animation: fade-in-left 0.3s ease-out forwards; }
-      
-      @keyframes fade-in-right { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
-      .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
-
-      @keyframes pop-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
-      .animate-pop-in { animation: pop-in 0.15s ease-out forwards; }
     </style>
     <link rel="icon" type="image/x-icon" href="/favicon.ico" />
     <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
```

#### `engine-gmt/navigation/Navigation.tsx`  _(14 lines)_

```diff
@@ -123,7 +123,7 @@ import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
 import * as THREE from 'three';
 import { getProxy } from '../engine/worker/WorkerProxy';
 const engine = getProxy();
-import { FractalEvents } from '../engine/FractalEvents';
+import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
 import { CameraState, CameraMode, PreciseVector3 } from '../types';
 import { useInputController } from './useInputController';
 import { usePhysicsProbe } from './usePhysicsProbe';
@@ -484,8 +484,8 @@ const Navigation: React.FC<NavigationProps> = ({
           };
       };
 
-      const unsub1 = FractalEvents.on('camera_teleport', onTeleport);
-      const unsub3 = FractalEvents.on('camera_transition', onTransition);
+      const unsub1 = FractalEvents.on(FRACTAL_EVENTS.CAMERA_TELEPORT, onTeleport);
+      const unsub3 = FractalEvents.on(FRACTAL_EVENTS.CAMERA_TRANSITION, onTransition);
       return () => { unsub1(); unsub3(); };
   }, [mode, camera]);
 
@@ -1132,13 +1132,13 @@ const Navigation: React.FC<NavigationProps> = ({
   // Mode Switching Logic
   useLayoutEffect(() => {
     if (prevMode.current !== mode) {
-        FractalEvents.emit('camera_snap', undefined);
+        FractalEvents.emit(FRACTAL_EVENTS.CAMERA_SNAP, undefined);
 
         // Safety: absorb any residual orbit position (e.g. mid-scroll switch)
         absorbOrbitPosition();
 
         if (mode === 'Fly') {
-            FractalEvents.emit('camera_snap', undefined);
+            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_SNAP, undefined);
             lastPos.current.set(0, 0, 0);
             currentFrameVelocity.current.set(0, 0, 0);
             currentRotVelocity.current.set(0, 0, 0);
@@ -1161,7 +1161,7 @@ const Navigation: React.FC<NavigationProps> = ({
       const stoppedScrubbing = wasScrubbingRef.current && !isScrubbing;
       
       if (stoppedPlaying || stoppedScrubbing) {
-          FractalEvents.emit('camera_snap', undefined);
+          FractalEvents.emit(FRACTAL_EVENTS.CAMERA_SNAP, undefined);
           // Animation commits with position=(0,0,0) via teleport — seed orbit pivot
           if (mode === 'Orbit') {
               const d = distAverageRef.current || engine.lastMeasuredDistance || 3.5;
@@ -1223,7 +1223,7 @@ const Navigation: React.FC<NavigationProps> = ({
               // Transition complete — finalize with exact target state
               transitionRef.current = null;
               // Emit a teleport with exact final state to ensure precision
-              FractalEvents.emit('camera_teleport', t.endState);
+              FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, t.endState);
           }
           return; // Skip normal camera logic during transition
       }
```

#### `utils/defaultPresetFields.ts`  _(13 lines)_

```diff
@@ -84,9 +85,42 @@ export const registerDefaultPresetFields = () => {
         },
         deserialize: (p, set) => {
             if (p.savedCameras && Array.isArray(p.savedCameras) && p.savedCameras.length > 0) {
+                // @invariant Rows MUST be normalised to the StateSnapshot shape
+                //   (`{ id, label, state, createdAt }`) before they reach the store.
+                //
+                //   Commit 19e605a8 (2026-04-25, "Camera Manager: extract
+                //   state-library primitive") changed the runtime shape from a FLAT
+                //   `SavedCamera extends CameraState` to a wrapped snapshot, on the
+                //   stated grounds that "SavedCameras aren't currently persisted, so
+                //   no migration is needed". That was already untrue — flat rows were
+                //   being written into the `<Scene>` block of .gmf files before that
+                //   date — and `beeb90d9` later re-enabled the serialize side without
+                //   adding one either.
+                //
+                //   Without this normalisation, loading such a file KILLS THE APP.
+                //   Verified end to end against a real 2026-04-15 file through the
+                //   real load path: the load itself is silent, but because we
+                //   force-select row 0 below, StateLibraryPanel then calls
+                //   `isModified` on it, `isCameraModified` dereferences `snap.state`,
+                //   and the resulting throw unmounts the entire React root — there is
+                //   no ErrorBoundary anywhere in this codebase. Measured: rootChildren
+                //   1 -> 0, canvases 27 -> 0, frames frozen. Recall throws too.
+                //
+                //   `types/preset.ts` and `engine-gmt/types/fractal.ts` still declared
+                //   the flat shape, so tsc could not catch any of this; both are
+                //   corrected alongside this change.
+                const rows = (p.savedCameras as any[]).map((row) => {
+                    if (row && typeof row === 'object' && row.state) return row;
+                    const { id, label, thumbnail, position, rotation, sceneOffset, targetDistance, optics } = row ?? {};
+                    return {
+                        id, label, thumbnail,
+                        createdAt: Date.now(),
+                        state: { position, rotation, sceneOffset, targetDistance, optics },
+                    };
+                });
                 set({
-                    savedCameras: p.savedCameras as any,
-                    activeCameraId: (p.savedCameras[0] as any).id || null,
+                    savedCameras: rows as any,
+                    activeCameraId: rows[0]?.id || null,
                 });
             }
         },
```

#### `engine-gmt/features/drawing/DrawingPanel.tsx`  _(12 lines)_

```diff
@@ -102,7 +102,7 @@ export const DrawingPanel: React.FC<DrawingPanelProps> = ({ className = '' }) =>
                      />
                 </div>
                 {colorEditId === '__default' && (
-                    <div className="mb-1 animate-fade-in">
+                    <div className="mb-1">
                         <EmbeddedColorPicker
                             color={'#' + color.getHexString()}
                             onColorChange={(c) => setDrawing({ color: new THREE.Color(c) })}
@@ -111,7 +111,7 @@ export const DrawingPanel: React.FC<DrawingPanelProps> = ({ className = '' }) =>
                 )}
                 
                 {active && (
-                    <div className="mt-2 px-2 py-1.5 bg-accent-900/20 border border-accent-500/20 rounded flex flex-col items-center gap-1 text-[9px] text-cyan-200 animate-fade-in text-center font-mono">
+                    <div className="mt-2 px-2 py-1.5 bg-accent-900/20 border border-accent-500/20 rounded flex flex-col items-center gap-1 text-[9px] text-cyan-200 text-center font-mono">
                         <div>Hold <strong>X</strong> to snap to World Axis</div>
                         <div>Hold <strong>SHIFT</strong> for 1:1 Ratio</div>
                         <div>Hold <strong>ALT</strong> for Center Draw</div>
@@ -136,7 +136,7 @@ export const DrawingPanel: React.FC<DrawingPanelProps> = ({ className = '' }) =>
                     />
                     
                     {originMode === 1.0 && (
-                        <div className="flex items-center justify-between bg-surface-section rounded border border-line/10 p-1.5 mt-1 animate-fade-in">
+                        <div className="flex items-center justify-between bg-surface-section rounded border border-line/10 p-1.5 mt-1">
                             <span className="text-[9px] text-fg-muted font-mono pl-1">Depth: <span className="text-accent-400 font-bold">{currentDepth.toFixed(4)}</span></span>
                             <button 
                                 onClick={handleReProbe}
@@ -187,7 +187,7 @@ export const DrawingPanel: React.FC<DrawingPanelProps> = ({ className = '' }) =>
                              No measurements drawn.
                          </div>
                      ) : (
-                         <div className="space-y-1 animate-fade-in">
+                         <div className="space-y-1">
                              {(shapes || []).map((shape: any, i: number) => {
                                      const isCube = shape.type === 'rect' && (shape.size.z || 0) > 0.001;
                                      return (
@@ -237,7 +237,7 @@ export const DrawingPanel: React.FC<DrawingPanelProps> = ({ className = '' }) =>
 
                                              {/* Inline colour editor (expand-in-place, mirrors the cube-slider block) */}
                                              {colorEditId === shape.id && (
-                                                <div className="px-2 pb-2 pt-0 animate-slider-entry bg-surface-section mt-1 rounded border border-line/5 mx-1">
+                                                <div className="px-2 pb-2 pt-0 bg-surface-section mt-1 rounded border border-line/5 mx-1">
                                                     <EmbeddedColorPicker
                                                         color={shape.color}
                                                         onColorChange={(c) => updateDrawnShape({ id: shape.id, updates: { color: c } })}
@@ -247,7 +247,7 @@ export const DrawingPanel: React.FC<DrawingPanelProps> = ({ className = '' }) =>
 
                                              {/* Sliders for Cubes */}
                                              {isCube && (
-                                                <div className="px-2 pb-2 pt-0 space-y-1 animate-slider-entry bg-surface-section mt-1 rounded border border-line/5 mx-1">
+                                                <div className="px-2 pb-2 pt-0 space-y-1 bg-surface-section mt-1 rounded border border-line/5 mx-1">
                                                     <Slider 
                                                         label="Depth" 
                                                         value={shape.size.z || 0}
```

#### `components/ui/zIndex.ts`  _(10 lines)_

```diff
@@ -138,6 +138,16 @@ export const Z = new Proxy({} as Record<Tier, number>, {
  * Shell tiers legitimately share values (different traps) and are exempt.
  * Used by `registerTiers` (throws) and the `test:zindex` gate (asserts).
  */
+/**
+ * The panel band's reserved headroom, enforced by `registerTiers`.
+ *
+ * `panel` is [100..199]; growing its span to 199 would make it exactly
+ * [100..299], which is why this range is kept free rather than merely unused.
+ * `popover` was moved 200 → 300 to clear it (ADR-0082).
+ */
+const RESERVED_PORTAL_LO = 200;
+const RESERVED_PORTAL_HI = 299;
+
 export function findPortalOverlaps(table: Record<string, TierDef> = TIER_TABLE): string[] {
     const portal = Object.entries(table).filter(([, d]) => d.domain === 'portal');
     const clashes: string[] = [];
@@ -171,6 +181,20 @@ export function registerTiers(tiers: Record<string, TierDef>): void {
         if (def.domain === 'portal') {
             const clashes = findPortalOverlaps(probe).filter((c) => c.includes(name));
             if (clashes.length) throw new Error(`registerTiers: "${name}" overlaps an existing portal band: ${clashes.join(', ')}`);
+            // findPortalOverlaps only compares DECLARED bands, so it cannot see a
+            // reservation that no TierDef occupies. 200–299 is exactly that: it was
+            // deliberately vacated when `popover` moved 200 → 300 (ADR-0082) to give
+            // the panel band real headroom, and plans/z-index-system-design.md calls
+            // it inviolate. Without this check a tier at 250 registered silently and
+            // resolved to a live z above every floating panel — proved by probe.
+            const hi = def.base + def.span;
+            if (def.base <= RESERVED_PORTAL_HI && hi >= RESERVED_PORTAL_LO) {
+                throw new Error(
+                    `registerTiers: "${name}" [${def.base}..${hi}] intersects the reserved panel headroom `
+                    + `(${RESERVED_PORTAL_LO}–${RESERVED_PORTAL_HI}). That range is kept free so the panel `
+                    + `band can grow its span; pick a gap above popover (300+) instead.`,
+                );
+            }
         }
         TIER_TABLE[name] = def;
     }
```

#### `engine-gmt/engine/worker/WorkerDepthReadback.ts`  _(9 lines)_

```diff
@@ -10,6 +10,7 @@
  */
 
 import type * as THREE from 'three';
+import { HalfFloatType } from 'three';
 import type { FractalEngine } from '../FractalEngine';
 import type { WorkerToMainMessage } from './WorkerProtocol';
 
@@ -70,6 +75,21 @@ export class WorkerDepthReadback {
 
         const gl = this._depthGL;
         const status = gl.clientWaitSync(this._depthFence, 0, 0); // non-blocking
+
+        if (status === gl.WAIT_FAILED) {
+            // Fence failed (e.g. context loss) — drop it and let the next tick
+            // issue a fresh readback. Without this the `_depthPBOPending` latch
+            // never clears, `_issueReadback` is gated off forever, and
+            // `lastMeasuredDistance` / `centerIsSky` freeze at their last values
+            // for the rest of the session. Mirrors the WAIT_FAILED branch in
+            // `RenderPipeline.pollConvergenceResult`.
+            gl.deleteSync(this._depthFence);
+            this._depthFence = null;
+            this._depthPBOPending = false;
+            return;
+        }
+
+        // TIMEOUT_EXPIRED — GPU not done yet, try again next tick.
         if (status !== gl.ALREADY_SIGNALED && status !== gl.CONDITION_SATISFIED) return;
 
         gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this._depthPBO);
@@ -110,7 +130,14 @@ export class WorkerDepthReadback {
         const gl2 = renderer.getContext() as WebGL2RenderingContext;
         if (gl2.fenceSync) {
             this._depthGL = gl2;
-            const useHalfFloat = (engine as any).pipeline?._qualityState?.bufferPrecision > 0.5;
+            // The read format follows the target's ACTUAL texture type, never the
+            // REQUESTED `quality.bufferPrecision`: `RenderPipeline.accumFormat()`
+            // falls back to HalfFloatType whenever full float isn't linearly
+            // filterable, so a device can hold a HALF_FLOAT accumulation RT while
+            // `bufferPrecision` says Float32. The sync fallback below (and every
+            // other readback in the app, via three.js `readRenderTargetPixels`)
+            // already derives it this way — see `RenderPipeline.readPixels`.
+            const useHalfFloat = rt.texture.type === HalfFloatType;
             this._depthPBOHalfFloat = useHalfFloat;
 
             if (!this._depthPBO) {
```

#### `engine/plugins/Help.tsx`  _(9 lines)_

```diff
@@ -21,7 +21,7 @@
  */
 
 import React, { Suspense, useState, useSyncExternalStore } from 'react';
-import { createPortal } from 'react-dom';
+import { Layer } from '../../components/ui';
 import { useEngineStore } from '../../store/engineStore';
 import { menu, MenuItem } from './Menu';
 import { shortcuts } from './Shortcuts';
@@ -160,8 +160,16 @@ const SupportModalHost: React.FC = () => {
     const m = React.useSyncExternalStore(_supportSubscribe, _supportSnapshot, _supportSnapshot);
     if (!m) return null;
     const close = () => _setSupportModal(null);
-    return createPortal(
-        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={close}>
+    // Was a hand-rolled `createPortal(…, document.body)` at a raw `z-50`. Because
+    // getLayerHost() is also document.body, that made this modal a SIBLING of every
+    // <Layer> surface in the root stacking context — and the `panel` tier starts at
+    // 100, so any open floating panel painted over the modal and stayed clickable
+    // through its bg-black/60 backdrop (measured: panel z=100 vs modal z=50, and
+    // elementFromPoint over the panel header returned the panel, not the backdrop).
+    // check:zindex cannot catch this class: its threshold is z >= 100, so a raw z
+    // that is too LOW is exactly its blind spot. Per ADR-0082, use the tier table.
+    return (
+        <Layer tier="modal" className="inset-0 flex items-center justify-center bg-black/60" onClick={close}>
             <div className="bg-surface-sunken border border-line/10 rounded-lg p-5 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                 <div className="flex items-center justify-between mb-3">
                     <div className={`text-xs font-bold ${ACCENT_TEXT[m.accent]}`}>{m.modalTitle}</div>
@@ -172,8 +180,7 @@ const SupportModalHost: React.FC = () => {
                 )}
                 {renderBody(m.body)}
             </div>
-        </div>,
-        document.body,
+        </Layer>
     );
 };
```

#### `mesh-export/algorithms/vdb-writer.ts`  _(9 lines)_

```diff
@@ -468,14 +468,26 @@ function _writeVec3Tree(w: VDBWriter, tree: Vec3VDBTree): void {
   }
 }
 
-/** Write grid transform (shared by scalar and vec3 grids). */
+/**
+ * Write grid transform (shared by scalar and vec3 grids).
+ *
+ * @invariant The translation row is `boundsMin + s/2`, NOT bare `boundsMin`.
+ *   OpenVDB's AffineMap maps index space to world, and voxel (i,j,k) occupies
+ *   index-space point (i,j,k) — so `indexToWorld(Coord(i,j,k))` returns that
+ *   voxel's CENTRE. The density value stored at index i was sampled by the GPU
+ *   at `boundsMin + (i + 0.5) * s` (`gpu-pipeline.ts` samples cell-centred:
+ *   `gl_FragCoord + uTileOffset === i + 0.5`, and Z via
+ *   `sampleOneZ((gz + 0.5) / N, …)`). Writing bare `boundsMin` therefore
+ *   announced every voxel half a voxel toward -X/-Y/-Z of where its data
+ *   actually came from. Pinned by `npm run test:mesh-grid`.
+ */
 function _writeTransform(w: VDBWriter, N: number, boundsMin: [number, number, number], boundsRange: number): void {
   const s = boundsRange / N;
   w.name('AffineMap');
   w.f64(s); w.f64(0); w.f64(0); w.f64(0);
   w.f64(0); w.f64(s); w.f64(0); w.f64(0);
   w.f64(0); w.f64(0); w.f64(s); w.f64(0);
-  w.f64(boundsMin[0]); w.f64(boundsMin[1]); w.f64(boundsMin[2]); w.f64(1);
+  w.f64(boundsMin[0] + 0.5 * s); w.f64(boundsMin[1] + 0.5 * s); w.f64(boundsMin[2] + 0.5 * s); w.f64(1);
 }
 
 /**
@@ -561,13 +573,9 @@ export function serializeVDB(
   _metaB(w, 'is_saved_as_half_float', true);
   _metaS(w, 'name', 'density');
 
-  // Transform
-  const s = boundsRange / N;
-  w.name('AffineMap');
-  w.f64(s); w.f64(0); w.f64(0); w.f64(0);
-  w.f64(0); w.f64(s); w.f64(0); w.f64(0);
-  w.f64(0); w.f64(0); w.f64(s); w.f64(0);
-  w.f64(boundsMin[0]); w.f64(boundsMin[1]); w.f64(boundsMin[2]); w.f64(1);
+  // Transform. Was a byte-identical copy of _writeTransform's body — which is
+  // exactly how one copy gets fixed and the other does not. Call the shared one.
+  _writeTransform(w, N, boundsMin, boundsRange);
 
   // Tree
   _writeTree(w, tree);
```

#### `components/timeline/TimelineToolbar.tsx`  _(8 lines)_

```diff
@@ -9,6 +9,8 @@ import { animationEngine } from '../../engine/AnimationEngine';
 import { useHelpContextMenu } from '../../hooks/useHelpContextMenu';
 import { CloseIcon, MenuIcon, KeyStatus, LoopIcon, WaveRecordIcon } from '../Icons';
 import { KeyframeButton } from '../KeyframeButton';
+import { z } from '../ui/zIndex';
+import { getLayerHost } from '../ui/layerHost';
 import { getLiveValue, evaluateTrackValue } from '../../utils/timelineUtils';
 import {
     PlayIcon, PauseIcon, StopIcon, RecordIcon,
@@ -414,8 +416,13 @@ export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
                 {showMenu && menuPos && createPortal((
                     <div
                         ref={menuPanelRef}
-                        className="fixed w-48 bg-surface-raised border border-line/20 rounded shadow-xl z-[100] p-1 flex flex-col gap-1"
-                        style={{ top: menuPos.top, right: menuPos.right }}
+                        className="fixed w-48 bg-surface-raised border border-line/20 rounded shadow-xl p-1 flex flex-col gap-1"
+                        // Body-portalled, so it competes on the GLOBAL portal axis. The old raw
+                        // literal tied the floating-panel band base (100–199, reserved for
+                        // click-to-front ranks — see components/ui/zIndex.ts), so any raised
+                        // floating panel painted over this menu. `popover` is the tier for
+                        // anchored dropdowns and clears the panel band.
+                        style={{ top: menuPos.top, right: menuPos.right, zIndex: z('popover') }}
                     >
 
                         <div className="flex items-center justify-between px-3 py-2 text-xs text-fg-tertiary">
@@ -497,7 +504,7 @@ export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
                             Delete All Tracks
                         </button>
                     </div>
-                ), document.body)}
+                ), getLayerHost())}
             </div>
 
             <button onClick={onClose} className="ml-1 icon-btn" title="Close Timeline">
```

#### `.gitattributes`  _(7 lines)_

```diff
@@ -2,3 +2,11 @@
 # core.autocrlf=true checks it out as CRLF on Windows, which spuriously fails the gate.
 # Pin it to LF so the working copy always matches what the harness writes/expects.
 debug/compat-snapshot.jsonl text eol=lf
+
+# check:mb3d-decompiler compares these against a canonical copy OUTSIDE the repo
+# (H:/GMT/stuff/mb3d-decomp/, kept at LF). core.autocrlf=true would check them out
+# as CRLF here, so every file would read as DRIFTED with identical content — and
+# the printed remedy (copy canonical over the repo copy) would not survive the next
+# checkout. Pin to LF so the two sides stay byte-comparable. Same class of bug as
+# the compat-snapshot line above.
+plans/mb3d/decompiler/*.mjs text eol=lf
```

#### `components/GraphEditor.tsx`  _(6 lines)_

```diff
@@ -514,19 +514,19 @@ const GraphEditorInner: React.FC<GraphEditorProps> = ({
                 
                 {/* TOOL FEEDBACK OVERLAYS */}
                 {tools.isSmoothing && (
-                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/80 text-accent-300 px-3 py-1.5 rounded-full border border-accent-500/50 text-xs font-bold shadow-xl animate-fade-in z-50 pointer-events-none flex items-center gap-2">
+                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/80 text-accent-300 px-3 py-1.5 rounded-full border border-accent-500/50 text-xs font-bold shadow-xl z-50 pointer-events-none flex items-center gap-2">
                         <WaveIcon active={true} />
                         <span>{tools.smoothingRadius > 0 ? `Constrained Smooth: ${tools.smoothingRadius.toFixed(1)}` : `Bounce: ${Math.abs(tools.smoothingRadius).toFixed(1)}`}</span>
                     </div>
                 )}
                 {tools.isBaking && (
-                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/80 text-secondary px-3 py-1.5 rounded-full border border-secondary/50 text-xs font-bold shadow-xl animate-fade-in z-50 pointer-events-none flex items-center gap-2">
+                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/80 text-secondary px-3 py-1.5 rounded-full border border-secondary/50 text-xs font-bold shadow-xl z-50 pointer-events-none flex items-center gap-2">
                         <BakeIcon active={true} />
                         <span>Bake Interval: {tools.bakeStep} frames</span>
                     </div>
                 )}
                 {tools.isSimplifying && (
-                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/80 text-warn px-3 py-1.5 rounded-full border border-warn/50 text-xs font-bold shadow-xl animate-fade-in z-50 pointer-events-none flex items-center gap-2">
+                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/80 text-warn px-3 py-1.5 rounded-full border border-warn/50 text-xs font-bold shadow-xl z-50 pointer-events-none flex items-center gap-2">
                         <MagicIcon active={true} />
                         <span>Fit Strength: {(tools.simplifyStrength * 100).toFixed(0)}%</span>
                     </div>
```

#### `engine-gmt/animation/cameraBinders.ts`  _(6 lines)_

```diff
@@ -26,6 +26,7 @@ import { nanoid } from 'nanoid';
 import { animationEngine, type ScrubContext } from '../../engine/AnimationEngine';
 import { binderRegistry } from '../../engine/animation/binderRegistry';
 import { setCameraKeyCaptureFn, type CameraKeyCaptureOptions } from '../../engine/animation/cameraKeyRegistry';
+import { isLogTrack } from '../../engine/animation/logTrackRegistry';
 import { useEngineStore } from '../../store/engineStore';
 import { useAnimationStore } from '../../store/animationStore';
 import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
@@ -188,15 +189,21 @@ const captureGmtCameraKeyFrame = (
             const sorted = [...others, newKey].sort((a, b) => a.frame - b.frame);
             const idx = sorted.findIndex((k) => k.id === newKey.id);
 
+            // Tangents on a log-registered track are LOG-UNITS — the flag must
+            // be threaded or authored and evaluated curves disagree. Behaviour-
+            // neutral today (none of the six camera track ids written here is
+            // log-registered, so isLogTrack returns false), but this is the
+            // trap that fires the moment one is.
+            const trackIsLog = isLogTrack(t.id);
             if (interpolation === 'Bezier') {
                 const prev = idx > 0 ? sorted[idx - 1] : undefined;
                 const next = idx < sorted.length - 1 ? sorted[idx + 1] : undefined;
-                const { l, r } = AnimationMath.calculateTangents(newKey, prev, next, 'Auto');
+                const { l, r } = AnimationMath.calculateTangents(newKey, prev, next, 'Auto', trackIsLog);
                 newKey.leftTangent = l;
                 newKey.rightTangent = r;
             }
 
-            TrackUtils.updateNeighbors(sorted, idx);
+            TrackUtils.updateNeighbors(sorted, idx, trackIsLog);
             newTracks[t.id] = { ...track, keyframes: sorted };
         });
```

#### `engine/animation/AnimationSystem.tsx`  _(6 lines)_

```diff
@@ -66,7 +70,6 @@ import { classifyModulationTarget } from '../features/modulation/targetRouting';
 import { planModulationTarget, flushModulationComposites, newCompositeAccumulator } from '../features/modulation/applyTarget';
 import { AudioState } from '../features/audioMod';
 import { ModulationState } from '../features/modulation';
-import { evaluateTrackValue } from '../../utils/timelineUtils';
 
 // Global refs for animation system state
 const activeTargetsRef = { current: new Set<string>() };
@@ -338,10 +341,19 @@ export const tick = (delta: number) => {
                 cleanBase: shouldRecord ? (trackId, naturalBase) => {
                     const snapshotSeq = animStore.recordingSnapshot;
                     if (snapshotSeq && snapshotSeq.tracks[trackId]) {
-                        return evaluateTrackValue(
-                            snapshotSeq.tracks[trackId].keyframes,
+                        // MUST use the same evaluator as playback. This previously
+                        // called evaluateTrackValue(keys, frame, id.includes('rotation')),
+                        // which takes a Keyframe[] and so structurally cannot see
+                        // postBehavior, defaulted isLog to false, and used a rotation
+                        // predicate narrower than the engine's — so the recorded base
+                        // disagreed with the value the timeline actually plays.
+                        // evaluateTrack takes the Track and routes through the same
+                        // interpolate() playback uses. Known remaining gap: it skips
+                        // the evaluatePairedTrack step scrub() tries first, so
+                        // camera-pair tracks can still differ slightly.
+                        return animationEngine.evaluateTrack(
+                            snapshotSeq.tracks[trackId],
                             animStore.currentFrame,
-                            trackId.includes('rotation'),
                         );
                     }
                     if (initialStaticValues.current[trackId] === undefined) {
```

#### `app-gmt/main.tsx`  _(5 lines)_

```diff
@@ -34,15 +42,15 @@ import ReactDOM from 'react-dom/client';
 import { usePaletteOverlayStore } from './paletteOverlayStore';
 import { favientsPanelEntry, mountFavientsPanel } from '../palette/installFavients';
 import { isMobileSnapshot } from '../hooks/useMobileLayout';
-import { topbar } from '../engine/plugins/TopBar';
 import { AppGmt } from './AppGmt';
 import { registerUI } from '../engine/features/ui';
 import { registerGmtUi } from '../engine-gmt/features/ui';
 import { installGmtCameraSlice, flushCameraToStore } from '../engine-gmt/store/cameraSlice';
 import { installGmtModularSlice } from '../engine-gmt/store/modularSlice';
-import { installViewport, viewport, setRenderScaleSource } from '../engine/plugins/Viewport';
+import { installViewport, setRenderScaleSource } from '../engine/plugins/Viewport';
 import { installTopBar } from '../engine/plugins/TopBar';
-import { installPauseControls } from '../engine/plugins/topbar/PauseControls';
+// NOTE: `installPauseControls` is deliberately NOT imported — engine-gmt/topbar.tsx
+// registers the pause button itself in the LEFT slot (see the installTopBar call below).
 import { installPwaUpdate } from '../engine/plugins/PwaUpdate';
 import { installSceneIO } from '../engine/plugins/SceneIO';
 import { copyShareLink } from '../engine-gmt/topbar/ShareLinkButton';
@@ -98,7 +106,6 @@ import type { Preset } from '../types';
 
 import {
     installGmtRenderer,
-    gmtRenderer,
     getProxy,
 } from '../engine-gmt';
 import { registry } from '../engine-gmt/engine/FractalRegistry';
```

#### `engine/RenderPipeline.ts`  _(5 lines)_

```diff
@@ -170,15 +178,46 @@ export class RenderPipeline {
     private _compileTarget: THREE.WebGLRenderTarget | null = null;
 
     /**
-     * Get a render target for compile-time context (so Three.js generates
-     * matching program params).
+     * Get a render target for compile-time context (so the pre-warmed program
+     * matches the one the live render will use).
      *
-     * @invariant The compile target MUST mirror MRT float type. If live
-     *   target is HalfFloat and compile target is Float, Three.js program
-     *   param hashes diverge and async compile defeats its purpose. Lazy-
-     *   created after `mrtTargetA` exists — do not call before `initTargets()`.
+     * @invariant The compile target MUST mirror MRT float type — and is now
+     *   rebuilt when it does not, because `updateQuality` → `resize` →
+     *   `initTargets` re-allocates the MRT at a new type whenever
+     *   `bufferPrecision` crosses 0.5, while this 1x1 FBO used to be created
+     *   once and never invalidated. Reachable from the shipping Settings →
+     *   Hardware → "Buffer Precision" dropdown; measured on desktop
+     *   (ANGLE/D3D11, cbf + floatLinear both true) the two settings really do
+     *   yield FloatType vs HalfFloatType. Lazy-created after `mrtTargetA`
+     *   exists — do not call before `initTargets()`.
+     *
+     *   The rebuild is done HERE rather than in `initTargets()`/`resize()` on
+     *   purpose: `CompileScheduler` captures this target in a local, binds it,
+     *   and holds it across `await renderer.compileAsync(...)`. A CONFIG
+     *   message carrying a precision change is processed on the same worker
+     *   event loop and can land inside that await, so disposing from the
+     *   resize path could free a currently-bound FBO mid-compile. By the time
+     *   `getCompileTarget()` is called again the previous compile has resolved
+     *   and restored `setRenderTarget(null)`.
+     *
+     *   NOTE on the rationale: the original text claimed "Three.js program
+     *   param hashes diverge". That is not the mechanism — three.js's
+     *   `WebGLPrograms.getParameters()` reads the bound target only for
+     *   `toneMapping`/`outputColorSpace` (both gated on `=== null`), never its
+     *   `texture.type`. Any real cost is at the ANGLE/D3D11 level, where pixel
+     *   shaders are compiled per framebuffer output signature. RGBA32F and
+     *   RGBA16F may well share a variant, in which case the divergence costs
+     *   nothing — that has NOT been measured on d3d11. This is kept as a
+     *   correctness fix (the code now honours its documented contract), not as
+     *   a proven perf win.
      */
     public getCompileTarget(): THREE.WebGLRenderTarget | null {
+        // Drop a stale target whose type no longer matches the live MRT.
+        if (this._compileTarget && this.mrtTargetA
+            && this._compileTarget.texture.type !== this.mrtTargetA.texture.type) {
+            this._compileTarget.dispose();
+            this._compileTarget = null;
+        }
         if (!this._compileTarget && this.mrtTargetA) {
             this._compileTarget = new THREE.WebGLRenderTarget(1, 1, {
                 minFilter: THREE.NearestFilter,
```

#### `engine-gmt/components/timeline/RenderPopup/exportRunner.ts`  _(4 lines)_

```diff
@@ -258,7 +258,12 @@ const runImageSequenceExport = async (
         const config: VideoExportConfig = {
             width:                 cfg.vidRes.w,
             height:                cfg.vidRes.h,
-            fps:                   cfg.fps,
+            // Output framerate, NOT the timeline's. A stepped export renders every
+            // Nth frame, so playing it back at the timeline rate would compress it
+            // N-fold into a time-lapse — and desync the full-length audio track from
+            // frame 0. Dividing keeps real-world duration, which is what Step is for:
+            // cheaper previews, not a speed ramp. See VideoExportConfig.fps.
+            fps:                   cfg.fps / Math.max(1, cfg.frameStep),
             samples:               cfg.vidSamples,
             bitrate:               cfg.vidBitrate,
             startFrame:            cfg.startFrame,
@@ -413,7 +418,8 @@ export const runVideoExport: RenderDialogRunner<AppGmtExtra> = async (pluginDeps
             const config: VideoExportConfig = {
                 width:         cfg.vidRes.w,
                 height:        cfg.vidRes.h,
-                fps:           cfg.fps,
+                // See the note on the single-pass config above — output rate, not timeline rate.
+                fps:           cfg.fps / Math.max(1, cfg.frameStep),
                 samples:       cfg.vidSamples,
                 bitrate:       cfg.vidBitrate,
                 startFrame:    cfg.startFrame,
```

#### `mesh-export/algorithms/dc-core.ts`  _(4 lines)_

```diff
@@ -116,14 +116,30 @@ export function sdfGradient(grid: Float32Array, N: number, fx: number, fy: numbe
   return [gx * inv, gy * inv, gz * inv];
 }
 
-/** Convert a grid-space coordinate (fractional) to world-space. */
+/**
+ * Convert a grid-space coordinate (fractional) to world-space.
+ *
+ * @invariant CELL-CENTRED: sample `i` lives at `min + (i + 0.5) * range / N`.
+ *   This is not a style choice — it is where the GPU sampler actually reads.
+ *   `gpu-pipeline.ts` evaluates the SDF at
+ *   `(gl_FragCoord.xy + uTileOffset) * uInvRes * range + min`, and because
+ *   `gl_FragCoord` is pixel-CENTRE based, `gl_FragCoord + uTileOffset === i + 0.5`
+ *   exactly; Z matches via `sampleOneZ((gz + 0.5) / N, …)`.
+ *   — proven by: npm run test:mesh-grid, which fails if this drifts from the
+ *   sampler in either direction.
+ *
+ *   Until 2026-07-28 this used the corner-sampled `gx / (N - 1)`, which
+ *   disagreed with the sampler by a uniform scale of N/(N-1) about the grid
+ *   centre — every exported GLB/STL was oversized by that factor (~1.6% at
+ *   N=64, ~0.4% at N=256, and worse the coarser the grid).
+ */
 export function gridToWorld(gx: number, N: number, gridMin: number, gridMax: number): number {
-  return gridMin + (gx / (N - 1)) * (gridMax - gridMin);
+  return gridMin + ((gx + 0.5) / N) * (gridMax - gridMin);
 }
 
-/** Convert a world-space coordinate to fractional grid-space. */
+/** Convert a world-space coordinate to fractional grid-space. Exact inverse of `gridToWorld`. */
 export function worldToGrid(wx: number, N: number, gridMin: number, gridMax: number): number {
-  return ((wx - gridMin) / (gridMax - gridMin)) * (N - 1);
+  return ((wx - gridMin) / (gridMax - gridMin)) * N - 0.5;
 }
 
 // ============================================================================
```

#### `components/CategoryPickerMenu.tsx`  _(2 lines)_

```diff
@@ -293,7 +293,7 @@ export const CategoryPickerMenu: React.FC<CategoryPickerMenuProps> = ({
             )}
             {matches.map((m, i) => (
                 <button
-                    key={`${m.categoryId}<U+0000>${m.key}`}   <-- the raw 0x00 is written <U+0000> here on purpose; quoting it verbatim
                                            made THIS file binary to grep too (found 2026-08-02)
+                    key={`${m.categoryId}::${m.key}`}
                     ref={i === activeIndex ? activeItemRef : undefined}
                     onClick={m.disabled ? undefined : () => { onSelect(m.key); onClose(); }}
                     onMouseEnter={() => setActiveIndex(i)}
```

#### `engine-gmt/features/droste/index.ts`  _(2 lines)_

```diff
@@ -24,7 +24,13 @@ export interface DrosteState {
 
 export const DrosteFeature: FeatureDefinition = {
     id: 'droste',
-    shortId: 'dr',
+    // 'dr' until 2026-07-28, when it was found to collide with the `drawing`
+    // feature's identical shortId. Feature shortIds are GLOBAL keys in the
+    // share-link dictionary, so the two aliased onto one entry and the later
+    // registration won — droste was silently absent from every generated share
+    // link. `drawing` keeps 'dr' deliberately: it is the side that was winning,
+    // so existing links decode exactly as they did before and only gain droste.
+    shortId: 'ds',
     name: 'Droste Effect',
     category: 'Effects',
     params: {
```

#### `engine-gmt/features/materials.ts`  _(2 lines)_

```diff
@@ -239,7 +239,13 @@ export const MaterialFeature: FeatureDefinition = {
             type: 'float',
             default: 0.0,
             label: 'Env Profile',
-            shortId: 'ec',
+            // 'ec' until 2026-07-28, when it was found to collide with
+            // `emissionMode` below. Param shortIds need only be unique WITHIN a
+            // feature, and these two are both in materials, so they aliased onto
+            // one dictionary entry and this one lost. `emissionMode` keeps 'ec'
+            // because it is the side that was surviving — existing share links
+            // therefore decode unchanged and merely gain this value.
+            shortId: 'ev',
             uniform: 'uEnvMapColorSpace',
             group: 'env',
             hidden: true
```

#### `engine-gmt/types/fractal.ts`  _(2 lines)_

```diff
@@ -44,8 +44,12 @@ export interface Preset {
       [key: string]: any;
   };
 
-  // Camera Manager — saved camera library
-  savedCameras?: Array<CameraState & { id: string; label: string; optics?: any; thumbnail?: string }>;
+  // Camera Manager — saved camera library.
+  // StateSnapshot shape (id/label/state/createdAt), NOT the flat pre-2026-04-25
+  // `SavedCamera extends CameraState`. Legacy flat rows are normalised on load by
+  // the `savedCameras` field in utils/defaultPresetFields.ts — see the @invariant
+  // there; declaring the flat shape here is what let that crash go untyped.
+  savedCameras?: Array<{ id: string; label: string; thumbnail?: string; createdAt?: number; state: Record<string, any> }>;
 
   // --- GENERIC FEATURE STORAGE (Primary) ---
   // All module state lives here.
```

#### `fluid-toy/components/RenderDialog/exportRunner.ts`  _(2 lines)_

```diff
@@ -137,7 +137,13 @@ export const runVideoExport: RenderDialogRunner = async (deps) => {
         await encoder.start({
             width:       safeWidth,
             height:      safeHeight,
-            fps:         cfg.fps,
+            // Output rate, not the timeline's — a stepped export renders every Nth
+            // frame, so encoding at the timeline rate would compress it into a
+            // time-lapse. Step is a cost reduction for previews, so the preview
+            // should run at the speed the animation actually plays.
+            // fluid-toy carries no audio, so unlike app-gmt there was no desync
+            // here — this keeps the two apps' definition of Step the same.
+            fps:         cfg.fps / Math.max(1, cfg.frameStep),
             bitrate:     cfg.bitrate,
             formatIndex: cfg.formatIndex,
         }, stream);
```

#### `store/animation/sequenceSlice.ts`  _(2 lines)_

```diff
@@ -27,6 +27,7 @@ const captureInverse = (state: AnimationStore, item: HistoryItem): HistoryItem =
                 fps: state.fps,
                 durationFrames: state.durationFrames,
                 currentFrame: state.currentFrame,
+                audioClips: state.audioClips.map(c => c ? { ...c } : null),
             },
         };
     }
@@ -40,6 +41,10 @@ const applyHistory = (set: (partial: Partial<AnimationStore>) => void, item: His
             fps: item.data.fps,
             durationFrames: item.data.durationFrames,
             currentFrame: item.data.currentFrame,
+            // Entries pushed before audioClips joined the FPS snapshot have
+            // no `audioClips` key — leave the live clips alone rather than
+            // blanking the decks.
+            ...(item.data.audioClips ? { audioClips: item.data.audioClips } : {}),
         });
     } else {
         set({ sequence: item.data });
```

#### `store/animation/types.ts`  _(2 lines)_

```diff
@@ -12,7 +12,11 @@ export interface CopiedKeyframe {
 
 export type HistoryItem =
     | { type: 'SEQUENCE', data: AnimationSequence }
-    | { type: 'FPS', data: { sequence: AnimationSequence; fps: number; durationFrames: number; currentFrame: number } };
+    // `audioClips` rides along because `setFps('match')` remaps
+    // `AudioClip.startFrame` by the same `r = newFps/oldFps` it applies to
+    // keyframes. Without it, undo restores the keys and leaves the clip at
+    // the remapped frame — the `(r-1)*startFrame` drift, via the undo path.
+    | { type: 'FPS', data: { sequence: AnimationSequence; fps: number; durationFrames: number; currentFrame: number; audioClips: (AudioClip | null)[] } };
 
 export type FpsChangeMode = 'keep' | 'match';
```

#### `types/preset.ts`  _(2 lines)_

```diff
@@ -47,8 +47,12 @@ export interface Preset {
       [key: string]: any;
   };
 
-  // Camera Manager — saved camera library
-  savedCameras?: Array<CameraState & { id: string; label: string; optics?: any; thumbnail?: string }>;
+  // Camera Manager — saved camera library.
+  // StateSnapshot shape (id/label/state/createdAt), NOT the flat pre-2026-04-25
+  // `SavedCamera extends CameraState`. Legacy flat rows are normalised on load by
+  // the `savedCameras` field in utils/defaultPresetFields.ts — see the @invariant
+  // there; declaring the flat shape here is what let that crash go untyped.
+  savedCameras?: Array<{ id: string; label: string; thumbnail?: string; createdAt?: number; state: Record<string, any> }>;
 
   // --- GENERIC FEATURE STORAGE (Primary) ---
   // All module state lives here.
```

#### `utils/PresetFieldRegistry.ts`  _(2 lines)_

```diff
@@ -42,7 +43,7 @@ export class PresetFieldFrozenError extends Error {
         super(
             `Preset field "${key}" registered after registry was frozen. ` +
             `All preset fields must register before createEngineStore runs. ` +
-            `See docs/04_Core_Plugins.md § scene-io.`
+            `See docs/history/engine/04_Core_Plugins.md § scene-io.`
         );
         this.name = 'PresetFieldFrozenError';
     }
```

#### `engine/AnimationEngine.ts`  _(1 lines)_

```diff
@@ -7,7 +7,6 @@
  */
 
 import { Track, Keyframe } from '../types';
-import { solveBezierY } from './BezierMath';
 import { featureRegistry } from './FeatureSystem';
 import { AnimationMath } from './math/AnimationMath';
 import { binderRegistry } from './animation/binderRegistry';
```

#### `store/animation/playbackSlice.ts`  _(1 lines)_

```diff
@@ -101,6 +101,10 @@ export const createPlaybackSlice: StateCreator<AnimationStore, [["zustand/subscr
                     fps: state.fps,
                     durationFrames: state.durationFrames,
                     currentFrame: state.currentFrame,
+                    // 'match' rescales AudioClip.startFrame below, so the
+                    // entry has to carry the pre-change clips or undo would
+                    // put the keys back and leave the audio remapped.
+                    audioClips: state.audioClips.map(c => c ? { ...c } : null),
                 },
             };
             const newUndo = [...state.undoStack, undoItem];
```

### Cosmetic / class-only (28 files)

#### `app-gmt/LoadingScreen.tsx`

```diff
@@ -349,10 +349,10 @@ export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isReady, onFinishe
                         </button>
 
                         {isMenuOpen && (
-                            <div className="absolute bottom-full mb-4 w-[340px] bg-surface border border-line/20 rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-fade-in text-xs z-[110]"
+                            <div className="absolute bottom-full mb-4 w-[340px] bg-surface border border-line/20 rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl text-xs z-[110]"
                                 onMouseLeave={() => setHoveredId(null)}>
                                 {hoveredId && hoveredId !== 'Modular' && (
-                                    <div className="absolute left-[350px] bottom-0 w-[256px] h-[256px] bg-black border border-accent-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden animate-fade-in pointer-events-none">
+                                    <div className="absolute left-[350px] bottom-0 w-[256px] h-[256px] bg-black border border-accent-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden pointer-events-none">
                                         <img src={getThumbPath(hoveredId)} className="w-full h-full object-cover" alt="Preview"
                                             onError={e => { e.currentTarget.style.display = 'none'; }} />
                                         <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none" />
```

#### `components/DynamicList.tsx`

```diff
@@ -159,7 +159,7 @@ export const DynamicListItem: React.FC<DynamicListItemProps> = ({
     const bgClass = selected ? colors.selectedBg : 'bg-surface-section';
 
     return (
-        <div className={`${bgClass} rounded border ${borderClass} animate-fade-in transition-colors ${className}`}>
+        <div className={`${bgClass} rounded border ${borderClass} transition-colors ${className}`}>
             {/* Item header */}
             {(title || actions || onRemove || expandable) && (
                 <div
@@ -202,7 +202,7 @@ export const DynamicListItem: React.FC<DynamicListItemProps> = ({
                 slider rows extend to the dock side. */}
             {expandable ? (
                 isExpanded && (
-                    <div className="animate-fade-in pb-2">
+                    <div className="pb-2">
                         {children}
                     </div>
                 )
```

#### `components/GenericToggleSwitch.tsx`

```diff
@@ -103,7 +103,7 @@ export function GenericToggleSwitch<T extends string | number | boolean>({
     if (options) {
         return (
             <div
-                className={`mb-px animate-slider-entry ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
+                className={`mb-px ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                 data-help-id={rest['data-help-id']}
                 onContextMenu={onContextMenu}
             >
@@ -148,7 +148,7 @@ export function GenericToggleSwitch<T extends string | number | boolean>({
     // --- BOOLEAN toggle ---
     return (
         <div
-            className={`mb-px animate-slider-entry ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
+            className={`mb-px ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
             data-help-id={rest['data-help-id']}
             onContextMenu={onContextMenu}
         >
```

#### `engine-gmt/components/panels/quality/QualityRenderControls.tsx`

```diff
@@ -122,7 +122,7 @@ export const QualityRenderControls: React.FC = () => {
 
                 {/* PT global controls — visible while in Path Tracer mode */}
                 {state.renderMode === 'PathTracing' && lighting && (
-                    <div className="animate-fade-in" data-help-id="pt.global">
+                    <div className="" data-help-id="pt.global">
                         <Slider
                             label="Max Bounces"
                             value={lighting.ptBounces}
@@ -156,7 +156,7 @@ export const QualityRenderControls: React.FC = () => {
                 />
 
                 {state.resolutionMode === 'Fixed' && (
-                    <div className="animate-fade-in flex flex-col gap-2 px-3 py-2 bg-surface-raised/50">
+                    <div className="flex flex-col gap-2 px-3 py-2 bg-surface-raised/50">
                         <Dropdown
                             label="Preset"
                             value={currentPreset}
```

#### `engine-gmt/navigation/HudOverlay.tsx`

```diff
@@ -229,7 +229,7 @@ const HudOverlay: React.FC<HudOverlayProps> = ({ isMobile, activeHint: _activeHi
                                     if (navigator.vibrate) navigator.vibrate(30);
                                 }}
                                 title={isStepBack ? 'Step the camera back one unit (already at default view)' : 'Reset camera to default view'}
-                                className="flex-1 pointer-events-auto px-2 py-1.5 bg-surface/80 hover:bg-accent-900/80 text-accent-400 hover:text-fg text-[9px] font-bold rounded-tl-lg border-l border-t border-line/10 backdrop-blur-md hidden animate-fade-in shadow-xl whitespace-nowrap"
+                                className="flex-1 pointer-events-auto px-2 py-1.5 bg-surface/80 hover:bg-accent-900/80 text-accent-400 hover:text-fg text-[9px] font-bold rounded-tl-lg border-l border-t border-line/10 backdrop-blur-md hidden shadow-xl whitespace-nowrap"
                             >
                                 {isStepBack ? 'Step Back' : 'Reset'}
                             </button>
@@ -238,7 +238,7 @@ const HudOverlay: React.FC<HudOverlayProps> = ({ isMobile, activeHint: _activeHi
                                 onClick={() => { undoCamera?.(); actionBus.fire('camera.undo'); if (navigator.vibrate) navigator.vibrate(30); }}
                                 disabled={!canUndoCamera}
                                 title="Revert the last camera movement (Ctrl+Shift+Z)"
-                                className="flex-1 pointer-events-auto px-2 py-1.5 bg-surface/80 hover:bg-accent-900/80 text-accent-400 hover:text-fg text-[9px] font-bold rounded-tr-lg border-r border-t border-line/10 backdrop-blur-md hidden animate-fade-in shadow-xl whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface/80 disabled:hover:text-accent-400"
+                                className="flex-1 pointer-events-auto px-2 py-1.5 bg-surface/80 hover:bg-accent-900/80 text-accent-400 hover:text-fg text-[9px] font-bold rounded-tr-lg border-r border-t border-line/10 backdrop-blur-md hidden shadow-xl whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface/80 disabled:hover:text-accent-400"
                             >
                                 Undo Cam
                             </button>
```

#### `engine/plugins/viewport/FixedResolutionControls.tsx`

```diff
@@ -146,7 +146,7 @@ export const FixedResolutionControls: React.FC<FixedResolutionControlsProps> = (
             {showResMenu && (
                 <div
                     ref={presetMenuRef}
-                    className="absolute top-8 left-0 w-48 bg-surface border border-line/20 rounded shadow-xl z-50 overflow-hidden flex flex-col py-1 animate-fade-in"
+                    className="absolute top-8 left-0 w-48 bg-surface border border-line/20 rounded shadow-xl z-50 overflow-hidden flex flex-col py-1"
                 >
                     {/* Custom sits at the top — it's an explicit W×H entry, not a
                         fit-to-window preset, so it's separated from the list below. */}
@@ -255,7 +255,7 @@ const CustomResolutionPopover: React.FC<CustomResolutionPopoverProps> = ({
     return (
         <div
             ref={rootRef}
-            className="absolute top-8 left-0 w-52 bg-surface border border-line/20 rounded shadow-xl z-[60] p-3 animate-fade-in"
+            className="absolute top-8 left-0 w-52 bg-surface border border-line/20 rounded shadow-xl z-[60] p-3"
             onMouseDown={e => e.stopPropagation()}
         >
             <div className="text-[10px] font-bold text-fg-dim mb-2">Custom Resolution</div>
```

#### `components/Accordion.tsx`

```diff
@@ -182,7 +182,7 @@ export const Accordion: React.FC<AccordionProps> = ({ sections, className = '' }
                             <ChevronDown open={open} />
                         </div>
                         {open && (
-                            <div className="flex flex-col animate-fade-in">{section.children}</div>
+                            <div className="flex flex-col">{section.children}</div>
                         )}
                         {!isLast && <div className="h-px bg-line/10" />}
                     </div>
```

#### `components/AdvancedGradientEditor.tsx`

```diff
@@ -804,7 +804,7 @@ const AdvancedGradientEditor: React.FC<AdvancedGradientEditorProps> = ({ value,
             </div>
 
             {isExpanded && (
-                <div className="flex flex-col animate-slider-entry gradient-interactive-element overflow-hidden">
+                <div className="flex flex-col gradient-interactive-element overflow-hidden">
                     {selectedNodes.length > 0 ? (
                         <>
                              <div className="mb-px mt-2">
```

#### `components/AutoFeaturePanel.tsx`

```diff
@@ -830,7 +830,7 @@ export const AutoFeaturePanel: React.FC<AutoFeaturePanelProps> = ({
             {outerHint}
             {renderItems}
             {confirming && (
-                <div className="absolute inset-0 z-50 animate-pop-in">
+                <div className="absolute inset-0 z-50">
                     <div className="bg-surface border border-line/20 rounded shadow-2xl overflow-hidden h-full flex flex-col">
                         <div className="flex items-center gap-2 p-2 border-b border-line/10 bg-line/5">
                             <AlertIcon />
```

#### `components/GlobalContextMenu.tsx`

```diff
@@ -101,7 +101,7 @@ const GlobalContextMenu: React.FC<GlobalContextMenuProps> = ({ x, y, items, targ
     const content = (
         <div 
             ref={menuRef}
-            className="fractal-context-menu fixed bg-surface-raised border border-line/20 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] py-1 min-w-[200px] max-h-[80dvh] overflow-y-auto mobile-scroll animate-fade-in [&_.animate-slider-entry]:!animate-none"
+            className="fractal-context-menu fixed bg-surface-raised border border-line/20 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] py-1 min-w-[200px] max-h-[80dvh] overflow-y-auto mobile-scroll"
             style={{ left: layout.x, top: layout.y, opacity: layout.opacity, zIndex: z('contextMenu') }}
             onContextMenu={(e) => e.preventDefault()}
         >
```

#### `components/InteractionPicker.tsx`

```diff
@@ -37,7 +37,7 @@ export const InteractionPicker: React.FC<InteractionPickerProps> = ({
     };
 
     return (
-        <div className="flex flex-col animate-fade-in" ref={anchorRef}>
+        <div className="flex flex-col" ref={anchorRef}>
              {isActive && helpText && (
                  <div className="mb-px p-2 bg-ok/15 border border-ok/30 rounded text-[9px] text-ok animate-pulse text-center leading-tight">
                      {helpText}
```

#### `components/Popover.tsx`

```diff
@@ -142,7 +142,7 @@ export const Popover: React.FC<PopoverProps> = ({
                     // mobile (the Light Studio popup has unbounded internal layout).
                     className={`${width} max-h-[80dvh] overflow-y-auto mobile-scroll bg-surface border border-line/20 rounded-xl ${
                         padding === 'none' ? 'py-3' : 'p-3'
-                    } shadow-2xl animate-fade-in ${className}`}
+                    } shadow-2xl ${className}`}
                     onClick={(e) => e.stopPropagation()}
                     onMouseEnter={onMouseEnter}
                     onMouseLeave={onMouseLeave}
```

#### `components/inputs/ScalarInput.tsx`

```diff
@@ -233,7 +233,7 @@ export const ScalarInput: React.FC<ScalarInputProps> = ({
     
     return (
         <div 
-            className={`mt-px animate-slider-entry ${disabled ? 'opacity-70 pointer-events-none' : ''} ${className}`}
+            className={`mt-px ${disabled ? 'opacity-70 pointer-events-none' : ''} ${className}`}
             data-help-id={dataHelpId}
             onContextMenu={onContextMenu}
         >
```

#### `components/inputs/VectorInput.tsx`

```diff
@@ -196,7 +196,7 @@ export const VectorInput: React.FC<VectorInputProps> = ({
     
     return (
         <div 
-            className="mb-px animate-slider-entry"
+            className="mb-px"
             data-help-id={dataHelpId}
             onContextMenu={onContextMenu}
         >
```

#### `components/panels/engine/EngineFeatureRow.tsx`

```diff
@@ -179,7 +179,7 @@ export const EngineFeatureRow: React.FC<EngineFeatureRowProps> = ({
             {/* Portal Tooltip */}
             {showTooltip && createPortal(
                 <div
-                    className="fixed pointer-events-none flex items-center animate-fade-in"
+                    className="fixed pointer-events-none flex items-center"
                     style={{
                         top: tooltipPos.top,
                         [tooltipPos.side === 'left' ? 'left' : 'right']: tooltipPos.x,
```

#### `components/timeline/KeyframeInspector.tsx`

```diff
@@ -378,7 +378,7 @@ export const KeyframeInspector: React.FC<KeyframeInspectorProps> = ({ dataSource
                             <div className={`w-2 h-2 rounded-full ${softSelectionEnabled ? 'bg-secondary shadow-[0_0_5px_rgb(var(--secondary)/0.8)]' : 'bg-fg-ghost'}`} />
                         </div>
                         {softSelectionEnabled && (
-                            <div className="px-3 pb-2 pt-1 animate-fade-in space-y-2">
+                            <div className="px-3 pb-2 pt-1 space-y-2">
                                 {canSoftType && (
                                 <div className="flex items-center justify-between">
                                     <label className="text-[9px] text-fg-muted font-medium">Falloff</label>
```

#### `components/vector-input/BaseVectorInput.tsx`

```diff
@@ -443,7 +443,7 @@ export const BaseVectorInput: React.FC<BaseVectorInputProps> = ({
     };
 
     return (
-        <div className="mt-px animate-slider-entry">
+        <div className="mt-px">
             {/* Header row with label and keyframe button */}
             {label && (
                 <div className="flex items-stretch bg-line/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-line/5">
```

#### `engine-gmt/components/FirstRunHint.tsx`

```diff
@@ -22,7 +22,7 @@ export const FirstRunHint: React.FC = () => {
 
     return (
         <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[800] pointer-events-none">
-            <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 bg-surface-sunken/95 border border-accent-500/30 rounded-full shadow-xl backdrop-blur-md animate-fade-in">
+            <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 bg-surface-sunken/95 border border-accent-500/30 rounded-full shadow-xl backdrop-blur-md">
                 <span className="text-[11px] text-cyan-100">
                     👋 New here? Open the <span className="font-bold text-accent-300">?</span> menu for help &amp; tutorials, or pick a formula to start.
                 </span>
```

#### `engine-gmt/components/FormulaPicker/FormulaPicker.tsx`

```diff
@@ -1784,7 +1784,7 @@ function FormulaRow({
 function HoverPreviewCard({ id }: { id: string }) {
     const def = registry.get(id as FormulaType);
     return (
-        <div className="w-full h-full bg-surface-viewport border border-accent-500/50 rounded-lg shadow-[0_0_40px_rgba(0,0,0,1),0_0_20px_rgb(var(--accent-glow)/0.25)] overflow-hidden animate-fade-in">
+        <div className="w-full h-full bg-surface-viewport border border-accent-500/50 rounded-lg shadow-[0_0_40px_rgba(0,0,0,1),0_0_20px_rgb(var(--accent-glow)/0.25)] overflow-hidden">
             <img
                 src={`thumbnails/fractal_${id}.jpg`}
                 className="w-full h-full object-cover"
```

#### `engine-gmt/components/panels/ShaderCompilerPanel.tsx`

```diff
@@ -230,7 +230,7 @@ export const ShaderCompilerPanel: React.FC<ShaderCompilerPanelProps> = ({ classN
                              <span className={`text-[9px] ${themeText.faint} font-mono`}>~{estCompileSec}s</span>
                          </div>
                          {compileFeedback && (
-                             <div className="text-[10px] text-ok font-bold animate-fade-in flex items-center gap-1">
+                             <div className="text-[10px] text-ok font-bold flex items-center gap-1">
                                  <CheckIcon /> {compileFeedback}
                              </div>
                          )}
```

#### `engine-gmt/components/panels/formula/FormulaParamsWidget.tsx`

```diff
@@ -319,7 +319,7 @@ export const FormulaParamsWidget: React.FC<FeatureComponentProps> = () => {
             <div className={`${surface.panelHeader} border-b ${themeBorder.subtle} p-4 pb-3`} data-help-id="formula.active">
                 <div className="flex justify-between items-baseline mb-1">
                     <SectionLabel color={themeText.dimLabel}>Active Formula</SectionLabel>
-                    {loadTime && <span className={`text-[9px] ${themeText.dimLabel} animate-fade-in`}>{loadTime}</span>}
+                    {loadTime && <span className={`text-[9px] ${themeText.dimLabel}`}>{loadTime}</span>}
                 </div>
                 <FormulaSelect value={state.formula} onChange={switchFormula} />
             </div>
```

#### `engine-gmt/components/panels/lighting/LightPanelControls.tsx`

```diff
@@ -226,7 +226,7 @@ const LightPanel = ({ state, actions }: { state: FractalState, actions: FractalA
       : undefined;
 
   return (
- <div className="animate-fade-in" onContextMenu={handleLightStudioMenu}>
+ <div className="" onContextMenu={handleLightStudioMenu}>
    <div className="mb-4">
       <TabStrip
           items={lighting.lights.map((l, i) => ({
```

#### `engine-gmt/topbar/CenterHUD.tsx`

```diff
@@ -421,7 +421,7 @@ export const CenterHUD: React.FC<{ isMobileMode: boolean, vibrate: (ms: number |
                     <div
                         ref={expandRef}
                         // Positioning: left/top at -20px offsets the p-5 padding, aligning Grid Slot 0 with Collapsed Slot 0
-                        className="absolute top-[-20px] left-[-20px] bg-surface border border-line/20 p-5 rounded-2xl shadow-2xl animate-fade-in z-[80]"
+                        className="absolute top-[-20px] left-[-20px] bg-surface border border-line/20 p-5 rounded-2xl shadow-2xl z-[80]"
                     >
                         <div className="grid grid-cols-3 gap-6">
                              {/* 8 Light Slots */}
```

#### `engine-gmt/topbar/ShareLinkButton.tsx`

```diff
@@ -116,7 +116,7 @@ export const ShareLinkButton: React.FC = () => {
                 <LinkIcon active={status === 'copied'} />
             </button>
             {status !== 'idle' && (
-                <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-0.5 ${color[status]} text-fg text-[9px] font-bold rounded whitespace-nowrap animate-fade-in pointer-events-none z-50`}>
+                <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-0.5 ${color[status]} text-fg text-[9px] font-bold rounded whitespace-nowrap pointer-events-none z-50`}>
                     {label[status]}
                 </div>
             )}
```

#### `engine/components/ToastHost.tsx`

```diff
@@ -33,7 +33,7 @@ export const ToastHost: React.FC = () => {
                         type="button"
                         onClick={() => dismiss(t.id)}
                         title="Dismiss"
-                        className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 bg-surface-sunken/95 border ${c.border} rounded-lg shadow-xl backdrop-blur-md animate-fade-in max-w-[90vw]`}
+                        className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 bg-surface-sunken/95 border ${c.border} rounded-lg shadow-xl backdrop-blur-md max-w-[90vw]`}
                     >
                         <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
                         <span className={`text-[11px] font-semibold ${c.text} whitespace-pre-wrap text-left`}>{t.message}</span>
```

#### `engine/components/modulation/LfoList.tsx`

```diff
@@ -172,7 +172,7 @@ export const LfoList: React.FC = () => {
                             controls effect, not visibility. A disabled
                             LFO can still be edited; it just doesn't
                             drive liveModulations. */}
-                        <div className="animate-fade-in">
+                        <div className="">
                             <WaveformPreview
                                 shape={anim.shape}
                                 period={anim.period}
```

#### `engine/features/webcam/WebcamOverlay.tsx`

```diff
@@ -363,7 +363,7 @@ export const WebcamOverlay: React.FC<FeatureComponentProps> = ({ sliceState, act
                 </div>
                 
                 {showSettings && (
-                    <div className="settings-panel absolute top-10 right-2 w-48 bg-surface-raised border border-line/20 rounded p-2 shadow-2xl z-50 animate-fade-in" onMouseDown={(e) => e.stopPropagation()}>
+                    <div className="settings-panel absolute top-10 right-2 w-48 bg-surface-raised border border-line/20 rounded p-2 shadow-2xl z-50" onMouseDown={(e) => e.stopPropagation()}>
                          <div className="space-y-2 text-[10px]">
                             <div>
                                 <SectionLabel className="block mb-1">Blend Mode</SectionLabel>
```

#### `engine/plugins/RenderDialog/RenderingView.tsx`

```diff
@@ -98,7 +98,7 @@ export const RenderingView: React.FC<RenderingViewProps> = ({
                         fullWidth
                     />
                 ) : (
-                    <div className="grid grid-cols-3 gap-2 animate-fade-in">
+                    <div className="grid grid-cols-3 gap-2">
                         <Button onClick={onResume}        label="Resume"  variant="primary" icon={<PlayIcon />} />
                         <Button onClick={onConfirmStitch} label="Finish"  variant="success" icon={<CheckIcon />} />
                         <Button onClick={onDiscard}       label="Discard" variant="danger"  icon={<TrashIcon />} />
```


---

## Addendum — triage session, 2026-08-02

Four corrections from re-reading this document against the tree it describes.
The body above is left as written; these amend it.

**§1's framing is now larger than the change.** It says the pair of commits makes
"a lot of previously inert animation start firing". Measured on the booted app
today: **five** utilities resolve (`fade-in-up/down/left/right`, `pop-in`) across
**16 call sites in 10 files** — LoadingScreen, AudioLinkControls, HelpBrowser,
FormulaPicker, CategoryPickerMenu, PerformanceMonitor, KeyframeInspector,
DraggableWindow, GraphContextMenu. All are opt-in surfaces; a default boot has
exactly one carrier on screen. That is a five-minute check, not an audit.

**`animate-fade-in` resolves to nothing, and that is fine.** `595cfe21` removed
all 34 call sites; its message says it removed the keyframe too, but it did not —
only the call sites went. Harmless in the build, because Tailwind never emits an
unused utility, and a probe confirms `animationName: 'none'` for it against the
five that resolve. The two dead lines are now marked `@stale` in `index.css`
(`ac5061dc`) rather than left looking intentional.

**The `@invariant` this change added to `index.css` would have failed its own
proof.** It claimed "46 call sites across 36 components" and "7 expected"
keyframes — both true when written, neither true after `9c5e49e2` and `595cfe21`
landed hours later. Corrected in `ac5061dc` by measuring rather than adjusting the
number, and the proof command now asserts non-zero instead of a count that churns.

**The `forwards` fill-mode concern is measured, not assumed.** All five live
animations persist their end state, which computes as `matrix(1,0,0,1,0,0)` —
identity, but not `none`, so every carrier keeps a stacking context after
settling. On a default app-gmt boot **no `position:fixed` descendant sits under
any carrier**, so there is no layout consequence today. The condition that would
change that is recorded at the site.

**This file made itself invisible to grep.** The `components/CategoryPickerMenu.tsx`
hunk in §5 quoted the removed line verbatim — including its literal `0x00` — so
ripgrep classified this document binary and silently skipped everything from that
line onward, which is 26 of its 62 file sections. The exact failure mode the audit
documented three times, reproduced by the document recording the fix. The byte is
now written `<U+0000>`. A tree-wide scan afterwards found **no source file
carrying a NUL** (3,162 text-ish files; the five hits are `.fbx`, `.mkv` and a
dev-server log, all legitimately binary).

**Guards re-run on this tree, 2026-08-02, all exit 0:** `typecheck`,
`check:rule-guards` (22 rules, 90 citations, zero issues), `smoke:boot`,
`smoke:engine-gmt`, plus `smoke:help-menu`, `smoke:catalog-browse` and
`smoke:canvas-menu` — the three that drive surfaces carrying the restored classes.
