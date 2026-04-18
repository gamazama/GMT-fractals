# V4 Formula Workshop — architecture rethink prompt

Drop this into a fresh Claude session to get independent architectural thinking, unanchored by the current session's conclusions.

---

## Context

You're working on GMT (Fractal Explorer), a real-time 3D fractal renderer in React + TypeScript + GLSL. The "Formula Workshop" lets users import foreign fractal formulas (Fragmentarium `.frag` files, DEC format) into the engine. We've built two pipelines (V3 and V4) and are dissatisfied with both. Need fresh architectural thinking.

## Read these in order before reasoning

1. `docs/25_Formula_Dev_Reference.md` §3 — how GMT's native formulas work. Specifically §3.3a (self-contained SDE pattern) + §3.4 (per-iteration).
2. `shaders/chunks/de.ts` — the engine's `map()` outer loop. Note where features inject (hybrid fold, pre/post rotation, etc.).
3. `features/geometry/index.ts`, `features/interlace/index.ts`, `features/core_math.ts` — how features interact with formulas. Note that features bail when `selfContainedSDE: true`.
4. `formulas/JuliaMorph.ts` + `formulas/MandelTerrain.ts` — native self-contained examples.
5. `formulas/KleinianMobius.ts` — native per-iteration example. Note how it uses `preamble` + `preambleVars` + `loopInit` for cross-iteration mutable state.
6. `features/fragmentarium_import/reference/Examples/Historical 3D Fractals/Mandelbox.frag` and `.../QuaternionJulia.frag` — representative Fragmentarium formulas.
7. `docs/26_Formula_Workshop_V4_Plan.md` — the plan we executed (including honest reckoning at the top).
8. `docs/21_Frag_Importer_Current_Status.md` — honest measurement numbers.

## The core problem

Fragmentarium formulas assume they own their full iteration loop:

```glsl
float DE(vec3 p) {
    // pre-loop state
    for (int i = 0; i < Iterations; i++) {
        // loop body — state carries via locals
    }
    // post-loop transforms
    return distance;
}
```

GMT's native formula convention assumes the engine owns the outer loop (except for `selfContainedSDE: true` formulas):

```glsl
void formula_X(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    // ONE iteration's work
}
```

Engine features (interlace, hybrid box fold, burning ship, pre/post rotation) only work when the engine's outer loop runs many times. They inject operations *between* outer iterations.

## Where V3 and V4 landed

**V3** tries to extract the Fragmentarium loop into engine per-iteration shape via regex-based surgery. 46 formulas succeed. 120 hit one of 7 bailout heuristics and fall back to a "full-DE" mode that corrupts `z` to force engine bailout after one call — effectively self-contained but without the `selfContainedSDE` flag, so engine features inject anyway and silently misbehave.

**V4** (current) emits every formula as `selfContainedSDE: true` with the user's DE body passed through nearly verbatim. 360 formulas pass end-to-end verification. Cleaner code but zero support for interlace/hybrid-fold/burning-ship (engine features are suppressed by selfContainedSDE flag).

## Honest measurement

| pipeline | total pass | with GMT feature support | code |
|----------|-----------:|------------------------:|-----:|
| V3       | 216        | 46 (per-iter)           | ~3100 LOC |
| V4       | 360        | 0                       | ~1500 LOC |

V4 handles more formulas but lost the feature-compat subset. "Strictly better than V3" is not achieved.

## The design question

Is there a fundamentally better architecture than either V3's extract-and-rewrite or V4's wrap-and-suppress?

Specifically think about:

1. Could the engine's interaction model be redesigned so Fragmentarium formulas fit naturally without extraction? (plugin interface, IR-based compilation, GLSL macros inserted *inside* the formula's own loop, etc.)

2. Are there architectural invariants that truly force the impedance mismatch, or is the mismatch incidental?

3. What's the minimum change to the engine side that would let V4 support interlace/fold/burning/rotation on its 360 self-contained formulas without extracting them to per-iteration?

4. Is per-iteration extraction actually necessary in 2026? V3 built it because the engine's feature injection only worked at the outer loop. If we change where feature injection happens, extraction might become obsolete.

5. Are we thinking about this wrong? Maybe imported formulas should live in a different render path entirely.

## Constraints

- Engine performance must not regress. Main loop runs 100-500 times per pixel per frame.
- Compile times must stay reasonable (<2s for full shader).
- Native formulas must keep working unchanged.
- License GPL-3 — can study Fragmentarium source (`github.com/Syntopia/Fragmentarium`).

## One candidate idea raised in this session (evaluate skeptically)

The current session floated **inner-loop injection**: V4 inserts template markers (`FRAG_ITER_PRE(z, i)`, `FRAG_ITER_POST(z, i)`) inside the user's loop body. Engine features define those macros with per-iteration operator code. Default macros are empty. Preserves the formula verbatim while giving engine features a place to hook. Handles burning ship / hybrid fold / pre-post rotation cleanly. Doesn't handle interlace (still needs two synchronised step functions).

Evaluate this idea against alternatives. It may be the right answer or may have gaps the current session missed.

## What to produce

A written proposal evaluating at least 3 architectural options, with honest tradeoffs, rough LOC/complexity estimates, and a recommendation (which may be "extend V4 as planned" if that's genuinely the best option after careful analysis). Don't anchor on what was already proposed in docs/26 or the current session's conclusions — those may be wrong.

~30-60 minutes of reading + reasoning. Don't write code.
