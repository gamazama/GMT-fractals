/**
 * Modulation feature — the durable store of modulation-link routing.
 *
 * @invariant `rules[].target` is one of THREE durable routing-string stores
 *   (with `animationStore.sequence.tracks` and `engineStore.animations`). Any
 *   code that renames DDFS param ids — weave rebuilds are the live case — must
 *   update all three or links silently drive the wrong param.
 *   @see engine-gmt/animation/retargetTracks.ts
 * @invariant Held across scene loads while the audio engine is running.
 *   @see docs/adr/0103-live-session-state-survives-scene-load.md
 */
import { FeatureDefinition } from '../../../engine/FeatureSystem';
import { nanoid } from 'nanoid';

// --- CONSTANTS ---
const PRESET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

// --- TYPES ---
export type ModulationSource = 'audio' | 'lfo-1' | 'lfo-2' | 'lfo-3';

/**
 * How an audio band is turned into a signal.
 *
 * - `level`     — the band's average magnitude. Follows loudness; the param
 *                 sits high for as long as the sound is present.
 * - `transient` — positive spectral flux: how fast the band is GETTING louder.
 *                 Near-zero on a sustained pad, spikes on a kick or snare hit.
 *                 This is what makes a param punch on the beat and fall back
 *                 between beats, which level-following cannot do (it lags the
 *                 attack and holds through the sustain).
 *
 * Absent on rules authored before transient mode; treated as `level`.
 */
export type ModulationMode = 'level' | 'transient';

export interface ModulationRule {
    id: string;
    target: string;
    enabled: boolean;
    name?: string;
    color: string;
    
    source: ModulationSource;
    
    /** Audio band, in REAL Hz — not a fraction of nyquist.
     *
     *  @invariant Hz is device-independent. The previous representation was a
     *    fraction of nyquist, so the same rule selected a different frequency
     *    range on a 44.1 kHz device than on a 48 kHz one, and a share link
     *    could not mean one thing. It also baked a LINEAR FFT axis into
     *    persisted data, which every non-FFT analysis backend would have had
     *    to keep emulating. Migrated by `app-gmt.modulation-band-to-hz` (v7).
     *  @see docs/adr/0106-modulation-bands-in-hz.md */
    lowHz: number;
    highHz: number;
    thresholdMin: number; // Noise Gate
    thresholdMax: number; // Ceiling
    /** Level-following vs onset detection. Optional for back-compat — rules
     *  saved before transient mode have no `mode` and read as 'level'. */
    mode?: ModulationMode;
    
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
    // The links belong to the same live rig as the audio engine, so they are
    // held on the same condition: audio running AND at least one rule to
    // protect. Gating on `audio.isEnabled` (rather than on rules alone) keeps
    // LFO-only scenes fully scene-driven — their rules load from the file as
    // before, since nothing is performing.
    holdsLiveSession: (live, store) =>
        !!(store.audio as { isEnabled?: boolean } | undefined)?.isEnabled
        && ((live.rules as unknown[] | undefined)?.length ?? 0) > 0,
    actions: {
        addModulation: (state: ModulationState, payload: { target: string, source?: ModulationSource }) => {
            const color = PRESET_COLORS[state.rules.length % PRESET_COLORS.length];
            const newRule: ModulationRule = {
                id: nanoid(),
                target: payload.target,
                source: payload.source || 'audio',
                enabled: true,
                color,
                
                // Defaults designed for Audio, harmless for LFO. 0–4800 Hz is
                // exactly what the old 0.0–0.2 nyquist-fraction default meant
                // at 48 kHz; kept identical so the migration is a pure change
                // of representation.
                lowHz: 0,
                highHz: 4800,
                thresholdMin: 0.1,
                thresholdMax: 1.0,
                mode: 'level',

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
    params: {
        // Expose to DDFS for persistence and URL shortening
        rules: { type: 'complex', default: [], label: 'Rules', shortId: 'rl', group: 'data', hidden: true, noAccumReset: true, preserveOnApply: true },
        selectedRuleId: { type: 'complex', default: null, label: 'Selection', shortId: 'sr', group: 'data', hidden: true, noAccumReset: true, preserveOnApply: true }
    }
};
