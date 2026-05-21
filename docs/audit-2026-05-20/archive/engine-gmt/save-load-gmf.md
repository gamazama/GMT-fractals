---
source: engine-gmt/utils/FormulaFormat.ts
lines: 1-267
last_verified_sha: 40373ea556248274ac542d5025da3e043f70f124
additional_sources:
  - engine-gmt/utils/CameraUtils.ts
  - engine-gmt/utils/BenchProfiler.tsx
  - utils/SceneFormat.ts
audited: 2026-05-20T09:16:29Z
audited_by: claude-opus-4-7
public_api:
  - generateGMF
  - parseGMF
  - isGMFFormat
  - saveGMFScene
  - loadGMFScene
  - CameraUtils
  - BenchProfiler
  - SCENE_METADATA_KEY
  - serializeScene
  - parseSceneJson
  - SceneParser
  - SceneSerializer
  - embedScenePng
  - extractScenePng
  - canvasToPngBlob
  - snapshotSceneToPng
  - downloadBlob
  - generateShareStringFromPreset
  - parseShareString
depends_on:
  - g03-formula-registry
  - g09-modular-graph
  - e07-plugins-host
  - e09-camera-plugin
  - e11-worker-contract
---

# Save / Load — GMF Format and Scene Serialization

GMF ("GPU Mandelbulb Format") is the GMT app's primary save format: a human-readable
HTML-style container that carries a fractal's metadata plus its GLSL source, with an
optional `<Scene>` block holding the full Preset (camera, lights, features, animations).
This module documents the app-layer GMF parser/generator at
`engine-gmt/utils/FormulaFormat.ts:1-267`, the engine-core scene-IO primitives at
`utils/SceneFormat.ts:1-159`, the unified-coordinate camera helpers at
`engine-gmt/utils/CameraUtils.ts:1-151`, and a render-time bench wrapper at
`engine-gmt/utils/BenchProfiler.tsx:1-30`.

## Public API

### `engine-gmt/utils/FormulaFormat.ts` — app-layer GMF

| Symbol | Signature | Anchor |
|---|---|---|
| `generateGMF` | `(def: FractalDefinition, preset: Partial<Preset>) => string` — formula-only v1 GMF (no `<Scene>`) | `engine-gmt/utils/FormulaFormat.ts:95` |
| `parseGMF` | `(content: string) => FractalDefinition` — reverse of `generateGMF`; legacy JSON fallback if no `<Metadata>` tag | `engine-gmt/utils/FormulaFormat.ts:145` |
| `isGMFFormat` | `(content: string) => boolean` — trimmed-prefix check for `<!--` or `<Metadata>` | `engine-gmt/utils/FormulaFormat.ts:211` |
| `saveGMFScene` | `(preset: Preset) => string` — v2 scene GMF (formula GLSL + `<Scene>` block) | `engine-gmt/utils/FormulaFormat.ts:221` |
| `loadGMFScene` | `(content: string) => { def?: FractalDefinition, preset: Preset }` — dispatches GMF vs JSON; does NOT register the formula | `engine-gmt/utils/FormulaFormat.ts:246` |

### `engine-gmt/utils/CameraUtils.ts` — unified camera helpers

| Symbol | Purpose | Anchor |
|---|---|---|
| `CameraUtils.getUnifiedPosition` | Sum `offset.{x,y,z}` + `offset.{xL,yL,zL}` + `localPos` into a single `THREE.Vector3` | `engine-gmt/utils/CameraUtils.ts:23` |
| `CameraUtils.getUnifiedFromEngine` | Same, but reads `getViewportCamera()` / `engine.activeCamera` and `engine.sceneOffset` | `engine-gmt/utils/CameraUtils.ts:35` |
| `CameraUtils.getRotationFromEngine` | Cloned `THREE.Quaternion` of the active viewport camera | `engine-gmt/utils/CameraUtils.ts:45` |
| `CameraUtils.getDistanceFromEngine` | `cam.position.length()` or `null` if < 0.001 (Fly-mode reset) | `engine-gmt/utils/CameraUtils.ts:55` |
| `CameraUtils.getRotationDegrees` | Quaternion → Euler degrees for UI sliders | `engine-gmt/utils/CameraUtils.ts:67` |
| `CameraUtils.teleportPosition` | "Treadmill" reset: split unified coord into high/low, zero local, emit `CAMERA_TELEPORT` | `engine-gmt/utils/CameraUtils.ts:84` |
| `CameraUtils.teleportRotation` | Convert Euler degrees → quaternion; re-submits current unified position | `engine-gmt/utils/CameraUtils.ts:122` |

