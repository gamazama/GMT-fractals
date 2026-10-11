/**
 * host-contract - the check for package S1-0: the Deep Zoom host contract, its holder and its
 * telemetry store. Node only, no browser, about 3 s.
 *
 *   npx tsx debug/deep-zoom-checks/host-contract.mts      (exit 1 on any FAIL)
 *
 *   [1] contract   `deep-zoom/host/DeepZoomHost.ts` has 0 import lines and no module reference of
 *                  any other kind; holds only type declarations; never spells `Window`, `Document`
 *                  or `DeepZoomInstance` as a whole identifier (comments included); refers to no
 *                  outside type but `HTMLCanvasElement` and `Blob`; exports `DeepZoomHost` with
 *                  every member of BLUEPRINT section 7 and `frameCount(): number`; its header names
 *                  every member and agrees with the interface on which ones are optional; `DzEvents`
 *                  has the seven events; the header's two DOM ids are the constants in `current.ts`.
 *   [2] types      `host-contract-types.ts` type-checks: the contract's `DzView` / `DzTelemetry` /
 *                  `DzPath` are the module's, and the module's settings fit `DzParams`. This runs
 *                  the compiler on that one file, so a drift is red here without a whole-repo tsc
 *                  (`npm run typecheck` reads the same file).
 *   [3] holder     `deep-zoom/host/current.ts`: the name, the two id constants, set / clear /
 *                  subscribe.
 *   [4] telemetry  `deep-zoom/host/telemetry.ts`: 8 Hz, a sample is stored, an equal sample
 *                  notifies nobody, captured, reset, and the file loads nothing but `zustand` and
 *                  the contract.
 *   [5] seam       no file under `deep-zoom/` outside `host/` and `renderer/` loads
 *                  `deep-zoom/renderer`, names `createDeepZoom`, or writes the telemetry store. The
 *                  scanner is first run on made-up sources so a scanner that sees nothing is red.
 *
 * WHEN A LATER PACKAGE CHANGES THE CONTRACT
 *   - A member whose kind changes (optional <-> required): edit the header table in
 *     `DeepZoomHost.ts` in the same change, or "[1] the header names every member" goes red.
 *   - N5 (2026-10-08) removed `isCaptured`, `setInputEnabled` and `captureChanged` with the pointer
 *     capture, and added the four host-input members; the lists below follow. With the roll
 *     (2026-10-10) two of those four, `yawPitch` and `setYawPitch`, became `orientation` and
 *     `setOrientation`, and `DzView` gained `roll?` on both sides. Seen red that day: `roll?` taken
 *     off the contract's `DzView` alone -> 1: [2], on `viewSame` and `pathSame`; `orientation`
 *     taken off the interface -> 1: "every member of BLUEPRINT section 7 is there".
 *   - The render's wait (2026-10-11) added `building` to the interface and to the list below. It is
 *     not in BLUEPRINT section 7 as written; the list is what the contract must still have. What
 *     the member answers is module-host's to prove (its "input: building() ..." lines).
 *   - The path members went on 2026-10-11 (R7a): `setRecording`, `takePath`, `smoothPath`, `seekPath`,
 *     `play`, `stopPlay` (six of the list below) and `renderPathZip` (never in it), with the module's
 *     recorder, preview and path render behind them; no file of the shell called one. `DzPath` stays
 *     on both sides (a frame request may name a path, and the module still samples one), so [2] is
 *     as it was. The `recordingChanged` event is still in the list of events: it is declared, and can
 *     no longer be raised.
 *   - A field added to the module's `DzView` / `DzTelemetry` / `DzPath` (`deep-zoom/renderer/index.ts`)
 *     must be added to the contract's copy in the same package, or [2] goes red.
 *
 * FALSIFIED 2026-10-08: nineteen breaks, one at a time, exit 1 every time, the files restored byte
 * for byte afterwards (md5). The break, then how many lines went red and which:
 *   contract   `instance: DeepZoomInstance;` in the interface -> 4: "no identifier
 *              DeepZoomInstance", "the only outside types ...", "the header names every member",
 *              and [2] (the name does not resolve)
 *              an import line -> 3: "0 import lines", "no module reference", "types only"
 *              `el: HTMLElement;` -> 2: "the only outside types", "the header names every member"
 *              `export const X = 1;` -> 1: "types only"
 *              `pause?(` made required with the header untouched -> 1: "the header names every member"
 *              `frameCount` removed -> 2: "every member of BLUEPRINT section 7", "frameCount(): number"
 *              `contextLost` removed from `DzEvents` -> 1: "DzEvents has the 7 events"
 *              `// see Document` in a comment -> 1: "no identifier Document"
 *   types      `fov?: number` added to the contract's `DzView` -> 1: [2], on `viewSame` and
 *              `pathSame`. An OPTIONAL field leaves all six "fits" proofs true; only the "same"
 *              proofs see it, which is why both kinds are there.
 *              `DzTelemetry.depth: string` -> 1: [2]
 *   holder     the key renamed -> 2; `setHost` without its equality test -> 4; `clearHost` made
 *              unconditional -> 1 ("clearHost leaves a different host in place"); `DZ_CANVAS_ID`
 *              changed -> 2 (the holder line and [1] "the header names both DOM ids")
 *   telemetry  `writeTelemetry` without the equal-sample test -> 7 (the first is "an equal sample
 *              notifies nobody"); `resetTelemetry` made a
 *              no-op -> 3; a third import in `telemetry.ts` -> 1 ("loads only zustand and the contract")
 *   seam       the scanner's path test made to match nothing -> 1: "the scanner flags five made-up
 *              offenders".
 * NOT falsified: the two real-tree seam lines against a real offending file in `deep-zoom/` (that
 * file would belong to another package). They rest on the scanner's self-test. And [2] was broken
 * from the contract's side only; `deep-zoom/renderer/index.ts` was not edited (the "same" proofs
 * are symmetric).
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
    DZ_CANVAS_ID,
    DZ_FRAME_ID,
    clearHost,
    deepZoomHost,
    getHost,
    setHost,
    subscribeHost,
} from '../../deep-zoom/host/current';
import {
    DZ_TELEMETRY_HZ,
    DZ_TELEMETRY_INITIAL,
    DZ_TELEMETRY_INTERVAL_MS,
    getTelemetry,
    resetTelemetry,
    subscribeTelemetry,
    writeTelemetry,
} from '../../deep-zoom/host/telemetry';
import type { DeepZoomHost, DzTelemetry } from '../../deep-zoom/host/DeepZoomHost';
import { proofs } from './host-contract-types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACT = 'deep-zoom/host/DeepZoomHost.ts';
const HOLDER = 'deep-zoom/host/current.ts';
const TELEMETRY = 'deep-zoom/host/telemetry.ts';
const PROOF_FILE = 'debug/deep-zoom-checks/host-contract-types.ts';

/** BLUEPRINT section 7's member list, as it stands after N5 and without the path members (see the header). */
const BLUEPRINT_MEMBERS = [
    'ready',
    'setParam', 'setParams', 'getParams', 'bootParams',
    'telemetry', 'onTelemetry',
    'getView', 'setView', 'setPendingView', 'moveAlong', 'diveTo', 'thumbnail', 'snapshot',
    'setInputOwner', 'rawDistance', 'orientation', 'setOrientation', 'sense', 'freeDistance', 'estimateAt', 'building', 'holdLive',
    'setGradientRamp',
    'renderFramePixels', 'renderFrameBlob', 'exportStill', 'cancel',
    'canvas', 'focus', 'pause',
    'step', 'frameCount', 'dispose',
    'on',
];
/** BLUEPRINT section 7's event names, less `captureChanged` (gone at N5). */
const BLUEPRINT_EVENTS = ['paramChanged', 'recordingChanged', 'compile', 'progress', 'contextLost', 'error', 'viewSet'];
/** The contract may not spell these, anywhere, comments included. */
const FORBIDDEN_IDENTIFIERS = ['Window', 'Document', 'DeepZoomInstance'];
/** The two DOM types the contract may name (BLUEPRINT section 7). */
const ALLOWED_DOM_TYPES = new Set(['HTMLCanvasElement', 'Blob']);
/** Language-level types: not DOM, always available. */
const LANGUAGE_TYPES = new Set(['Promise', 'Array', 'ReadonlyArray', 'Record', 'Partial', 'Readonly', 'Required',
    'Pick', 'Omit', 'Uint8Array', 'Uint8ClampedArray']);
