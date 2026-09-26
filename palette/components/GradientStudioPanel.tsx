/**
 * GradientStudioPanel — GMT's Gradient Studio window, in the Gradient Explorer's own shape (owner,
 * 2026-09-26: "much closer to the original gradient explorer … the gradient should be larger, and
 * the shelves should use the dropdown tray and gradient explorer sliders"). What the Studio does
 * (preview, bake, cancel) is `palette/store/gradientStudio.ts`; this file is its chrome and the React
 * half of the preview. It is built from the Explorer's pieces, not lookalikes:
 *
 *   • THE CARD — the hero: the gradient's name, then the shared editor in STRIP chrome (a larger bar
 *     than the hero's, the knots, and the control row), with the face tabs (`faces/FaceTabs`, the
 *     hero's own) as its `stripAside`. With no face open the card IS the stops editor.
 *   • THE TRAY — hangs from the card, one face at a time, in the 'soft' input skin: Curves, Adjust
 *     (Apply is `bakeStudio`), Paint, or the stop inspector, which the editor portals in when a stop
 *     is selected. Paint also holds the bar itself (`stripTakeover`), as in the Explorer.
 *   • While Curves / Adjust are live the bar paints their result (`previewRamp`).
 *
 * THE PREVIEW is sent from here, not from the store: while a face has a result the fractal is sent
 * that result's texture (`previewGradient`), and when there is none — or the window unmounts, or
 * it moves to another gradient — the stored gradient is sent back. So a closed (or docked-away)
 * Studio never leaves a preview on the fractal. Committing a face on close is NOT done here — a
 * docked panel unmounts when another tab is picked, which is not a close (`mountGradientStudio`).
 *
 * Esc cancels the open face (`cancelStudioFace`) through a shortcut SCOPE pushed only while a face
 * other than Stops is open — the Paint face's pattern (a scope, not a `when`: grep `resolve` in
 * engine/plugins/Shortcuts.ts for why a `when`-gated key swallows the app's own).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { getSendTargets, subscribeSendTargets } from '../../store/sendTargetRegistry';
import { useShortcut, useShortcutScope } from '../../engine/plugins/Shortcuts';
import AdvancedGradientEditor from '../../components/AdvancedGradientEditor';
import { makeRampGradient } from '../../utils/gradientRamp';
import { rgbToHex } from '../../utils/colorUtils';
import type { GradientConfig, GradientStop } from '../../types';
import { useAdjustParams, useSampledCurves, useGeneratorStore } from '../store/generatorStore';
import { usePaintStore, syncPaintBase, endPaintSession } from '../store/paintStore';
import {
  useGradientStudio,
  STUDIO_FACES,
  setStudioFace,
  cancelStudioFace,
  bakeStudio,
  deriveStudio,
  displayRampOf,
  previewGradient,
  targetLabel,
  toStudioConfig,
  writeTarget,
  type StudioFace,
} from '../store/gradientStudio';
import { InputSkinProvider } from '../../components/inputs';
import { useFloatingPanelChrome } from '../../components/ui/FloatingPanel';
import { Icon } from '../../components/ui/Icon';
import { FaceTabs, type FaceTab } from './faces/FaceTabs';
import { CurvesFace } from './faces/CurvesFace';
import { AdjustFace } from './faces/AdjustFace';
import { PaintFace } from './paint/PaintFace';
import { PaintSurface, PaintBeforeLine } from './paint/PaintSurface';

/** The bar's height — larger than the Explorer hero's 60 (owner, 2026-09-26: "the gradient should
 *  be larger"); a floating window has the room. */
const BAR_H = 72;
/** How far the tray's top tucks up under the card — the Explorer tray's TUCK_PX, so the open tab's
 *  9 px tongue lands on it. */
const TUCK_PX = 11;
/** The face tabs — Stops is no tab: it is the card itself, with no face open (the Explorer's shape). */
const TABS = STUDIO_FACES.filter((f) => f.face !== 'stops') as FaceTab<StudioFace>[];
/** Paint holds the bar and the knot track while it is open (the editor's `stripTakeover`). */
const PAINT_TAKEOVER = { bar: <PaintSurface />, track: <PaintBeforeLine /> };
/** How many colours the Paint picker offers from a ramp gradient (a stop gradient offers its stops). */
const RAMP_SWATCHES = 8;

const onEscape = (): void => cancelStudioFace();

