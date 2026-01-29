
import { FeatureDefinition } from '../../engine/FeatureSystem';
import * as THREE from 'three';
import { PreciseVector3 } from '../../types/common';

// --- TYPE DEFINITIONS (Colocated) ---

export interface DrawnShape {
    id: string;
    type: 'rect' | 'circle';
    center: PreciseVector3;
    size: { x: number, y: number, z?: number }; // z is depth
    zOffset?: number; // Shift along normal
    orientation: { x: number, y: number, z: number, w: number };
    color: string;
}

export interface DrawingState {
    enabled: boolean;
    active: boolean;
    activeTool: 'rect' | 'circle';
    color: THREE.Color;
    showLabels: boolean;
    showAxes: boolean;
    originMode: number;
    lineWidth: number;
    shapes: DrawnShape[];
    refreshTrigger: number;
}

export interface DrawingActions {
    addDrawnShape: (shape: DrawnShape) => void;
    removeDrawnShape: (id: string) => void;
    updateDrawnShape: (payload: { id: string, updates: Partial<DrawnShape> }) => void;
    clearDrawnShapes: () => void;
}

// --- FEATURE DEFINITION ---

export const DrawingFeature: FeatureDefinition = {
    id: 'drawing',
    shortId: 'dr',
    name: 'Drawing Tools',
    category: 'Tools',
    tabConfig: {
        label: 'Drawing',
        componentId: 'panel-drawing',
        order: 80,
        condition: { param: 'enabled', bool: true }
    },
    viewportConfig: {
        componentId: 'overlay-drawing'
    },
    menuConfig: {
        label: 'Drawing Tools',
        toggleParam: 'enabled'
    },
    interactionConfig: {
        blockCamera: true,
        activeParam: 'active'
    },
    params: {
        enabled: { type: 'boolean', default: false, label: 'Show Tab', shortId: 'en', group: 'system', hidden: true, noReset: true },
        active: { type: 'boolean', default: false, label: 'Enable Tool', shortId: 'ac', group: 'main', noReset: true, hidden: true },
        activeTool: { type: 'float', default: 0, label: 'Tool Type', shortId: 'tt', group: 'main', noReset: true, hidden: true }, // Mapped in UI (0=rect, 1=circle for now handled as strings in interface)
        originMode: {
            type: 'float', default: 1.0, label: 'Origin Plane', shortId: 'om', group: 'settings', noReset: true,
            options: [{ label: 'Global Zero', value: 0.0 }, { label: 'Surface (Probe)', value: 1.0 }],
            description: 'Where the drawing plane starts.'
        },
        color: { type: 'color', default: new THREE.Color('#00ffff'), label: 'Line Color', shortId: 'cl', group: 'settings', noReset: true },
        lineWidth: { type: 'float', default: 1.0, label: 'Line Width', shortId: 'lw', min: 1.0, max: 10.0, step: 1.0, group: 'settings', noReset: true, hidden: true },
        showLabels: { type: 'boolean', default: true, label: 'Show Measurements', shortId: 'sl', group: 'settings', noReset: true },
        showAxes: { type: 'boolean', default: false, label: 'Show Axis Ruler', shortId: 'ax', group: 'settings', noReset: true, description: 'Displays a reference grid at the drawing origin.' },
        shapes: { type: 'complex', default: [], label: 'Shapes', shortId: 'sh', group: 'data', hidden: true, noReset: true },
        refreshTrigger: { type: 'float', default: 0, label: 'Refresh Trigger', group: 'system', hidden: true, noReset: true }
    },
    state: {
        activeTool: 'rect'
    },
    actions: {
        addDrawnShape: (state: DrawingState, shape: DrawnShape) => ({ shapes: [...(state.shapes || []), shape] }),
        removeDrawnShape: (state: DrawingState, id: string) => ({ shapes: (state.shapes || []).filter(s => s.id !== id) }),
        updateDrawnShape: (state: DrawingState, payload: { id: string, updates: Partial<DrawnShape> }) => ({
            shapes: (state.shapes || []).map(s => s.id === payload.id ? { ...s, ...payload.updates } : s)
        }),
        clearDrawnShapes: (state: DrawingState) => ({ shapes: [] })
    },
    shader: {}
};
