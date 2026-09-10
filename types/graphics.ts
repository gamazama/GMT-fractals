
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
/** `hsv-far` (hue the long way round) is RETIRED: no chooser offers it any more, but the
 *  type and the renderer keep it so gradients already saved in it still render (owner,
 *  2026-09-08). Do not add it back to a picker.
 *
 *  NAMING TRAP — `oklab` is the POLAR (OkLCh) blend and is labelled "OkLCh" in every
 *  chooser; `oklab-rect` is the straight-line Oklab blend and is labelled "Oklab". The
 *  key/label mismatch is deliberate: `oklab` is the wire value in every saved gradient,
 *  share URL and preset since long before the rectangular mode existed, so renaming the
 *  key would silently reset those to the fallback. Read the LABEL, not the key.
 *
 *  Ordered here along the axis the picker uses — pigment (darker, duller) through the
 *  perceptual straight line to tint (lighter, more saturated). @see utils/colorUtils.ts */
export type BlendColorSpace =
    | 'spectral'    // Kubelka–Munk pigment mixing
    | 'rgb'         // straight channel lerp
    | 'oklab-rect'  // straight line in Oklab — zero hue bow by construction
    | 'oklab'       // POLAR OkLCh (labelled "OkLCh")
    | 'cielch'      // polar CIE L*C*h
    | 'hsv'         // polar HSV, short hue arc
    | 'hsv-far';    // retired, renderer-only

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
