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

export function useSceneGroups(): SceneGroup[] {
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
        listGallery({ limit: CURATED_PAGE_SIZE, offset: 0 })
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
            const next = await listGallery({ limit: CURATED_PAGE_SIZE, offset });
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

    return useMemo<SceneGroup[]>(() => {
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
                onSelect: () => loadGalleryScene(item),
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
                onSelect: async () => {
                    // For pending / rejected rows, `getGalleryItem` (used
                    // inside loadGalleryScene) won't return the row because
                    // it filters `status = 'approved'`. Pre-fetch via the
                    // owner-scoped helper and inject before delegating.
                    if (!item.gmf_data && profile?.id) {
                        const gmf = await getMySubmissionData(item.id, profile.id);
                        return loadGalleryScene({ ...item, gmf_data: gmf });
                    }
                    return loadGalleryScene(item);
                },
            })),
        };

        return [curatedGroup, mySubmissions];
    }, [
        curated, curatedLoading, curatedLoadingMore, curatedHasMore, curatedError,
        loadMoreCurated,
        submissions, submissionsLoading, submissionsError,
        profile?.id,
    ]);
}
