/**
 * ExportMenu — the v2 top-bar Export popover (plans/ge-v2-design.md §5.8; §13 item 1).
 *
 * The WORKING gradient's 256-step ramp in every format the shared registry knows
 * (`palette/core/exportFormats.ts` — the same list the old shell's Extras panels and the
 * Favients collection export use), plus a PNG strip. Each row: Copy (text formats) and
 * Download. Formats are grouped by what they are for, in plain words. The dialog the
 * S5 stream plans (.ase, Tailwind, design tokens) grows from this list, not beside it.
 */

import React, { useEffect, useRef } from 'react';
import { EXPORT_FORMATS, grdStopCount, type ExportFormatDef } from '../../palette/core/exportFormats';
import { downloadBlob } from '../../utils/SceneFormat';
import { showToast } from '../../engine/store/toastStore';
import type { RGB } from '../../palette/core/oklab';

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'For the web', keys: ['css', 'svg', 'hex', 'json', 'js'] },
  { title: 'For design apps', keys: ['grd', 'ai', 'idml', 'gpl', 'pdn'] },
  { title: 'For fractal + 3D apps', keys: ['map', 'ggr', 'cpt', 'ugr'] },
  { title: 'For code + data', keys: ['csv', 'py'] },
];

const slug = (name: string): string => name.trim().replace(/[^\w-]+/g, '_').slice(0, 48) || 'gradient';

const rowBtn = 'h-6 px-2 rounded text-[11px] border border-line/20 text-fg-muted hover:text-fg hover:border-line/40';

export const ExportMenu: React.FC<{ ramp: RGB[]; name: string; onClose: () => void }> = ({ ramp, name, onClose }) => {
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

  const copy = (f: ExportFormatDef) => {
    const out = f.build(ramp);
    navigator.clipboard?.writeText(out as string).then(
      () => showToast(`Copied ${f.label}`),
      () => showToast('Copy failed'),
    );
  };
  const download = (f: ExportFormatDef) => {
    const out = f.build(ramp);
    const blob = f.binary ? new Blob([out as unknown as BlobPart], { type: 'application/octet-stream' }) : new Blob([out as string], { type: 'text/plain' });
    downloadBlob(blob, `${slug(name)}.${f.ext}`);
    showToast(f.key === 'grd' ? `Downloaded .grd (${grdStopCount(ramp)} stops)` : `Downloaded .${f.ext}`);
  };
  const png = () => {
    const o = document.createElement('canvas');
    o.width = 1024;
    o.height = 64;
    const x = o.getContext('2d');
    const r = document.createElement('canvas');
    r.width = 256;
    r.height = 1;
    const rc = r.getContext('2d');
    if (!x || !rc) return;
    const img = rc.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = Math.round(ramp[i].r);
      img.data[i * 4 + 1] = Math.round(ramp[i].g);
      img.data[i * 4 + 2] = Math.round(ramp[i].b);
      img.data[i * 4 + 3] = 255;
    }
    rc.putImageData(img, 0, 0);
    x.imageSmoothingEnabled = true;
    x.drawImage(r, 0, 0, 256, 1, 0, 0, o.width, o.height);
    o.toBlob((bl) => {
      if (!bl) return;
      downloadBlob(bl, `${slug(name)}.png`);
      showToast('Downloaded .png strip');
    });
  };

  const known = new Set(GROUPS.flatMap((g) => g.keys));
  const rest = EXPORT_FORMATS.filter((f) => !known.has(f.key));

  const row = (f: ExportFormatDef) => (
    <div key={f.key} className="flex items-center gap-2 py-0.5">
      <span className="flex-1 text-[12px] text-fg">{f.label}</span>
      {!f.binary && (
        <button className={rowBtn} onClick={() => copy(f)} title="Copy to the clipboard">
          Copy
        </button>
      )}
      <button className={rowBtn} onClick={() => download(f)} title={`Download .${f.ext}`}>
        Download
      </button>
    </div>
  );

  return (
    <div ref={ref} className="absolute right-4 top-12 z-40 w-[360px] max-h-[70vh] overflow-y-auto rounded-xl border border-line/20 bg-surface-dock shadow-2xl p-4 flex flex-col gap-3" data-gx-export>
      <div className="flex items-center">
        <b className="text-[13px] text-fg">Export “{name}”</b>
        <button className="ml-auto text-fg-dim hover:text-fg text-[12px]" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>
      {GROUPS.map((g) => {
        const fs = g.keys.map((k) => EXPORT_FORMATS.find((f) => f.key === k)).filter((f): f is ExportFormatDef => !!f);
        if (!fs.length) return null;
        return (
          <div key={g.title}>
            <div className="text-[10px] uppercase tracking-wide text-fg-dim mb-1">{g.title}</div>
            {fs.map(row)}
          </div>
        );
      })}
      {rest.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-fg-dim mb-1">More</div>
          {rest.map(row)}
        </div>
      )}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-fg-dim mb-1">As an image</div>
        <div className="flex items-center gap-2 py-0.5">
          <span className="flex-1 text-[12px] text-fg">PNG strip (1024 × 64)</span>
          <button className={rowBtn} onClick={png}>
            Download
          </button>
        </div>
        <div className="text-[11px] text-fg-dim mt-1">For a full-size image use Wallpaper.</div>
      </div>
    </div>
  );
};

export default ExportMenu;
