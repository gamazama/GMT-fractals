/**
 * settingsPanelState — the open/closed slot for the Settings panel.
 *
 * A single boolean seam (createSingleSlot): the System menu's "Settings…" item
 * calls `openSettings()`, the panel host reads `useSettingsOpen()` and renders
 * {@link SettingsPanel}. Decoupled so engine-core hosts the panel without the
 * menu/topbar importing it directly.
 *
 * @invariant Engine-core (store/) — host-agnostic.
 */
import { useSyncExternalStore } from 'react';
import { createSingleSlot } from './createSingleSlot';

const slot = createSingleSlot<boolean>(false);

export const openSettings = (): void => slot.set(true);
export const closeSettings = (): void => slot.set(false);

export const useSettingsOpen = (): boolean =>
    useSyncExternalStore(slot.subscribe, () => slot.get() ?? false, () => false);
