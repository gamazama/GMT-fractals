
import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { TimeNavigator } from './TimeNavigator';
import { useAnimationStore } from '../../store/animationStore';
import { useEngineStore } from '../../store/engineStore';
import { DraggableNumber } from '../Slider';
import { animationEngine } from '../../engine/AnimationEngine';
import { useHelpContextMenu } from '../../hooks/useHelpContextMenu';
import { CloseIcon, MenuIcon, KeyStatus, LoopIcon, WaveRecordIcon } from '../Icons';
import { KeyframeButton } from '../KeyframeButton';
import { getLiveValue, evaluateTrackValue } from '../../utils/timelineUtils';
import {
    PlayIcon, PauseIcon, StopIcon, RecordIcon,
    BarsIcon, CurveIcon, CheckeredFlagIcon, CheckIcon
} from '../Icons';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import {
    getCameraKeyTracks,
    subscribeCameraKeyTracks,
    captureCameraKeyFrame,
} from '../../engine/animation/cameraKeyRegistry';
import {
    getRenderPopup,
    subscribeRenderPopup,
} from '../../engine/animation/renderPopupRegistry';
import {
    getRenderAdjuncts,
    subscribeRenderAdjunct,
    type RenderAdjunct,
} from '../../engine/animation/renderAdjunctRegistry';

/**
 * Key Cam button — captures the current camera pose as a keyframe and
 * shows live/keyed/dirty status. The set of tracks that together make
 * up "camera pose" is app-specific (GMT uses camera.unified.*, fractal-toy
 * uses camera.orbit*, fluid-toy uses sceneCamera.*), so this component
 * reads the tracklist from `engine/animation/cameraKeyRegistry`. Apps
 * register on boot; until something is registered, the button is hidden.
 *
 * The GMT original subscribed to `fractalStore.cameraRot / sceneOffset`
 * to force a rerender whenever the camera moved (so "dirty" state stays
 * current). Those fields don't exist on the generic engine store, so
 * here we subscribe to the entire store with a shallow version-counter
 * selector — any state change bumps the counter and triggers a rerender.
 * Works for any app without knowing its store shape.
 */
const KeyCamButton: React.FC = () => {
    // Narrow per-field — destructuring useAnimationStore() was re-rendering
    // this button on every no-op set() (~60 Hz). The engineStore full sub
    // below is deliberate (the dirty check needs to react to anything).
    const sequence     = useAnimationStore((s) => s.sequence);
    const currentFrame = useAnimationStore((s) => s.currentFrame);
    const isPlaying    = useAnimationStore((s) => s.isPlaying);

    // Rebuild camera track list when apps (re-)register
    const tracks = useSyncExternalStore(
        subscribeCameraKeyTracks,
        getCameraKeyTracks,
        getCameraKeyTracks
    );

    // Force rerender on ANY fractalStore change so "dirty" status stays
    // live as the camera (or anything else) moves. The selector returns
    // a monotonic version — Zustand only bumps the render when it changes.
    useEngineStore(s => s);

    if (tracks.length === 0) {
        // No app has registered camera tracks — hide the button entirely
        return null;
    }

    const handleKeyCam = () => {
        // Apps register a capture function via setCameraKeyCaptureFn —
        // GMT's reads from engine.activeCamera + sceneOffset, fluid-toy
        // and fractal-toy use the default DDFS-store path walker. The
        // legacy sequenceSlice.captureCameraFrame is NOT called here:
        // its underlying CameraUtils.getUnifiedFromEngine is stubbed in
        // engine-core (returns 0,0,0), so it would overwrite the
        // just-captured keyframes with zeros for camera.unified.* tracks.
        captureCameraKeyFrame(currentFrame);
        FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, tracks[0]);
    };

    const getStatus = (): KeyStatus => {
        let hasAnyTrack = false;
        let hasKeyAtFrame = false;
        let isDirty = false;

        for (const tid of tracks) {
            const track = sequence.tracks[tid];
            if (track) {
                hasAnyTrack = true;
                const k = track.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);

                if (k) hasKeyAtFrame = true;

                if (!isPlaying) {
                    const currentVal = getLiveValue(tid, false, currentFrame, sequence);
                    let timelineVal = 0;

                    if (k) {
                        timelineVal = k.value;
                    } else {
                        timelineVal = evaluateTrackValue(track.keyframes, currentFrame, tid.includes('rotation'));
                    }

                    if (Math.abs(timelineVal - currentVal) > 0.001) {
                        isDirty = true;
                    }
                }
            }
        }

        if (!hasAnyTrack) return 'none';

        if (hasKeyAtFrame) {
            return isDirty ? 'keyed-dirty' : 'keyed';
        } else {
            return isDirty ? 'dirty' : 'partial';
        }
    };

    const status = getStatus();

    return (
        <div
            className={`flex items-center gap-2 px-2 py-1 rounded transition-colors cursor-pointer border ${
                status === 'keyed' ? 'bg-warn/15 hover:bg-warn/25 text-warn border-warn/30' :
                status === 'keyed-dirty' ? 'bg-danger/15 hover:bg-danger/25 text-danger border-danger/30' :
                status === 'dirty' ? 'bg-danger/10 hover:bg-danger/20 text-danger border-danger/20' :
                status === 'partial' ? 'bg-warn/10 hover:bg-warn/20 text-warn/70 border-warn/20' :
                'bg-line/5 hover:bg-line/10 text-fg-muted border-line/10'
            }`}
            data-help-id="anim.camera"
            onClick={handleKeyCam}
            title="Keyframe Camera (Position + Rotation)"
        >
            <KeyframeButton status={status} onClick={handleKeyCam} />
            <span className="text-[10px] font-bold">Key Cam</span>
        </div>
    );
};

