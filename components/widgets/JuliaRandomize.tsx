
import React, { useRef, useCallback, useEffect } from 'react';
import { useFractalStore } from '../../store/fractalStore';

/** Dice icon with dots that suggest randomness */
const DiceIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
);

/**
 * Hold-to-randomize Julia coordinate button.
 * Picks a random direction on press, then moves along it with accelerating speed.
 * Hold Shift to go 5x faster, Alt to go 5x slower.
 */
export const JuliaRandomize: React.FC = () => {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef(0);
    const seedRef = useRef({ x: 0, y: 0, z: 0 });
    const prevAmplitudeRef = useRef(0);
    const modifiersRef = useRef({ shift: false, alt: false });

    const apply = useCallback(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        // Base: accelerating curve, noticeable immediately
        const base = 0.5 * elapsed * elapsed + 0.1 * elapsed;
        const amplitude = Math.min(8.0, base);
        const rawDelta = amplitude - prevAmplitudeRef.current;
        prevAmplitudeRef.current = amplitude;

        // Modifier keys: Shift = 5x, Alt = 0.2x
        let speed = 1.0;
        if (modifiersRef.current.shift) speed = 5.0;
        else if (modifiersRef.current.alt) speed = 0.2;
        const delta = rawDelta * speed;

        const s = seedRef.current;
        const g = useFractalStore.getState().geometry;
        useFractalStore.getState().setGeometry({
            juliaX: g.juliaX + s.x * delta,
            juliaY: g.juliaY + s.y * delta,
            juliaZ: g.juliaZ + s.z * delta,
        });
    }, []);

    const handleStart = useCallback((e: React.PointerEvent) => {
        modifiersRef.current = { shift: e.shiftKey, alt: e.altKey };
        const s = useFractalStore.getState();
        s.handleInteractionStart('param');
        // Pick a random unit direction
        const rx = Math.random() * 2 - 1;
        const ry = Math.random() * 2 - 1;
        const rz = Math.random() * 2 - 1;
        const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
        seedRef.current = { x: rx / len, y: ry / len, z: rz / len };
        startTimeRef.current = Date.now();
        prevAmplitudeRef.current = 0;
        apply();
        intervalRef.current = setInterval(apply, 30);
    }, [apply]);

    const handleEnd = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        useFractalStore.getState().handleInteractionEnd();
    }, []);

    // Track modifier keys while held
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            modifiersRef.current = { shift: e.shiftKey, alt: e.altKey };
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <button
            onPointerDown={handleStart}
            onPointerUp={handleEnd}
            onPointerLeave={handleEnd}
            className="w-full h-[26px] flex items-center justify-center gap-1.5 bg-white/[0.06] border-b border-white/5 hover:bg-cyan-500/10 text-gray-500 hover:text-cyan-300 transition-colors cursor-pointer select-none"
            title="Hold to randomize — Shift: faster, Alt: slower"
        >
            <DiceIcon />
            <span className="text-[9px] font-medium">Randomize</span>
        </button>
    );
};
