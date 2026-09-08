/**
 * SetRail — the bottom edge NAMES the sets (GE v2 Phase D, 2026-09-08;
 * plans/ge-v2-unified-shell-plan.md §4 Phase D, the DECIDED block).
 *
 * One row of chips in a FIXED order — All · Today · Yesterday · the date · Kept · every
 * named group · Snapshots — so a set is a place you return to by position (the research's
 * rule 1; the Photos revert). The lit chip is the set on the ground (V3: accent means "this
 * one") and the number beside each label is its count. It replaces the shelf's strip of
 * small bars: the gradients themselves are drawn on the ground, by the wall, at a size
 * that follows the count.
 *
 * Gestures, in the shelf's own language:
 *   • click — put that set on the ground;
 *   • double-click a named group — rename it in place (Enter commits, Esc cancels);
 *   • right-click a named group — Rename · Manage… (the pull-up);
 *   • drop a gradient on Kept or a named group — file it there (a favourite MOVES, a wall
 *     tile becomes a new favourite); drop it on the empty tail — a new group. Recent's bins
 *     take no drops (Recent is auto-managed), nor does All.
 *   • the chevron at the right end pulls up the full My Gradients panel (search, list
 *     view, import / export) — the manage surface, unchanged.
 *
 * Store writes go through `paramEdit`, so a drop or a rename is one undo step, exactly as
 * the panel's gestures are.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_GROUP, newGroupId, useFavientsStore, type Favient } from '../../palette/store/favientsStore';
import { FAVIENT_DND_MIME, readFavientDrag, type FavientDragPayload } from '../../palette/core/favientDnd';
import { paramEdit } from '../../palette/store/paramUndoBracket';
import type { GroundSetDesc } from '../../palette/core/groundSets';
import { useStoreCallbacks } from '../../components/contexts/StoreCallbacksContext';
import { Icon } from './ui/Icon';

interface Props {
  sets: GroundSetDesc[];
  activeId: string;
  onSelect: (id: string) => void;
  /** The manage pull-up (the full My Gradients panel). */
  open: boolean;
  onToggleOpen: () => void;
}

const groupOf = (f: Favient): string => f.group ?? DEFAULT_GROUP;

/** File a dragged gradient into `group`: a favourite moves, anything else is inserted. */
const fileInto = (group: string, p: FavientDragPayload): void => {
  const st = useFavientsStore.getState();
  const existing = p.favId ? st.favients.find((f) => f.id === p.favId) : undefined;
  if (existing) {
    if (groupOf(existing) === group) return;
    const rest = st.favients.filter((f) => f.id !== existing.id);
    const at = rest.findIndex((f) => groupOf(f) === group);
    st.moveFavient(existing.id, at < 0 ? rest.length : at, group);
    return;
  }
  const at = st.favients.findIndex((f) => groupOf(f) === group);
  st.insertFavient(p.config, p.name, p.source, at < 0 ? st.favients.length : at, group);
};

const NEW_GROUP_LABEL = 'Group';

