
import React from 'react';
// Import panel directly if needed or lazily
import { CameraManagerPanel } from '../../features/camera_manager/CameraManagerPanel';

// Define the interface for components used in the registry
export interface FeatureComponentProps {
    featureId: string;
    sliceState: any;
    actions: any;
    [key: string]: any; // Allow arbitrary props from definition
}

type ComponentType = React.FC<FeatureComponentProps> | React.FC<any>;

class ComponentRegistry {
    private components = new Map<string, ComponentType>();

    public register(id: string, component: ComponentType) {
        if (this.components.has(id)) {
            console.warn(`ComponentRegistry: Overwriting component '${id}'`);
        }
        this.components.set(id, component);
    }

    public get(id: string): ComponentType | undefined {
        return this.components.get(id);
    }
}

export const componentRegistry = new ComponentRegistry();

// Pre-register CameraManager here (or do it in a features/index file if preferred)
// To keep things clean, we will assume registerUI calls this, but since CameraManager isn't a "Feature" in DDFS sense
// but a UI panel, we can register it here if we import it. 
// Ideally, `features/ui.tsx` handles registration.
