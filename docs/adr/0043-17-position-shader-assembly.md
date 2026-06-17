# ADR-0043: 17-position shader assembly order with always-inject contract

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/engine/ShaderBuilder.ts`,
`engine-gmt/engine/ShaderFactory.ts`

## Context

GMT's fragment shader is composed from 50+ feature-defined chunks plus
core math / ray / trace / coloring / post. Position-of-emission matters:

- Pre-DE functions can't call post-DE functions.
- Integrators must come after `trace` (they consume `traceResult`).
- Post-process after integrators (consumes the integrator output).
- Composite (`renderPixel`) after post-process.

A naive "concatenate in registration order" approach broke whenever a
new feature was added between two existing ones. Disabled features that
omit `inject()` create undefined-function errors when other features
reference their entry points (e.g. `calculateShading` from the lighting
feature is called by `reflections`).

## Decision

`ShaderBuilder` provides 17 ordered positions (defines, uniforms,
headers, core math, blue noise, coloring, preambles, pre-DE functions,
DE body, post-DE functions, material eval, miss handler, ray-gen,
trace, integrators, post-process, composite). The canonical comment
block at `engine-gmt/engine/ShaderBuilder.ts:1-26` enumerates positions
1-17 with the method that writes each. Each position has a dedicated
`addX()` method that pushes into a per-position storage field.
`buildFragment()` walks positions 1-17 in order.

`ShaderFactory.buildShader` calls `feat.inject()` for EVERY registered
feature regardless of enabled state — features MUST defensively emit
empty stubs when disabled. The always-inject contract is documented at
`engine-gmt/engine/ShaderFactory.ts:51-54`.

Add-methods that emit reusable chunks (`addPreamble`, `addFunction`,
`addPostDEFunction`, `addIntegrator`) dedupe by string-equality
(`includes(code)`). Convention: features emit a single canonical chunk
constant, not a per-call template — two textually different strings
both inject and produce duplicate function definitions.

Variant gates (`Physics` 1-10 only; `Histogram` 1-10 + trace + ray-gen;
`Mesh` 1-9 as library) reuse the same builder; only `Main` emits all
17 positions.

## Consequences

- The 17-position contract is the source of truth — the comment block
  at `engine-gmt/engine/ShaderBuilder.ts:1-26` and the Main template at
  lines 603-632 must stay in sync with the storage fields.
- Always-inject means features carry boilerplate stub branches — the
  cost is bounded vs the "undefined function" failure mode.
- Dedupe-by-string-equality means two features with semantically
  equivalent but textually different chunks both inject. The
  convention is enforced at code review.
- Adding a new position would require renumbering 50+ feature `inject()`
  call sites; in practice the 17 positions have been stable since
  Phase 5 of the extraction. New cross-cutting concerns slot into
  position 16 (post) or 17 (composite).
