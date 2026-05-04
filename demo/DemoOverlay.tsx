import React, { useEffect, useRef } from 'react';
import { useLiveModulations } from '../engine/typedSlices';
import type { FeatureComponentProps } from '../components/registry/ComponentRegistry';
import type { DemoState } from './DemoFeature';
import { setDemoCanvas } from './demoCanvasRef';
import { DemoExplainer } from './DemoExplainer';

// Canvas-2d painter. Reads each numeric param via
// `liveMod[target] ?? sliceState[param]` so every slider reacts to
// LFOs / audio rules / future modulation drivers without this file
// knowing they exist. Vec components follow the `feature.param_axis`
// convention AnimationEngine writes.

const toCssColor = (c: any): string => {
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object' && 'getHexString' in c) return `#${c.getHexString()}`;
    if (c && typeof c === 'object' && 'r' in c) {
        const to255 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
        return `rgb(${to255(c.r)}, ${to255(c.g)}, ${to255(c.b)})`;
    }
    return '#888888';
};

export const DemoOverlay: React.FC<FeatureComponentProps> = ({ sliceState }) => {
    const demo = sliceState as DemoState | undefined;
    const liveMod = useLiveModulations();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Publish + retract the canvas to the module ref so SceneIO finds
    // it for snapshots.
    useEffect(() => {
        setDemoCanvas(canvasRef.current);
        return () => setDemoCanvas(null);
    }, []);

    // Keep the drawing buffer in sync with displayed size × DPR.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const sync = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            const tw = Math.max(1, Math.floor(w * dpr));
            const th = Math.max(1, Math.floor(h * dpr));
            if (canvas.width !== tw)  canvas.width  = tw;
            if (canvas.height !== th) canvas.height = th;
        };
        sync();
        const ro = new ResizeObserver(sync);
        ro.observe(canvas);
        return () => ro.disconnect();
    }, []);

    // Repaint on every render — modulation tick + slice changes both
    // cause a re-render, so this fires whenever the visual should
    // change.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !demo) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const liveOrBase = (target: string, base: number): number => {
            const v = liveMod[target];
            return typeof v === 'number' ? v : base;
        };

        const size       = liveOrBase('demo.size',         demo.size);
        const opacity    = liveOrBase('demo.opacity',      demo.opacity);
        const posX       = liveOrBase('demo.position_x',   demo.position.x);
        const posY       = liveOrBase('demo.position_y',   demo.position.y);
        const count      = Math.max(1, Math.min(48, Math.round(liveOrBase('demo.count', demo.count))));
        const offX       = liveOrBase('demo.iterOffset_x', demo.iterOffset.x);
        const offY       = liveOrBase('demo.iterOffset_y', demo.iterOffset.y);
        const rotStepDeg = liveOrBase('demo.iterRotation', demo.iterRotation);
        const scaleStep  = liveOrBase('demo.iterScale',    demo.iterScale);
        const hueStep    = liveOrBase('demo.iterHueShift', demo.iterHueShift);

        const dpr      = window.devicePixelRatio || 1;
        const widthCss = canvas.width  / dpr;
        const heightCss = canvas.height / dpr;
        const cx       = widthCss  * (0.5 + posX * 0.4);
        const cy       = heightCss * (0.5 - posY * 0.4);
        const dx       = offX * 200;
        const dy       = -offY * 200;
        const rotStep  = (rotStepDeg * Math.PI) / 180;
        const baseColor = toCssColor(demo.color);

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Opaque background — keeps `globalAlpha < 1` blends consistent
        // between the on-screen view and the saved PNG / video. Without
        // it the alpha-preserved file flattens against white in viewers
        // and looks ultra-saturated.
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, widthCss, heightCss);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';

        // Back-to-front so the base square sits on top of its trail.
        for (let i = count - 1; i >= 0; i--) {
            const scale = Math.pow(scaleStep, i);
            const fade  = count > 1 ? 1 - i / (count + 2) : 1;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, opacity * fade));
            ctx.filter = hueStep ? `hue-rotate(${hueStep * i}deg)` : 'none';
            ctx.translate(cx + dx * i, cy + dy * i);
            ctx.rotate(rotStep * i);
            ctx.scale(scale, scale);
            ctx.fillStyle = baseColor;
            const half = size * 0.5;
            const radius = Math.min(8, half);
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(-half, -half, size, size, radius);
            } else {
                ctx.rect(-half, -half, size, size);
            }
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    });

    if (!demo) return null;
    return (
        <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            {/* Pure DOM, NOT painted into the canvas — so PNG / video
             *  exports stay caption-free. */}
            <DemoExplainer />
        </>
    );
};
