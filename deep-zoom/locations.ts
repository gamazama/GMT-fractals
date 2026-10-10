/**
 * deep-zoom/locations.ts - saved places, and the one way the camera jumps.
 *
 * PURPOSE
 *   A location is a view (the camera as three 256-bit decimal strings plus yaw, pitch and, when
 *   there is one, roll), the formula it is a view of, and its depth. NOTHING ELSE: no light, no
 *   colour or gradient, no detail, no march setting (the owner, 2026-10-10: "a place shouldnt
 *   store light and colour - this will make it hard to improve the lighting and color system").
 *   A jump leaves all of those as they are. They live in the engine's state library
 *   (`savedLocations`): thumbnails, labels, nine slots, the Locations menu. `jumpTo` is the single
 *   path for every jump - a saved place, a slot key, Home, Back, a starter dive's start, a pasted
 *   location - so each one is one undo step and the renderer never becomes a second writer of the
 *   look values. A scene file and a share link are not places: they carry the whole scene.
 *
 * SEAMS
 *   - `installLocations()` is called once from main.tsx, after the store exists and before the
 *     panel manifest (the library's fields must be on the store when the panel first renders).
 *   - The panel is `components/LocationsPanel.tsx` (the engine's `StateLibraryPanel` with a depth
 *     line and depth order). The starter cards are `components/StarterDives.tsx`.
 *   - Undo: a history provider `dzView` whose `changeOf` is a counter of jumps AND flights. A jump
 *     always makes an undo entry, and it stores the exact strings on both sides. A flight - from
 *     the first fly key down to the last one up - makes one when it moved the camera
 *     (`flightBegan` / `flightEnded`, called by `deep-zoom/DeepZoomNavigation.tsx`): Ctrl+Z after
 *     a flight that went wrong puts the camera back where it took off. A look alone makes none.
 *
 * PITFALLS
 *   - Camera values are STRINGS and never pass through `Number()`. Depth is kept as a string too:
 *     the share encoder zeroes numbers under 1e-9.
 *   - `host.setView` also writes iterations, power, phase, light, falloff, colour and detail in the
 *     renderer. A jump therefore writes the formula through its feature setter FIRST and hands the
 *     host a view whose look fields are the store's own, whatever the saved view says of light,
 *     colour and detail (`viewForHost`).
 *   - A PLACE SAVED BEFORE 2026-10-10 STILL HOLDS `look.dzLight`, `look.dzColour`, `look.detail` AND
 *     `look.march`, in storage and in scene files. Nothing reads them and nothing strips them: the
 *     stored key layout (`look.dzFormula`) is the same, so no place needed migrating.
 *   - The state library does not keep its list across a reload. Until it can (plan gap E10) this
 *     file mirrors the list to `localStorage['gmt.deepZoom.locations']`, dropping thumbnails if the
 *     quota is hit. Last week's `gmt.deepzoom.bookmarks.v1` rows are imported once, then removed.
 *   - Slot keys act only with the pointer free: a slip from W onto 1 at 1e-50 must not teleport.
 *   - A FLIGHT'S ENTRY IS OPENED AND CLOSED AT ITS END, in one go, with the take-off view handed to
 *     the provider's capture for that one call (`flightPending`). The history slice holds ONE open
 *     bracket: a bracket kept open for the whole flight would be overwritten by any key that makes
 *     its own entry in the air (detail, iterations), and its own close would then find nothing.
 *     For the same reason no entry is made while another bracket is open (a slider held).
 *   - Flights that follow one another within `FLIGHT_MERGE_MS`, with nothing else put on the undo
 *     stack between them, are one entry: taps of W would otherwise fill the 50 undo steps.
 *   - "Depth" saved with a location is the depth the app shows (`deep-zoom/depthNow.ts`: what is
 *     looked at) since 2026-10-09; before that it was the nearest surface in any direction.
 *   - THE FORMULA IS NOT IN A VIEW (2026-10-09). A view is the renderer's own fields and
 *     says nothing of Mandelbulb or Mandelbox. A place carries it in its look (`look.dzFormula.kind`
 *     and the box's numbers), a bare view that this file made itself (Back, Home) in `formula`, and
 *     anything with neither - every place, scene and pasted text from before that day - means the
 *     Mandelbulb. Two orders follow, both because the renderer's iteration ceiling is the formula's
 *     (160 or 500) and `setView` cuts a view's count to it: a jump tells the renderer the formula
 *     BEFORE it hands over the view (`pushFormulaNow`), and so does an undo (the history provider's
 *     `restore` runs after the store has been put back, so the store already says which formula).
 *   - A CAMERA OF ONE FORMULA MEANS NOTHING IN THE OTHER. The bulb's start view is inside the
 *     Mandelbox (a blank wall, seen 2026-10-09), and a deep place of either is nowhere in the other.
 *     So a change of `dzFormula.kind` that did not come from a jump moves the camera to the new
 *     formula's whole-object view (`formulaHome`), inside the same undo bracket as the row's own
 *     write: Ctrl+Z brings back the formula AND the place. A jump sets `jumping` and places the
 *     camera itself; an undo or a scene load passes through here too, and its own view, restored
 *     after the store, is the one that stays.
 */
