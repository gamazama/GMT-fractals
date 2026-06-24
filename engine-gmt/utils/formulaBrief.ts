/**
 * formulaBrief — "Modify with AI" core utilities.
 *
 * Three helpers backing the in-app Modify-with-AI formula kit:
 *
 *  - {@link buildFormulaBrief} exports the CURRENT formula as a MINIMAL GMF
 *    (the `<!--header-->` + `<Metadata>` + shader blocks, WITHOUT the bulky
 *    `GMF_API_DOCS` comment) so the paste stays small. The minimal preset keeps
 *    only `coreMath` (iterations + the params the shader reads) + a known-good
 *    back-off camera; everything else is backfilled from DDFS defaults on load.
 *    Full `shaderMeta` (selfContainedSDE / capabilities / preambleVars / legacy
 *    flags) is preserved so self-contained & cutting-plane formulas round-trip.
 *
 *  - {@link buildModifyPrompt} wraps that minimal GMF in a paste-ready LLM
 *    prompt (instruction + guide link + {goal} blank + strict output rules).
 *
 *  - {@link buildConvertPrompt} is the sibling prompt for CONVERTING a
 *    self-contained (imported `break;`-loop) formula into a native
 *    `shape:per-iteration` one — preferring the original `.frag` source, with a
 *    decompose recipe + the same OUTPUT RULES / guide link / USER INSTRUCTIONS
 *    trailer as {@link buildModifyPrompt}.
 *
 *  - {@link sanitizeGMF} is the tolerant paste-back loader: it strips markdown
 *    fences + leading prose and slices to the first GMF tag, so the strict
 *    `isGMFFormat` predicate (which requires the string to START with
 *    `<!--`/`<Metadata>`) accepts an LLM's wrapped output. Returns clean GMF or
 *    null (→ friendly toast) so the loader never mis-routes prose into
 *    `JSON.parse`.
 *
 * @invariant `buildFormulaBrief` MUST NOT strip `shader.capabilities` / the
 *  legacy `selfContainedSDE`/`supportsCuttingPlane`/`usesSharedRotation` flags /
 *  `preambleVars`. There is NO auto-restore for self-contained formulas — losing
 *  the flag mis-derives `shape:per-iteration` and black-screens the render.
 *
 * @invariant `buildFormulaBrief` REFUSES `def.id === 'Modular'`: a Modular
 *  formula's GLSL lives in the node graph, not the shader blocks, so a minimised
 *  Modular GMF loads but renders blank.
 *
 * @see plans/ai-formula-kit-spec.md
 * @see docs/adr/0053-*.md (GMF as two-tier container)
 */

import type { FractalDefinition, Preset } from '../types';
import { generateGMF } from './FormulaFormat';

/** Canonical back-off pose: a fresh formula frames to z~2 with the camera
 *  pulled out and looking at the origin (identity rotation, Orbit mode). */
const CANONICAL_CAMERA = {
    sceneOffset: { x: 0, y: 0, z: 2, xL: 0, yL: 0, zL: 0 },
    targetDistance: 2,
    cameraMode: 'Orbit' as const,
    cameraRot: { x: 0, y: 0, z: 0, w: 1 },
};

export interface BuildFormulaBriefOptions {
    /** Keep the formula's tweakable param sliders (the trimmed `parameters`
     *  array). Default true. Set false for a pure render with no sliders. */
    includeParams?: boolean;
    /** Carry `def.importSource` (the original .frag glsl + mappings) for
     *  Workshop re-edit. Default false — it's the largest field and bloats the
     *  paste. */
    includeImportSource?: boolean;
}

/**
 * Build a minimal, paste-friendly GMF for the current formula.
 *
 * Starts with the `<!--header-->` but WITHOUT the `GMF_API_DOCS` block (those
 * docs live on the landing guide, not the paste). Throws for the Modular
 * formula. Keeps full `shaderMeta` so self-contained / cutting-plane formulas
 * survive the round-trip.
 */
