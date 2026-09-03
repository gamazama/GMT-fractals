/**
 * useImageDrop — the whole-window image drop / paste / file-pick importer, LIFTED out
 * of `ImageStage.tsx` (2026-09-03, GE v2 S3) so an image dropped ANYWHERE in the v2
 * shell routes to Extract (plans/ge-v2-design.md §5.4 "image drop anywhere").
 * `ImageStage` keeps calling this hook — its own behaviour (a drop only while
 * ImageStage itself is mounted) is UNCHANGED, so the old shell and app-gmt's Image tab
 * work exactly as before. `GradientExplorerV2App` mounts a SECOND instance once at the
 * shell root so the listeners stay live no matter which source tab is open; while
 * Extract is the active v2 tab both instances are mounted and both react to one drop —
 * harmless (idempotent `setModel`, the root's `onLoaded` no-ops via `switchSource`'s own
 * same-tab guard) but a known duplicate-decode overlap, not a correctness bug.
 *
 * Coexistence with in-app drags: a gradient-swatch / favient drag carries a custom MIME
 * and belongs to a send target (DropTargetLayer in the old shell), not the image
 * importer — it never carries 'Files', so a drag without that type is stood down for.
 *
 * `notify` defaults to the global toast (`engine/store/toastStore`) — the root-level v2
 * mount has nowhere else to put a message. `ImageStage` passes its own local
 * bottom-of-canvas flash so its message keeps its existing spot (unchanged behaviour).
 * `onLoaded` fires after a successful decode + ingest — the v2 shell uses it to switch
 * the active source tab to Extract.
 *
 * @see plans/ge-v2-design.md §5.4
 */

import { useCallback, useEffect, useState } from 'react';
import { useImageStore, useImageMode } from '../store/imageStore';
import { decodeAndIngest, autoPath } from '../core/img2grad';
import { showToast } from '../../engine/store/toastStore';

export interface UseImageDropOptions {
  /** Attach the window drag/drop/paste listeners (default true). A host that already mounts
   *  the hook at its root passes false from the stage so one drop decodes ONCE. */
  enabled?: boolean;
  /** Fires after a drop / paste / file-pick successfully decodes and ingests an image. */
  onLoaded?: () => void;
  /** Message sink — defaults to the global toast. */
  notify?: (message: string) => void;
}

export interface UseImageDropResult {
  /** True while a genuine OS file drag hovers the window (for a "drop image to load" overlay). */
  over: boolean;
  /** Wire to a `<input type="file">`'s onChange, or call directly with a dropped/pasted File. */
  fileToImg: (f: File | null | undefined) => boolean;
}

export const useImageDrop = (opts: UseImageDropOptions = {}): UseImageDropResult => {
  const { onLoaded, notify = (m: string) => showToast(m), enabled = true } = opts;
  const setModel = useImageStore((s) => s.setModel);
  const setPath = useImageStore((s) => s.setPath);
  const setLoading = useImageStore((s) => s.setLoading);
  const mode = useImageMode();
  const [over, setOver] = useState(false);

  const loadImage = useCallback(
    (src: string) => {
      setLoading(true);
      decodeAndIngest(src)
        .then(({ model, thumb }) => {
          setModel(model, thumb);
          if (mode === 'trace') setPath(autoPath(model));
          onLoaded?.();
        })
        .catch(() => {
          setLoading(false);
          notify('could not load image');
        });
    },
    [mode, setModel, setPath, setLoading, onLoaded, notify],
  );

  const fileToImg = useCallback(
    (f: File | null | undefined): boolean => {
      if (f && f.type.startsWith('image')) {
        const r = new FileReader();
        r.onload = () => loadImage(r.result as string);
        r.readAsDataURL(f);
        return true;
      }
      return false;
    },
    [loadImage],
  );

  useEffect(() => {
    if (!enabled) return;
    let dragT: number | undefined;
    const isWellDrag = (e: DragEvent): boolean =>
      !e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files');
    const onDragOver = (e: DragEvent) => {
      if (isWellDrag(e)) return;
      e.preventDefault();
      setOver(true);
      window.clearTimeout(dragT);
      dragT = window.setTimeout(() => setOver(false), 130);
    };
    const onDrop = (e: DragEvent) => {
      if (isWellDrag(e)) return;
      e.preventDefault();
      setOver(false);
      window.clearTimeout(dragT);
      if (!fileToImg(e.dataTransfer?.files[0])) notify('not an image');
    };
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) for (const it of items) if (it.type.startsWith('image')) { fileToImg(it.getAsFile()); return; }
      notify('no image in clipboard');
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
      window.clearTimeout(dragT);
    };
  }, [fileToImg, notify, enabled]);

  return { over, fileToImg };
};

export default useImageDrop;
