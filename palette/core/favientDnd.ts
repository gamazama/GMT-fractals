/**
 * favientDnd — the drag-and-drop payload contract for dragging a favourite gradient
 * out of the Favients panel onto an apply target (e.g. a generator source slot).
 * Shared by the drag source (FavientsPanel) and any drop target.
 */

import type { GradientConfig } from '../../types';

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
