
import { FractalDefinition, Preset } from '../types';
import { registry } from '../engine/FractalRegistry';

/**
 * GMF (GPU Mandelbulb Format) Parser & Generator
 *
 * Strategy:
 * Separate the JSON metadata from the raw GLSL code to allow for a readable,
 * copy-paste friendly file format that doesn't require escaping newlines in shader strings.
 */

const GMF_API_DOCS = `
/*
 * ============================================================
 *  GMT FRACTAL FORMULA — .gmf AUTHORING KIT
 *  Full guide: https://gmt-fractals.com/learn/create-formula
 * ============================================================
 *
 * This file is a GMF (GPU Mandelbulb Format) container. It holds a fractal
 * definition you can edit by hand or with an LLM, then drag-and-drop or paste
 * back into the GMT app to register and render it.
 *
 * ---- FILE STRUCTURE ----
 * A GMF is plain text. The loader reads these blocks (order is fixed; tags are
 * literal). Only <Metadata>, <Shader_Function> and <Shader_Loop> are required.
 *
 *   <Metadata> ... </Metadata>
 *       JSON describing the formula. Required keys:
 *         "id"          unique formula id (no spaces), e.g. "MyBulb"
 *         "name"        display name
 *         "parameters"  array of UI controls (see PARAMETERS below); use null
 *                       for an unused slot
 *         "defaultPreset" initial scene (camera, lights, feature values). At
 *                       minimum: { "formula":"<id>", "features": {
 *                       "coreMath": { "iterations": 10, ...params },
 *                       "quality": { "estimator": 0, "fudgeFactor": 0.5,
 *                       "maxSteps": 300 } } }
 *       Optional keys: "shortDescription", "description", "juliaType"
 *       ("julia" | "offset" | "none"), "tags".
 *       Optional "shaderMeta": { "selfContainedSDE": true, "preambleVars":[...] }
 *       — see MUST-DO #4. Do NOT hand-write a "capabilities" field; the loader
 *       derives it from the shader automatically.
 *
 *   <Shader_Preamble> ... </Shader_Preamble>   (optional)
 *       Global-scope GLSL: helper functions and mutable globals. Runs once at
 *       compile. You CANNOT call gmt_* transform helpers from here (declared
 *       later) — call them from <Shader_Init>.
 *
 *   <Shader_Init> ... </Shader_Init>           (optional)
 *       GLSL run once before the iteration loop. In scope: z, c, dr, trap, iter.
 *       Typical use: precalc, e.g.  gmt_precalcRodrigues(uVec3B);
 *
 *   <Shader_Function> ... </Shader_Function>    (REQUIRED)
 *       Your formula function. Signature is fixed:
 *         void formula_<id>(inout vec4 z, inout float dr, inout float trap, vec4 c)
 *
 *   <Shader_Loop> ... </Shader_Loop>            (REQUIRED)
 *       The single call placed inside the engine's iteration loop, usually:
 *         formula_<id>(z, dr, trap, c);
 *
 *   <Shader_Dist> ... </Shader_Dist>            (optional — usually OMIT)
 *       The BODY of the estimator. The engine wraps your block as
 *         vec2 getDist(float r, float dr, float iter, vec4 z) { <your block> }
 *       so write STATEMENTS ONLY — do NOT include the "vec2 getDist(...)" line or
 *       any function definition (GLSL has no nested functions → won't compile) —
 *       and END with:  return vec2(distance, smoothIteration);   // a vec2, not a float
 *       Most formulas should OMIT this and just set defaultPreset.quality.estimator.
 *
 * ---- THE FORMULA FUNCTION ----
 *   z    : current point. z.xyz = position, z.w = 4th dimension (init from uParamB)
 *   dr   : running derivative for distance estimation. Starts at 1.0
 *   trap : orbit-trap accumulator for colour. Starts at 1e10
 *   c    : iteration constant. Mandelbrot: c = initial z. Julia: c = vec4(uJulia, uParamA)
 *   The engine runs the loop and handles escape/bailout — do NOT loop or check
 *   escape yourself (unless you use the self-contained pattern, MUST-DO #4).
 *
 * ---- MUST DO (or it renders wrong / black) ----
 *   1. UPDATE dr every call to match your math, or the surface is garbage:
 *        power fractal:  dr = power * pow(max(r,1e-10), power-1.0) * dr + 1.0;
 *        IFS / fold:     dr *= abs(scale);   (accumulate per fold stage)
 *   2. UPDATE trap with a POSITIVE distance (the colourer clamps <=0 to a floor):
 *        trap = min(trap, length(z.xyz));   // or dot(z.xyz,z.xyz)
 *      Never feed log-distances or negatives into trap.
 *   3. HANDLE Julia mode for power fractals:
 *        if (uJuliaMode > 0.5) z.xyz += c.xyz;   // add the constant
 *      (Set "juliaType":"offset" for fold/IFS fractals, "none" to hide the toggle.)
 *   4. PREFER per-iteration. Write ONE step of the iteration and let the engine
 *      run the loop. Only if the math genuinely cannot be decomposed: let your
 *      <Shader_Loop> own its own loop, end it with break;, and you MUST set
 *      "shaderMeta": { "selfContainedSDE": true } in <Metadata>. Read uIterations
 *      as int(uIterations) to cap your internal loop, and encode trap/iteration
 *      yourself. Self-contained DISABLES hybrid / interlace / burning-ship — it
 *      strictly reduces what the engine can do, so use it only as a last resort.
 *
 * ---- UNIFORMS (read-only inputs) ----
 *  Scalar params (UI sliders):  float uParamA uParamB uParamC uParamD uParamE uParamF
 *  Vector params:               vec2 uVec2A/B/C   vec3 uVec3A/B/C   vec4 uVec4A/B/C
 *  GOTCHA: uParamB initialises z.w (4D), and uParamA becomes c.w in Julia mode.
 *          Prefer uParamC..F for ordinary scalars unless you want that.
 *  System:
 *    float uIterations     max iterations (cap loops with int(uIterations))
 *    float uJuliaMode      >0.5 = Julia, else Mandelbrot
 *    vec3  uJulia          Julia seed (xyz)
 *    float uDistanceMetric 0=Euclidean 1=Chebyshev 2=Manhattan 3=Minkowski-4(L4)
 *    float uEscapeThresh   colouring escape radius (default 4.0)  — colouring only
 *    float uDeBailout      raymarch DE bailout |z|^2 (default 100.0) — geometry
 *    float uTime           seconds — AVOID in the formula body (breaks accumulation)
 *
 * ---- HELPER FUNCTIONS (call freely) ----
 *    void  sphereFold(inout vec3 z, inout float dz, float minR, float fixedR)
 *    void  boxFold(inout vec3 z, inout float dz, float foldLimit)
 *    float getLength(vec3 p)        distance metric (respects uDistanceMetric)
 *    float snoise(vec3 v)           3D simplex noise, -1..1
 *    vec4  textureLod0(sampler2D t, vec2 uv)
 *    (sphereFold / boxFold take the running derivative dr as their 2nd argument.)
 *  Rodrigues AXIS-ANGLE rotation (call gmt_precalcRodrigues from <Shader_Init>, apply inside):
 *    void  gmt_precalcRodrigues(vec3 params)   params = (azimuth, pitch, angle)
 *    void  gmt_applyRodrigues(inout vec3 p)
 *    void  gmt_applyTwist(inout vec3 p, float amount)
 *  NO per-axis rotation helpers exist (gmt_rotate_x/y/z, rotX… do NOT exist and
 *  will not compile). Rotate around an axis with an inline 2x2 matrix:
 *    float ca=cos(a), sa=sin(a); p.xy = mat2(ca, sa, -sa, ca) * p.xy;  // around Z
 *    (around X -> rotate p.yz ; around Y -> rotate p.xz)
 *  Constants: PI, TAU, INV_PI, INV_TAU, phi (golden ratio).
 *  GLSL ES 3.0 note: do NOT initialise \`const\` with sqrt()/normalize()/cos();
 *  use a non-const global set in a precalc function instead.
 *  ENGINE-INTERNAL (applied automatically by the DE loop — do NOT call these as
 *  your rotation control): applyPreRotation / applyPostRotation / applyWorldRotation.
 *
 * ---- BUILT-IN ESTIMATORS (defaultPreset.quality.estimator) ----
 *    0 Analytic/Log  0.5*r*ln(r)/dr   power fractals (Mandelbulb)
 *    1 Linear        (r-1.0)/dr       IFS / box-fold (Menger, Sierpinski)
 *    2 Pseudo        r/dr             sparse / artistic
 *    3 Dampened      0.5*r*ln(r)/(dr+8) fixes slicing on thin structures
 *    4 Linear(2.0)   (r-2.0)/dr       classic Menger offset
 *  (5 Cutting-Plane is formula-gated; ignore for normal formulas.)
 *  fudgeFactor ("Step Size"): default 1.0. Use ~0.5 for hand-written
 *  DEs — values <1 take smaller raymarch steps so an imperfect/overestimating
 *  estimator doesn't overshoot the surface (which shows as flat "slices"/holes).
 *
 * To modify this formula: edit the GLSL blocks and the <Metadata> JSON below,
 * then drag this file onto the app or paste it via "Modify with AI".
 */
`;

