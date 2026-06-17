import { StateCreator } from 'zustand';
import { AnimationStore, AudioClip, AudioClipsSliceState, AudioClipsSliceActions } from './types';

const blankClips: (AudioClip | null)[] = [null, null];

export const createAudioClipsSlice: StateCreator<
    AnimationStore,
    [["zustand/subscribeWithSelector", never]],
    [],
    AudioClipsSliceState & AudioClipsSliceActions
> = (set) => ({
    audioClips: [...blankClips],

    setAudioClip: (deckIndex, clip) => set(state => {
        const next = [...state.audioClips];
        next[deckIndex] = clip;
        return { audioClips: next };
    }),

    updateAudioClip: (deckIndex, patch) => set(state => {
        const cur = state.audioClips[deckIndex];
        if (!cur) return {};
        const next = [...state.audioClips];
        next[deckIndex] = { ...cur, ...patch };
        return { audioClips: next };
    }),
});
