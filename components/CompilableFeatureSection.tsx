
import React, { useState, useCallback, useMemo } from 'react';
import { featureRegistry } from '../engine/FeatureSystem';
import { useFractalStore } from '../store/fractalStore';
import { FractalEvents } from '../engine/FractalEvents';
import { AutoFeaturePanel } from './AutoFeaturePanel';
import { FeatureSection } from './FeatureSection';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusDot } from './StatusDot';
import { SectionLabel } from './SectionLabel';
import { AlertIcon } from './Icons';
import { warn, compileBar as compileBarClass } from '../data/theme';

interface CompilableFeatureSectionProps {
    /** Feature ID in the DDFS registry. Reads panelConfig if available. */
    featureId: string;

    // --- Override props (take precedence over panelConfig) ---
    /** Compile gate param name (onUpdate: 'compile') */
    compileParam?: string;
    /** Runtime on/off param (uniform-backed, instant toggle) */
    runtimeToggleParam?: string;
    /** Compile-time params to show in settings sub-section */
    compileSettingsParams?: string[];
    /** groupFilter for runtime params panel */
    runtimeGroup?: string;
    /** Params to exclude from runtime panel */
    runtimeExcludeParams?: string[];
    /** Section label (falls back to feature name) */
    label?: string;
    /** Message shown during compilation */
    compileMessage?: string;
    /** data-help-id */
    helpId?: string;
}

/**
 * Reusable compilable feature section — driven by DDFS panelConfig or explicit props.
 *
 * Pattern: runtime toggle (instant on/off) + compile gate (shader rebuild) + compile settings + runtime params.
 * When runtimeToggleParam is provided, toggle is instant and compile is separate.
 * When absent, the toggle controls the compile param directly.
 */
