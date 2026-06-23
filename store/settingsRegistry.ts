/**
 * settingsRegistry — the app-wide user-preferences registry behind the Settings panel.
 *
 * Each persisted preference (autosave, composition overlay, formula-picker view mode,
 * …) lives in its OWNING subsystem; that subsystem registers a descriptor here so the
 * generic {@link SettingsPanel} can render a control for it without knowing the
 * subsystem. The descriptor carries the control kind + a get/set pair that read/write
 * the real source of truth (a store action, or localStorage via the safeLocal* guard).
 *
 * This is the second genuine consumer of {@link createListRegistry} (after the slot
 * hosts + send-targets) — id-keyed, stable getAll() snapshot, subscribe. Registration
 * happens at module load / install time, before the panel mounts.
 *
 * @invariant Engine-core (store/) — host-agnostic; never imports an app. Apps and
 *   plugins register their prefs into it.
 */

import { useSyncExternalStore, type ReactNode } from 'react';
import { createListRegistry } from './createListRegistry';

export type SettingValue = string | number | boolean;

export type SettingControl =
    | { kind: 'boolean' }
    | { kind: 'number'; min?: number; max?: number; step?: number; unit?: string }
    | { kind: 'enum'; options: ReadonlyArray<{ value: string; label: string }> }
    /** A one-shot button (e.g. "Clear", "Reset") — no value, `set()` runs on click. */
    | { kind: 'action'; buttonLabel: string }
    /** A self-contained block that renders its own controls (e.g. a staged/Apply
     *  form whose immediate-write model doesn't fit a get/set). Spans the full row;
     *  `get`/`set` are unused. */
    | { kind: 'custom'; render: () => ReactNode };

export interface SettingDescriptor {
    /** Unique id; also the registry key. */
    id: string;
    /** Top-level tab the Settings panel files this under (e.g. 'Interface',
     *  'Files', 'Hardware'). Defaults to 'Interface' when omitted. */
    tab?: string;
    /** Group heading within the tab (e.g. 'Colour', 'Camera', 'Autosave'). */
    section: string;
    label: string;
    description?: string;
    control: SettingControl;
    /** Current value. Omit for `action` / `custom` controls. */
    get?: () => SettingValue;
    /** Apply a new value; for `action` controls it's the click handler (no arg).
     *  Omit for `custom` controls (which own their own writes). */
    set?: (value?: SettingValue) => void;
    /** Optional live-update hook so the panel re-reads when the value changes elsewhere. */
    subscribe?: (cb: () => void) => () => void;
    /** Sort order within the section (ascending; default 0). */
    order?: number;
    /** Optional visibility predicate — the panel hides this descriptor when it returns
     *  false (e.g. advanced-only prefs gated on a mode flag). Re-evaluated on each panel
     *  render; omit for always-visible prefs. */
    when?: () => boolean;
}

const registry = createListRegistry<SettingDescriptor>();

/** Register a preference. Returns an unregister thunk. Call at module-load / install. */
export const registerSetting = (d: SettingDescriptor): (() => void) => registry.register(d);
export const getSettings = (): SettingDescriptor[] => registry.getAll();
export const subscribeSettings = registry.subscribe;

/** React snapshot of all registered settings (registration-order, section-grouped by the panel). */
export const useRegisteredSettings = (): SettingDescriptor[] =>
    useSyncExternalStore(registry.subscribe, registry.getAll, registry.getAll);
