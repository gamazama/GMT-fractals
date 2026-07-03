/**
 * ImportMandelbulb3DModal — load Mandelbulb3D formulas into GMT two ways:
 *  1. Browse the library of faithfully-translated MB3D formulas (intern source
 *     math + x87-decompiled [CODE]) and load any one standalone at its defaults.
 *  2. Paste a `Mandelbulb3Dv18{...}` scene block / load a `.m3p` file → the
 *     fused-hybrid weave path (parseMB3D → emitFusedHybrid → loadScene).
 *
 * Camera / lighting / colour keep GMT defaults (reframe as needed). Unsupported
 * scenes surface a clear inline reason (no silent failure).
 *
 * @see plans/mb3d/converter-design.md
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../../components/ui';
import { showToast } from '../../../../engine/store/toastStore';
import { loadMB3DScene, loadMB3DSceneBytes, loadDecompiledFormula, loadInternFormula } from '../../../utils/mb3d/loadMB3DScene';
import type { LoadMB3DResult } from '../../../utils/mb3d/loadMB3DScene';
import { getMB3DCatalog, getMB3DCatalogCount } from '../../../utils/mb3d/mb3dCatalog';
import type { CatalogEntry } from '../../../utils/mb3d/mb3dCatalog';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../../../utils/mb3d/sampleScenes';
import type { SampleScene } from '../../../utils/mb3d/sampleScenes';

export interface ImportMandelbulb3DModalProps {
  open: boolean;
  onClose: () => void;
}

export const ImportMandelbulb3DModal: React.FC<ImportMandelbulb3DModalProps> = ({ open, onClose }) => {
  const [pasteText, setPasteText] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const catalog = useMemo(() => getMB3DCatalog(), []);
  const catalogCount = useMemo(() => getMB3DCatalogCount(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog
      .map((g) => ({ category: g.category, entries: g.entries.filter((e) => e.label.toLowerCase().includes(q)) }))
      .filter((g) => g.entries.length > 0);
  }, [catalog, query]);

  // Reset transient UI when the modal closes.
  useEffect(() => {
    if (!open) {
      setPasteText('');
      setLoadError(null);
      setQuery('');
    }
  }, [open]);

  // Shared success/failure handling for both the text and file paths.
  const handleResult = (result: LoadMB3DResult) => {
    if (!result.ok) {
      const reason = result.reason || 'This Mandelbulb3D scene is not supported yet.';
      setLoadError(reason);
      showToast(reason, 'error', 7000);
      return;
    }
    showToast(`Imported ${result.summary || 'Mandelbulb3D scene'}. Camera, lighting and colour use GMT defaults.`, 'info', 6000);
    onClose();
  };

  const doImport = (text: string) => {
    setLoadError(null);
    try {
      handleResult(loadMB3DScene(text));
    } catch {
      setLoadError("Couldn't read that block — paste the whole Mandelbulb3Dv18{…} text and try again.");
      showToast('Mandelbulb3D import failed — that block could not be read.', 'error', 4500);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ''; // allow re-selecting the same file
    if (!file) return;
    setLoadError(null);
    file.arrayBuffer().then(
      (buf) => {
        try {
          handleResult(loadMB3DSceneBytes(new Uint8Array(buf), file.name.replace(/\.m3p$/i, '')));
        } catch {
          setLoadError("Couldn't read that .m3p file — it may be an unsupported (older / 64-bit) MB3D format.");
          showToast('Mandelbulb3D .m3p could not be read.', 'error', 4500);
        }
      },
      () => showToast('Could not read the file.', 'error', 4000),
    );
  };

  const handleImport = () => {
    if (!pasteText.trim()) {
      showToast('Paste a Mandelbulb3D block first.', 'warning', 4000);
      return;
    }
    doImport(pasteText);
  };

  const handleReadClipboard = async () => {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      showToast('Clipboard read was blocked — paste into the box below instead.', 'warning', 4500);
      return;
    }
    if (!text.trim()) {
      showToast("Clipboard didn't contain anything to import.", 'warning', 4500);
      return;
    }
    setPasteText(text);
    doImport(text);
  };

  const loadEntry = (entry: CatalogEntry) => {
    setLoadError(null);
    try {
      const res =
        entry.kind === 'intern'
          ? loadInternFormula(entry.ref as number, entry.label, entry.internDefaults ?? [])
          : loadDecompiledFormula(entry.ref as string);
      handleResult(res);
    } catch {
      const msg = `Couldn't load "${entry.label}".`;
      setLoadError(msg);
      showToast(msg, 'error', 4000);
    }
  };

  const loadSample = (s: SampleScene) => {
    setLoadError(null);
    try {
      handleResult(loadMB3DSceneBytes(decodeSampleScene(s.b64), s.name));
    } catch {
      const msg = `Couldn't load "${s.name}".`;
      setLoadError(msg);
      showToast(msg, 'error', 4000);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} dismissOnBackdrop={false} labelledBy="mb3d-import-title">
      <div className="bg-surface-raised border border-line/10 rounded-xl w-[520px] max-w-[94vw] max-h-[88vh] flex flex-col shadow-2xl text-fg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line/10">
          <h2 id="mb3d-import-title" className="text-sm font-bold">
            Import <span className="text-accent-300">Mandelbulb3D</span> scene
          </h2>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg text-lg leading-none px-1 transition-colors"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-xs text-fg-muted leading-relaxed">
            Load any of <strong className="text-fg">{catalogCount}</strong> Mandelbulb3D formulas translated faithfully
            from MB3D's own math (intern source + x87-decompiled <span className="font-mono text-fg">[CODE]</span>).
            Click one to load it at its default parameters. Camera, lighting and colour use GMT defaults — reframe as
            needed.
          </p>

          {/* Formula library */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-fg-tertiary">Formula library</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-36 rounded bg-surface-sunken border border-line/10 px-2 py-1 text-[11px] text-fg outline-none focus:border-accent-500/40 placeholder:text-fg-tertiary"
                spellCheck={false}
              />
            </div>
            <div className="max-h-[34vh] overflow-y-auto rounded-lg border border-line/10 bg-surface-sunken/60 px-2.5 py-2 space-y-2.5">
              {filtered.length === 0 && (
                <p className="text-[11px] text-fg-tertiary px-1 py-2">No formulas match “{query}”.</p>
              )}
              {filtered.map((g) => (
                <div key={g.category}>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-fg-tertiary/70 px-0.5 mb-1">
                    {g.category}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.entries.map((e) => (
                      <button
                        key={`${e.kind}:${e.ref}`}
                        onClick={() => loadEntry(e)}
                        className="px-2 py-1 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-accent-500/40 hover:bg-accent-500/10 transition-colors"
                        title={`Load ${e.label}`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-fg-tertiary/80 leading-relaxed mt-1.5 px-0.5">
              Boxes, bulbs, IFS and brots are full fractals. Transforms, inversions and attractors are
              building blocks — alone they may render as sparse glows; in MB3D they're woven into a hybrid
              with a base fractal. Bulbs cut off? Raise <span className="text-fg-muted">Max Ray Steps</span>.
            </p>
          </div>

          {/* Sample scenes */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-fg-tertiary mb-1.5">
              Sample scenes{' '}
              <span className="text-fg-tertiary/60 normal-case font-normal">— real MB3D scenes that weave faithfully</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MB3D_SAMPLE_SCENES.map((s) => (
                <button
                  key={s.name}
                  onClick={() => loadSample(s)}
                  title={s.formulas.join(' → ')}
                  className="px-2 py-1 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-accent-500/40 hover:bg-accent-500/10 transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Scene import */}
          <div className="pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-fg-tertiary mb-1.5">
              Or import a full scene
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-fg-tertiary">Mandelbulb3D block</span>
              <div className="flex items-center gap-1.5">
                <input ref={fileRef} type="file" accept=".m3p" className="hidden" onChange={handleFile} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-2.5 py-1 text-[11px] font-bold rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-line/25 transition-colors"
                  title="Load a Mandelbulb3D .m3p file"
                >
                  Load .m3p file…
                </button>
                <button
                  onClick={handleReadClipboard}
                  className="px-2.5 py-1 text-[11px] font-bold rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-line/25 transition-colors"
                  title="Read the clipboard and import"
                >
                  Paste from clipboard
                </button>
              </div>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                if (loadError) setLoadError(null);
              }}
              placeholder="Mandelbulb3Dv18{ ... }"
              className="w-full h-32 resize-y rounded-lg bg-surface-sunken border border-line/10 px-3 py-2 text-[11px] leading-relaxed font-mono text-fg outline-none focus:border-accent-500/40 placeholder:text-fg-tertiary"
              spellCheck={false}
            />

            {loadError && (
              <div className="mt-2 flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-200">
                <p className="leading-relaxed">{loadError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-line/10">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-line/[0.04] border border-line/10 text-fg-muted hover:text-fg hover:border-line/20 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-accent-600 hover:bg-accent-500 text-white border border-accent-500/50 transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ImportMandelbulb3DModal;
