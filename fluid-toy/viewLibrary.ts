/**
 * fluid-toy view library — wires the engine state-library plugin with
 * julia-slice capture/apply. One install call sets up the slice, slot
 * shortcuts, and topbar Camera menu.
 *
 * "View" is the user-facing label; the underlying primitive is the
 * generic state-library shared with GMT's Camera Manager.
 *
 * Snapshot payload is the full Fractal-tab fingerprint, not just a
 * camera. fluid-toy's "view" couples the camera-like fields (center,
 * zoom) with the fractal config (kind, juliaC, maxIter, power) — they
 * shape what the user is looking at, and a saved view should restore
 * the *whole* picture in one click.
 */

import { useEngineStore } from '../store/engineStore';
import { installStateLibrary } from '../engine/store/installStateLibrary';
import { lerp, easeInOutQuad } from '../engine/math/Easing';
import { CameraIcon } from '../components/Icons';
import type { StateSnapshot } from '../engine/store/createStateLibrarySlice';
import { nanoid } from 'nanoid';

export interface JuliaViewState {
    kind: number;
    juliaC: { x: number; y: number };
    center: { x: number; y: number };
    zoom: number;
    maxIter: number;
    power: number;
}

// Augment the engine store with the dynamic fields written by
// installStateLibrary. Keys are baked into installFluidToyViewLibrary
// below, so the augmentation is purely descriptive — no risk of drift
// against the runtime install (one source of truth: `arrayKey`,
// `activeIdKey`, `actions` are literals here).
export type ViewSnapshot = StateSnapshot<JuliaViewState>;

declare module '../types/store' {
    interface EngineStoreState {
        savedViews: ViewSnapshot[];
        activeViewId: string | null;
        savedViews_savedToast: import('../engine/store/createStateLibrarySlice').StateLibrarySavedToast | null;
        savedViews_notifyDot: boolean;
        _viewIsModified?: (s: JuliaViewState) => boolean;
    }
    interface EngineActions {
        addView: (label?: string) => Promise<string>;
        updateView: (id: string, patch?: Partial<ViewSnapshot>) => void;
        deleteView: (id: string) => void;
        duplicateView: (id: string) => void;
        selectView: (id: string | null) => void;
        reorderViews: (from: number, to: number) => void;
        saveViewToSlot: (slotIndex: number) => void;
        resetView: () => void;
    }
}

const captureView = (): JuliaViewState => {
    const julia = useEngineStore.getState().julia;
    return {
        kind: julia.kind,
        juliaC: { ...julia.juliaC },
        center: { ...julia.center },
        zoom: julia.zoom,
        maxIter: julia.maxIter,
        power: julia.power,
    };
};

// ── Smooth view tween ──────────────────────────────────────────────────
// `kind` (enum) and `maxIter` (integer) snap immediately at tween start.
// `zoom` interpolates in log-space so the perceived zoom rate stays
// uniform regardless of magnitude. Cancels any previous in-flight tween
// before starting.

const TWEEN_MS = 500;

let _tweenCancel: number | null = null;

const tweenView = (target: JuliaViewState) => {
    const setJulia = useEngineStore.getState().setJulia;
    if (!setJulia) return;

    if (_tweenCancel !== null) {
        cancelAnimationFrame(_tweenCancel);
        _tweenCancel = null;
    }

    const start = captureView();

    setJulia({ kind: target.kind, maxIter: target.maxIter });

    const startLogZoom = Math.log(Math.max(start.zoom, 1e-12));
    const endLogZoom = Math.log(Math.max(target.zoom, 1e-12));
    const t0 = performance.now();

    const step = () => {
        const tRaw = (performance.now() - t0) / TWEEN_MS;
        if (tRaw >= 1) {
            // Exact-target write so we don't accumulate fp drift.
            setJulia({
                center: { x: target.center.x, y: target.center.y },
                juliaC: { x: target.juliaC.x, y: target.juliaC.y },
                zoom: target.zoom,
                power: target.power,
            });
            _tweenCancel = null;
            return;
        }
        const e = easeInOutQuad(tRaw);
        setJulia({
            center: {
                x: lerp(start.center.x, target.center.x, e),
                y: lerp(start.center.y, target.center.y, e),
            },
            juliaC: {
                x: lerp(start.juliaC.x, target.juliaC.x, e),
                y: lerp(start.juliaC.y, target.juliaC.y, e),
            },
            zoom: Math.exp(lerp(startLogZoom, endLogZoom, e)),
            power: lerp(start.power, target.power, e),
        });
        _tweenCancel = requestAnimationFrame(step);
    };

    _tweenCancel = requestAnimationFrame(step);
};

const applyView = (state: JuliaViewState) => {
    tweenView(state);
};

const isViewModified = (snap: JuliaViewState): boolean => {
    const live = captureView();
    if (live.kind !== snap.kind) return true;
    if (live.maxIter !== snap.maxIter) return true;
    if (live.power !== snap.power) return true;
    if (Math.abs(live.zoom - snap.zoom) > 1e-5) return true;
    if (Math.abs(live.center.x - snap.center.x) +
        Math.abs(live.center.y - snap.center.y) > 1e-4) return true;
    if (Math.abs(live.juliaC.x - snap.juliaC.x) +
        Math.abs(live.juliaC.y - snap.juliaC.y) > 1e-4) return true;
    return false;
};

/** Capture the live canvas as a 128px JPEG data URL. fluid-toy mounts
 *  a single canvas inside ViewportFrame; we query by tag. Returns
 *  undefined on any error so the snapshot just goes thumbnail-less. */
