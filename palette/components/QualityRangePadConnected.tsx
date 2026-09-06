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
 *
 * `hints`/`keyframes` (ge-v2-unified-shell-plan.md §4 Phase A, V4 "one slider"): forwarded
 * automatically by AutoFeaturePanel (both the app-gmt and GX Filters popovers mount this via
 * the same `paletteFilters` customUI entries, so both receive them — there is no separate
 * per-host prop, since `palette/features/paletteFilters.ts` is out of this phase's scope).
 * `keyframes={false}` also switches QualityRangePad to the compact `variant="row"` V4 anatomy
 * (label · track · value, no boxed header, no diamond) — the two are coupled here because a
 * host with no timeline (v2) is also the host that wants the minimal row; a host that still
 * has the diamond (app-gmt via a plain AutoFeaturePanel mount, `keyframes` defaulting true)
 * keeps today's boxed-header card look untouched. `hints="tooltip"` puts `hint` on the row's
 * `title` instead of the <Hint> block; `hints="none"` drops it.
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
  drawHueTrack,
} from '../../components/QualityRangePad';

const TRACKS: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {
  lightness: drawLightnessTrack,
  chroma: drawChromaTrack,
  warmth: drawWarmthTrack,
  complexity: drawComplexityTrack,
  rainbow: drawRainbowTrack,
  hue: drawHueTrack,
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface AxisProps {
  axis: string;
  loLabel?: string;
  hiLabel?: string;
  track?: string;
  hint?: string;
  /** Forwarded by AutoFeaturePanel — see top-of-file JSDoc. */
  hints?: 'inline' | 'tooltip' | 'none';
  keyframes?: boolean;
  /** Explicit chrome; overrides the keyframes-derived choice. 'strip' = bare track. */
  variant?: 'default' | 'row' | 'strip';
  /** Track height in px (strip: 12 reads as a picker's saturation slider). */
  height?: number;
  /** Paint override — e.g. the saturation strip painted toward the picker window's average colour. */
  drawTrack?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
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
  hints = 'inline',
  keyframes = true,
  variant,
  height,
  drawTrack,
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

  const rowVariant = !keyframes; // no timeline → the compact V4 row anatomy (see JSDoc)
  const tooltipTitle = hints === 'tooltip' ? hint : undefined;
  return (
    <div title={tooltipTitle}>
      <QualityRangePad
        value={value}
        onChange={onChange}
        loLabel={loLabel}
        hiLabel={hiLabel}
        variant={variant ?? (rowVariant ? 'row' : 'default')}
        height={height}
        headerRight={keyframes ? <KeyframeButton status={combineKeyStatus(kLo.status, kHi.status)} label={`${cap(axis)}`} onClick={onSetKey} onDeleteKey={onDeleteKey} onDeleteTrack={onDeleteTrack} /> : undefined}
        drawTrack={drawTrack ?? (track ? TRACKS[track] : undefined)}
      />
      {hints === 'inline' && hint && <Hint text={hint} />}
    </div>
  );
};

export default QualityRangePadConnected;
