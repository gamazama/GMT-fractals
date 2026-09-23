/**
 * test-scene-stash — the one-shot scene stash (engine-gmt/utils/sceneStash.ts) that carries a
 * GMT scene across Google sign-in and the Gradient Explorer trip, and the incoming-gradient key
 * GMT hands the Explorer (palette/core/explorerHandoff.ts). Node only, no browser, ~1 s.
 * `npx tsx debug/test-scene-stash.mts`.
 *
 *   [1] round trip per reason: the GMF comes back byte-exact, the GX trip carries the dirty flag,
 *       the sign-in reason never does, and a take clears the slot (a second take is null)
 *   [2] lifetime per reason: sign-in 5 minutes, the GX trip 24 hours (a six-hour trip still
 *       restores); an expired copy is null AND cleared
 *   [3] the sign-in path is unchanged: its two keys are byte-identical to the pre-2026-09-23
 *       module's, the timestamp is a bare decimal string, no third key is written, a stash
 *       written the OLD way (two raw setItems) is still read, and the two reasons never read
 *       each other's slot
 *   [4] the GX restore needs its flag: no `?from=gx` → nothing read and NOTHING CONSUMED (a
 *       reload or a crash cannot bring a trip's copy back); with it → taken once; and the
 *       Explorer's fallback link (gradient-explorer/v2/fromGmt.ts, read as text) carries a query
 *       this gate recognises
 *   [5] a failed write leaves nothing: over quota → false and no keys; an OLDER copy of the same
 *       reason is not left behind to restore instead; a write that fails half-way is rolled back;
 *       storage that throws on access → false / null, never a throw
 *   [6] the incoming gradient: round trip (config as written, name, favId), one-shot, 2-minute
 *       lifetime, garbage / a bad config / another version → null and the key cleared
 *
 * ── FALSIFIED 2026-09-23 — eleven breaks, each made, the run watched go red (exit 1), reverted ──
 *   F1  `takeSceneStash` without its clear → 5 red ([1] second take, [1] no key left, [2] expired
 *       cleared, [3] the GX gate reading a left-over, [4] taken once).
 *   F2  the GX lifetime set to sign-in's 5 minutes → 3 red, [2].
 *   F3  `takeGxTripStash` ignoring the flag → 4 red, [4] (incl. "NOTHING WAS CONSUMED").
 *   F4  `writeSceneStash` without its clear-first → 1 red, [5] "a clean stash over a dirty one".
 *       STAYED GREEN on the first cut, which tested only the rollback — the rollback masks a
 *       missing clear-first on a FAILED write; the clear-first's own job is the stale dirty flag.
 *   F5  no rollback on a failed write → 2 red, [5] (half-way, and the dirty flag not landing).
 *   F6  the sign-in timestamp key renamed → 3 red, [3]. F7 sign-in carrying a dirty key → 2 red.
 *   F8  `takeExplorerIncoming` without its lifetime → 1 red, [6]. F9 … without its clear → 6 red.
 *   F10 … without the config gate → 1 red, [6] "a config with no stops".
 *   F11 `BACK_TO_GMT_HREF` without the flag → 1 red, [4]. STAYED GREEN on the first cut: the
 *       regex matched the file header's prose mention of the URL; it is anchored on the
 *       assignment now.
 */
import { readFileSync } from 'node:fs';

// ── a localStorage with a quota, a per-key failure hook and a "blocked" switch ────────────
const disk = new Map<string, string>();
let quota = Infinity;
let failKey: string | null = null;
let blocked = false;
const storage = {
  getItem: (k: string) => (disk.has(k) ? disk.get(k)! : null),
  setItem: (k: string, v: string) => {
    if (k === failKey) throw new Error('QuotaExceededError');
    const used = [...disk.entries()].reduce((n, [kk, vv]) => n + (kk === k ? 0 : kk.length + vv.length), 0);
    if (used + k.length + String(v).length > quota) throw new Error('QuotaExceededError');
    disk.set(k, String(v));
  },
  removeItem: (k: string) => { disk.delete(k); },
};
(globalThis as any).window = {
  get localStorage() {
    if (blocked) throw new Error('SecurityError: storage blocked');
    return storage;
  },
};

