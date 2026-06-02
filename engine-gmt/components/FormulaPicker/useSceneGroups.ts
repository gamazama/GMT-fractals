/**
 * useSceneGroups — builds the `extraGroups` array consumed by FormulaPicker.
 *
 * Both groups read from the same Supabase `gallery_items` table — they're
 * just different views of the online gallery:
 *   - Curated Gallery — `listGallery({ limit, offset })`: the public
 *     approved gallery feed (most-recent first), paginated via the
 *     group's `loadMore` button.
 *   - My Submissions — `listMySubmissions(profile.id)`: the signed-in
 *     user's own submissions across all statuses (pending / approved /
 *     rejected) and visibilities. Empty when signed out. Not paginated
 *     — the per-user list is bounded by tier slot caps.
 *
 * Both onSelect paths use the existing `loadGalleryScene(item)` helper —
 * it handles `gmf_data` fetch, the Phase-1 iTXt fallback for legacy rows,
 * env-map injection from `sky_url`, formula registration, and the final
 * `engineStore.loadScene` call. For my-submission rows that aren't yet
 * approved, `getMySubmissionData(id, userId)` pre-fetches `gmf_data` so
 * the approval-filtered fallback inside loadGalleryScene works.
 *
 * NOTE: the static `./gmf/gallery.json` file (Fragmentarium bundled
 * scenes) is intentionally NOT surfaced here. That file is a separate
 * future entry-point for bundled .gmf files; if we ever want to surface
 * it in the picker we can add a third group with a different loader.
 *
 * @see dev/engine-gmt/gallery/loadGalleryScene.ts
 * @see dev/engine-gmt/gallery/GalleryClient.ts (listGallery, listMySubmissions)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../auth/authStore';
import {
    listGallery, listMySubmissions, getMySubmissionData,
    type GalleryItem,
} from '../../gallery/GalleryClient';
import { loadGalleryScene } from '../../gallery/loadGalleryScene';
import type { SceneGroup, SceneItem } from './sceneGroups';

/** Page size for the curated gallery. Smaller than the gallery overlay's
 *  default to keep the picker grid scannable; user clicks "Load more" for
 *  the next page. */
const CURATED_PAGE_SIZE = 24;

export interface UseSceneGroupsOptions {
    /** Override the default per-item onSelect. Receives the underlying
     *  GalleryItem (with `gmf_data` pre-fetched via the owner-scoped helper
     *  for non-approved my-submission rows). Default — when omitted — is
     *  `loadGalleryScene(item)`: the full scene load path used by the main
     *  formula picker. Wizards override to repurpose the scene browse for
     *  e.g. shading-source extraction. */
    onPick?: (item: GalleryItem) => void | Promise<void>;
}

