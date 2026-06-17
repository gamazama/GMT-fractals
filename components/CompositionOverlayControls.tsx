/**
 * CompositionOverlayControls — UI for the engine composition-guide
 * overlay. The overlay graphics themselves are rendered by
 * components/viewport/CompositionOverlay.tsx, mounted inside
 * ViewportFrame so both apps render them without per-app wiring.
 *
 * Generic — both GMT's View Manager and fluid-toy's View Manager
 * mount this in their footer slot. State (`compositionOverlay`,
 * `compositionOverlaySettings`) lives in engine-core uiSlice, so
 * any app gets the controls + the renderer for free.
 *
 * Wraps itself in a CollapsibleSection by default so it doesn't
 * dominate the panel; pass `collapsible={false}` to render flat.
 */

import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { CollapsibleSection } from './CollapsibleSection';
import Slider from './Slider';
import SmallColorPicker from './SmallColorPicker';
import type { CompositionOverlayType } from '../types';

const OVERLAY_OPTIONS: { type: CompositionOverlayType; label: string }[] = [
    { type: 'none', label: 'None' },
    { type: 'thirds', label: 'Rule of Thirds' },
    { type: 'golden', label: 'Golden Ratio' },
    { type: 'grid', label: 'Grid' },
    { type: 'center', label: 'Center Mark' },
    { type: 'diagonal', label: 'Diagonal' },
    { type: 'spiral', label: 'Spiral' },
    { type: 'safearea', label: 'Safe Areas' },
];

export interface CompositionOverlayControlsProps {
    /** Wrap in a CollapsibleSection. Default true. */
    collapsible?: boolean;
    /** Section label when collapsible. Default 'Composition Guide'. */
    label?: string;
    /** Whether the section starts open. Default false. */
    defaultOpen?: boolean;
    /** Outer wrapper class. */
    className?: string;
}

export const CompositionOverlayControls: React.FC<CompositionOverlayControlsProps> = ({
    collapsible = true,
    label = 'Composition Guide',
    defaultOpen = false,
    className = '',
}) => {
    const compositionOverlay = useEngineStore((s) => s.compositionOverlay);
    const setCompositionOverlay = useEngineStore((s) => s.setCompositionOverlay);
    const settings = useEngineStore((s) => s.compositionOverlaySettings);
    const setSettings = useEngineStore((s) => s.setCompositionOverlaySettings);

    const body = (
        <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
                <label className="text-[9px] text-gray-500 w-16">Type</label>
                <select
                    title="Composition guide overlay"
                    value={compositionOverlay}
                    onChange={(e) => setCompositionOverlay(e.target.value as CompositionOverlayType)}
                    className="flex-1 t-select"
                >
                    {OVERLAY_OPTIONS.map((opt) => (
                        <option key={opt.type} value={opt.type}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {compositionOverlay !== 'none' && (
                <>
                    <Slider label="Opacity" value={settings.opacity}
                        min={0.1} max={1} step={0.1}
                        onChange={(v) => setSettings({ opacity: v })} />
                    <Slider label="Line Width" value={settings.lineThickness}
                        min={0.5} max={3} step={0.5}
                        onChange={(v) => setSettings({ lineThickness: v })} />

                    <div className="flex items-center gap-2">
                        <label className="text-[9px] text-gray-500 w-16">Color</label>
                        <SmallColorPicker
                            color={settings.color}
                            onChange={(c: string) => setSettings({ color: c })}
                        />
                    </div>

                    {compositionOverlay === 'grid' && (
                        <>
                            <Slider label="Divisions X" value={settings.gridDivisionsX}
                                min={2} max={16} step={1}
                                onChange={(v) => setSettings({ gridDivisionsX: v })} />
                            <Slider label="Divisions Y" value={settings.gridDivisionsY}
                                min={2} max={16} step={1}
                                onChange={(v) => setSettings({ gridDivisionsY: v })} />
                        </>
                    )}

                    {compositionOverlay === 'spiral' && (
                        <>
                            <Slider label="Rotation" value={settings.spiralRotation}
                                min={0} max={360} step={15}
                                onChange={(v) => setSettings({ spiralRotation: v })} />
                            <Slider label="Position X" value={settings.spiralPositionX}
                                min={0} max={1} step={0.05}
                                onChange={(v) => setSettings({ spiralPositionX: v })} />
                            <Slider label="Position Y" value={settings.spiralPositionY}
                                min={0} max={1} step={0.05}
                                onChange={(v) => setSettings({ spiralPositionY: v })} />
                            <Slider label="Scale" value={settings.spiralScale}
                                min={0.5} max={2} step={0.1}
                                onChange={(v) => setSettings({ spiralScale: v })} />
                            <Slider label="Ratio (Phi)" value={settings.spiralRatio}
                                min={1.0} max={2.0} step={0.01}
                                onChange={(v) => setSettings({ spiralRatio: v })} />
                        </>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox"
                                checked={settings.showCenterMark}
                                onChange={(e) => setSettings({ showCenterMark: e.target.checked })}
                                className="w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded" />
                            <span className="text-[9px] text-gray-400">Center</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox"
                                checked={settings.showSafeAreas}
                                onChange={(e) => setSettings({ showSafeAreas: e.target.checked })}
                                className="w-3 h-3 accent-cyan-500 bg-gray-800 border-gray-600 rounded" />
                            <span className="text-[9px] text-gray-400">Safe Areas</span>
                        </label>
                    </div>
                </>
            )}
        </div>
    );

    if (!collapsible) return <div className={className}>{body}</div>;

    return (
        <div className={className}>
            <CollapsibleSection
                label={label}
                defaultOpen={defaultOpen}
                rightContent={
                    compositionOverlay !== 'none'
                        ? <span className="text-[8px] text-cyan-400">{OVERLAY_OPTIONS.find((o) => o.type === compositionOverlay)?.label}</span>
                        : null
                }
            >
                {body}
            </CollapsibleSection>
        </div>
    );
};

export default CompositionOverlayControls;
