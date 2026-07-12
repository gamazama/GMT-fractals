/**
 * Native-slot transpiler — rewrites a REGISTERED native formula so it can run as a
 * weave slot. Engine home of the machinery the (retired, ADR-0089 P4.4) interlace
 * feature pioneered; today's one consumer is the weaver's native dispatcher slots
 * (nativeResolver.ts), which bind one rewriter per slot namespace.
 *
 * What rewriting involves (per slot namespace):
 *  - uniform remap    — the formula's generic slots (uParamA.., uVec2A.., …) become
 *    the namespace's own uniforms (uInterlaceParamA, …) so primary + secondary keep
 *    independent parameter sets;
 *  - function rename  — `formula_<Id>` → the namespace's function name;
 *  - symbol prefixing — preamble helpers + mutable globals get the namespace prefix,
 *    so identity pairs (primary == secondary) don't redeclare symbols. Mutable
 *    globals must be listed in `shader.preambleVars` (explicit, no regex scanning);
 *    helpers are auto-detected via {@link extractPreambleFunctions};
 *  - c.w isolation    — 4D formulas (Tetrabrot, Quaternion, …) read their Julia /
 *    slice scalar from c.w; the slot gets its own `c` (`.w` = the namespace's
 *    ParamA) so it never sees the primary's;
 *  - rotation swap    — formulas with `iter:shared-rotation` mutate the shared
 *    gmt_rot* state in loopInit; the loop GLSL snapshots both parties' states and
 *    swaps around the slot body.
 *
 * Consumption model (the WEAVER's native dispatcher slots, P4): nativeResolver.ts
 * binds one rewriter per slot (namespace `ws<N>_`, uniforms remapped via
 * `uniformMap` to bank uniforms / literals), hoists loopInit state declarations
 * to globals, splices the lead slot's getDist (P4.4), and hosts the rotation
 * swap in the dispatcher branch (preCall/postCall). The old INTERLACE inline-
 * splice model retired with the feature.
 */
import { SCALAR_SLOTS, VEC2_SLOTS, VEC3_SLOTS, VEC4_SLOTS, slotToUniform } from '../../utils/uniformSlots';

/** Everything namespace-specific about one native slot. */
export interface NativeSlotNamespace {
    /** Uniform-name infix: `uParamA` → `u<prefix>ParamA` (e.g. 'Interlace'). */
    uniformPrefix: string;
    /** Prefix for preamble helpers + mutable globals (e.g. 'interlace_'). */
    symbolPrefix: string;
    /** The rewritten formula function's name (e.g. '<weaveId>_slot0'). */
    functionName: string;
    /** The slot's own c variable (c.w isolation; e.g. 'cInterlace'). */
    cVarName: string;
    /** Prefix for the rotation-swap snapshot locals (e.g. '_il_'). */
    rotSwapPrefix: string;
    /** Tag for dev-mode diagnostics (e.g. 'interlace'). */
    warnTag: string;
    /** Optional explicit uniform remap: source primary uniform → replacement GLSL
     *  expression (an allocated lane accessor like 'uVec2B.x', a composed vec like
     *  'vec2(uParamC, uParamD)', or a baked literal). When present it REPLACES the
     *  uniformPrefix-derived remap, and replacement is SINGLE-PASS (simultaneous) —
     *  a map {uParamA→uParamB, uParamB→uParamC} never chains. The weaver's native
     *  slots (P4) land params on allocated coreMath lanes through this; interlace
     *  omits it (the prefix-derived remap is unchanged). */
    uniformMap?: Array<[string, string]>;
}

const PRIMARY_UNIFORMS = [
    ...SCALAR_SLOTS.map(slotToUniform),
    ...VEC2_SLOTS.map(slotToUniform),
    ...VEC3_SLOTS.map(slotToUniform),
    ...VEC4_SLOTS.map(slotToUniform),
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The namespace's own uniform names, grouped by GLSL type (for declaration blocks
 *  + addUniform loops). `uParamA` → `u<prefix>ParamA`, etc. */
