/**
 * help check: Help's topics, the shortcuts page and the first-dive lesson of the Deep Zoom shell
 * (`deep-zoom/help/`, `deep-zoom/tutorial/`) against the app's own keys, names and stores. Node
 * only, no browser.
 *
 *   npx tsx debug/deep-zoom-checks/help.mts        (npm run check:deep-zoom-help)
 *
 * What it is for: help text rots silently. A key moves in deep-zoom/hotkeys.ts, a button is
 * renamed, and the topic goes on naming the old one. Each block below is one way that can happen.
 *
 *   topics   every id in help/ids.ts has a topic and every topic has an id from there; a parent
 *            exists; a category is one the help browser orders; none of the words a first-time
 *            user cannot follow; What's New is one short entry under this app's version
 *   keys     every key a topic names (backticks mean a key there) and every key cap of the lesson
 *            is REGISTERED - by the calls this check makes as main.tsx makes them: this app's
 *            hotkeys, the engine's undo, scene and help plugins, the location slots - or is a fly
 *            key of help/flyKeys.ts, or one of the two the timeline registers when it mounts
 *            (those are read off its source). No fly key is registered.
 *   names    every bold name in the seven topics is a button, row, tab or heading that the named
 *            source file still spells that way, or a movement of the mouse
 *   page     the shortcuts page is written from the registry: its rows stand for every entry,
 *            the two runs of nine are one row each, a shortcut registered later is on it at the
 *            next read, and the fly keys' table heads it
 *   lesson   seven cards; each waits for an action this app fires, the last for its button; no
 *            card changes anything on entry or exit; the first card's button says the depth its
 *            dive goes to
 *   bridge   deep-zoom/tutorial/hostEvents.ts against the real stores: each of the five actions
 *            fires on its deed and not on its look-alike, only while a lesson is active
 *   first    the first visit: nothing before the renderer is ready, the lesson at ready, "seen"
 *            written when it ends
 *
 * What is real: the shortcuts registry and every registration named above, the engine store, the
 * animation store, the telemetry store, the tutorial plugin's registries and action bus. What is
 * fake: the host (a camera that is three strings and three angles), `localStorage` (a Map), and
 * the app's own Help install, which cannot load here (it reaches the feedback client, which reads
 * the build's environment): its two choices that matter - hints kept, the three topic ids - are
 * read off its source. NOT here: that the help browser draws the page, that the menu's rows open
 * what they say, that the card shows and each deed is done by a real hand - driven in the app on
 * 2026-10-12 (debug/scratch/help/app-help.mts, git-ignored).
 *
 * FALSIFICATION RECORD, 2026-10-12, one break per run, the file put back byte for byte after each
 * (three breaks: the stage's allowance). The break, then what went red:
 *   - keys:   deep-zoom/hotkeys.ts, the colouring key `'v'` -> `'n'`             -> 1 red: "keys: every key the topics
 *             name is registered or a fly key" (V in dz.look; V in dz.whats-new). Every "page:" line stayed green, as
 *             it should: the page follows the registry and printed N.
 *   - names:  deep-zoom/components/RoutePanel.tsx, the button's words "Route to here" -> "Route from trail"
 *                                                                               -> 1 red: "names: every name is still spelled
 *             that way in its source file" (Route to here). (The first version of that line looked for the bare name
 *             and would have stayed green: the file's own header says "Route to here" too. Four names that a header
 *             or a comment also spells are looked for as the button writes them.)
 *   - bridge: deep-zoom/tutorial/hostEvents.ts, "the view at landing is another than at take-off" taken out of the
 *             flight's test (`&& landedAt !== tookOffAt` removed)               -> 1 red: "bridge: a flight that moved
 *             nothing fires nothing"
 * NOT FALSIFIED: the "topics:", "page:", "lesson:" and "first:" lines, and the other four actions of the bridge.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Before anything of the app loads: a `localStorage` to write "seen" into (node has none).
const storage = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
    setItem: (k: string, v: string) => { storage.set(k, String(v)); },
    removeItem: (k: string) => { storage.delete(k); },
    clear: () => { storage.clear(); },
    key: (i: number) => [...storage.keys()][i] ?? null,
    get length() { return storage.size; },
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let failed = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? `  [${detail}]` : ''}`);
    if (!ok) failed++;
}

const { shortcuts } = await import('../../engine/plugins/Shortcuts.ts');
const { useEngineStore } = await import('../../store/engineStore.ts');
const { useAnimationStore } = await import('../../store/animationStore.ts');
const { DZ_TOPIC } = await import('../../deep-zoom/help/ids.ts');
const { DZ_HELP_TOPICS } = await import('../../deep-zoom/help/topics.ts');
const { FLY_KEYS, FLY_KEY_NAMES } = await import('../../deep-zoom/help/flyKeys.ts');
const { keyLabel, shortcutGroups, shortcutsMarkdown } = await import('../../deep-zoom/help/shortcutsPage.ts');
const { DZ_VERSION } = await import('../../deep-zoom/version.ts');

// ── the registry, filled as main.tsx fills it (what can be called here) ─────────────────────────
(await import('../../engine/plugins/Undo.tsx')).installUndo();
(await import('../../engine/plugins/SceneIO.tsx')).installSceneIO({ getCanvas: () => null });
(await import('../../engine/plugins/Help.tsx')).installHelp({});       // the app's own call keeps the hints: read off its source below
(await import('../../deep-zoom/locations.ts')).installLocations();
(await import('../../deep-zoom/hotkeys.ts')).registerDeepZoomHotkeys();
const registered = new Set(shortcuts.list().map((d) => keyLabel(d.key)));
/** Registered by a component when it mounts, which a node check cannot do: the key, and where it is. */
const MOUNTED: Array<[label: string, file: string, needle: RegExp]> = [
    ['T', 'components/TimelineHost.tsx', /key:\s*'t'/],
    ['Space', 'components/TimelineHost.tsx', /key:\s*'Space'/],
];
const mounted = new Set(MOUNTED.filter(([, file, needle]) => needle.test(read(file))).map(([label]) => label));
const fly = new Set(FLY_KEY_NAMES);
const known = (key: string): boolean => registered.has(key) || mounted.has(key) || fly.has(key);

