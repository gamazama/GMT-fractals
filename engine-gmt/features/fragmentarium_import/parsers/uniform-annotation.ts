/**
 * Shared Fragmentarium uniform-annotation matchers.
 *
 * The marker set `slider | checkbox | color | file` (the `name[...]` suffix on a
 * `uniform TYPE name;` line) was hand-duplicated across the DEC detector, the V4
 * ingest classifier, and the V4 annotation warner with subtly different line
 * shapes. Centralised here so the marker list can't drift; the legitimate
 * per-site differences (type restriction, anchoring) are baked into the named
 * regexes below rather than re-typed at each call site.
 *
 * @see parsers/dec-detector.ts (strip), v4/ingest/index.ts (classify),
 *      v4/preprocess/annotations.ts (warn)
 */

/** The annotation-suffix markers, as a regex alternation fragment. */
export const ANNOTATION_MARKERS = 'slider|checkbox|color|file';

/**
 * Source contains at least one annotated uniform (`uniform T n; marker[…]`).
 * Loose on type/name — a non-definitive "this looks like a .frag" signal.
 */
export const HAS_ANNOTATED_UNIFORM = new RegExp(
    `uniform\\s+\\w+\\s+\\w+\\s*;\\s*(?:${ANNOTATION_MARKERS})\\[`,
);

/**
 * A single line that is an annotated uniform (anchored, loose type/name) — used
 * to flag annotation lines the structured parser couldn't otherwise handle.
 */
export const ANNOTATED_UNIFORM_LINE = new RegExp(
    `^\\s*uniform\\s+\\S+\\s+\\S+\\s*;\\s*(?:${ANNOTATION_MARKERS})\\[`,
);

/**
 * Promoted-uniform lines — the Workshop injects `uniform TYPE name; marker[…]`
 * for a promoted variable. Restricted to promotable scalar/vec/bool types and
 * anchored to the whole line (global + multiline) so they can be stripped from
 * a body before DEC scoring without touching genuine hand-written uniforms.
 */
export const PROMOTED_UNIFORM_LINE = new RegExp(
    `^[ \\t]*uniform\\s+(?:float|int|vec2|vec3|vec4|bool)\\s+\\w+\\s*;\\s*(?:${ANNOTATION_MARKERS})\\[[^\\n]*$`,
    'gm',
);
