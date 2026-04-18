
/**
 * GLSL Rewriter for Formula Interlacing
 *
 * Renames formula functions and remaps uniform references so that
 * a secondary formula can coexist with the primary in the same shader.
 *
 * Formulas that declare mutable preamble globals must list them in
 * `shader.preambleVars` — this avoids fragile regex discovery and works
 * for any GLSL type (bool, mat3, etc.).
 */

// Uniform slots used by formulas (primary -> interlace mapping)
const SCALAR_UNIFORMS = ['uParamA', 'uParamB', 'uParamC', 'uParamD', 'uParamE', 'uParamF'];
const VEC2_UNIFORMS = ['uVec2A', 'uVec2B', 'uVec2C'];
const VEC3_UNIFORMS = ['uVec3A', 'uVec3B', 'uVec3C'];
const VEC4_UNIFORMS = ['uVec4A', 'uVec4B', 'uVec4C'];

const INTERLACE_SCALAR = ['uInterlaceParamA', 'uInterlaceParamB', 'uInterlaceParamC', 'uInterlaceParamD', 'uInterlaceParamE', 'uInterlaceParamF'];
const INTERLACE_VEC2 = ['uInterlaceVec2A', 'uInterlaceVec2B', 'uInterlaceVec2C'];
const INTERLACE_VEC3 = ['uInterlaceVec3A', 'uInterlaceVec3B', 'uInterlaceVec3C'];
const INTERLACE_VEC4 = ['uInterlaceVec4A', 'uInterlaceVec4B', 'uInterlaceVec4C'];

/**
 * Build a map of all uniform replacements.
 * Uses word-boundary matching to avoid partial replacements (e.g. uParamA inside uParamABC).
 */
function buildUniformMap(): Array<[RegExp, string]> {
    const pairs: Array<[RegExp, string]> = [];
    for (let i = 0; i < SCALAR_UNIFORMS.length; i++)
        pairs.push([new RegExp(`\\b${SCALAR_UNIFORMS[i]}\\b`, 'g'), INTERLACE_SCALAR[i]]);
    for (let i = 0; i < VEC2_UNIFORMS.length; i++)
        pairs.push([new RegExp(`\\b${VEC2_UNIFORMS[i]}\\b`, 'g'), INTERLACE_VEC2[i]]);
    for (let i = 0; i < VEC3_UNIFORMS.length; i++)
        pairs.push([new RegExp(`\\b${VEC3_UNIFORMS[i]}\\b`, 'g'), INTERLACE_VEC3[i]]);
    for (let i = 0; i < VEC4_UNIFORMS.length; i++)
        pairs.push([new RegExp(`\\b${VEC4_UNIFORMS[i]}\\b`, 'g'), INTERLACE_VEC4[i]]);
    return pairs;
}

const UNIFORM_MAP = buildUniformMap();

/** Apply all uniform remappings to a GLSL string */
function applyUniformMap(glsl: string): string {
    let result = glsl;
    for (const [pattern, replacement] of UNIFORM_MAP) {
        result = result.replace(pattern, replacement);
    }
    return result;
}

/** Rename all preamble variable references to interlace_ prefixed names */
function applyPreambleVarRenames(glsl: string, preambleVars: string[]): string {
    // Sort longest-first to avoid partial matches (e.g. uMM_cZ before uMM_c)
    const sorted = [...preambleVars].sort((a, b) => b.length - a.length);
    let result = glsl;
    for (const varName of sorted) {
        result = result.replace(new RegExp(`\\b${varName}\\b`, 'g'), `interlace_${varName}`);
    }
    return result;
}

/**
 * Extract names of top-level symbols (functions and variables) declared in a
 * formula's preamble or function source. Skips `formula_*` (handled separately)
 * and declarations inside function bodies. Returns names that should be prefixed
 * with `interlace_` when this formula runs as the secondary so identity-pair
 * interlacing (primary == secondary) doesn't produce duplicate declarations.
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

/**
 * Rewrite a formula's preamble for interlacing.
 * - Renames mutable global variables listed in `preambleVars` to `interlace_` prefix
 * - Renames precalc functions (e.g. KaliBox_precalc -> interlace_KaliBox_precalc)
 * - Remaps uniform references (uParamA -> uInterlaceParamA, etc.)
 *
 * `preambleVars` must be the explicit list from `shader.preambleVars` — no regex scanning.
 */
export function rewritePreamble(preamble: string, formulaId: string, preambleVars?: string[]): string {
    // Dev-mode: warn if the preamble declares mutable globals not listed in preambleVars.
    // Missing entries mean the interlace shader will silently use the wrong variable names.
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
                            `[interlace] Formula "${formulaId}" declares preamble var "${name}" ` +
                            `not listed in shader.preambleVars — interlace renaming will be incomplete.`
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

    // 1a. Rename precalc functions with formulaId prefix: XYZ_foo -> interlace_XYZ_foo
    result = result.replace(
        new RegExp(`\\b${formulaId}_\\w+\\b`, 'g'),
        (match) => `interlace_${match}`
    );

    // 1b. Also prefix any other top-level helpers (e.g. `planeToBulb`, `km_wrap`,
    // `co_nc`) so primary == secondary identity interlacing doesn't redeclare them.
    const helpers = extractPreambleFunctions(preamble);
    for (const name of helpers) {
        result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), `interlace_${name}`);
    }

    // 2. Rename mutable globals from the explicit list (handles any GLSL type: bool, mat3, etc.)
    if (preambleVars && preambleVars.length > 0) {
        result = applyPreambleVarRenames(result, preambleVars);
    }

    // 3. Remap uniform references
    result = applyUniformMap(result);

    return result;
}

