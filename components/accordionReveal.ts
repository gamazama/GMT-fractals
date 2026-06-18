/**
 * accordionReveal — a tiny host-agnostic bus for asking a mounted <Accordion/> to
 * OPEN one of its sections by id.
 *
 * The Accordion owns its open/closed state internally (it is uncontrolled), but some
 * flows need to reveal a specific section from the outside — e.g. applying a Favients
 * gradient to "Coloring · Layer 2" should open the Gradient panel's Layer 2 section so
 * the user sees where it landed. Rather than lift the whole accordion to controlled
 * state, an accordion subscribes here and opens a section when its id is requested
 * (respecting its own exclusive-group rules). Unknown ids are ignored by every
 * accordion that doesn't own that section.
 *
 * Mount-race: a request often fires right when the destination's PANEL is being
 * activated, so the accordion that owns the section may not be subscribed yet (it
 * mounts a tick later). We therefore both (a) notify live subscribers AND (b) LATCH the
 * request briefly so an accordion mounting just after can consume it. The latch has a
 * short TTL so a request no accordion claims doesn't open a section much later.
 *
 * @invariant Fire-and-forget; the owning accordion reacts (live or on mount), others
 *   no-op. The latch is consumed once and expires fast (PENDING_TTL_MS).
 */

const PENDING_TTL_MS = 2000;

const _listeners = new Set<(sectionId: string) => void>();
let _pending: { id: string; t: number } | null = null;

/** Ask any mounted accordion that owns `sectionId` to open that section (and latch the
 *  request briefly for an accordion that mounts immediately after). */
export const requestAccordionOpen = (sectionId: string): void => {
    _pending = { id: sectionId, t: Date.now() };
    _listeners.forEach((l) => l(sectionId));
};

/** On mount, an accordion consumes a still-fresh latched request it owns (covers the
 *  case where the request fired before this accordion subscribed). Returns the section
 *  id to open, or null. Consuming clears the latch so it fires once. */
export const consumePendingAccordionOpen = (owns: (sectionId: string) => boolean): string | null => {
    if (_pending && Date.now() - _pending.t < PENDING_TTL_MS && owns(_pending.id)) {
        const id = _pending.id;
        _pending = null;
        return id;
    }
    return null;
};

/** Subscribe to open-requests (accordions call this on mount). Returns unsubscribe. */
export const subscribeAccordionOpen = (l: (sectionId: string) => void): (() => void) => {
    _listeners.add(l);
    return () => {
        _listeners.delete(l);
    };
};
