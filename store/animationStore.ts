
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

// Dev-console handle (matching the __camera / __animEngine / __store
// pattern). Production code uses the imported reference directly —
// the cross-store access path that previously needed this handle was
// resolved by importing animationStore eagerly into engineStore (no
// cycle: animationStore depends only on its own slice files).
if (typeof window !== 'undefined') {
    (window as any).useAnimationStore = useAnimationStore;
}
