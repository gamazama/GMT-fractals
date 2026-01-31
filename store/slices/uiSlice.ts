
import { StateCreator } from 'zustand';
import { FractalStoreState, FractalActions, PanelId } from '../../types';
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
    'histogramData' | 'histogramAutoUpdate' | 'histogramTrigger' | 'histogramLayer' |
    'sceneHistogramData' | 'sceneHistogramTrigger' |
    'draggedLightIndex' | 'autoCompile' | 'advancedMode' | 'showHints' | 'debugMobileLayout' | 'isControlsMinimized' | 'invertY' |
    'resolutionMode' | 'fixedResolution' | 'isControlsDocked' |
    'helpWindow' | 'contextMenu' |
    'lockSceneOnSwitch' | 'exportIncludeScene' |
    'isTimelineHovered' | 
    'interactionMode' | // Consolidated Mode
    'isBroadcastMode' |
    'activeTab' |
    'floatingTabs' |
    'isUserInteracting' |
    'tabSwitchCount'
> & Pick<FractalActions,
    'setShowLightGizmo' | 'setGizmoDragging' | 
    'setHistogramData' | 'setHistogramAutoUpdate' | 'refreshHistogram' | 'setHistogramLayer' |
    'setSceneHistogramData' | 'refreshSceneHistogram' |
    'setDraggedLight' | 'setAutoCompile' | 'setAdvancedMode' | 'setShowHints' | 'setDebugMobileLayout' | 'setIsControlsMinimized' | 'setInvertY' |
    'setResolutionMode' | 'setFixedResolution' | 'setIsControlsDocked' |
    'setLockSceneOnSwitch' | 'setExportIncludeScene' |
    'setIsTimelineHovered' | 
    'setInteractionMode' | // Consolidated Setter
    'setIsBroadcastMode' |
    'openHelp' | 'closeHelp' | 'openContextMenu' | 'closeContextMenu' |
    'setActiveTab' | 'floatTab' | 'dockTab' |
    'incrementTabSwitchCount'
>;

const getUrlParam = (key: string) => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has(key) && params.get(key) !== 'false' && params.get(key) !== '0';
};

export const createUISlice: StateCreator<FractalStoreState & FractalActions, [["zustand/subscribeWithSelector", never]], [], UISlice> = (set, get) => ({
    // FIX: Default showLightGizmo to TRUE so users see lights immediately
    showLightGizmo: true, 
    isGizmoDragging: false, 
    interactionMode: 'none',

    histogramData: null, histogramAutoUpdate: true, histogramTrigger: 0, histogramLayer: 0,
    sceneHistogramData: null, sceneHistogramTrigger: 0,
    draggedLightIndex: null,
    autoCompile: false,
    
    isUserInteracting: false,

    advancedMode: false,
    showHints: true,
    debugMobileLayout: false, // Default to desktop layout
    isControlsMinimized: false,
    invertY: false,
    
    resolutionMode: 'Full',
    fixedResolution: [800, 600],
    isControlsDocked: true, 
    isBroadcastMode: getUrlParam('clean') || getUrlParam('broadcast'),
    
    lockSceneOnSwitch: false,
    exportIncludeScene: false,
    
    isTimelineHovered: false,
    
    tabSwitchCount: 0,
    
    activeTab: 'Formula',
    floatingTabs: [],
    
    helpWindow: { visible: false, activeTopicId: null },
    contextMenu: { visible: false, x: 0, y: 0, items: [], targetHelpIds: [] },

    setShowLightGizmo: (v) => set({ showLightGizmo: v }),
    setGizmoDragging: (v) => set({ isGizmoDragging: v }),
    
    // Consolidated Setter
    setInteractionMode: (mode) => set({ interactionMode: mode }),

    setHistogramData: (d) => set({ histogramData: d }),
    setHistogramAutoUpdate: (v) => set({ histogramAutoUpdate: v }),
    refreshHistogram: () => set((state) => ({ histogramTrigger: state.histogramTrigger + 1 })),
    
    setHistogramLayer: (v) => {
        if (get().histogramLayer === v) return;
        set({ histogramLayer: v });
        FractalEvents.emit('uniform', { key: Uniforms.HistogramLayer, value: v });
        set((state) => ({ histogramTrigger: state.histogramTrigger + 1 }));
    },
    
    setSceneHistogramData: (d) => set({ sceneHistogramData: d }),
    refreshSceneHistogram: () => set((state) => ({ sceneHistogramTrigger: state.sceneHistogramTrigger + 1 })),
    
    setDraggedLight: (index) => set({ draggedLightIndex: index }),
    setAutoCompile: (v) => set({ autoCompile: v }),
    setAdvancedMode: (v) => set({ advancedMode: v }),
    setShowHints: (v) => set({ showHints: v }),
    setDebugMobileLayout: (v) => set({ debugMobileLayout: v }),
    setIsControlsMinimized: (v) => set({ isControlsMinimized: v }),
    setInvertY: (v) => set({ invertY: v }),
    
    setResolutionMode: (m) => { set({ resolutionMode: m }); FractalEvents.emit('reset_accum', undefined); },
    setFixedResolution: (w, h) => { set({ fixedResolution: [w, h] }); FractalEvents.emit('reset_accum', undefined); },
    setIsControlsDocked: (v) => set({ isControlsDocked: v }),
    
    setLockSceneOnSwitch: (v) => set({ lockSceneOnSwitch: v }),
    setExportIncludeScene: (v) => set({ exportIncludeScene: v }),
    
    setIsTimelineHovered: (v) => set({ isTimelineHovered: v }),
    
    incrementTabSwitchCount: () => set(s => ({ tabSwitchCount: s.tabSwitchCount + 1 })),
    
    setIsBroadcastMode: (v) => set({ isBroadcastMode: v }),
    
    setActiveTab: (t) => set({ activeTab: t }),
    floatTab: (t) => set((s) => ({ floatingTabs: [...s.floatingTabs.filter(x => x !== t), t] })),
    dockTab: (t) => set((s) => ({ floatingTabs: s.floatingTabs.filter(x => x !== t), activeTab: t })),
    
    openHelp: (topicId) => set(s => ({ 
        helpWindow: { visible: true, activeTopicId: topicId || s.helpWindow.activeTopicId },
        contextMenu: { ...s.contextMenu, visible: false } 
    })),
    closeHelp: () => set({ helpWindow: { visible: false, activeTopicId: null } }),
    
    openContextMenu: (x, y, items, targetHelpIds) => set({ 
        contextMenu: { visible: true, x, y, items, targetHelpIds: targetHelpIds || [] } 
    }),
    closeContextMenu: () => set(s => ({ contextMenu: { ...s.contextMenu, visible: false } })),
});
