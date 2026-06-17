# GMT v1-Readiness — "Forgotten Work" Punch-List

**Discovery + triage only. No fixes applied. No code touched.** This is the approvable
register of *started-but-unfinished*, *reachable-but-dead*, and *orphaned* work — the
rough edges that read as "broken" at v1. It is **not** a code-quality pass (`/simplify`)
and **not** a bug hunt in working code (`/code-review`). Experiential UX polish
(first-run, empty/error/loading states, create→share feel) is a **separate follow-on
`/polish` pass** — noted at the end, not done here.

- **Working tree:** `h:/GMT/workspace-gmt/dev` (committed on branch `fix/undo-queue` — undo work complete; this + the spike-instrumentation archive committed in isolation, no other in-flight changes swept in).
- **Method:** six parallel read-only sweeps (one per category) + `npm run test:gate` + `npm run orphans` (knip) + targeted reachability spot-checks by the orchestrator.
- **Baseline health:** `test:gate` **GREEN** — 103 assertions (machine 37 + wiring 30 + coverage 36). knip: **4 unused files** (see C3-O). ADR-0061 (InteractionSession) is **COMPLETE & merged into `dev`**; the only open arc is the undo-queue workstream (separate session).
- **Verdict legend:** **FINISH** (wire it up) · **HIDE** (gate behind advanced / remove the affordance) · **CUT** (delete) · **DEFER-post-v1**.

> ## OWNER TRIAGE — 2026-05-31
> First-pass dispositions from the owner:
> - **Cat 4 branches** → ✅ approved to CLEAN UP (delete merged branches + worktrees).
> - **Cat 1 reachable-but-dead UI** → ✅ FIX.
> - **Cat 6 testing blind spots** → ⭐ VERY high priority.
> - **2-C New Scene wizard** → ❌ finding was WRONG: it is **complete & working** (File-menu wired). Removed from the list. *Root cause: the sweep trusted `new-scene-spec.md`'s "not implemented" status, which is **stale** — see 2-STALE.*
> - **Undo-queue bugs** (was the top open item) → ✅ **COMPLETE**. Removed from the cut line.
- **Each item:** WHAT · WHERE · USER-HIT (severity) · VERDICT. Severity = HIGH (user hits it in normal flow) / MED (reachable but in a corner or advanced) / LOW.

