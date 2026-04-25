/**
 * Accordion — generic vertical accordion with optional exclusive groups.
 *
 * Three section behaviors are expressible:
 *   - Independent: section.group omitted. Toggles its own open state.
 *   - Exclusive group: sections sharing a `group` value behave like
 *     radio buttons — opening one closes the others in the group.
 *   - Exclusive with fallback: one section in a group sets
 *     `groupFallback: true`; clicking another open section in the group
 *     re-routes back to the fallback rather than closing everything.
 *
 * GMT's coloring panel uses (Layer1 + Layer2) as an exclusive group with
 * Layer1 as fallback, plus Noise as an independent section. Other apps
 * can express simple "one of N" tab-like accordions by giving every
 * section the same group, no fallback (closing the open one collapses).
 *
 * Headers are rendered with a label + optional left-aligned label color
 * (active/dimmed) + an optional right-side slot for app-specific content
 * (gradient preview strips, badges). The component owns no app-specific
 * styling beyond the GMT-canonical neutral-800 row look.
 */

import React, { useState, useCallback, useMemo } from 'react';

export interface AccordionSection {
    id: string;
    label: string;
    /** Body content. Hidden when the section is collapsed. */
    children: React.ReactNode;
    /** Right-aligned header content — preview strips, badges, etc. */
    headerRight?: React.ReactNode;
    /** Left-side small badge shown when the section is closed and
     *  its content is considered "off" (e.g. Layer 2 with opacity=0). */
    closedBadge?: React.ReactNode;
    /** When true, header label renders dimmed. Drives the same
     *  active/dimmed styling GMT used for layer-active states. */
    dimmed?: boolean;
    /** Independent default-open. Ignored when `group` is set. */
    defaultOpen?: boolean;
    /** Exclusive-group key — sections sharing this key toggle each other. */
    group?: string;
    /** Within an exclusive group, marks this section as the default
     *  open item and the fallback when others close. */
    groupFallback?: boolean;
    /** Callback fired with the new open state on every change. Lets
     *  the host wire side effects (e.g. setHistogramLayer). */
    onOpenChange?: (open: boolean) => void;
}

export interface AccordionProps {
    sections: AccordionSection[];
    className?: string;
}

const ChevronDown: React.FC<{ open: boolean }> = ({ open }) => (
    <svg
        className={`w-3 h-3 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        viewBox="0 0 20 20"
        fill="currentColor"
    >
        <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
        />
    </svg>
);

export const Accordion: React.FC<AccordionProps> = ({ sections, className = '' }) => {
    const initial = useMemo(() => {
        const state: Record<string, boolean> = {};
        // First pass: independent defaults.
        for (const s of sections) {
            if (!s.group) state[s.id] = !!s.defaultOpen;
        }
        // Per-group fallbacks.
        const groups = new Map<string, AccordionSection[]>();
        for (const s of sections) {
            if (s.group) {
                if (!groups.has(s.group)) groups.set(s.group, []);
                groups.get(s.group)!.push(s);
            }
        }
        for (const [, members] of groups) {
            const fallback = members.find((m) => m.groupFallback) ?? members[0];
            for (const m of members) state[m.id] = m.id === fallback.id;
        }
        return state;
    }, [sections]);

    const [openMap, setOpenMap] = useState<Record<string, boolean>>(initial);

    const toggle = useCallback(
        (section: AccordionSection) => {
            setOpenMap((prev) => {
                const next = { ...prev };
                if (section.group) {
                    const members = sections.filter((s) => s.group === section.group);
                    const wasOpen = !!prev[section.id];
                    if (wasOpen) {
                        // Closing the active member — fall back to the
                        // group's fallback, unless this IS the fallback,
                        // in which case stay open (no all-closed state).
                        const fallback = members.find((m) => m.groupFallback);
                        if (fallback && fallback.id !== section.id) {
                            for (const m of members) next[m.id] = m.id === fallback.id;
                        } else if (!fallback) {
                            for (const m of members) next[m.id] = false;
                        }
                    } else {
                        for (const m of members) next[m.id] = m.id === section.id;
                    }
                } else {
                    next[section.id] = !prev[section.id];
                }
                // Fire onOpenChange for any section whose state flipped.
                for (const s of sections) {
                    if (!!prev[s.id] !== !!next[s.id]) s.onOpenChange?.(!!next[s.id]);
                }
                return next;
            });
        },
        [sections],
    );

    return (
        <div className={`flex flex-col ${className}`}>
            {sections.map((section, idx) => {
                const open = !!openMap[section.id];
                const isLast = idx === sections.length - 1;
                return (
                    <div key={section.id} className="flex flex-col">
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                                open ? 'bg-neutral-800' : 'bg-neutral-800/50 hover:bg-white/5'
                            }`}
                            onClick={() => toggle(section)}
                        >
                            <span
                                className={`text-[10px] font-bold ${section.dimmed ? 'text-gray-600' : 'text-gray-300'}`}
                            >
                                {section.label}
                            </span>
                            {!open && section.closedBadge}
                            {section.headerRight ?? <div className="flex-1" />}
                            <ChevronDown open={open} />
                        </div>
                        {open && (
                            <div className="flex flex-col animate-fade-in">{section.children}</div>
                        )}
                        {!isLast && <div className="h-px bg-white/10" />}
                    </div>
                );
            })}
        </div>
    );
};

export default Accordion;
