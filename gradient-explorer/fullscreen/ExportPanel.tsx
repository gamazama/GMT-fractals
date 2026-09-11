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
 * PHONE (2026-09-11). At 390 px the bar wrapped to five or six rows and took ~200 px off the
 * stage — so with `phone` it is COLLAPSIBLE and starts COLLAPSED (owner: "fullscreen mode needs
 * the export section collapsed"). Collapsed is ONE row: a chevron toggle carrying the chosen
 * size ("▸ Export · 1170×2532") plus the primary Export PNG button, which stays reachable
 * without expanding anything — one tap to export at the remembered size. Expanded, the same
 * controls appear in the same order, capped at 45 % of the viewport with their own `pan-y`
 * scroller so the stage can never disappear behind them. DESKTOP IS UNTOUCHED: `phone` false
 * takes the original single-`div` branch with the original class list and the original children,
 * so `data-testid="fullscreen-export-panel"` still names the same shape a desktop smoke sees.
 * Guarded by `npm run smoke:ge-phone` step [8] (the collapsed bar is ≤ 48 px).
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
  /**
   * Phone layout: the panel becomes collapsible and starts collapsed. Left undefined (or false)
   * the component renders EXACTLY the desktop DOM it always has — same root div, same classes,
   * same children, always expanded, no toggle.
   */
  phone?: boolean;
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
  phone = false,
}) => {
  const [preset, setPreset] = useState<ExportPresetId>('hd');
  const [orientation, setOrientation] = useState<ExportOrientation>('landscape');
  const [customWidth, setCustomWidth] = useState(2560);
  const [customHeight, setCustomHeight] = useState(1440);
  const [supersample, setSupersample] = useState(false);
  // Collapsed by default. Only the phone branch reads it, so seeding it `true` cannot change
  // the desktop panel — and a phone that expands, rotates to a tablet width and comes back
  // finds it as it left it rather than re-collapsing under them.
  const [collapsed, setCollapsed] = useState(true);

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

  /** The panel's controls, in order. ONE definition, shared by the desktop bar and the phone's
   *  expanded sheet — so the two can never drift into different panels. */
  const rows = (
    <>
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
    </>
  );

  // DESKTOP — the original bar, unchanged: same root, same classes, same children, no toggle.
  if (!phone) {
    return (
      <div
        className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2 border-t border-line/10 bg-surface-dock/80"
        data-testid="fullscreen-export-panel"
      >
        {rows}
      </div>
    );
  }

  // The toggle: a chevron, the word, and the size it would export at — so the collapsed bar
  // still answers "what will Export PNG give me" without being opened.
  const toggle = (
    <button
      onClick={() => setCollapsed((c) => !c)}
      aria-expanded={!collapsed}
      title={collapsed ? 'Show the export size controls' : 'Hide the export size controls'}
      data-gx-fs-export-toggle
      className="flex min-h-[36px] min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] text-fg-tertiary hover:text-fg hover:bg-line/[0.06] transition-colors"
    >
      <span aria-hidden className="text-[10px]">{collapsed ? '▸' : '▾'}</span>
      <span className="truncate">Export · {plan.width}×{plan.height}</span>
    </button>
  );

  // COLLAPSED — one 45 px row (36 px of tap target + 8 px of padding + the 1 px rule), which is
  // what `smoke:ge-phone` [8] pins at ≤ 48. The primary action stays IN that row: the common
  // phone case is "export the size I already picked", and that must not cost an expand first.
  if (collapsed) {
    return (
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-1 border-t border-line/10 bg-surface-dock/80"
        data-testid="fullscreen-export-panel"
      >
        {toggle}
        <button
          onClick={() => onExport(plan)}
          disabled={busy}
          className="ml-auto shrink-0 px-3 py-1 min-h-[36px] text-[12px] rounded-md border border-accent-500/30 bg-accent-500/15 text-accent-300 hover:bg-accent-500/25 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {busy ? 'Exporting…' : 'Export PNG'}
        </button>
      </div>
    );
  }

  // EXPANDED — the same controls, wrapping, and hard-capped at 45 % of the viewport with its
  // own scroller. `pan-y` hands this one axis back to the browser; the overlay root takes
  // `touch-action: none` precisely so nothing else can scroll.
  return (
    <div
      className="shrink-0 flex flex-col gap-2 px-3 py-2 border-t border-line/10 bg-surface-dock/80 max-h-[45vh] overflow-y-auto"
      style={{ touchAction: 'pan-y' }}
      data-testid="fullscreen-export-panel"
    >
      <div className="flex items-center">{toggle}</div>
      <div className="flex flex-wrap items-center gap-3">{rows}</div>
    </div>
  );
};

export default ExportPanel;
