/**
 * V3 Variable renaming.
 *
 * Builds the GLSL rename map from ImportedParam[] and applies it via AST visitor.
 * Simplified from V2: no UNIFORM_MAP lookup, no V1 slot merging — ImportedParam
 * already has its final .slot assigned by the Workshop/auto-mapper.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import { visit } from '@shaderfrog/glsl-parser/ast';
import type { Program, IdentifierNode } from '@shaderfrog/glsl-parser/ast';
import type { ImportedParam, FunctionAnalysis } from '../types';

// ============================================================================
// Slot → uniform name conversion
// ============================================================================

/** Convert a short slot ID ('vec3A', 'paramB', 'vec3A.x') to GPU uniform name ('uVec3A', 'uParamB', 'uVec3A.x'). */
export function slotToUniform(slot: string): string {
    if (!slot || slot.startsWith('u')) return slot;
    const dot = slot.indexOf('.');
    if (dot >= 0) {
        const base = slot.slice(0, dot);
        const comp = slot.slice(dot);
        return 'u' + base.charAt(0).toUpperCase() + base.slice(1) + comp;
    }
    return 'u' + slot.charAt(0).toUpperCase() + slot.slice(1);
}

// ============================================================================
// Rename map construction
// ============================================================================

/**
 * Well-known Fragmentarium uniform names that always map to specific engine slots,
 * regardless of user mapping. These are the "semantic" mappings.
 */
const WELL_KNOWN: Record<string, string> = {
    'Iterations': 'int(uIterations)',
    'ColorIterations': 'int(uParamC)',
    'orbitTrap': 'g_orbitTrap',
};

/**
 * Build the GLSL rename map for a DE function.
 *
 * Unlike V2 which merges UNIFORM_MAP + user mappings + bool bitfield logic,
 * V3 reads directly from ImportedParam.slot which already has the final assignment.
 */
export function buildRenameMap(
    deFunc: FunctionAnalysis,
    params: ImportedParam[],
): Record<string, string> {
    const map: Record<string, string> = {};

    // 1. DE parameter → f_z or frag_pos
    if (deFunc.parameters.length > 0) {
        const pName = deFunc.parameters[0].name;
        const copyPattern3 = new RegExp(`\\bvec3\\s+\\w+\\s*=\\s*${pName}\\b`);
        const copyPattern4 = new RegExp(`\\bvec4\\s+\\w+\\s*=\\s*vec4\\s*\\(\\s*${pName}\\b`);
        const isVec4Copy = pName !== 'z' && copyPattern4.test(deFunc.body);
        const isCopied = pName !== 'z' && (copyPattern3.test(deFunc.body) || isVec4Copy);
        map[pName] = isCopied ? 'frag_pos' : 'f_z';
        if (isVec4Copy) map['z'] = 'f_z4';
    }
    if (!map['z']) map['z'] = 'f_z';

    // 2. Well-known names
    for (const [name, replacement] of Object.entries(WELL_KNOWN)) {
        map[name] = replacement;
    }

    // 3. ImportedParam slot mappings
    for (const p of params) {
        if (map[p.name]) continue; // already mapped (e.g. well-known)

        const slot = p.slot;
        if (!slot || slot === 'ignore' || slot === 'fixed' || slot === 'builtin' || slot === '') {
            // Unmapped → bake as u_Name const
            map[p.name] = `u_${p.name}`;
            continue;
        }

        if (slot === 'uJuliaMode') {
            map[p.name] = '(uJuliaMode > 0.5)';
            continue;
        }

        // Expression-valued slots (shouldn't happen in V3 but guard)
        if (slot.startsWith('(')) continue;

        // Component/swizzle slot: "vec3A.x", "vec4A.xy", "vec4A.zw", etc.
        const swizzleMatch = slot.match(/^(vec[234][ABC])\.([xyzw]+)$/);
        if (swizzleMatch) {
            const baseUniform = slotToUniform(swizzleMatch[1]);
            const swizzle = swizzleMatch[2];
            if (p.type === 'bool') {
                map[p.name] = `(${baseUniform}.${swizzle} > 0.5)`;
            } else if (p.type === 'int') {
                map[p.name] = `int(${baseUniform}.${swizzle})`;
            } else {
                map[p.name] = `${baseUniform}.${swizzle}`;
            }
            continue;
        }

        const uniformName = slotToUniform(slot);

        if (p.type === 'int') {
            map[p.name] = `int(${uniformName})`;
        } else if (p.type === 'bool') {
            map[p.name] = `(${uniformName} > 0.5)`;
        } else if (p.type === 'vec3' && /^vec4[ABC]$/.test(slot)) {
            // vec3 param packed into vec4 slot — use .xyz swizzle
            map[p.name] = `${uniformName}.xyz`;
        } else {
            map[p.name] = uniformName;
        }
    }

    // 4. Remaining unmapped params → u_Name fallback
    for (const p of params) {
        if (!map[p.name]) map[p.name] = `u_${p.name}`;
    }

    return map;
}

