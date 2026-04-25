
import { HelpSection } from '../../../types/help';

export const EFFECTS_TOPICS: Record<string, HelpSection> = {
    'post.effects': {
        id: 'post.effects',
        category: 'Effects',
        title: 'Post-Processing Effects',
        content: `
Post-processing effects are visual adjustments applied **after** the fractal has been rendered. They modify the final image on screen without changing the underlying raymarching, so they have virtually no impact on rendering performance.

## Available Effects
- **Bloom**: Adds a soft glow around bright areas, simulating how real camera lenses scatter intense light.
- **Chromatic Aberration**: Separates color channels at the edges of the frame, mimicking the rainbow fringing of wide-angle lenses.
- **Color Grading**: Controls tone mapping (how HDR brightness is compressed to screen range) and overall color balance — saturation, levels, and gamma.

Each effect has its own detailed settings — expand the sections below to learn more.

## Tips
- Post-processing is always fast, even on lower-end hardware.
- Effects are included in Bucket Renders and Video Exports — what you see in the viewport is what you get in the final file.
`
    },
    'effect.bloom': {
        id: 'effect.bloom',
        category: 'Effects',
        title: 'Bloom',
        content: `
Creates a soft glow around bright areas of the image, simulating how real camera lenses scatter intense light.

## Controls
- **Intensity**: Strength of the glow effect. Higher values produce a more dramatic, dreamy look.
- **Threshold**: Brightness cutoff — only pixels brighter than this value will bloom. Lower threshold = more of the image glows.
- **Spread**: How far the glow extends from bright areas. Higher values create a wider, softer halo.

## Tips
- Works especially well with **Self-Illumination** (emissive surfaces) and bright specular highlights.
- Bloom is a post-processing effect and runs after the main render, so it has minimal performance cost.
`
    },
    'effect.chromatic': {
        id: 'effect.chromatic',
        category: 'Effects',
        title: 'Chromatic Aberration',
        content: `
Simulates the color fringing that occurs in real camera lenses, where red, green, and blue light bend slightly differently through glass.

The effect separates color channels at the edges of the frame, creating rainbow fringing that increases toward the corners — just like a wide-angle lens.

## Tips
- Subtle amounts (low intensity) add a photographic quality.
- Higher amounts create a stylized, glitchy look.
- This is a post-processing effect with minimal performance cost.
`
    },
    'effect.colorgrading': {
        id: 'effect.colorgrading',
        category: 'Effects',
        title: 'Color Grading',
        content: `
Controls the final color processing of the rendered image, similar to color grading in film and photography.

## Tone Mapping
Tone mapping compresses the wide range of light intensities (HDR) into the visible screen range. Different modes produce different visual styles:

- **ACES**: Industry-standard cinematic look. Rich contrast with slightly warm highlights. Great all-round choice.
- **AgX**: Modern filmic curve with excellent highlight handling. Avoids the oversaturated look of ACES in very bright areas.
- **Reinhard**: Classic tone mapping. Softer, more even compression. Good for scenes without extreme brightness.
- **Neutral**: Minimal color shift — closest to the raw render output. Useful when you want full manual control.
- **None**: No tone mapping applied. The raw HDR values are clamped directly. Bright areas will clip to white.

## Color Controls
- **Saturation**: Adjusts the intensity of all colors. 1.0 = natural, 0.0 = grayscale, >1.0 = vivid.
- **Levels**: Adjusts the black and white points of the image for contrast control.
`
    },
    'effect.droste': {
        id: 'effect.droste',
        category: 'Effects',
        title: 'Escher Droste (Spiral)',
        content: `
The Droste effect recursively maps an image inside itself, creating infinite spirals or loops. This implementation is mathematically based on M.C. Escher's "Print Gallery".

**Reference:** [Wikipedia: Droste Effect](https://en.wikipedia.org/wiki/Droste_effect)
**Artistic Origin:** [M.C. Escher: Print Gallery](https://en.wikipedia.org/wiki/Print_Gallery_(M._C._Escher))

## How it works
It transforms the screen coordinates from **Cartesian** ($x, y$) to **Log-Polar** space. 
This turns scaling (zooming) into a linear shift, allowing us to repeat the image periodically as it shrinks towards the center.

## Key Controls
- **Inner/Outer Radius**: Defines the "Ring" (Annulus) where the image lives. The ratio between these determines how fast the spiral shrinks.
- **Periodicity**: How many times the image repeats per spiral loop.
- **Strands**: Number of separate spiral arms. Can be negative (range -12 to 12) — negative values reverse the spiral direction.
`
    },
    'droste.geometry': {
        id: 'droste.geometry',
        category: 'Effects',
        title: 'Geometry & Tiling',
        parentId: 'effect.droste',
        content: `
Controls the physical bounds of the spiral.

- **Inner Radius ($r_1$)**: The size of the "hole" in the center.
- **Outer Radius ($r_2$)**: The outer edge of the image.
- **Tiling**:
  - **Repeat**: Standard tile.
  - **Mirror**: Flips every other tile. Essential for seamless spirals if the image edges don't match.
  - **Clamp**: Stretches the edge pixels (Smear effect).
  - **Transparent**: Only draws the spiral ring, leaving the center/outside empty (or showing the background).
- **Center Shift**: Moves the vanishing point of the spiral.
`
    },
    'droste.structure': {
        id: 'droste.structure',
        category: 'Effects',
        title: 'Spiral Structure',
        parentId: 'effect.droste',
        content: `
Controls the math of the repetition.

- **Periodicity ($P_1$)**: The repetition frequency.
  - **1.0**: Image repeats once per full rotation.
  - **2.0**: Image repeats twice (180° symmetry).
- **Strands ($P_2$)**: The number of "arms" in the spiral. Can be negative (-12 to 12) — negative values reverse the spiral direction.
  - **1**: Single continuous tunnel.
  - **2**: Double helix structure.
- **Auto Period**: Mathematically calculates the perfect Periodicity based on the Radius ratio ($r_2/r_1$) to prevent distortion. Recommended to keep this **ON** unless you want artistic stretching.
- **Mirror Strand**: Alters the rotation logic to align strands seamlessly when using Mirror Tiling.
`
    },
    'droste.transform': {
        id: 'droste.transform',
        category: 'Effects',
        title: 'Transform & Distortion',
        parentId: 'effect.droste',
        content: `
- **Zoom**: Moves the camera *into* the spiral. Because the spiral is infinite, zooming eventually brings you back to the start (just deeper).

### Three Rotation Controls
The Droste effect has three separate rotation axes that each produce distinct visual results:
- **Spiral Rotate**: Rotates the spiral structure itself — the arms twist tighter or looser.
- **Image Spin**: Rotates the image content within the spiral frame, independently of the spiral geometry.
- **Polar Rotate**: Rotates around the polar axis in log-polar space, shifting the mapping angle.

- **Twist**: The core "Escher" switch.
  - **On**: Log-Polar mapping (Spiral).
  - **Off**: Standard Log mapping (Tunnel/Grid).
- **Hyper Droste**: Applies a complex sine function, turning the spiral into a Fractal-like shape.
- **Fractal Points**: When Hyper Droste is on, determines the number of branches/tips in the fractal structure.
`
    }
};
