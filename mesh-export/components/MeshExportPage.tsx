// MeshExportPage.tsx — Full page layout for mesh export
import React from 'react';
import { FormulaSelector } from './FormulaSelector';
import { FormulaParams } from './FormulaParams';
import { PipelineControls } from './PipelineControls';
import { BoundsPanel } from './BoundsPanel';
import { ProgressPanel } from './ProgressPanel';
import { ExportPanel } from './ExportPanel';
import { PreviewCanvas } from './PreviewCanvas';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { ScalarInput } from '../../components/inputs/ScalarInput';
import { useMeshExportStore } from '../store/meshExportStore';

function InterlaceControls() {
  const store = useMeshExportStore();
  const interlaceState = useMeshExportStore((s) => s.interlaceState);

  if (!interlaceState) return null;

  return (
    <div className="flex flex-col gap-1.5 border border-purple-700/40 rounded px-2 py-1.5 bg-purple-900/10 mt-1">
      <div className="text-[11px] text-purple-300 font-bold flex items-center justify-between">
        <span>Interlace: {interlaceState.definition.name}</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={interlaceState.enabled}
            onChange={(e) => store.setInterlaceState({ ...interlaceState, enabled: e.target.checked })}
          />
          <span className="text-[10px] text-purple-400">enabled</span>
        </label>
      </div>
      <div className="flex gap-3 text-[11px] text-gray-400">
        <label className="flex items-center gap-1">
          Interval
          <input
            type="number" min={1} max={16} step={1}
            value={interlaceState.interval}
            onChange={(e) => store.setInterlaceState({ ...interlaceState, interval: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-12 bg-gray-800 border border-gray-700 rounded px-1 text-gray-200 text-center"
          />
        </label>
        <label className="flex items-center gap-1">
          Start iter
          <input
            type="number" min={0} max={64} step={1}
            value={interlaceState.startIter}
            onChange={(e) => store.setInterlaceState({ ...interlaceState, startIter: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-12 bg-gray-800 border border-gray-700 rounded px-1 text-gray-200 text-center"
          />
        </label>
      </div>
      {/* Secondary formula parameters */}
      <FormulaParams
        definition={interlaceState.definition}
        params={interlaceState.params}
        onUpdate={(key, value) => store.setInterlaceState({
          ...interlaceState,
          params: { ...interlaceState.params, [key]: value },
        })}
      />
    </div>
  );
}

/** Donate button: slide-in intro, scale-down outro */
function MeshDonateButton() {
  const clipRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const timerRef = React.useRef(0);
  const isHovered = React.useRef(false);

  const onEnter = React.useCallback(() => {
    isHovered.current = true;
    clearTimeout(timerRef.current);
    const clip = clipRef.current!;
    const img = imgRef.current!;
    // Reset scale instantly (no transition), then slide open
    img.style.transition = 'none';
    img.style.transform = 'scale(1)';
    // Force reflow so the reset takes effect before slide starts
    void clip.offsetHeight;
    clip.style.transition = 'max-height 0.35s ease-out';
    clip.style.maxHeight = '200px';
  }, []);

  const onLeave = React.useCallback(() => {
    isHovered.current = false;
    const clip = clipRef.current!;
    const img = imgRef.current!;
    // Scale down from bottom edge
    img.style.transition = 'transform 0.3s ease-in';
    img.style.transform = 'scale(0) translateY(0)';
    img.style.transformOrigin = 'bottom center';
    // After scale finishes, collapse clip
    timerRef.current = window.setTimeout(() => {
      if (!isHovered.current) {
        clip.style.transition = 'none';
        clip.style.maxHeight = '0';
      }
    }, 310);
  }, []);

  return (
    <div
      className="fixed bottom-5 right-5 z-50 inline-flex flex-col items-stretch"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Clip container sits directly above the button */}
      <div
        ref={clipRef}
        className="overflow-hidden"
        style={{ maxHeight: 0 }}
      >
        <img
          ref={imgRef}
          src="/guy.png"
          alt=""
          className="pointer-events-none object-contain block w-full"
          style={{ transform: 'scale(0)', transformOrigin: 'bottom center' }}
        />
      </div>
      <a
        href="https://www.paypal.com/ncp/payment/WHMZWATKN6GEY"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-white text-[11px] font-bold transition-colors"
      >
        Support GMT
      </a>
    </div>
  );
}

export function MeshExportPage() {
  const iters = useMeshExportStore((s) => s.iters);
  const setIters = useMeshExportStore((s) => s.setIters);

  return (
    <div className="font-mono bg-[#080808] text-gray-200 h-screen flex flex-col overflow-hidden">
      <h1 className="text-sm font-bold text-white tracking-wide px-5 pt-4 pb-2 shrink-0">
        GMT — Fractal Mesh Export
      </h1>

      <div className="flex gap-4 flex-1 min-h-0 px-5 pb-4">
        {/* Left column: export + pipeline + bounds */}
        <div className="flex flex-col gap-2.5 w-[340px] shrink-0 overflow-y-auto pr-1">
          {/* Export controls */}
          <div className="bg-black/60 border border-white/10 rounded p-3">
            <CollapsibleSection label="Export" defaultOpen>
              <ExportPanel />
            </CollapsibleSection>
          </div>

          {/* Pipeline */}
          <div className="bg-black/60 border border-white/10 rounded p-3">
            <PipelineControls />
          </div>

          {/* Bounds */}
          <div className="bg-black/60 border border-white/10 rounded p-3">
            <CollapsibleSection label="Bounds" defaultOpen>
              <BoundsPanel />
            </CollapsibleSection>
          </div>
        </div>

        {/* Center column: preview + progress — fills remaining space */}
        <div className="flex flex-col gap-2.5 flex-1 min-w-0 items-center">
          <PreviewCanvas />
          <ProgressPanel />
        </div>

        {/* Right column: formula + params (like main GMT panel) — pinned right */}
        <div className="flex flex-col gap-2.5 w-[300px] shrink-0 overflow-y-auto pl-1">
          {/* Formula selector + iterations */}
          <div className="bg-black/60 border border-white/10 rounded p-3">
            <CollapsibleSection label="Formula" defaultOpen>
              <div className="flex flex-col gap-2 mt-1">
                <FormulaSelector />
                <ScalarInput
                  label="Iterations"
                  value={iters}
                  onChange={setIters}
                  min={2} max={64} step={1}
                  variant="full"
                />
              </div>
            </CollapsibleSection>
          </div>

          {/* Formula parameters */}
          <div className="bg-black/60 border border-white/10 rounded p-3">
            <CollapsibleSection label="Parameters" defaultOpen>
              <div className="flex flex-col gap-1 mt-1">
                <FormulaParams />
                <InterlaceControls />
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Fixed bottom-right donate button */}
      <MeshDonateButton />
    </div>
  );
}
