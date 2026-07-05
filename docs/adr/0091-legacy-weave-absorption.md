# ADR-0091: Legacy weave absorption — interlace + Hybrid Box interleave retire onto the weave core, with a one-way load migration

**Date:** 2026-07-04 · **Status:** Accepted · **Branch:** `feat/weave-core`

> **Update 2026-07-05 (P4.7 item 4c — fast-path engine retired; decision unchanged):**
> The geometry-side Hybrid Box FAST path this ADR migrates *from* is now
> physically DELETED from `features/geometry/index.ts` (commit b529329): the
> pre-loop `uHybrid*` fold injection, the `formula_Hybrid` / `initHybridTransform`
> emitters, `buildHybridFunctions` / `buildPermuteGLSL` / `buildFoldExtraParams`,
> and every `hybrid*` geometry param + the Hybrid Box `panelConfig`. It was
> already migration-shadowed — every load runs the migration below, which clears
> `hybridCompiled`, so the pre-loop inject rendered nothing on any normal load
> path. What STAYS: this migration's legacy READER (`weaveMigration.ts` still
> consumes on-disk `hybrid*` / `hybridComplex` state), the `BoxFold` formulas +
> `FOLD_LIST`, and the per-slot bank mapping. The one-shot per-iteration inject
> splice that used to carry the fold (`ShaderBuilder.addHybridFold(init, preLoop,
> inLoop)`) was renamed `addPerIterInject(code)` — geometry burning-mode and
> coloring geometric-trap are its only remaining users; splice position/content
> are unchanged so emitted GLSL is byte-identical (MB3D corpus 38/38). The
> absorption decision is unchanged: legacy folds are BoxFold weave slots.

