
import React from 'react';

// Define the interface for components used in the registry. DDFS-driven
// panels/overlays receive these props from AutoFeaturePanel. Bespoke
// panels/widgets registered into the same registry may take any prop
// shape — that's why `register` accepts `React.ComponentType<any>`.
export interface FeatureComponentProps {
    featureId: string;
    sliceState: any;
    actions: any;
    [key: string]: any; // Allow arbitrary props from definition
}

// Use `React.ComponentType<any>` so apps can register zero-prop view
// panels (StateLibrary, FormulaSelect, …) alongside DDFS feature
// components without a per-call `as any`. The previous union type
// (FC<FeatureComponentProps> | FC<any>) failed TS variance — the
// compiler couldn't pick a branch and forced casts at every register
// site (28 across the project before this change).
type ComponentType = React.ComponentType<any>;

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

    public has(id: string): boolean {
        return this.components.has(id);
    }

    /** Iterate registered ids — used by dev-mode validators. */
    public ids(): IterableIterator<string> {
        return this.components.keys();
    }
}

export const componentRegistry = new ComponentRegistry();

// Pre-register CameraManager here (or do it in a features/index file if preferred)
// To keep things clean, we will assume registerUI calls this, but since CameraManager isn't a "Feature" in DDFS sense
// but a UI panel, we can register it here if we import it. 
// Ideally, `features/ui.tsx` handles registration.
