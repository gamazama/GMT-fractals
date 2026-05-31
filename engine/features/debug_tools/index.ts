
import { FeatureDefinition } from '../../../engine/FeatureSystem';

export interface DebugToolsState {
    shaderDebuggerOpen: boolean;
    stateDebuggerOpen: boolean;
    /** ADR-0061 P2 dev overlay — shows live InteractionSession sources, the
     *  isInteracting boolean, adaptive scale, and a P4 divergence-counter stub. */
    interactionSessionOpen: boolean;
}

export const DebugToolsFeature: FeatureDefinition = {
    id: 'debugTools',
    shortId: 'dt',
    name: 'Debug Tools',
    category: 'System',
    viewportConfig: {
        componentId: 'overlay-debug-tools',
        type: 'dom',
        renderOrder: 100
    },
    menuItems: [
        { label: 'GLSL Debugger', toggleParam: 'shaderDebuggerOpen', icon: 'Code', advancedOnly: true },
        { label: 'State Debugger', toggleParam: 'stateDebuggerOpen', icon: 'Info', advancedOnly: true },
        { label: 'Interaction Session', toggleParam: 'interactionSessionOpen', icon: 'Activity', advancedOnly: true }
    ],
    params: {
        shaderDebuggerOpen: { type: 'boolean', default: false, label: 'GLSL Debugger', shortId: 'sd', group: 'tools', noReset: true },
        stateDebuggerOpen: { type: 'boolean', default: false, label: 'State Debugger', shortId: 'st', group: 'tools', noReset: true },
        interactionSessionOpen: { type: 'boolean', default: false, label: 'Interaction Session', shortId: 'is', group: 'tools', noReset: true }
    }
};
