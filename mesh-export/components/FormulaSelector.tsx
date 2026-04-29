import React, { useRef } from 'react';
import { useMeshExportStore, DEFAULT_QUALITY } from '../store/meshExportStore';
import { registry } from '../../engine-gmt/engine/FractalRegistry';
import { loadGMFScene } from '../../engine-gmt/utils/FormulaFormat';
import { GenericDropdown } from '../../components/GenericDropdown';
import type { FractalDefinition } from '../../engine-gmt/types/fractal';
import type { FormulaType } from '../../types';

/** Build default parameter values from a FractalDefinition, including Julia from defaultPreset */
export function buildDefaultParams(def: FractalDefinition): Record<string, any> {
  const params: Record<string, any> = {};
  for (const p of def.parameters) {
    if (!p) continue;
    params[p.id] = p.default;
  }
  // Extract Julia params from defaultPreset geometry
  const geometry = (def.defaultPreset as any)?.features?.geometry;
  if (geometry) {
    if (geometry.juliaMode) params.juliaMode = 1;
    if (geometry.juliaX !== undefined || geometry.juliaY !== undefined || geometry.juliaZ !== undefined) {
      params.julia = { x: geometry.juliaX ?? 0, y: geometry.juliaY ?? 0, z: geometry.juliaZ ?? 0 };
    }
  }
  // Also pull coreMath overrides from defaultPreset (iterations, param values)
  const coreMath = (def.defaultPreset as any)?.features?.coreMath;
  if (coreMath) {
    for (const p of def.parameters) {
      if (!p) continue;
      if (coreMath[p.id] !== undefined) params[p.id] = coreMath[p.id];
    }
  }
  return params;
}

/**
 * Load a GMF string into the mesh export store.
 * Shared between file loader and auto-load from main app.
 */
export function loadGMFIntoStore(text: string, filename?: string): void {
  const store = useMeshExportStore.getState();
  const { def, preset } = loadGMFScene(text);
  if (!def) throw new Error('No formula definition found in GMF');

  store.setSelectedFormula(def.id);
  store.setLoadedDefinition(def);
  store.setLoadedFilename(filename ?? null);
  store.setLoadError(null);

  const params: Record<string, any> = {};
  const coreMath = preset?.features?.coreMath;
  for (const p of def.parameters) {
    if (!p) continue;
    if (coreMath && coreMath[p.id] !== undefined) {
      params[p.id] = coreMath[p.id];
    } else {
      params[p.id] = p.default;
    }
  }
  store.setFormulaParams(params);

  if (coreMath?.iterations !== undefined) {
    store.setIters(Math.round(coreMath.iterations));
  }

  // Extract Julia params from geometry feature
  const geometry = preset?.features?.geometry;
  if (geometry) {
    if (geometry.juliaMode) params.juliaMode = 1;
    if (geometry.juliaX !== undefined || geometry.juliaY !== undefined || geometry.juliaZ !== undefined) {
      params.julia = { x: geometry.juliaX ?? 0, y: geometry.juliaY ?? 0, z: geometry.juliaZ ?? 0 };
    }
    store.setFormulaParams(params);
  }

  const quality = preset?.features?.quality;
  if (quality) {
    store.setQualitySettings({
      estimator: quality.estimator ?? 0,
      distanceMetric: quality.distanceMetric ?? 0,
      surfaceThreshold: 0.0,
      fudgeFactor: quality.fudgeFactor ?? 1.0,
      detail: quality.detail ?? 1.0,
      pixelThreshold: quality.pixelThreshold ?? 0.5,
    });
    if (quality.distanceMetric !== undefined) {
      params.distanceMetric = quality.distanceMetric;
      store.setFormulaParams(params);
    }
  } else {
    store.setQualitySettings({ ...DEFAULT_QUALITY });
  }

  const ilState = preset?.features?.interlace;
  if (ilState?.interlaceCompiled && ilState?.interlaceFormula) {
    const ilDef = registry.get(ilState.interlaceFormula as FormulaType);
    if (ilDef) {
      const ilParams: Record<string, any> = {};
      for (const p of ilDef.parameters) {
        if (!p) continue;
        const ilKey = 'interlace' + p.id.charAt(0).toUpperCase() + p.id.slice(1);
        if (ilState[ilKey] !== undefined) {
          ilParams[p.id] = ilState[ilKey];
        } else {
          ilParams[p.id] = p.default;
        }
      }
      store.setInterlaceState({
        definition: ilDef,
        params: ilParams,
        enabled: ilState.interlaceEnabled !== false,
        interval: ilState.interlaceInterval ?? 2,
        startIter: ilState.interlaceStartIter ?? 0,
      });
    } else {
      store.setInterlaceState(null);
    }
  } else {
    store.setInterlaceState(null);
  }
}

export const FormulaSelector: React.FC = () => {
  const store = useMeshExportStore();
  const loadedFilename = useMeshExportStore((s) => s.loadedFilename);
  const loadError = useMeshExportStore((s) => s.loadError);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allFormulas = registry.getAll();

  const options = allFormulas.map((def) => ({ label: def.name, value: def.id }));

  const confirmReset = (): boolean => {
    const s = useMeshExportStore.getState();
    if (s.lastMesh || s.lastBlob) {
      return window.confirm('Changing formula will clear the current mesh and export data. Continue?');
    }
    return true;
  };

  const handleSelect = (id: string) => {
    if (!confirmReset()) return;
    store.resetMeshResult();
    store.setSelectedFormula(id);
    const def = registry.get(id);
    if (def) {
      store.setLoadedDefinition(def);
      store.setFormulaParams(buildDefaultParams(def));
      store.setInterlaceState(null);
      store.setLoadedFilename(null);
      store.setLoadError(null);
      // Load quality settings from formula's defaultPreset if available
      const presetQuality = (def.defaultPreset as any)?.features?.quality;
      store.setQualitySettings(presetQuality ? {
        estimator: presetQuality.estimator ?? DEFAULT_QUALITY.estimator,
        distanceMetric: presetQuality.distanceMetric ?? DEFAULT_QUALITY.distanceMetric,
        surfaceThreshold: DEFAULT_QUALITY.surfaceThreshold,
        fudgeFactor: presetQuality.fudgeFactor ?? DEFAULT_QUALITY.fudgeFactor,
        detail: presetQuality.detail ?? DEFAULT_QUALITY.detail,
        pixelThreshold: presetQuality.pixelThreshold ?? DEFAULT_QUALITY.pixelThreshold,
      } : { ...DEFAULT_QUALITY });
    }
  };

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirmReset()) { e.target.value = ''; return; }
    store.resetMeshResult();
    store.setLoadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadGMFIntoStore(reader.result as string, file.name);
      } catch (err) {
        console.error('Failed to load GMF file:', err);
        store.setLoadError('Failed to parse GMF: ' + (err as Error).message);
        store.setLoadedFilename(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-1.5">
      <GenericDropdown
        value={store.selectedFormulaId}
        options={options}
        onChange={handleSelect}
        fullWidth
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="text-[11px] px-3 py-1.5 bg-sky-800/60 text-sky-200 border border-sky-600/40 rounded hover:bg-sky-700/60 cursor-pointer font-mono"
      >
        Load GMF...
      </button>
      {loadedFilename && (
        <div className="text-[10px] text-gray-400 truncate px-0.5" title={loadedFilename}>
          {loadedFilename}
        </div>
      )}
      {loadError && (
        <div className="text-[10px] text-red-400 bg-red-900/20 px-2 py-1 rounded">
          {loadError}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".gmf"
        className="hidden"
        onChange={handleFileLoad}
      />
    </div>
  );
};
