/**
 * AdaptiveResolutionBadge — the "is adaptive on/off?" pill button.
 *
 * Ported from GMT's components/topbar/AdaptiveResolution.tsx. Now reads
 * from @engine/viewport's adaptiveConfig + adaptiveSuppressed so it works
 * for any app consuming the plugin (GMT, fluid-toy, fractal-toy, future).
 *
 * State display (four visual states, same colour palette as GMT):
 *   - Off (gray)    : adaptive disabled — click to enable
 *   - Locked (green): enabled but suppressed (e.g. during an export flow)
 *   - Auto (cyan)   : enabled, GMT-style — active when mouse-on-canvas or
 *                     during activity grace. Idle mouse on canvas → full-res.
 *   - Always (amber): enabled, alwaysActive (fluid-toy-style live sims) OR
 *                     mouse off canvas (idle grace not kicking in)
 *
 * Click behaviour: toggles adaptiveConfig.enabled. If enabling and
 * targetFps was 0 (manual mode), seed it to 30 for the typical
 * "just turn adaptive on" user intent.
 *
 * Apps mount this anywhere — typically a topbar or viewport-adjacent
 * chrome spot. When @engine/topbar lands (Phase 4), this will
 * auto-register into a topbar slot via the slot registry.
 */

import React from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { isMouseOverCanvas } from '../../worker/ViewportRefs';

const AdaptiveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        <polyline points="22 2 13 11 9 7" />
    </svg>
);

export interface AdaptiveResolutionBadgeProps {
    /** Extra classes on the button (typically positioning overrides). */
    className?: string;
}

export const AdaptiveResolutionBadge: React.FC<AdaptiveResolutionBadgeProps> = ({ className = '' }) => {
    const cfg = useEngineStore((s) => s.adaptiveConfig);
    const suppressed = useEngineStore((s) => s.adaptiveSuppressed);
    const setAdaptiveConfig = useEngineStore((s) => s.setAdaptiveConfig);

    const isEnabled = cfg.enabled;
    const isActive = isEnabled && !suppressed;
    const onCanvas = isMouseOverCanvas();

    const handleToggle = () => {
        if (isActive) {
            setAdaptiveConfig({ enabled: false });
        } else {
            // Re-enable adaptive. If targetFps is 0 (manual mode), seed it
            // to 30 so smart-mode kicks in — matches the intent of clicking
            // a "turn adaptive on" button.
            const next: Partial<typeof cfg> = { enabled: true };
            if (cfg.targetFps <= 0) next.targetFps = 30;
            setAdaptiveConfig(next);
        }
    };

    let colorClass: string;
    let stateLabel: string;

    if (!isEnabled) {
        colorClass = 'text-gray-600 hover:text-gray-400';
        stateLabel = 'Off';
    } else if (suppressed) {
        // Something externally forced adaptive off (e.g. export flow).
        colorClass = 'text-green-400 bg-green-900/30 border border-green-500/30';
        stateLabel = 'Locked';
    } else if (cfg.alwaysActive || !onCanvas) {
        // Always-active mode (live sims) or mouse off canvas — adaptive is
        // running without the idle-grace recovery.
        colorClass = 'text-amber-400 bg-amber-900/30 border border-amber-500/30';
        stateLabel = 'Always';
    } else {
        // GMT-style: active with the grace-period idle recovery.
        colorClass = 'text-cyan-400 bg-cyan-900/30 border border-cyan-500/30';
        stateLabel = 'Auto';
    }

    return (
        <button
            onClick={handleToggle}
            className={`p-0.5 rounded transition-colors ${colorClass} ${className}`}
            title={`Adaptive Resolution: ${stateLabel} (click to ${isActive ? 'disable' : 'enable'})`}
        >
            <AdaptiveIcon />
        </button>
    );
};
