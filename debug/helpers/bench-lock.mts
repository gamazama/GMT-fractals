/**
 * Cross-process mutual exclusion for GPU-heavy bench scripts.
 *
 * Two headed Chrome windows running WebGL on the same GPU corrupt each
 * other's timing measurements (shared command queue, shared compositor).
 * This helper serializes them via a filesystem lockfile so any combination
 * of bench-perf / bench-shader / future benches can be launched from any
 * terminal and the second one waits for the first.
 *
 *   Usage:
 *     import { acquireBenchLock } from './helpers/bench-lock.mts';
 *
 *     async function main() {
 *         const release = await acquireBenchLock('bench-shader', {
 *             wait: !process.argv.includes('--no-wait'),
 *             force: process.argv.includes('--force'),
 *         });
 *         try {
 *             // ... do bench work ...
 *         } finally {
 *             release();
 *         }
 *     }
 *
 * Lockfile lives at debug/.bench.lock and contains JSON:
 *   { pid, host, kind, started, node }
 *
 * Stale detection: if the pid in the lockfile isn't alive on this host the
 * lock is stolen automatically. Cross-host locks (different `host`) are
 * never stolen — assume the other machine knows what it's doing — but on
 * the same machine an orphaned lock from a crashed run won't block forever.
 *
 * Cleanup: release() is registered on process.exit + SIGINT/SIGTERM/
 * uncaughtException so abnormal exit also frees the lock.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LOCK_PATH = path.resolve('debug/.bench.lock');
const POLL_MS   = 5_000;

interface LockData {
    pid: number;
    host: string;
    kind: string;
    started: string;       // ISO timestamp
    node: string;          // node version, for diagnostics
}

interface AcquireOpts {
    /** If true (default), poll until lock is free. If false, fail immediately. */
    wait?: boolean;
    /** If true, steal the lock even if the holder is alive. Use with care. */
    force?: boolean;
    /** Override poll interval (ms). Default 5000. */
    pollMs?: number;
    /** Override max wait time (ms). Default Infinity. */
    timeoutMs?: number;
}

/** True if pid is alive on this host. process.kill(pid, 0) throws ESRCH if not. */
function pidAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e: any) {
        // EPERM means the process exists but we don't own it — still alive.
        return e.code === 'EPERM';
    }
}

function readLock(): LockData | null {
    try {
        const raw = fs.readFileSync(LOCK_PATH, 'utf8');
        return JSON.parse(raw) as LockData;
    } catch {
        return null;
    }
}

function writeLock(data: LockData): void {
    fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
    // Open with wx so concurrent acquirers can't both win the race.
    const fd = fs.openSync(LOCK_PATH, 'wx');
    try {
        fs.writeSync(fd, JSON.stringify(data, null, 2));
    } finally {
        fs.closeSync(fd);
    }
}

function ageSec(iso: string): number {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? Math.floor((Date.now() - t) / 1000) : -1;
}

function tryAcquireOnce(kind: string, force: boolean): { ok: true } | { ok: false; held: LockData } {
    const me: LockData = {
        pid: process.pid,
        host: os.hostname(),
        kind,
        started: new Date().toISOString(),
        node: process.version,
    };

    const existing = readLock();
    if (existing) {
        const sameHost = existing.host === me.host;
        const stale = sameHost && !pidAlive(existing.pid);
        if (!force && !stale) return { ok: false, held: existing };

        // Stealing — log why.
        const reason = force ? 'force' : 'stale (holder pid not alive)';
        console.log(`[bench-lock] stealing lock from ${existing.kind} pid=${existing.pid} (${reason})`);
        try { fs.unlinkSync(LOCK_PATH); } catch { /* race with another acquirer is fine */ }
    }

    try {
        writeLock(me);
        return { ok: true };
    } catch (e: any) {
        if (e.code === 'EEXIST') {
            // Lost the race to another acquirer — re-read and report.
            const held = readLock();
            return { ok: false, held: held ?? { pid: -1, host: '?', kind: '?', started: '?', node: '?' } };
        }
        throw e;
    }
}

/**
 * Acquire the bench lock. Resolves with a release function once held.
 *
 * On `wait: false` and lock held, throws with a descriptive message. On
 * `wait: true` (default), polls every `pollMs` until free, printing a
 * status line each tick.
 */
export async function acquireBenchLock(
    kind: string,
    opts: AcquireOpts = {},
): Promise<() => void> {
    const { wait = true, force = false, pollMs = POLL_MS, timeoutMs = Infinity } = opts;
    const startWait = Date.now();

    while (true) {
        const res = tryAcquireOnce(kind, force);
        if (res.ok) break;

        const held = res.held;
        const sameHost = held.host === os.hostname();
        const ageS = ageSec(held.started);
        const ageStr = ageS >= 0 ? `${ageS}s ago` : 'unknown age';
        const hostStr = sameHost ? '' : ` host=${held.host}`;

        if (!wait) {
            throw new Error(
                `[bench-lock] lock held by ${held.kind} pid=${held.pid}${hostStr} (started ${ageStr}). ` +
                `Use --force to steal or omit --no-wait to queue.`,
            );
        }

        if (Date.now() - startWait > timeoutMs) {
            throw new Error(`[bench-lock] timed out after ${timeoutMs}ms waiting on ${held.kind} pid=${held.pid}`);
        }

        // First message is more verbose; subsequent ticks are terse.
        if (Date.now() - startWait < pollMs) {
            console.log(
                `[bench-lock] another bench is running:\n` +
                `  kind=${held.kind}  pid=${held.pid}${hostStr}  started ${ageStr}\n` +
                `  waiting…  (poll every ${Math.round(pollMs / 1000)}s; --no-wait to abort, --force to steal)`,
            );
        } else {
            console.log(`[bench-lock] still waiting on ${held.kind} pid=${held.pid} (${ageStr})`);
        }

        await new Promise(r => setTimeout(r, pollMs));
    }

    // ─── Cleanup hooks ───────────────────────────────────────────────────
    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        const cur = readLock();
        // Only unlink if we still own it — don't nuke another process's lock
        // if somehow ours was stolen.
        if (cur && cur.pid === process.pid) {
            try { fs.unlinkSync(LOCK_PATH); } catch { /* ignore */ }
        }
    };

    process.on('exit', release);
    process.on('SIGINT',  () => { release(); process.exit(130); });
    process.on('SIGTERM', () => { release(); process.exit(143); });
    process.on('uncaughtException', (e) => {
        release();
        console.error(e);
        process.exit(1);
    });

    return release;
}

/**
 * Returns lock holder info without acquiring. Useful for status commands
 * or pre-flight checks ("is it safe to start a smoke test right now?").
 */
export function inspectBenchLock(): LockData | null {
    const data = readLock();
    if (!data) return null;
    if (data.host === os.hostname() && !pidAlive(data.pid)) return null; // stale
    return data;
}
