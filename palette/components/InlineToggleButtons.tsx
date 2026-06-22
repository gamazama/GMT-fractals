/**
 * InlineToggleButtons — a compact row of INDEPENDENT on/off pill buttons (each
 * toggles separately, active = tinted). GMT's ToggleSwitch only does a single
 * full-width toggle or a single-value segmented selector, so this fills the gap
 * for clusters like the noise targets (lightness / chroma / hue) and the per-slot
 * "reverse" flag — inline, where stacked full-width toggles would look wrong.
 */

import React from 'react';

export interface InlineToggleItem {
  key: string;
  label: string;
  active: boolean;
}

interface InlineToggleButtonsProps {
  items: InlineToggleItem[];
  onToggle: (key: string) => void;
  label?: string;
  className?: string;
}

export const InlineToggleButtons: React.FC<InlineToggleButtonsProps> = ({ items, onToggle, label, className = '' }) => (
  <div className={`flex items-center gap-1.5 ${className}`}>
    {label && <span className="text-[10px] text-fg-dim mr-0.5">{label}</span>}
    <div className="flex gap-0.5">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onToggle(it.key)}
          aria-pressed={it.active}
          className={`px-2 py-0.5 rounded-sm text-[11px] border transition-colors ${
            it.active
              ? 'bg-accent-500/25 border-accent-500/40 text-accent-300'
              : 'bg-line/[0.04] border-line/10 text-fg-muted hover:bg-line/10'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  </div>
);

export default InlineToggleButtons;
