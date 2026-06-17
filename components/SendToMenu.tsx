/**
 * SendToMenu — the reusable "Send to ▾" affordance over the send-target kernel
 * (W2, P0e interface (c)). A hero/result header mounts this once; it reads the
 * registry, filters to the targets applicable to `payload` (dropping the self
 * target and any whose `accepts(payload)` is false), groups host vs mode, and
 * calls the chosen target's `apply(payload)`.
 *
 * Thin view: the listed set comes from the pure `targetsForPayload` selector, so
 * the node harness covers the menu's contents + filtering by construction. The
 * only local state is transient menu open/anchor — no DDFS, no persist, no undo
 * (per the P0e constraint).
 *
 * Generic over payload `P`: pass whatever your targets expect (P1/P2 pass a
 * gradient payload). `payload` is a plain value (matching the frozen §4(c)
 * `payload={…}`); a hero that recomputes it per render should memoize upstream.
 *
 * @see store/sendTargetRegistry.ts
 */

import React, { useState, useSyncExternalStore } from 'react';
import {
    getSendTargets,
    subscribeSendTargets,
    targetsForPayload,
    type SendTarget,
} from '../store/sendTargetRegistry';
import { AnchoredMenu } from './ui/AnchoredMenu';

export interface SendToMenuProps<P> {
    /** The payload to send. */
    payload: P;
    /** Hide the target with this id (the hero's own mode). */
    selfId?: string;
    /** Trigger label. Default "Send to". */
    label?: string;
    /** Called after a target applies, with the chosen target. */
    onSent?: (target: SendTarget<P>) => void;
    className?: string;
    /** Disable the trigger (e.g. nothing to send yet). */
    disabled?: boolean;
}

const GROUP_LABEL: Record<SendTarget['group'], string> = {
    mode: 'Modes',
    host: 'Destinations',
};

export function SendToMenu<P>({
    payload,
    selfId,
    label = 'Send to',
    onSent,
    className,
    disabled,
}: SendToMenuProps<P>): React.ReactElement {
    // Re-render when targets register/unregister (defensive — usually boot-time).
    useSyncExternalStore(subscribeSendTargets, getSendTargets, getSendTargets);
    const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

    const open = (e: React.MouseEvent) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setAnchor({ x: r.left, y: r.bottom + 4 });
    };

    const choose = (t: SendTarget<P>) => {
        setAnchor(null);
        try {
            t.apply(payload);
            onSent?.(t);
        } catch (err) {
            console.warn(`[sendTarget] target "${t.id}" apply threw`, err);
        }
    };

    // Filter against the current payload so `accepts` sees current state.
    const targets = anchor ? targetsForPayload(payload, { selfId }) : [];

    return (
        <>
            <button
                type="button"
                disabled={disabled}
                onClick={open}
                className={
                    className ??
                    'inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-200 hover:bg-white/10 disabled:opacity-40'
                }
                aria-haspopup="menu"
                aria-expanded={anchor != null}
            >
                {label} <span aria-hidden>▾</span>
            </button>
            {anchor && (
                <AnchoredMenu anchor={anchor} onClose={() => setAnchor(null)}>
                    <div
                        role="menu"
                        className="min-w-44 rounded-md border border-white/10 bg-zinc-900/95 py-1 text-sm text-gray-200 shadow-xl"
                    >
                        {targets.length === 0 && (
                            <div className="px-3 py-1.5 text-xs text-gray-500">No targets</div>
                        )}
                        {(['mode', 'host'] as const).map((group) => {
                            const items = targets.filter((t) => t.group === group);
                            return (
                                items.length > 0 && (
                                    <div key={group}>
                                        <div className="px-3 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                                            {GROUP_LABEL[group]}
                                        </div>
                                        {items.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                role="menuitem"
                                                onClick={() => choose(t)}
                                                className="block w-full px-3 py-1.5 text-left hover:bg-white/10"
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                )
                            );
                        })}
                    </div>
                </AnchoredMenu>
            )}
        </>
    );
}

export default SendToMenu;
