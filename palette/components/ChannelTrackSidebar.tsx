/**
 * ChannelTrackSidebar — the curve editor's track list (L / C / h): per-channel
 * show/hide + "select all keys", and All/None selection. A compact local stand-in
 * for components/graph/GraphSidebar (which is bound to the animation store).
 *
 * Two shapes. The COLUMN is the desk's: a 112 px rail beside the plot, one row per channel,
 * the full label. The ROW is the phone's (`horizontal`, owner 2026-09-12: "tracks takes a
 * lot of space — it should be a horizontal strip above the curve editor"): the same controls
 * wrapped into one scrolling line above the plot, which returns those 112 px to the curve.
 * The row drops the "Tracks" caption and shortens each label to its initial, since a channel
 * is identified by the colour dot beside it and the three are L / C / h.
 */

import React from 'react';
import { EyeIcon, SelectAllIcon } from '../../components/Icons';
import type { ChannelKey } from './ChannelGraphEditor';

export interface ChannelInfo {
  key: ChannelKey;
  label: string;
  color: string;
}

interface Props {
  channels: ChannelInfo[];
  visible: Record<string, boolean>;
  activeChannel: ChannelKey;
  onToggleVisible: (key: ChannelKey) => void;
  onSelectChannel: (key: ChannelKey) => void;
  onSelectKeys: (key: ChannelKey) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  /** Non-selectable LAYERS listed under the channels (the fit ghost): an eye, no keys to
   *  select (owner, 2026-09-07 evening: "a layer under chroma and hue, just has no points
   *  to select"). */
  layers?: { key: string; label: string; color: string; visible: boolean; onToggle: () => void; dashed?: boolean }[];
  /** Lay the list out as one horizontal strip instead of a side rail (phone). */
  horizontal?: boolean;
}

export const ChannelTrackSidebar: React.FC<Props> = ({
  channels,
  visible,
  activeChannel,
  onToggleVisible,
  onSelectChannel,
  onSelectKeys,
  onSelectAll,
  onDeselectAll,
  layers = [],
  horizontal = false,
}) =>
  horizontal ? (
    /* WRAPS to two rows rather than scrolling (owner, 2026-09-12: "they are not fitting, we
       can't read the names. can be two rows"). One scrolling line meant either initials — a
       track called "L" — or controls past the end that nothing says are there. Two rows of
       full names costs ~22 px and reads. */
    <div className="w-full flex items-center gap-x-2 gap-y-1 flex-wrap px-2 py-1 border-b border-line/10 bg-surface-dock/60 text-[11px]">
      {channels.map((c) => {
        const vis = visible[c.key] !== false;
        return (
          <div
            key={c.key}
            className={`shrink-0 flex items-center gap-1 pl-1 pr-0.5 py-0.5 rounded border ${
              c.key === activeChannel ? 'border-line/20 bg-line/[0.08]' : 'border-transparent'
            }`}
          >
            {/* The DOT is part of the name's hit target (owner: "clicking on the little dot
                needs to select the track as well, otherwise the only selectable area is the
                one letter"). One button, dot and word inside it. */}
            <button
              onClick={() => onSelectChannel(c.key)}
              title={`Edit ${c.label}`}
              className={`flex items-center gap-1.5 px-1 py-1 ${vis ? 'text-fg-tertiary' : 'text-fg-faint'}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
              {c.label}
            </button>
            <button onClick={() => onSelectKeys(c.key)} title={`Select all ${c.label} keys`} className="text-fg-dim p-1">
              <SelectAllIcon />
            </button>
            <button onClick={() => onToggleVisible(c.key)} title={vis ? 'Hide' : 'Show'} className={`p-1 ${vis ? 'text-fg-tertiary' : 'text-fg-faint'}`}>
              <EyeIcon active={vis} />
            </button>
          </div>
        );
      })}
      {/* A layer is one button: dot, name, eye. It had lost its name to a scrolling row that
          could not fit it; the row wraps now, so it reads again. */}
      {layers.map((l) => (
        <button
          key={l.key}
          onClick={l.onToggle}
          title={`${l.label} — ${l.visible ? 'hide' : 'show'}`}
          className={`shrink-0 flex items-center gap-1.5 pl-1.5 pr-1 py-1 ${l.visible ? 'text-fg-tertiary' : 'text-fg-faint'}`}
          data-gx-layer={l.key}
        >
          <span className="w-2 h-2 rounded-full shrink-0 border" style={{ borderColor: l.color, borderStyle: l.dashed ? 'dashed' : 'solid' }} />
          {l.label}
          <EyeIcon active={l.visible} />
        </button>
      ))}
      <div className="shrink-0 flex items-center gap-1.5 ml-auto pl-2">
        <button onClick={onSelectAll} title="Select every key" className="text-[10px] text-fg-muted px-1 py-1">All</button>
        <button onClick={onDeselectAll} title="Select nothing" className="text-[10px] text-fg-muted px-1 py-1">None</button>
      </div>
    </div>
  ) : (
  <div className="w-28 shrink-0 border-r border-line/10 bg-surface-dock/60 flex flex-col text-[11px]">
    <div className="flex items-center gap-1 px-2 py-1 border-b border-line/10">
      <span className="text-[9px] uppercase tracking-wide text-fg-faint mr-auto">Tracks</span>
      <button onClick={onSelectAll} className="text-[9px] text-fg-muted hover:text-fg-secondary">All</button>
      <button onClick={onDeselectAll} className="text-[9px] text-fg-muted hover:text-fg-secondary">None</button>
    </div>
    {channels.map((c) => {
      const vis = visible[c.key] !== false;
      return (
        <div
          key={c.key}
          className={`flex items-center gap-1.5 px-2 py-1 border-b border-line/5 ${c.key === activeChannel ? 'bg-line/[0.06]' : ''}`}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
          <button onClick={() => onSelectChannel(c.key)} className={`flex-1 text-left truncate ${vis ? 'text-fg-tertiary' : 'text-fg-faint'}`}>
            {c.label}
          </button>
          <button onClick={() => onSelectKeys(c.key)} title="Select all keys" className="text-fg-dim hover:text-accent-300">
            <SelectAllIcon />
          </button>
          <button onClick={() => onToggleVisible(c.key)} title={vis ? 'Hide' : 'Show'} className={vis ? 'text-fg-tertiary' : 'text-fg-faint'}>
            <EyeIcon active={vis} />
          </button>
        </div>
      );
    })}
    {layers.map((l) => (
      <div key={l.key} className="flex items-center gap-1.5 px-2 py-1 border-b border-line/5" data-gx-layer={l.key}>
        <span className="w-2 h-2 rounded-full shrink-0 border" style={{ borderColor: l.color, borderStyle: l.dashed ? 'dashed' : 'solid' }} />
        <span className={`flex-1 truncate ${l.visible ? 'text-fg-tertiary' : 'text-fg-faint'}`}>{l.label}</span>
        <button onClick={l.onToggle} title={l.visible ? 'Hide' : 'Show'} className={l.visible ? 'text-fg-tertiary' : 'text-fg-faint'}>
          <EyeIcon active={l.visible} />
        </button>
      </div>
    ))}
  </div>
);

export default ChannelTrackSidebar;
