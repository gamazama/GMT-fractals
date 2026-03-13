/**
 * Variable renaming utilities.
 * AST-based rename pass that converts Fragmentarium uniform names to GMT slot names.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import { visit } from '@shaderfrog/glsl-parser/ast';
import type { Program, IdentifierNode } from '@shaderfrog/glsl-parser/ast';
import type { DEFunctionInfo, FragUniform, ParamMappingV2 } from '../types';

// ============================================================================
// Uniform name → GMT slot mapping (known Fragmentarium built-ins)
// ============================================================================

export const UNIFORM_MAP: Record<string, string> = {
    'Scale': 'uParamA',
    'Offset': 'uVec3A',
    'OffsetV': 'uVec3A',
    'MinRad2': 'uParamB',
    'ColorIterations': 'uParamC',
    'Iterations': 'uIterations',
    'Julia': '(uJuliaMode > 0.5)',
    'DoJulia': '(uJuliaMode > 0.5)',
    'JuliaV': '(uJuliaMode > 0.5)',
    'JuliaValues': 'uJulia',
    'JuliaC': 'uJulia',
};

/** Convert a short slot ID ('vec3A', 'paramB', 'vec3A.x') to the GPU uniform name ('uVec3A', 'uParamB', 'uVec3A.x'). */
export function slotToUniform(slot: string): string {
    if (!slot || slot.startsWith('u')) return slot;
    // Component slot: 'vec3A.x' → 'uVec3A.x'
    const dot = slot.indexOf('.');
    if (dot >= 0) {
        const base = slot.slice(0, dot);
        const comp = slot.slice(dot); // includes the dot
        return 'u' + base.charAt(0).toUpperCase() + base.slice(1) + comp;
    }
    return 'u' + slot.charAt(0).toUpperCase() + slot.slice(1);
}

/**
 * Apply the rename map to an AST in-place.
 * Safely skips property access identifiers (e.g. `.z` in `z.z`).
 */
export function renameVariables(ast: Program, renameMap: Record<string, string>): void {
    visit(ast, {
        identifier: {
            enter(path) {
                const node = path.node as IdentifierNode;
                const oldName = node.identifier;
                if (path.parent && (path.parent as any).type === 'field_selection') return;
                if (renameMap[oldName]) node.identifier = renameMap[oldName];
            }
        }
    });
}

/**
 * Build the rename map for a DE function.
 */
