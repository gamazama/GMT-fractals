# Weave P4 — struct-state framework + legacy absorption design

**Prepared:** 2026-07-04 · **Branch:** `feat/weave-core` · **Status:** research deliverable (design, not build).
**Authority:** `docs/adr/0089-weave-core-unification.md` + `plans/mb3d/sessions/S-nformula-weave-unification.md`
(read both first). Every load-bearing claim cites `file:line` in `h:/GMT/workspace-gmt/stable`. Paths written
`engine/weave/*` in the session prompt actually live at **`engine-gmt/engine/weave/*`**.

---

## 0. TL;DR — the headline finding revises the P4 scope

The P4 blocker was framed as *"native formulas need a per-iteration struct-state framework before they can be
dispatcher-function weave slots like MB3D slots"* (`engine-gmt/engine/weave/nativeSlot.ts:24-28`). **The state
inventory (§1) shows that framing is mostly unnecessary.** A dispatcher function is a *separate GLSL function*, so the
only state that genuinely can't cross into it is state held in **map()-scope locals**. Across all 43 native formulas,
that population is **two formulas** (Phoenix, Bristorbrot) — and both already mirror their locals into `preambleVars`
globals *and* pass them as explicit args. **Everything else's cross-iteration state already lives in GLOBALS**
(`preambleVars` mutable globals + shared `gmt_rot*`), which cross a function boundary with no threading at all.

So the recommendation (§2) is **not** a new struct type or a typed-inout-scratch generalization. It is: make native
slots dispatcher functions whose per-slot state channel is the **namespace-prefixed globals the interlace rewriter
already produces** (`nativeSlot.ts:145-405`), keep MB3D's shared `inout float` scratch for its shared-orbit
accumulators, and host both slot kinds in the one `assembleWeave` dispatcher. This is a modest extension of existing
machinery, not a framework. Struct-state (option b) is retained only as a documented fallback if global-count
pressure ever bites (it does not at N ≤ ~6 slots).

---

## 1. State inventory — per-iteration loop-carried state, all registered formulas

**Assembly model (why "map()-scope local" is the real boundary).** `core_math.ts` sets `loopBody =
def.shader.loopBody` / `loopInit = def.shader.loopInit` (`engine-gmt/features/core_math.ts:176-201`), passed to
`builder.setFormula(loopBody, loopInit, …)` (`engine-gmt/engine/ShaderBuilder.ts:232-236`). `DE_MASTER` emits
`${loopInit}` at map()/mapDist() **function scope, before the loop** (`engine-gmt/shaders/chunks/de.ts:125,179,334`)
and the `formula_X(...)` call *inside* the loop (`de.ts:135,144`). Therefore:
- a local declared in `loopInit` and read by `loopBody` = a per-pixel local, visible across iterations **but only
  within map()** — it cannot reach a separate dispatcher function unless passed as a param;
- a `preambleVars` entry = a file-scope mutable global — reachable from any function;
- shared-rotation `gmt_rotAxis/rotCos/rotSin` = file-scope globals, precalc-once in loopInit
  (`engine-gmt/shaders/chunks/transforms.ts:9-27`).

**State categories** (from `nativeSlot.ts:1-28`): **(A)** loopInit locals read by loopBody; **(B)** mutable preamble
globals, split into **B-precalc** (set once in loopInit, read-only per iter) and **B-accum** (written every iter);
**(C)** shared rotation (`usesSharedRotation`); **(D)** extra trailing loopBody args beyond `(z,dr,trap,c)`.

### 1.1 Ratio (43 distinct native defs; 5 aliases share object identity — `formulas/index.ts:118-122`)