// ── topics ──────────────────────────────────────────────────────────────────────────────────────
const ids = Object.values(DZ_TOPIC) as string[];
const topics = Object.values(DZ_HELP_TOPICS);
const SEVEN: string[] = [DZ_TOPIC.flying, DZ_TOPIC.depth, DZ_TOPIC.places, DZ_TOPIC.routes, DZ_TOPIC.rendering, DZ_TOPIC.formulas, DZ_TOPIC.look];
check(ids.every((id) => DZ_HELP_TOPICS[id]?.id === id), 'topics: every id in help/ids.ts has a topic', ids.filter((id) => !DZ_HELP_TOPICS[id]).join(', '));
check(Object.keys(DZ_HELP_TOPICS).every((id) => ids.includes(id)), 'topics: every topic has an id from help/ids.ts', Object.keys(DZ_HELP_TOPICS).filter((id) => !ids.includes(id)).join(', '));
check(topics.every((t) => !t.parentId || !!DZ_HELP_TOPICS[t.parentId]), 'topics: every parent is a topic');
const ordered = /CATEGORY_ORDER = \[([^\]]+)\]/.exec(read('components/HelpBrowser.tsx'))?.[1] ?? '';
check(topics.every((t) => ordered.includes(`'${t.category}'`) || ordered.includes(`"${t.category}"`)), 'topics: every category is one the help browser orders',
    topics.filter((t) => !ordered.includes(t.category)).map((t) => t.category).join(', '));
