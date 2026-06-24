# AI Formula Kit — build spec (synthesized from design+verify workflow)

> Status: design VERIFIED (`rendersClean: true`, design HOLDS). Ready to build. 2026-06-24.
> Design source: workflow `wf_a43cec35-0d2` output (minGmf / docAudit / uiMap / landingMap / promptDesign / verify).
> Companion: [ai-formula-kit-family-archetypes.md](ai-formula-kit-family-archetypes.md) (guide content for formula families).
> Memory: [[ai-formula-kit]].

## What we're building

A "Modify with AI" feature: the in-app formula-options menu (next to the formula dropdown) gets an item that opens a modal which (a) exports the CURRENT formula as a **minimal GMF** + a paste-ready **prompt** pointing at `gmt-fractals.com/learn/create-formula`, and (b) takes the LLM's result back via a **tolerant clipboard loader** that registers + renders it. Plus: improved `GMF_API_DOCS`, a public guide page on the landing, and formula-dev doc fixes. **No zip. GMF (not JSON) is the authoring target.** Acceptance bar: a WEAK model (Gemini 2.5) succeeds with only the kit.

## Verified facts that drive the build (do NOT relitigate)

- A plain per-iteration minimal GMF **renders cleanly**: `applyPresetState` backfills every registered feature from DDFS defaults; quality defaults are render-safe (maxSteps 300, fudge 1, detail 1, estimator 0); absent `lights` → `DEFAULT_LIGHTS`; camera from the included back-off pose; `loadScene` forces a full-config compile.
- **Minimal renderable preset** = `{ formula, features:{ coreMath:{ iterations, <the params the shader reads> } }, sceneOffset, targetDistance, cameraMode:'Orbit', cameraRot:{0,0,0,1} }`. Everything else strippable.
- **3 corrections from verify, baked in below:** (1) keep the legacy `shader.selfContainedSDE` boolean — the WORKER compile reads ONLY that flag (`REGISTER_FORMULA` carries `{function,loopBody,loopInit?,getDist?,preamble?,selfContainedSDE?}` and forces capabilities to `new Set()`); dropping it black-screens self-contained/imported formulas. (2) Lights survive via DDFS default backfill, not `preserveOnApply`. (3) Keep the `<!--header-->` and refuse `Modular`.
- Imported (frag) formulas are already native-shaped (V4 `emitSelfContained` stamps `selfContainedSDE`+capabilities+preambleVars); `generateGMF` stashes all set `shaderMeta` keys, so they round-trip. `importSource` is Workshop-re-edit-only → omit by default.
- Paste-back is the real second risk: `isGMFFormat` requires the string to START with `<!--`/`<Metadata>` → any LLM preamble/fence misroutes to `JSON.parse` → throw → "Invalid formula file". The sanitizer is mandatory.

## User refinements (2026-06-24) — both load-bearing

1. **Error feedback loop on paste-back.** When a loaded formula has a shader COMPILE error, GMT must surface an actionable message — not silently black-screen. Tell the user to open the console (F12), copy the GLSL error, and paste it back to their LLM to fix. IDEAL: capture the error text via the worker shader-error hook (grep `FRACTAL_EVENTS` for a compile/shader-error event; the worker already reports shader errors — see the worker shader-error hook from the mobile-boot-diagnostic work) and show it IN the modal with a **"Copy error for LLM"** button. Fallback if not capturable: a toast "This formula has a shader error — press F12, copy the error, paste it back to your LLM." This is part of the Unit B build.
2. **Prefer per-iteration; avoid self-contained.** Self-contained SDE (`loopBody` ending in `break;`) DISABLES interlace, hybrid, and burning-ship → worse capability. The `buildModifyPrompt` output rules, the landing guide, AND the `GMF_API_DOCS` must steer the LLM to author `shape:per-iteration` formulas by default, and treat self-contained as a LAST RESORT only when the math genuinely cannot be decomposed into independent per-iteration steps. State the capability cost explicitly so a weak model doesn't reach for `break;` casually.

## Interface contract (so parallel agents don't collide)

