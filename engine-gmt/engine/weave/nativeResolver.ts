/**
 * Native-slot RESOLVER — turns a REGISTERED native GMT formula into a dispatcher-
 * hosted weave slot (ADR-0089 P4.1; design: plans/mb3d/weave-p4-struct-state-design.md §2.1).
 *
 * The state channel is NAMESPACE-PREFIXED GLOBALS (option (e) of the design doc):
 * a per-slot binding of {@link createNativeSlotRewriter} prefixes the formula's
 * function, preamble globals and helpers with `ws<N>_`, so identity-pair weaving
 * (formula A in two slots) never redeclares symbols, and per-slot state crosses
 * the dispatcher function boundary with no `inout` threading. Concretely:
 *
 *  - PARAMS → allocated coreMath lanes. Each declared parameter is bound through
 *    the shared {@link ScalarParamPacker}/LaneAllocator (the MB3D multi-slot
 *    packing path) and the formula's uniform references are remapped to the lane
 *    accessors via the rewriter's `uniformMap` (single-pass). Undeclared primary
 *    uniforms are baked to the formula's preset defaults so a slot can never read
 *    another slot's lane by accident. No allocator (bake mode) ⇒ ALL literals.
 *  - LOOPINIT state → globals. A `preambleVars` entry declared in loopInit
 *    (Phoenix `z_prev`, Bristorbrot `rotX`) is hoisted: global declaration in the
 *    slot GLSL + plain assignment in the hoisted loopInit. Preamble-declared state
 *    (Julia3D `kk_minSurf`) already lands as a prefixed global via rewritePreamble.
 *  - SHARED ROTATION (`usesSharedRotation` / `iter:shared-rotation`): the slot's
 *    loopInit runs inside a save→capture→restore bracket (its `gmt_precalcRodrigues`
 *    result is captured into `ws<N>_rot*` globals); the dispatcher branch swaps the
 *    captured state into the fixed `gmt_rot*` globals around the call
 *    (preCall/postCall — interlace's proven snapshot pattern, dispatcher-hosted).
 *  - c.w ISOLATION: the branch builds `vec4 ws<N>_c = vec4(c.xyz, <paramA expr>)`
 *    so 4D formulas read their own Julia/slice scalar, never the weave's uParamA;
 *    `rewriteLoopBody` swaps the call's 4th arg to it. z.w flows with the shared
 *    orbit (same semantics as interlace).
 *
 * MB3D slots keep their shared `inout float` scratch — two state channels by
 * design (a shared fused orbit vs independent per-slot formulas), one dispatcher.
 *
 * @see docs/adr/0089-weave-core-unification.md
 */
import type { FractalDefinition } from '../../types/fractal';
import { createNativeSlotRewriter, extractPreambleFunctions } from './nativeSlot';
import {
    LaneAllocator, ScalarParamPacker, slotToUniform, vecKindOf,
    CORE_SLOTS, weaveBankKey, weaveBankUniform,
} from '../../utils/uniformSlots';
import type { PackedParam } from '../../utils/uniformSlots';

/** Sentinel `formulaIndex` marking a weave addon slot as a NATIVE formula
 *  reference (`slot.name` = the registered formula id). MB3D parsing never
 *  produces a negative index, so MB3D scene imports are structurally unaffected. */
export const NATIVE_FORMULA_INDEX = -1;

