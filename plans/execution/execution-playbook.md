# Gradient Explorer — Execution Playbook

**Role:** the static reference for orchestrating the build of the
[amendment plan](../gradient-explorer-amendments-plan.md) +
[polish findings](../gradient-explorer-polish-findings.md). Pair with the live
[execution-progress.md](execution-progress.md). Ready-to-use prompts in [prompts.md](prompts.md).

> **The plan serves the build, not the other way round.** This playbook encodes a *starting*
> structure. Coding sessions surface surprises every time — the orchestrator is expected to
> **adapt** (re-scope, re-sequence, split/merge workstreams, ratify interface changes). The
> §Adaptation protocol is how that stays coherent instead of chaotic.

---

## 1. The orchestration model

The orchestrator is **doc-anchored, not chat-anchored** — its memory is this playbook +
`execution-progress.md`, so the role survives a session dying and can move to a fresh session at
any time. The loop:

1. Orchestrator writes a **session prompt** (from the template) for the next unit of work.
2. **Human** runs that session, navigates whatever comes up live, drives it to a stopping point.
3. Session ends with a **structured summary** (fixed format — see prompts.md).
4. Human pastes the summary back to the orchestrator.
5. Orchestrator **ingests**: updates `execution-progress.md`, ratifies/propagates any interface
   changes, resolves cross-stream conflicts, decides what's next → writes the next prompt(s).

**Every session prompt MUST begin by reading:** the two plan docs, this playbook, and the current
`execution-progress.md` (for the *latest* frozen interfaces — they may have moved since this
playbook was written). The progress log is authoritative where it disagrees with this playbook.

---

## 2. Phases & dependency DAG

Parallelism is only safe in the middle. Order is forced by shared-surface contention:

- **Phase 0 — Engine foundations (SERIAL, 1 session).** The four engine-core promotions + shared
  seams. **Its real deliverable is FROZEN INTERFACES** (§4) every downstream stream codes against.
  Never parallelize — concurrent edits to engine core = merge hell, and divergent interface
  guesses = rework.
- **Phase 1 — Palette features (PARALLEL, worktree per stream).** Fan out only *after* Phase 0
  freezes interfaces. Streams touch mostly-disjoint file sets (§3).
- **Phase 2 — Portability integration (SERIAL, 1 session).** W2 canonical hero + Send-to across
  every mode + per-swatch shelf. Touches every hero → must come after Phase 1 settles.
- **Phase 3 — `/polish` pass (deferred).** Cosmetic, after structure lands.

```
Phase 0 ──freeze interfaces──▶ Phase 1 {S1 S2 S3 S4 S5 S6 in parallel} ──merge──▶ Phase 2 ──▶ Phase 3
```

---

## 3. Workstream → file-set map (worktree ownership)

Each Phase-1 stream owns its files in its own worktree. **Shared-shell files** are touched by
multiple streams → the orchestrator **serializes** those edits or assigns one stream to own the
change and others to *request* it via their summary.

| Stream | Workstream | Owns (primary files) |
|---|---|---|
| **Phase 0** | W8, W10, W4-kernel, W1-engine, undo contract | `store/` (SceneIO/preset path, `slices/historySlice.ts`), `components/AdvancedGradientEditor.tsx`, `components/EmbeddedColorPicker.tsx`, `components/AutoFeaturePanel.tsx` (gradient-param wiring), `utils/colorUtils.ts`, NEW engine modules (document-provider registry, drag-wells kernel, `sampleStops`/`stopOps`, send-target registry kernel), `palette/core/gmtGradient.ts` (→ re-export) |
| **S1** | W6 Picker search | `gradient-explorer/PickerStage.tsx`, `palette/components/PickerControls.tsx`, `palette/components/PickerWall.tsx` (touch) |
| **S2** | W5 Favients undo/list/search | `palette/components/FavientsPanel.tsx`, `palette/store/favientsStore.ts`, `palette/store/favientsPanelPersist.ts` |
| **S3** | W3 ghost curves + Generator coherence | `palette/components/GeneratorStage.tsx`, `ChannelGraphEditor.tsx`, `GeneratorSlotMods.tsx`, `MixBlend.tsx`, `GradientSourcePicker.tsx`, `palette/core/generatorPipeline.ts`, `palette/store/generatorStore.ts` |
| **S4** | W7 Import | NEW `palette/core/importFormats.ts`, `palette/core/presetCatalog.ts` (touch) |
| **S5** | W1 Stops *mode* | NEW `gradient-explorer/EditorStage.tsx`, NEW `palette/features/paletteEditor.ts`, NEW `palette/store/paletteEditorStore.ts` |
| **S6** | W11 Fullscreen configs | NEW ramp-geometry mappings (`palette/core/`), fullscreen overlay (consumes W4 engine kernel) |
| **Phase 2** | W2 portability + W9 snapshot | every result hero (`PickerStage`/`GeneratorStage`/`ImageStage`/`EditorStage`/`FavientsPanel`), NEW canonical hero component, send-target registrations |