| Class | Count | Formulas |
|---|---|---|
| **Stateless** (incl. 2 self-contained own-loop) | **18–20** (~42%) | Mandelbulb, Mandelorus, MandelMap, Borromean, Appell, AmazingBox, AmazingSurface, MengerSponge, Kleinian, AmazingSurf, Quaternion, PseudoKleinian, BoxBulb, Tetrabrot, MandelBolic, Julia3DLattes, Julia3DKucera, Julia3DZorich; self-contained: MandelTerrain, JuliaMorph |
| **(C) shared-rotation only** (precalc-once globals) | **12** | MixPinski, SierpinskiTetrahedron, Mandelbar3D, Dodecahedron, Octahedron, Icosahedron, Cuboctahedron, TruncatedIcosahedron, RhombicDodecahedron, RhombicTriacontahedron, Buffalo, MakinBrot |
| **(B-precalc)** globals set once, read each iter | **7** | MarbleMarcher (6×float), KaliBox (**mat3**+bool), Claude (+C, 5×vec3), Coxeter (+C, 3×vec3), GreatStellatedDodecahedron (+C), Apollonian (5×float), Bristorbrot (+A+D, 2×**mat2**) |
| **(B-accum)** genuinely per-iteration mutated globals | **7** | SineJulia3D, Julia3D (+C), KleinianMobius (6×float), KleinianJos (6×float), PseudoKleinian06, PseudoKleinianMod4, Phoenix (+A+D) |
| **(A) loopInit locals crossing iterations** | **2** | Phoenix (`z_prev/z_prev2` vec4, `dr_prev/dr_prev2` float), Bristorbrot (`rotX/rotZ` mat2) — **both also in `preambleVars` and passed as (D) args** |
| **(D) extra trailing args** | **3** | Phoenix (2×vec4 + 2×float inout, `Phoenix.ts:25,114`), Bristorbrot (2×mat2 by-value, `Bristorbrot.ts:14,53`), Modular (`distOverride` inout float + `i` int, `core_math.ts:167-174`) |
| **Special** (compile-time-generated state) | **1** | Modular — `compileGraph` emits state + `uModularParams[]`; not statically enumerable |

*(Representative citations: Phoenix `Phoenix.ts:114-121`; Bristorbrot `Bristorbrot.ts:44-54`; KaliBox `KaliBox.ts:16-17,65-67`;
KleinianMobius `KleinianMobius.ts:42,106,123,129-130`; Coxeter `Coxeter.ts:24-26,38,76-78`; Claude `Claude.ts:29-36,109-112`;
Apollonian `Apollonian.ts:16-22,88`; shared-rot precalc idiom e.g. `Dodecahedron.ts:66`. Full per-formula table archived in
the §1 research transcript.)*

### 1.2 The type universe and the decisive signal

Distinct GLSL types that appear as loop-carried state: **`float, vec3, vec4, mat2, mat3, bool`** (+ the shared-rotation
`vec3+float+float` triple). But the crucial split:

- **The wide/awkward types are all precalc-once or already-arg'd, not per-iteration recurrences.** `vec4` history
  (Phoenix), `mat3` (KaliBox), `mat2` (Bristorbrot), 5×`vec3` (Claude) are **B-precalc** (loop-invariant) or the **(D)
  extra-arg escape hatch** — never genuine per-iteration accumulators.
- **Genuine per-iteration mutable state is small and mostly scalar:** ~7 formulas, dominated by `float`. The worst
  cases are **KleinianMobius/KleinianJos** — 6 floats each (`ks_DF` multiplicative DE accumulator, a 2-cycle DE pair
  `ks_de_prev/curr`, a crossing counter `ks_xings`), *and those feed `getDist` after the loop* so they must survive
  to post-loop scope (`KleinianMobius.ts:106,123,129-130`).

**Why this matters:** a flat-float-threading *or* a struct decision would only ever be stressed by ~7 formulas of
mostly-float state. And because that state already lives in `preambleVars` globals, **neither mechanism is required to
cross the dispatcher boundary** — the globals already do.

### 1.3 Frag/DEC imports introduce no new shapes

The V4 per-iteration emitter maps a recognized tracker onto engine `z`/`z.xyz`/`dr`
(`engine-gmt/features/fragmentarium_import/v4/emit/per-iteration.ts:743-757`), hoists "once" state into
`preambleVars` + a loopInit reset (`:660-706,874-884`), and **bails to self-contained (returns null) on any
unrecognized cross-iteration state** — QuaternionJulia's `vec4 dp` derivative, unbounded vec4 inversion, pre/post-loop
tracker mutations (`:343-387,394-399,579-602`). V3 splits identically (`v3/generate/init.ts:16-124`,
`v3/generate/loop-body.ts`). So an import can only ever emit **(B) scalar/vec mutable globals + a z/dr tracker**, or
fall through to **self-contained** (own internal loop, zero engine-visible state). **Imports are a strict subset of
the native state universe** — the P4 slot machinery only has to represent native state; imports fit for free.

---

## 2. Framework options, compared → recommendation

