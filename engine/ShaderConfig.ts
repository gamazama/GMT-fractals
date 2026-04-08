
import { PipelineNode, FractalGraph } from '../types/graph';

/**
 * The configuration object passed to ShaderFactory and all feature inject() callbacks.
 * Contains the current state of every registered DDFS feature, keyed by feature ID.
 *
 * Structural fields (formula, pipeline, etc.) are typed directly.
 * Feature state fields (e.g. config.lighting, config.ao) come through the index signature
 * and require a cast until FeatureStateMap is implemented.
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
    // Feature state is keyed by feature ID (e.g. config.lighting, config.ao).
    // Replace with FeatureStateMap intersection type when that is implemented.
    [key: string]: any;
}
