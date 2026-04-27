/**
 * createStateLibrarySlice — generic factory for "saved snapshots" state
 * libraries (cameras, views, color palettes, brush presets, …).
 *
 * The library doesn't care what state shape `T` is. The app provides
 * capture/apply callbacks that read its current state and push it back;
 * the library handles the bookkeeping (array, active id, drag-reorder,
 * slot shortcuts, modified marker).
 *
 * Typical install pattern (mirrors GMT's existing installGmtCameraSlice):
 *
 *   installStateLibrarySlice<CameraState>({
 *       arrayKey: 'savedCameras',
 *       activeIdKey: 'activeCameraId',
 *       actions: { add: 'addCamera', delete: 'deleteCamera', ... },
 *       capture: () => readCameraStateFromEngine(),
 *       apply:   (s) => emitTeleport(s),
 *       isModified: (snap) => diffCurrentVsSnapshot(snap),
 *       captureThumbnail: () => engine.captureSnapshot().then(toJpeg),
 *   });
 *
 * Multiple libraries per app are supported — instantiate once per
 * concept (cameras, views, palettes) with different keys + actions.
 *
 * Persistence and undo are deliberately app-side. The library does
 * not read/write localStorage, GMF, or the engine-core history slice;
 * apps wrap the actions if they need that behavior.
 */

import { useEngineStore } from '../../store/engineStore';
import { nanoid } from 'nanoid';

/** Suffix appended to the library's `arrayKey` to form the transient
 *  saved-toast field on the engine store. Exported so consumers
 *  (StateLibraryToast, dynamic menu labels) read the same field name
 *  the slice writes. */
export const TOAST_FIELD_SUFFIX = '_savedToast';

/** Suffix for the notify-dot field. Lit on each successful slot save. */
export const DOT_FIELD_SUFFIX = '_notifyDot';

export const toastFieldKey = (arrayKey: string): string => `${arrayKey}${TOAST_FIELD_SUFFIX}`;
export const dotFieldKey = (arrayKey: string): string => `${arrayKey}${DOT_FIELD_SUFFIX}`;

/** Transient toast payload written to `toastFieldKey(arrayKey)` when a
 *  slot save fires. The bundled <StateLibraryToast/> component renders
 *  this with success / warning styling. Cleared 2s after creation. */
export interface StateLibrarySavedToast {
    /** 1-indexed user-facing slot number (matches the keyboard hint). */
    slot: number;
    /** User-facing label of the snapshot the toast describes. */
    label: string;
    /** Visual tone — `success` for an actual save, `warning` for a
     *  rejected save (e.g. user pressed Mod+5 with only 2 slots). */
    tone: 'success' | 'warning';
    /** Free-form message rendered in the pill. */
    message: string;
}

/** A single saved snapshot. The state payload `T` is opaque to the
 *  library — apps decide what to capture. */
export interface StateSnapshot<T> {
    id: string;
    label: string;
    /** Optional data-URL thumbnail. Apps capture this however they
     *  like (worker snapshot, canvas.toDataURL, etc.). */
    thumbnail?: string;
    /** App-defined state payload. */
    state: T;
    /** Wall-clock ms when the snapshot was first added. */
    createdAt: number;
}

/** Action-name overrides. Each maps the library's internal action name
 *  to the field name patched onto the store. */
export interface StateLibraryActionNames {
    add: string;
    update: string;
    delete: string;
    duplicate: string;
    select: string;
    reorder: string;
    saveToSlot: string;
    reset: string;
}

export interface StateLibraryOptions<T> {
    /** Field name on the store that holds the snapshot array, e.g.
     *  `'savedCameras'`. */
    arrayKey: string;
    /** Field name on the store that holds the active id, e.g.
     *  `'activeCameraId'`. */
    activeIdKey: string;
    /** Maps library action names to store fields. Lets GMT keep its
     *  existing `addCamera` / `selectCamera` names while a 2nd app uses
     *  `addView` / `selectView`. */
    actions: StateLibraryActionNames;

    /** Default name used when `add()` is called without a label. The
     *  factory appends ` ${n+1}` so labels stay unique. */
    defaultLabelPrefix?: string;

    /** Read the app's current state. Called by add/update/saveToSlot. */
    capture: () => T;
    /** Push a snapshot's state back into the app. Called by
     *  select/duplicate. The previous state is provided when known so
     *  apps can diff for animation/undo. */
    apply: (state: T, prev?: T) => void;

