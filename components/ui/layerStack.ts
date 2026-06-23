import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { z, type Tier } from './zIndex';

/**
 * Ephemeral click-to-front / open-order stacking, generalized to ANY rank-able
 * tier. One in-memory order list (bottom → top) PER tier, keyed by opaque id —
 * so panels, popovers and overlays each have an independent ordering that never
 * bleeds across bands. A participant's z is `z(tier, rank)`, staying inside the
 * tier's reserved `span` (see {@link Tier}).
 *
 * This is the generalization of the original panel-only stack (ADR-0081): the
 * `panel` band is just one instance. `panelStack.ts` re-exports the `'panel'`
 * instance for the existing `FloatingPanel` call sites unchanged.
 *
 * @invariant Session-local only — never persisted. "Which surface did I touch
 *   last" is correct to reset on reload; default order falls out of mount order.
 * @invariant Only participating surfaces enrol. Static/anchored surfaces pass a
 *   fixed rank (0) and are absent from the order.
 * @invariant The `panel` band consumes 100–199 in full — see {@link z} / zIndex.ts.
 *
 * @see docs/adr/0081-floating-panel-click-to-front-stacking.md
 */
export interface LayerBandState {
    /** Participating ids, bottom → top. The last entry renders on top. */
    order: string[];
    /** Bring an id to the top (registers it if new). No-op if already top. */
    raise: (id: string) => void;
    /** Drop an id from the order. Call on unmount. */
    release: (id: string) => void;
}

type BandStore = UseBoundStore<StoreApi<LayerBandState>>;

/** Lazily-created stores, one per tier. A band that's never used costs nothing. */
const bands = new Map<Tier, BandStore>();

function bandStore(tier: Tier): BandStore {
    let store = bands.get(tier);
    if (!store) {
        store = create<LayerBandState>((set) => ({
            order: [],
            raise: (id) =>
                set((s) => {
                    const i = s.order.indexOf(id);
                    // Already present and on top — skip the write (no needless re-render).
                    if (i !== -1 && i === s.order.length - 1) return s;
                    const next = i === -1 ? s.order.slice() : s.order.filter((x) => x !== id);
                    next.push(id);
                    return { order: next };
                }),
            release: (id) =>
                set((s) => (s.order.includes(id) ? { order: s.order.filter((x) => x !== id) } : s)),
        }));
        bands.set(tier, store);
    }
    return store;
}

/**
 * Subscribe to a band's store with a selector. `tier` must be constant for a
 * given component (it is — a literal), so the same hook is invoked each render.
 */
export function useLayerStack<T>(tier: Tier, selector: (s: LayerBandState) => T): T {
    return bandStore(tier)(selector);
}

/**
 * The z-index a participating surface should render at, given its place in the
 * band. Returns a primitive, so a surface only re-renders when its own rank
 * changes. Unregistered ids (first render, before the mount effect) fall back to
 * the band base (rank 0).
 */
export function useLayerStackZ(tier: Tier, id: string): number {
    return bandStore(tier)((s) => {
        const i = s.order.indexOf(id);
        return z(tier, i < 0 ? 0 : i);
    });
}