// ─── Original GMF Generator/Parser (formula-only, used by FormulaSelect/Gallery) ──

/** Helper to neat-ify JSON (Condense small objects to single lines) */
const neatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2)
        .replace(/\{\n\s+"label":[\s\S]+?\}/g, (m) => {
            return m.includes('"id": "param') ? m.replace(/\n\s+/g, ' ') : m;
        })
        .replace(/"(cameraPos|cameraRot|sceneOffset|julia|position)": \{\n\s+"[xyz]":[\s\S]+?\}/g, (m) => m.replace(/\n\s+/g, ' '))
        .replace(/"params": \{\n\s+"A":[\s\S]+?\}/g, (m) => m.replace(/\n\s+/g, ' '));
};

/**
 * Normalize shader code indentation for clean GMF output.
 * Strips common leading whitespace from all lines (dedent), producing
 * GLSL that looks correctly indented inside the GMF file.
 */
const dedentGLSL = (code: string): string => {
    // Split BEFORE trimming so we can measure actual indentation
    const lines = code.split('\n');

    // Drop leading/trailing empty lines
    while (lines.length > 0 && lines[0].trim() === '') lines.shift();
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

    if (lines.length === 0) return '';
    if (lines.length === 1) return lines[0].trim();

    // Find minimum leading whitespace across non-empty lines
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim().length === 0) continue;
        const match = line.match(/^(\s*)/);
        if (match) minIndent = Math.min(minIndent, match[1].length);
    }
    if (minIndent === 0 || minIndent === Infinity) return lines.join('\n');

    return lines.map(line => line.slice(minIndent)).join('\n');
};

