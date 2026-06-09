/**
 * image ⇄ scene document bridge — the Image mode's consumer of the engine
 * document-provider registry (store/documentRegistry.ts, W8). Parallel to
 * favientsDocument.ts.
 *
 * The Image mode's scalar/bool dials (mode, colours, saliency, …) live in the
 * `paletteImage` DDFS feature slice, which `getPreset()` already serialises — so they
 * round-trip for free. This provider carries the non-DDFS state: the SOURCE IMAGE and the
 * trace path. The heavy ImageModel (a w·h·3 Float32 buffer) is NOT serialised; instead we
 * store the display thumbnail as a compact data URL and RE-INGEST it on load via the same
 * decodeAndIngest the stage's loader uses — so a saved scene reopens with its image,
 * trace, and (DDFS) settings intact, at a fraction of the bytes a raw model would cost.
 *
 * serialize → { src: thumb-as-JPEG-data-URL | null, path, exportFmt }.
 * restore   → if `src` present, re-decode + ingest (async, after the scene loads), then
 *   apply the saved trace path + export format. A garbage / image-less snapshot is a
 *   silent no-op (current state untouched).
 *
 * @see palette/store/imageStore.ts (the store it restores into)
 * @see palette/core/img2grad/decode.ts (the shared decode→ingest helper)
 * @see store/documentRegistry.ts (the engine registry it plugs into)
 */

import type { JsonValue } from '../../types';
import { useImageStore } from './imageStore';
import { decodeAndIngest } from '../core/img2grad';
import type { TracePath, Pt } from '../core/img2grad/common';
import { num, str, isPlainObject } from './coerceJson';

// Cache the encoded data URL by thumbnail identity. serialize runs on every save —
// including each autosave tick — but the thumbnail canvas only changes when a new image
// loads, so re-encoding the same ≤1920px JPEG every tick is pure waste. Keyed on the
// canvas reference: a new image → new canvas → cache miss → re-encode once.
let _srcCache: { thumb: HTMLCanvasElement; src: string | null } | null = null;

/** Re-encode the display thumbnail as a compact JPEG data URL (the round-trip source).
 *  JPEG @0.85 keeps scene files reasonable; the ingest downsamples to ≤160px anyway, so
 *  the extraction is visually identical to the original. Cached per thumb canvas. */
const thumbToSrc = (thumb: HTMLCanvasElement | null): string | null => {
  if (!thumb || thumb.width === 0 || thumb.height === 0) return null;
  if (_srcCache && _srcCache.thumb === thumb) return _srcCache.src;
  let src: string | null;
  try {
    src = thumb.toDataURL('image/jpeg', 0.85);
  } catch {
    src = null; // tainted canvas (shouldn't happen for same-origin data) → skip
  }
  _srcCache = { thumb, src };
  return src;
};

export const serializeImageDocument = (): JsonValue => {
  const s = useImageStore.getState();
  return {
    src: thumbToSrc(s.thumb),
    path: s.path as unknown as JsonValue,
    exportFmt: s.exportFmt,
  };
};

/** Coerce an untrusted path snapshot into a valid TracePath (finite handles + optional
 *  finite freehand points). Defaults to a centred straight line. */
const sanitizePath = (p: unknown): TracePath => {
  const o = isPlainObject(p) ? p : {};
  const path: TracePath = {
    x0: num(o.x0, 0.12),
    y0: num(o.y0, 0.5),
    x1: num(o.x1, 0.88),
    y1: num(o.y1, 0.5),
  };
  if (Array.isArray(o.points)) {
    const pts: Pt[] = o.points
      .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object')
      .map((q) => ({ x: num(q.x, 0), y: num(q.y, 0) }));
    if (pts.length >= 2) path.points = pts;
  }
  return path;
};

// Monotonic token: every restore call invalidates any earlier in-flight decode, so loading
// scene B while scene A's image is still decoding can't let A's slow decode land on B
// (the async resolve checks it's still the current restore before touching the store).
let _restoreToken = 0;

/**
 * Restore the Image mode from a scene snapshot. Async (image decode runs after loadPreset
 * returns, like favients' dialog) and fail-safe: a decode failure leaves the stage empty
 * rather than throwing through the document registry. The Image is the scene's OWN state
 * (not a shared library), so a scene saved without an image clears any leftover image from
 * the previously-loaded scene — no cross-scene bleed.
 */
export const restoreImageDocument = (snap: JsonValue): void => {
  const token = ++_restoreToken; // supersede any in-flight decode from a prior scene load
  if (!isPlainObject(snap)) return;
  const src = str(snap.src);
  const store = useImageStore.getState();

  if (!src) {
    store.reset(); // scene carries no image → don't leave the last scene's image showing
    return;
  }
  const path = sanitizePath(snap.path);
  const exportFmt = str(snap.exportFmt);
  store.setLoading(true);
  decodeAndIngest(src)
    .then(({ model, thumb }) => {
      if (token !== _restoreToken) return; // a newer scene load superseded this one
      const st = useImageStore.getState();
      st.setModel(model, thumb); // clears loading
      st.setPath(path);
      if (exportFmt) st.setExportFmt(exportFmt);
    })
    .catch((err) => {
      if (token !== _restoreToken) return;
      useImageStore.getState().setLoading(false);
      console.warn('[imageDocument] restore decode failed', err);
    });
};
