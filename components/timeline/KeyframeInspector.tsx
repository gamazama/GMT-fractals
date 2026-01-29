
import React, { useMemo } from 'react';
import { useAnimationStore } from '../../store/animationStore';
import Slider, { DraggableNumber } from '../Slider';
import { animationEngine } from '../../engine/AnimationEngine';
import { Keyframe, SoftSelectionType } from '../../types';
import * as THREE from 'three';
import { getTangentStats, updateTangentFromStats } from '../../utils/timelineUtils';
import { TrashIcon, LinkIcon, BrokenIcon } from '../Icons';

interface ActionBtnProps {
    label: string;
    onClick: () => void;
    title: string;
    active?: boolean;
}

const ActionBtn = ({ label, onClick, title, active }: ActionBtnProps) => (
    <button
        onClick={onClick}
        className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wide rounded border transition-colors ${
            active 
            ? 'bg-cyan-900/50 text-cyan-300 border-cyan-500/50' 
            : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
        }`}
        title={title}
    >
        {label}
    </button>
);

const ToggleGroup = ({ options, value, onChange }: { options: {label: string, value: boolean}[], value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex bg-black/40 rounded p-0.5 border border-white/10 w-full">
        {options.map((opt) => (
            <button
                key={opt.label}
                onClick={() => onChange(opt.value)}
                className={`flex-1 py-1 text-[9px] font-bold uppercase rounded transition-colors flex items-center justify-center gap-1 ${
                    value === opt.value
                    ? 'bg-cyan-900 text-cyan-300 shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
            >
                {opt.value ? <BrokenIcon /> : <LinkIcon />}
                {opt.label}
            </button>
        ))}
    </div>
);

const InspectorRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex items-center justify-between h-[26px] bg-white/[0.02] border-b border-white/5 px-2">
        <label className="text-[10px] text-gray-400 font-medium tracking-tight w-24 shrink-0 truncate" title={label}>{label}</label>
        <div className="flex-1 min-w-0 flex justify-end">
            {children}
        </div>
    </div>
);