export function slotUniformNames(uniformPrefix: string): {
    scalars: string[]; vec2s: string[]; vec3s: string[]; vec4s: string[];
} {
    const remap = (slots: readonly string[]) => slots.map((s) => `u${uniformPrefix}${cap(s)}`);
    return {
        scalars: remap(SCALAR_SLOTS),
        vec2s: remap(VEC2_SLOTS),
        vec3s: remap(VEC3_SLOTS),
        vec4s: remap(VEC4_SLOTS),
    };
}

/**
 * Extract names of top-level symbols (functions and variables) declared in a
 * formula's preamble or function source. Skips `formula_*` (handled separately)
 * and declarations inside function bodies. Returns names that should be prefixed
 * with the slot namespace when this formula runs as a secondary, so identity-pair
 * weaving (primary == secondary) doesn't produce duplicate declarations.
 *
 * Covers:
 *   - function decls   `void foo(...)`, `vec3 bar(...)`
 *   - mutable globals  `float claude_Phi;`, `vec3 claude_n1;`
 *   - const globals    `const vec3 co_nc = vec3(...);`
 */
export function extractPreambleFunctions(preamble: string): string[] {
    const names: string[] = [];
    const funcRe = /\b(?:void|vec[234]|float|int|mat[234]|bool)\s+(\w+)\s*\(/g;
    // Match a variable declaration line, capturing the comma-separated list up
    // to the `;`. e.g. `float sC = sin(angC), cC = cos(angC);` → captures `sC = sin(angC), cC = cos(angC)`.
    const varLineRe = /^\s*(?:const\s+)?(?:vec[234]|float|int|mat[234]|bool)\s+([^;]+);/;
    // Extract the identifier name at the start of each comma-separated entry.
    const nameRe = /^\s*(\w+)/;
    let depth = 0;
    for (const line of preamble.split('\n')) {
        if (depth === 0) {
            // function decls (may appear multiple times per line)
            funcRe.lastIndex = 0;
            let fm: RegExpExecArray | null;
            while ((fm = funcRe.exec(line)) !== null) {
                const name = fm[1];
                if (!name.startsWith('formula_') && !names.includes(name)) names.push(name);
            }
            // variable decl line — may declare multiple names separated by commas.
            // The regex already requires a name followed by `=`, `;`, or `,`, so
            // function decls (`type name(...)`) are naturally excluded.
            const vm = varLineRe.exec(line);
            if (vm) {
                // Split on commas at paren-depth 0 to handle init exprs like
                // `float sC = sin(angC), cC = cos(angC);` correctly.
                const parts: string[] = [];
                let pdepth = 0;
                let buf = '';
                for (const ch of vm[1]) {
                    if (ch === '(') pdepth++;
                    else if (ch === ')') pdepth--;
                    else if (ch === ',' && pdepth === 0) { parts.push(buf); buf = ''; continue; }
                    buf += ch;
                }
                if (buf) parts.push(buf);
                for (const part of parts) {
                    const nm = nameRe.exec(part);
                    if (nm && !names.includes(nm[1])) names.push(nm[1]);
                }
            }
        }
        for (const ch of line) {
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
        }
    }
    return names;
}

/** A namespace-bound rewriter — see {@link createNativeSlotRewriter}. */
export interface NativeSlotRewriter {
    rewritePreamble(preamble: string, formulaId: string, preambleVars?: string[]): string;
    rewriteFormulaFunction(glsl: string, formulaId: string, preambleVars?: string[], preambleFunctions?: string[]): string;
    rewriteLoopBody(loopBody: string, formulaId: string, preambleVars?: string[]): string;
    rewriteLoopInit(loopInit: string, formulaId: string, preambleVars?: string[], preambleFunctions?: string[]): string;
}

/** Bind the rewriter machinery to one slot namespace. */
export function createNativeSlotRewriter(ns: NativeSlotNamespace): NativeSlotRewriter {
    const target = slotUniformNames(ns.uniformPrefix);
    const targetFlat = [...target.scalars, ...target.vec2s, ...target.vec3s, ...target.vec4s];
    // Word-boundary matching avoids partial replacements (e.g. uParamA inside uParamABC).
    const uniformMap: Array<[RegExp, string]> = PRIMARY_UNIFORMS.map((u, i) =>
        [new RegExp(`\\b${u}\\b`, 'g'), targetFlat[i]]);

    function applyUniformMap(glsl: string): string {
        // Explicit map (weaver native slots): single-pass simultaneous replacement,
        // because targets may themselves be primary uniform names (lane accessors).
        if (ns.uniformMap) {
            if (ns.uniformMap.length === 0) return glsl;
            const lookup = new Map(ns.uniformMap);
            const re = new RegExp(`\\b(?:${[...lookup.keys()].join('|')})\\b`, 'g');
            return glsl.replace(re, (m) => lookup.get(m) ?? m);
        }
        let result = glsl;
        for (const [pattern, replacement] of uniformMap) {
            result = result.replace(pattern, replacement);
        }
        return result;
    }

    /** Rename all preamble variable references to namespace-prefixed names. */
    function applyPreambleVarRenames(glsl: string, preambleVars: string[]): string {
        // Sort longest-first to avoid partial matches (e.g. uMM_cZ before uMM_c)
        const sorted = [...preambleVars].sort((a, b) => b.length - a.length);
        let result = glsl;
        for (const varName of sorted) {
            result = result.replace(new RegExp(`\\b${varName}\\b`, 'g'), `${ns.symbolPrefix}${varName}`);
        }
        return result;
    }

    return {
        /**
         * Rewrite a formula's preamble for slot use:
         * - renames mutable globals listed in `preambleVars` to the namespace prefix
         * - renames precalc functions (e.g. KaliBox_precalc → <prefix>KaliBox_precalc)
         * - remaps uniform references (uParamA → u<Prefix>ParamA, etc.)
         *
         * `preambleVars` must be the explicit list from `shader.preambleVars` — no regex scanning.
         */
        rewritePreamble(preamble, formulaId, preambleVars) {
            // Dev-mode: warn if the preamble declares mutable globals not listed in preambleVars.
            // Missing entries mean the slot shader will silently use the wrong variable names.
            if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
                // Only scan top-level declarations (brace depth 0), skip function bodies
                const declPattern = /^\s*(?:vec[234]|float|int|mat[234]|bool)\s+(?!const\b)(\w+)/;
                let depth = 0;
                for (const line of preamble.split('\n')) {
                    if (depth === 0) {
                        const m = declPattern.exec(line);
                        if (m) {
                            const name = m[1];
                            if (!(preambleVars ?? []).includes(name)) {
                                console.warn(
                                    `[${ns.warnTag}] Formula "${formulaId}" declares preamble var "${name}" ` +
                                    `not listed in shader.preambleVars — ${ns.warnTag} renaming will be incomplete.`
                                );
                            }
                        }
                    }
                    for (const ch of line) {
                        if (ch === '{') depth++;
                        else if (ch === '}') depth--;
                    }
                }
            }

            let result = preamble;

            // 1a. Rename precalc functions with formulaId prefix: XYZ_foo -> <prefix>XYZ_foo
            result = result.replace(
                new RegExp(`\\b${formulaId}_\\w+\\b`, 'g'),
                (match) => `${ns.symbolPrefix}${match}`
            );

            // 1b. Also prefix any other top-level helpers (e.g. `planeToBulb`, `km_wrap`,
            // `co_nc`) so primary == secondary identity weaving doesn't redeclare them.
            const helpers = extractPreambleFunctions(preamble);
            for (const name of helpers) {
                result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), `${ns.symbolPrefix}${name}`);
            }

            // 2. Rename mutable globals from the explicit list (handles any GLSL type: bool, mat3, etc.)
            if (preambleVars && preambleVars.length > 0) {
                result = applyPreambleVarRenames(result, preambleVars);
            }

            // 3. Remap uniform references
            result = applyUniformMap(result);

            return result;
        },

        /**
         * Rewrite a formula's GLSL function for slot use:
         * - renames `formula_XYZ(...)` to the namespace function name
         * - remaps all uniform references to the namespace's variants
         * - renames preamble global references using the explicit `preambleVars` list
         */
        rewriteFormulaFunction(glsl, formulaId, preambleVars, preambleFunctions) {
            let result = glsl;

            // 1. Rename the formula function
            result = result.replace(
                new RegExp(`\\bformula_${formulaId}\\b`, 'g'),
                ns.functionName
            );

            // 2. Remap all uniform references
            result = applyUniformMap(result);

            // 3. Rename preamble global references using the explicit list
            if (preambleVars && preambleVars.length > 0) {
                result = applyPreambleVarRenames(result, preambleVars);
            }

            // 4. Rename calls to preamble helper functions (auto-detected)
            if (preambleFunctions && preambleFunctions.length > 0) {
                for (const name of preambleFunctions) {
                    result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), `${ns.symbolPrefix}${name}`);
                }
            }

            return result;
        },

        /**
         * Rewrite a formula's loopBody call for slot use:
         * - renames `formula_XYZ` to the namespace function name
         * - renames any mutable-global args listed in `preambleVars` (e.g. `rotX`, `z_prev`)
         *   so the call site matches the prefixed declarations emitted in the loop-init block
         */
        rewriteLoopBody(loopBody, formulaId, preambleVars) {
            let result = loopBody.replace(
                new RegExp(`\\bformula_${formulaId}\\b`, 'g'),
                ns.functionName
            );
            // Swap the 4th positional argument `c` -> the namespace c so the slot
            // sees its own c.w (u<Prefix>ParamA). All native loopBodies are shaped
            // `formula_X(z, dr, trap, c[, extras...])`. Phoenix and Bristorbrot pass
            // extra trailing args; the regex captures the first three commas verbatim
            // so the trailing args (which may be preamble vars renamed below) are
            // untouched.
            result = result.replace(
                new RegExp(`(\\b${ns.functionName}\\s*\\(\\s*[^,]+,\\s*[^,]+,\\s*[^,]+,\\s*)c\\b`),
                `$1${ns.cVarName}`,
            );
            if (preambleVars && preambleVars.length > 0) {
                result = applyPreambleVarRenames(result, preambleVars);
            }
            return result;
        },

        /**
         * Rewrite a formula's loopInit for slot use.
         * Remaps function calls that reference the formula name and remap uniforms.
         */
        rewriteLoopInit(loopInit, formulaId, preambleVars, preambleFunctions) {
            let result = loopInit;

            // Rename precalc function calls (e.g. KaliBox_precalcRotation -> <prefix>KaliBox_precalcRotation)
            result = result.replace(
                new RegExp(`\\b${formulaId}_\\w+\\b`, 'g'),
                (match) => `${ns.symbolPrefix}${match}`
            );

            // Remap uniforms in loopInit
            result = applyUniformMap(result);

            // Rename preamble global references (e.g. gsd_dmin -> <prefix>gsd_dmin)
            if (preambleVars && preambleVars.length > 0) {
                result = applyPreambleVarRenames(result, preambleVars);
            }

            // Rename calls to preamble helper functions (auto-detected)
            if (preambleFunctions && preambleFunctions.length > 0) {
                for (const name of preambleFunctions) {
                    result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), `${ns.symbolPrefix}${name}`);
                }
            }

            return result;
        },

    };
}