export function buildFormulaBrief(def: FractalDefinition, opts: BuildFormulaBriefOptions = {}): string {
    if (def.id === 'Modular') {
        throw new Error(
            "Modular formulas can't be exported to the AI kit — their shader lives in the node graph, not portable blocks. Export a native or imported formula instead.",
        );
    }

    const includeParams = opts.includeParams !== false;
    const includeImportSource = opts.includeImportSource === true;

    // ── Minimal coreMath: iterations + the params this formula actually reads ──
    // A FractalParameter.id is exactly a coreMath key (paramA.., vec2A.., etc),
    // so the param ids ARE the keys the shader reads via uParamA / uVec2A / …
    const sourceCore: Record<string, any> = def.defaultPreset?.features?.coreMath ?? {};
    const coreMath: Record<string, any> = {};
    if (sourceCore.iterations !== undefined) coreMath.iterations = sourceCore.iterations;
    for (const p of def.parameters ?? []) {
        if (!p) continue;
        if (sourceCore[p.id] !== undefined) coreMath[p.id] = sourceCore[p.id];
    }

    // ── Camera: derive from def.defaultPreset, fall back to the canonical pose ──
    const dp = def.defaultPreset ?? {};
    const sceneOffset = dp.sceneOffset ?? CANONICAL_CAMERA.sceneOffset;
    const targetDistance = dp.targetDistance ?? CANONICAL_CAMERA.targetDistance;
    const cameraMode = dp.cameraMode ?? CANONICAL_CAMERA.cameraMode;
    const cameraRot = dp.cameraRot ?? CANONICAL_CAMERA.cameraRot;

    const minimalPreset: Partial<Preset> = {
        formula: def.id,
        features: { coreMath },
        sceneOffset,
        targetDistance,
        cameraMode,
        cameraRot,
    };

    // ── Trimmed def clone: drop catalog/UI metadata, KEEP the full shader ──
    // (function, loopBody, loopInit, getDist, preamble, preambleVars,
    //  capabilities + the legacy selfContainedSDE/supportsCuttingPlane/
    //  usesSharedRotation flags — generateGMF stashes them into shaderMeta).
    const minimalDef: FractalDefinition = {
        id: def.id,
        name: def.name,
        ...(def.juliaType ? { juliaType: def.juliaType } : {}),
        shader: def.shader,
        parameters: includeParams ? def.parameters : [],
        defaultPreset: minimalPreset,
        ...(includeImportSource && def.importSource ? { importSource: def.importSource } : {}),
    };

    const gmf = generateGMF(minimalDef, minimalPreset);

    // ── Post-strip the GMF_API_DOCS comment so the paste stays small ──
    // generateGMF emits: <!--header-->\n${GMF_API_DOCS}\n<Metadata>\n…
    // Drop everything between the header's closing '-->' and the REAL
    // <Metadata> tag, leaving the result still STARTING with the '<!--header-->'
    // so isGMFFormat() stays true.
    //
    // The GMF_API_DOCS comment itself mentions "<Metadata>" inline in its prose,
    // so we anchor on the emitted tag form (start-of-line "<Metadata>\n") rather
    // than a bare indexOf, which would land inside the docs comment.
    const headerEnd = gmf.indexOf('-->');
    const metaMatch = gmf.match(/^<Metadata>\s*$/m);
    const metaStart = metaMatch?.index ?? -1;
    if (headerEnd >= 0 && metaStart > headerEnd) {
        return `${gmf.slice(0, headerEnd + 3)}\n\n${gmf.slice(metaStart)}`;
    }
    return gmf;
}

/**
 * Build the paste-ready LLM prompt: instruction + guide link + the minimal GMF
 * inlined + a {goal} blank + strict output-format rules. The output rules steer
 * the model toward `shape:per-iteration` formulas (self-contained `break;`
 * disables interlace / hybrid / burning-ship).
 */
