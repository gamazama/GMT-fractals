
import React, { useState, useCallback, useMemo } from 'react';
import { featureRegistry, CompilablePanelConfig } from '../engine/FeatureSystem';
import { useEngineStore } from '../store/engineStore';
import { FractalEvents } from '../engine/FractalEvents';
import { AutoFeaturePanel } from './AutoFeaturePanel';
import { FeatureSection } from './FeatureSection';
import { CollapsibleSection } from './CollapsibleSection';
import { StatusDot } from './StatusDot';
import { SectionLabel } from './SectionLabel';
import { AlertIcon } from './Icons';
import { warn, compileBar as compileBarClass } from '../data/theme';

interface CompilableFeatureSectionProps extends Partial<CompilablePanelConfig> {
    /** Feature ID in the DDFS registry. Reads panelConfig if available. */
    featureId: string;
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

    // Resolve config: when caller supplies a compileParam they're declaring a
    // distinct compilable section (e.g. geometry hosts both Hybrid Box and
    // Burning Mode); the feature's own panelConfig must NOT bleed into that
    // section's other fields, otherwise it'd inherit the wrong runtime toggle
    // / compile settings and the section would silently mutate the wrong
    // params. Per-field `??` fallback is only safe when no override exists.
    const useOverride = props.compileParam !== undefined;
    const src = useOverride ? props : { ...pc, ...props };
    const compileParam = src.compileParam ?? '';
    const runtimeToggleParam = src.runtimeToggleParam;
    const compileSettingsParams = src.compileSettingsParams;
    const runtimeGroup = src.runtimeGroup;
    const runtimeExcludeParams = src.runtimeExcludeParams;
    const label = src.label ?? feature?.name ?? featureId;
    const compileMessage = src.compileMessage ?? `Compiling ${label}...`;
    const helpId = src.helpId;

    // Granular per-feature subscription — see FeatureSection.tsx for
    // the rationale. Avoids re-rendering every CompilableFeatureSection
    // on every unrelated store update.
    const sliceState = useEngineStore((s) => (s as any)[featureId]);
    const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
    const setter = useEngineStore((s) => (s as any)[setterName]) as ((updates: Record<string, any>) => void) | undefined;

    const isCompiled = !!sliceState?.[compileParam];
    const isOn = runtimeToggleParam ? !!sliceState?.[runtimeToggleParam] : isCompiled;

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
        useEngineStore.getState().movePanel('Engine', 'left');
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
