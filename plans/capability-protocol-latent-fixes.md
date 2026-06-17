# Latent Formula Issues — Pre-P0 Fixes

**Status**: Research complete; fixes pending implementation
**Drafted**: 2026-05-25 via three parallel investigations
**Consumer**: Implementer of pre-P0 fixes (mechanical) + user (visual smoke testing)

These 3 issues were surfaced by the P1 classification sub-investigation. User decision (2026-05-25): fix all three before P0 implementation begins.

---

# Issue 1: PseudoKleinian family has no Julia mode — REVERTED 2026-05-25

**Status**: Reverted after user smoke. Architectural decision: formulas with an existing static-vec3 offset parameter (Shift / C / C Shift) don't get a separate Julia mode — adding one would be a per-iter `if (uJuliaMode > 0.5) q += c.xyz` branch that's functionally redundant with the existing slider. PseudoKleinian family stays `juliaType` undeclared / `'none'`. The latent "feature gap" was correctly diagnosed but the resolution is "no, we shouldn't add it" rather than "yes, plumb it through".

(Original investigation preserved below for reference, but the recommended fixes are NOT shipped.)

---

# Issue 1: PseudoKleinian family has no Julia mode (ORIGINAL INVESTIGATION)

## Diagnosis

`PseudoKleinian`, `PseudoKleinianAdv` (exports as `PseudoKleinian06`), `PseudoKleinianMod4` all have a per-iteration static translation (`q += uVec3A` or `z.xyz += uVec3C`) that is structurally identical to what `juliaType: 'offset'` provides via `c.xyz`. The Kleinian siblings (`Kleinian`, `KleinianJos`, `KleinianMobius`) all inject `c.xyz` alongside their static offsets. The three PseudoKleinian variants were missed during the 2026-04-08 juliaType annotation sweep (`stable` commit `0c06f36`).

**Verdict**: oversight, not intent. PseudoKleinianAdv's own header comment describes `vec3C` as "Julia constant (shift per iteration)" — the author thought of it as Julia but never wired it through `c.xyz`.

## Fixes

### `dev/engine-gmt/formulas/PseudoKleinian.ts`
- Add `juliaType: 'offset',` to definition (after `description`)
- Change body: `q += uVec3A;` → `q += uVec3A + c.xyz;`

### `dev/engine-gmt/formulas/PseudoKleinianAdv.ts`
- Change `juliaType: 'none',` → `juliaType: 'offset',`
- Change body: `z.xyz += uVec3C;` → `z.xyz += uVec3C + c.xyz;`

### `dev/engine-gmt/formulas/PseudoKleinianMod4.ts`
- Change `juliaType: 'none',` → `juliaType: 'offset',`
- Change body: `q += uVec3A;` → `q += uVec3A + c.xyz;`

## Risk
Zero. Each formula already does the algebraic operation `q += <constant>` per iteration; `c.xyz` is just an additional translation in the same coordinate frame. When Julia is off, `c.xyz = 0`, so existing presets render identically.

## Visual smoke
For each formula: enable Julia mode, drag the Julia constant slider, confirm the attractor responds with morphology drift (not mush, not freeze).

## P1 classification update needed
These 3 formulas flip from `c-constant: NO` to `c-constant: YES`. Update `dev/plans/capability-protocol-p1-classification.md` to reflect the post-fix state.

---

# Issue 2: KleinianJos / KleinianMobius smoothiter silently broken — REVISED 2026-05-25

**Status**: Smoothiter side-channel shipped, formula REVISED after first smoke pass. Original investigator-recommended `iter + clamp(-log2(DF) * 0.05, ...)` saturated against HYBRID FIX because `iter` always equals `uIterations` for non-escaping Kleinians — resulted in iteration mode looking like orbit-trap mode and raw-iter mode showing nothing. Revised to `clamp(-log2(max(DF, 1e-30)) * 0.3, 0.0, uIterations - 1)` — drops `+iter`, scales up to 0.3, clamps below the HYBRID FIX threshold. The 0.3 is still a starting guess; tune visually as needed.

---

# Issue 2: KleinianJos / KleinianMobius smoothiter (ORIGINAL INVESTIGATION)

## Diagnosis