**Shared-shell files (orchestrator coordinates — do NOT let two streams edit blind):**
- `palette/registerPaletteUI.ts` — S2 (favients providers) + S5 (paletteEditor feature).
- `gradient-explorer/GradientExplorerApp.tsx` — S1 (mobile picker), S5 (Stage/MOBILE_MODES branch), S6 (overlay mount).
- `gradient-explorer/setup.ts` — S5 (panel manifest entry).

---

## 4. Frozen interfaces (PROPOSED — Phase 0 ratifies & records final in progress log)

Phase 0's job is to land these and **write the final signatures into `execution-progress.md`**.
Downstream streams import these; they do not invent their own.

**(a) Document-provider registry (engine, W8)** — parallels `registerHistoryProvider`:
```
registerDocumentProvider(id, { serialize(): JsonValue, restore(snap: JsonValue): void })
```
SceneIO save writes `{ ...existingPreset, documents: { [id]: snap } }`; load calls each
`restore`. **Favients special:** on load, if a `favients` document is present, prompt
**Replace / Append** before restore (per locked Decision 1).

**(b) Drag + drop-wells kernel (engine, W4)** — generic over payload:
```
registerDropWell({ id, label, accepts(types: string[]): boolean, onDrop(dt: DataTransfer): void, render })
<DragWellsOverlay/>   // shows wells whose accepts(types) is true, only while a drag is in flight
```
Gradient side (palette) registers the export-bin / PNG / fullscreen wells + the gradient payload.
Keep the literal favient MIME for back-compat; add a `kind` discriminator to the payload.

**(c) Send-target registry (engine kernel, gradient targets in palette, W2)** — generalize
`favientTargets`:
```
registerSendTarget({ id, label, group: 'host'|'mode', accepts?(payload): boolean, apply(config: GradientConfig, meta): void })
<SendToMenu payload={…}/>   // shared hero affordance; reads the registry, filters self-targets
```

**(d) Reusable-editor undo contract (engine, W1)** — optional props both hosts implement:
```
onEditStart?(): void;  onEditEnd?(): void;  edit?(mutate: () => void): void
```
app-gmt wires its interaction-session; the Explorer wires its gen-style start/end. Document stores
use `registerHistoryProvider` (existing) for Ctrl+Z.

**(e) Engine gradient core (W1 layering)** — pure, no DOM:
```
sampleStops(stops, pos, blendSpace, colorSpace): RGB   // bias+smooth aware (fixes the drift bug)
stopOps.*  // invert/double/distribute/delete/default/normalizePaste/move/scaleAboutPivot/setBias
renderStopsToRamp(...)  // engine canonical; palette/core/gmtGradient.ts becomes a re-export
```

**(f) Colour core (engine, W10)** — add to `colorUtils.ts`: `rgbToHsb`/`hsbToRgb` (exist as
hsv), harmony generators `analogous/monochromatic/complementary/splitComplementary`. **RGB + HSB
only** (locked). EyeDropper via browser API + fallback.

---

## 5. Gates (every session, before "done")

