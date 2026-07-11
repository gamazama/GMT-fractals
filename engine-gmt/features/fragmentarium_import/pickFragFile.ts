/**
 * Open a native file picker for a Fragmentarium `.frag` (or `.glsl`/`.txt`) file
 * and load its GLSL into the Formula Workshop editor. This lifts the Workshop's
 * own (previously buried) load-file command so it can be triggered from the
 * FormulaPicker footer (when the Fragmentarium catalog category is active) and
 * the File-menu Import section — mirroring the MB3D `.m3p` picker.
 *
 * MUST be called from within a user gesture (a click handler): it synchronously
 * creates + clicks a hidden <input type=file>.
 *
 * @see engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx (initialSource)
 * @see store openWorkshopWithSource
 */
import { useEngineStore } from '../../../store/engineStore';

export function pickAndLoadFragFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.frag,.glsl,.txt';
    input.style.display = 'none';
    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const content = ev.target?.result as string;
                if (content) {
                    const name = file.name.replace(/\.(frag|glsl|txt)$/i, '');
                    (useEngineStore.getState() as any).openWorkshopWithSource(content, name);
                }
            };
            reader.readAsText(file);
        }
        input.remove();
    });
    document.body.appendChild(input);
    input.click();
}