check(SEVEN.every((id) => DZ_HELP_TOPICS[id]?.content.trim().length > 200), 'topics: the seven topics are there, each with text');
const install = read('deep-zoom/help/installDeepZoomHelp.tsx');
check(/gettingStartedTopicId:\s*DZ_TOPIC\.flying/.test(install) && /shortcutsTopicId:\s*DZ_TOPIC\.shortcuts/.test(install) && /topicId:\s*DZ_TOPIC\.whatsNew/.test(install),
    'topics: the menu opens Getting Started, Keyboard Shortcuts and What\'s New by ids from help/ids.ts');
check(/import\('\.\/topics'\)/.test(install) && !/from '\.\/topics'/.test(install) && !/^import /m.test(read('deep-zoom/help/ids.ts')),
    'topics: the Help install loads the topics lazily, and help/ids.ts imports nothing');
const HARD_WORDS = ['perturbation', 'f32', 'f64', 'kernel', 'reference orbit', 'shader', '256-bit', 'bigint'];
const written = topics.filter((t) => t.id !== DZ_TOPIC.shortcuts);
const hard = written.flatMap((t) => HARD_WORDS.filter((w) => t.content.toLowerCase().includes(w)).map((w) => `${t.id}: ${w}`));
check(hard.length === 0, 'topics: none of the words a first-time user cannot follow', hard.join('; '));
const news = DZ_HELP_TOPICS[DZ_TOPIC.whatsNew].content;
const entries = news.split('\n').filter((l) => l.startsWith('## '));
const bullets = news.split('\n').filter((l) => l.startsWith('- '));
check(entries.length === 1 && entries[0].startsWith(`## ${DZ_VERSION} `), `topics: What's New is one entry, under this app's version (${DZ_VERSION})`, entries.join(' | '));
check(bullets.length > 0 && bullets.length <= 8, `topics: What's New has at most eight bullets (${bullets.length}; the longest ${Math.max(...bullets.map((b) => b.length))} characters)`);

// ── keys ────────────────────────────────────────────────────────────────────────────────────────
const namedKeys = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const unknown = written.flatMap((t) => namedKeys(t.content).filter((k) => !known(k)).map((k) => `${k} in ${t.id}`));
check(unknown.length === 0, `keys: every key the topics name is registered or a fly key (${new Set(written.flatMap((t) => namedKeys(t.content))).size} keys named)`, [...new Set(unknown)].join('; '));
check(MOUNTED.every(([label]) => mounted.has(label)), 'keys: T and Space are still registered where the timeline mounts', MOUNTED.filter(([label]) => !mounted.has(label)).map(([label, file]) => `${label}: ${file}`).join('; '));
check(FLY_KEY_NAMES.every((k) => !registered.has(k)), 'keys: no fly key is a registered shortcut', FLY_KEY_NAMES.filter((k) => registered.has(k)).join(', '));
check(!/hideHints/.test(install), 'keys: the app\'s Help keeps the hints, so H is registered there too');
check(shortcuts.list().some((d) => d.id === 'deep-zoom.help' && d.key === '/'), 'keys: / is registered, as deep-zoom.help');
const nav = read('deep-zoom/DeepZoomNavigation.tsx');
check(['W A S D', 'Space / C', 'Q / E', 'Shift', 'middle drag', 'right drag'].every((s) => nav.includes(s)), 'keys: the navigation\'s header still states the keys the fly table follows');

