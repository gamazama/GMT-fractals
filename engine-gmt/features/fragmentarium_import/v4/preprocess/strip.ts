/**
 * V4 Stage 2 — Directive stripping + #replace.
 *
 * After presets and annotations are extracted, strip remaining directives
 * that shouldn't reach the AST parser. Also handle `#replace "from" "to"`
 * which applies to SUBSEQUENT lines only (order-sensitive).
 *
 * See docs/26b §2 / §4.3.
 */

export interface StripResult {
    glsl: string;
    info?: string;      // captured from first #info line
    warnings: string[];
}

export function stripAndReplace(source: string): StripResult {
    const warnings: string[] = [];
    let info: string | undefined;

    // ── Generic #define macro expansion ──────────────────────────────────────
    // Fragmentarium formulas use #define both for configuration (Phi, TWO_PI,
    // providesInit) and for value macros (e.g. `#define p_ sqrt((5+sqrt(5))/10)`).
    // V4 expands value-style defines in-place so downstream AST parsing sees
    // only valid GLSL identifiers. Skip the Fragmentarium-reserved defines
    // (handled elsewhere) and function-like macros (too risky to auto-expand).
    const FRAG_RESERVED_DEFINES = /^(providesInit|providesColor|providesBackground|dontclearonchange|iterationsbetweenredraws|subframemax)$/;
    const defineRegex = /^[^\S\n]*#define[^\S\n]+(\w+)[^\S\n]+(.+)$/gm;
    const defines = new Map<string, string>();
    source = source.replace(defineRegex, (match, name, value) => {
        if (FRAG_RESERVED_DEFINES.test(name)) return match;  // keep for later handling
        // Skip function-like macros (arg list on same line, e.g. `#define foo(x) ...`)
        // The regex captured name without parens; if the value has a leading `(` after name,
        // we conservatively keep the macro intact.
        const trimmedValue = value.trim();
        if (trimmedValue === '') return match;
        defines.set(name, trimmedValue);
        return '';
    });
    if (defines.size > 0) {
        // Longest names first so `p_longer` doesn't partial-match with `p_`
        const sortedNames = [...defines.keys()].sort((a, b) => b.length - a.length);
        for (const name of sortedNames) {
            const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            source = source.replace(re, defines.get(name)!);
        }
    }

    // Apply #replace rules in line order.
    const lines = source.split('\n');
    const replaceMap = new Map<string, string>();
    const out: string[] = [];
    let inVertex = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();

        // #vertex…#endvertex: skip the entire block (non-trivial vertex shaders
        // are rejected earlier by ingest; simple ones are stripped).
        if (/^#vertex\b/.test(trimmed)) {
            inVertex = true;
            continue;
        }
        if (/^#endvertex\b/.test(trimmed)) {
            inVertex = false;
            continue;
        }
        if (inVertex) continue;

        // #replace "from" "to" — collect rule, skip line
        const replaceMatch = trimmed.match(/^#replace\s+"([^"]+)"\s+"([^"]+)"\s*$/);
        if (replaceMatch) {
            replaceMap.set(replaceMatch[1], replaceMatch[2]);
            continue;
        }

        // Apply active replaces to this line (only if line doesn't itself contain #replace)
        if (replaceMap.size > 0 && !line.includes('#replace')) {
            for (const [from, to] of replaceMap) {
                // Word-boundary replace to avoid breaking substrings
                const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                line = line.replace(re, to);
            }
        }

        // Capture #info once (first occurrence)
        const infoMatch = trimmed.match(/^#info\s+(.+)$/);
        if (infoMatch && info === undefined) info = infoMatch[1].trim();

        // Strip directives that shouldn't reach the AST parser
        if (/^#(include|info|camera|group|buffer|TexParameter|donotrun)\b/.test(trimmed)) {
            continue;
        }
        if (/^#define\s+(providesInit|dontclearonchange|iterationsbetweenredraws|subframemax)\b/.test(trimmed)) {
            // providesInit is informational — keeps author's `void init()`. Other three
            // are multi-pass/clear state metadata we don't need.
            continue;
        }

        // Strip `void main` definitions — GMT provides its own main.
        // Match the signature line; body lines follow until matching brace.
        // For simplicity, detect `void main(` and skip through the matching `}`.
        if (/^\s*void\s+main\s*\(/.test(line)) {
            // Find matching brace
            let depth = 0;
            let started = false;
            for (let j = i; j < lines.length; j++) {
                for (const ch of lines[j]) {
                    if (ch === '{') { depth++; started = true; }
                    else if (ch === '}') { depth--; }
                }
                if (started && depth === 0) { i = j; break; }
            }
            continue;
        }

        out.push(line);
    }

    return { glsl: out.join('\n'), info, warnings };
}
