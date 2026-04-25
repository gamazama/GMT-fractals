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

export const GmtLogo: React.FC = () => (
    <div className="flex items-center pr-2 select-none">
        <span className="text-xl font-bold tracking-tighter text-white leading-none">
            G<span className="text-cyan-400">M</span>T
        </span>
    </div>
);
