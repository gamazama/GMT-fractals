/**
 * deep-zoom/locationParse.ts - text in, locations out. Pure: no store, no DOM.
 *
 * "Copy location" writes one location as JSON; people paste those into chats and notes, and
 * texts made by last week's prototype are already out there. So the parser accepts:
 *   - this shell's shape:      { "view": { "cam": ["..","..",".."], "yaw", "pitch", "roll"?, ... }, "look"?, "depth"? }
 *   - a whole saved row:       { "id", "label", "state": { "view": ... } }
 *   - a bare view, which is also last week's flat shape:
 *                              { "cam": [...], "yaw", "pitch", "iters", "power", "phase", "light",
 *                                "falloff", "color", "cscale", "surf", "depth"? (a number) }
 *   - an array of any of them.
 * Anything else comes back with a reason a person can read. Checked by
 * `debug/deep-zoom-checks/location-parse.mts`.
 *
 * Camera values are decimal STRINGS of whole numbers and are never converted; a `cam` that is not
 * three such strings is refused, so a number-mangled copy cannot become a wrong place. The same goes
 * for a view's `julia` (the Julia constant, since 2026-10-12): kept string for string when it is
 * three such strings, and the text is refused when it is there and is not.
 *
 * Of a pasted `look` only the formula is kept (`look.dzFormula`): that is all a place holds. Text
 * copied before 2026-10-10 also carries the light, the colour with its gradient, the detail and
 * the march there; they are dropped here, and the place opens with what the app has.
 *
 * A LIST (2026-10-12). "Export all" writes every saved location as one text, `locationsToText`: a
 * list of entries in the shape "Copy location" writes, each with its name, no thumbnails. A list
 * that is IMPORTED - pasted, opened, or dropped on the app as a file - is read by
 * `parseLocationList`, which is the same reader with one difference: an entry it cannot read is
 * REFUSED BY ITSELF, with its reason, and the rest are read (`parseLocationText` refuses the whole
 * text, which is right for one pasted place and wrong for a file of forty with one bad row). The
 * old prototype's `deep-zoom-locations.json` is such a list: entries `{ format, version, name,
 * depth, view }`, which the reader takes as this shell's shape with `name` as the label.
 *   - `looksLikeLocations` says whether a text is locations AT ALL, before anything is read: what
 *     the file claim asks (`deep-zoom/claims.ts`). A scene is never one: it holds its camera under
 *     `dzView` and has `features`.
 *   - `locationKey` says when two places are THE SAME PLACE for an import: the camera's three
 *     position strings, the Julia constant when there is one, and the formula - which one, Julia
 *     mode, and the numbers that shape it (power and phase for the bulb, the seven for the box).
 *     Not the direction looked in, not the iteration count, not the name. `newLocations` uses it,
 *     against the list as it stood BEFORE the import: two entries of one file that are the same
 *     place are both added, so that an exported list imported into an empty one comes back whole.
 *
 * A depth is kept as text but passes through a number on the way in (`depthText`): the text the
 * app writes (`String(depth)`) comes back as it was; `4.2e+0` typed by hand comes back `4.2`.
 *
 * A LINK (2026-10-17). Paste location also takes what "Copy link" writes (`<page>#s=<share string>`,
 * deep-zoom/share.ts), whole or its `#s=` part alone: `shareStringOf` finds the share string, the
 * caller decodes it (the engine's `parseShareString`, which needs the feature registry: not pure),
 * and `linkLocation` takes the place out of the scene it decodes to - the camera (`dzView`, its
 * strings and its Julia constant as text) and the formula (`features.dzFormula`). Not the look the
 * link carries: Paste is a jump, and a jump leaves light, colour and detail as they are. Its guard
 * is the share code's (the `@invariant` in deep-zoom/share.ts: check:deep-zoom-scene-roundtrip, which
 * has the real encoder); the check of this file has no line on it.
 *
 * @invariant an exported list reads back with every `cam` string and the Julia constant byte for
 *   byte; one entry with a number-mangled camera is refused by itself and the rest are read -
 *   proven by: npm run check:deep-zoom-location-parse ("export: the Julia constant comes back byte
 *   for byte, and no other place gains one", "import: one entry with a mangled camera is refused
 *   by itself, with its place in the list and its reason, and the rest are read"). Falsified
 *   2026-10-12: the first two breaks in that check's header.
 * @assumption `locationKey` / `newLocations` call two places the same exactly when the header says
 *   so. The check has eight lines on it ("import: the same file again adds nothing ...", "import:
 *   another direction of view ...", and the six after), all green; the ONE break spent on the rule
 *   (the formula's kind taken out of the key) left all of them green - the numbers that follow it
 *   in the key already tell the bulb's three from the box's seven - so no line is known to go red
 *   for a broken rule. ("... the same file again adds nothing" did go red once, by the export
 *   break: a place whose Julia constant was lost on the way is no longer the same place.)
 */
