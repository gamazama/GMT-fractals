
import React, { useState, useRef, useCallback } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { calculateEulerUpdates, calculateSmoothingUpdates, calculateResampleUpdates, evaluateTrackValue } from '../utils/timelineUtils';
import { calculateConstrainedSmoothing } from '../utils/ConstrainedSmoothing';
import { simplifyTrack } from '../utils/CurveFitting';
import { Keyframe } from '../types';
import { GraphViewTransform, valueToPixel, pixelToFrame } from '../utils/GraphUtils';

interface GraphToolsProps {
    sequence: any;
    trackIds: string[]; // Visible tracks
    selectedTrackIds: string[];
    selectedKeyframeIds: string[];
    frameWidth: number;
    view: GraphViewTransform;
    normalized: boolean;
    trackRanges: Record<string, { min: number, max: number, span: number }>;
    v2p: (val: number, tid: string) => number;
    canvasPixelToFrame: (px: number) => number;
}

export const useGraphTools = ({
    sequence,
    trackIds,
    selectedTrackIds,
    selectedKeyframeIds,
    frameWidth,
    view,
    normalized,
    trackRanges,
    v2p,
    canvasPixelToFrame
}: GraphToolsProps) => {
    const { 
        updateKeyframes, snapshot, addKeyframe, selectKeyframes,
        bounceTension, bounceFriction
    } = useAnimationStore();

    // --- TOOL STATE ---
    const [isSmoothing, setIsSmoothing] = useState(false);
    const [smoothingRadius, setSmoothingRadius] = useState(0);
    const [isBaking, setIsBaking] = useState(false);
    const [bakeStep, setBakeStep] = useState(1);
    const [isSimplifying, setIsSimplifying] = useState(false);
    const [simplifyStrength, setSimplifyStrength] = useState(1.0);

    // --- INTERNAL REFS ---
    const toolStartRef = useRef({ x: 0, y: 0 });
    const originalSequenceRef = useRef<any>(null);
    const simplifyTargetsRef = useRef<string[]>([]);

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
            useAnimationStore.setState(state => {
                const newTracks = { ...state.sequence.tracks };
                updates.forEach(u => {
                    if (newTracks[u.trackId]) {
                        newTracks[u.trackId].keyframes = u.newKeys;
                        u.newKeys.forEach(k => allNewKeyIds.push(`${u.trackId}::${k.id}`));
                    }
                });
                return { sequence: { ...state.sequence, tracks: newTracks } };
            });
            selectKeyframes(allNewKeyIds, false);
        }
    }, [getTargetTracks, selectKeyframes]);

    const performSimplify = useCallback((strength: number) => {
        if (!originalSequenceRef.current) return;
        
        const updates: { trackId: string, newKeys: Keyframe[] }[] = [];
        const allNewKeyIds: string[] = [];
        const targetSet = new Set(simplifyTargetsRef.current);
        const trackIdsToProcess = new Set<string>();
        simplifyTargetsRef.current.forEach(id => { if (id) trackIdsToProcess.add(id.split('::')[0]); });

        trackIdsToProcess.forEach(tid => {
            const origTrack = originalSequenceRef.current.tracks[tid];
            if(!origTrack) return;
            const selectedKeys = origTrack.keyframes.filter((k: any) => targetSet.has(`${tid}::${k.id}`));
            if (selectedKeys.length < 2) return; 
            
            const sortedSelection = selectedKeys.sort((a:any,b:any) => a.frame - b.frame);
            const startFrame = sortedSelection[0].frame;
            const endFrame = sortedSelection[sortedSelection.length-1].frame;
            
            const preKeys = origTrack.keyframes.filter((k: any) => k.frame < startFrame - 0.0001);
            const postKeys = origTrack.keyframes.filter((k: any) => k.frame > endFrame + 0.0001);
            
            const simplified = simplifyTrack(sortedSelection, 0.01, strength);
            const newKeys = [...preKeys, ...simplified, ...postKeys].sort((a:any,b:any) => a.frame - b.frame);
            
            updates.push({ trackId: tid, newKeys });
            simplified.forEach(k => allNewKeyIds.push(`${tid}::${k.id}`));
        });

        if (updates.length > 0) {
            useAnimationStore.setState(state => {
                const newTracks = { ...state.sequence.tracks };
                updates.forEach(u => {
                    if (newTracks[u.trackId]) {
                        newTracks[u.trackId] = { ...newTracks[u.trackId], keyframes: u.newKeys };
                    }
                });
                return { sequence: { ...state.sequence, tracks: newTracks } };
            });
            selectKeyframes(allNewKeyIds, false);
        }
    }, [selectKeyframes]);

    // --- ACTIONS ---

    const applyEulerFilter = useCallback(() => {
        const targets = getTargetTracks();
        if (targets.length === 0) return;
        snapshot();
        const updates = calculateEulerUpdates(targets, sequence);
        if (updates.length > 0) updateKeyframes(updates);
    }, [getTargetTracks, sequence, snapshot, updateKeyframes]);

    const checkEulerNeeded = useCallback(() => {
        const targetKeys = selectedKeyframeIds.length > 0 
            ? selectedKeyframeIds 
            : trackIds.map(tid => sequence.tracks[tid]?.keyframes.map(k => `${tid}::${k.id}`)).flat().filter(Boolean) as string[];

        const tracksToScan: Record<string, Keyframe[]> = {};
        
        targetKeys.forEach(id => {
            if (!id) return;
            const [tid, kid] = id.split('::');
            if (/rotation|rot|phase|twist/i.test(tid) || /param[C-F]/i.test(tid)) {
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

    const handleSmoothDown = (e: React.PointerEvent) => {
        const targets = getTargetTracks();
        if (targets.length === 0) return;
        
        e.preventDefault(); e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        
        snapshot();
        originalSequenceRef.current = JSON.parse(JSON.stringify(sequence));
        toolStartRef.current = { x: e.clientX, y: e.clientY };
        
        setSmoothingRadius(0.1);
        setIsSmoothing(true);
        
        // Note: Smooth tool logic doesn't apply immediately on click (radius 0.1), only on drag
        
        window.addEventListener('pointermove', handleSmoothMove);
        window.addEventListener('pointerup', handleSmoothUp);
    };

    const handleSmoothMove = (e: PointerEvent) => {
        const dx = e.clientX - toolStartRef.current.x;
        const r = dx / 30; 
        
        if (Math.abs(r - smoothingRadius) > 0.01) {
            setSmoothingRadius(r);
            // Apply logic
            if (!originalSequenceRef.current) return;
            const targets = getTargetTracks();
            let keysToSmooth = selectedKeyframeIds;
            if (keysToSmooth.length === 0) keysToSmooth = getTargetKeys();

            let updates: any[] = [];
            if (r > 0) {
                updates = calculateConstrainedSmoothing(targets, originalSequenceRef.current, keysToSmooth, r);
            } else {
                updates = calculateSmoothingUpdates(
                    targets, sequence, keysToSmooth, r, originalSequenceRef.current, bounceTension, bounceFriction
                );
            }
            if (updates.length > 0) updateKeyframes(updates);
        }
    };

    const handleSmoothUp = () => {
        setIsSmoothing(false);
        setSmoothingRadius(0);
        originalSequenceRef.current = null;
        window.removeEventListener('pointermove', handleSmoothMove);
        window.removeEventListener('pointerup', handleSmoothUp);
    };

    const handleBakeDown = (e: React.PointerEvent) => {
        const targets = getTargetTracks();
        if (targets.length === 0) return;
        e.preventDefault(); e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        snapshot();
        originalSequenceRef.current = JSON.parse(JSON.stringify(sequence));
        toolStartRef.current = { x: e.clientX, y: e.clientY };
        setBakeStep(1);
        setIsBaking(true);
        performBake(1); // Execute immediately on click
        window.addEventListener('pointermove', handleBakeMove);
        window.addEventListener('pointerup', handleBakeUp);
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
        window.removeEventListener('pointermove', handleBakeMove);
        window.removeEventListener('pointerup', handleBakeUp);
    };

    const handleSimplifyDown = (e: React.PointerEvent) => {
        let targets = selectedKeyframeIds;
        if (targets.length < 2) targets = getTargetKeys();
        if (targets.length < 2) return;

        e.preventDefault(); e.stopPropagation();
        (e.target as Element).setPointerCapture(e.pointerId);
        
        snapshot();
        originalSequenceRef.current = JSON.parse(JSON.stringify(sequence));
        toolStartRef.current = { x: e.clientX, y: e.clientY };
        simplifyTargetsRef.current = [...targets]; 
        
        setSimplifyStrength(1.0); 
        setIsSimplifying(true);
        performSimplify(1.0); // Execute immediately on click
        
        window.addEventListener('pointermove', handleSimplifyMove);
        window.addEventListener('pointerup', handleSimplifyUp);
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
            const isRotation = /rotation|rot|phase|twist/i.test(tid) || /param[C-F]/i.test(tid);
            const val = evaluateTrackValue(track.keyframes, frame, isRotation);
            const py = v2p(val, tid);
            const dist = Math.abs(my - py);
            
            if (dist < bestDist) {
                bestDist = dist;
                bestTrackId = tid;
                bestVal = val;
            }
        });

        if (bestTrackId) {
            snapshot();
            addKeyframe(bestTrackId, frameInt, bestVal, 'Bezier'); 
        }
    }, [trackIds, sequence, v2p, canvasPixelToFrame, addKeyframe, snapshot]);

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
