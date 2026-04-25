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
 *  (see FeatureSystem.ts).
 *
 *  This shorthand is preserved for simple panels. Richer layouts (section
 *  headers, widgets-with-props, conditional sub-blocks) should use the
 *  `items` field on PanelDefinition instead. */
export interface PanelWidgets {
    /** Rendered at the top of the panel, above all features. */
    before?: string[];
    /** Rendered at the bottom of the panel, below all features. */
    after?: string[];
    /** Rendered between features. Key is the feature id AFTER which the
     *  listed widgets should appear. */
    between?: Record<string, string[]>;
}

/** A single render unit inside a panel's `items` array. The PanelRouter
 *  walks `items` in order and emits one node per entry.
 *
 *  This unified shape replaces the older (features[] + widgets.before/
 *  between/after) split for panels that need richer compositions —
 *  multiple section headers, widgets that take props, conditional
 *  sub-blocks. The shorthand path stays for trivial panels.
 *
 *  Layout patterns expressible with `items`:
 *
 *    Section labels — { type: 'section', label: 'Optics' }
 *    Widget with props — { type: 'widget', id: 'navigation-controls',
 *                          props: { fitScale: 0.7 } }
 *    Group-filtered feature — { type: 'feature', id: 'optics',
 *                               groupFilter: 'surface' }
 *    Whitelist a few params — { type: 'feature', id: 'lighting',
 *                               whitelistParams: ['shadows', 'shadowSoftness'] }
 *    Conditional sub-block — any item type can carry `showIf`. */
/** Help-system fields shared by every PanelItem variant. The wrapper
 *  PanelRouter emits around the item carries `data-help-id={helpId}`
 *  when set, so right-click contextual menus pick it up via the
 *  existing `collectHelpIds` DOM walk. */
interface PanelItemHelp {
    /** data-help-id attached to the item's wrapper. Used when the
     *  panel groups things the underlying feature doesn't know about
     *  (e.g. an Effects roll-up that aggregates multiple features). */
    helpId?: string;
}

export type PanelItem =
    | (PanelItemHelp & {
          type: 'feature';
          id: string;
          /** Render only the params in this DDFS group. Other groups on
           *  the same feature are silently skipped — useful when one
           *  feature shows up in multiple sections of the same panel. */
          groupFilter?: string;
          /** Render only these param keys (mutually exclusive with
           *  groupFilter). Lets a panel cherry-pick a few sliders out
           *  of a larger feature. */
          whitelistParams?: string[];
          /** Skip these param keys (combines with the other filters). */
          excludeParams?: string[];
          /** Optional Tailwind classes appended to the AutoFeaturePanel. */
          className?: string;
          /** Per-item visibility — re-evaluated on every render. */
          showIf?: ShowIfPredicate;
      })
    | (PanelItemHelp & {
          type: 'widget';
          id: string;
          props?: Record<string, unknown>;
          showIf?: ShowIfPredicate;
      })
    | (PanelItemHelp & {
          type: 'section';
          label: string;
          showIf?: ShowIfPredicate;
      })
    | (PanelItemHelp & {
          type: 'separator';
          showIf?: ShowIfPredicate;
      })
    | (PanelItemHelp & {
          /** A roll-up group with a clickable label. Children render
           *  inside an animated container; closed by default unless
           *  `defaultOpen: true`. Children can be any PanelItem,
           *  including nested collapsibles. */
          type: 'collapsible';
          label: string;
          items: PanelItem[];
          defaultOpen?: boolean;
          showIf?: ShowIfPredicate;
      })
    | (PanelItemHelp & {
          /** A vertical accordion with optional exclusive groups.
           *  Mirrors GMT's coloring-panel layer pattern (Layer 1 +
           *  Layer 2 mutually exclusive, Noise independent) without
           *  app-specific code. See engine/components/Accordion.tsx
           *  for behavior details. */
          type: 'accordion';
          sections: PanelAccordionSection[];
          showIf?: ShowIfPredicate;
      });

/** One section inside a `type: 'accordion'` PanelItem. */
export interface PanelAccordionSection {
    id: string;
    label: string;
    /** Help topic id for the section as a whole. Emitted as
     *  `data-help-id` on the section wrapper. */
    helpId?: string;
    /** Items rendered when the section is open. */
    items: PanelItem[];
    /** Optional widget id rendered on the right side of the header
     *  (gradient strip preview, color swatch, etc). The widget is
     *  pulled from componentRegistry; receives (state, actions). */
    headerWidget?: string;
    /** Optional small text shown next to the (dimmed) label when the
     *  section is collapsed and `activePredicate` resolves to false.
     *  Mirrors GMT's "off" indicator on Layer 2 / Noise headers. */
    closedBadge?: string;
    /** When this resolves to false, the header label dims and the
     *  closedBadge (if any) is shown next to it. */
    activePredicate?: ShowIfPredicate;
    /** Independent default-open. Ignored when `group` is set.
     *  Accepts a predicate so the initial-open state can depend on
     *  store fields (e.g. open Noise only if its mix strength > 0). */
    defaultOpen?: boolean | ShowIfPredicate;
    /** Sections sharing this group toggle exclusively. */
    group?: string;
    /** Within a group, the section that stays open as a fallback
     *  when others close. */
    groupFallback?: boolean;
    /** Per-section visibility predicate. */
    showIf?: ShowIfPredicate;
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

    // --- Content composition — pick one of `items`, `features`, `component` ---
    // Resolution order in PanelRouter: `component` (escape hatch) wins,
    // else `items` (rich layout) if non-empty, else `features` + `widgets`
    // (shorthand) if `features` is non-empty, else "Select a module".

    /** Ordered list of render units. Use this for panels that need
     *  section headers, widgets-with-props, group-filtered features,
     *  or conditional sub-blocks. See PanelItem for the union. */
    items?: PanelItem[];

    /** SHORTHAND: feature ids whose AutoFeaturePanel should render
     *  stacked in this panel. Equivalent to
     *  `items: features.map(id => ({ type: 'feature', id }))`.
     *  Convenient for trivial panels that don't need section headers
     *  or widget props. */
    features?: string[];

    /** Name of a component registered in componentRegistry to render
     *  verbatim instead of auto-generated feature panels. Use ONLY for
     *  panels that genuinely can't be expressed via `items` (custom
     *  layouts that don't correspond to a feature stack — e.g. the
     *  Modular formula's FlowEditor). Prefer `items` when possible —
     *  it keeps the panel app-portable and other apps can reuse the
     *  individual widgets. */
    component?: string;

    /** Panel-level widgets to slot before/after/between features.
     *  Shorthand companion to `features:`. Ignored when `items` or
     *  `component` is set. */
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