    /** Optional dirty-check: returns true when the live app state
     *  differs from the saved snapshot. Drives the modified marker
     *  (`*Camera 1`). */
    isModified?: (snapshot: T) => boolean;
    /** Optional thumbnail capture — returns a data URL or undefined.
     *  Called after add/update so the snapshot can be patched with the
     *  thumbnail once it's ready. */
    captureThumbnail?: () => Promise<string | undefined>;
    /** Optional label suggester — used by `add()` when no label is
     *  passed. GMT uses this to recognize cardinal-axis views and
     *  name them "Front View" etc. Falls back to defaultLabelPrefix
     *  when this returns undefined. */
    suggestLabel?: () => string | undefined;
    /** Optional reset hook — called by reset() in addition to clearing
     *  the active id. GMT uses this to fall back to the formula's
     *  default preset. */
    onReset?: () => void;
    /** Optional hook that fires after every apply() — lets apps tie
     *  into animation/undo without subclassing. */
    onApplied?: (state: T, prev: T | undefined, snapshot: StateSnapshot<T>) => void;
    /** Optional hook that fires after `saveToSlot` writes to the store.
     *  `slotIndex` is 0-indexed; `label` is the snapshot's label. Used
     *  by apps that want to show a "saved!" toast or notification dot. */
    onSavedToSlot?: (slotIndex: number, label: string) => void;
    /** ms the saved-toast pill stays visible. Default 2000. */
    toastDurationMs?: number;
    /** ms the notify dot on the open-library menu item stays lit.
     *  Default 5000. */
    dotDurationMs?: number;
}

/** Patches a state-library slice onto the engineStore. Idempotent —
 *  calling twice is a no-op (warns in dev). */
