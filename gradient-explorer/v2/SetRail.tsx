/**
 * SetRail — the bottom edge NAMES the sets (GE v2 Phase D, 2026-09-08;
 * plans/ge-v2-unified-shell-plan.md §4 Phase D, the DECIDED block).
 *
 * One row of chips in a FIXED order — All · Today · Yesterday · the date · Kept · every
 * named group — so a set is a place you return to by position (the research's rule 1; the
 * Photos revert). It stands at the TOP of the ground, above the wall's own header (the
 * owner's walk, 2026-09-08: "that makes more sense hierarchically" — which set, then how it
 * is narrowed, then the tiles). The lit chips are the sets on the ground (V3: accent means
 * "this one") and the number beside each label is its count. It replaces the shelf's strip
 * of small bars: the gradients themselves are drawn on the ground, by the wall, at a size
 * that follows the count.
 *
 * The chips TOGGLE (owner, 2026-09-09: "users should be able to select multiple user Groups
 * at a time — I suggest using the same ui but toggleable"), so two groups can be on the
 * ground together and a gradient dragged from one chip's tiles onto the other. Same chip,
 * same place, one more state. The two rules that keep it from being a mode live in
 * `palette/store/groundSet.ts`: All is exclusive, and the selection is never empty.
 * Ctrl / ⌘-click is the inverse gesture — ONLY this set — because with pure toggling,
 * getting back to one set out of five would otherwise be four clicks.
 *
 * Gestures, in the shelf's own language:
 *   • click — add that set to the ground, or take it off again;
 *   • ctrl / ⌘-click — that set ALONE on the ground;
 *   • double-click a named group — rename it in place (Enter commits, Esc cancels);
 *   • right-click a SET — Rename · Import into this set… · Delete
 *     group · Manage… (§8b item 4, 2026-09-09: the operations that used to live only
 *     inside the My Gradients kebab, and only ever meant the WHOLE collection, now name
 *     the set you are pointing at — which is the noun Phase D created). A dated bin opens
 *     NO menu: Recent is auto-managed, so there is nothing to rename, fill or delete, and
 *     Export left this menu on 2026-09-09 for the rail's own icon.
 *   • the DOWNLOAD icon at the rail's end — export what is on the ground, which with more
 *     than one chip lit is the union. It is the hero's glyph, deliberately: the gesture
 *     means the same thing wherever you meet it.
 *     Delete group re-homes its gradients to Kept and says how many before you agree —
 *     deleting a container must not silently delete what is in it.
 *   • drop a gradient on Kept or a named group — file it there (a favourite MOVES, a wall
 *     tile becomes a new favourite); drop it on the empty tail — a new group. Recent's bins
 *     take no drops (Recent is auto-managed), nor does All.
 *   • drop a gradient on GX GLOBAL — contribute it to the set everyone sees. The same
 *     gesture because it means the same thing, except that this shelf is everyone's; it
 *     asks first, because the set is public and there is no un-sending. No sign-in, no
 *     name, and the server refuses a duplicate.
 *   • a TRASH appears at the right end while an existing favourite is in flight — drop it
 *     there to remove it (one undo step). The shelf panel has always had one; the ground
 *     had removal only through a tile's right-click menu. It shows only for a favourite:
 *     a catalogue tile is not yours to throw away, so there is nothing to offer.
 *   • the + at the end of the chips — a new, EMPTY group, named on the spot. A group used
 *     to exist only once something was dropped into it; an empty one is a chip now
 *     (`listGroundSets`), so "make a place, then fill it" is a thing you can do.
 *   • the kebab at the right end is the COLLECTION menu — import a gradient file, save /
 *     merge / replace / clear the whole collection, export it, the contact sheet. It is
 *     all that remains of the old "more" pull-up (owner, 2026-09-09: "we can retire almost
 *     the whole 'more section' except for its dropdown menu"), because everything else
 *     that panel did — grouping, dividers, search, list view, rename, trash, drag to
 *     reorder — is now on the ground itself. It is the ONE part of this row that is always
 *     there: `sets` arrives empty until there is a second set (L9, the shell's call), and
 *     the kebab still shows, because it holds the only menu route to Import and Load &
 *     merge and a cleared shelf must not be able to lock itself out of them (the
 *     2026-09-08 migration audit §3.8a).
 *
 * Store writes go through `paramEdit`, so a drop or a rename is one undo step, exactly as
 * the panel's gestures are.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_GROUP, newGroupId, useFavientsStore } from '../../palette/store/favientsStore';
import { fileFavientInto } from '../../palette/store/favientFiling';
import { submitToGlobalSet, GlobalSetError } from '../../palette/core/globalSet';
import { refreshGlobalSet } from '../../palette/store/globalSetStore';
import { FAVIENT_DND_MIME, readFavientDrag, type FavientDragPayload } from '../../palette/core/favientDnd';
import { paramEdit } from '../../palette/store/paramUndoBracket';
import { groupSetId, type GroundSetDesc } from '../../palette/core/groundSets';
import type { ContextMenuItem } from '../../types/help';
import { useStoreCallbacks } from '../../components/contexts/StoreCallbacksContext';
import { showToast } from '../../engine/store/toastStore';
import { useNativeDragging, useDragPayload } from '../../palette/store/dragVisual';
import { FavientsCollectionMenu } from '../../palette/components/FavientsCollectionMenu';
import { Icon } from './ui/Icon';

interface Props {
  sets: GroundSetDesc[];
  /** Every set currently on the ground. */
  activeIds: readonly string[];
  /** This set ALONE on the ground. */
  onSelect: (id: string) => void;
  /** Add / remove this set from the ground. */
  onToggle: (id: string) => void;
  /** Open the export window over WHAT IS ON THE GROUND — the union of the lit chips (the
   *  app hosts it, as it does the hero's). Not per-set: the rail is multi-select, so one
   *  button at the rail's end cannot mean "this set", and "export what you are looking at"
   *  is the reading that survives two chips being lit. Ctrl-click a chip first if you want
   *  one set alone (owner, 2026-09-09). */
  onExportGround: () => void;
  /** What that export would carry, for the button's label and its disabled state. All is
   *  the catalogue and holds no favourites, so it exports nothing. */
  groundExportCount: number;
  /** Ask for gradient files to import into this group. */
  onImportInto: (group: string) => void;
}

