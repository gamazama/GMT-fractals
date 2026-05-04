import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGalleryStore } from './galleryStore';
import { useGalleryItems } from './useGalleryItems';
import { galleryEnabled, GalleryItem } from './GalleryClient';
import { loadGalleryScene } from './loadGalleryScene';
import { GalleryTile } from './GalleryTile';

export const GalleryPage: React.FC = () => {
  const isOpen      = useGalleryStore(s => s.isOpen);
  const closeGallery = useGalleryStore(s => s.closeGallery);
  const filter      = useGalleryStore(s => s.filter);

  const { items, loading, error } = useGalleryItems({ ...filter, limit: 60 });
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGallery();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeGallery]);

  if (!isOpen) return null;

  const handleTileClick = async (item: GalleryItem) => {
    if (loadingSlug) return;
    setLoadingSlug(item.slug);
    setLoadError(null);
    try {
      await loadGalleryScene(item);
      closeGallery();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingSlug(null);
    }
  };

  const featured = items.filter(i => i.featured);
  const rest     = items.filter(i => !i.featured);

  return createPortal(
    <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/40">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold text-white">Gallery</h1>
          <span className="text-[10px] text-gray-500">
            {loading ? 'loading…' : `${items.length} scene${items.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <button
          onClick={closeGallery}
          className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10"
        >
          Close (Esc)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!galleryEnabled && (
          <div className="text-sm text-gray-400 max-w-xl mx-auto mt-12 text-center">
            Gallery isn't configured for this build. Set <code className="text-cyan-300">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-cyan-300">VITE_SUPABASE_ANON_KEY</code> to enable it.
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 max-w-xl mx-auto mt-12 text-center">
            Failed to load gallery: {error.message}
          </div>
        )}

        {loadError && (
          <div className="text-xs text-red-400 max-w-xl mx-auto mb-4 text-center">
            Couldn't load scene: {loadError}
          </div>
        )}

        {!loading && !error && galleryEnabled && items.length === 0 && (
          <div className="text-sm text-gray-500 max-w-xl mx-auto mt-12 text-center">
            No scenes yet.
          </div>
        )}

        {featured.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Featured</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {featured.map(item => (
                <GalleryTile
                  key={item.id}
                  item={item}
                  busy={loadingSlug === item.slug}
                  onClick={() => handleTileClick(item)}
                />
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section>
            {featured.length > 0 && (
              <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">All scenes</h2>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {rest.map(item => (
                <GalleryTile
                  key={item.id}
                  item={item}
                  busy={loadingSlug === item.slug}
                  onClick={() => handleTileClick(item)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>,
    document.body,
  );
};
