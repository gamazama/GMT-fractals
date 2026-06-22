/**
 * RenderContextLostOverlay — full-screen recovery prompt shown when the render
 * worker loses its WebGL context (GPU watchdog reset — typically a too-heavy
 * frame on a weak mobile GPU; also Windows TDR on desktop).
 *
 * Before this, a lost context produced a silent frozen viewport: the worker
 * kept submitting draws to a dead context with no feedback. Now WorkerProxy
 * emits RENDER_CONTEXT_LOST, this overlay surfaces it, and a reload comes up in
 * "safe mode" (useAppStartup downgrades the scalability preset for one boot via
 * the `gmt.gpuCrashed` sessionStorage flag), so the user isn't dropped back into
 * the same crashing scene → black screen.
 *
 * Additive + self-contained: renders nothing until the event fires.
 */
import React, { useEffect, useState } from 'react';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';

export const RenderContextLostOverlay: React.FC = () => {
    const [reason, setReason] = useState<string | null>(null);

    useEffect(() => {
        const off = FractalEvents.on(FRACTAL_EVENTS.RENDER_CONTEXT_LOST, ({ reason }) => {
            setReason(reason);
        });
        return off;
    }, []);

    if (!reason) return null;

    return (
        <div
            className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-surface text-fg text-center px-8 select-none"
            style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <div className="text-danger mb-4 animate-pulse">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            </div>
            <h2 className="text-lg font-bold mb-2">Rendering stopped</h2>
            <p className="text-fg-muted text-sm max-w-xs mb-6">
                {reason} Reloading will resume in a lighter mode.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-lg bg-accent-600 hover:bg-accent-500 active:bg-accent-700 text-fg font-bold text-sm transition-colors"
            >
                Reload
            </button>
        </div>
    );
};
