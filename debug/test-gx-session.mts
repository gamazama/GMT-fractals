/**
 * test-gx-session — the Gradient Explorer v2 SESSION: what survives a reload and what a
 * `.gxsession.json` file carries. Node only, no browser. `npm run test:gx-session`.
 *
 *   [1] the envelope (store/sessionEnvelope.ts): round trip; garbage, another format and
 *       another version are each refused with their own reason
 *   [2] the boot decision: autosave off → clear; a share link that opens → preempted (it
 *       WINS over the stored session); nothing valid → fresh; else restore. Plus
 *       `shareOpensFrom` (gradient-explorer/v2/shareUrl.ts): a valid `?g=` pre-empts, a
 *       broken one does not
 *   [3] the adapter's gate (palette/store/workingSession.ts): a captured body passes; no
 *       working document / a garbage working input / a `__proto__` key → refused; the
 *       favourites document and the browse filters never survive validation; a live Mix's
 *       seeds survive the working coercion
 *   [4] a BOOT restore, against a real engine store + the real working / stops / generator
 *       providers: the state comes back and NO undo entry is added (a first Ctrl+Z after a
 *       reload must not wipe it); Mix's slot modifiers (`aHueRotate` … `bMirror`, no control in
 *       GE v2) restore at neutral. Also `restoreSessionOnBoot` end to end: with the Explorer's
 *       autosave at its DEFAULT (off) nothing is restored; on → restore, preempted (state
 *       untouched), fresh on garbage (no throw); off → clear (key removed)
 *   [5] a FILE load: exactly ONE undo entry that undoes back to what was there; the file's
 *       Recent session id is forgotten; a slot modifier in the file loads at neutral; the
 *       favients provider is never invoked, by either strip; a bad file changes nothing
 *   [6] the autosave loop (engine/plugins/Session.ts): with autosave off a CHANGED session is not
 *       written; turned on, an untouched boot writes nothing; a
 *       change is written on `pagehide`; an unchanged session is not rewritten; a refused
 *       write retries COMPACT (without the image); switching autosave off removes the key
 *   [7] autosave is PER APP (engine/store/autosaveStore.ts): app-gmt keeps `gmt-autosave-enabled`
 *       / `gmt-autosave-interval-sec` byte for byte; the Explorer's store is a different store
 *       over `gmt.ge.autosave-*` (memoised per key); toggling the Explorer's autosave — directly
 *       or through the Files ▸ Autosave rows `registerAutosaveSettings` puts in the registry —
 *       never changes app-gmt's keys, and app-gmt's being ON never makes the Explorer restore
 *   [8] (2026-09-14, ADR-0122) a RAMP gradient round-trips through a session: the working input
 *       and the stops document each come back as the same ramp gradient byte-exact, and a stop
 *       document riding a stale ramp is captured in its pre-ramp form
 *
 * ── How the store half runs under node ────────────────────────────────────────────────
 * The variants harness's trick (debug/test-palette-variants.mts): register the three palette
 * features BEFORE the engine store is imported, register the real providers directly (not
 * via registerPaletteUI, which pulls in the component tree), and shim `window` first.
 * `image` and `favients` are stand-ins: the real image provider needs a canvas, and the
 * favients one must be COUNTED — a session must never make it run.
 *
 * ── FALSIFIED 2026-09-13 — thirteen breaks, each made, run watched go red (exit 1), reverted ──
 *   F1  `decodeSession` without the version test → 5 red: [1] v2 and v0 admitted, [3]
 *       readSession lets v2 through, [5] a future-version file applies (and so adds an entry).
 *   F2  `sessionBootAction` asking "stored?" before "pre-empted?" → 1 red, [2] "a share link
 *       WINS over a valid stored session".
 *   F3  `validateWorkingSession` without the working-document check → 3 red: both [3] refusals
 *       and [4] "a stored body without a working document → fresh".
 *   F4  a boot apply routed through the file path (bracketed) → 3 red in [4]: an undo entry
 *       appears (twice) and the Recent session id is lost.
 *   F5  a file apply without its `paramEdit` → 2 red in [5]: 0 entries, and undo cannot put
 *       the previous session back.
 *   F6  validation keeping a file's favients document → 1 red, [3]. F7 `applyStudioSnapshot`
 *       without its strip → 1 red, [5] "the favients provider is never invoked (1)". The two
 *       strips are independent guards and each is caught on its own.
 *   F8  the autosave writing without the changed-since-last test → 2 red, [6] (an untouched
 *       boot writes; an unchanged session is rewritten).
 *   F9  no compact retry → 1 red, [6]. F10 `shareOpensFrom` testing presence, not validity →
 *       1 red, [2]. F11 switching autosave off without removing the key → 1 red, [6].
 *   F12 `coerceInput` dropping a live Mix's seeds (the pre-2026-09-13 behaviour) → 1 red, [3].
 *   F13 `write` without its `enabled` gate → 3 red, [6] (the off-by-default write, then the two
 *       assertions that stand on nothing having been written).
 *   (F4 / F11 / F13 were re-run after the per-app change below and red the same way.)
 *
 * ── FALSIFIED 2026-09-13, second pass — autosave opt-in + per app, and the slot modifiers ──
 *   N1  `createAutosaveSettingsStore` ignoring its keys (every store on app-gmt's) → 9 red, [7].
 *   N2  the factory without its memo → 1 red, [7] "asking for the same keys again returns the
 *       same store".
 *   N3  `registerAutosaveSettings` binding app-gmt's store whatever it is handed → 4 red, [7]:
 *       the rows write gmt-autosave-enabled and never the Explorer's key.
 *   N4  `restoreSessionOnBoot` treating autosave as always on (the first cut's on-by-default)
 *       → 3 red: [4] "autosave at its default (off): nothing is restored", [4] clear, and [7]
 *       "app-gmt's autosave being ON does not make the Explorer restore".
 *   N5  `applyWorkingSession` without `withNeutralSlotMods` → 2 red, the boot assertion in [4]
 *       (aHueRotate 45, bMirror true, aRepeats 3 came back) and the file assertion in [5].
 *
 * ── FALSIFIED 2026-09-14 — section [8], each break reverted ──
 *   T1  `serializeEditorConfig` dropping every ramp → 2 red (exit 1): the setup "text carries
 *       both ramp strings" and "the stops document comes back as its ramp gradient".
 *   T3  `serializeEditorConfig` without `normalizeGradientConfig` → 1 red, "a stop document is
 *       captured without a stale ramp".
 *   T2  `coerceGradientConfig` without its ramp branch → 3 red: "a session holding ramp gradients
 *       passes the gate" and both [8] round trips. (On the first cut this stayed GREEN, because a
 *       parallel shim, `paletteEditorStore.coerceAnyGradientConfig`, re-admitted the ramp form; the
 *       shim was folded into `coerceGradientConfig` the same day and T2 re-run.)
 */

