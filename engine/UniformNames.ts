
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
    LightRadius: 'uLightRadius',
    LightSoftness: 'uLightSoftness',

    // Accumulation & History
    HistoryTexture: 'uHistoryTexture',
    BlendFactor: 'uBlendFactor',
    Jitter: 'uJitter',
    BlueNoiseTexture: 'uBlueNoiseTexture',
    BlueNoiseResolution: 'uBlueNoiseResolution', // Added

    // Modular
    ModularParams: 'uModularParams',
    
    // Environment
    EnvMapTexture: 'uEnvMapTexture',
    EnvRotationMatrix: 'uEnvRotationMatrix', // CPU Optimization
    FogColorLinear: 'uFogColorLinear', // CPU: InverseACESFilm(uFogColor)

    // Debug Tools
    HistogramLayer: 'uHistogramLayer',
    
    // Geometry Transforms (CPU Optimization — branchless 3-stage rotation)
    PreRotMatrix: 'uPreRotMatrix',
    PostRotMatrix: 'uPostRotMatrix',
    WorldRotMatrix: 'uWorldRotMatrix',
    
    // Export/Render Scale
    InternalScale: 'uInternalScale',
    PixelSizeBase: 'uPixelSizeBase',
    
    // Vector Formula Parameters (NEW)
    Vec2A: 'uVec2A',
    Vec2B: 'uVec2B',
    Vec2C: 'uVec2C',
    Vec3A: 'uVec3A',
    Vec3B: 'uVec3B',
    Vec3C: 'uVec3C',
    Vec4A: 'uVec4A',
    Vec4B: 'uVec4B',
    Vec4C: 'uVec4C',
} as const;

export type UniformName = typeof Uniforms[keyof typeof Uniforms];
