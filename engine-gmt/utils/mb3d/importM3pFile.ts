/**
 * Open a native file picker for a Mandelbulb3D `.m3p` scene and load it via the
 * fused-hybrid weave path (parse → emitFusedHybrid → loadScene). This is the
 * successor to the retired Import-Mandelbulb3D modal's file input — the modal's
 * text-paste + formula-library are gone (formulas live in the Weave editor; the
 * sample scenes live in the FormulaPicker's "Mandelbulb3D" catalog group).
 *
 * MUST be called from within a user gesture (a click handler): it synchronously
 * creates + clicks a hidden <input type=file>, which browsers only honour when
 * triggered by user activation.
 *
 * @see engine-gmt/components/FormulaPicker/mb3dCatalogGroup.ts (bundled scenes)
 */
import { loadMB3DSceneBytes } from './loadMB3DScene';
import { showToast } from '../../../engine/store/toastStore';

export function pickAndLoadM3pFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.m3p';
    input.style.display = 'none';
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) {
            file.arrayBuffer().then(
                (buf) => {
                    try {
                        const res = loadMB3DSceneBytes(new Uint8Array(buf), file.name.replace(/\.m3p$/i, ''));
                        if (res.ok) {
                            showToast(
                                `Loaded ${res.summary || file.name}. Camera, lighting and colour use GMT defaults.`,
                                'info', 6000,
                            );
                        } else {
                            showToast(res.reason || 'This Mandelbulb3D scene is not supported yet.', 'error', 7000);
                        }
                    } catch {
                        showToast(
                            "Couldn't read that .m3p file — it may be an unsupported (older / 64-bit) MB3D format.",
                            'error', 5000,
                        );
                    }
                },
                () => showToast('Could not read the file.', 'error', 4000),
            );
        }
        input.remove();
    });
    document.body.appendChild(input);
    input.click();
}
