/**
 * GmtLogo — the "GMT" wordmark with cyan M, ported from gmt-0.8.5's
 * RenderTools.tsx (the original component had this inline alongside
 * the project-name button).
 *
 * Registered as a left-slot topbar item at order -10 so it renders
 * before the engine's default `project-name` (order 0). app-gmt-only —
 * other apps using the engine topbar see only their own ProjectName.
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';

export const GmtLogo: React.FC = () => {
    const name = useEngineStore((s) => s.projectSettings.name);

    return (
        <div className="flex flex-col leading-none select-none pr-3">
            <span className="text-xl font-bold tracking-tighter text-white leading-none">
                G<span className="text-cyan-400">M</span>T
            </span>
            <span className="text-[9px] text-gray-400 mt-0.5 truncate max-w-[120px]">{name}</span>
        </div>
    );
};
