/**
 * useDragEndSafetyNet — recover from an HTML5 drag whose SOURCE is unmounted mid-drag
 * (e.g. a list reorder that hides the dragged item). The browser then fires neither `drop`
 * nor `dragend` on the window, so any "a drag is live" flag would hang (a stuck avatar /
 * permanently-hidden swatch). `mousemove` is suppressed DURING a real native drag, so the
 * FIRST mousemove we see while a drag is still believed live means it actually ended → call
 * `onEnd`. Attached ONLY while `active`, so idle moves are free.
 *
 * Shared by `useDragInFlight` (the drop-wells kernel) and the Favients panel's own tracker.
 *
 * @param active whether a drag is currently believed to be in flight
 * @param onEnd  called when a mousemove leaks through (the drag has ended)
 */
import { useEffect } from 'react';

export const useDragEndSafetyNet = (active: boolean, onEnd: () => void): void => {
  useEffect(() => {
    if (!active) return;
    const onMove = (): void => onEnd();
    window.addEventListener('mousemove', onMove, true);
    return () => window.removeEventListener('mousemove', onMove, true);
    // onEnd is stable-by-behavior (reducer dispatch / setter-backed callback); re-subscribing
    // only when `active` flips avoids churning the listener on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
};
