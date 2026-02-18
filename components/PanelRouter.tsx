
import React, { memo } from 'react';
import { FractalState, FractalActions, PanelId } from '../types';
import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from './registry/ComponentRegistry';

// Import FlowEditor specifically because it's a special case (not fully DDFS yet)
// OR we rely on it being registered as 'panel-graph' which we did in ComponentRegistry.

interface PanelRouterProps {
    activeTab: PanelId;
    state: FractalState;
    actions: FractalActions;
    onSwitchTab: (tab: PanelId) => void;
}

export const PanelRouter: React.FC<PanelRouterProps> = ({ activeTab, state, actions, onSwitchTab }) => {
    // 1. Check for Graph Special Case (Modular)
    if (activeTab === 'Graph') {
        const GraphComponent = componentRegistry.get('panel-graph') as React.FC<any>;
        if (GraphComponent) {
            return <div className="h-[600px] -m-4"><GraphComponent state={state} actions={actions} /></div>;
        }
    }

    // 2. Check for Camera Manager Special Case
    if (activeTab === 'Camera Manager') {
        const CameraManagerComponent = componentRegistry.get('panel-cameramanager') as React.FC<any>;
        if (CameraManagerComponent) {
            return <CameraManagerComponent state={state} actions={actions} />;
        }
    }

    // 3. Check for Engine Special Case
    if (activeTab === 'Engine') {
        const EngineComponent = componentRegistry.get('panel-engine') as React.FC<any>;
        if (EngineComponent) {
            return <EngineComponent state={state} actions={actions} />;
        }
    }

    // 4. Find feature associated with this tab
    const tabs = featureRegistry.getTabs();
    const activeFeature = tabs.find(t => t.label === activeTab);
    
    if (activeFeature) {
        const Component = componentRegistry.get(activeFeature.componentId);
        if (Component) {
             // Pass state and actions. Legacy panels expect them directly.
             // We also pass onSwitchTab for FormulaPanel
             // We pass featureId and sliceState to satisfy FeatureComponentProps for newer components
             const featureId = activeFeature.id;
             const sliceState = (state as any)[featureId];
             
             return <Component 
                state={state} 
                actions={actions} 
                onSwitchTab={onSwitchTab}
                featureId={featureId}
                sliceState={sliceState}
             />;
        }
    }

    return <div className="flex h-full items-center justify-center text-gray-600 text-xs italic">Select a module</div>;
};
