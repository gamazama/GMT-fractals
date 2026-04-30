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
import Slider from '../../../components/Slider';
import ToggleSwitch from '../../../components/ToggleSwitch';
import Dropdown from '../../../components/Dropdown';
import { FractalEvents, FRACTAL_EVENTS } from '../../FractalEvents';
import { CheckIcon, DownloadIcon } from '../../../components/Icons';
import { Popover } from '../../../components/Popover';
import { SectionLabel } from '../../../components/SectionLabel';
import { Button } from '../../../components/Button';
import { Hint } from '../../../components/Hint';
import { NumberInput } from '../../../components/NumberInput';
import { formatTimeWithUnits, calcEtaRange } from '../../../components/timeline/exportHelpers';
import { snap8 } from '../../../utils/resolutionUtils';
import {
    RESOLUTION_PRESETS,
    ASPECT_LOCK_OPTIONS,
    type AspectRatioValue,
} from '../../../data/resolutionPresets';
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

// Resolution + aspect-ratio dropdowns sourced from `data/resolutionPresets` so
// the bucket-render panel, the Quality > Resolution panel, and the viewport
// "fit to window" dropdown all stay in sync.
const PRESET_DROPDOWN_OPTIONS = [
    ...RESOLUTION_PRESETS.map(p => ({ label: p.label, value: p.label })),
    { label: 'Custom', value: 'Custom' },
];
const ASPECT_DROPDOWN_OPTIONS = ASPECT_LOCK_OPTIONS.map(a => ({ label: a.label, value: a.ratio }));

interface BucketRenderPanelProps {
    controller: BucketRenderController;
}