import { encodeSession, decodeSession, sessionBootAction } from '../store/sessionEnvelope';
import { encodeShare, shareOpensFrom } from '../gradient-explorer/v2/shareUrl';
import type { GradientConfig, JsonValue } from '../types';

// ── window / document shim, before any engine module loads (every store import below is dynamic)
const disk = new Map<string, string>();
let quota = Infinity;
const listeners = new Map<string, Set<() => void>>();
const on = (t: string, fn: () => void) => { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t)!.add(fn); };
const off = (t: string, fn: () => void) => { listeners.get(t)?.delete(fn); };
const fire = (t: string) => { for (const fn of listeners.get(t) ?? []) fn(); };
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => (disk.has(k) ? disk.get(k)! : null),
    setItem: (k: string, v: string) => {
      if (String(v).length > quota) throw new Error('QuotaExceededError');
      disk.set(k, String(v));
    },
    removeItem: (k: string) => { disk.delete(k); },
    clear: () => disk.clear(),
    get length() { return disk.size; },
    key: (i: number) => [...disk.keys()][i] ?? null,
  },
  addEventListener: on,
  removeEventListener: off,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 1,
  location: { search: '', href: 'http://localhost/', hash: '' },
};
(globalThis as any).document = { visibilityState: 'visible', addEventListener: on, removeEventListener: off };
(globalThis as any).matchMedia = (globalThis as any).window.matchMedia;
(globalThis as any).location = (globalThis as any).window.location;

