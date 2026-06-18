
import { StateCreator } from 'zustand';
import { EngineStoreState, EngineActions, PanelId, PanelState, DockZone, CompositionOverlayType, CompositionOverlaySettings, UiModePreference } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { ContextMenuItem } from '../../types/help';
import { Uniforms } from '../../engine/UniformNames';
import { safeLocalGet, safeLocalSet } from '../safeLocalStorage';

// Mirrors Dock.tsx: on mobile the left dock isn't mounted (see AppGmt), so a
// left-located panel is presented in the RIGHT dock. Panel activation must use
// the SAME effective-dock remap, else opening a left panel writes activeLeftTab
// (an unmounted dock) and the tap appears to do nothing.
const checkIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768;
};
const effectiveDock = (panel: PanelState, mobile: boolean): DockZone =>
    mobile && panel.location === 'left' ? 'right' : panel.location;

// User preferences persisted to localStorage. Read at slice init,
// written from setters. All keys under the `gmt.` namespace.
const LS = {
    uiMode: 'gmt.uiModePreference',
    showHints: 'gmt.showHints',
    invertY: 'gmt.invertY',
    advancedMode: 'gmt.advancedMode',
    lockSceneOnSwitch: 'gmt.lockSceneOnSwitch',
    exportIncludeScene: 'gmt.exportIncludeScene',
    leftDockSize: 'gmt.leftDockSize',
    rightDockSize: 'gmt.rightDockSize',
    isLeftDockCollapsed: 'gmt.isLeftDockCollapsed',
    isRightDockCollapsed: 'gmt.isRightDockCollapsed',
    compositionOverlay: 'gmt.compositionOverlay',
    compositionOverlaySettings: 'gmt.compositionOverlaySettings',
} as const;

// Low-level localStorage access is guarded by `safeLocalGet`/`safeLocalSet`
// (store/safeLocalStorage.ts); these helpers add only the type coercion.
function readBool(key: string, fallback: boolean): boolean {
    const v = safeLocalGet(key);
    if (v === '0' || v === 'false') return false;
    if (v === '1' || v === 'true') return true;
    return fallback;
}
function writeBool(key: string, v: boolean): void {
    safeLocalSet(key, v ? '1' : '0');
}
function readNumber(key: string, fallback: number): number {
    const v = safeLocalGet(key);
    if (v !== null) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return fallback;
}
function writeNumber(key: string, v: number): void {
    safeLocalSet(key, String(v));
}
function readJson<T>(key: string, fallback: T): T {
    const v = safeLocalGet(key);
    if (v !== null) {
        try { return { ...fallback, ...(JSON.parse(v) as object) } as T; } catch { /* malformed */ }
    }
    return fallback;
}
function writeJson(key: string, v: unknown): void {
    safeLocalSet(key, JSON.stringify(v));
}

function readUiModePreference(): UiModePreference {
    const v = safeLocalGet(LS.uiMode);
    if (v === 'auto' || v === 'mobile' || v === 'desktop') return v;
    return 'auto';
}
function writeUiModePreference(v: UiModePreference): void {
    safeLocalSet(LS.uiMode, v);
}

const COMPOSITION_OVERLAY_TYPES = new Set(['none', 'grid', 'thirds', 'golden', 'spiral', 'center', 'diagonal', 'safearea']);
function readCompositionOverlay(fallback: CompositionOverlayType): CompositionOverlayType {
    const v = safeLocalGet(LS.compositionOverlay);
    if (v && COMPOSITION_OVERLAY_TYPES.has(v)) return v as CompositionOverlayType;
    return fallback;
}

// Tutorial completion persistence — namespaced per app via
// `setTutorialStorageKey(key)` (called by installTutorial). Default
// 'gmt-tutorials' so existing GMT installs keep their completion state.
let _tutorialStorageKey = 'gmt-tutorials';
function readTutorialCompleted(): number[] {
    const stored = safeLocalGet(_tutorialStorageKey);
    if (!stored) return [];
    try { return JSON.parse(stored).completed || []; } catch { return []; }
}
function writeTutorialCompleted(completed: number[]): void {
    safeLocalSet(_tutorialStorageKey, JSON.stringify({ completed }));
}
/** Set the localStorage key used to persist tutorial completion. Re-reads
 *  the completion list under the new key so a freshly-namespaced app
 *  picks up its own history. Apps call this through `installTutorial`. */
export function setTutorialStorageKey(key: string, applyToStore: (completed: number[]) => void): void {
    _tutorialStorageKey = key;
    applyToStore(readTutorialCompleted());
}

