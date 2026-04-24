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
 *   - Shadow toggle + ShadowSettingsPopup.
 *   - Light-Gizmo toggle — shows per-light gizmos in the viewport.
 *
 * Registered by `registerGmtTopbar()` in engine-gmt/topbar.tsx into the
 * TopBar plugin's 'center' slot.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEngineStore } from '../../store/engineStore';
import { LightOrb, LightSettingsPopup } from '../features/lighting/components/LightControls';
import ShadowSettingsPopup from '../features/lighting/components/ShadowControls';
import { ShadowIcon, GizmoIcon, ChevronDown, ChevronUp, PlusIcon } from '../../components/Icons';
import { getLightFromSlice } from '../features/lighting';
import { activeLightPopup } from '../features/lighting/utils/GizmoMath';
import { buildCoreLightMenuItems } from '../features/lighting/utils/lightMenuUtils';
import { MAX_LIGHTS } from '../../data/constants';

export const CenterHUD: React.FC<{ isMobileMode: boolean, vibrate: (ms: number | number[]) => void }> = ({ isMobileMode, vibrate }) => {
    const state = useEngineStore() as any;
    const lighting = state.lighting;
    const { openContextMenu, handleInteractionStart, handleInteractionEnd, setOpenLightPopupIndex, setShadowPanelOpen } = useEngineStore() as any;
    const showShadowMenu = useEngineStore((s: any) => s.shadowPanelOpen);

    const [hoveredLight, setHoveredLight] = useState<number | null>(null);
    const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [menuBridge, setMenuBridge] = useState<{ x: number; y: number } | null>(null);

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

    // Sync active light popup ref for gizmo range circle + store for tutorial trigger
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

    const handleAddLight = () => {
        state.addLight();
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
                    {state.draggedLightIndex !== l.id && (hoveredLight === i || activeMenuIndex === i) && (
                        <>
                            {/* Transparent bridge covering the Popover's mt-3 gap so
                                moving from the orb to the popup doesn't fire mouseleave */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-56 h-4 pointer-events-auto" />
                            <LightSettingsPopup index={i} />
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
                            onClick={handleAddLight}
                            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-white/5 transition-all"
                            title="Add Light"
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
        <div ref={hudRef} className="flex items-center bg-white/5 pr-2 pl-6 py-1.5 rounded-full border border-white/5 shadow-inner z-[65]">

            <div className="relative">
                {/* COLLAPSED VIEW */}
                <div data-tut="light-orbs" className={`flex items-center gap-6 transition-opacity duration-200 ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {/* Always render 3 slots to maintain layout consistency */}
                    {[0, 1, 2].map(i => renderSlot(i))}

                    {/* Expand Trigger - positioned to not shift layout when expanded */}
                    <button
                        onClick={() => { vibrate(5); setIsExpanded(true); }}
                        data-tut="lights-expand"
                        className="expand-trigger w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors ml-[-8px]"
                        title="Expand Light Studio"
                    >
                        <ChevronDown />
                    </button>
                </div>

                {/* EXPANDED VIEW (3x3 Grid) */}
                {isExpanded && (
                    <div
                        ref={expandRef}
                        // Positioning: left/top at -20px offsets the p-5 padding, aligning Grid Slot 0 with Collapsed Slot 0
                        className="absolute top-[-20px] left-[-20px] bg-black/95 border border-white/20 p-5 rounded-2xl shadow-2xl animate-fade-in z-[80]"
                    >
                        <div className="grid grid-cols-3 gap-6">
                             {/* 8 Light Slots */}
                             {Array.from({length: 8}).map((_, i) => renderSlot(i))}

                             {/* 9th slot: Collapse Button */}
                             <div className="flex justify-center items-center w-8 h-8">
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Collapse"
                                >
                                    <ChevronUp />
                                </button>
                             </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="h-6 w-px bg-white/10 mx-4" />

            <div className="flex items-center gap-2">
                <div className="relative" ref={shadowMenuRef}>
                    <button
                        // UPDATED: Simply toggle menu, do not toggle state directly
                        onClick={(e) => { e.stopPropagation(); vibrate(5); setShadowPanelOpen(!showShadowMenu); }}
                        onContextMenu={(e) => handleContextMenu(e, ['shadows'])}
                        data-tut="shadow-btn"
                        className={`shadow-toggle-btn p-2 rounded-full border transition-all duration-300 ${lighting?.shadows ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5'}`}
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
                    data-tut="light-gizmo-btn"
                    className={`p-2 rounded-full border transition-all duration-300 ${state.showLightGizmo ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5'}`}
                >
                    <GizmoIcon />
                </button>
            </div>
        </div>
        </>
    );
};
