
import React, { useState, useRef, useEffect } from 'react';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { useAnimationStore } from '../../store/animationStore';
import { useFractalStore, getCanvasPhysicalPixelSize } from '../../store/fractalStore';
import { VIDEO_FORMATS } from '../../data/constants';
import Slider, { DraggableNumber } from '../Slider';
import Dropdown from '../Dropdown';
import Button from '../Button';
import DraggableWindow from '../DraggableWindow';
import * as THREE from 'three';
import { PlayIcon, StopIcon, CheckIcon, TrashIcon, SaveIcon, AlertIcon } from '../Icons';
import * as Mediabunny from 'mediabunny';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { VIDEO_CONFIG } from '../../data/constants';
import { animationEngine } from '../../engine/AnimationEngine';
import { modulationEngine } from '../../features/modulation/ModulationEngine';
import { getViewportCamera } from '../../engine/worker/ViewportRefs';
import type { SerializedCamera, SerializedOffset } from '../../engine/worker/WorkerProtocol';
import type { EngineRenderState } from '../../engine/FractalEngine';
import type { ExportPass, VideoExportConfig } from '../../engine/codec/VideoExportTypes';
import { applyExportModulations } from './exportModulations';
import { formatTimeWithUnits, formatDurationMs } from './exportHelpers';
import { getExportFileName } from '../../utils/fileUtils';

/** Calculate ETA range from elapsed time and frames completed. */
const calcEtaRange = (elapsedSec: number, framesDone: number, totalFrames: number) => {
    if (framesDone <= 0) return { min: 0, max: 0 };
    const eta = (totalFrames - framesDone) * (elapsedSec / framesDone);
    return { min: eta * 0.9, max: eta * 1.1 };
};

interface RenderPopupProps {
    onClose: () => void;
}

