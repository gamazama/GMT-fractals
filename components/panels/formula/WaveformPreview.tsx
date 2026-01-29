
import React, { useRef, useEffect } from 'react';

export const WaveformPreview = ({ shape, period, phase, amplitude, enabled }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
        ctx.stroke();

        if (!enabled) return;

        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const samples = 120;
        const windowSecs = 5.0; 
        
        for (let i = 0; i <= samples; i++) {
            const x = (i / samples);
            const t = ((x * windowSecs) / period + phase) % 1.0;
            let val = 0;
            
            if (shape === 'Sine') val = Math.sin(t * Math.PI * 2);
            else if (shape === 'Triangle') val = 1.0 - Math.abs((t * 2.0) - 1.0) * 2.0;
            else if (shape === 'Sawtooth') val = t * 2.0 - 1.0;
            else if (shape === 'Pulse') val = t < 0.5 ? 1.0 : -1.0;
            else if (shape === 'Noise') val = Math.sin(t * 50) * Math.cos(t * 12);

            const py = h/2 - (val * Math.min(1.5, amplitude) * (h/4));
            if (i === 0) ctx.moveTo(x * w, py);
            else ctx.lineTo(x * w, py);
        }
        ctx.stroke();
    }, [shape, period, phase, amplitude, enabled]);

    return (
        <div className="relative h-12 bg-black/40 rounded border border-white/5 mb-3 overflow-hidden">
             <canvas ref={canvasRef} width={280} height={48} className="w-full h-full" />
             <div className="absolute top-1 left-2 text-[7px] font-black text-purple-400/50 uppercase tracking-widest pointer-events-none">Signal (5 second window)</div>
        </div>
    );
};