const {
  writeSceneStash, takeSceneStash, clearSceneStash, takeGxTripStash, SCENE_STASH_REASONS, GX_RETURN_QUERY,
} = await import('../engine-gmt/utils/sceneStash');
const { writeExplorerIncoming, takeExplorerIncoming, EXPLORER_INCOMING_KEY, EXPLORER_INCOMING_TTL_MS } = await import('../palette/core/explorerHandoff');

let failures = 0;
const ok = (cond: boolean, msg: string): void => {
  if (cond) console.log('  ✓ ' + msg);
  else { failures++; console.error('  ✗ ' + msg); }
};
const reset = (): void => { disk.clear(); quota = Infinity; failKey = null; blocked = false; };

const T0 = Date.UTC(2026, 8, 23, 12, 0, 0);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const GMF = '// GMT scene\n{"formula":"Mandelbulb","features":{"coloring":{"gradient":{"stops":[]}}}}\n' + 'x'.repeat(2000);

console.log('[1] round trip per reason');
{
  reset();
  ok(writeSceneStash('gx', GMF, { dirty: true, now: T0 }), 'a GX stash lands');
  const t = takeSceneStash('gx', T0 + MIN);
  ok(!!t && t.gmf === GMF, 'the GMF comes back byte-exact');
  ok(!!t && t.dirty === true, 'the GX trip carries the dirty flag');
  ok(takeSceneStash('gx', T0 + MIN) === null, 'a take clears the slot: the second take is null');
  ok(disk.size === 0, 'no key is left behind after the take');
  writeSceneStash('gx', GMF, { dirty: false, now: T0 });
  ok(takeSceneStash('gx', T0)?.dirty === false, 'a clean scene comes back clean');
  writeSceneStash('oauth', GMF, { dirty: true, now: T0 });
  const o = takeSceneStash('oauth', T0 + MIN);
  ok(!!o && o.gmf === GMF && o.dirty === false, 'the sign-in reason round-trips and never carries the dirty flag');
}

console.log('\n[2] lifetime per reason');
{
  reset();
  const at = (reason: 'gx' | 'oauth', age: number) => {
    writeSceneStash(reason, GMF, { now: T0 });
    return takeSceneStash(reason, T0 + age) !== null;
  };
  ok(SCENE_STASH_REASONS.oauth.ttlMs === 5 * MIN, 'sign-in: 5 minutes');
  ok(at('oauth', 5 * MIN - 1000) && !at('oauth', 5 * MIN + 1000), 'sign-in restores at 4:59 and not at 5:01');
  ok(SCENE_STASH_REASONS.gx.ttlMs === 24 * HOUR, 'GX trip: 24 hours');
  ok(at('gx', 6 * HOUR), 'a six-hour Explorer trip still restores (the sign-in lifetime would have lost it)');
  ok(at('gx', 24 * HOUR - 1000) && !at('gx', 24 * HOUR + 1000), 'GX trip restores at 23:59:59 and not at 24:00:01');
  writeSceneStash('gx', GMF, { now: T0 });
  takeSceneStash('gx', T0 + 25 * HOUR);
  ok(disk.size === 0, 'an expired copy is cleared, not kept for later');
}

