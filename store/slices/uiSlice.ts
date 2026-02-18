
import { StateCreator } from 'zustand';
import { FractalStoreState, FractalActions, PanelId, PanelState, DockZone, CompositionOverlayType, CompositionOverlaySettings } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { ContextMenuItem } from '../../types/help';
import { Uniforms } from '../../engine/UniformNames';

export interface UIStateLocal {
    draggedLightIndex: number | null;
}

export interface UIActionsLocal {
    setDraggedLight: (index: number | null) => void;
}

export type UISlice = Pick<FractalStoreState,
    'showLightGizmo' | 'isGizmoDragging' | 
    'histogramData' | 'histogramAutoUpdate' | 'histogramTrigger' | 'histogramLayer' | 'histogramActiveCount' |
    'sceneHistogramData' | 'sceneHistogramTrigger' | 'sceneHistogramActiveCount' |
    'draggedLightIndex' | 'autoCompile' | 'advancedMode' | 'showHints' | 'debugMobileLayout' | 'invertY' |
    'resolutionMode' | 'fixedResolution' |
    'helpWindow' | 'contextMenu' |
    'lockSceneOnSwitch' | 'exportIncludeScene' |
    'isTimelineHovered' | 
    'interactionMode' |
    'isBroadcastMode' |
    'isUserInteracting' |
    'tabSwitchCount' |
    'compositionOverlay' |
    'compositionOverlaySettings' |
    // New Layout Props
    'panels' | 'leftDockSize' | 'rightDockSize' | 'isLeftDockCollapsed' | 'isRightDockCollapsed' | 
    'activeLeftTab' | 'activeRightTab' | 'draggingPanelId' | 'dragSnapshot'
> & Pick<FractalActions,
    'setShowLightGizmo' | 'setGizmoDragging' | 
    'setHistogramData' | 'setHistogramAutoUpdate' | 'refreshHistogram' | 'setHistogramLayer' | 'registerHistogram' | 'unregisterHistogram' |
    'setSceneHistogramData' | 'refreshSceneHistogram' | 'registerSceneHistogram' | 'unregisterSceneHistogram' |
    'setDraggedLight' | 'setAutoCompile' | 'setAdvancedMode' | 'setShowHints' | 'setDebugMobileLayout' | 'setInvertY' |
    'setResolutionMode' | 'setFixedResolution' |
    'setLockSceneOnSwitch' | 'setExportIncludeScene' |
    'setIsTimelineHovered' | 
    'setInteractionMode' |
    'setIsBroadcastMode' |
    'openHelp' | 'closeHelp' | 'openContextMenu' | 'closeContextMenu' |
    'incrementTabSwitchCount' |
    'setCompositionOverlay' |
    'setCompositionOverlaySettings' |
    // New Layout Actions
    'movePanel' | 'reorderPanel' | 'togglePanel' | 'setDockSize' | 'setDockCollapsed' | 'setFloatPosition' | 'setFloatSize' |
    'startPanelDrag' | 'endPanelDrag' | 'cancelPanelDrag' |
    // Legacy Mappers
    'setActiveTab' | 'floatTab' | 'dockTab'
>;

const getUrlParam = (key: string) => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has(key) && params.get(key) !== 'false' && params.get(key) !== '0';
};

// INITIAL LAYOUT DEFINITION
// Left dock is empty by default - panels are added when called from menus
// Right dock contains main control panels
const DEFAULT_PANELS: Record<string, PanelState> = {
    // Left Dock - Empty by default, panels added dynamically
    
    // Right Dock (Main Control Deck)
    'Formula': { id: 'Formula', location: 'right', order: 0, isCore: true, isOpen: true }, // Default Active
    'Graph': { id: 'Graph', location: 'right', order: 1, isCore: true, isOpen: false },
    'Scene': { id: 'Scene', location: 'right', order: 2, isCore: true, isOpen: false },
    'Shader': { id: 'Shader', location: 'right', order: 3, isCore: true, isOpen: false },
    'Gradient': { id: 'Gradient', location: 'right', order: 4, isCore: true, isOpen: false },
    'Quality': { id: 'Quality', location: 'right', order: 5, isCore: true, isOpen: false },
    
    // Dynamic / Switchable Panels (Initially Hidden/Closed)
    'Light': { id: 'Light', location: 'right', order: 6, isCore: false, isOpen: false },
    'Audio': { id: 'Audio', location: 'right', order: 7, isCore: false, isOpen: false },
    'Drawing': { id: 'Drawing', location: 'right', order: 8, isCore: false, isOpen: false },
    'Sonification': { id: 'Sonification', location: 'right', order: 9, isCore: false, isOpen: false },
};

