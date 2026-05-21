---
subsystem_id: g08-save-load-gmf
audited_at: 2026-05-20T00:00:00Z
files:
  - path: engine-gmt/utils/FormulaFormat.ts
    blob_sha: 40373ea556248274ac542d5025da3e043f70f124
    lines_read: [1, 267]
  - path: engine-gmt/utils/CameraUtils.ts
    blob_sha: 88c1d54d5b8f140dacdc2e6430dcef52bb49a935
    lines_read: [1, 151]
  - path: engine-gmt/utils/BenchProfiler.tsx
    blob_sha: d0b713be91504a2c7b3e006d245a9dfe871a20e2
    lines_read: [1, 30]
  - path: utils/SceneFormat.ts
    blob_sha: cc1a342ff21f3dee5f46d33f76adbd8782fb73df
    lines_read: [1, 159]
---

## Public API surface

- `engine-gmt/utils/FormulaFormat.ts`:
  - `generateGMF(def, preset): string` (formula-only GMF v1) — file:95
  - `parseGMF(content): FractalDefinition` — file:145
  - `isGMFFormat(content): boolean` — file:211
  - `saveGMFScene(preset): string` (scene GMF v2) — file:221
  - `loadGMFScene(content): { def?, preset }` — file:246
- `engine-gmt/utils/CameraUtils.ts`:
  - `CameraUtils.getUnifiedPosition / getUnifiedFromEngine / getRotationFromEngine / getDistanceFromEngine / getRotationDegrees / teleportPosition / teleportRotation` — file:14-150
- `engine-gmt/utils/BenchProfiler.tsx`:
  - `BenchProfiler` React component — file:26
- `utils/SceneFormat.ts`:
  - Constants `SCENE_METADATA_KEY = 'SceneData'` — file:34
  - `serializeScene(preset): string` — file:46
  - `parseSceneJson(content): Preset | null` — file:58
  - `SceneParser`, `SceneSerializer` types — file:90, file:94
  - `embedScenePng(png, preset, serialize?)` — file:101
  - `extractScenePng(png, parser?)` — file:116
  - `canvasToPngBlob(canvas)` — file:129
  - `snapshotSceneToPng(canvas, preset, serialize?)` — file:134
  - `downloadBlob(blob, filename)` — file:147
  - Re-exports `generateShareStringFromPreset`, `parseShareString` — file:159

## Architecture (10-25 bullets, file:line)

