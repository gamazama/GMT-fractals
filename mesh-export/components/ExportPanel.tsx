import React from 'react';
import { useMeshExportStore } from '../store/meshExportStore';
import { registry } from '../../engine/FractalRegistry';
import { runMeshPipeline, runExportMesh } from '../pipeline/mesh-pipeline';
import type { PipelineCallbacks, MeshPipelineParams } from '../pipeline/types';
import type { MeshInterlaceConfig } from '../../engine/SDFShaderBuilder';
import { downloadBlob } from '../algorithms/mesh-writers';
import { resetCancel, requestCancel } from '../algorithms/dc-core';
import { resetCancel as resetCancelSparse, requestCancel as requestCancelSparse } from '../algorithms/sparse-grid';
import { emitSlicePreview } from '../store/meshExportStore';
import { GenericDropdown } from '../../components/GenericDropdown';

const MEM_COLORS: Record<string, string> = {
  webgl: '#47a', coarseGrid: '#7af', sparseGrid: '#5a8', sdfGrid: '#7af',
  meshPos: '#f80', meshNrm: '#fa0', meshIdx: '#fc0', meshCol: '#f5a', exportBlob: '#5af',
};

const btnCls = 'font-mono text-[13px] font-bold border-none rounded px-4 py-2 cursor-pointer transition-opacity disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-default';

