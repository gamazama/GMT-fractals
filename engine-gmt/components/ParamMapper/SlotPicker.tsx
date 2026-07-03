/**
 * SlotPicker — dropdown assigning one param to a uniform slot, with occupied slots
 * greyed out via the shared occupancy algebra. Extracted verbatim from the Formula
 * Workshop; host-agnostic (pure props, no store).
 */

import React, { useState, useRef } from 'react';
import { CategoryPickerMenu } from '../../../components/CategoryPickerMenu';
import type { PickerCategory, PickerItem } from '../../../components/CategoryPickerMenu';
import { isSlotConflict } from '../../utils/uniformSlots';
import { slotLabel } from './slotOptions';
import type { SlotGroup } from './slotOptions';

interface SlotPickerProps {
    value: string;
    paramType: string;
    groups: SlotGroup[];
    occupancyMap: Map<string, Set<string>>;
    scalarUsed: Set<string>;
    onChange: (slot: string) => void;
}

export function SlotPicker({ value, paramType, groups, occupancyMap, scalarUsed, onChange }: SlotPickerProps) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0, right: 0 });

    const handleClick = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({ x: rect.left, y: rect.bottom + 4, right: rect.right });
            setOpen(true);
        }
    };

    const topOptions = groups.filter(g => g.label === null).flatMap(g => g.options);
    const subGroups = groups.filter(g => g.label !== null);

    const categories: PickerCategory[] = [
        ...(topOptions.length > 0 ? [{ id: '__top__', name: 'General' }] : []),
        ...subGroups.map(g => ({
            id: g.label!,
            name: g.label!,
            highlight: g.options.includes(value),
        })),
    ];

    const getItems = (catId: string): PickerItem[] => {
        const options = catId === '__top__'
            ? topOptions
            : subGroups.find(g => g.label === catId)?.options ?? [];

        return options.map(opt => {
            const taken = catId !== '__top__' && isSlotConflict(opt, paramType, value, occupancyMap, scalarUsed);
            return {
                key: opt,
                label: slotLabel(opt),
                selected: opt === value,
                disabled: taken,
                disabledSuffix: taken ? '✓' : undefined,
            };
        });
    };

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                type="button"
                onClick={handleClick}
                className="t-select text-fg w-28 text-left truncate"
            >
                {slotLabel(value)}
            </button>
            {open && (
                <CategoryPickerMenu
                    x={coords.x} y={coords.y}
                    anchorRight={coords.right}
                    categories={categories}
                    getItems={getItems}
                    onSelect={onChange}
                    onClose={() => setOpen(false)}
                    categoryWidth={100}
                    itemWidth={140}
                />
            )}
        </div>
    );
}
