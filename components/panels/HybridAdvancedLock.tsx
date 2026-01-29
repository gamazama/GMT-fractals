
import React, { useState } from 'react';
import Slider from '../Slider';
import ToggleSwitch from '../ToggleSwitch';
import { GeometryState } from '../../features/geometry';
import { FeatureComponentProps } from '../registry/ComponentRegistry';
import { FractalEvents } from '../../engine/FractalEvents';
import { CloseIcon, AlertIcon } from '../Icons';

export const HybridAdvancedLock: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    const geom = sliceState as GeometryState;
    const isUnlocked = geom.hybridComplex;
    const [showDialog, setShowDialog] = useState(false);
    
    const setGeometry = (actions as any).setGeometry;

    const handleUnlock = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Trigger Loading UI
        FractalEvents.emit('is_compiling', "Optimizing Shader...");
        
        // Defer actual switch to allow UI paint
        setTimeout(() => {
            setGeometry({ hybridComplex: true });
            setShowDialog(false);
        }, 50);
    };

    const handleLockedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowDialog(true);
    };

    return (
        <div className="relative mt-2 pt-2 border-t border-white/5">
            {/* The Controls Area */}
            <div 
                className={`transition-all duration-300 ${!isUnlocked ? 'opacity-30 blur-[0.5px] pointer-events-none grayscale' : ''}`}
            >
                <div className="flex items-center gap-1 mb-1">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Advanced Mixing</span>
                </div>
                
                <Slider 
                    label="Box Skip (Mod)" 
                    value={geom.hybridSkip} 
                    min={1} max={8} step={1} 
                    onChange={(v) => setGeometry({ hybridSkip: v })}
                    overrideInputText={
                        Math.round(geom.hybridSkip) <= 1 ? "Consecutive" :
                        Math.round(geom.hybridSkip) === 2 ? "Every 2nd" :
                        `Every ${Math.round(geom.hybridSkip)}th`
                    }
                    trackId="geometry.hybridSkip"
                />
                
                <div className="grid grid-cols-2 gap-1 mt-1">
                    {/* Fix: Removed unsupported 'description' prop from ToggleSwitch component */}
                    <ToggleSwitch 
                        label="Protect Folds"
                        value={geom.hybridProtect}
                        onChange={(v) => setGeometry({ hybridProtect: v })}
                    />
                    <ToggleSwitch 
                        label="Swap Order"
                        value={geom.hybridSwap}
                        onChange={(v) => setGeometry({ hybridSwap: v })}
                    />
                </div>
            </div>

            {/* Minimal Grey Overlay */}
            {!isUnlocked && !showDialog && (
                <div 
                    className="absolute inset-0 cursor-pointer z-10 bg-gray-900/50 hover:bg-gray-800/40 transition-colors flex items-center justify-center group rounded"
                    onClick={handleLockedClick}
                    title="Click to enable Advanced Hybrid Mode"
                >
                    {/* Subtle Lock Icon on Hover */}
                    <div className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                             <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                             <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                         </svg>
                    </div>
                </div>
            )}

            {/* Warning Dialog */}
            {showDialog && (
                <div className="absolute top-[-20px] left-0 right-0 z-50 animate-pop-in">
                    <div 
                        className="bg-black/95 border border-white/20 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-colors"
                        onClick={handleUnlock}
                    >
                         <div className="flex items-start justify-between p-2 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-2 text-gray-300">
                                <AlertIcon />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Advanced Shader</span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowDialog(false); }}
                                className="text-gray-500 hover:text-white -mt-0.5 -mr-0.5 p-1"
                            >
                                <CloseIcon />
                            </button>
                         </div>
                         
                         <div className="p-3">
                             <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
                                 Enable Advanced Hybrid Integration?<br/>
                                 This allows <strong>alternating formulas</strong> between Box Folds and the Main Fractal.<br/><br/>
                                 <span className="text-orange-300">Compilation may take 30-60 seconds.</span>
                             </p>
                             
                             <div className="flex items-center justify-center p-1.5 bg-white/5 rounded border border-white/10 text-cyan-400 text-[9px] font-bold uppercase tracking-widest group-hover:bg-cyan-900/30 group-hover:text-cyan-200 group-hover:border-cyan-500/30 transition-all">
                                 Click to Load
                             </div>
                         </div>
                    </div>
                    {/* Backdrop to close */}
                    <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setShowDialog(false); }} />
                </div>
            )}
        </div>
    );
};
