
import { FeatureDefinition } from '../engine/FeatureSystem';

export interface NavigationState {
    flySpeed: number;
    autoSlow: boolean;
    orbitCursorAnchor: boolean;
}

export const NavigationFeature: FeatureDefinition = {
    id: 'navigation',
    shortId: 'n',
    name: 'Navigation',
    category: 'Scene',
    customUI: [
        { componentId: 'navigation-controls', group: 'controls' }
    ],
    params: {
        flySpeed: { type: 'float', default: 0.5, label: 'Fly Speed %', shortId: 'fs', min: 0.001, max: 1.0, step: 0.001, group: 'movement', format: (v: number) => `${(v * 100).toFixed(1)}%` },
        autoSlow: { type: 'boolean', default: true, label: 'Auto-slow on collision', shortId: 'as', group: 'movement' },
        // Orbit + zoom rotate around the point under the mouse cursor (Blender-style
        // zoom-to-cursor / orbit-around-selection). Falls back to the camera-forward
        // pivot when the cursor is over empty space (pick miss). Hidden from the
        // auto-panel — exposed instead as a toggle inline with the DST HUD pill.
        orbitCursorAnchor: { type: 'boolean', default: true, label: 'Orbit/zoom around cursor', shortId: 'oca', group: 'movement', hidden: true }
    }
};
