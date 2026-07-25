# ADR-0108 — Modulation composes in slider space, not value space

**Date:** 2026-07-25
**Status:** Accepted
**Related:** ADR-0107 (live modulation transport)

## Context

Modulation adds a linear offset in VALUE space: `final = base + gain × signal`.
A slider with a non-linear `scale` moves in DISPLAY space. For any curved param
the two disagree, and the disagreement grows with the curve.

Measured on `coloring.repeats` (`scale: 'log'`, 0.1–100). One audio rule, gain
1.0, nothing changed but where the base sits:

| base | value at peak | slider travel |
|---|---|---|
| 0.2 | 1.20 | 25.9% of track |
| 1 | 2.00 | 10.0% |
| 5 | 6.00 | 2.6% |
| 20 | 21.00 | 0.7% |
| 80 | 81.00 | 0.2% |

**A 130× swing in apparent depth from the identical rule.** Gain was not a
usable control on these params: it had to be re-dialled per param, and moving
the base threw the tuning away. Near the top of a log range the rule was
effectively inert. 23 params declare `log`/`square`, concentrated in exactly the
places a VJ rig points audio at — coloring, lighting, atmosphere, volumetric,
optics.

A prerequisite blocked the fix: curves were per-widget module constants, not
param config. Lighting defined POWER / POWER_SPHERE / RANGE identically in TWO
files; `coreMath.iterations` had a pow-3 curve that existed only inside
`FormulaParamsWidget`. Modulation cannot compensate for a curve it cannot see.

## Decision

**1. Curves are param config, resolved in one place.**
`engine/features/modulation/paramMapping.ts` is the single resolver, read by
`AutoFeaturePanel`, by the hand-built widgets, and by the modulation compose
path. `ScaleType` gains `log1p` and `cube` to express curves that previously
could only be written by hand, and `root` — in the union since forever but never
handled, so a param setting it silently got a linear slider — now resolves.
Non-DDFS targets (the light array) have no `ParamConfig`, so the module owns
their curves too; light intensity resolves by TYPE, since Sphere runs 0..10000
log1p where other types run 0..100 with a sqrt feel.

**2. Offsets compose as slider TRAVEL.**

```
travel = offset / (max - min)          ← what that offset gives on a linear slider
final  = fromDisplay( toDisplay(base) + travel × trackLength )
```

**Units are preserved.** `offset` stays in value units, so Gain, Offset and LFO
amplitude/min/max keep their meanings and linear params are bit-identical to
before. This raises curved params to what linear params already did; it does not
redefine the controls.

An earlier draft of this decision made Gain a *fraction of track* for every
param. Rejected: linear params were never broken — they already move
proportionally to their offset — so redefining their control would have been
churn for no gain, and it would have made one knob mean two different things
depending on the target.

**3. Every applier composes through the same function.**
Four code paths add an offset to a base: `AnimationSystem.tick`, the DDFS
auto-setter's double-writer guard, and TWO export dispatchers. When the tick and
the setter disagreed, the uniform alternated between their answers — the
modulated-slider flicker. When the tick and export disagree, a render doesn't
match its preview (ADR-0107 was that failure in another form). All four call
`composeModulatedValue`.

## Consequences

- A curved param modulates with constant, predictable depth. Gain transfers
  across bases, so a tuned rule survives moving the base.
- Results on curved params CLAMP to the slider's reachable range, where the
  linear path does not. Outside the display domain a curve is meaningless (log
  of a negative), so this is forced rather than chosen. Note the floor is the
  mapping's own domain, not `min`: a log param whose min is at or below
  `LOG_ZERO_EPS` (0.1) has a reserved band for an exact 0, and 0 is where
  dragging the handle fully left lands too.
- `coreMath.iterations` now declares `scale: 'cube'`. Its slider is unchanged
  (the widget already drew that curve); what changed is that modulation can see
  it.
- Mapping construction is memoized. The compose path resolves a curve per
  modulated target per frame, and the builders allocate a closure pair per call.
- **Not covered:** the light-array intensity path composes on the DISPLAY curve,
  but `UniformManager` then applies `pow(2, intensity)` for lights in EV mode.
  EV is already logarithmic, so an EV-mode light gets a curve on top of a curve.
  Left alone because EV intensity modulating exponentially is arguably correct;
  flagged because it is the one place the "slider travel" model does not
  straightforwardly hold.
- **Still duplicated:** the two `exportModulations.ts` files remain near-copies
  of the tick's branch chain. They now share the compose and the classifier, so
  the arithmetic can't drift, but the dispatch structure is still triplicated.
  Collapsing that is the `registerModulationBranch()` refactor ADR-0107 flagged.

`debug/test-param-mapping.mts` proves rather than asserts: it reconstructs each
original widget constant inline and compares point-by-point (the lift was
neutral), checks travel is constant across bases and equals the linear-slider
travel for the same offset, checks linear params are bit-identical, and fails if
any panel reintroduces a local curve or any applier adds an offset raw.
