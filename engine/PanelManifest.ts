/**
 * PanelManifest — app-level declaration of dock panels.
 *
 * A panel is a first-class thing: an id, a dock location, a composition of
 * features and/or custom components, and optional visibility rules. Features
 * don't declare panels — apps do. One feature can appear in multiple panels;
 * one panel can render many features stacked together; a panel can render a
 * bespoke component instead; a panel can slot custom widgets before/after/
 * between the feature rows.
 *
 * Usage (app boot):
 *
 *   import { applyPanelManifest } from '@engine/PanelManifest';
 *   import { MyPanels } from './panels';
 *   applyPanelManifest(MyPanels);
 *
 * PanelRouter and Dock both read from the registered manifest at render
 * time. Apps may call applyPanelManifest() multiple times (e.g. to swap
 * layouts for a mode switch) — the latest manifest wins.
 */

import type { DockZone, EngineStoreState } from '../types/store';
import { useEngineStore } from '../store/engineStore';

/** Predicate for conditional panel visibility.
 *  - String form reads a top-level boolean field on the store, e.g.
 *    `'advancedMode'`. Dotted paths resolve into feature slices, e.g.
 *    `'audio.isEnabled'`.
 *  - Function form receives the full state and returns a boolean — use
 *    when the check isn't a simple field read. */
export type ShowIfPredicate = string | ((state: EngineStoreState) => boolean);

/** Widgets are components pre-registered in componentRegistry by id. They
 *  render as siblings of the feature panels — not attached to any specific
 *  param. For per-param attachment use the feature-level `customUI` field
 *  (see FeatureSystem.ts). */
export interface PanelWidgets {
    /** Rendered at the top of the panel, above all features. */
    before?: string[];
    /** Rendered at the bottom of the panel, below all features. */
    after?: string[];
    /** Rendered between features. Key is the feature id AFTER which the
     *  listed widgets should appear. */
    between?: Record<string, string[]>;
}

export interface PanelDefinition {
    /** Unique id, also used as the PanelId in the store and the tab
     *  label shown in the dock (unless `label` overrides). */
    id: string;

    /** Override for the tab label. Defaults to `id`. */
    label?: string;

    /** Dock placement. */
    dock: DockZone;

    /** Tab order within the dock. Lower renders first. */
    order: number;

    /** Marks this panel as the default-active tab in its dock. If more
     *  than one manifest entry for the same dock sets `active: true`,
     *  the lowest `order` wins. */
    active?: boolean;

    /** Visibility predicate. When this returns false, the panel is
     *  omitted from the dock's tab bar. Omit for always-visible. */
    showIf?: ShowIfPredicate;

    // --- Content composition — set one of `features` or `component` ---

    /** Feature ids whose AutoFeaturePanel should render stacked in this
     *  panel, in the declared order. Features keep per-param customUI
     *  (feature-level) and per-param conditions intact. */
    features?: string[];

    /** Name of a component registered in componentRegistry to render
     *  verbatim instead of auto-generated feature panels. Use for panels
     *  that don't map to features (Graph / FlowEditor), or when you need
     *  a bespoke layout. `widgets` is ignored when `component` is set —
     *  the custom component owns its whole layout. */
    component?: string;

    /** Panel-level widgets to slot before/after/between features.
     *  Ignored when `component` is set. */
    widgets?: PanelWidgets;

    /** Preserves the "core" flag on PanelState. Core panels can't be
     *  closed via the X button when floating. Defaults to true for
     *  manifest-declared panels. */
    isCore?: boolean;
}

export type PanelManifest = PanelDefinition[];

// ─── Registered manifest (module-scoped) ──────────────────────────────

let _manifest: PanelManifest = [];
const _byId = new Map<string, PanelDefinition>();

/** Get the currently registered manifest. */
export const getPanelManifest = (): PanelManifest => _manifest;

/** Look up a panel by id. Returns undefined if the panel isn't in the
 *  registered manifest. */
export const getPanelDefinition = (id: string): PanelDefinition | undefined =>
    _byId.get(id);

// ─── Visibility evaluation ────────────────────────────────────────────

/** Resolve a ShowIfPredicate against the current state. Missing fields
 *  are treated as false. */