/**
 * Rewrite a formula's GLSL function for interlacing.
 * - Renames `formula_XYZ(...)` to `formula_Interlace(...)`
 * - Remaps all uniform references to interlace-prefixed variants
 * - Renames preamble global references using the explicit `preambleVars` list
 */
export function rewriteFormulaFunction(
    glsl: string,
    formulaId: string,
    preambleVars?: string[],
    preambleFunctions?: string[],
): string {
    let result = glsl;

    // 1. Rename the formula function
    result = result.replace(
        new RegExp(`\\bformula_${formulaId}\\b`, 'g'),
        'formula_Interlace'
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
            result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), `interlace_${name}`);
        }
    }

    return result;
}

/**
 * Rewrite a formula's loopBody call for interlacing.
 * - Renames `formula_XYZ` to `formula_Interlace`
 * - Renames any mutable-global args listed in `preambleVars` (e.g. `rotX`, `z_prev`)
 *   so the call site matches the prefixed declarations emitted in the loop-init block
 */
export function rewriteLoopBody(loopBody: string, formulaId: string, preambleVars?: string[]): string {
    let result = loopBody.replace(
        new RegExp(`\\bformula_${formulaId}\\b`, 'g'),
        'formula_Interlace'
    );
    if (preambleVars && preambleVars.length > 0) {
        result = applyPreambleVarRenames(result, preambleVars);
    }
    return result;
}

/**
 * Rewrite a formula's loopInit for interlacing.
 * Remaps function calls that reference the formula name and remap uniforms.
 */
export function rewriteLoopInit(
    loopInit: string,
    formulaId: string,
    preambleVars?: string[],
    preambleFunctions?: string[],
): string {
    let result = loopInit;

    // Rename precalc function calls (e.g. KaliBox_precalcRotation -> interlace_KaliBox_precalcRotation)
    result = result.replace(
        new RegExp(`\\b${formulaId}_\\w+\\b`, 'g'),
        (match) => `interlace_${match}`
    );

    // Remap uniforms in loopInit
    result = applyUniformMap(result);

    // Rename preamble global references (e.g. gsd_dmin -> interlace_gsd_dmin)
    if (preambleVars && preambleVars.length > 0) {
        result = applyPreambleVarRenames(result, preambleVars);
    }

    // Rename calls to preamble helper functions (auto-detected)
    if (preambleFunctions && preambleFunctions.length > 0) {
        for (const name of preambleFunctions) {
            result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), `interlace_${name}`);
        }
    }

    return result;
}

/**
 * Build the pre-loop and in-loop GLSL for interlace injection.
 *
 * - `rewrittenBody`: the secondary formula's loopBody after rewriting (formula_Interlace call)
 * - `interlaceInit`: the secondary formula's loopInit after rewriting (empty string if none)
 * - `needsRotSwap`: true if the secondary formula writes gmt_rotAxis/rotCos/rotSin (usesSharedRotation)
 *
 * Returns `preLoop` (emitted before the iteration loop) and `inLoop` (emitted inside the loop,
 * before the primary formula body).
 */
export function buildInterlaceLoopGLSL(
    rewrittenBody: string,
    interlaceInit: string,
    needsRotSwap: boolean,
): { preLoop: string; inLoop: string } {
    let preLoop = '';
    if (interlaceInit) {
        // Emit interlaceInit at function scope (no enclosing if-block). Any
        // variables it declares need to be visible inside the iteration loop
        // where the rewritten formula body references them. Running uncondi-
        // tionally is safe: the declarations are cheap, and the rot-swap
        // bookkeeping below still captures the post-init state only when
        // uInterlaceEnabled is true at runtime.
        preLoop = `
    vec3 _il_savedAxis = gmt_rotAxis;
    float _il_savedCos = gmt_rotCos;
    float _il_savedSin = gmt_rotSin;
    ${interlaceInit}
    vec3 _il_interlaceAxis = gmt_rotAxis;
    float _il_interlaceCos = gmt_rotCos;
    float _il_interlaceSin = gmt_rotSin;
    gmt_rotAxis = _il_savedAxis;
    gmt_rotCos = _il_savedCos;
    gmt_rotSin = _il_savedSin;`;
    }

    const rotSwapIn = needsRotSwap ? `
            gmt_rotAxis = _il_interlaceAxis;
            gmt_rotCos = _il_interlaceCos;
            gmt_rotSin = _il_interlaceSin;` : '';
    const rotSwapOut = needsRotSwap ? `
            gmt_rotAxis = _il_savedAxis;
            gmt_rotCos = _il_savedCos;
            gmt_rotSin = _il_savedSin;` : '';

    // Note: do NOT declare skipMainFormula here.
    // In the main renderer, shaders/chunks/de.ts detects the reference and declares it once
    // before the entire hybridInLoop block. In SDFShaderBuilder (mesh export), the caller
    // declares it separately. Declaring it here would cause a redefinition when geometry's
    // hybridInLoop also uses skipMainFormula.
    const inLoop = `
    if (uInterlaceEnabled > 0.5) {
        int ilSkip = int(uInterlaceInterval);
        int ilStart = int(uInterlaceStartIter);
        if (ilSkip < 1) ilSkip = 1;
        if (i >= ilStart && ((i - ilStart) % ilSkip) == 0) {
            ${rotSwapIn}
            ${rewrittenBody}
            ${rotSwapOut}
            skipMainFormula = true;
        }
    }`;

    return { preLoop, inLoop };
}

/**
 * Collect all uniform names needed by the interlace feature.
 */
export const INTERLACE_UNIFORM_NAMES = {
    scalars: INTERLACE_SCALAR,
    vec2s: INTERLACE_VEC2,
    vec3s: INTERLACE_VEC3,
    vec4s: INTERLACE_VEC4,
} as const;