/** Only `deep-zoom/host/` may call these. */
const TELEMETRY_WRITERS = new Set(['writeTelemetry', 'resetTelemetry']);

let failures = 0;
function check(ok: boolean, label: string, detail = ''): void {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? `\n       ${detail}` : ''}`);
    if (!ok) failures++;
}

const read = (rel: string): string => readFileSync(path.join(ROOT, rel), 'utf8');
const parse = (file: string, text: string): ts.SourceFile =>
    ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/** Every module a file refers to: import, export-from, import-equals, `import('x')` as a type or a
 *  call, `require('x')`. A computed specifier is reported as '<computed>'. */
function moduleSpecifiers(sf: ts.SourceFile): string[] {
    const out: string[] = [];
    const visit = (n: ts.Node): void => {
        if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) {
            out.push(ts.isStringLiteral(n.moduleSpecifier) ? n.moduleSpecifier.text : '<computed>');
        } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) {
            const e = n.moduleReference.expression;
            out.push(ts.isStringLiteral(e) ? e.text : '<computed>');
        } else if (ts.isImportTypeNode(n)) {
            const a = n.argument;
            out.push(ts.isLiteralTypeNode(a) && ts.isStringLiteral(a.literal) ? a.literal.text : '<computed>');
        } else if (ts.isCallExpression(n)
            && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
            const a = n.arguments[0];
            out.push(a && ts.isStringLiteralLike(a) ? a.text : '<computed>');
        }
        ts.forEachChild(n, visit);
    };
    visit(sf);
    return out;
}

/** Type names a file uses but neither declares nor takes as a type parameter. */
function outsideTypeNames(sf: ts.SourceFile): string[] {
    const declared = new Set<string>();
    const used = new Set<string>();
    const leftmost = (n: ts.EntityName): string => (ts.isIdentifier(n) ? n.text : leftmost(n.left));
    const visit = (n: ts.Node): void => {
        if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isTypeParameterDeclaration(n)) declared.add(n.name.text);
        if (ts.isTypeReferenceNode(n)) used.add(leftmost(n.typeName));
        if (ts.isExpressionWithTypeArguments(n)) used.add(n.expression.getText(sf).split('.')[0]);
        if (ts.isTypeQueryNode(n)) used.add(leftmost(n.exprName));
        ts.forEachChild(n, visit);
    };
    visit(sf);
    return [...used].filter((name) => !declared.has(name) && !LANGUAGE_TYPES.has(name)).sort();
}

function identifierNames(sf: ts.SourceFile): Set<string> {
    const out = new Set<string>();
    const visit = (n: ts.Node): void => {
        if (ts.isIdentifier(n)) out.add(n.text);
        ts.forEachChild(n, visit);
    };
    visit(sf);
    return out;
}

/** What a shell file does that only `deep-zoom/host/` may do. `rel` is repo-relative, with `/`. */
function seamFaults(rel: string, text: string): { renderer: string[]; telemetry: string[] } {
    const sf = parse(rel, text);
    const dir = path.posix.dirname(rel);
    const renderer: string[] = [];
    for (const spec of moduleSpecifiers(sf)) {
        const target = spec.startsWith('.') ? path.posix.normalize(path.posix.join(dir, spec)) : spec;
        if (/(^|\/)deep-zoom\/renderer(\/|$)/.test(target)) renderer.push(`${rel} loads '${spec}'`);
    }
    const names = identifierNames(sf);
    if (names.has('createDeepZoom')) renderer.push(`${rel} names createDeepZoom`);
    const telemetry = [...names].filter((n) => TELEMETRY_WRITERS.has(n)).map((n) => `${rel} names ${n}`);
    return { renderer, telemetry };
}

function sourceFilesUnder(dir: string, out: string[] = []): string[] {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }   // a folder being moved away mid-scan
    for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) sourceFilesUnder(p, out);
        else if (/\.(ts|tsx|mts)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
    }
    return out;
}

// ── [1] the contract file ────────────────────────────────────────────────────────────────────────
console.log(`[1] contract  ${CONTRACT}`);
const contractText = read(CONTRACT);
const contract = parse(CONTRACT, contractText);
const contractLines = contractText.split(/\r?\n/);
{
    const importLines = contractLines
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => /^\s*import\b/.test(line) || /^\s*export\b[^'"]*\bfrom\s*['"]/.test(line));
    check(importLines.length === 0, 'contract: 0 import lines',
        importLines.map(({ line, n }) => `line ${n}: ${line.trim()}`).join(' | '));

    const refs = moduleSpecifiers(contract);
    check(refs.length === 0, 'contract: no module reference in the syntax tree', `refers to ${refs.join(', ')}`);

    const notTypes = contract.statements.filter((s) => !ts.isInterfaceDeclaration(s) && !ts.isTypeAliasDeclaration(s));
    check(notTypes.length === 0, 'contract: types only',
        notTypes.map((s) => `${ts.SyntaxKind[s.kind]}: ${s.getText(contract).slice(0, 60)}`).join(' | '));

    for (const word of FORBIDDEN_IDENTIFIERS) {
        const re = new RegExp(`(?<![A-Za-z0-9_$])${word}(?![A-Za-z0-9_$])`);
        const hits = contractLines.map((line, i) => ({ line, n: i + 1 })).filter(({ line }) => re.test(line));
        check(hits.length === 0, `contract: no identifier ${word}`,
            hits.map(({ line, n }) => `line ${n}: ${line.trim().slice(0, 80)}`).join(' | '));
    }

    const outside = outsideTypeNames(contract);
    const notAllowed = outside.filter((name) => !ALLOWED_DOM_TYPES.has(name));
    check(notAllowed.length === 0, 'contract: the only outside types are HTMLCanvasElement and Blob',
        `also refers to ${notAllowed.join(', ')}`);

    const iface = contract.statements.find(
        (s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'DeepZoomHost');
    const exported = !!iface?.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    check(!!iface && exported, 'contract: exports interface DeepZoomHost');

    const members = (iface?.members ?? []).map((m) => ({
        name: m.name ? m.name.getText(contract) : '<unnamed>',
        optional: !!m.questionToken,
        node: m,
    }));
    const has = new Set(members.map((m) => m.name));
    const missing = BLUEPRINT_MEMBERS.filter((name) => !has.has(name));
    check(missing.length === 0, `contract: every member of BLUEPRINT section 7 is there (${BLUEPRINT_MEMBERS.length} of ${members.length} members)`,
        `missing ${missing.join(', ')}`);

    const fc = members.find((m) => m.name === 'frameCount')?.node;
    check(!!fc && ts.isMethodSignature(fc) && fc.parameters.length === 0 && !fc.questionToken
        && fc.type?.kind === ts.SyntaxKind.NumberKeyword, 'contract: frameCount(): number');

    const headerRange = ts.getLeadingCommentRanges(contractText, 0)?.[0];
    const header = headerRange ? contractText.slice(headerRange.pos, headerRange.end) : '';
    const undocumented = members.filter((m) => {
        const asOptional = header.includes('`' + m.name + '?`');
        const asRequired = new RegExp('`' + m.name + '[`(]').test(header);
        return m.optional ? !asOptional : (!asRequired || asOptional);
    }).map((m) => `${m.name}${m.optional ? '?' : ''}`);
    check(undocumented.length === 0,
        `contract: the header names every member, the ${members.filter((m) => m.optional).length} optional ones with "?"`,
        `header and interface disagree on ${undocumented.join(', ')}`);

    const events = contract.statements.find(
        (s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'DzEvents');
    const eventNames = new Set((events?.members ?? []).map((m) => (m.name ? m.name.getText(contract) : '')));
    const missingEvents = BLUEPRINT_EVENTS.filter((name) => !eventNames.has(name));
    check(missingEvents.length === 0, `contract: DzEvents has the ${BLUEPRINT_EVENTS.length} events of BLUEPRINT section 7`,
        `missing ${missingEvents.join(', ')}`);

    check(header.includes('`#' + DZ_FRAME_ID + '`') && header.includes('`#' + DZ_CANVAS_ID + '`')
        && header.includes('`DZ_FRAME_ID`') && header.includes('`DZ_CANVAS_ID`'),
        'contract: the header names both DOM ids as current.ts exports them',
        `expected #${DZ_FRAME_ID}, #${DZ_CANVAS_ID}, DZ_FRAME_ID and DZ_CANVAS_ID in the header`);
}

