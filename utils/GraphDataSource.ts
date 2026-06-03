/**
 * GraphDataSource — the store-agnostic seam for the animation/graph editor.
 *
 * `useGraphInteraction`, `useGraphTools` and `GraphSelectionBBox` were originally
 * hard-wired to `useAnimationStore` + `animationEngine` (the live timeline). The
 * palette's channel-curve editor needed the same interaction + tools logic over
 * LOCAL React state, so it was forked (~950 lines). This interface abstracts the
 * ~15 store reads/writes the three pieces actually touch, so ONE generic
 * implementation serves both: the timeline supplies `useAnimationStoreDataSource()`
 * (verbatim store reads/actions), the palette supplies a local-state impl.
 *
 * Optional fields are the timeline-only features the palette omits cleanly:
 *   • `scrub`            — playhead seek + the ADR-0061 InteractionSession gesture
 *                          (BBox scale-drag). A gradient curve has no playhead.
 *   • `setTrackSelection`/`addTracksToSelection` — the timeline syncs key
 *                          selection to track selection; the palette's 3 fixed
 *                          channels have no track selection.
 *   • `snapshot`         — undo snapshot (palette wires its own / no-op).
 *   • `addKeyframe`      — `useGraphTools` create-key (palette handles inserts itself).
 *   • `onAfterMutate`    — timeline = `animationEngine.scrub(frame)` after a
 *                          key/handle move so the viewport reflects the edit;
 *                          palette = no-op.
 *   • `bounceTension`/`bounceFriction` — `useGraphTools` smoothing physics
 *                          (default 0.5 / 0.6 when the source omits them).
 *
 * @see dev/plans/graph-editor-unification.md
 */

import { useCallback } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { animationEngine } from '../engine/AnimationEngine';
import { useInteractionGesture } from '../engine/hooks/useInteractionDrag';
import { INTERACTION_SOURCES } from '../engine-gmt/interaction/interactionSources';
import type { AnimationSequence, Keyframe, SoftSelectionType } from '../types';

type TangentMode = 'Auto' | 'Split' | 'Unified' | 'Aligned' | 'Ease';
type Interpolation = 'Linear' | 'Step' | 'Bezier';

export interface GraphDataSource {
  // --- reactive reads ---
  sequence: AnimationSequence;
  currentFrame: number;
  selectedKeyframeIds: string[];
  softSelectionEnabled: boolean;
  softSelectionRadius: number;
  softSelectionType: SoftSelectionType;

  // --- mutations (replace the store actions) ---
  updateKeyframes(updates: { trackId: string; keyId: string; patch: Partial<Keyframe> }[]): void;
  /** Singular form the original hook referenced. */
  updateKeyframe(trackId: string, keyId: string, patch: Partial<Keyframe>): void;
  selectKeyframes(ids: string[], additive: boolean): void;
  selectKeyframe(trackId: string, keyId: string, additive: boolean): void;
  deselectAllKeys(): void;
  setSoftSelection(radius: number, enabled: boolean): void;

  // --- keyframe-inspector actions (optional: a source that omits one hides the
  // corresponding control). Both editors supply all of these. ---
  /** Apply a tangent mode to the current selection (Auto/Ease/Aligned/Unified/Split). */
  setTangents?(mode: TangentMode): void;
  /** Set interpolation on EVERY key (the inspector's no-selection quick-actions). */
  setGlobalInterpolation?(type: Interpolation, tangentMode?: 'Auto' | 'Ease'): void;
  /** Delete the current keyframe selection. */
  deleteSelectedKeyframes?(): void;
  /** Soft-selection falloff shape. */
  setSoftSelectionType?(type: SoftSelectionType): void;

  // --- optional (timeline-only; the palette fork supplies none of these) ---
  snapshot?(): void;
  /**
   * Wholesale-replace a track's keyframe array (bake / simplify add and remove
   * keys, so this can't go through `updateKeyframes` which only patches existing
   * keys by id). Timeline = `useAnimationStore.setState`; palette = `onTracksChange`.
   */
  replaceKeyframes?(updates: { trackId: string; newKeys: Keyframe[] }[]): void;
  /** `useGraphTools` create-key-at-mouse. */
  addKeyframe?(trackId: string, frame: number, value: number, interp: Keyframe['interpolation']): void;
  /** Side-effect after a key/handle move — timeline scrubs the engine to `frame`. */
  onAfterMutate?(frame: number): void;
  /** `useGraphTools` smoothing physics (defaults 0.5 / 0.6). */
  bounceTension?: number;
  bounceFriction?: number;

  /** Track-selection sync (timeline only). */
  setTrackSelection?(trackId: string): void;
  addTracksToSelection?(trackIds: string[]): void;

