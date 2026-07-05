# Weave: LUT-preserving Sequence ↔ Rhythm conversion — logic spec

**Prepared 2026-07-05 for the P4.7+ working session.** Scope: the `Sequence | Rhythm` toggle in the weave
editor currently just flips `draft.scheduleKind` — the iteration→slot pattern silently changes to whatever
the other mode's (stale or default) state produces. This spec defines the conversion logic that makes the
toggle **pattern-preserving**: switching modes derives the target mode's parameters from the source mode's
LUT, exactly when the pattern is representable, and never approximates silently.

Grounding (all verified in source, 2026-07-05):
- Sequence = `counts`/block schedule: rows' `iterCount` + loop dividers → `buildBlockPlan` →
  `{order, introLen, cycleLen}` → baked `const int[]` LUT (`emitCountsScheduleGLSL`). Structure edits rebuild.
- Rhythm = layered modulo: base = first ACTIVE row; layer j = (j+1)-th active row, driven by live DDFS
  uniforms `weaveInterval_k / weaveStartIter_k / weaveBeats_k` (`emitLayeredModuloGLSL`). Layers checked in
  row order, **first beat wins**; base fills the rest. Editor read-clamps: interval 1..32, start 0..64,
  beats 0..64 (`layerVal` in WeaveEditorPane).
- The editor already mirrors the rhythm phase fn in JS (the `rhythmPlan` IIFE, ~line 580) — extract it; the
  conversion and the LoopStrip preview must share ONE simulator.

## 0. Definitions

For either mode define `phase(i) → active-row index`, `i ∈ [0, ∞)`:

- **Sequence:** `plan = buildBlockPlan({iterCounts, dividers})`;
  `phase(i) = stepSlot(plan.order[i < introLen ? i : introLen + (i − introLen) mod cycleLen])`.
- **Rhythm:** `phase(i) = rowIdx of first layer j with rel = i − S_j ≥ 0 ∧ rel mod I_j = 0 ∧
  (B_j ≤ 0 ∨ rel / I_j < B_j)`, else `base` (= `activeRowIdx[0]`).

Both are **eventually periodic**: Sequence trivially `(introLen, cycleLen)`; Rhythm with
`T = max(over capped layers: S + I·B; over endless layers: S)` and tail period `P = lcm(endless intervals)`
(no endless layers ⇒ `P = 1`).

**Equality certificate:** two eventually-periodic sequences with structures `(a, p)` and `(b, q)` are equal
on all of ℕ **iff** they agree on `[0, max(a,b) + lcm(p,q))`. That window is the exactness test — cheap,
total, no cleverness required. Cap the window at `W_MAX` (suggest 4096); if `lcm` blows past it, downgrade
to "exact within `W_MAX` iterations" and say so in the status line.

## 1. Invariants (the contract)

1. **Never approximate silently.** The toggle either converts exactly (certificate passes) or leaves the
   target mode's existing state untouched and shows a one-line reason. No "closest fit" in v1.
2. **Idempotence shortcut, checked FIRST:** simulate the target mode's *current* state; if its LUT already
   equals the source LUT (certificate), flip `scheduleKind` and write nothing. This makes
   Sequence→Rhythm→Sequence lossless when nothing was edited in between, and respects hand-tuned
   equivalent values.
3. **One undo step per direction's home:** Rhythm-param writes go through `store.setWeave` (DDFS undo);
   row/divider writes go through the editor's `commit()` (editor-local undo). A conversion is one commit.
4. **Both directions still require Build** — the emitted phase fn *shape* changes (baked LUT vs uniform
   reads). The existing dirty/Build flow already handles this; conversion only writes state.
5. **Verify by simulation, always:** after fitting, run the certificate on (source LUT, fitted LUT). The
   fitters below are provably safe without it (see §2 note), but the sim check is the 0-diff-gate habit
   and catches future model drift for free.

## 2. Sequence → Rhythm (the constrained direction)

Rhythm can only express: base anywhere + each non-base active row firing on **one arithmetic progression**
(optionally delayed by `start`, optionally cut after `beats` hits). So:

**Preconditions (refuse with reason if violated):**
- `hasSilent` (any negative `iterCount`) → refuse: "silent slots have no Rhythm equivalent".
- `activeCount` outside 2..6 → already gated by `rhythmOk`.

**Fitter** — with `plan = buildBlockPlan(...)`, for each non-base active row `r` (in row order → layer
`j = its position in activeRowIdx`):

