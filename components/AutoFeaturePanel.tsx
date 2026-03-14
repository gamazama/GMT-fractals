
import React, { useMemo, useState, Suspense } from 'react';
import { featureRegistry, ParamConfig, ParamCondition, CustomUIConfig, GroupConfig } from '../engine/FeatureSystem';
import { useFractalStore } from '../store/fractalStore';
import Slider, { DraggableNumber } from './Slider';
import ToggleSwitch from './ToggleSwitch';
import SmallColorPicker from './SmallColorPicker';
import EmbeddedColorPicker from './EmbeddedColorPicker';
import Dropdown from './Dropdown';
import { Vector2Input, Vector3Input } from './vector-input';
import { Knob } from './Knob';
import { collectHelpIds } from '../utils/helpUtils';
import { componentRegistry } from './registry/ComponentRegistry';
import { AlertIcon, CloseIcon } from './Icons';

// Code-split: gradient editor only renders for gradient params
const AdvancedGradientEditor = React.lazy(() => import('./AdvancedGradientEditor'));
import { FractalEvents } from '../engine/FractalEvents';
import { SectionLabel } from './SectionLabel';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusDot } from './StatusDot';
import { EngineFeatureRow, EngineStatus } from './panels/engine/EngineFeatureRow';
import * as THREE from 'three';

interface AutoFeaturePanelProps {
    featureId: string;
    groupFilter?: string; 
    className?: string;
    isDisabled?: boolean;
    disabledParams?: string[];
    excludeParams?: string[];
    whitelistParams?: string[]; // New: Render ONLY these params, ignore group
    variant?: 'default' | 'dense';
    // New Props for Engine Panel Interception
    forcedState?: any; 
    onChangeOverride?: (key: string, value: any) => void;
    pendingChanges?: Record<string, any>; 
}

// Evaluates a single condition
const evaluateCondition = (condition: ParamCondition, sliceState: any, globalState: any, parentId?: string): boolean => {
    if (condition.or) {
        return condition.or.some(subCond => evaluateCondition(subCond, sliceState, globalState, parentId));
    }
    if (condition.and) {
        return condition.and.every(subCond => evaluateCondition(subCond, sliceState, globalState, parentId));
    }

    let targetParam = condition.param || parentId;
    let val: any;

    if (targetParam && targetParam.startsWith('$')) {
        const key = targetParam.slice(1);
        if (key.includes('.')) {
            const parts = key.split('.');
            let ptr = globalState;
            for (const part of parts) {
                if (ptr === undefined || ptr === null) { ptr = undefined; break; }
                ptr = ptr[part];
            }
            val = ptr;
        } else {
            val = globalState[key];
        }
    } else if (targetParam) {
        val = sliceState[targetParam];
    } else {
        return true;
    }

    if (condition.eq === undefined && condition.neq === undefined && condition.gt === undefined && condition.lt === undefined && condition.bool === undefined) {
         if (typeof val === 'boolean') return val;
         if (typeof val === 'number') return val > 0;
         return !!val;
    }

    if (condition.eq !== undefined || condition.neq !== undefined) {
         let compVal = val;
         if (typeof val === 'object' && val && val.getHexString) compVal = '#' + val.getHexString();
         if (condition.eq !== undefined) return compVal == condition.eq;
         if (condition.neq !== undefined) return compVal != condition.neq;
    }

    if (condition.bool !== undefined) return !!val === condition.bool;
    if (condition.gt !== undefined) return val > condition.gt;
    if (condition.lt !== undefined) return val < condition.lt;
    
    return true;
};

const checkVisibility = (condition: ParamCondition | ParamCondition[] | undefined, sliceState: any, globalState: any, parentId?: string): boolean => {
    if (!condition) {
        if (parentId) {
            const pVal = sliceState[parentId];
            if (typeof pVal === 'boolean') return pVal;
            if (typeof pVal === 'number') return pVal > 0; 
            return !!pVal;
        }
        return true;
    }
    if (Array.isArray(condition)) {
        return condition.every(cond => evaluateCondition(cond, sliceState, globalState, parentId));
    }
    return evaluateCondition(condition, sliceState, globalState, parentId);
};

