
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { audioAnalysisEngine } from './AudioAnalysisEngine';
import { useFractalStore } from '../../store/fractalStore';
import { ModulationRule } from '../modulation/index';
import { modulationEngine } from '../modulation/ModulationEngine';
import { ContextMenuItem } from '../../types/help';

export const AudioSpectrum: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const store = useFractalStore();
    const { modulation, selectModulation, addModulation, openContextMenu } = store;
    const [isLogScale, setIsLogScale] = useState(true);
    
    // DDFS Wrapper for Modulation
    const updateModulation = (id: string, update: Partial<ModulationRule>) => {
        // @ts-ignore
        store.updateModulation({ id, update });
    };

    const rules = modulation.rules.filter(r => r.source === 'audio');
    const selectedId = modulation.selectedRuleId;

    const dragRef = useRef<{ 
        type: 'move' | 'gain' | 'l' | 'r' | 't' | 'b', 
        ruleId: string,
        startX: number, 
        startY: number,
        startRule: ModulationRule
    } | null>(null);

    // --- COORDINATE HELPERS ---
    
    const getScreenX = (freqNorm: number, width: number) => {
        if (!isLogScale) return freqNorm * width;
        // Log mapping: Exp scale to better visualize Bass
        const N = 1000;
        const logVal = Math.log(freqNorm * (N - 1) + 1);
        const logMax = Math.log(N);
        return (logVal / logMax) * width;
    };

    const getFreqFromX = (x: number, width: number) => {
        if (width === 0) return 0;
        
        // --- SNAP TO ZERO ---
        // If within first 2% of screen, force 0.0 frequency to allow grabbing sub-bass
        if (x < width * 0.02) return 0.0;
        if (x >= width) return 1.0;

        const normX = x / width;
        if (!isLogScale) return Math.max(0, Math.min(1, normX));
        
        // Inverse Log
        const N = 1000;
        const logMax = Math.log(N);
        const val = Math.exp(normX * logMax) - 1;
        return Math.max(0, Math.min(1, val / (N - 1)));
    };

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let rafId = 0;

        const draw = () => {
            const w = canvas.width;
            const h = canvas.height;
            const rawData = audioAnalysisEngine.getRawData();

            // 1. Background
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);

            // 2. Grid Lines
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Vertical Grid (Freq)
            const gridSteps = isLogScale ? [0.0, 0.1, 0.25, 0.5, 1.0] : [0.0, 0.25, 0.5, 0.75, 1.0];
            gridSteps.forEach(f => {
                const x = getScreenX(f, w);
                ctx.moveTo(x, 0); ctx.lineTo(x, h);
            });
            
            // Horizontal Grid (Amplitude)
            for(let i=0.1; i<1.0; i+=0.2) { 
                const y = i * h; 
                ctx.moveTo(0, y); 
                ctx.lineTo(w, y); 
            }
            ctx.stroke();

            // 3. Spectrum Bars
            if (rawData) {
                const barCount = 128; // Number of visual bars to draw
                const barWidth = w / barCount;
                
                ctx.fillStyle = '#334155';
                
                for(let i=0; i<barCount; i++) {
                    const screenXStart = i / barCount;
                    const screenXEnd = (i + 1) / barCount;
                    
                    const fStart = isLogScale 
                        ? getFreqFromX(screenXStart * w, w) 
                        : screenXStart;
                    const fEnd = isLogScale
                        ? getFreqFromX(screenXEnd * w, w)
                        : screenXEnd;

                    const binStart = Math.floor(fStart * rawData.length);
                    const binEnd = Math.max(binStart + 1, Math.floor(fEnd * rawData.length));
                    
                    let val = 0;
                    for(let b=binStart; b<binEnd && b < rawData.length; b++) {
                        val = Math.max(val, rawData[b]);
                    }
                    
                    val = val / 255.0;
                    const barH = val * h;
                    
                    ctx.fillRect(i * barWidth, h - barH, barWidth + 1, barH);
                }
            }

            // 4. Modulation Rules (Boxes)
            const sortedRules = [...rules].sort((a,b) => (a.id === selectedId ? 1 : 0) - (b.id === selectedId ? 1 : 0));

            sortedRules.forEach(rule => {
                const isSelected = rule.id === selectedId;
                
                const xStart = getScreenX(rule.freqStart, w);
                const xEnd = getScreenX(rule.freqEnd, w);
                
                const x = xStart;
                // Allow width to be as small as 1px for precise bass selection
                const width = Math.max(1, xEnd - xStart);
                
                const bottomY = h - (rule.thresholdMin * h);
                const topY = h - (rule.thresholdMax * h);
                const height = Math.max(2, bottomY - topY);

                // Fill (Gain changes fill opacity)
                const alpha = Math.min(0.8, 0.2 + (rule.gain / 5.0) * 0.3);
                ctx.fillStyle = isSelected ? `${rule.color}60` : `${rule.color}20`; 
                ctx.fillRect(x, topY, width, height);
                
                // Border
                ctx.strokeStyle = isSelected ? '#fff' : rule.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, topY, width, height);
                
                // --- METER ---
                const currentVal = modulationEngine.getRuleValue(rule.id);
                if (currentVal > 0.01) {
                    const meterW = Math.min(4, width);
                    const meterH = height * currentVal;
                    const meterX = x + width - meterW;
                    const meterY = bottomY - meterH;
                    
                    ctx.fillStyle = rule.color;
                    ctx.fillRect(meterX, meterY, meterW, meterH);
                }

                if (isSelected && width > 10) {
                    ctx.fillStyle = '#fff';
                    const boxSize = 6;
                    const halfBox = boxSize / 2;
                    ctx.fillRect(x - halfBox, topY + height/2 - halfBox, boxSize, boxSize); // Left
                    ctx.fillRect(x + width - halfBox, topY + height/2 - halfBox, boxSize, boxSize); // Right
                    ctx.fillRect(x + width/2 - halfBox, topY - halfBox, boxSize, boxSize); // Top
                    ctx.fillRect(x + width/2 - halfBox, bottomY - halfBox, boxSize, boxSize); // Bottom
                }
                
                // Label & Gain Indicator
                if (width > 20) {
                    ctx.fillStyle = isSelected ? '#fff' : '#aaa';
                    ctx.font = '9px monospace';
                    // Strip the feature prefix for brevity
                    const label = rule.target.split('.').pop() || 'Param';
                    const gainTxt = rule.gain !== 1.0 ? ` (x${rule.gain.toFixed(1)})` : '';
                    
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x, topY, width, height);
                    ctx.clip();
                    ctx.fillText(`${label}${gainTxt}`, x + 3, topY + 10);
                    ctx.restore();
                }
            });

            rafId = requestAnimationFrame(draw);
        };
        
        draw();
        return () => cancelAnimationFrame(rafId);
    }, [rules, selectedId, isLogScale]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 2) return; 
        
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;
        const HANDLE_HIT_SIZE = 8;
        
        if (selectedId) {
            const rule = rules.find(r => r.id === selectedId);
            if (rule) {
                const x = getScreenX(rule.freqStart, w);
                const width = getScreenX(rule.freqEnd, w) - x;
                const topY = h - (rule.thresholdMax * h);
                const height = (rule.thresholdMax - rule.thresholdMin) * h;
                const bottomY = topY + height;
                
                const checkHit = (hx: number, hy: number) => Math.abs(mx - hx) < HANDLE_HIT_SIZE && Math.abs(my - hy) < HANDLE_HIT_SIZE;

                // Only check handles if wide enough
                if (width > 10 && !e.ctrlKey) {
                    if (checkHit(x, topY + height/2)) { dragRef.current = { type: 'l', ruleId: selectedId, startX: mx, startY: my, startRule: {...rule} }; return; }
                    if (checkHit(x + width, topY + height/2)) { dragRef.current = { type: 'r', ruleId: selectedId, startX: mx, startY: my, startRule: {...rule} }; return; }
                    if (checkHit(x + width/2, topY)) { dragRef.current = { type: 't', ruleId: selectedId, startX: mx, startY: my, startRule: {...rule} }; return; }
                    if (checkHit(x + width/2, bottomY)) { dragRef.current = { type: 'b', ruleId: selectedId, startX: mx, startY: my, startRule: {...rule} }; return; }
                }
            }
        }
        
        // Selection Check
        for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i];
            const x = getScreenX(rule.freqStart, w);
            const width = getScreenX(rule.freqEnd, w) - x;
            const topY = h - (rule.thresholdMax * h);
            const height = (rule.thresholdMax - rule.thresholdMin) * h;
            
            // Box hit test
            if (mx >= x && mx <= x + width && my >= topY && my <= topY + height) {
                selectModulation(rule.id);
                // CTRL + Click = Gain Mode
                const type = e.ctrlKey ? 'gain' : 'move';
                dragRef.current = { type, ruleId: rule.id, startX: mx, startY: my, startRule: {...rule} };
                if (type === 'gain') {
                    // Set cursor immediately
                    document.body.style.cursor = 'ns-resize';
                }
                return;
            }
        }
        selectModulation(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current || !containerRef.current) return;
        const { type, startX, startY, startRule, ruleId } = dragRef.current;
        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        
        const dxPx = e.clientX - rect.left - startX;
        const dy = -(e.clientY - rect.top - startY) / h; 
        
        const update: Partial<ModulationRule> = {};
        
        if (type === 'move') {
            const startScreenX = getScreenX(startRule.freqStart, w);
            const endScreenX = getScreenX(startRule.freqEnd, w);
            const widthPx = endScreenX - startScreenX;
            
            const newStartPx = startScreenX + dxPx;
            const newEndPx = newStartPx + widthPx;
            
            let newStartFreq = getFreqFromX(newStartPx, w);
            let newEndFreq = getFreqFromX(newEndPx, w);
            
            // Bounds Check
            if (newStartFreq <= 0) {
                 newStartFreq = 0;
                 // Re-calculate end freq based on original width in log space? 
                 // No, fixed width in screen space feels better for dragging.
                 newEndFreq = getFreqFromX(getScreenX(0, w) + widthPx, w);
            }
            if (newEndFreq >= 1) {
                 newEndFreq = 1;
                 newStartFreq = getFreqFromX(getScreenX(1, w) - widthPx, w);
            }
            
            update.freqStart = newStartFreq;
            update.freqEnd = newEndFreq;

            const currentHeight = startRule.thresholdMax - startRule.thresholdMin;
            let newMin = startRule.thresholdMin + dy;
            if (newMin < 0) newMin = 0;
            if (newMin + currentHeight > 1) newMin = 1 - currentHeight;
            
            update.thresholdMin = newMin;
            update.thresholdMax = newMin + currentHeight;

        } 
        else if (type === 'gain') {
            // Sensitivity: 1.0 gain change per 100 pixels
            const dyPx = -(e.clientY - rect.top - startY);
            const gainDelta = dyPx * 0.05;
            // Allow 0 (mute) to 10
            update.gain = Math.max(0, Math.min(10.0, startRule.gain + gainDelta));
        }
        else if (type === 'l') {
            const startScreenX = getScreenX(startRule.freqStart, w);
            const newStartPx = startScreenX + dxPx;
            const newStartFreq = getFreqFromX(newStartPx, w);
            // Allow getting very close to end freq (0.001) for thin selection
            update.freqStart = Math.max(0, Math.min(startRule.freqEnd - 0.001, newStartFreq));
        }
        else if (type === 'r') {
            const endScreenX = getScreenX(startRule.freqEnd, w);
            const newEndPx = endScreenX + dxPx;
            const newEndFreq = getFreqFromX(newEndPx, w);
            update.freqEnd = Math.min(1, Math.max(startRule.freqStart + 0.001, newEndFreq));
        }
        else if (type === 'b') update.thresholdMin = Math.max(0, Math.min(startRule.thresholdMax - 0.05, startRule.thresholdMin + dy));
        else if (type === 't') update.thresholdMax = Math.min(1, Math.max(startRule.thresholdMin + 0.05, startRule.thresholdMax + dy));
        
        updateModulation(ruleId, update);
    };

    const handleMouseUp = () => { 
        dragRef.current = null; 
        document.body.style.cursor = '';
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const freq = getFreqFromX(mx, rect.width);
        const my = 1.0 - ((e.clientY - rect.top) / rect.height);
        
        addModulation({ target: 'coreMath.paramA', source: 'audio' });
        
        setTimeout(() => {
            const currentRules = useFractalStore.getState().modulation.rules;
            const newRule = currentRules[currentRules.length - 1];
            if (newRule) {
                // Default thin slice
                const width = isLogScale ? 0.05 : 0.02;
                updateModulation(newRule.id, {
                    freqStart: Math.max(0, freq - width/2),
                    freqEnd: Math.min(1, freq + width/2),
                    thresholdMin: Math.max(0, my - 0.1),
                    thresholdMax: Math.min(1, my + 0.1)
                });
            }
        }, 0);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const items: ContextMenuItem[] = [
            { label: 'Spectrum Scale', action: () => {}, isHeader: true },
            { label: 'Logarithmic (Bass Focus)', checked: isLogScale, action: () => setIsLogScale(true) },
            { label: 'Linear', checked: !isLogScale, action: () => setIsLogScale(false) }
        ];
        openContextMenu(e.clientX, e.clientY, items, ['panel.audio']);
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-32 bg-black border border-white/10 rounded overflow-hidden cursor-crosshair relative group"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
        >
            <canvas ref={canvasRef} width={400} height={150} className="w-full h-full block" />
            
            {/* Legend / Overlay */}
            <div className="absolute top-1 right-2 flex gap-2 pointer-events-none">
                <div className="text-[8px] font-bold text-gray-500 bg-black/50 px-1 rounded">CTRL+DRAG = GAIN</div>
                <div className="text-[8px] font-bold text-gray-600 uppercase bg-black/50 px-1 rounded">
                    {isLogScale ? 'LOG' : 'LIN'}
                </div>
            </div>
            
            {rules.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-600 text-[10px]">
                    Double-click to add modulator
                </div>
            )}
        </div>
    );
};
