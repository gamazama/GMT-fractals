
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { engine } from '../../engine/FractalEngine';
// Removed circular import of videoExporter
import { useAnimationStore } from '../../store/animationStore';
import { useFractalStore } from '../../store/fractalStore';
import { VIDEO_FORMATS } from '../../data/constants';
import Slider, { DraggableNumber } from '../Slider';
import Dropdown from '../Dropdown';
import Button from '../Button';
import DraggableWindow from '../DraggableWindow';
import * as THREE from 'three';
import { PlayIcon, StopIcon, CheckIcon, TrashIcon, SaveIcon, AlertIcon, InfoIcon } from '../Icons';
import * as Mediabunny from 'mediabunny';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { VIDEO_CONFIG } from '../../data/constants';

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
    const [etaRange, setEtaRange] = useState({ min: 0, max: 0 }); // New Range
    const [lastFrameTime, setLastFrameTime] = useState(0); 
    
    // Preview Stats (From Pipeline)
    const [frameStats, setFrameStats] = useState({ duration: 0, progress: 0 });
    
    // Environment Capabilities
    const [isDiskMode, setIsDiskMode] = useState(false);
    
    // Compatibility Check
    const [isFormatSupported, setIsFormatSupported] = useState(true);
    
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
    const EXPANDED_WIDTH = 400; // Wider for stats
    const BASE_HEIGHT = 450; 
    
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

    // Listen for progress updates
    useEffect(() => {
        const totalFrames = Math.floor((endFrame - startFrame) / frameStep) + 1;
        let lastFrameEnd = Date.now();

        const unsub = FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, (data) => {
             // Re-purposing Bucket Status event for Export Progress since they share UI needs
             if (!data.isRendering) {
                 setIsRendering(false);
                 setWinSize({ width: BASE_WIDTH, height: BASE_HEIGHT });
                 return;
             }
             
             setProgress(data.progress);
             
             // Update Timing Stats
             const now = Date.now();
             const elapsed = (now - startTimeRef.current) / 1000;
             setElapsedTime(elapsed);
             
             if (data.progress > 0) {
                 // Avg calculation
                 const framesDone = (data.progress / 100) * totalFrames;
                 // If framesDone changed significantly, update frame time
                 if (framesDone >= 1 && framesDone % 1 < 0.1) { // roughly every frame
                     const thisFrameTime = (now - lastFrameEnd) / 1000;
                     setLastFrameTime(thisFrameTime);
                     lastFrameEnd = now;
                 }

                 const avgTime = elapsed / framesDone;
                 const remainingFrames = totalFrames - framesDone;
                 
                 const etaAvg = remainingFrames * avgTime;
                 
                 // Smoothing
                 setEtaRange(prev => ({ 
                     min: etaAvg * 0.9, 
                     max: etaAvg * 1.1 
                 }));
             }
        });
        
        return unsub;
    }, [startFrame, endFrame, frameStep]);

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
        setWinSize({ width: EXPANDED_WIDTH, height: BASE_HEIGHT });

        setIsRendering(true);
        setIsStopping(false);
        setProgress(0);
        setElapsedTime(0);
        setEtaRange({ min: 0, max: 0 });
        setLastFrameTime(0);
        setStatusText(effectiveDiskMode ? "Exporting to Disk..." : "Exporting to RAM...");
        
        await new Promise(resolve => setTimeout(resolve, 100));

        startTimeRef.current = Date.now();
        
        try {
            // Use engine.videoExporter instance
            engine.videoExporter.start({
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
            }, fileStream);
            
            // The tick loop in FractalEngine will now drive the export
            
        } catch (e: any) {
            if (e.message !== "Cancelled by user") {
                console.error("RenderPopup: Render sequence failed", e);
                alert(`Render process failed.\n\nError: ${e.message}`);
                setIsRendering(false);
            }
        }
    };

    const handleStopClick = () => { setIsStopping(true); engine.videoExporter.pause(); };
    const handleResume = () => { setIsStopping(false); engine.videoExporter.resume(); };
    const confirmStitch = () => { setStatusText("Stitching..."); engine.videoExporter.finishAndStitch(); engine.videoExporter.resume(); };
    const discardRender = () => { engine.videoExporter.cancel(); engine.videoExporter.resume(); setIsRendering(false); };

    const totalFramesCount = Math.floor((endFrame - startFrame) / frameStep) + 1;
    
    // Improved Est. Total Logic
    const calculateEstimatedTotal = () => {
        if (!frameStats.duration) return 0;
        
        let multiplier = 1.0;
        if (engine.renderer) {
             const canvas = engine.renderer.domElement;
             const viewportPixels = canvas.width * canvas.height;
             const targetW = vidRes.w * internalScale;
             const targetH = vidRes.h * internalScale;
             const targetPixels = targetW * targetH;
             
             if (viewportPixels > 0) {
                 multiplier = targetPixels / viewportPixels;
             }
        }
        
        const singleFrameEst = (frameStats.duration / 1000) * multiplier;
        return singleFrameEst * totalFramesCount;
    };
    
    const estTotalSeconds = calculateEstimatedTotal();

    const diskModeTooltip = isDiskMode 
        ? "Direct Disk Write (Stream)" 
        : "RAM Buffer: Browser may crash if video exceeds ~2GB. Use Chrome for Disk Mode.";

    // Render Progress Mode UI
    if (isRendering) {
        return (
            <DraggableWindow 
                title="Rendering..." 
                onClose={onClose}
                position={winPos}
                onPositionChange={setWinPos}
                size={winSize}
                onSizeChange={setWinSize}
                disableClose={true}
                zIndex={600}
            >
                <div className="flex flex-col h-full space-y-4 p-2">
                    
                    {/* 1. Progress Bar & Status */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline t-label-sm">
                            <span className="text-cyan-300 font-bold">{progress.toFixed(1)}%</span>
                            <span className="text-[9px] text-gray-400 font-normal truncate max-w-[200px]">{statusText}</span>
                        </div>
                        <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-white/10">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 ease-out relative" 
                                style={{ width: `${progress}%` }} 
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Timing Grid */}
                    <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded border border-white/5">
                        <div className="flex flex-col">
                            <span className="t-label-sm text-gray-500 mb-0.5">Elapsed</span>
                            <span className="font-mono text-sm font-bold text-white">{formatTimeWithUnits(elapsedTime)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                             <span className="t-label-sm text-gray-500 mb-0.5">Remaining</span>
                             <span className="font-mono text-sm font-bold text-cyan-300">
                                 {formatTimeWithUnits(etaRange.min)} - {formatTimeWithUnits(etaRange.max)}
                             </span>
                        </div>
                        
                        <div className="flex flex-col pt-2 border-t border-white/5">
                            <span className="t-label-sm text-gray-500 mb-0.5">Last Frame</span>
                            <span className={`font-mono text-xs ${lastFrameTime > 2.0 ? 'text-amber-400' : 'text-gray-300'}`}>
                                {lastFrameTime.toFixed(2)}s
                            </span>
                        </div>
                        <div className="flex flex-col text-right pt-2 border-t border-white/5">
                             <span className="t-label-sm text-gray-500 mb-0.5">Est. Total</span>
                             <span className="font-mono text-xs text-gray-300">
                                 {elapsedTime > 0 && progress > 0 
                                    ? formatTimeWithUnits(elapsedTime / (progress/100))
                                    : '--'
                                 }
                             </span>
                        </div>
                    </div>

                    {/* 3. Settings Summary */}
                    <div className="text-[9px] text-gray-500 grid grid-cols-2 gap-y-1 border-t border-white/5 pt-3">
                        <span>Resolution: <span className="text-gray-300">{vidRes.w}x{vidRes.h}</span></span>
                        <span>Format: <span className="text-gray-300">{currentFormat.label.split(' ')[0]}</span></span>
                        <span>Scale: <span className="text-gray-300">{internalScale}x</span></span>
                        <span>Samples: <span className="text-gray-300">{vidSamples}</span></span>
                    </div>

                    {/* 4. Controls */}
                    <div className="mt-auto pt-2">
                        {!isStopping ? (
                            <Button 
                                onClick={handleStopClick}
                                label="Interrupt Render"
                                variant="danger"
                                icon={<StopIcon />}
                                fullWidth
                            />
                        ) : (
                            <div className="grid grid-cols-3 gap-2 animate-fade-in">
                                <Button onClick={handleResume} label="Resume" variant="primary" icon={<PlayIcon />} />
                                <Button onClick={confirmStitch} label="Finish" variant="success" icon={<CheckIcon />} />
                                <Button onClick={discardRender} label="Discard" variant="danger" icon={<TrashIcon />} />
                            </div>
                        )}
                    </div>
                </div>
            </DraggableWindow>
        );
    }

    // Config Mode UI (unchanged logic, just ensuring consistency)
    return (
        <DraggableWindow 
            title="Render Sequence" 
            onClose={onClose}
            position={winPos}
            onPositionChange={setWinPos}
            size={winSize}
            onSizeChange={setWinSize}
            disableClose={false}
            zIndex={600}
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
                    </div>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* CONFIG PANE */}
                    <div className="w-full flex flex-col h-full">
                        <div className={`flex-1 transition-all duration-300 overflow-y-auto custom-scroll`}>

                            {/* SETTINGS FORM */}
                            <div className={`p-1.5 space-y-1`}>
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
                            
                                {/* Compact Info Area */}
                                <div className="p-1.5 pt-0.5 space-y-1">
                                    <div className="relative flex justify-between items-center px-2 py-0.5 bg-white/5 rounded border border-white/5 overflow-hidden group">
                                        <div 
                                            className="absolute inset-0 bg-cyan-500/10 origin-left transition-transform duration-75 ease-linear pointer-events-none"
                                            style={{ transform: `scaleX(${frameStats.progress})` }}
                                        />
                                        <span className="t-label-sm relative z-10 text-gray-400">Viewport Sample</span>
                                        <span className={`text-[10px] font-mono font-bold relative z-10 ${frameStats.duration > 0 ? 'text-green-400' : 'text-gray-500 animate-pulse'}`}>
                                            {frameStats.duration > 0 ? formatDurationMs(frameStats.duration) : "Estimating..."}
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
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons Section */}
                        <div className="p-1.5 bg-gray-900/50 border-t border-white/10 shrink-0">
                            <Button 
                                onClick={handleVideoExport}
                                label={isDiskMode ? "Select Output File..." : "Start RAM Render"}
                                variant="primary"
                                fullWidth
                                disabled={!isFormatSupported}
                                icon={isDiskMode ? <SaveIcon /> : <PlayIcon />}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

// --- Helpers moved out of main component to reduce size ---

const formatTimeWithUnits = (secs: number) => {
    if (!isFinite(secs) || secs < 0) return "--";
    
    if (secs < 60) return `${secs.toFixed(0)}s`;
    
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    
    if (m < 60) return `${m}m ${s}s`;
    
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
};

const formatDurationMs = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    const secs = ms / 1000;
    if (secs < 60) return `${secs.toFixed(1)}s`;
    return formatTimeWithUnits(secs);
};
