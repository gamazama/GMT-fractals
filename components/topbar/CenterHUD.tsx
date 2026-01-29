
import React, { useState, useRef, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { LightOrb, LightSettingsPopup } from '../../features/lighting/components/LightControls';
import ShadowSettingsPopup from '../../features/lighting/components/ShadowControls';
import { ShadowIcon, GizmoIcon, ChevronDown, ChevronUp, PlusIcon } from '../Icons';
import { getLightFromSlice } from '../../features/lighting';
import { MAX_LIGHTS } from '../../data/constants';

export const CenterHUD: React.FC<{ isMobileMode: boolean, vibrate: (ms: number | number[]) => void }> = ({ isMobileMode, vibrate }) => {
    const state = useFractalStore();
    const lighting = state.lighting;
    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useFractalStore();

    const [hoveredLight, setHoveredLight] = useState<number | null>(null);
    const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
    const [showShadowMenu, setShowShadowMenu] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    const lightHoverTimeoutRef = useRef<number | null>(null);
    const shadowMenuRef = useRef<HTMLDivElement>(null);
    const hudRef = useRef<HTMLDivElement>(null);
    const expandRef = useRef<HTMLDivElement>(null);

    // Handle clicks outside menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement;
            if (shadowMenuRef.current && !shadowMenuRef.current.contains(target) && !target.closest('.shadow-toggle-btn')) {
                setShowShadowMenu(false);
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
        setHoveredLight(index);
    };

    const handleLightMouseLeave = () => {
        if (isMobileMode) return;
        lightHoverTimeoutRef.current = window.setTimeout(() => {
            setHoveredLight(null);
        }, 400); 
    };
    
    const handleDragStartLogic = (i: number) => {
        vibrate(5);
        state.setDraggedLight(i);
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
                    onContextMenu={(e) => handleContextMenu(e, ['panel.light', 'light.intensity'])}
                >
                    <LightOrb 
                        index={i} 
                        color={l.color} 
                        active={l.visible} 
                        onClick={() => handleLightInteraction(i)}
                        onDragStart={() => handleDragStartLogic(i)}
                    />
                    {state.draggedLightIndex !== i && (hoveredLight === i || activeMenuIndex === i) && (
                        <LightSettingsPopup index={i} />
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

    return (
        <div ref={hudRef} className="absolute left-1/2 -translate-x-1/2 flex items-center bg-white/5 pr-2 pl-6 py-1.5 rounded-full border border-white/5 shadow-inner z-[65]">
            
            <div className="relative">
                {/* COLLAPSED VIEW */}
                <div className={`flex items-center gap-6 transition-opacity duration-200 ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {/* Always render 3 slots to maintain layout consistency */}
                    {[0, 1, 2].map(i => renderSlot(i))}
                    
                    {/* Expand Trigger - positioned to not shift layout when expanded */}
                    <button 
                        onClick={() => { vibrate(5); setIsExpanded(true); }}
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
                        onClick={(e) => { e.stopPropagation(); vibrate(5); setShowShadowMenu(!showShadowMenu); }}
                        onContextMenu={(e) => handleContextMenu(e, ['shadows'])}
                        className={`shadow-toggle-btn p-2 rounded-full border transition-all duration-300 ${lighting?.shadows ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.1)]' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5'}`}
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
                    className={`p-2 rounded-full border transition-all duration-300 ${state.showLightGizmo ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/5'}`}
                >
                    <GizmoIcon />
                </button>
            </div>
        </div>
    );
};
