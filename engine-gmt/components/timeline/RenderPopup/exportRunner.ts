/**
 * Imperative export pipelines — one for image sequences (Chrome-only,
 * uses File System Access API) and one for video formats (mediabunny
 * encoder + WebCodecs).
 *
 * Pulled out of the React component so the popup itself is just state
 * + JSX. Callers hand us a `deps` bundle of refs / setters and we drive
 * the worker session, frame loop, and finalize.
 *
 * `runFramePump` is the shared per-frame ratchet — both pipelines share
 * the animation-scrub + serialize-camera + worker-encode + progress-tick
 * inner loop.
 */

import * as THREE from 'three';
import { getProxy } from '../../../engine/worker/WorkerProxy';
import { useAnimationStore } from '../../../../store/animationStore';
import { useEngineStore } from '../../../../store/engineStore';
import { VIDEO_FORMATS } from '../../../../data/constants';
import { FractalEvents, FRACTAL_EVENTS } from '../../../engine/FractalEvents';
import { animationEngine } from '../../../../engine/AnimationEngine';
import { modulationEngine } from '../../../../engine/features/modulation/ModulationEngine';
import { getViewportCamera } from '../../../engine/worker/ViewportRefs';
import { getExportFileName } from '../../../../utils/fileUtils';
import { applyExportModulations } from '../exportModulations';
import type { SerializedCamera, SerializedOffset } from '../../../engine/worker/WorkerProtocol';
import type { EngineRenderState } from '../../../engine/FractalEngine';
import type { ExportPass, VideoExportConfig } from '../../../../engine/codec/VideoExportTypes';
import type { ExportRunDeps } from './types';
import { calcEtaRange } from '../exportHelpers';

const engine = getProxy();

/**
 * Per-frame export pump — shared by the video multi-pass path and the image-sequence path.
 *
 * For every frame in [0, totalFrames):
 *   1. Honour the pause/cancel/finish-early flags.
 *   2. Scrub the animation and apply modulations for this timeline frame.
 *   3. Serialize camera + offset + render-state and send to the worker via
 *      `engine.renderExportFrame`. The worker renders + accumulates + encodes.
 *   4. Apply focus-lock if requested (beauty pass only).
 *   5. Push progress / elapsed / ETA / last-frame-time + emit BUCKET_STATUS.
 *
 * Returns a string tag describing how the loop exited — the caller decides
 * whether to call `engine.finishExport` or `engine.cancelExport`.
 */
const runFramePump = async (
    config: VideoExportConfig,
    totalFrames: number,
    applyFocusLock: boolean,
    deps: ExportRunDeps,
): Promise<'completed' | 'cancelled' | 'finishEarly'> => {
    const { cfg, flags, status } = deps;
    const { cancelledRef, finishEarlyRef, stoppingRef, startTimeRef } = flags;

    for (let i = 0; i < totalFrames; i++) {
        if (cancelledRef.current) return 'cancelled';
        if (finishEarlyRef.current) return 'finishEarly';
        while (stoppingRef.current && !cancelledRef.current && !finishEarlyRef.current) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (cancelledRef.current) return 'cancelled';
        if (finishEarlyRef.current) return 'finishEarly';

        const timelineFrame = cfg.startFrame + (i * cfg.frameStep);
        const time = timelineFrame / cfg.fps;

        animationEngine.scrub(timelineFrame);
        applyExportModulations(time, 1.0 / cfg.fps);

        const cam = getViewportCamera() as THREE.PerspectiveCamera | null;
        const storeState = useEngineStore.getState();

        const serializedCamera: SerializedCamera = cam ? {
            position:   [cam.position.x, cam.position.y, cam.position.z],
            quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
            fov:        cam.fov || 60,
            aspect:     config.width / config.height,
        } : {
            position:   [0, 0, 0],
            quaternion: [0, 0, 0, 1],
            fov:        (storeState as any).optics?.camFov ?? 60,
            aspect:     config.width / config.height,
        };

        const so = storeState.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        const serializedOffset: SerializedOffset = {
            x: so.x, y: so.y, z: so.z,
            xL: so.xL ?? 0, yL: so.yL ?? 0, zL: so.zL ?? 0,
        };

        const renderState: Partial<EngineRenderState> = {
            cameraMode:          storeState.cameraMode,
            isCameraInteracting: false,
            optics:              (storeState as any).optics ?? null,
            lighting:            (storeState as any).lighting ?? null,
            quality:             (storeState as any).quality ?? null,
            geometry:            (storeState as any).geometry ?? null,
        };

        const frameResult = await engine.renderExportFrame(
            i, time, serializedCamera, serializedOffset, renderState,
            { ...engine.modulations },
        );

        if (applyFocusLock) {
            const fStore = useEngineStore.getState();
            if (fStore.focusLock && frameResult.measuredDistance > 0 && frameResult.measuredDistance < 1000) {
                const currentFocus = (fStore as any).optics?.dofFocus ?? 0;
                const relChange = Math.abs(frameResult.measuredDistance - currentFocus) / Math.max(currentFocus, 0.0001);
                if (relChange > 0.01) {
                    (fStore as any).setOptics({ dofFocus: frameResult.measuredDistance });
                }
            }
        }

        const pct = ((i + 1) / totalFrames) * 100;
        status.setProgress(pct);

        const now = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000;
        status.setElapsedTime(elapsed);
        const framesDone = i + 1;
        status.setEtaRange(calcEtaRange(elapsed, framesDone, totalFrames));
        status.setLastFrameTime(elapsed / framesDone);

        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: true, progress: pct });
    }
    return 'completed';
};

