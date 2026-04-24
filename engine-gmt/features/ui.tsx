
import React, { useEffect, Suspense } from 'react';
import { componentRegistry, FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { useEngineStore } from '../../store/engineStore';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';

// --- 1. Import Feature Components ---
import { DrawingPanel } from './drawing/DrawingPanel';
import { DrawingOverlay } from './drawing/DrawingOverlay';
import { AudioLinkControls } from './audioMod/AudioLinkControls';
import LightGizmo from './lighting/LightGizmo';
import { ColoringPanel } from './coloring/components/ColoringPanel';
import { WebcamOverlay } from './webcam/WebcamOverlay';
import { EnginePanel } from '../components/panels/EnginePanel';
import { CameraManagerPanel } from './camera_manager/CameraManagerPanel';

// --- 2. Import Legacy/Shared Panels ---
import FormulaPanel from '../components/panels/FormulaPanel';
import ScenePanel from '../components/panels/ScenePanel';
import LightPanel from './lighting/LightPanel';
import RenderPanel from '../components/panels/RenderPanel';
import QualityPanel from '../components/panels/QualityPanel';

// --- Code-split: on-demand components wrapped with Suspense for registry ---
function lazify<P extends object>(
    factory: () => Promise<{ default: React.ComponentType<P> }>
): React.FC<P> {
    const LazyComp = React.lazy(factory);
    return (props: P) => <Suspense fallback={null}><LazyComp {...(props as any)} /></Suspense>;
}

const LazyFlowEditor = lazify(() => import('../components/panels/flow/FlowEditor'));
const LazyAudioPanel = lazify(() => import('./audioMod/AudioPanel').then(m => ({ default: m.AudioPanel })) as Promise<{ default: React.ComponentType<any> }>);
const LazyAudioSpectrum = lazify(() => import('./audioMod/AudioSpectrum').then(m => ({ default: m.AudioSpectrum })) as Promise<{ default: React.ComponentType<any> }>);
const LazyDebugToolsOverlay = lazify(() => import('./debug_tools/DebugToolsOverlay').then(m => ({ default: m.DebugToolsOverlay })) as Promise<{ default: React.ComponentType<any> }>);

// --- 3. Import Widget Components ---
import { ColoringHistogram } from '../components/panels/gradient/ColoringHistogram';
import { HybridAdvancedLock } from '../components/panels/HybridAdvancedLock';
// Replaced JuliaPicker with InteractionPicker
import { InteractionPicker } from '../../components/InteractionPicker';
import { JuliaRandomize } from '../components/widgets/JuliaRandomize';
import { ColorGradingHistogram, OpticsControls, OpticsDofControls, NavigationControls } from '../components/panels/scene_widgets';

// --- 4. Define Connectors (Wrappers that need Store access) ---

/** Shared hook: register/unregister a histogram probe while the component is mounted. */
const useHistogramRegistration = (
    register: () => void,
    unregister: () => void
) => {
    useEffect(() => { register(); return () => unregister(); }, [register, unregister]);
};

const ConnectedColoringHistogram: React.FC<FeatureComponentProps> = (props) => {
    const histogramData = useEngineStore(s => s.histogramData);
    const histogramLoading = useEngineStore(s => s.histogramLoading);
    const autoUpdate = useEngineStore(s => s.histogramAutoUpdate);
    const setAuto = useEngineStore(s => s.setHistogramAutoUpdate);
    const refresh = useEngineStore(s => s.refreshHistogram);
    const liveModulations = useEngineStore(s => s.liveModulations);

    useHistogramRegistration(
        useEngineStore(s => s.registerHistogram),
        useEngineStore(s => s.unregisterHistogram)
    );

    const handleChange = (partial: any) => {
        const setAction = useEngineStore.getState().setColoring;
        if (setAction) setAction(partial);
    };

    return (
        <ColoringHistogram
            layer={props.layer}
            state={props.sliceState}
            histogramData={histogramData}
            onChange={handleChange}
            onRefresh={refresh}
            autoUpdate={autoUpdate}
            onToggleAuto={() => setAuto(!autoUpdate)}
            liveModulations={liveModulations}
            isLoading={histogramLoading}
        />
    );
};

const ConnectedGradingHistogram: React.FC<FeatureComponentProps> = (props) => {
    useHistogramRegistration(
        useEngineStore(s => s.registerSceneHistogram),
        useEngineStore(s => s.unregisterSceneHistogram)
    );

    return <ColorGradingHistogram {...props} />;
};

// --- 5. REGISTER EVERYTHING ---

export const registerUI = () => {
    // Features
    componentRegistry.register('panel-drawing', DrawingPanel);
    componentRegistry.register('overlay-drawing', DrawingOverlay);
    componentRegistry.register('panel-audio', LazyAudioPanel);
    componentRegistry.register('overlay-lighting', LightGizmo);
    componentRegistry.register('overlay-webcam', WebcamOverlay);
    componentRegistry.register('overlay-debug-tools', LazyDebugToolsOverlay);
    componentRegistry.register('panel-engine', EnginePanel);
    
    // Managers
    componentRegistry.register('panel-cameramanager', CameraManagerPanel);
    
    // Legacy Panels
    componentRegistry.register('panel-formula', FormulaPanel);
    componentRegistry.register('panel-scene', ScenePanel);
    componentRegistry.register('panel-light', LightPanel);
    componentRegistry.register('panel-shading', RenderPanel);
    componentRegistry.register('panel-gradients', ColoringPanel); 
    componentRegistry.register('panel-quality', QualityPanel);
    componentRegistry.register('panel-graph', LazyFlowEditor);
    
    // Widgets
    componentRegistry.register('coloring-histogram', ConnectedColoringHistogram);
    componentRegistry.register('hybrid-advanced-lock', HybridAdvancedLock);
    componentRegistry.register('interaction-picker', InteractionPicker);
    componentRegistry.register('julia-randomize', JuliaRandomize);
    componentRegistry.register('audio-spectrum', LazyAudioSpectrum);
    componentRegistry.register('audio-link-controls', AudioLinkControls);
    
    // Scene Widgets
    componentRegistry.register('scene-histogram', ConnectedGradingHistogram);
    componentRegistry.register('optics-controls', OpticsControls);
    componentRegistry.register('optics-dof-controls', OpticsDofControls);
    componentRegistry.register('navigation-controls', NavigationControls);

};
