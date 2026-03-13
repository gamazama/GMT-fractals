
import React, { Suspense } from 'react';
import { FeatureComponentProps } from '../../components/registry/ComponentRegistry';

// Code-split: debug tools are rarely used
const LazyShaderDebugger = React.lazy(() =>
    import('../../components/ShaderDebugger').then(m => ({ default: m.ShaderDebuggerGlobalWrapper }))
);
const LazyStateDebugger = React.lazy(() =>
    import('../../components/StateDebugger').then(m => ({ default: m.StateDebugger }))
);

export const DebugToolsOverlay: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    return (
        <Suspense fallback={null}>
            <LazyShaderDebugger />
            <LazyStateDebugger />
        </Suspense>
    );
};
