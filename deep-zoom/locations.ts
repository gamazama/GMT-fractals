/**
 * deep-zoom/locations.ts - saved places, and the one way the camera jumps.
 *
 * PURPOSE
 *   A location is a view (the camera as three 256-bit decimal strings plus yaw and pitch), the
 *   look it was saved with, and its depth. They live in the engine's state library
 *   (`savedLocations`): thumbnails, labels, nine slots, the Locations menu. `jumpTo` is the single
 *   path for every jump - a saved place, a slot key, Home, Back, a starter dive's start, a pasted
 *   location - so each one is one undo step and the renderer never becomes a second writer of the
 *   look values.
 *
 * SEAMS
 *   - `installLocations()` is called once from main.tsx, after the store exists and before the
 *     panel manifest (the library's fields must be on the store when the panel first renders).
 *   - The panel is `components/LocationsPanel.tsx` (the engine's `StateLibraryPanel` with a depth
 *     line and depth order). The starter cards are `components/StarterDives.tsx`.
 *   - Undo: a history provider `dzView` whose `changeOf` is a jump counter. Flying never makes an
 *     undo entry; a jump always does, and it stores the exact strings on both sides.
 *
 * PITFALLS
 *   - Camera values are STRINGS and never pass through `Number()`. Depth is kept as a string too:
 *     the share encoder zeroes numbers under 1e-9.
 *   - `host.setView` also writes iterations, power, phase, light, falloff, colour and detail in the
 *     renderer. A jump therefore applies the look through the feature setters FIRST and hands the
 *     host a view whose look fields already equal the store (`viewForHost`).
 *   - The state library does not keep its list across a reload. Until it can (plan gap E10) this
 *     file mirrors the list to `localStorage['gmt.deepZoom.locations']`, dropping thumbnails if the
 *     quota is hit. Last week's `gmt.deepzoom.bookmarks.v1` rows are imported once, then removed.
 *   - Slot keys act only with the pointer free: a slip from W onto 1 at 1e-50 must not teleport.
 */
import { useEngineStore } from '../store/engineStore';
import { installStateLibrary } from '../engine/store/installStateLibrary';
import type { StateSnapshot, StateLibrarySavedToast } from '../engine/store/createStateLibrarySlice';
import { registerHistoryProvider } from '../store/slices/historySlice';
import { showToast } from '../engine/store/toastStore';
import { getHost, subscribeHost } from './host/current';
import type { DzView } from './host/DeepZoomHost';
import { LIGHT_TYPE_RENDERER_VALUES, lightTypeToRenderer } from './features/light';
import { colourFromRenderer, colourToRenderer } from './features/colour';
import { formatDepth, validDepth } from './components/depthFormat';
import { isFlying } from './navigationState';
import type { DzColourSlice, DzFormulaSlice, DzLightSlice } from './storeTypes';

/** The look a location was saved with: the three look slices and the detail. */
/** The march settings a place needs to draw right (Quality tab: Step size, Hit refine, Reach). */
export interface DzLocationMarch {
    stepSize: number;
    hitRefine: number;
    reach: number;
}

export interface DzLocationLook {
    dzFormula: DzFormulaSlice;
    dzLight: DzLightSlice;
    dzColour: DzColourSlice;
    detail: number;
    /** Saved with every location since 2026-10-08: the owner's power-2 place at 5e-20 draws 85 %
     *  of its pixels on the wrong surface at the default step and needs 0.1, so a place that does
     *  not carry its march comes back broken. Absent on older locations: a jump to one of those
     *  leaves the Quality tab as it is. */
    march?: DzLocationMarch;
}

