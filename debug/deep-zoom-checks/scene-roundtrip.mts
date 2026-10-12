/**
 * scene-roundtrip check: what a scene carries comes back as it was written. Node only, the real
 * engine store, the real preset fields, document provider, route and session adapter; a fake host.
 *
 *   npx tsx debug/deep-zoom-checks/scene-roundtrip.mts      (npm run check:deep-zoom-scene-roundtrip)
 *
 * This app's places are 256-bit numbers written as text. A scene - File > Save Scene, a scene PNG,
 * and since 2026-10-12 the session kept across a reload (deep-zoom/session.ts) - must hand every
 * one of them back byte for byte; one pass through a float moves a deep camera off its place.
 *
 *   [1] scene     a deep view with a roll and a Julia constant, the formula in Julia mode, a saved
 *                 location and a route of three keyframes go through `getPreset` -> the scene's
 *                 text -> `parseSceneJson` -> `loadPreset`: the camera, the constant, the
 *                 location's row and every keyframe's payload come back string for string, the
 *                 angles to the last digit, and the scene carries its version stamp. The store's
 *                 three number rows for the constant come back as the loaded constant's doubles,
 *                 and a jump to the saved place writes them too.
 *   [2] parked    a view that was loaded and that no ready renderer has taken yet is what a scene
 *                 written meanwhile holds; once a ready renderer has it, the renderer's own view is.
 *   [3] session   the session's body is the scene `getPreset` writes, without the documents; it
 *                 survives the engine's envelope as text; a body whose view is number-mangled, a
 *                 body of something else and another version are refused.
 *
 * FALSIFIED 2026-10-12, three breaks, one a run, each file restored byte for byte (md5):
 *   - deep-zoom/presetFields.ts, the `if (parked && parkedSaved) return parkedSaved;` line taken
 *     out of `serialize` -> 2 red: "parked: a scene written before the renderer is ready holds the
 *     view that was loaded, not the renderer's start view" (it held the start view's strings) and
 *     "parked: with no renderer at all it holds the loaded view too".
 *   - deep-zoom/presetFields.ts, the Julia constant left out of what `serialize` writes -> 5 red:
 *     "scene: the Julia constant comes back, three strings byte for byte, and reaches the
 *     renderer", the same two "parked: ..." lines (they compare the constant too), and "session:
 *     through the envelope and back ..." and "session: applied at boot ...".
 *   - deep-zoom/session.ts, the view's test taken out of `validate` -> 1 red: "session: a body
 *     whose camera went through numbers is refused (a clean start, never a wrong place)".
 * NOT broken on purpose, so not known to be able to go red: the camera strings and the angles of
 * [1], the saved location's row, "scene: every keyframe's payload comes back byte for byte" (the
 * sequence is the engine's to carry), the version stamp, and the session's other refusals.
 * THE CONSTANT'S ROW (2026-10-12, later; deep-zoom/features/formula.ts): two lines of [1] say the
 * store's three number rows follow a view that carries a Julia constant - "scene: the Constant row
 * follows the loaded view ..." (deep-zoom/presetFields.ts) and "place: a jump to a Julia place
 * writes the Constant row from its view ..." (deep-zoom/locations.ts). NEITHER IS KNOWN TO GO RED
 * FOR A HAND-OVER THAT FORGETS THE ROWS. The one break spent near them (`juliaRowsOf` made to
 * answer 0, 0, 0) turned the "scene: ..." line red only through its side test that the wanted
 * doubles are not 0, and left the "place: ..." line green: both then took the wanted doubles from
 * the function under test. They work them out themselves now, and that form was not run against
 * a break.
 */
import { featureRegistry } from '../../engine/FeatureSystem';
import { DzFormulaFeature } from '../../deep-zoom/features/formula';
import { DzCameraFeature } from '../../deep-zoom/features/camera';
import { DzLightFeature } from '../../deep-zoom/features/light';
import { DzColourFeature } from '../../deep-zoom/features/colour';
import { DzQualityFeature } from '../../deep-zoom/features/quality';
import { DzInspectFeature } from '../../deep-zoom/features/inspect';
import { useEngineStore, bindStoreToEngine } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { parseSceneJson, serializeScene } from '../../utils/SceneFormat';
import { decodeSession, encodeSession } from '../../store/sessionEnvelope';
import { readSession } from '../../engine/plugins/Session';
import { setHost } from '../../deep-zoom/host/current';
import type { DeepZoomHost, DzView } from '../../deep-zoom/host/DeepZoomHost';
import { DZ_SCENE_VERSION } from '../../deep-zoom/presetFields';
import type { DzSavedView } from '../../deep-zoom/presetFields';
import { installRoute, noteMove, routeKeys, setKeyframe } from '../../deep-zoom/route';
import { installShare } from '../../deep-zoom/share';
import { jumpTo } from '../../deep-zoom/locations';
import type { DzLocation } from '../../deep-zoom/locations';
import { DZ_SESSION_FORMAT, dzSessionAdapter } from '../../deep-zoom/session';
import type { Preset } from '../../types';

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

