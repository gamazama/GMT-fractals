/**
 * LoopStrip — the weave schedule made visible: one colored block per iteration
 * step (colored by slot), intro segment separated from the repeating cycle by a
 * ↻ divider. Computed live from the pure counts-plan walk (no compile), so it
 * updates as the user drags iteration counts — the "feel" of the weave before
 * the shader is ever built. Designed to render modulo (live-rhythm) plans too:
 * any WeaveSchedulePlan-shaped order works.
 */
import React from 'react';
import type { WeaveSchedulePlan } from '../../engine/weave/schedule';
import { stepSlot } from '../../engine/weave/schedule';

/** Slot colors, by slot index — matches the row chips in the editor. */
export const SLOT_COLORS = ['#60a5fa', '#f472b6', '#4ade80', '#fbbf24', '#a78bfa', '#f87171'];

const MAX_BLOCKS = 96;

interface LoopStripProps {
    plan: WeaveSchedulePlan;
    labels: string[];
}

export function LoopStrip({ plan, labels }: LoopStripProps) {
    const steps = plan.order.map(stepSlot);
    const shown = steps.slice(0, MAX_BLOCKS);
    const truncated = steps.length > MAX_BLOCKS;

    return (
        <div className="flex items-center flex-wrap gap-y-1" aria-label="Iteration schedule">
            {shown.map((slotIdx, i) => (
                <React.Fragment key={i}>
                    {i === plan.introLen && i > 0 && (
                        <span className="text-fg-tertiary text-[10px] px-1 select-none" title="Repeating cycle starts here">↻</span>
                    )}
                    {i === 0 && plan.introLen === 0 && (
                        <span className="text-fg-tertiary text-[10px] pr-1 select-none" title="Repeating cycle">↻</span>
                    )}
                    <span
                        className="inline-block w-[7px] h-4 rounded-[2px] mr-[2px]"
                        style={{ background: SLOT_COLORS[slotIdx % SLOT_COLORS.length] }}
                        title={`iteration ${i}: ${labels[slotIdx] ?? `slot ${slotIdx}`}`}
                    />
                </React.Fragment>
            ))}
            {truncated && <span className="text-fg-tertiary text-[10px] pl-1">…{steps.length}</span>}
        </div>
    );
}