// ── [2] the shapes equal the module's ────────────────────────────────────────────────────────────
console.log(`[2] types     ${PROOF_FILE}`);
{
    const raw = ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile);
    const { options } = ts.convertCompilerOptionsFromJson(raw.config?.compilerOptions ?? {}, ROOT);
    // `types: []`: the proof needs the DOM lib only, not the repo's ambient vite types.
    const program = ts.createProgram([path.join(ROOT, PROOF_FILE)], { ...options, noEmit: true, types: [] });
    const problems = ts.getPreEmitDiagnostics(program).map((d) => {
        const message = ts.flattenDiagnosticMessageText(d.messageText, ' ');
        if (!d.file || d.start === undefined) return message;
        const line = d.file.getLineAndCharacterOfPosition(d.start).line;
        const source = d.file.text.split(/\r?\n/)[line]?.trim() ?? '';   // the proof's name, e.g. `viewSame: true,`
        return `${path.relative(ROOT, d.file.fileName).split(path.sep).join('/')}:${line + 1} \`${source}\` ${message}`;
    });
    const loaded = program.getSourceFiles().some((f) => f.fileName.replace(/\\/g, '/').endsWith(CONTRACT))
        && program.getSourceFiles().some((f) => f.fileName.replace(/\\/g, '/').endsWith('deep-zoom/renderer/index.ts'));
    check(loaded, 'types: the proof file reads both the contract and deep-zoom/renderer/index.ts');
    check(problems.length === 0, `types: the contract's shapes equal the module's (${Object.keys(proofs).length} proofs)`,
        problems.join('\n       '));
}

