# Per-iteration state for MB3D formulas — research findings

**Question:** what would the GMT engine need to support the MB3D formulas that keep
*per-iteration state* (the Amazing Box VS / SmoothFold / VaryScale family, Amazing Surf,
the HeightMap IFS, ~100+ formulas — the bulk of the still-unsupported corpus)?

**Answer: the GMT engine needs NOTHING. It already supports per-iteration scratch state.**
This is a decompiler-side feature, not an engine change. (2026-06-25)

## What the MB3D formulas need

MB3D's `TIteration3D` struct carries scratch the formula reads+writes across iterations.
Disassembly of `ABoxMod1` / `ABoxSmoothFold` shows the shape:
- `mov esi,[ebp+8]` → PIteration3D; `add esi,0x70` (or `add edi,0x80`) → a **scratch region**
  inside the struct (≈ `PIter+0x70..0x90`).
- `[scratch+0x48]` = a persistent float (the smooth-fold accumulator / previous-z), read and
  written each call.
- `[scratch+0x50]` = an **iteration counter**: `cmp [scratch+0x50],0; jg L; inc [scratch+0x50]; <init>`
  = "on the first iteration, initialize the accumulator." (GMT's kernel already exposes the
  loop index `i`, so this is just `if (i == 0) { … }`.)
- Some also use **internal function calls** (`call`/`ret`) — e.g. `ABoxSmoothFold` calls an
  exponentiation-by-squaring helper.

## Why GMT already supports it — the Phoenix precedent

GMT's `FractalDefinition.shader` already has the seam. **Phoenix** (`engine-gmt/formulas/Phoenix.ts`)
keeps two iterations of history as persistent scratch — the exact pattern MB3D needs:

```ts
// Phoenix.ts
function: `void formula_Phoenix(inout vec4 z, inout float dr, inout float trap, vec4 c,
                                inout vec4 z_prev, inout float dr_prev,
                                inout vec4 z_prev2, inout float dr_prev2) { … z_prev2 = z_prev; z_prev = …; }`,
loopBody: `formula_Phoenix(z, dr, trap, c, z_prev, dr_prev, z_prev2, dr_prev2);`,
loopInit: `vec4 z_prev = vec4(0.0); float dr_prev = 0.0; vec4 z_prev2 = vec4(0.0); float dr_prev2 = 0.0;`,
preambleVars: ['z_prev', 'dr_prev', 'z_prev2', 'dr_prev2'],
```

How it works (confirmed by reading `shaders/chunks/de.ts` + `engine/ShaderBuilder.ts`):
- The kernel DE loop (`de.ts`, `for (int i…)`) carries `z`, `dr`, `trap` as inout across iterations.
- Anything a formula declares in **`shader.loopInit`** is spliced in **before** the loop (`${loopInit}`
  at `de.ts:54`), so those vars **persist across iterations** too.
- The formula's `function` takes them as extra `inout` params; `loopBody` passes them.
- **The formula function signature is purely shader-internal** — no `UniformManager`, worker
  contract, or capability parse inspects the parameter list (only `formulaBrief.ts` regex-extracts
  the *name*). So adding `inout vec4 mb3dState` to a formula is a **pure GLSL change**. Zero engine,
  worker, uniform, or capability modifications required. Existing formulas are untouched.

## What the importer would emit

`emitFusedHybrid` already assembles `function` + `loopBody`. For a state-using slot it would just
also emit `loopInit` (today it doesn't set one) declaring the scratch, e.g.:

```glsl
// shader.loopInit
vec4 mb3dS = vec4(0.0);   // the formula's scratch region, persisted across iterations
// shader.function
void formula_X(inout vec4 z, inout float dr, inout float trap, vec4 c, int i, inout vec4 mb3dS) {
  if (i == 0) { mb3dS.x = /* init */; }
  … reads/writes mb3dS.x … ;
}
// shader.loopBody
formula_X(z, dr, trap, c, i, mb3dS);
```

(Width: most use 1–2 floats; a `vec4` covers nearly all. A `float mb3dS[N]` array handles the rare wider ones.)

## The real work — all on the decompiler side

The engine is ready; the decompiler is what needs three additions (in `plans/mb3d/decompiler/`):

1. **GP-register offset tracking** (the foundation, and the master key for several stalled classes).
   The scratch base is reached by `add esi,0x70` — pointer arithmetic on a register. The decompiler
   currently tracks PVar/PIter as fixed registers; it needs to track `reg = PIter + K` so that
   `[reg+off]` resolves to scratch-region offset `K+off`. This same capability also unlocks computed
   const addresses (`mov eax,ebx; sub eax,0x10; fcom [eax]`) and loop counters — i.e. it's the
   prerequisite for loops and the `_MaxClipping`-style optimized formulas too.
2. **Scratch-region mapping**: `[scratchBase+off]` → `mb3dS.x/y/z/w` (or `mb3dS[k]`), declared in
   `loopInit`; the first-iteration `cmp [counter],0` guard → `if (i == 0)`. (`i` is already passed.)
3. **Internal function inlining** (`call`/`ret`): decompile the callee once and inline it at the call
   site (the FPU stack is the argument/return channel). Needed for `ABoxSmoothFold`'s pow-by-squaring
   and ~15 other `*fast`/`*Pow2` formulas.

Each stays **cross-check-gated** (the x87 interpreter must gain the same `add`-tracking, scratch
read/write, and call/ret execution), so any mistranslation is flagged and never shipped — same safety
model that kept all 163 current formulas at 0 mismatch.

## Scope & recommendation

- ~106 formulas touch the scratch region, ~15 use internal calls, ~13 use both (the ABox
  SmoothFold/VS + HeightMap families) — together the largest remaining tranche.
- The unlock order is **GP-register offset tracking first** (it's shared infrastructure for state,
  loops, and computed addresses), then scratch-mapping + first-iter-init, then call/ret inlining.
- **Bottom line:** the per-iteration-state concern that looked like an engine limitation is not one —
  GMT's `loopInit`/`preambleVars`/`inout` formula contract already does it (Phoenix proves it). The
  remaining effort is a decompiler upgrade (GP-register abstract interpretation), which is also the
  master key for the loop and optimized-code classes. It's a substantial but well-defined next phase,
  with the cross-check guaranteeing correctness throughout.
