
import React, { useState, useEffect, useMemo } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { featureRegistry } from '../../engine/FeatureSystem';
import { AlertIcon, CheckIcon, InfoIcon } from '../Icons';
import { FractalEvents } from '../../engine/FractalEvents';
import { EngineFeatureRow, EngineStatus } from './engine/EngineFeatureRow';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import Dropdown from '../Dropdown';
import { detectEngineProfile, ENGINE_PROFILES } from '../../features/engine/profiles';

interface EnginePanelProps {
    className?: string;
}

export const EnginePanel: React.FC<EnginePanelProps> = ({ className = "-m-4" }) => {
    const store = useFractalStore();
    const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
    const [compileFeedback, setCompileFeedback] = useState<string | null>(null);
    
    // 1. Construct Virtual State for Detection (Store + Pending Overrides)
    const virtualState = useMemo(() => {
        const vState: any = {};
        // Only need to clone slices that are actually used in profiles
        const relevantFeatures = ['lighting', 'ao', 'geometry', 'reflections', 'quality', 'atmosphere'];
        
        relevantFeatures.forEach(fid => {
            // Shallow copy slice if it exists
            if ((store as any)[fid]) {
                vState[fid] = { ...(store as any)[fid] };
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

    // 2. Detect Profile based on Virtual State
    const activeProfileKey = detectEngineProfile(virtualState);
    const activeProfileLabel = activeProfileKey.charAt(0).toUpperCase() + activeProfileKey.slice(1);
    
    const engineFeatures = featureRegistry.getEngineFeatures();
    
    useEffect(() => {
        const unsub = FractalEvents.on('compile_time', (sec) => {
            setCompileFeedback(`Compiled (${sec.toFixed(2)}s)`);
            setTimeout(() => setCompileFeedback(null), 3000);
        });
        return unsub;
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

        // @ts-ignore
        const profile = ENGINE_PROFILES[mode];
        if (!profile) return;

        const newPending: Record<string, any> = {};

        // Populate pending changes based on diffs between Profile and Store
        Object.entries(profile).forEach(([featId, params]) => {
            // @ts-ignore
            Object.entries(params).forEach(([param, val]) => {
                const storeVal = (store as any)[featId]?.[param];
                
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
        <div className={`flex flex-col h-full bg-[#080808] ${className}`} data-help-id="panel.engine">
            <div className="px-3 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Engine Configuration</span>
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

            <div className="flex-1 overflow-y-auto custom-scroll p-0">
                <div className="flex gap-2 items-center px-3 py-2 bg-blue-900/10 border-b border-white/5 mb-1">
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

            <div className="px-3 py-2 bg-[#1a1a1a] border-t border-white/10 flex items-center justify-between min-h-[40px]">
                {Object.keys(pendingChanges).length > 0 ? (
                    <>
                        <div className="flex items-center gap-2 text-amber-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                            <AlertIcon />
                            <span>Changes Pending</span>
                        </div>
                        <button onClick={applyPendingChanges} className="px-4 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold uppercase text-[10px] rounded transition-colors flex items-center gap-1">
                            <CheckIcon /> Apply
                        </button>
                    </>
                ) : (
                    <>
                         <div className="text-[10px] text-gray-600 font-medium">System Ready</div>
                         {compileFeedback && (
                             <div className="text-[10px] text-green-400 font-bold uppercase animate-fade-in flex items-center gap-1">
                                 <CheckIcon /> {compileFeedback}
                             </div>
                         )}
                    </>
                )}
            </div>
        </div>
    );
};
