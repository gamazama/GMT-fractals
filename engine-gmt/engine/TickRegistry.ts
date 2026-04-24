/**
 * Re-export of the shared `engine/TickRegistry` — the tick registry
 * holds per-phase callback maps that must be shared across all tick
 * producers and the one frame loop that dispatches them.
 */
export * from '../../engine/TickRegistry';
