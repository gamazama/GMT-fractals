/**
 * Load a gallery scene into the engine.
 *
 * Phase 2 path: read the GMF text from the row's `gmf_data` column. One
 * Supabase request, no image download needed.
 *
 * Phase 1 fallback: legacy rows store the GMF inside the PNG's iTXt chunk
 * with no separate gmf_data. We detect this (gmf_data null) and fetch the
 * image from R2, extract via the same pngMetadata helper that `Open Scene`
 * uses. Slow (full PNG download) but correct.
 */
import { extractMetadata } from '../../utils/pngMetadata';
import { loadGMFScene } from '../utils/FormulaFormat';
import { useEngineStore } from '../../store/engineStore';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { registry as gmtRegistry } from '../engine/FractalRegistry';
import { getGalleryItem, GalleryItem } from './GalleryClient';

async function gmfFromImageItxt(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch scene image (${res.status})`);
  const blob = await res.blob();
  // extractMetadata's signature takes File but only uses arrayBuffer().
  const file = new File([blob], 'gallery-scene.png', { type: 'image/png' });
  const gmf = await extractMetadata(file, 'FractalData');
  if (!gmf) throw new Error('No GMT scene data found in this image');
  return gmf;
}

export async function loadGalleryScene(item: GalleryItem): Promise<void> {
  // Re-fetch the row to populate gmf_data — listGallery omits the column
  // to keep browse responses small.
  let gmf: string | null = item.gmf_data ?? null;
  if (!gmf) {
    const full = await getGalleryItem(item.slug);
    gmf = full?.gmf_data ?? null;
  }
  if (!gmf) {
    // Legacy row (Phase 1): fall back to extracting from the PNG.
    gmf = await gmfFromImageItxt(item.image_url);
  }

  FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, 'Loading scene from gallery...');
  const { def, preset } = loadGMFScene(gmf);

  // Mirror SceneIO's parseScene: register the embedded formula def if it
  // isn't already in the registry, so workshop / Fragmentarium scenes load
  // cleanly even on a fresh runtime.
  if (def && !gmtRegistry.get(def.id)) {
    gmtRegistry.register(def);
    FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, {
      id: def.id,
      shader: def.shader,
    });
  }

  (useEngineStore.getState() as any).loadScene({ preset });
}
