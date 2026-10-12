/**
 * deep-zoom/presetFields.ts - what a scene carries besides the feature slices.
 *
 * Four preset fields, registered at import. MUST be imported before the store is first used (the
 * registry freezes when the store is built): main.tsx imports it right after `./registerFeatures`.
 *
 *   dzView          the camera: three 256-bit decimal STRINGS, yaw, pitch, the roll when there is
 *                   one, the depth as text, and in Julia mode the Julia constant (`julia`: three
 *                   more strings; the mode itself is the `dzFormula` slice's `juliaMode`).
 *                   A scene file, a scene PNG and a share link all carry it. `serialize` reads the
 *                   renderer (the camera is never in the store); `deserialize` hands the view to
 *                   the host, or parks it until one is mounted and ready.
 *   dzSceneVersion  1, stamped into every saved scene from the first one, so a later change of
 *                   what a slice means (the light list, GMT's colour units) can migrate old files.
 *   dzInspect reset writes nothing; on load it puts the Inspect channel and compare back to
 *                   Picture / Off. Those two are for looking, not part of a scene, and the engine
 *                   has no "do not save" flag for a param (plan gap E13).
 *   dzRetiredNormals  writes nothing; on load it puts a Normals value that names no option back
 *                   on 4-tap. Until 2026-10-11 there was a fifth option, Gradient (index 4), and a
 *                   scene, a scene PNG or a link saved before may hold it; 4-tap is what it had
 *                   been drawing since the ray march became the default (features/quality.ts,
 *                   `normalsIndex`). The three params that went the same day, `trueGradient`,
 *                   `bla` and `rayMarch`, need nothing here: the loader reads declared params
 *                   only, so a saved `rayMarch: false` is dropped and the bulb is drawn by the
 *                   ray march. A bulb scene's `stepSize` IS still a param and loads; it shows
 *                   nowhere and moves nothing until the Mandelbox is the formula.
 *
 * PITFALLS
 *   - Camera values never pass through `Number()`. The depth is a STRING: the share encoder
 *     zeroes numbers under 1e-9, which is most of this app's range.
 *   - Preset fields run after every feature setter, so by the time `dzView` is applied the store
 *     already holds the scene's look; the view handed to the host takes its look fields from
 *     there (the renderer's `setView` also writes iterations, power, phase, light and colour, and
 *     must not disagree with the store).
 *   - This file does not import the store: `deserialize` is given `get`.
 *   - A loaded view ends the trail (`trailEnds` in deep-zoom/trail.ts), before it is handed over.
 *   - A LOADED VIEW THAT NO READY RENDERER HAS TAKEN YET IS STILL THE SCENE'S VIEW (2026-10-12).
 *     The renderer's shader takes some seconds to build, and until it has, the renderer stands at
 *     its start view and the loaded one is parked. `serialize` answers the parked view, as it was
 *     loaded, for exactly that long. Before, it read the renderer whatever it stood at: a scene
 *     saved in those seconds held the start view, and with the session's autosave (deep-zoom/
 *     session.ts) a reload within seconds of a boot would have written the start view over the
 *     place just restored - the place lost by pressing F5 twice.
 *
 * @invariant a view that was loaded and has not been taken by a ready renderer is what a scene
 *   written meanwhile holds, string for string; and a view's Julia constant goes through a
 *   scene's text and back to the renderer byte for byte - proven by: npm run
 *   check:deep-zoom-scene-roundtrip ("parked: a scene written before the renderer is ready holds
 *   the view that was loaded, not the renderer's start view", "scene: the Julia constant comes
 *   back, three strings byte for byte, and reaches the renderer"). Falsified 2026-10-12: the
 *   parked line taken out of `serialize` -> 2 red; the constant left out of what `serialize`
 *   writes -> 5 red. The record is in that check's header.
 * @assumption The rest of what that check reads - the camera strings and the angles of the view,
 *   a saved location's row, every keyframe's payload, the version stamp, a renderer that mounts
 *   later being handed the parked view - is its other "scene: ..." and "parked: ..." lines, which
 *   pass and were not broken on purpose (the location's row and the route are other files' and
 *   the engine's doing: deep-zoom/share.ts, deep-zoom/route.ts, `setSequence`).
 */
import { presetFieldRegistry } from '../utils/PresetFieldRegistry';
import { getHost, subscribeHost } from './host/current';
import { depthNow } from './depthNow';
import { trailEnds } from './trail';
import type { DzView } from './host/DeepZoomHost';
import { lightTypeToRenderer } from './features/light';
import { colourToRenderer } from './features/colour';
import { normalsIndex } from './features/quality';

export const DZ_SCENE_VERSION = 1;

/** The camera as a scene stores it. */
export interface DzSavedView {
    v: 1;
    cam: [string, string, string];
    /** As text, like the camera: the share encoder rounds numbers to four decimals. A number is
     *  accepted on load (a hand-written scene). */
    yaw: string | number;
    pitch: string | number;
    /** Written only when the camera has a roll; a scene without it has none. */
    roll?: string | number;
    /** Depth when saved, as text; '' when unknown. For display and sorting only. */
    depth: string;
    /** The Julia constant, written only while Julia mode is on: three strings like `cam`. */
    julia?: [string, string, string];
}

