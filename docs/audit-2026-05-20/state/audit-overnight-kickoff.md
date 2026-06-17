# Overnight Doc Audit & Fill — Plan

**Goal:** bring `dev/docs/` from "last refreshed 2026-04-23" to current. Scope: `engine/` core, `engine-gmt/` plugin layer, `app-gmt/` app. Output: updated/added docs under `dev/docs/engine/` and `dev/docs/gmt/`, refreshed `DOCS_INDEX.md`, refreshed `CODEBASE_MAP.md` deltas.

**Premise correction:** dev/ is not undocumented. There are 21 engine docs, 20 GMT-era docs, a strong `CLAUDE.md`, a `CODEBASE_MAP.md`, and an honest `21_Code_Review_2026-04-25.md`. The real job is **audit + fill drift**, not rebuild.

## Constraints

- **Claude Max plan resets at 11pm.** Each loop iteration must persist its output (a doc file, a `progress.json` entry) before exiting, so a fresh session resuming the loop after 11pm can pick up cleanly.
- **No invented APIs.** Every claim must cite a real file:line. Uncertainty is flagged, not smoothed.
- **No destructive edits.** Existing docs get patched in place or replaced wholesale only when fully superseded; old versions move to `dev/docs/archive/` with a "why archived" header.
- **Cost discipline.** Each iteration uses 1 Explore agent (read code) + 1 writer (produce doc). Parallel fan-out only at the *survey* phase, not the writing phase.

## Phases

### Phase 0 — Manual setup (this session, before the loop starts)

Done in this session, by me:

1. Create `dev/plans/doc-audit-overnight.md` (this file).
2. Create `dev/plans/doc-audit-state/` with:
   - `subsystems.json` — the partition (list below). Each entry: `{id, area, files_to_read, target_doc_path, action: "audit"|"create"|"merge", status: "pending"}`.
   - `progress.json` — append-only log of completed iterations.
   - `notes.md` — running notes the loop can append to (surprises, cross-references discovered).
3. Confirm the partition with the user. **Approval gate.**

### Phase 1 — Survey (overnight, /loop dynamic)

Each iteration picks the next `pending` subsystem from `subsystems.json` and produces a `survey/<id>.md` containing:

- Files touched, with line counts.
- Public API surface (exports).
- Internal architecture in 5-15 bullet points, each with a file:line citation.
- Drift from existing doc (if any): a 3-column table — "Doc claim" / "Actual code" / "Severity".
- Open questions / things the agent wasn't sure about.

Survey files are short (~200-400 lines), grounded, never invented. The writer in Phase 2 reads these — not the raw source.

Iteration shape (the /loop prompt does this each tick):
1. Read `subsystems.json`, pick first `pending`.
2. Mark `in_progress` (write back to file).
3. Spawn an Explore agent with a tight brief: "read these files, produce this survey doc, cite file:line, flag uncertainty."
4. Persist the agent's output to `survey/<id>.md`.
5. Mark `survey_done`, append to `progress.json`.
6. ScheduleWakeup with a short delay (~120s) to start the next.

### Phase 2 — Write (overnight, /loop continues)

Once all subsystems have `survey_done`, the same loop transitions to writing. For each surveyed subsystem:

1. Read `survey/<id>.md` + the existing doc (if any).
2. Spawn a writer agent: "produce/update the target doc using this survey + this existing doc as inputs. Match the style of [reference doc, e.g. `13_Extracting_From_GMT.md`]. Preserve historical accuracy where the existing doc was right; correct it where the survey shows drift. Add a 'Last verified YYYY-MM-DD' footer."
3. Write the doc to its target path.
4. If replacing an existing doc wholesale, move the old to `dev/docs/archive/` with a header.
5. Mark `written`, log to `progress.json`.

### Phase 3 — Reconcile (single closing session, manual / shorter loop)

After all individual docs are done:

1. Refresh `DOCS_INDEX.md` — update the TOC, the "last refresh" date, the reading paths.
2. Refresh `CODEBASE_MAP.md` — diff against current top-level layout, update the heuristics table if needed.
3. Refresh `CLAUDE.md` — make sure every "Read first" table entry still points to a real file.
4. Write a new `dev/docs/engine/22_Audit_2026-05-XX.md` summarising what the audit found (carrying forward the style of `21_Code_Review_2026-04-25.md`).
5. Final pass: grep for broken markdown links across `dev/docs/`.

