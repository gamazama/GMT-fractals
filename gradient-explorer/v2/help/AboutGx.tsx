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
 * OWNER REVIEW (2026-09-13): the credit line and links are drafts.
 */

import React from 'react';
import { usePickerStore } from '../../../palette/store/pickerStore';
import { groupOfBundle } from '../../../palette/core/catalogLoader';
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
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">{b.label}</a>
                {counts[id] ? <span className="text-fg-dim"> · {counts[id].toLocaleString()}</span> : null}
                <div className="text-fg-dim">{b.attribution}</div>
                <div className="text-fg-faint">Licence: {b.license}</div>
              </li>
            ))}
          </ul>
        )}
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
