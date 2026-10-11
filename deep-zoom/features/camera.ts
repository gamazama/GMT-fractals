/**
 * deep-zoom/features/camera.ts - the route's one track on the timeline, and the depth scale.
 *
 * WHY THE ID IS `camera` (no `dz` prefix, on purpose). The timeline files tracks into groups by a
 * hardcoded prefix: a track whose id starts `camera.` lands in the Camera group; any other id is
 * filed under "Shading". fractal-toy has a feature with the same id; it is a separate page, so
 * there is no clash.
 *
 * `depth` is the route: the track `camera.depth` holds one key per keyframe of the camera move.
 * A key's value is the depth there, which is what the timeline draws and eases (in log space);
 * the exact view rides in the key's payload as 256-bit strings, which a float cannot hold. The
 * track is registered, written and played by `deep-zoom/route.ts`; this file only declares the
 * param, which is what gives the track its place in the Camera group and its binder.
 *
 * THE PARAM'S OWN VALUE is what the timeline last wrote: the route's depth at the playhead. It is
 * not the camera's depth (that is `deep-zoom/depthNow.ts`), no panel shows it and nothing reads
 * it but the timeline's own "is this frame keyed" marks.
 *
 * The feature also declares the depth scale as its viewport overlay (`overlay-depth-scale`, a DOM
 * overlay), which is how the engine's `<FeatureOverlays />` comes to mount it. The component is
 * registered in registerFeatures.ts.
 *
 * The renderer owns the camera itself (three 256-bit numbers, yaw, pitch, roll); it is never in the store.
 */
import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const DZ_DEPTH_SCALE_OVERLAY = 'overlay-depth-scale';

export const DzCameraFeature = {
    id: 'camera',
    name: 'Route',
    category: 'Navigation',
    viewportConfig: { componentId: DZ_DEPTH_SCALE_OVERLAY, type: 'dom' },
    params: {
        depth: {
            type: 'float',
            default: 1, min: 1e-77, max: 100, step: 0.001,
            label: 'Depth',
            description: 'The route\'s depth at the playhead: how far the camera is from what it looks at there.',
        },
    },
} satisfies FeatureDefinition;
