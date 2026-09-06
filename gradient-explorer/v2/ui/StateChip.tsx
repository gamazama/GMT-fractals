/**
 * StateChip — the v2 state pill (plans/ge-v2-unified-shell-plan.md §1 V3: "Meaning
 * colours are three and each is a *filled* chip with white text: live = green, edited =
 * amber, armed = violet"). Never clickable-looking (no hover/border affordance) — a
 * pill is a STATE, an action is `Act`. `picked` and `snapshot` share one neutral fill
 * since neither carries a hue meaning.
 *
 * The three hues are also exported as `MEANING_OUTLINE` so the thing a chip refers to
 * can carry the same colour as an outline (V3: "the referenced thing carries the colour
 * as an outline — dashed violet on slot B, a green dot on the live tray tab"), e.g.
 * `className={MEANING_OUTLINE.armed}` for a `outline outline-2 outline-dashed` slot.
 *
 * Colour source: live/edited reuse the repo's existing meaning-bearing status tokens
 * (`--ok` green, `--warn` amber — engine/store/colorSchemeStore.ts). `armed` had no
 * token (violet); a fixed `--gx-armed` custom property was added to index.css (see its
 * comment there) since colorSchemeStore's `--secondary` is a user-configurable hue, not
 * a fixed meaning colour.
 */

import React from 'react';

export type ChipKind = 'picked' | 'live' | 'edited' | 'armed' | 'snapshot';

const FILL: Record<ChipKind, string> = {
  picked: 'bg-fg-dim',
  snapshot: 'bg-fg-dim',
  live: 'bg-ok-strong',
  edited: 'bg-warn-strong',
  armed: 'bg-gx-armed',
};

/** The same three hues as a 2px outline, for the thing a chip refers to (V3). */
export const MEANING_OUTLINE: Record<'live' | 'edited' | 'armed', string> = {
  live: 'outline outline-2 outline-ok-strong',
  edited: 'outline outline-2 outline-warn-strong',
  armed: 'outline outline-2 outline-dashed outline-gx-armed',
};

interface Props {
  kind: ChipKind;
  children: React.ReactNode;
  title?: string;
  className?: string;
  /** A chip stays a STATE, not an action — but "edited" is also the return-to-source
   *  gesture (WorkingHero), so this renders a <button> with the same look when passed. */
  onClick?: () => void;
  /** 'fill' = the pill. 'inline' = coloured dot + coloured text, no fill — for a state that
   *  sits INSIDE a heading bar and must read as part of it (owner, 2026-09-06: the pills
   *  "don't seem visually related to anything"). */
  variant?: 'fill' | 'inline';
}

const INK: Record<ChipKind, string> = {
  picked: 'text-fg-muted',
  snapshot: 'text-fg-muted',
  live: 'text-ok-strong',
  edited: 'text-warn-strong',
  armed: 'text-gx-armed',
};
const DOT: Record<ChipKind, string> = {
  picked: 'bg-fg-dim',
  snapshot: 'bg-fg-dim',
  live: 'bg-ok',
  edited: 'bg-warn',
  armed: 'bg-gx-armed',
};

export const StateChip: React.FC<Props> = ({ kind, children, title, className = '', onClick, variant = 'fill' }) => {
  const inline = variant === 'inline';
  const cls = [
    inline
      ? `inline-flex items-center gap-1.5 h-6 text-[13px] whitespace-nowrap select-none ${INK[kind]}`
      : 'inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] font-semibold text-white whitespace-nowrap select-none',
    inline ? '' : FILL[kind],
    onClick ? 'cursor-pointer' : '',
    className,
  ].join(' ');
  if (onClick) {
    return (
      <button type="button" title={title} className={cls} onClick={onClick}>
        {inline && <span className={`w-2 h-2 rounded-full ${DOT[kind]}`} />}
        {children}
      </button>
    );
  }
  return (
    <span title={title} className={cls}>
      {inline && <span className={`w-2 h-2 rounded-full ${DOT[kind]}`} />}
      {children}
    </span>
  );
};

export default StateChip;
