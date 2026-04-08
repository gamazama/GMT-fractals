// mesh-pipeline.ts — Mesh generation pipeline & export orchestration
// Converted from prototype pipeline.js to TypeScript
// GMT Fractal Explorer
//
// Provides:
//   runMeshPipeline(params, ui) -> MeshPipelineResult
//   runExportMesh(format, lastMesh, lastBaseName, vdbParams, ui) -> ExportResult

import type { FractalDefinition } from '../../types/fractal';
import type { MeshInterlaceConfig } from '../../engine/SDFShaderBuilder';
import { classifyDEType } from '../../engine/SDFShaderBuilder';
import type { DCMeshResult } from '../algorithms/dc-core';
import type {
  PipelineCallbacks,
  MeshPipelineParams,
  MeshWithColors,
  PipelineTimings,
  MeshPipelineResult,
  ExportResult,
} from './types';

// GPU pipeline functions
import {
  initWebGL,
  setupSDFPipeline,
  sampleDenseGrid,
  sampleSparseGrid,
  coarsePrePass,
  gpuNewtonProject,
  colorizeVerticesGPU,
  sampleEscapeTest,
  generateVDB,
} from '../gpu/gpu-pipeline';

// Sparse grid / narrow-band
import {
  buildNarrowBand,
  dualContourSparse,
  SparseSDFGrid,
} from '../algorithms/sparse-grid';

// Dense dual contouring
import { dualContour } from '../algorithms/dc-core';

// SDF filters
import {
  applyMinFeatureDense,
  applyMinFeatureSparse,
  morphCloseDense,
  morphCloseSparse,
  cavityFillDense,
  cavityFillDilate,
} from '../algorithms/sdf-filter';

// Post-processing
import { postProcessMesh } from '../algorithms/mesh-postprocess';

// Mesh writers
import { exportGLB, exportSTL, estimateExportSize } from '../algorithms/mesh-writers';

// VDB writer (lazy — only used for VDB export path)
import { createTree, addLeafBlock, optimizeTree, serializeVDB } from '../algorithms/vdb-writer';

// GPU pipeline callback adapter type
interface GPUPipelineCallbacks {
  log: (msg: string, type?: string) => void;
  setStatus: (msg: string) => void;
  setProgress: (pct: number) => void;
  setPhase: (name: string, pct: number) => void;
  tick: () => Promise<void>;
  onSlicePreview?: (imageData: ImageData, width: number, height: number) => void;
}

// ============================================================================
// Helper: yield + cancel check
// ============================================================================

