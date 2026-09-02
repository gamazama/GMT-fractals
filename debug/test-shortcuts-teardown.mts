/**
 * Guard: `uninstallShortcuts` is the inverse of `installShortcuts`.
 *
 * Nothing calls `uninstallShortcuts` today, which is exactly why its two
 * contract defects (overnight audit, cycle 3) sat unnoticed: it removed the
 * listener from `window` literally, whatever `domRoot` install had used, and
 * left the modal keyboard-capture count stranded. The first real caller — an
 * HMR hook, a test harness, a multi-root host — would have hit both.
 *
 * Pinned here, against a fake event target so no browser is needed:
 *   [1] uninstall detaches the listener from the root install attached to;
 *   [2] uninstall resets the capture count, so single-key shortcuts are not
 *       swallowed for the life of the page after a teardown;
 *   [3] a second install with options is ignored, and says so.
 *
 * Run: `npm run test:shortcuts-teardown`
 *
 * ── FALSIFIED 2026-09-02 ─────────────────────────────────────────────────
 *   Against the previous `uninstallShortcuts` (window-literal removal, no
 *   counter reset): the process died on block 1's first uninstall with
 *   `ReferenceError: window is not defined` — the literal `window` that the
 *   fix replaces with the stashed root. With the fix: all green.
 */
import { installShortcuts, uninstallShortcuts, setKeyboardCaptured, isKeyboardCaptured } from '../engine/plugins/Shortcuts';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => { failures++; console.log(`  ✗ ${m}`); };

class FakeRoot {
    live = new Set<unknown>();
    adds = 0;
    removes = 0;
    addEventListener(_type: string, fn: unknown, _cap?: boolean) { this.adds++; this.live.add(fn); }
    removeEventListener(_type: string, fn: unknown, _cap?: boolean) { if (this.live.delete(fn)) this.removes++; }
}

const warnings: string[] = [];
const realWarn = console.warn;
console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };

console.log('Block 1 — uninstall detaches from the root install used');
{
    const root = new FakeRoot();
    installShortcuts({ domRoot: root as unknown as HTMLElement });
    if (root.live.size === 1) ok('install attached one keydown listener to the custom root');
    else fail(`install attached ${root.live.size} listener(s) to the custom root, expected 1`);
    uninstallShortcuts();
    if (root.live.size === 0) ok('uninstall detached it from that root');
    else fail(`uninstall left ${root.live.size} listener(s) on the custom root — it removed from somewhere else`);
}

console.log('\nBlock 2 — capture count is reset by uninstall');
{
    const root = new FakeRoot();
    installShortcuts({ domRoot: root as unknown as HTMLElement });
    setKeyboardCaptured(true);
    if (isKeyboardCaptured()) ok('a capturing surface raised the count');
    else fail('setKeyboardCaptured(true) did not raise the count');
    uninstallShortcuts();
    if (!isKeyboardCaptured()) ok('uninstall reset the capture count');
    else fail('capture count survived uninstall — single-key shortcuts would be swallowed after a re-install');
}

console.log('\nBlock 3 — a second install with options is ignored and warned about');
{
    const first = new FakeRoot();
    const second = new FakeRoot();
    installShortcuts({ domRoot: first as unknown as HTMLElement });
    warnings.length = 0;
    installShortcuts({ domRoot: second as unknown as HTMLElement, capture: true });
    if (second.live.size === 0 && first.live.size === 1) ok('the first install still wins');
    else fail(`listeners: first=${first.live.size} second=${second.live.size}, expected 1 and 0`);
    const w = warnings.filter(x => x.includes('[Shortcuts]'));
    if (w.length === 1 && w[0].includes('domRoot') && w[0].includes('capture')) ok('one warning names the ignored options');
    else fail(`expected one [Shortcuts] warning naming domRoot and capture, got ${w.length}: ${w.join(' | ')}`);
    warnings.length = 0;
    installShortcuts();
    if (warnings.length === 0) ok('a bare repeat install stays silent');
    else fail(`a bare repeat install warned: ${warnings.join(' | ')}`);
    uninstallShortcuts();
}

console.warn = realWarn;
console.log(failures === 0 ? '\nPASS — shortcuts teardown is the inverse of install' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
