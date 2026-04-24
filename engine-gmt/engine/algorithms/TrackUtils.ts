
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
        const isNewLastKey = idx === sortedKeys.length - 1;

        // 1. Update Previous Key
        const prevIdx = idx - 1;
        if (prevIdx >= 0) {
            const prev = { ...sortedKeys[prevIdx] };
            sortedKeys[prevIdx] = prev; // Update reference in array

            if (prev.interpolation === 'Bezier') {
                const dist = newKey.frame - prev.frame;
                
                if (prev.autoTangent) {
                    const prevPrev = sortedKeys[prevIdx - 1];
                    const { l, r } = AnimationMath.calculateTangents(prev, prevPrev, newKey, 'Auto');
                    prev.leftTangent = l; 
                    prev.rightTangent = r;
                } else {
                     const constraint = AnimationMath.constrainHandles(prev, sortedKeys[prevIdx - 1], newKey);
                     Object.assign(prev, constraint);
                }

                // If we added a key at the very end, ensure the previous key points towards it somewhat naturally
                // This prevents "overshoot" when extending animations
                if (isNewLastKey && dist > 0.0001) {
                    const targetX = dist * 0.3; 
                    const currentRt = prev.rightTangent || { x: 10, y: 0 };
                    // If current tangent is extremely short, extend it
                    if (currentRt.x < targetX) {
                        const ratio = targetX / Math.max(0.0001, Math.abs(currentRt.x));
                        prev.rightTangent = { x: targetX, y: currentRt.y * ratio };
                    }
                }
            }
        }

        // 2. Update Next Key
        const nextIdx = idx + 1;
        if (nextIdx < sortedKeys.length) {
             const next = { ...sortedKeys[nextIdx] };
             sortedKeys[nextIdx] = next;

             if (next.interpolation === 'Bezier') {
                 if (next.autoTangent) {
                    const nextNext = sortedKeys[nextIdx + 1];
                    const { l, r } = AnimationMath.calculateTangents(next, newKey, nextNext, 'Auto');
                    next.leftTangent = l; 
                    next.rightTangent = r;
                 } else {
                    const constraints = AnimationMath.constrainHandles(next, newKey, sortedKeys[nextIdx + 1]);
                    Object.assign(next, constraints);
                 }
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
