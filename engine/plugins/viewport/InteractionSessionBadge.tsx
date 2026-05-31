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
 * the debounce tail, e.g. a wheel poke, marked `(tail)`), the polled
 * `isInteracting()` (incl. the debounce tail), per-consumer flag TOGGLES so the
 * user can flip each P4 consumer independently for the visual pass, and the P4
 * DIVERGENCE counter (session vs. legacy proxy+accum-drop, with the last
 * disagreement context). The divergence counter is computed by the GMT tick
 * driver only while this overlay is open and zeroes on each open.
 *
 * Self-gating: returns null unless the debug_tools `interactionSessionOpen`
 * toggle is on (advanced-menu gated). Mounted via the debug_tools overlay slot.
 *
 * @see store/slices/createInteractionSlice.ts
 * @see engine-gmt/renderer/GmtRendererTickDriver.tsx (divergence computation)
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 */

import React, { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import type { InteractionConsumerFlags } from '../../../types/store';

export interface InteractionSessionBadgeProps {
    /** Extra classes (positioning overrides). */
    className?: string;
}

const CONSUMER_FLAGS: Array<keyof InteractionConsumerFlags> = ['adaptive', 'hold', 'hudFade', 'idlePause'];

export const InteractionSessionBadge: React.FC<InteractionSessionBadgeProps> = ({ className = '' }) => {
    const open = useEngineStore((s) => (s as { debugTools?: { interactionSessionOpen?: boolean } }).debugTools?.interactionSessionOpen);
    // Reactive coarse edge boolean — cheap, flips once per gesture. The polled
    // value below (which includes the debounce tail) is read non-reactively.
    const edgeInteracting = useEngineStore((s) => s.interacting);
    // Per-consumer flags + setter — low-frequency, fine to subscribe.
    const flags = useEngineStore((s) => s.interactionConsumerFlags);
    const setFlag = useEngineStore((s) => s.setInteractionConsumerFlag);

    // Poll the non-reactive session API on a RAF while open, so live sources +
    // the debounce-tail isInteracting() + the divergence count refresh without
    // subscribing the hot path.
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
    const divergence = st.interactionDivergenceCount;
    const divergenceLast = st.interactionDivergenceLast;

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

            {/* P4 divergence (session vs. legacy proxy + accum-drop). Near-zero =
                agreement; a count named slider/picker/drawing is the expected
                session-leads-the-laggy-accum-drop win. Resets on each open. */}
            <div>
                <span className="text-gray-400">divergence:</span>{' '}
                <span className={divergence > 0 ? 'text-amber-300' : 'text-gray-500'}>{divergence}</span>
                {divergenceLast && <span className="text-gray-500"> · {divergenceLast}</span>}
            </div>

            {/* Per-consumer kill-switch flags — click to flip each P4 consumer
                independently (so a regression bisects to one). pointer-events-auto
                only on this row; the rest of the badge stays click-through. */}
            <div className="flex items-center gap-1 mt-1 pointer-events-auto">
                <span className="text-gray-400">consumers:</span>
                {CONSUMER_FLAGS.map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setFlag(k, !flags[k])}
                        className={`px-1 rounded border text-[9px] ${flags[k]
                            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-100'
                            : 'bg-transparent border-gray-600 text-gray-500 hover:text-gray-300'}`}
                        title={`Toggle the '${k}' consumer (session ↔ legacy proxy)`}
                    >
                        {k}
                    </button>
                ))}
            </div>
        </div>
    );
};
