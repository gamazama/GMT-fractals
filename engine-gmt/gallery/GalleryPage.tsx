import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGalleryStore } from './galleryStore';
import { useGalleryItems } from './useGalleryItems';
import { galleryEnabled, GalleryItem } from './GalleryClient';
import { loadGalleryScene } from './loadGalleryScene';
import { GalleryTile } from './GalleryTile';
import { Lightbox } from './Lightbox';

export const GalleryPage: React.FC = () => {
  const isOpen       = useGalleryStore(s => s.isOpen);
  const closeGallery = useGalleryStore(s => s.closeGallery);
  const filter       = useGalleryStore(s => s.filter);

  const { items, loading, error } = useGalleryItems({ ...filter, limit: 60 });
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [loadingItem, setLoadingItem]   = useState<GalleryItem | null>(null);
  const [loadError, setLoadError]       = useState<string | null>(null);

  // Gallery Esc — only fires when lightbox isn't open. Lightbox owns its
  // own Esc handler at capture phase to keep the chain right.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selectedItem) closeGallery();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeGallery, selectedItem]);

  if (!isOpen) return null;

  const openLightbox = (item: GalleryItem) => {
    setSelectedItem(item);
    setLoadError(null);
  };

  const closeLightbox = () => {
    setSelectedItem(null);
    setLoadError(null);
  };

  const handleLoadScene = async (item: GalleryItem) => {
    if (loadingItem) return;
    setLoadingItem(item);
    setLoadError(null);
    try {
      await loadGalleryScene(item);
      // Loaded successfully — close both lightbox and gallery to drop the
      // user back to the viewport so they can see / interact with the scene.
      closeLightbox();
      closeGallery();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingItem(null);
    }
  };

  const featured = items.filter(i => i.featured);
  const rest     = items.filter(i => !i.featured);

  return createPortal(
    <>
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
                    onClick={() => openLightbox(item)}
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
                    onClick={() => openLightbox(item)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {selectedItem && (
        <Lightbox
          item={selectedItem}
          items={items}
          loading={loadingItem?.id === selectedItem.id}
          loadError={loadError}
          onClose={closeLightbox}
          onLoadScene={handleLoadScene}
          onNavigate={openLightbox}
        />
      )}
    </>,
    document.body,
  );
};
