
import React, { useRef, useState, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { LayersIcon, PathTraceIcon, CropIcon, CloseRegionIcon, RenderGridIcon, CheckIcon } from '../Icons';
import FpsCounter from './FpsCounter';
import BucketRenderSettingsPopup from './BucketRenderControls';
import { engine } from '../../engine/FractalEngine';
import { FractalEvents } from '../../engine/FractalEvents';
import { DraggableNumber } from '../Slider';
import { LightingState } from '../../features/lighting';

export const RenderTools: React.FC<{ isMobileMode: boolean, vibrate: (ms: number) => void }> = ({ isMobileMode, vibrate }) => {
    const state = useFractalStore();
    const isPlaying = useAnimationStore(s => s.isPlaying);
    const { handleInteractionStart, handleInteractionEnd, openContextMenu } = useFractalStore();
    
    const [showBucketMenu, setShowBucketMenu] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    
    const bucketMenuRef = useRef<HTMLDivElement>(null);
    const renameRef = useRef<HTMLDivElement>(null);
    
    // Project Settings State (Local for editing)
    const [tempName, setTempName] = useState(state.projectSettings.name);
    const [tempVersion, setTempVersion] = useState(state.projectSettings.version);

    // Sync when popup opens
    useEffect(() => {
        if (isRenaming) {
            setTempName(state.projectSettings.name);
            setTempVersion(state.projectSettings.version);
        }
    }, [isRenaming, state.projectSettings]);

    // Close bucket menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (bucketMenuRef.current && !bucketMenuRef.current.contains(e.target as Node)) {
                setShowBucketMenu(false);
            }
            if (renameRef.current && !renameRef.current.contains(e.target as Node)) {
                setIsRenaming(false);
            }
        };
        if (showBucketMenu || isRenaming) window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [showBucketMenu, isRenaming]);

    const handleContextMenu = (e: React.MouseEvent, ids: string[]) => {
        e.preventDefault(); e.stopPropagation();
        openContextMenu(e.clientX, e.clientY, [], ids);
    };

    const handleRegionClick = () => {
        vibrate(5);
        if (state.renderRegion) {
            state.setRenderRegion(null);
            return;
        }
        if (state.isSelectingRegion) {
            state.setIsSelectingRegion(false);
            return;
        }
        state.setIsSelectingRegion(true);
    };

    // Check PT Status
    const lighting = state.lighting as LightingState;
    const ptEnabled = lighting?.ptEnabled !== false;

    const toggleRenderMode = async () => {
        if (!ptEnabled) return;
        
        // ALLOW ON MOBILE NOW
        vibrate(5);
        handleInteractionStart('param');
        // Show loading indicator
        FractalEvents.emit('is_compiling', "Loading Material...");
        
        // Defer actual switch to allow UI update. 
        // Using Promise/setTimeout ensures React has time to render the loading spinner.
        await new Promise(resolve => setTimeout(resolve, 50));

        state.setRenderMode(state.renderMode === 'PathTracing' ? 'Direct' : 'PathTracing');
        handleInteractionEnd();
        
        // Only clear spinner if engine didn't start a recompile (synchronous check)
        if (!engine.isCompiling) {
            FractalEvents.emit('is_compiling', false);
        }
    };
    
    const saveProjectSettings = () => {
        state.setProjectSettings({ name: tempName, version: tempVersion });
        setIsRenaming(false);
    };

    return (
        <div className="flex items-center gap-6">
            {/* Logo and Project Name Area */}
            <div className="flex flex-col leading-none relative">
                <span className="text-xl font-black tracking-tighter text-white">G<span className="text-cyan-400">M</span>T</span>
                
                {/* Clickable Subtext for Project Name */}
                <button 
                    onClick={() => setIsRenaming(true)}
                    className="text-[8px] font-mono text-gray-500 uppercase tracking-[0.2em] hover:text-cyan-300 transition-colors text-left truncate max-w-[120px]"
                    title="Click to Rename Project"
                >
                    {state.projectSettings.name}
                </button>
                
                {/* Rename Popup */}
                {isRenaming && (
                    <div 
                        ref={renameRef}
                        className="absolute top-full left-0 mt-2 w-48 bg-black border border-white/20 rounded-lg p-3 shadow-2xl z-[100] animate-fade-in origin-top-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Project Name</label>
                                <input 
                                    type="text" 
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="w-full bg-gray-900 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                                    placeholder="Enter name..."
                                    autoFocus
                                />
                            </div>
                            
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[9px] text-gray-500 font-bold uppercase block mb-1">Ver</label>
                                    <div className="h-6 bg-gray-900 border border-white/10 rounded overflow-hidden">
                                        <DraggableNumber 
                                            value={tempVersion}
                                            onChange={(v) => setTempVersion(Math.max(1, Math.round(v)))}
                                            step={1}
                                            min={1}
                                            max={99}
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={saveProjectSettings}
                                    className="flex-1 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/30 rounded flex items-center justify-center mt-3.5"
                                    title="Save Settings"
                                >
                                    <CheckIcon />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="h-6 w-px bg-white/10" />
            
            <div className="flex items-center gap-2">
                <FpsCounter />
                
                {isPlaying && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-900/30 border border-green-500/30 rounded text-[9px] font-bold text-green-400 uppercase tracking-wider animate-pulse">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        <span>Playing</span>
                    </div>
                )}

                <button 
                    onClick={() => { 
                        vibrate(5); 
                        handleInteractionStart('param');
                        state.setAccumulation(!state.accumulation); 
                        handleInteractionEnd();
                    }} 
                    onContextMenu={(e) => handleContextMenu(e, ['quality.tss'])}
                    className={`p-0.5 rounded transition-colors ${state.accumulation ? 'text-green-400 bg-green-900/30' : 'text-gray-600 hover:text-gray-400'}`} 
                    title="TSS (Temporal Anti-Aliasing)"
                >
                    <LayersIcon />
                </button>

                <div className="w-px h-3 bg-white/10 mx-1" />

                <button 
                    onClick={toggleRenderMode}
                    disabled={!ptEnabled}
                    className={`p-0.5 rounded transition-colors ${
                        !ptEnabled 
                        ? 'text-gray-700 cursor-not-allowed opacity-50' 
                        : state.renderMode === 'PathTracing' 
                            ? 'text-purple-400 bg-purple-900/30' 
                            : 'text-gray-600 hover:text-gray-400'
                    }`}
                    title={!ptEnabled ? "Path Tracing disabled in Engine Panel" : (isMobileMode ? "Enable Path Tracer (Experimental)" : "Path Tracer (Global Illumination)")}
                >
                    <PathTraceIcon />
                </button>

                {!isMobileMode && (
                    <>
                        <button
                            onClick={handleRegionClick}
                            className={`p-0.5 rounded transition-colors ${
                                state.isSelectingRegion 
                                    ? 'text-cyan-400 bg-cyan-900/30 border border-cyan-500/30' 
                                    : (state.renderRegion ? 'text-green-400 bg-green-900/30 border border-green-500/30' : 'text-gray-600 hover:text-gray-400')
                            }`}
                            title={state.renderRegion ? "Clear Region" : (state.isSelectingRegion ? "Cancel Selection" : "Select Region")}
                        >
                            {state.renderRegion ? <CloseRegionIcon /> : <CropIcon />}
                        </button>
                        
                        <div className="relative" ref={bucketMenuRef}>
                            <button
                                onClick={(e) => { e.stopPropagation(); vibrate(5); setShowBucketMenu(!showBucketMenu); }}
                                className={`bucket-toggle-btn p-0.5 rounded transition-colors ${
                                    state.isBucketRendering 
                                        ? 'text-cyan-400 bg-cyan-900/30 border border-cyan-500/30 animate-pulse' 
                                        : 'text-gray-600 hover:text-gray-400'
                                }`}
                                title="Render!"
                            >
                                <RenderGridIcon />
                            </button>
                            {showBucketMenu && <BucketRenderSettingsPopup />}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
