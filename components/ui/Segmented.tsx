/**
 * Segmented — the app's ONE joined switch.
 *
 * A row of options sharing a single border with the active one filled: the shape the palette
 * wears for Even / Perceptual / Stops, the extract face for Dominant / Tones / Path, and now
 * the function tool for its wave shapes and apply modes (owner, 2026-09-12: "in general the
 * switches need to follow the same joined style as Even/Perceptual/Stops").
 *
 * It existed as three hand-rolled copies of the same nine Tailwind classes before this, which
 * is how the function tool ended up with five separately-bordered boxes and a divider instead:
 * there was nothing to reach for. One component, so a switch now looks like a switch by
 * construction rather than by everyone remembering the same string.
 *
 * ON A PHONE IT COLLAPSES TO ONE BUTTON that shows the current option and advances on tap
 * (owner, 2026-09-11: "click to switch on a single button to save space"; again 2026-09-12
 * for the wave shapes). `cycle` is the caller's call, not a media query in here — this file
 * is a pure primitive under `components/ui/**` and must not read the store, and the phone
 * predicate (`useIsPhone`) does. The title names what the NEXT tap gives, which is the only
 * way a one-button switch can advertise that it has more in it.
 *
 * REPEAT — clicking the option that is already on. The wave's Noise shape draws a new seed
 * that way (there is no dice button; the glyph is the dice). A cycle button has no such click,
 * so `repeat` fires on ARRIVAL there instead: cycling onto Noise draws afresh. Without that
 * the phone simply loses the feature, and a lap of the cycle is a fair price for a reseed.
 *
 * Glyph options pass `label` (an SVG) and keep `name` as the word — titles, aria and the
 * cycle button's "tap for X" all read `name`, so a wordless control is still announced.
 */

import React from 'react';

export interface SegmentedOption<T extends string | number> {
  id: T;
  /** The word for this option: shown unless `label` overrides it, and ALWAYS what a title,
   *  a screen reader and the cycle button's "tap for …" say. */
  name: string;
  /** A glyph to show instead of the word. */
  label?: React.ReactNode;
  /** The long tooltip. Defaults to `name`. */
  title?: string;
  /** Clicking this option while it is already on does something of its own (a reseed). */
  repeat?: boolean;
  /** Tooltip for that second click, when it differs. */
  repeatTitle?: string;
}

export interface SegmentedProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Clicking (or cycling onto) an option marked `repeat`. */
  onRepeat?: (id: T) => void;
  /** ONE button that advances instead of a row — the phone layout. */
  cycle?: boolean;
  /** Segment padding. Words want `px-2`; a glyph wants a squarer box. */
  pad?: string;
  /** Names the group for smokes and for the accessibility tree. */
  name?: string;
  className?: string;
}

const ON = 'bg-accent-400/15 text-accent-300';
const OFF = 'text-fg-muted hover:text-fg';

export function Segmented<T extends string | number>({
  options, value, onChange, onRepeat, cycle = false, pad = 'px-2', name, className = '',
}: SegmentedProps<T>): React.ReactElement | null {
  if (options.length === 0) return null;
  const i = Math.max(0, options.findIndex((o) => o.id === value));
  const here = options[i];

  const hit = (o: SegmentedOption<T>, wasOn: boolean) => {
    if (wasOn) {
      if (o.repeat) onRepeat?.(o.id);
      return;
    }
    onChange(o.id);
    // A cycle button cannot be clicked while already on, so `repeat` fires on arrival there.
    if (cycle && o.repeat) onRepeat?.(o.id);
  };

  if (cycle) {
    const next = options[(i + 1) % options.length];
    return (
      <button
        type="button"
        data-seg-group={name}
        data-seg={String(here.id)}
        aria-label={name ? `${name}: ${here.name}` : here.name}
        /* Never `repeatTitle` here: a cycle button's tap ADVANCES, so "click again for another
           draw" would describe a gesture this button does not have. The repeat is advertised
           on the option it leads TO instead, which is where it actually happens. */
        title={`${here.title ?? here.name} — tap for ${next.name}${next.repeat ? ', drawn afresh' : ''}`}
        className={`shrink-0 inline-flex items-center justify-center gap-1 ${pad} h-7 text-[13px] border border-line/20 rounded-lg whitespace-nowrap ${ON} ${className}`}
        onClick={() => hit(next, false)}
      >
        {here.label ?? here.name}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={name}
      data-seg-group={name}
      className={`shrink-0 inline-flex border border-line/20 rounded-lg overflow-hidden ${className}`}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={String(o.id)}
            type="button"
            data-seg={String(o.id)}
            aria-pressed={on}
            aria-label={o.name}
            title={on && o.repeat ? o.repeatTitle ?? o.title ?? o.name : o.title ?? o.name}
            className={`inline-flex items-center justify-center ${pad} h-7 text-[13px] transition-colors ${on ? ON : OFF}`}
            onClick={() => hit(o, on)}
          >
            {o.label ?? o.name}
          </button>
        );
      })}
    </div>
  );
}

export default Segmented;
