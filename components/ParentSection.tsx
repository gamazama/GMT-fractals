/**
 * ParentSection — labeled container with indented children, bracket-line
 * trim down the left, and a soft highlight overlay. This is the visual
 * "parent param with sub-controls" treatment that AutoFeaturePanel
 * applies automatically when a DDFS param has nested `parentId` children;
 * lifted here so non-DDFS sections (Quality's Resolution, …) can use the
 * same layout instead of re-inlining the markup per call site.
 *
 * Style is GMT's standard nested-container look — generic, not feature-
 * specific. Apps and bespoke widgets get the same shape every time the
 * pattern shows up.
 *
 * Usage:
 *   <ParentSection label="Resolution">
 *     <SegmentRow … />
 *     <ChildRow … />
 *   </ParentSection>
 */

import React, { Children } from 'react';

export interface ParentSectionProps {
    /** Header label rendered at the top of the container. */
    label: string;
    /** Each rendered child becomes one bracketed row. */
    children: React.ReactNode;
    /** Extra Tailwind classes on the outer container. */
    className?: string;
    /** Tailwind class for the header row (text styling). Defaults
     *  match GMT's parent-label header. */
    headerClassName?: string;
}

export const ParentSection: React.FC<ParentSectionProps> = ({
    label,
    children,
    className = '',
    headerClassName = '',
}) => {
    // Children.toArray already drops null/undefined/false, so the
    // filter only needs to skip empty strings (rare).
    const rows = Children.toArray(children).filter((c) => c !== '');

    return (
        <div className={`w-full flex flex-col rounded-t-sm relative ${className}`}>
            {/* Soft highlight overlay behind the whole block */}
            <div className="absolute inset-0 bg-white/[0.06] rounded-t-sm pointer-events-none" />

            {/* Header row */}
            <div className="flex items-center bg-white/[0.12] rounded-t-sm h-9 md:h-[26px] overflow-hidden border-b border-white/5 px-2">
                <span className={`text-[10px] text-gray-400 font-medium tracking-tight select-none ${headerClassName}`}>
                    {label}
                </span>
            </div>

            {/* Indented children with left-bracket trim. Last row closes
                the bracket with a bottom border + rounded corner. */}
            <div className="flex flex-col">
                {rows.map((child, i) => {
                    const isLast = i === rows.length - 1;
                    return (
                        <div key={i} className="flex">
                            <div className={`w-2 shrink-0 self-stretch border-l border-white/20 bg-white/[0.12] ${isLast ? 'border-b border-b-white/20 rounded-bl-lg' : ''}`} />
                            <div className={`flex-1 min-w-0 relative ${isLast ? 'border-b border-b-white/20' : ''}`}>
                                <div className="absolute inset-0 bg-black/20 pointer-events-none z-10" />
                                {child}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ParentSection;