// ── names ───────────────────────────────────────────────────────────────────────────────────────
/** A name on screen, and the file that spells it (with the text to find there when the bare name would prove nothing). */
const ON_SCREEN: Array<[name: string, file: string, needle?: string]> = [
    ['Dive to 1e-', 'deep-zoom/components/DepthReadout.tsx', '>Dive to 1e-</label>'],
    ['Dive', 'deep-zoom/components/DepthReadout.tsx', '>Dive</button>'],
    ['Stop', 'deep-zoom/components/DepthReadout.tsx', '>Stop</button>'],
    ['Start view', 'deep-zoom/components/DepthReadout.tsx', 'Start view\n                    </button>'],
    ['Locations', 'deep-zoom/panels.ts', "id: 'Locations'"],
    ['Starter dives', 'deep-zoom/panels.ts', "label: 'Starter dives'"],
    ['Mandelbox', 'deep-zoom/panels.ts', "label: 'Mandelbox'"],
    ['KaliBox', 'deep-zoom/panels.ts', "label: 'KaliBox'"],
    ['Kept places', 'deep-zoom/panels.ts', "label: 'Kept places'"],
    ['My locations', 'deep-zoom/panels.ts', "label: 'My locations'"],
    ['Save this view', 'deep-zoom/components/LocationsPanel.tsx', '/> Save this view'],
    ['Copy location', 'deep-zoom/components/LocationText.tsx', '>Copy location</button>'],
    ['Paste location', 'deep-zoom/components/LocationText.tsx', '>Paste location</button>'],
    ['Copy link', 'deep-zoom/components/LocationText.tsx', '>Copy link</button>'],
    ['Export all', 'deep-zoom/components/LocationText.tsx', '>Export all</button>'],
    ['Import', 'deep-zoom/components/LocationText.tsx', '>Import</button>'],
    ['Route', 'deep-zoom/panels.ts', "id: 'Route'"],
    ['Add keyframe', 'deep-zoom/components/RoutePanel.tsx', '/> Add keyframe'],
    ['Replace keyframe', 'deep-zoom/components/RoutePanel.tsx', '/> Replace keyframe'],
    ['Play', 'deep-zoom/components/RoutePanel.tsx', "'Pause' : 'Play'"],
    ['Render', 'deep-zoom/components/RoutePanel.tsx', '/> Render'],
    ['Trail', 'deep-zoom/components/RoutePanel.tsx', '/> Trail'],
    ['Route to here', 'deep-zoom/components/RoutePanel.tsx', 'Route to here\n'],
    ['Smoothing', 'deep-zoom/components/RoutePanel.tsx', 'label="Smoothing"'],
    ['As flown', 'deep-zoom/components/RoutePanel.tsx', 'As flown\n'],
    ['Even pace', 'deep-zoom/components/RoutePanel.tsx', 'Even pace\n'],
    ['Reverse', 'deep-zoom/components/RoutePanel.tsx', 'Reverse\n'],
    ['Return', 'deep-zoom/components/RoutePanel.tsx', 'Return\n'],
    ['Clear', 'deep-zoom/components/RoutePanel.tsx', 'Clear\n'],
    ['PNG sequence (folder)', 'engine/plugins/RenderDialog/ConfigForm.tsx', "? 'PNG sequence (folder)'"],
    ['MP4', 'data/constants.ts', "label: 'MP4 ("],
    ['WebM', 'data/constants.ts', "label: 'WebM ("],
    ['Interrupt Render', 'engine/plugins/RenderDialog/RenderingView.tsx', 'label="Interrupt Render"'],
    ['Resume', 'engine/plugins/RenderDialog/RenderingView.tsx', 'label="Resume"'],
    ['Finish', 'engine/plugins/RenderDialog/RenderingView.tsx', 'label="Finish"'],
    ['Discard', 'engine/plugins/RenderDialog/RenderingView.tsx', 'label="Discard"'],
    ['Samples / Frame', 'engine/plugins/RenderDialog/ConfigForm.tsx', 'label="Samples / Frame"'],
    ['Draft', 'deep-zoom/routeRender.tsx', "label: 'Draft'"],
    ['Overwrite', 'deep-zoom/routeRender.tsx', "label: 'Overwrite'"],
    ['Continue', 'deep-zoom/routeRender.tsx', "label: 'Continue'"],
    ['Cancel', 'deep-zoom/routeRender.tsx', "label: 'Cancel'"],
    ['Save Scene (PNG)', 'engine/plugins/SceneIO.tsx', "label: 'Save Scene (PNG)'"],
    ['Formula', 'deep-zoom/panels.ts', "id: 'Formula'"],
    ['Power', 'deep-zoom/features/formula.ts', "label: 'Power'"],
    ['Phase theta', 'deep-zoom/features/formula.ts', "label: 'Phase theta'"],
    ['Phase phi', 'deep-zoom/features/formula.ts', "label: 'Phase phi'"],
    ['Burning', 'deep-zoom/features/formula.ts', "label: 'Burning'"],
    ['Burning mix', 'deep-zoom/features/formula.ts', "label: 'Burning mix'"],
    ['Scale', 'deep-zoom/features/formula.ts', "label: 'Scale'"],
    ['Min Radius', 'deep-zoom/features/formula.ts', "label: 'Min Radius'"],
    ['Folding Limit', 'deep-zoom/features/formula.ts', "label: 'Folding Limit'"],
    ['Fixed Radius', 'deep-zoom/features/formula.ts', "label: 'Fixed Radius'"],
    ['Pre-Rotation', 'deep-zoom/features/formula.ts', "label: 'Pre-Rotation'"],
    ['Julia mode', 'deep-zoom/features/formula.ts', "label: 'Julia mode'"],
    ['Constant', 'deep-zoom/features/formula.ts', "label: 'Constant',"],
    ['Iterations', 'deep-zoom/features/formula.ts', "label: 'Iterations'"],
    ['Auto iterations', 'deep-zoom/features/formula.ts', "label: 'Auto iterations'"],
    ['Kleinian', 'deep-zoom/data/boxStarters.ts', 'name: "Kleinian'],
    ['MinRad2', 'deep-zoom/features/formula.ts', "label: 'MinRad2'"],
    ['Translation', 'deep-zoom/features/formula.ts', "label: 'Translation',"],
    ['Rotation', 'deep-zoom/features/formula.ts', "label: 'Rotation'"],
    ["GMT's preset", 'deep-zoom/data/kaliStarters.ts', 'name: "GMT\'s preset'],
    ['Julia from this place', 'deep-zoom/components/JuliaHere.tsx', 'Julia from this place\n'],
    ['Shading', 'deep-zoom/features/light.ts', "SHADING_OPTIONS, 'Shading'"],
    ['Light type', 'deep-zoom/features/light.ts', "LIGHT_TYPE_OPTIONS, 'Light type'"],
    ['Occlusion radius', 'deep-zoom/features/light.ts', "label: 'Occlusion radius'"],
    ['Occlusion samples', 'deep-zoom/features/light.ts', "label: 'Occlusion samples'"],
    ['Plain', 'deep-zoom/features/colour.ts', "label: 'Plain'"],
    ['Gradient', 'deep-zoom/features/colour.ts', "label: 'Gradient'"],
    ['Mapping', 'deep-zoom/features/colour.ts', "label: 'Mapping'"],
    ['Scale', 'deep-zoom/features/colour.ts', "label: 'Scale'"],
    ['Accumulate', 'deep-zoom/features/quality.ts', "label: 'Accumulate'"],
    ['Frame size', 'deep-zoom/features/quality.ts', "label: 'Frame size'"],
    ['Detail', 'deep-zoom/features/quality.ts', "label: 'Detail'"],
    ['Reach', 'deep-zoom/features/quality.ts', "REACH_OPTIONS, 'Reach'"],
    ['Hit refine', 'deep-zoom/features/quality.ts', "label: 'Hit refine'"],
];
/** Bold that is no name: what a hand does. */
const HANDS = ['Drag the picture', 'The wheel on the picture', 'Drag', 'The wheel', 'Right drag'];
const sources = new Map<string, string>();
const source = (file: string): string => { if (!sources.has(file)) sources.set(file, read(file).replace(/\r\n/g, '\n')); return sources.get(file)!; };
const gone = ON_SCREEN.filter(([name, file, needle]) => !source(file).includes(needle ?? name)).map(([name, file]) => `${name} (${file})`);
check(gone.length === 0, `names: every name is still spelled that way in its source file (${ON_SCREEN.length} names)`, gone.join('; '));
const names = new Set([...ON_SCREEN.map(([name]) => name), ...HANDS]);
const bold = SEVEN.flatMap((id) => [...DZ_HELP_TOPICS[id].content.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => ({ id, name: m[1] })));
const stray = bold.filter((b) => !names.has(b.name)).map((b) => `${b.name} in ${b.id}`);
check(bold.length > 40 && stray.length === 0, `names: every bold name in the seven topics is one of them, or a movement of the mouse (${bold.length} uses)`, [...new Set(stray)].join('; '));

