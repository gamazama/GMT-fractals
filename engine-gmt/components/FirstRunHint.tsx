/**
 * FirstRunHint — a slim, dismissible top banner shown once to first-time
 * visitors (H1). Points newcomers at the help menu + the formula picker so
 * the create→share loop is discoverable without a blocking modal. Dismissal
 * persists in localStorage, so returning users never see it again.
 *
 * @bug PRODUCTION: at 1400×900 the banner sits over app-gmt's top bar, so a first-time visitor
 *   cannot click High-res render, Expand Light Studio, Shadow Settings or the light-gizmo button
 *   until they dismiss it. Found by `smoke:chrome` on 2026-09-16 (which pre-dismisses the banner
 *   so it can reach those controls). It also uses a raw `z-[800]` rather than a `<Layer tier>`
 *   (ADR-0082) — where it should sit is a design call, not fixed here.
 */
import React, { useState } from 'react';
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
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[800] pointer-events-none">
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
        </div>
    );
};
