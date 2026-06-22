import React from 'react';
import {
    useColorScheme,
    DEFAULT_ACCENT_HUE,
    DEFAULT_SECONDARY_HUE,
} from '../engine/store/colorSchemeStore';

/**
 * HueControl — the Settings ▸ Interface accent-hue sliders. A hue slider (0-359°)
 * over a rainbow track, with a live swatch of the resulting colour and a reset.
 * `AccentHueControl` drives the primary accent; `SecondaryHueControl` the secondary
 * (audio / modulation / Path Tracer). Both recolour their accent on any colour scheme
 * (replaces the old per-accent duplicate themes). Reads/writes colorSchemeStore.
 *
 * @invariant Engine-core (components/) — consumes the colorScheme store only.
 */
const HUE_TRACK =
    'linear-gradient(to right, hsl(0 90% 55%), hsl(60 90% 55%), hsl(120 90% 55%), ' +
    'hsl(180 90% 55%), hsl(240 90% 55%), hsl(300 90% 55%), hsl(360 90% 55%))';

const THUMB =
    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 ' +
    '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full ' +
    '[&::-webkit-slider-thumb]:bg-fg [&::-webkit-slider-thumb]:border ' +
    '[&::-webkit-slider-thumb]:border-line/40 [&::-webkit-slider-thumb]:shadow ' +
    '[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full ' +
    '[&::-moz-range-thumb]:bg-fg [&::-moz-range-thumb]:border-0';

const HueSlider: React.FC<{
    hue: number;
    onChange: (h: number) => void;
    onReset: () => void;
    isDefault: boolean;
    swatchVar: string;
    label: string;
}> = ({ hue, onChange, onReset, isDefault, swatchVar, label }) => (
    <div className="flex items-center gap-3 py-1">
        <div
            className="w-4 h-4 rounded-full border border-line/20 shrink-0"
            style={{ background: `rgb(var(${swatchVar}))` }}
            title={`Current ${label}`}
        />
        <input
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={`${label} hue`}
            className={`flex-1 h-2 rounded-full appearance-none cursor-pointer ${THUMB}`}
            style={{ background: HUE_TRACK }}
        />
        <span className="text-[10px] text-fg-dim font-mono w-9 text-right tabular-nums">{hue}°</span>
        <button
            type="button"
            onClick={onReset}
            disabled={isDefault}
            className="text-[9px] text-fg-faint hover:text-accent disabled:opacity-30 disabled:hover:text-fg-faint transition-colors shrink-0"
        >
            reset
        </button>
    </div>
);

export const AccentHueControl: React.FC = () => {
    const hue = useColorScheme((s) => s.accentHue);
    const setAccentHue = useColorScheme((s) => s.setAccentHue);
    return (
        <HueSlider
            hue={hue}
            onChange={setAccentHue}
            onReset={() => setAccentHue(DEFAULT_ACCENT_HUE)}
            isDefault={hue === DEFAULT_ACCENT_HUE}
            swatchVar="--accent-400"
            label="accent"
        />
    );
};

export const SecondaryHueControl: React.FC = () => {
    const hue = useColorScheme((s) => s.secondaryHue);
    const setSecondaryHue = useColorScheme((s) => s.setSecondaryHue);
    return (
        <HueSlider
            hue={hue}
            onChange={setSecondaryHue}
            onReset={() => setSecondaryHue(DEFAULT_SECONDARY_HUE)}
            isDefault={hue === DEFAULT_SECONDARY_HUE}
            swatchVar="--secondary"
            label="secondary accent"
        />
    );
};