export function buildDERenameMap(
    deFunc: DEFunctionInfo,
    allUniforms: FragUniform[],
    mappings: ParamMappingV2[]
): Record<string, string> {
    const renameMap: Record<string, string> = {};

    if (deFunc.parameters.length > 0) {
        const pName = deFunc.parameters[0].name;
        // Check if the DE parameter is copied to a separate working variable.
        // Patterns detected:
        //   "vec3 z = pos"          — standard Mandelbulb style (3D copy)
        //   "vec4 z = vec4(pos, w)" — 4D extension style (MixPinski etc.)
        // In both cases pos is the immutable initial position (≈ c.xyz in GMT)
        // and z is the mutated working variable.  Without this distinction both map
        // to f_z and "z += pos" becomes "f_z += f_z" (self-doubling).
        const copyPattern3 = new RegExp(`\\bvec3\\s+\\w+\\s*=\\s*${pName}\\b`);
        const copyPattern4 = new RegExp(`\\bvec4\\s+\\w+\\s*=\\s*vec4\\s*\\(\\s*${pName}\\b`);
        const isVec4Copy = pName !== 'z' && copyPattern4.test(deFunc.body);
        const isCopied = pName !== 'z' && (copyPattern3.test(deFunc.body) || isVec4Copy);
        renameMap[pName] = isCopied ? 'frag_pos' : 'f_z';
        // For vec4-extension formulas (vec4 z = vec4(p, w)), rename z to f_z4
        // to avoid a duplicate declaration conflict with the vec3 f_z function parameter.
        if (isVec4Copy) renameMap['z'] = 'f_z4';
    }
    if (!renameMap['z']) renameMap['z'] = 'f_z';

    renameMap['orbitTrap'] = 'g_orbitTrap';
    renameMap['ColorIterations'] = 'int(uParamC)';
    renameMap['Iterations'] = 'int(uIterations)';

    // Step 1: User-explicit slot mappings take HIGHEST priority.
    // This ensures that if the user manually remaps a slot in the Workshop (e.g. Offset→vec3B),
    // the GLSL rename matches the UI — even if UNIFORM_MAP would say otherwise.

    // Pre-compute bool flags: when multiple bools share the same scalar slot,
    // each gets a bit position for bitfield extraction (mod/floor pattern).
    const boolBitIndex = new Map<string, number>();
    const boolsPerSlot = new Map<string, string[]>();
    for (const uniform of allUniforms) {
        if (uniform.type !== 'bool') continue;
        const m = mappings.find(mp => mp.name === uniform.name);
        const slot = m?.mappedSlot;
        if (!slot || slot === 'ignore' || slot === 'fixed' || slot === 'uJuliaMode') continue;
        if (!boolsPerSlot.has(slot)) boolsPerSlot.set(slot, []);
        const names = boolsPerSlot.get(slot)!;
        boolBitIndex.set(uniform.name, names.length);
        names.push(uniform.name);
    }

    for (const uniform of allUniforms) {
        const userMapping = mappings.find(m => m.name === uniform.name);
        const slot = userMapping?.mappedSlot;
        if (!slot || slot === 'ignore' || slot === 'fixed' || slot === 'builtin' || slot === 'auto' || slot === '') continue;
        if (slot === 'uJuliaMode') {
            // bool uniforms mapped to juliaMode must expand to a comparison expression for GLSL ES
            renameMap[uniform.name] = '(uJuliaMode > 0.5)';
        } else if (!slot.startsWith('(')) {
            const uniformName = slotToUniform(slot);
            if (uniform.type === 'int') {
                // int uniforms mapped to float slots need int(...) wrapping
                renameMap[uniform.name] = `int(${uniformName})`;
            } else if (uniform.type === 'bool') {
                // Bool flags: extract bit from bitfield via mod/floor
                const bitIdx = boolBitIndex.get(uniform.name) ?? 0;
                const boolCount = boolsPerSlot.get(slot)?.length ?? 1;
                if (boolCount === 1) {
                    // Single bool on slot — simple comparison
                    renameMap[uniform.name] = `(${uniformName} > 0.5)`;
                } else {
                    // Multiple bools packed as flags — extract bit
                    const divisor = Math.pow(2, bitIdx);
                    const divExpr = divisor === 1 ? uniformName : `${uniformName} / ${divisor.toFixed(1)}`;
                    renameMap[uniform.name] = `(mod(floor(${divExpr}), 2.0) > 0.5)`;
                }
            } else {
                renameMap[uniform.name] = uniformName;
            }
        }
    }

    // Step 2: UNIFORM_MAP as fallback for any uniform not already resolved by the user.
    for (const [uniformName, mappedName] of Object.entries(UNIFORM_MAP)) {
        if (!renameMap[uniformName]) renameMap[uniformName] = mappedName;
    }

    // Step 3: Remaining uniforms fall back to u_Name (baked as const or declared but unused).
    for (const uniform of allUniforms) {
        if (!renameMap[uniform.name]) {
            renameMap[uniform.name] = `u_${uniform.name}`;
        }
    }

    return renameMap;
}

/**
 * Apply the rename map to a raw GLSL expression string using word-boundary replacement.
 * Longer names are replaced first to avoid partial matches (e.g. "JuliaValues" before "Julia").
 */
export function applyRenameToExpression(expr: string, renameMap: Record<string, string>): string {
    let result = expr;
    const entries = Object.entries(renameMap).sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of entries) {
        // (?<!\.) prevents matching component accesses like `.z` in `uVec3A.z`
        result = result.replace(new RegExp(`(?<!\\.)\\b${from}\\b`, 'g'), to);
    }
    return result;
}
