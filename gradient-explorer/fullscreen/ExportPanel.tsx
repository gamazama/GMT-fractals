/**
 * ExportPanel — Wallpaper's "export at size" bar, along the bottom of the fullscreen overlay.
 *
 * Purely a control surface: it owns the panel's transient choices (preset / custom W×H /
 * orientation / supersample), resolves them through the PURE {@link resolveExportSize}, shows
 * the resulting numbers, and hands the finished plan to its `onExport` prop. It never renders
 * a pixel — the overlay owns the compositor and the ownCanvas handle, so it owns the render.
 *
 * THE export path since 2026-09-12: the overlay's top-bar "Export PNG" was a duplicate button
 * and the owner removed it, so this bar is how a wallpaper leaves the app — pick a size, get
 * that size. The fractal scene-embedding that used to belong to that button came with it (see
 * `exportAtSize` in the overlay), which is why a Fractal export is also a coordinate carrier.
 *
 * The Dither checkbox here drives the SAME `fullscreenStore.dither` as the toolbar's ▦ Dither
 * button — one piece of state, never a parallel copy — and it is shown on a PHONE only, where
 * the toolbar's cluster is hidden (owner, 2026-09-24: Dither once on a desk, the toolbar toggle,
 * which changes what you see). It is a checkbox rather than a button so a
 * `getByRole('button', …)` in an existing smoke cannot become ambiguous.
 *
 * IT REMEMBERS (owner, 2026-09-24): the size preset, the orientation, the custom W × H and ×2
 * are kept in `gx.v2.wallpaperExport` (`readWallpaperExport`), beside the Export window's own
 * `gx.v2.exportSettings`, and written only when the person changes one. With nothing stored, a
 * phone (the overlay's `phone`, or a coarse pointer) starts on Phone, portrait — the wallpaper
 * a phone is for — and a desk on 1080p, landscape, as before.
 *
 * PHONE (2026-09-11). At 390 px the bar wrapped to five or six rows and took ~200 px off the
 * stage — so with `phone` it is COLLAPSIBLE and starts COLLAPSED (owner: "fullscreen mode needs
 * the export section collapsed"). Collapsed is ONE row: a chevron toggle carrying the chosen
 * size ("▸ Export · 1170×2532") plus the primary Export PNG button, which stays reachable
 * without expanding anything — one tap to export at the remembered size. Expanded, the same
 * controls appear in the same order (the size and the orientation switches as one cycling
 * button each, the `Segmented` phone rule — 2026-09-24), capped at 45 % of the viewport with
 * their own `pan-y` scroller so the stage can never disappear behind them. The DESKTOP keeps
 * the original single-`div` branch with the original class list and the same controls in the
 * same order, so `data-testid="fullscreen-export-panel"` still names the same shape a desktop
 * smoke sees.
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
import { Segmented } from '../../components/ui/Segmented';
import { COARSE_POINTER } from '../../components/gradient/BlendSpacePicker';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';

/** What the panel remembers between opens (see the header). */
interface WallpaperExportChoice {
  preset: ExportPresetId;
  orientation: ExportOrientation;
  customWidth: number;
  customHeight: number;
  supersample: boolean;
}
const WALLPAPER_EXPORT_KEY = 'gx.v2.wallpaperExport';

