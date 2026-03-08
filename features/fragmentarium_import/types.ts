/**
 * Shared types for the Fragmentarium importer feature.
 * All interfaces that cross module boundaries live here.
 */

// ============================================================================
// Legacy V0 types (FragmentariumParser)
// ============================================================================

export interface FragUniform {
    name: string;
    type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'bool';
    uiType: 'slider' | 'checkbox' | 'color' | 'fixed';
    min?: number;
    max?: number;
    step?: number;
    default: number | number[];
    mappedSlot?: string;
    isDegrees?: boolean;
}

export interface FragPreset {
    name: string;
    values: Record<string, string | number | number[] | boolean>;
}

export interface FragGlobalVar {
    type: string;
    name: string;
    expression: string;
}

export interface FragFunction {
    signature: string;
    body: string;
}

export interface FragDocument {
    uniforms: FragUniform[];
    presets: FragPreset[];
    globalVars: FragGlobalVar[];
    functions: FragFunction[];
    rawGLSL: string;
    iterations: number;
}

// ============================================================================
// V1 types (GenericFragmentariumParser)
// ============================================================================

export interface GenericFragDocument {
    uniforms: FragUniform[];
    presets: FragPreset[];
    deFunction: string;
    deFunctionName: string;
    helperFunctions: string[];
    includes: string[];
    rawGLSL: string;
    iterations: number;
}

export interface ParamMapping {
    name: string;
    type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'bool';
    mappedSlot: string;
    fixedValue?: string;
    isDegrees?: boolean;
}

export interface TransformedFormula {
    function: string;
    loopBody: string;
    getDist: string;
    uniforms: string;
    warnings: string[];
}

// ============================================================================
// V2 types (GenericFragmentariumParserV2)
// ============================================================================

export interface ComputedGlobal {
    type: string;
    name: string;
    expression: string;
}

export interface GlobalDecl {
    type: string;
    name: string;
    /** Initializer expression for literal-initialized globals (e.g. "0.0", "false"). */
    expression?: string;
}

export interface FragDocumentV2 {
    uniforms: FragUniform[];
    presets: FragPreset[];
    deFunction: DEFunctionInfo | null;
    helperFunctions: HelperFunctionInfo[];
    initFunction: InitFunctionInfo | null;
    includes: string[];
    rawGLSL: string;
    computedGlobals: ComputedGlobal[];
    globalDecls: GlobalDecl[];
}

export interface InitFunctionInfo {
    body: string;
    raw: string;
}

export interface DEFunctionInfo {
    name: string;
    returnType: string;
    parameters: FunctionParameter[];
    body: string;
    loopInfo: LoopInfo | null;
    usedUniforms: string[];
    hasOrbitTrap: boolean;
    distanceExpression: string | null;
}

export interface FunctionParameter {
    name: string;
    type: string;
    qualifier?: string;
}

export interface HelperFunctionInfo {
    name: string;
    returnType: string;
    parameters: FunctionParameter[];
    body: string;
    raw: string;
}

export interface LoopInfo {
    type: 'while' | 'for';
    counterVar: string | null;
    counterInitDecl: string | null;
    condition: string;
    body: string;
    hasBreak: boolean;
}

export interface ParamMappingV2 {
    name: string;
    type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'bool';
    mappedSlot: string;
    fixedValue?: string;
    isDegrees?: boolean;
}

export interface TransformedFormulaV2 {
    function: string;
    uniforms: string;
    loopBody: string;
    getDist?: string;
    loopInit?: string;
    warnings: string[];
}

export interface FunctionCandidate {
    name: string;
    returnType: string;
    parameters: FunctionParameter[];
    body: string;
    loopInfo: LoopInfo | null;
    isAutoDetectedDE: boolean;
}

// ============================================================================
// Workshop UI types
// ============================================================================

export interface WorkshopParam {
    name: string;
    type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'bool';
    mappedSlot: string;
    fixedValue: string;
    uiMin: number;
    uiMax: number;
    uiStep: number;
    uiDefault: number | number[];
    isDegrees?: boolean;
}

export interface WorkshopDetection {
    doc: FragDocumentV2;
    candidates: FunctionCandidate[];
    /** Suggested formula name (from preset or file basename) */
    suggestedName: string;
    /** Auto-detected best function to use as DE */
    selectedFunction: string;
    loopMode: 'loop' | 'single';
    uniforms: FragUniform[];
    params: WorkshopParam[];
    warnings: string[];
}
