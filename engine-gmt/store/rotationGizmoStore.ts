/**
 * rotationGizmoStore — ephemeral registry of open canvas rotation gizmos.
 *
 * Standalone zustand store on purpose (toastStore pattern): gizmo visibility
 * and puck positions are SESSION UI state — they must never serialize into
 * presets/GMF/scenes, so they don't live in a DDFS feature slice. The overlay
 * (features/rotation_gizmo) renders one gizmo per entry; the Vector3Input
 * header icon toggles entries.
 *
 * Keyed by `${feature}.${paramId}` (the param's store route — 'coreMath.vec3A',
 * 'weave.ws0Vec3B', …), which is also the animation trackId base, so one param
 * can never grow two gizmos.
 */

import { create } from 'zustand';
import type { RotationDescriptor } from '../../engine/rotationDescriptor';

export interface RotationGizmoEntry {
    key: string;
    /** Store slice the param lives on ('coreMath', 'weave', a DDFS feature id). */
    feature: string;
    /** Param/state key inside the slice ('vec3A', 'ws0Vec3B', …). */
    paramId: string;
    label: string;
    rotation: RotationDescriptor;
    /** vec4-held-vec3 & bank writes route through slotWriteValue with this. */
    paramType?: 'vec3';
    /** Puck centre, viewport-local px. */
    pos: { x: number; y: number };
}

interface RotationGizmoStore {
    gizmos: Record<string, RotationGizmoEntry>;
    open: (entry: Omit<RotationGizmoEntry, 'pos'> & { pos?: { x: number; y: number } }) => void;
    close: (key: string) => void;
    toggle: (entry: Omit<RotationGizmoEntry, 'pos'>) => void;
    move: (key: string, pos: { x: number; y: number }) => void;
    closeAll: () => void;
}

/** Stagger fresh spawns so multiple gizmos never stack exactly. */
function spawnPos(existing: number): { x: number; y: number } {
    return { x: 140 + (existing % 4) * 150, y: 150 + ((existing / 4) | 0) * 150 };
}

export const useRotationGizmoStore = create<RotationGizmoStore>((set, get) => ({
    gizmos: {},
    open: (entry) => set((s) => ({
        gizmos: {
            ...s.gizmos,
            [entry.key]: {
                ...entry,
                pos: entry.pos ?? s.gizmos[entry.key]?.pos ?? spawnPos(Object.keys(s.gizmos).length),
            },
        },
    })),
    close: (key) => set((s) => {
        if (!s.gizmos[key]) return s;
        const next = { ...s.gizmos };
        delete next[key];
        return { gizmos: next };
    }),
    toggle: (entry) => {
        if (get().gizmos[entry.key]) get().close(entry.key);
        else get().open(entry);
    },
    move: (key, pos) => set((s) => (
        s.gizmos[key] ? { gizmos: { ...s.gizmos, [key]: { ...s.gizmos[key], pos } } } : s
    )),
    closeAll: () => set({ gizmos: {} }),
}));
