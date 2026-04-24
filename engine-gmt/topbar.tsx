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
import { useEngineStore } from '../store/engineStore';
import { useAnimationStore } from '../store/animationStore';
import { CenterHUD } from './topbar/CenterHUD';
import { ViewportQuality } from './topbar/ViewportQuality';

// ── Inline topbar items ────────────────────────────────────────────────

/**
 * Path Tracing toggle. Reads/writes `state.lighting.ptEnabled` — the
 * lighting feature is the authoritative owner of render-mode state.
 * Purple highlight matches GMT's original look.
 */
const PathTracingToggle: React.FC = () => {
    const ptEnabled = useEngineStore((s) => (s as any).lighting?.ptEnabled ?? false);
    const setLighting = useEngineStore((s) => (s as any).setLighting);

    if (!setLighting) return null;
    return (
        <button
            type="button"
            onClick={() => setLighting({ ptEnabled: !ptEnabled })}
            title="Path tracing — physically-based lighting with accumulation"
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded border transition-colors ${
                ptEnabled
                    ? 'bg-purple-500/30 text-purple-200 border-purple-500/40'
                    : 'bg-black/40 text-gray-400 border-white/10 hover:text-white hover:border-purple-500/40'
            }`}
        >
            PT
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
        resetCamera = () => { camera.recallSlot(0); },
    } = options;

    // ── Inline items (left slot) ───────────────────────────────────────
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
        id: 'camera-reset',
        type: 'button',
        label: 'Reset Position',
        onSelect: resetCamera,
    });

    menu.registerItem('camera', {
        id: 'camera-manager',
        type: 'button',
        label: 'Camera Manager',
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

    menu.registerItem('system', {
        id: 'formula-workshop',
        type: 'button',
        label: 'Formula Workshop…',
        onSelect: openFormulaWorkshop,
    });

    menu.registerItem('system', { id: 'sys-sep-toggles', type: 'separator' });

    menu.registerItem('system', {
        id: 'advanced-mode',
        type: 'toggle',
        label: 'Advanced Mode',
        title: 'Reveals advanced features and extra panels (e.g. Light).',
        isActive: () => useEngineStore.getState().advancedMode,
        onToggle: () => {
            const s = useEngineStore.getState();
            s.setAdvancedMode(!s.advancedMode);
        },
    });

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
        id: 'force-mobile',
        type: 'toggle',
        label: 'Force Mobile UI',
        title: 'Preview the mobile layout on desktop. Dev / debug only.',
        isActive: () => useEngineStore.getState().debugMobileLayout,
        onToggle: () => {
            const s = useEngineStore.getState();
            s.setDebugMobileLayout(!s.debugMobileLayout);
        },
    });
};