// ── the places ───────────────────────────────────────────────────────────────────────────────────
type Triple = [string, string, string];
/** 77 digits each: a place 6.6e-35 deep keeps its meaning only in the last 40 or so. */
const CAM_A: Triple = [
    '-19106688270107545123610310944093228319268234083931764161217485625786859879978',
    '2056390632353041980388441420253193046898375110266709396020905008395931668174',
    '106035815535807686550824900054021630250672589610944549407697460964969796977517',
];
const shifted = (c: Triple, by: bigint): Triple => c.map((s) => String(BigInt(s) + by)) as Triple;
const CAM_B = shifted(CAM_A, 3n), CAM_C = shifted(CAM_A, 7n), CAM_START: Triple = ['0', '0', String(3n << 255n)];
const JULIA: Triple = [CAM_A[1], '-' + CAM_A[2], CAM_A[0]];
const sameTriple = (a: unknown, b: readonly string[]): boolean => Array.isArray(a) && a.length === 3 && a.every((v, i) => v === b[i]);
const lookFields = { iters: 61, power: 6, phase: [0.125, -0.25] as [number, number], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1 };
/** Angles that no five-decimal encoder could carry. */
const VIEW_A: DzView = { cam: CAM_A, yaw: -1.0123456789012345, pitch: 0.33333333333333337, roll: 0.2500000000000001, julia: JULIA, ...lookFields };
const START: DzView = { cam: CAM_START, yaw: 0, pitch: 0, ...lookFields, power: 8, phase: [0, 0], iters: 14 };

// ── a fake host ──────────────────────────────────────────────────────────────────────────────────
interface Fake { host: DeepZoomHost; view: () => DzView; put: (v: DzView) => void; sets: DzView[]; becomeReady: () => Promise<void> }
function fakeHost(at: DzView, readyNow: boolean): Fake {
    let view: DzView = at;
    let isReady = readyNow;
    let pending: DzView | null = null;
    let resolveReady!: () => void;
    const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
    if (readyNow) resolveReady();
    const sets: DzView[] = [];
    const setView = (v: DzView): void => { sets.push(v); view = v; };
    const host = {
        ready,
        bootParams: () => (isReady ? {} : null),
        getView: (): DzView => ({ ...view, cam: [view.cam[0], view.cam[1], view.cam[2]], phase: [view.phase[0], view.phase[1]], ...(view.julia ? { julia: [view.julia[0], view.julia[1], view.julia[2]] as Triple } : {}) }),
        setView,
        // As the module host: applied when ready, at once if it already is.
        setPendingView: (v: DzView | null): void => { if (v && isReady) setView(v); else pending = v; },
        setParams: () => undefined,
        orientation: () => ({ yaw: view.yaw, pitch: view.pitch, roll: view.roll ?? 0 }),
        setOrientation: () => undefined,
        telemetry: () => ({ depth: 6.6e-35, iters: view.iters }),
        sense: () => ({ near: 6.6e-35, second: 6.6e-35, hits: 7, open: 0, inside: false, marched: true }),
        thumbnail: () => 'data:image/png;base64,AAAA',
        estimateAtPoint: () => 1,
        on: () => () => undefined,
    } as unknown as DeepZoomHost;
    return {
        host, sets, view: () => view, put: (v) => { view = v; },
        becomeReady: async () => { isReady = true; if (pending) { setView(pending); pending = null; } resolveReady(); await tick(); await tick(); },
    };
}

// ── boot, as main.tsx does it ────────────────────────────────────────────────────────────────────
for (const feature of [DzFormulaFeature, DzCameraFeature, DzLightFeature, DzColourFeature, DzQualityFeature, DzInspectFeature]) featureRegistry.register(feature);
useEngineStore.getState();
bindStoreToEngine();
installRoute();
installShare();
const store = () => useEngineStore.getState();
const anim = () => useAnimationStore.getState();
const sceneNow = (documents: boolean): Preset => store().getPreset({ includeScene: true, includeDocuments: documents });
const savedView = (preset: Preset): DzSavedView | undefined => (preset as unknown as { dzView?: DzSavedView }).dzView;