## Subsystem partition

Each subsystem = one iteration of the loop. Listed in execution order (foundational first, so later iterations can cross-reference).

### Engine core (`dev/engine/`)

| id | Area | Files | Existing doc | Action |
|---|---|---|---|---|
| `e01-feature-system` | FeatureSystem + DDFS core | `FeatureSystem.ts`, `createFeatureSlice.ts`, `defineEnumParam.ts`, `typedSlices.ts` | `engine/02_Feature_Registry.md` | audit |
| `e02-tick-registry` | Tick phases + render loop ownership | `TickRegistry.ts`, `plugins/RenderLoop.tsx` | `engine/01_Architecture.md` (partial) | audit |
| `e03-animation` | AnimationEngine + binders + interpolators | `AnimationEngine.ts`, `animation/*` | `engine/08_Animation.md` | audit |
| `e04-shader-builder` | ShaderBuilder + ShaderFactory + UniformSchema | `ShaderBuilder.ts`, `ShaderFactory.ts`, `UniformSchema.ts`, `UniformNames.ts` | none in engine/ (gmt-era only) | create |
| `e05-render-pipeline` | RenderPipeline + BloomPass + AccumulationController | `RenderPipeline.ts`, `BloomPass.ts`, `AccumulationController.ts` | none | create |
| `e06-adaptive-resolution` | AdaptiveResolution + HardwareDetection + viewport | `AdaptiveResolution.ts`, `HardwareDetection.ts`, `plugins/Viewport.tsx` | `engine/10_Viewport.md` | audit |
| `e07-plugins-host` | Hud, TopBar, Menu, Help, SceneIO host plugins | `plugins/Hud.tsx`, `plugins/TopBar.tsx`, `plugins/Menu.tsx`, `plugins/Help.tsx`, `plugins/SceneIO.tsx` | `engine/04_Core_Plugins.md`, `engine/11_Plugin_Authoring.md` | audit |
| `e08-shortcuts-undo` | Keyboard + transaction stack | `plugins/Shortcuts.ts`, `plugins/Undo.tsx` | `engine/06_Undo_Transactions.md`, `engine/07_Shortcuts.md` | audit |
| `e09-camera-plugin` | Camera plugin + StateLibrary primitive | `plugins/Camera.ts` (+ subdir), `appHandles.ts`, `migrations.ts` | `engine/15_Camera_Manager_Extraction.md`, `engine/12_App_Handles.md` | audit |
| `e10-engine-features` | Bundled features (audio, modulation, webcam, debug, post, color) | `engine/features/*` | none consolidated | create |
| `e11-worker-contract` | Worker proxy, ViewportRefs, RENDER_TICK protocol | `engine/worker/*` | scattered | create |
| `e12-mobile-layout` | Mobile detection + layout primitives | `hooks/useMobileLayout.ts`, plus refs | `engine/17_Mobile_Layout.md` | audit |
| `e13-shared-ui` | components/ primitives + context providers | `components/Slider.tsx`, `components/Knob.tsx`, `components/AutoFeaturePanel.tsx`, `components/registry/*` | `engine/05_Shared_UI.md` | audit |

### engine-gmt (the GMT plugin library)