export const KeyframeInspector: React.FC = () => {
    const { 
        selectedKeyframeIds, 
        sequence, 
        updateKeyframes, 
        setTangents, 
        deleteSelectedKeyframes,
        snapshot,
        setIsScrubbing,
        softSelectionEnabled,
        softSelectionRadius,
        setSoftSelection,
        softSelectionType,
        setSoftSelectionType,
        setGlobalInterpolation
    } = useAnimationStore();

    // Analyze selection
    const selectedKeys = useMemo<{ tid: string, kid: string, key: Keyframe, prevKey?: Keyframe, nextKey?: Keyframe, isRotation: boolean }[]>(() => {
        const results: { tid: string, kid: string, key: Keyframe, prevKey?: Keyframe, nextKey?: Keyframe, isRotation: boolean }[] = [];
        
        selectedKeyframeIds.forEach(id => {
            if (!id) return;
            const [tid, kid] = id.split('::');
            const track = sequence.tracks[tid];
            const key = track?.keyframes.find(k => k.id === kid);
            
            if (track && key) {
                let prevKey: Keyframe | undefined;
                let nextKey: Keyframe | undefined;
                const idx = track.keyframes.indexOf(key);
                if (idx > 0) prevKey = track.keyframes[idx - 1];
                if (idx < track.keyframes.length - 1) nextKey = track.keyframes[idx + 1];
                
                results.push({ tid, kid, key, prevKey, nextKey, isRotation: tid.includes('rotation') });
            }
        });
        return results;
    }, [selectedKeyframeIds, sequence]);

    const hasSelection = selectedKeys.length > 0;
    const first = hasSelection ? selectedKeys[0] : null;
    const firstKey = first ? first.key! : null;
    
    const isAllRotation = hasSelection && selectedKeys.every(k => k.isRotation);
    const sameFrame = hasSelection && selectedKeys.every(x => Math.abs(x.key!.frame - firstKey!.frame) < 0.001);
    const sameValue = hasSelection && selectedKeys.every(x => Math.abs(x.key!.value - firstKey!.value) < 0.00001);
    const sameInterp = hasSelection && selectedKeys.every(x => x.key!.interpolation === firstKey!.interpolation);
    const sameBroken = hasSelection && selectedKeys.every(x => x.key!.brokenTangents === firstKey!.brokenTangents);
    const sameAuto = hasSelection && selectedKeys.every(x => x.key!.autoTangent === firstKey!.autoTangent);

    // --- QUICK ACTIONS ---
    const handleQuickAction = (type: 'Linear' | 'Auto' | 'Ease') => {
        if (!hasSelection) {
            // Global Mode: Apply to ALL keys
            if (type === 'Linear') setGlobalInterpolation('Linear');
            else if (type === 'Auto') setGlobalInterpolation('Bezier', 'Auto');
            else if (type === 'Ease') setGlobalInterpolation('Bezier', 'Ease');
            return;
        }

        // Selection Mode
        snapshot();
        
        if (type === 'Linear') {
            const updates = selectedKeys.map(item => ({ 
                trackId: item.tid!, 
                keyId: item.kid!, 
                patch: { interpolation: 'Linear' as const } 
            }));
            updateKeyframes(updates);
        } else {
            const needsConversion = selectedKeys.some(k => k.key!.interpolation !== 'Bezier');
            if (needsConversion) {
                const updates = selectedKeys.map(item => ({ 
                    trackId: item.tid!, 
                    keyId: item.kid!, 
                    patch: { interpolation: 'Bezier' as const } 
                }));
                updateKeyframes(updates);
            }
            setTangents(type);
        }
    };

    // --- TANGENT CALCULATION FOR UI ---
    const prevFrame = (hasSelection && first?.prevKey) ? first.prevKey.frame : (firstKey ? firstKey.frame - 10 : 0);
    const nextFrame = (hasSelection && first?.nextKey) ? first.nextKey.frame : (firstKey ? firstKey.frame + 10 : 10);
    
    const leftStats = hasSelection ? getTangentStats(firstKey!.leftTangent, firstKey!.frame - prevFrame, true) : { angle: 0, length: 0 };
    const rightStats = hasSelection ? getTangentStats(firstKey!.rightTangent, nextFrame - firstKey!.frame, false) : { angle: 0, length: 0 };

    const handleFrameChange = (v: number) => {
        if (!hasSelection) return;
        updateKeyframes(selectedKeys.map(x => ({ trackId: x.tid!, keyId: x.kid!, patch: { frame: Math.max(0, Math.round(v)) } })));
        animationEngine.scrub(Math.max(0, Math.round(v))); 
    };

    const handleValueChange = (v: number) => {
        if (!hasSelection) return;
        const valToStore = isAllRotation ? THREE.MathUtils.degToRad(v) : v;
        updateKeyframes(selectedKeys.map(x => ({ trackId: x.tid!, keyId: x.kid!, patch: { value: valToStore } })));
        const { currentFrame } = useAnimationStore.getState();
        animationEngine.scrub(currentFrame);
    };
    
    const handleBrokenToggle = (broken: boolean) => {
        if (broken) setTangents('Split'); else setTangents('Unified');
    };
    
    const handleTangentChange = (side: 'left' | 'right', field: 'angle' | 'length', val: number) => {
        if (!hasSelection) return;
        const updates = selectedKeys.map(item => {
            const k = item.key!;
            const pFrame = item.prevKey ? item.prevKey.frame : k.frame - 10;
            const nFrame = item.nextKey ? item.nextKey.frame : k.frame + 10;
            const lDist = k.frame - pFrame;
            const rDist = nFrame - k.frame;

            const curL = getTangentStats(k.leftTangent, lDist, true);
            const curR = getTangentStats(k.rightTangent, rDist, false);

            let angL = curL.angle;
            let lenL = curL.length;
            let angR = curR.angle;
            let lenR = curR.length;

            if (side === 'left') {
                if (field === 'angle') {
                    angL = val;
                    if (!k.brokenTangents) angR = val; 
                } else {
                    lenL = val;
                }
            } else {
                if (field === 'angle') {
                    angR = val;
                    if (!k.brokenTangents) angL = val; 
                } else {
                    lenR = val;
                }
            }

            return {
                trackId: item.tid!,
                keyId: item.kid!,
                patch: {
                    autoTangent: false,
                    leftTangent: updateTangentFromStats(true, angL, lenL, lDist),
                    rightTangent: updateTangentFromStats(false, angR, lenR, rDist)
                }
            };
        });
        updateKeyframes(updates);
        animationEngine.scrub(useAnimationStore.getState().currentFrame);
    };

    const handleDragStart = () => {
        snapshot();
        setIsScrubbing(true);
    };
    
    const handleDragEnd = () => setIsScrubbing(false);

    const displayValue = (hasSelection && firstKey) ? (isAllRotation ? THREE.MathUtils.radToDeg(firstKey.value) : firstKey.value) : 0;

    const uniqueTrackIds: string[] = Array.from(new Set(selectedKeys.map(k => k.tid)));
    const firstTrackId: string | null = uniqueTrackIds.length === 1 ? uniqueTrackIds[0] : null;

    const headerTitle = hasSelection 
        ? (firstTrackId && sequence.tracks[firstTrackId]
            ? `${sequence.tracks[firstTrackId].label} (${selectedKeys.length})`
            : `Attributes (${selectedKeys.length})`)
        : "Global Properties";

    return (
        <div className="w-64 bg-[#111] border-l border-white/10 flex flex-col shrink-0 overflow-y-auto animate-fade-in-left select-none h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5 shrink-0 h-8">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate mr-2" title={headerTitle}>
                    {headerTitle}
                </span>
                {hasSelection && (
                    <button onClick={deleteSelectedKeyframes} className="text-red-400 hover:text-red-300 p-1 hover:bg-white/10 rounded">
                        <TrashIcon />
                    </button>
                )}
            </div>

            {/* Quick Actions (Always Visible - Context Sensitive) */}
            <div className="flex gap-1 px-2 py-2 border-b border-white/5 bg-black/20">
                <ActionBtn 
                    label="Linear" 
                    onClick={() => handleQuickAction('Linear')} 
                    title={hasSelection ? "Set Selected Linear" : "Set All Keys Linear"} 
                    active={hasSelection && sameInterp && firstKey!.interpolation === 'Linear'}
                />
                <ActionBtn 
                    label="Smooth" 
                    onClick={() => handleQuickAction('Auto')} 
                    title={hasSelection ? "Set Selected Auto-Bezier" : "Set All Keys Auto-Bezier"} 
                    active={hasSelection && sameInterp && firstKey!.interpolation === 'Bezier' && sameAuto && firstKey!.autoTangent}
                />
                <ActionBtn 
                    label="Flat" 
                    onClick={() => handleQuickAction('Ease')} 
                    title={hasSelection ? "Set Selected Flat-Bezier" : "Set All Keys Flat-Bezier"} 
                />
            </div>
            
            {hasSelection ? (
                <div className="flex flex-col">
                    <InspectorRow label="Frame">
                        <div className="w-20">
                            {sameFrame ? (
                                <DraggableNumber value={firstKey!.frame} onChange={handleFrameChange} step={1} min={0} highlight onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                            ) : <div className="text-center text-[10px] text-gray-600">---</div>}
                        </div>
                    </InspectorRow>
                    
                    <InspectorRow label={isAllRotation ? "Value (Deg)" : "Value"}>
                        <div className="w-20">
                            {sameValue ? (
                                <DraggableNumber value={displayValue} onChange={handleValueChange} step={isAllRotation ? 1 : 0.01} highlight onDragStart={handleDragStart} onDragEnd={handleDragEnd} overrideText={displayValue.toFixed(3)} />
                            ) : <div className="text-center text-[10px] text-gray-600">---</div>}
                        </div>
                    </InspectorRow>

                    <InspectorRow label="Interpolation">
                        <select 
                            value={sameInterp ? firstKey!.interpolation : 'Mixed'}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                snapshot();
                                const val = e.target.value as 'Linear' | 'Step' | 'Bezier';
                                updateKeyframes(selectedKeys.map(x => ({ trackId: x.tid, keyId: x.kid, patch: { interpolation: val } })));
                            }}
                            className="bg-transparent text-[10px] text-cyan-400 font-bold outline-none text-right cursor-pointer w-20"
                        >
                            {(!sameInterp) && <option value="Mixed">Mixed</option>}
                            <option value="Bezier">Bezier</option>
                            <option value="Linear">Linear</option>
                            <option value="Step">Step</option>
                        </select>
                    </InspectorRow>

                    {/* --- SOFT SELECTION --- */}
                    <div className="border-t border-white/5 mt-2 bg-purple-900/10">
                        <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5" onClick={() => setSoftSelection(softSelectionRadius || 10, !softSelectionEnabled)}>
                            <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider">Soft Selection</span>
                            <div className={`w-2 h-2 rounded-full ${softSelectionEnabled ? 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]' : 'bg-gray-700'}`} />
                        </div>
                        {softSelectionEnabled && (
                            <div className="px-3 pb-2 pt-1 animate-fade-in space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] text-gray-400 font-medium">Falloff</label>
                                    <select 
                                        value={softSelectionType}
                                        onChange={(e) => setSoftSelectionType(e.target.value as SoftSelectionType)}
                                        className="bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[9px] text-purple-300 outline-none cursor-pointer"
                                    >
                                        <option value="Linear">Linear</option>
                                        <option value="Dome">Dome</option>
                                        <option value="S-Curve">S-Curve</option>
                                        <option value="Pinpoint">Pinpoint</option>
                                    </select>
                                </div>
                                <Slider 
                                    label="Radius (Frames)" 
                                    value={softSelectionRadius} 
                                    min={0} max={100} step={1} 
                                    onChange={(v) => setSoftSelection(v, true)}
                                    highlight
                                />
                                <div className="text-[8px] text-gray-500 italic pl-1">
                                    Ctrl+Drag Key to adjust size
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tangent Controls - Only for Bezier */}
                    {firstKey!.interpolation === 'Bezier' && (
                        <>
                            <div className="px-3 py-2 border-y border-white/5 bg-black/20 mt-2">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Tangents</span>
                                
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <span className="text-[8px] text-gray-500 font-bold block mb-1">LEFT HANDLE</span>
                                        <div className="flex flex-col gap-1 pl-1 border-l border-white/5">
                                            <div className="flex justify-between items-center h-5">
                                                <span className="text-[9px] text-gray-400">Angle</span> 
                                                <div className="w-12 bg-black/40 rounded px-1">
                                                    <DraggableNumber value={leftStats.angle} onChange={v => handleTangentChange('left','angle',v)} step={1} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center h-5">
                                                <span className="text-[9px] text-gray-400">Weight</span> 
                                                <div className="w-12 bg-black/40 rounded px-1">
                                                    <DraggableNumber value={leftStats.length} onChange={v => handleTangentChange('left','length',v)} step={1} min={0} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[8px] text-gray-500 font-bold block mb-1">RIGHT HANDLE</span>
                                        <div className="flex flex-col gap-1 pl-1 border-l border-white/5">
                                            <div className="flex justify-between items-center h-5">
                                                <span className="text-[9px] text-gray-400">Angle</span> 
                                                <div className="w-12 bg-black/40 rounded px-1">
                                                    <DraggableNumber value={rightStats.angle} onChange={v => handleTangentChange('right','angle',v)} step={1} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center h-5">
                                                <span className="text-[9px] text-gray-400">Weight</span> 
                                                <div className="w-12 bg-black/40 rounded px-1">
                                                    <DraggableNumber value={rightStats.length} onChange={v => handleTangentChange('right','length',v)} step={1} min={0} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <ToggleGroup 
                                    value={sameBroken ? !!firstKey!.brokenTangents : false}
                                    onChange={handleBrokenToggle}
                                    options={[
                                        { label: 'Unified', value: false },
                                        { label: 'Broken', value: true }
                                    ]}
                                />
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="p-4 text-[9px] text-gray-500 italic text-center leading-relaxed opacity-75">
                    No keys selected.<br/><br/>
                    Use the buttons above to change interpolation for <strong>the entire animation</strong>.
                </div>
            )}
        </div>
    );
};
