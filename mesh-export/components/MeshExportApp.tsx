import React from 'react';
import { MeshExportPage } from './MeshExportPage';

// Import formulas to ensure the formula registry is populated
import '../../formulas';
// Register DDFS features so ShaderFactory.generateMeshSDFLibrary() can run inject() hooks
import { registerFeatures } from '../../features';
registerFeatures();

export function MeshExportApp() {
  return <MeshExportPage />;
}
