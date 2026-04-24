/**
 * V4 Stage 4 — Per-iteration emitter (alternative to self-contained).
 *
 * Canonical plan: docs/26_Formula_Workshop_V4_Plan.md §0.1 (1).
 *
 * Responsibility: when the selected DE function has a "loop of operations on
 * a position tracker" shape, rewrite it as the engine's native per-iteration
 * model:
 *
 *   void formula_X(inout vec4 z, inout float dr, inout float trap, vec4 c) {
 *       // ONE outer-iteration's worth of work — engine drives the outer loop
 *   }
 *
 * Unlike self-contained, per-iteration emissions compose with the engine's
 * feature system: interlace rewriting, hybrid box/sphere fold injection,
 * burning ship, pre/post rotation. That's the whole reason to have this path.
 *
 * Dispatcher contract (see emit/index.ts):
 *   - returns `null`        — formula is NOT per-iter eligible (no loop, or a
 *                             structural disqualifier). Fall back to
 *                             self-contained emission.
 *   - returns `ok: false`   — formula was eligible but conversion failed.
 *                             Fall back to self-contained emission.
 *   - returns `ok: true`    — per-iter emission succeeded; use this.
 *
 * The per-iter path is deliberately CONSERVATIVE. V3 tried to force every
 * formula into per-iter mode and used seven regex bailouts to rescue the
 * ones that couldn't be forced. V4 inverts that: only take per-iter if the
 * structural shape fits cleanly, otherwise use self-contained (which always
 * works, just without engine-feature composability).
 *
 * Known supported structural shapes (mirrors the "clean" subset V3 handled):
 *   - vec4 position tracker (Mandelbox-style `vec4 p = vec4(pos, 1), p0 = p;`)
 *   - vec3 working variable (`vec3 p = pos;` with scalar-dr accumulator)
 *   - max/min accumulator (NewMenger-style)
 *
 * Disqualifiers — fall through to self-contained:
 *   - No loop at all (delta-DE, single-evaluation formulas)
 *   - Pre-loop early return of a value (`if (cond) return expr;` before the loop)
 *   - Pre/post-loop position mutations (would run every iter instead of once)
 *   - Counter-dependent logic beyond the standard `if (i < ColorIterations)`
 *   - Unbounded vec4 inversion (`/dot(p, p)` without clamp — NaN-prone per-iter)
 */

import type { FractalDefinition } from '../../../../types/fractal';
import type { FormulaAnalysis, GeneratedFormula, Result, DeFunction } from '../types';
import { assignSlots } from './slots';
import { buildRenameMap, applyRenames } from './rename';
import { sanitizeId } from './wrapper';
import { buildFractalParams } from '../../workshop/param-builder';
import type { WorkshopParam } from '../../types';
import {
    detectVec4Tracker, patchVec4Tracker,
    detectVec3WorkingVar, patchVec3Anchor,
    detectScalarDRAccumulator,
    detectAccumulatorPattern,
    fixIntFloatArithmetic,
    transformTrapMin,
    expandSwizzleWrites,
} from '../../v3/generate/patterns';

// ─── Part extraction ────────────────────────────────────────────────────────

interface LoopInfo {
    /** 'for' | 'while' */
    kind: 'for' | 'while';
    /** Full header text, e.g. "for (int i = 0; i < Iterations; i++)" */
    header: string;
    /** For-loop init clause, e.g. "int i = 0" — null for while. */
    init: string | null;
    /** Condition clause text. */
    condition: string;
    /** Increment clause text, e.g. "i++" — null for while. */
    increment: string | null;
    /** Counter variable name (e.g. 'i'), if parseable. */
    counterVar: string | null;
    /** Inner body with braces stripped. */
    body: string;
    /** Offset into de-inner-body where the loop starts. */
    loopStart: number;
    /** Offset into de-inner-body just after the loop's closing brace. */
    loopEnd: number;
}

interface DEParts {
    /** Position parameter name (e.g. 'pos', 'p'). */
    posName: string;
    /** Inner body text (outer function braces stripped). */
    innerBody: string;
    /** Text before the loop. */
    preLoop: string;
    /** Loop structural info. */
    loop: LoopInfo;
    /** Text between the loop close and the return statement. */
    postLoop: string;
    /** The value returned (without the `return` keyword or trailing `;`). */
    returnExpr: string;
}

/** Strip one level of outer braces from a string (function body). */
function stripOuterBraces(s: string): string {
    const t = s.trim();
    if (t.startsWith('{') && t.endsWith('}')) return t.slice(1, -1);
    return t;
}

