
import { StateCreator } from 'zustand';
import { FractalStoreState, FractalActions } from '../../types';
import type { FractalGraph, PipelineNode } from '../../types';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { pipelineToGraph, isStructureEqual, isPipelineEqual, topologicalSort } from '../../utils/graphAlg';
import { JULIA_REPEATER_PIPELINE } from '../../data/initialPipelines';

export type ModularSlice =
    Pick<FractalStoreState, 'pipeline' | 'graph' | 'pipelineRevision'> &
    Pick<FractalActions, 'setGraph' | 'setPipeline' | 'refreshPipeline'>;

export const createModularSlice: StateCreator<
    FractalStoreState & FractalActions,
    [['zustand/subscribeWithSelector', never]],
    [],
    ModularSlice
> = (set, get) => ({

    // --- State ---
    pipeline: JULIA_REPEATER_PIPELINE,
    pipelineRevision: 1,
    graph: pipelineToGraph(JULIA_REPEATER_PIPELINE),

    // --- Actions ---

    setGraph: (g: FractalGraph) => {
        const sortedPipeline = topologicalSort(g.nodes, g.edges);
        const s = get();
        const structureChanged = !isStructureEqual(s.pipeline, sortedPipeline);
        const contentChanged = structureChanged || !isPipelineEqual(s.pipeline, sortedPipeline);

        if (structureChanged && s.autoCompile) {
            const nextRev = s.pipelineRevision + 1;
            set({ graph: g, pipeline: sortedPipeline, pipelineRevision: nextRev });
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sortedPipeline, graph: g, pipelineRevision: nextRev });
        } else if (structureChanged) {
            // autoCompile off — store position update only, defer compile to manual trigger
            set({ graph: g });
        } else if (contentChanged) {
            // Param-only change — fast uniform update, no recompile
            set({ graph: g, pipeline: sortedPipeline });
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sortedPipeline });
        } else {
            // Position-only change
            set({ graph: g });
        }
    },

    setPipeline: (p: PipelineNode[]) => {
        const nextRev = get().pipelineRevision + 1;
        const newGraph = pipelineToGraph(p);
        set({ pipeline: p, graph: newGraph, pipelineRevision: nextRev });
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: p, graph: newGraph, pipelineRevision: nextRev });
    },

    refreshPipeline: () => {
        const s = get();
        const sorted = topologicalSort(s.graph.nodes, s.graph.edges);
        const nextRev = s.pipelineRevision + 1;
        set({ pipeline: sorted, pipelineRevision: nextRev });
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sorted, graph: s.graph, pipelineRevision: nextRev });
    },
});
