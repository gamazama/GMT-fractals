/**
 * Guard: a key can carry app data, and a track of such keys is locked.
 *
 * The contract is the header of `engine/animation/payloadTrackRegistry.ts`. Node only: the real
 * animation store, the real curve tools, the real camera-key registry and animation engine.
 *
 *   [A] CARRY. A payload survives every store action that keeps its key: a move in time,
 *       tangent and interpolation edits, copy / paste, duplicate, loop, undo / redo, a sequence
 *       saved as JSON and loaded again, and the `setFps(x, 'match')` retime.
 *   [B] LOCK and REFUSE, on a registered track. A value does not move unless the write carries a
 *       payload; no key arrives without one - not from `addKeyframe`, not from the recording
 *       batch actions, not from Bake, Simplify, the Pencil's fit or the smoothing tools; a copy
 *       that carries its payload is let in; deleting is allowed; a key written with a payload
 *       between two Bezier keys keeps the value it was given.
 *   [C] KEY CAM. The default capture leaves a payload track alone; an app's own capture writes
 *       the key with its payload through `addKeyframe`.
 *   [D] RECORDING THE CAMERA. While the timeline plays and the camera is recorded, a `camera.*`
 *       track registered with `releaseOnRecord: false` is still driven; the others are let go.
 *       (`engine/animation/cameraKeyRegistry.ts`, `AnimationEngine.scrub`.)
 *
 * Run: `npm run test:key-payload`
 *
 * ── FALSIFIED 2026-10-11 ─────────────────────────────────────────────────
 *   Each against one edit, restored after (42 checks in all):
 *   [A] `pasteKeyframes` without its payload line: 8 red - paste and duplicate lose it, and
 *       every later carry check then meets a key without one.
 *   [B] the slice made blind to the registry (`isPayloadTrack` stubbed false in
 *       sequenceSlice.ts): 12 red, every lock and every refusal - the three value writes,
 *       `addKeyframe`, the batch actions, Bake, both Simplifies, the Pencil, Smooth, Bounce.
 *   [C] the default capture without its skip: 1 red (it makes the track).
 *   [D] `scrub` without `heldOnRecord`: the held track is not driven (1 red); without the
 *       whole record-camera line: both "let go" checks red (2).
 */
import { useAnimationStore } from '../store/animationStore';
import { useEngineStore } from '../store/engineStore';
import { registerPayloadTrack } from '../engine/animation/payloadTrackRegistry';
import { registerCameraKeyTracks, captureCameraKeyFrame, setCameraKeyCaptureFn } from '../engine/animation/cameraKeyRegistry';
import { animationEngine } from '../engine/AnimationEngine';
import { binderRegistry } from '../engine/animation/binderRegistry';
import { calculateResampleUpdates, calculateSmoothingUpdates } from '../utils/timelineUtils';
import { simplifyTrack, fitSamplesToKeys, spliceSpan } from '../utils/CurveFitting';
import type { Keyframe } from '../types';

let pass = 0;
const fails: string[] = [];
const ck = (name: string, ok: boolean, detail = ''): void => { if (ok) pass++; else fails.push(detail ? `${name}: ${detail}` : name); };
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const anim = () => useAnimationStore.getState();
const keysOf = (tid: string): Keyframe[] => anim().sequence.tracks[tid]?.keyframes ?? [];
const TRACK = 'cam.depth', PLAIN = 'plain.value';
/** What a camera view too exact for one number looks like: 256-bit integers as strings. */
const view = (tag: string) => ({ tag, cam: ['57896044618658097711785492504343953926634992332820282019728792003956564819968', '-3', '12345678901234567890'], roll: 0.25 });
const tagOf = (k: Keyframe | undefined): string | undefined => (k?.payload as { tag?: string } | undefined)?.tag;
const keyAt = (tid: string, frame: number): Keyframe | undefined => keysOf(tid).find((k) => Math.abs(k.frame - frame) < 0.001);
/** Every key on the payload track still holds a whole payload, and the given tag sits at the given frame. */
const carried = (label: string, frame: number, tag: string): void => {
    const k = keyAt(TRACK, frame);
    ck(`[A] ${label}`, !!k && same(k.payload, view(tag)) && keysOf(TRACK).every((x) => same(x.payload, view(tagOf(x) ?? '?'))),
        `the payload is gone (frame ${frame} holds ${JSON.stringify(k?.payload)})`);
};

