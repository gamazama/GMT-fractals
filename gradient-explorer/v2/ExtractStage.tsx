/**
 * ExtractStage — the v2 IMAGE source (the tab reads "Image" since the owner S3 review
 * 2026-09-03; the file keeps its name) — plans/ge-v2-design.md §5.4.
 *
 * Reuses `ImageStage` in `chrome="bare"` (see that file's header) for everything it
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
 *   • the Dominant result's individual colours as a swatch row (evenly sampled off the
 *     produced ramp at the `colours` dial's count — the discrete cluster centres
 *     `img2grad/distill.ts` computes are resampled into the 256-ramp before `extract()`
 *     returns, and widening that pure boundary wasn't needed for this), click copies
 *     hex — same copy-toast pattern as `PaletteRow.tsx` (clipboard write + a toast).
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

import React, { useCallback, useMemo, useRef } from 'react';
import { ImageStage } from '../../palette/components/ImageStage';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { useImageStore, useImageDerived, useImageMode, useImageParam, useImageSlice } from '../../palette/store/imageStore';
import { useImageDrop } from '../../palette/components/useImageDrop';
import { autoPath } from '../../palette/core/img2grad';
import { samplePalette } from '../../palette/core/paletteSample';
import type { RGB } from '../../palette/core/oklab';
import { showToast } from '../../engine/store/toastStore';

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

const hexOf = (c: RGB): string =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

export const ExtractStage: React.FC = () => {
  const model = useImageStore((s) => s.model);
  const setPath = useImageStore((s) => s.setPath);
  const mode = useImageMode();
  const [modeIdx, setModeIdx] = useImageParam<number>('mode');
  const slice = useImageSlice();
  const derived = useImageDerived();
  // A second useImageDrop instance: the root-mounted one (GradientExplorerV2App) keeps
  // the window listeners live everywhere; this one wires a local "Replace image"
  // trigger the same way ImageStage's own (hidden in chrome="bare") one does.
  const { fileToImg } = useImageDrop();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const dominant = useMemo(
    () => (mode === 'distill' && derived ? samplePalette(derived.ramp, 'even', slice.colours) : null),
    [mode, derived, slice.colours],
  );

  const copyHex = (hex: string) => {
    try {
      void navigator.clipboard?.writeText(hex);
    } catch {
      /* the toast still shows the value */
    }
    showToast(`copied ${hex}`);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {model && (
        <div className="shrink-0 flex items-center gap-2 px-6 pt-1 pb-2.5">
          <div className="flex gap-1 rounded-[10px] border border-line/20 p-0.5">
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto text-[11px] text-fg-muted hover:text-fg-secondary px-2 py-1 rounded-sm bg-line/[0.04]"
          >
            Replace image
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-h-0 min-w-0">
          <ImageStage chrome="bare" />
        </div>
        {model && (
          <div className="w-[280px] shrink-0 overflow-y-auto border-l border-line/10 px-4 py-3 flex flex-col gap-3">
            <AutoFeaturePanel featureId="paletteImage" whitelistParams={DIAL_PARAMS} />
            {dominant && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-fg-dim mb-1.5">Dominant colours · click to copy</div>
                <div className="flex flex-wrap gap-1.5">
                  {dominant.map((sw, i) => {
                    const hex = hexOf(sw.color);
                    return (
                      <button
                        key={i}
                        onClick={() => copyHex(hex)}
                        title={`${hex} · click to copy`}
                        className="w-7 h-7 rounded-md border border-black/40 hover:outline hover:outline-2 hover:outline-white transition"
                        style={{ background: hex }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          fileToImg(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default ExtractStage;
