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
 */

import { spawn, type ChildProcess } from 'child_process';
import { createConnection } from 'net';

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
        const ok = await new Promise<boolean>((resolve) => {
            const sock = createConnection(port, '127.0.0.1');
            sock.once('connect', () => { sock.destroy(); resolve(true); });
            sock.once('error', () => resolve(false));
        });
        if (ok) return;
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`vite never came up on port ${port} after ${deadlineMs} ms`);
};

const kill = (proc: ChildProcess) => {
    if (proc.killed) return;
    if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F']);
    } else {
        proc.kill('SIGTERM');
    }
};

const vite: ChildProcess = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--port', String(PORT), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: false },
);

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

    const smoke = spawn(
        process.platform === 'win32' ? `${smokeCmd[0]}.cmd` : smokeCmd[0],
        smokeCmd.slice(1),
        {
            stdio: 'inherit',
            env: { ...process.env, ENGINE_URL: URL },
            shell: false,
        },
    );

    const exitCode: number = await new Promise((r) => smoke.on('exit', (c) => r(c ?? 1)));
    cleanup();
    process.exit(exitCode);
} catch (e) {
    console.error('[runWithServer]', e);
    cleanup();
    process.exit(1);
}
