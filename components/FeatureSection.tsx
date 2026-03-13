
import React from 'react';
import { useFractalStore } from '../store/fractalStore';
import { featureRegistry } from '../engine/FeatureSystem';
import ToggleSwitch from './ToggleSwitch';
import { FractalEvents } from '../engine/FractalEvents';

interface FeatureSectionProps {
    label: string;
    featureId: string;
    toggleParam?: string; // Optional: If missing, tries to guess from EngineConfig
    children: React.ReactNode;
    description?: string;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({ label, featureId, toggleParam, children, description }) => {
    const store = useFractalStore();
    const feature = featureRegistry.get(featureId);

    // Determine the toggle parameter (The "Power Switch" for this feature)
    const effectiveToggleParam = toggleParam || feature?.engineConfig?.toggleParam;

    // Access state
    const sliceState = (store as any)[featureId];
    const isEnabled = effectiveToggleParam ? !!sliceState?.[effectiveToggleParam] : true;

    const handleToggle = (val: boolean) => {
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
                className={`flex items-center justify-between px-3 py-1 ${!isEnabled ? 'cursor-pointer hover:bg-white/5' : ''}`}
                onClick={!isEnabled ? () => handleToggle(true) : undefined}
            >
                <span className={`text-[10px] font-bold ${isEnabled ? 'text-gray-300' : 'text-gray-600'}`}>
                    {label}
                    {!isEnabled && <span className="text-[8px] text-gray-600 ml-1.5">off</span>}
                </span>

                <div className="w-10">
                    <ToggleSwitch
                        value={isEnabled}
                        onChange={handleToggle}
                    />
                </div>
            </div>

            {/* Content */}
            {isEnabled && (
                <div className="px-1">
                    {description && (
                        <p className="px-3 pb-1 text-[9px] text-gray-500 leading-tight italic">{description}</p>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
};
