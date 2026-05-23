import { useEffect, useState } from 'react';
import { listGallery, GalleryItem, ListGalleryOpts } from './GalleryClient';
import { useGalleryStore } from './galleryStore';

interface UseGalleryItemsResult {
  items: GalleryItem[];
  loading: boolean;
  error: Error | null;
}

export function useGalleryItems(opts: ListGalleryOpts): UseGalleryItemsResult {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stringify so the dep is stable when the parent re-renders with the same
  // logical filter object.
  const key = JSON.stringify(opts);

  // Bumped after submit/approve/delete to force a refetch without reload.
  const refreshTick = useGalleryStore((s) => s.refreshTick);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listGallery(opts)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshTick]);

  return { items, loading, error };
}
