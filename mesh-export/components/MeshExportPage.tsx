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
