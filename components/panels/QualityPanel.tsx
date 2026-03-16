
import React, { useState, useMemo } from 'react';
import { FractalState, FractalActions } from '../../types';
import Slider, { DraggableNumber } from '../Slider';
import ToggleSwitch from '../ToggleSwitch';
import Dropdown from '../Dropdown';
import { useFractalStore } from '../../store/fractalStore';
import { collectHelpIds } from '../../utils/helpUtils';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import { FractalEvents } from '../../engine/FractalEvents';
import { LightingState } from '../../features/lighting';
import { SectionLabel, SectionDivider } from '../SectionLabel';

const QualityPanel = ({ state, actions }: { state: FractalState, actions: FractalActions }) => {
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    const quality = state.quality;
    const lighting = (state as any).lighting as LightingState | undefined;
    
    // Resolution Management
    const [w, h] = state.fixedResolution;
    const [aspectLock, setAspectLock] = useState<number | 'Free'>('Free');

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
             <div className="flex flex-col" data-help-id="render.engine">
                <div className="px-3 py-2">
                    <SectionLabel className="block mb-1">Render Engine</SectionLabel>
                    <div className="flex bg-black/40 rounded p-0.5 border border-white/10">
                        <button
                            onClick={() => handleModeSwitch('Direct')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${state.renderMode === 'Direct' ? 'bg-cyan-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Direct (Fast)
                        </button>
                        <button
                            onClick={() => ptEnabled && handleModeSwitch('PathTracing')}
                            disabled={!ptEnabled}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${
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

                {/* Path Tracer Controls */}
                {state.renderMode === 'PathTracing' && lighting && (
                    <div className="animate-fade-in" data-help-id="pt.global">
                         <Slider
                            label="Max Bounces"
                            value={lighting.ptBounces}
                            min={1} max={8} step={1}
                            onChange={(v) => setLighting({ ptBounces: Math.round(v) })}
                         />
                         <Slider
                            label="GI Brightness"
                            value={lighting.ptGIStrength}
                            min={0} max={5.0} step={0.01}
                            onChange={(v) => setLighting({ ptGIStrength: v })}
                            trackId="lighting.ptGIStrength"
                         />
                    </div>
                )}
             </div>

             <SectionDivider />

             {/* Viewport Mode — DDFS-style parent/child layout */}
             <div className="w-full flex flex-col rounded-t-sm relative" onContextMenu={handleHeaderContextMenu} data-help-id="panel.quality">
                {/* Parent background overlay */}
                <div className="absolute inset-0 bg-white/[0.06] rounded-t-sm pointer-events-none" />
                {/* Parent label header */}
                <div className="flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2">
                    <span className="text-[10px] text-gray-400 font-medium tracking-tight select-none">Resolution</span>
                </div>
                {/* Indented children */}
                <div className="flex flex-col">
                    {(() => {
                        const children: React.ReactNode[] = [
                            /* Fill / Fixed segmented buttons */
                            <div key="mode">
                                <ToggleSwitch
                                    value={state.resolutionMode}
                                    onChange={actions.setResolutionMode}
                                    options={[
                                        { label: 'Fill Screen', value: 'Full' },
                                        { label: 'Fixed', value: 'Fixed' }
                                    ]}
                                />
                            </div>
                        ];
                        if (state.resolutionMode === 'Fixed') {
                            children.push(
                                <div key="fixed" className="animate-fade-in">
                                    <div className="flex flex-col gap-2 px-3 py-2 bg-neutral-800/50">
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
                                                <SectionLabel variant="secondary" className="block mb-0.5">Width</SectionLabel>
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
                                                <SectionLabel variant="secondary" className="block mb-0.5">Height</SectionLabel>
                                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                                    <DraggableNumber
                                                        value={h}
                                                        onChange={(v) => handleDimensionChange('h', v)}
                                                        step={8} min={64} max={8192}
                                                        overrideText={`${h}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-[35%]">
                                                <SectionLabel variant="secondary" className="block mb-0.5">Ratio</SectionLabel>
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
                                </div>
                            );
                        }
                        children.push(
                            <div key="scale" data-help-id="quality.scale">
                                <div className="px-3 py-2">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <SectionLabel variant="secondary">Internal Scale</SectionLabel>
                                        <span className="text-[10px] font-mono text-cyan-400 font-bold">{`${state.aaLevel.toFixed(2)}x`}</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-px bg-white/5 border border-white/5 rounded overflow-hidden">
                                        {aaLevels.map(level => (
                                            <button
                                                key={level}
                                                onClick={() => actions.setAALevel(level)}
                                                className={`py-1.5 text-[9px] font-bold transition-all ${
                                                    state.aaLevel === level
                                                    ? 'bg-cyan-600/40 text-cyan-300 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]'
                                                    : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>,
                            <div key="performance">
                                <AutoFeaturePanel featureId="quality" groupFilter="performance" />
                            </div>
                        );
                        return children.map((child, i) => {
                            const isLast = i === children.length - 1;
                            return (
                                <div key={i} className="flex">
                                    <div className={`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${isLast ? 'border-b border-b-white/20 rounded-bl-lg' : ''}`} />
                                    <div className={`flex-1 min-w-0 relative ${isLast ? 'border-b border-b-white/20' : ''}`}>
                                        <div className="absolute inset-0 bg-black/20 pointer-events-none z-10" />
                                        {child}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                    <div className="h-2" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08))' }} />
                </div>
             </div>

             <SectionDivider />

             {/* TSS & Shadows */}
             <div className="flex flex-col" data-help-id="quality.tss">
                <ToggleSwitch
                    label="Temporal AA (Remove Noise)"
                    value={state.accumulation}
                    onChange={actions.setAccumulation}
                    color="bg-green-500"
                    helpId="quality.tss"
                />

                {/* Area Lights (Stochastic Shadows) */}
                {ptEnabled && (
                    <ToggleSwitch
                        label="Area Lights (Soft Shadows)"
                        value={lighting?.ptStochasticShadows ?? false}
                        onChange={(v) => setLighting && setLighting({ ptStochasticShadows: v })}
                        helpId="pt.global"
                    />
                )}
             </div>

             {/* Shadow Quality Settings */}
             {(lighting?.shadowsCompile && lighting?.shadows) && (
                 <div className="flex flex-col" data-help-id="shadows">
                     <AutoFeaturePanel featureId="lighting" groupFilter="shadow_quality" />
                 </div>
             )}

             <SectionDivider />

             {/* Raymarching Controls - Runtime */}
             <div className="flex flex-col">
                {quality && (
                    <AutoFeaturePanel featureId="quality" groupFilter="kernel" />
                )}
             </div>
        </div>
    );
};

export default QualityPanel;
