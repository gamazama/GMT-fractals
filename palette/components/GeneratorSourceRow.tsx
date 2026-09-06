/**
 * GeneratorSourceRow — the Generator's per-slot source strip, LIFTED out of
 * `GeneratorStage.tsx` (2026-09-03, GE v2 S3) so the v2 `BuildStage` can reuse it
 * without a parallel copy. GeneratorStage keeps importing `SourceRow` from here — its
 * rendered output is unchanged (same component, same props, same JSX), so the old
 * shell and app-gmt's Generator surface render byte-for-byte as before.
 *
 * A CanonicalHero-style DRAG SOURCE + pick surface (P2 N4). Click PICKS the slot's
 * gradient into the Generator surface's hero selection (opens the dock so it can be
 * sent to another target — the other slot, Stops, Favients…); drag morphs the avatar
 * out onto a target. It is ALSO the registered `gen-a`/`gen-b` DROP target — the
 * canonical dropbox over `data-gx-target` (DropTargetLayer) handles drops, so the slot
 * needs no bespoke drop wiring in the OLD shell. The old click→catalog dropdown is
 * GONE: sources are set by dragging / sending a gradient onto the slot (or via the
 * Picker → Generator·A/B), per the canonical model. The slot-mod dials open from the
 * ⚙ button to the right.
 *
 * v2 additions (ADDITIVE, optional, default off so GeneratorStage's rendering is
 * unaffected): `onSlotClick` overrides the click behaviour entirely — the v2
 * `BuildStage` passes a handler that ARMS the slot (plans/ge-v2-design.md §3 "armed
 * targets") instead of the old shell's `setHeroPick` dock flow, because v2 has no dock
 * to open and `setHeroPick` would otherwise trip the v2 shell's "a pick IS a Use"
 * effect (any `useActiveHeroSelection()` change is treated as picking a new Working
 * gradient — a Build slot click must never do that). `armed` shows the dashed
 * "pick a gradient for X" cue while this slot is the armed target.
 */

import React, { useMemo } from 'react';
import { GradientStrip } from './GradientStrip';
import { GeneratorSlotMods } from './GeneratorSlotMods';
import { buildPresetCatalog } from '../core/presetCatalog';
import { setFavientDrag, beginCustomAvatarDrag } from '../core/favientDnd';
import { fitRampToStops } from '../core/stopFit';
import { favientSig } from '../store/favientsStore';
import { setDragOrigin } from '../store/dragVisual';
import { setHeroPick, setHeroDrag, useHeroPick, useActiveHeroMode, useHeroOptionsOpen } from '../store/heroSelection';

// V8 gradient-bar spec (plans/ge-v2-unified-shell-plan.md §1), inlined rather than
// imported from `gradient-explorer/v2/ui/bar.ts`: `palette/**` must never import an app
// (.claude/rules/palette.md "the boundary that IS real"), and `gradient-explorer/` is an
// app. Keep in sync with that file by hand until the spec moves to a shared, app-free home.
const barClass = (armed: boolean, selected: boolean): string => {
  const base = 'rounded ring-1 ring-line/20 transition-[outline-color]';
  if (armed) return `${base} outline outline-2 outline-dashed outline-gx-armed`;
  if (selected) return `${base} outline outline-2 outline-accent-400`;
  return `${base} hover:outline hover:outline-2 hover:outline-fg`;
};

export const SourceRow: React.FC<{
  which: 'A' | 'B';
  ramp: { r: number; g: number; b: number }[];
  preset: number;
  height: number;
  dimmed?: boolean;
  /** v2 Build only: replaces the click behaviour (arm this slot) — see file header. */
  onSlotClick?: () => void;
  /** v2 Build only: this slot is the current armed target. */
  armed?: boolean;
}> = ({ which, ramp, preset, height, dimmed, onSlotClick, armed }) => {
  const name = useMemo(() => buildPresetCatalog()[preset]?.name ?? '—', [preset]);
  const targetId = which === 'A' ? 'gen-a' : 'gen-b';
  // The slot's current gradient as a config so it can be picked/dragged like any hero.
  // Derived from the displayed source ramp (covers both catalog presets and ramps loaded
  // via a drop); favientSig keys the pick so the selected ring is stable across renders.
  const config = useMemo(() => fitRampToStops(ramp, { maxStops: 24 }), [ramp]);
  const key = useMemo(() => favientSig(config), [config]);
  const payload = useMemo(() => ({ config, name, source: `Generator · ${which}` }), [config, name, which]);

  // Selected when this slot is the Generator surface's ACTIVE pick. The surface pick is
  // shared with the result hero (one per surface), so picking a slot deselects the result
  // and vice-versa — exactly one thing is "in hand" in the Generator at a time.
  const surfacePick = useHeroPick('generator');
  const activeMode = useActiveHeroMode();
  const optionsOpen = useHeroOptionsOpen();
  const selected = surfacePick?.key === key && activeMode === 'generator' && optionsOpen;

  return (
    // When curves drive the output the source is FROZEN: dimmed AND non-interactive
    // (pointer-events-none) so a click/drag that would silently do nothing can't read
    // as broken. The host shows a "bake/reset to edit sources" hint above.
    <div className={`relative min-w-0 transition-opacity ${dimmed ? 'opacity-40 pointer-events-none select-none' : ''}`} aria-disabled={dimmed || undefined}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[10px] uppercase tracking-wide text-fg-dim w-14 shrink-0">Source {which}</span>
        <span className="text-[11px] text-fg-secondary truncate">{name}</span>
        <span className="ml-auto text-[10px] shrink-0 text-fg-dim">{armed ? 'picking…' : 'click to select · drag to place'}</span>
      </div>
      {/* gradient (the pick/drag surface + gen-a/gen-b drop anchor) + the slot-mods trigger */}
      <div className="flex items-center gap-2">
        {/* data-gx-selectable: clicking the slot opens the dock without the global click-away
            closing it (same as CanonicalHero). draggable: morph an avatar out onto a target. */}
        <button
          data-gx-target={targetId}
          data-gx-selectable=""
          draggable
          onDragStart={(e) => {
            setFavientDrag(e.dataTransfer, payload);
            beginCustomAvatarDrag(e.dataTransfer);
            setDragOrigin(e.currentTarget.getBoundingClientRect()); // morph the avatar out of the strip
            setHeroDrag({ mode: 'generator', key, payload, selfTargetId: targetId });
          }}
          onClick={(e) => {
            if (onSlotClick) {
              onSlotClick();
              return;
            }
            setDragOrigin(e.currentTarget.getBoundingClientRect()); // in-hand avatar morphs from the strip
            setHeroPick({ mode: 'generator', key, payload, selfTargetId: targetId });
          }}
          title={
            armed
              ? `Picking for slot ${which} — pick a gradient on Browse, or Esc to cancel`
              : `Source ${which} — click to select, drag onto a target, or drop a gradient here to load it`
          }
          className={`relative block flex-1 min-w-0 transition cursor-grab active:cursor-grabbing ${barClass(!!armed, selected)}`}
        >
          <GradientStrip ramp={ramp} height={height} />
          {armed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-[11px] text-accent-300 pointer-events-none rounded-sm">
              pick a gradient for {which}
            </div>
          )}
        </button>
        <GeneratorSlotMods which={which} />
      </div>
    </div>
  );
};

export default SourceRow;