export interface DzLocationState {
    view: DzView;
    /** Absent on a location that came in as a bare view (a starter, last week's bookmark). */
    look?: DzLocationLook;
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

// ── the look, between the store and a view ───────────────────────────────────────────────────────

function captureLook(): DzLocationLook {
    const s = useEngineStore.getState();
    return {
        dzFormula: { ...s.dzFormula }, dzLight: { ...s.dzLight }, dzColour: { ...s.dzColour }, detail: s.dzQuality.detail,
        march: { stepSize: s.dzQuality.stepSize, hitRefine: s.dzQuality.hitRefine, reach: s.dzQuality.reach },
    };
}

function applyLook(look: DzLocationLook): void {
    const s = useEngineStore.getState();
    s.setDzFormula(look.dzFormula);
    s.setDzLight(look.dzLight);
    s.setDzColour(look.dzColour);
    s.setDzQuality(look.march ? { detail: look.detail, ...look.march } : { detail: look.detail });
}

/** The look fields a bare view carries, written to the store (iterations, power, phase, light
 *  type, falloff, colour, scale, detail). Used when a view arrives with no saved look. */
function applyViewLook(view: DzView): void {
    const s = useEngineStore.getState();
    s.setDzFormula({ power: view.power, phaseTheta: view.phase[0], phasePhi: view.phase[1], iterations: view.iters });
    const lightType = LIGHT_TYPE_RENDERER_VALUES.indexOf(view.light as (typeof LIGHT_TYPE_RENDERER_VALUES)[number]);
    s.setDzLight({ lightType: lightType < 0 ? 0 : lightType, lampFalloff: view.falloff });
    s.setDzColour({ ...colourFromRenderer(view.color), scale: view.cscale });
    s.setDzQuality({ detail: view.surf });
}

/** `view` with its look fields replaced by what the store holds now, so `host.setView` writes
 *  nothing the store does not already say. The camera strings pass through untouched. */
export function viewForHost(view: DzView): DzView {
    const s = useEngineStore.getState();
    return {
        cam: view.cam,
        yaw: view.yaw,
        pitch: view.pitch,
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
/** Views to go back to, oldest first. Session only. */
const backStack: DzView[] = [];
let homeView: DzView | null = null;

export interface JumpOptions {
    /** Keep the current light, colour, formula and detail; move the camera only. */
    keepLook?: boolean;
    /** Internal: a Back jump does not push the view it leaves. */
    noBack?: boolean;
}

/** Move the camera to a location (or a bare view). One undo step. False when no renderer is mounted. */
export function jumpTo(target: DzLocationState | DzView, opts: JumpOptions = {}): boolean {
    const host = getHost();
    if (!host) return false;
    const state: DzLocationState = 'view' in target ? target : { view: target, depth: '' };
    const store = useEngineStore.getState();
    if (!opts.noBack) backStack.push(host.getView());
    store.beginParamTransaction();
    try {
        jumpSeq++;
        if (!opts.keepLook) {
            if (state.look) applyLook(state.look);
            else applyViewLook(state.view);
        }
        host.setView(viewForHost(state.view));
    } finally {
        useEngineStore.getState().endParamTransaction();
    }
    return true;
}

/** Remember the view the renderer started with, once. */
export function rememberHome(view: DzView): void {
    if (!homeView) homeView = view;
}

export function jumpHome(): void {
    if (homeView) jumpTo(homeView);
}

/** Back to the view before the last jump. */
export function jumpBack(): void {
    const view = backStack.pop();
    if (!view) { showToast('No earlier view to go back to', 'info'); return; }
    jumpTo(view, { noBack: true });
}

// ── capture ──────────────────────────────────────────────────────────────────────────────────────

function captureLocation(): DzLocationState {
    const host = getHost();
    if (!host) throw new Error('No renderer is mounted: there is no view to save.');
    const depth = host.telemetry().depth;
    return { view: host.getView(), look: captureLook(), depth: validDepth(depth) ? String(depth) : '' };
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
            const depth = getHost()?.telemetry().depth;
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

    // A jump is one undo entry holding the exact view on both sides; flying makes none.
    registerHistoryProvider('dzView', {
        capture: () => ({ seq: jumpSeq, view: getHost()?.getView() ?? null }),
        restore: (snapshot) => {
            const view = (snapshot as { view: DzView | null } | null)?.view;
            if (view) getHost()?.setView(view);
        },
        changeOf: (capture) => (capture as { seq: number }).seq,
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
