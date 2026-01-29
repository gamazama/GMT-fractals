
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { getAOGLSL } from './shader';

export interface AOState {
    aoIntensity: number;
    aoSpread: number;
    aoSamples: number;     
    aoMaxSamples: number; 
    aoStochasticCp: boolean; 
    aoMode: boolean;       
    aoEnabled: boolean;    
}

export const AOFeature: FeatureDefinition = {
    id: 'ao',
    shortId: 'ao',
    name: 'Ambient Occlusion',
    category: 'Lighting',
    engineConfig: {
        toggleParam: 'aoEnabled',
        mode: 'compile',
        label: 'Ambient Occlusion',
        groupFilter: 'engine_settings' 
    },
    params: {
        // --- SHADING PARAMETERS (Runtime, in Shading Panel) ---
        aoIntensity: {
            type: 'float', default: 0.2, label: 'Ambient Occlusion', shortId: 'ai', uniform: 'uAOIntensity',
            scale: 'log', min: 0, max: 5, step: 0.01, group: 'shading',
            condition: { param: 'aoEnabled', bool: true }
        },
        aoSpread: {
            type: 'float', default: 0.5, label: 'Spread', shortId: 'as', uniform: 'uAOSpread',
            scale: 'log', min: 0.01, max: 2, step: 0.01, group: 'shading',
            condition: [{ param: 'aoEnabled', bool: true }, { param: 'aoIntensity', gt: 0.0 }]
        },
        aoSamples: {
            type: 'int', default: 5, label: 'Samples', shortId: 'ap',
            min: 2, max: 32, step: 1, 
            group: 'shading',
            uniform: 'uAOSamples', 
            ui: 'numeric',
            description: "Iterations per pixel. Runtime controlled.",
            condition: [{ param: 'aoEnabled', bool: true }, { param: 'aoIntensity', gt: 0.0 }]
        },
        aoMode: {
            type: 'boolean', default: true, label: 'Stochastic Mode', shortId: 'am', uniform: 'uAOMode',
            group: 'shading', 
            condition: [
                { param: 'aoEnabled', bool: true }, 
                { param: 'aoIntensity', gt: 0.0 },
                { param: 'aoStochasticCp', bool: true }
            ],
            description: "Switches between Fixed and Stochastic sampling at runtime."
        },

        // --- ENGINE PARAMETERS (Engine Panel) ---
        aoMaxSamples: {
             type: 'int', default: 32, label: 'Max AO Samples', shortId: 'amx',
             min: 16, max: 128, step: 16,
             group: 'engine_settings',
             ui: 'numeric',
             description: "Hard limit for AO loop (Compile Time).",
             onUpdate: 'compile',
             noReset: true
        },
        aoStochasticCp: {
            type: 'boolean', default: true, label: 'Load Stochastic Sampling', shortId: 'sc', 
            group: 'engine_settings',
            ui: 'checkbox', 
            description: "Compiles High-Quality noise logic into the shader.",
            onUpdate: 'compile', 
            noReset: true
        },
        
        // Master Switch (Kernel)
        aoEnabled: {
            type: 'boolean', default: true, label: 'Enable AO', shortId: 'ae', group: 'main',
            hidden: true, noReset: true,
            onUpdate: 'compile'
        }
    },
    inject: (builder, config, variant) => {
        // OPTIMIZATION: Only inject AO code for Main render
        // Physics/Histogram do not need AO
        if (variant !== 'Main') {
            builder.addPostDEFunction(`float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }`);
            return;
        }

        const state = config.ao as AOState;
        
        // CONDITIONAL COMPILATION:
        const enabled = state?.aoEnabled !== false;
        
        // Pass the 'enabled' flag to the shader generator. 
        // If false, it returns a stub: float GetAO(...) { return 1.0; }
        const stochastic = state?.aoStochasticCp !== false;
        const maxSamples = state?.aoMaxSamples || 32;
        
        builder.addPostDEFunction(getAOGLSL(enabled, stochastic, maxSamples));
    }
};
