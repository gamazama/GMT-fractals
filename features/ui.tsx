
import React from 'react';
import { componentRegistry, FeatureComponentProps } from '../components/registry/ComponentRegistry';
import { useFractalStore } from '../store/fractalStore';
import { AutoFeaturePanel } from '../components/AutoFeaturePanel';

// --- 1. Import Feature Components ---
import { DrawingPanel } from './drawing/DrawingPanel';
import { DrawingOverlay } from './drawing/DrawingOverlay';
import { AudioPanel } from './audioMod/AudioPanel';
import { AudioSpectrum } from './audioMod/AudioSpectrum';
import { AudioLinkControls } from './audioMod/AudioLinkControls';
import LightGizmo from './lighting/LightGizmo';
import { ColoringPanel } from './coloring/components/ColoringPanel'; 
import { WebcamOverlay } from './webcam/WebcamOverlay';
import { DebugToolsOverlay } from './debug_tools/DebugToolsOverlay';
import { EnginePanel } from '../components/panels/EnginePanel';

// --- 2. Import Legacy/Shared Panels ---
import FormulaPanel from '../components/panels/FormulaPanel';
import ScenePanel from '../components/panels/ScenePanel';
import LightPanel from './lighting/LightPanel';
import RenderPanel from '../components/panels/RenderPanel';
import QualityPanel from '../components/panels/QualityPanel';
import FlowEditor from '../components/panels/flow/FlowEditor';

// --- 3. Import Widget Components ---
import { ColoringHistogram } from '../components/panels/gradient/ColoringHistogram';
import { HybridAdvancedLock } from '../components/panels/HybridAdvancedLock';
// Replaced JuliaPicker with InteractionPicker
import { InteractionPicker } from '../components/InteractionPicker';
import { ColorGradingHistogram, OpticsControls, NavigationControls } from '../components/panels/scene_widgets';

// --- 4. Define Connectors (Wrappers that need Store access) ---

const ConnectedColoringHistogram: React.FC<FeatureComponentProps> = (props) => {
    const histogramData = useFractalStore(s => s.histogramData);
    const autoUpdate = useFractalStore(s => s.histogramAutoUpdate);
    const setAuto = useFractalStore(s => s.setHistogramAutoUpdate);
    const refresh = useFractalStore(s => s.refreshHistogram);
    const liveModulations = useFractalStore(s => s.liveModulations);
    
    const handleChange = (partial: any) => {
        const setAction = useFractalStore.getState().setColoring;
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
        />
    );
};

// --- 5. REGISTER EVERYTHING ---

export const registerUI = () => {
    // Features
    componentRegistry.register('panel-drawing', DrawingPanel);
    componentRegistry.register('overlay-drawing', DrawingOverlay);
    componentRegistry.register('panel-audio', AudioPanel);
    componentRegistry.register('overlay-lighting', LightGizmo); 
    componentRegistry.register('overlay-webcam', WebcamOverlay);
    componentRegistry.register('overlay-debug-tools', DebugToolsOverlay);
    componentRegistry.register('panel-engine', EnginePanel);
    
    // Legacy Panels
    componentRegistry.register('panel-formula', FormulaPanel);
    componentRegistry.register('panel-scene', ScenePanel);
    componentRegistry.register('panel-light', LightPanel);
    componentRegistry.register('panel-shading', RenderPanel);
    componentRegistry.register('panel-gradients', ColoringPanel); 
    componentRegistry.register('panel-quality', QualityPanel);
    componentRegistry.register('panel-graph', FlowEditor);
    
    // Widgets
    componentRegistry.register('coloring-histogram', ConnectedColoringHistogram);
    componentRegistry.register('hybrid-advanced-lock', HybridAdvancedLock);
    componentRegistry.register('interaction-picker', InteractionPicker);
    componentRegistry.register('audio-spectrum', AudioSpectrum);
    componentRegistry.register('audio-link-controls', AudioLinkControls);
    
    // Scene Widgets
    componentRegistry.register('scene-histogram', ColorGradingHistogram);
    componentRegistry.register('optics-controls', OpticsControls);
    componentRegistry.register('navigation-controls', NavigationControls);
    
    console.log("🎨 UI Registry: Components registered.");
};
