# ADR-0052: GMF as two-tier HTML-style container (v1 formula-only, v2 with `<Scene>`)

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/utils/FormulaFormat.ts`, `utils/SceneFormat.ts`

## Context

GMT needs a save format meeting several constraints:

1. **Embed GLSL shader source readably.** JSON-escaped newlines and quoted
   strings make GLSL difficult to read or hand-edit.
2. **Carry scene state** — camera, lights, features, animations — alongside
   the shader so loading one file restores the visual.
3. **Round-trip through copy/paste and PNG iTXt chunks.** Users share
   scenes as text on Discord, GitHub gists, etc.; the format must survive
   those channels.
4. **Survive Modular formulas** whose GLSL is generated from a node graph
   at runtime; the GLSL itself isn't authoritative — the graph is.
5. **Preserve non-GLSL shader fields** like `preambleVars` (interlace
   declarations) and `usesSharedRotation` that don't map to a GLSL block.

Alternatives considered:

- **Pure JSON with escaped GLSL strings.** Solves (2) but fails (1) and
  fights with the line-comment-friendly GLSL of `<Shader_Function>`.
- **Custom binary format.** Solves (1)+(3) but breaks (3) copy/paste-as-text.
- **Two separate files (shader + scene).** Breaks (3) — users share one
  thing.

## Decision

HTML-style tagged container with two tiers:

**v1** carries metadata + GLSL blocks only:
- `<Metadata>` (mandatory) — JSON FractalDefinition minus the `shader`
  object, with `defaultPreset` and optional `shaderMeta`.
- `<Shader_Preamble>` (optional) — global-scope GLSL.
- `<Shader_Init>` (optional) — runs once before iteration loop.
- `<Shader_Function>` (mandatory EXCEPT for `id === 'Modular'`) —
  distance-estimator body.
- `<Shader_Loop>` (mandatory EXCEPT for `id === 'Modular'`) — iteration-loop body.
- `<Shader_Dist>` (optional) — custom distance / iteration smoothing.

**v2** is v1 plus appended `<Scene>` JSON block holding the full Preset.
Block order is fixed.

Non-GLSL shader fields ride in `metadata.shaderMeta` (only `preambleVars` and
`usesSharedRotation` today). Tag extraction is non-greedy regex
(`<TAG>...</TAG>`). PNG iTXt keyword is `'SceneData'` (legacy read-only
`'FractalData'` fallback for gmt-0.8.5 PNGs).

The file leads with `<!-- GMF: GPU Mandelbulb Format v1.0 -->` and an inline
`GMF_API_DOCS` constant — a documentation preamble that lists every uniform,
helper function, rotation helper, and the formula function signature for
human and LLM editors.

## Consequences

- **A shader body containing literal `</Shader_Function>` truncates parse.**
  Latent fragility (no current bug — none of the 42 shipped formulas hit it).
  Worth a fix if user-authored shaders proliferate via the Workshop.
- **Modular's empty-shader carve-out is a `metadata.id === 'Modular'` string
  compare** at `engine-gmt/utils/FormulaFormat.ts:178`. Renaming Modular or
  introducing other graph-driven formula ids without updating this check
  would break GMF load for them.
- **`shaderMeta` is the sole survival path for non-GLSL shader fields.** A
  future field added to the runtime shader object will be silently dropped
  on save unless added to both the stash (`generateGMF`) and the restore
  paths (`parseGMF`).
- **The default preset baked into `<Metadata>` is the FORMULA'S
  `defaultPreset`, NOT the live preset.** `saveGMFScene` calls
  `generateGMF(def, def.defaultPreset)` for the formula payload and only
  ever places the live preset inside `<Scene>`. Users who save a scene then
  open the GMF expecting `<Metadata>` to hold their tweaks will be confused
  — `<Scene>` is the right place to look.
- **PNG embed key is `'SceneData'`** (legacy read-only `'FractalData'`
  fallback). New embeds always use the primary key.
- `isGMFFormat` is a strict prefix check; UTF-8 BOM will misclassify the
  file as JSON.
