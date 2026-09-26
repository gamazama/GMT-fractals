/**
 * AdjustFace — the Adjust face's three bins of dials and its Cancel / Apply, shared by the
 * Gradient Explorer's tray (`gradient-explorer/v2/Tray.tsx`) and GMT's Gradient Studio
 * (`palette/components/GradientStudioPanel.tsx`). Moved here from the Explorer's Tray on
 * 2026-09-26, verbatim but for one seam: APPLY is the host's (`onApply`), because what a bake
 * folds into differs — the Explorer's working stops document, the Studio's DDFS param. Cancel and
 * Reseed act on the dials, which both hosts share (the `paletteGenerator` DDFS slice).
 *
 * The block below is the face's own record, written in the Explorer; "the shell" there is the
 * Explorer shell, whose Apply is `beginEdit`.
 */

import React, { useCallback, useRef, useState } from 'react';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';
import { useGeneratorStore } from '../../store/generatorStore';
import { useEngineStore } from '../../../store/engineStore';
import { isIdentityAdjust } from '../../core/workingPipeline';
import type { GeneratorParams } from '../../core/generatorPipeline';
import { Act } from '../../../components/ui/Act';

/** The narrowest a bin may be before the face gives it a row of its own. MEASURED, not picked:
 *  the noise bin's Targets row is the widest thing any bin holds — "Targets" + the three chips
 *  is 250 px — plus the bin's 28 px of padding. At the old three-across layout a 767–800 px
 *  window gave each bin ~204 px and that row ran past its bin (measured 2026-09-13 at 800:
 *  the "hue" chip at x 716..760 in a bin ending at 759). */
const ADJUST_BIN_MIN = 280;
/** The gap between bins (`gap-3`) — part of the "do three fit" sum. */
const ADJUST_GAP = 12;

/**
 * THE ADJUST FACE — three bins of dials, and Cancel / Apply (owner, 2026-09-07; reworked
 * 2026-09-13). Modify/Noise carry `dynamicVisible: isMixed` (a Generator-era assumption);
 * Adjust belongs to WORKING, so `ignoreDynamicVisible` skips that gate for this mount only —
 * the shared param definition (also read by GeneratorStage / app-gmt) is untouched.
 * @see plans/ge-v2-design.md §12 item 4
 *
 *   • TONE — Hue rotate · Chroma × · Contrast · Lightness (an additive OkLab L offset,
 *     grep LIGHTNESS in palette/core/generatorPipeline.ts).
 *   • TILING — Posterize · Scale (the `repeats` key, continuous since 2026-09-13) with its
 *     mirror tiles / reverse toggles under it (the owner: mirror is a tiling control, so it sits
 *     next to Scale — the feature nests `palette-modify-toggles` under `repeats`) · Phase.
 *   • NOISE — Strength · Frequency · Targets, and a text RESEED at the bin's foot.
 *
 * ROWS, NOT SQUEEZE. The bins flow into as many columns as their content fits: three across
 * when the face has 3 × ADJUST_BIN_MIN, else two with the noise bin taking the full second
 * row, and one column on a phone. Measured from the face's own box (a ResizeObserver), because
 * the tray's width follows the panel's left edge, not the viewport.
 *
 * CANCEL / APPLY, NOT "RESET ALL" (owner, 2026-09-13: "this is the old paradigm which was
 * parametric — our current paradigm is destructive (with undo), so every application bakes a
 * new state and starts from fresh").
 *   • APPLY bakes the adjusted gradient into the working stops and resets the dials — the SAME
 *     bake a face-leave does (`beginEdit`, grep it in the shell's `openTray`), under the same
 *     guard, and it is one undo step because `beginEdit` brackets itself. The face stays open,
 *     so the next adjustment starts from the result. The noise is baked as it looks (the seed
 *     is in the derive). Frequency and Targets are left where they are, exactly as every other
 *     bake leaves them (MAIN_DEFAULTS): at Strength 0 they draw nothing, and a second reset
 *     could not share the bake's undo step (param brackets do not nest — the inner one pushes
 *     and clears the outer snapshot).
 *   • CANCEL discards the dials (`resetAdjust` — all three bins, Frequency and Targets
 *     included), one undo step, the stops untouched.
 *   • Both are unavailable while the dials draw nothing (`isIdentityAdjust`).
 * Closing the face from its tab still bakes, as every face does — so Apply is "bake and keep
 * going", and a tab close is "bake and leave". Esc is this Cancel (owner, 2026-09-24; grep
 * `escapeFace` in the shell).
 */