Both formulas use a private DE accumulator (`kj_DF` / `ks_DF`) instead of writing `dr`. This is correct DE math — the standard `dr *= scale` recurrence overshoots for the Kleinian 2-cycle, so a custom `getDist` with a 2-cycle min is required. But the side effect is that `dr` stays at `1.0` and smoothiter coloring modes (1/7/9) silently degenerate to flat fields.

The custom `getDist` already returns `vec2(de, iter)` — by convention (per `25_Formula_Dev_Reference.md:166`) this is the slot where smoothiter belongs. We can synthesize smoothiter from the existing Möbius accumulator without touching the DE.

**Verdict**: design-correct DE math + missed opportunity. The fix is cheap and uses zero new state.

## Fixes

### `dev/engine-gmt/formulas/KleinianJos.ts`

In `shader.getDist` (around lines 122-132), before the `return vec2(abs(de), iter);`:

```glsl
// Smoothiter side-channel: -log2(kj_DF) grows monotonically with Möbius
// refinement, giving modes 1/7/9 a real gradient. iter is also added so
// raw-iteration mode (7) still shows banding when DF saturates.
float smoothIter = iter + clamp(-log2(max(kj_DF, 1e-20)) * 0.05, 0.0, float(uIterations));
return vec2(abs(de), smoothIter);
```

(Replaces the existing `return vec2(abs(de), iter);`)

### `dev/engine-gmt/formulas/KleinianMobius.ts`

Same edit, substitute `ks_DF` for `kj_DF`.

## Risk
None for DE. The `0.05` scale factor is a starting guess for smoothiter normalization.

## Visual smoke (REQUIRED)
Set coloring mode to "Iterations" (mode 1) or "Raw Iterations" (mode 7) on a KleinianJos scene. Confirm a smooth gradient across the surface rather than a flat field. If the gradient is too flat, increase `0.05`. If it saturates (everything reads as max iter), decrease it. Target: smoothIter / uIterations should stay below ~0.99 for most pixels (the HYBRID FIX threshold in `MappingModes.ts:31`).

## P1 classification update needed
These 2 formulas flip from `writes-iter: NO` to `writes-iter: YES`. Update `dev/plans/capability-protocol-p1-classification.md`.

---

# Issue 3: MengerAdvanced juliaType mismatch

## Diagnosis

The formula declares `juliaType: 'none'` but its body has `if (uJuliaMode > 0.5) z3 += c.xyz;`. Git history confirms:

- `9386588` (initial v0.8.4 export, Sep 2024) — file created WITH the `uJuliaMode` gate
- `0c06f36` (2026-04-08, "Add juliaType annotations") — bulk sweep added `juliaType: 'none'` to MengerAdvanced, almost certainly by mistake while bulk-tagging

The gate is the original intent. The `'none'` declaration is a labelling error from the annotation sweep. With `'none'`, the Julia/Offset panel section is hidden, `uJuliaMode` stays 0, and the gate is dead code (except in the edge case where MengerAdvanced is primary and an interlaced secondary has non-none juliaType).

**Verdict**: pure labelling bug from the annotation sweep.

## Fix

`dev/engine-gmt/formulas/MengerAdvanced.ts:9`:

```diff
-    juliaType: 'none',
+    juliaType: 'offset',
```

One line. No body change needed.

## Risk
- GMF round-trip: safe. `juliaType` is formula metadata, never written into `.gmf` files.
- Default preset: `juliaMode` defaults to `false`, so the section appears closed by default — visually identical to today until user toggles.
- Compile/interlace: `uJuliaMode` uniform already exists; no engine changes.

## Visual smoke
Enable Julia mode on MengerAdvanced; drag the Julia constant slider; confirm attractor responds (should produce coordinate-space shift inside the IFS, similar to Coxeter's existing Julia behavior).

## P1 classification update needed
MengerAdvanced was already classified `c-constant: YES` (the table noted `?` then resolved YES with a note about the gate). After this fix the classification matches the declaration. Update the note in `dev/plans/capability-protocol-p1-classification.md`.

---

# Summary

Total: 6 files, ~10 edits, all low/zero risk. Three visual smokes required (one tuning task in #2).

After fixes ship:
- 3 of 5 latent issues from the P1 sub-investigation are closed
- 2 remain as documentation concerns (JuliaMorph iter-via-getDist verification — for P3; MandelTerrain dr-as-iter code comment — for P1)
- P1 classification artifact needs three small updates to reflect post-fix state