const getMapping = (config: ParamConfig) => {
    const min = config.min ?? 0;
    const max = config.max ?? 1;
    if (config.scale === 'pi') {
        return { min: min / Math.PI, max: max / Math.PI, toSlider: (v: number) => v / Math.PI, fromSlider: (v: number) => v * Math.PI };
    }
    if (!config.scale || config.scale === 'linear') return undefined;
    if (config.scale === 'square') {
        return { min: 0, max: 100, toSlider: (v: number) => Math.sqrt((v - min) / (max - min)) * 100, fromSlider: (v: number) => min + Math.pow(v / 100, 2) * (max - min) };
    }
    if (config.scale === 'log') {
        const safeMin = Math.max(0.000001, min);
        return {
            min: 0, max: 100,
            toSlider: (v: number) => (v <= min) ? 0 : ((Math.log10(Math.max(safeMin, v)) - Math.log10(safeMin)) / (Math.log10(max) - Math.log10(safeMin))) * 100,
            fromSlider: (v: number) => (v <= 0) ? min : Math.pow(10, Math.log10(safeMin) + (v / 100) * (Math.log10(max) - Math.log10(safeMin)))
        };
    }
    return undefined;
};

export const AutoFeaturePanel: React.FC<AutoFeaturePanelProps> = ({ 
    featureId, groupFilter, className, isDisabled = false, disabledParams = [], excludeParams = [], whitelistParams = [], variant = 'default',
    forcedState, onChangeOverride, pendingChanges 
}) => {
    const feature = featureRegistry.get(featureId);
    // Use forcedState if provided (for Engine Panel pending changes), otherwise fallback to Store
    const storeSliceState = useFractalStore(state => (state as any)[featureId]);
    const sliceState = forcedState || storeSliceState;
    
    // Access Live Modulations
    const liveModulations = useFractalStore(state => state.liveModulations);

    // Read full store imperatively for condition evaluation (avoids full-store subscription re-renders)
    const globalStateRef = React.useRef(useFractalStore.getState());
    globalStateRef.current = useFractalStore.getState();
    const globalState = globalStateRef.current;
    const actions = globalState;
    const advancedMode = useFractalStore(s => s.advancedMode);
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    const showHints = useFractalStore(s => s.showHints);
    
    const [confirming, setConfirming] = useState<{key: string, value: any, message: string} | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const setterName = useMemo(() => `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`, [featureId]);

    const handleUpdate = (key: string, value: any) => {
        if (isDisabled || disabledParams.includes(key)) return;

        // Intercept for Engine Panel
        if (onChangeOverride) {
            onChangeOverride(key, value);
            return;
        }

        const config = feature!.params[key];

        // Route compile-time params to Engine Panel instead of updating store directly
        if (config?.onUpdate === 'compile') {
            // Open engine panel first, then emit after it has time to mount its listener
            useFractalStore.getState().movePanel('Engine', 'left');
            setTimeout(() => FractalEvents.emit('engine_queue', { featureId, param: key, value }), 50);
            return;
        }

        if (config?.confirmation && value === true && sliceState[key] === false) {
             setConfirming({ key, value, message: config.confirmation });
             return;
        }
        const setter = (actions as any)[setterName];
        if (setter) setter({ [key]: value });
    };

    const handleConfirmedUpdate = () => {
        if (!confirming) return;
        
        if (onChangeOverride) {
            onChangeOverride(confirming.key, confirming.value);
            setConfirming(null);
            return;
        }

        const setter = (actions as any)[setterName];
        if (setter) {
            FractalEvents.emit('is_compiling', "Optimizing Shader...");
            setTimeout(() => {
                setter({ [confirming.key]: confirming.value });
                setConfirming(null);
            }, 50);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isDisabled) return;
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) { e.preventDefault(); e.stopPropagation(); openGlobalMenu(e.clientX, e.clientY, [], ids); }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        if (isDisabled || disabledParams.includes(key)) return;
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => { if (ev.target?.result) handleUpdate(key, ev.target.result as string); };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    if (!feature || !sliceState) return null;
    
    const renderControl = (key: string, config: ParamConfig) => {
        const val = sliceState[key] ?? config.default;
        const isParamDisabled = isDisabled || disabledParams.includes(key);
        
        // Engine Panel Dense Rendering Logic
        if (variant === 'dense') {
            let status: EngineStatus = 'runtime';
            
            if (config.onUpdate === 'compile') {
                const isPending = pendingChanges && pendingChanges[`${featureId}.${key}`] !== undefined;
                status = isPending ? 'pending' : 'synced';
            }

            if (config.type === 'boolean') {
                return (
                    <EngineFeatureRow 
                        label={config.label}
                        description={config.description} // Pass description
                        isActive={!!val}
                        onToggle={(v) => handleUpdate(key, v)}
                        status={status}
                        disabled={isParamDisabled}
                    />
                );
            }
            if (config.type === 'float' || config.type === 'int') {
                return (
                    <EngineFeatureRow 
                        label={config.label}
                        description={config.description} // Pass description
                        isActive={true} 
                        onToggle={() => {}} 
                        numericValue={val}
                        onNumericChange={(v) => handleUpdate(key, v)}
                        options={config.options}
                        onOptionChange={config.options ? (v) => handleUpdate(key, v) : undefined}
                        status={status}
                        disabled={isParamDisabled}
                        hideCheckbox={true}
                        // Pass range/step for sensitivity calculation
                        step={config.step}
                        min={config.min}
                        max={config.max}
                    />
                );
            }
        }
        
        if (config.type === 'color') {
            let hex = val;
            if (typeof val === 'object' && val.getHexString) hex = '#' + val.getHexString();
            if (config.layout === 'embedded' || config.parentId) {
                return <div className={`mb-px pr-1 ${isParamDisabled ? 'opacity-30 pointer-events-none' : ''}`}><EmbeddedColorPicker color={hex} onColorChange={(c) => handleUpdate(key, c)} /></div>;
            } else {
                return (
                    <div className={`flex items-center justify-between px-3 py-1 bg-gray-800/20 mb-px ${isParamDisabled ? 'opacity-30 pointer-events-none' : ''}`}>
                        <SectionLabel>{config.label}</SectionLabel>
                        <SmallColorPicker color={hex} onChange={(c) => handleUpdate(key, c)} label={config.label} />
                    </div>
                );
            }
        }

        if (config.type === 'boolean') {
            const boolCompileIndicator = config.onUpdate === 'compile' ? (
                <span className="ml-1.5" title={val ? 'Compiled & Active' : 'Compiled Off — toggle to queue change'}>
                    <StatusDot status={val ? 'active' : 'off'} />
                </span>
            ) : null;

            // UI: CHECKBOX (Fallback for explicit ui='checkbox' in Default mode)
            if (config.ui === 'checkbox') {
                 return (
                     <div className={isParamDisabled ? 'opacity-30 pointer-events-none' : ''}>
                        <ToggleSwitch label={config.label} value={val} onChange={(v) => handleUpdate(key, v)} disabled={isParamDisabled} variant="dense" labelSuffix={boolCompileIndicator} />
                     </div>
                 );
            }

            // UI: TOGGLE SWITCH (Default)
            return (
                <div>
                    <ToggleSwitch label={config.label} value={val} onChange={(v) => handleUpdate(key, v)} options={config.options} disabled={isParamDisabled} labelSuffix={boolCompileIndicator} />
                </div>
            );
        }
        
        if (config.type === 'float' || config.type === 'int') {
            // Compile indicator for options dropdowns with onUpdate: 'compile'
            const compileIndicator = config.onUpdate === 'compile' ? (
                <span className="ml-1.5" title="Compile-time setting — changes queue to Engine Panel">
                    <StatusDot status="active" />
                </span>
            ) : null;
            
            if (config.options) return (
                <div className={`mb-px ${isParamDisabled ? 'opacity-30 pointer-events-none' : ''}`}>
                    <Dropdown 
                        label={config.label} 
                        value={val} 
                        onChange={(v) => handleUpdate(key, v)} 
                        options={config.options} 
                        fullWidth 
                        labelSuffix={compileIndicator}
                    />
                </div>
            );
            
            if (config.ui === 'knob') return <div className={config.layout === 'half' ? "flex flex-col items-center justify-center py-2" : "flex justify-center p-2"}><Knob label={config.label} value={val} min={config.min ?? 0} max={config.max ?? 1} step={config.step} onChange={(v) => handleUpdate(key, v)} color={val > (config.min ?? 0) ? "#22d3ee" : "#444"} size={40} /></div>;
            
            const mapping = getMapping(config);
            let overrideText = config.format ? config.format(val) : undefined;
            if (config.scale === 'pi') { overrideText = `${(val / Math.PI).toFixed(2)}π`; }
            
            // Dynamic max support - read max from another parameter's value
            let effectiveMax = config.max ?? 1;
            if (config.dynamicMaxRef && sliceState[config.dynamicMaxRef] !== undefined) {
                effectiveMax = sliceState[config.dynamicMaxRef];
            }
            
            // DDFS Live Modulation Hookup
            const trackId = `${featureId}.${key}`;
            const liveValue = liveModulations[trackId];
            
            // Highlight if value differs from default, or if this param has a visibility condition (it's contextually relevant when shown)
            const isHighlighted = val !== config.default || !!config.condition;
            // Conditional params: skip entry animation to prevent grey-box on re-mount (CSS animation restart issue)
            const conditionalClass = config.condition ? '!animate-none !overflow-visible' : '';
            return <div><Slider label={config.label} value={val} min={config.min ?? 0} max={effectiveMax} step={config.step ?? 0.01} onChange={(v) => handleUpdate(key, v)} highlight={isHighlighted} trackId={trackId} liveValue={liveValue} defaultValue={config.default} customMapping={mapping} overrideInputText={overrideText} mapTextInput={config.scale === 'pi'} disabled={isParamDisabled} labelSuffix={compileIndicator} className={conditionalClass} /></div>;
        }
        
        if (config.type === 'vec2') {
            const x = val?.x ?? config.default?.x ?? 0;
            const y = val?.y ?? config.default?.y ?? 0;
            return <div className={`mb-px ${isParamDisabled ? 'opacity-30 pointer-events-none' : ''}`}><Vector2Input label={config.label} value={new THREE.Vector2(x, y)} min={config.min ?? -1} max={config.max ?? 1} onChange={(v) => handleUpdate(key, { x: v.x, y: v.y })} mode={config.mode} scale={config.scale} linkable={config.linkable} /></div>;
        }
        if (config.type === 'vec3') {
             const x = val?.x ?? config.default?.x ?? 0;
             const y = val?.y ?? config.default?.y ?? 0;
             const z = val?.z ?? config.default?.z ?? 0;
             const v3 = new THREE.Vector3(x, y, z);
             // Generate track keys for animation (x, y, z components) - using underscore format
             const trackKeys = config.composeFrom
                 ? config.composeFrom.map(k => `${featureId}.${k}`)
                 : [`${featureId}.${key}_x`, `${featureId}.${key}_y`, `${featureId}.${key}_z`];
             const trackLabels = config.composeFrom
                 ? undefined
                 : [`${config.label} X`, `${config.label} Y`, `${config.label} Z`];
             return <div className={`mb-px ${isParamDisabled ? 'opacity-30 pointer-events-none' : ''}`}><Vector3Input label={config.label} value={v3} min={config.min ?? -10} max={config.max ?? 10} step={config.step} onChange={(v) => handleUpdate(key, v)} disabled={isParamDisabled} trackKeys={trackKeys} trackLabels={trackLabels} mode={config.mode} scale={config.scale} linkable={config.linkable} /></div>;
        }
        
        if (config.type === 'image') {
            // Check for linked colorSpace param or default to 'colorSpace'
            const colorSpaceKey = config.linkedParams?.colorSpace || 'colorSpace';
            const colorSpaceParam = feature.params[colorSpaceKey];
            const colorSpaceVal = sliceState[colorSpaceKey];
            
            const cycleColorSpace = () => {
                 if (colorSpaceParam && typeof colorSpaceVal === 'number') {
                     const next = (colorSpaceVal + 1) % 3;
                     handleUpdate(colorSpaceKey, next);
                 }
            };
            
            const profileLabel = colorSpaceVal === 1 ? 'LIN' : colorSpaceVal === 2 ? 'ACES' : 'sRGB';

            return (
                <div className={`mb-px ${isParamDisabled ? 'opacity-30 pointer-events-none' : ''}`}>
                     <div className="bg-gray-800/30 border border-white/5 text-center overflow-hidden relative group">
                        <input type="file" accept="image/*,.hdr,.exr" onChange={(e) => handleFileChange(e, key)} className="hidden" id={`file-input-${key}`} />
                        <label htmlFor={`file-input-${key}`} className="block bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 w-full py-2 text-xs font-bold transition-colors cursor-pointer">{val ? "Replace Texture" : config.label}</label>
                        
                        {/* Overlay for Color Space */}
                        {colorSpaceParam && (
                            <div 
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-500 bg-black/50 px-1.5 py-0.5 rounded cursor-pointer hover:text-white hover:bg-cyan-900/80 transition-colors select-none"
                                onClick={(e) => { e.preventDefault(); cycleColorSpace(); }}
                                title="Input Color Profile: sRGB / Linear / ACES"
                            >
                                {profileLabel}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        if (config.type === 'gradient') {
             return (
                 <div className={`pr-1 ${isParamDisabled ? 'opacity-30 pointer-events-none' : ''}`}>
                     <Suspense fallback={null}>
                         <AdvancedGradientEditor
                            value={val}
                            onChange={(s) => handleUpdate(key, s)}
                         />
                     </Suspense>
                 </div>
             );
        }
        return null;
    };

    const renderNode = (id: string, isHalfWidth: boolean = false) => {
        const config = feature.params[id];
        // EXCLUSION CHECK
        if (!config || config.hidden || excludeParams.includes(id) || !checkVisibility(config.condition, sliceState, globalState, config.parentId)) return null;
        if (config.isAdvanced && !advancedMode) return null;
        const control = renderControl(id, config);
        const childIds = Object.keys(feature.params).filter(k => feature.params[k].parentId === id);
        const renderedChildren: React.ReactNode[] = childIds.map(cid => renderNode(cid)).filter(Boolean);
        // Include customUI entries that declare this param as their parent
        feature.customUI?.forEach((c) => {
            if (c.parentId !== id) return;
            if (groupFilter && c.group !== groupFilter) return;
            if (!checkVisibility(c.condition, sliceState, globalState)) return;
            const Component = componentRegistry.get(c.componentId);
            if (Component) renderedChildren.push(<div key={`custom-${c.componentId}`}><Component featureId={featureId} sliceState={sliceState} actions={actions} {...c.props} /></div>);
        });
        const containerClass = isHalfWidth ? "flex-1 min-w-0" : "flex flex-col";
        return (
            <div key={id} className={`w-full ${containerClass}`}>
                {control}
                {showHints && config.description && !isDisabled && variant !== 'dense' && (
                    <p className="px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default">{config.description}</p>
                )}
                {renderedChildren.length > 0 && (
                    <div className="flex flex-col pb-1">
                        {renderedChildren.map((child, i) => {
                            const isLast = i === renderedChildren.length - 1;
                            return (
                                <div key={i} className="flex">
                                    <div className={`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${isLast ? 'border-b border-b-white/20 rounded-bl-lg' : ''}`} />
                                    <div className={`flex-1 min-w-0 ${isLast ? 'border-b border-b-white/20' : ''}`}>
                                        {child}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const paramRoots = Object.keys(feature.params).filter(k => {
        if (feature.params[k].parentId) return false;
        
        // 1. Whitelist Check
        if (whitelistParams && whitelistParams.length > 0) {
            return whitelistParams.includes(k);
        }

        // 2. Group Check
        if (groupFilter) {
            return feature.params[k].group === groupFilter;
        }

        return true;
    });

    // Build flat render list from paramRoots
    const buildFlatItems = (roots: string[]) => {
        const items: React.ReactNode[] = [];
        for (let i = 0; i < roots.length; i++) {
            const id = roots[i];
            const config = feature.params[id];
            if (config.hidden || excludeParams.includes(id) || !checkVisibility(config.condition, sliceState, globalState)) continue;
            if (config.layout === 'half' && variant !== 'dense') {
                let nextId = roots[i + 1];
                let nextConfig = nextId ? feature.params[nextId] : null;
                if (nextConfig && nextConfig.layout === 'half' && !nextConfig.hidden && !excludeParams.includes(nextId!) && checkVisibility(nextConfig.condition, sliceState, globalState)) {
                    items.push(<div key={`${id}-${nextId}`} className="flex gap-0.5 mb-px">{renderNode(id, true)}{renderNode(nextId, true)}</div>);
                    i++; continue;
                }
            }
            items.push(renderNode(id));
        }
        return items;
    };

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    // Determine if we should render collapsible groups
    const groupConfigs = feature.groups;
    const hasCollapsibleGroups = groupConfigs && !groupFilter && !whitelistParams?.length &&
        Object.values(groupConfigs).some(g => g.collapsible);

    const renderItems: React.ReactNode[] = [];

    if (hasCollapsibleGroups && groupConfigs) {
        // Group paramRoots by their group property, preserving order
        const groupOrder: string[] = [];
        const groupedParams: Record<string, string[]> = {};
        const ungrouped: string[] = [];

        for (const id of paramRoots) {
            const group = feature.params[id].group;
            if (group && groupConfigs[group]) {
                if (!groupedParams[group]) {
                    groupedParams[group] = [];
                    groupOrder.push(group);
                }
                groupedParams[group].push(id);
            } else {
                ungrouped.push(id);
            }
        }

        // Render ungrouped params first (e.g. engine_settings, hidden)
        renderItems.push(...buildFlatItems(ungrouped));

        // Render each collapsible group
        for (const groupId of groupOrder) {
            const gc = groupConfigs[groupId];
            const groupParams = groupedParams[groupId];
            const isCollapsed = collapsedGroups.has(groupId);

            // Check if any param in this group is visible
            const visibleItems = buildFlatItems(groupParams);
            if (visibleItems.every(item => item === null)) continue;

            if (gc.collapsible) {
                const filtered = visibleItems.filter(Boolean);
                renderItems.push(
                    <CollapsibleSection
                        key={`group-${groupId}`}
                        label={gc.label}
                        open={!collapsedGroups.has(groupId)}
                        onToggle={() => toggleGroup(groupId)}
                        defaultOpen={true}
                        headerClassName="px-2 py-0.5 text-[9px] font-bold text-gray-500 hover:text-gray-300"
                    >
                        <div className="flex flex-col">
                            {filtered.map((item, idx) => (
                                <div key={idx}>{item}</div>
                            ))}
                            <div className="ml-[9px] border-b border-white/10 rounded-bl mb-0.5" />
                        </div>
                    </CollapsibleSection>
                );
            } else {
                renderItems.push(...visibleItems);
            }
        }
    } else {
        renderItems.push(...buildFlatItems(paramRoots));
    }

    feature.customUI?.forEach((c) => {
        // Prevent CustomUI leakage when using whitelist params (e.g. inserting single slider)
        if (whitelistParams && whitelistParams.length > 0) return;
        // Skip entries handled by renderNode tree-nesting
        if (c.parentId) return;
        if (groupFilter && c.group !== groupFilter) return;
        if (!checkVisibility(c.condition, sliceState, globalState)) return;
        const Component = componentRegistry.get(c.componentId);
        if (Component) renderItems.push(<div key={`custom-${c.componentId}`} className={`flex flex-col mb-px ${isDisabled ? 'grayscale opacity-30 pointer-events-none' : ''}`}><Component featureId={featureId} sliceState={sliceState} actions={actions} {...c.props} /></div>);
    });

    return (
        <div className={`flex flex-col relative ${className || ''}`} onContextMenu={handleContextMenu}>
            {renderItems}
            {confirming && (
                <div className="absolute inset-0 z-50 animate-pop-in">
                    <div className="bg-black/95 border border-white/20 rounded shadow-2xl overflow-hidden h-full flex flex-col">
                        <div className="flex items-center gap-2 p-2 border-b border-white/10 bg-white/5">
                            <AlertIcon />
                            <SectionLabel color="text-gray-300">Warning</SectionLabel>
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between">
                            <p className="text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap">{confirming.message}</p>
                            <div className="flex gap-1 mt-4">
                                <button onClick={() => setConfirming(null)} className="flex-1 py-1.5 bg-gray-800 text-gray-300 text-[9px] font-bold rounded border border-white/10 hover:bg-gray-700 transition-colors">Cancel</button>
                                <button onClick={handleConfirmedUpdate} className="flex-1 py-1.5 bg-cyan-900/50 text-cyan-300 text-[9px] font-bold rounded border border-cyan-500/30 hover:bg-cyan-900 transition-colors">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