console.log('\n[3] the sign-in path is unchanged, and the reasons stay apart');
{
  reset();
  ok(SCENE_STASH_REASONS.oauth.gmfKey === 'gmt-oauth-scene-stash' && SCENE_STASH_REASONS.oauth.atKey === 'gmt-oauth-scene-stash-ts',
    'the sign-in keys are the pre-generalisation module\'s, byte for byte');
  writeSceneStash('oauth', GMF, { dirty: true, now: T0 });
  ok(disk.get('gmt-oauth-scene-stash-ts') === String(T0), 'the timestamp is a bare decimal string, as before');
  ok(disk.size === 2, `exactly two keys are written for sign-in (${[...disk.keys()].join(', ')})`);
  reset();
  // What the old stashSceneForOAuth wrote, as raw setItems — a redirect that straddles a deploy.
  storage.setItem('gmt-oauth-scene-stash', GMF);
  storage.setItem('gmt-oauth-scene-stash-ts', String(T0));
  ok(takeSceneStash('oauth', T0 + MIN)?.gmf === GMF, 'a stash written the old way is still restored');
  reset();
  writeSceneStash('gx', GMF, { now: T0 });
  ok(takeSceneStash('oauth', T0) === null, 'sign-in does not read the GX trip\'s slot');
  ok(takeSceneStash('gx', T0)?.gmf === GMF, '…and leaves it where it was');
  writeSceneStash('oauth', GMF, { now: T0 });
  ok(takeGxTripStash('?from=gx', T0) === null, 'the GX restore does not read sign-in\'s slot');
  ok(takeSceneStash('oauth', T0)?.gmf === GMF, '…and leaves it where it was');
}

console.log('\n[4] the GX restore needs its flag');
{
  reset();
  writeSceneStash('gx', GMF, { dirty: true, now: T0 });
  ok(takeGxTripStash('', T0) === undefined, 'no query: nothing is read');
  ok(takeGxTripStash('?s=abc', T0) === undefined && takeGxTripStash('?from=gmt', T0) === undefined && takeGxTripStash('?from=gxx', T0) === undefined,
    'another query, or another ?from value: nothing is read');
  ok(disk.has(SCENE_STASH_REASONS.gx.gmfKey), 'and NOTHING WAS CONSUMED — a reload or a crash never takes the trip\'s copy');
  const t = takeGxTripStash('?gallery=x&from=gx', T0);
  ok(!!t && t.gmf === GMF && t.dirty, 'with the flag (among other params) the stash is taken');
  ok(takeGxTripStash('?from=gx', T0) === null, 'taken once: the flag again finds nothing (the caller toasts)');
  // Anchored on the assignment: the file's header mentions the same URL in prose, and a looser
  // match read the comment (F11 stayed green on the first cut).
  const src = readFileSync(new URL('../gradient-explorer/v2/fromGmt.ts', import.meta.url), 'utf8');
  const href = /export const BACK_TO_GMT_HREF = openedByGmtButton \? '([^']+)'/.exec(src)?.[1] ?? '';
  writeSceneStash('gx', GMF, { now: T0 });
  ok(!!href && takeGxTripStash(new URL(href, 'https://app.gmt-fractals.com/').search, T0)?.gmf === GMF,
    `the Explorer's fallback link carries the flag this gate reads (${href || 'no app-gmt.html?… literal found'}; flag ${GX_RETURN_QUERY.param}=${GX_RETURN_QUERY.value})`);
}

