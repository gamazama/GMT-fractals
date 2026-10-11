/**
 * Payload-track registry — track IDs whose keys carry app data.
 *
 * PURPOSE. A `Keyframe` may hold a `payload`: plain JSON the engine carries and never reads.
 * It is for a key whose real content does not fit one number — a camera view held as three
 * 256-bit integers is the first — while the key's `value` stays an ordinary number the
 * timeline can draw and ease. An app registers such a track on boot:
 *
 *   import { registerPayloadTrack } from '@engine/animation/payloadTrackRegistry';
 *   registerPayloadTrack('camera.depth');
 *
 * THE CONTRACT. Two halves, and only the second needs the registration.
 *
 *   1. CARRY, on every track. Every operation that keeps a key keeps its payload: a move in
 *      time, copy, paste, duplicate, loop, undo / redo, saving and loading a sequence, the
 *      `setFps(x, 'match')` retime, tangent and interpolation edits.
 *
 *   2. On a REGISTERED track the engine cannot make up a key, because it cannot make up the
 *      payload, and it cannot move a key's value, because the value and the payload are one
 *      thing said twice:
 *        - LOCK    a key's `value` changes only in a write that also carries a `payload`
 *                  (the app's own). Its time, handles and interpolation stay editable.
 *        - REFUSE  a key arrives only WITH a payload. `addKeyframe` without one is a no-op;
 *                  the recording `batchAddKeyframes*` actions skip the track; a wholesale
 *                  `replaceKeyframes` is dropped unless every key in it has a payload, which
 *                  is what stops Bake, Simplify, the Pencil and the smoothing brush.
 *        - Deleting a key is allowed.
 *
 * THE SEAM. The store enforces all of it (`store/animation/sequenceSlice.ts`, grep
 * `isPayloadTrack`), so a new tool is covered without knowing this file exists. The editors
 * check here too, only to leave a refused tool without side effects (no empty undo step, no
 * preview of a stroke that will not land) and to SHOW the lock: a drag in the graph editor
 * gives such a key no value, so it moves in time only (`draggedKeyValue` in
 * `utils/GraphUtils.ts`), and the key inspector's value field is read-only. Grep
 * `isPayloadTrack` under `hooks/`, `components/` and `utils/`. An app writes its keys with
 * `addKeyframe(trackId, frame, value, interpolation, payload)`, from the capture function it
 * hands to `setCameraKeyCaptureFn` when the track is a camera's.
 *
 * PITFALLS.
 *   - Register BEFORE keys are written. A key written without a payload while the track was
 *     unregistered stays as it is; nothing sweeps it afterwards.
 *   - The payload must survive `JSON.parse(JSON.stringify(x))`: undo and scene files go through
 *     it. A bigint does not — store it as a string.
 *   - A SHARE LINK is lossier than a scene file: `utils/UrlStateEncoder.ts` (grep `quantize`)
 *     rounds every number to 5 decimals and anything under 1e-9 to 0 — inside a payload, and a
 *     key's own `value` too — and drops object keys that begin with `is`. Strings pass
 *     untouched, so exact data belongs in strings.
 *   - `addKeyframe` WITH a payload keeps the value it is given. Without one, a key dropped
 *     between two Bezier keys takes the curve's value there instead (the de Casteljau split).
 *
 * @invariant A key keeps its payload through every store action that keeps the key, and a
 *   registered track takes no key without a payload and no change of value without one —
 *   proven by: npm run test:key-payload ("the payload is gone", "the value moved", "a key
 *   without a payload arrived").
 *
 * @invariant A drag in the graph editor gives a payload track's key no value
 *   (`draggedKeyValue`) — proven by: npm run test:log-curves ("[L] a drag gives a key of a
 *   payload track no value"). With that taken out the store above still holds the value.
 *
 * @assumption The editors' own early returns (the Pencil's target, the graph tools' targets,
 *   the dope sheet's add-a-key, the selection box's vertical handles, the inspector's read-only
 *   field) are wiring no node test reaches. If one is lost the store still refuses the write;
 *   what comes back is an empty undo step, or a field that looks editable.
 */

const payloadTracks = new Set<string>();

export function registerPayloadTrack(trackId: string): void {
    payloadTracks.add(trackId);
}

export function unregisterPayloadTrack(trackId: string): void {
    payloadTracks.delete(trackId);
}

export function isPayloadTrack(trackId: string): boolean {
    return payloadTracks.has(trackId);
}