registerPayloadTrack(TRACK);
anim().addTrack(TRACK, 'Depth');
anim().addTrack(PLAIN, 'Plain');
anim().addKeyframe(TRACK, 0, 1, 'Bezier', view('k0'));
anim().addKeyframe(TRACK, 100, 1e-3, 'Bezier', view('k1'));
anim().addKeyframe(TRACK, 180, 1e-7, 'Bezier', view('k2'));
ck('[A] three keys written with their payloads', keysOf(TRACK).length === 3 && ['k0', 'k1', 'k2'].every((t, i) => tagOf(keysOf(TRACK)[i]) === t), JSON.stringify(keysOf(TRACK).map(tagOf)));

// ── [A] carry ──
const k1 = () => keysOf(TRACK).find((k) => tagOf(k) === 'k1') as Keyframe;
anim().updateKeyframes([{ trackId: TRACK, keyId: k1().id, patch: { frame: 90 } }]);
carried('a move in time', 90, 'k1');
anim().updateKeyframes([{ trackId: TRACK, keyId: k1().id, patch: { rightTangent: { x: 12, y: -0.5 }, autoTangent: false } }]);
carried('a handle edit', 90, 'k1');
anim().selectKeyframes(keysOf(TRACK).map((k) => `${TRACK}::${k.id}`), false);
anim().setTangents('Ease');
carried('a tangent mode (Ease)', 90, 'k1');
anim().setGlobalInterpolation('Linear');
anim().setGlobalInterpolation('Bezier', 'Auto');
carried('an interpolation change on every key', 90, 'k1');

anim().selectKeyframes([`${TRACK}::${k1().id}`], false);
anim().copySelectedKeyframes();
anim().pasteKeyframes(200);
carried('copy and paste', 200, 'k1');
ck('[A] the pasted key has the value of the key it copies', keyAt(TRACK, 200)?.value === 1e-3, `value ${keyAt(TRACK, 200)?.value}`);
anim().seek(250);
anim().duplicateSelection();
carried('duplicate', 250, 'k1');
anim().loopSelection(1);
carried('loop', 91, 'k1');

anim().removeKeyframe(TRACK, (keyAt(TRACK, 250) as Keyframe).id);         // takes its own undo snapshot
ck('[B] deleting a key is allowed', keyAt(TRACK, 250) === undefined && keysOf(TRACK).length === 5, `${keysOf(TRACK).length} keys`);
anim().undo();
carried('undo', 250, 'k1');
anim().redo();
carried('redo', 200, 'k1');
ck('[A] redo deleted the key again', keyAt(TRACK, 250) === undefined);
anim().undo();

const saved = JSON.parse(JSON.stringify(anim().sequence));
anim().setSequence({ durationFrames: 300, tracks: {} });
anim().setSequence(saved);
carried('a sequence saved as JSON and loaded', 250, 'k1');

anim().setFps(60, 'match');
carried("setFps(60, 'match')", 180, 'k1');                     // frame 90 at 30 fps
ck("[A] setFps(60, 'match') moved the keys and kept their values", keyAt(TRACK, 500)?.value === 1e-3 && keyAt(TRACK, 360)?.value === 1e-7, JSON.stringify(keysOf(TRACK).map((k) => [k.frame, k.value])));
anim().setFps(30, 'match');

// ── [B] lock and refuse ──
const before = () => JSON.stringify(keysOf(TRACK));
const first = () => keysOf(TRACK)[0];
anim().updateKeyframes([{ trackId: TRACK, keyId: first().id, patch: { value: 9 } }]);
ck('[B] updateKeyframes cannot move a value', first().value === 1, `the value moved to ${first().value}`);
anim().updateKeyframe(TRACK, first().id, { value: 9 });
ck('[B] updateKeyframe cannot move a value', first().value === 1, `the value moved to ${first().value}`);
const movedId = k1().id;                                       // the key at frame 90
anim().updateKeyframes([{ trackId: TRACK, keyId: movedId, patch: { frame: 95, value: 9 } }]);
ck('[B] a move in time and value moves in time only', keyAt(TRACK, 95)?.id === movedId && keyAt(TRACK, 95)?.value === 1e-3, `the value moved: ${JSON.stringify(keysOf(TRACK).find((k) => k.id === movedId))}`);
anim().updateKeyframes([{ trackId: TRACK, keyId: movedId, patch: { value: 2e-3, payload: view('k1b') } }]);
ck('[B] a write that carries a payload moves the value with it', keyAt(TRACK, 95)?.value === 2e-3 && tagOf(keyAt(TRACK, 95)) === 'k1b', JSON.stringify(keyAt(TRACK, 95)));