// ── page ────────────────────────────────────────────────────────────────────────────────────────
const defs = shortcuts.list();
const groups = shortcutGroups();
const rows = groups.flatMap((g) => g.rows);
const stoodFor = rows.reduce((n, row) => n + row.count, 0);
check(defs.length >= 46 && stoodFor === defs.length, `page: the rows stand for every registered shortcut (${stoodFor} of ${defs.length})`);
const runs = rows.filter((row) => row.run);
check(runs.length === 2 && runs.every((row) => row.count === 9) && runs.some((row) => row.keys.join() === '1,9' && row.text === 'Go to location 1 to 9')
    && runs.some((row) => row.keys.join() === 'Ctrl+1,Ctrl+9' && row.text === 'Save this view as location 1 to 9'),
'page: the eighteen slot keys are two rows, "1 to 9"', runs.map((row) => `${row.keys.join('..')} ${row.text} x${row.count}`).join(' | '));
const page = shortcutsMarkdown();
const printed = new Set(namedKeys(page));
const unprinted = defs.map((d) => keyLabel(d.key)).filter((k) => !printed.has(k) && !/^(Ctrl\+)?[2-8]$/.test(k));
check(unprinted.length === 0, 'page: every registered key is printed, but for the middles of the two runs', unprinted.join(', '));
check(groups[0]?.title === 'Locations' && groups.findIndex((g) => g.title === 'Edit') > groups.findIndex((g) => g.title === 'Help'), 'page: this app\'s own groups come first, the engine\'s after',
    groups.map((g) => g.title).join(', '));