export const generateGMF = (def: FractalDefinition, preset: Partial<Preset>): string => {
    // 1. Prepare Metadata (exclude shader object as it will be emitted as tags)
    // We clone to avoid mutating the original definition during delete
    const { shader, ...meta } = def;

    // Preserve shader metadata that isn't GLSL code but is needed at load time.
    // These live on the shader object but don't map to a GLSL block, so we
    // stash them in Metadata. Since the legacy-flag retirement (ADR-0059
    // completion) the runtime carries capabilities only — the retired booleans
    // (selfContainedSDE / usesSharedRotation / supportsCuttingPlane) are still
    // ACCEPTED on parse (promoted to tokens) but no longer written.
    const shaderMeta: Record<string, any> = {};
    if (shader.preambleVars?.length) shaderMeta.preambleVars = shader.preambleVars;
    // Stash capabilities as a sorted array (Sets aren't JSON-serializable).
    // Sorted for stable diffs across round-trips. Restored as a Set in parseGMF.
    if (shader.capabilities && shader.capabilities.size > 0) {
        shaderMeta.capabilities = [...shader.capabilities].sort();
    }
    // CPU-derived rotation uniforms (MB3D live angle lanes) — plain JSON data;
    // without it a reloaded body reads identity uMb3dRot* forever.
    if (shader.derivedRotations?.length) {
        shaderMeta.derivedRotations = shader.derivedRotations;
    }

    const metadata = {
        ...meta,
        ...(Object.keys(shaderMeta).length > 0 ? { shaderMeta } : {}),
        defaultPreset: preset
    };

    let out = `<!--
  GMF: GPU Mandelbulb Format v1.0
  A portable container for Fractal math definitions + default presets.
  You can edit the GLSL blocks below directly.
-->\n${GMF_API_DOCS}\n`;

    out += `<Metadata>\n${neatJSON(metadata)}\n</Metadata>\n\n`;

    if (shader.preamble) {
        out += `<!-- Global scope code: variables and helper functions (before formula) -->\n`;
        out += `<Shader_Preamble>\n${dedentGLSL(shader.preamble)}\n</Shader_Preamble>\n\n`;
    }

    if (shader.loopInit) {
        out += `<!-- Code executed once before the loop (Setup) -->\n`;
        out += `<Shader_Init>\n${dedentGLSL(shader.loopInit)}\n</Shader_Init>\n\n`;
    }

    out += `<!-- Main Distance Estimator Function -->\n`;
    out += `<Shader_Function>\n${dedentGLSL(shader.function)}\n</Shader_Function>\n\n`;

    out += `<!-- The Iteration Loop Body -->\n`;
    out += `<Shader_Loop>\n${dedentGLSL(shader.loopBody)}\n</Shader_Loop>\n\n`;

    if (shader.getDist) {
        out += `<!-- Optional: Custom Distance/Iteration Smoothing -->\n`;
        out += `<Shader_Dist>\n${dedentGLSL(shader.getDist)}\n</Shader_Dist>\n\n`;
    }

    return out;
};

