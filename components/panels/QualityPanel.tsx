
import React, { useState, useEffect, useMemo } from 'react';
import { FractalState, FractalActions } from '../../types';
import Slider, { DraggableNumber } from '../Slider';
import ToggleSwitch from '../ToggleSwitch';
import Dropdown from '../Dropdown';
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import { FractalEvents } from '../../engine/FractalEvents';
import { LightingState } from '../../features/lighting';
import { AOState } from '../../features/ao';
import { engine } from '../../engine/FractalEngine';

const QualityPanel = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    const quality = state.quality;
    const lighting = state.lighting as LightingState;
    const ao = (state as any).ao as AOState;
    
    // Resolution Management
    const [w, h] = state.fixedResolution;
    const [aspectLock, setAspectLock] = useState<number | 'Free'>('Free');
    const isMobile = state.debugMobileLayout || (typeof window !== 'undefined' && window.innerWidth < 768);
    
    const ptEnabled = lighting?.ptEnabled !== false;
    // For Area Lights toggle copy
    const setLighting = (actions as any).setLighting;

    // Preset Detection
    const currentPreset = useMemo(() => {
        const s = `${w}x${h}`;
        const presets = [
            '800x600', '1280x720', '1920x1080', '2560x1440', '3840x2160', 
            '1080x1080', '1080x1350', '1080x1920',
            '2048x1024', '4096x2048'
        ];
        return presets.includes(s) ? s : 'Custom';
    }, [w, h]);

    const handleHeaderContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };
    
    const handleModeSwitch = async (mode: 'Direct' | 'PathTracing') => {
        if (state.renderMode === mode) return;
        
        // Show spinner immediately to indicate work
        FractalEvents.emit('is_compiling', "Switching Engine...");
        
        // Yield to allow UI repaint
        await new Promise(resolve => setTimeout(resolve, 50));
        
        actions.setRenderMode(mode);
        // Removed manual spinner cleanup. The Engine now handles this centrally.
    };

    // Helper to snap resolution to multiples of 8 (GPU friendly)
    const setRes = (newW: number, newH: number) => {
        const snapW = Math.max(64, Math.round(newW / 8) * 8);
        const snapH = Math.max(64, Math.round(newH / 8) * 8);
        actions.setFixedResolution(snapW, snapH);
    };

    const handleDimensionChange = (axis: 'w' | 'h', val: number) => {
        if (aspectLock === 'Free') {
            setRes(axis === 'w' ? val : w, axis === 'h' ? val : h);
        } else {
            // Apply Ratio
            if (axis === 'w') {
                setRes(val, val / (aspectLock as number));
            } else {
                setRes(val * (aspectLock as number), val);
            }
        }
    };
    
    const aaLevels = [0.25, 0.5, 1.0, 1.5, 2.0]; 

    return (
        <div className="animate-fade-in -mx-4 -mt-4 flex flex-col">
             {/* Render Engine Selector */}
             <div className="bg-gray-900 border-b border-white/5 py-3 px-3" data-help-id="render.engine">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Render Engine</label>
                <div className="flex bg-black/40 rounded p-0.5 border border-white/10">
                    <button 
                        onClick={() => handleModeSwitch('Direct')}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${state.renderMode === 'Direct' ? 'bg-cyan-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Direct (Fast)
                    </button>
                    <button 
                        onClick={() => ptEnabled && handleModeSwitch('PathTracing')}
                        disabled={!ptEnabled}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                            !ptEnabled 
                            ? 'text-gray-700 cursor-not-allowed opacity-50 bg-transparent'
                            : state.renderMode === 'PathTracing' 
                                ? 'bg-purple-700 text-white' 
                                : 'text-gray-500 hover:text-gray-300'
                        }`}
                        title={!ptEnabled ? "Path Tracer Disabled in Engine Panel" : "Switch to Path Tracer (GI)"}
                    >
                        Path Tracer (GI)
                    </button>
                </div>
             </div>

             {/* Viewport Mode */}
             <div className="bg-gray-800/20 border-b border-white/5 py-3 px-3" onContextMenu={handleHeaderContextMenu} data-help-id="panel.quality">
                <ToggleSwitch 
                    label="Resolution"
                    value={state.resolutionMode}
                    onChange={actions.setResolutionMode}
                    options={[
                        { label: 'Fill Screen', value: 'Full' },
                        { label: 'Fixed', value: 'Fixed' }
                    ]}
                />

                {/* Internal Scale */}
                <div className="mt-3 bg-black/20 rounded border border-white/5 p-2" data-help-id="quality.scale">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Internal Scale</label>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">{`${state.aaLevel.toFixed(2)}x`}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-px bg-white/5 border border-white/5 rounded overflow-hidden">
                        {aaLevels.map(level => (
                            <button
                                key={level}
                                onClick={() => actions.setAALevel(level)}
                                className={`py-1.5 text-[9px] font-black transition-all ${
                                    state.aaLevel === level
                                    ? 'bg-cyan-600/40 text-cyan-300 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]'
                                    : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                    
                    {/* Performance / Dynamic Res Settings (AutoFeaturePanel) */}
                    <div className="mt-2 pt-2 border-t border-white/5">
                        <AutoFeaturePanel featureId="quality" groupFilter="performance" />
                    </div>
                </div>
                
                {/* Resolution Controls (Only if Fixed) */}
                {state.resolutionMode === 'Fixed' && (
                    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/5 animate-fade-in">
                        <Dropdown 
                            label="Preset"
                            value={currentPreset}
                            options={[
                                { label: 'SVGA (800 x 600)', value: '800x600' },
                                { label: 'HD (1280 x 720)', value: '1280x720' },
                                { label: 'FHD (1920 x 1080)', value: '1920x1080' },
                                { label: 'QHD (2560 x 1440)', value: '2560x1440' },
                                { label: '4K (3840 x 2160)', value: '3840x2160' },
                                { label: 'Square 1:1 (1080p)', value: '1080x1080' },
                                { label: 'Portrait 4:5 (1080p)', value: '1080x1350' },
                                { label: 'Vertical 9:16 (1080p)', value: '1080x1920' },
                                { label: 'Skybox Low (2048 x 1024)', value: '2048x1024' },
                                { label: 'Skybox High (4096 x 2048)', value: '4096x2048' },
                                { label: 'Custom', value: 'Custom' }
                            ]}
                            onChange={(val) => {
                                if (val !== 'Custom') {
                                    const [nW, nH] = (val as string).split('x').map(Number);
                                    setRes(nW, nH);
                                }
                            }}
                            fullWidth
                        />

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Width</label>
                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                    <DraggableNumber 
                                        value={w} 
                                        onChange={(v) => handleDimensionChange('w', v)} 
                                        step={8} min={64} max={8192} 
                                        overrideText={`${w}`}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Height</label>
                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                    <DraggableNumber 
                                        value={h} 
                                        onChange={(v) => handleDimensionChange('h', v)} 
                                        step={8} min={64} max={8192} 
                                        overrideText={`${h}`}
                                    />
                                </div>
                            </div>
                            
                            {/* Ratio Dropdown */}
                            <div className="w-[35%]">
                                <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Ratio</label>
                                <div className="h-6">
                                    <Dropdown 
                                        value={aspectLock}
                                        options={[
                                            { label: 'Free', value: 'Free' },
                                            { label: '16:9', value: 1.7777 },
                                            { label: '4:3', value: 1.3333 },
                                            { label: '1:1', value: 1.0 },
                                            { label: '4:5 (Portrait)', value: 0.8 },
                                            { label: '9:16 (Vertical)', value: 0.5625 },
                                            { label: '2:1 (Sky)', value: 2.0 }
                                        ]}
                                        onChange={(v) => {
                                            setAspectLock(v);
                                            if (v !== 'Free') {
                                                setRes(w, w / (v as number));
                                            }
                                        }}
                                        fullWidth
                                        className="!px-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
             </div>

             {/* TSS Section */}
             <div className="bg-gray-800/10 border-b border-white/5 py-3 px-3" data-help-id="quality.tss">
                <ToggleSwitch 
                    label="Temporal AA (Remove Noise)"
                    value={state.accumulation}
                    onChange={actions.setAccumulation}
                    color="bg-green-500"
                    helpId="quality.tss"
                />
                
                {/* Copied from Lighting Engine Panel: Area Lights (Stochastic Shadows) */}
                {ptEnabled && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                        <ToggleSwitch
                            label="Area Lights (Soft Shadows)"
                            value={lighting.ptStochasticShadows}
                            onChange={(v) => setLighting && setLighting({ ptStochasticShadows: v })}
                            helpId="pt.global"
                        />
                    </div>
                )}
             </div>
             
             {/* Shadow Quality Settings */}
             {(lighting?.shadowsCompile && lighting?.shadows) && (
                 <div className="bg-gray-800/10 border-b border-white/5 py-2 px-3" data-help-id="shadows">
                     {/* Removed Heading per Director request */}
                     <AutoFeaturePanel featureId="lighting" groupFilter="shadow_quality" />
                 </div>
             )}

             {/* Raymarching Controls - Runtime */}
             <div className="flex flex-col">
                {/* Removed Heading per Director request */}
                {quality && (
                    <AutoFeaturePanel featureId="quality" groupFilter="kernel" />
                )}
             </div>
        </div>
    );
};

export default QualityPanel;
