/**
 * workingPaintSink — where the Paint face's Apply lands in the Explorer: the WORKING gradient, as a
 * ramp (ADR-0129). The face and its store moved to `palette/` on 2026-09-26 so GMT's Gradient
 * Studio can host them; this is the half that stayed, because it is the Explorer's working model.
 * Registered at module scope by the shell (grep `installWorkingPaintSink` in GradientExplorerV2App).
 *
 * The body is `commitPaint`'s, verbatim from before the move — it runs inside that function's
 * `paramGroup`, which is what makes an Apply one undo entry.
 *
 * @see palette/store/paintStore.ts (`setPaintSink`, `commitPaint`)
 */

import { makeRampGradient } from '../../../utils/gradientRamp';
import { setPaintSink } from '../../../palette/store/paintStore';
import { useWorkingStore, deriveWorkingNow } from '../../../palette/store/workingStore';
import { usePaletteEditorStore } from '../../../palette/store/paletteEditorStore';

export const installWorkingPaintSink = (): void =>
  setPaintSink({
    write: (ramp) => {
      const w = useWorkingStore.getState();
      const d = deriveWorkingNow();
      // the same fold a stop edit makes first (the hero's `ensureEditing`), so the chip then offers
      // "return to source" and Ctrl+Z walks back through it in the same entry
      if (w.input.kind !== 'stops' || (d && !d.passthrough)) w.beginEdit();
      const doc = usePaletteEditorStore.getState().config;
      usePaletteEditorStore.getState().setConfig(makeRampGradient(ramp, doc.colorSpace, doc.blendSpace));
    },
  });