import { useEngineStore } from '../store/engineStore';
import { installStateLibrary } from '../engine/store/installStateLibrary';
import type { StateSnapshot, StateLibrarySavedToast } from '../engine/store/createStateLibrarySlice';
import { registerHistoryProvider } from '../store/slices/historySlice';
import { showToast } from '../engine/store/toastStore';
import { getHost, subscribeHost } from './host/current';
import type { DzView } from './host/DeepZoomHost';
import { lightTypeToRenderer } from './features/light';
import { colourToRenderer } from './features/colour';
import { FORMULA_BOX, FORMULA_BULB, FORMULA_CHOICE_KEYS } from './features/formula';
import type { DzFormulaChoice } from './features/formula';
import { paramId } from './host/paramMap';
import type { DeepZoomHost, DzParams } from './host/DeepZoomHost';
import { formatDepth, validDepth } from './components/depthFormat';
import { depthNow } from './depthNow';
import { isFlying } from './navigationState';
import type { DzFormulaSlice } from './storeTypes';
import { STARTERS } from './data/starters';

/** The formula slice as a place holds it. The formula choice and the box's numbers are there on a
 *  place saved since 2026-10-09; without them the place is a Mandelbulb's (see PITFALLS). */
export type DzLocationFormula =
    Pick<DzFormulaSlice, 'power' | 'phaseTheta' | 'phasePhi' | 'iterations' | 'autoIterations'> & Partial<DzFormulaChoice>;

/** What a place holds besides its view: the formula, under the key it has always been stored
 *  under. (The name is from when the light, the colour, the detail and the march were here too.) */
export interface DzLocationLook {
    dzFormula: DzLocationFormula;
}

export interface DzLocationState {
    view: DzView;
    /** The formula. Absent on a location that came in as a bare view (a starter, last week's bookmark). */
    look?: DzLocationLook;
    /** For a bare view only (no `look`): which formula it is a view of. Back and Home set it; a
     *  bare view from anywhere else has none and is a Mandelbulb's. */
    formula?: DzFormulaChoice;
    /** The depth when saved, as text (`6.4e-53`); '' when unknown. */
    depth: string;
    note?: string;
}

export type DzLocation = StateSnapshot<DzLocationState>;

declare module '../types/store' {
    interface EngineStoreState {
        savedLocations: DzLocation[];
        activeLocationId: string | null;
        savedLocations_savedToast: StateLibrarySavedToast | null;
        savedLocations_notifyDot: boolean;
    }
    interface EngineActions {
        addLocation: (label?: string) => Promise<string>;
        updateLocation: (id: string, patch?: Partial<DzLocation>) => void;
        deleteLocation: (id: string) => void;
        duplicateLocation: (id: string) => void;
        selectLocation: (id: string | null) => void;
        reorderLocations: (from: number, to: number) => void;
        saveLocationToSlot: (slotIndex: number) => void;
        resetLocation: () => void;
    }
}

