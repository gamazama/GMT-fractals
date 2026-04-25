/**
 * PanelRouter — renders the content of the currently-active dock tab by
 * looking up its manifest entry (see engine/PanelManifest.ts).
 *
 * Resolution order (richest first):
 *   1. `component: '…'`  — bespoke escape hatch. Renders that
 *      componentRegistry entry verbatim. Use only when `items` can't
 *      express the layout (e.g. ReactFlow node graph). Other content
 *      paths are ignored.
 *   2. `items: [...]`    — ordered render list of features, widgets
 *      (with optional props), section headers, and separators. The
 *      richest layout the manifest can produce.
 *   3. `features: [...]` + `widgets:` — shorthand. Compiles to an
 *      `items` list of features in order, with `widgets.before/
 *      between/after` injected at the obvious positions.
 *   4. Neither — fallback "Select a module" placeholder (also when the
 *      active tab isn't in the manifest at all).
 *
 * PanelRouter does NOT decide tab visibility; Dock applies the
 * manifest's panel-level `showIf` before picking an active tab. Item-
 * level `showIf` is evaluated here.
 */

import React, { memo } from 'react';
import { EngineState, EngineActions, PanelId } from '../types';
import { componentRegistry } from './registry/ComponentRegistry';
import { AutoFeaturePanel } from './AutoFeaturePanel';
import {
    getPanelDefinition,
    evalShowIf,
    PanelDefinition,
    PanelItem,
    PanelAccordionSection,
} from '../engine/PanelManifest';
import { SectionLabel } from './SectionLabel';
import { CollapsibleSection } from './CollapsibleSection';
import { Accordion, AccordionSection } from './Accordion';
import { CompilableFeatureSection } from './CompilableFeatureSection';
import { useEngineStore } from '../store/engineStore';

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

const renderWidget = (
    id: string,
    keySuffix: string,
    props: WidgetProps,
    extraProps?: Record<string, unknown>,
): React.ReactNode => {
    const Component = componentRegistry.get(id) as React.FC<any> | undefined;
    if (!Component) {
        console.warn(`[PanelRouter] widget "${id}" not in componentRegistry`);
        return null;
    }
    return <Component key={`${id}::${keySuffix}`} {...props} {...(extraProps ?? {})} />;
};

/** Compile the legacy shorthand (`features` + `widgets`) into a flat
 *  `items` array so the renderer below has one code path. */
const featuresToItems = (def: PanelDefinition): PanelItem[] => {
    if (!def.features || def.features.length === 0) return [];
    const w = def.widgets;
    const out: PanelItem[] = [];
    (w?.before ?? []).forEach((id) => out.push({ type: 'widget', id }));
    def.features.forEach((featureId) => {
        out.push({ type: 'feature', id: featureId });
        (w?.between?.[featureId] ?? []).forEach((id) => out.push({ type: 'widget', id }));
    });
    (w?.after ?? []).forEach((id) => out.push({ type: 'widget', id }));
    return out;
};

/** Wrap a node in a data-help-id div when the manifest item declares
 *  one. Lets right-click contextual help pick up panel-level grouping
 *  (e.g. an Effects roll-up) without requiring the underlying feature
 *  to know about it. Skips the wrapper when no helpId is set so we
 *  don't litter the DOM. */
const withHelpId = (node: React.ReactNode, helpId: string | undefined, key: string): React.ReactNode => {
    if (node === null || node === undefined) return node;
    if (!helpId) return node;
    return (
        <div key={key} data-help-id={helpId}>
            {node}
        </div>
    );
};

