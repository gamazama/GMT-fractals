/**
 * GMT-specific topbar content — registers inline items (Path Tracing,
 * Playing badge) and the System + Camera menus into the engine's
 * topbar + menu plugins. Call `registerGmtTopbar()` once at app boot
 * AFTER `installTopBar()`, `installMenu()`, and `installCamera()`.
 *
 * What's already in the engine's topbar (no port needed):
 *   - ProjectName (editable, left)
 *   - Pause button + sample-cap popover (right) via installPauseControls
 *   - FPS counter, Adaptive badge (right) via installViewport
 *   - Save / Load / Quick-PNG (right) via installSceneIO
 *   - Undo / Redo (right) via installUndo
 *   - Help menu (rightmost) via installHelp
 *
 * What this file adds:
 *   - Left slot: Path Tracing toggle, Playing badge
 *   - Right slot: Camera menu (order 29), System menu (order 30).
 *     Help stays rightmost at order 40.
 */

import React from 'react';
import { useSyncExternalStore } from 'react';
import { menu } from '../engine/plugins/Menu';
import { topbar } from '../engine/plugins/TopBar';
import { camera } from '../engine/plugins/Camera';
import { GmtLogo } from './topbar/Logo';
import { useEngineStore } from '../store/engineStore';
import { useAnimationStore } from '../store/animationStore';
import { registry } from './engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { featureRegistry } from '../engine/FeatureSystem';
import { CenterHUD } from './topbar/CenterHUD';
import { ViewportQuality } from './topbar/ViewportQuality';
import BucketRenderSettingsPopup from './topbar/BucketRenderControls';
import { toggleHardwarePrefs } from './components/HardwarePrefsHost';

// ── Inline topbar items ────────────────────────────────────────────────

/**
 * Path Tracing toggle. Flips `state.renderMode` between 'Direct' and
 * 'PathTracing'. engine-gmt/renderer/bindings.ts subscribes to this and
 * forwards to `setLighting({ renderMode: 0|1 })`, which fires a compile
 * via the DDFS onUpdate:'compile' path.
 *
 * `lighting.ptEnabled` is a separate compile-time flag that controls
 * whether the PT module is linked into the shader at all — it's
 * default-true and stays on; flipping it would add a second compile
 * hop for no user-visible benefit. Purple highlight matches GMT.
 */
