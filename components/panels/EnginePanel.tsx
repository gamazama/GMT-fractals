
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { featureRegistry } from '../../engine/FeatureSystem';
import { AlertIcon, CheckIcon, InfoIcon, SpinnerIcon } from '../Icons';
import { FractalEvents } from '../../engine/FractalEvents';
import { EngineFeatureRow, EngineStatus } from './engine/EngineFeatureRow';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import Dropdown from '../Dropdown';
import { detectEngineProfile, ENGINE_PROFILES, estimateCompileTime } from '../../features/engine/profiles';
import { SectionLabel } from '../SectionLabel';

interface EnginePanelProps {
    className?: string;
}

export const EnginePanel: React.FC<EnginePanelProps> = ({ className = "-m-4" }) => {
    const store = useFractalStore();
    const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({});
    const [compileFeedback, setCompileFeedback] = useState<string | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);
    
    // 1. Construct Virtual State for Detection (Store + Pending Overrides)
    const virtualState = useMemo(() => {
        const vState: Record<string, Record<string, unknown>> = {};
        // Only need to clone slices that are actually used in profiles
        const relevantFeatures = ['lighting', 'ao', 'geometry', 'reflections', 'quality', 'atmosphere'];

        relevantFeatures.forEach(fid => {
            // Shallow copy slice if it exists
            const slice = (store as Record<string, unknown>)[fid];
            if (slice && typeof slice === 'object') {
                vState[fid] = { ...(slice as Record<string, unknown>) };
            }
        });

        // Overlay pending changes
        Object.entries(pendingChanges).forEach(([key, val]) => {
            const [fid, param] = key.split('.');
            if (vState[fid]) {
                vState[fid][param] = val;
            }
        });
        
        return vState;
    }, [store, pendingChanges]);

    // 2. Detect Profile and estimate compile time based on Virtual State
    const activeProfileKey = detectEngineProfile(virtualState);
    const activeProfileLabel = activeProfileKey.charAt(0).toUpperCase() + activeProfileKey.slice(1);
    const estCompileMs = useMemo(() => estimateCompileTime(virtualState), [virtualState]);
    const estCompileSec = (estCompileMs / 1000).toFixed(1);
    
    const engineFeatures = featureRegistry.getEngineFeatures();

    // Ref to latest handleParamChange so the ENGINE_QUEUE listener never goes stale
    const handleParamChangeRef = useRef<(featureId: string, param: string, value: any) => void>(() => {});

    useEffect(() => {
        const unsubCompile = FractalEvents.on('compile_time', (sec) => {
            setCompileFeedback(`Compiled (${sec.toFixed(2)}s)`);
            setIsCompiling(false);
            setTimeout(() => setCompileFeedback(null), 3000);
        });

        const unsubIsCompiling = FractalEvents.on('is_compiling', (val) => {
            setIsCompiling(!!val);
        });

        // External panels route compile-time changes here via ENGINE_QUEUE
        const unsubQueue = FractalEvents.on('engine_queue', ({ featureId, param, value }) => {
            handleParamChangeRef.current(featureId, param, value);
        });

        return () => {
            unsubCompile();
            unsubIsCompiling();
            unsubQueue();
        };
    }, []);

    const handleParamChange = (featureId: string, param: string, value: any) => {
        const feature = featureRegistry.get(featureId);
        const pConfig = feature?.params[param];
        
        const isMaster = feature?.engineConfig?.toggleParam === param;
        const masterMode = feature?.engineConfig?.mode;
        const paramRequiresCompile = pConfig?.onUpdate === 'compile';
        
        const mustQueue = (isMaster && masterMode === 'compile') || paramRequiresCompile;

        if (!mustQueue) {
            // Instant Update
            const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
            const action = (store as any)[setterName];
            if (action) {
                action({ [param]: value });
            }
            
            // Clean up pending if it matches new value
            const key = `${featureId}.${param}`;
            if (pendingChanges[key] !== undefined) {
                const next = { ...pendingChanges };
                delete next[key];
                setPendingChanges(next);
            }
        } else {
            // Queue for Compilation
            const key = `${featureId}.${param}`;
            const slice = (store as any)[featureId];
            
            // If returning to store value, remove from pending
            if (slice && slice[param] === value) {
                const next = { ...pendingChanges };
                delete next[key];
                setPendingChanges(next);
            } else {
                setPendingChanges(prev => ({ ...prev, [key]: value }));
            }
            setCompileFeedback(null);
        }
    };
    handleParamChangeRef.current = handleParamChange;

    const applyPendingChanges = () => {
        FractalEvents.emit('is_compiling', "Compiling Shaders...");
        
        const updatesByFeature: Record<string, any> = {};
        
        Object.entries(pendingChanges).forEach(([key, value]) => {
            const [featId, param] = key.split('.');
            if (!updatesByFeature[featId]) updatesByFeature[featId] = {};
            updatesByFeature[featId][param] = value;
        });
        
        setTimeout(() => {
             Object.entries(updatesByFeature).forEach(([featId, updates]) => {
                 const setterName = `set${featId.charAt(0).toUpperCase() + featId.slice(1)}`;
                 const action = (store as any)[setterName];
                 if (action) action(updates);
             });
             setPendingChanges({});
        }, 100);
    };
    
    const handlePreset = (mode: string) => {
        if (mode === 'Custom') return;

        const profile = ENGINE_PROFILES[mode as keyof typeof ENGINE_PROFILES];
        if (!profile) return;

        const newPending: Record<string, unknown> = {};

        // Populate pending changes based on diffs between Profile and Store
        Object.entries(profile).forEach(([featId, params]) => {
            Object.entries(params as Record<string, unknown>).forEach(([param, val]) => {
                const storeVal = (store as Record<string, Record<string, unknown>>)[featId]?.[param];
                
                let isDiff = storeVal !== val;
                // Fuzzy match for floats
                if (typeof val === 'number' && typeof storeVal === 'number') {
                    isDiff = Math.abs(val - storeVal) > 0.001;
                }
                
                if (isDiff) {
                    newPending[`${featId}.${param}`] = val;
                }
            });
        });
        
        // Fully replace pending state to switch context to new preset
        setPendingChanges(newPending);
        setCompileFeedback(null);
    };
    
    const getMergedState = (featureId: string) => {
        const slice = (store as any)[featureId];
        if (!slice) return {};
        const merged = { ...slice };
        
        Object.entries(pendingChanges).forEach(([key, value]) => {
            const [fId, param] = key.split('.');
            if (fId === featureId) {
                merged[param] = value;
            }
        });
        return merged;
    };

    return (
        <div className={`flex flex-col h-full bg-[#080808] min-h-0 overflow-hidden ${className}`} data-help-id="panel.engine">
            <div className="px-3 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between shrink-0">
                <SectionLabel>Engine Configuration</SectionLabel>
                <div className="w-32">
                    <Dropdown 
                        value={activeProfileLabel}
                        options={[
                            { label: 'Fastest (Bare)', value: 'Fastest' },
                            { label: 'Lite (Fast)', value: 'Lite' },
                            { label: 'Balanced', value: 'Balanced' },
                            { label: 'Ultra', value: 'Ultra' },
                            { label: 'Custom', value: 'Custom' }
                        ]}
                        onChange={(val) => handlePreset(val.toLowerCase())}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-0 min-h-0">
                <div className="flex gap-2 items-center px-3 py-2 bg-blue-900/10 border-b border-white/5 mb-1 shrink-0">
                    <div className="text-blue-400"><InfoIcon /></div>
                    <p className="text-[9px] text-blue-200/80 leading-tight">
                        <span className="text-green-400">●</span> Compiled &nbsp; 
                        <span className="text-amber-400">●</span> Pending &nbsp; 
                        <span className="text-blue-400">●</span> Instant
                    </p>
                </div>

                <div className="flex flex-col">
                    {engineFeatures.map(feat => {
                        const config = feat.engineConfig!;
                        const effectiveState = getMergedState(feat.id);
                        const toggleParam = config.toggleParam;
                        const isEnabled = effectiveState[toggleParam];
                        
                        const toggleKey = `${feat.id}.${toggleParam}`;
                        const isTogglePending = pendingChanges[toggleKey] !== undefined;

                        const rowStatus = isTogglePending ? 'pending' : 'synced';

                        return (
                            <div key={feat.id} className="group">
                                <EngineFeatureRow 
                                    label={config.label}
                                    description={config.description}
                                    isActive={isEnabled}
                                    onToggle={(val) => handleParamChange(feat.id, toggleParam, val)}
                                    status={rowStatus}
                                />
                                {isEnabled && config.groupFilter && (
                                    <div className="ml-4 pl-2 border-l border-white/10 my-0.5">
                                        <AutoFeaturePanel 
                                            featureId={feat.id} 
                                            groupFilter={config.groupFilter} 
                                            excludeParams={[config.toggleParam]}
                                            variant="dense"
                                            forcedState={effectiveState}
                                            onChangeOverride={(key, val) => handleParamChange(feat.id, key, val)}
                                            pendingChanges={pendingChanges}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="px-3 py-2 bg-[#1a1a1a] border-t border-white/10 flex items-center justify-between min-h-[40px] shrink-0 z-10">
                {isCompiling ? (
                    <>
                        <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold">
                            <SpinnerIcon className="animate-spin h-3 w-3" />
                            <span>Compiling...</span>
                        </div>
                        <div className="text-[9px] text-gray-500">~{estCompileSec}s</div>
                    </>
                ) : Object.keys(pendingChanges).length > 0 ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-2 text-amber-500 text-[10px] font-bold animate-pulse">
                                <AlertIcon />
                                <span>Pending</span>
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono">~{estCompileSec}s</span>
                        </div>
                        <button
                            onClick={applyPendingChanges}
                            disabled={isCompiling}
                            className="px-4 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold text-[10px] rounded transition-colors flex items-center gap-1"
                        >
                            <CheckIcon /> Apply
                        </button>
                    </>
                ) : (
                    <>
                         <div className="flex items-center gap-2">
                             <span className="text-[10px] text-gray-600 font-medium">System Ready</span>
                             <span className="text-[9px] text-gray-600 font-mono">~{estCompileSec}s</span>
                         </div>
                         {compileFeedback && (
                             <div className="text-[10px] text-green-400 font-bold animate-fade-in flex items-center gap-1">
                                 <CheckIcon /> {compileFeedback}
                             </div>
                         )}
                    </>
                )}
            </div>
        </div>
    );
};
