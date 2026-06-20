
import { FeatureDefinition } from '../../engine/FeatureSystem';

// The Shader Compiler feature is a thin tab host: it carries only `showEngineTab`
// (toggled from the System menu) to reveal the bespoke ShaderCompilerPanel. The
// user-facing quality bundles are the Viewport Quality profiles (types/viewport.ts
// data, registered via registerGmtShaderCompilerProfiles). The old monolithic
// ENGINE_PROFILES + applyPreset action were retired (ADR-0079).
export const ShaderCompilerFeature: FeatureDefinition = {
    // id renamed engineSettings -> shaderCompiler (ADR-0079); saved scenes migrate
    // via app-gmt/migrations.ts v2 (renameSlice). Setter is now setShaderCompiler.
    id: 'shaderCompiler',
    shortId: 'eng',
    name: 'Shader Compiler',
    category: 'System',
    tabConfig: {
        label: 'Shader Compiler',
        condition: { param: 'showEngineTab', bool: true } // Hidden by default
    },
    params: {
        showEngineTab: {
            type: 'boolean',
            default: false,
            label: 'Show Shader Compiler Tab',
            shortId: 'se',
            group: 'system',
            noAccumReset: true, preserveOnApply: true,
            hidden: true // Hide from auto-panel since it's in System Menu
        }
    }
};
