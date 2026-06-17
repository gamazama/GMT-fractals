/**
 * Compact diagnostics readout mounted under the Deep Zoom enable
 * toggle. Shows the live zoom value as a power of 10 (the slider
 * clamps at 1e-5 so its label stops being useful past that), plus
 * the orbit length and reference-centre offset summary so the user
 * can see the orbit refreshing as they pan/zoom.
 *
 * No store mutations — pure read-only display. Subscribes to the
 * julia slice's zoom + center fields directly so it stays in sync
 * with the engine even when the orbit hasn't been rebuilt yet (the
 * shader's uDeepCenterOffset tracks the same quantity).
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useDeepZoomDiag } from '../deepZoom/diagnostics';

export const DeepZoomStatus: React.FC = () => {
    const zoom = useEngineStore((s) => s.julia?.zoom ?? 1);
    const cx = useEngineStore((s) => s.julia?.center?.x ?? 0);
    const cy = useEngineStore((s) => s.julia?.center?.y ?? 0);
    const diag = useDeepZoomDiag();

    const log10 = zoom > 0 ? Math.log10(zoom) : 0;
    const zoomLabel = zoom > 0
        ? `1e${log10.toFixed(2)} (${zoom.toExponential(2)})`
        : 'invalid';

    const haveLA = diag.laCount > 0;
    const stageSummary = diag.laStagesPerLevel.length > 0
        ? diag.laStagesPerLevel.join(',')
        : '—';

    return (
        <div style={{
            fontSize: '10.5px',
            lineHeight: '1.5',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            color: '#9ca3af',
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            margin: '4px 0',
        }}>
            <div>zoom: <span style={{ color: '#e5e7eb' }}>{zoomLabel}</span></div>
            <div>centre: <span style={{ color: '#e5e7eb' }}>({cx.toExponential(3)}, {cy.toExponential(3)})</span></div>
            {diag.orbitLength > 0 && (
                <div>orbit: <span style={{ color: '#e5e7eb' }}>{diag.orbitLength}</span> iters @ {diag.precisionBits}b ({diag.orbitBuildMs.toFixed(0)}ms)</div>
            )}
            {haveLA && (
                <div>LA: <span style={{ color: '#e5e7eb' }}>{diag.laStageCount}</span> stages, <span style={{ color: '#e5e7eb' }}>{diag.laCount}</span> nodes [{stageSummary}] ({diag.laBuildMs.toFixed(0)}ms)</div>
            )}
            {diag.juliaMs > 0 && (
                <div>GPU: <span style={{ color: '#e5e7eb' }}>{diag.juliaMs.toFixed(2)}ms</span> per Julia pass (~{Math.round(1000 / Math.max(0.1, diag.juliaMs))} fps)</div>
            )}
        </div>
    );
};
