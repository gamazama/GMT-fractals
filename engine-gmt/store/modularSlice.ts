/**
 * GMT modular-builder slice — `pipeline`, `graph`, `pipelineRevision`
 * state + `setGraph` / `setPipeline` / `refreshPipeline` actions.
 *
 * Backs the Modular formula's node-graph editor (FlowEditor panel).
 * Without this installed, selecting the Modular formula crashes
 * FlowEditor at `state.graph.nodes` (undefined).
 *
 * Same install shape as cameraSlice — patches the already-constructed
 * engineStore via `setState(...)`. Root types already declare `pipeline`,
 * `graph`, `pipelineRevision` plus the actions, so no typing work needed.
 * Call `installGmtModularSlice()` once at app boot, after the store is
 * constructed and before any UI reads Modular state.
 */

import type { FractalGraph, PipelineNode } from '../types';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import {
    pipelineToGraph,
    isStructureEqual,
    isPipelineEqual,
    topologicalSort,
} from '../utils/graphAlg';
import { JULIA_REPEATER_PIPELINE } from '../data/initialPipelines';
import { useEngineStore } from '../../store/engineStore';

export const installGmtModularSlice = (): void => {
    const set = useEngineStore.setState as (partial: any) => void;
    const get = useEngineStore.getState as () => any;

    set({
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
                FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sortedPipeline, graph: g, pipelineRevision: nextRev } as any);
            } else if (structureChanged) {
                set({ graph: g });
            } else if (contentChanged) {
                set({ graph: g, pipeline: sortedPipeline });
                FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sortedPipeline } as any);
            } else {
                set({ graph: g });
            }
        },

        setPipeline: (p: PipelineNode[]) => {
            const nextRev = get().pipelineRevision + 1;
            const newGraph = pipelineToGraph(p);
            set({ pipeline: p, graph: newGraph, pipelineRevision: nextRev });
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: p, graph: newGraph, pipelineRevision: nextRev } as any);
        },

        refreshPipeline: () => {
            const s = get();
            const sorted = topologicalSort(s.graph.nodes, s.graph.edges);
            const nextRev = s.pipelineRevision + 1;
            set({ pipeline: sorted, pipelineRevision: nextRev });
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sorted, graph: s.graph, pipelineRevision: nextRev } as any);
        },
    });
};
