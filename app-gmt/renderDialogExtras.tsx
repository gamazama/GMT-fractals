// app-gmt's extras for the @engine/render-dialog plugin: multi-pass
// selectors, depth-pass range, internal-scale (SSAA), Firefox H.264
// warning, and the "Viewport Sample / Est. Total" estimator. The
// plugin owns everything else — form scaffolding, progress, ETA,
// stop/resume/finish-early, capability check, disk-mode probe.

import React, { useEffect, useState } from 'react';
import Slider, { DraggableNumber } from '../components/Slider';
import { useEngineStore } from '../store/engineStore';
import { getProxy } from '../engine-gmt/engine/worker/WorkerProxy';
import { VIDEO_FORMATS } from '../data/constants';
import { canEncodeFormat } from '../engine/export/videoEncoder';
import { formatDurationMs, formatTimeWithUnits } from '../components/timeline/exportHelpers';
import type {
    RenderDialogExtraFieldsProps,
    RenderDialogConfig,
    RenderDialogResolutionPreset,
    RenderDialogStartContext,
} from '../engine/plugins/RenderDialog';
import type { AppGmtExtra } from '../engine-gmt/components/timeline/RenderPopup/exportRunner';

const engineProxy = getProxy();

export const APP_GMT_DEFAULT_EXTRA: AppGmtExtra = {
    internalScale: 1.0,
    exportBeauty:  true,
    exportAlpha:   false,
    exportDepth:   false,
    depthMin:      0,
    depthMax:      5,
};

// Reactive preset provider — recomputed on every form render so the
// "Viewport (WxH)" entry tracks fixedResolution mode and "Screen
// (WxH)" tracks current window dimensions.
export const appGmtResolutionPresets = (): RenderDialogResolutionPreset[] => {
    const state = useEngineStore.getState();
    const presets: RenderDialogResolutionPreset[] = [];
    if (state.resolutionMode === 'Fixed') {
        const [w, h] = state.fixedResolution;
        presets.push({ label: 'Viewport', w, h });
    }
    presets.push({ label: 'Screen', w: window.innerWidth, h: window.innerHeight });
    presets.push(
        { label: '720p HD (16:9)',         w: 1280, h: 720  },
        { label: '1080p FHD (16:9)',       w: 1920, h: 1080 },
        { label: '1440p QHD (16:9)',       w: 2560, h: 1440 },
        { label: '4K UHD (16:9)',          w: 3840, h: 2160 },
        { label: 'Square 1:1 (Insta)',     w: 1080, h: 1080 },
        { label: 'Portrait 4:5 (Insta)',   w: 1080, h: 1350 },
        { label: 'Vertical 9:16 (TikTok)', w: 1080, h: 1920 },
    );
    return presets;
};

// Start-button label: image-sequence requires the directory picker,
// so the label changes between RAM/disk modes AND between video and
// image-sequence formats.
export const appGmtStartLabel = ({ cfg, isDiskMode }: RenderDialogStartContext<AppGmtExtra>): string => {
    const fmt = VIDEO_FORMATS[cfg.formatIndex];
    if (fmt.imageSequence) {
        return isDiskMode ? 'Select Output Folder…' : 'Image Sequence Requires Chrome';
    }
    return isDiskMode ? 'Select Output File…' : 'Start RAM Render';
};

// Disable start when no passes are selected, or when image-sequence
// is picked on a browser without the FSA directory picker.
export const appGmtIsStartDisabled = ({ cfg, extra, isDiskMode }: RenderDialogStartContext<AppGmtExtra>): boolean => {
    const fmt = VIDEO_FORMATS[cfg.formatIndex];
    const noPasses = !extra.exportBeauty && !extra.exportAlpha && !extra.exportDepth;
    if (noPasses) return true;
    if (fmt.imageSequence && !isDiskMode) return true;
    return false;
};

// Capability probe — image-sequence formats are encoded inside the
// GMT worker (PNG / JPG via OffscreenCanvas), so the main-thread
// encoder's blanket "image sequences not supported" reject doesn't
// apply here. Pass image-sequence formats through (the FSA gate is
// surfaced by the start-button label / disable instead) and delegate
// the rest to the standard probe.
export const appGmtCanEncode = async (
    formatIndex: number,
    width:       number,
    height:      number,
    bitrateMbps: number,
): Promise<{ ok: boolean; reason?: string }> => {
    const fmt = VIDEO_FORMATS[formatIndex];
    if (fmt?.imageSequence) return { ok: true };
    return canEncodeFormat(formatIndex, width, height, bitrateMbps);
};

