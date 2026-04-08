/**
 * V3 ↔ V2 Compatibility Adapter
 *
 * Bridges V3's FormulaAnalysis/GeneratedFormula types with V2's Workshop types
 * so the Workshop UI can switch to V3 analysis+generation without changing its
 * component code.
 *
 * Temporary — will be removed when the Workshop reads V3 types directly.
 */

import type {
    FormulaAnalysis,
    FunctionAnalysis,
    ImportedParam,
    GeneratedFormula,
} from './types';

import type {
    WorkshopDetection,
    WorkshopParam,
    TransformedFormulaV2,
    FunctionCandidate,
    FragDocumentV2,
    FragUniform,
    LoopInfo,
    DEFunctionInfo,
    HelperFunctionInfo,
} from '../types';

import { analyzeSource } from './analyze/index';
import { generateFormula } from './generate/index';
import { autoAssignSlots } from './generate/slots';
import { detectDECFormat } from '../parsers/dec-detector';
import { preprocessDEC } from '../parsers/dec-preprocessor';

// ============================================================================
// V3 Analysis → V2 WorkshopDetection
// ============================================================================

/**
 * Run V3 analysis and return a V2-shaped WorkshopDetection.
 * Drop-in replacement for `detectFormula()`.
 */
export function detectFormulaV3(
    source: string,
    fileBaseName?: string,
): WorkshopDetection | { error: string } {
    // Run DEC preprocessing if the source is raw DEC format (same as V2)
    let processedSource = source;
    const decResult = detectDECFormat(source);
    if (decResult.isDEC && decResult.confidence > 0.4) {
        const preprocessed = preprocessDEC(source);
        processedSource = preprocessed.fragmentariumSource;
    }

    const result = analyzeSource(processedSource, fileBaseName);
    if (!result.ok) {
        return { error: result.error };
    }
    // If no function is auto-detected as DE and none have the standard 'de' name,
    // V3 can't handle this formula (e.g. 2D systems hosted by an include raytracer).
    // Return error so V2 can take over.
    const hasDE = result.value.functions.some(f => f.isAutoDetectedDE)
        || result.value.functions.some(f => f.name === 'de');
    if (!hasDE) {
        return { error: 'No DE function detected (2D or include-based raytracer)' };
    }
    return analysisToDetection(result.value, fileBaseName);
}

function v3LoopToV2(loop: FunctionAnalysis['loop']): LoopInfo | null {
    if (!loop) return null;
    return {
        type: loop.type,
        counterVar: loop.counterVar,
        counterInitDecl: loop.counterInitDecl,
        condition: loop.condition,
        body: loop.body,
        hasBreak: loop.hasBreak,
    };
}