export const DZ_LOCATIONS_STORAGE_KEY = 'gmt.deepZoom.locations';
const LEGACY_BOOKMARKS_KEY = 'gmt.deepzoom.bookmarks.v1';
/** Thumbnails are 128 px JPEG: last week's PNGs are what filled the storage quota. */
const THUMBNAIL_PX = 128;

// ── the formula, between the store and a view ────────────────────────────────────────────────────

/** Which formula the store says is drawn, with the box's numbers. */
function formulaChoiceNow(): DzFormulaChoice {
    const f = useEngineStore.getState().dzFormula;
    const out = {} as Record<string, number>;
    for (const key of FORMULA_CHOICE_KEYS) out[key] = f[key];
    return out as DzFormulaChoice;
}

/** Tell the renderer the store's formula NOW, ahead of the sync's own (delayed) push, so that the
 *  view handed over next is taken under it. A host that is not ready yet is told nothing: at ready
 *  the sync sends everything, and nothing may reach the renderer before then (useHostSync.ts). */
function pushFormulaNow(host: DeepZoomHost): void {
    if (!host.bootParams()) return;
    const patch: DzParams = {};
    for (const [key, value] of Object.entries(formulaChoiceNow())) patch[paramId('dzFormula', key)] = value;
    host.setParams(patch);
}

/** All a jump writes to the store: the formula. A place's saved one; for a bare view the fields the
 *  view itself carries (power, phase, iterations) with the formula it came with. Without a formula
 *  choice - every place and view from before 2026-10-09 - it is the Mandelbulb. A view's own light,
 *  colour and detail fields are not read. */
function applyFormula(state: DzLocationState): void {
    const v = state.view;
    useEngineStore.getState().setDzFormula({
        kind: FORMULA_BULB,
        ...(state.look ? state.look.dzFormula : { ...state.formula, power: v.power, phaseTheta: v.phase[0], phasePhi: v.phase[1], iterations: v.iters }),
    });
}

/** `view` with its look fields replaced by what the store holds now, so `host.setView` writes
 *  nothing the store does not already say. The camera strings pass through untouched. */
export function viewForHost(view: DzView): DzView {
    const s = useEngineStore.getState();
    return {
        cam: view.cam,
        yaw: view.yaw,
        pitch: view.pitch,
        ...(view.roll ? { roll: view.roll } : {}),
        // The store holds the user's FLOOR; with auto iterations on the renderer raises its own
        // count with depth and a saved view carries the count it was drawn with. Handing the
        // floor here redrew a place saved at 98 iterations with 85 (seen 2026-10-08).
        iters: Math.max(s.dzFormula.iterations, view.iters),
        power: s.dzFormula.power,
        phase: [s.dzFormula.phaseTheta, s.dzFormula.phasePhi],
        light: lightTypeToRenderer(s.dzLight.lightType),
        falloff: s.dzLight.lampFalloff,
        color: colourToRenderer(s.dzColour.plain, s.dzColour.mode),
        cscale: s.dzColour.scale,
        surf: s.dzQuality.detail,
    };
}

// ── jumping ──────────────────────────────────────────────────────────────────────────────────────

let jumpSeq = 0;
/** True while `jumpTo` writes the formula: a formula change inside a jump is the jump's own. */
let jumping = false;

/** A coordinate as the camera holds it: 256 fractional bits, as a decimal string. */
const fixed = (x: number): string => String(BigInt(Math.round(x * 2 ** 40)) << BigInt(216));

/**
 * The whole of a formula from outside: where a switch of formula puts the camera. The bulb's is the
 * first starter's view (the start of the sample flight). The box's follows its scale - the set fills
 * a cube of half-side 2 L (s + 1) / (s - 1) for a positive scale s (6 at scale 2) and about 2.2 L for
 * a negative one (measured at -1.5) - seen from 6.5 half-sides away along a fixed diagonal (at 5 the
 * cube's corners left a square frame).
 */