let failures = 0;
const ok = (cond: boolean, msg: string): void => {
  if (cond) console.log('  ✓ ' + msg);
  else { failures++; console.error('  ✗ ' + msg); }
};

const FORMAT = 'gmt-gx-session';
const cfg = (a: string, b: string): GradientConfig => ({
  stops: [
    { id: 's0', position: 0, color: a, bias: 0.5, interpolation: 'linear' },
    { id: 's1', position: 1, color: b, bias: 0.5, interpolation: 'linear' },
  ],
  colorSpace: 'srgb',
  blendSpace: 'oklab',
});

console.log('[1] the envelope');
{
  const body = { features: { a: { x: 1 } }, documents: { working: { input: { kind: 'empty' } } } };
  const text = encodeSession(FORMAT, 1, body, Date.UTC(2026, 8, 13));
  const d = decodeSession(text, FORMAT, 1);
  ok(d.ok && JSON.stringify(d.body) === JSON.stringify(body), 'encode → decode is the identity on the body');
  ok(d.ok && d.savedAt === '2026-09-13T00:00:00.000Z', 'savedAt is written as ISO');
  const reason = (t: unknown, v = 1) => { const r = decodeSession(t, FORMAT, v); return r.ok ? 'ok' : r.reason; };
  ok(reason(null) === 'empty' && reason('') === 'empty' && reason('   ') === 'empty', 'absent / empty → empty');
  ok(reason('{not json') === 'not-json', 'unparseable → not-json');
  ok(reason('[]') === 'not-a-session' && reason('42') === 'not-a-session' && reason('"x"') === 'not-a-session', 'a bare JSON value → not-a-session');
  ok(reason('{"format":"gmt-gx-session","version":1}') === 'not-a-session', 'no body → not-a-session');
  ok(reason('{"format":"gmt-gx-session","version":1,"body":[]}') === 'not-a-session', 'an array body → not-a-session');
  ok(reason(encodeSession('favients-collection', 1, body)) === 'other-format', 'another app\'s envelope → other-format');
  const v2 = decodeSession(encodeSession(FORMAT, 2, body), FORMAT, 1);
  ok(!v2.ok && v2.reason === 'version' && v2.version === 2, 'version mismatch (2 read by a v1 build) → version, naming what it found');
  ok(reason(encodeSession(FORMAT, 0, body)) === 'version', 'an older version (0) → version');
  ok(reason('{"format":"gmt-gx-session","version":"1","body":{}}') === 'not-a-session', 'a string version is not a version');
}

console.log('\n[2] the boot decision + share precedence');
{
  ok(sessionBootAction({ enabled: false, preempted: false, hasValidStored: true }) === 'clear', 'autosave off → clear, even with a valid stored session');
  ok(sessionBootAction({ enabled: false, preempted: true, hasValidStored: true }) === 'clear', 'autosave off → clear, even with a share link');
  ok(sessionBootAction({ enabled: true, preempted: true, hasValidStored: true }) === 'preempted', 'a share link WINS over a valid stored session');
  ok(sessionBootAction({ enabled: true, preempted: false, hasValidStored: true }) === 'restore', 'a valid stored session restores');
  ok(sessionBootAction({ enabled: true, preempted: false, hasValidStored: false }) === 'fresh', 'nothing valid stored → fresh (first-run unchanged)');
  const code = encodeShare(cfg('#FF0000', '#0000FF'), 'Shared');
  ok(shareOpensFrom(`?g=${code}`), 'a valid ?g= pre-empts');
  ok(shareOpensFrom(`?from=gmt&g=${code}`), 'a valid ?g= among other params pre-empts');
  ok(!shareOpensFrom('?g=@@@not-a-link'), 'a broken ?g= does NOT pre-empt (the session is better than an empty shell)');
  ok(!shareOpensFrom('') && !shareOpensFrom('?from=gmt'), 'no ?g= does not pre-empt');
}

// ══ the store half ═══════════════════════════════════════════════════════════════════
const { featureRegistry } = await import('../engine/FeatureSystem');
featureRegistry.register((await import('../palette/features/paletteGenerator')).PaletteGeneratorFeature);
featureRegistry.register((await import('../palette/features/paletteImage')).PaletteImageFeature);
featureRegistry.register((await import('../palette/features/paletteFilters')).PaletteFiltersFeature);

