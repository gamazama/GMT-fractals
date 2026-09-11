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
 *
 * PHONE (Phase F, 2026-09-10). One row of chips in a FIXED order is still the rule, and on
 * a 390 px screen the way to keep it is to let the row SCROLL: `overflow-x` with the bar
 * hidden (`.gx-rail-scroll`, index.css), `snap-x snap-proximity` so a flick parks a chip's
 * edge rather than half of one, chips 34 px tall for a fingertip, and a short fade over the
 * run's end saying there is more. Measured before: the row clipped past the 4th chip with
 * no way at all to reach the 5th.
 *
 * The + · export · collection-menu cluster is PINNED outside that run, at the right end —
 * a control you can scroll away from is a control you cannot find. The order is otherwise
 * the desktop one: on a desktop the + still sits between the chips and the tail.
 *
 * The trash drop-well and the "drop a gradient here" tail are NOT RENDERED on a phone.
 * Touch fires no HTML drag events, so neither has anything to answer; the tail is also the
 * desktop rail's spacer, so hiding it (rather than leaving it out) would have left a
 * flexible box of nothing shoving the pinned tools around.
 *
 * @see docs/adr/0115-the-shell-on-a-phone.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_GROUP, newGroupId, useFavientsStore } from '../../palette/store/favientsStore';