console.log('\n[5] a failed write leaves nothing');
{
  reset();
  quota = 1000;
  ok(writeSceneStash('gx', GMF, { now: T0 }) === false, 'over quota: the write reports false');
  ok(disk.size === 0, 'over quota: no key is left');
  reset();
  writeSceneStash('gx', 'OLD SCENE', { now: T0 });
  quota = 1000;
  writeSceneStash('gx', GMF, { now: T0 + HOUR });
  ok(takeSceneStash('gx', T0 + HOUR) === null, 'an OLDER copy is not left behind to restore in place of the one that failed');
  reset();
  // The clear-first's real job (F4 stayed green on the first cut, when only the rollback was
  // tested): a clean trip after a dirty one must not inherit the old dirty flag.
  writeSceneStash('gx', 'DIRTY SCENE', { dirty: true, now: T0 });
  writeSceneStash('gx', GMF, { dirty: false, now: T0 + HOUR });
  ok(takeSceneStash('gx', T0 + HOUR)?.dirty === false, 'a clean stash over a dirty one comes back clean (nothing of the old copy pairs with the new)');
  reset();
  failKey = SCENE_STASH_REASONS.gx.atKey;
  ok(writeSceneStash('gx', GMF, { now: T0 }) === false && disk.size === 0, 'a write that fails half-way (the GMF landed, the time did not) is rolled back');
  reset();
  failKey = SCENE_STASH_REASONS.gx.dirtyKey!;
  ok(writeSceneStash('gx', GMF, { dirty: true, now: T0 }) === false && disk.size === 0, 'a dirty flag that does not land rolls the whole stash back (never restore it as clean)');
  reset();
  // The oversized case: a scene bigger than what is left of the shared budget.
  quota = 5 * 1024 * 1024;
  storage.setItem('gmt.favients', 'f'.repeat(4 * 1024 * 1024));
  ok(writeSceneStash('gx', 'g'.repeat(2 * 1024 * 1024), { now: T0 }) === false, 'a 2 MB scene with 4 MB of the budget used: false');
  ok(disk.size === 1 && disk.has('gmt.favients'), 'and the shelf is untouched');
  reset();
  blocked = true;
  let threw = false;
  let wrote = true;
  let took: unknown = 'x';
  try {
    wrote = writeSceneStash('gx', GMF, { now: T0 });
    took = takeSceneStash('gx', T0);
    clearSceneStash('gx');
  } catch { threw = true; }
  ok(!threw && wrote === false && took === null, 'storage that throws on access: false / null, never a throw');
}

console.log('\n[6] the incoming gradient (GMT → Explorer)');
{
  reset();
  const config = { stops: [{ id: 'a', position: 0, color: '#112233', bias: 0.5, interpolation: 'linear' }, { id: 'b', position: 1, color: '#FFEEDD', bias: 0.5, interpolation: 'step' }], colorSpace: 'linear', blendSpace: 'oklab' } as any;
  ok(writeExplorerIncoming({ config, name: 'Fire', favId: 'fav-1' }, T0), 'the write lands');
  const g = takeExplorerIncoming(T0 + 5000);
  ok(!!g && JSON.stringify(g.config) === JSON.stringify(config) && g.name === 'Fire' && g.favId === 'fav-1',
    'round trip: the config exactly as written (colour-space flag included), the name, the favourite');
  ok(takeExplorerIncoming(T0 + 5000) === null && !disk.has(EXPLORER_INCOMING_KEY), 'one-shot: the key is gone after the take');
  writeExplorerIncoming({ config, name: 'Fire' }, T0);
  ok(takeExplorerIncoming(T0)?.favId === undefined, 'no favourite → no favId');
  writeExplorerIncoming({ config, name: 'Fire' }, T0);
  ok(takeExplorerIncoming(T0 + EXPLORER_INCOMING_TTL_MS - 1000) !== null, 'taken at 1:59');
  writeExplorerIncoming({ config, name: 'Fire' }, T0);
  ok(takeExplorerIncoming(T0 + EXPLORER_INCOMING_TTL_MS + 1000) === null && !disk.has(EXPLORER_INCOMING_KEY),
    'not at 2:01 (a blocked popup\'s key never surfaces later), and cleared');
  for (const [label, raw] of [
    ['not JSON', '{nope'],
    ['another version', JSON.stringify({ v: 2, at: T0, config, name: 'x' })],
    ['a config with no stops', JSON.stringify({ v: 1, at: T0, config: { colorSpace: 'srgb' }, name: 'x' })],
    ['no time', JSON.stringify({ v: 1, config, name: 'x' })],
  ] as const) {
    storage.setItem(EXPLORER_INCOMING_KEY, raw);
    ok(takeExplorerIncoming(T0) === null && !disk.has(EXPLORER_INCOMING_KEY), `garbage (${label}) → null, key cleared`);
  }
}

console.log(failures ? `\n✗ ${failures} failure(s)` : '\n✓ all passed');
process.exit(failures ? 1 : 0);