const { registerDocumentProvider } = await import('../store/documentRegistry');
const { registerHistoryProvider } = await import('../store/slices/historySlice');
const { captureEditorConfig, applyEditorConfig, usePaletteEditorStore } = await import('../palette/store/paletteEditorStore');
const { captureGeneratorHistory, restoreGeneratorHistory, useGeneratorStore } = await import('../palette/store/generatorStore');
const { serializeGeneratorDocument, restoreGeneratorDocument } = await import('../palette/store/generatorDocument');
const { installWorking } = await import('../palette/installWorking');

let favientsRestores = 0;
registerDocumentProvider('favients', {
  serialize: () => ({ version: 1, favients: [{ id: 'f1' }] }) as unknown as JsonValue,
  restore: () => { favientsRestores++; },
});
registerHistoryProvider('paletteEditor', { capture: captureEditorConfig, restore: applyEditorConfig });
registerDocumentProvider('stops', { serialize: captureEditorConfig, restore: applyEditorConfig });
registerHistoryProvider('paletteGenerator', { capture: captureGeneratorHistory, restore: restoreGeneratorHistory });
registerDocumentProvider('generator', { serialize: serializeGeneratorDocument, restore: restoreGeneratorDocument });
let imageDoc: JsonValue = { src: null };
registerDocumentProvider('image', { serialize: () => imageDoc, restore: (s) => { imageDoc = s; } });
installWorking();

const { useEngineStore } = await import('../store/engineStore');
const { useWorkingStore, coerceWorkingSnapshot } = await import('../palette/store/workingStore');
const { workingSessionAdapter, validateWorkingSession, captureWorkingSession, applyWorkingSession, WORKING_SESSION_STORAGE_KEY } = await import('../palette/store/workingSession');
const { applyStudioSnapshot } = await import('../palette/store/variantsStore');
const { readSession, restoreSessionOnBoot, applySessionText, installSessionAutosave } = await import('../engine/plugins/Session');
const { useAutosaveSettings, createAutosaveSettingsStore, registerAutosaveSettings, GMT_AUTOSAVE_KEYS } = await import('../engine/store/autosaveStore');
const { getSettings } = await import('../store/settingsRegistry');
// The Explorer's keys, spelled as gradient-explorer/v2/session.ts spells them (that module pulls
// the export UI in, so it is not imported here; smoke:ge-session reads the real keys in a browser).
const GX_KEYS = { enabled: 'gmt.ge.autosave-enabled', intervalSec: 'gmt.ge.autosave-interval-sec' };
const gx = createAutosaveSettingsStore(GX_KEYS);

const engine = () => useEngineStore.getState() as unknown as Record<string, any>;
const undoDepth = (): number => engine().paramUndoStack.length;
const KEY = WORKING_SESSION_STORAGE_KEY;

/** State A: a named gradient with Adjust on it, a stops document, a Recent session id. */
const setStateA = (): void => {
  useWorkingStore.getState().use(cfg('#FF0000', '#0000FF'), 'Alpha', 'Browse');
  useWorkingStore.getState().setName('My session');
  useWorkingStore.setState({ sessionId: 'recent-123' });
  engine().setPaletteGenerator({ hueRotate: 45, contrast: 1.5 });
  engine().setPaletteImage({ colours: 9 });
  usePaletteEditorStore.setState({ config: cfg('#00FF00', '#FFFF00') });
  useGeneratorStore.setState({ detail: 12 });
};
/** State B: something else entirely. */
const setStateB = (): void => {
  useWorkingStore.getState().use(cfg('#000000', '#FFFFFF'), 'Beta', 'Browse');
  engine().setPaletteGenerator({ hueRotate: 0, contrast: 1 });
  engine().setPaletteImage({ colours: 5 });
  usePaletteEditorStore.setState({ config: cfg('#111111', '#222222') });
  useGeneratorStore.setState({ detail: 8 });
};
const isStateA = (): boolean => {
  const w = useWorkingStore.getState();
  return w.input.kind === 'gradient' && w.input.config.stops[0].color.toUpperCase() === '#FF0000' && w.name === 'My session'
    && engine().paletteGenerator.hueRotate === 45 && engine().paletteGenerator.contrast === 1.5
    && engine().paletteImage.colours === 9
    && usePaletteEditorStore.getState().config.stops[0].color.toUpperCase() === '#00FF00'
    && useGeneratorStore.getState().detail === 12;
};
const isStateB = (): boolean => {
  const w = useWorkingStore.getState();
  return w.input.kind === 'gradient' && w.input.config.stops[0].color.toUpperCase() === '#000000'
    && engine().paletteGenerator.hueRotate === 0 && engine().paletteImage.colours === 5
    && usePaletteEditorStore.getState().config.stops[0].color.toUpperCase() === '#111111'
    && useGeneratorStore.getState().detail === 8;
};

