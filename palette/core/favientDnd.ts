/**
 * favientDnd — the drag-and-drop payload contract for dragging a favourite gradient
 * out of the Favients panel onto an apply target (e.g. a generator source slot).
 * Shared by the drag source (FavientsPanel) and any drop target.
 */

import type { GradientConfig } from '../../types';
import { beginNativeDrag } from '../store/dragVisual';

export const FAVIENT_DND_MIME = 'application/x-gmt-favient';
/** Marker MIME present ONLY on drags that started from an existing Favients swatch.
 *  Readable during `dragover` (where getData is blocked), so a swatch can show the
 *  reorder indicator for internal drags but not external ones (picker → add). */
export const FAVIENT_INTERNAL_MIME = 'application/x-gmt-favient-internal';

export interface FavientDragPayload {
  config: GradientConfig;
  name: string;
  /** Provenance, carried so a drop-to-favourite keeps the gradient's origin label. */
  source?: string;
  /** Set when the drag originates from an existing Favients swatch — enables
   *  drop-on-another-swatch reordering (and tells the shelf not to re-add it). */
  favId?: string;
}

/** Write a favourite onto a drag event's dataTransfer (custom MIME + text fallback). */
export const setFavientDrag = (dt: DataTransfer, payload: FavientDragPayload): void => {
  const json = JSON.stringify(payload);
  try {
    dt.setData(FAVIENT_DND_MIME, json);
    if (payload.favId) dt.setData(FAVIENT_INTERNAL_MIME, '1');
  } catch {
    /* some browsers restrict custom MIME on certain elements */
  }
  dt.setData('text/plain', payload.name);
  dt.effectAllowed = 'copy';
};

// A 1×1 transparent GIF, created EAGERLY at module load (DOM-guarded so pure-core tests don't
// touch it). Eager (not lazy-on-first-drag) is the fix for "I just get a plain HTML drag":
// setDragImage needs a DECODED image, and a freshly-`new Image()` set in the same dragstart
// hasn't decoded yet, so the browser silently falls back to the native frozen-bitmap image.
// Creating it at import gives it ample time to decode before the user can drag.
const EMPTY_DRAG_IMG: HTMLImageElement | null = (() => {
  if (typeof document === 'undefined') return null;
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return img;
})();

/**
 * Suppress the browser's default (frozen-bitmap) drag image so a custom cursor-following
 * avatar can stand in. Call right after `setFavientDrag` in a gradient drag source.
 *
 * Also REGISTERS the drag as in flight (`beginNativeDrag`) — this is the one chokepoint every
 * custom-avatar drag source funnels through, so the synchronous drag signal the avatar +
 * passthrough rely on is set the instant ANY source starts a drag (future sources get it for
 * free just by calling this). The signal self-clears on drop/dragend/blur/mousemove.
 */
export const suppressNativeDragImage = (dt: DataTransfer): void => {
  if (!EMPTY_DRAG_IMG) return;
  beginNativeDrag();
  try {
    dt.setDragImage(EMPTY_DRAG_IMG, 0, 0);
  } catch {
    /* setDragImage unsupported on some elements — fall back to the native image */
  }
};

/** Read a favourite from a drop event's dataTransfer, or null if none present. */
export const readFavientDrag = (dt: DataTransfer): FavientDragPayload | null => {
  const raw = dt.getData(FAVIENT_DND_MIME);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && p.config && Array.isArray(p.config.stops) && typeof p.name === 'string') return p as FavientDragPayload;
  } catch {
    /* malformed */
  }
  return null;
};
