
import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { registry } from '../../../engine/FractalRegistry';
import { FormulaType } from '../../../types';
import { PREDEFINED_CATEGORIES } from '../../../formulas';
import { useFractalStore } from '../../../store/fractalStore';
import { ContextMenuItem } from '../../../types/help';
import { generateGMF, parseGMF } from '../../../utils/FormulaFormat';
import { UploadIcon, DownloadIcon, NetworkIcon, ChevronDown, CheckIcon, CubeIcon } from '../../Icons';

// --- Lazy Thumbnail Component ---
// Prevents loading all images at once. Only loads when scrolled into view.
// Handles errors gracefully by hiding itself (falling back to parent container icon).
const LazyThumbnail = React.memo(({ id, label }: { id: string, label: string }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = imgRef.current;
        if (!el) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '50px' }); // Load shortly before appearing

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (hasError) return null; // Hide image, revealing the icon behind it

    return (
        <div ref={imgRef} className="w-full h-full">
            {isVisible && (
                <img 
                    src={`/thumbnails/fractal_${id}.jpg`} 
                    alt={label} 
                    className="w-full h-full object-cover" 
                    onError={() => setHasError(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
});

const PortalDropdown = ({ 
    rect, 
    onClose, 
    onSelect, 
    currentValue,
    onImport,
    showImport
}: { 
    rect: DOMRect, 
    onClose: () => void, 
    onSelect: (f: FormulaType) => void, 
    currentValue: FormulaType,
    onImport: () => void,
    showImport: boolean
}) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' }); 
    const [previewStyle, setPreviewStyle] = useState<React.CSSProperties>({});
    const [isMobile, setIsMobile] = useState(false);

    // Memoize categories to prevent rebuilds on hover updates
    const categories = useMemo(() => {
        const allDefs = registry.getAll();
        const availableIds = new Set(allDefs.map(d => d.id));
        const cats = [];

        for (const pref of PREDEFINED_CATEGORIES) {
            const items = pref.match.filter(id => {
                if (availableIds.has(id as FormulaType)) {
                    availableIds.delete(id as FormulaType);
                    return true;
                }
                return false;
            });
            
            if (items.length > 0) {
                cats.push({ name: pref.name, items });
            }
        }

        if (availableIds.size > 0) {
            cats.push({
                name: "Custom / Imported",
                items: Array.from(availableIds)
            });
        }
        
        return cats;
    }, []);

    // Layout Logic: Strict Viewport Clamping
    useLayoutEffect(() => {
        const winH = window.innerHeight;
        const winW = window.innerWidth;
        const padding = 12;
        const width = 340;
        
        const mobile = winW < 768;
        setIsMobile(mobile);

        // 1. Horizontal Positioning (Prevent Right Overflow)
        let left = rect.left;
        // If spilling off right edge, shift left
        if (left + width > winW - padding) {
            left = winW - width - padding;
        }
        // Ensure strictly positive
        left = Math.max(padding, left); 

        // 2. Vertical Positioning (Flip if needed)
        const spaceBelow = winH - rect.bottom;
        const spaceAbove = rect.top;
        
        // If not enough space below (< 400px) AND more space above, flip up.
        const shouldFlip = spaceBelow < 300 && spaceAbove > spaceBelow;
        
        // Calculate max height based on available space in chosen direction
        let availableH = shouldFlip ? (spaceAbove - padding) : (spaceBelow - padding);
        
        // Cap max height for aesthetics on large screens, but allow shrinking on small screens
        // Ensure at least 150px
        const height = Math.min(600, Math.max(150, availableH));

        const baseStyle: React.CSSProperties = {
            position: 'fixed',
            left: `${left}px`,
            width: `${width}px`,
            maxHeight: `${height}px`,
            maxWidth: `calc(100vw - ${padding*2}px)`,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            opacity: 1,
            pointerEvents: 'auto'
        };

        const verticalStyle: React.CSSProperties = shouldFlip ? {
            bottom: `${winH - rect.top + 4}px`,
            top: 'auto',
            transformOrigin: 'bottom left'
        } : {
            top: `${rect.bottom + 4}px`,
            bottom: 'auto',
            transformOrigin: 'top left'
        };

        setStyle({ ...baseStyle, ...verticalStyle });
        
        // 3. Preview Positioning (Desktop only)
        if (!mobile) {
            // Check space on right side of menu first
            const spaceRight = winW - (left + width);
            const previewW = 260; // 256 + borders
            
            if (spaceRight > previewW + 20) {
                // Place on Right
                setPreviewStyle({ 
                    left: '100%', 
                    marginLeft: '10px', 
                    top: shouldFlip ? 'auto' : 0,
                    bottom: shouldFlip ? 0 : 'auto'
                });
            } else {
                // Place on Left
                setPreviewStyle({ 
                    right: '100%', 
                    marginRight: '10px', 
                    top: shouldFlip ? 'auto' : 0,
                    bottom: shouldFlip ? 0 : 'auto'
                });
            }
        }
    }, [rect]);

    useEffect(() => {
        // Close on window resize to prevent stale positioning
        const handleResize = () => onClose();
        
        const handleInteraction = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.portal-dropdown-content')) return;
            onClose();
        };
        const handleWheel = (e: WheelEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.portal-dropdown-content')) return;
            onClose();
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousedown', handleInteraction, true);
        window.addEventListener('wheel', handleWheel, true);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousedown', handleInteraction, true);
            window.removeEventListener('wheel', handleWheel, true);
        };
    }, [onClose]);

    return createPortal(
        <div style={style}>
            <div 
                className="portal-dropdown-content bg-[#121212] border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-y-auto custom-scroll animate-fade-in-down w-full flex-1"
                onMouseLeave={() => setHoveredId(null)}
            >
                {showImport && (
                    <div className="p-1 border-b border-white/5 sticky top-0 bg-[#121212] z-50">
                        <button
                            onClick={() => { onImport(); onClose(); }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 text-[10px] font-black uppercase tracking-wider rounded border border-cyan-500/20 hover:border-cyan-500/50 transition-colors"
                        >
                            <UploadIcon />
                            Import Formula (.GMF)
                        </button>
                    </div>
                )}

                {categories.map((cat) => (
                    <div key={cat.name} className="py-1">
                        <div className={`px-3 py-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-[#121212] border-y border-white/5 sticky z-40 shadow-sm ${showImport ? 'top-[38px]' : 'top-0'}`}>
                            {cat.name}
                        </div>
                        {cat.items.map((item) => {
                            const isModular = item === 'Modular';
                            const def = registry.get(item as FormulaType);
                            const label = def ? def.name : item;
                            const isSelected = currentValue === item;

                            return (
                                <button
                                    key={item}
                                    onClick={() => onSelect(item as FormulaType)}
                                    onMouseEnter={() => setHoveredId(item)}
                                    className={`w-full text-left px-3 py-2.5 transition-all flex gap-3 group relative border-b border-white/5 last:border-b-0 ${
                                        isSelected 
                                        ? 'bg-cyan-900/20' 
                                        : 'hover:bg-white/5'
                                    }`}
                                >
                                    {/* Thumb Container */}
                                    <div className="w-16 h-10 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group-hover:border-cyan-500/50 transition-colors">
                                        {/* Background Icon (Fallback) */}
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-800 bg-gray-900 z-0">
                                            {isModular ? <NetworkIcon /> : <CubeIcon />}
                                        </div>
                                        
                                        {/* Image Layer (Lazy Loaded) */}
                                        {!isModular && (
                                            <div className="relative z-10 w-full h-full">
                                                <LazyThumbnail id={item} label={label} />
                                            </div>
                                        )}
                                        
                                        {isSelected && (
                                            <div className="absolute inset-0 z-20 bg-cyan-500/20 flex items-center justify-center">
                                                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-cyan-900 shadow-lg">
                                                    <CheckIcon />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-[11px] font-bold tracking-tight truncate ${
                                                isSelected ? 'text-cyan-400' : 'text-gray-200 group-hover:text-white'
                                            } ${isModular ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 font-black' : ''}`}>
                                                {label}
                                            </span>
                                        </div>
                                        {def?.shortDescription && (
                                            <p className="text-[9px] text-gray-500 line-clamp-2 leading-tight group-hover:text-gray-400">
                                                {def.shortDescription}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Hover Large Preview - Full 256x256 View (Desktop Only) */}
            {hoveredId && hoveredId !== 'Modular' && !isMobile && (
                <div 
                    className="absolute w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1),0_0_20px_rgba(34,211,238,0.2)] overflow-hidden animate-fade-in pointer-events-none z-[10000]"
                    style={previewStyle}
                >
                    <img 
                        src={`/thumbnails/fractal_${hoveredId}.jpg`} 
                        className="w-full h-full object-cover" 
                        alt="Preview" 
                        onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                         <div className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] drop-shadow-md">
                             {registry.get(hoveredId as FormulaType)?.name || hoveredId}
                         </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export const FormulaSelect = ({ value, onChange }: { value: FormulaType, onChange: (f: FormulaType) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    
    // Global Hooks
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);
    const setExportIncludeScene = useFractalStore(s => s.setExportIncludeScene);
    const exportIncludeScene = useFractalStore(s => s.exportIncludeScene);
    const advancedMode = useFractalStore(s => s.advancedMode);

    const toggle = () => {
        if (!isOpen && btnRef.current) {
            setRect(btnRef.current.getBoundingClientRect());
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    const performExport = (includeScene: boolean) => {
        const def = registry.get(value);
        if (!def) return;

        const presetToSave = useFractalStore.getState().getPreset({ includeScene });
        const gmfContent = generateGMF(def, presetToSave);

        const blob = new Blob([gmfContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${def.id}${includeScene ? '_Full' : ''}.gmf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        performExport(exportIncludeScene);
    };

    const handleExportContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const items: ContextMenuItem[] = [
            { label: 'Export Options', action: () => {}, isHeader: true },
            { 
                label: 'Include Scene Data', 
                checked: exportIncludeScene,
                action: () => setExportIncludeScene(!exportIncludeScene) 
            },
            { label: 'Actions', action: () => {}, isHeader: true },
            {
                label: 'Export Formula Only',
                action: () => performExport(false)
            },
            {
                label: 'Export Full Package',
                action: () => performExport(true)
            }
        ];
        
        openGlobalMenu(e.clientX, e.clientY, items, []);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target?.result as string;
                const def = parseGMF(content);
                registry.register(def);
                onChange(def.id as FormulaType);
                if (fileRef.current) fileRef.current.value = '';
            } catch (err) {
                console.error("Failed to import formula:", err);
                alert("Invalid formula file. Ensure it is a valid .gmf or .json definition.");
            }
        };
        reader.readAsText(file);
    };

    const selectedDef = registry.get(value);
    const displayLabel = selectedDef ? selectedDef.name : value;
    const isModular = value === 'Modular';

    return (
        <div className="flex gap-2">
            <input 
                ref={fileRef}
                type="file"
                accept=".json,.gmf"
                className="hidden"
                onChange={handleImport}
            />
            
            <button 
                ref={btnRef}
                onClick={toggle}
                className={`flex-1 flex items-center justify-between bg-gray-900 border text-xs text-white rounded p-2 outline-none transition-all group ${
                    isOpen 
                    ? 'border-cyan-500 ring-1 ring-cyan-900' 
                    : isModular 
                        ? 'border-purple-500/50 shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]' 
                        : 'border-gray-700 hover:border-gray-500'
                }`}
            >
                <div className="flex items-center gap-2">
                    {isModular && (
                        <span className="flex w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_5px_#a855f7]" />
                    )}
                    <span className={`font-bold tracking-wide ${isModular ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300' : ''}`}>
                        {displayLabel}
                    </span>
                </div>
                <div className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}><ChevronDown /></div>
            </button>

            {!isModular && advancedMode && (
                <button
                    onClick={handleExportClick}
                    onContextMenu={handleExportContextMenu}
                    className="w-8 flex items-center justify-center bg-gray-900 border border-gray-700 hover:border-white/50 hover:bg-white/5 text-gray-400 hover:text-white rounded transition-colors"
                    title={exportIncludeScene ? "Export Full Preset (Right-click for options)" : "Export Formula Only (Right-click for options)"}
                >
                    <DownloadIcon />
                </button>
            )}

            {isOpen && rect && (
                <PortalDropdown 
                    rect={rect} 
                    currentValue={value} 
                    onClose={() => setIsOpen(false)} 
                    onSelect={(f) => { onChange(f); setIsOpen(false); }} 
                    onImport={() => fileRef.current?.click()}
                    showImport={advancedMode}
                />
            )}
        </div>
    );
};
