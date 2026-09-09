/**
 * FirstRunBrightness — the one thing the shell asks before you start (GE v2 §8b item 3).
 *
 * Brightness is the only setting where the default cannot be got right for everyone: the
 * app is a colour tool, and how bright its chrome is decides how the colours inside it
 * read. v2 used to answer that silently — the first boot applied the Light Grey preset and
 * wrote a flag — which is a guess made on the user's behalf, invisibly, at the moment they
 * are least able to connect the interface's look to a setting they have never seen.
 *
 * So it asks instead, once, and shows the answer changing as it is chosen: the controls are
 * live (they ARE Settings' own, not copies — `ThemePresetPicker` + `BrightnessControl`), so
 * the whole interface repaints behind the card while the slider moves. That is why the
 * backdrop is transparent rather than the usual dim: a veil over the app would bias the
 * very judgement the dialogue exists to collect.
 *
 * Three rules it follows, all of them about NOT asking:
 *  1. It opens on Light Grey already applied, so dismissing it — Escape, Done, anything —
 *     leaves exactly the theme the silent seed used to produce. Doing nothing is not a
 *     worse outcome than before.
 *  2. It never asks a user who already has a brightness. The theme axes are SHARED across
 *     the GMT apps (`gmt.brightness`, engine/store/colorSchemeStore.ts), so someone
 *     arriving from app-gmt has already chosen; v2 keeps that choice and stays quiet. This
 *     also fixes the silent seed's real bug — it OVERRODE such a user's brightness on the
 *     first v2 boot, which is the one case where the guess was not merely invisible but
 *     wrong.
 *  3. It asks once per browser, and the flag is written before the card renders, so a
 *     refresh mid-decision does not ask again.
 *
 * @see gradient-explorer/v2/main.tsx (`decideFirstRunBrightness`, which owns 1-3)
 */
import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ThemePresetPicker, BrightnessControl } from '../../components/ThemeControls';

export const FirstRunBrightness: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const close = () => { setOpen(false); onDone(); };
  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy="gx-first-run-title"
      // transparent, not the default dim: the interface behind the card is the preview.
      backdropClassName="bg-transparent"
    >
      <div className="w-[340px] rounded-xl border border-line/20 bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.45)] p-4">
        <h2 id="gx-first-run-title" className="text-[13px] font-semibold text-fg mb-1">
          How bright should the interface be?
        </h2>
        <p className="text-[11px] text-fg-tertiary leading-relaxed mb-3">
          This changes the app around your gradients, not the gradients themselves. Pick
          whatever lets you judge colour best — you can change it any time in Settings.
        </p>
        <div className="mb-2"><ThemePresetPicker /></div>
        <BrightnessControl />
        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={close}
            autoFocus
            className="px-3 py-1 rounded text-[11px] border border-accent/60 bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    </Modal>
  );
};
