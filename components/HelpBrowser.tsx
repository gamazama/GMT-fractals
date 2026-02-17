
import React, { useMemo, useState, useEffect, useRef } from 'react';
import DraggableWindow from './DraggableWindow';
import { HELP_TOPICS } from '../data/help/registry';
import { HelpSection } from '../types/help';
import { ChevronDown, ChevronRight } from './Icons';

interface HelpBrowserProps {
    activeTopicId: string | null;
    onClose: () => void;
    onNavigate: (id: string) => void;
}

const CATEGORY_ORDER = ['General', 'Formulas', 'Parameters', 'UI', 'Timeline', 'Graph', 'Animation', 'Lighting', 'Rendering', 'Coloring', 'Audio', 'Effects', 'Export'];

const HelpBrowser: React.FC<HelpBrowserProps> = ({ activeTopicId, onClose, onNavigate }) => {
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
    }, [searchTerm]);

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
    }, [searchTerm, activeCategory]);

    // Scroll active topic into view when ID changes
    useEffect(() => {
        // LOCK IMMEDIATELY: Prevent observer from hijacking navigation while we calculate scroll position
        isScrollingRef.current = true;

        if (!activeTopicId || !contentRef.current) {
            isScrollingRef.current = false;
            return;
        }
        
        // Slight delay to ensure DOM update has flushed after category switch
        const timer = setTimeout(() => {
            const el = topicRefs.current[activeTopicId];
            if (!el) {
                isScrollingRef.current = false;
                return;
            }

            if (forceScrollRef.current) {
                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                forceScrollRef.current = false;
                
                // Unlock after estimated scroll duration
                scrollTimeoutRef.current = window.setTimeout(() => {
                    isScrollingRef.current = false;
                }, 750);
                return;
            }

            // Snap logic for external triggers
            const rect = el.getBoundingClientRect();
            const containerRect = contentRef.current!.getBoundingClientRect();
            const isVisibleAtTop = rect.top >= containerRect.top - 50 && rect.top <= containerRect.top + 300;

            if (!isVisibleAtTop) {
                 if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                 
                 el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                 
                 scrollTimeoutRef.current = window.setTimeout(() => {
                    isScrollingRef.current = false;
                 }, 750);
            } else {
                isScrollingRef.current = false;
            }
        }, 50);

        return () => clearTimeout(timer);
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
        // Split by bold (**...**), inline math ($...$), or links ([...](...))
        // Regex notes:
        // \*\*.*?\*\* matches bold
        // \$.*?\$ matches math
        // \[[^\]]+\]\([^)]+\) matches [text](url) - checks for non-] inside brackets and non-) inside parens
        const parts = text.split(/(\*\*.*?\*\*|\$.*?\$|\[[^\]]+\]\([^)]+\))/g);
        
        return parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="text-white font-bold">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('$') && part.endsWith('$')) {
                // Math styling: Serif, Italic, Cyan tint
                return <span key={j} className="font-serif italic text-cyan-300 px-0.5 tracking-wide">{part.slice(1, -1)}</span>;
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
                            className="text-cyan-400 hover:underline hover:text-cyan-300 transition-colors cursor-pointer"
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
            if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-white mt-4 mb-2">{line.replace('### ', '')}</h3>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-cyan-400 mt-5 mb-2 border-b border-white/10 pb-1">{line.replace('## ', '')}</h2>;
            
            // Block Math: $$ ... $$
            if (line.startsWith('$$')) {
                const mathText = line.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '');
                return (
                    <div key={i} className="font-serif italic text-center text-cyan-200 bg-black/30 p-3 rounded-lg my-3 text-sm border border-white/10 shadow-sm overflow-x-auto">
                        {mathText}
                    </div>
                );
            }
            
            if (line.startsWith('- ')) {
                return <li key={i} className="ml-4 text-xs text-gray-300 mb-1">{parseInline(line.replace('- ', ''))}</li>;
            }
            
            if (line.trim() === '') return <div key={i} className="h-2" />;
            
            return (
                <p key={i} className="text-xs text-gray-300 leading-relaxed mb-1">
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
                                isSelected ? 'bg-cyan-900/50 text-cyan-300 border-l-2 border-cyan-500' : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                            }`}
                            style={{ paddingLeft: `${8 + depth * 12}px` }}
                        >
                            <span className="truncate">{t.title}</span>
                        </button>
                        {hasChildren && (
                            <button 
                                onClick={(e) => toggleExpand(t.id, e)}
                                className={`p-2 hover:text-white transition-colors rounded-r ${isSelected ? 'bg-cyan-900/50 text-cyan-400' : 'text-gray-600 hover:bg-white/5'}`}
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

    return (
        <DraggableWindow 
            title="Library" 
            onClose={onClose} 
            initialPos={{ x: 100, y: 100 }} 
            initialSize={{ width: 700, height: 600 }}
            zIndex={600}
        >
            <div className="flex h-full -m-3">
                {/* Sidebar */}
                <div className="w-[30%] bg-black/40 border-r border-white/10 flex flex-col shrink-0">
                    <div className="p-2 border-b border-white/10">
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scroll p-2">
                        {Object.entries(categories).map(([cat, topics]) => (
                            <div key={cat} className="mb-3">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-2 sticky top-0 bg-[#151515]/95 z-10 backdrop-blur-sm py-1 border-b border-white/5">
                                    {cat}
                                </div>
                                {renderTopicTree(topics as HelpSection[])}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content - SCROLLABLE AREA */}
                <div 
                    ref={contentRef}
                    className="flex-1 bg-gray-900/50 overflow-y-auto custom-scroll p-6 scroll-smooth"
                >
                    {!searchTerm && (
                        <div className="mb-6 pb-2 border-b border-white/10">
                            <h2 className="text-2xl font-black text-gray-700 uppercase tracking-tighter">{activeCategory}</h2>
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
                                <div className="flex items-baseline justify-between border-b border-white/10 pb-2 mb-4">
                                    <h1 className="text-xl font-black text-white">{topic.title}</h1>
                                    {searchTerm && (
                                        <span className="text-[9px] font-mono text-gray-600 uppercase bg-black/40 px-2 py-1 rounded">
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
                            <div className="text-center text-gray-500 italic mt-10">No matching topics found.</div>
                        )}
                    </div>
                    
                    <div className="h-32 flex items-center justify-center text-gray-600 text-xs italic">
                        End of Section
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default HelpBrowser;
