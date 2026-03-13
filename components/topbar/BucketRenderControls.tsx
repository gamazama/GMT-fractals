
import React, { useState, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import Slider from '../Slider';
import ToggleSwitch from '../ToggleSwitch';
import { getProxy } from '../../engine/worker/WorkerProxy';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { CheckIcon, DownloadIcon } from '../Icons';
import { Popover } from '../../components/Popover';

const engine = getProxy();

const BucketRenderSettingsPopup = () => {
    const state = useFractalStore();
    const [progress, setProgress] = useState(0);

    // Track progress from BUCKET_STATUS events
    useEffect(() => {
        return FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, (data) => {
            setProgress(data.progress);
        });
    }, []);

    // Explicit Start/Stop handlers to avoid race conditions with state toggles
    const handleStartRefine = () => {
        state.handleInteractionStart('param');
        if (state.isBucketRendering) engine.stopBucketRender();
        else {
            // Viewport Refine: Always 1x
            state.setBucketUpscale(1.0);
            engine.startBucketRender(false, {
                bucketSize: state.bucketSize,
                bucketUpscale: 1.0,
                convergenceThreshold: state.convergenceThreshold,
                accumulation: state.accumulation,
                samplesPerBucket: state.samplesPerBucket
            });
        }
        state.handleInteractionEnd();
    };

    const handleExport = () => {
        state.handleInteractionStart('param');
        if (state.isBucketRendering) engine.stopBucketRender();
        else {
            // Gather Preset Data for Metadata injection
            const preset = state.getPreset({ includeScene: true });
            const currentVersion = state.prepareExport();

            engine.startBucketRender(true, {
                bucketSize: state.bucketSize,
                bucketUpscale: state.bucketUpscale,
                convergenceThreshold: state.convergenceThreshold,
                accumulation: state.accumulation,
                samplesPerBucket: state.samplesPerBucket
            }, {
                preset,
                name: state.projectSettings.name,
                version: currentVersion
            });
        }
        state.handleInteractionEnd();
    };

    return (
        <Popover width="w-72">
            <div className="relative space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-bold text-gray-400">High Quality Render</span>
                    {state.isBucketRendering && (
                        <button
                            onClick={() => engine.stopBucketRender()}
                            className="text-[9px] font-bold px-2 py-0.5 rounded border border-red-500/50 bg-red-500/20 text-red-300 animate-pulse"
                        >
                            Stop
                        </button>
                    )}
                </div>

                {state.isBucketRendering ? (
                    <div className="bg-white/5 rounded p-2 mb-2">
                         <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                             <span>Progress</span>
                             <span>{progress.toFixed(1)}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                             <div className="h-full bg-cyan-500 transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
                         </div>
                    </div>
                ) : (
                    <div className="flex gap-2 mb-2">
                        <button
                            onClick={handleStartRefine}
                            className="flex-1 py-2 rounded bg-gray-800 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-gray-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400 flex flex-col items-center gap-1"
                            title="Refine Viewport (1x)"
                        >
                            <CheckIcon />
                            <span>Refine View</span>
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex-1 py-2 rounded bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/30 text-[9px] font-bold text-cyan-300 transition-all hover:border-cyan-400 flex flex-col items-center gap-1"
                            title="Render & Save Image"
                        >
                            <DownloadIcon />
                            <span>Export Image</span>
                        </button>
                    </div>
                )}

                <div className={`space-y-1 transition-opacity ${state.isBucketRendering ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    {/* Convergence Threshold - Primary Quality Control */}
                    <Slider
                        label="Convergence Threshold"
                        value={state.convergenceThreshold}
                        min={0.01} max={1.0} step={0.01}
                        onChange={state.setConvergenceThreshold}
                        customMapping={{
                            min: 0, max: 100,
                            toSlider: (val) => ((Math.log10(val) + 2) / 2) * 100,
                            fromSlider: (val) => Math.pow(10, (val / 100 * 2) - 2)
                        }}
                        overrideInputText={`${state.convergenceThreshold.toFixed(2)}%`}
                    />
                    <p className="text-[8px] text-gray-500 -mt-1 px-1 mb-2">Lower = more samples, higher quality. 0.1%=production, 1%=fast</p>

                    {/* Max Samples Per Bucket - Safety Limit */}
                    <Slider
                        label="Max Samples Per Bucket"
                        value={state.samplesPerBucket}
                        min={16} max={1024} step={16}
                        onChange={state.setSamplesPerBucket}
                        overrideInputText={`${state.samplesPerBucket} max`}
                        highlight={state.samplesPerBucket >= 256}
                    />
                    <p className="text-[8px] text-gray-500 -mt-1 px-1 mb-2">Safety limit. Tiles stop early if converged.</p>

                    <div className="pt-2 border-t border-white/5">
                        <Slider
                            label="Export Scale"
                            value={state.bucketUpscale}
                            min={1.0} max={8.0} step={0.5}
                            onChange={state.setBucketUpscale}
                            overrideInputText={`${state.bucketUpscale}x`}
                            highlight={state.bucketUpscale > 1.0}
                        />
                        <p className="text-[8px] text-gray-500 -mt-1 px-1 mb-2">
                            Resolution multiplier. 2x = 4K from 1080p, 4x = 8K, 8x = 10K+
                        </p>

                        <label className="text-[9px] font-bold text-gray-400 block mb-1">Bucket Size</label>
                        <ToggleSwitch
                            value={state.bucketSize}
                            onChange={state.setBucketSize}
                            options={[
                                { label: '64', value: 64 },
                                { label: '128', value: 128 },
                                { label: '256', value: 256 },
                                { label: '512', value: 512 },
                            ]}
                        />
                        <p className="text-[8px] text-gray-500 mt-1 px-1">Smaller = less memory, larger = faster</p>
                    </div>
                </div>
            </div>
        </Popover>
    );
};

export default BucketRenderSettingsPopup;
