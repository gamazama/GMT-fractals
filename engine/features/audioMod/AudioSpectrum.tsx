
import React, { useRef, useEffect } from 'react';
import { audioAnalysisEngine } from './AudioAnalysisEngine';
import { formatHz } from './freqScale';
import { filterBank, BANK_MIN_HZ } from './filterBank';
import { useEngineStore } from '../../../store/engineStore';
import { ModulationRule } from '../modulation/index';
import { modulationEngine } from '../modulation/ModulationEngine';
import { ContextMenuItem } from '../../../types/help';

export const AudioSpectrum: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const store = useEngineStore();
    const { modulation, selectModulation, addModulation, openContextMenu } = store;
    const audioState = (store as any).audio;
    // The linear/log toggle retired with the filterbank: the axis is now band
    // index, which IS a log-frequency axis, and a linear option would put the
    // rule boxes on a different mapping from the bars they select.
    const bandsPerOctave = audioState?.bandsPerOctave ?? 6;
    
    // DDFS Wrapper for Modulation
    const updateModulation = (id: string, update: Partial<ModulationRule>) => {
        (store as any).updateModulation({ id, update });
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
    //
    // The x axis IS the filterbank: band k occupies [k, k+1) × barWidth, and
    // the bands are log-spaced by construction, so this is an exact
    // log-frequency axis rather than the ad-hoc `log(f·999+1)/log(1000)` curve
    // it replaces. Rule boxes and spectrum bars therefore share one mapping —
    // a box edge sits exactly on the band boundary it selects.
    //
    // Rules store their band in real Hz (ADR-0106), and this axis is built
    // from the same band table the analysis uses, so a box edge sits exactly
    // on the band boundary it selects with no representation change in
    // between. Everything below is Hz ↔ screen-x.

    const bandCount = () => Math.max(1, filterBank.bands.length);

    /** Fractional band position of a frequency. Band k's centre is
     *  `BANK_MIN_HZ · 2^(k/B)`, so its low edge lands on integer k and its high
     *  edge on k+1 once the half-band offset is added. */
    const hzToBandPos = (hz: number) => {
        if (hz <= BANK_MIN_HZ) return 0;
        return filterBank.bandsPerOctave * Math.log2(hz / BANK_MIN_HZ) + 0.5;
    };

    const getScreenX = (hz: number, width: number) =>
        Math.max(0, Math.min(width, (hzToBandPos(hz) / bandCount()) * width));

    const getHzFromX = (x: number, width: number) => {
        if (width === 0) return 0;
        const nyquist = audioAnalysisEngine.sampleRate / 2;
        // Snap the far left to 0 so the lowest band stays grabbable — the axis
        // is logarithmic and cannot represent DC.
        if (x < width * 0.015) return 0;
        if (x >= width) return nyquist;
        const pos = (x / width) * bandCount() - 0.5;
        const hz = BANK_MIN_HZ * Math.pow(2, pos / filterBank.bandsPerOctave);
        return Math.max(0, Math.min(nyquist, hz));
    };

    /** Minimum selection width, as a RATIO rather than an absolute Hz gap.
     *  The axis is logarithmic, so the old fixed 0.001-of-nyquist floor was
     *  24 Hz — invisible at 10 kHz but wider than a whole 1/6-octave band at
     *  the kick, which is exactly where hairline selections matter. */
    const MIN_BAND_RATIO = 1.02;

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !audioState?.isEnabled) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let rafId = 0;

        const draw = () => {
            if (!audioState?.isEnabled) {
                cancelAnimationFrame(rafId);
                return;
            }

            const w = canvas.width;
            const h = canvas.height;
            const audioLive = audioAnalysisEngine.hasSignal();

            // 1. Background
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);

            // 2. Grid Lines
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Vertical grid. On the log axis, rule the MUSICAL decades (100 Hz,
            // 1 kHz, 10 kHz) rather than round numbers on the normalised axis —
            // those bunch into the right-hand third and tell you nothing about
            // where a kick or a hi-hat actually sits.
            const nyquist = audioAnalysisEngine.sampleRate / 2;
            const hzTicks = [100, 1000, 10000];
            const gridSteps = [0, ...hzTicks, nyquist];
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

            // 2b. Frequency ruler — labels the decade lines so a band can be
            // placed by ear-knowledge ("kick is under 100") instead of by
            // dragging until it reacts.
            {
                ctx.fillStyle = '#555';
                ctx.font = '8px monospace';
                hzTicks.forEach(hz => {
                    if (hz >= nyquist) return;
                    const x = getScreenX(hz, w);
                    ctx.fillText(formatHz(hz), x + 2, h - 2);
                });
            }

            // 3. Spectrum bars — ONE BAR PER ANALYSIS BAND.
            //    The bands are already log-spaced, so band index maps straight
            //    to screen x and the bars ARE the analysis rather than a
            //    resampling of it. Bar height is the same normalised value a
            //    rule over that band reads, so the display cannot overstate
            //    what the modulation will do.
            const bands = filterBank.bands;
            if (audioLive && bands.length > 0) {
                const barWidth = w / bands.length;
                for (let i = 0; i < bands.length; i++) {
                    const val = filterBank.normalized[i] ?? 0;
                    const barH = val * h;
                    // Bin-limited bands (below the FFT's resolution — see
                    // FilterBank's @invariant) are drawn dimmer so the analysis
                    // floor is visible instead of implied.
                    ctx.fillStyle = bands[i].resolutionLimited ? '#243044' : '#334155';
                    ctx.fillRect(i * barWidth, h - barH, barWidth + 1, barH);
                }
            }

            // 4. Modulation Rules (Boxes)
            const sortedRules = [...rules].sort((a,b) => (a.id === selectedId ? 1 : 0) - (b.id === selectedId ? 1 : 0));

            sortedRules.forEach(rule => {
                const isSelected = rule.id === selectedId;
                
                const xStart = getScreenX(rule.lowHz, w);
                const xEnd = getScreenX(rule.highHz, w);
                
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

                if (isSelected) {
                    ctx.fillStyle = '#fff';
                    const boxSize = width > 10 ? 6 : 4; // Smaller handles for tiny boxes
                    const halfBox = boxSize / 2;
                    // Always draw handles at box edges (even if box is tiny)
                    ctx.fillRect(x - halfBox, topY + height/2 - halfBox, boxSize, boxSize); // Left
                    ctx.fillRect(x + Math.max(0, width) - halfBox, topY + height/2 - halfBox, boxSize, boxSize); // Right
                    ctx.fillRect(x + Math.max(0, width)/2 - halfBox, topY - halfBox, boxSize, boxSize); // Top
                    ctx.fillRect(x + Math.max(0, width)/2 - halfBox, bottomY - halfBox, boxSize, boxSize); // Bottom
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
    }, [rules, selectedId, bandsPerOctave, audioState?.isEnabled]);

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
                const x = getScreenX(rule.lowHz, w);
                const width = getScreenX(rule.highHz, w) - x;
                const topY = h - (rule.thresholdMax * h);
                const height = (rule.thresholdMax - rule.thresholdMin) * h;
                const bottomY = topY + height;
                
                const checkHit = (hx: number, hy: number) => Math.abs(mx - hx) < HANDLE_HIT_SIZE && Math.abs(my - hy) < HANDLE_HIT_SIZE;
                // For very small boxes, allow hitting anywhere near the box edges
                const checkHitNearEdge = (hx: number, hy: number) => Math.abs(mx - hx) < HANDLE_HIT_SIZE * 1.5 && Math.abs(my - hy) < HANDLE_HIT_SIZE * 1.5;

                // Allow handles on selected boxes regardless of width (important for log scale)
                if (!e.ctrlKey) {
                    // Ensure centerX is properly calculated even for tiny boxes
                    const safeWidth = Math.max(0, width);
                    const centerX = x + safeWidth / 2;
                    
                    // Horizontal resize handles (left/right)
                    const useHorizHit = width > 10 ? checkHit : checkHitNearEdge;
                    if (useHorizHit(x, topY + height/2)) { dragRef.current = { type: 'l', ruleId: selectedId, startX: mx, startY: my, startRule: {...rule} }; return; }
                    if (useHorizHit(x + safeWidth, topY + height/2)) { dragRef.current = { type: 'r', ruleId: selectedId, startX: mx, startY: my, startRule: {...rule} }; return; }
                    
                    // Vertical resize handles (top/bottom) - use larger hit area
                    const useVertHit = height > 10 ? checkHit : checkHitNearEdge;
                    if (useVertHit(centerX, topY)) { dragRef.current = { type: 't', ruleId: selectedId, startX: mx, startY: my, startRule: {...rule} }; return; }
                    if (useVertHit(centerX, bottomY)) { dragRef.current = { type: 'b', ruleId: selectedId, startX: mx, startY: my, startRule: {...rule} }; return; }
                }
            }
        }
        
        // Selection Check
        for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i];
            const x = getScreenX(rule.lowHz, w);
            const width = getScreenX(rule.highHz, w) - x;
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
            const startScreenX = getScreenX(startRule.lowHz, w);
            const endScreenX = getScreenX(startRule.highHz, w);
            const widthPx = endScreenX - startScreenX;
            
            const newStartPx = startScreenX + dxPx;
            const newEndPx = newStartPx + widthPx;

            const nyquist = audioAnalysisEngine.sampleRate / 2;
            let newLowHz = getHzFromX(newStartPx, w);
            let newHighHz = getHzFromX(newEndPx, w);

            // Bounds Check — hold the width in SCREEN space when the box hits
            // an edge, which is what a drag feels like it should do.
            if (newLowHz <= 0) {
                 newLowHz = 0;
                 newHighHz = getHzFromX(getScreenX(0, w) + widthPx, w);
            }
            if (newHighHz >= nyquist) {
                 newHighHz = nyquist;
                 newLowHz = getHzFromX(getScreenX(nyquist, w) - widthPx, w);
            }

            update.lowHz = newLowHz;
            update.highHz = newHighHz;

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
            const startScreenX = getScreenX(startRule.lowHz, w);
            const newStartPx = startScreenX + dxPx;
            const newLowHz = getHzFromX(newStartPx, w);
            // Hairline selections stay possible — see MIN_BAND_RATIO.
            update.lowHz = Math.max(0, Math.min(startRule.highHz / MIN_BAND_RATIO, newLowHz));
        }
        else if (type === 'r') {
            const endScreenX = getScreenX(startRule.highHz, w);
            const newEndPx = endScreenX + dxPx;
            const newHighHz = getHzFromX(newEndPx, w);
            const nyquist = audioAnalysisEngine.sampleRate / 2;
            update.highHz = Math.min(nyquist, Math.max(startRule.lowHz * MIN_BAND_RATIO, newHighHz));
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
        const hzAtClick = getHzFromX(mx, rect.width);
        const my = 1.0 - ((e.clientY - rect.top) / rect.height);
        
        addModulation({ target: 'coreMath.paramA', source: 'audio' });
        
        setTimeout(() => {
            const currentRules = useEngineStore.getState().modulation.rules;
            const newRule = currentRules[currentRules.length - 1];
            if (newRule) {
                // Span a few bands either side of the click. Expressed in
                // BANDS (not a fixed slice of the axis) so a new box is the
                // same visual width wherever it is dropped.
                const nyq = audioAnalysisEngine.sampleRate / 2;
                const octaves = 3 / bandsPerOctave;   // ≈3 bands wide
                const lo = Math.max(BANK_MIN_HZ, hzAtClick / Math.pow(2, octaves / 2));
                const hi = hzAtClick * Math.pow(2, octaves / 2);
                updateModulation(newRule.id, {
                    lowHz: Math.max(0, lo),
                    highHz: Math.min(nyq, hi),
                    thresholdMin: Math.max(0, my - 0.15),
                    thresholdMax: Math.min(1, my + 0.15)
                });
            }
        }, 0);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const setBands = (v: number) => (store as any).setAudio({ bandsPerOctave: v });
        const items: ContextMenuItem[] = [
            { label: 'Band Width', action: () => {}, isHeader: true },
            { label: 'Wide — 1/3 octave', checked: bandsPerOctave === 3, action: () => setBands(3) },
            { label: 'Medium — 1/6 octave', checked: bandsPerOctave === 6, action: () => setBands(6) },
            { label: 'Narrow — 1/12 octave', checked: bandsPerOctave === 12, action: () => setBands(12) },
        ];
        openContextMenu(e.clientX, e.clientY, items, ['panel.audio']);
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-32 bg-black border border-line/10 rounded overflow-hidden cursor-crosshair relative group"
            style={{ display: audioState?.isEnabled ? 'block' : 'none' }}
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
                <div className="text-[8px] font-bold text-fg-dim bg-surface/80 px-1 rounded">Ctrl+Drag = Gain</div>
                <div className="text-[8px] font-bold text-fg-faint bg-surface/80 px-1 rounded">
                    1/{bandsPerOctave} OCT
                </div>
            </div>
            
            {rules.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-fg-faint text-[10px]">
                    Double-click to add modulator
                </div>
            )}
        </div>
    );
};