export const createUISlice: StateCreator<FractalStoreState & FractalActions, [["zustand/subscribeWithSelector", never]], [], UISlice> = (set, get) => ({
    showLightGizmo: true, 
    isGizmoDragging: false, 
    interactionMode: 'none',

    histogramData: null, histogramAutoUpdate: true, histogramTrigger: 0, histogramLayer: 0, histogramActiveCount: 0,
    sceneHistogramData: null, sceneHistogramTrigger: 0, sceneHistogramActiveCount: 0,
    draggedLightIndex: null,
    autoCompile: false,
    
    isUserInteracting: false,

    advancedMode: false,
    showHints: true,
    debugMobileLayout: false,
    invertY: false,
    
    resolutionMode: 'Full',
    fixedResolution: [800, 600],
    isBroadcastMode: getUrlParam('clean') || getUrlParam('broadcast'),
    
    lockSceneOnSwitch: false,
    exportIncludeScene: false,
    
    isTimelineHovered: false,
    tabSwitchCount: 0,
    
    helpWindow: { visible: false, activeTopicId: null },
    contextMenu: { visible: false, x: 0, y: 0, items: [], targetHelpIds: [] },
    
    // Composition overlay
    compositionOverlay: 'none',
    compositionOverlaySettings: {
        opacity: 0.5,
        lineThickness: 1,
        showCenterMark: false,
        showSafeAreas: false,
        color: '#FFFFFF', // Hex format for EmbeddedColorPicker compatibility
        // Grid settings
        gridDivisionsX: 4,
        gridDivisionsY: 4,
        // Spiral settings
        spiralRotation: 0,
        spiralPositionX: 0.5,
        spiralPositionY: 0.5,
        spiralScale: 1.0,
        spiralRatio: 1.618033988749895 // Golden ratio (phi) by default
    },

    // --- LAYOUT STATE ---
    panels: DEFAULT_PANELS,
    leftDockSize: 320, // Width for Engine and Camera Manager panels
    rightDockSize: 360, // Slightly wider to fit all tabs on one line
    isLeftDockCollapsed: true, // Collapsed by default - panels will open it when initialized
    isRightDockCollapsed: false,
    draggingPanelId: null,
    dragSnapshot: null,
    
    // Computed props (updated when panels change)
    activeLeftTab: null, // No active tab since panels are closed
    activeRightTab: 'Formula',

    // --- ACTIONS ---

    setShowLightGizmo: (v) => set({ showLightGizmo: v }),
    setGizmoDragging: (v) => set({ isGizmoDragging: v }),
    setInteractionMode: (mode) => set({ interactionMode: mode }),

    setHistogramData: (d) => set({ histogramData: d }),
    setHistogramAutoUpdate: (v) => set({ histogramAutoUpdate: v }),
    refreshHistogram: () => set((state) => ({ histogramTrigger: state.histogramTrigger + 1 })),
    
    registerHistogram: () => set(s => ({ histogramActiveCount: s.histogramActiveCount + 1 })),
    unregisterHistogram: () => set(s => ({ histogramActiveCount: Math.max(0, s.histogramActiveCount - 1) })),
    
    setHistogramLayer: (v) => {
        if (get().histogramLayer === v) return;
        set({ histogramLayer: v });
        FractalEvents.emit('uniform', { key: Uniforms.HistogramLayer, value: v });
        set((state) => ({ histogramTrigger: state.histogramTrigger + 1 }));
    },
    
    setSceneHistogramData: (d) => set({ sceneHistogramData: d }),
    refreshSceneHistogram: () => set((state) => ({ sceneHistogramTrigger: state.sceneHistogramTrigger + 1 })),
    registerSceneHistogram: () => set(s => ({ sceneHistogramActiveCount: s.sceneHistogramActiveCount + 1 })),
    unregisterSceneHistogram: () => set(s => ({ sceneHistogramActiveCount: Math.max(0, s.sceneHistogramActiveCount - 1) })),
    
    setDraggedLight: (index) => set({ draggedLightIndex: index }),
    setAutoCompile: (v) => set({ autoCompile: v }),
    setAdvancedMode: (v) => set({ advancedMode: v }),
    setShowHints: (v) => set({ showHints: v }),
    setDebugMobileLayout: (v) => set({ debugMobileLayout: v }),
    setInvertY: (v) => set({ invertY: v }),
    
    setResolutionMode: (m) => { set({ resolutionMode: m }); FractalEvents.emit('reset_accum', undefined); },
    setFixedResolution: (w, h) => { set({ fixedResolution: [w, h] }); FractalEvents.emit('reset_accum', undefined); },
    
    setLockSceneOnSwitch: (v) => set({ lockSceneOnSwitch: v }),
    setExportIncludeScene: (v) => set({ exportIncludeScene: v }),
    
    setIsTimelineHovered: (v) => set({ isTimelineHovered: v }),
    incrementTabSwitchCount: () => set(s => ({ tabSwitchCount: s.tabSwitchCount + 1 })),
    setIsBroadcastMode: (v) => set({ isBroadcastMode: v }),
    
    openHelp: (topicId) => set(s => ({ 
        helpWindow: { visible: true, activeTopicId: topicId || s.helpWindow.activeTopicId },
        contextMenu: { ...s.contextMenu, visible: false } 
    })),
    closeHelp: () => set({ helpWindow: { visible: false, activeTopicId: null } }),
    
    openContextMenu: (x, y, items, targetHelpIds) => set({ 
        contextMenu: { visible: true, x, y, items, targetHelpIds: targetHelpIds || [] } 
    }),
    closeContextMenu: () => set(s => ({ contextMenu: { ...s.contextMenu, visible: false } })),

    // --- NEW LAYOUT ACTIONS IMPLEMENTATION ---

    movePanel: (id, targetZone, order) => set((state) => {
        const panels = { ...state.panels };
        
        // Create panel dynamically if it doesn't exist (for Engine, Camera Manager, etc.)
        if (!panels[id]) {
            panels[id] = { 
                id: id as PanelId, 
                location: targetZone, 
                order: 0, 
                isCore: false, 
                isOpen: true 
            };
        }

        const isOpen = true;
        
        let newOrder = order;
        if (newOrder === undefined) {
             const existingInZone = (Object.values(panels) as PanelState[]).filter(p => p.location === targetZone);
             newOrder = existingInZone.length;
        }

        if (targetZone === 'left' || targetZone === 'right') {
             (Object.values(panels) as PanelState[]).forEach((p) => {
                 if (p.location === targetZone && p.id !== id) {
                     p.isOpen = false;
                 }
             });
        }
        
        let floatPos = panels[id].floatPos;
        if (targetZone === 'float' && !floatPos) {
             floatPos = { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 };
        }

        panels[id] = { ...panels[id], location: targetZone, order: newOrder, isOpen, floatPos };
        
        const activeLeft = targetZone === 'left' ? (id as PanelId) : ((Object.values(panels) as PanelState[]).find((p) => p.location === 'left' && p.isOpen)?.id as PanelId) || null;
        const activeRight = targetZone === 'right' ? (id as PanelId) : ((Object.values(panels) as PanelState[]).find((p) => p.location === 'right' && p.isOpen)?.id as PanelId) || null;

        // Auto-expand dock when panel is moved to it
        const leftCollapsed = targetZone === 'left' ? false : state.isLeftDockCollapsed;
        const rightCollapsed = targetZone === 'right' ? false : state.isRightDockCollapsed;

        return { panels, activeLeftTab: activeLeft, activeRightTab: activeRight, isLeftDockCollapsed: leftCollapsed, isRightDockCollapsed: rightCollapsed };
    }),

    reorderPanel: (draggingId, targetId) => set((state) => {
        const panels = { ...state.panels };
        const sourcePanel = panels[draggingId];
        const targetPanel = panels[targetId];

        if (!sourcePanel || !targetPanel) return {};
        
        if (sourcePanel.location !== targetPanel.location) {
             sourcePanel.location = targetPanel.location;
             sourcePanel.isOpen = false; 
        }

        const location = targetPanel.location;
        const dockPanels = (Object.values(panels) as PanelState[])
            .filter(p => p.location === location)
            .sort((a, b) => a.order - b.order);
        
        const fromIndex = dockPanels.findIndex(p => p.id === draggingId);
        const toIndex = dockPanels.findIndex(p => p.id === targetId);

        if (fromIndex === -1 || toIndex === -1) return {};

        const [moved] = dockPanels.splice(fromIndex, 1);
        dockPanels.splice(toIndex, 0, moved);

        dockPanels.forEach((p, idx) => {
            panels[p.id] = { ...panels[p.id], order: idx };
        });

        return { panels };
    }),

    togglePanel: (id, forceState) => set((state) => {
        const panels = { ...state.panels };
        if (!panels[id]) return {};

        const p = panels[id];
        const nextState = forceState !== undefined ? forceState : !p.isOpen;
        
        if (p.location === 'float') {
            p.isOpen = nextState;
        } else {
            if (nextState) {
                (Object.values(panels) as PanelState[]).forEach((other) => {
                    if (other.location === p.location && other.id !== id) {
                        other.isOpen = false;
                    }
                });
                p.isOpen = true;
                
                if (p.location === 'left') return { panels, activeLeftTab: id as PanelId, isLeftDockCollapsed: false };
                if (p.location === 'right') return { panels, activeRightTab: id as PanelId, isRightDockCollapsed: false };
            } else {
                p.isOpen = false;
            }
        }
        
        const activeLeft = (Object.values(panels) as PanelState[]).find((x) => x.location === 'left' && x.isOpen)?.id as PanelId || null;
        const activeRight = (Object.values(panels) as PanelState[]).find((x) => x.location === 'right' && x.isOpen)?.id as PanelId || null;

        return { panels, activeLeftTab: activeLeft, activeRightTab: activeRight };
    }),

    setDockSize: (side, size) => set({ [side === 'left' ? 'leftDockSize' : 'rightDockSize']: size }),
    setDockCollapsed: (side, collapsed) => set({ [side === 'left' ? 'isLeftDockCollapsed' : 'isRightDockCollapsed']: collapsed }),
    
    setFloatPosition: (id, x, y) => set((state) => ({
        panels: { ...state.panels, [id]: { ...state.panels[id], floatPos: { x, y } } }
    })),

    setFloatSize: (id, w, h) => set((state) => ({
        panels: { ...state.panels, [id]: { ...state.panels[id], floatSize: { width: w, height: h } } }
    })),

    startPanelDrag: (id) => set(state => ({ 
        draggingPanelId: id,
        dragSnapshot: JSON.parse(JSON.stringify(state.panels)) 
    })),
    endPanelDrag: () => set({ draggingPanelId: null, dragSnapshot: null }),
    cancelPanelDrag: () => set(state => {
        if (state.dragSnapshot) {
            return { panels: state.dragSnapshot, draggingPanelId: null, dragSnapshot: null };
        }
        return { draggingPanelId: null };
    }),

    setActiveTab: (tab) => get().togglePanel(tab, true),
    floatTab: (tab) => get().movePanel(tab, 'float'),
    dockTab: (tab) => get().movePanel(tab, 'right'),
    
    // Composition overlay
    setCompositionOverlay: (type) => set({ compositionOverlay: type }),
    setCompositionOverlaySettings: (settings) => set(state => ({
        compositionOverlaySettings: { ...state.compositionOverlaySettings, ...settings }
    }))
});
