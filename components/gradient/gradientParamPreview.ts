/**
 * gradientParamPreview — a gradient param's RENDER-ONLY preview, for every surface that shows it.
 *
 * A tool may show a gradient param's would-be result on the fractal without writing the param —
 * GMT's Gradient Studio does while a Curves / Adjust / Paint face is live (`previewGradient` in
 * `palette/store/gradientStudio.ts`), so the store, undo and saves keep the gradient until the face
 * bakes. Every OTHER surface that draws that param must then show the preview too, or it disagrees
 * with the fractal (owner, 2026-09-26: the sidebar editor "only updates once the user has closed the
 * expanded gradient editor, while the fractal is updating instantly"). This is where the preview is
 * published, keyed by `(featureId, paramKey)`:
 *   • `AutoFeaturePanel` hands it to its gradient editors as `previewConfig` — the bar paints it and
 *     the knots read as the gradient underneath (the editor's `knotsStale`);
 *   • GMT's section-header strips (`engine-gmt/components/panels/gradient/GradientPreview.tsx`).
 *
 * Engine-core, because both readers are: the palette's Studio writes into it, never the reverse.
 * Side-effect-free at import; no store.
 *
 * @assumption A preview is cleared by whoever set it (the Studio clears on bake, cancel, leaving the
 *   face, moving to another param and unmounting). Nothing clears a stale one otherwise, and no guard
 *   reaches this file beyond `npm run smoke:gradient-studio` [2b], which reads the sidebar bar.
 */

import { useSyncExternalStore } from 'react';
import type { GradientConfig } from '../../types';

const _previews = new Map<string, GradientConfig>();
const _listeners = new Set<() => void>();
const keyOf = (featureId: string, paramKey: string): string => `${featureId}\u0000${paramKey}`;

/** Publish (or with `null`, clear) the preview of one gradient param. */
export const setGradientParamPreview = (featureId: string, paramKey: string, config: GradientConfig | null): void => {
    const k = keyOf(featureId, paramKey);
    if (config ? _previews.get(k) === config : !_previews.has(k)) return;
    if (config) _previews.set(k, config);
    else _previews.delete(k);
    _listeners.forEach((l) => l());
};

/** The current preview of a param, if any (non-reactive). */
export const getGradientParamPreview = (featureId: string, paramKey: string): GradientConfig | undefined =>
    _previews.get(keyOf(featureId, paramKey));

const subscribe = (l: () => void): (() => void) => {
    _listeners.add(l);
    return () => { _listeners.delete(l); };
};

/** Reactive: the preview of a param, or undefined — the object identity changes only when it does. */
export const useGradientParamPreview = (featureId: string | undefined, paramKey: string | undefined): GradientConfig | undefined =>
    useSyncExternalStore(subscribe, () => (featureId && paramKey ? _previews.get(keyOf(featureId, paramKey)) : undefined));
