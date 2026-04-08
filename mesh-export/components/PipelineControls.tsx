import React from 'react';
import { useMeshExportStore } from '../store/meshExportStore';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { GenericDropdown } from '../../components/GenericDropdown';
import { GenericToggleSwitch } from '../../components/GenericToggleSwitch';
import { ScalarInput } from '../../components/inputs/ScalarInput';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-px border-t border-white/5 first:border-t-0 pt-1 first:pt-0">
      <span className="text-[9px] text-gray-500 uppercase tracking-wide px-0.5 mb-0.5">{label}</span>
      {children}
    </div>
  );
}

export function PipelineControls() {
  const s = useMeshExportStore();
  const qs = useMeshExportStore((state) => state.qualitySettings);

  return (
    <CollapsibleSection label="Pipeline" defaultOpen>
      <div className="flex flex-col gap-1">
        {/* Quality */}
        <Row label="Quality">
          <GenericDropdown
            label="Estimator"
            value={qs.estimator}
            options={[
              { label: 'Analytic (Log)', value: 0 },
              { label: 'Linear (Fold 1.0)', value: 1 },
              { label: 'Pseudo (Raw)', value: 2 },
              { label: 'Dampened', value: 3 },
              { label: 'Linear (Fold 2.0)', value: 4 },
            ]}
            onChange={(v) => s.updateQuality('estimator', v)}
          />
          <GenericDropdown
            label="Distance Metric"
            value={qs.distanceMetric}
            options={[
              { label: 'Euclidean (Sphere)', value: 0 },
              { label: 'Chebyshev (Box)', value: 1 },
              { label: 'Manhattan (Diamond)', value: 2 },
              { label: 'Minkowski 4 (Rounded)', value: 3 },
            ]}
            onChange={(v) => s.updateQuality('distanceMetric', v)}
          />
          <ScalarInput
            label="Surface Threshold"
            value={qs.surfaceThreshold}
            onChange={(v) => s.updateQuality('surfaceThreshold', v)}
            min={0} max={2} step={0.001}
            variant="compact"
          />
          <ScalarInput
            label="Fudge Factor"
            value={qs.fudgeFactor}
            onChange={(v) => s.updateQuality('fudgeFactor', v)}
            min={0.01} max={1.0} step={0.01}
            variant="compact"
          />
          <ScalarInput
            label="Ray Detail"
            value={qs.detail}
            onChange={(v) => s.updateQuality('detail', v)}
            min={0.1} max={10} step={0.1}
            variant="compact"
          />
          <ScalarInput
            label="Pixel Threshold"
            value={qs.pixelThreshold}
            onChange={(v) => s.updateQuality('pixelThreshold', v)}
            min={0.1} max={2.0} step={0.1}
            variant="compact"
          />
        </Row>

        {/* SDF */}
        <Row label="1 · SDF">
          <GenericDropdown
            label="Resolution"
            value={s.resolution}
            options={[32, 64, 128, 256, 384, 512, 768, 1024, 1536, 2048].map((v) => ({ label: `${v}³`, value: v }))}
            onChange={s.setResolution}
          />
          <ScalarInput
            label="Iterations"
            value={s.iters}
            onChange={s.setIters}
            min={2} max={64} step={1}
            variant="full"
          />
          <GenericDropdown
            label="DE Type"
            value={s.deType}
            options={[
              { label: 'Auto', value: 'auto' },
              { label: 'Power', value: 'power' },
              { label: 'IFS', value: 'ifs' },
            ]}
            onChange={s.setDeType}
          />
          <GenericDropdown
            label="DE Samples"
            value={s.deSamples}
            options={[
              { label: '1', value: 1 },
              { label: '2³ = 8', value: 2 },
              { label: '3³ = 27', value: 3 },
              { label: '4³ = 64', value: 4 },
            ]}
            onChange={s.setDeSamples}
          />
          <GenericDropdown
            label="Z Sub-slices"
            value={s.zSubSlices}
            options={[1, 2, 4, 8, 16].map((v) => ({ label: v === 1 ? 'off' : String(v), value: v }))}
            onChange={s.setZSubSlices}
          />
        </Row>

        {/* Filter */}
        <Row label="2 · Filter">
          <GenericDropdown
            label="Min Feature"
            value={s.minFeature}
            options={[
              { label: 'Auto', value: 'auto' },
              { label: 'Off', value: 'off' },
              { label: '1x voxel', value: '1' },
              { label: '1.5x', value: '1.5' },
              { label: '2x', value: '2' },
              { label: '3x', value: '3' },
              { label: '5x', value: '5' },
            ]}
            onChange={s.setMinFeature}
          />
          <GenericDropdown
            label="Cavity Fill"
            value={s.cavityFill}
            options={[
              { label: 'Off', value: 'off' },
              { label: 'Dilate 1', value: '1' },
              { label: 'Dilate 2', value: '2' },
              { label: 'Dilate 4', value: '4' },
              { label: 'Dilate 8', value: '8' },
              { label: 'Dilate 16', value: '16' },
              { label: 'Escape Test', value: 'escape' },
            ]}
            onChange={s.setCavityFill}
          />
          <ScalarInput
            label="Closing"
            value={s.closingRadius}
            onChange={s.setClosingRadius}
            min={0} max={20} step={0.5}
            variant="compact"
          />
        </Row>

        {/* Newton */}
        <Row label="3 · Newton">
          <GenericToggleSwitch
            label="Newton Projection"
            value={s.newton}
            onChange={s.setNewton}
          />
          <GenericDropdown
            label="Steps"
            value={s.newtonSteps}
            options={[2, 4, 6, 8, 12, 16].map((v) => ({ label: String(v), value: v }))}
            onChange={s.setNewtonSteps}
            disabled={!s.newton}
          />
        </Row>

        {/* Smooth */}
        <Row label="4 · Smooth">
          <ScalarInput
            label="Passes"
            value={s.smoothPasses}
            onChange={s.setSmoothPasses}
            min={0} max={50} step={1}
            variant="compact"
          />
          <GenericDropdown
            label="Lambda"
            value={s.smoothLambda}
            options={[
              { label: '0.3 (gentle)', value: 0.3 },
              { label: '0.5 (standard)', value: 0.5 },
              { label: '0.7 (strong)', value: 0.7 },
            ]}
            onChange={s.setSmoothLambda}
          />
        </Row>

        {/* Color */}
        <Row label="5 · Color">
          <GenericDropdown
            label="Samples"
            value={s.colorSamples}
            options={[1, 4, 8, 16, 32, 64, 128, 256].map((v) => ({ label: v === 1 ? 'off' : String(v), value: v }))}
            onChange={s.setColorSamples}
          />
          <GenericDropdown
            label="Jitter Radius"
            value={s.colorJitter}
            options={[0.25, 0.5, 1, 2].map((v) => ({ label: `${v}x`, value: v }))}
            onChange={s.setColorJitter}
          />
        </Row>
      </div>
    </CollapsibleSection>
  );
}