export interface NativeSlotResolution {
    ok: true;
    /** Prefixed globals + rewritten preamble + rewritten formula fn(s) — emitted
     *  verbatim above the dispatcher (ResolvedWeaveSlot.glsl). */
    glsl: string;
    /** Rewritten loopBody — the dispatcher branch's call statement. */
    call: string;
    /** Slot-local c (+ rotation swap-in) — emitted before the call. */
    preCall: string;
    /** Rotation swap-out — emitted after the call (rotation slots only). */
    postCall?: string;
    /** Hoisted per-slot loopInit (state resets + precalc), for the weave loopInit. */
    loopInit?: string;
    /** Slider schema + defaults for the exposed params (empty in bake mode). In
     *  BANK mode (ADR-0090) these are FractalParameter-shaped with `feature:
     *  'weave'` + a bank state-key id (`ws<k>ParamA`); in dense/parametric mode
     *  they are PackedParam onto coreMath lanes. */
    params: any[];
    /** coreMath-lane defaults (dense/parametric mode) — EMPTY in bank mode. */
    coreMath: Record<string, any>;
    /** BANK-mode defaults (ADR-0090), keyed by bank state key (`ws<k>ParamA`) for
     *  `preset.features.weave`. Undefined in dense/parametric/bake mode. */
    weaveState?: Record<string, any>;
    /** False when the shared lane pool overflowed — caller re-resolves in bake mode
     *  (the same all-or-nothing fallback as the MB3D transpiler path). */
    paramOk: boolean;
    /** True when the formula actually UPDATES the DE derivative (writes `dr`) —
     *  i.e. supplies a usable analytic dr. The emit auto-routes a weave where NO
     *  slot writes a derivative to the numerical estimator (7, ADR-0085) — the
     *  same no-ADE policy as MB3D [CODE] slots. Detected from source, so P4.3's
     *  frag/DEC imports (which can be position-only) route correctly for free. */
    writesDeriv: boolean;
    /** The formula's own DE preferences (its preset quality subset), for the
     *  fused def when this slot LEADS the weave and no decompiled/intern DE meta
     *  applies. Undefined when the preset requests a capability-backed estimator
     *  (cutting-plane 5 / dIFS 6 / numeric 7): those need per-formula state or a
     *  custom getDist the fused def doesn't carry, so the whole tuned subset is
     *  dropped rather than half-applied. */
    deMeta?: Record<string, number>;
    /** The formula's custom `shader.getDist` BODY, rewritten for this slot
     *  (prefixed globals + helper renames + the slot's uniformMap) — P4.4
     *  lead-slot getDist splice. The emit attaches it to the fused def ONLY when
     *  this slot LEADS the weave (slot 0 — interlace-host semantics; secondaries
     *  stay unspliced). getDist runs at map() scope where the slot's `ws<N>_*`
     *  globals are visible, so accumulator-based DEs (KleinianMobius ks_*,
     *  Apollonian apo_*, Julia3D kk_minSurf) survive weaving — none of them are
     *  expressible on a generic estimator. core_math applies it exactly like a
     *  standalone formula's (custom body overrides the generic estimator when
     *  quality.estimator < 4.5). Undefined when the formula has none. */
    getDist?: string;
}

export interface NativeSlotReject { ok: false; reason: string; }

const num = (v: any): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const fmt = (v: any): string => {
    const n = num(v);
    return Number.isInteger(n) ? `${n}.0` : String(n);
};
const vecLit = (kind: 'vec2' | 'vec3' | 'vec4', v: any): string => {
    const comps = kind === 'vec2' ? ['x', 'y'] : kind === 'vec3' ? ['x', 'y', 'z'] : ['x', 'y', 'z', 'w'];
    return `${kind}(${comps.map((c) => fmt(v?.[c])).join(', ')})`;
};

/**
 * Bind the formula's declared parameters to lanes (or literals) and backfill every
 * undeclared primary uniform with its preset-default literal, yielding the
 * rewriter's `uniformMap`. vec2/vec4 params bind per-component scalar lanes and
 * re-compose (`vec2(<lane>, <lane>)`); vec3 params take a whole vec3-shaped unit.
 */