/**
 * Image-sequence export (PNG / JPG). Chrome / Edge only — the File System
 * Access API's `showDirectoryPicker` is not available in Firefox or Safari.
 * One worker session handles all selected passes; the worker loops over
 * them per frame and writes files into the chosen directory (PNG merges
 * beauty+alpha into RGBA, JPG writes separate files per pass, depth is
 * always a separate file).
 */
export const runImageSequenceExport = async (
    passesToExport: ExportPass[],
    deps: ExportRunDeps,
): Promise<void> => {
    const { cfg, flags, status, sizing } = deps;

    if (typeof (window as any).showDirectoryPicker !== 'function') {
        alert('Image-sequence export requires the File System Access API, which is only available in Chrome / Edge. Use an MP4 or WebM format in other browsers.');
        return;
    }

    let dirHandle: FileSystemDirectoryHandle | null = null;
    try {
        // @ts-expect-error — FSA types not in all TS lib targets
        dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled
        alert('Could not open output folder. Error: ' + (err instanceof Error ? err.message : String(err)));
        return;
    }
    if (!dirHandle) return;

    const state = useEngineStore.getState();
    const exportVersion = state.prepareExport();
    const baseName = `${state.projectSettings.name}_v${exportVersion}_${cfg.vidRes.w}x${cfg.vidRes.h}`;

    sizing.setWinSize({ width: sizing.EXPANDED_WIDTH, height: sizing.BASE_HEIGHT });
    status.setIsRendering(true);
    status.setIsStopping(false);

    const animState = useAnimationStore.getState();
    const savedFrame = animState.currentFrame;
    const savedIsPlaying = animState.isPlaying;
    if (savedIsPlaying) animState.pause();

    flags.cancelledRef.current = false;
    flags.finishEarlyRef.current = false;

    const passLabels = passesToExport.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ');

    try {
        status.setProgress(0);
        status.setElapsedTime(0);
        status.setEtaRange({ min: 0, max: 0 });
        status.setLastFrameTime(0);
        status.setStatusText(`Image sequence → ${dirHandle.name} (${passLabels})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        flags.startTimeRef.current = Date.now();

        const config: VideoExportConfig = {
            width:                 cfg.vidRes.w,
            height:                cfg.vidRes.h,
            fps:                   cfg.fps,
            samples:               cfg.vidSamples,
            bitrate:               cfg.vidBitrate,
            startFrame:            cfg.startFrame,
            endFrame:              cfg.endFrame,
            frameStep:             cfg.frameStep,
            formatIndex:           cfg.formatIndex,
            internalScale:         cfg.internalScale,
            passes:                passesToExport,
            depthMin:              cfg.depthMin,
            depthMax:              cfg.depthMax,
            imageSequenceBaseName: baseName,
        };

        status.setStatusText(`Initializing (${passLabels})…`);
        await engine.startExport(config, null, dirHandle);

        const totalFrames = Math.floor((cfg.endFrame - cfg.startFrame) / cfg.frameStep) + 1;
        const outcome = await runFramePump(config, totalFrames, /* applyFocusLock */ true, deps);

        if (outcome === 'cancelled') {
            engine.cancelExport();
            status.setStatusText('Cancelled.');
        } else {
            status.setStatusText('Flushing remaining files…');
            await engine.finishExport();
            status.setStatusText(`Complete — wrote to ${dirHandle.name}`);
        }
    } catch (e) {
        console.error('RenderPopup: Image sequence export failed', e);
        alert(`Image sequence export failed.\n\nError: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        status.setIsRendering(false);
        sizing.setWinSize({ width: sizing.BASE_WIDTH, height: sizing.BASE_HEIGHT });
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });

        animationEngine.scrub(savedFrame);
        if (savedIsPlaying) useAnimationStore.getState().play();

        engine.modulations = {};
        modulationEngine.resetOffsets();
    }
};

/**
 * Video export (MP4 / WebM / etc.). Routes to image-sequence path when
 * the format is PNG/JPG. Multi-pass: each enabled pass produces its own
 * file; the loop reopens the save dialog per pass (transient activation
 * is preserved across awaits, so this works in browsers that support
 * `showSaveFilePicker`).
 */