The real P4 requirement is not "N native slots" but **mixing slot kinds in one weave** (a native formula + an MB3D
decompiled slot + a frag import, all scheduled together). `assembleWeave` dispatches MB3D slots as phase branches
(`engine-gmt/engine/weave/emitWeave.ts:75-84`); to mix, native slots must become phase branches in the *same*
dispatcher — i.e. dispatcher functions. So the question is only: **how does a native slot's state reach its dispatcher
function?**

| # | Option | Mechanism | Verdict against the inventory |
|---|---|---|---|
| (a) | Typed inout scratch | Generalize `assembleWeave`'s flat `inout float` (`emitWeave.ts:70-73`) to `inout float/vec3/vec4/mat2/mat3` params | Works, but **solves a problem the corpus doesn't have** — the state is already global. Adds signature churn + a per-type union. Only Phoenix/KaliBox/Bristorbrot would even exercise the wide types, and all three are non-recurrent. |
| (b) | Per-slot struct | `struct WeaveSlotState_N { … }` declared at fn scope, passed `inout` | GLSL supports it, but it bundles state that globals already carry. Extra type decl per slot, no benefit over (a). **Fallback only** (see §2.3). |
| (c) | Generalize inline-splice to N slots | Keep interlace's inline body-splice (`nativeSlot.ts:342-403`), extend to N | Breaks on mixing: MB3D slots are dispatched, native slots inlined → two schedulers, N rot-swap blocks stacked in the loop, no single phase dispatcher. Rejected — it re-forks what ADR-0089 unified. |
| (d) | Hybrid: dispatch stateless, inline stateful | Two code paths keyed on state presence | Closer, but still keeps the inline path and its per-slot loop-level bookkeeping for the stateful majority-of-interest. |
| **(e)** | **Recommended — global-channel dispatcher slots** | Native slots become dispatcher functions; their per-slot state = **namespace-prefixed globals** (the existing rewriter) + a **hoisted per-slot loopInit** contributed to the weave loopInit; MB3D slots keep shared `inout float` scratch. One dispatcher hosts both. | Minimal new machinery, honest about the two genuinely-different state semantics (see §2.2), imports fit for free, identity-pair-safe via prefixing. |

### 2.1 The recommended design (e), concretely

Extend `assembleWeave` (`emitWeave.ts:67-87`) so a `ResolvedWeaveSlot` can be a **native slot** in addition to today's
MB3D slot:

1. **State channel = prefixed globals.** Run each native slot through a per-slot binding of
   `createNativeSlotRewriter` (`nativeSlot.ts:145`) with a unique namespace (`slot0_`, `slot1_`, …, generalizing
   interlace's single `INTERLACE_NAMESPACE`, `features/interlace/glslRewriter.ts:13-20`). This prefixes the formula
   function, `preambleVars` globals, and helpers — so **identity-pair weaving (formula A in two slots) never
   redeclares symbols** (`nativeSlot.ts:216-238`). The slot's B-precalc / B-accum globals become `slotN_*` globals,
   readable/writable directly from the dispatcher function — **no inout threading**.
2. **Per-slot loopInit hoist.** Each native slot's rewritten `loopInit` (its precalc + per-pixel state reset) is
   concatenated into the weave's `loopInit` (via the existing `extraLoopInit`, `emitWeave.ts:83`, generalized to a
   per-slot list). This is where `slotN_ks_DF = 0` etc. reset each pixel, and where precalc-once globals (`slotN_uKB_rot`,
   `slotN_gmt_rot*`) get computed once. It runs at map()-scope before the loop — exactly where native loopInit runs
   today (`de.ts:125`).
3. **Dispatcher branch.** The native slot's branch calls its renamed function:
   `if (phase == k) { formula_slotN(z, dr, trap, c[, extra args]); return; }` — same shape as an MB3D branch
   (`emitWeave.ts:78`), passing `i` and any (D) extra args as the slot needs.
4. **Shared rotation** (12 formulas + Claude/Coxeter/GSD): the shared transform helpers read the fixed global names
   `gmt_rot*` (`transforms.ts:10-12`). A rotation-using slot needs its prefixed rotation values loaded into those fixed
   globals for the duration of its body. Reuse interlace's proven snapshot/restore swap (`nativeSlot.ts:342-379`), but
   hosted **inside the dispatcher branch** via a new per-slot `preCall`/`postCall` pair on `ResolvedWeaveSlot`
   (`emitWeave.ts` already has `postCall`, `:35`; add a symmetric `preCall`). This keeps the swap out of the loop body
   and confined to slots that declare `usesSharedRotation`.
