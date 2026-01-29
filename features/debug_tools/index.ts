
import { FeatureDefinition } from '../../engine/FeatureSystem';

export interface DebugToolsState {
    shaderDebuggerOpen: boolean;
    stateDebuggerOpen: boolean;
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
        { label: 'State Debugger', toggleParam: 'stateDebuggerOpen', icon: 'Info', advancedOnly: true }
    ],
    params: {
        shaderDebuggerOpen: { type: 'boolean', default: false, label: 'GLSL Debugger', shortId: 'sd', group: 'tools', noReset: true },
        stateDebuggerOpen: { type: 'boolean', default: false, label: 'State Debugger', shortId: 'st', group: 'tools', noReset: true }
    }
};
