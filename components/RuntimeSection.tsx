
import React from 'react';
import { featureRegistry, RuntimePanelConfig } from '../engine/FeatureSystem';
import { useEngineStore } from '../store/engineStore';
import { AutoFeaturePanel } from './AutoFeaturePanel';
import { FeatureSection } from './FeatureSection';
import { SectionDivider } from './SectionLabel';

interface RuntimeSectionProps extends Partial<RuntimePanelConfig> {
    /** Feature ID in the DDFS registry. */
    featureId: string;
}

/**
 * Pure-runtime collapsible section. Header toggles a runtime param; body
 * renders runtime params filtered by group. No compile mechanics — use
 * <CompilableFeatureSection> when a feature has a shader-rebuild gate.
 *
 * Example use (Julia / Offset): runtimeToggleParam = 'juliaMode',
 * runtimeGroup = 'julia'.
 */
export const RuntimeSection: React.FC<RuntimeSectionProps> = (props) => {
    const { featureId } = props;
    const feature = featureRegistry.get(featureId);

    const runtimeToggleParam = props.runtimeToggleParam;
    const runtimeGroup = props.runtimeGroup;
    const runtimeExcludeParams = props.runtimeExcludeParams;
    const label = props.label ?? feature?.name ?? featureId;
    const helpId = props.helpId;

    const sliceState = useEngineStore((s) => (s as any)[featureId]);
    const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
    const setter = useEngineStore((s) => (s as any)[setterName]) as
        | ((updates: Record<string, any>) => void)
        | undefined;

    const isOn = runtimeToggleParam ? !!sliceState?.[runtimeToggleParam] : true;

    const handleToggle = (val: boolean) => {
        if (!setter || !runtimeToggleParam) return;
        setter({ [runtimeToggleParam]: val });
    };

    const fullExclude = React.useMemo(() => {
        const exclude = new Set(runtimeExcludeParams ?? []);
        if (runtimeToggleParam) exclude.add(runtimeToggleParam);
        return Array.from(exclude);
    }, [runtimeToggleParam, runtimeExcludeParams]);

    return (
        <div data-help-id={helpId}>
            <FeatureSection
                label={label}
                featureId={featureId}
                enabled={isOn}
                onToggle={handleToggle}
            >
                <div className="bg-white/[0.02]">
                    <AutoFeaturePanel
                        featureId={featureId}
                        groupFilter={runtimeGroup}
                        excludeParams={fullExclude}
                        liftChildrenOf={runtimeToggleParam}
                    />
                </div>
            </FeatureSection>
            <SectionDivider />
        </div>
    );
};
