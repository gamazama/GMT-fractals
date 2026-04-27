/**
 * DomOverlays — viewport-overlay registrar.
 *
 * Renders every feature's `viewportConfig` overlay of type 'dom' on top
 * of the canvas. Each overlay subscribes to its own slice — using a
 * single `useEngineStore()` with no selector here would re-render on
 * every setJulia / animation tick, contributing to the per-pointer-event
 * update cascade that trips React's max-depth guard during fluid drags.
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { featureRegistry } from '../../engine/FeatureSystem';
import { componentRegistry } from '../../components/registry/ComponentRegistry';

export const DomOverlays: React.FC = () => {
    const overlays = featureRegistry.getViewportOverlays().filter(o => o.type === 'dom');
    return (
        <div className="absolute inset-0 pointer-events-none z-[20]">
            {overlays.map(cfg => {
                const C = componentRegistry.get(cfg.componentId);
                if (!C) return null;
                return <DomOverlayInstance key={cfg.id} cfg={cfg} Component={C} />;
            })}
        </div>
    );
};

// Per-overlay subscription so we re-render only when THIS overlay's
// slice changes (not the whole store). Stable function refs from the
// store are read once via getState() and passed as actions — they
// don't change between renders so we don't subscribe to them.
const DomOverlayInstance: React.FC<{
    cfg: { id: string; componentId: string };
    Component: React.ComponentType<any>;
}> = ({ cfg, Component }) => {
    const slice = useEngineStore((s: any) => s[cfg.id]);
    if (!slice) return null;
    const actions = useEngineStore.getState();
    return <Component featureId={cfg.id} sliceState={slice} actions={actions} />;
};
