
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEngineStore } from '../../../store/engineStore';
import { FractalEvents } from '../../../engine/FractalEvents';
import { detectHardwareProfileMainThread } from '../../../engine/HardwareDetection';
import type { HardwareProfile } from '../../../types/viewport';
import Dropdown from '../../../components/Dropdown';
import { DEFAULT_HARD_CAP } from '../../../data/constants';

interface HardwarePreferencesProps {
    onClose: () => void;
}

/**
 * Modal for device-level hardware settings.
 * These are set-and-forget — they describe what the GPU can handle,
 * not creative intent. Separated from the Engine Panel to avoid
 * mixing device constraints with creative/quality controls.
 */
export const HardwarePreferences: React.FC<HardwarePreferencesProps> = ({ onClose }) => {
    const hardwareProfile = useEngineStore(s => s.hardwareProfile);
    const setHardwareProfile = useEngineStore(s => s.setHardwareProfile);

    // Local pending state — changes staged until Apply
    const [pending, setPending] = useState<HardwareProfile['caps'] | null>(null);
    const effective = pending ?? hardwareProfile?.caps ?? { precisionMode: 0, bufferPrecision: 0, compilerHardCap: DEFAULT_HARD_CAP };

    const hasPending = pending !== null;

    const handleChange = (key: keyof HardwareProfile['caps'], value: number) => {
        const base = pending ?? { ...hardwareProfile?.caps ?? { precisionMode: 0, bufferPrecision: 0, compilerHardCap: DEFAULT_HARD_CAP } };
        setPending({ ...base, [key]: value });
    };

    const handleApply = () => {
        if (!pending || !hardwareProfile) return;
        FractalEvents.emit('is_compiling', 'Recompiling Shader...');
        setTimeout(() => {
            // setHardwareProfile flushes CONFIG internally
            setHardwareProfile({ ...hardwareProfile, caps: pending });
            setPending(null);
            onClose();
        }, 50);
    };

    const handleReset = () => {
        const detected = detectHardwareProfileMainThread();
        setPending(detected.caps);
    };

    const tierLabel = hardwareProfile?.tier === 'low' ? 'Mobile (Low)'
        : hardwareProfile?.tier === 'mid' ? 'Mobile (Mid)'
        : 'Desktop';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="bg-gray-900 border border-white/10 rounded-lg p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="text-xs font-bold text-white mb-1">Hardware Settings</div>
                <div className="text-[9px] text-gray-500 mb-4">
                    Detected: {tierLabel}
                    {hardwareProfile?.isMobile && ' — mobile device'}
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-[9px] text-gray-500 font-bold block mb-1">Ray Precision</label>
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
                        <label className="text-[9px] text-gray-500 font-bold block mb-1">Buffer Precision</label>
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
                        <label className="text-[9px] text-gray-500 font-bold block mb-1">Hard Loop Cap</label>
                        <input
                            type="number"
                            value={effective.compilerHardCap}
                            onChange={(e) => handleChange('compilerHardCap', Math.max(64, Math.min(DEFAULT_HARD_CAP, parseInt(e.target.value) || DEFAULT_HARD_CAP)))}
                            className="w-full bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                            min={64}
                            max={DEFAULT_HARD_CAP}
                        />
                    </div>
                </div>

                <div className="text-[8px] text-gray-600 mt-3">
                    Changes require a shader recompile.
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <button
                        onClick={handleReset}
                        className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        Reset to Detected
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1 rounded text-[10px] text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
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
            </div>
        </div>,
        document.body
    );
};
