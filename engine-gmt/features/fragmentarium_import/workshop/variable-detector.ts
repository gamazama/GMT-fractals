/**
 * Variable Detector — Scans GLSL source for promotable constants.
 *
 * Finds magic numbers, #define constants, and grouped x/y/z literals,
 * returning their source positions so the editor can highlight them.
 * Clicking a highlight promotes it to a uniform declaration.
 */

// ============================================================================
// Types
// ============================================================================

export interface DetectedVariable {
    /** Unique id for this detection */
    id: string;
    /** Suggested uniform name */
    name: string;
    /** GLSL type */
    type: 'float' | 'int' | 'vec3' | 'vec2';
    /** The literal text in the source */
    originalText: string;
    /** Parsed default value */
    defaultValue: number | number[];
    /** Human-readable context */
    context: string;
    /** All occurrences in the source (char offsets) */
    occurrences: Array<{ from: number; to: number }>;
    /** Suggested slider bounds */
    suggestedMin: number;
    suggestedMax: number;
    suggestedStep: number;
    /** Color category for highlighting */
    colorClass: string;
}

// ============================================================================
// Skip list — literals too common or mathematical to promote
// ============================================================================

const SKIP_LITERALS = new Set([
    '0', '0.0', '0.', '.0',
    '1', '1.0', '1.', '.1',
    '2', '2.0',
    '0.5', '.5',
    '-1', '-1.0', '-2', '-2.0',
    '3.14159', '3.141592', '3.1415926', '3.14159265',
    '6.28318', '6.2831853',
    '1e-4', '1e-5', '1e-6', '1e-10',
    '10000.0', '1000.0', '100.0',
]);

/** Names that are already GLSL built-ins or too generic */
const SKIP_NAMES = new Set([
    'gl_FragCoord', 'gl_FragColor', 'gl_Position',
    'main', 'void', 'return', 'if', 'else', 'for', 'while', 'break', 'continue',
]);

// ============================================================================
// Comment detection — skip literals inside comments
// ============================================================================

interface CommentSpan { from: number; to: number; }

function findCommentSpans(source: string): CommentSpan[] {
    const spans: CommentSpan[] = [];
    const re = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
    let m;
    while ((m = re.exec(source)) !== null) {
        spans.push({ from: m.index, to: m.index + m[0].length });
    }
    return spans;
}

function isInComment(pos: number, spans: CommentSpan[]): boolean {
    return spans.some(s => pos >= s.from && pos < s.to);
}