export type UISlice = Pick<EngineStoreState,
    'showLightGizmo' |
    'histogramData' | 'histogramAutoUpdate' | 'histogramTrigger' | 'histogramLayer' | 'histogramActiveCount' | 'histogramLoading' |
    'sceneHistogramData' | 'sceneHistogramTrigger' | 'sceneHistogramActiveCount' |
    'draggedLightIndex' | 'openLightPopupIndex' | 'shadowPanelOpen' | 'vpQualityOpen' | 'advancedMode' | 'showHints' | 'uiModePreference' | 'isDeviceMobile' | 'isPortrait' | 'mobileActiveMenu' | 'invertY' |
    'helpWindow' | 'contextMenu' |
    'lockSceneOnSwitch' | 'exportIncludeScene' |
    'isTimelineHovered' | 
    'interactionMode' | 'focusLock' |
    'isBroadcastMode' |
    'isUserInteracting' |
    'tabSwitchCount' |
    'compositionOverlay' |
    'compositionOverlaySettings' |
    // New Layout Props
    'panels' | 'leftDockSize' | 'rightDockSize' | 'isLeftDockCollapsed' | 'isRightDockCollapsed' |
    'activeLeftTab' | 'activeRightTab' | 'draggingPanelId' | 'dragSnapshot' |
    'workshopOpen' | 'workshopEditFormula' | 'workshopCatalogKey' |
    'newSceneOpen' |
    // Tutorial
    'tutorialActive' | 'tutorialLessonId' | 'tutorialStepIndex' | 'tutorialCompleted'
> & Pick<EngineActions,
    'setShowLightGizmo' |
    'setHistogramData' | 'setHistogramAutoUpdate' | 'setHistogramLoading' | 'refreshHistogram' | 'setHistogramLayer' | 'registerHistogram' | 'unregisterHistogram' |
    'setSceneHistogramData' | 'refreshSceneHistogram' | 'registerSceneHistogram' | 'unregisterSceneHistogram' |
    'setDraggedLight' | 'setOpenLightPopupIndex' | 'setShadowPanelOpen' | 'setVpQualityOpen' | 'setAdvancedMode' | 'setShowHints' | 'setUiModePreference' | 'setMobileActiveMenu' | 'setInvertY' |
    'setLockSceneOnSwitch' | 'setExportIncludeScene' |
    'setIsTimelineHovered' | 
    'setInteractionMode' | 'setFocusLock' |
    'setIsBroadcastMode' |
    'openHelp' | 'closeHelp' | 'openContextMenu' | 'closeContextMenu' |
    'incrementTabSwitchCount' |
    'setCompositionOverlay' |
    'setCompositionOverlaySettings' |
    // New Layout Actions
    'movePanel' | 'reorderPanel' | 'togglePanel' | 'setDockSize' | 'setDockCollapsed' | 'setFloatPosition' | 'setFloatSize' |
    'startPanelDrag' | 'endPanelDrag' | 'cancelPanelDrag' |
    // Legacy Mappers
    'setActiveTab' | 'floatTab' | 'dockTab' |
    // Workshop
    'openWorkshop' | 'closeWorkshop' |
    'openNewScene' | 'closeNewScene' |
    // Tutorial
    'startTutorial' | 'advanceTutorialStep' | 'skipTutorial' | 'completeTutorial'
>;

const getUrlParam = (key: string) => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const val = params.get(key);
    return params.has(key) && val?.toLowerCase() !== 'false' && val !== '0';
};

// INITIAL LAYOUT DEFINITION
//
// The generic engine ships with no panels pre-registered. Apps seed their
// own panel set by merging entries into the `panels` record in their store
// bootstrap — either via `movePanel(id, dock)` at boot time or by spreading
// an app-specific initial state into the Zustand creator.
const DEFAULT_PANELS: Record<string, PanelState> = {};