function formulaHome(choice: DzFormulaChoice): DzView {
    if (choice.kind !== FORMULA_BOX) return STARTERS[0].view;
    const s = choice.boxScale, a = Math.abs(s);
    const half = s > 0 ? 2 * choice.boxFold * (a + 1) / Math.max(a - 1, 0.02) : 2.2 * choice.boxFold;
    const dir = [0.66, 0.43, 0.61], len = Math.hypot(dir[0], dir[1], dir[2]), d = 6.5 * half / len;
    return {
        cam: [fixed(dir[0] * d), fixed(dir[1] * d), fixed(dir[2] * d)],
        yaw: Math.atan2(-dir[2], -dir[0]), pitch: Math.asin(-dir[1] / len),
        iters: 14, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1,
    };
}
/** A view with the formula it is a view of (the view alone does not say). */
interface FormulaView { view: DzView; formula: DzFormulaChoice }
/** Views to go back to, oldest first. Session only. */
const backStack: FormulaView[] = [];
let homeView: FormulaView | null = null;

export interface JumpOptions {
    /** Internal: a Back jump does not push the view it leaves. */
    noBack?: boolean;
}

/** Move the camera to a location (or a bare view) and switch to its formula. One undo step. False
 *  when no renderer is mounted. */
export function jumpTo(target: DzLocationState | DzView, opts: JumpOptions = {}): boolean {
    const host = getHost();
    if (!host) return false;
    const state: DzLocationState = 'view' in target ? target : { view: target, depth: '' };
    const store = useEngineStore.getState();
    if (!opts.noBack) backStack.push({ view: host.getView(), formula: formulaChoiceNow() });
    store.beginParamTransaction();
    jumping = true;
    try {
        jumpSeq++;
        applyFormula(state);
        pushFormulaNow(host);                                        // before the view: THE FORMULA IS NOT IN A VIEW
        host.setView(viewForHost(state.view));
    } finally {
        jumping = false;
        useEngineStore.getState().endParamTransaction();
    }
    return true;
}

// ── a flight is one undo step ────────────────────────────────────────────────────────────────────

/** Flights closer together than this are one undo step. */
export const FLIGHT_MERGE_MS = 1500;
/** Where the flight in the air took off; null on the ground. */
let flightFrom: { view: DzView; at: number } | null = null;
/** Set for the one capture that opens a flight's entry: the "before" of that entry. */
let flightPending: DzView | null = null;
/** The last flight's entry on the undo stack, and when it landed. */
let lastFlight: { entry: unknown; landedAt: number } | null = null;
const sameCamera = (a: DzView, b: DzView): boolean => a.cam[0] === b.cam[0] && a.cam[1] === b.cam[1] && a.cam[2] === b.cam[2];

/** The hands took off (the navigation's activity session began). */
export function flightBegan(): void {
    const host = getHost();
    flightFrom = host ? { view: host.getView(), at: performance.now() } : null;
}

/** The hands landed. One undo entry when the camera moved; none for a look alone. */
export function flightEnded(): void {
    const from = flightFrom;
    flightFrom = null;
    const host = getHost();
    if (!host || !from || sameCamera(from.view, host.getView())) return;
    const store = useEngineStore.getState();
    if (store.interactionSnapshot) return;                       // another bracket is open (see PITFALLS)
    const stack = store.paramUndoStack;
    if (lastFlight && stack[stack.length - 1] === lastFlight.entry && from.at - lastFlight.landedAt < FLIGHT_MERGE_MS) {
        lastFlight.landedAt = performance.now();                 // the same flight, continued: its entry already holds the take-off
        return;
    }
    flightPending = from.view;
    try {
        store.beginParamTransaction();
    } finally {
        flightPending = null;
    }
    jumpSeq++;
    useEngineStore.getState().endParamTransaction();
    const after = useEngineStore.getState().paramUndoStack;
    lastFlight = { entry: after[after.length - 1], landedAt: performance.now() };
}

/** Remember the view the renderer started with, once. */
export function rememberHome(view: DzView): void {
    if (!homeView) homeView = { view, formula: formulaChoiceNow() };
}

export function jumpHome(): void {
    if (homeView) jumpTo({ view: homeView.view, formula: homeView.formula, depth: '' });
}

