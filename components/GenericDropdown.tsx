/**
 * GenericDropdown — Pure UI dropdown with no store dependency.
 *
 * This is the rendering core shared by both the main-app Dropdown
 * (which adds fractalStore integration) and the mesh-export page.
 */

import React from 'react';
import { ChevronDown } from './Icons';

/**
 * Shrink the selected option's type until it fits the box, rather than clipping it. A
 * dropdown in a narrow column ("Split complementary" in a 110 px well) is unreadable
 * truncated and perfectly fine a point or two smaller (owner, 2026-09-08). Measures the
 * REAL rendered text, so it holds for any label in any font.
 */
const useFitText = (text: string, base: number, min = 9) => {
    const ref = React.useRef<HTMLSelectElement>(null);
    const [size, setSize] = React.useState(base);
    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const fit = () => {
            // the element's OWN padding, not a guessed gutter: the chevron sits in a 24 px
            // right pad and a magic number under-reserved it, so text still clipped by a hair
            const cs = getComputedStyle(el);
            const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            if (room <= 0) return;
            const probe = document.createElement('span');
            probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px';
            probe.style.font = cs.font;
            probe.style.fontSize = `${base}px`;
            probe.textContent = text;
            document.body.appendChild(probe);
            const w = probe.getBoundingClientRect().width;
            probe.remove();
            setSize(w <= room ? base : Math.max(min, Math.floor(base * (room / w))));
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, [text, base, min]);
    return { ref, size };
};

export interface GenericDropdownOption<T> {
    label: string;
    value: T;
    disabled?: boolean;
}

export interface GenericDropdownProps<T> {
    label?: string;
    value: T;
    options: GenericDropdownOption<T>[];
    onChange: (value: T) => void;
    fullWidth?: boolean;
    className?: string;
    /** 'md' = 32 px tall, 13 px text (the v2 shell's control size). Default = the engine's compact 26 px. */
    size?: 'sm' | 'md';
    selectClassName?: string;
    labelSuffix?: React.ReactNode;
    /** Optional help-id for help system integration */
    'data-help-id'?: string;
    /** Optional context menu handler */
    onContextMenu?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    /** Optional passthrough handlers spread onto the native <select> (e.g. to
     *  pause rendering while the dropdown is open). Kept generic so this
     *  component stays store-free. */
    selectHandlers?: Pick<React.SelectHTMLAttributes<HTMLSelectElement>, 'onMouseDown' | 'onKeyDown' | 'onBlur'>;
}

export function GenericDropdown<T extends string | number>({
    label,
    value,
    options,
    onChange,
    fullWidth,
    className = '',
    size = 'sm',
    selectClassName = '',
    labelSuffix,
    onContextMenu,
    disabled = false,
    selectHandlers,
    ...rest
}: GenericDropdownProps<T>) {
    const selectedLabel = options.find((o) => String(o.value) === String(value))?.label ?? '';
    const { ref: selectRef, size: fitSize } = useFitText(selectedLabel, size === 'md' ? 13 : 10);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const isNumber = typeof options[0]?.value === 'number';
        onChange((isNumber ? Number(val) : val) as T);
    };

    return (
        <div
            // 'md' is the v2 shell's control: the SAME 30 px box as a segmented button
            // (h-7 plus its border) and, like that button, transparent behind its label — only
            // the value half is filled, the way a slider's value sits in its own well (owner,
            // 2026-09-08). 'sm' is the studio's filled row, untouched.
            className={`flex items-stretch ${
                size === 'md'
                    ? 'rounded-lg h-[30px] border border-line/20'
                    : 'bg-line/[0.12] rounded-t-sm h-9 md:h-[26px] border-b border-line/5'
            } overflow-hidden ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
            data-help-id={rest['data-help-id']}
            onContextMenu={onContextMenu}
        >
            {label && (
                <div className="flex-1 flex items-center gap-2 px-2 min-w-0">
                    <label className={`${size === 'md' ? 'text-[13px] font-normal' : 'text-[10px] font-medium'} tracking-tight select-none truncate pointer-events-none text-fg-muted`}>
                        {label}{labelSuffix}
                    </label>
                </div>
            )}
            <div
                className={`${label ? 'w-1/2' : 'w-full'} relative ${
                    size === 'md' ? 'border-l border-line/20 bg-line/[0.10]' : 'border-l border-line/10 bg-line/[0.02] border-t border-t-white/5'
                }`}
            >
                <select
                    ref={selectRef}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    {...selectHandlers}
                    style={{ fontSize: fitSize }}
                    className={`w-full h-full bg-transparent [font-family:inherit] ${size === 'md' ? 'font-normal text-fg' : 'font-medium text-fg-secondary'} px-2 pr-6 outline-none cursor-pointer appearance-none text-center ${selectClassName}`}
                >
                    {options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled} className="bg-surface text-fg-tertiary">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-fg-dim">
                   <div className="w-2.5 h-2.5"><ChevronDown /></div>
                </div>
            </div>
        </div>
    );
}
