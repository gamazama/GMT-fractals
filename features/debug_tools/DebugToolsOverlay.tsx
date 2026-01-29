
import React from 'react';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { ShaderDebuggerGlobalWrapper } from '../../components/ShaderDebugger';
import { StateDebugger } from '../../components/StateDebugger';

// We need to bridge the DDFS state to the specific components.
// The existing components use `useFractalStore`. 
// We should update them to read from `state.debugTools` instead of `state`.
// BUT: To avoid refactoring the internals of those complex components right now,
// we can update `uiSlice` removal step to actually keep the types in store but map them to this feature?
// NO. The clean way is to update the components to use the DDFS state.

export const DebugToolsOverlay: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    // Note: The components handle their own visibility checks internally via the store hooks.
    // We just mount them. However, we need to update the Components to point to the new store location.
    return (
        <>
            <ShaderDebuggerGlobalWrapper />
            <StateDebugger />
        </>
    );
};