interface TimelineToolbarProps {
    mode: 'DopeSheet' | 'Graph';
    setMode: (m: 'DopeSheet' | 'Graph') => void;
    totalContentWidth: number;
    viewportWidth: number;
    scrollLeft: number;
    onScroll: (px: number) => void;
    onZoom: (val: number, type?: 'factor' | 'absolute') => void;
    onClose: () => void;
    containerRef?: React.RefObject<HTMLDivElement>;
    frameWidth: number;
    durationFrames: number;
    inspectorVisible?: boolean;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
    mode, setMode, totalContentWidth, viewportWidth, scrollLeft, onScroll, onZoom, onClose, containerRef, frameWidth, durationFrames,
}) => {
    // Narrow per-field subs — `useAnimationStore()` (full sub) was re-rendering
    // the toolbar every RAF due to no-op set() calls flooding the store.
    const isPlaying              = useAnimationStore((s) => s.isPlaying);
    const isRecording            = useAnimationStore((s) => s.isRecording);
    const currentFrame           = useAnimationStore((s) => s.currentFrame);
    const fps                    = useAnimationStore((s) => s.fps);
    const storeDuration          = useAnimationStore((s) => s.durationFrames);
    const recordCamera           = useAnimationStore((s) => s.recordCamera);
    const loopMode               = useAnimationStore((s) => s.loopMode);
    const isArmingModulation     = useAnimationStore((s) => s.isArmingModulation);
    const isRecordingModulation  = useAnimationStore((s) => s.isRecordingModulation);
    const deterministicPlayback  = useAnimationStore((s) => s.deterministicPlayback);
    // Action selectors — stable refs via Zustand's Object.is bail-out.
    const play                   = useAnimationStore((s) => s.play);
    const pause                  = useAnimationStore((s) => s.pause);
    const stop                   = useAnimationStore((s) => s.stop);
    const toggleRecording        = useAnimationStore((s) => s.toggleRecording);
    const setFps                 = useAnimationStore((s) => s.setFps);
    const setDuration            = useAnimationStore((s) => s.setDuration);
    const seek                   = useAnimationStore((s) => s.seek);
    const deleteAllKeys          = useAnimationStore((s) => s.deleteAllKeys);
    const deleteAllTracks        = useAnimationStore((s) => s.deleteAllTracks);
    const snapshot               = useAnimationStore((s) => s.snapshot);
    const toggleRecordCamera     = useAnimationStore((s) => s.toggleRecordCamera);
    const setLoopMode            = useAnimationStore((s) => s.setLoopMode);
    const toggleArmModulation    = useAnimationStore((s) => s.toggleArmModulation);
    const setDeterministicPlayback = useAnimationStore((s) => s.setDeterministicPlayback);

    const handleContextMenu = useHelpContextMenu();
    const [showRender, setShowRender] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    // 'keep' = key at frame 30 stays at frame 30 (visual time shifts).
    // 'match' = key at 1.0s stays at 1.0s (frame index is remapped).
    // UI-only preference, applied on the next FPS edit. 'keep' matches the
    // historic behaviour, so default there.
    const [fpsMode, setFpsMode] = useState<'keep' | 'match'>('keep');
    const menuRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    // Separate ref for the portaled menu panel — once portaled to body it
    // is no longer a descendant of menuRef, so click-outside has to check
    // both refs explicitly.
    const menuPanelRef = useRef<HTMLDivElement>(null);
    // Position the menu in viewport coordinates — the toolbar is nested
    // inside an `overflow-hidden` flex wrapper (Timeline.tsx), so an
    // absolute-positioned menu that flips upward gets clipped against
    // the toolbar's top edge. `position: fixed` escapes the clip.
    // null means "menu is closed" or "haven't measured yet".
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

    // Apps register a render-dialog component via renderPopupRegistry;
    // when nothing is registered we hide the Render button entirely.
    const RenderPopupComponent = useSyncExternalStore(
        subscribeRenderPopup,
        getRenderPopup,
        getRenderPopup
    );

    // Optional subordinate render action, surfaced as a row in the "…"
    // overflow menu (e.g. GMT's "Export to After Effects"). The dialog is
    // mounted at the toolbar root so it survives the menu closing.
    const renderAdjuncts = useSyncExternalStore(
        subscribeRenderAdjunct,
        getRenderAdjuncts,
        getRenderAdjuncts
    );
    const [activeAdjunct, setActiveAdjunct] = useState<RenderAdjunct | null>(null);

    // Position the menu (in viewport coords) when opening — flip above the
    // trigger if there isn't room below. The menu is ~220px tall in its
    // current shape; if the actual content grows we'd want to measure
    // post-mount, but a fixed estimate is fine for now.
    const MENU_W = 192; // matches w-48
    const MENU_H_EST = 220;
    const toggleMenu = () => {
        if (showMenu) { setShowMenu(false); return; }
        const btn = menuButtonRef.current;
        if (!btn) { setShowMenu(true); return; }
        const rect = btn.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const flipUp = spaceBelow < MENU_H_EST && rect.top > spaceBelow;
        const top = flipUp ? Math.max(4, rect.top - MENU_H_EST - 8) : rect.bottom + 8;
        const right = Math.max(4, window.innerWidth - rect.right);
        setMenuPos({ top, right });
        setShowMenu(true);
    };

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideTrigger = menuRef.current?.contains(target);
            const insidePanel = menuPanelRef.current?.contains(target);
            if (!insideTrigger && !insidePanel) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            window.addEventListener('mousedown', handleClickOutside);
        }
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleSeek = (f: number) => {
        seek(f);
        animationEngine.scrub(f);
    };

    return (
        <div className="h-8 border-b border-line/10 flex items-center px-2 gap-2 bg-line/5 shrink-0 z-50 select-none relative" data-help-id="ui.timeline" onContextMenu={handleContextMenu}>
            <div className="flex items-center gap-1 pr-2 mr-1" data-help-id="anim.transport">
                <button onClick={stop} className="icon-btn"><StopIcon /></button>
                <button onClick={isPlaying ? pause : play} className={`p-1.5 rounded text-fg ${isPlaying ? (isRecordingModulation ? 'bg-danger-strong animate-pulse' : 'bg-accent-700') : 'bg-fg-ghost hover:bg-fg-faint'}`} title="Space">
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>

                {/* Auto Key */}
                <button onClick={toggleRecording} className={`icon-btn ${isRecording ? 'text-danger bg-danger/10 shadow-[inset_0_0_8px_rgb(var(--danger)/0.2)]' : 'hover:text-danger'}`} title="Auto-Keyframe Mode (Record)">
                    <RecordIcon active={isRecording} />
                </button>

                {/* Modulation Record Arm */}
                <button
                    onClick={toggleArmModulation}
                    disabled={isPlaying && !isRecordingModulation}
                    className={`icon-btn ${
                        isRecordingModulation ? 'text-fg bg-danger-strong animate-pulse' :
                        isArmingModulation ? 'text-danger bg-danger/15 border border-danger/40' :
                        'hover:text-danger'
                    }`}
                    title={isRecordingModulation ? "Recording Modulation..." : isArmingModulation ? "Modulation Record Armed (Press Play)" : "Record Audio/LFO Modulation"}
                >
                    <WaveRecordIcon active={isRecordingModulation} arming={isArmingModulation} />
                </button>

                {/* Loop Toggle */}
                <button
                    onClick={() => setLoopMode(loopMode === 'Loop' ? 'Once' : 'Loop')}
                    className={`icon-btn ${loopMode === 'Loop' ? 'text-ok' : 'text-fg-dim'}`}
                    title={loopMode === 'Loop' ? "Looping" : "Play Once"}
                >
                    <LoopIcon mode={loopMode} />
                </button>
            </div>

            {/* View Switcher: Dark Background, No external dividers, Wider Padding */}
            <div className="flex items-center h-full px-1">
                <div className="flex bg-surface rounded-md px-3 py-1 gap-2 shadow-sm items-center border border-line/10">
                    <button
                        onClick={() => setMode('DopeSheet')}
                        className={`icon-btn ${mode === 'DopeSheet' ? 'icon-btn-active' : ''}`}
                        title="Dope Sheet"
                        style={{ height: '20px', width: '26px' }}
                    >
                        <BarsIcon active={mode==='DopeSheet'}/>
                    </button>
                    <button
                        onClick={() => setMode('Graph')}
                        className={`icon-btn ${mode === 'Graph' ? 'icon-btn-active' : ''}`}
                        title="Curve Editor"
                        data-help-id="anim.graph"
                        style={{ height: '20px', width: '26px' }}
                    >
                        <CurveIcon active={mode==='Graph'}/>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1.5 t-label pl-1 pr-3">
                <span className="text-fg-faint">FRM</span>
                <div className="w-10 h-5 bg-surface-sunken rounded border border-line/10 relative">
                    <DraggableNumber
                        value={Math.floor(currentFrame)}
                        onChange={handleSeek}
                        onMiddleChange={seek}
                        step={1}
                        min={0}
                        max={durationFrames}
                        highlight
                        overrideText={Math.floor(currentFrame).toFixed(0)}
                    />
                </div>
            </div>

            <KeyCamButton />

            {/* HORIZONTAL NAVIGATOR (SLIDER) */}
            <TimeNavigator
                totalWidth={totalContentWidth}
                viewportWidth={viewportWidth}
                scrollLeft={scrollLeft}
                onScroll={onScroll}
                onZoom={onZoom as (val: number, type: 'factor' | 'absolute') => void}
                containerRef={containerRef}
                frameWidth={frameWidth}
                durationFrames={durationFrames}
            />

            <div className="flex gap-2">
                <div className="flex items-center gap-1 t-label">
                    <span className="text-fg-faint">LEN</span>
                    <div className="w-10 h-5 bg-surface-sunken rounded border border-line/10 relative">
                        <DraggableNumber
                            value={storeDuration}
                            onChange={setDuration}
                            step={1} min={10} max={10000}
                            overrideText={storeDuration.toFixed(0)}
                            onDragStart={snapshot}
                            sensitivity={0.15}
                        />
                    </div>
                </div>

                {RenderPopupComponent && <div className="w-px bg-line/10 h-4 mx-1" />}

                {RenderPopupComponent && (
                    <button
                        onClick={() => setShowRender(!showRender)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors text-[10px] ${showRender ? 'bg-accent-900 border-accent-500 text-fg' : 'bg-transparent border-line/20 text-fg-muted hover:text-fg hover:bg-line/5'}`}
                        title="Render Video"
                        data-help-id="export.video"
                    >
                        <CheckeredFlagIcon />
                        <span className="font-bold">Render</span>
                    </button>
                )}
            </div>

            <div className="relative" ref={menuRef}>
                <button
                    ref={menuButtonRef}
                    onClick={toggleMenu}
                    className={`ml-1 icon-btn ${showMenu ? 'bg-line/20 text-fg' : ''}`}
                >
                    <MenuIcon />
                </button>
                {showMenu && menuPos && createPortal((
                    <div
                        ref={menuPanelRef}
                        className="fixed w-48 bg-surface-raised border border-line/20 rounded shadow-xl z-[100] p-1 flex flex-col gap-1"
                        style={{ top: menuPos.top, right: menuPos.right }}
                    >

                        <div className="flex items-center justify-between px-3 py-2 text-xs text-fg-tertiary">
                            <span className="font-bold">FPS</span>
                            <div className="w-12 h-5 bg-surface-sunken rounded border border-line/10 relative">
                                <DraggableNumber
                                    value={fps}
                                    onChange={(v) => setFps(v, fpsMode)}
                                    step={1} min={1} max={120}
                                    overrideText={fps.toFixed(0)}
                                />
                            </div>
                        </div>
                        <div
                            className="flex items-center justify-between px-3 pb-2 -mt-1 text-[10px] text-fg-muted"
                            title={
                                fpsMode === 'keep'
                                    ? "Keep frames: keys stay at the same frame index (visual time shifts)."
                                    : "Match time: keys are remapped so wall-clock time is preserved (frame * new/old). Adjacent frames may merge at large ratios."
                            }
                        >
                            <span>On FPS change</span>
                            <div className="flex bg-surface-section border border-line/10 rounded overflow-hidden">
                                <button
                                    className={`px-2 py-0.5 ${fpsMode === 'keep' ? 'bg-accent-700 text-fg' : 'text-fg-muted hover:bg-line/5'}`}
                                    onClick={() => setFpsMode('keep')}
                                >Keep frames</button>
                                <button
                                    className={`px-2 py-0.5 ${fpsMode === 'match' ? 'bg-accent-700 text-fg' : 'text-fg-muted hover:bg-line/5'}`}
                                    onClick={() => setFpsMode('match')}
                                >Match time</button>
                            </div>
                        </div>

                        <button
                            onClick={() => { toggleRecordCamera(); }}
                            className="flex items-center justify-between px-3 py-2 text-xs text-fg-tertiary hover:bg-line/10 rounded transition-colors"
                        >
                            <span>Record Camera</span>
                            {recordCamera && <span className="text-accent-400"><CheckIcon /></span>}
                        </button>

                        <button
                            onClick={() => { setDeterministicPlayback(!deterministicPlayback); }}
                            className="flex items-center justify-between px-3 py-2 text-xs text-fg-tertiary hover:bg-line/10 rounded transition-colors"
                            title="Throttle live playback to the project FPS so the preview matches the exported video frame-for-frame, regardless of monitor refresh."
                        >
                            <span>Deterministic Playback</span>
                            {deterministicPlayback && <span className="text-accent-400"><CheckIcon /></span>}
                        </button>

                        {renderAdjuncts.length > 0 && (
                            <>
                                <div className="h-px bg-line/10 mx-1"/>
                                {renderAdjuncts.map((adj) => (
                                    <button
                                        key={adj.label}
                                        onClick={() => { setActiveAdjunct(adj); setShowMenu(false); }}
                                        className="text-left px-3 py-2 text-xs text-fg-tertiary hover:bg-line/10 rounded transition-colors"
                                        title={adj.title}
                                    >
                                        {adj.label}
                                    </button>
                                ))}
                            </>
                        )}

                        <div className="h-px bg-line/10 mx-1"/>
                        <button
                            onClick={() => { deleteAllKeys(); setShowMenu(false); }}
                            className="text-left px-3 py-2 text-xs text-fg-tertiary hover:bg-line/10 rounded transition-colors"
                        >
                            Delete All Keys
                        </button>
                        <button
                            onClick={() => { deleteAllTracks(); setShowMenu(false); }}
                            className="text-left px-3 py-2 text-xs text-danger hover:bg-danger/10 hover:text-danger rounded transition-colors"
                        >
                            Delete All Tracks
                        </button>
                    </div>
                ), document.body)}
            </div>

            <button onClick={onClose} className="ml-1 icon-btn" title="Close Timeline">
                <CloseIcon />
            </button>

            {showRender && RenderPopupComponent && <RenderPopupComponent onClose={() => setShowRender(false)} />}

            {activeAdjunct && <activeAdjunct.Dialog onClose={() => setActiveAdjunct(null)} />}
        </div>
    );
};
