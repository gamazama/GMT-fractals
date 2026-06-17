/**
 * ChannelTrackSidebar — the curve editor's track list (L / C / h): per-channel
 * show/hide + "select all keys", and All/None selection. A compact local stand-in
 * for components/graph/GraphSidebar (which is bound to the animation store).
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
}) => (
  <div className="w-28 shrink-0 border-r border-white/10 bg-zinc-950/60 flex flex-col text-[11px]">
    <div className="flex items-center gap-1 px-2 py-1 border-b border-white/10">
      <span className="text-[9px] uppercase tracking-wide text-gray-600 mr-auto">Tracks</span>
      <button onClick={onSelectAll} className="text-[9px] text-gray-400 hover:text-gray-200">All</button>
      <button onClick={onDeselectAll} className="text-[9px] text-gray-400 hover:text-gray-200">None</button>
    </div>
    {channels.map((c) => {
      const vis = visible[c.key] !== false;
      return (
        <div
          key={c.key}
          className={`flex items-center gap-1.5 px-2 py-1 border-b border-white/5 ${c.key === activeChannel ? 'bg-white/[0.06]' : ''}`}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
          <button onClick={() => onSelectChannel(c.key)} className={`flex-1 text-left truncate ${vis ? 'text-gray-300' : 'text-gray-600'}`}>
            {c.label}
          </button>
          <button onClick={() => onSelectKeys(c.key)} title="Select all keys" className="text-gray-500 hover:text-cyan-300">
            <SelectAllIcon />
          </button>
          <button onClick={() => onToggleVisible(c.key)} title={vis ? 'Hide' : 'Show'} className={vis ? 'text-gray-300' : 'text-gray-600'}>
            <EyeIcon active={vis} />
          </button>
        </div>
      );
    })}
  </div>
);

export default ChannelTrackSidebar;
