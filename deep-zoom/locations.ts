/**
 * deep-zoom/locations.ts - saved places, and the one way the camera jumps.
 *
 * PURPOSE
 *   A location is a view (the camera as three 256-bit decimal strings plus yaw, pitch and, when
 *   there is one, roll), the formula it is a view of, and its depth. NOTHING ELSE: no light, no
 *   colour or gradient, no detail, no march setting (the owner, 2026-10-10: "a place shouldnt
 *   store light and colour - this will make it hard to improve the lighting and color system").
 *   A jump leaves all of those as they are. They live in the engine's state library
 *   (`savedLocations`): thumbnails, labels, nine slots (no top-bar menu since 2026-10-17, F15: the
 *   Places tab and the slot keys are the ways in). On screen a location is a "place" (F12, the
 *   owner's word); the code, the storage key and the file formats keep "location". `jumpTo` is the single
 *   path for every jump - a saved place, a slot key, Home, Back, the readout's "Start view"
 *   (`jumpStart`), a starter dive's start, a pasted location or link, the end of the previous trail
 *   under its own formula (`jumpToTrailEnd`) - so each one is one undo step and
 *   the renderer never becomes a second writer of the look values. A scene file and a share link
 *   are not places: they carry the whole scene.
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
 *     (400 or 500) and `setView` cuts a view's count to it: a jump tells the renderer the formula
 *     BEFORE it hands over the view (`pushFormulaNow`), and so does an undo (the history provider's
 *     `restore` runs after the store has been put back, so the store already says which formula).
 *   - A CAMERA OF ONE FORMULA MEANS NOTHING IN THE OTHER. The bulb's start view is inside the
 *     Mandelbox (a blank wall, seen 2026-10-09), and a deep place of either is nowhere in the other.
 *     So a change of `dzFormula.kind` that did not come from a jump moves the camera to the new
 *     formula's whole-object view (`formulaHome`), inside the same undo bracket as the row's own
 *     write: Ctrl+Z brings back the formula AND the place. A jump sets `jumping` and places the
 *     camera itself; an undo or a scene load passes through here too, and its own view, restored
 *     after the store, is the one that stays.
 *   - JULIA MODE (2026-10-12; grep the name in renderer/core.js). The MODE is the formula's
 *     (`dzFormula.juliaMode`, one of `FORMULA_CHOICE_KEYS`: a place, Back and Home carry it, and a
 *     place without it is in Mandelbrot mode). The CONSTANT is the view's (`DzView.julia`, three
 *     strings like `cam`): `host.getView()` gives it while the mode is on, `host.setView` takes
 *     it, and `viewForHost` hands it through untouched - so a saved place, an undo entry, a scene
 *     and a pasted text all hold it string for string. A place of one mode is nowhere in the
 *     other, as with the two formulas: a jump sets the mode before it hands over the view, and a
 *     switch of mode that is not a jump moves the camera - on: to the whole Julia set of the
 *     constant in force (`juliaHome`); off: to the formula's whole-object view - in the same undo
 *     bracket as the row's own write. WHICH CONSTANT (the owner, 2026-10-12): the SWITCH comes
 *     back to the last one when there is one (`hasConstant`: the Constant row is not 0, 0, 0, or
 *     the renderer still holds one) and takes the point looked at only when there is none; the
 *     BUTTON, "Julia from this place" (`juliaFromThisPlace`), always takes the point looked at.
 *     THE POINT IS LOOKED AT BEFORE THE MODE IS PUSHED: afterwards the renderer
 *     would march the ray through the Julia set, not through the picture the user was looking at.
 *   - THE CONSTANT'S ROWS FOLLOW THE VIEW (2026-10-12; features/formula.ts, THE CONSTANT'S ROW). The
 *     store holds the constant a second time, as three doubles (`dzFormula.juliaX` / `Y` / `Z`),
 *     and the sync pushes them whenever they differ from what the renderer holds. So every view
 *     that carries a constant is handed over WITH its rows, in the same store write or undo
 *     bracket: `applyFormula` (a place, Back, Home, pasted text) and `showJuliaSet` (the button,
 *     the switch). Leave one out and the rows it left behind overwrite the constant a frame
 *     later - with the last place's, or with 0, 0, 0 for a place saved before the rows existed.
 *     And the rows are written from a view ONLY: the three numbers in a saved place's formula
 *     (the whole slice is saved) are not read, so a jump to a place in Mandelbrot mode leaves
 *     the last constant standing.
 *     An undo needs nothing: the store it puts back already holds the rows of the view it puts back.
 *     `showJuliaSet` writes the store from inside the `juliaMode` subscription. That is safe here:
 *     a listener registered after it is called once, with the rows already written (seen
 *     2026-10-12 in the app with a listener of our own; zustand hands every listener the store's
 *     CURRENT state, not the state of the write that woke it).
 *   - A JUMP AND A SWITCH OF FORMULA OR OF MODE END THE TRAIL (`trailEnds` in deep-zoom/trail.ts: what the app
 *     remembers of how the camera was flown), and both call it BEFORE the view is set: the trail's
 *     last point is the camera as it stood. An undo calls nothing: the view it puts back is one the
 *     trail has usually been at, and the trail takes it from there.
 *
 * @assumption Which constant the switch takes, and the Constant row written by the switch and by
 *   the button, have no check line. Seen once in the real app, 2026-10-12 (headless Chrome on the
 *   GPU, debug/scratch/julia-rows/app-rows.mts, git-ignored): with no constant yet the switch took
 *   the point looked at; switched off, a jump to another kept place and switched on again, the
 *   renderer held the same three strings to the character and not the point looked at there; the
 *   button pressed there took that point. The jump's own write of the rows has a line in
 *   check:deep-zoom-scene-roundtrip ("place: a jump to a Julia place writes the Constant row
 *   ..."), which is not known to go red for a jump that forgets them.
 */
