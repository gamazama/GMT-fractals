/**
 * Default preset fields registered at engine boot.
 *
 * These are the three non-feature scene fields that PresetLogic previously
 * hardcoded: cameraRot, targetDistance, and the savedCameras library. When
 * the @engine/camera core plugin is extracted, it will own these registrations
 * and this module goes away.
 *
 * See docs/04_Core_Plugins.md § scene-io and docs/20_Fragility_Audit.md F3.
 */

import { presetFieldRegistry } from './PresetFieldRegistry';

export const registerDefaultPresetFields = () => {
    // ── Camera rotation (quaternion) ─────────────────────────────────────
    presetFieldRegistry.register({
        key: 'cameraRot',
        serialize: (s) => s.cameraRot,
        deserialize: (p, set) => {
            if (p.cameraRot) set({ cameraRot: p.cameraRot });
        },
    });

    // ── Camera target distance (surface distance from probe) ─────────────
    presetFieldRegistry.register({
        key: 'targetDistance',
        serialize: (s) => s.targetDistance,
        deserialize: (p, set) => {
            if (p.targetDistance !== undefined) set({ targetDistance: p.targetDistance });
        },
    });

    // ── Scene offset (split-float treadmill world position) ──────────────
    // Apps that use GMT's VirtualSpace treadmill keep the camera at origin
    // and move the world via sceneOffset (hi/lo split-floats for deep-zoom
    // precision). 2D apps leave this undefined at both save and load, so
    // the field is a no-op for them.
    presetFieldRegistry.register({
        key: 'sceneOffset',
        serialize: (s) => (s as any).sceneOffset,
        deserialize: (p, set) => {
            const off = (p as any).sceneOffset;
            if (off) set({ sceneOffset: off });
        },
    });

    // ── Camera mode (Orbit / Fly) ────────────────────────────────────────
    presetFieldRegistry.register({
        key: 'cameraMode',
        serialize: (s) => (s as any).cameraMode,
        deserialize: (p, set) => {
            const mode = (p as any).cameraMode;
            if (mode) set({ cameraMode: mode });
        },
    });

    // ── Saved camera library ─────────────────────────────────────────────
    // NOTE: historically loaded-only (getPreset never serialized it). Preserving
    // that asymmetry for now — fixing it is a separate decision, not F3 scope.
    presetFieldRegistry.register({
        key: 'savedCameras',
        serialize: () => undefined,
        deserialize: (p, set) => {
            if (p.savedCameras && Array.isArray(p.savedCameras) && p.savedCameras.length > 0) {
                set({
                    savedCameras: p.savedCameras as any,
                    activeCameraId: (p.savedCameras[0] as any).id || null,
                });
            }
        },
    });
};
