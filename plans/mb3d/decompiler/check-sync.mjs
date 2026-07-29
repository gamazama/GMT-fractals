#!/usr/bin/env node
/**
 * MB3D decompiler drift guard.
 *
 * The canonical decompiler lives OUTSIDE the repo at `H:/GMT/stuff/mb3d-decomp/` (it carries a
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
 *
 * ── Scan-path notes (hand-verified, guard sweep cycle 13) ──────────────────────
 * `check:rule-guards` cannot import-check this script — it reads its targets as
 * text — so its file list is only as good as the last person to read it. Two
 * things that audit changed:
 *
 * 1. `gen-sample-scenes.mjs` was NOT in FILES, and it is the same class as
 *    `generate-library.mjs`: it regenerates a COMMITTED artifact
 *    (`engine-gmt/utils/mb3d/sampleScenes.ts`), so canonical-vs-repo drift there
 *    silently reverts shipped output — the exact failure this guard exists to
 *    stop. Verified by editing it in the repo copy: the guard stayed green, exit
 *    0. It is now covered.
 * 2. Comparison is EOL-INSENSITIVE. This repo sets `core.autocrlf=true`, so a
 *    plain `git checkout` rewrites these files CRLF while the canonical copy
 *    stays LF, and a byte-exact compare would then report all of them DRIFTED
 *    with no content difference at all — and the printed remedy (copy canonical
 *    over the repo copy) would not stick, because the next checkout re-converts.
 *    That was not hypothetical: `gen-sample-scenes.mjs` was sitting at CRLF
 *    against an LF canonical when this was written, differing by exactly its 55
 *    line endings and nothing else. `.gitattributes` now pins this directory to
 *    LF (same fix, and same reasoning, as the `debug/compat-snapshot.jsonl` entry
 *    already there for `test:compat`); normalising here too means a stray CRLF
 *    cannot produce a false red. EOL-only differences are reported, not hidden.
 *
 * Still true and still intentional: a MISSING canonical dir exits 0. That is the
 * "other box" case — but it does mean this guard is a silent no-op wherever the
 * external tree is absent or has been moved, so treat a run that prints the
 * skip warning as "not checked", never as "in sync".
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = dirname(fileURLToPath(import.meta.url));
const canonicalDir = process.env.MB3D_DECOMP_CANONICAL || 'H:/GMT/stuff/mb3d-decomp';
// All four decompiler scripts that, when edited at the canonical copy, must be copied back:
// the two emitters (decompile/xcheck) AND the two cross-check harnesses (generate-library
// regenerates decompiled-formulas.ts; corpus-check is the 279/0 gate). U1/U6 touch all four.
// gen-sample-scenes.mjs joins them: it regenerates the committed
// engine-gmt/utils/mb3d/sampleScenes.ts, so drift there reverts shipped output too.
const FILES = ['decompile.mjs', 'xcheck.mjs', 'generate-library.mjs', 'corpus-check.mjs',
  'gen-sample-scenes.mjs'];

/** Compare ignoring line endings — see the EOL note in the header. */
const normalise = (s) => s.replace(/\r\n/g, '\n');

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
  if (!existsSync(repoPath)) {
    console.error(
      `[check:mb3d-decompiler] MISSING in repo: ${repoPath}\n` +
      `  FILES lists a file the repo snapshot does not have — copy it from ${canonPath}.`,
    );
    drifted = true;
    continue;
  }
  const a = readFileSync(repoPath, 'utf8');
  const b = readFileSync(canonPath, 'utf8');
  if (normalise(a) === normalise(b)) {
    const eolOnly = a !== b;
    console.log(`[check:mb3d-decompiler] ${f}: IN SYNC${eolOnly ? ' (line endings differ only — repo copy is not LF; check .gitattributes)' : ''}`);
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
