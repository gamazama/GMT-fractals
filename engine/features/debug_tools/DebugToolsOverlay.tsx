
import React, { Suspense } from 'react';
import { FeatureComponentProps } from '../../../components/registry/ComponentRegistry';
import { InteractionSessionBadge } from '../../plugins/viewport/InteractionSessionBadge';

// ShaderDebugger was fractal-specific (raymarching introspection).
// StateDebugger is generic and kept.
const LazyStateDebugger = React.lazy(() =>
    import('../../../components/StateDebugger').then(m => ({ default: m.StateDebugger }))
);

export const DebugToolsOverlay: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    return (
        <>
            <Suspense fallback={null}>
                <LazyStateDebugger />
            </Suspense>
            {/* ADR-0061 P2 dev overlay — self-gates on debugTools.interactionSessionOpen. */}
            <InteractionSessionBadge />
        </>
    );
};
