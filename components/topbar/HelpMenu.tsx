
import React, { useRef, useState, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { SmileyIcon, CheckIcon } from '../Icons';
import { HelpMenuIcon, BookIcon } from '../Icons2';
import { createPortal } from 'react-dom';
import { Popover } from '../Popover';
import { DonateButton } from '../DonateButton';

type BadgeColor = 'cyan' | 'purple' | 'green';
const BADGE_COLORS: Record<BadgeColor, { on: string; off: string }> = {
    cyan:   { on: 'bg-cyan-500/30 text-cyan-300 border-cyan-500/40',   off: 'bg-white/[0.04] text-gray-600 border-white/5' },
    purple: { on: 'bg-purple-500/30 text-purple-300 border-purple-500/40', off: 'bg-white/[0.04] text-gray-600 border-white/5' },
    green:  { on: 'bg-green-500/30 text-green-300 border-green-500/40',  off: 'bg-white/[0.04] text-gray-600 border-white/5' },
};
const OnOffBadge: React.FC<{ active: boolean; color?: BadgeColor }> = ({ active, color = 'cyan' }) => (
    <span className={`px-2 py-0.5 text-[8px] font-bold rounded-sm border transition-all ${active ? BADGE_COLORS[color].on : BADGE_COLORS[color].off}`}>
        {active ? 'ON' : 'OFF'}
    </span>
);

const DonateModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="bg-gray-900 border border-white/10 rounded-lg p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold text-pink-300">Support GMT</div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-sm leading-none">&times;</button>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
                    GMT is free & open source. With your support I could spend more time developing it!
                </p>
                <DonateButton />
            </div>
        </div>,
        document.body
    );
};

interface HelpMenuProps {
    vibrate: (ms: number) => void;
    btnBase: string;
    btnActive: string;
    btnInactive: string;
}

export const HelpMenu: React.FC<HelpMenuProps> = ({ vibrate, btnBase, btnActive, btnInactive }) => {
    const state = useFractalStore();
    const [showMenu, setShowMenu] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showDonate, setShowDonate] = useState(false);
    const [gpuInfo, setGpuInfo] = useState<string>("");
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const info = engine.gpuInfo;
        if (info) {
            setGpuInfo(info);
        } else {
            const timer = setTimeout(() => {
                setGpuInfo(engine.gpuInfo || 'Generic WebGL Device');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement;
            if (menuRef.current && !menuRef.current.contains(target)) {
                if (target.closest('.portal-dropdown-content') || target.closest('.t-dropdown')) return;
                setShowMenu(false);
                setShowAbout(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showMenu]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        vibrate(5);
        setShowMenu(!showMenu);
    };

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button onClick={toggleMenu} className={`${btnBase} ${showMenu ? btnActive : btnInactive}`} title="Help">
                    <HelpMenuIcon />
                </button>
                {showMenu && (
                    <Popover width="w-64" align="end" className="p-2 custom-scroll overflow-y-auto max-h-[85vh]" onClose={() => setShowMenu(false)}>
                        <div className="space-y-1">
                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); state.openHelp(); setShowMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-cyan-400 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-200">Getting Started</span>
                                <BookIcon />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); state.openHelp('general.shortcuts'); setShowMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-400">Keyboard Shortcuts</span>
                                <HelpMenuIcon />
                            </button>

                            <div className="h-px bg-white/10 my-1" />

                            <div className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer" title="Keyboard: H"
                                 onClick={() => { vibrate(5); state.setShowHints(!state.showHints); }}>
                                <span className="text-xs text-gray-300 font-bold">Show Hints <span className="text-gray-500 font-normal">[H]</span></span>
                                <OnOffBadge active={state.showHints} color="green" />
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); FractalEvents.emit(FRACTAL_EVENTS.RESET_HINTS, undefined); }} className="w-full flex items-center p-2 rounded hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-colors">
                                <span className="text-xs">Reset Tips</span>
                            </button>

                            <div className="h-px bg-white/10 my-1" />
                            <div className="text-[9px] font-bold text-gray-500 px-2 py-1">Tutorials</div>
                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); state.startTutorial(1); setShowMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-400">Lesson 1: The Mandelbulb</span>
                                {state.tutorialCompleted.includes(1) && <CheckIcon />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); state.startTutorial(2); setShowMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-400">Lesson 2: It's Time to Fly</span>
                                {state.tutorialCompleted.includes(2) && <CheckIcon />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); state.startTutorial(3); setShowMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-400">Lesson 3: The Light Studio</span>
                                {state.tutorialCompleted.includes(3) && <CheckIcon />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); state.startTutorial(4); setShowMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-gray-300 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-cyan-400">Lesson 4: Shadows</span>
                                {state.tutorialCompleted.includes(4) && <CheckIcon />}
                            </button>

                            <div className="h-px bg-white/10 my-1" />

                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); setShowDonate(true); setShowMenu(false); }} className="w-full flex items-center justify-between p-2 rounded hover:bg-pink-500/10 text-pink-300/80 transition-colors group">
                                <span className="text-xs font-bold group-hover:text-pink-200">Support GMT</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-70 group-hover:opacity-100"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); vibrate(5); setShowAbout(!showAbout); }} className={`w-full flex items-center justify-between p-2 rounded transition-colors ${showAbout ? 'bg-white/10 text-cyan-400' : 'hover:bg-white/5 text-gray-300'}`}>
                                <span className="text-xs font-bold">About GMT</span>
                                <SmileyIcon />
                            </button>

                            {showAbout && (
                                <div className="p-3 bg-white/5 rounded-lg border border-white/5 animate-fade-in mt-1">
                                    <div className="text-[10px] text-gray-400 leading-relaxed space-y-2">
                                        {gpuInfo && (
                                            <div className="mb-2 pb-2 border-b border-white/10">
                                                <div className="text-[8px] text-gray-500 font-bold mb-1">Active Renderer</div>
                                                <div className="text-[9px] text-green-400 font-mono break-all">{gpuInfo}</div>
                                            </div>
                                        )}
                                        <p className="text-[9px] text-gray-500 font-mono mb-1">v0.9.2</p>
                                        <p>GMT was crafted with ❤️ by <span className="text-white font-bold">Guy Zack</span> using <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Gemini</a> and <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Claude</a>.</p>

                                        <div className="pt-2 border-t border-white/10">
                                            <div className="text-[8px] text-gray-500 font-bold mb-1">Tech Stack</div>
                                            <div className="text-[9px] text-gray-500 font-mono">React + TypeScript + Three.js + GLSL + Zustand + Vite</div>
                                        </div>

                                        <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
                                            <a href="https://www.reddit.com/r/GMT_fractals/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                                <span>Community:</span>
                                                <span className="text-cyan-400 hover:underline">r/GMT_fractals</span>
                                            </a>
                                            <a href="https://github.com/gamazama/GMT-fractals" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                                <span>Source:</span>
                                                <span className="text-cyan-400 hover:underline">GitHub (GPL-3.0)</span>
                                            </a>
                                        </div>

                                        <div className="pt-2 border-t border-white/10">
                                            <p className="text-[9px] text-gray-500">GMT is free & open source.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Popover>
                )}
            </div>

            {showDonate && (
                <DonateModal onClose={() => setShowDonate(false)} />
            )}
        </>
    );
};
