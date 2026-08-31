/**
 * Default preset fields registered at engine boot.
 *
 * These are the three non-feature scene fields that PresetLogic previously
 * hardcoded: cameraRot, targetDistance, and the savedCameras library. When
 * the @engine/camera core plugin is extracted, it will own these registrations
 * and this module goes away.
 *
 * See docs/history/engine/04_Core_Plugins.md § scene-io and
 * docs/history/engine/20_Fragility_Audit.md F3.
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
    //
    // Legacy presets (all formula defaultPresets) store a non-zero cameraPos
    // alongside sceneOffset. We absorb cameraPos into sceneOffset so the
    // runtime camera always stays at origin. Mirrors gmt-0.8.5 PresetLogic.ts.
    presetFieldRegistry.register({
        key: 'sceneOffset',
        serialize: (s) => (s as any).sceneOffset,
        deserialize: (p, set) => {
            const rawOffset = (p as any).sceneOffset;
            const rawPos = (p as any).cameraPos;
            if (!rawOffset && !rawPos) return;

            const off = rawOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
            const pos = rawPos  || { x: 0, y: 0, z: 0 };

            // Combine into a single unified world position, then re-split
            // into hi/lo for split-float precision (same logic as gmt-0.8.5).
            const totalX = off.x + (off.xL ?? 0) + pos.x;
            const totalY = off.y + (off.yL ?? 0) + pos.y;
            const totalZ = off.z + (off.zL ?? 0) + pos.z;

            const hiX = Math.fround(totalX), loX = totalX - hiX;
            const hiY = Math.fround(totalY), loY = totalY - hiY;
            const hiZ = Math.fround(totalZ), loZ = totalZ - hiZ;

            set({ sceneOffset: { x: hiX, y: hiY, z: hiZ, xL: loX, yL: loY, zL: loZ } });
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
    // activeCameraId is intentionally ephemeral — only the library roundtrips.
    presetFieldRegistry.register({
        key: 'savedCameras',
        serialize: (s) => {
            const list = (s as any).savedCameras;
            return Array.isArray(list) && list.length > 0 ? list : undefined;
        },
        deserialize: (p, set) => {
            if (p.savedCameras && Array.isArray(p.savedCameras) && p.savedCameras.length > 0) {
                // @invariant Rows MUST be normalised to the StateSnapshot shape
                //   (`{ id, label, state, createdAt }`) before they reach the store.
                //
                //   Commit 19e605a8 (2026-04-25, "Camera Manager: extract
                //   state-library primitive") changed the runtime shape from a FLAT
                //   `SavedCamera extends CameraState` to a wrapped snapshot, on the
                //   stated grounds that "SavedCameras aren't currently persisted, so
                //   no migration is needed". That was already untrue — flat rows were
                //   being written into the `<Scene>` block of .gmf files before that
                //   date — and `beeb90d9` later re-enabled the serialize side without
                //   adding one either.
                //
                //   Without this normalisation, loading such a file KILLS THE APP.
                //   Verified end to end against a real 2026-04-15 file through the
                //   real load path: the load itself is silent, but because we
                //   force-select row 0 below, StateLibraryPanel then calls
                //   `isModified` on it, `isCameraModified` dereferences `snap.state`,
                //   and the resulting throw unmounts the entire React root — there is
                //   no ErrorBoundary anywhere in this codebase. Measured: rootChildren
                //   1 -> 0, canvases 27 -> 0, frames frozen. Recall throws too.
                //
                //   `types/preset.ts` and `engine-gmt/types/fractal.ts` still declared
                //   the flat shape, so tsc could not catch any of this; both are
                //   corrected alongside this change.
                const rows = (p.savedCameras as any[]).map((row) => {
                    if (row && typeof row === 'object' && row.state) return row;
                    const { id, label, thumbnail, position, rotation, sceneOffset, targetDistance, optics } = row ?? {};
                    return {
                        id, label, thumbnail,
                        createdAt: Date.now(),
                        state: { position, rotation, sceneOffset, targetDistance, optics },
                    };
                });
                set({
                    savedCameras: rows as any,
                    // NOT rows[0]: force-selecting camera 1 on load marks the
                    // slot modified (*Camera 1) against a pose nothing chose.
                    activeCameraId: null,
                });
            }
        },
    });
};
