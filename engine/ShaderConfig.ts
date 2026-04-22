
/**
 * The configuration object passed to ShaderFactory and all feature inject() callbacks.
 * Contains the current state of every registered DDFS feature, keyed by feature ID.
 *
 * The engine treats this as an opaque record. App-layer plugins (e.g. a
 * fractal-app plugin) can widen this type via declaration merging to add
 * their own well-typed fields (formula, pipeline, graph, etc.) without
 * the engine needing to know about them.
 */
export interface ShaderConfig {
    // --- Structural (engine-level) ---
    /** Opaque identifier for the active shader variant. Apps assign meaning. */
    formula?: string;
    /** Bumped by app-layer code when structural changes require a full recompile. */
    pipelineRevision?: number;
    msaaSamples?: number;
    previewMode?: boolean;
    maxSteps?: number;
    /** Render mode label. Engine treats as opaque tag; app-layer interprets. */
    renderMode?: string;
    compilerHardCap?: number;

    // --- Feature state (generic) ---
    // Feature state is keyed by feature ID (e.g. config.myFeature).
    // Apps extend this interface via declaration merging for typed access.
    [key: string]: any;
}