const NEW_GROUP_LABEL = 'Group';

export const SetRail: React.FC<Props> = ({ sets, activeIds, onSelect, onToggle, onExportGround, groundExportCount, onImportInto }) => {
  const renameGroup = useFavientsStore((s) => s.renameGroup);
  const removeGroup = useFavientsStore((s) => s.removeGroup);
  const removeFavient = useFavientsStore((s) => s.remove);
  const { openContextMenu } = useStoreCallbacks();
  // The trash is only offered for a drag that carries a favId — an existing favourite.
  const dragging = useNativeDragging();
  const inFlight = useDragPayload();
  const trashable = dragging && !!inFlight?.favId;
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
    (s === null || (s.kind === 'group' && s.group !== undefined) || s.kind === 'global') &&
    Array.from(dt.types).includes(FAVIENT_DND_MIME);

  /**
   * Contribute a gradient to the SHARED set. The same gesture as filing one into a group
   * of your own — drag it onto the chip — because it means the same thing, except that
   * this shelf is everyone's. It asks first: the set is public and there is no un-sending.
   *
   * Not undoable, and deliberately not wrapped in `paramEdit`: nothing local changed, so
   * there is nothing for Ctrl+Z to put back. Your own copy stays exactly where it was.
   */
  const contribute = (p: FavientDragPayload): void => {
    const msg = 'Add this gradient to GX global?' + String.fromCharCode(10, 10) +
      'Everyone using the app will see it, and it cannot be taken back. Your own copy stays where it is.';
    if (!window.confirm(msg)) return;
    showToast('Adding it to GX global…');
    void submitToGlobalSet(p.config).then(
      (r) => {
        showToast(r.added ? 'Added to GX global — thank you' : 'That one is already in GX global');
        if (r.added) refreshGlobalSet();
      },
      (err) => showToast(err instanceof GlobalSetError ? err.message : 'Could not add it to GX global'),
    );
  };

  const dropOn = (s: GroundSetDesc | null) => (e: React.DragEvent) => {
    if (!canTake(s, e.dataTransfer)) return;
    e.preventDefault();
    setOver(null);
    const p = readFavientDrag(e.dataTransfer);
    if (!p) return;
    if (s?.kind === 'global') {
      contribute(p);
      return;
    }
    paramEdit(() => {
      if (s) {
        fileFavientInto(s.group!, p);
        return;
      }
      // The empty tail: a new group with a placeholder name, its chip opening straight
      // into rename (the panel does the same with a focused divider).
      const g = newGroupId();
      fileFavientInto(g, p);
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

  const deleteGroup = (s: GroundSetDesc) => {
    const n = s.count;
    const msg = n
      ? `Delete the group “${s.label}”? Its ${n} gradient${n === 1 ? '' : 's'} move${n === 1 ? 's' : ''} to Kept — nothing is deleted.`
      : `Delete the empty group “${s.label}”?`;
    if (!window.confirm(msg)) return;
    paramEdit(() => removeGroup(s.group!));
    // The lit set just stopped existing; put the ground on the gradients that moved.
    if (activeIds.includes(s.id)) onSelect(groupSetId(DEFAULT_GROUP));
    showToast(n ? `Group deleted — ${n} moved to Kept` : 'Group deleted');
  };

  /** A new, empty group — a label with no members, which `listGroundSets` now shows as a
   *  chip. It opens straight into rename, as a drop-made group does. */
  const newGroup = () => {
    const g = newGroupId();
    paramEdit(() => renameGroup(g, NEW_GROUP_LABEL));
    setRenaming({ group: g, value: useFavientsStore.getState().groupLabels[g] ?? NEW_GROUP_LABEL });
  };

  // The set's own menu. A dated bin is auto-managed, so it offers Export only; All (the
  // catalogue) is not yours to manage and offers nothing.
  const menuFor = (s: GroundSetDesc) => (e: React.MouseEvent) => {
    // The catalogue and the SHARED set are not yours to manage. The shared one still
    // exports — it is a public resource, and taking a copy of it is the point.
    if (s.kind === 'catalog') return;
    e.preventDefault();
    e.stopPropagation();
    const named = s.kind === 'group' && s.group !== DEFAULT_GROUP;
    const items: ContextMenuItem[] = [];
    if (named) items.push({ label: 'Rename', action: () => setRenaming({ group: s.group!, value: s.label }) });
    if (s.kind === 'group') items.push({ label: 'Import into this set…', action: () => onImportInto(s.group!) });
    if (named) items.push({ label: 'Delete group', danger: true, action: () => deleteGroup(s) });
    // Export left this menu on 2026-09-09 for the rail's own icon, which exports the whole
    // GROUND — so a dated bin now has nothing to offer and opens no menu at all rather than
    // an empty box.
    if (!items.length) return;
    openContextMenu(e.clientX, e.clientY, items);
  };

  return (
    <div className="flex items-center gap-1.5 px-6 h-10 shrink-0" data-gx-set-rail="">
      {sets.map((s) => {
        const lit = activeIds.includes(s.id);
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
            title={[
              s.kind === 'catalog'
                ? 'The whole library'
                : s.kind === 'global'
                  ? 'Shared with everyone using the app · drag one out to keep your own copy, or drop one here to add it'
                : s.kind === 'bin'
                  ? 'What you picked that day'
                  : renamable
                    ? 'Double-click to rename · drop a gradient here to file it · right-click for import, export and delete'
                    : 'What you kept · drop a gradient here to file it · right-click for import and export',
              s.kind === 'catalog' ? '' : lit ? 'Click to take it off the ground · ctrl-click for this set alone' : 'Click to add it to the ground · ctrl-click for this set alone',
            ].filter(Boolean).join('\n')}
            onClick={(e) => {
              if (isRenaming) return;
              // ctrl / ⌘ = only this one; a plain click toggles.
              if (e.ctrlKey || e.metaKey) onSelect(s.id);
              else onToggle(s.id);
            }}
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
      {/* the TRASH — only while a favourite is in flight, in the place the eye is already
          on (the rail is where the drag is going anyway) */}
      {trashable && (
        <div
          data-gx-trash=""
          onDragOver={(e) => {
            if (!Array.from(e.dataTransfer.types).includes(FAVIENT_DND_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (over !== 'trash') setOver('trash');
          }}
          onDragLeave={() => { if (over === 'trash') setOver(null); }}
          onDrop={(e) => {
            e.preventDefault();
            setOver(null);
            const p = readFavientDrag(e.dataTransfer);
            if (!p?.favId) return; // only an existing favourite can be thrown away
            // A multi-drag throws away everything it carries, in one undo step.
            const ids = p.favIds?.length ? p.favIds : [p.favId];
            const set = new Set(ids);
            paramEdit(() => {
              const st = useFavientsStore.getState();
              if (ids.length === 1) removeFavient(ids[0]);
              else st.replaceAll(st.favients.filter((f) => !set.has(f.id)));
            });
            showToast(ids.length === 1 ? `Removed “${p.name}” — undo with Ctrl+Z` : `Removed ${ids.length} — undo with Ctrl+Z`);
          }}
          title="Drop here to remove it from My Gradients"
          className={`inline-flex items-center gap-1 h-[26px] px-2.5 rounded-lg border text-[13px] transition-colors ${
            over === 'trash' ? 'border-danger text-danger bg-danger/10' : 'border-line/25 text-fg-muted'
          }`}
        >
          <Icon name="trash" /> {(inFlight?.count ?? 1) > 1 ? `Remove ${inFlight!.count}` : 'Remove'}
        </div>
      )}
      {/* a new, EMPTY group — the same thing the tail's drop makes, without needing a
          gradient in hand first */}
      {sets.length > 0 && (
        <button
          type="button"
          onClick={newGroup}
          title="New group"
          aria-label="New group"
          className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-lg border border-line/20 text-fg-muted hover:text-fg hover:border-line/40 transition-colors"
        >
          <Icon name="plus" />
        </button>
      )}
      {/* the tail: drop a gradient here for a new group */}
      <div
        className={`flex-1 self-stretch min-w-[48px] rounded-lg transition-colors ${over === 'tail' ? 'outline outline-2 outline-dashed outline-gx-armed' : ''}`}
        data-gx-set-tail=""
        onDragOver={dragOver(null, 'tail')}
        onDragLeave={() => { if (over === 'tail') setOver(null); }}
        onDrop={dropOn(null)}
        title="Drop a gradient here to start a new group"
      />
      {/* EXPORT THE GROUND (owner, 2026-09-09) — the hero's own download glyph, so the
          gesture reads the same wherever you are: this icon means "take this away with you".
          It replaces the per-chip "Export this set" menu item AND the Export block that used
          to live inside the collection menu beside it, which was whole-collection only, had
          no subject switch, and was the third surface doing this job. */}
      <button
        type="button"
        onClick={onExportGround}
        disabled={groundExportCount === 0}
        data-gx-export-ground=""
        aria-label="Export what is on the ground"
        title={
          groundExportCount === 0
            ? 'Nothing here to export — All is the whole library, not a set of your own. Pick a set.'
            : `Export what is on the ground — ${groundExportCount} gradient${groundExportCount === 1 ? '' : 's'}`
        }
        className={[
          'inline-flex items-center justify-center w-[26px] h-[26px] rounded-lg border transition-colors',
          // LIT LIKE A CHIP when there is something to take (owner, 2026-09-10). The rail's
          // own buttons are the vocabulary here, so "this will do something" reads the same
          // on the icon as it does on Kept or Presets: accent border, accent ink, accent
          // wash. Nothing else in the rail is blue unless it is live.
          groundExportCount > 0
            ? 'border-accent-400 text-accent-300 bg-accent-400/10 hover:bg-accent-400/20'
            : 'border-line/20 text-fg-dim',
        ].join(' ')}
      >
        <Icon name="download" size={16} />
      </button>
      {/* the collection menu — what is left of "more": import, save, load, clear */}
      <FavientsCollectionMenu onFlash={showToast} withExport={false} />
    </div>
  );
};

export default SetRail;