| id | Area | Files | Existing doc | Action |
|---|---|---|---|---|
| `g01-renderer` | FractalEngine + MaterialController + worker | `engine-gmt/engine/FractalEngine.ts`, `MaterialController.ts`, `SceneController.ts`, `worker/*` | gmt-era `01_System_Architecture.md` (pre-extraction) | create new `engine/30_GMT_Renderer.md` |
| `g02-shader-pipeline` | SDFShaderBuilder + ShaderFactory (GMT) + UniformManager | `engine-gmt/engine/SDFShaderBuilder.ts`, `ShaderFactory.ts`, `managers/UniformManager.ts` | gmt-era `02_Rendering_Internals.md` | create new `engine/31_GMT_Shader_Pipeline.md` |
| `g03-formula-registry` | FractalRegistry + 42 formulas + V3/V4 pipeline | `engine-gmt/formulas/*`, `engine-gmt/types/FractalDefinition.ts` | gmt-era `25_Formula_Dev_Reference.md` | merge: cross-link from `engine/32_GMT_Formulas.md` |
| `g04-navigation` | Camera nav + physics probe + HUD | `engine-gmt/navigation/*` | none in engine/ | create |
| `g05-engine-gmt-features` | 26 GMT DDFS features | `engine-gmt/features/*` | none consolidated | create |
| `g06-bucket-render` | BucketRenderer + WorkerExporter + WorkerHistogram | `engine-gmt/engine/BucketRenderer.ts`, `worker/WorkerExporter.ts`, `WorkerHistogram.ts` | gmt-era `43_Bucket_Render_Overhaul.md` | audit/port |
| `g07-mesh-export` | Mesh export + VDB writer | `engine-gmt/utils/mesh*`, `mesh-export/*` | gmt-era `30_Mesh_Export_Prototype.md` | audit/port |
| `g08-save-load-gmf` | GMF format + scene serialization | `engine-gmt/utils/FormulaFormat.ts`, `engine-gmt/utils/SceneFormat.ts` ref | gmt-era `05_Data_and_Export.md` | audit/port |
| `g09-modular-graph` | GraphCompiler + ModularGraph (if extracted to dev) | `engine-gmt/utils/GraphCompiler.ts` | gmt-era `03_Modular_System.md` | audit |
| `g10-audio-fps-sync` | Audio timeline + FPS sync (recent feature) | `engine-gmt/features/audio*`, related | none — recent | create |

### app-gmt

| id | Area | Files | Existing doc | Action |
|---|---|---|---|---|
| `a01-boot-shell` | App entry + boot sequence + feature registration | `app-gmt/main.tsx`, `registerFeatures.ts`, `AppGmt.tsx` | `app-gmt/README.md` | audit |
| `a02-panels-layout` | Panel manifest + Dock + ViewportFrame | `engine-gmt/panels.ts`, `engine-gmt/topbar.tsx`, related | `engine/14_Panel_Manifest.md` | audit |
| `a03-tutorial` | Tutorial overlay (if present) | `app-gmt/tutorial/*` | none | create |

**Total: 26 iterations** for survey, ~26 for write, +3 reconcile = ~55 iterations across the night.

## Open questions before kicking off

1. Should fluid-toy and fractal-toy be in scope? The user said no, but they're cheap to add — each is ~1 subsystem.
2. Should the loop also touch `dev/docs/gmt/` (pre-extraction GMT docs)? Default: leave alone, port content as needed into `engine/3x_GMT_*.md` docs.
3. Where should survey files live? Proposal: `dev/plans/doc-audit-state/survey/` — kept out of `dev/docs/` since they're working drafts, not finished docs.
4. Severity floor for "drift": every drift, or only structural? Proposal: log every drift; correct only structural and live-bug-class in this pass.

## Resumption protocol (for the 11pm session reset)

When a fresh session starts /loop with the same prompt:

1. Loop prompt reads `dev/plans/doc-audit-state/progress.json` first.
2. Picks the first subsystem whose status is `pending` (skipping `in_progress` — a previous session may have crashed mid-iteration; mark those for human review rather than retrying blindly).
3. Continues from there.

No state lives in the model's memory. Everything is on disk.

---

## Refinements from research (2026-05-19)

Three parallel research agents surveyed cutting-edge practice. Key incorporations:

### Output format (revised)

- **Per-module docs follow AGENTS.md-style frontmatter:**
  ```yaml
  ---
  source: engine/FractalEngine.ts
  lines: 1-612
  last_verified_sha: <git blob SHA of source at audit time>
  audited: 2026-05-19
  audited_by: <agent_id>
  public_api: [FractalEngine, FractalEngineOptions, ...]
  depends_on: [TickRegistry, WorkerProxy]
  ---
  ```
- **Every architectural claim cites file:line.** Research finding: 92% citation accuracy with anchors vs 78% prose-only (arxiv 2512.12117).
- **Symbol-boundary chunking, ≤512 tokens per doc section.** Better RAG retrievability (arxiv 2510.20609). One section per exported symbol or coherent concept.
- **Module docs live at `dev/docs/modules/<area>/<file-or-feature>.md`** — a NEW tree, parallel to `dev/docs/engine/` (which stays read-only). Cross-link old → new where applicable.

