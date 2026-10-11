/**
 * deep-zoom/presetFields.ts - what a scene carries besides the feature slices.
 *
 * Three preset fields, registered at import. MUST be imported before the store is first used (the
 * registry freezes when the store is built): main.tsx imports it right after `./registerFeatures`.
 *
 *   dzView          the camera: three 256-bit decimal STRINGS, yaw, pitch, the roll when there is
 *                   one, and the depth as text.
 *                   A scene file, a scene PNG and a share link all carry it. `serialize` reads the
 *                   renderer (the camera is never in the store); `deserialize` hands the view to
 *                   the host, or parks it until one is mounted and ready.
 *   dzSceneVersion  1, stamped into every saved scene from the first one, so a later change of
 *                   what a slice means (the light list, GMT's colour units) can migrate old files.
 *   dzInspect reset writes nothing; on load it puts the Inspect channel and compare back to
 *                   Picture / Off. Those two are for looking, not part of a scene, and the engine
 *                   has no "do not save" flag for a param (plan gap E13).
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
 */
import { presetFieldRegistry } from '../utils/PresetFieldRegistry';
import { getHost, subscribeHost } from './host/current';
import { depthNow } from './depthNow';
import { trailEnds } from './trail';
import type { DzView } from './host/DeepZoomHost';
import { lightTypeToRenderer } from './features/light';
import { colourToRenderer } from './features/colour';

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
}

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
function offer(): void {
    const host = getHost();
    const view = parked;
    if (!host || !view) return;
    host.setPendingView(view);
    void host.ready.then(() => { if (getHost() === host && parked === view) parked = null; }, () => undefined);
}
subscribeHost(offer);

presetFieldRegistry.register({
    key: 'dzView',
    serialize: () => {
        const host = getHost();
        if (!host) return undefined;
        const view = host.getView();
        const depth = depthNow(host);
        const saved: DzSavedView = {
            v: 1, cam: view.cam, yaw: String(view.yaw), pitch: String(view.pitch), ...(view.roll ? { roll: String(view.roll) } : {}),
            depth: depth > 0 && Number.isFinite(depth) ? String(depth) : '',
        };
        return saved;
    },
    deserialize: (preset, _set, get) => {
        const saved = (preset as { dzView?: unknown }).dzView;
        if (!isSavedView(saved)) return;
        trailEnds();                                    // a loaded scene is not flown to: the trail ends where the camera stands
        parked = viewFromSaved(saved, get() as Slices);
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
