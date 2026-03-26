
import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { registry } from '../../../engine/FractalRegistry';
import { FormulaType } from '../../../types';
import { PREDEFINED_CATEGORIES } from '../../../formulas';
import { loadGMFScene } from '../../../utils/FormulaFormat';
import { UploadIcon, NetworkIcon, ChevronDown, CheckIcon, CubeIcon, LoadIcon, CodeIcon } from '../../Icons';
import { FractalEvents, FRACTAL_EVENTS } from '../../../engine/FractalEvents';
import { useFractalStore } from '../../../store/fractalStore';

// --- Gallery Types ---
interface GalleryItem {
    id: string;
    name: string;
    path: string;
}

interface GalleryCategory {
    id: string;
    name: string;
    items: GalleryItem[];
}

interface GalleryManifest {
    version: string;
    description: string;
    categories: GalleryCategory[];
}

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
                    src={`thumbnails/fractal_${id}.jpg`}
                    alt={label}
                    className="w-full h-full object-cover"
                    onError={() => setHasError(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
});

export const PortalDropdown = ({
    rect,
    onClose,
    onSelect,
    currentValue,
    onImport,
    showImport,
    onImportFragmentarium
}: {
    rect: DOMRect,
    onClose: () => void,
    onSelect: (f: FormulaType) => void,
    currentValue: FormulaType,
    onImport: () => void,
    showImport: boolean,
    onImportFragmentarium: () => void
}) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });
    const [previewStyle, setPreviewStyle] = useState<React.CSSProperties>({});
    const [isMobile, setIsMobile] = useState(false);
    const [galleryItems, setGalleryItems] = useState<GalleryCategory[]>([]);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // Fetch gallery items on mount
    useEffect(() => {
        const fetchGallery = async () => {
            setGalleryLoading(true);
            try {
                const response = await fetch('./gmf/gallery.json');
                if (response.ok) {
                    const data: GalleryManifest = await response.json();
                    setGalleryItems(data.categories || []);
                }
            } catch (err) {
                console.warn('Failed to load gallery:', err);
            } finally {
                setGalleryLoading(false);
            }
        };
        fetchGallery();
    }, []);

    // Handle loading a formula from gallery
    const handleGallerySelect = async (item: GalleryItem) => {
        try {
            const response = await fetch(item.path);
            if (response.ok) {
                const content = await response.text();
                FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, "Compiling Formula...");
                const { def, preset } = loadGMFScene(content);
                if (def) {
                    // loadScene handles: formula registration (main + worker),
                    // store hydration, full config flush, and offset sync.
                    useFractalStore.getState().loadScene({ def, preset });
                } else {
                    // Legacy JSON or formula-only — just switch formula
                    onSelect(preset.formula as FormulaType);
                }
                onClose();
            } else {
                console.error('Failed to load formula from gallery:', item.path);
                alert(`Failed to load formula: ${item.name}`);
            }
        } catch (err) {
            console.error('Error loading gallery formula:', err);
            FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
            alert(`Error loading formula: ${item.name}`);
        }
    };

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
                    <div className="p-1 border-b border-white/5 sticky top-0 bg-[#121212] z-50 space-y-1">
                        <button
                            onClick={() => { onImport(); onClose(); }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 text-[10px] font-bold rounded border border-cyan-500/20 hover:border-cyan-500/50 transition-colors"
                        >
                            <UploadIcon />
                            Import Formula (.GMF)
                        </button>
                        <button
                            onClick={() => { onImportFragmentarium(); onClose(); }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 text-[10px] font-bold rounded border border-purple-500/20 hover:border-purple-500/50 transition-colors"
                        >
                            <CodeIcon />
                            Formula Workshop
                        </button>
                    </div>
                )}

                {categories.map((cat) => (
                    <div key={cat.name} className="py-1">
                        <div className={`px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-[#121212] border-y border-white/5 sticky z-40 shadow-sm ${showImport ? 'top-[38px]' : 'top-0'}`}>
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
                                            } ${isModular ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 font-bold' : ''}`}>
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

                {/* Gallery Section - Add from GMF Gallery */}
                {galleryItems.length > 0 && (
                    <div className="py-1 border-t border-white/10">
                        <div className="px-3 py-1.5 text-[9px] font-bold text-gray-500 bg-[#121212] sticky z-40 shadow-sm top-[38px]">
                            Add from Gallery
                        </div>
                        {galleryItems.map((category) => (
                            <div key={category.id} className="border-b border-white/5">
                                {/* Folder Header - Click to Expand */}
                                <button
                                    onClick={() => {
                                        setExpandedFolders(prev => {
                                            const next = new Set(prev);
                                            if (next.has(category.id)) {
                                                next.delete(category.id);
                                            } else {
                                                next.add(category.id);
                                            }
                                            return next;
                                        });
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 group hover:bg-white/5 transition-colors"
                                >
                                    <span className={`w-3 h-3 text-gray-500 transition-transform ${expandedFolders.has(category.id) ? 'rotate-180' : ''}`}>
                                        <ChevronDown />
                                    </span>
                                    <span className="text-[11px] font-bold text-purple-400 group-hover:text-purple-300">
                                        {category.name}
                                    </span>
                                    <span className="text-[9px] text-gray-600">
                                        ({category.items.length} formulas)
                                    </span>
                                </button>

                                {/* Expanded Items */}
                                {expandedFolders.has(category.id) && (
                                    <div className="bg-black/30">
                                        {category.items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleGallerySelect(item)}
                                                onMouseEnter={() => setHoveredId(item.id)}
                                                className="w-full text-left px-6 py-2 transition-all flex gap-3 group hover:bg-white/5"
                                            >
                                                <div className="w-16 h-8 shrink-0 bg-black rounded border border-white/10 overflow-hidden relative group-hover:border-purple-500/50 transition-colors">
                                                    <div className="absolute inset-0 flex items-center justify-center text-gray-800 bg-gray-900 z-0">
                                                        <LoadIcon />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1 justify-center">
                                                    <span className="text-[11px] font-bold tracking-tight truncate text-gray-200 group-hover:text-white">
                                                        {item.name}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Loading state for gallery */}
                {galleryLoading && (
                    <div className="py-2 text-center text-[10px] text-gray-500">
                        Loading gallery...
                    </div>
                )}
            </div>

            {/* Hover Large Preview - Full 256x256 View (Desktop Only) */}
            {hoveredId && hoveredId !== 'Modular' && !isMobile && (
                <div
                    className="absolute w-[256px] h-[256px] bg-black border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,1),0_0_20px_rgba(34,211,238,0.2)] overflow-hidden animate-fade-in pointer-events-none z-[10000]"
                    style={previewStyle}
                >
                    <img
                        src={`thumbnails/fractal_${hoveredId}.jpg`}
                        className="w-full h-full object-cover"
                        alt="Preview"
                        onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,4px_100%] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                         <div className="text-[10px] font-bold text-cyan-400 drop-shadow-md">
                             {registry.get(hoveredId as FormulaType)?.name || hoveredId}
                         </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
