/**
 * V4 Stage 2 — Uniform annotation parser.
 *
 * Parses Fragmentarium-style uniform declarations with embedded metadata:
 *
 *   uniform float X;  slider[0, 2, 10]
 *   uniform int   N;  slider[1, 12, 50]            Locked
 *   uniform bool  J;  checkbox[false]
 *   uniform vec3  O;  slider[(-2,-2,-2),(0,0,0),(2,2,2)]
 *   uniform vec3  C;  color[0.5, 0.6, 0.7]
 *
 * Rewrites uniform lines to plain GLSL (annotations removed) and returns
 * structured ParamAnnotation records. Preceding // comments become tooltips.
 *
 * Behavior ported from Fragmentarium's Preprocessor.cpp (GPL-3).
 * See docs/26b_Fragmentarium_Spec.md §3.
 */

import type { ParamAnnotation } from '../types';

// Lock-type suffix (optional trailing token on any annotation line).
// Trailing `;` is tolerated — some .frag files (e.g. 3Dickulus collection)
// end annotation lines with `slider[...];` as a C-ism.
const LOCK = '\\s*(Locked|NotLocked|NotLockable|AlwaysLocked)?\\s*;?\\s*$';

// Scalar patterns
const RE_FLOAT_SLIDER = new RegExp(
    '^\\s*uniform\\s+float\\s+(\\S+)\\s*;\\s*slider\\[\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*\\]' + LOCK,
);
const RE_INT_SLIDER = new RegExp(
    '^\\s*uniform\\s+int\\s+(\\S+)\\s*;\\s*slider\\[\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*\\]' + LOCK,
);
const RE_BOOL = new RegExp(
    '^\\s*uniform\\s+bool\\s+(\\S+)\\s*;\\s*checkbox\\[\\s*(true|false)\\s*\\]' + LOCK,
    'i',
);

// Vector slider: three groups of parenthesized tuples
const VEC2_TUPLE = '\\(\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*\\)';
const VEC3_TUPLE = '\\(\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*\\)';
const VEC4_TUPLE = '\\(\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*\\)';

const RE_VEC2_SLIDER = new RegExp(
    `^\\s*uniform\\s+vec2\\s+(\\S+)\\s*;\\s*slider\\[\\s*${VEC2_TUPLE}\\s*,\\s*${VEC2_TUPLE}\\s*,\\s*${VEC2_TUPLE}\\s*\\]` + LOCK,
);
const RE_VEC3_SLIDER = new RegExp(
    `^\\s*uniform\\s+vec3\\s+(\\S+)\\s*;\\s*slider\\[\\s*${VEC3_TUPLE}\\s*,\\s*${VEC3_TUPLE}\\s*,\\s*${VEC3_TUPLE}\\s*\\]` + LOCK,
);
const RE_VEC4_SLIDER = new RegExp(
    `^\\s*uniform\\s+vec4\\s+(\\S+)\\s*;\\s*slider\\[\\s*${VEC4_TUPLE}\\s*,\\s*${VEC4_TUPLE}\\s*,\\s*${VEC4_TUPLE}\\s*\\]` + LOCK,
);

// Colour variants
const RE_COLOR3 = new RegExp(
    `^\\s*uniform\\s+vec3\\s+(\\S+)\\s*;\\s*color\\[\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*\\]` + LOCK,
);
const RE_FLOAT_COLOR = new RegExp(
    `^\\s*uniform\\s+vec4\\s+(\\S+)\\s*;\\s*color\\[\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*,\\s*(\\S+?)\\s*\\]` + LOCK,
);

// Sampler2D with file path
const RE_SAMPLER = new RegExp(
    `^\\s*uniform\\s+sampler2D\\s+(\\S+)\\s*;\\s*file\\[(.*?)\\]` + LOCK,
);

// Degree-detection heuristics per docs/26b §3 / V3 param-builder
const DEG_NAME_HINTS = /angle|rot|theta|phi|yaw|pitch|roll/i;

function parseNum(s: string): number {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
}

function detectIsDegrees(name: string, rangeMin: number, rangeMax: number): boolean {
    if (!DEG_NAME_HINTS.test(name)) return false;
    const span = Math.abs(rangeMax - rangeMin);
    return span >= 180 || (rangeMin <= -90 && rangeMax >= 90);
}

export interface ParseResult {
    /** GLSL source with annotations stripped (uniform lines rewritten to plain). */
    glsl: string;
    /** Structured parameter metadata. */
    parameters: ParamAnnotation[];
    /** Non-fatal warnings (unparseable annotation lines, unsupported types, etc.). */
    warnings: string[];
}

/**
 * Walk source line-by-line. For each uniform line with an annotation,
 * rewrite the line to plain `uniform TYPE name;` and capture metadata.
 * Track preceding single-line comment as tooltip; preserve #group scope.
 */
