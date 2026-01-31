
import { useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';

export const useKeyboardShortcuts = (
    showTimeline: boolean,
    setShowTimeline: (v: (prev: boolean) => boolean) => void
) => {
    // Access full store states to get current values in callback
    const fractalStore = useFractalStore;
    const animStore = useAnimationStore;
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input field
            // Capture phase ensures we see it first, but we still respect inputs
            const target = e.target as HTMLElement;
            
            // Allow shortcuts on Range inputs (Sliders), but block on Text inputs
            const isRange = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range';
            const isTextInput = (target.tagName === 'INPUT' && !isRange) || 
                                target.tagName === 'TEXTAREA' || 
                                target.isContentEditable;
                                
            if (isTextInput) return;

            const isCtrl = e.ctrlKey || e.metaKey; // Command on Mac, Ctrl on Windows
            const isShift = e.shiftKey;

            // --- UNDO / REDO HANDLING ---
            if (isCtrl && !e.altKey) {
                // Get current hover state
                const isTimelineHovered = fractalStore.getState().isTimelineHovered;

                // CAMERA UNDO (Ctrl + Shift + Z)
                if (e.code === 'KeyZ' && isShift) {
                    e.preventDefault();
                    e.stopPropagation();
                    fractalStore.getState().undoCamera();
                    return;
                }
                
                // CAMERA REDO (Ctrl + Shift + Y)
                if (e.code === 'KeyY' && isShift) {
                    e.preventDefault();
                    e.stopPropagation();
                    fractalStore.getState().redoCamera();
                    return;
                }

                // UNDO (Ctrl + Z)
                if (e.code === 'KeyZ' && !isShift) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Fallback Logic: If hovering timeline, try undoing sequence first.
                    // If sequence undo stack is empty, fall through to parameter undo.
                    if (isTimelineHovered) {
                        const didUndo = animStore.getState().undo();
                        if (!didUndo) {
                            fractalStore.getState().undoParam();
                        }
                    } else {
                        fractalStore.getState().undoParam();
                    }
                    return;
                }

                // REDO (Ctrl + Y)
                if (e.code === 'KeyY' && !isShift) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isTimelineHovered) {
                        const didRedo = animStore.getState().redo();
                        if (!didRedo) {
                            fractalStore.getState().redoParam();
                        }
                    } else {
                        fractalStore.getState().redoParam();
                    }
                    return;
                }
            }

            // --- GENERAL SHORTCUTS ---
            switch (e.code) {
                case 'Tab':
                    e.preventDefault();
                    fractalStore.getState().setCameraMode(fractalStore.getState().cameraMode === 'Fly' ? 'Orbit' : 'Fly');
                    break;
                case 'KeyT':
                    // Prevent conflict if T is used for transform controls in future
                    if (!isCtrl) setShowTimeline(prev => !prev);
                    break;
                case 'Escape':
                    // Exit broadcast mode if active
                    if (fractalStore.getState().isBroadcastMode) {
                        fractalStore.getState().setIsBroadcastMode(false);
                    }
                    if (fractalStore.getState().interactionMode !== 'none') fractalStore.getState().setInteractionMode('none');
                    // Also clear selections
                    animStore.getState().deselectAll();
                    break;
                case 'KeyH':
                    fractalStore.getState().setShowHints(!fractalStore.getState().showHints);
                    break;
                case 'KeyB':
                    if (!isCtrl) {
                         // Toggle Broadcast (Clean Feed) Mode
                         const s = fractalStore.getState();
                         s.setIsBroadcastMode(!s.isBroadcastMode);
                    }
                    break;
                case 'Space':
                    // CONFLICT RESOLUTION: Spacebar is used for both "Fly Up" and "Play/Pause".
                    
                    const { cameraMode, isTimelineHovered } = fractalStore.getState();
                    const { sequence, isPlaying } = animStore.getState();
                    
                    // Logic:
                    // 1. If Timeline is OPEN:
                    //    - Play if Hovered OR if mode is NOT Fly (Orbit mode assumes space=play)
                    // 2. If Timeline is CLOSED:
                    //    - Play only if Orbit Mode AND we have tracks (prevent accidental play of empty scene)
                    //    - In Fly Mode, space is always UP (handled by input controller), unless explicit override needed (none here)
                    
                    let shouldTogglePlay = false;

                    if (showTimeline) {
                        shouldTogglePlay = (cameraMode !== 'Fly') || isTimelineHovered;
                    } else {
                        const hasTracks = Object.keys(sequence.tracks).length > 0;
                        if (cameraMode !== 'Fly' && hasTracks) {
                            shouldTogglePlay = true;
                        }
                    }
                    
                    if (shouldTogglePlay) {
                        e.preventDefault(); // Prevent scroll
                        if (isPlaying) animStore.getState().pause();
                        else animStore.getState().play();
                    }
                    break;
            }
        };

        // Use Capture to ensure we get events before UI elements
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [showTimeline, setShowTimeline]);
};
