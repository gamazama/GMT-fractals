// gpu-pipeline.js — WebGL2 GPU pipeline: SDF sampling, Newton projection, vertex coloring
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — prototype mesh export
//
// Dependencies (loaded before this file):
//   formula-system.js: SDF_VERT, buildSDFFrag, buildColorFrag, buildNewtonFrag,
//                      setFormulaUniforms, getEffectiveDEType
//   mesh-export.html:  log(), setStatus(), setProgress(), setPhase(), tick(),
//                      previewCvs, previewCtx (globals set during DOMContentLoaded)

// ============================================================================
// WebGL Helpers
// ============================================================================

function compileShader(gl, type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    var infoLog = gl.getShaderInfoLog(s);
    var typeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    log('Shader compile error (' + typeName + '): ' + infoLog, 'error');
    // Log problematic lines from the shader source
    var lines = src.split('\n');
    var errorLines = infoLog.match(/\d+:\d+/g) || [];
    for (var eli = 0; eli < Math.min(errorLines.length, 5); eli++) {
      var lineNum = parseInt(errorLines[eli].split(':')[1]) - 1;
      if (lineNum >= 0 && lineNum < lines.length) {
        log('  Line ' + (lineNum + 1) + ': ' + lines[lineNum].trim(), 'error');
      }
    }
    throw new Error('Shader compile: ' + infoLog.split('\n')[0]);
  }
  return s;
}

function createProgram(gl, vs, fs) {
  var p = gl.createProgram();
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    var linkLog = gl.getProgramInfoLog(p);
    log('Program link error: ' + linkLog, 'error');
    throw new Error('Program link: ' + linkLog);
  }
  return p;
}

/** Create a WebGL2 context on an offscreen canvas */
function initWebGL() {
  var canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 2048;
  var gl = canvas.getContext('webgl2', { antialias: false });
  if (!gl) throw new Error('WebGL2 not supported');
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');
  return gl;
}

// ============================================================================
// SDF Pipeline Setup
// ============================================================================

/** Standard uniform names for SDF/formula shaders */
var FORMULA_UNIFORM_NAMES = [
  'uParamA', 'uParamB', 'uParamC', 'uParamD', 'uParamE', 'uParamF',
  'uVec2A', 'uVec2B', 'uVec2C',
  'uVec3A', 'uVec3B', 'uVec3C',
  'uVec4A', 'uVec4B', 'uVec4C',
  'uJulia', 'uJuliaMode', 'uEscapeThresh', 'uDistanceMetric'
];

function setupSDFPipeline(gl, tileSize, config, deSamples) {
  var sdfFrag = buildSDFFrag(config, deSamples);
  var sdfProg = createProgram(gl, SDF_VERT, sdfFrag);
  gl.useProgram(sdfProg);

  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, tileSize, tileSize);
  var fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.viewport(0, 0, tileSize, tileSize);
  gl.bindVertexArray(gl.createVertexArray());

  // Locate all uniforms
  var ALL_UNIFORMS = ['uZ', 'uPower', 'uIters', 'uInvRes', 'uTileOffset', 'uBoundsMin', 'uBoundsRange']
    .concat(FORMULA_UNIFORM_NAMES);
  var loc = {};
  for (var i = 0; i < ALL_UNIFORMS.length; i++) {
    loc[ALL_UNIFORMS[i]] = gl.getUniformLocation(sdfProg, ALL_UNIFORMS[i]);
  }

  return { prog: sdfProg, loc: loc, fbo: fbo, tex: tex };
}

/** Bind common SDF pipeline uniforms (shared by dense, sparse, VDB sampling).
 *  gridMin is a 3-element array [minX, minY, minZ]. */
function bindPipelineUniforms(gl, pipeline, N, power, iters, gridMin, boundsRange, formulaParams) {
  gl.useProgram(pipeline.prog);
  gl.uniform1f(pipeline.loc.uPower, power);
  gl.uniform1i(pipeline.loc.uIters, iters);
  gl.uniform1f(pipeline.loc.uInvRes, 1.0 / N);
  gl.uniform3f(pipeline.loc.uBoundsMin, gridMin[0], gridMin[1], gridMin[2]);
  gl.uniform1f(pipeline.loc.uBoundsRange, boundsRange);
  setFormulaUniforms(gl, pipeline.loc, formulaParams);
  gl.bindFramebuffer(gl.FRAMEBUFFER, pipeline.fbo);
}

/**
 * Coarse pre-pass: sample a low-res 128³ grid to find the Z range that
 * actually contains fractal data. Skips empty slices in the fine pass.
 * At 2048³ this can skip 30-50% of slices, saving minutes.
 * Shared by both VDB and dense mesh pipelines.
 */
