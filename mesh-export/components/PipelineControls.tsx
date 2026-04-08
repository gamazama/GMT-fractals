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
  const isVDB = useMeshExportStore((state) => state.exportFormat) === 'vdb';

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
            variant="full"
          />
          <ScalarInput
            label="Fudge Factor"
            value={qs.fudgeFactor}
            onChange={(v) => s.updateQuality('fudgeFactor', v)}
            min={0.01} max={1.0} step={0.01}
            variant="full"
          />
          <ScalarInput
            label="Ray Detail"
            value={qs.detail}
            onChange={(v) => s.updateQuality('detail', v)}
            min={0.1} max={10} step={0.1}
            variant="full"
          />
          <ScalarInput
            label="Pixel Threshold"
            value={qs.pixelThreshold}
            onChange={(v) => s.updateQuality('pixelThreshold', v)}
            min={0.1} max={2.0} step={0.1}
            variant="full"
          />
        </Row>

        {/* SDF — Resolution + shared VDB/mesh settings */}
        <Row label="SDF">
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <GenericDropdown
                label="Resolution"
                value={[32, 64, 128, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096].includes(s.resolution) ? s.resolution : 'custom'}
                options={[
                  ...[32, 64, 128, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096].map((v) => ({ label: `${v}³`, value: v })),
                  ...([32, 64, 128, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096].includes(s.resolution) ? [] : [{ label: `${s.resolution}³ (custom)`, value: s.resolution }]),
                ]}
                onChange={(v) => { if (typeof v === 'number') s.setResolution(v); }}
              />
            </div>
            <input
              type="number"
              min={16} max={8192} step={1}
              value={s.resolution}
              onChange={(e) => {
                const v = Math.max(16, Math.min(8192, parseInt(e.target.value) || 512));
                s.setResolution(v);
              }}
              className="w-[60px] h-[26px] bg-gray-800 border border-gray-700 rounded text-[11px] text-gray-200 text-center font-mono"
              title="Custom resolution (16–8192)"
            />
          </div>
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
          {!isVDB && (
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
          )}
        </Row>

        {/* Mesh-only pipeline stages — hidden for VDB */}
        {!isVDB && (
          <>
            <Row label="Filter">
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
                variant="full"
              />
            </Row>

            <Row label="Newton">
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

            <Row label="Smooth">
              <ScalarInput
                label="Passes"
                value={s.smoothPasses}
                onChange={s.setSmoothPasses}
                min={0} max={50} step={1}
                variant="full"
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

            <Row label="Color">
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
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
