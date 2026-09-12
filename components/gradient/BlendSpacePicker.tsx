/**
 * BlendSpacePicker — the shared "which colour space" chooser.
 *
 * Extracted from `components/AdvancedGradientEditor.tsx` on 2026-09-12, unchanged in
 * behaviour, so the Curves editor's axis chooser and the gradient strip's blend chooser are
 * ONE control over one vocabulary rather than two that drift. Its option list is a prop:
 * the strip offers every `BLEND_SPACE_ORDER` mode, Curves offers the subset that is three
 * drawable axes (`CURVE_SPACE_ORDER` — no Spectral, which is a mixing model).
 *
 * @see palette/core/curveSpaces.ts · utils/colorUtils.ts (BLEND_SPACE_ORDER / _LABEL)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BLEND_SPACE_LABEL, BLEND_SPACE_ORDER } from '../../utils/colorUtils';
import type { BlendColorSpace } from '../../types/graphics';
import { ContextMenu as PresetMenu } from './GradientContextMenu';

/**
 * BlendSpacePicker — the active blend space as a chip; CLICK it and the full list opens
 * inline, in the order defined by `BLEND_SPACE_ORDER` (pigment → straight line → tint;
 * see utils/colorUtils.ts).
 *
 * It replaced a click-to-CYCLE control (owner, 2026-09-10). Cycling was tolerable at
 * three modes and a guessing game at six. Click-to-open rather than always-on because
 * the strip row is a working surface, not a settings panel — the row stays quiet until
 * asked, then expands into the `ml-auto` gap that already sits beside it.
 *
 * HOVER PREVIEWS THE SWITCH: `onPreview` re-renders the editor's own strip in the hovered
 * mode without emitting anything, so the choice is made by looking at the actual gradient
 * rather than by reading a label. That is also why the labels carry no "(perceptual)" /
 * "(standard)" descriptors — the preview is the explanation.
 *
 * Closing is by choosing, by Escape, or by clicking the chip again — deliberately NOT by
 * backdrop click, which this project does not use. Leaving the row clears the preview but
 * keeps it open, so overshooting the list costs nothing.
 *
 * A gradient saved in a RETIRED mode ('hsv-far') keeps rendering, so the active mode may
 * not be in BLEND_SPACE_ORDER. It gets an extra chip at the end rather than vanishing —
 * otherwise the list would show nothing selected and switching away would be a mystery.
 */
/**
 * A coarse pointer (a phone) gets a different BlendSpacePicker: one button that reads
 * "blend" and opens the modes as a DROPDOWN menu (the same `ContextMenu` the stops menu
 * uses), the active one checked. Owner, 2026-09-11: "the blend/oklch switch can just be
 * 'blend' and open a dropdown with the modes." The inline chip row was designed around
 * hover preview, which a finger cannot do, and it expanded INTO the tabs row, which at
 * 390 px has no gap to expand into. Read once at module load, like the wall's own seam.
 */
export const COARSE_POINTER = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;

export const BlendSpacePicker: React.FC<{
    value: BlendColorSpace;
    onSelect: (space: BlendColorSpace) => void;
    onPreview: (space: BlendColorSpace | null) => void;
    compact?: boolean;
    /** The modes to offer, in order. Defaults to every blend space (`BLEND_SPACE_ORDER`).
     *  The Curves editor passes the subset that is three drawable axes — see
     *  `palette/core/curveSpaces.ts` CURVE_SPACE_ORDER. */
    order?: readonly BlendColorSpace[];
    /** The trigger's tooltip and the coarse-pointer button's word. Defaults to "blend". */
    noun?: string;
}> = ({ value, onSelect, onPreview, compact, order = BLEND_SPACE_ORDER, noun = 'blend' }) => {
    const [open, setOpen] = useState(false);
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const spaces = order.includes(value) ? order : [...order, value];
    const size = compact ? 'text-[8px] px-1' : 'text-[10px] px-1.5';

    if (COARSE_POINTER) {
        return (
            <div className="flex items-center gradient-interactive-element">
                <button
                    type="button"
                    aria-expanded={!!menuAt}
                    className={`${size} py-0.5 rounded-sm font-semibold whitespace-nowrap transition-colors ${menuAt ? 'text-fg bg-line/15' : 'text-fg-muted'}`}
                    onClick={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenuAt(menuAt ? null : { x: r.left, y: r.bottom + 5 });
                    }}
                    title={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} space — ${BLEND_SPACE_LABEL[value]}`}
                >
                    {noun} ▾
                </button>
                {menuAt && (
                    <PresetMenu
                        x={menuAt.x}
                        y={menuAt.y}
                        onClose={() => setMenuAt(null)}
                        options={spaces.map((sp) => ({ label: BLEND_SPACE_LABEL[sp], checked: sp === value, action: () => onSelect(sp) }))}
                    />
                )}
            </div>
        );
    }

    const close = useCallback(() => { setOpen(false); onPreview(null); }, [onPreview]);

    // Escape closes and drops the preview. Bound only while open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, close]);

    return (
        <div
            className="flex items-center gap-0.5 gradient-interactive-element"
            onMouseLeave={() => onPreview(null)}
        >
            {/* The options open to the LEFT and the trigger stays put. Opening must never
                move a different control under the cursor: the first build expanded in
                place, so the chip the pointer was already over became a mode chip and the
                opening gesture committed a mode by itself (caught in the browser,
                2026-09-10 — it silently switched a gradient to Spectral). Growing into the
                gap beside the trigger keeps the pointer over the same button it pressed. */}
            {open && spaces.map((sp) => {
                const active = sp === value;
                return (
                    <button
                        key={sp}
                        type="button"
                        aria-pressed={active}
                        className={`${size} py-0.5 rounded-sm whitespace-nowrap transition-colors ${
                            active ? 'bg-line/15 text-fg font-semibold' : 'text-fg-dim hover:text-fg hover:bg-line/10'
                        }`}
                        onMouseEnter={() => onPreview(sp)}
                        onFocus={() => onPreview(sp)}
                        onClick={() => { onSelect(sp); close(); }}
                    >
                        {BLEND_SPACE_LABEL[sp]}
                    </button>
                );
            })}
            <button
                type="button"
                aria-expanded={open}
                className={`${size} py-0.5 rounded-sm font-semibold whitespace-nowrap transition-colors ${
                    open ? 'text-fg bg-line/15' : 'text-fg-muted hover:text-fg hover:bg-line/10'
                }`}
                onClick={() => (open ? close() : setOpen(true))}
                title={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} space`}
            >
                {BLEND_SPACE_LABEL[value]}
            </button>
        </div>
    );
};
