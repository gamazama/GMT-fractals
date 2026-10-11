/**
 * Guard: a folder of frames (`engine/export/frameFolder.ts`) - names, resume, and a failed write.
 *
 * Node only, under a second: the sink runs against a FAKE directory handle (`fakeDir` below), which
 * behaves as the File System Access API does where it matters here - a missing file rejects with
 * NotFoundError, `create: true` makes an EMPTY entry at once, and the bytes arrive only when the
 * stream closes. What the real picker and a real disk do is not opened by this test; the deep
 * zoomer's render was driven through an in-memory handle in the browser (debug/scratch/r6/).
 *
 *   name   `<safe name>_<index padded to five>.<ext>`; six digits in full; the name made safe
 *   has    false for a missing file and for an empty one, true for one with bytes; a resumed run
 *          over five frames renders exactly the ones that are not there
 *   write  the bytes land under the frame's own name; a second write replaces them; a write that
 *          never closed leaves the frame "not there"; a failing write rejects with the handle's
 *          own error and aborts its stream; a folder that cannot make the file rejects too
 *   png    `pngSize` reads a PNG's width and height off its header and answers null for other bytes
 *   pick   `pickFrameFolder` hands back the sink over the folder the picker gave, null when the
 *          user backs out, the picker's own error otherwise, and throws the plain line where there
 *          is no picker (`canPickFrameFolder` says which)
 *
 * Run: `npm run test:frame-folder`
 *
 * ── FALSIFIED 2026-10-11 ─────────────────────────────────────────────────
 *   One edit of `engine/export/frameFolder.ts` each, the file restored byte for byte after (26
 *   checks in all; the first four breaks were run when there were 24):
 *   png    `pngSize` reading the height where the width is: 1 red - "png: the size is the one in
 *          the file's header".
 *   name   the pad taken from 5 to 4 (`FRAME_FOLDER_DIGITS`): 11 red - the four padded names and
 *          "frame_00001.png", and every later check that looks for a file under its five-digit
 *          name (three of `has`, three of `write`, one of `pick`).
 *   has    `file.size > 0 ? file : null` made `file`: 3 red - "has: an empty file is not there",
 *          "has: a resumed run renders exactly the frames that are not there" (it leaves out
 *          frame 1, whose file is empty) and "write: a write that never closed leaves the frame
 *          not there".
 *   write  the `catch` of `write` made to swallow (no `throw err`): 1 red - "write: a failing
 *          write rejects with the handle's own error".
 *   pick   the AbortError line removed: the picker's own error came out of `pickFrameFolder` and
 *          the run died on it (exit 1). The check has caught the rejection since, so the same
 *          break now prints "pick: null when the user backs out" - that form was not run again.
 */
import { FRAME_FOLDER_UNSUPPORTED, canPickFrameFolder, frameFolder, pickFrameFolder, pngSize, safeFrameName } from '../engine/export/frameFolder';
import type { FrameFolderDirectory } from '../engine/export/frameFolder';

let pass = 0;
const fails: string[] = [];
const ck = (name: string, ok: boolean, detail = ''): void => { if (ok) pass++; else fails.push(detail ? `${name}: ${detail}` : name); };

/** An in-memory directory. `failWrite`: every stream's write rejects with it. `failCreate`: so does making a file. */
function fakeDir(name = 'frames') {
    const files = new Map<string, Uint8Array>();
    const state = { failWrite: null as Error | null, failCreate: null as Error | null, aborted: 0, neverClose: false };
    const dir: FrameFolderDirectory = {
        name,
        async getFileHandle(file, options) {
            if (!files.has(file)) {
                if (!options?.create) throw new DOMException(`${file} is not there`, 'NotFoundError');
                if (state.failCreate) throw state.failCreate;
                files.set(file, new Uint8Array(0));
            }
            return {
                getFile: async () => new Blob([files.get(file) ?? new Uint8Array(0)]),
                createWritable: async () => {
                    let pending: Uint8Array | null = null;
                    return {
                        async write(data: Blob) { if (state.failWrite) throw state.failWrite; pending = new Uint8Array(await data.arrayBuffer()); },
                        async close() { if (pending && !state.neverClose) files.set(file, pending); },
                        async abort() { state.aborted++; },
                    };
                },
            };
        },
    };
    return { dir, files, state };
}
const bytes = (...b: number[]): Blob => new Blob([new Uint8Array(b)]);
const rejects = async (run: () => Promise<unknown>): Promise<unknown> => { try { await run(); return null; } catch (err) { return err; } };

