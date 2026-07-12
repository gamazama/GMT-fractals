# Session prompt — Weave P3b: Rhythm schedule + per-slot param customization

**Prepared:** 2026-07-04 · **Branch:** `feat/weave-core` (continue on it; do NOT push — v1 + weave ship together).
**State:** P0–P3a complete + user-verified. Read `plans/mb3d/sessions/S-nformula-weave-unification.md` (amendments +
P3 design decisions) and `docs/adr/0089-weave-core-unification.md` first; they are the design authority. The Weave
Editor lives at `engine-gmt/components/WeaveEditor/` (a tab in `ImportMandelbulb3DModal.tsx`); its build path is
`slotFromCatalogEntry` (mb3dCatalog) → `buildWeaveScene`/`loadUserWeave` (loadMB3DScene) → `emitFusedHybrid`.

## Non-negotiable discipline (how P0–P3a stayed safe)

- **Byte-identical probes before behavior changes.** `debug/probe-weave-refactor.mts <out>` dumps the full emit
  result for all 38 bundled scenes. Capture a baseline BEFORE touching `emitFusedHybrid`, diff after: any change
  with the new options ABSENT must be byte-for-byte identical.
- **Gates for every commit:** `npm run typecheck` · `npm run test:mb3d` (24) · `npm run test:mb3d:weave` (81) ·
  `npm run test:refine` (56) · `npm run check:mb3d-decompiler` · smoke:boot (needs `npm run dev` on :3400).
  GPU cert for weave/emit/DE changes: `npx vite --port 5173 --strictPort` then `npx tsx debug/cert-render.mts`
  (real GPU; output H:/GMT/refSoftware/MB3D/cert/gmt). Interlace sweep for native-slot changes:
  `npx tsx debug/native-interlace-sweep.mts --primary=Mandelbulb --fresh --show` (resumes from jsonl — always `--fresh`).
- Commit per logical step; the user's visual verdict gates UI work.

## Task 1 — Rhythm (modulo) schedule mode

User decision: schedule kinds are a USER CHOICE (counts "Sequence" = default; modulo "Rhythm" = live + keyframable,
costs perf → opt-in). The editor already renders the greyed "Rhythm" chip. Design (confirmed):

1. **DDFS feature `weave`** (new, `engine-gmt/features/weave.ts`, register in `features/index.ts` — registry freezes
   at store construction, so static registration): runtime params only (no compile gates), all keyframable by DDFS
   construction: `weaveInterval` (default 2, min 1, max 32, `uniform: 'uWeaveInterval'`), `weaveStartIter`
   (0–64, `uWeaveStartIter`). Panel exposure comes with P4's panel promotion — for now the editor hosts the controls.
2. **`emitFusedHybrid(scene, opts?)`**: new optional `opts.schedule: { kind: 'modulo' }`. When set AND exactly 2
   active slots: replace the counts LUT with
   `emitModuloScheduleGLSL({ interval: 'uWeaveInterval', startIter: 'uWeaveStartIter' }, id)` — phase 0 = slot A,
   phase 1 = slot B; `assembleWeave` consumes any `{glsl, fnName}` schedule unchanged. Modulo with ≠2 active slots →
   ledger reason. **Opts absent = byte-identical (probe it).**
3. **Editor**: Rhythm chip enabled when exactly 2 rows have iterCount > 0; selecting it shows interval/start number
   inputs writing the weave feature state (`store.setWeave({...})` auto-setters) and hides per-slot counts’ meaning
   (counts don't drive modulo — grey the steppers or annotate). LoopStrip: render a modulo plan by mirroring the
   phase fn in JS (pure) over `totalIterations`; keep slot-identity colors + faded repeats.
4. **Persistence**: `weaveSource.schedule = { kind: 'modulo', interval, startIter }` (type already in
   `types/fractal.ts`); on hydrate, seed the feature state. Rebuilds while in Rhythm mode keep camera/look as now.
5. Note in UI copy that Rhythm skips the rebuild for schedule edits (that's its point) but formula changes still rebuild.

Gates: probe byte-identity (counts path), new weave-suite tests (modulo emit: 2-slot def contains `uWeaveInterval`,
≠2 slots → reason), typecheck, boot, user visual.

## Task 2 — Per-slot param customization + budget meter (CONFIRM DESIGN WITH USER FIRST)

User decision: the slider-slot UI generalizes the Formula Workshop's table — that's `engine-gmt/components/ParamMapper/`
(P0 extraction; `ParamTable` takes `mappings` + `foreignMappings` for cross-slot occupancy greying).

MB3D slots' options are auto-packed today (`constPacker.bindOptions` → `ScalarParamPacker` + shared `LaneAllocator`).
Customization = per-option **expose (auto lane) / bake (fixed)** directives feeding the packer; manual lane choice is
a stretch goal (needs a directive → allocator seam). Propose to the user FIRST: a per-slot expansion in the editor
showing option name · current value · expose/bake toggle (+ lane read-out), reusing ParamMapper visuals where they fit.
Budget meter: `LaneAllocator` already exposes `scalarsUsed`/`vec3sUsed` getters — thread them into the emit
ledger/result and render "N/24 lanes · M/6 vec3 units; overflow bakes".

## Gotchas (hard-won this initiative)

- `registry.register(def)` replaces same-id defs cleanly (Workshop preview pattern); `emitFusedHybrid` increments
  its `MB3DHybridN` seq per successful emit — fine, ids are per-session.
- `loadUserWeave` PRESERVES camera/lights/atmosphere/materials/coloring and applies coreMath/geometry/quality —
  don't regress this merge.
- Editor draft is module-scoped (survives modal close); undo is editor-local by design (user decision #6).
- `weaveSource` rides GMF automatically (generateGMF meta spread / parseGMF metadata spread) — no format edits.
- Windows: `sed -i` fails cross-device onto C: paths (use python); multiline commit messages via bash heredoc.
- The interlace sweep and cert-render need `--show`/headed Chrome for the real GPU — never headless SwiftShader.