export const RenderPopup: React.FC<RenderPopupProps> = ({ onClose }) => {
    const animStore = useAnimationStore();
    // Full-store subscription — re-render on canvasPixelSize changes so the render-time
    // estimator stays fresh. Actual canvas size is read via getCanvasPhysicalPixelSize below.
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
    const [vidBitrate, setVidBitrate] = useState(VIDEO_CONFIG.DEFAULT_BITRATE); // Mbps

    // Calculate recommended bitrate based on resolution
    // Base: 40 Mbps for 1080p, scale linearly with pixel count
    const calculateBitrate = (w: number, h: number): number => {
        const pixels1080p = 1920 * 1080;
        const targetPixels = w * h;
        const baseBitrate = 40; // Mbps for 1080p
        return Math.round(baseBitrate * (targetPixels / pixels1080p));
    };

    // Update bitrate when resolution changes
    useEffect(() => {
        const recommendedBitrate = calculateBitrate(vidRes.w, vidRes.h);
        setVidBitrate(recommendedBitrate);
    }, [vidRes]);
    const [startFrame, setStartFrame] = useState(0);
    const [endFrame, setEndFrame] = useState(animStore.durationFrames);
    const [frameStep, setFrameStep] = useState(1);
    const [internalScale, setInternalScale] = useState(1.0);

    // Multi-pass export: at least one must be selected. Each enabled pass produces a
    // separate output file with a `_{pass}` suffix. Alpha and depth write greyscale
    // luminance (same value in R/G/B) so they're legible in any player/container.
    const [exportBeauty, setExportBeauty] = useState(true);
    const [exportAlpha, setExportAlpha] = useState(false);
    const [exportDepth, setExportDepth] = useState(false);
    // Depth-pass normalization range (world units). Defaults to 0..5 which matches the
    // atmosphere feature's default fog start/end. Only visible when depth pass is enabled.
    const [depthMin, setDepthMin] = useState(0);
    const [depthMax, setDepthMax] = useState(5);
    
    // Render State
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [isRendering, setIsRendering] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const stoppingRef = useRef(false);
    const cancelledRef = useRef(false);
    const finishEarlyRef = useRef(false);
    
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

    // Firefox uses Cisco's OpenH264 binary for AVC encoding, which is built with an
    // H.264 Level 4.0 cap (≈31 Mbps MaxBR for High profile) regardless of the level we
    // request. The cap is upstream of WebCodecs — no JS knob bypasses it. The encoder
    // request is `bitrate * 2.5e6` (see WorkerExporter), so the slider trips it above ~12.
    const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
    const isFirefoxH264BitrateCapped = isFirefox && currentFormat.codec === 'avc' && vidBitrate > 12;

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

    // Suppress adaptive resolution while the render panel is open
    useEffect(() => {
        useFractalStore.getState().setAdaptiveSuppressed(true);
        return () => { useFractalStore.getState().setAdaptiveSuppressed(false); };
    }, []);

    useEffect(() => {
        // Feature Detection: Only Disk Mode if 'showSaveFilePicker' is available (Chromium)
        if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
             setIsDiskMode(true);
        } else {
             setIsDiskMode(false);
        }

        engine.setPreviewSampleCap(vidSamples);

        let sampleStartTime = Date.now();
        let lastCount = 0;
        let measuredDuration = 0;

        const pollInterval = setInterval(() => {
            if (isRendering) return;

            const count = engine.accumulationCount;
            const currentProgress = Math.min(1.0, count / vidSamples);

            // Detect accumulation restart (count dropped)
            if (count < lastCount) {
                sampleStartTime = Date.now();
                measuredDuration = 0;
            }

            // Measure when target reached
            if (count >= vidSamples && measuredDuration === 0) {
                measuredDuration = Date.now() - sampleStartTime;
            }

            lastCount = count;
            setFrameStats({ duration: measuredDuration, progress: currentProgress });
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

                 setEtaRange(calcEtaRange(elapsed, framesDone, totalFrames));
             }
        });
        
        return unsub;
    }, [startFrame, endFrame, frameStep]);

    // Format Support Check
    useEffect(() => {
        const checkSupport = async () => {
            // Image sequences don't go through WebCodecs — they encode PNG/JPG in the worker
            // via OffscreenCanvas.convertToBlob. The capability gate is the File System Access
            // API (directory picker), which is Chromium-only; UI surfaces that check separately.
            if (currentFormat.imageSequence) {
                setIsFormatSupported(true);
                return;
            }

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
                    bitrate: vidBitrate * 1_000_000
                });

                setIsFormatSupported(supported);
            } catch (e) {
                console.warn("Format check failed:", e);
                setIsFormatSupported(false);
            }
        };

        checkSupport();
    }, [formatIndex, vidRes, vidBitrate, fps]);

    /**
     * Per-frame export pump — shared by the video multi-pass path and the image-sequence path.
     *
     * For every frame in [0, totalFrames):
     *   1. Honour the pause/cancel/finish-early flags.
     *   2. Scrub the animation and apply modulations for this timeline frame.
     *   3. Serialize camera + offset + render-state snapshots and send them to the worker via
     *      `engine.renderExportFrame`. The worker renders + accumulates + encodes (or writes
     *      image files) and replies with `measuredDistance` for focus-lock.
     *   4. (Optional) update `optics.dofFocus` from the measured distance.
     *   5. Push progress / elapsed / ETA / last-frame-time into UI state + emit BUCKET_STATUS.
     *
     * Returns a string tag describing how the loop exited — the caller decides whether to
     * call `finishExport` or `cancelExport`.
     */
    const runFramePump = async (
        config: VideoExportConfig,
        totalFrames: number,
        applyFocusLock: boolean
    ): Promise<'completed' | 'cancelled' | 'finishEarly'> => {
        for (let i = 0; i < totalFrames; i++) {
            if (cancelledRef.current) return 'cancelled';
            if (finishEarlyRef.current) return 'finishEarly';
            while (stoppingRef.current && !cancelledRef.current && !finishEarlyRef.current) {
                await new Promise(r => setTimeout(r, 100));
            }
            if (cancelledRef.current) return 'cancelled';
            if (finishEarlyRef.current) return 'finishEarly';

            const timelineFrame = startFrame + (i * frameStep);
            const time = timelineFrame / fps;

            animationEngine.scrub(timelineFrame);
            applyExportModulations(time, 1.0 / fps);

            const cam = getViewportCamera() as THREE.PerspectiveCamera | null;
            const storeState = useFractalStore.getState();

            const serializedCamera: SerializedCamera = cam ? {
                position: [cam.position.x, cam.position.y, cam.position.z],
                quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
                fov: cam.fov || 60,
                aspect: config.width / config.height
            } : {
                position: [0, 0, 0],
                quaternion: [0, 0, 0, 1],
                fov: (storeState as any).optics?.camFov ?? 60,
                aspect: config.width / config.height
            };

            const so = storeState.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
            const serializedOffset: SerializedOffset = {
                x: so.x, y: so.y, z: so.z,
                xL: so.xL ?? 0, yL: so.yL ?? 0, zL: so.zL ?? 0
            };

            const renderState: Partial<EngineRenderState> = {
                cameraMode: storeState.cameraMode,
                isCameraInteracting: false,
                optics: (storeState as any).optics ?? null,
                lighting: (storeState as any).lighting ?? null,
                quality: (storeState as any).quality ?? null,
                geometry: (storeState as any).geometry ?? null,
            };

            const frameResult = await engine.renderExportFrame(
                i, time, serializedCamera, serializedOffset, renderState,
                { ...engine.modulations }
            );

            if (applyFocusLock) {
                const fStore = useFractalStore.getState();
                if (fStore.focusLock && frameResult.measuredDistance > 0 && frameResult.measuredDistance < 1000) {
                    const currentFocus = (fStore as any).optics?.dofFocus ?? 0;
                    const relChange = Math.abs(frameResult.measuredDistance - currentFocus) / Math.max(currentFocus, 0.0001);
                    if (relChange > 0.01) {
                        (fStore as any).setOptics({ dofFocus: frameResult.measuredDistance });
                    }
                }
            }

            const pct = ((i + 1) / totalFrames) * 100;
            setProgress(pct);

            const now = Date.now();
            const elapsed = (now - startTimeRef.current) / 1000;
            setElapsedTime(elapsed);
            const framesDone = i + 1;
            setEtaRange(calcEtaRange(elapsed, framesDone, totalFrames));
            setLastFrameTime(elapsed / framesDone);

            FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: true, progress: pct });
        }
        return 'completed';
    };

    /**
     * Image-sequence export (PNG / JPG). Chrome/Edge only — the File System Access API's
     * `showDirectoryPicker` is not available in Firefox or Safari. A single worker session
     * handles all selected passes; the worker loops over them per frame and writes files
     * into the chosen directory (PNG merges beauty+alpha into RGBA, JPG writes separate
     * files per pass, depth is always a separate file).
     */
    const handleImageSequenceExport = async (passesToExport: ExportPass[]) => {
        // The selected format is read off `formatIndex` via `currentFormat` as needed; no
        // reason to thread it as a param when it's already part of the closure.
        if (typeof (window as any).showDirectoryPicker !== 'function') {
            alert('Image-sequence export requires the File System Access API, which is only available in Chrome / Edge. Use an MP4 or WebM format in other browsers.');
            return;
        }

        let dirHandle: FileSystemDirectoryHandle | null = null;
        try {
            // @ts-expect-error — FSA types not in all TS lib targets
            dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return; // User cancelled
            alert('Could not open output folder. Error: ' + (err instanceof Error ? err.message : String(err)));
            return;
        }
        if (!dirHandle) return;

        const state = useFractalStore.getState();
        const exportVersion = state.prepareExport();
        const baseName = `${state.projectSettings.name}_v${exportVersion}_${vidRes.w}x${vidRes.h}`;

        setWinSize({ width: EXPANDED_WIDTH, height: BASE_HEIGHT });
        setIsRendering(true);
        setIsStopping(false);

        const animState = useAnimationStore.getState();
        const savedFrame = animState.currentFrame;
        const savedIsPlaying = animState.isPlaying;
        if (savedIsPlaying) animState.pause();

        cancelledRef.current = false;
        finishEarlyRef.current = false;

        const passLabels = passesToExport.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ');

        try {
            setProgress(0);
            setElapsedTime(0);
            setEtaRange({ min: 0, max: 0 });
            setLastFrameTime(0);
            setStatusText(`Image sequence → ${dirHandle.name} (${passLabels})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            startTimeRef.current = Date.now();

            const config = {
                width: vidRes.w,
                height: vidRes.h,
                fps: fps,
                samples: vidSamples,
                bitrate: vidBitrate,
                startFrame: startFrame,
                endFrame: endFrame,
                frameStep: frameStep,
                formatIndex: formatIndex,
                internalScale: internalScale,
                passes: passesToExport,
                depthMin,
                depthMax,
                imageSequenceBaseName: baseName
            };

            setStatusText(`Initializing (${passLabels})…`);
            await engine.startExport(config, null, dirHandle);

            const totalFrames = Math.floor((endFrame - startFrame) / frameStep) + 1;
            const outcome = await runFramePump(config, totalFrames, /* applyFocusLock */ true);

            if (outcome === 'cancelled') {
                engine.cancelExport();
                setStatusText('Cancelled.');
            } else {
                setStatusText('Flushing remaining files…');
                await engine.finishExport();
                setStatusText(`Complete — wrote to ${dirHandle.name}`);
            }
        } catch (e) {
            console.error('RenderPopup: Image sequence export failed', e);
            alert(`Image sequence export failed.\n\nError: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsRendering(false);
            setWinSize({ width: BASE_WIDTH, height: BASE_HEIGHT });
            FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });

            animationEngine.scrub(savedFrame);
            if (savedIsPlaying) useAnimationStore.getState().play();

            engine.modulations = {};
            modulationEngine.resetOffsets();
        }
    };

    const handleVideoExport = async () => {
        // Collect selected passes (at least one is required by the UI guard on the
        // start button, but double-check here). Each pass produces its own file.
        const passesToExport: ExportPass[] = [];
        if (exportBeauty) passesToExport.push('beauty');
        if (exportAlpha) passesToExport.push('alpha');
        if (exportDepth) passesToExport.push('depth');
        if (passesToExport.length === 0) {
            alert('Select at least one pass (Beauty, Alpha, or Depth).');
            return;
        }

        const selectedFormat = VIDEO_FORMATS[formatIndex];

        // Image-sequence formats (PNG / JPG) take the dedicated path — one startExport
        // session with `passes[]` populated + a directory handle; the worker loops over
        // passes internally per frame and writes files into the chosen folder.
        if (selectedFormat.imageSequence) {
            return handleImageSequenceExport(passesToExport);
        }

        const state = useFractalStore.getState();
        const exportVersion = state.prepareExport();
        const baseProjectName = state.projectSettings.name;
        const isMultiPass = passesToExport.length > 1;

        // --- Shared setup (UI, animation, cancel flags) ---
        setWinSize({ width: EXPANDED_WIDTH, height: BASE_HEIGHT });
        setIsRendering(true);
        setIsStopping(false);

        const animState = useAnimationStore.getState();
        const savedFrame = animState.currentFrame;
        const savedIsPlaying = animState.isPlaying;
        if (savedIsPlaying) animState.pause();

        cancelledRef.current = false;
        finishEarlyRef.current = false;

        try {
            for (let p = 0; p < passesToExport.length; p++) {
                if (cancelledRef.current) break;

                const pass = passesToExport[p];
                const passLabel = pass.charAt(0).toUpperCase() + pass.slice(1);
                const passPrefix = isMultiPass
                    ? `Pass ${p + 1}/${passesToExport.length} (${passLabel}) — `
                    : '';
                // Multi-pass runs suffix the project name with `_{pass}` so the N files
                // end up as e.g. `MyScene_beauty_v3.mp4`, `MyScene_alpha_v3.mp4`, ….
                const projectNameForFile = isMultiPass ? `${baseProjectName}_${pass}` : baseProjectName;
                const exportFilename = getExportFileName(
                    projectNameForFile,
                    exportVersion,
                    selectedFormat.ext,
                    `${vidRes.w}x${vidRes.h}`
                );

                // --- PER-PASS SAVE DIALOG (must run under transient activation; async
                //     await chains preserve it, so opening the picker inside a loop works
                //     on all browsers that support showSaveFilePicker). ---
                let fileStream: any = null;
                let effectiveDiskMode = isDiskMode;
                if (isDiskMode) {
                    try {
                        // @ts-expect-error — File System Access API not in all TS lib targets
                        const handle = await window.showSaveFilePicker({
                            suggestedName: exportFilename,
                            types: [{
                                description: selectedFormat.label,
                                accept: { [selectedFormat.mime]: [`.${selectedFormat.ext}`] },
                            }],
                        });
                        fileStream = await handle.createWritable();
                    } catch (err) {
                        if (err instanceof DOMException && err.name === 'AbortError') {
                            // User cancelled the picker — abort the whole multi-pass run
                            cancelledRef.current = true;
                            break;
                        }
                        const errMsg = err instanceof Error ? err.message : String(err);
                        const errName = err instanceof DOMException ? err.name : '';
                        const isSecurityError = errName === 'SecurityError' || errMsg.includes('not supported') || errMsg.includes('not a function');
                        if (isSecurityError) {
                            console.warn("RenderPopup: Disk Access blocked. Fallback to RAM.");
                            fileStream = null;
                            effectiveDiskMode = false;
                        } else {
                            alert("Could not start export. Error: " + errMsg);
                            cancelledRef.current = true;
                            break;
                        }
                    }
                }

                // --- PER-PASS UI RESET ---
                setProgress(0);
                setElapsedTime(0);
                setEtaRange({ min: 0, max: 0 });
                setLastFrameTime(0);
                setStatusText(passPrefix + (effectiveDiskMode ? "Exporting to Disk..." : "Exporting to RAM..."));

                await new Promise(resolve => setTimeout(resolve, 100));
                startTimeRef.current = Date.now();

                const config = {
                    width: vidRes.w,
                    height: vidRes.h,
                    fps: fps,
                    samples: vidSamples,
                    bitrate: vidBitrate,
                    startFrame: startFrame,
                    endFrame: endFrame,
                    frameStep: frameStep,
                    formatIndex: formatIndex,
                    internalScale: internalScale,
                    pass,
                    depthMin,
                    depthMax
                };

                // --- INIT WORKER EXPORT SESSION ---
                setStatusText(passPrefix + "Initializing encoder...");
                await engine.startExport(config, fileStream);

                // Focus-lock DOF is only meaningful on the beauty pass — tweaking focus between
                // alpha/depth passes moves the output around for no visual benefit.
                const totalFrames = Math.floor((endFrame - startFrame) / frameStep) + 1;
                const outcome = await runFramePump(config, totalFrames, /* applyFocusLock */ pass === 'beauty');

                if (outcome === 'cancelled') {
                    engine.cancelExport();
                    setStatusText(passPrefix + "Cancelled.");
                    break;
                }

                // --- FINALIZE THIS PASS ---
                setStatusText(passPrefix + "Finalizing video...");
                const blob = await engine.finishExport();

                if (blob && !effectiveDiskMode) {
                    const blobObj = new Blob([blob], { type: selectedFormat.mime });
                    const url = URL.createObjectURL(blobObj);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = exportFilename;
                    a.click();
                    URL.revokeObjectURL(url);
                }

                // "Finish early" stops the current pass cleanly but also ends the multi-pass run —
                // the user asked to finish, not to proceed to the next pass.
                if (finishEarlyRef.current) break;
            }

            setStatusText(cancelledRef.current ? "Cancelled." : "Complete!");
        } catch (e) {
            console.error("RenderPopup: Export failed", e);
            alert(`Export failed.\n\nError: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            // Restore state
            setIsRendering(false);
            setWinSize({ width: BASE_WIDTH, height: BASE_HEIGHT });
            FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });

            // Restore animation frame
            animationEngine.scrub(savedFrame);
            if (savedIsPlaying) useAnimationStore.getState().play();

            // Clear modulation offsets
            engine.modulations = {};
            modulationEngine.resetOffsets();
        }
    };

    const handleStopClick = () => { stoppingRef.current = true; setIsStopping(true); };
    const handleResume = () => { stoppingRef.current = false; setIsStopping(false); };
    const confirmStitch = () => { stoppingRef.current = false; setStatusText("Finalizing..."); finishEarlyRef.current = true; };
    const discardRender = () => { stoppingRef.current = false; cancelledRef.current = true; };

    const totalFramesCount = Math.floor((endFrame - startFrame) / frameStep) + 1;
    
    // Improved Est. Total Logic
    const calculateEstimatedTotal = () => {
        if (!frameStats.duration) return 0;
        
        let multiplier = 1.0;
        // Estimate based on viewport vs target resolution ratio
        const [viewportW, viewportH] = getCanvasPhysicalPixelSize(useFractalStore.getState());
        const viewportPixels = viewportW * viewportH;
        const targetW = vidRes.w * internalScale;
        const targetH = vidRes.h * internalScale;
        const targetPixels = targetW * targetH;

        if (viewportPixels > 0) {
            multiplier = targetPixels / viewportPixels;
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

                                <div className="px-1 mb-1.5">
                                    <label className="t-label mb-0.5 block">Passes</label>
                                    <div className="flex gap-3 items-center">
                                        <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={exportBeauty}
                                                onChange={(e) => setExportBeauty(e.target.checked)}
                                                className="accent-cyan-400"
                                            />
                                            Beauty
                                        </label>
                                        <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={exportAlpha}
                                                onChange={(e) => setExportAlpha(e.target.checked)}
                                                className="accent-cyan-400"
                                            />
                                            Alpha
                                        </label>
                                        <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={exportDepth}
                                                onChange={(e) => setExportDepth(e.target.checked)}
                                                className="accent-cyan-400"
                                            />
                                            Depth
                                        </label>
                                    </div>
                                    {(exportAlpha || exportDepth) && (exportBeauty ? 1 : 0) + (exportAlpha ? 1 : 0) + (exportDepth ? 1 : 0) > 1 && (
                                        <div className="text-[8px] text-gray-500 mt-0.5 leading-tight">
                                            One file per pass, named {'{project}'}_{'{pass}'}_{'v{n}'}.{currentFormat.ext}
                                        </div>
                                    )}
                                    {exportDepth && (
                                        <div className="mt-1.5 pt-1 border-t border-white/5">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <label className="t-label">Depth range (world units)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const atm = (useFractalStore.getState() as any).atmosphere;
                                                        if (!atm || !(atm.fogIntensity > 0)) return;
                                                        setDepthMin(atm.fogNear ?? 0);
                                                        setDepthMax(atm.fogFar ?? 5);
                                                    }}
                                                    disabled={!((useFractalStore.getState() as any).atmosphere?.fogIntensity > 0)}
                                                    className="text-[9px] text-cyan-300 hover:text-cyan-200 disabled:text-gray-600 disabled:cursor-not-allowed underline-offset-2 hover:underline"
                                                    title="Copy the atmosphere feature's fog start/end into the depth range (only available when fog is enabled)."
                                                >
                                                    Use fog range
                                                </button>
                                            </div>
                                            <div className="flex gap-1">
                                                <div className="flex-1">
                                                    <label className="t-label mb-0.5 block">Near</label>
                                                    <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                                        <DraggableNumber
                                                            value={depthMin}
                                                            onChange={(v) => setDepthMin(Math.max(0, Math.min(v, depthMax - 0.001)))}
                                                            step={0.1}
                                                            overrideText={depthMin.toFixed(2)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="t-label mb-0.5 block">Far</label>
                                                    <div className="h-5 bg-black/40 rounded border border-white/10 relative">
                                                        <DraggableNumber
                                                            value={depthMax}
                                                            onChange={(v) => setDepthMax(Math.max(depthMin + 0.001, v))}
                                                            step={0.1}
                                                            overrideText={depthMax.toFixed(2)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

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

                                {isFirefoxH264BitrateCapped && (
                                    <div className="px-2 -mt-1 mb-1 text-[9px] text-amber-400/90 leading-tight">
                                        Firefox caps H.264 output at ~31 Mbps regardless of this setting.
                                    </div>
                                )}

                                {/* FLUSH SLIDER - SAMPLES */}
                                <Slider
                                    label="Samples (Quality)"
                                    value={vidSamples}
                                    min={1} max={256} step={1}
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
                                label={
                                    currentFormat.imageSequence
                                        ? (isDiskMode ? "Select Output Folder…" : "Image Sequence Requires Chrome")
                                        : (isDiskMode ? "Select Output File…" : "Start RAM Render")
                                }
                                variant="primary"
                                fullWidth
                                disabled={
                                    !isFormatSupported
                                    || (!exportBeauty && !exportAlpha && !exportDepth)
                                    || (currentFormat.imageSequence && !isDiskMode)
                                }
                                icon={isDiskMode ? <SaveIcon /> : <PlayIcon />}
                            />
                            {currentFormat.imageSequence && !isDiskMode && (
                                <div className="mt-1.5 px-2 text-[9px] text-amber-400/90 leading-tight">
                                    Image sequences need the File System Access API (directory picker), available in Chrome / Edge.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

