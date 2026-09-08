/**
 * pickerIcons — the colour picker's glyphs, drawn by the owner (H:\GMT\assets\GXN\someIcons.svg,
 * 2026-09-08) and transcribed here verbatim.
 *
 * The source is one sheet: nine 8-unit glyphs sitting in a row at y 146–154 of a 300×300
 * artboard. Each icon below keeps its path data EXACTLY as authored and simply frames it with
 * its own `viewBox="<x> 146 8 8"`. That is deliberate — re-origining the coordinates by hand is
 * how a curve quietly loses a pixel, and the offset viewBox costs nothing. If the sheet is
 * redrawn, re-transcribe rather than nudge.
 *
 * Two changes from the source, both necessary: the authored `#1e1e1e` / `#010101` becomes
 * `currentColor` so the glyphs follow the theme and the accent when a mode is on, and the
 * clip-path around the channels glyph is dropped since its viewBox already is that rectangle.
 * Stroke weights are kept as drawn (0.8 for the simple shapes, 0.5 where a glyph carries more
 * parts) — that is the artist's hierarchy, not an accident.
 */
import React from 'react';

interface Props {
    /** Rendered size in px. The glyphs are drawn for roughly 14. */
    size?: number;
    className?: string;
}

/** Shared frame: an 8-unit window onto the sheet at `x`. */
const Glyph: React.FC<Props & { x: number; children: React.ReactNode }> = ({ x, size = 14, className = '', children }) => (
    <svg
        viewBox={`${x} 146 8 8`}
        width={size}
        height={size}
        className={className}
        aria-hidden
        focusable="false"
    >
        {children}
    </svg>
);

/** Stroked glyphs share these; `w` is the authored stroke width. */
const stroke = (w: number) => ({
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: w,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
});

/** Two overlapping cards — copy. */
export const CopyGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={96}>
        <path {...stroke(0.8)} d="M97.2,151.2h-.4c-.2,0-.4,0-.6-.2-.2-.2-.2-.4-.2-.6v-3.6c0-.2,0-.4.2-.6.1-.2.4-.2.6-.2h3.6c.2,0,.4,0,.6.2.2.2.2.4.2.6v.4M99.6,148.8h3.6c.4,0,.8.4.8.8v3.6c0,.4-.4.8-.8.8h-3.6c-.4,0-.8-.4-.8-.8v-3.6c0-.4.4-.8.8-.8Z" />
    </Glyph>
);

/** A pipette — pick a colour off the screen. Filled, as drawn. */
export const EyedropperGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={116}>
        <path fill="currentColor" d="M116.4,151.7l-.4,1.7c0,.2,0,.5.3.5,0,0,.1,0,.2,0l1.7-.4c0,0,.1,0,.2-.1l3.6-3.6.6.6.6-.6-.6-.6,1.1-1.1c.2-.2.3-.4.3-.6s0-.4-.3-.6l-.7-.7c-.3-.3-.9-.3-1.2,0l-1.1,1.1-.6-.6-.6.6.6.6-3.6,3.6c0,0,0,.1-.1.2h0ZM117.2,152.1l3.5-3.5.7.7-3.5,3.5-.9.2.2-.9h0Z" />
    </Glyph>
);

/** A rounded square — the saturation/value field. */
export const SpectrumGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={136}>
        <rect {...stroke(0.8)} x="136" y="146" width="8" height="8" rx="1.2" ry="1.2" />
    </Glyph>
);

/** A circle — the colour wheel. */
export const WheelGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={156}>
        <circle {...stroke(0.8)} cx="160" cy="150" r="4" />
    </Glyph>
);

/** The knot's own silhouette — this stop's position, bias and interpolation. */
export const StopGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={176}>
        <path {...stroke(0.8)} d="M181.9,154h-3.8c0,0-.2,0-.3,0,0,0-.2,0-.2-.2s-.1-.2-.2-.2c0,0,0-.2,0-.3v-4.6s2.7-2.7,2.7-2.7l2.7,2.7v4.6c0,.2,0,.4-.2.5s-.3.2-.5.2Z" />
    </Glyph>
);

/** Four overlapping circles — colours that belong together. */
export const HarmonyGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={196}>
        <circle {...stroke(0.5)} cx="198.4" cy="148.4" r="2.4" />
        <circle {...stroke(0.5)} cx="201.6" cy="151.6" r="2.4" />
        <circle {...stroke(0.5)} cx="198.4" cy="151.6" r="2.4" />
        <circle {...stroke(0.5)} cx="201.6" cy="148.4" r="2.4" />
    </Glyph>
);

/** Sliders — the RGB and HSV channels. */
export const ChannelsGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={216}>
        <path {...stroke(0.8)} d="M217.3,153v-2.3M217.3,149.3v-2.3M220,153v-3M220,148.7v-1.7M222.7,153v-1.7M222.7,150v-3M216.3,150.7h2M219,148.7h2M221.7,151.3h2" />
    </Glyph>
);

/** A thermometer — colour temperature. */
export const KelvinGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={236}>
        <path {...stroke(0.8)} d="M240.8,150.9v-3.8c0-.2,0-.4-.2-.6-.2-.2-.4-.2-.6-.2s-.4,0-.6.2c-.2.2-.2.4-.2.6v3.8c-.3.2-.5.4-.6.7-.1.3-.1.6,0,.9,0,.3.3.6.5.8.3.2.6.3.9.3s.6-.1.9-.3c.3-.2.4-.5.5-.8,0-.3,0-.6,0-.9-.1-.3-.3-.6-.6-.7Z" />
    </Glyph>
);

/** Loose chips — the colours you have used. */
export const SwatchesGlyph: React.FC<Props> = (p) => (
    <Glyph {...p} x={256}>
        <rect {...stroke(0.5)} x="256" y="146" width="3" height="3" />
        <rect {...stroke(0.5)} x="261" y="146" width="3" height="3" />
        <rect {...stroke(0.5)} x="256" y="151" width="3" height="3" />
    </Glyph>
);
