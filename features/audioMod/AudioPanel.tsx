
import React, { useState, useEffect, useRef } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { audioAnalysisEngine } from './AudioAnalysisEngine';
import { AudioSpectrum } from './AudioSpectrum';
import { AudioLinkControls } from './AudioLinkControls';
import { collectHelpIds } from '../../utils/helpUtils';
import Slider from '../../components/Slider';
import { PlayIcon, PauseIcon, StopIcon, UploadIcon, PlusIcon, CloseIcon } from '../../components/Icons';

// --- DECK COMPONENT ---
const AudioDeck = ({ index, label, onClose, isActive }: { index: 0 | 1, label: string, onClose?: () => void, isActive: boolean }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState({ duration: 1, currentTime: 0, hasTrack: false, fileName: null as string | null });
    const [isPlaying, setIsPlaying] = useState(false);

    // Poll playback status
    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            const info = audioAnalysisEngine.getTrackInfo(index);
            setStatus(info);
            // Auto-sync playing state if track ends
            if (info.currentTime >= info.duration && isPlaying) setIsPlaying(false);
        }, 100); 
        return () => clearInterval(interval);
    }, [index, isActive, isPlaying]);

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
        <div className="flex flex-col bg-white/5 border border-white/10 rounded overflow-hidden relative group">
            {/* Background Progress Bar */}
            <div 
                className="absolute inset-0 bg-cyan-900/20 origin-left pointer-events-none transition-transform duration-200 ease-linear"
                style={{ transform: `scaleX(${progress / 100})` }}
            />
            
            <div className="flex items-center p-1 gap-2 relative z-10">
                {/* Play/Pause */}
                <button 
                    onClick={togglePlay} 
                    disabled={!status.hasTrack}
                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isPlaying ? 'text-green-400 bg-green-900/30' : 'text-gray-400 hover:text-white bg-white/5'}`}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>

                {/* Track Info & Seek */}
                <div className="flex-1 flex flex-col justify-center min-w-0 h-8 relative">
                    <div className="flex justify-between items-baseline">
                         <span className="text-[9px] font-bold text-gray-400 truncate pr-2" title={status.fileName || "No File"}>
                             {status.fileName || label}
                         </span>
                         <span className="text-[8px] font-mono text-cyan-500">
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
                        className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
                        title="Load File"
                    >
                        <UploadIcon />
                    </button>
                    {onClose && (
                        <button 
                            onClick={() => {
                                audioAnalysisEngine.stop(index);
                                setIsPlaying(false);
                                onClose();
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
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

// --- COLLAPSED MODULATION LIST COMPONENT ---
const AudioModulationList: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const store = useFractalStore();
    const { modulation, selectModulation, removeModulation } = store;
    
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
        <div className="bg-black/30 border border-white/10 rounded mb-2 overflow-hidden">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-3 py-2 flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase">Active Links</span>
                    <span className="text-[9px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded">
                        {allRules.length}
                    </span>
                </div>
                <span className="text-gray-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
            </button>
            
            {isExpanded && (
                <div className="max-h-32 overflow-y-auto custom-scroll">
                    {allRules.map((rule, index) => {
                        const isSelected = rule.id === selectedId;
                        const targetName = rule.target.split('.').pop() || 'Param';
                        const isAudio = rule.source === 'audio';
                        return (
                            <div 
                                key={rule.id}
                                onClick={() => selectModulation(rule.id)}
                                className={`px-3 py-1.5 flex justify-between items-center cursor-pointer text-[10px] border-b border-white/5 last:border-0 transition-colors ${
                                    isSelected ? 'bg-cyan-900/30 text-cyan-300' : 'text-gray-400 hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: rule.color }}
                                    />
                                    <span className="font-mono">{index + 1}. {targetName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[8px] px-1 rounded ${isAudio ? 'bg-purple-900/50 text-purple-300' : 'bg-green-900/50 text-green-300'}`}>
                                        {getSourceLabel(rule.source)}
                                    </span>
                                    {isAudio && (
                                        <span className="text-gray-600">
                                            {Math.round(rule.freqStart * 100)}-{Math.round(rule.freqEnd * 100)}%
                                        </span>
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeModulation(rule.id); }}
                                        className="text-red-500/50 hover:text-red-400 px-1"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

interface AudioPanelProps {
    className?: string;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({ className = "-m-3" }) => {
    const { audio, setAudio } = useFractalStore();
    const { isEnabled, gain, smoothing } = audio; // Added smoothing from store
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    
    // UI State for Decks
    const [deck1Active, setDeck1Active] = useState(false);
    const [deck2Active, setDeck2Active] = useState(false);
    const [crossfade, setCrossfade] = useState(0.5);

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
    
    // Initialize engine with current gain on mount
    useEffect(() => {
        audioAnalysisEngine.setMasterGain(gain ?? 0.8);
    }, []);

    return (
        <div 
            className={`flex flex-col h-full select-none ${className}`} 
            data-help-id="panel.audio"
            onContextMenu={handleContextMenu}
        >
             {/* Header */}
             <div className="p-2 bg-black/40 border-b border-white/5">
                 <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-900'}`} />
                        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Audio Engine</h3>
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
                 </div>
                 
                 {/* Live Inputs */}
                 <div className="flex gap-1 mb-2" data-help-id="audio.sources">
                     <button onClick={() => audioAnalysisEngine.connectMicrophone()} className="flex-1 py-1.5 bg-gray-800 hover:bg-white/10 text-[9px] font-bold text-gray-400 hover:text-white rounded border border-white/5 uppercase transition-all">
                         Microphone
                     </button>
                     <button onClick={() => audioAnalysisEngine.connectSystemAudio()} className="flex-1 py-1.5 bg-gray-800 hover:bg-white/10 text-[9px] font-bold text-gray-400 hover:text-white rounded border border-white/5 uppercase transition-all">
                         System Audio
                     </button>
                 </div>

                 {/* Decks */}
                 <div className="flex flex-col gap-1">
                     {!deck1Active && !deck2Active && (
                         <button 
                            onClick={() => setDeck1Active(true)}
                            className="w-full py-2 border border-dashed border-white/10 rounded text-[9px] text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all uppercase font-bold"
                         >
                             + Load Audio File
                         </button>
                     )}

                     <AudioDeck index={0} label="Track A" isActive={deck1Active} onClose={() => setDeck1Active(false)} />
                     
                     {deck1Active && !deck2Active && (
                         <div className="flex justify-center -my-1 z-10">
                             <button 
                                onClick={() => setDeck2Active(true)} 
                                className="bg-black border border-white/20 rounded-full w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
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