```
O_r = sorted occurrences of r in phase(i), computed over [0, introLen + 2·cycleLen)
      (tag whether r occurs in the cycle segment at all → "endless" vs "intro-only")

intro-only (finite O_r — the row lives before the last divider):
    k = |O_r|
    k = 1            → (S = O_r[0], I = 1, B = 1)
    all gaps equal d → (S = O_r[0], I = d, B = k)
    else             → UNFIT ("'{label}' repeats unevenly (gaps …) — Rhythm fires evenly")

endless (occurs in the cycle):
    all consecutive gaps (across the whole window, intro occurrences included) equal d
                     → (S = O_r[0], I = d, B = 0)
    else             → UNFIT (same reason)

bounds: I ≤ 32, S ≤ 64, B ≤ 64 → else UNFIT ("'{label}' needs interval {I} / start {S} — outside
    Rhythm's range"). NOTE: a slot firing once per cycle has I = cycleLen, so cycles > 32 are
    inconvertible under current ranges (see §5 Open knobs).
```

**Why per-slot fitting suffices (no composition check needed):** each fitted AP equals that row's exact
occurrence set; occurrence sets partition the iterations, so the APs are pairwise disjoint and
first-beat-wins precedence can never steal an iteration. (This breaks the moment you add "masking" — a
later layer's AP deliberately overlapping an earlier one — which is why masking is backlog, §5.)

**Base fallback:** the model pins base = `activeRowIdx[0]`. If the fit fails with that base, retry each
other active row as base (fit the remaining rows, first-active-row constraint means this implies a row
reorder). Recommended UX: perform the reorder as part of the conversion commit with an explicit status
("moved '{label}' to the top — Rhythm's base is the first slot"), reusing the existing
keyframed-tracks reorder warning. Cheaper v1 alternative: refuse with the actionable reason ("make
'{label}' the first slot to convert this pattern") and let the user drag. Session's call; both honest.

**On success:** `setWeave({ weaveInterval_j, weaveStartIter_j, weaveBeats_j … })` for every layer (write
all three fields incl. beats 0 — stale beats from a previous rhythm otherwise corrupt the pattern), flip
`scheduleKind: 'modulo'`, keep rows/dividers untouched (they're Sequence's state; preserving them costs
nothing and feeds the idempotence shortcut when toggling back).

**Warning case:** if any `weaveInterval/Start/Beats` track is keyframed, the write stomps animated values —
surface the same style of warning as the reorder path before committing.

What converts in practice: the canonical weave shapes — pure alternation (`A×1 B×1`), heavy base + accents
(`A×3 B×1 C×1` → B: I=5,S=3; C: I=5,S=4), and divider intros (`[A×2 B×1]×2 then C D` → B becomes a capped
layer S=2,I=3,B=2; C,D endless with S shifted past the intro). What refuses: non-base runs of length > 1
(`A×2 B×2` — B's gaps are 1,3), uneven multi-visits, silent slots, cycles > 32.

## 3. Rhythm → Sequence (the expressive direction, bounded by rows)

Sequence can express any eventually-periodic LUT — but the *editor model* is rows + dividers where one
cycle = **one pass over the cycle rows in row order**, so a row can only contribute ONE run per cycle.
Rhythm patterns routinely interleave the base between accents (`A A B A C`), so conversion MUST be allowed
to **duplicate rows** (same formula in two rows — exactly what MB3D scenes do). Hard caps:
`totalRows ≤ 6` (`WEAVE_BANK_COUNT`), `introLen + cycleLen ≤ MAX_LUT` (suggest 192; one shared constant).

**Algorithm:**

```
1. Read live layer values (layerVal(k)) — the CURRENT frame's values. If any rhythm param is keyframed,
   warn: "rhythm is animated; Sequence bakes the current values".
2. Simulate phase(i) over [0, T + 2P) (T, P from §0; if P > W_MAX → refuse: "this rhythm's pattern is
   {P} iterations long — too long to bake").
3. Minimal structure: smallest divisor p of P with phase(i) = phase(i+p) ∀ i ∈ [T, T+P); then smallest
   introLen s with phase(i) = phase(i+p) ∀ i ≥ s (scan down from T).
4. RLE the intro [0, s) and one cycle [s, s+p) into runs [(rowIdx, count), …].
5. Budget check: total runs ≤ 6 rows AND s + p ≤ MAX_LUT, else refuse:
   "pattern needs {n} slot rows / {len} baked steps — Sequence holds 6 rows. Simplify intervals or
   keep Rhythm." (Co-prime intervals like 2 & 5 land here; that refusal is correct and honest.)
6. Optional compression (nice-to-have, not v1): detect whole-intro block repetition → divider repeat > 1.
   V1: intro runs become rows with ONE divider (repeat 1) after the last intro row; cycle runs follow.
7. Materialize: for each run, reuse the source row on FIRST use; further uses deep-clone the row
   (clone slot + optionValues + bake, fresh key, fresh colorIdx) so the duplicate builds with identical
   params. Set each row's iterCount = run length. Write rows + dividers + scheduleKind:'counts' as one
   editor commit.
```

Round-trip note: a duplicated base row converts BACK as its own rhythm layer (e.g. `A A B A C` → rows
`A×2 B A C` → back to rhythm: B: I=5,S=2; A-dup: I=5,S=3; C: I=5,S=4 — same LUT, fits). LUT-identical,
structurally not the original — the idempotence shortcut (§1.2) is what makes untouched round-trips exact.

## 4. Code layout & integration

- New pure module `engine-gmt/engine/weave/convert.ts` (sibling of `schedule.ts`):
  - `simulateRhythm(layers, base, activeRows, H)` — extracted from the editor's `rhythmPlan` IIFE;
    LoopStrip preview and conversion consume the same function (single source of truth).
  - `simulatePlan(plan, H)` + `eventualStructure(...)` + `lutsEqual(a, b)` (the certificate).
  - `fitRhythmFromPlan(plan, activeRows, bounds) → {ok, layers[], baseRow, reorder?} | {ok:false, reason}`
  - `runsFromRhythm(layers, base, caps) → {ok, introRuns[], cycleRuns[]} | {ok:false, reason}`
  - `BOUNDS` exported once: `{INTERVAL_MAX: 32, START_MAX: 64, BEATS_MAX: 64, MAX_ROWS: 6, MAX_LUT: 192,
    W_MAX: 4096}` — the editor's `layerVal` read-clamps MUST import these (today they're hardcoded; a
    fitter honoring 32/64 while the clamp says otherwise is silent corruption in one direction).
- Editor: the toggle handlers call the fitters; on `ok` write + flip + status ("Converted — same pattern,
  now live/baked"), on `!ok` flip WITHOUT writes + status with `reason` ("kept your existing …
  settings — {reason}"). The mode toggle itself stays a free user choice, per the P3b decision.
- No engine-emit changes; `schedule.ts` and `emitFusedHybrid` untouched. MB3D byte-identity probe
  (`probe-weave-refactor.mts`) unaffected by construction — assert anyway.

## 5. Open knobs for the session (decide, don't drift)

1. **Base fallback:** auto-reorder-with-notice vs actionable refusal (§2). Recommend auto + notice.
2. **Bounds widening:** cycles > 32 / intros > 64 are inconvertible purely because of param ranges. Ranges
   are UI-cosmetic per the feature JSDoc, but `layerVal`'s read-clamp makes them load-bearing. If widened
   (e.g. interval 128 / start 256), do it in `BOUNDS` + the feature's min/max together.
3. **Masking (backlog, not v1):** allowing a later layer's AP to overlap earlier layers' claims rescues a
   few extra patterns at the cost of the disjointness proof (§2) — composition must then be sim-verified.
   Real corpus need not demonstrated; skip until a scene demands it.
4. **Intro block-repeat detection** in Rhythm→Sequence (§3.6) — cosmetic compression only.

## 6. Tests (grow `test:mb3d:weave`)

- Round-trip identity where exact: `A×1 B×1`, `A×3 B×1 C×1`, divider-intro case — Sequence → Rhythm →
  Sequence reproduces rows/dividers verbatim (via idempotence shortcut) and LUTs certificate-equal.
- Rhythm → Sequence: base-interleave (`I=5,S=2` + `I=5,S=4` → `A×2 B A×1 C`, 4 rows incl. duplicate);
  capped-layer intro → divider; minimal-period reduction (two layers I=2 phases 0/1 → cycle len 2).
- Refusals with exact reasons: `A×2 B×2` (uneven gaps), silent slot, cycle 33 (interval bound), co-prime
  2&5 with 3 layers (row budget), P > W_MAX.
- Property test: random valid counts drafts → if fitter says ok, certificate MUST pass (fuzz the
  disjointness argument); random rhythm layers → runsFromRhythm ok ⇒ certificate passes.
- Clamp-coherence: editor read-clamps == `BOUNDS` (a unit test importing both).