/**
 * Parse a GMF string into a FractalDefinition. Falls back to JSON FractalDefinition
 * if no `<Metadata>` tag is present.
 *
 * @assumption Tag extraction is LINE-ANCHORED (`^<TAG>…^</TAG>`, `m` flag):
 * real blocks are emitted at column 0, so the regex skips the GMF_API_DOCS
 * banner that mentions the same tag names inside an indented comment. Do NOT
 * relax the anchors — a bare `<TAG>…</TAG>` matched the banner's `<Metadata>`
 * example and parsed prose as JSON, breaking every newly-saved scene (the
 * banner gained literal tag names in the 2026-06 AI-formula-kit rewrite). A
 * shader body whose own line *starts* with `</Shader_Function>` at column 0
 * would still truncate early — latent fragility, no current bug hits it.
 * Modular formulas (`metadata.id === 'Modular'`) are explicitly allowed to
 * ship with empty `Shader_Function` / `Shader_Loop`; their GLSL is rebuilt
 * from the preset's pipeline at load time.
 *
 * @invariant `shaderMeta` is the survival path for non-GLSL shader fields.
 * The complete stashed/restored set is `preambleVars`, `capabilities` and
 * `derivedRotations` (the MB3D CPU-derived angle lanes) — keep this list in
 * sync with the stash in `generateGMF` and the restore below. A future field
 * added to the runtime shader object will be silently dropped on save unless
 * added to both the stash (generateGMF) and the restore paths — OR derivable
 * from the shader body (like the cp_* and g_difsDE auto-detects below, which
 * self-heal legacy files retroactively). Prefer a Capability token over a
 * new field. Guarded by the "shaderMeta:" block in `npm run test:gmf`.
 *
 * @assumption This parse boundary is where the RETIRED legacy booleans
 * (`selfContainedSDE`, `usesSharedRotation`, `supportsCuttingPlane`) remain
 * load-bearing: old .gmf files (and hand/AI-authored ones — the GMF_API_DOCS
 * banner teaches `shaderMeta.selfContainedSDE` as the authoring interface)
 * carry them, and they are PROMOTED to capability tokens here. They must keep
 * being read forever; they are never written back and never reach the runtime
 * def. @see docs/adr/0059-feature-capability-protocol.md
 *
 * See ADR-0052 (GMF as two-tier HTML-style container).
 */
