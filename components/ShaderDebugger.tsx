
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { FractalEvents } from '../engine/FractalEvents';
import { engine } from '../engine/FractalEngine';
import DraggableWindow from './DraggableWindow';
import { useFractalStore } from '../store/fractalStore';

// Add a global listener to show the window when code is generated, 
// but wrapped in a component to access state
export const ShaderDebuggerGlobalWrapper = () => {
    const isOpen = useFractalStore(s => s.debugTools?.shaderDebuggerOpen);
    const setDebugTools = (useFractalStore.getState() as any).setDebugTools;
    
    const setIsOpen = (val: boolean) => {
        if(setDebugTools) setDebugTools({ shaderDebuggerOpen: val });
    };
    
    useEffect(() => {
        // @ts-ignore
        window.openShaderDebugger = () => setIsOpen(true);
    }, []);

    if (!isOpen) return null;

    return (
        <DraggableWindow 
            title="GLSL Debugger" 
            initialPos={{ x: 20, y: window.innerHeight - 400 }} 
            onClose={() => setIsOpen(false)}
            initialSize={{ width: 640, height: 480 }}
            zIndex={600}
        >
             <ShaderDebuggerContent onClose={() => setIsOpen(false)} />
        </DraggableWindow>
    );
};

// Also expose a manual trigger for the console
declare global {
    interface Window {
        openShaderDebugger: () => void;
    }
}

