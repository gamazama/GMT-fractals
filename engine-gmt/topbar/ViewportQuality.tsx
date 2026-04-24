
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Popover } from '../../components/Popover';
import { FractalEvents } from '../engine/FractalEvents';
import {
    ALL_SUBSYSTEMS,
    SCALABILITY_PRESETS,
    getScalabilityLabel,
    estimateScalabilityCompileTime,
} from '../types/viewport';

// PT section color tokens
const PT_COLOR = 'text-purple-400';
const PT_BG = 'bg-purple-900/30 border-purple-500/30';

/**
 * Top-bar dropdown for viewport quality control.
 * Lets users switch master presets and override individual subsystem tiers.
 * PT-aware: dims direct-render subsystems and surfaces editable PT controls when active.
 */
export const ViewportQuality: React.FC = () => {
    const scalability = useEngineStore(s => s.scalability);
    const applyScalabilityPreset = useEngineStore(s => s.applyScalabilityPreset);
    const setSubsystemTier = useEngineStore(s => s.setSubsystemTier);
    const setLighting = useEngineStore(s => (s as any).setLighting);
    const advancedMode = useEngineStore(s => s.advancedMode);
    const setVpQualityOpen = useEngineStore(s => s.setVpQualityOpen);

    // PT state — determines which subsystems are visually active
    const ptEnabled = useEngineStore(s => (s as any).lighting?.ptEnabled ?? false);
    const renderMode = useEngineStore(s => (s as any).lighting?.renderMode ?? 0);
    const isPT = ptEnabled && renderMode === 1.0;

    // PT runtime params — editable inline when PT is active
    const ptBounces = useEngineStore(s => (s as any).lighting?.ptBounces ?? 3);
    const ptGIStrength = useEngineStore(s => (s as any).lighting?.ptGIStrength ?? 1.0);
    // PT compile-time params — batched with Apply
    const ptNEEAllLights = useEngineStore(s => (s as any).lighting?.ptNEEAllLights ?? false);
    const ptEnvNEE = useEngineStore(s => (s as any).lighting?.ptEnvNEE ?? false);

    const [isOpen, setIsOpen] = useState(false);

    // Sync to store so tutorial triggers can observe panel open state
    useEffect(() => { setVpQualityOpen(isOpen); }, [isOpen]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Local pending state for batching (changes staged until Apply)
    const [pendingSubsystems, setPendingSubsystems] = useState<Record<string, number> | null>(null);
    const [pendingPreset, setPendingPreset] = useState<string | null>(null);
    // Pending compile-time PT params (NEE toggles require recompile)
    const [pendingPTCompile, setPendingPTCompile] = useState<Record<string, any> | null>(null);

    // Effective state: pending overrides on top of current
    const effectiveSubsystems = pendingSubsystems ?? scalability.subsystems;
    const hasPending = pendingSubsystems !== null || pendingPTCompile !== null;

    // Effective PT compile state for display
    const effectiveNEEAllLights = pendingPTCompile?.ptNEEAllLights ?? ptNEEAllLights;
    const effectiveNEEEnv = pendingPTCompile?.ptEnvNEE ?? ptEnvNEE;

    const estimatedMs = useMemo(
        () => estimateScalabilityCompileTime(effectiveSubsystems),
        [effectiveSubsystems]
    );

    const currentLabel = getScalabilityLabel(scalability);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setPendingSubsystems(null);
                setPendingPreset(null);
                setPendingPTCompile(null);
            }
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const handlePresetSelect = (presetId: string) => {
        const preset = SCALABILITY_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        setPendingSubsystems({ ...preset.subsystems });
        setPendingPreset(presetId);
    };

    const handleSubsystemChange = (subsystemId: string, tierIndex: number) => {
        const base = pendingSubsystems ?? { ...scalability.subsystems };
        setPendingSubsystems({ ...base, [subsystemId]: tierIndex });
        setPendingPreset(null);
    };

    const handlePTCompileToggle = (param: string, current: boolean) => {
        const base = pendingPTCompile ?? {};
        const newVal = !current;
        // If toggling back to store value, remove from pending
        const storeVal = param === 'ptNEEAllLights' ? ptNEEAllLights : ptEnvNEE;
        if (newVal === storeVal) {
            const next = { ...base };
            delete next[param];
            setPendingPTCompile(Object.keys(next).length > 0 ? next : null);
        } else {
            setPendingPTCompile({ ...base, [param]: newVal });
        }
    };

    const handleApply = () => {
        if (!hasPending) return;

        FractalEvents.emit('is_compiling', 'Recompiling Shader...');

        setTimeout(() => {
            if (pendingSubsystems) {
                if (pendingPreset) {
                    applyScalabilityPreset(pendingPreset);
                } else {
                    for (const [subId, tier] of Object.entries(pendingSubsystems)) {
                        setSubsystemTier(subId, tier);
                    }
                }
            }

            // Apply pending PT compile-time params via setLighting
            if (pendingPTCompile && setLighting) {
                setLighting(pendingPTCompile);
            }

            setPendingSubsystems(null);
            setPendingPreset(null);
            setPendingPTCompile(null);
            setIsOpen(false);
        }, 50);
    };

    // Determine which preset radio is active in the pending state
    const activePresetInPending = pendingPreset ?? (() => {
        if (!pendingSubsystems) return scalability.activePreset;
        for (const p of SCALABILITY_PRESETS) {
            if (Object.keys(p.subsystems).every(k => p.subsystems[k] === effectiveSubsystems[k])) {
                return p.id;
            }
        }
        return null;
    })();

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                data-tut="viewport-quality-btn"
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    hasPending
                        ? 'text-amber-300 bg-amber-900/30 border border-amber-500/30'
                        : 'text-cyan-300 bg-cyan-900/20 border border-cyan-500/20 hover:bg-cyan-900/40'
                }`}
                title="Viewport Quality"
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span>{hasPending ? 'Pending...' : currentLabel}</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="opacity-50">
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            </button>

            {isOpen && (
                <Popover width="w-64" align="center">
                    <div className="space-y-3">
                        {/* Master Presets */}
                        <div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Viewport Quality</div>
                            <div className="space-y-1">
                                {SCALABILITY_PRESETS.filter(p => !p.isAdvanced || advancedMode).map(preset => {
                                    const est = estimateScalabilityCompileTime(preset.subsystems);
                                    const isActive = activePresetInPending === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetSelect(preset.id)}
                                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] transition-colors ${
                                                isActive
                                                    ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/30'
                                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400' : 'bg-gray-700'}`} />
                                                <span className="font-semibold">{preset.label}</span>
                                                {preset.id === 'preview' && <span className="text-amber-400/70 text-[8px] font-normal ml-1">lighting disabled</span>}
                                            </div>
                                            <span className="text-gray-600 text-[9px]">~{(est / 1000).toFixed(0)}s</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Per-Subsystem Overrides */}
                        <div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Per Subsystem</div>
                            <div className="space-y-1">
                                {ALL_SUBSYSTEMS.filter(s => !s.isAdvanced || advancedMode).map(sub => {
                                    const currentTier = effectiveSubsystems[sub.id] ?? 0;
                                    const isDimmed = isPT && sub.renderContext === 'direct';
                                    return (
                                        <div key={sub.id} className={`flex items-center justify-between px-2 transition-opacity ${isDimmed ? 'opacity-35' : ''}`}>
                                            <span className={`text-[10px] ${isDimmed ? 'text-gray-600' : 'text-gray-400'}`}>
                                                {sub.label}
                                            </span>
                                            <select
                                                value={currentTier}
                                                onChange={(e) => handleSubsystemChange(sub.id, parseInt(e.target.value))}
                                                className={`bg-gray-900 border border-white/10 rounded px-1.5 py-0.5 text-[10px] outline-none cursor-pointer ${
                                                    isDimmed ? 'text-gray-600' : 'text-white focus:border-cyan-500'
                                                }`}
                                            >
                                                {sub.tiers.map((tier, i) => (
                                                    <option key={i} value={i}>{tier.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Path Tracer Controls — editable when PT is active */}
                        {isPT && (
                            <div>
                                <div className={`text-[9px] font-bold ${PT_COLOR} uppercase tracking-wider mb-1.5`}>Path Tracer</div>
                                <div className="space-y-1.5">
                                    {/* Max Bounces — runtime, instant update */}
                                    <div className="flex items-center justify-between px-2">
                                        <span className={`text-[10px] ${PT_COLOR}`}>Max Bounces</span>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="range"
                                                min={1} max={8} step={1}
                                                value={ptBounces}
                                                onChange={(e) => setLighting?.({ ptBounces: parseInt(e.target.value) })}
                                                className="w-16 h-1 accent-purple-400 cursor-pointer"
                                            />
                                            <span className={`text-[10px] ${PT_COLOR} font-mono w-3 text-right`}>{ptBounces}</span>
                                        </div>
                                    </div>
                                    {/* GI Strength — runtime, instant update */}
                                    <div className="flex items-center justify-between px-2">
                                        <span className={`text-[10px] ${PT_COLOR}`}>GI Strength</span>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="range"
                                                min={0} max={5} step={0.05}
                                                value={ptGIStrength}
                                                onChange={(e) => setLighting?.({ ptGIStrength: parseFloat(e.target.value) })}
                                                className="w-16 h-1 accent-purple-400 cursor-pointer"
                                            />
                                            <span className={`text-[10px] ${PT_COLOR} font-mono w-7 text-right`}>{ptGIStrength.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    {/* Sample All Lights — compile-time, batched with Apply */}
                                    <div className="flex items-center justify-between px-2">
                                        <span className={`text-[10px] ${PT_COLOR}`}>Sample All Lights</span>
                                        <button
                                            onClick={() => handlePTCompileToggle('ptNEEAllLights', effectiveNEEAllLights)}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                                                effectiveNEEAllLights
                                                    ? `${PT_BG} ${PT_COLOR}`
                                                    : 'border-white/10 text-gray-600 hover:text-gray-400'
                                            }`}
                                        >
                                            {effectiveNEEAllLights ? 'On' : 'Off'}
                                        </button>
                                    </div>
                                    {/* Environment NEE — compile-time, batched with Apply */}
                                    <div className="flex items-center justify-between px-2">
                                        <span className={`text-[10px] ${PT_COLOR}`}>Environment NEE</span>
                                        <button
                                            onClick={() => handlePTCompileToggle('ptEnvNEE', effectiveNEEEnv)}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                                                effectiveNEEEnv
                                                    ? `${PT_BG} ${PT_COLOR}`
                                                    : 'border-white/10 text-gray-600 hover:text-gray-400'
                                            }`}
                                        >
                                            {effectiveNEEEnv ? 'On' : 'Off'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Apply Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-[9px] text-gray-500">
                                Est. ~{(estimatedMs / 1000).toFixed(1)}s
                            </span>
                            <button
                                onClick={handleApply}
                                disabled={!hasPending}
                                className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${
                                    hasPending
                                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                }`}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </Popover>
            )}
        </div>
    );
};