> **Triage philosophy (owner's framing):** at v1 a half-wired *reachable* feature is worse
> than a missing one. "Cut or hide" is frequently the better polish — v1 doesn't owe every
> started idea a finish.

---

## CATEGORY 1 — REACHABLE-BUT-DEAD UI  *(top priority — users click these)*

| # | WHAT | WHERE | USER-HIT | VERDICT |
|---|------|-------|----------|---------|
| **1-A** | **"GLSL Debugger" menu toggle is dead** — sets `shaderDebuggerOpen=true` but no component reads it; the overlay only mounts `StateDebugger` + `InteractionSessionBadge`. The shader debugger was removed during engine extraction (comment confirms). Advanced user clicks it → nothing. | `engine/features/debug_tools/index.ts:23,28` (decl/menu) · `…/DebugToolsOverlay.tsx:6` (no branch) | MED (advanced menu) | **CUT** — remove the menu item + `shaderDebuggerOpen` state |
| **1-B** | **Share button flashes "N/A" with no explanation** for Workshop / imported formulas (not in the built-in registry). Button is **not disabled**, so users click it repeatedly; `getShareStatus` returns `'na'` → 2.5s "N/A" flash. Title tooltip says "Share unavailable for imported formulas" (only hint). | `engine-gmt/topbar/ShareLinkButton.tsx:29,43,73,86` | MED-HIGH (Workshop is a key path) | **FINISH** — disable the button (or popover "why") when sharing is unsupported |
| **1-C** | **Curve-editor Simplify / Bake / Smooth buttons no-op on click** — real work is drag-only (`onPointerDown`); `onClick={() => {}}`. Tooltips say "(Drag Left/Right)" so it's *by design*, but a button-shaped control giving zero feedback on a plain click reads as broken. | `components/graph/GraphToolbar.tsx:164,171,178` | MED (animation curve editor) | **FINISH** — add a drag-cursor affordance / click feedback (or DEFER if tooltips deemed enough) |
| **1-D** | **Protocol-disabled feature header is still click-active** — when a feature is gated off for the active formula it grays out, but the header keeps `cursor-pointer` and routes to `onToggle(()=>{})`. Click → no response, no "why locked". | `components/CompilableFeatureSection.tsx:328` · `components/FeatureSection.tsx:105` | MED (hit when switching to an incompatible formula, e.g. Interlace + MandelTerrain) | **FINISH** — `pointer-events-none` on the locked header or a "locked because…" tooltip |
| **1-E** | **In-viewport tutorial-hint overlay is fully dead** — `activeHint={null}` hardcoded, `onDismissHint={()=>{}}`, `<HintDisplay>` commented out ("NOT PORTED yet"). No path ever shows a hint. (Distinct from the app-gmt lesson tutorial, which *works* — see 2-G.) | `App.tsx:124-125` · `engine-gmt/navigation/HudOverlay.tsx:289-291` · unused props at `components/ViewportArea.tsx:43-44` | LOW (nothing shows; no broken click) | **CUT** the dead props now; **DEFER** the hint feature itself post-v1 |
| **1-F** | **mesh-export 2-axis drag pad is a blank stub** — `DualAxisPad` in `components/inputs/VectorInput.tsx` renders an empty `<div>` (`// TODO: replace with real DualAxisPad`). **Only imported by the mesh-export tool** (`BoundsPanel`, `FormulaParams`) — the main app uses the real pad in `components/vector-input/`. So a mesh-export user sees a blank area where a drag control should be. | `components/inputs/VectorInput.tsx:18,34,238` ← `mesh-export/components/BoundsPanel.tsx:5`, `…/FormulaParams.tsx:4` | MED (mesh-export is advanced/standalone) | **FINISH** (wire the real pad) **or HIDE** (`showDualAxisPads=false` in mesh-export) |

*Checked & cleared (NOT dead — common false-positive pattern):* context-menu **section headers** with `action: () => {}` + `isHeader: true` are intentional labels, not dead buttons (`AdvancedGradientEditor.tsx:262`, `GraphSidebar.tsx:149,155`, `EmbeddedColorPicker.tsx:137`, `AudioSpectrum.tsx:387`, `vector-input/BaseVectorInput.tsx:384,401,419`). `GlslEditor onChange={()=>{}}` is the required read-only prop (`FormulaWorkshop.tsx:1390`). `CompileDropdownSection onToggle={()=>{}}` is an always-on section (`:91`).

---

## CATEGORY 2 — HALF-WIRED FEATURES  *(~70% there; fall over on 2nd use / edge / missing mode)*

| # | WHAT | WHERE | USER-HIT | VERDICT |
|---|------|-------|----------|---------|
| **2-A** | **Capability Protocol is plan-only past P0/P1** — incompatible formula+feature combos compile **silently** and render wrong, with no disabled affordance. Only **2** of ~22 compilable sections declare `requires` (Local Rotation, Hybrid Box); AO/Reflections/Atmosphere/Volumetric/Materials etc. show as fully enabled on a self-contained SDE (MandelTerrain, JuliaMorph) and some produce broken shaders. Interlace dropdown (P4) is the one shipped compat consumer. | `engine-gmt/panels.ts:106,139` (only 2 `requires`) · `engine-gmt/engine/compat/evaluateCompat.ts` (P0 exists) · `plans/capability-protocol.md` ("Status: Plan, not built") | **HIGH** (silent wrong renders, no signal) | **FINISH P0–P4** (declarations + modular rejection + AutoFeaturePanel graying); **DEFER P5–P8** (V3/V4 emitter caps, mirror collapse, cleanup) |
| **2-B** | **Workshop V4 re-edit silently opens a blank editor** — the pencil/edit button shows for any imported formula, but V4 imports omit `importSource`, so `if (!def?.importSource) return;` makes the Workshop open in fresh/empty state. No error; user thinks their formula vanished. | `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:567-569,423` · edit button gate `…/FormulaSelect.tsx:201-208` | **HIGH** (edit button is shown for V4 formulas) | **FINISH** — hide the edit button when `!importSource`, or show "V4 re-edit not supported" |
| ~~**2-C**~~ | ~~**New Scene wizard is spec-only / partial**~~ — **❌ FINDING WITHDRAWN (owner): the wizard is COMPLETE & working.** File-menu "New Scene…" at `app-gmt/main.tsx:244-246` (`order:-10`, top of File menu) → `openNewScene()`; `<NewSceneModal/>` mounted at `app-gmt/AppGmt.tsx:387`. The "Geometry step missing toggles" sub-claim is unverified against the shipped UI and is moot. | — | — | **N/A — works** |
| **2-STALE** | **Stale plan doc that *caused* the 2-C false alarm** — `plans/new-scene-spec.md` still reads "Status: Spec; not implemented" though the wizard shipped. A plan that lies about shipped state will mislead the next sweep/contributor. (Likely other plans are similarly stale — `capability-protocol.md` "Plan, not built" had P0 code; worth a status-line audit.) | `plans/new-scene-spec.md` (header) | LOW (internal, but causes wrong triage) | **FINISH** — update the status line; quick audit of other plan headers vs reality |
| **2-D** | **Gallery free-tier cap is a dead-end CTA** — slot-cap screen hardcodes "unlock unlimited for $5/mo" but there is **no upgrade button/link and zero Stripe/checkout code** anywhere. Ends on a "Close" button at a conversion moment. | `engine-gmt/gallery/SubmitGalleryModal.tsx:232-248` | MED (free users who hit the cap) | **HIDE/CUT** the $5/mo text → "remove a submission to make room" until billing exists |
| **2-E** | **AudioMod has no tested end-to-end path** (`FEATURE_STATUS.md:44`) and **"record modulation → keyframes" is designed-not-wired** (`:45`). If either affordance is visible it's an untested/non-functional control. | `docs/FEATURE_STATUS.md:44-45` · `engine/features/audioMod/*` | MED (visible feature panel) | **FINISH or HIDE** — verify the live path; hide the record affordance if non-functional |
| **2-F** | **FormulaPicker hover-preview is mouse-only** — `hoveredId` driven by `onMouseEnter/Leave` with no touch fallback, so the preview card never appears on mobile. (NOTE: the *other* `FormulaGallery.tsx` is **dead code** — see 3-D / C3-O — so this item is about the **live** `FormulaPicker`.) | `engine-gmt/components/FormulaPicker/FormulaPicker.tsx:265,322` | MED (mobile browsing) | **DEFER-post-v1** (D3 in mobile plan) — or **FINISH** if mobile is a v1 target |
| **2-G** | **Mesh export is a one-shot standalone tab** — handoff via `localStorage` + `window.open('mesh-export.html')`; reads & clears the key on mount, no live re-sync. Iterating in the main app leaves the mesh tab frozen on the original snapshot. Advanced-gated. | `engine-gmt/topbar.tsx:582-596` · `mesh-export/components/MeshExportApp.tsx:21-23` | LOW (advanced; happy-path works) | **DEFER-post-v1** — correct for a v1 advanced tool |
| **2-H** | **Drawing surface-probe goes stale on camera move** — origin plane polls `engine.lastMeasuredDistance` every 200ms and only re-probes on `refreshTrigger`, not camera move; no "stale" feedback. | `engine-gmt/features/drawing/DrawingPanel.tsx:29-40` · `DrawingOverlay.tsx:510-526` | LOW (drawing usually camera-static) | **DEFER-post-v1** |

*Confirmed DONE (not half-wired):* Compile-progress unification (SHIPPED 2026-05-01), Floating-panel consolidation (2026-05-28), Partial-apply utility, Path-trace reflections (Ph 1–3), Area lights (Ph 1–4), app-gmt lesson Tutorial (4 lessons end-to-end; L3→L4 auto-chain is intentional).

---

## CATEGORY 3 — STALE FLAGS / TODO / FIXME / DEAD CODE

**Marker counts** (`.ts/.tsx/.js/.glsl/.frag`, excl. node_modules/dist): FIXME 35 · TODO 20 · `@deprecated`/DEPRECATED 9 · XXX 1 · HACK 0. **55 of 70 are inside `engine-gmt/features/fragmentarium_import/reference/`** — shipped read-only `.frag` library examples, not live code. **Actionable set ≈ 15 markers / 8 source files.**

**`TODO(dev→prod promotion)` markers: ZERO found** in code (all three spellings). The marker referenced in `CLAUDE.md` does not exist in `dev/` — note it's a *stable*-tree convention; nothing to action here.

| # | WHAT | WHERE | USER-HIT | VERDICT |
|---|------|-------|----------|---------|
| **3-A** | **`LOW_LATENCY_PRESENT` default flipped ON, two comments still say "OFF"** — `WorkerProxy.ts` defaults ON (`?lowlatency=0` opts out, per ADR-0062) but `WorkerProtocol.ts:55` + `renderWorker.ts:108` still say "Default OFF; opt in via `?lowlatency=1`". An auditor checking the export/snapshot revert-criteria gets the wrong default from 2 of 3 files. | `engine-gmt/engine/worker/WorkerProxy.ts:29-37` vs `WorkerProtocol.ts:55`, `renderWorker.ts:108` | MED (correctness-audit risk; no runtime bug) | **FINISH** — fix the two stale comments |
| **3-B** | **`timelineUtils.ts` `UnifiedPos` / `getLightFromSlice` are no-op stubs** — camera-unified-position + lighting-track helpers return `0`. Animation tracks bound to `camera.unified.*` / `lighting.*` silently animate to nothing in engine-core consumers. (Verify GMT installs real resolvers; if GMT bypasses these, lower severity.) | `utils/timelineUtils.ts:16-35` | MED (GUESS — needs confirm whether GMT path hits these) | **FINISH or KEEP** — confirm GMT's resolver path first |
| **3-C** | **`data/nodes/definitions.ts` aliases `Custom`→`Note` "to prevent crash if loaded"** — legacy scenes with `Custom` nodes silently drop their content. | `engine-gmt/data/nodes/definitions.ts:397` | MED (scene-load data integrity) | **DEFER-post-v1** — add a load migration, then remove the alias |
| **3-D** | **Dead file: `FormulaGallery.tsx`** — knip-unused **and** zero importers (grep-confirmed). Superseded by `FormulaPicker`. Pulls in `categories.ts`. | `engine-gmt/components/panels/formula/FormulaGallery.tsx` | LOW (not mounted) | **CUT** |
| **3-E** | **`mesh-export/algorithms/sdf-eval.ts` wholly `@deprecated`, no callers** — CPU Newton projection replaced by GPU path; "no live consumer". | `mesh-export/algorithms/sdf-eval.ts:1-11` | LOW | **CUT** (or move to `legacy/`) once GPU path confirmed |
| **3-F** | **`globalThis.V4_ENABLE_PER_ITER` dead per-iter emitter tree** — disabled by default (net regression vs self-contained); full per-iter code remains behind an undocumented escape hatch. | `engine-gmt/features/fragmentarium_import/v4/emit/index.ts:14-59` | LOW (internal) | **DEFER-post-v1** — cut the dead tree only after the per-iter direction is decided |
| **3-G** | **Stale TODO/comments (cosmetic but misleading):** `engineStore.ts:12` rename-TODO already done; `RenderPipeline.ts:48-51` comment describes a removed MRT architecture; `Tutorial.tsx:46` `as any` cast pending typed setter (q-012). | as listed | LOW | **CUT** (delete stale notes) / **FINISH** (q-012 type) |
| **3-H** | **`fluid-toy JuliaCPicker` LUT hardcoded `undefined`** — `// TODO: thread the dye's gradient LUT`; picker shows grayscale instead of the sim gradient. | `fluid-toy/components/JuliaCPicker.tsx:21-25` | LOW (sibling toy) | **DEFER-post-v1** |
| **3-I** | **V4 import has no uniform-vs-GLSL reconciliation** — `TODO (future)`: misspelled annotations silently yield wrong param panels. | `engine-gmt/features/fragmentarium_import/v4/analyze/index.ts:330` | MED (silent import correctness) | **FINISH** — pre-v1 quality gate for imports |

*Suspicious-flag sweep (clean):* `?deferprobe`, `?advanced`, `process.env`, `__DEV__` — **none present** (reverted experiments left no residue). `import.meta.env.DEV` (9×), `localStorage` reads, `globalThis.__appHandles`, `window.__dopeSheetCanvasDebug`, `DISABLE_SHADOWS` define — all correctly guarded.

---

## CATEGORY 4 — ORPHANED BRANCHES / WORKTREES

`dev` (integration) = `12e12cb`. `main` (prod) ahead of upstream/main by 175. Current = `fix/undo-queue` (in-flight; leave alone).

| Branch | ahead/behind dev | Integrated? | Theme | Last commit | VERDICT |
|--------|------------------|-------------|-------|-------------|---------|
| `feat/interaction-session` | 0 / 1 | **YES** (ancestor of dev; merge `12e12cb` names it) | ADR-0061 InteractionSession | 2026-05-31 | **MERGED** → delete branch |
| `feat/context-loading-protocol` | 0 / 32 | **YES** (ancestor; named in `12e12cb`) | Context-loading protocol | 2026-05-30 | **MERGED** → delete branch |
| `bucket-render-extraction` | 0 / 275 | **YES** (ancestor) | Fluid-toy bucket render ph3+4 | 2026-04-29 | **MERGED** → delete branch + worktree `dev-bucket-render` |
| `feature/bench-per-commit-ms` | 0 / 155 | **YES** (ancestor) | Per-commit median-ms bench column | 2026-05-17 | **MERGED** → delete |
| `feature/canvas-cleanup` | 0 / 137 | **YES** (ancestor) | Timeline cleanup + audio fps-sync | 2026-05-18 | **MERGED** → delete |
| `probe/dopesheet` | 0 / 148 | **YES** (ancestor) | Dopesheet probe (keyframe clone fix) | 2026-05-17 | **MERGED** → delete branch + worktree `dev-probe-dopesheet` |
| `probe/engine-fanout` | 0 / 160 | **YES** (ancestor) | Engine-fanout spike — "does not move the needle" | 2026-05-17 | **DELETE** — spent spike, findings archived + worktree `dev-probe-engine-fanout` |
| `spike/pertrack-sub` | 0 / 162 | **YES** (ancestor) | Per-track-sub spike — "does not move the needle" | 2026-05-17 | **DELETE** — spent spike + worktree `dev-spike-pertrack-sub` |
| `fix/undo-queue` | 1 / 0 | NO (1 unique commit) | LFO/effects/camera + zeroed-slider undo | 2026-05-31 | *in-flight — no verdict* |

**All non-current branches are already ancestors of `dev`** — none carry unmerged work; every verdict is delete (FOLD-IN required for **none**). The 5 worktrees are safe to `git worktree remove` once the branches are deleted.

**Stray untracked artifacts:**
- `plans/shadertoy-shading-port.md` — untracked, zero git history. **FOLD-IN** (commit into `plans/`). *Contents left untouched per instructions.*
- `plans/mesh-export-unification.md` — **not present** in this worktree (exists in `stable/` per the session's git status; N/A for dev).
- `public/.nojekyll` — **not present** in this worktree (N/A for dev).

### Cleanup log — 2026-05-31 (owner approved)
- ✅ **Deleted 5 merged branches:** `bucket-render-extraction`, `feat/context-loading-protocol`, `feat/interaction-session`, `feature/bench-per-commit-ms`, `feature/canvas-cleanup` (all confirmed ancestors of `dev`).
- ✅ **Removed worktree** `dev-bucket-render` (was clean) + deleted its orphaned on-disk directory.
- ✅ **Discarded the 3 spike worktrees** (`dev-probe-dopesheet`, `dev-probe-engine-fanout`, `dev-spike-pertrack-sub`) + their branches, **after archiving the worthwhile uncommitted instrumentation** (owner's call: keep+document worthwhile, discard rest) → `docs/animation-refactor/26_SPIKE_INSTRUMENTATION_ARCHIVE.md`. Preserved: `spike-diff.mts` bench-delta tool, `animStoreNotifyCount` harness axis, the fit-to-view bench seam, the `TrackRowTickStats` tick-cost probe, and an actionable **`App.tsx` naked-full-store-sub** finding (§E — re-renders the whole tree on every per-tick `liveModulations` write; candidate fix, not applied). Findings docs were byte-identical to dev's tracked copies — nothing lost. *(Windows could not delete the worktree dirs via `git worktree remove`; cleaned with `rm -rf` + `git worktree prune`.)*
- ⏸ Stray `plans/shadertoy-shading-port.md` — fold into git (not done; deferred to avoid committing on the active `fix/undo-queue` branch).
- **Final branch state:** `dev`, `fix/undo-queue` (current), `main` only. One worktree (`dev`).

### New finding surfaced during cleanup — then INVESTIGATED & DOWNGRADED
- ~~**3-PERF**~~ — **`App.tsx:34` naked `const state = useEngineStore()`** is a real code smell (full-store sub → App re-renders every frame during playback/active-LFO, since `setLiveModulations` writes the engine store per frame; the AnimationSystem guard only suppresses writes when values are *unchanged*). **BUT investigated 2026-05-31 → NOT a perf win.** The `probe/engine-fanout` bench (2026-05-17, archived in `08_ENGINE_PROBE_FINDINGS.md`) already tested this exact narrowing (Variant C, 12 per-field selectors) and measured **zero impact** — bit-for-bit 480 commits, ±3% ms (noise). The per-frame fanout is **system-wide** (every component independently subs the *animation* store at notify-rate), so narrowing App alone doesn't cut React scheduler passes. The real cost the probe found — `Timeline:Graph` polyline work (~7ms/commit) — was **since fixed** by the canvas GraphEditor refactor (`utils/GraphRenderer.ts` `_polylineCache`, 100% hit-rate; canvas DopeSheet too: 137ms→9ms, wkrFps 8→60). **VERDICT: CUT as a perf item — optional code-hygiene only (low priority), and the probe's sketched narrowing was incomplete (shed reactivity for unlisted fields) so it'd need a proper full-coverage re-derive. Not a v1 item.** *(Lesson: bench-verified audit already answered this — see [[feedback_angle_d3d11_optimizer]].)*

---

## CATEGORY 5 — DEFERRED REGISTER as a v1 Checklist

Consolidated across `plans/*.md` + `docs/FEATURE_STATUS.md` + ADRs. Dedup'd; items already covered above are cross-referenced, not repeated.

### Must-address-before-v1 (FINISH / HIDE)
| ITEM | SOURCE | WHY DEFERRED | USER-HIT | VERDICT |
|------|--------|--------------|----------|---------|
| ~~**Undo-queue bugs**~~ (LFO sliders / effects-at-0 / camera pos-rot not undoable; zeroed roughness quick-undo wrong value) | interaction-session-rollout.md:267-270 | "separate workstream, own session" | — | ✅ **COMPLETE** (owner — landed on `fix/undo-queue`) |
| **Capability Protocol P0–P4** | capability-protocol.md | sequenced foundation; ~2wk | YES-prominent (silent broken renders) | **FINISH** — see 2-A |
| ~~**New Scene wizard**~~ | new-scene-spec.md | — | — | ✅ **DONE** — shipped & wired (see 2-C withdrawal) |
| **Per-feature Reset button** (spec GO, ~4h, infra exists; currently advanced-gated only) | per-feature-reset-feasibility.md · `CompilableFeatureSection.tsx:353` | "broader rollout once UX settled" | YES (no per-section reset for normal users) | **FINISH** (small) or **HIDE** (keep advanced-gated for v1) |
| **AudioMod untested / record-modulation non-functional** | FEATURE_STATUS.md:44-45 | designed-not-wired | YES-corner | **HIDE** if non-functional — see 2-E |
| **Bucket-render scaled-tile bug (#4)** — *deferred acceptance, not deferred build* | app-gmt-touchups.md:254 · CHANGELOG:146 | "couldn't repro after aaLevel rewire; pending retest" | YES-corner (bucket export users) | **FINISH** — needs one explicit retest + sign-off |
| **Mobile: outside-tap menu dismiss (D-) + slider hit-targets/`touch-action` (D1/D2) + FormulaGallery→tap (D3)** | mobile-mode-app-gmt.md:242-246 | iterative phases after foundation | YES (if mobile is a v1 surface) | **FINISH if mobile is v1**, else **DEFER**. (D3 maps to live FormulaPicker — see 2-F.) |
| **Boot pre-warm** for the one-time first-interaction GPU spike (proven 284→83ms) | interaction-session-rollout.md:231 · ADR-0062 | "user declined as fragile / not worth once-per-session cost" | YES-prominent (first gesture on heavy scenes ~300ms) | **DEFER-post-v1** (owner already declined; re-raise if it bugs at launch) |

### Safe-to-defer-post-v1
Sibling-app InteractionSession opt-in (C) · heavy-converged-scene cost (E) · E4 defer-work consumers (API built, wiring opt-in) · middle-drag dolly hitch (G — characterized, not a separate bug) · CP P5–P8 (V3/V4 emitter caps + mirror collapse + shim cleanup) · path-trace follow-ups (Owen-Sobol, env-CDF rebuild, multi-bounce env IS, ReSTIR) · directional/sun-disc area lights · all fluid-toy/fractal-toy feature gaps (not the v1 primary surface) · engine-cleanup deferred refactors (#2,#4–#8 — reviewed & declined → **CUT** from backlog) · floating-panel bespoke items (CenterHUD light popups, submenu clamp, gallery lightbox) · compile-progress phases 4+5 · UI-state undo (F8) · Amoser's 13 presets · V4 per-iter emitter promotion · Kleinian P1 classification (no runtime impact until P1 ships).

---

## CATEGORY 6 — BROKEN-BUT-HIDDEN PATHS + TEST/SMOKE BASELINE

### (A) Reachable-but-hidden surfaces
| # | WHAT | WHERE | USER-HIT | VERDICT |
|---|------|-------|----------|---------|
| **6-A** | **`engine-gmt` is excluded from `tsconfig.json`** → the 3 known `FlowEditor.tsx` tsc errors (and any new ones in that whole tree) are invisible to `npm run typecheck` (exits 0 only because the dir is excluded). FlowEditor **is reachable**: Graph panel shows when formula = Modular. | `tsconfig.json:23` · `engine-gmt/components/panels/flow/FlowEditor.tsx` | MED (CI blind spot; Modular users hit FlowEditor) | **FINISH** — re-include `engine-gmt` (or a 2nd tsconfig) + fix the 3 errors |
| **6-B** | **`?clean` / `?broadcast` hide the entire UI with no escape affordance** — set at store init; a shared link with `?broadcast=1` shows a blank interface; recovery (press B) is undocumented. | `store/slices/uiSlice.ts:190` | MED (shared/embed links) | **FINISH** — first-load toast "Press B to restore UI" |
| **6-C** | **`?gallery=<slug>` silently opens an empty overlay on a bad slug** — slug is parsed pre-mount then wiped from the URL (refresh won't retry); a missing/invalid slug → empty/loading overlay, no error. | `app-gmt/main.tsx:552-561` | MED (bad deep-links) | **FINISH** — error/close fallback when slug resolves to nothing |
| **6-D** | **`debug_tools` + `webcam` overlays are mounted for *all* users** (inert unless advanced toggles them). No visual leak today, but unexpected components in every tree. | `engine/features/debug_tools/index.ts` · `engine/features/webcam/index.ts:33` · `engine-gmt/features/index.ts:93` | LOW | **DEFER-post-v1** — gate registration behind advanced/build flag later |

### (B) URL flags
`?lowlatency=0` — intentional, documented escape hatch (clean). `?deferprobe` — **no residue** (reverted cleanly). (`?clean`/`?broadcast`/`?gallery` covered in 6-B/6-C.)

### (C) Test / smoke suite baseline
| # | WHAT | WHERE | SEV | VERDICT |
|---|------|-------|-----|---------|
| **6-T1** | **`smoke:engine-gmt` + `smoke:orbit` target a non-existent HTML** (`engine-gmt-smoke.html` — vite serves a fallback). They may **"pass" while testing a blank page**. Plan doc confirms the file is absent. | `debug/smoke-engine-gmt.mts:15` · `debug/smoke-orbit.mts:11` | **HIGH** (false green) | **FINISH** — create the harness or retarget to `app-gmt.html` |
| **6-T2** | **`smoke:all` runs only 9 of 35 smoke files** — 26 named smokes (audio, canvas, deep-zoom, fluid, formula-switch, migrations, pause, tsaa, etc.) are never in the aggregate → false confidence. | `package.json:70` | MED | **FINISH** — extend `smoke:all` (or add `smoke:all-server` via `runWithServer`) |
| **6-T3** | **2 smoke files have no `package.json` entry** (orphaned) — `smoke-engine-demo.mts`, `smoke-engine-demo-modulation.mts` (LFO modulation end-to-end) are unrunnable from the task runner. | `debug/smoke-engine-demo*.mts` | MED | **FINISH** (add scripts) or **CUT** (if the demo page is retired) |
| **6-T4** | `process.exit(0)` resume-skip in sweep scripts can mask "0 cases run" as success — but `test:*` aliases pass `--fresh` which bypasses it. No CI impact today. | `debug/native-config-sweep.mts:334` · `native-interlace-sweep.mts:435` | LOW | **DEFER-post-v1** |

**Live baseline (orchestrator-run):** `test:gate` = **103/103 PASS**. knip = **4 unused files**: `debug/helpers/image-diff.mts`, `debug/render-harness.ts`, `engine-gmt/components/panels/formula/FormulaGallery.tsx` (→ 3-D, CUT), `engine-gmt/formulas/categories.ts` *(knip-flagged unused but **is** imported by `pickerCategories.ts`/`formulas/index.ts` — verify the live picker path before cutting; likely a re-export artifact)*. **C3-O:** treat `image-diff.mts` + `render-harness.ts` as render-harness scaffolding — KEEP if the render sweep is still used, else CUT.

> **Note:** server-dependent smokes (31 of 35 use Playwright + a running vite) were **not executed** — another session shares this tree and a running dev server, so a full smoke sweep risks port/state collisions. Only the self-contained `test:gate` was run. Recommend the owner run `smoke:all` (after fixing 6-T1/6-T2) in a clean checkout.

---

## RECOMMENDED v1 CUT LINE

*Owner already cleared two of the original cut-line items: New Scene wizard (works) and the undo-queue bugs (done). Remaining must-fix, with owner emphasis folded in:*

1. **⭐ Cat 6 testing blind spots — 6-A tsconfig excludes `engine-gmt` + 6-T1 smoke false-green** — owner flagged VERY high priority. Restore real CI signal *first*, so every fix below lands against a suite that actually runs. (6-A also re-surfaces the 3 FlowEditor tsc errors to fix; 6-T2/6-T3 extend coverage.)
2. **✅ Cat 1 reachable-but-dead UI (owner: FIX)** — **1-A** GLSL-Debugger dead toggle (CUT) · **1-B** Share "N/A" flash (FINISH/disable) · **1-D** locked-header dead click (FINISH) · **1-C** curve-toolbar click no-op (FINISH/affordance) · **1-F** mesh-export blank DualAxisPad (FINISH/HIDE) · **1-E** dead hint props (CUT).
3. **2-A Capability Protocol P0–P4** — silent broken renders are the worst correctness smell. *(largest; gates formula-picker P4 + the interlace compat dropdown)*
4. **2-B Workshop V4 re-edit blank editor** — hide the edit button for V4 (tiny).
5. **2-E AudioMod / record-modulation** — HIDE if non-functional (don't ship a visible broken feature).
6. **2-D gallery $5/mo dead CTA** — swap copy until billing exists (tiny).
7. **6-B `?broadcast` no-escape** + **6-C `?gallery` bad-slug** — two small link-robustness fixes.
8. **2-STALE** — fix `new-scene-spec.md`'s lying status line + quick-audit other plan headers (this false-positive cost a finding).

**If mobile is a v1 surface:** add D1/D2/D3 + outside-tap dismiss (Cat 5). If not, DEFER the whole mobile-D set.

**Defer pile (post-v1):** boot pre-warm, sibling-app opt-in, CP P5–P8, all path-trace/area-light/fluid-toy/fractal-toy enhancements, engine-cleanup refactors (CUT from backlog), UI-state undo, the LOW-severity dead-code cuts (3-D/3-E/3-F/3-G, 6-D) — batch into a single housekeeping PR whenever convenient.

**Branch hygiene (Cat 4 — owner approved CLEAN):** delete the 8 merged/spent branches + remove the 4–5 worktrees; fold the stray `plans/shadertoy-shading-port.md` into git. Done this session — see the cleanup log below.

**Branch hygiene (Cat 4):** all 8 non-current branches are merged/spent → safe to delete; remove the 5 worktrees; fold `plans/shadertoy-shading-port.md` into git. Zero risk, do anytime.

---

### Next: a separate `/polish` pass
This sweep covered *forgotten/broken* work. It did **not** assess experiential UX —
first-run feel, empty/error/loading states, and the create→share loop. Recommend a
follow-on `/polish` pass once the cut-line items above are triaged.