const PathTracingToggle: React.FC = () => {
    const renderMode = useEngineStore((s) => s.renderMode);
    const setRenderMode = useEngineStore((s) => s.setRenderMode);
    const active = renderMode === 'PathTracing';

    return (
        <button
            type="button"
            onClick={() => setRenderMode(active ? 'Direct' : 'PathTracing')}
            title="Path tracing — physically-based lighting with accumulation"
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded border transition-colors ${
                active
                    ? 'bg-purple-500/30 text-purple-200 border-purple-500/40'
                    : 'bg-black/40 text-gray-400 border-white/10 hover:text-white hover:border-purple-500/40'
            }`}
        >
            PT
        </button>
    );
};

/**
 * Bucket Render button — opens the tiled-render settings popover.
 * The popover component itself (BucketRenderSettingsPopup) comes
 * verbatim from GMT; this wrapper owns the open-state + anchor.
 */
const BucketRenderToggle: React.FC = () => {
    const isBucketRendering = useEngineStore((s) => (s as any).isBucketRendering);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const id = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
        return () => { clearTimeout(id); document.removeEventListener('mousedown', onClick); };
    }, [open]);

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                title="Render!"
                className={`flex items-center justify-center p-1 rounded border transition-colors ${
                    isBucketRendering
                        ? 'text-cyan-300 bg-cyan-900/30 border-cyan-500/40 animate-pulse'
                        : open
                            ? 'text-cyan-300 border-cyan-500/40'
                            : 'text-gray-500 border-white/10 hover:text-white hover:border-cyan-500/40'
                }`}
            >
                <RenderGridIcon />
            </button>
            {open && (
                <div
                    className="absolute top-full left-0 mt-2 z-50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <BucketRenderSettingsPopup />
                </div>
            )}
        </div>
    );
};

/**
 * Render Region toggle — click cycles None → Selecting → Active → None.
 * When Active, `state.renderRegion` is set and the worker renders only
 * that crop; clicking again clears it. When Selecting, user drags in
 * the viewport to define the rectangle (picked up by whatever region-
 * selection handler the app wires — e.g. the BucketRender flow, pending
 * port, or a simple drag overlay).
 */
const RenderRegionToggle: React.FC = () => {
    const region = useEngineStore((s) => s.renderRegion);
    const mode = useEngineStore((s) => s.interactionMode);
    const setInteractionMode = useEngineStore((s) => s.setInteractionMode);
    const setRenderRegion = useEngineStore((s) => s.setRenderRegion);

    const selecting = mode === 'selecting_region';
    const active = !!region;

    const onClick = () => {
        if (active) { setRenderRegion(null); return; }
        setInteractionMode(selecting ? 'none' : 'selecting_region');
    };

    const cls = active
        ? 'text-green-400 bg-green-900/30 border border-green-500/30'
        : selecting
            ? 'text-cyan-400 bg-cyan-900/30 border border-cyan-500/30'
            : 'text-gray-500 border border-white/10 hover:text-white hover:border-cyan-500/40';
    const title = active ? 'Clear Region' : selecting ? 'Cancel Selection' : 'Select Render Region';

    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`flex items-center justify-center p-1 rounded transition-colors ${cls}`}
        >
            {active ? <CloseRegionIcon /> : <CropIcon />}
        </button>
    );
};

/**
 * "Playing" indicator — small pulsing green badge when the timeline is
 * advancing. Pure read from useAnimationStore; no interaction.
 */
const PlayingBadge: React.FC = () => {
    const isPlaying = useSyncExternalStore(
        useAnimationStore.subscribe,
        () => useAnimationStore.getState().isPlaying,
        () => useAnimationStore.getState().isPlaying,
    );
    if (!isPlaying) return null;
    return (
        <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-green-300 bg-green-500/20 border border-green-500/40 rounded animate-pulse">
            ● Playing
        </span>
    );
};

// ── Menu icons (minimal inline SVG — no external dep) ──────────────────

const RenderGridIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <path d="M3 14h7v7H3z" fill="currentColor" stroke="none" />
    </svg>
);

const CropIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
);
const CloseRegionIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
);

const CameraIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

const MenuIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

// ── Public entry ───────────────────────────────────────────────────────

export interface GmtTopbarOptions {
    /** Called when user picks "Camera Manager" — app opens the panel.
     *  Default: no-op (panel not yet registered in this phase). */
    openCameraManager?: () => void;
    /** Called when user picks "Formula Workshop" — app opens Workshop.
     *  Default: no-op (Workshop deferred). */
    openFormulaWorkshop?: () => void;
    /** Called when user picks "Reset Camera Position" — app resets view.
     *  Default: recalls slot 0 if set, else no-op. */
    resetCamera?: () => void;
}

export const registerGmtTopbar = (options: GmtTopbarOptions = {}): void => {
    const {
        openCameraManager = () => console.info('[gmt] Camera Manager panel not registered yet'),
        openFormulaWorkshop = () => console.info('[gmt] Formula Workshop not yet ported'),
        resetCamera = () => {
            // Restore the camera to the current formula's defaultPreset pose.
            // Mirrors GMT's Reset Position — each formula's preset carries
            // a tuned camera (sceneOffset + rotation + targetDistance) that
            // frames the fractal well for its default look.
            const s = useEngineStore.getState();
            const def = registry.get(s.formula as any);
            const preset = def?.defaultPreset as any;
            if (!preset) {
                console.warn('[gmt] Reset Position — no defaultPreset on current formula');
                return;
            }
            const rotation = preset.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
            const sceneOffset = preset.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
            const targetDistance = preset.targetDistance ?? 3.5;
            useEngineStore.setState({ cameraRot: rotation, sceneOffset, targetDistance } as any);
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, {
                position: { x: 0, y: 0, z: 0 },
                rotation,
                sceneOffset,
                targetDistance,
            } as any);
        },
    } = options;

    // ── Inline items (left slot) ───────────────────────────────────────
    // Formula picker lives inside the Formula panel (via FormulaSelect
    // widget slotted via widgets.before in engine-gmt/panels.ts), not
    // in the topbar — matches GMT's layout.

    // GMT wordmark — leftmost item, ahead of the engine's default
    // project-name (order 0). Mirrors gmt-0.8.5/components/topbar/
    // RenderTools.tsx which had the wordmark inline before the
    // project-name pill.
    topbar.register({
        id: 'gmt-logo',
        slot: 'left',
        order: -10,
        component: GmtLogo,
    });

    topbar.register({
        id: 'gmt-viewport-quality',
        slot: 'left',
        order: 5,
        component: ViewportQuality,
    });
    topbar.register({
        id: 'gmt-path-tracing',
        slot: 'left',
        order: 10,
        component: PathTracingToggle,
    });
    topbar.register({
        id: 'gmt-playing-badge',
        slot: 'left',
        order: 20,
        component: PlayingBadge,
    });
    topbar.register({
        id: 'gmt-render-region',
        slot: 'left',
        order: 25,
        component: RenderRegionToggle,
    });
    topbar.register({
        id: 'gmt-bucket-render',
        slot: 'left',
        order: 30,
        component: BucketRenderToggle,
    });

    // ── Center slot — Light Studio HUD ─────────────────────────────────
    // Vibration feedback callback — noop here; apps that want haptic
    // feedback on mobile override this via GmtTopbarOptions later.
    const CenterHUDWrapper: React.FC = () => (
        <CenterHUD isMobileMode={false} vibrate={() => {}} />
    );
    topbar.register({
        id: 'gmt-center-hud',
        slot: 'center',
        order: 0,
        component: CenterHUDWrapper,
    });

    // ── Camera menu (right slot, before System) ────────────────────────
    menu.register({
        id: 'camera',
        slot: 'right',
        order: 29,
        icon: CameraIcon,
        title: 'Camera',
        align: 'end',
        width: 'w-56',
    });

    menu.registerItem('camera', {
        id: 'camera-undo',
        type: 'button',
        label: 'Undo Move',
        shortcut: 'Ctrl+Shift+Z',
        title: 'Revert the last camera movement',
        onSelect: () => { (useEngineStore.getState() as any).undoCamera?.(); },
        disabled: () => ((useEngineStore.getState() as any).undoStack?.length ?? 0) === 0,
    });

    menu.registerItem('camera', {
        id: 'camera-redo',
        type: 'button',
        label: 'Redo Move',
        shortcut: 'Ctrl+Shift+Y',
        title: 'Re-apply a reverted camera movement',
        onSelect: () => { (useEngineStore.getState() as any).redoCamera?.(); },
        disabled: () => ((useEngineStore.getState() as any).redoStack?.length ?? 0) === 0,
    });

    menu.registerItem('camera', { id: 'camera-sep-reset', type: 'separator' });

    menu.registerItem('camera', {
        id: 'camera-reset',
        type: 'button',
        label: 'Reset Position',
        onSelect: resetCamera,
    });

    menu.registerItem('camera', {
        id: 'camera-manager',
        type: 'button',
        label: 'View Manager',
        onSelect: openCameraManager,
    });

    menu.registerItem('camera', { id: 'camera-sep-slots', type: 'separator' });
    menu.registerItem('camera', { id: 'camera-slots-section', type: 'section', label: 'Camera Slots' });

    // Slots 1..9 as individual items — GMT's pattern. Each is dynamic:
    // label shows "Slot N" when empty, "Slot N ✓" when filled. Click
    // recalls, Shift+click saves (matches the Ctrl+N / N hotkeys GMT
    // wires via installCamera).
    for (let n = 1; n <= 9; n++) {
        menu.registerItem('camera', {
            id: `camera-slot-${n}`,
            type: 'button',
            label: `Slot ${n}`,
            shortcut: `${n}`,
            title: `Click to recall • Shift+click to save • Ctrl+${n} also saves, ${n} also recalls`,
            onSelect: () => {
                // Standard click recalls.
                if (!camera.recallSlot(n)) {
                    // Empty slot — offer to save instead.
                    camera.saveSlot(n);
                }
            },
            disabled: () => {
                // Always enabled for save; disabled-look only while empty
                // is misleading since we fall back to save. Leave enabled.
                return false;
            },
        });
    }

    // ── System menu (right slot, between Camera and Help) ──────────────
    menu.register({
        id: 'system',
        slot: 'right',
        order: 30,
        icon: MenuIcon,
        title: 'System',
        align: 'end',
        width: 'w-64',
    });

    // --- File actions -------------------------------------------------
    menu.registerItem('system', {
        id: 'share-link',
        type: 'button',
        label: 'Copy Share Link',
        title: 'Copy a URL that reproduces the current scene.',
        onSelect: async () => {
            try {
                const share = (useEngineStore.getState() as any).getShareString?.();
                if (!share) return;
                const url = `${window.location.origin}${window.location.pathname}#s=${share}`;
                await navigator.clipboard.writeText(url);
                console.info('[gmt] Share URL copied to clipboard');
            } catch (err) {
                console.error('[gmt] Share link copy failed:', err);
            }
        },
    });

    menu.registerItem('system', {
        id: 'formula-workshop',
        type: 'button',
        label: 'Formula Workshop…',
        onSelect: openFormulaWorkshop,
    });

    menu.registerItem('system', {
        id: 'hardware-settings',
        type: 'button',
        label: 'Hardware Settings…',
        title: 'GPU caps + quality-tier thresholds.',
        onSelect: () => { toggleHardwarePrefs(); },
    });

    menu.registerItem('system', { id: 'sys-sep-toggles', type: 'separator' });

    // --- Dynamic feature toggles --------------------------------------
    // Each feature that declares `menuConfig` gets an auto-toggle here.
    // `toggleParam` names the boolean param on the feature slice that
    // the toggle flips (audio.isEnabled, drawing.enabled, etc.).
    // `advancedOnly` gates the row behind `state.advancedMode`.
    featureRegistry.getMenuFeatures().forEach((feat) => {
        menu.registerItem('system', {
            id: `feature-${feat.id}`,
            type: 'toggle',
            label: feat.label,
            when: feat.advancedOnly
                ? () => useEngineStore.getState().advancedMode
                : undefined,
            isActive: () => {
                const slice: any = (useEngineStore.getState() as any)[feat.id];
                return !!slice?.[feat.toggleParam];
            },
            onToggle: () => {
                const s = useEngineStore.getState() as any;
                const slice: any = s[feat.id];
                const cur = !!slice?.[feat.toggleParam];
                const setter = s[`set${feat.id.charAt(0).toUpperCase()}${feat.id.slice(1)}`];
                if (typeof setter === 'function') setter({ [feat.toggleParam]: !cur });
            },
        });
    });

    menu.registerItem('system', { id: 'sys-sep-prefs', type: 'separator' });

    // --- Prefs toggles -----------------------------------------------
    menu.registerItem('system', {
        id: 'invert-y',
        type: 'toggle',
        label: 'Invert Look Y',
        title: 'Invert vertical mouse-look direction in Fly camera mode.',
        isActive: () => useEngineStore.getState().invertY,
        onToggle: () => {
            const s = useEngineStore.getState();
            s.setInvertY(!s.invertY);
        },
    });

    menu.registerItem('system', {
        id: 'broadcast-mode',
        type: 'toggle',
        label: 'Hide Interface',
        shortcut: 'B',
        title: 'Hide all UI for recording / broadcasting.',
        isActive: () => useEngineStore.getState().isBroadcastMode,
        onToggle: () => {
            const s = useEngineStore.getState();
            s.setIsBroadcastMode(!s.isBroadcastMode);
        },
    });

    menu.registerItem('system', {
        id: 'advanced-mode',
        type: 'toggle',
        label: 'Advanced Mode',
        title: 'Reveals advanced features and extra panels (e.g. Light, Engine Config).',
        isActive: () => useEngineStore.getState().advancedMode,
        onToggle: () => {
            const s = useEngineStore.getState();
            s.setAdvancedMode(!s.advancedMode);
        },
    });

    // --- Advanced subsection (visible only when advancedMode=true) ----
    menu.registerItem('system', {
        id: 'sys-sep-advanced',
        type: 'separator',
        when: () => useEngineStore.getState().advancedMode,
    });
    menu.registerItem('system', {
        id: 'sys-advanced-section',
        type: 'section',
        label: 'Advanced',
        when: () => useEngineStore.getState().advancedMode,
    });

    // Engine Settings toggle — reveals the Engine panel (the bespoke
    // compile-time feature toggles panel). Flips engineSettings.showEngineTab
    // which the panel manifest's `showIf: 'engineSettings.showEngineTab'`
    // watches.
    menu.registerItem('system', {
        id: 'engine-settings',
        type: 'toggle',
        label: 'Engine Config Panel',
        title: 'Show the bespoke Engine panel (compile-time toggles + profiles).',
        when: () => useEngineStore.getState().advancedMode,
        isActive: () => !!(useEngineStore.getState() as any).engineSettings?.showEngineTab,
        onToggle: () => {
            const s = useEngineStore.getState() as any;
            const cur = !!s.engineSettings?.showEngineTab;
            s.setEngineSettings?.({ showEngineTab: !cur });
            // Surface the left dock + switch to Engine when revealing
            // (matches the View Manager / Camera Manager flow). Closing
            // hides the tab via the manifest's showIf.
            if (!cur) s.togglePanel?.('Engine', true);
        },
    });

    menu.registerItem('system', {
        id: 'mesh-export',
        type: 'button',
        label: 'Mesh Export…',
        title: 'Convert the current fractal to a VDB mesh (Pro).',
        when: () => useEngineStore.getState().advancedMode,
        onSelect: () => console.info('[app-gmt] Mesh Export pending port'),
    });

    menu.registerItem('system', {
        id: 'force-mobile',
        type: 'toggle',
        label: 'Force Mobile UI',
        title: 'Preview the mobile layout on desktop. Dev / debug only.',
        when: () => useEngineStore.getState().advancedMode,
        isActive: () => useEngineStore.getState().debugMobileLayout,
        onToggle: () => {
            const s = useEngineStore.getState();
            s.setDebugMobileLayout(!s.debugMobileLayout);
        },
    });
};
