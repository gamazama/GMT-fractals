
import React, { useState, useCallback, useMemo } from 'react';
import { featureRegistry, CompileDropdownPanelConfig } from '../engine/FeatureSystem';
import { useEngineStore } from '../store/engineStore';
import { AutoFeaturePanel } from './AutoFeaturePanel';
import { FeatureSection } from './FeatureSection';
import { StatusDot } from './StatusDot';
import { SectionLabel, SectionDivider } from './SectionLabel';
import { AlertIcon } from './Icons';
import { warn, compileBar as compileBarClass } from '../data/theme';

interface CompileDropdownSectionProps extends Partial<CompileDropdownPanelConfig> {
    /** Feature ID in the DDFS registry. */
    featureId: string;
}

/**
 * Compile-only section with no boolean gate. Renders one or more compile-
 * flagged inputs (typically dropdowns) and a Compile button that flushes
 * pending changes. The section is always present — use this when the
 * feature has no meaningful "off" state but does have compile-time variants.
 *
 * Example: Distance Estimator (estimator + distance metric dropdowns).
 *
 * Contract: handleChange intercepts compile-flagged params locally; the
 * Compile button applies pending changes via the feature's setter. Runtime
 * params (if any) render below the compile bar and update instantly.
 */
export const CompileDropdownSection: React.FC<CompileDropdownSectionProps> = (props) => {
    const { featureId } = props;
    const feature = featureRegistry.get(featureId);

    const compileSettingsParams = props.compileSettingsParams ?? [];
    const runtimeGroup = props.runtimeGroup;
    const runtimeExcludeParams = props.runtimeExcludeParams;
    const label = props.label ?? feature?.name ?? featureId;
    const helpId = props.helpId;

    const sliceState = useEngineStore((s) => (s as any)[featureId]);
    const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
    const setter = useEngineStore((s) => (s as any)[setterName]) as
        | ((updates: Record<string, any>) => void)
        | undefined;

    const [localPending, setLocalPending] = useState<Record<string, any>>({});
    const hasPendingChanges = Object.keys(localPending).length > 0;

    const mergedState = useMemo(() => ({ ...sliceState, ...localPending }), [sliceState, localPending]);

    /** Per-param override: compile-flagged keys are buffered locally
     *  (applied via the Compile button); runtime-only keys commit
     *  immediately through the feature setter. Lets one section host
     *  a mix (e.g. DE: estimator is compile-flagged, distanceMetric
     *  is runtime). */
    const handleCompileParamChange = useCallback(
        (key: string, value: any) => {
            const cfg = feature?.params[key];
            if (cfg?.onUpdate === 'compile') {
                setLocalPending((prev) => {
                    const next = { ...prev, [key]: value };
                    if (sliceState?.[key] === value) delete next[key];
                    return next;
                });
            } else if (setter) {
                setter({ [key]: value });
            }
        },
        [feature, sliceState, setter],
    );

    const handleCompile = useCallback(() => {
        if (!setter || !hasPendingChanges) return;
        setter({ ...localPending });
        setLocalPending({});
    }, [setter, localPending, hasPendingChanges]);

    const fullExclude = useMemo(() => {
        const exclude = new Set(runtimeExcludeParams ?? []);
        compileSettingsParams.forEach((p) => exclude.add(p));
        return Array.from(exclude);
    }, [runtimeExcludeParams, compileSettingsParams]);

    const hasRuntime = !!runtimeGroup;

    return (
        <div data-help-id={helpId}>
            <FeatureSection
                label={label}
                featureId={featureId}
                enabled={true}
                onToggle={() => {}}
                hideToggle={true}
                collapsible={true}
                defaultOpen={false}
                statusContent={hasPendingChanges ? <StatusDot status="pending" /> : <StatusDot status="active" />}
            >
                <div className="bg-white/[0.02]">
                    {compileSettingsParams.length > 0 && (
                        <div>
                            <AutoFeaturePanel
                                featureId={featureId}
                                whitelistParams={compileSettingsParams}
                                forcedState={mergedState}
                                onChangeOverride={handleCompileParamChange}
                            />
                            {hasPendingChanges && (
                                <CompileBar onCompile={handleCompile} />
                            )}
                        </div>
                    )}
                    {hasRuntime && (
                        // Inline, not a nested "Parameters" disclosure — runtime
                        // metric params (e.g. Escape Radius) read as part of the
                        // same block as the estimator/metric dropdowns above.
                        <AutoFeaturePanel
                            featureId={featureId}
                            groupFilter={runtimeGroup}
                            excludeParams={fullExclude}
                        />
                    )}
                </div>
            </FeatureSection>
            <SectionDivider />
        </div>
    );
};

const CompileBar: React.FC<{ onCompile: () => void }> = ({ onCompile }) => (
    <div className={`flex items-center justify-between px-2 py-1 mt-1 ${compileBarClass} rounded`}>
        <div className={`flex items-center gap-1.5 ${warn.text}`}>
            <AlertIcon />
            <SectionLabel variant="secondary" color={warn.text}>
                Settings changed
            </SectionLabel>
        </div>
        <button
            onClick={onCompile}
            className={`px-3 py-0.5 ${warn.btnBg} ${warn.btnHover} ${warn.btnText} text-[9px] font-bold rounded transition-colors`}
        >
            Recompile
        </button>
    </div>
);
