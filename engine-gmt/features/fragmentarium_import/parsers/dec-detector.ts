/**
 * DEC (Distance Estimator Compendium) format detector.
 * Identifies raw GLSL distance estimator snippets (as opposed to Fragmentarium .frag files)
 * and extracts macro definitions for preprocessing.
 *
 * DEC fractals (jbaker.graphics/writings/DEC.html) are standalone `float de(vec3 p)` functions
 * with hardcoded constants and #define macros — no Fragmentarium metadata.
 */

import { PROMOTED_UNIFORM_LINE } from './uniform-annotation';

// ============================================================================
// Types
// ============================================================================

export interface DECMacro {
    name: string;
    /** null = simple constant macro, string[] = parameterised macro */
    params: string[] | null;
    body: string;
    line: number;
}

export interface DECDetectionResult {
    isDEC: boolean;
    /** The DE function name found (e.g. 'de', 'sdf', 'map') — null if none */
    deFunctionName: string | null;
    macros: DECMacro[];
    confidence: number;
    /** Reasons for the detection decision */
    reasons: string[];
}

// ============================================================================
// Known DE function names (lowercase variants not already in Fragmentarium)
// ============================================================================

/** Names that the AST parser already recognises */
const FRAG_DE_NAMES = new Set(['DE', 'dist']);

/** Additional lowercase names common in DEC / Shadertoy / blog posts */
const DEC_DE_NAMES = new Set(['de', 'sdf', 'map', 'sd', 'distance']);

const ALL_DE_NAMES = new Set([...FRAG_DE_NAMES, ...DEC_DE_NAMES]);

// ============================================================================
// Macro extraction
// ============================================================================

/**
 * Parse all `#define` directives from raw GLSL source.
 * Handles line continuations (`\` at EOL) and parameterised macros.
 */
export function parseMacros(source: string): DECMacro[] {
    const macros: DECMacro[] = [];
    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trimStart();
        if (!trimmed.startsWith('#define')) continue;

        // Join continuation lines
        while (line.trimEnd().endsWith('\\') && i + 1 < lines.length) {
            line = line.trimEnd().slice(0, -1) + ' ' + lines[++i].trimStart();
        }

        // Parse: #define NAME or #define NAME(args) body
        // Skip providesColor and other Fragmentarium-specific defines
        const m = line.match(/^[\s]*#define\s+(\w+)(\([^)]*\))?\s*(.*?)\s*$/);
        if (!m) continue;

        const name = m[1];
        const rawParams = m[2]; // "(a,b)" or undefined
        const body = m[3] || '';

        // Skip Fragmentarium-specific defines
        if (name === 'providesColor' || name === 'providesInit' || name === 'providesInside') continue;
        // Skip include guards
        if (name.startsWith('_') && name.endsWith('_')) continue;

        let params: string[] | null = null;
        if (rawParams) {
            params = rawParams.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
        }

        macros.push({ name, params, body, line: i });
    }

    return macros;
}

// ============================================================================
// DE function detection
// ============================================================================

function findDEFunctionName(source: string): string | null {
    // Match: float NAME(vec3 PARAM) {
    const pattern = /float\s+(\w+)\s*\(\s*vec3\s+\w+\s*\)\s*\{/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
        const name = match[1];
        if (ALL_DE_NAMES.has(name)) return name;
    }
    // Second pass: accept any float(vec3) function as potential DE
    pattern.lastIndex = 0;
    while ((match = pattern.exec(source)) !== null) {
        return match[1];
    }
    return null;
}

// ============================================================================
// Main detector
// ============================================================================

/**
 * Strip "promoted" uniform lines — `uniform TYPE name; slider[...]` (or
 * checkbox/color) on a single line — from the source before DEC scoring.
 *
 * Variable-promotion in the Formula Workshop injects exactly these lines into
 * an otherwise-DEC source. They must NOT defeat DEC detection: a DEC body with
 * promoted params is still a DEC body. We only strip uniform lines that carry
 * an annotation (i.e. promoted/Fragmentarium UI uniforms on one line) — a bare
 * `uniform vec3 foo;` with no annotation is left in place so genuine
 * hand-written-uniform shaders still read as non-DEC.
 */
function stripPromotedUniforms(source: string): string {
    return source.replace(PROMOTED_UNIFORM_LINE, '');
}

export function detectDECFormat(source: string): DECDetectionResult {
    const reasons: string[] = [];
    let score = 0;

    // Promoted uniforms (uniform + slider annotation, injected by the Workshop's
    // variable promotion) must not flip a DEC body to non-DEC. Score on the
    // source with those lines removed; keep the original `source` untouched.
    const scored = stripPromotedUniforms(source);

    const macros = parseMacros(scored);

    // --- Positive signals ---

    // No uniform declarations at all (strongest DEC signal)
    const hasUniforms = /\buniform\s+(float|int|vec2|vec3|vec4|bool)\s+\w+/.test(scored);
    if (!hasUniforms) {
        score += 0.4;
        reasons.push('No uniform declarations found');
    }

    // No Fragmentarium metadata
    const hasSliders = /slider\[/.test(scored);
    const hasPresets = /#preset\s+/.test(scored);
    const hasGroups = /#group\s+/.test(scored);
    const hasIncludes = /#include\s+/.test(scored);
    const hasFragMeta = hasSliders || hasPresets || hasGroups;

    if (!hasFragMeta) {
        score += 0.15;
        reasons.push('No Fragmentarium metadata (slider/preset/group)');
    }

    // Has #define macros (common in DEC)
    const paramMacros = macros.filter(m => m.params !== null);
    if (macros.length > 0) {
        score += 0.1;
        reasons.push(`${macros.length} #define macro(s) found`);
    }
    if (paramMacros.length > 0) {
        score += 0.1;
        reasons.push(`${paramMacros.length} parameterised macro(s) found`);
    }

    // Has a lowercase DE function (strong DEC signal)
    const deFunctionName = findDEFunctionName(scored);
    if (deFunctionName && DEC_DE_NAMES.has(deFunctionName)) {
        score += 0.25;
        reasons.push(`Lowercase DE function '${deFunctionName}()' found`);
    } else if (deFunctionName && FRAG_DE_NAMES.has(deFunctionName)) {
        // Has DE/dist but no Frag metadata — might be DEC-like
        if (!hasFragMeta && !hasUniforms) {
            score += 0.15;
            reasons.push(`Standard DE function '${deFunctionName}()' but no Fragmentarium metadata`);
        }
    }

    // --- Negative signals ---

    if (hasUniforms && hasSliders) {
        score -= 0.5;
        reasons.push('Has uniform declarations with slider annotations (Fragmentarium format)');
    }
    if (hasPresets) {
        score -= 0.3;
        reasons.push('Has #preset blocks (Fragmentarium format)');
    }
    if (hasIncludes && !paramMacros.length) {
        score -= 0.1;
        reasons.push('Has #include directives (Fragmentarium format)');
    }

    const confidence = Math.max(0, Math.min(1, score));

    return {
        isDEC: confidence > 0.4,
        deFunctionName: deFunctionName,
        macros,
        confidence,
        reasons,
    };
}
