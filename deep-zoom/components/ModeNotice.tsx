/**
 * deep-zoom/components/ModeNotice.tsx - says when a tab's controls change no pixel.
 *
 * The renderer has two paths. Above about 1e-4 surface distance (precision Auto), with precision
 * f32, and while the deep shader compiles, it draws the f32 picture, and that path has no light,
 * look or colour input at all (grep `const FRAG =` in deep-zoom/renderer/core.js). So at boot the
 * Light and Colour tabs move nothing. This widget states it at the top of those tabs while the
 * mode is f32; it renders nothing in deep mode.
 *
 * It offers no switch. CORRECTED 2026-10-08: this header said that forcing precision to Deep at a
 * shallow depth "draws one flat colour". It does so only with the camera EXACTLY on the bulb's z
 * axis - which is where the start view sits (0, 0, 2.6), the one place it was tried. The deep
 * path's reference orbit is degenerate there. 1e-9 off the axis it draws the whole bulb, lit, and
 * better than f32 does (measured the same day; pictures under debug/scratch/f32/). So a switch
 * would work everywhere but the start view; whether deep becomes the picture at every depth, and
 * this notice goes, is an open call with the owner.
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