let was = before();
anim().addKeyframe(TRACK, 40, 0.5);
ck('[B] addKeyframe without a payload is refused', before() === was, 'a key without a payload arrived');
anim().addKeyframe(PLAIN, 40, 0.5);
ck('[B] ...and still works on an ordinary track', keysOf(PLAIN).length === 1);
anim().batchAddKeyframes(41, [{ trackId: TRACK, value: 0.5 }, { trackId: PLAIN, value: 0.6 }]);
anim().batchAddKeyframesRange(42, 44, [{ trackId: TRACK, value: 0.5 }, { trackId: PLAIN, value: 0.7 }]);
anim().batchAddKeyframesMultiRange([{ startFrame: 45, endFrame: 46, updates: [{ trackId: TRACK, value: 0.5 }, { trackId: PLAIN, value: 0.8 }] }]);
ck('[B] the recording batch actions skip the track', before() === was, 'a key without a payload arrived');
ck('[B] ...and still record an ordinary track', keysOf(PLAIN).length === 7, `${keysOf(PLAIN).length} keys`);

const baked = calculateResampleUpdates([TRACK, PLAIN], anim().sequence, 1);
anim().replaceKeyframes(baked);
ck('[B] Bake is refused', before() === was, 'a key without a payload arrived');
ck('[B] ...and bakes the ordinary track beside it', keysOf(PLAIN).length === 7 && keysOf(PLAIN).every((k) => k.interpolation === 'Linear' && baked[1].newKeys.includes(k)));
anim().replaceKeyframes([{ trackId: TRACK, newKeys: simplifyTrack(keysOf(TRACK), 0.01) }]);
ck('[B] Simplify is refused', before() === was, 'a key without a payload arrived');
anim().selectKeyframes(keysOf(TRACK).map((k) => `${TRACK}::${k.id}`), false);
anim().simplifySelectedKeys(0.01);
ck('[B] the store\'s own simplify leaves the track alone', before() === was, 'a key without a payload arrived');
const stroke = fitSamplesToKeys(Array.from({ length: 41 }, (_, i) => 0.5 + 0.3 * Math.sin(i / 6)), 20, 0.01, 'pen');
anim().replaceKeyframes([{ trackId: TRACK, newKeys: spliceSpan(keysOf(TRACK), 20, 60, stroke) as Keyframe[] }]);
ck('[B] a Pencil stroke is refused', before() === was, 'a key without a payload arrived');
for (const [label, radius] of [['Smooth', 2], ['Bounce', -2]] as const) {
    const patches = calculateSmoothingUpdates([TRACK], anim().sequence, [], radius);
    anim().updateKeyframes(patches);
    ck(`[B] ${label} cannot move a value (${patches.length} patches offered)`, patches.length > 0 && before() === was, patches.length ? 'the value moved' : 'the tool offered nothing, so nothing was tested');
}
const src = first();
anim().replaceKeyframes([{ trackId: TRACK, newKeys: [...keysOf(TRACK), { ...src, id: src.id + '-copy', frame: 33 }].sort((a, b) => a.frame - b.frame) }]);
ck('[B] a copy that carries its payload is let in', tagOf(keyAt(TRACK, 33)) === 'k0' && keyAt(TRACK, 33)?.value === 1, JSON.stringify(keyAt(TRACK, 33)));

