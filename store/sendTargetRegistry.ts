/**
 * sendTargetRegistry — engine-core SEND-TARGET kernel (W2 generic, P0e interface (c)).
 *
 * The click/keyboard twin of the drag/drop-wells kernel: where a well is reached
 * by dragging, a send target is reached from a "Send to ▾" menu. A target is a
 * named destination ("Generator · Slot A", "Stops · edit", a host coloring layer)
 * that knows how to `apply` a payload. This module is the generic registry +
 * selector; `components/SendToMenu.tsx` is the reusable affordance.
 *
 * It generalizes `palette/core/favientTargets.ts` (gradient-specific: `apply
 * (config, name)`) into a payload-generic registry. That existing module is NOT
 * migrated here — it keeps working; P2 re-homes favient targets onto this kernel.
 *
 * ── Generic over payload ─────────────────────────────────────────────────────
 *  `apply(payload)` / `accepts?(payload)` take an opaque payload `P`. The Gradient
 *  Explorer (P1/P2) will register targets whose payload carries a `GradientConfig`
 *  (+ provenance `kind`), but the kernel imposes no shape. `group` ('host' | 'mode')
 *  lets the menu visually separate host destinations (coloring layers) from
 *  intra-app mode destinations (Generator slot, Stops edit).
 *
 * @invariant Host-agnostic: imports nothing app-specific. Hosts register INTO it.
 * @invariant Idempotent by id (re-registering replaces) — mirrors
 *   `registerFavientTarget` / `registerDropWell`.
 * @invariant `<SendToMenu/>` derives its visible set from `targetsForPayload`, so
 *   the node harness covers the menu's contents + self-filtering by construction.
 *
 * @see store/dropWellRegistry.ts (the drag twin — interface (b))
 * @see palette/core/favientTargets.ts (the gradient-specific registry this generalizes)
 */

import { createListRegistry } from './createListRegistry';

export interface SendTarget<P = unknown> {
    /** Stable id (idempotent registration key; also the self-target filter key). */
    id: string;
    /** Menu label, e.g. "Generator · Slot A". */
    label: string;
    /** Visual/semantic group: host destination vs intra-app mode destination. */
    group: 'host' | 'mode';
    /**
     * Optional applicability predicate. Return false to hide this target for a
     * given payload (e.g. a target that only accepts a particular `kind`). Absent
     * → always applicable. A throwing predicate is treated as "not applicable".
     */
    accepts?: (payload: P) => boolean;
    /** Apply the payload to this destination. */
    apply: (payload: P) => void;
}

// Stored as the widest payload; registrants narrow `P` at the call site.
const _registry = createListRegistry<SendTarget<unknown>>();

/**
 * Register a send target (idempotent by id). Returns an unregister thunk;
 * `unregisterSendTarget(id)` does the same by id.
 */
export const registerSendTarget = <P>(target: SendTarget<P>): (() => void) =>
    _registry.register(target as SendTarget<unknown>);

export const unregisterSendTarget = (id: string): void => _registry.unregister(id);

/** All registered targets, registration order (stable reference between
 *  mutations — safe as a `useSyncExternalStore` snapshot). */
export const getSendTargets = (): SendTarget[] => _registry.getAll();

/** Subscribe to registry changes. Returns unsubscribe. */
export const subscribeSendTargets = (l: () => void): (() => void) => _registry.subscribe(l);

export interface TargetsForPayloadOptions {
    /** Hide the target whose id matches (don't offer "Generator → Generator slot"
     *  on the Generator hero). */
    selfId?: string;
}

/**
 * Pure selector: the targets applicable to a payload — drops the self target and
 * any whose `accepts(payload)` is false. This is exactly what `<SendToMenu/>`
 * lists, so testing it tests the menu's contents without a DOM. A throwing
 * `accepts` excludes the target (fail-safe).
 */
export const targetsForPayload = <P>(
    payload: P,
    options: TargetsForPayloadOptions = {},
): SendTarget<P>[] =>
    getSendTargets().filter((t) => {
        if (options.selfId && t.id === options.selfId) return false;
        if (!t.accepts) return true;
        try { return t.accepts(payload); } catch { return false; }
    });
