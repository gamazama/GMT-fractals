import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useFlash — transient one-line toast message for the palette panels.
 *
 * Returns `{ toast, flash }`:
 *  • `toast` — the current message string, or `null` (render your own pill when set).
 *  • `flash(message)` — show `message`, then auto-clear after `durationMs`.
 *
 * Folds the identical `useState<string | null>(null)` + `setTimeout(() => setToast(null))`
 * shape that was duplicated across FavientsPanel, GeneratorExtrasPanel, ImageExtrasPanel,
 * and ImageStage. The render markup (positioning / sizing) legitimately varies per panel,
 * so it stays the caller's — this hook only owns the message lifecycle. `flash` is a stable
 * callback (safe to pass to children), and a pending timeout is cancelled on re-flash/unmount.
 *
 * Palette-local (palette/ must not import app/engine code); mirrors engine-core's useClipboardCopy.
 */
export function useFlash(durationMs = 1400) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => {
      setToast(null);
      timer.current = null;
    }, durationMs);
  }, [durationMs]);

  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);

  return { toast, flash };
}
