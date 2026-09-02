/**
 * `smoke:all` driver — run every member, then say how many failed.
 *
 * `smoke:all` used to be 42 `tsx debug/*.mts` invocations joined by `&&`.
 * Sound as a gate, useless as a report: the first red erased the signal from
 * everything after it, and there was no line saying how many members ran.
 * That is how four dead members (two on a port the repo had not used in
 * months, one reading a directory deleted six weeks earlier) hid behind one
 * another undetected — 14 of 42 never ran at all (overnight audit, gs01
 * batch 9b). This driver runs every member regardless, streams each one's
 * output as before, and exits non-zero at the END with a summary.
 *
 * Usage:
 *   npm run smoke:all                     every member, in order
 *   npm run smoke:all -- --only=undo,orbit   members whose file name contains any
 *                                         of the comma-separated substrings
 *   npm run smoke:all -- --from=28        resume at member 28 (1-based)
 *   npm run smoke:all -- --bail           stop at the first red (the old `&&`
 *                                         behaviour, for bisecting)
 *   npm run smoke:all -- --list           print the member list and exit
 *
 * The member list below is THE list. `check:rule-guards` reads it from this
 * file (grep `run-smokes` in debug/check-rule-guards.mjs) so a rule citing
 * `smoke:all` still resolves to the union of the members' reach. Browser
 * members need the Vite dev server on :3400; the driver probes the port and
 * warns, it does not start one (`npm run smoke:with-server` does that).
 *
 * @invariant A failing member does not stop the members after it, and the
 *   summary names it. — proven by: this file run with a member that does not
 *   exist placed first (`--only` narrows the run to it plus two real members):
 *   exit 1, "1 of 3 failed", and both real members report their own result.
 *   Falsified 2026-09-02 that way; with `--bail` the same run stops after
 *   member 1 with "stopped at member 1 (--bail)".
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';

export const MEMBERS = [
    'debug/smoke-ui-primitives.mts',
    'debug/smoke-track-binding.mts',
    'debug/smoke-binder-registry.mts',
    'debug/smoke-deep-zoom-orbit.mts',
    'debug/smoke-deep-zoom-la.mts',
    'debug/smoke-deep-zoom-nucleus.mts',
    'debug/smoke-boot.mts',
    'debug/smoke-engine-gmt.mts',
    'debug/smoke-formula-switch.mts',
    'debug/smoke-fractal-kind.mts',
    'debug/smoke-fractal-toy.mts',
    'debug/smoke-canvas-menu.mts',
    'debug/smoke-hud-hint.mts',
    'debug/smoke-help-menu.mts',
    'debug/smoke-pause-controls.mts',
    'debug/smoke-viewport.mts',
    'debug/smoke-viewport-fixed.mts',
    'debug/smoke-screenshot.mts',
    'debug/smoke-anim-play.mts',
    'debug/smoke-anim-vec2.mts',
    'debug/smoke-audio-fps-remap.mts',
    'debug/smoke-bc-drag.mts',
    'debug/smoke-undo.mts',
    'debug/smoke-share-link.mts',
    'debug/smoke-gallery-link.mts',
    'debug/smoke-tsaa.mts',
    'debug/smoke-fluid-brush.mts',
    'debug/smoke-catalog-browse.mts',
    'debug/smoke-catalog-load.mts',
    'debug/smoke-picker-search-kb.mts',
    'debug/smoke-workshop-state.mts',
    'debug/smoke-engine-demo.mts',
    'debug/smoke-engine-demo-modulation.mts',
    'debug/smoke-interact.mts',
    'debug/smoke-camera.mts',
    'debug/smoke-anim-orbit.mts',
    'debug/smoke-fluid-presets.mts',
    'debug/smoke-migrations.mts',
    'debug/smoke-canvas-pan-zoom.mts',
    'debug/smoke-fluid-toy.mts',
    'debug/smoke-particle-bounce.mts',
    'debug/smoke-orbit.mts',
    'debug/smoke-export-watchdog.mts',
    'debug/smoke-compile-failed.mts',
    'debug/smoke-mobile-layout.mts',
];

const argv = process.argv.slice(2);
const flag = (name: string) => argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
const value = (name: string) => flag(name)?.split('=').slice(1).join('=') ?? '';
const bail = !!flag('bail');
const from = Math.max(1, Number(value('from') || 1));
const only = value('only').split(',').map(s => s.trim()).filter(Boolean);

let members = MEMBERS.map((file, i) => ({ n: i + 1, file }))
    .filter(m => m.n >= from)
    .filter(m => !only.length || only.some(s => m.file.includes(s)));

if (flag('list')) {
    for (const m of members) console.log(`${String(m.n).padStart(2)}  ${m.file}`);
    process.exit(0);
}

const portUp = (port: number) => new Promise<boolean>((resolve) => {
    const s = connect({ host: '127.0.0.1', port });
    const done = (v: boolean) => { s.destroy(); resolve(v); };
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
    s.setTimeout(500, () => done(false));
});
if (!(await portUp(3400))) {
    console.log('\n\x1b[33m[run-smokes] no Vite dev server on :3400 — browser members will fail. Run `npm run dev` first, or `npm run smoke:with-server -- npm run smoke:all`.\x1b[0m\n');
}

type Result = { n: number; file: string; status: 'ok' | 'fail' | 'missing'; code: number | null; ms: number };
const results: Result[] = [];
const t0 = Date.now();

for (const m of members) {
    const label = `[${m.n}/${MEMBERS.length}] ${m.file}`;
    console.log(`\n\x1b[2m════════════════════════════════════════════════════════════\x1b[0m\n${label}`);
    const start = Date.now();
    if (!existsSync(m.file)) {
        results.push({ ...m, status: 'missing', code: null, ms: 0 });
        console.log(`\x1b[31m  ✗ file does not exist\x1b[0m`);
    } else {
        const r = spawnSync('npx', ['tsx', m.file], { stdio: 'inherit', shell: true });
        const ms = Date.now() - start;
        const ok = r.status === 0;
        results.push({ ...m, status: ok ? 'ok' : 'fail', code: r.status, ms });
        console.log(ok ? `\x1b[32m  ✓ ${(ms / 1000).toFixed(1)}s\x1b[0m` : `\x1b[31m  ✗ exit ${r.status} after ${(ms / 1000).toFixed(1)}s\x1b[0m`);
    }
    if (bail && results[results.length - 1].status !== 'ok') {
        console.log(`\n\x1b[31mstopped at member ${m.n} (--bail)\x1b[0m`);
        break;
    }
}

const failed = results.filter(r => r.status !== 'ok');
const ran = results.length;
console.log(`\n\x1b[2m════════════════════════════════════════════════════════════\x1b[0m`);
console.log(`smoke:all — ${ran} of ${members.length} selected member(s) ran in ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min` +
    (members.length !== MEMBERS.length ? ` (${MEMBERS.length} in the full list)` : ''));
for (const r of results) {
    const mark = r.status === 'ok' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${mark} ${String(r.n).padStart(2)}  ${r.file.padEnd(44)} ${r.status === 'missing' ? 'missing' : r.status === 'ok' ? `${(r.ms / 1000).toFixed(1)}s` : `exit ${r.code} (${(r.ms / 1000).toFixed(1)}s)`}`);
}
if (failed.length) {
    console.log(`\n\x1b[31m${failed.length} of ${ran} failed:\x1b[0m ${failed.map(r => r.file.replace(/^debug\//, '')).join(', ')}\n`);
    process.exit(1);
}
console.log(`\n\x1b[32mall ${ran} passed\x1b[0m\n`);
process.exit(0);
