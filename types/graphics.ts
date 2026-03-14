
export type ColorMapping = 'Trap' | 'Iterations' | 'Radial' | 'Z-Depth' | 'Angle' | 'Normal' | 'Decomposition' | 'Raw Iterations' | 'Last Length';
export type BlendMode = 'Mix' | 'Add' | 'Multiply' | 'Overlay' | 'Screen' | 'Bump';
export type AAMode = 'Off' | 'Auto' | 'Always';
export type FalloffType = 'Linear' | 'Quadratic';
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

// The new Rich Object container
export interface GradientConfig {
    stops: GradientStop[];
    colorSpace: ColorSpaceMode;
}

export type LightType = 'Point' | 'Directional';

// Monotonic counter for generating stable light IDs
let _lightIdCounter = 0;
export function generateLightId(): string {
    return `l${++_lightIdCounter}`;
}

export interface LightParams {
    /** Stable identity — survives array reorder, used for React keys & gizmo refs */
    id: string;
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
    // Visible radius in world-space units. 0 = invisible analytical light.
    radius?: number;
    // Soft edge width as a fraction of radius. 0 = hard edge, 1 = fade extends one full radius beyond sphere.
    softness?: number;
}
