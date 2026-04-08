
import React, { useRef, useState, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { featureRegistry } from '../../engine/FeatureSystem'; 
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { FractalEvents } from '../../engine/FractalEvents';
import { MenuIcon, SaveIcon, LoadIcon, CodeIcon, HelpIcon, InfoIcon, FullscreenIcon, SmileyIcon, LinkIcon } from '../Icons';
import { extractMetadata } from '../../utils/pngMetadata';
import { getExportFileName } from '../../utils/fileUtils';
import { saveGMFScene, loadGMFScene } from '../../utils/FormulaFormat';
import { registry } from '../../engine/FractalRegistry';
import { Popover } from '../Popover';
import { HardwarePreferences } from '../panels/HardwarePreferences';
import { DonateButton } from '../DonateButton';

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
    const [showSystemMenu, setShowSystemMenu] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showHardwarePrefs, setShowHardwarePrefs] = useState(false);
    const [gpuInfo, setGpuInfo] = useState<string>("");
    const [linkStatus, setLinkStatus] = useState<string | null>(null);
    const [loadStatus, setLoadStatus] = useState<string | null>(null);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const menuFeatures = featureRegistry.getMenuFeatures();
    const extraMenuItems = featureRegistry.getExtraMenuItems();

    useEffect(() => {
        // GPU info is available in both passthrough and worker mode via the proxy
        const info = engine.gpuInfo;
        if (info) {
            setGpuInfo(info);
        } else {
            // Worker may not have booted yet — retry after a short delay
            const timer = setTimeout(() => {
                setGpuInfo(engine.gpuInfo || 'Generic WebGL Device');
            }, 3000);
            return () => clearTimeout(timer);
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

        const gmfString = saveGMFScene(p);
        const b = new Blob([gmfString], {type: 'text/plain'});
        const u = URL.createObjectURL(b);
        const a = document.createElement('a');

        a.href = u;
        a.download = getExportFileName(settings.name, currentVersion, 'gmf');
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
            let content = "";
            if (file.type === "image/png") {
                const meta = await extractMetadata(file, "FractalData");
                if (meta) content = meta;
                else throw new Error("No Fractal Data found in this image.");
            } else {
                content = await file.text();
            }

            // Detect GMF vs legacy JSON format
            const { def, preset } = loadGMFScene(content);

            // loadScene handles: formula registration (main + worker),
            // store hydration, full config flush, and offset sync.
            state.loadScene({ def: def || undefined, preset });
            vibrate(50);

            setShowSystemMenu(false);
        } catch (err) {
            console.error("Load Failed:", err);
            FractalEvents.emit('is_compiling', false);
            setLoadStatus("Error!");
            setTimeout(() => setLoadStatus(null), 2000);
            alert("Could not load preset. " + (err instanceof Error ? err.message : String(err)));
        }
        e.target.value = '';
    };

    // Check if current formula is an imported (Workshop) formula — not shareable via URL
    const isImportedFormula = !!registry.get(state.formula)?.importSource;

    const handleShareLink = () => {
        if (isImportedFormula) {
            setLinkStatus("N/A (Imported)");
            setTimeout(() => setLinkStatus(null), 2500);
            return;
        }

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
    
    const handleFeatureToggle = (featureId: string, paramKey: string, val: boolean) => {
        const feat = featureRegistry.get(featureId);

        // Route compile-mode toggles to Engine Panel pending queue
        if (feat?.engineConfig?.mode === 'compile' && feat.params[paramKey]?.onUpdate === 'compile') {
            state.movePanel('Engine', 'left');
            setTimeout(() => FractalEvents.emit('engine_queue', { featureId, param: paramKey, value: val }), 50);
            return;
        }

        const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
        const setter = (state as any)[setterName];
        if (setter) {
            setter({ [paramKey]: val });
            if (feat?.tabConfig) {
                 const tabId = feat.tabConfig.label as any;
                 if (featureId === 'engineSettings') {
                     if (val) state.movePanel(tabId, 'left');
                 } else {
                     if (val) state.floatTab(tabId);
                     else state.dockTab(tabId);
                 }
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
        const btnColor = isEnabled
            ? (feat.id === 'audio' ? 'bg-green-500/30 text-green-300 border-green-500/40' : 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40')
            : 'bg-white/[0.04] text-gray-600 border-white/5';
        return (
            <div key={feat.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer animate-fade-in-left"
                 onClick={() => { vibrate(5); handleFeatureToggle(feat.id, feat.toggleParam, !isEnabled); }}>
                <span className={`text-xs font-bold ${isEnabled ? textColor : 'text-gray-300'}`}>{feat.label}</span>
                <span className={`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${btnColor}`}>{isEnabled ? 'ON' : 'OFF'}</span>
            </div>
        );
    };

    const standardFeatures = menuFeatures.filter(f => !f.advancedOnly);
    const advancedFeatures = menuFeatures.filter(f => f.advancedOnly);
    const extraAdvanced = extraMenuItems.filter(f => f.advancedOnly);
    
    return (
        <>
            {!isMobileMode && (
                <>
                    <button onClick={handleShareLink} className={`${btnBase} ${btnInactive} relative`} title={isImportedFormula ? "Share unavailable for imported formulas" : "Copy Share Link"}>
                        <LinkIcon />
                        {linkStatus && <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in">{linkStatus}</div>}
                    </button>
                    <button onClick={handleSavePreset} className={`${btnBase} ${btnInactive}`} title="Save Preset (GMF)">
                        <SaveIcon />
                    </button>
                    <button onClick={handleLoadPreset} className={`${btnBase} ${btnInactive} relative`} title="Load Preset (GMF, JSON, or PNG)">
                        <LoadIcon />
                        {loadStatus && <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-blue-600 text-white text-[9px] font-bold rounded whitespace-nowrap animate-fade-in">{loadStatus}</div>}
                    </button>
                </>
            )}
            
            <input ref={fileInputRef} type="file" accept=".gmf,.json,.png" className="hidden" onChange={handleFileSelect} />

            <div className="relative" ref={menuRef}>
                <button onClick={toggleSystemMenu} className={`${btnBase} ${showSystemMenu ? btnActive : btnInactive}`}><MenuIcon /></button>
                {showSystemMenu && (
                    <Popover width="w-64" align="end" className="p-2 custom-scroll overflow-y-auto max-h-[85vh]" onClose={() => setShowSystemMenu(false)}>
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
                            {standardFeatures.map(feat => renderFeatureToggle(feat))}

                            <div className="h-px bg-white/10 my-1" />

                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); setShowHardwarePrefs(true); setShowSystemMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-400">Hardware Settings</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
                                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); state.openWorkshop(); setShowSystemMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-purple-400">Formula Workshop</span>
                                <CodeIcon />
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); state.setIsBroadcastMode(true); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-400">Hide Interface <span className="text-gray-500 font-normal">[B]</span></span>
                                <FullscreenIcon />
                            </button>

                            <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer"
                                 onClick={() => { vibrate(5); state.setInvertY(!state.invertY); }}>
                                <span className="text-xs text-gray-300 font-bold">Invert Look Y</span>
                                <span className={`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${state.invertY ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40' : 'bg-white/[0.04] text-gray-600 border-white/5'}`}>{state.invertY ? 'ON' : 'OFF'}</span>
                            </div>
                            
                            <div className="h-px bg-white/10 my-1" />
                            
                            <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer" title="Keyboard: ` (tilde)"
                                 onClick={() => state.setAdvancedMode(!state.advancedMode)}>
                                <span className="text-xs text-gray-300 font-bold">Advanced Mode <span className="text-gray-500 font-normal">[`]</span></span>
                                <span className={`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${state.advancedMode ? 'bg-purple-500/30 text-purple-300 border-purple-500/40' : 'bg-white/[0.04] text-gray-600 border-white/5'}`}>{state.advancedMode ? 'ON' : 'OFF'}</span>
                            </div>

                            {state.advancedMode && (
                                <div className="mt-1 pl-2 border-l border-white/10 ml-2">
                                    {renderFeatureToggle({ id: 'engineSettings', toggleParam: 'showEngineTab', label: 'Engine Settings' })}
                                    {advancedFeatures.map(feat => renderFeatureToggle(feat))}
                                    {extraAdvanced.map(item => renderFeatureToggle(item, true))}
                                    <a href="mesh-export.html" target="_blank" rel="noopener noreferrer"
                                       onClick={(e) => {
                                         e.stopPropagation(); vibrate(5); setShowSystemMenu(false);
                                         try {
                                           const gmf = saveGMFScene(state.getPreset());
                                           localStorage.setItem('gmt-mesh-export-scene', gmf);
                                           console.log('[SystemMenu] Saved scene to localStorage:', gmf.length, 'chars');
                                         } catch (err) { console.warn('[SystemMenu] Failed to save scene:', err); }
                                       }}
                                       className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group no-underline">
                                        <span className="text-xs font-bold group-hover:text-orange-400">Mesh Export</span>
                                        <span className="text-[9px] text-gray-600">↗</span>
                                    </a>
                                    <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer"
                                         onClick={() => state.setDebugMobileLayout(!state.debugMobileLayout)}>
                                        <span className="text-xs text-gray-300 font-bold">Force Mobile UI</span>
                                        <span className={`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${state.debugMobileLayout ? 'bg-purple-500/30 text-purple-300 border-purple-500/40' : 'bg-white/[0.04] text-gray-600 border-white/5'}`}>{state.debugMobileLayout ? 'ON' : 'OFF'}</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="h-px bg-white/10 my-1" />
                            
                            <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer" title="Keyboard: H"
                                 onClick={() => { vibrate(5); state.setShowHints(!state.showHints); }}>
                                <span className="text-xs text-gray-300 font-bold">Show Hints <span className="text-gray-500 font-normal">[H]</span></span>
                                <span className={`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${state.showHints ? 'bg-green-500/30 text-green-300 border-green-500/40' : 'bg-white/[0.04] text-gray-600 border-white/5'}`}>{state.showHints ? 'ON' : 'OFF'}</span>
                            </div>
                            
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
                                                <div className="text-[8px] text-gray-500 font-bold mb-1">Active Renderer</div>
                                                <div className="text-[9px] text-green-400 font-mono break-all">{gpuInfo}</div>
                                            </div>
                                        )}
                                        <p className="text-[9px] text-gray-500 font-mono mb-1">v0.9.1</p>
                                        <p>GMT was crafted with ❤️ by <span className="text-white font-bold">Guy Zack</span> using <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Gemini</a> and <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Claude</a>.</p>
                                        
                                        <div className="pt-2 border-t border-white/10">
                                            <div className="text-[8px] text-gray-500 font-bold mb-1">Tech Stack</div>
                                            <div className="text-[9px] text-gray-500 font-mono">React + TypeScript + Three.js + GLSL + Zustand + Vite</div>
                                        </div>

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

                                        <div className="pt-2 border-t border-white/10">
                                            <p className="text-[9px] text-gray-500 mb-2">GMT is free & open source. With support I could spend more time developing it!</p>
                                            <DonateButton />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Popover>
                )}
            </div>

            {showHardwarePrefs && (
                <HardwarePreferences onClose={() => setShowHardwarePrefs(false)} />
            )}
        </>
    );
};
