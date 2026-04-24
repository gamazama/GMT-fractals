/**
 * @engine/camera — adapter-based camera slot + animation binding plugin.
 *
 * Apps register a CameraAdapter describing how to snapshot and restore
 * their camera state. The plugin provides operations that work on any
 * camera shape (2D pan/zoom, 3D orbit, 6-DOF, custom) via the adapter:
 *
 *   - Numbered slots 1-9: save current camera into a slot, recall later
 *   - Persistence: slots round-trip via the preset field registry
 *   - Hotkeys: Ctrl+1..9 save, 1..9 recall (opt-in via installCamera)
 *   - Animation tracks: the app's camera tracks register with the
 *     existing engine/animation/cameraKeyRegistry for TimelineToolbar's
 *     Key Cam button (already wired in phase 4b's timeline port)
 *
 * Design rationale: the two toy apps have fundamentally different camera
 * shapes (fluid-toy's 2D {center, zoom} vs fractal-toy's 3D orbit
 * {orbitTheta, orbitPhi, distance, fov, target}). GMT will later add
 * a full 6-DOF camera manager. A canonical-shape plugin would force
 * bad abstractions; instead, this plugin stores adapter-opaque JSON
 * state and lets the adapter own interpretation.
 *
 * The adapter pattern also means the plugin has NO knowledge of DDFS,
 * feature state shapes, or any app's camera model. A headless test
 * harness, a VR app, or a 2D side-scroller all plug in with the same API.
 */

import { useEngineStore } from '../../store/engineStore';
import { shortcuts } from './Shortcuts';
// NOTE: the preset-field registration for cameraSlots lives in
// `./camera/presetField.ts` as a standalone module. Importing THIS
// file pulls in useEngineStore, which constructs the store, which
// freezes the preset-field registry — so the field registration
// can't happen here. Apps import the presetField submodule as an
// early side effect (before any store-touching import) — see the
// pattern in fluid-toy/main.tsx + fractal-toy/main.tsx.

export interface CameraAdapter {
    /** Which DDFS feature holds the camera state (informational, for debug). */
    featureId: string;
    /** Snapshot the current camera state to a JSON-serializable blob. */
    captureState: () => Record<string, any>;
    /** Apply a previously-captured state back to the live store. */
    applyState: (state: Record<string, any>) => void;
}

export interface CameraSlot {
    id: string;
    label: string;
    state: Record<string, any>;
    timestamp: number;
}

let _adapter: CameraAdapter | null = null;
let _installed = false;

// Slot state lives in the store so it round-trips via the preset-field
// registry. Namespace it under cameraSlots (array-of-nullable; index 1-9).
const SLOT_COUNT = 10; // index 0 unused, slots 1-9

const getSlots = (): (CameraSlot | null)[] => {
    const s = useEngineStore.getState() as any;
    return s.cameraSlots ?? Array(SLOT_COUNT).fill(null);
};

const setSlots = (slots: (CameraSlot | null)[]) => {
    // Use raw set — slot state is UI meta, not a DDFS feature.
    (useEngineStore as any).setState({ cameraSlots: slots });
};

export const camera = {
    /** Adapter registration. Apps call this once at boot. */
    register(adapter: CameraAdapter) {
        _adapter = adapter;
    },

    /** Save the current camera into slot n (1..9). Optional label. */
    saveSlot(n: number, label?: string): boolean {
        if (!_adapter || n < 1 || n >= SLOT_COUNT) return false;
        const state = _adapter.captureState();
        const slot: CameraSlot = {
            id: `slot-${n}`,
            label: label ?? `Slot ${n}`,
            state,
            timestamp: Date.now(),
        };
        const slots = [...getSlots()];
        slots[n] = slot;
        setSlots(slots);
        return true;
    },

    /** Recall slot n. Returns true if the slot had state. */
    recallSlot(n: number): boolean {
        if (!_adapter || n < 1 || n >= SLOT_COUNT) return false;
        const slot = getSlots()[n];
        if (!slot) return false;
        _adapter.applyState(slot.state);
        return true;
    },

    /** Clear slot n. */
    clearSlot(n: number) {
        if (n < 1 || n >= SLOT_COUNT) return;
        const slots = [...getSlots()];
        slots[n] = null;
        setSlots(slots);
    },

    /** Snapshot-agnostic: dump all slot state for preset round-trip. */
    getAllSlots(): (CameraSlot | null)[] {
        return getSlots();
    },

    setAllSlots(slots: (CameraSlot | null)[]) {
        setSlots(slots);
    },
};

export interface InstallCameraOptions {
    /** Skip hotkey registration (app wants custom bindings). Default: false. */
    hideShortcuts?: boolean;
}

export const installCamera = (options: InstallCameraOptions = {}) => {
    if (_installed) return;
    _installed = true;

    // Preset field was registered at module load (side effect above).

    // Expose the plugin on window for dev-mode smoke tests. Harmless
    // in prod; some apps might even use it for keyboard shortcuts.
    if (typeof window !== 'undefined') {
        (window as any).__camera = camera;
    }

    if (options.hideShortcuts) return;

    // Hotkeys: Ctrl+1..9 save, 1..9 recall.
    for (let n = 1; n <= 9; n++) {
        shortcuts.register({
            id: `camera.save-slot-${n}`,
            key: `Mod+${n}`,
            description: `Save camera to slot ${n}`,
            category: 'Camera',
            handler: () => camera.saveSlot(n),
        });
        shortcuts.register({
            id: `camera.recall-slot-${n}`,
            key: `${n}`,
            description: `Recall camera slot ${n}`,
            category: 'Camera',
            handler: () => camera.recallSlot(n),
        });
    }
};

export const uninstallCamera = () => {
    for (let n = 1; n <= 9; n++) {
        shortcuts.unregister(`camera.save-slot-${n}`);
        shortcuts.unregister(`camera.recall-slot-${n}`);
    }
    _adapter = null;
    _installed = false;
};