### Existing docs are immutable

Per user direction: do not edit anything currently in `dev/docs/engine/` or `dev/docs/gmt/`. New artifacts only, in `dev/docs/modules/`. DOCS_INDEX may be updated to add a "Module Docs (2026-05-19 audit)" section pointing at the new tree.

### Coverage manifest

```yaml
# dev/plans/doc-audit-state/coverage.yaml
schema_version: 1
repo_root: h:/GMT/workspace-gmt/dev
audit_run: 2026-05-19-overnight
entries:
  - path: engine/FractalEngine.ts
    blob_sha: a3f1...              # git hash-object
    bytes: 18432
    lines: 612
    read_range: [1, 612]           # MUST equal full file or flagged partial
    agent_run_id: e02-tick-registry-survey
    agent_model: claude-opus-4-7
    timestamp: 2026-05-19T22:11:00Z
    confidence: high               # high|medium|low|partial
    gaps: []
    summary_ref: dev/docs/modules/engine/FractalEngine.md
```

After all iterations, a `coverage-summary.json` cross-checks against `git ls-files dev/ -- ':!debug' ':!**/*.frag' ':!**/reference/**'` to flag any uncovered files.

### Anti-hallucination gates (mechanical, post-write)

Each completed doc gets run through three checks BEFORE being marked done in progress.json:

1. **Symbol verification** — every identifier in the doc's `public_api` list is grep'd in the cited source. Missing → reject, agent re-runs.
2. **File:line citation verification** — every `file.ts:N-M` reference resolves to an existing file with at least M lines.
3. **Read-range completeness** — if the agent reported `read_range: [1, 400]` but the source is 612 lines, the doc is marked `partial` and the file goes back into the queue for a continuation pass.

### Cost discipline

- **Per-iteration token cap** ≈ 50k tokens. If an agent burns >50k on one subsystem, the iteration aborts and the subsystem is flagged for human review.
- **Re-read watchdog** — if any single source file is fetched >3 times in one iteration, abort (catches retry loops, the documented $400-overnight failure mode).
- **No parallel writes to the same module.** Survey phase can fan out across subsystems; write phase is strictly serial per subsystem.

### Exhaustive file coverage (NEW requirement from user)

The 26 subsystems above cover *grouped* file sets. But the user wants **every non-excluded file** in dev/ read top-to-bottom. Approach:

1. **Pre-flight pass** (Phase 0.5): an agent runs `git ls-files dev/` filtered against an exclude list (debug/, reference/, frag/, public/, node_modules, dist/, *.snap, *.lock, .png/.jpg/.gif binary assets). Output: `dev/plans/doc-audit-state/file-inventory.yaml` — the canonical list of files that MUST be covered.
2. **Subsystem assignment** — each of the 26 subsystems claims a set of files. The pre-flight script verifies the union covers the inventory.
3. **Orphan sweep** (Phase 1.5): any file not claimed by a subsystem gets a "miscellaneous" iteration — a lightweight agent reads it and produces a one-paragraph summary in `dev/docs/modules/_misc/<path>.md`.
4. **Final reconciliation** verifies `coverage.yaml` paths == `file-inventory.yaml` paths.

### Sibling apps (secondary priority)

Per user: fluid-toy and fractal-toy in scope but secondary. Added as iterations `t01-fluid-toy` and `t02-fractal-toy` at the END of the queue — they run if the loop has budget after the primary 26.

### Source provenance

Each doc footer:
```
---
Generated: 2026-05-19 by <agent_run_id> against blob_sha <sha>.
Verification: passed symbol-grep + line-anchor + read-range checks.
```

This is the mitigation for the failure-attribution problem (arxiv 2505.00212: SOTA at 53.5%). When future readers find a wrong claim, they can bisect to the specific run that produced it.

---

*Next step: user approves the refined plan; I scaffold `dev/plans/doc-audit-state/` (including the file-inventory pre-flight); user reviews the inventory + subsystem assignment; we kick off /loop.*
