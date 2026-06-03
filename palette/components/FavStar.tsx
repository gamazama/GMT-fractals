/**
 * FavStar — a reusable favourite toggle for a gradient result. Outline ☆ when the
 * gradient isn't in the Favients shelf, filled ★ when it is; clicking toggles. On
 * favouriting it gives a brief scale "pop" (the "star appears shortly when clicked"
 * affordance). Shared by the Generator + Image result strips; identity is the
 * gradient's content signature, so editing the result resets the star.
 */

import React, { useMemo, useState } from 'react';
import type { GradientConfig } from '../../types';
import { useFavientsStore, favientSig } from '../store/favientsStore';

interface FavStarProps {
  config: GradientConfig;
  name: string;
  source?: string;
  /** Larger hit area / glyph for hero results. */
  size?: 'sm' | 'md';
  className?: string;
}

export const FavStar: React.FC<FavStarProps> = ({ config, name, source, size = 'md', className = '' }) => {
  const favients = useFavientsStore((s) => s.favients);
  const toggle = useFavientsStore((s) => s.toggle);
  const sig = useMemo(() => favientSig(config), [config]);
  const isFav = useMemo(() => favients.some((f) => favientSig(f.config) === sig), [favients, sig]);
  const [pop, setPop] = useState(false);

  const onClick = () => {
    const nowFav = toggle(config, name, source);
    if (nowFav) {
      setPop(true);
      window.setTimeout(() => setPop(false), 380);
    }
  };

  const glyph = size === 'sm' ? 'text-[13px]' : 'text-base';
  return (
    <button
      onClick={onClick}
      title={isFav ? 'Remove from Favients' : 'Add to Favients'}
      aria-pressed={isFav}
      className={`leading-none ${glyph} transition-transform duration-200 ${
        pop ? 'scale-150' : 'scale-100'
      } ${isFav ? 'text-amber-300 drop-shadow-[0_0_4px_rgba(252,211,77,0.5)]' : 'text-gray-500 hover:text-amber-200'} ${className}`}
    >
      {isFav ? '★' : '☆'}
    </button>
  );
};

export default FavStar;