/** Find the offset of the matching close brace for an open brace at `openIdx`. */
function matchBrace(s: string, openIdx: number): number {
    if (s[openIdx] !== '{') return -1;
    let depth = 1;
    for (let i = openIdx + 1; i < s.length; i++) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

/** Find the offset of the matching close paren for an open paren at `openIdx`. */
function matchParen(s: string, openIdx: number): number {
    if (s[openIdx] !== '(') return -1;
    let depth = 1;
    for (let i = openIdx + 1; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

/** Locate the first top-level for/while loop inside the body. */
function findLoop(innerBody: string): LoopInfo | null {
    // Scan for 'for' or 'while' keywords at top level of the body.
    // Skip occurrences inside strings/comments — this code is already
    // comment-stripped by analyze.ts.
    const re = /\b(for|while)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(innerBody)) !== null) {
        const kind = m[1] as 'for' | 'while';
        // Must be at brace-depth 0 within innerBody (we're already inside the
        // DE function body, so depth 0 here = directly inside DE).
        let depth = 0;
        for (let i = 0; i < m.index; i++) {
            if (innerBody[i] === '{') depth++;
            else if (innerBody[i] === '}') depth--;
        }
        if (depth !== 0) continue;

        // Parse the header: for(INIT; COND; INC) or while(COND)
        const openParen = m.index + m[0].length - 1;
        const closeParen = matchParen(innerBody, openParen);
        if (closeParen < 0) continue;

        const headerInner = innerBody.slice(openParen + 1, closeParen);
        let init: string | null = null;
        let condition = headerInner;
        let increment: string | null = null;
        if (kind === 'for') {
            const parts = splitAtSemicolonsRespectingParens(headerInner);
            if (parts.length === 3) {
                init = parts[0].trim();
                condition = parts[1].trim();
                increment = parts[2].trim();
            }
        }

        // Find the body braces
        let afterHeader = closeParen + 1;
        while (afterHeader < innerBody.length && /\s/.test(innerBody[afterHeader])) afterHeader++;
        if (innerBody[afterHeader] !== '{') {
            // Single-statement body — uncommon for fractal DEs; reject for safety.
            return null;
        }
        const bodyOpen = afterHeader;
        const bodyClose = matchBrace(innerBody, bodyOpen);
        if (bodyClose < 0) continue;

        const body = innerBody.slice(bodyOpen + 1, bodyClose);

        // Counter variable heuristic
        let counterVar: string | null = null;
        if (init) {
            const im = init.match(/\bint\s+(\w+)\s*=/);
            if (im) counterVar = im[1];
        }
        if (!counterVar) {
            const cm = condition.match(/\b(\w+)\s*[<>]/);
            if (cm) counterVar = cm[1];
        }

        const header = innerBody.slice(m.index, bodyOpen);

        return {
            kind, header, init, condition, increment, counterVar,
            body, loopStart: m.index, loopEnd: bodyClose + 1,
        };
    }
    return null;
}

function splitAtSemicolonsRespectingParens(s: string): string[] {
    const parts: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') depth--;
        else if (s[i] === ';' && depth === 0) {
            parts.push(s.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(s.slice(start));
    return parts;
}

/** Extract return expression at the end of post-loop code. */
function extractFinalReturn(postLoop: string): { pre: string; returnExpr: string } | null {
    // Match a trailing `return EXPR ;` that is not inside a nested block.
    // We prefer the LAST return statement that's at top level.
    let depth = 0;
    let lastReturn = -1;
    for (let i = 0; i < postLoop.length; i++) {
        const c = postLoop[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === 'r' && depth === 0 && postLoop.slice(i, i + 7) === 'return '
                 && (i === 0 || !/[a-zA-Z0-9_]/.test(postLoop[i - 1]))) {
            lastReturn = i;
        }
    }
    if (lastReturn < 0) return null;

    // Find terminating semicolon at depth 0
    let i = lastReturn + 'return '.length;
    let pDepth = 0;
    while (i < postLoop.length) {
        const c = postLoop[i];
        if (c === '(' || c === '[' || c === '{') pDepth++;
        else if (c === ')' || c === ']' || c === '}') pDepth--;
        else if (c === ';' && pDepth === 0) break;
        i++;
    }
    if (i >= postLoop.length) return null;

    const expr = postLoop.slice(lastReturn + 'return '.length, i).trim();
    const pre = postLoop.slice(0, lastReturn) + postLoop.slice(i + 1);
    return { pre, returnExpr: expr };
}

function extractDEParts(de: DeFunction): DEParts | null {
    // de.body is the full function text including signature + braces.
    // Find the outermost `{` after the param list.
    const sigOpenParen = de.body.indexOf('(');
    if (sigOpenParen < 0) return null;
    const sigCloseParen = matchParen(de.body, sigOpenParen);
    if (sigCloseParen < 0) return null;
    const openBrace = de.body.indexOf('{', sigCloseParen);
    if (openBrace < 0) return null;
    const closeBrace = matchBrace(de.body, openBrace);
    if (closeBrace < 0) return null;

    const innerBody = de.body.slice(openBrace + 1, closeBrace);

    const loop = findLoop(innerBody);
    if (!loop) return null;

    const preLoop = innerBody.slice(0, loop.loopStart);
    const afterLoop = innerBody.slice(loop.loopEnd);

    const ret = extractFinalReturn(afterLoop);
    if (!ret) return null;

    return {
        posName: de.paramName,
        innerBody,
        preLoop,
        loop,
        postLoop: ret.pre,
        returnExpr: ret.returnExpr,
    };
}

// ─── Structural disqualifiers ───────────────────────────────────────────────

/**
 * Pre-loop `return <expr>;` statements. These represent early-return branches
 * (e.g. delta-DE shortcuts) that must run once per pixel, not once per outer
 * iteration. Per-iter can't express "return a distance early".
 */
function hasPreLoopValueReturn(preLoop: string): boolean {
    // Match `return EXPR ;` at depth 0 — but also at depth > 0 since any
    // early-return value within the pre-loop branch is a disqualifier.
    // Quick check: any `return ` followed by a non-`;` char.
    const m = preLoop.match(/\breturn\s+[^;]+;/);
    return m !== null;
}

/**
 * Pre-loop position mutations: `p = abs(p); p.y += 1.4; p.xz = ...`.
 * These must run once-per-pixel; in per-iter mode they'd run every outer
 * iteration.
 */
function hasPreLoopPositionMods(preLoop: string, posName: string): boolean {
    if (!posName) return false;
    // Match in-place mutations but NOT declarations `vec3 p = ...` (copy, not mutation)
    const re = new RegExp(
        `(?<!\\bvec[234]\\s+)(?<!\\bmat[234]\\s+)(?<!\\bfloat\\s+)(?<!\\bint\\s+)`
        + `\\b${posName}\\b(?:\\.[xyzwrgba]+)?\\s*[-+*/]?=`);
    return re.test(preLoop);
}

/**
 * Post-loop position mutations (e.g. `p /= s;` or `p -= clamp(...);` before
 * the return). Lost in per-iter because getDist only sees the loop-final z.
 */
function hasPostLoopPositionMods(postLoop: string, posName: string): boolean {
    if (!posName) return false;
    const re = new RegExp(`\\b${posName}\\b(?:\\.[xyzwrgba]+)?\\s*[-+*/]?=`);
    return re.test(postLoop);
}

/**
 * Counter-dependent logic beyond `if (i < ColorIterations)`. In per-iter we
 * can keep the counter via the engine's `i`, but branches like `if (i == N)`
 * make the "run one iteration at a time" model unreliable.
 *
 * We whitelist the two standard patterns:
 *   - `i < int(ColorIterations)` / `i < ColorIterations`
 *   - `i < int(Iterations)` / `i < Iterations` (bail-out shaping, benign)
 */
function hasCounterDependentLogic(loopBody: string, counterVar: string | null): boolean {
    if (!counterVar) return false;
    // Strip counter increments and the standard-benign comparison patterns;
    // if any counter reference remains, the body depends on the counter value
    // in a way per-iter can't express (we don't expose the engine's loop var).
    const stripped = loopBody
        .replace(new RegExp(`\\b${counterVar}\\+\\+`, 'g'), '')
        .replace(new RegExp(`\\+\\+\\s*${counterVar}\\b`, 'g'), '')
        .replace(new RegExp(`\\b${counterVar}\\s*\\+=\\s*1\\b`, 'g'), '')
        .replace(new RegExp(`\\b${counterVar}\\s*<\\s*(?:int\\(\\s*)?\\w+\\s*\\)?`, 'g'), '');
    return new RegExp(`\\b${counterVar}\\b`).test(stripped);
}

/**
 * Detect pre-loop declarations of vector/matrix state that (a) aren't simple
 * per-pixel scratch (re-assigned inside the loop before reading) and (b) are
 * read from inside the loop body. Such declarations indicate cross-iteration
 * state that per-iter mode doesn't preserve. The classic example is
 * QuaternionJulia's `vec4 dp = vec4(1.0, 0.0, 0.0, 0.0);` — dp mutates each
 * iteration via read+write; per-iter would re-init dp every outer step.
 */
function hasUnrecognisedPreLoopState(
    preLoop: string,
    rawLoopBody: string,
    counterVar: string | null,
    recognizedTrackers: Set<string>,
): boolean {
    // Heuristic: cross-iteration state = var declared in pre-loop with an
    // initializer AND mutated inside the loop body. Read-only references
    // (uniform-derived constants like `float minRad2 = clamp(MinRad2, ...)`)
    // aren't cross-iter state — they just need to be forwarded into
    // formula_X's scope, which `filterTrackerDecls` does.
    //
    // Bail only when the var is actually WRITTEN in the loop body:
    //   - `var = ...`   (plain assignment, not `==`)
    //   - `var += ...`, `var -= ...`, `var *= ...`, `var /= ...`
    //   - `var++`, `++var`, `var--`, `--var`
    //   - `var.xyz = ...`, `var.xyz += ...` (swizzle writes)
    const declRe = /\b(vec[234]|mat[234]|float|int)\s+(\w+)\s*=/g;
    let m: RegExpExecArray | null;
    while ((m = declRe.exec(preLoop)) !== null) {
        const varName = m[2];
        if (varName === counterVar) continue;
        if (recognizedTrackers.has(varName)) continue;
        if (!new RegExp(`\\b${varName}\\b`).test(rawLoopBody)) continue;
        // Re-declared inside the loop → loop-scoped scratch, not cross-iter state.
        if (new RegExp(`\\b(?:vec[234]|mat[234]|float|int)\\s+${varName}\\b`).test(rawLoopBody)) continue;

        // Is the var written (mutated) anywhere in the loop body?
        const writeRx = new RegExp(
            `\\b${varName}\\b(?:\\.[xyzwrgba]+)?\\s*(?:\\+\\+|--|\\+=|-=|\\*=|/=|=(?!=))`);
        const prefixIncDec = new RegExp(`(?:\\+\\+|--)\\s*${varName}\\b`);
        if (writeRx.test(rawLoopBody) || prefixIncDec.test(rawLoopBody)) {
            return true;  // Mutation detected → cross-iter state we can't handle.
        }
    }
    return false;
}

/**
 * Unbounded vec4 inversion: `p *= k / dot(p, p)` patterns without a clamp.
 * These are math.-stable over a full loop but produce NaN cascades when the
 * engine's outer loop runs them per-iter with fresh bail-out checks.
 */
function hasUnboundedVec4Inversion(loopBody: string): boolean {
    const hasDotDiv = /\/\s*dot\s*\(/.test(loopBody);
    if (!hasDotDiv) return false;
    const hasClamp = /\bclamp\s*\(/.test(loopBody) || /\bmax\s*\(/.test(loopBody);
    return !hasClamp;
}

// ─── Main emitter ──────────────────────────────────────────────────────────

/**
 * Attempt per-iteration emission. See module-level comment for the contract.
 */
export function tryEmitPerIteration(
    analysis: FormulaAnalysis,
    formulaId: string,
    formulaName: string,
): Result<GeneratedFormula> | null {
    const parts = extractDEParts(analysis.selectedDE);
    if (!parts) return null;

    // Structural disqualifiers → fall back to self-contained. Set V4_DEBUG=1
    // to get a one-liner per bail reason during harness runs.
    const dbg = (reason: string) => {
        // Gate on a globalThis flag so browser builds don't see `process`.
        // Node callers can set `globalThis.V4_DEBUG = true` (or use the env-var
        // helper in the debug scripts) to enable the trace.
        if ((globalThis as any).V4_DEBUG) {
            // eslint-disable-next-line no-console
            console.log(`[v4 per-iter] ${formulaId}: ${reason}`);
        }
        return null;
    };
    if (hasPreLoopValueReturn(parts.preLoop))                         return dbg('pre-loop returns value');
    if (hasPreLoopPositionMods(parts.preLoop, parts.posName))         return dbg('pre-loop position mods');
    if (hasPostLoopPositionMods(parts.postLoop, parts.posName))       return dbg('post-loop position mods');
    if (hasCounterDependentLogic(parts.loop.body, parts.loop.counterVar)) return dbg('counter-dependent logic');
    if (hasUnboundedVec4Inversion(parts.loop.body))                   return dbg('unbounded vec4 inversion');

    const warnings: string[] = [...analysis.preprocessed.warnings];

    // ── Slot assignment + rename map (same as self-contained) ──
    const slots = assignSlots(analysis.parameters);
    warnings.push(...slots.warnings);
    const allFunctionNames = [
        analysis.selectedDE.name,
        ...analysis.helperFunctions.map(h => h.name),
    ];
    const rename = buildRenameMap(analysis.parameters, slots, allFunctionNames);

    // Rename tokens in each DE segment independently so we can run V3's
    // string-based pattern detectors on the same text V3 did.
    let preLoop = applyRenames(parts.preLoop, rename);
    let loopBody = applyRenames(parts.loop.body, rename);
    let postLoop = applyRenames(parts.postLoop, rename);
    let returnExpr = applyRenames(parts.returnExpr, rename);

    // Shadowing protection: formula_X's signature declares (z, dr, trap, c).
    // If the DE body declares LOCAL vars with those names, splicing the body
    // into formula_X triggers GLSL "redefinition" errors. Classic offender:
    // `vec4 c = Julia ? vec4(JuliaValues, 1) : p;` in amazingsurface.
    //
    // Rename each such local (declaration + all references) to frag_<name>.
    // We only rename `c` and `trap` — `z` and `dr` renames via tracker
    // detection are handled separately below.
    const allSegments = [preLoop, loopBody, postLoop, returnExpr];
    for (const tmpl of ['c', 'trap']) {
        const declRx = new RegExp(`\\b(?:float|int|vec[234]|mat[234]|bool)\\s+${tmpl}\\b`);
        const anyDeclares = allSegments.some(s => declRx.test(s));
        if (!anyDeclares) continue;
        const renameRx = new RegExp(`\\b${tmpl}\\b`, 'g');
        preLoop = preLoop.replace(renameRx, `frag_${tmpl}`);
        loopBody = loopBody.replace(renameRx, `frag_${tmpl}`);
        postLoop = postLoop.replace(renameRx, `frag_${tmpl}`);
        returnExpr = returnExpr.replace(renameRx, `frag_${tmpl}`);
    }

    // V3's patterns key off `f_z` for the "incoming position". Introduce
    // a normalised alias so the detectors work on V4-renamed text.
    const posName = parts.posName;
    if (posName) {
        // Exclude positions preceded by `.` — those are swizzle components,
        // not variable references. E.g. `z.z` — the first `z` is the variable
        // but the second `z` is the swizzle letter, which we mustn't rename.
        const posRe = new RegExp(`(?<![.\\w])${posName}\\b`, 'g');
        preLoop = preLoop.replace(posRe, 'f_z');
        loopBody = loopBody.replace(posRe, 'f_z');
        returnExpr = returnExpr.replace(posRe, 'f_z');
        postLoop = postLoop.replace(posRe, 'f_z');
    }

    // Orbit trap: in per-iter we write the engine's g_orbitTrap directly
    // (it's already globally live in the compiled shader). applyRenames above
    // rewrote orbitTrap → _v4_orbitTrap (self-contained convention) — here
    // we fix that back to g_orbitTrap and strip any local shadowing decls.
    const remapOrbitTrap = (s: string) =>
        s.replace(/\b_v4_orbitTrap\b/g, 'g_orbitTrap')
         .replace(/\borbitTrap\b/g, 'g_orbitTrap')
         .replace(/\bvec4\s+g_orbitTrap\b/g, 'g_orbitTrap');
    preLoop = remapOrbitTrap(preLoop);
    loopBody = remapOrbitTrap(loopBody);
    postLoop = remapOrbitTrap(postLoop);
    returnExpr = remapOrbitTrap(returnExpr);

    // Strip benign counter-gated patterns from the body. The engine's outer
    // loop counter `i` isn't in formula_X's scope, so `if (i < ColorIterations) {...}`
    // must be rewritten. We drop the gate but keep the body — per-iter loses
    // the "only first N iters" semantics but gains composability.
    if (parts.loop.counterVar) {
        const cv = parts.loop.counterVar;
        // Strip `if (CV < NAME)` (with or without int() cast) — keeping the gated stmt.
        loopBody = loopBody.replace(
            new RegExp(`\\bif\\s*\\(\\s*${cv}\\s*<\\s*(?:int\\s*\\(\\s*)?\\w+(?:\\s*\\))?\\s*\\)\\s*`, 'g'),
            '');
    }

    // ── Apply V3 pattern detectors ──
    //
    // Order matters: detect accumulator (NewMenger) first, because it rewrites
    // pre-loop decls wholesale. Then try vec4 tracker. If neither hits, try
    // vec3 working var. Finally, try scalar DR accumulator.

    let loopInitFromPattern: string | undefined;
    let vec4Tracker: string | null = null;
    let vec3WorkingVar: string | null = null;
    let scalarDRVar: string | null = null;
    let isAccumulator = false;

    // 1. Accumulator pattern (max/min of distance variable)
    const distVarMatch = returnExpr.match(/^\s*([a-zA-Z_]\w*)\s*(?:;|$)/);
    const distVar = distVarMatch ? distVarMatch[1] : null;
    if (distVar) {
        const accum = detectAccumulatorPattern({
            distVar, preLoopDecls: preLoop, loopBody,
        });
        if (accum.isAccumulator) {
            isAccumulator = true;
            loopInitFromPattern = accum.loopInit;
            preLoop = accum.newPreLoopDecls!;
            loopBody = accum.newLoopBody!;
        }
    }

    // 2. Vec4 tracker (Mandelbox-style `vec4 p = vec4(pos, 1)`)
    if (!isAccumulator) {
        const { trackerVar } = detectVec4Tracker(preLoop);
        if (trackerVar) {
            vec4Tracker = trackerVar;
            const patched = patchVec4Tracker(preLoop, loopBody, trackerVar);
            preLoop = patched.preLoopDecls;
            loopBody = patched.loopBody;
        }
    }

    // 3. Vec3 working variable (`vec3 p = pos;`)
    if (!isAccumulator && !vec4Tracker) {
        vec3WorkingVar = detectVec3WorkingVar(preLoop);
        if (vec3WorkingVar) {
            preLoop = patchVec3Anchor(preLoop, vec3WorkingVar);
        }
    }

    // 4. Scalar DR accumulator (`float s = 1.0; s *= k; return length(p) / s;`)
    if (!isAccumulator && !vec4Tracker) {
        const dr = detectScalarDRAccumulator(preLoop, loopBody, returnExpr);
        if (dr.drVar) {
            scalarDRVar = dr.drVar;
            const drRe = new RegExp(`\\b${dr.drVar}\\b`, 'g');
            // Replace decl with dr assignment, and all uses with `dr`
            preLoop = preLoop.replace(
                new RegExp(`\\bfloat\\s+${dr.drVar}\\s*=\\s*[^;]+;`),
                `dr = ${dr.initExpr};`);
            preLoop = preLoop.replace(drRe, 'dr');
            loopBody = loopBody.replace(drRe, 'dr');
            returnExpr = returnExpr.replace(drRe, 'dr');
        }
    }

    // Require AT LEAST ONE recognized tracker pattern. Earlier versions
    // supported a "position-is-tracker" fallback (body mutates param directly,
    // we load/store vs z.xyz). That pattern caught Tetrahedron but also many
    // DEC formulas with unrecognized cross-iter state (vec4 derivatives, per-
    // iter scratch, inline #defines), producing shaders that fail
    // webglCompile. Keeping per-iter gated to recognized patterns reliably
    // cuts failures; Tetrahedron-style formulas still render correctly via
    // self-contained, just without engine-feature composition.
    if (!vec4Tracker && !vec3WorkingVar && !scalarDRVar && !isAccumulator) {
        return dbg('no recognized tracker pattern');
    }

    // Guard against ADDITIONAL vector/scalar state in pre-loop that the
    // recognized pattern didn't absorb (e.g. QuaternionJulia's `vec4 dp`
    // derivative alongside a vec4 tracker that only maps to z/dr).
    const recognizedTrackers = new Set<string>();
    if (vec4Tracker) recognizedTrackers.add(vec4Tracker);
    if (vec3WorkingVar) recognizedTrackers.add(vec3WorkingVar);
    if (scalarDRVar) recognizedTrackers.add(scalarDRVar);
    if (hasUnrecognisedPreLoopState(preLoop, parts.loop.body, parts.loop.counterVar, recognizedTrackers)) {
        return dbg('unrecognised pre-loop cross-iter state');
    }

    // Re-check pre/post position mods for the RECOGNIZED tracker. The earlier
    // structural check used the function's position param name, but some
    // formulas mutate their LOCAL tracker in pre-loop (e.g.
    // `vec4 p = vec4(pos, 1); p = abs(p); for(...)`) — that mutation must
    // run once per pixel, not every iter.
    for (const tname of recognizedTrackers) {
        if (hasPreLoopPositionMods(parts.preLoop, tname)) return dbg(`pre-loop mutations of tracker '${tname}'`);
        if (hasPostLoopPositionMods(parts.postLoop, tname)) return dbg(`post-loop mutations of tracker '${tname}'`);
    }

    // ── Transform loop body: orbit trap, swizzle, break removal ──
    loopBody = transformTrapMin(loopBody);
    loopBody = expandSwizzleWrites(loopBody);
    // Remove `break;` — engine's outer loop owns bail-out
    loopBody = loopBody.replace(/\bbreak\s*;/g, '{ /* break removed */ }');
    // Remove counter increment for while loops (engine handles iteration count)
    if (parts.loop.kind === 'while' && parts.loop.counterVar) {
        const cv = parts.loop.counterVar;
        loopBody = loopBody.replace(new RegExp(`\\b${cv}\\s*\\+\\+;?`, 'g'), '');
        loopBody = loopBody.replace(new RegExp(`\\+\\+\\s*${cv}\\s*;?`, 'g'), '');
    }

    // Partition pre-loop decls BEFORE assembling preamble/loopInit — we need
    // the hoisted lists to plug into each section.
    const trackerName = vec4Tracker ?? vec3WorkingVar ?? scalarDRVar ?? null;
    const {
        inFormula: preLoopInFormula,
        preambleDecls: hoistedPreambleDecls,
        loopInitAssigns: hoistedLoopInitAssigns,
    } = partitionPreLoopDecls(preLoop, trackerName, returnExpr);

    // ── Build preamble (helpers + globals) ──
    // Unlike self-contained, per-iter preamble doesn't declare _v4_orbitTrap —
    // the engine's g_orbitTrap already exists globally in the compiled shader.
    const preambleParts: string[] = [];

    // Ambient defines (Phi/TWO_PI/time)
    const combinedSource =
        analysis.selectedDE.body + '\n'
        + analysis.helperFunctions.map(h => h.body).join('\n')
        + (analysis.initBody ?? '');
    if (/\btime\b/.test(combinedSource) && !/\b(?:uniform|float|int)\s+time\b/.test(combinedSource)) {
        preambleParts.push('#define time uTime');
    }
    if (/\biGlobalTime\b/.test(combinedSource)) {
        preambleParts.push('#define iGlobalTime uTime');
    }
    if (/\bM_PI\b/.test(combinedSource)) {
        preambleParts.push('#define M_PI 3.14159265358979');
    }
    if (/\bPhi\b/.test(combinedSource) && !analysis.preprocessed.glsl.includes('#define Phi')) {
        preambleParts.push('#define Phi 1.61803398874989');
    }
    if (/\bTWO_PI\b/.test(combinedSource) && !analysis.preprocessed.glsl.includes('#define TWO_PI')) {
        preambleParts.push('#define TWO_PI 6.28318530717959');
    }

    // Const globals
    for (const g of analysis.constGlobals) {
        if (g.expression !== undefined) {
            preambleParts.push(`${g.type} ${g.name} = ${g.expression};`);
        } else {
            preambleParts.push(`${g.type} ${g.name};`);
        }
    }
    // Pre-loop decls hoisted to global scope so getDist can reference them
    for (const decl of hoistedPreambleDecls) {
        preambleParts.push(decl);
    }
    // Uninitialized globals
    for (const g of analysis.uninitializedGlobals) {
        preambleParts.push(`${g.type} ${g.name};`);
    }
    // Mutable globals — declared here, reset in loopInit
    for (const g of analysis.mutableGlobals) {
        preambleParts.push(`${g.type} ${g.name};`);
    }
    // Ignored-slot params baked as const
    for (const p of analysis.parameters) {
        if (slots.byName[p.name] !== 'ignore') continue;
        const glslType = paramGlslType(p.type);
        const constLit = paramDefaultLiteral(p);
        preambleParts.push(`const ${glslType} ${p.name} = ${constLit};`);
    }
    // Helper functions (renamed)
    for (const h of analysis.helperFunctions) {
        preambleParts.push(applyRenames(h.body, rename));
    }

    const preamble = preambleParts.join('\n\n');
    const preambleVars = analysis.mutableGlobals.map(g => g.name);

    // ── Build loopInit (once-per-pixel, runs in map() local scope) ──
    // Only contains: mutable global resets + init() body + accumulator rewrites.
    // Pre-loop declarations go INSIDE formula_X (see below) so they're in
    // scope when the loop body references them.
    const loopInitParts: string[] = [];
    for (const g of analysis.mutableGlobals) {
        if (g.expression !== undefined) {
            loopInitParts.push(`${g.name} = ${applyRenames(g.expression, rename)};`);
        } else {
            loopInitParts.push(`${g.name} = ${defaultValueFor(g.type)};`);
        }
    }
    if (analysis.initBody) {
        loopInitParts.push(applyRenames(analysis.initBody, rename));
    }
    // Hoisted pre-loop assignments (once per pixel, in map() local scope where c/uJulia/etc are live)
    for (const assign of hoistedLoopInitAssigns) {
        loopInitParts.push(assign);
    }
    if (loopInitFromPattern) loopInitParts.push(loopInitFromPattern);
    const loopInit = loopInitParts.filter(s => s.trim()).join('\n').trim() || undefined;

    // (pre-loop partitioning already done above, before preamble assembly)

    // ── Build formula_X body ──
    //
    // The engine drives its outer loop. Each outer iteration, it calls
    // formula_X(z, dr, trap, c). We need to:
    //   1. Load tracker from z/dr (engine state)
    //   2. Run one loop-body iteration
    //   3. Store tracker back to z/dr
    //
    // Counter variable: the engine's loop counter isn't directly available,
    // but features.coreMath's ColorIterations gets mapped to uParamC/similar
    // via renames, so branches like `if (i < ColorIterations)` will have
    // already been stripped by hasCounterDependentLogic's whitelist. We no
    // longer need `i` inside the body.

    const safeId = sanitizeId(formulaId);
    const formulaName_GLSL = `formula_${safeId}`;

    // Body mutations: replace tracker-var usage with z where applicable.
    //   vec4Tracker: tracker var → z (patchVec4Tracker already rewrote the
    //                w-init; here we map the identifier itself so body ops
    //                work on the engine's z directly).
    //   vec3 working var: tracker → z.xyz directly.
    //   scalar-DR / no-pattern: leave f_z in the body; we'll load+store it
    //                           against z.xyz at the function boundary.
    // NOTE: applied to preLoop, loopBody, returnExpr — pre-loop may reference
    // the tracker in declarations of anchors (`vec4 c = Julia ? ... : p;`
    // in amazingsurface) that need the same mapping.
    // NOTE: applied to preLoop AND the partitioned preLoopInFormula — the
    // pre-loop may reference the tracker in declarations of anchors
    // (`vec4 c = Julia ? ... : p;` in amazingsurface) that survive partitioning
    // and need the same mapping.
    let usesFZLoadStore = false;
    let preLoopInFormulaRewrite = preLoopInFormula;
    if (vec4Tracker) {
        const re = new RegExp(`\\b${vec4Tracker}\\b`, 'g');
        preLoop = preLoop.replace(re, 'z');
        loopBody = loopBody.replace(re, 'z');
        returnExpr = returnExpr.replace(re, 'z');
        preLoopInFormulaRewrite = preLoopInFormulaRewrite.replace(re, 'z');
    } else if (vec3WorkingVar) {
        const re = new RegExp(`\\b${vec3WorkingVar}\\b`, 'g');
        preLoop = preLoop.replace(re, 'z.xyz');
        loopBody = loopBody.replace(re, 'z.xyz');
        returnExpr = returnExpr.replace(re, 'z.xyz');
        preLoopInFormulaRewrite = preLoopInFormulaRewrite.replace(re, 'z.xyz');
    } else if (!isAccumulator) {
        usesFZLoadStore = true;
    }

    // For for-loop increments (e.g. `s *= e` from `for(;; s*=e)`) — append
    // to the loop body so they run each iteration.
    if (parts.loop.kind === 'for' && parts.loop.increment) {
        let incr = applyRenames(parts.loop.increment, rename);
        if (parts.loop.counterVar) {
            const cv = parts.loop.counterVar;
            incr = incr
                .replace(new RegExp(`\\b${cv}\\s*\\+\\+`, 'g'), '')
                .replace(new RegExp(`\\+\\+\\s*${cv}`, 'g'), '')
                .replace(new RegExp(`\\b${cv}\\s*\\+=\\s*1`, 'g'), '')
                .replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
        }
        if (incr) loopBody += `\n${incr};`;
    }

    // Compose the body. `f_z` is always declared so any residual references
    // in post-pattern-rewrite code stay valid; trailing store only when the
    // body actually mutates f_z (position-var-is-tracker path).
    const bodyLines: string[] = [];
    bodyLines.push('vec3 f_z = z.xyz;');
    if (preLoopInFormulaRewrite.trim()) bodyLines.push(preLoopInFormulaRewrite);
    bodyLines.push(loopBody);
    if (usesFZLoadStore) bodyLines.push('z.xyz = f_z;');
    // Auto-trap fallback — harmless if formula already wrote g_orbitTrap
    bodyLines.push('trap = min(trap, dot(z.xyz, z.xyz));');

    const functionGlsl = `
void ${formulaName_GLSL}(inout vec4 z, inout float dr, inout float trap, vec4 c) {
${indent(bodyLines.join('\n'), 4)}
}
`.trim();

    // ── Build getDist ──
    //
    // Transform the return expression to reference engine state.
    // `length(z.xyz)` → `r` (engine computes r before calling getDist)
    // `z.xyz` → accessible via `z`
    // vec4Tracker was rewritten to `z`; `z.w` is available as `dr`

    // In the position-var-is-tracker case, the body mutates f_z — but by the
    // time getDist runs, the engine has already persisted the last f_z into
    // z.xyz via our trailing store. Return expressions that referenced the
    // position param (still called f_z after rename) need mapping to z.xyz.
    if (usesFZLoadStore) {
        returnExpr = returnExpr.replace(/\bf_z\b/g, 'z.xyz');
    }
    let getDistExpr = returnExpr.replace(/\blength\s*\(\s*z\.xyz\s*\)/g, 'r');
    if (vec4Tracker) {
        // Some formulas use `tracker.w` as the scale accumulator — maps to dr
        getDistExpr = getDistExpr.replace(/\bz\.w\b/g, 'dr');
    }
    // Counter variable references in return expression — map to engine `iter`.
    if (parts.loop.counterVar) {
        const cv = parts.loop.counterVar;
        getDistExpr = getDistExpr.replace(new RegExp(`\\b${cv}\\b`, 'g'), 'int(iter)');
    }
    // Inline const globals into the expression for cases where the return uses
    // a global that would otherwise be out of getDist scope.
    for (const g of analysis.constGlobals) {
        if (!new RegExp(`\\b${g.name}\\b`).test(getDistExpr)) continue;
        if (!g.expression) continue;
        const inlined = applyRenames(g.expression, rename);
        getDistExpr = getDistExpr.replace(
            new RegExp(`\\b${g.name}\\b`, 'g'), `(${inlined})`);
    }

    const getDist = isAccumulator
        ? 'return vec2(dr, iter);'
        : `return vec2(${getDistExpr}, iter);`;

    // ── Assemble FractalDefinition ──
    const safeId2 = sanitizeId(formulaId);
    // Build workshop-param shape → buildFractalParams (reused from self-contained)
    const workshopMappings: WorkshopParam[] = analysis.parameters.map(p => {
        const slot = slots.byName[p.name] ?? 'ignore';
        let uiDefault: number | number[];
        if (Array.isArray(p.defaultValue)) uiDefault = p.defaultValue;
        else if (typeof p.defaultValue === 'boolean') uiDefault = p.defaultValue ? 1 : 0;
        else uiDefault = (p.defaultValue as number) ?? 0;
        const rangeMin = p.range ? p.range[0] : 0;
        const rangeMax = p.range ? p.range[2] : 1;
        const uiMin = Array.isArray(rangeMin) ? Math.min(...(rangeMin as number[])) : (rangeMin as number);
        const uiMax = Array.isArray(rangeMax) ? Math.max(...(rangeMax as number[])) : (rangeMax as number);
        return {
            name: p.name,
            type: p.type === 'color3' ? 'vec3' : p.type === 'color4' ? 'vec4' : p.type as any,
            mappedSlot: slot,
            fixedValue: String(typeof p.defaultValue === 'number' ? p.defaultValue : 0),
            uiMin, uiMax,
            uiStep: p.type === 'int' ? 1 : ((uiMax - uiMin) / 200 || 0.01),
            uiDefault,
            isDegrees: p.isDegrees,
        };
    });
    const { uiParams, defaultPreset } = buildFractalParams(workshopMappings, safeId2);

    // Override iteration default with formula's actual value (same as self-contained)
    const iterParam = analysis.parameters.find(
        p => (p.type === 'int' || p.type === 'float') && slots.byName[p.name] === 'builtin'
    );
    if (iterParam && typeof iterParam.defaultValue === 'number') {
        defaultPreset.features = defaultPreset.features || {};
        (defaultPreset.features as any).coreMath = (defaultPreset.features as any).coreMath || {};
        (defaultPreset.features as any).coreMath.iterations = iterParam.defaultValue;
    }

    const definition: FractalDefinition = {
        id: safeId2 as any,
        name: formulaName,
        description: analysis.preprocessed.info,
        shader: {
            preamble,
            preambleVars: preambleVars.length > 0 ? preambleVars : undefined,
            loopInit,
            function: fixIntFloatArithmetic(functionGlsl).replace(/\r/g, ''),
            loopBody: `${formulaName_GLSL}(z, dr, trap, c);`,
            getDist,
            // Intentionally omit selfContainedSDE — engine runs its outer loop
            // normally, driving per-iteration composability with features.
        },
        parameters: uiParams,
        defaultPreset,
    };

    return {
        ok: true,
        value: {
            definition,
            slotAssignments: slots.byName,
            warnings,
        },
    };
}

// ─── Small utilities ────────────────────────────────────────────────────────

function indent(s: string, n: number): string {
    const pad = ' '.repeat(n);
    return s.split('\n').map(l => l ? pad + l : l).join('\n');
}

function defaultValueFor(type: string): string {
    if (type === 'float' || type === 'int') return '0.0';
    if (type === 'bool') return 'false';
    if (type === 'vec2') return 'vec2(0.0)';
    if (type === 'vec3') return 'vec3(0.0)';
    if (type === 'vec4') return 'vec4(0.0)';
    if (type === 'mat2') return 'mat2(1.0)';
    if (type === 'mat3') return 'mat3(1.0)';
    if (type === 'mat4') return 'mat4(1.0)';
    return `${type}(0)`;
}

function paramGlslType(t: string): string {
    if (t === 'float' || t === 'int' || t === 'bool') return t;
    if (t === 'vec2' || t === 'vec3' || t === 'vec4') return t;
    if (t === 'color3') return 'vec3';
    if (t === 'color4') return 'vec4';
    return 'float';
}

function paramDefaultLiteral(p: import('../types').ParamAnnotation): string {
    const def = p.defaultValue;
    const typeStr = paramGlslType(p.type);
    if (p.type === 'bool') return def === true ? 'true' : 'false';
    if (p.type === 'int') {
        const n = typeof def === 'number' ? def : 0;
        return `${n}`;
    }
    if (p.type === 'float') {
        const n = typeof def === 'number' ? def : 0;
        return Number.isInteger(n) ? `${n}.0` : `${n}`;
    }
    if (Array.isArray(def)) {
        const vals = def.map(v => Number.isInteger(v) ? `${v}.0` : `${v}`);
        return `${typeStr}(${vals.join(', ')})`;
    }
    return `${typeStr}(0.0)`;
}

/**
 * Partition pre-loop statements three ways:
 *   - `inFormula`:       kept as-is inside formula_X body (re-runs each iter)
 *   - `preambleDecls`:   global-scope declarations (e.g. `float absScaleM1;`)
 *   - `loopInitAssigns`: once-per-pixel assignments (e.g. `absScaleM1 = abs(Scale-1.0);`)
 *
 * Rules:
 *   - Declarations of the tracker var are dropped (engine's z/dr hold it).
 *   - Declarations whose var is referenced in `returnExpr` are hoisted
 *     (preamble + loopInit) so getDist can see them.
 *   - Other declarations stay inside formula_X.
 *
 * Comma-separated declarations are split so each var can be classified
 * independently. Example:
 *   input:  `vec4 z = vec4(f_z, dr), p0 = vec4(c.xyz, 1.0);`  tracker='z'
 *           returnExpr references `p0`
 *   output: inFormula='', preambleDecls=['vec4 p0;'],
 *           loopInitAssigns=['p0 = vec4(c.xyz, 1.0);']
 */
function partitionPreLoopDecls(
    preLoop: string,
    trackerName: string | null,
    returnExpr: string,
): { inFormula: string; preambleDecls: string[]; loopInitAssigns: string[] } {
    const stmts = splitTopLevelStatements(preLoop);
    const inFormulaStmts: string[] = [];
    const preambleDecls: string[] = [];
    const loopInitAssigns: string[] = [];

    const refInReturn = (name: string) =>
        new RegExp(`\\b${name}\\b`).test(returnExpr);

    for (const rawStmt of stmts) {
        const stmt = rawStmt.trim();
        if (!stmt) continue;

        const typeMatch = stmt.match(/^(const\s+)?(vec[234]|mat[234]|float|int|bool)\s+(.+?);?\s*$/);
        if (!typeMatch) {
            // Non-declaration: keep in formula_X.
            inFormulaStmts.push(stmt + (stmt.endsWith(';') ? '' : ';'));
            continue;
        }
        const [, constPrefix, type, body] = typeMatch;
        // Split body on commas outside parens — each declarator classified independently.
        const decls = splitOutsideParens(body, ',').map(d => d.trim()).filter(Boolean);

        const keptInFormula: string[] = [];
        for (const d of decls) {
            const nameMatch = d.match(/^(\w+)\b/);
            const name = nameMatch ? nameMatch[1] : null;
            if (!name) continue;
            if (trackerName && name === trackerName) continue;

            const initMatch = d.match(/^\w+\s*=\s*(.+)$/);

            if (refInReturn(name)) {
                // Hoist: global decl + loopInit assignment.
                preambleDecls.push(`${type} ${name};`);
                if (initMatch) {
                    loopInitAssigns.push(`${name} = ${initMatch[1]};`);
                }
                continue;
            }

            keptInFormula.push(d);
        }

        if (keptInFormula.length > 0) {
            inFormulaStmts.push(`${constPrefix ?? ''}${type} ${keptInFormula.join(', ')};`);
        }
    }

    return {
        inFormula: inFormulaStmts.join('\n'),
        preambleDecls,
        loopInitAssigns,
    };
}

/** Split a string on a delimiter, ignoring delimiters inside parentheses. */
function splitOutsideParens(s: string, delim: string): string[] {
    const parts: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(' || s[i] === '[' || s[i] === '{') depth++;
        else if (s[i] === ')' || s[i] === ']' || s[i] === '}') depth--;
        else if (s[i] === delim && depth === 0) {
            parts.push(s.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(s.slice(start));
    return parts;
}

/** Split a block of GLSL into top-level statements (split on `;` at depth 0). */
function splitTopLevelStatements(s: string): string[] {
    const parts: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '{' || c === '(' || c === '[') depth++;
        else if (c === '}' || c === ')' || c === ']') depth--;
        else if (c === ';' && depth === 0) {
            parts.push(s.slice(start, i + 1));
            start = i + 1;
        }
    }
    const tail = s.slice(start).trim();
    if (tail) parts.push(tail);
    return parts;
}