import type { DzView } from './host/DeepZoomHost';
import type { DzLocationState } from './locations';
import { FORMULA_BOX, FORMULA_BULB, FORMULA_KALI } from './features/formula';

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
    if (o.julia !== undefined && !isCam(o.julia)) return '"julia" is not three whole numbers written as text';
    const phase = Array.isArray(o.phase) && isNum(o.phase[0]) && isNum(o.phase[1]) ? [o.phase[0], o.phase[1]] as [number, number] : [0, 0] as [number, number];
    return {
        cam: o.cam,
        yaw: o.yaw,
        pitch: o.pitch,
        ...(isNum(o.roll) && o.roll !== 0 ? { roll: o.roll } : {}),
        ...(isCam(o.julia) ? { julia: o.julia } : {}),
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

/** A pasted look: its formula, taken as it comes, and nothing else of it (see the header). */
function lookOf(raw: unknown): DzLocationState['look'] {
    const formula = (raw as Partial<NonNullable<DzLocationState['look']>> | null)?.dzFormula;
    return formula && typeof formula === 'object' ? { dzFormula: formula } : undefined;
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
        const look = lookOf(o.look);
        if (look) state.look = look;
        if (typeof o.note === 'string') state.note = o.note;
        return { state, label: typeof o.label === 'string' ? o.label : (typeof o.name === 'string' ? o.name : undefined) };
    }
    // a bare view / last week's flat shape
    const view = viewOf(o);
    if (typeof view === 'string') return view;
    return { state: { view, depth: depthText(o.depth) }, label: typeof o.name === 'string' ? o.name : undefined };
}

/** The strict reader: every entry must be a location, or the whole text is refused with the first
 *  bad entry's reason. (The app itself reads through `parseLocationList` since 2026-10-12; this is
 *  the same reader with that one rule on top, and what the check's older lines are written against.) */
export function parseLocationText(text: string): ParsedLocations {
    const r = parseLocationList(text);
    if (!r.ok) return r;
    const bad = r.refused[0];
    if (bad) return { ok: false, reason: `That text is not a location: ${r.total > 1 ? `item ${bad.item}: ` : ''}${bad.reason}.` };
    return { ok: true, locations: r.locations, labels: r.labels };
}

/** One location as the text "Copy location" writes. */
export function locationToText(state: DzLocationState): string {
    return JSON.stringify({ app: 'gmt-deep-zoom', view: state.view, look: state.look, depth: state.depth }, null, 1);
}

// ── a list: Export all, and what an import reads ─────────────────────────────────────────────────

/** Every saved location as the text "Export all" writes: a list, each entry in the shape "Copy
 *  location" writes with its name beside it. In the order given. No thumbnail, no id; of a look
 *  only the formula (a place saved before 2026-10-10 still holds more: see the header). */
export function locationsToText(rows: ReadonlyArray<{ label: string; state: DzLocationState }>): string {
    return JSON.stringify(rows.map((row) => ({
        app: 'gmt-deep-zoom',
        label: row.label,
        view: row.state.view,
        look: row.state.look ? { dzFormula: row.state.look.dzFormula } : undefined,
        depth: row.state.depth,
        ...(row.state.note ? { note: row.state.note } : {}),
    })), null, 1);
}

export type ParsedLocationList =
    | {
        ok: true;
        /** The text was a list (a JSON array), whatever its length. */
        list: boolean;
        /** How many entries the text held, read or not. */
        total: number;
        /** The entries that are locations, in the text's order, and each one's name when it had one. */
        locations: DzLocationState[];
        labels: Array<string | undefined>;
        /** The entries that are not, by their place in the text (from 1), each with its reason. */
        refused: Array<{ item: number; reason: string }>;
    }
    /** `detail`: when the text IS JSON and nothing in it could be read, the first entry's own reason,
     *  without the "That text ..." lead (a file's toast leads with its own words). */
    | { ok: false; reason: string; detail?: string };

/** A value that is meant as a location, readable or not: it names a camera where one of the four
 *  shapes holds it. A scene is not one (its camera is under `dzView`, and it has `features`). */
function meantAsLocation(x: unknown): boolean {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
    const o = x as Record<string, unknown>;
    if (o.features && typeof o.features === 'object') return false;
    const holdsCam = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v) && 'cam' in (v as object);
    return holdsCam(o) || holdsCam(o.view) || holdsCam((o.state as Record<string, unknown> | undefined)?.view) || holdsCam(o.state);
}

/** Whether `text` is locations at all: JSON whose one value, or one of whose list entries, is meant
 *  as a location. True also when none of them can be READ (a number-mangled file is still a file
 *  of locations, and must not be handed to anything else). */
export function looksLikeLocations(text: string): boolean {
    let data: unknown;
    try {
        data = JSON.parse((text ?? '').trim());
    } catch {
        return false;
    }
    return (Array.isArray(data) ? data : [data]).some(meantAsLocation);
}

/** Text in, every location it holds out: as `parseLocationText`, but an entry that cannot be read
 *  is refused by itself and the rest are read. Not ok only when NOTHING in the text is a location. */