5. **MB3D slots unchanged.** Their `mb3dVary/mb3dRout/mb3dDr1/mb3dIter` scratch is a **shared-orbit accumulator**, not
   per-slot state (one MB3D trajectory whose slots take turns — `emitFusedHybrid.ts:176-179`). It stays the shared
   `inout float` union (`emitWeave.ts:70-73`). Mixing is trivial: each branch calls its own fn with its own args;
   `slotScratchArg` already emits per-slot arg lists (`emitWeave.ts:73`).

### 2.2 Why two state channels is *correct*, not a fork

MB3D scratch is **semantically shared** across slots (a single fused orbit's running radius / dIFS scale). Native
per-slot state is **semantically independent** (each slot is a distinct formula's own accumulator). Forcing them into
one channel would either break MB3D's sharing or falsely-share native state. The dispatcher already accommodates both
without duplication (`emitWeave.ts:70-84`). This satisfies "genicize, don't fork" — the *dispatcher* is unified; the
two channels reflect two real semantics.

### 2.3 Trade-offs weighed (per the prompt's criteria)

- **GLSL cost:** prefixed globals for N slots (e.g. Claude = 5 vec3 + bool + float ×N). Precalc-once globals are
  computed once/pixel — cheap. Register pressure is a non-issue at the MVP's N ≤ ~6 slots; **if** a pathological weave
  ever bloats the global table, option (b)'s per-slot struct is the escape valve (bundles a slot's state into one
  `inout` struct arg, shrinking the global count). Note the ceiling in the weaver UI's budget meter.
- **Identity-pair safety:** per-slot namespace prefixing is exactly interlace's identity-pair defense
  (`nativeSlot.ts:216-238,247-272`) — carries over verbatim to N slots.
- **Animation / undo neutrality:** no-weave path is byte-identical (nothing emitted — `emitWeave` untouched when no
  weave; verified pattern `S-weave-p3b.md:13`). Slot params pack into `coreMath.*` lanes as today (§4), so existing
  keyframe/undo routing is unchanged.
- **Frag/DEC fit:** imports self-limit to global/tracker shapes (§1.3) → the same native resolver handles them; no
  extra path.
- **What the P3 weaver UI needs:** already has the slot-list editor + reorder + ParamMapper (`WeaveEditorPane.tsx`).
  P4 adds native/frag/DEC slot *sources* to the picker and per-slot param mapping onto `coreMath` lanes — no new UI
  primitive.

### 2.4 Migration path (revertible)

The MB3D counts/importer path must stay byte-identical throughout — `debug/probe-weave-refactor.mts` dumps all 38
bundled scenes for diffing (`S-weave-p3b.md:11-13`). Add native-slot support to `assembleWeave` **behind the resolver**
(a slot is native only if its `source.kind === 'native'`, `types.ts:26-28`); with no native slots present, emission is
untouched. Prove byte-identity before any GPU work. Full staging in §6.

---

## 3. Interlace + Hybrid Box absorption + save-migration layer

Both legacy systems are **2-slot modulo weaves** already dispatching through the weave core's `emitModuloScheduleGLSL`
(`schedule.ts:139-153`) — interlace via `Interlace_weaveSlot` (`nativeSlot.ts:172-178`,
`features/interlace/glslRewriter.ts:22,32`), Hybrid Box interleaved via `Hybrid_weaveSlot`
(`features/geometry/index.ts:495-501`). P4 replaces their *UIs* with the weaver and converts their *persisted state*
into weave-native form (ADR-0089: "conversion lands when the weaver absorbs those UIs" — `0089…md:13-14,70-72`).

### 3.1 What the weaver must express to replace each UI

- **Interlace** — a 2-slot modulo weave: slot 0 = host formula, slot 1 = a **native slot** (the secondary), a runtime
  enable toggle, `interval`/`startIter` (both keyframable uniforms), and the secondary's own param set. Its picker
  greys formulas with caps `shape:self-contained` / `shape:modular` with hover reasons
  (`InterlaceSecondaryPicker.tsx:29,59-66`) — the weaver's slot picker must carry the same reject-cap logic.
- **Hybrid Box interleaved** — a 2-slot modulo weave whose secondary is the **box-fold formula**: `interval`
  (`hybridSkip`), `startIter` (`hybridSwap` → 0/1), `maxCount` (`hybridIter`), enable (`hybridMode`), plus the fold
  formula's own params (fold type, scale, minR, shift, rot, …). **The pre-loop fast path (`!hybridComplex`) is NOT a
  weave** (a prep pass running the fold `hybridIter`× before the main loop, `geometry/index.ts:473-484`;
  ADR-0089:68-69) — it **stays in geometry**, untouched.

### 3.2 Persisted fields → weave-native mapping

**Two transports (critical asymmetry):** `weaveSource` rides the **GMF Metadata** JSON — `generateGMF` destructures
`const { shader, ...meta } = def` then spreads `metadata = { ...meta }`, carrying `weaveSource` (a non-shader top-level
def field, `types/fractal.ts:144-166`) verbatim (`FormulaFormat.ts:190,208-212,220`); `parseGMF` restores it
(`:364-367`). But `interlace*`/`hybrid*` DDFS state rides `preset.features.{interlace,geometry}` inside the **`<Scene>`
JSON** (`types/fractal.ts:51`; `FormulaFormat.ts:412-413`; `SceneFormat.ts:46-48,63-70`). **A migration folding legacy
state into `weaveSource` must decide which transport owns the migrated slot params — they cannot live in both, or
old+new saves double-apply.**

**Interlace → 2-slot modulo WeaveSpec:**

| Old field (`features/interlace/index.ts`) | Target | Note |
|---|---|---|
| `interlaceFormula` (`:173`) | `weaveSource.slots[1].source = {kind:'native', formula}` | typed `float` but holds a string id — read as string |
| `interlaceInterval` (`:191`) | `schedule.interval` | direct (`ModuloSchedule`, `types.ts:48`) |
| `interlaceStartIter` (`:198`) | `schedule.startIter` | direct (`types.ts:50`) |
| `interlaceParamA..F`, `Vec2/3/4A..C` (`:207-326`) | slot-1 native params | via existing `INTERLACE_PARAM_MAP` (`index.ts:63-69`) |
| `interlaceEnabled` (`:187`) | schedule active flag | **no clean target — see gaps** |
| `interlaceCompiled` (`:166`) | (drop) | presence of a weave *is* the compile state |

**Hybrid Box interleaved → 2-slot modulo WeaveSpec** (migrate only when `hybridComplex === true`):

| Old field (`features/geometry/index.ts`) | Target | Note |
|---|---|---|
| `hybridSkip` (`:499`) | `schedule.interval` | direct |
| `hybridSwap` (`:491,498`) | `schedule.startIter` (0/1) | baked offset → runtime start |
| `hybridIter` (`:500`) | `schedule.maxCount` | **dual role** — also pre-loop count when `!hybridComplex` |
| `hybridMode` (`:497`) | schedule active flag | same enable-gap |
| `hybridFoldType/Scale/MinR/FixedR/FoldLimitVec/AddC/Shift/Rot/…` (`:249-357`) | fold-slot native params | the fold formula's own param set |

### 3.3 Migration gaps to resolve in P4 design

1. **No `enabled`/`active` field on `WeaveSpec`/`ModuloSchedule`** (`types.ts:45-62`) — the runtime master toggle
   exists only as `emitModuloScheduleGLSL`'s optional `enabled` uniform (`schedule.ts:124-131,146`). **Decision needed:**
   add an `active` field to `ModuloSchedule` (persisted, keyframable), or keep a separate runtime toggle feature.
   *Recommend adding `active` to the schedule* so the weave is self-describing.
2. **`hybridIter` dual role** — branch migration on `hybridComplex`: interleaved → `maxCount`; fast-path → leave as a
   geometry pre-loop count (no weave meaning).
3. **Editor authors `counts` only today** (`WeaveEditorPane.tsx:282-287`); absorbing interlace/hybrid needs the editor
   to author/read `modulo` schedules too (the type already supports it — `types/fractal.ts:165`, and P3b added the
   Rhythm mode — `S-weave-p3b.md:21-45`).
4. **Two-transport ownership** (§3.2) — recommend the migrated slot params live in `weaveSource` (Metadata) with the
   weave def, and the legacy `features.{interlace,geometry}` state is *cleared* on migration so it can't double-apply.
5. **No existing migration shim** — `grep interlace|hybrid` in `SceneFormat.ts` = 0 (greenfield). Natural hook: the
   GMF-aware `parseScene`/post-load preset transform, where both `features.*` and the def's `weaveSource` are in hand.

**Round-trip gate:** an old interlace scene and an old Hybrid-Box interleaved scene each load **pixel-equivalent** to
their pre-migration render (GPU cert, ADR-0087). Formulas "may run slightly differently post-fold" is accepted by the
owner (`S-nformula-weave-unification.md:141-144`) — the gate is visual equivalence, judged by the user.

---

## 4. Animation-transfer tool sketch (retarget keyframes on slot reorder)

> **Update 2026-07-12 (P4.6 BUILT — this sketch superseded by the ADR-0090 bank reality):** per-slot banks
> (ADR-0090 + its 2026-07-11 MB3D extension) made every woven slot's params whole-bank-addressed
> (`weave.ws<k>*`, k = row index), so the component-level lane map below is only needed for the retired
> cross-slot dense pack. The shipped mechanism instead RETURNS the old→new mapping from the value-transfer
> functions themselves (`mergeWeaveBanks`/`mergeDenseLanes` → `LoadMB3DResult.paramRenames`) and applies it to
> keyframe tracks + LFO targets via `engine-gmt/animation/retargetTracks.ts` — values and tracks can never
> diverge, and no pre-rebuild editor-side map retention is needed. The prompt became an auto-transfer +
> post-Build report (values already followed silently since 2026-07-05, so a "No" answer would have produced a
> broken values-moved/tracks-stale hybrid); the interactive choice is reserved for orphaned tracks (deleted /
> replaced slots), offered as one-click cleanup. Rhythm timing tracks (`weave.weave{Interval,StartIter,Beats}<k>`,
> a family this sketch predates) transfer live inside the editor's `syncRhythm`, at the same moment their values
> permute.

**How a track is keyed.** A `Track` is identified by a single dotted string `id` (`engine-gmt/types/animation.ts:44-53`);
`LfoTarget = string` e.g. `'coreMath.paramA'` (`types/animation.ts:3,13`). `AnimationEngine.scrub()` resolves the
writer *purely* from `track.id` via `getBinder(track.id)` (`engine/AnimationEngine.ts:340`) — **the dotted id is the
entire routing key.** The generic DDFS binder splits on `.`: `parts[0]` = feature id, remainder = param, writes
`set${Feature}({[child]: v})` (`AnimationEngine.ts:157-222`); vec axes use the underscore form `coreMath.vec4A_x`
(`:188-204`). `binderRegistry` is the pre-empting escape hatch (`engine/animation/binderRegistry.ts:27-72`).

**What weave slot params animate through today.** Slot params get **no per-slot uniform** — they pack into
`coreMath`'s fixed generic pool (`paramA..F`, `uVec2/3/4*` components) via a shared `LaneAllocator`
(`engine-gmt/utils/uniformSlots.ts:157-164,197-259`). `FormulaParamsWidget` renders each packed param with track id
`` `coreMath.${p.id}` `` where `p.id` is the **lane base** (`components/panels/formula/FormulaParamsWidget.tsx:100,115,119`).
So **packed lanes ARE keyframable today — but the animated key is the LANE, not the slot's semantic param.** (The
editor already detects this: `store.animations.some(a => a.target.startsWith('coreMath.'))`, `WeaveEditorPane.tsx:184-185`.)