export function buildModifyPrompt(minimalGmf: string, formulaName: string): string {
    return `You are authoring a fractal formula for GMT, a real-time GPU fractal renderer. GMT formulas use a plain-text container called GMF (GPU Mandelbulb Format). Your job is to read the formula below, apply the change the user wants, and output a new, complete GMF.

================ FULL AUTHORING GUIDE ================
The complete reference (shader API, all uniforms, helper functions, capability tokens, worked examples) is here:
https://gmt-fractals.com/learn/create-formula
Read it. It defines every uniform (uParamA..uParamF, uVec2A.., uVec3A.., uIterations, uTime, uJulia, uJuliaMode, uDistanceMetric, uEscapeThresh, uDeBailout), every helper (sphereFold, boxFold, snoise, getLength, the gmt_* Rodrigues rotation trio), and the exact formula function signature.

================ HOW A GMF WORKS (read before editing) ================
A GMF is NOT JSON-with-escaped-newlines. It is a small set of XML-like blocks. The file MUST begin with \`<Metadata>\` (a JSON block) and then contain GLSL blocks written as RAW multi-line code (no escaping, no "\\n"):

  <Metadata> ... formula id, name, parameters[], defaultPreset ... </Metadata>
  <Shader_Preamble> ...optional global GLSL... </Shader_Preamble>
  <Shader_Init> ...optional once-before-loop GLSL... </Shader_Init>
  <Shader_Function> ...REQUIRED: the formula function... </Shader_Function>
  <Shader_Loop> ...REQUIRED: one line calling the function... </Shader_Loop>
  <Shader_Dist> ...optional, usually OMIT. The BODY of "vec2 getDist(float r, float dr, float iter, vec4 z)" — statements ONLY (no function signature/wrapper), ending with "return vec2(distance, smoothIter);". Prefer setting defaultPreset.features.quality.estimator instead... </Shader_Dist>

The formula function signature is EXACTLY:
  void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)
    z    = current point (z.xyz = position, z.w = auxiliary)
    dr   = running derivative — you MUST update it every iteration or the surface vanishes
    trap = orbit-trap accumulator for coloring — update via trap = min(trap, <positive value>)
    c    = the per-pixel constant (Julia seed when uJuliaMode>0.5, else the pixel position)

================ HELPERS & ROTATIONS (exact — do NOT invent function names) ================
These are the ONLY built-in helpers. Match the argument count EXACTLY:
  void  sphereFold(inout vec3 z, inout float dr, float minR, float fixedR);
  void  boxFold(inout vec3 z, inout float dr, float foldLimit);   // NOTE: dr is the 2nd argument
  float getLength(vec3 p);              // distance metric (respects uDistanceMetric)
  float snoise(vec3 v);                 // 3D simplex noise, -1..1
  vec4  textureLod0(sampler2D t, vec2 uv);
  // Rodrigues AXIS-ANGLE rotation — precalc ONCE in <Shader_Init>, then apply in the function:
  //   <Shader_Init>:  gmt_precalcRodrigues(uVec3B);   // params = (azimuth, pitch, angle)
  //   in function:    gmt_applyRodrigues(p);
  void  gmt_precalcRodrigues(vec3 params);
  void  gmt_applyRodrigues(inout vec3 p);
  void  gmt_applyTwist(inout vec3 p, float amount);
Constants available: PI, TAU, INV_PI, INV_TAU, phi.

There are NO per-axis rotation helpers — gmt_rotate_x / gmt_rotate_y / gmt_rotate_z / rotX / rotateY
DO NOT EXIST and will fail to compile. To rotate a point, write the 2x2 rotation INLINE:
  // rotate around Z (acts on x,y) by angle a:
  float ca = cos(a), sa = sin(a);
  p.xy = mat2(ca, sa, -sa, ca) * p.xy;
  // around X -> rotate p.yz the same way ; around Y -> rotate p.xz.
Only reference uniforms/helpers listed here or in the guide; never invent one.

================ THE FORMULA YOU ARE STARTING FROM ================
Name: ${formulaName}

${minimalGmf}

================ OUTPUT RULES (follow exactly) ================
1. Put the COMPLETE .gmf inside ONE triple-backtick code block: a \`\`\` line, then the file starting with the <Metadata> tag, then a closing \`\`\` line. A single fenced block makes the copy verbatim and stops the chat UI from injecting stray formatting tokens into it; the app strips the fence automatically.
2. Use EXACTLY ONE code block and nothing else of substance — no second code block, no commentary, no "Here is...". At most one short sentence before the block. Inside it write RAW GMF: the <Metadata> JSON then the <Shader_*> blocks as raw multi-line GLSL (never escape newlines as \\n); GLSL // comments inside shader blocks only.
3. NO prose, NO commentary, NO explanation, NO "Here is...", NO trailing notes. Not a single word of natural language outside the GMF blocks. Use GLSL \`//\` comments INSIDE shader blocks if you must annotate.
4. Keep the EXACT function signature: void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c). Do not add, remove, reorder, or retype parameters. The function name in <Shader_Function> must match the call in <Shader_Loop>.
5. Keep ALL the <Shader_*> blocks that were present in the starting formula. Always emit <Shader_Function> and <Shader_Loop>. The shader blocks are RAW multi-line GLSL — never collapse the GLSL into JSON, and never escape newlines as "\\n".
6. You MUST update the derivative \`dr\` every iteration (e.g. dr = factor*dr + 1.0). A formula that never writes dr renders as empty space / no surface.
7. Write the orbit trap as trap = min(trap, X) where X is a POSITIVE quantity (typically a length, e.g. length(z.xyz)). Never assign a negative or unbounded value to trap — it controls coloring.
8. For Julia behaviour use the provided \`c\` argument; if you add Julia-only code, gate it with \`if (uJuliaMode > 0.5) { ... }\`. Never invent your own julia uniform.
9. Keep the <Metadata> as valid JSON (double-quoted keys, no trailing commas, no comments inside the JSON). If you rename the formula, update both \`id\` and the function name consistently.
10. Do not reference uniforms or helpers that are not in the guide. Only use uParamA..uParamF, uVec2A..uVec4C, uIterations, uTime, uJulia, uJuliaMode, uDistanceMetric, uEscapeThresh, uDeBailout, and the listed helpers.
11. In defaultPreset.features.quality, set "fudgeFactor": 0.5 and "estimator": 0 for power fractals (z = z^p + c) or 1 for fold/IFS fractals (box/sphere folds). fudgeFactor (the app's "Slice Optimization") under 1.0 makes the raymarch take smaller steps so a hand-written distance estimate — which is rarely exact — doesn't overshoot the surface and leave flat "slices"/holes. 0.5 is a safe default for AI-authored formulas; raise it toward 1.0 only if the surface looks correct and you want more speed.
12. Prefer the built-in estimator (rule 11) and OMIT <Shader_Dist>. Only add <Shader_Dist> if you genuinely need a custom distance estimate — and if so, it is the BODY of "vec2 getDist(float r, float dr, float iter, vec4 z)": write statements ONLY (do NOT write a "float yourName(...)" or "vec2 getDist(...)" function — GLSL forbids nested functions, so a function definition here will not compile) and end with "return vec2(distance, smoothIter);" — a vec2, never a float. In scope: r, dr, iter, z.

================ STRONGLY PREFER per-iteration (do NOT reach for break;) ================
Author the formula as \`shape:per-iteration\`: write ONE step of the iteration and let the engine run the loop and the escape check. This is the default and the right choice almost always.
Only fall back to a self-contained formula (your <Shader_Loop> owns its own loop and ends with \`break;\`, with \`"shaderMeta": { "selfContainedSDE": true }\` in <Metadata>) as a LAST RESORT, when the math genuinely cannot be decomposed into independent per-iteration steps. Self-contained DISABLES interlace, hybrid formulas, and burning-ship variants — it strictly reduces what the engine can do with your formula, so don't use \`break;\` casually.


================ USER INSTRUCTIONS ================


`;
}

/**
 * Build the paste-ready LLM prompt for CONVERTING a self-contained (imported
 * `break;`-loop) formula into a NATIVE `shape:per-iteration` GMT formula — which
 * regains interlace / hybrid / burning-ship (self-contained disables all three).
 *
 * Strongly prefers the ORIGINAL `.frag` source (pass `def.importSource.glsl`);
 * when that's gone (V4 imports, GMF round-trip — importSource is session-only and
 * not serialised) pass the current self-contained GMF (`buildFormulaBrief(def)`)
 * as `fragSource` and the decompose recipe handles re-deriving the per-iteration
 * step from the wrapped loop.
 *
 * Reuses {@link buildModifyPrompt}'s guide link, HOW-A-GMF-WORKS, HELPERS &
 * ROTATIONS, OUTPUT RULES (1-12), and the trailing USER INSTRUCTIONS heading.
 *
 * @param fragSource  the original `.frag` GLSL (preferred) or the current GMF.
 * @param formulaName display name (`def.name`).
 * @param opts.mappings   pre-formatted "originalUniform (type) -> uParamA" lines
 *   from `def.importSource.mappings`; omit / sentinel when none recorded.
 * @param opts.currentGmf the current self-contained GMF, inlined as a secondary
 *   reference when `fragSource` is the original .frag (so the model sees both).
 */
