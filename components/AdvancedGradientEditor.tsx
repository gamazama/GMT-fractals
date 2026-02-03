
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { GradientStop, GradientConfig, ColorSpaceMode } from '../types';
import { hexToRgb, rgbToHex, lerpRGB, getGradientCssString } from '../utils/colorUtils';
import Slider from './Slider';
import EmbeddedColorPicker from './EmbeddedColorPicker';
import { GRADIENT_PRESETS } from '../data/gradientPresets';
import Dropdown from './Dropdown';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';
import { ContextMenuItem } from '../types/help';
import { ContextMenu as PresetMenu } from './gradient/GradientContextMenu';
import { MenuIcon } from './Icons';

type InterpolationMode = 'linear' | 'step' | 'smooth' | 'cubic';

interface AdvancedGradientKnot {
    id: string;
    position: number;
    color: string;
    bias: number;
    interpolation: InterpolationMode;
}

interface DragPayload {
    type: 'knot' | 'bias' | 'bracket_move' | 'bracket_scale_left' | 'bracket_scale_right' | 'marquee';
    ids: string[];
    startX: number;
    startY: number;
    initialKnots: AdvancedGradientKnot[];
}

interface AdvancedGradientEditorProps {
    // Polymorphic input: Can be legacy Array OR new Object
    value: GradientStop[] | GradientConfig;
    onChange: (val: GradientStop[] | GradientConfig) => void;
    helpId?: string;
}

const getInterpolatedColor = (knots: AdvancedGradientKnot[], pos: number): string => {
    const sorted = [...knots].sort((a, b) => a.position - b.position);
    if (sorted.length === 0) return '#FFFFFF';
    if (pos <= sorted[0].position) return sorted[0].color;
    if (pos >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color;

    for (let i = 0; i < sorted.length - 1; i++) {
        if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
            const t = (pos - sorted[i].position) / (sorted[i + 1].position - sorted[i].position);
            const c1 = hexToRgb(sorted[i].color) || { r: 255, g: 255, b: 255 };
            const c2 = hexToRgb(sorted[i + 1].color) || { r: 255, g: 255, b: 255 };
            return rgbToHex(lerpRGB(c1, c2, t));
        }
    }
    return '#FFFFFF';
};

const BiasIcon = () => (
    <svg width="12" height="12" viewBox="0 0 10 10" className="fill-gray-700 hover:fill-white drop-shadow-md stroke-white stroke-[0.5] pointer-events-none">
        <path d="M 5 0 L 10 5 L 5 10 L 0 5 Z" />
    </svg>
);

const KnotIcon = ({ color, isSelected }: { color: string, isSelected: boolean }) => (
    <svg width="14" height="18" viewBox="0 0 14 18" className="drop-shadow-md pointer-events-none">
        <path 
            d="M 7 0 L 14 7 L 14 17 L 0 17 L 0 7 Z" 
            fill={color} 
            stroke={isSelected ? "white" : "#555"} 
            strokeWidth={isSelected ? "2" : "1"} 
        />
    </svg>
);

