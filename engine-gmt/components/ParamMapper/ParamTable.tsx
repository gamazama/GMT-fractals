/**
 * ParamTable — the param→slot mapping editor: one row per param (name, type, slot
 * picker, default, range/fixed-value inputs), with grouped-packing hints for bools
 * sharing a flag slot and floats sharing a vec base. Extracted from the Formula
 * Workshop; host-agnostic (pure props, no store) so the Workshop and the weave
 * editor can both mount it.
 *
 * Multi-owner occupancy: pass `foreignMappings` for slots claimed by OTHER owners
 * (e.g. sibling weave slots) — they grey out in the picker without rendering rows.
 */

import React, { useMemo } from 'react';
import {
    componentSlotBase, buildOccupancyMap, getSlotOccupancy,
} from '../../utils/uniformSlots';
import type { SlotMapping } from '../../utils/uniformSlots';
import { SlotPicker } from './SlotPicker';
import { groupedSlotOptions } from './slotOptions';

/** One mappable param row. The Workshop's `WorkshopParam` satisfies this structurally. */
export interface ParamMapping {
    name: string;
    type: string;
    mappedSlot: string;
    fixedValue: string;
    uiMin: number;
    uiMax: number;
    uiStep: number;
    uiDefault: number | number[];
}

interface ParamTableProps {
    mappings: ParamMapping[];
    onMappingChange: (index: number, field: keyof ParamMapping, value: string | number) => void;
    /** Slot occupancy contributed by other owners — folded into conflict greying only. */
    foreignMappings?: SlotMapping[];
}