import { fileFavientInto } from '../../palette/store/favientFiling';
import { contributeToGlobal } from './contributeToGlobal';
import { flashSetSave, useSetSaveFlash, SAVE_MS, SAVE_SLOW_MS } from './setSaveFlash';
import { configToCss } from '../../palette/core/gradientCss';
import type { GradientConfig } from '../../types';
import { FAVIENT_DND_MIME, readFavientDrag, type FavientDragPayload } from '../../palette/core/favientDnd';
import { paramEdit } from '../../palette/store/paramUndoBracket';
import { groupSetId, type GroundSetDesc } from '../../palette/core/groundSets';
import type { ContextMenuItem } from '../../types/help';
import { useStoreCallbacks } from '../../components/contexts/StoreCallbacksContext';
import { showToast } from '../../engine/store/toastStore';
import { useNativeDragging, useDragPayload } from '../../palette/store/dragVisual';
import { FavientsCollectionMenu } from '../../palette/components/FavientsCollectionMenu';
import { Icon } from './ui/Icon';
import { useIsPhone } from './useIsPhone';

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
  const phone = useIsPhone();
  const renameGroup = useFavientsStore((s) => s.renameGroup);
  const removeGroup = useFavientsStore((s) => s.removeGroup);
  const removeFavient = useFavientsStore((s) => s.remove);
  const { openContextMenu } = useStoreCallbacks();
  // The trash is only offered for a drag that carries a favId — an existing favourite.
  const dragging = useNativeDragging();
  const inFlight = useDragPayload();
  const trashable = dragging && !!inFlight?.favId;
  const [over, setOver] = useState<string | null>(null);
  /**
   * THE SAVE, DRAWN WHERE IT LANDS (owner, 2026-09-11). Two halves:
   *   • HOVER — while a gradient is in flight, the chip under it fills with that gradient, so
   *     the drop is aimed at a picture of what you are giving it. `useDragPayload` is the
   *     cursor avatar's own source (`palette/store/dragVisual.ts`); the DataTransfer cannot
   *     be read during a dragover, which is why that module exists at all.
   *   • SAVE — the fill collapses to the chip's centre line and goes, and the label lights
   *     through it. Announced through `setSaveFlash` so the ♥, which is nowhere near this
   *     rail, can play the same thing (slower, with a bloom).
   */
  const flightCss = useMemo(
    () => (inFlight?.config ? configToCss(inFlight.config as GradientConfig) : undefined),
    [inFlight?.config],
  );
  const saved = useSetSaveFlash();
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

  const dropOn = (s: GroundSetDesc | null) => (e: React.DragEvent) => {
    if (!canTake(s, e.dataTransfer)) return;
    e.preventDefault();
    setOver(null);
    const p = readFavientDrag(e.dataTransfer);
    if (!p) return;
    // The confirmation, on the chip that took it. Fired BEFORE the write so the animation
    // starts on the frame the pointer released, not after the store has re-rendered the rail.
    const flash = () => { const css = configToCss(p.config); if (css && s) flashSetSave(s.id, css); };
    if (s?.kind === 'global') {
      contributeToGlobal(p.config);
      return;
    }
    flash();
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

  // PHONE (Phase F): the chips become a scrolling RUN and the three tools pin to the right
  // of it. The run is built once and placed by the branch below, so a chip is the same
  // chip either way — including its drop handlers, which is what keeps the desktop
  // gestures out of this change.
  const chips = (
    <>
      {sets.map((s) => {
        const lit = activeIds.includes(s.id);
        const renamable = s.kind === 'group' && s.group !== DEFAULT_GROUP;
        const isRenaming = renaming?.group !== undefined && renaming.group === s.group && renamable;
        // A chip only paints a gradient it could actually take (`canTake`'s rule, minus the
        // DataTransfer): the catalogue and the date bins are not drop targets, and offering
        // them a fill would promise a save that will not happen.
        const takes = s.kind === 'group' || s.kind === 'global';
        const hoverFill = takes ? flightCss : undefined;
        const savedHere = saved?.setId === s.id;
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
              // 34 px tall on a phone: a 26 px chip is a comfortable click and a poor tap.
              // `snap-start` pairs with the run's `snap-x snap-proximity` so a flick parks a
              // chip's left edge at the run's, never half a chip in.
              phone ? 'inline-flex items-center h-[34px] px-3 shrink-0 snap-start' : 'inline-flex items-center h-[26px] px-3',
              // `relative overflow-hidden`: the fill below is an absolutely positioned child
              // and must be clipped to the chip's rounded box, or a collapsing gradient
              // paints over its neighbours.
              'relative overflow-hidden rounded-lg text-[13px] whitespace-nowrap border transition-colors',
              lit ? 'border-accent-400 text-accent-300 bg-accent-400/10' : 'border-line/20 text-fg-muted hover:text-fg hover:border-line/40',
              over === s.id ? 'outline outline-2 outline-dashed outline-gx-armed' : '',
            ].join(' ')}
          >
            {/* HOVER: the gradient in flight, filling the chip it would land in. Dimmed, so
                the label it sits under stays readable — this is an aim, not the confirmation. */}
            {hoverFill && over === s.id && (
              <span
                aria-hidden
                data-gx-set-hover-fill=""
                className="absolute inset-0 opacity-55 pointer-events-none"
                style={{ backgroundImage: hoverFill }}
              />
            )}
            {/* SAVE: the same gradient, at full strength, collapsing to the chip's centre. */}
            {savedHere && (
              <span
                aria-hidden
                data-gx-set-save=""
                className="absolute inset-0 animate-set-save pointer-events-none"
                style={{ backgroundImage: saved!.css, ['--save-ms' as string]: `${saved!.slow ? SAVE_SLOW_MS : SAVE_MS}ms` }}
              >
                {/* the ♥'s bloom — held a beat longer and brighter, because that press is at
                    the other end of the screen from this chip */}
                {saved!.slow && <span className="absolute inset-0 bg-white animate-set-save-bloom" style={{ ['--save-ms' as string]: `${SAVE_SLOW_MS}ms` }} />}
              </span>
            )}
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
              <span
                className={`relative inline-flex items-center ${savedHere ? 'animate-set-save-text' : ''}`}
                style={savedHere ? { ['--save-ms' as string]: `${saved!.slow ? SAVE_SLOW_MS : SAVE_MS}ms` } : undefined}
              >
                {s.label}
                <span className={`ml-1.5 tabular-nums ${lit ? 'text-accent-300/70' : 'text-fg-dim'}`}>{s.count.toLocaleString()}</span>
              </span>
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
    </>
  );

  /* The tail: drop a gradient here for a new group. It also does the SPACING on a desktop
     rail (`flex-1`) — which is why it is not simply hidden on a phone but left out of the
     tree there: a phone fires no drag events, so it would be a flexible box of nothing
     pushing the tools around, and the scrolling run needs that space. */
  const tail = (
    <div
      className={`flex-1 self-stretch min-w-[48px] rounded-lg transition-colors ${over === 'tail' ? 'outline outline-2 outline-dashed outline-gx-armed' : ''}`}
      data-gx-set-tail=""
      onDragOver={dragOver(null, 'tail')}
      onDragLeave={() => { if (over === 'tail') setOver(null); }}
      onDrop={dropOn(null)}
      title="Drop a gradient here to start a new group"
    />
  );

  // The three TOOLS at the rail's end. On a phone they are pinned outside the scrolling
  // run — a control you can scroll away from is a control you cannot find — and they take
  // the chips' 34 px so the row reads as one band of touch targets.
  const tool = phone ? 'w-[34px] h-[34px]' : 'w-[26px] h-[26px]';
  /* a new, EMPTY group — the same thing the tail's drop makes, without needing a gradient
     in hand first. On a desktop it sits where it always did, right after the chips and
     before the tail; on a phone there is no tail, so it joins the pinned cluster. */
  const plus = sets.length > 0 && (
    <button
      type="button"
      onClick={newGroup}
      title="New group"
      aria-label="New group"
      className={`inline-flex items-center justify-center shrink-0 ${tool} rounded-lg border border-line/20 text-fg-muted hover:text-fg hover:border-line/40 transition-colors`}
    >
      <Icon name="plus" />
    </button>
  );
  const endTools = (
    <>
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
          `inline-flex items-center justify-center shrink-0 ${tool} rounded-lg border transition-colors`,
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
    </>
  );

  return (
    <div className="flex items-center gap-1.5 px-6 h-10 shrink-0 bg-surface-raised" data-gx-set-rail="">
      {phone ? (
        /* PHONE: the chips SCROLL sideways and the tools stay put. Measured at 390 the row
           clipped past the 4th chip with no way to reach the 5th; the desktop answer —
           more room — is not available, and wrapping would grow the header the wall is
           trying to keep. The trash and the tail are simply not in the tree here: touch
           fires no drag events, so neither has anything to answer. */
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto gx-rail-scroll snap-x snap-proximity">{chips}</div>
          {/* the short fade over the run's END — the one thing that says there is more this
              way, now that the scrollbar is hidden. `from-surface-raised`, the rail's own
              ground, so it reads as the band swallowing the chips rather than as a panel. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface-raised to-transparent" />
        </div>
      ) : (
        <>
          {chips}
          {plus}
          {tail}
        </>
      )}
      {phone && plus}
      {endTools}
    </div>
  );
};

export default SetRail;
