
import { Keyframe } from '../types';
import { toGraphY } from './GraphUtils';
import { isLogTrack } from '../engine/animation/logTrackRegistry';

/** The extent of the keys a graph editor is asked to fit. `minV` / `maxV` are in GRAPH units
 *  (`toGraphY`): a plain track's values, an exponential track's exponents. */
export const calculateViewBounds = (trackIds: string[], sequence: any, selectedIds?: string[]) => {
    let minV = Infinity, maxV = -Infinity;
    let minF = Infinity, maxF = -Infinity;
    let hasKeys = false;

    const checkKey = (k: Keyframe, tid: string, isLog: boolean) => {
        if (selectedIds && selectedIds.length > 0 && !selectedIds.includes(`${tid}::${k.id}`)) return;
        hasKeys = true;
        const v = toGraphY(k.value, isLog);
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
        if (k.frame < minF) minF = k.frame;
        if (k.frame > maxF) maxF = k.frame;
    };

    trackIds.forEach(tid => {
        const track = sequence.tracks[tid];
        const isLog = isLogTrack(tid);
        if (track) track.keyframes.forEach((k: Keyframe) => checkKey(k, tid, isLog));
    });

    if (!hasKeys) return null;
    return { minV, maxV, minF, maxF };
};
