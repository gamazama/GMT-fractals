
export const Uniforms = {
    // Core
    Time: 'uTime',
    FrameCount: 'uFrameCount',
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
    LightType: 'uLightType', // 0=Point, 1=Directional
    LightPos: 'uLightPos',
    LightDir: 'uLightDir', // Precomputed direction vector
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
    BlueNoiseTexture: 'uBlueNoiseTexture',
    BlueNoiseResolution: 'uBlueNoiseResolution', // Added

    // Modular
    ModularParams: 'uModularParams',
    
    // Environment
    EnvMapTexture: 'uEnvMapTexture',
    EnvRotationMatrix: 'uEnvRotationMatrix', // CPU Optimization

    // Debug Tools
    HistogramLayer: 'uHistogramLayer',
    
    // Geometry Transforms (CPU Optimization)
    PreRotMatrix: 'uPreRotMatrix',
    
    // Export/Render Scale
    InternalScale: 'uInternalScale'
} as const;

export type UniformName = typeof Uniforms[keyof typeof Uniforms];
