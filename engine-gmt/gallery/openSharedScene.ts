/**
 * Open a backend-stored shared scene (shared_scenes / the ?s=<id> link) INTO the
 * editor. Shared between the boot deep-link handler (app-gmt/main.tsx) and the
 * "My Fractals" overlay's Open action, so both take the identical path: fetch the
 * GMF by id → register its embedded-shader def if the registry doesn't have it →
 * loadScene. Because the GMF carries the full fused shader, this reconstructs ANY
 * scene (weaves, MB3D imports, Workshop formulas) without the def being
 * pre-registered — the same mechanism gallery/OAuth-stash loads use.
 */
import { loadGMFScene } from '../utils/FormulaFormat';
import { registry } from '../engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { useEngineStore } from '../../store/engineStore';
import { getSharedSceneById } from './sharedScene';

/**
 * Fetch a shared scene by id and load it. Returns true on success, false when no
 * such share exists (invalid/removed id). Throws on network/RPC failure so the
 * caller can distinguish "gone" from "couldn't reach the server".
 */
export async function openSharedSceneById(id: string): Promise<boolean> {
    const shared = await getSharedSceneById(id);
    if (!shared?.gmf_text) return false;
    const { def, preset } = loadGMFScene(shared.gmf_text);
    if (def && !registry.get(def.id)) {
        registry.register(def);
        FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
    }
    useEngineStore.getState().loadScene({ preset });
    return true;
}

/** Build the shareable link for a given id from the current origin. */
export function shareUrlForId(id: string): string {
    return `${window.location.origin}${window.location.pathname}?s=${id}`;
}
