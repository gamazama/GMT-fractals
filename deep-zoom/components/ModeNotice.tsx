/**
 * deep-zoom/components/ModeNotice.tsx - says when a tab's controls change no pixel.
 *
 * The renderer has two paths. Above about 1e-4 surface distance (precision Auto), with precision
 * f32, and while the deep shader compiles, it draws the f32 picture, and that path has no light,
 * look or colour input at all (grep `const FRAG =` in deep-zoom/renderer/core.js). So at boot the
 * Light and Colour tabs move nothing. This widget states it at the top of those tabs while the
 * mode is f32; it renders nothing in deep mode.
 *
 * It offers no switch on purpose. Forcing precision to Deep at a shallow depth does not light the
 * picture: the perturbation path draws one flat colour there (seen 2026-10-08 at depth 1.1). The
 * way into deep mode is to go deeper.
 *
 * Registered as `dz-mode-notice` in registerFeatures.ts; panels.ts places it. Reads telemetry only.
 */
import React from 'react';
import { useDzTelemetry } from '../host/telemetry';

export const ModeNotice: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const mode = useDzTelemetry((t) => t.mode);
    if (!live || mode === 'deep') return null;
    return (
        <div data-dz-mode-notice className="mx-2 my-1.5 px-2 py-1.5 rounded border border-line/15 text-[10px] leading-snug text-fg-tertiary">
            These act below 1e-4 surface distance. The picture is f32 now.
        </div>
    );
};
