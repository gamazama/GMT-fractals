
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
   * --- GMT SHADER API REFERENCE ---
   *
   * Scalar Parameters (float uniforms — mapped to UI sliders):
   *   uParamA, uParamB, uParamC, uParamD, uParamE, uParamF
   *
   * Vector Parameters (mapped to multi-axis UI controls):
   *   vec2 uVec2A, uVec2B, uVec2C
   *   vec3 uVec3A, uVec3B, uVec3C
   *   vec4 uVec4A, uVec4B, uVec4C
   *
   * System Uniforms:
   *   int   uIterations      — Iteration count (user-adjustable)
   *   float uTime            — Elapsed time in seconds
   *   vec3  uJulia           — Julia seed coordinates (if Julia mode active)
   *   float uJuliaMode       — 1.0 if Julia mode active, 0.0 otherwise
   *   float uDistanceMetric  — 0=Euclidean, 1=Chebyshev, 2=Manhattan, 3=Quartic
   *
   * Built-in Helper Functions:
   *   void  sphereFold(inout vec3 z, inout float dz, float minR, float fixedR)
   *   void  boxFold(inout vec3 z, inout float dz, float foldLimit)
   *   float snoise(vec3 v)                — Simplex Noise (-1.0 to 1.0)
   *   float getLength(vec3 p)             — Distance metric (respects uDistanceMetric)
   *
   * Rotation Helpers (branchless, CPU-precomputed matrices):
   *   void applyPreRotation(inout vec3 p)   — Applied inside loop, before formula
   *   void applyPostRotation(inout vec3 p)  — Applied inside loop, after formula
   *   void applyWorldRotation(inout vec3 p) — Applied before iteration loop
   *
   * Formula Function Signature:
   *   void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)
   *     z    : Current coordinate (.xyz = position, .w = auxiliary)
   *     dr   : Running derivative (float) — used for distance estimation
   *     trap : Orbit trap accumulator (float) — used for coloring
   *     c    : Constant for the fractal (Julia seed or initial position)
   *
   * To modify this formula, edit the GLSL blocks below directly.
   * The Metadata JSON block configures parameter names, ranges, and defaults.
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

    // Preserve shader metadata that isn't GLSL code but is needed for
    // interlace (preambleVars, usesSharedRotation). These live on the shader
    // object but don't map to a GLSL block, so we stash them in Metadata.
    const shaderMeta: Record<string, any> = {};
    if (shader.preambleVars?.length) shaderMeta.preambleVars = shader.preambleVars;
    if (shader.usesSharedRotation) shaderMeta.usesSharedRotation = true;

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

export const parseGMF = (content: string): FractalDefinition => {
    const extract = (tag: string) => {
        // Match content between tags, non-greedy
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
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

    if (!func || !loop) {
         throw new Error("Invalid GMF: Missing essential shader blocks (<Shader_Function> or <Shader_Loop>)");
    }

    const shader: Record<string, any> = {
        function: func,
        loopBody: loop,
        preamble: preamble || undefined,
        loopInit: init || undefined,
        getDist: dist || undefined,
    };

    // Restore shader metadata saved alongside the Metadata JSON
    if (metadata.shaderMeta) {
        if (metadata.shaderMeta.preambleVars) shader.preambleVars = metadata.shaderMeta.preambleVars;
        if (metadata.shaderMeta.usesSharedRotation) shader.usesSharedRotation = true;
        delete metadata.shaderMeta;
    }

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

/** Detect whether a string is GMF format (vs plain JSON) */
export const isGMFFormat = (content: string): boolean => {
    const trimmed = content.trimStart();
    return trimmed.startsWith('<!--') || trimmed.startsWith('<Metadata>');
};

/**
 * Save a full scene as GMF string.
 * Embeds the formula definition (shader + metadata) AND the full scene preset.
 * The scene preset lives in a separate <Scene> block after the shader blocks.
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
 * Does NOT register the formula — caller should check registry and register if needed.
 */
export const loadGMFScene = (content: string): { def?: FractalDefinition, preset: Preset } => {
    if (isGMFFormat(content)) {
        // Parse the formula definition (metadata + shader blocks)
        const def = parseGMF(content);

        // Check for Scene block (v2 scene GMF)
        const sceneMatch = content.match(/<Scene>([\s\S]*?)<\/Scene>/);
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
