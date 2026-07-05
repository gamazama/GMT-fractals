/**
 * Legacy weave-system load-time migration (ADR-0089 P4.4/P4.5).
 *
 * Old scenes carry "schedule a second formula across the iteration loop" state
 * in two legacy features: `features.interlace` (2-formula modulo alternation —
 * feature retired in P4.4) and geometry's Hybrid Box — BOTH its INTERLEAVED
 * mode (`hybridComplex` — emission retired in P4.5) AND its pre-loop FAST path
 * (retired in P4.7). All are modulo weaves; the weave core is their superset.
 * The fast path maps to a DENSE intro layer (interval 1 from iteration 0), so
 * the fold runs on the first hybridIter iterations exactly as the pre-loop did
 * — z-identical, with an accepted colour/bailout shift (those iterations now
 * count). This module converts that persisted state AT LOAD:
 *
 *   host formula [+ Hybrid Box interleave] [+ interlace secondary]
 *     →  a registered native weave on a LAYERED modulo schedule:
 *        slot 0 = host (base) · layer 1 = the BoxFold formula matching
 *        `hybridFoldType` (geometry injected BEFORE interlace, so the fold
 *        keeps legacy precedence) · next layer = the interlace secondary.
 *        `hybridSkip → interval`, `hybridSwap → startIter (0/1)`,
 *        `hybridIter → beats` (the invocation cap), fold params → the fold
 *        slot's bank; `interlaceInterval/StartIter → interval/startIter`,
 *        secondary params → its bank; host param VALUES → bank 0;
 *        `interlaceEnabled`/`hybridMode` → the whole-weave `weaveEnabled`
 *        gate. Keyframed tracks/LFOs retarget (pure id renames, vec-axis
 *        variants included). Legacy state is CLEARED post-migration (owner
 *        decision 2: no double-apply; files on disk stay untouched until
 *        re-save — the accepted one-way door).
 *
 * COMBINED scenes with DISAGREEING enables (one system on, the other off):
 * the weave has ONE master gate (per-slot mute is backlog), so only the
 * ENABLED system migrates; the disabled one's config is dropped (it rendered
 * inert). Agreeing enables migrate both onto one weave.
 *
 * Runs from the app's registered preset migration (app-gmt/migrations.ts →
 * @engine/migrations), which `loadPreset` applies BEFORE any feature setter —
 * so every load path (GMF text, PNG scenes, plain JSON, share URLs, gallery,
 * bundled library scenes) funnels through one hook.
 *
 * NON-migratable scenes (unregistered defs, self-contained or modular host,
 * emit failure) are left UNTOUCHED with a console warning: the scene loads as
 * its base formula — exactly what the retired legacy paths would render — and
 * keeps its legacy state for forensics.
 *
 * KNOWN LIMIT: the legacy `hybridPermute` c-swizzle (compile-time) is not
 * carried onto the BoxFold slot; scenes using a non-default permute migrate
 * with the default c mapping (warned).
 *
 * Store-free by design (registry + events only) so the render harness and node
 * test suites can drive it directly.
 *
 * @see docs/adr/0089-weave-core-unification.md (P4.4/P4.5 update blocks)
 * @see plans/mb3d/weave-p4-struct-state-design.md §3
 */