// ── [1] a scene, written and read back ───────────────────────────────────────────────────────────
console.log('[1] scene     getPreset -> text -> parseSceneJson -> loadPreset');
const first = fakeHost(VIEW_A, true);
setHost(first.host);
await tick();
store().setDzFormula({ juliaMode: true, power: 6, phaseTheta: 0.125, phasePhi: -0.25, iterations: 61 });
store().setDzLight({ lampFalloff: 2.5 });
store().setDzQuality({ detail: 3.5 });
const ROW: DzLocation = {
    id: 'row-1', label: 'A Julia place', createdAt: 1760000000000, thumbnail: 'data:image/jpeg;base64,AAAA',
    state: { view: { ...VIEW_A, cam: CAM_B }, look: { dzFormula: { ...store().dzFormula } }, depth: '6.6e-35' },
};
useEngineStore.setState({ savedLocations: [ROW] });
// A route of three keyframes: the camera is put somewhere, moved (so the keyframe has a heading), keyed.
const KEYED: DzView[] = [VIEW_A, { ...VIEW_A, cam: CAM_B, yaw: -0.9000000000000001 }, { ...VIEW_A, cam: CAM_C, yaw: -0.8, roll: undefined }];
for (const view of KEYED) {
    first.put(view);
    noteMove(1e-36, -2e-36, 3e-36);
    setKeyframe();
}
const keysBefore = routeKeys().map((k) => ({ frame: k.frame, depth: k.depth, view: k.view, heading: k.heading }));
check(keysBefore.length === 3, 'scene: the route to save has three keyframes', `${keysBefore.length}`);
first.put(VIEW_A);

const written = sceneNow(true);
const TEXT = serializeScene(written);
check([...CAM_A, ...JULIA, ...CAM_B, ...CAM_C].every((s) => TEXT.includes(`"${s}"`)), 'scene: every camera string and the Julia constant is in the scene\'s text, as text');
check((written as unknown as { dzSceneVersion?: number }).dzSceneVersion === DZ_SCENE_VERSION && (JSON.parse(TEXT) as { dzSceneVersion?: number }).dzSceneVersion === DZ_SCENE_VERSION,
    'scene: the scene carries its version stamp');

// Somewhere else entirely, then the scene back.
function elsewhere(host: Fake | null): void {
    store().setDzFormula({ juliaMode: false, power: 8, phaseTheta: 0, phasePhi: 0, iterations: 14 });
    store().setDzLight({ lampFalloff: 4 });
    store().setDzQuality({ detail: 1 });
    useEngineStore.setState({ savedLocations: [] });
    anim().setSequence({ durationFrames: 300, fps: 30, tracks: {} });
    host?.put(START);
    if (host) host.sets.length = 0;
}
elsewhere(first);
check(routeKeys().length === 0 && (store().savedLocations ?? []).length === 0 && store().dzFormula.juliaMode === false, 'scene: (the app is somewhere else: no route, no saved location, Mandelbrot mode)');
const parsed = parseSceneJson(TEXT);
if (!parsed) throw new Error('the scene\'s own text did not parse');
store().loadPreset(parsed);
await tick();
const got = first.sets[first.sets.length - 1];
check(first.sets.length === 1 && sameTriple(got?.cam, CAM_A), 'scene: the view comes back to the renderer, the three camera strings byte for byte', JSON.stringify(got?.cam));
check(!!got && got.yaw === VIEW_A.yaw && got.pitch === VIEW_A.pitch && got.roll === VIEW_A.roll, 'scene: yaw, pitch and roll come back to the last digit', `${got?.yaw} ${got?.pitch} ${got?.roll}`);
check(sameTriple(got?.julia, JULIA), 'scene: the Julia constant comes back, three strings byte for byte, and reaches the renderer', JSON.stringify(got?.julia));
// THE CONSTANT'S ROW (2026-10-12): the scene above was written with the three rows at 0 - what a scene from before
// the rows existed loads as. Left at 0 they would be pushed a frame later and overwrite the loaded constant.
const rowsNow = (): string => JSON.stringify([store().dzFormula.juliaX, store().dzFormula.juliaY, store().dzFormula.juliaZ]);
/** The constant's three doubles, worked out here (the renderer's rule: the nearest double of the 256-bit number). */
const ROWS_WANTED = JULIA.map((s) => Number(BigInt(s)) / 2 ** 256), ROWS_TEXT = JSON.stringify(ROWS_WANTED);
check((JSON.parse(TEXT) as { features: { dzFormula: { juliaX?: number } } }).features.dzFormula.juliaX === 0 && ROWS_WANTED.every((x) => x !== 0) && rowsNow() === ROWS_TEXT,
    'scene: the Constant row follows the loaded view - the constant\'s three doubles, though the scene itself held the rows as 0', `${rowsNow()} for ${ROWS_TEXT}`);
