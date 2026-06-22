/**
 * GMT-specific body for the engine Help plugin's `about` slot. The plugin
 * owns the menu item + expand scaffold; this component owns the GMT content
 * (version, GPU info, credits, links).
 *
 * The "Support GMT" body lives in `engine-gmt/support.ts` (gmtSupportConfig)
 * so every engine app shares one definition.
 */

import React, { useEffect, useState } from 'react';
import { getProxy } from '../engine-gmt';
import pkg from '../package.json';

export const AboutGmtBody: React.FC = () => {
    const [gpuInfo, setGpuInfo] = useState<string>('');

    useEffect(() => {
        const proxy = getProxy();
        const initial = proxy.gpuInfo;
        if (initial && initial !== 'Generic WebGL Device') {
            setGpuInfo(initial);
            return;
        }
        const t = setTimeout(() => setGpuInfo(getProxy().gpuInfo || 'Generic WebGL Device'), 3000);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="text-[10px] text-fg-muted leading-relaxed space-y-2">
            {gpuInfo && (
                <div className="mb-2 pb-2 border-b border-line/10">
                    <div className="text-[8px] text-fg-dim font-bold mb-1">Active Renderer</div>
                    <div className="text-[9px] text-ok font-mono break-all">{gpuInfo}</div>
                </div>
            )}
            <p className="text-[9px] text-fg-dim font-mono mb-1">v{pkg.version}</p>
            <p>
                GMT was crafted with ❤️ by <span className="text-fg font-bold">Guy Zack</span> using{' '}
                <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">Gemini</a>{' '}
                and{' '}
                <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">Claude</a>.
            </p>

            <div className="pt-2 border-t border-line/10">
                <div className="text-[8px] text-fg-dim font-bold mb-1">Tech Stack</div>
                <div className="text-[9px] text-fg-dim font-mono">React + TypeScript + Three.js + GLSL + Zustand + Vite</div>
            </div>

            <div className="flex flex-col gap-1 pt-2 border-t border-line/10">
                <a href="https://www.reddit.com/r/GMT_fractals/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-fg transition-colors">
                    <span>Community:</span>
                    <span className="text-accent-400 hover:underline">r/GMT_fractals</span>
                </a>
                <a href="https://github.com/gamazama/GMT-fractals" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-fg transition-colors">
                    <span>Source:</span>
                    <span className="text-accent-400 hover:underline">GitHub (GPL-3.0)</span>
                </a>
            </div>

            <div className="pt-2 border-t border-line/10">
                <p className="text-[9px] text-fg-dim">GMT is free &amp; open source.</p>
            </div>
        </div>
    );
};