// ── [3] the holder ───────────────────────────────────────────────────────────────────────────────
console.log(`[3] holder    ${HOLDER}`);
{
    check(deepZoomHost.name === 'deep-zoom.host' && getHost() === null, 'holder: named deep-zoom.host and starts empty',
        `name ${deepZoomHost.name}, host ${String(getHost())}`);
    check(read(HOLDER).includes("defineAppHandles<DeepZoomHost | null>('deep-zoom.host', null)"),
        "holder: current.ts calls defineAppHandles<DeepZoomHost | null>('deep-zoom.host', null)");
    check(DZ_FRAME_ID === 'dz-frame' && DZ_CANVAS_ID === 'dz-render-canvas',
        'holder: DZ_FRAME_ID is dz-frame and DZ_CANVAS_ID is dz-render-canvas (the smokes spell both as strings)',
        `got ${DZ_FRAME_ID}, ${DZ_CANVAS_ID}`);

    // Identity tokens only: the holder stores a host and never calls it, so an empty object stands in.
    const a = {} as unknown as DeepZoomHost;
    const b = {} as unknown as DeepZoomHost;
    const seen: Array<DeepZoomHost | null> = [];
    const stop = subscribeHost((h) => seen.push(h));

    setHost(a);
    check(getHost() === a && seen.length === 1 && seen[0] === a, 'holder: setHost stores the host and notifies once', `${seen.length} calls`);
    setHost(a);
    check(seen.length === 1, 'holder: setting the same host again notifies nobody', `${seen.length} calls`);
    clearHost(b);
    check(getHost() === a && seen.length === 1, 'holder: clearHost leaves a different host in place', `${seen.length} calls`);
    clearHost(a);
    check(getHost() === null && seen.length === 2 && seen[1] === null, 'holder: clearHost empties the holder and notifies once', `${seen.length} calls`);
    stop();
    setHost(b);
    check(getHost() === b && seen.length === 2, 'holder: the unsubscribe stops the calls', `${seen.length} calls`);
    setHost(null);
}