export function parseAnnotations(source: string): ParseResult {
    const lines = source.split('\n');
    const parameters: ParamAnnotation[] = [];
    const warnings: string[] = [];

    let pendingComment = '';
    let currentGroup = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // #group updates scope
        const groupMatch = trimmed.match(/^#group\s+(.+)$/);
        if (groupMatch) {
            currentGroup = groupMatch[1].trim();
            pendingComment = '';
            continue;
        }

        // Single-line comment → pending tooltip
        if (trimmed.startsWith('//') && !trimmed.startsWith('///')) {
            pendingComment = trimmed.replace(/^\/\/\s?/, '').trim();
            continue;
        }

        // Blank line resets pending comment
        if (trimmed === '') {
            pendingComment = '';
            continue;
        }

        // Try each annotation pattern
        let m: RegExpMatchArray | null;
        let matched = false;

        if ((m = line.match(RE_FLOAT_SLIDER))) {
            const min = parseNum(m[2]), def = parseNum(m[3]), max = parseNum(m[4]);
            parameters.push({
                name: m[1], type: 'float',
                range: [min, def, max], defaultValue: def,
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
                isDegrees: detectIsDegrees(m[1], min, max),
            });
            lines[i] = `uniform float ${m[1]};`;
            matched = true;
        }
        else if ((m = line.match(RE_INT_SLIDER))) {
            const min = parseNum(m[2]), def = parseNum(m[3]), max = parseNum(m[4]);
            parameters.push({
                name: m[1], type: 'int',
                range: [min, def, max], defaultValue: def,
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
            });
            lines[i] = `uniform int ${m[1]};`;
            matched = true;
        }
        else if ((m = line.match(RE_BOOL))) {
            const def = m[2].toLowerCase() === 'true';
            parameters.push({
                name: m[1], type: 'bool', defaultValue: def,
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
            });
            lines[i] = `uniform bool ${m[1]};`;
            matched = true;
        }
        else if ((m = line.match(RE_VEC2_SLIDER))) {
            const min = [parseNum(m[2]), parseNum(m[3])];
            const def = [parseNum(m[4]), parseNum(m[5])];
            const max = [parseNum(m[6]), parseNum(m[7])];
            parameters.push({
                name: m[1], type: 'vec2',
                range: [min, def, max], defaultValue: def,
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
            });
            lines[i] = `uniform vec2 ${m[1]};`;
            matched = true;
        }
        else if ((m = line.match(RE_VEC3_SLIDER))) {
            const min = [parseNum(m[2]), parseNum(m[3]), parseNum(m[4])];
            const def = [parseNum(m[5]), parseNum(m[6]), parseNum(m[7])];
            const max = [parseNum(m[8]), parseNum(m[9]), parseNum(m[10])];
            parameters.push({
                name: m[1], type: 'vec3',
                range: [min, def, max], defaultValue: def,
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
            });
            lines[i] = `uniform vec3 ${m[1]};`;
            matched = true;
        }
        else if ((m = line.match(RE_VEC4_SLIDER))) {
            const min = [parseNum(m[2]), parseNum(m[3]), parseNum(m[4]), parseNum(m[5])];
            const def = [parseNum(m[6]), parseNum(m[7]), parseNum(m[8]), parseNum(m[9])];
            const max = [parseNum(m[10]), parseNum(m[11]), parseNum(m[12]), parseNum(m[13])];
            parameters.push({
                name: m[1], type: 'vec4',
                range: [min, def, max], defaultValue: def,
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
            });
            lines[i] = `uniform vec4 ${m[1]};`;
            matched = true;
        }
        else if ((m = line.match(RE_COLOR3))) {
            const def = [parseNum(m[2]), parseNum(m[3]), parseNum(m[4])];
            parameters.push({
                name: m[1], type: 'color3', defaultValue: def,
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
            });
            lines[i] = `uniform vec3 ${m[1]};`;
            matched = true;
        }
        else if ((m = line.match(RE_FLOAT_COLOR))) {
            // floatColor: vec4 where .x = float in [min, max], .yzw = rgb default
            const fDef = parseNum(m[3]);
            const rgb = [parseNum(m[5]), parseNum(m[6]), parseNum(m[7])];
            parameters.push({
                name: m[1], type: 'color4', defaultValue: [fDef, ...rgb],
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
            });
            lines[i] = `uniform vec4 ${m[1]};`;
            matched = true;
        }
        else if ((m = line.match(RE_SAMPLER))) {
            parameters.push({
                name: m[1], type: 'sampler2D',
                tooltip: pendingComment || undefined,
                group: currentGroup || undefined,
            });
            lines[i] = `uniform sampler2D ${m[1]};`;
            warnings.push(`Sampler2D '${m[1]}' with file[${m[2]}] — texture imports not supported in V4 (uniform kept, textures ignored).`);
            matched = true;
        }
        // Any annotated-looking uniform that fails to parse is warned about
        else if (/^\s*uniform\s+\S+\s+\S+\s*;\s*(slider|checkbox|color|file)\[/.test(line)) {
            warnings.push(`Unparseable annotation on line ${i + 1}: ${trimmed.slice(0, 80)}`);
        }

        if (matched || !trimmed.startsWith('//')) pendingComment = '';
    }

    return { glsl: lines.join('\n'), parameters, warnings };
}
