# ADR-0071: Firefly clamp uses a soft knee, not a hard luminance ceiling

**Date:** 2026-06-19
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/pathtracer.ts` (`clampByLuminance`), `engine-gmt/features/reflections/shader.ts` (`clampReflLum`)

## Context

Both the path tracer and the raymarched reflection path suppress HDR fireflies
by clamping a sample's Rec.709 luminance to `uPTMaxLuminance` ("Firefly Clamp",
default 10):

```glsl
return c * min(1.0, uPTMaxLuminance / l);   // hard clamp
```

A hard clamp maps **every** sample brighter than the threshold to *exactly* the
threshold luminance. So any reflected region brighter than the ceiling — a
reflection of a light, a bright env feature, a glossy hotspot — collapses to a
uniform plateau: it loses all internal contrast and reads **flat**. (User report:
"some reflected areas seem flat.") The clamp can't distinguish a true firefly (a
rare per-sample spike) from a consistently bright reflection; the hard ceiling
crushes both.

## Decision

Replace the hard clamp with a **soft knee** in both clamp functions:

```glsl
float t = uPTMaxLuminance;
if (l <= t) return c;                          // unchanged below the knee
float ln = t + t * (1.0 - exp(-(l - t) / t));  // monotonic, asymptote 2·t
return c * (ln / l);
```

- Luminance ≤ `t` passes through untouched.
- Above `t`, the excess is compressed smoothly toward an asymptote of **2·t**.
  The mapping is monotonic, so brighter samples stay brighter — bright reflected
  regions keep their relative contrast instead of flattening.
- Extreme spikes are still bounded (≤ 2·t), so firefly suppression is retained,
  just less aggressively than the hard ceiling.
- `uPTMaxLuminance` remains the single control (the knee position); raising it
  pushes the knee up / effectively disables the clamp, as before.

Applied identically to the PT integrator (`clampByLuminance`) and the raymarched
reflection (`clampReflLum`) so behaviour matches across modes.

## Consequences

- Bright reflections retain contrast and structure; the flat clamp-plateau is
  gone. This is strictly *less biased* than the hard clamp (the mean of bright
  regions is preserved better).
- The tradeoff: residual fireflies can now reach up to ~2·t instead of being
  crushed to t, so extreme single-sample spikes are slightly brighter than
  before. Mitigated by accumulation (they average down) and tunable via
  `uPTMaxLuminance`. The `2·t` asymptote (the `headroom = t` term) is a one-line
  knob if a different aggressiveness is wanted.
- Per-sample clamping fundamentally cannot tell a firefly from a stable bright
  reflection; a truly unbiased solution (spatial/temporal outlier rejection,
  median-of-means) needs sample history this progressive accumulator doesn't
  keep. The soft knee is the best per-sample compromise.
- Distinct from the env prefilter's high-roughness average-blend (ADR-0069),
  which flattens *rough* env reflections toward the solid-angle mean by design;
  that is a separate cause of "flatness" with its own (blend-range) knob.