check(store().dzFormula.juliaMode === true && store().dzFormula.power === 6 && store().dzFormula.phaseTheta === 0.125 && store().dzFormula.phasePhi === -0.25
    && store().dzLight.lampFalloff === 2.5 && store().dzQuality.detail === 3.5, 'scene: the formula - Julia mode with it - and the look values come back');
check(!!got && got.power === 6 && got.phase[0] === 0.125, 'scene: the view handed to the renderer takes its look fields from the loaded scene, not from where the app stood');
const rows = store().savedLocations ?? [];
check(rows.length === 1 && rows[0].id === 'row-1' && rows[0].label === 'A Julia place' && sameTriple(rows[0].state.view.cam, CAM_B) && sameTriple(rows[0].state.view.julia, JULIA)
    && JSON.stringify(rows[0].state.look) === JSON.stringify(ROW.state.look) && rows[0].state.depth === '6.6e-35' && rows[0].state.view.yaw === VIEW_A.yaw,
    'scene: the saved location comes back - its camera and its constant byte for byte, its formula, its depth, its name', JSON.stringify(rows.map((r) => r.state.view.cam)));
const keysAfter = routeKeys().map((k) => ({ frame: k.frame, depth: k.depth, view: k.view, heading: k.heading }));
check(keysAfter.length === 3 && keysAfter.every((k, i) => sameTriple(k.view.cam, KEYED[i].cam)) && JSON.stringify(keysAfter) === JSON.stringify(keysBefore),
    'scene: every keyframe\'s payload comes back byte for byte', `${keysAfter.length} keys: ${JSON.stringify(keysAfter.map((k) => k.view.cam[0].slice(-6)))}`);
check(keysAfter.every((k, i) => k.view.yaw === KEYED[i].yaw && k.view.pitch === KEYED[i].pitch && (k.view.roll ?? 0) === (KEYED[i].roll ?? 0) && k.frame === keysBefore[i].frame && k.depth === keysBefore[i].depth),
    'scene: and each keyframe\'s angles, time and depth to the last digit');
// A jump does the same (deep-zoom/locations.ts, `applyFormula`): the saved place's formula holds the rows as 0 too.
store().setDzFormula({ juliaMode: false, juliaX: 0, juliaY: 0, juliaZ: 0 });
first.sets.length = 0;
const undoBefore = store().paramUndoStack.length;
jumpTo(rows[0].state);
check(sameTriple(first.sets[0]?.julia, JULIA) && store().dzFormula.juliaMode === true && rowsNow() === ROWS_TEXT && store().paramUndoStack.length === undoBefore + 1,
    'place: a jump to a Julia place writes the Constant row from its view, in the jump\'s one undo step', `${rowsNow()} for ${ROWS_TEXT}; ${store().paramUndoStack.length - undoBefore} undo steps`);
useEngineStore.setState({ paramUndoStack: [], paramRedoStack: [] });      // [3] counts the undo stack after a session is applied

// ── [2] a loaded view that no ready renderer has taken yet ───────────────────────────────────────
console.log('[2] parked    a scene written before the renderer is ready');
const loaded = savedView(parseSceneJson(TEXT) as Preset);
const second = fakeHost(START, false);
setHost(second.host);
await tick();
elsewhere(second);
store().loadPreset(parseSceneJson(TEXT) as Preset);
await tick();
check(second.sets.length === 0 && sameTriple(second.view().cam, CAM_START), 'parked: (the renderer is not ready: it still stands at its start view)');
const meanwhile = savedView(sceneNow(false));
check(!!meanwhile && sameTriple(meanwhile.cam, CAM_A) && sameTriple(meanwhile.julia, JULIA) && JSON.stringify(meanwhile) === JSON.stringify(loaded),
    'parked: a scene written before the renderer is ready holds the view that was loaded, not the renderer\'s start view', JSON.stringify(meanwhile?.cam));