export const createUISlice: StateCreator<EngineStoreState & EngineActions, [["zustand/subscribeWithSelector", never]], [], UISlice> = (set, get) => ({
    showLightGizmo: true,
    interactionMode: 'none',
    focusLock: false,

    histogramData: null, histogramAutoUpdate: true, histogramTrigger: 0, histogramLayer: 0, histogramActiveCount: 0, histogramLoading: false,
    sceneHistogramData: null, sceneHistogramTrigger: 0, sceneHistogramActiveCount: 0,
    draggedLightIndex: null,
    openLightPopupIndex: -1,
    shadowPanelOpen: false,
    vpQualityOpen: false,

    isUserInteracting: false,

    advancedMode: readBool(LS.advancedMode, false),
    showHints: readBool(LS.showHints, true),
    uiModePreference: readUiModePreference(),
    // Initialized from window at slice creation; a single global
    // resize listener in hooks/useMobileLayout.ts keeps these in sync.
    isDeviceMobile: typeof window !== 'undefined'
        && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768),
    isPortrait: typeof window !== 'undefined'
        && window.innerHeight > window.innerWidth,
    mobileActiveMenu: null,
    invertY: readBool(LS.invertY, false),

    // resolutionMode + fixedResolution migrated to viewportSlice (Phase 2a).

    isBroadcastMode: getUrlParam('clean') || getUrlParam('broadcast'),

    lockSceneOnSwitch: readBool(LS.lockSceneOnSwitch, false),
    exportIncludeScene: readBool(LS.exportIncludeScene, false),
    
    isTimelineHovered: false,
    tabSwitchCount: 0,
    
    helpWindow: { visible: false, activeTopicId: null },
    contextMenu: { visible: false, x: 0, y: 0, items: [], targetHelpIds: [] },
    
    // Composition overlay
    compositionOverlay: readCompositionOverlay('none'),
    compositionOverlaySettings: readJson(LS.compositionOverlaySettings, {
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
    }),

    // --- LAYOUT STATE ---
    panels: DEFAULT_PANELS,
    leftDockSize: readNumber(LS.leftDockSize, 320), // Width for Engine and Camera Manager panels
    rightDockSize: readNumber(LS.rightDockSize, 360), // Slightly wider to fit all tabs on one line
    isLeftDockCollapsed: readBool(LS.isLeftDockCollapsed, true), // Collapsed by default - panels will open it when initialized
    isRightDockCollapsed: readBool(LS.isRightDockCollapsed, false),
    draggingPanelId: null,
    dragSnapshot: null,
    
    // Computed props (updated when panels change)
    activeLeftTab: null,
    activeRightTab: null,

    // Workshop
    workshopOpen: false,
    newSceneOpen: false,
    workshopEditFormula: undefined,
    workshopCatalogKey: undefined,

    // Tutorial System
    tutorialActive: false,
    tutorialLessonId: null,
    tutorialStepIndex: 0,
    tutorialCompleted: readTutorialCompleted(),

    // --- ACTIONS ---

    setShowLightGizmo: (v) => set({ showLightGizmo: v }),
    setInteractionMode: (mode) => set({ interactionMode: mode }),
    setFocusLock: (v) => set({ focusLock: v }),

    setHistogramData: (d) => set({ histogramData: d, histogramLoading: false }),
    setHistogramLoading: (v: boolean) => set({ histogramLoading: v }),
    setHistogramAutoUpdate: (v) => set({ histogramAutoUpdate: v }),
    refreshHistogram: () => set((state) => ({ histogramTrigger: state.histogramTrigger + 1 })),
    
    registerHistogram: () => set(s => ({ histogramActiveCount: s.histogramActiveCount + 1 })),
    unregisterHistogram: () => set(s => ({ histogramActiveCount: Math.max(0, s.histogramActiveCount - 1) })),
    
    setHistogramLayer: (v) => {
        if (get().histogramLayer === v) return;
        set({ histogramLayer: v });
        // uHistogramLayer only selects which colour layer the histogram READBACK
        // samples (ShaderBuilder histogram variant) — it does not affect the main
        // render, so it must not reset accumulation.
        FractalEvents.emit('uniform', { key: Uniforms.HistogramLayer, value: v, noReset: true });
        set((state) => ({ histogramTrigger: state.histogramTrigger + 1 }));
    },
    
    setSceneHistogramData: (d) => set({ sceneHistogramData: d }),
    refreshSceneHistogram: () => set((state) => ({ sceneHistogramTrigger: state.sceneHistogramTrigger + 1 })),
    registerSceneHistogram: () => set(s => ({ sceneHistogramActiveCount: s.sceneHistogramActiveCount + 1 })),
    unregisterSceneHistogram: () => set(s => ({ sceneHistogramActiveCount: Math.max(0, s.sceneHistogramActiveCount - 1) })),
    
    setDraggedLight: (index) => set({ draggedLightIndex: index }),
    setOpenLightPopupIndex: (index) => set({ openLightPopupIndex: index }),
    setShadowPanelOpen: (v) => set({ shadowPanelOpen: v }),
    setVpQualityOpen: (v) => set({ vpQualityOpen: v }),
    setAdvancedMode: (v) => { writeBool(LS.advancedMode, v); set({ advancedMode: v }); },
    setShowHints: (v) => { writeBool(LS.showHints, v); set({ showHints: v }); },
    setUiModePreference: (v) => { writeUiModePreference(v); set({ uiModePreference: v }); },
    setMobileActiveMenu: (v) => set((s) => s.mobileActiveMenu === v ? s : { mobileActiveMenu: v }),
    setInvertY: (v) => { writeBool(LS.invertY, v); set({ invertY: v }); },

    // setResolutionMode / setFixedResolution migrated to viewportSlice (Phase 2a).

    setLockSceneOnSwitch: (v) => { writeBool(LS.lockSceneOnSwitch, v); set({ lockSceneOnSwitch: v }); },
    setExportIncludeScene: (v) => { writeBool(LS.exportIncludeScene, v); set({ exportIncludeScene: v }); },
    
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

    openWorkshop: (editFormula, catalogKey) => set({ workshopOpen: true, workshopEditFormula: editFormula, workshopCatalogKey: catalogKey }),
    closeWorkshop: () => set({ workshopOpen: false, workshopEditFormula: undefined, workshopCatalogKey: undefined }),

    openNewScene: () => set({ newSceneOpen: true }),
    closeNewScene: () => set({ newSceneOpen: false }),

    // --- NEW LAYOUT ACTIONS IMPLEMENTATION ---

    movePanel: (id, targetZone, order) => set((state) => {
        const panels = { ...state.panels };

        // Non-floatable panels (e.g. the Gradient Explorer's canvas mode stages, which
        // desync from the centre stage when floated) can't be undocked — reject the move.
        if (targetZone === 'float' && panels[id]?.floatable === false) return {};

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

        const nextState = forceState !== undefined ? forceState : !panels[id].isOpen;

        // Replace the entry with a NEW object rather than mutating isOpen in
        // place. Subscribers that detect panel changes by reference equality
        // (e.g. favientsPanelPersist's open-state watcher) would otherwise miss
        // a pure open/close toggle, since the entry reference stayed identical —
        // that's why a closed Favients shelf reopened on reload.
        const p = panels[id] = { ...panels[id], isOpen: nextState };

        // Effective dock: on mobile a left panel lives in the right dock (no
        // left dock is mounted). Use it for same-dock exclusivity AND for the
        // active-tab routing below, so a summoned left panel actually activates
        // in the dock the user sees it in.
        const mobile = checkIsMobile();
        const pDock = effectiveDock(p, mobile);

        if (pDock !== 'float') {
            if (nextState) {
                (Object.values(panels) as PanelState[]).forEach((other) => {
                    if (other.id !== id && effectiveDock(other, mobile) === pDock) {
                        other.isOpen = false;
                    }
                });

                if (pDock === 'left') return { panels, activeLeftTab: id as PanelId, isLeftDockCollapsed: false };
                if (pDock === 'right') return { panels, activeRightTab: id as PanelId, isRightDockCollapsed: false };
            }
        }

        const activeLeft = (Object.values(panels) as PanelState[]).find((x) => effectiveDock(x, mobile) === 'left' && x.isOpen)?.id as PanelId || null;
        const activeRight = (Object.values(panels) as PanelState[]).find((x) => effectiveDock(x, mobile) === 'right' && x.isOpen)?.id as PanelId || null;

        return { panels, activeLeftTab: activeLeft, activeRightTab: activeRight };
    }),

    setDockSize: (side, size) => {
        writeNumber(side === 'left' ? LS.leftDockSize : LS.rightDockSize, size);
        set({ [side === 'left' ? 'leftDockSize' : 'rightDockSize']: size });
    },
    setDockCollapsed: (side, collapsed) => {
        writeBool(side === 'left' ? LS.isLeftDockCollapsed : LS.isRightDockCollapsed, collapsed);
        set({ [side === 'left' ? 'isLeftDockCollapsed' : 'isRightDockCollapsed']: collapsed });
    },
    
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
    setCompositionOverlay: (type) => {
        safeLocalSet(LS.compositionOverlay, type);
        set({ compositionOverlay: type });
    },
    setCompositionOverlaySettings: (settings) => set(state => {
        const merged = { ...state.compositionOverlaySettings, ...settings };
        writeJson(LS.compositionOverlaySettings, merged);
        return { compositionOverlaySettings: merged };
    }),

    // --- TUTORIAL ACTIONS ---
    startTutorial: (lessonId) => set({
        tutorialActive: true,
        tutorialLessonId: lessonId,
        tutorialStepIndex: 0,
        showHints: false,
    }),
    advanceTutorialStep: () => set(state => ({
        tutorialStepIndex: state.tutorialStepIndex + 1
    })),
    skipTutorial: () => set({
        tutorialActive: false,
        tutorialLessonId: null,
        tutorialStepIndex: 0,
        showHints: true,
    }),
    completeTutorial: () => set(state => {
        const completed = state.tutorialLessonId !== null && !state.tutorialCompleted.includes(state.tutorialLessonId)
            ? [...state.tutorialCompleted, state.tutorialLessonId]
            : state.tutorialCompleted;
        writeTutorialCompleted(completed);
        return {
            tutorialActive: false,
            tutorialLessonId: null,
            tutorialStepIndex: 0,
            tutorialCompleted: completed,
            showHints: true,
        };
    }),
});