export const CompilableFeatureSection: React.FC<CompilableFeatureSectionProps> = (props) => {
    const { featureId } = props;
    const feature = featureRegistry.get(featureId);
    const pc = feature?.panelConfig;

    // Resolve config: explicit props override panelConfig
    const compileParam = props.compileParam ?? pc?.compileParam ?? '';
    const runtimeToggleParam = props.runtimeToggleParam ?? pc?.runtimeToggleParam;
    const compileSettingsParams = props.compileSettingsParams ?? pc?.compileSettingsParams;
    const runtimeGroup = props.runtimeGroup ?? pc?.runtimeGroup;
    const runtimeExcludeParams = props.runtimeExcludeParams ?? pc?.runtimeExcludeParams;
    const label = props.label ?? pc?.label ?? feature?.name ?? featureId;
    const compileMessage = props.compileMessage ?? pc?.compileMessage ?? 'Compiling Shader...';
    const helpId = props.helpId ?? pc?.helpId;

    // Store state
    const store = useFractalStore();
    const sliceState = (store as any)[featureId];
    const isCompiled = !!sliceState?.[compileParam];
    const isOn = runtimeToggleParam ? !!sliceState?.[runtimeToggleParam] : isCompiled;

    // Setter
    const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
    const setter = (store as any)[setterName] as ((updates: Record<string, any>) => void) | undefined;

    // Local pending state for compile-time param changes
    const [localPending, setLocalPending] = useState<Record<string, any>>({});
    const hasPendingChanges = Object.keys(localPending).length > 0;
    const needsCompile = isOn && (!isCompiled || hasPendingChanges);

    // Merged state for compile settings preview (forces conditions to pass)
    const mergedState = useMemo(() => {
        if (!compileSettingsParams?.length) return sliceState;
        const merged: Record<string, any> = { ...sliceState, ...localPending };
        merged[compileParam] = true;
        if (runtimeToggleParam) merged[runtimeToggleParam] = true;
        return merged;
    }, [sliceState, localPending, compileParam, runtimeToggleParam, compileSettingsParams]);

    // Toggle runtime on/off
    const handleToggle = useCallback((val: boolean) => {
        if (!setter) return;
        if (runtimeToggleParam) {
            setter({ [runtimeToggleParam]: val });
        } else {
            // No runtime toggle — toggle controls compile directly
            FractalEvents.emit('is_compiling', compileMessage);
            setTimeout(() => setter({ [compileParam]: val }), 50);
        }
    }, [setter, runtimeToggleParam, compileParam, compileMessage]);

    // Handle compile-time param changes (stored locally until compile)
    const handleCompileParamChange = useCallback((key: string, value: any) => {
        setLocalPending(prev => {
            const next = { ...prev, [key]: value };
            if (sliceState?.[key] === value) delete next[key];
            return next;
        });
    }, [sliceState]);

    // Apply pending changes + ensure compiled
    const handleCompile = useCallback(() => {
        if (!setter) return;
        FractalEvents.emit('is_compiling', compileMessage);
        setTimeout(() => {
            const updates: Record<string, any> = { ...localPending };
            if (!isCompiled) updates[compileParam] = true;
            setter(updates);
            setLocalPending({});
        }, 50);
    }, [setter, localPending, isCompiled, compileParam, compileMessage]);

    // Open engine panel and queue compile flag + any pending compile settings
    const handleOpenEngine = useCallback(() => {
        useFractalStore.getState().movePanel('Engine', 'left');
        setTimeout(() => {
            // Queue the compile gate
            if (!isCompiled) {
                FractalEvents.emit('engine_queue', { featureId, param: compileParam, value: true });
            }
            // Forward any pending local compile settings
            for (const [param, value] of Object.entries(localPending)) {
                FractalEvents.emit('engine_queue', { featureId, param, value });
            }
            setLocalPending({});
        }, 50);
    }, [featureId, compileParam, isCompiled, localPending]);

    const statusDots = (
        <>
            {isOn && isCompiled && !hasPendingChanges && <StatusDot status="active" />}
            {isOn && needsCompile && <StatusDot status="pending" />}
        </>
    );

    // Build exclude list for runtime params: hide compile param + runtime toggle + any explicit excludes
    const fullExclude = useMemo(() => {
        const exclude = new Set(runtimeExcludeParams ?? []);
        exclude.add(compileParam);
        if (runtimeToggleParam) exclude.add(runtimeToggleParam);
        // Also exclude compile settings params from runtime section
        compileSettingsParams?.forEach(p => exclude.add(p));
        return Array.from(exclude);
    }, [compileParam, runtimeToggleParam, runtimeExcludeParams, compileSettingsParams]);

    const hasCompileSettings = compileSettingsParams && compileSettingsParams.length > 0;

    return (
        <div data-help-id={helpId}>
            <FeatureSection
                label={label}
                featureId={featureId}
                enabled={isOn}
                onToggle={handleToggle}
                statusContent={statusDots}
                headerClassName={isCompiled ? '' : 'bg-transparent'}
            >
                <div className="bg-white/[0.02]">
                    {/* --- Compile bar (when not compiled, no compile settings sub-section) --- */}
                    {isOn && !isCompiled && !hasCompileSettings && (
                        <CompileBar isCompiled={false} onCompile={handleCompile} onOpenEngine={handleOpenEngine} />
                    )}

                    {/* --- Compile Settings sub-section (only if feature has compile-time params) --- */}
                    {hasCompileSettings && (
                        <CollapsibleSection label="Compile Settings" defaultOpen={!isCompiled} variant="panel">
                            <div>
                                <AutoFeaturePanel
                                    featureId={featureId}
                                    whitelistParams={compileSettingsParams}
                                    forcedState={mergedState}
                                    onChangeOverride={handleCompileParamChange}
                                />
                                {needsCompile && (
                                    <CompileBar isCompiled={isCompiled} onCompile={handleCompile} onOpenEngine={handleOpenEngine} />
                                )}
                            </div>
                        </CollapsibleSection>
                    )}

                    {/* --- Runtime Parameters (only when compiled) --- */}
                    {isCompiled && (
                        hasCompileSettings ? (
                            <CollapsibleSection label="Parameters" defaultOpen={true} variant="panel">
                                <AutoFeaturePanel
                                    featureId={featureId}
                                    groupFilter={runtimeGroup}
                                    excludeParams={fullExclude}
                                />
                            </CollapsibleSection>
                        ) : (
                            <AutoFeaturePanel
                                featureId={featureId}
                                groupFilter={runtimeGroup}
                                excludeParams={fullExclude}
                            />
                        )
                    )}
                </div>
            </FeatureSection>
        </div>
    );
};

/** Subtle engine icon — small bolt/zap */
const EngineIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

/** Amber compile/recompile bar with status + button + optional engine link */
const CompileBar: React.FC<{
    isCompiled: boolean;
    onCompile: () => void;
    onOpenEngine?: () => void;
}> = ({ isCompiled, onCompile, onOpenEngine }) => (
    <div className={`flex items-center justify-between px-2 py-1 mt-1 ${compileBarClass} rounded`}>
        <div className={`flex items-center gap-1.5 ${warn.text}`}>
            <AlertIcon />
            <SectionLabel variant="secondary" color={warn.text}>
                {!isCompiled ? 'Not compiled' : 'Settings changed'}
            </SectionLabel>
        </div>
        <div className="flex items-center gap-1">
            {onOpenEngine && (
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenEngine(); }}
                    className="p-1 text-gray-500 hover:text-amber-400 transition-colors"
                    title="Open Engine Panel"
                >
                    <EngineIcon />
                </button>
            )}
            <button
                onClick={onCompile}
                className={`px-3 py-0.5 ${warn.btnBg} ${warn.btnHover} ${warn.btnText} text-[9px] font-bold rounded transition-colors`}
            >
                {!isCompiled ? 'Compile' : 'Recompile'}
            </button>
        </div>
    </div>
);
