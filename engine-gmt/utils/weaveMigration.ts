/**
 * Legacy weave-system load-time migration (ADR-0089 P4.4/P4.5).
 *
 * Old scenes carry "schedule a second formula across the iteration loop" state
 * in two legacy features: `features.interlace` (2-formula modulo alternation)
 * and — P4.5 — geometry's Hybrid Box INTERLEAVED mode (`hybridComplex`). Both
 * are 2-slot modulo weaves; the weave core is their superset. This module
 * converts that persisted state into weave-native form AT LOAD:
 *
 *   host formula + features.interlace  →  a registered 2-slot native weave
 *   (slot 0 = host, slot 1 = secondary) on a LAYERED modulo schedule (base +
 *   layer 1), with the whole-weave enable gate (`weave.weaveEnabled` — the
 *   legacy `interlaceEnabled` semantics), the host's declared param VALUES on
 *   bank 0 (`weave.ws0*`), the secondary's on bank 1 (`weave.ws1*`), and every
 *   keyframed track / LFO retargeted (`coreMath.<id>` → `weave.ws0<Id>`,
 *   `interlace.*` → the weave keys). `features.interlace` is CLEARED after
 *   migration (owner decision 2: no double-apply; files on disk stay untouched
 *   until re-save — the accepted one-way door).
 *
 * Runs from the app's registered preset migration (app-gmt/migrations.ts →
 * @engine/migrations), which `loadPreset` applies BEFORE any feature setter —
 * so every load path (GMF text, PNG scenes, plain JSON, share URLs, gallery,
 * bundled library scenes) funnels through one hook.
 *
 * NON-migratable scenes (unregistered host/secondary, self-contained or
 * modular host, emit failure) are left UNTOUCHED with a console warning: the
 * scene loads as its base formula — exactly what the retired interlace feature
 * would render post-P4.4 anyway — and keeps its legacy state for forensics.
 *
 * Store-free by design (registry + events only) so the render harness and node
 * test suites can drive it directly.
 *
 * @see docs/adr/0089-weave-core-unification.md (P4.4 update block)
 * @see plans/mb3d/weave-p4-struct-state-design.md §3
 */
