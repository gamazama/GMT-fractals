/**
 * Hint — inline help text rendered under a control. Reads `showHints` from the
 * engine store directly, so the global hint-toggle hotkey hides every Hint
 * uniformly without callers needing to gate the render.
 *
 * Each hint carries a small `×` that turns hints off globally
 * (`setShowHints(false)`) and toasts how to bring them back (the `H` hotkey) —
 * a quick-off affordance so users don't have to hunt through the Help menu.
 * An optional `?` (when `helpId` is set) opens the help drawer for that
 * control and sits just to the left of the `×`. Both buttons are
 * hover-revealed on pointer devices (and always shown on touch, which has
 * no hover) so stacked hints stay uncluttered until you point at a row.
 */

import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { showToast } from '../engine/store/toastStore';

interface HintProps {
    /** Hint copy. */
    text: string;
    /** Optional help topic id. When set, renders a `?` button that opens the help drawer. */
    helpId?: string;
    className?: string;
}

export const Hint: React.FC<HintProps> = ({ text, helpId, className = '' }) => {
    const showHints = useEngineStore(s => s.showHints);
    const openHelp = useEngineStore(s => s.openHelp);
    const setShowHints = useEngineStore(s => s.setShowHints);

    if (!showHints) return null;

    return (
        <div className={`flex items-center gap-1 px-3 py-1.5 bg-line/[0.06] group/hint ${className}`}>
            <p className="flex-1 text-[9px] text-fg-faint leading-tight group-hover/hint:text-fg-tertiary transition-colors cursor-default">
                {text}
            </p>
            {helpId && openHelp && (
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); openHelp(helpId); }}
                    title={`Help: ${helpId}`}
                    className="shrink-0 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold rounded-sm bg-line/5 text-fg-dim hover:bg-accent-500/20 hover:text-accent-300 opacity-0 group-hover/hint:opacity-100 [@media(hover:none)]:opacity-100 transition"
                >
                    ?
                </button>
            )}
            <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                    e.stopPropagation();
                    setShowHints(false);
                    showToast('Hints hidden — press H to show them again', 'info');
                }}
                title="Turn off hints (press H to show again)"
                aria-label="Turn off hints"
                className="shrink-0 w-3.5 h-3.5 flex items-center justify-center text-[11px] leading-none rounded-sm bg-line/5 text-fg-dim hover:bg-line/15 hover:text-fg opacity-0 group-hover/hint:opacity-100 [@media(hover:none)]:opacity-100 transition"
            >
                &times;
            </button>
        </div>
    );
};

export default Hint;
