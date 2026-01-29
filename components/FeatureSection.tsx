
import React from 'react';
import { useFractalStore } from '../store/fractalStore';
import { featureRegistry } from '../engine/FeatureSystem';
import ToggleSwitch from './ToggleSwitch';
import { FractalEvents } from '../engine/FractalEvents';
import { InfoIcon } from './Icons';

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
    const isEnabled = effectiveToggleParam ? !!sliceState[effectiveToggleParam] : true;
    
    // Determine if this feature is "Global Enabled" in the Engine Panel
    // If the toggleParam we are using is the same as the engine master switch,
    // then 'isEnabled' is the engine state.
    const isEngineMaster = effectiveToggleParam === feature?.engineConfig?.toggleParam;
    
    const handleToggle = (val: boolean) => {
        const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
        const action = (store as any)[setterName];
        
        if (action && effectiveToggleParam) {
            // Check if this requires a recompile (Heavy Feature)
            const isHeavy = feature?.engineConfig?.mode === 'compile';
            
            if (isHeavy) {
                // Show loading UI
                FractalEvents.emit('is_compiling', "Updating Engine...");
                setTimeout(() => {
                    action({ [effectiveToggleParam]: val });
                }, 50);
            } else {
                // Instant update
                action({ [effectiveToggleParam]: val });
            }
        }
    };
    
    // Visual Styles for the "Ghost" state
    const sectionClasses = `flex flex-col border-t border-white/5 transition-all duration-500 ease-in-out ${
        !isEnabled ? 'grayscale opacity-50 bg-black/20' : ''
    }`;

    return (
        <div className={sectionClasses}>
            {/* Header / Power Switch */}
            <div className={`flex items-center justify-between px-3 py-2 transition-colors ${isEnabled ? 'bg-cyan-950/20' : 'bg-transparent'}`}>
                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${isEnabled ? 'text-cyan-400' : 'text-gray-600'}`}>
                        {label}
                    </span>
                    {!isEnabled && (
                        <span className="text-[8px] font-bold text-amber-600/80 uppercase tracking-tighter animate-pulse">
                            Disabled in Engine
                        </span>
                    )}
                </div>
                
                <div className="w-12">
                    <ToggleSwitch 
                        value={isEnabled}
                        onChange={handleToggle}
                        color={isEnabled ? "bg-cyan-600 shadow-[0_0_8px_rgba(34,211,238,0.4)]" : "bg-gray-800"}
                    />
                </div>
            </div>

            {/* Content (Collapsible & Disabled) */}
            <div className={`overflow-hidden transition-all duration-500 ${isEnabled ? 'max-h-[2000px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}>
                <div className="px-1 pointer-events-auto">
                    {description && isEnabled && (
                        <div className="px-3 py-1 flex gap-2 items-start opacity-60 mb-2">
                            <div className="mt-0.5 text-cyan-500"><InfoIcon /></div>
                            <p className="text-[9px] text-gray-400 leading-tight italic">{description}</p>
                        </div>
                    )}
                    {children}
                </div>
            </div>
            
            {/* Disabled Overlay to block clicks without layout shift */}
            {!isEnabled && (
                <div 
                    className="absolute inset-0 z-10 cursor-not-allowed" 
                    title="Enable this feature in the Engine tab to edit"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Optional: Switch to Engine tab?
                        // store.setActiveTab('Engine');
                    }}
                />
            )}
        </div>
    );
};
