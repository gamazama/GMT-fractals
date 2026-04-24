/**
 * FpsCounter — compact FPS readout for the topbar.
 *
 * Reads smoothed FPS from @engine/viewport's useViewportFps hook, which
 * sources from the adaptive loop's sample windows (updated every ~500ms).
 * No direct coupling to any specific render engine — just displays
 * whatever FPS apps are reporting via viewport.frameTick() / reportFps().
 */

import React from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { useViewportFps } from '../Viewport';

export const FpsCounter: React.FC = () => {
    const { fpsSmoothed } = useViewportFps();
    const isPaused = useEngineStore((s) => (s as any).isPaused);

    return (
        <span
            className={`text-[10px] font-mono w-12 text-right transition-colors duration-300 ${
                isPaused ? 'text-gray-600' : 'text-cyan-500/80'
            }`}
            title={isPaused ? 'Rendering Paused' : 'Frames Per Second'}
        >
            {fpsSmoothed > 0 ? `${Math.round(fpsSmoothed)} FPS` : '-- FPS'}
        </span>
    );
};
