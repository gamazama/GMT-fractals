/**
 * QualityRenderControls — bespoke header section for the Quality panel.
 *
 * Owns three coherent sub-widgets that GMT's QualityPanel had inline:
 *   - Render-Mode selector (Direct / PathTracing segmented tabs)
 *   - PT controls (Max Bounces + GI Brightness sliders) — only when
 *     `state.renderMode === 'PathTracing'`
 *   - Resolution panel (Fill / Fixed toggle, presets dropdown, W/H/Ratio
 *     when Fixed)
 *   - Internal Scale segmented buttons (AA level)
 *
 * Registered as `'quality-render-controls'` in componentRegistry.
 * Slotted into the Quality panel via the manifest's items model.
 *
 * NOTE for future refactor: these three sub-widgets are tightly
 * coupled today but conceptually independent. Splitting into
 * `render-mode-selector` / `resolution-controls` / `aa-level-buttons`
 * would let other apps reuse individual pieces (e.g. fluid-toy might
 * want resolution-controls without the render-mode tabs). Keep as
 * one widget until a second app actually needs the split.
 *
 * Ported from `h:/GMT/gmt-0.8.5/components/panels/QualityPanel.tsx`
 * lines 38-273 with import path rewrites only.
 */

import React, { useState, useMemo } from 'react';
import { useEngineStore } from '../../../../store/engineStore';
import Slider, { DraggableNumber } from '../../../../components/Slider';
import ToggleSwitch from '../../../../components/ToggleSwitch';
import Dropdown from '../../../../components/Dropdown';
import { AutoFeaturePanel } from '../../../../components/AutoFeaturePanel';
import { FractalEvents } from '../../../../engine/FractalEvents';
import type { LightingState } from '../../../features/lighting';
import { SectionLabel, SectionDivider } from '../../../../components/SectionLabel';
import {
    accent,
    secondary,
    text as themeText,
    surface,
    border as themeBorder,
    toggleActive,
    toggleInactive,
    toggleDisabled,
    gridBtnActive,
    gridBtnInactive,
} from '../../../../data/theme';

