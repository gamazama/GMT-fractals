# Gradient Explorer — Execution Progress (LIVE STATE)

**This is the orchestrator's memory.** Update it every cycle. Where it disagrees with the
[playbook](execution-playbook.md), **this file wins** (it reflects ratified reality). Seeded
2026-06-05 at planning completion; nothing built yet.

Status legend: `not-started` · `in-flight` · `blocked` · `in-review` (gates/visual pending) ·
`merged` · `deferred`.

---

## Current phase: **Phase 0 — in-flight** (chunked P0a→P0e on branch `exec/phase-0-foundations`)

- **P0a** — engine gradient + colour CORE — ✅ DONE (in-review, **uncommitted**; gates green;
  interfaces (e)+(f) FROZEN below).
- **P0b** — colour picker UI (consumes (f)) ← **ISSUED**
- P0c — Stops editor genericize-in-place + undo contract (consumes (e); freezes (d))
- P0d — document-provider registry (freezes (a))
- P0e — drag/drop-wells + send-target kernels (freezes (b)+(c))

Next action: await P0b summary → issue P0c.

**Carry-forward for P0c:** the editor's buggy `getInterpolatedColor`
(`components/AdvancedGradientEditor.tsx:51-69`) is **STILL LIVE** — the engine `sampleStops` fix
exists but the editor isn't bound to it yet (P0c binds it + replaces the inline lambdas with
`stopOps`; re-key `double`'s `-dup` ids on adoption). **`stopOps.setBias(stops, index, …)` takes an
array index into a POSITION-SORTED array — pass the sorted array, not store order** (noted in stopOps.ts).
**Orphan caution:** `utils/stopOps.ts` + `sampleStops` are intentionally unconsumed until P0b/P0c
— `npm run orphans` will flag them; **DO NOT delete** (frozen-ahead interfaces).
**Recommend:** commit P0a on `exec/phase-0-foundations` as a checkpoint before P0b.

**Orchestrator decisions on W10 leftovers (build-time, overridable):** Palette row = a **fixed
engine default swatch set** (keeps the engine picker host-agnostic — it can't depend on
palette/Favients; a host may pass an optional palette prop later). Recents = **shared** localStorage
(`gmt.colorpicker.recents`), capped ~16.

---

## Workstream status

| ID | Workstream | Phase | Status | Branch / worktree | Notes |
|----|------------|-------|--------|-------------------|-------|
| P0 | Engine foundations (W8 doc-registry, W10 picker, W4 kernel, W1-engine, undo contract, gmtGradient collapse) | 0 | **in-flight (P0a✅ → P0b)** | `exec/phase-0-foundations` | P0a done (e+f frozen); P0b issued; freeze §4 before Phase 1 |
| S1 | W6 Picker text search | 1 | not-started | `exec/s1-picker-search` | depends: P0 |
| S2 | W5 Favients undo/list/search | 1 | not-started | `exec/s2-favients` | depends: P0 (doc+history provider); shared: registerPaletteUI.ts |
| S3 | W3 ghost curves + Generator coherence | 1 | not-started | `exec/s3-generator` | depends: P0 |
| S4 | W7 Import | 1 | not-started | `exec/s4-import` | depends: P0 (registerCustomRamp seam) |
| S5 | W1 Stops *mode* | 1 | not-started | `exec/s5-stops-mode` | depends: P0 (engine Stops editor + sampleStops); shared: registerPaletteUI.ts, GradientExplorerApp.tsx, setup.ts |
| S6 | W11 Fullscreen configs | 1 | not-started | `exec/s6-fullscreen` | depends: P0 (W4 wells kernel); shared: GradientExplorerApp.tsx |
| P2 | W2 portability integration + W9 snapshot | 2 | not-started | `exec/p2-portability` | depends: ALL Phase 1; touches every hero |
| P3 | `/polish` pass | 3 | deferred | — | after structure lands |

---

## Frozen interfaces (FINAL signatures land here once Phase 0 ratifies)

> Until Phase 0 writes the final signatures here, the **proposed** ones in playbook §4 stand.
> Downstream streams must read THIS block, not the playbook, once it is populated.

- (a) Document-provider registry — _pending (P0d)_
- (b) Drag + drop-wells kernel — _pending (P0e)_
- (c) Send-target registry — _pending (P0e)_
- (d) Reusable-editor undo contract — _pending (P0c)_
- (e) **Engine gradient core — FROZEN (P0a).** Lives in `utils/colorUtils.ts` (pure, no DOM/THREE);
  `palette/core/gmtGradient.ts` re-exports it. `palette/core` RGB ≡ structural `{r,g,b}`.
    - `sampleStops(stops, pos, blendSpace?='oklab', colorSpace?='srgb'): RGB` — canonical per-texel
      sampler, bias+step/smooth/cubic aware; shares private `sampleSorted` with `renderStopsToRamp`
      → byte-identical by construction.
    - `renderStopsToRamp(stops, blendSpace?='oklab', colorSpace?='srgb'): RGB[256]`
    - `renderStopsToBuffer(stops, blendSpace?='oklab', colorSpace?='srgb'): Uint8Array` (RGBA 256×1)
    - `generateGradientTextureBuffer(input)` — signature unchanged; now delegates.
    - `utils/stopOps.ts` (pure; selection by stop id, setBias by index): `stopOps.{ invert, double,
      distribute(ids), delete(ids), default(), normalizePaste(raw), move(ids,dt,snap?),
      scaleAboutPivot(ids,dt,side:'left'|'right'), setBias(index,dt,snap?) }` — also exported
      individually (`deleteStops`/`defaultStops` aliases). `double` mints **collision-safe** dup
      ids (`"<id>-dup"`, falling back to `-dup2…` if taken). `setBias(stops, index, …)` — `index`
      is into a **position-sorted** array (callers must pass sorted, not store order).
      `normalizePaste` tolerates no-`#` and 3-digit hex. `sampleStops` clamps `pos` on empty stops.
