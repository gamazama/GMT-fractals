/**
 * GMT modular-builder slice — `pipeline`, `graph`, `pipelineRevision`,
 * `compiledStructureKey` state + `setGraph` / `setPipeline` /
 * `refreshPipeline` actions.
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
    structureKey,
    isPipelineEqual,
    topologicalSort,
} from '../utils/graphAlg';
import { JULIA_REPEATER_PIPELINE } from '../data/initialPipelines';
import { useEngineStore } from '../../store/engineStore';

export const installGmtModularSlice = (): void => {
    const set = useEngineStore.setState as (partial: any) => void;
    const get = useEngineStore.getState as () => any;

    const initialGraph = pipelineToGraph(JULIA_REPEATER_PIPELINE);
    set({
        // --- State ---
        pipeline: JULIA_REPEATER_PIPELINE,
        pipelineRevision: 1,
        graph: initialGraph,
        // Fingerprint of the graph the current shader was compiled from. The
        // FlowEditor's COMPILE button pulses while the live graph's key differs.
        compiledStructureKey: structureKey(JULIA_REPEATER_PIPELINE, initialGraph.edges),

        // --- Actions ---
        setGraph: (g: FractalGraph) => {
            const sortedPipeline = topologicalSort(g.nodes, g.edges);
            const s = get();
            // Structural edits (nodes, wiring, bindings, condition toggles)
            // change the GLSL and wait for an explicit COMPILE (refreshPipeline).
            // There is no auto-compile: the control that claimed otherwise was
            // never implemented and was removed 2026-09-02. Content edits
            // (slider values) push uniforms immediately, but only while the
            // structure matches what is compiled — otherwise the values would
            // land in the wrong slots (ADR-0050).
            const structureChanged = structureKey(sortedPipeline, g.edges) !== s.compiledStructureKey;
            const contentChanged = !isPipelineEqual(s.pipeline, sortedPipeline);

            if (structureChanged) {
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
            set({ pipeline: p, graph: newGraph, pipelineRevision: nextRev, compiledStructureKey: structureKey(p, newGraph.edges) });
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: p, graph: newGraph, pipelineRevision: nextRev } as any);
        },

        refreshPipeline: () => {
            const s = get();
            const sorted = topologicalSort(s.graph.nodes, s.graph.edges);
            const nextRev = s.pipelineRevision + 1;
            set({ pipeline: sorted, pipelineRevision: nextRev, compiledStructureKey: structureKey(sorted, s.graph.edges) });
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sorted, graph: s.graph, pipelineRevision: nextRev } as any);
        },
    });
};
