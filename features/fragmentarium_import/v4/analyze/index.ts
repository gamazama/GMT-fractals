/**
 * V4 Stage 3 — Analyze.
 *
 * Walks the preprocessed GLSL to produce a structured FormulaAnalysis.
 * Uses regex + brace-matching rather than full AST — V4 preserves DE
 * bodies verbatim, so we only need to locate boundaries, not rewrite
 * internals.
 *
 * Responsibilities:
 *   - Identify DE function candidates (float/vec2/vec4 NAME(vec3, ...))
 *   - Extract other functions as helpers (preserved verbatim in preamble)
 *   - Identify `void init()` body (emitted into loopInit)
 *   - Classify top-level globals (mutable/const/uninitialized)
 *   - Reconcile parameters from preprocess against actual uniform declarations
 *   - Expose #preset Default values for emission defaults
 */

import type {
    PreprocessedSource, FormulaAnalysis, DeFunction, HelperFunction,
    GlobalDecl, ParamAnnotation, Result,
} from '../types';

/** Function names conventionally used for DE functions (priority for auto-select). */
const DE_NAMES_PRIORITY = ['DE', 'de', 'dist', 'distance', 'sdf', 'sd', 'map'];
const DE_NAMES = new Set(DE_NAMES_PRIORITY);

/** Keywords that look like type+name but aren't function signatures. */
const STATEMENT_KEYWORDS = new Set([
    'if', 'for', 'while', 'else', 'return', 'switch', 'do',
    'uniform', 'varying', 'attribute', 'precision', 'const',
]);

/** GLSL types (used for filtering global declarations — uniforms get caught by `uniform` line). */
const GLSL_TYPES = new Set([
    'float', 'int', 'bool',
    'vec2', 'vec3', 'vec4',
    'ivec2', 'ivec3', 'ivec4',
    'mat2', 'mat3', 'mat4',
    'sampler2D', 'samplerCube',
]);

// ─── Comment + string cleanup ───────────────────────────────────────────────