**The retarget problem.** `LaneAllocator` allocates **in slot order** (`constPacker.ts:236-246`; `startSlot()` aligns a
fresh vec base per slot, `uniformSlots.ts:244-251`). Reordering slots re-runs allocation → the same semantic param lands
on a *different* `coreMath.*` lane, and the old track now drives a different slot's param. The editor already **warns**
on reorder-with-keyframes (`WeaveEditorPane.tsx:439-446`); P4 turns the warning into a transfer.

**Tool design.**
- **Capture a lane map on every build**, both before and after a rebuild: `(stableSlotKey, optionIndex) →
  coreMath.<lane>.<component>`. The packers already yield the accessor + push a `PackedParam{ id: lane.coreKey }`
  (`uniformSlots.ts:394-404`); `bindOptions` returns `{ params, coreMath, bindings }` (`constPacker.ts:326`). Key those
  by the editor's stable `SlotRow.key`/`colorIdx` (`WeaveEditorPane.tsx:40-48`) to get `laneBefore` / `laneAfter`.
- **On reorder, prompt** ("Move keyframes with the slots?"). On accept, rewrite each affected track id
  `coreMath.<laneBefore>` → `coreMath.<laneAfter>` (**plus its `_<axis>` vec variants**), a pure key-rename on
  `sequence.tracks` + `track.id` + any `AnimationParams.target` LFO binding (`types/animation.ts:13`). **No keyframe
  values change — only the routing string.**
