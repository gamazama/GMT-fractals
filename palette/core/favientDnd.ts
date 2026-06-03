/**
 * favientDnd — the drag-and-drop payload contract for dragging a favourite gradient
 * out of the Favients panel onto an apply target (e.g. a generator source slot).
 * Shared by the drag source (FavientsPanel) and any drop target.
 */

import type { GradientConfig } from '../../types';

export const FAVIENT_DND_MIME = 'application/x-gmt-favient';

export interface FavientDragPayload {
  config: GradientConfig;
  name: string;
}

/** Write a favourite onto a drag event's dataTransfer (custom MIME + text fallback). */
export const setFavientDrag = (dt: DataTransfer, payload: FavientDragPayload): void => {
  const json = JSON.stringify(payload);
  try {
    dt.setData(FAVIENT_DND_MIME, json);
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