setStateA();
const bodyA = captureWorkingSession({ compact: false });
const textA = encodeSession(FORMAT, 1, bodyA as unknown as Record<string, unknown>);

console.log('\n[3] the adapter\'s gate');
{
  ok(validateWorkingSession(JSON.parse(JSON.stringify(bodyA))) !== null, 'a captured body passes');
  ok(!('favients' in bodyA.documents), 'a capture carries no favients document');
  ok(!('paletteFilters' in bodyA.features), 'a capture carries no browse filters');
  const noWorking = JSON.parse(JSON.stringify(bodyA));
  delete noWorking.documents.working;
  ok(validateWorkingSession(noWorking) === null, 'a body without a working document is refused');
  const badInput = JSON.parse(JSON.stringify(bodyA));
  badInput.documents.working.input = { kind: 'teleport' };
  ok(validateWorkingSession(badInput) === null, 'a working document with a garbage input is refused');
  const polluted = JSON.parse(textA.replace('"documents":{', '"documents":{"__proto__":{"pwned":1},'));
  ok(validateWorkingSession(polluted.body) === null, 'a `__proto__` key in documents is refused');
  const extra = JSON.parse(JSON.stringify(bodyA));
  extra.documents.favients = { version: 1, favients: [] };
  extra.features.paletteFilters = { keptIds: ['x'] };
  const v = validateWorkingSession(extra);
  ok(v !== null && !('favients' in v.documents), 'validation strips a favients document a file carries');
  ok(v !== null && !('paletteFilters' in v.features), 'validation drops the browse filters a file carries');
  ok(validateWorkingSession(null) === null && validateWorkingSession([]) === null && validateWorkingSession('x') === null, 'non-objects are refused');
  const r = readSession(workingSessionAdapter, encodeSession(FORMAT, 2, bodyA as unknown as Record<string, unknown>));
  ok(!r.ok && r.reason === 'version', 'readSession refuses a v2 body before the gate sees it');
  const seeded = coerceWorkingSnapshot({ input: { kind: 'build', seeds: [{ position: 0.5, interpolation: 'step' }, { position: 'x' }, null, { position: 2, bias: 0.3 }] } });
  const seeds = seeded?.input.kind === 'build' ? seeded.input.seeds : undefined;
  ok(!!seeds && seeds.length === 2 && seeds[0].interpolation === 'step' && seeds[1].position === 1 && seeds[1].bias === 0.3, 'a live Mix keeps its seeds (malformed dropped, positions clamped)');
}