### `utils/SceneFormat.ts` — engine-core scene-IO primitives

| Symbol | Purpose | Anchor |
|---|---|---|
| `SCENE_METADATA_KEY` | iTXt keyword `'SceneData'` used for embedded scene data on save | `utils/SceneFormat.ts:34` |
| `serializeScene` | `(preset) => string` — default pretty-printed JSON serializer | `utils/SceneFormat.ts:46` |
| `parseSceneJson` | Three-way parser: plain JSON / GMF + `<Scene>` / GMF formula-only (returns null) | `utils/SceneFormat.ts:58` |
| `SceneParser` (type) | `(content) => Preset \| null \| Promise<Preset \| null>` | `utils/SceneFormat.ts:90` |
| `SceneSerializer` (type) | `(preset) => string` | `utils/SceneFormat.ts:94` |
| `embedScenePng` | `(png, preset, serialize?) => Promise<Blob>` — write iTXt chunk | `utils/SceneFormat.ts:101` |
| `extractScenePng` | `(png, parser?) => Promise<Preset \| null>` — read iTXt, tries primary then legacy key | `utils/SceneFormat.ts:116` |
| `canvasToPngBlob` | `(canvas) => Promise<Blob \| null>` | `utils/SceneFormat.ts:129` |
| `snapshotSceneToPng` | `canvasToPngBlob` ∘ `embedScenePng`; throws if `canvas.toBlob` returns null | `utils/SceneFormat.ts:134` |
| `downloadBlob` | Build object URL, click `<a>`, revoke after `setTimeout(_, 1000)` | `utils/SceneFormat.ts:147` |
| `generateShareStringFromPreset`, `parseShareString` | URL-share helpers re-exported as the one-stop format API | `utils/SceneFormat.ts:159` |

### `engine-gmt/utils/BenchProfiler.tsx` — perf bench wrapper

| Symbol | Purpose | Anchor |
|---|---|---|
| `BenchProfiler` | `React.FC<{id, children}>` — wraps children in `React.Profiler` only when `window.__bench.onRender` is installed | `engine-gmt/utils/BenchProfiler.tsx:26` |

## Architecture

### GMF container shape

GMF is a two-tier container. **v1** carries only a formula definition (metadata + GLSL
blocks). **v2** is v1 plus an appended `<Scene>` JSON block holding the full Preset
(`engine-gmt/utils/FormulaFormat.ts:204-235`). Block order is fixed: optional
`Shader_Preamble`, optional `Shader_Init`, mandatory `Shader_Function`, mandatory
`Shader_Loop`, optional `Shader_Dist`, then optional `Scene`
(`engine-gmt/utils/FormulaFormat.ts:119-140,232-233`).

The file leads with a fixed HTML-style comment and an inline `GMF_API_DOCS` constant —
a documentation preamble that lists every uniform, helper function, rotation helper, and
the formula function signature for human and LLM editors
(`engine-gmt/utils/FormulaFormat.ts:13-53,113-117`).

| GMF block | Required? | Content | Anchor |
|---|---|---|---|
| `<Metadata>` | yes | JSON of the `FractalDefinition` minus its `shader` object, with `defaultPreset` and optional `shaderMeta` | `engine-gmt/utils/FormulaFormat.ts:107-119` |
| `<Shader_Preamble>` | no | Global-scope GLSL (helpers, structs) | `engine-gmt/utils/FormulaFormat.ts:121-124` |
| `<Shader_Init>` | no | GLSL run once before the iteration loop | `engine-gmt/utils/FormulaFormat.ts:126-129` |
| `<Shader_Function>` | yes (except Modular) | Main distance-estimator GLSL body | `engine-gmt/utils/FormulaFormat.ts:131-132` |
| `<Shader_Loop>` | yes (except Modular) | Iteration-loop GLSL body | `engine-gmt/utils/FormulaFormat.ts:134-135` |
| `<Shader_Dist>` | no | Custom distance / iteration smoothing GLSL | `engine-gmt/utils/FormulaFormat.ts:137-140` |
| `<Scene>` | v2 only | JSON-serialized Preset (camera, lights, features, animations) | `engine-gmt/utils/FormulaFormat.ts:232-233` |

