/**
 * Hint — inline help text rendered under a control. Reads `showHints` from the
 * engine store directly, so the global hint-toggle hotkey hides every Hint
 * uniformly without callers needing to gate the render.
 */

import React from 'react';
import { useEngineStore } from '../store/engineStore';

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

    if (!showHints) return null;

    return (
        <div className={`flex items-center gap-1 px-3 py-1.5 bg-white/[0.06] group/hint ${className}`}>
            <p className="flex-1 text-[9px] text-gray-600 leading-tight group-hover/hint:text-gray-300 transition-colors cursor-default">
                {text}
            </p>
            {helpId && openHelp && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openHelp(helpId); }}
                    title={`Help: ${helpId}`}
                    className="shrink-0 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold rounded-sm bg-white/5 text-gray-500 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors"
                >
                    ?
                </button>
            )}
        </div>
    );
};

export default Hint;