console.log('\n[4] a BOOT restore');
{
  setStateB();
  engine().clearHistory();
  ok(isStateB() && undoDepth() === 0, '(setup) state B, empty undo stack');
  const r = readSession(workingSessionAdapter, textA);
  ok(r.ok, 'the stored text reads');
  if (r.ok) applyWorkingSession(r.session, 'boot');
  ok(isStateA(), 'the session came back: input, name, Adjust, image dials, stops, generator document');
  ok(useWorkingStore.getState().sessionId === 'recent-123', 'a boot restore keeps the Recent session id (edits keep writing the same entry)');
  ok(undoDepth() === 0, 'a boot restore adds NO undo entry');

  // Mix's slot modifiers have no control in GE v2: a session carrying one restores it at neutral.
  const withMods = JSON.parse(textA);
  withMods.body.features.paletteGenerator = { ...withMods.body.features.paletteGenerator, aHueRotate: 45, bMirror: true, aRepeats: 3 };
  const rm = readSession(workingSessionAdapter, JSON.stringify(withMods));
  if (rm.ok) applyWorkingSession(rm.session, 'boot');
  const pgm = engine().paletteGenerator;
  ok(pgm.aHueRotate === 0 && pgm.bMirror === false && pgm.aRepeats === 1 && pgm.hueRotate === 45, `a session with non-default slot modifiers restores them at default, the Adjust dials intact (aHueRotate ${pgm.aHueRotate}, bMirror ${pgm.bMirror}, aRepeats ${pgm.aRepeats})`);

  // A session saved before a param existed carries no key for it (Adjust's Lightness arrived
  // 2026-09-13): it must restore at the param's DEFAULT, not keep the live value — the feature
  // setter merges. Falsified 2026-09-13 by dropping `featureDefaults` from applyStudioSnapshot
  // in palette/store/variantsStore.ts (lightness stayed 0.3).
  engine().setPaletteGenerator({ lightness: 0.3 });
  const old = JSON.parse(textA);
  delete old.body.features.paletteGenerator.lightness;
  const ro = readSession(workingSessionAdapter, JSON.stringify(old));
  if (ro.ok) applyWorkingSession(ro.session, 'boot');
  ok(engine().paletteGenerator.lightness === 0, `a session without a newer param restores it at its default (lightness ${engine().paletteGenerator.lightness})`);
  engine().clearHistory();

  // end to end through the plugin — autosave is OPT-IN, so first with it at its default (off)
  ok(gx.getState().enabled === false, 'the Explorer’s autosave is OFF by default');
  setStateB(); engine().clearHistory();
  disk.set(KEY, textA);
  ok(restoreSessionOnBoot(workingSessionAdapter, { storageKey: KEY, settings: gx }) === 'clear' && isStateB() && undoDepth() === 0, 'autosave at its default (off): nothing is restored');
  disk.set(KEY, textA);
  gx.setState({ enabled: true });
  ok(restoreSessionOnBoot(workingSessionAdapter, { storageKey: KEY, settings: gx }) === 'restore' && isStateA() && undoDepth() === 0, 'restoreSessionOnBoot with autosave on: restore, no undo entry');
  setStateB(); engine().clearHistory();
  ok(restoreSessionOnBoot(workingSessionAdapter, { storageKey: KEY, settings: gx, preempted: true }) === 'preempted' && isStateB(), 'restoreSessionOnBoot: a share link pre-empts and the state is untouched');
  ok(disk.get(KEY) === textA, 'a pre-empted boot keeps the stored session (the autosave overwrites it later)');
  disk.set(KEY, '{"format":"gmt-gx-session","version":1,"body":{"features":{},"documents":{}}}');
  ok(restoreSessionOnBoot(workingSessionAdapter, { storageKey: KEY, settings: gx }) === 'fresh' && isStateB(), 'a stored body without a working document → fresh, state untouched');
  disk.set(KEY, 'garbage{');
  ok(restoreSessionOnBoot(workingSessionAdapter, { storageKey: KEY, settings: gx }) === 'fresh' && isStateB(), 'garbage storage → fresh, no throw');
  disk.set(KEY, textA);
  gx.setState({ enabled: false });
  ok(restoreSessionOnBoot(workingSessionAdapter, { storageKey: KEY, settings: gx }) === 'clear' && isStateB() && !disk.has(KEY), 'autosave off → clear: nothing restored, the key removed');
  gx.setState({ enabled: true });
}

