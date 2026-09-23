/**
 * AboutGxBody — the Gradient Explorer's body for installHelp's `about` slot (plans/
 * pre-release-ui-pass.md §1: "version + build, licence, credits — and the one thing GMT's
 * doesn't need: the catalogue's attribution obligations").
 *
 * Shape follows app-gmt's `AboutGmtBody` minus its renderer line: GX has no worker, so there
 * is no GPU to name.
 *
 * ATTRIBUTION IS READ, NOT WRITTEN. The credits list is the catalogue's own manifest
 * (`BundleInfo` in palette/core/catalogLoader.ts: label / licence / attribution / url), for
 * the bundles whose group is LOADED right now (`usePickerStore().loadedGroups`), with each
 * one's count. So a pack fetched later (a phone starts with the core only, Filters ▸ Sources
 * loads the rest) appears the moment it lands, and a pack that is not on the wall is not
 * credited as if it were. Every loaded file carries the full manifest, which is why the
 * filter by group matters.
 *
 * CREDITS FILES (2026-09-13). Each loaded pack links its baked credits file
 * (`credits.<pack>.txt`, written by `debug/bake-palette-catalog.mts` beside the pack and resolved
 * against the base the pack loaded from — `getGroupCreditsUrl`): authors, licence, source and
 * count per archive / package, plus the licence texts that must travel with copies. A pack from
 * an old v1 file has no credits file and shows no link. The names are the category names the
 * wall uses (`categoryName`), so About and Filters ▸ Sources say the same thing.
 *
 * OWNER REVIEW (2026-09-13): the credit line is approved ("About credit line OK", plans/
 * ge-v2-parity-checklist.md, "Owner review of the end-of-session status"). The links — each
 * source's link, the GitHub link, and the credits links added later that day — have no
 * recorded review and are still drafts.
 */

import React from 'react';
import { usePickerStore } from '../../../palette/store/pickerStore';
import { groupOfBundle, getGroupCreditsUrl, PALETTE_GROUPS } from '../../../palette/core/catalogLoader';
import { categoryName } from '../../../palette/core/catalogOrigin';
import { GX_APP_NAME, GX_VERSION } from '../version';

declare const __APP_VERSION__: string;
const ENGINE_BUILD = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?';

export const AboutGxBody: React.FC<{ onWhatsNew?: () => void }> = ({ onWhatsNew }) => {
  const bundles = usePickerStore((s) => s.bundles);
  const counts = usePickerStore((s) => s.bundleCounts);
  const loadedGroups = usePickerStore((s) => s.loadedGroups);
  const usingFallback = usePickerStore((s) => s.usingFallback);
  const loaded = Object.entries(bundles)
    .filter(([id]) => loadedGroups.includes(groupOfBundle(id) ?? ''))
    .sort((a, b) => (counts[b[0]] ?? 0) - (counts[a[0]] ?? 0));
  const credits = PALETTE_GROUPS.filter((g) => loadedGroups.includes(g.id))
    .map((g) => ({ id: g.id, url: getGroupCreditsUrl(g.id) }))
    .filter((g): g is { id: string; url: string } => !!g.url);

  return (
    <div className="text-[10px] text-fg-muted leading-relaxed space-y-2" data-gx-about="">
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-fg-dim font-mono" title="The Gradient Explorer's version, and the GMT engine build it runs on">
          {GX_APP_NAME} {GX_VERSION} · build {ENGINE_BUILD}
        </p>
        {onWhatsNew && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onWhatsNew(); }}
            className="text-[9px] text-accent-400 hover:underline hover:text-accent-300 transition-colors"
          >
            What's New →
          </button>
        )}
      </div>
      <p>
        {GX_APP_NAME} is part of GMT, made by <span className="text-fg font-bold">Guy Zack</span>.
      </p>

      <div className="pt-2 border-t border-line/10">
        <div className="text-[8px] text-fg-dim font-bold mb-1">Gradients on the wall</div>
        {usingFallback ? (
          <p className="text-[9px] text-fg-dim">The catalogue did not load — the wall is showing the built-in presets.</p>
        ) : loaded.length === 0 ? (
          <p className="text-[9px] text-fg-dim">Loading the catalogue…</p>
        ) : (
          <ul className="space-y-1.5">
            {loaded.map(([id, b]) => (
              <li key={id} className="text-[9px] leading-snug" data-gx-about-attribution={id}>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">{categoryName(b.label, b.tag)}</a>
                {counts[id] ? <span className="text-fg-dim"> · {counts[id].toLocaleString()}</span> : null}
                <div className="text-fg-dim">{b.attribution}</div>
                <div className="text-fg-faint">Licence: {b.license}</div>
              </li>
            ))}
          </ul>
        )}
        {credits.length > 0 && (
          <p className="text-[9px] text-fg-dim mt-1.5" data-gx-about-credits="">
            Credits &amp; licences:{' '}
            {credits.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && ' · '}
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline" data-gx-about-credits-pack={c.id}>{c.id}</a>
              </React.Fragment>
            ))}
          </p>
        )}
        {/* The built-in presets are not a catalogue bundle, so the list above never credits them.
            Six of the twenty seeds are CARTOColors palettes, Turbo is Google's and "Rainbow
            Divergent" is ColorBrewer Spectral (found 2026-09-16, plans/gx-first-release-gaps.md). */}
        <p className="text-[9px] text-fg-dim mt-1.5" data-gx-about-presets="">
          The built-in presets use colours from{' '}
          <a href="https://carto.com/carto-colors/" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">CARTOColors</a>{' '}
          (CC BY 4.0),{' '}
          <a href="https://colorbrewer2.org/" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">ColorBrewer</a>{' '}
          (Apache-2.0) and Google's Turbo (Apache-2.0).
        </p>
        {/* The takedown path (owner, 2026-09-23: the minimum for a casual open-source release —
            credit everything, and remove on request rather than audit every source up front). */}
        <p className="text-[9px] text-fg-dim mt-1.5" data-gx-about-takedown="">
          If a gradient here is yours and you would like it credited differently or removed, tell us
          with Send Feedback, or{' '}
          <a href="https://github.com/gamazama/GMT-fractals/issues" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">open an issue on GitHub</a>.
        </p>
      </div>

      <div className="flex flex-col gap-1 pt-2 border-t border-line/10">
        <a href="https://github.com/gamazama/GMT-fractals" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-fg transition-colors">
          <span>Source:</span>
          <span className="text-accent-400 hover:underline">GitHub (GPL-3.0)</span>
        </a>
      </div>
    </div>
  );
};
