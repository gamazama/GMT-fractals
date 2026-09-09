/**
 * ExportPanel — Wallpaper's "export at size" bar, along the bottom of the fullscreen overlay.
 *
 * Purely a control surface: it owns the panel's transient choices (preset / custom W×H /
 * orientation / supersample), resolves them through the PURE {@link resolveExportSize}, shows
 * the resulting numbers, and hands the finished plan to its `onExport` prop. It never renders
 * a pixel — the overlay owns the compositor and the ownCanvas handle, so it owns the render.
 *
 * ADDITIVE: the overlay's existing top-bar "Export PNG" (the on-screen snapshot, and the only
 * path that embeds a fractal scene in the PNG) is untouched and still works. This bar is the
 * second, deliberate path — pick a size, get that size.
 *
 * The Dither checkbox here drives the SAME `fullscreenStore.dither` as the toolbar's ▦ Dither
 * button — one piece of state shown twice, never a parallel copy. It is a checkbox rather than
 * a button so a `getByRole('button', …)` in an existing smoke cannot become ambiguous.
 *
 * @see gradient-explorer/fullscreen/exportSize.ts (every number in this panel comes from there)
 * @see plans/ge-v2-design.md §5.7 (Wallpaper — export at size)
 */

import React, { useMemo, useState } from 'react';
import {
  EXPORT_PRESETS,
  MAX_EXPORT_EDGE,
  getExportPreset,
  naturalOrientation,
  resolveExportSize,
  type ExportOrientation,
  type ExportPresetId,
  type ExportSizePlan,
} from './exportSize';
import type { FullscreenModeKind } from './modeRegistry';

export interface ExportPanelProps {
  /** The active mode's render kind — gates the supersample toggle. */
  kind: FullscreenModeKind;
  /** The active mode's label, for the "renders at screen size" note. */
  modeLabel: string;
  /** True when the active mode can render at an arbitrary size (a compositor mode always can;
   *  an ownCanvas mode only if its handle implements `renderAt`). Drives the fallback note. */
  canRenderAtSize: boolean;
  dither: boolean;
  onDitherChange: (on: boolean) => void;
  onExport: (plan: ExportSizePlan) => void;
  /** True while an export is in flight — a 4K CPU field takes a visible moment. */
  busy: boolean;
}

const chip = (active: boolean): string =>
  `px-2.5 py-1 text-[12px] transition-colors ${
    active
      ? 'bg-accent-500/25 text-accent-300 font-medium'
      : 'text-fg-muted hover:text-fg-secondary hover:bg-line/[0.05]'
  }`;

export const ExportPanel: React.FC<ExportPanelProps> = ({
  kind,
  modeLabel,
  canRenderAtSize,
  dither,
  onDitherChange,
  onExport,
  busy,
}) => {
  const [preset, setPreset] = useState<ExportPresetId>('hd');
  const [orientation, setOrientation] = useState<ExportOrientation>('landscape');
  const [customWidth, setCustomWidth] = useState(2560);
  const [customHeight, setCustomHeight] = useState(1440);
  const [supersample, setSupersample] = useState(false);

  const plan = useMemo(
    () => resolveExportSize({ preset, customWidth, customHeight, orientation, supersample, kind }),
    [preset, customWidth, customHeight, orientation, supersample, kind],
  );

  // Picking a preset also adopts its natural orientation, so "Phone" lands portrait and "4K"
  // lands landscape without a second click; the toggle still overrides afterwards.
  const choosePreset = (id: ExportPresetId): void => {
    setPreset(id);
    const p = getExportPreset(id);
    if (p?.size) setOrientation(naturalOrientation(p.size));
  };

  const note = !canRenderAtSize
    ? `${modeLabel} has no at-size render yet — this exports the screen`
    : plan.clamped
      ? `clamped to the 4K cap (max ${MAX_EXPORT_EDGE} px, 4K of pixels)`
      : plan.supersampleDropped
        ? '×2 dropped — too many pixels to supersample at this size'
        : plan.factor > 1
          ? `rendering ${plan.renderWidth}×${plan.renderHeight}, downsampled`
          : null;

  return (
    <div
      className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2 border-t border-line/10 bg-surface-dock/80"
      data-testid="fullscreen-export-panel"
    >
      <div className="text-[11px] font-medium text-fg-tertiary tracking-wide uppercase mr-1">Export</div>

      <div className="flex items-center rounded-md border border-line/10 overflow-hidden divide-x divide-line/10">
        {EXPORT_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => choosePreset(p.id)}
            className={chip(preset === p.id)}
            title={p.size ? `${p.size.width} × ${p.size.height}` : 'Type your own size'}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-1.5 text-[12px] text-fg-muted">
          <input
            type="number"
            value={customWidth}
            min={16}
            max={MAX_EXPORT_EDGE}
            onChange={(e) => setCustomWidth(parseInt(e.target.value, 10) || 0)}
            aria-label="Custom export width"
            className="w-20 bg-surface border border-line/10 rounded px-1.5 py-1 text-[12px] text-fg-secondary"
          />
          <span aria-hidden>×</span>
          <input
            type="number"
            value={customHeight}
            min={16}
            max={MAX_EXPORT_EDGE}
            onChange={(e) => setCustomHeight(parseInt(e.target.value, 10) || 0)}
            aria-label="Custom export height"
            className="w-20 bg-surface border border-line/10 rounded px-1.5 py-1 text-[12px] text-fg-secondary"
          />
        </div>
      )}

      <div className="flex items-center rounded-md border border-line/10 overflow-hidden divide-x divide-line/10">
        <button onClick={() => setOrientation('landscape')} className={chip(orientation === 'landscape')} title="Wide">
          ▭ Landscape
        </button>
        <button onClick={() => setOrientation('portrait')} className={chip(orientation === 'portrait')} title="Tall">
          ▯ Portrait
        </button>
      </div>

      <label
        className="flex items-center gap-1.5 text-[12px] text-fg-muted select-none cursor-pointer"
        title="Blue-noise dither — smooths 8-bit banding; bakes into the PNG (same setting as the toolbar toggle)"
      >
        <input type="checkbox" checked={dither} onChange={(e) => onDitherChange(e.target.checked)} />
        Dither
      </label>

      <label
        className={`flex items-center gap-1.5 text-[12px] select-none ${
          plan.supersampleAvailable ? 'text-fg-muted cursor-pointer' : 'text-fg-dim cursor-not-allowed'
        }`}
        title={
          plan.supersampleAvailable
            ? 'Render at twice the size and downsample — smoother edges on the CPU geometry modes'
            : `${modeLabel} renders straight to the requested size; supersampling only applies to the CPU geometry modes`
        }
      >
        <input
          type="checkbox"
          checked={supersample && plan.supersampleAvailable}
          disabled={!plan.supersampleAvailable}
          onChange={(e) => setSupersample(e.target.checked)}
        />
        Supersample ×2
      </label>

      <div className="flex items-center gap-2 ml-auto">
        {note && <span className="text-[11px] text-fg-dim max-w-[36ch] truncate" title={note}>{note}</span>}
        <button
          onClick={() => onExport(plan)}
          disabled={busy}
          className="px-3 py-1 text-[12px] rounded-md border border-accent-500/30 bg-accent-500/15 text-accent-300 hover:bg-accent-500/25 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {busy ? 'Exporting…' : `Export PNG · ${plan.width}×${plan.height}`}
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
