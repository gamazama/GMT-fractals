/**
 * deep-zoom/locationParse.ts - text in, locations out. Pure: no store, no DOM.
 *
 * "Copy location" writes one location as JSON; people paste those into chats and notes, and
 * texts made by last week's prototype are already out there. So the parser accepts:
 *   - this shell's shape:      { "view": { "cam": ["..","..",".."], "yaw", "pitch", ... }, "look"?, "depth"? }
 *   - a whole saved row:       { "id", "label", "state": { "view": ... } }
 *   - a bare view, which is also last week's flat shape:
 *                              { "cam": [...], "yaw", "pitch", "iters", "power", "phase", "light",
 *                                "falloff", "color", "cscale", "surf", "depth"? (a number) }
 *   - an array of any of them.
 * Anything else comes back with a reason a person can read. Checked by
 * `debug/deep-zoom-checks/location-parse.mts`.
 *
 * Camera values are decimal STRINGS of whole numbers and are never converted; a `cam` that is not
 * three such strings is refused, so a number-mangled copy cannot become a wrong place.
 */
import type { DzView } from './host/DeepZoomHost';
import type { DzLocationState } from './locations';

export type ParsedLocations =
    | { ok: true; locations: DzLocationState[]; labels: Array<string | undefined> }
    | { ok: false; reason: string };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCam = (v: unknown): v is [string, string, string] =>
    Array.isArray(v) && v.length === 3 && v.every((c) => typeof c === 'string' && /^-?\d+$/.test(c));

/** A full view from a loose object, or the reason it is not one. Missing look fields get the renderer's defaults. */
function viewOf(o: Record<string, unknown>): DzView | string {
    if (!Array.isArray(o.cam)) return 'it has no "cam"';
    if (!isCam(o.cam)) return '"cam" is not three whole numbers written as text';
    if (!isNum(o.yaw) || !isNum(o.pitch)) return 'it has no yaw and pitch';
    const phase = Array.isArray(o.phase) && isNum(o.phase[0]) && isNum(o.phase[1]) ? [o.phase[0], o.phase[1]] as [number, number] : [0, 0] as [number, number];
    return {
        cam: o.cam,
        yaw: o.yaw,
        pitch: o.pitch,
        iters: isNum(o.iters) ? o.iters : 14,
        power: isNum(o.power) ? o.power : 8,
        phase,
        light: isNum(o.light) ? o.light : 0,
        falloff: isNum(o.falloff) ? o.falloff : 4,
        color: isNum(o.color) ? o.color : 0,
        cscale: isNum(o.cscale) ? o.cscale : 1,
        surf: isNum(o.surf) ? o.surf : 1,
    };
}

const depthText = (v: unknown): string => {
    const n = typeof v === 'string' ? Number(v) : v;
    return isNum(n) && n > 0 ? String(n) : '';
};

function one(x: unknown): { state: DzLocationState; label?: string } | string {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return 'it is not a location';
    const o = x as Record<string, unknown>;
    // a whole saved row
    if (o.state && typeof o.state === 'object') {
        const inner = one(o.state);
        return typeof inner === 'string' ? inner : { state: inner.state, label: typeof o.label === 'string' ? o.label : undefined };
    }
    // this shell's shape
    if (o.view && typeof o.view === 'object') {
        const view = viewOf(o.view as Record<string, unknown>);
        if (typeof view === 'string') return view;
        const state: DzLocationState = { view, depth: depthText(o.depth) };
        if (o.look && typeof o.look === 'object') state.look = o.look as DzLocationState['look'];
        if (typeof o.note === 'string') state.note = o.note;
        return { state, label: typeof o.label === 'string' ? o.label : (typeof o.name === 'string' ? o.name : undefined) };
    }
    // a bare view / last week's flat shape
    const view = viewOf(o);
    if (typeof view === 'string') return view;
    return { state: { view, depth: depthText(o.depth) }, label: typeof o.name === 'string' ? o.name : undefined };
}

export function parseLocationText(text: string): ParsedLocations {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return { ok: false, reason: 'The clipboard is empty.' };
    let data: unknown;
    try {
        data = JSON.parse(trimmed);
    } catch {
        return { ok: false, reason: 'That text is not a location (it is not JSON).' };
    }
    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return { ok: false, reason: 'That list holds no locations.' };
    const locations: DzLocationState[] = [];
    const labels: Array<string | undefined> = [];
    for (let i = 0; i < items.length; i++) {
        const r = one(items[i]);
        if (typeof r === 'string') return { ok: false, reason: `That text is not a location: ${items.length > 1 ? `item ${i + 1}: ` : ''}${r}.` };
        locations.push(r.state);
        labels.push(r.label);
    }
    return { ok: true, locations, labels };
}

/** One location as the text "Copy location" writes. */
export function locationToText(state: DzLocationState): string {
    return JSON.stringify({ app: 'gmt-deep-zoom', view: state.view, look: state.look, depth: state.depth }, null, 1);
}
