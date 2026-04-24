/**
 * PanelRouter — renders the content of the currently-active dock tab by
 * looking up its manifest entry (see engine/PanelManifest.ts).
 *
 * Three render paths per panel, picked by its PanelDefinition:
 *   1. `component: '…'`  → render that registered component verbatim
 *      (used for panels that aren't DDFS-shaped: FlowEditor, CameraManager,
 *      EnginePanel, etc.). Widgets are NOT wrapped around it — the
 *      component owns its whole layout.
 *   2. `features: [...]` → render an <AutoFeaturePanel> for each listed
 *      feature, in order. Optional `widgets.before / after / between`
 *      slot custom components (histograms, pickers, etc.) registered in
 *      componentRegistry.
 *   3. Neither set     → fallback "Select a module" placeholder (also
 *      used when the active tab isn't in the manifest).
 *
 * PanelRouter does NOT decide visibility; Dock filters panels via the
 * manifest's `showIf` predicates before picking an active tab.
 */

import React, { memo } from 'react';
import { EngineState, EngineActions, PanelId } from '../types';
import { componentRegistry } from './registry/ComponentRegistry';
import { AutoFeaturePanel } from './AutoFeaturePanel';
import { getPanelDefinition, PanelDefinition } from '../engine/PanelManifest';

interface PanelRouterProps {
    activeTab: PanelId;
    state: EngineState;
    actions: EngineActions;
    onSwitchTab: (tab: PanelId) => void;
}

interface WidgetProps {
    state: EngineState;
    actions: EngineActions;
    onSwitchTab: (t: PanelId) => void;
}

const renderWidget = (id: string, keySuffix: string, props: WidgetProps): React.ReactNode => {
    const Component = componentRegistry.get(id) as React.FC<WidgetProps> | undefined;
    if (!Component) {
        console.warn(`[PanelRouter] widget "${id}" not in componentRegistry`);
        return null;
    }
    return <Component key={`${id}::${keySuffix}`} {...props} />;
};

const PanelRouterInner: React.FC<PanelRouterProps> = ({
    activeTab,
    state,
    actions,
    onSwitchTab,
}) => {
    const def: PanelDefinition | undefined = getPanelDefinition(activeTab);
    if (!def) {
        return (
            <div className="flex h-full items-center justify-center text-gray-600 text-xs italic">
                Select a module
            </div>
        );
    }

    // Path 1 — bespoke component. Owns its whole layout; widgets ignored.
    if (def.component) {
        const Component = componentRegistry.get(def.component) as React.FC<WidgetProps> | undefined;
        if (!Component) {
            console.warn(`[PanelRouter] panel "${def.id}" references unregistered component "${def.component}"`);
            return (
                <div className="flex h-full items-center justify-center text-gray-600 text-xs italic">
                    Component not registered: {def.component}
                </div>
            );
        }
        return (
            <div className="h-full">
                <Component state={state} actions={actions} onSwitchTab={onSwitchTab} />
            </div>
        );
    }

    // Path 2 — stacked AutoFeaturePanels with widget slots.
    if (def.features && def.features.length > 0) {
        const widgets = def.widgets ?? {};
        const widgetProps: WidgetProps = { state, actions, onSwitchTab };
        const rows: React.ReactNode[] = [];

        (widgets.before ?? []).forEach((w, i) => {
            rows.push(renderWidget(w, `before-${i}`, widgetProps));
        });

        def.features.forEach((featureId, idx) => {
            rows.push(<AutoFeaturePanel key={`feat-${featureId}-${idx}`} featureId={featureId} />);
            (widgets.between?.[featureId] ?? []).forEach((w, i) => {
                rows.push(renderWidget(w, `between-${featureId}-${i}`, widgetProps));
            });
        });

        (widgets.after ?? []).forEach((w, i) => {
            rows.push(renderWidget(w, `after-${i}`, widgetProps));
        });

        return <div className="flex flex-col">{rows}</div>;
    }

    // Path 3 — manifest entry exists but declares neither content path.
    return (
        <div className="flex h-full items-center justify-center text-gray-600 text-xs italic">
            Select a module
        </div>
    );
};

export const PanelRouter = memo(PanelRouterInner);