// ── [4] the telemetry store ──────────────────────────────────────────────────────────────────────
console.log(`[4] telemetry ${TELEMETRY}`);
{
    const sample: DzTelemetry = {
        ready: true, error: '', mode: 'deep', depth: 6.4e-53, fps: 31, frameW: 960, frameH: 540, iters: 96, power: 8,
        accumN: 3, accumMax: 64, recording: false, playing: false, exporting: false, pathFrames: 0, bla: true,
    };
    const same = (x: object, y: object): boolean => JSON.stringify(x) === JSON.stringify(y);

    check(DZ_TELEMETRY_HZ === 8 && DZ_TELEMETRY_INTERVAL_MS === 125, 'telemetry: 8 writes a second (125 ms)',
        `${DZ_TELEMETRY_HZ} Hz, ${DZ_TELEMETRY_INTERVAL_MS} ms`);
    check(getTelemetry().live === false && same(getTelemetry(), DZ_TELEMETRY_INITIAL), 'telemetry: starts not live, with no sample');

    let calls = 0;
    const stop = subscribeTelemetry(() => { calls++; });

    writeTelemetry(sample);
    check(calls === 1 && getTelemetry().live && getTelemetry().depth === 6.4e-53 && getTelemetry().mode === 'deep',
        'telemetry: a sample is stored and notifies once', `${calls} calls, depth ${getTelemetry().depth}`);
    writeTelemetry({ ...sample });
    check(calls === 1, 'telemetry: an equal sample notifies nobody', `${calls} calls`);
    writeTelemetry({ ...sample, fps: 32 });
    check(calls === 2 && getTelemetry().fps === 32 && getTelemetry().depth === 6.4e-53,
        'telemetry: one changed field notifies once and the rest stays', `${calls} calls`);

    resetTelemetry();
    check(calls === 3 && same(getTelemetry(), DZ_TELEMETRY_INITIAL), 'telemetry: resetTelemetry returns to the initial state, one notice',
        `${calls} calls, ${JSON.stringify(getTelemetry())}`);
    resetTelemetry();
    check(calls === 3, 'telemetry: a second reset notifies nobody', `${calls} calls`);
    writeTelemetry(sample);
    check(calls === 4 && getTelemetry().live, 'telemetry: the first sample after a reset is stored', `${calls} calls`);
    resetTelemetry();
    stop();

    const loads = moduleSpecifiers(parse(TELEMETRY, read(TELEMETRY))).sort();
    check(same(loads, ['./DeepZoomHost', 'zustand']), 'telemetry: the file loads only zustand and the contract',
        `loads ${loads.join(', ')}`);
}

