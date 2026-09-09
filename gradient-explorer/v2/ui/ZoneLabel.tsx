/**
 * ZoneLabel — the v2 zone label (plans/ge-v2-unified-shell-plan.md §1 V5: "11px
 * uppercase tracked = zone label"). Used for the shelf's RECENT-style strip labels and
 * for the hero's SOURCE / USE side labels where they appear.
 */

import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export const ZoneLabel: React.FC<Props> = ({ children, className = '' }) => (
  <span className={`text-[11px] uppercase tracking-wide text-fg-muted ${className}`}>{children}</span>
);

export default ZoneLabel;
