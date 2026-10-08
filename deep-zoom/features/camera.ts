/**
 * deep-zoom/features/camera.ts - the one number the timeline carries for a dive, and the depth scale.
 *
 * WHY THE ID IS `camera` (no `dz` prefix, on purpose). The timeline files tracks into groups by a
 * hardcoded prefix: a track whose id starts `camera.` lands in the Camera group and is skipped
 * while the camera is being recorded; any other id is filed under "Shading". fractal-toy has a
 * feature with the same id; it is a separate page, so there is no clash.
 *
 * `u` is the position along the recorded flight, 0 at its start and 1 at its end (a fraction of
 * the flight's length). The exact views stay in the flight itself as 256-bit strings; a float
 * cannot hold them. Stage 6a gives `u` its row and its subscription (`deep-zoom/flight.ts`); until
 * then it is a value nothing reads.
 *
 * The feature also declares the depth scale as its viewport overlay (`overlay-depth-scale`, a DOM
 * overlay), which is how the engine's `<FeatureOverlays />` comes to mount it. The component is
 * registered in registerFeatures.ts.
 *
 * The renderer owns the camera itself (three 256-bit numbers, yaw, pitch); it is never in the store.
 */
import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const DZ_DEPTH_SCALE_OVERLAY = 'overlay-depth-scale';

export const DzCameraFeature = {
    id: 'camera',
    name: 'Flight',
    category: 'Navigation',
    viewportConfig: { componentId: DZ_DEPTH_SCALE_OVERLAY, type: 'dom' },
    params: {
        u: {
            type: 'float',
            default: 0, min: 0, max: 1, step: 0.001,
            label: 'Flight position',
            description: 'Where the camera is along the recorded flight: 0 at its start, 1 at its end.',
        },
    },
} satisfies FeatureDefinition;
