# ADR-0019: ShaderBuilder section escape hatch

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/ShaderBuilder.ts`, `engine/ShaderFactory.ts`, `engine/ShaderConfig.ts`

## Context

A generic engine cannot enumerate every pipeline-specific section
name (`postMapCode`, `materialLogic`, `hybridFold`, etc.) without
becoming opinionated.

## Decision

Five generic primitives (`defines`, `uniforms`, `headers`,
`preambles`, `functions`) cover GLSL essentials; a multi-valued
`sections: Map<string, string[]>` is a free-form escape hatch where
the ENGINE never interprets the names. Plugin assemblers own the
canonical name list. `renderMode` likewise stays opaque to the
engine.

## Consequences

- engine-gmt's live raymarching builder bypasses the generic section
  API entirely (typed methods) — the section API survives for plugin
  authors.
- No engine-side validation of section names; mistyped names become
  silently-dropped contributions.
