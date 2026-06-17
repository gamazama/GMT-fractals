
import { Preset } from '../types';
import { featureRegistry } from '../engine/FeatureSystem';
import { UrlStateEncoder } from './UrlStateEncoder';
import { getFullDefaultPreset } from './PresetLogic';

// Root skeleton for URL-encoding peek pass. The `formula` field is a
// non-empty placeholder so the encoder can locate the formula tag in
// the compressed payload during the two-pass decode. Apps that use a
// different tag name can still round-trip — the peek only needs *some*
// string there.
const ROOT_SKELETON: Partial<Preset> = {
    formula: '_peek_' as any,
    cameraPos: { x: 0, y: 0, z: 0 },
    cameraRot: { x: 0, y: 0, z: 0, w: 1 },
    sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
    targetDistance: 3.5,
    cameraMode: 'Orbit',
};

export const generateShareStringFromPreset = (preset: Preset, advancedMode: boolean, options: { includeAnimations?: boolean } = { includeAnimations: true }): string => {
    try {
        // Decouple Render Settings (Strip Resolution, AA, etc. for portability)
        if (preset.quality) {
            delete preset.quality.aaLevel;
            delete preset.quality.aaMode;
            delete preset.quality.msaa;
        }
        if (preset.features && preset.features['quality']) {
             delete preset.features['quality'].resolutionMode;
        }

        // --- ANIMATION STRIPPING ---
        // Check strictly for false to allow undefined/default to imply true
        if (options.includeAnimations === false) {
            delete preset.sequence;
            delete preset.animations;
            // Modulation features might contain animation-like data, but usually small enough to keep
        }

        const baseTemplate = getFullDefaultPreset(preset.formula);
        baseTemplate.formula = "" as any; // Ensure diff works against base

        const dictionary = featureRegistry.getDictionary();
        const encoder = new UrlStateEncoder(baseTemplate, dictionary);
        return encoder.encode(preset, advancedMode);
    } catch (e) {
        console.error("Sharing: Failed to generate share string", e);
        return "";
    }
};

export const parseShareString = (str: string): Preset | null => {
    if (!str) return null;
    try {
        const dictionary = featureRegistry.getDictionary();
        // 1. Peek to find Formula using Skeleton
        const peeker = new UrlStateEncoder(ROOT_SKELETON as any, dictionary);
        const peeked = peeker.decode(str);
        
        if (peeked && peeked.formula) {
            // 2. Decode fully using Formula Template
            const baseTemplate = getFullDefaultPreset(peeked.formula);
            const encoder = new UrlStateEncoder(baseTemplate, dictionary);
            const decoded = encoder.decode(str);
            
            return decoded as Preset;
        }
    } catch (e) {
        console.error("Sharing: Failed to load share string", e);
    }
    return null;
};