export function buildConvertPrompt(
    fragSource: string,
    formulaName: string,
    opts: { mappings?: string; currentGmf?: string } = {},
): string {
    const mappings = opts.mappings?.trim() || '(no parameter mappings recorded)';
    const currentGmfBlock = opts.currentGmf?.trim()
        ? `\n----- CURRENT SELF-CONTAINED GMF (the wrapped version GMT runs now, for reference) -----\n${opts.currentGmf}\n`
        : '';

    return `You are authoring a fractal formula for GMT, a real-time GPU fractal renderer. GMT formulas use a plain-text container called GMF (GPU Mandelbulb Format). You are given a Fragmentarium-style .frag formula that GMT currently runs as a SELF-CONTAINED formula (it owns its own internal loop and ends with \`break;\`). Your job is to CONVERT it into a NATIVE per-iteration GMT formula and output a new, complete GMF.

================ WHY CONVERT (the goal) ================
The imported formula is \`shape:self-contained\`: its <Shader_Loop> runs one giant internal \`for\` loop and then \`break;\`s the engine's outer loop. That works, but it strictly REDUCES what the engine can do — self-contained DISABLES interlace (blending two formulas), hybrid formulas (alternating box-folds), and engine burning-ship variants, because all of those require the ENGINE to own the iteration loop and run your step many times.
Your task is to rewrite the math as ONE step of the iteration inside \`void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)\`, with NO internal loop and NO \`break;\`, so the formula becomes \`shape:per-iteration\` and regains interlace / hybrid / burning-ship for free. The visual result must match the original as closely as possible.

================ FULL AUTHORING GUIDE ================
The complete reference (shader API, all uniforms, helper functions, capability tokens, worked examples) is here:
https://gmt-fractals.com/learn/create-formula
Read it. It defines every uniform (uParamA..uParamF, uVec2A.., uVec3A.., uIterations, uTime, uJulia, uJuliaMode, uDistanceMetric, uEscapeThresh, uDeBailout), every helper (sphereFold, boxFold, snoise, getLength, the gmt_* Rodrigues rotation trio), and the exact formula function signature.

================ HOW A GMF WORKS (read before editing) ================
A GMF is NOT JSON-with-escaped-newlines. It is a small set of XML-like blocks. The file MUST begin with \`<Metadata>\` (a JSON block) and then contain GLSL blocks written as RAW multi-line code (no escaping, no "\\n"):

  <Metadata> ... formula id, name, parameters[], defaultPreset ... </Metadata>
  <Shader_Preamble> ...optional global GLSL (helper functions, mutable globals)... </Shader_Preamble>
  <Shader_Init> ...optional once-before-loop GLSL (e.g. gmt_precalcRodrigues, resetting preamble globals)... </Shader_Init>
  <Shader_Function> ...REQUIRED: the formula function — ONE iteration step... </Shader_Function>
  <Shader_Loop> ...REQUIRED: one line calling the function, with NO loop and NO break;... </Shader_Loop>
  <Shader_Dist> ...optional, usually OMIT. The BODY of "vec2 getDist(float r, float dr, float iter, vec4 z)" — statements ONLY (no function signature/wrapper), ending with "return vec2(distance, smoothIter);". Prefer setting defaultPreset.features.quality.estimator instead... </Shader_Dist>

The formula function signature is EXACTLY:
  void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)
    z    = current point (z.xyz = position, z.w = auxiliary, init from uParamB)
    dr   = running derivative — you MUST update it every iteration or the surface vanishes
    trap = orbit-trap accumulator for coloring — update via trap = min(trap, <positive value>)
    c    = the per-pixel constant (Julia seed when uJuliaMode>0.5, else the pixel position)
The engine runs the loop AND the escape/bailout check around your function. Do NOT write your own \`for\` loop and do NOT call \`break;\` — that is the self-contained pattern you are converting AWAY from.

================ HELPERS & ROTATIONS (exact — do NOT invent function names) ================
These are the ONLY built-in helpers. Match the argument count EXACTLY:
  void  sphereFold(inout vec3 z, inout float dr, float minR, float fixedR);
  void  boxFold(inout vec3 z, inout float dr, float foldLimit);   // NOTE: dr is the 2nd argument
  float getLength(vec3 p);              // distance metric (respects uDistanceMetric)
  float snoise(vec3 v);                 // 3D simplex noise, -1..1
  vec4  textureLod0(sampler2D t, vec2 uv);
  // Rodrigues AXIS-ANGLE rotation — precalc ONCE in <Shader_Init>, then apply in the function:
  //   <Shader_Init>:  gmt_precalcRodrigues(uVec3B);   // params = (azimuth, pitch, angle)
  //   in function:    gmt_applyRodrigues(p);
  void  gmt_precalcRodrigues(vec3 params);
  void  gmt_applyRodrigues(inout vec3 p);
  void  gmt_applyTwist(inout vec3 p, float amount);
Constants available: PI, TAU, INV_PI, INV_TAU, phi.

There are NO per-axis rotation helpers — gmt_rotate_x / gmt_rotate_y / gmt_rotate_z / rotX / rotateY
DO NOT EXIST and will fail to compile. To rotate a point, write the 2x2 rotation INLINE:
  // rotate around Z (acts on x,y) by angle a:
  float ca = cos(a), sa = sin(a);
  p.xy = mat2(ca, sa, -sa, ca) * p.xy;
  // around X -> rotate p.yz the same way ; around Y -> rotate p.xz.
Only reference uniforms/helpers listed here or in the guide; never invent one.

================ HOW TO DECOMPOSE (the conversion recipe) ================
1. Find the inner loop in the original .frag (usually \`for (i = 0; i < Iterations; i++) { ...step... }\` inside the DE / distance function). The BODY of that loop is your per-iteration step. Everything ONCE before the loop goes in <Shader_Init>; everything AFTER the loop (the final distance/coloring math) becomes the estimator (prefer a built-in estimator; only use <Shader_Dist> if unavoidable).
2. Map the loop body's variables onto the engine harness: the orbiting point → z.xyz (use z.w for a 4th component if the math is quaternionic), the iteration constant / Julia seed / offset → c, the derivative/scale accumulator → dr.
3. Update dr EVERY iteration to match the math:
     power map (z = z^p + c):  dr = power * pow(max(r,1e-10), power-1.0) * dr + 1.0;   // estimator 0
     fold / IFS (scale s):     dr = dr * abs(s) + 1.0;   (sphereFold/boxFold update dr for you)  // estimator 1
4. Julia: the engine already encodes Julia vs Mandelbrot in \`c\` (c = pixel position for Mandelbrot, c = vec4(uJulia, uParamA) for Julia). For a POWER fractal just add \`c.xyz\` every iteration and set "juliaType":"julia" — do NOT branch on uJuliaMode. For a FOLD/IFS fractal treat \`c.xyz\` as a constant translation/offset and set "juliaType":"offset"; if the offset should only apply in Julia mode, gate it with \`if (uJuliaMode > 0.5) z.xyz += c.xyz;\`. Use "juliaType":"none" for a purely symmetric IFS that ignores c.
5. trap: write \`trap = min(trap, X)\` with X a POSITIVE quantity (typically a length, e.g. length(z.xyz) or abs(z.x)). Never feed a negative or log-domain value into trap — the colourer clamps <=0 to a floor and you get one flat colour.
6. Pick the estimator + fudge in defaultPreset.features.quality: "estimator": 0 for power fractals (z^p + c, analytic log DE), "estimator": 1 for fold/IFS fractals (box/sphere fold, linear DE). Set "fudgeFactor": 0.5 (the app's "Slice Optimization") so the raymarch takes smaller steps and a hand-derived DE doesn't overshoot the surface and leave flat "slices"/holes. Only add a custom <Shader_Dist> if the original genuinely needs a bespoke distance estimate.
7. Preamble globals: if you must keep a mutable global (a DE accumulator the step writes and the estimator reads), declare it in <Shader_Preamble>, RESET it in <Shader_Init>, and list its name in <Metadata>.shaderMeta.preambleVars (named u<INITIALS>_name) so interlace doesn't corrupt it. Do NOT list engine-owned cp_* globals.

================ EXPOSE TASTEFUL SLIDERS (important for DEC / Shadertoy sources) ================
Many sources — especially the Distance Estimator Compendium and Shadertoy snippets — hard-code their interesting values as literal constants. A GMT formula is only fun if those are adjustable, so PROMOTE a tasteful selection of the meaningful constants to UI sliders instead of leaving them baked in:
- Scan the source for constants that change the SHAPE or LOOK: power/degree, scale, fold limit, min/fixed radius, rotation angle(s), offset/shift, julia seed, thickness, colour/contrast knobs. (Iteration count is ALREADY a slider via uIterations — do NOT re-expose it.)
- Replace the chosen literal with a uniform and add a slider for it:
    a single scalar               -> uParamA..uParamF
    an x/y pair or two angles      -> a uVec2A..uVec2C
    an xyz vector / offset / axis  -> a uVec3A..uVec3C  (add "mode":"rotation" for an azimuth/pitch/angle rotation, "mode":"direction" for a direction vector)
  GROUP related components into ONE vec slider (an offset (ox,oy,oz) becomes a single uVec3A, not three scalars). Wiring gotcha: uParamB also seeds z.w and uParamA is c.w in Julia mode, so prefer uParamC..F for ordinary scalars.
- For each slider add a matching <Metadata>.parameters entry: a human "label", the slot "id", sensible "min"/"max"/"step", and "default" = the ORIGINAL constant's value — NEVER 0 when the original was non-zero (a 0 scale/power/angle renders black). MIRROR every value into defaultPreset.features.coreMath too: the engine reads each param's LIVE value from coreMath, not from the slider default, so a param missing from coreMath shows up at 0.
- Be TASTEFUL, not exhaustive: expose the handful (≈2-6) of knobs genuinely worth playing with, with ranges that stay visually stable; leave purely structural/incidental constants baked in. Too many sliders is worse than too few.
- CRITICAL — slot id vs uniform name: the GLSL reads a slider as uParamC / uVec2A, but in <Metadata> the parameters[].id AND the coreMath KEY use the SLOT id WITHOUT the leading 'u' (paramA..paramF, vec2A.., vec3A.., vec4A..). Writing "uParamC" as the id/key SILENTLY FAILS — the value never applies and the slider sits at 0. Worked example (a scale + an xyz offset):
    "parameters": [
      { "id": "paramC", "label": "Scale",  "min": 1.0, "max": 3.0, "step": 0.01, "default": 1.8 },
      { "id": "vec3A",  "label": "Offset", "min": -5,  "max": 5,   "step": 0.01, "default": { "x": 0, "y": 3, "z": 0 } }
    ],
    "defaultPreset": { "features": { "coreMath": { "iterations": 9, "paramC": 1.8, "vec3A": { "x": 0, "y": 3, "z": 0 } } } }
  The GLSL uses uParamC and uVec3A; the id and coreMath key drop the 'u'. Mirror every default into coreMath.

================ THE FRAGMENTARIUM SOURCE YOU ARE CONVERTING ================
Name: ${formulaName}

----- ORIGINAL .frag SOURCE -----
${fragSource}
${currentGmfBlock}
----- PARAMETER MAPPINGS (original uniform -> GMT slot) -----
These tell you which engine uniform replaces each original .frag uniform. Use the GMT slot (uParamA..uParamF, uVec2A.., uVec3A.., uVec4A..) everywhere you would have used the original name; substitute fixedValue as a literal for any unmapped uniform.
${mappings}

================ OUTPUT RULES (follow exactly) ================
1. Put the COMPLETE .gmf inside ONE triple-backtick code block: a \`\`\` line, then the file starting with the <Metadata> tag, then a closing \`\`\` line. A single fenced block makes the copy verbatim and stops the chat UI from injecting stray formatting tokens into it; the app strips the fence automatically.
2. Use EXACTLY ONE code block and nothing else of substance — no second code block, no commentary, no "Here is...". At most one short sentence before the block. Inside it write RAW GMF: the <Metadata> JSON then the <Shader_*> blocks as raw multi-line GLSL (never escape newlines as \\n); GLSL // comments inside shader blocks only.
3. NO prose, NO commentary, NO explanation, NO "Here is...", NO trailing notes. Not a single word of natural language outside the GMF blocks. Use GLSL \`//\` comments INSIDE shader blocks if you must annotate.
4. Keep the EXACT function signature: void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c). Do not add, remove, reorder, or retype parameters. The function name in <Shader_Function> must match the call in <Shader_Loop>.
5. Keep ALL the <Shader_*> blocks you need. Always emit <Shader_Function> and <Shader_Loop>. The shader blocks are RAW multi-line GLSL — never collapse the GLSL into JSON, and never escape newlines as "\\n".
6. You MUST update the derivative \`dr\` every iteration (e.g. dr = factor*dr + 1.0). A formula that never writes dr renders as empty space / no surface.
7. Write the orbit trap as trap = min(trap, X) where X is a POSITIVE quantity (typically a length, e.g. length(z.xyz)). Never assign a negative or unbounded value to trap — it controls coloring.
8. For Julia behaviour use the provided \`c\` argument; if you add Julia-only code, gate it with \`if (uJuliaMode > 0.5) { ... }\`. Never invent your own julia uniform.
9. Keep the <Metadata> as valid JSON (double-quoted keys, no trailing commas, no comments inside the JSON). If you rename the formula, update both \`id\` and the function name consistently.
10. Do not reference uniforms or helpers that are not in the guide. Only use uParamA..uParamF, uVec2A..uVec4C, uIterations, uTime, uJulia, uJuliaMode, uDistanceMetric, uEscapeThresh, uDeBailout, and the listed helpers.
11. In defaultPreset.features.quality, set "fudgeFactor": 0.5 and "estimator": 0 for power fractals (z = z^p + c) or 1 for fold/IFS fractals (box/sphere folds). fudgeFactor (the app's "Slice Optimization") under 1.0 makes the raymarch take smaller steps so a hand-written distance estimate — which is rarely exact — doesn't overshoot the surface and leave flat "slices"/holes. 0.5 is a safe default for AI-authored formulas; raise it toward 1.0 only if the surface looks correct and you want more speed.
12. Prefer the built-in estimator (rule 11) and OMIT <Shader_Dist>. Only add <Shader_Dist> if you genuinely need a custom distance estimate — and if so, it is the BODY of "vec2 getDist(float r, float dr, float iter, vec4 z)": write statements ONLY (do NOT write a "float yourName(...)" or "vec2 getDist(...)" function — GLSL forbids nested functions, so a function definition here will not compile) and end with "return vec2(distance, smoothIter);" — a vec2, never a float. In scope: r, dr, iter, z.

================ THIS IS A CONVERSION — per-iteration is the WHOLE POINT ================
The entire reason for this task is to drop the self-contained \`break;\` loop and become \`shape:per-iteration\` so interlace / hybrid / burning-ship light up. So: do NOT emit \`"shaderMeta": { "selfContainedSDE": true }\`, do NOT write your own loop, and do NOT call \`break;\` — those would re-disable everything you are trying to enable.
A FEW Fragmentarium formulas genuinely cannot be decomposed into independent per-iteration steps (e.g. the distance needs the full internal orbit history, or each step depends on a value only known after the whole loop runs). ATTEMPT the per-iteration rewrite FIRST. ONLY if the math truly requires the full internal loop, fall back to keeping it self-contained: let <Shader_Loop> own its loop ending in \`break;\`, set \`"shaderMeta": { "selfContainedSDE": true }\` in <Metadata>, and read uIterations as \`int(uIterations)\` to cap the internal loop. Use this fallback as a LAST RESORT only.


================ USER INSTRUCTIONS ================


`;
}