import { registry } from '../engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import type { FractalDefinition } from '../types/fractal';
import { emitFusedHybrid } from './mb3d/emitFusedHybrid';
import { buildWeaveScene } from './mb3d/sceneSynth';
import { nativeSlotShell, nativeSlotReject } from '../engine/weave/nativeSlotCatalog';
import { weaveBankKey } from './uniformSlots';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const numOr = (v: any, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Normalize a param value to the plain shape feature state stores (THREE
 *  vectors and {x,y,z} objects both flatten; scalars pass through). */
function plainValue(kind: string | undefined, v: any): any {
    if (kind === 'vec2') return { x: numOr(v?.x, 0), y: numOr(v?.y, 0) };
    if (kind === 'vec3') return { x: numOr(v?.x, 0), y: numOr(v?.y, 0), z: numOr(v?.z, 0) };
    if (kind === 'vec4') return { x: numOr(v?.x, 0), y: numOr(v?.y, 0), z: numOr(v?.z, 0), w: numOr(v?.w, 0) };
    return numOr(v, 0);
}

/**
 * Retarget animation routing strings — a PURE key rename, no keyframe values
 * change. Covers exact matches and the `_x/_y/_z/_w` vec-axis variants
 * (`coreMath.vec2A_x` → `weave.ws0Vec2A_x`). Applied to LFO targets
 * (`preset.animations[].target`) and sequence tracks (record key + `track.id`).
 */
function retargetTracks(preset: any, renames: Map<string, string>): void {
    const retarget = (t: string): string => {
        const hit = renames.get(t);
        if (hit) return hit;
        const us = t.lastIndexOf('_');
        if (us > 0) {
            const base = renames.get(t.slice(0, us));
            if (base) return base + t.slice(us);
        }
        return t;
    };
    if (Array.isArray(preset.animations)) {
        for (const a of preset.animations) {
            if (a && typeof a.target === 'string') a.target = retarget(a.target);
        }
    }
    const tracks = preset.sequence?.tracks;
    if (tracks && typeof tracks === 'object') {
        for (const key of Object.keys(tracks)) {
            const next = retarget(key);
            const tr = tracks[key];
            if (tr && typeof tr === 'object' && typeof tr.id === 'string') tr.id = retarget(tr.id);
            if (next !== key) {
                tracks[next] = tracks[key];
                delete tracks[key];
            }
        }
    }
}

/**
 * Migrate a legacy interlace scene onto the weave core. Mutates `preset`
 * (formula, features.weave, animations/sequence) and registers the fused def.
 * No-op when there is no interlace state; leaves the preset untouched (with a
 * warning) when the scene can't be represented.
 */
function migrateInterlace(preset: any): void {
    const il = preset.features.interlace;
    if (!il || typeof il !== 'object') return;

    // Configured-but-never-compiled: the interlace never reached the shader, so
    // the scene renders identically without it — drop the dead state.
    if (!il.interlaceCompiled) {
        delete preset.features.interlace;
        return;
    }

    const bail = (why: string) =>
        console.warn(`[weaveMigration] legacy interlace scene NOT migrated — ${why}. Loading the base formula; legacy state kept.`);

    const hostId = preset.formula as string;
    const hostDef = registry.get(hostId as any) as FractalDefinition | undefined;
    if (!hostDef) return bail(`host formula "${hostId}" is not registered`);
    const secId = typeof il.interlaceFormula === 'string' && il.interlaceFormula ? il.interlaceFormula : 'Mandelbulb';
    const secDef = registry.get(secId as any) as FractalDefinition | undefined;
    if (!secDef) return bail(`secondary formula "${secId}" is not registered`);
    const hostReject = nativeSlotReject(hostDef);
    if (hostReject) return bail(`host: ${hostReject}`);
    const secReject = nativeSlotReject(secDef);
    if (secReject) return bail(`secondary: ${secReject}`);

    // ── Build + register the 2-slot native weave def (layered modulo schedule;
    // legacy phase semantics are byte-equal: every `interval` iterations from
    // `startIter`, secondary wins, base otherwise; gate = base only).
    const interval = Math.max(1, Math.round(numOr(il.interlaceInterval, 2)));
    const startIter = Math.max(0, Math.round(numOr(il.interlaceStartIter, 0)));
    const title = `${hostDef.name ?? hostId} ⧉ ${secDef.name ?? secId}`;
    const slots = [nativeSlotShell(hostId, 1), nativeSlotShell(secId, 1)];
    const { def, ledger } = emitFusedHybrid(
        buildWeaveScene(slots, title, numOr(preset.features.coreMath?.iterations, 0) || undefined),
        { schedule: { kind: 'modulo' }, enableGate: true },
    );
    if (!def) return bail(`weave emit failed: ${ledger.reasons.join('; ')}`);

    def.weaveSource = {
        version: 1,
        title,
        slots: slots.map((slot, i) => ({
            label: (i === 0 ? hostDef.name ?? hostId : secDef.name ?? secId) as string,
            kind: 'native' as const,
            ref: i === 0 ? hostId : secId,
            slot: { ...slot, optionTypes: [...slot.optionTypes], optionValues: [...slot.optionValues] },
        })),
        schedule: { kind: 'modulo', layers: [{ interval, startIter }] },
    };
    registry.register(def);
    FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });

    // ── State remap onto banks + rhythm layer 1 + the master gate.
    const cm = preset.features.coreMath ?? {};
    const weave: Record<string, any> = { ...(preset.features.weave ?? {}) };
    const renames = new Map<string, string>();

    // Host declared params: scene coreMath VALUES → bank 0. The coreMath copies
    // stay (unread by the fused def; still correct if the user re-picks the
    // standalone formula).
    for (const p of hostDef.parameters as any[]) {
        if (!p?.id) continue;
        weave[weaveBankKey(0, p.id)] = plainValue(p.type, cm[p.id] ?? p.default);
        renames.set(`coreMath.${p.id}`, `weave.${weaveBankKey(0, p.id)}`);
    }
    // Secondary declared params: interlace<Slot> VALUES → bank 1.
    for (const p of secDef.parameters as any[]) {
        if (!p?.id) continue;
        const legacyKey = `interlace${cap(p.id)}`;
        weave[weaveBankKey(1, p.id)] = plainValue(p.type, il[legacyKey] ?? p.default);
        renames.set(`interlace.${legacyKey}`, `weave.${weaveBankKey(1, p.id)}`);
    }
    weave.weaveInterval1 = interval;
    weave.weaveStartIter1 = startIter;
    weave.weaveBeats1 = 0;
    // Legacy default was OFF (interlaceEnabled backfilled false), so absent = off.
    weave.weaveEnabled = !!il.interlaceEnabled;
    renames.set('interlace.interlaceInterval', 'weave.weaveInterval1');
    renames.set('interlace.interlaceStartIter', 'weave.weaveStartIter1');
    renames.set('interlace.interlaceEnabled', 'weave.weaveEnabled');

    preset.formula = def.id;
    preset.features.weave = weave;
    delete preset.features.interlace; // owner decision 2: cleared, no double-apply
    retargetTracks(preset, renames);
    console.info(`[weaveMigration] legacy interlace scene → 2-slot weave "${title}" (${def.id})`);
}

/**
 * The load-time entry: convert legacy interlace (P4.4) — and, with P4.5,
 * Hybrid Box interleaved — state into weave-native form. Mutates and returns
 * the preset. Cheap no-op for scenes without legacy state.
 */
export function migrateLegacyWeavePreset(preset: any): any {
    if (!preset?.features) return preset;
    try {
        migrateInterlace(preset);
    } catch (err) {
        console.error('[weaveMigration] migration threw — scene loads unmigrated:', err);
    }
    return preset;
}
