# Formula Families / Archetypes — research output (build material for the AI Formula Kit guide)

> Produced by a verified read of `engine-gmt/formulas/*.ts`, `features/interlace/glslRewriter.ts` + `index.ts`, `types/capabilities.ts` (doc 35), and docs 24 & 25, on 2026-06-24. Source material for `learn/create-formula.astro` and the doc-drift fixes. NOT the final guide — distill/trim for the public page.

## How the engine calls your formula (shared mental model)

Every formula plugs into a fixed harness. The engine builds, *once per ray sample*:

```glsl
vec4 z = vec4(p_fractal, uParamB);                              // z.w seeded from paramB
vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));  // c = z (Mandelbrot) or (uJulia, paramA) (Julia)
float dr = 1.0;     // derivative accumulator
float trap = 1e10;  // orbit-trap running minimum
```

Then it loops up to `uIterations` times, calling your `loopBody` (`formula_X(z, dr, trap, c)`) once per iteration, with engine pre/post-rotation around it. After the loop it computes `r = getLength(z.xyz)` and calls the estimator (`getDist`) to return `vec2(distance, smoothIter)`.

Key consequence: **`c` is the only Julia channel, and `dr`/`trap`/`z` are the only outputs the renderer reads.** Each archetype uses them differently, and that difference is what makes it interlace-able or not, rotatable or not, recolorable or not.

Capability tokens (`shader.capabilities`) — exactly one `shape:*`, plus optional others:
- `shape:per-iteration` — engine owns the loop; you contribute one step. **Required for interlace.**
- `shape:self-contained` — you own a full internal loop and `break` the outer one. **Blocks interlace.**
- `iter:c-constant` — you read `c` meaningfully (Julia/offset works).
- `iter:shared-rotation` — you read/write `gmt_rotAxis/rotCos/rotSin`; needs save/restore during interlace.
- `estimator:cutting-plane` — you write `cp_dmin/cp_scale/cp_trap`.
- `render:writes-trap` / `render:writes-iter` — you populate `result.y` (trap coloring) / `result.z` (iteration coloring).

---

## Archetype 1 — Power fractals (Mandelbulb, Quaternion, Bristorbrot, Buffalo…)

Reference: `formulas/Mandelbulb.ts`. Canonical escape-time family (`z → z^p + c`). Gets every feature for free if you follow convention.

- **DR / DE:** analytic log estimator (Quality estimator **0**), no custom `getDist`. `dr = pow(r,p-1)*p*dr + 1.0`. Default `getDist = 0.5*r*ln(r)/dr`. Guard `pow(max(r,1e-10), p-1)`.
- **Julia:** `juliaType:'julia'` + `iter:c-constant`. Add `c.xyz` every iteration. **Do not branch on `uJuliaMode`** — the `c = mix(...)` already encodes it. `paramA` lands in `c.w` (4D slice).
- **Shared rotation:** plain Mandelbulb doesn't. If a variant folds/rotates, call `gmt_precalcRodrigues(uVec3B)` from **loopInit** (never preamble), set `usesSharedRotation:true` + `iter:shared-rotation`.
- **Interlace:** gold standard. `shape:per-iteration` + `iter:c-constant`. If you add mutable preamble globals, list them in `preambleVars` (`u[INITIALS]_name`).
- **Coloring:** `trap = min(trap, length(z3))` (positive). smoothIter auto from r/dr. Modes 2–8 free.

```glsl
void formula_MyPower(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 z3 = z.xyz;
    float r = length(z3);
    float power = uParamA;
    float rp1 = pow(max(r, 1e-10), power - 1.0);
    dr = rp1 * power * dr + 1.0;          // analytic DE derivative
    // ... your z^power map of z3 ...
    z3 += c.xyz;                          // c every iteration (Julia/Mandelbrot)
    z.xyz = z3;
    trap = min(trap, length(z3));         // positive trap
}
// loopBody: formula_MyPower(z, dr, trap, c);
// capabilities: shape:per-iteration, iter:c-constant, render:writes-trap, render:writes-iter
// juliaType: 'julia' | estimator default 0
```

---

## Archetype 2 — IFS / Box-fold (Mandelbox/AmazingBox, Menger, Sierpinski, polyhedra)

Reference: `formulas/AmazingBox.ts`, `MengerSponge.ts`, `SierpinskiTetrahedron.ts`. Folding fractals; distance from accumulated *linear* scaling.

- **DR / DE:** linear estimator, NOT log.
  - AmazingBox/sphere-fold → estimator **1** (`(r-1)/dr`), `dr = dr*abs(scale) + 1.0`.
  - Pure IFS (Menger/Sierpinski/polyhedra) → estimator **1** with `dr *= abs(scale)` (no +1), or cutting-plane (**5**).
  - Cutting-plane (CP) is the modern IFS DE and interlaces cleanly. Declare `supportsCuttingPlane:true` + `estimator:cutting-plane`, write `cp_dmin/cp_scale/cp_trap`. **Do NOT declare/init `cp_*` yourself or list them in `preambleVars`** — they're engine-owned shared globals; listing them makes the interlace renamer corrupt them.
  - Guard `scale == 1.0` (`scale = abs(scale-1.0)<0.001 ? 1.001 : scale`).