export const runVideoExport = async (deps: ExportRunDeps): Promise<void> => {
    const { cfg, flags, status, sizing, isDiskMode } = deps;

    const passesToExport: ExportPass[] = [];
    if (cfg.exportBeauty) passesToExport.push('beauty');
    if (cfg.exportAlpha)  passesToExport.push('alpha');
    if (cfg.exportDepth)  passesToExport.push('depth');
    if (passesToExport.length === 0) {
        alert('Select at least one pass (Beauty, Alpha, or Depth).');
        return;
    }

    const selectedFormat = VIDEO_FORMATS[cfg.formatIndex];

    if (selectedFormat.imageSequence) {
        return runImageSequenceExport(passesToExport, deps);
    }

    const state = useEngineStore.getState();
    const exportVersion = state.prepareExport();
    const baseProjectName = state.projectSettings.name;
    const isMultiPass = passesToExport.length > 1;

    sizing.setWinSize({ width: sizing.EXPANDED_WIDTH, height: sizing.BASE_HEIGHT });
    status.setIsRendering(true);
    status.setIsStopping(false);

    const animState = useAnimationStore.getState();
    const savedFrame = animState.currentFrame;
    const savedIsPlaying = animState.isPlaying;
    if (savedIsPlaying) animState.pause();

    flags.cancelledRef.current = false;
    flags.finishEarlyRef.current = false;

    try {
        for (let p = 0; p < passesToExport.length; p++) {
            if (flags.cancelledRef.current) break;

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
                `${cfg.vidRes.w}x${cfg.vidRes.h}`,
            );

            // Per-pass save dialog (transient activation preserved across awaits).
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
                        flags.cancelledRef.current = true;
                        break;
                    }
                    const errMsg = err instanceof Error ? err.message : String(err);
                    const errName = err instanceof DOMException ? err.name : '';
                    const isSecurityError = errName === 'SecurityError'
                        || errMsg.includes('not supported') || errMsg.includes('not a function');
                    if (isSecurityError) {
                        console.warn('RenderPopup: Disk Access blocked. Fallback to RAM.');
                        fileStream = null;
                        effectiveDiskMode = false;
                    } else {
                        alert('Could not start export. Error: ' + errMsg);
                        flags.cancelledRef.current = true;
                        break;
                    }
                }
            }

            // Per-pass UI reset.
            status.setProgress(0);
            status.setElapsedTime(0);
            status.setEtaRange({ min: 0, max: 0 });
            status.setLastFrameTime(0);
            status.setStatusText(passPrefix + (effectiveDiskMode ? 'Exporting to Disk...' : 'Exporting to RAM...'));

            await new Promise(resolve => setTimeout(resolve, 100));
            flags.startTimeRef.current = Date.now();

            const config: VideoExportConfig = {
                width:         cfg.vidRes.w,
                height:        cfg.vidRes.h,
                fps:           cfg.fps,
                samples:       cfg.vidSamples,
                bitrate:       cfg.vidBitrate,
                startFrame:    cfg.startFrame,
                endFrame:      cfg.endFrame,
                frameStep:     cfg.frameStep,
                formatIndex:   cfg.formatIndex,
                internalScale: cfg.internalScale,
                pass,
                depthMin:      cfg.depthMin,
                depthMax:      cfg.depthMax,
            };

            status.setStatusText(passPrefix + 'Initializing encoder...');
            await engine.startExport(config, fileStream);

            // Focus-lock DOF only meaningful on the beauty pass.
            const totalFrames = Math.floor((cfg.endFrame - cfg.startFrame) / cfg.frameStep) + 1;
            const outcome = await runFramePump(config, totalFrames, pass === 'beauty', deps);

            if (outcome === 'cancelled') {
                engine.cancelExport();
                status.setStatusText(passPrefix + 'Cancelled.');
                break;
            }

            // Finalize this pass.
            status.setStatusText(passPrefix + 'Finalizing video...');
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

            // "Finish early" stops the current pass cleanly but also ends the
            // multi-pass run — the user asked to finish, not to proceed to the
            // next pass.
            if (flags.finishEarlyRef.current) break;
        }

        status.setStatusText(flags.cancelledRef.current ? 'Cancelled.' : 'Complete!');
    } catch (e) {
        console.error('RenderPopup: Export failed', e);
        alert(`Export failed.\n\nError: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        status.setIsRendering(false);
        sizing.setWinSize({ width: sizing.BASE_WIDTH, height: sizing.BASE_HEIGHT });
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });

        animationEngine.scrub(savedFrame);
        if (savedIsPlaying) useAnimationStore.getState().play();

        engine.modulations = {};
        modulationEngine.resetOffsets();
    }
};
