/**
 * ReduceStopsPopup — the Stops editor's "Reduce stops…" (owner, 2026-09-23: "Reduce stops should
 * be in the hero gradient's burger menu and just needs some options for how much to reduce"; a
 * POPUP, not a filter or a face — owner, 2026-09-12). Opened from the editor's ☰ / right-click
 * menu, where the menu was.
 *
 *   • The amounts are ONE `Segmented` of NAMES (Light · Medium · Strong · Maximum — the reducer's
 *     `steps`). No descriptor, no tolerance: HOVERING an amount shows its result on the bar, and
 *     the line under the switch says what it costs in stops ("12 → 7 stops"). Clicking CHOOSES it
 *     (the preview stays); on a phone, where nothing hovers, the choice is the preview.
 *   • An amount that cannot remove a stop is dimmed, and so is one still being worked out — the
 *     editor pulls one result per macrotask, so a long gradient fills the row in over a few frames.
 *   • Apply commits the chosen result (the editor makes it ONE undo step). Cancel, Escape and the
 *     ☰ trigger close it and the bar goes back to exactly what it was — nothing was committed.
 *     NOT a click outside (owner, feedback_ui_surface_design): a stray click must not throw away
 *     a comparison in progress.
 *
 * Pure view: no store, no reducer — the editor hands it names, results and three callbacks.
 * Chrome is the shell's own (`Floating`, `Act`, `Segmented`, all `components/ui`), placed and
 * clamped into the viewport by `AnchoredMenu` on the contextMenu tier, like the menu it replaces.
 * Guard: `npx tsx debug/smoke-ge-reduce.mts` (to be wired as `npm run smoke:ge-reduce`; real clicks
 * in the Gradient Explorer, desktop and phone, dev server on 3400).
 */

import React, { useEffect, useState } from 'react';
import type { GradientConfig } from '../../types';
import { AnchoredMenu, Segmented, Act, Floating } from '../ui';
import type { GradientReduceStepName } from './gradientStopReducer';

export interface ReduceStopsPopupProps {
  anchor: { x: number; y: number };
  /** The named amounts, tightest first. */
  steps: readonly GradientReduceStepName[];
  /** The results so far, by step id — they arrive one at a time. */
  results: Readonly<Record<string, GradientConfig>>;
  /** How many stops the gradient has now. */
  from: number;
  /** Paint this on the bar (`null`: the gradient as it is). */
  onPreview: (config: GradientConfig | null) => void;
  onApply: (config: GradientConfig) => void;
  onCancel: () => void;
}

const stopsIn = (c: GradientConfig | undefined): number => (c && Array.isArray(c.stops) ? c.stops.length : 0);

export const ReduceStopsPopup: React.FC<ReduceStopsPopupProps> = ({ anchor, steps, results, from, onPreview, onApply, onCancel }) => {
  const [chosen, setChosen] = useState<string>('');
  const [hovered, setHovered] = useState<string | null>(null);
  const reduces = (id: string) => {
    const n = stopsIn(results[id]);
    return n > 0 && n < from;
  };
  // a choice the gradient under it no longer supports (it changed while the popup was open)
  const chosenOk = chosen !== '' && reduces(chosen);
  const previewId = hovered ?? (chosenOk ? chosen : null);
  const preview = previewId ? results[previewId] ?? null : null;

  useEffect(() => { onPreview(preview); }, [preview, onPreview]);
  // leaving the popup by any route takes the preview with it
  useEffect(() => () => onPreview(null), [onPreview]);

  const pending = steps.some((s) => !results[s.id]);
  const none = !pending && !steps.some((s) => reduces(s.id));
  const readout = preview
    ? `${from} → ${stopsIn(preview)} stops`
    : none
      ? `No amount removes a stop from these ${from}`
      : `${from} stops`;

  return (
    <AnchoredMenu anchor={anchor} onClose={onCancel} dismissOnOutside={false} padding={8}>
      <Floating
        className="p-3 w-[296px] max-w-[calc(100vw-16px)] flex flex-col gap-2.5"
        data-gx-reduce=""
        data-gx-reduce-pending={pending ? '' : undefined}
      >
        <div className="text-[13px] font-semibold text-fg">Reduce stops</div>
        <Segmented
          name="reduce-amount"
          options={steps.map((s) => {
            const ready = !!results[s.id];
            return {
              id: s.id,
              name: s.name,
              disabled: !ready || !reduces(s.id),
              title: !ready ? undefined : reduces(s.id) ? s.name : `${s.name} keeps all ${from} stops`,
            };
          })}
          value={chosenOk ? chosen : ''}
          onChange={setChosen}
          onPreview={setHovered}
        />
        <div className="text-[12px] text-fg-muted tabular-nums min-h-[16px]" data-gx-reduce-count="">
          {readout}
        </div>
        <div className="flex justify-end gap-2">
          <Act onClick={onCancel} data-gx-reduce-cancel="">Cancel</Act>
          <Act
            primary
            disabled={!chosenOk}
            onClick={() => { if (chosenOk) onApply(results[chosen]); }}
            title={chosenOk ? undefined : 'Choose an amount first'}
            data-gx-reduce-apply=""
          >
            Apply
          </Act>
        </div>
      </Floating>
    </AnchoredMenu>
  );
};

export default ReduceStopsPopup;