- **Component-level map required, not base-level:** one lane can co-pack several unrelated slot params
  (`VecControlAccumulator`, `uniformSlots.ts:314-375`), so a `(slot,option) → coreMath.<base>.<component>` granularity
  is needed or two co-packed params collide on rename.
- **Data the editor must retain across rebuilds:** the pre-rebuild lane map (there is no persisted slot→lane map today —
  `weaveSource` records slots + schedule but not lanes, `WeaveEditorPane.tsx:275-280`). Retain it in editor-local state
  (module-scoped draft, §5) across the rebuild so before/after can be diffed.

Consistent with the owner's decision: **warn now, transfer tool later** (`S-nformula-weave-unification.md:152-153`).

---

## 5. Panel promotion checklist (WeaveEditorPane → dockable panel)

**Host-agnostic already — verified.** The draft is **module-scoped** (`let weaveDraft` at file top,
`WeaveEditorPane.tsx:57-61`), hydrated to local `useState` on mount, snapshotted on unmount (`:93-99,109-112`) — the
documented "Workshop pattern, survives modal close" (`:6-9`). Editor-local undo is `useRef` stacks, separate from DDFS
undo (`:105-131`). Store touch points are reads + standard actions only (`useEngineStore`, `registry.get`,
`loadUserWeave` — `:91,96,185,281,430`); **zero coupling to `ImportMandelbulb3DModal`** (the modal renders
`<WeaveEditorPane />` with no props, `ImportMandelbulb3DModal.tsx:194`). Promotion = re-mount, no rewrite.

