/**
 * ExtractStage — the v2 IMAGE source (the tab reads "Image" since the owner S3 review
 * 2026-09-03; the file keeps its name) — plans/ge-v2-design.md §5.4.
 *
 * The tray's Image face (2026-09-07, C.6 second take): the PICTURE is the hero's slot
 * (`ImageSlot` hosts `ImageStage chrome="face"`); this face holds what goes with it — the
 * method chips, the Path tools (portalled in from the picture) and the method's dials on the
 * left, the colour cloud (also portalled in) on the right. Reuses ImageStage for everything
 * it already does well — drop/paste/click to load, the rotatable OKLab colour cloud, the
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
 * PHONE (Phase F, 2026-09-10). The two fixed columns — 560 for the methods and their
 * dials, 280 for the colour cloud — need 888 px, so on a phone the face becomes ONE
 * COLUMN, each block at the tray's full width, and it gains a third block at the top:
 * `slot`, the PICTURE itself. On a wide card the picture is the hero's own image column
 * and this face is what goes with it; on a phone the card has no column, so the picture
 * comes here and the hero keeps only a 26 px door to it (`ImageSlot compact`). Order down
 * the column is picture · method + tools · dials · cloud — the thing you point at, then
 * what you point at it with.
 *
 * @see plans/ge-v2-design.md §5.4
 * @see docs/adr/0115-the-shell-on-a-phone.md
 */

import React, { useCallback } from 'react';
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

export const ExtractStage: React.FC<{
  cloudHostRef: (el: HTMLDivElement | null) => void;
  toolsHostRef: (el: HTMLDivElement | null) => void;
  /** PHONE: the picture, rendered above the methods (the hero has no image column there). */
  slot?: React.ReactNode;
  phone?: boolean;
}> = ({ cloudHostRef, toolsHostRef, slot, phone = false }) => {
  const model = useImageStore((s) => s.model);
  const setPath = useImageStore((s) => s.setPath);
  const [modeIdx, setModeIdx] = useImageParam<number>('mode');

  // Mirrors ImageStage's own switchMode: entering Path auto-positions the handles from the
  // image, same as the old shell's mode tabs.
  const switchMethod = useCallback(
    (idx: number) => {
      setModeIdx(idx);
      if (idx === 2 && model) setPath(autoPath(model));
    },
    [setModeIdx, model, setPath],
  );

  return (
    <div className={`flex gap-4 px-4 py-3 ${phone ? 'flex-col' : 'items-stretch'}`}>
      {/* PHONE only: the picture leads, because it is what the methods below act on */}
      {slot}
      {/* left, under the picture: the method, its tools, its dials */}
      <div className={`${phone ? 'w-full' : 'w-[560px] shrink-0'} flex flex-col gap-3`}>
        <div className="flex items-center gap-4 flex-wrap">
          {/* the same segmented control as the palette's Even · Perceptual · Stops (owner) */}
          <div className="inline-flex border border-line/20 rounded-lg overflow-hidden shrink-0">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => modeIdx !== m.id && switchMethod(m.id)}
                title={m.title}
                aria-pressed={modeIdx === m.id}
                className={`px-2 h-7 text-[13px] ${modeIdx === m.id ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {/* the Path tools portal in here (Draw · Auto · Straight) when Path is the method */}
          <div ref={toolsHostRef} className="flex items-center" />
        </div>
        {/* one column (owner, 2026-09-07: compact — the tray's height is this column and the cloud) */}
        <AutoFeaturePanel featureId="paletteImage" whitelistParams={DIAL_PARAMS} hints="tooltip" keyframes={false} />
      </div>
      {/* beside the dials: the colour cloud (portalled in by the picture) — the tray is as
          wide as the dials and this, no further (owner, 2026-09-07) */}
      {/* PHONE: no colour cloud (owner, 2026-09-11: "doesn't need the 3D gamut display on
          mobile"). With no host the picture never portals it and never allocates its HiDPI
          canvas (grep `cloudHost` in ImageStage) — the face is picture, method, dials. */}
      {!phone && (
        <div ref={cloudHostRef} className="w-[280px] self-stretch shrink-0 min-h-[220px] rounded-[10px] bg-surface-viewport overflow-hidden" />
      )}
    </div>
  );
};

export default ExtractStage;
