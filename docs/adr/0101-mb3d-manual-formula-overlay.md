# ADR-0101: Hand-port bit-hacking MB3D formulas via a manual overlay, don't teach the decompiler

**Date:** 2026-07-13
**Status:** Accepted. Extends ADR-0083 (MB3D importer) — the corpus generator stays the source of truth for everything the offline decompiler can lift; this adds a repo-owned overlay for the few formulas it structurally cannot.

## Context

A handful of MB3D `[CODE]` formulas fold coordinates by editing the raw IEEE-754 bits of the
double — masking the exponent field, extracting/re-injecting the sign — instead of with ordinary
float math. **Amazing Surf 2** is the canonical case: its "infinitized" fold remaps a magnitude
`±1.m·2^k` to its significand `1.m ∈ [1,2)` (a tent fold in log-space) via
`and [ptr+4],0xfff00000` / `xor [ptr+4],0x3ff00000`, then rescales by `±2^k`.

The offline decompiler (`H:/GMT/stuff/mb3d-decomp`) models a numeric FPU/SSE stack, not
dword-level bit surgery, so it emits `// UNHANDLED` for those branches (two `jae` in Amazing Surf 2)
and `generate-library.mjs` filters the formula out. A corpus scan (`0xfff00000`/`0x3ff00000`/
`0x000fffff`/`0x00100000` immediates) found **exactly 1 of 460 formulas** does exponent-surgery —
simple sign flips (`and 0x80000000`) are already handled by the SSE2 abs/negate mask decode (ADR-0083 U6).

Teaching the decompiler a general bit-lift path was rejected. Its trust model is an *independent*
x87 interpreter (`xcheck.mjs`) that runs the real bytes in JS float64 and must agree with the emitted
GLSL at 0 mismatch. A shader bit-port runs in float32 (different layout, different rounding), so the
0-mismatch gate is structurally unreachable — unless the interpreter is also made to approximate in
float32, at which point it stops being an independent referee and becomes the "mutually-consistent-
but-wrong" trap that already cost time twice (ADR-era `_updateC2` swap-on-equality; the dropped
`bFirstIt++`). Losing the referee *for a class* is worse than not covering the class, and the payoff
is one formula.

## Decision

**Hand-port the formula and register it in a repo-owned overlay, keeping the decompiler and its
cross-check referee untouched.**

- The fold is a **float32 transliteration** of the x87 bit surgery (`floatBitsToUint`/`uintBitsToFloat`;
  float64 `0x3ff00000`/`0xfff00000` → float32 `0x3f800000`/`0xff800000`; the LSB-of-exponent sign
  trick bit20→bit31 becomes bit23→bit31). `precision highp int` (`shaders/chunks/uniforms.ts`)
  guarantees exact 32-bit ops.
- **Verified offline, byte-exact**, against a float64 DataView oracle transcribed line-by-line from
  the disassembly: maxAbsErr `1.9e-7` (float32 rounding only) across the input range, with `x=0` /
  denormal / large / fiddler-bend edge cases all matching. This replaces the cross-check the corpus
  gate would have run — the referee is the real double semantics, not a second approximation.
- Only the two fold blocks are hand-written; the scale-multiply and the rotation / sphere-inversion
  DE / c-add tail are the decompiler's own faithful GLSL, so the existing pipeline still packs every
  option constant (`Cm40`=Scale, `Cm80`=fiddler, `Cm44..76`=Rotation1 matrix, `Cm16/24/32`=SI-fold).
- The overlay lives in `engine-gmt/utils/mb3d/mb3dFormulaLibrary.ts`: it spreads manual entries over
  the generated `decompiled-formulas.ts` maps (manual wins on collision) and re-exports the
  `DECOMPILED_*` names. All consumers (slotTranspiler, emitFusedHybrid, loadMB3DScene, mb3dCatalog)
  import from the overlay, so hand-ports survive regeneration and appear in the catalog automatically.

## Consequences

- Amazing Surf 2 is a supported formula: transpiles `decompiled` (no leftover `Cm`),
  params exposed (Scale/Min R/FoldXY/Rotation1/Fold fiddler), catalogued under "Boxes & Folds".
  Renders coherent infinitized-fold geometry on GPU (nonBlack ≈ 0.4, σ ≈ 80, 0 NaN, no compile error).
- **DE estimator override (owner-verified):** its source DE (`r/dr`) maps to estimator 2 ("Pseudo (Raw)")
  but renders correctly only as estimator 4 ("Linear (Offset 2.0)", `(r-2)/dr`) — the same empirical
  divergence the intern Amazing Box carries (force-routed off `r/dr`). Applied via
  `MB3D_DE_QUALITY_OVERRIDES` in the overlay, merged after `mapDEMeta`. The overlay is now the home
  for both hand-ported bodies AND their DE-quality quirks; new hand-ports add one entry each.
- The overlay is the home for any *future* bit-hacking formula: hand-port + offline byte-exact verify,
  never a decompiler capability. If the count ever grows past a handful, revisit — but three or four
  hand-ports still beat poisoning the referee.
- `floatBitsToUint`/`uintBitsToFloat` are now used in shader output (previously unused). WebGL2-core;
  validated on ANGLE-SwiftShader. Final aesthetic check is the owner's real-GPU render (unchanged workflow).
- Gates: typecheck 0, test:mb3d 24/24, test:mb3d:weave 318/318.
