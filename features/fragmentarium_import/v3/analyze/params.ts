/**
 * V3 Unified parameter extraction.
 *
 * Merges V1 slider annotation parsing and V2 regex uniform detection into
 * a single pass that produces ImportedParam[] directly. Preset resolution
 * happens here — ImportedParam.default is always the preset-resolved value.
 */

import type { ImportedParam, GLSLType, Preset } from '../types';

// ============================================================================
// Uniform extraction (from cleaned source — no comments)
// ============================================================================

interface RawUniform {
    name: string;
    type: GLSLType;
    rawDefault: string;
    sliderAnnotation: string | null;
    checkboxAnnotation: string | null;
    colorAnnotation: string | null;
}

/** Names to skip — these are engine-managed or common loop variables. */
const SKIP_NAMES = new Set([
    'Iterations', 'ColorIterations', 'i', 'j', 'k', 'd', 'p', 'z', 'iter', 'dist',
]);

/**
 * Extract uniform declarations from source, including slider/checkbox annotations.
 * Strips comments before scanning to avoid matching commented-out declarations.
 */
export function extractUniforms(source: string): RawUniform[] {
    // Strip comments to avoid matching inside // blocks
    const stripped = source
        .replace(/^[ \t]*\/\/[^\n]*/gm, '')   // full-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '');      // block comments

    const uniforms: RawUniform[] = [];
    const re = /uniform\s+(float|int|vec2|vec3|vec4|bool)\s+([a-zA-Z_]\w*)\s*(?:=\s*([^;]+))?;\s*(?:slider\[([^\]]+)\]|checkbox\[([^\]]+)\]|color\[([^\]]+)\])?/g;
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const name = m[2];
        if (SKIP_NAMES.has(name)) continue;
        uniforms.push({
            name,
            type: m[1] as GLSLType,
            rawDefault: m[3]?.trim() ?? '',
            sliderAnnotation: m[4] ?? null,
            checkboxAnnotation: m[5] ?? null,
            colorAnnotation: m[6] ?? null,
        });
    }
    return uniforms;
}

// ============================================================================
// Preset extraction
// ============================================================================

/**
 * Extract #preset blocks from raw source.
 */
export function extractPresets(source: string): Preset[] {
    const presets: Preset[] = [];
    const re = /#preset\s+([^\n]+)\n([\s\S]*?)#endpreset/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        const name = m[1].trim();
        const body = m[2];
        const values: Preset['values'] = {};
        const lineRe = /^\s*([a-zA-Z_]\w*)\s*=\s*(.+)$/gm;
        let lm;
        while ((lm = lineRe.exec(body)) !== null) {
            const key = lm[1];
            const valStr = lm[2].trim();
            if (valStr.includes(',')) {
                const arr = valStr.split(',').map(s => parseFloat(s.trim()));
                values[key] = arr.some(isNaN) ? valStr : arr;
            } else if (valStr.toLowerCase() === 'true') {
                values[key] = true;
            } else if (valStr.toLowerCase() === 'false') {
                values[key] = false;
            } else if (valStr.includes(' ')) {
                // Fragmentarium's native vec format: "0 0 1"
                const arr = valStr.split(/\s+/).map(s => parseFloat(s));
                values[key] = arr.some(isNaN) ? valStr : arr;
            } else {
                const num = parseFloat(valStr);
                values[key] = isNaN(num) ? valStr : num;
            }
        }
        presets.push({ name, values });
    }
    return presets;
}

// ============================================================================
// Annotation parsing → range/default
// ============================================================================

interface ParsedRange {
    min: number;
    max: number;
    step: number;
    default: number | number[];
}

