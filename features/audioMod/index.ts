
import { FeatureDefinition } from '../../engine/FeatureSystem';

// --- TYPE DEFINITIONS ---

export interface AudioState {
    isEnabled: boolean; 
    smoothing: number;  
    threshold: number;
    agcEnabled: boolean;
    attack: number;
    decay: number;
    highPass: number;
    lowPass: number;
    gain: number;
}

// AudioActions removed - link management is now in ModulationActions

// --- FEATURE DEFINITION ---

export const AudioFeature: FeatureDefinition = {
    id: 'audio',
    shortId: 'au',
    name: 'Audio',
    category: 'Audio',
    tabConfig: {
        label: 'Audio',
        componentId: 'panel-audio',
        order: 70,
        condition: { param: 'isEnabled', bool: true }
    },
    menuConfig: {
        label: 'Audio Modulation',
        toggleParam: 'isEnabled'
    },
    params: {
        isEnabled: { type: 'boolean', default: false, label: 'Enable Audio Engine', shortId: 'en', group: 'system', noReset: true },
        threshold: { type: 'float', default: 0.1, label: 'Gate Threshold', shortId: 'gt', group: 'hidden', hidden: true, noReset: true },
        agcEnabled: { type: 'boolean', default: false, label: 'AGC', shortId: 'ag', group: 'hidden', hidden: true, noReset: true },
        attack: { type: 'float', default: 0.1, label: 'Global Attack', shortId: 'ga', group: 'hidden', hidden: true, noReset: true },
        decay: { type: 'float', default: 0.3, label: 'Global Decay', shortId: 'gd', group: 'hidden', hidden: true, noReset: true },
        highPass: { type: 'float', default: 20, label: 'High Pass', shortId: 'hp', group: 'hidden', hidden: true, noReset: true },
        lowPass: { type: 'float', default: 20000, label: 'Low Pass', shortId: 'lp', group: 'hidden', hidden: true, noReset: true },
        gain: { type: 'float', default: 1.0, label: 'Global Gain', shortId: 'gn', group: 'hidden', hidden: true, noReset: true }
    },
    shader: { uniforms: `` }
};
