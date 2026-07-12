/**
 * MB3D bundled-scene CATALOG group for the unified <FormulaPicker>.
 *
 * The retired Import-Mandelbulb3D modal's curated `.m3p` sample scenes live in
 * the picker's **Catalog** section (alongside Fragmentarium / DEC) as a
 * "Mandelbulb3D" group. Unlike frag/DEC (which open the Workshop), picking an
 * mb3d card LOADS the full weave scene live via `loadMB3DSceneBytes` (the same
 * path the modal used) — the commit routing branches on `source: 'mb3d'` in
 * FormulaSelect, which calls {@link loadMB3DCatalogScene}.
 *
 * @see engine-gmt/utils/mb3d/sampleScenes.ts (the bundled scenes)
 * @see engine-gmt/utils/mb3d/mb3dSceneThumbs.ts (thumbnail path helper)
 */
import type { CatalogGroup, CatalogItem } from './catalogGroups';
import { MB3D_SAMPLE_SCENES, decodeSampleScene } from '../../utils/mb3d/sampleScenes';
import { loadMB3DSceneBytes } from '../../utils/mb3d/loadMB3DScene';
import { mb3dSceneThumbSrc } from '../../utils/mb3d/mb3dSceneThumbs';
import { showToast } from '../../../engine/store/toastStore';

/** Sidebar category id for the MB3D catalog group (used to gate the picker's
 *  contextual "Import .m3p" footer button). */
export const MB3D_CATALOG_ID = 'catalog:mb3d';

let cached: CatalogGroup | null = null;

/** The "Mandelbulb3D" catalog group (memoized). Prepend it to the picker's
 *  `catalogGroups` so it leads the Catalog section. */
export function getMB3DCatalogGroup(): CatalogGroup {
    if (cached) return cached;
    const items: CatalogItem[] = MB3D_SAMPLE_SCENES.map<CatalogItem>((s) => ({
        id: s.name,
        name: s.name,
        source: 'mb3d',
        thumbSrc: mb3dSceneThumbSrc(s.name),
        // Formula weave (e.g. "ATetraVS → Menger3 → ABoxModKali") as the tooltip subtitle.
        category: s.formulas.join(' → '),
        artist: 'Mandelbulb3D',
    }));
    cached = { id: MB3D_CATALOG_ID, name: 'Mandelbulb3D', sectionLabel: 'Catalog', items };
    return cached;
}

/** Load a bundled MB3D scene by its catalog id (= the scene name). Fired by the
 *  picker's `{action:'catalog', source:'mb3d'}` commit. */
export function loadMB3DCatalogScene(id: string): void {
    const scene = MB3D_SAMPLE_SCENES.find((s) => s.name === id);
    if (!scene) { showToast(`Unknown Mandelbulb3D scene "${id}".`, 'error', 5000); return; }
    try {
        const res = loadMB3DSceneBytes(decodeSampleScene(scene.b64), scene.name);
        if (res.ok) {
            showToast(
                `Loaded ${res.summary || scene.name}. Camera, lighting and colour use GMT defaults.`,
                'info', 6000,
            );
        } else {
            showToast(res.reason || `Couldn't load "${scene.name}".`, 'error', 7000);
        }
    } catch {
        showToast(`Couldn't load "${scene.name}".`, 'error', 4000);
    }
}