console.log('\n[5] a FILE load');
{
  setStateB();
  engine().clearHistory();
  favientsRestores = 0;
  const withShelf = JSON.parse(textA);
  withShelf.body.documents.favients = { version: 1, favients: [{ id: 'intruder' }] };
  withShelf.body.features.paletteGenerator = { ...withShelf.body.features.paletteGenerator, bHueRotate: -90 };
  ok(applySessionText(workingSessionAdapter, JSON.stringify(withShelf)) === true, 'a good file applies');
  ok(isStateA(), 'the file\'s session is in place');
  ok(undoDepth() === 1, `a file load is exactly ONE undo entry (${undoDepth()})`);
  ok(engine().paletteGenerator.bHueRotate === 0, `a FILE carrying a slot modifier loads it at default too (bHueRotate ${engine().paletteGenerator.bHueRotate})`);
  ok(useWorkingStore.getState().sessionId === null && useWorkingStore.getState().sessionPinned === false, 'the file\'s Recent session id is forgotten');
  engine().undoParam();
  ok(isStateB(), 'one undo puts back what was there before the load');
  engine().redoParam();
  ok(isStateA(), 'redo re-applies it');
  // the second strip: applyStudioSnapshot itself, handed a snapshot that skipped validation
  applyStudioSnapshot({ features: {}, documents: { favients: { favients: [] } as unknown as JsonValue } }, []);
  ok(favientsRestores === 0, `the favients provider is never invoked (${favientsRestores})`);

  const depth = undoDepth();
  setStateB(); engine().clearHistory();
  ok(applySessionText(workingSessionAdapter, 'not a session at all') === false, 'a garbage file is refused (false, no throw)');
  ok(applySessionText(workingSessionAdapter, encodeSession(FORMAT, 7, bodyA as unknown as Record<string, unknown>)) === false, 'a future-version file is refused');
  ok(isStateB() && undoDepth() === 0, `a refused file changes nothing and adds no entry (was ${depth} before the reset)`);
}

console.log('\n[6] the autosave loop');
{
  disk.delete(KEY);
  setStateB();
  gx.setState({ enabled: false, intervalSec: 600 });
  const uninstall = installSessionAutosave(workingSessionAdapter, { storageKey: KEY, settings: gx });
  setStateA();
  fire('pagehide');
  ok(!disk.has(KEY), 'with autosave at its default (off), a changed session is NOT written');
  setStateB();
  gx.getState().setEnabled(true);
  fire('pagehide');
  ok(!disk.has(KEY), 'an untouched boot writes nothing (first-run stays first-run)');
  setStateA();
  fire('pagehide');
  const stored = disk.get(KEY);
  const back = stored ? readSession(workingSessionAdapter, stored) : null;
  ok(!!back && back.ok, 'a change is written on pagehide, and reads back as a valid session');
  disk.set(KEY, 'sentinel');
  fire('pagehide');
  ok(disk.get(KEY) === 'sentinel', 'an unchanged session is not rewritten');
  // a refused full write retries compact
  imageDoc = { src: 'data:image/jpeg;base64,' + 'A'.repeat(50_000) };
  quota = 20_000;
  fire('pagehide');
  const compact = disk.get(KEY);
  const c = compact && compact !== 'sentinel' ? JSON.parse(compact) : null;
  ok(!!c && !('image' in c.body.documents) && 'working' in c.body.documents, 'a refused write retries COMPACT: written without the image, with the working document');
  quota = Infinity;
  imageDoc = { src: null };
  gx.getState().setEnabled(false);
  ok(!disk.has(KEY), 'switching autosave off removes the stored session');
  disk.delete(KEY); // so the next assertion stands on the write gate alone, not on the removal
  setStateB();
  fire('pagehide');
  ok(!disk.has(KEY), 'and nothing is written while it is off');
  uninstall();
}