export function ParamTable({ mappings, onMappingChange, foreignMappings }: ParamTableProps) {
    // Compute grouping data (bools sharing slots, floats sharing vec bases)
    const { boolsPerSlot, bitIndex, floatsPerBase, compIndex, occupancyMap, scalarUsed } = useMemo(() => {
        const boolsPerSlot = new Map<string, number[]>();
        mappings.forEach((m, i) => {
            if (m.type !== 'bool' || m.mappedSlot === 'ignore' || m.mappedSlot === 'fixed' || m.mappedSlot === 'uJuliaMode') return;
            if (!boolsPerSlot.has(m.mappedSlot)) boolsPerSlot.set(m.mappedSlot, []);
            boolsPerSlot.get(m.mappedSlot)!.push(i);
        });
        const bitIndex = new Map<number, number>();
        for (const indices of boolsPerSlot.values()) {
            indices.forEach((idx, bit) => bitIndex.set(idx, bit));
        }
        const floatsPerBase = new Map<string, number[]>();
        mappings.forEach((m, i) => {
            const base = componentSlotBase(m.mappedSlot);
            if (!base) return;
            if (!floatsPerBase.has(base)) floatsPerBase.set(base, []);
            floatsPerBase.get(base)!.push(i);
        });
        const compIndex = new Map<number, { base: string; comp: string }>();
        for (const [base] of floatsPerBase) {
            (floatsPerBase.get(base) ?? []).forEach(idx => {
                compIndex.set(idx, { base, comp: mappings[idx].mappedSlot.split('.')[1] ?? '' });
            });
        }
        const allOwners: SlotMapping[] = [...mappings, ...(foreignMappings ?? [])];
        const occupancyMap = buildOccupancyMap(allOwners);
        const scalarUsed = new Set<string>();
        allOwners.forEach(m => {
            if (m.mappedSlot !== 'ignore' && m.mappedSlot !== 'fixed' && m.mappedSlot !== 'builtin') {
                if (!getSlotOccupancy(m.mappedSlot, m.type)) scalarUsed.add(m.mappedSlot);
            }
        });
        return { boolsPerSlot, bitIndex, floatsPerBase, compIndex, occupancyMap, scalarUsed };
    }, [mappings, foreignMappings]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
                <thead>
                    <tr className="text-fg-faint border-b border-line/10">
                        <th className="text-left pb-1 pr-2 font-semibold">Variable</th>
                        <th className="text-left pb-1 pr-2 font-semibold">Type</th>
                        <th className="text-left pb-1 pr-2 font-semibold">→ Slot</th>
                        <th className="text-left pb-1 pr-2 font-semibold">Default</th>
                        <th className="text-left pb-1 pr-1 font-semibold">Min</th>
                        <th className="text-left pb-1 pr-1 font-semibold">Max</th>
                        <th className="text-left pb-1 font-semibold">Step / Flags</th>
                    </tr>
                </thead>
                <tbody>
                    {mappings.map((m, i) => {
                        const isBoolInGroup = m.type === 'bool' && bitIndex.has(i);
                        const groupSize = isBoolInGroup ? (boolsPerSlot.get(m.mappedSlot)?.length ?? 1) : 0;
                        const bit = bitIndex.get(i) ?? 0;
                        const isFirstInGroup = isBoolInGroup && bit === 0;

                        const compInfo = compIndex.get(i);
                        const isInVecGroup = !!compInfo && (floatsPerBase.get(compInfo.base)?.length ?? 0) > 1;
                        const vecGroupIndices = compInfo ? (floatsPerBase.get(compInfo.base) ?? []) : [];
                        const isFirstVecIndex = vecGroupIndices[0] === i;

                        const showRange = !isBoolInGroup && !isInVecGroup && m.mappedSlot !== 'ignore' && m.mappedSlot !== 'builtin' && m.mappedSlot !== 'uJulia' && m.mappedSlot !== 'uJuliaMode' && m.mappedSlot !== 'fixed';
                        const showFixed = m.mappedSlot === 'fixed';
                        const defaultVal = Array.isArray(m.uiDefault)
                            ? m.uiDefault.map(v => (v as number).toPrecision(3)).join(', ')
                            : (m.uiDefault as number).toPrecision(3);

                        return (
                            <React.Fragment key={m.name}>
                                {isFirstInGroup && groupSize > 1 && (
                                    <tr className="border-t border-amber-500/20">
                                        <td colSpan={7} className="pt-1.5 pb-0.5 px-1">
                                            <span className="text-amber-400/70 text-[9px] font-semibold">
                                                ⚑ Flags · {groupSize} bits packed into {m.mappedSlot} · slider 0–{Math.pow(2, groupSize) - 1}
                                            </span>
                                            <span className="text-fg-faint text-[9px] ml-2 normal-case">assign bools to the same slot to group them</span>
                                        </td>
                                    </tr>
                                )}
                                {isInVecGroup && isFirstVecIndex && (
                                    <tr className="border-t border-sky-500/20">
                                        <td colSpan={7} className="pt-1.5 pb-0.5 px-1">
                                            <span className="text-sky-400/70 text-[9px] font-semibold">
                                                ⊞ Vec · {vecGroupIndices.length} floats packed into {compInfo!.base} · one vec{vecGroupIndices.length > 2 ? '3' : '2'} control
                                            </span>
                                            <span className="text-fg-faint text-[9px] ml-2 normal-case">assign floats to {compInfo!.base}.x / .y / .z to group them</span>
                                        </td>
                                    </tr>
                                )}
                                <tr className={`border-b border-line/5 hover:bg-line/[0.02] ${isBoolInGroup && groupSize > 1 ? 'bg-amber-500/[0.03]' : isInVecGroup ? 'bg-sky-500/[0.03]' : ''}`}>
                                    <td className="py-1 pr-2 font-mono text-fg-tertiary">
                                        {isBoolInGroup && groupSize > 1 && <span className="text-amber-400/50 mr-1">│</span>}
                                        {isInVecGroup && <span className="text-sky-400/50 mr-1">│</span>}
                                        {m.name}
                                    </td>
                                    <td className="py-1 pr-2 text-fg-dim">{m.type}</td>
                                    <td className="py-1 pr-2">
                                        <SlotPicker
                                            value={m.mappedSlot}
                                            paramType={m.type}
                                            groups={groupedSlotOptions(m.type)}
                                            occupancyMap={occupancyMap}
                                            scalarUsed={scalarUsed}
                                            onChange={v => onMappingChange(i, 'mappedSlot', v)}
                                        />
                                    </td>
                                    <td className="py-1 pr-2 font-mono text-blue-300/80 text-[9px]">{defaultVal}</td>
                                    {isBoolInGroup && groupSize > 1 ? (
                                        <td colSpan={3} className="py-1 text-amber-400/60 font-mono text-[9px]">
                                            bit {bit} · val +{Math.pow(2, bit)}
                                        </td>
                                    ) : isInVecGroup ? (
                                        <td colSpan={3} className="py-1 text-sky-400/60 font-mono text-[9px]">
                                            .{compInfo!.comp} component
                                        </td>
                                    ) : showFixed ? (
                                        <td colSpan={3} className="py-1">
                                            <input
                                                type="text"
                                                value={m.fixedValue}
                                                onChange={e => onMappingChange(i, 'fixedValue', e.target.value)}
                                                className="bg-surface-sunken border border-line/10 rounded px-1 py-0.5 text-[10px] font-mono text-fg focus:outline-none focus:border-line/30 w-20"
                                                placeholder="1.0"
                                            />
                                        </td>
                                    ) : showRange ? (
                                        <>
                                            <td className="py-1 pr-1"><input type="number" value={m.uiMin} onChange={e => onMappingChange(i, 'uiMin', parseFloat(e.target.value) || 0)} className="bg-surface-sunken border border-line/10 rounded px-1 py-0.5 text-[10px] text-fg focus:outline-none w-12" /></td>
                                            <td className="py-1 pr-1"><input type="number" value={m.uiMax} onChange={e => onMappingChange(i, 'uiMax', parseFloat(e.target.value) || 0)} className="bg-surface-sunken border border-line/10 rounded px-1 py-0.5 text-[10px] text-fg focus:outline-none w-12" /></td>
                                            <td className="py-1"><input type="number" value={m.uiStep} onChange={e => onMappingChange(i, 'uiStep', parseFloat(e.target.value) || 0.001)} className="bg-surface-sunken border border-line/10 rounded px-1 py-0.5 text-[10px] text-fg focus:outline-none w-12" /></td>
                                        </>
                                    ) : (
                                        <td colSpan={3} className="py-1 text-fg-ghost italic">—</td>
                                    )}
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