function stripComments(source: string): string {
    // Block comments
    let out = source.replace(/\/\*[\s\S]*?\*\//g, ' ');
    // Line comments
    out = out.replace(/\/\/[^\n]*/g, '');
    return out;
}

// ─── Brace matching ─────────────────────────────────────────────────────────

/** Find the offset of the closing brace matching the open brace at `openIdx`. */
function matchBrace(source: string, openIdx: number): number {
    if (source[openIdx] !== '{') return -1;
    let depth = 1;
    for (let i = openIdx + 1; i < source.length; i++) {
        const ch = source[i];
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

/** Depth of `{` vs `}` in the substring from [0, pos). */
function depthAt(source: string, pos: number): number {
    let depth = 0;
    for (let i = 0; i < pos && i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') depth--;
    }
    return depth;
}

// ─── Function extraction ────────────────────────────────────────────────────

interface ExtractedFunction {
    name: string;
    returnType: string;
    paramList: Array<{ type: string; name: string; qualifier?: string }>;
    /** Function body WITH braces. */
    body: string;
    /** Full function including return type, name, params, body. */
    fullText: string;
}

function parseParamList(raw: string): Array<{ type: string; name: string; qualifier?: string }> {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'void') return [];
    return trimmed.split(',').map(part => {
        let p = part.trim();
        let qualifier: string | undefined;
        const qm = p.match(/^(in|out|inout|const)\s+(.+)$/);
        if (qm) { qualifier = qm[1]; p = qm[2].trim(); }
        const m = p.match(/^(\S+)\s+(\w+)\s*(?:\[\s*\d*\s*\])?\s*$/);
        if (!m) return { type: 'unknown', name: p, qualifier };
        return { type: m[1], name: m[2], qualifier };
    });
}

/**
 * Extract all top-level function definitions.
 *
 * Scans for `(type) (name) ( params ) {` patterns and brace-matches the body.
 * Only considers matches at brace-depth 0 (top-level scope).
 */
function extractFunctions(source: string): ExtractedFunction[] {
    const funcs: ExtractedFunction[] = [];
    const sigRe = /(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;

    let m: RegExpExecArray | null;
    while ((m = sigRe.exec(source)) !== null) {
        const returnType = m[1];
        const name = m[2];
        const paramsStr = m[3];

        // Skip control-flow / qualifier keywords
        if (STATEMENT_KEYWORDS.has(returnType)) continue;

        // Check brace depth at match position — must be 0 (top-level)
        if (depthAt(source, m.index) !== 0) continue;

        // Find matching closing brace for the body
        const openBraceOffset = m.index + m[0].length - 1;
        const closeBraceOffset = matchBrace(source, openBraceOffset);
        if (closeBraceOffset < 0) continue;

        const body = source.slice(openBraceOffset, closeBraceOffset + 1);
        const fullText = source.slice(m.index, closeBraceOffset + 1);

        funcs.push({
            name,
            returnType,
            paramList: parseParamList(paramsStr),
            body,
            fullText,
        });

        // Skip past this function so nested braces aren't rematched
        sigRe.lastIndex = closeBraceOffset + 1;
    }

    return funcs;
}

// ─── Global extraction ──────────────────────────────────────────────────────

/**
 * Scan top-level declarations. A line like `vec3 foo;` or `float r = 1.0;`
 * at brace-depth 0 becomes a GlobalDecl. Uniforms are skipped (preprocess
 * already captured them as parameters).
 */
function extractGlobals(source: string): GlobalDecl[] {
    const globals: GlobalDecl[] = [];
    const lines = source.split('\n');
    let depth = 0;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*/, '').trimEnd();

        // Track brace depth (update AFTER processing the line)
        if (depth !== 0) {
            depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
            continue;
        }

        // Skip uniforms and preprocessor (preprocess already handled)
        if (/\buniform\b/.test(line)) {
            depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
            continue;
        }
        if (line.trim().startsWith('#')) {
            depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
            continue;
        }

        // Match: `[const] TYPE NAME[= EXPR];` possibly with multiple declarators
        const declMatch = line.match(/^\s*(?:(?:const|varying|attribute)\s+)?(\w+)\s+(.+);\s*$/);
        if (declMatch && GLSL_TYPES.has(declMatch[1])) {
            const type = declMatch[1];
            const body = declMatch[2];

            // Split on commas respecting parens
            const parts: string[] = [];
            let pd = 0, start = 0;
            for (let i = 0; i < body.length; i++) {
                if (body[i] === '(') pd++;
                else if (body[i] === ')') pd--;
                else if (body[i] === ',' && pd === 0) {
                    parts.push(body.slice(start, i).trim());
                    start = i + 1;
                }
            }
            parts.push(body.slice(start).trim());

            for (const p of parts) {
                const initM = p.match(/^(\w+)\s*=\s*([\s\S]+)$/);
                if (initM) {
                    globals.push({ name: initM[1], type, expression: initM[2].trim() });
                } else if (/^\w+$/.test(p)) {
                    globals.push({ name: p, type });
                }
            }
        }

        depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
    }

    return globals;
}

function classifyGlobal(g: GlobalDecl): 'const' | 'mutable' | 'uninitialized' {
    if (g.expression === undefined) return 'uninitialized';

    // Const heuristic: expression is a simple numeric literal, vec/mat constructor
    // with only numeric args, or a simple scalar-literal binary expression.
    const expr = g.expression.trim();

    // Pure numeric: "1.0", "-0.5", "3"
    if (/^-?\d+\.?\d*(e[+-]?\d+)?$/i.test(expr)) return 'const';

    // vec/mat constructor with only numeric args (and possibly '-' / '.' / ',' / spaces)
    if (/^(vec[234]|ivec[234]|mat[234])\s*\(\s*[\d\s,.\-eE+]+\)$/.test(expr)) return 'const';

    // Otherwise assume mutable (references other identifiers, function calls, etc.)
    return 'mutable';
}

// ─── Main analyze entry ─────────────────────────────────────────────────────

export function analyze(pre: PreprocessedSource): Result<FormulaAnalysis> {
    const cleaned = stripComments(pre.glsl);

    // 1. Extract functions
    const functions = extractFunctions(cleaned);

    // 2. Split into DE candidates / init / helpers
    const deCandidates: DeFunction[] = [];
    const helperFunctions: HelperFunction[] = [];
    let initBody: string | undefined;

    for (const fn of functions) {
        // Skip main entirely (engine provides its own)
        if (fn.name === 'main') continue;

        // void init() → loopInit
        if (fn.name === 'init' && fn.returnType === 'void' && fn.paramList.length === 0) {
            // body includes braces; strip them
            const trimmed = fn.body.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                initBody = trimmed.slice(1, -1).trim();
            } else {
                initBody = trimmed;
            }
            continue;
        }

        // DE candidate: scalar/vec return, first param is vec3
        const isScalarReturn = ['float', 'vec2', 'vec4'].includes(fn.returnType);
        const firstParam = fn.paramList[0];
        if (isScalarReturn && firstParam && firstParam.type === 'vec3') {
            deCandidates.push({
                name: fn.name,
                paramName: firstParam.name,
                body: fn.fullText,
                returnType: fn.returnType,
            });
        } else {
            helperFunctions.push({
                name: fn.name,
                returnType: fn.returnType,
                paramTypes: fn.paramList.map(p => p.type),
                body: fn.fullText,
            });
        }
    }

    if (deCandidates.length === 0) {
        return {
            ok: false,
            error: {
                kind: 'no_de_function',
                message: 'No DE function found (looking for float/vec2/vec4 NAME(vec3, ...)).',
                hint: 'V4 imports need a distance-estimator function. Common names: DE, de, sdf, map.',
            },
        };
    }

    // Pick the default DE: prefer known names in priority order
    let selectedDE: DeFunction | undefined;
    for (const pref of DE_NAMES_PRIORITY) {
        const found = deCandidates.find(d => d.name === pref);
        if (found) { selectedDE = found; break; }
    }
    if (!selectedDE) selectedDE = deCandidates[0];

    // Non-selected DE candidates are helper functions at emission time —
    // e.g. PseudoKleinian has RoundBox/Thingy/Thing2 helpers that happen to
    // have the `float X(vec3)` signature. They remain in `deCandidates` so
    // the UI can offer them as alternative selections, AND appear in
    // helperFunctions so emit preserves them in the preamble.
    for (const cand of deCandidates) {
        if (cand === selectedDE) continue;
        helperFunctions.push({
            name: cand.name,
            returnType: cand.returnType,
            paramTypes: [`vec3 ${cand.paramName}` /* approximation */],
            body: cand.body,
        });
    }

    // 3. Extract + classify globals
    const rawGlobals = extractGlobals(cleaned);
    const mutableGlobals: GlobalDecl[] = [];
    const constGlobals: GlobalDecl[] = [];
    const uninitializedGlobals: GlobalDecl[] = [];

    for (const g of rawGlobals) {
        const klass = classifyGlobal(g);
        if (klass === 'mutable') mutableGlobals.push(g);
        else if (klass === 'const') constGlobals.push(g);
        else uninitializedGlobals.push(g);
    }

    // 4. Resolve #preset Default values
    const defaultPresetValues = pre.presets.get('Default');

    // 5. Parameters pass through from preprocess.
    //    TODO (future): reconcile against actual uniform declarations in GLSL —
    //    warn if an annotated uniform doesn't appear in the source, or vice versa.
    const parameters: ParamAnnotation[] = pre.parameters;

    return {
        ok: true,
        value: {
            preprocessed: pre,
            deCandidates,
            selectedDE,
            helperFunctions,
            mutableGlobals,
            constGlobals,
            uninitializedGlobals,
            parameters,
            initBody,
            defaultPresetValues,
        },
    };
}
