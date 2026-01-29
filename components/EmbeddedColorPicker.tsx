
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { hexToRgb, rgbToHsv, hsvToRgb, rgbToHex } from '../utils/colorUtils';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';
import { ContextMenuItem } from '../types/help';

// Global history to persist across different picker instances
let colorHistory: string[] = [];
const addToHistory = (hex: string) => {
    const cleanHex = hex.toUpperCase();
    colorHistory = [cleanHex, ...colorHistory.filter(h => h !== cleanHex)].slice(0, 3);
};

interface EmbeddedColorPickerProps {
    color: string;
    onColorChange: (color: string) => void;
}

const EmbeddedColorPicker: React.FC<EmbeddedColorPickerProps> = ({ color, onColorChange }) => {
    const [hsv, setHsv] = useState(() => {
        const rgb = hexToRgb(color);
        return rgb ? rgbToHsv(rgb) : { h: 0, s: 0, v: 100 };
    });
    
    const lastOutputHex = useRef(color.toUpperCase());
    const { openContextMenu, handleInteractionStart, handleInteractionEnd } = useFractalStore();

    useEffect(() => {
        if (color.toUpperCase() !== lastOutputHex.current) {
            const rgb = hexToRgb(color);
            if (rgb) {
                const nextHsv = rgbToHsv(rgb);
                setHsv(nextHsv);
                lastOutputHex.current = color.toUpperCase();
            }
        }
    }, [color]);

    const updateHsv = (updates: Partial<{h: number, s: number, v: number}>) => {
        const next = { ...hsv, ...updates };
        setHsv(next);
        const hex = rgbToHex(hsvToRgb(next.h, next.s, next.v));
        lastOutputHex.current = hex;
        onColorChange(hex);
    };

    const handleMouseUp = () => {
        addToHistory(lastOutputHex.current);
    };

    const hueGradient = 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
    const satGradient = useMemo(() => {
        return `linear-gradient(to right, ${rgbToHex(hsvToRgb(hsv.h, 0, hsv.v))}, ${rgbToHex(hsvToRgb(hsv.h, 100, hsv.v))})`;
    }, [hsv.h, hsv.v]);
    const valGradient = useMemo(() => {
        return `linear-gradient(to right, #000, ${rgbToHex(hsvToRgb(hsv.h, hsv.s, 100))})`;
    }, [hsv.h, hsv.s]);

    // Replaces ColorMenu with Global Context Menu
    const handleStripAction = (e: React.MouseEvent) => {
        if (e.button !== 0 && e.button !== 2) return;
        e.preventDefault();
        e.stopPropagation();

        const items: ContextMenuItem[] = [
            { label: 'Actions', action: () => {}, isHeader: true },
            { 
                label: `Copy Hex (${color})`, 
                action: () => navigator.clipboard.writeText(color.toUpperCase()) 
            },
            {
                label: 'Paste Hex',
                action: async () => {
                    try {
                        let text = await navigator.clipboard.readText();
                        text = text.trim();
                        if (!text.startsWith('#')) text = '#' + text;
                        if (/^#[0-9A-F]{6}$/i.test(text) || /^#[0-9A-F]{3}$/i.test(text)) {
                            // Normalize 3 digit
                            if (text.length === 4) {
                                const r = text[1], g = text[2], b = text[3];
                                text = `#${r}${r}${g}${g}${b}${b}`;
                            }
                            const c = text.toUpperCase();
                            const rgb = hexToRgb(c);
                            if (rgb) {
                                handleInteractionStart('param');
                                setHsv(rgbToHsv(rgb));
                                lastOutputHex.current = c;
                                onColorChange(c);
                                addToHistory(c);
                                handleInteractionEnd();
                            }
                        }
                    } catch (err) { console.warn("Paste failed", err); }
                }
            },
            { label: 'Quick Picks', action: () => {}, isHeader: true },
            { 
                label: 'White (#FFFFFF)', 
                icon: <div className="w-3 h-3 rounded-full bg-white border border-gray-600" />,
                action: () => {
                    handleInteractionStart('param');
                    const c = '#FFFFFF';
                    setHsv({h:0, s:0, v:100});
                    lastOutputHex.current = c;
                    onColorChange(c);
                    addToHistory(c);
                    handleInteractionEnd();
                }
            },
            { 
                label: 'Black (#000000)', 
                icon: <div className="w-3 h-3 rounded-full bg-black border border-gray-600" />,
                action: () => {
                    handleInteractionStart('param');
                    const c = '#000000';
                    setHsv({h:0, s:0, v:0});
                    lastOutputHex.current = c;
                    onColorChange(c);
                    addToHistory(c);
                    handleInteractionEnd();
                }
            }
        ];

        if (colorHistory.length > 0) {
            items.push({ label: 'History', action: () => {}, isHeader: true });
            colorHistory.forEach(h => {
                items.push({
                    label: h,
                    icon: <div className="w-3 h-3 rounded-full border border-gray-600" style={{backgroundColor: h}} />,
                    action: () => {
                        handleInteractionStart('param');
                        const rgb = hexToRgb(h);
                        if (rgb) {
                            setHsv(rgbToHsv(rgb));
                            lastOutputHex.current = h;
                            onColorChange(h);
                            addToHistory(h);
                        }
                        handleInteractionEnd();
                    }
                });
            });
        }

        openContextMenu(e.clientX, e.clientY, items, ['ui.colorpicker']);
    };

    const handleContainerContextMenu = (e: React.MouseEvent) => {
        // If clicking the color swatch, let handleStripAction handle it (it uses custom menu)
        // If clicking the sliders area, trigger Help System
        if ((e.target as HTMLElement).closest('.hsv-stack')) {
            const ids = collectHelpIds(e.currentTarget);
            if (ids.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                openContextMenu(e.clientX, e.clientY, [], ids);
            }
        }
    };

    const handleSliderStart = () => handleInteractionStart('param');
    const handleSliderEnd = () => handleInteractionEnd();

    return (
        <div 
            className="flex flex-row h-[66px] bg-black/40 border border-white/5 overflow-hidden group/picker relative gradient-interactive-element" 
            onMouseUp={handleMouseUp}
            data-help-id="ui.colorpicker"
            onContextMenu={handleContainerContextMenu}
        >
            <div 
                className="w-8 shrink-0 relative cursor-pointer border-r border-white/10 hover:brightness-110 active:brightness-125 transition-all bg-gray-800"
                style={{ backgroundColor: color }}
                onMouseDown={handleStripAction}
                onContextMenu={handleStripAction}
                title="Color Actions & History (Right Click)"
            >
                <div className="absolute inset-0 flex items-center justify-center -rotate-90 whitespace-nowrap text-[10px] font-mono font-bold mix-blend-difference text-white tracking-[0.25em] uppercase opacity-80 group-hover/picker:opacity-100 transition-opacity pl-[0.25em]">
                    {color}
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-[1px] hsv-stack">
                <div className="relative h-[21.3px]" style={{ background: hueGradient }}>
                    <input 
                        type="range" min="0" max="360" step="0.1" value={hsv.h}
                        onChange={(e) => updateHsv({ h: Number(e.target.value) })}
                        onPointerDown={handleSliderStart}
                        onPointerUp={handleSliderEnd}
                        className="precision-slider absolute inset-0 w-full h-full cursor-crosshair"
                    />
                </div>
                <div className="relative h-[21.3px]" style={{ background: satGradient }}>
                    <input 
                        type="range" min="0" max="100" step="0.1" value={hsv.s}
                        onChange={(e) => updateHsv({ s: Number(e.target.value) })}
                        onPointerDown={handleSliderStart}
                        onPointerUp={handleSliderEnd}
                        className="precision-slider absolute inset-0 w-full h-full cursor-crosshair"
                    />
                </div>
                <div className="relative h-[21.3px]" style={{ background: valGradient }}>
                    <input 
                        type="range" min="0" max="100" step="0.1" value={hsv.v}
                        onChange={(e) => updateHsv({ v: Number(e.target.value) })}
                        onPointerDown={handleSliderStart}
                        onPointerUp={handleSliderEnd}
                        className="precision-slider absolute inset-0 w-full h-full cursor-crosshair"
                    />
                </div>
            </div>
        </div>
    );
};

export default EmbeddedColorPicker;