export const GradientStudioPanel: React.FC = () => {
  const target = useGradientStudio((s) => s.target);
  const face = useGradientStudio((s) => s.face);

  // Opened with no gradient chosen (from the dock, a layout restore): the first send target that
  // edits a param — a host lists its main gradient first.
  useEffect(() => {
    if (target) return;
    const first = getSendTargets().find((t) => t.editsParam);
    if (first?.editsParam) useGradientStudio.setState({ target: { ...first.editsParam } });
  }, [target]);

  const raw = useEngineStore((s) =>
    target ? ((s as unknown as Record<string, Record<string, unknown> | undefined>)[target.featureId]?.[target.paramKey] as GradientStop[] | GradientConfig | undefined) : undefined,
  );
  const src = useMemo(() => toStudioConfig(raw), [raw]);
  const sendTargets = useSyncExternalStore(subscribeSendTargets, getSendTargets);
  const label = target ? targetLabel(target, sendTargets) : '';

  // ── CURVES / ADJUST: the live result over the param ─────────────────────────────────────────
  const params = useAdjustParams();
  const curves = useSampledCurves();
  // read by the derive through the store; listed so it re-runs when they move
  const noiseSeed = useGeneratorStore((s) => s.noiseSeed);
  const detail = useGeneratorStore((s) => s.detail);
  const tracksEdited = useGeneratorStore((s) => s.tracksEdited);
  const shaping = face === 'curves' || face === 'adjust';
  const derived = useMemo(
    () => (src && shaping ? deriveStudio(src, params, curves) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [src, shaping, params, curves, noiseSeed, detail, tracksEdited],
  );

  // ── PAINT: a session over the param's ramp while the face is open ───────────────────────────
  const paintRev = usePaintStore((s) => s.rev);
  useEffect(() => {
    if (face === 'paint' && src) syncPaintBase(displayRampOf(src));
  }, [face, src]);
  useEffect(() => {
    if (face !== 'paint' && usePaintStore.getState().session) endPaintSession();
  }, [face]);
  const painted = useMemo((): GradientConfig | null => {
    if (face !== 'paint' || !src) return null;
    const session = usePaintStore.getState().session;
    if (!session?.changed) return null;
    return makeRampGradient(session.toRamp(), src.colorSpace, src.blendSpace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, src, paintRev]);
  // Paint's picker offers the gradient's own colours, as the Explorer's does
  const paletteHex = useMemo((): string[] => {
    if (!src) return [];
    if (src.stops.length) return [...new Set(src.stops.map((s) => s.color.toLowerCase()))];
    const ramp = displayRampOf(src);
    return Array.from({ length: RAMP_SWATCHES }, (_, i) => rgbToHex(ramp[Math.round((i / (RAMP_SWATCHES - 1)) * (ramp.length - 1))]));
  }, [src]);

  // ── THE PREVIEW on the fractal ─────────────────────────────────────────────────────────────
  const preview = face === 'paint' ? painted : derived && !derived.passthrough ? derived.preview : null;
  useEffect(() => {
    if (target && preview) previewGradient(target, preview);
  }, [target, preview]);
  // no result any more (baked, cancelled, another face) → the stored gradient goes back
  const hadPreview = useRef(false);
  useEffect(() => {
    if (!target) return;
    if (preview) hadPreview.current = true;
    else if (hadPreview.current) {
      hadPreview.current = false;
      previewGradient(target, null);
    }
  }, [target, preview]);
  // leaving this gradient, or the window unmounting, ends any preview on it
  useEffect(() => () => { if (target) previewGradient(target, null); }, [target]);

  // ── Esc cancels the face ───────────────────────────────────────────────────────────────────
  useShortcutScope('gradient-studio-face', face !== 'stops');
  useShortcut({ id: 'gradientStudio.cancelFace', key: 'Escape', scope: 'gradient-studio-face', handler: onEscape, description: 'Cancel the Gradient Studio face', category: 'Gradient' });

  // THE STOP INSPECTOR is a tray face too (the Explorer's rule): selecting a stop with no face open
  // opens it, clearing the selection closes it. The editor portals into a host that stays mounted.
  const [inspectorEl, setInspectorEl] = useState<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState(0);
  const trayFace: StudioFace | 'inspector' | null = face !== 'stops' ? face : selected > 0 ? 'inspector' : null;

  // the Curves plot is drawn to the tray's width
  const [trayW, setTrayW] = useState(640);
  const roRef = useRef<ResizeObserver | null>(null);
  const trayBox = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    setTrayW(Math.round(el.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => setTrayW(Math.round(entries[0].contentRect.width)));
    ro.observe(el);
    roRef.current = ro;
  }, []);

  const onStopsChange = useCallback((v: GradientStop[] | GradientConfig) => { if (target) writeTarget(target, v); }, [target]);
  // a tab opens its face; the open one's tab closes it (back to the stops), as in the Explorer
  const onTab = useCallback((f: StudioFace) => setStudioFace(face === f ? 'stops' : f), [face]);
  // the window's drag handle and ✕, lent by the bare-chrome float it lives in
  const chrome = useFloatingPanelChrome();

  if (!target) {
    return <div className="p-4 text-[12px] text-fg-muted">Open a gradient's popout to edit it here.</div>;
  }

  return (
    <div className="flex flex-col" data-gradient-studio="" data-gradient-studio-open={face}>
      <div>
        {/* THE CARD — the Explorer's hero panel, and the window itself: its name row is the drag
            handle and holds the ✕ (a bare-chrome panel — no title bar; the window's side edges
            resize its width). Then the bar with its knots and its control row (the face tabs,
            blend, ☰). Above the tray, whose top tucks under it. */}
        <div className="relative z-10 rounded-[20px] bg-surface-viewport border border-line/20 px-2 pt-2 pb-2 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]">
          <div
            className={`flex items-center gap-2 pl-2 pr-0.5 mb-2 min-w-0 select-none ${chrome.dragHandleProps ? 'cursor-move' : ''}`}
            {...(chrome.dragHandleProps ?? {})}
            data-gradient-studio-handle=""
          >
            <span className="text-[15px] font-semibold text-fg truncate" data-gradient-studio-target="">{label}</span>
            {/* the output profile the texture bakes in (the bar's row already counts the stops) */}
            {src && <span className="shrink-0 text-[12px] text-fg-muted">{src.colorSpace === 'linear' ? 'Linear' : src.colorSpace === 'srgb' ? 'sRGB' : 'ACES'}</span>}
            <span className="flex-1 self-stretch" />
            {chrome.close && (
              <button
                type="button"
                onClick={chrome.close}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-line/10 transition-colors"
                title="Close the Gradient Studio (a live face is applied)"
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            )}
          </div>
          {!src ? (
            <div className="px-2 pb-2 text-[12px] text-fg-muted">This gradient isn't available.</div>
          ) : (
            <InputSkinProvider skin="soft">
              <AdvancedGradientEditor
                chrome="strip"
                value={raw ?? src}
                onChange={onStopsChange}
                featureId={target.featureId}
                paramKey={target.paramKey}
                entranceHost="studio"
                stripHeight={BAR_H}
                // the bar shows the live face's result, as the Explorer's hero does
                previewRamp={derived && !derived.passthrough ? derived.ramp : undefined}
                stripTakeover={face === 'paint' ? PAINT_TAKEOVER : undefined}
                stripAside={<FaceTabs tabs={TABS} open={face === 'stops' ? null : face} onOpen={onTab} />}
                inspectorHost={inspectorEl}
                onSelectionChange={setSelected}
                pickerPalette={paletteHex}
              />
            </InputSkinProvider>
          )}
        </div>
        {/* THE TRAY — hangs from the card (its top tucked TUCK_PX under it), one face at a time,
            in the Explorer's 'soft' dialect. The inspector host is always mounted: the editor
            portals the stop inspector into it. */}
        <div
          ref={trayBox}
          hidden={!trayFace}
          className="relative mx-2 rounded-b-[20px] bg-surface-section border border-t-0 border-line/20 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65)]"
          style={{ marginTop: -TUCK_PX, paddingTop: TUCK_PX }}
          data-gx-tray-root=""
          data-gx-tray={trayFace ?? undefined}
        >
          <InputSkinProvider skin="soft">
            {face === 'curves' && <CurvesFace derived={derived ?? { base: null, final: null, ramp: null }} width={Math.max(240, trayW - 32)} />}
            {face === 'adjust' && <AdjustFace onApply={bakeStudio} />}
            {face === 'paint' && <PaintFace palette={paletteHex} />}
          </InputSkinProvider>
          <div ref={setInspectorEl} hidden={trayFace !== 'inspector'} className="px-4 py-3" />
        </div>
      </div>
    </div>
  );
};

/** For the lazy import (`installGradientStudio`). */
export default GradientStudioPanel;
