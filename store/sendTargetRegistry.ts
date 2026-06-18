/**
 * sendTargetRegistry — engine-core SEND-TARGET kernel (W2 generic, P0e interface (c)).
 *
 * A target is a named destination ("Generator · Slot A", "Stops · edit", a host
 * coloring layer) that knows how to `apply` a payload. This module is the generic
 * registry + selector; `components/DropTargetLayer.tsx` is the drag/drop affordance
 * over it (an app reaches a destination by dragging onto its on-screen anchor). The
 * `targetsForPayload` selector is also the basis for any click "send to" affordance an
 * app cares to build — but none ships today.
 *
 * It generalizes the gradient-specific list `palette/core/favientTargets.ts` once
 * owned (`apply(config, name)`) into a payload-generic registry. P2 FOLDED those
 * targets here as `SendTarget`s (host coloring layers = `group: 'host'`), so
 * favientTargets.ts now holds only the panel's host-capability flags — one registry.
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
 *   `registerHistoryProvider`.
 * @invariant `DropTargetLayer` derives its visible set from `targetsForPayload`, so
 *   the node harness covers the consumer's contents + self-filtering by construction.
 *
 * @see components/DropTargetLayer.tsx (the drag/drop affordance over this registry)
 * @see palette/core/favientTargets.ts (host-capability flags; its target list folded here in P2)
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
    /**
     * Optional DRAG-visibility predicate over the drag's MIME types — the click-twin of
     * `accepts(payload)`, usable while `getData` is blocked mid-drag. Absent → shown for
     * any accepted drag. A drop-target layer hides this target during a drag whose types
     * it rejects (e.g. a "save to Favients" target stands down during an internal Favients
     * reorder so the shelf's own drag-and-drop keeps working).
     */
    acceptsTypes?: (types: string[]) => boolean;
    /**
     * When true, during a DRAG the layer shows this target's anchored dropbox as a
     * VISUAL affordance only (pointer-events-none) — the drag falls THROUGH to the
     * element underneath, which handles the drop itself (e.g. the Favients panel's own
     * insert / group / reorder drag-and-drop). The CLICK (select) path is unaffected.
     */
    dragPassthrough?: boolean;
    /** Apply the payload to this destination. */
    apply: (payload: P) => void;
    /**
     * Optional: reveal this destination's editor in the host UI (activate its panel
     * tab, open its accordion section, scroll it into view). Called by the panel
     * AFTER `apply` so applying a favourite surfaces where it landed. The registry
     * never interprets it — the host wires the actual panel/accordion navigation
     * (app-gmt: setActiveTab + the accordion-reveal bus). Absent → apply is silent.
     */
    reveal?: () => void;
    /**
     * Optional: the DDFS gradient param this target WRITES to, as a generic
     * `{ featureId, paramKey }` identity (e.g. coloring/gradient → "Coloring · Layer 1").
     * Lets the in-panel gradient editor — which knows only its own (featureId, paramKey)
     * — find the matching destination and point the Favients "Destination" dropdown at
     * itself (the editor's Favients star). Engine-core stays generic: the editor passes
     * its identity, the registry holds the reverse map, the host declares the link.
     */
    editsParam?: { featureId: string; paramKey: string };
    /**
     * Optional live on-screen rect of this target's anchor element. Additive
     * §4(c) amendment (mirrors `(b)`'s optional `render?`): when present, the
     * target is a SPATIAL drop zone — a drop-target layer renders its dropbox
     * anchored over this rect and hit-tests drops against it; when absent, the
     * target has no on-screen anchor (menu-only, or a bottom-row well). Read at
     * paint / hit-test time, never cached. Returns null when the anchor is not
     * currently mounted/visible (the target then shows no anchored dropbox).
     */
    getRect?: () => DOMRect | null;
    /**
     * Optional ORDERED list of opaque "reveal step" ids that must be satisfied for this
     * target's anchor to be on screen (e.g. ['tab:Generator', 'gen:colorbox'] — open the
     * Generator tab, then switch it to ColorBox mode). The registry never interprets the
     * ids. A host that lays targets out spatially uses this to DERIVE intermediate
     * affordances purely from the registered set: when a target's `getRect()` is null
     * (anchor hidden), the host walks `revealPath` and surfaces the FIRST unsatisfied step
     * as a one-click/dwell "reveal" — so a new target (even behind several steps) auto-
     * populates its whole path with no host-side map.
     */
    revealPath?: string[];
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
 * any whose `accepts(payload)` is false. This is exactly what `DropTargetLayer`
 * lists (and any "send to" affordance would), so testing it tests the consumer's
 * contents without a DOM. A throwing `accepts` excludes the target (fail-safe).
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
