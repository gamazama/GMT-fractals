/**
 * BucketRenderPanel — generic bucket-render settings popover.
 *
 * Ported from `engine-gmt/topbar/BucketRenderControls.tsx` and parameterized
 * on a `BucketRenderController` so any app can install it. The panel reads
 * generic store fields (renderControlSlice) and routes renderer-specific
 * actions (start/stop, preview region, accumulation poll) through the
 * controller. Apps provide a controller via `installBucketRender`.
 *
 * Optional features (preview region, picking mode) gracefully degrade when
 * the controller doesn't implement them — fluid-toy v1, for example, omits
 * the preview-region methods and the panel hides those affordances.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEngineStore, getCanvasPhysicalPixelSize } from '../../../store/engineStore';
import Slider, { DraggableNumber } from '../../../components/Slider';
import ToggleSwitch from '../../../components/ToggleSwitch';
import Dropdown from '../../../components/Dropdown';
import { FractalEvents, FRACTAL_EVENTS } from '../../FractalEvents';
import { CheckIcon, DownloadIcon } from '../../../components/Icons';
import { Popover } from '../../../components/Popover';
import { SectionLabel } from '../../../components/SectionLabel';
import type { BucketRenderController } from './BucketRenderController';

/** Estimate VRAM usage for a single image tile in MB. */
function estimateTileVRAM(viewportW: number, viewportH: number, tileW: number, tileH: number): number {
    const pixels = tileW * tileH;
    // Composite buffer (per tile): RGBA Float32 (16 bytes/pixel)
    const composite = pixels * 16;
    // Pipeline targets (A + B): RGBA Float32 x2 (32 bytes/pixel)
    const pipeline = pixels * 32;
    // Bloom mip chain: ~1.33x base at HalfFloat (8 bytes/pixel). Bloom runs at viewport
    // resolution when output exceeds viewport; otherwise at tile resolution.
    const bloomPixels = tileW > viewportW || tileH > viewportH ? viewportW * viewportH : pixels;
    const bloom = bloomPixels * 8 * 1.33;
    // Export readback target (temporary RGBA Uint8, 4 bytes/pixel)
    const exportBuf = pixels * 4;
    return (composite + pipeline + bloom + exportBuf) / (1024 * 1024);
}

// Common output presets (label, width, height)
const OUTPUT_PRESETS: Array<{ label: string; w: number; h: number }> = [
    { label: 'HD (1280 × 720)',         w: 1280,  h: 720 },
    { label: 'FHD (1920 × 1080)',       w: 1920,  h: 1080 },
    { label: 'QHD (2560 × 1440)',       w: 2560,  h: 1440 },
    { label: '4K UHD (3840 × 2160)',    w: 3840,  h: 2160 },
    { label: '5K (5120 × 2880)',        w: 5120,  h: 2880 },
    { label: '8K UHD (7680 × 4320)',    w: 7680,  h: 4320 },
    { label: 'Square 1:1 (2048)',       w: 2048,  h: 2048 },
    { label: 'Square 1:1 (4096)',       w: 4096,  h: 4096 },
    { label: 'Portrait 4:5 (1080p)',    w: 1080,  h: 1350 },
    { label: 'Vertical 9:16 (1080p)',   w: 1080,  h: 1920 },
    { label: 'A3 Print @ 300dpi',       w: 3508,  h: 4961 },
    { label: 'A2 Print @ 300dpi',       w: 4961,  h: 7016 },
    { label: 'A1 Print @ 300dpi',       w: 7016,  h: 9933 },
    { label: 'A0 Print @ 300dpi',       w: 9933,  h: 14043 },
    { label: 'Custom',                  w: 0,     h: 0 },
];

/** Snap to multiples of 8 (GPU-friendly, matches QualityPanel convention). */
const snap8 = (n: number) => Math.max(64, Math.round(n / 8) * 8);

interface BucketRenderPanelProps {
    controller: BucketRenderController;
}

