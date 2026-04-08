import React, { useEffect, useRef } from 'react';
import { MeshExportPage } from './MeshExportPage';
import { loadGMFIntoStore, buildDefaultParams } from './FormulaSelector';
import { useMeshExportStore } from '../store/meshExportStore';
import { registry } from '../../engine/FractalRegistry';

// Import formulas to ensure the formula registry is populated
import '../../formulas';
// Register DDFS features so ShaderFactory.generateMeshSDFLibrary() can run inject() hooks
import { registerFeatures } from '../../features';
registerFeatures();

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