- `npx tsc --noEmit` → **0 errors** (hard gate; remember `isolatedModules` — type-only re-exports
  need `export type`).
- `npm run test:palette` → **green** (determinism contract; mandatory for any `core/` change).
- **Phase 0 additionally:** confirm app-gmt still type-checks/builds (engine changes are
  cross-app) and the existing suites that touch changed engine files stay green.
- **Quality pass (self-review, before the summary):** each session runs `/code-review` on its own
  diff at the **effort the orchestrator specifies** (low/medium for mechanical, high for
  correctness-critical; the cloud `ultra` is human-triggered only — sessions never invoke it), then
  `/simplify` to apply safe reuse/altitude cleanups. Security-sensitive steps (W7 import parsing,
  W8 SceneIO load/deserialize, W4 dataTransfer handling) **also** run `/security-review`. The
  session reports findings + what it applied in the summary `REVIEW` field. For the highest-risk
  merges (P0c editor, P2 integration) the **orchestrator** additionally spins an *independent*
  review on the returned diff before merge — author self-review has blind spots.
- **User visual verification** — the user does visual testing; no screenshot smokes. Each stream
  ends with a short "what to look at" list for the human.

**Review-effort by step (like build-effort):** low → S1/S4/S6 + mechanical UI; medium → P0b, S5;
high → P0a/P0c, W8, P2; `/security-review` → W7, W8, W4. At a **phase→main merge boundary** the
human may optionally run `/code-review ultra` (cloud) on the whole branch.

---

## 6. Branch / worktree strategy

- Integration branch: `exec/gradient-explorer` (off `main`).
- **Phase 0:** branch `exec/phase-0-foundations` → merge to integration once interfaces frozen +
  gates green + final signatures written to the progress log.
- **Phase 1:** each stream branches off the post-Phase-0 integration branch into **its own git
  worktree** (`exec/s1-picker-search`, …). Use worktrees so parallel streams never share a working
  tree. Merge each back to integration on completion + gates + visual QA.
- **Phase 2:** off integration after Phase-1 merges. **Phase 3** last. Integration → `main` when
  the whole thing is green.
- Throughput is bounded by the human's visual-QA bandwidth, not agent count — **stagger merges**.

---

## 7. Adaptation protocol (how the orchestrator stays flexible)

Coding sessions always surface the unplanned. Sessions report surprises via tagged summary fields;
the orchestrator acts on each:

| Session reports… | Orchestrator does… |
|---|---|
| **INTERFACE-CHANGE-REQUEST** (a frozen §4 signature needs to change) | Ratify or reject. If ratified: update §4 here + the progress log's frozen-interfaces block, and **notify/re-prompt every dependent stream**. Never let a stream silently fork an interface. |
| **SCOPE-CHANGE** (work is bigger / entangled / smaller than scoped) | Re-scope: split the stream, pull a dependency forward, or defer part. Update the progress log workstream table + DAG. |
| **BLOCKER** (needs another stream's output, or a human decision) | Re-sequence (run the blocker first) or surface the decision to the human. Mark the stream `blocked` with the reason. |
| **NEW-FINDING** (a bug/gap not in the plan) | Triage: fold into an existing stream, spawn a micro-stream, or log to the polish-findings backlog. Don't let it derail the current stream silently. |
| **CONFLICT** (two streams touched a shared-shell file) | Serialize: one merges, the other rebases; or assign ownership and have the other *request* the edit. |

**Principles:** (1) the progress log is the single source of truth — update it every cycle;
(2) frozen interfaces only change by ratification, never unilaterally; (3) prefer re-sequencing
over forcing the original order; (4) when reality and this playbook disagree, reality wins and the
playbook gets amended (note the amendment in the progress log changelog).

---

## 8. Prompts

See [prompts.md](prompts.md): the **orchestrator bootstrap** prompt (for a fresh lean orchestrator
session), the **Phase-0 kickoff** prompt, the **per-stream template**, and the **summary-return
format** every session must end with. Every prompt references this playbook + the progress log by
path so each session self-orients.
