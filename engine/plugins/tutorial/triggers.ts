/**
 * Trigger registry — open set of evaluators keyed by `kind`. The engine
 * ships nine generic kinds (below); apps register UI-coupled kinds (`tab`,
 * `mode`, `action`, …) via `tutorTriggers.register(...)`.
 *
 * An evaluator's `setup` runs at step entry. It returns one or both of:
 *   - `evaluate(state)`: passive predicate run on every store change
 *     (used by value / bool / delta / compound / or)
 *   - cleanup: timers, listeners
 * Active triggers (delay, keypress, manual, action) call `ctx.advance()`
 * directly when their condition fires; their `evaluate` is left undefined.
 *
 * Compound and `or` accept sub-trigger specs. Their setup recursively
 * builds child evaluators and combines results.
 */

import type { TriggerSpec } from './types';

export interface TriggerSetupCtx {
    /** Live store snapshot — the engine store API. */
    getState: () => any;
    /** Subscribe to store changes; returns unsub. */
    subscribe: (fn: (state: any) => void) => () => void;
    /** Call to advance the step (active triggers fire this). */
    advance: () => void;
    /** Action bus — for the `action` trigger kind. */
    onAction: (name: string, fn: () => void) => () => void;
    /** Step-scoped snapshot store — used by `delta` to remember an
     *  initial value taken at step entry, optionally deferred via settleMs. */
    snapshots: Map<string, any>;
    /** Path resolver helper (dotted store path). */
    resolvePath: (state: any, path: string) => any;
}

export interface TriggerEvaluator<TSpec extends TriggerSpec = TriggerSpec> {
    kind: string;
    setup(spec: TSpec, ctx: TriggerSetupCtx): {
        evaluate?: (state: any) => boolean;
        cleanup?: () => void;
    };
}

const _triggers = new Map<string, TriggerEvaluator>();

export const tutorTriggers = {
    register<T extends TriggerSpec>(evaluator: TriggerEvaluator<T>): void {
        _triggers.set(evaluator.kind, evaluator as TriggerEvaluator);
    },
    unregister(kind: string): void { _triggers.delete(kind); },
    get(kind: string): TriggerEvaluator | undefined { return _triggers.get(kind); },
    listKinds(): string[] { return Array.from(_triggers.keys()); },
};

// ── Helpers ────────────────────────────────────────────────────────────

export function resolveStorePath(state: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], state);
}

function valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a === 'object' && typeof b === 'object') {
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        if (ka.length !== kb.length) return false;
        return ka.every((k) => valuesEqual(a[k], b[k]));
    }
    return false;
}

// ── Built-in evaluators ────────────────────────────────────────────────

/** value trigger — store path compared eq/lte/gte; tolerance, abs, settleMs. */
interface ValueSpec extends TriggerSpec {
    kind: 'value';
    path: string;
    compare: 'eq' | 'lte' | 'gte';
    value: number;
    tolerance?: number;
    waitForRelease?: boolean;
    abs?: boolean;
    settleMs?: number;
}

const valueTrigger: TriggerEvaluator<ValueSpec> = {
    kind: 'value',
    setup(spec, ctx) {
        let postTimer: ReturnType<typeof setTimeout> | null = null;
        const isHit = (state: any): boolean => {
            if (spec.waitForRelease && state.isUserInteracting) return false;
            let v = ctx.resolvePath(state, spec.path);
            if (v == null) return false;
            if (spec.abs) v = Math.abs(v);
            const tol = spec.tolerance ?? 0;
            switch (spec.compare) {
                case 'eq':  return Math.abs(v - spec.value) <= tol;
                case 'lte': return v <= spec.value;
                case 'gte': return v >= spec.value;
            }
            return false;
        };
        return {
            evaluate(state) {
                if (!isHit(state)) {
                    if (postTimer) { clearTimeout(postTimer); postTimer = null; }
                    return false;
                }
                if (!spec.settleMs) return true;
                if (postTimer) return false;  // wait for it
                postTimer = setTimeout(() => {
                    postTimer = null;
                    if (isHit(ctx.getState())) ctx.advance();
                }, spec.settleMs);
                return false;
            },
            cleanup() { if (postTimer) clearTimeout(postTimer); },
        };
    },
};

/** bool trigger — path === literal. */
interface BoolSpec extends TriggerSpec {
    kind: 'bool';
    path: string;
    value: boolean | string | number | null;
}
const boolTrigger: TriggerEvaluator<BoolSpec> = {
    kind: 'bool',
    setup: (spec, ctx) => ({
        evaluate: (s) => ctx.resolvePath(s, spec.path) === spec.value,
    }),
};

/** delta trigger — path diverged from snapshot at entry. */
interface DeltaSpec extends TriggerSpec {
    kind: 'delta';
    path: string;
    waitForRelease?: boolean;
    settleMs?: number;
}
const deltaTrigger: TriggerEvaluator<DeltaSpec> = {
    kind: 'delta',
    setup(spec, ctx) {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const capture = () => {
            const v = ctx.resolvePath(ctx.getState(), spec.path);
            ctx.snapshots.set(spec.path, JSON.parse(JSON.stringify(v ?? null)));
        };
        if (spec.settleMs) {
            timer = setTimeout(() => { timer = null; capture(); }, spec.settleMs);
        } else {
            capture();
        }
        return {
            evaluate(state) {
                if (spec.waitForRelease && state.isUserInteracting) return false;
                if (!ctx.snapshots.has(spec.path)) return false;
                const cur = ctx.resolvePath(state, spec.path);
                const snap = ctx.snapshots.get(spec.path);
                return !valuesEqual(cur, snap);
            },
            cleanup() { if (timer) clearTimeout(timer); },
        };
    },
};

