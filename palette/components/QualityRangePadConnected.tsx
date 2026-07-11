/**
 * QualityRangePadConnected — DDFS adapter that binds the pure QualityRangePad
 * to a feature slice, so AutoFeaturePanel renders it with native GMT chrome.
 *
 * Registered as `palette-quality-pad` and referenced from each customUI entry
 * in PaletteFiltersFeature. Receives the standard FeatureComponentProps
 * (`featureId`, `sliceState`, `actions`) plus the per-axis props supplied by
 * the customUI entry (`axis`, `loLabel`, `hiLabel`, `track`).
 *
 * Reads the window from `sliceState[axis]` (a {x:lo, y:hi} vec param) and writes
 * it back via the auto-generated setter `set<FeatureId>({ [axis]: {x, y} })`.
 * The pure pad stays host-agnostic; this thin layer is the only store coupling.
 */

import React, { useCallback } from 'react';
import type { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { useTrackAnimation } from '../../hooks/useTrackAnimation';
import { KeyframeButton } from '../../components/KeyframeButton';
import { Hint } from '../../components/Hint';
import {
  QualityRangePad,
  combineKeyStatus,
  type Range01,
  drawLightnessTrack,
  drawChromaTrack,
  drawWarmthTrack,
  drawComplexityTrack,
  drawRainbowTrack,
} from '../../components/QualityRangePad';

const TRACKS: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {
  lightness: drawLightnessTrack,
  chroma: drawChromaTrack,
  warmth: drawWarmthTrack,
  complexity: drawComplexityTrack,
  rainbow: drawRainbowTrack,
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface AxisProps {
  axis: string;
  loLabel?: string;
  hiLabel?: string;
  track?: string;
  hint?: string;
}

export const QualityRangePadConnected: React.FC<FeatureComponentProps & AxisProps> = ({
  featureId,
  sliceState,
  actions,
  axis,
  loLabel,
  hiLabel,
  track,
  hint,
}) => {
  const setter = (actions as Record<string, (u: Record<string, unknown>) => void>)[`set${cap(featureId)}`];
  const raw = sliceState?.[axis];
  // The vec param arrives as a THREE.Vector2 (or plain {x,y}); read defensively.
  const value: Range01 = [raw?.x ?? 0, raw?.y ?? 1];

  const onChange = useCallback(
    ([lo, hi]: Range01) => setter?.({ [axis]: { x: lo, y: hi } }),
    [setter, axis],
  );

  // Keyframe diamond — the range is a vec2 param, so it has _x / _y tracks
  // (deriveTrackBinding convention). One diamond keys both bounds together.
  const kLo = useTrackAnimation(`${featureId}.${axis}_x`, value[0], `${loLabel ?? axis} min`);
  const kHi = useTrackAnimation(`${featureId}.${axis}_y`, value[1], `${hiLabel ?? axis} max`);
  const onSetKey = useCallback(() => { kLo.setKey(); kHi.setKey(); }, [kLo, kHi]);
  const onDeleteKey = useCallback(() => { kLo.deleteKey(); kHi.deleteKey(); }, [kLo, kHi]);
  const onDeleteTrack = useCallback(() => { kLo.deleteTrack(); kHi.deleteTrack(); }, [kLo, kHi]);

  return (
    <>
      <QualityRangePad
        value={value}
        onChange={onChange}
        loLabel={loLabel}
        hiLabel={hiLabel}
        headerRight={<KeyframeButton status={combineKeyStatus(kLo.status, kHi.status)} label={`${cap(axis)}`} onClick={onSetKey} onDeleteKey={onDeleteKey} onDeleteTrack={onDeleteTrack} />}
        drawTrack={track ? TRACKS[track] : undefined}
      />
      {hint && <Hint text={hint} />}
    </>
  );
};

export default QualityRangePadConnected;
