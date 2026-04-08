// Compat-layer types (used by V3 compat adapter, Workshop UI, and debug scripts)
export type {
    FragUniform, FragPreset,
    FragDocumentV2, TransformedFormulaV2,
    DEFunctionInfo, HelperFunctionInfo, LoopInfo, FunctionCandidate,
    WorkshopParam, WorkshopDetection,
} from './types';

// V3 types
export type {
    ImportedParam, FormulaAnalysis, GeneratedFormula, FunctionAnalysis,
} from './v3/types';

// Main UI component
export { FormulaWorkshop } from './FormulaWorkshop';

// V3 pipeline
export { detectFormulaV3, transformFormulaV3 } from './v3/compat';
export { analyzeSource } from './v3/analyze/index';
export { generateFormula } from './v3/generate/index';

// Workshop utilities (shared)
export { buildWorkshopParams, buildFractalParams, filterDeadParams } from './workshop/param-builder';

