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
 */

import type { ContextMenuItem } from '../../types/help';
import type { GradientStop, GradientConfig, ColorSpaceMode, BlendColorSpace } from '../../types';
import { stopOps } from '../../utils/stopOps';
import { getGradientFavientsBridge } from './gradientFavients';

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
    emit, editAction, setSelectedIds, setBiasHandlesVisible, copy, paste,
  } = ctx;

  const wrap = (fn: () => void) => () => editAction(fn);
  const ids = Array.from(selectedIds);

  const items: ContextMenuItem[] = [];

  // Favients — host-gated. `config` is the editor's current gradient (shared with the
  // header entrance, so both dedup off one signature).
  const favients = getGradientFavientsBridge();
  if (favients) {
    const saved = favients.isFav(config);
    items.push(
      { label: 'Favients', action: () => {}, isHeader: true },
      {
        label: saved ? 'Saved to Favients' : 'Send to Favients',
        checked: saved,
        disabled: saved,
        action: () => favients.add(config),
      },
    );
  }

  items.push(
    { label: 'Actions', action: () => {}, isHeader: true },
    { label: 'Invert Gradient', action: wrap(() => emit(stopOps.invert(knots))) },
    { label: 'Double Knots', action: wrap(() => emit(stopOps.double(knots))) },
    {
      label: 'Distribute Selected',
      disabled: selectedIds.size < 3,
      action: wrap(() => emit(stopOps.distribute(knots, ids))),
    },
    {
      label: 'Delete Selected',
      disabled: selectedIds.size === 0 || knots.length <= 2,
      danger: true,
      action: wrap(() => { emit(stopOps.delete(knots, ids)); setSelectedIds(new Set<string>()); }),
    },

    { label: 'Clipboard', action: () => {}, isHeader: true },
    { label: 'Copy Gradient', action: copy },
    { label: 'Paste Gradient', action: paste },

    { label: 'View', action: () => {}, isHeader: true },
    {
      label: 'Bias Handles',
      checked: isBiasHandlesVisible,
      action: () => setBiasHandlesVisible(!isBiasHandlesVisible),
    },
    {
      label: 'Reset Default',
      danger: true,
      action: wrap(() => { emit(stopOps.default(), 'linear', 'oklab'); setSelectedIds(new Set<string>()); }),
    },

    { label: 'Blend Mode', action: () => {}, isHeader: true },
    { label: 'RGB (Standard)', checked: blendSpace === 'rgb', action: wrap(() => emit(knots, undefined, 'rgb')) },
    { label: 'HSV (Short Path)', checked: blendSpace === 'hsv', action: wrap(() => emit(knots, undefined, 'hsv')) },
    { label: 'HSV (Long Path)', checked: blendSpace === 'hsv-far', action: wrap(() => emit(knots, undefined, 'hsv-far')) },
    { label: 'Oklab (Perceptual)', checked: blendSpace === 'oklab', action: wrap(() => emit(knots, undefined, 'oklab')) },

    { label: 'Output Mode', action: () => {}, isHeader: true },
    { label: 'sRGB (Standard)', checked: colorSpace === 'srgb', action: wrap(() => emit(knots, 'srgb')) },
    { label: 'Linear (Physical)', checked: colorSpace === 'linear', action: wrap(() => emit(knots, 'linear')) },
    { label: 'Inverse ACES', checked: colorSpace === 'aces_inverse', action: wrap(() => emit(knots, 'aces_inverse')) },
  );

  return items;
};
