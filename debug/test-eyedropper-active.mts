/**
 * Eyedropper-active harness — a screen pick must always END.
 *
 * The eyedropper samples what is PAINTED, so GE v2's hero drops the dimmed, 84 px treatment
 * on its source image for the duration of a pick (§8b item 8). The whole risk in that is
 * the flag getting stuck ON: the image would then stay large and full-colour forever,
 * silently contradicting "this is no longer what you see", and nothing would look broken
 * enough to investigate.
 *
 * The way it gets stuck is the ordinary one — the native EyeDropper REJECTS when the user
 * cancels, which is the common path, not the exceptional one. Press Escape instead of
 * clicking and a `catch` that only wraps the await, with the clear after it, never runs.
 *
 *   [1] the flag starts off, and set/clear move it
 *   [2] it is a flag, not a counter — two sets still take one clear
 *   [3] it is one shared value, not per-importer state
 *   [4] the picker clears the flag in a `finally`, so a CANCELLED pick still ends it
 *
 * [4] reads the picker's source, which is weak, but the alternative is driving a native
 * browser dialogue that needs a user gesture. It pins the exact shape that fails.
 *
 * NOT pinned, deliberately: that `setEyedropperActive` only notifies subscribers on a real
 * change. The module exposes its subscription solely through the hook, so emissions are not
 * observable from here — the first draft of [2] claimed to test it and did not, since
 * re-reading the value passes whether or not a notification fired. It is an optimisation
 * rather than a contract, and widening the module's API to prove one would cost more than
 * it is worth.
 *
 * Falsified 2026-09-09, each independently:
 *   [1] `active = on` → `active = true`            ✗ "clearing it turns it off"
 *   [4] `finally {` → `}` after the catch block     ✗ "the picker clears the flag in a finally"
 *
 * Run: `npx tsx debug/test-eyedropper-active.mts`
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setEyedropperActive, isEyedropperActive } from '../components/gradient/eyedropperActive';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) { failures++; console.error('  ✗ ' + msg); } else { console.log('  ✓ ' + msg); }
};

console.log('[1] the flag starts off, and set/clear move it');
ok(isEyedropperActive() === false, 'it starts off');
setEyedropperActive(true);
ok(isEyedropperActive() === true, 'setting it turns it on');
setEyedropperActive(false);
ok(isEyedropperActive() === false, 'clearing it turns it off');

console.log('[2] setting it twice leaves it set, and one clear is enough');
setEyedropperActive(true);
setEyedropperActive(true);
ok(isEyedropperActive() === true, 'two sets leave it on');
setEyedropperActive(false);
ok(isEyedropperActive() === false, 'one clear is enough — the flag does not count');

console.log('[3] the flag is a single shared value, not per-importer state');
{
  const again = await import('../components/gradient/eyedropperActive');
  setEyedropperActive(true);
  ok(again.isEyedropperActive() === true, 'a second importer sees the same value');
  setEyedropperActive(false);
  ok(again.isEyedropperActive() === false, '...and the same clear');
}

console.log('[4] the picker clears the flag on EVERY path, cancellation included');
{
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const picker = readFileSync(join(root, 'components/EmbeddedColorPicker.tsx'), 'utf8');
  const body = picker.slice(picker.indexOf('const doEyedrop'), picker.indexOf('const doEyedrop') + 900);
  ok(/setEyedropperActive\(true\)/.test(body), 'the picker sets the flag before opening');
  ok(/finally\s*\{[^}]*setEyedropperActive\(false\)/s.test(body), 'the picker clears the flag in a finally');
  // a cancelled pick REJECTS, so a clear placed after the try/catch would be skipped only
  // if the catch rethrew — but one placed inside the `try` is the real trap.
  const tryBlock = body.slice(body.indexOf('try {'), body.indexOf('} catch'));
  ok(!/setEyedropperActive\(false\)/.test(tryBlock), 'the clear is not inside the try alone');
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