import { useEngineStore } from '../store/engineStore';
import React from 'react';
import { installStateLibrary } from '../engine/store/installStateLibrary';
import { StateLibraryToast } from '../engine/components/StateLibraryToast';
import { topbar } from '../engine/plugins/TopBar';
import type { StateSnapshot, StateLibrarySavedToast } from '../engine/store/createStateLibrarySlice';
import { registerHistoryProvider } from '../store/slices/historySlice';
import { showToast } from '../engine/store/toastStore';
import { getHost, subscribeHost } from './host/current';
import type { DzView } from './host/DeepZoomHost';
import { lightTypeToRenderer } from './features/light';
import { colourToRenderer } from './features/colour';
import { FORMULA_BOX, FORMULA_BULB, FORMULA_CHOICE_KEYS, FORMULA_KALI, juliaRowsOf } from './features/formula';
import type { DzFormulaChoice } from './features/formula';
import { paramId } from './host/paramMap';
import type { DeepZoomHost, DzParams, DzParamValue } from './host/DeepZoomHost';
import { formatDepth, validDepth } from './components/depthFormat';
import { depthNow } from './depthNow';
import { isFlying } from './navigationState';
import { setTrailFormulaReader, trailEnds } from './trail';
import type { TrailFormula, TrailSample } from './trail';
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
    const out: Record<string, unknown> = {};
    for (const key of FORMULA_CHOICE_KEYS) out[key] = f[key];
    return out as unknown as DzFormulaChoice;   // every key of the choice, read off the slice that declares them
}

/** Tell the renderer the store's formula NOW, ahead of the sync's own (delayed) push, so that the
 *  view handed over next is taken under it. A host that is not ready yet is told nothing: at ready
 *  the sync sends everything, and nothing may reach the renderer before then (useHostSync.ts). */
const JULIA_ROW_KEYS = ['juliaX', 'juliaY', 'juliaZ'] as const;
function pushFormulaNow(host: DeepZoomHost, withConstant = false): void {
    if (!host.bootParams()) return;
    const patch: DzParams = {};
    // The schedule is an object, as the gradient is: the host's push compiles it (host/looseParams.ts, THE SCHEDULE).
    for (const [key, value] of Object.entries(formulaChoiceNow())) patch[paramId('dzFormula', key)] = value as DzParamValue;
    // The Constant row too, for the switch that re-enters a Julia set: the constant it shows is in force before
    // the renderer is asked where that set is. (The host sends it only if it differs from the one it holds.)
    if (withConstant) for (const key of JULIA_ROW_KEYS) patch[paramId('dzFormula', key)] = useEngineStore.getState().dzFormula[key];
    host.setParams(patch);
}

/** Whether there is a Julia constant to come back to: the Constant row is not 0, 0, 0, or the renderer still
 *  holds one from the last time the mode was on. (The origin as a constant cannot be told from none.) */