export function parseLocationList(text: string): ParsedLocationList {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return { ok: false, reason: 'The clipboard is empty.' };
    let data: unknown;
    try {
        data = JSON.parse(trimmed);
    } catch {
        return { ok: false, reason: 'That text is not a location (it is not JSON).' };
    }
    const list = Array.isArray(data);
    const items: unknown[] = list ? data as unknown[] : [data];
    if (items.length === 0) return { ok: false, reason: 'That list holds no locations.' };
    const locations: DzLocationState[] = [];
    const labels: Array<string | undefined> = [];
    const refused: Array<{ item: number; reason: string }> = [];
    for (let i = 0; i < items.length; i++) {
        const r = one(items[i]);
        if (typeof r === 'string') { refused.push({ item: i + 1, reason: r }); continue; }
        locations.push(r.state);
        labels.push(r.label);
    }
    if (locations.length === 0) {
        const first = refused[0];
        const detail = `${items.length > 1 ? `item ${first.item}: ` : ''}${first.reason}`;
        return { ok: false, reason: `That text is not a location: ${detail}.`, detail };
    }
    return { ok: true, list, total: items.length, locations, labels, refused };
}

// ── a link: what "Copy link" writes ──────────────────────────────────────────────────────────────

/** The share string of a link as "Copy link" writes it, or of its `#s=` part alone (A LINK in the
 *  header). Null when the text is not one: JSON is not, nor is anything with a space in it. */
export function shareStringOf(text: string): string | null {
    const m = /^(?![[{])\S*#s=(\S+)$/.exec((text ?? '').trim());
    return m ? m[1] : null;
}

/** The place in the scene a link decodes to: its camera and its formula, nothing else of it (A LINK
 *  in the header). Or the reason it holds none. */
export function linkLocation(scene: unknown): DzLocationState | string {
    const s = scene as { dzView?: unknown; features?: { dzFormula?: unknown } } | null;
    const v = s?.dzView as Record<string, unknown> | undefined, formula = s?.features?.dzFormula;
    if (!v || typeof v !== 'object') return 'That link could not be read.';
    // The scene writes the angles as text (the share encoder rounds numbers): a view's own are numbers.
    const view = viewOf({ cam: v.cam, julia: v.julia, yaw: Number(v.yaw), pitch: Number(v.pitch), roll: Number(v.roll) });
    if (typeof view === 'string') return `That link holds no place: ${view}.`;
    return { view, ...(formula && typeof formula === 'object' ? { look: { dzFormula: formula as NonNullable<DzLocationState['look']>['dzFormula'] } } : {}), depth: depthText(v.depth) };
}

/** What makes two places the same place for an import (see the header). A place with no formula of
 *  its own - a bare view - is a Mandelbulb's, with the power and the phase its view carries. */
export function locationKey(state: DzLocationState): string {
    const v = state.view;
    const saved = state.look?.dzFormula;
    const choice = saved ?? state.formula;
    const kind = choice?.kind ?? FORMULA_BULB;
    const shape = kind === FORMULA_BOX
        ? [choice?.boxScale, choice?.boxMinRadius, choice?.boxFold, choice?.boxFixedRadius, choice?.boxRotX, choice?.boxRotY, choice?.boxRotZ]
        : kind === FORMULA_KALI
        ? [choice?.kaliScale, choice?.kaliMinRad2, choice?.kaliTransX, choice?.kaliTransY, choice?.kaliTransZ, choice?.kaliRot]
        : saved ? [saved.power, saved.phaseTheta, saved.phasePhi] : [v.power, v.phase[0], v.phase[1]];
    // Burning is the bulb's: on, the place is another one, and so is the same camera at another mix; off, the mix says nothing
    const burning = kind === FORMULA_BULB && choice?.burning === true ? (choice.burningMix ?? 1) : null;
    return JSON.stringify([v.cam, v.julia ?? null, kind, choice?.juliaMode === true, shape.map((n) => (typeof n === 'number' ? n : null)), burning]);
}

/** Which of `incoming` are not yet in `have` (by `locationKey`), as indexes into `incoming`, and how
 *  many are already there. ONLY `have` counts: a place that comes twice in the incoming list itself
 *  is added twice. A list may hold one place under two names - two of this app's own starter dives
 *  begin at the same camera - and an exported list imported into an empty one must come back whole. */
export function newLocations(have: readonly DzLocationState[], incoming: readonly DzLocationState[]): { fresh: number[]; skipped: number } {
    const known = new Set(have.map(locationKey));
    const fresh: number[] = [];
    for (let i = 0; i < incoming.length; i++) if (!known.has(locationKey(incoming[i]))) fresh.push(i);
    return { fresh, skipped: incoming.length - fresh.length };
}

/** What an import did, in the words the app says it in. */
export function importSummary(n: { added: number; skipped: number; refused: number }): string {
    const parts = [`${n.added} location${n.added === 1 ? '' : 's'} added`];
    if (n.skipped > 0) parts.push(`${n.skipped} skipped (already in My locations)`);
    if (n.refused > 0) parts.push(`${n.refused} could not be read`);
    return parts.join(', ');
}
