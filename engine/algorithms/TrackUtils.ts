
import { Keyframe } from '../../types';
import { AnimationMath } from '../math/AnimationMath';

export const TrackUtils = {
    /**
     * Updates the neighbors of a keyframe after it has been inserted or modified.
     * Ensures C1 continuity for Bezier curves if Auto Tangents are enabled.
     * 
     * @param sortedKeys The full list of keys for the track, must be sorted by frame.
     * @param idx The index of the key that was just modified/inserted.
     */
    updateNeighbors: (sortedKeys: Keyframe[], idx: number): void => {
        const newKey = sortedKeys[idx];

        // Only recompute neighbours whose tangents are auto-managed.
        // User-shaped tangents (autoTangent === false) are sacred — don't silently rescale them.

        const prevIdx = idx - 1;
        if (prevIdx >= 0) {
            const prev = sortedKeys[prevIdx];
            if (prev.interpolation === 'Bezier' && prev.autoTangent) {
                const updated = { ...prev };
                const prevPrev = sortedKeys[prevIdx - 1];
                const { l, r } = AnimationMath.calculateTangents(updated, prevPrev, newKey, 'Auto');
                updated.leftTangent = l;
                updated.rightTangent = r;
                sortedKeys[prevIdx] = updated;
            }
        }

        const nextIdx = idx + 1;
        if (nextIdx < sortedKeys.length) {
            const next = sortedKeys[nextIdx];
            if (next.interpolation === 'Bezier' && next.autoTangent) {
                const updated = { ...next };
                const nextNext = sortedKeys[nextIdx + 1];
                const { l, r } = AnimationMath.calculateTangents(updated, newKey, nextNext, 'Auto');
                updated.leftTangent = l;
                updated.rightTangent = r;
                sortedKeys[nextIdx] = updated;
            }
        }
    },
    
    /**
     * Determines the optimal interpolation mode for a new key based on context.
     */
    inferInterpolation: (trackKeys: Keyframe[], frame: number): 'Linear' | 'Step' | 'Bezier' => {
        const sortedPrev = trackKeys.filter(k => k.frame < frame).sort((a,b) => b.frame - a.frame);
        
        if (sortedPrev.length === 0) return 'Linear';
        if (sortedPrev[0].interpolation === 'Linear') return 'Linear';
        if (sortedPrev[0].interpolation === 'Step') return 'Step';
        
        return 'Bezier';
    }
};