**Checklist:**
1. **Register the component:** `componentRegistry.register('panel-weave', WeaveEditorPane)` in `registerGmtUi()`
   alongside `panel-graph`/`panel-feedback`/`panel-cameramanager` (`engine-gmt/features/ui.tsx:155-185`).
2. **Manifest entry** in `GmtPanels` (`engine-gmt/panels.ts:31-548`, applied `app-gmt/main.tsx:586-593`). **Copy the
   Feedback panel template** (`panels.ts:528-534`): `{ id: 'Weave', dock: 'float', order: …, component: 'panel-weave',
   isCore: false }` — floats until docked, has a close button, opened on demand. `PanelDefinition` shape at
   `engine/PanelManifest.ts:249-317`.
3. **Z / Layer (ADR-0082):** the `panel` tier (`base:100, span:99, domain:'portal'`, `components/ui/zIndex.ts:86`) —
   the 100–199 band reserved for `layerStack` click-to-front ranking (ADR-0081, `zIndex.ts:35-42`). A weave panel gets
   click-to-front automatically; **no raw `z-[N]`**. The compile banner sits far above at `compileProgress`
   (`base:3000`, `zIndex.ts:76`) so it is never occluded.
4. **State ownership:** unchanged — module-scoped draft + editor-local undo already survive mount/unmount. Nothing to
   migrate.
5. **Compile-progress interaction:** the pane owns **no** compile UI (its build feedback is a local `busy` flag →
   "Building…" + status/toast, `WeaveEditorPane.tsx:103,271-296,458-462`). The real compile is **app-global**:
   `build()` → `loadUserWeave()` → `registry.register(def)` + `FractalEvents.emit(REGISTER_FORMULA)` +
   `store.loadPreset()` (`utils/mb3d/loadMB3DScene.ts:197-222`), surfaced by the globally-mounted `<CompilingIndicator />`
   (`app-gmt/AppGmt.tsx:450`, z-tier 3000). **A panel inherits compile progress for free** — nothing extra. Bonus: as a
   non-modal panel the user sees the live preview recompile behind it (the modal currently backgrounds the viewport).

---

## 6. Staged P4 execution plan (revertible steps + gates)

Every step keeps the merged v1 importer byte-identical until proven otherwise; GPU-cert every emit/DE change (ADR-0087
blind spot — identical const seeding reads 0-mismatch yet renders wrong). Standing gates each commit: `npm run
typecheck` · `test:mb3d` (24) · `test:mb3d:weave` · `test:refine` · `check:mb3d-decompiler` (corpus) · `smoke:boot`.

