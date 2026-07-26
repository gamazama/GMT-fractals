
import React, { useState, useEffect, useRef } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { audioAnalysisEngine } from './AudioAnalysisEngine';
import { formatBand } from './freqScale';
import { filterBank, BANK_MIN_HZ, TILT_MAX_DB_PER_OCT } from './filterBank';
import { AudioSpectrum } from './AudioSpectrum';
import { AudioLinkControls } from './AudioLinkControls';
import { collectHelpIds } from '../../../utils/helpUtils';
import Slider from '../../../components/Slider';
import { PlayIcon, PauseIcon, StopIcon, UploadIcon, PlusIcon, CloseIcon } from '../../../components/Icons';
import { CollapsibleSection } from '../../../components/CollapsibleSection';
import { DotToggle } from '../../../components/DotToggle';

// --- DECK COMPONENT ---
const AudioDeck = ({ index, label, onClose, isActive }: { index: 0 | 1, label: string, onClose?: () => void, isActive: boolean }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState(() => {
        const info = audioAnalysisEngine.getTrackInfo(index);
        return { duration: info.duration, currentTime: info.currentTime, hasTrack: info.hasTrack, fileName: info.fileName };
    });
    const [isPlaying, setIsPlaying] = useState(() => audioAnalysisEngine.getTrackInfo(index).isPlaying);

    // Poll playback status — also syncs isPlaying from the engine
    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            const info = audioAnalysisEngine.getTrackInfo(index);
            setStatus(info);
            setIsPlaying(info.isPlaying);
        }, 100);
        return () => clearInterval(interval);
    }, [index, isActive]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            audioAnalysisEngine.loadTrack(index, e.target.files[0]);
            // Auto-start
            setTimeout(() => {
                audioAnalysisEngine.play(index);
                setIsPlaying(true);
            }, 100);
        }
        e.target.value = '';
    };

    const togglePlay = () => {
        if (isPlaying) audioAnalysisEngine.pause(index);
        else audioAnalysisEngine.play(index);
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (val: number) => {
        audioAnalysisEngine.seek(index, val);
    };

    const progress = (status.currentTime / Math.max(0.1, status.duration)) * 100;

    if (!isActive) return null;

    return (
        <div className="flex flex-col bg-line/5 border border-line/10 rounded overflow-hidden relative group">
            {/* Background Progress Bar */}
            <div
                className="absolute inset-0 bg-accent-900/20 origin-left pointer-events-none transition-transform duration-200 ease-linear"
                style={{ transform: `scaleX(${progress / 100})` }}
            />

            <div className="flex items-center p-1 gap-2 relative z-10">
                {/* Play/Pause */}
                <button
                    onClick={togglePlay}
                    disabled={!status.hasTrack}
                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isPlaying ? 'text-ok bg-ok/15' : 'text-fg-muted hover:text-fg bg-line/5'}`}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>

                {/* Track Info & Seek */}
                <div className="flex-1 flex flex-col justify-center min-w-0 h-8 relative">
                    <div className="flex justify-between items-baseline">
                         <span className="text-[9px] font-bold text-fg-muted truncate pr-2" title={status.fileName || "No File"}>
                             {status.fileName || label}
                         </span>
                         <span className="text-[8px] font-mono text-accent-500">
                            {Math.floor(status.currentTime / 60)}:{Math.floor(status.currentTime % 60).toString().padStart(2, '0')}
                         </span>
                    </div>

                    {/* Invisible Seek Slider Overlay */}
                    <input
                        type="range"
                        min={0} max={status.duration} step={0.1}
                        value={status.currentTime}
                        onChange={(e) => handleSeek(parseFloat(e.target.value))}
                        disabled={!status.hasTrack}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                        title="Drag to Seek"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 text-fg-dim hover:text-accent-400 transition-colors"
                        title="Load File"
                    >
                        <UploadIcon />
                    </button>
                    {onClose && (
                        <button
                            onClick={() => {
                                audioAnalysisEngine.deactivateDeck(index);
                                setIsPlaying(false);
                                onClose();
                            }}
                            className="p-1 text-fg-dim hover:text-danger transition-colors"
                            title="Remove Track"
                        >
                            <CloseIcon />
                        </button>
                    )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFile} />
            </div>
        </div>
    );
};

// --- LIVE INPUT (mic / line-in / system audio) ---
// Split out of AudioPanel because it owns real device state: which input is
// running, what the browser will let us name it, and the trim + level readout
// that tell a performer whether the signal is usable BEFORE they trust it.
const LiveInputControls: React.FC = () => {
    const { audio, setAudio } = useEngineStore();
    const inputGain = audio?.inputGain ?? 1;

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [running, setRunning] = useState(() => ({
        kind: audioAnalysisEngine.inputKind,
        deviceId: audioAnalysisEngine.inputDeviceId,
        label: audioAnalysisEngine.inputDeviceLabel,
    }));
    const [error, setError] = useState<string | null>(null);
    const [peak, setPeak] = useState(0);

    const refreshDevices = () => { audioAnalysisEngine.listInputDevices().then(setDevices); };

    // Device list + running-input mirror. `devicechange` fires when an
    // interface is plugged in mid-set, which is exactly when the list is
    // stale and the user is in a hurry.
    useEffect(() => {
        refreshDevices();
        const sync = () => setRunning({
            kind: audioAnalysisEngine.inputKind,
            deviceId: audioAnalysisEngine.inputDeviceId,
            label: audioAnalysisEngine.inputDeviceLabel,
        });
        const offInput = audioAnalysisEngine.onInputChange(() => { sync(); refreshDevices(); });
        const md = navigator.mediaDevices;
        md?.addEventListener?.('devicechange', refreshDevices);
        return () => {
            offInput();
            md?.removeEventListener?.('devicechange', refreshDevices);
        };
    }, []);

    // Level meter. Only while a live input is running — a deck-only session
    // has nothing to trim, and an idle rAF at 20 Hz is still an idle rAF.
    const isLive = running.kind !== 'none';
    useEffect(() => {
        if (!isLive || !audio?.isEnabled) { setPeak(0); return; }
        let raf = 0;
        let last = 0;
        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            if (t - last < 50) return;   // 20 Hz is plenty for a meter
            last = t;
            setPeak(audioAnalysisEngine.getPeakLevel());
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [isLive, audio?.isEnabled]);

    const connect = async (deviceId?: string | null) => {
        setError(null);
        const ok = await audioAnalysisEngine.connectMicrophone(deviceId);
        if (!ok) setError('Could not open that input — check the browser mic permission.');
        else refreshDevices();  // labels populate once permission is granted
    };

    const connectSystem = async () => {
        setError(null);
        const ok = await audioAnalysisEngine.connectSystemAudio();
        if (!ok) setError('No audio track shared — tick "Share system audio" in the dialog.');
    };

    const handleTrim = (v: number) => {
        setAudio({ inputGain: v });
        audioAnalysisEngine.setInputGain(v);
    };

    // Clip warning at 0.98: the FFT is 8-bit, so a pinned bin has already lost
    // the transient shape the envelope follower keys off.
    const hot = peak > 0.98;
    const quiet = isLive && peak > 0 && peak < 0.15;

    return (
        <div className="mb-2" data-help-id="audio.sources">
            <div className="flex gap-1 mb-1">
                <button
                    onClick={() => connect(running.deviceId)}
                    className={`flex-1 py-1.5 text-[9px] font-bold rounded border transition-all ${
                        running.kind === 'mic'
                            ? 'bg-ok/15 border-ok/30 text-ok'
                            : 'bg-surface-header hover:bg-line/10 border-line/5 text-fg-muted hover:text-fg'
                    }`}
                >
                    {running.kind === 'mic' ? 'Live Input ●' : 'Mic / Line In'}
                </button>
                <button
                    onClick={connectSystem}
                    className={`flex-1 py-1.5 text-[9px] font-bold rounded border transition-all ${
                        running.kind === 'system'
                            ? 'bg-ok/15 border-ok/30 text-ok'
                            : 'bg-surface-header hover:bg-line/10 border-line/5 text-fg-muted hover:text-fg'
                    }`}
                >
                    {running.kind === 'system' ? 'System ●' : 'System Audio'}
                </button>
                {isLive && (
                    <button
                        onClick={() => audioAnalysisEngine.disconnectLiveInput()}
                        className="px-2 py-1.5 text-[9px] font-bold rounded border border-line/5 bg-surface-header text-fg-dim hover:text-danger transition-all"
                        title="Release the input device"
                    >
                        Stop
                    </button>
                )}
            </div>

            {/* Device picker. Labels are blank until the origin holds mic
                permission, so an unconnected first run shows "Input 1, 2…". */}
            {devices.length > 0 && (
                <select
                    value={running.kind === 'mic' ? (running.deviceId ?? '') : ''}
                    onChange={(e) => connect(e.target.value || null)}
                    className="t-select w-full text-[9px] mb-1"
                    title="Which hardware input to analyse"
                >
                    <option value="">System default input</option>
                    {devices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Input ${i + 1}`}
                        </option>
                    ))}
                </select>
            )}

            {/* Trim + level. The meter is the point: it answers "is this signal
                strong enough to gate on?" without guessing from the spectrum. */}
            {isLive && (
                <div className="flex items-center gap-2">
                    <Slider
                        label="Input Trim"
                        value={inputGain}
                        min={0} max={8} step={0.05}
                        onChange={handleTrim}
                        className="flex-1"
                    />
                    <div
                        className="w-14 h-2 bg-line/10 rounded overflow-hidden shrink-0"
                        title={`Input level ${Math.round(peak * 100)}%`}
                    >
                        <div
                            className={`h-full origin-left transition-transform duration-75 ${
                                hot ? 'bg-danger' : quiet ? 'bg-warn' : 'bg-ok'
                            }`}
                            style={{ transform: `scaleX(${peak})` }}
                        />
                    </div>
                </div>
            )}

            {(error || hot || quiet) && (
                <div className={`text-[8px] mt-1 leading-snug ${error || hot ? 'text-danger' : 'text-warn'}`}>
                    {error
                        ?? (hot
                            ? 'Input is clipping — lower the trim (or the desk send) so peaks stop pinning.'
                            : 'Input is very quiet — raise the trim until peaks reach most of the meter.')}
                </div>
            )}
        </div>
    );
};

