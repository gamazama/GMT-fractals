/**
 * Workshop detection — pure function that analyses GLSL source and returns
 * everything the Workshop UI needs to display Step 1-3.
 */

import type { FragDocumentV2, FunctionCandidate, ParamMappingV2, WorkshopDetection } from '../types';
import type { FragUniform } from '../types';
import { GenericFragmentariumParser } from '../parsers/uniform-parser';
import {
    parseFragmentariumSource,
    getAllFunctionCandidates,
    autoMapParams,
    hasProvidesColor,
    analyzeAsDE,
} from '../parsers/ast-parser';
import { buildWorkshopParams } from './param-builder';
import { detectDECFormat } from '../parsers/dec-detector';
import { preprocessDEC } from '../parsers/dec-preprocessor';

export function detectFormula(src: string, fileBaseName?: string): WorkshopDetection | { error: string } {
    if (!src.trim()) return { error: 'No source provided.' };

    try {
        // DEC preprocessing: detect raw DE snippets and transform to Fragmentarium format
        let processedSrc = src;
        const decWarnings: string[] = [];
        const decResult = detectDECFormat(src);
        if (decResult.isDEC && decResult.confidence > 0.4) {
            const preprocessed = preprocessDEC(src);
            processedSrc = preprocessed.fragmentariumSource;
            decWarnings.push(
                `DEC format detected (confidence ${(decResult.confidence * 100).toFixed(0)}%). ` +
                `${preprocessed.expandedMacros.length} macro(s) expanded, ` +
                `${preprocessed.extractedConstants.length} constant(s) promoted to uniforms.`
            );
            decWarnings.push(...preprocessed.warnings);
        }

        let v1Doc;
        try { v1Doc = GenericFragmentariumParser.parse(processedSrc); } catch (_) {}

        const doc = parseFragmentariumSource(processedSrc, v1Doc);
        const candidates = getAllFunctionCandidates(doc);

        if (candidates.length === 0) {
            return { error: 'No GLSL functions found. Make sure the code contains at least one function definition.' };
        }

        const warnings: string[] = [...decWarnings];
        if (hasProvidesColor(processedSrc)) {
            warnings.push('This formula uses providesColor — color output is not supported by GMT. Only the distance estimator will be imported.');
        }
        if (doc.includes.length > 0) {
            warnings.push(`External includes: ${doc.includes.join(', ')} — not resolved automatically. Inline the required helpers manually.`);
        }

        const suggested =
            candidates.find(c => c.isAutoDetectedDE) ??
            candidates.find(c => c.loopInfo !== null) ??
            candidates[0];

        const autoMappings = autoMapParams(doc);
        const firstPreset  = doc.presets?.[0]?.values;
        const params       = buildWorkshopParams(doc.uniforms, autoMappings, firstPreset);

        let suggestedName = fileBaseName || '';
        if (!suggestedName) {
            const presetName = v1Doc?.presets?.[0]?.name;
            if (presetName) {
                const clean = presetName.replace(/[^a-zA-Z0-9_]/g, '');
                if (clean) suggestedName = clean;
            }
        }
        // Fall back to the detected function name (strip common prefixes like "DE_")
        if (!suggestedName && suggested) {
            const fn = suggested.name.replace(/^(DE_|de_|sdf_|SDF_)/, '');
            const clean = fn.replace(/[^a-zA-Z0-9_]/g, '');
            if (clean && clean !== 'DE' && clean !== 'de') suggestedName = clean;
        }

        return {
            doc,
            candidates,
            suggestedName,
            selectedFunction: suggested.name,
            loopMode: suggested.loopInfo !== null ? 'loop' : 'single',
            uniforms: doc.uniforms,
            params,
            warnings,
        };
    } catch (e) {
        return { error: 'Detection failed: ' + (e instanceof Error ? e.message : String(e)) };
    }
}
