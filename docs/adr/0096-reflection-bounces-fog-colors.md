# ADR-0096: Real multi-bounce Direct reflections + reflected-segment fog + gated accurate colours + importer mapping

**Status:** Accepted — 2026-07-10. Branch `feat/weave-core`. Third slice of the MB3D reflection
study (ADR-0094 faithful march, ADR-0095 candidate recovery); closes the remaining owner-picked
items from that study's queue.

> **Update 2026-07-10 (bounce loop emission-gated; decision unchanged):** the unconditional
> `for (int b …)` wrapper regressed the default Raymarched cold compile ~4.4s → ~42s. Measured
> root cause (owner machine, D3D11/ANGLE, cold `gpu=`): wrapping the shade body — which inlines
> the `[loop]`-bounded 128-step reflection march — in an outer `for` trips an fxc nested-loop
> pathology costing **+34s even at `MAX_REFL_BOUNCES = 1`** (42s with wrapper, 8s without, same
> body). Refuted along the way: the inner march is NOT unrolled (bound 128→32 = flat), and the
> UI cascade fires exactly ONE GPU compile (the "Rebuild ×2" console lines are change-detection
> logs, not compiles). Fix: `getReflRaymarchShading(multiBounce)` emits the loop wrapper only at
> `bounces ≥ 2`; the default emits the straight-line single-bounce form (behaviour-identical —
> at 1 bounce `lastBounce` is constant-true, the continuation/breaks were dead). The "compiles
> to exactly the former single-trace body" claim below now holds by construction, not by hoping
> fxc folds the loop. Multi-bounce (2–3) still pays the wrapper knowingly, per the
> compile-cost-rides-quality-paths rule. Measured costs + protocol notes:
> `docs/policy/shader-compile-optimization.md` §2.6.2.

## Context

Three gaps remained against MB3D's `CalcSR.pas` reflection pass:

1. **The 'Max Bounces' param was dead.** `MAX_REFL_BOUNCES` was emitted as a define and
   `uReflBounces` declared, but nothing consumed either — Direct-mode reflections were
   single-bounce at any setting (the control silently recompiled for nothing). Only the path
   tracer's own `uPTBounces` ever did anything. MB3D recurses to `SRreflectioncount` with
   throughput attenuation and a luma early-exit.
2. **Reflected hits ignored fog.** The atmosphere post-process fogs the whole pixel by the
   *primary* travel `d`, so the camera→reflector segment was covered but the reflected segment
   was not — reflections of distant geometry read pasted-on/too crisp in foggy scenes. MB3D
   re-fogs reflected hits at their own depth.
3. **Reflected surfaces coloured from the gradient default.** The march returns geometry-only
   `DE_Dist` data (trap channels zeroed); orbit-trap-coloured scenes reflected the wrong colour.
   MB3D fully re-colours reflected hits (`RMdoColor`).

## Decision

**Multi-bounce (Whitted continuation loop).** `REFL_RAYMARCH_SHADING` wraps its trace+shade body
in `for (int b = 0; b < MAX_REFL_BOUNCES; b++)` — the define now real, driven by the existing
compile-gated `bounces` param (1–3, Engine panel, Raymarched section; in Direct mode this is the
reflection-bounce control, `uPTBounces` remains the PT integrator's). Per bounce:

- Throughput `×= r_F · uSpecular` (the hit's Schlick Fresnel × material specular — GMT's twin of
  MB3D's `tAbsorb ×= specular colour`), luma early-exit at 1e-3 (MB3D: 1e-4, CalcSR.pas:352).
- Secondary bounces are **deterministic mirrors** — VNDF jitter applies to bounce 0 only, so
  extra bounces add zero sampling noise (the MB3D property).
- The specular env lobe (`r_envSpec`) is added **only on the terminating bounce**; on earlier
  bounces the traced next ray *is* that lobe (double-count guard). Diffuse env fill stays per hit.
- A recovered low-confidence hit (`reflFade < 1`, ADR-0095) terminates the chain — a faded
  near-graze is no basis for another mirror ray.
- The view-cone threshold continues across bounces (`reflPathDist += hitD` feeds `dPrimary`), and
  the next origin uses the same bias recipe as bounce 0. Per-bounce dither seeds are offset
  (`+0.31·b`) to decorrelate AO/shadow noise.
- `bounces: 1` (default) compiles to exactly the former single-trace body; each extra bounce
  unrolls another trace+shade — compile cost rides the already-quality-gated Raymarched mode,
  per the standing rule (compile-heavy = quality path only). The vestigial `uReflBounces`
  uniform is dropped.

**Reflected-segment fog.** Each bounce's hit colour is fogged by its own segment travel with the
atmosphere ramp (`smoothstep(uFogNear, uFogFar, hitD) · uFogIntensity` toward `uFogColorLinear`)
before the firefly clamp. Composes with the post-process fog of the primary segment; misses were
already fogged via `applyEnvFog`.

**Accurate colours (gated).** New `accurateColors` boolean on the reflections feature (compile
param, default off): the march gains a single exit point, and the gate emits ONE full `DE()` call
there filling `refHit.yzw` with true trap/iter/decomposition data (the march itself stays on
geometry-only `DE_Dist`). Off = no extra map() call site, byte-identical march — same TS-level
emission-gate pattern as the refine gate (kernel.ts invariant).

**Importer mapping.** `parseMB3D.ts` now reads `SRamount` @332, `bCalcSRautomatic` @336,
`SRreflectioncount` @337; `emitFusedHybrid.ts` maps them next to the DEstop/RStop block: bit0
(auto-calc = artist made reflections part of the render) AND `SRamount > 0` → `reflectionMode:
RAYMARCH`, `SRamount → mixStrength` (clamped 0–1; approximate — MB3D scales reflected light, GMT
blends traced-vs-env), `SRreflectioncount → bounces` (clamped 3). bit1 transmission stays
unmapped (no refraction path in GMT, parked). Deliberately NOT compensated: MB3D dims primary
lighting when reflections are on (`sObjLightDecreaser`), so reflective imports render slightly
brighter in GMT.

## Consequences

- The Max Bounces control now does what it says in Direct mode; reflections-in-reflections
  appear at 2+. Perf: each bounce adds a full trace+shade for pixels whose chain survives the
  luma exit — bounded by the unchanged `uReflSteps` per trace. Compile: unmeasured, speculative
  ~0.8s per extra bounce (`estCompileMs` marked as such; owner benches).
- Foggy scenes get depth-consistent reflections; scenes without fog are untouched
  (`uFogIntensity` guard).
- `accurateColors` fixes trap-coloured reflections at one map() call site of compile cost,
  opt-in.
- MB3D imports with authored auto-reflections light up GMT's Raymarched mode automatically —
  imports get costlier to compile *by authored intent*; the user can switch the mode off.
- Related tuning ride-along (owner call, same session): `ptMaxLuminance` ("Firefly Clamp",
  shared by PT and reflections soft-knee clamps) default 10 → 2.5 — at 10 the knee only engaged
  on extreme spikes. Stored scenes keep their explicit value.
