// Types
export type {
    FragUniform, FragPreset, FragDocument,
    GenericFragDocument, ParamMapping, TransformedFormula,
    FragDocumentV2, ParamMappingV2, TransformedFormulaV2,
    DEFunctionInfo, HelperFunctionInfo, LoopInfo, FunctionCandidate,
    WorkshopParam, WorkshopDetection,
} from './types';

// Main UI component
export { FormulaWorkshop } from './FormulaWorkshop';

// Workshop utilities
export { detectFormula } from './workshop/detection';
export { PREVIEW_ID, buildTransformResult } from './workshop/preview';
export { buildWorkshopParams, buildFractalParams } from './workshop/param-builder';

// Parsers
export { parseFragmentariumSource, getAllFunctionCandidates, autoMapParams, analyzeAsDE } from './parsers/ast-parser';
export { GenericFragmentariumParser } from './parsers/uniform-parser';
