
import React, { useRef, useState, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { CameraIcon, UndoIcon, RedoIcon, ResetIcon, LayersIcon } from '../Icons';
import { injectMetadata } from '../../utils/pngMetadata';
import { Popover } from '../../components/Popover';
import { getExportFileName } from '../../utils/fileUtils';
import { saveGMFScene } from '../../utils/FormulaFormat';

export const CameraTools: React.FC<{ isMobileMode: boolean, vibrate: (ms: number) => void, btnBase: string, btnActive: string, btnInactive: string }> = ({ isMobileMode, vibrate, btnBase, btnActive, btnInactive }) => {
    const state = useFractalStore();
    const { movePanel } = state;
    const [showCameraMenu, setShowCameraMenu] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const camHoverTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Snapshot Handler
    const handleSnapshot = async () => {
        if (!engine.isBooted) return;

        setShowCameraMenu(false);

        try {
            // Capture FIRST — before any React re-renders or delays that could
            // cause accumulation to reset, corrupting the snapshot.
            const blob = await engine.captureSnapshot();
            setIsCapturing(true);
            
            if (!blob) {
                console.error("Snapshot generation returned null.");
                return;
            }

            // Get Preset Data — embed as GMF for full formula + scene portability
            const preset = state.getPreset({ includeScene: true });
            const presetString = saveGMFScene(preset);
            
            // Calculate smart version
            const currentVersion = state.prepareExport();
            
            const filename = getExportFileName(
                state.projectSettings.name,
                currentVersion,
                'png'
            );

            try {
                // Inject Metadata
                const taggedBlob = await injectMetadata(blob, "FractalData", presetString);
                const url = URL.createObjectURL(taggedBlob);
                
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                link.click();
                
                URL.revokeObjectURL(url);
                vibrate(50);
            } catch (e) {
                console.error("Metadata injection failed, saving raw image", e);
                // Fallback
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) { 
            console.error("Snapshot failed", e); 
        } finally {
            setIsCapturing(false);
        }
    };

    const handleInteraction = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isMobileMode) {
            vibrate(5);
            setShowCameraMenu(!showCameraMenu);
        } else {
            // Desktop: Click takes snapshot immediately
            // Menu is handled via Hover
            handleSnapshot();
        }
    };

    const handleCamMouseEnter = () => {
        if (isMobileMode) return;
        if (camHoverTimeoutRef.current) clearTimeout(camHoverTimeoutRef.current);
        setShowCameraMenu(true);
    };

    const handleCamMouseLeave = () => {
        if (isMobileMode) return;
        camHoverTimeoutRef.current = window.setTimeout(() => {
            setShowCameraMenu(false);
        }, 200); 
    };

    const handleOpenManager = () => {
        vibrate(5);
        movePanel('Camera Manager', 'left');
        setShowCameraMenu(false);
    };
    
    // Close on outside click (Mobile)
    useEffect(() => {
        if (!isMobileMode || !showCameraMenu) return;
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement;
            if (menuRef.current && !menuRef.current.contains(target) && !target.closest('.camera-menu-trigger')) {
                setShowCameraMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showCameraMenu, isMobileMode]);

    return (
        <>
            {/* Capturing Overlay */}
            {isCapturing && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-cyan-500/50 rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-cyan-300 font-bold text-sm">Capturing...</span>
                    </div>
                </div>
            )}
        
            <div 
                className="relative" 
                ref={menuRef}
                onMouseEnter={handleCamMouseEnter} 
                onMouseLeave={handleCamMouseLeave}
            >
            <button
                data-tut="snapshot-btn"
                onClick={handleInteraction}
                className={`camera-menu-trigger ${btnBase} ${showCameraMenu ? btnActive : btnInactive}`}
                title={isMobileMode ? "Camera Menu" : "Click: Take Snapshot / Hover: Camera Menu"}
            >
                <CameraIcon />
            </button>
            {showCameraMenu && (
                <Popover width="w-48" align="end">
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-500 border-b border-white/10 mb-1">Camera Tools</div>
                    <div className="space-y-1">
                        <button onClick={() => { vibrate(5); state.undoCamera(); }} disabled={state.undoStack.length === 0} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left"><span className="flex items-center gap-2"><UndoIcon /> Undo Move</span><kbd className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">Ctrl+Shift+Z</kbd></button>
                        <button onClick={() => { vibrate(5); state.redoCamera(); }} disabled={state.redoStack.length === 0} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left"><span className="flex items-center gap-2"><RedoIcon /> Redo Move</span><kbd className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">Ctrl+Shift+Y</kbd></button>
                        <button onClick={() => { vibrate(30); state.resetCamera(); state.setShowLightGizmo(false); }} className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-gray-300 text-left"><ResetIcon /> Reset Position</button>
                        
                        <div className="h-px bg-white/10 my-1" />
                        
                        <button onClick={handleOpenManager} className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-cyan-300 text-left">
                            <LayersIcon /> Camera Manager
                        </button>
                        
                        <div className="h-px bg-white/10 my-1" />
                        
                        <button onClick={handleSnapshot} className="w-full flex items-center gap-2 p-2 rounded hover:bg-cyan-900/50 text-xs text-cyan-400 font-bold text-left" title="Save PNG with embedded scene data"><CameraIcon /> Take Snapshot</button>
                    </div>
                </Popover>
            )}
        </div>
        </>
    );
};
