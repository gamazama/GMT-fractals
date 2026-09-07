/**
 * ExtractStage — the v2 IMAGE source (the tab reads "Image" since the owner S3 review
 * 2026-09-03; the file keeps its name) — plans/ge-v2-design.md §5.4.
 *
 * Reuses `ImageStage` in `chrome="face"` (2026-09-07, C.6 — the preview as the working
 * surface, the tools on it, the cloud beside it; before that `"bare"`) for everything it
 * already does well — drop/paste/click to load, the rotatable OKLab colour cloud, the
 * image pane with the Path (Trace) handles and its Draw/Auto/Straight toolbar, the
 * decode/ingest path — and supplies v2-only chrome around it:
 *
 *   • method chips **Dominant · Tones · Path** (bound to the SAME `paletteImage.mode`
 *     DDFS param ImageStage's own — hidden — mode tabs use; ids unchanged, v2 words
 *     only in the label);
 *   • the active method's dials, `AutoFeaturePanel featureId="paletteImage"` — the
 *     June `dynamicVisible` per-mode gating (isDistill / isTone / mode===2 / notTrace)
 *     is untouched and keeps working, since only the chip labels are new;
 *   • (the Dominant swatch row is gone, 2026-09-07 — the hero's palette row is that, live.)
 *
 * NO hero (the Working hero above shows the result live — "live from Image", §2), NO
 * export block (ImageStage never rendered one itself — the old shell's export block is
 * the `palette-image-extras` customUI entry, mounted only through the Dock tab, which
 * v2 doesn't mount; excluded here too via `whitelistParams`).
 *
 * Image drop anywhere: `GradientExplorerV2App` mounts `useImageDrop` once at the shell
 * root (`palette/components/useImageDrop.ts`, lifted out of ImageStage) so a drop while
 * on Browse or Build still loads the image and switches here.
 *
 * @see plans/ge-v2-design.md §5.4
 */

import React, { useCallback } from 'react';
import { ImageStage } from '../../palette/components/ImageStage';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { useImageStore, useImageParam } from '../../palette/store/imageStore';
import { autoPath } from '../../palette/core/img2grad';

const METHODS: { id: number; label: string; title: string }[] = [
  { id: 0, label: 'Dominant', title: 'Saliency-weighted dominant colours, ordered into a smooth ramp.' },
  { id: 1, label: 'Tones', title: "The image's own colour at each brightness level. Unfakeably smooth." },
  { id: 2, label: 'Path', title: 'The colour journey along a line — drag the handles on the image.' },
];

// Only the per-method DIALS — `mode` itself is the chips above (not a second dropdown),
// and there's no export block (the old shell's is a Dock-only customUI entry). A
// non-empty whitelist also suppresses that customUI entry (AutoFeaturePanel skips all
// customUI when whitelisting params) — see the file header.
const DIAL_PARAMS = ['colours', 'saliency', 'tonalDetail', 'chromaBoost', 'bandWidth', 'smoothing', 'catmullRom', 'goldenHour', 'spacing', 'reverse'];

export const ExtractStage: React.FC = () => {
  const model = useImageStore((s) => s.model);
  const setPath = useImageStore((s) => s.setPath);
  const [modeIdx, setModeIdx] = useImageParam<number>('mode');

  // Mirrors ImageStage's own (hidden) switchMode: entering Path auto-positions the
  // handles from the image, same as the old shell's mode tabs. `drawing` (the freehand-
  // stroke toggle) is ImageStage's own local state — out of reach here, and resets on
  // its own the moment a drag starts, so skipping it on a chip click is harmless.
  const switchMethod = useCallback(
    (idx: number) => {
      setModeIdx(idx);
      if (idx === 2 && model) setPath(autoPath(model));
    },
    [setModeIdx, model, setPath],
  );

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* the picture — the working surface, the cloud beside it (ImageStage 'face' chrome) */}
      <ImageStage chrome="face" />
      {/* under the picture: the method, and the method's dials */}
      {model && (
        <div className="flex items-start gap-6">
          <div className="flex gap-1 rounded-[10px] border border-line/20 p-0.5 shrink-0">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => modeIdx !== m.id && switchMethod(m.id)}
                title={m.title}
                aria-pressed={modeIdx === m.id}
                className={`px-3.5 h-7 rounded-lg text-[13px] transition-colors ${
                  modeIdx === m.id ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <AutoFeaturePanel featureId="paletteImage" whitelistParams={DIAL_PARAMS} hints="tooltip" keyframes={false} className="grid grid-cols-2 gap-x-6" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractStage;
