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
    inputGain: number;
    fftSize: number;
    dbFloor: number;
    dbCeiling: number;
    bandsPerOctave: number;
    normalizeBands: boolean;
    spectralTilt: number;
}

// AudioActions removed - link management is now in ModulationActions

// --- FEATURE DEFINITION ---

export const AudioFeature: FeatureDefinition = {
    id: 'audio',
    shortId: 'au',
    name: 'Audio',
    category: 'Audio',
    // NO `condition` here, deliberately. Gating the tab on `isEnabled` hid the
    // panel the moment audio was switched off — including the control that
    // switches it back on, which left the feature reachable only from the menu.
    // The panel carries its own engine toggle in its header instead.
    tabConfig: {
        label: 'Audio',
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
        // Auto gain: normalises the whole spectrum against a slow-release peak
        // follower, so a quieter track drives the same range without re-dialling
        // every rule's threshold. Was declared-but-unread until 2026-07-25.
        agcEnabled: {
            type: 'boolean', default: false, label: 'Auto Gain', shortId: 'ag', group: 'system',
            noAccumReset: true, preserveOnApply: true,
            description: 'Track the input level and normalise it, so thresholds keep working when the music gets quieter or louder.',
        },
        attack: { type: 'float', default: 0.1, label: 'Global Attack', shortId: 'ga', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        decay: { type: 'float', default: 0.3, label: 'Global Decay', shortId: 'gd', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        highPass: { type: 'float', default: 20, label: 'High Pass', shortId: 'hp', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        lowPass: { type: 'float', default: 20000, label: 'Low Pass', shortId: 'lp', group: 'hidden', hidden: true, noAccumReset: true, preserveOnApply: true },
        gain: { type: 'float', default: 0.8, label: 'Volume', shortId: 'vl', group: 'system', noAccumReset: true, preserveOnApply: true, min: 0, max: 2, step: 0.01 },
        // Trim on the LIVE capture only (mic / line-in / system audio), applied
        // before the analyser. Distinct from `gain` above, which is monitoring
        // volume on the deck path: a room mic or a quiet line feed needs to be
        // boosted INTO the FFT without anything getting louder in the room.
        inputGain: { type: 'float', default: 1.0, label: 'Input Trim', shortId: 'ig', group: 'system', noAccumReset: true, preserveOnApply: true, min: 0, max: 8, step: 0.05 },
        // Frequency-vs-time resolution. Bin width is sampleRate/fftSize and the
        // analysis window is fftSize/sampleRate, so finer bins cost attack
        // sharpness. 2048 (the old fixed value) put only ~3 bins across a
        // 40-120Hz kick band, which is why a kick could not drive a clean
        // signal. @see AudioAnalysisEngine.setFftSize
        fftSize: {
            type: 'float', default: 4096, label: 'Analysis Detail', shortId: 'fz', group: 'system',
            noAccumReset: true, preserveOnApply: true,
            options: [
                { label: 'Fast (23 Hz, punchy)', value: 2048 },
                { label: 'Balanced (12 Hz)', value: 4096 },
                { label: 'Fine (6 Hz, bass detail)', value: 8192 },
            ],
            description: 'Finer bins separate bass better; coarser bins react faster to attacks.',
        },
        // Dynamic range mapped onto the 0-255 spectrum. WebAudio's defaults
        // (-100/-30) pin anything above -30 dBFS at full scale, which is what
        // made loud material read as a flat saturated wall.
        dbFloor: {
            type: 'float', default: -90, label: 'Floor', shortId: 'df', group: 'system',
            noAccumReset: true, preserveOnApply: true, min: -120, max: -40, step: 1,
            format: (v) => `${Math.round(v)} dB`,
            description: 'Quietest level the spectrum shows. Raise it to keep room noise out of the bottom.',
        },
        dbCeiling: {
            type: 'float', default: -10, label: 'Ceiling', shortId: 'dc', group: 'system',
            noAccumReset: true, preserveOnApply: true, min: -40, max: 0, step: 1,
            format: (v) => `${Math.round(v)} dB`,
            description: 'Loudest level before the spectrum saturates. Lower it for a hotter, more contrasty reading.',
        },
        // Fractional-octave band width. Bands are the same MUSICAL width at
        // every frequency, so the bass gets as many as the treble — a linear
        // FFT gives the whole kick octave 3 bins and the top octave 683.
        // @see engine/features/audioMod/filterBank.ts
        bandsPerOctave: {
            type: 'float', default: 6, label: 'Band Width', shortId: 'bo', group: 'system',
            noAccumReset: true, preserveOnApply: true,
            options: [
                { label: 'Wide — 1/3 octave', value: 3 },
                { label: 'Medium — 1/6 octave', value: 6 },
                { label: 'Narrow — 1/12 octave', value: 12 },
            ],
            description: 'How finely the spectrum is divided. Narrower bands separate more, but need a finer Detail setting to stay honest in the bass.',
        },
        // Per-band adaptive gain. Each band divides by its own slow-release
        // peak, so quiet bands (hi-hats are always far below a kick) still use
        // the full range. Defaults OFF and should stay that way — the A/B on
        // real material found it costs more spectral contrast than it buys.
        // @see docs/adr/0105-per-band-adaptive-gain-rejected.md and the
        // NORMALIZE_* block in filterBank.ts. Kept as an option, not for
        // compatibility — `nb` was never pushed, so nothing in the wild has it.
        normalizeBands: {
            type: 'boolean', default: false, label: 'Balance Bands', shortId: 'nb', group: 'system',
            noAccumReset: true, preserveOnApply: true,
            description: 'Let every frequency band self-calibrate, so quiet bands react as readily as loud ones. Trades spectral contrast for consistency — off usually reads better.',
        },
        // Fixed spectral tilt. Unlike Balance Bands this is the SAME dB offset
        // every frame, so it lifts the highs without flattening anything — it
        // is the answer ADR-0105 points at. +3 dB/oct makes pink noise read
        // flat given the mean-power statistic; see filterBank's TILT_* block.
        spectralTilt: {
            type: 'float', default: 3, label: 'Tilt', shortId: 'st', group: 'system',
            noAccumReset: true, preserveOnApply: true,
            min: 0, max: 6, step: 0.5,
            description: 'Lift the high bands to compensate for music\'s natural roll-off. A fixed offset, so it costs no dynamics — 3 is neutral for typical material, 0 is the raw spectrum.',
        },
    },
};