/** Back to the view before the last jump. */
export function jumpBack(): void {
    const back = backStack.pop();
    if (!back) { showToast('No earlier view to go back to', 'info'); return; }
    jumpTo({ view: back.view, formula: back.formula, depth: '' }, { noBack: true });
}

// ── capture ──────────────────────────────────────────────────────────────────────────────────────

/** The view on screen as a location: its camera, its formula and its depth. What a saved place and
 *  "Copy location" both hold. Throws when no renderer is mounted. */
export function captureLocation(): DzLocationState {
    const host = getHost();
    if (!host) throw new Error('No renderer is mounted: there is no view to save.');
    const depth = depthNow(host);
    return { view: host.getView(), look: { dzFormula: { ...useEngineStore.getState().dzFormula } }, depth: validDepth(depth) ? String(depth) : '' };
}

/** The module's PNG thumbnail re-encoded as a small JPEG. */
async function captureThumbnail(): Promise<string | undefined> {
    const png = getHost()?.thumbnail(THUMBNAIL_PX);
    if (!png) return undefined;
    try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('thumbnail did not decode')); img.src = png; });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const g = canvas.getContext('2d');
        if (!g) return png;
        g.drawImage(img, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
    } catch {
        return png;
    }
}

/** A location's depth as a number, or NaN when it has none. */
export function locationDepth(loc: DzLocation): number {
    const d = Number(loc.state?.depth);
    return validDepth(d) ? d : NaN;
}

// ── across reloads (interim for plan gap E10) ────────────────────────────────────────────────────

function isLocation(row: unknown): row is DzLocation {
    const r = row as DzLocation | null;
    const cam = r?.state?.view?.cam;
    return !!r && typeof r.id === 'string' && typeof r.label === 'string' && Array.isArray(cam) && cam.length === 3 && cam.every((c) => typeof c === 'string');
}

function readStored(): DzLocation[] {
    try {
        const raw = localStorage.getItem(DZ_LOCATIONS_STORAGE_KEY);
        const rows: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(rows) ? rows.filter(isLocation) : [];
    } catch {
        return [];
    }
}

/** Last week's prototype list, in the new shape. Read once; the key is removed afterwards. */
function readLegacy(): DzLocation[] {
    try {
        const raw = localStorage.getItem(LEGACY_BOOKMARKS_KEY);
        if (!raw) return [];
        localStorage.removeItem(LEGACY_BOOKMARKS_KEY);
        const rows: unknown = JSON.parse(raw);
        if (!Array.isArray(rows)) return [];
        const out: DzLocation[] = [];
        for (const row of rows as Array<{ id?: unknown; name?: unknown; createdAt?: unknown; depth?: unknown; view?: DzView }>) {
            const cam = row?.view?.cam;
            if (!Array.isArray(cam) || cam.length !== 3 || !cam.every((c) => typeof c === 'string')) continue;
            const depth = typeof row.depth === 'number' && validDepth(row.depth) ? String(row.depth) : '';
            out.push({
                id: typeof row.id === 'string' ? row.id : `legacy-${out.length}-${Date.now()}`,
                label: typeof row.name === 'string' ? row.name : (depth ? formatDepth(Number(depth)) : 'Location'),
                createdAt: typeof row.createdAt === 'number' ? row.createdAt : Date.now(),
                state: { view: row.view as DzView, depth },
                // last week's PNG thumbnails are left behind: they are what filled the quota
            });
        }
        return out;
    } catch {
        return [];
    }
}

function writeStored(rows: DzLocation[]): void {
    try {
        localStorage.setItem(DZ_LOCATIONS_STORAGE_KEY, JSON.stringify(rows));
    } catch {
        try {
            // Over the quota: keep the places, drop the pictures.
            localStorage.setItem(DZ_LOCATIONS_STORAGE_KEY, JSON.stringify(rows.map(({ thumbnail: _dropped, ...rest }) => rest)));
            showToast('Storage is full: locations were saved without their thumbnails', 'warning', 5000);
        } catch {
            showToast('Storage is full: locations could not be saved for the next visit', 'warning', 5000);
        }
    }
}

