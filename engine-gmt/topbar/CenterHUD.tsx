/**
 * CenterHUD — GMT's center-topbar widget.
 *
 * Ported verbatim from `h:/GMT/gmt-0.8.5/components/topbar/CenterHUD.tsx`
 * with mechanical import-path rewrites only. No logic edits.
 *
 * Composition:
 *   - 3-light collapsed view + 8-light expanded 3x3 grid (click to
 *     toggle enable, context-menu for per-light settings, drag to
 *     move a light into 3D space via the SingleLightGizmo overlay).
 *     Drag placement lives in useInteractionManager: Point/Sphere lights
 *     land at the ray-hit surface; Directional lights are AIMED by mapping
 *     the drop point through the Heliotrope pad logic (padCoordToLightEuler).
 *   - Empty (+) slot: click adds a Point light; dragging it out creates a
 *     Point light and places it where released (same gesture as an orb).
 *   - Tear-off panels: the hover popup's 2-line header handle detaches the
 *     light panel into a free-floating window (`detachedPanels`, FloatingPanel)
 *     that stays open until its X is clicked — no hover auto-close. Detached
 *     panels swap the title keyframe diamond for a bottom Vec3 position editor.
 *   - Shadow toggle + ShadowSettingsPopup.
 *   - Light-Gizmo toggle — shows per-light gizmos in the viewport.
 *
 * Registered by `registerGmtTopbar()` in engine-gmt/topbar.tsx into the
 * TopBar plugin's 'center' slot.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEngineStore } from '../../store/engineStore';
import { LightOrb, LightSettingsPopup, LightSettingsContent } from '../features/lighting/components/LightControls';
import ShadowSettingsPopup from '../features/lighting/components/ShadowControls';
import { FloatingPanel } from '../../components/ui';
import { Z } from '../../components/ui/zIndex';
import { ShadowIcon, GizmoIcon, ChevronDown, ChevronUp, PlusIcon } from '../../components/Icons';
import { getLightFromSlice } from '../features/lighting';
import { activeLightPopup } from '../features/lighting/utils/GizmoMath';
import { buildCoreLightMenuItems } from '../features/lighting/utils/lightMenuUtils';
import { MAX_LIGHTS } from '../../data/constants';
import { useTutorAnchor } from '../../engine/plugins/Tutorial';

export const CenterHUD: React.FC<{ isMobileMode: boolean, vibrate: (ms: number | number[]) => void }> = ({ isMobileMode, vibrate }) => {
    const state = useEngineStore() as any;
    const orbsAnchor = useTutorAnchor('light-orbs');
    const expandAnchor = useTutorAnchor('lights-expand');
    const shadowAnchor = useTutorAnchor('shadow-btn');
    const gizmoAnchor = useTutorAnchor('light-gizmo-btn');
    const lighting = state.lighting;
    const { openContextMenu, handleInteractionStart, handleInteractionEnd, setOpenLightPopupIndex, setShadowPanelOpen } = useEngineStore() as any;
    const showShadowMenu = useEngineStore((s: any) => s.shadowPanelOpen);

    const [hoveredLight, setHoveredLight] = useState<number | null>(null);
    const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [menuBridge, setMenuBridge] = useState<{ x: number; y: number } | null>(null);
    // Light panels torn off the studio into free-floating windows, keyed by
    // light id → top-left screen position. Present = detached (no auto-close).
    const [detachedPanels, setDetachedPanels] = useState<Record<string, { x: number; y: number }>>({});

    const lightHoverTimeoutRef = useRef<number | null>(null);
    const menuBridgeTimeoutRef = useRef<number | null>(null);
    const mouseOverMenuBridgeRef = useRef(false);
    const mouseInsideLightOrbRef = useRef(false);
    const shadowMenuRef = useRef<HTMLDivElement>(null);
    const hudRef = useRef<HTMLDivElement>(null);
    const expandRef = useRef<HTMLDivElement>(null);

    // Keep popup alive while context menu is open; drop a bridge when it closes
    const isContextMenuOpen = useEngineStore((s: any) => s.contextMenu.visible);
    const prevContextMenuOpenRef = useRef(false);
    useEffect(() => {
        const wasOpen = prevContextMenuOpenRef.current;
        prevContextMenuOpenRef.current = isContextMenuOpen;
        if (wasOpen && !isContextMenuOpen && hoveredLight !== null && !mouseInsideLightOrbRef.current) {
            // Drop a transparent bridge at the menu's last screen position so the
            // mouse is still "covered" and the popup doesn't hide immediately.
            const { x, y } = (useEngineStore.getState() as any).contextMenu;
            setMenuBridge({ x, y });
            // Auto-expire the bridge after 700ms in case the mouse never moves
            if (menuBridgeTimeoutRef.current) clearTimeout(menuBridgeTimeoutRef.current);
            menuBridgeTimeoutRef.current = window.setTimeout(() => {
                setMenuBridge(null);
                if (!mouseInsideLightOrbRef.current && !mouseOverMenuBridgeRef.current) {
                    setHoveredLight(null);
                }
            }, 700);
        }
    }, [isContextMenuOpen, hoveredLight]);

    // Sync active light popup ref for gizmo range circle + store for tutorial trigger.
    //
    // @invariant Module-mutable singleton — bypasses the store on purpose
    //   so per-frame gizmo reads don't trigger React renders. If a future
    //   "edit light from dock panel" interaction wants the same gizmo
    //   highlight, `LightPanelControls` must also write here.
    //   Source: features/lighting/utils/GizmoMath.
    useEffect(() => {
        const idx = hoveredLight ?? activeMenuIndex ?? -1;
        activeLightPopup.index = idx;
        setOpenLightPopupIndex(idx);
        return () => { activeLightPopup.index = -1; setOpenLightPopupIndex(-1); };
    }, [hoveredLight, activeMenuIndex]);

    // Handle clicks outside menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement;
            if (shadowMenuRef.current && !shadowMenuRef.current.contains(target) && !target.closest('.shadow-toggle-btn')) {
                setShadowPanelOpen(false);
            }
            if (isMobileMode && activeMenuIndex !== null && !target.closest('.light-orb-wrapper')) {
                setActiveMenuIndex(null);
            }
            if (isExpanded && expandRef.current && !expandRef.current.contains(target) && !target.closest('.expand-trigger')) {
                setIsExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [activeMenuIndex, isMobileMode, isExpanded]);

    const handleContextMenu = (e: React.MouseEvent, ids: string[]) => {
        e.preventDefault(); e.stopPropagation();
        openContextMenu(e.clientX, e.clientY, [], ids);
    };

    const handleLightContextMenu = (e: React.MouseEvent, index: number) => {
        e.preventDefault(); e.stopPropagation();
        const light = getLightFromSlice(state.lighting, index);

        const items = [
            { label: `Light ${index + 1}`, isHeader: true },
            {
                label: 'Enabled',
                checked: light.visible,
                action: () => {
                    handleInteractionStart('param');
                    state.updateLight({ index, params: { visible: !light.visible } });
                    handleInteractionEnd();
                }
            },
            ...buildCoreLightMenuItems(index, (params: any) => {
                handleInteractionStart('param');
                state.updateLight({ index, params });
                handleInteractionEnd();
            }),
        ];

        openContextMenu(e.clientX, e.clientY, items, ['panel.light']);
    };

    const handleLightInteraction = (i: number) => {
        const light = getLightFromSlice(state.lighting, i);

        if (!isMobileMode) {
            vibrate(5);
            handleInteractionStart('param');
            state.updateLight({ index: i, params: { visible: !light.visible } });
            handleInteractionEnd();
            return;
        }

        if (!light.visible) {
            vibrate(10);
            handleInteractionStart('param');
            state.updateLight({ index: i, params: { visible: true } });
            handleInteractionEnd();
            setActiveMenuIndex(null);
        } else if (activeMenuIndex !== i) {
            vibrate(5);
            setActiveMenuIndex(i);
        } else {
            vibrate([10, 30, 10]);
            handleInteractionStart('param');
            state.updateLight({ index: i, params: { visible: false } });
            handleInteractionEnd();
            setActiveMenuIndex(null);
        }
    };

    const handleLightMouseEnter = (index: number, e: React.MouseEvent) => {
        if (isMobileMode || (e.nativeEvent as any).pointerType === 'touch') return;
        if (lightHoverTimeoutRef.current) clearTimeout(lightHoverTimeoutRef.current);
        mouseInsideLightOrbRef.current = true;
        setHoveredLight(index);
    };

    const handleLightMouseLeave = () => {
        if (isMobileMode) return;
        mouseInsideLightOrbRef.current = false;
        lightHoverTimeoutRef.current = window.setTimeout(() => {
            // Don't hide while the context menu is open — the popup stays until menu closes
            if (!(useEngineStore.getState() as any).contextMenu.visible) {
                setHoveredLight(null);
            }
        }, 600);
    };

    const handleDragStartLogic = (i: number) => {
        vibrate(5);
        const light = lights[i];
        state.setDraggedLight(light?.id ?? null);
        if (!isMobileMode) {
             setActiveMenuIndex(null);
             setHoveredLight(null);
        }
    };

    // Drag-out from an empty (+) slot: create a fresh Point light and hand it to
    // the placement gesture (useInteractionManager) so it drops where released.
    // Fired on pointerdown so a plain click (no drag) still just adds the light.
    const handleAddLightDragStart = () => {
        vibrate(5);
        state.addLight();
        const newLights = (useEngineStore.getState() as any).lighting?.lights ?? [];
        const newLight = newLights[newLights.length - 1];
        if (newLight) state.setDraggedLight(newLight.id);
        if (!isMobileMode) {
            setActiveMenuIndex(null);
            setHoveredLight(null);
        }
    };

    // Tear-off / move drag for a light panel's 2-line handle. Window listeners
    // (not pointer capture) so the gesture survives the hover-popup → floating-
    // panel DOM swap — same pattern as the orb drag. Seamless: on tear-off the
    // floating panel materialises exactly where the hover popup sat, with the
    // cursor still gripping the handle, then it tracks the pointer.
    const beginLightPanelDrag = (id: string, e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX, startY = e.clientY;
        const existing = detachedPanels[id];
        let grabDX: number, grabDY: number;
        if (existing) {
            grabDX = startX - existing.x;
            grabDY = startY - existing.y;
        } else {
            // Anchor where the hover popup's card sits. The popup root is inset
            // by the Popover's p-3, so back off 12px to land the floating card
            // over the same pixels (keeps the handle under the cursor).
            const popupEl = (e.currentTarget as HTMLElement).closest('[data-light-popup]') as HTMLElement | null;
            const r = popupEl?.getBoundingClientRect();
            const left = (r ? r.left : startX - 120) - 12;
            const top = (r ? r.top : startY - 12) - 12;
            grabDX = startX - left;
            grabDY = startY - top;
            setDetachedPanels(prev => ({ ...prev, [id]: { x: left, y: top } }));
            if (!isMobileMode) { setActiveMenuIndex(null); setHoveredLight(null); }
        }
        const onMove = (ev: PointerEvent) => {
            setDetachedPanels(prev => (prev[id]
                ? { ...prev, [id]: { x: ev.clientX - grabDX, y: ev.clientY - grabDY } }
                : prev));
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    const closeDetachedPanel = (id: string) => {
        setDetachedPanels(prev => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const lights = state.lighting?.lights || [];

    const renderSlot = (i: number) => {
        const l = lights[i];
        if (l) {
             return (
                <div
                    key={i}
                    className="relative light-orb-wrapper flex justify-center w-8 h-8"
                    onMouseEnter={(e) => handleLightMouseEnter(i, e)}
                    onMouseLeave={handleLightMouseLeave}
                    onContextMenu={(e) => handleLightContextMenu(e, i)}
                >
                    <LightOrb
                        index={i}
                        color={l.color}
                        active={l.visible}
                        type={l.type}
                        rotation={l.rotation}
                        onClick={() => handleLightInteraction(i)}
                        onDragStart={() => handleDragStartLogic(i)}
                    />
                    {state.draggedLightIndex !== l.id && !detachedPanels[l.id] && (hoveredLight === i || activeMenuIndex === i) && (
                        <>
                            {/* Transparent bridge covering the Popover's mt-3 gap so
                                moving from the orb to the popup doesn't fire mouseleave */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-56 h-4 pointer-events-auto" />
                            <LightSettingsPopup index={i} onHandlePointerDown={(e) => beginLightPanelDrag(l.id, e)} />
                        </>
                    )}
                </div>
             );
        } else {
             // Placeholder for adding light
             if (i < MAX_LIGHTS) {
                 return (
                    <div key={i} className="flex justify-center items-center w-8 h-8">
                        <button
                            onPointerDown={(e) => {
                                if (e.button === 0) {
                                    e.stopPropagation();
                                    handleAddLightDragStart();
                                }
                            }}
                            className="w-8 h-8 rounded-full border border-line/10 flex items-center justify-center text-fg-dim hover:text-accent-400 hover:border-accent-500/50 hover:bg-line/5 transition-all touch-none cursor-grab active:cursor-grabbing"
                            title="Add Light (or drag to place)"
                        >
                            <PlusIcon />
                        </button>
                    </div>
                 );
             }
             return <div key={i} className="w-8 h-8" />;
        }
    };

    const bridgePortal = menuBridge && createPortal(
        <div
            className="fixed pointer-events-auto"
            style={{ left: menuBridge.x, top: menuBridge.y, width: 240, height: 480, zIndex: 9990 }}
            onMouseEnter={() => {
                mouseOverMenuBridgeRef.current = true;
                if (lightHoverTimeoutRef.current) clearTimeout(lightHoverTimeoutRef.current);
                if (menuBridgeTimeoutRef.current) clearTimeout(menuBridgeTimeoutRef.current);
            }}
            onMouseLeave={() => {
                mouseOverMenuBridgeRef.current = false;
                setMenuBridge(null);
                if (!mouseInsideLightOrbRef.current) {
                    if (lightHoverTimeoutRef.current) clearTimeout(lightHoverTimeoutRef.current);
                    lightHoverTimeoutRef.current = window.setTimeout(() => setHoveredLight(null), 200);
                }
            }}
        />,
        document.body
    );

    return (
        <>
        {bridgePortal}
        <div ref={hudRef} className="flex items-center bg-line/5 pr-2 pl-6 py-1.5 rounded-full border border-line/5 shadow-inner z-[65]">

            <div className="relative">
                {/* COLLAPSED VIEW */}
                <div ref={orbsAnchor} className={`flex items-center gap-6 transition-opacity duration-200 ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {/* Always render 3 slots to maintain layout consistency */}
                    {[0, 1, 2].map(i => renderSlot(i))}

                    {/* Expand Trigger — desktop only. The 3x3 grid (lights 4-8)
                        doesn't fit comfortably on a phone topbar, and the
                        first 3 lights cover the common case. */}
                    {!isMobileMode && (
                        <button
                            onClick={() => { vibrate(5); setIsExpanded(true); }}
                            ref={expandAnchor}
                            className="expand-trigger w-5 h-5 flex items-center justify-center rounded-full bg-line/5 hover:bg-line/10 text-fg-muted hover:text-fg transition-colors ml-[-8px]"
                            title="Expand Light Studio"
                        >
                            <ChevronDown />
                        </button>
                    )}
                </div>

                {/* EXPANDED VIEW (3x3 Grid) */}
                {isExpanded && (
                    <div
                        ref={expandRef}
                        // Positioning: left/top at -20px offsets the p-5 padding, aligning Grid Slot 0 with Collapsed Slot 0
                        className="absolute top-[-20px] left-[-20px] bg-surface border border-line/20 p-5 rounded-2xl shadow-2xl animate-fade-in z-[80]"
                    >
                        <div className="grid grid-cols-3 gap-6">
                             {/* 8 Light Slots */}
                             {Array.from({length: 8}).map((_, i) => renderSlot(i))}

                             {/* 9th slot: Collapse Button */}
                             <div className="flex justify-center items-center w-8 h-8">
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="w-8 h-8 rounded-full border border-line/10 flex items-center justify-center text-fg-dim hover:text-fg hover:bg-line/10 transition-colors"
                                    title="Collapse"
                                >
                                    <ChevronUp />
                                </button>
                             </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="h-6 w-px bg-line/10 mx-4" />

            <div className="flex items-center gap-2">
                <div className="relative" ref={shadowMenuRef}>
                    <button
                        // UPDATED: Simply toggle menu, do not toggle state directly
                        onClick={(e) => { e.stopPropagation(); vibrate(5); setShadowPanelOpen(!showShadowMenu); }}
                        onContextMenu={(e) => handleContextMenu(e, ['shadows'])}
                        ref={shadowAnchor}
                        className={`shadow-toggle-btn p-2 rounded-full border transition-all duration-300 ${lighting?.shadows ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'bg-transparent border-transparent text-fg-faint hover:text-fg-tertiary hover:bg-line/5'}`}
                        title="Shadow Settings"
                    >
                        <ShadowIcon />
                    </button>
                    {showShadowMenu && <ShadowSettingsPopup />}
                </div>
                <button
                    onClick={() => {
                        vibrate(5);
                        handleInteractionStart('param');
                        state.setShowLightGizmo(!state.showLightGizmo);
                        handleInteractionEnd();
                    }}
                    onContextMenu={(e) => handleContextMenu(e, ['ui.viewport'])}
                    ref={gizmoAnchor}
                    className={`p-2 rounded-full border transition-all duration-300 ${state.showLightGizmo ? 'bg-accent-500/20 border-accent-500 text-accent-300 shadow-[0_0_10px_rgb(var(--accent-glow)/0.2)]' : 'bg-transparent border-transparent text-fg-faint hover:text-fg-tertiary hover:bg-line/5'}`}
                >
                    <GizmoIcon />
                </button>
            </div>
        </div>

        {/* Detached light panels — torn off the studio, styled like the docked
            draggable windows (coloured header bar, drag handle, X). They float
            free (portalled, on-screen-clamped) and stay open until closed. */}
        {lights.map((l: any, idx: number) => {
            const pos = detachedPanels[l.id];
            if (!pos) return null;
            return (
                <FloatingPanel
                    key={l.id}
                    z={Z.panel}
                    position={pos}
                    onPositionChange={(p) => setDetachedPanels(prev => (prev[l.id] ? { ...prev, [l.id]: p } : prev))}
                    draggable={false}
                    showClose={false}
                    className="glass-panel flex flex-col overflow-hidden rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-52"
                    bodyClassName="p-3 overflow-y-auto overflow-x-hidden custom-scroll flex-1"
                >
                    <LightSettingsContent
                        index={idx}
                        detached
                        onHandlePointerDown={(e) => beginLightPanelDrag(l.id, e)}
                        onClose={() => closeDetachedPanel(l.id)}
                    />
                </FloatingPanel>
            );
        })}
        </>
    );
};
