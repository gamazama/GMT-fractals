/**
 * V4 Frag/DEC Importer — unified type system.
 *
 * Unlike V3 which bridges through V2 (compat.ts), V4 uses one set of types
 * end-to-end. Canonical plan: docs/26_Formula_Workshop_V4_Plan.md
 *
 * Pipeline:
 *   Stage 1 (ingest)     → RawSource
 *   Stage 2 (preprocess) → PreprocessedSource
 *   Stage 3 (analyze)    → FormulaAnalysis
 *   Stage 4 (emit)       → GeneratedFormula (containing FractalDefinition)
 */

import type { FractalDefinition } from '../../../types/fractal';

// ─── Result sum type ────────────────────────────────────────────────────────

export type Result<T> =
    | { ok: true; value: T; warnings?: string[] }
    | { ok: false; error: Rejection };

export type RejectionKind =
    | 'unsupported_render_model'  // 2D, progressive, Brute-force-no-DE
    | 'no_de_function'            // no float DE(vec3) or equivalent discovered
    | 'buffer_shader'             // #buffershader multi-pass — out of V4 scope
    | 'vertex_shader'             // non-trivial #vertex block — out of scope
    | 'provides_color'            // #define providesColor — deferred
    | 'provides_background'       // #define providesBackground — deferred
    | 'donotrun'                  // library file, not a standalone formula
    | 'textures_unsupported'      // sampler2D with file[…] — deferred
    | 'parse_error'               // GLSL parse failure during analyze
    | 'internal_error';

export interface Rejection {
    kind: RejectionKind;
    message: string;
    /** Optional user-facing hint ("try the Workshop's Custom Import mode"). */
    hint?: string;
    /** For unsupported_render_model: which include triggered rejection. */
    include?: string;
}

// ─── Stage 1: Ingest ────────────────────────────────────────────────────────

export interface RawSource {
    format: 'frag' | 'dec' | 'glsl';
    /** Raw source text as provided. */
    source: string;
    /** For error messages and dedup. */
    filename: string;
    /** Classified from #include / #camera directives per docs/26b §5. */
    renderModel: 'de3d' | 'unsupported';
    /** Populated when renderModel === 'unsupported'. */
    rejectReason?: Rejection;
}

// ─── Stage 2: Preprocess ────────────────────────────────────────────────────

export interface PreprocessedSource {
    /** GLSL with #includes resolved, annotations stripped, presets removed. */
    glsl: string;
    /** All `uniform TYPE name; slider[…]` annotations, extracted as structured data. */
    parameters: ParamAnnotation[];
    /** Named presets, each mapping paramName → value. */
    presets: Map<string, Record<string, number | number[] | boolean>>;
    /** Human description from #info, if any. */
    info?: string;
    /** Any non-fatal issues encountered during preprocess. */
    warnings: string[];
}

export interface ParamAnnotation {
    /** Uniform identifier as it appears in GLSL. */
    name: string;
    type: 'float' | 'int' | 'bool' | 'vec2' | 'vec3' | 'vec4' | 'color3' | 'color4' | 'sampler2D';
    /** [min, default, max] — scalar or vector depending on type. */
    range?: [number | number[], number | number[], number | number[]];
    /** Default value (from annotation or preset). */
    defaultValue?: number | number[] | boolean;
    /** Comment immediately preceding the uniform declaration. */
    tooltip?: string;
    /** Most recent #group name at declaration site. */
    group?: string;
    /** isDegrees detection result (name + range heuristics). */
    isDegrees?: boolean;
}

// ─── Stage 3: Analyze ───────────────────────────────────────────────────────

export interface FormulaAnalysis {
    preprocessed: PreprocessedSource;

    /** DE function candidates. Usually length 1; UI lets user pick if more. */
    deCandidates: DeFunction[];
    /** User (or default) selection. */
    selectedDE: DeFunction;

    /** Functions reachable from the selected DE. */
    helperFunctions: HelperFunction[];

    /** Top-level globals classified by mutability. */
    mutableGlobals: GlobalDecl[];     // → preambleVars
    constGlobals: GlobalDecl[];        // → preamble as-is
    uninitializedGlobals: GlobalDecl[]; // → preamble with default init

    /** Body of `void init()` if present. */
    initBody?: string;

    /** Parameters resolved against actual uniform declarations. */
    parameters: ParamAnnotation[];

    /** Values from #preset Default (when present); drives uniform defaults. */
    defaultPresetValues?: Record<string, number | number[] | boolean>;
}

export interface DeFunction {
    /** Function name as declared. */
    name: string;
    /** Name of the vec3 position parameter (common: 'p', 'pos', 'z'). */
    paramName: string;
    /** Full function source, verbatim — reused in emission. */
    body: string;
    /** GLSL return type (usually 'float', sometimes 'vec2' or 'vec4'). */
    returnType: string;
}

export interface HelperFunction {
    name: string;
    returnType: string;
    paramTypes: string[];
    /** Full source. */
    body: string;
}

export interface GlobalDecl {
    name: string;
    type: string;
    /** Initializer expression, if any. */
    expression?: string;
}

// ─── Stage 4: Emit ──────────────────────────────────────────────────────────

export interface GeneratedFormula {
    /** Ready-to-register FractalDefinition with selfContainedSDE: true. */
    definition: FractalDefinition;
    /** Map from original uniform name → engine slot (e.g. Scale → paramA). */
    slotAssignments: Record<string, string>;
    /** Non-fatal issues (slot pressure, name collisions, etc.). */
    warnings: string[];
}
