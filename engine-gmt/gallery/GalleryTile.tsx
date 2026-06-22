import React, { useState } from 'react';
import { GalleryItem, GALLERY_FEATURED_BADGE } from './GalleryClient';

interface Props {
  item: GalleryItem;
  onClick: () => void;
  busy?: boolean;
}

export const GalleryTile = React.memo(({ item, onClick, busy }: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`group relative flex flex-col text-left rounded-lg overflow-hidden bg-line/[0.03] border border-line/10 hover:border-accent-500/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${busy ? 'opacity-50 pointer-events-none' : ''}`}
      title={item.title}
    >
      <div className="relative aspect-square bg-surface-section">
        {!errored && (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {!loaded && !errored && (
          <div className="absolute inset-0 animate-pulse bg-line/[0.02]" />
        )}
        {errored && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-fg-faint">
            preview unavailable
          </div>
        )}
        {item.featured && (
          <span className={`absolute top-1.5 left-1.5 text-[8px] px-1.5 py-0.5 rounded ${GALLERY_FEATURED_BADGE} backdrop-blur-sm`}>
            FEATURED
          </span>
        )}
      </div>
      <div className="px-2.5 py-2 flex flex-col gap-0.5">
        <div className="text-[11px] font-bold text-fg group-hover:text-accent-300 transition-colors truncate">
          {item.title}
        </div>
        <div className="text-[9px] text-fg-dim truncate">{item.formula}</div>
      </div>
    </button>
  );
});

GalleryTile.displayName = 'GalleryTile';