check(page.indexOf('## Flying') >= 0 && page.indexOf('## Flying') < page.indexOf('## Locations') && FLY_KEYS.every((g) => page.includes(`### ${g.title}`)) && FLY_KEY_NAMES.every((k) => printed.has(k)),
    'page: the fly keys\' table heads it, every group and every key of it');
const topic = DZ_HELP_TOPICS[DZ_TOPIC.shortcuts];
shortcuts.register({ id: 'check.late', key: 'F9', description: 'A late one', category: 'Check', handler: () => undefined });
const late = topic.content.includes('`F9` A late one') && topic.content.includes('## Check');
shortcuts.unregister('check.late');
check(late && !topic.content.includes('A late one'), 'page: the topic\'s text is read from the registry each time: a shortcut registered later is on it, and off it again when it goes');
check(keyLabel('Mod+Shift+z') === 'Ctrl+Shift+Z' && keyLabel('Escape') === 'Esc' && keyLabel('`') === 'Backtick' && keyLabel('Shift+b') === 'Shift+B' && keyLabel('Alt+S') === 'Alt+S',
    'page: a key is printed by its name: Ctrl+Shift+Z, Esc, Backtick, Shift+B');
const scoped = shortcutGroups([{ id: 'x.1', key: 'Escape', scope: 'dismiss::r9:', description: 'Dismiss', handler: () => undefined }, { id: 'x.2', key: 'q', handler: () => undefined }]);
check(scoped.length === 1 && scoped[0].title === 'Other' && scoped[0].rows[0].text === 'Dismiss (while its window or tool is open)' && scoped[0].rows[1].text === '(x.2)',
    'page: a scope it has no words for is said in general words, never by its name; an entry that says nothing is shown by its id', JSON.stringify(scoped));