/** compound — all sub-triggers true. */
interface CompoundSpec extends TriggerSpec {
    kind: 'compound';
    conditions: TriggerSpec[];
}
const compoundTrigger: TriggerEvaluator<CompoundSpec> = {
    kind: 'compound',
    setup(spec, ctx) {
        const children = spec.conditions.map((c) => {
            const e = tutorTriggers.get(c.kind);
            return e ? e.setup(c, ctx) : null;
        });
        return {
            evaluate(state) { return children.every((c) => c?.evaluate?.(state) === true); },
            cleanup() { children.forEach((c) => c?.cleanup?.()); },
        };
    },
};

/** or — any sub-trigger true. */
interface OrSpec extends TriggerSpec {
    kind: 'or';
    conditions: TriggerSpec[];
}
const orTrigger: TriggerEvaluator<OrSpec> = {
    kind: 'or',
    setup(spec, ctx) {
        const children = spec.conditions.map((c) => {
            const e = tutorTriggers.get(c.kind);
            return e ? e.setup(c, ctx) : null;
        });
        return {
            evaluate(state) { return children.some((c) => c?.evaluate?.(state) === true); },
            cleanup() { children.forEach((c) => c?.cleanup?.()); },
        };
    },
};

/** keypress — any of N keys. With `waitForRelease`, advances on keyup. */
interface KeypressSpec extends TriggerSpec { kind: 'keypress'; keys: string[]; waitForRelease?: boolean; }
const keypressTrigger: TriggerEvaluator<KeypressSpec> = {
    kind: 'keypress',
    setup(spec, ctx) {
        const keys = spec.keys.map((k) => k.toLowerCase());
        let armed = false;
        const onDown = (e: KeyboardEvent) => {
            _emitPressed(e.key);
            if (!keys.includes(e.key.toLowerCase())) return;
            if (spec.waitForRelease) armed = true;
            else ctx.advance();
        };
        const onUp = (e: KeyboardEvent) => {
            if (!armed) return;
            if (keys.includes(e.key.toLowerCase())) ctx.advance();
        };
        window.addEventListener('keydown', onDown);
        if (spec.waitForRelease) window.addEventListener('keyup', onUp);
        return {
            cleanup: () => {
                window.removeEventListener('keydown', onDown);
                window.removeEventListener('keyup', onUp);
            },
        };
    },
};

/** keypress_all — all N keys must have been seen. With `waitForRelease`,
 *  advances on the keyup of the last completing key (so users can finish
 *  the gesture before the step changes underfoot). */
interface KeypressAllSpec extends TriggerSpec { kind: 'keypress_all'; keys: string[]; waitForRelease?: boolean; }
const keypressAllTrigger: TriggerEvaluator<KeypressAllSpec> = {
    kind: 'keypress_all',
    setup(spec, ctx) {
        const target = new Set(spec.keys.map((k) => k.toLowerCase()));
        const seen = new Set<string>();
        let armed = false;
        const onDown = (e: KeyboardEvent) => {
            _emitPressed(e.key);
            const k = e.key.toLowerCase();
            if (!target.has(k)) return;
            seen.add(k);
            if (seen.size < target.size) return;
            if (spec.waitForRelease) armed = true;
            else ctx.advance();
        };
        const onUp = () => { if (armed) ctx.advance(); };
        window.addEventListener('keydown', onDown);
        if (spec.waitForRelease) window.addEventListener('keyup', onUp);
        return {
            cleanup: () => {
                window.removeEventListener('keydown', onDown);
                window.removeEventListener('keyup', onUp);
            },
        };
    },
};

/** delay — auto-advance after N ms. */
interface DelaySpec extends TriggerSpec { kind: 'delay'; ms: number; }
const delayTrigger: TriggerEvaluator<DelaySpec> = {
    kind: 'delay',
    setup(spec, ctx) {
        const t = setTimeout(() => ctx.advance(), spec.ms);
        return { cleanup: () => clearTimeout(t) };
    },
};

/** action — fires when an action name is broadcast on the action bus. */
interface ActionSpec extends TriggerSpec { kind: 'action'; name: string; }
const actionTrigger: TriggerEvaluator<ActionSpec> = {
    kind: 'action',
    setup(spec, ctx) {
        const unsub = ctx.onAction(spec.name, () => ctx.advance());
        return { cleanup: unsub };
    },
};

/** manual — Next button only. */
const manualTrigger: TriggerEvaluator = {
    kind: 'manual',
    setup: () => ({}),
};

/** Register the engine's built-in trigger kinds. Idempotent. */
export function registerBuiltinTriggers(): void {
    tutorTriggers.register(valueTrigger);
    tutorTriggers.register(boolTrigger);
    tutorTriggers.register(deltaTrigger);
    tutorTriggers.register(compoundTrigger);
    tutorTriggers.register(orTrigger);
    tutorTriggers.register(keypressTrigger);
    tutorTriggers.register(keypressAllTrigger);
    tutorTriggers.register(delayTrigger);
    tutorTriggers.register(actionTrigger);
    tutorTriggers.register(manualTrigger);
}

// ── Pressed-key feedback bus (for showKeys cap visualisation) ──────────

const _pressedListeners = new Set<(key: string) => void>();
function _emitPressed(key: string) { _pressedListeners.forEach((fn) => fn(key)); }
export function onKeyPressed(fn: (key: string) => void): () => void {
    _pressedListeners.add(fn);
    return () => { _pressedListeners.delete(fn); };
}
