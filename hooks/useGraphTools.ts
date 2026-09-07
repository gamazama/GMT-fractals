
import React, { useState, useRef, useCallback } from 'react';
import { calculateEulerUpdates, calculateSmoothingUpdates, calculateResampleUpdates, evaluateTrackValue, isRotationTrack } from '../utils/timelineUtils';
import { calculateConstrainedSmoothing } from '../utils/ConstrainedSmoothing';
import { simplifyTrack } from '../utils/CurveFitting';
import { Keyframe, AnimationSequence } from '../types';
import type { GraphDataSource } from '../utils/GraphDataSource';

interface GraphToolsProps {
    sequence: AnimationSequence;
    trackIds: string[]; // Visible tracks
    selectedTrackIds: string[];
    selectedKeyframeIds: string[];
    v2p: (val: number, tid: string) => number;
    canvasPixelToFrame: (px: number) => number;
    /** The elastic Smooth tool BAKES first (the palette's Curves; owner, 2026-09-07 evening:
     *  "the points always need to be baked … select the next adjacent keys and bake them"):
     *  on pointer-down the selection (or every key) grows by one key either side, that span
     *  is resampled to a key per frame, and the smoothing then works on those dense keys. */
    smoothBakes?: boolean;
}

export const useGraphTools = (
    {
        sequence,
        trackIds,
        selectedTrackIds,
        selectedKeyframeIds,
        v2p,
        canvasPixelToFrame,
        smoothBakes = false,
    }: GraphToolsProps,
    // Store-agnostic data source — the timeline passes the store source, the
    // palette its local impl. Always supplied by callers.
    dataSource: GraphDataSource
) => {
    const ds = dataSource;
    // Smoothing physics — store provides these; palette omits → defaults.
    const bounceTension  = ds.bounceTension ?? 0.5;
    const bounceFriction = ds.bounceFriction ?? 0.6;

    // --- TOOL STATE ---
    const [isSmoothing, setIsSmoothing] = useState(false);
    const [smoothingRadius, setSmoothingRadius] = useState(0);
    const [isBaking, setIsBaking] = useState(false);
    const [bakeStep, setBakeStep] = useState(1);
    const [isSimplifying, setIsSimplifying] = useState(false);
    const [simplifyStrength, setSimplifyStrength] = useState(1.0);

    // --- INTERNAL REFS ---
    const toolStartRef = useRef({ x: 0, y: 0 });
    const originalSequenceRef = useRef<AnimationSequence | null>(null);
    const simplifyTargetsRef = useRef<string[]>([]);
    /** smoothBakes: the baked keys the current Smooth gesture works on (the selection state
     *  is stale within the gesture, so the ids live here). */
    const smoothKeysRef = useRef<string[] | null>(null);

    // --- HELPERS ---
    const getTargetTracks = useCallback(() => {
        if (selectedKeyframeIds.length > 0) {
            const tracks = new Set<string>();
            selectedKeyframeIds.forEach(id => {
                if(id) tracks.add(id.split('::')[0]);
            });
            return Array.from(tracks);
        }
        if (selectedTrackIds.length > 0) return selectedTrackIds;
        return [];
    }, [selectedKeyframeIds, selectedTrackIds]);

    const getTargetKeys = useCallback(() => {
        if (selectedKeyframeIds.length > 0) return selectedKeyframeIds;
        if (selectedTrackIds.length > 0) {
            const keys: string[] = [];
            selectedTrackIds.forEach(tid => {
                const track = sequence.tracks[tid];
                if (track) track.keyframes.forEach(k => keys.push(`${tid}::${k.id}`));
            });
            return keys;
        }
        return [];
    }, [selectedKeyframeIds, selectedTrackIds, sequence]);

    // --- LOGIC IMPLEMENTATIONS ---

    const performBake = useCallback((step: number) => {
        if (!originalSequenceRef.current) return;
        const targets = getTargetTracks();
        if (targets.length === 0) return;

        const updates = calculateResampleUpdates(targets, originalSequenceRef.current, step);
        if (updates.length > 0) {
            const allNewKeyIds: string[] = [];
            updates.forEach(u => u.newKeys.forEach(k => allNewKeyIds.push(`${u.trackId}::${k.id}`)));
            ds.replaceKeyframes?.(updates);
            ds.selectKeyframes(allNewKeyIds, false);
        }
    }, [getTargetTracks, ds]);

    const performSimplify = useCallback((strength: number) => {
        if (!originalSequenceRef.current) return;

        const updates: { trackId: string, newKeys: Keyframe[] }[] = [];
        const allNewKeyIds: string[] = [];
        const targetSet = new Set(simplifyTargetsRef.current);
        const trackIdsToProcess = new Set<string>();
        simplifyTargetsRef.current.forEach(id => { if (id) trackIdsToProcess.add(id.split('::')[0]); });

        trackIdsToProcess.forEach(tid => {
            const origTrack = originalSequenceRef.current!.tracks[tid];
            if(!origTrack) return;
            const selectedKeys = origTrack.keyframes.filter((k: Keyframe) => targetSet.has(`${tid}::${k.id}`));
            if (selectedKeys.length < 2) return;

            const sortedSelection = selectedKeys.sort((a, b) => a.frame - b.frame);
            const startFrame = sortedSelection[0].frame;
            const endFrame = sortedSelection[sortedSelection.length-1].frame;

            const preKeys = origTrack.keyframes.filter((k: Keyframe) => k.frame < startFrame - 0.0001);
            const postKeys = origTrack.keyframes.filter((k: Keyframe) => k.frame > endFrame + 0.0001);

            const simplified = simplifyTrack(sortedSelection, 0.01, strength);
            const newKeys = [...preKeys, ...simplified, ...postKeys].sort((a, b) => a.frame - b.frame);

            updates.push({ trackId: tid, newKeys });
            simplified.forEach(k => allNewKeyIds.push(`${tid}::${k.id}`));
        });

        if (updates.length > 0) {
            ds.replaceKeyframes?.(updates);
            ds.selectKeyframes(allNewKeyIds, false);
        }
    }, [ds]);

    // --- ACTIONS ---

    const applyEulerFilter = useCallback(() => {
        const targets = getTargetTracks();
        if (targets.length === 0) return;
        ds.snapshot?.();
        const updates = calculateEulerUpdates(targets, sequence);
        if (updates.length > 0) ds.updateKeyframes(updates);
    }, [getTargetTracks, sequence, ds]);

    const checkEulerNeeded = useCallback(() => {
        const targetKeys = selectedKeyframeIds.length > 0
            ? selectedKeyframeIds
            : trackIds.map(tid => sequence.tracks[tid]?.keyframes.map(k => `${tid}::${k.id}`)).flat().filter(Boolean) as string[];

        const tracksToScan: Record<string, Keyframe[]> = {};

        targetKeys.forEach(id => {
            if (!id) return;
            const [tid, kid] = id.split('::');
            if (isRotationTrack(tid)) {
                if(!tracksToScan[tid]) tracksToScan[tid] = [];
                const track = sequence.tracks[tid];
                if (!track) return;
                const k = track.keyframes.find(key => key.id === kid);
                if(k) tracksToScan[tid].push(k);
            }
        });

        for (const tid in tracksToScan) {
            const keys = tracksToScan[tid].sort((a,b) => a.frame - b.frame);
            for(let i=0; i<keys.length-1; i++) {
                if (Math.abs(keys[i+1].value - keys[i].value) > Math.PI) return true;
            }
        }
        return false;
    }, [selectedKeyframeIds, trackIds, sequence]);

    // --- INTERACTIVE TOOL HANDLERS ---

    /** Shared setup for pointer-drag tools: capture, snapshot, start tracking */
    const beginDragTool = (e: React.PointerEvent, onMove: (e: PointerEvent) => void, onUp: () => void) => {
        e.preventDefault(); e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        ds.snapshot?.();
        // Smooth/Bake/Simplify apply keyframe updates LIVE as you drag (the viewport
        // re-evaluates each move), so the gesture must read as `interacting` →
        // adaptive, not the idle band renderer. begin() is idempotent; each tool's
        // *Up handler calls the balanced end(). No-op for the palette (no ds.scrub).
        ds.scrub?.begin();
        originalSequenceRef.current = JSON.parse(JSON.stringify(sequence));
        toolStartRef.current = { x: e.clientX, y: e.clientY };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const handleSmoothDown = (e: React.PointerEvent) => {
        const targets = getTargetTracks();
        if (targets.length === 0) return;
        beginDragTool(e, handleSmoothMove, handleSmoothUp);
        if (smoothBakes && originalSequenceRef.current) {
            // grow the selection by one key either side, bake that span to a key per
            // frame, and smooth THOSE — from a snapshot that already holds the baked keys
            const snap = originalSequenceRef.current;
            const sel = new Set(getTargetKeys());
            const updates: { trackId: string; newKeys: Keyframe[] }[] = [];
            const bakedIds: string[] = [];
            targets.forEach((tid) => {
                const track = snap.tracks[tid];
                if (!track) return;
                const sorted = [...track.keyframes].sort((a, b) => a.frame - b.frame);
                const idx = sorted.map((k, i) => (sel.has(`${tid}::${k.id}`) ? i : -1)).filter((i) => i >= 0);
                if (idx.length === 0) return;
                const first = Math.max(0, idx[0] - 1);
                const last = Math.min(sorted.length - 1, idx[idx.length - 1] + 1);
                const start = Math.ceil(sorted[first].frame);
                const end = Math.floor(sorted[last].frame);
                if (end - start < 2) return;
                const rot = isRotationTrack(tid);
                const baked: Keyframe[] = [];
                for (let f = start; f <= end; f++) {
                    baked.push({ id: `${tid}-sb-${f}-${Date.now().toString(36)}`, frame: f, value: evaluateTrackValue(sorted, f, rot), interpolation: 'Linear' });
                }
                const pre = sorted.filter((k) => k.frame < start - 0.0001);
                const post = sorted.filter((k) => k.frame > end + 0.0001);
                const newKeys = [...pre, ...baked, ...post];
                track.keyframes = newKeys;
                updates.push({ trackId: tid, newKeys });
                baked.forEach((k) => bakedIds.push(`${tid}::${k.id}`));
            });
            if (updates.length > 0) {
                ds.replaceKeyframes?.(updates);
                ds.selectKeyframes(bakedIds, false);
                smoothKeysRef.current = bakedIds;
            }
        }
        setSmoothingRadius(0.1);
        setIsSmoothing(true);
    };

    const handleSmoothMove = (e: PointerEvent) => {
        const dx = e.clientX - toolStartRef.current.x;
        const r = dx / 30;

        if (Math.abs(r - smoothingRadius) > 0.01) {
            setSmoothingRadius(r);
            // Apply logic
            if (!originalSequenceRef.current) return;
            const targets = getTargetTracks();
            const keysToSmooth = smoothKeysRef.current ?? getTargetKeys();

            let updates: { trackId: string; keyId: string; patch: Partial<Keyframe> }[] = [];
            if (r > 0) {
                updates = calculateConstrainedSmoothing(targets, originalSequenceRef.current, keysToSmooth, r);
            } else {
                updates = calculateSmoothingUpdates(
                    targets, smoothKeysRef.current ? originalSequenceRef.current : sequence, keysToSmooth, r, originalSequenceRef.current, bounceTension, bounceFriction
                );
            }
            if (updates.length > 0) ds.updateKeyframes(updates);
        }
    };

    const handleSmoothUp = () => {
        setIsSmoothing(false);
        setSmoothingRadius(0);
        originalSequenceRef.current = null;
        smoothKeysRef.current = null;
        ds.scrub?.end();
        window.removeEventListener('pointermove', handleSmoothMove);
        window.removeEventListener('pointerup', handleSmoothUp);
    };

    const handleBakeDown = (e: React.PointerEvent) => {
        const targets = getTargetTracks();
        if (targets.length === 0) return;
        beginDragTool(e, handleBakeMove, handleBakeUp);
        setBakeStep(1);
        setIsBaking(true);
        performBake(1);
    };

    const handleBakeMove = (e: PointerEvent) => {
        const dx = e.clientX - toolStartRef.current.x;
        const s = Math.max(1, 1 + Math.floor(dx / 30));
        if (s !== bakeStep) {
            setBakeStep(s);
            performBake(s);
        }
    };

    const handleBakeUp = () => {
        setIsBaking(false);
        originalSequenceRef.current = null;
        ds.scrub?.end();
        window.removeEventListener('pointermove', handleBakeMove);
        window.removeEventListener('pointerup', handleBakeUp);
    };

    const handleSimplifyDown = (e: React.PointerEvent) => {
        let targets = selectedKeyframeIds;
        if (targets.length < 2) targets = getTargetKeys();
        if (targets.length < 2) return;
        beginDragTool(e, handleSimplifyMove, handleSimplifyUp);
        simplifyTargetsRef.current = [...targets];
        setSimplifyStrength(1.0);
        setIsSimplifying(true);
        performSimplify(1.0);
    };

    const handleSimplifyMove = (e: PointerEvent) => {
        const dx = e.clientX - toolStartRef.current.x;
        const delta = dx / 200;
        const newStrength = Math.max(0, Math.min(1, 1.0 + delta));

        if (Math.abs(newStrength - simplifyStrength) > 0.01) {
            setSimplifyStrength(newStrength);
            performSimplify(newStrength);
        }
    };

    const handleSimplifyUp = () => {
        setIsSimplifying(false);
        originalSequenceRef.current = null;
        ds.scrub?.end();
        window.removeEventListener('pointermove', handleSimplifyMove);
        window.removeEventListener('pointerup', handleSimplifyUp);
    };

    // --- CREATE KEY ---
    const createKeyAtMouse = useCallback((e: React.MouseEvent, canvasRect: DOMRect) => {
        const mx = e.clientX - canvasRect.left;
        const my = e.clientY - canvasRect.top;

        const frame = canvasPixelToFrame(mx);
        const frameInt = Math.max(0, Math.round(frame));

        let bestDist = 10;
        let bestTrackId: string | null = null;
        let bestVal = 0;

        trackIds.forEach(tid => {
            const track = sequence.tracks[tid];
            if (!track || track.keyframes.length === 0) return;
            const val = evaluateTrackValue(track.keyframes, frame, isRotationTrack(tid));
            const py = v2p(val, tid);
            const dist = Math.abs(my - py);

            if (dist < bestDist) {
                bestDist = dist;
                bestTrackId = tid;
                bestVal = val;
            }
        });

        if (bestTrackId) {
            ds.snapshot?.();
            ds.addKeyframe?.(bestTrackId, frameInt, bestVal, 'Bezier');
        }
    }, [trackIds, sequence, v2p, canvasPixelToFrame, ds]);

    return {
        // State
        isSmoothing, smoothingRadius,
        isBaking, bakeStep,
        isSimplifying, simplifyStrength,

        // Handlers
        handleSmoothDown,
        handleBakeDown,
        handleSimplifyDown,

        // Actions
        applyEulerFilter,
        checkEulerNeeded,
        createKeyAtMouse
    };
};
