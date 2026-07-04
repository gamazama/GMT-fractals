# Session prompt — Weave P4.7: consolidate weaving into the Formula panel; dissolve the MB3D modal

**Prepared:** 2026-07-05 · **Branch:** `feat/weave-core` (continue; do NOT push — v1 + weave ship together).
**Model/scope:** Fable 5, high effort — mostly UI consolidation, but with ONE risky engine piece (fast-path
retirement + migration, a second one-way door). Desktop-first (owner call): the section rides the existing panel
system on mobile, no bespoke mobile pass.

**P4.7 was re-scoped by the owner (2026-07-05).** It is NOT "promote the editor to its own panel" (the design
doc §5 checklist is superseded on that point — no new panel, no new z-tier work). It is:

1. **The weave editor becomes a WEAVE section of the Formula panel**, replacing the `Hybrid Box`
   runtime-section and the `edit-weave-affordance` widget (`engine-gmt/panels.ts` — Formula panel items ~55-160).
   The `formula-params` widget stays ON TOP unchanged (params grouped per formula, as today); the Weave section
   below owns STRUCTURE: slot rows (drag-reorder / iter steppers / expansion), loop strip, Sequence|Rhythm,
   budget meter (MB3D pool only), low-profile Enabled, explicit Build. Collapsible; for a single-formula scene it
   collapses to a one-liner with "+ Add formula" — THE discoverable entry into weaving (replaces EditWeaveButton).
2. **Rhythm + enable params render as STANDARD keyframable param rows** (track/keyframe affordances) instead of
   the MiniStep steppers — they are DDFS params on the `weave` feature; the P3b note anticipated exactly this.
