# Session prompt — Weave P4.3: native + frag/DEC slot sources in the weaver picker

**Prepared:** 2026-07-04 · **Branch:** `feat/weave-core` (continue; do NOT push — v1 + weave ship together).
**Model/scope:** Opus 4.8 follow-up session per the split in `S-weave-p4-build.md`. **P4.3 ONLY** — the picker/UI
layer. Do NOT start P4.4+ (interlace/Hybrid Box absorption — gated on owner decisions and a separate session), and
do NOT modify the engine emit paths (`assembleWeave`, `nativeResolver`, `emitFusedHybrid`) unless a real bug forces
it — if it does, the byte-identity probe discipline below applies to every such touch.

## Read first (in this order)

1. `plans/mb3d/sessions/S-weave-p4-build.md` — the **Fable delivery/handover note at the top** (P4.0–P4.2 facts) +
   the session-split note.
2. `plans/mb3d/weave-p4-struct-state-design.md` — §6 row P4.3 (the step definition + gate) and §1.3 (why frag/DEC
   imports fit the native resolver for free).
3. `docs/adr/0089-weave-core-unification.md` — the P4.0+P4.1 and P4.2 update blocks.
4. `plans/mb3d/sessions/S-weave-p3b.md` §"Non-negotiable discipline" — probes, gates, commit rules; all apply.

## What P4.0–P4.2 already give you (don't rebuild)

- A native formula becomes a weave slot as a plain addon-slot shell: `{ iterCount, formulaIndex: NATIVE_FORMULA_INDEX
  (−1), name: <registered formula id>, optionCount: 0, optionTypes: [], optionValues: [] }`
  (`engine-gmt/engine/weave/nativeResolver.ts`). The whole editor build path (`buildWeaveScene` → `loadUserWeave` →
  `emitFusedHybrid`) already accepts these — the canary weaves were built exactly this way with zero UI.
- `weaveSource.slots[].kind` already accepts `'native'` (ref = formula id); `WeaveEditorPane`'s `SlotRow.kind` is
  already widened. `weaveSourceFromScene` maps `formulaIndex < 0 → kind 'native'`.
- Slot params surface automatically as the fused def's sliders, labelled `"<Formula>: <param>"`, packed on the shared
  LaneAllocator; overflow falls back to baking everything (same as MB3D slots). DE policy is automatic (P4.2):
  writesDeriv detection → est7 last resort; native lead's preset quality subset applies for generic estimators.
- Engine-side rejects already exist with ledger reasons: `shape:self-contained` (+ legacy `selfContainedSDE`),
  `shape:modular`, unregistered id. The UI layer must mirror them as greying, but the engine is the enforcement.
- GPU canary probe: `npx tsx debug/probe-native-weave.mts` (4 shots, HEADED Chrome = real GPU, dev server :3400).

## The P4.3 work

1. **Native slot source in the Weave Editor picker.** The editor currently picks from the MB3D catalog
   (`slotFromCatalogEntry` / mb3dCatalog). Add registered native formulas as a slot source: picking one appends a
   `SlotRow` with `kind: 'native'`, `ref` = formula id, and the addon-slot shell above. Slot-source staging is
   engine-driven (P3 decision #2) — the picker lists what the engine can weave.
2. **Frag/DEC import slots.** Registered frag/DEC defs resolve through the SAME native resolver (kind stays
   `'native'`, ref = registered id — imports self-limit to global/tracker shapes or self-contained, design doc §1.3).
   Surface them in the picker wherever the unified FormulaPicker already lists them (438-thumbnail catalog —
   `project_picker_catalog_thumbnails`); a formula must be REGISTERED to be weavable — decide with the user whether
   picking an unregistered catalog frag should auto-register (Workshop build path) or be deferred.
3. **Reject-cap greying via `disabledIds`** — reuse `InterlaceSecondaryPicker`'s logic (caps `shape:self-contained`,
   `shape:modular`): greyed with a hover reason, NEVER hidden.
4. **Editor row UX for native rows:** the per-row chevron expansion (expose/bake, MB3D optionTypes-keyed) doesn't
   apply to native rows — v1: native params always auto-expose (bake only on pool overflow, engine-automatic); hide
   or repurpose the expansion for native rows and note it. **Check the lane budget meter's dry-run**: it currently
   dry-runs MB3D `bindOptions` only — native rows consume the same allocator (walk `def.parameters`: scalars ×1,
   vec2 ×2 scalar lanes, vec3 ×1 vec3 unit, vec4 ×4 scalar lanes; undeclared uniforms cost nothing — they bake).
5. **UI copy notes:** a native slot's own `getDist` is not spliced into a weave (interlace-secondary semantics) —
   the Quality panel's estimator dropdown is the escape hatch. Keep it low-key (tooltip/hint, not a warning banner).

**Gate (design doc §6):** a V4-import slot + a native slot woven together renders (GPU, user visual verdict), plus
the standing gates below. Grow the weave suite with the new picker/build-path capability (e.g. a frag-import slot
shell emits through the native resolver; reject-greying set matches the engine rejects).

## Standing gates (every commit)

`npm run typecheck` · `npm run test:mb3d` (24) · `npm run test:mb3d:weave` (156+) · `npm run test:refine` (56) ·
`npm run check:mb3d-decompiler` · `npm run smoke:boot` (needs `npm run dev` on :3400). If ANY emit-path file is
touched: capture `debug/probe-weave-refactor.mts` BEFORE the change and diff byte-identical after, and re-run
`debug/probe-native-weave.mts` (real GPU). Commit per logical step; ADR-0089 gets an update block per landed step;
the user's visual verdict gates UI work.

## Repo gotchas

- **LOCAL-ONLY uncommitted files — do not commit their hunks:** `engine-gmt/components/FormulaPicker/pickerCategories.ts`,
  `engine-gmt/formulas/index.ts`, `engine-gmt/types/common.ts` carry deliberately-uncommitted wiring for git-excluded
  formulas (Julia3DLattes/Kucera/Zorich). If P4.3 must edit these files, path-scope with `git add -p` (or equivalent)
  so the LOCAL-ONLY hunks stay out of the commit.
- Windows: multiline commit messages via bash heredoc (`git commit -F -`), never PowerShell here-strings; `sed -i`
  fails cross-device onto C: (use python).
- The interlace sweep (`debug/native-interlace-sweep.mts --primary=Mandelbulb --fresh --show`) is only required if
  `engine/weave/nativeSlot.ts` is touched.

## Prompt

Read this file in full, then the four docs above. Implement P4.3 (native + frag/DEC slot sources in the Weave
Editor picker with reject-cap greying, per the work list) on `feat/weave-core`. Confirm picker placement/UX with the
user before building the UI; the V4-import + native woven render is the exit gate. Stop after P4.3 with a short
delivery note appended under the delivery note in `S-weave-p4-build.md`. Do not push.
