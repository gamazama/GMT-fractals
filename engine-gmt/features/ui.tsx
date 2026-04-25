/**
 * GMT UI-component registrations for componentRegistry.
 *
 * Call `registerGmtUi()` once at app boot (after the engine's
 * `registerUI()` has populated generic entries like `auto-feature-panel`).
 * This registers GMT-specific widgets that the PanelManifest's
 * `component:` / `widgets:` references expect to exist.
 *
 * Scope of this first pass:
 *   - Widget components that slot into AutoFeaturePanel via each
 *     feature's `customUI` entries (ColoringHistogram, scene widgets,
 *     HybridAdvancedLock, JuliaRandomize).
 *   - Bespoke `panel-*` components that the manifest's panel entries
 *     reference by `component:` (EnginePanel, CameraManagerPanel).
 *
 * Deferred:
 *   - FormulaPanel / ScenePanel / RenderPanel / ColoringPanel /
 *     QualityPanel / LightPanel — GMT's pre-extraction hand-written
 *     panels. The PanelManifest replaces them with AutoFeaturePanel
 *     stacks + widget slots. Ports only if/when the manifest can't
 *     express something GMT needed.
 *   - FlowEditor (panel-graph) — Modular formula graph editor. Needs
 *     the flow/ subsystem which isn't ported yet.
 *   - AudioPanel, DrawingPanel — deferred; AutoFeaturePanel covers
 *     their basic param surface.
 */

