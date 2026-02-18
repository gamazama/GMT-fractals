
import React, { useState, useEffect, useRef } from 'react';
import { TimeNavigator } from './TimeNavigator';
import { useAnimationStore } from '../../store/animationStore';
import { useFractalStore } from '../../store/fractalStore';
import { RenderPopup } from './RenderPopup';
import { DraggableNumber } from '../Slider';
import { animationEngine } from '../../engine/AnimationEngine';
import { collectHelpIds } from '../../utils/helpUtils';
import { CloseIcon, MenuIcon, KeyStatus, LoopIcon, WaveRecordIcon } from '../Icons'; 
import { KeyframeButton } from '../KeyframeButton'; 
import { getLiveValue, evaluateTrackValue } from '../../utils/timelineUtils';
import { 
    PlayIcon, PauseIcon, StopIcon, RecordIcon, CameraKeyIcon, 
    BarsIcon, CurveIcon, CheckeredFlagIcon, CheckIcon 
} from '../Icons';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';

// Extracted Component for Camera Key Logic & Subscriptions
const KeyCamButton = () => {
    const { sequence, currentFrame, isPlaying, captureCameraFrame } = useAnimationStore();
    
    // Subscribe to scene changes to update "Dirty" state when camera moves
    useFractalStore(s => [s.cameraPos, s.cameraRot, s.sceneOffset]);

    const handleKeyCam = () => {
        captureCameraFrame(currentFrame);
        FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, 'camera.unified.x');
    };

    const getStatus = (): KeyStatus => {
        const tracks = [
            'camera.unified.x', 'camera.unified.y', 'camera.unified.z', 
            'camera.rotation.x', 'camera.rotation.y', 'camera.rotation.z'
        ];
        
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
                        // Check against interpolated value
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
                status === 'keyed' ? 'bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 border-amber-500/30' :
                status === 'keyed-dirty' ? 'bg-red-900/40 hover:bg-red-800/60 text-red-200 border-red-500/30' :
                status === 'dirty' ? 'bg-red-900/20 hover:bg-red-800/40 text-red-200 border-red-500/20' :
                status === 'partial' ? 'bg-amber-900/20 hover:bg-amber-800/40 text-amber-100/70 border-amber-500/20' :
                'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
            }`}
            data-help-id="anim.camera"
            onClick={handleKeyCam}
            title="Keyframe Camera (Position + Rotation)"
        >
            <KeyframeButton status={status} onClick={handleKeyCam} />
            <span className="text-[10px] font-bold tracking-wide">KEY CAM</span>
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
    onZoom: (val: number, type: 'factor' | 'absolute') => void;
    onClose: () => void;
    containerRef?: React.RefObject<HTMLDivElement>;
    frameWidth: number;
    durationFrames: number;
    inspectorVisible?: boolean;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
    mode, setMode, totalContentWidth, viewportWidth, scrollLeft, onScroll, onZoom, onClose, containerRef, frameWidth, durationFrames, inspectorVisible
}) => {
    const { 
        isPlaying, isRecording, currentFrame, fps, durationFrames: storeDuration, recordCamera, loopMode,
        isArmingModulation, isRecordingModulation,
        play, pause, stop, toggleRecording, setFps, setDuration, captureCameraFrame, seek, deleteAllKeys, deleteAllTracks, snapshot, toggleRecordCamera,
        setLoopMode, toggleArmModulation
    } = useAnimationStore();

    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    const [showRender, setShowRender] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
        <div className="h-8 border-b border-white/10 flex items-center px-2 gap-2 bg-white/5 shrink-0 z-50 select-none relative" data-help-id="ui.timeline" onContextMenu={handleContextMenu}>
            <div className="flex items-center gap-1 pr-2 mr-1" data-help-id="anim.transport">
                <button onClick={stop} className="icon-btn"><StopIcon /></button>
                <button onClick={isPlaying ? pause : play} className={`p-1.5 rounded text-white ${isPlaying ? (isRecordingModulation ? 'bg-red-600 animate-pulse' : 'bg-cyan-700') : 'bg-gray-700 hover:bg-gray-600'}`} title="Space">
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                
                {/* Auto Key */}
                <button onClick={toggleRecording} className={`icon-btn ${isRecording ? 'text-red-500 bg-red-900/20 shadow-[inset_0_0_8px_rgba(239,68,68,0.2)]' : 'hover:text-red-400'}`} title="Auto-Keyframe Mode (Record)">
                    <RecordIcon active={isRecording} />
                </button>

                {/* Modulation Record Arm */}
                <button 
                    onClick={toggleArmModulation} 
                    disabled={isPlaying && !isRecordingModulation}
                    className={`icon-btn ${
                        isRecordingModulation ? 'text-white bg-red-600 animate-pulse' : 
                        isArmingModulation ? 'text-red-200 bg-red-900/40 border border-red-500/40' :
                        'hover:text-red-200'
                    }`} 
                    title={isRecordingModulation ? "Recording Modulation..." : isArmingModulation ? "Modulation Record Armed (Press Play)" : "Record Audio/LFO Modulation"}
                >
                    <WaveRecordIcon active={isRecordingModulation} arming={isArmingModulation} />
                </button>

                {/* Loop Toggle */}
                <button 
                    onClick={() => setLoopMode(loopMode === 'Loop' ? 'Once' : 'Loop')}
                    className={`icon-btn ${loopMode === 'Loop' ? 'text-green-400' : 'text-gray-500'}`}
                    title={loopMode === 'Loop' ? "Looping" : "Play Once"}
                >
                    <LoopIcon mode={loopMode} />
                </button>
            </div>
            
            {/* View Switcher: Dark Background, No external dividers, Wider Padding */}
            <div className="flex items-center h-full px-1">
                <div className="flex bg-black rounded-md px-3 py-1 gap-2 shadow-sm items-center border border-white/10">
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
                <span className="text-gray-600">FRM</span>
                <div className="w-10 h-5 bg-black/40 rounded border border-white/10 relative">
                    <DraggableNumber 
                        value={Math.floor(currentFrame)} 
                        onChange={handleSeek} 
                        onMiddleChange={seek} // Only move playhead, don't scrub engine
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
                onZoom={onZoom}
                containerRef={containerRef}
                frameWidth={frameWidth}
                durationFrames={durationFrames}
            />

            <div className="flex gap-2">
                <div className="flex items-center gap-1 t-label">
                    <span className="text-gray-600">LEN</span>
                    <div className="w-10 h-5 bg-black/40 rounded border border-white/10 relative">
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
                
                <div className="w-px bg-white/10 h-4 mx-1" />
                
                <button
                    onClick={() => setShowRender(!showRender)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors text-[10px] uppercase ${showRender ? 'bg-cyan-900 border-cyan-500 text-white' : 'bg-transparent border-gray-700 text-gray-400 hover:text-white hover:bg-white/5'}`}
                    title="Render Video"
                    data-help-id="export.video"
                >
                    <CheckeredFlagIcon />
                    <span className="font-bold">RENDER</span>
                </button>
            </div>
            
            <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className={`ml-1 icon-btn ${showMenu ? 'bg-white/20 text-white' : ''}`}
                >
                    <MenuIcon />
                </button>
                {showMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1f3a] border border-white/20 rounded shadow-xl z-50 p-1 flex flex-col gap-1">
                        <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-300">
                            <span className="font-bold">FPS</span>
                            <div className="w-12 h-5 bg-black/40 rounded border border-white/10 relative">
                                <DraggableNumber 
                                    value={fps} 
                                    onChange={setFps} 
                                    step={1} min={1} max={120} 
                                    overrideText={fps.toFixed(0)}
                                    onDragStart={snapshot}
                                />
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => { toggleRecordCamera(); }}
                            className="flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:bg-white/10 rounded transition-colors"
                        >
                            <span>Record Camera</span>
                            {recordCamera && <span className="text-cyan-400"><CheckIcon /></span>}
                        </button>
                        
                        <div className="h-px bg-white/10 mx-1"/>
                        <button 
                            onClick={() => { deleteAllKeys(); setShowMenu(false); }}
                            className="text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 rounded transition-colors"
                        >
                            Delete All Keys
                        </button>
                        <button 
                            onClick={() => { deleteAllTracks(); setShowMenu(false); }}
                            className="text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded transition-colors"
                        >
                            Delete All Tracks
                        </button>
                    </div>
                )}
            </div>

            <button onClick={onClose} className="ml-1 icon-btn" title="Close Timeline">
                <CloseIcon />
            </button>
            
            {showRender && <RenderPopup onClose={() => setShowRender(false)} />}
        </div>
    );
};
