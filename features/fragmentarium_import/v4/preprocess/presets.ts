/**
 * V4 Stage 2 — Preset block extraction.
 *
 * Parses `#preset NAME ... #endpreset` blocks into structured maps and
 * removes them from the source. `#preset Default` values drive V4's
 * parameter defaults (B.8 parameter-aware verification).
 *
 * Preset lines are `key = value` where value may be a scalar or a tuple
 * like `1, 2, 3` (vec3) or `1.0, 2.0` (vec2) or `true`/`false`.
 *
 * See docs/26b §2 / §4.2.
 */

export interface PresetExtractResult {
    /** Source with preset blocks removed. */
    glsl: string;
    /** presetName → { paramName: value }. */
    presets: Map<string, Record<string, number | number[] | boolean>>;
    warnings: string[];
}

function parsePresetValue(raw: string): number | number[] | boolean | null {
    const trimmed = raw.trim();
    if (trimmed === '') return null;

    // Boolean
    if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';

    // Vector: comma-separated numbers
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => parseFloat(p.trim()));
        if (parts.every(n => Number.isFinite(n))) return parts;
        return null;
    }

    // Scalar
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
}

export function extractPresets(source: string): PresetExtractResult {
    const presets = new Map<string, Record<string, number | number[] | boolean>>();
    const warnings: string[] = [];

    const lines = source.split('\n');
    const out: string[] = [];

    let inPreset: string | null = null;  // current preset name, or null
    let bodyLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (inPreset === null) {
            const m = trimmed.match(/^#preset\s+(\S.*?)\s*$/);
            if (m) {
                inPreset = m[1].trim();
                bodyLines = [];
                // Drop the #preset line from output
                continue;
            }
            out.push(line);
        } else {
            if (trimmed.startsWith('#endpreset')) {
                // Parse accumulated body lines into key=value
                const values: Record<string, number | number[] | boolean> = {};
                for (const bline of bodyLines) {
                    const kv = bline.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*$/);
                    if (!kv) continue;
                    const key = kv[1];
                    const val = parsePresetValue(kv[2]);
                    if (val !== null) values[key] = val;
                }
                presets.set(inPreset, values);
                inPreset = null;
                bodyLines = [];
                continue;
            }
            bodyLines.push(line);
        }
    }

    if (inPreset !== null) {
        warnings.push(`Preset '${inPreset}' has no #endpreset; body lines ignored.`);
    }

    return { glsl: out.join('\n'), presets, warnings };
}