export const SetRail: React.FC<Props> = ({ sets, activeId, onSelect, open, onToggleOpen }) => {
  const renameGroup = useFavientsStore((s) => s.renameGroup);
  const { openContextMenu } = useStoreCallbacks();
  const [over, setOver] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ group: string; value: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming?.group]);

  const commitRename = useCallback(() => {
    if (!renaming) return;
    const v = renaming.value.trim();
    const cur = useFavientsStore.getState().groupLabels[renaming.group];
    if (v && v !== cur) paramEdit(() => renameGroup(renaming.group, v));
    setRenaming(null);
  }, [renaming, renameGroup]);

  const canTake = (s: GroundSetDesc | null, dt: DataTransfer): boolean =>
    (s === null || (s.kind === 'group' && s.group !== undefined)) && Array.from(dt.types).includes(FAVIENT_DND_MIME);

  const dropOn = (s: GroundSetDesc | null) => (e: React.DragEvent) => {
    if (!canTake(s, e.dataTransfer)) return;
    e.preventDefault();
    setOver(null);
    const p = readFavientDrag(e.dataTransfer);
    if (!p) return;
    paramEdit(() => {
      if (s) {
        fileInto(s.group!, p);
        return;
      }
      // The empty tail: a new group with a placeholder name, its chip opening straight
      // into rename (the panel does the same with a focused divider).
      const g = newGroupId();
      fileInto(g, p);
      useFavientsStore.getState().renameGroup(g, NEW_GROUP_LABEL);
      setRenaming({ group: g, value: useFavientsStore.getState().groupLabels[g] ?? NEW_GROUP_LABEL });
    });
  };
  const dragOver = (s: GroundSetDesc | null, key: string) => (e: React.DragEvent) => {
    if (!canTake(s, e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (over !== key) setOver(key);
  };

  const menuFor = (s: GroundSetDesc) => (e: React.MouseEvent) => {
    if (s.kind !== 'group' || s.group === DEFAULT_GROUP) return;
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY, [
      { label: 'Rename', action: () => setRenaming({ group: s.group!, value: s.label }) },
      { label: open ? 'Close My Gradients' : 'Manage…', action: onToggleOpen },
    ]);
  };

  return (
    <div className="flex items-center gap-1.5 px-6 h-10 shrink-0" data-gx-set-rail="">
      {sets.map((s) => {
        const lit = s.id === activeId;
        const renamable = s.kind === 'group' && s.group !== DEFAULT_GROUP;
        const isRenaming = renaming?.group !== undefined && renaming.group === s.group && renamable;
        return (
          <button
            key={s.id}
            type="button"
            data-gx-set={s.id}
            data-gx-set-kind={s.kind}
            data-gx-set-count={s.count}
            aria-pressed={lit}
            title={s.kind === 'catalog' ? 'The whole library' : s.kind === 'bin' ? 'What you picked that day' : s.kind === 'group' ? (renamable ? 'Double-click to rename · drop a gradient here to file it' : 'What you kept · drop a gradient here to file it') : 'Snapshots of the whole studio'}
            onClick={() => { if (!isRenaming) onSelect(s.id); }}
            onDoubleClick={renamable ? () => setRenaming({ group: s.group!, value: s.label }) : undefined}
            onContextMenu={menuFor(s)}
            onDragOver={dragOver(s, s.id)}
            onDragLeave={() => { if (over === s.id) setOver(null); }}
            onDrop={dropOn(s)}
            className={[
              'inline-flex items-center h-[26px] px-3 rounded-lg text-[13px] whitespace-nowrap border transition-colors',
              lit ? 'border-accent-400 text-accent-300 bg-accent-400/10' : 'border-line/20 text-fg-muted hover:text-fg hover:border-line/40',
              over === s.id ? 'outline outline-2 outline-dashed outline-gx-armed' : '',
            ].join(' ')}
          >
            {isRenaming ? (
              <input
                ref={inputRef}
                autoFocus
                value={renaming!.value}
                onChange={(e) => setRenaming({ group: renaming!.group, value: e.target.value })}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                  else if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); }
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent outline-none text-[13px] text-fg w-[96px]"
              />
            ) : (
              <>
                {s.label}
                <span className={`ml-1.5 tabular-nums ${lit ? 'text-accent-300/70' : 'text-fg-dim'}`}>{s.count.toLocaleString()}</span>
              </>
            )}
          </button>
        );
      })}
      {/* the tail: drop a gradient here for a new group */}
      <div
        className={`flex-1 self-stretch min-w-[48px] rounded-lg transition-colors ${over === 'tail' ? 'outline outline-2 outline-dashed outline-gx-armed' : ''}`}
        data-gx-set-tail=""
        onDragOver={dragOver(null, 'tail')}
        onDragLeave={() => { if (over === 'tail') setOver(null); }}
        onDrop={dropOn(null)}
        title="Drop a gradient here to start a new group"
      />
      <button
        type="button"
        className="flex items-center gap-1 h-[26px] px-2 rounded-lg text-[13px] text-fg-muted hover:text-fg hover:bg-line/10"
        onClick={onToggleOpen}
        aria-expanded={open}
        title={open ? 'Back to the wall' : 'My Gradients — search, list view, rename, import and export'}
      >
        {open ? 'less' : 'more'} <Icon name={open ? 'chevronDown' : 'chevronUp'} />
      </button>
    </div>
  );
};

export default SetRail;