async function coarsePrePass(gl, config, formulaParams, N, power, iters, gridMin, gridMax, voxelSize) {
  var coarseN = 128;
  var boundsRange = gridMax[0] - gridMin[0];
  var zSliceMin = 0, zSliceMax = N - 1;

  if (N > coarseN) {
    log('Coarse pre-pass: sampling ' + coarseN + '\u00B3 to detect Z range...', 'info');
    setPhase('Coarse Pre-pass', 0);
    setStatus('Coarse pre-pass (' + coarseN + '\u00B3)...');
    await tick();

    var coarsePipeline = setupSDFPipeline(gl, coarseN, config, 1);
    bindPipelineUniforms(gl, coarsePipeline, coarseN, power, iters, gridMin, boundsRange, formulaParams);
    gl.viewport(0, 0, coarseN, coarseN);

    var coarsePixF = new Float32Array(coarseN * coarseN * 4);
    var coarseZMin = coarseN, coarseZMax = -1;

    for (var cz = 0; cz < coarseN; cz++) {
      gl.uniform1f(coarsePipeline.loc.uZ, (cz + 0.5) / coarseN);
      gl.uniform2f(coarsePipeline.loc.uTileOffset, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, coarseN, coarseN, gl.RGBA, gl.FLOAT, coarsePixF);

      var hasData = false;
      for (var ci = 0; ci < coarseN * coarseN; ci++) {
        if (coarsePixF[ci * 4] < voxelSize * 3) { hasData = true; break; }
      }
      if (hasData) {
        if (cz < coarseZMin) coarseZMin = cz;
        coarseZMax = cz;
      }
    }

    gl.deleteTexture(coarsePipeline.tex);
    gl.deleteFramebuffer(coarsePipeline.fbo);
    gl.deleteProgram(coarsePipeline.prog);

    if (coarseZMax >= coarseZMin) {
      var margin = 2;
      var ratio = N / coarseN;
      zSliceMin = Math.max(0, Math.floor((coarseZMin - margin) * ratio));
      zSliceMax = Math.min(N - 1, Math.ceil((coarseZMax + margin + 1) * ratio));
      // Align to block boundaries (multiples of 8)
      zSliceMin = (zSliceMin & ~7);
      zSliceMax = Math.min(N - 1, (zSliceMax | 7));
      var skippedPct = (100 * (1 - (zSliceMax - zSliceMin + 1) / N)).toFixed(0);
      log('Coarse pre-pass: data in Z [' + coarseZMin + ',' + coarseZMax + '] of ' + coarseN +
        ' \u2192 fine Z [' + zSliceMin + ',' + zSliceMax + '] of ' + N +
        ' (skipping ' + skippedPct + '% of slices)', 'data');
    } else {
      log('Coarse pre-pass: no data found \u2014 sampling all slices', 'warn');
    }
    setPhase('Coarse Pre-pass', 100);
  }

  return { zSliceMin: zSliceMin, zSliceMax: zSliceMax };
}

/**
 * Sample one Z-slice into a slab buffer with optional Z sub-slice averaging.
 * Handles tiling for N > tileSize. Shared by dense mesh and VDB pipelines.
 * When zSubSlices <= 1: single sample at (gz + 0.5) / N.
 * When zSubSlices > 1: average zSubSlices positions within [gz, gz+1).
 */
function sampleSliceWithSubZ(gl, pipeline, N, tileSize, pixF, destSlab, gz, zSubSlices, subSliceBuf) {
  function sampleOneZ(zNorm, dest) {
    gl.useProgram(pipeline.prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, pipeline.fbo);
    gl.uniform1f(pipeline.loc.uZ, zNorm);
    if (N <= tileSize) {
      gl.uniform2f(pipeline.loc.uTileOffset, 0, 0);
      gl.viewport(0, 0, N, N);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, pixF);
      for (var j = 0; j < N * N; j++) dest[j] = pixF[j * 4];
    } else {
      for (var tileY = 0; tileY < N; tileY += tileSize) {
        for (var tileX = 0; tileX < N; tileX += tileSize) {
          var tw = Math.min(tileSize, N - tileX);
          var th = Math.min(tileSize, N - tileY);
          gl.uniform2f(pipeline.loc.uTileOffset, tileX, tileY);
          gl.viewport(0, 0, tw, th);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.readPixels(0, 0, tw, th, gl.RGBA, gl.FLOAT, pixF);
          for (var py = 0; py < th; py++) {
            for (var px = 0; px < tw; px++) {
              dest[(tileY + py) * N + (tileX + px)] = pixF[(py * tw + px) * 4];
            }
          }
        }
      }
    }
  }

  if (!zSubSlices || zSubSlices <= 1) {
    sampleOneZ((gz + 0.5) / N, destSlab);
  } else {
    destSlab.fill(0);
    var invSS = 1.0 / zSubSlices;
    for (var ss = 0; ss < zSubSlices; ss++) {
      var subZ = (gz + (ss + 0.5) * invSS) / N;
      sampleOneZ(subZ, subSliceBuf);
      for (var j = 0; j < N * N; j++) destSlab[j] += subSliceBuf[j];
    }
    for (var j = 0; j < N * N; j++) destSlab[j] *= invSS;
  }
}

/** Helper: locate formula uniforms on a GL program */
function locateFormulaUniforms(gl, prog) {
  var loc = {};
  for (var i = 0; i < FORMULA_UNIFORM_NAMES.length; i++) {
    loc[FORMULA_UNIFORM_NAMES[i]] = gl.getUniformLocation(prog, FORMULA_UNIFORM_NAMES[i]);
  }
  return loc;
}

// ============================================================================
// Dense SDF Sampling (GPU)
// ============================================================================

/**
 * Sample a full dense SDF grid via GPU.
 * Updates the SDF preview canvas every slice.
 */
