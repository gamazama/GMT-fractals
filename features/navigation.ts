
import { FeatureDefinition } from '../engine/FeatureSystem';

export interface NavigationState {
    flySpeed: number;
    autoSlow: boolean;
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
        flySpeed: { type: 'float', default: 0.5, label: 'Fly Speed %', shortId: 'fs', min: 0.001, max: 1.0, step: 0.001, group: 'movement', format: (v) => `${(v * 100).toFixed(1)}%` },
        autoSlow: { type: 'boolean', default: true, label: 'Auto-slow on collision', shortId: 'as', group: 'movement' }
    }
};
