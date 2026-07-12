/**
 * LoopStrip — the weave schedule made visible: one colored block per iteration
 * step (colored by SLOT IDENTITY — a formula keeps its color when reordered),
 * the intro separated from the repeating cycle by a ↻ divider, and the repeats
 * FADED to read as "…and this part loops". When the scene's iteration count
 * fits, the strip shows exactly those iterations, so what you see is what the
 * shader will run. Computed live from the pure counts-plan walk (no compile).
 * Designed to render modulo (live-rhythm) plans too: any plan-shaped order works.
 */
import React from 'react';
import type { WeaveSchedulePlan } from '../../engine/weave/schedule';
import { stepSlot } from '../../engine/weave/schedule';

/** Slot color palette — rows own a stable colorIdx into this. */
export const SLOT_COLORS = ['#60a5fa', '#f472b6', '#4ade80', '#fbbf24', '#a78bfa', '#f87171'];

const MAX_BLOCKS = 96;

interface LoopStripProps {
    plan: WeaveSchedulePlan;
    labels: string[];
    /** Per-slot-index block color (from each row's stable colorIdx). */
    colors: string[];
    /** The scene's iteration count — shown exactly when it fits the strip. */
    totalIterations?: number;
}

export function LoopStrip({ plan, labels, colors, totalIterations }: LoopStripProps) {
    const cyc = Math.max(1, plan.cycleLen);
    const oneRun = plan.introLen + cyc;
    // Show the real iteration count when it fits; otherwise intro + two cycles.
    const wanted = totalIterations && totalIterations <= MAX_BLOCKS
        ? totalIterations
        : Math.min(oneRun + cyc, MAX_BLOCKS);
    const slotAt = (i: number) =>
        stepSlot(i < plan.introLen ? plan.order[i] : plan.order[plan.introLen + ((i - plan.introLen) % cyc)]);

    const blocks: React.ReactNode[] = [];
    for (let i = 0; i < wanted; i++) {
        if (i === plan.introLen) {
            blocks.push(
                <span key={`c${i}`} className="text-fg-tertiary text-[10px] px-1 select-none" title="Repeating cycle starts here">↻</span>,
            );
        }
        const s = slotAt(i);
        blocks.push(
            <span
                key={i}
                className="inline-block w-[7px] h-4 rounded-[2px] mr-[2px]"
                style={{
                    background: colors[s] ?? '#888',
                    // First pass runs at full strength; the repeats fade out to read as "…loops".
                    opacity: i < oneRun ? 1 : Math.max(0.15, 0.45 - 0.12 * Math.floor((i - oneRun) / cyc)),
                }}
                title={`iteration ${i}: ${labels[s] ?? `slot ${s}`}`}
            />,
        );
    }

    return (
        <div className="flex items-center flex-wrap gap-y-1" aria-label="Iteration schedule">
            {blocks}
            {totalIterations && totalIterations > wanted && (
                <span className="text-fg-tertiary text-[10px] pl-1">…{totalIterations}</span>
            )}
        </div>
    );
}
