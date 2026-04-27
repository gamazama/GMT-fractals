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

export interface JuliaViewState {
    kind: number;
    juliaC: { x: number; y: number };
    center: { x: number; y: number };
    zoom: number;
    maxIter: number;
    power: number;
}

const captureView = (): JuliaViewState => {
    const julia = (useEngineStore.getState() as any).julia;
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
    const setJulia = (useEngineStore.getState() as any).setJulia;
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
    const setJulia = (useEngineStore.getState() as any).setJulia;
    if (setJulia) setJulia({ center: { x: 0, y: 0 }, zoom: 1.5 });
};

export const installFluidToyViewLibrary = (): void => {
    installStateLibrary<JuliaViewState>({
        panelId: 'Views',
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
            openItem: { label: 'View Manager…', title: 'Open the saved-views library' },
            resetItem: { label: 'Reset View', title: 'Reset to default fractal view' },
            slotLabelPrefix: 'View',
        },
    });
};