export const parseGMF = (content: string): FractalDefinition => {
    const extract = (tag: string) => {
        // Anchor BOTH tags to the start of a line (`m` flag). Real GMF blocks are
        // always emitted at column 0 (`<Tag>\n…\n</Tag>`), whereas the
        // GMF_API_DOCS banner mentions the same tag names INSIDE an indented
        // `/* * … */` comment (e.g. ` *   <Metadata> … </Metadata>`). A bare
        // non-greedy `<Tag>…</Tag>` matched the FIRST occurrence — the banner
        // example — and fed prose to JSON.parse, so every newly-saved scene
        // (whose banner now lists the tags) failed to load. See @invariant below.
        const regex = new RegExp(`^<${tag}>([\\s\\S]*?)^<\\/${tag}>`, 'm');
        const match = content.match(regex);
        return match ? match[1].trim() : null;
    };

    const metadataStr = extract('Metadata');
    if (!metadataStr) {
        // Fallback: Try parsing as pure JSON (legacy support)
        try {
            const json = JSON.parse(content);
            if (json.id && json.shader) return json as FractalDefinition;
        } catch {
            // Not valid JSON either — fall through to throw GMF-specific error
        }
        throw new Error("Invalid GMF: Missing Metadata tag");
    }

    const metadata = JSON.parse(metadataStr);

    // Extract Shader Parts
    const preamble = extract('Shader_Preamble');
    const func = extract('Shader_Function');
    const loop = extract('Shader_Loop');
    const init = extract('Shader_Init');
    const dist = extract('Shader_Dist');

    // Modular builds its shader from the node-graph pipeline (stored in the
    // preset), not from GLSL blocks — so empty Shader_Function / Shader_Loop
    // is valid for Modular files. Imported / custom formulas still require
    // both blocks.
    if ((!func || !loop) && metadata.id !== 'Modular') {
         throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");
    }

    const shader: Record<string, any> = {
        function: func ?? '',
        loopBody: loop ?? '',
        preamble: preamble || undefined,
        loopInit: init || undefined,
        getDist: dist || undefined,
    };

    // Restore shader metadata saved alongside the Metadata JSON, promoting
    // everything capability-shaped into ONE token set. Modern files stash
    // `capabilities` directly; legacy / hand-authored files carry the retired
    // booleans instead (or nothing at all). The booleans are read here and
    // NEVER placed on the runtime shader object — the engine reads tokens only.
    const sm = metadata.shaderMeta;
    if (sm?.preambleVars) shader.preambleVars = sm.preambleVars;
    if (Array.isArray(sm?.derivedRotations) && sm.derivedRotations.length) {
        shader.derivedRotations = sm.derivedRotations;
    }

    const caps = new Set<string>(Array.isArray(sm?.capabilities) ? sm.capabilities : []);
    if (metadata.id === 'Modular') {
        caps.add('shape:modular');
    } else {
        // Legacy boolean promotion. selfContainedSDE wins over a contradictory
        // per-iteration token — the boolean was the load-bearing engine gate
        // when these files were written.
        if (sm?.selfContainedSDE) caps.add('shape:self-contained');
        if (sm?.usesSharedRotation) caps.add('iter:shared-rotation');
        if (sm?.supportsCuttingPlane) caps.add('estimator:cutting-plane');

        // Body auto-detects — self-heal files saved before the corresponding
        // flag/token existed. Any formula referencing the engine-provided cp_*
        // accumulators needs CP_PREAMBLE declared upstream; any formula
        // declaring g_difsDE in its preamble (MB3D dIFS import) needs the
        // dIFS estimator gate open. The g_difsDE detect also RESCUES scenes
        // saved while the old `supportsDifs` boolean was never stashed —
        // those files reloaded with a silent Linear-estimator fallback.
        const body = `${shader.function} ${shader.loopBody} ${shader.preamble || ''} ${shader.loopInit || ''}`;
        if (/\bcp_(dmin|scale|trap)\b/.test(body)) caps.add('estimator:cutting-plane');
        if (/\bg_difsDE\b/.test(shader.preamble || '')) caps.add('estimator:difs');

        // Exactly one shape token per non-Modular formula: self-contained wins
        // (whether promoted from the boolean or stashed directly); legacy files
        // without any shape information default to per-iteration (mirrors the
        // deleted deriveLegacy shim).
        if (caps.has('shape:self-contained')) caps.delete('shape:per-iteration');
        else caps.add('shape:per-iteration');
    }
    shader.capabilities = caps;
    if (sm) delete metadata.shaderMeta;

    return {
        ...metadata,
        shader
    };
};


// ─── Scene-Level GMF (v2): Full scene state + formula definition ─────────────
//
// The scene GMF extends the formula GMF by adding a <Scene> block that contains
// the full scene preset (camera, lights, features, etc.) as JSON.
// The formula metadata and shader blocks remain identical to v1 for compatibility.

