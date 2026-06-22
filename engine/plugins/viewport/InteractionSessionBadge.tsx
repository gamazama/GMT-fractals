/**
 * InteractionSessionBadge — dev overlay for ADR-0061's InteractionSession.
 *
 * Mirrors AdaptiveResolutionBadge's read-from-store + palette approach, but the
 * session's hot state is NON-reactive (it lives in a module ref, read via
 * getState() per ADR Performance), so the badge polls on a RAF while open
 * instead of subscribing. The only reactive subscriptions are the `open` toggle
 * (debugTools.interactionSessionOpen), the coarse `interacting` edge boolean,
 * and the per-consumer flags (low-frequency).
 *
 * Shows, live: the hard-active interaction sources (+ any source still within
 * the debounce tail, e.g. a wheel poke, marked `(tail)`) and the polled
 * `isInteracting()` (incl. the debounce tail). Permanent session monitor — the
 * P4 per-consumer flag TOGGLES and the divergence counter were parallel-run
 * instruments and were removed in P5 (the session is the sole signal now, so
 * there is nothing to diverge from and no flag to flip).
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

    const dot = (on: boolean) => (
        <span className={`inline-block w-2 h-2 rounded-full ${on ? 'bg-accent-400' : 'bg-fg-faint'}`} />
    );

    return (
        <div
            className={`fixed left-[50px] top-1/2 -translate-y-1/2 z-50 pointer-events-none select-none font-mono text-[10px] leading-tight px-2 py-1.5 rounded bg-surface/80 border border-accent-500/30 text-accent-300 ${className}`}
            title="ADR-0061 InteractionSession (dev overlay)"
        >
            <div className="flex items-center gap-1.5 text-accent-400 font-semibold mb-0.5">
                {dot(polledInteracting)} Interaction Session
            </div>
            <div>
                <span className="text-fg-muted">interacting:</span>{' '}
                <span className={polledInteracting ? 'text-accent-300' : 'text-fg-dim'}>
                    {String(polledInteracting)}
                </span>
                <span className="text-fg-faint">{edgeInteracting === polledInteracting ? '' : ' (tail)'}</span>
            </div>
            <div>
                <span className="text-fg-muted">sources:</span>{' '}
                <span className={sources.length ? 'text-accent-300' : 'text-fg-dim'}>
                    {sources.length ? sources.join(', ') : '—'}
                </span>
                {tailOnly.length > 0 && (
                    <span className="text-fg-dim"> +{tailOnly.join(', ')} (tail)</span>
                )}
            </div>
        </div>
    );
};
