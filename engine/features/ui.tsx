/**
 * Feature UI registration — maps componentId strings to React components
 * so DDFS panels can reference UI pieces by name without direct imports.
 *
 * Apps/plugins that add features register their own UI components here
 * via `componentRegistry.register(id, Comp)` at boot time.
 */

import React, { Suspense } from 'react';
import { componentRegistry } from '../../components/registry/ComponentRegistry';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';

// --- Lazy helper for on-demand components ---
function lazify<P extends object>(
    factory: () => Promise<{ default: React.ComponentType<P> }>
): React.FC<P> {
    const LazyComp = React.lazy(factory);
    return (props: P) => <Suspense fallback={null}><LazyComp {...(props as any)} /></Suspense>;
}

// --- Import surviving feature UI ---
import { AudioLinkControls } from './audioMod/AudioLinkControls';
import { WebcamOverlay } from './webcam/WebcamOverlay';

const LazyAudioPanel = lazify(() =>
    import('./audioMod/AudioPanel').then(m => ({ default: m.AudioPanel })) as Promise<{ default: React.ComponentType<any> }>
);
const LazyAudioSpectrum = lazify(() =>
    import('./audioMod/AudioSpectrum').then(m => ({ default: m.AudioSpectrum })) as Promise<{ default: React.ComponentType<any> }>
);
const LazyDebugToolsOverlay = lazify(() =>
    import('./debug_tools/DebugToolsOverlay').then(m => ({ default: m.DebugToolsOverlay })) as Promise<{ default: React.ComponentType<any> }>
);

// --- Registration ---
export const registerUI = () => {
    // AutoFeaturePanel is imported directly by PanelRouter now; the
    // registry entry is kept for external callers that look it up by id
    // (legacy / external add-ons) and for parity with panel-* naming.
    componentRegistry.register('auto-feature-panel', AutoFeaturePanel as any);

    // Engine-shipped generic features' UI
    componentRegistry.register('panel-audio', LazyAudioPanel);
    componentRegistry.register('overlay-webcam', WebcamOverlay);
    componentRegistry.register('overlay-debug-tools', LazyDebugToolsOverlay);

    componentRegistry.register('audio-spectrum', LazyAudioSpectrum);
    componentRegistry.register('audio-link-controls', AudioLinkControls);
};
