/**
 * LfoList — generic LFO modulator UI.
 *
 * Lifted from engine-gmt during the modulation-UI extraction so any
 * engine-based app can drop in continuous-driver modulation with one
 * panel-manifest entry. The store/state plumbing is generic — a new
 * LFO is appended to `state.animations`; the canonical
 * `engine/animation/modulationTick` (installed via `installModulation`)
 * processes it into `state.liveModulations` each frame.
 *
 * App-specific defaults (initial target string, baseValue resolution,
 * max LFO count) live in `lfoListConfig.ts`. Apps override via
 * `setLfoListConfig({...})` once at boot.
 *
 * Two ways to wire:
 *  1. `installModulationUI()` — registers `'lfo-list'` in the component
 *     registry; reference it via `{ type: 'widget', id: 'lfo-list' }`
 *     in your panel manifest. Recommended.
 *  2. Direct import — `<LfoList />` reads the engine store itself.
 */

import React from 'react';
import { nanoid } from 'nanoid';
import { useEngineStore } from '../../../store/engineStore';
import type { AnimationParams } from '../../../types';
import Slider from '../../../components/Slider';
import ToggleSwitch from '../../../components/ToggleSwitch';
import { DynamicList, DynamicListItem } from '../../../components/DynamicList';
import { ParameterSelector } from '../../../components/ParameterSelector';
import { WaveformPreview } from './WaveformPreview';
import { getLfoListConfig } from './lfoListConfig';

// ── Constants ───────────────────────────────────────────────────────
// Defaults applied to a freshly-added LFO. Keep grouped so a future
// "duplicate LFO" action / per-app override can read from one place.
const DEFAULT_PERIOD = 5.0;
const DEFAULT_MIN = -1;
const DEFAULT_MAX = 1;
const DEFAULT_SMOOTHING = 0.5;
const STRENGTH_REACH = 10;     // Symmetric ±reach for the Min/Max sliders.
const PERIOD_RANGE: [number, number] = [0.1, 30];

// Period slider mapping: t² gives a "slightly-log feel" — slider
// middle ≈ 7.6s vs linear's 15s, with 0.1–3s filling the lower half.
const PERIOD_SPAN = PERIOD_RANGE[1] - PERIOD_RANGE[0];
const PERIOD_MAPPING = {
    min: 0, max: 100,
    toSlider: (val: number) => Math.sqrt((Math.max(PERIOD_RANGE[0], Math.min(PERIOD_RANGE[1], val)) - PERIOD_RANGE[0]) / PERIOD_SPAN) * 100,
    fromSlider: (val: number) => PERIOD_RANGE[0] + PERIOD_SPAN * Math.pow(val / 100, 2),
};

const PHASE_MAPPING = {
    min: 0, max: 360,
    toSlider: (v: number) => v * 360,
    fromSlider: (v: number) => v / 360,
};

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Effective relative-strength range. Legacy LFOs (no min/max) are
 * shown as symmetric ±amplitude strengths so they edit cleanly in the
 * new UI without a one-time migration.
 */
const effectiveRange = (anim: AnimationParams): { min: number; max: number } => {
    if (typeof anim.min === 'number' && typeof anim.max === 'number') {
        return { min: anim.min, max: anim.max };
    }
    return { min: -anim.amplitude, max: anim.amplitude };
};

/** Format an offset for the slider's input field — extra precision near 0. */
const fmtStrength = (v: number) => (Math.abs(v) < 0.1 ? v.toFixed(3) : v.toFixed(2));

// ── Component ───────────────────────────────────────────────────────

