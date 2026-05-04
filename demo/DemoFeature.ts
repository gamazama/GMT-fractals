import type { FeatureDefinition } from '../engine/FeatureSystem';

// One declarative object → Zustand slice + auto-generated panel +
// save/load round-trip + undo/redo + animatable params. No bespoke
// wiring per feature.

export interface DemoState {
    color: string;
    position: { x: number; y: number };
    size: number;
    opacity: number;
    count: number;
    iterOffset: { x: number; y: number };
    iterRotation: number;
    iterScale: number;
    iterHueShift: number;
}

export const DemoFeature: FeatureDefinition = {
    id: 'demo',
    name: 'Demo',
    category: 'Engine',
    tabConfig: { label: 'Demo' },
    // viewportConfig mounts a feature-scoped overlay inside the
    // viewport. componentId resolves through componentRegistry (see
    // setup.ts).
    viewportConfig: { componentId: 'overlay-demo', type: 'dom' },
    params: {
        color:        { type: 'color', default: '#22d3ee', label: 'Color', group: 'Base' },
        position:     { type: 'vec2',  default: { x: 0, y: 0 },     label: 'Position', min: -1, max: 1, step: 0.01, group: 'Base' },
        size:         { type: 'float', default: 120,                label: 'Size',     min: 20, max: 400, step: 1, group: 'Base' },
        opacity:      { type: 'float', default: 0.9,                label: 'Opacity',  min: 0,  max: 1,   step: 0.01, group: 'Base' },
        count:        { type: 'int',   default: 8,                  label: 'Duplicates',          min: 1,    max: 48,  step: 1,    group: 'Iteration' },
        iterOffset:   { type: 'vec2',  default: { x: 0.04, y: 0.04 }, label: 'Offset / step',     min: -0.5, max: 0.5, step: 0.005, group: 'Iteration' },
        iterRotation: { type: 'float', default: 8,                  label: 'Rotation / step (°)', min: -90,  max: 90,  step: 0.5,  group: 'Iteration' },
        iterScale:    { type: 'float', default: 0.94,               label: 'Scale / step',        min: 0.5,  max: 1.2, step: 0.005, group: 'Iteration' },
        iterHueShift: { type: 'float', default: 18,                 label: 'Hue shift / step (°)', min: -180, max: 180, step: 1, group: 'Iteration' },
    },
};