// a key written WITH a payload keeps its value, even where an ordinary key is put on the curve
for (const tid of ['split.payload', 'split.plain']) {
    anim().addTrack(tid, tid);
    anim().addKeyframe(tid, 0, 0, 'Bezier', tid === 'split.payload' ? view('a') : undefined);
    anim().addKeyframe(tid, 100, 10, 'Bezier', tid === 'split.payload' ? view('b') : undefined);
}
anim().addKeyframe('split.payload', 50, 7.25, 'Bezier', view('mid'));
anim().addKeyframe('split.plain', 50, 7.25, 'Bezier');
ck('[B] a key written with a payload between two Bezier keys keeps its value', keyAt('split.payload', 50)?.value === 7.25, `the value moved to ${keyAt('split.payload', 50)?.value}`);
console.log(`    (for the record: the same key without a payload, on an ordinary track, lands at ${keyAt('split.plain', 50)?.value} - the curve's value, not the 7.25 it was given)`);

// ── [C] Key Cam ──
useEngineStore.setState({ camTest: { depth: 0.5, yaw: 1.5 } } as never);
registerPayloadTrack('camTest.depth');
registerCameraKeyTracks(['camTest.depth', 'camTest.yaw']);
captureCameraKeyFrame(10);
ck('[C] the default capture keys the ordinary camera track', keyAt('camTest.yaw', 10)?.value === 1.5, JSON.stringify(keysOf('camTest.yaw')));
ck('[C] ...and leaves the payload track alone', anim().sequence.tracks['camTest.depth'] === undefined, 'it made the track');
let handed: readonly string[] = [];
setCameraKeyCaptureFn((frame, tracks, opts) => {
    handed = tracks;
    if (!opts?.skipSnapshot) anim().snapshot();
    for (const tid of tracks) {
        if (!anim().sequence.tracks[tid]) useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, [tid]: { id: tid, type: 'float', label: tid, keyframes: [] } } } }));
        if (tid === 'camTest.depth') anim().addKeyframe(tid, frame, 1e-40, opts?.interpolation, view('shot'));
        else anim().addKeyframe(tid, frame, 2.5, opts?.interpolation);
    }
});
captureCameraKeyFrame(20, { interpolation: 'Linear' });
ck('[C] an app\'s own capture is handed every camera track', same(handed, ['camTest.depth', 'camTest.yaw']), JSON.stringify(handed));
ck('[C] ...and writes the key with its payload', keyAt('camTest.depth', 20)?.value === 1e-40 && same(keyAt('camTest.depth', 20)?.payload, view('shot')), `the payload is gone: ${JSON.stringify(keyAt('camTest.depth', 20))}`);

// ── [D] recording the camera ──
{
    const driven = new Set<string>();
    const tracks = ['camera.held', 'camera.loose', 'camera.stray', 'other.x'];
    const undo = tracks.map((id) => binderRegistry.register({ id, write: () => { driven.add(id); } }));
    registerCameraKeyTracks([{ id: 'camera.held', releaseOnRecord: false }, 'camera.loose', { id: 'camera.hidden', hidden: true }]);
    const key = (id: string): Keyframe => ({ id, frame: 0, value: 1, interpolation: 'Linear' });
    useAnimationStore.setState({ sequence: { durationFrames: 300, tracks: Object.fromEntries(tracks.map((id) => [id, { id, type: 'float' as const, label: id, keyframes: [key(id + '0')] }])) } });
    animationEngine.connect(useAnimationStore, useEngineStore);

    useAnimationStore.setState({ isPlaying: true, isRecording: true, recordCamera: true });
    animationEngine.scrub(5);
    ck('[D] a track held with releaseOnRecord: false is still driven while the camera is recorded', driven.has('camera.held'), 'camera.held is not driven');
    ck('[D] a registered camera track is let go', !driven.has('camera.loose'), 'camera.loose is still driven');
    ck('[D] an unregistered camera track is let go, as before', !driven.has('camera.stray'), 'camera.stray is still driven');
    ck('[D] a track that is not a camera track is driven, as before', driven.has('other.x'), 'other.x is not driven');

    driven.clear();
    useAnimationStore.setState({ isRecording: false });
    animationEngine.scrub(5);
    ck('[D] with recording off every track is driven', tracks.every((id) => driven.has(id)), [...driven].join(', '));
    useAnimationStore.setState({ isPlaying: false });
    undo.forEach((u) => u());
}

if (fails.length > 0) {
    console.error(`\n${fails.length} failed (${pass} passed):`);
    for (const f of fails) console.error('  FAIL: ' + f);
    process.exit(1);
}
console.log(`\nkey-payload: ${pass} checks passed`);