async function sampleDenseGrid(gl, pipeline, N, power, iters, formulaParams, gridMin, gridMax, progressBase, progressRange, zSubSlices, zSliceMin, zSliceMax) {
  var tileSize = Math.min(N, 2048);
  var boundsRange = gridMax[0] - gridMin[0];
  if (!zSubSlices || zSubSlices < 1) zSubSlices = 1;
  if (zSliceMin == null) zSliceMin = 0;
  if (zSliceMax == null) zSliceMax = N - 1;
  bindPipelineUniforms(gl, pipeline, N, power, iters, gridMin, boundsRange, formulaParams);
  gl.viewport(0, 0, tileSize, tileSize);

  var pixF = new Float32Array(tileSize * tileSize * 4);
  var sdfGrid = new Float32Array(N * N * N);
  var voxelSize = boundsRange / N;
  var slab = new Float32Array(N * N);
  var subSliceBuf = zSubSlices > 1 ? new Float32Array(N * N) : null;

  // Live preview: reusable canvas for slice visualization
  var prevSize = Math.min(N, 512);
  var prevScale = N / prevSize;
  var prevC = document.createElement('canvas'); prevC.width = prevSize; prevC.height = prevSize;
  var prevX = prevC.getContext('2d');
  var prevI = prevX.createImageData(prevSize, prevSize);

  // Fill skipped slices with +1.0 (far outside surface)
  if (zSliceMin > 0 || zSliceMax < N - 1) {
    sdfGrid.fill(1.0);
  }
  if (zSubSlices > 1) {
    log('Z sub-slicing: ' + zSubSlices + ' sub-samples per voxel layer (smooths Z-axis banding)', 'info');
  }

  var activeSlices = zSliceMax - zSliceMin + 1;
  var slicesDone = 0;

  for (var z = zSliceMin; z <= zSliceMax; z++) {
    sampleSliceWithSubZ(gl, pipeline, N, tileSize, pixF, slab, z, zSubSlices, subSliceBuf);
    sdfGrid.set(slab, z * N * N);

    // Live preview — every slice
    for (var py = 0; py < prevSize; py++) {
      var srcY = Math.min(Math.round(py * prevScale), N - 1);
      for (var px = 0; px < prevSize; px++) {
        var srcX = Math.min(Math.round(px * prevScale), N - 1);
        var sVal = slab[srcY * N + srcX];
        var absDist = Math.abs(sVal);
        var contour = absDist < voxelSize * 2 ? Math.round(255 * (1 - absDist / (voxelSize * 2))) : 0;
        var interior = sVal < 0 ? 50 : 0;
        var pj = (py * prevSize + px) * 4;
        prevI.data[pj] = contour + interior;
        prevI.data[pj + 1] = sVal < 0 ? 30 : contour;
        prevI.data[pj + 2] = contour;
        prevI.data[pj + 3] = 255;
      }
    }
    prevX.putImageData(prevI, 0, 0);
    previewCtx.drawImage(prevC, 0, 0, previewCvs.width, previewCvs.height);

    slicesDone++;
    setProgress(progressBase + Math.round(slicesDone / activeSlices * progressRange));
    setPhase('SDF Sampling', Math.round(slicesDone / activeSlices * 100));
    if ((slicesDone & 3) === 0) { setStatus('Sampling SDF... slice ' + slicesDone + '/' + activeSlices); await tick(); }
  }

  return sdfGrid;
}

// ============================================================================
// Sparse SDF Sampling (GPU, narrow-band)
// ============================================================================

/**
 * Sample SDF into a sparse grid — only fills allocated blocks.
 * FIX #6: Pre-allocates a single readback buffer at max region size
 * instead of allocating per-slice.
 */