### Metadata + shaderMeta round-trip

`generateGMF` first destructures the runtime `shader` object off the `FractalDefinition`
so it can be emitted as separate GLSL tags
(`engine-gmt/utils/FormulaFormat.ts:97-98`). Non-GLSL fields that live on the shader
object — `preambleVars` (interlace declarations) and `usesSharedRotation` — are stashed
into a `shaderMeta` subobject inside Metadata so they round-trip without becoming fake
GLSL tags (`engine-gmt/utils/FormulaFormat.ts:103-109`). On parse the inverse happens:
`preambleVars` and `usesSharedRotation` are lifted off `metadata.shaderMeta` back onto
the reconstructed shader object before being deleted from metadata
(`engine-gmt/utils/FormulaFormat.ts:190-195`).

### Pretty-printing

`neatJSON` is a hand-rolled pretty-printer that re-collapses small objects (param
entries by id, camera vectors, scene offset, julia seed, position, and `params`
groups) back onto single lines via regex substitution over the standard
`JSON.stringify(_, null, 2)` output (`engine-gmt/utils/FormulaFormat.ts:58-65`).
`dedentGLSL` strips leading/trailing blank lines and the minimum common
leading-whitespace prefix so embedded shader bodies look correctly indented in the
GMF file (`engine-gmt/utils/FormulaFormat.ts:72-93`).

### Parse flow

`parseGMF` extracts each named tag using a non-greedy `<TAG>...</TAG>` regex and
`JSON.parse`s Metadata; if no Metadata tag is present it falls back to "treat whole
file as JSON FractalDefinition" before throwing
(`engine-gmt/utils/FormulaFormat.ts:145-163`).

Modular formulas — those with `metadata.id === 'Modular'` — are allowed to ship with
empty `Shader_Function` / `Shader_Loop` because their GLSL is generated from the
node-graph pipeline stored inside the preset, not from these blocks
(`engine-gmt/utils/FormulaFormat.ts:174-180`).

### Scene save / load

`saveGMFScene` always calls `registry.get(preset.formula)` and silently downgrades to
plain `JSON.stringify(preset, null, 2)` if the formula is not registered — there is no
error path for unknown formulas (`engine-gmt/utils/FormulaFormat.ts:221-226`). For the
formula-payload portion it reuses `generateGMF(def, def.defaultPreset)`, so the
formula's own `defaultPreset` (not the current preset) lands inside `<Metadata>`; the
*current* preset is appended in `<Scene>` (`engine-gmt/utils/FormulaFormat.ts:229-235`).

`loadGMFScene` dispatches on `isGMFFormat`: GMF → `parseGMF` plus optional `<Scene>`
regex extract; non-GMF → `JSON.parse` the whole string as a legacy Preset. v1
formula-only GMF synthesizes a preset from `def.defaultPreset` falling back to
`{ formula: def.id }` (`engine-gmt/utils/FormulaFormat.ts:246-267`). Per the docstring
at `engine-gmt/utils/FormulaFormat.ts:244`, this function does NOT register the formula
— callers are responsible for checking the registry and registering if needed.

`isGMFFormat` is a startswith check on the trimmed content for `<!--` or `<Metadata>`
— anything else is treated as JSON (`engine-gmt/utils/FormulaFormat.ts:211-214`).

### Engine-core scene-IO primitives

`utils/SceneFormat.ts` is the engine-core's generic scene save/load layer. Its module
comment block notes that the public app API lives in `engine/plugins/SceneIO` rather
than here, and that the helpers below are exported "for advanced format authors
composing their own pipeline" (`utils/SceneFormat.ts:14-26`).

Two PNG iTXt keywords are supported on extract: the engine's primary `'SceneData'`
key and the legacy `'FractalData'` key written by gmt-0.8.5; embed always writes
`'SceneData'` (`utils/SceneFormat.ts:34,41,106,120-121`).

