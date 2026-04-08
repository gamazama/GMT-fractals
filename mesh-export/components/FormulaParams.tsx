import React from 'react';
import { useMeshExportStore } from '../store/meshExportStore';
import { ScalarInput } from '../../components/inputs/ScalarInput';
import { VectorInput } from '../../components/inputs/VectorInput';
import { GenericToggleSwitch } from '../../components/GenericToggleSwitch';
import type { FractalDefinition, FractalParameter } from '../../types/fractal';

interface FormulaParamsProps {
  /** Override definition (for interlace secondary formula) */
  definition?: FractalDefinition;
  /** Override params (for interlace secondary formula) */
  params?: Record<string, any>;
  /** Override update callback (for interlace secondary formula) */
  onUpdate?: (key: string, value: any) => void;
}

export const FormulaParams: React.FC<FormulaParamsProps> = ({ definition, params, onUpdate }) => {
  const storeDefinition = useMeshExportStore((s) => s.loadedDefinition);
  const storeParams = useMeshExportStore((s) => s.formulaParams);
  const storeUpdate = useMeshExportStore((s) => s.updateParam);

  const activeDef = definition || storeDefinition;
  const activeParams = params || storeParams;
  const activeUpdate = onUpdate || storeUpdate;

  if (!activeDef) return null;

  const paramList = activeDef.parameters.filter((p): p is FractalParameter => p !== null);
  if (paramList.length === 0) return null;

  return (
    <div className="flex flex-col gap-px">
      {paramList.map((param) => {
        const value = activeParams[param.id];
        const pType = param.type || 'float';

        // Boolean toggle
        if (param.mode === 'toggle') {
          const boolVal = value ? (typeof value === 'number' ? value > 0 : !!value) : false;
          return (
            <GenericToggleSwitch
              key={param.id}
              label={param.label}
              value={boolVal}
              onChange={(v) => activeUpdate(param.id, v ? 1 : 0)}
            />
          );
        }

        // Vec2/Vec3/Vec4
        if (pType === 'vec2' || pType === 'vec3' || pType === 'vec4') {
          const axes = pType === 'vec2' ? ['X', 'Y'] : pType === 'vec3' ? ['X', 'Y', 'Z'] : ['X', 'Y', 'Z', 'W'];
          const current = value ?? param.default ?? { x: 0, y: 0, z: 0, w: 0 };
          return (
            <VectorInput
              key={param.id}
              label={param.label}
              value={current}
              onChange={(v) => activeUpdate(param.id, v)}
              axisConfig={{
                min: param.min,
                max: param.max,
                step: param.step || 0.01,
              }}
              showDualAxisPads={pType !== 'vec2'}
            />
          );
        }

        // Float (default) — ScalarInput with track
        return (
          <ScalarInput
            key={param.id}
            label={param.label}
            value={(value as number) ?? param.default ?? 0}
            onChange={(v) => activeUpdate(param.id, v)}
            min={param.min}
            max={param.max}
            step={param.step || 0.01}
            defaultValue={param.default as number}
            variant="full"
          />
        );
      })}
    </div>
  );
};
