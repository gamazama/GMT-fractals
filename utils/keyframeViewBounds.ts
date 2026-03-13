
import { Keyframe } from '../types';

export const calculateViewBounds = (trackIds: string[], sequence: any, selectedIds?: string[]) => {
    let minV = Infinity, maxV = -Infinity;
    let minF = Infinity, maxF = -Infinity;
    let hasKeys = false;
    
    const checkKey = (k: Keyframe, tid: string) => {
        if (selectedIds && selectedIds.length > 0 && !selectedIds.includes(`${tid}::${k.id}`)) return;
        hasKeys = true;
        if (k.value < minV) minV = k.value;
        if (k.value > maxV) maxV = k.value;
        if (k.frame < minF) minF = k.frame;
        if (k.frame > maxF) maxF = k.frame;
    };

    trackIds.forEach(tid => {
        const track = sequence.tracks[tid];
        if (track) track.keyframes.forEach(k => checkKey(k, tid));
    });

    if (!hasKeys) return null;
    return { minV, maxV, minF, maxF };
};
