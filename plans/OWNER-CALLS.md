# Owner calls

Decisions and checks that wait on the owner, one line each, numbered so he can answer
"close 3, 7" (or write the answer under the line, as he did on 2026-10-16). Deep zoom keeps its
own record: [`deep-zoom-shell/OPEN-CALLS.md`](deep-zoom-shell/OPEN-CALLS.md).

How this file is kept:
- A call is added when it is put to him, with the date; the line says enough to decide on, and
  gives a recommendation when there is one.
- When he answers, delete the line. His answer goes where it is acted on (the commit message,
  the plan, an ADR), not here. Renumbering is fine.
- Verify a line against the code before acting on it; the tree moves faster than this file.

## GMT

1. **Material source routing is gated on three choices:** Direct mode first and the path tracer
   later; the phone posture (at most two images, refraction off); how it leaves the dev-only Shader
   Compiler panel for a user "Advanced Material" section. (2026-06-21)
2. **The phantom engine.** `export const engine = getEngine()` at the bottom of
   `engine-gmt/engine/FractalEngine.ts` builds a whole engine when the module loads. Nothing imports
   `engine`, but the render worker imports the module and then builds its real engine
   (`renderWorker.ts`, grep `new FractalEngine`), so every worker runs two. The constructor
   subscribes to every `FRACTAL_EVENTS` channel and calls `bucketRenderer.init(this)`, so the
   unused one handles every uniform, config and camera event for the whole session.
   Recommendation: remove the line, check once that nothing reaches the engine before the worker
   builds it, run `smoke:boot` and one render. (2026-08-02 audit; explained 2026-10-16)

## Gradient Explorer

3. **The tray covers the set rail.** Faces hanging below the rail were rejected ("that isnt the
   solution"); you were still thinking. (2026-09-26)
4. **A band taller than one chunk at 1:1** (the ungrouped wall, big bands on a phone) fills as
   stacked column-major chunks. One grid would be cleaner but changes the 1:1 look and the keyboard
   cursor's model (`stepCursor`). You were not sure (2026-10-16). Recommendation: leave it until a
   user trips on it. (2026-10-04)

## mandelbulb_deepzoom (the standalone repo)

5. **You said yes to all four** (2026-10-16): merge `kernel-perf` into its `main` and push; hit
   landing on (then mirrored in `pertMarchJS`); BLA tolerance 1e-3; soften the "First ever!" GitHub
   description. Held, because your standing rule is that this page is FROZEN as the deep-zoom shell's
   reference: never edit it or its suites. Hit landing and the BLA change are edits. Does the yes
   lift the freeze, or should only the merge, the push and the description go ahead?

## Export and interop

6. **FBX camera rig: the After Effects Euler-order check** is still owed (C4D validated it). Needs you in AE.
7. **MB3D importer: DsyneGrafix DE** stays deferred (its IdesFormula slot has no analytic derivative). Your call.
