
import React, { useRef, useEffect } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { PanelRouter } from '../PanelRouter';
import { ScrollSpaceReserver } from '../ScrollSpaceReserver';
import { BenchProfiler } from '../../engine-gmt/utils/BenchProfiler';
import { PanelId, DockZone, PanelState } from '../../types';
import { DragHandleIcon, UndockIcon, ChevronLeft, ChevronRight } from '../Icons';
import { collectHelpIds } from '../../utils/helpUtils';
import { getPanelDefinition, evalShowIf } from '../../engine/PanelManifest';
import { accent, surface, text, border, tabActive, tabInactive, collapsedIconActive, collapsedIconInactive, dragHandleActive, dragHandleInactive } from '../../data/theme';
import { useTutorAnchor } from '../../engine/plugins/Tutorial';

// Mobile detection helper
const checkIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
};

interface DockProps {
    side: 'left' | 'right';
}

export const Dock: React.FC<DockProps> = ({ side }) => {
    // Granular selectors — destructuring `useEngineStore()` would
    // subscribe Dock to the ENTIRE store and re-render on every
    // setter (setJulia, setBrush, …). Two Docks × every store update
    // is a major contributor to the per-pointer-event subscriber
    // cascade that trips React's max-depth guard. Each field below
    // is either a stable ref (action functions are created once at
    // store init) or a value that changes only on dock-relevant
    // events (panel toggle, drag, resize).
    const panels = useEngineStore((s) => s.panels);
    const activeLeftTab = useEngineStore((s) => s.activeLeftTab);
    const activeRightTab = useEngineStore((s) => s.activeRightTab);
    const togglePanel = useEngineStore((s) => s.togglePanel);
    const movePanel = useEngineStore((s) => s.movePanel);
    const reorderPanel = useEngineStore((s) => s.reorderPanel);
    const startPanelDrag = useEngineStore((s) => s.startPanelDrag);
    const endPanelDrag = useEngineStore((s) => s.endPanelDrag);
    const draggingPanelId = useEngineStore((s) => s.draggingPanelId);
    const setDockSize = useEngineStore((s) => s.setDockSize);
    const isLeftDockCollapsed = useEngineStore((s) => s.isLeftDockCollapsed);
    const isRightDockCollapsed = useEngineStore((s) => s.isRightDockCollapsed);
    const setDockCollapsed = useEngineStore((s) => s.setDockCollapsed);
    const openContextMenu = useEngineStore((s) => s.openContextMenu);
    const leftDockSize = useEngineStore((s) => s.leftDockSize);
    const rightDockSize = useEngineStore((s) => s.rightDockSize);

    const isMobile = checkIsMobile();

    // Tutorial anchor — only the right-dock root is targeted by lessons.
    const rightDockAnchorRef = useTutorAnchor(side === 'right' ? 'right-dock' : null);

    const storedActiveTabId = side === 'left' ? activeLeftTab : activeRightTab;
    const isCollapsed = side === 'left' ? isLeftDockCollapsed : isRightDockCollapsed;
    const width = side === 'left' ? leftDockSize : rightDockSize;

    // Filter panels for this dock, sorted by order. Visibility comes
    // from the manifest's `showIf` predicate; legacy per-id conditionals
    // (Graph/Light/Audio/Drawing) now live in the manifest.
    const dockPanels = (Object.values(panels) as PanelState[])
        .filter((p) => {
            let location = p.location;

            // On mobile the left dock isn't mounted (see AppGmt), so any
            // left-docked panel surfaces on the right dock instead — otherwise
            // it would be unreachable.
            if (isMobile && location === 'left') {
                // A left panel gated by `showIf` (Graph/Audio/Drawing/Engine)
                // appears when its feature is active. One with NO showIf
                // (Camera Manager) is always-available and would otherwise
                // permanently occupy a right tab — make those summon-only:
                // shown only once explicitly opened (from their menu). togglePanel
                // routes them to the right dock via the same effective-dock remap.
                const mdef = getPanelDefinition(p.id);
                if (!mdef?.showIf && !p.isOpen) return false;
                location = 'right';
            }
            if (location !== side) return false;

            const def = getPanelDefinition(p.id);
            // evalShowIf needs a state snapshot for predicates that
            // check coarse top-level fields (e.g. advancedMode). Read
            // imperatively — subscribing to the full state would
            // defeat the granular-selector point of this component.
            if (def && !evalShowIf(def.showIf, useEngineStore.getState() as never)) return false;

            return true;
        })
        .sort((a, b) => a.order - b.order);

    // The stored active tab can point at a panel that's currently hidden by
    // its showIf predicate — e.g. 'Graph' stays the active left tab after you
    // switch away from the Modular formula, because nothing resets it. The
    // tab is correctly absent from `dockPanels` above, but the content area
    // keys off the active id and would otherwise still mount the hidden panel
    // (the Modular FlowEditor) when the dock is opened. Clamp the active id to
    // a visible panel: keep the stored id if it's still showing, else fall
    // back to the first visible tab (or null → "Select a panel").
    const activeTabId = dockPanels.some((p) => p.id === storedActiveTabId)
        ? storedActiveTabId
        : (dockPanels[0]?.id ?? null);

    const resizeRef = useRef<{ startX: number, startW: number } | null>(null);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        resizeRef.current = { startX: e.clientX, startW: width };
        window.addEventListener('mousemove', handleResizeMove);
        window.addEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = 'ew-resize';
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = e.clientX - resizeRef.current.startX;
        const delta = side === 'left' ? dx : -dx;
        const newWidth = Math.max(200, Math.min(800, resizeRef.current.startW + delta));
        setDockSize(side, newWidth);
    };

    const handleResizeEnd = () => {
        resizeRef.current = null;
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
    };
    
    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        const ids = collectHelpIds(e.currentTarget);
        openContextMenu(e.clientX, e.clientY, [], ids);
    };
    
    if (dockPanels.length === 0) return null;

    if (isCollapsed) {
        return (
            <div className={`flex flex-col w-8 bg-surface-dock border-${side === 'left' ? 'r' : 'l'} border-line/10 z-40 shrink-0`}>
                 <button 
                    onClick={() => setDockCollapsed(side, false)}
                    className="h-10 flex items-center justify-center text-fg-dim hover:text-fg"
                 >
                     {side === 'left' ? <ChevronRight /> : <ChevronLeft />}
                 </button>
                 <div className="flex-1 flex flex-col items-center py-2 gap-2">
                     {dockPanels.map(p => (
                         <div
                             key={p.id}
                             data-gx-mode-tab={p.id}
                             onClick={() => togglePanel(p.id, true)}
                             className={`w-6 h-6 flex items-center justify-center rounded cursor-pointer ${p.id === activeTabId ? collapsedIconActive : collapsedIconInactive}`}
                             title={p.id}
                         >
                             <span className="text-[10px] font-bold">{p.id.charAt(0)}</span>
                         </div>
                     ))}
                 </div>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col ${surface.dock} border-${side === 'left' ? 'r' : 'l'} ${border.standard} z-40 shrink-0 transition-all duration-75 relative`}
            style={{ width }}
            ref={rightDockAnchorRef}
        >
            {/* Header Tabs - Tighter Layout with reduced gap */}
            <div className={`flex flex-wrap gap-0.5 px-0.5 pt-1 ${surface.tabBar} border-b ${border.standard} shrink-0 relative items-end`}>
                {dockPanels.map(p => (
                    <DockTab
                        key={p.id}
                        panel={p}
                        isActive={p.id === activeTabId}
                        isMobile={isMobile}
                        side={side}
                        draggingPanelId={draggingPanelId}
                        panels={panels}
                        togglePanel={togglePanel}
                        handleContextMenu={handleContextMenu}
                        reorderPanel={reorderPanel}
                        endPanelDrag={endPanelDrag}
                        startPanelDrag={startPanelDrag}
                    />
                ))}
            </div>

            <button 
                onClick={() => setDockCollapsed(side, true)}
                className="absolute top-1 right-1 p-1 text-fg-faint hover:text-fg z-20"
            >
                {side === 'left' ? <ChevronLeft /> : <ChevronRight />}
            </button>

            {/* Dock content area — vertical padding only. Horizontal
                padding is owned by each panel's internal rows (AutoFeaturePanel
                already applies px-3 on every param row), so compound padding
                was wasting ~32px of dock width. */}
            <div className={`flex-1 overflow-y-auto py-2 relative ${isMobile ? 'mobile-scroll' : 'custom-scroll dock-scroll'}`}>
                {activeTabId ? (
                     <BenchProfiler id={`Dock:${side}/PanelRouter:${activeTabId}`}>
                        {/* `ScrollSpaceReserver` keyed by activeTabId so it
                            resets its measured max-height on tab switch:
                            different panels are very different heights and
                            we don't want a tall panel's max to be reserved
                            after switching to a shorter one. Within a
                            single panel, the reserver keeps total height
                            stable so toggling a feature off doesn't shift
                            content below upward — the freed space appears
                            as an empty bottom spacer instead, which is
                            GC'd once it scrolls out of view.
                            Bespoke `component:` panels (FlowEditor, etc.)
                            own their own layout and need to fill the dock
                            height — the reserver's auto-measured wrapper
                            would collapse them to 0 px, which leaves
                            ReactFlow's nodes stuck at `visibility:hidden`
                            (it never gets a non-zero container to measure
                            against). Bypass the reserver in that case. */}
                        {(() => {
                            const def = getPanelDefinition(activeTabId);
                            const isBespoke = !!def?.component;
                            const router = <PanelRouter activeTab={activeTabId} state={useEngineStore.getState()} actions={useEngineStore.getState() as any} onSwitchTab={togglePanel as any} />;
                            return isBespoke
                                ? <div className="h-full">{router}</div>
                                : <ScrollSpaceReserver key={activeTabId}>{router}</ScrollSpaceReserver>;
                        })()}
                     </BenchProfiler>
                ) : (
                    <div className="flex h-full items-center justify-center text-fg-ghost text-xs italic">
                        Select a panel
                    </div>
                )}
            </div>

            <div 
                className={`absolute top-0 bottom-0 w-1 cursor-ew-resize ${accent.hoverBg} transition-colors z-50 ${side === 'left' ? 'right-[-2px]' : 'left-[-2px]'}`}
                onMouseDown={handleResizeStart}
            />
        </div>
    );
};

interface DockTabProps {
    panel: PanelState;
    isActive: boolean;
    isMobile: boolean;
    side: 'left' | 'right';
    draggingPanelId: PanelId | null;
    panels: Record<string, PanelState>;
    togglePanel: (id: PanelId, focus?: boolean) => void;
    handleContextMenu: (e: React.MouseEvent, id: PanelId) => void;
    reorderPanel: (sourceId: PanelId, targetId: PanelId) => void;
    endPanelDrag: () => void;
    startPanelDrag: (id: PanelId) => void;
}

const DockTab: React.FC<DockTabProps> = ({
    panel: p, isActive, isMobile, side, draggingPanelId, panels,
    togglePanel, handleContextMenu, reorderPanel, endPanelDrag, startPanelDrag,
}) => {
    const tabAnchorRef = useTutorAnchor(`tab-${p.id}`);
    return (
        <button
            ref={tabAnchorRef}
            data-gx-mode-tab={p.id}
            onClick={() => togglePanel(p.id, true)}
            onContextMenu={(e) => handleContextMenu(e, p.id)}
            onMouseEnter={() => {
                if (draggingPanelId && draggingPanelId !== p.id) {
                    const sourcePanel = panels[draggingPanelId];
                    if (sourcePanel && sourcePanel.location === side) {
                        reorderPanel(draggingPanelId, p.id);
                    }
                }
            }}
            onMouseUp={(e) => {
                if (draggingPanelId) {
                    e.stopPropagation();
                    endPanelDrag();
                }
            }}
            className={`flex items-center gap-0.5 px-1 py-1 text-[9px] font-bold transition-colors group relative rounded-t-sm
                ${isActive ? tabActive : tabInactive}`}
        >
            {!isMobile && (
                <div
                    className={`cursor-move ${isActive ? `${dragHandleActive} group-hover:text-accent-600` : `${dragHandleInactive} group-hover:text-fg`} transition-colors`}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        startPanelDrag(p.id);
                    }}
                >
                    <div className="transform scale-75 origin-center">
                        <DragHandleIcon />
                    </div>
                </div>
            )}
            <span className="truncate max-w-[140px]">{p.id}</span>
        </button>
    );
};
