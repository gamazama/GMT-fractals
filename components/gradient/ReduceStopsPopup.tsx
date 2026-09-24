/**
 * ReduceStopsPopup — the Stops editor's "Reduce stops…" (owner, 2026-09-23: "Reduce stops should
 * be in the hero gradient's burger menu"; a POPUP, not a filter or a face — owner, 2026-09-12).
 * Opened from the editor's ☰ / right-click menu, where the menu was.
 *
 *   • A STOP-COUNT SLIDER over every count from the gradient's own down to two (owner, 2026-09-24:
 *     "more granular … go to 2 stops"; ADR-0128). Dragging it shows that version on the bar; the
 *     line under it says what it costs ("12 → 7 stops") and names the blend mode when the version
 *     is in another one ("12 → 7 stops · RGB" — owner: "readout naming it is fine").
 *   • The named amounts (Light · Medium · Strong · Maximum — the reducer's `steps`) stay as ONE
 *     `Segmented` of quick picks: each jumps the slider to where its tolerance lands. HOVERING one
 *     previews it; clicking CHOOSES it, and a chosen name FOLLOWS its count while the search is
 *     still improving the plan (a dragged count stays put). An amount that cannot remove a stop is
 *     dimmed; a count the slider lands on that a name also lands on lights that name.
 *   • "Try other blend modes" (on by default, remembered by the editor): the search behind the
 *     plan. While it runs, the checkbox wears a small pulse; the slider works from the first plan.
 *   • Apply commits the chosen version (the editor makes it ONE undo step). Cancel, Escape and the
 *     ☰ trigger close it and the bar goes back to exactly what it was — nothing was committed.
 *     NOT a click outside (owner, feedback_ui_surface_design): a stray click must not throw away a
 *     comparison in progress.
 *
 * Pure view: no store, no reducer — the editor hands it names, a plan and callbacks. Chrome is the
 * shell's own (`Floating`, `Act`, `Segmented` from `components/ui`, and `BaseSlider` — the
 * store-free half of the app's Slider, so dragging it opens no undo bracket), placed and clamped
 * into the viewport by `AnchoredMenu` on the contextMenu tier, like the menu it replaces.
 * Guard: `npm run smoke:ge-reduce` (real pointer in the Gradient Explorer, desktop and phone, dev
 * server on 3400).
 */

import React, { useEffect, useState } from 'react';
import type { BlendColorSpace, GradientConfig } from '../../types';
import { AnchoredMenu, Segmented, Act, Floating } from '../ui';
import { BaseSlider } from '../Slider';
import { BLEND_SPACE_LABEL } from '../../utils/colorUtils';
import type { GradientReducePlan, GradientReduceStepName } from './gradientStopReducer';

export interface ReduceStopsPopupProps {
  anchor: { x: number; y: number };
  /** The named amounts, tightest first. */
  steps: readonly GradientReduceStepName[];
  /** The plan so far (null until the first arrives). */
  plan: GradientReducePlan | null;
  /** How many stops the gradient has now. */
  from: number;
  /** The gradient's own blend mode — a version in another one says so. */
  blendSpace: BlendColorSpace;
  /** "Try other blend modes". */
  searchBlend: boolean;
  onSearchBlend: (on: boolean) => void;
  /** Paint this on the bar (`null`: the gradient as it is). */
  onPreview: (config: GradientConfig | null) => void;
  onApply: (config: GradientConfig) => void;
  onCancel: () => void;
}

/** What the person chose: a named amount (which follows the plan) or a count (which stays). */
type Pick = { step: string } | { count: number } | null;

export const ReduceStopsPopup: React.FC<ReduceStopsPopupProps> = ({
  anchor, steps, plan, from, blendSpace, searchBlend, onSearchBlend, onPreview, onApply, onCancel,
}) => {
  const [pick, setPick] = useState<Pick>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const stepCount = (id: string): number => plan?.steps[id] ?? from;
  const reduces = (id: string) => stepCount(id) < from;
  const versionAt = (k: number): GradientConfig | null => (plan && k >= 2 && k < from ? plan.byCount[k] ?? null : null);

  const count = !pick ? from : 'step' in pick ? stepCount(pick.step) : Math.min(from, pick.count);
  const chosen = versionAt(count);
  const previewCount = hovered !== null && reduces(hovered) ? stepCount(hovered) : count;
  const preview = versionAt(previewCount);

  useEffect(() => { onPreview(preview); }, [preview, onPreview]);
  // leaving the popup by any route takes the preview with it
  useEffect(() => () => onPreview(null), [onPreview]);

  const mode = preview && preview.blendSpace && preview.blendSpace !== blendSpace ? ` · ${BLEND_SPACE_LABEL[preview.blendSpace]}` : '';
  const readout = preview ? `${from} → ${previewCount} stops${mode}` : `${from} stops`;
  const lit = pick && 'step' in pick ? pick.step : steps.find((s) => reduces(s.id) && stepCount(s.id) === count)?.id ?? '';

  return (
    <AnchoredMenu anchor={anchor} onClose={onCancel} dismissOnOutside={false} padding={8}>
      <Floating
        className="p-3 w-[296px] max-w-[calc(100vw-16px)] flex flex-col gap-2.5"
        data-gx-reduce=""
        data-gx-reduce-pending={!plan || plan.pending ? '' : undefined}
      >
        <div className="text-[13px] font-semibold text-fg">Reduce stops</div>
        <Segmented
          name="reduce-amount"
          options={steps.map((s) => ({
            id: s.id,
            name: s.name,
            disabled: !plan || !reduces(s.id),
            title: !plan ? undefined : reduces(s.id) ? s.name : `${s.name} keeps all ${from} stops`,
          }))}
          value={lit}
          onChange={(id) => setPick({ step: id })}
          onPreview={setHovered}
        />
        <div data-gx-reduce-slider="">
          <BaseSlider
            dense
            label="Stops"
            value={count}
            min={2}
            max={from}
            hardMin={2}
            hardMax={from}
            step={1}
            disabled={!plan}
            onChange={(v) => setPick({ count: Math.max(2, Math.min(from, Math.round(v))) })}
          />
        </div>
        <div className="text-[12px] text-fg-muted tabular-nums min-h-[16px]" data-gx-reduce-count="">
          {readout}
        </div>
        <label className="flex items-center gap-2 text-[12px] text-fg-muted select-none" data-gx-reduce-search="">
          <input type="checkbox" checked={searchBlend} onChange={(e) => onSearchBlend(e.target.checked)} />
          Try other blend modes
          {searchBlend && plan?.pending && <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" aria-hidden="true" />}
        </label>
        <div className="flex justify-end gap-2">
          <Act onClick={onCancel} data-gx-reduce-cancel="">Cancel</Act>
          <Act
            primary
            disabled={!chosen}
            onClick={() => { if (chosen) onApply(chosen); }}
            title={chosen ? undefined : 'Choose an amount first'}
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
