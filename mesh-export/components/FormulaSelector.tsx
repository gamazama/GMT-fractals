import React, { useRef } from 'react';
import { useMeshExportStore } from '../store/meshExportStore';
import { registry } from '../../engine/FractalRegistry';
import { loadGMFScene } from '../../utils/FormulaFormat';
import { GenericDropdown } from '../../components/GenericDropdown';
import type { FractalDefinition } from '../../types/fractal';

/** Build default parameter values from a FractalDefinition */
function buildDefaultParams(def: FractalDefinition): Record<string, any> {
  const params: Record<string, any> = {};
  for (const p of def.parameters) {
    if (!p) continue;
    params[p.id] = p.default;
  }
  return params;
}

export const FormulaSelector: React.FC = () => {
  const store = useMeshExportStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allFormulas = registry.getAll();

  const options = [
    ...allFormulas.map((def) => ({ label: def.name, value: def.id })),
    { label: 'Load GMF file...', value: '__gmf__' },
  ];

  const handleSelect = (id: string) => {
    if (id === '__gmf__') {
      fileInputRef.current?.click();
      return;
    }

    store.setSelectedFormula(id);
    const def = registry.get(id);
    if (def) {
      store.setLoadedDefinition(def);
      store.setFormulaParams(buildDefaultParams(def));
    }
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const { def, preset } = loadGMFScene(text);
        if (def) {
          store.setSelectedFormula(def.id);
          store.setLoadedDefinition(def);

          const params: Record<string, any> = {};
          const featureParams = preset?.features?.formula?.params;
          if (featureParams) {
            for (const p of def.parameters) {
              if (!p) continue;
              const key = p.id.replace('param', '').replace('vec2', '').replace('vec3', '').replace('vec4', '');
              if (featureParams[key] !== undefined) {
                params[p.id] = featureParams[key];
              } else {
                params[p.id] = p.default;
              }
            }
          } else {
            for (const p of def.parameters) {
              if (!p) continue;
              params[p.id] = p.default;
            }
          }
          store.setFormulaParams(params);
        }
      } catch (err) {
        console.error('Failed to load GMF file:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <GenericDropdown
        value={store.selectedFormulaId}
        options={options}
        onChange={handleSelect}
        fullWidth
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".gmf"
        className="hidden"
        onChange={handleFileLoad}
      />
    </>
  );
};
