/**
 * Effective minimum zoom — drops to MIN_ZOOM_DEEP (1e-300) when the
 * deep-zoom feature is enabled, otherwise the standard f32-friendly bound.
 * Read at gesture time, not subscribed (no re-render cost). Slider's
 * hardMin stays at MIN_ZOOM regardless; past it the slider freezes and
 * only mouse wheel / middle-drag can drive deeper.
 */

import { useEngineStore } from '../../../store/engineStore';
import { MIN_ZOOM, MIN_ZOOM_DEEP } from '../../constants';

export const effectiveMinZoom = (): number => {
    const dz = useEngineStore.getState().deepZoom;
    return (dz && dz.enabled) ? MIN_ZOOM_DEEP : MIN_ZOOM;
};