export const ExportPanel: React.FC = () => {
  const store = useMeshExportStore();
  const isRunning = useMeshExportStore((s) => s.isRunning);
  const exportFormat = useMeshExportStore((s) => s.exportFormat);
  const lastMesh = useMeshExportStore((s) => s.lastMesh);
  const lastBlob = useMeshExportStore((s) => s.lastBlob);
  const lastFilename = useMeshExportStore((s) => s.lastFilename);
  const loadedDefinition = useMeshExportStore((s) => s.loadedDefinition);
  const selectedFormulaId = useMeshExportStore((s) => s.selectedFormulaId);

  const customFilename = useMeshExportStore((s) => s.customFilename);
  const vdbColor = useMeshExportStore((s) => s.vdbColor);
  const hasDefinition = !!(loadedDefinition || registry.get(selectedFormulaId));
  const isVDB = exportFormat === 'vdb';

  function buildParams(): MeshPipelineParams {
    const state = useMeshExportStore.getState();
    const definition = state.loadedDefinition || registry.get(state.selectedFormulaId)!;
    const halfSize = state.bboxSize.map((s) => s / 2);
    const gridMin: [number, number, number] = [
      state.bboxCenter[0] - halfSize[0], state.bboxCenter[1] - halfSize[1], state.bboxCenter[2] - halfSize[2],
    ];
    const gridMax: [number, number, number] = [
      state.bboxCenter[0] + halfSize[0], state.bboxCenter[1] + halfSize[1], state.bboxCenter[2] + halfSize[2],
    ];

    let cavityFillMode: string, cavityFillLevel: number;
    if (state.cavityFill === 'escape') { cavityFillMode = 'escape'; cavityFillLevel = 1; }
    else { cavityFillMode = 'dilate'; cavityFillLevel = parseInt(state.cavityFill) || 0; }

    // Build interlace config if present
    let interlace: MeshInterlaceConfig | undefined;
    if (state.interlaceState) {
      interlace = {
        definition: state.interlaceState.definition,
        params: state.interlaceState.params,
        enabled: state.interlaceState.enabled,
        interval: state.interlaceState.interval,
        startIter: state.interlaceState.startIter,
      };
    }

    const qs = state.qualitySettings;

    return {
      N: state.resolution, iters: state.iters, smoothPasses: state.smoothPasses,
      useNewton: state.newton, newtonSteps: state.newtonSteps, smoothLambda: state.smoothLambda,
      definition, formulaParams: state.formulaParams,
      power: (state.formulaParams.paramA as number) || 8,
      deType: state.deType, deSamples: state.deSamples, zSubSlices: state.zSubSlices,
      minFeatureSel: state.minFeature, closingRadius: state.closingRadius,
      colorSamples: state.colorSamples, colorJitterMul: state.colorJitter,
      cavityFillMode, cavityFillLevel,
      gridMin, gridMax, boundsRange: gridMax[0] - gridMin[0],
      interlace,
      estimator: qs.estimator,
      distanceMetric: qs.distanceMetric,
      surfaceThreshold: qs.surfaceThreshold,
    };
  }

  function buildCallbacks(): PipelineCallbacks {
    return {
      setStatus: (msg: string) => useMeshExportStore.getState().setStatus(msg),
      setProgress: (pct: number) => useMeshExportStore.getState().setProgress(pct),
      setPhase: (name: string, pct: number) => useMeshExportStore.getState().setPhase(name, pct),
      log: (msg: string, type?: string) => useMeshExportStore.getState().addLog(msg, type),
      memAlloc: (id: string, label: string, mb: number, color: string) =>
        useMeshExportStore.getState().memAlloc(id, label, mb, color),
      memFree: (id: string) => useMeshExportStore.getState().memFree(id),
      tick: async () => {
        await new Promise<void>((r) => setTimeout(r, 0));
        if (useMeshExportStore.getState().isCancelled) throw new Error('Cancelled');
      },
      checkCancel: () => { if (useMeshExportStore.getState().isCancelled) throw new Error('Cancelled'); },
      onSlicePreview: (imageData: ImageData, width: number, height: number) => {
        emitSlicePreview(imageData, width, height);
      },
      MEM_COLORS,
    };
  }

  const handleGenerate = async () => {
    const s = useMeshExportStore.getState();
    s.setMesh(null, '');          // clear previous mesh so preview switches to slice mode
    s.setExportBlob(null, '');    // clear stale export blob
    s.setRunning(true); s.setCancelled(false); s.setProgress(0); s.setPhase('', 0); s.clearMemory();
    resetCancel(); resetCancelSparse();
    try {
      const result = await runMeshPipeline(buildParams(), buildCallbacks());
      const state = useMeshExportStore.getState();
      state.setMesh(result.mesh, result.baseName);
      state.setTimings(result.timings, result.smoothingSkipped ?? false, result.useNarrowBand);
      if (result.gl) state.setGL(result.gl);
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message !== 'Cancelled') {
        useMeshExportStore.getState().addLog('ERROR: ' + e.message, 'error');
        useMeshExportStore.getState().setStatus('Error: ' + e.message);
      } else {
        useMeshExportStore.getState().addLog('Cancelled', 'warn');
        useMeshExportStore.getState().setStatus('Cancelled');
      }
    } finally {
      useMeshExportStore.getState().setRunning(false);
    }
  };

  const handleCancel = () => {
    requestCancel(); requestCancelSparse();
    useMeshExportStore.getState().setCancelled(true);
  };

  const handleExport = async () => {
    const s = useMeshExportStore.getState();
    s.setRunning(true); s.setCancelled(false); resetCancel(); resetCancelSparse();
    try {
      const params = buildParams();
      const result = await runExportMesh(s.exportFormat, s.lastMesh, s.lastBaseName, {
        definition: params.definition, formulaParams: params.formulaParams,
        N: params.N, iters: params.iters, power: params.power,
        gridMin: params.gridMin, gridMax: params.gridMax,
        deSamples: params.deSamples, zSubSlices: params.zSubSlices,
        interlace: params.interlace,
        estimator: params.estimator,
        distanceMetric: params.distanceMetric,
        surfaceThreshold: params.surfaceThreshold,
        vdbColor: s.vdbColor,
      }, buildCallbacks());
      const custom = useMeshExportStore.getState().customFilename.trim();
      const finalName = custom ? custom.replace(/\.[^.]+$/, '') + '.' + result.filename.split('.').pop() : result.filename;
      useMeshExportStore.getState().setExportBlob(result.blob, finalName);
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message !== 'Cancelled') {
        useMeshExportStore.getState().addLog('Export error: ' + e.message, 'error');
        useMeshExportStore.getState().setStatus('Export error: ' + e.message);
      }
    } finally {
      useMeshExportStore.getState().setRunning(false);
    }
  };

  const handleDownload = () => {
    if (lastBlob && lastFilename) downloadBlob(lastBlob, lastFilename);
  };

  return (
    <div className="font-mono flex flex-col gap-2 mt-1">
      {/* Format */}
      <GenericDropdown
        label="Format"
        value={exportFormat}
        options={[
          { label: 'GLB (Binary glTF)', value: 'glb' },
          { label: 'STL (Binary)', value: 'stl' },
          { label: 'VDB (OpenVDB)', value: 'vdb' },
        ]}
        onChange={store.setExportFormat}
        fullWidth
      />

      {/* Custom filename */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide shrink-0">Filename</span>
        <input
          type="text"
          value={customFilename}
          onChange={(e) => store.setCustomFilename(e.target.value)}
          placeholder={(loadedDefinition?.name || selectedFormulaId || 'fractal').toLowerCase().replace(/\s+/g, '-')}
          className="flex-1 h-[26px] bg-gray-800 border border-gray-700 rounded px-2 text-[11px] text-gray-200 font-mono placeholder:text-gray-600"
        />
        <span className="text-[10px] text-gray-600">.{exportFormat}</span>
      </div>

      {isVDB && (
        <div className="text-[11px] text-sky-400 bg-sky-900/20 px-2 py-1 rounded">
          VDB exports directly — no Generate needed
        </div>
      )}

      {isVDB && (
        <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={vdbColor}
            onChange={(e) => store.setVdbColor(e.target.checked)}
            className="accent-amber-500"
          />
          Include color grids (slower)
        </label>
      )}

      {/* Buttons */}
      <div className="flex gap-2 flex-wrap">
        {!isVDB && (
          <button disabled={isRunning || !hasDefinition} onClick={handleGenerate}
            className={`${btnCls} bg-emerald-700 text-white hover:bg-emerald-600`}>
            <span className="bg-white/15 rounded px-1 mr-1 text-[10px]">1</span>
            Generate
          </button>
        )}

        {isRunning && (
          <button onClick={handleCancel} className={`${btnCls} bg-red-700 text-white hover:bg-red-600`}>
            Cancel
          </button>
        )}

        <button disabled={isRunning || (!lastMesh && !isVDB)} onClick={handleExport}
          className={`${btnCls} bg-amber-700 text-white hover:bg-amber-600`}>
          <span className="bg-white/15 rounded px-1 mr-1 text-[10px]">{isVDB ? '1' : '2'}</span>
          Export
        </button>

        <button disabled={!lastBlob} onClick={handleDownload}
          className={`${btnCls} bg-sky-700 text-white hover:bg-sky-600`}>
          <span className="bg-white/15 rounded px-1 mr-1 text-[10px]">{isVDB ? '2' : '3'}</span>
          Download{lastFilename ? ` (${lastFilename})` : ''}
        </button>
      </div>
    </div>
  );
};
