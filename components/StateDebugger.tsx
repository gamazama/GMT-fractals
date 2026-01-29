
import React, { useState } from 'react';
import DraggableWindow from './DraggableWindow';
import { useFractalStore } from '../store/fractalStore';
import { Preset } from '../types';
import { parseShareString } from '../utils/Sharing';

export const StateDebugger = () => {
    // Updated Selector
    const isOpen = useFractalStore(s => s.debugTools?.stateDebuggerOpen);
    const setDebugTools = (useFractalStore.getState() as any).setDebugTools;
    
    const setIsOpen = (val: boolean) => {
        if(setDebugTools) setDebugTools({ stateDebuggerOpen: val });
    };

    const loadPreset = useFractalStore(s => s.loadPreset);
    const getCurrentPreset = useFractalStore(s => s.getPreset);
    
    const [inputStr, setInputStr] = useState('');
    const [jsonOutput, setJsonOutput] = useState('');
    const [decodedPreset, setDecodedPreset] = useState<Preset | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDecode = () => {
        setError(null);
        setDecodedPreset(null);
        
        let cleanStr = inputStr.trim();
        
        // Handle full URL copy-paste
        if (cleanStr.includes('#s=')) {
            cleanStr = cleanStr.split('#s=')[1];
        }
        
        if (!cleanStr) {
            setError("Empty string");
            return;
        }

        // Use the centralized parser to ensure exact parity with App startup/loading
        const result = parseShareString(cleanStr);

        if (result) {
            setJsonOutput(JSON.stringify(result, null, 2));
            setDecodedPreset(result);
        } else {
            setError("Decoder returned null. String might be malformed or incompatible.");
        }
    };

    const handleApply = () => {
        if (decodedPreset) {
            loadPreset(decodedPreset);
            setIsOpen(false);
        }
    };

    const handleDumpCurrent = () => {
        const current = getCurrentPreset({ includeScene: true });
        setJsonOutput(JSON.stringify(current, null, 2));
        setInputStr(""); // Clear input to avoid confusion
        setDecodedPreset(null); // Not loading from string
    };

    if (!isOpen) return null;

    return (
        <DraggableWindow 
            title="State & URL Debugger" 
            initialPos={{ x: 100, y: 100 }} 
            initialSize={{ width: 500, height: 600 }}
            onClose={() => setIsOpen(false)}
            zIndex={200}
        >
            <div className="flex flex-col h-full gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Input (URL Hash or Base64)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-cyan-500"
                            placeholder="Paste #s=... string here"
                            value={inputStr}
                            onChange={(e) => setInputStr(e.target.value)}
                        />
                        <button 
                            onClick={handleDecode}
                            className="px-3 py-1 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-300 text-xs font-bold rounded border border-cyan-500/30"
                        >
                            Decode
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 border-b border-white/10 pb-2">
                    <button 
                        onClick={handleDumpCurrent}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-bold uppercase rounded border border-white/10"
                    >
                        Dump Current State
                    </button>
                    {decodedPreset && (
                         <button 
                            onClick={handleApply}
                            className="px-3 py-1.5 bg-green-900/50 hover:bg-green-800 text-green-300 text-[10px] font-bold uppercase rounded border border-green-500/30 ml-auto"
                        >
                            Apply Decoded to Scene
                        </button>
                    )}
                </div>

                {error && (
                    <div className="p-2 bg-red-900/30 border border-red-500/30 text-red-200 text-xs font-mono rounded">
                        {error}
                    </div>
                )}

                <div className="flex-1 flex flex-col min-h-0">
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">State Inspector (JSON)</label>
                    <textarea 
                        className="flex-1 bg-[#0a0a0a] border border-white/10 rounded p-2 text-[10px] font-mono text-green-400/80 resize-none outline-none custom-scroll"
                        value={jsonOutput}
                        readOnly
                    />
                </div>
            </div>
        </DraggableWindow>
    );
};