/**
 * Tolerant paste-back loader. Strips markdown fences + leading prose and slices
 * to the first GMF tag so the cleaned string satisfies `isGMFFormat` (which
 * requires it to START with `<!--`/`<Metadata>`). Returns clean GMF, or null
 * if no usable formula is present (→ caller shows a friendly toast instead of
 * mis-routing prose into `JSON.parse`).
 */
export function sanitizeGMF(text: string): string | null {
    if (!text) return null;
    let s = text;

    // Strip a leading UTF-8 BOM (isGMFFormat.trimStart() won't remove it, so a
    // BOM would misclassify a valid GMF as JSON).
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);

    // Normalize clipboard/chat typography that breaks GLSL/JSON: non-breaking
    // spaces -> space, smart quotes -> straight. A documented source of mystery
    // compile / JSON-parse errors. GLSL has no string literals, so this is safe.
    s = s.replace(/ /g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

    // Remove markdown fences anywhere: opening ``` with optional lang tag, and
    // bare closing ```. Done globally + case-insensitively so a fence wrapping
    // only part of the output (e.g. just the shader block) is also removed.
    s = s.replace(/^[ \t]*```[a-zA-Z0-9_-]*[ \t]*\r?\n?/gim, ''); // opening fences (with/without lang)
    s = s.replace(/\r?\n?[ \t]*```[ \t]*$/gim, ''); // closing fences at line end
    s = s.replace(/```/g, ''); // any stray backtick-fence remnants

    // Slice from the first real GMF tag, dropping leading prose. Prefer
    // <Metadata>; fall back to <!-- only when there's no <Metadata> (a stray
    // leading <!-- with no metadata/function is not a usable formula).
    const metaIdx = s.indexOf('<Metadata>');
    const commentIdx = s.indexOf('<!--');
    let startIdx = -1;
    if (metaIdx >= 0) {
        // Keep a <!-- header only when it sits just before the metadata;
        // otherwise anchor on <Metadata> to be safe.
        startIdx = commentIdx >= 0 && commentIdx < metaIdx ? commentIdx : metaIdx;
    } else if (commentIdx >= 0) {
        startIdx = commentIdx;
    }
    if (startIdx < 0) return null; // no GMF tag at all
    s = s.slice(startIdx).trim();

    // Scrub code-block formatter artifacts that some chat UIs (Gemini is a known
    // offender) inject when you copy from a rendered code block — a stray line
    // like "code Code", "Copy code", or a bare language label ("glsl"/"json").
    // STRICT per-line exact match after trimming: a line is dropped ONLY when its
    // ENTIRE trimmed content is one of these tokens, so a brace, a GLSL statement,
    // or any real line is never touched. (An earlier looser regex could clip a
    // line — e.g. eat a `}` — which broke otherwise-valid pastes.)
    const ARTIFACT_LINE = /^(?:code(?:\s+code)?|copy(?:\s+code)?|glsl(?:\s*es)?|xml|html|json)$/i;
    s = s.split('\n').filter((line) => !ARTIFACT_LINE.test(line.trim())).join('\n');

    // Validate the two blocks the strict parser actually requires (parseGMF
    // throws without <Metadata>, and "Missing essential shader blocks" without
    // <Shader_Function> for non-Modular formulas).
    if (!s.includes('<Metadata>')) return null;
    if (!s.includes('<Shader_Function>')) return null;

    // Guaranteed to satisfy isGMFFormat() now (starts with <Metadata> or <!--).
    return s;
}

/**
 * Avoid a name collision when loading a pasted formula. If `def.id` is already
 * registered, return a clone with a fresh id (`Foo` → `Foo_2`, `Foo_3`, …) AND a
 * matching renamed GLSL function (`formula_Foo` → `formula_Foo_2`), so:
 *   - re-pasting an iteration doesn't silently fail to replace the old one,
 *   - it never clobbers a built-in that happens to share the id,
 *   - two same-named `formula_*` functions can't clash in one shader (interlace).
 * Each paste becomes its own formula. No-op when the id is already free.
 *
 * `exists(id)` is injected (the caller passes the live registry lookup) to keep
 * this module free of an engine/registry import.
 */
export function ensureUniqueFormulaId(
    def: FractalDefinition,
    exists: (id: string) => boolean,
): FractalDefinition {
    if (!exists(def.id)) return def;

    let n = 2;
    let newId = `${def.id}_${n}`;
    while (exists(newId)) {
        n += 1;
        newId = `${def.id}_${n}`;
    }

    // Rename the GLSL function. Read the actual name from <Shader_Loop> (the kit
    // convention is formula_<id>, but honour whatever the author called it).
    const shader = { ...def.shader };
    const oldFn = (def.shader.loopBody.match(/\b(formula_\w+)\s*\(/) || [])[1];
    if (oldFn) {
        const newFn = `formula_${newId}`;
        const rename = (s: string | undefined) => (s ? s.split(oldFn).join(newFn) : s);
        shader.function = rename(shader.function) as string;
        shader.loopBody = rename(shader.loopBody) as string;
        shader.loopInit = rename(shader.loopInit);
        shader.getDist = rename(shader.getDist);
        shader.preamble = rename(shader.preamble);
    }

    return {
        ...def,
        id: newId as FractalDefinition['id'],
        name: `${def.name} (${n})`,
        shader,
        defaultPreset: { ...def.defaultPreset, formula: newId as FractalDefinition['id'] },
    };
}

/**
 * Seed a preset's `features.coreMath` from the formula's own
 * `parameters[].default` for any value the preset doesn't already specify.
 *
 * WHY: the engine takes a parameter's INITIAL value from `coreMath`, NOT from
 * `parameters[].default` (core_math.ts never reads the FractalParameter array —
 * only the UI and interlace do). So an AI-authored formula that declares good
 * slider defaults but forgets to mirror them into `defaultPreset.features.coreMath`
 * loads every slider at 0 — and a 0 `scale`/`power`/`angle` renders black or
 * degenerate. This bridges the gap so the model's natural output (a sensible
 * `parameters[].default`) renders correctly. Non-destructive: any value the
 * preset already sets in `coreMath` wins; we only fill the gaps. Returns the same
 * preset object when nothing needs filling.
 */
export function backfillCoreMathDefaults(preset: Preset, parameters: FractalDefinition['parameters']): Preset {
    const params = parameters ?? [];
    if (params.length === 0) return preset;
    const existing: Record<string, any> = (preset.features?.coreMath as Record<string, any>) ?? {};
    const coreMath: Record<string, any> = { ...existing };
    let added = false;
    for (const p of params) {
        if (!p || p.default === undefined) continue;
        if (coreMath[p.id] === undefined) {
            coreMath[p.id] = p.default;
            added = true;
        }
    }
    if (!added) return preset;
    return { ...preset, features: { ...preset.features, coreMath } };
}

/** uParamC -> paramC, uVec2A -> vec2A; any other key is returned unchanged. */
function canonSlot(key: string): string {
    const m = key.match(/^u(Param[A-F]|Vec[234][A-C])$/);
    return m ? m[1].charAt(0).toLowerCase() + m[1].slice(1) : key;
}

/**
 * Rewrite GLSL-uniform-style param keys back to GMT slot ids. Models routinely
 * confuse the GLSL UNIFORM name (`uParamC`, `uVec2A`) with the SLOT id
 * (`paramC`, `vec2A`) and write the uniform name as both `parameters[].id` and
 * the `coreMath` key. The engine keys `coreMath` by the slot id, so the value
 * never applies and every slider loads at 0. This canonicalises any u-prefixed
 * `parameters[].id` and `coreMath` key. No-op for already-correct ids (and for
 * keys like `iterations` that aren't slots).
 */
export function normalizeParamSlots(def: FractalDefinition): FractalDefinition {
    const params = def.parameters ?? [];
    const core: Record<string, any> = (def.defaultPreset?.features?.coreMath as Record<string, any>) ?? {};
    let changed = false;

    const newParams = params.map((p) => {
        if (!p) return p;
        const id = canonSlot(p.id);
        if (id === p.id) return p;
        changed = true;
        return { ...p, id: id as typeof p.id };
    });

    const newCore: Record<string, any> = {};
    for (const k of Object.keys(core)) {
        const ck = canonSlot(k);
        if (ck !== k) changed = true;
        newCore[ck] = core[k];
    }

    if (!changed) return def;
    return {
        ...def,
        parameters: newParams,
        defaultPreset: {
            ...def.defaultPreset,
            features: { ...def.defaultPreset?.features, coreMath: newCore },
        },
    };
}

/**
 * Map a raw GLSL/driver compile log to a short plain-language diagnosis a weak
 * model can act on (research: weak models can't self-diagnose, but DO repair
 * well from external grounded feedback). Best-effort substring match.
 */
export function glslErrorHint(log: string): string {
    const l = (log || '').toLowerCase();
    if (l.includes('no matching overloaded function') || l.includes('overloaded'))
        return 'A function is called with the wrong number or types of arguments. Check helper signatures — boxFold/sphereFold take the running derivative dr as their 2nd argument, and there are no gmt_rotate_x/y/z helpers (rotate with an inline mat2).';
    if (l.includes('undeclared') || l.includes('undefined'))
        return "A name isn't defined. Use only the uniforms/helpers from the guide (uParamA..F, uVec2A.., sphereFold, boxFold, getLength, snoise, gmt_*); don't invent functions or uniforms.";
    if (l.includes('redefinition') || l.includes('already has a body') || l.includes('previously'))
        return 'Something is defined twice — make sure the formula function is defined once and only CALLED (not redefined) in <Shader_Loop>, and <Shader_Dist> is a body (no function wrapper).';
    if (l.includes('syntax error') || l.includes('unexpected'))
        return 'A syntax error — often a stray non-GLSL token, a missing semicolon, or an unbalanced brace. The shader blocks must contain only valid GLSL.';
    if (l.includes('cannot convert') || l.includes('constructor') || l.includes('implicit'))
        return 'A type mismatch — check vec sizes and that vec2/vec3/vec4 are built with the right number of components.';
    return 'Read the exact error, find the offending line, and fix just that.';
}

/**
 * Build a ready-to-paste REPAIR prompt for a formula that failed to compile.
 * Bundles the exact compiler error + a plain-language hint + the failed GMF + a
 * restated contract, with one instruction. This external, grounded feedback is
 * what lets a weak model actually fix its own output (see the SOTA research).
 */
export function buildRepairPrompt(failedGmf: string, errorLog: string): string {
    const hint = glslErrorHint(errorLog);
    return `The GMT fractal formula you produced FAILED TO COMPILE. Fix ONLY the error and return the complete corrected .gmf.

================ THE COMPILER ERROR ================
${(errorLog || '(no log captured — open the browser console, F12, for the exact GLSL error)').trim()}

WHAT IT USUALLY MEANS: ${hint}

================ THE FORMULA THAT FAILED ================
${failedGmf.trim()}

================ HOW TO FIX ================
- Change as little as possible: fix the specific error above and keep everything else.
- Keep it per-iteration: signature stays void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c); update dr every iteration; trap = min(trap, <positive>); no own loop, no break;.
- <Metadata>: parameters[].id and the coreMath KEYS are SLOT ids WITHOUT the 'u' (paramC, vec2A) even though the GLSL reads uParamC/uVec2A; every param the shader reads must have its value in defaultPreset.features.coreMath.
- Use only uniforms/helpers from https://gmt-fractals.com/learn/create-formula — never invent one (no gmt_rotate_x/y/z; boxFold/sphereFold take dr as the 2nd arg). <Shader_Dist>, if present, is the BODY of vec2 getDist(...) returning vec2 — not a function definition.

================ OUTPUT ================
Output ONLY the corrected .gmf inside ONE fenced code block (\`\`\`gmf … \`\`\`). No prose, no second block.`;
}
