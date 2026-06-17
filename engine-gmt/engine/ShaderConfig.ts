
import { PipelineNode, FractalGraph } from '../types/graph';

/**
 * The configuration object passed to ShaderFactory and all feature inject() callbacks.
 * Contains the current state of every registered DDFS feature, keyed by feature ID.
 *
 * Structural fields (formula, pipeline, etc.) are typed directly here for the
 * engine-gmt fork. Feature state fields (e.g. `config.lighting`, `config.ao`)
 * come through the `[key: string]: any` index signature.
 *
 * Engine-core (`engine/ShaderConfig.ts`) has moved to per-app declaration
 * merging — apps widen the base interface with their own well-typed fields.
 * Engine-gmt keeps the typed-fields shape because the GMT renderer reads
 * `formula`, `pipeline`, `graph`, `pipelineRevision`, `shadows`, etc.
 * directly without going through DDFS feature state.
 */
export interface ShaderConfig {
    formula: string;
    pipeline?: PipelineNode[];
    graph?: FractalGraph;
    pipelineRevision: number;
    msaaSamples?: number;
    previewMode?: boolean;
    maxSteps?: number;
    renderMode?: 'Direct' | 'PathTracing';
    compilerHardCap?: number;
    shadows?: boolean;
    [key: string]: any;
}
