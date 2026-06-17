/**
 * FirstRunHint — a slim, dismissible top banner shown once to first-time
 * visitors (H1). Points newcomers at the help menu + the formula picker so
 * the create→share loop is discoverable without a blocking modal. Dismissal
 * persists in localStorage, so returning users never see it again.
 */
import React, { useState } from 'react';

const KEY = 'gmt-firstrun-dismissed';

const wasDismissed = (): boolean => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

export const FirstRunHint: React.FC = () => {
    const [dismissed, setDismissed] = useState(wasDismissed);
    if (dismissed) return null;

    const close = () => {
        try { localStorage.setItem(KEY, '1'); } catch { /* private mode / quota */ }
        setDismissed(true);
    };

    return (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[800] pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 bg-gray-900/95 border border-cyan-500/30 rounded-full shadow-xl backdrop-blur-md animate-fade-in">
                <span className="text-[11px] text-cyan-100">
                    👋 New here? Open the <span className="font-bold text-cyan-300">?</span> menu for help &amp; tutorials, or pick a formula to start.
                </span>
                <button
                    onClick={close}
                    title="Dismiss"
                    aria-label="Dismiss"
                    className="text-gray-400 hover:text-white text-sm leading-none shrink-0"
                >
                    ×
                </button>
            </div>
        </div>
    );
};