// ─── Firefox H.264 cap warning ────────────────────────────────────
const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

export const AppGmtExtraWarning: React.FC<{ cfg: RenderDialogConfig; extra: AppGmtExtra }> = ({ cfg }) => {
    const fmt = VIDEO_FORMATS[cfg.formatIndex];
    // Firefox uses Cisco's OpenH264 binary for AVC, capped at H.264
    // Level 4.0 (~31 Mbps MaxBR for High profile) regardless of the
    // level we request. The encoder uses bitrate * 2.5e6, so the slider
    // trips it above ~12.
    const tripped = isFirefox && fmt.codec === 'avc' && cfg.bitrate > 12;
    if (!tripped) return null;
    return (
        <div className="mx-1 mb-2 px-2 py-1 text-[9px] text-amber-400/90 leading-tight bg-amber-900/20 border border-amber-500/30 rounded">
            Firefox caps H.264 output at ~31 Mbps regardless of this setting.
        </div>
    );
};

// ─── Extra form fields: passes / depth range / internal scale /
//     viewport-sample estimator. Also runs the lifecycle effects
//     (setPreviewSampleCap + adaptive-suppression) for the dialog.
export const AppGmtExtraFormFields: React.FC<RenderDialogExtraFieldsProps<AppGmtExtra>> = ({
    cfg, extra, patchExtra, isDiskMode,
}) => {
    // Track viewport accumulation so the user can see what one frame
    // costs at the chosen sample cap before committing to a render.
    const [frameStats, setFrameStats] = useState({ duration: 0, progress: 0 });

    // Engine-side side-effects: keep the live preview's TSAA cap in
    // sync with the form's "Samples / Frame" so the estimator below
    // reflects the cost of the chosen quality.
    useEffect(() => {
        engineProxy.setPreviewSampleCap(cfg.samplesPerFrame);
        return () => { engineProxy.setPreviewSampleCap(0); };
    }, [cfg.samplesPerFrame]);

    // Adaptive resolution would otherwise drop quality during the
    // render; suppress while the dialog is mounted.
    useEffect(() => {
        useEngineStore.getState().setAdaptiveSuppressed(true);
        return () => { useEngineStore.getState().setAdaptiveSuppressed(false); };
    }, []);

    // Poll accumulationCount → frameStats. Detects restart by counting
    // backwards. Stops tracking once `cfg.samplesPerFrame` is reached.
    useEffect(() => {
        let sampleStartTime = Date.now();
        let lastCount       = 0;
        let measuredDur     = 0;
        const id = setInterval(() => {
            const count = engineProxy.accumulationCount;
            const progress = Math.min(1.0, count / cfg.samplesPerFrame);
            if (count < lastCount) { sampleStartTime = Date.now(); measuredDur = 0; }
            if (count >= cfg.samplesPerFrame && measuredDur === 0) {
                measuredDur = Date.now() - sampleStartTime;
            }
            lastCount = count;
            setFrameStats({ duration: measuredDur, progress });
        }, 30);
        return () => clearInterval(id);
    }, [cfg.samplesPerFrame]);

    // Estimated total — viewport sample × resolution-pixel ratio × frame count.
    const totalFrames = Math.floor((cfg.endFrame - cfg.startFrame) / Math.max(1, cfg.frameStep)) + 1;
    const estTotalSeconds = (() => {
        if (!frameStats.duration) return 0;
        const state = useEngineStore.getState();
        const [vw, vh] = state.canvasPixelSize ?? [1, 1];
        const viewportPixels = vw * vh;
        const targetPixels   = (cfg.width * extra.internalScale) * (cfg.height * extra.internalScale);
        const multiplier     = viewportPixels > 0 ? targetPixels / viewportPixels : 1;
        return (frameStats.duration / 1000) * multiplier * totalFrames;
    })();

    const fmt = VIDEO_FORMATS[cfg.formatIndex];
    const showImageSeqHint = fmt.imageSequence && !isDiskMode;
    const passCount = (extra.exportBeauty ? 1 : 0) + (extra.exportAlpha ? 1 : 0) + (extra.exportDepth ? 1 : 0);

    return (
        <div className="space-y-1">
            {/* Passes selector */}
            <div className="px-1 mb-1.5">
                <label className="t-label mb-0.5 block">Passes</label>
                <div className="flex gap-3 items-center">
                    <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" checked={extra.exportBeauty}
                               onChange={(e) => patchExtra({ exportBeauty: e.target.checked })}
                               className="accent-cyan-400" />
                        Beauty
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" checked={extra.exportAlpha}
                               onChange={(e) => patchExtra({ exportAlpha: e.target.checked })}
                               className="accent-cyan-400" />
                        Alpha
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" checked={extra.exportDepth}
                               onChange={(e) => patchExtra({ exportDepth: e.target.checked })}
                               className="accent-cyan-400" />
                        Depth
                    </label>
                </div>
                {passCount > 1 && (
                    <div className="text-[8px] text-gray-500 mt-0.5 leading-tight">
                        One file per pass, named {'{project}'}_{'{pass}'}_v{'{n}'}.{fmt.ext}
                    </div>
                )}

                {/* Depth-range fields surface only when depth pass is selected */}
                {extra.exportDepth && (
                    <div className="mt-1.5 pt-1 border-t border-white/5">
                        <div className="flex items-center justify-between mb-0.5">
                            <label className="t-label">Depth range (world units)</label>
                            <button
                                type="button"
                                onClick={() => {
                                    const atm = (useEngineStore.getState() as any).atmosphere;
                                    if (!atm || !(atm.fogIntensity > 0)) return;
                                    patchExtra({ depthMin: atm.fogNear ?? 0, depthMax: atm.fogFar ?? 5 });
                                }}
                                disabled={!((useEngineStore.getState() as any).atmosphere?.fogIntensity > 0)}
                                className="text-[9px] text-cyan-300 hover:text-cyan-200 disabled:text-gray-600 disabled:cursor-not-allowed underline-offset-2 hover:underline"
                                title="Copy the atmosphere feature's fog start/end into the depth range (only when fog is enabled)."
                            >
                                Use fog range
                            </button>
                        </div>
                        <div className="flex gap-1">
                            <div className="flex-1">
                                <label className="t-label mb-0.5 block">Near</label>
                                <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                    <DraggableNumber
                                        value={extra.depthMin}
                                        onChange={(v) => patchExtra({ depthMin: Math.max(0, Math.min(v, extra.depthMax - 0.001)) })}
                                        step={0.1}
                                        overrideText={extra.depthMin.toFixed(2)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="t-label mb-0.5 block">Far</label>
                                <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                    <DraggableNumber
                                        value={extra.depthMax}
                                        onChange={(v) => patchExtra({ depthMax: Math.max(extra.depthMin + 0.001, v) })}
                                        step={0.1}
                                        overrideText={extra.depthMax.toFixed(2)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Internal scale (SSAA) */}
            <Slider
                label="Internal Scale (SSAA)"
                value={extra.internalScale}
                min={1.0} max={2.0} step={0.1}
                onChange={(v) => patchExtra({ internalScale: v })}
                overrideInputText={`${extra.internalScale}x`}
                highlight={extra.internalScale > 1.0}
            />
            <div className="px-2 text-[8px] text-gray-500 mb-2">
                Use 1.5x or 2.0x for sharper details (Supersampling).
            </div>

            {/* Viewport sample-time estimator. Drives the user's
             *  intuition for "how long will this render take" before
             *  they commit. */}
            <div className="p-1.5 pt-0.5 space-y-1">
                <div className="relative flex justify-between items-center px-2 py-0.5 bg-white/5 rounded border border-white/5 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cyan-500/10 origin-left transition-transform duration-75 ease-linear pointer-events-none"
                        style={{ transform: `scaleX(${frameStats.progress})` }}
                    />
                    <span className="t-label-sm relative z-10 text-gray-400">Viewport Sample</span>
                    <span className={`text-[10px] font-mono font-bold relative z-10 ${frameStats.duration > 0 ? 'text-green-400' : 'text-gray-500 animate-pulse'}`}>
                        {frameStats.duration > 0 ? formatDurationMs(frameStats.duration) : 'Estimating...'}
                    </span>
                </div>
                {frameStats.duration > 0 && (
                    <div className="flex flex-col gap-1 px-1 bg-white/5 rounded border border-white/5 p-2">
                        <div className="flex justify-between items-center t-label-sm">
                            <span>Est. Total</span>
                            <span className="font-mono text-cyan-300">{formatTimeWithUnits(estTotalSeconds)}</span>
                        </div>
                        <p className="text-[8px] text-gray-500 italic leading-tight">
                            Calculated based on target resolution pixels vs current viewport.
                        </p>
                    </div>
                )}
                {showImageSeqHint && (
                    <div className="px-2 py-1 mb-1 bg-amber-900/20 border border-amber-500/30 rounded text-[9px] text-amber-400/90 leading-tight">
                        Image sequences need the File System Access API (directory picker), available in Chrome / Edge.
                    </div>
                )}
            </div>
        </div>
    );
};
