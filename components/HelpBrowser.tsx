
import React, { useMemo, useState, useEffect, useRef } from 'react';
import DraggableWindow from './DraggableWindow';
import { z } from './ui';
import { useHelpTopics } from '../data/help/useHelpTopics';
import { HelpSection } from '../types/help';
import { ChevronDown, ChevronRight } from './Icons';

interface HelpBrowserProps {
    activeTopicId: string | null;
    onClose: () => void;
    onNavigate: (id: string) => void;
}

// "What's New" sits second so it's prominent in the sidebar without displacing
// "Getting Started" as CATEGORY_ORDER[0] — the default landing category when
// Help opens with no active topic (see activeCategory fallback below).
const CATEGORY_ORDER = ['Getting Started', "What's New", 'General', 'Formulas', 'Parameters', 'UI', 'Timeline', 'Graph', 'Animation', 'Lighting', 'Rendering', 'Coloring', 'Audio', 'Effects', 'Export'];

/**
 * Below this window width the topic sidebar becomes a scrolling ROW of topic chips above the
 * reading pane (C12, 2026-09-24). Measured on the window, not the viewport — it is resizable
 * — like EmbeddedColorPicker's layouts. At 30 % of a 344 px phone window the sidebar was 98 px
 * and cut every Gradient Explorer title to "Welcom…", "The wall an…".
 */
const NARROW_PX = 480;