/** Three whole numbers written as text: a camera, or a Julia constant. */
const isTriple = (c: unknown): c is [string, string, string] =>
    Array.isArray(c) && c.length === 3 && c.every((v) => typeof v === 'string' && /^-?\d+$/.test(v));

export function isSavedView(x: unknown): x is DzSavedView {
    const s = x as DzSavedView | null;
    return !!s && Array.isArray(s.cam) && s.cam.length === 3 && s.cam.every((c) => typeof c === 'string' && /^-?\d+$/.test(c))
        && Number.isFinite(Number(s.yaw)) && Number.isFinite(Number(s.pitch)) && s.yaw !== '' && s.pitch !== '';
}

type Slices = Record<string, Record<string, unknown> | undefined>;
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** A full view for the host: the saved camera, with look fields from the store's slices. */
function viewFromSaved(saved: DzSavedView, state: Slices): DzView {
    const f = state.dzFormula ?? {};
    const l = state.dzLight ?? {};
    const c = state.dzColour ?? {};
    const q = state.dzQuality ?? {};
    const roll = Number(saved.roll);                    // NaN when there is none
    return {
        cam: saved.cam,
        yaw: Number(saved.yaw),
        pitch: Number(saved.pitch),
        ...(Number.isFinite(roll) && roll !== 0 ? { roll } : {}),
        ...(isTriple(saved.julia) ? { julia: saved.julia } : {}),     // a mangled constant is dropped, never guessed at
        iters: num(f.iterations, 14),
        power: num(f.power, 8),
        phase: [num(f.phaseTheta, 0), num(f.phasePhi, 0)],
        light: lightTypeToRenderer(num(l.lightType, 0)),
        falloff: num(l.lampFalloff, 4),
        color: colourToRenderer(c.plain !== false, num(c.mode, 0)),
        cscale: num(c.scale, 1),
        surf: num(q.detail, 1),
    };
}

/**
 * A loaded view that no READY renderer has taken yet. Every host that mounts while it is set is
 * handed it (the host applies it when it becomes ready), and it is cleared only when one of them
 * is ready and still the mounted one. In dev React mounts the surface twice, so the first host is
 * disposed at once: clearing on hand-over lost the view of a share link opened at boot
 * (seen 2026-10-08, smoke step "a share link opens the same view").
 */
let parked: DzView | null = null;
/** The parked view as the scene held it: what `serialize` answers for as long as it is parked. */
let parkedSaved: DzSavedView | null = null;
function offer(): void {
    const host = getHost();
    const view = parked;
    if (!host || !view) return;
    host.setPendingView(view);
    void host.ready.then(() => { if (getHost() === host && parked === view) { parked = null; parkedSaved = null; } }, () => undefined);
}
subscribeHost(offer);

presetFieldRegistry.register({
    key: 'dzView',
    serialize: () => {
        // A loaded view that no ready renderer has taken yet IS the scene's view (see PITFALLS).
        if (parked && parkedSaved) return parkedSaved;
        const host = getHost();
        if (!host) return undefined;
        const view = host.getView();
        const depth = depthNow(host);
        const saved: DzSavedView = {
            v: 1, cam: view.cam, yaw: String(view.yaw), pitch: String(view.pitch), ...(view.roll ? { roll: String(view.roll) } : {}),
            depth: depth > 0 && Number.isFinite(depth) ? String(depth) : '',
            ...(view.julia ? { julia: view.julia } : {}),
        };
        return saved;
    },
    deserialize: (preset, _set, get) => {
        const saved = (preset as { dzView?: unknown }).dzView;
        if (!isSavedView(saved)) return;
        trailEnds();                                    // a loaded scene is not flown to: the trail ends where the camera stands
        parked = viewFromSaved(saved, get() as Slices);
        parkedSaved = saved;
        offer();   // a ready host applies it at once; otherwise the next ready one does
    },
});

presetFieldRegistry.register({
    key: 'dzSceneVersion',
    serialize: () => DZ_SCENE_VERSION,
    deserialize: () => undefined,   // nothing to migrate yet; version 1 is the first
});

presetFieldRegistry.register({
    key: 'dzInspectReset',
    serialize: () => undefined,
    deserialize: (_preset, set, get) => {
        const inspect = (get() as Slices).dzInspect;
        if (inspect && (inspect.channel !== 0 || inspect.compare !== 0)) set({ dzInspect: { ...inspect, channel: 0, compare: 0 } });
    },
});

presetFieldRegistry.register({
    key: 'dzRetiredNormals',
    serialize: () => undefined,
    deserialize: (_preset, set, get) => {
        const quality = (get() as Slices).dzQuality;
        const stored = quality?.normals;
        if (quality && typeof stored === 'number' && normalsIndex(stored) !== stored) set({ dzQuality: { ...quality, normals: normalsIndex(stored) } });
    },
});
