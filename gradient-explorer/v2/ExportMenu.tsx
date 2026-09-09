/**
 * ExportMenu — the v2 top-bar Export popover (plans/ge-v2-design.md §5.8; §13 item 1).
 *
 * The WORKING gradient's 256-step ramp in every format the shared registry knows
 * (`palette/core/exportFormats.ts` — the same list the old shell's Extras panels and the
 * Favients collection export use), plus a PNG strip. Each row: Copy (text formats) and
 * Download. Formats are grouped by what they are for, in plain words. The dialog the
 * S5 stream plans (.ase, Tailwind, design tokens) grows from this list, not beside it.
 *
 * The doing lives in `exportActions.ts` (`runExport`), shared with the hero's hover flyout
 * of recent exports; this file is only the full window. It hangs off the hero BAND, not
 * the card — the card clips its children (2026-09-07).
 */

import React, { useEffect, useRef } from 'react';
import { EXPORT_FORMATS, type ExportFormatDef } from '../../palette/core/exportFormats';
import { runExport } from './exportActions';
import type { RGB } from '../../palette/core/oklab';
import { Floating } from './ui/Floating';
import { Act } from './ui/Act';
import { Icon } from './ui/Icon';
import { ZoneLabel } from './ui/ZoneLabel';

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'For the web', keys: ['css', 'svg', 'hex', 'json', 'js'] },
  { title: 'For design apps', keys: ['grd', 'ai', 'idml', 'gpl', 'pdn'] },
  { title: 'For fractal + 3D apps', keys: ['map', 'ggr', 'cpt', 'ugr'] },
  { title: 'For code + data', keys: ['csv', 'py'] },
];

/** `positionClass` is where the popover hangs (Phase B: it re-anchors to the Export
 *  button in the hero's use cluster instead of the retired top-bar one). Everything else
 *  about the menu is unchanged. */
/** The output colour profiles, in the order the strip used to cycle them. */
const PROFILES: { id: 'srgb' | 'linear' | 'aces_inverse'; label: string; title: string }[] = [
  { id: 'srgb', label: 'sRGB', title: 'Standard display colours' },
  { id: 'linear', label: 'Linear', title: 'Linear light — for render engines and compositing' },
  { id: 'aces_inverse', label: 'ACES', title: 'ACES inverse — for an ACES-managed pipeline' },
];

export const ExportMenu: React.FC<{
  ramp: RGB[];
  name: string;
  onClose: () => void;
  positionClass?: string;
  /** The gradient's output colour profile and its setter (C.15: an export concern, so it
   *  lives here rather than on the strip). */
  colorSpace?: 'srgb' | 'linear' | 'aces_inverse';
  onColorSpace?: (id: 'srgb' | 'linear' | 'aces_inverse') => void;
}> = ({
  ramp,
  name,
  onClose,
  positionClass = 'absolute right-4 top-12 z-40',
  colorSpace,
  onColorSpace,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [onClose]);

  const copy = (f: ExportFormatDef) => runExport({ kind: 'copy', key: f.key }, ramp, name);
  const download = (f: ExportFormatDef) => runExport({ kind: 'download', key: f.key }, ramp, name);
  const png = () => runExport({ kind: 'png' }, ramp, name);

  const known = new Set(GROUPS.flatMap((g) => g.keys));
  const rest = EXPORT_FORMATS.filter((f) => !known.has(f.key));

  const row = (f: ExportFormatDef) => (
    <div key={f.key} className="flex items-center gap-2 py-0.5">
      <span className="flex-1 text-[13px] text-fg">{f.label}</span>
      {!f.binary && (
        <Act onClick={() => copy(f)} title="Copy to the clipboard">
          Copy
        </Act>
      )}
      <Act onClick={() => download(f)} title={`Download .${f.ext}`}>
        Download
      </Act>
    </div>
  );

  return (
    <Floating ref={ref} className={`${positionClass} w-[360px] max-h-[70vh] overflow-y-auto p-4 flex flex-col gap-3`} data-gx-export>
      <div className="flex items-center">
        <b className="text-[13px] text-fg">Export “{name}”</b>
        <button className="ml-auto text-fg-muted hover:text-fg" onClick={onClose} title="Close (Esc)">
          <Icon name="close" />
        </button>
      </div>
      {GROUPS.map((g) => {
        const fs = g.keys.map((k) => EXPORT_FORMATS.find((f) => f.key === k)).filter((f): f is ExportFormatDef => !!f);
        if (!fs.length) return null;
        return (
          <div key={g.title}>
            <ZoneLabel className="block mb-1">{g.title}</ZoneLabel>
            {fs.map(row)}
          </div>
        );
      })}
      {rest.length > 0 && (
        <div>
          <ZoneLabel className="block mb-1">More</ZoneLabel>
          {rest.map(row)}
        </div>
      )}
      {colorSpace && onColorSpace && (
        <div>
          <ZoneLabel className="block mb-1">Output profile</ZoneLabel>
          <div className="inline-flex border border-line/20 rounded-lg overflow-hidden" data-gx-output-profile>
            {PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`px-2.5 h-7 text-[13px] ${colorSpace === p.id ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'}`}
                title={p.title}
                onClick={() => onColorSpace(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <ZoneLabel className="block mb-1">As an image</ZoneLabel>
        <div className="flex items-center gap-2 py-0.5">
          <span className="flex-1 text-[13px] text-fg">PNG strip (1024 × 64)</span>
          <Act onClick={png}>Download</Act>
        </div>
        <div className="text-[13px] text-fg-muted mt-1">For a full-size image use Wallpaper.</div>
      </div>
    </Floating>
  );
};

export default ExportMenu;