// ── name ──
{
    const f = frameFolder(fakeDir().dir, 'shot');
    ck('name: frame 0 is shot_00000.png', f.fileName(0) === 'shot_00000.png', f.fileName(0));
    ck('name: frame 42 is shot_00042.png', f.fileName(42) === 'shot_00042.png', f.fileName(42));
    ck('name: frame 99999 is shot_99999.png', f.fileName(99999) === 'shot_99999.png', f.fileName(99999));
    ck('name: six digits are written in full', f.fileName(123456) === 'shot_123456.png', f.fileName(123456));
    ck('name: the extension is the caller\'s', frameFolder(fakeDir().dir, 'shot', 'jpg').fileName(7) === 'shot_00007.jpg');
    ck('name: a name is made safe (no spaces, no percent sign, no dots)', safeFrameName(' My dive 50% v1.2 ') === 'My_dive_50_v1_2', safeFrameName(' My dive 50% v1.2 '));
    ck('name: the sink says the safe name and the folder', frameFolder(fakeDir('out').dir, 'a b').name === 'a_b' && frameFolder(fakeDir('out').dir, 'a b').folder === 'out');
    ck('name: a name with nothing usable in it is "frame"', safeFrameName('%%%') === 'frame' && frameFolder(fakeDir().dir, '').fileName(1) === 'frame_00001.png');
}

// ── has, and what a resumed run renders ──
{
    const { dir, files } = fakeDir();
    const f = frameFolder(dir, 'shot');
    ck('has: a missing file is not there', (await f.has(3)) === false);
    files.set('shot_00001.png', new Uint8Array(0));
    ck('has: an empty file is not there', (await f.has(1)) === false && (await f.read(1)) === null);
    files.set('shot_00000.png', new Uint8Array([1, 2, 3]));
    files.set('shot_00003.png', new Uint8Array([4]));
    ck('has: a file with bytes is there', (await f.has(0)) === true && (await f.has(3)) === true);
    const read = await f.read(0);
    ck('has: read hands back the file itself', !!read && read.size === 3 && new Uint8Array(await read.arrayBuffer())[2] === 3);
    const todo: number[] = [];
    for (let frame = 0; frame < 5; frame++) if (!(await f.has(frame))) todo.push(frame);
    ck('has: a resumed run renders exactly the frames that are not there', todo.join() === '1,2,4', todo.join());
    ck('has: asking does not make a file', files.size === 3 && !files.has('shot_00002.png'), [...files.keys()].join());
}

// ── write ──
{
    const { dir, files, state } = fakeDir();
    const f = frameFolder(dir, 'shot');
    await f.write(12, bytes(9, 8, 7));
    ck('write: the bytes are under the frame\'s own name', files.size === 1 && files.get('shot_00012.png')?.join() === '9,8,7', [...files.keys()].join());
    await f.write(12, bytes(5));
    ck('write: a second write replaces the file', files.get('shot_00012.png')?.join() === '5' && (await f.has(12)));
    state.neverClose = true;
    await f.write(13, bytes(1, 1));
    state.neverClose = false;
    ck('write: a write that never closed leaves the frame not there', files.has('shot_00013.png') && (await f.has(13)) === false);
    const full = new Error('the disk is full');
    state.failWrite = full;
    ck('write: a failing write rejects with the handle\'s own error', (await rejects(() => f.write(14, bytes(1)))) === full);
    ck('write: and its stream is aborted, once', state.aborted === 1, String(state.aborted));
    state.failWrite = null;
    const gone = new Error('the folder was deleted');
    state.failCreate = gone;
    ck('write: a folder that cannot make the file rejects too', (await rejects(() => f.write(15, bytes(1)))) === gone);
}

// ── png ──
{
    const head = new Uint8Array(33);
    head.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(head.buffer).setUint32(16, 1920);
    new DataView(head.buffer).setUint32(20, 1034);
    const size = await pngSize(new Blob([head]));
    ck('png: the size is the one in the file\'s header', size?.width === 1920 && size?.height === 1034, JSON.stringify(size));
    ck('png: bytes that are not a PNG have no size', (await pngSize(bytes(1, 2, 3))) === null && (await pngSize(new Blob([new Uint8Array(64)]))) === null);
}

// ── pick ──
{
    const g = globalThis as { window?: unknown };
    const had = g.window;
    try {
        g.window = undefined;
        ck('pick: no picker, and the caller is told so', canPickFrameFolder() === false
            && ((await rejects(() => pickFrameFolder('shot'))) as Error | null)?.message === FRAME_FOLDER_UNSUPPORTED);
        const { dir, files } = fakeDir('picked');
        let asked: unknown = null;
        g.window = { showDirectoryPicker: async (options: unknown) => { asked = options; return dir; } };
        const f = await pickFrameFolder('shot');
        await f?.write(2, bytes(6));
        ck('pick: the sink is over the folder the picker gave, asked for writing',
            canPickFrameFolder() && f?.folder === 'picked' && files.has('shot_00002.png') && (asked as { mode?: string } | null)?.mode === 'readwrite');
        g.window = { showDirectoryPicker: async () => { throw new DOMException('The user aborted a request.', 'AbortError'); } };
        ck('pick: null when the user backs out', (await pickFrameFolder('shot').catch((err: unknown) => err)) === null);
        const denied = new DOMException('not allowed', 'SecurityError');
        g.window = { showDirectoryPicker: async () => { throw denied; } };
        ck('pick: any other failure of the picker reaches the caller', (await rejects(() => pickFrameFolder('shot'))) === denied);
    } finally {
        g.window = had;
    }
}

for (const f of fails) console.log(`  FAIL ${f}`);
console.log(`test-frame-folder: ${pass} passed, ${fails.length} failed`);
process.exit(fails.length > 0 ? 1 : 0);
