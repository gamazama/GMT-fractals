/**
 * HistogramLayerMarker — connector widget that flips the histogram-layer
 * selector while it is mounted. Slot one inside each Layer accordion
 * body so the histogram probe targets the active layer.
 *
 * The original GMT ColoringPanel ran this from the parent's `useEffect`
 * gated on which layer tab was open. Moving it into a widget lets the
 * manifest express the same behaviour declaratively — the widget is
 * only mounted while its parent accordion section is open.
 */

import React, { useEffect } from 'react';
import { useEngineStore } from '../../../../store/engineStore';

export interface HistogramLayerMarkerProps {
    layer: 0 | 1;
}

export const HistogramLayerMarker: React.FC<HistogramLayerMarkerProps> = ({ layer }) => {
    const setHistogramLayer = useEngineStore((s) => (s as any).setHistogramLayer);
    useEffect(() => {
        setHistogramLayer?.(layer);
    }, [layer, setHistogramLayer]);
    return null;
};