const ShaderDebuggerContent = ({ onClose }: { onClose: () => void }) => {
    // Pull initial code from engine to avoid "Waiting..." state on mount
    const [code, setCode] = useState(engine.lastGeneratedFrag || "// Waiting for compilation...");
    const [sourceType, setSourceType] = useState<'Generator' | 'GLSL' | 'Translated'>('Generator');
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [copyStatus, setCopyStatus] = useState<string>("");

    useEffect(() => {
        // Only update automatically if viewing the Generator output
        if (sourceType === 'Generator') {
            const unsub = FractalEvents.on('shader_code', (c) => setCode(c));
            return unsub;
        }
    }, [sourceType]);
    
    // Analyze Code Health
    const stats = useMemo(() => {
        const lines = code.split('\n').length;
        const size = code.length;
        
        // Keywords that suggest loops are intact
        const hasLoops = /for\s*\(|while\s*\(|loop\s*\{/i.test(code);
        
        // Heuristics for "Bloat" (Unrolled loops usually cause massive line counts)
        // 5000 lines is arbitrary but standard fractal shaders are usually < 2000
        const isBloated = lines > 5000;
        
        let health: 'Good' | 'Warn' | 'Critical' = 'Good';
        let message = "Structure looks optimized.";
        
        if (sourceType === 'Translated') {
            if (isBloated) {
                health = 'Critical';
                message = "CRITICAL: Excessive code size. Loop likely unrolled.";
            } else if (!hasLoops) {
                // Not necessarily bad if code is simple, but suspicious for a fractal
                health = 'Warn';
                message = "Warning: No loop instructions found in output.";
            }
        }
        
        return { lines, size, health, message };
    }, [code, sourceType]);

    const handleCopy = () => {
        if (textAreaRef.current) {
            textAreaRef.current.select();
            document.execCommand('copy');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).catch(() => {});
            }
            setCopyStatus("Copied!");
            setTimeout(() => setCopyStatus(""), 2000);
        }
    };
    
    const handleCopyForAI = () => {
        const promptWrapper = `
You are an expert GLSL Fractal shader engineer. 
Below is the current raw GLSL fragment shader from my engine. 
The engine uses Raymarching with a Distance Estimator (DE).

I want you to modify this code. 
- Maintain the existing uniforms and function signatures.
- Focus on the 'formula_' function or the 'DE' function.
- Do not remove the 'DE_MASTER' structure.

Here is the code:

\`\`\`glsl
${code}
\`\`\`

My Request: 
`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(promptWrapper).catch(() => {});
            setCopyStatus("Copied Context!");
            setTimeout(() => setCopyStatus(""), 2000);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fractal_${sourceType.toLowerCase()}_${Date.now()}.glsl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const fetchCompiled = () => {
        console.log("ShaderDebugger: Fetching compiled GLSL...");
        const compiled = engine.getCompiledFragmentShader();
        if (compiled) {
            setCode(compiled);
            setSourceType('GLSL');
        } else {
            alert("Could not fetch compiled source. Is the renderer active?");
        }
    };
    
    const fetchTranslated = () => {
        console.log("ShaderDebugger: Fetching translated source (ANGLE)...");
        const translated = engine.getTranslatedFragmentShader();
        if (translated) {
            setCode(translated);
            setSourceType('Translated');
        } else {
            alert("Could not fetch translated source.\n\nPossible reasons:\n1. Browser doesn't support WEBGL_debug_shaders\n2. Privacy settings block debug extensions\n3. Not on Windows (DirectX/ANGLE)");
        }
    };
    
    const showGenerator = () => {
        setCode(engine.lastGeneratedFrag);
        setSourceType('Generator');
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex flex-col gap-2 mb-2 bg-black/20 p-2 rounded">
                <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                        <button onClick={showGenerator} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded border transition-colors ${sourceType === 'Generator' ? 'bg-cyan-900/40 border-cyan-600 text-cyan-200' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
                            Generator
                        </button>
                        <button onClick={fetchCompiled} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded border transition-colors ${sourceType === 'GLSL' ? 'bg-green-900/40 border-green-600 text-green-200' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
                            Driver GLSL
                        </button>
                        <button onClick={fetchTranslated} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded border transition-colors ${sourceType === 'Translated' ? 'bg-amber-900/40 border-amber-600 text-amber-200' : 'bg-gray-800 border-gray-600 text-gray-400'}`} title="View ANGLE/HLSL output to check loop unrolling">
                            Translated (ANGLE)
                        </button>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                         {copyStatus && <span className="text-[9px] text-green-400 font-bold animate-fade-in">{copyStatus}</span>}
                        <button 
                            onClick={handleCopyForAI} 
                            className="px-2 py-1 bg-purple-900/30 hover:bg-purple-800 text-purple-300 text-[10px] rounded border border-purple-800 transition-colors flex items-center gap-1"
                            title="Copy code wrapped in a prompt for ChatGPT/Claude"
                        >
                            <span>✨</span> Copy for AI
                        </button>
                        <button 
                            onClick={handleDownload} 
                            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded border border-gray-600 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                    <div className="flex gap-4 text-[10px] font-mono text-gray-400">
                        <span>Lines: <span className="text-white">{stats.lines.toLocaleString()}</span></span>
                        <span>Size: <span className="text-white">{(stats.size / 1024).toFixed(1)} KB</span></span>
                    </div>
                    
                    <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-2 ${
                        stats.health === 'Good' ? 'bg-green-900/20 text-green-400 border-green-500/30' :
                        stats.health === 'Warn' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' :
                        'bg-red-900/20 text-red-400 border-red-500/30'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${
                            stats.health === 'Good' ? 'bg-green-500' :
                            stats.health === 'Warn' ? 'bg-yellow-500 animate-pulse' :
                            'bg-red-500 animate-ping'
                        }`} />
                        {stats.message}
                    </div>
                </div>
            </div>
            
            <div className="relative flex-1 min-h-0">
                {sourceType !== 'Generator' && (
                    <div className="absolute top-2 right-4 pointer-events-none bg-amber-500/10 text-amber-500 px-2 py-1 rounded text-[8px] font-bold border border-amber-500/20 backdrop-blur-sm z-10">
                        READ ONLY (GPU MEMORY)
                    </div>
                )}
                <textarea 
                    ref={textAreaRef}
                    className={`w-full h-full font-mono text-[10px] p-2 resize-none outline-none border rounded custom-scroll whitespace-pre ${
                        sourceType === 'Translated' 
                        ? 'bg-[#0f0b00] text-amber-200/80 border-amber-900/30' 
                        : sourceType === 'GLSL' 
                            ? 'bg-[#000f05] text-green-200/80 border-green-900/30'
                            : 'bg-[#080808] text-gray-300 border-white/10'
                    }`}
                    value={code}
                    readOnly
                    spellCheck={false}
                />
            </div>
        </div>
    );
};

export const ShaderDebugger = () => null;
