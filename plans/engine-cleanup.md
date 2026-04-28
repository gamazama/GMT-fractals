# Engine cleanup plan

Same shape as the fluid-toy refactor, applied to the wider workspace.
This started as a planning document; it's now also the **post-mortem** —
each section is annotated with what was actually done.

> ## Status as of 2026-04-28 — pass concluded
>
> **Done:**
> - #1 RenderPopup.tsx — split into 4 focused files (1046 → 299)
> - #3 FractalEngine.ts — `CompileScheduler` extracted (933 → 711)
> - Bonus: `handleRenderTick` extracted from renderWorker (796 → 678)
> - Navigation.tsx — architecture comment block in lieu of split (1261 lines)
>
> **Deferred / skipped after hands-on review:**
> - #2 SDFShaderBuilder — file lives in `engine/`, only consumed by `mesh-export/`. Should move there as part of mesh-export's own porting pass, not here.
> - #4 Worker stack rest (WorkerProxy, WorkerExporter, renderWorker dispatch) — large but cohesive; per-domain split would be plumbing without clarity gain.
> - #5 Navigation per-mode split — modes share dense state; mechanical extraction would need a 30-field deps bundle. Documented instead.
> - #6 AutoFeaturePanel — per-type renderer dispatch is already linear. Cross-app blast radius not worth it.
> - #7 AdvancedGradientEditor — cosmetic.
> - #8 BucketRenderer — algorithm-driven, no SoC violation.
>
> **Lesson:** the high-payoff refactors share a shape — *god class with several distinct responsibility clusters sharing one private state pool*. FluidEngine, RenderPopup, the FractalEngine compile cluster fit. Most of the wider workspace's big files don't — they're large because the algorithm is, not because concerns are tangled. The cleanup pass is essentially complete; remaining files are best left alone unless someone has a concrete reason to touch them.
>
> Below is the original plan, preserved for reference.

## Where we are now

After the fluid-toy pass:
- `fluid/FluidEngine.ts` 2245 → 1798 (4 cohesive units extracted)
- shaders, gestures, slice-sync, deep-zoom orbit loop all in their own files
- pattern: `<Concern>Controller` class owns its state + GPU resources, exposes `bindUniforms` / `process` / etc.

The wider workspace has eight files >650 lines that look like they'd
benefit from the same treatment.

## Top targets, ranked by impact ÷ risk

### 1. `engine-gmt/engine/FractalEngine.ts` (933, 98 methods) — SAME SHAPE AS FluidEngine pre-refactor

GMT's main render orchestrator. Already composes RenderPipeline,
MaterialController, SceneController, PickingController, BucketRenderer,
UniformManager, ConfigManager — partial delegation in place. But still
holds state for: bucket coordination, picking state, accumulation,
keyframe interpolation, hardware detection, frame loop.

**Likely extractions** (1–2 each, ~80–200 lines):
- `AccumulationOrchestrator` — already partly in `AccumulationController.ts`; finish the cut
- `FrameTickRunner` — RAF loop + frame-end callbacks
- `PrecisionMath/CameraStateManager` — camera state + virtual-space math currently mixed in
- Possibly a `JitterScheduler` for the halton-driven sub-pixel offsets

**Blast radius:** GMT main app (stable + dev/app-gmt), demo app.

**Tests:** `npm run test:baseline` + `test:hybrid` + `test:render`. ~3–5 min total. Smoke is solid here.

**Risk:** medium. The class has been touched a lot recently; many
controllers already exist alongside it. The refactor pattern is proven.

**Estimated effort:** 1–2 sessions.

---

### 2. `engine-gmt/components/timeline/RenderPopup.tsx` (1046) — UI split, very low risk

Modal export dialog. Owns: export config form, video encoder
(mediabunny), preset application, progress timer, run-state machine,
preview overlay, error display.

**Likely extractions:**
- `RenderPopup/ExportConfigForm.tsx` — pure form (resolution, fps, format, codec, range)
- `RenderPopup/RunController.ts` — non-React: encoder pipeline, frame loop, abort, error
- `RenderPopup/PreviewPane.tsx` — live preview thumbnail
- `RenderPopup/index.tsx` — composition shell (~150 lines)

**Blast radius:** stable + dev/app-gmt. Single consumer per app.

**Tests:** No automated test for the dialog. Manual: open dialog, run a 2-second export, verify output. Low risk because pure UI splits don't change render behaviour.

**Risk:** low. Pure UI surgery. Largest single file in workspace by line count.

**Estimated effort:** 1 session.

---

### 3. `engine-gmt/navigation/Navigation.tsx` (1261) — multi-mode controller split

Camera/orbit/walk navigation with HUD refs, physics probe, modulation
hooks, key-cam capture. Multiple navigation modes interleaved in one
component.