export function useSceneGroups(opts: UseSceneGroupsOptions = {}): SceneGroup[] {
    const profile = useAuthStore(s => s.profile);

    const [curated, setCurated] = useState<GalleryItem[]>([]);
    const [curatedLoading, setCuratedLoading] = useState(false);
    const [curatedLoadingMore, setCuratedLoadingMore] = useState(false);
    const [curatedHasMore, setCuratedHasMore] = useState(false);
    const [curatedError, setCuratedError] = useState<string | null>(null);
    // Guard against duplicate concurrent loadMore() calls (button-mash,
    // double-click). Cleared as soon as the in-flight fetch resolves.
    const curatedFetchInFlight = useRef(false);

    const [submissions, setSubmissions] = useState<GalleryItem[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [submissionsError, setSubmissionsError] = useState<string | null>(null);

    // First-page fetch on mount.
    useEffect(() => {
        let cancelled = false;
        setCuratedLoading(true);
        setCuratedError(null);
        curatedFetchInFlight.current = true;
        listGallery({ limit: CURATED_PAGE_SIZE, offset: 0, publicOnly: true })
            .then(items => {
                if (cancelled) return;
                setCurated(items);
                setCuratedHasMore(items.length === CURATED_PAGE_SIZE);
            })
            .catch(err => {
                if (cancelled) return;
                setCurated([]);
                setCuratedHasMore(false);
                setCuratedError(err instanceof Error ? err.message : String(err));
            })
            .finally(() => {
                curatedFetchInFlight.current = false;
                if (!cancelled) setCuratedLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const loadMoreCurated = useCallback(async () => {
        if (curatedFetchInFlight.current) return;
        if (!curatedHasMore) return;
        curatedFetchInFlight.current = true;
        setCuratedLoadingMore(true);
        try {
            const offset = curated.length;
            const next = await listGallery({ limit: CURATED_PAGE_SIZE, offset, publicOnly: true });
            setCurated(prev => [...prev, ...next]);
            setCuratedHasMore(next.length === CURATED_PAGE_SIZE);
        } catch (err) {
            setCuratedError(err instanceof Error ? err.message : String(err));
            setCuratedHasMore(false);
        } finally {
            curatedFetchInFlight.current = false;
            setCuratedLoadingMore(false);
        }
    }, [curated.length, curatedHasMore]);

    // My Submissions — refetched when the signed-in profile id changes.
    useEffect(() => {
        let cancelled = false;
        if (!profile?.id) {
            setSubmissions([]);
            return;
        }
        setSubmissionsLoading(true);
        setSubmissionsError(null);
        listMySubmissions(profile.id)
            .then(items => { if (!cancelled) setSubmissions(items); })
            .catch(err => {
                if (cancelled) return;
                setSubmissions([]);
                setSubmissionsError(err instanceof Error ? err.message : String(err));
            })
            .finally(() => { if (!cancelled) setSubmissionsLoading(false); });
        return () => { cancelled = true; };
    }, [profile?.id]);

    const pickHandler = opts.onPick;
    return useMemo<SceneGroup[]>(() => {
        // Default path: full scene load via loadGalleryScene. Override path:
        // call caller's onPick with the fetched GalleryItem. The pre-fetch
        // of gmf_data for non-approved my-submission rows applies to BOTH
        // paths — without it, downstream code would see gmf_data: null.
        const pickCurated = (item: GalleryItem) => pickHandler
            ? pickHandler(item)
            : loadGalleryScene(item);
        const pickMySub = async (item: GalleryItem) => {
            let effective = item;
            if (!item.gmf_data && profile?.id) {
                const gmf = await getMySubmissionData(item.id, profile.id);
                // Null means the row is gone or no longer readable (deleted
                // between list and click). Fail loudly instead of falling
                // through to loadGalleryScene, which would chase the public
                // approved-only refetch and then the iTXt image fallback and
                // surface a misleading "no scene data in image" error.
                if (gmf == null) {
                    throw new Error('Could not load this submission — it may have been removed. Try refreshing.');
                }
                effective = { ...item, gmf_data: gmf };
            }
            return pickHandler ? pickHandler(effective) : loadGalleryScene(effective);
        };

        const curatedGroup: SceneGroup = {
            id: 'curated',
            name: 'Curated Gallery',
            isLoading: curatedLoading,
            hasMore: curatedHasMore,
            isLoadingMore: curatedLoadingMore,
            loadMore: loadMoreCurated,
            emptyMessage: curatedError
                ?? 'No scenes in the gallery yet — check back later.',
            items: curated.map<SceneItem>(item => ({
                id: `curated:${item.id}`,
                name: item.title,
                description: item.description ?? undefined,
                thumbnailUrl: item.thumbnail_url,
                onSelect: () => pickCurated(item),
            })),
        };

        const mySubmissions: SceneGroup = {
            id: 'my-submissions',
            name: 'My Submissions',
            isLoading: submissionsLoading,
            emptyMessage: profile?.id
                ? (submissionsError
                    ?? 'No submissions yet — submit a scene from the Gallery overlay.')
                : 'Sign in to see your submissions.',
            items: submissions.map<SceneItem>(item => ({
                id: `sub:${item.id}`,
                name: item.title,
                description: item.description ?? undefined,
                thumbnailUrl: item.thumbnail_url,
                badge: item.status === 'pending'
                        ? { text: 'pending', className: 'bg-amber-500/20 text-amber-300' }
                    : item.status === 'rejected'
                        ? { text: 'rejected', className: 'bg-gray-700/40 text-gray-400' }
                    : item.visibility === 'private'
                        ? { text: 'private', className: 'bg-purple-500/20 text-purple-300' }
                        : undefined,
                onSelect: () => pickMySub(item),
            })),
        };

        return [curatedGroup, mySubmissions];
    }, [
        curated, curatedLoading, curatedLoadingMore, curatedHasMore, curatedError,
        loadMoreCurated,
        submissions, submissionsLoading, submissionsError,
        profile?.id,
        pickHandler,
    ]);
}
