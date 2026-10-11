/**
 * deep-zoom/components/ModeNotice.tsx - one line at the top of the Light and Colour tabs while the
 * picture is the f32 baseline.
 *
 * The f32 baseline has no light, look or colour input at all (grep `const FRAG =` in
 * deep-zoom/renderer/core.js), so while it is the picture those tabs move nothing. SINCE 2026-10-08
 * THAT IS ONLY WHILE THE DEEP SHADER COMPILES, a few seconds after the page opens: the shell
 * starts the renderer with `mode: 'deep'` (host/moduleHost.ts) and the deep path draws at every
 * depth. Before that day f32 drew everything shallower than 1e-4 and this line read "These act
 * below 1e-4 surface distance".
 *
 * HISTORY, kept because it cost a day: this header once said that forcing the deep path at a
 * shallow depth "draws one flat colour". It did so only with the camera EXACTLY on the bulb's z
 * axis - where the start view sits, the one place it had been tried. The renderer now keeps the
 * camera off that axis (grep `POLE GUARD` in core.js).
 *
 * SINCE 2026-10-11 the deep shader is the ray march's program, the bulb's only one. When it cannot
 * be built the f32 baseline is all there is, for good, and this line says THAT instead of "still
 * starting" (`DZ_RAY_FAILED_TEXT`, host/current.ts: the same line as the status chip and the toast).
 *
 * Registered as `dz-mode-notice` in registerFeatures.ts; panels.ts places it. Reads telemetry only.
 */
import React from 'react';
import { DZ_RAY_FAILED_TEXT } from '../host/current';
import { useDzTelemetry } from '../host/telemetry';

export const ModeNotice: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    const mode = useDzTelemetry((t) => t.mode);
    const failedBuild = useDzTelemetry((t) => !t.ready && t.error !== '');
    if (!live || mode === 'deep') return null;
    return (
        <div data-dz-mode-notice={failedBuild ? 'failed' : 'starting'} className="mx-2 my-1.5 px-2 py-1.5 rounded border border-line/15 text-[10px] leading-snug text-fg-tertiary">
            {failedBuild
                ? DZ_RAY_FAILED_TEXT + ' Light and colour act on the deep picture only.'
                : 'The deep renderer is still starting. Light and colour act once it has.'}
        </div>
    );
};
