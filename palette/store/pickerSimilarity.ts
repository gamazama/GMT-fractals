/**
 * pickerSimilarity — the "More like this" anchor, held as a transient module-level store.
 *
 * While an anchor is set the wall stops grouping and becomes ONE band sorted by OKLab ramp
 * distance to the anchor (`palette/core/pickerModel.ts` → `similarityIndex` /
 * `similarityRows`). Setting it is not a filter: the same gradients are on the wall, in a
 * different order.
 *
 * NOT DDFS and NOT persisted — same stance as its sibling `pickerSearch`: a re-sort that
 * outlived a reload would be a mystery, and the anchor references a gradient that may not
 * exist in the next catalog. Cleared by the wall's clear-all and by the chip beside the
 * count.
 *
 * @see palette/store/pickerSearch.ts (the transient-store precedent)
 * @see plans/ge-v2-design.md §5.2
 */

import { useSyncExternalStore } from 'react';
import { createSingleSlot } from '../../store/createSingleSlot';
import type { GradientConfig } from '../../types';

export interface SimilarityAnchor {
  /** The gradient everything is ranked against. */
  config: GradientConfig;
  /** What to call it in the "sorted by similarity to …" chip. */
  name: string;
}

const slot = createSingleSlot<SimilarityAnchor>(null);

/** Rank the wall by similarity to this gradient; `null` returns to normal arranging. */
export const setSimilarityAnchor = (anchor: SimilarityAnchor | null): void => slot.set(anchor);

/** Subscribe a component to the similarity anchor. */
export const useSimilarityAnchor = (): SimilarityAnchor | null =>
  useSyncExternalStore(slot.subscribe, slot.get, slot.get);