`parseSceneJson` is the default parser. It handles three input forms: GMF with a
`<Scene>` block (extracts and JSON-parses), GMF formula-only (logs a warning, returns
null because no scene state is embedded), and plain JSON
(`utils/SceneFormat.ts:58-82`).

`embedScenePng` and `extractScenePng` accept `SceneSerializer` / `SceneParser`
callbacks so an app like GMT can inject GMF-aware behaviour through `installSceneIO`
without monkey-patching the module (`utils/SceneFormat.ts:90-124`).
`snapshotSceneToPng` is the composition `canvasToPngBlob` → `embedScenePng`, throwing
if `canvas.toBlob` returns null (`utils/SceneFormat.ts:134-142`). `downloadBlob`
builds an object URL, synthesizes an `<a>` element, clicks it, and revokes the URL
after a 1-second timeout to avoid yanking it before the browser commits to the
download (`utils/SceneFormat.ts:147-155`). URL-sharing helpers
`generateShareStringFromPreset` and `parseShareString` are re-exported from the same
module as a one-stop format API (`utils/SceneFormat.ts:159`).

### Unified camera coordinates (`CameraUtils`)

`CameraUtils` bridges the engine's split-float coordinates — where `PreciseVector3`
carries high (`x,y,z`) and low (`xL,yL,zL`) components plus a separate local
camera position — with the UI's single-vector sliders. Unified position is the
sum `offset.{x,y,z} + offset.{xL,yL,zL} + localPos.{x,y,z}`
(`engine-gmt/utils/CameraUtils.ts:23-29`).

`teleportPosition` is the "treadmill" reset: split the unified coordinate via
`VirtualSpace.split` into high/low pairs, set local position to (0,0,0), put the
entire offset into the `sceneOffset` high/low fields, preserve rotation (either
caller-supplied or read from the current camera), optionally override
`targetDistance`, and emit `FRACTAL_EVENTS.CAMERA_TELEPORT`
(`engine-gmt/utils/CameraUtils.ts:84-117`). `teleportRotation` must re-submit the
current unified position because the `CAMERA_TELEPORT` event replaces the whole
camera state atomically (`engine-gmt/utils/CameraUtils.ts:122-149`).

### `BenchProfiler`

`BenchProfiler` conditionally wraps children in a React `<Profiler>` only when
`window.__bench.onRender` was installed by `debug/bench-perf.mts` before the React
mount; otherwise it's a transparent passthrough with zero runtime overhead
(`engine-gmt/utils/BenchProfiler.tsx:1-30`). The `window.__bench` check happens at
render time, not module-init, so the bench can attach `__bench` after this module
is imported but before `AppGmt` renders
(`engine-gmt/utils/BenchProfiler.tsx:1-13,21-30`). The module is included in this
subsystem only because it co-locates with the other engine-gmt utility files; it is
unrelated to GMF save/load.

## Invariants

- **`isGMFFormat` is a strict prefix check.** Anything not starting with `<!--` or
  `<Metadata>` after `trimStart()` is treated as JSON
  (`engine-gmt/utils/FormulaFormat.ts:211-214`). A stray UTF BOM or a leading container
  tag in front of the comment block will misclassify the file as JSON.
- **Tag extraction is non-greedy regex.** `parseGMF` matches each tag with a single
  non-greedy `<TAG>...</TAG>` regex (`engine-gmt/utils/FormulaFormat.ts:146-151`); a
  shader body that contains a literal `</Shader_Function>` (e.g. in a GLSL comment)
  will truncate early.
- **`shaderMeta` is the sole survival path for non-GLSL shader fields.** Only
  `preambleVars` and `usesSharedRotation` are stashed into Metadata
  (`engine-gmt/utils/FormulaFormat.ts:103-105,191-194`). A future field added to the
  runtime shader object will be silently dropped on save unless added to both the
  stash and the restore paths.
- **Modular's empty-shader carve-out is a string compare.** The "missing
  Shader_Function/Shader_Loop" guard explicitly excludes `metadata.id === 'Modular'`
  (`engine-gmt/utils/FormulaFormat.ts:178`); renaming Modular or introducing other
  graph-driven formula ids without updating this check would break GMF load for them.