await second.becomeReady();
check(second.sets.length === 1 && sameTriple(second.sets[0].cam, CAM_A), 'parked: the renderer takes the loaded view when it becomes ready');
second.put({ ...VIEW_A, cam: CAM_C });                    // then the hands fly on
const after = savedView(sceneNow(false));
check(!!after && sameTriple(after.cam, CAM_C), 'parked: once a ready renderer has taken it, the scene holds the renderer\'s own view again', JSON.stringify(after?.cam));
setHost(null);
await tick();
store().loadPreset(parseSceneJson(TEXT) as Preset);
const none = savedView(sceneNow(false));
check(!!none && sameTriple(none.cam, CAM_A) && sameTriple(none.julia, JULIA), 'parked: with no renderer at all it holds the loaded view too', JSON.stringify(none?.cam));
const third = fakeHost(START, true);
setHost(third.host);                                      // a renderer mounts, ready: it is handed the parked view
await tick(); await tick();
check(third.sets.length === 1 && sameTriple(third.sets[0].cam, CAM_A), 'parked: and the renderer that mounts next is handed it');

// ── [3] the session ──────────────────────────────────────────────────────────────────────────────
console.log('[3] session   the scene in the engine\'s envelope');
third.put(VIEW_A);
const body = dzSessionAdapter.capture({ compact: false });
const scene = body.scene as Record<string, unknown>;
check(!('documents' in scene) && 'dzView' in scene && 'features' in scene && 'sequence' in scene, 'session: the body is a scene - its view, its features, its timeline - without the documents');
const { documents: _documents, ...sceneOfFile } = sceneNow(true) as Preset & { documents?: unknown };
check(JSON.stringify(scene) === JSON.stringify(sceneOfFile), 'session: what it holds is the same text File > Save Scene writes, the documents left out');
const stored = encodeSession(dzSessionAdapter.format, dzSessionAdapter.version, body);
const read = readSession(dzSessionAdapter, stored);
check(read.ok && JSON.stringify(read.session.scene) === JSON.stringify(scene) && [...CAM_A, ...JULIA, ...CAM_B, ...CAM_C].every((s) => stored.includes(`"${s}"`)),
    'session: through the envelope and back it is the same text again, every camera string and keyframe payload in it as text');
elsewhere(third);
if (read.ok) dzSessionAdapter.apply(read.session, 'boot');
await tick();
check(third.sets.length === 1 && sameTriple(third.sets[0].cam, CAM_A) && sameTriple(third.sets[0].julia, JULIA) && third.sets[0].yaw === VIEW_A.yaw
    && routeKeys().length === 3 && routeKeys().every((k, i) => sameTriple(k.view.cam, KEYED[i].cam)) && store().dzFormula.juliaMode === true,
    'session: applied at boot, the camera, the constant, the route and the formula are back, string for string');
check(store().paramUndoStack.length === 0 && anim().undoStack.length === 0, 'session: and nothing is on the undo stack, nor on the timeline\'s (an undo there would take the route away)',
    `params ${store().paramUndoStack.length}, timeline ${anim().undoStack.length}`);
const mangled = JSON.parse(stored) as { body: { scene: { dzView: { cam: unknown[] } } } };
mangled.body.scene.dzView.cam = [Number(CAM_A[0]), Number(CAM_A[1]), Number(CAM_A[2])];
const bad = readSession(dzSessionAdapter, JSON.stringify(mangled));
check(!bad.ok && bad.reason === 'invalid', 'session: a body whose camera went through numbers is refused (a clean start, never a wrong place)', JSON.stringify(bad));
const other = readSession(dzSessionAdapter, encodeSession(dzSessionAdapter.format, dzSessionAdapter.version, { scene: [1, 2, 3] as unknown as Record<string, unknown> }));
const noFeatures = readSession(dzSessionAdapter, encodeSession(dzSessionAdapter.format, dzSessionAdapter.version, { scene: { formula: 'x' } }));
check(!other.ok && !noFeatures.ok && !readSession(dzSessionAdapter, 'hello').ok && !readSession(dzSessionAdapter, '').ok, 'session: a body of something else, plain words and nothing are refused');
const newer = decodeSession(encodeSession(DZ_SESSION_FORMAT, dzSessionAdapter.version + 1, body), DZ_SESSION_FORMAT, dzSessionAdapter.version);
const foreign = decodeSession(encodeSession('gmt-gx-session', dzSessionAdapter.version, body), DZ_SESSION_FORMAT, dzSessionAdapter.version);
check(!newer.ok && newer.reason === 'version' && !foreign.ok && foreign.reason === 'other-format', 'session: another version of the format, and another app\'s session, are refused');

console.log(failed === 0 ? 'scene-roundtrip: all green' : `scene-roundtrip: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