const captureCanvasThumbnail = async (): Promise<string | undefined> => {
    try {
        const src = document.querySelector('canvas');
        if (!src) return undefined;
        const size = 128;
        const out = document.createElement('canvas');
        out.width = size;
        out.height = size;
        const ctx = out.getContext('2d');
        if (!ctx) return undefined;
        const srcSize = Math.min(src.width, src.height);
        const sx = (src.width - srcSize) / 2;
        const sy = (src.height - srcSize) / 2;
        ctx.drawImage(src, sx, sy, srcSize, srcSize, 0, 0, size, size);
        return out.toDataURL('image/jpeg', 0.7);
    } catch {
        return undefined;
    }
};

/** Reset the fractal view to default kind=Mandelbrot, center=0, zoom=1.5
 *  — matches the FluidPointerLayer reset action. */
const resetView = () => {
    const setJulia = useEngineStore.getState().setJulia;
    if (setJulia) setJulia({ center: { x: 0, y: 0 }, zoom: 1.5 });
};

// ── Seeded default views ────────────────────────────────────────────────
// On first boot (or any time the saved-views array is empty), pre-populate
// with a handful of curated starting points so the View panel isn't a
// blank list. Users can keep them, rename, delete, or overwrite freely.
// These are deliberately minimal (kind / juliaC / center / zoom / iter /
// power) — captureView mirrors the same shape, so manually-added views
// drop into the same array shape.
//
// KIND_MODES indices: 0 = julia, 1 = mandelbrot.
const DEFAULT_VIEWS: Array<{ label: string; state: JuliaViewState }> = [
    { label: 'Mandelbrot · Home',
      state: { kind: 1, juliaC: { x: -0.7, y: 0.27015 }, center: { x: -0.5, y: 0 },     zoom: 1.5,  maxIter: 256, power: 2 } },
    { label: 'Julia · Classic',
      state: { kind: 0, juliaC: { x: -0.7, y: 0.27015 }, center: { x: 0,    y: 0 },     zoom: 1.5,  maxIter: 256, power: 2 } },
    { label: 'Julia · Dendrite',
      state: { kind: 0, juliaC: { x: 0,    y: 1 },       center: { x: 0,    y: 0 },     zoom: 1.5,  maxIter: 256, power: 2 } },
    { label: 'Julia · San Marco',
      state: { kind: 0, juliaC: { x: -0.75, y: 0 },      center: { x: 0,    y: 0 },     zoom: 1.5,  maxIter: 256, power: 2 } },
    { label: 'Mandelbrot · Seahorse Valley',
      state: { kind: 1, juliaC: { x: 0,    y: 0 },       center: { x: -0.75, y: 0.1 },  zoom: 0.15, maxIter: 384, power: 2 } },
];

const seedDefaultViews = (): void => {
    const s = useEngineStore.getState();
    const arr = s.savedViews ?? [];
    if (arr.length > 0) return;  // user has views already; never overwrite
    const seeds: ViewSnapshot[] = DEFAULT_VIEWS.map(({ label, state }) => ({
        id: nanoid(),
        label,
        state,
        createdAt: Date.now(),
    }));
    // Direct write — bypasses captureView() so we don't pollute the
    // user's actual current fractal state with seed values.
    (useEngineStore.setState as any)({ savedViews: seeds });

    // Auto-select the first seed (Mandelbrot · Home) so first-time visitors
    // boot into a curated view rather than the slice's raw param defaults.
    // selectView writes activeViewId AND applies the snap to julia.*.
    // Returning users have arr.length > 0 above and skip this entirely.
    const selectView = (useEngineStore.getState() as { selectView?: (id: string | null) => void }).selectView;
    selectView?.(seeds[0].id);
};

export const installFluidToyViewLibrary = (): void => {
    installStateLibrary<JuliaViewState>({
        // The saved-view library now lives inside the unified "View"
        // panel (along with camera / fractal / iteration controls)
        // rather than its own "Views" tab. The topbar Camera menu's
        // "Open" item jumps to this panel.
        panelId: 'View',
        arrayKey: 'savedViews',
        activeIdKey: 'activeViewId',
        actions: {
            add: 'addView',
            update: 'updateView',
            delete: 'deleteView',
            duplicate: 'duplicateView',
            select: 'selectView',
            reorder: 'reorderViews',
            saveToSlot: 'saveViewToSlot',
            reset: 'resetView',
        },
        defaultLabelPrefix: 'View',
        capture: captureView,
        apply: applyView,
        isModified: isViewModified,
        captureThumbnail: captureCanvasThumbnail,
        onReset: resetView,

        // Slot shortcuts: Ctrl+1..9 save, 1..9 recall. Same key bindings
        // as the legacy @engine/plugins/Camera slot system — that
        // plugin's shortcuts are disabled in main.tsx (hideShortcuts).
        slotShortcuts: { count: 9, category: 'Views' },

        // Topbar menu — Camera icon, right slot. The wrapper auto-adds
        // Open / Reset / Slot 1..9 entries.
        menu: {
            menuId: 'camera',
            slot: 'right',
            order: 29,
            icon: CameraIcon,
            title: 'Camera',
            align: 'end',
            width: 'w-48',
            openItem: { label: 'View panel…', title: 'Open the View panel (camera + saved views)' },
            resetItem: { label: 'Reset View', title: 'Reset to default fractal view' },
            slotLabelPrefix: 'View',
        },
    });

    // Seed defaults AFTER install so the slice exists. Idempotent —
    // only writes when the array is empty.
    seedDefaultViews();
};