const BucketRenderPanel: React.FC<BucketRenderPanelProps> = ({ controller }) => {
    const state = useEngineStore();
    const [progress, setProgress] = useState(0);
    // Live sample-count readout for the in-panel preview status row. Polls the
    // controller every 100ms while a preview region is active.
    const [previewSamples, setPreviewSamples] = useState(0);

    const supportsPreview = !!controller.setPreviewRegion && !!controller.clearPreviewRegion;

    useEffect(() => {
        return FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, (data) => {
            setProgress(data.progress);
        });
    }, []);

    useEffect(() => {
        if (!state.previewRegion) return;
        const id = setInterval(() => setPreviewSamples(controller.accumulationCount), 100);
        return () => clearInterval(id);
    }, [state.previewRegion, controller]);

    // Escape exits preview region. Previously handled by the canvas HUD; that HUD is gone,
    // so this popover owns the shortcut while a preview is active.
    useEffect(() => {
        if (!state.previewRegion) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                controller.clearPreviewRegion?.();
                state.setPreviewRegion(null);
                if (state.interactionMode === 'selecting_preview') {
                    state.setInteractionMode('none');
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.previewRegion]);

    // Suppress adaptive resolution while panel open, and cancel any active preview on close —
    // the preview's on-screen held frame belongs to this popover's lifecycle.
    // Also match the viewport aspect to the output aspect (via Fixed resolution mode) so that
    // primary-ray framing and on-screen composition match what the export will produce.
    // We snapshot the PRE-SWAP viewport's physical pixel size at mount (via the canonical
    // helper, which avoids Fixed-mode ResizeObserver lag) and use that snapshot for all
    // subsequent fit calcs — so changing output dims multiple times in one session always
    // fits against the original viewport, not the progressively-shrinking Fixed mode canvas.
    const savedResolutionRef = useRef<{
        mode: 'Full' | 'Fixed';
        fixed: [number, number];
        availPhysPx: [number, number];
    } | null>(null);

    useEffect(() => {
        const s0 = useEngineStore.getState();
        const initialPhysPx = getCanvasPhysicalPixelSize(s0);
        savedResolutionRef.current = {
            mode: s0.resolutionMode,
            fixed: [s0.fixedResolution[0], s0.fixedResolution[1]],
            availPhysPx: [initialPhysPx[0], initialPhysPx[1]],
        };
        s0.setAdaptiveSuppressed(true);
        return () => {
            const sNow = useEngineStore.getState();
            sNow.setAdaptiveSuppressed(false);
            if (sNow.interactionMode === 'selecting_preview') sNow.setInteractionMode('none');
            if (sNow.previewRegion) {
                sNow.setPreviewRegion(null);
                controller.clearPreviewRegion?.();
            }
            controller.stopBucketRender();
            // Restore the saved resolution mode from before the popover was opened.
            const saved = savedResolutionRef.current;
            if (saved) {
                sNow.setResolutionMode(saved.mode);
                sNow.setFixedResolution(saved.fixed[0], saved.fixed[1]);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // VRAM estimator uses the current canvas size (honors Fixed-mode without ResizeObserver lag).
    const viewportPixels = useMemo<[number, number]>(
        () => getCanvasPhysicalPixelSize(state),
        [state.canvasPixelSize, state.resolutionMode, state.fixedResolution, state.dpr]
    );

    const { outputWidth, outputHeight, tileCols, tileRows, matchViewportAspect, previewRegion } = state;

    // Auto-exit preview when output dimensions change — rendered pixels no longer represent
    // the configured export. See docs/44_Preview_Region_Plan.md decision #2.
    useEffect(() => {
        if (previewRegion) {
            controller.clearPreviewRegion?.();
            state.setPreviewRegion(null);
            if (state.interactionMode === 'selecting_preview') {
                state.setInteractionMode('none');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [outputWidth, outputHeight]);

    // Keep the sample cap in sync mid-preview: if the user moves the Max Samples slider
    // while a preview is active, resend SET with the new cap.
    useEffect(() => {
        if (previewRegion) {
            controller.setPreviewRegion?.(previewRegion, outputWidth, outputHeight, state.samplesPerBucket);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.samplesPerBucket]);

    // Match viewport aspect to output aspect via Fixed mode — but ONLY when the user has
    // unlocked the viewport aspect (`matchViewportAspect === false`). When the aspect is
    // locked to the viewport, output dims always track viewport aspect, so the viewport
    // already matches and no Fixed-mode swap is needed. In that case we also revert any
    // previously-applied swap so the user stays in their original resolution mode.
    useEffect(() => {
        const saved = savedResolutionRef.current;
        if (!saved) return;

        if (matchViewportAspect) {
            if (state.resolutionMode !== saved.mode ||
                state.fixedResolution[0] !== saved.fixed[0] ||
                state.fixedResolution[1] !== saved.fixed[1]) {
                state.setResolutionMode(saved.mode);
                state.setFixedResolution(saved.fixed[0], saved.fixed[1]);
            }
            return;
        }

        const dpr = state.dpr || 1;
        const availW = Math.max(256, Math.floor(saved.availPhysPx[0] / dpr));
        const availH = Math.max(256, Math.floor(saved.availPhysPx[1] / dpr));

        const outAspect = outputWidth / Math.max(1, outputHeight);
        const availAspect = availW / availH;

        let fitW: number, fitH: number;
        if (outAspect > availAspect) {
            fitW = availW;
            fitH = Math.floor(availW / outAspect);
        } else {
            fitH = availH;
            fitW = Math.floor(availH * outAspect);
        }
        const MAX_CSS = 3000;
        if (fitW > MAX_CSS) { fitW = MAX_CSS; fitH = Math.floor(fitW / outAspect); }
        if (fitH > MAX_CSS) { fitH = MAX_CSS; fitW = Math.floor(fitH * outAspect); }
        fitW = Math.max(64, Math.round(fitW / 8) * 8);
        fitH = Math.max(64, Math.round(fitH / 8) * 8);

        if (state.resolutionMode === 'Fixed'
            && Math.abs(state.fixedResolution[0] - fitW) < 2
            && Math.abs(state.fixedResolution[1] - fitH) < 2) {
            return;
        }

        state.setFixedResolution(fitW, fitH);
        state.setResolutionMode('Fixed');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [outputWidth, outputHeight, matchViewportAspect]);

    // Per-tile dims (fullOut / grid, last col/row absorbs remainder).
    const tilePixels = useMemo<[number, number]>(() => {
        const tileW = Math.max(1, Math.floor(outputWidth / Math.max(1, tileCols)));
        const tileH = Math.max(1, Math.floor(outputHeight / Math.max(1, tileRows)));
        return [tileW, tileH];
    }, [outputWidth, outputHeight, tileCols, tileRows]);

    const vram = useMemo(() => {
        return estimateTileVRAM(viewportPixels[0], viewportPixels[1], tilePixels[0], tilePixels[1]);
    }, [viewportPixels, tilePixels]);

    const fileCount = tileCols * tileRows;

    const currentPreset = useMemo(() => {
        const match = OUTPUT_PRESETS.find(p => p.w === outputWidth && p.h === outputHeight);
        return match ? match.label : 'Custom';
    }, [outputWidth, outputHeight]);

    const viewportAspect = viewportPixels[1] > 0 ? viewportPixels[0] / viewportPixels[1] : 1;

    // When "Lock to viewport aspect" is ON, only the ASPECT is locked.
    useEffect(() => {
        if (!matchViewportAspect) return;
        const [cpxW, cpxH] = getCanvasPhysicalPixelSize(useEngineStore.getState());
        if (cpxW < 64 || cpxH < 64) return;
        const aspect = cpxW / cpxH;
        if (!Number.isFinite(aspect) || aspect <= 0) return;
        const desiredH = snap8(outputWidth / aspect);
        if (Math.abs(outputHeight - desiredH) >= 4) state.setOutputHeight(desiredH);
    });

    const setWidth = (w: number) => {
        const newW = snap8(w);
        state.setOutputWidth(newW);
        if (matchViewportAspect) {
            state.setOutputHeight(snap8(newW / viewportAspect));
        }
    };
    const setHeight = (h: number) => {
        const newH = snap8(h);
        state.setOutputHeight(newH);
        if (matchViewportAspect) {
            state.setOutputWidth(snap8(newH * viewportAspect));
        }
    };
    const applyPreset = (label: string) => {
        const p = OUTPUT_PRESETS.find(x => x.label === label);
        if (!p || p.w === 0) return;
        state.setOutputWidth(snap8(p.w));
        state.setOutputHeight(snap8(p.h));
    };
    const matchViewport = () => {
        state.setOutputWidth(viewportPixels[0]);
        state.setOutputHeight(viewportPixels[1]);
    };

    const withRenderAction = (action: () => void) => {
        state.handleInteractionStart('param');
        if (state.isBucketRendering) controller.stopBucketRender();
        else action();
        state.handleInteractionEnd();
    };

    // Ensure no preview region is active before starting a bucket render.
    const clearPreviewForRender = () => {
        if (state.previewRegion) {
            controller.clearPreviewRegion?.();
            state.setPreviewRegion(null);
        }
        if (state.interactionMode === 'selecting_preview') {
            state.setInteractionMode('none');
        }
    };

    const handleStartRefine = () => withRenderAction(() => {
        clearPreviewForRender();
        // Refine View is always a single-tile render at viewport resolution.
        controller.startBucketRender(false, {
            bucketSize: state.bucketSize,
            outputWidth: viewportPixels[0],
            outputHeight: viewportPixels[1],
            tileCols: 1,
            tileRows: 1,
            convergenceThreshold: state.convergenceThreshold,
            accumulation: state.accumulation,
            samplesPerBucket: state.samplesPerBucket,
        });
    });

    const handleExport = () => withRenderAction(() => {
        clearPreviewForRender();
        controller.startBucketRender(true, {
            bucketSize: state.bucketSize,
            outputWidth,
            outputHeight,
            tileCols,
            tileRows,
            convergenceThreshold: state.convergenceThreshold,
            accumulation: state.accumulation,
            samplesPerBucket: state.samplesPerBucket,
        });
    });

    const showBloomSeamWarning = fileCount > 1;

    return (
        <Popover width="w-80">
            <div className="relative space-y-3" data-help-id="bucket.render">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-bold text-gray-400">High Quality Render</span>
                    {state.isBucketRendering && (
                        <button
                            type="button"
                            onClick={() => controller.stopBucketRender()}
                            className="text-[9px] font-bold px-2 py-0.5 rounded border border-red-500/50 bg-red-500/20 text-red-300 animate-pulse"
                        >
                            Stop
                        </button>
                    )}
                    {!state.isBucketRendering && state.previewRegion && supportsPreview && (
                        <button
                            type="button"
                            onClick={() => {
                                controller.clearPreviewRegion?.();
                                state.setPreviewRegion(null);
                                if (state.interactionMode === 'selecting_preview') {
                                    state.setInteractionMode('none');
                                }
                            }}
                            className="text-[9px] font-bold px-2 py-0.5 rounded border border-fuchsia-400/60 bg-fuchsia-900/40 text-fuchsia-200 hover:bg-fuchsia-800/50 transition-colors flex items-center gap-1"
                            title="Exit Preview Region (Esc)"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                            Exit Preview ✕
                        </button>
                    )}
                </div>

                {!state.isBucketRendering && state.previewRegion && supportsPreview && (() => {
                    const r = state.previewRegion;
                    const rW = Math.round((r.maxX - r.minX) * outputWidth);
                    const rH = Math.round((r.maxY - r.minY) * outputHeight);
                    const cap = state.samplesPerBucket;
                    const cappedSamples = Math.min(previewSamples, cap);
                    const atCap = previewSamples >= cap;
                    return (
                        <div className="flex items-center justify-between text-[9px] bg-fuchsia-900/20 border border-fuchsia-400/20 rounded px-2 py-1 -mt-1">
                            <span className="text-fuchsia-300 font-bold">Preview</span>
                            <span className="text-gray-400">
                                {outputWidth}×{outputHeight}
                                <span className="text-gray-600 mx-1">·</span>
                                region {rW}×{rH}
                            </span>
                            <span className={atCap ? 'text-green-400' : 'text-cyan-300'} title={atCap ? 'Sample cap reached — will restart on any change' : `Accumulating (cap ${cap})`}>
                                {cappedSamples}/{cap}
                            </span>
                        </div>
                    );
                })()}

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
                            type="button"
                            onClick={handleStartRefine}
                            className="flex-1 py-2 rounded bg-gray-800 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-gray-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400 flex flex-col items-center gap-1"
                            title="Refine Viewport (single image, viewport size)"
                        >
                            <CheckIcon />
                            <span>Refine View</span>
                        </button>
                        {supportsPreview && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (state.previewRegion) {
                                        controller.clearPreviewRegion?.();
                                        state.setPreviewRegion(null);
                                        state.setInteractionMode('none');
                                    } else if (state.interactionMode === 'selecting_preview') {
                                        state.setInteractionMode('none');
                                    } else {
                                        state.setInteractionMode('selecting_preview');
                                    }
                                }}
                                className={`flex-1 py-2 rounded border text-[9px] font-bold transition-all flex flex-col items-center gap-1 ${
                                    state.interactionMode === 'selecting_preview' || state.previewRegion
                                        ? 'bg-fuchsia-900/40 border-fuchsia-400/60 text-fuchsia-200'
                                        : 'bg-gray-800 hover:bg-white/10 border-white/10 text-gray-300 hover:border-fuchsia-500/50 hover:text-fuchsia-300'
                                }`}
                                title="Preview a canvas section at export resolution (click canvas to pick)"
                            >
                                <span className="text-[11px]">⌖</span>
                                <span>{state.previewRegion ? 'Previewing' : (state.interactionMode === 'selecting_preview' ? 'Pick on Canvas' : 'Preview Region')}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleExport}
                            className="flex-1 py-2 rounded bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/30 text-[9px] font-bold text-cyan-300 transition-all hover:border-cyan-400 flex flex-col items-center gap-1"
                            title={`Render ${fileCount > 1 ? `${fileCount} tile files` : 'and save image'}`}
                        >
                            <DownloadIcon />
                            <span>{fileCount > 1 ? `Export ${fileCount} Tiles` : 'Export Image'}</span>
                        </button>
                    </div>
                )}

                <div className={`space-y-2 transition-opacity ${state.isBucketRendering ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
                    <p className="text-[8px] text-gray-500 -mt-1 px-1">Lower = more samples, higher quality. 0.1%=production, 1%=fast</p>

                    <Slider
                        label="Max Samples Per Bucket"
                        value={state.samplesPerBucket}
                        min={16} max={1024} step={16}
                        onChange={state.setSamplesPerBucket}
                        overrideInputText={`${state.samplesPerBucket} max`}
                        highlight={state.samplesPerBucket >= 256}
                    />
                    <p className="text-[8px] text-gray-500 -mt-1 px-1">Safety limit. Tiles stop early if converged.</p>

                    <div className="pt-2 border-t border-white/5">
                        <SectionLabel className="block mb-1">Output Size</SectionLabel>

                        <Dropdown
                            label="Preset"
                            value={currentPreset}
                            options={OUTPUT_PRESETS.map(p => ({ label: p.label, value: p.label }))}
                            onChange={(v) => applyPreset(v as string)}
                            fullWidth
                        />

                        <div className="flex gap-2 mt-2">
                            <div className="flex-1">
                                <SectionLabel variant="secondary" className="block mb-0.5">Width</SectionLabel>
                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                    <DraggableNumber
                                        value={outputWidth}
                                        onChange={setWidth}
                                        step={8} min={64} max={32768}
                                        overrideText={`${outputWidth}`}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <SectionLabel variant="secondary" className="block mb-0.5">Height</SectionLabel>
                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                    <DraggableNumber
                                        value={outputHeight}
                                        onChange={setHeight}
                                        step={8} min={64} max={32768}
                                        overrideText={`${outputHeight}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 px-1">
                            <label className="flex items-center gap-1.5 text-[9px] text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={matchViewportAspect}
                                    onChange={(e) => state.setMatchViewportAspect(e.target.checked)}
                                    className="accent-cyan-500"
                                />
                                Lock to viewport aspect
                            </label>
                            <button
                                onClick={matchViewport}
                                className="text-[9px] text-cyan-400 hover:text-cyan-300 underline"
                                title="Set output size to viewport dimensions"
                            >
                                Match viewport
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Tile Grid</SectionLabel>
                            {fileCount > 1 && (
                                <span className="text-[9px] text-cyan-400">{fileCount} files</span>
                            )}
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <SectionLabel variant="secondary" className="block mb-0.5">Columns</SectionLabel>
                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                    <DraggableNumber
                                        value={tileCols}
                                        onChange={state.setTileCols}
                                        step={1} min={1} max={32}
                                        overrideText={`${tileCols}`}
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-500 pb-1">×</span>
                            <div className="flex-1">
                                <SectionLabel variant="secondary" className="block mb-0.5">Rows</SectionLabel>
                                <div className="h-6 bg-black/40 rounded border border-white/10 relative">
                                    <DraggableNumber
                                        value={tileRows}
                                        onChange={state.setTileRows}
                                        step={1} min={1} max={32}
                                        overrideText={`${tileRows}`}
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-[8px] text-gray-500 mt-1 px-1">
                            Split the image into separate files for massive renders. 1×1 = single image.
                        </p>
                        {showBloomSeamWarning && (
                            <p className="text-[8px] text-amber-400/80 mt-1 px-1">
                                ⚠ Bloom and chromatic aberration may produce visible seams at tile boundaries. Disable these in the Lighting / Post panels for seamless stitching.
                            </p>
                        )}
                    </div>

                    <div className="pt-2 border-t border-white/5 px-1">
                        <div className="text-[9px] text-gray-300">
                            {outputWidth}×{outputHeight}
                            {fileCount > 1 && (
                                <span className="text-gray-500"> → {fileCount} × {tilePixels[0]}×{tilePixels[1]}</span>
                            )}
                        </div>
                        <div className={`text-[9px] ${vram > 1500 ? 'text-red-400' : vram > 500 ? 'text-yellow-400' : 'text-gray-500'}`}>
                            ~{vram < 1024 ? `${Math.round(vram)} MB` : `${(vram / 1024).toFixed(1)} GB`} VRAM per tile
                            {vram > 1500 && ' — may exceed GPU memory'}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                        <SectionLabel className="block mb-1">GPU Bucket Size</SectionLabel>
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
                        <p className="text-[8px] text-gray-500 mt-1 px-1">Smaller = less memory, larger = faster per-bucket cost</p>
                    </div>
                </div>
            </div>
        </Popover>
    );
};

export default BucketRenderPanel;
