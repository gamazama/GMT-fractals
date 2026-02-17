
import React, { useRef, useState, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { engine } from '../../engine/FractalEngine';
import { CameraIcon, UndoIcon, RedoIcon, ResetIcon, LayersIcon } from '../Icons';
import { injectMetadata } from '../../utils/pngMetadata';
import { getExportFileName } from '../../utils/fileUtils';

export const CameraTools: React.FC<{ isMobileMode: boolean, vibrate: (ms: number) => void, btnBase: string, btnActive: string, btnInactive: string }> = ({ isMobileMode, vibrate, btnBase, btnActive, btnInactive }) => {
    const state = useFractalStore();
    const { floatTab } = state;
    const [showCameraMenu, setShowCameraMenu] = useState(false);
    const camHoverTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Snapshot Handler
    const handleSnapshot = async () => {
        if (!engine.renderer) return;
        try {
            // Use the new Engine method to get a high-quality, tone-mapped blob
            const blob = await engine.captureSnapshot();
            
            if (!blob) {
                console.error("Snapshot generation returned null.");
                return;
            }

            // Get Preset Data
            const preset = state.getPreset({ includeScene: true });
            const presetString = JSON.stringify(preset);
            
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
        floatTab('Camera Manager');
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
        <div 
            className="relative" 
            ref={menuRef}
            onMouseEnter={handleCamMouseEnter} 
            onMouseLeave={handleCamMouseLeave}
        >
            <button 
                onClick={handleInteraction} 
                className={`camera-menu-trigger ${btnBase} ${showCameraMenu ? btnActive : btnInactive}`}
                title={isMobileMode ? "Camera Menu" : "Click: Take Snapshot / Hover: Camera Menu"}
            >
                <CameraIcon />
            </button>
            {showCameraMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-black border border-white/20 rounded-xl p-2 shadow-2xl z-[70] animate-fade-in origin-top-right">
                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-black border-t border-l border-white/20 transform rotate-45" />
                    <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/10 mb-1">Camera Tools</div>
                    <div className="space-y-1">
                        <button onClick={() => { vibrate(5); state.undoCamera(); }} disabled={state.undoStack.length === 0} className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left" title="Ctrl + Shift + Z"><UndoIcon /> Undo Move</button>
                        <button onClick={() => { vibrate(5); state.redoCamera(); }} disabled={state.redoStack.length === 0} className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 disabled:opacity-30 text-xs text-gray-300 text-left" title="Ctrl + Shift + Y"><RedoIcon /> Redo Move</button>
                        <button onClick={() => { vibrate(30); state.resetCamera(); state.setShowLightGizmo(false); }} className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-gray-300 text-left"><ResetIcon /> Reset Position</button>
                        
                        <div className="h-px bg-white/10 my-1" />
                        
                        <button onClick={handleOpenManager} className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/10 text-xs text-cyan-300 text-left">
                            <LayersIcon /> Camera Manager
                        </button>
                        
                        <div className="h-px bg-white/10 my-1" />
                        
                        <button onClick={handleSnapshot} className="w-full flex items-center gap-2 p-2 rounded hover:bg-cyan-900/50 text-xs text-cyan-400 font-bold text-left" title="Save PNG with embedded scene data"><CameraIcon /> Take Snapshot</button>
                    </div>
                </div>
            )}
        </div>
    );
};