function analysisToDetection(
    analysis: FormulaAnalysis,
    fileBaseName?: string,
): WorkshopDetection {
    // Build FunctionCandidate[] from FunctionAnalysis[]
    const candidates: FunctionCandidate[] = analysis.functions.map(f => ({
        name: f.name,
        returnType: f.returnType,
        parameters: f.parameters,
        body: f.body,
        loopInfo: v3LoopToV2(f.loop),
        isAutoDetectedDE: f.isAutoDetectedDE,
    }));

    // Find selected function (auto-detected DE or first)
    const selectedFunc = analysis.functions.find(f => f.isAutoDetectedDE)
        ?? analysis.functions.find(f => f.name === 'de')
        ?? analysis.functions[0];
    const selectedFunction = selectedFunc?.name ?? '';
    const loopMode = selectedFunc?.loop ? 'loop' as const : 'single' as const;

    // Convert ImportedParam[] → WorkshopParam[] with auto-assigned slots
    const paramsWithSlots = autoAssignSlots([...analysis.params]);
    const params = paramsWithSlots.map(importedToWorkshop);

    // Build FragUniform[] (for V2 compat)
    const uniforms: FragUniform[] = analysis.params.map(p => ({
        name: p.name,
        type: p.type,
        uiType: p.type === 'bool' ? 'checkbox' as const : 'slider' as const,
        default: Array.isArray(p.default) ? p.default : p.default,
        min: p.range.min,
        max: p.range.max,
        step: p.range.step,
        isDegrees: p.isDegrees || undefined,
    }));

    // Suggested name: prefer file basename over preset name (presets are often just "Default")
    // Sanitize to valid C identifier (GLSL function name): strip non-alphanumeric, ensure starts with letter
    const rawName = fileBaseName
        || analysis.presets[0]?.name
        || 'imported';
    const suggestedName = rawName.replace(/[^a-zA-Z0-9_]/g, '') || 'imported';

    // Build a minimal FragDocumentV2 for V2 compat
    const deFunction: DEFunctionInfo | null = selectedFunc ? {
        name: selectedFunc.name,
        returnType: selectedFunc.returnType,
        parameters: selectedFunc.parameters,
        body: selectedFunc.body,
        loopInfo: v3LoopToV2(selectedFunc.loop),
        usedUniforms: selectedFunc.usedParams,
        hasOrbitTrap: selectedFunc.hasOrbitTrap,
        distanceExpression: selectedFunc.distanceExpression,
    } : null;

    const helperFunctions: HelperFunctionInfo[] = analysis.functions
        .filter(f => f.name !== selectedFunction)
        .map(f => ({
            name: f.name,
            returnType: f.returnType,
            parameters: f.parameters,
            body: f.body,
            raw: f.raw,
        }));

    const doc: FragDocumentV2 = {
        uniforms,
        presets: analysis.presets.map(p => ({ name: p.name, values: p.values })),
        deFunction,
        helperFunctions,
        initFunction: null,
        includes: analysis.includes,
        rawGLSL: analysis.source,
        computedGlobals: analysis.globals.computed.map(g => ({
            type: g.type,
            name: g.name,
            expression: g.expression,
        })),
        globalDecls: analysis.globals.uninitialized.map(g => ({
            type: g.type,
            name: g.name,
        })),
    };

    return {
        doc,
        candidates,
        suggestedName,
        selectedFunction,
        loopMode,
        uniforms,
        params,
        warnings: analysis.warnings,
    };
}

// ============================================================================
// V3 Generation → V2 TransformedFormulaV2
// ============================================================================

/**
 * Run V3 generation and return a V2-shaped TransformedFormulaV2.
 * Drop-in replacement for `buildTransformResult()`.
 */
export function transformFormulaV3(
    detection: WorkshopDetection,
    selectedFunction: string,
    loopMode: 'loop' | 'single',
    formulaName: string,
    mappings: WorkshopParam[],
): TransformedFormulaV2 | null {
    // Re-analyze from source (detection.doc.rawGLSL)
    const result = analyzeSource(detection.doc.rawGLSL);
    if (!result.ok) return null;

    // Convert WorkshopParam[] → ImportedParam[]
    const params = mappings.map(workshopToImported);

    // Run V3 generation
    const gen = generateFormula(result.value, selectedFunction, loopMode, formulaName, params);
    if (!gen.ok) return null;

    return generatedToTransformed(gen.value);
}

function generatedToTransformed(gen: GeneratedFormula): TransformedFormulaV2 {
    return {
        function: gen.functionCode,
        uniforms: gen.uniformDeclarations,
        loopBody: gen.loopBodyCall,
        getDist: gen.getDist,
        loopInit: gen.loopInit,
        warnings: gen.warnings,
    };
}

// ============================================================================
// ImportedParam ↔ WorkshopParam conversion
// ============================================================================

export function importedToWorkshop(p: ImportedParam): WorkshopParam {
    return {
        name: p.name,
        type: p.type,
        mappedSlot: p.slot || 'ignore',
        fixedValue: p.fixedValue ?? formatDefault(p),
        uiMin: p.range.min,
        uiMax: p.range.max,
        uiStep: p.range.step,
        uiDefault: p.default,
        isDegrees: p.isDegrees || undefined,
    };
}

export function workshopToImported(p: WorkshopParam): ImportedParam {
    return {
        name: p.name,
        type: p.type,
        default: p.uiDefault,
        range: { min: p.uiMin, max: p.uiMax, step: p.uiStep },
        isDegrees: p.isDegrees ?? false,
        slot: p.mappedSlot === 'ignore' ? '' : p.mappedSlot,
        fixedValue: p.fixedValue,
    };
}

function formatDefault(p: ImportedParam): string {
    if (Array.isArray(p.default)) {
        return p.default.map(v => v.toFixed(6)).join(', ');
    }
    return String(p.default);
}