/** The remembered choice, or the default for this device when nothing (or garbage) is stored. */
const readWallpaperExport = (phone: boolean): WallpaperExportChoice => {
  const d: WallpaperExportChoice = phone
    ? { preset: 'phone', orientation: 'portrait', customWidth: 2560, customHeight: 1440, supersample: false }
    : { preset: 'hd', orientation: 'landscape', customWidth: 2560, customHeight: 1440, supersample: false };
  try {
    const v = JSON.parse(safeLocalGet(WALLPAPER_EXPORT_KEY) ?? 'null') as Partial<WallpaperExportChoice> | null;
    if (!v || typeof v !== 'object') return d;
    const num = (x: unknown, fallback: number) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.round(x) : fallback);
    return {
      preset: EXPORT_PRESETS.some((p) => p.id === v.preset) ? (v.preset as ExportPresetId) : d.preset,
      orientation: v.orientation === 'portrait' || v.orientation === 'landscape' ? v.orientation : d.orientation,
      customWidth: num(v.customWidth, d.customWidth),
      customHeight: num(v.customHeight, d.customHeight),
      supersample: typeof v.supersample === 'boolean' ? v.supersample : d.supersample,
    };
  } catch {
    return d;
  }
};

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
   * Phone layout: the panel becomes collapsible and starts collapsed, and its two switches
   * cycle. Left undefined (or false) the component renders the desktop bar — same root div,
   * same classes, always expanded, no toggle.
   */
  phone?: boolean;
}

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
  // Read once per mount: the overlay mounts this panel each time Wallpaper opens.
  const [initial] = useState(() => readWallpaperExport(phone || COARSE_POINTER));
  const [preset, setPresetState] = useState<ExportPresetId>(initial.preset);
  const [orientation, setOrientationState] = useState<ExportOrientation>(initial.orientation);
  const [customWidth, setCustomWidthState] = useState(initial.customWidth);
  const [customHeight, setCustomHeightState] = useState(initial.customHeight);
  const [supersample, setSupersampleState] = useState(initial.supersample);
  // Written from the change handlers, never from an effect: an effect would store the device's
  // DEFAULT on first open, and a phone default must stay a default until someone chooses.
  const remember = (patch: Partial<WallpaperExportChoice>): void => {
    safeLocalSet(WALLPAPER_EXPORT_KEY, JSON.stringify({ preset, orientation, customWidth, customHeight, supersample, ...patch }));
  };
  const setPreset = (v: ExportPresetId) => { setPresetState(v); remember({ preset: v }); };
  const setOrientation = (v: ExportOrientation) => { setOrientationState(v); remember({ orientation: v }); };
  const setCustomWidth = (v: number) => { setCustomWidthState(v); remember({ customWidth: v }); };
  const setCustomHeight = (v: number) => { setCustomHeightState(v); remember({ customHeight: v }); };
  const setSupersample = (v: boolean) => { setSupersampleState(v); remember({ supersample: v }); };
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
    const p = getExportPreset(id);
    const o = p?.size ? naturalOrientation(p.size) : orientation;
    setPresetState(id);
    setOrientationState(o);
    remember({ preset: id, orientation: o });
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

      {/* The size presets and the orientation are the app's ONE joined switch
          (`components/ui/Segmented`, 2026-09-24): on a phone each is one button that cycles. */}
      <Segmented<ExportPresetId>
        name="Size"
        options={EXPORT_PRESETS.map((p) => ({
          id: p.id,
          name: p.label,
          title: p.size ? `${p.label} — ${p.size.width} × ${p.size.height}` : `${p.label} — type your own size`,
        }))}
        value={preset}
        onChange={choosePreset}
        cycle={phone}
      />

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

      <Segmented<ExportOrientation>
        name="Orientation"
        options={[
          { id: 'landscape', name: 'Landscape', label: '▭ Landscape', title: 'Landscape — wide' },
          { id: 'portrait', name: 'Portrait', label: '▯ Portrait', title: 'Portrait — tall' },
        ]}
        value={orientation}
        onChange={setOrientation}
        cycle={phone}
      />

      {/* PHONE ONLY — a desk has the toolbar's ▦ Dither (see the header). */}
      {phone && (
        <label
          className="flex items-center gap-1.5 text-[12px] text-fg-muted select-none cursor-pointer"
          title="Dither — smooths banding"
        >
          <input type="checkbox" checked={dither} onChange={(e) => onDitherChange(e.target.checked)} />
          Dither
        </label>
      )}

      <label
        className={`flex items-center gap-1.5 text-[12px] select-none ${
          plan.supersampleAvailable ? 'text-fg-muted cursor-pointer' : 'text-fg-dim cursor-not-allowed'
        }`}
        title={plan.supersampleAvailable ? 'Supersample ×2 — smoother edges' : `Supersample ×2 — not for ${modeLabel}`}
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

  // DESKTOP — the original bar: same root, same classes, the same controls in order, no toggle.
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
