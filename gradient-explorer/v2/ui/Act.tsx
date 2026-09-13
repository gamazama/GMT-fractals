/**
 * Act — the v2 action button (plans/ge-v2-unified-shell-plan.md §1 V2: "Radius encodes
 * role... Pill = a state, never an action"). 8 px radius, 26 px tall, 13 px text, a
 * hairline border, no fill. Every clickable thing in the v2 shell that DOES something
 * (Swap, More like this, Curves ▾, Fit from source, Snapshot actions…) renders through
 * this component instead of a hand-rolled `rounded-full`/`rounded-lg` button string, so
 * the shell has exactly one action-button look. `active` is a toggle's pressed state
 * (a subtler tint, still never a pill). `primary` (2026-09-13, the Adjust face's Apply) is
 * the one action a group of Acts is FOR: the same box, tinted with the accent the shell uses
 * for "this one" (a lit toggle, a chosen segment), so it reads first without becoming a
 * second button shape.
 */

import React from 'react';

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'title' | 'className' | 'disabled' | 'children'> {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  /** An icon-only action: a 26 px square, no side padding (the hero's USE buttons). */
  icon?: boolean;
  /** The action the group is for — accent-tinted. */
  primary?: boolean;
}

export const Act: React.FC<Props> = ({ children, onClick, title, active = false, disabled = false, className = '', icon = false, primary = false, ...rest }) => (
  <button
    {...rest}
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    aria-pressed={active || undefined}
    className={[
      'inline-flex items-center gap-1 h-[26px] rounded-lg text-[13px] whitespace-nowrap',
      icon ? 'w-[26px] justify-center px-0' : 'px-3',
      'border transition-colors disabled:opacity-40 disabled:cursor-default',
      primary
        ? 'bg-accent-400/15 border-accent-400/40 text-accent-300 hover:bg-accent-400/25 hover:text-accent-200'
        : active
          ? 'bg-surface-section border-line/40 text-fg'
          : 'bg-surface-section border-line/20 text-fg-muted hover:text-fg hover:border-line/40',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

export default Act;
