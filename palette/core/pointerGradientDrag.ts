/**
 * pointerGradientDrag — drag a gradient with the MOUSE, for the one case HTML5 cannot do.
 *
 * WHY THIS EXISTS. A gesture on the hero's ramp starts life as the stops editor's selection
 * marquee, and only becomes "pick the whole gradient up" once it has wandered away from the
 * knots (owner, 2026-09-09). HTML5 drag-and-drop cannot express that: `dragstart` fires only
 * from a press on a `draggable` element, so a marquee already running on mouse events can
 * never be handed over to a native drag. Deciding at press time instead was tried and was
 * worse — it swallowed drags that were reaching for knots.
 *
 * HOW IT AVOIDS BEING A SECOND DROP PATH. It does not route drops itself. It builds a real
 * `DataTransfer`, fills it with `setFavientDrag` exactly as a native drag would, and then
 * DISPATCHES the ordinary drag events — `dragenter`, `dragover`, `dragleave`, `drop`,
 * `dragend` — at whatever is under the pointer. Every existing target answers them with the
 * handlers it already has: the rail's chips, its tail and its trash, the wall's bands,
 * `GroundList`'s rows. There is one drop implementation in this app and this is not a
 * second one; it is a second way to *reach* it.
 *
 * Acceptance follows the spec too: a target says "I'll take this" by calling
 * `preventDefault()` on `dragover`, so `defaultPrevented` on the event we dispatched tells
 * us whether a release here would drop. Release over something that never accepted and the
 * drag simply ends.
 *
 * The avatar comes along for free: `setFavientDrag` fills the drag-payload slot and
 * `beginNativeDrag` raises the in-flight flag, which is all `GradientDragAvatar` reads, and
 * the `dragover` events we dispatch are what it tracks the cursor by.
 *
 * @assumption a drop is dispatched only where a `dragover` was accepted, and exactly once
 *   per drag. NOT an `@invariant`: there is no harness, because everything load-bearing here
 *   is the browser's — `DataTransfer`, `elementFromPoint`, real `DragEvent` dispatch and the
 *   `defaultPrevented` handshake. A node harness would have to shim all four and would then
 *   be testing the shims. Measured instead in the running app on 2026-09-09: released over
 *   the top bar (no target) → **0 drops, shelf unchanged**; released over a rail chip →
 *   **exactly 1 drop**, and the favourite MOVED (Presets 26→25, Kept 9→10) rather than
 *   being copied. Re-walk those two if you change the session bookkeeping.
 * @see palette/core/favientDnd.ts (the payload every target already reads)
 * @see components/AdvancedGradientEditor.tsx (`marqueeEscape`, which starts this)
 */

import { setFavientDrag, type FavientDragPayload } from './favientDnd';
import { beginNativeDrag, setDragOrigin, setDragPayload } from '../store/dragVisual';

interface Session {
  dt: DataTransfer;
  /** The element the last `dragover` went to, so we can `dragleave` it on the way out. */
  over: Element | null;
  /** Whether that element accepted — i.e. would take a drop right now. */
  accepted: boolean;
  onMove: (e: MouseEvent) => void;
  onUp: (e: MouseEvent) => void;
  onKey: (e: KeyboardEvent) => void;
}

let session: Session | null = null;

const fire = (el: Element, type: string, e: MouseEvent, dt: DataTransfer, relatedTarget?: Element | null): DragEvent => {
  const ev = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: e.clientX,
    clientY: e.clientY,
    dataTransfer: dt,
    relatedTarget: relatedTarget ?? null,
  });
  el.dispatchEvent(ev);
  return ev;
};

/** Stop listening and clear the in-flight visuals. Safe to call twice. */
const teardown = (): void => {
  if (!session) return;
  const s = session;
  session = null;
  window.removeEventListener('mousemove', s.onMove, true);
  window.removeEventListener('mouseup', s.onUp, true);
  window.removeEventListener('keydown', s.onKey, true);
  // `dragend` is what every listener uses to stand down — including the module-level one in
  // `dragVisual` that clears the in-flight flag and the payload, and so the avatar.
  window.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
};

/** Give up without dropping (Escape, or the gesture came back to where it started). */
export const cancelPointerGradientDrag = (): void => {
  if (!session) return;
  const { over, dt } = session;
  if (over) {
    over.dispatchEvent(new DragEvent('dragleave', { bubbles: true, dataTransfer: dt, relatedTarget: null }));
  }
  teardown();
};

export const isPointerGradientDragging = (): boolean => session !== null;

/**
 * Pick a gradient up under the mouse. `origin` is the rect it came from, for the avatar's
 * sense of where it started. Ends on mouseup (dropping if something accepted), on Escape,
 * or on `cancelPointerGradientDrag`.
 */
export const startPointerGradientDrag = (payload: FavientDragPayload, at: { x: number; y: number }, origin?: DOMRect): void => {
  cancelPointerGradientDrag();
  const dt = new DataTransfer();
  setFavientDrag(dt, payload); // also fills the avatar's payload slot
  if (origin) setDragOrigin(origin);
  beginNativeDrag();

  const s: Session = {
    dt,
    over: null,
    accepted: false,
    onMove: (e) => {
      if (!session) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      if (el !== session.over) {
        if (session.over) fire(session.over, 'dragleave', e, dt, el);
        fire(el, 'dragenter', e, dt, session.over);
        session.over = el;
      }
      // Per the spec, a target claims the drop by preventing the dragover's default.
      session.accepted = fire(el, 'dragover', e, dt).defaultPrevented;
    },
    onUp: (e) => {
      if (!session) return;
      const { over, accepted } = session;
      if (over && accepted) fire(over, 'drop', e, dt);
      else if (over) fire(over, 'dragleave', e, dt, null);
      teardown();
    },
    onKey: (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelPointerGradientDrag();
      }
    },
  };
  session = s;
  window.addEventListener('mousemove', s.onMove, true);
  window.addEventListener('mouseup', s.onUp, true);
  window.addEventListener('keydown', s.onKey, true);
  // Put the avatar where the pointer already is, rather than waiting for the first move.
  setDragPayload({ config: payload.config, name: payload.name, favId: payload.favId, count: payload.favIds?.length });
  s.onMove(new MouseEvent('mousemove', { clientX: at.x, clientY: at.y }));
};