function _pipelineTick(ui: PipelineCallbacks): Promise<void> {
  return ui.tick ? ui.tick() : new Promise<void>((r) => setTimeout(r, 0));
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Run the full mesh generation pipeline.
 */
export async function runMeshPipeline(
  params: MeshPipelineParams,
  ui: PipelineCallbacks
): Promise<MeshPipelineResult> {
  const {
    N,
    iters,
    smoothPasses,
    useNewton,
    newtonSteps,
    smoothLambda,
    definition,
    formulaParams,
    power,
    deType,
    deSamples,
    zSubSlices,
    minFeatureSel,
    closingRadius,
    colorSamples,
    colorJitterMul,
    cavityFillMode,
    cavityFillLevel,
    gridMin,
    gridMax,
    boundsRange,
    interlace,
    estimator,
    distanceMetric,
  } = params;

  // effectiveSurfaceThreshold starts from the user setting and may be auto-raised for IFS fractals
  let effectiveSurfaceThreshold: number = params.surfaceThreshold ?? 0;

  // For IFS formulas, estimator=2 (Pseudo Raw = r/dr) produces always-positive DE values —
  // no zero-crossing, so no surface can be found. Override to estimator=1 (Linear Fold 1.0)
  // which has a natural zero-crossing at r=1 for IFS orbits.
  const resolvedDeType = deType === 'auto' ? classifyDEType(definition) : deType as 'power' | 'ifs' | 'custom';
  const meshEstimator = (resolvedDeType === 'ifs' && estimator !== undefined &&
    estimator >= 1.5 && estimator < 2.5)
    ? 1
    : estimator;

  const quality = (meshEstimator !== undefined || distanceMetric !== undefined)
    ? { estimator: meshEstimator ?? 0, distanceMetric: distanceMetric ?? 0 }
    : undefined;

  const gpuCallbacks: GPUPipelineCallbacks = {
    log: ui.log,
    setStatus: ui.setStatus,
    setProgress: ui.setProgress,
    setPhase: ui.setPhase,
    tick: ui.tick,
    onSlicePreview: ui.onSlicePreview,
  };

  const useNarrowBand = N > 256;
  const voxelSize = boundsRange / N;
  const t0 = performance.now();
  let mesh: MeshWithColors | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let tCoarse: number | undefined;
  let tFine: number | undefined;
  let t1 = 0;
  let t2 = 0;
  let t3 = 0;
  let t4 = 0;
  let t5 = 0;
  let tNewton = 0;
  let sparseGrid: SparseSDFGrid | null = null;
  let sdfGrid: Float32Array | null = null;
  let smoothingSkipped = false;

  const formulaName = definition.name || definition.id || 'unknown';
  ui.log('=== Generate: ' + formulaName + ' ===', 'phase');
  ui.log(
    'Resolution: ' + N + '\u00B3 | Iterations: ' + iters +
    ' | DE: ' + deType + ' | SS: ' + deSamples + '\u00B3=' + (deSamples * deSamples * deSamples) +
    (zSubSlices > 1 ? ' | Z-SS: ' + zSubSlices : '') +
    ' | Newton: ' + (useNewton ? newtonSteps + ' steps' : 'off') +
    ' | Smooth: ' + smoothPasses + '\u00D7\u03BB' + smoothLambda +
    (colorSamples > 1 ? ' | Color-SS: ' + colorSamples + '\u00D7r' + colorJitterMul : '') +
    ' | MinFeat: ' + minFeatureSel +
    ' | CavityFill: ' + (cavityFillMode === 'escape' ? 'escape-test' : cavityFillLevel + 'x') +
    ' | Closing: ' + closingRadius,
    'data'
  );
  ui.log('Params: ' + JSON.stringify(formulaParams).substring(0, 200), 'data');
  ui.log(
    'Bounds: min=[' + gridMin[0].toFixed(2) + ',' + gridMin[1].toFixed(2) + ',' + gridMin[2].toFixed(2) +
    '] max=[' + gridMax[0].toFixed(2) + ',' + gridMax[1].toFixed(2) + ',' + gridMax[2].toFixed(2) +
    '] range=' + boundsRange.toFixed(2),
    'data'
  );

  // Iteration efficiency check
  let usefulIters: number;
  if (deType === 'ifs') {
    usefulIters = Math.ceil(Math.log2(boundsRange / voxelSize));
  } else {
    const p = Math.max(power, 2);
    usefulIters = Math.ceil(Math.log(boundsRange / voxelSize) / Math.log(p));
  }
  if (iters > usefulIters + 2) {
    ui.log(
      'Note: At ' + N + '\u00B3 (voxel=' + voxelSize.toFixed(5) + '), ~' + usefulIters +
      ' iterations resolve detail at voxel scale. Using ' + iters +
      ' adds ' + (iters - usefulIters) + ' levels of sub-voxel interior detail. ' +
      'Min Feature filter will clamp this. Consider reducing iterations for faster export.',
      'warn'
    );
  }

  try {

  // ================================================================
  // Phase 1: GPU SDF Sampling
  // ================================================================
  try {
    ui.log('[Phase 1] GPU SDF Sampling', 'phase');
    ui.setPhase('Phase 1: SDF Sampling', 0);
    ui.memAlloc('webgl', 'WebGL', 8, ui.MEM_COLORS.webgl);
    ui.setStatus('Initializing WebGL2...');
    await _pipelineTick(ui);
    gl = initWebGL();
    ui.log('WebGL2 initialized (max texture: ' + gl.getParameter(gl.MAX_TEXTURE_SIZE) + ')', 'info');

    if (useNarrowBand) {
      const coarseN = 128;
      ui.log('Pass 1: Coarse SDF ' + coarseN + '\u00B3 (' + ((coarseN * coarseN * coarseN * 4) / (1024 * 1024)).toFixed(1) + ' MB)', 'info');
      ui.setStatus('Pass 1: Coarse SDF (' + coarseN + '\u00B3)...');
      await _pipelineTick(ui);

      const coarsePipeline = setupSDFPipeline(gl, Math.min(coarseN, 2048), definition, deSamples, ui.log, interlace, quality);
      const coarseMB = Math.round(coarseN * coarseN * coarseN * 4 / (1024 * 1024));
      ui.memAlloc('coarseGrid', 'Coarse SDF', coarseMB, ui.MEM_COLORS.coarseGrid);
      let coarseGrid: Float32Array | null = await sampleDenseGrid(gl, coarsePipeline, coarseN, power, iters, formulaParams, gridMin, gridMax, 0, 10, 1, null, null, gpuCallbacks, interlace, effectiveSurfaceThreshold);
      tCoarse = performance.now();

      let cPos = 0;
      let cNeg = 0;
      let cMin = Infinity;
      for (let di = 0; di < coarseGrid.length; di++) {
        const cv = coarseGrid[di];
        if (cv >= 0) cPos++; else cNeg++;
        if (cv < cMin) cMin = cv;
      }
      ui.log('Coarse: ' + cPos.toLocaleString() + ' outside, ' + cNeg.toLocaleString() + ' inside (' + ((tCoarse - t0) / 1000).toFixed(1) + 's)', 'data');

      // Auto-threshold: IFS/surface fractals have all-positive DE — detect a usable threshold
      // from the coarse min before building the narrow band (which requires negative values).
      if (cNeg === 0 && cMin < 10.0 && effectiveSurfaceThreshold === 0) {
        const coarseVoxelSize = boundsRange / 128;
        const autoThresh = cMin + coarseVoxelSize * 2.0;
        ui.log(
          'Auto-threshold: DE always positive (IFS/surface fractal), min=' + cMin.toFixed(6) +
          ' \u2192 threshold=' + autoThresh.toFixed(6) +
          '. Set \u201CSurface Threshold\u201D in Quality to control shell thickness.',
          'warn'
        );
        for (let di = 0; di < coarseGrid.length; di++) coarseGrid[di] -= autoThresh;
        effectiveSurfaceThreshold = autoThresh;
        // Recount after shift
        cNeg = 0;
        for (let di = 0; di < coarseGrid.length; di++) { if (coarseGrid[di] < 0) cNeg++; }
        ui.log('After auto-threshold: ' + cNeg.toLocaleString() + ' interior coarse cells', 'data');
      } else if (cNeg === 0) {
        ui.log('WARNING: No interior voxels in coarse grid \u2014 surface may not be found', 'warn');
      }

      ui.setStatus('Building narrow band for ' + N + '\u00B3...');
      await _pipelineTick(ui);
      const bandResult = buildNarrowBand(coarseGrid, coarseN, N, 8, 2);
      coarseGrid = null;
      ui.memFree('coarseGrid');
      sparseGrid = bandResult.grid;
      const totalBlocks = Math.pow(N / sparseGrid.blockSize, 3);
      const bandPct = (sparseGrid.allocatedCount / totalBlocks * 100).toFixed(1);
      const sparseMB = Math.round(sparseGrid.memoryMB());
      ui.memAlloc('sparseGrid', 'Sparse SDF', sparseMB, ui.MEM_COLORS.sparseGrid);
      ui.log('Narrow band: ' + sparseGrid.allocatedCount.toLocaleString() + ' blocks (' + bandPct + '% of ' + totalBlocks.toLocaleString() + '), ' + sparseMB + ' MB', 'data');

      ui.log('Pass 2: Fine SDF ' + N + '\u00B3 (narrow-band, ' + sparseGrid.memoryMB().toFixed(0) + ' MB allocated)', 'info');
      ui.setStatus('Pass 2: Fine SDF (' + N + '\u00B3 narrow-band)...');
      await _pipelineTick(ui);

      gl.deleteTexture(coarsePipeline.tex);
      gl.deleteFramebuffer(coarsePipeline.fbo);
      const finePipeline = setupSDFPipeline(gl, Math.min(N, 2048), definition, deSamples, ui.log, interlace, quality);
      await sampleSparseGrid(gl, finePipeline, sparseGrid, power, iters, formulaParams, gridMin, gridMax, 10, 25, gpuCallbacks, interlace, effectiveSurfaceThreshold);

      t1 = performance.now();
      tFine = t1;
      ui.log('Fine sampling done: ' + ((tFine - tCoarse) / 1000).toFixed(1) + 's', 'success');

    } else {
      const gridMemMB = Math.round(N * N * N * 4 / (1024 * 1024));
      ui.memAlloc('sdfGrid', 'SDF Grid', gridMemMB, ui.MEM_COLORS.sdfGrid);
      ui.log('Dense SDF ' + N + '\u00B3 (' + gridMemMB + ' MB grid)', 'info');
      const denseZRange = await coarsePrePass(gl, definition, formulaParams, N, power, iters, gridMin, gridMax, voxelSize, gpuCallbacks, interlace, quality, effectiveSurfaceThreshold);
      const pipeline = setupSDFPipeline(gl, Math.min(N, 2048), definition, deSamples, ui.log, interlace, quality);
      sdfGrid = await sampleDenseGrid(gl, pipeline, N, power, iters, formulaParams, gridMin, gridMax, 0, 35, zSubSlices, denseZRange.zSliceMin, denseZRange.zSliceMax, gpuCallbacks, interlace, effectiveSurfaceThreshold);
      t1 = performance.now();

      let nPos = 0;
      let nNeg = 0;
      let nNan = 0;
      for (let di = 0; di < sdfGrid.length; di++) {
        const sv = sdfGrid[di];
        if (isNaN(sv)) nNan++;
        else if (sv > 0) nPos++;
        else nNeg++;
      }
      ui.log('SDF: ' + nPos.toLocaleString() + ' outside, ' + nNeg.toLocaleString() + ' inside' + (nNan > 0 ? ', ' + nNan + ' NaN!' : '') + ' (' + ((t1 - t0) / 1000).toFixed(1) + 's)', 'data');

      // Auto-threshold for dense path: IFS fractals have all-positive DE
      if (nNeg === 0 && effectiveSurfaceThreshold === 0) {
        let dMin = Infinity;
        for (let di = 0; di < sdfGrid.length; di++) { if (sdfGrid[di] < dMin) dMin = sdfGrid[di]; }
        if (dMin < 10.0) {
          const autoThresh = dMin + voxelSize * 2.0;
          ui.log(
            'Auto-threshold: DE always positive (IFS/surface fractal), min=' + dMin.toFixed(6) +
            ' \u2192 threshold=' + autoThresh.toFixed(6) +
            '. Set \u201CSurface Threshold\u201D in Quality to control shell thickness.',
            'warn'
          );
          for (let di = 0; di < sdfGrid.length; di++) sdfGrid[di] -= autoThresh;
          effectiveSurfaceThreshold = autoThresh;
        }
      }
    }
  } catch (e: unknown) {
    ui.checkCancel();
    const err = e as Error;
    ui.log('PHASE 1 FAILED: ' + err.message, 'error');
    ui.log(err.stack || '', 'error');
    ui.setStatus('Error in SDF sampling: ' + err.message);
    throw e;
  }

  ui.checkCancel();

  // ================================================================
  // Phase 1b: SDF Filtering
  // ================================================================
  let minFeatureThreshold = 0;
  if (minFeatureSel === 'auto') {
    minFeatureThreshold = voxelSize * 1.5;
  } else if (parseFloat(minFeatureSel) > 0) {
    minFeatureThreshold = voxelSize * parseFloat(minFeatureSel);
  }

  {
    let sdfMin = Infinity;
    let sdfMax = -Infinity;
    let negCount = 0;
    let totalCells = 0;
    if (useNarrowBand && sparseGrid) {
      sparseGrid.blocks.forEach((block: Float32Array) => {
        for (let i = 0; i < block.length; i++) {
          const v = block[i];
          if (v < sdfMin) sdfMin = v;
          if (v > sdfMax) sdfMax = v;
          if (v < 0) negCount++;
          totalCells++;
        }
      });
    } else if (sdfGrid) {
      totalCells = sdfGrid.length;
      for (let i = 0; i < sdfGrid.length; i++) {
        const v = sdfGrid[i];
        if (v < sdfMin) sdfMin = v;
        if (v > sdfMax) sdfMax = v;
        if (v < 0) negCount++;
      }
    }
    ui.log(
      'SDF range: [' + sdfMin.toFixed(6) + ', ' + sdfMax.toFixed(6) + '] | ' +
      negCount.toLocaleString() + ' interior cells of ' + totalCells.toLocaleString() +
      ' | threshold=' + (minFeatureThreshold > 0 ? minFeatureThreshold.toFixed(6) : 'off'),
      'data'
    );

    // Auto-threshold for IFS/surface fractals: if the DE is always positive (no interior),
    // create a thin shell by shifting the SDF so the near-surface region becomes interior.
    // This handles fractals like Sierpinski Tetrahedron where the attractor has no 3D volume.
    if (negCount === 0 && sdfMin > 0 && sdfMin < 10.0) {
      const autoThresh = sdfMin + voxelSize * 2.0;
      ui.log(
        'Auto-threshold: no interior found, SDF min=' + sdfMin.toFixed(6) +
        ' → applying threshold ' + autoThresh.toFixed(6) +
        ' (set Surface Threshold manually to control shell thickness)',
        'warn'
      );
      if (useNarrowBand && sparseGrid) {
        sparseGrid.blocks.forEach((block: Float32Array) => {
          for (let i = 0; i < block.length; i++) block[i] -= autoThresh;
        });
      } else if (sdfGrid) {
        for (let i = 0; i < sdfGrid.length; i++) sdfGrid[i] -= autoThresh;
      }
      negCount = useNarrowBand && sparseGrid
        ? (() => { let n = 0; sparseGrid!.blocks.forEach((b: Float32Array) => { for (let i = 0; i < b.length; i++) if (b[i] < 0) n++; }); return n; })()
        : (sdfGrid ? sdfGrid.reduce((n, v) => n + (v < 0 ? 1 : 0), 0) : 0);
      ui.log('After auto-threshold: ' + negCount.toLocaleString() + ' interior cells', 'data');
    }

    if (cavityFillLevel > 0 || minFeatureThreshold > 0 || closingRadius > 0) {
      ui.log('[Phase 1b] SDF Filtering', 'phase');
      ui.setPhase('Phase 1b: SDF Filtering', 0);
      ui.setStatus('Filtering SDF...');
      await _pipelineTick(ui);

      if (cavityFillLevel > 0) {
        if (cavityFillMode === 'escape' && useNarrowBand && sparseGrid && gl) {
          ui.setStatus('Cavity fill (escape test)...');
          ui.setPhase('Phase 1b: Escape Test', 0);
          const escResult = await sampleEscapeTest(gl, sparseGrid, definition, power, iters,
            formulaParams, gridMin, gridMax, gpuCallbacks, (pct: number) => {
              ui.setPhase('Phase 1b: Escape Test', pct);
            }, interlace);
          let escapeFilled = 0;
          sparseGrid.blocks.forEach((block: Float32Array, key: number) => {
            const esc = escResult.escapeMap.get(key);
            if (!esc) return;
            for (let i = 0; i < block.length; i++) {
              if (block[i] >= 0 && (esc[i >> 3] & (1 << (i & 7)))) {
                block[i] = -Math.abs(block[i]) - 0.001;
                escapeFilled++;
              }
            }
          });
          ui.log('Cavity fill (escape test): ' + escResult.solidCount.toLocaleString() +
            ' escape-interior cells, ' + escapeFilled.toLocaleString() + ' positive cells filled', 'data');
        } else if (useNarrowBand && sparseGrid) {
          ui.setStatus('Cavity fill (dilate r=' + cavityFillLevel + ', then flood)...');
          ui.setPhase('Phase 1b: Cavity Fill', 0);
          const cavityResult = await cavityFillDilate(sparseGrid, cavityFillLevel, (pct: number) => {
            ui.setPhase('Phase 1b: Cavity Fill (r=' + cavityFillLevel + ')', pct);
          }, () => { ui.checkCancel(); });
          ui.log('Cavity fill: dilate=' + cavityFillLevel + ' | ' +
            cavityResult.dilated.toLocaleString() + ' dilated, ' +
            cavityResult.filled.toLocaleString() + ' filled solid', 'data');
        } else if (sdfGrid) {
          ui.setStatus('Cavity fill (flood)...');
          ui.setPhase('Phase 1b: Cavity Fill', 0);
          const cavityFilled = await cavityFillDense(sdfGrid, N, (pct: number) => {
            ui.setPhase('Phase 1b: Cavity Fill', pct);
          }, () => { ui.checkCancel(); });
          ui.log('Cavity fill: ' + cavityFilled.toLocaleString() + ' cells filled solid', 'data');
        }
      }

      if (minFeatureThreshold > 0) {
        let clamped: number;
        if (useNarrowBand && sparseGrid) {
          clamped = applyMinFeatureSparse(sparseGrid, minFeatureThreshold);
        } else if (sdfGrid) {
          clamped = applyMinFeatureDense(sdfGrid, N, minFeatureThreshold);
        } else {
          clamped = 0;
        }
        ui.log('Min feature clamp: threshold=' + minFeatureThreshold.toFixed(6) +
          ' (' + (minFeatureThreshold / voxelSize).toFixed(1) + 'x voxel), ' +
          clamped.toLocaleString() + ' cells clamped', 'data');
      }

      if (closingRadius > 0) {
        ui.setStatus('Morphological closing (r=' + closingRadius + ' voxels)...');
        if (useNarrowBand && sparseGrid) {
          await morphCloseSparse(sparseGrid, closingRadius, (pct: number) => {
            ui.setPhase('Phase 1b: Morph Closing', pct);
          });
        } else if (sdfGrid) {
          await morphCloseDense(sdfGrid, N, closingRadius, (pct: number) => {
            ui.setPhase('Phase 1b: Morph Closing', pct);
          });
        }
        ui.log('Morphological closing: radius=' + closingRadius + ' voxels', 'data');
      }

      ui.setPhase('Phase 1b: SDF Filtering', 100);
    }
  }

  ui.checkCancel();

  // ================================================================
  // Phase 2: Dual Contouring
  // ================================================================
  try {
    ui.log('[Phase 2] Dual Contouring', 'phase');
    ui.setPhase('Phase 2: Dual Contouring', 0);
    ui.setProgress(35);
    await _pipelineTick(ui);

    if (useNarrowBand && sparseGrid) {
      ui.setStatus('Dual contouring (sparse, ' + N + '\u00B3)...');
      const dcResult = await dualContourSparse(sparseGrid, gridMin, gridMax, (phase: string, pct: number) => {
        ui.setProgress(35 + Math.round(pct * 0.25));
        ui.setPhase('Phase 2: Dual Contouring', pct);
      });
      mesh = dcResult as MeshWithColors;
    } else if (sdfGrid) {
      ui.setStatus('Dual contouring (' + N + '\u00B3)...');
      const maxDepth = Math.round(Math.log2(N));
      const dcResult = await dualContour(sdfGrid, N, gridMin, gridMax, maxDepth, (phase: string, pct: number) => {
        ui.setProgress(35 + Math.round(pct * 0.25));
        ui.setPhase('Phase 2: Dual Contouring', pct);
      });
      mesh = dcResult as MeshWithColors;
      sdfGrid = null;
      ui.memFree('sdfGrid');
    }

    t2 = performance.now();

    if (!mesh || mesh.vertexCount === 0) {
      ui.log('No surface found \u2014 check parameters and bounds', 'error');
      ui.setStatus('No surface found! Try different parameters.');
      return { mesh: null, timings: null, baseName: '', useNarrowBand, gl };
    }

    ui.log('DC result: ' + mesh.vertexCount.toLocaleString() + ' vertices, ' + mesh.faceCount.toLocaleString() + ' faces (' + ((t2 - t1) / 1000).toFixed(1) + 's)', 'data');

    const meshPosMB = (mesh.positions.byteLength / (1024 * 1024)).toFixed(0);
    const meshNrmMB = (mesh.normals.byteLength / (1024 * 1024)).toFixed(0);
    const meshIdxMB = (mesh.indices.byteLength / (1024 * 1024)).toFixed(0);
    ui.log('Mesh memory: positions=' + meshPosMB + 'MB normals=' + meshNrmMB + 'MB indices=' + meshIdxMB + 'MB (total ' + (parseInt(meshPosMB) + parseInt(meshNrmMB) + parseInt(meshIdxMB)) + 'MB)', 'mem');

    if (sparseGrid) {
      sparseGrid = null;
      ui.memFree('sparseGrid');
      ui.log('Sparse grid freed', 'mem');
    }

    ui.memAlloc('meshPos', 'Positions', parseInt(meshPosMB), ui.MEM_COLORS.meshPos);
    ui.memAlloc('meshNrm', 'Normals', parseInt(meshNrmMB), ui.MEM_COLORS.meshNrm);
    ui.memAlloc('meshIdx', 'Indices', parseInt(meshIdxMB), ui.MEM_COLORS.meshIdx);
    ui.setStatus('Mesh: ' + mesh.vertexCount.toLocaleString() + ' verts, ' + mesh.faceCount.toLocaleString() + ' faces');
    ui.setProgress(60);
    await _pipelineTick(ui);

  } catch (e: unknown) {
    ui.checkCancel();
    const err = e as Error;
    ui.log('PHASE 2 FAILED: ' + err.message, 'error');
    ui.log(err.stack || '', 'error');
    ui.setStatus('Error in dual contouring: ' + err.message);
    throw e;
  }

  ui.checkCancel();

  // ================================================================
  // Phase 3: Newton Projection (GPU only)
  // ================================================================
  tNewton = t2;
  const voxSize = boundsRange / N;

  if (useNewton && mesh && gl) {
    try {
      ui.log('[Phase 3] Newton Projection', 'phase');
      ui.setPhase('Phase 3: Newton Projection', 0);

      ui.log('Mode: GPU (float32, generic formula) \u2014 ' + mesh.vertexCount.toLocaleString() + ' vertices', 'info');
      const texW = Math.ceil(Math.sqrt(mesh.vertexCount));
      ui.log('Newton texture: ' + texW + 'x' + texW + ' (' + (texW * texW * 16 * 3 / (1024 * 1024)).toFixed(0) + ' MB GPU)', 'mem');
      ui.setStatus('GPU Newton projection (' + mesh.vertexCount.toLocaleString() + ' vertices)...');
      ui.setPhase('Phase 3: Newton Projection', 50);
      await _pipelineTick(ui);

      gpuNewtonProject(gl, mesh, definition, formulaParams, power, iters, voxSize, newtonSteps, ui.log, interlace);
      tNewton = performance.now();
      ui.setPhase('Phase 3: Newton Projection', 100);
      ui.log('GPU Newton done: ' + ((tNewton - t2) / 1000).toFixed(1) + 's', 'success');

    } catch (err: unknown) {
      ui.checkCancel();
      tNewton = performance.now();
      const e = err as Error;
      ui.log('Newton FAILED: ' + e.message, 'error');
      ui.log(e.stack || '', 'error');
      ui.setStatus('Newton failed \u2014 continuing without projection');
      await _pipelineTick(ui);
    }
  }
  ui.setProgress(70);

  ui.checkCancel();

  // ================================================================
  // Phase 4: Post-processing
  // ================================================================
  try {
    ui.log('[Phase 4] Post-processing', 'phase');
    ui.setPhase('Phase 4: Post-processing', 0);
    ui.setStatus('Post-processing (smoothing, normals)...');
    await _pipelineTick(ui);

    smoothingSkipped = mesh!.vertexCount > 5_000_000;
    if (smoothingSkipped) {
      ui.log('Large mesh (' + mesh!.vertexCount.toLocaleString() + ' verts) \u2014 smoothing disabled to avoid OOM', 'warn');
    }

    const processed = postProcessMesh(mesh!, {
      smoothing: smoothPasses > 0,
      smoothIterations: smoothPasses,
      lambda: smoothLambda,
    });
    mesh = processed as MeshWithColors;
    t3 = performance.now();
    ui.setPhase('Phase 4: Post-processing', 100);
    ui.log('Post-processing done: ' + ((t3 - tNewton) / 1000).toFixed(1) + 's', 'success');
  } catch (e: unknown) {
    ui.checkCancel();
    t3 = performance.now();
    const err = e as Error;
    ui.log('PHASE 4 FAILED: ' + err.message, 'error');
    ui.log(err.stack || '', 'error');
    ui.setStatus('Error in post-processing: ' + err.message);
    throw e;
  }
  ui.setProgress(80);

  ui.checkCancel();

  // ================================================================
  // Phase 5: Vertex Coloring (GPU)
  // ================================================================
  try {
    ui.log('[Phase 5] Vertex Coloring', 'phase');
    ui.setPhase('Phase 5: Vertex Coloring', 0);
    ui.setStatus('Colorizing vertices...');
    await _pipelineTick(ui);

    if (!gl || gl.isContextLost()) {
      ui.log('Re-initializing WebGL for colorizer', 'warn');
      gl = initWebGL();
    }

    const colorJitterRadius = voxelSize * colorJitterMul;
    mesh!.colors = await colorizeVerticesGPU(gl, mesh!, definition, formulaParams, power, iters, colorSamples, colorJitterRadius, gpuCallbacks, interlace);
    t4 = performance.now();
    ui.setPhase('Phase 5: Vertex Coloring', 100);
    const colorMB = (mesh!.vertexCount * 3 / (1024 * 1024)).toFixed(1);
    ui.memAlloc('meshCol', 'Colors', parseFloat(colorMB), ui.MEM_COLORS.meshCol);
    ui.log('Coloring done: ' + ((t4 - t3) / 1000).toFixed(1) + 's' + (colorSamples > 1 ? ' (' + colorSamples + ' samples)' : ''), 'success');
  } catch (e: unknown) {
    ui.checkCancel();
    t4 = performance.now();
    const err = e as Error;
    ui.log('PHASE 5 FAILED: ' + err.message, 'error');
    ui.log(err.stack || '', 'error');
    ui.log('Continuing without vertex colors', 'warn');
  }
  ui.setProgress(90);

  ui.checkCancel();

  // ================================================================
  // Done
  // ================================================================
  t5 = performance.now();
  ui.setProgress(100);
  ui.setPhase('Complete', 100);
  ui.setStatus('Done \u2014 choose format and export');

  const totalSec = ((t5 - t0) / 1000).toFixed(1);
  ui.log('=== Complete in ' + totalSec + 's ===', 'phase');

  const baseName = (definition.name || definition.id || 'fractal').toLowerCase().replace(/\s+/g, '-');

  const timings: PipelineTimings = {
    total: t5 - t0,
    sdf: t1 - t0,
    coarse: tCoarse ? tCoarse - t0 : 0,
    fine: tFine && tCoarse ? tFine - tCoarse : 0,
    dc: t2 - t1,
    newton: tNewton - t2,
    post: t3 - tNewton,
    color: t4 - t3,
  };

  return {
    mesh,
    baseName,
    smoothingSkipped,
    timings,
    useNarrowBand,
    gl,
  };

  } catch (e) {
    // Clean up GL on error
    if (gl) {
      try {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (_ignore) { /* noop */ }
    }
    throw e;
  }
}

// ============================================================================
// Export
// ============================================================================

/** VDB-specific export parameters */
export interface VDBExportParams {
  definition: FractalDefinition;
  formulaParams: Record<string, any>;
  N: number;
  iters: number;
  power: number;
  gridMin: [number, number, number];
  gridMax: [number, number, number];
  deSamples: number;
  zSubSlices: number;
  interlace?: MeshInterlaceConfig;
  estimator?: number;
  distanceMetric?: number;
  surfaceThreshold?: number;
}

/**
 * Encode mesh to file format.
 * @param format - 'glb', 'stl', or 'vdb'
 * @param lastMesh - mesh from runMeshPipeline (null for VDB)
 * @param lastBaseName - filename base
 * @param vdbParams - VDB-specific params (only used when format === 'vdb')
 * @param ui - UI callbacks
 */
export async function runExportMesh(
  format: string,
  lastMesh: MeshWithColors | null,
  lastBaseName: string,
  vdbParams: VDBExportParams,
  ui: PipelineCallbacks
): Promise<ExportResult> {
  const t0 = performance.now();
  let blob: Blob;
  let filename: string;

  ui.log('[Export] Encoding ' + format.toUpperCase() + '...', 'phase');
  ui.setStatus('Encoding ' + format.toUpperCase() + '...');
  ui.setPhase('Export ' + format.toUpperCase(), 0);

  if (format === 'vdb') {
    const {
      definition,
      formulaParams,
      N: vdbN,
      iters: vdbIters,
      power: vdbPower,
      gridMin: vdbMin,
      gridMax: vdbMax,
      deSamples: vdbDeSamples,
      zSubSlices: vdbZSubSlices,
      interlace: vdbInterlace,
      estimator: vdbEstimator,
      distanceMetric: vdbDistanceMetric,
      surfaceThreshold: vdbSurfaceThreshold,
    } = vdbParams;

    const vdbQuality = (vdbEstimator !== undefined || vdbDistanceMetric !== undefined)
      ? { estimator: vdbEstimator ?? 0, distanceMetric: vdbDistanceMetric ?? 0 }
      : undefined;

    const formulaName = definition.name || definition.id || 'unknown';
    ui.log('=== VDB Export: ' + formulaName + ' ===', 'phase');
    ui.log('Resolution: ' + vdbN + '\u00B3 | Iterations: ' + vdbIters + ' | Mode: solid | Z Sub-slices: ' + vdbZSubSlices, 'data');

    const gl = initWebGL();
    const vdbGpuCallbacks: GPUPipelineCallbacks = {
      log: ui.log,
      setStatus: ui.setStatus,
      setProgress: ui.setProgress,
      setPhase: ui.setPhase,
      tick: ui.tick,
      onSlicePreview: ui.onSlicePreview,
    };
    const vdbResult = await generateVDB(gl, definition, formulaParams, vdbN, vdbPower, vdbIters,
      vdbMin, vdbMax, 'solid', vdbDeSamples, vdbZSubSlices, vdbGpuCallbacks, vdbInterlace, vdbQuality, vdbSurfaceThreshold);
    try {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } catch (_ignore) { /* noop */ }

    blob = vdbResult.blob;
    filename = (definition.name || definition.id || 'fractal')
      .toLowerCase().replace(/\s+/g, '-') + '.vdb';
    ui.log('VDB: ' + vdbResult.voxelCount.toLocaleString() + ' active voxels, ' +
      vdbResult.leafCount + ' leaf blocks' +
      (vdbResult.promoted.promotedLeaves ? ', ' + vdbResult.promoted.promotedLeaves + ' tiles promoted' : '') +
      (vdbResult.skippedSlices > 0 ? ', ' + vdbResult.skippedSlices + ' empty slices skipped' : ''), 'data');
  } else if (format === 'glb') {
    const estBytes = estimateExportSize(lastMesh!, format);
    ui.log('Estimated size: ~' + (estBytes / (1024 * 1024)).toFixed(0) + ' MB', 'mem');
    blob = exportGLB(lastMesh!);
    filename = lastBaseName + '.glb';
    ui.setPhase('Export GLB', 100);
  } else {
    const estBytes = estimateExportSize(lastMesh!, format);
    ui.log('Estimated size: ~' + (estBytes / (1024 * 1024)).toFixed(0) + ' MB', 'mem');
    blob = await exportSTL(lastMesh!, (pct: number) => {
      ui.setPhase('Export STL', pct);
      ui.setStatus('Encoding STL... ' + pct + '%');
    });
    filename = lastBaseName + '.stl';
  }

  const t1 = performance.now();
  const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
  ui.memAlloc('exportBlob', format.toUpperCase() + ' Blob', parseFloat(sizeMB), ui.MEM_COLORS.exportBlob);
  ui.log('Export: ' + sizeMB + ' MB ' + format.toUpperCase() + ' (' + ((t1 - t0) / 1000).toFixed(1) + 's)', 'success');
  ui.setStatus(sizeMB + ' MB ' + format.toUpperCase() + ' ready');
  ui.setPhase('Export complete', 100);

  return { blob, filename };
}
