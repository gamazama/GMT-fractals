
import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { featureRegistry } from '../engine/FeatureSystem';
import ToggleSwitch from './ToggleSwitch';

interface FeatureSectionProps {
    label: string;
    featureId: string;
    toggleParam?: string; // Optional: If missing, tries to guess from EngineConfig
    children: React.ReactNode;
    description?: string;
    /** Extra content rendered between label and toggle (e.g. StatusDots) */
    statusContent?: React.ReactNode;
    /** Additional classes on the header row */
    headerClassName?: string;
    /** Override the auto-detected enabled state */
    enabled?: boolean;
    /** Override the auto-detected toggle handler */
    onToggle?: (val: boolean) => void;
    /** Hide the header toggle switch entirely. Used by compile-dropdown
     *  sections (e.g. Distance Estimator) which have no on/off state —
     *  the section is always present, the body shows compile-flagged
     *  inputs directly. */
    hideToggle?: boolean;
    /** Force the body open independently of `enabled`. Used by
     *  CompilableFeatureSection so a compile-pending CompileBar stays
     *  visible even when the user has just toggled the runtime off —
     *  otherwise the body collapses and they can't click Recompile to
     *  apply the change. The toggle still reflects `enabled` cleanly. */
    forceBodyOpen?: boolean;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
    label, featureId, toggleParam, children, description,
    statusContent, headerClassName = '', enabled, onToggle, hideToggle = false, forceBodyOpen = false,
}) => {
    // Granular per-feature subscription. `useEngineStore()` no-selector
    // would re-render every FeatureSection on every store update —
    // with N features in N panels, that's a major contributor to the
    // per-pointer-event subscriber cascade in fluid-toy.
    const sliceState = useEngineStore((s) => (s as any)[featureId]);
    const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
    const setter = useEngineStore((s) => (s as any)[setterName]);

    const feature = featureRegistry.get(featureId);

    // Determine the toggle parameter (The "Power Switch" for this feature)
    const effectiveToggleParam = toggleParam || feature?.engineConfig?.toggleParam;

    // Access state
    const autoEnabled = effectiveToggleParam ? !!sliceState?.[effectiveToggleParam] : true;
    const isEnabled = enabled !== undefined ? enabled : autoEnabled;

    const handleToggle = (val: boolean) => {
        if (onToggle) { onToggle(val); return; }

        if (setter && effectiveToggleParam) {
            // CompileScheduler owns the spinner; toggling a compile-mode
            // feature triggers a config change and the scheduler emits
            // is_compiling with the correct label on the rebuild boundary.
            setter({ [effectiveToggleParam]: val });
        }
    };

    return (
        <div className="flex flex-col border-t border-white/5">
            {/* Header — clicking when disabled enables the feature */}
            <div
                className={`flex items-center justify-between px-3 py-1 ${isEnabled ? 'bg-neutral-800' : 'bg-neutral-800/50 cursor-pointer hover:bg-white/5'} ${headerClassName}`}
                onClick={!isEnabled ? () => handleToggle(true) : undefined}
            >
                <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold ${isEnabled ? 'text-gray-300' : 'text-gray-600'}`}>
                        {label}
                    </span>
                    {!isEnabled && <span className="text-[8px] text-gray-600">off</span>}
                    {statusContent}
                </div>

                {!hideToggle && (
                    <div className="w-10" onClick={e => e.stopPropagation()}>
                        <ToggleSwitch
                            value={isEnabled}
                            onChange={handleToggle}
                        />
                    </div>
                )}
            </div>

            {/* Content. Renders when the toggle is on OR the caller has
                forced the body open (compile-pending case). */}
            {(isEnabled || forceBodyOpen) && (
                <div>
                    {description && (
                        <p className="px-3 py-1.5 text-[9px] text-gray-600 leading-tight bg-white/[0.06] hover:text-gray-300 transition-colors cursor-default">{description}</p>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
};
