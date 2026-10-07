/**
 * deep-zoom/ui/kit.tsx — the small presentational kit every deep-zoom panel uses.
 *
 * PURPOSE
 *   Button, Slider, Seg, Section, Field, Kbd, PanelFrame: dark, compact, keyboard accessible,
 *   built on native controls and the repo's Tailwind tokens. Hand-rolled on purpose: the engine's
 *   `components/Slider.tsx` / `Button.tsx` reach the engine store through context, and this app
 *   has no engine store.
 *
 * RULES
 *   - Pure: no store imports, no bridge. State arrives through props.
 *   - Every piece sets `pointer-events-auto` where it is interactive, because the shell's overlay
 *     containers are `pointer-events-none` so the mouse reaches the renderer everywhere else.
 *   - Class names are full literals (Tailwind's content scan purges interpolated ones).
 *   - No z-index here. Stacking belongs to the shell (`DeepZoomApp.tsx`, layer tiers).
 */
import React, { useId, useState } from 'react';

type Children = { children?: React.ReactNode };

/* ───────── Button ───────── */

export function Button({ children, onClick, primary, danger, disabled, title }: Children & {
    onClick?: () => void;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
    title?: string;
}) {
    const tone = danger
        ? 'bg-danger/15 text-danger border-danger/40 hover:bg-danger/25'
        : primary
            ? 'bg-accent-500/20 text-accent-300 border-accent-500/40 hover:bg-accent-500/30'
            : 'bg-line/10 text-fg-secondary border-line/10 hover:bg-line/15';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={'pointer-events-auto inline-flex items-center justify-center gap-1 text-[11px] leading-none px-2.5 py-1.5 border rounded-sm cursor-pointer select-none whitespace-nowrap focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400 disabled:opacity-40 disabled:cursor-default ' + tone}
        >
            {children}
        </button>
    );
}

/* ───────── Slider ───────── */

const LOG_STEPS = 1000;

function defaultFormat(v: number, step?: number): string {
    if (!Number.isFinite(v)) return '-';
    if (step && step >= 1) return String(Math.round(v));
    const a = Math.abs(v);
    if (a !== 0 && (a < 0.01 || a >= 10000)) return v.toExponential(2);
    return v.toFixed(a < 1 ? 3 : 2);
}

/**
 * A labelled range slider. `log` spreads the track logarithmically (min and max must be > 0),
 * which is what a control spanning decades needs. Arrow keys nudge; the value is announced.
 */
export function Slider({ label, value, min, max, step, onChange, format, log }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    format?: (v: number) => string;
    log?: boolean;
}) {
    const id = useId();
    const useLog = !!log && min > 0 && max > min;
    const text = format ? format(value) : defaultFormat(value, step);

    const snap = (v: number) => {
        let x = v;
        if (step && step > 0) x = Math.round(x / step) * step;
        x = Math.min(max, Math.max(min, x));
        // Trim float fuzz from the step multiply.
        return Number(x.toPrecision(12));
    };

    const pos = useLog
        ? Math.round((Math.log(Math.min(max, Math.max(min, value)) / min) / Math.log(max / min)) * LOG_STEPS)
        : value;

    return (
        <div className="pointer-events-auto flex flex-col gap-0.5 py-1">
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className="text-[10px] text-fg-dim uppercase tracking-wide">{label}</label>
                <span className="text-[11px] text-fg font-mono tabular-nums">{text}</span>
            </div>
            <input
                id={id}
                type="range"
                className="w-full h-4 cursor-pointer accent-accent-400"
                min={useLog ? 0 : min}
                max={useLog ? LOG_STEPS : max}
                step={useLog ? 1 : (step ?? 'any')}
                value={pos}
                aria-valuetext={text}
                onChange={(e) => {
                    const raw = Number(e.target.value);
                    onChange(useLog ? snap(min * Math.pow(max / min, raw / LOG_STEPS)) : snap(raw));
                }}
            />
        </div>
    );
}

/* ───────── Seg (segmented choice) ───────── */

export function Seg<T extends number | string>({ label, value, options, onChange }: {
    label?: string;
    value: T;
    options: Array<[string, T]>;
    onChange: (v: T) => void;
}) {
    return (
        <div className="pointer-events-auto flex flex-col gap-1 py-1">
            {label ? <span className="text-[10px] text-fg-dim uppercase tracking-wide">{label}</span> : null}
            <div role="radiogroup" aria-label={label} className="flex flex-wrap rounded-sm border border-line/10 overflow-hidden">
                {options.map(([text, v]) => {
                    const on = v === value;
                    return (
                        <button
                            key={String(v)}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => onChange(v)}
                            className={'flex-1 min-w-0 text-[11px] leading-none px-2 py-1.5 cursor-pointer whitespace-nowrap border-r border-line/10 last:border-r-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent-400 '
                                + (on ? 'bg-accent-500/20 text-accent-300' : 'bg-line/5 text-fg-tertiary hover:bg-line/15')}
                        >
                            {text}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ───────── Section (collapsible) ───────── */

export function Section({ title, children, defaultOpen = true }: Children & { title: string; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <section className="pointer-events-auto border-t border-line/10 first:border-t-0">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-[10px] uppercase tracking-wide text-fg-tertiary hover:text-fg cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent-400"
            >
                <span aria-hidden="true" className="inline-block w-2 text-fg-dim">{open ? '▾' : '▸'}</span>
                <span className="font-bold">{title}</span>
            </button>
            {open ? <div className="px-3 pb-3">{children}</div> : null}
        </section>
    );
}

/* ───────── Field (label + control + hint) ───────── */

export function Field({ label, hint, children }: Children & { label: string; hint?: string }) {
    return (
        <div className="pointer-events-auto flex flex-col gap-1 py-1">
            <span className="text-[10px] text-fg-dim uppercase tracking-wide">{label}</span>
            <div className="flex flex-wrap items-center gap-1.5">{children}</div>
            {hint ? <span className="text-[10px] text-fg-dim leading-snug">{hint}</span> : null}
        </div>
    );
}

/* ───────── Kbd ───────── */

export function Kbd({ children }: Children) {
    return (
        <kbd className="inline-block min-w-[18px] text-center text-[10px] leading-none font-mono text-fg px-1.5 py-1 mx-0.5 rounded-sm border border-line/20 bg-line/10">
            {children}
        </kbd>
    );
}

/* ───────── PanelFrame ───────── */

/**
 * The framed box a side panel lives in: a title row with a close button and a scrolling body.
 * The shell positions it (right edge, under the top bar); the frame only sizes itself.
 */
export function PanelFrame({ title, onClose, children, width = 320 }: Children & {
    title: string;
    onClose: () => void;
    width?: number;
}) {
    return (
        <div
            role="region"
            aria-label={title}
            style={{ width, maxWidth: 'calc(100vw - 16px)' }}
            className="pointer-events-auto flex flex-col max-h-full font-mono text-fg-secondary bg-surface-section/95 backdrop-blur border border-line/10 rounded shadow-xl overflow-hidden"
        >
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-header border-b border-line/10 shrink-0">
                <h2 className="m-0 text-sm font-bold text-fg tracking-wide">{title}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={'Close ' + title}
                    title="Close (Esc)"
                    className="w-6 h-6 flex items-center justify-center text-fg-tertiary hover:text-fg hover:bg-line/15 rounded-sm cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400"
                >
                    <span aria-hidden="true">×</span>
                </button>
            </div>
            <div className="min-h-0 overflow-y-auto text-[11px] leading-relaxed">{children}</div>
        </div>
    );
}