/**
 * Detect whether a string is GMF format (vs plain JSON).
 *
 * @invariant Strict prefix check on `trimStart()` — the first non-whitespace
 * bytes must be `'<!--'` or `'<Metadata>'`, else the content is treated as
 * JSON. A leading UTF-8 BOM is NOT a problem: ECMAScript `WhiteSpace`
 * includes U+FEFF (`<ZWNBSP>`), so `trimStart()` eats it and a BOM-prefixed
 * GMF still dispatches (and parses) correctly — pinned by `npm run test:gmf`.
 * A stray leading container tag (e.g. an HTML wrapper) DOES misclassify.
 * Used as the dispatch predicate by `loadGMFScene`.
 *
 * NOTE: engine-core's `parseSceneJson` (`utils/SceneFormat.ts`) sniffs
 * `'<!--'` ONLY — it does not accept the bare `'<Metadata>'` opening this
 * predicate allows. Apps that route loads through engine-core's default
 * parser instead of a GMF-aware one will reject header-less GMF. app-gmt
 * installs `loadGMFScene` as its `parseScene`, so it is unaffected.
 */
export const isGMFFormat = (content: string): boolean => {
    const trimmed = content.trimStart();
    return trimmed.startsWith('<!--') || trimmed.startsWith('<Metadata>');
};

/**
 * Save a full scene as GMF string.
 * Embeds the formula definition (shader + metadata) AND the full scene preset.
 * The scene preset lives in a separate <Scene> block after the shader blocks.
 *
 * @assumption Silently downgrades to plain `JSON.stringify(preset)` when
 * `registry.get(preset.formula)` returns undefined — NO log, NO telemetry.
 * Forks that need telemetry on unknown formulas at save-time must wrap this.
 *
 * @assumption The formula payload embeds `def.defaultPreset` (NOT the live
 * preset); the current preset is appended in `<Scene>`. See ADR-0053.
 */
export const saveGMFScene = (preset: Preset): string => {
    const def = registry.get(preset.formula);
    if (!def) {
        // Fallback: if formula not in registry, save as JSON
        return JSON.stringify(preset, null, 2);
    }

    // Generate standard formula GMF (metadata + shader blocks)
    let out = generateGMF(def, def.defaultPreset);

    // Append Scene block with full scene state
    out += `<!-- Full scene state (camera, lights, features, quality, animations) -->\n`;
    out += `<Scene>\n${neatJSON(preset)}\n</Scene>\n`;

    return out;
};

/**
 * Load a GMF or JSON string, returning the formula definition and scene preset.
 * Handles:
 *   - Scene GMF (v2): has <Scene> block → extracts both formula def + scene preset
 *   - Formula-only GMF (v1): no <Scene> block → uses defaultPreset from metadata
 *   - Legacy JSON: plain JSON preset (backward compatibility)
 *
 * @assumption Does NOT register the formula — caller (System Menu / drag-drop
 * handler) checks registry and registers if needed. Callers that apply the
 * returned `preset` without first ensuring the formula is registered will
 * fail at compile (no formula → empty shader → black screen). See ADR-0053.
 *
 * @assumption v1 formula-only GMF (no `<Scene>` block) synthesises a preset
 * from `def.defaultPreset` falling back to `{ formula: def.id }`. Legacy JSON
 * path returns `{ preset }` with no `def`.
 */
export const loadGMFScene = (content: string): { def?: FractalDefinition, preset: Preset } => {
    if (isGMFFormat(content)) {
        // Parse the formula definition (metadata + shader blocks)
        const def = parseGMF(content);

        // Check for Scene block (v2 scene GMF)
        const sceneMatch = content.match(/^<Scene>([\s\S]*?)^<\/Scene>/m);
        if (sceneMatch) {
            const preset = JSON.parse(sceneMatch[1].trim()) as Preset;
            return { def, preset };
        }

        // v1 formula-only GMF — use defaultPreset from metadata
        const preset = (def.defaultPreset || { formula: def.id }) as Preset;
        if (!preset.formula) preset.formula = def.id;
        return { def, preset };
    }

    // Legacy JSON format
    const preset = JSON.parse(content) as Preset;
    return { preset };
};
