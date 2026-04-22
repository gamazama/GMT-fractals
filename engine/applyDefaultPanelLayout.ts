/**
 * applyDefaultPanelLayout — zero-boilerplate panel placement for apps.
 *
 * Iterates featureRegistry and, for every feature whose tabConfig
 * declares a `dock` target, calls store.movePanel(label, dock, order)
 * to place it. The active tab per dock is the feature with
 * `defaultActive: true`, or the lowest-order feature if none is
 * explicitly marked.
 *
 * Usage (typical app):
 *   // In each feature:
 *   tabConfig: { label: 'Mandelbulb', componentId: 'auto-feature-panel',
 *                order: 0, dock: 'right', defaultActive: true }
 *
 *   // In the app's setup.ts:
 *   export const setupMyApp = applyDefaultPanelLayout;
 *
 * That's the whole panel setup. Features without `dock` aren't touched,
 * so apps can still mix auto-layout with explicit movePanel calls for
 * panels that need custom placement or conditional visibility.
 *
 * Idempotent — safe to call multiple times (movePanel is a pure
 * state-set, not an accumulator).
 */

import { featureRegistry } from './FeatureSystem';
import { useFractalStore } from '../store/fractalStore';

export const applyDefaultPanelLayout = () => {
    const store = useFractalStore.getState();

    // Collect features with a declared dock, grouped by dock.
    const byDock: Record<string, { label: string; order: number; active: boolean }[]> = {};
    for (const feat of featureRegistry.getAll()) {
        const tc = feat.tabConfig;
        if (!tc || !tc.dock) continue;
        (byDock[tc.dock] ??= []).push({
            label: tc.label,
            order: tc.order,
            active: !!tc.defaultActive,
        });
    }

    // Place each dock's panels in order; remember which should be active.
    for (const [dock, panels] of Object.entries(byDock)) {
        panels.sort((a, b) => a.order - b.order);
        for (let i = 0; i < panels.length; i++) {
            store.movePanel(panels[i].label, dock as 'left' | 'right' | 'float', i);
        }
        // Pick the active tab: explicit defaultActive wins, else lowest order.
        const active = panels.find((p) => p.active) ?? panels[0];
        if (active) store.togglePanel(active.label, true);
    }
};
