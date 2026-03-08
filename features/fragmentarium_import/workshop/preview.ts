/**
 * Workshop preview helpers.
 * Builds TransformedFormulaV2 from the current workshop state.
 */

import type { WorkshopDetection, WorkshopParam, ParamMappingV2, TransformedFormulaV2, FragDocumentV2 } from '../types';
import { analyzeAsDE } from '../parsers/ast-parser';
import { generateFormulaCode } from '../transform/code-generator';

export const PREVIEW_ID = 'frag_workshop_preview';

export function buildTransformResult(
    detected: WorkshopDetection,
    selectedFunctionName: string,
    loopMode: 'loop' | 'single',
    formulaName: string,
    mappings: WorkshopParam[],
): TransformedFormulaV2 | null {
    const selectedDE = analyzeAsDE(selectedFunctionName, detected.doc);
    if (!selectedDE) return null;

    const reclassifiedDoc: FragDocumentV2 = {
        ...detected.doc,
        deFunction: loopMode === 'single' ? { ...selectedDE, loopInfo: null } : selectedDE,
        helperFunctions: detected.doc.helperFunctions.filter(h => h.name !== selectedFunctionName),
    };

    const v2Mappings: ParamMappingV2[] = mappings.map(m => ({
        name: m.name,
        type: m.type,
        mappedSlot: m.mappedSlot === 'builtin' ? 'uIterations' : m.mappedSlot,
        fixedValue: m.mappedSlot === 'fixed' ? m.fixedValue : undefined,
        isDegrees: m.isDegrees,
    }));

    return generateFormulaCode(reclassifiedDoc, formulaName, v2Mappings);
}