import { registry } from '../engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import type { FractalDefinition } from '../types/fractal';
import { emitFusedHybrid } from './mb3d/emitFusedHybrid';
import { buildWeaveScene } from './mb3d/sceneSynth';
import { nativeSlotShell, nativeSlotReject } from '../engine/weave/nativeSlotCatalog';
import { weaveBankKey } from './uniformSlots';
import { boxFoldFormulaId, BOXFOLD_LEGACY_KEYS } from '../formulas/boxFolds';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const numOr = (v: any, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Normalize a param value to the plain shape feature state stores (THREE
 *  vectors and {x,y,z} objects both flatten; scalars pass through; booleans
 *  become 0/1 — bank params are numeric). */
function plainValue(kind: string | undefined, v: any): any {
    if (kind === 'vec2') return { x: numOr(v?.x, 0), y: numOr(v?.y, 0) };
    if (kind === 'vec3') return { x: numOr(v?.x, 0), y: numOr(v?.y, 0), z: numOr(v?.z, 0) };
    if (kind === 'vec4') return { x: numOr(v?.x, 0), y: numOr(v?.y, 0), z: numOr(v?.z, 0), w: numOr(v?.w, 0) };
    if (typeof v === 'boolean') return v ? 1 : 0;
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

/** Switch the legacy Hybrid Box OFF on the geometry slice — the fold now lives
 *  on the weave (whether interleave or the retired fast path), or it never
 *  fired. Idempotent: hybridCompiled → false makes re-migration a no-op. */
function clearInterleaveState(g: any): void {
    delete g.hybridComplex;
    delete g.hybridSkip;
    delete g.hybridSwap;
    g.hybridCompiled = false;
    g.hybridMode = false;
}

function migrateLegacyWeaves(preset: any): void {
    const feats = preset.features;

    // Configured-but-never-compiled interlace: never reached the shader — drop.
    if (feats.interlace && typeof feats.interlace === 'object' && !feats.interlace.interlaceCompiled) {
        delete feats.interlace;
    }
    const il = feats.interlace;
    const g = feats.geometry ?? {};
    // Hybrid Box fold — present whenever compiled, in EITHER legacy mode:
    //   INTERLEAVED (hybridComplex; emission retired P4.5) → its own modulo
    //     schedule (hybridSkip / hybridSwap).
    //   pre-loop FAST path (!hybridComplex; retired P4.7) → a DENSE intro:
    //     interval 1 from iteration 0, so the fold runs on the first hybridIter
    //     iterations exactly as the pre-loop did.
    // Both migrate to the matching BoxFold FORMULA on a modulo layer.
    const foldCompiled = !!g.hybridCompiled;
    const isInterleave = !!g.hybridComplex;
    const foldBeats = Math.max(0, Math.round(numOr(g.hybridIter, 2)));
    // hybridIter < 1 ⇒ the fold NEVER ran (fast path: the pre-loop cap hLim=0;
    // interleave: the layered `beats: 0` would mean ENDLESS — the opposite).
    // Treat as inactive.
    const hasFold = foldCompiled && foldBeats >= 1;
    if (foldCompiled && !hasFold) clearInterleaveState(g);
    if (!il && !hasFold) return;

    const bail = (why: string) =>
        console.warn(`[weaveMigration] legacy scene NOT migrated — ${why}. Loading the base formula; legacy state kept.`);

    // ── Enable agree-policy (combined scenes; owner call 2026-07-04).
    const ilEnabled = il ? !!il.interlaceEnabled : undefined;
    const foldEnabled = hasFold ? !!g.hybridMode : undefined;
    let useIl = !!il;
    let useFold = hasFold;
    if (il && hasFold && ilEnabled !== foldEnabled) {
        console.warn('[weaveMigration] combined interlace + Hybrid Box scene with disagreeing enables — migrating only the ENABLED system (one whole-weave gate; per-slot mute is backlog).');
        useIl = !!ilEnabled;
        useFold = !!foldEnabled;
    }
    const enabled = useIl ? !!ilEnabled : useFold ? !!foldEnabled : false;

    // ── Resolve the slot formulas.
    const hostId = preset.formula as string;
    const hostDef = registry.get(hostId as any) as FractalDefinition | undefined;
    if (!hostDef) return bail(`host formula "${hostId}" is not registered`);
    const hostReject = nativeSlotReject(hostDef);
    if (hostReject) return bail(`host: ${hostReject}`);

    let secDef: FractalDefinition | undefined;
    if (useIl) {
        const secId = typeof il.interlaceFormula === 'string' && il.interlaceFormula ? il.interlaceFormula : 'Mandelbulb';
        secDef = registry.get(secId as any) as FractalDefinition | undefined;
        if (!secDef) return bail(`secondary formula "${secId}" is not registered`);
        const secReject = nativeSlotReject(secDef);
        if (secReject) return bail(`secondary: ${secReject}`);
    }
    let foldDef: FractalDefinition | undefined;
    if (useFold) {
        const foldId = boxFoldFormulaId(Math.round(numOr(g.hybridFoldType, 0)));
        foldDef = registry.get(foldId as any) as FractalDefinition | undefined;
        if (!foldDef) return bail(`fold formula "${foldId}" is not registered`);
        if (Math.round(numOr(g.hybridPermute, 0)) !== 0) {
            console.warn('[weaveMigration] legacy hybridPermute is not carried onto the BoxFold slot — migrating with the default c mapping.');
        }
    }
    if (!useIl && !useFold) {
        // Combined scene where the enabled side failed above never reaches here;
        // both-disabled single systems migrate with the gate off instead.
        return;
    }

    // ── Slot order: host, then the fold (geometry injected BEFORE interlace —
    // legacy skipMainFormula precedence), then the interlace secondary.
    type SlotPlan = {
        def: FractalDefinition;
        layer?: { interval: number; startIter: number; beats?: number };
        /** bank-value source: slot param id → legacy value */
        values: (p: any) => any;
        trackPrefix?: (p: any) => string | undefined;
    };
    const cm = feats.coreMath ?? {};
    const plans: SlotPlan[] = [{
        def: hostDef,
        values: (p) => cm[p.id] ?? p.default,
        trackPrefix: (p) => `coreMath.${p.id}`,
    }];
    if (useFold && foldDef) {
        plans.push({
            def: foldDef,
            // Interleave keeps its own modulo schedule; the FAST path becomes a
            // dense intro (interval 1 from iter 0), so the fold runs on the first
            // hybridIter iterations — z-identical to the pre-loop fold. (The only
            // change: those iterations now COUNT, so iteration-based colour +
            // bailout shift by hybridIter — the P4.7 accepted look change.)
            layer: isInterleave
                ? {
                    interval: Math.max(1, Math.round(numOr(g.hybridSkip, 1))),
                    startIter: g.hybridSwap ? 1 : 0,
                    beats: foldBeats,
                  }
                : { interval: 1, startIter: 0, beats: foldBeats },
            values: (p) => (BOXFOLD_LEGACY_KEYS[p.id] !== undefined ? g[BOXFOLD_LEGACY_KEYS[p.id]] : undefined) ?? p.default,
            trackPrefix: (p) => BOXFOLD_LEGACY_KEYS[p.id] ? `geometry.${BOXFOLD_LEGACY_KEYS[p.id]}` : undefined,
        });
    }
    if (useIl && secDef) {
        plans.push({
            def: secDef,
            layer: {
                interval: Math.max(1, Math.round(numOr(il.interlaceInterval, 2))),
                startIter: Math.max(0, Math.round(numOr(il.interlaceStartIter, 0))),
            },
            values: (p) => il[`interlace${cap(p.id)}`] ?? p.default,
            trackPrefix: (p) => `interlace.interlace${cap(p.id)}`,
        });
    }

    // ── Build + register the fused weave def (layered modulo; legacy phase
    // semantics are byte-equal — first beat wins, geometry layer first).
    const title = plans.map((pl) => pl.def.name ?? pl.def.id).join(' ⧉ ');
    const slots = plans.map((pl) => nativeSlotShell(pl.def.id as string, 1));
    const { def, ledger } = emitFusedHybrid(
        buildWeaveScene(slots, title, numOr(cm.iterations, 0) || undefined),
        { schedule: { kind: 'modulo' }, enableGate: true },
    );
    if (!def) return bail(`weave emit failed: ${ledger.reasons.join('; ')}`);

    def.weaveSource = {
        version: 1,
        title,
        slots: plans.map((pl, i) => ({
            label: (pl.def.name ?? pl.def.id) as string,
            kind: 'native' as const,
            ref: pl.def.id as string,
            slot: { ...slots[i], optionTypes: [...slots[i].optionTypes], optionValues: [...slots[i].optionValues] },
        })),
        schedule: {
            kind: 'modulo',
            layers: plans.slice(1).map((pl) => ({
                interval: pl.layer!.interval,
                startIter: pl.layer!.startIter,
                ...(pl.layer!.beats ? { beats: pl.layer!.beats } : {}),
            })),
        },
    };
    registry.register(def);
    FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });

    // ── State remap onto banks + rhythm layers + the master gate.
    const weave: Record<string, any> = { ...(feats.weave ?? {}) };
    const renames = new Map<string, string>();
    plans.forEach((pl, k) => {
        for (const p of pl.def.parameters as any[]) {
            if (!p?.id) continue;
            weave[weaveBankKey(k, p.id)] = plainValue(p.type, pl.values(p));
            const from = pl.trackPrefix?.(p);
            if (from) renames.set(from, `weave.${weaveBankKey(k, p.id)}`);
        }
        if (k > 0 && pl.layer) {
            weave[`weaveInterval${k}`] = pl.layer.interval;
            weave[`weaveStartIter${k}`] = pl.layer.startIter;
            weave[`weaveBeats${k}`] = pl.layer.beats ?? 0;
        }
    });
    weave.weaveEnabled = enabled;

    // Schedule + enable track retargets (per system, at its layer index).
    plans.forEach((pl, k) => {
        if (pl.def === secDef) {
            renames.set('interlace.interlaceInterval', `weave.weaveInterval${k}`);
            renames.set('interlace.interlaceStartIter', `weave.weaveStartIter${k}`);
            renames.set('interlace.interlaceEnabled', 'weave.weaveEnabled');
        } else if (pl.def === foldDef) {
            // Fast path pins interval=1/start=0, so only hybridIter (→ beats) and
            // the enable retarget; interleave also maps its skip → interval.
            if (isInterleave) renames.set('geometry.hybridSkip', `weave.weaveInterval${k}`);
            renames.set('geometry.hybridIter', `weave.weaveBeats${k}`);
            renames.set('geometry.hybridMode', 'weave.weaveEnabled');
        }
    });

    preset.formula = def.id;
    feats.weave = weave;
    if (il) delete feats.interlace;                 // owner decision 2: cleared, no double-apply
    if (foldCompiled) clearInterleaveState(g);      // fold (interleave or fast path) now lives on the weave
    retargetTracks(preset, renames);
    console.info(`[weaveMigration] legacy scene → ${plans.length}-slot weave "${title}" (${def.id})`);
}

/**
 * The load-time entry: convert legacy interlace (P4.4) + Hybrid Box
 * interleaved (P4.5) state into weave-native form. Mutates and returns the
 * preset. Cheap no-op for scenes without legacy state.
 */
export function migrateLegacyWeavePreset(preset: any): any {
    if (!preset?.features) return preset;
    try {
        migrateLegacyWeaves(preset);
    } catch (err) {
        console.error('[weaveMigration] migration threw — scene loads unmigrated:', err);
    }
    return preset;
}