| Step | Tag | What | Gate (in addition to standing gates) |
|---|---|---|---|
| **P4.0** | `[engine]` | Extend `assembleWeave` for **native dispatcher slots**: per-slot `loopInit` contribution (list form of `extraLoopInit`), per-slot `preCall`/`postCall` (rot-swap host), native branch emission. Behind `source.kind==='native'`; **no native slots ⇒ emission untouched.** | `debug/probe-weave-refactor.mts` **byte-identical** across all 38 bundled scenes (MB3D path unchanged) |
| **P4.1** | `[engine]` | **Native-slot resolver**: register N per-slot bindings of `createNativeSlotRewriter` (`slot0_`, `slot1_`, …); hoist rewritten loopInit; detect `usesSharedRotation` → emit `preCall` swap; thread (D) extra args (Phoenix/Bristorbrot). | GPU-cert a **native identity-pair canary** (formula A woven with itself, alternating) renders coherently; visual verdict = user |
| **P4.2** | `[engine]` | **DE policy for native slots**: importer-style auto-resolution of a usable `dr`; **est7 numeric DE** (`de.ts` `numericDE`, ADR-0085) as last resort when no slot supplies analytic `dr`. Estimator dropdown stays the manual escape hatch (`S-nformula-weave-unification.md:159-160`). | Woven native scene (mixed native + MB3D) renders; GPU-cert; user visual |
| **P4.3** | `[importer][ui]` | **Frag/DEC slot sources** in the weaver picker — reuse the native resolver (imports self-limit to global/tracker shapes, §1.3). Add reject-cap greying (`InterlaceSecondaryPicker` logic). | A V4-import slot + a native slot woven together renders |
| **P4.4** | `[engine][ui]` | **Fold interlace UI into the weaver** + `modulo`-schedule authoring in the editor; **save-migration** `interlace*` → `weaveSource` (add `ModuloSchedule.active`; clear legacy `features.interlace` on migrate, §3.3). | **Old interlace scene loads pixel-equivalent** (round-trip GPU-cert); native-canary byte-identical |
| **P4.5** | `[engine][ui]` | **Fold Hybrid Box interleaved** into the weaver; migrate `hybrid*` (branch on `hybridComplex`; `skip/swap/iter → interval/startIter/maxCount`). Pre-loop fast path **untouched**. | **Old Hybrid-Box interleaved scene pixel-equivalent**; fast-path scenes unchanged |
| **P4.6** | `[ui]` | **Animation-transfer tool** (§4) — **DONE 2026-07-12** (see the §4 update block): `mergeWeaveBanks`/`mergeDenseLanes` return their old→new mapping (`paramRenames`), `retargetAnimationTargets` applies it to tracks + LFOs as a simultaneous permutation at Build (rhythm timing live in `syncRhythm`); post-Build report + orphan cleanup replaces the warn. | ✅ Acceptance test in `test:mb3d:weave` (313/0): keyframed slot param's track and live value land on the same lane post-reorder |
| **P4.7** | `[ui]` | **Panel promotion** (§5): `componentRegistry.register('panel-weave', …)` + `GmtPanels` float entry (Feedback template). | Panel mounts, docks, floats; compile progress + live preview work; `check:zindex` green |

Then **push v1 + the weave UI together** → deploy (per `S-nformula-weave-unification.md:87`).

**Sequencing rationale:** P4.0–P4.1 are the riskiest (touch `assembleWeave`) and are revertible behind the resolver —
do first, prove byte-identity. P4.4/P4.5 (migration) gate on old-scene round-trip, the load-bearing user requirement.
P4.6/P4.7 are additive UI and carry no emit risk.

---

## Appendix — open decisions for the owner (confirm before building P4.4+)

1. **`ModuloSchedule.active` field** (§3.3.1) — add a persisted, keyframable `active` to the schedule vs. keep a
   separate runtime toggle feature. *Recommend: add to schedule.*
2. **Migrated-param transport** (§3.2/§3.3.4) — slot params in `weaveSource` (Metadata) with legacy `features.*`
   cleared, vs. keep `features.*` and derive. *Recommend: migrate into `weaveSource`, clear legacy, to prevent
   double-apply.*
3. **Global-count ceiling** (§2.3) — accept prefixed-globals for the MVP; adopt option (b) per-slot struct only if a
   real weave bloats the global table. *Recommend: ship globals, measure, keep struct as a documented fallback.*