- (f) **Colour core — FROZEN (P0a)**, in `utils/colorUtils.ts` (pure; RGB+HSB only, no HSL).
    - `rgbToHsb===rgbToHsv` → `{h:0-360,s:0-100,v:0-100}`; `hsbToRgb===hsvToRgb` (h,s,b)→`{r,g,b}` 0-255.
    - `rotateHue(hex,deg): string` · `analogous(base,n=5,stepDeg=30): string[]` ·
      `monochromatic(base,n=5): string[]` · `complementary(base): string[]` ·
      `splitComplementary(base): string[]`. Harmonies: hex-in → hex[]-out.

---

## Locked product decisions (carry into every session)

From the [amendment plan](../gradient-explorer-amendments-plan.md) "Locked decisions" block:
1. Doc set = generator+image+stops+favients; favients **Replace/Append prompt** on load.
2. **Full** portability unification (one model, one target list, one canonical hero, per-swatch shelf).
3. detail/smooth = **non-destructive, ghost-previewed, bake-to-commit**.
4. Picker: remove standalone no-op pick (app-gmt pick = **out of scope, parked**).
5. Timeline = **keying/compare** tool; export snapshots current frame + cue.
6. Favourite = **saved-item id + Update-vs-Save-as-new**.
7. Engine-core: W8 + W10 + W1-engine (genericize in place) + **W4 kernel**.
8. W10 colour model = **RGB + HSB**. W11 configs **exportable** + randomized **re-roll + amount slider**.

**Out of scope (parked → post-execution research):** app-gmt host changes — its pick semantics
(bracketed apply + reveal target), DnD into app-gmt coloring layers.

---

## Backlog / deferred debt

- **oklab/blend math duplicated across `utils/colorUtils.ts` and `palette/core/oklab.ts`** (P0a).
  The byte-exact stopfit regression went tautological after the gmtGradient collapse; now guarded by
  an explicit drift-pin (`test-palette-stopops §4`: `colorUtils.lerpOklab === palette/core/oklab.lerpOklab`,
  448 samples). Full de-dup needs a cross-layer move (engine `utils/` ↔ `palette/core/`) — out of P0a
  scope. Candidate: a `/simplify` micro-stream or fold into P3. Guarded, not silent.

## Changelog / decisions made during execution

_(Orchestrator appends every cycle: ratified interface changes, re-scopes, blockers resolved,
merges, plan amendments. Newest first.)_

- 2026-06-05 — **P0a quality pass DONE** (`/code-review high` + `/simplify`, gates re-green):
  hardening — `double` now collision-safe; `normalizePaste` tolerates no-`#`/3-digit hex; `sampleStops`
  clamps `pos` on empty stops; harmony docstrings fixed. Simplify — `wrapHue` dedup (−2 copies),
  `analogous` hoists base parse, `distribute` uses a Set. Drift-pin added (tautological regression →
  explicit `lerpOklab` equivalence). No interface signatures moved; (e) footnotes updated above. Debt
  logged (oklab/blend cross-layer dup). **P0a ready to commit.**
- 2026-06-05 — Added a **self-review quality pass** to the gates (playbook §5) + prompt template +
  summary `REVIEW` field: each session runs `/code-review` (effort by step) + `/simplify`, plus
  `/security-review` for W7/W8/W4; orchestrator runs an independent review on P0c/P2 diffs pre-merge;
  human may `/code-review ultra` at phase→main boundaries. P0b amended to include it.
- 2026-06-05 — **P0a DONE** (in-review, uncommitted): `sampleStops` (bias+smooth, byte-exact w/
  `renderStopsToRamp` via shared `sampleSorted` — fixes the editor drift at the root), `utils/stopOps.ts`,
  `gmtGradient.ts` collapsed to a re-export, `rgbToHsb`/`hsbToRgb`+harmonies in colorUtils, THREE import
  removed (keeps core DOM-free). Gates green (monorepo tsc 0, test:palette + new stopops). Interfaces
  (e)+(f) frozen above. No UI/shared-shell touched. **P0b issued.** Orchestrator resolved W10 leftovers
  (fixed-default Palette row; shared capped Recents). Editor bug still live → P0c.
- 2026-06-05 — P0a issued (engine gradient+colour core). Phase 0 chunked into P0a→P0e on one
  branch for context + incremental interface freeze.
- 2026-06-05 — kit created; planning complete; Phase 0 not yet started.
