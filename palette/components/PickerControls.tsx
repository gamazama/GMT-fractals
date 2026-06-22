/**
 * PickerControls — the custom-UI pieces of the Picker dock panel that need the loaded
 * catalog (theme list + bundle manifest from pickerStore). Registered as
 * 'palette-theme-chips' / 'palette-bundle-toggles' and referenced from
 * PaletteFiltersFeature.customUI; selection state lives in the paletteFilters slice.
 */

import React from 'react';
import type { FeatureComponentProps } from '../../components/registry/ComponentRegistry';
import { usePickerStore, MULTI_HUE_THEMES } from '../store/pickerStore';
import { PALETTE_GROUPS, groupOfBundle } from '../core/catalogLoader';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const RAINBOW = 'linear-gradient(90deg,#f55,#fd5,#5e6,#5dd,#56f,#e5e)';

export const PickerThemeChips: React.FC<FeatureComponentProps> = ({ featureId, sliceState, actions }) => {
  const themes = usePickerStore((s) => s.themes);
  const themeColors = usePickerStore((s) => s.themeColors);
  const setter = (actions as Record<string, (u: Record<string, unknown>) => void>)[`set${cap(featureId)}`];
  const active: string[] = sliceState?.activeThemes ?? [];
  if (!themes.length) return null;
  const toggle = (t: string) =>
    setter?.({ activeThemes: active.includes(t) ? active.filter((x) => x !== t) : [...active, t] });

  const chipStyle = (theme: string): React.CSSProperties => {
    if (MULTI_HUE_THEMES.has(theme)) return { background: RAINBOW, color: '#111' };
    const c = themeColors[theme];
    if (!c) return { background: 'rgba(255,255,255,0.06)', color: '#aaa' };
    const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return { background: `rgb(${c[0]},${c[1]},${c[2]})`, color: lum > 140 ? '#111' : '#fff' };
  };

  return (
    <div className="px-2 py-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-fg-dim">Themes</span>
        {active.length > 0 && (
          <button onClick={() => setter?.({ activeThemes: [] })} className="text-[10px] text-accent-400 hover:text-accent-300">
            clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {themes.map(({ theme, count }) => {
          const on = active.includes(theme);
          return (
            <button
              key={theme}
              onClick={() => toggle(theme)}
              style={chipStyle(theme)}
              className={`px-1.5 py-0.5 rounded text-[10px] border whitespace-nowrap transition-all ${
                on ? 'border-fg ring-1 ring-white' : 'border-black/30 opacity-80 hover:opacity-100'
              }`}
            >
              {theme} <b className="opacity-70 font-semibold">{count}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** Source bundle ids in a stable order: by group registry, then alphabetically within. */
const orderedBundleIds = (counts: Record<string, number>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of PALETTE_GROUPS)
    for (const b of [...g.bundles].sort()) if (counts[b] != null && !seen.has(b)) { seen.add(b); out.push(b); }
  // Any bundle not declared in a group (defensive) trails alphabetically.
  for (const b of Object.keys(counts).sort()) if (!seen.has(b)) out.push(b);
  return out;
};

/**
 * Sources toggle list. Core (redistributable) bundles are always loaded → the checkbox
 * HIDES/SHOWS them (paletteFilters.hiddenBundles). Licensed bundles (softology, cptcity)
 * live in lazy groups → the checkbox LOADS/UNLOADS the group (fetch on demand), so a
 * public build needn't ship them at all.
 */
export const PickerBundleToggles: React.FC<FeatureComponentProps> = ({ featureId, sliceState, actions }) => {
  const bundles = usePickerStore((s) => s.bundles);
  const counts = usePickerStore((s) => s.bundleCounts);
  const loadedGroups = usePickerStore((s) => s.loadedGroups);
  const loadingGroups = usePickerStore((s) => s.loadingGroups);
  const setGroupLoaded = usePickerStore((s) => s.setGroupLoaded);
  const setter = (actions as Record<string, (u: Record<string, unknown>) => void>)[`set${cap(featureId)}`];
  const hidden: string[] = sliceState?.hiddenBundles ?? [];
  const ids = orderedBundleIds(counts);
  if (!ids.length) return null;

  const groupCore = (id: string) => {
    const gid = groupOfBundle(id);
    return PALETTE_GROUPS.find((g) => g.id === gid)?.core ?? true;
  };
  const toggleHide = (id: string) =>
    setter?.({ hiddenBundles: hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id] });

  return (
    <div className="px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-fg-dim mb-1">Sources</div>
      <div className="flex flex-col gap-0.5">
        {ids.map((id) => {
          const info = bundles[id];
          const isCore = groupCore(id);
          const gid = groupOfBundle(id);
          const loading = gid != null && loadingGroups.includes(gid);
          // Core: checkbox = visible. Licensed: checkbox = group loaded (fetch on demand).
          const on = isCore ? !hidden.includes(id) : gid != null && loadedGroups.includes(gid);
          const onToggle = () => {
            if (isCore) toggleHide(id);
            else if (gid) setGroupLoaded(gid, !on);
          };
          return (
            <label key={id} className="flex items-center gap-2 text-[11px] text-fg-tertiary cursor-pointer">
              <input type="checkbox" checked={on} disabled={loading} onChange={onToggle} className="accent-accent-500" />
              <span className={`flex-1 truncate ${!isCore && !on ? 'text-fg-dim' : ''}`} title={info?.attribution}>
                {info?.label ?? id}
                {!isCore && <span className="ml-1 text-warn/70" title={`${info?.license ?? 'licensed source'} — loaded on demand`}>•</span>}
              </span>
              <span className="text-fg-faint tabular-nums">{loading ? '…' : counts[id]}</span>
              {info?.url && (
                <a
                  href={info.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-fg-dim hover:text-accent-300"
                  title={`${info.attribution} — ${info.license}`}
                >
                  ↗
                </a>
              )}
            </label>
          );
        })}
      </div>
      <div className="mt-1 text-[9px] text-fg-faint leading-tight">
        <span className="text-warn/70">•</span> licensed source — loaded on demand, omittable from a public build
      </div>
    </div>
  );
};
