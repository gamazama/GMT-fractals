import React, { useEffect, useRef } from 'react';
import { MeshExportPage } from './MeshExportPage';
import { loadGMFIntoStore, buildDefaultParams } from './FormulaSelector';
import { useMeshExportStore } from '../store/meshExportStore';
import { registry } from '../../engine-gmt/engine/FractalRegistry';

// Side-effect: registers all 26 GMT DDFS features and 42 formulas into the
// shared registries. Mirrors app-gmt's boot sequence — must run before
// ShaderFactory.generateMeshSDFLibrary() touches feature inject() hooks.
import '../../app-gmt/registerFeatures';

export function MeshExportApp() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    // Try auto-load from main app first
    try {
      const gmf = localStorage.getItem('gmt-mesh-export-scene');
      if (gmf) {
        localStorage.removeItem('gmt-mesh-export-scene');
        loadGMFIntoStore(gmf, '(from main app)');
        return;
      }
    } catch (e) {
      console.warn('[MeshExport] Auto-load from main app failed:', e);
    }

    // Otherwise initialize the default formula so the preview works on first load
    const state = useMeshExportStore.getState();
    if (!state.loadedDefinition) {
      const def = registry.get(state.selectedFormulaId);
      if (def) {
        state.setLoadedDefinition(def);
        state.setFormulaParams(buildDefaultParams(def));
      }
    }
  }, []);

  return <MeshExportPage />;
}
