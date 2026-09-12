/**
 * InlineToggleButtons — a compact row of INDEPENDENT on/off pill buttons (each
 * toggles separately, active = tinted). GMT's ToggleSwitch only does a single
 * full-width toggle or a single-value segmented selector, so this fills the gap
 * for clusters like the noise targets (lightness / chroma / hue) and the per-slot
 * "reverse" flag — inline, where stacked full-width toggles would look wrong.
 *
 * TWO DIALECTS, chosen by the INPUT SKIN context, exactly as EmbeddedColorPicker does it
 * (@see components/inputs/skin.tsx). `default` is app-gmt's: 11 px text in a small square
 * pill with an accent fill when on. `soft` is Gradient Explorer v2's (owner, 2026-09-12:
 * the Adjust face's noise targets "should use the GX ui"): the shell's own action-button
 * geometry — 26 px tall, 8 px radius, a hairline border and no fill — with the accent tint
 * reserved for ON, which is how the picker's mode toggles in the same shell read. The
 * component is shared, so this is a skin on the master, never a second row of buttons.
 */

import React from 'react';
import { useInputSkin } from '../../components/inputs';

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

export const InlineToggleButtons: React.FC<InlineToggleButtonsProps> = ({ items, onToggle, label, className = '' }) => {
  const soft = useInputSkin() === 'soft';
  return (
    <div className={`flex items-center ${soft ? 'gap-2 flex-wrap' : 'gap-1.5'} ${className}`}>
      {label && (
        <span className={soft ? 'text-[12px] text-fg-muted' : 'text-[10px] text-fg-dim mr-0.5'}>{label}</span>
      )}
      <div className={`flex ${soft ? 'gap-1' : 'gap-0.5'}`}>
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => onToggle(it.key)}
            aria-pressed={it.active}
            className={
              soft
                ? `inline-flex items-center h-[26px] px-2.5 rounded-lg text-[13px] whitespace-nowrap border transition-colors ${
                    it.active
                      ? 'bg-accent-400/15 border-accent-400/40 text-accent-300'
                      : 'bg-surface-section border-line/20 text-fg-muted hover:text-fg hover:border-line/40'
                  }`
                : `px-2 py-0.5 rounded-sm text-[11px] border transition-colors ${
                    it.active
                      ? 'bg-accent-500/25 border-accent-500/40 text-accent-300'
                      : 'bg-line/[0.04] border-line/10 text-fg-muted hover:bg-line/10'
                  }`
            }
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default InlineToggleButtons;
