
export type ColorMapping = 'Trap' | 'Iterations' | 'Radial' | 'Z-Depth' | 'Angle' | 'Normal' | 'Decomposition' | 'Raw Iterations' | 'Last Length';
export type BlendMode = 'Mix' | 'Add' | 'Multiply' | 'Overlay' | 'Screen' | 'Bump';
export type AAMode = 'Off' | 'Auto' | 'Always';
export type FalloffType = 'Linear' | 'Quadratic';
export type IntensityUnit = 'raw' | 'ev';
export type EmissionMode = 'Full' | 'Layer1' | 'Layer2' | 'Layer3' | 'Solid';
export type DrosteTiling = 'Repeat' | 'Mirror' | 'Clamp' | 'Transparent';

export interface GradientStop {
  id: string;
  position: number;
  color: string;
  bias?: number;
  interpolation?: 'linear' | 'step' | 'smooth' | 'cubic';
}

export type ColorSpaceMode = 'srgb' | 'linear' | 'aces_inverse';

/** How colors blend between gradient stops */
/** `hsv-far` is RETIRED from every chooser; the type and the renderer keep it so older
 *  gradients still render (owner, 2026-09-08). See types/graphics.ts.
 *
 *  MUST stay identical to the union in types/graphics.ts — these two trees are
 *  duplicated, and that file carries the naming trap for `oklab` vs `oklab-rect`. */
export type BlendColorSpace =
    | 'spectral'
    | 'rgb'
    | 'oklab-rect'
    | 'oklab'
    | 'cielch'
    | 'hsv'
    | 'hsv-far';

// The new Rich Object container
export interface GradientConfig {
    stops: GradientStop[];
    colorSpace: ColorSpaceMode;
    blendSpace: BlendColorSpace;
}

export type LightType = 'Point' | 'Directional' | 'Sphere';

// Monotonic counter for generating stable light IDs
let _lightIdCounter = 0;
export function generateLightId(): string {
    return `l${++_lightIdCounter}`;
}

export interface LightParams {
    /** Stable identity — survives array reorder, used for React keys & gizmo refs.
     *  Optional in formula defaults — generated at runtime by normalizeLights(). */
    id?: string;
    type: LightType;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    color: string;
    intensity: number;
    falloff: number;
    falloffType: FalloffType;
    fixed: boolean;
    visible: boolean;
    castShadow: boolean;
    // Temperature in Kelvin (1000K - 40000K, typical usable range 1000-10000K)
    temperature?: number;
    useTemperature?: boolean;
    // Power+Range model: max light distance. 0 = infinite (no range cutoff).
    range?: number;
    // Intensity unit: 'raw' = linear multiplier, 'ev' = exposure value (stops, 2^ev).
    intensityUnit?: IntensityUnit;
    // Visible radius in world-space units. 0 = invisible analytical light.
    radius?: number;
    // Soft edge width as a fraction of radius. 0 = hard edge, 1 = fade extends one full radius beyond sphere.
    softness?: number;
    // Hide the visible emitter sphere from the viewport. For Sphere area lights
    // this lets the user keep the physical light radius active for area sampling
    // while suppressing the rendered glowing ball. Defaults to false.
    hideEmitter?: boolean;
}
