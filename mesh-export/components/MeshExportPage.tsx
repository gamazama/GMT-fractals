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

export function MeshExportPage() {
  return (
    <div className="font-mono bg-[#080808] text-gray-200 h-screen flex flex-col overflow-hidden">
      <h1 className="text-sm font-bold text-white tracking-wide px-5 pt-4 pb-2 shrink-0">
        GMT — Fractal Mesh Export
      </h1>

      <div className="flex gap-4 flex-1 min-h-0 px-5 pb-4">
        {/* Left column: controls — scrollable */}
        <div className="flex flex-col gap-2.5 w-[340px] shrink-0 overflow-y-auto pr-1">
          {/* Formula */}
          <div className="bg-black/60 border border-white/10 rounded p-3">
            <CollapsibleSection label="Formula" defaultOpen>
              <div className="flex flex-col gap-2 mt-1">
                <FormulaSelector />
                <FormulaParams />
                <InterlaceControls />
              </div>
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

        {/* Right column: export + preview + progress — separate scroll */}
        <div className="flex flex-col gap-2.5 flex-1 min-w-[520px] overflow-y-auto">
          {/* Export controls at top */}
          <div className="bg-black/60 border border-white/10 rounded p-3">
            <CollapsibleSection label="Export" defaultOpen>
              <ExportPanel />
            </CollapsibleSection>
          </div>

          <PreviewCanvas />
          <ProgressPanel />
        </div>
      </div>
    </div>
  );
}
