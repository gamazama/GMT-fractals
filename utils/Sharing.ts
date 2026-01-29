
import { FractalStoreState, Preset } from '../types';
import { featureRegistry } from '../engine/FeatureSystem';
import { UrlStateEncoder } from './UrlStateEncoder';
import { getFullDefaultPreset } from './PresetLogic';

const ROOT_SKELETON: Partial<Preset> = {
    formula: 'Mandelbulb' as any,
    cameraPos: { x: 0, y: 0, z: 0 },
    cameraRot: { x: 0, y: 0, z: 0, w: 1 },
    sceneOffset: { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 },
    targetDistance: 3.5,
    cameraMode: 'Orbit'
};

export const generateShareString = (state: FractalStoreState, options: { includeAnimations?: boolean } = { includeAnimations: true }): string => {
    try {
        // Use the store's getPreset via a passed-in function or accessing the full object structure manually?
        // Since we passed 'state', we assume it's the full store state. 
        // Ideally we shouldn't depend on store methods here, so we partially replicate getPreset logic OR 
        // we accept the Preset object as input. Let's accept State and use getPreset from the store actions if available,
        // but here we are in a utility.
        // Better: The caller should pass the *Preset* object, not the State.
        // Wait, the store calls this. Let's make it accept the Preset.
        throw new Error("Use generateShareStringFromPreset instead");
    } catch (e) {
        return "";
    }
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
