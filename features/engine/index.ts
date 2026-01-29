
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { ENGINE_PROFILES } from './profiles';

export const EngineSettingsFeature: FeatureDefinition = {
    id: 'engineSettings',
    shortId: 'eng',
    name: 'Engine Config',
    category: 'System',
    tabConfig: {
        label: 'Engine',
        componentId: 'panel-engine',
        order: 5,
        condition: { param: 'showEngineTab', bool: true } // Hidden by default
    },
    params: {
        showEngineTab: {
            type: 'boolean',
            default: false,
            label: 'Show Engine Tab',
            shortId: 'se',
            group: 'system',
            noReset: true,
            hidden: true // Hide from auto-panel since it's in System Menu
        }
    },
    actions: {
        applyPreset: (state: any, payload: { mode: 'fastest' | 'lite' | 'balanced' | 'ultra', actions: any }) => {
            const { mode, actions } = payload;
            const profile = ENGINE_PROFILES[mode];
            
            if (!profile) return {};

            // Dynamically apply all settings defined in the profile
            Object.entries(profile).forEach(([featureId, params]) => {
                // Construct the setter name (e.g., setLighting)
                const setterName = `set${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
                const setter = actions[setterName];
                
                if (typeof setter === 'function') {
                    setter(params);
                }
            });
            
            return {};
        }
    }
};