// ── lesson ──────────────────────────────────────────────────────────────────────────────────────
const { firstDiveLesson, installFirstDive, DZ_FIRST_DIVE_SEEN_KEY, FIRST_DIVE_LESSON_ID } = await import('../../deep-zoom/tutorial/firstDive.ts');
const { DZ_ACTION } = await import('../../deep-zoom/tutorial/hostEvents.ts');
const { FIRST_DIVE_LABEL, FIRST_DIVE_STARTER, DZ_STEP_DIVE } = await import('../../deep-zoom/tutorial/steps.tsx');
const { actionBus, stepRenderers, tutorTriggers, getLesson } = await import('../../engine/plugins/Tutorial.tsx');
const { writeTelemetry, DZ_TELEMETRY_INITIAL } = await import('../../deep-zoom/host/telemetry.ts');
const { setHost } = await import('../../deep-zoom/host/current.ts');
const { useDive } = await import('../../deep-zoom/diveControl.ts');
const { setFlying } = await import('../../deep-zoom/navigationState.ts');
const { ROUTE_TRACK } = await import('../../deep-zoom/route.ts');

const steps = firstDiveLesson.steps;
const actions = Object.values(DZ_ACTION) as string[];
check(steps.length === 7 && new Set(steps.map((s) => s.id)).size === 7, `lesson: seven cards, each with its own id (${steps.map((s) => s.id).join(', ')})`);
check(steps.slice(0, -1).every((s) => s.trigger.kind === 'action' && actions.includes(s.trigger.name)) && steps[steps.length - 1].trigger.kind === 'manual',
    'lesson: every card but the last waits for an action this app fires; the last for its own button', steps.map((s) => `${s.id}: ${s.trigger.kind} ${s.trigger.name ?? ''}`).join('; '));
check(steps.every((s) => !s.onExit && !s.onEnter && !s.forceTab) && !firstDiveLesson.onStart, 'lesson: no card changes anything when it is entered or left, and the lesson nothing when it starts');
const caps = steps.flatMap((s) => (s.showKeys ?? []).filter((k: string) => !known(k)).map((k: string) => `${k} on ${s.id}`));
check(steps.some((s) => (s.showKeys ?? []).length > 0) && caps.length === 0, 'lesson: every key cap is a registered key or a fly key', caps.join('; '));
check(steps[0].kind === DZ_STEP_DIVE && FIRST_DIVE_STARTER.name.startsWith('Surface') && FIRST_DIVE_LABEL === 'Dive to 1e-6' && FIRST_DIVE_STARTER.depth < FIRST_DIVE_STARTER.startDepth,
    `lesson: the first card's button says where its dive goes ("${FIRST_DIVE_LABEL}", the starter "${FIRST_DIVE_STARTER.name}")`);

// ── first: the first visit, before and at ready ─────────────────────────────────────────────────
const state = () => useEngineStore.getState();
installFirstDive();
check(getLesson(FIRST_DIVE_LESSON_ID) === firstDiveLesson && !!stepRenderers.get(DZ_STEP_DIVE) && !!tutorTriggers.get('action') && !!tutorTriggers.get('manual'),
    'first: the install registers the lesson, its card and the engine\'s triggers');
check(!state().tutorialActive && storage.get(DZ_FIRST_DIVE_SEEN_KEY) === undefined, 'first: nothing starts before the renderer is ready, and nothing is written');
writeTelemetry({ ...DZ_TELEMETRY_INITIAL, mode: 'deep', depth: 1.5, ready: false });
check(!state().tutorialActive, 'first: a renderer that is live and not ready starts nothing');
writeTelemetry({ ...DZ_TELEMETRY_INITIAL, mode: 'deep', depth: 1.5, ready: true });
check(state().tutorialActive && state().tutorialLessonId === FIRST_DIVE_LESSON_ID && state().tutorialStepIndex === 0, 'first: at the first sample that says ready the lesson is on its first card');
check(storage.get(DZ_FIRST_DIVE_SEEN_KEY) === undefined, 'first: "seen" is not written while it is up');

