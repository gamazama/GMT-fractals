
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { engine } from '../../engine/FractalEngine';
import { videoExporter } from '../../engine/VideoExporter';
import { useAnimationStore } from '../../store/animationStore';
import { useFractalStore } from '../../store/fractalStore';
import { VIDEO_FORMATS } from '../../data/constants';
import Slider, { DraggableNumber } from '../Slider';
import Dropdown from '../Dropdown';
import Button from '../Button';
import DraggableWindow from '../DraggableWindow';
import * as THREE from 'three';
import { PlayIcon, StopIcon, CheckIcon, TrashIcon, SaveIcon, AlertIcon } from '../Icons';
import * as Mediabunny from 'mediabunny';

interface RenderPopupProps {
    onClose: () => void;
}

export const RenderPopup: React.FC<RenderPopupProps> = ({ onClose }) => {
    const animStore = useAnimationStore();
    const { resolutionMode, fixedResolution } = useFractalStore();
    
    // Config State
    const [vidRes, setVidRes] = useState<{w:number, h:number}>(() => {
        if (resolutionMode === 'Fixed') {
            return { w: fixedResolution[0], h: fixedResolution[1] };
        }
        return { w: 1280, h: 720 };
    });

    const [formatIndex, setFormatIndex] = useState(0); // Default H.264
    const [vidSamples, setVidSamples] = useState(16);
    const [vidBitrate, setVidBitrate] = useState(12); // Mbps
    const [startFrame, setStartFrame] = useState(0);
    const [endFrame, setEndFrame] = useState(animStore.durationFrames);
    const [frameStep, setFrameStep] = useState(1);
    const [internalScale, setInternalScale] = useState(1.0);
    
    // Render State
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [isRendering, setIsRendering] = useState(false);
    const [isStopping, setIsStopping] = useState(false); 
    
    // Timing Stats
    const startTimeRef = useRef<number>(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [eta, setEta] = useState(0);
    const [avgFrameTime, setAvgFrameTime] = useState(0);
    
    // Preview Stats
    const [frameStats, setFrameStats] = useState({ duration: 0, progress: 0 });
    
    // Environment Capabilities
    const [isDiskMode, setIsDiskMode] = useState(false);
    
    // Compatibility Check
    const [isFormatSupported, setIsFormatSupported] = useState(true);
    
    // Review Mode (RAM)
    const [reviewImage, setReviewImage] = useState<ImageBitmap | null>(null);
    
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Resolution Presets
    const resOptions = [
        ...(resolutionMode === 'Fixed' ? [{ label: `Viewport (${fixedResolution[0]}x${fixedResolution[1]})`, value: `${fixedResolution[0]}x${fixedResolution[1]}` }] : []),
        { label: `Screen (${window.innerWidth}x${window.innerHeight})`, value: `${window.innerWidth}x${window.innerHeight}` },
        { label: '720p HD (16:9)', value: '1280x720' },
        { label: '1080p FHD (16:9)', value: '1920x1080' },
        { label: '1440p QHD (16:9)', value: '2560x1440' },
        { label: '4K UHD (16:9)', value: '3840x2160' },
        { label: 'Square 1:1 (Insta)', value: '1080x1080' },
        { label: 'Portrait 4:5 (Insta)', value: '1080x1350' },
        { label: 'Vertical 9:16 (TikTok/Reels)', value: '1080x1920' },
    ];
    
    // Format Options for Dropdown
    const formatOptions = VIDEO_FORMATS.map((f, i) => ({ label: f.label, value: i }));

    const fps = animStore.fps;
    const currentFormat = VIDEO_FORMATS[formatIndex];

    // --- WINDOW POSITION LOGIC ---
    const BASE_WIDTH = 320;
    const EXPANDED_WIDTH = 640;
    const EXPANSION_DELTA = EXPANDED_WIDTH - BASE_WIDTH;
    const BASE_HEIGHT = 400; 
    
    const [winPos, setWinPos] = useState(() => {
        const controlsWidth = 320; 
        const padding = 20;
        const x = Math.max(20, window.innerWidth - controlsWidth - 320 - padding);
        const y = 80;
        return { x, y };
    });
    
    const [winSize, setWinSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });

    useEffect(() => {
        // Feature Detection: Only Disk Mode if 'showSaveFilePicker' is available (Chromium)
        if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
             setIsDiskMode(true);
        } else {
             setIsDiskMode(false);
        }

        engine.setPreviewSampleCap(vidSamples);
        
        const pollInterval = setInterval(() => {
            if (isRendering) return;
            
            const pipeline = engine.pipeline;
            if (pipeline) {
                const currentDuration = pipeline.getCurrentFrameDuration();
                const currentProgress = Math.min(1.0, pipeline.accumulationCount / vidSamples);
                
                setFrameStats({
                    duration: currentDuration,
                    progress: currentProgress
                });
            }
        }, 30);

        return () => {
            engine.setPreviewSampleCap(0);
            clearInterval(pollInterval);
        };
    }, [vidSamples, isRendering]);

    // Format Support Check
    useEffect(() => {
        const checkSupport = async () => {
            if (typeof VideoEncoder === 'undefined') {
                setIsFormatSupported(false);
                return;
            }

            try {
                const safeWidth = vidRes.w % 2 === 0 ? vidRes.w : vidRes.w - 1;
                const safeHeight = vidRes.h % 2 === 0 ? vidRes.h : vidRes.h - 1;

                // Use Mediabunny's internal check
                const supported = await Mediabunny.canEncodeVideo(currentFormat.codec as any, {
                    width: safeWidth,
                    height: safeHeight,
                    bitrate: vidBitrate * 1_000_000,
                    frameRate: fps
                });
                
                setIsFormatSupported(supported);
            } catch (e) {
                console.warn("Format check failed:", e);
                setIsFormatSupported(false);
            }
        };

        checkSupport();
    }, [formatIndex, vidRes, vidBitrate, fps]);

    const handleVideoExport = async () => {
        console.log("RenderPopup: Initializing export sequence...");
        setReviewImage(null);
        
        const selectedFormat = VIDEO_FORMATS[formatIndex];
        
        // --- STEP 1: OPEN SAVE DIALOG (MUST BE SYNCHRONOUS TO CLICK) ---
        let fileStream: any = null;
        let effectiveDiskMode = isDiskMode;
        
        if (isDiskMode) {
            try {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: `fractal_${vidRes.w}x${vidRes.h}.${selectedFormat.ext}`,
                    types: [{
                        description: selectedFormat.label,
                        accept: { [selectedFormat.mime]: [`.${selectedFormat.ext}`] },
                    }],
                });
                fileStream = await handle.createWritable();
            } catch (err: any) {
                if (err.name === 'AbortError') return; // Cancelled
                
                const isSecurityError = err.name === 'SecurityError' || err.message.includes('not supported') || err.message.includes('not a function');
                if (isSecurityError) {
                    console.warn("RenderPopup: Disk Access blocked. Fallback to RAM.");
                    fileStream = null;
                    effectiveDiskMode = false;
                } else {
                    alert("Could not start export. Error: " + err.message);
                    return;
                }
            }
        }

        // --- STEP 2: SETUP UI & RENDER ---
        setWinPos(p => ({ ...p, x: p.x - EXPANSION_DELTA }));
        setWinSize({ width: EXPANDED_WIDTH, height: BASE_HEIGHT });

        setIsRendering(true);
        setIsStopping(false);
        setProgress(0);
        setElapsedTime(0);
        setEta(0);
        setAvgFrameTime(0);
        setStatusText(effectiveDiskMode ? "Initializing Disk Stream..." : "Initializing RAM Buffer (Fallback)...");
        
        await new Promise(resolve => setTimeout(resolve, 100));

        startTimeRef.current = Date.now();
        const startFrameCurrent = animStore.currentFrame;
        const wasPlaying = animStore.isPlaying;
        const startOffset = { ...engine.sceneOffset };
        const cam = engine.activeCamera;
        const startCamPos = cam ? cam.position.clone() : new THREE.Vector3();
        const startCamQuat = cam ? cam.quaternion.clone() : new THREE.Quaternion();
        const totalFrames = Math.floor((endFrame - startFrame) / frameStep) + 1;

        try {
            await videoExporter.renderSequence({
                width: vidRes.w,
                height: vidRes.h,
                fps: fps,
                samples: vidSamples,
                bitrate: vidBitrate,
                startFrame: startFrame,
                endFrame: endFrame,
                frameStep: frameStep,
                formatIndex: formatIndex,
                internalScale: internalScale
            }, fileStream, (p, info, previewBitmap) => {
                setProgress(p);
                if (info) setStatusText(info);
                
                // Update Timing Stats
                const now = Date.now();
                const elapsed = (now - startTimeRef.current) / 1000;
                setElapsedTime(elapsed);
                
                if (p > 0) {
                    const totalTime = elapsed / (p / 100);
                    setEta(totalTime - elapsed);
                    const framesDone = (p / 100) * totalFrames;
                    if (framesDone >= 1) setAvgFrameTime(elapsed / framesDone);
                }
                
                // Handle Preview
                if (previewBitmap) {
                    if (previewCanvasRef.current) {
                        drawPreviewFrame(previewCanvasRef.current, previewBitmap);
                    }
                    if (!effectiveDiskMode) {
                        setReviewImage(previewBitmap); 
                    } else {
                        previewBitmap.close(); 
                    }
                }
            });
        } catch (e: any) {
            if (e.message !== "Cancelled by user") {
                console.error("RenderPopup: Render sequence failed", e);
                alert(`Render process failed.\n\nError: ${e.message}`);
            }
        } finally {
            videoExporter.restoreState(startFrameCurrent, startOffset, startCamPos, startCamQuat, wasPlaying);
            setIsRendering(false);
            setIsStopping(false);
            engine.setPreviewSampleCap(vidSamples);
            setWinSize({ width: BASE_WIDTH, height: BASE_HEIGHT });
            setWinPos(p => ({ ...p, x: p.x + EXPANSION_DELTA }));
        }
    };

    const handleStopClick = () => { setIsStopping(true); videoExporter.pause(); };
    const handleResume = () => { setIsStopping(false); videoExporter.resume(); };
    const confirmStitch = () => { setStatusText("Stitching..."); videoExporter.finishAndStitch(); videoExporter.resume(); };
    const discardRender = () => { videoExporter.cancel(); videoExporter.resume(); };

    const totalFramesCount = Math.floor((endFrame - startFrame) / frameStep) + 1;
    const estTotalSeconds = frameStats.duration ? (frameStats.duration / 1000) * totalFramesCount : 0;

    const diskModeTooltip = isDiskMode 
        ? "Direct Disk Write (Stream)" 
        : "RAM Buffer: Browser may crash if video exceeds ~2GB. Use Chrome for Disk Mode.";

    return (
        <>
            {isRendering && createPortal(
                <div className="fixed inset-0 z-[105] bg-black/40 backdrop-blur-md animate-fade-in" />,
                document.body
            )}
            <DraggableWindow 
                title="Render Sequence" 
                onClose={onClose}
                position={winPos}
                onPositionChange={setWinPos}
                size={winSize}
                onSizeChange={setWinSize}
                disableClose={isRendering}
                zIndex={110}
            >
                <div className="flex flex-col -m-3 h-[calc(100%+20px)]">
                    {/* Header Info */}
                    <div className="px-3 py-1 bg-black/20 border-b border-white/5 flex justify-between items-center shrink-0">
                        <span className="t-label">{currentFormat.container.toUpperCase()} • {currentFormat.codec.toUpperCase()} • {fps} FPS</span>
                        <div className="flex items-center gap-2">
                             <div 
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded border cursor-help ${isDiskMode ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-amber-900/30 text-amber-400 border-amber-500/30'}`} 
                                title={diskModeTooltip}
                             >
                                {isDiskMode ? "DISK MODE" : "RAM MODE"}
                            </div>
                             {isRendering && <span className="t-label text-cyan-400 animate-pulse">Rendering</span>}
                        </div>
                    </div>

                    <div className="flex flex-1 min-h-0">
                        {/* LEFT PANE: Preview & Stats (Only while rendering) */}
                        {isRendering && (
                            <div className="w-[320px] border-r border-white/10 flex flex-col p-2 bg-black/20 animate-fade-in-left overflow-hidden h-full">
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="aspect-video w-full bg-black rounded border border-gray-700 shadow-lg overflow-hidden relative group shrink-0">
                                        <canvas ref={previewCanvasRef} width={300} height={169} className="w-full h-full object-contain" />
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-mono text-cyan-400 border border-cyan-500/30">PREVIEW</div>
                                    </div>
                                    
                                    <div className="mt-2 space-y-2 flex-1 overflow-y-auto custom-scroll">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-baseline t-label-sm">
                                                <div className="flex gap-2 min-w-0">
                                                    <span>Progress</span>
                                                    <span className="text-[9px] text-gray-400 font-normal normal-case tracking-normal truncate">{statusText}</span>
                                                </div>
                                                <span className="text-cyan-400 font-bold shrink-0">{progress.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-0.5">
                                                <div className="t-label-sm">Elapsed</div>
                                                <div className="t-value">{formatTime(elapsedTime)}</div>
                                            </div>
                                            <div className="space-y-0.5 text-center">
                                                <div className="t-label-sm">Avg Frame</div>
                                                <div className="t-value">{avgFrameTime.toFixed(1)}s</div>
                                            </div>
                                            <div className="space-y-0.5 text-right">
                                                <div className="t-label-sm">Remaining</div>
                                                <div className="t-value text-cyan-300">{formatTime(eta)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RIGHT PANE: Configuration & Actions */}
                        <div className="w-[320px] flex flex-col h-full">
                            <div className={`flex-1 transition-all duration-300 overflow-y-auto custom-scroll ${isRendering ? 'opacity-40 pointer-events-none' : ''}`}>
                                {/* Compact Inputs Section */}
                                <div className="p-1.5 space-y-1">
                                    <Dropdown 
                                        label="Resolution"
                                        value={`${vidRes.w}x${vidRes.h}`}
                                        onChange={(val) => {
                                            const [w, h] = (val as string).split('x').map(Number);
                                            setVidRes({w, h});
                                        }}
                                        options={resOptions}
                                        className="mb-1.5"
                                    />
                                    
                                    <Dropdown
                                        label="Format"
                                        value={formatIndex}
                                        onChange={(v) => setFormatIndex(Number(v))}
                                        options={formatOptions}
                                        className="mb-1.5"
                                    />
                                    
                                    {!isFormatSupported && (
                                        <div className="mx-1 mb-2 p-1.5 bg-red-900/20 border border-red-500/30 rounded flex items-center gap-2 text-[9px] text-red-300">
                                            <AlertIcon />
                                            <span>Format incompatible with browser/GPU.</span>
                                        </div>
                                    )}

                                    <div className="flex gap-1">
                                        <div className="flex-1">
                                            <label className="t-label mb-0.5 block">Start</label>
                                            <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                                <DraggableNumber 
                                                    value={startFrame} 
                                                    onChange={(v) => setStartFrame(Math.max(0, Math.min(Math.round(v), endFrame)))}
                                                    step={1} highlight overrideText={startFrame.toFixed(0)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="t-label mb-0.5 block">End</label>
                                            <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                                <DraggableNumber 
                                                    value={endFrame} 
                                                    onChange={(v) => setEndFrame(Math.max(startFrame, Math.min(Math.round(v), animStore.durationFrames)))}
                                                    step={1} highlight overrideText={endFrame.toFixed(0)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-[0.7]">
                                            <label className="t-label mb-0.5 block">Step</label>
                                            <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                                <DraggableNumber 
                                                    value={frameStep} 
                                                    onChange={(v) => setFrameStep(Math.max(1, Math.round(v)))}
                                                    step={1} min={1} overrideText={frameStep.toFixed(0)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* FLUSH SLIDER - BITRATE */}
                                <Slider 
                                    label="Bitrate (Mbps)" 
                                    value={vidBitrate} 
                                    min={1} max={100} step={1} 
                                    onChange={setVidBitrate}
                                    overrideInputText={`${vidBitrate}`}
                                />

                                {/* FLUSH SLIDER - SAMPLES */}
                                <Slider 
                                    label="Samples (Quality)" 
                                    value={vidSamples} 
                                    min={1} max={64} step={1} 
                                    onChange={setVidSamples}
                                    overrideInputText={vidSamples.toFixed(0)}
                                />

                                {/* INTERNAL SCALE - NEW */}
                                <Slider 
                                    label="Internal Scale (SSAA)" 
                                    value={internalScale} 
                                    min={1.0} max={2.0} step={0.1} 
                                    onChange={setInternalScale}
                                    overrideInputText={`${internalScale}x`}
                                    highlight={internalScale > 1.0}
                                />
                                <div className="px-2 text-[8px] text-gray-500 mb-2">
                                    Use 1.5x or 2.0x for sharper details (Supersampling).
                                </div>
                                
                                {isDiskMode && (
                                    <div className="px-2 py-1 mx-2 mb-1 bg-green-900/10 border border-green-500/20 rounded">
                                        <p className="text-[8px] text-green-400 leading-tight">
                                            Disk Mode Active: You can render unlimited video sizes.
                                        </p>
                                    </div>
                                )}
                                
                                {/* Removed old RAM Mode Warning Div here */}

                                {/* Compact Info Area */}
                                <div className="p-1.5 pt-0.5 space-y-1">
                                    <div className="relative flex justify-between items-center px-2 py-0.5 bg-white/5 rounded border border-white/5 overflow-hidden group">
                                        <div 
                                            className="absolute inset-0 bg-cyan-500/10 origin-left transition-transform duration-75 ease-linear pointer-events-none"
                                            style={{ transform: `scaleX(${frameStats.progress})` }}
                                        />
                                        <span className="t-label-sm relative z-10 text-gray-400">Current Frame</span>
                                        <span className={`text-[10px] font-mono font-bold relative z-10 ${frameStats.duration > 0 ? 'text-green-400' : 'text-gray-500 animate-pulse'}`}>
                                            {frameStats.duration > 0 ? formatDurationMs(frameStats.duration) : "Estimating..."}
                                        </span>
                                    </div>
                                    
                                    {frameStats.duration > 0 && (
                                        <div className="flex justify-between items-center px-1 t-label-sm">
                                            <span>Est. Total</span>
                                            <span className="font-mono">{formatTime(estTotalSeconds)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {reviewImage && !isRendering && (
                                     <div className="p-1.5">
                                         <div className="text-[8px] text-gray-500 font-bold mb-1 uppercase flex justify-between items-center">
                                            <span>RAM Review</span>
                                            <a 
                                                href={URL.createObjectURL(new Blob([new Uint8Array(0)]))} // Placeholder
                                                className="text-cyan-400 hover:text-white"
                                                onClick={(e) => { e.preventDefault(); }}
                                            >
                                                Save
                                            </a>
                                         </div>
                                         <div className="aspect-video w-full bg-black rounded border border-gray-700 overflow-hidden relative">
                                            <img src={URL.createObjectURL(new Blob([new Uint8Array(0)]))} ref={el => {
                                                if (el && reviewImage) {
                                                    const ctx = document.createElement('canvas');
                                                    ctx.width = reviewImage.width; ctx.height = reviewImage.height;
                                                    ctx.getContext('2d')?.drawImage(reviewImage, 0, 0);
                                                    el.src = ctx.toDataURL();
                                                }
                                            }} className="w-full h-full object-contain" />
                                         </div>
                                     </div>
                                )}
                            </div>

                            {/* Action Buttons Section */}
                            <div className="p-1.5 bg-gray-900/50 border-t border-white/10 shrink-0">
                                {!isRendering ? (
                                    <Button 
                                        onClick={handleVideoExport}
                                        label={isDiskMode ? "Select Output File..." : "Start RAM Render"}
                                        variant="primary"
                                        fullWidth
                                        disabled={!isFormatSupported}
                                        icon={isDiskMode ? <SaveIcon /> : <PlayIcon />}
                                    />
                                ) : (
                                    <>
                                        {!isStopping ? (
                                            <Button 
                                                onClick={handleStopClick}
                                                label="Interrupt Render"
                                                variant="danger"
                                                icon={<StopIcon />}
                                                fullWidth
                                            />
                                        ) : (
                                            <div className="grid grid-cols-3 gap-1 animate-fade-in">
                                                <Button onClick={handleResume} label="Resume" variant="primary" icon={<PlayIcon />} />
                                                <Button onClick={confirmStitch} label="Stitch" variant="success" icon={<CheckIcon />} />
                                                <Button onClick={discardRender} label="Discard" variant="danger" icon={<TrashIcon />} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DraggableWindow>
        </>
    );
};

// --- Helpers moved out of main component to reduce size ---

const formatTime = (secs: number) => {
    if (!isFinite(secs) || secs < 0) return "--:--";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatDurationMs = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    const secs = ms / 1000;
    if (secs < 60) return `${secs.toFixed(1)}s`;
    return formatTime(secs);
};

// Helper to draw the preview image onto the canvas maintaining aspect ratio
const drawPreviewFrame = (canvas: HTMLCanvasElement, bitmap: ImageBitmap) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const aspect = bitmap.width / bitmap.height;
    let drawW = canvas.width;
    let drawH = canvas.width / aspect;
    let drawX = 0;
    let drawY = (canvas.height - drawH) / 2;
    
    if (drawH > canvas.height) {
        drawH = canvas.height;
        drawW = canvas.height * aspect;
        drawY = 0;
        drawX = (canvas.width - drawW) / 2;
    }
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, drawX, drawY, drawW, drawH);
};
