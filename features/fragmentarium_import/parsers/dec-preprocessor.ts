/**
 * DEC (Distance Estimator Compendium) preprocessor.
 * Transforms raw GLSL distance estimator snippets into Fragmentarium-compatible
 * format so the existing import pipeline can handle them.
 *
 * Pipeline: expandMacros → extractPromotableConstants → generateFragShell
 * Output is a valid Fragmentarium .frag string ready for detectFormula().
 */

import { parseMacros, detectDECFormat } from './dec-detector';
import type { DECMacro } from './dec-detector';

// ============================================================================
// Types
// ============================================================================

export interface PromotableConstant {
    /** The original literal text in the source, e.g. "1.5", "8", "vec3(1.2)" */
    originalLiteral: string;
    /** Generated uniform name, e.g. "Scale", "Offset", "Iterations" */
    uniformName: string;
    type: 'float' | 'int' | 'vec3' | 'vec2';
    defaultValue: number | number[];
    suggestedMin: number;
    suggestedMax: number;
    suggestedStep: number;
    /** Semantic context: "iteration count", "scale factor", "fold offset", etc. */
    context: string;
}

export interface DECPreprocessResult {
    /** Fragmentarium-compatible source string */
    fragmentariumSource: string;
    /** Constants that were promoted to uniforms */
    extractedConstants: PromotableConstant[];
    /** Names of macros that were expanded */
    expandedMacros: string[];
    warnings: string[];
}

// ============================================================================
// Comment stripping (preserve structure, mask content)
// ============================================================================

interface CommentSpan { start: number; end: number; text: string; }

function findComments(source: string): CommentSpan[] {
    const spans: CommentSpan[] = [];
    // Single-line comments
    const singleLine = /\/\/[^\n]*/g;
    let m;
    while ((m = singleLine.exec(source)) !== null) {
        spans.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
    // Multi-line comments
    const multiLine = /\/\*[\s\S]*?\*\//g;
    while ((m = multiLine.exec(source)) !== null) {
        spans.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
    return spans;
}

function isInComment(pos: number, spans: CommentSpan[]): boolean {
    return spans.some(s => pos >= s.start && pos < s.end);
}

/** Replace comment bodies with spaces (preserving line structure) so macro expansion
 *  doesn't touch comment text. Comments are restored after expansion. */
function maskComments(source: string): { masked: string; spans: CommentSpan[] } {
    const spans = findComments(source);
    let masked = source;
    for (const span of spans) {
        const placeholder = span.text.replace(/[^\n]/g, ' ');
        masked = masked.slice(0, span.start) + placeholder + masked.slice(span.end);
    }
    return { masked, spans };
}

function restoreComments(source: string, original: string, spans: CommentSpan[]): string {
    let result = source;
    // Restore in reverse order to keep indices valid
    const sorted = [...spans].sort((a, b) => b.start - a.start);
    for (const span of sorted) {
        const origText = original.slice(span.start, span.end);
        result = result.slice(0, span.start) + origText + result.slice(span.start + origText.length);
    }
    return result;
}

// ============================================================================
// Macro expansion
// ============================================================================

/**
 * Parse balanced parenthesised arguments from `source` starting just after the opening `(`.
 * Returns the argument strings and the position after the closing `)`.
 */
function parseBalancedArgs(source: string, startPos: number): { values: string[]; endPos: number } | null {
    let depth = 1;
    let pos = startPos;
    const argStarts: number[] = [pos];

    while (pos < source.length && depth > 0) {
        const ch = source[pos];
        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0) break;
        } else if (ch === ',' && depth === 1) {
            argStarts.push(pos + 1);
        }
        pos++;
    }

    if (depth !== 0) return null;

    const values: string[] = [];
    for (let i = 0; i < argStarts.length; i++) {
        const end = i + 1 < argStarts.length ? argStarts[i + 1] - 1 : pos;
        values.push(source.slice(argStarts[i], end).trim());
    }

    return { values, endPos: pos + 1 }; // +1 to skip closing ')'
}

