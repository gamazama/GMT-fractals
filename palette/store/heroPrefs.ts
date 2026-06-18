/**
 * heroPrefs — shared, persisted presentation preferences for the `CanonicalHero` across
 * every gradient mode (Picker / Generator / Image / Stops). Reactive
 * (useSyncExternalStore) so flipping a pref updates ALL mounted heroes at once, and
 * persisted via localStorage so it survives reload. NOT DDFS / no undo — a view
 * preference, like the Favients view mode.
 *
 *   • `enlarged` — the vertical-enlarge tier: the hero strip renders tall (showcase) vs
 *     compact. Defaults to enlarged, because the hero is the single focal "current
 *     gradient" (unlike a wall swatch, it has no dormant resting majority to under-sell).
 *
 * Was fragmented before P2-A Picker follow-up: a local `resultTall` useState in
 * GeneratorStage, a hardcoded height in EditorStage/ImageStage, a bespoke Picker strip.
 * Lifting it here makes "enlarged by default, shared across all heroes" actually true.
 *
 * @see palette/store/favientsPanelPersist.ts (the persisted-view-pref precedent)
 */

import { useSyncExternalStore } from 'react';
import { lsGetJson, lsSetJson } from '../core/storage';
import { createSingleSlot } from '../../store/createSingleSlot';

const LS_KEY = 'gx.hero.prefs';

/** Strip heights (px) for the two enlarge tiers — shared by every hero. */
export const HERO_HEIGHT_TALL = 96;
export const HERO_HEIGHT_BASE = 44;

interface HeroPrefs {
  enlarged: boolean;
}

const DEFAULTS: HeroPrefs = { enlarged: true };

const slot = createSingleSlot<HeroPrefs>({ ...DEFAULTS, ...(lsGetJson<Partial<HeroPrefs> | null>(LS_KEY, null) ?? {}) });
const getSnapshot = (): HeroPrefs => slot.get() ?? DEFAULTS;

const update = (patch: Partial<HeroPrefs>): void => {
  const next = { ...getSnapshot(), ...patch };
  lsSetJson(LS_KEY, next);
  slot.set(next); // new object identity → always notifies
};

/** Flip the shared vertical-enlarge tier (every hero re-renders + the choice persists). */
export const toggleHeroEnlarged = (): void => update({ enlarged: !getSnapshot().enlarged });

export const useHeroPrefs = (): HeroPrefs =>
  useSyncExternalStore(slot.subscribe, getSnapshot, getSnapshot);

/** The hero strip height for the current shared enlarge tier. */
export const useHeroHeight = (): number =>
  useHeroPrefs().enlarged ? HERO_HEIGHT_TALL : HERO_HEIGHT_BASE;
