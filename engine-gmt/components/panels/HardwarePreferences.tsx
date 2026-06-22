import React, { useState } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { detectHardwareProfileMainThread } from '../../../engine/HardwareDetection';
import type { HardwareProfile } from '../../../types/viewport';
import Dropdown from '../../../components/Dropdown';
import { DEFAULT_HARD_CAP } from '../../../data/constants';

/**
 * HardwarePrefsControls — device-level hardware caps as an embeddable form.
 *
 * Set-and-forget device constraints (what the GPU can handle), kept separate from
 * creative/quality controls. Changes are STAGED until Apply because each one forces
 * a shader recompile — so this can't be a set of immediate-write settings descriptors;
 * it registers as a `custom` Settings section that owns its own pending/Apply state.
 *
 * Previously a standalone modal (HardwarePrefsHost); now rendered inside the unified
 * Settings panel via the settingsRegistry `custom` control.
 */
export const HardwarePrefsControls: React.FC = () => {
    const hardwareProfile = useEngineStore(s => s.hardwareProfile);
    const setHardwareProfile = useEngineStore(s => s.setHardwareProfile);

    // Local pending state — changes staged until Apply.
    const [pending, setPending] = useState<HardwareProfile['caps'] | null>(null);
    const effective = pending ?? hardwareProfile?.caps ?? { precisionMode: 0, bufferPrecision: 0, compilerHardCap: DEFAULT_HARD_CAP };
    const hasPending = pending !== null;

    const handleChange = (key: keyof HardwareProfile['caps'], value: number) => {
        const base = pending ?? { ...hardwareProfile?.caps ?? { precisionMode: 0, bufferPrecision: 0, compilerHardCap: DEFAULT_HARD_CAP } };
        setPending({ ...base, [key]: value });
    };

    const handleApply = () => {
        if (!pending || !hardwareProfile) return;
        // setHardwareProfile flushes CONFIG internally; CompileScheduler emits
        // is_compiling on the rebuild boundary.
        setHardwareProfile({ ...hardwareProfile, caps: pending });
        setPending(null);
    };

    const handleReset = () => {
        setPending(detectHardwareProfileMainThread().caps);
    };

    const tierLabel = hardwareProfile?.tier === 'low' ? 'Mobile (Low)'
        : hardwareProfile?.tier === 'mid' ? 'Mobile (Mid)'
        : 'Desktop';

    return (
        <div>
            <div className="text-[9px] text-fg-dim mb-3">
                Detected: {tierLabel}{hardwareProfile?.isMobile && ' — mobile device'}
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-[9px] text-fg-dim font-bold block mb-1">Ray Precision</label>
                    <Dropdown
                        value={effective.precisionMode === 0 ? 'High (Desktop)' : 'Standard (Mobile)'}
                        onChange={(v) => handleChange('precisionMode', v === 'High (Desktop)' ? 0 : 1)}
                        options={[
                            { label: 'High (Desktop)', value: 'High (Desktop)' },
                            { label: 'Standard (Mobile)', value: 'Standard (Mobile)' },
                        ]}
                        fullWidth
                    />
                </div>

                <div>
                    <label className="text-[9px] text-fg-dim font-bold block mb-1">Buffer Precision</label>
                    <Dropdown
                        value={effective.bufferPrecision === 0 ? 'Float32 (HDR)' : 'HalfFloat16'}
                        onChange={(v) => handleChange('bufferPrecision', v === 'Float32 (HDR)' ? 0 : 1)}
                        options={[
                            { label: 'Float32 (HDR)', value: 'Float32 (HDR)' },
                            { label: 'HalfFloat16', value: 'HalfFloat16' },
                        ]}
                        fullWidth
                    />
                </div>

                <div>
                    <label className="text-[9px] text-fg-dim font-bold block mb-1">Hard Loop Cap</label>
                    <input
                        type="number"
                        value={effective.compilerHardCap}
                        onChange={(e) => handleChange('compilerHardCap', Math.max(64, Math.min(DEFAULT_HARD_CAP, parseInt(e.target.value) || DEFAULT_HARD_CAP)))}
                        className="w-full bg-surface-header border border-line/10 rounded px-2 py-1 text-xs text-fg outline-none focus:border-accent-500"
                        min={64}
                        max={DEFAULT_HARD_CAP}
                    />
                </div>
            </div>

            <div className="text-[8px] text-fg-faint mt-3">
                Changes require a shader recompile.
            </div>

            <div className="flex items-center justify-between mt-3">
                <button
                    onClick={handleReset}
                    className="text-[10px] text-fg-dim hover:text-fg-tertiary transition-colors"
                >
                    Reset to Detected
                </button>
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
    );
};
