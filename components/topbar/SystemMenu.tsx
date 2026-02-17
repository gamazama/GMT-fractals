
import React, { useRef, useState, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { registry } from '../../engine/FractalRegistry';
import { featureRegistry } from '../../engine/FeatureSystem'; 
import { engine } from '../../engine/FractalEngine';
import { FractalEvents } from '../../engine/FractalEvents';
import { MenuIcon, SaveIcon, LoadIcon, ResetIcon, CodeIcon, HelpIcon, InfoIcon, FullscreenIcon, SmileyIcon, CubeIcon, LinkIcon } from '../Icons';
import { extractMetadata } from '../../utils/pngMetadata';
import { getExportFileName } from '../../utils/fileUtils';
import { detectEngineProfile } from '../../features/engine/profiles';
import Dropdown from '../Dropdown';

interface SystemMenuProps {
    isMobileMode: boolean;
    vibrate: (ms: number) => void;
    btnBase: string;
    btnActive: string;
    btnInactive: string;
}

export const SystemMenu: React.FC<SystemMenuProps> = ({ isMobileMode, vibrate, btnBase, btnActive, btnInactive }) => {
    const state = useFractalStore();
    // Dynamic access to all feature slices
    const fullState = state as any; 
    const { handleInteractionStart, handleInteractionEnd } = state;
    
    const [showSystemMenu, setShowSystemMenu] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [gpuInfo, setGpuInfo] = useState<string>("");
    const [linkStatus, setLinkStatus] = useState<string | null>(null);
    const [loadStatus, setLoadStatus] = useState<string | null>(null);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const menuFeatures = featureRegistry.getMenuFeatures();
    const extraMenuItems = featureRegistry.getExtraMenuItems();

    // Detect current engine profile for the dropdown
    const currentProfile = detectEngineProfile(state);
    const currentProfileLabel = currentProfile.charAt(0).toUpperCase() + currentProfile.slice(1);

    useEffect(() => {
        if (engine.renderer) {
            const gl = engine.renderer.getContext();
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) setGpuInfo(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
            else setGpuInfo("Generic WebGL Device");
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement;
            if (menuRef.current && !menuRef.current.contains(target)) {
                // Don't close if clicking inside a portal (like Dropdown menu)
                if (target.closest('.portal-dropdown-content') || target.closest('.t-dropdown')) return;
                setShowSystemMenu(false);
                setShowAbout(false);
            }
        };
        if (showSystemMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showSystemMenu]);

    const toggleSystemMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        vibrate(5);
        setShowSystemMenu(!showSystemMenu);
    };

    const handleSavePreset = () => {
        const currentVersion = state.prepareExport();
        const settings = state.projectSettings;
        const p = state.getPreset();
        
        const b = new Blob([JSON.stringify(p, null, 2)], {type: 'application/json'});
        const u = URL.createObjectURL(b);
        const a = document.createElement('a');
        
        a.href = u;
        a.download = getExportFileName(settings.name, currentVersion, 'json');
        a.click();
        
        URL.revokeObjectURL(u);
    };

    const handleLoadPreset = () => fileInputRef.current?.click();

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        FractalEvents.emit('is_compiling', "Processing...");
        await new Promise(r => setTimeout(r, 50));
        
        try {
            let jsonString = "";
            if (file.type === "image/png") {
                const meta = await extractMetadata(file, "FractalData");
                if (meta) jsonString = meta;
                else throw new Error("No Fractal Data found in this image.");
            } else {
                jsonString = await file.text();
            }

            const preset = JSON.parse(jsonString);
            state.loadPreset(preset);
            vibrate(50);
            
            setShowSystemMenu(false);
        } catch (err: any) {
            console.error("Load Failed:", err);
            FractalEvents.emit('is_compiling', false);
            setLoadStatus("Error!");
            setTimeout(() => setLoadStatus(null), 2000);
            alert("Could not load preset. " + err.message);
        }
        e.target.value = '';
    };

    const handleShareLink = () => {
        const WARNING_LIMIT = 4096;
        let str = state.getShareString({ includeAnimations: true });
        let warning = "";

        if (str.length > WARNING_LIMIT) {
             const shortStr = state.getShareString({ includeAnimations: false });
             if (shortStr.length < str.length && shortStr.length < WARNING_LIMIT) {
                 str = shortStr;
                 warning = " (Anims Removed)";
             } else {
                 warning = " (Long URL)";
             }
        }

        const url = `${window.location.origin}${window.location.pathname}#s=${str}`;
        navigator.clipboard.writeText(url).then(() => {
            setLinkStatus(`Copied!${warning}`);
            vibrate(50);
            setTimeout(() => setLinkStatus(null), 2500);
        });
    };
    
    const handleResetFormula = () => {
        vibrate(20);
        const current = state.getPreset();
        const def = registry.get(state.formula);
        if (!def || !def.defaultPreset) return;
        const d = def.defaultPreset;
        const mixedPreset = {
            ...d,
            cameraPos: current.cameraPos, cameraRot: current.cameraRot, sceneOffset: current.sceneOffset,
            targetDistance: current.targetDistance, cameraMode: current.cameraMode, lights: current.lights,
            features: {
                ...(d.features || {}),
                atmosphere: current.features?.atmosphere, lighting: current.features?.lighting,
                optics: current.features?.optics, materials: current.features?.materials, 
                coreMath: d.features?.coreMath, geometry: d.features?.geometry,
                coloring: d.features?.coloring, texturing: d.features?.texturing, quality: d.features?.quality
            }
        };
        handleInteractionStart('param');
        state.loadPreset(mixedPreset as any);
        handleInteractionEnd();
        setShowSystemMenu(false);
    };

    const handleResetScene = () => {
        vibrate(20);
        const current = state.getPreset();
        handleInteractionStart('camera');
        state.resetCamera();
        const def = registry.get('Mandelbulb')?.defaultPreset;
        if(def) {
             const mixed = {
                 ...current, cameraPos: def.cameraPos, cameraRot: def.cameraRot, sceneOffset: def.sceneOffset, targetDistance: def.targetDistance,
                 features: { ...current.features, atmosphere: def.features?.atmosphere, lighting: def.features?.lighting, optics: def.features?.optics, materials: def.features?.materials }
             };
             state.loadPreset(mixed as any);
        }
        handleInteractionEnd();
        setShowSystemMenu(false);
    };
    
    const handleFeatureToggle = (featureId: string, paramKey: string, val: boolean) => {
        const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
        const setter = (state as any)[setterName];
        if (setter) {
            setter({ [paramKey]: val });
            const feat = featureRegistry.get(featureId);
            if (feat?.tabConfig) {
                 const tabId = feat.tabConfig.label as any;
                 if (val) state.floatTab(tabId);
                 else state.dockTab(tabId);
            }
        }
    };
    
    const renderFeatureToggle = (feat: any, isSimple: boolean = false) => {
        const slice = fullState[feat.id || feat.featureId];
        if (!slice) return null;
        const isEnabled = !!slice[feat.toggleParam];
        const color = feat.id === 'audio' ? 'bg-green-600' : 'bg-cyan-600';
        const textColor = feat.id === 'audio' ? 'text-green-400' : 'text-cyan-400';
        
        if (isSimple) {
             const iconMap: any = { 'Code': <CodeIcon />, 'Info': <InfoIcon /> };
             const icon = feat.icon ? iconMap[feat.icon] : null;
             return (
                <button 
                    key={`${feat.featureId}-${feat.toggleParam}`}
                    onClick={(e) => { e.stopPropagation(); vibrate(5); handleFeatureToggle(feat.featureId, feat.toggleParam, !isEnabled); setShowSystemMenu(false); }}
                    className={`w-full flex items-center justify-between p-2 rounded transition-colors group ${isEnabled ? 'bg-white/10 text-cyan-400' : 'hover:bg-white/5 text-gray-300'}`}
                >
                    <span className="text-xs font-bold">{feat.label}</span>
                    {icon}
                </button>
             );
        }
        return (
            <label key={feat.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer animate-fade-in-left">
                <span className={`text-xs font-bold ${isEnabled ? textColor : 'text-gray-300'}`}>{feat.label}</span>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isEnabled ? color : 'bg-gray-700'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <input type="checkbox" className="hidden" checked={isEnabled} onChange={(e) => handleFeatureToggle(feat.id, feat.toggleParam, e.target.checked)} />
            </label>
        );
    };

    const handlePresetChange = (val: string) => {
        vibrate(10);
        FractalEvents.emit('is_compiling', "Switching Profile...");
        setTimeout(() => {
            // @ts-ignore
            state.applyPreset({ mode: val.toLowerCase(), actions: state });
        }, 10);
    };

    const standardFeatures = menuFeatures.filter(f => !f.advancedOnly);
    const advancedFeatures = menuFeatures.filter(f => f.advancedOnly);
    const extraAdvanced = extraMenuItems.filter(f => f.advancedOnly);
    
    return (
        <>
            {!isMobileMode && (
                <>
                    <button onClick={handleShareLink} className={`${btnBase} ${btnInactive} relative`} title="Copy Share Link">
                        <LinkIcon />
                        {linkStatus && <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-[9px] font-bold uppercase rounded whitespace-nowrap animate-fade-in">{linkStatus}</div>}
                    </button>
                    <button onClick={handleSavePreset} className={`${btnBase} ${btnInactive}`} title="Save Preset (JSON)">
                        <SaveIcon />
                    </button>
                    <button onClick={handleLoadPreset} className={`${btnBase} ${btnInactive} relative`} title="Load Preset (JSON or PNG)">
                        <LoadIcon />
                        {loadStatus && <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-blue-600 text-white text-[9px] font-bold uppercase rounded whitespace-nowrap animate-fade-in">{loadStatus}</div>}
                    </button>
                </>
            )}
            
            <input ref={fileInputRef} type="file" accept=".json,.png" className="hidden" onChange={handleFileSelect} />

            <div className="relative" ref={menuRef}>
                <button onClick={toggleSystemMenu} className={`${btnBase} ${showSystemMenu ? btnActive : btnInactive}`}><MenuIcon /></button>
                {showSystemMenu && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-black border border-white/20 rounded-xl p-2 shadow-2xl z-[70] animate-fade-in origin-top-right custom-scroll overflow-y-auto max-h-[85vh]">
                        <div className="absolute -top-1.5 right-4 w-3 h-3 bg-black border-t border-l border-white/20 transform rotate-45" />
                        <div className="space-y-1">
                            <button onClick={(e) => { e.stopPropagation(); handleShareLink(); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className={`text-xs font-bold ${linkStatus ? 'text-green-400' : 'group-hover:text-white'}`}>{linkStatus || "Copy Share Link"}</span>
                                <LinkIcon active={!!linkStatus} />
                            </button>
                            <div className="h-px bg-white/10 my-1" />
                            {isMobileMode && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); toggleSystemMenu(e); handleSavePreset(); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group border-b border-white/10 mb-1"><span className="text-xs font-bold group-hover:text-white">Save Preset</span><SaveIcon /></button>
                                    <button onClick={(e) => { e.stopPropagation(); toggleSystemMenu(e); handleLoadPreset(); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group border-b border-white/10 mb-1"><span className="text-xs font-bold group-hover:text-white">Load Preset</span><LoadIcon /></button>
                                    <div className="h-px bg-white/10 my-1" />
                                </>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleResetFormula(); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 hover:text-white transition-colors group"><span className="text-xs font-bold">Reset Formula</span><ResetIcon /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleResetScene(); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 hover:text-white transition-colors group"><span className="text-xs font-bold">Reset Scene</span><CubeIcon /></button>
                            
                            <div className="h-px bg-white/10 my-1" />
                            
                            {standardFeatures.map(feat => renderFeatureToggle(feat))}

                            {/* CLEAN ENGINE SETTINGS UI */}
                            <div className="h-px bg-white/10 my-1" />
                            
                            {/* Toggle */}
                            {renderFeatureToggle({ id: 'engineSettings', toggleParam: 'showEngineTab', label: 'Engine Settings' })}
                            
                            {/* Preset Dropdown */}
                            <div className="px-2 mb-1 mt-0.5">
                                <Dropdown 
                                    value={currentProfileLabel}
                                    onChange={handlePresetChange}
                                    selectClassName="!text-left pl-2" // Force left align
                                    options={[
                                        { label: 'Fastest (Bare)', value: 'Fastest' },
                                        { label: 'Lite (Fast)', value: 'Lite' },
                                        { label: 'Balanced', value: 'Balanced' },
                                        { label: 'Ultra', value: 'Ultra' },
                                        { label: '---', value: 'Custom' }
                                    ]}
                                    fullWidth
                                />
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); state.setIsBroadcastMode(true); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-400">Hide Interface</span>
                                <FullscreenIcon />
                            </button>

                            <label className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer">
                                <span className="text-xs text-gray-300 font-bold">Invert Look Y</span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${state.invertY ? 'bg-cyan-600' : 'bg-gray-700'}`}><div className={`w-3 h-3 bg-white rounded-full transition-transform ${state.invertY ? 'translate-x-4' : 'translate-x-0'}`} /></div>
                                <input type="checkbox" className="hidden" checked={state.invertY} onChange={(e) => { vibrate(5); state.setInvertY(e.target.checked); }} />
                            </label>
                            
                            <div className="h-px bg-white/10 my-1" />
                            
                            <label className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer">
                                <span className="text-xs text-gray-300 font-bold">Advanced Mode</span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${state.advancedMode ? 'bg-purple-600' : 'bg-gray-700'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${state.advancedMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input type="checkbox" className="hidden" checked={state.advancedMode} onChange={(e) => state.setAdvancedMode(e.target.checked)} />
                            </label>

                            {state.advancedMode && (
                                <div className="mt-1 pl-2 border-l border-white/10 ml-2">
                                    {advancedFeatures.map(feat => renderFeatureToggle(feat))}
                                    {extraAdvanced.map(item => renderFeatureToggle(item, true))}
                                    <label className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer">
                                        <span className="text-xs text-gray-300 font-bold">Force Mobile UI</span>
                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${state.debugMobileLayout ? 'bg-purple-600' : 'bg-gray-700'}`}><div className={`w-3 h-3 bg-white rounded-full transition-transform ${state.debugMobileLayout ? 'translate-x-4' : 'translate-x-0'}`} /></div>
                                        <input type="checkbox" className="hidden" checked={state.debugMobileLayout} onChange={(e) => state.setDebugMobileLayout(e.target.checked)} />
                                    </label>
                                </div>
                            )}
                            
                            <div className="h-px bg-white/10 my-1" />
                            
                            <label className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer">
                                <span className="text-xs text-gray-300 font-bold">Show Hints</span>
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${state.showHints ? 'bg-green-600' : 'bg-gray-700'}`}><div className={`w-3 h-3 bg-white rounded-full transition-transform ${state.showHints ? 'translate-x-4' : 'translate-x-0'}`} /></div>
                                <input type="checkbox" className="hidden" checked={state.showHints} onChange={(e) => { vibrate(5); state.setShowHints(e.target.checked); }} />
                            </label>
                            
                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); state.openHelp('general.shortcuts'); setShowSystemMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-cyan-400 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-200">Help</span>
                                <HelpIcon />
                            </button>
                            
                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); setShowAbout(!showAbout); }} className={`w-full flex items-center justify-between p-2 rounded transition-colors ${showAbout ? 'bg-white/10 text-cyan-400' : 'hover:bg-white/5 text-gray-300'}`}>
                                <span className="text-xs font-bold">About GMT</span>
                                <SmileyIcon />
                            </button>

                            {showAbout && (
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5 animate-fade-in mt-1">
                                    <div className="text-[10px] text-gray-400 leading-relaxed space-y-2">
                                        {gpuInfo && (
                                            <div className="mb-2 pb-2 border-b border-white/10">
                                                <div className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mb-1">Active Renderer</div>
                                                <div className="text-[9px] text-green-400 font-mono break-all">{gpuInfo}</div>
                                            </div>
                                        )}
                                        <p>GMT was crafted with ❤️ by <span className="text-white font-bold">Guy Zack</span> using <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Gemini</a>.</p>
                                        
                                        <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
                                            <a href="https://www.reddit.com/r/GMT_fractals/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                                <span>Community:</span>
                                                <span className="text-cyan-400 hover:underline">r/GMT_fractals</span>
                                            </a>
                                            <a href="https://github.com/gamazama/GMT-fractals" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                                <span>Source:</span>
                                                <span className="text-cyan-400 hover:underline">GitHub (GPL-3.0)</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
