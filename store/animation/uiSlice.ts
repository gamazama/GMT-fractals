import { StateCreator } from 'zustand';
import { AnimationStore, UiSliceState, UiSliceActions } from './types';
import { TIMELINE_SIDEBAR_WIDTH } from '../../data/constants';

const DEFAULT_COLLAPSED = ['Formula', 'Optics', 'Lighting', 'Shading'];
const MIN_SIDEBAR_W = 140;
const MAX_SIDEBAR_W = 480;

export const createUiSlice: StateCreator<
    AnimationStore,
    [["zustand/subscribeWithSelector", never]],
    [],
    UiSliceState & UiSliceActions
> = (set) => ({
    collapsedGroups: [...DEFAULT_COLLAPSED],
    timelineSidebarWidth: TIMELINE_SIDEBAR_WIDTH,

    toggleCollapsedGroup: (name, isAlt, allGroupNames) => set(state => {
        if (isAlt && allGroupNames && allGroupNames.length > 0) {
            // Solo: collapse all groups except `name`.
            return { collapsedGroups: allGroupNames.filter(g => g !== name) };
        }
        const has = state.collapsedGroups.includes(name);
        return {
            collapsedGroups: has
                ? state.collapsedGroups.filter(g => g !== name)
                : [...state.collapsedGroups, name]
        };
    }),

    setCollapsedGroups: (groups) => set({ collapsedGroups: [...groups] }),

    setTimelineSidebarWidth: (w) => set(state => {
        const clamped = Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, Math.round(w)));
        return clamped === state.timelineSidebarWidth ? {} : { timelineSidebarWidth: clamped };
    }),
});