function hasConstant(host: DeepZoomHost): boolean {
    const row = useEngineStore.getState().dzFormula, held = host.getParams();
    return JULIA_ROW_KEYS.some((key) => (row[key] ?? 0) !== 0 || (held[paramId('dzFormula', key)] ?? 0) !== 0);
}

/** All a jump writes to the store: the formula. A place's saved one; for a bare view the fields the
 *  view itself carries (power, phase, iterations) with the formula it came with. Without a formula
 *  choice - every place and view from before 2026-10-09 - it is the Mandelbulb. A view's own light,
 *  colour and detail fields are not read. The Constant row is written from the VIEW's Julia constant
 *  and from nothing else: the three numbers a saved formula holds are left out, so a place without a
 *  constant leaves the last one where it is (PITFALLS: THE CONSTANT'S ROWS FOLLOW THE VIEW). */
function applyFormula(state: DzLocationState): void {
    const v = state.view;
    const whole: Partial<DzFormulaSlice> = state.look
        ? state.look.dzFormula
        : { ...state.formula, power: v.power, phaseTheta: v.phase[0], phasePhi: v.phase[1], iterations: v.iters };
    const { juliaX: _x, juliaY: _y, juliaZ: _z, ...saved } = whole;   // a saved place's formula is the whole slice: these are in it
    useEngineStore.getState().setDzFormula({
        kind: FORMULA_BULB,
        juliaMode: false,                                            // every place from before Julia mode, and every card
        burning: false,                                              // and from before Burning (its mix stays as the row has it)
        boxSchedule: {},                                             // and from before the iteration schedule (2026-10-18), and every card
        ...saved,
        ...(v.julia ? juliaRowsOf(v.julia) : {}),
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
        ...(view.julia ? { julia: view.julia } : {}),                // the Julia constant: three strings, untouched
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
 * first starter's view (the start of the sample flight), and with Burning on that view from 1.3 times as
 * far. The box's follows its scale - the set fills
 * a cube of half-side 2 L (s + 1) / (s - 1) for a positive scale s (6 at scale 2) and about 2.2 L for
 * a negative one (measured at -1.5) - seen from 6.5 half-sides away along a fixed diagonal (at 5 the
 * cube's corners left a square frame).
 * KaliBox with the point added has NO WHOLE (an octant without end; features/formula.ts, KALIBOX): its home is
 * ONE FIXED VIEW of the octant's tip, whatever its numbers - the camera the CPU study drew its first still from
 * (plans/deep-zoom-shell/BURNING-KALIBOX.md: 8.5 from the middle of the shapes at Scale 1.8). A negative scale
 * puts the octant on the other side of the origin, and the same view is then taken from there.
 */
const KALI_HOME = { cam: [2.8400989489522894, 2.523655503975011, 3.141106044453628], yaw: -2.3249546567620767, pitch: -0.4342807733694343 };
function formulaHome(choice: DzFormulaChoice): DzView {
    if (choice.kind === FORMULA_KALI) {
        const far = (choice.kaliScale ?? 1.8) < 0;                   // the octant is the opposite one: stand opposite, look back
        return {
            cam: KALI_HOME.cam.map((x) => fixed(far ? -x : x)) as [string, string, string],
            yaw: far ? KALI_HOME.yaw + Math.PI : KALI_HOME.yaw, pitch: far ? -KALI_HOME.pitch : KALI_HOME.pitch,
            iters: 14, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1,
        };
    }
    if (choice.kind !== FORMULA_BOX) {
        // With Burning on (features/formula.ts, BURNING) the bulb fills the ball it lies in (radius 1.155 at power 8),
        // where the plain bulb leaves room: from the first starter's 3.23 its top and bottom are cut off (seen
        // 2026-10-12). So the camera stands 1.3 times as far out, on the same line through the centre.
        const home = STARTERS[0].view;
        if (!choice.burning) return home;
        return { ...home, cam: [0, 1, 2].map((i) => String(BigInt(home.cam[i]) * 13n / 10n)) as [string, string, string] };
    }
    const s = choice.boxScale ?? 2, a = Math.abs(s), fold = choice.boxFold ?? 1;   // (a choice may leave out a number: the row's default)
    const half = s > 0 ? 2 * fold * (a + 1) / Math.max(a - 1, 0.02) : 2.2 * fold;
    const dir = [0.66, 0.43, 0.61], len = Math.hypot(dir[0], dir[1], dir[2]), d = 6.5 * half / len;
    return {
        cam: [fixed(dir[0] * d), fixed(dir[1] * d), fixed(dir[2] * d)],
        yaw: Math.atan2(-dir[2], -dir[0]), pitch: Math.asin(-dir[1] / len),
        iters: 14, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1,
    };
}
/**
 * The whole of the Julia set IN FORCE, from outside: the camera 2 radii from the centre of the ball
 * the renderer finds about the solid (`host.wholeObject()`, a coarse scan on the CPU), along the
 * diagonal `formulaHome` uses, looking at that centre. Two radii: the picture's half-height is 31.5
 * degrees, and a ball is inside it from 1.91 radii out. Null when the renderer finds no solid: the
 * constant has no Julia set at a whole-object iteration count.
 */
function juliaHome(host: DeepZoomHost): DzView | null {
    const ball = host.wholeObject();
    if (!ball) return null;
    const dir = [0.66, 0.43, 0.61], len = Math.hypot(dir[0], dir[1], dir[2]), d = 2 * ball.radius / len;
    return {
        cam: [fixed(ball.center[0] + dir[0] * d), fixed(ball.center[1] + dir[1] * d), fixed(ball.center[2] + dir[2] * d)],
        yaw: Math.atan2(-dir[2], -dir[0]), pitch: Math.asin(-dir[1] / len),
        iters: 14, power: 8, phase: [0, 0], light: 0, falloff: 4, color: 0, cscale: 1, surf: 1,
    };
}

/** Put the constant in force - the Constant row with it - and the camera where the whole of its Julia set
 *  is seen (the renderer is already in Julia mode). False when the constant has no set: the camera then
 *  stays where it was. Without a constant the one the renderer holds stays, and the row already shows it. */
function showJuliaSet(host: DeepZoomHost, constant: [string, string, string] | undefined): boolean {
    const here = viewForHost(host.getView());
    const julia = constant ? { julia: constant } : {};
    host.setView({ ...here, ...julia });                             // the constant first: the renderer says where ITS set is
    if (constant) useEngineStore.getState().setDzFormula(juliaRowsOf(constant));   // PITFALLS: THE CONSTANT'S ROWS FOLLOW THE VIEW
    const home = juliaHome(host);
    if (home) host.setView({ ...viewForHost(home), ...julia });
    return !!home;
}

/**
 * "Julia from this place": the point at the centre of the view becomes the Julia constant, Julia mode
 * goes on and the camera goes to where the whole of that Julia set is seen from outside. One undo
 * step; the trail ends; Back returns to the place. Says why when it cannot. Returns whether it did.
 */
export function juliaFromThisPlace(): boolean {
    const host = getHost();
    if (!host || !host.bootParams()) return false;
    const look = host.lookPoint();                                   // BEFORE the mode is pushed: see PITFALLS, JULIA MODE
    if (look.kind !== 'hit') {
        showToast(look.kind === 'inside' ? 'The camera is inside the solid: fly out of it first' : 'Nothing is at the centre of the view: aim it at a surface', 'warning', 5000);
        return false;
    }
    backStack.push({ view: host.getView(), formula: formulaChoiceNow() });
    trailEnds();                                                     // a Julia set is another object: the trail ends where the camera stands
    useEngineStore.getState().beginParamTransaction();
    jumping = true;
    try {
        jumpSeq++;
        useEngineStore.getState().setDzFormula({ juliaMode: true });
        pushFormulaNow(host);
        if (!showJuliaSet(host, look.point)) showToast('That point has no Julia set to show: the picture is empty', 'warning', 6000);
    } finally {
        jumping = false;
        useEngineStore.getState().endParamTransaction();
    }
    return true;
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
    trailEnds();                                                     // a jump is not flown: the trail ends where the camera stands
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

/** A fresh start (no restored session, no link) opens on the Start view (`startAtStartView`). */
let startFresh = false;

/**
 * This load opens on the formula's Start view (`formulaHome`), the view "Start view" goes to - not
 * on the renderer's own first view (the bulb from 2.6 off its centre, 1.58e0). The owner, F7,
 * 2026-10-17. main.tsx calls it when no link opened and no session was restored; each host mounted
 * until the first is ready is handed the camera BEFORE ITS FIRST FRAME (`adoptHome`), so nothing
 * jumps, nothing is parked (a parked view puts up the large loading card) and nothing builds twice.
 * Home is then that view, as `rememberHome` reads it at ready.
 * @assumption Seen once in the app, 2026-10-17 (debug/scratch/streamline2/try-f7.mjs, git-ignored): a
 *   fresh profile's host held the Start view from its frame 0, the depth read 2.13e0 and Home came
 *   back to it; a restored session and a link still parked their view over the renderer's own first
 *   view and opened on it. No standing check boots a page for this (the smoke boots clean profiles
 *   and passes either way).
 */
export function startAtStartView(): void {
    startFresh = true;
}

/** Remember the view the renderer started with, once. */
export function rememberHome(view: DzView): void {
    if (!homeView) homeView = { view, formula: formulaChoiceNow() };
}

export function jumpHome(): void {
    if (homeView) jumpTo({ view: homeView.view, formula: homeView.formula, depth: '' });
}

/**
 * "Start view": the camera goes to where the whole of what is drawn is seen from outside - the
 * formula IN FORCE as a switch to it would show it (`formulaHome`), in Julia mode the whole Julia
 * set of the constant in force (`juliaHome`, as `showJuliaSet` finds it). THE CAMERA ONLY: the
 * formula, its power, phase and iteration floor, Julia mode and the constant all stay. A jump like
 * any other (`jumpTo`): one undo step, the trail ends, Back returns.
 * NOT THE HOME KEY: Home (`jumpHome`) goes to the view the app started with, which after a restored
 * session or a link is that place, and brings that view's formula with it. On a fresh start the two
 * are one view: the app opens here (`startAtStartView`; the owner, F7, 2026-10-17 - until then it
 * opened on the renderer's own first view, the bulb from 2.6 off its centre).
 */
export function jumpStart(): void {
    const host = getHost();
    if (!host || !host.bootParams()) return;
    const choice = formulaChoiceNow(), f = useEngineStore.getState().dzFormula;
    const whole = choice.juliaMode ? juliaHome(host) : null;
    if (choice.juliaMode && !whole) showToast('This constant has no Julia set to show: the camera goes to the formula\'s own start view', 'warning', 6000);
    // A bare view writes its own power, phase and count into the formula (`applyFormula`): they are handed the store's.
    jumpTo({ view: { ...(whole ?? formulaHome(choice)), iters: f.iterations, power: f.power, phase: [f.phaseTheta, f.phasePhi] }, formula: choice, depth: '' });
}

/** What a formula draws: its choice, power and phase (with a view's Julia constant). The iteration floor is not in it. */
const SHAPE_KEYS = [...FORMULA_CHOICE_KEYS, 'power', 'phaseTheta', 'phasePhi'] as const;

/**
 * Where a trail ended, as a place: the camera of its last sample under the formula it was flown in
 * (`TrailFormula`, deep-zoom/trail.ts) - jumped to when that formula does not draw what the one in
 * force does. For a route made from the previous trail (`routeFromTrail` in deep-zoom/route.ts): a
 * jump to another formula ended that trail, and its route on the formula in force passes through
 * the solid. A jump like any other: one undo step, the trail ends, Back returns. Returns whether it
 * jumped; not when the formula is the one in force, or not known.
 */
export function jumpToTrailEnd(trail: readonly TrailSample[], flownIn: TrailFormula | null): boolean {
    const host = getHost(), end = trail[trail.length - 1];
    if (!host || !flownIn || !end) return false;
    const now = useEngineStore.getState().dzFormula, { roll: _roll, julia, ...here } = host.getView();
    // The schedule is an object: compared by its content (a scene load brings the same rules as a new object).
    const same = (a: unknown, b: unknown): boolean => a === b || (typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));
    if (SHAPE_KEYS.every((key) => same(flownIn.formula[key], now[key])) && String(flownIn.julia) === String(julia)) return false;
    const cam = [String(end.p[0]), String(end.p[1]), String(end.p[2])] as [string, string, string];
    return jumpTo({
        // The look fields are the store's anyway (`viewForHost`): the camera and the count are the sample's.
        view: { ...here, cam, yaw: end.yaw, pitch: end.pitch, ...(end.roll ? { roll: end.roll } : {}), ...(flownIn.julia ? { julia: flownIn.julia } : {}), iters: end.iters },
        look: { dzFormula: flownIn.formula },
        depth: String(end.depth),
    });
}

/** Back to the view before the last jump. */
export function jumpBack(): void {
    const back = backStack.pop();
    if (!back) { showToast('No earlier place to go back to', 'info'); return; }
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
                label: typeof row.name === 'string' ? row.name : (depth ? formatDepth(Number(depth)) : 'Place'),
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
            showToast('Storage is full: places were saved without their thumbnails', 'warning', 5000);
        } catch {
            showToast('Storage is full: places could not be saved for the next visit', 'warning', 5000);
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
        defaultLabelPrefix: 'Place',
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
        // finger slipping from W onto 1 must not throw the camera to another place. The two
        // prefixes are what Help's shortcuts page prints for these keys (it is written from the
        // registry: deep-zoom/help/shortcutsPage.ts): "Go to place 1 to 9".
        slotShortcuts: { count: 9, category: 'Places', when: () => !isFlying(), savePrefix: 'Save here as place', recallPrefix: 'Go to place' },
        // No top-bar menu (F15, 2026-10-17): the Places tab holds the list, and the menu's rows were the
        // slot keys and Home again. Without it the library mounts no saved-toast, so it is mounted below,
        // after My Gradients (at the menu's place its pill ran off the window). Ctrl+1-9 said nothing until
        // it was. (`saveLocationHere`, B and the tab's button, says "Place saved" itself.)
        menu: null,
    });
    topbar.register({ id: 'savedLocations-saved-toast', slot: 'left', order: 40.5, component: () => React.createElement(StateLibraryToast, { arrayKey: 'savedLocations' }) });

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

    // The trail keeps the formula it is flown in (deep-zoom/trail.ts may not import the store).
    setTrailFormulaReader(() => useEngineStore.getState().dzFormula);

    // A switch of formula shows the whole of the new one (PITFALLS: A CAMERA OF ONE FORMULA ...).
    useEngineStore.subscribe((s) => s.dzFormula?.kind, (kind, was) => {
        const host = getHost();
        if (jumping || kind === was || !host || !host.bootParams()) return;
        backStack.push({ view: host.getView(), formula: { ...formulaChoiceNow(), kind: was ?? FORMULA_BULB } });
        trailEnds();                                                 // a deep place exists only under the formula it was found with
        pushFormulaNow(host);
        jumpSeq++;                                                   // the open bracket's undo entry takes the view with it
        // in Julia mode the other formula's set of the SAME constant is shown; without one, its Mandelbrot-mode view
        if (!(formulaChoiceNow().juliaMode && showJuliaSet(host, undefined))) host.setView(viewForHost(formulaHome(formulaChoiceNow())));
    });

    // A switch of Julia mode by its row (PITFALLS: JULIA MODE). On, with a constant to come back to (the owner,
    // 2026-10-12): that constant stays, exact, and the whole of its set is shown. On, with none yet: the point looked
    // at becomes the constant - when nothing is looked at, the renderer's 0, 0, 0 stays. Off: the whole of the
    // formula's own object. No toast here: an undo and a scene load pass through too, and their own view, restored
    // after the store, is the one that stays.
    useEngineStore.subscribe((s) => s.dzFormula?.juliaMode, (on, was) => {
        const host = getHost();
        if (jumping || !!on === !!was || !host || !host.bootParams()) return;
        const back = !!on && hasConstant(host);
        const look = on && !back ? host.lookPoint({ maxSteps: 600 }) : null;  // before the push: the picture as the user sees it
        backStack.push({ view: host.getView(), formula: { ...formulaChoiceNow(), juliaMode: !!was } });
        trailEnds();
        pushFormulaNow(host, back);
        jumpSeq++;
        if (on) showJuliaSet(host, look && look.kind === 'hit' ? look.point : undefined);
        else host.setView(viewForHost(formulaHome(formulaChoiceNow())));
    });

    // Home is the view the renderer started with, read once at the first ready. On a fresh start that is the
    // Start view, handed over here: a host is put in the holder before its first frame (DeepZoomSurface.tsx).
    const adoptHome = (): void => {
        const host = getHost();
        if (!host) return;
        if (startFresh) {
            const { cam, yaw, pitch } = formulaHome(formulaChoiceNow());
            host.setView({ ...host.getView(), cam, yaw, pitch });   // the camera only: the renderer's look stays its own
        }
        void host.ready.then(() => { if (getHost() === host) { startFresh = false; rememberHome(host.getView()); } }, () => undefined);
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
        showToast('Place saved', 'success');
    } catch (err) {
        showToast(err instanceof Error ? err.message : 'The place could not be saved', 'error');
    }
}
