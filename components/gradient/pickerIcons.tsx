/**
 * pickerIcons — the colour picker's glyphs, after the owner's designs
 * (H:\GMT\assets\GXN\someIcons.svg, 2026-09-08).
 *
 * Drawn on a 16-unit grid with the ink filling 2.1 … 13.9 — about three quarters of the box.
 * That is the balance point: the first cut framed each glyph at its exact bounding box, which
 * clipped every stroke against the frame; the second over-corrected and left them small and
 * lost in the button. A stroke of 1.3 needs ~0.65 of clearance, so ~2 units of margin is
 * generous without shrinking the drawing.
 *
 * House rules for anything added here:
 *   • 16×16 viewBox, ink within ~2.1–13.9, so a stroke has clearance without going small
 *   • `currentColor` throughout, so a glyph follows the theme and turns accent when its mode
 *     is on; never a literal ink colour
 *   • round caps and joins, and the weight scales with how many parts a glyph has — 1.3 for
 *     the simple shapes, 1.1 where several elements share the box. That hierarchy is the
 *     owner's, kept from the sheet.
 *
 * The eyedropper is the exception: it is the owner's own path, filled rather than stroked, and
 * it reads correctly as drawn, so it is transcribed verbatim inside its original 8-unit window.
 */
import React from 'react';

interface Props {
    /** Rendered size in px. Drawn for 14. */
    size?: number;
    className?: string;
}

const Frame: React.FC<Props & { children: React.ReactNode; box?: string }> = ({
    size = 14,
    className = '',
    box = '0 0 16 16',
    children,
}) => (
    <svg viewBox={box} width={size} height={size} className={className} aria-hidden focusable="false">
        {children}
    </svg>
);

/** Stroke defaults; `w` is the weight for this glyph's complexity. */
const ink = (w = 1.3) => ({
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: w,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
});

/** Two overlapping cards — copy. */
export const CopyGlyph: React.FC<Props> = (p) => (
    <Frame {...p}>
        <path {...ink(1.2)} d="M5.9 10.1H3.7A1.5 1.5 0 0 1 2.2 8.6V3.7a1.5 1.5 0 0 1 1.5-1.5h4.9a1.5 1.5 0 0 1 1.5 1.5v2.2" />
        <rect {...ink(1.2)} x="5.9" y="5.9" width="7.9" height="7.9" rx="1.5" />
    </Frame>
);

/**
 * A pipette — pick a colour off the screen. The owner's own path, filled, kept verbatim in its
 * original 8-unit window (it reads correctly as drawn).
 */
export const EyedropperGlyph: React.FC<Props> = (p) => (
    <Frame {...p} box="116 146 8 8">
        <path fill="currentColor" d="M116.4,151.7l-.4,1.7c0,.2,0,.5.3.5,0,0,.1,0,.2,0l1.7-.4c0,0,.1,0,.2-.1l3.6-3.6.6.6.6-.6-.6-.6,1.1-1.1c.2-.2.3-.4.3-.6s0-.4-.3-.6l-.7-.7c-.3-.3-.9-.3-1.2,0l-1.1,1.1-.6-.6-.6.6.6.6-3.6,3.6c0,0,0,.1-.1.2h0ZM117.2,152.1l3.5-3.5.7.7-3.5,3.5-.9.2.2-.9h0Z" />
    </Frame>
);

/** A rounded square — the saturation/value field. */
export const SpectrumGlyph: React.FC<Props> = (p) => (
    <Frame {...p}>
        <rect {...ink()} x="2.2" y="2.2" width="11.6" height="11.6" rx="2.4" />
    </Frame>
);

/** A circle — the colour wheel. */
export const WheelGlyph: React.FC<Props> = (p) => (
    <Frame {...p}>
        <circle {...ink()} cx="8" cy="8" r="5.8" />
    </Frame>
);

/** The knot's own silhouette — this stop's position, bias and interpolation. */
export const StopGlyph: React.FC<Props> = (p) => (
    <Frame {...p}>
        <path {...ink()} d="M8 2.1l5 5v5.7a1.1 1.1 0 0 1-1.1 1.1H4.1A1.1 1.1 0 0 1 3 12.8V7.1z" />
    </Frame>
);

/** Four overlapping circles — colours that belong together. */
export const HarmonyGlyph: React.FC<Props> = (p) => (
    <Frame {...p}>
        {/* Four circles that still read as FOUR. The sheet overlaps them heavily, which is
            lovely at 44 px and turns into a flower at 14 — so the overlap is eased until the
            individual discs survive at icon size, which is the point of the glyph. */}
        <circle {...ink(1.05)} cx="5.4" cy="5.4" r="3.3" />
        <circle {...ink(1.05)} cx="10.6" cy="5.4" r="3.3" />
        <circle {...ink(1.05)} cx="5.4" cy="10.6" r="3.3" />
        <circle {...ink(1.05)} cx="10.6" cy="10.6" r="3.3" />
    </Frame>
);

/** Sliders — the RGB and HSV channels. Each column breaks where its handle sits. */
export const ChannelsGlyph: React.FC<Props> = (p) => (
    <Frame {...p}>
        <path {...ink(1.15)} d="M3.6 2.2v3.1M3.6 8.3v5.5M8 2.2v6.6M8 11.7v2.1M12.4 2.2v1.5M12.4 6.7v7.1" />
        <path {...ink(1.15)} d="M2.1 6.8h3M6.5 10.2h3M10.9 5.2h3" />
    </Frame>
);

/** A thermometer — colour temperature. */
export const KelvinGlyph: React.FC<Props> = (p) => (
    <Frame {...p}>
        <path {...ink()} d="M9.6 9.4V4a1.6 1.6 0 0 0-3.2 0v5.4a3.2 3.2 0 1 0 3.2 0z" />
    </Frame>
);

/** Loose chips — the colours you have used. */
export const SwatchesGlyph: React.FC<Props> = (p) => (
    <Frame {...p}>
        <rect {...ink(1.1)} x="2.2" y="2.2" width="5" height="5" rx="1.1" />
        <rect {...ink(1.1)} x="8.8" y="2.2" width="5" height="5" rx="1.1" />
        <rect {...ink(1.1)} x="2.2" y="8.8" width="5" height="5" rx="1.1" />
    </Frame>
);
