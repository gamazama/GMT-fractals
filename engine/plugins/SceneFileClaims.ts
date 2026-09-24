/**
 * SceneFileClaims — lets an app take a file OFFERED TO THE SCENE LOADER before the scene loader
 * sees it.
 *
 * PURPOSE. The scene entrances read every file as a scene: `engine/components/SceneFileDropZone.tsx`
 * (a drop anywhere on the window), `SceneIO`'s stock File ▸ Load Scene row, and any app row that
 * replaces it — grep `claimSceneFiles(` for every entrance that offers. An app that also owns a
 * file kind the user will reasonably drop or pick there registers a claim; the claim decides by
 * the file's CONTENT whether it is one of its own, handles it, and hands back the rest. Engine-core
 * knows nothing about what any claim takes — grep `registerSceneFileClaim(` for who registers.
 *
 * SEAMS.
 *   - `registerSceneFileClaim({ id, take, hint? })` — idempotent by id (re-registering replaces in
 *     place, keeping its turn); returns an unregister thunk. Registration is never frozen: any
 *     time before the drop is fine. `hint` is the claim's few words on the drop scrim
 *     (`sceneFileClaimHints`), so the scrim says what a drop does without engine-core naming it.
 *   - `take(files)` is offered the files still unhandled, in drop order, and RESOLVES TO THE FILES
 *     IT DID NOT TAKE. It owns every message and side effect for what it took. The same contract
 *     as `useImageDrop`'s `preRoute` (palette/components/useImageDrop.ts), one level down.
 *   - `claimSceneFiles(files)` — what an entrance calls: every claim in registration order, each
 *     seeing what the previous ones left. An empty result means the files were handled and the
 *     entrance says nothing more. With no claim registered it returns `files` itself, so an app
 *     that registers none behaves exactly as before this seam existed.
 *
 * PITFALLS.
 *   - A claim can only REMOVE files. Whatever it resolves to is intersected with what it was
 *     offered (by identity, in offer order), so a claim cannot add, duplicate or substitute a
 *     file — a claim that wants to hand on a transformed file cannot do it through here.
 *   - A claim that throws or rejects is logged and treated as having taken NOTHING: its files go
 *     on to the next claim and the scene loader. So a claim must not throw AFTER a side effect, or
 *     the same file is handled twice.
 *   - A claim must never take a real scene. The scene loader reads any JSON as a preset, so a
 *     claim that sniffs loosely will steal scene files. Decide by an unambiguous content marker.
 *   - An entrance must read `DataTransfer.files` synchronously, BEFORE awaiting this: the
 *     browser empties the transfer once the drop event handler returns.
 *
 * @invariant claims run in registration order on what the previous one left, a claim can only
 *   remove files, a throwing claim takes nothing, and with no claim the input comes back
 *   untouched — proven by: `npm run test:scene-file-claims` ("[2] claims run in registration
 *   order, each on what the previous one left", "[3] a claim cannot add or substitute a file",
 *   "[4] a throwing claim takes nothing: …", "[1] no claim: the same array comes back").
 *   Falsified 2026-09-16 four ways, one break per clause, see that harness header. It does not
 *   reach the ENTRANCES that call this (the drop zone's `await` before its scene path, Load
 *   Scene's early return) — that wiring is a browser smoke of an app that registers a claim
 *   (grep `SceneFileDropZone` in `debug/`).
 */

import { createListRegistry } from '../../store/createListRegistry';

export interface SceneFileClaim {
    /** Stable id — the idempotent registration key and the name in a failure log. */
    id: string;
    /** Offered the unhandled files in drop order; resolves to the ones it did NOT take. */
    take: (files: File[]) => Promise<File[]>;
    /** What a drop does with the files this claim takes, in a few words, for the drop scrim's
     *  detail line beside the scene formats (e.g. "gradient files go to My Gradients"). Without
     *  one the scrim promises nothing for the claim — it still takes its files. */
    hint?: string;
}

const registry = createListRegistry<SceneFileClaim>();

/** Register a claim (idempotent by id). Returns an unregister thunk. */
export const registerSceneFileClaim = (claim: SceneFileClaim): (() => void) => registry.register(claim);

export const unregisterSceneFileClaim = (id: string): void => registry.unregister(id);

/** Every registered claim's `hint`, in registration order — what the drop scrim says a drop
 *  will do besides load a scene. Empty when no claim gave one. */
export const sceneFileClaimHints = (): string[] =>
    registry.getAll().map((c) => c.hint).filter((h): h is string => !!h);

/**
 * Offer files to every registered claim, in registration order. Resolves to the files no claim
 * took, in their original order — `files` itself when nothing was registered. Never rejects.
 */
export const claimSceneFiles = async (files: File[]): Promise<File[]> => {
    let rest = files;
    for (const claim of registry.getAll()) {
        if (!rest.length) break;
        try {
            const left = new Set(await claim.take(rest.slice()));
            rest = rest.filter((f) => left.has(f));
        } catch (err) {
            console.error(`[SceneFileClaims] claim "${claim.id}" failed; its files go on to the scene loader`, err);
        }
    }
    return rest;
};
