/**
 * gradientActions — the SINGLE source of truth for the Stops editor's action menus.
 *
 * Both the editor's header dropdown (`AdvancedGradientEditor`'s utility menu) and its
 * right-click track context menu draw their items from `buildGradientMenu`, so the two
 * stay in lockstep — the dropdown is a literal mirror of the context menu. Add an action
 * once here and it appears in both.
 *
 * Returns engine `ContextMenuItem[]`: the right-click path passes them straight to the
 * StoreCallbacks `openContextMenu`, and the dropdown's `GradientContextMenu` renders the
 * same shape (headers, `checked`, `danger`, `disabled`).
 *
 * The "Send to Favients" item is gated on the host-registered `gradientFavients` bridge —
 * present in every host that mounts the palette suite, absent in a host that registers no
 * bridge. The add dedupes host-side, so it's shown `checked` + disabled once the current
 * gradient is already saved.
 *
 * A RAMP gradient (ADR-0122 — `config` is `stops: []` + `ramp`) has no knots to act on. The
 * builder reads the form off `config` and on a ramp: Invert reverses the TEXELS, the output space
 * rewrites the ramp config's `colorSpace` (never an empty stop list), "Add stops" leads the
 * Actions section when the editor can offer it, and every stop-only item — Double, Distribute,
 * Delete, Bias Handles, the clipboard, the blend modes — is present but disabled, so the menu
 * says what a ramp cannot do rather than silently doing nothing. The rules are in `rampMode.ts`
 * (`editorAffordances`); a stop gradient's menu is unchanged item for item.
 * Guard: `npm run test:gradient-rampmode`.
 *
 * REDUCE STOPS… (2026-09-23) sits under Double Knots, its opposite, whenever the editor has a
 * reducer to run (the `gradientStopReducer` seam — `reduceStops` is omitted otherwise, and the
 * item with it). It OPENS the editor's popup rather than acting, so it is not wrapped in an undo
 * bracket; the popup's Apply is. It is present but disabled, with a `title` saying why, on a ramp
 * (no stops — Add Stops is the way in), on two stops (none to spare), and whenever the editor
 * says so (`reduceStopsBlocked`: the bar is showing something other than these stops).
 */

import type { ContextMenuItem } from '../../types/help';
import type { GradientStop, GradientConfig, ColorSpaceMode, BlendColorSpace } from '../../types';
import { BLEND_SPACE_ORDER, BLEND_SPACE_LABEL } from '../../utils/colorUtils';
import { stopOps } from '../../utils/stopOps';
import { getGradientFavientsBridge } from './gradientFavients';
import { editorAffordances, rampOfEditorValue, reverseRampGradient } from './rampMode';

export interface GradientMenuContext {
  /** The current (position-sorted) stops — the editor's knot array. */
  knots: GradientStop[];
  /** The current gradient as a config (stops + spaces) — the SAME object the editor hands
   *  the header entrance, so the favients dedup signature is built once and both agree. */
  config: GradientConfig;
  selectedIds: Set<string>;
  blendSpace: BlendColorSpace;
  colorSpace: ColorSpaceMode;
  isBiasHandlesVisible: boolean;
  /** Commit edited stops / colour-space / blend-space (the editor's emitChange). */
  emit: (knots: GradientStop[], colorSpace?: ColorSpaceMode, blendSpace?: BlendColorSpace) => void;
  /** Commit a whole config verbatim (the editor's onChange) — how a RAMP gradient's items commit. */
  setConfig: (config: GradientConfig) => void;
  /** "Add stops" on a ramp gradient; omitted when the host offers none (it self-brackets). */
  addStops?: () => void;
  /** Open the editor's Reduce stops popup; omitted when no reducer is registered. */
  reduceStops?: () => void;
  /** Why Reduce Stops… cannot run right now, when the editor knows a reason the menu cannot see. */
  reduceStopsBlocked?: string;
  /** Wrap a discrete mutation in one undo entry (the editor's editAction). */
  editAction: (mutate: () => void) => void;
  setSelectedIds: (ids: Set<string>) => void;
  setBiasHandlesVisible: (visible: boolean) => void;
  /** Clipboard helpers (already self-bracketing in the editor). */
  copy: () => void;
  paste: () => void;
}

/**
 * Build the shared gradient action menu. Pure — reads the host favients bridge at call
 * time, so build it when the menu opens (the context menu builds on right-click; the
 * dropdown builds on render while open) and the `checked`/disabled state is fresh.
 */