export interface AdjustFaceProps {
  phone?: boolean;
  /** APPLY: the host bakes the adjusted gradient and resets the dials (see the header). Only
   *  called while the dials change something (`isIdentityAdjust` is false). */
  onApply: () => void;
}

export const AdjustFace: React.FC<AdjustFaceProps> = ({ phone = false, onApply }) => {
  const bin = 'min-w-0 rounded-[10px] bg-surface-viewport px-3.5 py-3';
  const reseedNoise = useGeneratorStore((s) => s.reseedNoise);
  const resetAdjust = useGeneratorStore((s) => s.resetAdjust);
  // Reseeding draws the same grain again from a new seed, so at Strength 0 it changes nothing
  // you can see — the button says so by being unavailable rather than by doing nothing.
  const noiseOn = useEngineStore((s) => ((s as unknown as { paletteGenerator?: { noise?: number } }).paletteGenerator?.noise ?? 0) > 0);
  // Whether the dials change the picture at all — the one condition both actions share. A
  // boolean selector, so a slider drag re-renders this only when it flips.
  const live = useEngineStore((s) => {
    const g = (s as unknown as { paletteGenerator?: GeneratorParams }).paletteGenerator;
    return !!g && !isIdentityAdjust(g);
  });
  const [cols, setCols] = useState(phone ? 1 : 3);
  const roRef = useRef<ResizeObserver | null>(null);
  const measured = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const fit = (w: number) => setCols(phone ? 1 : w >= 3 * ADJUST_BIN_MIN + 2 * ADJUST_GAP ? 3 : w >= 2 * ADJUST_BIN_MIN + ADJUST_GAP ? 2 : 1);
    fit(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => fit(entries[0].contentRect.width));
    ro.observe(el);
    roRef.current = ro;
  }, [phone]);
  return (
    <div className="flex flex-col px-4 py-3 gap-3" data-gx-adjust data-gx-adjust-cols={cols}>
      <div ref={measured} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        <div className={bin} data-gx-adjust-bin="tone">
          <AutoFeaturePanel featureId="paletteGenerator" whitelistParams={['hueRotate', 'chroma', 'contrast', 'lightness']} hints="tooltip" keyframes={false} ignoreDynamicVisible />
        </div>
        <div className={bin} data-gx-adjust-bin="tiling">
          <AutoFeaturePanel featureId="paletteGenerator" whitelistParams={['bands', 'repeats', 'phase']} hints="tooltip" keyframes={false} ignoreDynamicVisible />
        </div>
        {/* two columns: the noise bin takes the whole second row rather than leaving a hole */}
        <div className={`${bin} flex flex-col`} style={cols === 2 ? { gridColumn: '1 / -1' } : undefined} data-gx-adjust-bin="noise">
          <AutoFeaturePanel
            featureId="paletteGenerator"
            groupFilter="Noise"
            labelOverrides={{ noise: 'Noise: Strength', noiseFreq: 'Noise: Frequency' }}
            hints="tooltip"
            keyframes={false}
            ignoreDynamicVisible
          />
          <div className="mt-auto pt-2 flex justify-end">
            <Act
              onClick={reseedNoise}
              disabled={!noiseOn}
              title={noiseOn ? 'The same grain, a new draw' : 'Turn Noise: Strength up first'}
              data-gx-adjust-reseed=""
            >
              Reseed
            </Act>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Act onClick={resetAdjust} disabled={!live} title="Put the dials back — the gradient stays as it is" data-gx-adjust-cancel="">
          Cancel
        </Act>
        <Act primary onClick={onApply} disabled={!live} title="Make this the gradient and start the dials again (undo brings them back)" data-gx-adjust-apply="">
          Apply
        </Act>
      </div>
    </div>
  );
};