- **Julia:** `juliaType:'offset'` (or `'none'` for pure symmetric IFS like Menger). `c.xyz` is a constant translation (= Shift). Sierpinski gates it: `if (uJuliaMode>0.5) z3 += c.xyz;`.
- **Shared rotation:** common. If using `gmt_precalcRodrigues` (loopInit) + `gmt_applyRodrigues` (body), set `usesSharedRotation:true` + `iter:shared-rotation`. (AmazingBox/Menger inline a private mat2 rotation from `uVec3A` — no flag, but doesn't participate in the shared-rotation swap.)
- **Interlace:** supported (`shape:per-iteration`). CP composition rules:

  | Primary | Secondary | Estimator |
  |---|---|---|
  | CP-aware | CP-aware | CP (5) — coherent |
  | CP-aware | standard/power | Linear (1) |
  | standard | CP-aware | Linear (1) |

  Classic failure: `GSD + Menger` "dust" — caused by per-formula private DE accumulators; fixed by hoisting to shared `cp_*`.
- **Coloring:** `trap = min(trap, abs(z.x))` (AmazingBox) or `length(z3)` / `length(z3-c.xyz)`. Depth/angle (3,4) and Last-Length (8) shine.

---

## Archetype 3 — Kleinian / Möbius (KleinianMobius, PseudoKleinian, Apollonian)

Reference: `formulas/KleinianMobius.ts`. Conformal-inversion, **non-escaping limit sets**; DE from inversion scaling; needs custom DE in preamble globals. Most subtle per-iteration archetype.

- **DR / DE:** ships a **custom `getDist`**. Track inversion-scaling accumulator + last-two-iteration DE in preamble globals, reset in loopInit. `de = min(ks_de_prev, ks_de_curr)` handles 2-cycle oscillation.
- **Julia:** `juliaType:'offset'` + `iter:c-constant`. `c.xyz` is a per-iteration offset added at top of body.
- **Shared rotation:** KleinianMobius does its own twist (no flag). Flag if a variant uses the helper.
- **Interlace — danger zone:** Kleinians carry mutable preamble globals.
  - **MUST list every mutable preamble global in `preambleVars`** (`['ks_DF','ks_d','ks_d2','ks_de_prev','ks_de_curr','ks_xings']`). Omitting one → secondary reads the primary's same-named global → silently wrong shader, no compile error (dev-mode `console.warn` only). #1 interlace bug.
  - Naming `u[INITIALS]_name` (here `ks_*`). Helpers auto-prefixed; globals need the explicit list.
  - Custom `getDist` is NOT run for the interlace secondary (only loopBody is injected) → Kleinian shines as the **primary**.
  - `KleinianMobius`/`KleinianJos` are the two formulas without native `render:writes-iter` (synthesize smoothIter in custom getDist via Y-reflection crossing count).
- **Coloring:** `trap = min(trap, length(z.xyz))`. Iteration coloring must be **synthesized** (no escape radius) — don't expect modes 1/7 to just work.

---

## Archetype 4 — Self-contained SDE (MandelTerrain, JuliaMorph, V4 imports)

Reference: `formulas/MandelTerrain.ts`. Formula owns its entire loop; engine outer loop fires once then `break`s.

- **DR / DE:** compute DE inside the function; `getDist` is passthrough.
  ```glsl
  selfContainedSDE: true,
  loopBody: `formula_X(z, dr, trap, c); break;`,
  getDist: `return vec2(r, dr);`,   // r = abs(de) from z encoding, dr = smoothIter
  ```
  Run your own `for` loop capped by `int(uIterations)`.
- **Julia:** `juliaType:'julia'` but **you branch on `uJuliaMode` yourself** — engine `c=mix` is bypassed. Capability `iter:c-constant`.
- **Shared rotation:** N/A (can't interlace anyway).
- **Interlace — BLOCKED by design.** `shape:self-contained` ∈ `INTERLACE_REJECTS`; enforced declaratively (`InterlaceFeature.requires.rejects`) AND a hard early-return in `inject()`. Also disables Hybrid Box fold and engine Burning Ship (all assume many outer iterations). MandelTerrain supports Burning *internally*; engine-level toggle suppressed. **Don't promise interlace/hybrid/engine-burning.**
- **Coloring — the self-contained contract (encode every channel yourself):**

  | Mode | Renderer reads | You must |
  |---|---|---|
  | 0 — Trap | `result.y = trap` | `trap = min(trap, length(p))` — positive |
  | 1/7 — Iterations | `result.z = smoothIter` | pass normalized count via `dr`; `getDist: return vec2(r, dr)` |
  | 6 — Decomposition | `result.w = atan(z.y,z.x)` | encode angle into z.xy: `z = vec4(de_r*cos(a), de_r*sin(a), 0,0)` so `getLength(z.xyz)=abs(de)` |
  | 9 — Flow | `result.w + result.z` | do both 6 and 1 |
  | 8 — Potential | `result.y` magnitude | set trap to raw radius (overwrite only when colorMode==8) |
  | 2–5 — Position | world `p` | automatic |
  | 10–13 — Per-component | `g_orbitTrap` from z.xyz | angle-encoded z.xy keeps non-zero (acceptable) |

- **Trap quirk (engine-wide, lethal here):** `logTrap(t)=log(max(1e-5,t))*-0.2`. Negative/log-domain trap → all ≤0 clamps to 1e-5 → one flat color. Always positive raw distance.

---

## Comparison table

| Archetype | Estimator | juliaType | c usage | Shared rotation | Interlace OK? | Coloring |
|---|---|---|---|---|---|---|
| **Power** | Analytic log (0) | `'julia'` | iteration constant, added every iter (engine swaps via mix) | only if variant uses helper → flag | **Yes** (gold) | trap=min(length(z3)); smoothIter auto |
| **IFS/Box-fold** | Linear (1) or Cutting-plane (5) | `'offset'` / `'none'` | constant translation; often gated on uJuliaMode | common; flag if helper | **Yes**; CP↔CP coherent; mix→Linear; don't list cp_* | trap=min(abs(z.x)/length); depth/angle modes |
| **Kleinian/Möbius** | Custom getDist | `'offset'` | per-iteration offset | own twist; flag if helper | **Yes but fragile** — full preambleVars; secondary DE dropped (use as primary); no native writes-iter | trap=min(length(z)); iteration synthesized |
| **Self-contained SDE** | Passthrough getDist | `'julia'` (manual) | you branch on uJuliaMode | N/A | **NO** — blocked both slots; disables Hybrid + Burning | encode every channel; trap positive |

---

## Common mistakes by family (what a weak LLM gets wrong)

1. Wrong estimator: power→0, IFS→1 or 5, Kleinian→custom, self-contained→passthrough.
2. Forgetting `preambleVars` → silent interlace corruption (secondary reads primary's global). #1 bug.
3. Listing shared `cp_*` in `preambleVars` → renamer corrupts them. Declare `estimator:cutting-plane` instead.
4. Calling `gmt_precalcRodrigues` from preamble (assembled after) → call from loopInit; set the rotation flag/capability.
5. Negative/log-domain trap → flat color.
6. Branching on `uJuliaMode` in a per-iteration formula (engine already encoded it in c). Only correct in self-contained.
7. Wrong `juliaType`: 'julia'=true constant (power), 'offset'=translation (IFS/Kleinian), 'none'=ignores c.
8. Promising interlace/hybrid on self-contained (hard-blocked) — document the loss.
9. Expecting iteration coloring to work on non-escaping (Kleinian/self-contained) — must synthesize.
10. Scale-1.0 degeneracy in IFS.
11. paramA/paramB double-wiring (paramB→z.w, paramA→c.w in Julia).

---

## Doc drift found (feed into the doc-audit fixes for docs 24/25)

1. **Capability tokens absent from doc 25.** Doc 25 §3.7–§3.9 still teaches the legacy booleans (`selfContainedSDE`/`usesSharedRotation`/`supportsCuttingPlane`) as the contract. Per doc 35 + ADR-0059, the `deriveLegacy` shim was DELETED in P8; `shader.capabilities` is REQUIRED (`FractalRegistry.register()` throws without it). Booleans are `@deprecated`, GMF-back-compat only. Update §3.7–§3.9 to lead with `capabilities`, demote booleans to "legacy/GMF-only."
2. **Duplicate `### 3.8` in doc 25** (lines 289 and 299: usesSharedRotation AND getDist). getDist should be §3.9.
3. **Interlace blocking enforced two ways, only one documented.** Doc 24 predates the capability protocol; now `InterlaceFeature.requires.rejects=['shape:self-contained','shape:modular']` drives UI gating and the `inject()` early-returns are the runtime backstop. Add a note.
4. **`render:writes-iter` exception underspecified.** KleinianJos/KleinianMobius (2/43) synthesize smoothIter in custom getDist. Doc 25 §3.3a implies modes 1/7 uniformly available via dr — flag that non-escaping per-iteration formulas synthesize iteration count too.
5. **§3.3a "Examples" wrongly lists KleinianMobius as self-contained SDE** (doc 25 line ~203). KleinianMobius is `shape:per-iteration` (normal loopBody, no break, custom getDist + preamble globals) and is interlace-capable. Grouping it under self-contained would mislead an author into adding `selfContainedSDE:true` (breaking interlace). Drop it or move to a "custom-getDist per-iteration" example. The shared trait was "mutable preamble-global DE + custom getDist," not "self-contained."