- **`saveGMFScene` silently downgrades to JSON for unknown formulas.** There is no log
  line or telemetry on the registry-miss path
  (`engine-gmt/utils/FormulaFormat.ts:222-226`).
- **The default preset baked into `<Metadata>` is the formula's, not the live preset.**
  `saveGMFScene` calls `generateGMF(def, def.defaultPreset)` for the formula payload
  and only ever places the live preset inside `<Scene>`
  (`engine-gmt/utils/FormulaFormat.ts:229,233`).
- **PNG embed key is `'SceneData'`, not `'FractalData'`.** The legacy `'FractalData'`
  key is a read-only fallback for gmt-0.8.5 PNGs; new embeds always use the primary
  key (`utils/SceneFormat.ts:34,41,106,120-121`).
- **`parseSceneJson` returns `null` (not throws) for v1 formula-only GMF.** Callers
  must treat null as "no scene to apply" and preserve current state
  (`utils/SceneFormat.ts:69-72`).
- **`downloadBlob` revokes on a fixed 1-second timer.** Pathologically slow networks
  could revoke the URL before the browser starts the download
  (`utils/SceneFormat.ts:153-154`).
- **`extractScenePng` allows an async `SceneParser`.** The `SceneParser` type permits
  `Promise<Preset | null>` (`utils/SceneFormat.ts:90`); callers awaiting the returned
  promise are correct, but code that destructures the return without awaiting will
  break for async parsers (`utils/SceneFormat.ts:118-123`).
- **`CameraUtils.teleportRotation` is whole-state.** It must re-submit the current
  unified position because `FRACTAL_EVENTS.CAMERA_TELEPORT` is an atomic camera-state
  replacement; back-to-back calls with stale snapshots will fight the latest write
  (`engine-gmt/utils/CameraUtils.ts:122-149`).
- **`CameraUtils.getDistanceFromEngine` returns `null` (not 0) below 0.001.** Typically
  Fly-mode reset; downstream code must null-check
  (`engine-gmt/utils/CameraUtils.ts:55-62`).
- **`BenchProfiler` re-reads `window.__bench` on every render.** Toggling the bench
  on/off during a session swaps the Profiler wrapping live but pays a per-render
  property-access cost (`engine-gmt/utils/BenchProfiler.tsx:21-30`).

## Interactions with other subsystems

- **g03-formula-registry** — `saveGMFScene` reads the active formula definition via
  `registry.get(preset.formula)`; if the formula is missing, the save silently
  downgrades to plain JSON (`engine-gmt/utils/FormulaFormat.ts:222-226`). The
  load-side counterpart `loadGMFScene` deliberately does NOT touch the registry
  (`engine-gmt/utils/FormulaFormat.ts:244-261`); the caller (System Menu / load
  handler) checks and registers if needed.
- **g09-modular-graph** — Modular formulas are the lone exception to the
  Shader_Function/Shader_Loop required-blocks rule
  (`engine-gmt/utils/FormulaFormat.ts:178`). Their GLSL is rebuilt from the node
  graph stored inside the preset on load, not from GMF blocks.
- **e07-plugins-host** — `utils/SceneFormat.ts:14-22` documents the
  `engine/plugins/SceneIO` boundary: `loadSceneFile`, `saveScene`, `saveScenePng`,
  `saveSceneJpg` route through the registered `parseScene` / `serializeScene`
  callbacks. GMT installs GMF-aware parser/serializer here so a missing argument
  cannot silently downgrade a load/save to plain JSON.
- **e09-camera-plugin** — `CameraUtils` reads `engine.sceneOffset`, the viewport
  camera (via `getViewportCamera()` or `engine.activeCamera`), and emits
  `FRACTAL_EVENTS.CAMERA_TELEPORT` (`engine-gmt/utils/CameraUtils.ts:36-39,116,142`).
  Unified-coordinate helpers are how UI sliders read/write camera state without
  punching through to the engine directly.
- **e11-worker-contract** — `engine` here is the `WorkerProxy` returned by
  `getProxy()` (`engine-gmt/utils/CameraUtils.ts:3-4`); camera reads are
  cross-thread, and `CAMERA_TELEPORT` is the protocol for whole-camera-state writes.

