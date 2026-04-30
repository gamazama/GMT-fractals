/**
 * QualityRenderControls — bespoke header section for the Quality panel.
 *
 * Composes shared engine primitives — every segmented choice goes
 * through `ToggleSwitch` (the engine's segmented-options control) and
 * the indented sub-block uses `ParentSection` (the bracket-trimmed
 * labeled container). No bespoke `<button>` clusters or hand-rolled
 * border markup.
 *
 * What it owns:
 *   - ToggleSwitch: Render Mode (Direct / PathTracing)
 *   - PT global controls (Max Bounces + GI Brightness sliders) — only
 *     visible while renderMode === 'PathTracing'
 *   - ParentSection 'Resolution':
 *       - ToggleSwitch: Fill / Fixed
 *       - When Fixed: preset Dropdown + W/H/Ratio row
 *       - ToggleSwitch: Internal Scale (5 AA-level options)
 *       - quality.performance group via AutoFeaturePanel
 *
 * Registered as `'quality-render-controls'` in componentRegistry.
 */

import React, { useMemo, useState } from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import Slider from '../../../../components/Slider';
import ToggleSwitch from '../../../../components/ToggleSwitch';
import Dropdown from '../../../../components/Dropdown';
import { AutoFeaturePanel } from '../../../../components/AutoFeaturePanel';
import { ParentSection } from '../../../../components/ParentSection';
import { FractalEvents } from '../../../../engine/FractalEvents';
import type { LightingState } from '../../../features/lighting';
import { SectionLabel } from '../../../../components/SectionLabel';
import { NumberInput } from '../../../../components/NumberInput';
import { snap8 } from '../../../../utils/resolutionUtils';
import {
    RESOLUTION_PRESETS,
    ASPECT_LOCK_OPTIONS,
    type AspectRatioValue,
} from '../../../../data/resolutionPresets';

const AA_LEVELS = [
    { label: '0.25', value: 0.25 },
    { label: '0.5',  value: 0.5  },
    { label: '1.0',  value: 1.0  },
    { label: '1.5',  value: 1.5  },
    { label: '2.0',  value: 2.0  },
];

/** Dropdown options keyed on `WxH` strings, plus a 'Custom' sentinel. */
const RESOLUTION_DROPDOWN_OPTIONS = [
    ...RESOLUTION_PRESETS.map(p => ({ label: p.label, value: `${p.w}x${p.h}` })),
    { label: 'Custom', value: 'Custom' },
];

/** Aspect-lock dropdown options — value carries the numeric ratio or 'Free'. */
const ASPECT_OPTIONS = ASPECT_LOCK_OPTIONS.map(a => ({ label: a.label, value: a.ratio }));

