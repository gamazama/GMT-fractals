/**
 * MB3D sample-scene thumbnail path helpers — the single source of the safe-id
 * transform shared by the offline render script (debug/mb3d-scene-thumbs.mts)
 * and the unified <FormulaPicker>'s "Mandelbulb3D" catalog group.
 *
 * A committed thumbnail lives at public/thumbnails/mb3d-scenes/<safeId>.jpg.
 * There is deliberately NO index.json: the picker's SceneCard falls back to a
 * cube icon when the <img> 404s, so a scene that renders empty (or hasn't been
 * rendered yet) simply shows the icon and is still click-to-load.
 */

/** Committed-thumbnail filename stem for a sample-scene name. MUST stay in
 *  lockstep with `safeId` in debug/mb3d-scene-thumbs.mts. */
export function mb3dSceneThumbSafeId(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_');
}

/** Committed thumbnail URL (relative to the app base) for a sample-scene name. */
export function mb3dSceneThumbSrc(name: string): string {
  return `thumbnails/mb3d-scenes/${mb3dSceneThumbSafeId(name)}.jpg`;
}
