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
 * `onOtherFiles` is the seam for a host that also accepts NON-image files on the same
 * drop (§8b item 4, 2026-09-09: GE v2 takes a dropped `.map` / `.ggr` / collection
 * `.json` as a gradient import). It is offered every dropped file the importer did not
 * take and returns whether it handled them — only if nobody did does the drop report
 * "not an image". One window listener, not two racing ones.
 *
 * A MIXED DROP does both (2026-09-13, parity checklist K7). The drop used to test only the
 * FIRST file: an image first returned before `onOtherFiles` ever ran, so the gradient files
 * after it were silently dropped — and a gradient file first hid an image after it. Now the
 * first IMAGE anywhere in the drop loads (there is one picture slot, so a second image is
 * not loaded), and every non-image file goes to `onOtherFiles`. Both can happen because
 * they land in different places — the picture in the Image face, the gradients on the
 * shelf — so neither has to win. For `ImageStage`, which passes no `onOtherFiles`, the one
 * visible change is that an image that is not first in a drop now loads instead of the
 * drop reporting "not an image".
 *
 * A PNG MAY BE A GRADIENT FILE (ADR-0123, 2026-09-14). The GMT gradient file is a PNG, and the
 * browser calls it `image/png` like any photo — so without a word from the host a dropped
 * gradient file was decoded as a picture and extracted from. `preRoute` is that word: offered
 * EVERY dropped file before anything else looks at them, it takes what it recognises (GE v2 hands
 * the gradient files, PNGs included, to the one gradient loader, which decides by content) and
 * resolves to the files it did NOT take — an ordinary PNG among them, which then goes on to
 * extraction exactly as before. Absent, nothing changes: `ImageStage`, app-gmt and the old shell
 * pass none. Paste is not routed (a pasted image is re-encoded by the browser and carries no
 * metadata).
 *
 * Guard: `npm run smoke:ge-gradientfile` [b] / [b2] (a stripped gradient PNG dropped imports; a plain
 * PNG still reaches extraction) — falsified by not passing `preRoute`.
 *
 * @see plans/ge-v2-design.md §5.4
 * @see docs/adr/0123-the-gradient-file-is-a-png.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Dropped files that were not an image (never empty when called). Return true if you
   *  consumed them (suppresses the "not an image" message). */
  onOtherFiles?: (files: File[]) => boolean;
  /** Sees every dropped file FIRST and resolves to the ones it did not take (see the header).
   *  An empty result means the drop was handled and nothing else is said. */
  preRoute?: (files: File[]) => Promise<File[]>;
}

export interface UseImageDropResult {
  /** True while a genuine OS file drag hovers the window (for a "drop image to load" overlay). */
  over: boolean;
  /** Wire to a `<input type="file">`'s onChange, or call directly with a dropped/pasted File. */
  fileToImg: (f: File | null | undefined) => boolean;
}

export const useImageDrop = (opts: UseImageDropOptions = {}): UseImageDropResult => {
  const { onLoaded, notify = (m: string) => showToast(m), enabled = true, onOtherFiles, preRoute } = opts;
  const setModel = useImageStore((s) => s.setModel);
  const setPath = useImageStore((s) => s.setPath);
  const setLoading = useImageStore((s) => s.setLoading);
  const mode = useImageMode();
  const [over, setOver] = useState(false);
  /**
   * The "file still over the window" timer: each dragover re-arms it, and 130 ms without one means
   * the drag left (or was cancelled). It lives in a REF, not in the listener effect, because that
   * effect re-subscribes whenever a host hands in a fresh callback — GE v2's root instance does on
   * every render (its `onLoaded` is inline) — and the first dragover's `setOver(true)` IS a render.
   * Held in the effect, the cleanup of that re-subscribe cancelled the timer, so a file that
   * crossed the window with a single dragover left `over` up until the next drag (found
   * 2026-09-23 when GE v2 started drawing it: the drop hint stuck). Only an unmount cancels it now.
   *
   * @invariant a file drag that stops sending dragover lets `over` go within the timeout however
   *   often the host re-renders, and a drop lets it go at once — proven by: `npm run
   *   smoke:ge-gradientfile` ("[h1] the drop hint stayed up after the file left", "[h1] … after the
   *   drop"). Falsified 2026-09-23 by clearing the timer in the listener effect's cleanup again.
   */
  const dragT = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(dragT.current), []);

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
    const isWellDrag = (e: DragEvent): boolean =>
      !e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files');
    const onDragOver = (e: DragEvent) => {
      if (isWellDrag(e)) return;
      e.preventDefault();
      setOver(true);
      window.clearTimeout(dragT.current);
      dragT.current = window.setTimeout(() => setOver(false), 130);
    };
    const onDrop = (e: DragEvent) => {
      if (isWellDrag(e)) return;
      e.preventDefault();
      setOver(false);
      window.clearTimeout(dragT.current);
      const dropped = Array.from(e.dataTransfer?.files ?? []);
      const take = (files: File[]) => {
        const image = files.find((f) => f.type.startsWith('image'));
        const others = files.filter((f) => !f.type.startsWith('image'));
        const tookImage = fileToImg(image);
        const tookOthers = others.length > 0 && !!onOtherFiles?.(others);
        if (!tookImage && !tookOthers) notify('not an image');
      };
      if (!preRoute) return take(dropped);
      preRoute(dropped).then(
        (rest) => { if (rest.length) take(rest); },
        () => take(dropped),
      );
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
    };
  }, [fileToImg, notify, enabled, onOtherFiles, preRoute]);

  return { over, fileToImg };
};

export default useImageDrop;