export const QualityRenderControls: React.FC = () => {
    const state = useEngineStore() as any;
    const actions = state;
    const lighting = state.lighting as LightingState | undefined;

    const [w, h] = state.fixedResolution;
    const [aspectLock, setAspectLock] = useState<number | 'Free'>('Free');

    const ptEnabled = lighting?.ptEnabled !== false;
    const setLighting = actions.setLighting;

    const currentPreset = useMemo(() => {
        const s = `${w}x${h}`;
        const presets = [
            '800x600', '1280x720', '1920x1080', '2560x1440', '3840x2160',
            '1080x1080', '1080x1350', '1080x1920',
            '2048x1024', '4096x2048',
        ];
        return presets.includes(s) ? s : 'Custom';
    }, [w, h]);

    const handleModeSwitch = async (mode: 'Direct' | 'PathTracing') => {
        if (state.renderMode === mode) return;
        FractalEvents.emit('is_compiling' as any, 'Switching Engine...' as any);
        await new Promise((resolve) => setTimeout(resolve, 50));
        actions.setRenderMode(mode);
    };

    const setRes = (newW: number, newH: number) => {
        const snapW = Math.max(64, Math.round(newW / 8) * 8);
        const snapH = Math.max(64, Math.round(newH / 8) * 8);
        actions.setFixedResolution(snapW, snapH);
    };

    const handleDimensionChange = (axis: 'w' | 'h', val: number) => {
        if (aspectLock === 'Free') {
            setRes(axis === 'w' ? val : w, axis === 'h' ? val : h);
        } else {
            if (axis === 'w') {
                setRes(val, val / (aspectLock as number));
            } else {
                setRes(val * (aspectLock as number), val);
            }
        }
    };

    const aaLevels = [0.25, 0.5, 1.0, 1.5, 2.0];

    return (
        <div className="flex flex-col">
            {/* --- Render Engine Selector --- */}
            <div className="flex flex-col" data-help-id="render.engine">
                <div className="px-3 py-2">
                    <SectionLabel className="block mb-1">Render Engine</SectionLabel>
                    <div className={`flex ${surface.tabBar} rounded p-0.5 border ${themeBorder.standard}`}>
                        <button
                            type="button"
                            onClick={() => handleModeSwitch('Direct')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${state.renderMode === 'Direct' ? toggleActive : toggleInactive}`}
                        >
                            Direct (Fast)
                        </button>
                        <button
                            type="button"
                            onClick={() => ptEnabled && handleModeSwitch('PathTracing')}
                            disabled={!ptEnabled}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${
                                !ptEnabled
                                    ? toggleDisabled
                                    : state.renderMode === 'PathTracing'
                                        ? `${secondary.bgMed} ${themeText.primary}`
                                        : toggleInactive
                            }`}
                            title={!ptEnabled ? 'Path Tracer Disabled in Engine Panel' : 'Switch to Path Tracer (GI)'}
                        >
                            Path Tracer (GI)
                        </button>
                    </div>
                </div>

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

            <SectionDivider />

            {/* --- Resolution panel --- */}
            <div className="w-full flex flex-col rounded-t-sm relative" data-help-id="panel.quality">
                <div className="absolute inset-0 bg-white/[0.06] rounded-t-sm pointer-events-none" />
                <div className="flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2">
                    <span className="text-[10px] text-gray-400 font-medium tracking-tight select-none">Resolution</span>
                </div>
                <div className="flex flex-col">
                    {(() => {
                        const children: React.ReactNode[] = [
                            <div key="mode">
                                <ToggleSwitch
                                    value={state.resolutionMode}
                                    onChange={actions.setResolutionMode}
                                    options={[
                                        { label: 'Fill Screen', value: 'Full' },
                                        { label: 'Fixed', value: 'Fixed' },
                                    ]}
                                />
                            </div>,
                        ];
                        if (state.resolutionMode === 'Fixed') {
                            children.push(
                                <div key="fixed" className="animate-fade-in">
                                    <div className="flex flex-col gap-2 px-3 py-2 bg-neutral-800/50">
                                        <Dropdown
                                            label="Preset"
                                            value={currentPreset}
                                            options={[
                                                { label: 'SVGA (800 x 600)', value: '800x600' },
                                                { label: 'HD (1280 x 720)', value: '1280x720' },
                                                { label: 'FHD (1920 x 1080)', value: '1920x1080' },
                                                { label: 'QHD (2560 x 1440)', value: '2560x1440' },
                                                { label: '4K (3840 x 2160)', value: '3840x2160' },
                                                { label: 'Square 1:1 (1080p)', value: '1080x1080' },
                                                { label: 'Portrait 4:5 (1080p)', value: '1080x1350' },
                                                { label: 'Vertical 9:16 (1080p)', value: '1080x1920' },
                                                { label: 'Skybox Low (2048 x 1024)', value: '2048x1024' },
                                                { label: 'Skybox High (4096 x 2048)', value: '4096x2048' },
                                                { label: 'Custom', value: 'Custom' },
                                            ]}
                                            onChange={(val: any) => {
                                                if (val !== 'Custom') {
                                                    const [nW, nH] = (val as string).split('x').map(Number);
                                                    setRes(nW, nH);
                                                }
                                            }}
                                            fullWidth
                                        />
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <SectionLabel variant="secondary" className="block mb-0.5">Width</SectionLabel>
                                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                                    <DraggableNumber
                                                        value={w}
                                                        onChange={(v: number) => handleDimensionChange('w', v)}
                                                        step={8}
                                                        min={64}
                                                        max={8192}
                                                        overrideText={`${w}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <SectionLabel variant="secondary" className="block mb-0.5">Height</SectionLabel>
                                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                                    <DraggableNumber
                                                        value={h}
                                                        onChange={(v: number) => handleDimensionChange('h', v)}
                                                        step={8}
                                                        min={64}
                                                        max={8192}
                                                        overrideText={`${h}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-[35%]">
                                                <SectionLabel variant="secondary" className="block mb-0.5">Ratio</SectionLabel>
                                                <div className="h-6">
                                                    <Dropdown
                                                        value={aspectLock}
                                                        options={[
                                                            { label: 'Free', value: 'Free' },
                                                            { label: '16:9', value: 1.7777 },
                                                            { label: '4:3', value: 1.3333 },
                                                            { label: '1:1', value: 1.0 },
                                                            { label: '4:5 (Portrait)', value: 0.8 },
                                                            { label: '9:16 (Vertical)', value: 0.5625 },
                                                            { label: '2:1 (Sky)', value: 2.0 },
                                                        ]}
                                                        onChange={(v: any) => {
                                                            setAspectLock(v);
                                                            if (v !== 'Free') {
                                                                setRes(w, w / (v as number));
                                                            }
                                                        }}
                                                        fullWidth
                                                        className="!px-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>,
                            );
                        }
                        children.push(
                            <div key="scale" data-help-id="quality.scale">
                                <div className="px-3 py-2">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <SectionLabel variant="secondary">Internal Scale</SectionLabel>
                                        <span className={`text-[10px] font-mono ${accent.text} font-bold`}>{`${state.aaLevel.toFixed(2)}x`}</span>
                                    </div>
                                    <div className={`grid grid-cols-5 gap-px ${surface.tint} border ${themeBorder.subtle} rounded overflow-hidden`}>
                                        {aaLevels.map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => actions.setAALevel(level)}
                                                className={`py-1.5 text-[9px] font-bold transition-all ${
                                                    state.aaLevel === level ? gridBtnActive : gridBtnInactive
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>,
                            <div key="performance" data-help-id="quality.adaptive">
                                <AutoFeaturePanel featureId="quality" groupFilter="performance" />
                            </div>,
                        );
                        return children.map((child, i) => {
                            const isLast = i === children.length - 1;
                            return (
                                <div key={i} className="flex">
                                    <div className={`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${isLast ? 'border-b border-b-white/20 rounded-bl-lg' : ''}`} />
                                    <div className={`flex-1 min-w-0 relative ${isLast ? 'border-b border-b-white/20' : ''}`}>
                                        <div className="absolute inset-0 bg-black/20 pointer-events-none z-10" />
                                        {child}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
};