/**
 * Expand a single parameterised macro throughout the source.
 * Uses balanced-paren argument parsing to handle nested calls correctly.
 */
function expandParameterizedMacro(source: string, macro: DECMacro): { result: string; didExpand: boolean } {
    // Build a regex that matches MACRO_NAME followed by (
    const nameEsc = macro.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = new RegExp(`\\b${nameEsc}\\s*\\(`, 'g');

    let result = '';
    let lastEnd = 0;
    let didExpand = false;
    let match;

    // Reset regex state
    namePattern.lastIndex = 0;

    while ((match = namePattern.exec(source)) !== null) {
        // Append text before this match
        result += source.slice(lastEnd, match.index);

        const argsStartPos = match.index + match[0].length;
        const parsed = parseBalancedArgs(source, argsStartPos);

        if (!parsed || !macro.params) {
            // Malformed — keep original text
            result += match[0];
            lastEnd = argsStartPos;
            continue;
        }

        // Substitute parameters in macro body
        let expanded = macro.body;
        for (let i = 0; i < macro.params.length; i++) {
            const paramName = macro.params[i];
            const argValue = parsed.values[i] ?? '';
            // Word-boundary replacement for parameter names in the body
            const paramEsc = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            expanded = expanded.replace(new RegExp(`\\b${paramEsc}\\b`, 'g'), argValue);
        }

        // Wrap expression macros in parens for safety, but NOT statement macros
        // (those containing if/for/while/{ which can't be parenthesised)
        const isStatement = /^\s*(?:if|for|while|do|switch)\b/.test(expanded) || /[{};]/.test(expanded);
        result += isStatement ? expanded : `(${expanded})`;
        lastEnd = parsed.endPos;
        didExpand = true;

        // Continue searching from after the expansion
        namePattern.lastIndex = result.length + (source.length - lastEnd) - (source.length - lastEnd);
        // Actually, simpler: we'll rebuild and re-search
    }

    result += source.slice(lastEnd);

    return { result, didExpand };
}

/**
 * Expand all macros in the source. Constant macros first, then parameterised.
 * Runs in passes until fixpoint (no more expansions) or max passes reached.
 */