// --- ANALYSIS SETTINGS (FFT size + dynamic range) ---
// Collapsed by default: these are set-once-per-venue controls, not performance
// controls. They live here rather than in the auto-panel because they read
// clearly only next to the live bin-width readout.
const AnalysisControls: React.FC = () => {
    const { audio, setAudio } = useEngineStore();
    const fftSize = audio?.fftSize ?? 4096;
    const dbFloor = audio?.dbFloor ?? -90;
    const dbCeiling = audio?.dbCeiling ?? -10;
    const bandsPerOctave = audio?.bandsPerOctave ?? 6;
    const windowMs = (fftSize / audioAnalysisEngine.sampleRate) * 1000;
    const analysisFailed = audioAnalysisEngine.analysisFailed;

    return (
        <CollapsibleSection
            label="Analysis"
            defaultOpen={false}
            labelColor="text-fg-tertiary"
            className="bg-surface-section border border-line/10 rounded mt-2 overflow-hidden"
            headerClassName="px-3 py-1.5 bg-line/5 hover:bg-line/10"
            rightContent={
                <span className="text-[8px] font-mono text-fg-faint">
                    {filterBank.bands.length} bands · {windowMs.toFixed(0)} ms
                </span>
            }
        >
            <div className="p-2 flex flex-col gap-2">
                <div>
                    <label className="text-[9px] text-fg-dim font-bold block mb-1">Band Width</label>
                    <select
                        value={bandsPerOctave}
                        onChange={(e) => setAudio({ bandsPerOctave: parseInt(e.target.value, 10) })}
                        className="t-select w-full text-[9px]"
                        title="How finely the spectrum is divided into musical bands"
                    >
                        <option value={3}>Wide — 1/3 octave</option>
                        <option value={6}>Medium — 1/6 octave</option>
                        <option value={12}>Narrow — 1/12 octave</option>
                    </select>
                    {/* The honest limit: a band narrower than one FFT bin can't
                        resolve, so say where that starts instead of hiding it.
                        Those bands also render dimmed on the spectrum. */}
                    <p className="text-[8px] text-fg-faint mt-1 leading-snug">
                        Bands are equal musical width, so bass gets as many as treble.
                        Below <b>{filterBank.resolutionLimitHz.toFixed(0)} Hz</b> they are finer
                        than this Detail setting can resolve — shown dimmed. Raise Detail to
                        push that lower.
                    </p>
                </div>

                {/* Analysis runs on the audio thread and there is no fallback
                    by design, so a load failure has to be visible rather than
                    silently inert. @see docs/adr/0110-*.md */}
                {analysisFailed && (
                    <p className="text-[8px] text-danger leading-snug">
                        Audio analysis failed to start — modulation will not respond.
                        Check the browser console.
                    </p>
                )}

                {/* Fixed tilt — a constant dB ramp, NOT adaptive gain. Sits
                    above Balance Bands because it is the answer that one is
                    usually reached for. @see docs/adr/0105-*.md */}
                <div>
                    <Slider
                        label="Tilt"
                        value={audio?.spectralTilt ?? 3}
                        min={0} max={TILT_MAX_DB_PER_OCT} step={0.5}
                        onChange={(v) => setAudio({ spectralTilt: v })}
                    />
                    <p className="text-[8px] text-fg-faint mt-1 leading-snug">
                        Lifts the highs to offset music's natural roll-off — {' '}
                        <b>{(audio?.spectralTilt ?? 3).toFixed(1)} dB/octave</b>, so
                        16 kHz reads {' '}
                        <b>+{((audio?.spectralTilt ?? 3) * Math.log2(16000 / BANK_MIN_HZ)).toFixed(0)} dB</b>
                        {' '} against 25 Hz. A fixed offset, so it costs no dynamics.
                        0 is the raw spectrum.
                    </p>
                </div>

                <label
                    className="flex items-center gap-2 cursor-pointer"
                    title="Let each band self-calibrate against its own recent peak"
                >
                    <DotToggle
                        value={audio?.normalizeBands ?? false}
                        onChange={(v) => setAudio({ normalizeBands: v })}
                        accent="cyan"
                        size="sm"
                    />
                    <span className="text-[9px] font-bold text-fg-muted">Balance Bands</span>
                </label>
                <p className="text-[8px] text-fg-faint -mt-1 leading-snug">
                    Every band uses its full range regardless of how loud it is in absolute
                    terms — hi-hats react as readily as a kick. Costs spectral contrast,
                    though: off usually reads better.
                </p>

                <div>
                    <label className="text-[9px] text-fg-dim font-bold block mb-1">Detail</label>
                    <select
                        value={fftSize}
                        onChange={(e) => setAudio({ fftSize: parseInt(e.target.value, 10) })}
                        className="t-select w-full text-[9px]"
                        title="Finer bins separate bass better; coarser bins react faster to attacks"
                    >
                        <option value={2048}>Fast — 23 Hz bins, punchy attacks</option>
                        <option value={4096}>Balanced — 12 Hz bins</option>
                        <option value={8192}>Fine — 6 Hz bins, bass detail</option>
                    </select>
                    <p className="text-[8px] text-fg-faint mt-1 leading-snug">
                        Finer bins resolve a kick from its harmonics, but widen the analysis
                        window — which softens how sharply Transient mode fires.
                    </p>
                </div>
                <Slider
                    label="Floor"
                    value={dbFloor}
                    min={-120} max={-40} step={1}
                    onChange={(v) => setAudio({ dbFloor: v })}
                />
                <Slider
                    label="Ceiling"
                    value={dbCeiling}
                    min={-40} max={0} step={1}
                    onChange={(v) => setAudio({ dbCeiling: v })}
                />
                <p className="text-[8px] text-fg-faint leading-snug">
                    Floor/Ceiling set the loudness window the spectrum maps onto. Narrow it
                    for more contrast; widen it if peaks are saturating into a flat wall.
                </p>
            </div>
        </CollapsibleSection>
    );
};

