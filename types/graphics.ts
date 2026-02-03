
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

export interface LightParams {
    position: { x: number, y: number, z: number };
    color: string;
    intensity: number;
    falloff: number;
    falloffType: FalloffType;
    fixed: boolean;
    visible: boolean;
    castShadow: boolean;
}
