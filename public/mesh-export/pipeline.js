// pipeline.js — Mesh generation pipeline & export orchestration
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — mesh export prototype
//
// Provides:
//   runMeshPipeline(params, ui) → { mesh, timings, baseName }
//   runExportMesh(format, lastMesh, lastBaseName, params, ui) → { blob, filename }
//
// All UI interaction is via the `ui` callback object — no DOM access here.
// The `ui` object must provide:
//   ui.setStatus(msg), ui.setProgress(pct), ui.setPhase(name, pct)
//   ui.log(msg, type), ui.memAlloc(id, label, mb, color), ui.memFree(id)
//   ui.tick() → Promise (yields + cancel check)
//   ui.checkCancel() — throws if cancelled
//   ui.MEM_COLORS — color map object

// ============================================================================
// Helper: yield + cancel check
// ============================================================================

function _pipelineTick(ui) {
  return ui.tick ? ui.tick() : new Promise(function(r) { setTimeout(r, 0); });
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Run the full mesh generation pipeline.
 * @param {object} params - pipeline parameters:
 *   N, iters, smoothPasses, useNewton, newtonSteps, smoothLambda,
 *   config, formulaParams, power, deType, deSamples, zSubSlices,
 *   minFeatureSel, closingRadius, colorSamples, colorJitterMul,
 *   cavityFillMode, cavityFillLevel, gridMin, gridMax, boundsRange
 * @param {object} ui - UI callback object (see header)
 * @returns {{ mesh, timings, baseName }}
 */
async function runMeshPipeline(params, ui) {
  var N = params.N;
  var iters = params.iters;
  var smoothPasses = params.smoothPasses;
  var useNewton = params.useNewton;
  var newtonSteps = params.newtonSteps;
  var smoothLambda = params.smoothLambda;
  var config = params.config;
  var formulaParams = params.formulaParams;
  var power = params.power;
  var deType = params.deType;
  var deSamples = params.deSamples;
  var zSubSlices = params.zSubSlices;
  var minFeatureSel = params.minFeatureSel;
  var closingRadius = params.closingRadius;
  var colorSamples = params.colorSamples;
  var colorJitterMul = params.colorJitterMul;
  var cavityFillMode = params.cavityFillMode;
  var cavityFillLevel = params.cavityFillLevel;
  var gridMin = params.gridMin;
  var gridMax = params.gridMax;
  var boundsRange = params.boundsRange;

  var useNarrowBand = N > 256;
  var voxelSize = boundsRange / N;
  var t0 = performance.now();
  var mesh, gl;
  var tCoarse, tFine, t1, t2, t3, t4, t5, tNewton;
  var sparseGrid = null;
  var sdfGrid = null;

  var formulaName = config.metadata.name || config.metadata.id || 'unknown';
  ui.log('=== Generate: ' + formulaName + ' ===', 'phase');
  ui.log('Resolution: ' + N + '\u00B3 | Iterations: ' + iters + ' | DE: ' + deType + ' | SS: ' + deSamples + '\u00B3=' + (deSamples * deSamples * deSamples) + (zSubSlices > 1 ? ' | Z-SS: ' + zSubSlices : '') +
    ' | Newton: ' + (useNewton ? newtonSteps + ' steps' : 'off') + ' | Smooth: ' + smoothPasses + '\u00D7\u03BB' + smoothLambda +
    (colorSamples > 1 ? ' | Color-SS: ' + colorSamples + '\u00D7r' + colorJitterMul : '') +
    ' | MinFeat: ' + minFeatureSel + ' | CavityFill: ' + (cavityFillMode === 'escape' ? 'escape-test' : cavityFillLevel + 'x') + ' | Closing: ' + closingRadius, 'data');
  ui.log('Params: ' + JSON.stringify(formulaParams).substring(0, 200), 'data');
  ui.log('Bounds: min=[' + gridMin[0].toFixed(2) + ',' + gridMin[1].toFixed(2) + ',' + gridMin[2].toFixed(2) +
    '] max=[' + gridMax[0].toFixed(2) + ',' + gridMax[1].toFixed(2) + ',' + gridMax[2].toFixed(2) +
    '] range=' + boundsRange.toFixed(2), 'data');

  // Iteration efficiency check
  var usefulIters;
  if (deType === 'ifs') {
    usefulIters = Math.ceil(Math.log2(boundsRange / voxelSize));
  } else {
    var p = Math.max(power, 2);
    usefulIters = Math.ceil(Math.log(boundsRange / voxelSize) / Math.log(p));
  }
  if (iters > usefulIters + 2) {
    ui.log('Note: At ' + N + '\u00B3 (voxel=' + voxelSize.toFixed(5) + '), ~' + usefulIters +
      ' iterations resolve detail at voxel scale. Using ' + iters +
      ' adds ' + (iters - usefulIters) + ' levels of sub-voxel interior detail. ' +
      'Min Feature filter will clamp this. Consider reducing iterations for faster export.', 'warn');
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
      var coarseN = 128;
      ui.log('Pass 1: Coarse SDF ' + coarseN + '\u00B3 (' + ((coarseN * coarseN * coarseN * 4) / (1024 * 1024)).toFixed(1) + ' MB)', 'info');
      ui.setStatus('Pass 1: Coarse SDF (' + coarseN + '\u00B3)...');
      await _pipelineTick(ui);

      var coarsePipeline = setupSDFPipeline(gl, Math.min(coarseN, 2048), config, deSamples);
      var coarseMB = Math.round(coarseN * coarseN * coarseN * 4 / (1024 * 1024));
      ui.memAlloc('coarseGrid', 'Coarse SDF', coarseMB, ui.MEM_COLORS.coarseGrid);
      var coarseGrid = await sampleDenseGrid(gl, coarsePipeline, coarseN, power, iters, formulaParams, gridMin, gridMax, 0, 10);
      tCoarse = performance.now();

      var cPos = 0, cNeg = 0;
      for (var di = 0; di < coarseGrid.length; di++) {
        if (coarseGrid[di] >= 0) cPos++; else cNeg++;
      }
      ui.log('Coarse: ' + cPos.toLocaleString() + ' outside, ' + cNeg.toLocaleString() + ' inside (' + ((tCoarse - t0) / 1000).toFixed(1) + 's)', 'data');
      if (cNeg === 0) ui.log('WARNING: No interior voxels in coarse grid \u2014 surface may not be found', 'warn');

      ui.setStatus('Building narrow band for ' + N + '\u00B3...');
      await _pipelineTick(ui);
      var bandResult = buildNarrowBand(coarseGrid, coarseN, N, 8, 2);
      coarseGrid = null;
      ui.memFree('coarseGrid');
      sparseGrid = bandResult.grid;
      var totalBlocks = Math.pow(N / sparseGrid.blockSize, 3);
      var bandPct = (sparseGrid.allocatedCount / totalBlocks * 100).toFixed(1);
      var sparseMB = Math.round(sparseGrid.memoryMB());
      ui.memAlloc('sparseGrid', 'Sparse SDF', sparseMB, ui.MEM_COLORS.sparseGrid);
      ui.log('Narrow band: ' + sparseGrid.allocatedCount.toLocaleString() + ' blocks (' + bandPct + '% of ' + totalBlocks.toLocaleString() + '), ' + sparseMB + ' MB', 'data');

      ui.log('Pass 2: Fine SDF ' + N + '\u00B3 (narrow-band, ' + sparseGrid.memoryMB().toFixed(0) + ' MB allocated)', 'info');
      ui.setStatus('Pass 2: Fine SDF (' + N + '\u00B3 narrow-band)...');
      await _pipelineTick(ui);

      gl.deleteTexture(coarsePipeline.tex);
      gl.deleteFramebuffer(coarsePipeline.fbo);
      var finePipeline = setupSDFPipeline(gl, Math.min(N, 2048), config, deSamples);
      await sampleSparseGrid(gl, finePipeline, sparseGrid, power, iters, formulaParams, gridMin, gridMax, 10, 25);

      t1 = performance.now();
      tFine = t1;
      ui.log('Fine sampling done: ' + ((tFine - tCoarse) / 1000).toFixed(1) + 's', 'success');

    } else {
      var gridMemMB = Math.round(N * N * N * 4 / (1024 * 1024));
      ui.memAlloc('sdfGrid', 'SDF Grid', gridMemMB, ui.MEM_COLORS.sdfGrid);
      ui.log('Dense SDF ' + N + '\u00B3 (' + gridMemMB + ' MB grid)', 'info');
      var denseZRange = await coarsePrePass(gl, config, formulaParams, N, power, iters, gridMin, gridMax, voxelSize);
      var pipeline = setupSDFPipeline(gl, Math.min(N, 2048), config, deSamples);
      sdfGrid = await sampleDenseGrid(gl, pipeline, N, power, iters, formulaParams, gridMin, gridMax, 0, 35, zSubSlices, denseZRange.zSliceMin, denseZRange.zSliceMax);
      t1 = performance.now();

      var nPos = 0, nNeg = 0, nNan = 0;
      for (var di = 0; di < sdfGrid.length; di++) {
        var sv = sdfGrid[di];
        if (isNaN(sv)) nNan++;
        else if (sv > 0) nPos++;
        else nNeg++;
      }
      ui.log('SDF: ' + nPos.toLocaleString() + ' outside, ' + nNeg.toLocaleString() + ' inside' + (nNan > 0 ? ', ' + nNan + ' NaN!' : '') + ' (' + ((t1 - t0) / 1000).toFixed(1) + 's)', 'data');
    }
  } catch (e) {
    ui.checkCancel();
    ui.log('PHASE 1 FAILED: ' + e.message, 'error');
    ui.log(e.stack || '', 'error');
    ui.setStatus('Error in SDF sampling: ' + e.message);
    throw e;
  }

  ui.checkCancel();

  // ================================================================
  // Phase 1b: SDF Filtering
  // ================================================================
  var minFeatureThreshold = 0;
  if (minFeatureSel === 'auto') {
    minFeatureThreshold = voxelSize * 1.5;
  } else if (parseFloat(minFeatureSel) > 0) {
    minFeatureThreshold = voxelSize * parseFloat(minFeatureSel);
  }

  {
    var sdfMin = Infinity, sdfMax = -Infinity, negCount = 0, totalCells = 0;
    if (useNarrowBand) {
      sparseGrid.blocks.forEach(function(block) {
        for (var i = 0; i < block.length; i++) {
          var v = block[i];
          if (v < sdfMin) sdfMin = v;
          if (v > sdfMax) sdfMax = v;
          if (v < 0) negCount++;
          totalCells++;
        }
      });
    } else {
      totalCells = sdfGrid.length;
      for (var i = 0; i < sdfGrid.length; i++) {
        var v = sdfGrid[i];
        if (v < sdfMin) sdfMin = v;
        if (v > sdfMax) sdfMax = v;
        if (v < 0) negCount++;
      }
    }
    ui.log('SDF range: [' + sdfMin.toFixed(6) + ', ' + sdfMax.toFixed(6) + '] | ' +
      negCount.toLocaleString() + ' interior cells of ' + totalCells.toLocaleString() +
      ' | threshold=' + (minFeatureThreshold > 0 ? minFeatureThreshold.toFixed(6) : 'off'), 'data');

    if (cavityFillLevel > 0 || minFeatureThreshold > 0 || closingRadius > 0) {
      ui.log('[Phase 1b] SDF Filtering', 'phase');
      ui.setPhase('Phase 1b: SDF Filtering', 0);
      ui.setStatus('Filtering SDF...');
      await _pipelineTick(ui);

      if (cavityFillLevel > 0) {
        if (cavityFillMode === 'escape' && useNarrowBand) {
          ui.setStatus('Cavity fill (escape test)...');
          ui.setPhase('Phase 1b: Escape Test', 0);
          var escResult = await sampleEscapeTest(gl, sparseGrid, config, power, iters,
            formulaParams, gridMin, gridMax, function(pct) {
              ui.setPhase('Phase 1b: Escape Test', pct);
            });
          var escapeFilled = 0;
          sparseGrid.blocks.forEach(function(block, key) {
            var esc = escResult.escapeMap.get(key);
            if (!esc) return;
            for (var i = 0; i < block.length; i++) {
              if (block[i] >= 0 && (esc[i >> 3] & (1 << (i & 7)))) {
                block[i] = -Math.abs(block[i]) - 0.001;
                escapeFilled++;
              }
            }
          });
          ui.log('Cavity fill (escape test): ' + escResult.solidCount.toLocaleString() +
            ' escape-interior cells, ' + escapeFilled.toLocaleString() + ' positive cells filled', 'data');
        } else if (useNarrowBand) {
          ui.setStatus('Cavity fill (dilate r=' + cavityFillLevel + ', then flood)...');
          ui.setPhase('Phase 1b: Cavity Fill', 0);
          var cavityResult = await cavityFillDilate(sparseGrid, cavityFillLevel, function(pct) {
            ui.setPhase('Phase 1b: Cavity Fill (r=' + cavityFillLevel + ')', pct);
          }, function() { ui.checkCancel(); });
          ui.log('Cavity fill: dilate=' + cavityFillLevel + ' | ' +
            cavityResult.dilated.toLocaleString() + ' dilated, ' +
            cavityResult.filled.toLocaleString() + ' filled solid', 'data');
        } else {
          ui.setStatus('Cavity fill (flood)...');
          ui.setPhase('Phase 1b: Cavity Fill', 0);
          var cavityFilled = await cavityFillDense(sdfGrid, N, function(pct) {
            ui.setPhase('Phase 1b: Cavity Fill', pct);
          }, function() { ui.checkCancel(); });
          ui.log('Cavity fill: ' + cavityFilled.toLocaleString() + ' cells filled solid', 'data');
        }
      }

      if (minFeatureThreshold > 0) {
        var clamped;
        if (useNarrowBand) {
          clamped = applyMinFeatureSparse(sparseGrid, minFeatureThreshold);
        } else {
          clamped = applyMinFeatureDense(sdfGrid, N, minFeatureThreshold);
        }
        ui.log('Min feature clamp: threshold=' + minFeatureThreshold.toFixed(6) +
          ' (' + (minFeatureThreshold / voxelSize).toFixed(1) + 'x voxel), ' +
          clamped.toLocaleString() + ' cells clamped', 'data');
      }

      if (closingRadius > 0) {
        ui.setStatus('Morphological closing (r=' + closingRadius + ' voxels)...');
        if (useNarrowBand) {
          await morphCloseSparse(sparseGrid, closingRadius, function(pct) {
            ui.setPhase('Phase 1b: Morph Closing', pct);
          });
        } else {
          await morphCloseDense(sdfGrid, N, closingRadius, function(pct) {
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

    if (useNarrowBand) {
      ui.setStatus('Dual contouring (sparse, ' + N + '\u00B3)...');
      mesh = await dualContourSparse(sparseGrid, gridMin, gridMax, function(phase, pct) {
        ui.setProgress(35 + Math.round(pct * 0.25));
        ui.setPhase('Phase 2: Dual Contouring', pct);
      });
    } else {
      ui.setStatus('Dual contouring (' + N + '\u00B3)...');
      var maxDepth = Math.round(Math.log2(N));
      mesh = await dualContour(sdfGrid, N, gridMin, gridMax, maxDepth, function(phase, pct) {
        ui.setProgress(35 + Math.round(pct * 0.25));
        ui.setPhase('Phase 2: Dual Contouring', pct);
      });
      sdfGrid = null; ui.memFree('sdfGrid');
    }

    t2 = performance.now();
    ui.log('DC result: ' + mesh.vertexCount.toLocaleString() + ' vertices, ' + mesh.faceCount.toLocaleString() + ' faces (' + ((t2 - t1) / 1000).toFixed(1) + 's)', 'data');

    var meshPosMB = (mesh.positions.byteLength / (1024 * 1024)).toFixed(0);
    var meshNrmMB = (mesh.normals.byteLength / (1024 * 1024)).toFixed(0);
    var meshIdxMB = (mesh.indices.byteLength / (1024 * 1024)).toFixed(0);
    ui.log('Mesh memory: positions=' + meshPosMB + 'MB normals=' + meshNrmMB + 'MB indices=' + meshIdxMB + 'MB (total ' + (parseInt(meshPosMB) + parseInt(meshNrmMB) + parseInt(meshIdxMB)) + 'MB)', 'mem');

    if (sparseGrid) { sparseGrid = null; ui.memFree('sparseGrid'); ui.log('Sparse grid freed', 'mem'); }

    ui.memAlloc('meshPos', 'Positions', parseInt(meshPosMB), ui.MEM_COLORS.meshPos);
    ui.memAlloc('meshNrm', 'Normals', parseInt(meshNrmMB), ui.MEM_COLORS.meshNrm);
    ui.memAlloc('meshIdx', 'Indices', parseInt(meshIdxMB), ui.MEM_COLORS.meshIdx);
    ui.setStatus('Mesh: ' + mesh.vertexCount.toLocaleString() + ' verts, ' + mesh.faceCount.toLocaleString() + ' faces');
    ui.setProgress(60);
    await _pipelineTick(ui);

    if (mesh.vertexCount === 0) {
      ui.log('No surface found \u2014 check parameters and bounds', 'error');
      ui.setStatus('No surface found! Try different parameters.');
      return { mesh: null, timings: null, baseName: '' };
    }
  } catch (e) {
    ui.checkCancel();
    ui.log('PHASE 2 FAILED: ' + e.message, 'error');
    ui.log(e.stack || '', 'error');
    ui.setStatus('Error in dual contouring: ' + e.message);
    throw e;
  }

  ui.checkCancel();

  // ================================================================
  // Phase 3: Newton Projection
  // ================================================================
  tNewton = t2;
  var voxSize = boundsRange / N;

  if (useNewton) {
    try {
      ui.log('[Phase 3] Newton Projection', 'phase');
      ui.setPhase('Phase 3: Newton Projection', 0);
      var isBuiltin = config === BUILTIN_MANDELBULB || config === BUILTIN_KALIBOX;

      if (isBuiltin && typeof formulaDE === 'function') {
        ui.log('Mode: CPU (float64, builtin formula)', 'info');
        activeFormula = config.metadata.id;
        activeFormulaParams = formulaParams;
        ui.setStatus('Newton projection (' + mesh.vertexCount.toLocaleString() + ' vertices)...');
        await _pipelineTick(ui);

        var positions = mesh.positions, normals = mesh.normals;
        var vc = mesh.vertexCount;
        var maxProjDist = voxSize * 2.0;
        var chunkSize = 4096;
        for (var start = 0; start < vc; start += chunkSize) {
          var end = Math.min(start + chunkSize, vc);
          for (var v = start; v < end; v++) {
            var v3 = v * 3;
            var proj = newtonProject(positions[v3], positions[v3 + 1], positions[v3 + 2], power, iters, 6, maxProjDist);
            positions[v3] = proj[0]; positions[v3 + 1] = proj[1]; positions[v3 + 2] = proj[2];
            var g = sdfGradientTrue(proj[0], proj[1], proj[2], power, iters);
            normals[v3] = g[0]; normals[v3 + 1] = g[1]; normals[v3 + 2] = g[2];
          }
          var newtonPct = Math.round(100 * start / vc);
          ui.setProgress(60 + Math.round((start / vc) * 10));
          ui.setPhase('Phase 3: Newton Projection', newtonPct);
          if ((start & 0x3FFF) === 0) {
            ui.setStatus('Newton projection... ' + newtonPct + '%');
            await _pipelineTick(ui);
          }
        }
        tNewton = performance.now();
        ui.log('CPU Newton done: ' + ((tNewton - t2) / 1000).toFixed(1) + 's', 'success');
      } else {
        ui.log('Mode: GPU (float32, generic formula) \u2014 ' + mesh.vertexCount.toLocaleString() + ' vertices', 'info');
        var texW = Math.ceil(Math.sqrt(mesh.vertexCount));
        ui.log('Newton texture: ' + texW + 'x' + texW + ' (' + (texW * texW * 16 * 3 / (1024 * 1024)).toFixed(0) + ' MB GPU)', 'mem');
        ui.setStatus('GPU Newton projection (' + mesh.vertexCount.toLocaleString() + ' vertices)...');
        ui.setPhase('Phase 3: Newton Projection', 50);
        await _pipelineTick(ui);

        gpuNewtonProject(gl, mesh, config, formulaParams, power, iters, voxSize, newtonSteps);
        tNewton = performance.now();
        ui.setPhase('Phase 3: Newton Projection', 100);
        ui.log('GPU Newton done: ' + ((tNewton - t2) / 1000).toFixed(1) + 's', 'success');
      }
    } catch (err) {
      ui.checkCancel();
      tNewton = performance.now();
      ui.log('Newton FAILED: ' + err.message, 'error');
      ui.log(err.stack || '', 'error');
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

    var smoothingSkipped = mesh.vertexCount > 5000000;
    if (smoothingSkipped) {
      ui.log('Large mesh (' + mesh.vertexCount.toLocaleString() + ' verts) \u2014 smoothing disabled to avoid OOM', 'warn');
    }

    mesh = postProcessMesh(mesh, { smoothing: smoothPasses > 0, smoothIterations: smoothPasses, lambda: smoothLambda });
    t3 = performance.now();
    ui.setPhase('Phase 4: Post-processing', 100);
    ui.log('Post-processing done: ' + ((t3 - tNewton) / 1000).toFixed(1) + 's', 'success');
  } catch (e) {
    ui.checkCancel();
    t3 = performance.now();
    ui.log('PHASE 4 FAILED: ' + e.message, 'error');
    ui.log(e.stack || '', 'error');
    ui.setStatus('Error in post-processing: ' + e.message);
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

    var colorJitterRadius = voxelSize * colorJitterMul;
    mesh.colors = await colorizeVerticesGPU(gl, mesh, config, formulaParams, power, iters, colorSamples, colorJitterRadius);
    t4 = performance.now();
    ui.setPhase('Phase 5: Vertex Coloring', 100);
    var colorMB = (mesh.vertexCount * 3 / (1024 * 1024)).toFixed(1);
    ui.memAlloc('meshCol', 'Colors', parseFloat(colorMB), ui.MEM_COLORS.meshCol);
    ui.log('Coloring done: ' + ((t4 - t3) / 1000).toFixed(1) + 's' + (colorSamples > 1 ? ' (' + colorSamples + ' samples)' : ''), 'success');
  } catch (e) {
    ui.checkCancel();
    t4 = performance.now();
    ui.log('PHASE 5 FAILED: ' + e.message, 'error');
    ui.log(e.stack || '', 'error');
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

  var totalSec = ((t5 - t0) / 1000).toFixed(1);
  ui.log('=== Complete in ' + totalSec + 's ===', 'phase');

  var baseName = (config.metadata.name || config.metadata.id || 'fractal').toLowerCase().replace(/\s+/g, '-');

  return {
    mesh: mesh,
    baseName: baseName,
    smoothingSkipped: smoothingSkipped,
    timings: {
      total: t5 - t0,
      sdf: t1 - t0,
      coarse: tCoarse ? tCoarse - t0 : 0,
      fine: tFine ? tFine - tCoarse : 0,
      dc: t2 - t1,
      newton: tNewton - t2,
      post: t3 - tNewton,
      color: t4 - t3
    },
    useNarrowBand: useNarrowBand,
    gl: gl  // caller cleans up
  };

  } catch (e) {
    // Clean up GL on error
    if (gl) {
      try { gl.getExtension('WEBGL_lose_context').loseContext(); } catch (ignore) {}
    }
    throw e;
  }
}

// ============================================================================
// Export
// ============================================================================

/**
 * Encode mesh to file format.
 * @param {string} format - 'glb', 'stl', or 'vdb'
 * @param {object|null} lastMesh - mesh from runMeshPipeline (null for VDB)
 * @param {string} lastBaseName - filename base
 * @param {object} vdbParams - VDB-specific params (only used when format==='vdb'):
 *   { config, formulaParams, N, iters, power, gridMin, gridMax, deSamples, zSubSlices }
 * @param {object} ui - UI callbacks
 * @returns {{ blob: Blob, filename: string }}
 */
async function runExportMesh(format, lastMesh, lastBaseName, vdbParams, ui) {
  var t0 = performance.now();
  var blob, filename;

  ui.log('[Export] Encoding ' + format.toUpperCase() + '...', 'phase');
  ui.setStatus('Encoding ' + format.toUpperCase() + '...');
  ui.setPhase('Export ' + format.toUpperCase(), 0);

  if (format === 'vdb') {
    var config = vdbParams.config;
    var formulaParams = vdbParams.formulaParams;
    var vdbN = vdbParams.N;
    var vdbIters = vdbParams.iters;
    var vdbPower = vdbParams.power;
    var vdbMin = vdbParams.gridMin;
    var vdbMax = vdbParams.gridMax;
    var vdbDeSamples = vdbParams.deSamples;
    var vdbZSubSlices = vdbParams.zSubSlices;

    var formulaName = config.metadata.name || config.metadata.id || 'unknown';
    ui.log('=== VDB Export: ' + formulaName + ' ===', 'phase');
    ui.log('Resolution: ' + vdbN + '\u00B3 | Iterations: ' + vdbIters + ' | Mode: solid | Z Sub-slices: ' + vdbZSubSlices, 'data');

    var gl = initWebGL();
    var vdbResult = await generateVDB(gl, config, formulaParams, vdbN, vdbPower, vdbIters,
      vdbMin, vdbMax, 'solid', vdbDeSamples, vdbZSubSlices);
    try { gl.getExtension('WEBGL_lose_context').loseContext(); } catch (ignore) {}

    blob = vdbResult.blob;
    filename = ((config.metadata.name || config.metadata.id || 'fractal')
      .toLowerCase().replace(/\s+/g, '-')) + '.vdb';
    ui.log('VDB: ' + vdbResult.voxelCount.toLocaleString() + ' active voxels, ' +
      vdbResult.leafCount + ' leaf blocks' +
      (vdbResult.promoted.promotedLeaves ? ', ' + vdbResult.promoted.promotedLeaves + ' tiles promoted' : '') +
      (vdbResult.skippedSlices > 0 ? ', ' + vdbResult.skippedSlices + ' empty slices skipped' : ''), 'data');
  } else if (format === 'glb') {
    var estBytes = estimateExportSize(lastMesh, format);
    ui.log('Estimated size: ~' + (estBytes / (1024 * 1024)).toFixed(0) + ' MB', 'mem');
    blob = exportGLB(lastMesh);
    filename = lastBaseName + '.glb';
    ui.setPhase('Export GLB', 100);
  } else {
    var estBytes = estimateExportSize(lastMesh, format);
    ui.log('Estimated size: ~' + (estBytes / (1024 * 1024)).toFixed(0) + ' MB', 'mem');
    blob = await exportSTL(lastMesh, function(pct) {
      ui.setPhase('Export STL', pct);
      ui.setStatus('Encoding STL... ' + pct + '%');
    });
    filename = lastBaseName + '.stl';
  }

  var t1 = performance.now();
  var sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
  ui.memAlloc('exportBlob', format.toUpperCase() + ' Blob', parseFloat(sizeMB), ui.MEM_COLORS.exportBlob);
  ui.log('Export: ' + sizeMB + ' MB ' + format.toUpperCase() + ' (' + ((t1 - t0) / 1000).toFixed(1) + 's)', 'success');
  ui.setStatus(sizeMB + ' MB ' + format.toUpperCase() + ' ready');
  ui.setPhase('Export complete', 100);

  return { blob: blob, filename: filename };
}
