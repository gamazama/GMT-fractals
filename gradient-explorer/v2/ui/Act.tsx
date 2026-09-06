/**
 * Act — the v2 action button (plans/ge-v2-unified-shell-plan.md §1 V2: "Radius encodes
 * role... Pill = a state, never an action"). 8 px radius, 26 px tall, 13 px text, a
 * hairline border, no fill. Every clickable thing in the v2 shell that DOES something
 * (Swap, More like this, Curves ▾, Fit from source, Snapshot actions…) renders through
 * this component instead of a hand-rolled `rounded-full`/`rounded-lg` button string, so
 * the shell has exactly one action-button look. `active` is a toggle's pressed state
 * (a subtler tint, still never a pill).
 */

import React from 'react';

interface Props {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Act: React.FC<Props> = ({ children, onClick, title, active = false, disabled = false, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    aria-pressed={active || undefined}
    className={[
      'inline-flex items-center gap-1 h-[26px] px-3 rounded-lg text-[13px] whitespace-nowrap',
      'border transition-colors disabled:opacity-40 disabled:cursor-default',
      active
        ? 'bg-surface-section border-line/40 text-fg'
        : 'bg-surface-section border-line/20 text-fg-muted hover:text-fg hover:border-line/40',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

export default Act;
