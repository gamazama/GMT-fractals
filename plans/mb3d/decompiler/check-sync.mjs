#!/usr/bin/env node
/**
 * MB3D decompiler drift guard.
 *
 * The canonical decompiler lives OUTSIDE the repo at `H:/tmp/mb3d-decomp/` (it carries a
 * `node_modules/capstone-wasm` the repo copy lacks, so edits + library regeneration happen
 * there). The repo snapshot at `plans/mb3d/decompiler/{decompile,xcheck}.mjs` is what reproduces
 * the committed `engine-gmt/utils/mb3d/decompiled-formulas.ts`. Twice now the canonical copy was
 * edited and the repo copy was NOT updated, so a later regeneration from the repo silently
 * REVERTED a shipped fix (Phase 7 `shr ah`, Phase 8 `inc [mem]`). This guard makes that drift a
 * hard failure instead of a silent regression.
 *
 * Usage: `npm run check:mb3d-decompiler`
 *   - canonical present + matches  → exit 0 (in sync)
 *   - canonical present + differs   → exit 1 (DRIFTED — copy /h/tmp → plans/ before committing)
 *   - canonical absent (other box)  → exit 0 with a warning (can't verify; not a failure)
 * Override the canonical location with MB3D_DECOMP_CANONICAL=<dir>.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = dirname(fileURLToPath(import.meta.url));
const canonicalDir = process.env.MB3D_DECOMP_CANONICAL || 'H:/tmp/mb3d-decomp';
// All four decompiler scripts that, when edited at the canonical copy, must be copied back:
// the two emitters (decompile/xcheck) AND the two cross-check harnesses (generate-library
// regenerates decompiled-formulas.ts; corpus-check is the 279/0 gate). U1/U6 touch all four.
const FILES = ['decompile.mjs', 'xcheck.mjs', 'generate-library.mjs', 'corpus-check.mjs'];

if (!existsSync(canonicalDir)) {
  console.warn(
    `[check:mb3d-decompiler] canonical dir not found (${canonicalDir}); skipping drift check.\n` +
    `  Set MB3D_DECOMP_CANONICAL if it lives elsewhere. This is not a failure — the repo copy is authoritative here.`,
  );
  process.exit(0);
}

let drifted = false;
for (const f of FILES) {
  const repoPath = join(repoDir, f);
  const canonPath = join(canonicalDir, f);
  if (!existsSync(canonPath)) {
    console.error(`[check:mb3d-decompiler] MISSING in canonical: ${canonPath}`);
    drifted = true;
    continue;
  }
  const a = readFileSync(repoPath, 'utf8');
  const b = readFileSync(canonPath, 'utf8');
  if (a === b) {
    console.log(`[check:mb3d-decompiler] ${f}: IN SYNC`);
  } else {
    console.error(
      `[check:mb3d-decompiler] ${f}: DRIFTED — repo copy ≠ canonical (${canonPath}).\n` +
      `  The canonical copy is authoritative. Run:  cp "${canonPath}" "${repoPath}"  then re-commit.`,
    );
    drifted = true;
  }
}

if (drifted) {
  console.error('\n[check:mb3d-decompiler] FAIL: decompiler drift detected. See messages above.');
  process.exit(1);
}
console.log('[check:mb3d-decompiler] OK: repo decompiler matches canonical.');