import React, { useEffect } from 'react';
import { componentRegistry, FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { registerTick, TICK_PHASE } from '../engine/TickRegistry';
import { useEngineStore } from '../../store/engineStore';

// --- Widget components ---
import { ColoringHistogram } from '../components/panels/gradient/ColoringHistogram';
import { GradientPreviewLayer1, GradientPreviewLayer2 } from '../components/panels/gradient/GradientPreview';
import { TexturingSourceToggle } from '../components/panels/gradient/TexturingSourceToggle';
import { HistogramLayerMarker } from '../components/panels/gradient/HistogramLayerMarker';
import { HybridAdvancedLock } from '../components/panels/HybridAdvancedLock';
import { JuliaRandomize } from '../components/widgets/JuliaRandomize';
import { InteractionPicker } from '../../components/InteractionPicker';
import { FormulaSelect } from '../components/panels/formula/FormulaSelect';
import { QualityRenderControls } from '../components/panels/quality/QualityRenderControls';
import LightPanelControls from '../components/panels/lighting/LightPanelControls';
import { FormulaParamsWidget } from '../components/panels/formula/FormulaParamsWidget';
import { LfoList } from '../components/panels/formula/LfoList';
import LightGizmo, { tick as lightGizmoTick } from './lighting/LightGizmo';
import { DrawingOverlay, tick as drawingOverlayTick } from './drawing/DrawingOverlay';
import { WebcamOverlay } from '../../engine/features/webcam/WebcamOverlay';
import { DebugToolsOverlay } from '../../engine/features/debug_tools/DebugToolsOverlay';
import {
    ColorGradingHistogram,
    OpticsControls,
    OpticsDofControls,
    NavigationControls,
} from '../components/panels/scene_widgets';

// --- Bespoke panel components ---
import { EnginePanel } from '../components/panels/EnginePanel';
import { CameraManagerPanel } from './camera_manager/CameraManagerPanel';
import React_FlowEditor from '../components/panels/flow/FlowEditor';

// ── Connectors: widgets that need to subscribe to store-managed
// histogram probe registration (coloring + scene color grading).

const useHistogramRegistration = (
    register: (() => void) | undefined,
    unregister: (() => void) | undefined,
) => {
    useEffect(() => {
        if (!register || !unregister) return;
        register();
        return () => unregister();
    }, [register, unregister]);
};

const ConnectedColoringHistogram: React.FC<FeatureComponentProps> = (props) => {
    const histogramData = useEngineStore((s) => (s as any).histogramData);
    const histogramLoading = useEngineStore((s) => (s as any).histogramLoading);
    const autoUpdate = useEngineStore((s) => (s as any).histogramAutoUpdate);
    const setAuto = useEngineStore((s) => (s as any).setHistogramAutoUpdate);
    const refresh = useEngineStore((s) => (s as any).refreshHistogram);
    const liveModulations = useEngineStore((s) => (s as any).liveModulations);

    useHistogramRegistration(
        useEngineStore((s) => (s as any).registerHistogram),
        useEngineStore((s) => (s as any).unregisterHistogram),
    );

    const handleChange = (partial: any) => {
        const setAction = (useEngineStore.getState() as any).setColoring;
        if (setAction) setAction(partial);
    };

    return (
        <ColoringHistogram
            layer={(props as any).layer}
            state={props.sliceState as any}
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
        useEngineStore((s) => (s as any).registerSceneHistogram),
        useEngineStore((s) => (s as any).unregisterSceneHistogram),
    );
    return <ColorGradingHistogram {...props as any} />;
};

// FormulaSelect wrapper — reads the current formula + setFormula from
// the store. Registered as 'formula-select' and slotted above the
// Formula panel via widgets.before (see engine-gmt/panels.ts).
const ConnectedFormulaSelect: React.FC = () => {
    const formula = useEngineStore((s) => s.formula);
    const setFormula = useEngineStore((s) => s.setFormula);
    return (
        <div className="px-2 pb-2">
            <FormulaSelect value={formula as any} onChange={(f: any) => setFormula(f)} />
        </div>
    );
};

// ── Entry point ────────────────────────────────────────────────────

export const registerGmtUi = () => {
    // Widgets — auto-slotted by AutoFeaturePanel via each feature's customUI.
    componentRegistry.register('coloring-histogram', ConnectedColoringHistogram);
    componentRegistry.register('gradient-preview-layer1', GradientPreviewLayer1 as any);
    componentRegistry.register('gradient-preview-layer2', GradientPreviewLayer2 as any);
    componentRegistry.register('texturing-source-toggle', TexturingSourceToggle as any);
    componentRegistry.register('coloring-histogram-layer-marker', HistogramLayerMarker as any);
    componentRegistry.register('hybrid-advanced-lock', HybridAdvancedLock as any);
    componentRegistry.register('julia-randomize', JuliaRandomize as any);
    componentRegistry.register('interaction-picker', InteractionPicker as any);
    componentRegistry.register('formula-select', ConnectedFormulaSelect as any);
    componentRegistry.register('quality-render-controls', QualityRenderControls as any);
    componentRegistry.register('light-panel-controls', LightPanelControls as any);
    componentRegistry.register('formula-params', FormulaParamsWidget as any);

    // LfoList reads full store state + actions — wrap to FeatureComponentProps shape
    const LfoListWidget: React.FC<FeatureComponentProps> = () => {
        const store = useEngineStore();
        return <LfoList state={store as any} actions={store as any} />;
    };
    componentRegistry.register('lfo-list', LfoListWidget as any);
    componentRegistry.register('overlay-lighting', LightGizmo as any);
    registerTick('lightGizmoTick', TICK_PHASE.OVERLAY, lightGizmoTick);

    componentRegistry.register('overlay-drawing', DrawingOverlay as any);
    registerTick('drawingOverlayTick', TICK_PHASE.OVERLAY, drawingOverlayTick);

    componentRegistry.register('overlay-webcam', WebcamOverlay as any);
    componentRegistry.register('overlay-debug-tools', DebugToolsOverlay as any);

    // Scene widgets — slotted via optics / navigation / colorGrading customUI.
    componentRegistry.register('scene-histogram', ConnectedGradingHistogram);
    componentRegistry.register('optics-controls', OpticsControls as any);
    componentRegistry.register('optics-dof-controls', OpticsDofControls as any);
    componentRegistry.register('navigation-controls', NavigationControls as any);

    // Bespoke panels — manifest references these by `component:`.
    componentRegistry.register('panel-engine', EnginePanel as any);
    componentRegistry.register('panel-cameramanager', CameraManagerPanel as any);
    componentRegistry.register('panel-graph', React_FlowEditor as any);
};
