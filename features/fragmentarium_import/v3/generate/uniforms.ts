/**
 * V3 Uniform/const declaration generation.
 *
 * Generates GLSL declarations from ImportedParam[] directly.
 * No more FragUniform→ParamMappingV2→bakedDefault chain.
 */

import type { ImportedParam } from '../types';
import { slotToUniform } from './rename';

// ============================================================================
// GLSL literal formatting
// ============================================================================

function formatGLSLLiteral(type: string, value: number | number[] | boolean | undefined): string | null {
    if (value === undefined) return null;
    const num = (v: unknown) => {
        const n = typeof v === 'number' ? v : 0;
        return n.toFixed(6);
    };
    if (type === 'bool') return String(!!value);
    if (type === 'int') return String(Math.round(Array.isArray(value) ? (value[0] as number) : (value as number)));
    if (type === 'float') return num(Array.isArray(value) ? value[0] : value);
    if (type === 'vec2') {
        const a = Array.isArray(value) ? value : (typeof value === 'number' ? [value, value] : [0, 0]);
        return `vec2(${num(a[0])}, ${num(a[1])})`;
    }
    if (type === 'vec3') {
        const a = Array.isArray(value) ? value : (typeof value === 'number' ? [value, value, value] : [0, 0, 0]);
        return `vec3(${num(a[0])}, ${num(a[1])}, ${num(a[2])})`;
    }
    if (type === 'vec4') {
        const a = Array.isArray(value) ? value : (typeof value === 'number' ? [value, value, value, value] : [0, 0, 0, 0]);
        return `vec4(${num(a[0])}, ${num(a[1])}, ${num(a[2])}, ${num(a[3])})`;
    }
    return null;
}

// ============================================================================
// Declaration generation
// ============================================================================

/**
 * Generate GLSL uniform/const declarations from ImportedParam[].
 *
 * - slot mapped to engine → comment only (engine provides the uniform)
 * - slot = 'fixed' with fixedValue → const declaration
 * - slot = 'ignore' / empty / unmapped → const from ImportedParam.default (preset-resolved)
 */
export function generateUniformDeclarations(params: ImportedParam[]): string {
    const lines: string[] = [];

    for (const p of params) {
        if (p.slot === 'fixed' && p.fixedValue !== undefined) {
            // Bake as const with explicit fixed value
            let fv = p.fixedValue;
            if (p.type === 'bool') fv = (parseFloat(fv) !== 0 || fv === 'true') ? 'true' : 'false';
            if (p.type === 'int') fv = String(Math.round(parseFloat(fv) || 0));
            lines.push(`const ${p.type} u_${p.name} = ${fv};`);
        } else if (p.slot && p.slot !== 'ignore' && p.slot !== 'builtin' && p.slot !== 'fixed' && p.slot !== '') {
            // Mapped to engine slot → comment
            lines.push(`// ${p.name} -> ${slotToUniform(p.slot)}`);
        } else {
            // Unmapped → bake as const from preset-resolved default
            const glslDefault = formatGLSLLiteral(p.type, p.default);
            if (glslDefault !== null) {
                lines.push(`const ${p.type} u_${p.name} = ${glslDefault};`);
            } else {
                lines.push(`uniform ${p.type} u_${p.name};`);
            }
        }
    }

    return lines.join('\n');
}
