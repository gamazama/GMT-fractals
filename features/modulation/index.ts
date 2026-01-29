
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { nanoid } from 'nanoid';

// --- CONSTANTS ---
const PRESET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

// --- TYPES ---
export type ModulationSource = 'audio' | 'lfo-1' | 'lfo-2' | 'lfo-3';

export interface ModulationRule {
    id: string;
    target: string;
    enabled: boolean;
    name?: string;
    color: string;
    
    source: ModulationSource;
    
    // Audio Specifics (Frequency Range)
    freqStart: number;
    freqEnd: number;
    thresholdMin: number; // Noise Gate
    thresholdMax: number; // Ceiling
    
    // Envelope (Used for Audio, maybe future LFO smoothing)
    attack: number;
    decay: number;
    
    // Post-Process
    smoothing: number; // Secondary LPF (Lerp)
    
    // Output Transform
    gain: number;
    offset: number;
}

export interface ModulationState {
    rules: ModulationRule[];
    selectedRuleId: string | null;
}

export interface ModulationActions {
    addModulation: (payload: { target: string, source?: ModulationSource }) => void;
    removeModulation: (id: string) => void;
    updateModulation: (payload: { id: string, update: Partial<ModulationRule> }) => void;
    selectModulation: (id: string | null) => void;
}

// --- FEATURE DEFINITION ---
export const ModulationFeature: FeatureDefinition = {
    id: 'modulation',
    shortId: 'mod',
    name: 'Modulation',
    category: 'System',
    state: {
        rules: [],
        selectedRuleId: null
    },
    actions: {
        addModulation: (state: ModulationState, payload: { target: string, source?: ModulationSource }) => {
            const color = PRESET_COLORS[state.rules.length % PRESET_COLORS.length];
            const newRule: ModulationRule = {
                id: nanoid(),
                target: payload.target,
                source: payload.source || 'audio',
                enabled: true,
                color,
                
                // Defaults designed for Audio, harmless for LFO
                freqStart: 0.0,
                freqEnd: 0.2, 
                thresholdMin: 0.1,
                thresholdMax: 1.0,
                
                attack: 0.1,
                decay: 0.3,
                smoothing: 0.0,
                
                gain: 1.0,
                offset: 0.0
            };
            return {
                rules: [...state.rules, newRule],
                selectedRuleId: newRule.id
            };
        },
        removeModulation: (state: ModulationState, id: string) => {
            return {
                rules: state.rules.filter(r => r.id !== id),
                selectedRuleId: state.selectedRuleId === id ? null : state.selectedRuleId
            };
        },
        updateModulation: (state: ModulationState, payload: { id: string, update: Partial<ModulationRule> }) => {
            return {
                rules: state.rules.map(r => r.id === payload.id ? { ...r, ...payload.update } : r)
            };
        },
        selectModulation: (state: ModulationState, id: string | null) => {
            return { selectedRuleId: id };
        }
    },
    // We don't expose params to UI auto-generation as this needs a custom editor (Spectrum/List)
    params: {} 
};