New file `engine-gmt/utils/formulaBrief.ts` exports:
```ts
// Minimal GMF for the current formula. Starts with the <!--header--> but WITHOUT the GMF_API_DOCS block.
// Throws (or returns null) if def.id === 'Modular'. Keeps full shaderMeta (selfContainedSDE etc).
export function buildFormulaBrief(def: FractalDefinition, opts?: {
  includeParams?: boolean;        // default true (trimmed params → tweakable sliders)
  includeImportSource?: boolean;  // default false
}): string;

// The paste prompt: instruction + guide link + the minimal GMF inlined + a {goal} blank + output-format rules.
export function buildModifyPrompt(minimalGmf: string, formulaName: string): string;

// Tolerant paste-back: strip ``` fences + leading/trailing prose, slice from first '<!--'/'<Metadata>'
// to the last closing tag; return clean GMF or null (→ friendly toast). Mirror the sanitizerSpec.
export function sanitizeGMF(text: string): string | null;
```
Build mechanics: build the minimal preset, clone a trimmed `def` (drop description/tags/thumbnail, keep `shader` incl. capabilities + legacy flags + preambleVars, drop `importSource` unless opt), call `generateGMF(minimalDef, minimalPreset)`, then post-strip the `GMF_API_DOCS` comment (between the header's closing `-->` and `<Metadata>`).

## Build units (disjoint file-sets — safe to parallelize)

**Unit A — core utils (app).** New `engine-gmt/utils/formulaBrief.ts` (the 3 exports). Edit `engine-gmt/utils/FormulaFormat.ts`: replace the `GMF_API_DOCS` constant with the improved text (verbatim base in the workflow output `docAudit.gmfApiDocsRewrite`; must fix `int→float uIterations`, advertise `gmt_precalcRodrigues/gmt_applyRodrigues/gmt_applyTwist` (mark applyPre/Post/World as engine-internal), add `uEscapeThresh`/`uDeBailout`/`uTime`, add a GMF FILE STRUCTURE section + MUST-DOs + the capabilities/selfContainedSDE note, add `textureLod0`+constants). Touches ONLY FormulaFormat.ts (GMF_API_DOCS) + new file.

**Unit B — modal + menu + clipboard (app).** New `engine-gmt/components/panels/formula/ModifyWithAIModal.tsx`. Edit `FormulaSelect.tsx`: add a "Modify with AI…" menu item to the formula-options menu (disabled when `formula === 'Modular'`) that opens the modal; the modal shows instruction + prompt preview + Copy + Save-as-`.md` + a paste-back box (`sanitizeGMF` → mirror the existing import handler at L114-126: `loadGMFScene` → `registry.register` if new → `FRACTAL_EVENTS.REGISTER_FORMULA` → setFormula/apply). Use the modal primitive from `uiMap` (no backdrop-close). Imports `buildFormulaBrief`/`buildModifyPrompt`/`sanitizeGMF` from Unit A. Touches ONLY FormulaSelect.tsx + new modal file.

**Unit C — landing guide (landing repo `h:/GMT/workspace-gmt/landing`).** New `src/pages/learn/create-formula.astro` following `landingMap.pageSkeleton` + the 12-section `guideOutline`; fold in the family-archetype content from the companion file. Edit `src/pages/learn/index.astro` (+ any nav) to link it. Touches ONLY the landing tree.

**Unit D — docs (app).** Edit `docs/DOCS_INDEX.md`: add the entries from `docAudit.docsIndexEntries`. Edit `docs/gmt/25_Formula_Dev_Reference.md`: **append-only reconciliation** — `docs/gmt/*` is append-only per CLAUDE.md, but the user explicitly asked to fix the dev docs. Resolution: PREPEND a dated `> **Update 2026-06-24 (corrections; decision unchanged):**` banner near the top capturing the drift — capabilities REQUIRED since P8; §1/§3.7-3.9/§9-checklist native-registration is pre-extraction GMT and does NOT apply to GMF authoring; §3.3a wrongly lists KleinianMobius as self-contained (it's `shape:per-iteration`, interlace-capable); duplicate `### 3.8` should be `### 3.9`; estimator 5 (cutting-plane) exists. Do NOT rewrite the body. Touches ONLY DOCS_INDEX.md + doc 25.

## Workflow-output pointers (verbatim long fields)

Build agents read their section from the design output file (this session):
`C:\Users\gighz\AppData\Local\Temp\claude\h--GMT-workspace-gmt-stable\c4518db9-df35-4b74-9e57-e2a58bd7238b\tasks\w8xexhtjp.output`
- `docAudit.gmfApiDocsRewrite` ≈ line 114; `guideOutline` 115-128; `docsIndexEntries` 129-132; `verifiedHelperSignatures` 134
- `uiMap` 136-151; `landingMap` 152-158; `promptDesign` (promptTemplate 160-174, sanitizerSpec 175-188)
- `minGmf` 6-45 (buildFormulaBriefSignature L43); `docAudit.docIssues` 47-113; `verify` 189-209

## Acceptance

`npm run typecheck` clean; build OK; round-trip: export current formula via `buildFormulaBrief` → `loadGMFScene` → renders (not black) for one built-in (e.g. Mandelbulb) and one imported formula. Then: hand to user for the Gemini 2.5 test (a) variation, (b) from-scratch, (c) frag→native cleanup; pass = `sanitizeGMF`+load renders clean. No commit/push — leave staged on branches.
