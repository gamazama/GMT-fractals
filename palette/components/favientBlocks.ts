/**
 * favientBlocks — the shelf's contiguous runs of one group, in array order, with RECENT
 * split into DATED BINS (Phase D.1, owner 2026-09-07: "for my gradients — dated bins by
 * default"). Pure (no React, no store state) so `test:palette-favients` can import it.
 */
import { DEFAULT_GROUP, isRecentGroup, type Favient } from '../store/favientsStore';

export interface Block {
  group: string;
  /** Unique per rendered block — Recent splits into one block per DAY (D.1). */
  key: string;
  /** The divider text when it is not the group's own label (Recent's day bins). */
  label?: string;
  start: number;
  favs: Favient[];
}

/** The local calendar day of a timestamp, as a sortable key. */
export const dayKey = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Today · Yesterday · "3 Sep" · "3 Sep 2025" (another year). */
export const dayLabel = (t: number, now = Date.now()): string => {
  const k = dayKey(t);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(now - 86400000)) return 'Yesterday';
  const d = new Date(t);
  const s = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return d.getFullYear() === new Date(now).getFullYear() ? s : `${s} ${d.getFullYear()}`;
};

/**
 * Contiguous runs of one group, in array order. RECENT files into DATED BINS (Phase D.1,
 * owner 2026-09-07: "for my gradients — dated bins by default"): its run splits at every
 * change of local day of `createdAt`, each bin labelled Today / Yesterday / the date. A
 * re-collect refreshes `createdAt`, so a gradient picked up again moves into today's bin.
 * Named groups are one block each, as before. Drop targets still address the GROUP
 * (`group` + index within its first block) — Recent takes no drops anyway.
 */
export const buildBlocks = (favients: Favient[], now = Date.now()): Block[] => {
  const blocks: Block[] = [];
  favients.forEach((f, i) => {
    const g = f.group ?? DEFAULT_GROUP;
    const recent = isRecentGroup(g);
    const key = recent ? `${g}:${dayKey(f.createdAt)}` : g;
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) last.favs.push(f);
    else blocks.push({ group: g, key, label: recent ? dayLabel(f.createdAt, now) : undefined, start: i, favs: [f] });
  });
  return blocks;
};
