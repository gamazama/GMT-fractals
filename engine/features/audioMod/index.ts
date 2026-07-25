/**
 * Audio feature — the audio-modulation rig's DDFS state.
 *
 * @invariant While `isEnabled` is true this slice is LIVE SESSION state: a
 *   scene load / formula switch leaves it (and `modulation`) untouched. See
 *   `holdsLiveSession` below.
 * @see docs/adr/0103-live-session-state-survives-scene-load.md
 */
import { FeatureDefinition } from '../../../engine/FeatureSystem';

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
        condition: { param: 'isEnabled', bool: true }
    },
    menuConfig: {
        label: 'Audio Modulation',
        toggleParam: 'isEnabled'
    },
    // A RUNNING audio engine is performance equipment, not scene content: it is
    // wired to a live mic / line-in / deck, and a scene load mid-set must not
    // silently switch it off (which is what happened before — a preset that
    // omits `audio` reset every param to its default, `isEnabled: false`
    // included, taking the panel and all modulation with it).
    // False while idle, so a boot or share-link load still restores a rig the
    // scene actually saved.
    holdsLiveSession: (live) => !!live.isEnabled,
    params: {
        isEnabled: { type: 'boolean', default: false, label: 'Enable Audio Engine', shortId: 'en', group: 'system', noAccumReset: true, preserveOnApply: true },
        smoothing: { type: 'float', default: 0.8, label: 'FFT Smoothing', shortId: 'sm', group: 'system', noAccumReset: true, preserveOnApply: true, min: 0, max: 0.99, step: 0.01 },
        threshold: { type: 'float', default: 0.1, label: 'Gate Threshold', shortId: 'gt', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        agcEnabled: { type: 'boolean', default: false, label: 'AGC', shortId: 'ag', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        attack: { type: 'float', default: 0.1, label: 'Global Attack', shortId: 'ga', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        decay: { type: 'float', default: 0.3, label: 'Global Decay', shortId: 'gd', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        highPass: { type: 'float', default: 20, label: 'High Pass', shortId: 'hp', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        lowPass: { type: 'float', default: 20000, label: 'Low Pass', shortId: 'lp', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        gain: { type: 'float', default: 0.8, label: 'Volume', shortId: 'vl', group: 'system', noAccumReset: true, preserveOnApply: true, min: 0, max: 2, step: 0.01 }
    },
};
