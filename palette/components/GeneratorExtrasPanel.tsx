/**
 * GeneratorExtrasPanel — the custom-UI block pinned at the bottom of the
 * Generator dock tab (registered `palette-generator-extras`). Holds the actions
 * and export that aren't scalar dials: Reset all, Reseed noise, and the full
 * export suite. Format selection uses the GMT GenericDropdown (the proper DDFS
 * dropdown component); the dials above are native DDFS params.
 *
 * Reads the shared generatorStore (export format + reset/reseed actions) and the
 * derived ramp (useGeneratorDerived) for the actual export bytes.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { GenericDropdown } from '../../components/GenericDropdown';
import { EXPORT_FORMATS, getExportFormat, grdStopCount, aiReductionError, aiStopCount, AI_LOSSY_DELTA, AI_STOP_LIMIT } from '../core/exportFormats';
import { useGeneratorStore, useGeneratorDerived } from '../store/generatorStore';

export const GeneratorExtrasPanel: React.FC = () => {
  const exportFmt = useGeneratorStore((s) => s.exportFmt);
  const setExportFmt = useGeneratorStore((s) => s.setExportFmt);
  const resetAll = useGeneratorStore((s) => s.resetAll);
  const { ramp } = useGeneratorDerived();

  const [toast, setToast] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1400);
  }, []);

  const fmtDef = useMemo(() => getExportFormat(exportFmt) ?? EXPORT_FORMATS[0], [exportFmt]);
  // .ai / .idml flatten the ramp to ≤AI_STOP_LIMIT stops; warn if this one loses detail.
  const aiWarn = useMemo(
    () => ((fmtDef.key === 'ai' || fmtDef.key === 'idml') && aiReductionError(ramp) > AI_LOSSY_DELTA ? aiStopCount(ramp) : 0),
    [fmtDef, ramp],
  );
  const previewText = useMemo(() => {
    if (fmtDef.binary) return `.${fmtDef.ext} is a binary format — use Download (${grdStopCount(ramp)} stops).`;
    const t = fmtDef.build(ramp) as string;
    return t.length > 1800 ? t.slice(0, 1800) + '\n…' : t;
  }, [fmtDef, ramp]);

  const doCopy = useCallback(() => {
    if (fmtDef.binary) {
      flash(`.${fmtDef.ext} is binary — use Download`);
      return;
    }
    navigator.clipboard?.writeText(fmtDef.build(ramp) as string).then(() => flash(`Copied ${fmtDef.label}`), () => flash('Copy failed'));
  }, [fmtDef, ramp, flash]);

  const doDownload = useCallback(() => {
    const out = fmtDef.build(ramp);
    const blob = fmtDef.binary
      ? new Blob([out as unknown as BlobPart], { type: 'application/octet-stream' })
      : new Blob([out as string], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradient.${fmtDef.ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
    flash(fmtDef.key === 'grd' ? `Downloaded .grd (${grdStopCount(ramp)} stops)` : `Downloaded .${fmtDef.ext}`);
  }, [fmtDef, ramp, flash]);

  const doPng = useCallback(() => {
    const o = document.createElement('canvas');
    o.width = 512;
    o.height = 64;
    const x = o.getContext('2d');
    if (!x) return;
    const r = document.createElement('canvas');
    r.width = 256;
    r.height = 1;
    const rc = r.getContext('2d');
    if (!rc) return;
    const img = rc.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = Math.round(ramp[i].r);
      img.data[i * 4 + 1] = Math.round(ramp[i].g);
      img.data[i * 4 + 2] = Math.round(ramp[i].b);
      img.data[i * 4 + 3] = 255;
    }
    rc.putImageData(img, 0, 0);
    x.imageSmoothingEnabled = true;
    x.drawImage(r, 0, 0, 256, 1, 0, 0, 512, 64);
    o.toBlob((bl) => {
      if (!bl) return;
      const u = URL.createObjectURL(bl);
      const a = document.createElement('a');
      a.href = u;
      a.download = 'gradient.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 800);
    });
    flash('Downloaded PNG');
  }, [ramp, flash]);

  return (
    <div className="px-1 pt-2 mt-1 border-t border-white/10">
      <button onClick={resetAll} className="w-full text-[11px] px-2 py-1 mb-2 rounded-sm bg-white/[0.06] text-gray-200 hover:bg-white/10">
        Reset all
      </button>

      <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Export</div>
      <GenericDropdown
        value={exportFmt}
        options={EXPORT_FORMATS.map((f) => ({ label: f.label, value: f.key }))}
        onChange={(v) => setExportFmt(v)}
        fullWidth
      />
      {aiWarn > 0 && (
        <div className="mt-1 text-[10px] leading-snug text-gray-400">
          Heads up: swatch libraries (.ai/.idml) hold up to {AI_STOP_LIMIT} colour stops, so this one exports with {aiWarn}. Most apps cap stops similarly.
        </div>
      )}
      {showPreview && (
        <pre className="mt-1.5 max-h-32 overflow-auto text-[10px] leading-tight text-gray-400 bg-black/50 rounded-sm p-2 border border-white/5 whitespace-pre">
          {previewText}
        </pre>
      )}
      <div className="flex items-center gap-1.5 mt-1.5">
        <button onClick={doCopy} disabled={fmtDef.binary} className="flex-1 text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-200 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.06]">
          Copy
        </button>
        <button onClick={doDownload} className="flex-1 text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-200 hover:bg-white/10 transition-colors">
          Download
        </button>
        <button onClick={doPng} className="text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-200 hover:bg-white/10 transition-colors">
          PNG
        </button>
        <button
          onClick={() => setShowPreview((v) => !v)}
          title={showPreview ? 'Hide output preview' : 'Show output preview'}
          aria-label="Toggle output preview"
          aria-pressed={showPreview}
          className="ml-0.5 pl-1.5 border-l border-white/10 text-[11px] px-2 py-1 rounded-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          {showPreview ? '▾' : '▸'}
        </button>
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/85 text-gray-100 text-xs px-3 py-1.5 rounded-full border border-white/10 shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

export default GeneratorExtrasPanel;