// ── [5] the seam ─────────────────────────────────────────────────────────────────────────────────
console.log('[5] seam      deep-zoom/** outside host/ and renderer/');
{
    const flagged = (rel: string, text: string): number => {
        const f = seamFaults(rel, text);
        return f.renderer.length + f.telemetry.length;
    };
    const selfTest =
        flagged('deep-zoom/DeepZoomApp.tsx', "import { createDeepZoom } from './renderer';") > 0
        && flagged('deep-zoom/components/A.tsx', "import type { DzView } from '../renderer/index';") > 0
        && flagged('deep-zoom/components/B.tsx', "export { createDeepZoom as make } from '../renderer';") > 0
        && flagged('deep-zoom/components/C.tsx', "const m = await import('../renderer');") > 0
        && flagged('deep-zoom/components/D.tsx', "import * as t from '../host/telemetry'; t.writeTelemetry(s);") > 0
        && flagged('deep-zoom/components/E.tsx',
            "import { getHost } from '../host/current';\n// deep-zoom/renderer, createDeepZoom and writeTelemetry in a comment\nconst s = 'deep-zoom/renderer';") === 0;
    check(selfTest, 'seam: the scanner flags five made-up offenders and passes a clean file');

    const shellDir = path.join(ROOT, 'deep-zoom');
    const files = sourceFilesUnder(shellDir)
        .map((abs) => ({ abs, rel: path.relative(ROOT, abs).split(path.sep).join('/') }))
        .filter(({ rel }) => !rel.startsWith('deep-zoom/host/') && !rel.startsWith('deep-zoom/renderer/'));
    const renderer: string[] = [];
    const telemetry: string[] = [];
    let readCount = 0;
    for (const { abs, rel } of files) {
        let text: string;
        try { text = readFileSync(abs, 'utf8'); } catch { continue; }   // moved away between the listing and the read
        readCount++;
        const f = seamFaults(rel, text);
        renderer.push(...f.renderer);
        telemetry.push(...f.telemetry);
    }
    check(renderer.length === 0, `seam: no shell file loads deep-zoom/renderer or names createDeepZoom (${readCount} files read)`,
        renderer.join(' | '));
    check(telemetry.length === 0, `seam: no shell file writes the telemetry store (${readCount} files read)`, telemetry.join(' | '));
}

console.log(failures === 0 ? '\nhost-contract: all green' : `\nhost-contract: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