/**
 * Build a rename map safe for helper functions.
 *
 * Helper functions have their own local parameters (e.g. `vec3 pos`, `vec4 z`)
 * that happen to share names with the DE parameter renames. Applying DE-local
 * renames (pos→f_z, z→f_z) to helpers causes redefinition errors.
 *
 * This returns only the uniform/param renames + well-known names + GLSL3 builtins,
 * excluding DE position variable mappings.
 */
export function buildHelperRenameMap(
    deFunc: FunctionAnalysis,
    params: ImportedParam[],
    fullRenameMap: Record<string, string>,
): Record<string, string> {
    // Identify DE-local keys: the DE parameter name and 'z' (position variables)
    const deLocalKeys = new Set<string>();
    if (deFunc.parameters.length > 0) {
        deLocalKeys.add(deFunc.parameters[0].name); // 'pos', 'p', etc.
    }
    deLocalKeys.add('z');  // always mapped to f_z

    const helperMap: Record<string, string> = {};
    for (const [key, value] of Object.entries(fullRenameMap)) {
        if (deLocalKeys.has(key)) continue;
        helperMap[key] = value;
    }
    return helperMap;
}

// ============================================================================
// AST rename
// ============================================================================

/**
 * Apply the rename map to an AST in-place.
 * Skips property access identifiers (e.g. `.z` in `z.z`).
 */
export function renameVariables(ast: Program, renameMap: Record<string, string>): void {
    visit(ast, {
        identifier: {
            enter(path) {
                const node = path.node as IdentifierNode;
                if (path.parent && (path.parent as any).type === 'field_selection') return;
                if (renameMap[node.identifier]) node.identifier = renameMap[node.identifier];
            },
        },
    });
}

/**
 * Apply the rename map to a raw GLSL expression string using word-boundary replacement.
 * Longer names replaced first to avoid partial matches.
 */
export function applyRenameToExpression(expr: string, renameMap: Record<string, string>): string {
    let result = expr;
    const entries = Object.entries(renameMap).sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of entries) {
        result = result.replace(new RegExp(`(?<!\\.)\\b${from}\\b`, 'g'), to);
    }
    return result;
}

/**
 * Rename a GLSL code block by wrapping in a temp function, AST-renaming,
 * and extracting the body. Falls back to regex rename on parse failure.
 */
export function renameCodeBlock(
    code: string,
    renameMap: Record<string, string>,
    wrapperName = '__gmt_temp__',
    wrapperSig = `void ${wrapperName}()`,
): { code: string; ok: boolean } {
    try {
        const wrapped = `${wrapperSig} {\n${code}\n}`;
        const ast = parse(wrapped, { quiet: true });
        renameVariables(ast, renameMap);
        const generated = generate(ast);
        const bodyMatch = generated.match(new RegExp(`${wrapperName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(.*?\\)\\s*\\{([\\s\\S]*)\\}`));
        if (bodyMatch) {
            return { code: bodyMatch[1].trim(), ok: true };
        }
    } catch { /* fall through */ }
    return { code: applyRenameToExpression(code, renameMap), ok: false };
}
