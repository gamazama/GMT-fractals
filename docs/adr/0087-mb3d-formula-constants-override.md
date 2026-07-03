# ADR-0087: MB3D formula `[CONSTANTS]` override the abs/sign-mask offsets (Cp0/Cp8…)

**Date:** 2026-06-28
**Status:** Accepted. Supersedes the U6 "Cp0/Cp8 is *always* the abs/sign bit-mask" assumption (commit `91b97f5`); corrects the "Cp0/Cp8 mask-LOAD ceiling" framing in ADR-0083 and `EXECUTION-STATUS.md`.

## Context

MB3D's per-formula constant buffer (`pConstPointer16`) is laid out in two directions from a base
pointer (`edi` = PVar):
- **Negative offsets** (`Cm8`, `Cm16`, …): the `0.5` prelude + the slot's option values.
- **Positive offsets** (`Cp0`, `Cp8`, …): the `PAligned16` fixed table is `FastMove`'d in first
  (CustomFormulas.pas:334) — `Cp0`/`Cp8` = abs AND-mask `0x7FFF…`, `Cp80`/`Cp88` = sign XOR-mask
  `0x8000…`, and `Cp16`+ = fixed doubles. **U1** (ADR-0083 correction) bakes those fixed doubles;
  **U6** decodes `fmul [Cp0]`/`[Cp8]` as `abs()` and `fmul [Cp80]`/`[Cp88]` as negate (the
  abs/negate-via-bit-mask trick capstone mis-reads as a scalar multiply).

What U6 missed: a custom formula's `[CONSTANTS]` block (CustomFormulas.pas:886) is written
**from `Cp0` upward**, each value advancing the pointer by its type size (Double/Int64 = 8 B,
Single/Integer = 4 B), **overwriting the PAligned16 defaults at those offsets.** So for a formula
that declares `[CONSTANTS]`, `Cp0`/`Cp8`/… hold the formula's *own* declared constants — NOT the
abs/sign mask. **195 of 460 corpus formulas declare a `[CONSTANTS]` block.**

The bug surfaced visually in **Wada basin** (`PolyFold-symIFS`). Its `[CONSTANTS]` are
`1/2π, 2π, π/2, π/180` → `Cp0, Cp8, Cp16, Cp24`. The angular symmetry fold is
`snapped = round((π−θ)·Order/2π)·(2π/Order)` — true *Order*-fold (5-fold) symmetry. U6 turned the
`× 1/2π` (`fmul Cp0`) and `× 2π` (`fmul Cp8`) into `abs()`, dropping both 2π factors, so the snap
collapsed from `2π/Order ≈ 1.26 rad` to `1/Order = 0.2 rad` → ~32 sectors instead of 5 → the fold
rendered ~40 overlapping spheres in a ring (a torus) instead of the reference's 6-sphere basin.

The cross-check did **not** catch this: it seeded `Cp0`/`Cp8` randomly (treating them as mask
tokens) and the interpreter *also* mirrored U6's `fmul Cp0 → abs`, so both sides did the same wrong
`abs()` and matched. The token was verified against itself, not against the real constant — the same
blind-spot the U1 PAligned16 lesson called out.

## Decision

**Parse each `.m3f`'s `[CONSTANTS]` block, map it to byte offsets (Cp0 upward, type-strided), and at
those offsets emit the REAL constant — never the abs/sign-mask decode.**

- **Decompiler (`decompile.mjs`):** `decompileFormula(bytes, { constants })`. `memVar` returns the
  formula's constant as a GLSL **literal** for any positive offset the `[CONSTANTS]` cover. Because
  the U6 `fmul Cp0/Cp8 → abs` check matches on the token name (`'Cp0'`), baking a literal naturally
  bypasses it → the body emits `* 0.159154943` instead of `abs()`.
- **Cross-check (`xcheck.mjs`):** `interpret(ins, vars, consts, constMap)` gates the `fmul`/`andpd`/
  `xorpd` abs/negate mirror OFF for any offset the `[CONSTANTS]` cover; the seed (`generate-library`/
  `corpus-check`) overrides `C['p<off>']` with the **real** declared value, so the gate now *verifies*
  the constant instead of blind-matching a shared random.
- **Discrimination is per-offset:** only offsets a formula's `[CONSTANTS]` actually reach are
  overridden. A formula with 1 constant keeps `Cp0` = its constant but `Cp8` = the abs mask. A
  formula with NO `[CONSTANTS]` is entirely unchanged — U6/U1 stay correct for it.
- **App side needs no change:** the constant is baked into the decompiled body as a literal, so
  `slotTranspiler`/`constPacker` resolve nothing new; remaining `Cp` tokens (PAligned16 fixed
  doubles, sign masks beyond the constant range) resolve as before.

## Consequences

- **88 of the 293 shipped bodies changed** (all 88 declare `[CONSTANTS]`; 0 added, 0 removed). This
  deliberately breaks the "byte-identical, additive-only" invariant the prior decompiler changes held
  — correctly: those 88 were rendering with the wrong `abs()` substituted for real constants. Corpus
  stays **293 / 0 mismatch**, now verifying the real constants.
- **Corpus scenes faithful 28 → 33.** The whole "Cp0/Cp8 mask-LOAD ceiling" residual (ADR-0083 /
  tracker) was this bug, not a permanent wall: `Wada basin` (now the correct 6-sphere basin),
  `AkuraPare` (`_ngon` hexagonal ziggurat), `Jost1` (`_PolyFold-sym` temple), `Virtual tubes`
  (`foldinghexIFS`), `HalTenny` (`Riemann2`) all import. `Recycledrelatives` stays a separate
  fragmented-iso-surface residual (its `ABoxModKali` body changed but the fan is a DE-fidelity gap,
  not a constants gap).
- **Certified scenes re-GPU-verified, no regression:** AureliusCat / material colors / Theli-At are
  byte-identical (their formulas declare no `[CONSTANTS]`); Abominog unchanged.
- **The visual gate matters here.** Cross-check 293/0 held *both* before and after — the bug was only
  visible on the GPU vs the MB3D ref. Decompiler changes that touch the mask/const decode must be
  GPU-re-certified, not just corpus-gated.