**Likely extractions:**
- `navigation/modes/{orbit,walk,fly,dive}.ts` — per-mode handler files (parallel to fluid-toy's `pointer/gestures/`)
- `navigation/NavigationHud.tsx` — speed/distance/reticle DOM overlay
- `navigation/Navigation.tsx` — dispatcher + `<OrbitControls>` mount (~200 lines)

**Blast radius:** GMT only (stable + dev/app-gmt).

**Tests:** No automated coverage. Manual: walk through each nav mode, verify hotkeys, verify key-cam capture.

**Risk:** medium. Camera state has subtle precision math (VirtualSpace) and event ordering that's easy to get wrong.

**Estimated effort:** 1–2 sessions.

---

### 4. `engine-gmt/engine/worker/WorkerProxy.ts` (811) + `renderWorker.ts` (796) + `WorkerExporter.ts` (757)

Three-file worker stack implementing a typed message protocol. Tightly
coupled — splitting one requires revisiting all three.

**Likely extractions per file:**
- WorkerProxy: split message handlers per concern (render, preset, export, picking, …)
- renderWorker: per-message-type handler files; main entry just dispatches
- WorkerExporter: encoder lifecycle + frame-by-frame ratchet + abort handling

**Blast radius:** GMT only.

**Tests:** Existing engine smokes drive the worker; render harness validates end-to-end. Coverage is decent.

**Risk:** medium-high. Worker boundary is precise; subtle bugs (message ordering, transferable handling) hide here.

**Estimated effort:** 2–3 sessions. Treat as a single refactor across all three files.

---

### 5. `engine-gmt/engine/SDFShaderBuilder.ts` (667) — shader composition

Builds SDF shader source from a formula + feature config. Heavy string
concat with conditional injections. Already has a sibling `engine/ShaderBuilder.ts` (136 lines, smaller).

**Likely extractions:**
- `SDFShaderBuilder/{lighting,optics,colour,raymarcher,iteration}.ts` — per concern
- `SDFShaderBuilder/index.ts` — top-level assembler

**Blast radius:** GMT only.

**Tests:** `test:baseline` + `test:interlace` cover this directly.

**Risk:** low–medium. Shader generation is pure functional, but order matters and bugs surface as compile failures (caught fast by the smoke).

**Estimated effort:** 1 session.

---

### 6. `components/AdvancedGradientEditor.tsx` (862) — UI split

Gradient editor with multiple panes (stops, colour space, presets).

**Likely extractions:**
- `AdvancedGradientEditor/{StopList,StopEditor,ColourSpaceTabs,PresetGrid}.tsx`
- Top-level orchestrator at ~200 lines

**Blast radius:** every app — fluid-toy + GMT + fractal-toy.

**Tests:** Manual.

**Risk:** low. UI splits are mechanical.

**Estimated effort:** 1 session.

---

### 7. `engine-gmt/engine/BucketRenderer.ts` (881) — tile-based render

Tile-based rendering for high-res / multi-pass export. `BucketEngineRef`
interface keeps it loosely coupled to FractalEngine. More
"complex algorithm" than "god class" — splitting needs care to not
fragment the algorithm.

**Likely extractions:**
- `BucketRenderer/{TileScheduler,SamplingPlan,BucketPipeline}.ts`
- Status: defer until the FractalEngine pass clarifies the contract

**Blast radius:** GMT only.

**Risk:** medium. Algorithm-heavy; refactor only if there's a concrete reason.

**Estimated effort:** 1–2 sessions, but I'd skip this until #1 lands.

---

### 8. `components/AutoFeaturePanel.tsx` (665) — generic UI builder

Reads feature definitions and emits the panel UI. Used by every app.
Does its own param-type dispatch (slider/dropdown/colour/vec2/…)
inline.

**Likely extractions:**
- `AutoFeaturePanel/renderers/{slider,dropdown,colour,vec2,…}.tsx`
- `AutoFeaturePanel/index.tsx` — dispatcher

**Blast radius:** every app.

**Tests:** Existing smokes cover it indirectly (render the apps, see panels appear). No targeted test.

**Risk:** medium. Cross-app, but the per-renderer split is mechanical.

**Estimated effort:** 1 session.

## Recommended order

A defensible sequencing — drop in or rearrange as you like:

1. **RenderPopup** (#2) — biggest single file, lowest risk, fastest win.
2. **SDFShaderBuilder** (#5) — pure functional split, well-covered by smokes.
3. **FractalEngine** (#1) — same playbook as fluid-toy. Highest payoff.
4. **Worker stack** (#4) — only after FractalEngine is cleaner; WorkerProxy's surface tracks FractalEngine's.
5. **Navigation** (#3) — parallels fluid-toy's gestures split, applies cleanly.
6. **AutoFeaturePanel** (#8) — touches every app, do it when there's no in-flight feature work.
7. **AdvancedGradientEditor** (#6) — purely cosmetic, defer.
8. **BucketRenderer** (#7) — defer indefinitely; algorithm-driven, no clear win.

After #1–#3 the wider engine looks structurally similar to what
fluid-toy looks like now: clear seams, a CODE_MAP equivalent, easy
onboarding for new features.

## Things to investigate before starting any item

- **Stable vs dev fork.** `engine-gmt/` lives in dev/; stable/ has its own copy of these files. Per `feedback_duplicate_module_state`, keep an eye on which fork the change targets and whether to backport.
- **Test coverage gaps.** Navigation + RenderPopup + AutoFeaturePanel have no automated coverage. Decide whether to add a smoke before refactoring or rely on manual testing.
- **Public API stability.** Any extraction that changes engine-public types (e.g. `BucketEngineRef`, `EngineRenderState`) ripples to consumers — check imports before deleting.

## Pattern checklist (from the fluid-toy pass)

For every extraction:
- [ ] New class owns state + GPU/DOM resources for one concern.
- [ ] Public API is a small set of verbs (`process`, `bindUniforms`, `dispose`, `markResize`, …).
- [ ] Old call sites read `engine.<concern>.<verb>(...)`.
- [ ] `version` counter exposed if state changes invalidate downstream caches (TSAA hashing pattern).
- [ ] `dispose()` deletes everything the constructor / setters allocated.
- [ ] Typecheck + smoke before commit.
- [ ] CODE_MAP updated.
