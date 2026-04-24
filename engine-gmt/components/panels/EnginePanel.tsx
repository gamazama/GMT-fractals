// STYLE: Do not use inline formatting or hardcoded layout for feature params.
// Use DDFS (parentId, condition, group, hidden) to control visibility and nesting.
// Import theme tokens from 'data/theme' instead of raw Tailwind color classes.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { featureRegistry } from '../../../engine/FeatureSystem';
import { AlertIcon, CheckIcon, InfoIcon, SpinnerIcon } from '../../../components/Icons';
import { FractalEvents } from '../../../engine/FractalEvents';
import { EngineFeatureRow, EngineStatus } from '../../../components/panels/engine/EngineFeatureRow';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';
import { getScalabilityLabel, estimateScalabilityCompileTime } from '../../../types/viewport';
import { SectionLabel } from '../../../components/SectionLabel';
import { accent, warn, text as themeText, surface, border as themeBorder } from '../../../data/theme';

interface EnginePanelProps {
    className?: string;
}

export const EnginePanel: React.FC<EnginePanelProps> = ({ className = "-m-4" }) => {
    const store = useEngineStore();
    const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({});
    const [compileFeedback, setCompileFeedback] = useState<string | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);
    
    // Scalability label from viewport quality system + compile time estimate
    const scalability = useEngineStore(s => s.scalability);
    const scalabilityLabel = getScalabilityLabel(scalability);
    const estCompileMs = useMemo(() => estimateScalabilityCompileTime(scalability.subsystems), [scalability.subsystems]);
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
        <div className={`flex flex-col h-full ${surface.dock} min-h-0 overflow-hidden ${className}`} data-help-id="panel.engine">
            <div className={`px-3 py-2 bg-black/60 border-b ${themeBorder.standard} flex items-center justify-between shrink-0`}>
                <SectionLabel>Engine Configuration</SectionLabel>
                <span className={`text-[10px] font-bold ${accent.text}`}>{scalabilityLabel}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll p-0 min-h-0">
                <div className={`flex gap-2 items-center px-3 py-2 bg-blue-900/10 border-b ${themeBorder.subtle} mb-1 shrink-0`}>
                    <div className="text-blue-400"><InfoIcon /></div>
                    <p className="text-[9px] text-blue-200/80 leading-tight">
                        <span className="text-green-400">●</span> Compiled &nbsp;
                        <span className={`${warn.text}`}>●</span> Pending &nbsp;
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
                                    <div className={`ml-4 pl-2 border-l ${themeBorder.standard} my-0.5`}>
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

            <div className={`px-3 py-2 ${surface.input} border-t ${themeBorder.standard} flex items-center justify-between min-h-[40px] shrink-0 z-10`}>
                {isCompiling ? (
                    <>
                        <div className={`flex items-center gap-2 ${accent.text} text-[10px] font-bold`}>
                            <SpinnerIcon className="animate-spin h-3 w-3" />
                            <span>Compiling...</span>
                        </div>
                        <div className={`text-[9px] ${themeText.dimLabel}`}>~{estCompileSec}s</div>
                    </>
                ) : Object.keys(pendingChanges).length > 0 ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <div className={`flex items-center gap-2 ${warn.text} text-[10px] font-bold animate-pulse`}>
                                <AlertIcon />
                                <span>Pending</span>
                            </div>
                            <span className={`text-[9px] ${themeText.dimLabel} font-mono`}>~{estCompileSec}s</span>
                        </div>
                        <button
                            onClick={applyPendingChanges}
                            disabled={isCompiling}
                            className={`px-4 py-1 ${warn.btnBg} ${warn.btnHover} disabled:bg-gray-600 disabled:cursor-not-allowed ${warn.btnText} font-bold text-[10px] rounded transition-colors flex items-center gap-1`}
                        >
                            <CheckIcon /> Apply
                        </button>
                    </>
                ) : (
                    <>
                         <div className="flex items-center gap-2">
                             <span className={`text-[10px] ${themeText.faint} font-medium`}>System Ready</span>
                             <span className={`text-[9px] ${themeText.faint} font-mono`}>~{estCompileSec}s</span>
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