function parseSliderAnnotation(type: GLSLType, annotation: string | null, rawDefault: string): ParsedRange {
    const isVec = type === 'vec2' || type === 'vec3' || type === 'vec4';
    const componentCount = type === 'vec4' ? 4 : type === 'vec3' ? 3 : type === 'vec2' ? 2 : 1;

    // Defaults
    let min = type === 'float' ? -10 : 0;
    let max = 10;
    let step = type === 'float' ? 0.01 : (type === 'int' ? 1 : 0.01);
    let def: number | number[] = isVec ? new Array(componentCount).fill(0) : 0;

    // Parse raw default from source declaration
    if (rawDefault) {
        if (isVec) {
            const vecMatch = rawDefault.match(new RegExp(`vec[234]\\s*\\(([^)]+)\\)`));
            if (vecMatch) {
                const parts = vecMatch[1].split(',').map(s => parseFloat(s.trim()));
                if (parts.length === componentCount && !parts.some(isNaN)) def = parts;
            }
        } else if (type === 'bool') {
            def = rawDefault === 'true' ? 1 : 0;
        } else {
            const v = parseFloat(rawDefault);
            if (!isNaN(v)) def = v;
        }
    }

    if (!annotation) return { min, max, step, default: def };

    if (isVec) {
        // Vec slider: "(-10,-10,-10),(0,0,0),(10,10,10)"
        const parts = annotation.split(/\)\s*,\s*\(/);
        if (parts.length >= 3) {
            min = parseFloat(parts[0].replace(/[()]/g, '').split(',')[0]) || min;
            max = parseFloat(parts[2].replace(/[()]/g, '').split(',')[0]) || max;
            const defParts = parts[1].replace(/[()]/g, '').split(',').map(s => parseFloat(s.trim()));
            if (defParts.length === componentCount && !defParts.some(isNaN)) def = defParts;
            const range = max - min;
            step = range > 10 ? 0.1 : range > 2 ? 0.01 : 0.001;
        }
    } else {
        // Scalar slider: "min,default,max"
        const parts = annotation.split(',');
        if (parts.length >= 3) {
            min = parseFloat(parts[0]);
            max = parseFloat(parts[2]);
            const sd = parseFloat(parts[1]);
            if (!isNaN(sd)) def = sd;
        }
    }

    return { min, max, step, default: def };
}

// ============================================================================
// Build ImportedParam[] with preset resolution
// ============================================================================

/**
 * Build ImportedParam[] from extracted uniforms, resolving defaults from the
 * first preset if available. This is the single source of truth for parameter
 * metadata throughout the V3 pipeline.
 */
export function buildImportedParams(
    source: string,
    presets: Preset[],
): ImportedParam[] {
    const rawUniforms = extractUniforms(source);
    const firstPreset = presets[0]?.values;

    return rawUniforms.map(u => {
        const parsed = parseSliderAnnotation(u.type, u.sliderAnnotation, u.rawDefault);

        // checkbox[true/false] — use annotation as default (slider parser doesn't see it)
        if (u.type === 'bool' && u.checkboxAnnotation !== null) {
            parsed.default = u.checkboxAnnotation.trim().toLowerCase() === 'true' ? 1 : 0;
            parsed.min = 0; parsed.max = 1; parsed.step = 1;
        }

        // Detect isDegrees: name-based OR range-based heuristic
        const lowerName = u.name.toLowerCase();
        let isDegrees = false;
        const absMax = Math.abs(parsed.max);
        const absMin = Math.abs(parsed.min);
        // Name patterns that indicate an angle parameter (only for float/vecN, not int counts)
        const DEGREE_NAMES = ['angle', 'theta', 'heading', 'pitch', 'yaw', 'tilt'];
        // 'rot' only if followed by nothing or common angle suffixes (not 'rotation_count', 'rotations')
        const hasAngleName = u.type !== 'int' && (
            DEGREE_NAMES.some(n => lowerName.includes(n)) ||
            /\brot(?:$|angle|ation|[xyz]?\b)/.test(lowerName)
        );
        // Range-based: slider range matches common degree values (±90, ±180, ±360)
        // Only for float types — integer 90/180/360 could be iteration counts
        const DEGREE_VALUES = [90, 180, 270, 360];
        const hasTypicalDegreeRange = u.type !== 'int' &&
            (DEGREE_VALUES.includes(absMax) || DEGREE_VALUES.includes(absMin));
        if (hasAngleName && (absMax > 3.5 || absMin > 3.5)) {
            isDegrees = true;
        } else if (hasTypicalDegreeRange) {
            isDegrees = true;
        }

        // Resolve default from preset (highest priority)
        let resolvedDefault = parsed.default;
        if (firstPreset && u.name in firstPreset) {
            const presetVal = firstPreset[u.name];
            if (typeof presetVal === 'number') {
                resolvedDefault = presetVal;
            } else if (Array.isArray(presetVal) && presetVal.every(v => typeof v === 'number')) {
                resolvedDefault = presetVal as number[];
            } else if (typeof presetVal === 'boolean') {
                resolvedDefault = presetVal ? 1 : 0;
            }
        }

        return {
            name: u.name,
            type: u.type,
            default: resolvedDefault,
            range: { min: parsed.min, max: parsed.max, step: parsed.step },
            isDegrees,
            slot: '',  // assigned later during mapping
        };
    });
}
