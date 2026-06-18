
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

    // Image-Tile Export (bucket render tiling; no-op at defaults)
    ImageTileOrigin: 'uImageTileOrigin',         // UV origin of this tile in full-output space (default 0,0)
    ImageTileSize: 'uImageTileSize',             // UV size of this tile in full-output space  (default 1,1)
    FullOutputResolution: 'uFullOutputResolution', // pixels of full composed image (default = uResolution)
    TilePixelOrigin: 'uTilePixelOrigin',         // pixel offset of this tile in full output (default 0,0)

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
    LightHideEmitter: 'uLightHideEmitter',

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
    EnvCDFMarginal: 'uEnvCDFMarginal',       // 1×H R32F — row CDF (PT_ENV_MIS_IS only)
    EnvCDFConditional: 'uEnvCDFConditional', // W×H R32F — per-row column CDF (PT_ENV_MIS_IS only)
    EnvCDFSize: 'uEnvCDFSize',               // (W,H) of CDF; (1,1) = stub, fall back to uniform sphere
    EnvLumIntegral: 'uEnvLumIntegral',       // ∫L sin(θ) dθ dφ — pdf normalizer
    EnvCDFMipBias: 'uEnvCDFMipBias',         // log2(srcW/cdfW) — mip level matching CDF resolution
    EnvMaxMip: 'uEnvMaxMip',                 // floor(log2(max(W,H))) — top mip level for roughness→LOD blur
    EnvAvgColor: 'uEnvAvgColor',             // sinθ-weighted solid-angle average of the env (raw space); .r<0 = none
    FogColorLinear: 'uFogColorLinear', // CPU: InverseACESFilm(uFogColor)

    // Debug Tools
    HistogramLayer: 'uHistogramLayer',
    
    // Geometry Transforms (CPU Optimization — branchless 3-stage rotation)
    PreRotMatrix: 'uPreRotMatrix',
    PostRotMatrix: 'uPostRotMatrix',
    WorldRotMatrix: 'uWorldRotMatrix',
    
    // Interlace
    InterlaceEnabled: 'uInterlaceEnabled',
    InterlaceInterval: 'uInterlaceInterval',
    InterlaceStartIter: 'uInterlaceStartIter',

    // Export/Render Scale
    InternalScale: 'uInternalScale',
    PixelSizeBase: 'uPixelSizeBase',

    // Multi-pass export
    OutputPass: 'uOutputPass',                   // 0=beauty, 1=alpha, 2=depth. Main shader and post-process both branch on this.
    DepthMin: 'uDepthMin',                       // Near clip for depth-pass normalization (world units).
    DepthMax: 'uDepthMax',                       // Far clip for depth-pass normalization (world units).
    
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
