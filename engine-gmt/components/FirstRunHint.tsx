/**
 * FirstRunHint — a slim, dismissible top banner shown once to first-time
 * visitors (H1). Points newcomers at the help menu + the formula picker so
 * the create→share loop is discoverable without a blocking modal. Dismissal
 * persists in localStorage, so returning users never see it again.
 *
 * WHERE IT SITS (owner, 2026-09-24): centred, 8 px BELOW the top bar, over the top of the
 * viewport — never on the bar. It used to sit at `top-2`, on the bar itself, and at 1400×900
 * covered High-res render, Expand Light Studio, Shadow Settings and the light-gizmo button
 * until it was dismissed (found by `smoke:chrome` on 2026-09-16). The bar is TopBarHost's
 * fixed `h-14` (grep `h-14 z-[500]` in engine/plugins/TopBar.tsx) — measured 56 px tall at
 * 1400×900 on 2026-09-24 — so `top-16` is its bottom edge + 8. If the bar's height changes,
 * this changes with it. Its stacking comes from the tier table (`shellToast`, the toasts' own
 * tier, above the bar's `shellTopbar`), not a raw z.
 */
import React, { useState } from 'react';
import { Layer } from '../../components/ui';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';

const KEY = 'gmt-firstrun-dismissed';

const wasDismissed = (): boolean => safeLocalGet(KEY) === '1';

export const FirstRunHint: React.FC = () => {
    const [dismissed, setDismissed] = useState(wasDismissed);
    if (dismissed) return null;

    const close = () => {
        safeLocalSet(KEY, '1');
        setDismissed(true);
    };

    return (
        <Layer tier="shellToast" className="top-16 left-1/2 -translate-x-1/2 pointer-events-none" data-gmt-first-run-hint="">
            <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 bg-surface-sunken/95 border border-accent-500/30 rounded-full shadow-xl backdrop-blur-md">
                <span className="text-[11px] text-cyan-100">
                    👋 New here? Open the <span className="font-bold text-accent-300">?</span> menu for help &amp; tutorials, or pick a formula to start.
                </span>
                <button
                    onClick={close}
                    title="Dismiss"
                    aria-label="Dismiss"
                    className="text-fg-muted hover:text-fg text-sm leading-none shrink-0"
                >
                    ×
                </button>
            </div>
        </Layer>
    );
};
