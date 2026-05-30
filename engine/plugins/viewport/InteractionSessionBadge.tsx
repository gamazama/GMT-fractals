/**
 * InteractionSessionBadge — dev overlay for ADR-0061's InteractionSession.
 *
 * Mirrors AdaptiveResolutionBadge's read-from-store + palette approach, but the
 * session's hot state is NON-reactive (it lives in a module ref, read via
 * getState() per ADR Performance), so the badge polls on a RAF while open
 * instead of subscribing. The only reactive subscription is the `open` toggle
 * (debugTools.interactionSessionOpen) and the coarse `interacting` edge boolean.
 *
 * Shows, live: the hard-active interaction sources, the polled `isInteracting()`
 * (which includes the debounce tail — may read true briefly after the coarse
 * boolean flips off), the current adaptive scale (1 / qualityFraction), and the
 * P4 session-vs-accum-drop divergence counter (a STUB in P2 — never incremented
 * yet; shown so the display path exists before the parallel run).
 *
 * Self-gating: returns null unless the debug_tools `interactionSessionOpen`
 * toggle is on (advanced-menu gated). Mounted via the debug_tools overlay slot.
 *
 * @see store/slices/createInteractionSlice.ts
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 */

import React, { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../../../store/engineStore';

export interface InteractionSessionBadgeProps {
    /** Extra classes (positioning overrides). */
    className?: string;
}

export const InteractionSessionBadge: React.FC<InteractionSessionBadgeProps> = ({ className = '' }) => {
    const open = useEngineStore((s) => (s as { debugTools?: { interactionSessionOpen?: boolean } }).debugTools?.interactionSessionOpen);
    // Reactive coarse edge boolean — cheap, flips once per gesture. The polled
    // value below (which includes the debounce tail) is read non-reactively.
    const edgeInteracting = useEngineStore((s) => s.interacting);

    // Poll the non-reactive session API on a RAF while open, so live sources +
    // the debounce-tail isInteracting() refresh without subscribing the hot path.
    const [, force] = useState(0);
    const rafRef = useRef(0);
    useEffect(() => {
        if (!open) return;
        let alive = true;
        const tick = () => {
            if (!alive) return;
            force((n) => (n + 1) & 0xffff);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { alive = false; cancelAnimationFrame(rafRef.current); };
    }, [open]);

    if (!open) return null;

    const st = useEngineStore.getState();
    const sources = Array.from(st.getInteractionSources());
    // Sources active OR within the debounce tail — names a discrete poke (wheel)
    // that adds no hard-active source, so it reads as `camera` not an anon tail.
    const recent = Array.from(st.getRecentInteractionSources?.() ?? []);
    const tailOnly = recent.filter((s) => !sources.includes(s));
    const polledInteracting = st.isInteracting();
    const qf = st.qualityFraction || 1;
    const scale = qf > 0 ? 1 / qf : 1;
    const divergence = st.interactionDivergenceCount ?? 0;

    const dot = (on: boolean) => (
        <span className={`inline-block w-2 h-2 rounded-full ${on ? 'bg-cyan-400' : 'bg-gray-600'}`} />
    );

    return (
        <div
            className={`fixed left-[50px] top-1/2 -translate-y-1/2 z-50 pointer-events-none select-none font-mono text-[10px] leading-tight px-2 py-1.5 rounded bg-black/70 border border-cyan-500/30 text-cyan-200 ${className}`}
            title="ADR-0061 InteractionSession (dev overlay)"
        >
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-0.5">
                {dot(polledInteracting)} Interaction Session
            </div>
            <div>
                <span className="text-gray-400">interacting:</span>{' '}
                <span className={polledInteracting ? 'text-cyan-300' : 'text-gray-500'}>
                    {String(polledInteracting)}
                </span>
                <span className="text-gray-600">{edgeInteracting === polledInteracting ? '' : ' (tail)'}</span>
            </div>
            <div>
                <span className="text-gray-400">sources:</span>{' '}
                <span className={sources.length ? 'text-cyan-300' : 'text-gray-500'}>
                    {sources.length ? sources.join(', ') : '—'}
                </span>
                {tailOnly.length > 0 && (
                    <span className="text-gray-500"> +{tailOnly.join(', ')} (tail)</span>
                )}
            </div>
            <div>
                <span className="text-gray-400">adaptive scale:</span>{' '}
                <span className={scale > 1.001 ? 'text-amber-300' : 'text-gray-300'}>
                    {scale.toFixed(2)}×
                </span>
                <span className="text-gray-600"> (qf {qf.toFixed(2)})</span>
            </div>
            <div>
                <span className="text-gray-400">divergence:</span>{' '}
                <span className="text-gray-300">{divergence}</span>
                <span className="text-gray-600"> (P4)</span>
            </div>
        </div>
    );
};
