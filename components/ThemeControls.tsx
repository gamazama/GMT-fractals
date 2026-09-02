import React from 'react';
import { useColorScheme, THEME_PRESETS, type ThemePreset } from '../engine/store/colorSchemeStore';
import { THUMB } from './HueControl';

/**
 * ThemeControls — the Settings ▸ Interface scheme controls that compose the theme from
 * axes (replacing the old preset dropdown):
 *  • `ThemePresetPicker` — quick-pick buttons (Dark / Grey / Light Grey / Light) that
 *    just set the three scheme axes; the active preset is highlighted.
 *  • `BrightnessControl` — a 0-100 slider over a dark→light track; text/borders/status
 *    auto-invert at the midpoint (handled in the store).
 *
 * The Surface-tint and High-contrast toggles are plain boolean settings (rendered by the
 * SettingsPanel), and the surface-tint hue slider is `SurfaceHueControl` (HueControl.tsx).
 *
 * @assumption Engine-core (components/) — consumes the colorScheme store only.
 */

/** Does the live state match this preset's three axes? (for active highlighting) */
const isActive = (p: ThemePreset, brightness: number, tint: boolean, hc: boolean): boolean =>
    p.brightness === brightness && p.surfaceTint === tint && p.highContrast === hc;

export const ThemePresetPicker: React.FC = () => {
    const brightness = useColorScheme((s) => s.brightness);
    const tint = useColorScheme((s) => s.surfaceTint);
    const hc = useColorScheme((s) => s.highContrast);
    const applyPreset = useColorScheme((s) => s.applyPreset);
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {THEME_PRESETS.map((p) => {
                const active = isActive(p, brightness, tint, hc);
                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p)}
                        aria-pressed={active}
                        className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                            active
                                ? 'border-accent/60 bg-accent/15 text-accent'
                                : 'border-line/15 text-fg-tertiary hover:text-fg-secondary hover:border-line/30'
                        }`}
                    >
                        {p.label}
                    </button>
                );
            })}
        </div>
    );
};

const BRIGHTNESS_TRACK =
    'linear-gradient(to right, rgb(5 5 5), rgb(60 60 60), rgb(160 160 160), rgb(245 245 245))';

export const BrightnessControl: React.FC = () => {
    const brightness = useColorScheme((s) => s.brightness);
    const setBrightness = useColorScheme((s) => s.setBrightness);
    return (
        <div className="flex items-center gap-3 py-1">
            <input
                type="range"
                min={0}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                aria-label="Brightness"
                className={`flex-1 h-2 rounded-full appearance-none cursor-pointer border border-line/10 ${THUMB}`}
                style={{ background: BRIGHTNESS_TRACK }}
            />
            <span className="text-[10px] text-fg-dim font-mono w-9 text-right tabular-nums">{brightness}</span>
        </div>
    );
};
