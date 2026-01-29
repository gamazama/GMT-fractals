
export const Uniforms = {
    // Core
    Time: 'uTime',
    Resolution: 'uResolution',
    
    // Precision & Camera
    SceneOffsetHigh: 'uSceneOffsetHigh',
    SceneOffsetLow: 'uSceneOffsetLow',
    CameraPosition: 'uCameraPosition',
    CamBasisX: 'uCamBasisX',
    CamBasisY: 'uCamBasisY',
    CamForward: 'uCamForward',
    CamType: 'uCamType',

    // Regions
    RegionMin: 'uRegionMin',
    RegionMax: 'uRegionMax',

    // Lights
    LightCount: 'uLightCount',
    LightPos: 'uLightPos',
    LightColor: 'uLightColor',
    LightIntensity: 'uLightIntensity',
    LightShadows: 'uLightShadows',
    LightFalloff: 'uLightFalloff',
    LightFalloffType: 'uLightFalloffType',

    // Accumulation & History
    HistoryTexture: 'uHistoryTexture',
    BlendFactor: 'uBlendFactor',
    ExtraSeed: 'uExtraSeed',
    Jitter: 'uJitter',

    // Modular
    ModularParams: 'uModularParams',
    
    // Environment
    EnvMapTexture: 'uEnvMapTexture',
    EnvRotationMatrix: 'uEnvRotationMatrix', // CPU Optimization

    // Debug Tools
    HistogramLayer: 'uHistogramLayer',
    
    // Geometry Transforms (CPU Optimization)
    PreRotMatrix: 'uPreRotMatrix'
} as const;

export type UniformName = typeof Uniforms[keyof typeof Uniforms];
