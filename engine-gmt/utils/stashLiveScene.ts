/**
 * stashLiveScene — capture the scene as it is right now into a `sceneStash` slot. The one
 * writer for both reasons: Google sign-in (`engine-gmt/auth/AuthOverlay.tsx`) and the Gradient
 * Explorer trip (`app-gmt/explorerTrip.ts`). Kept apart from `sceneStash.ts` so that file stays
 * free of the store and runs under node.
 *
 * What is captured: `getPreset()` — the whole scene, WITHOUT the non-DDFS documents (My
 * Gradients). A restore goes through `loadPreset`, whose `restoreDocuments` MERGES a Favients
 * snapshot into the shelf, so a stash that carried it would resurrect every gradient deleted
 * while the scene was away. The shelf is shared through its own localStorage key and never needs
 * a ride.
 *
 * The camera is flushed first (`flushCameraToStore`): Navigation debounces the live pose into the
 * store every 100 ms, so without the flush a stash taken within 100 ms of a camera move would
 * carry the previous pose. SceneIO's save path does the same (grep `onBeforeSerialize`).
 */
import { saveGMFScene } from './FormulaFormat';
import { flushCameraToStore } from '../store/cameraSlice';
import { useEngineStore } from '../../store/engineStore';
import { writeSceneStash, type SceneStashReason } from './sceneStash';

/** Returns whether the stash landed. Never throws: a failure is logged and reported as false. */
export const stashLiveScene = (reason: SceneStashReason): boolean => {
    try {
        flushCameraToStore();
    } catch (err) {
        // No live camera (the viewport is not mounted): the store's pose is the best there is.
        console.warn('[sceneStash] camera flush failed; stashing the stored pose', err);
    }
    try {
        const st = useEngineStore.getState() as unknown as {
            getPreset?: () => unknown;
            isSceneDirty?: () => boolean;
        };
        const preset = st.getPreset?.();
        if (!preset) return false;
        return writeSceneStash(reason, saveGMFScene(preset as Parameters<typeof saveGMFScene>[0]), {
            dirty: !!st.isSceneDirty?.(),
        });
    } catch (err) {
        console.warn(`[sceneStash] failed to stash the scene (${reason}):`, err);
        return false;
    }
};
