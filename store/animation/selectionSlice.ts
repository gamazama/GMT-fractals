
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

    selectTrack: (id, multi) => set(state => ({ 
        selectedTrackIds: multi 
            ? (state.selectedTrackIds.includes(id) ? state.selectedTrackIds.filter(tid => tid !== id) : [...state.selectedTrackIds, id]) 
            : [id] 
    })),
    
    selectTracks: (ids, select) => set(state => {
        const current = new Set(state.selectedTrackIds);
        if (select) {
            ids.forEach(id => current.add(id));
        } else {
            ids.forEach(id => current.delete(id));
        }
        return { selectedTrackIds: Array.from(current) };
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
