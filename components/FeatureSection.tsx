
import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { featureRegistry } from '../engine/FeatureSystem';
import ToggleSwitch from './ToggleSwitch';
import { FractalEvents } from '../engine/FractalEvents';

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
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({
    label, featureId, toggleParam, children, description,
    statusContent, headerClassName = '', enabled, onToggle,
}) => {
    const store = useEngineStore();
    const feature = featureRegistry.get(featureId);

    // Determine the toggle parameter (The "Power Switch" for this feature)
    const effectiveToggleParam = toggleParam || feature?.engineConfig?.toggleParam;

    // Access state
    const sliceState = (store as any)[featureId];
    const autoEnabled = effectiveToggleParam ? !!sliceState?.[effectiveToggleParam] : true;
    const isEnabled = enabled !== undefined ? enabled : autoEnabled;

    const handleToggle = (val: boolean) => {
        if (onToggle) { onToggle(val); return; }

        const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
        const action = (store as any)[setterName];

        if (action && effectiveToggleParam) {
            const isHeavy = feature?.engineConfig?.mode === 'compile';

            if (isHeavy) {
                FractalEvents.emit('is_compiling', "Updating Engine...");
                setTimeout(() => {
                    action({ [effectiveToggleParam]: val });
                }, 50);
            } else {
                action({ [effectiveToggleParam]: val });
            }
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

                <div className="w-10" onClick={e => e.stopPropagation()}>
                    <ToggleSwitch
                        value={isEnabled}
                        onChange={handleToggle}
                    />
                </div>
            </div>

            {/* Content */}
            {isEnabled && (
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