> **Update 2026-07-06 (P4.7 item 6 — the last legacy AUTHORING bridge dropped; decision unchanged):**
> The New Scene wizard (`components/NewSceneModal.tsx`) no longer AUTHORS the
> legacy `features.interlace` / `geometry.hybrid*` shape for the migration to
> convert. Its Hybrid Box fold and interleave secondary now build a native weave
> def DIRECTLY (commit f8bcfe1) via the new `buildWeaveDef` export (the build+
> register half of `loadUserWeave`): a fold ⇒ a COUNTS weave (fold intro + loop),
> interleave-only ⇒ a MODULO weave (base + one rhythm layer). The migration's
> legacy READER stays exactly as specified below — it is still the load path for
> on-disk legacy files. ONE exception keeps the bridge: a gallery SCENE base with
> an added fold/secondary still authors the legacy shape (a fresh weave would drop
> the scene's own params), so the migration converts that rare combo. Absorption
> decision unchanged; only the composer's output shape moved forward.

## Context

ADR-0089 unified GMT's three formula-scheduling systems onto one engine weave
core, but kept the two legacy front-ends alive: the interlace feature
(`features/interlace/*`, its own `uInterlace*` uniform set and panel section)
and geometry's Hybrid Box INTERLEAVED mode (`hybridComplex` — a per-iteration
modulo weave inside geometry's inject). Their persisted state
(`features.interlace`, `hybrid*` fields) was untouched: "the conversion lands
when the weaver absorbs those UIs (P4)". With per-slot BANKS landed (ADR-0090)
and native dispatcher slots proven (P4.0–P4.3), the absorption became one
migration instead of two. The three owner Appendix decisions were confirmed
before build: (1) one whole-weave `weaveEnabled` gate (live, keyframable,
default ON, low-profile UI); (2) legacy state migrates into weave-native form
at LOAD and is CLEARED post-migration; (3) prefixed globals stay the state
channel.

## Decision

**1. One-way load migration** (`engine-gmt/utils/weaveMigration.ts`), hooked
as app-gmt preset migration v3 (`@engine/migrations`, applied inside
`loadPreset` BEFORE any feature setter — every load path funnels through:
GMF text, PNG scenes, plain JSON, share URLs, gallery, bundled library
scenes; mesh-export hooks the same function in its own GMF loader). A legacy
scene becomes a registered native weave on a LAYERED modulo schedule:

| Legacy | Weave-native |
|---|---|
| host formula + its `coreMath.*` values | slot 0 (base); values → bank 0 (`weave.ws0*`) |
| Hybrid Box interleave (`hybridComplex`) | layer slot = the matching **BoxFold formula**; `hybridSkip → interval`, `hybridSwap → startIter (0/1)`, `hybridIter → beats` (cap; `< 1` = fold never ran → inactive), fold params → its bank |
| `interlaceFormula` + `interlaceParam*` | next layer slot; values → its bank |
| `interlaceInterval`/`StartIter` | that layer's `weave.weaveInterval<k>`/`weaveStartIter<k>` |
| `interlaceEnabled` / `hybridMode` | `weave.weaveEnabled` (the P4.4 master gate) |
| keyframed tracks / LFO targets | pure id renames (`coreMath.<id>` → `weave.ws0<Id>`, `interlace.*`/`geometry.hybrid*` → the weave keys, vec-axis variants included) |
| `interlaceCompiled` | dropped (the weave IS the compile state) |

Combined scenes keep legacy precedence (geometry injected before interlace →
fold layer first). Disagreeing enables migrate only the ENABLED system (one
whole-weave gate; per-slot mute is backlog). Non-representable scenes
(unregistered defs, self-contained/modular host, emit failure) load untouched
with a warning. Files on disk stay untouched until re-save — the accepted
one-way door: post-migration saves need current builds. Migration is
idempotent; a migrated scene re-saves and round-trips through the NEW format
(`weaveSource` + `weave` feature state).

**2. Lead-slot getDist splice.** 18 native formulas carry a custom
`shader.getDist`; the accumulator-based ones (KleinianMobius/KleinianJos
`ks_*`/`kj_*`, Apollonian `apo_*`, Julia3D `kk_minSurf`, PseudoKleinianAdv
`jkk_*`) are inexpressible on generic estimators, and an interlace HOST
rendered through its getDist. The resolver now rewrites the LEAD slot's
getDist body (same rename set as loopInit: prefixed globals + helpers + the
slot's bank/literal uniform map) onto the fused def; `core_math` applies it
exactly like a standalone formula's (estimator < 4.5). Secondaries stay
unspliced (interlace-host semantics; estimator dropdown remains the escape
hatch).

**3. Capability union.** The fused def unions `estimator:cutting-plane` (+
`shader.supportsCuttingPlane`) from its native slots: cp_* accumulators are
engine-owned UNPREFIXED globals (shared across slots on purpose), so any
CP-capable slot needs core_math's CP_PREAMBLE. Under interlace this was the
`pairHasCapability(primary, secondary)` check; the pair checks across
core_math / estimators / CompilableFeatureSection collapse to formula-only.

**4. BoxFold formulas** (`formulas/boxFolds.ts`, owner call): geometry's fold
step as nine registered defs, one per fold type, GENERATED from `FOLD_LIST`
(fold GLSL stays single-sourced) in the `formula_Hybrid` step shape. Params
mirror `hybrid*` on the generic slots. Registered from `registerFeatures()`.
Gives the weave picker fold slots for free; the migration targets them. The
legacy `hybridPermute` c-swizzle is not carried (warned). Owner note for the
consolidated weave UI: Hybrid Box could later surface as a PRESET GROUP over
these defs.

**5. Retirement.** `features/interlace/*` deleted (feature, rewriter binding,
the whole `uInterlace*` uniform set, panel section, `InterlaceSecondaryPicker`,
AutoFeaturePanel special-case); geometry's interleaved emission + params
(`hybridComplex`/`hybridSkip`/`hybridSwap`, `uHybridSkip`) and the
HybridAdvancedLock UI deleted — the pre-loop FAST path stays (not a weave).
The Formula panel gets an "Edit weave…" affordance (EditWeaveButton → the
Weave Editor tab). Mesh export was VERIFIED on fused weave defs before its
parallel interlace path was deleted (all six mesh shader variants compile;
`SDFShaderBuilder` embeds the self-contained def + scans it for `uWs*`/
`uWeave*` declarations; the weave feature declares them for the ShaderFactory
mesh library via a Mesh-variant inject; gpu-pipeline uploads one weave bag).
The N×N compile-safety sweep repointed: `debug/native-weave-sweep.mts` builds
2-slot native weaves per pair (`npm run test:weave-sweep`). NewSceneModal's
composer still authors legacy-shaped interlace state on purpose — the v3
migration converts it before any setter runs (one bridge, one path).

## Consequences

- **Round-trip gate (real GPU, ANGLE/D3D11): every migrated legacy scene
  rendered PIXEL-IDENTICAL to its pre-migration reference** — 0/691200
  differing subpixels each: interlace on a generic host, on two
  custom-getDist hosts (KleinianMobius, Apollonian — the splice is exact),
  disabled-but-configured (renders base-only via `weaveEnabled: false`),
  Hybrid Box interleaved, and the fast-path control. References + scene
  files under `debug/scratch/p44/`; probe:
  `debug/probe-legacy-migration.mts [--migrated]`.
- MB3D imports stay byte-identical throughout (38-scene emit probe) — no
  native slots ⇒ no gate, no splice, no capability change.
- Old scenes with animations keep animating: track retargeting is a pure
  routing-string rename; no keyframe values change.
- One-way door: a legacy scene saved from a current build persists
  weave-native state and won't degrade back on old builds (owner-accepted).
- `emitModuloScheduleGLSL` (the binary phase emitter) has no production
  consumer left — kept as weave-core API (WeaveSpec's plain `modulo` kind +
  suite coverage), documented here rather than deleted.

## Related

ADR-0089 (weave core; P4.4/P4.5 update blocks) · ADR-0090 (banks — absorption
lands on banks, one migration) · ADR-0087 (GPU-cert discipline) ·
`plans/mb3d/weave-p4-struct-state-design.md` §3 ·
`plans/mb3d/sessions/S-weave-p4-45-absorption.md` (session prompt + confirmed
owner decisions)
