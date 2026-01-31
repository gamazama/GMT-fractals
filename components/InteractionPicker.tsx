
import React from 'react';
import Button from './Button';
import { useFractalStore } from '../store/fractalStore';
import { FeatureComponentProps } from './registry/ComponentRegistry';
import { InteractionMode } from '../types';

interface InteractionPickerProps extends FeatureComponentProps {
    targetMode: InteractionMode;
    label: string;
    activeLabel?: string;
    helpText?: string;
    variant?: 'primary' | 'success' | 'danger';
}

export const InteractionPicker: React.FC<InteractionPickerProps> = ({ 
    actions, 
    targetMode, 
    label, 
    activeLabel, 
    helpText,
    variant = 'primary'
}) => {
    // Read global interaction state directly from store hooks
    const currentMode = useFractalStore(s => s.interactionMode);
    
    // Access the global setter. 
    // Note: 'actions' passed from AutoFeaturePanel contains all store actions.
    const { setInteractionMode } = actions as any;

    const isActive = currentMode === targetMode;

    const handleToggle = () => {
        setInteractionMode(isActive ? 'none' : targetMode);
    };

    return (
        <div className="flex flex-col mb-2 animate-fade-in">
             {isActive && helpText && (
                 <div className="mb-2 p-2 bg-green-900/30 border border-green-500/30 rounded text-[9px] text-green-200 animate-pulse text-center leading-tight">
                     {helpText}
                 </div>
             )}
             <Button 
                onClick={handleToggle}
                label={isActive ? (activeLabel || "Cancel") : label}
                variant={isActive ? "success" : variant}
                fullWidth
             />
             <div className="h-px bg-white/10 my-2" />
        </div>
    );
};