const AdvancedGradientEditor: React.FC<AdvancedGradientEditorProps> = ({ value, onChange, helpId }) => {
    // --- PARSE POLYMORPHIC INPUT ---
    // Extract Stops and ColorSpace from input. Default to sRGB if legacy array.
    const { stops, colorSpace } = useMemo(() => {
        if (Array.isArray(value)) {
            return { stops: value, colorSpace: 'srgb' as ColorSpaceMode };
        } else {
            return { stops: value.stops, colorSpace: value.colorSpace };
        }
    }, [value]);

    const [knots, setKnots] = useState<AdvancedGradientKnot[]>([]);
    
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useFractalStore();

    useEffect(() => {
        setKnots(stops.map(stop => ({
            id: stop.id, 
            position: stop.position, 
            color: stop.color,
            bias: stop.bias ?? 0.5,
            interpolation: (stop.interpolation as InterpolationMode) ?? 'linear'
        })).sort((a, b) => a.position - b.position));
    }, [stops]);

    const knotsRef = useRef(knots);
    useEffect(() => { knotsRef.current = knots; }, [knots]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExpanded, setIsExpanded] = useState(true);
    const [isBiasHandlesVisible, setIsBiasHandlesVisible] = useState(true);
    
    const dragPayloadRef = useRef<DragPayload | null>(null);
    const [isDragRemoving, setIsDragRemoving] = useState(false);
    const isDragRemovingRef = useRef(false);
    
    const [marqueeRect, setMarqueeRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);
    const [presetMenu, setPresetMenu] = useState<{x:number, y:number} | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const knotTrackRef = useRef<HTMLDivElement>(null);

    // --- OUTPUT LOGIC ---
    // Always emits the Object format if we detect we are in "Advanced Mode" (internal check), 
    // or if the input was already an object.
    // For safety, we simply ALWAYS emit the object now. The utils handle it fine.
    // The Store handles saving it.
    const emitChange = useCallback((newKnots: AdvancedGradientKnot[], newColorSpace?: ColorSpaceMode) => {
        const sorted = [...newKnots].sort((a, b) => a.position - b.position);
        setKnots(sorted);
        
        const newStops = sorted.map(({ id, position, color, bias, interpolation }) => ({ 
            id, position, color, bias, interpolation 
        }));

        onChangeRef.current({
            stops: newStops,
            colorSpace: newColorSpace || colorSpace
        });
    }, [colorSpace]);

    const cycleColorSpace = () => {
        handleInteractionStart('param');
        const nextMode = colorSpace === 'srgb' ? 'linear' : colorSpace === 'linear' ? 'aces_inverse' : 'srgb';
        emitChange(knots, nextMode);
        handleInteractionEnd();
    };

    const handleColorChange = useCallback((color: string) => {
        if (selectedIds.size > 0) {
            emitChange(knotsRef.current.map(k => selectedIds.has(k.id) ? { ...k, color } : k));
        }
    }, [selectedIds, emitChange]);

    const handleCopy = () => {
        const data = JSON.stringify({
            stops: knotsRef.current.map(({ position, color, bias, interpolation }) => ({ position, color, bias, interpolation })),
            colorSpace
        });
        navigator.clipboard.writeText(data);
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const data = JSON.parse(text);
            
            // Support pasting legacy array OR new object
            let newStops = [];
            let newSpace: ColorSpaceMode = 'srgb';

            if (Array.isArray(data)) {
                newStops = data;
            } else if (data.stops) {
                newStops = data.stops;
                newSpace = data.colorSpace || 'srgb';
            }

            if (newStops.length >= 2) {
                handleInteractionStart('param');
                const newKnots: AdvancedGradientKnot[] = newStops.map((k: any, i: number) => ({
                    id: `${Date.now()}_${i}`,
                    position: k.position,
                    color: k.color,
                    bias: k.bias ?? 0.5,
                    interpolation: (k.interpolation as InterpolationMode) ?? 'linear'
                }));
                emitChange(newKnots, newSpace);
                setSelectedIds(new Set());
                handleInteractionEnd();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadPreset = (presetStops: GradientStop[]) => {
        handleInteractionStart('param');
        const newKnots: AdvancedGradientKnot[] = presetStops.map((s, i) => ({
             id: `${Date.now()}_${i}`,
             position: s.position,
             color: s.color,
             bias: s.bias ?? 0.5,
             interpolation: (s.interpolation as InterpolationMode) ?? 'linear'
        }));
        emitChange(newKnots, 'srgb'); // Presets default to sRGB
        setSelectedIds(new Set());
        handleInteractionEnd();
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const payload = dragPayloadRef.current;
        if (!payload) return;
        
        const { type, ids, startX, startY, initialKnots } = payload;
        const trackRect = knotTrackRef.current?.getBoundingClientRect();
        if (!trackRect) return;

        const deltaX = e.clientX - startX;
        const deltaXRatio = deltaX / trackRect.width;

        if (type === 'marquee') {
            setMarqueeRect({ 
                x: Math.min(startX, e.clientX), 
                y: Math.min(startY, e.clientY), 
                w: Math.abs(e.clientX - startX), 
                h: Math.abs(e.clientY - startY) 
            });
            return;
        }

        if (type === 'knot' || type === 'bracket_move') {
            const vDist = Math.abs(e.clientY - (trackRect.top + trackRect.height / 2));
            const hDist = Math.max(0, trackRect.left - e.clientX, e.clientX - trackRect.right);
            const isPullingAway = (vDist > 50 || hDist > 50) && initialKnots.length > ids.length;
            
            if (isDragRemovingRef.current !== isPullingAway) {
                isDragRemovingRef.current = isPullingAway;
                setIsDragRemoving(isPullingAway);
                document.body.style.cursor = isPullingAway ? 'no-drop' : 'ew-resize';
            }

            const updatedKnots = initialKnots.map(k => {
                if (ids.includes(k.id)) {
                    let newPos = Math.max(0, Math.min(1, k.position + deltaXRatio));
                    if (e.shiftKey) newPos = Math.round(newPos * 20) / 20;
                    return { ...k, position: newPos };
                }
                return k;
            });
            
            emitChange(updatedKnots);
        }

        if (type.startsWith('bracket_scale')) {
             const selectedKnotsInitial = initialKnots.filter(k => ids.includes(k.id));
             if (selectedKnotsInitial.length < 2) return;

             const initMin = Math.min(...selectedKnotsInitial.map(k => k.position));
             const initMax = Math.max(...selectedKnotsInitial.map(k => k.position));
             
             const pivot = type === 'bracket_scale_left' ? initMax : initMin;
             const targetEdge = type === 'bracket_scale_left' 
                ? Math.min(pivot - 0.01, initMin + deltaXRatio) 
                : Math.max(pivot + 0.01, initMax + deltaXRatio);
             
             const scale = Math.abs(targetEdge - pivot) / Math.abs(initMax - initMin);

             const updatedKnots = initialKnots.map(k => {
                 if (ids.includes(k.id)) {
                     let newPos = pivot + ((k.position - pivot) * scale);
                     return { ...k, position: Math.max(0, Math.min(1, newPos)) };
                 }
                 return k;
             });
             
             emitChange(updatedKnots);
        }

        if (type === 'bias') {
            const knotId = ids[0];
            const knotIndex = initialKnots.findIndex(k => k.id === knotId);
            if (knotIndex === -1 || knotIndex >= initialKnots.length - 1) return;
            
            const segmentWidth = initialKnots[knotIndex + 1].position - initialKnots[knotIndex].position;
            if (segmentWidth > 0.001) {
                let newBias = Math.max(0, Math.min(1, initialKnots[knotIndex].bias + (deltaXRatio / segmentWidth)));
                if (e.shiftKey) newBias = Math.round(newBias * 20) / 20;
                
                const newKnots = [...initialKnots];
                newKnots[knotIndex] = { ...newKnots[knotIndex], bias: newBias };
                
                emitChange(newKnots);
            }
        }
    }, [emitChange]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        const payload = dragPayloadRef.current;
        if (!payload) return;

        if (payload.type === 'marquee' && knotTrackRef.current) {
            const r = knotTrackRef.current.getBoundingClientRect();
            const x1 = Math.min(payload.startX, e.clientX), x2 = Math.max(payload.startX, e.clientX);
            const y1 = Math.min(payload.startY, e.clientY), y2 = Math.max(payload.startY, e.clientY);

            const newSelected = new Set<string>();
            knotsRef.current.forEach(k => {
                const kx = r.left + k.position * r.width;
                const kY = r.top + r.height / 2;
                if (kx >= x1 && kx <= x2 && kY >= y1 - 20 && kY <= y2 + 20) newSelected.add(k.id);
            });
            
            setSelectedIds(prev => (e.shiftKey || e.ctrlKey) ? new Set([...prev, ...newSelected]) : newSelected);
            setMarqueeRect(null);

        } else if (payload.type === 'knot' || payload.type === 'bracket_move') {
             if (isDragRemovingRef.current) {
                 emitChange(knotsRef.current.filter(k => !payload.ids.includes(k.id)));
                 setSelectedIds(new Set());
             } else {
                 emitChange(knotsRef.current);
             }
             isDragRemovingRef.current = false;
             setIsDragRemoving(false);
             handleInteractionEnd();

        } else if (payload.type !== 'marquee') {
            emitChange(knotsRef.current);
            handleInteractionEnd();
        }

        dragPayloadRef.current = null;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [emitChange, handleMouseMove, handleInteractionEnd]);

    const startDrag = (type: DragPayload['type'], ids: string[], e: React.MouseEvent, overrideKnots?: AdvancedGradientKnot[], skipSnapshot?: boolean) => {
        e.preventDefault(); e.stopPropagation();
        
        if (type !== 'marquee' && !skipSnapshot) {
            handleInteractionStart('param');
        }

        dragPayloadRef.current = {
            type, ids, startX: e.clientX, startY: e.clientY,
            initialKnots: JSON.parse(JSON.stringify(overrideKnots || knots))
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleTrackMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.gradient-interactive-element') || !knotTrackRef.current) return;
        
        handleInteractionStart('param');

        const rect = knotTrackRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const color = getInterpolatedColor(knots, pos);
        
        const sortedKnots = [...knots].sort((a, b) => a.position - b.position);
        
        let prevKnot: AdvancedGradientKnot | undefined;
        for (let k of sortedKnots) {
            if (k.position <= pos) {
                prevKnot = k;
            } else {
                break;
            }
        }
        
        const newKnot: AdvancedGradientKnot = {
            id: Date.now().toString(), 
            position: pos, 
            color, 
            bias: 0.5, 
            interpolation: prevKnot ? prevKnot.interpolation : 'linear'
        };
        
        const newKnots = [...knots, newKnot].sort((a, b) => a.position - b.position);
        setKnots(newKnots);
        setSelectedIds(new Set([newKnot.id]));
        emitChange(newKnots);
        
        startDrag('knot', [newKnot.id], e, newKnots, true);
    };

    // ... (Keyboard handling unchanged) ...
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIds.size === 0 || (e.target as HTMLElement).tagName === 'INPUT') return;

            if ((e.key === 'Delete' || e.key === 'Backspace') && knots.length > selectedIds.size) {
                handleInteractionStart('param');
                emitChange(knots.filter(k => !selectedIds.has(k.id)));
                setSelectedIds(new Set<string>());
                handleInteractionEnd();
            } else if (e.key.startsWith('Arrow')) {
                e.preventDefault();
                handleInteractionStart('param');
                const dir = e.key === 'ArrowLeft' ? -1 : 1;
                const step = e.shiftKey ? 0.05 : 0.01;
                emitChange(knots.map(k => selectedIds.has(k.id) ? { ...k, position: Math.max(0, Math.min(1, k.position + dir * step)) } : k));
                handleInteractionEnd();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, knots, emitChange]);

    const selectionRange = useMemo(() => {
        if (selectedIds.size < 2) return null;
        const selected = knots.filter(k => selectedIds.has(k.id));
        if (selected.length === 0) return null;
        return { min: Math.min(...selected.map(k => k.position)), max: Math.max(...selected.map(k => k.position)) };
    }, [selectedIds, knots]);

    const selectedNodes = useMemo(() => knots.filter(k => selectedIds.has(k.id)), [knots, selectedIds]);
    
    const commonInterpolation = useMemo(() => {
        if (selectedNodes.length === 0) return 'linear';
        const first = selectedNodes[0].interpolation;
        return selectedNodes.every(k => k.interpolation === first) ? first : 'mixed';
    }, [selectedNodes]);

    const commonBias = useMemo(() => {
        if (selectedNodes.length === 0) return 0.5;
        const first = selectedNodes[0].bias;
        return selectedNodes.every(k => k.bias === first) ? first : -1;
    }, [selectedNodes]);

    const commonColor = useMemo(() => {
        if (selectedNodes.length === 0) return '#FFFFFF';
        const first = selectedNodes[0].color;
        return selectedNodes.every(k => k.color === first) ? first : selectedNodes[0].color;
    }, [selectedNodes]);

    const handleMultiPropertyChange = (prop: keyof AdvancedGradientKnot, value: any) => {
        handleInteractionStart('param');
        const updatedKnots = knots.map(k => selectedIds.has(k.id) ? { ...k, [prop]: value } as AdvancedGradientKnot : k);
        emitChange(updatedKnots);
        handleInteractionEnd();
    };
    
    const openTrackContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const wrapAction = (fn: () => void) => () => {
            handleInteractionStart('param');
            fn();
            handleInteractionEnd();
        };
        
        const items: ContextMenuItem[] = [
            { label: 'Actions', action: () => {}, isHeader: true },
            { 
                label: 'Invert Gradient', 
                action: wrapAction(() => emitChange(knots.map(k => ({ ...k, position: 1 - k.position })).reverse()))
            },
            { 
                label: 'Double Knots', 
                action: wrapAction(() => emitChange([...knots.map(k => ({...k, position: k.position * 0.5})), ...knots.map((k, i) => ({...k, id: `${Date.now()}_${i}`, position: 0.5 + k.position * 0.5}))]))
            },
            { 
                label: 'Distribute Selected', 
                disabled: selectedIds.size < 3, 
                action: wrapAction(() => {
                    const targets = knots.filter(k => selectedIds.has(k.id)).sort((a,b)=>a.position-b.position);
                    const step = (targets[targets.length-1].position - targets[0].position) / (targets.length - 1);
                    emitChange(knots.map(k => selectedIds.has(k.id) ? { ...k, position: targets[0].position + step * targets.findIndex(t => t.id === k.id) } : k));
                })
            },
            { 
                label: 'Delete Selected', 
                disabled: selectedIds.size === 0 || knots.length <= 2, 
                danger: true,
                action: wrapAction(() => { emitChange(knots.filter(k => !selectedIds.has(k.id))); setSelectedIds(new Set<string>()); })
            },
            { label: 'View', action: () => {}, isHeader: true },
            { 
                label: 'Bias Handles', 
                checked: isBiasHandlesVisible,
                action: () => setIsBiasHandlesVisible(!isBiasHandlesVisible) 
            },
            { 
                label: 'Reset Default', 
                danger: true, 
                action: wrapAction(() => { emitChange([{ id: '1', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' }, { id: '2', position: 1, color: '#FFFFFF', bias: 0.5, interpolation: 'linear' }], 'srgb'); setSelectedIds(new Set<string>()); })
            },
            { label: 'Output Mode', action: () => {}, isHeader: true },
            { 
                label: 'sRGB (Standard)', 
                checked: colorSpace === 'srgb',
                action: wrapAction(() => emitChange(knots, 'srgb'))
            },
            { 
                label: 'Linear (Physical)', 
                checked: colorSpace === 'linear',
                action: wrapAction(() => emitChange(knots, 'linear'))
            },
            { 
                label: 'Inverse ACES', 
                checked: colorSpace === 'aces_inverse',
                action: wrapAction(() => emitChange(knots, 'aces_inverse'))
            }
        ];
        
        openContextMenu(e.clientX, e.clientY, items, [helpId || 'ui.gradient_editor']);
    };

    const handlePresetsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPresetMenu({ x: rect.left, y: rect.bottom + 5 });
    };
    
    const handleWrapperContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(e.clientX, e.clientY, [], ids);
        }
    };

    return (
        <div 
            className="w-full select-none" 
            ref={containerRef}
            data-help-id={helpId || "ui.gradient_editor"}
            onContextMenu={handleWrapperContextMenu}
            onMouseDown={(e) => {
                if (e.button !== 0) return; 
                if (!(e.target as HTMLElement).closest('.gradient-interactive-element')) {
                    if (!e.shiftKey && !e.ctrlKey && !knotTrackRef.current?.contains(e.target as Node)) {
                         setSelectedIds(new Set<string>());
                    }
                    if (!knotTrackRef.current?.contains(e.target as Node)) {
                        startDrag('marquee', [] as string[], e);
                    }
                }
            }}
        >
            <div className="flex items-center justify-between mb-1">
                <div 
                    className="flex items-center gap-2 cursor-pointer text-[10px] font-semibold text-gray-400 hover:text-white tracking-wider gradient-interactive-element" 
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className={`transform transition-transform duration-200 text-base ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Visual Indicator of current mode */}
                    <div 
                        className="text-[8px] font-bold text-gray-600 uppercase cursor-pointer hover:text-cyan-400 transition-colors select-none"
                        onClick={cycleColorSpace}
                        title="Click to switch Color Profile"
                    >
                        {colorSpace === 'srgb' ? 'Standard' : colorSpace === 'linear' ? 'Linear' : 'ACES'}
                    </div>

                    {/* Presets Button */}
                    <button
                        className="gradient-interactive-element p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors active:scale-95"
                        onClick={handlePresetsClick}
                        title="Presets"
                    >
                        <MenuIcon />
                    </button>
                    
                    {presetMenu && (
                        <PresetMenu 
                            x={presetMenu.x}
                            y={presetMenu.y}
                            onClose={() => setPresetMenu(null)}
                            options={[
                                { label: 'Clipboard', action: () => {}, isHeader: true },
                                { label: 'Copy Gradient', action: handleCopy },
                                { label: 'Paste Gradient', action: handlePaste },
                                { label: 'Presets', action: () => {}, isHeader: true },
                                ...GRADIENT_PRESETS.map(p => ({
                                    label: p.name,
                                    action: () => loadPreset(p.stops),
                                    stops: p.stops 
                                }))
                            ]}
                        />
                    )}
                </div>
            </div>

            <div className="relative" onContextMenu={openTrackContextMenu}>
                <div 
                    className="h-8 w-full rounded-t border border-white/20 relative mb-0 cursor-pointer" 
                    style={{ background: getGradientCssString(knots) }} 
                    onDoubleClick={(e) => { e.preventDefault(); setSelectedIds(new Set(knots.map(k => k.id))); }} 
                    title="Double-click to select all"
                >
                     {isBiasHandlesVisible && [...knots].sort((a, b) => a.position - b.position).map((k, i, arr) => {
                        if (i >= arr.length - 1 || arr[i+1].position - k.position < 0.02) return null;
                        
                        const visualPos = k.position + (arr[i+1].position - k.position) * k.bias;
                        
                        return (
                            <div 
                                key={`bias-${k.id}`} 
                                className="bias-handle gradient-interactive-element absolute top-1/2 -translate-y-1/2 w-3 h-3 transform -translate-x-1/2 cursor-ew-resize z-10" 
                                style={{ left: `${visualPos * 100}%` }} 
                                onMouseDown={(e) => {
                                    if(e.button === 0) startDrag('bias', [k.id], e);
                                }}
                            >
                                <BiasIcon />
                            </div>
                        );
                    })}
                </div>

                <div 
                    ref={knotTrackRef} 
                    className="h-6 w-full bg-white/5 border-x border-b border-white/10 relative rounded-b cursor-crosshair" 
                    onMouseDown={handleTrackMouseDown} 
                    title="Click & drag to add/move knot"
                >
                    {knots.map(knot => (
                        <div 
                            key={knot.id} 
                            className={`gradient-interactive-element absolute top-0 w-4 h-5 -ml-2 cursor-grab active:cursor-grabbing z-20 flex flex-col items-center group transition-opacity duration-200 ${isDragRemoving && selectedIds.has(knot.id) ? 'opacity-30' : 'opacity-100'}`} 
                            style={{ left: `${knot.position * 100}%` }} 
                            onMouseDown={(e) => {
                                e.stopPropagation(); 
                                const isRightClick = e.button === 2;
                                let newSel = new Set(selectedIds);
                                if (e.shiftKey || e.ctrlKey) {
                                    if (selectedIds.has(knot.id)) newSel.delete(knot.id);
                                    else newSel.add(knot.id);
                                } else {
                                    if (!selectedIds.has(knot.id) || !isRightClick) {
                                        newSel = new Set([knot.id]);
                                    }
                                }
                                setSelectedIds(newSel);
                                if (!isRightClick) {
                                    startDrag('knot', Array.from(newSel) as string[], e);
                                }
                            }}
                        >
                            <KnotIcon color={knot.color} isSelected={selectedIds.has(knot.id)} />
                        </div>
                    ))}

                    {selectionRange && (
                        <div className="gradient-interactive-element absolute -bottom-3 h-3 border-l-2 border-r-2 border-b-4 border-[#6D48E3] z-10" style={{ left: `calc(${selectionRange.min * 100}% - 15px)`, width: `calc(${(selectionRange.max - selectionRange.min) * 100}% + 30px)`, pointerEvents: 'none' }}>
                             <div className="absolute bottom-0 left-0 right-0 h-8 cursor-grab active:cursor-grabbing pointer-events-auto" onMouseDown={(e) => { if(e.button===0) startDrag('bracket_move', Array.from(selectedIds) as string[], e); }} />
                             <div className="absolute bottom-0 -left-0 w-2 h-4 bg-[#6D48E3] cursor-ew-resize pointer-events-auto rounded-sm" onMouseDown={(e) => { if(e.button===0) startDrag('bracket_scale_left', Array.from(selectedIds) as string[], e); }} />
                             <div className="absolute bottom-0 -right-0 w-2 h-4 bg-[#6D48E3] cursor-ew-resize pointer-events-auto rounded-sm" onMouseDown={(e) => { if(e.button===0) startDrag('bracket_scale_right', Array.from(selectedIds) as string[], e); }} />
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="flex flex-col animate-slider-entry gradient-interactive-element overflow-hidden">
                    {selectedNodes.length > 0 ? (
                        <>
                             <div className="mb-px mt-2">
                                <EmbeddedColorPicker color={commonColor} onColorChange={handleColorChange} />
                             </div>
                             
                             <div className="flex flex-col">
                                 <Dropdown 
                                    label="Interpolation"
                                    value={commonInterpolation}
                                    onChange={(v) => handleMultiPropertyChange('interpolation', v as InterpolationMode)}
                                    options={[
                                        ...(commonInterpolation === 'mixed' ? [{ label: 'Mixed', value: 'mixed' }] : []),
                                        { label: 'Linear', value: 'linear' },
                                        { label: 'Step', value: 'step' },
                                        { label: 'Smooth', value: 'smooth' }
                                    ]}
                                    className="mb-px"
                                 />
                                 
                                 {selectedNodes.length === 1 && (
                                     <Slider 
                                        label="Position" 
                                        value={selectedNodes[0].position * 100} 
                                        min={0} max={100} step={0.1} 
                                        onChange={(val) => handleMultiPropertyChange('position', val / 100)} 
                                    />
                                 )}
                                 
                                 <Slider 
                                    label="Bias (Midpoint)" 
                                    value={commonBias === -1 ? 50 : commonBias * 100} 
                                    min={0} max={100} step={1} 
                                    onChange={(val) => handleMultiPropertyChange('bias', val / 100)}
                                    overrideInputText={commonBias === -1 ? "Mixed" : undefined}
                                 />
                             </div>
                        </>
                    ) : (
                        <div className="h-1 bg-white/5 opacity-50 mt-1" />
                    )}
                </div>
            )}

            {marqueeRect && createPortal(<div className="fixed border border-blue-400 bg-blue-500/20 z-[9999] pointer-events-none" style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.w, height: marqueeRect.h }} />, document.body)}
        </div>
    );
};

export default AdvancedGradientEditor;
