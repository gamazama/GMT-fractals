/**
 * deep-zoom/GradientSync.tsx - the gradient, sent to the renderer as texels.
 *
 * PURPOSE
 *   `dzColour.gradient` is the one look value that is not a number: the renderer takes it as a row
 *   of 256 RGBA texels (`host.setGradientRamp`). This component is the only caller of that member.
 *   What it sends is the gradient ON SHOW: a tool's render-only preview when one is published for
 *   the param, else the value the store holds.
 *
 * SEAMS
 *   - Mounted once by `DeepZoomApp.tsx`, as its own component and not a hook of the app: it
 *     re-renders on every gradient change (a stop being dragged), and the app tree must not.
 *   - The preview is `components/gradient/gradientParamPreview.ts`. The Gradient Studio publishes
 *     there while a Curves / Adjust / Paint face is live and writes the param only when the face
 *     bakes (`previewGradient` in `palette/store/gradientStudio.ts`). The Studio's own route to a
 *     picture is the param's uniform name, which this app's param does not have - without this
 *     read a live face would change nothing on screen until it baked.
 *   - The bake is `generateGradientTextureBuffer` (utils/colorUtils.ts), the one every app uses.
 *     It honours the gradient's own `colorSpace`; why that is 'linear' here: THE GRADIENT in
 *     `deep-zoom/features/colour.ts`.
 *
 * PITFALLS
 *   - Nothing is sent before `host.ready`, as in `useHostSync.ts`. A new host (StrictMode's second
 *     mount, a lost context) is sent the gradient again: the effect depends on the host.
 *   - Each send restarts the still.
 *
 * @assumption A preview is cleared by whoever published it; this file shows a stale one for as
 *   long as it stays published (the same assumption `gradientParamPreview.ts` records).
 */
import React, { useEffect } from 'react';
import { useEngineStore } from '../store/engineStore';
import { useGradientParamPreview } from '../components/gradient/gradientParamPreview';
import { generateGradientTextureBuffer } from '../utils/colorUtils';
import { getHost, useHost } from './host/current';
import { DZ_GRADIENT_PARAM } from './features/colour';

export const GradientSync: React.FC = () => {
    const host = useHost();
    const stored = useEngineStore((s) => s.dzColour.gradient);
    const preview = useGradientParamPreview(DZ_GRADIENT_PARAM.featureId, DZ_GRADIENT_PARAM.paramKey);
    const shown = preview ?? stored;

    useEffect(() => {
        if (!host || !shown) return;
        let live = true;
        // The host attaches its own catch to `ready`; a failed boot simply never gets a gradient.
        void host.ready.then(() => {
            if (live && getHost() === host) void host.setGradientRamp?.(generateGradientTextureBuffer(shown), 256);
        }, () => undefined);
        return () => { live = false; };
    }, [host, shown]);

    return null;
};
