/**
 * installGradientFileClaim — a gradient FILE dropped on a host's scene loader, or picked in its
 * File ▸ Load Scene, imports into My Gradients instead of failing as a scene (ADR-0123 Decision 3:
 * every gradient-file entrance goes through the one loader). Closes the plan's open item "a
 * gradient PNG dropped on app-gmt's SCENE loader toasts 'Couldn't read a scene'"
 * (`plans/gradient-file-format.md`).
 *
 * HOW. It registers a claim with the engine's generic seam (`engine/plugins/SceneFileClaims.ts`),
 * which the scene drop zone and Load Scene offer every file to first (in app-gmt Load Scene is
 * engine-gmt's partial-load row, `loadSceneWithFilter`; grep `claimSceneFiles(` for every entrance —
 * app-gmt's pre-boot LoadingScreen "Load From File…" is NOT one). The claim takes what
 * `importGradientFiles.takeFromSceneLoader` says is a gradient file and never a scene — read that
 * function for the exact rule (a scene-keyed PNG and any JSON that is not a GMT gradients document
 * stay the scene loader's). What it takes goes through `importGradientsInto` with NO group, which
 * is what app-gmt's own "Import gradient file…" (`FavientsCollectionMenu`, mounted in the shelf
 * with no `importGroup`) does: a document naming one set lands in that set, anything else in Kept,
 * a multi-set document merges. One undo step (`paramEdit`), the import's own sentence as a toast
 * (`importSummary`, as that menu flashes it), then the shelf is REVEALED where it lives
 * (`revealFavientsPanel`) so the import is seen — ADR-0123 Decision 4, the owner's "neither
 * appeared".
 *
 * WHO CALLS IT. app-gmt, in `app-gmt/main.tsx` beside `mountFavientsPanel()` — the host that mounts
 * `SceneFileDropZone`. Idempotent (the claim is keyed by id). A host that does not call it keeps
 * its scene loader exactly as it was. Lives in `palette/` and imports no app.
 *
 * Guards: the decision, `npm run test:gradient-file` [8]; the wiring in app-gmt (a synthetic
 * window drop and the Load Scene picker), `npm run smoke:gmt-gradientdrop`.
 */

import { registerSceneFileClaim } from '../engine/plugins/SceneFileClaims';
import { showToast } from '../engine/store/toastStore';
import {
  importGradientsInto,
  importSummary,
  isGradientFileName,
  readGradientFiles,
  takeFromSceneLoader,
  type ImportOutcome,
  type ReadGradientFile,
} from './core/importGradientFiles';
import { paramEdit } from './store/paramUndoBracket';
import { revealFavientsPanel } from './store/favientsPanelPersist';

export const GRADIENT_FILE_CLAIM_ID = 'palette.gradient-files';

export const installGradientFileClaim = (): void => {
  registerSceneFileClaim({
    id: GRADIENT_FILE_CLAIM_ID,
    // The host's drop scrim says so beside its scene formats (it read "Drop to load scene"
    // while this claim took gradient files — C20, 2026-09-24).
    hint: 'gradient files go to My Gradients',
    take: async (files) => {
      const named = files.filter((f) => isGradientFileName(f.name));
      if (!named.length) return files;
      // Read FIRST (async), then write inside ONE synchronous bracket (see importGradientFiles).
      const reads = await readGradientFiles(named);
      const taken = new Set<File>();
      const toImport: ReadGradientFile[] = [];
      named.forEach((f, i) => {
        const r = reads[i];
        if (r && takeFromSceneLoader(r)) {
          taken.add(f);
          toImport.push(r);
        }
      });
      if (!toImport.length) return files;
      let outcome: ImportOutcome = { imported: 0, skipped: 0 };
      paramEdit(() => { outcome = importGradientsInto(toImport); });
      showToast(importSummary(outcome), outcome.imported ? 'success' : 'info', 3500);
      if (outcome.destination !== undefined) revealFavientsPanel();
      return files.filter((f) => !taken.has(f));
    },
  });
};