const renderItem = (
    item: PanelItem,
    index: number,
    state: EngineState,
    widgetProps: WidgetProps,
): React.ReactNode => {
    if (!evalShowIf(item.showIf, state as never)) return null;

    let node: React.ReactNode;
    switch (item.type) {
        case 'separator':
            return <div key={`sep-${index}`} className="h-px bg-white/10 my-2 mx-3" />;

        case 'section':
            node = (
                <div key={`section-${index}-${item.label}`} className="px-2 pt-2">
                    <SectionLabel>{item.label}</SectionLabel>
                </div>
            );
            break;

        case 'widget':
            node = renderWidget(item.id, `item-${index}`, widgetProps, item.props);
            break;

        case 'feature':
            node = (
                <AutoFeaturePanel
                    key={`feat-${item.id}-${index}`}
                    featureId={item.id}
                    groupFilter={item.groupFilter}
                    whitelistParams={item.whitelistParams}
                    excludeParams={item.excludeParams}
                    className={item.className}
                />
            );
            break;

        case 'collapsible':
            node = (
                <CollapsibleSection
                    key={`collapsible-${index}-${item.label}`}
                    label={item.label}
                    defaultOpen={item.defaultOpen}
                >
                    {item.items.map((child, childIdx) =>
                        renderItem(child, index * 1000 + childIdx, state, widgetProps),
                    )}
                </CollapsibleSection>
            );
            break;

        case 'accordion': {
            const visible = item.sections.filter((s) =>
                evalShowIf(s.showIf, state as never),
            );
            const sections: AccordionSection[] = visible.map((s, sIdx) =>
                accordionSectionToProp(s, sIdx, index, state, widgetProps),
            );
            node = <Accordion key={`accordion-${index}`} sections={sections} />;
            break;
        }

        case 'compilable':
            node = (
                <CompilableFeatureSection
                    key={`compilable-${item.id}-${index}`}
                    featureId={item.id}
                    helpId={item.helpId}
                />
            );
            break;

        default:
            return null;
    }
    return withHelpId(node, item.helpId, `helpwrap-${index}`);
};

const accordionSectionToProp = (
    s: PanelAccordionSection,
    sIdx: number,
    panelItemIdx: number,
    state: EngineState,
    widgetProps: WidgetProps,
): AccordionSection => {
    const isActive = evalShowIf(s.activePredicate, state as never);
    const headerRight = s.headerWidget
        ? renderWidget(s.headerWidget, `accordion-${panelItemIdx}-${sIdx}-hdr`, widgetProps)
        : undefined;
    const closedBadge =
        !isActive && s.closedBadge ? (
            <span className="text-[8px] text-gray-600">{s.closedBadge}</span>
        ) : undefined;
    const defaultOpen =
        typeof s.defaultOpen === 'boolean'
            ? s.defaultOpen
            : s.defaultOpen
              ? evalShowIf(s.defaultOpen, state as never)
              : undefined;
    return {
        id: s.id,
        label: s.label,
        helpId: s.helpId,
        dimmed: s.activePredicate !== undefined && !isActive,
        defaultOpen,
        group: s.group,
        groupFallback: s.groupFallback,
        headerRight,
        closedBadge,
        children: (
            <>
                {s.items.map((child, childIdx) =>
                    renderItem(
                        child,
                        panelItemIdx * 10000 + sIdx * 100 + childIdx,
                        state,
                        widgetProps,
                    ),
                )}
            </>
        ),
    };
};

const PanelRouterInner: React.FC<PanelRouterProps> = ({
    activeTab,
    state,
    actions,
    onSwitchTab,
}) => {
    const def: PanelDefinition | undefined = getPanelDefinition(activeTab);
    // Subscribe to store changes so item-level `showIf` predicates re-evaluate.
    // (`state` prop is captured by the parent's render but item showIf reads
    // are done via getState calls that won't re-trigger renders here without
    // a subscription. The Dock-level subscription already covers most cases.)
    useEngineStore((s) => s);

    if (!def) {
        return (
            <div className="flex h-full items-center justify-center text-gray-600 text-xs italic">
                Select a module
            </div>
        );
    }

    // Escape hatch — bespoke component owns its layout.
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
            <div className="h-full" data-help-id={def.helpId}>
                <Component state={state} actions={actions} onSwitchTab={onSwitchTab} />
            </div>
        );
    }

    // Items wins over the legacy shorthand if explicitly set.
    const items: PanelItem[] = def.items && def.items.length > 0
        ? def.items
        : featuresToItems(def);

    if (items.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-gray-600 text-xs italic">
                Select a module
            </div>
        );
    }

    const widgetProps: WidgetProps = { state, actions, onSwitchTab };
    return (
        <div className="flex flex-col" data-help-id={def.helpId}>
            {items.map((item, idx) => renderItem(item, idx, state, widgetProps))}
        </div>
    );
};

export const PanelRouter = memo(PanelRouterInner);
