/**
 * V3 Frag Importer — Unified Types
 *
 * Replaces the 5 parameter representations (FragUniform, ParamMappingV2,
 * WorkshopParam, FractalDefinition.parameters, GLSL uniform) with a single
 * ImportedParam that flows through the entire pipeline unchanged.
 */

// ============================================================================
// Result type — every pipeline stage returns this
// ============================================================================

export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; error: string; stage: string };

// ============================================================================
// Core analysis types
// ============================================================================

export type GLSLType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'bool';

/** Single parameter representation used from detection through code generation. */
export interface ImportedParam {
    name: string;
    type: GLSLType;
    /** Always preset-resolved. Falls back to source declaration default. */
    default: number | number[];
    range: { min: number; max: number; step: number };
    isDegrees: boolean;
    /** Assigned during mapping phase. Empty string = unmapped. */
    slot: string;
    /** When slot is 'fixed', the value to bake as a GLSL const. */
    fixedValue?: string;
}

export interface FunctionParameter {
    name: string;
    type: string;
    qualifier?: string;
}

export interface LoopAnalysis {
    type: 'while' | 'for';
    counterVar: string | null;
    counterInitDecl: string | null;
    condition: string;
    body: string;
    /** For-loop increment expression (e.g. `i++`, `s *= e`). Null for while loops. */
    increment: string | null;
    hasBreak: boolean;
}

export interface FunctionAnalysis {
    name: string;
    returnType: string;
    parameters: FunctionParameter[];
    body: string;
    /** Full function source for AST re-parse. */
    raw: string;
    loop: LoopAnalysis | null;
    /** Names of ImportedParams this function references. */
    usedParams: string[];
    hasOrbitTrap: boolean;
    distanceExpression: string | null;
    isAutoDetectedDE: boolean;
}

export type InitFrequency = 'once' | 'per-pixel';

export interface InitStatement {
    code: string;
    /** 'once' = depends only on uniforms (rotation matrices, etc.)
     *  'per-pixel' = depends on position or other per-pixel state */
    frequency: InitFrequency;
    /** Uniform/variable names this statement reads. */
    dependencies: string[];
}

export interface InitAnalysis {
    statements: InitStatement[];
}

export interface GlobalAnalysis {
    /** Globals with non-const initializers referencing uniforms (e.g. `float s = Scale * 2.0;`). */
    computed: Array<{ type: string; name: string; expression: string }>;
    /** Globals declared without initializer (e.g. `mat3 rot;`). */
    uninitialized: Array<{ type: string; name: string }>;
    /** Globals with literal initializers (e.g. `float l = 0.0;`). */
    literalInit: Array<{ type: string; name: string; expression: string }>;
}

export interface Preset {
    name: string;
    values: Record<string, string | number | number[] | boolean>;
}

/** The single intermediate representation produced by analysis, consumed by generation. */
export interface FormulaAnalysis {
    params: ImportedParam[];
    presets: Preset[];
    /** All functions found in source, tagged with isAutoDetectedDE. */
    functions: FunctionAnalysis[];
    init: InitAnalysis | null;
    globals: GlobalAnalysis;
    includes: string[];
    warnings: string[];
    /** Original source text (for re-analysis or display). */
    source: string;
}

// ============================================================================
// Code generation types
// ============================================================================

export interface GeneratedFormula {
    functionCode: string;
    uniformDeclarations: string;
    loopBodyCall: string;
    getDist?: string;
    loopInit?: string;
    warnings: string[];
    mode: 'per-iteration' | 'full-de';
}

// ============================================================================
// Workshop types
// ============================================================================

export interface WorkshopState {
    analysis: FormulaAnalysis;
    selectedFunction: string;
    loopMode: 'loop' | 'single';
    formulaName: string;
    /** Same ImportedParam type as analysis, with user-modified slots. */
    params: ImportedParam[];
}