console.log('\n[7] autosave is PER APP');
{
  disk.delete(GX_KEYS.enabled); disk.delete(GX_KEYS.intervalSec);
  disk.delete(GMT_AUTOSAVE_KEYS.enabled); disk.delete(GMT_AUTOSAVE_KEYS.intervalSec);
  ok(GMT_AUTOSAVE_KEYS.enabled === 'gmt-autosave-enabled' && GMT_AUTOSAVE_KEYS.intervalSec === 'gmt-autosave-interval-sec', 'app-gmt keeps its original keys, byte for byte');
  ok(gx !== useAutosaveSettings, 'the Explorer and app-gmt hold different stores');
  ok(createAutosaveSettingsStore(GX_KEYS) === gx, 'asking for the same keys again returns the same store (no two caches over one key)');
  gx.getState().setEnabled(true);
  gx.getState().setIntervalSec(45);
  ok(disk.get(GX_KEYS.enabled) === '1' && disk.get(GX_KEYS.intervalSec) === '45', 'the Explorer writes its own keys');
  ok(!disk.has(GMT_AUTOSAVE_KEYS.enabled) && !disk.has(GMT_AUTOSAVE_KEYS.intervalSec), 'toggling the Explorer’s autosave does not change gmt-autosave-enabled (or the interval)');
  ok(useAutosaveSettings.getState().enabled === false, 'and app-gmt’s store still reads off');
  useAutosaveSettings.getState().setEnabled(true);
  gx.getState().setEnabled(false);
  ok(disk.get(GMT_AUTOSAVE_KEYS.enabled) === '1' && disk.get(GX_KEYS.enabled) === '0', 'app-gmt ON and the Explorer OFF hold at once');
  disk.set(KEY, textA);
  ok(restoreSessionOnBoot(workingSessionAdapter, { storageKey: KEY, settings: gx }) === 'clear', 'app-gmt’s autosave being ON does not make the Explorer restore');

  // The Settings rows read and write the store they are handed — as registerCoreSettings({ autosave }) does in the Explorer.
  registerAutosaveSettings(gx, { enabledDescription: 'gx words' });
  const row = getSettings().find((d) => d.id === 'autosave.enabled');
  const interval = getSettings().find((d) => d.id === 'autosave.interval');
  ok(!!row && row.description === 'gx words', 'the Explorer’s rows carry its own wording');
  row?.set?.(true);
  interval?.set?.(120);
  ok(disk.get(GX_KEYS.enabled) === '1' && gx.getState().enabled === true && row?.get?.() === true, 'the Autosave row writes the Explorer’s key and reads it back');
  ok(disk.get(GX_KEYS.intervalSec) === '120', 'the interval row writes the Explorer’s key');
  ok(disk.get(GMT_AUTOSAVE_KEYS.enabled) === '1' && !disk.has(GMT_AUTOSAVE_KEYS.intervalSec), 'the rows leave app-gmt’s keys exactly as they were');
  row?.set?.(false);
  ok(disk.get(GMT_AUTOSAVE_KEYS.enabled) === '1', 'switching the Explorer’s row off leaves gmt-autosave-enabled on');
}

console.log('\n[8] a RAMP gradient round-trips through a session (ADR-0122)');
{
  const { encodeRamp, isRampGradient } = await import('../utils/gradientRamp');
  const ramp = encodeRamp(Array.from({ length: 256 }, (_, i) => ({ r: i % 2 ? 0 : 255, g: i, b: 255 - i })));
  const editorRamp = encodeRamp(Array.from({ length: 256 }, (_, i) => ({ r: 255 - i, g: 40, b: i })));
  useWorkingStore.getState().use({ stops: [], ramp, colorSpace: 'srgb', blendSpace: 'oklab' }, 'Zebra', 'Browse');
  usePaletteEditorStore.setState({ config: { stops: [], ramp: editorRamp, colorSpace: 'linear', blendSpace: 'oklab' } });
  const text = encodeSession(FORMAT, 1, captureWorkingSession({ compact: false }) as unknown as Record<string, unknown>);
  ok(text.includes(ramp) && text.includes(editorRamp), '(setup) the captured session text carries both ramp strings');
  setStateB();
  engine().clearHistory();
  const r = readSession(workingSessionAdapter, text);
  ok(r.ok, 'a session holding ramp gradients passes the gate');
  if (r.ok) applyWorkingSession(r.session, 'boot');
  const w = useWorkingStore.getState().input;
  ok(w.kind === 'gradient' && isRampGradient(w.config) && w.config.ramp === ramp, '[8] the working input comes back as the same ramp gradient, byte-exact');
  const ed = usePaletteEditorStore.getState().config;
  ok(isRampGradient(ed) && ed.ramp === editorRamp && ed.colorSpace === 'linear', '[8] the stops document comes back as its ramp gradient, byte-exact');

  // A stop document carrying a stale ramp is saved in its pre-ramp form.
  usePaletteEditorStore.setState({ config: { ...cfg('#00FF00', '#FFFF00'), ramp } });
  const stale = captureWorkingSession({ compact: false }).documents.stops as Record<string, unknown>;
  ok(!!stale && !('ramp' in stale) && JSON.stringify(stale) === JSON.stringify(cfg('#00FF00', '#FFFF00')), '[8] a stop document is captured without a stale ramp');
}

if (failures) {
  console.error(`\n✗ ${failures} failure(s)`);
  process.exit(1);
}
console.log('\n✓ all green');