## Known issues / Phase 2 carry-in

- **review-#5 (doc-rewrite carry-in):** `dev/docs/gmt/05_Data_and_Export.md` doesn't
  reflect the engine-gmt fork's `FormulaFormat.ts` move (the doc still cites
  `utils/FormulaFormat.ts`) or the `installSceneIO` indirection added in
  `utils/SceneFormat.ts`. This Phase 2 module doc captures the current layout.
  See `plans/doc-audit-state/reviews/review-2026-05-20-5.md` and
  `plans/doc-audit-state/phase-2-carry-in.json`.
- **Doc-drift items inherited from the survey** (`plans/doc-audit-state/survey/g08-save-load-gmf.md`):
  - Existing doc places `saveGMFScene` at `utils/FormulaFormat.ts`; actual path is
    `engine-gmt/utils/FormulaFormat.ts:221`.
  - Existing doc claims the load flow emits `REGISTER_FORMULA` and calls
    `loadPreset`; the code does neither — those are caller responsibilities
    (`engine-gmt/utils/FormulaFormat.ts:244-261`).
  - Existing doc names the PNG iTXt key `"FractalData"`; embeds use `'SceneData'`
    with `'FractalData'` as legacy-read fallback (`utils/SceneFormat.ts:34,41,106,120-121`).
  - Existing doc's Metadata schema omits `shaderMeta?` (`engine-gmt/utils/FormulaFormat.ts:103-109,191-194`).
  - Existing doc does not mention the Modular empty-shader carve-out
    (`engine-gmt/utils/FormulaFormat.ts:178`).
  - Existing doc does not mention the silent JSON downgrade for unknown formulas in
    `saveGMFScene` (`engine-gmt/utils/FormulaFormat.ts:222-226`).
  - Existing doc does not describe the `SceneIO` plugin boundary
    (`utils/SceneFormat.ts:14-26`).
- **Orphan-sweep candidates flagged in the survey:**
  - `engine-gmt/utils/BenchProfiler.tsx` — confirm at least one app entry point still
    wraps subtrees with `<BenchProfiler>` and the bench harness is still in use.
  - `engine-gmt/utils/FormulaFormat.ts` — confirm `generateGMF` / `parseGMF` have
    external callers (Formula Gallery, Workshop import) beyond `saveGMFScene` /
    `loadGMFScene`; otherwise candidates for inlining.
  - `engine-gmt/utils/CameraUtils.ts` — audit which callers still use
    `teleportPosition` / `teleportRotation` after the engine fork; confirm
    `CAMERA_TELEPORT` listener still exists in the worker proxy and
    `VirtualSpace.split` remains the canonical split path.
  - `utils/SceneFormat.ts` — verify `installSceneIO` is exercised by GMT in dev; if
    not, GMT may still be reaching directly into `FormulaFormat.ts` and the SceneIO
    indirection is currently dead code in the dev tree.
- **Latent fragility (no current bug):** `parseGMF`'s non-greedy regex can be tricked
  by a literal `</Shader_Function>` inside a GLSL comment
  (`engine-gmt/utils/FormulaFormat.ts:146-151`). Not a hot path — none of the 42
  shipped formulas hit it — but worth a fix if user-authored shaders proliferate.

## Historical context

The user-facing reference for GMF / scene serialization lives at
`docs/gmt/05_Data_and_Export.md:1-177` (stable, pre-engine-fork layout). That doc
covers the wider data-and-export story — video export pipelines (MP4/WebM/PNG/JPG),
multi-pass `uOutputPass` semantics, mediabunny storage strategies, Firefox quirks,
URL sharing, VDB mesh export, Bucket Renderer convergence — alongside the GMF / PNG /
JSON section. This module doc captures only the in-tree GMF + scene-IO + camera-util
+ bench-wrapper APIs that live in the four files audited here. The disposition for
this subsystem is `minor-edits`: this doc does NOT supersede
`docs/gmt/05_Data_and_Export.md:1-177`; treat that file as the broader reference and
this one as the current-code API capture for the four-file slice.

Cross-link: `docs/gmt/05_Data_and_Export.md:1-177`.
