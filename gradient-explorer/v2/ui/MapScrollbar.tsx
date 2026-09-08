/**
 * MapScrollbar — a slim vertical scrollbar that stands beside the hue × lightness pad and
 * says WHERE THE WALL IS (GE v2 Phase D.2, the owner's walk 2026-09-08: the first cut drew a
 * thumb inside the pad and it "wasn't conveying the right language or reading smoothly as
 * the visible area"). A scrollbar is the one control everyone already reads as "the part
 * you can see, and drag it to move": the thumb spans the lightness range on screen, the
 * pad beside it shows the same range as a lens, and dragging the thumb scrolls the wall.
 *
 * Pure: a range in, a seek out. `range` is [lo, hi] on the pad's Y axis (1 at the top), as
 * the pad and the wall run. `reach` is the part of that axis the wall can actually be
 * scrolled to — the bands that exist; the track outside it is drawn at half opacity
 * (owner, 2026-09-08: "the section of the scrollbar that is not reachable should be at 50%
 * the opacity"). With no `reach` the whole track is reachable (a plain scrollbar).
 */

import React from 'react';

interface Props {
  /** The range on screen, or null for no thumb. */
  range: [number, number] | null;
  /** The reachable part of the axis (the bands that exist); outside it the track dims. */
  reach?: [number, number] | null;
  height: number;
  /** Scroll the wall so this lightness sits at the top of the viewport. Absent = the bar
   *  only indicates (the wall is grouped and a lightness is ambiguous). */
  onSeek?: (light: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  className?: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** The thumb is drawn at the range's EXACT size with the same rounding as the pad's lens, so
 *  the two always line up (owner, 2026-09-08: a 10 px minimum made the thumb overshoot a
 *  band's ~6 px range); it only needs to stay visible, since a press anywhere on the track
 *  seeks. */
const MIN_THUMB = 3;

export const MapScrollbar: React.FC<Props> = ({ range, reach = null, height, onSeek, onSeekStart, onSeekEnd, className = '' }) => {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const grabRef = React.useRef<number>(0); // pointer offset from the thumb's top, in lightness
  const y0 = range ? Math.round((1 - Math.max(range[0], range[1])) * height) : 0;
  const y1 = range ? Math.round((1 - Math.min(range[0], range[1])) * height) : 0;
  const thumbH = Math.max(MIN_THUMB, y1 - y0);
  const thumbTop = Math.max(0, Math.min(height - thumbH, y0));
  const span = range ? Math.abs(range[1] - range[0]) : 0;

  const lightAt = (e: React.PointerEvent): number => {
    const r = trackRef.current!.getBoundingClientRect();
    return clamp01(1 - (e.clientY - r.top) / r.height);
  };

  return (
    <div
      ref={trackRef}
      data-gx-map-scrollbar=""
      className={`relative shrink-0 w-[8px] rounded-full ${reach ? '' : 'bg-line/15'} ${onSeek ? 'cursor-pointer' : ''} ${className}`}
      style={{ height }}
      title={onSeek ? 'Where the wall is — drag to scroll it' : 'Where the wall is'}
      onPointerDown={(e) => {
        if (!onSeek || !range) return;
        e.preventDefault();
        e.stopPropagation();
        const L = lightAt(e);
        const onThumb = L <= Math.max(range[0], range[1]) && L >= Math.min(range[0], range[1]);
        // Grab the thumb where it is; a click on the track centres the thumb there.
        grabRef.current = onThumb ? Math.max(range[0], range[1]) - L : span / 2;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onSeekStart?.();
        onSeek(clamp01(L + grabRef.current));
      }}
      onPointerMove={(e) => {
        if (!onSeek || !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
        onSeek(clamp01(lightAt(e) + grabRef.current));
      }}
      onPointerUp={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
          onSeekEnd?.();
        }
      }}
    >
      {reach && (() => {
        // the track in three parts: unreachable above, reachable, unreachable below
        const rHi = Math.round((1 - Math.max(reach[0], reach[1])) * height);
        const rLo = Math.round((1 - Math.min(reach[0], reach[1])) * height);
        return (
          <>
            {rHi > 0 && <div className="absolute left-0 right-0 top-0 rounded-t-full bg-line/15 opacity-50" style={{ height: rHi }} data-gx-map-unreachable="" />}
            <div className={`absolute left-0 right-0 bg-line/15 ${rHi <= 0 ? 'rounded-t-full' : ''} ${rLo >= height ? 'rounded-b-full' : ''}`} style={{ top: rHi, height: Math.max(0, rLo - rHi) }} />
            {rLo < height && <div className="absolute left-0 right-0 bottom-0 rounded-b-full bg-line/15 opacity-50" style={{ height: height - rLo }} data-gx-map-unreachable="" />}
          </>
        );
      })()}
      {range && (
        <div
          data-gx-pad-marker=""
          className={`absolute left-0 right-0 rounded-full transition-colors ${onSeek ? 'bg-fg/35 hover:bg-fg/55' : 'bg-fg/25'}`}
          style={{ top: thumbTop, height: thumbH }}
        />
      )}
    </div>
  );
};

export default MapScrollbar;