export const buildGradientMenu = (ctx: GradientMenuContext): ContextMenuItem[] => {
  const {
    knots, config, selectedIds, blendSpace, colorSpace, isBiasHandlesVisible,
    emit, editAction, setSelectedIds, setBiasHandlesVisible, copy, paste, setConfig, addStops,
    reduceStops, reduceStopsBlocked,
  } = ctx;

  const wrap = (fn: () => void) => () => editAction(fn);
  const ids = Array.from(selectedIds);
  const ramp = rampOfEditorValue(config);
  const can = editorAffordances({ isRamp: !!ramp, knotsStale: false, canAddStops: !!addStops });
  /** Output space: a ramp keeps its texels and changes only the profile. */
  const setOutput = (cs: ColorSpaceMode) => wrap(() => (ramp ? setConfig({ ...ramp, colorSpace: cs }) : emit(knots, cs)));

  const items: ContextMenuItem[] = [];

  // Favients — host-gated. `config` is the editor's current gradient (shared with the
  // header entrance, so both dedup off one signature).
  const favients = getGradientFavientsBridge();
  if (favients) {
    const saved = favients.isFav(config);
    items.push(
      { label: 'My Gradients', action: () => {}, isHeader: true },
      {
        label: saved ? 'Saved to My Gradients' : 'Save to My Gradients',
        checked: saved,
        disabled: saved,
        action: () => favients.add(config),
      },
    );
  }

  items.push(
    { label: 'Actions', action: () => {}, isHeader: true },
    // A ramp's one way into stop editing (addStops self-brackets — no `wrap`).
    ...(can.addStops && addStops ? [{ label: 'Add Stops', action: addStops }] : []),
    { label: 'Invert Gradient', action: wrap(() => (ramp ? setConfig(reverseRampGradient(ramp)) : emit(stopOps.invert(knots)))) },
    { label: 'Double Knots', disabled: !can.stopActions, action: wrap(() => emit(stopOps.double(knots))) },
    ...(reduceStops ? [(() => {
      const why = ramp
        ? 'A 256-colour ramp has no stops to reduce. Add Stops gives it some'
        : knots.length <= 2
          ? 'Two stops are the fewest a gradient can have'
          : reduceStopsBlocked;
      return { label: 'Reduce Stops…', disabled: !!why, title: why, action: reduceStops };
    })()] : []),
    {
      label: 'Distribute Selected',
      disabled: !can.stopActions || selectedIds.size < 3,
      action: wrap(() => emit(stopOps.distribute(knots, ids))),
    },
    {
      label: 'Delete Selected',
      disabled: !can.stopActions || selectedIds.size === 0 || knots.length <= 2,
      danger: true,
      action: wrap(() => { emit(stopOps.delete(knots, ids)); setSelectedIds(new Set<string>()); }),
    },

    // Interpolation of the SELECTED stops (owner review 2026-09-03: the per-stop inspector
    // no longer carries position / bias / interpolation in the v2 hero; the menu does).
    ...(selectedIds.size
      ? (() => {
          const sel = knots.filter((k) => selectedIds.has(k.id));
          const common = sel.every((k) => (k.interpolation ?? 'smooth') === (sel[0].interpolation ?? 'smooth')) ? sel[0].interpolation ?? 'smooth' : null;
          const setInterp = (mode: 'linear' | 'step' | 'smooth') =>
            wrap(() => emit(knots.map((k) => (selectedIds.has(k.id) ? { ...k, interpolation: mode } : k))));
          return [
            { label: sel.length > 1 ? `Interpolation (${sel.length} stops)` : 'Interpolation', action: () => {}, isHeader: true },
            { label: 'Smooth', checked: common === 'smooth', action: setInterp('smooth') },
            { label: 'Linear', checked: common === 'linear', action: setInterp('linear') },
            { label: 'Step', checked: common === 'step', action: setInterp('step') },
          ];
        })()
      : []),
    { label: 'Clipboard', action: () => {}, isHeader: true },
    { label: 'Copy Gradient', disabled: !can.clipboard, action: copy },
    { label: 'Paste Gradient', disabled: !can.clipboard, action: paste },

    { label: 'View', action: () => {}, isHeader: true },
    {
      label: 'Bias Handles',
      checked: isBiasHandlesVisible,
      disabled: !can.stopActions,
      action: () => setBiasHandlesVisible(!isBiasHandlesVisible),
    },
    {
      label: 'Reset Default',
      danger: true,
      action: wrap(() => { emit(stopOps.default(), 'linear', 'oklab'); setSelectedIds(new Set<string>()); }),
    },

    // Names only, no "(Standard)" / "(Perceptual)" descriptors, and BLEND_SPACE_ORDER's
    // order rather than a hand-written one — same list and same labels as the strip row's
    // BlendSpacePicker, from one source. @see utils/colorUtils.ts
    { label: 'Blend Mode', action: () => {}, isHeader: true },
    ...BLEND_SPACE_ORDER.map((sp) => ({
      label: BLEND_SPACE_LABEL[sp],
      checked: blendSpace === sp,
      // inert on a ramp (ADR-0122): nothing is blended between texels
      disabled: !can.blendSpace,
      action: wrap(() => emit(knots, undefined, sp)),
    })),

    { label: 'Output Mode', action: () => {}, isHeader: true },
    { label: 'sRGB (Standard)', checked: colorSpace === 'srgb', action: setOutput('srgb') },
    { label: 'Linear (Physical)', checked: colorSpace === 'linear', action: setOutput('linear') },
    { label: 'Inverse ACES', checked: colorSpace === 'aces_inverse', action: setOutput('aces_inverse') },
  );

  return items;
};