async function sampleSparseGrid(gl, pipeline, sparseGrid, power, iters, formulaParams, gridMin, gridMax, progressBase, progressRange) {
  var N = sparseGrid.N;
  var bs = sparseGrid.blockSize;
  var tileSize = Math.min(N, 2048);
  var boundsRange = gridMax[0] - gridMin[0];
  bindPipelineUniforms(gl, pipeline, N, power, iters, gridMin, boundsRange, formulaParams);
  gl.viewport(0, 0, tileSize, tileSize);

  // Collect unique Z slices that have allocated blocks, with XY bounding box
  var blockSlices = new Map();
  forEachBandBlock(sparseGrid, function(bx, by, bz, startX, startY, startZ) {
    for (var lz = 0; lz < bs; lz++) {
      var gz = startZ + lz;
      if (gz >= N) continue;
      var info = blockSlices.get(gz);
      if (!info) {
        info = { entries: [], minX: startX, minY: startY, maxX: startX + bs, maxY: startY + bs };
        blockSlices.set(gz, info);
      }
      info.entries.push({ startX: startX, startY: startY });
      if (startX < info.minX) info.minX = startX;
      if (startY < info.minY) info.minY = startY;
      if (startX + bs > info.maxX) info.maxX = startX + bs;
      if (startY + bs > info.maxY) info.maxY = startY + bs;
    }
  });

  var zSlices = Array.from(blockSlices.keys()).sort(function(a, b) { return a - b; });

  // Pre-allocate readback buffer at maximum region size across all slices
  var maxRegionPixels = 0;
  for (var si = 0; si < zSlices.length; si++) {
    var sliceInfo = blockSlices.get(zSlices[si]);
    var rW = Math.min(N, sliceInfo.maxX) - Math.max(0, sliceInfo.minX);
    var rH = Math.min(N, sliceInfo.maxY) - Math.max(0, sliceInfo.minY);
    var regionSize = rW * rH * 4;
    if (regionSize > maxRegionPixels) maxRegionPixels = regionSize;
  }
  var regionPixels = new Float32Array(maxRegionPixels);

  // Live preview setup for sparse pass
  var prevSize = Math.min(N, 512);
  var prevRatio = N / prevSize;
  var prevC = document.createElement('canvas'); prevC.width = prevSize; prevC.height = prevSize;
  var prevX = prevC.getContext('2d');
  var prevI = prevX.createImageData(prevSize, prevSize);
  var voxelSize = boundsRange / N;

  var slicesDone = 0;
  var regionMinX, regionMinY, regionMaxX, regionMaxY, regionW, regionH;

  for (var si = 0; si < zSlices.length; si++) {
    var z = zSlices[si];
    var sliceInfo = blockSlices.get(z);
    gl.uniform1f(pipeline.loc.uZ, (z + 0.5) / N);

    regionMinX = Math.max(0, sliceInfo.minX);
    regionMinY = Math.max(0, sliceInfo.minY);
    regionMaxX = Math.min(N, sliceInfo.maxX);
    regionMaxY = Math.min(N, sliceInfo.maxY);
    regionW = regionMaxX - regionMinX;
    regionH = regionMaxY - regionMinY;

    gl.uniform2f(pipeline.loc.uTileOffset, regionMinX, regionMinY);
    gl.viewport(0, 0, regionW, regionH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Reuse pre-allocated buffer
    gl.readPixels(0, 0, regionW, regionH, gl.RGBA, gl.FLOAT, regionPixels);

    var entries = sliceInfo.entries;
    for (var ei = 0; ei < entries.length; ei++) {
      var e = entries[ei];
      for (var lx = 0; lx < bs; lx++) {
        var gx = e.startX + lx;
        if (gx < regionMinX || gx >= regionMaxX) continue;
        for (var ly = 0; ly < bs; ly++) {
          var gy = e.startY + ly;
          if (gy < regionMinY || gy >= regionMaxY) continue;
          var pixIdx = ((gy - regionMinY) * regionW + (gx - regionMinX)) * 4;
          sparseGrid.set(gx, gy, z, regionPixels[pixIdx]);
        }
      }
    }

    slicesDone++;
    if ((slicesDone & 7) === 0) {
      // Live preview — show narrow-band SDF cross-section
      for (var py = 0; py < prevSize; py++) {
        var srcY = Math.round(py * prevRatio);
        for (var px = 0; px < prevSize; px++) {
          var srcX = Math.round(px * prevRatio);
          var pj = (py * prevSize + px) * 4;
          if (srcX >= regionMinX && srcX < regionMaxX && srcY >= regionMinY && srcY < regionMaxY) {
            var sPixIdx = ((srcY - regionMinY) * regionW + (srcX - regionMinX)) * 4;
            var sVal = regionPixels[sPixIdx];
            var absDist = Math.abs(sVal);
            var contour = absDist < voxelSize * 2 ? Math.round(255 * (1 - absDist / (voxelSize * 2))) : 0;
            var interior = sVal < 0 ? 50 : 0;
            prevI.data[pj] = contour + interior;
            prevI.data[pj + 1] = sVal < 0 ? 30 : contour;
            prevI.data[pj + 2] = contour;
          } else {
            prevI.data[pj] = 15;
            prevI.data[pj + 1] = 15;
            prevI.data[pj + 2] = 20;
          }
          prevI.data[pj + 3] = 255;
        }
      }
      prevX.putImageData(prevI, 0, 0);
      previewCtx.drawImage(prevC, 0, 0, previewCvs.width, previewCvs.height);

      setProgress(progressBase + Math.round(slicesDone / zSlices.length * progressRange));
      setPhase('Fine SDF Sampling', Math.round(slicesDone / zSlices.length * 100));
      setStatus('Sampling fine SDF... slice ' + slicesDone + '/' + zSlices.length + ' (narrow-band)');
      await tick();
    }
  }

  return sparseGrid;
}

// ============================================================================
// Standalone VDB Generation (GPU → VDB tree, no sparse grid)
// ============================================================================

/**
 * Standalone VDB export: samples SDF via GPU slice-by-slice and builds VDB
 * tree blocks on-the-fly. Never allocates a full grid — only one slice of
 * readback pixels lives in memory at a time. Needs vdb-writer.js loaded.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {object} config - formula config from GMF
 * @param {object} formulaParams
 * @param {number} N - resolution
 * @param {number} power
 * @param {number} iters
 * @param {number} gridMin
 * @param {number} gridMax
 * @param {string} mode - 'solid' or 'shell'
 * @param {number} deSamples
 * @returns {{ blob, voxelCount, leafCount, promoted }}
 */
async function generateVDB(gl, config, formulaParams, N, power, iters, gridMin, gridMax, mode, deSamples, zSubSlices) {
  var boundsRange = gridMax[0] - gridMin[0];
  var voxelSize = boundsRange / N;
  var bs = 8; // VDB leaf = 8^3, must match
  var bpa = (N / bs) | 0;
  var tileSize = Math.min(N, 2048);
  if (!zSubSlices || zSubSlices < 1) zSubSlices = 1;

  var zRange = await coarsePrePass(gl, config, formulaParams, N, power, iters, gridMin, gridMax, voxelSize);
  var zSliceMin = zRange.zSliceMin, zSliceMax = zRange.zSliceMax;

  // ================================================================
  // Fine pass: sample SDF slice by slice with optional Z sub-slicing
  // ================================================================
  var pipeline = setupSDFPipeline(gl, tileSize, config, deSamples || 1);
  bindPipelineUniforms(gl, pipeline, N, power, iters, gridMin, boundsRange, formulaParams);

  var pixF = new Float32Array(tileSize * tileSize * 4);
  var tree = createTree();
  var totalVoxels = 0;

  // Buffer 8 slices of SDF (one block-layer deep) before building VDB blocks
  // blockSlabs[bz_local] = Float32Array(N * N) for lz=0..7
  var slabBuf = new Array(bs);
  for (var i = 0; i < bs; i++) slabBuf[i] = new Float32Array(N * N);

  // Temp buffer for Z sub-slice accumulation (reused per slice)
  var subSliceBuf = zSubSlices > 1 ? new Float32Array(N * N) : null;

  // Live preview
  var prevSize = Math.min(N, 512);
  var prevScale = N / prevSize;
  var prevC = document.createElement('canvas'); prevC.width = prevSize; prevC.height = prevSize;
  var prevX = prevC.getContext('2d');
  var prevI = prevX.createImageData(prevSize, prevSize);

  var activeSlices = zSliceMax - zSliceMin + 1;
  var slicesDone = 0;

  if (zSubSlices > 1) {
    log('Z sub-slicing: ' + zSubSlices + ' sub-samples per voxel layer (smooths Z-axis banding)', 'info');
  }

  for (var gz = zSliceMin; gz <= zSliceMax; gz++) {
    var slab = slabBuf[gz % bs];
    sampleSliceWithSubZ(gl, pipeline, N, tileSize, pixF, slab, gz, zSubSlices, subSliceBuf);

    // Every 8 slices: build VDB blocks from the buffered slab
    if ((gz % bs) === bs - 1) {
      var bz = ((gz / bs) | 0);
      for (var by = 0; by < bpa; by++) {
        for (var bx = 0; bx < bpa; bx++) {
          var densityBytes = new Uint8Array(512);
          var hasAny = false;
          for (var lz = 0; lz < bs; lz++) {
            var slabData = slabBuf[lz];
            for (var ly = 0; ly < bs; ly++) {
              for (var lx = 0; lx < bs; lx++) {
                var gx = bx * bs + lx, gy = by * bs + ly;
                var sdf = slabData[gy * N + gx];
                var vdbIdx = lz | (ly << 3) | (lx << 6);
                var density;
                if (sdf < 0) {
                  density = mode === 'shell' ? 0 : 255;
                } else {
                  density = Math.round(Math.max(0, Math.min(255, 255 * (1 - sdf / (voxelSize * 2.5)))));
                }
                densityBytes[vdbIdx] = density;
                if (density > 0) hasAny = true;
              }
            }
          }
          if (hasAny) {
            totalVoxels += addLeafBlock(tree, bx, by, bz, densityBytes);
          }
        }
      }
    }

    // Progress + preview every 8 slices
    slicesDone++;
    if ((slicesDone & 7) === 0) {
      var pct = Math.round(slicesDone / activeSlices * 80);
      setProgress(pct);
      setPhase('VDB Sampling', Math.round(slicesDone / activeSlices * 100));
      setStatus('VDB sampling slice ' + slicesDone + '/' + activeSlices +
        (zSliceMin > 0 || zSliceMax < N - 1 ? ' (Z ' + zSliceMin + '\u2013' + zSliceMax + ')' : ''));

      // Live preview
      for (var py = 0; py < prevSize; py++) {
        var srcY = Math.round(py * prevScale);
        for (var px = 0; px < prevSize; px++) {
          var srcX = Math.round(px * prevScale);
          var pj = (py * prevSize + px) * 4;
          var sVal = slabBuf[gz % bs][srcY * N + srcX];
          var absDist = Math.abs(sVal);
          var contour = absDist < voxelSize * 2 ? Math.round(255 * (1 - absDist / (voxelSize * 2))) : 0;
          var interior = sVal < 0 ? 50 : 0;
          prevI.data[pj] = contour + interior;
          prevI.data[pj + 1] = sVal < 0 ? 30 : contour;
          prevI.data[pj + 2] = contour;
          prevI.data[pj + 3] = 255;
        }
      }
      prevX.putImageData(prevI, 0, 0);
      previewCtx.drawImage(prevC, 0, 0, previewCvs.width, previewCvs.height);
      await tick();
    }
  }

  // Optimize tree (promote uniform leaves/nodes to tiles)
  setPhase('VDB Optimize', 0);
  var promoted = optimizeTree(tree);
  setPhase('VDB Serialize', 50);

  // Serialize
  var vdbBuf = serializeVDB(tree, N, gridMin, boundsRange);
  setPhase('VDB Complete', 100);

  var leafCount = 0;
  tree.n4map.forEach(function(n4) { leafCount += n4.leafMap.size; });

  // Cleanup GPU resources
  gl.deleteTexture(pipeline.tex);
  gl.deleteFramebuffer(pipeline.fbo);
  gl.deleteProgram(pipeline.prog);

  return {
    blob: new Blob([vdbBuf], { type: 'application/octet-stream' }),
    voxelCount: totalVoxels,
    leafCount: leafCount,
    promoted: promoted,
    zRange: [zSliceMin, zSliceMax],
    skippedSlices: N - activeSlices
  };
}

// ============================================================================
// GPU Escape-Test Sampling (for cavity fill)
// ============================================================================

/**
 * Sample escape test on allocated sparse grid blocks via GPU.
 * Returns a Map<blockKey, Uint8Array> bit field: 1 = interior (did not escape).
 * Used as an alternative to SDF-based cavity fill for IFS fractals.
 */
async function sampleEscapeTest(gl, sparseGrid, config, power, iters, formulaParams, gridMin, gridMax, onProgress) {
  var N = sparseGrid.N;
  var bs = sparseGrid.blockSize;
  var bpa = sparseGrid.blocksPerAxis;
  var tileSize = Math.min(N, 2048);
  var boundsRange = gridMax[0] - gridMin[0];
  var bytesPerBlock = (sparseGrid.blockCellCount + 7) >> 3;

  // Build & compile escape shader
  var escapeFrag = buildEscapeFrag(config);
  var escapeProg = createProgram(gl, SDF_VERT, escapeFrag);
  gl.useProgram(escapeProg);

  var ALL_UNIFORMS = ['uZ', 'uPower', 'uIters', 'uInvRes', 'uTileOffset', 'uBoundsMin', 'uBoundsRange']
    .concat(FORMULA_UNIFORM_NAMES);
  var loc = {};
  for (var i = 0; i < ALL_UNIFORMS.length; i++) {
    loc[ALL_UNIFORMS[i]] = gl.getUniformLocation(escapeProg, ALL_UNIFORMS[i]);
  }

  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, tileSize, tileSize);
  var fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

  gl.uniform1f(loc.uPower, power);
  gl.uniform1i(loc.uIters, iters);
  gl.uniform1f(loc.uInvRes, 1.0 / N);
  gl.uniform3f(loc.uBoundsMin, gridMin[0], gridMin[1], gridMin[2]);
  gl.uniform1f(loc.uBoundsRange, boundsRange);
  setFormulaUniforms(gl, loc, formulaParams);
  gl.bindVertexArray(gl.createVertexArray());

  // Collect Z slices from allocated blocks
  var blockSlices = new Map();
  forEachBandBlock(sparseGrid, function(bx, by, bz, startX, startY, startZ) {
    for (var lz = 0; lz < bs; lz++) {
      var gz = startZ + lz;
      if (gz >= N) continue;
      var info = blockSlices.get(gz);
      if (!info) {
        info = { entries: [], minX: startX, minY: startY, maxX: startX + bs, maxY: startY + bs };
        blockSlices.set(gz, info);
      }
      info.entries.push({ startX: startX, startY: startY });
      if (startX < info.minX) info.minX = startX;
      if (startY < info.minY) info.minY = startY;
      if (startX + bs > info.maxX) info.maxX = startX + bs;
      if (startY + bs > info.maxY) info.maxY = startY + bs;
    }
  });

  var zSlices = Array.from(blockSlices.keys()).sort(function(a, b) { return a - b; });

  // Pre-allocate readback buffer
  var maxRegionPixels = 0;
  for (var si = 0; si < zSlices.length; si++) {
    var sliceInfo = blockSlices.get(zSlices[si]);
    var rW = Math.min(N, sliceInfo.maxX) - Math.max(0, sliceInfo.minX);
    var rH = Math.min(N, sliceInfo.maxY) - Math.max(0, sliceInfo.minY);
    if (rW * rH * 4 > maxRegionPixels) maxRegionPixels = rW * rH * 4;
  }
  var regionPixels = new Float32Array(maxRegionPixels);

  // Output: 1 bit per cell per allocated block
  var escapeMap = new Map();
  sparseGrid.blocks.forEach(function(block, key) {
    escapeMap.set(key, new Uint8Array(bytesPerBlock));
  });

  var solidCount = 0;
  for (var si = 0; si < zSlices.length; si++) {
    var z = zSlices[si];
    var sliceInfo = blockSlices.get(z);
    gl.uniform1f(loc.uZ, (z + 0.5) / N);

    var regionMinX = Math.max(0, sliceInfo.minX);
    var regionMinY = Math.max(0, sliceInfo.minY);
    var regionMaxX = Math.min(N, sliceInfo.maxX);
    var regionMaxY = Math.min(N, sliceInfo.maxY);
    var regionW = regionMaxX - regionMinX;
    var regionH = regionMaxY - regionMinY;

    gl.uniform2f(loc.uTileOffset, regionMinX, regionMinY);
    gl.viewport(0, 0, regionW, regionH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.readPixels(0, 0, regionW, regionH, gl.RGBA, gl.FLOAT, regionPixels);

    var entries = sliceInfo.entries;
    for (var ei = 0; ei < entries.length; ei++) {
      var e = entries[ei];
      var bx = (e.startX / bs) | 0, by = (e.startY / bs) | 0, bz = (z / bs) | 0;
      var bk = (bz * bpa + by) * bpa + bx;
      var bits = escapeMap.get(bk);
      if (!bits) continue;
      var lz = z - bz * bs;
      for (var lx = 0; lx < bs; lx++) {
        var gx = e.startX + lx;
        if (gx < regionMinX || gx >= regionMaxX) continue;
        for (var ly = 0; ly < bs; ly++) {
          var gy = e.startY + ly;
          if (gy < regionMinY || gy >= regionMaxY) continue;
          var pixIdx = ((gy - regionMinY) * regionW + (gx - regionMinX)) * 4;
          if (regionPixels[pixIdx] > 0.5) {
            var li = (lz * bs + ly) * bs + lx;
            bits[li >> 3] |= (1 << (li & 7));
            solidCount++;
          }
        }
      }
    }

    if ((si & 7) === 0 && onProgress) {
      onProgress(Math.round(si / zSlices.length * 100));
      await tick();
    }
  }

  // Cleanup
  gl.deleteTexture(tex);
  gl.deleteFramebuffer(fbo);
  gl.deleteProgram(escapeProg);

  return { escapeMap: escapeMap, solidCount: solidCount };
}

// ============================================================================
// GPU Newton Projection
// ============================================================================

/**
 * GPU Newton projection: project mesh vertices onto the isosurface.
 * Uses the same formula GLSL as the SDF shader.
 * FIX #7: Accepts `gl` as a parameter — reuses the existing WebGL context
 * instead of creating a new one.
 */
function gpuNewtonProject(gl, mesh, config, formulaParams, power, iters, voxelSize, newtonSteps) {
  if (!newtonSteps) newtonSteps = 6;
  var vertexCount = mesh.vertexCount;

  // Pack positions into RGBA32F texture
  var texW = Math.ceil(Math.sqrt(vertexCount));
  var texH = Math.ceil(vertexCount / texW);
  var posData = new Float32Array(texW * texH * 4);
  for (var i = 0; i < vertexCount; i++) {
    posData[i * 4] = mesh.positions[i * 3];
    posData[i * 4 + 1] = mesh.positions[i * 3 + 1];
    posData[i * 4 + 2] = mesh.positions[i * 3 + 2];
    posData[i * 4 + 3] = 1.0; // valid flag
  }

  // Create input texture
  var posTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, posTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texW, texH, 0, gl.RGBA, gl.FLOAT, posData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create output textures (MRT: position + normal)
  var outPosTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, outPosTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, texW, texH);

  var outNrmTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, outNrmTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, texW, texH);

  // Create FBO with MRT
  var fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outPosTex, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, outNrmTex, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

  // Compile Newton shader
  var newtonFrag = buildNewtonFrag(config);
  var newtonProg = createProgram(gl, SDF_VERT, newtonFrag);
  gl.useProgram(newtonProg);
  gl.viewport(0, 0, texW, texH);
  gl.bindVertexArray(gl.createVertexArray());

  // Bind input texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, posTex);
  gl.uniform1i(gl.getUniformLocation(newtonProg, 'uPositions'), 0);

  // Set uniforms
  gl.uniform1f(gl.getUniformLocation(newtonProg, 'uPower'), power);
  gl.uniform1i(gl.getUniformLocation(newtonProg, 'uIters'), iters);
  gl.uniform1f(gl.getUniformLocation(newtonProg, 'uVoxelSize'), voxelSize);
  gl.uniform1i(gl.getUniformLocation(newtonProg, 'uNewtonSteps'), newtonSteps);

  // Set formula uniforms
  var loc = locateFormulaUniforms(gl, newtonProg);
  setFormulaUniforms(gl, loc, formulaParams);

  // Render
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Read back positions
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  var outPosData = new Float32Array(texW * texH * 4);
  gl.readPixels(0, 0, texW, texH, gl.RGBA, gl.FLOAT, outPosData);

  // Read back normals
  gl.readBuffer(gl.COLOR_ATTACHMENT1);
  var outNrmData = new Float32Array(texW * texH * 4);
  gl.readPixels(0, 0, texW, texH, gl.RGBA, gl.FLOAT, outNrmData);

  // Copy results back to mesh
  for (var i = 0; i < vertexCount; i++) {
    mesh.positions[i * 3] = outPosData[i * 4];
    mesh.positions[i * 3 + 1] = outPosData[i * 4 + 1];
    mesh.positions[i * 3 + 2] = outPosData[i * 4 + 2];
    mesh.normals[i * 3] = outNrmData[i * 4];
    mesh.normals[i * 3 + 1] = outNrmData[i * 4 + 1];
    mesh.normals[i * 3 + 2] = outNrmData[i * 4 + 2];
  }

  // Clean up GPU resources (but don't destroy the context)
  gl.deleteTexture(posTex);
  gl.deleteTexture(outPosTex);
  gl.deleteTexture(outNrmTex);
  gl.deleteFramebuffer(fbo);
  gl.deleteProgram(newtonProg);

  return mesh;
}