// --- COLLAPSED MODULATION LIST COMPONENT ---
const AudioModulationList: React.FC = () => {
    const store = useEngineStore();
    const { modulation, selectModulation, removeModulation, audio, setAudio } = store;
    const updateRule = (id: string, enabled: boolean) => {
        (store as any).updateModulation({ id, update: { enabled } });
    };
    const audioEnabled = audio?.isEnabled ?? false;

    // Show ALL modulation rules (audio + LFOs)
    const allRules = modulation.rules;

    if (allRules.length === 0) return null;

    const selectedId = modulation.selectedRuleId;

    // Get source label
    const getSourceLabel = (source: string) => {
        if (source === 'audio') return 'AUD';
        if (source.startsWith('lfo')) return source.toUpperCase();
        return source;
    };

    return (
        <CollapsibleSection
            label="Active Links"
            count={allRules.length}
            defaultOpen={false}
            labelColor="text-accent-400"
            className="bg-surface-section border border-line/10 rounded mb-2 overflow-hidden"
            headerClassName="px-3 py-2 bg-line/5 hover:bg-line/10"
            rightContent={
                <DotToggle
                    value={audioEnabled}
                    onChange={(v) => setAudio({ isEnabled: v })}
                    accent="cyan"
                    variant="master"
                    stopPropagation
                    title={audioEnabled ? 'Disable audio modulation' : 'Enable audio modulation'}
                />
            }
        >
            <div className="max-h-32 overflow-y-auto custom-scroll">
                {allRules.map((rule, index) => {
                    const isSelected = rule.id === selectedId;
                    const targetName = rule.target.split('.').pop() || 'Param';
                    const isAudio = rule.source === 'audio';
                    const dim = !rule.enabled;
                    return (
                        <div
                            key={rule.id}
                            onClick={() => selectModulation(rule.id)}
                            className={`px-3 py-1.5 flex justify-between items-center cursor-pointer text-[10px] border-b border-line/5 last:border-0 transition-colors ${
                                isSelected ? 'bg-accent-900/30 text-accent-300' : 'text-fg-muted hover:bg-line/5'
                            } ${dim ? 'opacity-50' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: rule.color }}
                                />
                                <span className="font-mono">{index + 1}. {targetName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[8px] px-1 rounded ${dim ? 'bg-line/5 text-fg-dim' : (isAudio ? 'bg-secondary/30 text-secondary' : 'bg-ok/30 text-ok')}`}>
                                    {getSourceLabel(rule.source)}
                                </span>
                                {isAudio && (
                                    <span className="text-fg-faint">
                                        {formatBand(rule.lowHz, rule.highHz)}
                                    </span>
                                )}
                                <DotToggle
                                    value={rule.enabled}
                                    onChange={(v) => updateRule(rule.id, v)}
                                    accent="cyan"
                                    size="sm"
                                    stopPropagation
                                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeModulation(rule.id); }}
                                    className="text-danger/50 hover:text-danger px-1"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </CollapsibleSection>
    );
};

interface AudioPanelProps {
    className?: string;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({ className = '' }) => {
    const { audio, setAudio } = useEngineStore();
    const { isEnabled, gain, smoothing } = audio; // Added smoothing from store
    const openGlobalMenu = useEngineStore(s => s.openContextMenu);

    // UI State for Decks — restore from engine singleton
    const [deck1Active, setDeck1Active] = useState(() => audioAnalysisEngine.getTrackInfo(0).isActive);
    const [deck2Active, setDeck2Active] = useState(() => audioAnalysisEngine.getTrackInfo(1).isActive);
    const [crossfade, setCrossfade] = useState(() => audioAnalysisEngine.crossfade);

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    const onCrossfade = (v: number) => {
        setCrossfade(v);
        audioAnalysisEngine.setCrossfade(v);
    };

    const handleSmoothing = (v: number) => {
        setAudio({ smoothing: v });
        audioAnalysisEngine.setSmoothing(v);
    };

    const handleGain = (v: number) => {
        setAudio({ gain: v });
        audioAnalysisEngine.setMasterGain(v);
    };

    // Push the store's persisted analysis settings into the WebAudio graph. The
    // graph is a module singleton that outlives any panel, but a scene load can
    // change these values while the panel is closed, so re-assert on open — and
    // whenever they change, since fftSize / dB range are graph state with no
    // other writer.
    useEffect(() => {
        audioAnalysisEngine.setMasterGain(gain ?? 0.8);
        audioAnalysisEngine.setInputGain(audio?.inputGain ?? 1);
    }, []);

    useEffect(() => {
        audioAnalysisEngine.setFftSize(audio?.fftSize ?? 4096);
    }, [audio?.fftSize]);

    useEffect(() => {
        audioAnalysisEngine.setDecibelRange(audio?.dbFloor ?? -90, audio?.dbCeiling ?? -10);
    }, [audio?.dbFloor, audio?.dbCeiling]);

    return (
        <div
            className={`flex flex-col h-full select-none ${className}`}
            data-help-id="panel.audio"
            onContextMenu={handleContextMenu}
        >
             {/* Header */}
             <div className="p-2 bg-surface-tabbar border-b border-line/5">
                 <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-ok-strong animate-pulse' : 'bg-danger/40'}`} />
                        <h3 className="text-[10px] font-bold text-fg-tertiary">Audio Engine</h3>
                     </div>
                     <Slider
                        label="FFT Smooth"
                        value={smoothing || 0.8}
                        min={0} max={0.99} step={0.01}
                        onChange={handleSmoothing}
                        className="w-28"
                    />
                     <Slider
                        label="Volume"
                        value={gain ?? 0.8}
                        min={0} max={2} step={0.01}
                        onChange={handleGain}
                        className="w-28"
                    />
                    {/* Auto Gain — the "the DJ changed track and everything
                        stopped reacting" fix. Sits next to FFT Smooth because
                        both shape the signal before any rule sees it. */}
                    <label
                        className="flex items-center gap-1.5 shrink-0 cursor-pointer"
                        title="Normalise the input level so thresholds keep working when the music gets quieter or louder"
                    >
                        <DotToggle
                            value={audio?.agcEnabled ?? false}
                            onChange={(v) => setAudio({ agcEnabled: v })}
                            accent="cyan"
                            size="sm"
                        />
                        <span className="text-[9px] font-bold text-fg-muted">Auto Gain</span>
                    </label>
                 </div>

                 {/* Live Inputs */}
                 <LiveInputControls />

                 <AnalysisControls />

                 {/* Decks */}
                 <div className="flex flex-col gap-1">
                     {!deck1Active && !deck2Active && (
                         <button
                            onClick={() => setDeck1Active(true)}
                            className="w-full py-2 border border-dashed border-line/10 rounded text-[9px] text-fg-dim hover:text-accent-400 hover:border-accent-500/30 transition-all font-bold"
                         >
                             + Load Audio File
                         </button>
                     )}

                     <AudioDeck index={0} label="Track A" isActive={deck1Active} onClose={() => setDeck1Active(false)} />

                     {deck1Active && !deck2Active && (
                         <div className="flex justify-center -my-1 z-10">
                             <button
                                onClick={() => setDeck2Active(true)}
                                className="bg-surface-sunken border border-line/20 rounded-full w-5 h-5 flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-header transition-colors"
                                title="Add 2nd Track"
                             >
                                 <PlusIcon />
                             </button>
                         </div>
                     )}

                     <AudioDeck index={1} label="Track B" isActive={deck2Active} onClose={() => setDeck2Active(false)} />

                     {deck2Active && (
                        <div className="px-2 pt-1">
                             <Slider
                                label="Crossfade"
                                value={crossfade}
                                min={0} max={1} step={0.01}
                                onChange={onCrossfade}
                             />
                        </div>
                     )}
                 </div>
             </div>

             <div className={`flex-1 overflow-y-auto custom-scroll p-1`}>
                 <AudioModulationList />
                 <AudioSpectrum />
                 <AudioLinkControls featureId="audio" sliceState={{}} actions={{}} />
             </div>
        </div>
    );
};
