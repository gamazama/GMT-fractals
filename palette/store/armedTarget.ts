/**
 * armedTarget — the v2 "armed eyedropper" for a Build slot (plans/ge-v2-design.md §3
 * "armed targets", §5.3). Transient (NOT DDFS / NOT persisted / no undo), same shape as
 * `heroSelection.ts`'s plain `useSyncExternalStore` module: a single armed slot id, or
 * none.
 *
 * The flow: `WorkingHero`'s "Mix with…" puts the working gradient into Build slot A and
 * arms slot B (`armSlot('B')`); `GradientExplorerV2App`'s pick effect checks
 * `getArmedSlot()` BEFORE its normal "a pick IS a Use" handling — when a slot is armed,
 * the next candidate (a Browse or My Gradients pick) fills that slot via
 * `generatorStore.sendRampToSlot` instead of becoming Working, then the arm clears and
 * the shell returns to Build. Clicking a Build slot directly (`BuildStage` passes
 * `onSlotClick` to `SourceRow`, see `palette/components/GeneratorSourceRow.tsx`) arms
 * that slot the same way, so "click a slot to choose" and "Mix with…" share one
 * mechanism. Esc clears the arm without picking anything.
 */

import { useSyncExternalStore } from 'react';

export type ArmedSlot = 'A' | 'B' | null;

let armed: ArmedSlot = null;
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((l) => l());
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Arm a slot (the next pick fills it), or pass `null` to clear the arm. */
export const armSlot = (slot: ArmedSlot): void => {
  if (armed === slot) return;
  armed = slot;
  emit();
};

/** Imperative read (outside React) — the pick effect checks this first. */
export const getArmedSlot = (): ArmedSlot => armed;

/** Which slot ('A' | 'B') is armed, or null. */
export const useArmedSlot = (): ArmedSlot => useSyncExternalStore(subscribe, () => armed, () => armed);
