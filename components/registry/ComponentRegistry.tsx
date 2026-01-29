
import React from 'react';

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
