/**
 * First-run brightness harness — the shell may ask a NEW user how bright the interface
 * should be, and must never ask, or override, anyone else.
 *
 * The rule worth pinning is the last one, because it was already wrong and nobody saw it:
 * the silent seed this replaced applied Light Grey whenever its own seed key was unset,
 * which on a user's first v2 boot overwrote a brightness they had already chosen in
 * app-gmt. The theme axes are SHARED across the GMT apps, so "this app has not booted here"
 * is NOT the same question as "this person has not chosen", and the old code conflated
 * them. Invisible when it happened, and it looked like the app ignoring a setting.
 *
 *   [1] a genuinely new browser is asked
 *   [2] a browser that has already been asked is not asked again
 *   [3] an app-gmt user keeps their brightness — not asked, not overridden
 *   [4] ...for ANY stored value, including ones a sloppy test would treat as absent
 *
 * [4] exists because "has this person chosen" must be a NULL test, not a truthiness one:
 * the only thing that means "never chosen" is the key being absent. It pins the empty
 * string, which is the case that actually separates the two — an empty stored value is
 * odd, but it is still a value, and treating it as absent would re-run the seed over it.
 *
 * Note what does NOT distinguish them, since the first draft of this file claimed it did:
 * a chosen brightness of "0" (full Dark). It reads like the classic falsy-zero trap, but
 * `safeLocalGet` returns strings and "0" is a non-empty string, so truthiness passes it
 * too. It is kept below as a plain regression case, not as a discriminator.
 *
 * Falsified 2026-09-09, each independently:
 *   [1] `return 'ask'` → `return 'quiet'`                    ✗ "a new browser is asked"
 *   [2] dropping the `seeded` guard                          ✗ "a returning browser is not asked again"
 *   [3+4] `chosenBrightness !== null` → `chosenBrightness`    ✗ "an empty stored value still counts"
 *
 * Run: `npx tsx debug/test-ge-first-run.mts`
 */
import { decideFirstRun } from '../gradient-explorer/v2/firstRunDecision';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else { console.log('  ✓ ' + msg); }
};

console.log('[1] a genuinely new browser is asked');
ok(decideFirstRun({ seeded: false, chosenBrightness: null }) === 'ask', 'a new browser is asked');

console.log('[2] a browser that has already been asked is not asked again');
ok(decideFirstRun({ seeded: true, chosenBrightness: null }) === 'quiet', 'a returning browser is not asked again');
ok(decideFirstRun({ seeded: true, chosenBrightness: '81' }) === 'quiet', '...whatever it chose');

console.log('[3] an app-gmt user keeps their brightness');
ok(decideFirstRun({ seeded: false, chosenBrightness: '42' }) === 'quiet', 'an app-gmt user keeps their brightness');

console.log('[4] ...for any stored value, including ones a sloppy test would treat as absent');
ok(decideFirstRun({ seeded: false, chosenBrightness: '0' }) === 'quiet', 'a full-Dark user is not asked or reset');
ok(decideFirstRun({ seeded: false, chosenBrightness: '' }) === 'quiet', 'an empty stored value still counts');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
