/**
 * V3 Pattern detection and transformation.
 *
 * Consolidates three V2 modules:
 *   - loop-extractor.ts   (orbit trap vec4→float normalization)
 *   - pattern-detector.ts (max-accumulator / NewMenger pattern)
 *   - code-generator.ts   (vec4 tracker detection, swizzle normalization — inline code)
 */

// ============================================================================
// Helpers
// ============================================================================

/** Split a string on a delimiter, but only when not inside parentheses. */
function splitOutsideParens(s: string, delimiter: string): string[] {
    const parts: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') depth--;
        else if (s[i] === delimiter && depth === 0) {
            parts.push(s.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(s.slice(start));
    return parts;
}

// ============================================================================
// GLSL ES 3.0 int/float compatibility
// ============================================================================

/**
 * Fix bare integer literals in float arithmetic contexts for GLSL ES 3.0.
 *
 * Fragmentarium targets ES 1.0 (desktop GLSL 1.30) which allows implicit
 * int→float conversion. ES 3.0 (WebGL2) does NOT — `1-r*r` is a type error
 * because `1` is `const int` and `r*r` is `float`.
 *
 * This pass adds `.0` to integer literals that appear in float arithmetic:
 *   `sa*(1-r*r)` → `sa*(1.0-r*r)`
 *   `2*max(0.,x)` → `2.0*max(0.,x)`
 *
 * Skips: array subscripts `[N]`, loop counters `int i=0; i<N`, vec constructors,
 * and integers already followed by `.`.
 */
export function fixIntFloatArithmetic(code: string): string {
    // Pass 1: integers immediately before arithmetic with float-likely operands
    // `(N-`, `(N*`, `(N/`, `(N+` where N is bare int not followed by `.`
    // Also: ` N*`, `=N*`, `,N*` etc.
    // Skip integers inside explicit type casts like float(...) or int(...) —
    // the cast already handles conversion.
    let result = code.replace(
        /(?<=[=,(+\-*/ \t])(\d+)(?=\s*[+\-*/]\s*[a-zA-Z_(])/g,
        (match, _num, offset) => {
            // Check if this integer is inside a type cast: float(N ...) or int(N ...)
            const before = code.slice(Math.max(0, offset - 10), offset);
            if (/(?:float|int)\s*\(\s*$/.test(before)) return match;
            return match + '.';
        }
    );

    // Pass 2: integers immediately after arithmetic from float-likely operands
    // `x*N)`, `x+N;`, `x-N,` where N is bare int
    // Excludes scientific notation: `1.0e-9` should NOT become `1.0e-9.`
    result = result.replace(
        /(?<=[a-zA-Z_).])\s*([+\-*/])\s*(\d+)(?=[);,\s+\-*/])/g,
        (match, _op, num, offset) => {
            // Check the number doesn't already have a decimal point (from Pass 1)
            if (match.includes('.')) return match;
            // Skip scientific notation exponents: e-9, E+3, etc.
            // The lookbehind matched [a-zA-Z_.)] — if it was 'e'/'E', this is an exponent
            if (offset > 0 && /[eE]/.test(result[offset - 1])) return match;
            return match.replace(new RegExp(`${num}$`), `${num}.`);
        }
    );

    // Don't apply to lines that are clearly integer-only contexts
    // Revert changes inside for() loop headers and array subscripts
    // This is handled implicitly: for(int i=0; i<N; i++) — the `0` after `=`
    // and `N` after `<` are followed by `;` or `)` not by float identifiers,
    // so the lookbehind/lookahead patterns above won't match them.

    return result;
}

// ============================================================================
// Orbit trap normalization
// ============================================================================

/**
 * Transform Fragmentarium `orbitTrap = min(orbitTrap, vec4/abs(...))` patterns
 * to GMT's float-trap `trap = min(trap, length(...))`.
 */
export function transformTrapMin(loopBody: string): string {
    const inner = `(?:[^()]|\\([^()]*\\))*`;

    // Pattern A: trap = min(trap, abs(vec{234}(INNER)))
    loopBody = loopBody.replace(
        new RegExp(`trap\\s*=\\s*min\\s*\\(\\s*trap\\s*,\\s*abs\\s*\\(\\s*(vec[234]\\s*\\(${inner}\\))\\s*\\)\\s*\\)`, 'g'),
        (_m, v) => `trap = min(trap, length(${v}))`
    );
    // Pattern B: trap = min(trap, (vec{234}(INNER)))
    loopBody = loopBody.replace(
        new RegExp(`trap\\s*=\\s*min\\s*\\(\\s*trap\\s*,\\s*\\(\\s*(vec[234]\\s*\\(${inner}\\))\\s*\\)\\s*\\)`, 'g'),
        (_m, v) => `trap = min(trap, length(${v}))`
    );
    // Pattern C: trap = min(trap, vec{234}(INNER))
    loopBody = loopBody.replace(
        new RegExp(`trap\\s*=\\s*min\\s*\\(\\s*trap\\s*,\\s*(vec[234]\\s*\\(${inner}\\))\\s*\\)`, 'g'),
        (_m, v) => `trap = min(trap, length(${v}))`
    );
    // Pattern D: trap = min(trap, abs(EXPR)) where EXPR is a vector
    loopBody = loopBody.replace(
        /trap\s*=\s*min\s*\(\s*trap\s*,\s*abs\s*\(([^)]+)\)\s*\)/g,
        (_m, expr) => {
            if (/\.xyz|\.xyzw|\bf_z\b/.test(expr)) {
                return `trap = min(trap, length(abs(${expr})))`;
            }
            return _m;
        }
    );

    return loopBody;
}

// ============================================================================
// Non-monotonic swizzle write expansion
// ============================================================================

/**
 * Expand non-monotonic swizzle write assignments that ANGLE/WebGL rejects.
 * E.g., `v.zy = expr;` → `{ vec2 _swzy = expr; v.z = _swzy.x; v.y = _swzy.y; }`
 */
export function expandSwizzleWrites(code: string): string {
    const COMP_IDX: Record<string, number> = { x: 0, y: 1, z: 2, w: 3 };
    const COMP_NAMES = ['x', 'y', 'z', 'w'];
    return code.replace(
        /\b(\w+)\.([xyzw]{2,4})\s*=\s*([^;{}\n]+);/g,
        (match, varName: string, swizzle: string, rhs: string) => {
            const comps = swizzle.split('');
            const indices = comps.map(c => COMP_IDX[c]);
            const isMonotonic = indices.every((idx, i) => i === 0 || idx > indices[i - 1]);
            if (isMonotonic) return match;
            const n = comps.length;
            const vecType = n === 2 ? 'vec2' : n === 3 ? 'vec3' : 'vec4';
            const tmpVar = `_sw${swizzle}`;
            const parts = [`${vecType} ${tmpVar} = ${rhs.trim()}`];
            comps.forEach((c, i) => parts.push(`${varName}.${c} = ${tmpVar}.${COMP_NAMES[i]}`));
            return `{ ${parts.join('; ')}; }`;
        }
    );
}

// ============================================================================
// Vec4 tracker detection
// ============================================================================

export interface Vec4TrackerResult {
    /** Name of the vec4 variable tracking position + DR product. Null if none found. */
    trackerVar: string | null;
    /** Whether the tracker is a split declaration (Pattern B/C) vs inline (Pattern A). */
    isSplit: boolean;
}

/**
 * Detect a vec4 position tracker variable in pre-loop declarations.
 * Only treats as DR tracker if initial w-component >= 0.5 (avoids quaternion false positives).
 *
 * Pattern A: `vec4 p = vec4(f_z, 1.0)` — inline declaration
 * Pattern B: `p = vec4(f_z, 1.0)` — assignment to pre-declared var
 * Pattern C: `p.xyz = f_z;` — component assignment
 */
export function detectVec4Tracker(preLoopDecls: string): Vec4TrackerResult {
    // Pattern A: vec4 p = vec4(f_z, W)
    const matchA = preLoopDecls.match(/\bvec4\s+(\w+)\s*=\s*vec4\s*\(\s*f_z\s*,\s*([\d.eE+-]+)\s*\)/);
    if (matchA && parseFloat(matchA[2]) >= 0.5) {
        return { trackerVar: matchA[1], isSplit: false };
    }

    // Pattern B: p = vec4(f_z, W) (no type keyword)
    const matchB = preLoopDecls.match(/\b(\w+)\s*=\s*vec4\s*\(\s*f_z\s*,\s*([\d.eE+-]+)\s*\)/);
    if (matchB && parseFloat(matchB[2]) >= 0.5) {
        return { trackerVar: matchB[1], isSplit: true };
    }

    // Pattern C: p.xyz = f_z;
    const matchC = preLoopDecls.match(/\b(\w+)\.xyz\s*=\s*f_z\s*;/);
    if (matchC) {
        return { trackerVar: matchC[1], isSplit: true };
    }

    return { trackerVar: null, isSplit: false };
}

/**
 * Patch vec4 tracker w-initialization to use `dr` instead of literal 1.0.
 * Also fixes p0 anchor pattern (p0 = tracker → p0 = vec4(c.xyz, 1.0)).
 */
export function patchVec4Tracker(
    preLoopDecls: string,
    loopBody: string,
    trackerVar: string,
): { preLoopDecls: string; loopBody: string } {
    const fixWInit = (s: string) => s
        .replace(
            new RegExp(`\\b${trackerVar}\\s*=\\s*vec4\\s*\\(\\s*f_z\\s*,\\s*[\\d.]+\\s*\\)`, 'g'),
            `${trackerVar} = vec4(f_z, dr)`
        )
        .replace(
            new RegExp(`\\b${trackerVar}\\.w\\s*=\\s*[\\d.]+\\s*;`, 'g'),
            `${trackerVar}.w = dr;`
        );

    preLoopDecls = fixWInit(preLoopDecls);
    loopBody = fixWInit(loopBody);

    // Fix p0 = tracker anchor → vec4(c.xyz, 1.0)
    preLoopDecls = preLoopDecls.replace(
        new RegExp(`\\b(vec4\\s+)?(\\w+)\\s*=\\s*${trackerVar}\\b(?=\\s*[,;])`, 'g'),
        (match, typePrefix, varName) => {
            if (varName === trackerVar) return match;
            return `${typePrefix ?? ''}${varName} = vec4(c.xyz, 1.0)`;
        }
    );

    return { preLoopDecls, loopBody };
}

// ============================================================================
// Vec3 working variable detection
// ============================================================================

/**
 * Detect a vec3 working variable: `vec3 p = f_z`.
 * Returns the variable name, or null if none found.
 */
export function detectVec3WorkingVar(preLoopDecls: string): string | null {
    const match = preLoopDecls.match(/\bvec3\s+(\w+)\s*=\s*f_z\b/);
    if (match && match[1] !== 'f_z') {
        return match[1];
    }
    return null;
}

/**
 * Fix vec3 anchor pattern: `p0 = workingVar` → `p0 = c.xyz`.
 */
export function patchVec3Anchor(preLoopDecls: string, workingVar: string): string {
    return preLoopDecls.replace(
        new RegExp(`\\b(vec3\\s+)?(\\w+)\\s*=\\s*${workingVar}\\b(?=\\s*[,;])`, 'g'),
        (match, typePrefix, varName) => {
            if (varName === workingVar) return match;
            return `${typePrefix ?? ''}${varName} = c.xyz`;
        }
    );
}

// ============================================================================
// Scalar DR accumulator detection
// ============================================================================

export interface ScalarDRResult {
    /** The local variable that tracks derivative (e.g. `s`, `scale`). Null if none found. */
    drVar: string | null;
    /** Initial value expression (e.g. `1.0`, `2.`). */
    initExpr: string | null;
}

/**
 * Detect a local scalar float that must persist across per-iteration calls.
 *
 * Covers three accumulation patterns:
 *   1. Multiplicative DR: `float s = 1.0; ... s *= k; ... return length(p)/s;`
 *   2. Min-distance:      `float d = 1e5; ... d = min(d, expr); ... return d;`
 *   3. Additive:          `float e = 0.0; ... e += expr; ... return e;`
 *
 * When found, this variable is mapped to `dr` so the engine tracks it
 * across per-iteration calls.
 */
export function detectScalarDRAccumulator(
    preLoopDecls: string,
    loopBody: string,
    distanceExpression: string | null,
): ScalarDRResult {
    if (!distanceExpression) return { drVar: null, initExpr: null };

    // Find all float declarations in pre-loop, including comma-separated:
    //   `float s = 1.0;`  and  `float e=1., s=2.;`
    const candidates: Array<{ varName: string; initExpr: string }> = [];

    // Extract initialization expressions respecting nested parentheses.
    // Split pre-loop declarations by semicolons, then parse each statement.
    for (const stmt of preLoopDecls.split(';')) {
        const s = stmt.trim();
        if (!s) continue;
        // Match float declarations: `float VAR = EXPR` (possibly comma-separated)
        const floatMatch = s.match(/^\s*float\s+(.+)/);
        if (!floatMatch) continue;
        // Split on commas that aren't inside parentheses
        const declPart = floatMatch[1];
        const parts = splitOutsideParens(declPart, ',');
        for (const part of parts) {
            const m = part.trim().match(/^(\w+)\s*=\s*([\s\S]+)/);
            if (m) candidates.push({ varName: m[1], initExpr: m[2].trim() });
        }
    }

    for (const { varName, initExpr } of candidates) {
        // Must appear in distance expression
        if (!new RegExp(`\\b${varName}\\b`).test(distanceExpression)) continue;

        // Avoid matching the position magnitude variable (length assigns)
        if (new RegExp(`\\b${varName}\\s*=\\s*length\\s*\\(`).test(loopBody)) continue;

        // Check for any accumulation pattern in the loop body:
        //   *= (multiplicative), /= (inverse), += (additive),
        //   var = min(var, ...), var = max(var, ...),
        //   var = var * expr, var = expr * var
        const hasMulAssign = new RegExp(`\\b${varName}\\s*\\*=`).test(loopBody);
        const hasDivAssign = new RegExp(`\\b${varName}\\s*\\/=`).test(loopBody);
        const hasAddAssign = new RegExp(`\\b${varName}\\s*\\+=`).test(loopBody);
        const hasSelfMul = new RegExp(`\\b${varName}\\s*=\\s*${varName}\\s*\\*`).test(loopBody)
            || new RegExp(`\\b${varName}\\s*=\\s*[^;]*\\*\\s*${varName}\\b`).test(loopBody);
        const hasMinAccum = new RegExp(`\\b${varName}\\s*=\\s*min\\s*\\(\\s*${varName}\\b`).test(loopBody);
        const hasMaxAccum = new RegExp(`\\b${varName}\\s*=\\s*max\\s*\\(\\s*${varName}\\b`).test(loopBody);

        if (!hasMulAssign && !hasDivAssign && !hasAddAssign && !hasSelfMul && !hasMinAccum && !hasMaxAccum) continue;

        return { drVar: varName, initExpr };
    }

    return { drVar: null, initExpr: null };
}

// ============================================================================
// Max-accumulator pattern (NewMenger-style)
// ============================================================================

export interface AccumulatorResult {
    isAccumulator: boolean;
    loopInit?: string;
    newPreLoopDecls?: string;
    newLoopBody?: string;
}

/**
 * Detect max-accumulator pattern: `dist = max(dist, ...)` with scale tracking.
 */
export function detectAccumulatorPattern(opts: {
    distVar: string;
    preLoopDecls: string;
    loopBody: string;
}): AccumulatorResult {
    const { distVar, preLoopDecls, loopBody } = opts;

    if (!/^[a-zA-Z_]\w*$/.test(distVar)) return { isAccumulator: false };

    const maxAccumRx = new RegExp(`\\b${distVar}\\s*=\\s*max\\s*\\(\\s*${distVar}\\b`);
    if (!maxAccumRx.test(loopBody)) return { isAccumulator: false };

    const distDeclRx = new RegExp(`float\\s+${distVar}\\s*=\\s*([^;]+);`);
    if (!distDeclRx.test(preLoopDecls)) return { isAccumulator: false };

    // Detect scale variable (float s = 1.0; ... s *= ...)
    let scaleVar: string | null = null;
    const scaleInitMatch = preLoopDecls.match(/float\s+(\w+)\s*=\s*1(?:\.0*)?\s*;/);
    if (scaleInitMatch) {
        const candidate = scaleInitMatch[1];
        if (candidate !== distVar && new RegExp(`\\b${candidate}\\s*\\*=`).test(loopBody)) {
            scaleVar = candidate;
        }
    }

    const stmts = preLoopDecls.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const loopInitLines: string[] = [];
    const bareDecls: string[] = [];

    for (const stmt of stmts) {
        if (/^f_z\s*=/.test(stmt)) {
            loopInitLines.push(stmt.replace(/\bf_z\b/g, 'z.xyz') + ';');
            continue;
        }
        if (new RegExp(`^float\\s+${distVar}\\s*=`).test(stmt)) {
            const expr = stmt.replace(new RegExp(`^float\\s+${distVar}\\s*=\\s*`), '');
            loopInitLines.push(`dr = ${expr};`);
            continue;
        }
        if (scaleVar && new RegExp(`^float\\s+${scaleVar}\\s*=`).test(stmt)) {
            const expr = stmt.replace(new RegExp(`^float\\s+${scaleVar}\\s*=\\s*`), '');
            loopInitLines.push(`z.w = ${expr};`);
            continue;
        }
        const declMatch = stmt.match(/^(\w+)\s+(\w+)\s*=/);
        if (declMatch) {
            loopInitLines.push(stmt + ';');
            const [, typeStr, varName] = declMatch;
            if (new RegExp(`\\b${varName}\\b`).test(loopBody)) {
                bareDecls.push(typeStr === 'int' ? `${stmt};` : `${typeStr} ${varName};`);
            }
            continue;
        }
        const bareDeclMatch = stmt.match(/^(\w+)\s+(\w+)\s*$/);
        if (bareDeclMatch) {
            const [, typeStr, varName] = bareDeclMatch;
            if (new RegExp(`\\b${varName}\\b`).test(loopBody)) {
                bareDecls.push(`${typeStr} ${varName};`);
            }
            continue;
        }
        loopInitLines.push(stmt + ';');
    }

    const loopInitStr = loopInitLines.join('\n').replace(/\bf_z\b/g, 'z.xyz');
    let newLoopBody = loopBody.replace(new RegExp(`\\b${distVar}\\b`, 'g'), 'dr');
    if (scaleVar) {
        newLoopBody = newLoopBody.replace(new RegExp(`\\b${scaleVar}\\b`, 'g'), 'z.w');
    }

    return {
        isAccumulator: true,
        loopInit: loopInitStr,
        newPreLoopDecls: bareDecls.join('\n'),
        newLoopBody,
    };
}