- GMF is a two-tier container: v1 = formula definition only (metadata + GLSL blocks); v2 = v1 plus appended `<Scene>` JSON block holding the full Preset (`engine-gmt/utils/FormulaFormat.ts:204-235`).
- `generateGMF` first separates the runtime `shader` object from the rest of the `FractalDefinition`, then stashes non-GLSL shader fields (`preambleVars`, `usesSharedRotation`) into a `shaderMeta` subobject inside Metadata so they round-trip without becoming a fake GLSL tag (`engine-gmt/utils/FormulaFormat.ts:98-111`).
- The serialized header is a fixed HTML-style comment block followed by an inline `GMF_API_DOCS` constant — a documentation preamble that lists every uniform, helper function, rotation helper, and the formula function signature for human/LLM editors (`engine-gmt/utils/FormulaFormat.ts:13-53,113-117`).
- `neatJSON` is a hand-rolled pretty-printer that re-collapses param objects, camera vectors, scene offset, julia, position, and params back onto single lines via regex sub on the standard `JSON.stringify(_, null, 2)` output (`engine-gmt/utils/FormulaFormat.ts:58-65`).
- `dedentGLSL` strips trailing/leading blank lines and the minimum common leading-whitespace prefix so embedded shader bodies look correctly indented in the GMF file (`engine-gmt/utils/FormulaFormat.ts:72-93`).
- Shader blocks are emitted in a strict order — Metadata, optional `Shader_Preamble`, optional `Shader_Init`, mandatory `Shader_Function`, mandatory `Shader_Loop`, optional `Shader_Dist` (`engine-gmt/utils/FormulaFormat.ts:119-140`).
- `parseGMF` regex-extracts each named tag (non-greedy `<TAG>...</TAG>` match) and JSON.parses Metadata; if no Metadata tag is found it falls back to "treat whole file as JSON FractalDefinition" before throwing (`engine-gmt/utils/FormulaFormat.ts:145-163`).
- Modular formulas (`metadata.id === 'Modular'`) are allowed to ship with empty `Shader_Function`/`Shader_Loop` because their GLSL is generated from the node-graph pipeline stored inside the preset, not from these blocks (`engine-gmt/utils/FormulaFormat.ts:174-180`).
- On parse, the inverse of the `shaderMeta` stash happens — `preambleVars` and `usesSharedRotation` are lifted off `metadata.shaderMeta` back onto the shader object before being deleted from metadata (`engine-gmt/utils/FormulaFormat.ts:190-195`).
- `saveGMFScene` always calls `registry.get(preset.formula)` and silently downgrades to plain `JSON.stringify(preset, null, 2)` if the formula is not registered — there is no error path for unknown formulas (`engine-gmt/utils/FormulaFormat.ts:221-226`).
- Scene-GMF save reuses `generateGMF(def, def.defaultPreset)` for the formula payload (so the formula's default preset, not the current preset, lands in `<Metadata>.defaultPreset`) and appends `<Scene>` containing the *current* preset (`engine-gmt/utils/FormulaFormat.ts:229-235`).
- `loadGMFScene` dispatches on `isGMFFormat`: GMF → `parseGMF` + optional `<Scene>` regex extract; non-GMF → JSON.parse the whole string as a legacy Preset. v1 formula-only GMF synthesizes a preset from `def.defaultPreset` falling back to `{ formula: def.id }` (`engine-gmt/utils/FormulaFormat.ts:246-267`).
- `isGMFFormat` is a startswith check on the trimmed content for `<!--` or `<Metadata>` — anything else is treated as JSON (`engine-gmt/utils/FormulaFormat.ts:211-214`).
- `utils/SceneFormat.ts` is the engine-core generic save/load layer; the comment block calls out that the public app API lives in `engine/plugins/SceneIO` not here (`utils/SceneFormat.ts:14-26`).
- Two PNG iTXt keywords are supported on extract: primary `'SceneData'` (engine saves) and legacy `'FractalData'` (old gmt-0.8.5 saves); embed always writes `'SceneData'` (`utils/SceneFormat.ts:34,41,106,120-121`).
- `parseSceneJson` is the default parser and handles three cases — GMF with `<Scene>` block, GMF formula-only (logs warning, returns null), and plain JSON (`utils/SceneFormat.ts:58-82`).
- `embedScenePng` / `extractScenePng` take a `SceneSerializer` / `SceneParser` callback so an app like GMT can inject GMF-aware behaviour via `installSceneIO` instead of monkey-patching this module (`utils/SceneFormat.ts:90-124`).
- `snapshotSceneToPng` is `canvasToPngBlob` → `embedScenePng` composed; throws if `canvas.toBlob` returns null (`utils/SceneFormat.ts:134-142`).
- `downloadBlob` builds an object URL, synthesizes an anchor, clicks it, and revokes the URL on a 1-second timeout to avoid yanking it before the browser starts the download (`utils/SceneFormat.ts:147-155`).
- URL-sharing helpers `generateShareStringFromPreset` / `parseShareString` are re-exported from this module as a one-stop format API surface (`utils/SceneFormat.ts:159`).
- `CameraUtils` bridges the engine's split-float (`PreciseVector3` = high+low components) coordinates with the UI's single-vector sliders via `getUnifiedPosition = offset.{x,y,z} + offset.{xL,yL,zL} + localPos.{x,y,z}` (`engine-gmt/utils/CameraUtils.ts:23-29`).
- `teleportPosition` is the "treadmill" reset: split the unified coordinate via `VirtualSpace.split`, set local position to (0,0,0), put the entire offset into `sceneOffset` high/low pair, preserve rotation, optionally override `targetDistance`, and emit `FRACTAL_EVENTS.CAMERA_TELEPORT` (`engine-gmt/utils/CameraUtils.ts:84-117`).
- `teleportRotation` must re-submit the current unified position because the `CAMERA_TELEPORT` event replaces the whole camera state atomically (`engine-gmt/utils/CameraUtils.ts:122-149`).
- `BenchProfiler.tsx` is unrelated to save/load — it conditionally wraps children in a React `<Profiler>` only when `window.__bench.onRender` was installed by `debug/bench-perf.mts` before the React mount; otherwise it's a transparent passthrough with zero runtime overhead (`engine-gmt/utils/BenchProfiler.tsx:1-30`).

## Invariants and gotchas

- `isGMFFormat` is a prefix check only: a GMF file whose first non-whitespace bytes are not `<!--` or `<Metadata>` (e.g. a stray UTF BOM or unexpected leading whitespace inside an HTML container) will be misclassified as JSON and fail to parse (`engine-gmt/utils/FormulaFormat.ts:211-214`).
- `parseGMF` uses a single non-greedy regex per tag; if a shader body contains a literal `</Shader_Function>` token in a comment it will truncate early (`engine-gmt/utils/FormulaFormat.ts:146-151`).
- The Metadata->shaderMeta round-trip is the only place where `preambleVars` and `usesSharedRotation` survive — if a future field gets added to the runtime `shader` object without being added here, it will be silently dropped on save (`engine-gmt/utils/FormulaFormat.ts:103-105,191-194`).
- Modular formulas bypass the "needs Shader_Function + Shader_Loop" guard via a string compare on `metadata.id === 'Modular'`; renaming Modular or introducing other graph-driven formulas would break this guard (`engine-gmt/utils/FormulaFormat.ts:178`).
- `saveGMFScene` silently degrades to plain JSON for unknown formulas — there is no log line or telemetry, so a missing registry entry produces a downgrade-without-warning (`engine-gmt/utils/FormulaFormat.ts:222-226`).
- `generateGMF` is called from `saveGMFScene` with `def.defaultPreset`, not the live preset — the live preset only ever appears inside `<Scene>` (`engine-gmt/utils/FormulaFormat.ts:229,233`).
- PNG metadata key is `SceneData` on embed; the legacy `FractalData` key is read-only fallback. Documentation that quotes "FractalData" as the current embed key is stale (`utils/SceneFormat.ts:34,41,106,120-121`).
- `parseSceneJson` returns `null` (not throws) for v1 formula-only GMF; callers must treat null as "no scene to apply" and keep current state (`utils/SceneFormat.ts:69-72`).
- `downloadBlob` revokes the object URL on a fixed `setTimeout(_, 1000)`; slow networks or large files can still trigger revocation mid-download in degenerate cases (`utils/SceneFormat.ts:153-154`).
- `extractScenePng` resolves the parser callback synchronously but the parser type allows a Promise; callers awaiting the returned promise are correct, but anything destructuring directly will break for async parsers (`utils/SceneFormat.ts:90,118-123`).
- `CameraUtils.teleportRotation` deliberately re-emits the *current* unified position because `CAMERA_TELEPORT` is a whole-state replacement; calling it back-to-back with stale snapshots will fight the latest write (`engine-gmt/utils/CameraUtils.ts:122-149`).
- `CameraUtils.getDistanceFromEngine` returns `null` (not 0) when the local-space camera is < 0.001 from origin — typically Fly-mode reset; downstream code must null-check (`engine-gmt/utils/CameraUtils.ts:55-62`).
- `BenchProfiler` reads `window.__bench` on every render, not once at mount — toggling the bench on/off during a session swaps profiler wrapping live, but also pays a tiny per-render check cost (`engine-gmt/utils/BenchProfiler.tsx:21-30`).

## Drift from existing doc (dev/docs/gmt/05_Data_and_Export.md)

| Doc claim | Code reality | Recommendation |
|---|---|---|
| "Save flow (`utils/FormulaFormat.ts → saveGMFScene()`)" — doc line 83 | The file actually lives at `engine-gmt/utils/FormulaFormat.ts`; `utils/SceneFormat.ts` is a separate engine-core module | Update doc to reference `engine-gmt/utils/FormulaFormat.ts` for app-level GMF, and add `utils/SceneFormat.ts` as the engine-core save/load primitive layer. |
| "Load flow … 5. Emit `REGISTER_FORMULA` to notify the worker thread … 6. Call `loadPreset(preset)` to apply the full scene state" — doc lines 88-94 | `loadGMFScene` returns `{ def?, preset }` only; it does NOT register the formula, emit any event, or apply state — the docstring (file:244) explicitly says "Does NOT register the formula — caller should check registry and register if needed" | Move steps 4-6 of the load flow into the caller-side section, or re-label them as the caller's responsibility (likely the System Menu / EngineBridge load handler). |
| "PNG Metadata … embed the full scene data as a GMF string in the PNG `iTXt` chunk (key: `\"FractalData\"`)" — doc lines 132-136 | Embed key in `utils/SceneFormat.ts` is `SCENE_METADATA_KEY = 'SceneData'` (file:34, file:106). `'FractalData'` is read-only legacy fallback for gmt-0.8.5 PNGs (file:41, file:121) | Update doc to say embeds use `SceneData` with `FractalData` as legacy-read fallback. |
| Metadata block schema "{ id, name, parameters, defaultPreset, importSource? }" — doc line 71 | Metadata also carries an optional `shaderMeta` subobject for `preambleVars` and `usesSharedRotation` (file:103-109, file:191-194) | Add `shaderMeta?` to the documented metadata schema. |
| (Missing) Modular special case | Code allows empty `Shader_Function`/`Shader_Loop` only when `metadata.id === 'Modular'` (file:178) | Document the Modular carve-out — it ties to `03_Modular_System.md`. |
| (Missing) Unknown-formula fallback | `saveGMFScene` silently degrades to plain JSON when the formula isn't in the registry (file:222-226) | Document the silent JSON fallback (or change behaviour to throw / warn). |
| (Missing) `SceneIO` plugin layer | `utils/SceneFormat.ts:14-22` documents an `engine/plugins/SceneIO` API (`loadSceneFile`, `saveScene`, `saveScenePng`, `saveSceneJpg`) that GMT routes through; the user-facing doc doesn't describe this indirection | Add a section explaining the SceneIO plugin boundary: engine-core provides primitives, GMT registers its parser/serializer via `installSceneIO`. |

## Open questions

- Orphan-sweep candidate: engine-gmt/utils/BenchProfiler.tsx — Tightly coupled to `debug/bench-perf.mts`; confirm at least one app entry point still wraps subtrees with `<BenchProfiler>` and that the bench harness is still in use, otherwise it can be retired alongside the bench.
- Orphan-sweep candidate: engine-gmt/utils/FormulaFormat.ts — `generateGMF` is called from `saveGMFScene` (file:229); confirm `generateGMF` and `parseGMF` have external callers (Formula Gallery, Workshop import) beyond `saveGMFScene` / `loadGMFScene`, otherwise inline them.
- Orphan-sweep candidate: engine-gmt/utils/CameraUtils.ts — Audit which callers still use `teleportPosition` / `teleportRotation` after the engine fork; confirm `CAMERA_TELEPORT` event listener still exists in the worker proxy and `VirtualSpace.split` path is the canonical one.
- Orphan-sweep candidate: utils/SceneFormat.ts — Verify `installSceneIO` is exercised by GMT in dev; if not, GMT may still be reaching directly into `FormulaFormat.ts` and the SceneIO indirection is currently dead code in the dev tree.
