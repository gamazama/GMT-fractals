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
 *   - Auto (cyan)   : enabled, GMT-style — engages on activity (interaction
 *                     or accumulation reset) and settles to full-res on idle.
 *   - Always (amber): enabled, alwaysActive (fluid-toy-style live sims) — no
 *                     idle state, so adaptive never backs off.
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
import { AdaptiveIcon } from '../../../components/Icons2';

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
        colorClass = 'text-fg-faint hover:text-fg-muted';
        stateLabel = 'Off';
    } else if (suppressed) {
        // Something externally forced adaptive off (e.g. export flow).
        colorClass = 'text-ok bg-ok/15 border border-ok/30';
        stateLabel = 'Locked';
    } else if (cfg.alwaysActive) {
        // Always-active mode (live sims) — adaptive runs without idle-grace
        // recovery (there's no idle state to recover to).
        colorClass = 'text-warn bg-warn/15 border border-warn/30';
        stateLabel = 'Always';
    } else {
        // GMT-style: active with the grace-period idle recovery.
        colorClass = 'text-accent-400 bg-accent-900/30 border border-accent-500/30';
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