3. **Hybrid Box becomes a preset group in the Weave section**: a Presets menu whose entries add a configured
   BoxFold slot (the 9 BoxFold formulas from P4.5's FOLD_LIST) with sensible schedule defaults.
4. **The Hybrid Box FAST PATH retires COMPLETELY (engine + UI)** — see the design-confirm below.
5. **The Import MB3D modal dissolves** (`components/panels/formula/ImportMandelbulb3DModal.tsx`, tabs
   import|weave): scene import (paste text / .m3p file / drop) moves to ONE slim import dialog reachable from
   BOTH the unified FormulaPicker (an "Import…" entry) and the TopBar File menu. The weave tab's job is the new
   panel section; all `initialTab: 'weave'` callers ("⧉ Open current", edit-weave affordances, P4.4's migration
   toast if any) now open/focus the Formula panel with the Weave section expanded. Verify the MB3D formula
   library is fully reachable through the unified FormulaPicker before deleting the modal (P4.3 wired native +
   imported sources; the MB3D catalog predates it — confirm, don't assume).
6. **NewSceneModal bridge**: it still authors legacy-shaped interlace state that the v3 migration converts —
   with the UI consolidated, make it author a weave directly and drop the bridge.

## Design-confirm with the owner IN-SESSION (before building step 4)

**Fast-path migration semantics.** The pre-loop fold transforms z BEFORE iteration 0; a weave intro slot
(counts schedule: fold ×hybridIter as intro, repeatFrom = base) CONSUMES iterations — iteration-based coloring
and bailout shift, so migration is NOT pixel-exact. Two routes; build a side-by-side of a real fast-path scene
under both (or the feasible one) and let the owner pick:
  (a) **Accepted look change** — migrate to the intro-weave preset; owner pre-approved retirement, verdict on
      the side-by-side.
  (b) **SILENT slots** — implement negative-iterCount slots in the weave core (run the slot's transform without
      advancing the escape/coloring iteration — MB3D's own concept, today a ledger reject: "silent slots not
      supported"). Faithful fast-path migration AND unlocks real MB3D scenes that use silent slots (check the
      corpus/bundled ledger for how many). More engine work: the counts plan already marks silent steps (`~slot`
      in `schedule.ts`); the dispatcher/loop contract for "doesn't count" needs a careful definition against
      `i`-driven schedules (a silent step must not consume a phase-fn index the schedule already assigned — the
      plan's order array is the source of truth). If chosen, GPU-cert MB3D probe classification applies.

## Read first

1. This file + `plans/mb3d/sessions/S-weave-p4-build.md` (ALL delivery notes — P4.0–P4.5 + banks).
2. ADR-0089 / 0090 / 0091 (absorption + migration contract — this session EXTENDS the retirement to the fast
   path, which 0091 explicitly left untouched → that needs a new ADR with an update note on 0091, not a rewrite).
3. `docs/policy/shared-ui-coupling-rules.md` + PanelManifest JSDoc (`engine/PanelManifest.ts`) — the section
   lands as a manifest item (widget/collapsible), NOT a hand-written panel fork. ADR-0082 for the slim import
   dialog (a `<Layer>`-based Modal primitive, never a raw z-[N]; `npm run check:zindex`).
4. `plans/mb3d/sessions/S-weave-p3b.md` §"Non-negotiable discipline".

## Facts (verified through P4.5 — don't rediscover)

- `WeaveEditorPane` is host-agnostic: module-scoped draft survives unmount, editor-local undo, no modal coupling.
  Re-hosting = re-mount. Its internals (rows, LoopStrip, picker via `nativeSlotCatalog`, meter dry-run) carry over.
- Formula panel manifest: `panels.ts` Formula items — `formula-params` widget, Julia/Offset, Local Rotation,
  Burning Mode, **Hybrid Box runtime-section (replace)**, **edit-weave-affordance (replace)**, Distance
  Estimator, lfo-list, hints-footer.
- The remaining geometry hybrid state after P4.5 IS the fast path's (interleave state was retired). Its
  compile-time pre-loop emission lives in `features/geometry/index.ts` (~473-484 pre-P4.5 numbering — verify).
- Migration machinery from P4.4/P4.5 (load-time hook, track retargeting, `debug/probe-legacy-migration.mts
  [--migrated]`, `debug/scratch/p44` reference protocol) is the template for the fast-path migration.
- MB3D emit probe: `debug/probe-weave-refactor.mts` — MB3D-only scenes byte-identical is the standing invariant
  (held P4.0 → P4.5). Fast-path work is geometry-side and must not touch it; silent slots (if chosen) are the
  one deliberate exception → probe-classify + GPU-cert.

## Gates

- Standing, every commit: typecheck · `test:mb3d` (24) · `test:mb3d:weave` (243+, grow: section mount, preset
  quick-add, fast-path migration mapping, import-dialog load path, NewSceneModal weave authoring) ·
  `test:refine` (56) · `check:mb3d-decompiler` · `test:weave-sweep` if resolver/emit touched · `smoke:boot` ·
  `check:zindex` (the import dialog) · `npm run orphans` after the modal + fast-path deletions.
- Round-trip: a real old FAST-PATH scene side-by-side (pre-change reference render captured FIRST, p44
  protocol) — owner verdict per the design-confirm above. Disabled/edge cases from p44 re-checked loadable.
- User visual verdict on the consolidated Formula panel (section UX, presets menu, keyframable rhythm rows) and
  the import dialog from both entry points.

## Repo gotchas

- **LOCAL-ONLY uncommitted files — keep their hunks out of commits:** `engine-gmt/components/FormulaPicker/
  pickerCategories.ts`, `engine-gmt/formulas/index.ts`, `engine-gmt/types/common.ts` (git-excluded Julia3D wiring).
  This session WILL work near pickerCategories.ts — use `git add -p` scoping on every commit touching it.
- Windows: bash-heredoc commit messages; `sed -i` fails onto C: (python); headed Chrome for GPU work.
- Don't leave dead `tabConfig`/manifest vestiges (CLAUDE.md anti-pattern 7) — the modal deletion must take its
  registration, lastTab module state, and menu wiring with it.

## Prompt

Read this file in full, then the docs above; verify every anchor. Implement the six re-scoped P4.7 items on
`feat/weave-core`, one commit per coherent step, panel-manifest-first (no `panel-X` escape hatches — extend the
manifest if an item type is missing). Pause for the owner at: (1) the Weave-section first render (layout
verdict), (2) the fast-path migration side-by-side (route (a) vs (b)), (3) the import dialog. Stop after gates
with a delivery note in `S-weave-p4-build.md`; P4.6 (animation transfer) is the only remaining session before
the v1+weave push. Do not push.