// ============================================================================
// GPU Vertex Coloring
// ============================================================================

/**
 * Colorize mesh vertices on GPU using orbit trap values.
 * Supports spatial supersampling: renders N passes with jittered positions
 * and accumulates into a float FBO for smooth, noise-free colors.
 * @param {number} colorSamples - number of jittered samples (1 = no SS)
 * @param {number} jitterRadius - world-space radius for jitter (e.g. voxelSize * 0.5)
 * Returns Uint8Array of RGBA colors (0-255).
 */
async function colorizeVerticesGPU(gl, mesh, config, formulaParams, power, iters, colorSamples, jitterRadius) {
  if (!colorSamples || colorSamples < 1) colorSamples = 1;
  if (!jitterRadius) jitterRadius = 0;
  var vertexCount = mesh.vertexCount;
  var colTexW = Math.ceil(Math.sqrt(vertexCount));
  var colTexH = Math.ceil(vertexCount / colTexW);
  log('Color texture: ' + colTexW + 'x' + colTexH + ' (' + (colTexW * colTexH * 16 / (1024 * 1024)).toFixed(0) + ' MB position data)' +
    (colorSamples > 1 ? ' | ' + colorSamples + ' samples, radius=' + jitterRadius.toFixed(5) : ''), 'mem');

  // Pack positions into RGBA32F texture
  var posData = new Float32Array(colTexW * colTexH * 4);
  for (var i = 0; i < vertexCount; i++) {
    posData[i * 4] = mesh.positions[i * 3];
    posData[i * 4 + 1] = mesh.positions[i * 3 + 1];
    posData[i * 4 + 2] = mesh.positions[i * 3 + 2];
    posData[i * 4 + 3] = 1.0;
  }

  var colFrag = buildColorFrag(config);
  var colProg = createProgram(gl, SDF_VERT, colFrag);
  gl.useProgram(colProg);

  var posTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, posTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, colTexW, colTexH, 0, gl.RGBA, gl.FLOAT, posData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  posData = null; // free immediately

  // Use RGBA32F for accumulation when supersampling, RGBA8 for single-pass
  var useFloat = colorSamples > 1;
  var colOutTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, colOutTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, useFloat ? gl.RGBA32F : gl.RGBA8, colTexW, colTexH);
  var colFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, colFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colOutTex, 0);
  gl.viewport(0, 0, colTexW, colTexH);
  gl.bindVertexArray(gl.createVertexArray());

  // Set uniforms
  var colLoc = locateFormulaUniforms(gl, colProg);
  var jitterLoc = gl.getUniformLocation(colProg, 'uJitterOffset');
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, posTex);
  gl.uniform1i(gl.getUniformLocation(colProg, 'uPositions'), 0);
  gl.uniform1f(gl.getUniformLocation(colProg, 'uPower'), power);
  gl.uniform1i(gl.getUniformLocation(colProg, 'uIters'), iters);
  gl.uniform1i(gl.getUniformLocation(colProg, 'uWidth'), colTexW);
  setFormulaUniforms(gl, colLoc, formulaParams);

  if (colorSamples <= 1) {
    // Single pass — no jitter, no blending
    gl.uniform3f(jitterLoc, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  } else {
    // Multi-pass: clear to black, additive blend each jittered pass
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // Jitter offsets using Fibonacci sphere distribution (uniform coverage)
    var goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (var si = 0; si < colorSamples; si++) {
      var phi = Math.acos(1 - 2 * (si + 0.5) / colorSamples);
      var theta = goldenAngle * si;
      // Vary radius per sample to fill the sphere volume, not just surface
      var r = jitterRadius * Math.cbrt((si + 0.5) / colorSamples);
      var jx = r * Math.sin(phi) * Math.cos(theta);
      var jy = r * Math.sin(phi) * Math.sin(theta);
      var jz = r * Math.cos(phi);
      gl.uniform3f(jitterLoc, jx, jy, jz);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if ((si & 3) === 0 || si === colorSamples - 1) {
        var pct = Math.round((si + 1) / colorSamples * 100);
        setProgress(80 + Math.round((si + 1) / colorSamples * 10));
        setPhase('Phase 5: Vertex Coloring', pct);
        setStatus('Color sample ' + (si + 1) + '/' + colorSamples);
        await tick();
      }
    }

    gl.disable(gl.BLEND);
  }

  // Read back results
  var colors = new Uint8Array(vertexCount * 4);
  if (useFloat) {
    var colPixF = new Float32Array(colTexW * colTexH * 4);
    gl.readPixels(0, 0, colTexW, colTexH, gl.RGBA, gl.FLOAT, colPixF);
    var invN = 1.0 / colorSamples;
    for (var i = 0; i < vertexCount; i++) {
      colors[i * 4]     = Math.min(255, Math.round(colPixF[i * 4]     * invN * 255));
      colors[i * 4 + 1] = Math.min(255, Math.round(colPixF[i * 4 + 1] * invN * 255));
      colors[i * 4 + 2] = Math.min(255, Math.round(colPixF[i * 4 + 2] * invN * 255));
      colors[i * 4 + 3] = 255;
    }
  } else {
    var colPix = new Uint8Array(colTexW * colTexH * 4);
    gl.readPixels(0, 0, colTexW, colTexH, gl.RGBA, gl.UNSIGNED_BYTE, colPix);
    for (var i = 0; i < vertexCount; i++) {
      colors[i * 4]     = colPix[i * 4];
      colors[i * 4 + 1] = colPix[i * 4 + 1];
      colors[i * 4 + 2] = colPix[i * 4 + 2];
      colors[i * 4 + 3] = 255;
    }
  }

  // Clean up GPU resources (but don't destroy the context)
  gl.deleteTexture(posTex);
  gl.deleteTexture(colOutTex);
  gl.deleteFramebuffer(colFbo);
  gl.deleteProgram(colProg);

  return colors;
}
