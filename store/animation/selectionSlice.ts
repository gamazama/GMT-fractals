
import { StateCreator } from 'zustand';
import { AnimationStore, SelectionSliceState, SelectionSliceActions } from './types';
import { SoftSelectionType } from '../../types';

export const createSelectionSlice: StateCreator<AnimationStore, [["zustand/subscribeWithSelector", never]], [], SelectionSliceState & SelectionSliceActions> = (set, get) => ({
    selectedTrackIds: [],
    selectedKeyframeIds: [],
    softSelectionRadius: 0,
    softSelectionEnabled: false,
    softSelectionType: 'S-Curve',
    bounceTension: 0.5,
    bounceFriction: 0.6,

    setTrackSelection: (id) => set({ selectedTrackIds: [id] }),

    toggleTrackSelection: (id) => set(state => ({
        selectedTrackIds: state.selectedTrackIds.includes(id)
            ? state.selectedTrackIds.filter(tid => tid !== id)
            : [...state.selectedTrackIds, id],
    })),

    addTracksToSelection: (ids) => set(state => {
        const current = new Set(state.selectedTrackIds);
        ids.forEach(id => current.add(id));
        return { selectedTrackIds: Array.from(current) };
    }),

    removeTracksFromSelection: (ids) => set(state => {
        const remove = new Set(ids);
        return { selectedTrackIds: state.selectedTrackIds.filter(id => !remove.has(id)) };
    }),

    selectKeyframe: (tid, kid, multi) => set(state => { 
        const cid = `${tid}::${kid}`; 
        return { 
            selectedKeyframeIds: multi 
                ? (state.selectedKeyframeIds.includes(cid) ? state.selectedKeyframeIds.filter(id => id !== cid) : [...state.selectedKeyframeIds, cid]) 
                : [cid] 
        }; 
    }),

    selectKeyframes: (ids, multi) => set(state => ({ 
        selectedKeyframeIds: multi 
            ? Array.from(new Set([...state.selectedKeyframeIds, ...ids])) 
            : ids 
    })),

    deselectAll: () => set({ selectedTrackIds: [], selectedKeyframeIds: [] }),
    
    deselectAllKeys: () => set({ selectedKeyframeIds: [] }),

    setSoftSelection: (radius, enabled) => set({ softSelectionRadius: radius, softSelectionEnabled: enabled }),
    
    setSoftSelectionType: (type: SoftSelectionType) => set({ softSelectionType: type }),
    
    setBouncePhysics: (tension, friction) => set({ bounceTension: tension, bounceFriction: friction })
});
