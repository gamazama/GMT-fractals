
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AnimationStore } from './animation/types';
import { createPlaybackSlice } from './animation/playbackSlice';
import { createSelectionSlice } from './animation/selectionSlice';
import { createSequenceSlice } from './animation/sequenceSlice';

export const useAnimationStore = create<AnimationStore>()(subscribeWithSelector((set, get, api) => ({
    ...createPlaybackSlice(set, get, api),
    ...createSelectionSlice(set, get, api),
    ...createSequenceSlice(set, get, api)
})));

// Expose for FractalStore to avoid circular dependency lookup issues during save
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.useAnimationStore = useAnimationStore;
}