  /** Playhead scrub + the ADR-0061 InteractionSession gesture (timeline only). */
  scrub?: {
    /** Seek the playhead (ruler drag). */
    seek(frame: number): void;
    /** Balanced scrubbing-active boundary. */
    setIsScrubbing(scrubbing: boolean): void;
    /** InteractionSession begin (BBox scale-drag). */
    begin(): void;
    /** InteractionSession end (BBox scale-drag). */
    end(): void;
  };
}

/**
 * The default data source: verbatim `useAnimationStore` reads + actions wired to
 * the live timeline. Subscribes to the same narrow per-field slices the original
 * hooks did (action selectors return stable refs via Zustand's Object.is bail-out
 * so the consuming `useCallback` deps stay stable).
 */
export const useAnimationStoreDataSource = (): GraphDataSource => {
  // Reactive reads — narrow per-field subscriptions.
  const sequence = useAnimationStore((s) => s.sequence);
  const currentFrame = useAnimationStore((s) => s.currentFrame);
  const selectedKeyframeIds = useAnimationStore((s) => s.selectedKeyframeIds);
  const softSelectionEnabled = useAnimationStore((s) => s.softSelectionEnabled);
  const softSelectionRadius = useAnimationStore((s) => s.softSelectionRadius);
  const softSelectionType = useAnimationStore((s) => s.softSelectionType);

  // Action selectors — stable refs.
  const updateKeyframe = useAnimationStore((s) => s.updateKeyframe);
  const updateKeyframes = useAnimationStore((s) => s.updateKeyframes);
  const selectKeyframe = useAnimationStore((s) => s.selectKeyframe);
  const selectKeyframes = useAnimationStore((s) => s.selectKeyframes);
  const deselectAllKeys = useAnimationStore((s) => s.deselectAllKeys);
  const setTrackSelection = useAnimationStore((s) => s.setTrackSelection);
  const addTracksToSelection = useAnimationStore((s) => s.addTracksToSelection);
  const snapshot = useAnimationStore((s) => s.snapshot);
  const setIsScrubbing = useAnimationStore((s) => s.setIsScrubbing);
  const seek = useAnimationStore((s) => s.seek);
  const setSoftSelection = useAnimationStore((s) => s.setSoftSelection);
  const setSoftSelectionType = useAnimationStore((s) => s.setSoftSelectionType);
  const setTangents = useAnimationStore((s) => s.setTangents);
  const setGlobalInterpolation = useAnimationStore((s) => s.setGlobalInterpolation);
  const deleteSelectedKeyframes = useAnimationStore((s) => s.deleteSelectedKeyframes);
  const addKeyframe = useAnimationStore((s) => s.addKeyframe);
  const bounceTension = useAnimationStore((s) => s.bounceTension);
  const bounceFriction = useAnimationStore((s) => s.bounceFriction);

  // ADR-0061 InteractionSession scrub gesture (used by the BBox scale-drag).
  const scrubGesture = useInteractionGesture(INTERACTION_SOURCES.scrub);

  // Timeline = scrub the engine to the current frame after a key/handle move so
  // the viewport reflects the edit. Stable ref (animationEngine is a singleton).
  const onAfterMutate = useCallback((frame: number) => animationEngine.scrub(frame), []);

  // Bake / simplify wholesale-replace track keyframe arrays (immutable — new
  // track + sequence objects so subscribers re-render; the drag snapshot in
  // useGraphTools is an independent deep clone, unaffected).
  const replaceKeyframes = useCallback((updates: { trackId: string; newKeys: Keyframe[] }[]) => {
    useAnimationStore.setState((state) => {
      const newTracks = { ...state.sequence.tracks };
      updates.forEach((u) => {
        if (newTracks[u.trackId]) newTracks[u.trackId] = { ...newTracks[u.trackId], keyframes: u.newKeys };
      });
      return { sequence: { ...state.sequence, tracks: newTracks } };
    });
  }, []);

  return {
    sequence,
    currentFrame,
    selectedKeyframeIds,
    softSelectionEnabled,
    softSelectionRadius,
    softSelectionType,
    updateKeyframe,
    updateKeyframes,
    selectKeyframe,
    selectKeyframes,
    deselectAllKeys,
    setSoftSelection,
    setSoftSelectionType,
    setTangents,
    setGlobalInterpolation,
    deleteSelectedKeyframes,
    snapshot,
    replaceKeyframes,
    addKeyframe,
    onAfterMutate,
    bounceTension,
    bounceFriction,
    setTrackSelection,
    addTracksToSelection,
    scrub: {
      seek,
      setIsScrubbing,
      begin: scrubGesture.begin,
      end: scrubGesture.end,
    },
  };
};
