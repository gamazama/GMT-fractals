/**
 * Fetch a gallery PNG from R2, extract its embedded GMF, and load the scene
 * into the engine. The PNG carries the full scene (formula shader + preset)
 * via the existing GMT save pipeline, so loading is symmetric with the
 * "Load Scene" file menu item.
 */
import { extractMetadata } from '../../utils/pngMetadata';
import { loadGMFScene } from '../utils/FormulaFormat';
import { useEngineStore } from '../../store/engineStore';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { registry as gmtRegistry } from '../engine/FractalRegistry';

export async function loadGalleryScene(imageUrl: string): Promise<void> {
  const res = await fetch(imageUrl, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch scene image (${res.status})`);
  const blob = await res.blob();

  // extractMetadata's signature takes File but only uses arrayBuffer() — wrap to satisfy TS.
  const file = new File([blob], 'gallery-scene.png', { type: 'image/png' });
  const gmf = await extractMetadata(file, 'FractalData');
  if (!gmf) throw new Error('No GMT scene data found in this image');

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