/** Check if position is inside a string literal */
function isInString(pos: number, source: string): boolean {
    // Simple check: count unescaped quotes before pos on same line
    const lineStart = source.lastIndexOf('\n', pos - 1) + 1;
    const before = source.slice(lineStart, pos);
    const singleQuotes = (before.match(/(?<!\\)'/g) || []).length;
    const doubleQuotes = (before.match(/(?<!\\)"/g) || []).length;
    return (singleQuotes % 2 !== 0) || (doubleQuotes % 2 !== 0);
}

// ============================================================================
// Detection helpers
// ============================================================================

/** Strip optional GLSL/C `f` suffix from a float literal: "2.0773f" → "2.0773" */
function stripF(lit: string): string { return lit.replace(/f$/i, ''); }

/** Regex fragment for a float literal, optionally ending in `f` */
const FLOAT_LIT = `-?[\\d.]+(?:[eE][+-]?\\d+)?f?`;

let nextId = 0;
function makeId(): string { return `dv_${nextId++}`; }

/** Find all non-overlapping occurrences of a literal in source, outside comments/strings */
function findOccurrences(source: string, literal: string, comments: CommentSpan[]): Array<{ from: number; to: number }> {
    const results: Array<{ from: number; to: number }> = [];
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use word boundary for numbers to avoid matching sub-parts
    // For vec3/vec2(...) patterns, use exact match
    const isVecPattern = /^vec[234]\(/.test(literal);
    const pattern = isVecPattern
        ? new RegExp(escaped, 'g')
        : new RegExp(`(?<![\\w.])${escaped}(?![\\w.eE])`, 'g');
    let m;
    while ((m = pattern.exec(source)) !== null) {
        if (!isInComment(m.index, comments) && !isInString(m.index, source)) {
            results.push({ from: m.index, to: m.index + m[0].length });
        }
    }
    return results;
}

/**
 * Check whether an RHS expression is a "pure literal" — only contains
 * numeric literals and vec constructors, no function calls or variable references.
 * e.g. `vec3( -1.238f, -1.533f, 1.085f )` → true
 *      `vec2(sin(angle1), cos(angle1))`   → false
 */
function isPureLiteralExpr(expr: string): boolean {
    // Strip the expression down: remove vec2/vec3/vec4 constructors, numbers, parens, commas, whitespace, signs, f-suffix
    const stripped = expr
        .replace(/vec[234]\s*/g, '')          // vec constructors
        .replace(/-?[\d.]+(?:[eE][+-]?\d+)?f?/g, '')  // numeric literals
        .replace(/[(),\s+\-]/g, '');          // parens, commas, whitespace, signs
    return stripped.length === 0;
}

/** Suggest slider bounds from value and context */
function suggestBounds(value: number, context: string): { min: number; max: number; step: number } {
    if (context === 'iteration count') {
        return { min: 1, max: Math.max(50, value * 5), step: 1 };
    }
    if (context === 'rotation angle') {
        return { min: -3.14159, max: 3.14159, step: 0.01 };
    }
    if (context === 'fold offset' || context === 'clamp/fold limit') {
        return { min: 0, max: Math.max(value * 3, 5), step: 0.001 };
    }
    if (context === 'scale factor') {
        return { min: Math.min(0.1, value * 0.5), max: Math.max(value * 3, 5), step: 0.001 };
    }
    if (context === 'sphere fold radius') {
        return { min: 0.001, max: Math.max(value * 5, 2), step: 0.001 };
    }
    // Generic
    const absVal = Math.abs(value);
    if (absVal < 0.01) return { min: -1, max: 1, step: 0.0001 };
    if (absVal > 100) return { min: 0, max: value * 3, step: 1 };
    return { min: Math.min(-absVal * 2, -5), max: Math.max(absVal * 3, 5), step: 0.001 };
}

// ============================================================================
// Main detection
// ============================================================================

/**
 * Scan GLSL source for promotable variables.
 * Returns detected variables with their source positions for highlighting.
 */
export function detectVariables(source: string): DetectedVariable[] {
    nextId = 0;
    const results: DetectedVariable[] = [];
    const comments = findCommentSpans(source);
    const usedNames = new Set<string>();

    function uniqueName(preferred: string): string {
        // Add u_ prefix to avoid collisions with local variables in the shader
        const prefixed = preferred.startsWith('u_') ? preferred : `u_${preferred}`;
        const isTaken = (n: string) => usedNames.has(n) || existingUniforms.has(n);
        if (!isTaken(prefixed)) { usedNames.add(prefixed); return prefixed; }
        for (let i = 2; i < 100; i++) {
            const n = `${prefixed}${i}`;
            if (!isTaken(n)) { usedNames.add(n); return n; }
        }
        return prefixed;
    }

    // Track which source ranges are already claimed to avoid overlapping detections
    const claimedRanges: Array<{ from: number; to: number }> = [];
    function claimRange(from: number, to: number): void {
        claimedRanges.push({ from, to });
    }
    function isClaimed(from: number, to: number): boolean {
        // Check if any part of [from, to) overlaps with an already-claimed range
        return claimedRanges.some(r => from < r.to && to > r.from);
    }

    // Collect already-declared uniform names so we don't suggest duplicates
    const existingUniforms = new Set<string>();
    const uniformDeclRe = /uniform\s+\w+\s+(\w+)\s*;/g;
    let um;
    while ((um = uniformDeclRe.exec(source)) !== null) {
        existingUniforms.add(um[1]);
    }

    // --- 0. Local variable declarations with literal initializers ---
    // Matches: float scale = 2.0773f;  vec3 shift = vec3(-1.238f, ...);  vec2 uv = vec2(0.5, 0.3);
    // Also matches: const float ang = 0.04;  (const qualifier captured separately)
    // Skips derived vars like: vec2 a1 = vec2(sin(angle1), cos(angle1));
    const localVarRe = new RegExp(
        `(?:const\\s+)?(float|int|vec2|vec3)\\s+(\\w+)\\s*=\\s*` +
        `(` +
            // vec3(...) / vec2(...) constructor
            `vec[23]\\s*\\([^;]*?\\)` +
            `|` +
            // simple scalar literal (with optional f suffix)
            `${FLOAT_LIT}` +
        `)\\s*;`,
        'g'
    );
    let lvm;
    while ((lvm = localVarRe.exec(source)) !== null) {
        if (isInComment(lvm.index, comments)) continue;
        const varType = lvm[1] as 'float' | 'int' | 'vec2' | 'vec3';
        const varName = lvm[2];
        const rhsExpr = lvm[3];

        // Skip if already a uniform or built-in
        if (existingUniforms.has(varName) || SKIP_NAMES.has(varName)) continue;

        // Skip derived expressions (contain function calls like sin/cos/dot/length or other variable refs)
        if (!isPureLiteralExpr(rhsExpr)) continue;

        // Parse the value
        let defaultValue: number | number[];
        let glslType: 'float' | 'int' | 'vec2' | 'vec3' = varType;

        if (varType === 'vec3') {
            const vec3Match = rhsExpr.match(/vec3\s*\(\s*([-\d.eEf]+)\s*,\s*([-\d.eEf]+)\s*,\s*([-\d.eEf]+)\s*\)/);
            if (!vec3Match) continue;
            defaultValue = [parseFloat(stripF(vec3Match[1])), parseFloat(stripF(vec3Match[2])), parseFloat(stripF(vec3Match[3]))];
            if ((defaultValue as number[]).some(v => isNaN(v))) continue;
        } else if (varType === 'vec2') {
            const vec2Match = rhsExpr.match(/vec2\s*\(\s*([-\d.eEf]+)\s*,\s*([-\d.eEf]+)\s*\)/);
            if (!vec2Match) continue;
            defaultValue = [parseFloat(stripF(vec2Match[1])), parseFloat(stripF(vec2Match[2]))];
            if ((defaultValue as number[]).some(v => isNaN(v))) continue;
        } else {
            // float or int
            const val = parseFloat(stripF(rhsExpr));
            if (isNaN(val)) continue;
            if (SKIP_LITERALS.has(stripF(rhsExpr))) continue;
            defaultValue = val;
            glslType = varType === 'int' ? 'int' : 'float';
        }

        // The whole declaration line is the first occurrence
        // Extend back to include any leading whitespace and 'const' that precedes the match
        let declStart = lvm.index;
        // The regex (?:const\s+)? is non-capturing and part of lvm[0] when matched,
        // but also extend to include any leading whitespace on the line
        const lineStart = source.lastIndexOf('\n', declStart - 1) + 1;
        const leadingText = source.slice(lineStart, declStart);
        if (/^\s*$/.test(leadingText)) {
            declStart = lineStart; // include leading whitespace for clean line removal
        }
        const declOcc = { from: declStart, to: lvm.index + lvm[0].length };
        if (isClaimed(declOcc.from, declOcc.to)) continue;

        // Find all usages of the variable name (excluding the declaration)
        const nameEsc = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const usageRe = new RegExp(`\\b${nameEsc}\\b`, 'g');
        const usages: Array<{ from: number; to: number }> = [];
        let nm;
        while ((nm = usageRe.exec(source)) !== null) {
            // Skip the declaration itself
            if (nm.index >= lvm.index && nm.index < lvm.index + lvm[0].length) continue;
            if (!isInComment(nm.index, comments)) {
                usages.push({ from: nm.index, to: nm.index + nm[0].length });
            }
        }

        const allOccs = [declOcc, ...usages];

        const avgVal = Array.isArray(defaultValue) ? defaultValue.reduce((a, b) => a + b, 0) / defaultValue.length : defaultValue;
        const bounds = suggestBounds(avgVal, 'local variable');
        const uName = uniqueName(varName.charAt(0).toUpperCase() + varName.slice(1));

        results.push({
            id: makeId(),
            name: uName,
            type: glslType,
            originalText: varName,
            defaultValue,
            context: `${varType} ${varName}`,
            occurrences: allOccs,
            suggestedMin: Array.isArray(defaultValue)
                ? Math.min(bounds.min, ...defaultValue.map(v => v < 0 ? v * 3 : v * -2))
                : bounds.min,
            suggestedMax: Array.isArray(defaultValue)
                ? Math.max(bounds.max, ...defaultValue.map(v => v > 0 ? v * 3 : v * -2))
                : bounds.max,
            suggestedStep: bounds.step,
            colorClass: 'dv-local',
        });
        for (const o of allOccs) claimRange(o.from, o.to);
    }

    // --- 1. #define constants ---
    const defineRe = /^[ \t]*#define\s+([A-Za-z_]\w*)\s+(-?[\d.]+(?:[eE][+-]?\d+)?)\s*$/gm;
    let dm;
    while ((dm = defineRe.exec(source)) !== null) {
        if (isInComment(dm.index, comments)) continue;
        const name = dm[1];
        const literal = dm[2];
        const value = parseFloat(literal);
        if (isNaN(value) || SKIP_LITERALS.has(literal) || SKIP_NAMES.has(name)) continue;
        if (existingUniforms.has(name)) continue;

        // Find where this define name is used (not in the #define line itself)
        const defineLineEnd = dm.index + dm[0].length;
        const nameRe = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        const usages: Array<{ from: number; to: number }> = [];
        let nm;
        while ((nm = nameRe.exec(source)) !== null) {
            if (nm.index >= dm.index && nm.index < defineLineEnd) continue; // skip the #define line
            if (!isInComment(nm.index, comments)) {
                usages.push({ from: nm.index, to: nm.index + nm[0].length });
            }
        }

        // Include the define line itself as an occurrence (first one)
        const allOccurrences = [
            { from: dm.index, to: defineLineEnd }, // the whole #define line
            ...usages,
        ];

        if (allOccurrences.length > 0) {
            const bounds = suggestBounds(value, 'define constant');
            results.push({
                id: makeId(),
                name: uniqueName(name),
                type: Number.isInteger(value) && !literal.includes('.') ? 'int' : 'float',
                originalText: name,
                defaultValue: value,
                context: `#define ${name} = ${literal}`,
                occurrences: allOccurrences,
                suggestedMin: bounds.min,
                suggestedMax: bounds.max,
                suggestedStep: bounds.step,
                colorClass: 'dv-define',
            });
            for (const occ of allOccurrences) claimRange(occ.from, occ.to);
        }
    }

    // --- 2. Iteration count in for/while loops ---
    // Matches: i < N, i++ < N, ++i < N, i++<N
    const forRe = /for\s*\(\s*(?:int\s+)?\w+\s*=\s*\d+\s*;\s*(?:\+\+)?\w+(?:\+\+)?\s*<\s*(\d+)/g;
    const whileRe = /while\s*\(\s*(?:\+\+)?\w+(?:\+\+)?\s*<\s*(\d+)\s*\)/g;
    for (const re of [forRe, whileRe]) {
        let im;
        while ((im = re.exec(source)) !== null) {
            if (isInComment(im.index, comments)) continue;
            const literal = im[1];
            const value = parseInt(literal);
            if (value <= 1 || value >= 1000) continue;

            // Find the position of the literal within the match
            const litStart = source.indexOf(literal, im.index + im[0].indexOf(literal));
            const occ = { from: litStart, to: litStart + literal.length };
            if (isClaimed(occ.from, occ.to)) continue;

            const bounds = suggestBounds(value, 'iteration count');
            results.push({
                id: makeId(),
                name: uniqueName('Iterations'),
                type: 'int',
                originalText: literal,
                defaultValue: value,
                context: 'iteration count',
                occurrences: [occ],
                suggestedMin: bounds.min,
                suggestedMax: bounds.max,
                suggestedStep: bounds.step,
                colorClass: 'dv-iter',
            });
            claimRange(occ.from, occ.to);
        }
    }

    // --- 3. Vec3 constructors with all-literal args: vec3(x, y, z) ---
    const vec3Re = new RegExp(`vec3\\s*\\(\\s*(${FLOAT_LIT})\\s*,\\s*(${FLOAT_LIT})\\s*,\\s*(${FLOAT_LIT})\\s*\\)`, 'g');
    let v3m;
    while ((v3m = vec3Re.exec(source)) !== null) {
        if (isInComment(v3m.index, comments)) continue;
        const x = parseFloat(stripF(v3m[1])), y = parseFloat(stripF(v3m[2])), z = parseFloat(stripF(v3m[3]));
        // Skip only if all values are 0 or ±1 (truly trivial)
        if ([x, y, z].every(v => v === 0 || v === 1 || v === -1)) continue;
        const fullText = v3m[0];
        const occ = { from: v3m.index, to: v3m.index + fullText.length };
        if (isClaimed(occ.from, occ.to)) continue;

        // Find all identical vec3 constructors
        const allOccs = findOccurrences(source, fullText, comments).filter(o => !isClaimed(o.from, o.to));
        if (allOccs.length === 0) continue;

        // Guess name from context
        const beforeText = source.slice(Math.max(0, v3m.index - 40), v3m.index);
        let name = 'Offset';
        if (/abs\s*\(\s*\w+\s*\)\s*-\s*$/.test(beforeText)) name = 'FoldOffset';
        else if (/[+-]=\s*$/.test(beforeText)) name = 'Translation';
        else if (/\*=?\s*$/.test(beforeText) || /=\s*\w+\s*\*\s*$/.test(beforeText)) name = 'Scale';

        const avg = (x + y + z) / 3;
        const bounds = suggestBounds(avg, 'fold offset');
        results.push({
            id: makeId(),
            name: uniqueName(name),
            type: 'vec3',
            originalText: fullText,
            defaultValue: [x, y, z],
            context: `vec3(${stripF(v3m[1])}, ${stripF(v3m[2])}, ${stripF(v3m[3])})`,
            occurrences: allOccs,
            suggestedMin: Math.min(bounds.min, ...[x, y, z].map(v => v * -2)),
            suggestedMax: Math.max(bounds.max, ...[x, y, z].map(v => v * 3)),
            suggestedStep: 0.001,
            colorClass: 'dv-vec',
        });
        for (const o of allOccs) claimRange(o.from, o.to);
    }

    // --- 4. vec3(scalar) constructors ---
    const vec3ScalarRe = new RegExp(`vec3\\s*\\(\\s*(${FLOAT_LIT})\\s*\\)`, 'g');
    let v3s;
    while ((v3s = vec3ScalarRe.exec(source)) !== null) {
        if (isInComment(v3s.index, comments)) continue;
        const val = parseFloat(stripF(v3s[1]));
        if (SKIP_LITERALS.has(stripF(v3s[1])) || isNaN(val)) continue;
        const fullText = v3s[0];
        const occ = { from: v3s.index, to: v3s.index + fullText.length };
        if (isClaimed(occ.from, occ.to)) continue;

        const allOccs = findOccurrences(source, fullText, comments).filter(o => !isClaimed(o.from, o.to));
        if (allOccs.length === 0) continue;

        const beforeText = source.slice(Math.max(0, v3s.index - 40), v3s.index);
        let name = 'Offset';
        if (/abs\s*\(\s*\w+\s*\)\s*-\s*$/.test(beforeText)) name = 'FoldOffset';

        const bounds = suggestBounds(val, 'fold offset');
        results.push({
            id: makeId(),
            name: uniqueName(name),
            type: 'float',
            originalText: fullText,
            defaultValue: val,
            context: `vec3(${v3s[1]})`,
            occurrences: allOccs,
            suggestedMin: bounds.min,
            suggestedMax: bounds.max,
            suggestedStep: 0.001,
            colorClass: 'dv-vec',
        });
        for (const o of allOccs) claimRange(o.from, o.to);
    }

    // --- 4b. Vec2 constructors with all-literal args: vec2(x, y) ---
    const vec2Re = new RegExp(`vec2\\s*\\(\\s*(${FLOAT_LIT})\\s*,\\s*(${FLOAT_LIT})\\s*\\)`, 'g');
    let v2m;
    while ((v2m = vec2Re.exec(source)) !== null) {
        if (isInComment(v2m.index, comments)) continue;
        const x = parseFloat(stripF(v2m[1])), y = parseFloat(stripF(v2m[2]));
        if (isNaN(x) || isNaN(y)) continue;
        // Skip only if all values are 0 or 1 (the truly trivial ones)
        if ([x, y].every(v => v === 0 || v === 1 || v === -1)) continue;
        const fullText = v2m[0];
        const occ = { from: v2m.index, to: v2m.index + fullText.length };
        if (isClaimed(occ.from, occ.to)) continue;

        // Skip vec2(sin(...), cos(...)) — these are derived, not literal
        if (/\b(?:sin|cos|tan|sqrt|abs|dot|length|normalize)\s*\(/.test(fullText)) continue;

        const allOccs = findOccurrences(source, fullText, comments).filter(o => !isClaimed(o.from, o.to));
        if (allOccs.length === 0) continue;

        // Guess name from context
        const beforeText = source.slice(Math.max(0, v2m.index - 40), v2m.index);
        let name = 'Vec2Param';
        if (/[+-]=\s*$/.test(beforeText)) name = 'Offset2D';

        const avg = (x + y) / 2;
        const bounds = suggestBounds(avg, 'vec2 parameter');
        results.push({
            id: makeId(),
            name: uniqueName(name),
            type: 'vec2',
            originalText: fullText,
            defaultValue: [x, y],
            context: `vec2(${stripF(v2m[1])}, ${stripF(v2m[2])})`,
            occurrences: allOccs,
            suggestedMin: Math.min(bounds.min, ...[x, y].map(v => v * -2)),
            suggestedMax: Math.max(bounds.max, ...[x, y].map(v => v * 3)),
            suggestedStep: 0.001,
            colorClass: 'dv-vec',
        });
        for (const o of allOccs) claimRange(o.from, o.to);
    }

    // --- 5. Scale factors: p *= LITERAL, p = p * LITERAL, p = LITERAL * p ---
    const scalePatterns = [
        new RegExp(`(\\w+)\\s*\\*=\\s*(${FLOAT_LIT})\\s*;`, 'g'),
        new RegExp(`(\\w+)\\s*=\\s*\\1\\s*\\*\\s*(${FLOAT_LIT})`, 'g'),
        new RegExp(`(\\w+)\\s*=\\s*(${FLOAT_LIT})\\s*\\*\\s*\\1`, 'g'),
    ];
    for (const pat of scalePatterns) {
        let sm;
        while ((sm = pat.exec(source)) !== null) {
            if (isInComment(sm.index, comments)) continue;
            const literal = sm[2];
            if (SKIP_LITERALS.has(stripF(literal))) continue;
            const val = parseFloat(stripF(literal));
            if (isNaN(val) || val === 0 || val === 1) continue;

            // Find the literal position within the match
            const litIdx = source.indexOf(literal, sm.index + sm[1].length);
            if (litIdx < 0) continue;
            const occ = { from: litIdx, to: litIdx + literal.length };
            if (isClaimed(occ.from, occ.to)) continue;

            const allOccs = findOccurrences(source, literal, comments).filter(o => !isClaimed(o.from, o.to));
            if (allOccs.length === 0) continue;

            const bounds = suggestBounds(val, 'scale factor');
            results.push({
                id: makeId(),
                name: uniqueName('Scale'),
                type: 'float',
                originalText: literal,
                defaultValue: val,
                context: `scale factor (${literal})`,
                occurrences: allOccs,
                suggestedMin: bounds.min,
                suggestedMax: bounds.max,
                suggestedStep: bounds.step,
                colorClass: 'dv-scale',
            });
            for (const o of allOccs) claimRange(o.from, o.to);
            break; // only first scale per pattern
        }
    }

    // --- 6. Rotation angles: sin(X), cos(X), mat2(cos(X), ...) ---
    const rotPatterns = [
        new RegExp(`mat2\\s*\\(\\s*cos\\s*\\(\\s*(${FLOAT_LIT})\\s*\\)`, 'g'),
        new RegExp(`(?:sin|cos)\\s*\\(\\s*(${FLOAT_LIT})\\s*\\)`, 'g'),
    ];
    const seenAngles = new Set<string>();
    for (const pat of rotPatterns) {
        let rm;
        while ((rm = pat.exec(source)) !== null) {
            if (isInComment(rm.index, comments)) continue;
            const literal = rm[1];
            const cleanLit = stripF(literal);
            if (SKIP_LITERALS.has(cleanLit) || seenAngles.has(cleanLit)) continue;
            seenAngles.add(cleanLit);
            const val = parseFloat(cleanLit);
            if (isNaN(val)) continue;

            const litIdx = source.indexOf(literal, rm.index);
            if (litIdx < 0) continue;
            const occ = { from: litIdx, to: litIdx + literal.length };
            if (isClaimed(occ.from, occ.to)) continue;

            const allOccs = findOccurrences(source, literal, comments).filter(o => !isClaimed(o.from, o.to));
            if (allOccs.length === 0) continue;

            const bounds = suggestBounds(val, 'rotation angle');
            results.push({
                id: makeId(),
                name: uniqueName('RotAngle'),
                type: 'float',
                originalText: literal,
                defaultValue: val,
                context: `rotation angle (${literal})`,
                occurrences: allOccs,
                suggestedMin: bounds.min,
                suggestedMax: bounds.max,
                suggestedStep: bounds.step,
                colorClass: 'dv-rot',
            });
            for (const o of allOccs) claimRange(o.from, o.to);
        }
    }

    // --- 7. Clamp bounds: clamp(x, -X, X) where both bounds match ---
    const clampRe = new RegExp(`clamp\\s*\\(\\s*\\w+(?:\\.\\w+)?\\s*,\\s*-(${FLOAT_LIT})\\s*,\\s*(${FLOAT_LIT})\\s*\\)`, 'g');
    let cm;
    while ((cm = clampRe.exec(source)) !== null) {
        if (isInComment(cm.index, comments)) continue;
        if (stripF(cm[1]) !== stripF(cm[2])) continue; // asymmetric clamp, skip
        const literal = cm[2];
        if (SKIP_LITERALS.has(stripF(literal))) continue;
        const val = parseFloat(stripF(literal));
        if (isNaN(val) || val === 1) continue;

        // Find the second literal (the positive one)
        const secondLitIdx = source.indexOf(cm[2], cm.index + cm[0].lastIndexOf(cm[2]));
        if (secondLitIdx < 0) continue;
        const occ = { from: secondLitIdx, to: secondLitIdx + literal.length };
        if (isClaimed(occ.from, occ.to)) continue;

        const bounds = suggestBounds(val, 'clamp/fold limit');
        results.push({
            id: makeId(),
            name: uniqueName('FoldLimit'),
            type: 'float',
            originalText: literal,
            defaultValue: val,
            context: `clamp limit (±${literal})`,
            occurrences: [occ],
            suggestedMin: bounds.min,
            suggestedMax: bounds.max,
            suggestedStep: bounds.step,
            colorClass: 'dv-clamp',
        });
        claimRange(occ.from, occ.to);
    }

    // --- 8. Sphere fold: x /= clamp(dot(x,x), MIN, ...) ---
    const sphereRe = new RegExp(`\\/=?\\s*clamp\\s*\\(\\s*(?:dot\\s*\\(\\s*\\w+\\s*,\\s*\\w+\\s*\\)|\\w+)\\s*,\\s*(${FLOAT_LIT})\\s*,\\s*(${FLOAT_LIT})\\s*\\)`, 'g');
    let sfm;
    while ((sfm = sphereRe.exec(source)) !== null) {
        if (isInComment(sfm.index, comments)) continue;
        const literal = sfm[1];
        if (SKIP_LITERALS.has(stripF(literal))) continue;
        const val = parseFloat(stripF(literal));
        if (isNaN(val)) continue;

        const litIdx = source.indexOf(literal, sfm.index);
        if (litIdx < 0) continue;
        const occ = { from: litIdx, to: litIdx + literal.length };
        if (isClaimed(occ.from, occ.to)) continue;

        const bounds = suggestBounds(val, 'sphere fold radius');
        results.push({
            id: makeId(),
            name: uniqueName('MinRad2'),
            type: 'float',
            originalText: literal,
            defaultValue: val,
            context: `sphere fold min radius² (${literal})`,
            occurrences: [occ],
            suggestedMin: bounds.min,
            suggestedMax: bounds.max,
            suggestedStep: bounds.step,
            colorClass: 'dv-sphere',
        });
        claimRange(occ.from, occ.to);
    }

    // --- 9. Remaining magic numbers (standalone float/int literals in expressions) ---
    // Only match numbers that appear in operator context (=, +, -, *, /, <, >, etc.)
    // Lookbehind: operator context but NOT after ) or digit (prevents )-5. false positives)
    // Negative sign only allowed after =, (, , or whitespace (assignment/arg context), not after )/digit (subtraction)
    const magicRe = /(?<=[=,(\s])(-(?:\d+\.\d*|\.\d+|\d{2,})(?:[eE][+-]?\d+)?f?)(?=[)\s;,+\-*/<>])|(?<=[=+\-*/<>,(\s])((?:\d+\.\d*|\.\d+|\d{2,})(?:[eE][+-]?\d+)?f?)(?=[)\s;,+\-*/<>])/g;
    let mm;
    while ((mm = magicRe.exec(source)) !== null) {
        if (isInComment(mm.index, comments)) continue;
        const literal = mm[1] || mm[2]; // two alternation groups
        const cleanLit = stripF(literal);
        if (SKIP_LITERALS.has(cleanLit)) continue;
        const val = parseFloat(cleanLit);
        if (isNaN(val)) continue;
        // Skip if already part of a uniform declaration line or preprocessor
        const lineStart = source.lastIndexOf('\n', mm.index) + 1;
        const line = source.slice(lineStart, source.indexOf('\n', mm.index));
        if (/^\s*uniform\b/.test(line)) continue;
        if (/^\s*#/.test(line)) continue;

        const occ = { from: mm.index, to: mm.index + literal.length };
        if (isClaimed(occ.from, occ.to)) continue;

        // Detect if this integer literal is a loop bound (iteration count)
        // e.g. the "8" in "i < 8" or "n < 8" within a for/while
        let isIterCount = false;
        if (Number.isInteger(val) && val > 1 && val < 1000) {
            // Check if preceded by "< " pattern on the same line (loop condition)
            const beforeOnLine = source.slice(lineStart, mm.index);
            if (/\w+\s*<\s*$/.test(beforeOnLine)) {
                // Verify this line is part of a for/while loop
                if (/^\s*(?:for|while)\s*\(/.test(line) || /;\s*\w+\s*<\s*$/.test(beforeOnLine)) {
                    isIterCount = true;
                }
            }
        }

        // Check for more occurrences of this exact value
        const allOccs = findOccurrences(source, literal, comments).filter(o => !isClaimed(o.from, o.to));
        if (allOccs.length === 0) continue;

        if (isIterCount) {
            const bounds = suggestBounds(val, 'iteration count');
            results.push({
                id: makeId(),
                name: uniqueName('Iterations'),
                type: 'int',
                originalText: literal,
                defaultValue: val,
                context: 'iteration count',
                occurrences: [occ], // only promote the loop bound occurrence
                suggestedMin: bounds.min,
                suggestedMax: bounds.max,
                suggestedStep: bounds.step,
                colorClass: 'dv-iter',
            });
            claimRange(occ.from, occ.to);
        } else {
            const bounds = suggestBounds(val, 'magic number');
            const name = uniqueName('Param');
            results.push({
                id: makeId(),
                name,
                type: Number.isInteger(val) && !literal.includes('.') ? 'int' : 'float',
                originalText: literal,
                defaultValue: val,
                context: `magic number (${literal})`,
                occurrences: allOccs,
                suggestedMin: bounds.min,
                suggestedMax: bounds.max,
                suggestedStep: bounds.step,
                colorClass: 'dv-magic',
            });
            for (const o of allOccs) claimRange(o.from, o.to);
        }
    }

    return results;
}

// ============================================================================
// Promotion — replace a detected variable with a uniform
// ============================================================================

function sliderAnnotation(v: DetectedVariable): string {
    if (v.type === 'int') {
        return `slider[${v.suggestedMin},${v.defaultValue},${v.suggestedMax}]`;
    }
    if (v.type === 'vec3') {
        const def = v.defaultValue as number[];
        return `slider[(${v.suggestedMin},${v.suggestedMin},${v.suggestedMin}),(${def[0]},${def[1]},${def[2]}),(${v.suggestedMax},${v.suggestedMax},${v.suggestedMax})]`;
    }
    if (v.type === 'vec2') {
        const def = v.defaultValue as number[];
        return `slider[(${v.suggestedMin},${v.suggestedMin}),(${def[0]},${def[1]}),(${v.suggestedMax},${v.suggestedMax})]`;
    }
    return `slider[${v.suggestedMin},${v.defaultValue},${v.suggestedMax}]`;
}

/**
 * Promote a detected variable to a uniform declaration.
 * Returns the modified source with:
 * - All occurrences replaced with the uniform name
 * - A uniform declaration + slider annotation added at the top
 * - For #define / local var declarations: the line is removed
 */
export function promoteVariable(source: string, variable: DetectedVariable): string {
    const uniformName = variable.name;
    const typeStr = variable.type;
    const isLocalVar = variable.colorClass === 'dv-local';

    // Sort occurrences by position (descending) so replacements don't shift indices
    const sorted = [...variable.occurrences].sort((a, b) => b.from - a.from);

    let result = source;
    for (const occ of sorted) {
        const before = result.slice(0, occ.from);
        const after = result.slice(occ.to);
        const matchedText = result.slice(occ.from, occ.to);

        // If this is a #define line, remove the whole line
        if (matchedText.startsWith('#define') || /^[ \t]*#define/.test(matchedText)) {
            result = before + after;
            // Remove trailing newline if the #define was on its own line
            if (result[before.length] === '\n') {
                result = before + result.slice(before.length + 1);
            }
        }
        // If this is a local variable declaration (first occurrence for dv-local),
        // remove the entire declaration line
        else if (isLocalVar && /^\s*(?:const\s+)?(?:float|int|vec[234])\s+\w+\s*=/.test(matchedText)) {
            result = before + after;
            // Remove trailing newline
            if (result[before.length] === '\n') {
                result = before + result.slice(before.length + 1);
            }
        } else {
            result = before + uniformName + after;
        }
    }

    // After replacing variable references with the uniform name,
    // strip 'const' from any declarations that now reference the uniform
    // (GLSL doesn't allow uniforms in const initializers)
    const constFixRe = new RegExp(`^(\\s*)const\\s+((?:float|int|vec[234]|mat[234])\\s+\\w+\\s*=\\s*[^;]*\\b${uniformName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'gm');
    result = result.replace(constFixRe, '$1$2');

    // Add uniform declaration at the top (after any existing uniforms or at line 1)
    const uniformDecl = `uniform ${typeStr} ${uniformName};  ${sliderAnnotation(variable)}`;

    // Find a good insertion point — after last existing uniform line, or at top
    const lines = result.split('\n');
    let insertIdx = 0;
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*uniform\s+/.test(lines[i])) {
            insertIdx = i + 1;
        }
    }
    // If no uniforms found, insert after any leading comments
    if (insertIdx === 0) {
        for (let i = 0; i < lines.length; i++) {
            if (/^\s*\/\//.test(lines[i]) || /^\s*\/\*/.test(lines[i]) || lines[i].trim() === '') {
                insertIdx = i + 1;
            } else {
                break;
            }
        }
    }

    lines.splice(insertIdx, 0, uniformDecl);
    return lines.join('\n');
}
