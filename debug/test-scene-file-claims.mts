/**
 * test-scene-file-claims — the engine seam a scene entrance offers files through before its scene
 * loader (`engine/plugins/SceneFileClaims.ts`). Plain node, sub-second, no store, no DOM.
 *
 * Run: `npm run test:scene-file-claims`.
 *
 *   [1] no claim registered: `claimSceneFiles` hands back the very array it was given, so an app
 *       that registers nothing behaves exactly as before the seam;
 *   [2] claims run in registration order, each offered only what the previous one left;
 *   [3] a claim can only REMOVE files: one that resolves to extra, duplicated or substituted files
 *       leaves exactly the offered files, in offer order;
 *   [4] a claim that throws takes nothing — the call does not reject, and the next claim (and so
 *       the scene loader) still sees every file;
 *   [5] re-registering an id replaces the claim in place (it keeps its turn), and an unregister
 *       thunk removes it.
 *
 * What this does NOT reach: the entrances. `SceneFileDropZone` awaiting the claims before its scene
 * path, and SceneIO's Load Scene returning early when a claim took the file, are browser wiring —
 * guarded by the app that registers a claim (grep `SceneFileDropZone` in `debug/`).
 *
 * FALSIFIED 2026-09-16 against `engine/plugins/SceneFileClaims.ts`, each break made by a script,
 * the run red (exit 1), the file restored byte for byte, green again:
 *   - `let rest = files.slice()` (a copy even with no claim) → 2 red, [1] and [5];
 *   - iterating the claims in reverse → 3 red, both [2] and [5];
 *   - `rest = await claim.take(...)` without the intersection → 1 red, [3];
 *   - the `catch` removed (a throw propagates) → 2 red, both [4].
 */

let failures = 0;
const ok = (cond: boolean, msg: string): void => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};

const { claimSceneFiles, registerSceneFileClaim, unregisterSceneFileClaim } = await import('../engine/plugins/SceneFileClaims');

const fa = new File(['a'], 'a.png');
const fb = new File(['b'], 'b.zip');
const fc = new File(['c'], 'c.gmf');
const offered = [fa, fb, fc];
const names = (fs: File[]) => fs.map((f) => f.name).join();

console.log('[1] no claim');
{
  const r = await claimSceneFiles(offered);
  ok(r === offered, '[1] no claim: the same array comes back');
  ok(names(offered) === 'a.png,b.zip,c.gmf', '[1] the input is not mutated');
}

console.log('[2] order');
{
  const log: string[] = [];
  const u1 = registerSceneFileClaim({ id: 't1', take: async (fs) => { log.push(`t1:${names(fs)}`); return fs.filter((f) => f !== fa); } });
  const u2 = registerSceneFileClaim({ id: 't2', take: async (fs) => { log.push(`t2:${names(fs)}`); return fs.filter((f) => f !== fb); } });
  const r = await claimSceneFiles(offered);
  ok(JSON.stringify(log) === JSON.stringify(['t1:a.png,b.zip,c.gmf', 't2:b.zip,c.gmf']) && r.length === 1 && r[0] === fc,
    `[2] claims run in registration order, each on what the previous one left (${JSON.stringify(log)} → ${names(r)})`);
  u1(); u2();
  const log2: string[] = [];
  const u3 = registerSceneFileClaim({ id: 'all', take: async () => { log2.push('all'); return []; } });
  const u4 = registerSceneFileClaim({ id: 'late', take: async (fs) => { log2.push('late'); return fs; } });
  const r2 = await claimSceneFiles(offered);
  ok(r2.length === 0 && JSON.stringify(log2) === '["all"]', `[2] once every file is taken, later claims are not asked (${JSON.stringify(log2)})`);
  u3(); u4();
}

console.log('[3] only removal');
{
  const u = registerSceneFileClaim({ id: 'adder', take: async (fs) => [new File(['x'], 'a.png'), fs[2], ...fs, fs[0]] });
  const r = await claimSceneFiles(offered);
  ok(r.length === 3 && r.every((f, i) => f === offered[i]), `[3] a claim cannot add or substitute a file (${names(r)})`);
  u();
}

console.log('[4] a throwing claim');
{
  let seen = -1;
  const u1 = registerSceneFileClaim({ id: 'thrower', take: async () => { throw new Error('planted'); } });
  const u2 = registerSceneFileClaim({ id: 'after', take: async (fs) => { seen = fs.length; return fs; } });
  const quiet = console.error;
  let logged = '';
  console.error = (...a: unknown[]) => { logged += a.map(String).join(' '); };
  let r: File[] = [];
  let rejected = false;
  try { r = await claimSceneFiles(offered); } catch { rejected = true; } finally { console.error = quiet; }
  ok(!rejected && r.length === 3 && seen === 3, `[4] a throwing claim takes nothing: its files reach the next claim and the scene loader (${r.length} left, next saw ${seen})`);
  ok(logged.includes('thrower'), '[4] the failure is logged under the claim\'s id');
  u1(); u2();
}

console.log('[5] registration');
{
  const log: string[] = [];
  registerSceneFileClaim({ id: 'first', take: async (fs) => { log.push('first v1'); return fs; } });
  registerSceneFileClaim({ id: 'second', take: async (fs) => { log.push('second'); return fs; } });
  registerSceneFileClaim({ id: 'first', take: async (fs) => { log.push('first v2'); return fs; } });
  await claimSceneFiles(offered);
  ok(JSON.stringify(log) === '["first v2","second"]', `[5] re-registering an id replaces it in place, keeping its turn (${JSON.stringify(log)})`);
  unregisterSceneFileClaim('first');
  unregisterSceneFileClaim('second');
  ok((await claimSceneFiles(offered)) === offered, '[5] unregistering every claim restores the no-claim path');
}

console.log(failures === 0 ? '\nPASS test-scene-file-claims' : `\nFAIL test-scene-file-claims (${failures})`);
process.exit(failures === 0 ? 0 : 1);