export const evalShowIf = (
    predicate: ShowIfPredicate | undefined,
    state: EngineStoreState,
): boolean => {
    if (predicate === undefined) return true;
    if (typeof predicate === 'function') return !!predicate(state);
    // Dotted path: walk the state. Single segment = top-level field.
    const segments = predicate.split('.');
    let cur: unknown = state as unknown;
    for (const seg of segments) {
        if (cur == null || typeof cur !== 'object') return false;
        cur = (cur as Record<string, unknown>)[seg];
    }
    return !!cur;
};

// ─── Applying the manifest ────────────────────────────────────────────

/** Seed `state.panels` + active tabs from a manifest. Replaces the older
 *  `applyDefaultPanelLayout` scrape-featureRegistry approach.
 *
 *  Merge semantics: manifest entries are added to the in-memory registry
 *  and to `state.panels`. Entries previously seeded by an earlier
 *  applyPanelManifest call or by `addPanel` are preserved. This lets
 *  modules (e.g. fractal-toy's formula loader) register dynamic panels
 *  at module load without racing against the app's setup step.
 *
 *  The active tab per dock is resolved across the combined set:
 *    1. lowest-order panel with `active: true` wins
 *    2. otherwise the current active stays (if still present)
 *    3. otherwise falls back to the lowest-order panel in the dock */
export const applyPanelManifest = (manifest: PanelManifest): void => {
    // Merge definitions into the module-level registry.
    for (const def of manifest) {
        if (!_byId.has(def.id)) _manifest.push(def);
        _byId.set(def.id, def);
    }

    const store = useEngineStore.getState();
    const existingPanels = store.panels ?? {};
    const panels: Record<string, unknown> = { ...existingPanels };

    for (const def of manifest) {
        panels[def.id] = {
            id: def.id,
            location: def.dock,
            order: def.order,
            isCore: def.isCore ?? true,
            // Preserve existing isOpen if the panel was already mounted;
            // otherwise default to false, resolved later by the active-
            // picker pass.
            isOpen:
                (existingPanels[def.id] as { isOpen?: boolean } | undefined)?.isOpen ?? false,
        };
    }

    // Resolve active tab per dock from the merged set.
    const allDefs = Array.from(_byId.values());
    const pickActive = (dock: DockZone, currentActive: string | null): string | null => {
        const inDock = allDefs.filter((d) => d.dock === dock).sort((a, b) => a.order - b.order);
        if (inDock.length === 0) return null;
        const explicit = inDock.find((d) => d.active);
        if (explicit) return explicit.id;
        if (currentActive && _byId.has(currentActive)) return currentActive;
        return inDock[0].id;
    };

    const activeLeft = pickActive('left', store.activeLeftTab);
    const activeRight = pickActive('right', store.activeRightTab);

    // Sync isOpen on the chosen actives.
    for (const [dock, activeId] of [
        ['left', activeLeft],
        ['right', activeRight],
    ] as [DockZone, string | null][]) {
        if (activeId && panels[activeId]) {
            (panels[activeId] as { isOpen: boolean }).isOpen = true;
        }
    }

    useEngineStore.setState({
        panels: panels as never,
        activeLeftTab: (activeLeft ?? null) as never,
        activeRightTab: (activeRight ?? null) as never,
    });
};

/** Append a panel to the registered manifest at runtime. Used by code
 *  that lazily discovers panels — e.g. fractal-toy's formula registry
 *  auto-lifts each formula into a DDFS feature + a tab. The new panel's
 *  PanelState is inserted into the store. Does NOT change the active
 *  tab for its dock unless `def.active` is set and no other panel in
 *  that dock is currently active. */
export const addPanel = (def: PanelDefinition): void => {
    if (_byId.has(def.id)) {
        console.warn(`[PanelManifest] addPanel: "${def.id}" already registered — ignoring`);
        return;
    }
    _manifest = [..._manifest, def];
    _byId.set(def.id, def);

    const store = useEngineStore.getState();
    const currentActive = def.dock === 'left' ? store.activeLeftTab : store.activeRightTab;
    const shouldBecomeActive = def.active && !currentActive;

    useEngineStore.setState((s) => ({
        panels: {
            ...s.panels,
            [def.id]: {
                id: def.id,
                location: def.dock,
                order: def.order,
                isCore: def.isCore ?? true,
                isOpen: shouldBecomeActive,
            } as never,
        },
        ...(shouldBecomeActive
            ? def.dock === 'left'
                ? { activeLeftTab: def.id as never }
                : { activeRightTab: def.id as never }
            : {}),
    }));
};