export const QualityRenderControls: React.FC = () => {
    const state = useEngineStore() as any;
    const actions = state;
    const lighting = state.lighting as LightingState | undefined;

    const [w, h] = state.fixedResolution;
    const [aspectLock, setAspectLock] = useState<AspectRatioValue>('Free');

    const ptEnabled = lighting?.ptEnabled !== false;
    const setLighting = actions.setLighting;

    const currentPreset = useMemo(() => {
        const s = `${w}x${h}`;
        const known = RESOLUTION_DROPDOWN_OPTIONS.find((p) => p.value === s);
        return known ? s : 'Custom';
    }, [w, h]);

    const handleModeSwitch = async (mode: 'Direct' | 'PathTracing') => {
        if (state.renderMode === mode) return;
        if (mode === 'PathTracing' && !ptEnabled) return;
        FractalEvents.emit('is_compiling' as any, 'Switching Engine...' as any);
        await new Promise((r) => setTimeout(r, 50));
        actions.setRenderMode(mode);
    };

    const setRes = (newW: number, newH: number) => {
        actions.setFixedResolution(snap8(newW), snap8(newH));
    };

    const handleDimensionChange = (axis: 'w' | 'h', val: number) => {
        if (aspectLock === 'Free') {
            setRes(axis === 'w' ? val : w, axis === 'h' ? val : h);
        } else {
            if (axis === 'w') setRes(val, val / (aspectLock as number));
            else setRes(val * (aspectLock as number), val);
        }
    };

    const renderModeOptions = useMemo(
        () => [
            // Per-option colors mirror GMT — Direct renders cyan
            // (default), Path Tracer renders purple.
            { label: 'Direct (Fast)',   value: 'Direct',      color: 'bg-cyan-500'   },
            {
                label: 'Path Tracer (GI)',
                value: 'PathTracing',
                color: 'bg-purple-500',
                tooltip: ptEnabled ? 'Switch to Path Tracer (GI)' : 'Path Tracer disabled in Engine Panel',
            },
        ],
        [ptEnabled],
    );

    return (
        <div className="flex flex-col">
            {/* Render Engine selector — segmented ToggleSwitch */}
            <div className="flex flex-col" data-help-id="render.engine">
                <div className="px-3 py-2">
                    <SectionLabel className="block mb-1">Render Engine</SectionLabel>
                    <ToggleSwitch<'Direct' | 'PathTracing'>
                        value={state.renderMode}
                        onChange={(v) => handleModeSwitch(v)}
                        options={renderModeOptions as any}
                    />
                </div>

                {/* PT global controls — visible while in Path Tracer mode */}
                {state.renderMode === 'PathTracing' && lighting && (
                    <div className="animate-fade-in" data-help-id="pt.global">
                        <Slider
                            label="Max Bounces"
                            value={lighting.ptBounces}
                            min={1}
                            max={8}
                            step={1}
                            onChange={(v: number) => setLighting({ ptBounces: Math.round(v) })}
                        />
                        <Slider
                            label="GI Brightness"
                            value={lighting.ptGIStrength}
                            min={0}
                            max={5.0}
                            step={0.01}
                            onChange={(v: number) => setLighting({ ptGIStrength: v })}
                            trackId="lighting.ptGIStrength"
                        />
                    </div>
                )}
            </div>

            {/* Resolution — ParentSection with bracketed indented children */}
            <ParentSection label="Resolution">
                <ToggleSwitch
                    value={state.resolutionMode}
                    onChange={actions.setResolutionMode}
                    options={[
                        { label: 'Fill Screen', value: 'Full' },
                        { label: 'Fixed',       value: 'Fixed' },
                    ]}
                />

                {state.resolutionMode === 'Fixed' && (
                    <div className="animate-fade-in flex flex-col gap-2 px-3 py-2 bg-neutral-800/50">
                        <Dropdown
                            label="Preset"
                            value={currentPreset}
                            options={RESOLUTION_DROPDOWN_OPTIONS}
                            onChange={(val: any) => {
                                if (val !== 'Custom') {
                                    const [nW, nH] = (val as string).split('x').map(Number);
                                    setRes(nW, nH);
                                }
                            }}
                            fullWidth
                        />
                        <div className="flex gap-2">
                            <NumberInput
                                label="Width"
                                value={w}
                                onChange={(v: number) => handleDimensionChange('w', v)}
                                step={8} min={64} max={8192}
                            />
                            <NumberInput
                                label="Height"
                                value={h}
                                onChange={(v: number) => handleDimensionChange('h', v)}
                                step={8} min={64} max={8192}
                            />
                            <div className="w-[35%]">
                                <SectionLabel variant="secondary" className="block mb-0.5">Ratio</SectionLabel>
                                <div className="h-6">
                                    <Dropdown
                                        value={aspectLock as any}
                                        options={ASPECT_OPTIONS as any}
                                        onChange={(v: any) => {
                                            setAspectLock(v);
                                            if (v !== 'Free') setRes(w, w / (v as number));
                                        }}
                                        fullWidth
                                        className="!px-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div data-help-id="quality.scale" className="px-3 py-2">
                    <SectionLabel variant="secondary" className="block mb-1">
                        Internal Scale {`(${state.aaLevel.toFixed(2)}x)`}
                    </SectionLabel>
                    <ToggleSwitch
                        value={state.aaLevel}
                        onChange={actions.setAALevel}
                        options={AA_LEVELS}
                    />
                </div>

                <div data-help-id="quality.adaptive">
                    <AutoFeaturePanel featureId="quality" groupFilter="performance" />
                </div>
            </ParentSection>
        </div>
    );
};
