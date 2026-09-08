/**
 * MapScrollbar — a slim vertical scrollbar that stands beside the hue × lightness pad and
 * says WHERE THE WALL IS (GE v2 Phase D.2, the owner's walk 2026-09-08: the first cut drew a
 * thumb inside the pad and it "wasn't conveying the right language or reading smoothly as
 * the visible area"). A scrollbar is the one control everyone already reads as "the part
 * you can see, and drag it to move": the thumb spans the lightness range on screen, the
 * pad beside it shows the same range as a lens, and dragging the thumb scrolls the wall.
 *
 * Pure: a range in, a seek out. `range` is [lo, hi] lightness (0 = dark, 1 = light); the
 * track runs light at the top to dark at the bottom, as the pad and the wall do.
 */

import React from 'react';

interface Props {
  /** The lightness range on screen, or null for no thumb. */
  range: [number, number] | null;
  height: number;
  /** Scroll the wall so this lightness sits at the top of the viewport. Absent = the bar
   *  only indicates (the wall is grouped and a lightness is ambiguous). */
  onSeek?: (light: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  className?: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const MIN_THUMB = 10;

export const MapScrollbar: React.FC<Props> = ({ range, height, onSeek, onSeekStart, onSeekEnd, className = '' }) => {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const grabRef = React.useRef<number>(0); // pointer offset from the thumb's top, in lightness
  const y0 = range ? (1 - Math.max(range[0], range[1])) * height : 0;
  const y1 = range ? (1 - Math.min(range[0], range[1])) * height : 0;
  const thumbH = Math.max(MIN_THUMB, y1 - y0);
  const thumbTop = Math.min(height - thumbH, y0);
  const span = range ? Math.abs(range[1] - range[0]) : 0;

  const lightAt = (e: React.PointerEvent): number => {
    const r = trackRef.current!.getBoundingClientRect();
    return clamp01(1 - (e.clientY - r.top) / r.height);
  };

  return (
    <div
      ref={trackRef}
      data-gx-map-scrollbar=""
      className={`relative shrink-0 w-[8px] rounded-full bg-line/15 ${onSeek ? 'cursor-pointer' : ''} ${className}`}
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