// ── install ──────────────────────────────────────────────────────────────────────────────────────

let installed = false;

/** Call once, after the store exists and before the panel manifest. */
export function installLocations(): void {
    if (installed) return;
    installed = true;

    installStateLibrary<DzLocationState>({
        panelId: 'Locations',
        arrayKey: 'savedLocations',
        activeIdKey: 'activeLocationId',
        actions: {
            add: 'addLocation',
            update: 'updateLocation',
            delete: 'deleteLocation',
            duplicate: 'duplicateLocation',
            select: 'selectLocation',
            reorder: 'reorderLocations',
            saveToSlot: 'saveLocationToSlot',
            reset: 'resetLocation',
        },
        defaultLabelPrefix: 'Location',
        capture: captureLocation,
        apply: (state) => { jumpTo(state); },
        captureThumbnail,
        // The default name is the depth with its mantissa: `6.40e-53`.
        suggestLabel: () => {
            const depth = depthNow();
            return validDepth(depth) ? formatDepth(depth) : undefined;
        },
        onReset: jumpHome,
        // Digits recall and Ctrl+digit saves - not while a fly key or a look drag is held: a
        // finger slipping from W onto 1 must not throw the camera to another place.
        slotShortcuts: { count: 9, category: 'Locations', when: () => !isFlying() },
        menu: {
            menuId: 'locations',
            slot: 'left',
            order: 20,
            label: 'Locations',
            title: 'Saved locations',
            align: 'start',
            width: 'w-52',
            openItem: { label: 'Locations panel…', title: 'Open the Locations panel' },
            resetItem: { label: 'Home', title: 'Jump to the start view' },
            slotLabelPrefix: 'Location',
        },
    });

    // A jump, and a flight that moved the camera, is one undo entry holding the exact view on both
    // sides. `flightPending` is the take-off view, for the one capture that opens a flight's entry.
    registerHistoryProvider('dzView', {
        capture: () => ({ seq: jumpSeq, view: flightPending ?? getHost()?.getView() ?? null }),
        restore: (snapshot) => {
            const view = (snapshot as { view: DzView | null } | null)?.view;
            const host = getHost();
            if (!view || !host) return;
            pushFormulaNow(host);                                    // the store is already put back: see PITFALLS
            host.setView(view);
        },
        changeOf: (capture) => (capture as { seq: number }).seq,
    });

    // A switch of formula shows the whole of the new one (PITFALLS: A CAMERA OF ONE FORMULA ...).
    useEngineStore.subscribe((s) => s.dzFormula?.kind, (kind, was) => {
        const host = getHost();
        if (jumping || kind === was || !host || !host.bootParams()) return;
        backStack.push({ view: host.getView(), formula: { ...formulaChoiceNow(), kind: was ?? FORMULA_BULB } });
        pushFormulaNow(host);
        jumpSeq++;                                                   // the open bracket's undo entry takes the view with it
        host.setView(viewForHost(formulaHome(formulaChoiceNow())));
    });

    // Home is the view the renderer started with, read once at the first ready.
    const adoptHome = (): void => {
        const host = getHost();
        if (!host) return;
        void host.ready.then(() => { if (getHost() === host) rememberHome(host.getView()); }, () => undefined);
    };
    subscribeHost(adoptHome);
    adoptHome();

    // The list across reloads: stored rows first, then last week's bookmarks once.
    const stored = [...readStored(), ...readLegacy()];
    if (stored.length > 0) useEngineStore.setState({ savedLocations: stored });
    useEngineStore.subscribe((s) => s.savedLocations, (rows) => writeStored(rows ?? []));
}

/** Save the current view as a location and say so. The B key and the panel's button. */
export async function saveLocationHere(): Promise<void> {
    if (!getHost()) return;
    try {
        await useEngineStore.getState().addLocation();
        showToast('Location saved', 'success');
    } catch (err) {
        showToast(err instanceof Error ? err.message : 'The location could not be saved', 'error');
    }
}