function buildParamBindings(
    def: FractalDefinition,
    packer: ScalarParamPacker | null,
): { map: Array<[string, string]>; ok: boolean } {
    const cm = (def.defaultPreset as any)?.features?.coreMath ?? {};
    const map: Array<[string, string]> = [];
    const covered = new Set<string>();

    for (const p of (def.parameters ?? []) as any[]) {
        if (!p?.id || covered.has(p.id)) continue;
        covered.add(p.id);
        const u = slotToUniform(p.id);
        const kind: 'float' | 'vec2' | 'vec3' | 'vec4' = p.type ?? 'float';
        const v = cm[p.id] ?? p.default;
        if (!packer) {
            map.push([u, kind === 'float' ? fmt(v) : vecLit(kind, v)]);
            continue;
        }
        if (kind === 'float') {
            const acc = packer.scalar(p.label, num(v), p.min, p.max, p.step);
            if (!acc) return { map, ok: false };
            map.push([u, acc]);
        } else if (kind === 'vec3') {
            const lane = packer.vec3(p.label, { x: num(v?.x), y: num(v?.y), z: num(v?.z) }, p.min, p.max, p.step);
            if (!lane) return { map, ok: false };
            map.push([u, lane.vec3Accessor]);
        } else {
            const comps = kind === 'vec2' ? ['x', 'y'] : ['x', 'y', 'z', 'w'];
            const accs: string[] = [];
            for (const c of comps) {
                const acc = packer.scalar(p.label, num(v?.[c]), p.min, p.max, p.step);
                if (!acc) return { map, ok: false };
                accs.push(acc);
            }
            map.push([u, `${kind}(${accs.join(', ')})`]);
        }
    }

    // Backfill: any primary uniform the formula references without declaring a
    // parameter for it must NOT fall through to the weave's own lanes.
    for (const slotId of CORE_SLOTS) {
        if (covered.has(slotId)) continue;
        const kind = slotId.startsWith('vec') ? vecKindOf(slotId) : 'float';
        map.push([slotToUniform(slotId), kind === 'float' ? fmt(cm[slotId]) : vecLit(kind, cm[slotId])]);
    }
    return { map, ok: true };
}

const plainVec = (kind: 'vec2' | 'vec3' | 'vec4', v: any): any =>
    kind === 'vec2' ? { x: num(v?.x), y: num(v?.y) }
        : kind === 'vec3' ? { x: num(v?.x), y: num(v?.y), z: num(v?.z) }
            : { x: num(v?.x), y: num(v?.y), z: num(v?.z), w: num(v?.w) };

/**
 * BANK (fidelity) binding — ADR-0090. A native slot presents its declared params
 * VERBATIM on its own per-slot bank: `uParamA → uWs<k>ParamA`, `uVec2A →
 * uWs<k>Vec2A`, … with NO vec decomposition (a declared vec2/vec4 binds a real
 * vec2/vec4 uniform). Every OTHER coreMath uniform the formula might reference is
 * backfilled to its preset-default LITERAL, so a slot can never read a bank
 * uniform it didn't declare (or another slot's). Because the declared ids are
 * already in the coreMath vocabulary, they fit bank k's mirror by construction —
 * bank mode never overflows.
 *
 * Returns the rewriter `uniformMap`, the bank state defaults (for
 * `preset.features.weave`), and FractalParameter-shaped param descriptors
 * (`feature: 'weave'`, state-key id, the formula's real label/range/mode/scale).
 */
function buildBankBindings(
    def: FractalDefinition,
    bank: number,
): { map: Array<[string, string]>; weaveState: Record<string, any>; params: any[] } {
    const cm = (def.defaultPreset as any)?.features?.coreMath ?? {};
    const map: Array<[string, string]> = [];
    const weaveState: Record<string, any> = {};
    const params: any[] = [];
    const covered = new Set<string>();

    for (const p of (def.parameters ?? []) as any[]) {
        if (!p?.id || covered.has(p.id)) continue;
        covered.add(p.id);
        const kind: 'float' | 'vec2' | 'vec3' | 'vec4' = p.type ?? 'float';
        const raw = cm[p.id] ?? p.default;
        const value = kind === 'float' ? num(raw) : plainVec(kind, raw);
        const bankKey = weaveBankKey(bank, p.id);
        map.push([slotToUniform(p.id), weaveBankUniform(bank, p.id)]);
        weaveState[bankKey] = value;
        // Carry the formula's full descriptor (label/type/range/mode/scale/options/
        // linkable); only the id + default + feature routing change. `group` is
        // stamped by emitFusedHybrid (per-formula divider), like MB3D slots.
        params.push({ ...p, id: bankKey, feature: 'weave', default: value });
    }

    // Backfill: bake every UNDECLARED coreMath uniform to its preset default.
    for (const slotId of CORE_SLOTS) {
        if (covered.has(slotId)) continue;
        const kind = slotId.startsWith('vec') ? vecKindOf(slotId) : 'float';
        map.push([slotToUniform(slotId), kind === 'float' ? fmt(cm[slotId]) : vecLit(kind, cm[slotId])]);
    }
    return { map, weaveState, params };
}