const HelpBrowser: React.FC<HelpBrowserProps> = ({ activeTopicId, onClose, onNavigate }) => {
    // HelpBrowser is React.lazy-loaded, so by the time this component runs the
    // user has explicitly requested help. The hook resolves to the full topic
    // map on first render (usually already cached thanks to App's idle prefetch).
    const HELP_TOPICS = useHelpTopics();
    const [searchTerm, setSearchTerm] = useState('');
    // Initialize collapsed by default as requested
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    
    // Refs for scrolling logic
    const contentRef = useRef<HTMLDivElement>(null);
    const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const forceScrollRef = useRef(false);
    
    // Lock to prevent IntersectionObserver from overriding clicked selection during scroll animation
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<number | null>(null);

    // Container-responsive: the chip row under NARROW_PX of window width. Starts from the width
    // the window opens at (below), so a phone does not flash the sidebar first.
    const rootRef = useRef<HTMLDivElement>(null);
    const chipRowRef = useRef<HTMLDivElement>(null);
    const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && Math.min(700, window.innerWidth - 16) < NARROW_PX);
    useEffect(() => {
        // The window's body, not our root: the root's own width depends on the layout (the
        // wide one's -m-3 below), and a width that moves with the answer would flip-flop.
        const el = rootRef.current?.parentElement;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => setNarrow(entries[0].contentRect.width < NARROW_PX));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Helper to trace lineage for Accordion logic with Cycle Protection
    const getAncestors = (id: string): string[] => {
        const path: string[] = [];
        const visited = new Set<string>();
        let curr = HELP_TOPICS[id];
        
        while (curr && curr.parentId) {
            if (visited.has(curr.parentId)) {
                console.warn("Cycle detected in help topics:", id);
                break;
            }
            visited.add(curr.parentId);
            path.push(curr.parentId);
            curr = HELP_TOPICS[curr.parentId];
        }
        return path;
    };

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id); // Just close
                return next;
            } else {
                // Accordion Open: Close others, keep ancestors, open self
                const ancestors = getAncestors(id);
                return new Set([...ancestors, id]);
            }
        });
    };

    // Determine Active Category to constrain rendering
    const activeTopic = activeTopicId ? HELP_TOPICS[activeTopicId] : null;
    const activeCategory = activeTopic ? activeTopic.category : (CATEGORY_ORDER[0] as string);

    // Group all topics by category for the Sidebar
    const categories = useMemo(() => {
        const cats: Record<string, HelpSection[]> = {};
        Object.values(HELP_TOPICS).forEach(topic => {
            if (searchTerm && !topic.title.toLowerCase().includes(searchTerm.toLowerCase()) && !topic.content.toLowerCase().includes(searchTerm.toLowerCase())) {
                return;
            }
            if (!cats[topic.category]) cats[topic.category] = [];
            cats[topic.category].push(topic);
        });
        return cats;
    }, [searchTerm, HELP_TOPICS]);

    // The narrow layout's chips: the sidebar's own order flattened — category by category, each
    // root followed by its children (the tree renderTopicTree draws, with nothing collapsed).
    const chipTopics = useMemo(() => {
        const out: HelpSection[] = [];
        for (const topics of Object.values(categories)) {
            const ids = new Set(topics.map((t) => t.id));
            const kids = new Map<string, HelpSection[]>();
            topics.forEach((t) => {
                if (t.parentId && ids.has(t.parentId)) kids.set(t.parentId, [...(kids.get(t.parentId) ?? []), t]);
            });
            const seen = new Set<string>(); // cycle protection, as the sidebar has
            const walk = (t: HelpSection) => {
                if (seen.has(t.id)) return;
                seen.add(t.id);
                out.push(t);
                (kids.get(t.id) ?? []).forEach(walk);
            };
            topics.filter((t) => !t.parentId || !ids.has(t.parentId)).forEach(walk);
        }
        return out;
    }, [categories]);

    // Keep the active topic's chip in view as the reading pane scrolls through the topics.
    useEffect(() => {
        if (!narrow || !activeTopicId) return;
        const row = chipRowRef.current;
        const chip = row?.querySelector<HTMLElement>(`[data-help-chip="${CSS.escape(activeTopicId)}"]`);
        if (!row || !chip) return;
        const r = row.getBoundingClientRect();
        const c = chip.getBoundingClientRect();
        if (c.left < r.left) row.scrollLeft += c.left - r.left - 8;
        else if (c.right > r.right) row.scrollLeft += c.right - r.right + 8;
    }, [narrow, activeTopicId, chipTopics]);

    // Flattened list logic - Optimized to only return topics for the Current Category (or Search)
    const visibleTopics = useMemo(() => {
        let pool: HelpSection[] = [];

        if (searchTerm) {
            // If searching, search EVERYTHING
            pool = Object.values(HELP_TOPICS).filter(t => 
                t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                t.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
            // Sort by category preference then title
            pool.sort((a,b) => {
                const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
                if (catDiff !== 0) return catDiff;
                return a.title.localeCompare(b.title);
            });
        } else {
            // If browsing, only show topics for the active category
            // This prevents rendering huge DOM trees and fixes scroll anchoring issues
            pool = Object.values(HELP_TOPICS).filter(t => t.category === activeCategory);
            
            // Sort by hierarchy (roots first, then children)
            const groupedByParent: Record<string, HelpSection[]> = {};
            const roots: HelpSection[] = [];
            
            pool.forEach(t => {
                if (t.parentId && HELP_TOPICS[t.parentId]?.category === activeCategory) {
                    if (!groupedByParent[t.parentId]) groupedByParent[t.parentId] = [];
                    groupedByParent[t.parentId].push(t);
                } else {
                    roots.push(t);
                }
            });
            
            roots.sort((a,b) => a.title.localeCompare(b.title));
            
            const flat: HelpSection[] = [];
            const visited = new Set<string>();

            const traverse = (nodes: HelpSection[]) => {
                nodes.forEach(n => {
                    if (visited.has(n.id)) return; // Cycle protection
                    visited.add(n.id);
                    
                    flat.push(n);
                    if (groupedByParent[n.id]) {
                        groupedByParent[n.id].sort((a,b) => a.title.localeCompare(b.title));
                        traverse(groupedByParent[n.id]);
                    }
                });
            };
            traverse(roots);
            pool = flat;
        }

        return pool;
    }, [searchTerm, activeCategory, HELP_TOPICS]);

    // Auto-expand the active topic's ancestor chain in the sidebar so the
    // selected entry is actually visible in the TOC. Without this, external
    // openHelp(id) calls (e.g. a "?" button click outside the browser) leave
    // the topic hidden under a collapsed parent.
    useEffect(() => {
        if (!activeTopicId) return;
        const ancestors = getAncestors(activeTopicId);
        setExpandedItems(prev => {
            const next = new Set(prev);
            ancestors.forEach(a => next.add(a));
            next.add(activeTopicId);
            return next;
        });
    }, [activeTopicId]);

    // Scroll active topic into view when ID changes
    useEffect(() => {
        // LOCK IMMEDIATELY: Prevent observer from hijacking navigation while we calculate scroll position
        isScrollingRef.current = true;

        const container = contentRef.current;
        if (!activeTopicId || !container) {
            isScrollingRef.current = false;
            return;
        }

        // Custom rAF scroll capped at SCROLL_DURATION_MS — native
        // scrollIntoView({behavior:'smooth'}) lets the browser pick a duration
        // based on distance, so long jumps to a far topic could take >1s and
        // outrun the observer lock. A fixed short duration keeps "click ? →
        // land on topic" snappy regardless of distance.
        const SCROLL_DURATION_MS = 220;
        let rafId = 0;
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const animateScroll = (targetTop: number) => {
            const startTop = container.scrollTop;
            const delta = targetTop - startTop;
            if (Math.abs(delta) < 1) {
                isScrollingRef.current = false;
                return;
            }
            const start = performance.now();
            const tick = (now: number) => {
                const t = Math.min((now - start) / SCROLL_DURATION_MS, 1);
                container.scrollTop = startTop + delta * easeOutCubic(t);
                if (t < 1) {
                    rafId = requestAnimationFrame(tick);
                } else {
                    isScrollingRef.current = false;
                }
            };
            rafId = requestAnimationFrame(tick);
        };

        // Retry mechanism for cases where DOM hasn't rendered yet
        let attempts = 0;
        const maxAttempts = 10;
        const attemptDelay = 50;

        const tryScroll = () => {
            const el = topicRefs.current[activeTopicId];
            if (!el) {
                attempts++;
                if (attempts < maxAttempts) {
                    // Retry after delay
                    setTimeout(tryScroll, attemptDelay);
                } else {
                    // Give up and unlock
                    isScrollingRef.current = false;
                }
                return;
            }

            // Compute target scrollTop so the topic lands near the top of the viewport
            // (matches the prior `block: 'start'` behaviour, with a small padding).
            const containerRect = container.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            const targetTop = container.scrollTop + (rect.top - containerRect.top) - 16;

            if (forceScrollRef.current) {
                forceScrollRef.current = false;
                animateScroll(targetTop);
                return;
            }

            // Snap logic for external triggers — only scroll if the topic isn't
            // already roughly at the top of the viewport.
            const isVisibleAtTop = rect.top >= containerRect.top - 50 && rect.top <= containerRect.top + 300;
            if (!isVisibleAtTop) {
                animateScroll(targetTop);
            } else {
                isScrollingRef.current = false;
            }
        };

        // Initial delay to ensure DOM update has flushed after category switch
        const timer = setTimeout(tryScroll, 50);

        return () => {
            clearTimeout(timer);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [activeTopicId, visibleTopics]);

    // Intersection Observer to update active ID on scroll
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const observer = new IntersectionObserver((entries) => {
            if (isScrollingRef.current) return;

            // Find the element that is most prominent near the top of the container
            const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
            
            if (visible.length > 0) {
                // Heuristic: Pick the one closest to the top line
                let best = visible[0];
                let minTopDist = Infinity;
                const containerTop = container.getBoundingClientRect().top;
                
                visible.forEach(v => {
                    const topDist = Math.abs(v.boundingClientRect.top - containerTop);
                    if (topDist < minTopDist) {
                        minTopDist = topDist;
                        best = v;
                    }
                });

                const id = best.target.getAttribute('data-topic-id');
                // Only update if we are not locked by a programmed scroll
                if (id && id !== activeTopicId && !forceScrollRef.current && !isScrollingRef.current) {
                    onNavigate(id);
                }
            }
        }, { 
            root: container,
            rootMargin: '-10% 0px -80% 0px', // Active zone is near the top
            threshold: [0, 0.1, 0.5] 
        });

        visibleTopics.forEach(t => {
            const el = topicRefs.current[t.id];
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [visibleTopics, activeTopicId, onNavigate]);

    // Handle Manual Navigation (Click)
    const handleSidebarNavigate = (id: string) => {
        forceScrollRef.current = true;
        onNavigate(id);
        
        // Accordion Logic on Select:
        // Ensure path is open, AND ensure the selected item itself is open (if it has children)
        // Close everything else not in the lineage.
        const ancestors = getAncestors(id);
        setExpandedItems(new Set([...ancestors, id]));
    };

    // Helper to parse inline formatting (Bold, Math, Link)
    const parseInline = (text: string) => {
        // Split by bold (**...**), inline code (`...`), inline math ($...$), or links ([...](...))
        // Regex notes:
        // \*\*.*?\*\* matches bold
        // `[^`]+` matches inline code
        // \$.*?\$ matches math
        // \[[^\]]+\]\([^)]+\) matches [text](url) - checks for non-] inside brackets and non-) inside parens
        const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\$.*?\$|\[[^\]]+\]\([^)]+\))/g);

        return parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="text-fg font-bold">{part.slice(2, -2)}</strong>;
            }
            if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) {
                return <code key={j} className="text-[11px] font-mono bg-line/10 text-accent-200 rounded px-1 py-0.5">{part.slice(1, -1)}</code>;
            }
            if (part.startsWith('$') && part.endsWith('$')) {
                // Math styling: Serif, Italic, Cyan tint
                return <span key={j} className="font-serif italic text-accent-300 px-0.5">{part.slice(1, -1)}</span>;
            }
            if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
                const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                if (match) {
                    return (
                        <a 
                            key={j} 
                            href={match[2]} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-accent-400 hover:underline hover:text-accent-300 transition-colors cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {match[1]}
                        </a>
                    );
                }
            }
            return part;
        });
    };

    // Simple Markdown Parser
    const renderContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-fg mt-4 mb-2">{line.replace('### ', '')}</h3>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-accent-400 mt-5 mb-2 border-b border-line/10 pb-1">{line.replace('## ', '')}</h2>;

            // Horizontal rule: a line of --- / *** / ___ (section divider).
            if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return <hr key={i} className="border-0 border-t border-line/15 my-5" />;

            // Blockquote: "> text" renders as a muted aside (used for entry dates).
            if (line.startsWith('> ')) return <p key={i} className="text-[11px] text-fg-faint italic mb-2">{parseInline(line.slice(2))}</p>;

            // Block Math: $$ ... $$
            if (line.startsWith('$$')) {
                const mathText = line.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '');
                return (
                    <div key={i} className="font-serif italic text-center text-cyan-200 bg-surface-section p-3 rounded-lg my-3 text-sm border border-line/10 shadow-sm overflow-x-auto">
                        {mathText}
                    </div>
                );
            }
            
            if (line.startsWith('- ')) {
                return <li key={i} className="ml-4 text-xs text-fg-tertiary mb-1">{parseInline(line.replace('- ', ''))}</li>;
            }
            
            if (line.trim() === '') return <div key={i} className="h-2" />;
            
            return (
                <p key={i} className="text-xs text-fg-tertiary leading-relaxed mb-1">
                    {parseInline(line)}
                </p>
            );
        });
    };

    const renderTopicTree = (topics: HelpSection[]) => {
        const topicMap = new Map(topics.map(t => [t.id, t]));
        const childrenMap = new Map<string, HelpSection[]>();
        
        // Build hierarchy
        topics.forEach(t => {
            if (t.parentId && topicMap.has(t.parentId)) {
                if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
                childrenMap.get(t.parentId)!.push(t);
            }
        });

        // Root nodes
        const roots = topics.filter(t => !t.parentId || !topicMap.has(t.parentId));
        
        // Recursion Safe Set
        const renderedIds = new Set<string>();

        const renderNode = (t: HelpSection, depth: number) => {
            // Cycle protection
            if (renderedIds.has(t.id)) return null;
            renderedIds.add(t.id);

            const children = childrenMap.get(t.id);
            const hasChildren = children && children.length > 0;
            const isSelected = activeTopicId === t.id;
            const isExpanded = expandedItems.has(t.id) || searchTerm.length > 0;

            return (
                <React.Fragment key={t.id}>
                    <div className="flex items-center w-full">
                        <button
                            onClick={() => handleSidebarNavigate(t.id)}
                            className={`flex-1 text-left py-1.5 text-xs rounded-l transition-colors truncate flex items-center ${
                                isSelected ? 'bg-accent-900/50 text-accent-300 border-l-2 border-accent-500' : 'text-fg-muted hover:text-fg hover:bg-line/5 border-l-2 border-transparent'
                            }`}
                            style={{ paddingLeft: `${8 + depth * 12}px` }}
                        >
                            <span className="truncate">{t.title}</span>
                        </button>
                        {hasChildren && (
                            <button 
                                onClick={(e) => toggleExpand(t.id, e)}
                                className={`p-2 hover:text-fg transition-colors rounded-r ${isSelected ? 'bg-accent-900/50 text-accent-400' : 'text-fg-faint hover:bg-line/5'}`}
                            >
                                {isExpanded ? <ChevronDown /> : <ChevronRight />}
                            </button>
                        )}
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="animate-fade-in-down">
                            {children!.map(child => renderNode(child, depth + 1))}
                        </div>
                    )}
                </React.Fragment>
            );
        };

        return roots.map(t => renderNode(t, 0));
    };

    // The window is 700×600 at (100, 100) wherever that fits — every desktop — and is clamped
    // into a viewport that is smaller (2026-09-13: on a 390 px phone it ran 410 px off the
    // right edge, in every app). Above 816×716 these resolve to exactly the old numbers.
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const winW = Math.min(700, vw - 16);
    const winH = Math.min(600, vh - 16);

    const searchInput = (
        <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-sunken border border-line/20 rounded px-2 py-1 text-xs text-fg outline-none focus:border-accent-500 transition-colors"
        />
    );

    return (
        // "Help" in every app (owner, 2026-09-24 — it was "Library", which in the Gradient
        // Explorer is the catalogue's word). Escape closes it: it holds nothing to lose (C10).
        <DraggableWindow
            title="Help"
            onClose={onClose}
            dismissOnEscape
            initialPos={{ x: Math.min(100, Math.max(8, vw - winW - 8)), y: Math.min(100, Math.max(8, vh - winH - 8)) }}
            initialSize={{ width: winW, height: winH }}
            zIndex={z('tool')}
        >
            {/* `-m-3` cancels a `p-3` the window's body no longer has (DraggableWindow's
                bodyClassName), so it pushes 12 px of every edge under the clip. The narrow layout
                drops it — it cut a phone's first topic chip in half. The wide one keeps it for now:
                without it the sidebar is 24 px narrower and "Welcome to Gradient Explorer"
                truncates at the default 700 px, so that fix wants the sidebar's width with it. */}
            <div ref={rootRef} className={`flex h-full ${narrow ? 'flex-col' : '-m-3'}`}>
                {narrow ? (
                /* Narrow: the search, then every topic as a chip in one scrolling row */
                <div className="shrink-0 bg-surface-section border-b border-line/10" data-help-topics="chips">
                    <div className="p-2 pb-1">{searchInput}</div>
                    <div ref={chipRowRef} className="flex gap-1 overflow-x-auto custom-scroll px-2 pb-2">
                        {chipTopics.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                data-help-chip={t.id}
                                onClick={() => handleSidebarNavigate(t.id)}
                                className={`shrink-0 whitespace-nowrap px-2 py-1 rounded text-xs border transition-colors ${
                                    activeTopicId === t.id ? 'bg-accent-900/50 text-accent-300 border-accent-500/60' : 'text-fg-muted border-line/15 hover:text-fg hover:bg-line/5'
                                }`}
                            >
                                {t.title}
                            </button>
                        ))}
                    </div>
                </div>
                ) : (
                /* Sidebar */
                <div className="w-[30%] bg-surface-section border-r border-line/10 flex flex-col shrink-0">
                    <div className="p-2 border-b border-line/10">
                        {searchInput}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scroll p-2">
                        {Object.entries(categories).map(([cat, topics]) => (
                            <div key={cat} className="mb-3">
                                <div className="text-[10px] font-bold text-fg-dim mb-1 px-2 sticky top-0 bg-surface-raised/95 z-10 backdrop-blur-sm py-1 border-b border-line/5">
                                    {cat}
                                </div>
                                {renderTopicTree(topics as HelpSection[])}
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {/* Content - SCROLLABLE AREA */}
                <div
                    ref={contentRef}
                    className={`flex-1 bg-surface-sunken/50 overflow-y-auto custom-scroll ${narrow ? 'min-h-0 p-4' : 'p-6'}`}
                >
                    {!searchTerm && (
                        <div className="mb-6 pb-2 border-b border-line/10">
                            <h2 className="text-2xl font-bold text-fg-ghost tracking-tighter">{activeCategory}</h2>
                        </div>
                    )}

                    <div className="space-y-12">
                        {visibleTopics.map((topic) => (
                            <div 
                                key={topic.id} 
                                id={`topic-${topic.id}`}
                                data-topic-id={topic.id}
                                ref={(el) => { topicRefs.current[topic.id] = el; }}
                                className={`transition-all duration-500 scroll-mt-24 ${topic.id === activeTopicId ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98] blur-[0.5px] grayscale hover:opacity-80 hover:grayscale-0 hover:blur-0 cursor-pointer'}`}
                                onClick={() => { if(topic.id !== activeTopicId) onNavigate(topic.id); }}
                            >
                                <div className="flex items-baseline justify-between border-b border-line/10 pb-2 mb-4">
                                    <h1 className="text-xl font-bold text-fg">{topic.title}</h1>
                                    {searchTerm && (
                                        <span className="text-[9px] font-mono text-fg-faint bg-surface-section px-2 py-1 rounded">
                                            {topic.category}
                                        </span>
                                    )}
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    {renderContent(topic.content)}
                                </div>
                            </div>
                        ))}
                        {visibleTopics.length === 0 && (
                            <div className="text-center text-fg-dim italic mt-10">No matching topics found.</div>
                        )}
                    </div>
                    
                    <div className="h-32 flex items-center justify-center text-fg-faint text-xs italic">
                        End of Section
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default HelpBrowser;