// ── bridge: each action on its deed, with the lesson active ─────────────────────────────────────
const fired: string[] = [];
for (const name of actions) actionBus.on(name, () => { fired.push(name); });
const since = (): string => { const out = fired.join(','); fired.length = 0; return out; };
// a host that is a camera and nothing else
const camera = { cam: ['1', '2', '3'] as [string, string, string], yaw: 0, pitch: 0, roll: 0 };
const fakeHost = { getView: () => ({ ...camera, cam: [...camera.cam] }), ready: new Promise<void>(() => undefined), on: () => () => undefined, bootParams: () => null };
setHost(fakeHost as never);

useDive.setState({ dive: { from: 1, target: 1e-6 } });
const whileDiving = since();
useDive.setState({ dive: null });
check(whileDiving === '' && since() === DZ_ACTION.diveEnded, 'bridge: a dive fires nothing while it flies and dz.dive.ended when it is over');

setFlying(true); setFlying(false);
check(since() === '', 'bridge: a flight that moved nothing fires nothing');
setFlying(true); camera.cam[0] = '5'; setFlying(false);
const moved = since();
setFlying(true); camera.yaw = 0.3; setFlying(false);
check(moved === DZ_ACTION.flightEnded && since() === DZ_ACTION.flightEnded, 'bridge: a flight that moved the camera, and one that only turned it, each fire dz.flight.ended when it lands');

const place = { id: 'a', label: 'A', state: { view: fakeHost.getView(), depth: '1' } };
useEngineStore.setState({ savedLocations: [place] } as never);
const saved = since();
useEngineStore.setState({ savedLocations: [{ ...place, label: 'Renamed' }] } as never);
check(saved === DZ_ACTION.locationSaved && since() === '', 'bridge: a place added fires dz.location.saved; a place renamed does not');

const keysOn = (n: number, playing = false): void => useAnimationStore.setState((s) => ({
    isPlaying: playing,
    sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, [ROUTE_TRACK]: { id: ROUTE_TRACK, type: 'float', label: 'Depth', keyframes: Array.from({ length: n }, (_, i) => ({ id: `k${n}-${i}`, frame: i * 30, value: 1 })) } } },
} as never));
keysOn(1);
const one = since();
keysOn(1);
const replaced = since();
useAnimationStore.setState({ isPlaying: true });
const playedOne = since();
useAnimationStore.setState({ isPlaying: false });
keysOn(2);
const two = since();
useAnimationStore.setState({ isPlaying: true });
check(one === DZ_ACTION.keyframeAdded && replaced === '' && two === DZ_ACTION.keyframeAdded, 'bridge: a keyframe more fires dz.keyframe.added; the same number of keyframes, written anew, does not', `${one} | ${replaced} | ${two}`);
check(playedOne === '' && since() === DZ_ACTION.routePlayed, 'bridge: playing fires dz.route.played with two keyframes on the route, and not with one');
useAnimationStore.setState({ isPlaying: false });

// ── first, the end: it ends, "seen" is written, and the bridge lets go ──────────────────────────
state().completeTutorial();
check(!state().tutorialActive && storage.get(DZ_FIRST_DIVE_SEEN_KEY) === '1', 'first: when the lesson ends "seen" is written');
useDive.setState({ dive: { from: 1, target: 1e-6 } }); useDive.setState({ dive: null });
keysOn(3);
check(since() === '', 'bridge: with no lesson active nothing is fired');
// (Where the engine keeps its own "finished" list - this app's key, not GMT's - cannot be seen here:
// the engine's storage helper writes through `window`, which node has not. Seen in the app instead.)

console.log(failed === 0 ? 'help: all green' : `help: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