/**
 * Resolve one native formula into weave-slot emission pieces.
 *
 * @param slotIndex weave addon slot index — namespaces the slot (`ws<N>_`).
 * @param fnName    the dispatcher-facing function name (`<weaveId>_slot<N>`).
 * @param opts.bank       BANK (fidelity) mode — bind declared params VERBATIM onto
 *                        per-slot bank `<n>` (ADR-0090). Native slots use this; it
 *                        never overflows and never touches the coreMath pool.
 * @param opts.alloc      shared cross-slot LaneAllocator (multi-slot dense pack);
 *                        the caller must `startSlot()` before each slot.
 * @param opts.parametric single-slot parametric mode — a private allocator.
 *                        None of the three ⇒ bake mode (all params as literals).
 */
export function resolveNativeSlot(
    def: FractalDefinition,
    slotIndex: number,
    fnName: string,
    opts: { bank?: number; alloc?: LaneAllocator; parametric?: boolean } = {},
): NativeSlotResolution | NativeSlotReject {
    const sh = def.shader;
    const caps = sh.capabilities;
    if (caps?.has('shape:self-contained') || (sh as any).selfContainedSDE) {
        return { ok: false, reason: `${def.name ?? def.id} runs its own internal loop (self-contained) — it can't run as a weave slot.` };
    }
    if (caps?.has('shape:modular') || def.id === 'Modular') {
        return { ok: false, reason: `${def.name ?? def.id} is a modular graph formula — not weavable yet.` };
    }

    // Param binding: BANK (fidelity, native default) vs dense/parametric/bake.
    let map: Array<[string, string]>;
    let params: any[];
    let coreMath: Record<string, any>;
    let weaveState: Record<string, any> | undefined;
    if (opts.bank !== undefined) {
        const b = buildBankBindings(def, opts.bank);
        map = b.map; params = b.params; coreMath = {}; weaveState = b.weaveState;
    } else {
        const packer = opts.alloc
            ? new ScalarParamPacker(opts.alloc)
            : opts.parametric ? new ScalarParamPacker(new LaneAllocator()) : null;
        const r = buildParamBindings(def, packer);
        // Pool overflow: the caller discards this body and re-resolves in bake mode,
        // so only paramOk matters here.
        if (!r.ok) return { ok: true, glsl: '', call: '', preCall: '', params: [], coreMath: {}, paramOk: false, writesDeriv: true };
        map = r.map; params = packer?.params ?? []; coreMath = packer?.coreMath ?? {};
    }

    const P = `ws${slotIndex}_`;
    const R = createNativeSlotRewriter({
        uniformPrefix: `WSlot${slotIndex}`, // unused (uniformMap overrides), kept for diagnostics
        symbolPrefix: P,
        functionName: fnName,
        cVarName: `${P}c`,
        rotSwapPrefix: `_${P}`,
        warnTag: 'weave',
        uniformMap: map,
    });

    const pvars = sh.preambleVars ?? [];
    // Helpers + top-level locals from ALL three sources, so identity pairs never
    // redeclare (the interlace caller's exact recipe — features/interlace/index.ts).
    const preambleFunctions = [
        ...extractPreambleFunctions(sh.preamble ?? ''),
        ...extractPreambleFunctions(sh.function ?? ''),
        ...extractPreambleFunctions(sh.loopInit ?? ''),
    ].filter((v, i, a) => a.indexOf(v) === i);

    const rewrittenPreamble = sh.preamble ? R.rewritePreamble(sh.preamble, def.id, pvars) : '';
    const rewrittenFn = R.rewriteFormulaFunction(sh.function, def.id, pvars, preambleFunctions);
    const call = R.rewriteLoopBody(sh.loopBody, def.id, pvars).trim();
    let init = sh.loopInit ? R.rewriteLoopInit(sh.loopInit, def.id, pvars, preambleFunctions) : '';
    // getDist body rewrite (P4.4 lead-slot splice): the same rename set as
    // loopInit — helper fns, prefixed globals, this slot's uniformMap. The body
    // keeps its (r, dr, iter, z) argument names untouched.
    const getDist = sh.getDist ? R.rewriteLoopInit(sh.getDist, def.id, pvars, preambleFunctions) : undefined;

    // Hoist loopInit-declared state to globals: the dispatcher function can't see
    // map()-scope locals, and Phoenix/Bristorbrot pass these as call args. The
    // declaration becomes a global; the loopInit keeps a plain assignment.
    const globals: string[] = [];
    for (const pv of pvars) {
        const g = `${P}${pv}`;
        const declRe = new RegExp(`(^|\\n)([ \\t]*)(?:const\\s+)?(vec[234]|float|int|mat[234]|bool)\\s+(${g})\\b`);
        const m = declRe.exec(init);
        if (m) {
            globals.push(`${m[3]} ${g};`);
            init = init.slice(0, m.index) + `${m[1]}${m[2]}${g}` + init.slice(m.index + m[0].length);
        }
    }

    // c.w isolation: the slot's own c, with c.w = ITS paramA binding (lane or literal).
    const cw = map.find(([src]) => src === 'uParamA')?.[1] ?? '0.0';
    let preCall = `vec4 ${P}c = vec4(c.xyz, ${cw}); `;
    let postCall: string | undefined;

    const needsRot = !!sh.usesSharedRotation || !!caps?.has('iter:shared-rotation');
    if (needsRot) {
        globals.push(`vec3 ${P}rotAxis; float ${P}rotCos; float ${P}rotSin;`);
        // loopInit bracket: save the shared rotation state, let the slot's precalc
        // write it, capture the result into the slot globals, restore.
        init = `
vec3 _${P}svAxis = gmt_rotAxis; float _${P}svCos = gmt_rotCos; float _${P}svSin = gmt_rotSin;
${init}
${P}rotAxis = gmt_rotAxis; ${P}rotCos = gmt_rotCos; ${P}rotSin = gmt_rotSin;
gmt_rotAxis = _${P}svAxis; gmt_rotCos = _${P}svCos; gmt_rotSin = _${P}svSin;`;
        preCall += `vec3 _${P}pAxis = gmt_rotAxis; float _${P}pCos = gmt_rotCos; float _${P}pSin = gmt_rotSin; `
            + `gmt_rotAxis = ${P}rotAxis; gmt_rotCos = ${P}rotCos; gmt_rotSin = ${P}rotSin; `;
        postCall = ` gmt_rotAxis = _${P}pAxis; gmt_rotCos = _${P}pCos; gmt_rotSin = _${P}pSin;`;
    }

    // DE policy (P4.2). writesDeriv: does anything in the formula update `dr`?
    // (dr is threaded inout through helpers under the same name, so a source scan
    // over function+loopBody+loopInit covers the helper-write case too.)
    const writesDeriv = /\bdr(?:\.\w+)?\s*[*+/-]?=(?!=)/.test(`${sh.function}\n${sh.loopBody}\n${sh.loopInit ?? ''}`);
    // deMeta: the formula's tuned quality subset — only for GENERIC estimators
    // (0 analytic / 1 linear / 2 pseudo / 3 dampened / 4 linear-offset). 5/6/7
    // need capabilities or state the fused def doesn't have; their tuned values
    // would be half-applied nonsense, so drop the subset entirely.
    const q = (def.defaultPreset as any)?.features?.quality ?? {};
    let deMeta: Record<string, number> | undefined;
    if (q.estimator === undefined || (q.estimator >= 0 && q.estimator <= 4)) {
        deMeta = {};
        for (const k of ['estimator', 'fudgeFactor', 'distanceMetric', 'deBailout', 'detail'] as const) {
            if (typeof q[k] === 'number') deMeta[k] = q[k];
        }
        if (Object.keys(deMeta).length === 0) deMeta = undefined;
    }

    return {
        ok: true,
        glsl: [globals.join('\n'), rewrittenPreamble, rewrittenFn].filter(Boolean).join('\n'),
        call,
        preCall,
        postCall,
        loopInit: init ? `${init}\n` : undefined,
        params,
        coreMath,
        weaveState,
        paramOk: true,
        writesDeriv,
        deMeta,
        getDist,
    };
}