const BucketRenderPanel: React.FC<BucketRenderPanelProps> = ({ controller }) => {
    const state = useEngineStore();
    const [progress, setProgress] = useState(0);
    const [tileInfo, setTileInfo] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [elapsed, setElapsed] = useState(0);
    const renderStartRef = useRef<number>(0);
    // Live sample-count readout for the in-panel preview status row. Polls the
    // controller every 100ms while a preview region is active.
    const [previewSamples, setPreviewSamples] = useState(0);

    const supportsPreview = !!controller.setPreviewRegion && !!controller.clearPreviewRegion;

    useEffect(() => {
        return FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, (data) => {
            // BUCKET_STATUS fires per render frame; skip setState when nothing
            // changed so React doesn't re-render at engine framerate.
            setProgress(prev => Math.abs(prev - data.progress) < 0.05 ? prev : data.progress);
            if (typeof data.currentBucket === 'number' && typeof data.totalBuckets === 'number') {
                const next = { done: data.currentBucket, total: data.totalBuckets };
                setTileInfo(prev => prev.done === next.done && prev.total === next.total ? prev : next);
            }
        });
    }, []);

    useEffect(() => {
        if (!state.isBucketRendering) {
            renderStartRef.current = 0;
            setElapsed(0);
            return;
        }
        renderStartRef.current = performance.now();
        setElapsed(0);
        const id = setInterval(() => {
            setElapsed((performance.now() - renderStartRef.current) / 1000);
        }, 250);
        return () => clearInterval(id);
    }, [state.isBucketRendering]);

    const etaRange = useMemo(
        () => calcEtaRange(elapsed, progress, 100),
        [progress, elapsed],
    );

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
        const match = RESOLUTION_PRESETS.find(p => p.w === outputWidth && p.h === outputHeight);
        return match ? match.label : 'Custom';
    }, [outputWidth, outputHeight]);

    const viewportAspect = viewportPixels[1] > 0 ? viewportPixels[0] / viewportPixels[1] : 1;

    // When "Lock to viewport aspect" is ON, only the ASPECT is locked — H follows
    // viewport aspect whenever the viewport itself resizes or W changes.
    useEffect(() => {
        if (!matchViewportAspect) return;
        const [cpxW, cpxH] = viewportPixels;
        if (cpxW < 64 || cpxH < 64) return;
        const aspect = cpxW / cpxH;
        if (!Number.isFinite(aspect) || aspect <= 0) return;
        const desiredH = snap8(outputWidth / aspect);
        if (Math.abs(outputHeight - desiredH) >= 4) state.setOutputHeight(desiredH);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchViewportAspect, outputWidth, outputHeight, viewportPixels]);

    const setWidth = (w: number) => {
        const newW = snap8(w);
        state.setOutputWidth(newW);
        if (matchViewportAspect) {
            state.setOutputHeight(snap8(newW / viewportAspect));
        } else if (typeof aspectLockValue === 'number') {
            state.setOutputHeight(snap8(newW / aspectLockValue));
        }
    };
    const setHeight = (h: number) => {
        const newH = snap8(h);
        state.setOutputHeight(newH);
        if (matchViewportAspect) {
            state.setOutputWidth(snap8(newH * viewportAspect));
        } else if (typeof aspectLockValue === 'number') {
            state.setOutputWidth(snap8(newH * aspectLockValue));
        }
    };
    const applyPreset = (label: string) => {
        const p = RESOLUTION_PRESETS.find(x => x.label === label);
        if (!p) return;
        state.setOutputWidth(snap8(p.w));
        state.setOutputHeight(snap8(p.h));
    };
    const matchViewport = () => {
        state.setOutputWidth(viewportPixels[0]);
        state.setOutputHeight(viewportPixels[1]);
    };

    // Static aspect-lock — mirrors the Quality > Resolution panel's Ratio
    // dropdown. 'Free' = no lock; numeric = H is recomputed from W on every
    // change. Turning on the static lock implicitly turns off the
    // viewport-aspect lock (the two are mutually exclusive).
    const [aspectLockValue, setAspectLockValue] = useState<AspectRatioValue>('Free');
    const applyAspectLock = (value: AspectRatioValue) => {
        setAspectLockValue(value);
        if (value === 'Free' || value === 'Max') return;
        if (matchViewportAspect) state.setMatchViewportAspect(false);
        state.setOutputHeight(snap8(outputWidth / (value as number)));
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

    // ─── Rendering view ────────────────────────────────────────────────
    // While a bucket render is in flight, collapse to a compact pill so the
    // canvas stays visible. Anchor stays under the bucket-render topbar icon.
    if (state.isBucketRendering) {
        const tileLabel = tileInfo.total > 0
            ? `${Math.min(tileInfo.done + 1, tileInfo.total)} / ${tileInfo.total}`
            : '—';
        const etaLabel = etaRange.max > 0
            ? `${formatTimeWithUnits(etaRange.min)} – ${formatTimeWithUnits(etaRange.max)}`
            : '—';
        return (
            <Popover width="w-64">
                <div className="space-y-2" data-help-id="bucket.render">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-gray-300">Rendering</span>
                        </div>
                        <span className="font-mono tabular-nums text-[10px] text-cyan-300">
                            {progress.toFixed(1)}%
                        </span>
                    </div>

                    <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                        <div
                            className="h-full bg-cyan-500 transition-all duration-300 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div>
                            <div className="text-[8px] uppercase tracking-wider text-gray-500">Tile</div>
                            <div className="font-mono tabular-nums text-[10px] text-gray-200">{tileLabel}</div>
                        </div>
                        <div>
                            <div className="text-[8px] uppercase tracking-wider text-gray-500">Elapsed</div>
                            <div className="font-mono tabular-nums text-[10px] text-gray-200">{formatTimeWithUnits(elapsed)}</div>
                        </div>
                        <div>
                            <div className="text-[8px] uppercase tracking-wider text-gray-500">ETA</div>
                            <div className="font-mono tabular-nums text-[10px] text-gray-200">{etaLabel}</div>
                        </div>
                    </div>

                    <Button
                        variant="danger"
                        active
                        fullWidth
                        size="small"
                        label="Stop Render"
                        onClick={() => controller.stopBucketRender()}
                    />
                </div>
            </Popover>
        );
    }

    // ─── Setup view ────────────────────────────────────────────────────
    return (
        <Popover width="w-72">
            <div className="relative space-y-2.5" data-help-id="bucket.render">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">High Quality Render</span>
                    {state.previewRegion && supportsPreview && (
                        <button
                            type="button"
                            onClick={() => {
                                controller.clearPreviewRegion?.();
                                state.setPreviewRegion(null);
                                if (state.interactionMode === 'selecting_preview') {
                                    state.setInteractionMode('none');
                                }
                            }}
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-fuchsia-400/60 bg-fuchsia-900/40 text-fuchsia-200 hover:bg-fuchsia-800/50 transition-colors flex items-center gap-1"
                            title="Exit Preview Region (Esc)"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                            Exit Preview
                        </button>
                    )}
                </div>

                {state.previewRegion && supportsPreview && (() => {
                    const r = state.previewRegion;
                    const rW = Math.round((r.maxX - r.minX) * outputWidth);
                    const rH = Math.round((r.maxY - r.minY) * outputHeight);
                    const cap = state.samplesPerBucket;
                    const cappedSamples = Math.min(previewSamples, cap);
                    const atCap = previewSamples >= cap;
                    return (
                        <div className="flex items-center justify-between text-[9px] bg-fuchsia-900/20 border border-fuchsia-400/20 rounded px-2 py-1">
                            <span className="text-fuchsia-300 font-bold">Preview</span>
                            <span className="text-gray-400 font-mono tabular-nums">
                                {outputWidth}×{outputHeight}
                                <span className="text-gray-600 mx-1">·</span>
                                {rW}×{rH}
                            </span>
                            <span className={`font-mono tabular-nums ${atCap ? 'text-green-400' : 'text-cyan-300'}`} title={atCap ? 'Sample cap reached' : `Accumulating (cap ${cap})`}>
                                {cappedSamples}/{cap}
                            </span>
                        </div>
                    );
                })()}

                <div className="flex gap-1.5">
                    <Button
                        size="small"
                        label="Refine"
                        icon={<CheckIcon />}
                        onClick={handleStartRefine}
                        title="Refine viewport (single image, viewport size)"
                    />
                    {supportsPreview && (
                        <Button
                            size="small"
                            active={state.interactionMode === 'selecting_preview' || !!state.previewRegion}
                            label={state.previewRegion
                                ? 'Previewing'
                                : (state.interactionMode === 'selecting_preview' ? 'Pick…' : 'Preview')}
                            icon={<span className="text-[11px] leading-none">⌖</span>}
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
                            title="Preview a canvas section at export resolution (click canvas to pick)"
                        />
                    )}
                    <Button
                        size="small"
                        variant="primary"
                        active
                        label={fileCount > 1 ? `Export ${fileCount}×` : 'Export'}
                        icon={<DownloadIcon />}
                        onClick={handleExport}
                        title={`Render ${fileCount > 1 ? `${fileCount} tile files` : 'and save image'}`}
                    />
                </div>

                <div className="space-y-2.5">
                    <div>
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
                        <Hint text="Lower = higher quality. 0.1% production, 1% fast." />
                    </div>

                    <div>
                        <Slider
                            label="Max Samples / Bucket"
                            value={state.samplesPerBucket}
                            min={16} max={1024} step={16}
                            onChange={state.setSamplesPerBucket}
                            overrideInputText={`${state.samplesPerBucket}`}
                            highlight={state.samplesPerBucket >= 256}
                        />
                        <Hint text="Safety cap. Tiles stop early when converged." />
                    </div>

                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Output Size</SectionLabel>
                            <span className={`font-mono tabular-nums text-[9px] ${vram > 1500 ? 'text-red-400' : vram > 500 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                ~{vram < 1024 ? `${Math.round(vram)} MB` : `${(vram / 1024).toFixed(1)} GB`} / tile
                            </span>
                        </div>

                        <Dropdown
                            label="Preset"
                            value={currentPreset}
                            options={PRESET_DROPDOWN_OPTIONS}
                            onChange={(v) => applyPreset(v as string)}
                            fullWidth
                        />

                        <div className="flex gap-2 mt-2">
                            <NumberInput label="Width"  value={outputWidth}  onChange={setWidth}  step={8} min={64} max={32768} />
                            <NumberInput label="Height" value={outputHeight} onChange={setHeight} step={8} min={64} max={32768} />
                            <div className="w-[35%]">
                                <SectionLabel variant="secondary" className="block mb-0.5">Ratio</SectionLabel>
                                <div className="h-6">
                                    <Dropdown
                                        value={aspectLockValue}
                                        options={ASPECT_DROPDOWN_OPTIONS as any}
                                        onChange={(v) => applyAspectLock(v as AspectRatioValue)}
                                        fullWidth
                                        className="!px-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-1.5 px-1 gap-2">
                            <label className="flex items-center gap-1.5 text-[9px] text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={matchViewportAspect}
                                    onChange={(e) => state.setMatchViewportAspect(e.target.checked)}
                                    className="accent-cyan-500"
                                />
                                Lock to viewport aspect
                            </label>
                            <Button
                                size="small"
                                label="Match Viewport"
                                onClick={matchViewport}
                                title="Set output size to viewport dimensions"
                                className="!flex-none !px-2"
                            />
                        </div>
                    </div>

                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-1">
                            <SectionLabel>Tile Grid</SectionLabel>
                            <span className="font-mono tabular-nums text-[9px] text-gray-500">
                                {fileCount > 1 ? `${fileCount} files · ${tilePixels[0]}×${tilePixels[1]}` : '1 file'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <SectionLabel variant="secondary" className="shrink-0">Columns</SectionLabel>
                            <NumberInput value={tileCols} onChange={state.setTileCols} step={1} min={1} max={32} />
                            <span className="text-[10px] text-gray-500">×</span>
                            <SectionLabel variant="secondary" className="shrink-0">Rows</SectionLabel>
                            <NumberInput value={tileRows} onChange={state.setTileRows} step={1} min={1} max={32} />
                        </div>
                        {showBloomSeamWarning && (
                            <p className="text-[8px] text-amber-400/80 mt-1.5 px-1">
                                ⚠ Bloom and chromatic aberration may seam at tile boundaries — disable in Lighting / Post for seamless stitching.
                            </p>
                        )}
                    </div>

                    <div className="pt-1">
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
                        <Hint text="Smaller = less memory, larger = faster per-bucket cost." />
                    </div>
                </div>
            </div>
        </Popover>
    );
};

export default BucketRenderPanel;
