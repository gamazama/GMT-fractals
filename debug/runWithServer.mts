/**
 * Boot vite on a free port, wait until it serves, run a smoke command,
 * then tear vite down. Avoids the silent-hang trap when a smoke is run
 * directly without a dev server up (the page-load promise just hangs).
 *
 * Usage:
 *   npx tsx debug/runWithServer.mts -- <smoke-command and args>
 *
 * Picks a free port (default 3499; bumps on EADDRINUSE), exports
 * `ENGINE_URL=http://localhost:<port>` so the smoke uses it instead of
 * the hardcoded :3400 default.
 *
 * WINDOWS / `spawn EINVAL` — fixed 2026-08-02 (guard sweep, batch 9b).
 * Node >= 18.20.2 / 20.12.2 refuses to `spawn()` a Windows `.cmd`/`.bat` shim
 * unless `shell` is set (the CVE-2024-27980 hardening). Both spawns here named
 * `npx.cmd` with `shell: false`, so on Windows this wrapper threw
 * `Error: spawn EINVAL` at the VITE spawn — module scope, outside the try —
 * and died before the server was even started. `npm run smoke:with-server`
 * could not run at all, and the five debug harnesses whose headers document
 * `npx tsx debug/runWithServer.mts -- ...` as their invocation (bench-perf,
 * bench-perf-timeline, measure-pt-compile, smoke-share-link, bench-pt) had to
 * be run against a hand-started `npm run dev` instead. See ADR-0073.
 *
 * The fix is `shell` on win32 for both spawns, with the `.cmd` suffix dropped
 * (PATHEXT resolves it under cmd.exe). Note that with `shell: true` node hands
 * the command line to cmd.exe VERBATIM and does not quote arguments, so any
 * argument containing whitespace has to be quoted here — `q()` below.
 *
 * Exit contract, falsified 2026-08-02: the inner command's exit code is the
 * wrapper's exit code, including non-1 codes (inner `process.exit(7)` -> 7);
 * a nonexistent inner command exits 1 rather than hanging; a missing `--`
 * payload exits 2 with usage; and vite is killed on every one of those paths.
 *
 * KNOWN HAZARD, measured not theorised: if SMOKE_PORT is already being served
 * by something else, `--strictPort` makes our vite exit, `waitForPort` connects
 * to the FOREIGN listener, and the wrapper prints its usual "vite ready at
 * <url>" and runs the smoke against it. Measured with SMOKE_PORT=3400 against a
 * hand-started `npm run dev`: exit 0, the inner command fetched app-gmt.html
 * from a server this wrapper did not start, and the "vite exited before ready"
 * warning lost the race and never printed. Harmless when the squatter is the
 * same repo's dev server — which is why this is documented rather than turned
 * into a hard failure; that call is the owner's. See PROPOSALS.md.
 */

import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from 'child_process';
import { createConnection } from 'net';

const WIN = process.platform === 'win32';
/** cmd.exe gets the command line verbatim under `shell: true` — quote spaces. */
const q = (a: string) => (WIN && /[\s&|<>^]/.test(a) && !a.startsWith('"') ? `"${a}"` : a);
/**
 * On win32 go through cmd.exe with ONE pre-joined command string. Passing an
 * args array alongside `shell: true` works but is DEP0190-deprecated, and the
 * shell is what makes `npx` (a `.cmd` shim) spawnable at all here. POSIX keeps
 * the original argv form byte for byte.
 */
const spawnCmd = (file: string, argv: string[], opts: SpawnOptions): ChildProcess =>
    WIN
        ? spawn([file, ...argv].map(q).join(' '), { ...opts, shell: true })
        : spawn(file, argv, { ...opts, shell: false });

const args = process.argv.slice(2);
const sepIdx = args.indexOf('--');
const smokeCmd = sepIdx >= 0 ? args.slice(sepIdx + 1) : args;
if (smokeCmd.length === 0) {
    console.error('Usage: tsx debug/runWithServer.mts -- <smoke command...>');
    process.exit(2);
}

const PORT = Number(process.env.SMOKE_PORT) || 3499;
const URL = `http://localhost:${PORT}`;
const TIMEOUT_MS = 30_000;

const waitForPort = async (port: number, deadlineMs: number): Promise<void> => {
    const t0 = Date.now();
    while (Date.now() - t0 < deadlineMs) {
        // 'localhost', NOT '127.0.0.1'. Vite binds IPv6 ::1 on Windows, so an
        // IPv4-only probe never connects and this timed out at 30s even once
        // vite WAS serving — measured 2026-08-02, with the orphaned server still
        // listening on [::1]:3499 afterwards. The exported ENGINE_URL has always
        // said `localhost`; the probe is what disagreed with it.
        const ok = await new Promise<boolean>((resolve) => {
            const sock = createConnection(port, 'localhost');
            sock.once('connect', () => { sock.destroy(); resolve(true); });
            sock.once('error', () => resolve(false));
        });
        if (ok) return;
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`vite never came up on port ${port} after ${deadlineMs} ms`);
};

const kill = (proc: ChildProcess) => {
    if (proc.killed || proc.pid === undefined) return;
    if (WIN) {
        // spawnSync, not spawn: every caller here is followed immediately by
        // process.exit(), which killed THIS process before the async taskkill
        // had run — so a failed run left vite listening on the port forever and
        // the next run died on --strictPort. Measured 2026-08-02.
        spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
        proc.kill('SIGTERM');
    }
};

const vite: ChildProcess = spawnCmd(
    'npx',
    ['vite', '--port', String(PORT), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
);
vite.on('error', (e) => {
    console.error('[runWithServer] could not start vite:', e);
    process.exit(1);
});

let viteReady = false;
vite.stdout?.on('data', (b) => {
    const s = String(b);
    if (s.includes('ready in') || s.includes('Local:')) viteReady = true;
});
vite.stderr?.on('data', (b) => process.stderr.write(b));
vite.on('exit', (code) => {
    if (!viteReady) console.error(`[runWithServer] vite exited (code ${code}) before ready`);
});

const cleanup = () => kill(vite);
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

try {
    await waitForPort(PORT, TIMEOUT_MS);
    console.log(`[runWithServer] vite ready at ${URL} — running: ${smokeCmd.join(' ')}`);

    const smoke = spawnCmd(
        smokeCmd[0],
        smokeCmd.slice(1),
        {
            stdio: 'inherit',
            env: { ...process.env, ENGINE_URL: URL },
        },
    );

    // Without this an ENOENT (POSIX) arrives as an unhandled 'error' event and
    // the 'exit' promise below never settles — a hang, which is the one failure
    // mode a wrapper must not have.
    const exitCode: number = await new Promise((r) => {
        smoke.on('error', (e) => { console.error('[runWithServer] smoke failed to start:', e); r(1); });
        smoke.on('exit', (c) => r(c ?? 1));
    });
    cleanup();
    process.exit(exitCode);
} catch (e) {
    console.error('[runWithServer]', e);
    cleanup();
    process.exit(1);
}