export const LfoList: React.FC = () => {
    const animations = useEngineStore((s) => s.animations);
    const setAnimations = useEngineStore((s) => s.setAnimations);
    const advancedMode = useEngineStore((s) => s.advancedMode);

    const cfg = getLfoListConfig();

    const addAnimation = () => {
        if (animations.length >= cfg.maxLfos) return;
        const target = cfg.defaultTarget ?? '';
        const baseValue = target ? cfg.seedBaseValue(target, useEngineStore.getState()) : 0;
        const newLfo: AnimationParams = {
            id: nanoid(),
            enabled: true,
            target,
            shape: 'Sine',
            period: DEFAULT_PERIOD,
            // Min / max are RELATIVE strengths around baseValue:
            //   output = baseValue + lerp(min, max, (rawWave + 1) / 2)
            // so −1 / +1 sweeps ± 1 around the param's authored value.
            // `amplitude` is kept at 1 only for back-compat reads.
            amplitude: 1.0,
            baseValue,
            min: DEFAULT_MIN,
            max: DEFAULT_MAX,
            phase: 0.0,
            smoothing: DEFAULT_SMOOTHING,
        };
        setAnimations([...animations, newLfo]);
    };

    const removeAnimation = (id: string) => {
        setAnimations(animations.filter((a) => a.id !== id));
    };

    const updateAnimation = (id: string, updates: Partial<AnimationParams>) => {
        setAnimations(animations.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    };

    const hasActive = animations.some((a) => a.enabled);

    return (
        <DynamicList
            label="LFO Modulators"
            accent="purple"
            isActive={hasActive}
            onAdd={addAnimation}
            addDisabled={animations.length >= cfg.maxLfos}
            addTitle={`Add LFO (Max ${cfg.maxLfos})`}
            data-help-id="lfo.system"
        >
            {animations.map((anim, idx) => {
                const { min, max } = effectiveRange(anim);
                return (
                    <DynamicListItem
                        key={anim.id}
                        title={`LFO ${idx + 1}`}
                        // Subtitle = the modulation target so a
                        // collapsed row is scannable at a glance.
                        subtitle={anim.target || '(no target)'}
                        titleColor="text-purple-400/50"
                        accent="purple"
                        expandable
                        // Default-open so a freshly added LFO shows its
                        // controls. Existing rows keep whatever state
                        // the user left them in.
                        defaultExpanded
                        onRemove={() => removeAnimation(anim.id)}
                        actions={
                            <div className="w-[60px]">
                                <ToggleSwitch
                                    value={anim.enabled}
                                    onChange={(v) => updateAnimation(anim.id, { enabled: v })}
                                    color="bg-purple-600"
                                />
                            </div>
                        }
                    >
                        {/* Body always renders when expanded — `enabled`
                            controls effect, not visibility. A disabled
                            LFO can still be edited; it just doesn't
                            drive liveModulations. */}
                        <div className="animate-fade-in">
                            <WaveformPreview
                                shape={anim.shape}
                                period={anim.period}
                                phase={anim.phase}
                                enabled={anim.enabled}
                            />

                            <div className="grid grid-cols-2 gap-1 mb-1">
                                <div>
                                    <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Target</label>
                                    <ParameterSelector
                                        value={anim.target}
                                        onChange={(val) => {
                                            const baseValue = cfg.seedBaseValue(val, useEngineStore.getState());
                                            updateAnimation(anim.id, { target: val, baseValue });
                                        }}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 font-bold block mb-0.5">Shape</label>
                                    <select
                                        value={anim.shape}
                                        onChange={(e) => updateAnimation(anim.id, { shape: e.target.value as AnimationParams['shape'] })}
                                        className="t-select text-white focus:border-purple-500"
                                    >
                                        <option value="Sine">Sine</option>
                                        <option value="Triangle">Triangle</option>
                                        <option value="Sawtooth">Sawtooth</option>
                                        <option value="Pulse">Pulse</option>
                                        <option value="Noise">Noise</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-0">
                                <Slider
                                    label="Period (Sec)" value={anim.period}
                                    min={PERIOD_RANGE[0]} max={PERIOD_RANGE[1]} step={0.01}
                                    hardMin={0.01}
                                    defaultValue={DEFAULT_PERIOD}
                                    onChange={(v) => updateAnimation(anim.id, { period: v })}
                                    customMapping={PERIOD_MAPPING}
                                />
                                <Slider
                                    label="Min strength" value={min}
                                    min={-STRENGTH_REACH} max={STRENGTH_REACH} step={0.001}
                                    defaultValue={DEFAULT_MIN}
                                    onChange={(v) => updateAnimation(anim.id, { min: v, max: Math.max(v, max) })}
                                    overrideInputText={fmtStrength(min)}
                                />
                                <Slider
                                    label="Max strength" value={max}
                                    min={-STRENGTH_REACH} max={STRENGTH_REACH} step={0.001}
                                    defaultValue={DEFAULT_MAX}
                                    onChange={(v) => updateAnimation(anim.id, { min: Math.min(v, min), max: v })}
                                    overrideInputText={fmtStrength(max)}
                                />
                                {advancedMode && (
                                    <Slider
                                        label="Phase Offset" value={anim.phase}
                                        min={0.0} max={1.0} step={0.01}
                                        defaultValue={0}
                                        onChange={(v) => updateAnimation(anim.id, { phase: v })}
                                        customMapping={PHASE_MAPPING}
                                        mapTextInput
                                        overrideInputText={`${(anim.phase * 360).toFixed(0)}°`}
                                    />
                                )}
                                <Slider
                                    label="Smoothing" value={anim.smoothing}
                                    min={0.0} max={1.0} step={0.01}
                                    defaultValue={DEFAULT_SMOOTHING}
                                    onChange={(v) => updateAnimation(anim.id, { smoothing: v })}
                                />
                            </div>
                        </div>
                    </DynamicListItem>
                );
            })}
        </DynamicList>
    );
};
