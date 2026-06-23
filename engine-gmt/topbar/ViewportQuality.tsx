
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { Popover } from '../../components/Popover';
import { useRenderPause } from '../../hooks/useRenderPause';
import { useTutorAnchor, tutorAnchors } from '../../engine/plugins/Tutorial';
import {
    getShaderCompilerSubsystems,
    getShaderCompilerPresets,
    getScalabilityLabel,
    detectScalabilityPreset,
} from '../../types/viewport';
import { estimateShaderCompilerCompileTime } from '../features/engine/profiles';

// PT section color token
const PT_COLOR = 'text-secondary';

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
    const tutAnchor = useTutorAnchor('viewport-quality-btn');

    // PT state — determines which subsystems are visually active
    const ptEnabled = useEngineStore(s => (s as any).lighting?.ptEnabled ?? false);
    const renderMode = useEngineStore(s => (s as any).lighting?.renderMode ?? 0);
    const isPT = ptEnabled && renderMode === 1.0;

    // PT runtime params — editable inline when PT is active. (Compile-time PT
    // quality — NEE / env sampling / area lights — is owned by the Path Tracer
    // quality tier in the Per Subsystem list, not by inline toggles.)
    const ptBounces = useEngineStore(s => (s as any).lighting?.ptBounces ?? 3);
    const ptGIStrength = useEngineStore(s => (s as any).lighting?.ptGIStrength ?? 1.0);
    // Seeds the PT-family gate in the compile estimate (PT integrator compiles
    // only in PathTracing mode; the quality tiers only enable the capability).
    // Uses the reliable top-level `renderMode` string, not the lighting float mirror.
    const topRenderMode = useEngineStore(s => (s as any).renderMode);

    const [isOpen, setIsOpen] = useState(false);

    // Pause the render loop while the dropdown is open — same mechanism the
    // formula picker uses (save/restore so a manual pause isn't auto-resumed).
    useRenderPause(isOpen);

    // Sync to store so tutorial triggers can observe panel open state
    useEffect(() => { setVpQualityOpen(isOpen); }, [isOpen]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Local pending state for batching (changes staged until Apply).
    // Subsystem tier changes (incl. the Path Tracer quality tier) stage here;
    // runtime params (`ptBounces`, `ptGIStrength`) push through `setLighting`
    // instantly and aren't batched.
    const [pendingSubsystems, setPendingSubsystems] = useState<Record<string, number> | null>(null);
    const [pendingPreset, setPendingPreset] = useState<string | null>(null);

    // Effective state: pending overrides on top of current
    const effectiveSubsystems = pendingSubsystems ?? scalability.subsystems;
    const hasPending = pendingSubsystems !== null;

    const estimatedMs = useMemo(
        () => estimateShaderCompilerCompileTime(effectiveSubsystems, topRenderMode),
        [effectiveSubsystems, topRenderMode]
    );

    const currentLabel = getScalabilityLabel(scalability);

    // Close + discard pending. Outside-click/Escape dismissal is owned by the
    // Popover (it portals to the layer host, so a bespoke containerRef-scoped
    // listener here would treat clicks inside the portalled panel as "outside"
    // and close on the first control press — the ADR-0082 portal-vs-trap gotcha).
    const handleClose = () => {
        setIsOpen(false);
        setPendingSubsystems(null);
        setPendingPreset(null);
    };

    const handlePresetSelect = (presetId: string) => {
        const preset = getShaderCompilerPresets().find(p => p.id === presetId);
        if (!preset) return;
        setPendingSubsystems({ ...preset.subsystems });
        setPendingPreset(presetId);
    };

    const handleSubsystemChange = (subsystemId: string, tierIndex: number) => {
        const base = pendingSubsystems ?? { ...scalability.subsystems };
        setPendingSubsystems({ ...base, [subsystemId]: tierIndex });
        setPendingPreset(null);
    };

    const handleApply = () => {
        if (!hasPending) return;

        // CompileScheduler emits is_compiling when the resulting CONFIG
        // change reaches it. No optimistic UI emit.
        if (pendingSubsystems) {
            if (pendingPreset) {
                applyScalabilityPreset(pendingPreset);
            } else {
                for (const [subId, tier] of Object.entries(pendingSubsystems)) {
                    setSubsystemTier(subId, tier);
                }
            }
        }

        setPendingSubsystems(null);
        setPendingPreset(null);
        setIsOpen(false);
    };

    // Determine which preset radio is active in the pending state. Reuses the
    // canonical matcher (same predicate scalabilitySlice uses for isCustomized).
    const activePresetInPending = pendingPreset
        ?? (pendingSubsystems ? detectScalabilityPreset(effectiveSubsystems) : scalability.activePreset);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                ref={tutAnchor}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    hasPending
                        ? 'text-warn bg-warn/15 border border-warn/30'
                        : 'text-accent-300 bg-accent-900/20 border border-accent-500/20 hover:bg-accent-900/40'
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
                <Popover width="w-64" align="center" onClose={handleClose}>
                    <div className="space-y-3">
                        {/* Master Presets */}
                        <div>
                            <div className="text-[9px] font-bold text-fg-dim uppercase tracking-wider mb-1.5">Viewport Quality</div>
                            <div className="space-y-1">
                                {getShaderCompilerPresets().filter(p => !p.isAdvanced || advancedMode).map(preset => {
                                    const est = estimateShaderCompilerCompileTime(preset.subsystems, topRenderMode);
                                    const isActive = activePresetInPending === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetSelect(preset.id)}
                                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] transition-colors ${
                                                isActive
                                                    ? 'bg-accent-900/40 text-accent-300 border border-accent-500/30'
                                                    : 'text-fg-muted hover:bg-line/5 hover:text-fg'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent-400' : 'bg-fg-ghost'}`} />
                                                <span className="font-semibold">{preset.label}</span>
                                                {preset.id === 'preview' && <span className="text-warn/70 text-[8px] font-normal ml-1">lighting disabled</span>}
                                            </div>
                                            <span className="text-fg-faint text-[9px]">~{(est / 1000).toFixed(0)}s</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Per-Subsystem Overrides */}
                        <div>
                            <div className="text-[9px] font-bold text-fg-dim uppercase tracking-wider mb-1.5">Per Subsystem</div>
                            <div className="space-y-1">
                                {getShaderCompilerSubsystems().filter(s => !s.isAdvanced || advancedMode).map(sub => {
                                    const currentTier = effectiveSubsystems[sub.id] ?? 0;
                                    // Direct subsystems are irrelevant in PT and vice-versa — dim the
                                    // off-mode ones. The Path Tracer tier is the PT analogue of the
                                    // Reflections (Direct) tier.
                                    const isDimmed = (isPT && sub.renderContext === 'direct')
                                        || (!isPT && sub.renderContext === 'pathtracer');
                                    return (
                                        <div
                                            key={sub.id}
                                            ref={(el) => { if (el) tutorAnchors.register(`vp-quality-row-${sub.id}`, el); }}
                                            className={`flex items-center justify-between px-2 transition-opacity ${isDimmed ? 'opacity-35' : ''}`}
                                        >
                                            <span className={`text-[10px] ${isDimmed ? 'text-fg-faint' : 'text-fg-muted'}`}>
                                                {sub.label}
                                            </span>
                                            <select
                                                value={currentTier}
                                                onChange={(e) => handleSubsystemChange(sub.id, parseInt(e.target.value))}
                                                // Tooltip explains the current tier; per-option titles
                                                // explain each choice when the list is open.
                                                title={sub.tiers[currentTier]?.desc ?? ''}
                                                className={`bg-surface-sunken border border-line/10 rounded px-1.5 py-0.5 text-[10px] outline-none cursor-pointer ${
                                                    isDimmed ? 'text-fg-faint' : 'text-fg focus:border-accent-500'
                                                }`}
                                            >
                                                {sub.tiers.map((tier, i) => (
                                                    <option key={i} value={i} title={tier.desc ?? ''}>{tier.label}</option>
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
                                    {/* Sample All Lights / Env sampling are now owned by the
                                        Path Tracer quality tier (Balanced / Full) in the Per
                                        Subsystem list above — no separate inline toggles. */}
                                </div>
                            </div>
                        )}

                        {/* Apply Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-line/10">
                            <span className="text-[9px] text-fg-dim">
                                Est. ~{(estimatedMs / 1000).toFixed(1)}s
                            </span>
                            <button
                                onClick={handleApply}
                                disabled={!hasPending}
                                className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${
                                    hasPending
                                        ? 'bg-accent-600 hover:bg-accent-500 text-fg'
                                        : 'bg-surface-header text-fg-faint cursor-not-allowed'
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
