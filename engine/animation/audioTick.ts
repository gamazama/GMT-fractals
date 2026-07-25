/**
 * audioTick — analysis as its own registered tick.
 *
 * Lifted out of `AnimationSystem` (ADR-0110). It was step 2 of that file's
 * tick, which meant audio analysis only ran for apps using GMT's dispatcher —
 * `installModulation()`'s generic path never called it. Registering separately
 * makes the ordering explicit and lets any app opt in.
 *
 * @invariant Registered at `TICK_PHASE.SNAPSHOT`, which runs BEFORE
 *   `ANIMATE`. The modulation dispatch reads `filterBank` during ANIMATE, so
 *   analysis has to have filled it already. The old in-line arrangement got
 *   this right by accident of statement order; a separate registration has to
 *   state it.
 * @invariant AGC, band count and tilt are passed per tick rather than latched,
 *   so the store's live value always wins — including for a rig whose panel is
 *   closed or one restored by a scene load.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
import { registerTick, TICK_PHASE } from '../TickRegistry';
import { useEngineStore } from '../../store/engineStore';
import { audioAnalysisEngine } from '../features/audioMod/AudioAnalysisEngine';
import type { AudioState } from '../features/audioMod';

let _unregister: (() => void) | null = null;

export const installAudioAnalysis = () => {
    if (_unregister) return;
    _unregister = registerTick('engine.audio', TICK_PHASE.SNAPSHOT, (delta) => {
        const audio = (useEngineStore.getState() as any).audio as AudioState | undefined;
        if (!audio || !audio.isEnabled) return;

        audioAnalysisEngine.setBackend((audio.analysisBackend ?? 0) === 1 ? 'worklet' : 'analyser');
        audioAnalysisEngine.update(
            !!audio.agcEnabled,
            delta,
            audio.bandsPerOctave ?? 6,
            !!audio.normalizeBands,
            audio.spectralTilt ?? 3,
        );
    });
};

export const uninstallAudioAnalysis = () => {
    _unregister?.();
    _unregister = null;
};