export function expandMacros(source: string, macros: DECMacro[]): { expanded: string; expandedNames: string[] } {
    if (macros.length === 0) return { expanded: source, expandedNames: [] };

    const expandedNames = new Set<string>();

    // 1. Strip all #define lines from source
    let result = source.replace(/^[\t ]*#define\s+.*(?:\\\n[\t ]*.*)*$/gm, '');

    const constantMacros = macros.filter(m => m.params === null && m.body.length > 0);
    const paramMacros = macros.filter(m => m.params !== null);

    // 2. Expand constant macros in passes until fixpoint
    //    (a macro body may reference other macros, e.g. `#define scale (... SCALE ...)`)
    {
        let changed = true;
        let passes = 0;
        while (changed && passes < 15) {
            changed = false;
            passes++;
            for (const macro of constantMacros) {
                const nameEsc = macro.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(`\\b${nameEsc}\\b`, 'g');
                if (pattern.test(result)) {
                    result = result.replace(pattern, macro.body);
                    changed = true;
                    expandedNames.add(macro.name);
                }
            }
        }
    }

    // 3. Expand parameterised macros in passes until fixpoint
    let changed = true;
    let passes = 0;
    while (changed && passes < 15) {
        changed = false;
        passes++;
        for (const macro of paramMacros) {
            const { result: newResult, didExpand } = expandParameterizedMacro(result, macro);
            if (didExpand) {
                result = newResult;
                changed = true;
                expandedNames.add(macro.name);
            }
        }
    }

    return { expanded: result, expandedNames: Array.from(expandedNames) };
}

// ============================================================================
// Constant promotion
// ============================================================================

/** GLSL mathematical constants that should never be promoted */
const SKIP_LITERALS = new Set([
    '0', '0.0', '0.', '.0',
    '1', '1.0', '1.', '.1',
    '2', '2.0',
    '0.5', '.5',
    '3.14159', '3.141592', '3.1415926', '3.14159265',
    '6.28318', '6.2831853',
    '1e-4', '1e-5', '1e-6', '1e-10',
    '10000.0', '1000.0', '100.0',
]);

/** Context patterns for constant promotion */
interface ConstantMatch {
    literal: string;
    type: 'float' | 'int';
    value: number;
    context: string;
    priority: number; // higher = more important to promote
}

function extractFunctionBody(source: string, funcName: string): string | null {
    const pattern = new RegExp(`float\\s+${funcName}\\s*\\(\\s*vec3\\s+\\w+\\s*\\)\\s*\\{`);
    const match = pattern.exec(source);
    if (!match) return null;
    const start = match.index + match[0].length;
    let depth = 1;
    let pos = start;
    while (pos < source.length && depth > 0) {
        if (source[pos] === '{') depth++;
        else if (source[pos] === '}') depth--;
        pos++;
    }
    return source.slice(start, pos - 1);
}

function extractLoopBody(funcBody: string): string | null {
    // Find the first for/while loop body
    const loopStart = funcBody.match(/(?:for|while)\s*\([^)]*\)\s*\{/);
    if (!loopStart) return null;
    const start = (loopStart.index ?? 0) + loopStart[0].length;
    let depth = 1;
    let pos = start;
    while (pos < funcBody.length && depth > 0) {
        if (funcBody[pos] === '{') depth++;
        else if (funcBody[pos] === '}') depth--;
        pos++;
    }
    return funcBody.slice(start, pos - 1);
}

/**
 * Find the DE function parameter name (e.g. 'p', 'z', 'pos').
 */
function findDEParamName(source: string, funcName: string): string {
    const m = source.match(new RegExp(`float\\s+${funcName}\\s*\\(\\s*vec3\\s+(\\w+)\\s*\\)`));
    return m ? m[1] : 'p';
}

/**
 * Analyse a DE function and extract constants worth promoting to uniforms.
 */
export function extractPromotableConstants(source: string, funcName: string): PromotableConstant[] {
    const funcBody = extractFunctionBody(source, funcName);
    if (!funcBody) return [];
    const loopBody = extractLoopBody(funcBody);
    const paramName = findDEParamName(source, funcName);

    const constants: PromotableConstant[] = [];
    const usedNames = new Set<string>();
    let scalarIndex = 0;

    // Helper to generate unique names
    function nextScalarName(preferred: string): string {
        if (!usedNames.has(preferred)) { usedNames.add(preferred); return preferred; }
        let n = preferred + (++scalarIndex);
        while (usedNames.has(n)) n = preferred + (++scalarIndex);
        usedNames.add(n);
        return n;
    }

    // --- 1. Iteration count ---
    // for (int i = 0; i < 8; i++)
    const forMatch = funcBody.match(/for\s*\(\s*int\s+\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*(\d+)/);
    // while (n < 8)
    const whileMatch = funcBody.match(/while\s*\(\s*\w+\s*<\s*(\d+)\s*\)/);
    const iterMatch = forMatch || whileMatch;
    if (iterMatch) {
        const val = parseInt(iterMatch[1]);
        if (val > 1 && val < 1000) {
            constants.push({
                originalLiteral: iterMatch[1],
                uniformName: 'Iterations',
                type: 'int',
                defaultValue: val,
                suggestedMin: 1,
                suggestedMax: Math.max(50, val * 5),
                suggestedStep: 1,
                context: 'iteration count',
            });
            usedNames.add('Iterations');
        }
    }

    if (!loopBody) return constants;

    // --- 2. Scale factor: p *= LITERAL or p = LITERAL * p ---
    const pn = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const scalePatterns = [
        new RegExp(`\\b${pn}\\s*\\*=\\s*(-?[\\d.]+)\\s*;`),
        new RegExp(`\\b${pn}\\s*=\\s*\\b${pn}\\s*\\*\\s*(-?[\\d.]+)`),
        new RegExp(`\\b${pn}\\s*=\\s*(-?[\\d.]+)\\s*\\*\\s*\\b${pn}`),
        // Also match component-wise: p.xz *= 1.5
        new RegExp(`\\b${pn}\\.[xyz]+\\s*\\*=\\s*(-?[\\d.]+)\\s*;`),
    ];
    for (const pat of scalePatterns) {
        const m = loopBody.match(pat);
        if (m && !SKIP_LITERALS.has(m[1])) {
            const val = parseFloat(m[1]);
            if (!isNaN(val) && val !== 0 && val !== 1) {
                constants.push({
                    originalLiteral: m[1],
                    uniformName: nextScalarName('Scale'),
                    type: 'float',
                    defaultValue: val,
                    suggestedMin: Math.min(0.1, val * 0.5),
                    suggestedMax: Math.max(val * 3, 5),
                    suggestedStep: 0.001,
                    context: 'scale factor',
                });
                break; // only promote first scale
            }
        }
    }

    // --- 3. Fold offset: abs(p) - LITERAL or abs(p) - vec3(LITERAL) ---
    const foldVec3 = loopBody.match(/abs\s*\(\s*\w+\s*\)\s*-\s*vec3\s*\(\s*(-?[\d.]+)\s*\)/);
    const foldScalar = loopBody.match(/abs\s*\(\s*\w+\s*\)\s*-\s*(-?[\d.]+(?:\s*,\s*-?[\d.]+)*)\s*;/);
    // Also: abs(p) - vec3(x, y, z)
    const foldVec3Full = loopBody.match(/abs\s*\(\s*\w+\s*\)\s*-\s*vec3\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);

    if (foldVec3Full) {
        const x = parseFloat(foldVec3Full[1]);
        const y = parseFloat(foldVec3Full[2]);
        const z = parseFloat(foldVec3Full[3]);
        if ([x, y, z].some(v => !SKIP_LITERALS.has(String(v)))) {
            constants.push({
                originalLiteral: `vec3(${foldVec3Full[1]}, ${foldVec3Full[2]}, ${foldVec3Full[3]})`,
                uniformName: nextScalarName('Offset'),
                type: 'vec3',
                defaultValue: [x, y, z],
                suggestedMin: Math.min(-5, ...[x, y, z].map(v => v * -2)),
                suggestedMax: Math.max(5, ...[x, y, z].map(v => v * 3)),
                suggestedStep: 0.001,
                context: 'fold offset (vec3)',
            });
        }
    } else if (foldVec3) {
        const val = parseFloat(foldVec3[1]);
        if (!SKIP_LITERALS.has(foldVec3[1]) && !isNaN(val)) {
            constants.push({
                originalLiteral: `vec3(${foldVec3[1]})`,
                uniformName: nextScalarName('Offset'),
                type: 'float',
                defaultValue: val,
                suggestedMin: 0,
                suggestedMax: Math.max(val * 3, 5),
                suggestedStep: 0.001,
                context: 'fold offset',
            });
        }
    } else if (foldScalar) {
        const val = parseFloat(foldScalar[1]);
        if (!SKIP_LITERALS.has(foldScalar[1]) && !isNaN(val) && val !== 0) {
            constants.push({
                originalLiteral: foldScalar[1],
                uniformName: nextScalarName('Offset'),
                type: 'float',
                defaultValue: val,
                suggestedMin: 0,
                suggestedMax: Math.max(val * 3, 5),
                suggestedStep: 0.001,
                context: 'fold offset',
            });
        }
    }

    // --- 4. Rotation angles (arguments to sin/cos in rotation matrices) ---
    // Look for patterns like: mat2(cos(A), -sin(A), sin(A), cos(A)) with literal A
    // Or expanded rot macro: cos(0.5), -sin(0.5), sin(0.5), cos(0.5)
    const rotPatterns = [
        // mat2(cos(A), ...) rotation matrix
        /mat2\s*\(\s*cos\s*\(\s*(-?[\d.]+)\s*\)/g,
        // Direct sin/cos pair with same literal (likely rotation angle)
        /sin\s*\(\s*(-?[\d.]+)\s*\)/g,
    ];
    const seenAngles = new Set<string>();
    let angleIndex = 0;
    for (const pat of rotPatterns) {
        let m;
        while ((m = pat.exec(loopBody)) !== null) {
            const lit = m[1];
            if (SKIP_LITERALS.has(lit) || seenAngles.has(lit)) continue;
            seenAngles.add(lit);
            const val = parseFloat(lit);
            if (isNaN(val)) continue;
            angleIndex++;
            constants.push({
                originalLiteral: lit,
                uniformName: nextScalarName(angleIndex === 1 ? 'RotAngle' : `RotAngle${angleIndex}`),
                type: 'float',
                defaultValue: val,
                suggestedMin: -3.14159,
                suggestedMax: 3.14159,
                suggestedStep: 0.01,
                context: 'rotation angle',
            });
        }
    }

    // --- 5. Clamp bounds: clamp(p, -X, X) ---
    const clampMatch = loopBody.match(/clamp\s*\(\s*\w+\s*,\s*-(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
    if (clampMatch && clampMatch[1] === clampMatch[2]) {
        const val = parseFloat(clampMatch[2]);
        if (!SKIP_LITERALS.has(clampMatch[2]) && !isNaN(val) && val !== 1) {
            constants.push({
                originalLiteral: clampMatch[2],
                uniformName: nextScalarName('FoldLimit'),
                type: 'float',
                defaultValue: val,
                suggestedMin: 0,
                suggestedMax: Math.max(val * 3, 5),
                suggestedStep: 0.001,
                context: 'clamp/fold limit',
            });
        }
    }

    // --- 6. Translation offsets: p += vec3(x,y,z) or p -= vec3(x,y,z) ---
    const transVec3 = loopBody.match(new RegExp(`\\b${pn}\\s*[+-]=\\s*vec3\\s*\\(\\s*(-?[\\d.]+)\\s*,\\s*(-?[\\d.]+)\\s*,\\s*(-?[\\d.]+)\\s*\\)`));
    if (transVec3) {
        const x = parseFloat(transVec3[1]);
        const y = parseFloat(transVec3[2]);
        const z = parseFloat(transVec3[3]);
        if ([x, y, z].some(v => !SKIP_LITERALS.has(String(v)) && v !== 0)) {
            constants.push({
                originalLiteral: `vec3(${transVec3[1]}, ${transVec3[2]}, ${transVec3[3]})`,
                uniformName: nextScalarName('Translation'),
                type: 'vec3',
                defaultValue: [x, y, z],
                suggestedMin: Math.min(-10, ...[x, y, z].map(v => v * -2)),
                suggestedMax: Math.max(10, ...[x, y, z].map(v => v * 3)),
                suggestedStep: 0.01,
                context: 'translation offset',
            });
        }
    }

    // --- 7. Sphere fold: p /= clamp(dot(p,p), 0.25, 1.0) or p /= clamp(r, 0.25, 1.0)
    //     Look for division by clamp — this is the Mandelbox sphere fold pattern.
    //     The /= or / clamp context disambiguates from fold clamp(p, -X, X).
    const sphereFoldPatterns = [
        // p /= clamp(dot(p,p), MIN, MAX)
        /\/=?\s*clamp\s*\(\s*dot\s*\(\s*\w+\s*,\s*\w+\s*\)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/,
        // p /= clamp(r, MIN, MAX) where r is typically dot(p,p)
        /\/=?\s*clamp\s*\(\s*\w+\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/,
    ];
    for (const dotPat of sphereFoldPatterns) {
        const dotClamp = loopBody.match(dotPat);
        if (dotClamp) {
            const minVal = parseFloat(dotClamp[1]);
            if (!SKIP_LITERALS.has(dotClamp[1]) && !isNaN(minVal)) {
                constants.push({
                    originalLiteral: dotClamp[1],
                    uniformName: nextScalarName('MinRad2'),
                    type: 'float',
                    defaultValue: minVal,
                    suggestedMin: 0.001,
                    suggestedMax: Math.max(minVal * 5, 2),
                    suggestedStep: 0.001,
                    context: 'minimum radius squared (sphere fold)',
                });
                break;
            }
        }
    }

    return constants;
}

// ============================================================================
// Fragmentarium shell generation
// ============================================================================

function sliderAnnotation(c: PromotableConstant): string {
    if (c.type === 'int') {
        return `slider[${c.suggestedMin},${c.defaultValue},${c.suggestedMax}]`;
    }
    if (c.type === 'vec3') {
        const def = c.defaultValue as number[];
        const mn = c.suggestedMin;
        const mx = c.suggestedMax;
        return `slider[(${mn},${mn},${mn}),(${def[0]},${def[1]},${def[2]}),(${mx},${mx},${mx})]`;
    }
    if (c.type === 'vec2') {
        const def = c.defaultValue as number[];
        const mn = c.suggestedMin;
        const mx = c.suggestedMax;
        return `slider[(${mn},${mn}),(${def[0]},${def[1]}),(${mx},${mx})]`;
    }
    // float
    return `slider[${c.suggestedMin},${c.defaultValue},${c.suggestedMax}]`;
}

/**
 * Replace promoted constants in the source with their uniform names.
 * Handles both scalar and vec3 replacements. Uses word-boundary matching
 * for scalars and exact substring matching for vec3 constructors.
 */
function replaceConstants(source: string, constants: PromotableConstant[], funcName: string): string {
    let result = source;

    // Get the iteration count constant (needs special treatment — replaces loop bound)
    const iterConst = constants.find(c => c.uniformName === 'Iterations');

    // Replace iteration count in loop condition
    if (iterConst) {
        // for (int i = 0; i < 8; i++) → for (int i = 0; i < Iterations; i++)
        result = result.replace(
            new RegExp(`(for\\s*\\(\\s*int\\s+\\w+\\s*=\\s*\\d+\\s*;\\s*\\w+\\s*<\\s*)${iterConst.originalLiteral}(\\s*;)`),
            `$1Iterations$2`
        );
        // while (n < 8) → while (n < Iterations)
        result = result.replace(
            new RegExp(`(while\\s*\\(\\s*\\w+\\s*<\\s*)${iterConst.originalLiteral}(\\s*\\))`),
            `$1Iterations$2`
        );
    }

    // Replace other constants — process vec3 before scalars to avoid partial replacement
    const vec3Constants = constants.filter(c => c.type === 'vec3' && c.uniformName !== 'Iterations');
    const scalarConstants = constants.filter(c => c.type !== 'vec3' && c.uniformName !== 'Iterations');

    for (const c of vec3Constants) {
        // Replace the exact vec3 constructor: vec3(1.2) → Offset or vec3(1.2, 0.5, 0.3) → Offset
        const escaped = c.originalLiteral.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escaped, 'g'), c.uniformName);
    }

    for (const c of scalarConstants) {
        if (c.uniformName === 'Iterations') continue; // already handled

        // For scalar constants in specific contexts, use targeted replacement
        // to avoid replacing the same literal in unrelated positions (e.g. return statement)
        const escaped = c.originalLiteral.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Replace inside the function body only, avoiding the return statement for safety
        // We do a simple global replace here — the constant extraction is already selective
        // about what to promote (skip common literals, only loop-body constants, etc.)
        result = result.replace(new RegExp(`(?<![\\d.])${escaped}(?![\\d.eE])`, 'g'), (match, offset) => {
            // Don't replace inside comments
            const lineStart = result.lastIndexOf('\n', offset) + 1;
            const lineUpToMatch = result.slice(lineStart, offset);
            if (lineUpToMatch.includes('//')) return match;
            return c.uniformName;
        });
    }

    return result;
}

/**
 * Rename the DE function to the standard Fragmentarium name 'DE'.
 */
function renameDEFunction(source: string, oldName: string): string {
    if (oldName === 'DE') return source;
    // Replace function declaration
    let result = source.replace(
        new RegExp(`(float\\s+)${oldName}(\\s*\\(\\s*vec3)`),
        '$1DE$2'
    );
    // Replace any recursive calls to itself
    result = result.replace(
        new RegExp(`\\b${oldName}\\s*\\(`, 'g'),
        'DE('
    );
    return result;
}

// ============================================================================
// Main preprocessor
// ============================================================================

export function preprocessDEC(source: string): DECPreprocessResult {
    const warnings: string[] = [];
    const detection = detectDECFormat(source);

    if (!detection.isDEC) {
        return {
            fragmentariumSource: source,
            extractedConstants: [],
            expandedMacros: [],
            warnings: ['Source does not appear to be DEC format; passing through unmodified.'],
        };
    }

    const funcName = detection.deFunctionName || 'de';

    // Step 1: Expand macros
    const { masked, spans } = maskComments(source);
    const macros = parseMacros(source); // parse from original (not masked)
    const { expanded: expandedMasked, expandedNames } = expandMacros(masked, macros);

    // Restore comments into the expanded source
    let expanded = expandedMasked;
    // Since macro expansion may shift positions, we can't perfectly restore original comments.
    // Instead, just keep the expanded result (comments inside #define lines are lost, which is fine).

    if (expandedNames.length > 0) {
        warnings.push(`Expanded ${expandedNames.length} macro(s): ${expandedNames.join(', ')}`);
    }

    // Step 2: Extract promotable constants
    const constants = extractPromotableConstants(expanded, funcName);

    // Step 3: Replace constants in source and rename DE function
    let processed = replaceConstants(expanded, constants, funcName);
    processed = renameDEFunction(processed, funcName);

    // Step 4: Generate Fragmentarium shell (uniform declarations + slider annotations)
    const uniformLines: string[] = [];
    for (const c of constants) {
        const typeStr = c.type === 'vec3' ? 'vec3' : c.type === 'vec2' ? 'vec2' : c.type === 'int' ? 'int' : 'float';
        uniformLines.push(`uniform ${typeStr} ${c.uniformName}; ${sliderAnnotation(c)}`);
    }

    // Build the final Fragmentarium-compatible source
    const parts: string[] = [];
    parts.push('// Auto-preprocessed from raw DEC distance estimator');
    if (uniformLines.length > 0) {
        parts.push('');
        parts.push(uniformLines.join('\n'));
    }
    parts.push('');

    // Include the processed source (with helpers, the DE function, etc.)
    // Strip any leading blank lines from processed source
    parts.push(processed.replace(/^\s*\n/, ''));

    // Add a default preset block with original values
    if (constants.length > 0) {
        parts.push('');
        parts.push('#preset Default');
        for (const c of constants) {
            if (c.type === 'vec3') {
                const def = c.defaultValue as number[];
                parts.push(`${c.uniformName} = ${def[0]} ${def[1]} ${def[2]}`);
            } else if (c.type === 'vec2') {
                const def = c.defaultValue as number[];
                parts.push(`${c.uniformName} = ${def[0]} ${def[1]}`);
            } else {
                parts.push(`${c.uniformName} = ${c.defaultValue}`);
            }
        }
        parts.push('#endpreset');
    }

    const fragmentariumSource = parts.join('\n');

    return {
        fragmentariumSource,
        extractedConstants: constants,
        expandedMacros: expandedNames,
        warnings,
    };
}