export function installStateLibrarySlice<T>(opts: StateLibraryOptions<T>): void {
    const set = useEngineStore.setState as (partial: any) => void;
    const get = useEngineStore.getState as () => any;

    const { arrayKey, activeIdKey, actions, defaultLabelPrefix = 'Snapshot' } = opts;

    // Avoid clobbering an existing install.
    const existing = get();
    if (Array.isArray(existing[arrayKey]) && typeof existing[actions.add] === 'function') {
        console.warn(`[StateLibrary] "${arrayKey}" already installed — ignoring duplicate install`);
        return;
    }

    const readArray = (): StateSnapshot<T>[] => (get()[arrayKey] as StateSnapshot<T>[]) ?? [];
    const findSnap = (id: string) => readArray().find((s) => s.id === id);

    const writeArray = (next: StateSnapshot<T>[]) =>
        set({ [arrayKey]: next });
    const writeActive = (id: string | null) =>
        set({ [activeIdKey]: id });

    // Two transient store fields keyed off the array name so multiple
    // libraries (cameras, views, palettes …) don't collide. Warning
    // toasts skip the dot — nothing was saved to call attention to.
    const toastKey = toastFieldKey(arrayKey);
    const dotKey = dotFieldKey(arrayKey);
    const toastDuration = opts.toastDurationMs ?? 2000;
    const dotDuration = opts.dotDurationMs ?? 5000;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    let dotTimer: ReturnType<typeof setTimeout> | null = null;

    const fireToast = (toast: StateLibrarySavedToast) => {
        set({ [toastKey]: toast });
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => set({ [toastKey]: null }), toastDuration);
        if (toast.tone === 'success') {
            set({ [dotKey]: true });
            if (dotTimer) clearTimeout(dotTimer);
            dotTimer = setTimeout(() => set({ [dotKey]: false }), dotDuration);
        }
    };

    /** Internal: capture current state into a fresh snapshot. */
    const captureSnap = (label: string): StateSnapshot<T> => ({
        id: nanoid(),
        label,
        state: opts.capture(),
        createdAt: Date.now(),
    });

    /** Internal: apply a snapshot, threading prev state for `onApplied`. */
    const applySnap = (snap: StateSnapshot<T>) => {
        const prev = opts.capture();
        opts.apply(snap.state, prev);
        opts.onApplied?.(snap.state, prev, snap);
    };

    set({
        [arrayKey]: [] as StateSnapshot<T>[],
        [activeIdKey]: null as string | null,
        [toastKey]: null as StateLibrarySavedToast | null,
        [dotKey]: false,

        [actions.add]: async (labelOverride?: string) => {
            const arr = readArray();
            const suggested = opts.suggestLabel?.();
            const label = labelOverride ?? suggested ?? `${defaultLabelPrefix} ${arr.length + 1}`;
            const snap = captureSnap(label);
            writeArray([...arr, snap]);
            writeActive(snap.id);

            // Patch in thumbnail asynchronously if the app provides one.
            if (opts.captureThumbnail) {
                const thumb = await opts.captureThumbnail();
                if (thumb) {
                    const cur = readArray();
                    const idx = cur.findIndex((s) => s.id === snap.id);
                    if (idx >= 0) {
                        const next = [...cur];
                        next[idx] = { ...next[idx], thumbnail: thumb };
                        writeArray(next);
                    }
                }
            }
            return snap.id;
        },

        [actions.update]: async (id: string, patch?: Partial<StateSnapshot<T>>) => {
            const arr = readArray();
            const idx = arr.findIndex((s) => s.id === id);
            if (idx < 0) return;

            // No patch = "overwrite snapshot's state with current live state"
            // (the Save / floppy-disk button on the panel).
            let next: StateSnapshot<T>;
            if (patch) {
                next = { ...arr[idx], ...patch };
            } else {
                next = { ...arr[idx], state: opts.capture() };
                if (opts.captureThumbnail) {
                    const thumb = await opts.captureThumbnail();
                    if (thumb) next = { ...next, thumbnail: thumb };
                }
            }
            const arr2 = [...arr];
            arr2[idx] = next;
            writeArray(arr2);
        },

        [actions.delete]: (id: string) => {
            const arr = readArray();
            writeArray(arr.filter((s) => s.id !== id));
            if (get()[activeIdKey] === id) writeActive(null);
        },

        [actions.duplicate]: (id: string) => {
            const arr = readArray();
            const idx = arr.findIndex((s) => s.id === id);
            if (idx < 0) return;
            const src = arr[idx];
            const dup: StateSnapshot<T> = {
                ...JSON.parse(JSON.stringify(src)),
                id: nanoid(),
                label: `${src.label} (copy)`,
                createdAt: Date.now(),
            };
            const next = [...arr];
            next.splice(idx + 1, 0, dup);
            writeArray(next);
            writeActive(dup.id);
            applySnap(dup);
        },

        [actions.select]: (id: string | null) => {
            if (id === null) {
                writeActive(null);
                return;
            }
            const snap = findSnap(id);
            if (!snap) return;
            writeActive(id);
            applySnap(snap);
        },

        [actions.reorder]: (fromIndex: number, toIndex: number) => {
            const arr = readArray();
            if (fromIndex < 0 || fromIndex >= arr.length) return;
            if (toIndex < 0 || toIndex >= arr.length) return;
            const next = [...arr];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            writeArray(next);
        },

        [actions.saveToSlot]: async (slotIndex: number) => {
            const arr = readArray();
            // Slots fill sequentially. Pressing Mod+5 with only 2 saved
            // entries would previously have appended as the 3rd entry
            // and labelled it "Camera 5" — a silent lie that also breaks
            // recall (key '5' would not bring it back). Reject the save
            // with a warning toast so the user notices, instead of doing
            // something surprising.
            if (slotIndex > arr.length) {
                fireToast({
                    slot: slotIndex + 1,
                    label: `${defaultLabelPrefix} ${slotIndex + 1}`,
                    tone: 'warning',
                    message: `Slot ${slotIndex + 1} unavailable — only ${arr.length} ${arr.length === 1 ? 'slot is' : 'slots are'} filled`,
                });
                return;
            }

            let savedLabel: string;
            if (slotIndex < arr.length) {
                // Overwrite existing slot with current state.
                const target = arr[slotIndex];
                const next = [...arr];
                let updated: StateSnapshot<T> = { ...target, state: opts.capture() };
                if (opts.captureThumbnail) {
                    const thumb = await opts.captureThumbnail();
                    if (thumb) updated = { ...updated, thumbnail: thumb };
                }
                next[slotIndex] = updated;
                writeArray(next);
                writeActive(updated.id);
                savedLabel = updated.label;
            } else {
                // Append next sequential slot (slotIndex === arr.length).
                const label = opts.suggestLabel?.() ?? `${defaultLabelPrefix} ${slotIndex + 1}`;
                const snap = captureSnap(label);
                writeArray([...arr, snap]);
                writeActive(snap.id);
                if (opts.captureThumbnail) {
                    const thumb = await opts.captureThumbnail();
                    if (thumb) {
                        const cur = readArray();
                        const idx = cur.findIndex((s) => s.id === snap.id);
                        if (idx >= 0) {
                            const next = [...cur];
                            next[idx] = { ...next[idx], thumbnail: thumb };
                            writeArray(next);
                        }
                    }
                }
                savedLabel = label;
            }
            fireToast({
                slot: slotIndex + 1,
                label: savedLabel,
                tone: 'success',
                message: `${savedLabel} saved`,
            });
            opts.onSavedToSlot?.(slotIndex, savedLabel);
        },

        [actions.reset]: () => {
            writeActive(null);
            opts.onReset?.();
        },
    });
}
